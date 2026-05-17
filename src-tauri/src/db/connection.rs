use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{Manager, Runtime};

use super::migrations;

const DB_FILE_NAME: &str = "pack-audit.sqlite3";

#[cfg(test)]
thread_local! {
    static TEST_APP_DATA_PATH: std::cell::RefCell<Option<PathBuf>> = const { std::cell::RefCell::new(None) };
}

#[cfg(test)]
pub struct TestAppDataPathGuard {
    previous: Option<PathBuf>,
}

#[cfg(test)]
impl Drop for TestAppDataPathGuard {
    fn drop(&mut self) {
        let previous = self.previous.take();
        TEST_APP_DATA_PATH.with(|path| {
            path.replace(previous);
        });
    }
}

#[cfg(test)]
pub fn use_test_app_data_path(path: PathBuf) -> TestAppDataPathGuard {
    std::fs::create_dir_all(&path).expect("create test app data dir");
    let previous = TEST_APP_DATA_PATH.with(|test_path| test_path.replace(Some(path)));
    TestAppDataPathGuard { previous }
}

pub fn connection<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<Connection, String> {
    let db_path = app_data_path(app)?.join(DB_FILE_NAME);
    let conn = Connection::open(db_path).map_err(|_| "Không thể mở SQLite".to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|_| "Không thể cấu hình SQLite".to_string())?;
    migrations::migrate(&conn)?;
    Ok(conn)
}

fn app_data_path<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    #[cfg(test)]
    if let Some(dir) = TEST_APP_DATA_PATH.with(|path| path.borrow().clone()) {
        std::fs::create_dir_all(&dir)
            .map_err(|_| "Không thể tạo thư mục dữ liệu app".to_string())?;
        return Ok(dir);
    }

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Không thể xác định thư mục dữ liệu app".to_string())?;
    std::fs::create_dir_all(&dir).map_err(|_| "Không thể tạo thư mục dữ liệu app".to_string())?;
    Ok(dir)
}
