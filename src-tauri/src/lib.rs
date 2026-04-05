use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn settings_path(chat_name: &str) -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
    let dir = home.join(".kakao-chat-viewer").join(chat_name);
    fs::create_dir_all(&dir).ok();
    dir.join("settings.json")
}

#[tauri::command]
fn load_settings(chat_name: String) -> String {
    let path = settings_path(&chat_name);
    fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string())
}

#[tauri::command]
fn save_settings(chat_name: String, data: String) -> Result<(), String> {
    let path = settings_path(&chat_name);
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_resource(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let resource_path = app.path().resource_dir()
        .map_err(|e| e.to_string())?
        .join(&path);
    fs::read_to_string(resource_path).map_err(|e| format!("{}: {}", path, e))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_settings, save_settings, read_resource
        ])
        .register_uri_scheme_protocol("res", |ctx, request| {
            let uri = request.uri().to_string();
            // URI format: res://localhost/assets/filename.jpg
            let path = uri.strip_prefix("res://localhost/")
                .unwrap_or(&uri);

            let resource_dir = ctx.app_handle().path().resource_dir()
                .unwrap_or_default();
            let file_path = resource_dir.join(path);

            match fs::read(&file_path) {
                Ok(data) => {
                    let mime = match file_path.extension().and_then(|e| e.to_str()) {
                        Some("jpg") | Some("jpeg") => "image/jpeg",
                        Some("png") => "image/png",
                        Some("gif") => "image/gif",
                        Some("webp") => "image/webp",
                        Some("mp4") => "video/mp4",
                        Some("mov") => "video/quicktime",
                        Some("avi") => "video/x-msvideo",
                        Some("webm") => "video/webm",
                        Some("json") => "application/json",
                        _ => "application/octet-stream",
                    };
                    tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", mime)
                        .body(data)
                        .unwrap()
                }
                Err(_) => {
                    tauri::http::Response::builder()
                        .status(404)
                        .body(Vec::new())
                        .unwrap()
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
