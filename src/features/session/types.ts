export type SessionStatus = "active" | "completed";

export interface Session {
	id: string;
	userId: string;
	name: string;
	startedAt: number;
	endedAt: number | null;
	status: SessionStatus;
	scannedCount?: number | null;
	durationMs?: number | null;
}

export interface EnsureDailySessionInput {
	userId: string;
	now: number;
}
