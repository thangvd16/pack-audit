import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const SPLASH_PROGRESS_DURATION_MS = 1800;
const SPLASH_HOLD_DURATION_MS = 300;
const SPLASH_FADE_DURATION_MS = 400;
const SPLASH_START_DELAY_MS = 100;

interface SplashScreenProps {
	canFinish?: boolean;
	onFinish?: () => void;
}

export function SplashScreen({ canFinish = true, onFinish }: SplashScreenProps) {
	const [isProgressStarted, setIsProgressStarted] = useState(false);
	const [isProgressComplete, setIsProgressComplete] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);

	useEffect(() => {
		const progressTimer = window.setTimeout(() => setIsProgressStarted(true), SPLASH_START_DELAY_MS);
		const completeTimer = window.setTimeout(() => setIsProgressComplete(true), SPLASH_START_DELAY_MS + SPLASH_PROGRESS_DURATION_MS);

		return () => {
			window.clearTimeout(progressTimer);
			window.clearTimeout(completeTimer);
		};
	}, []);

	useEffect(() => {
		if (!isProgressComplete || !canFinish) return;

		const leaveTimer = window.setTimeout(() => setIsLeaving(true), SPLASH_HOLD_DURATION_MS);
		const finishTimer = window.setTimeout(() => onFinish?.(), SPLASH_HOLD_DURATION_MS + SPLASH_FADE_DURATION_MS);

		return () => {
			window.clearTimeout(leaveTimer);
			window.clearTimeout(finishTimer);
		};
	}, [canFinish, isProgressComplete, onFinish]);

	return (
		<div
			role="status"
			aria-label="Đang khởi động Pack Audit"
			className={cn(
				"fixed inset-0 z-9999 flex min-h-screen items-center justify-center bg-background px-6 text-foreground",
				"transition-[opacity,filter] ease-out",
				isLeaving ? "opacity-0 blur-sm" : "opacity-100",
			)}
			style={{ transitionDuration: `${SPLASH_FADE_DURATION_MS}ms` }}
		>
			<div className="flex w-full max-w-xs flex-col items-center gap-7">
				{/* Logo with entrance + pulse glow */}
				<div className="flex flex-col items-center gap-3.5" style={{ animation: "splash-logo-in 500ms cubic-bezier(0.4, 0, 0.2, 1) both" }}>
					<div className="flex size-[72px] items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
						<ScanLine className="h-9 w-9 text-primary" />
					</div>
					<div className="text-center" style={{ animation: "splash-text-in 400ms cubic-bezier(0.4, 0, 0.2, 1) 200ms both" }}>
						<h1 className="text-lg font-semibold tracking-tight text-foreground">Pack Audit</h1>
						<p className="mt-1 text-[13px] text-muted-foreground">Đang khởi động</p>
					</div>
				</div>

				{/* Progress bar with shimmer */}
				<div className="w-full space-y-2" style={{ animation: "splash-progress-in 400ms cubic-bezier(0.4, 0, 0.2, 1) 350ms both" }}>
					<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-[width] ease-in-out"
							style={{
								width: isProgressStarted ? "100%" : "0%",
								transitionDuration: `${SPLASH_PROGRESS_DURATION_MS}ms`,
							}}
						/>
						{isProgressStarted && !isProgressComplete && (
							<div
								className="absolute inset-0 rounded-full"
								style={{
									background: "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.15) 50%, transparent 100%)",
									backgroundSize: "200% 100%",
									animation: "splash-progress-shimmer 1.5s ease-in-out infinite",
								}}
							/>
						)}
					</div>
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>Chuẩn bị giao diện</span>
						<span className="transition-opacity duration-200" style={{ opacity: isProgressComplete && canFinish ? 1 : 0.7 }}>
							{isProgressComplete && canFinish ? "Sẵn sàng" : "Đang tải"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
