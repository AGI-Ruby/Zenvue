import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { translateToastText } from "./toastMessages";
const native = vi.hoisted(() =>
	Object.assign(
		vi.fn(() => "toast-key"),
		{
			success: vi.fn(),
			danger: vi.fn(),
			update: vi.fn(() => "toast-key"),
			clear: vi.fn(),
			close: vi.fn(),
		},
	),
);
vi.mock("@heroui/react", () => ({ Toast: { Provider: () => null }, toast: native }));
import { toast } from "./toast";
afterEach(() => {
	toast.dismiss();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});
it("copies the error title and details through the native action", async () => {
	vi.stubEnv("VITE_RECORDLY_LOCAL_BUILD", "0");
	const writeText = vi.fn().mockResolvedValue(undefined);
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	toast.error("Export failed", { description: "Encoder unavailable" });
	const options = (
		native.mock.calls as unknown as [
			string,
			{ variant: string; actionProps: { children: string; onPress: () => void } },
		][]
	)[0][1];
	expect(options.variant).toBe("danger");
	expect(options.actionProps.children).toBe("Copy");
	options.actionProps.onPress();
	await vi.waitFor(() =>
		expect(native).toHaveBeenCalledWith(
			"Error copied",
			expect.objectContaining({ variant: "success" }),
		),
	);
	expect(writeText).toHaveBeenCalledWith("Export failed\n\nEncoder unavailable");
});
it("preserves explicit actions and updates named notifications", () => {
	vi.stubEnv("VITE_RECORDLY_LOCAL_BUILD", "0");
	const onClick = vi.fn();
	toast.error("Retry", { id: "job", action: { label: "Retry", onClick } });
	toast.success("Done", { id: "job" });
	expect(native.update).toHaveBeenCalledWith(
		"toast-key",
		"Done",
		expect.objectContaining({ variant: "success" }),
	);
	expect(native).toHaveBeenCalledWith(
		"Retry",
		expect.objectContaining({ actionProps: { children: "Retry", onPress: onClick } }),
	);
});

it("translates Chinese build notifications and copy feedback while preserving raw diagnostics", async () => {
	vi.stubEnv("VITE_RECORDLY_LOCAL_BUILD", "1");
	const writeText = vi.fn().mockResolvedValue(undefined);
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	const title = "Cannot place zoom here";
	const description =
		"Zoom already exists here or there is not enough room before the next zoom or clip end.";
	toast.error(title, { description });
	expect(native).toHaveBeenCalledWith(
		"无法在此处添加缩放",
		expect.objectContaining({
			description: "此处已有缩放，或到下一个缩放区域、片段结尾之间的空间不足。",
			actionProps: expect.objectContaining({ children: "复制" }),
		}),
	);
	const options = (
		native.mock.calls as unknown as [string, { actionProps: { onPress: () => void } }][]
	)[0][1];
	options.actionProps.onPress();
	await vi.waitFor(() =>
		expect(native).toHaveBeenCalledWith(
			"已复制错误信息",
			expect.objectContaining({ variant: "success" }),
		),
	);
	expect(writeText).toHaveBeenCalledWith(`${title}\n\n${description}`);
});

it("translates nested content, explicit actions, counts and paths without changing callbacks or paths", () => {
	vi.stubEnv("VITE_RECORDLY_LOCAL_BUILD", "1");
	const onClick = vi.fn();
	toast.error(createElement("strong", {}, "No video loaded"), {
		id: "translated",
		action: { label: "Retry", onClick },
	});
	expect(native).toHaveBeenCalledWith(
		expect.objectContaining({ props: { children: "尚未加载视频" } }),
		expect.objectContaining({ actionProps: { children: "重试", onPress: onClick } }),
	);
	toast.success("Generated 12 captions", { id: "translated" });
	expect(native.update).toHaveBeenCalledWith("toast-key", "已生成 12 条字幕", expect.anything());
	expect(translateToastText("Added 1 interaction-based zoom suggestion")).toBe(
		"已添加 1 个基于交互的缩放建议",
	);
	expect(translateToastText("Added 5 interaction-based zoom suggestions")).toBe(
		"已添加 5 个基于交互的缩放建议",
	);
	expect(translateToastText("Exported successfully to E:/Export failed/video.mp4")).toBe(
		"已成功导出到：E:/Export failed/video.mp4",
	);
	expect(translateToastText("已保存项目")).toBe("已保存项目");
});

it("localizes copy failures", async () => {
	vi.stubEnv("VITE_RECORDLY_LOCAL_BUILD", "1");
	vi.stubGlobal("navigator", {
		clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
	});
	toast.error("No video loaded");
	const options = (
		native.mock.calls as unknown as [string, { actionProps: { onPress: () => void } }][]
	)[0][1];
	options.actionProps.onPress();
	await vi.waitFor(() =>
		expect(native).toHaveBeenCalledWith(
			"无法复制错误信息",
			expect.objectContaining({ variant: "danger" }),
		),
	);
});
