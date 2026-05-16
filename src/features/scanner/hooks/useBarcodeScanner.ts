import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";
import type { ScanResult } from "../types";

export function useBarcodeScanner(
	videoRef: RefObject<HTMLVideoElement | null>,
	deviceId: string | null,
	onScan: (result: ScanResult) => void,
	cooldownMs = 2000,
) {
	const [scanning, setScanning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const controlsRef = useRef<IScannerControls | null>(null);
	const lastScanRef = useRef<{ text: string; timestamp: number } | null>(null);
	const onScanRef = useRef(onScan);

	useEffect(() => {
		onScanRef.current = onScan;
	});

	const stop = useCallback(() => {
		controlsRef.current?.stop();
		controlsRef.current = null;
		setScanning(false);
	}, []);

	useEffect(() => {
		if (!deviceId || !videoRef.current) {
			stop();
			return;
		}

		let active = true;
		const reader = new BrowserMultiFormatReader();

		reader
			.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
				if (!active) return;

				if (result) {
					const text = result.getText();
					const now = Date.now();

					if (lastScanRef.current && lastScanRef.current.text === text && now - lastScanRef.current.timestamp < cooldownMs) {
						return;
					}

					lastScanRef.current = { text, timestamp: now };
					onScanRef.current({
						text,
						format: BarcodeFormat[result.getBarcodeFormat()] ?? "UNKNOWN",
						timestamp: now,
					});
				}

				if (err && err.name !== "NotFoundException") {
					console.warn("[BarcodeScanner]", err);
				}
			})
			.then((controls) => {
				if (active) {
					controlsRef.current = controls;
					setScanning(true);
					setError(null);
				} else {
					controls.stop();
				}
			})
			.catch((err: Error) => {
				if (active) {
					setError(err.message || "Lỗi khởi động camera");
					setScanning(false);
				}
			});

		return () => {
			active = false;
			controlsRef.current?.stop();
			controlsRef.current = null;
			setScanning(false);
		};
	}, [deviceId, videoRef, stop, cooldownMs]);

	return { scanning, error };
}
