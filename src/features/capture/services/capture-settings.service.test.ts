import { describe, expect, it } from "vitest";
import { DEFAULT_CAPTURE_SETTINGS, type CaptureSettings } from "../types";
import { captureSettingsEqual, resolveActiveCaptureSettings } from "./capture-settings.service";

const requestedSettings: CaptureSettings = {
	...DEFAULT_CAPTURE_SETTINGS,
	stabilityThresholdMs: 750,
	countdownMs: 3_000,
};

describe("capture settings cycle boundary", () => {
	it("applies requested settings while idle", () => {
		expect(resolveActiveCaptureSettings(DEFAULT_CAPTURE_SETTINGS, requestedSettings, "idle")).toEqual(requestedSettings);
	});

	it("defers requested settings while a capture cycle is active", () => {
		expect(resolveActiveCaptureSettings(DEFAULT_CAPTURE_SETTINGS, requestedSettings, "countdown")).toEqual(DEFAULT_CAPTURE_SETTINGS);
		expect(resolveActiveCaptureSettings(DEFAULT_CAPTURE_SETTINGS, requestedSettings, "recording")).toEqual(DEFAULT_CAPTURE_SETTINGS);
		expect(resolveActiveCaptureSettings(DEFAULT_CAPTURE_SETTINGS, requestedSettings, "saving")).toEqual(DEFAULT_CAPTURE_SETTINGS);
	});

	it("compares capture settings by values", () => {
		expect(captureSettingsEqual(DEFAULT_CAPTURE_SETTINGS, { ...DEFAULT_CAPTURE_SETTINGS })).toBe(true);
		expect(captureSettingsEqual(DEFAULT_CAPTURE_SETTINGS, requestedSettings)).toBe(false);
	});
});
