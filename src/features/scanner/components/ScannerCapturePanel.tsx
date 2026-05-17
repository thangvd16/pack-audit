import type { RefObject } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CaptureControls, type CaptureState } from "@/features/capture";
import type { CameraDevice } from "../types";
import { CameraSelector } from "./CameraSelector";
import { ScannerPreview } from "./ScannerPreview";

interface CapturePanelState {
	state: CaptureState;
	captureError: string | null;
	submitManualBarcode: (barcode: string) => void;
	stopRecording: () => void;
	cancelCountdown: () => void;
}

interface ScannerCapturePanelProps {
	videoRef: RefObject<HTMLVideoElement | null>;
	scanning: boolean;
	selectedCamera: string | null;
	cameras: CameraDevice[];
	cameraLoading: boolean;
	cameraError: string | null;
	onSelectCamera: (deviceId: string) => void;
	onRefresh: () => void;
	scanError: string | null;
	flash: boolean;
	capture: CapturePanelState;
	cameraLocked: boolean;
}

export function ScannerCapturePanel({
	videoRef,
	scanning,
	selectedCamera,
	cameras,
	cameraLoading,
	cameraError,
	onSelectCamera,
	onRefresh,
	scanError,
	flash,
	capture,
	cameraLocked,
}: ScannerCapturePanelProps) {
	const showCameraSelector = cameraLoading || !!cameraError || cameras.length > 1;

	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
			<div className="flex shrink-0 flex-col gap-2 border-b px-2 py-1.5 lg:flex-row lg:items-center">
				<CaptureControls
					state={capture.state}
					onManualSubmit={capture.submitManualBarcode}
					onStopRecording={capture.stopRecording}
					onCancelCountdown={capture.cancelCountdown}
					className="min-h-8 flex-1"
				/>
				{showCameraSelector && (
					<CameraSelector
						cameras={cameras}
						cameraLoading={cameraLoading}
						cameraError={cameraError}
						selectedCamera={selectedCamera}
						onSelectCamera={onSelectCamera}
						onRefresh={onRefresh}
						cameraLocked={cameraLocked}
					/>
				)}
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
				<div className="min-h-0 flex-1">
					<ScannerPreview videoRef={videoRef} scanning={scanning} selectedCamera={selectedCamera} scanError={scanError} flash={flash} fill />
				</div>

				{scanError && (
					<Alert variant="destructive" className="shrink-0">
						<AlertCircle size={16} />
						<AlertDescription>{scanError}</AlertDescription>
					</Alert>
				)}

				{capture.captureError && (
					<Alert variant="destructive" className="shrink-0">
						<AlertCircle size={16} />
						<AlertDescription>{capture.captureError}</AlertDescription>
					</Alert>
				)}
			</div>
		</section>
	);
}
