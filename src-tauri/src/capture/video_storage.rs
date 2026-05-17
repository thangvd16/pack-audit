use serde::Deserialize;
use std::io::{Error, Write};
use std::path::PathBuf;
use std::process::Command;
use tauri::Runtime;

use crate::db;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVideoFileInput {
    pub record_id: String,
    pub scanned_at: i64,
    pub mime_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendVideoFileInput {
    pub video_path: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevealVideoFileInput {
    pub video_path: String,
}

pub fn create_video_file_for_app<R: Runtime>(
    app: &tauri::AppHandle<R>,
    input: &CreateVideoFileInput,
) -> Result<String, String> {
    db::ensure_video_save_dir(app).and_then(|save_dir| {
        let extension = extension_for_mime_type(&input.mime_type)?;
        validate_record_id(&input.record_id)?;

        let day = db::date_label(input.scanned_at);
        let filename = format!("{}_{}.{}", input.record_id, input.scanned_at, extension);
        let relative_path = std::path::PathBuf::from(&day).join(filename);
        let full_path = save_dir.join(&relative_path);

        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(map_create_dir_error)?;
        }

        std::fs::File::create(&full_path).map_err(map_create_file_error)?;

        Ok(relative_path
            .iter()
            .map(|part| part.to_string_lossy())
            .collect::<Vec<_>>()
            .join("/"))
    })
}

pub fn append_video_file_for_app<R: Runtime>(
    app: &tauri::AppHandle<R>,
    input: &AppendVideoFileInput,
) -> Result<(), String> {
    db::validate_relative_path(&input.video_path)?;
    if input.bytes.is_empty() {
        return Err("Dữ liệu video rỗng".to_string());
    }

    let save_dir = db::ensure_video_save_dir(app)?;
    let full_path = save_dir.join(&input.video_path);
    let mut file = std::fs::OpenOptions::new()
        .append(true)
        .open(&full_path)
        .map_err(map_open_file_error)?;

    file.write_all(&input.bytes).map_err(map_write_file_error)
}

pub fn reveal_video_file_for_app<R: Runtime>(
    app: &tauri::AppHandle<R>,
    input: &RevealVideoFileInput,
) -> Result<(), String> {
    let full_path = resolve_existing_video_path(app, &input.video_path)?;
    reveal_file_in_file_manager(&full_path)
}

fn resolve_existing_video_path<R: Runtime>(
    app: &tauri::AppHandle<R>,
    video_path: &str,
) -> Result<PathBuf, String> {
    db::validate_relative_path(video_path)?;

    let save_dir = db::ensure_video_save_dir(app)?;
    let full_path = save_dir.join(video_path);
    if !full_path.is_file() {
        return Err("File video chưa tồn tại".to_string());
    }

    let save_dir = save_dir
        .canonicalize()
        .map_err(|_| "Không thể kiểm tra thư mục lưu video".to_string())?;
    let full_path = full_path
        .canonicalize()
        .map_err(|_| "Không thể kiểm tra file video".to_string())?;

    if !full_path.starts_with(&save_dir) {
        return Err("Đường dẫn video không hợp lệ".to_string());
    }

    Ok(full_path)
}

fn reveal_file_in_file_manager(path: &PathBuf) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg("-R").arg(path).status();

    #[cfg(target_os = "windows")]
    let status = Command::new("explorer.exe")
        .arg(format!("/select,{}", path.display()))
        .status();

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let status = path
        .parent()
        .ok_or_else(|| "Không thể xác định thư mục video".to_string())
        .and_then(|parent| {
            Command::new("xdg-open")
                .arg(parent)
                .status()
                .map_err(|_| "Không thể mở thư mục video".to_string())
        });

    let status = status.map_err(|_| "Không thể mở thư mục video".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("Không thể mở thư mục video".to_string())
    }
}

fn extension_for_mime_type(mime_type: &str) -> Result<&'static str, String> {
    match mime_type {
        "video/mp4;codecs=avc1,mp4a.40.2" => Ok("mp4"),
        "video/webm;codecs=vp9,opus" | "video/webm;codecs=vp8,opus" | "video/webm" => Ok("webm"),
        _ => Err("Định dạng video không được hỗ trợ".to_string()),
    }
}

fn map_create_dir_error(error: Error) -> String {
    if is_storage_full(&error) {
        "Không đủ dung lượng".to_string()
    } else {
        "Không thể tạo thư mục video".to_string()
    }
}

