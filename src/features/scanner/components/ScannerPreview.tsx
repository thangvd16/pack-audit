import type { RefObject } from "react";
import { CameraOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScannerPreviewProps {
	videoRef: RefObject<HTMLVideoElement | null>;
	scanning: boolean;
	selectedCamera: string | null;
	scanError: string | null;
	flash: boolean;
	fill?: boolean;
}

export function ScannerPreview({ videoRef, scanning, selectedCamera, scanError, flash, fill = false }: ScannerPreviewProps) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-lg border bg-card transition-colors duration-300",
				fill && "h-full min-h-0",
				flash ? "border-emerald-400" : scanning ? "border-primary/40" : "border-border",
			)}
			style={fill ? undefined : { aspectRatio: "16/9" }}
		>
			<video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />

			{!scanning && !selectedCamera && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
					<CameraOff size={44} className="text-muted-foreground/30" />
					<p className="text-sm text-muted-foreground">Chọn camera từ danh sách bên phải</p>
				</div>
			)}

			{!scanning && selectedCamera && !scanError && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/70">
					<RefreshCw size={28} className="animate-spin text-primary" />
					<p className="text-sm text-primary">Đang khởi động camera...</p>
				</div>
			)}

			{scanning && (
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute left-5 right-5 h-px animate-scan-line bg-emerald-400/80 shadow-sm shadow-emerald-400" />
					<div className="absolute left-4 top-4 h-6 w-6 rounded-tl-sm border-l-2 border-t-2 border-emerald-400" />
					<div className="absolute right-4 top-4 h-6 w-6 rounded-tr-sm border-r-2 border-t-2 border-emerald-400" />
					<div className="absolute bottom-4 left-4 h-6 w-6 rounded-bl-sm border-b-2 border-l-2 border-emerald-400" />
					<div className="absolute bottom-4 right-4 h-6 w-6 rounded-br-sm border-b-2 border-r-2 border-emerald-400" />
				</div>
			)}

			{flash && <div className="pointer-events-none absolute inset-0 animate-flash bg-emerald-400/10" />}
		</div>
	);
}
