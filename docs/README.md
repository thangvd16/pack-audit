# Pack Audit Documentation

Thư mục này là nguồn sự thật cho hành vi sản phẩm, quyết định kiến trúc, thứ tự triển khai và lịch sử thay đổi.

## Bản đồ tài liệu

| File | Mục đích | Cập nhật khi |
| --- | --- | --- |
| `RULES.md` | Quy tắc sản phẩm, kiến trúc, build, runtime và verification | Có quyết định mới hoặc thay đổi invariant |
| `ROADMAP.md` | Mốc sản phẩm/kỹ thuật theo phase | Scope, ưu tiên hoặc trạng thái phase thay đổi |
| `PLAN.md` | Checklist triển khai hiện tại và các gate tiếp theo | Bắt đầu, hoàn tất, block hoặc đổi thứ tự công việc |
| `CHANGELOG.md` | Lịch sử thay đổi đáng chú ý | Có thay đổi đáng kể về docs, kiến trúc, CI hoặc hành vi |
| `zbar-decoder-sidecar-template/` | Template build native sidecar binaries có thể copy sang repo khác | Decoder/FFmpeg build pipeline hoặc protocol thay đổi |

## Hướng hiện tại

Pack Audit là app Tauri desktop ưu tiên Windows trước. Pipeline scanner mục tiêu là native:

```text
Rust camera engine
  -> ZBar decoder sidecar
  -> FFmpeg recorder sidecar
  -> Tauri commands/events
  -> React UI
```

Frontend browser camera, browser decoder và `MediaRecorder` là legacy runtime. Không mở rộng thêm các hướng đó.

Windows release dùng prebuilt sidecars/DLL trong app bundle. App repo tải sidecars bằng `pnpm sidecars:fetch` từ release `thangvd16/decorder-sidecar@v0.2.1`; không commit binary vào git. Tauri chỉ khai báo sidecars trong `src-tauri/tauri.windows.conf.json` để macOS dev vẫn chạy được `cargo check` khi chưa có sidecar macOS. macOS dev có thể dùng Homebrew `zbar` để test nhanh decoder/protocol, nhưng release gate vẫn phải pass trên Windows CI và Windows clean machine.

## Kiểm tra local

```text
pnpm run build
pnpm test
pnpm run lint
cargo check --manifest-path src-tauri/Cargo.toml
pnpm tauri build --debug --bundles app
```

Trên macOS, lệnh Tauri trên chỉ kiểm tra app bundle local. Windows installer/release build chạy qua GitHub Actions trên `windows-latest` sau khi `pnpm sidecars:fetch` tải đủ sidecars.

## Test Build Trên GitHub Actions

Commit phần code cần build trước, sau đó chạy release script để bump version, tạo tag và push tag `v*`:

```text
git add README.md docs .github/workflows/release.yml .gitignore package.json pnpm-lock.yaml scripts/fetch-native-sidecars.mjs scripts/release.sh src src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/Info.plist src-tauri/src src-tauri/tauri.conf.json src-tauri/tauri.windows.conf.json src-tauri/binaries/.gitkeep
git commit -m "chore: prepare github actions release build"
./scripts/release.sh patch
```

Chỉ commit những thay đổi source/config bạn muốn build trên CI. Không commit các file tải về trong `src-tauri/binaries/*.exe` hoặc `src-tauri/binaries/*.dll`; các file này được `pnpm sidecars:fetch` tải lại trong CI.

`scripts/release.sh` chỉ chạy khi working tree sạch. Script sẽ chạy `pnpm run build`, `pnpm test`, `pnpm run lint`, `cargo check --manifest-path src-tauri/Cargo.toml`, commit version bump, tạo tag `vX.Y.Z`, rồi push branch và tag lên `origin`. Push tag sẽ kích hoạt workflow `Release`.

## Thứ tự đọc

1. Đọc `RULES.md` trước khi sửa scanner, recording, build hoặc release.
2. Đọc `ROADMAP.md` để hiểu ranh giới phase.
3. Đọc `PLAN.md` trước khi làm task tiếp theo.
4. Ghi một entry ngắn vào `CHANGELOG.md` sau thay đổi đáng chú ý.
