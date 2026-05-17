import { Loader2, Radio, ScanLine, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CaptureState } from "../types";
import type { ConfirmedBarcode } from "../hooks/useStableBarcode";

interface CaptureStatusBarProps {
	state: CaptureState;
	activeBarcode: ConfirmedBarcode | null;
	countdownRemainingMs: number;
	recordingElapsedMs: number;
	maxRecordingMs: number;
	closeAfterSaveRequested?: boolean;
}

export function CaptureStatusBar({
	state,
	activeBarcode,
	countdownRemainingMs,
	recordingElapsedMs,
	maxRecordingMs,
	closeAfterSaveRequested = false,
}: CaptureStatusBarProps) {
	const remainingRecordingMs = Math.max(0, maxRecordingMs - recordingElapsedMs);
	const isNearLimit = state === "recording" && remainingRecordingMs <= 60_000;

	return (
		<div className="overflow-hidden rounded-lg border bg-card">
			<div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2">
				<div className="flex min-w-0 items-center gap-2">
					<StatusIcon state={state} isNearLimit={isNearLimit} />
					<div className="min-w-0">
						<p className="text-xs font-medium">{closeAfterSaveRequested ? "Đang lưu trước khi đóng" : statusLabel(state)}</p>
						<p className="truncate font-mono text-xs text-muted-foreground">{activeBarcode ? activeBarcode.text : "Chưa có mã đang xử lý"}</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					{state === "countdown" && (
						<Badge variant="secondary" className="font-mono">
							{Math.ceil(countdownRemainingMs / 1000)}s
						</Badge>
					)}
					{state === "recording" && (
						<Badge variant={isNearLimit ? "destructive" : "secondary"} className="font-mono">
							{formatDuration(recordingElapsedMs)}
						</Badge>
					)}
					{state === "saving" && (
						<Badge variant="secondary" className="gap-1 font-mono">
							<Loader2 size={12} className="animate-spin" />
							lưu
						</Badge>
					)}
				</div>
			</div>
			{closeAfterSaveRequested && (
				<div className="h-1 bg-muted">
					<div className="h-full w-2/3 animate-pulse bg-primary" />
				</div>
			)}
		</div>
	);
}

function StatusIcon({ state, isNearLimit }: { state: CaptureState; isNearLimit: boolean }) {
	const className = cn("size-4 shrink-0", isNearLimit ? "text-destructive" : state === "recording" ? "text-green-500" : "text-muted-foreground");
	if (state === "recording") return <Radio className={className} />;
	if (state === "countdown") return <Timer className={className} />;
	if (state === "saving") return <Loader2 className={cn(className, "animate-spin")} />;
	return <ScanLine className={className} />;
}

function statusLabel(state: CaptureState) {
	if (state === "countdown") return "Chuẩn bị ghi hình";
	if (state === "recording") return "Đang ghi hình";
	if (state === "saving") return "Đang lưu bản ghi";
	return "Sẵn sàng";
}

function formatDuration(ms: number) {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60)
		.toString()
		.padStart(2, "0");
	const seconds = (totalSeconds % 60).toString().padStart(2, "0");
	return `${minutes}:${seconds}`;
}
