import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(rootDir, "src-tauri", "binaries");
const repo = process.env.NATIVE_SIDECARS_REPO ?? "thangvd16/decorder-sidecar";
const version = process.env.NATIVE_SIDECARS_VERSION ?? "v0.2.1";
const baseUrl = `https://github.com/${repo}/releases/download/${version}`;

const assets = [
	"pack-audit-decoder-x86_64-pc-windows-msvc.exe",
	"zbar-0.dll",
	"iconv-2.dll",
	"ffmpeg-x86_64-pc-windows-msvc.exe",
];

mkdirSync(outputDir, { recursive: true });

for (const asset of assets) {
	const url = `${baseUrl}/${asset}`;
	const destination = join(outputDir, asset);
	console.log(`Downloading ${url}`);

	const response = await fetch(url, {
		headers: {
			"User-Agent": "pack-audit-sidecar-fetcher",
		},
	});

	if (!response.ok || !response.body) {
		throw new Error(`Failed to download ${asset}: ${response.status} ${response.statusText}`);
	}

	await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
	console.log(`Saved ${destination}`);
}
