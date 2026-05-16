import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LicenseRetryPanelProps {
	isOnline: boolean;
	loading: boolean;
	error: string;
	isPermanentError: boolean;
	onEnterNewKey: () => void;
	onRetryRefresh: () => void;
}

export function LicenseRetryPanel({ isOnline, loading, error, isPermanentError, onEnterNewKey, onRetryRefresh }: LicenseRetryPanelProps) {
	return (
		<>
			<div className={`rounded-md border p-4 text-center ${isOnline ? "border-destructive/20 bg-destructive/5" : "border-amber-500/20 bg-amber-500/5"}`}>
				{loading ? (
					<Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" />
				) : isOnline ? (
					<AlertTriangle className="mx-auto mb-2 h-5 w-5 text-destructive" />
				) : (
					<WifiOff className="mx-auto mb-2 h-5 w-5 text-amber-500" />
				)}
				<p className="text-balance text-sm text-muted-foreground">
					{loading
						? "Đang xác minh license…"
						: error || (isOnline ? "Server từ chối xác minh. Nhập key mới để tiếp tục." : "Không có kết nối internet. Kết nối lại rồi thử lại.")}
				</p>
			</div>

			{!loading && (
				<>
					{isOnline ? (
						<>
							<Button className="w-full" onClick={onEnterNewKey}>
								Nhập key mới
							</Button>
							{!isPermanentError && (
								<Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={onRetryRefresh}>
									Thử lại bằng key cũ
								</Button>
							)}
						</>
					) : (
						<>
							<Button className="w-full" onClick={onRetryRefresh}>
								Thử lại
							</Button>
							<Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={onEnterNewKey}>
								Nhập key mới
							</Button>
						</>
					)}
				</>
			)}
		</>
	);
}
