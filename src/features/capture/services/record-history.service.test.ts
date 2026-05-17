import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureRecord } from "../types";
import { listRecentRecords, RECENT_RECORDS_LIMIT } from "./record-history.service";

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
}));

describe("listRecentRecords", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls the Tauri recent records command with the default workspace limit", async () => {
		const records: CaptureRecord[] = [
			{
				id: "record_1",
				sessionId: "session_1",
				barcode: "PKG-001",
				format: "CODE_128",
				scannedAt: 1_776_000_000_000,
				videoPath: "2026-05-17/record_1.webm",
				videoDurationMs: 1_500,
				note: null,
			},
		];
		vi.mocked(invoke).mockResolvedValue(records);

		await expect(listRecentRecords()).resolves.toBe(records);

		expect(invoke).toHaveBeenCalledWith("list_recent_records", {
			input: {
				limit: RECENT_RECORDS_LIMIT,
			},
		});
	});

	it("bubbles read errors to the workspace", async () => {
		const error = new Error("Không thể đọc records");
		vi.mocked(invoke).mockRejectedValue(error);

		await expect(listRecentRecords()).rejects.toBe(error);
	});
});
