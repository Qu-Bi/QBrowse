#![cfg(windows)]

use std::ffi::OsString;
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use anyhow::Result;
use image::imageops::FilterType;
use windows::core::{w, PCWSTR, PWSTR};
use windows::Win32::Foundation::{COLORREF, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Dwm::{
    DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
    DWM_WINDOW_CORNER_PREFERENCE,
};
use windows::Win32::Graphics::Gdi::{
    BeginPaint, BitBlt, CreateCompatibleDC, CreateDIBSection, CreateFontW, DeleteDC, DeleteObject,
    DrawTextW, EndPaint, InvalidateRect, SelectObject, SetBkMode, SetTextColor, BITMAPINFO,
    BITMAPINFOHEADER, BI_RGB, CLEARTYPE_QUALITY, CLIP_DEFAULT_PRECIS, DEFAULT_CHARSET,
    DEFAULT_PITCH, DIB_RGB_COLORS, DT_CALCRECT, DT_CENTER, DT_END_ELLIPSIS, DT_LEFT,
    DT_NOPREFIX, DT_RIGHT, DT_SINGLELINE, DT_VCENTER, DT_WORDBREAK, FF_SWISS, FW_BOLD,
    FW_MEDIUM, FW_NORMAL, FW_SEMIBOLD, HBITMAP, HDC, HFONT, OUT_DEFAULT_PRECIS, PAINTSTRUCT,
    SRCCOPY, TRANSPARENT,
};
use windows::Win32::System::Com::{CoInitializeEx, CoTaskMemFree, CoUninitialize, COINIT_APARTMENTTHREADED};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::HiDpi::{
    GetDpiForWindow, SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
};
use windows::Win32::UI::Input::KeyboardAndMouse::ReleaseCapture;
use windows::Win32::UI::Shell::{
    SHBrowseForFolderW, SHGetPathFromIDListW, ShellExecuteW, BIF_EDITBOX, BIF_NEWDIALOGSTYLE,
    BIF_RETURNONLYFSDIRS, BROWSEINFOW,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetClientRect, GetMessageW,
    GetSystemMetrics, KillTimer, LoadCursorW, PostMessageW, PostQuitMessage, RegisterClassW,
    SendMessageW, SetCursor, SetTimer, ShowWindow, TranslateMessage, HTCAPTION, HTCLIENT,
    IDC_ARROW, IDC_HAND, MSG, SM_CXSCREEN, SM_CYSCREEN, SW_MINIMIZE, SW_SHOW, WM_APP, WM_CREATE,
    WM_DESTROY, WM_ERASEBKGND, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MOUSEMOVE, WM_NCLBUTTONDOWN,
    WM_PAINT, WM_SETCURSOR, WM_TIMER, WNDCLASSW, WS_EX_APPWINDOW, WS_MINIMIZEBOX, WS_POPUP,
    WS_SYSMENU, WS_VISIBLE,
};

use crate::installer::{
    run_install, InstallOptions, InstallStage, GITHUB_RELEASES_PAGE_URL,
};

const WIN_W: f32 = 520.0;
const WIN_H: f32 = 380.0;

const TIMER_ANIM_ID: usize = 1;
const TIMER_AUTOCLOSE_ID: usize = 2;
const WM_APP_STATE_CHANGED: u32 = WM_APP + 1;

const LOGO_BYTES: &[u8] = include_bytes!("../../../../icon.png");

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Screen {
    Splash,
    PreInstall,
    Installing,
    Completed,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum HitTarget {
    None,
    Minimize,
    Close,
    DragHeader,
    ChangeDir,
    CheckDesktop,
    CheckLaunch,
    PrimaryButton,
    OpenReleasesLink,
}

#[derive(Debug, Clone)]
struct RectF {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
}

impl RectF {
    fn contains(&self, px: f32, py: f32) -> bool {
        px >= self.x && px <= self.x + self.w && py >= self.y && py <= self.y + self.h
    }
}

struct SharedInstallState {
    screen: Screen,
    status_text: String,
    metrics_text: String,
    progress_fraction: f32,
    indeterminate: bool,
    error_message: String,
}

struct LogoRgba {
    width: u32,
    height: u32,
    pixels: Vec<u8>, // RGBA
}

struct AppState {
    hwnd: HWND,
    scale: f32,
    options: InstallOptions,
    shared: Arc<Mutex<SharedInstallState>>,
    hover: HitTarget,
    pressed: HitTarget,
    anim_tick: f32,
    splash_progress: f32,
    logo_raw: Option<image::DynamicImage>,
    logo_scaled: Option<LogoRgba>,
    logo_scaled_px: u32,
}

impl AppState {
    fn ensure_scaled_logo(&mut self, target_px: u32) {
        if self.logo_scaled_px == target_px && self.logo_scaled.is_some() {
            return;
        }
        if let Some(img) = &self.logo_raw {
            let resized = img.resize_exact(target_px, target_px, FilterType::Lanczos3);
            let rgba = resized.to_rgba8();
            self.logo_scaled = Some(LogoRgba {
                width: rgba.width(),
                height: rgba.height(),
                pixels: rgba.into_raw(),
            });
            self.logo_scaled_px = target_px;
        }
    }
}

fn rect_minimize() -> RectF {
    RectF { x: WIN_W - 76.0, y: 10.0, w: 30.0, h: 28.0 }
}

fn rect_close() -> RectF {
    RectF { x: WIN_W - 42.0, y: 10.0, w: 30.0, h: 28.0 }
}

fn rect_header() -> RectF {
    RectF { x: 0.0, y: 0.0, w: WIN_W, h: 48.0 }
}

fn rect_change_dir() -> RectF {
    RectF { x: WIN_W - 28.0 - 88.0, y: 146.0, w: 88.0, h: 36.0 }
}

fn rect_check_desktop() -> RectF {
    RectF { x: 28.0, y: 202.0, w: 230.0, h: 28.0 }
}

fn rect_check_launch() -> RectF {
    RectF { x: 28.0, y: 236.0, w: 250.0, h: 28.0 }
}

fn rect_primary_button() -> RectF {
    RectF { x: 28.0, y: 302.0, w: WIN_W - 56.0, h: 46.0 }
}

fn rect_open_releases() -> RectF {
    RectF { x: 28.0, y: 266.0, w: 200.0, h: 26.0 }
}

fn hit_test(screen: Screen, lx: f32, ly: f32) -> HitTarget {
    if rect_close().contains(lx, ly) {
        return HitTarget::Close;
    }
    if rect_minimize().contains(lx, ly) {
        return HitTarget::Minimize;
    }
    if rect_header().contains(lx, ly) {
        return HitTarget::DragHeader;
    }
    match screen {
        Screen::Splash => HitTarget::None,
        Screen::PreInstall => {
            if rect_change_dir().contains(lx, ly) {
                HitTarget::ChangeDir
            } else if rect_check_desktop().contains(lx, ly) {
                HitTarget::CheckDesktop
            } else if rect_check_launch().contains(lx, ly) {
                HitTarget::CheckLaunch
            } else if rect_primary_button().contains(lx, ly) {
                HitTarget::PrimaryButton
            } else {
                HitTarget::None
            }
        }
        Screen::Installing => HitTarget::None,
        Screen::Completed => {
            if rect_primary_button().contains(lx, ly) {
                HitTarget::PrimaryButton
            } else {
                HitTarget::None
            }
        }
        Screen::Error => {
            if rect_open_releases().contains(lx, ly) {
                HitTarget::OpenReleasesLink
            } else if rect_primary_button().contains(lx, ly) {
                HitTarget::PrimaryButton
            } else {
                HitTarget::None
            }
        }
    }
}

pub fn run_gui(options: InstallOptions) -> Result<()> {
    unsafe {
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
        let hinstance = GetModuleHandleW(None)?;

        let class_name = w!("QBrowseNativeInstallerWindow");
        let wc = WNDCLASSW {
            lpfnWndProc: Some(wnd_proc),
            hInstance: hinstance.into(),
            hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
            lpszClassName: class_name,
            ..Default::default()
        };
        RegisterClassW(&wc);

        let logo_raw = image::load_from_memory(LOGO_BYTES).ok();
        let shared = Arc::new(Mutex::new(SharedInstallState {
            screen: Screen::Splash,
            status_text: "Ready to install".to_string(),
            metrics_text: String::new(),
            progress_fraction: 0.0,
            indeterminate: false,
            error_message: String::new(),
        }));

        let state = Box::new(AppState {
            hwnd: HWND::default(),
            scale: 1.0,
            options,
            shared,
            hover: HitTarget::None,
            pressed: HitTarget::None,
            anim_tick: 0.0,
            splash_progress: 0.0,
            logo_raw,
            logo_scaled: None,
            logo_scaled_px: 0,
        });
        let state_ptr = Box::into_raw(state);

        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);
        let init_w = WIN_W as i32;
        let init_h = WIN_H as i32;
        let x = (screen_w - init_w) / 2;
        let y = (screen_h - init_h) / 2;

        let hwnd = CreateWindowExW(
            WS_EX_APPWINDOW,
            class_name,
            w!("QBrowse Installer"),
            WS_POPUP | WS_VISIBLE | WS_MINIMIZEBOX | WS_SYSMENU,
            x,
            y,
            init_w,
            init_h,
            None,
            None,
            hinstance,
            Some(state_ptr as *const _),
        )?;

        let dpi = GetDpiForWindow(hwnd);
        let scale = if dpi > 0 { dpi as f32 / 96.0 } else { 1.0 };
        let phys_w = (WIN_W * scale).round() as i32;
        let phys_h = (WIN_H * scale).round() as i32;
        let cx = (screen_w - phys_w) / 2;
        let cy = (screen_h - phys_h) / 2;
        windows::Win32::UI::WindowsAndMessaging::MoveWindow(hwnd, cx, cy, phys_w, phys_h, true)?;

        let corner_pref: DWM_WINDOW_CORNER_PREFERENCE = DWMWCP_ROUND;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &corner_pref as *const _ as *const _,
            std::mem::size_of::<DWM_WINDOW_CORNER_PREFERENCE>() as u32,
        );

        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = SetTimer(hwnd, TIMER_ANIM_ID, 16, None);

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
    Ok(())
}

unsafe extern "system" fn wnd_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if msg == WM_CREATE {
        let cs = &*(lparam.0 as *const windows::Win32::UI::WindowsAndMessaging::CREATESTRUCTW);
        let state_ptr = cs.lpCreateParams as *mut AppState;
        if !state_ptr.is_null() {
            (*state_ptr).hwnd = hwnd;
            windows::Win32::UI::WindowsAndMessaging::SetWindowLongPtrW(
                hwnd,
                windows::Win32::UI::WindowsAndMessaging::GWLP_USERDATA,
                state_ptr as isize,
            );
        }
        return LRESULT(0);
    }

    let state_ptr = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(
        hwnd,
        windows::Win32::UI::WindowsAndMessaging::GWLP_USERDATA,
    ) as *mut AppState;

    if state_ptr.is_null() {
        return DefWindowProcW(hwnd, msg, wparam, lparam);
    }
    let state = &mut *state_ptr;

    match msg {
        WM_ERASEBKGND => LRESULT(1),

        WM_SETCURSOR => {
            if (lparam.0 & 0xFFFF) as u32 == HTCLIENT {
                let is_hand = matches!(
                    state.hover,
                    HitTarget::Close
                        | HitTarget::Minimize
                        | HitTarget::ChangeDir
                        | HitTarget::CheckDesktop
                        | HitTarget::CheckLaunch
                        | HitTarget::PrimaryButton
                        | HitTarget::OpenReleasesLink
                );
                let cursor_id = if is_hand { IDC_HAND } else { IDC_ARROW };
                if let Ok(hcur) = LoadCursorW(None, cursor_id) {
                    let _ = SetCursor(hcur);
                }
                return LRESULT(1);
            }
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }

        WM_MOUSEMOVE => {
            let dpi = GetDpiForWindow(hwnd);
            state.scale = if dpi > 0 { dpi as f32 / 96.0 } else { 1.0 };
            let px = (lparam.0 & 0xFFFF) as i16 as f32;
            let py = ((lparam.0 >> 16) & 0xFFFF) as i16 as f32;
            let lx = px / state.scale;
            let ly = py / state.scale;
            let screen = state.shared.lock().unwrap().screen;
            let next_hover = hit_test(screen, lx, ly);
            if next_hover != state.hover {
                state.hover = next_hover;
                let _ = InvalidateRect(hwnd, None, false);
            }
            LRESULT(0)
        }

        WM_LBUTTONDOWN => {
            let dpi = GetDpiForWindow(hwnd);
            state.scale = if dpi > 0 { dpi as f32 / 96.0 } else { 1.0 };
            let px = (lparam.0 & 0xFFFF) as i16 as f32;
            let py = ((lparam.0 >> 16) & 0xFFFF) as i16 as f32;
            let lx = px / state.scale;
            let ly = py / state.scale;
            let screen = state.shared.lock().unwrap().screen;
            let target = hit_test(screen, lx, ly);
            if target == HitTarget::DragHeader {
                let _ = ReleaseCapture();
                SendMessageW(hwnd, WM_NCLBUTTONDOWN, WPARAM(HTCAPTION as usize), LPARAM(0));
                return LRESULT(0);
            }
            state.pressed = target;
            let _ = InvalidateRect(hwnd, None, false);
            LRESULT(0)
        }

        WM_LBUTTONUP => {
            let dpi = GetDpiForWindow(hwnd);
            state.scale = if dpi > 0 { dpi as f32 / 96.0 } else { 1.0 };
            let px = (lparam.0 & 0xFFFF) as i16 as f32;
            let py = ((lparam.0 >> 16) & 0xFFFF) as i16 as f32;
            let lx = px / state.scale;
            let ly = py / state.scale;
            let screen = state.shared.lock().unwrap().screen;
            let released_on = hit_test(screen, lx, ly);
            let clicked = if state.pressed == released_on {
                released_on
            } else {
                HitTarget::None
            };
            state.pressed = HitTarget::None;

            match clicked {
                HitTarget::Close => {
                    let _ = DestroyWindow(hwnd);
                }
                HitTarget::Minimize => {
                    let _ = ShowWindow(hwnd, SW_MINIMIZE);
                }
                HitTarget::ChangeDir => {
                    if let Some(chosen) = pick_folder(hwnd, &state.options.install_dir) {
                        state.options.install_dir = chosen;
                    }
                }
                HitTarget::CheckDesktop => {
                    state.options.create_desktop_shortcut = !state.options.create_desktop_shortcut;
                }
                HitTarget::CheckLaunch => {
                    state.options.launch_after = !state.options.launch_after;
                }
                HitTarget::PrimaryButton => match screen {
                    Screen::Splash => {}
                    Screen::PreInstall | Screen::Error => {
                        start_install_worker(hwnd, state);
                    }
                    Screen::Completed => {
                        let _ = DestroyWindow(hwnd);
                    }
                    Screen::Installing => {}
                },
                HitTarget::OpenReleasesLink => {
                    open_url_in_browser(GITHUB_RELEASES_PAGE_URL);
                }
                _ => {}
            }

            let _ = InvalidateRect(hwnd, None, false);
            LRESULT(0)
        }

        WM_TIMER => {
            if wparam.0 == TIMER_ANIM_ID {
                let is_splash = {
                    let mut s = state.shared.lock().unwrap();
                    if s.screen == Screen::Splash {
                        state.splash_progress = (state.splash_progress + 0.015).min(1.0);
                        if state.splash_progress >= 1.0 {
                            s.screen = Screen::PreInstall;
                            let _ = KillTimer(hwnd, TIMER_ANIM_ID);
                        }
                        true
                    } else {
                        false
                    }
                };
                if !is_splash {
                    state.anim_tick += 0.025;
                    if state.anim_tick > 1.0 {
                        state.anim_tick -= 1.0;
                    }
                }
                let _ = InvalidateRect(hwnd, None, false);
            } else if wparam.0 == TIMER_AUTOCLOSE_ID {
                let _ = KillTimer(hwnd, TIMER_AUTOCLOSE_ID);
                let _ = DestroyWindow(hwnd);
            }
            LRESULT(0)
        }

        WM_APP_STATE_CHANGED => {
            let screen = state.shared.lock().unwrap().screen;
            if screen == Screen::Completed {
                let _ = KillTimer(hwnd, TIMER_ANIM_ID);
                if state.options.launch_after {
                    let _ = SetTimer(hwnd, TIMER_AUTOCLOSE_ID, 900, None);
                }
            } else if screen == Screen::Error {
                let _ = KillTimer(hwnd, TIMER_ANIM_ID);
            }
            let _ = InvalidateRect(hwnd, None, false);
            LRESULT(0)
        }

        WM_PAINT => {
            let mut ps = PAINTSTRUCT::default();
            let hdc = BeginPaint(hwnd, &mut ps);
            let mut rc = RECT::default();
            let _ = GetClientRect(hwnd, &mut rc);
            let phys_w = (rc.right - rc.left).max(1);
            let phys_h = (rc.bottom - rc.top).max(1);
            let dpi = GetDpiForWindow(hwnd);
            state.scale = if dpi > 0 { dpi as f32 / 96.0 } else { 1.0 };

            render_frame(hdc, phys_w, phys_h, state);
            let _ = EndPaint(hwnd, &ps);
            LRESULT(0)
        }

        WM_DESTROY => {
            let _ = KillTimer(hwnd, TIMER_ANIM_ID);
            let _ = KillTimer(hwnd, TIMER_AUTOCLOSE_ID);
            windows::Win32::UI::WindowsAndMessaging::SetWindowLongPtrW(
                hwnd,
                windows::Win32::UI::WindowsAndMessaging::GWLP_USERDATA,
                0,
            );
            drop(Box::from_raw(state_ptr));
            PostQuitMessage(0);
            LRESULT(0)
        }

        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

fn start_install_worker(hwnd: HWND, state: &mut AppState) {
    {
        let mut s = state.shared.lock().unwrap();
        s.screen = Screen::Installing;
        s.status_text = if state.options.local_installer.is_some() {
            "Preparing local installer…".to_string()
        } else {
            "Fetching release…".to_string()
        };
        s.metrics_text.clear();
        s.progress_fraction = 0.0;
        s.indeterminate = true;
        s.error_message.clear();
    }

    unsafe {
        let _ = SetTimer(hwnd, TIMER_ANIM_ID, 16, None);
    }

    let options = state.options.clone();
    let shared = Arc::clone(&state.shared);
    let hwnd_raw = hwnd.0 as isize;

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build();

        let notify = || unsafe {
            let _ = PostMessageW(
                HWND(hwnd_raw as *mut _),
                WM_APP_STATE_CHANGED,
                WPARAM(0),
                LPARAM(0),
            );
        };

        let result = match rt {
            Ok(rt) => rt.block_on(run_install(&options, |stage| {
                let mut s = shared.lock().unwrap();
                match stage {
                    InstallStage::FetchingRelease => {
                        s.status_text = "Fetching release…".to_string();
                        s.metrics_text.clear();
                        s.indeterminate = true;
                    }
                    InstallStage::Downloading {
                        downloaded_bytes,
                        total_bytes,
                        bytes_per_sec,
                    } => {
                        s.status_text = "Downloading…".to_string();
                        let dl_mb = downloaded_bytes as f64 / (1024.0 * 1024.0);
                        let speed_mb = bytes_per_sec / (1024.0 * 1024.0);
                        if total_bytes > 0 {
                            let tot_mb = total_bytes as f64 / (1024.0 * 1024.0);
                            s.progress_fraction =
                                (downloaded_bytes as f32 / total_bytes as f32).clamp(0.0, 1.0);
                            s.indeterminate = false;
                            s.metrics_text =
                                format!("{dl_mb:.1} / {tot_mb:.1} MB · {speed_mb:.1} MB/s");
                        } else {
                            s.indeterminate = true;
                            s.metrics_text = format!("{dl_mb:.1} MB · {speed_mb:.1} MB/s");
                        }
                    }
                    InstallStage::Verifying => {
                        s.status_text = "Verifying SHA-512…".to_string();
                        s.metrics_text = "Checking cryptographic integrity".to_string();
                        s.progress_fraction = 1.0;
                        s.indeterminate = true;
                    }
                    InstallStage::Installing => {
                        s.status_text = "Installing QBrowse…".to_string();
                        s.metrics_text = "Extracting files silently".to_string();
                        s.progress_fraction = 1.0;
                        s.indeterminate = true;
                    }
                    InstallStage::Completed => {
                        s.screen = Screen::Completed;
                        s.status_text = "Ready!".to_string();
                        s.metrics_text = if options.launch_after {
                            "Launching QBrowse…".to_string()
                        } else {
                            "QBrowse has been installed.".to_string()
                        };
                        s.progress_fraction = 1.0;
                        s.indeterminate = false;
                    }
                }
                drop(s);
                notify();
            })),
            Err(err) => Err(anyhow::anyhow!("Failed to start async runtime: {err}")),
        };

        if let Err(err) = result {
            let mut s = shared.lock().unwrap();
            s.screen = Screen::Error;
            s.error_message = err.to_string();
            s.indeterminate = false;
            drop(s);
            notify();
        }
    });
}

