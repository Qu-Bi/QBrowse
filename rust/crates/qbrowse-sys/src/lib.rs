pub mod linux_update;
pub mod telemetry;
pub mod windows_sys;

pub use linux_update::{
    build_linux_install_command, detect_asset_arch, detect_linux_install_type,
    get_linux_metadata_file_name, is_non_package_artifact, normalize_linux_arch,
    replace_appimage_atomically, resolve_linux_desktop_entry_state, sanitize_update_file_name,
    select_linux_release_asset, shell_quote_posix, verify_file_sha512, LatestYml, LatestYmlFile,
    LinuxDesktopEntryState, LinuxInstallInfo, ReleaseAsset, SelectedLinuxAsset,
};
pub use telemetry::{compare_semver, get_process_telemetry, parse_latest_yml, ProcessTelemetry};
pub use windows_sys::{
    check_default_browser, is_reduced_motion_enabled, register_default_browser_hkcu,
    set_window_rounded_corners, DefaultBrowserStatus,
};

pub fn ping() -> &'static str {
    "qbrowse-sys"
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_semver_and_latest_yml() {
        assert_eq!(compare_semver("v1.4.3", "1.4.2"), 1);
        assert_eq!(compare_semver("1.4.3-beta.1", "1.4.3"), -1);
        assert_eq!(compare_semver("1.4.3-beta.2", "1.4.3-beta.10"), -1);
        assert_eq!(compare_semver("1.4.3+build1", "1.4.3"), 0);

        let yml = r#"
version: 1.4.3
files:
  - url: QBrowse-1.4.3.AppImage
    sha512: abc123
    size: 100000
path: QBrowse-1.4.3.AppImage
sha512: abc123
"#;
        let parsed = parse_latest_yml(yml).unwrap();
        assert_eq!(parsed.version, "1.4.3");
        assert_eq!(parsed.files.len(), 1);
        assert_eq!(parsed.files[0].sha512.as_deref(), Some("abc123"));
    }

    #[test]
    fn test_linux_update_helpers() {
        assert_eq!(normalize_linux_arch("x86_64"), "x64");
        assert_eq!(normalize_linux_arch("aarch64"), "arm64");
        assert_eq!(get_linux_metadata_file_name("x86_64"), "latest-linux.yml");
        assert_eq!(
            get_linux_metadata_file_name("aarch64"),
            "latest-linux-arm64.yml"
        );
        assert_eq!(
            detect_asset_arch("QBrowse-1.4.3-arm64.AppImage").as_deref(),
            Some("arm64")
        );
        assert!(is_non_package_artifact("QBrowse.AppImage.blockmap"));
        assert!(!is_non_package_artifact("QBrowse-1.4.3.AppImage"));
        assert_eq!(
            sanitize_update_file_name("../../bad$file name.AppImage", "fallback"),
            "badfile-name.AppImage"
        );

        let mut env = HashMap::new();
        env.insert("APPIMAGE".into(), "/home/user/QBrowse.AppImage".into());
        let info = detect_linux_install_type(&env, "/tmp/.mount/qbrowse", "x86_64", |_| false);
        assert_eq!(info.install_type, "appimage");
        assert!(info.can_auto_install);

        let assets = vec![
            ReleaseAsset {
                name: "QBrowse-1.4.3.AppImage".into(),
                browser_download_url: "https://example.com/QBrowse.AppImage".into(),
                size: 1234,
            },
            ReleaseAsset {
                name: "QBrowse-1.4.3-arm64.AppImage".into(),
                browser_download_url: "https://example.com/QBrowse-arm64.AppImage".into(),
                size: 1235,
            },
        ];
        let yml = LatestYml {
            version: "1.4.3".into(),
            files: vec![LatestYmlFile {
                url: "QBrowse-1.4.3.AppImage".into(),
                sha512: Some("deadbeef".into()),
                size: Some(1234),
            }],
            path: None,
            sha512: None,
            release_date: None,
        };
        let selected = select_linux_release_asset(&assets, "appimage", "x64", Some(&yml)).unwrap();
        assert_eq!(selected.name, "QBrowse-1.4.3.AppImage");
        assert_eq!(selected.sha512.as_deref(), Some("deadbeef"));

        let cmd = build_linux_install_command("deb", "qbrowse_1.4.3_amd64.deb", None, None);
        assert_eq!(cmd, "sudo apt install './qbrowse_1.4.3_amd64.deb'");
    }

    #[test]
    fn test_process_telemetry_and_windows_queries() {
        let tel = get_process_telemetry();
        assert_eq!(tel.pid, std::process::id());
        assert!(tel.system_total_memory_bytes > 0);
        assert!(tel.cpu_count >= 1);

        let _ = is_reduced_motion_enabled();
        let status = check_default_browser();
        assert!(!status.platform.is_empty());
    }
}
