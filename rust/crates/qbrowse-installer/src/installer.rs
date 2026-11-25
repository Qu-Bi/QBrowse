use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;

use anyhow::{bail, Context, Result};
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use serde::Deserialize;
use sha2::{Digest, Sha512};

pub const GITHUB_API_LATEST_URL: &str =
    "https://api.github.com/repos/Qu-Bi/QBrowse/releases/latest";
pub const GITHUB_DIRECT_LATEST_YML_URL: &str =
    "https://github.com/Qu-Bi/QBrowse/releases/latest/download/latest.yml";
pub const GITHUB_DIRECT_DOWNLOAD_BASE: &str =
    "https://github.com/Qu-Bi/QBrowse/releases/latest/download";
pub const GITHUB_RELEASES_PAGE_URL: &str = "https://github.com/Qu-Bi/QBrowse/releases";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReleaseMeta {
    pub version: String,
    pub path: String,
    pub sha512: String,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct GitHubAsset {
    pub name: String,
    pub browser_download_url: String,
    #[serde(default)]
    pub size: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GitHubRelease {
    pub tag_name: String,
    #[serde(default)]
    pub assets: Vec<GitHubAsset>,
}

#[derive(Debug, Clone)]
pub struct ResolvedRelease {
    pub version: String,
    pub download_url: String,
    pub file_name: String,
    pub expected_sha512: Option<String>,
    pub total_size: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct InstallOptions {
    pub install_dir: PathBuf,
    pub create_desktop_shortcut: bool,
    pub launch_after: bool,
    pub local_installer: Option<PathBuf>,
}

#[derive(Debug, Clone)]
pub enum InstallStage {
    FetchingRelease,
    Downloading {
        downloaded_bytes: u64,
        total_bytes: u64,
        bytes_per_sec: f64,
    },
    Verifying,
    Installing,
    Completed,
}

#[derive(Debug, Deserialize)]
struct RawLatestFile {
    url: Option<String>,
    sha512: Option<String>,
    size: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct RawLatestYml {
    version: Option<String>,
    path: Option<String>,
    sha512: Option<String>,
    size: Option<u64>,
    #[serde(default)]
    files: Vec<RawLatestFile>,
}

/// Parses an electron-builder `latest.yml` manifest into [`ReleaseMeta`].
pub fn parse_latest_yml(yaml_text: &str) -> Option<ReleaseMeta> {
    let raw: RawLatestYml = serde_yaml::from_str(yaml_text).ok()?;
    let version = raw.version?.trim().to_string();
    let first_file = raw.files.first();

    let path = raw
        .path
        .or_else(|| first_file.and_then(|f| f.url.clone()))?
        .trim()
        .to_string();
    let sha512 = raw
        .sha512
        .or_else(|| first_file.and_then(|f| f.sha512.clone()))?
        .trim()
        .to_string();
    let size = raw.size.or_else(|| first_file.and_then(|f| f.size));

    if version.is_empty() || path.is_empty() || sha512.is_empty() {
        return None;
    }

    Some(ReleaseMeta {
        version,
        path,
        sha512,
        size,
    })
}

fn is_excluded_installer_name(lower_name: &str) -> bool {
    const EXCLUDED: [&str; 6] = [
        "web-setup",
        "online-setup",
        "bootstrapper",
        "installer",
        ".blockmap",
        "uninstall",
    ];
    EXCLUDED.iter().any(|token| lower_name.contains(token))
}

fn is_offline_nsis_filename(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    if !lower.ends_with(".exe") || is_excluded_installer_name(&lower) {
        return false;
    }
    lower.starts_with("qbrowse-setup-") || lower.starts_with("qbrowse-rust-")
}

/// Selects the offline NSIS `.exe` asset from a GitHub release's asset list.
pub fn select_offline_nsis_asset(assets: &[GitHubAsset]) -> Option<&GitHubAsset> {
    // Prefer `QBrowse-Setup-*.exe` over `QBrowse-Rust-*.exe` when both exist.
    let mut fallback: Option<&GitHubAsset> = None;
    for asset in assets {
        if !is_offline_nsis_filename(&asset.name) {
            continue;
        }
        let lower = asset.name.to_ascii_lowercase();
        if lower.starts_with("qbrowse-setup-") {
            return Some(asset);
        }
        if fallback.is_none() {
            fallback = Some(asset);
        }
    }
    fallback
}

/// Computes the streaming SHA-512 digest of `file_path` and compares it against `expected_b64`.
pub fn verify_sha512_base64(file_path: &Path, expected_b64: &str) -> Result<bool> {
    let mut file = File::open(file_path)
        .with_context(|| format!("failed to open file for SHA-512 check: {}", file_path.display()))?;
    let mut hasher = Sha512::new();
    let mut buf = [0u8; 64 * 1024];

    loop {
        let read = file.read(&mut buf)?;
        if read == 0 {
            break;
        }
        hasher.update(&buf[..read]);
    }

    let digest = hasher.finalize();
    let actual_b64 = BASE64_STANDARD.encode(digest);
    Ok(actual_b64 == expected_b64.trim())
}

/// Builds NSIS silent install arguments. `/D=...` MUST be the last argument without quotes.
pub fn build_nsis_silent_args(install_dir: &Path) -> Vec<String> {
    vec![
        "/S".to_string(),
        format!("/D={}", install_dir.display()),
    ]
}

/// Returns the default per-user installation directory (`%LOCALAPPDATA%\Programs\QBrowse`).
pub fn default_install_dir() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        if !local_app_data.trim().is_empty() {
            return PathBuf::from(local_app_data)
                .join("Programs")
                .join("QBrowse");
        }
    }
    if let Ok(home) = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        if !home.trim().is_empty() {
            return PathBuf::from(home)
                .join("AppData")
                .join("Local")
                .join("Programs")
                .join("QBrowse");
        }
    }
    PathBuf::from(r"C:\Program Files\QBrowse")
}

/// Looks for a sibling offline NSIS installer `.exe` next to the running executable.
pub fn find_sibling_offline_installer() -> Option<PathBuf> {
    let current_exe = std::env::current_exe().ok()?;
    let current_name = current_exe
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_ascii_lowercase());
    let dir = current_exe.parent()?;

    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if current_name.as_deref() == Some(&name.to_ascii_lowercase()) {
            continue;
        }
        if is_offline_nsis_filename(name) {
            return Some(path);
        }
    }
    None
}