fn open_url_in_browser(url: &str) {
    let url_w: Vec<u16> = OsString::from(url)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    unsafe {
        let _ = ShellExecuteW(
            None,
            w!("open"),
            PCWSTR(url_w.as_ptr()),
            None,
            None,
            SW_SHOW,
        );
    }
}

fn pick_folder(hwnd: HWND, _initial: &PathBuf) -> Option<PathBuf> {
    unsafe {
        let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let mut display_name = [0u16; 260];
        let title: Vec<u16> = OsString::from("Select QBrowse installation folder")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let bi = BROWSEINFOW {
            hwndOwner: hwnd,
            pszDisplayName: PWSTR(display_name.as_mut_ptr()),
            lpszTitle: PCWSTR(title.as_ptr()),
            ulFlags: BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE | BIF_EDITBOX,
            ..Default::default()
        };

        let pidl = SHBrowseForFolderW(&bi);
        let result = if !pidl.is_null() {
            let mut path_buf = [0u16; 260];
            let ok = SHGetPathFromIDListW(pidl, &mut path_buf);
            CoTaskMemFree(Some(pidl as *const _));
            if ok.as_bool() {
                let len = path_buf.iter().position(|&c| c == 0).unwrap_or(path_buf.len());
                let os = OsString::from_wide(&path_buf[..len]);
                let mut chosen = PathBuf::from(os);
                let ends_with_qbrowse = chosen
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.eq_ignore_ascii_case("QBrowse"))
                    .unwrap_or(false);
                if !ends_with_qbrowse {
                    chosen = chosen.join("QBrowse");
                }
                Some(chosen)
            } else {
                None
            }
        } else {
            None
        };

        if hr.is_ok() {
            CoUninitialize();
        }
        result
    }
}

