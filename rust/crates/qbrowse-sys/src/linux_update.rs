use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha512};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinuxInstallInfo {
    pub install_type: String,
    pub can_auto_install: bool,
    pub managed_externally: bool,
    pub label: String,
    pub short_label: String,
    pub package_ext: Option<String>,
    pub arch: String,
    pub app_image_path: Option<String>,
    pub flatpak_id: Option<String>,
    pub snap_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
    #[serde(default)]
    pub size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedLinuxAsset {
    pub name: String,
    pub url: String,
    pub size: u64,
    pub sha512: Option<String>,
    pub arch: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LatestYmlFile {
    pub url: String,
    pub sha512: Option<String>,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LatestYml {
    pub version: String,
    #[serde(default)]
    pub files: Vec<LatestYmlFile>,
    pub path: Option<String>,
    pub sha512: Option<String>,
    pub release_date: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinuxDesktopEntryState {
    pub should_write_user_entry: bool,
    pub desktop_id: String,
}

pub fn normalize_linux_arch(arch: &str) -> String {
    let raw = arch.trim().to_ascii_lowercase();
    match raw.as_str() {
        "" | "amd64" | "x86_64" | "x64" => "x64".to_string(),
        "aarch64" | "arm64" => "arm64".to_string(),
        "i386" | "i686" | "ia32" | "x86" => "ia32".to_string(),
        "armv7l" | "armhf" | "arm" => "arm".to_string(),
        other => other.to_string(),
    }
}

pub fn get_linux_metadata_file_name(arch: &str) -> String {
    let norm = normalize_linux_arch(arch);
    if norm == "x64" {
        "latest-linux.yml".to_string()
    } else {
        format!("latest-linux-{norm}.yml")
    }
}

fn strip_package_ext(file_name: &str) -> &str {
    let lower = file_name.to_ascii_lowercase();
    for ext in [
        ".tar.gz",
        ".tar.xz",
        ".tar.bz2",
        ".appimage",
        ".deb",
        ".rpm",
        ".pacman",
        ".zip",
        ".blockmap",
    ] {
        if lower.ends_with(ext) {
            return &file_name[..file_name.len() - ext.len()];
        }
    }
    file_name
}

fn contains_arch_token(haystack_lower: &str, tokens: &[&str]) -> bool {
    for tok in tokens {
        let mut start = 0;
        while let Some(idx) = haystack_lower[start..].find(tok) {
            let abs = start + idx;
            let before_ok = abs == 0
                || matches!(
                    haystack_lower.as_bytes()[abs - 1],
                    b'-' | b'_' | b'.'
                );
            let after_idx = abs + tok.len();
            let after_ok = after_idx == haystack_lower.len()
                || matches!(
                    haystack_lower.as_bytes()[after_idx],
                    b'-' | b'_' | b'.'
                );
            if before_ok && after_ok {
                return true;
            }
            start = abs + 1;
        }
    }
    false
}

pub fn detect_asset_arch(file_name: &str) -> Option<String> {
    if file_name.is_empty() {
        return None;
    }
    let stripped = strip_package_ext(file_name).to_ascii_lowercase();
    if contains_arch_token(&stripped, &["arm64", "aarch64"]) {
        return Some("arm64".to_string());
    }
    if contains_arch_token(&stripped, &["x86_64", "amd64", "x64"]) {
        return Some("x64".to_string());
    }
    if contains_arch_token(&stripped, &["armv7l", "armhf"]) {
        return Some("arm".to_string());
    }
    if contains_arch_token(&stripped, &["ia32", "i386", "i686"]) {
        return Some("ia32".to_string());
    }
    None
}

pub fn is_non_package_artifact(file_name: &str) -> bool {
    let lower = file_name.to_ascii_lowercase();
    [
        ".blockmap",
        ".yml",
        ".yaml",
        ".sha256",
        ".sha512",
        ".asc",
        ".sig",
        ".exe",
        ".msi",
        ".dmg",
        ".pkg",
    ]
    .iter()
    .any(|ext| lower.ends_with(ext))
}

pub fn sanitize_update_file_name(name: &str, fallback: &str) -> String {
    if name.is_empty() {
        return fallback.to_string();
    }
    let normalized = name.replace('\\', "/");
    let base = normalized.rsplit('/').next().unwrap_or("");
    let mut cleaned = String::with_capacity(base.len());
    let mut prev_space = false;
    for ch in base.chars() {
        if ch.is_control()
            || matches!(
                ch,
                '"' | '\''
                    | '`'
                    | '$'
                    | '\\'
                    | '|'
                    | ';'
                    | '&'
                    | '<'
                    | '>'
                    | '!'
                    | '?'
                    | '*'
                    | '{'
                    | '}'
                    | '('
                    | ')'
                    | '['
                    | ']'
            )
        {
            continue;
        }
        if ch.is_whitespace() {
            if !prev_space {
                cleaned.push('-');
                prev_space = true;
            }
        } else {
            cleaned.push(ch);
            prev_space = false;
        }
    }
    let trimmed = cleaned.trim_start_matches('.');
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}

fn make_install_info(install_type: &str, arch: &str) -> LinuxInstallInfo {
    match install_type {
        "appimage" => LinuxInstallInfo {
            install_type: "appimage".into(),
            can_auto_install: true,
            managed_externally: false,
            label: "AppImage".into(),
            short_label: "AppImage".into(),
            package_ext: Some(".AppImage".into()),
            arch: arch.into(),
            app_image_path: None,
            flatpak_id: None,
            snap_name: None,
        },
        "deb" => LinuxInstallInfo {
            install_type: "deb".into(),
            can_auto_install: false,
            managed_externally: false,
            label: "Debian / Ubuntu (.deb)".into(),
            short_label: ".deb".into(),
            package_ext: Some(".deb".into()),
            arch: arch.into(),
            app_image_path: None,
            flatpak_id: None,
            snap_name: None,
        },
        "rpm" => LinuxInstallInfo {
            install_type: "rpm".into(),
            can_auto_install: false,
            managed_externally: false,
            label: "Fedora / RHEL / openSUSE (.rpm)".into(),
            short_label: ".rpm".into(),
            package_ext: Some(".rpm".into()),
            arch: arch.into(),
            app_image_path: None,
            flatpak_id: None,
            snap_name: None,
        },
        "pacman" => LinuxInstallInfo {
            install_type: "pacman".into(),
            can_auto_install: false,
            managed_externally: false,
            label: "Arch Linux (.pacman)".into(),
            short_label: ".pacman".into(),
            package_ext: Some(".pacman".into()),
            arch: arch.into(),
            app_image_path: None,
            flatpak_id: None,
            snap_name: None,
        },
        "flatpak" => LinuxInstallInfo {
            install_type: "flatpak".into(),
            can_auto_install: false,
            managed_externally: true,
            label: "Flatpak".into(),
            short_label: "Flatpak".into(),
            package_ext: None,
            arch: arch.into(),
            app_image_path: None,
            flatpak_id: None,
            snap_name: None,
        },
        "snap" => LinuxInstallInfo {
            install_type: "snap".into(),
            can_auto_install: false,
            managed_externally: true,
            label: "Snap".into(),
            short_label: "Snap".into(),
            package_ext: None,
            arch: arch.into(),
            app_image_path: None,
            flatpak_id: None,
            snap_name: None,
        },
        _ => LinuxInstallInfo {
            install_type: "tarball".into(),
            can_auto_install: false,
            managed_externally: false,
            label: "Portable Archive (.tar.gz)".into(),
            short_label: ".tar.gz".into(),
            package_ext: Some(".tar.gz".into()),
            arch: arch.into(),
            app_image_path: None,
            flatpak_id: None,
            snap_name: None,
        },
    }
}

/// Classify Linux install mode from environment variables, `exec_path`, and an existence predicate.
pub fn detect_linux_install_type<F>(
    env: &HashMap<String, String>,
    exec_path: &str,
    arch: &str,
    path_exists: F,
) -> LinuxInstallInfo
where
    F: Fn(&str) -> bool,
{
    let norm_arch = normalize_linux_arch(arch);

    if let Some(appimage) = env.get("APPIMAGE").map(|s| s.trim()).filter(|s| !s.is_empty()) {
        let mut info = make_install_info("appimage", &norm_arch);
        info.app_image_path = Some(appimage.to_string());
        info.can_auto_install = appimage.starts_with('/') && !appimage.contains('\0');
        return info;
    }

    if env.contains_key("FLATPAK_ID") || path_exists("/.flatpak-info") {
        let mut info = make_install_info("flatpak", &norm_arch);
        info.flatpak_id = Some(
            env.get("FLATPAK_ID")
                .cloned()
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "com.qbrowse.app".to_string()),
        );
        return info;
    }

    if env.contains_key("SNAP") || env.contains_key("SNAP_NAME") {
        let mut info = make_install_info("snap", &norm_arch);
        info.snap_name = Some(
            env.get("SNAP_NAME")
                .cloned()
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "qbrowse".to_string()),
        );
        return info;
    }

    let is_system_install_path =
        exec_path.starts_with("/opt/") || exec_path.starts_with("/usr/");
    if is_system_install_path {
        if path_exists("/etc/arch-release") || path_exists("/usr/bin/pacman") {
            return make_install_info("pacman", &norm_arch);
        }
        if path_exists("/etc/fedora-release")
            || path_exists("/etc/redhat-release")
            || path_exists("/etc/SuSE-release")
            || path_exists("/usr/bin/rpm")
        {
            return make_install_info("rpm", &norm_arch);
        }
        if path_exists("/etc/debian_version") || path_exists("/usr/bin/dpkg") {
            return make_install_info("deb", &norm_arch);
        }
    }

    make_install_info("tarball", &norm_arch)
}

pub fn select_linux_release_asset(
    assets: &[ReleaseAsset],
    install_type: &str,
    arch: &str,
    yml_data: Option<&LatestYml>,
) -> Option<SelectedLinuxAsset> {
    if install_type == "flatpak" || install_type == "snap" {
        return None;
    }
    let norm_arch = normalize_linux_arch(arch);
    let arch_matched: Vec<&ReleaseAsset> = assets
        .iter()
        .filter(|a| {
            !a.name.is_empty()
                && !a.browser_download_url.is_empty()
                && !is_non_package_artifact(&a.name)
        })
        .filter(|a| match detect_asset_arch(&a.name) {
            Some(asset_arch) => asset_arch == norm_arch,
            None => norm_arch == "x64",
        })
        .collect();

    let ext_priority: &[&str] = match install_type {
        "appimage" => &[".AppImage", ".tar.gz"],
        "deb" => &[".deb", ".AppImage", ".tar.gz"],
        "rpm" => &[".rpm", ".AppImage", ".tar.gz"],
        "pacman" => &[".pacman", ".AppImage", ".tar.gz"],
        "tarball" => &[".tar.gz", ".AppImage", ".deb"],
        _ => &[".AppImage", ".deb", ".rpm", ".pacman", ".tar.gz"],
    };

    let mut chosen: Option<&ReleaseAsset> = None;
    for ext in ext_priority {
        let lower_ext = ext.to_ascii_lowercase();
        let matches: Vec<&ReleaseAsset> = arch_matched
            .iter()
            .copied()
            .filter(|a| a.name.to_ascii_lowercase().ends_with(&lower_ext))
            .collect();
        if !matches.is_empty() {
            chosen = matches
                .iter()
                .copied()
                .find(|a| detect_asset_arch(&a.name).as_deref() == Some(norm_arch.as_str()))
                .or_else(|| matches.first().copied());
            break;
        }
    }

    let chosen = chosen?;
    let mut expected_sha512: Option<String> = None;
    if let Some(yml) = yml_data {
        let norm_fn = |s: &str| -> String {
            s.chars()
                .filter(|c| !matches!(c, '-' | '.') && !c.is_whitespace())
                .flat_map(|c| c.to_lowercase())
                .collect()
        };
        let norm_chosen = norm_fn(&chosen.name);
        if let Some(matched) = yml
            .files
            .iter()
            .find(|f| f.url == chosen.name || norm_fn(&f.url) == norm_chosen)
        {
            expected_sha512 = matched.sha512.clone();
        }
        if expected_sha512.is_none() && chosen.name.to_ascii_lowercase().ends_with(".appimage") {
            expected_sha512 = yml.sha512.clone();
        }
    }

    Some(SelectedLinuxAsset {
        name: chosen.name.clone(),
        url: chosen.browser_download_url.clone(),
        size: chosen.size,
        sha512: expected_sha512,
        arch: detect_asset_arch(&chosen.name).unwrap_or(norm_arch),
    })
}

pub fn shell_quote_posix(s: &str) -> String {
    let clean: String = s
        .chars()
        .filter(|c| *c != '\r' && *c != '\n' && *c != '\0')
        .collect();
    format!("'{}'", clean.replace('\'', "'\\''"))
}

pub fn build_linux_install_command(
    install_type: &str,
    file_path_or_name: &str,
    flatpak_id: Option<&str>,
    snap_name: Option<&str>,
) -> String {
    let raw = file_path_or_name.trim();
    let quoted = if raw.is_empty() {
        None
    } else if raw.contains('/') {
        Some(shell_quote_posix(raw))
    } else {
        Some(shell_quote_posix(&format!(
            "./{}",
            sanitize_update_file_name(raw, "QBrowse-update.bin")
        )))
    };

    match install_type {
        "flatpak" => format!("flatpak update {}", flatpak_id.unwrap_or("com.qbrowse.app")),
        "snap" => format!("sudo snap refresh {}", snap_name.unwrap_or("qbrowse")),
        "deb" => quoted
            .map(|q| format!("sudo apt install {q}"))
            .unwrap_or_else(|| "sudo apt install ./qbrowse.deb".to_string()),
        "rpm" => quoted
            .map(|q| format!("sudo dnf install {q}"))
            .unwrap_or_else(|| "sudo dnf install ./qbrowse.rpm".to_string()),
        "pacman" => quoted
            .map(|q| format!("sudo pacman -U {q}"))
            .unwrap_or_else(|| "sudo pacman -U ./qbrowse.pacman".to_string()),
        "tarball" => quoted
            .map(|q| format!("tar -xzf {q}"))
            .unwrap_or_else(|| "tar -xzf ./qbrowse.tar.gz".to_string()),
        "appimage" => quoted
            .map(|q| format!("chmod +x {q} && {q}"))
            .unwrap_or_else(|| "chmod +x ./QBrowse.AppImage && ./QBrowse.AppImage".to_string()),
        _ => quoted
            .map(|q| format!("xdg-open {q}"))
            .unwrap_or_default(),
    }
}

/// Compute SHA-512 hex or base64 digest of a file and compare against `expected_sha512` (supports both hex and base64).
pub fn verify_file_sha512(file_path: &Path, expected_sha512: &str) -> Result<bool> {
    let mut f = fs::File::open(file_path)?;
    let mut hasher = Sha512::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = f.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    let digest = hasher.finalize();
    let hex_digest = hex::encode(digest);
    if hex_digest.eq_ignore_ascii_case(expected_sha512.trim()) {
        return Ok(true);
    }
    use std::io::Write;
    let _ = std::io::sink().write(&[]);
    // electron-builder latest.yml stores base64-encoded SHA-512
    const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut b64 = String::with_capacity(88);
    let bytes = digest.as_slice();
    let mut idx = 0;
    while idx < bytes.len() {
        let b0 = bytes[idx] as usize;
        let b1 = if idx + 1 < bytes.len() { bytes[idx + 1] as usize } else { 0 };
        let b2 = if idx + 2 < bytes.len() { bytes[idx + 2] as usize } else { 0 };
        b64.push(B64[(b0 >> 2) & 0x3f] as char);
        b64.push(B64[((b0 << 4) | (b1 >> 4)) & 0x3f] as char);
        b64.push(if idx + 1 < bytes.len() { B64[((b1 << 2) | (b2 >> 6)) & 0x3f] as char } else { '=' });
        b64.push(if idx + 2 < bytes.len() { B64[b2 & 0x3f] as char } else { '=' });
        idx += 3;
    }
    Ok(b64 == expected_sha512.trim())
}

/// Atomically replace a target AppImage file with optional SHA-512 verification and `0o755` permissions.
pub fn replace_appimage_atomically(
    downloaded_file_path: &str,
    target_appimage_path: &str,
    expected_sha512: Option<&str>,
) -> Result<String> {
    if target_appimage_path.is_empty() || target_appimage_path.contains('\0') {
        return Err(anyhow!("Invalid target AppImage path: {target_appimage_path}"));
    }
    #[cfg(unix)]
    if !target_appimage_path.starts_with('/') {
        return Err(anyhow!("Target AppImage path must be absolute: {target_appimage_path}"));
    }

    let src = Path::new(downloaded_file_path);
    let dst = Path::new(target_appimage_path);

    if let Some(expected) = expected_sha512 {
        if !verify_file_sha512(src, expected)? {
            return Err(anyhow!("SHA-512 verification failed for downloaded AppImage"));
        }
    }

    let target_dir = dst
        .parent()
        .ok_or_else(|| anyhow!("Target AppImage path has no parent directory"))?;
    let staged_name = format!(".qbrowse-update-{}.AppImage", std::process::id());
    let staged_path = target_dir.join(staged_name);

    let res = (|| -> Result<()> {
        fs::copy(src, &staged_path)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&staged_path, fs::Permissions::from_mode(0o755))?;
        }
        fs::rename(&staged_path, dst)?;
        Ok(())
    })();

    if let Err(e) = res {
        let _ = fs::remove_file(&staged_path);
        return Err(e);
    }

    Ok(target_appimage_path.to_string())
}

