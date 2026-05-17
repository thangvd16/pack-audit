import { AlertCircle, Camera, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CameraDevice } from "../types";

interface CameraSelectorProps {
	cameras: CameraDevice[];
	cameraLoading: boolean;
	cameraError: string | null;
	selectedCamera: string | null;
	onSelectCamera: (deviceId: string) => void;
	onRefresh: () => void;
	cameraLocked: boolean;
}

export function CameraSelector({ cameras, cameraLoading, cameraError, selectedCamera, onSelectCamera, onRefresh, cameraLocked }: CameraSelectorProps) {
	if (!cameraLoading && !cameraError && cameras.length <= 1) {
		return null;
	}

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
			<div className="flex min-w-0 items-center gap-2">
				<Tooltip>
					<TooltipTrigger
						render={
							<Button variant="ghost" size="icon-sm" onClick={onRefresh} disabled={cameraLoading} aria-label="Làm mới danh sách camera">
								<RefreshCw size={13} className={cameraLoading ? "animate-spin" : ""} />
							</Button>
						}
					/>
					<TooltipContent>Làm mới danh sách camera</TooltipContent>
				</Tooltip>
				<div className="min-w-0 text-xs text-muted-foreground">{cameraLoading ? "Đang tìm camera" : `${cameras.length} camera`}</div>
			</div>

			<div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
				{cameraError && (
					<Alert variant="destructive" className="py-2">
						<AlertCircle size={13} />
						<AlertDescription className="text-xs">{cameraError}</AlertDescription>
					</Alert>
				)}

				{cameraLoading && (
					<div className="flex shrink-0 items-center gap-2 py-1 text-xs text-muted-foreground">
						<RefreshCw size={13} className="animate-spin" />
						Đang tìm camera...
					</div>
				)}

				{!cameraLoading && cameras.length === 0 && !cameraError && <p className="py-1 text-xs text-muted-foreground/60">Không tìm thấy camera</p>}

				{cameras.map((camera) => (
					<CameraOption
						key={camera.deviceId}
						camera={camera}
						selected={selectedCamera === camera.deviceId}
						cameraLocked={cameraLocked}
						onSelectCamera={onSelectCamera}
					/>
				))}
			</div>
		</div>
	);
}

function CameraOption({
	camera,
	selected,
	cameraLocked,
	onSelectCamera,
}: {
	camera: CameraDevice;
	selected: boolean;
	cameraLocked: boolean;
	onSelectCamera: (deviceId: string) => void;
}) {
	const button = (
		<Button
			variant={selected ? "default" : "secondary"}
			size="sm"
			className="h-7 max-w-56 justify-start gap-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
			aria-disabled={cameraLocked}
			onClick={() => {
				if (cameraLocked) return;
				onSelectCamera(camera.deviceId);
			}}
		>
			<Camera size={13} className="shrink-0" />
			<span className="truncate text-xs">{camera.label}</span>
		</Button>
	);

	if (!cameraLocked) return button;

	return (
		<Tooltip>
			<TooltipTrigger render={button} />
			<TooltipContent>Đang ghi hình</TooltipContent>
		</Tooltip>
	);
}
