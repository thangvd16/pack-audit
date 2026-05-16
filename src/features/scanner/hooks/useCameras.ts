import { useCallback, useEffect, useState } from "react";
import type { CameraDevice } from "../types";

export function useCameras() {
	const [cameras, setCameras] = useState<CameraDevice[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [initialized, setInitialized] = useState(false);

	const tryGetStream = async (timeoutMs: number): Promise<MediaStream> => {
		const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs));
		return Promise.race([navigator.mediaDevices.getUserMedia({ video: true }), timeoutPromise]);
	};

	const enumerate = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			let stream: MediaStream;
			try {
				stream = await tryGetStream(20000);
			} catch (firstErr) {
				const msg = firstErr instanceof Error ? firstErr.message : "";
				const isDenied = msg.includes("denied") || msg.includes("NotAllowed") || msg.includes("NotFoundError");

				if (isDenied) throw firstErr;

				let permissionGranted = false;
				try {
					const status = await navigator.permissions.query({
						name: "camera" as PermissionName,
					});
					permissionGranted = status.state === "granted";
				} catch {
					permissionGranted = true;
				}

				if (!permissionGranted) throw firstErr;

				await new Promise((r) => setTimeout(r, 1000));
				stream = await tryGetStream(10000);
			}

			stream.getTracks().forEach((track) => track.stop());

			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices
				.filter((device) => device.kind === "videoinput")
				.map((device, index) => ({
					deviceId: device.deviceId,
					label: device.label || `Camera ${index + 1}`,
				}));
			setCameras(videoDevices);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Không thể truy cập camera";
			const isPermissionDenied = msg.includes("denied") || msg.includes("NotAllowed") || msg.includes("Permission");
			setError(
				isPermissionDenied
					? "Quyền truy cập camera bị từ chối. Vào Settings → Privacy & Security → Camera để cấp quyền."
					: "Không thể kết nối camera. Vui lòng thử lại.",
			);
			setCameras([]);
		} finally {
			setLoading(false);
			setInitialized(true);
		}
	}, []);

	useEffect(() => {
		if (!initialized) return;
		navigator.mediaDevices.addEventListener("devicechange", enumerate);
		return () => {
			navigator.mediaDevices.removeEventListener("devicechange", enumerate);
		};
	}, [initialized, enumerate]);

	return { cameras, loading, error, initialized, refresh: enumerate };
}
