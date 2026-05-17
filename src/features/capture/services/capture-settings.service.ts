import type { CaptureSettings, CaptureState } from "../types";

export function resolveActiveCaptureSettings(currentSettings: CaptureSettings, requestedSettings: CaptureSettings, state: CaptureState) {
	return state === "idle" ? requestedSettings : currentSettings;
}

export function captureSettingsEqual(left: CaptureSettings, right: CaptureSettings) {
	return (
		left.stabilityThresholdMs === right.stabilityThresholdMs &&
		left.countdownMs === right.countdownMs &&
		left.minRecordingMs === right.minRecordingMs &&
		left.maxRecordingMs === right.maxRecordingMs &&
		left.videoSaveDir === right.videoSaveDir
	);
}
