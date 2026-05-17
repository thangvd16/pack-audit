import { ClipboardList, PanelLeftClose, PanelLeftOpen, ScanLine, Settings } from "lucide-react";
import type * as React from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import type { PageType } from "@/types/page.types";

const navItems: { title: string; page: PageType; icon: React.ElementType }[] = [
	{ title: "Kiểm hàng", page: "workspace", icon: ScanLine },
	{ title: "Phiên làm việc", page: "session", icon: ClipboardList },
	{ title: "Cài đặt", page: "settings", icon: Settings },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	activePage: PageType;
	onNavigate: (page: PageType) => void;
}

function SidebarFooterToggle() {
	const { open, toggleSidebar } = useSidebar();
	return (
		<SidebarFooter className="border-t border-sidebar-border p-2">
			<button
				type="button"
				onClick={toggleSidebar}
				className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
			>
				{open ? <PanelLeftClose className="h-4 w-4 shrink-0" /> : <PanelLeftOpen className="h-4 w-4 shrink-0" />}
				<span className="overflow-hidden whitespace-nowrap max-w-32 opacity-100 transition-[max-width,opacity] duration-350 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
					Thu gọn
				</span>
			</button>
		</SidebarFooter>
	);
}

export function AppSidebar({ activePage, onNavigate, ...props }: AppSidebarProps) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader className="p-0">
				<div className="flex h-12 w-full items-center gap-2.5 px-3 border-b border-sidebar-border">
					<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary">
						<ScanLine className="h-3.5 w-3.5 text-primary-foreground" />
					</div>
					<span className="overflow-hidden whitespace-nowrap max-w-32 font-bold text-sm tracking-tight text-sidebar-foreground opacity-100 transition-[max-width,opacity] duration-350 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
						Pack Audit
					</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) => (
								<SidebarMenuItem key={item.page}>
									{activePage === item.page && (
										<div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-sidebar-primary z-10" />
									)}
									<SidebarMenuButton tooltip={item.title} isActive={activePage === item.page} onClick={() => onNavigate(item.page)}>
										<item.icon />
										<span>{item.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooterToggle />
		</Sidebar>
	);
}
