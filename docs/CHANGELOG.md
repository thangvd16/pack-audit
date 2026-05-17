# Pack Audit Changelog

## 2026-05-17

### Documentation

- Tổ chức lại docs thành `README.md`, `RULES.md`, `ROADMAP.md`, `PLAN.md`, `CHANGELOG.md`.
- Xóa các planning docs cũ đang trộn rules, roadmap, implementation steps và dependency notes.
- Thêm Windows-first build/release rules làm hướng delivery chính.
- Ghi rõ gate tiếp theo: build và publish Windows decoder binary trước khi làm native camera/FFmpeg.

### Native Scanner Direction

- Chốt native scanner pipeline:

```text
Rust camera engine -> ZBar decoder sidecar -> FFmpeg recorder sidecar -> Tauri events -> React UI
```

- React chỉ render state và gửi commands, không sở hữu camera/decoder/recording runtime.
- Browser decoder và browser recording là legacy runtime, không mở rộng thêm.

### Decoder Sidecar

- Chuẩn hóa custom `pack-audit-decoder` sidecar linked với ZBar core.
- Runtime không dùng `zbarcam` và không spawn `zbarimg` theo frame.
- Tách decoder build template thành workflow macOS và Windows riêng.
- macOS decoder workflow dùng Homebrew `zbar` và `ninja` cho dev binary.
- Windows decoder workflow dùng MSVC và vcpkg overlay triplet `x64-windows-dynamic-staticcrt`.
- Thêm Windows recursive `dumpbin /dependents` check để bắt DLL non-system còn thiếu trong artifact.
- Cập nhật decoder C++ template sang public `zbar_processor_t` và `zbar_process_image` API.
- Chốt macOS Homebrew ZBar chỉ là dev path, không thay thế Windows release verification.
- Thêm hướng build/package FFmpeg Windows sidecar bằng LGPL build.
- App repo có `pnpm sidecars:fetch` để tải sidecar release `thangvd16/decorder-sidecar@v0.2.1` trước Windows Tauri build.
- Tauri Windows config bundle `pack-audit-decoder`, `ffmpeg` và ZBar runtime DLLs qua `externalBin`/`resources` mà không phá `cargo check` trên macOS.
- Docs ghi rõ local macOS smoke build dùng `pnpm tauri build --debug --bundles app`; Windows installer vẫn là release gate trên CI Windows.
- `scripts/release.sh` kiểm tra working tree sạch, chạy local quality gates, commit version bump và push tag `v*` để test Windows release build trên GitHub Actions.

### Dependency Scope

- Gỡ browser decoder cũ khỏi project docs và runtime dependency strategy.
- Scope ZBar mặc định: `Code128`, `GS1-128`, `QR`, `EAN/UPC`, `Code39`, `Code93`, `Codabar`, `ITF`.
- `DataMatrix`, `PDF417`, `Aztec`, `Micro QR`, `rMQR`, `GS1 DataBar` nằm ngoài scope ZBar mặc định.

### Verification Notes

- Docs và workflow YAML đã được kiểm tra local.
- Decoder Windows build vẫn cần được verify bằng GitHub Actions thật với dependency `mchehab-zbar`.
- App release cuối vẫn cần Windows clean-machine smoke test.
