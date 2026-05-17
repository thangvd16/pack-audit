mod capture;
mod capture_commands;
mod db;
mod license;
mod license_commands;
pub mod scanner;
mod scanner_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            license_commands::activate_license_online,
            license_commands::refresh_license_online,
            license_commands::check_saved_license,
            capture_commands::get_video_save_dir,
            capture_commands::ensure_daily_session,
            capture_commands::create_video_file,
            capture_commands::append_video_file,
            capture_commands::create_record,
            capture_commands::list_recent_records,
            capture_commands::reveal_video_file,
            scanner_commands::scanner_list_cameras,
            scanner_commands::scanner_start,
            scanner_commands::scanner_stop,
            scanner_commands::scanner_start_recording,
            scanner_commands::scanner_stop_recording,
            scanner_commands::scanner_submit_manual_code,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
