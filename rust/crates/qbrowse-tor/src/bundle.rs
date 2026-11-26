use anyhow::{anyhow, Context, Result};
use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io;
use std::path::{Component, Path, PathBuf};
use tar::Archive;
use zip::ZipArchive;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TorrcConfig {
    pub socks_port: u16,
    pub control_port: u16,
    pub data_directory: PathBuf,
    pub cookie_authentication: bool,
    pub geoip_file: Option<PathBuf>,
    pub geoip6_file: Option<PathBuf>,
    pub log_level: Option<String>,
}

/// Generate a `torrc` configuration string matching `torEngine.cjs` options.
pub fn generate_torrc(config: &TorrcConfig) -> String {
    let mut lines = vec![
        format!("SocksPort {}", config.socks_port),
        format!("ControlPort {}", config.control_port),
        format!("DataDirectory {}", config.data_directory.display()),
        format!(
            "CookieAuthentication {}",
            if config.cookie_authentication { 1 } else { 0 }
        ),
        format!(
            "Log {} stdout",
            config.log_level.as_deref().unwrap_or("notice")
        ),
    ];

    if let Some(geoip) = &config.geoip_file {
        lines.push(format!("GeoIPFile {}", geoip.display()));
    }
    if let Some(geoip6) = &config.geoip6_file {
        lines.push(format!("GeoIPv6File {}", geoip6.display()));
    }

    lines.join("\n") + "\n"
}

fn sanitize_entry_path(dest_dir: &Path, entry_path: &Path) -> Result<PathBuf> {
    if entry_path.is_absolute() {
        return Err(anyhow!(
            "Unsafe archive entry path (absolute): {}",
            entry_path.display()
        ));
    }
    let mut clean = PathBuf::new();
    for comp in entry_path.components() {
        match comp {
            Component::Normal(p) => clean.push(p),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(anyhow!(
                    "Unsafe archive entry path (traversal): {}",
                    entry_path.display()
                ));
            }
        }
    }
    if clean.as_os_str().is_empty() {
        return Err(anyhow!("Empty archive entry path"));
    }
    Ok(dest_dir.join(clean))
}

/// Extract a Tor Expert Bundle (`.tar.gz`/`.tgz` or `.zip`) safely into `dest_dir`.
pub fn extract_tor_bundle(archive_path: &Path, dest_dir: &Path) -> Result<Vec<PathBuf>> {
    fs::create_dir_all(dest_dir)
        .with_context(|| format!("Failed to create Tor bin dir {}", dest_dir.display()))?;
    let canonical_dest = fs::canonicalize(dest_dir)
        .with_context(|| format!("Failed to canonicalize {}", dest_dir.display()))?;

    let name_lower = archive_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if name_lower.ends_with(".zip") {
        extract_zip(archive_path, &canonical_dest)
    } else if name_lower.ends_with(".tar.gz") || name_lower.ends_with(".tgz") {
        extract_tar_gz(archive_path, &canonical_dest)
    } else {
        let header = fs::read(archive_path)
            .with_context(|| format!("Failed to read Tor bundle {}", archive_path.display()))?;
        if header.starts_with(b"PK") {
            extract_zip(archive_path, &canonical_dest)
        } else if header.starts_with(&[0x1F, 0x8B]) {
            extract_tar_gz(archive_path, &canonical_dest)
        } else {
            Err(anyhow!(
                "Unsupported Tor bundle archive format: {}",
                archive_path.display()
            ))
        }
    }
}

fn extract_zip(archive_path: &Path, canonical_dest: &Path) -> Result<Vec<PathBuf>> {
    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)?;
    let mut extracted = Vec::new();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let Some(enclosed) = entry.enclosed_name() else {
            return Err(anyhow!(
                "Unsafe ZIP entry path (Zip-Slip detected): {}",
                entry.name()
            ));
        };
        let out_path = sanitize_entry_path(canonical_dest, &enclosed)?;
        if entry.is_dir() {
            fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
                let canonical_parent = fs::canonicalize(parent)?;
                if !canonical_parent.starts_with(canonical_dest) {
                    return Err(anyhow!("ZIP entry escapes destination directory"));
                }
            }
            let mut out_file = File::create(&out_path)?;
            io::copy(&mut entry, &mut out_file)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&out_path, fs::Permissions::from_mode(0o755));
            }
            extracted.push(out_path);
        }
    }

    Ok(extracted)
}

