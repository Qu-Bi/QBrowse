#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod installer;
#[cfg(windows)]
mod gui_win;

use std::path::PathBuf;

use anyhow::{bail, Result};
use installer::{default_install_dir, run_install, InstallOptions, InstallStage};

struct CliArgs {
    version: bool,
    silent: bool,
    dir: Option<PathBuf>,
    local: Option<PathBuf>,
}

fn parse_args() -> Result<CliArgs> {
    let mut args = std::env::args().skip(1);
    let mut parsed = CliArgs {
        version: false,
        silent: false,
        dir: None,
        local: None,
    };

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--version" | "-V" => parsed.version = true,
            "--silent" | "/S" => parsed.silent = true,
            "--dir" => {
                let val = args
                    .next()
                    .ok_or_else(|| anyhow::anyhow!("--dir requires a path argument"))?;
                parsed.dir = Some(PathBuf::from(val));
            }
            "--local" => {
                let val = args
                    .next()
                    .ok_or_else(|| anyhow::anyhow!("--local requires a path argument"))?;
                parsed.local = Some(PathBuf::from(val));
            }
            other if other.starts_with("--dir=") => {
                parsed.dir = Some(PathBuf::from(&other["--dir=".len()..]));
            }
            other if other.starts_with("--local=") => {
                parsed.local = Some(PathBuf::from(&other["--local=".len()..]));
            }
            other => {
                bail!("Unknown argument: {other}");
            }
        }
    }

    Ok(parsed)
}

fn main() -> Result<()> {
    let cli = parse_args()?;
    if cli.version {
        attach_parent_console_if_needed();
        println!("qbrowse-installer {}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }

    let options = InstallOptions {
        install_dir: cli.dir.unwrap_or_else(default_install_dir),
        create_desktop_shortcut: true,
        launch_after: !cli.silent,
        local_installer: cli.local,
    };

    if cli.silent {
        attach_parent_console_if_needed();
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()?;
        return rt.block_on(run_install(&options, |stage| match stage {
            InstallStage::FetchingRelease => println!("[qbrowse-installer] Fetching release…"),
            InstallStage::Downloading {
                downloaded_bytes,
                total_bytes,
                ..
            } => {
                if total_bytes > 0 {
                    let pct = (downloaded_bytes * 100) / total_bytes;
                    if pct % 20 == 0 {
                        println!("[qbrowse-installer] Downloading… {pct}%");
                    }
                }
            }
            InstallStage::Verifying => println!("[qbrowse-installer] Verifying SHA-512…"),
            InstallStage::Installing => println!("[qbrowse-installer] Installing QBrowse…"),
            InstallStage::Completed => println!("[qbrowse-installer] Ready!"),
        }));
    }

    #[cfg(windows)]
    {
        gui_win::run_gui(options)
    }

    #[cfg(not(windows))]
    {
        bail!("GUI mode is only supported on Windows. Use --silent or --version.")
    }
}

#[cfg(windows)]
fn attach_parent_console_if_needed() {
    use windows::Win32::System::Console::{
        AttachConsole, GetStdHandle, ATTACH_PARENT_PROCESS, STD_OUTPUT_HANDLE,
    };
    unsafe {
        let handle = GetStdHandle(STD_OUTPUT_HANDLE);
        if handle.is_err() || handle.map(|h| h.is_invalid()).unwrap_or(true) {
            let _ = AttachConsole(ATTACH_PARENT_PROCESS);
        }
    }
}

#[cfg(not(windows))]
fn attach_parent_console_if_needed() {}
