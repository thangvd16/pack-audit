use rusqlite::{params, OptionalExtension};
use std::path::{Path, PathBuf};
use tauri::{Manager, Runtime};

use super::connection::connection;

const VIDEO_SAVE_DIR_KEY: &str = "video_save_dir";

#[cfg(test)]
thread_local! {
    static TEST_HOME_DIR: std::cell::RefCell<Option<PathBuf>> = const { std::cell::RefCell::new(None) };
}

#[cfg(test)]
pub struct TestHomeDirGuard {
    previous: Option<PathBuf>,
}

#[cfg(test)]
impl Drop for TestHomeDirGuard {
    fn drop(&mut self) {
        let previous = self.previous.take();
        TEST_HOME_DIR.with(|path| {
            path.replace(previous);
        });
    }
}

#[cfg(test)]
pub fn use_test_home_dir(path: PathBuf) -> TestHomeDirGuard {
    std::fs::create_dir_all(&path).expect("create test home dir");
    let previous = TEST_HOME_DIR.with(|test_path| test_path.replace(Some(path)));
    TestHomeDirGuard { previous }
}

pub fn ensure_video_save_dir<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    let conn = connection(app)?;
    let configured = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![VIDEO_SAVE_DIR_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| "Không thể đọc cấu hình lưu video".to_string())?;

    let raw_path = match configured {
        Some(value) => PathBuf::from(value),
        None => {
            let default_dir = default_video_save_dir(app)?;
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)",
                params![VIDEO_SAVE_DIR_KEY, default_dir.to_string_lossy().as_ref()],
            )
            .map_err(|_| "Không thể khởi tạo cấu hình lưu video".to_string())?;
            default_dir
        }
    };

    validate_video_save_dir(app, &raw_path)
}

pub fn get_video_save_dir<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<String, String> {
    Ok(ensure_video_save_dir(app)?.to_string_lossy().to_string())
}

fn default_video_save_dir<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    let base = home_dir(app)?.join("Movies");

    #[cfg(target_os = "windows")]
    let base = app
        .path()
        .video_dir()
        .or_else(|_| home_dir(app).map(|home| home.join("Videos")))
        .map_err(|_| "Không thể xác định thư mục video".to_string())?;

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let base = app
        .path()
        .video_dir()
        .or_else(|_| home_dir(app).map(|home| home.join("Videos")))
        .map_err(|_| "Không thể xác định thư mục video".to_string())?;

    Ok(base.join("Pack Audit"))
}

fn home_dir<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    #[cfg(test)]
    if let Some(dir) = TEST_HOME_DIR.with(|path| path.borrow().clone()) {
        std::fs::create_dir_all(&dir).map_err(|_| "Không thể tạo thư mục home test".to_string())?;
        return Ok(dir);
    }

    app.path()
        .home_dir()
        .map_err(|_| "Không thể xác định thư mục home".to_string())
}

fn validate_video_save_dir<R: Runtime>(
    app: &tauri::AppHandle<R>,
    raw_path: &Path,
) -> Result<PathBuf, String> {
    if !raw_path.is_absolute() {
        return Err("Thư mục lưu video không hợp lệ".to_string());
    }

    std::fs::create_dir_all(raw_path).map_err(|_| "Không thể tạo thư mục lưu video".to_string())?;

    let home = home_dir(app)?;
    let home = home
        .canonicalize()
        .map_err(|_| "Không thể kiểm tra thư mục home".to_string())?;
    let save_dir = raw_path
        .canonicalize()
        .map_err(|_| "Không thể kiểm tra thư mục lưu video".to_string())?;

    if !save_dir.starts_with(&home) {
        return Err("Thư mục lưu video phải nằm trong home".to_string());
    }

    Ok(save_dir)
}
