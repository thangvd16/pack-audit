import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
	CameraDevice,
	ManualCodeInput,
	NativeScanResult,
	NativeScannerError,
	NativeScannerErrorCode,
	NativeScannerFrameEvent,
	NativeScannerMetricsEvent,
	NativeScannerState,
	ScannerRecordingInput,
	ScannerStartInput,
} from "../types";

type UnlistenFn = () => void;

export const NATIVE_SCANNER_COMMANDS = {
	listCameras: "scanner_list_cameras",
	start: "scanner_start",
	stop: "scanner_stop",
	startRecording: "scanner_start_recording",
	stopRecording: "scanner_stop_recording",
	submitManualCode: "scanner_submit_manual_code",
} as const;

export const NATIVE_SCANNER_EVENTS = {
	frame: "scanner://frame",
	detected: "scanner://detected",
	state: "scanner://state",
	error: "scanner://error",
	metrics: "scanner://metrics",
} as const;

const ERROR_MESSAGES: Record<NativeScannerErrorCode, string> = {
	notImplemented: "Máy quét native chưa sẵn sàng",
	invalidSettings: "Cấu hình máy quét không hợp lệ",
	invalidInput: "Dữ liệu máy quét không hợp lệ",
	invalidState: "Trạng thái máy quét không hợp lệ",
	cameraUnavailable: "Không thể truy cập camera",
	decoderUnavailable: "Không thể khởi động bộ giải mã",
	recorderUnavailable: "Không thể khởi động ghi video",
	internal: "Máy quét native gặp lỗi",
};

export async function scannerListCameras(): Promise<CameraDevice[]> {
	return invoke<CameraDevice[]>(NATIVE_SCANNER_COMMANDS.listCameras);
}

export async function scannerStart(input: ScannerStartInput): Promise<NativeScannerState> {
	return invoke<NativeScannerState>(NATIVE_SCANNER_COMMANDS.start, { input });
}

export async function scannerStop(): Promise<NativeScannerState> {
	return invoke<NativeScannerState>(NATIVE_SCANNER_COMMANDS.stop);
}

export async function scannerStartRecording(input: ScannerRecordingInput): Promise<NativeScannerState> {
	return invoke<NativeScannerState>(NATIVE_SCANNER_COMMANDS.startRecording, { input });
}

export async function scannerStopRecording(): Promise<NativeScannerState> {
	return invoke<NativeScannerState>(NATIVE_SCANNER_COMMANDS.stopRecording);
}

export async function scannerSubmitManualCode(input: ManualCodeInput): Promise<NativeScanResult> {
	return invoke<NativeScanResult>(NATIVE_SCANNER_COMMANDS.submitManualCode, { input });
}

export function onScannerFrame(handler: (event: NativeScannerFrameEvent) => void): Promise<UnlistenFn> {
	return listen<NativeScannerFrameEvent>(NATIVE_SCANNER_EVENTS.frame, (event) => handler(event.payload));
}

export function onScannerDetected(handler: (result: NativeScanResult) => void): Promise<UnlistenFn> {
	return listen<NativeScanResult>(NATIVE_SCANNER_EVENTS.detected, (event) => handler(event.payload));
}

export function onScannerState(handler: (state: NativeScannerState) => void): Promise<UnlistenFn> {
	return listen<NativeScannerState>(NATIVE_SCANNER_EVENTS.state, (event) => handler(event.payload));
}

export function onScannerError(handler: (error: NativeScannerError) => void): Promise<UnlistenFn> {
	return listen<NativeScannerError>(NATIVE_SCANNER_EVENTS.error, (event) => handler(event.payload));
}

export function onScannerMetrics(handler: (metrics: NativeScannerMetricsEvent) => void): Promise<UnlistenFn> {
	return listen<NativeScannerMetricsEvent>(NATIVE_SCANNER_EVENTS.metrics, (event) => handler(event.payload));
}

export function normalizeNativeScannerError(error: unknown, fallback = "Không thể điều khiển máy quét") {
	if (isNativeScannerError(error)) {
		return error.message || ERROR_MESSAGES[error.code] || fallback;
	}

	const rawMessage = typeof error === "string" ? error : error instanceof Error ? error.message : "";
	if (rawMessage.includes("Máy quét") || rawMessage.includes("camera") || rawMessage.includes("Camera")) {
		return rawMessage;
	}

	return fallback;
}

function isNativeScannerError(error: unknown): error is NativeScannerError {
	if (!error || typeof error !== "object") return false;
	const candidate = error as Partial<NativeScannerError>;
	return typeof candidate.code === "string" && typeof candidate.message === "string" && candidate.code in ERROR_MESSAGES;
}
