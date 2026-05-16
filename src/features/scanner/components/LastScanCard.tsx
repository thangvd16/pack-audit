import { CheckCircle2, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatTime } from "@/shared/utils/date-time";
import type { ScanResult } from "../types";

interface LastScanCardProps {
	lastScan: ScanResult | null;
	flash: boolean;
}

export function LastScanCard({ lastScan, flash }: LastScanCardProps) {
	if (!lastScan) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex items-center gap-3 pt-4">
					<ScanLine size={18} className="shrink-0 text-muted-foreground/40" />
					<p className="text-sm text-muted-foreground">Chưa có barcode nào — hướng camera vào mã vạch</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={cn("transition-all duration-300", flash && "border-green-400/60 bg-green-400/5")}>
			<CardContent className="pt-4">
				<div className="flex items-start gap-3">
					<CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-400" />
					<div className="min-w-0 flex-1">
						<p className="mb-1 text-xs text-muted-foreground">Barcode vừa quét</p>
						<p className="break-all font-mono text-xl font-bold leading-tight">{lastScan.text}</p>
						<p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Badge variant="outline" className="px-1.5 py-0 font-mono text-[10px]">
								{lastScan.format}
							</Badge>
							{formatTime(lastScan.timestamp)}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
