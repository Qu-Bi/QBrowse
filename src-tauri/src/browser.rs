use tauri::{AppHandle, Manager, WebviewUrl, WebviewBuilder};

#[tauri::command]
pub fn create_tab_webview(app: AppHandle, tab_id: String, url: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    let window = app.get_window("main").ok_or("No main window")?;
    
    // Check if it already exists
    if app.get_webview(&tab_id).is_some() {
        return Ok(());
    }

    // Create a new child webview
    window.add_child(
        WebviewBuilder::new(tab_id, WebviewUrl::External(url.parse().unwrap())),
        tauri::LogicalPosition::new(x, y),
        tauri::LogicalSize::new(width, height)
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn hide_tab_webview(app: AppHandle, tab_id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        webview.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn show_tab_webview(app: AppHandle, tab_id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        webview.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn close_tab_webview(app: AppHandle, tab_id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn navigate_tab_webview(app: AppHandle, tab_id: String, url: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        webview.eval(&format!("window.location.href = '{}';", url)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_tab_webview_bounds(app: AppHandle, tab_id: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        webview.set_position(tauri::LogicalPosition::new(x, y)).map_err(|e| e.to_string())?;
        webview.set_size(tauri::LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
