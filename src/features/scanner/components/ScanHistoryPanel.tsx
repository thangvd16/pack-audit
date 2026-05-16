import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTime } from "@/shared/utils/date-time";
import type { ScanResult } from "../types";

interface ScanHistoryPanelProps {
	scanHistory: ScanResult[];
	onClearHistory: () => void;
}

export function ScanHistoryPanel({ scanHistory, onClearHistory }: ScanHistoryPanelProps) {
	return (
		<Card className="flex min-h-0 flex-1 flex-col">
			<CardHeader className="px-4 pb-2 pt-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lịch sử quét</CardTitle>
					<div className="flex items-center gap-1.5">
						{scanHistory.length > 0 && (
							<Badge variant="secondary" className="h-5 px-1.5 text-xs">
								{scanHistory.length}
							</Badge>
						)}
						{scanHistory.length > 0 && (
							<Tooltip>
								<TooltipTrigger
									className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
									onClick={onClearHistory}
								>
									<Trash2 size={13} />
								</TooltipTrigger>
								<TooltipContent>Xóa lịch sử</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
			</CardHeader>
			<Separator />
			<CardContent className="min-h-0 flex-1 px-4 py-3">
				{scanHistory.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-center text-xs text-muted-foreground/40">Chưa có lần quét nào</p>
					</div>
				) : (
					<ScrollArea className="h-full">
						<div className="space-y-1.5 pr-2">
							{scanHistory.map((scan, index) => (
								<div
									key={`${scan.text}-${scan.timestamp}`}
									className={cn("rounded-lg px-3 py-2", index === 0 ? "border border-green-400/25 bg-green-400/10" : "bg-secondary/60")}
								>
									<p className="truncate font-mono text-xs">{scan.text}</p>
									<p className="mt-0.5 text-[10px] text-muted-foreground">
										{scan.format} · {formatTime(scan.timestamp)}
									</p>
								</div>
							))}
						</div>
					</ScrollArea>
				)}
			</CardContent>
		</Card>
	);
}
