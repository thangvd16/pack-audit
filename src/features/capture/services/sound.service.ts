import endUrl from "@/assets/end.mp3";
import startUrl from "@/assets/start.mp3";

let startAudio: HTMLAudioElement | null = null;
let endAudio: HTMLAudioElement | null = null;

export async function playCaptureStartSound() {
	await playSound(getStartAudio());
}

export async function playCaptureEndSound() {
	await playSound(getEndAudio());
}

async function playSound(audio: HTMLAudioElement) {
	audio.currentTime = 0;
	try {
		await audio.play();
	} catch {
		return;
	}
}

function getStartAudio() {
	if (!startAudio) {
		startAudio = new Audio(startUrl);
		startAudio.preload = "auto";
	}
	return startAudio;
}

function getEndAudio() {
	if (!endAudio) {
		endAudio = new Audio(endUrl);
		endAudio.preload = "auto";
	}
	return endAudio;
}
