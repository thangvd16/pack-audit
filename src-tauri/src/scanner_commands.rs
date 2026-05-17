use crate::scanner::{
    normalize_manual_code, validate_settings, CameraDevice, ManualCodeInput, RecordingCommandInput,
    ScanResult, ScannerError, ScannerStartInput, ScannerStateSnapshot,
};

#[tauri::command]
pub fn scanner_list_cameras() -> Result<Vec<CameraDevice>, ScannerError> {
    Err(ScannerError::not_implemented("Danh sách camera"))
}

#[tauri::command]
pub fn scanner_start(input: ScannerStartInput) -> Result<ScannerStateSnapshot, ScannerError> {
    validate_settings(&input.settings)?;
    Err(ScannerError::not_implemented("Khởi động camera"))
}

#[tauri::command]
pub fn scanner_stop() -> Result<ScannerStateSnapshot, ScannerError> {
    Ok(ScannerStateSnapshot::idle())
}

#[tauri::command]
pub fn scanner_start_recording(
    input: RecordingCommandInput,
) -> Result<ScannerStateSnapshot, ScannerError> {
    let _ = input;
    Err(ScannerError::not_implemented("Ghi video bằng FFmpeg"))
}

#[tauri::command]
pub fn scanner_stop_recording() -> Result<ScannerStateSnapshot, ScannerError> {
    Err(ScannerError::not_implemented("Dừng ghi video bằng FFmpeg"))
}

#[tauri::command]
pub fn scanner_submit_manual_code(input: ManualCodeInput) -> Result<ScanResult, ScannerError> {
    normalize_manual_code(&input)
}
