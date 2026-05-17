use rusqlite::Connection;

pub fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS users (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          role        TEXT NOT NULL CHECK(role IN ('owner', 'staff')),
          pin_hash    TEXT NOT NULL,
          created_at  INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id          TEXT PRIMARY KEY,
          user_id     TEXT NOT NULL REFERENCES users(id),
          name        TEXT NOT NULL,
          started_at  INTEGER NOT NULL,
          ended_at    INTEGER,
          status      TEXT NOT NULL CHECK(status IN ('active', 'completed'))
        );

        CREATE TABLE IF NOT EXISTS records (
          id                TEXT PRIMARY KEY,
          session_id        TEXT NOT NULL REFERENCES sessions(id),
          barcode           TEXT NOT NULL,
          format            TEXT NOT NULL,
          scanned_at        INTEGER NOT NULL,
          video_path        TEXT,
          video_duration_ms INTEGER,
          note              TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        INSERT OR IGNORE INTO users (id, name, role, pin_hash, created_at)
        VALUES ('default_owner', 'Chủ cửa hàng', 'owner', 'phase-1-placeholder', 0);
        ",
    )
    .map_err(|_| "Không thể migrate SQLite".to_string())
}
