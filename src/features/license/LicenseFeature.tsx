import { ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { LicenseActivationForm } from "./components/LicenseActivationForm";
import { LicenseRetryPanel } from "./components/LicenseRetryPanel";
import { activateLicenseOnline, refreshLicenseOnline } from "./services/license.service";
import { isPermanentLicenseError, mapLicenseError } from "./utils/license-errors";

interface LicenseFeatureProps {
	onActivated: () => void;
	needsInternet?: boolean;
	initialError?: unknown;
}

export function LicenseFeature({ onActivated, needsInternet, initialError }: LicenseFeatureProps) {
	const [key, setKey] = useState("");
	const [error, setError] = useState(() => (initialError !== undefined ? mapLicenseError(initialError) : ""));
	const [isPermanentError, setIsPermanentError] = useState(() => !!initialError && isPermanentLicenseError(initialError));
	const [loading, setLoading] = useState(() => !initialError && !!needsInternet && navigator.onLine);
	const [showNewKey, setShowNewKey] = useState(false);

	const retryStateRef = useRef({
		error: initialError !== undefined ? mapLicenseError(initialError) : "",
		isPermanent: !!initialError && isPermanentLicenseError(initialError),
	});

	const handleActivate = useCallback(async () => {
		const trimmed = key.trim();
		if (!trimmed) return;
		setLoading(true);
		setError("");
		try {
			const [status] = await Promise.all([activateLicenseOnline(trimmed), new Promise<void>((resolve) => setTimeout(resolve, 1000))]);
			if (status.valid) {
				onActivated();
			} else {
				setError(mapLicenseError(status.message));
			}
		} catch (e) {
			setError(mapLicenseError(e));
		} finally {
			setLoading(false);
		}
	}, [key, onActivated]);

	const handleRetryRefresh = useCallback(async () => {
		setLoading(true);
		setError("");
		setIsPermanentError(false);
		try {
			const status = await refreshLicenseOnline();
			if (status.valid) {
				onActivated();
				return;
			}
			const err = mapLicenseError(status.message);
			const permanent = isPermanentLicenseError(status.message);
			retryStateRef.current = { error: err, isPermanent: permanent };
			setError(err);
			setIsPermanentError(permanent);
		} catch (e) {
			const err = mapLicenseError(e);
			const permanent = isPermanentLicenseError(e);
			retryStateRef.current = { error: err, isPermanent: permanent };
			setError(err);
			setIsPermanentError(permanent);
		} finally {
			setLoading(false);
		}
	}, [onActivated]);

	const { isOnline } = useNetwork();
	const isRetryMode = needsInternet && !showNewKey;

	const didAutoRetry = useRef(!!initialError);
	useEffect(() => {
		if (didAutoRetry.current || !needsInternet || !isOnline) return;
		didAutoRetry.current = true;
		void handleRetryRefresh();
	}, [needsInternet, isOnline, handleRetryRefresh]);

	const openNewKey = () => {
		setShowNewKey(true);
		setError("");
		setIsPermanentError(false);
	};

	const restoreRetryPanel = () => {
		setShowNewKey(false);
		setError(retryStateRef.current.error);
		setIsPermanentError(retryStateRef.current.isPermanent);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 text-foreground">
			<Card className="w-full max-w-md gap-0">
				<CardHeader className="flex flex-col items-center gap-3 border-b border-border px-6 py-6 text-center">
					<div className="flex size-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
						<ScanLine className="h-5 w-5 text-primary" />
					</div>
					<div className="space-y-1">
						<h1 className="text-base font-semibold tracking-tight text-foreground">Pack Audit</h1>
						{(!isRetryMode || !isOnline) && (
							<p className="text-sm text-muted-foreground">
								{isRetryMode ? "Cần kết nối internet để xác minh" : "Nhập mã bản quyền để tiếp tục"}
							</p>
						)}
					</div>
				</CardHeader>

				<CardContent className="flex flex-col gap-3 px-6 py-5">
					{isRetryMode ? (
						<LicenseRetryPanel
							isOnline={isOnline}
							loading={loading}
							error={error}
							isPermanentError={isPermanentError}
							onEnterNewKey={openNewKey}
							onRetryRefresh={handleRetryRefresh}
						/>
					) : (
						<LicenseActivationForm
							licenseKey={key}
							error={error}
							loading={loading}
							showBackButton={!!needsInternet}
							onLicenseKeyChange={setKey}
							onActivate={handleActivate}
							onBack={restoreRetryPanel}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
