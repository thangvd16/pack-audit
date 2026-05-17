export interface RawBarcodeEvent {
	text: string;
	format: string;
	timestamp?: number;
	source?: "camera" | "manual";
}

export interface ConfirmedBarcode {
	text: string;
	format: string;
	timestamp: number;
	source: "camera" | "manual";
}

interface BarcodeCandidate {
	text: string;
	format: string;
	source: "camera" | "manual";
	firstSeenAt: number;
	emitted: boolean;
}

export class StableBarcodeGate {
	private candidate: BarcodeCandidate | null = null;
	private readonly thresholdMs: number;

	constructor(thresholdMs = 400) {
		this.thresholdMs = thresholdMs;
	}

	reset() {
		this.candidate = null;
	}

	observe(event: RawBarcodeEvent | null, fallbackTimestamp = Date.now()): ConfirmedBarcode | null {
		const now = event?.timestamp ?? fallbackTimestamp;

		if (!event || !isValidBarcodeText(event.text)) {
			if (!this.candidate?.emitted) {
				this.reset();
			}
			return null;
		}

		const text = event.text.trim();
		const format = event.format || "UNKNOWN";
		const source = event.source ?? "camera";

		if (source === "manual") {
			const confirmed = { text, format, timestamp: now, source };
			this.candidate = {
				text,
				format,
				source,
				firstSeenAt: now,
				emitted: true,
			};
			return confirmed;
		}

		if (!this.candidate || this.candidate.text !== text || this.candidate.format !== format) {
			this.candidate = {
				text,
				format,
				source,
				firstSeenAt: now,
				emitted: false,
			};
			return null;
		}

		if (this.candidate.emitted || now - this.candidate.firstSeenAt < this.thresholdMs) {
			return null;
		}

		this.candidate.emitted = true;
		return { text, format, timestamp: now, source };
	}
}

export function isValidBarcodeText(text: string) {
	const trimmed = text.trim();
	return trimmed.length > 0 && trimmed.length <= 256 && Array.from(trimmed).every((char) => !isControlCharacter(char));
}

function isControlCharacter(char: string) {
	return char.length === 0 || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127;
}