unsafe fn render_frame(hdc: HDC, phys_w: i32, phys_h: i32, state: &mut AppState) {
    let mem_dc = CreateCompatibleDC(hdc);
    if mem_dc.is_invalid() {
        return;
    }

    let bmi = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: phys_w,
            biHeight: -phys_h, // top-down
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        },
        ..Default::default()
    };

    let mut bits_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
    let hbm: HBITMAP = match CreateDIBSection(mem_dc, &bmi, DIB_RGB_COLORS, &mut bits_ptr, None, 0) {
        Ok(b) => b,
        Err(_) => {
            let _ = DeleteDC(mem_dc);
            return;
        }
    };

    if bits_ptr.is_null() {
        let _ = DeleteObject(hbm);
        let _ = DeleteDC(mem_dc);
        return;
    }

    let old_obj = SelectObject(mem_dc, hbm);
    let len = (phys_w as usize) * (phys_h as usize);
    let pixels = std::slice::from_raw_parts_mut(bits_ptr as *mut u32, len);
    let scale = state.scale;

    let shared_snapshot = {
        let s = state.shared.lock().unwrap();
        (
            s.screen,
            s.status_text.clone(),
            s.metrics_text.clone(),
            s.progress_fraction,
            s.indeterminate,
            s.error_message.clone(),
        )
    };
    let (screen, status_text, metrics_text, progress_fraction, indeterminate, error_message) =
        shared_snapshot;

    let ease_out_cubic = |t: f32| -> f32 {
        let u = 1.0 - t.clamp(0.0, 1.0);
        1.0 - u * u * u
    };

    let ui_reveal = if screen == Screen::Splash {
        let t = ((state.splash_progress - 0.62) / 0.38).clamp(0.0, 1.0);
        ease_out_cubic(t)
    } else {
        1.0
    };
    let ui_y_offset = (1.0 - ui_reveal) * 10.0;

    // 1. Deep obsidian gradient background (#07080a -> #0f1119) + warm-gold radial glow
    draw_background(
        pixels,
        phys_w,
        phys_h,
        scale,
        if screen == Screen::Splash {
            Some(state.splash_progress)
        } else {
            None
        },
    );

    // 2. Embedded QBrowse logo (animates from centered boot splash monogram to header slot)
    let (logo_x, logo_y, logo_size) = if screen == Screen::Splash {
        let sp = state.splash_progress;
        let center_size = 92.0;
        let center_x = (WIN_W - center_size) * 0.5;
        let center_y = (WIN_H - center_size) * 0.5 - 8.0;
        if sp < 0.62 {
            let enter = ease_out_cubic((sp / 0.35).clamp(0.0, 1.0));
            let breathe = 1.0 + 0.025 * (sp * std::f32::consts::PI * 2.5).sin();
            let s = center_size * (0.86 + 0.14 * enter) * breathe;
            ((WIN_W - s) * 0.5, (WIN_H - s) * 0.5 - 8.0, s)
        } else {
            let move_t = ease_out_cubic(((sp - 0.62) / 0.38).clamp(0.0, 1.0));
            let s = center_size + (46.0 - center_size) * move_t;
            let x = center_x + (28.0 - center_x) * move_t;
            let y = center_y + (54.0 - center_y) * move_t;
            (x, y, s)
        }
    } else {
        (28.0, 54.0, 46.0)
    };

    let logo_px = (logo_size * scale).round().max(16.0) as u32;
    state.ensure_scaled_logo(logo_px);
    if let Some(logo) = &state.logo_scaled {
        blit_rgba(
            pixels,
            phys_w,
            phys_h,
            (logo_x * scale).round() as i32,
            (logo_y * scale).round() as i32,
            logo,
        );
    }

    // 3. Top-right window controls (minimize & close)
    draw_window_controls(pixels, phys_w, phys_h, scale, state.hover, state.pressed);

    // 4. Screen-specific vector shapes
    match screen {
        Screen::Splash => {
            if ui_reveal > 0.02 {
                draw_round_rect(
                    pixels,
                    phys_w,
                    phys_h,
                    28.0 * scale,
                    (146.0 + ui_y_offset) * scale,
                    (WIN_W - 56.0 - 96.0) * scale,
                    36.0 * scale,
                    8.0 * scale,
                    rgba(0x14, 0x17, 0x22, (255.0 * ui_reveal) as u8),
                );
                draw_round_rect(
                    pixels,
                    phys_w,
                    phys_h,
                    rect_change_dir().x * scale,
                    (rect_change_dir().y + ui_y_offset) * scale,
                    rect_change_dir().w * scale,
                    rect_change_dir().h * scale,
                    8.0 * scale,
                    rgba(0x18, 0x1b, 0x27, (255.0 * ui_reveal) as u8),
                );
                let btn = rect_primary_button();
                draw_round_rect(
                    pixels,
                    phys_w,
                    phys_h,
                    btn.x * scale,
                    (btn.y + ui_y_offset) * scale,
                    btn.w * scale,
                    btn.h * scale,
                    10.0 * scale,
                    rgba(0xd4, 0xbc, 0x94, (255.0 * ui_reveal) as u8),
                );
            }
        }
        Screen::PreInstall => {
            // Install folder box
            draw_round_rect(
                pixels,
                phys_w,
                phys_h,
                28.0 * scale,
                146.0 * scale,
                (WIN_W - 56.0 - 96.0) * scale,
                36.0 * scale,
                8.0 * scale,
                rgba(0x14, 0x17, 0x22, 255),
            );
            stroke_round_rect(
                pixels,
                phys_w,
                phys_h,
                28.0 * scale,
                146.0 * scale,
                (WIN_W - 56.0 - 96.0) * scale,
                36.0 * scale,
                8.0 * scale,
                1.0 * scale,
                rgba(0x2b, 0x30, 0x42, 255),
            );

            // Change... button
            let ch_rect = rect_change_dir();
            let ch_bg = if state.pressed == HitTarget::ChangeDir {
                rgba(0x27, 0x2c, 0x3d, 255)
            } else if state.hover == HitTarget::ChangeDir {
                rgba(0x21, 0x25, 0x34, 255)
            } else {
                rgba(0x18, 0x1b, 0x27, 255)
            };
            draw_round_rect(
                pixels,
                phys_w,
                phys_h,
                ch_rect.x * scale,
                ch_rect.y * scale,
                ch_rect.w * scale,
                ch_rect.h * scale,
                8.0 * scale,
                ch_bg,
            );
            stroke_round_rect(
                pixels,
                phys_w,
                phys_h,
                ch_rect.x * scale,
                ch_rect.y * scale,
                ch_rect.w * scale,
                ch_rect.h * scale,
                8.0 * scale,
                1.0 * scale,
                rgba(0x32, 0x38, 0x4d, 255),
            );

            // Checkboxes
            draw_checkbox(
                pixels,
                phys_w,
                phys_h,
                scale,
                28.0,
                206.0,
                state.options.create_desktop_shortcut,
                state.hover == HitTarget::CheckDesktop,
            );
            draw_checkbox(
                pixels,
                phys_w,
                phys_h,
                scale,
                28.0,
                240.0,
                state.options.launch_after,
                state.hover == HitTarget::CheckLaunch,
            );

            // Primary warm-gold button
            draw_primary_button(
                pixels,
                phys_w,
                phys_h,
                scale,
                state.hover == HitTarget::PrimaryButton,
                state.pressed == HitTarget::PrimaryButton,
            );
        }
        Screen::Installing | Screen::Completed => {
            // Progress track
            let track_x = 28.0 * scale;
            let track_y = 200.0 * scale;
            let track_w = (WIN_W - 56.0) * scale;
            let track_h = 12.0 * scale;
            draw_round_rect(
                pixels,
                phys_w,
                phys_h,
                track_x,
                track_y,
                track_w,
                track_h,
                6.0 * scale,
                rgba(0x1a, 0x1e, 0x2c, 255),
            );

            if indeterminate {
                let seg_w = track_w * 0.34;
                let travel = track_w + seg_w;
                let offset = (state.anim_tick * travel) - seg_w;
                let clamped_x = offset.max(0.0);
                let clamped_r = (offset + seg_w).min(track_w);
                if clamped_r > clamped_x {
                    draw_round_rect(
                        pixels,
                        phys_w,
                        phys_h,
                        track_x + clamped_x,
                        track_y,
                        clamped_r - clamped_x,
                        track_h,
                        6.0 * scale,
                        rgba(0xd4, 0xbc, 0x94, 255),
                    );
                }
            } else {
                let fill_w = (track_w * progress_fraction).max(if progress_fraction > 0.0 {
                    12.0 * scale
                } else {
                    0.0
                });
                if fill_w > 0.0 {
                    draw_round_rect(
                        pixels,
                        phys_w,
                        phys_h,
                        track_x,
                        track_y,
                        fill_w,
                        track_h,
                        6.0 * scale,
                        rgba(0xd4, 0xbc, 0x94, 255),
                    );
                    if screen == Screen::Installing && fill_w > 24.0 * scale {
                        let sweep_w = (fill_w * 0.35).max(20.0 * scale);
                        let sweep_x = track_x + (state.anim_tick * (fill_w + sweep_w)) - sweep_w;
                        let sx = sweep_x.max(track_x);
                        let ex = (sweep_x + sweep_w).min(track_x + fill_w);
                        if ex > sx {
                            draw_round_rect(
                                pixels,
                                phys_w,
                                phys_h,
                                sx,
                                track_y,
                                ex - sx,
                                track_h,
                                6.0 * scale,
                                rgba(0xff, 0xf2, 0xd6, 85),
                            );
                        }
                    }
                }
            }

            if screen == Screen::Completed {
                draw_primary_button(
                    pixels,
                    phys_w,
                    phys_h,
                    scale,
                    state.hover == HitTarget::PrimaryButton,
                    state.pressed == HitTarget::PrimaryButton,
                );
            }
        }
        Screen::Error => {
            // Red status card
            draw_round_rect(
                pixels,
                phys_w,
                phys_h,
                28.0 * scale,
                138.0 * scale,
                (WIN_W - 56.0) * scale,
                114.0 * scale,
                10.0 * scale,
                rgba(0x28, 0x13, 0x18, 255),
            );
            stroke_round_rect(
                pixels,
                phys_w,
                phys_h,
                28.0 * scale,
                138.0 * scale,
                (WIN_W - 56.0) * scale,
                114.0 * scale,
                10.0 * scale,
                1.0 * scale,
                rgba(0x7f, 0x26, 0x31, 255),
            );

            // Retry button
            draw_primary_button(
                pixels,
                phys_w,
                phys_h,
                scale,
                state.hover == HitTarget::PrimaryButton,
                state.pressed == HitTarget::PrimaryButton,
            );
        }
    }

    // 6. Subtle outer window border + top specular highlight
    stroke_round_rect(
        pixels,
        phys_w,
        phys_h,
        0.5,
        0.5,
        phys_w as f32 - 1.0,
        phys_h as f32 - 1.0,
        10.0 * scale,
        1.0,
        rgba(0x2a, 0x2f, 0x42, 220),
    );
    draw_line(
        pixels,
        phys_w,
        phys_h,
        14.0 * scale,
        1.0,
        phys_w as f32 - 14.0 * scale,
        1.0,
        1.0,
        rgba(0xff, 0xff, 0xff, 22),
    );

    // 7. ClearType text via GDI DrawTextW
    let _ = SetBkMode(mem_dc, TRANSPARENT);
    let font_title = make_font((24.0 * scale).round() as i32, FW_BOLD.0 as i32);
    let font_sub = make_font((13.0 * scale).round() as i32, FW_NORMAL.0 as i32);
    let font_label = make_font((12.5 * scale).round() as i32, FW_MEDIUM.0 as i32);
    let font_body = make_font((13.0 * scale).round() as i32, FW_NORMAL.0 as i32);
    let font_btn = make_font((14.5 * scale).round() as i32, FW_SEMIBOLD.0 as i32);

    // Header text (revealed cleanly after splash phase 1)
    if screen != Screen::Splash || ui_reveal > 0.25 {
        draw_text_gdi(
            mem_dc,
            font_title,
            rgb(0xf4, 0xf2, 0xed),
            "QBrowse",
            86.0 * scale,
            (50.0 + ui_y_offset * 0.4) * scale,
            240.0 * scale,
            (82.0 + ui_y_offset * 0.4) * scale,
            DT_LEFT | DT_SINGLELINE | DT_VCENTER,
        );
        draw_text_gdi(
            mem_dc,
            font_sub,
            rgb(0x9a, 0xa0, 0xb4),
            concat!("v", env!("CARGO_PKG_VERSION"), " · Privacy-first browser powered by Rust"),
            86.0 * scale,
            (82.0 + ui_y_offset * 0.4) * scale,
            (WIN_W - 28.0) * scale,
            (104.0 + ui_y_offset * 0.4) * scale,
            DT_LEFT | DT_SINGLELINE,
        );
    }

    // Window control glyphs
    let min_r = rect_minimize();
    draw_text_gdi(
        mem_dc,
        font_label,
        rgb(0xb4, 0xb9, 0xca),
        "—",
        min_r.x * scale,
        min_r.y * scale,
        (min_r.x + min_r.w) * scale,
        (min_r.y + min_r.h) * scale,
        DT_CENTER | DT_SINGLELINE | DT_VCENTER,
    );
    let cls_r = rect_close();
    draw_text_gdi(
        mem_dc,
        font_label,
        if state.hover == HitTarget::Close {
            rgb(0xff, 0xff, 0xff)
        } else {
            rgb(0xb4, 0xb9, 0xca)
        },
        "×",
        cls_r.x * scale,
        cls_r.y * scale,
        (cls_r.x + cls_r.w) * scale,
        (cls_r.y + cls_r.h) * scale,
        DT_CENTER | DT_SINGLELINE | DT_VCENTER,
    );

    match screen {
        Screen::Splash => {}
        Screen::PreInstall => {
            draw_text_gdi(
                mem_dc,
                font_label,
                rgb(0xa4, 0xaa, 0xbe),
                "Install location",
                28.0 * scale,
                122.0 * scale,
                240.0 * scale,
                142.0 * scale,
                DT_LEFT | DT_SINGLELINE,
            );
            let dir_str = state.options.install_dir.to_string_lossy().to_string();
            draw_text_gdi(
                mem_dc,
                font_body,
                rgb(0xe5, 0xe7, 0xef),
                &dir_str,
                40.0 * scale,
                146.0 * scale,
                (WIN_W - 28.0 - 104.0) * scale,
                182.0 * scale,
                DT_LEFT | DT_SINGLELINE | DT_VCENTER | DT_END_ELLIPSIS,
            );
            let ch = rect_change_dir();
            draw_text_gdi(
                mem_dc,
                font_label,
                rgb(0xdc, 0xdf, 0xe8),
                "Change…",
                ch.x * scale,
                ch.y * scale,
                (ch.x + ch.w) * scale,
                (ch.y + ch.h) * scale,
                DT_CENTER | DT_SINGLELINE | DT_VCENTER,
            );
            draw_text_gdi(
                mem_dc,
                font_body,
                rgb(0xd8, 0xdc, 0xe8),
                "Create Desktop shortcut",
                54.0 * scale,
                202.0 * scale,
                320.0 * scale,
                228.0 * scale,
                DT_LEFT | DT_SINGLELINE | DT_VCENTER,
            );
            draw_text_gdi(
                mem_dc,
                font_body,
                rgb(0xd8, 0xdc, 0xe8),
                "Launch QBrowse after install",
                54.0 * scale,
                236.0 * scale,
                340.0 * scale,
                262.0 * scale,
                DT_LEFT | DT_SINGLELINE | DT_VCENTER,
            );
            let btn = rect_primary_button();
            draw_text_gdi(
                mem_dc,
                font_btn,
                rgb(0x09, 0x0a, 0x0f),
                "Install QBrowse",
                btn.x * scale,
                btn.y * scale,
                (btn.x + btn.w) * scale,
                (btn.y + btn.h) * scale,
                DT_CENTER | DT_SINGLELINE | DT_VCENTER,
            );
        }
        Screen::Installing | Screen::Completed => {
            draw_text_gdi(
                mem_dc,
                font_btn,
                rgb(0xf2, 0xf0, 0xeb),
                &status_text,
                28.0 * scale,
                164.0 * scale,
                (WIN_W - 96.0) * scale,
                192.0 * scale,
                DT_LEFT | DT_SINGLELINE,
            );
            if !indeterminate && screen == Screen::Installing {
                let pct = format!("{}%", (progress_fraction * 100.0).round() as i32);
                draw_text_gdi(
                    mem_dc,
                    font_label,
                    rgb(0xd4, 0xbc, 0x94),
                    &pct,
                    (WIN_W - 96.0) * scale,
                    164.0 * scale,
                    (WIN_W - 28.0) * scale,
                    192.0 * scale,
                    DT_RIGHT | DT_SINGLELINE,
                );
            }
            if !metrics_text.is_empty() {
                draw_text_gdi(
                    mem_dc,
                    font_body,
                    rgb(0x9a, 0xa0, 0xb4),
                    &metrics_text,
                    28.0 * scale,
                    224.0 * scale,
                    (WIN_W - 28.0) * scale,
                    248.0 * scale,
                    DT_LEFT | DT_SINGLELINE,
                );
            }
            if screen == Screen::Completed {
                let btn = rect_primary_button();
                draw_text_gdi(
                    mem_dc,
                    font_btn,
                    rgb(0x09, 0x0a, 0x0f),
                    "Finish",
                    btn.x * scale,
                    btn.y * scale,
                    (btn.x + btn.w) * scale,
                    (btn.y + btn.h) * scale,
                    DT_CENTER | DT_SINGLELINE | DT_VCENTER,
                );
            }
        }
        Screen::Error => {
            draw_text_gdi(
                mem_dc,
                font_btn,
                rgb(0xf8, 0x71, 0x71),
                "Installation Failed",
                44.0 * scale,
                150.0 * scale,
                (WIN_W - 44.0) * scale,
                174.0 * scale,
                DT_LEFT | DT_SINGLELINE,
            );
            draw_text_gdi(
                mem_dc,
                font_body,
                rgb(0xf3, 0xd0, 0xd4),
                &error_message,
                44.0 * scale,
                178.0 * scale,
                (WIN_W - 44.0) * scale,
                242.0 * scale,
                DT_LEFT | DT_WORDBREAK | DT_END_ELLIPSIS,
            );
            let link_color = if state.hover == HitTarget::OpenReleasesLink {
                rgb(0xe8, 0xd4, 0xb0)
            } else {
                rgb(0xd4, 0xbc, 0x94)
            };
            let link_r = rect_open_releases();
            draw_text_gdi(
                mem_dc,
                font_label,
                link_color,
                "Open GitHub Releases ↗",
                link_r.x * scale,
                link_r.y * scale,
                (link_r.x + link_r.w) * scale,
                (link_r.y + link_r.h) * scale,
                DT_LEFT | DT_SINGLELINE | DT_VCENTER,
            );
            let btn = rect_primary_button();
            draw_text_gdi(
                mem_dc,
                font_btn,
                rgb(0x09, 0x0a, 0x0f),
                "Retry",
                btn.x * scale,
                btn.y * scale,
                (btn.x + btn.w) * scale,
                (btn.y + btn.h) * scale,
                DT_CENTER | DT_SINGLELINE | DT_VCENTER,
            );
        }
    }

    let _ = DeleteObject(font_title);
    let _ = DeleteObject(font_sub);
    let _ = DeleteObject(font_label);
    let _ = DeleteObject(font_body);
    let _ = DeleteObject(font_btn);

    let _ = BitBlt(hdc, 0, 0, phys_w, phys_h, mem_dc, 0, 0, SRCCOPY);
    let _ = SelectObject(mem_dc, old_obj);
    let _ = DeleteObject(hbm);
    let _ = DeleteDC(mem_dc);
}

