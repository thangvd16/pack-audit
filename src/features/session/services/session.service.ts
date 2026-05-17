import { invoke } from "@tauri-apps/api/core";
import type { EnsureDailySessionInput, Session } from "../types";

export const DEFAULT_CAPTURE_USER_ID = "default_owner";

export async function ensureDailySession(input: Partial<EnsureDailySessionInput> = {}): Promise<Session> {
	return invoke<Session>("ensure_daily_session", {
		input: {
			userId: input.userId ?? DEFAULT_CAPTURE_USER_ID,
			now: input.now ?? Date.now(),
		},
	});
}
