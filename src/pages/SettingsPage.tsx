import type { ReactNode } from "react";
import { Timer, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CaptureSettings } from "@/features/capture";

interface SettingsPageProps {
	captureSettings: CaptureSettings;
	onCaptureSettingsChange: (settings: CaptureSettings) => void;
}

export function SettingsPage({ captureSettings, onCaptureSettingsChange }: SettingsPageProps) {
	const updateNumberSetting = (key: "stabilityThresholdMs" | "countdownMs", value: string) => {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return;
		onCaptureSettingsChange({
			...captureSettings,
			[key]: clamp(Math.round(parsed), key === "stabilityThresholdMs" ? 100 : 500, key === "stabilityThresholdMs" ? 2_000 : 10_000),
		});
	};

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<Card className="max-w-2xl">
				<CardHeader className="border-b pb-4">
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="text-sm">Ghi hình kiểm hàng</CardTitle>
						<Badge variant="secondary">Chu kỳ kế tiếp</Badge>
					</div>
				</CardHeader>
				<CardContent className="grid gap-4 pt-1 sm:grid-cols-2">
					<SettingNumberField
						icon={<Waves size={15} />}
						label="Ổn định mã vạch"
						value={captureSettings.stabilityThresholdMs}
						min={100}
						max={2_000}
						step={50}
						unit="ms"
						onChange={(value) => updateNumberSetting("stabilityThresholdMs", value)}
					/>
					<SettingNumberField
						icon={<Timer size={15} />}
						label="Đếm ngược"
						value={captureSettings.countdownMs}
						min={500}
						max={10_000}
						step={100}
						unit="ms"
						onChange={(value) => updateNumberSetting("countdownMs", value)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

function SettingNumberField({
	icon,
	label,
	value,
	min,
	max,
	step,
	unit,
	onChange,
}: {
	icon: ReactNode;
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	unit: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="grid gap-2">
			<span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
				{icon}
				{label}
			</span>
			<div className="flex items-center gap-2">
				<Input
					type="number"
					value={value}
					min={min}
					max={max}
					step={step}
					onChange={(event) => onChange(event.currentTarget.value)}
					className="font-mono"
				/>
				<span className="w-8 shrink-0 text-xs text-muted-foreground">{unit}</span>
			</div>
		</label>
	);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}
