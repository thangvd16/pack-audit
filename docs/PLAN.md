# Pack Audit Implementation Plan

## Ưu tiên ngay

Không bắt đầu native camera hoặc FFmpeg recording runtime work trước khi Windows decoder binary gate pass. FFmpeg sidecar packaging có thể làm song song vì không phụ thuộc camera engine.

Gate hiện tại:

```text
Build ZBar Decoder Windows
  -> pack-audit-decoder-x86_64-pc-windows-msvc.exe
  -> zbar-0.dll + runtime DLLs
  -> smoke test JSON output
  -> recursive dumpbin dependency check
  -> publish artifact/release asset

Build FFmpeg Windows Sidecar
  -> ffmpeg-x86_64-pc-windows-msvc.exe
  -> smoke test ffmpeg -version
  -> publish artifact/release asset
```

## Gate 1: Build Decoder Binary

Owner: decoder sidecar repo/template.

Steps:

1. Copy `docs/zbar-decoder-sidecar-template/` sang decoder repo.
2. Run GitHub Actions `Build ZBar Decoder Windows`.
3. Confirm artifact:

```text
pack-audit-decoder-x86_64-pc-windows-msvc.exe
zbar-0.dll
```

4. Confirm smoke test:

```text
pack-audit-decoder-x86_64-pc-windows-msvc.exe --decode-image fixtures/sample.pgm
```

5. Confirm `dist/` có `zbar-0.dll` và các DLL runtime bundled kèm `.exe`.
6. Confirm recursive `dumpbin /dependents` không còn DLL non-system bị thiếu.
7. Publish toàn bộ `dist/` (`.exe` + DLLs) thành versioned release asset.

Chỉ build lại khi đổi decoder source, protocol, ZBar version, vcpkg baseline, platform hoặc architecture.

macOS dev được dùng Homebrew `zbar` để chạy nhanh local decoder/protocol test. Kết quả macOS chỉ là dev signal, không thay thế Gate 1 Windows.

## Gate 1b: Build FFmpeg Sidecar

Owner: FFmpeg sidecar workflow.

Steps:

1. Run GitHub Actions `Build FFmpeg Windows Sidecar`.
2. Confirm artifact:

```text
ffmpeg-x86_64-pc-windows-msvc.exe
```

3. Confirm smoke test:

```text
ffmpeg-x86_64-pc-windows-msvc.exe -hide_banner -version
```

4. Confirm workflow ghi rõ source URL và SHA-256 của FFmpeg archive.
5. Publish binary thành versioned release asset.

Mặc định dùng FFmpeg LGPL build. Không đổi sang GPL/nonfree build nếu chưa chốt lại license obligation.

## Gate 2: Prepare App Sidecars

Owner: app repo CI.

Steps:

1. App repo không commit binary. Chạy script fetch release assets:

```text
pnpm sidecars:fetch
```

Script mặc định tải từ `thangvd16/decorder-sidecar` tag `v0.2.1`.

2. Script phải tạo các file:

```text
src-tauri/binaries/pack-audit-decoder-x86_64-pc-windows-msvc.exe
src-tauri/binaries/zbar-0.dll
src-tauri/binaries/iconv-2.dll
src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe
```

3. Chỉ thêm Tauri Windows `bundle.externalBin` và `bundle.resources` khi các file Windows sidecar/DLL có trong CI:

`src-tauri/tauri.windows.conf.json`

```json
{
  "bundle": {
    "externalBin": [
      "binaries/pack-audit-decoder",
      "binaries/ffmpeg"
    ],
    "resources": {
      "binaries/*.dll": "binaries/"
    }
  }
}
```

Không đặt `externalBin` Windows trong `src-tauri/tauri.conf.json`, vì `cargo check` trên macOS sẽ bắt buộc phải có sidecar macOS tương ứng.

4. Add CI check fail trước Tauri build nếu thiếu sidecar hoặc DLL runtime.
5. Thêm `tauri-plugin-shell` khi bắt đầu spawn sidecar ở Gate 3. Gate 2 chỉ cần bundle sidecar để test Windows app build.
6. Local macOS app build smoke test dùng:

