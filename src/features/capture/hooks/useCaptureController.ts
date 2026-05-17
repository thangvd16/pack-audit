import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { ensureDailySession } from "@/features/session/services/session.service";
import { DEFAULT_CAPTURE_SETTINGS, type CaptureRecord, type CaptureSettings, type CaptureState } from "../types";
import {
	type CaptureMachineEffect,
	type CaptureMachineEvent,
	type CaptureMachineSnapshot,
	transitionCaptureMachine,
} from "../services/capture-machine.service";
import { captureSettingsEqual, resolveActiveCaptureSettings } from "../services/capture-settings.service";
import { DETECTED_VIDEO_CODEC } from "../services/codec.service";
import { createCaptureRecord, getVideoSaveDir, normalizeCaptureStorageError } from "../services/capture-storage.service";
import { playCaptureEndSound, playCaptureStartSound } from "../services/sound.service";
import { type ConfirmedBarcode, type RawBarcodeEvent, useStableBarcode } from "./useStableBarcode";
import { useCountdown } from "./useCountdown";
import { useMediaRecorder } from "./useMediaRecorder";

interface UseCaptureControllerOptions {
	videoRef: RefObject<HTMLVideoElement | null>;
	settings?: Partial<CaptureSettings>;
	onRecordSaved?: (record: CaptureRecord) => void;
}

async function destroyCurrentWindow() {
	try {
		const { getCurrentWindow } = await import("@tauri-apps/api/window");
		await getCurrentWindow().destroy();
	} catch {
		return;
	}
}

