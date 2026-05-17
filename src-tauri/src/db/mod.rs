pub(crate) mod connection;
mod migrations;
mod models;
mod records_repo;
mod sessions_repo;
mod settings_repo;
mod validation;

pub use models::{
    CaptureRecord, CreateRecordInput, EnsureDailySessionInput, ListRecentRecordsInput, Session,
};
pub use records_repo::{create_record, list_recent_records};
pub use sessions_repo::{date_label, ensure_daily_session};
pub use settings_repo::{ensure_video_save_dir, get_video_save_dir};
pub(crate) use validation::validate_relative_path;

#[cfg(test)]
pub(crate) use connection::use_test_app_data_path;
#[cfg(test)]
pub(crate) use settings_repo::use_test_home_dir;
