import { invoke } from "@tauri-apps/api/core";

export async function revealCaptureVideo(videoPath: string): Promise<void> {
	return invoke<void>("reveal_video_file", {
		input: {
			videoPath,
		},
	});
}
