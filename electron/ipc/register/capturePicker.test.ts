import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
	handlers: new Map<string, (...args: unknown[]) => unknown>(),
	list: vi.fn(),
	pickSourceList: vi.fn(),
	validate: vi.fn(),

	selected: vi.fn(),
	clearHighlight: vi.fn(),
	refreshHighlight: vi.fn(),
	showControls: vi.fn(),
	broadcast: vi.fn(),
	recording: false,
	currentSource: null as Record<string, unknown> | null,
	create: vi.fn(),
	close: vi.fn(),
	overlay: {},
	outsider: {},
	windows: [] as object[],
}));
vi.mock("electron", () => ({
	ipcMain: {
		handle: (name: string, handler: (...args: unknown[]) => unknown) =>
			mocks.handlers.set(name, handler),
	},
}));
vi.mock("../../windows", () => ({
	createCapturePickerWindows: mocks.create,
	closeCapturePickerWindows: mocks.close,
	showCaptureSelectionControls: mocks.showControls,
	isCapturePickerWebContents: (sender: object) => mocks.windows.includes(sender),
}));
vi.mock("../captureSelection", () => ({
	validateCaptureSource: mocks.validate,
}));
vi.mock("../capturePickerSources", () => ({ listCapturePickerWindows: mocks.list }));
vi.mock("../cursor/bounds", () => ({ stopWindowBoundsCapture: vi.fn() }));
vi.mock("../state", () => ({
	setSelectedSource: mocks.selected,
	get isCursorCaptureActive() {
		return mocks.recording;
	},
	get selectedSource() {
		return mocks.currentSource;
	},
}));
vi.mock("../utils", () => ({
	getScreen: () => ({
		getAllDisplays: () => [{ id: 1, bounds: { x: 0, y: 0, width: 1440, height: 1000 } }],
		getPrimaryDisplay: () => ({ id: 1 }),
		getCursorScreenPoint: () => ({ x: 0, y: 0 }),
	}),
}));
vi.mock("./sources", () => ({
	bringSelectedWindowForward: vi.fn(),
	broadcastSelectedSourceChange: mocks.broadcast,
	clearSelectedSourceHighlight: mocks.clearHighlight,
	refreshSelectedSourceHighlight: mocks.refreshHighlight,
	getDesktopSources: vi.fn().mockResolvedValue([{ id: "screen:1:0", display_id: "1" }]),
}));
import { registerCapturePickerHandlers } from "./capturePicker";
const platform = process.platform;
afterEach(() => {
	Object.defineProperty(process, "platform", { value: platform });
	vi.unstubAllEnvs();
});
beforeEach(() => {
	vi.clearAllMocks();
	mocks.handlers.clear();
	mocks.currentSource = null;
	mocks.recording = false;
	mocks.windows = [mocks.overlay];
	Object.defineProperty(process, "platform", { value: "darwin" });
	mocks.list.mockResolvedValue([]);
	mocks.validate.mockImplementation(async (source) => source);
	registerCapturePickerHandlers({ pickSourceList: mocks.pickSourceList });
});
const call = (name: string, sender: object, input?: unknown) =>
	mocks.handlers.get(name)!({ sender }, input);
