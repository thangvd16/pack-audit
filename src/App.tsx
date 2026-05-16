import { useCallback, useEffect, useRef, useState } from "react";
import { LicenseFeature, type LicenseAppState, resolveOnlineOrSavedLicenseState } from "@/features/license";
import { AppLayout } from "./layouts/AppLayout";

const LICENSE_RECHECK_INTERVAL_MS = 60_000 * 60;

export type AppState = LicenseAppState;

interface AppProps {
	initialAppState?: AppState;
	initialLicenseError?: unknown;
}

function App({ initialAppState = "valid", initialLicenseError }: AppProps) {
	const [appState, setAppState] = useState<AppState>(initialAppState);

	const usedInitialErrorRef = useRef(false);

	const refreshLicense = useCallback(async () => {
		const { state } = await resolveOnlineOrSavedLicenseState();
		setAppState(state);
	}, []);

	useEffect(() => {
		if (appState !== "valid") return;
		const interval = window.setInterval(() => {
			void refreshLicense();
		}, LICENSE_RECHECK_INTERVAL_MS);
		return () => window.clearInterval(interval);
	}, [appState, refreshLicense]);

	if (appState === "needs_internet") {
		const errorToPass = usedInitialErrorRef.current ? undefined : initialLicenseError;
		usedInitialErrorRef.current = true;
		return <LicenseFeature onActivated={() => setAppState("valid")} needsInternet initialError={errorToPass} />;
	}

	if (appState === "invalid") {
		return <LicenseFeature onActivated={() => setAppState("valid")} />;
	}

	return <AppLayout />;
}

export default App;