fn build_http_client() -> Result<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(concat!("QBrowse-Installer/", env!("CARGO_PKG_VERSION")))
        .build()
        .context("failed to initialize HTTP client")
}

async fn fetch_latest_yml(client: &reqwest::Client, url: &str) -> Result<ReleaseMeta> {
    let resp = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("failed to fetch {url}"))?
        .error_for_status()
        .with_context(|| format!("HTTP error fetching {url}"))?;
    let text = resp.text().await?;
    parse_latest_yml(&text).context("failed to parse latest.yml metadata")
}

/// Resolves the latest release download URL and SHA-512 checksum from GitHub Releases,
/// falling back to `latest/download/latest.yml` if the GitHub REST API is rate-limited.
pub async fn resolve_latest_release(client: &reqwest::Client) -> Result<ResolvedRelease> {
    let api_resp = client
        .get(GITHUB_API_LATEST_URL)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await;

    if let Ok(resp) = api_resp {
        if resp.status().is_success() {
            if let Ok(release) = resp.json::<GitHubRelease>().await {
                if let Some(asset) = select_offline_nsis_asset(&release.assets) {
                    let yml_url = release
                        .assets
                        .iter()
                        .find(|a| a.name.eq_ignore_ascii_case("latest.yml"))
                        .map(|a| a.browser_download_url.as_str())
                        .unwrap_or(GITHUB_DIRECT_LATEST_YML_URL);

                    let meta = fetch_latest_yml(client, yml_url).await.ok();
                    let expected_sha512 = meta
                        .as_ref()
                        .filter(|m| m.path.eq_ignore_ascii_case(&asset.name))
                        .map(|m| m.sha512.clone())
                        .or_else(|| meta.as_ref().map(|m| m.sha512.clone()));

                    let total_size = if asset.size > 0 {
                        Some(asset.size)
                    } else {
                        meta.and_then(|m| m.size)
                    };

                    return Ok(ResolvedRelease {
                        version: release.tag_name.trim_start_matches('v').to_string(),
                        download_url: asset.browser_download_url.clone(),
                        file_name: asset.name.clone(),
                        expected_sha512,
                        total_size,
                    });
                }
            }
        }
    }

    // Fallback when GitHub API is rate-limited or unavailable
    let meta = fetch_latest_yml(client, GITHUB_DIRECT_LATEST_YML_URL).await?;
    let download_url = format!(
        "{}/{}",
        GITHUB_DIRECT_DOWNLOAD_BASE,
        meta.path.trim_start_matches('/')
    );
    Ok(ResolvedRelease {
        version: meta.version,
        download_url,
        file_name: meta.path,
        expected_sha512: Some(meta.sha512),
        total_size: meta.size,
    })
}

