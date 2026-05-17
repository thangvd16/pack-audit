export interface VideoCodec {
	mimeType: string;
	extension: "mp4" | "webm";
}

export const PREFERRED_CODECS: readonly VideoCodec[] = [
	{ mimeType: "video/mp4;codecs=avc1,mp4a.40.2", extension: "mp4" },
	{ mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
	{ mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
	{ mimeType: "video/webm", extension: "webm" },
];

export const DETECTED_VIDEO_CODEC = detectVideoCodec();

export function detectVideoCodec(): VideoCodec {
	if (typeof MediaRecorder === "undefined") {
		return PREFERRED_CODECS[PREFERRED_CODECS.length - 1];
	}

	return PREFERRED_CODECS.find((codec) => MediaRecorder.isTypeSupported(codec.mimeType)) ?? PREFERRED_CODECS[PREFERRED_CODECS.length - 1];
}
