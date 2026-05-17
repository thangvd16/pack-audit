import { invoke } from "@tauri-apps/api/core";
import type { CaptureRecord, CreateRecordInput } from "../types";

interface CreateRecordCommandInput {
	id: string;
	sessionId: string;
	barcode: string;
	format: string;
	scannedAt: number;
	videoPath: string;
	videoDurationMs: number;
	note: string | null;
}

const VIDEO_CHUNK_SIZE = 1024 * 1024;

interface SavedVideoFile {
	recordId: string;
	videoPath: string;
}

async function blobChunkToBytes(blob: Blob, start: number, end: number): Promise<Uint8Array> {
	return new Uint8Array(await blob.slice(start, end).arrayBuffer());
}

export async function getVideoSaveDir(): Promise<string> {
	try {
		return await invoke<string>("get_video_save_dir");
	} catch (error) {
		throw new Error(normalizeCaptureStorageError(error, "Không thể truy cập thư mục lưu video"));
	}
}

async function saveVideoBlob(input: CreateRecordInput): Promise<SavedVideoFile> {
	if (input.videoBlob.size === 0) {
		throw new Error("Video rỗng");
	}

	const recordId = crypto.randomUUID();
	const videoPath = await invoke<string>("create_video_file", {
		input: {
			recordId,
			scannedAt: input.scannedAt,
			mimeType: input.mimeType,
		},
	});

	for (let offset = 0; offset < input.videoBlob.size; offset += VIDEO_CHUNK_SIZE) {
		const bytes = await blobChunkToBytes(input.videoBlob, offset, offset + VIDEO_CHUNK_SIZE);
		await invoke<void>("append_video_file", {
			input: {
				videoPath,
				bytes,
			},
		});
	}

	return { recordId, videoPath };
}

export async function createCaptureRecord(input: CreateRecordInput): Promise<CaptureRecord> {
	let savedVideo: SavedVideoFile;
	try {
		savedVideo = await saveVideoBlob(input);
	} catch (error) {
		throw new Error(normalizeCaptureStorageError(error, "Không thể lưu video"));
	}

	const commandInput: CreateRecordCommandInput = {
		id: savedVideo.recordId,
		sessionId: input.sessionId,
		barcode: input.barcode,
		format: input.format,
		scannedAt: input.scannedAt,
		videoPath: savedVideo.videoPath,
		videoDurationMs: input.videoDurationMs,
		note: input.note ?? null,
	};

	try {
		return await invoke<CaptureRecord>("create_record", { input: commandInput });
	} catch (error) {
		const message = normalizeCaptureStorageError(error, "Không thể tạo bản ghi");
		console.error("[CaptureStorage] persisted video without record", {
			recordId: savedVideo.recordId,
			videoPath: savedVideo.videoPath,
			error: message,
		});
		throw new Error(message);
	}
}

export function normalizeCaptureStorageError(error: unknown, fallback: string) {
	const rawMessage = typeof error === "string" ? error : error instanceof Error ? error.message : "";
	if (rawMessage.includes("Không đủ dung lượng")) return "Không đủ dung lượng";
	if (rawMessage.includes("Video rỗng") || rawMessage.includes("Dữ liệu video rỗng")) return "Video rỗng";
	if (rawMessage.includes("Thư mục lưu video")) return rawMessage;
	if (rawMessage.includes("File video chưa tồn tại")) return rawMessage;
	if (rawMessage.includes("Không thể tạo record") || rawMessage.includes("Không thể tạo bản ghi")) return "Không thể tạo bản ghi";
	if (rawMessage.includes("Không thể mở SQLite")) return "Không thể mở SQLite";
	if (rawMessage.includes("Không thể cấu hình SQLite")) return "Không thể cấu hình SQLite";
	if (rawMessage.includes("Không thể lưu video")) return "Không thể lưu video";
	return fallback;
}
