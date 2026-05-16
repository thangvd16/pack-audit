import { useCallback, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CameraSelector } from "./components/CameraSelector";
import { LastScanCard } from "./components/LastScanCard";
import { ScanHistoryPanel } from "./components/ScanHistoryPanel";
import { ScannerPermissionState } from "./components/ScannerPermissionState";
import { ScannerPreview } from "./components/ScannerPreview";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { useCameras } from "./hooks/useCameras";
import type { ScanResult } from "./types";

export function ScannerFeature() {
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

	const handleClearHistory = useCallback(() => {
		setScanHistory([]);
		setLastScan(null);
	}, []);

	const { scanning, error: scanError } = useBarcodeScanner(videoRef, selectedCamera, handleScan);

	if (!initialized) {
		return <ScannerPermissionState cameraLoading={cameraLoading} cameraError={cameraError} onRefresh={refresh} />;
	}

	return (
		<div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="mb-1 flex items-center justify-between">
					<p className="text-xs text-muted-foreground">Camera trực tiếp</p>
					<Badge variant={scanning ? "default" : "secondary"} className="gap-1.5 text-[10px]">
						<span className={cn("h-1.5 w-1.5 rounded-full", scanning ? "animate-pulse bg-green-400" : "bg-muted-foreground")} />
						{scanning ? "Đang quét" : "Chờ camera"}
					</Badge>
				</div>

				<ScannerPreview videoRef={videoRef} scanning={scanning} selectedCamera={selectedCamera} scanError={scanError} flash={flash} />

				{scanError && (
					<Alert variant="destructive">
						<AlertCircle size={16} />
						<AlertDescription>{scanError}</AlertDescription>
					</Alert>
				)}

				<LastScanCard lastScan={lastScan} flash={flash} />
			</div>

			<div className="flex w-72 shrink-0 flex-col gap-3">
				<CameraSelector
					cameras={cameras}
					cameraLoading={cameraLoading}
					cameraError={cameraError}
					selectedCamera={selectedCamera}
					onSelectCamera={setSelectedCamera}
					onRefresh={refresh}
				/>
				<ScanHistoryPanel scanHistory={scanHistory} onClearHistory={handleClearHistory} />
			</div>
		</div>
	);
}