#[inline]
fn rgba(r: u8, g: u8, b: u8, a: u8) -> u32 {
    ((a as u32) << 24) | ((r as u32) << 16) | ((g as u32) << 8) | (b as u32)
}

#[inline]
fn rgb(r: u8, g: u8, b: u8) -> COLORREF {
    COLORREF(((b as u32) << 16) | ((g as u32) << 8) | (r as u32))
}

#[inline]
fn blend_pixel(dst: u32, r: u8, g: u8, b: u8, a: u8) -> u32 {
    if a == 0 {
        return dst;
    }
    if a == 255 {
        return rgba(r, g, b, 255);
    }
    let alpha = a as u32;
    let inv = 255 - alpha;
    let dr = (dst >> 16) & 0xFF;
    let dg = (dst >> 8) & 0xFF;
    let db = dst & 0xFF;
    let nr = (r as u32 * alpha + dr * inv) / 255;
    let ng = (g as u32 * alpha + dg * inv) / 255;
    let nb = (b as u32 * alpha + db * inv) / 255;
    0xFF00_0000 | (nr << 16) | (ng << 8) | nb
}

fn draw_background(pixels: &mut [u32], w: i32, h: i32, scale: f32, splash_progress: Option<f32>) {
    let (glow_cx, glow_cy, glow_r, glow_strength, bg_mix) = if let Some(sp) = splash_progress {
        let center_x = (WIN_W * 0.5) * scale;
        let center_y = (WIN_H * 0.5 - 8.0) * scale;
        let header_x = 51.0 * scale;
        let header_y = 77.0 * scale;
        if sp < 0.62 {
            let pulse = 1.0 + 0.10 * (sp * std::f32::consts::PI * 2.5).sin();
            (center_x, center_y, 175.0 * scale * pulse, 72.0, 0.0)
        } else {
            let u = 1.0 - ((sp - 0.62) / 0.38).clamp(0.0, 1.0);
            let m = 1.0 - u * u * u;
            (
                center_x + (header_x - center_x) * m,
                center_y + (header_y - center_y) * m,
                (175.0 + (92.0 - 175.0) * m) * scale,
                72.0 + (52.0 - 72.0) * m,
                m,
            )
        }
    } else {
        (51.0 * scale, 77.0 * scale, 92.0 * scale, 52.0, 1.0)
    };
    let glow_r2 = glow_r * glow_r;

    for y in 0..h {
        let t = y as f32 / (h.max(1) as f32);
        let grad_r = 9.0 + 6.0 * t;
        let grad_g = 10.0 + 7.0 * t;
        let grad_b = 15.0 + 10.0 * t;
        let base_r = (7.0 + (grad_r - 7.0) * bg_mix) as u8;
        let base_g = (8.0 + (grad_g - 8.0) * bg_mix) as u8;
        let base_b = (10.0 + (grad_b - 10.0) * bg_mix) as u8;
        let row = y as usize * w as usize;

        for x in 0..w {
            let dx = x as f32 - glow_cx;
            let dy = y as f32 - glow_cy;
            let d2 = dx * dx + dy * dy;
            let mut px = rgba(base_r, base_g, base_b, 255);
            if d2 < glow_r2 {
                let falloff = 1.0 - (d2 / glow_r2).sqrt();
                let a = (falloff * falloff * glow_strength) as u8;
                px = blend_pixel(px, 0xd4, 0xbc, 0x94, a);
            }
            pixels[row + x as usize] = px;
        }
    }
}

