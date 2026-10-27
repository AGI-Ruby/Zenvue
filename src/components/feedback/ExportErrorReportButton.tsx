import { useRef, useState } from "react";
import { ACCOUNT_FEATURES_ENABLED } from "@/lib/auth/accountFeatures";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	buildExportErrorReport,
	submitExportErrorReport,
} from "@/lib/feedback/exportErrorReporting";
import type { CloudPlan } from "../../../services/supabase/functions/_shared/exportErrorReport";

export function ExportErrorReportButton({
	error,
	format,
}: {
	error: string;
	format: "mp4" | "gif";
}) {
	const [open, setOpen] = useState(false);
	const [plan, setPlan] = useState<CloudPlan>("unknown");
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);
	const [sendError, setSendError] = useState("");
	const sendingRef = useRef(false);
	if (!ACCOUNT_FEATURES_ENABLED) return null;
	const report = buildExportErrorReport(error, plan, format);
	return (
		<>
			<Button
				type="button"
				variant="outline"
				className="h-8 text-xs"
				onClick={() => setOpen(true)}
			>
				{sent ? "报告已发送" : "报告错误"}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (!sendingRef.current) setOpen(value);
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{sent ? "报告已发送" : "报告导出错误"}</DialogTitle>
					</DialogHeader>
					{sent ? (
						<p className="text-sm">感谢反馈，技术报告已发送给 Recordly 支持团队。</p>
					) : (
						<>
							<p className="text-sm text-muted-foreground">
								通过 Supabase 将技术详情发送给 Recordly
								支持团队，不包含账户标识、邮箱、录制内容、文件路径、附件或控制台日志。Supabase
								可能单独保留连接日志。
							</p>
							<label className="flex flex-col gap-2 text-sm">
								云端方案（选填）
								<select
									value={plan}
									onChange={(event) => setPlan(event.target.value as CloudPlan)}
									disabled={sending}
									className="rounded-md border bg-background p-2"
								>
									<option value="unknown">未知或不便透露</option>
									<option value="paid">付费云端方案</option>
									<option value="not_paid">未订阅付费云端方案</option>
								</select>
							</label>
							<details>
								<summary className="cursor-pointer text-sm">
									查看将发送的数据
								</summary>
								<pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs mt-2">
									{JSON.stringify(report, null, 2)}
								</pre>
							</details>
							<p className="text-xs text-muted-foreground">
								报告保留三十天，之后由每日清理任务移除。
							</p>
							{sendError && (
								<p role="alert" className="text-sm text-destructive">
									{sendError}
								</p>
							)}
							<Button
								disabled={sending}
								onClick={async () => {
									if (sendingRef.current) return;
									sendingRef.current = true;
									setSending(true);
									setSendError("");
									try {
										await submitExportErrorReport(report);
										setSent(true);
									} catch (error) {
										setSendError(
											error instanceof Error
												? error.message
												: "Could not send the report. Please try again.",
										);
									} finally {
										sendingRef.current = false;
										setSending(false);
									}
								}}
							>
								{sending ? "正在发送…" : "发送报告"}
							</Button>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
