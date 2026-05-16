import { Settings } from "lucide-react";

export function SettingsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
			<div className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted">
				<Settings className="h-6 w-6 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<h2 className="text-sm font-semibold text-foreground">Cài Đặt</h2>
				<p className="text-xs text-muted-foreground">Tính năng đang được phát triển</p>
			</div>
		</div>
	);
}
