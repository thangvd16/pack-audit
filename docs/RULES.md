# Pack Audit Rules

## Quy tắc sản phẩm

- Pack Audit là desktop app cho nhân viên cửa hàng scan barcode kiện hàng và ghi video bằng chứng.
- Workspace là màn hình mặc định.
- App không tự mở camera khi launch.
- Scan mode chỉ bắt đầu khi người dùng bấm `Bắt đầu quét`.
- Sau khi lưu record, app ở lại scan mode để quét liên tục.
- Nhân viên phải nhập mã thủ công được bằng bàn phím khi camera decode không dùng được.

## Quy tắc Windows-first

- Windows là target release đầu tiên.
- Windows release chỉ đạt khi chạy được trên máy sạch không cài Node, Rust, FFmpeg, ZBar, OpenCV hoặc developer tools.
- macOS chỉ là dev/test target cho UI, Tauri contract, Rust state machine và decoder protocol.
- macOS pass không thay thế Windows verification.
- Linux chưa thuộc release scope hiện tại.

## Quy tắc native binary

- FFmpeg được bundle như Tauri sidecar để ghi video.
- ZBar core được bundle qua custom decoder sidecar tên `pack-audit-decoder`.
- Runtime không dùng `zbarcam` để giữ camera.
- Runtime không spawn `zbarimg` cho từng frame.
- Kiến trúc mặc định không dùng OpenCV.
- Windows app bundle bắt buộc có:

```text
src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe
src-tauri/binaries/pack-audit-decoder-x86_64-pc-windows-msvc.exe
src-tauri/binaries/zbar-0.dll
src-tauri/binaries/iconv-2.dll
```

- macOS dev Apple Silicon có thể cần thêm:

```text
src-tauri/binaries/ffmpeg-aarch64-apple-darwin
src-tauri/binaries/pack-audit-decoder-aarch64-apple-darwin
```

- Tauri sidecar config Windows dùng base name, không ghi target suffix:

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

- Không đặt Windows `externalBin` trong `src-tauri/tauri.conf.json`, vì Tauri sẽ kiểm tra sidecar theo target hiện tại và làm hỏng `cargo check` trên macOS dev.
- Local macOS smoke build dùng `pnpm tauri build --debug --bundles app`; Windows installer/release build chỉ đạt qua GitHub Actions Windows và test trên Windows clean machine.

## Quy tắc decoder

- Source template của decoder là `docs/zbar-decoder-sidecar-template/`.
- Build decoder binary một lần cho mỗi platform, architecture và decoder version.
- Chỉ build lại decoder khi đổi source decoder, protocol stdin/stdout, version ZBar, vcpkg baseline, platform hoặc architecture.
- Windows decoder build dùng GitHub Actions Windows với MSVC và vcpkg overlay triplet `x64-windows-dynamic-staticcrt`.
- macOS decoder build dùng Homebrew `zbar` và `ninja` để lấy dev binary.
- Dev trên macOS được dùng Homebrew `zbar` để tiết kiệm thời gian lặp UI/Rust/protocol.
- macOS Homebrew ZBar không được dùng làm bằng chứng release Windows.
- Windows decoder dùng **dynamic bundle**: `zbar-0.dll` và các DLL runtime ZBar được copy vào `dist/` kèm `.exe`.
- Overlay triplet giữ ZBar là DLL nhưng link CRT static để giảm rủi ro máy Windows sạch thiếu MSVC runtime.
- Windows decoder workflow phải xác nhận ZBar DLL có mặt trong artifact trước khi upload.
- Windows decoder workflow dùng `dumpbin /dependents` đệ quy để check mọi DLL non-system mà `.exe` hoặc `.dll` phụ thuộc đều đã có trong `dist/`.
- Windows FFmpeg sidecar dùng LGPL Windows build được package thành `ffmpeg-x86_64-pc-windows-msvc.exe`.
- Không dùng FFmpeg GPL/nonfree build trừ khi đã chốt lại license obligation cho toàn bộ product.
- App repo tải sidecars bằng `pnpm sidecars:fetch` từ release `thangvd16/decorder-sidecar@v0.2.1`.
- Không commit `.exe` hoặc `.dll` sidecar vào app repo.
- Decoder sidecar chạy dài hạn bằng stdin/stdout:

```text
FRAME <width> <height> <byte_length>\n
<grayscale bytes>
```

- Decoder trả một JSON line cho mỗi frame:

```json
{"results":[{"text":"...","format":"CODE-128","timestamp":1778990000000}],"timestamp":1778990000000}
```