async fn download_with_progress<F>(
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    known_total: Option<u64>,
    on_progress: &mut F,
) -> Result<()>
where
    F: FnMut(InstallStage) + Send,
{
    let mut resp = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("failed to connect to {url}"))?
        .error_for_status()
        .with_context(|| format!("download failed from {url}"))?;

    let total_bytes = resp
        .content_length()
        .or(known_total)
        .unwrap_or(0);

    let mut file = File::create(dest)
        .with_context(|| format!("failed to create temp installer at {}", dest.display()))?;

    let mut downloaded_bytes: u64 = 0;
    let start = Instant::now();
    let mut last_emit = Instant::now();

    on_progress(InstallStage::Downloading {
        downloaded_bytes: 0,
        total_bytes,
        bytes_per_sec: 0.0,
    });

    while let Some(chunk) = resp.chunk().await? {
        file.write_all(&chunk)?;
        downloaded_bytes += chunk.len() as u64;

        let elapsed = start.elapsed().as_secs_f64().max(0.001);
        if last_emit.elapsed().as_millis() >= 60 || (total_bytes > 0 && downloaded_bytes >= total_bytes) {
            last_emit = Instant::now();
            on_progress(InstallStage::Downloading {
                downloaded_bytes,
                total_bytes,
                bytes_per_sec: downloaded_bytes as f64 / elapsed,
            });
        }
    }

    file.flush()?;
    Ok(())
}