fn blit_rgba(pixels: &mut [u32], w: i32, h: i32, dx: i32, dy: i32, logo: &LogoRgba) {
    for sy in 0..logo.height as i32 {
        let py = dy + sy;
        if py < 0 || py >= h {
            continue;
        }
        for sx in 0..logo.width as i32 {
            let px = dx + sx;
            if px < 0 || px >= w {
                continue;
            }
            let src_idx = ((sy as u32 * logo.width + sx as u32) * 4) as usize;
            let r = logo.pixels[src_idx];
            let g = logo.pixels[src_idx + 1];
            let b = logo.pixels[src_idx + 2];
            let a = logo.pixels[src_idx + 3];
            let dst_idx = (py as usize) * (w as usize) + (px as usize);
            pixels[dst_idx] = blend_pixel(pixels[dst_idx], r, g, b, a);
        }
    }
}

fn sdf_round_rect(px: f32, py: f32, x: f32, y: f32, rw: f32, rh: f32, radius: f32) -> f32 {
    let cx = x + rw * 0.5;
    let cy = y + rh * 0.5;
    let hx = (rw * 0.5 - radius).max(0.0);
    let hy = (rh * 0.5 - radius).max(0.0);
    let dx = (px - cx).abs() - hx;
    let dy = (py - cy).abs() - hy;
    let ox = dx.max(0.0);
    let oy = dy.max(0.0);
    (ox * ox + oy * oy).sqrt() + dx.max(dy).min(0.0) - radius
}

