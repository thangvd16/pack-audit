export type NativeScanFormat =
	| "Code128"
	| "QR"
	| "MicroQR"
	| "DataMatrix"
	| "PDF417"
	| "Aztec"
	| "EAN-13"
	| "EAN-8"
	| "UPC-A"
	| "UPC-E"
	| "Code39"
	| "ITF"
	| "Manual"
	| "Unknown";

export interface ScanResult {
	text: string;
	format: string;
	timestamp: number;
}

export interface CameraDevice {
	deviceId: string;
	label: string;
	isDefault?: boolean;
}

export interface ScanPoint {
	x: number;
	y: number;
}

export type ScanSource = "camera" | "manual";

export interface NativeScanResult {
	text: string;
	format: NativeScanFormat;
	timestampMs: number;
	confidence: number | null;
	points: ScanPoint[];
	source: ScanSource;
}

export type NativeScannerStatus = "idle" | "starting" | "scanning" | "countdown" | "recording" | "saving" | "stopping" | "error";

export interface NativeScannerSettings {
	cameraId?: string | null;
	width: number;
	height: number;
	fps: number;
	previewFps: number;
	formats: NativeScanFormat[];
	stabilityThresholdMs: number;
	countdownMs: number;
	minRecordingMs: number;
	maxRecordingMs: number;
}

export interface ScannerStartInput {
	settings: NativeScannerSettings;
}

export interface ScannerRecordingInput {
	sessionId: string;
	barcode: string;
	format: NativeScanFormat;
	recordId?: string | null;
}

export interface ManualCodeInput {
	text: string;
	format?: NativeScanFormat | null;
	timestampMs?: number | null;
}

export interface NativeScannerState {
	status: NativeScannerStatus;
	activeCameraId: string | null;
	activeCode: NativeScanResult | null;
	activeRecordId: string | null;
	recordingStartedAtMs: number | null;
	settings: NativeScannerSettings;
	lastError: NativeScannerError | null;
}

export type NativeScannerErrorCode =
	| "notImplemented"
	| "invalidSettings"
	| "invalidInput"
	| "invalidState"
	| "cameraUnavailable"
	| "decoderUnavailable"
	| "recorderUnavailable"
	| "internal";

export interface NativeScannerError {
	code: NativeScannerErrorCode;
	message: string;
}

export interface NativeScannerFrameEvent {
	sequence: number;
	timestampMs: number;
	width: number;
	height: number;
	jpegBase64: string;
}

export interface NativeScannerMetricsEvent {
	timestampMs: number;
	cameraFps: number;
	previewFps: number;
	decoderFps: number;
	droppedFrames: number;
	decodeLatencyP95Ms: number | null;
	recorderQueueDepth: number | null;
}
