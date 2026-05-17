import { useCallback, useEffect, useState } from "react";
import { AlertCircle, PackageSearch, RefreshCw, ScanLine } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type CaptureRecord, type CaptureSettings, listRecentRecords, RECENT_RECORDS_LIMIT } from "@/features/capture";
import { RecentRecordsList } from "@/features/capture-workspace";
import { ScannerFeature } from "@/features/scanner";

interface CaptureWorkspacePageProps {
	captureSettings: CaptureSettings;
	onScanModeChange?: (active: boolean) => void;
}

type WorkspaceMode = "workspace" | "scan";

function normalizeWorkspaceError(error: unknown) {
	return error instanceof Error ? error.message : "Không thể tải bản ghi gần đây";
}

function prependRecentRecord(records: CaptureRecord[], record: CaptureRecord) {
	return [record, ...records.filter((currentRecord) => currentRecord.id !== record.id)].slice(0, RECENT_RECORDS_LIMIT);
}

function WorkspaceLoading() {
	return (
		<div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-4/5" />
		</div>
	);
}

function WorkspaceEmpty() {
	return (
		<section className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border bg-card p-6 text-center">
			<div className="flex size-11 items-center justify-center rounded-lg border bg-muted">
				<PackageSearch className="size-5 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<h2 className="text-sm font-semibold text-foreground">Chưa có bản ghi</h2>
				<p className="max-w-sm text-xs text-muted-foreground">Bắt đầu quét để lưu bản ghi kiểm hàng đầu tiên trong phiên làm việc.</p>
			</div>
		</section>
	);
}

export function CaptureWorkspacePage({ captureSettings, onScanModeChange }: CaptureWorkspacePageProps) {
	const [mode, setMode] = useState<WorkspaceMode>("workspace");
	const [records, setRecords] = useState<CaptureRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadRecentRecords = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const nextRecords = await listRecentRecords();
			setRecords(nextRecords);
		} catch (loadError) {
			setError(normalizeWorkspaceError(loadError));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadRecentRecords();
	}, [loadRecentRecords]);

	useEffect(() => {
		onScanModeChange?.(mode === "scan");
	}, [mode, onScanModeChange]);

	useEffect(() => {
		return () => onScanModeChange?.(false);
	}, [onScanModeChange]);

	const handleRecordSaved = useCallback((record: CaptureRecord) => {
		setRecords((currentRecords) => prependRecentRecord(currentRecords, record));
	}, []);

	if (mode === "scan") {
		return (
			<div className="flex min-h-0 flex-1 flex-col bg-background">
				<ScannerFeature settings={captureSettings} onRecordSaved={handleRecordSaved} onExitScanMode={() => setMode("workspace")} />
			</div>
		);
	}

	const showInitialLoading = loading && records.length === 0;
	const showInitialError = !!error && records.length === 0;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-5">
			<section className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
				<div className="space-y-1">
					<h1 className="text-lg font-semibold tracking-tight text-foreground">Không gian kiểm hàng</h1>
					<p className="max-w-2xl text-sm text-muted-foreground">Xem 20 bản ghi mới nhất và vào chế độ quét khi cần quét mã vạch.</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button variant="outline" onClick={loadRecentRecords} disabled={loading}>
						<RefreshCw className={loading ? "animate-spin" : undefined} />
						Làm mới
					</Button>
					<Button onClick={() => setMode("scan")}>
						<ScanLine />
						Bắt đầu quét
					</Button>
				</div>
			</section>

			{showInitialLoading ? (
				<WorkspaceLoading />
			) : showInitialError ? (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{error}</span>
						<Button variant="outline" size="sm" onClick={loadRecentRecords}>
							Thử lại
						</Button>
					</AlertDescription>
				</Alert>
			) : records.length === 0 ? (
				<WorkspaceEmpty />
			) : (
				<div className="flex min-h-0 flex-1 flex-col gap-3">
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="size-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<RecentRecordsList records={records} />
				</div>
			)}
		</div>
	);
}
