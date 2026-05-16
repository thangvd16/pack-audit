import { AlertCircle, Camera, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CameraDevice } from "../types";

interface CameraSelectorProps {
	cameras: CameraDevice[];
	cameraLoading: boolean;
	cameraError: string | null;
	selectedCamera: string | null;
	onSelectCamera: (deviceId: string) => void;
	onRefresh: () => void;
}

export function CameraSelector({ cameras, cameraLoading, cameraError, selectedCamera, onSelectCamera, onRefresh }: CameraSelectorProps) {
	return (
		<Card>
			<CardHeader className="px-4 pb-2 pt-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Camera</CardTitle>
					<Tooltip>
						<TooltipTrigger
							className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
							onClick={onRefresh}
							disabled={cameraLoading}
						>
							<RefreshCw size={13} className={cameraLoading ? "animate-spin" : ""} />
						</TooltipTrigger>
						<TooltipContent>Làm mới danh sách camera</TooltipContent>
					</Tooltip>
				</div>
			</CardHeader>
			<CardContent className="space-y-2 px-4 pb-4">
				{cameraError && (
					<Alert variant="destructive" className="py-2">
						<AlertCircle size={13} />
						<AlertDescription className="text-xs">{cameraError}</AlertDescription>
					</Alert>
				)}

				{cameraLoading && (
					<div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
						<RefreshCw size={13} className="animate-spin" />
						Đang tìm camera...
					</div>
				)}

				{!cameraLoading && cameras.length === 0 && !cameraError && (
					<p className="py-2 text-center text-xs text-muted-foreground/60">Không tìm thấy camera nào</p>
				)}

				<div className="space-y-1.5">
					{cameras.map((camera) => (
						<Button
							key={camera.deviceId}
							variant={selectedCamera === camera.deviceId ? "default" : "secondary"}
							size="sm"
							className="h-9 w-full justify-start gap-2"
							onClick={() => onSelectCamera(camera.deviceId)}
						>
							<Camera size={13} className="shrink-0" />
							<span className="truncate text-xs">{camera.label}</span>
						</Button>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
