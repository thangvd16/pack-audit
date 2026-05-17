import type { CaptureState } from "../types";
import type { ConfirmedBarcode } from "./stable-barcode.service";

export interface CaptureMachineSnapshot {
	state: CaptureState;
	activeBarcode: ConfirmedBarcode | null;
	pendingBarcode?: ConfirmedBarcode | null;
	minRecordingMs: number;
}

export type CaptureMachineEvent =
	| { type: "barcodeConfirmed"; barcode: ConfirmedBarcode; elapsedMs?: number }
	| { type: "countdownElapsed" }
	| { type: "recordingStarted" }
	| { type: "recordingStartFailed" }
	| { type: "cancelRequested" }
	| { type: "stopRequested"; elapsedMs: number }
	| { type: "streamEnded"; elapsedMs: number }
	| { type: "saveStarted" }
	| { type: "cycleCompleted"; nextBarcode?: ConfirmedBarcode };

export type CaptureMachineEffect =
	| { type: "beginCountdown"; barcode: ConfirmedBarcode }
	| { type: "startRecording" }
	| { type: "saveRecording"; nextBarcode?: ConfirmedBarcode }
	| { type: "discardRecording"; nextBarcode?: ConfirmedBarcode }
	| { type: "cancelCountdown" }
	| { type: "warnRecordingTooShort" }
	| { type: "resetStableBarcode" };

export interface CaptureMachineTransition {
	snapshot: CaptureMachineSnapshot;
	effects: CaptureMachineEffect[];
}

export function transitionCaptureMachine(snapshot: CaptureMachineSnapshot, event: CaptureMachineEvent): CaptureMachineTransition {
	if (event.type === "barcodeConfirmed") {
		return handleBarcodeConfirmed(snapshot, event.barcode, event.elapsedMs ?? 0);
	}

	if (event.type === "countdownElapsed") {
		if (snapshot.state !== "countdown") return unchanged(snapshot);
		return { snapshot, effects: [{ type: "startRecording" }] };
	}

	if (event.type === "recordingStarted") {
		if (snapshot.state !== "countdown") return unchanged(snapshot);
		return {
			snapshot: { ...snapshot, state: "recording" },
			effects: [{ type: "resetStableBarcode" }],
		};
	}

	if (event.type === "recordingStartFailed") {
		if (snapshot.state !== "countdown") return unchanged(snapshot);
		return completeCycle(snapshot);
	}

	if (event.type === "cancelRequested") {
		if (snapshot.state !== "countdown") return unchanged(snapshot);
		return cancelCountdown(snapshot);
	}

	if (event.type === "stopRequested") {
		if (snapshot.state !== "recording") return unchanged(snapshot);
		return saveOrWarn(snapshot, event.elapsedMs, false);
	}

	if (event.type === "streamEnded") {
		if (snapshot.state !== "recording") return unchanged(snapshot);
		return event.elapsedMs >= snapshot.minRecordingMs
			? { snapshot, effects: [{ type: "saveRecording" }] }
			: { snapshot, effects: [{ type: "discardRecording" }] };
	}

	if (event.type === "saveStarted") {
		if (snapshot.state !== "recording") return unchanged(snapshot);
		return { snapshot: { ...snapshot, state: "saving" }, effects: [] };
	}

	if (event.type === "cycleCompleted") {
		return completeCycle(snapshot, event.nextBarcode);
	}

	return unchanged(snapshot);
}

function handleBarcodeConfirmed(snapshot: CaptureMachineSnapshot, barcode: ConfirmedBarcode, elapsedMs: number): CaptureMachineTransition {
	if (snapshot.state === "saving") {
		return {
			snapshot: {
				...snapshot,
				pendingBarcode: barcode,
			},
			effects: [],
		};
	}

	if (snapshot.state === "idle" || snapshot.state === "countdown") {
		const baseSnapshot = withoutPendingBarcode(snapshot);
		return {
			snapshot: {
				...baseSnapshot,
				state: "countdown",
				activeBarcode: barcode,
			},
			effects: [{ type: "beginCountdown", barcode }],
		};
	}

	if (snapshot.state !== "recording") {
		return unchanged(snapshot);
	}

	if (!snapshot.activeBarcode) {
		return unchanged(snapshot);
	}

	if (snapshot.activeBarcode.text === barcode.text) {
		return saveOrWarn(snapshot, elapsedMs, true);
	}

	if (elapsedMs >= snapshot.minRecordingMs) {
		return { snapshot, effects: [{ type: "saveRecording", nextBarcode: barcode }] };
	}

	return { snapshot, effects: [{ type: "discardRecording", nextBarcode: barcode }] };
}

function saveOrWarn(snapshot: CaptureMachineSnapshot, elapsedMs: number, resetStableBarcode: boolean): CaptureMachineTransition {
	if (elapsedMs >= snapshot.minRecordingMs) {
		return { snapshot, effects: [{ type: "saveRecording" }] };
	}

	return {
		snapshot,
		effects: resetStableBarcode ? [{ type: "warnRecordingTooShort" }, { type: "resetStableBarcode" }] : [{ type: "warnRecordingTooShort" }],
	};
}

function completeCycle(snapshot: CaptureMachineSnapshot, nextBarcode?: ConfirmedBarcode): CaptureMachineTransition {
	const queuedBarcode = nextBarcode ?? snapshot.pendingBarcode ?? null;

	if (queuedBarcode) {
		const baseSnapshot = withoutPendingBarcode(snapshot);
		return {
			snapshot: {
				...baseSnapshot,
				state: "countdown",
				activeBarcode: queuedBarcode,
			},
			effects: [{ type: "resetStableBarcode" }, { type: "beginCountdown", barcode: queuedBarcode }],
		};
	}

	const baseSnapshot = withoutPendingBarcode(snapshot);
	return {
		snapshot: {
			...baseSnapshot,
			state: "idle",
			activeBarcode: null,
		},
		effects: [{ type: "resetStableBarcode" }],
	};
}

function cancelCountdown(snapshot: CaptureMachineSnapshot): CaptureMachineTransition {
	const baseSnapshot = withoutPendingBarcode(snapshot);
	return {
		snapshot: {
			...baseSnapshot,
			state: "idle",
			activeBarcode: null,
		},
		effects: [{ type: "cancelCountdown" }, { type: "resetStableBarcode" }],
	};
}

function withoutPendingBarcode(snapshot: CaptureMachineSnapshot): CaptureMachineSnapshot {
	const { pendingBarcode: _pendingBarcode, ...rest } = snapshot;
	return rest;
}

function unchanged(snapshot: CaptureMachineSnapshot): CaptureMachineTransition {
	return { snapshot, effects: [] };
}