fn normalize_lexical(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for comp in path.components() {
        match comp {
            Component::CurDir => {}
            Component::ParentDir => {
                if matches!(out.components().next_back(), Some(Component::Normal(_))) {
                    out.pop();
                } else {
                    out.push(comp);
                }
            }
            other => out.push(other),
        }
    }
    out
}

fn extract_tar_gz(archive_path: &Path, canonical_dest: &Path) -> Result<Vec<PathBuf>> {
    let file = File::open(archive_path)?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    let mut extracted = Vec::new();

    for entry_res in archive.entries()? {
        let mut entry = entry_res?;
        let entry_type = entry.header().entry_type();
        let entry_path = entry.path()?.into_owned();
        let out_path = sanitize_entry_path(canonical_dest, &entry_path)?;

        if entry_type.is_hard_link() {
            return Err(anyhow!(
                "Unsafe hard link entry in Tor bundle: {}",
                entry_path.display()
            ));
        }

        if entry_type.is_symlink() {
            let link_target = entry
                .link_name()?
                .ok_or_else(|| anyhow!("Missing symlink target for {}", entry_path.display()))?
                .into_owned();

            if link_target.as_os_str().is_empty()
                || link_target.is_absolute()
                || link_target
                    .components()
                    .any(|c| matches!(c, Component::RootDir | Component::Prefix(_)))
            {
                return Err(anyhow!(
                    "Unsafe absolute symlink in Tor bundle: {} -> {}",
                    entry_path.display(),
                    link_target.display()
                ));
            }

            let parent = out_path.parent().ok_or_else(|| {
                anyhow!("Invalid symlink path in Tor bundle: {}", entry_path.display())
            })?;
            fs::create_dir_all(parent)?;
            let canonical_parent = fs::canonicalize(parent)?;
            if !canonical_parent.starts_with(canonical_dest) {
                return Err(anyhow!("Tar symlink parent escapes destination directory"));
            }

            let resolved_target = normalize_lexical(&canonical_parent.join(&link_target));
            if !resolved_target.starts_with(canonical_dest) || resolved_target == canonical_dest {
                return Err(anyhow!(
                    "Unsafe escaping symlink in Tor bundle: {} -> {}",
                    entry_path.display(),
                    link_target.display()
                ));
            }

            if fs::symlink_metadata(&out_path).is_ok() {
                let _ = fs::remove_file(&out_path);
            }

            #[cfg(unix)]
            {
                std::os::unix::fs::symlink(&link_target, &out_path)?;
                extracted.push(out_path);
            }
            continue;
        }

        if entry_type.is_dir() {
            fs::create_dir_all(&out_path)?;
        } else if entry_type.is_file() {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
                let canonical_parent = fs::canonicalize(parent)?;
                if !canonical_parent.starts_with(canonical_dest) {
                    return Err(anyhow!("Tar entry escapes destination directory"));
                }
            }
            let mut out_file = File::create(&out_path)?;
            io::copy(&mut entry, &mut out_file)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&out_path, fs::Permissions::from_mode(0o755));
            }
            extracted.push(out_path);
        }
    }

    Ok(extracted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;
    use zip::write::SimpleFileOptions;

    #[test]
    fn test_generate_torrc() {
        let cfg = TorrcConfig {
            socks_port: 9050,
            control_port: 9051,
            data_directory: PathBuf::from("/tmp/tor_data"),
            cookie_authentication: true,
            geoip_file: Some(PathBuf::from("/tmp/geoip")),
            geoip6_file: None,
            log_level: None,
        };
        let torrc = generate_torrc(&cfg);
        assert!(torrc.contains("SocksPort 9050"));
        assert!(torrc.contains("ControlPort 9051"));
        assert!(torrc.contains("CookieAuthentication 1"));
        assert!(torrc.contains("GeoIPFile"));
        assert!(torrc.contains("Log notice stdout"));
    }

    #[test]
    fn test_extract_tor_bundle_tar_gz_and_zip() {
        let mut base = std::env::temp_dir();
        base.push(format!("qbrowse_tor_bundle_{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();

        let tgz_path = base.join("tor-bundle.tar.gz");
        {
            let file = File::create(&tgz_path).unwrap();
            let enc = GzEncoder::new(file, Compression::default());
            let mut builder = tar::Builder::new(enc);
            let data = b"tor-binary";
            let mut header = tar::Header::new_gnu();
            header.set_size(data.len() as u64);
            header.set_mode(0o755);
            header.set_cksum();
            builder.append_data(&mut header, "tor/tor.exe", &data[..]).unwrap();
            builder.finish().unwrap();
        }
        let dest_tgz = base.join("out_tgz");
        let files = extract_tor_bundle(&tgz_path, &dest_tgz).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(fs::read(dest_tgz.join("tor/tor.exe")).unwrap(), b"tor-binary");

        // Zip-slip rejection
        let evil_zip = base.join("evil.zip");
        {
            let file = File::create(&evil_zip).unwrap();
            let mut zw = zip::ZipWriter::new(file);
            zw.start_file("../evil.exe", SimpleFileOptions::default()).unwrap();
            zw.write_all(b"bad").unwrap();
            zw.finish().unwrap();
        }
        assert!(extract_tor_bundle(&evil_zip, &dest_tgz).is_err());

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_extract_tor_bundle_symlinks() {
        let mut base = std::env::temp_dir();
        base.push(format!("qbrowse_tor_symlink_{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();

        // Safe relative intra-directory symlink
        let safe_tgz = base.join("safe-symlink.tar.gz");
        {
            let file = File::create(&safe_tgz).unwrap();
            let enc = GzEncoder::new(file, Compression::default());
            let mut builder = tar::Builder::new(enc);

            let data = b"libevent-so";
            let mut file_hdr = tar::Header::new_gnu();
            file_hdr.set_size(data.len() as u64);
            file_hdr.set_mode(0o755);
            file_hdr.set_cksum();
            builder
                .append_data(&mut file_hdr, "tor/libevent-2.1.so.7.0.1", &data[..])
                .unwrap();

            let mut link_hdr = tar::Header::new_gnu();
            link_hdr.set_entry_type(tar::EntryType::Symlink);
            link_hdr.set_size(0);
            link_hdr.set_mode(0o777);
            link_hdr.set_cksum();
            builder
                .append_link(&mut link_hdr, "tor/libevent-2.1.so.7", "libevent-2.1.so.7.0.1")
                .unwrap();
            builder.finish().unwrap();
        }
        let safe_dest = base.join("safe_out");
        let extracted = extract_tor_bundle(&safe_tgz, &safe_dest).unwrap();
        assert!(extracted.iter().any(|p| p.ends_with("libevent-2.1.so.7.0.1")));
        #[cfg(unix)]
        {
            let link_path = safe_dest.join("tor/libevent-2.1.so.7");
            assert_eq!(
                fs::read_link(&link_path).unwrap(),
                PathBuf::from("libevent-2.1.so.7.0.1")
            );
        }

        // Escaping relative symlink must be rejected
        let evil_tgz = base.join("evil-symlink.tar.gz");
        {
            let file = File::create(&evil_tgz).unwrap();
            let enc = GzEncoder::new(file, Compression::default());
            let mut builder = tar::Builder::new(enc);

            let mut link_hdr = tar::Header::new_gnu();
            link_hdr.set_entry_type(tar::EntryType::Symlink);
            link_hdr.set_size(0);
            link_hdr.set_mode(0o777);
            link_hdr.set_cksum();
            builder
                .append_link(&mut link_hdr, "tor/evil", "../../etc/passwd")
                .unwrap();
            builder.finish().unwrap();
        }
        let evil_dest = base.join("evil_out");
        assert!(extract_tor_bundle(&evil_tgz, &evil_dest).is_err());

        let _ = fs::remove_dir_all(&base);
    }
}
