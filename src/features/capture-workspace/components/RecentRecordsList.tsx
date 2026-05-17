import { useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revealCaptureVideo, type CaptureRecord } from "@/features/capture";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDurationMs } from "@/shared/utils/date-time";

const DEFAULT_PAGE_SIZE = 10;

interface RecentRecordsListProps {
	records: CaptureRecord[];
	pageSize?: number;
}

type PageItem = number | "left-ellipsis" | "right-ellipsis";

function buildPageItems(currentPage: number, pageCount: number): PageItem[] {
	if (pageCount <= 5) {
		return Array.from({ length: pageCount }, (_, index) => index + 1);
	}

	const items: PageItem[] = [1];
	if (currentPage > 3) items.push("left-ellipsis");

	const start = Math.max(2, currentPage - 1);
	const end = Math.min(pageCount - 1, currentPage + 1);
	for (let page = start; page <= end; page += 1) {
		items.push(page);
	}

	if (currentPage < pageCount - 2) items.push("right-ellipsis");
	items.push(pageCount);
	return items;
}

function normalizeRevealError(error: unknown) {
	return typeof error === "string" ? error : error instanceof Error ? error.message : "Không thể mở thư mục video";
}

function formatRecordFormat(format: string) {
	if (format === "MANUAL") return "Nhập tay";
	if (format === "UNKNOWN") return "Không rõ";
	return format;
}

export function RecentRecordsList({ records, pageSize = DEFAULT_PAGE_SIZE }: RecentRecordsListProps) {
	const [page, setPage] = useState(1);
	const [revealingRecordId, setRevealingRecordId] = useState<string | null>(null);
	const pageCount = Math.max(1, Math.ceil(records.length / pageSize));

	useEffect(() => {
		setPage((currentPage) => Math.min(currentPage, pageCount));
	}, [pageCount]);

	useEffect(() => {
		setPage(1);
	}, [records]);

	const visibleRecords = useMemo(() => {
		const startIndex = (page - 1) * pageSize;
		return records.slice(startIndex, startIndex + pageSize);
	}, [page, pageSize, records]);

	const firstVisible = records.length === 0 ? 0 : (page - 1) * pageSize + 1;
	const lastVisible = Math.min(page * pageSize, records.length);
	const pageItems = buildPageItems(page, pageCount);

	const handlePageClick = (event: React.MouseEvent<HTMLAnchorElement>, nextPage: number) => {
		event.preventDefault();
		setPage(Math.min(Math.max(nextPage, 1), pageCount));
	};

	const handleRevealVideo = async (record: CaptureRecord) => {
		if (!record.videoPath) return;

		setRevealingRecordId(record.id);
		try {
			await revealCaptureVideo(record.videoPath);
			toast.success("Đã mở vị trí video");
		} catch (error) {
			toast.error(normalizeRevealError(error));
		} finally {
			setRevealingRecordId(null);
		}
	};

	return (
		<section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
			<div className="flex flex-col gap-1 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-sm font-semibold text-foreground">Bản ghi gần đây</h2>
					<p className="text-xs text-muted-foreground">
						Hiển thị {firstVisible}-{lastVisible} / {records.length} bản ghi
					</p>
				</div>
			</div>

			<Table className="min-w-[760px]">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[42%]">Mã vạch</TableHead>
						<TableHead>Định dạng</TableHead>
						<TableHead>Thời gian</TableHead>
						<TableHead className="text-right">Thời lượng</TableHead>
						<TableHead className="text-right">Tệp video</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{visibleRecords.map((record) => (
						<TableRow key={record.id}>
							<TableCell className="whitespace-normal">
								<span className="block max-w-[18rem] break-all font-mono text-xs text-foreground md:max-w-[28rem]">{record.barcode}</span>
							</TableCell>
							<TableCell>
								<Badge variant="secondary">{formatRecordFormat(record.format)}</Badge>
							</TableCell>
							<TableCell className="text-muted-foreground">{formatDateTime(record.scannedAt)}</TableCell>
							<TableCell className="text-right text-muted-foreground">{formatDurationMs(record.videoDurationMs)}</TableCell>
							<TableCell className="text-right">
								{record.videoPath ? (
									<Button
										variant="outline"
										size="sm"
										onClick={() => void handleRevealVideo(record)}
										disabled={revealingRecordId === record.id}
										aria-label={`Mở video ${record.barcode} trong thư mục`}
									>
										<FolderOpen />
										Mở
									</Button>
								) : (
									<span className="text-xs text-muted-foreground">Không có</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{pageCount > 1 && (
				<div className="border-t px-3 py-2">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href="#"
									text="Trước"
									aria-label="Trang trước"
									aria-disabled={page === 1}
									tabIndex={page === 1 ? -1 : undefined}
									className={cn(page === 1 && "pointer-events-none opacity-50")}
									onClick={(event) => handlePageClick(event, page - 1)}
								/>
							</PaginationItem>
							{pageItems.map((item) => (
								<PaginationItem key={item}>
									{typeof item === "number" ? (
										<PaginationLink href="#" isActive={page === item} onClick={(event) => handlePageClick(event, item)}>
											{item}
										</PaginationLink>
									) : (
										<PaginationEllipsis />
									)}
								</PaginationItem>
							))}
							<PaginationItem>
								<PaginationNext
									href="#"
									text="Sau"
									aria-label="Trang sau"
									aria-disabled={page === pageCount}
									tabIndex={page === pageCount ? -1 : undefined}
									className={cn(page === pageCount && "pointer-events-none opacity-50")}
									onClick={(event) => handlePageClick(event, page + 1)}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</section>
	);
}
