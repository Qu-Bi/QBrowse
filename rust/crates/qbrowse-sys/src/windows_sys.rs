use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultBrowserStatus {
    pub is_default: bool,
    pub platform: String,
    pub http_prog_id: Option<String>,
    pub https_prog_id: Option<String>,
}

#[cfg(windows)]
mod platform {
    use super::DefaultBrowserStatus;
    use anyhow::{anyhow, Result};
    use core::ffi::c_void;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWINDOWATTRIBUTE};
    use windows::Win32::UI::WindowsAndMessaging::{
        SystemParametersInfoW, SPI_GETCLIENTAREAANIMATION, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
    };
    use windows_registry::CURRENT_USER;

    const DWMWA_WINDOW_CORNER_PREFERENCE: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(33);
    pub const DWMWCP_DEFAULT: u32 = 0;
    pub const DWMWCP_DONOTROUND: u32 = 1;
    pub const DWMWCP_ROUND: u32 = 2;
    pub const DWMWCP_ROUNDSMALL: u32 = 3;

    pub fn set_window_rounded_corners(hwnd_isize: isize, preference: u32) -> Result<()> {
        if hwnd_isize == 0 {
            return Err(anyhow!("Invalid null HWND"));
        }
        let hwnd = HWND(hwnd_isize as *mut c_void);
        let pref: u32 = super::normalize_corner_preference(preference);
        unsafe {
            DwmSetWindowAttribute(
                hwnd,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &pref as *const u32 as *const c_void,
                std::mem::size_of::<u32>() as u32,
            )
        }
        .map_err(|e| anyhow!("DwmSetWindowAttribute failed: {e}"))
    }

    pub fn is_reduced_motion_enabled() -> bool {
        let mut client_area_animation: i32 = 1;
        let ok = unsafe {
            SystemParametersInfoW(
                SPI_GETCLIENTAREAANIMATION,
                0,
                Some(&mut client_area_animation as *mut i32 as *mut c_void),
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
            )
        };
        if ok.is_ok() {
            // When client area animations are disabled (0), reduced motion is enabled.
            client_area_animation == 0
        } else {
            false
        }
    }

    fn read_prog_id(subkey: &str) -> Option<String> {
        CURRENT_USER
            .open(subkey)
            .ok()
            .and_then(|k| k.get_string("ProgId").ok())
    }

    pub fn check_default_browser() -> DefaultBrowserStatus {
        let http_prog_id = read_prog_id(
            r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice",
        );
        let https_prog_id = read_prog_id(
            r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice",
        );
        let is_qbrowse = |id: &Option<String>| {
            id.as_deref()
                .map(|s| s.to_ascii_lowercase().contains("qbrowse"))
                .unwrap_or(false)
        };
        DefaultBrowserStatus {
            is_default: is_qbrowse(&http_prog_id) || is_qbrowse(&https_prog_id),
            platform: "win32".to_string(),
            http_prog_id,
            https_prog_id,
        }
    }

    pub fn register_default_browser_hkcu(exe_path: &str) -> Result<()> {
        let open_cmd = format!("\"{exe_path}\" \"%1\"");
        let start_cmd = format!("\"{exe_path}\"");
        let icon_cmd = format!("{exe_path},0");

        let k_html = CURRENT_USER.create(r"Software\Classes\QBrowseHTML")?;
        k_html.set_string("", "QBrowse HTML Document")?;
        k_html.set_string("AppUserModelId", "com.qbrowse.app")?;
        k_html.set_string("URL Protocol", "")?;

        let k_html_app = CURRENT_USER.create(r"Software\Classes\QBrowseHTML\Application")?;
        k_html_app.set_string("AppUserModelId", "com.qbrowse.app")?;
        k_html_app.set_string("ApplicationIcon", &icon_cmd)?;
        k_html_app.set_string("ApplicationName", "QBrowse")?;
        k_html_app.set_string(
            "ApplicationDescription",
            "QBrowse - Intelligent Next-Gen Web Browser",
        )?;
        k_html_app.set_string("ApplicationCompany", "QuBI")?;

        let k_html_icon = CURRENT_USER.create(r"Software\Classes\QBrowseHTML\DefaultIcon")?;
        k_html_icon.set_string("", &icon_cmd)?;

        let k_html_cmd =
            CURRENT_USER.create(r"Software\Classes\QBrowseHTML\shell\open\command")?;
        k_html_cmd.set_string("", &open_cmd)?;

        let k_proto = CURRENT_USER.create(r"Software\Classes\qbrowse")?;
        k_proto.set_string("", "URL:QBrowse Protocol")?;
        k_proto.set_string("URL Protocol", "")?;

        let k_proto_icon = CURRENT_USER.create(r"Software\Classes\qbrowse\DefaultIcon")?;
        k_proto_icon.set_string("", &icon_cmd)?;

        let k_proto_cmd = CURRENT_USER.create(r"Software\Classes\qbrowse\shell\open\command")?;
        k_proto_cmd.set_string("", &open_cmd)?;

        let k_smi = CURRENT_USER.create(r"Software\Clients\StartMenuInternet\QBrowse")?;
        k_smi.set_string("", "QBrowse")?;

        let k_smi_icon =
            CURRENT_USER.create(r"Software\Clients\StartMenuInternet\QBrowse\DefaultIcon")?;
        k_smi_icon.set_string("", &icon_cmd)?;

        let k_smi_info =
            CURRENT_USER.create(r"Software\Clients\StartMenuInternet\QBrowse\InstallInfo")?;
        k_smi_info.set_string(
            "ReinstallCommand",
            &format!("\"{exe_path}\" --make-default-browser"),
        )?;
        k_smi_info.set_string("HideIconsCommand", &format!("\"{exe_path}\" --hide-icons"))?;
        k_smi_info.set_string("ShowIconsCommand", &format!("\"{exe_path}\" --show-icons"))?;
        k_smi_info.set_u32("IconsVisible", 1)?;

        let k_smi_cmd = CURRENT_USER
            .create(r"Software\Clients\StartMenuInternet\QBrowse\shell\open\command")?;
        k_smi_cmd.set_string("", &start_cmd)?;

        let k_cap =
            CURRENT_USER.create(r"Software\Clients\StartMenuInternet\QBrowse\Capabilities")?;
        k_cap.set_string("ApplicationName", "QBrowse")?;
        k_cap.set_string("ApplicationIcon", &icon_cmd)?;
        k_cap.set_string(
            "ApplicationDescription",
            "QBrowse - Fast, private, intelligent web browser",
        )?;

        let k_cap_sm = CURRENT_USER
            .create(r"Software\Clients\StartMenuInternet\QBrowse\Capabilities\Startmenu")?;
        k_cap_sm.set_string("StartMenuInternet", "QBrowse")?;

        let k_cap_fa = CURRENT_USER.create(
            r"Software\Clients\StartMenuInternet\QBrowse\Capabilities\FileAssociations",
        )?;
        for ext in [".htm", ".html", ".shtml", ".xht", ".xhtml", ".svg", ".webp"] {
            k_cap_fa.set_string(ext, "QBrowseHTML")?;
        }

        let k_cap_ua = CURRENT_USER.create(
            r"Software\Clients\StartMenuInternet\QBrowse\Capabilities\URLAssociations",
        )?;
        k_cap_ua.set_string("http", "QBrowseHTML")?;
        k_cap_ua.set_string("https", "QBrowseHTML")?;
        k_cap_ua.set_string("qbrowse", "qbrowse")?;

        let k_reg = CURRENT_USER.create(r"Software\RegisteredApplications")?;
        k_reg.set_string(
            "QBrowse",
            r"Software\Clients\StartMenuInternet\QBrowse\Capabilities",
        )?;

        Ok(())
    }
}

