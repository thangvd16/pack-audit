import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

function normalizeCameraError(error: Error) {
	const message = error.message || error.name;
	const normalizedMessage = message.toLowerCase();
	if (message.includes("NotAllowed") || normalizedMessage.includes("permission") || normalizedMessage.includes("denied")) {
		return "Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera rồi thử lại.";
	}
	if (message.includes("NotFound") || message.includes("DevicesNotFound")) {
		return "Không tìm thấy camera khả dụng.";
	}
	if (message.includes("NotReadable") || message.includes("TrackStart")) {
		return "Không thể mở camera. Camera có thể đang được ứng dụng khác sử dụng.";
	}
	if (message.includes("Overconstrained")) {
		return "Camera không hỗ trợ cấu hình quét hiện tại.";
	}
	if (message.includes("Security")) {
		return "Trình duyệt đang chặn quyền truy cập camera.";
	}
	return "Lỗi khởi động camera";
}

export function useCameraPreview(
	videoRef: RefObject<HTMLVideoElement | null>,
	deviceId: string | null,
	onStreamEnded?: () => void,
) {
	const [scanning, setScanning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const onStreamEndedRef = useRef(onStreamEnded);

	useEffect(() => {
		onStreamEndedRef.current = onStreamEnded;
	});

	const stop = useCallback(() => {
		for (const track of streamRef.current?.getTracks() ?? []) {
			track.stop();
		}
		streamRef.current = null;
		if (videoRef.current?.srcObject) {
			videoRef.current.srcObject = null;
		}
		setScanning(false);
	}, [videoRef]);

	useEffect(() => {
		if (!deviceId || !videoRef.current) {
			stop();
			return;
		}

		let active = true;
		let streamEnded = false;
		let stream: MediaStream | null = null;

		const handleStreamEnded = () => {
			if (!active || streamEnded) return;
			streamEnded = true;
			setScanning(false);
			setError("Camera bị ngắt kết nối");
			onStreamEndedRef.current?.();
		};

		const startPreview = async () => {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { deviceId: { exact: deviceId } },
					audio: false,
				});

				if (!active) {
					for (const track of stream.getTracks()) track.stop();
					return;
				}

				streamRef.current = stream;
				for (const track of stream.getVideoTracks()) {
					track.addEventListener("ended", handleStreamEnded);
				}

				videoRef.current!.srcObject = stream;
				setScanning(true);
				setError(null);
			} catch (err) {
				if (!active) return;
				setError(normalizeCameraError(err instanceof Error ? err : new Error("Lỗi khởi động camera")));
				setScanning(false);
			}
		};

		void startPreview();

		return () => {
			active = false;
			for (const track of stream?.getVideoTracks() ?? []) {
				track.removeEventListener("ended", handleStreamEnded);
			}
			stop();
		};
	}, [deviceId, videoRef, stop]);

	return { scanning, error };
}
