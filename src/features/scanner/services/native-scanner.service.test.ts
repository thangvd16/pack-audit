import { describe, expect, it } from "vitest";
import { NATIVE_SCANNER_COMMANDS, NATIVE_SCANNER_EVENTS, normalizeNativeScannerError } from "./native-scanner.service";

describe("native scanner contract", () => {
	it("keeps command names aligned with Rust invoke handlers", () => {
		expect(NATIVE_SCANNER_COMMANDS).toEqual({
			listCameras: "scanner_list_cameras",
			start: "scanner_start",
			stop: "scanner_stop",
			startRecording: "scanner_start_recording",
			stopRecording: "scanner_stop_recording",
			submitManualCode: "scanner_submit_manual_code",
		});
	});

	it("keeps event names aligned with native scanner plan", () => {
		expect(NATIVE_SCANNER_EVENTS).toEqual({
			frame: "scanner://frame",
			detected: "scanner://detected",
			state: "scanner://state",
			error: "scanner://error",
			metrics: "scanner://metrics",
		});
	});

	it("normalizes typed scanner errors for Vietnamese UI copy", () => {
		expect(normalizeNativeScannerError({ code: "cameraUnavailable", message: "Không thể truy cập camera" })).toBe(
			"Không thể truy cập camera",
		);
		expect(normalizeNativeScannerError({ code: "cameraUnavailable", message: "" })).toBe("Không thể truy cập camera");
	});

	it("hides unknown scanner details behind a fallback", () => {
		expect(normalizeNativeScannerError("/Users/example/native stack trace", "Không thể quét mã")).toBe("Không thể quét mã");
	});
});
