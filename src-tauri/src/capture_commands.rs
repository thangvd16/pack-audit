use crate::capture::video_storage::{
    append_video_file_for_app, create_video_file_for_app, reveal_video_file_for_app,
    AppendVideoFileInput, CreateVideoFileInput, RevealVideoFileInput,
};
use crate::db;

#[tauri::command]
pub fn get_video_save_dir(app: tauri::AppHandle) -> Result<String, String> {
    db::get_video_save_dir(&app)
}

#[tauri::command]
pub fn ensure_daily_session(
    app: tauri::AppHandle,
    input: db::EnsureDailySessionInput,
) -> Result<db::Session, String> {
    db::ensure_daily_session(&app, input)
}

#[tauri::command]
pub fn create_video_file(
    app: tauri::AppHandle,
    input: CreateVideoFileInput,
) -> Result<String, String> {
    create_video_file_for_app(&app, &input)
}

#[tauri::command]
pub fn append_video_file(app: tauri::AppHandle, input: AppendVideoFileInput) -> Result<(), String> {
    append_video_file_for_app(&app, &input)
}

#[tauri::command]
pub fn create_record(
    app: tauri::AppHandle,
    input: db::CreateRecordInput,
) -> Result<db::CaptureRecord, String> {
    db::create_record(&app, input)
}

#[tauri::command]
pub fn list_recent_records(
    app: tauri::AppHandle,
    input: db::ListRecentRecordsInput,
) -> Result<Vec<db::CaptureRecord>, String> {
    db::list_recent_records(&app, input)
}

#[tauri::command]
pub fn reveal_video_file(app: tauri::AppHandle, input: RevealVideoFileInput) -> Result<(), String> {
    reveal_video_file_for_app(&app, &input)
}
