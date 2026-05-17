# Pack Audit

Desktop app kiểm hàng bằng mã vạch — tự động ghi video bằng chứng khi scan barcode/QR.

Xem [`docs/README.md`](docs/README.md) để hiểu kiến trúc, quy tắc build và thứ tự triển khai.

## Dev setup

```bash
pnpm install
pnpm tauri dev
```

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Tauri 2 + Rust + SQLite
- **Scanner**: Native Rust camera engine + ZBar decoder sidecar + FFmpeg recorder sidecar
