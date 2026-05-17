use chrono::{DateTime, Local, Utc};
use rusqlite::{params, Connection, OptionalExtension};

use super::connection::connection;
use super::models::{EnsureDailySessionInput, Session};
use super::validation::validate_id;

pub fn ensure_daily_session(
    app: &tauri::AppHandle<impl tauri::Runtime>,
    input: EnsureDailySessionInput,
) -> Result<Session, String> {
    validate_id(&input.user_id, "Người dùng không hợp lệ")?;

    let conn = connection(app)?;
    let session_name = date_label(input.now);

    let existing_id = conn
        .query_row(
            "SELECT id FROM sessions WHERE user_id = ?1 AND name = ?2 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            params![input.user_id, session_name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| "Không thể đọc session".to_string())?;

    let session_id = match existing_id {
        Some(id) => id,
        None => {
            let id = format!("session_{}_{}", input.user_id, input.now);
            conn.execute(
                "INSERT INTO sessions (id, user_id, name, started_at, ended_at, status) VALUES (?1, ?2, ?3, ?4, NULL, 'active')",
                params![id, input.user_id, session_name, input.now],
            )
            .map_err(|_| "Không thể tạo session".to_string())?;
            id
        }
    };

    load_session(&conn, &session_id)
}

pub fn date_label(ms: i64) -> String {
    let utc = DateTime::<Utc>::from_timestamp_millis(ms).unwrap_or_else(Utc::now);
    utc.with_timezone(&Local).format("%Y-%m-%d").to_string()
}

fn load_session(conn: &Connection, id: &str) -> Result<Session, String> {
    conn.query_row(
        "
        SELECT
          s.id,
          s.user_id,
          s.name,
          s.started_at,
          s.ended_at,
          s.status,
          COUNT(r.id) AS scanned_count,
          CASE WHEN COUNT(r.id) > 0 THEN MAX(r.scanned_at) - MIN(r.scanned_at) ELSE 0 END AS duration_ms
        FROM sessions s
        LEFT JOIN records r ON r.session_id = s.id
        WHERE s.id = ?1
        GROUP BY s.id, s.user_id, s.name, s.started_at, s.ended_at, s.status
        ",
        params![id],
        |row| {
            Ok(Session {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                status: row.get(5)?,
                scanned_count: row.get(6)?,
                duration_ms: row.get(7)?,
            })
        },
    )
    .map_err(|_| "Không tìm thấy session".to_string())
}
