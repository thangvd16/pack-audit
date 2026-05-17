import { useCallback, useEffect, useRef, useState } from "react";

export interface RecordingResult {
	blob: Blob;
	durationMs: number;
	mimeType: string;
	startedAt: number;
	stoppedAt: number;
}

export function useMediaRecorder() {
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const startedAtRef = useRef<number | null>(null);
	const mimeTypeRef = useRef("");
	const stopPromiseRef = useRef<Promise<RecordingResult> | null>(null);
	const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
	const [elapsedMs, setElapsedMs] = useState(0);

	useEffect(() => {
		if (!recordingStartedAt) return;

		const updateElapsed = () => setElapsedMs(Date.now() - recordingStartedAt);
		updateElapsed();
		const interval = window.setInterval(updateElapsed, 250);
		return () => window.clearInterval(interval);
	}, [recordingStartedAt]);

	const getElapsedMs = useCallback(() => {
		return startedAtRef.current ? Date.now() - startedAtRef.current : 0;
	}, []);

	const resetRecorderState = useCallback(() => {
		recorderRef.current = null;
		chunksRef.current = [];
		startedAtRef.current = null;
		mimeTypeRef.current = "";
		stopPromiseRef.current = null;
		setRecordingStartedAt(null);
		setElapsedMs(0);
	}, []);

	const finishRecording = useCallback(
		(startedAt: number, mimeType: string) => {
			const stoppedAt = Date.now();
			const blob = new Blob(chunksRef.current, { type: mimeType });
			resetRecorderState();
			return {
				blob,
				durationMs: stoppedAt - startedAt,
				mimeType,
				startedAt,
				stoppedAt,
			};
		},
		[resetRecorderState],
	);

	const startRecording = useCallback((stream: MediaStream, mimeType: string) => {
		if (recorderRef.current?.state === "recording") {
			throw new Error("Đang ghi hình");
		}

		const recorder = new MediaRecorder(stream, { mimeType });
		const startedAt = Date.now();
		chunksRef.current = [];
		startedAtRef.current = startedAt;
		mimeTypeRef.current = mimeType;
		recorderRef.current = recorder;

		recorder.addEventListener("dataavailable", (event) => {
			if (event.data.size > 0) {
				chunksRef.current.push(event.data);
			}
		});

		recorder.start(250);
		setElapsedMs(0);
		setRecordingStartedAt(startedAt);
	}, []);

	const stopRecording = useCallback(() => {
		if (stopPromiseRef.current) return stopPromiseRef.current;

		const recorder = recorderRef.current;
		const startedAt = startedAtRef.current;
		const mimeType = mimeTypeRef.current;
		if (!recorder || !startedAt) {
			return Promise.reject(new Error("Chưa bắt đầu ghi hình"));
		}

		if (recorder.state === "inactive") {
			return Promise.resolve(finishRecording(startedAt, mimeType));
		}

		const promise = new Promise<RecordingResult>((resolve, reject) => {
			const handleStop = () => {
				resolve(finishRecording(startedAt, mimeType));
			};

			const handleError = () => {
				resetRecorderState();
				reject(new Error("Không thể ghi hình"));
			};

			recorder.addEventListener("stop", handleStop, { once: true });
			recorder.addEventListener("error", handleError, { once: true });
			try {
				recorder.requestData();
				recorder.stop();
			} catch {
				resetRecorderState();
				reject(new Error("Không thể ghi hình"));
			}
		});

		stopPromiseRef.current = promise;
		return promise;
	}, [finishRecording, resetRecorderState]);

	const getRecorderState = useCallback(() => {
		return recorderRef.current?.state ?? "inactive";
	}, []);

	return {
		elapsedMs,
		isRecording: recordingStartedAt !== null,
		getElapsedMs,
		getRecorderState,
		startRecording,
		stopRecording,
	};
}
