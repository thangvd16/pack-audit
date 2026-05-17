import { describe, expect, it } from "vitest";
import { isValidBarcodeText, StableBarcodeGate } from "./stable-barcode.service";

describe("StableBarcodeGate", () => {
	it("waits until the same camera barcode is stable for the threshold", () => {
		const gate = new StableBarcodeGate(400);

		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_000 })).toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_399 })).toBeNull();

		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_400 })).toEqual({
			text: "PKG-001",
			format: "CODE_128",
			timestamp: 1_400,
			source: "camera",
		});
	});

	it("does not confirm barcode jitter below the threshold", () => {
		const gate = new StableBarcodeGate(400);

		expect(gate.observe({ text: "A", format: "CODE_128", timestamp: 1_000 })).toBeNull();
		expect(gate.observe(null, 1_200)).toBeNull();
		expect(gate.observe({ text: "A", format: "CODE_128", timestamp: 1_250 })).toBeNull();
		expect(gate.observe({ text: "A", format: "CODE_128", timestamp: 1_500 })).toBeNull();
	});

	it("does not confirm rapidly switching camera barcodes", () => {
		const gate = new StableBarcodeGate(400);

		expect(gate.observe({ text: "A", format: "CODE_128", timestamp: 1_000 })).toBeNull();
		expect(gate.observe({ text: "B", format: "CODE_128", timestamp: 1_200 })).toBeNull();
		expect(gate.observe({ text: "A", format: "CODE_128", timestamp: 1_350 })).toBeNull();
		expect(gate.observe({ text: "B", format: "CODE_128", timestamp: 1_550 })).toBeNull();
	});

	it("confirms manual barcode input immediately", () => {
		const gate = new StableBarcodeGate(400);

		expect(gate.observe({ text: " MANUAL-001 ", format: "MANUAL", source: "manual", timestamp: 2_000 })).toEqual({
			text: "MANUAL-001",
			format: "MANUAL",
			timestamp: 2_000,
			source: "manual",
		});
	});

	it("emits a confirmed camera barcode once per stable cycle until reset", () => {
		const gate = new StableBarcodeGate(400);

		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_000 })).toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_400 })).not.toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 2_000 })).toBeNull();

		gate.reset();

		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 2_100 })).toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 2_500 })).not.toBeNull();
	});

	it("does not re-confirm the active camera barcode after it disappears during countdown", () => {
		const gate = new StableBarcodeGate(400);

		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_000 })).toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_400 })).not.toBeNull();

		expect(gate.observe(null, 1_500)).toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_600 })).toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 2_100 })).toBeNull();
	});

	it("can confirm a different camera barcode after the active barcode disappears", () => {
		const gate = new StableBarcodeGate(400);

		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_000 })).toBeNull();
		expect(gate.observe({ text: "PKG-001", format: "CODE_128", timestamp: 1_400 })).not.toBeNull();

		expect(gate.observe(null, 1_500)).toBeNull();
		expect(gate.observe({ text: "PKG-002", format: "CODE_128", timestamp: 1_600 })).toBeNull();
		expect(gate.observe({ text: "PKG-002", format: "CODE_128", timestamp: 2_000 })).toEqual({
			text: "PKG-002",
			format: "CODE_128",
			timestamp: 2_000,
			source: "camera",
		});
	});
});

describe("isValidBarcodeText", () => {
	it("accepts non-empty printable barcode text up to 256 characters", () => {
		expect(isValidBarcodeText("PKG-001")).toBe(true);
		expect(isValidBarcodeText("x".repeat(256))).toBe(true);
	});

	it("rejects blank, overlong, and control-character barcode text", () => {
		expect(isValidBarcodeText("   ")).toBe(false);
		expect(isValidBarcodeText("x".repeat(257))).toBe(false);
		expect(isValidBarcodeText("PKG\n001")).toBe(false);
	});
});