/// Runs the full install flow: resolve/download/verify (unless offline), run NSIS silently,
/// manage Desktop shortcut, clean up temp installer, and optionally launch QBrowse.
pub async fn run_install<F>(options: &InstallOptions, mut on_progress: F) -> Result<()>
where
    F: FnMut(InstallStage) + Send,
{
    let mut downloaded_temp: Option<PathBuf> = None;

    let installer_path = if let Some(local) = options
        .local_installer
        .clone()
        .or_else(find_sibling_offline_installer)
    {
        if !local.exists() {
            bail!("Local installer not found: {}", local.display());
        }
        local
    } else {
        on_progress(InstallStage::FetchingRelease);
        let client = build_http_client()?;
        let release = resolve_latest_release(&client).await?;

        let temp_name = format!(
            "qbrowse-installer-{}-{}",
            std::process::id(),
            release.file_name
        );
        let temp_path = std::env::temp_dir().join(temp_name);

        if let Err(err) = download_with_progress(
            &client,
            &release.download_url,
            &temp_path,
            release.total_size,
            &mut on_progress,
        )
        .await
        {
            let _ = std::fs::remove_file(&temp_path);
            return Err(err);
        }

        if let Some(expected_sha) = &release.expected_sha512 {
            on_progress(InstallStage::Verifying);
            let verified = tokio::task::spawn_blocking({
                let path = temp_path.clone();
                let sha = expected_sha.clone();
                move || verify_sha512_base64(&path, &sha)
            })
            .await
            .context("SHA-512 verification task panicked")??;

            if !verified {
                let _ = std::fs::remove_file(&temp_path);
                bail!("SHA-512 verification failed: downloaded installer may be corrupted.");
            }
        }

        downloaded_temp = Some(temp_path.clone());
        temp_path
    };

    on_progress(InstallStage::Installing);

    let install_dir = options.install_dir.clone();
    let nsis_result = tokio::task::spawn_blocking(move || -> Result<()> {
        let args = build_nsis_silent_args(&install_dir);
        let status = std::process::Command::new(&installer_path)
            .args(&args)
            .status()
            .with_context(|| format!("failed to launch installer {}", installer_path.display()))?;

        if !status.success() {
            bail!(
                "NSIS installer exited with status {}",
                status
                    .code()
                    .map(|c| c.to_string())
                    .unwrap_or_else(|| "unknown".to_string())
            );
        }
        Ok(())
    })
    .await
    .context("installer execution task panicked")?;

    if let Some(temp_path) = downloaded_temp {
        let _ = std::fs::remove_file(temp_path);
    }

    nsis_result?;

    apply_desktop_shortcut_preference(&options.install_dir, options.create_desktop_shortcut);

    if options.launch_after {
        let exe_path = options.install_dir.join("QBrowse.exe");
        if exe_path.exists() {
            let _ = std::process::Command::new(&exe_path).spawn();
        }
    }

    on_progress(InstallStage::Completed);
    Ok(())
}

#[cfg(windows)]
fn apply_desktop_shortcut_preference(install_dir: &Path, create: bool) {
    let user_desktop = std::env::var("USERPROFILE")
        .ok()
        .map(|p| PathBuf::from(p).join("Desktop").join("QBrowse.lnk"));
    let public_desktop = std::env::var("PUBLIC")
        .ok()
        .map(|p| PathBuf::from(p).join("Desktop").join("QBrowse.lnk"));

    if !create {
        if let Some(path) = user_desktop {
            let _ = std::fs::remove_file(path);
        }
        if let Some(path) = public_desktop {
            let _ = std::fs::remove_file(path);
        }
        return;
    }

    let Some(shortcut_path) = user_desktop else {
        return;
    };
    if shortcut_path.exists() {
        return;
    }
    let target_exe = install_dir.join("QBrowse.exe");
    if !target_exe.exists() {
        return;
    }

    let _ = create_windows_shortcut(&shortcut_path, &target_exe, install_dir);
}

#[cfg(not(windows))]
fn apply_desktop_shortcut_preference(_install_dir: &Path, _create: bool) {}