fn draw_round_rect(
    pixels: &mut [u32],
    w: i32,
    h: i32,
    x: f32,
    y: f32,
    rw: f32,
    rh: f32,
    radius: f32,
    color: u32,
) {
    let a_base = ((color >> 24) & 0xFF) as f32;
    let r = ((color >> 16) & 0xFF) as u8;
    let g = ((color >> 8) & 0xFF) as u8;
    let b = (color & 0xFF) as u8;

    let min_x = (x.floor() as i32 - 1).max(0);
    let min_y = (y.floor() as i32 - 1).max(0);
    let max_x = ((x + rw).ceil() as i32 + 1).min(w - 1);
    let max_y = ((y + rh).ceil() as i32 + 1).min(h - 1);

    for py in min_y..=max_y {
        let row = py as usize * w as usize;
        for px in min_x..=max_x {
            let d = sdf_round_rect(px as f32 + 0.5, py as f32 + 0.5, x, y, rw, rh, radius);
            if d < 0.75 {
                let cov = (0.75 - d).clamp(0.0, 1.0);
                let a = (a_base * cov) as u8;
                pixels[row + px as usize] = blend_pixel(pixels[row + px as usize], r, g, b, a);
            }
        }
    }
}

fn stroke_round_rect(
    pixels: &mut [u32],
    w: i32,
    h: i32,
    x: f32,
    y: f32,
    rw: f32,
    rh: f32,
    radius: f32,
    thickness: f32,
    color: u32,
) {
    let a_base = ((color >> 24) & 0xFF) as f32;
    let r = ((color >> 16) & 0xFF) as u8;
    let g = ((color >> 8) & 0xFF) as u8;
    let b = (color & 0xFF) as u8;

    let min_x = (x.floor() as i32 - 2).max(0);
    let min_y = (y.floor() as i32 - 2).max(0);
    let max_x = ((x + rw).ceil() as i32 + 2).min(w - 1);
    let max_y = ((y + rh).ceil() as i32 + 2).min(h - 1);

    let half_t = thickness * 0.5;
    for py in min_y..=max_y {
        let row = py as usize * w as usize;
        for px in min_x..=max_x {
            let d = sdf_round_rect(px as f32 + 0.5, py as f32 + 0.5, x, y, rw, rh, radius).abs();
            if d < half_t + 0.75 {
                let cov = (half_t + 0.75 - d).clamp(0.0, 1.0);
                let a = (a_base * cov) as u8;
                pixels[row + px as usize] = blend_pixel(pixels[row + px as usize], r, g, b, a);
            }
        }
    }
}

