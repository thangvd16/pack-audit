import { describe, expect, it } from "vitest";
import { normalizeCaptureStorageError } from "./capture-storage.service";

describe("normalizeCaptureStorageError", () => {
	it("keeps known storage messages safe for UI", () => {
		expect(normalizeCaptureStorageError("Không đủ dung lượng", "fallback")).toBe("Không đủ dung lượng");
		expect(normalizeCaptureStorageError("Không thể tạo record: UNIQUE failed records.id", "fallback")).toBe("Không thể tạo bản ghi");
		expect(normalizeCaptureStorageError("Thư mục lưu video phải nằm trong home", "fallback")).toBe("Thư mục lưu video phải nằm trong home");
	});

	it("hides unknown storage details behind a fallback", () => {
		expect(normalizeCaptureStorageError("/Users/example/secret/path stack trace", "Không thể lưu video")).toBe("Không thể lưu video");
	});
});
