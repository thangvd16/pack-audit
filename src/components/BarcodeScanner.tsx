import { useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Trash2,
  VideoIcon,
} from "lucide-react";
import { useCameras } from "@/hooks/useCameras";
import { useBarcodeScanner, type ScanResult } from "@/hooks/useBarcodeScanner";

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [flash, setFlash] = useState(false);

  const { cameras, loading: cameraLoading, error: cameraError, initialized, refresh } = useCameras();

  const handleScan = useCallback((result: ScanResult) => {
    setLastScan(result);
    setScanHistory((prev) => [result, ...prev].slice(0, 100));
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  }, []);

  const { scanning, error: scanError } = useBarcodeScanner(
    videoRef,
    selectedCamera,
    handleScan
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-8 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-blue-600/20 border border-blue-600/40 rounded-2xl flex items-center justify-center">
            <VideoIcon size={36} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pack Audit</h1>
            <p className="text-gray-500 mt-2 text-sm max-w-xs">
              Ghi hình quá trình đóng gói đơn hàng bằng cách quét mã vạch
            </p>
          </div>
        </div>

        {cameraLoading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={28} className="text-blue-400 animate-spin" />
            <p className="text-gray-400 text-sm">Đang yêu cầu quyền camera...</p>
            <p className="text-gray-600 text-xs max-w-xs text-center">
              Hãy cho phép truy cập camera nếu có hộp thoại xuất hiện
            </p>
          </div>
        ) : (
          <button
            onClick={refresh}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-base transition-all active:scale-95 shadow-lg shadow-blue-600/30"
          >
            <Camera size={20} />
            Tìm Camera
          </button>
        )}

        {cameraError && (
          <div className="max-w-sm w-full flex items-start gap-3 text-red-400 text-sm p-4 bg-red-400/10 border border-red-400/20 rounded-xl">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Không thể truy cập camera</p>
              <p className="text-xs text-red-300/80">{cameraError}</p>
              <button
                onClick={refresh}
                className="mt-3 text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <ScanLine size={15} />
          </div>
          <span className="font-bold tracking-tight">Pack Audit</span>
          <span className="text-xs text-gray-600 font-mono">v0.1.0</span>
        </div>

        <div className="flex items-center gap-2">
          {scanning ? (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Đang quét
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
              Chờ camera
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 gap-4 p-4 min-h-0">
        {/* Left: Camera Preview */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Video */}
          <div
            className={`relative rounded-xl overflow-hidden bg-gray-900 border-2 transition-colors duration-300 ${
              flash
                ? "border-green-400 shadow-lg shadow-green-400/20"
                : scanning
                  ? "border-blue-600/40"
                  : "border-gray-800"
            }`}
            style={{ aspectRatio: "16/9" }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Overlay khi chưa có camera */}
            {!scanning && !selectedCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900">
                <CameraOff size={44} className="text-gray-700" />
                <p className="text-gray-500 text-sm">
                  Chọn camera từ danh sách bên phải
                </p>
              </div>
            )}

            {/* Overlay đang khởi động */}
            {!scanning && selectedCamera && !scanError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/70">
                <RefreshCw size={28} className="text-blue-400 animate-spin" />
                <p className="text-blue-400 text-sm">Đang khởi động camera...</p>
              </div>
            )}

            {/* Scanning overlay */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-5 right-5 h-px bg-green-400/80 animate-scan-line shadow-sm shadow-green-400" />
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-green-400 rounded-tl-sm" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-green-400 rounded-tr-sm" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-green-400 rounded-bl-sm" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-green-400 rounded-br-sm" />
              </div>
            )}

            {/* Flash effect */}
            {flash && (
              <div className="absolute inset-0 bg-green-400/10 pointer-events-none animate-flash" />
            )}
          </div>

          {/* Scan error */}
          {scanError && (
            <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 border border-red-400/20 rounded-xl">
              <AlertCircle size={16} className="shrink-0" />
              {scanError}
            </div>
          )}

          {/* Last scan result */}
          {lastScan ? (
            <div
              className={`rounded-xl p-4 border transition-all duration-300 ${
                flash
                  ? "border-green-400/60 bg-green-400/10"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="text-green-400 mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Barcode vừa quét</p>
                  <p className="text-xl font-mono font-bold text-white break-all leading-tight">
                    {lastScan.text}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    <span className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                      {lastScan.format}
                    </span>{" "}
                    · {formatTime(lastScan.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4 border border-dashed border-gray-800 flex items-center gap-3">
              <ScanLine size={18} className="text-gray-700 shrink-0" />
              <p className="text-gray-600 text-sm">
                Chưa có barcode nào — hướng camera vào mã vạch
              </p>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="w-72 flex flex-col gap-3 shrink-0">
          {/* Camera selector */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Camera
              </h2>
              <button
                onClick={refresh}
                disabled={cameraLoading}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-40"
                title="Làm mới danh sách camera"
              >
                <RefreshCw
                  size={13}
                  className={cameraLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {cameraError && (
              <div className="flex items-start gap-2 text-red-400 text-xs p-2.5 bg-red-400/10 rounded-lg border border-red-400/20 mb-3">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {cameraLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
                <RefreshCw size={13} className="animate-spin" />
                Đang tìm camera...
              </div>
            )}

            {!cameraLoading && cameras.length === 0 && !cameraError && (
              <p className="text-gray-600 text-xs text-center py-3">
                Không tìm thấy camera nào
              </p>
            )}

            <div className="space-y-1.5">
              {cameras.map((cam) => (
                <button
                  key={cam.deviceId}
                  onClick={() => setSelectedCamera(cam.deviceId)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                    selectedCamera === cam.deviceId
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Camera size={13} className="shrink-0" />
                  <span className="truncate text-xs">{cam.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scan history */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Lịch sử quét
              </h2>
              <div className="flex items-center gap-2">
                {scanHistory.length > 0 && (
                  <span className="text-xs text-gray-600">
                    {scanHistory.length}
                  </span>
                )}
                {scanHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setScanHistory([]);
                      setLastScan(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-600 hover:text-red-400 transition-colors"
                    title="Xóa lịch sử"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {scanHistory.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-700 text-xs text-center">
                  Chưa có lần quét nào
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto flex-1">
                {scanHistory.map((item, i) => (
                  <div
                    key={`${item.text}-${item.timestamp}`}
                    className={`px-3 py-2 rounded-lg ${
                      i === 0
                        ? "bg-green-400/10 border border-green-400/25"
                        : "bg-gray-800/60"
                    }`}
                  >
                    <p className="font-mono text-xs text-white truncate">
                      {item.text}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {item.format} · {formatTime(item.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
