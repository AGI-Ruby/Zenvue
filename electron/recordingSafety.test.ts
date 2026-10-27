import { describe, expect, it, vi } from "vitest";
import {
	createRecordingSafetyController,
	protectRecordingControls,
	SHOW_RECORDING_CONTROLS_SHORTCUT,
} from "./recordingSafety";
function fixture() {
	const send = vi.fn(),
		showControls = vi.fn();
	const endpoint = { isDestroyed: () => false, webContents: { isDestroyed: () => false, send } };
	const callbacks = new Map<string, () => void>();
	const deps = {
		getRecordingWindow: vi.fn((): typeof endpoint | null => endpoint),
		showControls,
		register: vi.fn((key: string, callback: () => void) => {
			callbacks.set(key, callback);
			return true;
		}),
		unregister: vi.fn(),
		reportUnavailable: vi.fn(),
	};
	return {
		controller: createRecordingSafetyController(deps),
		deps,
		endpoint,
		send,
		callbacks,
		showControls,
	};
}
describe("recording stop routing", () => {
	it("stops the capture-owning HUD instead of an editor and restores controls", () => {
		const f = fixture();
		f.controller.setRecording(true);
		expect(f.controller.requestStop()).toBe(true);
		expect(f.send).toHaveBeenCalledWith("stop-recording-from-tray");
		expect(f.showControls).toHaveBeenCalledTimes(2);
	});
	it("keeps both shortcuts available during recording and releases them after saving starts", () => {
		const f = fixture();
		f.controller.setRecording(true);
		f.controller.setRecording(true);
		expect(f.deps.register).toHaveBeenCalledTimes(2);
		f.callbacks.get("Escape")?.();
		expect(f.send).toHaveBeenCalledOnce();
		f.callbacks.get(SHOW_RECORDING_CONTROLS_SHORTCUT)?.();
		expect(f.showControls).toHaveBeenCalledTimes(3);
		f.controller.setRecording(false);
		expect(f.deps.unregister).toHaveBeenCalledTimes(2);
		expect(f.controller.requestStop()).toBe(false);
	});
	it("does not steal or unregister shortcuts owned by another application", () => {
		const f = fixture();
		f.deps.register.mockImplementation(() => false);
		f.controller.setRecording(true);
		expect(f.deps.reportUnavailable).toHaveBeenCalledTimes(2);
		f.controller.setRecording(false);
		expect(f.deps.unregister).not.toHaveBeenCalled();
	});
	it("uses the current HUD and rejects missing or dead renderers", () => {
		const f = fixture();
		f.controller.setRecording(true);
		f.deps.getRecordingWindow.mockReturnValue(null);
		expect(f.controller.requestStop()).toBe(false);
		f.deps.getRecordingWindow.mockReturnValue({
			...f.endpoint,
			webContents: { isDestroyed: () => true, send: f.send },
		});
		expect(f.controller.requestStop()).toBe(false);
		expect(f.send).not.toHaveBeenCalled();
	});
});
describe("recording HUD lifecycle", () => {
	function windowFixture() {
		let active = true;
		const listeners = new Map<string, (event?: unknown) => void>();
		const window = {
			on: vi.fn((event: string, handler: (event?: unknown) => void) => {
				listeners.set(event, handler);
			}),
			isDestroyed: () => false,
			isMinimized: () => true,
			restore: vi.fn(),
			showInactive: vi.fn(),
			webContents: { send: vi.fn() },
		};
		// The fake emitter stores callbacks without invoking Electron.
		protectRecordingControls(
			window as Parameters<typeof protectRecordingControls>[0],
			() => active,
		);
		return {
			window,
			listeners,
			idle: () => {
				active = false;
			},
		};
	}
	it("turns an active close into stop-and-save without destroying the renderer", () => {
		const f = windowFixture(),
			preventDefault = vi.fn();
		f.listeners.get("close")?.({ preventDefault });
		expect(preventDefault).toHaveBeenCalledOnce();
		expect(f.window.webContents.send).toHaveBeenCalledWith("stop-recording-from-tray");
		expect(f.window.restore).toHaveBeenCalledOnce();
		expect(f.window.showInactive).toHaveBeenCalledOnce();
	});
	it.each(["minimize", "hide"])("restores controls on %s while recording", (event) => {
		const f = windowFixture();
		f.listeners.get(event)?.();
		expect(f.window.showInactive).toHaveBeenCalledOnce();
		f.idle();
		f.listeners.get(event)?.();
		expect(f.window.showInactive).toHaveBeenCalledOnce();
	});
	it("allows idle and finalized HUDs to close", () => {
		const f = windowFixture(),
			preventDefault = vi.fn();
		f.idle();
		f.listeners.get("close")?.({ preventDefault });
		expect(preventDefault).not.toHaveBeenCalled();
		expect(f.window.webContents.send).not.toHaveBeenCalled();
	});
});