describe("selection-only picker IPC", () => {
	it("native cancel closes every overlay without restoring the previous source's dimmer", async () => {
		mocks.currentSource = {
			id: "area:1",
			display_id: "1",
			area: { x: 100, y: 200, width: 400, height: 300 },
		};
		const pending = call("pick-capture-target", mocks.outsider);
		await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
		const onClosed = mocks.create.mock.calls[0][0] as () => void;
		onClosed();
		expect(await pending).toEqual({ success: false, canceled: true });
		expect(mocks.close).toHaveBeenCalled();
		expect(mocks.clearHighlight).toHaveBeenCalledTimes(2);
		expect(mocks.refreshHighlight).not.toHaveBeenCalled();
		expect(mocks.selected).not.toHaveBeenCalled();
	});
	it("renderer cancel also clears the highlight and allows a fresh selection", async () => {
		const pending = call("pick-capture-target", mocks.outsider);
		await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
		await call("complete-capture-pick", mocks.overlay, null);
		expect(await pending).toEqual({ success: false, canceled: true });
		expect(mocks.refreshHighlight).not.toHaveBeenCalled();
		expect(mocks.clearHighlight).toHaveBeenCalledTimes(2);
		const next = call("pick-capture-target", mocks.outsider);
		await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
		await call("complete-capture-pick", mocks.overlay, { kind: "screen", displayId: 1 });
		expect(await next).toMatchObject({ success: true });
		expect(mocks.broadcast).toHaveBeenCalledOnce();
	});
	it("ignores completion from other windows and forces selection-only completion", async () => {
		const pending = call("pick-capture-target", mocks.outsider);
		await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
		await call("complete-capture-pick", mocks.outsider, {
			kind: "screen",
			displayId: 1,
			record: true,
		});
		expect(mocks.selected).not.toHaveBeenCalled();
		await call("complete-capture-pick", mocks.overlay, {
			kind: "screen",
			displayId: 1,
			record: true,
		});
		expect(await pending).toMatchObject({ success: true, source: { id: "screen:1:0" } });
		expect(await pending).not.toHaveProperty("record");
		expect(mocks.broadcast).toHaveBeenCalledOnce();
	});
	it("coalesces simultaneous opens into one picker", async () => {
		const first = call("pick-capture-target", mocks.outsider);
		const second = call("pick-capture-target", mocks.outsider);
		await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
		await call("complete-capture-pick", mocks.overlay, null);
		expect(await first).toEqual({ success: false, canceled: true });
		expect(await second).toEqual({ success: false, canceled: true });
	});
	it("keeps Wayland on the existing portal path without overlays or geometry probes", async () => {
		Object.defineProperty(process, "platform", { value: "linux" });
		vi.stubEnv("XDG_SESSION_TYPE", "wayland");
		expect(await call("pick-capture-target", mocks.outsider)).toMatchObject({
			success: true,
			source: { id: "screen:linux-portal" },
		});
		expect(mocks.create).not.toHaveBeenCalled();
		expect(mocks.list).not.toHaveBeenCalled();
	});
});

it("rejects a window that disappeared while the picker was open", async () => {
	mocks.list.mockResolvedValue([
		{
			id: "window:101:0",
			title: "Document",
			appName: "Notes",
			x: 0,
			y: 0,
			width: 400,
			height: 300,
		},
	]);
	mocks.validate.mockResolvedValue(null);
	const pending = call("pick-capture-target", mocks.outsider);
	await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
	await call("complete-capture-pick", mocks.overlay, {
		kind: "window",
		windowId: "window:101:0",
		displayId: 1,
	});
	expect(await pending).toMatchObject({
		success: false,
		message: "That window or screen is no longer available.",
	});
	expect(mocks.selected).not.toHaveBeenCalled();
});
it("surfaces detection failures instead of opening a screen-only overlay", async () => {
	mocks.list.mockRejectedValue(new Error("Unable to detect windows"));
	expect(await call("pick-capture-target", mocks.outsider)).toMatchObject({
		success: false,
		message: "Unable to detect windows",
	});
	expect(mocks.create).not.toHaveBeenCalled();
	expect(mocks.selected).not.toHaveBeenCalled();
});

it("opens a fresh picker even when an area is already selected", async () => {
	mocks.currentSource = {
		id: "area:1",
		display_id: "1",
		area: { x: 100, y: 200, width: 400, height: 300 },
	};
	expect(await call("get-capture-picker-context", mocks.overlay, 1)).toMatchObject({
		lastArea: null,
	});
	mocks.currentSource = { id: "window:101:0", display_id: "1" };
	expect(await call("get-capture-picker-context", mocks.overlay, 1)).toMatchObject({
		lastArea: null,
	});
});

it("does not open any source picker during recording or pause", async () => {
	mocks.recording = true;
	expect(await call("pick-capture-target", mocks.outsider)).toEqual({
		success: false,
		canceled: true,
	});
	expect(mocks.list).not.toHaveBeenCalled();
	expect(mocks.create).not.toHaveBeenCalled();
	expect(mocks.selected).not.toHaveBeenCalled();
});

it("rejects a pending selection if recording starts while the picker is open", async () => {
	const pending = call("pick-capture-target", mocks.outsider);
	await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
	mocks.recording = true;
	await call("complete-capture-pick", mocks.overlay, { kind: "screen", displayId: 1 });
	expect(await pending).toEqual({ success: false, canceled: true });
	expect(mocks.selected).not.toHaveBeenCalled();
});

