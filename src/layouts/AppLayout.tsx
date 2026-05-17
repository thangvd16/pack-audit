import { Moon, Sun } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState, useTransition, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DEFAULT_CAPTURE_SETTINGS, type CaptureSettings } from "@/features/capture";
import { useTheme } from "@/shared/hooks/useTheme";
import { AppSidebar } from "@/layouts/AppSidebar";
import type { PageType } from "@/types/page.types";

const CaptureWorkspacePage = lazy(() => import("@/pages/CaptureWorkspacePage").then((m) => ({ default: m.CaptureWorkspacePage })));
const SessionPage = lazy(() => import("@/pages/SessionPage").then((m) => ({ default: m.SessionPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

const DelayedFallback = () => {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setVisible(true), 300);
		return () => clearTimeout(t);
	}, []);
	if (!visible) return null;
	return <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải...</div>;
};

const PAGE_TITLES: Record<PageType, string> = {
	workspace: "Kiểm hàng",
	session: "Phiên làm việc",
	settings: "Cài đặt",
};

const scanModeSidebarStyle = {
	"--sidebar-width": "0rem",
	"--sidebar-width-icon": "0rem",
} as CSSProperties;

const renderPage = (
	page: PageType,
	captureSettings: CaptureSettings,
	setCaptureSettings: (settings: CaptureSettings) => void,
	onScanModeChange: (active: boolean) => void,
) => {
	switch (page) {
		case "workspace":
			return <CaptureWorkspacePage captureSettings={captureSettings} onScanModeChange={onScanModeChange} />;
		case "session":
			return <SessionPage />;
		case "settings":
			return <SettingsPage captureSettings={captureSettings} onCaptureSettingsChange={setCaptureSettings} />;
	}
};

export const AppLayout = () => {
	const [activePage, setActivePage] = useState<PageType>("workspace");
	const [displayPage, setDisplayPage] = useState<PageType>("workspace");
	const [captureSettings, setCaptureSettings] = useState<CaptureSettings>(DEFAULT_CAPTURE_SETTINGS);
	const [isScanModeActive, setIsScanModeActive] = useState(false);
	const [isPending, startTransition] = useTransition();
	const { theme, toggleTheme } = useTheme();

	const handleScanModeChange = useCallback((active: boolean) => {
		setIsScanModeActive(active);
	}, []);

	const navigate = useCallback(
		(page: PageType) => {
			if (isScanModeActive) return;
			setDisplayPage(page);
			startTransition(() => setActivePage(page));
		},
		[isScanModeActive],
	);

	return (
		<SidebarProvider style={isScanModeActive ? scanModeSidebarStyle : undefined}>
			<AppSidebar
				activePage={displayPage}
				onNavigate={navigate}
				aria-hidden={isScanModeActive}
				className={isScanModeActive ? "hidden md:hidden" : undefined}
			/>
			<SidebarInset className={isScanModeActive ? "h-dvh min-h-dvh overflow-hidden" : undefined}>
				<header
					className={`sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border bg-background/80 px-5 backdrop-blur-md ${isScanModeActive ? "hidden" : ""}`}
				>
					<span className="text-sm font-semibold tracking-tight text-foreground">{PAGE_TITLES[displayPage]}</span>
					<div className="ml-auto">
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleTheme}
							className="h-8 w-8"
							aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
						>
							{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
						</Button>
					</div>
				</header>
				<div
					className={`flex flex-1 flex-col transition-opacity duration-150 ${isScanModeActive ? "min-h-0 overflow-hidden" : "overflow-auto"} ${isPending ? "opacity-60" : ""}`}
				>
					<Suspense fallback={<DelayedFallback />}>{renderPage(activePage, captureSettings, setCaptureSettings, handleScanModeChange)}</Suspense>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
};
