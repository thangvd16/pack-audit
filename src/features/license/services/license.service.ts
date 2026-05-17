import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/constants/env";
import type { LicenseResolveResult, LicenseStatus, LicenseAppState } from "../types";

export async function activateLicenseOnline(key: string): Promise<LicenseStatus> {
	const trimmed = key.trim();
	if (!trimmed) {
		throw new Error("Mã bản quyền không hợp lệ");
	}
	return invoke<LicenseStatus>("activate_license_online", { key: trimmed });
}

export async function refreshLicenseOnline(): Promise<LicenseStatus> {
	return invoke<LicenseStatus>("refresh_license_online");
}

export async function checkSavedLicense(): Promise<LicenseStatus> {
	return invoke<LicenseStatus>("check_saved_license");
}

export function resolveAppStateFromLicense(status: LicenseStatus): LicenseAppState {
	if (status.valid) return "valid";
	return status.needs_refresh ? "needs_internet" : "invalid";
}

export async function resolveOnlineOrSavedLicenseState(): Promise<LicenseResolveResult> {
	if (!isTauri) return { state: "valid" };

	let saved: LicenseStatus;
	try {
		saved = await checkSavedLicense();
	} catch {
		return { state: "invalid" };
	}

	if (saved.valid) return { state: "valid" };
	if (!saved.needs_refresh) return { state: "invalid" };

	try {
		return { state: resolveAppStateFromLicense(await refreshLicenseOnline()) };
	} catch (e) {
		return { state: "needs_internet", refreshError: e };
	}
}