it("does not open overlays if recording starts while listing windows", async () => {
	mocks.list.mockImplementation(async () => {
		mocks.recording = true;
		return [];
	});
	expect(await call("pick-capture-target", mocks.outsider)).toEqual({
		success: false,
		canceled: true,
	});
	expect(mocks.create).not.toHaveBeenCalled();
});

it("keeps X11 on the source list and coalesces concurrent opens", async () => {
	Object.defineProperty(process, "platform", { value: "linux" });
	vi.stubEnv("XDG_SESSION_TYPE", "x11");
	let finish!: (result: unknown) => void;
	mocks.pickSourceList.mockReturnValue(
		new Promise((resolve) => {
			finish = resolve;
		}),
	);
	const first = call("pick-capture-target", mocks.outsider);
	const second = call("pick-capture-target", mocks.outsider);
	expect(mocks.pickSourceList).toHaveBeenCalledOnce();
	expect(mocks.list).not.toHaveBeenCalled();
	expect(mocks.create).not.toHaveBeenCalled();
	finish({ success: false, canceled: true });
	expect(await first).toEqual({ success: false, canceled: true });
	expect(await second).toEqual({ success: false, canceled: true });
});
it("keeps the X11 source list closed during recording", async () => {
	Object.defineProperty(process, "platform", { value: "linux" });
	vi.stubEnv("XDG_SESSION_TYPE", "x11");
	mocks.recording = true;
	expect(await call("pick-capture-target", mocks.outsider)).toEqual({
		success: false,
		canceled: true,
	});
	expect(mocks.pickSourceList).not.toHaveBeenCalled();
});
for (const kind of ["screen", "area", "window"] as const) {
	it("keeps an editable " + kind + " selection and raises the HUD until Escape", async () => {
		if (kind === "window")
			mocks.list.mockResolvedValue([
				{
					id: "window:101:0",
					title: "Explorer",
					appName: "Explorer",
					x: 100,
					y: 100,
					width: 800,
					height: 600,
					display_id: "1",
				},
			]);
		const pending = call("pick-capture-target", mocks.outsider);
		await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
		const closedBefore = mocks.close.mock.calls.length;
		const input =
			kind === "screen"
				? { kind, displayId: 1 }
				: kind === "window"
					? { kind, displayId: 1, windowId: "window:101:0" }
					: { kind, displayId: 1, x: 100, y: 100, width: 400, height: 300 };
		await mocks.handlers.get("complete-capture-pick")!({ sender: mocks.overlay }, input, true);
		expect(await pending).toMatchObject({ success: true });
		expect(mocks.close).toHaveBeenCalledTimes(closedBefore);
		expect(mocks.showControls).toHaveBeenCalledWith(mocks.overlay);
		if (kind === "area") {
			await mocks.handlers.get("complete-capture-pick")!(
				{ sender: mocks.overlay },
				{ ...input, x: 200 },
				true,
			);
			expect(mocks.selected).toHaveBeenLastCalledWith(
				expect.objectContaining({ area: expect.objectContaining({ x: 200 }) }),
			);
		}
		const onClosed = mocks.create.mock.calls[0][0] as () => void;
		onClosed();
		expect(mocks.selected).toHaveBeenLastCalledWith(null);
		expect(mocks.close).toHaveBeenCalledTimes(closedBefore + 1);
		expect(mocks.refreshHighlight).not.toHaveBeenCalled();
	});
}

it("does not restore a selection after Escape interrupts source validation", async () => {
	let finishValidation!: () => void;
	mocks.validate.mockImplementation(
		(source) =>
			new Promise((resolve) => {
				finishValidation = () => resolve(source);
			}),
	);
	const pending = call("pick-capture-target", mocks.outsider);
	await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
	await mocks.handlers.get("complete-capture-pick")!(
		{ sender: mocks.overlay },
		{ kind: "area", displayId: 1, x: 100, y: 100, width: 400, height: 300 },
		true,
	);
	await vi.waitFor(() => expect(mocks.validate).toHaveBeenCalledOnce());
	(mocks.create.mock.calls[0][0] as () => void)();
	finishValidation();
	expect(await pending).toMatchObject({ success: false, canceled: true });
	expect(mocks.selected).toHaveBeenCalledOnce();
	expect(mocks.selected).toHaveBeenLastCalledWith(null);
	expect(mocks.showControls).not.toHaveBeenCalled();
});
