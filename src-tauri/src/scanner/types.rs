use serde::{Deserialize, Serialize};

pub const EVENT_FRAME: &str = "scanner://frame";
pub const EVENT_DETECTED: &str = "scanner://detected";
pub const EVENT_STATE: &str = "scanner://state";
pub const EVENT_ERROR: &str = "scanner://error";
pub const EVENT_METRICS: &str = "scanner://metrics";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CameraDevice {
    pub device_id: String,
    pub label: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ScanFormat {
    #[serde(rename = "Code128")]
    Code128,
    #[serde(rename = "QR")]
    Qr,
    #[serde(rename = "MicroQR")]
    MicroQr,
    #[serde(rename = "DataMatrix")]
    DataMatrix,
    #[serde(rename = "PDF417")]
    Pdf417,
    #[serde(rename = "Aztec")]
    Aztec,
    #[serde(rename = "EAN-13")]
    Ean13,
    #[serde(rename = "EAN-8")]
    Ean8,
    #[serde(rename = "UPC-A")]
    UpcA,
    #[serde(rename = "UPC-E")]
    UpcE,
    #[serde(rename = "Code39")]
    Code39,
    #[serde(rename = "ITF")]
    Itf,
    #[serde(rename = "Manual")]
    Manual,
    #[serde(rename = "Unknown")]
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScanSource {
    Camera,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScanPoint {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub text: String,
    pub format: ScanFormat,
    pub timestamp_ms: i64,
    pub confidence: Option<f32>,
    pub points: Vec<ScanPoint>,
    pub source: ScanSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScannerStatus {
    Idle,
    Starting,
    Scanning,
    Countdown,
    Recording,
    Saving,
    Stopping,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScannerSettings {
    pub camera_id: Option<String>,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub preview_fps: u32,
    pub formats: Vec<ScanFormat>,
    pub stability_threshold_ms: u64,
    pub countdown_ms: u64,
    pub min_recording_ms: u64,
    pub max_recording_ms: u64,
}

impl Default for ScannerSettings {
    fn default() -> Self {
        Self {
            camera_id: None,
            width: 1280,
            height: 720,
            fps: 30,
            preview_fps: 15,
            formats: vec![
                ScanFormat::Code128,
                ScanFormat::Qr,
                ScanFormat::MicroQr,
                ScanFormat::DataMatrix,
                ScanFormat::Pdf417,
                ScanFormat::Aztec,
                ScanFormat::Ean13,
                ScanFormat::Ean8,
                ScanFormat::UpcA,
                ScanFormat::UpcE,
                ScanFormat::Code39,
                ScanFormat::Itf,
            ],
            stability_threshold_ms: 400,
            countdown_ms: 2_000,
            min_recording_ms: 1_000,
            max_recording_ms: 600_000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScannerStartInput {
    #[serde(default)]
    pub settings: ScannerSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RecordingCommandInput {
    pub session_id: String,
    pub barcode: String,
    pub format: ScanFormat,
    pub record_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ManualCodeInput {
    pub text: String,
    pub format: Option<ScanFormat>,
    pub timestamp_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScannerStateSnapshot {
    pub status: ScannerStatus,
    pub active_camera_id: Option<String>,
    pub active_code: Option<ScanResult>,
    pub active_record_id: Option<String>,
    pub recording_started_at_ms: Option<i64>,
    pub settings: ScannerSettings,
    pub last_error: Option<ScannerError>,
}

impl ScannerStateSnapshot {
    pub fn idle() -> Self {
        Self {
            status: ScannerStatus::Idle,
            active_camera_id: None,
            active_code: None,
            active_record_id: None,
            recording_started_at_ms: None,
            settings: ScannerSettings::default(),
            last_error: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScannerErrorCode {
    NotImplemented,
    InvalidSettings,
    InvalidInput,
    InvalidState,
    CameraUnavailable,
    DecoderUnavailable,
    RecorderUnavailable,
    Internal,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScannerError {
    pub code: ScannerErrorCode,
    pub message: String,
}

impl ScannerError {
    pub fn new(code: ScannerErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn not_implemented(feature: &str) -> Self {
        Self::new(
            ScannerErrorCode::NotImplemented,
            format!("{} chưa được triển khai trong native scanner", feature),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScannerEventPayload {
    pub state: Option<ScannerStateSnapshot>,
    pub result: Option<ScanResult>,
    pub error: Option<ScannerError>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FrameEventPayload {
    pub sequence: u64,
    pub timestamp_ms: i64,
    pub width: u32,
    pub height: u32,
    pub jpeg_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetricsEventPayload {
    pub timestamp_ms: i64,
    pub camera_fps: f32,
    pub preview_fps: f32,
    pub decoder_fps: f32,
    pub dropped_frames: u64,
    pub decode_latency_p95_ms: Option<f32>,
    pub recorder_queue_depth: Option<u32>,
}

pub fn validate_settings(settings: &ScannerSettings) -> Result<(), ScannerError> {
    if settings.width == 0 || settings.height == 0 {
        return Err(ScannerError::new(
            ScannerErrorCode::InvalidSettings,
            "Kích thước camera không hợp lệ",
        ));
    }

    if !(1..=60).contains(&settings.fps) {
        return Err(ScannerError::new(
            ScannerErrorCode::InvalidSettings,
            "FPS camera phải nằm trong khoảng 1-60",
        ));
    }

    if !(1..=15).contains(&settings.preview_fps) {
        return Err(ScannerError::new(
            ScannerErrorCode::InvalidSettings,
            "FPS preview phải nằm trong khoảng 1-15",
        ));
    }

    if settings.formats.is_empty() {
        return Err(ScannerError::new(
            ScannerErrorCode::InvalidSettings,
            "Chưa chọn định dạng mã cần quét",
        ));
    }

    if settings.min_recording_ms > settings.max_recording_ms {
        return Err(ScannerError::new(
            ScannerErrorCode::InvalidSettings,
            "Thời lượng ghi video không hợp lệ",
        ));
    }

    Ok(())
}

pub fn normalize_manual_code(input: &ManualCodeInput) -> Result<ScanResult, ScannerError> {
    let text = input.text.trim();
    let valid = !text.is_empty() && text.len() <= 256 && text.chars().all(|c| !c.is_control());
    if !valid {
        return Err(ScannerError::new(
            ScannerErrorCode::InvalidInput,
            "Mã nhập thủ công không hợp lệ",
        ));
    }

    Ok(ScanResult {
        text: text.to_string(),
        format: input.format.clone().unwrap_or(ScanFormat::Manual),
        timestamp_ms: input.timestamp_ms.unwrap_or_else(current_timestamp_ms),
        confidence: None,
        points: Vec::new(),
        source: ScanSource::Manual,
    })
}

fn current_timestamp_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_formats_cover_phase_one_contract() {
        let settings = ScannerSettings::default();

        assert!(settings.formats.contains(&ScanFormat::Code128));
        assert!(settings.formats.contains(&ScanFormat::Qr));
        assert!(settings.formats.contains(&ScanFormat::DataMatrix));
        assert!(settings.formats.contains(&ScanFormat::Pdf417));
        assert!(settings.formats.contains(&ScanFormat::Aztec));
        assert!(settings.formats.contains(&ScanFormat::Ean13));
        assert!(settings.formats.contains(&ScanFormat::UpcA));
    }

    #[test]
    fn settings_validation_rejects_unbounded_preview_rate() {
        let mut settings = ScannerSettings::default();
        settings.preview_fps = 30;

        let error = validate_settings(&settings).expect_err("invalid preview fps");

        assert_eq!(error.code, ScannerErrorCode::InvalidSettings);
        assert_eq!(error.message, "FPS preview phải nằm trong khoảng 1-15");
    }

    #[test]
    fn manual_code_is_trimmed_and_marked_manual() {
        let result = normalize_manual_code(&ManualCodeInput {
            text: " PKG-001 ".to_string(),
            format: None,
            timestamp_ms: Some(1_234),
        })
        .expect("manual code");

        assert_eq!(result.text, "PKG-001");
        assert_eq!(result.format, ScanFormat::Manual);
        assert_eq!(result.timestamp_ms, 1_234);
        assert_eq!(result.source, ScanSource::Manual);
    }
}
