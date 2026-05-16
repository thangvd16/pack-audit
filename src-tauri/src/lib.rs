use std::path::PathBuf;
use tauri::Manager;

mod license;

use license::{
    check_grace_period, current_unix, parse_license_file, serialize_license_file, LicenseStatus,
};

const LICENSE_SERVER: &str = "https://video-hub-license.tkmmo.workers.dev";

fn hash_device_source(raw: &str) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    let mut mac = Hmac::<Sha256>::new_from_slice(b"device-id-salt").unwrap();
    mac.update(raw.as_bytes());
    hex::encode(&mac.finalize().into_bytes()[..8])
}

fn os_machine_id() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let out = std::process::Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
            .ok()?;
        let text = String::from_utf8_lossy(&out.stdout);
        let marker = "\"IOPlatformUUID\" = \"";
        let idx = text.find(marker)? + marker.len();
        let rest = &text[idx..];
        let end = rest.find('"')?;
        let uuid = rest[..end].trim();
        if uuid.is_empty() {
            None
        } else {
            Some(uuid.to_string())
        }
    }

    #[cfg(target_os = "linux")]
    {
        let v = std::fs::read_to_string("/etc/machine-id").ok()?;
        let id = v.trim();
        if id.is_empty() {
            None
        } else {
            Some(id.to_string())
        }
    }

    #[cfg(target_os = "windows")]
    {
        let out = std::process::Command::new("reg")
            .args([
                "query",
                r"HKLM\SOFTWARE\Microsoft\Cryptography",
                "/v",
                "MachineGuid",
            ])
            .output()
            .ok()?;
        let text = String::from_utf8_lossy(&out.stdout);
        let line = text
            .lines()
            .find(|l| l.contains("MachineGuid"))?
            .split_whitespace()
            .last()?;
        if line.is_empty() {
            None
        } else {
            Some(line.to_string())
        }
    }
}

fn device_id() -> String {
    if let Some(machine_id) = os_machine_id() {
        return hash_device_source(&format!("mid:{}", machine_id));
    }
    let hostname = hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .unwrap_or_else(|| "unknown".to_string());
    let user = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_default();
    hash_device_source(&format!("{}:{}", hostname, user))
}

fn license_file_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("license.dat")
}

fn no_license() -> LicenseStatus {
    LicenseStatus {
        valid: false,
        needs_refresh: false,
        message: "No license found".into(),
        days_remaining: 0,
    }
}

#[tauri::command]
async fn activate_license_online(
    app: tauri::AppHandle,
    key: String,
) -> Result<LicenseStatus, String> {
    let key = key.trim().to_string();
    let did = device_id();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Network error: {}", e))?;
    let resp = client
        .post(format!("{}/activate", LICENSE_SERVER))
        .json(&serde_json::json!({ "key": key, "device_id": did }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let msg = body["error"]
            .as_str()
            .unwrap_or("Activation failed")
            .to_string();
        return Err(msg);
    }

    let token = body["token"].as_str().ok_or("Missing token")?.to_string();
    let days_remaining = body["days_remaining"].as_i64().unwrap_or(0);
    let now = current_unix();

    write_license_file(&app, &token, &did, now)?;

    Ok(LicenseStatus {
        valid: true,
        needs_refresh: false,
        message: format!("{} day(s) remaining", days_remaining),
        days_remaining,
    })
}

#[tauri::command]
async fn refresh_license_online(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    let path = license_file_path(&app);
    let content = std::fs::read_to_string(&path).map_err(|_| "No license file".to_string())?;
    let saved = parse_license_file(&content).ok_or("License file corrupted")?;

    let did = device_id();
    if saved.device_id != did {
        return Err("Device mismatch".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Network error: {}", e))?;
    let resp = client
        .post(format!("{}/refresh", LICENSE_SERVER))
        .json(&serde_json::json!({ "token": saved.token, "device_id": did }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let msg = body["error"]
            .as_str()
            .unwrap_or("Refresh failed")
            .to_string();
        return Err(msg);
    }

    let new_token = body["token"].as_str().ok_or("Missing token")?.to_string();
    let days_remaining = body["days_remaining"].as_i64().unwrap_or(0);
    let now = current_unix();

    write_license_file(&app, &new_token, &did, now)?;

    Ok(LicenseStatus {
        valid: true,
        needs_refresh: false,
        message: format!("{} day(s) remaining", days_remaining),
        days_remaining,
    })
}

#[tauri::command]
fn check_saved_license(app: tauri::AppHandle) -> LicenseStatus {
    let path = license_file_path(&app);

    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return no_license(),
    };

    let saved = match parse_license_file(&content) {
        Some(s) => s,
        None => return no_license(),
    };

    let did = device_id();
    if saved.device_id != did {
        return LicenseStatus {
            valid: false,
            needs_refresh: false,
            message: "Device mismatch".into(),
            days_remaining: 0,
        };
    }

    check_grace_period(saved.last_refresh)
}

fn write_license_file(
    app: &tauri::AppHandle,
    token: &str,
    device_id: &str,
    last_refresh: u64,
) -> Result<(), String> {
    let path = license_file_path(app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serialize_license_file(token, device_id, last_refresh);
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file_text(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(
            std::path::Path::new(&path)
                .parent()
                .unwrap_or(std::path::Path::new(&path)),
        )
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            activate_license_online,
            refresh_license_online,
            check_saved_license,
            read_file_text,
            write_file_text,
            reveal_in_file_manager,
            file_exists,
            delete_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
