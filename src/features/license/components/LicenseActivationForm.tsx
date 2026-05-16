import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatLicenseKey } from "../utils/license-key";

interface LicenseActivationFormProps {
	licenseKey: string;
	error: string;
	loading: boolean;
	showBackButton: boolean;
	onLicenseKeyChange: (key: string) => void;
	onActivate: () => void;
	onBack: () => void;
}

export function LicenseActivationForm({ licenseKey, error, loading, showBackButton, onLicenseKeyChange, onActivate, onBack }: LicenseActivationFormProps) {
	return (
		<>
			<Input
				className="h-10 text-center font-mono tracking-widest"
				placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
				value={licenseKey}
				onChange={(e) => onLicenseKeyChange(formatLicenseKey(e.target.value))}
				onKeyDown={(e) => e.key === "Enter" && void onActivate()}
				spellCheck={false}
				autoComplete="off"
				autoFocus
			/>
			{error && <p className="text-balance text-center text-xs text-destructive">{error}</p>}
			<Button className="w-full" onClick={onActivate} disabled={loading || !licenseKey.trim()}>
				{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kích hoạt key"}
			</Button>
			{showBackButton && (
				<Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={onBack}>
					← Quay lại
				</Button>
			)}
		</>
	);
}
