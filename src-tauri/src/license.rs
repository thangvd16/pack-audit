use hmac::{Hmac, Mac};
use sha2::Sha256;

pub const GRACE_PERIOD_SECS: u64 = 6 * 86400;

const FILE_HMAC_SALT: &[u8] = b"vh-license-file-integrity";

type HmacSha256 = Hmac<Sha256>;

pub fn current_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn file_hmac(token: &str, device_id: &str, last_refresh: u64) -> String {
    let mut mac = HmacSha256::new_from_slice(FILE_HMAC_SALT).expect("HMAC accepts any key length");
    mac.update(format!("{}|{}|{}", token, device_id, last_refresh).as_bytes());
    hex::encode(&mac.finalize().into_bytes()[..8])
}

// ── License file ─────────────────────────────────────────────────────────────
// Format: jwt:<token>|<device_id>|<last_refresh_at>|<file_hmac>

pub struct JwtLicenseFile {
    pub token: String,
    pub device_id: String,
    pub last_refresh: u64,
}

pub fn parse_license_file(content: &str) -> Option<JwtLicenseFile> {
    let s = content.trim();
    let rest = s.strip_prefix("jwt:")?;
    let parts: Vec<&str> = rest.rsplitn(3, '|').collect();
    if parts.len() != 3 {
        return None;
    }
    let stored_hmac = parts[0];
    let last_refresh: u64 = parts[1].parse().ok()?;
    let remaining = parts[2];

    let pipe = remaining.rfind('|')?;
    let token = &remaining[..pipe];
    let device_id = &remaining[pipe + 1..];

    if token.is_empty() || device_id.is_empty() {
        return None;
    }

    if stored_hmac != file_hmac(token, device_id, last_refresh) {
        return None;
    }

    Some(JwtLicenseFile {
        token: token.to_string(),
        device_id: device_id.to_string(),
        last_refresh,
    })
}

pub fn serialize_license_file(token: &str, device_id: &str, last_refresh: u64) -> String {
    let hmac = file_hmac(token, device_id, last_refresh);
    format!("jwt:{}|{}|{}|{}", token, device_id, last_refresh, hmac)
}

pub fn check_grace_period(last_refresh: u64) -> LicenseStatus {
    let now = current_unix();
    let deadline = last_refresh + GRACE_PERIOD_SECS;
    if now > deadline {
        return LicenseStatus {
            valid: false,
            needs_refresh: true,
            message: "Cần kết nối internet để xác minh license".into(),
            days_remaining: 0,
        };
    }
    let days = ((deadline - now) / 86400) as i64;
    LicenseStatus {
        valid: true,
        needs_refresh: true,
        message: format!("Offline — còn {} ngày grace", days),
        days_remaining: days,
    }
}

// ── Public types ─────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct LicenseStatus {
    pub valid: bool,
    pub needs_refresh: bool,
    pub message: String,
    pub days_remaining: i64,
}
