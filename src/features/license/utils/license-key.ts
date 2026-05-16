export function formatLicenseKey(value: string): string {
	const clean = value
		.replace(/[^A-Za-z0-9]/g, "")
		.toUpperCase()
		.slice(0, 32);
	return clean.match(/.{1,8}/g)?.join("-") ?? clean;
}
