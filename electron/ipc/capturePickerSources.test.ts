import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
	exec: vi.fn(),
	sources: vi.fn(),
	mac: vi.fn(),
	dip: vi.fn(),
}));
vi.mock("electron", () => ({ systemPreferences: { getMediaAccessStatus: () => "granted" } }));
vi.mock("node:util", () => ({ promisify: () => mocks.exec }));
vi.mock("./cursor/bounds", () => ({
	getNativeMacWindowsFrontToBack: mocks.mac,
}));
vi.mock("./register/sources", () => ({ getDesktopSources: mocks.sources }));
vi.mock("./utils", () => ({
	parseWindowId: (id?: string) => Number(id?.split(":")[1]),
	getScreen: () => ({ screenToDipRect: mocks.dip }),
}));
import { listCapturePickerWindows } from "./capturePickerSources";
const platform = process.platform;
afterEach(() => Object.defineProperty(process, "platform", { value: platform }));
beforeEach(() => {
	vi.resetAllMocks();
	mocks.sources.mockResolvedValue([
		{ id: "window:101:0", name: "Front" },
		{ id: "window:102:0", name: "Back" },
	]);
});
describe("capture picker source adapters", () => {
	it("skips cursor helpers and protected overlays in front of a real window", async () => {
		Object.defineProperty(process, "platform", { value: "win32" });
		mocks.sources.mockResolvedValue([
			{ id: "window:100:0", name: "Cua.AgentCursorOverlay.default" },
			{ id: "window:101:0", name: "Overlay" },
			{ id: "window:102:0", name: "Protected" },
			{ id: "window:103:0", name: "Clash Verge" },
		]);
		mocks.exec.mockResolvedValue({ stdout: JSON.stringify([
			{ id: 100, x: 0, y: 0, width: 800, height: 600 },
			{ id: 101, x: 0, y: 0, width: 800, height: 600, extendedStyle: 0x80020 },
			{ id: 102, x: 0, y: 0, width: 800, height: 600, displayAffinity: 0x11 },
			{ id: 103, x: 0, y: 0, width: 800, height: 600 },
		]) });
		mocks.dip.mockImplementation((_window, bounds) => bounds);
		expect((await listCapturePickerWindows()).map(entry => entry.id)).toEqual(["window:103:0"]);
	});
	it("keeps Linux window selection on its source list without X11 helper probes", async () => {
		Object.defineProperty(process, "platform", { value: "linux" });
		await expect(listCapturePickerWindows()).rejects.toThrow("Use the source list on Linux");
		expect(mocks.exec).not.toHaveBeenCalled();
	});
	it("matches Windows handles to real capture IDs and converts physical bounds to DIP", async () => {
		Object.defineProperty(process, "platform", { value: "win32" });
		mocks.exec.mockResolvedValue({
			stdout: JSON.stringify([
				{ id: 999, x: 0, y: 0, width: 20, height: 20 },
				{ id: 101, x: -1600, y: 0, width: 800, height: 600 },
			]),
		});
		mocks.dip.mockReturnValue({ x: -800, y: 0, width: 400, height: 300 });
		expect(await listCapturePickerWindows()).toEqual([
			{
				id: "window:101:0",
				appName: "",
				title: "Front",
				display_id: undefined,
				x: -800,
				y: 0,
				width: 400,
				height: 300,
			},
		]);
		expect(mocks.dip).toHaveBeenCalledWith(null, expect.objectContaining({ x: -1600 }));
	});
	it("excludes Recordly's own macOS windows and invalid geometry", async () => {
		Object.defineProperty(process, "platform", { value: "darwin" });
		mocks.mac.mockResolvedValue([
			{ id: "window:1:0", ownerPid: process.pid, x: 0, y: 0, width: 10, height: 10 },
			{ id: "window:2:0", ownerPid: 99, name: "Other", x: 0, y: 0, width: 400, height: 300 },
			{ id: "window:3:0", width: Number.NaN },
		]);
		expect((await listCapturePickerWindows()).map((entry) => entry.id)).toEqual(["window:2:0"]);
	});
});