pub fn resolve_linux_desktop_entry_state<F>(
    env: &HashMap<String, String>,
    path_exists: F,
) -> LinuxDesktopEntryState
where
    F: Fn(&str) -> bool,
{
    if env.contains_key("FLATPAK_ID") || path_exists("/.flatpak-info") {
        let id = env
            .get("FLATPAK_ID")
            .cloned()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "com.qbrowse.app".to_string());
        return LinuxDesktopEntryState {
            should_write_user_entry: false,
            desktop_id: format!("{id}.desktop"),
        };
    }

    if env.contains_key("SNAP") || env.contains_key("SNAP_NAME") {
        let snap = env
            .get("SNAP_NAME")
            .cloned()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "qbrowse".to_string());
        return LinuxDesktopEntryState {
            should_write_user_entry: false,
            desktop_id: format!("{snap}_{snap}.desktop"),
        };
    }

    if !env.get("APPIMAGE").map(|s| !s.is_empty()).unwrap_or(false) {
        for (file, id) in [
            ("/usr/share/applications/QBrowse.desktop", "QBrowse.desktop"),
            ("/usr/share/applications/qbrowse.desktop", "qbrowse.desktop"),
        ] {
            if path_exists(file) {
                return LinuxDesktopEntryState {
                    should_write_user_entry: false,
                    desktop_id: id.to_string(),
                };
            }
        }
    }

    LinuxDesktopEntryState {
        should_write_user_entry: true,
        desktop_id: "qbrowse.desktop".to_string(),
    }
}
