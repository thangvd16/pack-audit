import { Moon, Sun } from "lucide-react";
import { lazy, Suspense, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useTheme } from "@/shared/hooks/useTheme";
import { AppSidebar } from "@/layouts/AppSidebar";
import type { PageType } from "@/types/page.types";

const ScannerPage = lazy(() => import("@/pages/ScannerPage").then((m) => ({ default: m.ScannerPage })));
const SessionPage = lazy(() => import("@/pages/SessionPage").then((m) => ({ default: m.SessionPage })));
const HistoryPage = lazy(() => import("@/pages/HistoryPage").then((m) => ({ default: m.HistoryPage })));
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
	scanner: "Quét Mã Vạch",
	session: "Phiên Làm Việc",
	history: "Lịch Sử",
	settings: "Cài Đặt",
};

const renderPage = (page: PageType) => {
	switch (page) {
		case "scanner":
			return <ScannerPage />;
		case "session":
			return <SessionPage />;
		case "history":
			return <HistoryPage />;
		case "settings":
			return <SettingsPage />;
	}
};

export const AppLayout = () => {
	const [activePage, setActivePage] = useState<PageType>("scanner");
	const [displayPage, setDisplayPage] = useState<PageType>("scanner");
	const [isPending, startTransition] = useTransition();
	const { theme, toggleTheme } = useTheme();

	const navigate = (page: PageType) => {
		setDisplayPage(page);
		startTransition(() => setActivePage(page));
	};

	return (
		<SidebarProvider>
			<AppSidebar activePage={displayPage} onNavigate={navigate} />
			<SidebarInset>
				<header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border bg-background/80 backdrop-blur-md px-5">
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
				<div className={`flex flex-1 flex-col overflow-auto transition-opacity duration-150 ${isPending ? "opacity-60" : ""}`}>
					<Suspense fallback={<DelayedFallback />}>{renderPage(activePage)}</Suspense>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
};
