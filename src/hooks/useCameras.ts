import { useState, useEffect, useCallback } from "react";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export function useCameras() {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const enumerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Không nhận được phản hồi từ camera sau 8 giây. Kiểm tra System Settings → Privacy & Security → Camera."
              )
            ),
          8000
        )
      );

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ video: true }),
        timeoutPromise,
      ]);

      stream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setCameras(videoDevices);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Không thể truy cập camera";
      const isPermissionDenied =
        msg.includes("denied") ||
        msg.includes("NotAllowed") ||
        msg.includes("Permission");
      setError(
        isPermissionDenied
          ? "Quyền truy cập camera bị từ chối. Vào System Settings → Privacy & Security → Camera để cấp quyền."
          : msg
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