export function useCaptureController({ videoRef, settings, onRecordSaved }: UseCaptureControllerOptions) {
	const requestedStabilityThresholdMs = settings?.stabilityThresholdMs ?? DEFAULT_CAPTURE_SETTINGS.stabilityThresholdMs;
	const requestedCountdownMs = settings?.countdownMs ?? DEFAULT_CAPTURE_SETTINGS.countdownMs;
	const requestedMinRecordingMs = settings?.minRecordingMs ?? DEFAULT_CAPTURE_SETTINGS.minRecordingMs;
	const requestedMaxRecordingMs = settings?.maxRecordingMs ?? DEFAULT_CAPTURE_SETTINGS.maxRecordingMs;
	const requestedVideoSaveDir = settings?.videoSaveDir ?? DEFAULT_CAPTURE_SETTINGS.videoSaveDir;
	const requestedSettings = useMemo(
		() => ({
			stabilityThresholdMs: requestedStabilityThresholdMs,
			countdownMs: requestedCountdownMs,
			minRecordingMs: requestedMinRecordingMs,
			maxRecordingMs: requestedMaxRecordingMs,
			videoSaveDir: requestedVideoSaveDir,
		}),
		[requestedStabilityThresholdMs, requestedCountdownMs, requestedMinRecordingMs, requestedMaxRecordingMs, requestedVideoSaveDir],
	);
	const [state, setState] = useState<CaptureState>("idle");
	const [captureSettings, setCaptureSettings] = useState<CaptureSettings>(requestedSettings);
	const [activeBarcode, setActiveBarcode] = useState<ConfirmedBarcode | null>(null);
	const [lastSavedRecord, setLastSavedRecord] = useState<CaptureRecord | null>(null);
	const [captureError, setCaptureError] = useState<string | null>(null);
	const [closeAfterSaveRequested, setCloseAfterSaveRequested] = useState(false);
	const stateRef = useRef<CaptureState>("idle");
	const activeBarcodeRef = useRef<ConfirmedBarcode | null>(null);
	const pendingBarcodeRef = useRef<ConfirmedBarcode | null>(null);
	const requestedSettingsRef = useRef(requestedSettings);
	const closeAfterSaveRequestedRef = useRef(false);
	const savingRef = useRef(false);
	const machineEffectsRef = useRef<(effects: CaptureMachineEffect[]) => void>(() => undefined);
	const { observeBarcode, resetStableBarcode } = useStableBarcode(captureSettings.stabilityThresholdMs);
	const mediaRecorder = useMediaRecorder();

	const updateState = useCallback((nextState: CaptureState) => {
		stateRef.current = nextState;
		setState(nextState);
	}, []);

	const updateCloseAfterSaveRequested = useCallback((requested: boolean) => {
		closeAfterSaveRequestedRef.current = requested;
		setCloseAfterSaveRequested(requested);
	}, []);

	const syncCaptureSettingsForState = useCallback((nextState: CaptureState) => {
		setCaptureSettings((currentSettings) => {
			const nextSettings = resolveActiveCaptureSettings(currentSettings, requestedSettingsRef.current, nextState);
			return captureSettingsEqual(currentSettings, nextSettings) ? currentSettings : nextSettings;
		});
	}, []);

	useEffect(() => {
		requestedSettingsRef.current = requestedSettings;
		syncCaptureSettingsForState(stateRef.current);
	}, [requestedSettings, syncCaptureSettingsForState]);

	const getMachineSnapshot = useCallback(
		(): CaptureMachineSnapshot => ({
			state: stateRef.current,
			activeBarcode: activeBarcodeRef.current,
			pendingBarcode: pendingBarcodeRef.current,
			minRecordingMs: captureSettings.minRecordingMs,
		}),
		[captureSettings.minRecordingMs],
	);

	const applyMachineSnapshot = useCallback(
		(snapshot: CaptureMachineSnapshot) => {
			activeBarcodeRef.current = snapshot.activeBarcode;
			pendingBarcodeRef.current = snapshot.pendingBarcode ?? null;
			setActiveBarcode(snapshot.activeBarcode);
			updateState(snapshot.state);
			syncCaptureSettingsForState(snapshot.state);
		},
		[syncCaptureSettingsForState, updateState],
	);

	const dispatchMachineEvent = useCallback(
		(event: CaptureMachineEvent) => {
			const transition = transitionCaptureMachine(getMachineSnapshot(), event);
			applyMachineSnapshot(transition.snapshot);
			machineEffectsRef.current(transition.effects);
			return transition;
		},
		[applyMachineSnapshot, getMachineSnapshot],
	);

	const completeCycle = useCallback(
		(nextBarcode?: ConfirmedBarcode) => {
			dispatchMachineEvent({ type: "cycleCompleted", nextBarcode });
		},
		[dispatchMachineEvent],
	);

	const playEndSoundThenComplete = useCallback(
		async (nextBarcode?: ConfirmedBarcode) => {
			await playCaptureEndSound();
			completeCycle(nextBarcode);
			if (closeAfterSaveRequestedRef.current) {
				await destroyCurrentWindow();
				updateCloseAfterSaveRequested(false);
			}
		},
		[completeCycle, updateCloseAfterSaveRequested],
	);

	const discardRecording = useCallback(
		async (nextBarcode?: ConfirmedBarcode) => {
			if (savingRef.current) return;

			savingRef.current = true;
			setCaptureError(null);

			try {
				await mediaRecorder.stopRecording();
				await playCaptureEndSound();
				toast.warning("Video quá ngắn, bỏ qua");
				completeCycle(nextBarcode);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Không thể dừng video";
				setCaptureError(message);
				toast.error(message);
				await playEndSoundThenComplete(nextBarcode);
			} finally {
				savingRef.current = false;
			}
		},
		[completeCycle, mediaRecorder, playEndSoundThenComplete],
	);

	const saveRecording = useCallback(
		async (nextBarcode?: ConfirmedBarcode) => {
			if (savingRef.current) return;

			const barcode = activeBarcodeRef.current;
			if (!barcode) return;

			savingRef.current = true;
			setCaptureError(null);

			try {
				const recording = await mediaRecorder.stopRecording();
				if (recording.durationMs < captureSettings.minRecordingMs) {
					await playCaptureEndSound();
					toast.warning("Video quá ngắn, bỏ qua");
					completeCycle(nextBarcode);
					return;
				}

				dispatchMachineEvent({ type: "saveStarted" });
				const session = await ensureDailySession();
				const record = await createCaptureRecord({
					sessionId: session.id,
					barcode: barcode.text,
					format: barcode.format,
					scannedAt: barcode.timestamp,
					videoBlob: recording.blob,
					videoDurationMs: recording.durationMs,
					mimeType: recording.mimeType,
				});

				setLastSavedRecord(record);
				onRecordSaved?.(record);
				toast.success("Đã lưu video kiểm hàng");
				await playEndSoundThenComplete(nextBarcode);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Không thể lưu video";
				setCaptureError(message);
				toast.error(message);
				await playEndSoundThenComplete(nextBarcode);
			} finally {
				savingRef.current = false;
			}
		},
		[captureSettings.minRecordingMs, completeCycle, dispatchMachineEvent, mediaRecorder, onRecordSaved, playEndSoundThenComplete],
	);

	const requestCloseAfterSave = useCallback(() => {
		const currentState = stateRef.current;
		if (currentState !== "recording" && currentState !== "saving") return false;

		updateCloseAfterSaveRequested(true);
		if (currentState === "recording") {
			void saveRecording();
		}
		return true;
	}, [saveRecording, updateCloseAfterSaveRequested]);

	const startRecording = useCallback(async () => {
		const barcode = activeBarcodeRef.current;
		const stream = videoRef.current?.srcObject;
		if (!barcode || !(stream instanceof MediaStream)) {
			setCaptureError("Camera chưa sẵn sàng để ghi hình");
			toast.error("Camera chưa sẵn sàng để ghi hình");
			completeCycle();
			return;
		}

		try {
			await getVideoSaveDir();
		} catch (error) {
			const message = normalizeCaptureStorageError(error, "Không thể truy cập thư mục lưu video");
			setCaptureError(message);
			toast.error(message);
			dispatchMachineEvent({ type: "recordingStartFailed" });
			return;
		}

		try {
			mediaRecorder.startRecording(stream, DETECTED_VIDEO_CODEC.mimeType);
			dispatchMachineEvent({ type: "recordingStarted" });
		} catch {
			setCaptureError("Không thể bắt đầu ghi hình");
			toast.error("Không thể bắt đầu ghi hình");
			dispatchMachineEvent({ type: "recordingStartFailed" });
		}
	}, [completeCycle, dispatchMachineEvent, mediaRecorder, videoRef]);

	const handleCountdownElapsed = useCallback(() => {
		dispatchMachineEvent({ type: "countdownElapsed" });
	}, [dispatchMachineEvent]);

	const countdown = useCountdown(handleCountdownElapsed);

	const observeCaptureBarcode = useCallback(
		(event: RawBarcodeEvent | null) => {
			const confirmed = observeBarcode(event);
			if (!confirmed) return null;

			dispatchMachineEvent({
				type: "barcodeConfirmed",
				barcode: confirmed,
				elapsedMs: mediaRecorder.getElapsedMs(),
			});
			return confirmed;
		},
		[dispatchMachineEvent, mediaRecorder, observeBarcode],
	);

	const stopRecording = useCallback(() => {
		dispatchMachineEvent({
			type: "stopRequested",
			elapsedMs: mediaRecorder.getElapsedMs(),
		});
	}, [dispatchMachineEvent, mediaRecorder]);

	const cancelCountdown = useCallback(() => {
		dispatchMachineEvent({ type: "cancelRequested" });
	}, [dispatchMachineEvent]);

	const handleCameraStreamEnded = useCallback(() => {
		dispatchMachineEvent({
			type: "streamEnded",
			elapsedMs: mediaRecorder.getElapsedMs(),
		});
	}, [dispatchMachineEvent, mediaRecorder]);

	const handleAppResumed = useCallback(() => {
		if (stateRef.current !== "recording") return;
		if (mediaRecorder.getRecorderState() === "recording") return;
		dispatchMachineEvent({
			type: "streamEnded",
			elapsedMs: mediaRecorder.getElapsedMs(),
		});
	}, [dispatchMachineEvent, mediaRecorder]);

	const submitManualBarcode = useCallback(
		(text: string) => {
			return observeCaptureBarcode({
				text,
				format: "MANUAL",
				source: "manual",
				timestamp: Date.now(),
			});
		},
		[observeCaptureBarcode],
	);

	useEffect(() => {
		if (state !== "recording") return;
		if (mediaRecorder.elapsedMs < captureSettings.maxRecordingMs) return;
		void saveRecording();
	}, [captureSettings.maxRecordingMs, mediaRecorder.elapsedMs, saveRecording, state]);

	useEffect(() => {
		let disposed = false;
		let unlisten: (() => void) | undefined;

		void import("@tauri-apps/api/window")
			.then(({ getCurrentWindow }) =>
				getCurrentWindow().onCloseRequested((event) => {
					if (requestCloseAfterSave()) {
						event.preventDefault();
					}
				}),
			)
			.then((nextUnlisten) => {
				if (disposed) {
					void nextUnlisten();
					return;
				}
				unlisten = nextUnlisten;
			})
			.catch(() => undefined);

		return () => {
			disposed = true;
			void unlisten?.();
		};
	}, [requestCloseAfterSave]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				handleAppResumed();
			}
		};

		window.addEventListener("focus", handleAppResumed);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			window.removeEventListener("focus", handleAppResumed);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [handleAppResumed]);

	function runMachineEffects(effects: CaptureMachineEffect[]) {
		for (const effect of effects) {
			if (effect.type === "beginCountdown") {
				setCaptureError(null);
				void playCaptureStartSound();
				countdown.startCountdown(captureSettings.countdownMs);
			}
			if (effect.type === "startRecording") {
				void startRecording();
			}
			if (effect.type === "saveRecording") {
				void saveRecording(effect.nextBarcode);
			}
			if (effect.type === "discardRecording") {
				void discardRecording(effect.nextBarcode);
			}
			if (effect.type === "cancelCountdown") {
				countdown.cancelCountdown();
			}
			if (effect.type === "warnRecordingTooShort") {
				toast.warning("Chưa đủ 1 giây");
			}
			if (effect.type === "resetStableBarcode") {
				resetStableBarcode();
			}
		}
	}

	machineEffectsRef.current = runMachineEffects;

	return {
		state,
		activeBarcode,
		countdownRemainingMs: countdown.remainingMs,
		recordingElapsedMs: mediaRecorder.elapsedMs,
		maxRecordingMs: captureSettings.maxRecordingMs,
		minRecordingMs: captureSettings.minRecordingMs,
		closeAfterSaveRequested,
		lastSavedRecord,
		captureError,
		observeCaptureBarcode,
		submitManualBarcode,
		stopRecording,
		cancelCountdown,
		handleCameraStreamEnded,
	};
}
