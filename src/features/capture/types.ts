export type CaptureState = "idle" | "countdown" | "recording" | "saving";

export interface CaptureSettings {
	stabilityThresholdMs: number;
	countdownMs: number;
	minRecordingMs: number;
	maxRecordingMs: number;
	videoSaveDir: string;
}

export const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
	stabilityThresholdMs: 400,
	countdownMs: 2_000,
	minRecordingMs: 1_000,
	maxRecordingMs: 600_000,
	videoSaveDir: "",
};

export interface CaptureRecord {
	id: string;
	sessionId: string;
	barcode: string;
	format: string;
	scannedAt: number;
	videoPath: string | null;
	videoDurationMs: number | null;
	note: string | null;
}

export interface CreateRecordInput {
	sessionId: string;
	barcode: string;
	format: string;
	scannedAt: number;
	videoBlob: Blob;
	videoDurationMs: number;
	mimeType: string;
	note?: string;
}
