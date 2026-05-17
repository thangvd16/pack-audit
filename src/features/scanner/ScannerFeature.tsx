import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { type CaptureRecord, type CaptureSettings, useCaptureController } from "@/features/capture";
import { ScannerCapturePanel } from "./components/ScannerCapturePanel";
import { ScannerPermissionState } from "./components/ScannerPermissionState";
import { useCameraPreview } from "./hooks/useCameraPreview";
import { useCameras } from "./hooks/useCameras";

interface ScannerFeatureProps {
	settings: CaptureSettings;
	onRecordSaved?: (record: CaptureRecord) => void;
	onExitScanMode?: () => void;
}

export function ScannerFeature({ settings, onRecordSaved, onExitScanMode }: ScannerFeatureProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

	const { cameras, loading: cameraLoading, error: cameraError, initialized, refresh } = useCameras();
	const capture = useCaptureController({ videoRef, settings, onRecordSaved });
	const canExitScanMode = capture.state !== "recording" && capture.state !== "saving";

	useEffect(() => {
		if (!selectedCamera) return;
		if (cameras.length === 0) return;
		if (cameras.some((camera) => camera.deviceId === selectedCamera)) return;
		setSelectedCamera(null);
	}, [cameras, selectedCamera]);

	useEffect(() => {
		if (selectedCamera) return;
		if (cameras.length !== 1) return;
		setSelectedCamera(cameras[0].deviceId);
	}, [cameras, selectedCamera]);

	const handleCameraStreamEnded = useCallback(() => {
		const stateWhenEnded = capture.state;
		capture.handleCameraStreamEnded();
		setSelectedCamera(null);
		if (stateWhenEnded === "idle") {
			toast.error("Camera bị ngắt kết nối");
		}
		void refresh();
	}, [capture, refresh]);

	const { scanning, error: scanError } = useCameraPreview(videoRef, selectedCamera, handleCameraStreamEnded);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
			{onExitScanMode && (
				<div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold text-foreground">Chế độ quét</p>
						<p className="text-xs text-muted-foreground">Đang quét mã vạch và ghi video kiểm hàng</p>
					</div>
					<Button variant="outline" size="sm" onClick={onExitScanMode} disabled={!canExitScanMode}>
						<X className="size-4" />
						Thoát quét
					</Button>
				</div>
			)}

			{initialized ? (
				<ScannerCapturePanel
					videoRef={videoRef}
					scanning={scanning}
					selectedCamera={selectedCamera}
					cameras={cameras}
					cameraLoading={cameraLoading}
					cameraError={cameraError}
					onSelectCamera={setSelectedCamera}
					onRefresh={refresh}
					scanError={scanError}
					flash={false}
					capture={capture}
					cameraLocked={capture.state === "recording"}
				/>
			) : (
				<ScannerPermissionState cameraLoading={cameraLoading} cameraError={cameraError} onRefresh={refresh} />
			)}
		</div>
	);
}
