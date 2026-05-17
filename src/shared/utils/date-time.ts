export function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function formatDateTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function formatDurationMs(durationMs: number | null | undefined): string {
	if (durationMs === null || durationMs === undefined) return "—";

	const totalSeconds = Math.max(0, Math.round(durationMs / 1_000));
	const hours = Math.floor(totalSeconds / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;
	const paddedSeconds = seconds.toString().padStart(2, "0");

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
	}

	return `${minutes}:${paddedSeconds}`;
}
