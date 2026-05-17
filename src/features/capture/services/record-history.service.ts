import { invoke } from "@tauri-apps/api/core";
import type { CaptureRecord } from "../types";

export const RECENT_RECORDS_LIMIT = 20;

interface ListRecentRecordsInput {
	limit?: number;
}

export async function listRecentRecords(input: ListRecentRecordsInput = {}): Promise<CaptureRecord[]> {
	return invoke<CaptureRecord[]>("list_recent_records", {
		input: {
			limit: input.limit ?? RECENT_RECORDS_LIMIT,
		},
	});
}
