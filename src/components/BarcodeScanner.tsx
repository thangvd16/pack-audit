import { useRef, useState, useCallback } from "react";
import { Camera, CameraOff, RefreshCw, CheckCircle2, AlertCircle, ScanLine, Trash2, VideoIcon } from "lucide-react";
import { useCameras } from "@/hooks/useCameras";
import { useBarcodeScanner, type ScanResult } from "@/hooks/useBarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function BarcodeScanner() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
	const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
	const [lastScan, setLastScan] = useState<ScanResult | null>(null);
	const [flash, setFlash] = useState(false);

	const { cameras, loading: cameraLoading, error: cameraError, initialized, refresh } = useCameras();

	const handleScan = useCallback((result: ScanResult) => {
		setLastScan(result);
		setScanHistory((prev) => [result, ...prev].slice(0, 100));
		setFlash(true);
		setTimeout(() => setFlash(false), 600);
	}, []);

	const { scanning, error: scanError } = useBarcodeScanner(videoRef, selectedCamera, handleScan);

	const formatTime = (ts: number) =>
		new Date(ts).toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});

	if (!initialized) {
		return (
			<div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-8 p-8">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center">
						<VideoIcon size={36} className="text-primary" />
					</div>
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Pack Audit</h1>
						<p className="text-muted-foreground mt-2 text-sm max-w-xs">Ghi hình quá trình đóng gói đơn hàng bằng cách quét mã vạch</p>
					</div>
				</div>

				{cameraLoading ? (
					<div className="flex flex-col items-center gap-3">
						<RefreshCw size={28} className="text-primary animate-spin" />
						<p className="text-muted-foreground text-sm">Đang yêu cầu quyền camera...</p>
						<p className="text-muted-foreground/60 text-xs max-w-xs text-center">Hãy cho phép truy cập camera nếu có hộp thoại xuất hiện</p>
					</div>
				) : (
					<Button size="lg" onClick={refresh} className="gap-3 px-8 shadow-lg">
						<Camera size={18} />
						Tìm Camera
					</Button>
				)}

				{cameraError && (
					<Alert variant="destructive" className="max-w-sm">
						<AlertCircle size={16} />
						<AlertDescription>
							<p className="font-medium mb-1">Không thể truy cập camera</p>
							<p className="text-xs opacity-80">{cameraError}</p>
							<button onClick={refresh} className="mt-2 text-xs underline underline-offset-2 hover:opacity-80">
								Thử lại
							</button>
						</AlertDescription>
					</Alert>
				)}
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			{/* Header */}
			<header className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
				<div className="flex items-center gap-2.5">
					<div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
						<ScanLine size={15} className="text-primary-foreground" />
					</div>
					<span className="font-bold tracking-tight">Pack Audit</span>
					<Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
						v0.1.2
					</Badge>
				</div>

				<Badge variant={scanning ? "default" : "secondary"} className="gap-1.5">
					<span className={cn("w-1.5 h-1.5 rounded-full", scanning ? "bg-green-400 animate-pulse" : "bg-muted-foreground")} />
					{scanning ? "Đang quét" : "Chờ camera"}
				</Badge>
			</header>

			{/* Main content */}
			<div className="flex flex-1 gap-4 p-4 min-h-0">
				{/* Left: Camera Preview */}
				<div className="flex-1 flex flex-col gap-3 min-w-0">
					{/* Video */}
					<div
						className={cn(
							"relative rounded-xl overflow-hidden bg-card border-2 transition-colors duration-300",
							flash ? "border-green-400 shadow-lg shadow-green-400/20" : scanning ? "border-primary/40" : "border-border",
						)}
						style={{ aspectRatio: "16/9" }}
					>
						<video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

						{!scanning && !selectedCamera && (
							<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
								<CameraOff size={44} className="text-muted-foreground/30" />
								<p className="text-muted-foreground text-sm">Chọn camera từ danh sách bên phải</p>
							</div>
						)}

						{!scanning && selectedCamera && !scanError && (
							<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/70">
								<RefreshCw size={28} className="text-primary animate-spin" />
								<p className="text-primary text-sm">Đang khởi động camera...</p>
							</div>
						)}

						{scanning && (
							<div className="absolute inset-0 pointer-events-none">
								<div className="absolute left-5 right-5 h-px bg-green-400/80 animate-scan-line shadow-sm shadow-green-400" />
								<div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-green-400 rounded-tl-sm" />
								<div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-green-400 rounded-tr-sm" />
								<div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-green-400 rounded-bl-sm" />
								<div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-green-400 rounded-br-sm" />
							</div>
						)}

						{flash && <div className="absolute inset-0 bg-green-400/10 pointer-events-none animate-flash" />}
					</div>

					{scanError && (
						<Alert variant="destructive">
							<AlertCircle size={16} />
							<AlertDescription>{scanError}</AlertDescription>
						</Alert>
					)}

					{lastScan ? (
						<Card className={cn("transition-all duration-300", flash && "border-green-400/60 bg-green-400/5")}>
							<CardContent className="pt-4">
								<div className="flex items-start gap-3">
									<CheckCircle2 size={18} className="text-green-400 mt-0.5 shrink-0" />
									<div className="min-w-0 flex-1">
										<p className="text-xs text-muted-foreground mb-1">Barcode vừa quét</p>
										<p className="text-xl font-mono font-bold break-all leading-tight">{lastScan.text}</p>
										<p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
											<Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
												{lastScan.format}
											</Badge>
											{formatTime(lastScan.timestamp)}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card className="border-dashed">
							<CardContent className="pt-4 flex items-center gap-3">
								<ScanLine size={18} className="text-muted-foreground/40 shrink-0" />
								<p className="text-muted-foreground text-sm">Chưa có barcode nào — hướng camera vào mã vạch</p>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Right: Controls */}
				<div className="w-72 flex flex-col gap-3 shrink-0">
					{/* Camera selector */}
					<Card>
						<CardHeader className="pb-2 pt-4 px-4">
							<div className="flex items-center justify-between">
								<CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Camera</CardTitle>
								<Tooltip>
									<TooltipTrigger
										className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 transition-colors"
										onClick={refresh}
										disabled={cameraLoading}
									>
										<RefreshCw size={13} className={cameraLoading ? "animate-spin" : ""} />
									</TooltipTrigger>
									<TooltipContent>Làm mới danh sách camera</TooltipContent>
								</Tooltip>
							</div>
						</CardHeader>
						<CardContent className="px-4 pb-4 space-y-2">
							{cameraError && (
								<Alert variant="destructive" className="py-2">
									<AlertCircle size={13} />
									<AlertDescription className="text-xs">{cameraError}</AlertDescription>
								</Alert>
							)}

							{cameraLoading && (
								<div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
									<RefreshCw size={13} className="animate-spin" />
									Đang tìm camera...
								</div>
							)}

							{!cameraLoading && cameras.length === 0 && !cameraError && (
								<p className="text-muted-foreground/60 text-xs text-center py-2">Không tìm thấy camera nào</p>
							)}

							<div className="space-y-1.5">
								{cameras.map((cam) => (
									<Button
										key={cam.deviceId}
										variant={selectedCamera === cam.deviceId ? "default" : "secondary"}
										size="sm"
										className="w-full justify-start gap-2 h-9"
										onClick={() => setSelectedCamera(cam.deviceId)}
									>
										<Camera size={13} className="shrink-0" />
										<span className="truncate text-xs">{cam.label}</span>
									</Button>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Scan history */}
					<Card className="flex flex-col min-h-0 flex-1">
						<CardHeader className="pb-2 pt-4 px-4">
							<div className="flex items-center justify-between">
								<CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lịch sử quét</CardTitle>
								<div className="flex items-center gap-1.5">
									{scanHistory.length > 0 && (
										<Badge variant="secondary" className="text-xs h-5 px-1.5">
											{scanHistory.length}
										</Badge>
									)}
									{scanHistory.length > 0 && (
										<Tooltip>
											<TooltipTrigger
												className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
												onClick={() => {
													setScanHistory([]);
													setLastScan(null);
												}}
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
						<CardContent className="px-4 py-3 flex-1 min-h-0">
							{scanHistory.length === 0 ? (
								<div className="h-full flex items-center justify-center">
									<p className="text-muted-foreground/40 text-xs text-center">Chưa có lần quét nào</p>
								</div>
							) : (
								<ScrollArea className="h-full">
									<div className="space-y-1.5 pr-2">
										{scanHistory.map((item, i) => (
											<div
												key={`${item.text}-${item.timestamp}`}
												className={cn(
													"px-3 py-2 rounded-lg",
													i === 0 ? "bg-green-400/10 border border-green-400/25" : "bg-secondary/60",
												)}
											>
												<p className="font-mono text-xs truncate">{item.text}</p>
												<p className="text-[10px] text-muted-foreground mt-0.5">
													{item.format} · {formatTime(item.timestamp)}
												</p>
											</div>
										))}
									</div>
								</ScrollArea>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
