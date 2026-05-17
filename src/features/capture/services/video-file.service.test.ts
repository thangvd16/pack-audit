import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revealCaptureVideo } from "./video-file.service";

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
}));

describe("revealCaptureVideo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls the Tauri reveal command with the relative video path", async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await revealCaptureVideo("2026-05-17/record.webm");

		expect(invoke).toHaveBeenCalledWith("reveal_video_file", {
			input: {
				videoPath: "2026-05-17/record.webm",
			},
		});
	});
});
