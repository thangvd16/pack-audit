import { useCallback, useRef, useState } from "react";
import { StableBarcodeGate, type ConfirmedBarcode, type RawBarcodeEvent } from "../services/stable-barcode.service";

export type { ConfirmedBarcode, RawBarcodeEvent };
export { isValidBarcodeText } from "../services/stable-barcode.service";

export function useStableBarcode(thresholdMs = 400) {
	const gateRef = useRef(new StableBarcodeGate(thresholdMs));
	const thresholdRef = useRef(thresholdMs);
	const [confirmedBarcode, setConfirmedBarcode] = useState<ConfirmedBarcode | null>(null);

	if (thresholdRef.current !== thresholdMs) {
		thresholdRef.current = thresholdMs;
		gateRef.current = new StableBarcodeGate(thresholdMs);
	}

	const resetStableBarcode = useCallback(() => {
		gateRef.current.reset();
		setConfirmedBarcode(null);
	}, []);

	const observeBarcode = useCallback((event: RawBarcodeEvent | null): ConfirmedBarcode | null => {
		const confirmed = gateRef.current.observe(event);
		if (!confirmed) return null;
		setConfirmedBarcode(confirmed);
		return confirmed;
	}, []);

	return { confirmedBarcode, observeBarcode, resetStableBarcode };
}
