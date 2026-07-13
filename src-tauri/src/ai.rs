use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

pub fn start_llama_server(app: &AppHandle) -> Result<(), String> {
    let sidecar_command = app.shell().sidecar("llama-server")
        .map_err(|e| e.to_string())?;

    // In a real implementation, we would pass arguments like `--model model.gguf --port 8080`
    // let (mut rx, mut child) = sidecar_command.args(["--port", "8080"]).spawn().map_err(|e| e.to_string())?;

    println!("Sidecar llama-server configured successfully.");
    Ok(())
}

#[tauri::command]
pub fn start_local_ai(app: AppHandle) -> Result<String, String> {
    start_llama_server(&app)?;
    Ok("Llama server started locally.".to_string())
}
