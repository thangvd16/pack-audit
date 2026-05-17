use rusqlite::{params, Connection};

use super::connection::connection;
use super::models::{CaptureRecord, CreateRecordInput, ListRecentRecordsInput};
use super::settings_repo::ensure_video_save_dir;
use super::validation::{
    validate_barcode, validate_format, validate_id, validate_recording_duration,
    validate_relative_path,
};

const DEFAULT_RECENT_RECORDS_LIMIT: i64 = 20;
const MAX_RECENT_RECORDS_LIMIT: i64 = 20;

pub fn create_record(
    app: &tauri::AppHandle<impl tauri::Runtime>,
    input: CreateRecordInput,
) -> Result<CaptureRecord, String> {
    validate_id(&input.id, "Mã bản ghi không hợp lệ")?;
    validate_id(&input.session_id, "Mã phiên làm việc không hợp lệ")?;
    validate_barcode(&input.barcode)?;
    validate_format(&input.format)?;
    validate_relative_path(&input.video_path)?;
    validate_recording_duration(input.video_duration_ms)?;

    let save_dir = ensure_video_save_dir(app)?;
    let full_video_path = save_dir.join(&input.video_path);
    if !full_video_path.exists() {
        return Err("File video chưa tồn tại".to_string());
    }

    let conn = connection(app)?;
    conn.execute(
        "INSERT INTO records (id, session_id, barcode, format, scanned_at, video_path, video_duration_ms, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            &input.id,
            &input.session_id,
            &input.barcode,
            &input.format,
            input.scanned_at,
            &input.video_path,
            input.video_duration_ms,
            &input.note,
        ],
    )
        .map_err(|_| "Không thể tạo bản ghi".to_string())?;

    load_record(&conn, &input.id)
}

pub fn list_recent_records(
    app: &tauri::AppHandle<impl tauri::Runtime>,
    input: ListRecentRecordsInput,
) -> Result<Vec<CaptureRecord>, String> {
    let limit = resolve_recent_records_limit(input.limit)?;
    let conn = connection(app)?;
    let mut stmt = conn
        .prepare(
            "
            SELECT id, session_id, barcode, format, scanned_at, video_path, video_duration_ms, note
            FROM records
            ORDER BY scanned_at DESC, id DESC
            LIMIT ?1
            ",
        )
        .map_err(|_| "Không thể đọc bản ghi".to_string())?;

    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(CaptureRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                barcode: row.get(2)?,
                format: row.get(3)?,
                scanned_at: row.get(4)?,
                video_path: row.get(5)?,
                video_duration_ms: row.get(6)?,
                note: row.get(7)?,
            })
        })
        .map_err(|_| "Không thể đọc bản ghi".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Không thể đọc bản ghi".to_string())
}

fn resolve_recent_records_limit(limit: Option<i64>) -> Result<i64, String> {
    match limit {
        None => Ok(DEFAULT_RECENT_RECORDS_LIMIT),
        Some(value) if value <= 0 => Err("Giới hạn bản ghi không hợp lệ".to_string()),
        Some(value) => Ok(value.min(MAX_RECENT_RECORDS_LIMIT)),
    }
}

fn load_record(conn: &Connection, id: &str) -> Result<CaptureRecord, String> {
    conn.query_row(
		"SELECT id, session_id, barcode, format, scanned_at, video_path, video_duration_ms, note FROM records WHERE id = ?1",
        params![id],
        |row| {
            Ok(CaptureRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                barcode: row.get(2)?,
                format: row.get(3)?,
                scanned_at: row.get(4)?,
                video_path: row.get(5)?,
                video_duration_ms: row.get(6)?,
                note: row.get(7)?,
            })
        },
	)
	.map_err(|_| "Không tìm thấy bản ghi".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{connection::connection, use_test_app_data_path};
    use std::time::{SystemTime, UNIX_EPOCH};
    use tauri::Manager;

    fn test_root() -> std::path::PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        let test_root = std::env::temp_dir().join(format!(
            "pack-audit-records-repo-test-{}-{}",
            std::process::id(),
            now
        ));
        let _ = std::fs::remove_dir_all(&test_root);
        std::fs::create_dir_all(&test_root).expect("create test root");
        test_root
    }

    #[test]
    fn list_recent_records_returns_empty_result_then_newest_records_first_and_clamps_to_twenty() {
        let app = tauri::test::mock_app();
        let handle = app.app_handle().clone();
        let test_root = test_root();
        let _guard = use_test_app_data_path(test_root.join("app-data"));

        let empty_records = list_recent_records(&handle, ListRecentRecordsInput { limit: None })
            .expect("list empty recent records");
        assert!(empty_records.is_empty());

        let conn = connection(&handle).expect("sqlite connection");
        conn.execute(
            "INSERT INTO sessions (id, user_id, name, started_at, ended_at, status) VALUES ('session_recent', 'default_owner', '2026-05-17', 1, NULL, 'active')",
			[],
		)
		.expect("insert test session");
        for index in 0..25 {
            let id = format!("record_recent_{index:02}");
            let barcode = format!("PKG-{index:02}");
            let video_path = format!("2026-05-17/{id}.webm");
            conn.execute(
				"INSERT INTO records (id, session_id, barcode, format, scanned_at, video_path, video_duration_ms, note) VALUES (?1, 'session_recent', ?2, 'CODE_128', ?3, ?4, 1000, NULL)",
				params![id, barcode, 1_000 + index, video_path],
			)
			.expect("insert test record");
        }
        drop(conn);

        let records = list_recent_records(&handle, ListRecentRecordsInput { limit: Some(200) })
            .expect("list recent records");

        assert_eq!(records.len(), 20);
        assert_eq!(records[0].id, "record_recent_24");
        assert_eq!(records[19].id, "record_recent_05");
        assert!(records
            .windows(2)
            .all(|pair| pair[0].scanned_at >= pair[1].scanned_at));
        std::fs::remove_dir_all(&test_root).expect("cleanup test dir");
    }

    #[test]
    fn list_recent_records_rejects_non_positive_limit() {
        assert_eq!(
            resolve_recent_records_limit(Some(0)),
            Err("Giới hạn bản ghi không hợp lệ".to_string())
        );
        assert_eq!(resolve_recent_records_limit(None), Ok(20));
        assert_eq!(resolve_recent_records_limit(Some(200)), Ok(20));
    }
}