#[cfg(not(windows))]
mod platform {
    use super::DefaultBrowserStatus;
    use anyhow::{anyhow, Result};

    pub fn set_window_rounded_corners(_hwnd_isize: isize, _preference: u32) -> Result<()> {
        Ok(())
    }

    pub fn is_reduced_motion_enabled() -> bool {
        false
    }

    pub fn check_default_browser() -> DefaultBrowserStatus {
        DefaultBrowserStatus {
            is_default: false,
            platform: std::env::consts::OS.to_string(),
            http_prog_id: None,
            https_prog_id: None,
        }
    }

    pub fn register_default_browser_hkcu(_exe_path: &str) -> Result<()> {
        Err(anyhow!(
            "HKCU default browser registration is only supported on Windows"
        ))
    }
}

/// Normalize a Windows 11 DWM corner preference code (`0`..=`3`, defaulting to `0` if out of range).
pub fn normalize_corner_preference(preference: u32) -> u32 {
    if preference <= 3 {
        preference
    } else {
        0
    }
}

/// Set Windows 11 rounded corners via `DwmSetWindowAttribute` (`DWMWA_WINDOW_CORNER_PREFERENCE = 33`).
/// `preference`: `0` = default, `1` = do not round (sharp), `2` = round, `3` = round small (cohesive).
pub fn set_window_rounded_corners(hwnd_isize: isize, preference: u32) -> Result<()> {
    platform::set_window_rounded_corners(hwnd_isize, preference)
}

/// Query Windows `SPI_GETCLIENTAREAANIMATION` for reduced motion preference.
pub fn is_reduced_motion_enabled() -> bool {
    platform::is_reduced_motion_enabled()
}

/// Check HKCU `UserChoice` `ProgId` for `http` and `https`.
pub fn check_default_browser() -> DefaultBrowserStatus {
    platform::check_default_browser()
}

/// Register QBrowse capabilities and URL/file associations under HKCU.
pub fn register_default_browser_hkcu(exe_path: &str) -> Result<()> {
    platform::register_default_browser_hkcu(exe_path)
}