#[cfg(windows)]
fn create_windows_shortcut(shortcut_path: &Path, target_exe: &Path, work_dir: &Path) -> Result<()> {
    use windows::core::{Interface, HSTRING, PCWSTR};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, IPersistFile, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};

    unsafe {
        let hr_init = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let result = (|| -> Result<()> {
            let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
            let target_h = HSTRING::from(target_exe.as_os_str());
            let dir_h = HSTRING::from(work_dir.as_os_str());
            let desc_h = HSTRING::from("QBrowse Privacy Browser");

            link.SetPath(PCWSTR(target_h.as_ptr()))?;
            link.SetWorkingDirectory(PCWSTR(dir_h.as_ptr()))?;
            link.SetDescription(PCWSTR(desc_h.as_ptr()))?;

            let persist: IPersistFile = link.cast()?;
            let shortcut_h = HSTRING::from(shortcut_path.as_os_str());
            persist.Save(PCWSTR(shortcut_h.as_ptr()), true)?;
            Ok(())
        })();
        if hr_init.is_ok() {
            CoUninitialize();
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_latest_yml_top_level_and_files_size() {
        let yaml = r#"
version: 1.5.1
files:
  - url: QBrowse-Setup-1.5.1.exe
    sha512: abcdef123456==
    size: 98765432
path: QBrowse-Setup-1.5.1.exe
sha512: abcdef123456==
releaseDate: '2026-11-25T12:00:00.000Z'
"#;
        let meta = parse_latest_yml(yaml).expect("should parse valid latest.yml");
        assert_eq!(meta.version, "1.5.1");
        assert_eq!(meta.path, "QBrowse-Setup-1.5.1.exe");
        assert_eq!(meta.sha512, "abcdef123456==");
        assert_eq!(meta.size, Some(98765432));
    }

    #[test]
    fn test_parse_latest_yml_missing_required_fields() {
        assert!(parse_latest_yml("version: 1.5.1\n").is_none());
        assert!(parse_latest_yml("not: valid: yaml: [").is_none());
    }

    #[test]
    fn test_select_offline_nsis_asset_filters_web_and_blockmap() {
        let assets = vec![
            GitHubAsset {
                name: "QBrowse-Web-Setup-1.5.1.exe".into(),
                browser_download_url: "https://example.com/web.exe".into(),
                size: 3_000_000,
            },
            GitHubAsset {
                name: "QBrowse-Setup-1.5.1.exe.blockmap".into(),
                browser_download_url: "https://example.com/blockmap".into(),
                size: 120_000,
            },
            GitHubAsset {
                name: "QBrowse-Online-Setup-1.5.1.exe".into(),
                browser_download_url: "https://example.com/online.exe".into(),
                size: 3_000_000,
            },
            GitHubAsset {
                name: "QBrowse-Bootstrapper.exe".into(),
                browser_download_url: "https://example.com/boot.exe".into(),
                size: 2_000_000,
            },
            GitHubAsset {
                name: "QBrowse-Uninstall.exe".into(),
                browser_download_url: "https://example.com/uninstall.exe".into(),
                size: 500_000,
            },
            GitHubAsset {
                name: "QBrowse-Setup-1.5.1.exe".into(),
                browser_download_url: "https://example.com/setup.exe".into(),
                size: 105_000_000,
            },
        ];

        let selected = select_offline_nsis_asset(&assets).expect("should select offline setup");
        assert_eq!(selected.name, "QBrowse-Setup-1.5.1.exe");
    }

    #[test]
    fn test_select_offline_nsis_asset_supports_rust_prefix() {
        let assets = vec![GitHubAsset {
            name: "QBrowse-Rust-1.5.1.exe".into(),
            browser_download_url: "https://example.com/rust.exe".into(),
            size: 95_000_000,
        }];
        let selected = select_offline_nsis_asset(&assets).expect("should select rust setup");
        assert_eq!(selected.name, "QBrowse-Rust-1.5.1.exe");
    }

    #[test]
    fn test_verify_sha512_base64() {
        let temp_path = std::env::temp_dir().join(format!(
            "qbrowse-sha512-test-{}.bin",
            std::process::id()
        ));
        let payload = b"QBrowse-Installer-SHA512-Test-Payload";
        std::fs::write(&temp_path, payload).unwrap();

        let expected = BASE64_STANDARD.encode(Sha512::digest(payload));
        assert!(verify_sha512_base64(&temp_path, &expected).unwrap());
        assert!(!verify_sha512_base64(&temp_path, "invalidbase64==").unwrap());

        let _ = std::fs::remove_file(&temp_path);
    }

    #[test]
    fn test_build_nsis_silent_args() {
        let dir = PathBuf::from(r"C:\Users\Alice\AppData\Local\Programs\QBrowse");
        let args = build_nsis_silent_args(&dir);
        assert_eq!(
            args,
            vec![
                "/S".to_string(),
                r"/D=C:\Users\Alice\AppData\Local\Programs\QBrowse".to_string()
            ]
        );
    }
}