```text
pnpm tauri build --debug --bundles app
```

Không dùng macOS DMG build làm release gate cho Windows.

## Gate 3: Implement Rust Sidecar Lifecycle

Owner: `src-tauri/src/scanner`.

Steps:

1. Resolve target-specific sidecar path qua Tauri sidecar API.
2. Spawn `pack-audit-decoder` một lần khi scan mode start.
3. Stop decoder khi scan mode exit.
4. Đọc stdout JSON line-by-line.
5. Surface spawn/crash/parse errors qua `scanner://error`.
6. Add unit tests cho protocol parser.

Acceptance:

- `tauri-plugin-shell` đã được cấu hình trước bước 1.
- Không spawn process theo frame.
- Process count ổn định khi scan 5 phút.
- Sidecar crash không làm app crash.

## Gate 4: Implement Native Camera Preview

Owner: Rust scanner engine và React scanner UI.

Steps:

1. Implement Windows camera list/open/close.
2. Emit preview frames qua `scanner://frame`.
3. Render preview trong React.
4. Throttle preview khoảng 10-15 FPS.
5. Drop preview frames khi UI backlog.

Acceptance:

- App launch không mở camera.
- Scan mode mở camera.
- Thoát scan mode release camera.

## Gate 5: Stream Frames To Decoder

Owner: Rust scanner decoder integration.

Steps:

1. Convert camera frames thành grayscale/luma 8-bit.
2. Gửi frame header và bytes vào decoder stdin.
3. Parse decoder JSON thành `NativeScanResult`.
4. Emit `scanner://detected` chỉ sau stability gate.
5. Log decode latency P50/P95.

Acceptance:

- QR decode được từ live camera trên Windows.
- Barcode đơn hàng thật decode được từ live camera trên Windows.
- Scan nhiều lần không leak process hoặc memory.

## Gate 6: Implement FFmpeg Recording

Owner: Rust scanner recorder.

Steps:

1. Resolve FFmpeg sidecar path.
2. Spawn FFmpeg khi recording start.
3. Pipe raw frames vào FFmpeg stdin.
4. Stop bằng cách close stdin và wait flush.
5. Save record metadata vào SQLite.
6. Handle disk/path/FFmpeg errors bằng typed scanner errors.

Acceptance:

- Video mở được bằng Windows default player.
- Recording 1 giây, 10 giây và 10 phút pass.
- Stop giữa chừng không corrupt output.

## Gate 7: Move Capture State To Rust

Owner: scanner state machine.

Steps:

1. Port `idle/countdown/recording/saving` sang Rust.
2. Route camera detections và manual input qua cùng state machine.
3. Implement same-code stop và different-code switch.
4. Implement close-window save-before-close.
5. Replace frontend capture state bằng native event rendering.

Acceptance:

- Happy paths H1-H4 pass.
- Switch cases S1-S6 pass.
- Stop/cancel cases C1-C4 pass.

## Gate 8: Remove Legacy Runtime

Owner: frontend cleanup.

Steps:

1. Remove browser camera hook khỏi scanner flow.
2. Remove browser recording hook khỏi scanner flow.
3. Remove old browser state-machine tests khi đã có native tests.
4. Remove compatibility exports.
5. Run repo checks.

Verification:

```text
pnpm run build
pnpm run test
pnpm run lint
cargo check --manifest-path src-tauri/Cargo.toml
```

## Gate 9: Windows Clean-Machine Acceptance

Steps:

1. Install app trên máy Windows sạch.
2. Confirm không cần Node/Rust/FFmpeg/ZBar/OpenCV install.
3. Scan QR và barcode đơn hàng thật.
4. Record 1 giây, 10 giây và 10 phút.
5. Confirm video mở bằng default player.
6. Check logs thấy bundled decoder và FFmpeg sidecars.
7. Ghi CPU/RAM/decode latency baseline.

Release chưa xong nếu gate này chưa pass.
