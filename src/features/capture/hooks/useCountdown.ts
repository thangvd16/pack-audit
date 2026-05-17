import { useCallback, useEffect, useRef, useState } from "react";

export function useCountdown(onComplete: () => void) {
	const [remainingMs, setRemainingMs] = useState(0);
	const [active, setActive] = useState(false);
	const endsAtRef = useRef<number | null>(null);
	const onCompleteRef = useRef(onComplete);

	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	const cancelCountdown = useCallback(() => {
		endsAtRef.current = null;
		setRemainingMs(0);
		setActive(false);
	}, []);

	const startCountdown = useCallback((durationMs: number) => {
		endsAtRef.current = Date.now() + durationMs;
		setRemainingMs(durationMs);
		setActive(true);
	}, []);

	useEffect(() => {
		if (!active) return;

		const tick = () => {
			const endsAt = endsAtRef.current;
			if (!endsAt) return;

			const nextRemainingMs = Math.max(0, endsAt - Date.now());
			setRemainingMs(nextRemainingMs);

			if (nextRemainingMs === 0) {
				endsAtRef.current = null;
				setActive(false);
				onCompleteRef.current();
			}
		};

		tick();
		const interval = window.setInterval(tick, 50);
		return () => window.clearInterval(interval);
	}, [active]);

	return { active, remainingMs, startCountdown, cancelCountdown };
}
