# Pack Audit Roadmap

## Tổng quan

Pack Audit là app Tauri desktop ưu tiên Windows, dùng để kiểm hàng bằng camera. Nhân viên scan barcode, app ghi video bằng chứng và lưu metadata/video local bằng SQLite.

## Phase 0: Foundation

Trạng thái: đã làm một phần.

Mục tiêu:

- Chuẩn hóa frontend feature-first structure.
- Chuẩn hóa SQLite schema.
- Chuẩn hóa native scanner command/event contract.
- Chuẩn hóa native binary strategy cho FFmpeg và ZBar decoder sidecar.

Đã có:

- Frontend feature-first structure.
- SQLite migrations cho core entities.
- Native scanner contract và TypeScript service tests.
- Template build native sidecars cho ZBar decoder và FFmpeg.
- Quyết định Windows dynamic ZBar bundle và FFmpeg LGPL sidecar.
- Browser decoder dependency đã được gỡ khỏi strategy/runtime.

Còn lại:

- App release workflow download/copy sidecar binaries trước Tauri build.

## Phase 1: Decoder Binary Gate

Trạng thái: active next gate.

Mục tiêu: build Windows decoder binary kèm ZBar DLL runtime và publish làm artifact/release asset.

Output bắt buộc:

```text
pack-audit-decoder-x86_64-pc-windows-msvc.exe
zbar-0.dll
iconv-2.dll
```

Acceptance:

- GitHub Actions `Build ZBar Decoder Windows` pass.
- Smoke test trả JSON hợp lệ.
- Recursive `dumpbin /dependents` không còn DLL non-system bị thiếu trong artifact.
- Binary và dependency source được version/pin rõ ràng.
- macOS Homebrew ZBar chỉ được dùng cho dev/test, không thay thế Windows gate.

## Phase 1b: FFmpeg Binary Gate

Mục tiêu: package FFmpeg Windows sidecar để app không cần FFmpeg cài ngoài.

Output bắt buộc:

```text
ffmpeg-x86_64-pc-windows-msvc.exe
```

Acceptance:

- GitHub Actions `Build FFmpeg Windows Sidecar` pass.
- Smoke test `ffmpeg -version` pass.
- Source URL và SHA-256 của FFmpeg archive được ghi rõ.
- Chỉ dùng LGPL build trừ khi có quyết định license khác.

## Phase 2: Windows App Sidecar Packaging

Mục tiêu: app build dùng prebuilt sidecars.

File cần có trước Windows Tauri build:

```text
src-tauri/binaries/pack-audit-decoder-x86_64-pc-windows-msvc.exe
src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe
src-tauri/binaries/zbar-0.dll
src-tauri/binaries/iconv-2.dll
```

Acceptance:

- Tauri Windows config có `externalBin` cho `binaries/pack-audit-decoder` và `binaries/ffmpeg`.
- Tauri Windows config bundle `binaries/*.dll` bằng `resources`.
- CI fail rõ nếu thiếu sidecar.
- Windows bundle chứa đủ hai sidecar và ZBar DLL runtime.

## Phase 3: Native Camera And Preview

Mục tiêu: Rust sở hữu camera access và emit preview frame về React.

Acceptance:

- App không mở camera khi launch.
- Camera chỉ start trong scan mode.
- List/open/close camera chạy trên Windows.
- Preview event-driven và throttle.
- Thoát scan mode release camera và sidecar processes.

## Phase 4: Decoder Integration

Mục tiêu: Rust camera engine spawn `pack-audit-decoder` và stream grayscale frame sang sidecar.

Acceptance:

- Decoder process start một lần mỗi scan session.
- Frame gửi theo stdin protocol đã chốt.
- JSON result parse thành native scanner events.
- Decoder crash trả typed error.
- Scan 5 phút không tăng process count.

## Phase 5: FFmpeg Recording

Mục tiêu: Rust ghi video bằng FFmpeg sidecar.

Acceptance:

- FFmpeg ghi vào storage path đã cấu hình.
- Stop recording close stdin và đợi FFmpeg flush.
- FFmpeg crash trả typed error.
- Video mở được bằng Windows default player.
- Runtime không còn phụ thuộc `MediaRecorder`.

## Phase 6: Native Capture State Machine

Mục tiêu: Rust quản lý `idle`, `countdown`, `recording`, `saving`.

Acceptance:

- Stable barcode bắt đầu countdown.
- Scan lại cùng mã dừng recording.
- Scan mã khác switch cycle.
- Manual input dùng cùng state machine.
- Đóng app khi recording save-before-close nếu khả thi.

## Phase 7: React Native Scanner UI

Mục tiêu: React render native scanner state và gửi native commands.

Acceptance:

- Preview dùng `scanner://frame`.
- Camera selector gọi `scanner_list_cameras`.
- Stop/cancel/manual input gọi native commands.
- Scanner flow không import browser camera/decoder hooks.

## Phase 8: Legacy Removal

Mục tiêu: xóa browser scanner/recorder runtime sau khi native flow hoàn tất.

Acceptance:

- Không còn browser decoder runtime.
- Không còn browser camera runtime trong scanner flow.
- Không còn `MediaRecorder` runtime trong scanner flow.
- Không giữ compatibility re-export cho API cũ.
- Test cũ được xóa hoặc thay bằng native tests.

## Phase 9: Windows Release Verification

Mục tiêu: xác nhận Windows-first release.

Acceptance:

- Windows clean-machine smoke test pass.
- QR và barcode đơn hàng thật pass.
- Recording 1 giây, 10 giây và 10 phút pass.
- CPU/RAM/decode latency đủ ổn cho ca làm việc dài.

## Deferred Scope

- Linux release.
- Full role/user management ngoài MVP.
- Batch/session naming UX ngoài auto-session.
- DataMatrix/PDF417/Aztec/Micro QR/GS1 DataBar support.
- Cloud sync hoặc server-side storage.