fn map_create_file_error(error: Error) -> String {
    if is_storage_full(&error) {
        "Không đủ dung lượng".to_string()
    } else {
        "Không thể tạo file video".to_string()
    }
}

fn map_open_file_error(error: Error) -> String {
    if is_storage_full(&error) {
        "Không đủ dung lượng".to_string()
    } else {
        "Không thể mở file video".to_string()
    }
}

fn map_write_file_error(error: Error) -> String {
    if is_storage_full(&error) {
        "Không đủ dung lượng".to_string()
    } else {
        "Không thể ghi file video".to_string()
    }
}

fn is_storage_full(error: &Error) -> bool {
    matches!(error.raw_os_error(), Some(28 | 39 | 112))
}

fn validate_record_id(record_id: &str) -> Result<(), String> {
    let valid = !record_id.is_empty()
        && record_id.len() <= 128
        && record_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-'));
    if valid {
        Ok(())
    } else {
        Err("Mã bản ghi không hợp lệ".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{CreateRecordInput, EnsureDailySessionInput};
    use rusqlite::params;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tauri::Manager;

    #[test]
    fn append_rejects_invalid_video_path_before_file_access() {
        let app = tauri::test::mock_app();
        let handle = app.app_handle().clone();

        let error = append_video_file_for_app(
            &handle,
            &AppendVideoFileInput {
                video_path: "../outside.webm".to_string(),
                bytes: vec![1],
            },
        )
        .expect_err("invalid relative path");

        assert_eq!(error, "Đường dẫn video không hợp lệ");
    }

    #[test]
    fn append_reports_file_open_failure_without_full_path() {
        let app = tauri::test::mock_app();
        let handle = app.app_handle().clone();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_millis() as i64;
        let test_root = std::env::temp_dir().join(format!(
            "pack-audit-open-fail-test-{}-{}",
            std::process::id(),
            now
        ));
        let test_app_data_dir = test_root.join("app-data");
        let test_save_dir = test_root.join("videos");
        let _ = std::fs::remove_dir_all(&test_root);
        std::fs::create_dir_all(&test_save_dir.join("directory-target"))
            .expect("create directory target");
        let _app_data_guard = db::use_test_app_data_path(test_app_data_dir);
        let _home_guard = db::use_test_home_dir(test_root.clone());

        {
            let conn = db::connection::connection(&handle).expect("sqlite connection");
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('video_save_dir', ?1)",
                params![test_save_dir.to_string_lossy().as_ref()],
            )
            .expect("set test video save dir");
        }

        let error = append_video_file_for_app(
            &handle,
            &AppendVideoFileInput {
                video_path: "directory-target".to_string(),
                bytes: vec![1],
            },
        )
        .expect_err("directory target cannot be opened as video file");

        assert_eq!(error, "Không thể mở file video");
        std::fs::remove_dir_all(&test_root).expect("cleanup test dir");
    }

    #[test]
    fn reveal_resolves_existing_video_inside_configured_save_dir() {
        let app = tauri::test::mock_app();
        let handle = app.app_handle().clone();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_millis() as i64;
        let test_root = std::env::temp_dir().join(format!(
            "pack-audit-reveal-resolve-test-{}-{}",
            std::process::id(),
            now
        ));
        let test_app_data_dir = test_root.join("app-data");
        let test_save_dir = test_root.join("videos");
        let relative_path = "2026-05-17/video.webm";
        let full_path = test_save_dir.join(relative_path);
        let _ = std::fs::remove_dir_all(&test_root);
        std::fs::create_dir_all(full_path.parent().expect("video parent"))
            .expect("create test video parent");
        std::fs::write(&full_path, [1, 2, 3]).expect("write test video");
        let _app_data_guard = db::use_test_app_data_path(test_app_data_dir);
        let _home_guard = db::use_test_home_dir(test_root.clone());

        {
            let conn = db::connection::connection(&handle).expect("sqlite connection");
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('video_save_dir', ?1)",
                params![test_save_dir.to_string_lossy().as_ref()],
            )
            .expect("set test video save dir");
        }

        let resolved =
            resolve_existing_video_path(&handle, relative_path).expect("resolve video path");

        assert_eq!(
            resolved,
            full_path.canonicalize().expect("canonical test video")
        );
        std::fs::remove_dir_all(&test_root).expect("cleanup test dir");
    }

    #[test]
    fn reveal_rejects_invalid_or_missing_video_path_before_opening_file_manager() {
        let app = tauri::test::mock_app();
        let handle = app.app_handle().clone();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_millis() as i64;
        let test_root = std::env::temp_dir().join(format!(
            "pack-audit-reveal-reject-test-{}-{}",
            std::process::id(),
            now
        ));
        let test_app_data_dir = test_root.join("app-data");
        let test_save_dir = test_root.join("videos");
        let _ = std::fs::remove_dir_all(&test_root);
        std::fs::create_dir_all(&test_save_dir).expect("create test save dir");
        let _app_data_guard = db::use_test_app_data_path(test_app_data_dir);
        let _home_guard = db::use_test_home_dir(test_root.clone());

        {
            let conn = db::connection::connection(&handle).expect("sqlite connection");
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('video_save_dir', ?1)",
                params![test_save_dir.to_string_lossy().as_ref()],
            )
            .expect("set test video save dir");
        }

        assert_eq!(
            resolve_existing_video_path(&handle, "../outside.webm"),
            Err("Đường dẫn video không hợp lệ".to_string())
        );
        assert_eq!(
            resolve_existing_video_path(&handle, "missing.webm"),
            Err("File video chưa tồn tại".to_string())
        );
        std::fs::remove_dir_all(&test_root).expect("cleanup test dir");
    }

    #[test]
    fn record_insert_failure_leaves_persisted_video_for_cleanup() {
        let app = tauri::test::mock_app();
        let handle = app.app_handle().clone();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_millis() as i64;
        let record_id = format!("record_insert_fail_{}_{}", std::process::id(), now);
        let test_root = std::env::temp_dir().join(format!(
            "pack-audit-insert-fail-test-{}-{}",
            std::process::id(),
            now
        ));
        let test_app_data_dir = test_root.join("app-data");
        let test_save_dir = test_root.join("videos");
        let _ = std::fs::remove_dir_all(&test_root);
        std::fs::create_dir_all(&test_root).expect("create test root");
        let _app_data_guard = db::use_test_app_data_path(test_app_data_dir);
        let _home_guard = db::use_test_home_dir(test_root.clone());

        {
            let conn = db::connection::connection(&handle).expect("sqlite connection");
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('video_save_dir', ?1)",
                params![test_save_dir.to_string_lossy().as_ref()],
            )
            .expect("set test video save dir");
        }

        let session = db::ensure_daily_session(
            &handle,
            EnsureDailySessionInput {
                user_id: "default_owner".to_string(),
                now,
            },
        )
        .expect("daily session");
        let relative_path = create_video_file_for_app(
            &handle,
            &CreateVideoFileInput {
                record_id: record_id.clone(),
                scanned_at: now,
                mime_type: "video/webm".to_string(),
            },
        )
        .expect("create video file");
        append_video_file_for_app(
            &handle,
            &AppendVideoFileInput {
                video_path: relative_path.clone(),
                bytes: vec![1, 2],
            },
        )
        .expect("append video chunk");

        let session_id = session.id;
        db::create_record(
            &handle,
            CreateRecordInput {
                id: record_id.clone(),
                session_id: session_id.clone(),
                barcode: "MOCK-INSERT-FAIL".to_string(),
                format: "CODE_128".to_string(),
                scanned_at: now,
                video_path: relative_path.clone(),
                video_duration_ms: 1_000,
                note: None,
            },
        )
        .expect("create first record");
        let error = db::create_record(
            &handle,
            CreateRecordInput {
                id: record_id.clone(),
                session_id,
                barcode: "MOCK-INSERT-FAIL".to_string(),
                format: "CODE_128".to_string(),
                scanned_at: now,
                video_path: relative_path.clone(),
                video_duration_ms: 1_000,
                note: None,
            },
        )
        .expect_err("duplicate record id fails");

        assert_eq!(error, "Không thể tạo bản ghi");
        assert!(test_save_dir.join(&relative_path).exists());
        std::fs::remove_dir_all(&test_root).expect("cleanup test dir");
    }

    #[test]
    fn mocked_video_save_can_create_sqlite_record() {
        let app = tauri::test::mock_app();
        let handle = app.app_handle().clone();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_millis() as i64;
        let record_id = format!("record_{}_{}", std::process::id(), now);
        let second_record_id = format!("record_{}_{}_b", std::process::id(), now);

        let test_root =
            std::env::temp_dir().join(format!("pack-audit-test-{}-{}", std::process::id(), now));
        let test_app_data_dir = test_root.join("app-data");
        let test_save_dir = test_root.join("videos");
        let _ = std::fs::remove_dir_all(&test_root);
        std::fs::create_dir_all(&test_root).expect("create test root");
        let _app_data_guard = db::use_test_app_data_path(test_app_data_dir.clone());
        let _home_guard = db::use_test_home_dir(test_root.clone());

        {
            let conn = db::connection::connection(&handle).expect("sqlite connection");
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('video_save_dir', ?1)",
                params![test_save_dir.to_string_lossy().as_ref()],
            )
            .expect("set test video save dir");
        }

        let save_dir = db::get_video_save_dir(&handle).expect("video save dir");
        assert_eq!(
            std::path::PathBuf::from(save_dir)
                .canonicalize()
                .expect("canonical save dir"),
            test_save_dir
                .canonicalize()
                .expect("canonical test save dir")
        );

        let session = db::ensure_daily_session(
            &handle,
            EnsureDailySessionInput {
                user_id: "default_owner".to_string(),
                now,
            },
        )
        .expect("daily session");

        let relative_path = create_video_file_for_app(
            &handle,
            &CreateVideoFileInput {
                record_id: record_id.clone(),
                scanned_at: now,
                mime_type: "video/webm".to_string(),
            },
        )
        .expect("create video file");
        append_video_file_for_app(
            &handle,
            &AppendVideoFileInput {
                video_path: relative_path.clone(),
                bytes: vec![1, 2],
            },
        )
        .expect("append first video chunk");
        append_video_file_for_app(
            &handle,
            &AppendVideoFileInput {
                video_path: relative_path.clone(),
                bytes: vec![3, 4],
            },
        )
        .expect("append second video chunk");

        assert!(relative_path.starts_with(&db::date_label(now)));
        assert!(relative_path.ends_with(".webm"));

        let record = db::create_record(
            &handle,
            CreateRecordInput {
                id: record_id.clone(),
                session_id: session.id.clone(),
                barcode: "MOCK-123".to_string(),
                format: "CODE_128".to_string(),
                scanned_at: now,
                video_path: relative_path.clone(),
                video_duration_ms: 1_000,
                note: None,
            },
        )
        .expect("create record");

        assert_eq!(record.id, record_id);
        assert_eq!(record.video_path.as_deref(), Some(relative_path.as_str()));
        assert_eq!(
            std::fs::read(test_save_dir.join(&relative_path)).expect("stored video bytes"),
            vec![1, 2, 3, 4]
        );

        let second_scanned_at = now + 2_000;
        let second_relative_path = create_video_file_for_app(
            &handle,
            &CreateVideoFileInput {
                record_id: second_record_id.clone(),
                scanned_at: second_scanned_at,
                mime_type: "video/webm".to_string(),
            },
        )
        .expect("create second video file");
        append_video_file_for_app(
            &handle,
            &AppendVideoFileInput {
                video_path: second_relative_path.clone(),
                bytes: vec![5, 6, 7, 8],
            },
        )
        .expect("append second video");
        let second_record = db::create_record(
            &handle,
            CreateRecordInput {
                id: second_record_id.clone(),
                session_id: session.id.clone(),
                barcode: "MOCK-456".to_string(),
                format: "CODE_128".to_string(),
                scanned_at: second_scanned_at,
                video_path: second_relative_path.clone(),
                video_duration_ms: 1_250,
                note: None,
            },
        )
        .expect("create second record");

        assert_ne!(record.id, second_record.id);
        assert_ne!(record.scanned_at, second_record.scanned_at);
        assert_eq!(record.session_id, second_record.session_id);

        let reused_session = db::ensure_daily_session(
            &handle,
            EnsureDailySessionInput {
                user_id: "default_owner".to_string(),
                now,
            },
        )
        .expect("reuse daily session");
        assert_eq!(reused_session.id, record.session_id);
        assert!(reused_session.scanned_count >= 2);
        assert!(reused_session.duration_ms >= 0);

        let conn = db::connection::connection(&handle).expect("sqlite connection");
        let stored_path: String = conn
            .query_row(
                "SELECT video_path FROM records WHERE id = ?1",
                params![record_id],
                |row| row.get(0),
            )
            .expect("stored video path");
        assert_eq!(stored_path, relative_path);

        let stored_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM records WHERE id IN (?1, ?2) AND session_id = ?3",
                params![record_id, second_record_id, record.session_id],
                |row| row.get(0),
            )
            .expect("stored record count");
        assert_eq!(stored_count, 2);

        conn.execute(
            "DELETE FROM records WHERE id IN (?1, ?2)",
            params![record_id, second_record_id],
        )
        .expect("cleanup test records");
        drop(conn);
        std::fs::remove_dir_all(&test_root).expect("cleanup test dir");
    }
}
