import { useEffect, useRef, useState, type FormEvent } from "react";
import { ScanLine, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isValidBarcodeText } from "../hooks/useStableBarcode";
import type { CaptureState } from "../types";

interface CaptureControlsProps {
	state: CaptureState;
	onManualSubmit: (barcode: string) => void;
	onStopRecording: () => void;
	onCancelCountdown: () => void;
	className?: string;
}

export function CaptureControls({ state, onManualSubmit, onStopRecording, onCancelCountdown, className }: CaptureControlsProps) {
	const [manualBarcode, setManualBarcode] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const inputVisible = state === "idle" || state === "countdown";

	useEffect(() => {
		if (state === "idle") {
			inputRef.current?.focus();
		}
	}, [state]);

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		const barcode = manualBarcode.trim();
		if (!isValidBarcodeText(barcode)) return;
		onManualSubmit(barcode);
		setManualBarcode("");
	};

	return (
		<div className={cn("flex min-w-0 items-center gap-2", className)}>
			{inputVisible && (
				<form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={handleSubmit}>
					<Input
						ref={inputRef}
						value={manualBarcode}
						onChange={(event) => setManualBarcode(event.currentTarget.value)}
						placeholder="Nhập mã vạch"
						className="font-mono"
					/>
					<Button type="submit" size="sm" disabled={!isValidBarcodeText(manualBarcode)}>
						<ScanLine size={13} />
						Nhập
					</Button>
				</form>
			)}

			{(state === "recording" || state === "saving") && (
				<Button variant="destructive" size="sm" onClick={onStopRecording} disabled={state === "saving"} className="shrink-0">
					<Square size={13} />
					Dừng
				</Button>
			)}

			{state === "countdown" && (
				<Button variant="secondary" size="sm" onClick={onCancelCountdown} className="shrink-0">
					<X size={13} />
					Hủy
				</Button>
			)}
		</div>
	);
}
