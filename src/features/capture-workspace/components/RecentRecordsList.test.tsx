import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CaptureRecord } from "@/features/capture";
import { RecentRecordsList } from "./RecentRecordsList";

function buildRecord(index: number): CaptureRecord {
	return {
		id: `record_${index}`,
		sessionId: "session_1",
		barcode: `PKG-LONG-BARCODE-${index.toString().padStart(2, "0")}-ABCDEFGHIJKLMNOPQRSTUVWXYZ`,
		format: "CODE_128",
		scannedAt: 1_776_000_000_000 + index,
		videoPath: `2026-05-17/record_${index}.webm`,
		videoDurationMs: 1_000 + index * 100,
		note: null,
	};
}

describe("RecentRecordsList", () => {
	it("renders compact record fields with pagination and no inline video", () => {
		const records = Array.from({ length: 12 }, (_, index) => buildRecord(index + 1));

		const html = renderToStaticMarkup(<RecentRecordsList records={records} pageSize={10} />);

		expect(html).toContain("PKG-LONG-BARCODE-01");
		expect(html).toContain("CODE_128");
		expect(html).toContain("Thời lượng");
		expect(html).toContain("Tệp video");
		expect(html).toContain("Mở");
		expect(html).toContain("Hiển thị 1-10 / 12 bản ghi");
		expect(html).toContain("Trang sau");
		expect(html).toContain("break-all");
		expect(html).not.toContain("<video");
	});
});
