export function mapLicenseError(raw: unknown): string {
	const msg = String(raw);
	const normalizedMsg = msg.toLowerCase();
	if (msg.includes("License has expired") || msg.includes("License key has expired") || msg.includes("Mã bản quyền đã hết hạn"))
		return "Mã bản quyền đã hết hạn.";
	if (msg.includes("License has been revoked") || msg.includes("License key has been revoked") || msg.includes("Mã bản quyền đã bị thu hồi"))
		return "Mã bản quyền đã bị thu hồi.";
	if (msg.includes("Device mismatch") || msg.includes("Thiết bị không khớp")) return "Mã bản quyền không hợp lệ trên thiết bị này.";
	if (msg.includes("Invalid or expired token") || msg.includes("Phiên xác minh hết hạn")) return "Phiên xác minh hết hạn, vui lòng nhập mã mới.";
	if (msg.includes("License not found") || msg.includes("License key not found") || msg.includes("Không tìm thấy mã bản quyền"))
		return "Mã bản quyền không tồn tại trong hệ thống.";
	if (msg.includes("Key already activated on")) return "Mã bản quyền đã được kích hoạt trên thiết bị khác.";
	if (msg.includes("Too many activation attempts")) return "Quá nhiều lần thử, vui lòng đợi 1 giờ.";
	if (msg.includes("Invalid key format")) return "Định dạng mã bản quyền không hợp lệ.";
	if (msg.includes("No license file") || msg.includes("License file corrupted") || msg.includes("File bản quyền"))
		return "File bản quyền lỗi, vui lòng kích hoạt lại.";
	if (
		msg.includes("Network error") ||
		msg.includes("Lỗi kết nối") ||
		msg.includes("Failed to fetch") ||
		normalizedMsg.includes("fetch failed") ||
		normalizedMsg.includes("error sending request") ||
		normalizedMsg.includes("timed out") ||
		normalizedMsg.includes("timeout") ||
		normalizedMsg.includes("dns")
	)
		return "Lỗi kết nối, kiểm tra internet và thử lại.";
	return "Lỗi không xác định, vui lòng thử lại.";
}

export function isPermanentLicenseError(raw: unknown): boolean {
	const msg = String(raw);
	return (
		msg.includes("License has expired") ||
		msg.includes("License key has expired") ||
		msg.includes("License has been revoked") ||
		msg.includes("License key has been revoked") ||
		msg.includes("Mã bản quyền đã hết hạn") ||
		msg.includes("Mã bản quyền đã bị thu hồi") ||
		msg.includes("Device mismatch") ||
		msg.includes("Thiết bị không khớp") ||
		msg.includes("Invalid or expired token") ||
		msg.includes("Phiên xác minh hết hạn") ||
		msg.includes("License not found") ||
		msg.includes("License key not found") ||
		msg.includes("Không tìm thấy mã bản quyền")
	);
}