fn draw_window_controls(
    pixels: &mut [u32],
    w: i32,
    h: i32,
    scale: f32,
    hover: HitTarget,
    pressed: HitTarget,
) {
    let min_r = rect_minimize();
    if hover == HitTarget::Minimize || pressed == HitTarget::Minimize {
        let c = if pressed == HitTarget::Minimize {
            rgba(0x28, 0x2d, 0x3f, 255)
        } else {
            rgba(0x1c, 0x20, 0x2e, 255)
        };
        draw_round_rect(
            pixels,
            w,
            h,
            min_r.x * scale,
            min_r.y * scale,
            min_r.w * scale,
            min_r.h * scale,
            6.0 * scale,
            c,
        );
    }

    let cls_r = rect_close();
    if hover == HitTarget::Close || pressed == HitTarget::Close {
        let c = if pressed == HitTarget::Close {
            rgba(0xb9, 0x1c, 0x1c, 255)
        } else {
            rgba(0xdc, 0x26, 0x26, 230)
        };
        draw_round_rect(
            pixels,
            w,
            h,
            cls_r.x * scale,
            cls_r.y * scale,
            cls_r.w * scale,
            cls_r.h * scale,
            6.0 * scale,
            c,
        );
    }
}

fn draw_checkbox(
    pixels: &mut [u32],
    w: i32,
    h: i32,
    scale: f32,
    x: f32,
    y: f32,
    checked: bool,
    hovered: bool,
) {
    let size = 18.0 * scale;
    let px = x * scale;
    let py = y * scale;
    if checked {
        draw_round_rect(
            pixels,
            w,
            h,
            px,
            py,
            size,
            size,
            5.0 * scale,
            rgba(0xd4, 0xbc, 0x94, 255),
        );
        // Checkmark segments in dark obsidian
        draw_line(
            pixels,
            w,
            h,
            px + 4.5 * scale,
            py + 9.2 * scale,
            px + 7.8 * scale,
            py + 12.6 * scale,
            1.9 * scale,
            rgba(0x09, 0x0a, 0x0f, 255),
        );
        draw_line(
            pixels,
            w,
            h,
            px + 7.8 * scale,
            py + 12.6 * scale,
            px + 13.6 * scale,
            py + 5.6 * scale,
            1.9 * scale,
            rgba(0x09, 0x0a, 0x0f, 255),
        );
    } else {
        draw_round_rect(
            pixels,
            w,
            h,
            px,
            py,
            size,
            size,
            5.0 * scale,
            rgba(0x14, 0x17, 0x22, 255),
        );
        let border = if hovered {
            rgba(0xd4, 0xbc, 0x94, 180)
        } else {
            rgba(0x3a, 0x41, 0x58, 255)
        };
        stroke_round_rect(pixels, w, h, px, py, size, size, 5.0 * scale, 1.2 * scale, border);
    }
}

