export type LicenseAppState = "valid" | "invalid" | "needs_internet";

export interface LicenseStatus {
	valid: boolean;
	needs_refresh: boolean;
	message: string;
	days_remaining: number;
}

export interface LicenseResolveResult {
	state: LicenseAppState;
	refreshError?: unknown;
}
