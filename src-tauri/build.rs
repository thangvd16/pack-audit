fn main() {
    tauri_build::build();

    #[cfg(target_os = "macos")]
    patch_info_plist();
}

#[cfg(target_os = "macos")]
fn patch_info_plist() {
    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR not set");
    let plist_path = std::path::Path::new(&out_dir).join("Info.plist");

    if !plist_path.exists() {
        return;
    }

    let content = std::fs::read_to_string(&plist_path).expect("Cannot read Info.plist");

    if content.contains("NSCameraUsageDescription") {
        return;
    }

    let insert = "\t<key>NSCameraUsageDescription</key>\n\t<string>Pack Audit c\u{1EA7}n truy c\u{1EAD}p camera \u{0111}\u{1EC3} qu\u{00E9}t m\u{00E3} v\u{1EA1}ch \u{0111}\u{01A1}n h\u{00E0}ng</string>\n";

    let patched = if let Some(pos) = content.rfind("</dict>") {
        format!("{}{}{}", &content[..pos], insert, &content[pos..])
    } else {
        return;
    };

    std::fs::write(&plist_path, patched).expect("Cannot write patched Info.plist");

    println!("cargo:rerun-if-changed=build.rs");
}
