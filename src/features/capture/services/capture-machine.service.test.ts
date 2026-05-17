import { describe, expect, it } from "vitest";
import { transitionCaptureMachine, type CaptureMachineSnapshot } from "./capture-machine.service";

const barcodeA = {
	text: "PKG-A",
	format: "CODE_128",
	timestamp: 1_000,
	source: "camera" as const,
};

const barcodeB = {
	text: "PKG-B",
	format: "CODE_128",
	timestamp: 2_000,
	source: "camera" as const,
};

const barcodeC = {
	text: "PKG-C",
	format: "CODE_128",
	timestamp: 3_000,
	source: "camera" as const,
};

const recordingA: CaptureMachineSnapshot = {
	state: "recording",
	activeBarcode: barcodeA,
	minRecordingMs: 1_000,
};

const idle: CaptureMachineSnapshot = {
	state: "idle",
	activeBarcode: null,
	minRecordingMs: 1_000,
};

describe("transitionCaptureMachine", () => {
	it("starts a countdown when a barcode is confirmed from idle", () => {
		const result = transitionCaptureMachine(idle, { type: "barcodeConfirmed", barcode: barcodeA });

		expect(result.snapshot).toEqual({
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		});
		expect(result.effects).toEqual([{ type: "beginCountdown", barcode: barcodeA }]);
	});

	it("requests recorder start after countdown and marks recording after recorder starts", () => {
		const countdown: CaptureMachineSnapshot = {
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		};

		expect(transitionCaptureMachine(countdown, { type: "countdownElapsed" })).toEqual({
			snapshot: countdown,
			effects: [{ type: "startRecording" }],
		});

		expect(transitionCaptureMachine(countdown, { type: "recordingStarted" })).toEqual({
			snapshot: { ...countdown, state: "recording" },
			effects: [{ type: "resetStableBarcode" }],
		});
	});

	it("covers H1: camera scan starts countdown, same-code re-scan saves, then returns idle", () => {
		const countdownA = transitionCaptureMachine(idle, { type: "barcodeConfirmed", barcode: barcodeA });
		const countdownElapsed = transitionCaptureMachine(countdownA.snapshot, { type: "countdownElapsed" });
		const recordingAStarted = transitionCaptureMachine(countdownA.snapshot, { type: "recordingStarted" });
		const saveA = transitionCaptureMachine(recordingAStarted.snapshot, { type: "barcodeConfirmed", barcode: barcodeA, elapsedMs: 1_000 });
		const savingA = transitionCaptureMachine(saveA.snapshot, { type: "saveStarted" });
		const completed = transitionCaptureMachine(savingA.snapshot, { type: "cycleCompleted" });

		expect(countdownA.effects).toEqual([{ type: "beginCountdown", barcode: barcodeA }]);
		expect(countdownElapsed.effects).toEqual([{ type: "startRecording" }]);
		expect(recordingAStarted.effects).toEqual([{ type: "resetStableBarcode" }]);
		expect(saveA.effects).toEqual([{ type: "saveRecording" }]);
		expect(savingA.snapshot.state).toBe("saving");
		expect(completed.snapshot).toEqual({
			state: "idle",
			activeBarcode: null,
			minRecordingMs: 1_000,
		});
		expect(completed.effects).toEqual([{ type: "resetStableBarcode" }]);
	});

	it("covers H2: stop button saves after minimum duration and completes the cycle", () => {
		const saveA = transitionCaptureMachine(recordingA, { type: "stopRequested", elapsedMs: 1_000 });
		const savingA = transitionCaptureMachine(saveA.snapshot, { type: "saveStarted" });
		const completed = transitionCaptureMachine(savingA.snapshot, { type: "cycleCompleted" });

		expect(saveA.effects).toEqual([{ type: "saveRecording" }]);
		expect(savingA.snapshot.state).toBe("saving");
		expect(completed.snapshot).toEqual(idle);
	});

	it("covers H3: manual barcode uses the same countdown and save flow", () => {
		const manualBarcode = { ...barcodeA, format: "MANUAL", source: "manual" as const };

		const countdownA = transitionCaptureMachine(idle, { type: "barcodeConfirmed", barcode: manualBarcode });
		const countdownElapsed = transitionCaptureMachine(countdownA.snapshot, { type: "countdownElapsed" });
		const recordingAStarted = transitionCaptureMachine(countdownA.snapshot, { type: "recordingStarted" });
		const saveA = transitionCaptureMachine(recordingAStarted.snapshot, { type: "stopRequested", elapsedMs: 1_000 });
		const savingA = transitionCaptureMachine(saveA.snapshot, { type: "saveStarted" });
		const completed = transitionCaptureMachine(savingA.snapshot, { type: "cycleCompleted" });

		expect(countdownA).toEqual({
			snapshot: {
				state: "countdown",
				activeBarcode: manualBarcode,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "beginCountdown", barcode: manualBarcode }],
		});
		expect(countdownElapsed.effects).toEqual([{ type: "startRecording" }]);
		expect(recordingAStarted.effects).toEqual([{ type: "resetStableBarcode" }]);
		expect(saveA.effects).toEqual([{ type: "saveRecording" }]);
		expect(completed.snapshot).toEqual(idle);
	});

	it("covers H4: a second barcode starts and saves immediately after the previous cycle completes", () => {
		const countdownA = transitionCaptureMachine(idle, { type: "barcodeConfirmed", barcode: barcodeA });
		const recordingAStarted = transitionCaptureMachine(countdownA.snapshot, { type: "recordingStarted" });
		const saveA = transitionCaptureMachine(recordingAStarted.snapshot, { type: "barcodeConfirmed", barcode: barcodeA, elapsedMs: 1_000 });
		const savingA = transitionCaptureMachine(saveA.snapshot, { type: "saveStarted" });
		const idleAfterA = transitionCaptureMachine(savingA.snapshot, { type: "cycleCompleted" });
		const countdownB = transitionCaptureMachine(idleAfterA.snapshot, { type: "barcodeConfirmed", barcode: barcodeB });
		const recordingBStarted = transitionCaptureMachine(countdownB.snapshot, { type: "recordingStarted" });
		const saveB = transitionCaptureMachine(recordingBStarted.snapshot, { type: "stopRequested", elapsedMs: 1_000 });

		expect(idleAfterA.snapshot).toEqual(idle);
		expect(countdownB.snapshot).toEqual({
			state: "countdown",
			activeBarcode: barcodeB,
			minRecordingMs: 1_000,
		});
		expect(countdownB.effects).toEqual([{ type: "beginCountdown", barcode: barcodeB }]);
		expect(saveA.effects).toEqual([{ type: "saveRecording" }]);
		expect(saveB.effects).toEqual([{ type: "saveRecording" }]);
	});

	it("does not emit a second save while the current cycle is already saving", () => {
		const savingA: CaptureMachineSnapshot = { ...recordingA, state: "saving" };

		expect(transitionCaptureMachine(savingA, { type: "stopRequested", elapsedMs: 1_500 })).toEqual({
			snapshot: savingA,
			effects: [],
		});
		expect(transitionCaptureMachine(savingA, { type: "barcodeConfirmed", barcode: barcodeA, elapsedMs: 1_500 })).toEqual({
			snapshot: {
				state: "saving",
				activeBarcode: barcodeA,
				pendingBarcode: barcodeA,
				minRecordingMs: 1_000,
			},
			effects: [],
		});
	});

	it("restarts countdown with a different barcode while countdown is active", () => {
		const countdownA: CaptureMachineSnapshot = {
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		};

		expect(transitionCaptureMachine(countdownA, { type: "barcodeConfirmed", barcode: barcodeB })).toEqual({
			snapshot: {
				state: "countdown",
				activeBarcode: barcodeB,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "beginCountdown", barcode: barcodeB }],
		});
	});

	it("restarts countdown with the same barcode while countdown is active", () => {
		const countdownA: CaptureMachineSnapshot = {
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		};

		expect(transitionCaptureMachine(countdownA, { type: "barcodeConfirmed", barcode: barcodeA })).toEqual({
			snapshot: countdownA,
			effects: [{ type: "beginCountdown", barcode: barcodeA }],
		});
	});

	it("covers I2: manual input with a different barcode restarts active countdown", () => {
		const countdownA: CaptureMachineSnapshot = {
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		};
		const manualBarcodeB = { ...barcodeB, format: "MANUAL", source: "manual" as const };

		expect(transitionCaptureMachine(countdownA, { type: "barcodeConfirmed", barcode: manualBarcodeB })).toEqual({
			snapshot: {
				state: "countdown",
				activeBarcode: manualBarcodeB,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "beginCountdown", barcode: manualBarcodeB }],
		});
	});

	it("covers I3: manual input with the same barcode resets active countdown", () => {
		const countdownA: CaptureMachineSnapshot = {
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		};
		const manualBarcodeA = { ...barcodeA, format: "MANUAL", source: "manual" as const };

		expect(transitionCaptureMachine(countdownA, { type: "barcodeConfirmed", barcode: manualBarcodeA })).toEqual({
			snapshot: {
				state: "countdown",
				activeBarcode: manualBarcodeA,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "beginCountdown", barcode: manualBarcodeA }],
		});
	});

	it("cancels an active countdown back to idle", () => {
		const countdownA: CaptureMachineSnapshot = {
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		};

		expect(transitionCaptureMachine(countdownA, { type: "cancelRequested" })).toEqual({
			snapshot: {
				state: "idle",
				activeBarcode: null,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "cancelCountdown" }, { type: "resetStableBarcode" }],
		});
	});

	it("warns and keeps recording when stop is requested before minimum duration", () => {
		const result = transitionCaptureMachine(recordingA, {
			type: "stopRequested",
			elapsedMs: 999,
		});

		expect(result.snapshot).toEqual(recordingA);
		expect(result.effects).toEqual([{ type: "warnRecordingTooShort" }]);
	});

	it("saves when stop is requested after minimum duration", () => {
		const result = transitionCaptureMachine(recordingA, {
			type: "stopRequested",
			elapsedMs: 1_000,
		});

		expect(result.snapshot).toEqual(recordingA);
		expect(result.effects).toEqual([{ type: "saveRecording" }]);
	});

	it("ignores a stale stop request while idle", () => {
		const idle: CaptureMachineSnapshot = {
			state: "idle",
			activeBarcode: null,
			minRecordingMs: 1_000,
		};

		expect(transitionCaptureMachine(idle, { type: "stopRequested", elapsedMs: 1_500 })).toEqual({
			snapshot: idle,
			effects: [],
		});
	});

	it("keeps countdown running when the camera stream ends before recording starts", () => {
		const countdownA: CaptureMachineSnapshot = {
			state: "countdown",
			activeBarcode: barcodeA,
			minRecordingMs: 1_000,
		};

		expect(transitionCaptureMachine(countdownA, { type: "streamEnded", elapsedMs: 0 })).toEqual({
			snapshot: countdownA,
			effects: [],
		});
	});

	it("saves a partial recording when the camera stream ends after minimum duration", () => {
		expect(transitionCaptureMachine(recordingA, { type: "streamEnded", elapsedMs: 1_000 })).toEqual({
			snapshot: recordingA,
			effects: [{ type: "saveRecording" }],
		});
	});

	it("discards a partial recording when the camera stream ends before minimum duration", () => {
		expect(transitionCaptureMachine(recordingA, { type: "streamEnded", elapsedMs: 999 })).toEqual({
			snapshot: recordingA,
			effects: [{ type: "discardRecording" }],
		});
	});

	it("saves the current recording and carries the next barcode when switching after minimum duration", () => {
		const result = transitionCaptureMachine(recordingA, {
			type: "barcodeConfirmed",
			barcode: barcodeB,
			elapsedMs: 1_000,
		});

		expect(result.snapshot).toEqual(recordingA);
		expect(result.effects).toEqual([{ type: "saveRecording", nextBarcode: barcodeB }]);
	});

	it("discards the current recording and carries the next barcode when switching before minimum duration", () => {
		const result = transitionCaptureMachine(recordingA, {
			type: "barcodeConfirmed",
			barcode: barcodeB,
			elapsedMs: 999,
		});

		expect(result.snapshot).toEqual(recordingA);
		expect(result.effects).toEqual([{ type: "discardRecording", nextBarcode: barcodeB }]);
	});

	it("emits a single terminal recording effect when a cycle is saved or discarded", () => {
		expect(transitionCaptureMachine(recordingA, { type: "stopRequested", elapsedMs: 1_000 }).effects).toEqual([{ type: "saveRecording" }]);
		expect(transitionCaptureMachine(recordingA, { type: "barcodeConfirmed", barcode: barcodeB, elapsedMs: 1_000 }).effects).toEqual([
			{ type: "saveRecording", nextBarcode: barcodeB },
		]);
		expect(transitionCaptureMachine(recordingA, { type: "barcodeConfirmed", barcode: barcodeB, elapsedMs: 999 }).effects).toEqual([
			{ type: "discardRecording", nextBarcode: barcodeB },
		]);
		expect(transitionCaptureMachine(recordingA, { type: "streamEnded", elapsedMs: 999 }).effects).toEqual([{ type: "discardRecording" }]);
	});

	it("saves a same-code re-scan after minimum duration", () => {
		const result = transitionCaptureMachine(recordingA, {
			type: "barcodeConfirmed",
			barcode: barcodeA,
			elapsedMs: 1_000,
		});

		expect(result.snapshot).toEqual(recordingA);
		expect(result.effects).toEqual([{ type: "saveRecording" }]);
	});

	it("resets the stable gate after a too-short same-code re-scan so a later re-scan can stop", () => {
		const tooShort = transitionCaptureMachine(recordingA, {
			type: "barcodeConfirmed",
			barcode: barcodeA,
			elapsedMs: 500,
		});

		expect(tooShort.snapshot).toEqual(recordingA);
		expect(tooShort.effects).toEqual([{ type: "warnRecordingTooShort" }, { type: "resetStableBarcode" }]);

		const longEnough = transitionCaptureMachine(tooShort.snapshot, {
			type: "barcodeConfirmed",
			barcode: barcodeA,
			elapsedMs: 1_200,
		});

		expect(longEnough.snapshot).toEqual(recordingA);
		expect(longEnough.effects).toEqual([{ type: "saveRecording" }]);
	});

	it("starts the next countdown after a switched recording cycle completes", () => {
		expect(transitionCaptureMachine({ ...recordingA, state: "saving" }, { type: "cycleCompleted", nextBarcode: barcodeB })).toEqual({
			snapshot: {
				state: "countdown",
				activeBarcode: barcodeB,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "resetStableBarcode" }, { type: "beginCountdown", barcode: barcodeB }],
		});
	});

	it("queues a barcode while saving and starts it after the save cycle completes", () => {
		const savingA: CaptureMachineSnapshot = { ...recordingA, state: "saving" };

		const queued = transitionCaptureMachine(savingA, {
			type: "barcodeConfirmed",
			barcode: barcodeB,
		});

		expect(queued).toEqual({
			snapshot: { ...savingA, pendingBarcode: barcodeB },
			effects: [],
		});

		expect(transitionCaptureMachine(queued.snapshot, { type: "cycleCompleted" })).toEqual({
			snapshot: {
				state: "countdown",
				activeBarcode: barcodeB,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "resetStableBarcode" }, { type: "beginCountdown", barcode: barcodeB }],
		});
	});

	it("keeps the latest queued barcode while saving", () => {
		const savingA: CaptureMachineSnapshot = { ...recordingA, state: "saving", pendingBarcode: barcodeB };

		expect(
			transitionCaptureMachine(savingA, {
				type: "barcodeConfirmed",
				barcode: barcodeC,
			}),
		).toEqual({
			snapshot: { ...savingA, pendingBarcode: barcodeC },
			effects: [],
		});
	});

	it("moves through saving and completes the cycle back to idle", () => {
		expect(transitionCaptureMachine(recordingA, { type: "saveStarted" })).toEqual({
			snapshot: { ...recordingA, state: "saving" },
			effects: [],
		});

		expect(transitionCaptureMachine({ ...recordingA, state: "saving" }, { type: "cycleCompleted" })).toEqual({
			snapshot: {
				state: "idle",
				activeBarcode: null,
				minRecordingMs: 1_000,
			},
			effects: [{ type: "resetStableBarcode" }],
		});
	});
});
