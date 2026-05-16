import { useCallback, useEffect, useState } from "react";
import { SplashScreen } from "@/components/core/SplashScreen";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type LicenseResolveResult, resolveOnlineOrSavedLicenseState } from "@/features/license";
import { useTheme } from "@/shared/hooks/useTheme";
import App, { type AppState } from "./App";

async function resolveInitialAppState(): Promise<LicenseResolveResult> {
	const timeout = new Promise<LicenseResolveResult>((resolve) => window.setTimeout(() => resolve({ state: "needs_internet" }), 12_000));
	return Promise.race([resolveOnlineOrSavedLicenseState(), timeout]);
}

export function Root() {
	useTheme();

	const [initialAppState, setInitialAppState] = useState<AppState | null>(null);
	const [initialLicenseError, setInitialLicenseError] = useState<unknown>(undefined);
	const [isSplashDone, setIsSplashDone] = useState(() => sessionStorage.getItem("splash-done") === "1");

	useEffect(() => {
		let isMounted = true;

		void resolveInitialAppState().then(({ state, refreshError }) => {
			if (isMounted) {
				setInitialAppState(state);
				if (refreshError) setInitialLicenseError(refreshError);
			}
		});

		return () => {
			isMounted = false;
		};
	}, []);

	const handleSplashFinish = useCallback(() => {
		sessionStorage.setItem("splash-done", "1");
		setIsSplashDone(true);
	}, []);

	if (!initialAppState) {
		if (isSplashDone) return null;
		return <SplashScreen canFinish={false} onFinish={handleSplashFinish} />;
	}

	if (!isSplashDone) {
		return <SplashScreen canFinish={true} onFinish={handleSplashFinish} />;
	}

	return (
		<>
			<TooltipProvider>
				<App initialAppState={initialAppState} initialLicenseError={initialLicenseError} />
			</TooltipProvider>
			<Toaster />
		</>
	);
}
