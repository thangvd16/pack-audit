import { AlertCircle, Camera, RefreshCw, VideoIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ScannerPermissionStateProps {
	cameraLoading: boolean;
	cameraError: string | null;
	onRefresh: () => void;
}

export function ScannerPermissionState({ cameraLoading, cameraError, onRefresh }: ScannerPermissionStateProps) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
			<div className="flex flex-col items-center gap-4 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
					<VideoIcon size={28} className="text-primary" />
				</div>
				<p className="max-w-xs text-sm text-muted-foreground">Cần cấp quyền truy cập camera để bắt đầu quét mã vạch</p>
			</div>

			{cameraLoading ? (
				<div className="flex flex-col items-center gap-3">
					<RefreshCw size={24} className="animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">Đang yêu cầu quyền camera...</p>
					<p className="max-w-xs text-center text-xs text-muted-foreground/60">Hãy cho phép truy cập camera nếu có hộp thoại xuất hiện</p>
				</div>
			) : (
				<Button size="lg" onClick={onRefresh} className="gap-2 px-8">
					<Camera size={16} />
					Tìm Camera
				</Button>
			)}

			{cameraError && (
				<Alert variant="destructive" className="max-w-sm">
					<AlertCircle size={16} />
					<AlertDescription>
						<p className="mb-1 font-medium">Không thể truy cập camera</p>
						<p className="text-xs opacity-80">{cameraError}</p>
						<button onClick={onRefresh} className="mt-2 text-xs underline underline-offset-2 hover:opacity-80">
							Thử lại
						</button>
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
