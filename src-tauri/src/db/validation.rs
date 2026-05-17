use std::path::{Component, Path};

pub fn validate_id(value: &str, message: &str) -> Result<(), String> {
    let valid = !value.is_empty()
        && value.len() <= 128
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-'));
    if valid {
        Ok(())
    } else {
        Err(message.to_string())
    }
}

pub fn validate_barcode(value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    let valid =
        !trimmed.is_empty() && trimmed.len() <= 256 && trimmed.chars().all(|c| !c.is_control());
    if valid {
        Ok(())
    } else {
        Err("Mã vạch không hợp lệ".to_string())
    }
}

pub fn validate_format(value: &str) -> Result<(), String> {
    let valid = !value.is_empty()
        && value.len() <= 64
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '/' | '.'));
    if valid {
        Ok(())
    } else {
        Err("Định dạng mã vạch không hợp lệ".to_string())
    }
}

pub fn validate_relative_path(path: &str) -> Result<(), String> {
    let path = Path::new(path);
    if path.as_os_str().is_empty() || path.is_absolute() {
        return Err("Đường dẫn video không hợp lệ".to_string());
    }

    let valid = path.components().all(|component| match component {
        Component::Normal(_) => true,
        Component::CurDir | Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
            false
        }
    });

    if valid {
        Ok(())
    } else {
        Err("Đường dẫn video không hợp lệ".to_string())
    }
}

pub fn validate_recording_duration(duration_ms: i64) -> Result<(), String> {
    if (1_000..=600_000).contains(&duration_ms) {
        Ok(())
    } else {
        Err("Thời lượng video không hợp lệ".to_string())
    }
}
