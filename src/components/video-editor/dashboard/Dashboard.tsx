import { DashboardAnnouncements } from "./DashboardAnnouncements";
import { Card, Modal } from "@heroui/react";
import { DashboardFilters } from "./DashboardFilters";
import { DashboardGrid } from "./DashboardGrid";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardToolbar } from "./DashboardToolbar";
import type { DashboardProps } from "./types";
import { useDashboardModel } from "./useDashboardModel";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
export function Dashboard(props: DashboardProps) {
	const model = useDashboardModel(props);
	const view = { ...props, ...model };
	return (
		<>
			<Modal isOpen={props.open} onOpenChange={props.onOpenChange}>
				<Modal.Backdrop>
					<Modal.Container size="full">
						<Modal.Dialog
							aria-label="项目主页"
							className="dashboard-surface dashboard-shell relative flex h-full flex-row gap-0 rounded-none bg-background p-0 text-foreground"
						>
							<div
								className="absolute right-4 top-3 z-50 flex items-center gap-2"
								style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
							>
								<Button
									variant="ghost"
									size="icon"
									aria-label="关闭主页，返回浮窗"
									title="关闭主页，返回浮窗"
									onClick={() => void window.electronAPI.showRecordingHud(true)}
								>
									<XIcon className="size-4" />
								</Button>
							</div>
							<DashboardSidebar {...view} />
							<Card className="my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-2xl bg-background px-0 pb-0 pt-12 shadow-sm">
								{model.section !== "settings" && model.section !== "shared" && (
									<>
										<DashboardAnnouncements />
										<DashboardToolbar {...view} />
										<DashboardFilters {...view} />
									</>
								)}
								<DashboardGrid {...view} />
							</Card>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</Modal>
		</>
	);
}
