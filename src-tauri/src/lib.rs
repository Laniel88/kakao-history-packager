use std::fs;
use std::path::PathBuf;

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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![load_settings, save_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
