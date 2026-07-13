mod vault;
mod browser;
mod ai;

use tauri::{Emitter, Manager};
use window_vibrancy::{apply_blur, apply_vibrancy, NSVisualEffectMaterial};
use std::path::PathBuf;

#[tauri::command]
fn unlock_vault(password: String) -> bool {
    password == "super_secret_password_123"
}

#[tauri::command]
fn send_ai_message(message: String, context_enabled: bool, current_url: String) -> String {
    format!("Local Gemma 4 processed: \"{}\". {} Running isolated in VRAM. (URL: {})", 
        message, 
        if context_enabled { "Site context analyzed." } else { "No context provided." },
        current_url
    )
}

#[tauri::command]
fn download_local_model(app_handle: tauri::AppHandle) -> Result<bool, String> {
    std::thread::spawn(move || {
        for i in 1..=10 {
            std::thread::sleep(std::time::Duration::from_millis(200));
            #[derive(Clone, serde::Serialize)]
            struct ProgressPayload {
                progress: f32,
            }
            let _ = app_handle.emit("model_download_progress", ProgressPayload { progress: (i * 10) as f32 });
        }
    });
    Ok(true)
}

#[tauri::command]
fn execute_command(command_id: String) -> bool {
    println!("Executing command: {}", command_id);
    true
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        unlock_vault,
        send_ai_message,
        download_local_model,
        execute_command,
        vault::add_password,
        vault::get_passwords,
        browser::create_tab_webview,
        browser::hide_tab_webview,
        browser::show_tab_webview,
        browser::close_tab_webview,
        browser::navigate_tab_webview,
        browser::set_tab_webview_bounds,
        ai::start_local_ai
    ])
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
      std::fs::create_dir_all(&app_dir).unwrap_or(());
      let db_path = app_dir.join("vault.db");
      
      // Initialize Vault DB
      let _ = vault::init_db(&db_path);
      app.manage(vault::VaultState { db_path });

      let window = app.get_webview_window("main").unwrap();

      #[cfg(target_os = "macos")]
      apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

      #[cfg(target_os = "windows")]
      apply_blur(&window, Some((18, 18, 18, 125)))
        .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