fn draw_line(
    pixels: &mut [u32],
    w: i32,
    h: i32,
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
    thickness: f32,
    color: u32,
) {
    let r = ((color >> 16) & 0xFF) as u8;
    let g = ((color >> 8) & 0xFF) as u8;
    let b = (color & 0xFF) as u8;
    let a_base = ((color >> 24) & 0xFF) as f32;

    let min_x = (x1.min(x2) - thickness - 1.0).floor().max(0.0) as i32;
    let max_x = (x1.max(x2) + thickness + 1.0).ceil().min((w - 1) as f32) as i32;
    let min_y = (y1.min(y2) - thickness - 1.0).floor().max(0.0) as i32;
    let max_y = (y1.max(y2) + thickness + 1.0).ceil().min((h - 1) as f32) as i32;

    let vx = x2 - x1;
    let vy = y2 - y1;
    let len2 = (vx * vx + vy * vy).max(0.0001);
    let half_t = thickness * 0.5;

    for py in min_y..=max_y {
        let row = py as usize * w as usize;
        for px in min_x..=max_x {
            let wx = (px as f32 + 0.5) - x1;
            let wy = (py as f32 + 0.5) - y1;
            let t = ((wx * vx + wy * vy) / len2).clamp(0.0, 1.0);
            let cx = x1 + t * vx;
            let cy = y1 + t * vy;
            let dx = (px as f32 + 0.5) - cx;
            let dy = (py as f32 + 0.5) - cy;
            let d = (dx * dx + dy * dy).sqrt();
            if d < half_t + 0.75 {
                let cov = (half_t + 0.75 - d).clamp(0.0, 1.0);
                let a = (a_base * cov) as u8;
                pixels[row + px as usize] = blend_pixel(pixels[row + px as usize], r, g, b, a);
            }
        }
    }
}

fn draw_primary_button(
    pixels: &mut [u32],
    w: i32,
    h: i32,
    scale: f32,
    hovered: bool,
    pressed: bool,
) {
    let btn = rect_primary_button();
    if hovered && !pressed {
        stroke_round_rect(
            pixels,
            w,
            h,
            (btn.x - 1.5) * scale,
            (btn.y - 1.5) * scale,
            (btn.w + 3.0) * scale,
            (btn.h + 3.0) * scale,
            11.5 * scale,
            2.5 * scale,
            rgba(0xd4, 0xbc, 0x94, 55),
        );
    }
    let color = if pressed {
        rgba(0xbf, 0xa5, 0x7a, 255)
    } else if hovered {
        rgba(0xe2, 0xcc, 0xa7, 255)
    } else {
        rgba(0xd4, 0xbc, 0x94, 255)
    };
    draw_round_rect(
        pixels,
        w,
        h,
        btn.x * scale,
        btn.y * scale,
        btn.w * scale,
        btn.h * scale,
        10.0 * scale,
        color,
    );
    draw_line(
        pixels,
        w,
        h,
        (btn.x + 10.0) * scale,
        (btn.y + 1.0) * scale,
        (btn.x + btn.w - 10.0) * scale,
        (btn.y + 1.0) * scale,
        1.0 * scale,
        rgba(0xff, 0xff, 0xff, if pressed { 20 } else { 55 }),
    );
}

unsafe fn make_font(height: i32, weight: i32) -> HFONT {
    CreateFontW(
        -height,
        0,
        0,
        0,
        weight,
        0,
        0,
        0,
        DEFAULT_CHARSET.0 as u32,
        OUT_DEFAULT_PRECIS.0 as u32,
        CLIP_DEFAULT_PRECIS.0 as u32,
        CLEARTYPE_QUALITY.0 as u32,
        (DEFAULT_PITCH.0 | FF_SWISS.0) as u32,
        w!("Segoe UI"),
    )
}

unsafe fn draw_text_gdi(
    hdc: HDC,
    font: HFONT,
    color: COLORREF,
    text: &str,
    left: f32,
    top: f32,
    right: f32,
    bottom: f32,
    flags: windows::Win32::Graphics::Gdi::DRAW_TEXT_FORMAT,
) {
    let old_font = SelectObject(hdc, font);
    let _ = SetTextColor(hdc, color);
    let mut wide: Vec<u16> = OsString::from(text).encode_wide().collect();
    let mut rc = RECT {
        left: left.round() as i32,
        top: top.round() as i32,
        right: right.round() as i32,
        bottom: bottom.round() as i32,
    };
    let _ = DrawTextW(hdc, &mut wide, &mut rc, flags | DT_NOPREFIX);
    let _ = SelectObject(hdc, old_font);
}

#[allow(dead_code)]
fn _keep_dt_calcrect_imported() {
    let _ = DT_CALCRECT;
}