- Scope ZBar mặc định: `Code128`, `GS1-128`, `QR`, `EAN-13`, `EAN-8`, `UPC-A`, `UPC-E`, `Code39`, `Code93`, `Codabar`, `ITF`.
- `DataMatrix`, `PDF417`, `Aztec`, `Micro QR`, `rMQR`, `GS1 DataBar` nằm ngoài scope mặc định. Nếu fixture thật cần các format này, phải chọn decoder bổ sung hoặc đổi engine trước release.

## Quy tắc scanner runtime

- Rust sở hữu camera access, frame queue, decode scheduling, recording scheduling và scanner state.
- React chỉ render state và gửi command.
- React không sở hữu camera, decode hoặc recording runtime trong native flow cuối.
- Preview gửi về React phải throttle khoảng 10-15 FPS.
- Preview phải drop frame khi UI chậm, không queue vô hạn.
- Decoder sidecar spawn một lần mỗi scan session, không spawn theo frame.
- Decoder crash phải trả typed scanner error và được Rust xử lý.
- Sau khi native replacement hoàn tất, không giữ import tương thích cho browser runtime cũ.

## Quy tắc capture state

State machine mục tiêu:

```text
idle -> countdown -> recording -> saving -> idle
```

- `idle`: camera đang chạy, chưa có mã ổn định.
- `countdown`: mã đã ổn định, đã phát start sound, đang đếm ngược.
- `recording`: FFmpeg đang ghi video.
- `saving`: đang persist video và DB record.

Stop trigger khi đang `recording`:

- Scan lại cùng mã.
- Bấm Stop.
- Scan mã khác.
- Đóng app window.

Behavior:

- Mã phải ổn định trước khi countdown.
- Countdown mặc định 2 giây.
- Recording tối thiểu 1 giây.
- Recording tối đa 10 phút.
- Video dưới 1 giây bị discard và hiển thị warning.
- Đóng app khi recording phải save-before-close nếu còn khả thi.
- Manual input đi qua cùng state machine với camera detection.

## Quy tắc dữ liệu

- SQLite là local storage.
- Core tables: `users`, `sessions`, `records`, `settings`.
- Record tối thiểu có session, barcode, format, scanned time, video path và video duration.
- Session có thể auto-create theo user/ngày để giảm thao tác cho nhân viên.
- Manual session naming để sau nếu workflow thật cần phân lô/batch.

## Quy tắc verification

Các check tối thiểu trước khi nói một thay đổi scanner/release đã xong:

```text
pnpm run build
pnpm run test
pnpm run lint
cargo check --manifest-path src-tauri/Cargo.toml
```

Các gate ngoài local:

- Decoder GitHub Actions build cho target platform.
- Decoder smoke test bằng `fixtures/sample.pgm`.
- Windows clean-machine smoke test cho release cuối.

Windows acceptance thủ công:

- App launch trên máy Windows sạch.
- Scan mode mở được camera.
- QR và barcode đơn hàng thật decode được.
- Recording 1 giây, 10 giây và 10 phút hoạt động.
- Video mở được bằng Windows default player.
- Log chứng minh app dùng FFmpeg và decoder sidecar trong bundle.

## Quy tắc LGPL compliance

ZBar core (`mchehab-zbar`) được cấp phép theo **LGPL-2.1**. Pack Audit dùng hướng **dynamic bundle** (đã chốt):

- `zbar-0.dll` được ship kèm app installer.
- Người dùng có thể thay `zbar-0.dll` bằng phiên bản tương thích mà không cần relink hoặc rebuild app.
- Ghi rõ phiên bản ZBar được bundle trong installer và release notes.
- Giữ bản sao `LICENSE` của ZBar trong thư mục dự án hoặc trong installer.

Không release Windows build trước khi `zbar-0.dll` được xác nhận trong artifact và release notes ghi rõ nguồn ZBar.

FFmpeg sidecar mặc định dùng LGPL Windows build:

- Workflow phải ghi `Archive URL` và `Archive SHA-256` vào artifact.
- Release notes phải ghi rõ nguồn FFmpeg và link legal notes.
- Không dùng GPL hoặc nonfree FFmpeg build nếu chưa có quyết định license riêng.

## Source references

- Tauri sidecars: https://v2.tauri.app/develop/sidecar/
- FFmpeg legal notes: https://www.ffmpeg.org/legal.html
- FFmpeg download page: https://ffmpeg.org/download.html
- BtbN FFmpeg Builds: https://github.com/BtbN/FFmpeg-Builds
- ZBar repository: https://github.com/mchehab/zbar
- ZBar vcpkg port: https://vcpkg.roundtrip.dev/ports/mchehab-zbar
