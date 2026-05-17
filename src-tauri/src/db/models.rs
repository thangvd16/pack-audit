use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnsureDailySessionInput {
    pub user_id: String,
    pub now: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRecordInput {
    pub id: String,
    pub session_id: String,
    pub barcode: String,
    pub format: String,
    pub scanned_at: i64,
    pub video_path: String,
    pub video_duration_ms: i64,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRecentRecordsInput {
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub status: String,
    pub scanned_count: i64,
    pub duration_ms: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRecord {
    pub id: String,
    pub session_id: String,
    pub barcode: String,
    pub format: String,
    pub scanned_at: i64,
    pub video_path: Option<String>,
    pub video_duration_ms: Option<i64>,
    pub note: Option<String>,
}
