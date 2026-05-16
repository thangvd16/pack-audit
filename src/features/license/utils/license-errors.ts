export function mapLicenseError(raw: unknown): string {
	const msg = String(raw);
	if (msg.includes("License has expired") || msg.includes("License key has expired")) return "Key đã hết hạn.";
	if (msg.includes("License has been revoked") || msg.includes("License key has been revoked")) return "Key đã bị thu hồi.";
	if (msg.includes("Device mismatch")) return "License không hợp lệ trên thiết bị này.";
	if (msg.includes("Invalid or expired token")) return "Phiên xác minh hết hạn, vui lòng nhập key mới.";
	if (msg.includes("License not found") || msg.includes("License key not found")) return "Key không tồn tại trong hệ thống.";
	if (msg.includes("Key already activated on")) return "Key đã được kích hoạt trên thiết bị khác.";
	if (msg.includes("Too many activation attempts")) return "Quá nhiều lần thử, vui lòng đợi 1 giờ.";
	if (msg.includes("Invalid key format")) return "Định dạng key không hợp lệ.";
	if (msg.includes("No license file") || msg.includes("License file corrupted")) return "File license lỗi, vui lòng kích hoạt lại.";
	if (msg.includes("Network error")) return "Lỗi kết nối, kiểm tra internet và thử lại.";
	return "Lỗi không xác định, vui lòng thử lại.";
}

export function isPermanentLicenseError(raw: unknown): boolean {
	const msg = String(raw);
	return (
		msg.includes("License has expired") ||
		msg.includes("License key has expired") ||
		msg.includes("License has been revoked") ||
		msg.includes("License key has been revoked") ||
		msg.includes("Device mismatch") ||
		msg.includes("Invalid or expired token") ||
		msg.includes("License not found") ||
		msg.includes("License key not found")
	);
}
