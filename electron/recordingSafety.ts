export const STOP_RECORDING_SHORTCUT = "Escape";
export const SHOW_RECORDING_CONTROLS_SHORTCUT = "CommandOrControl+Shift+F9";
interface RecordingEndpoint {
	isDestroyed(): boolean;
	webContents: { isDestroyed(): boolean; send(channel: string): void };
}
export function createRecordingSafetyController(deps: {
	getRecordingWindow(): RecordingEndpoint | null;
	showControls(): void;
	register(accelerator: string, callback: () => void): boolean;
	unregister(accelerator: string): void;
	reportUnavailable(accelerator: string): void;
}) {
	let active = false;
	const owned = new Set<string>();
	const stop = () => {
		if (!active) return false;
		const window = deps.getRecordingWindow();
		if (!window || window.isDestroyed() || window.webContents.isDestroyed()) return false;
		window.webContents.send("stop-recording-from-tray");
		deps.showControls();
		return true;
	};
	return {
		isRecording: () => active,
		requestStop: stop,
		setRecording(recording: boolean) {
			if (active === recording) return;
			active = recording;
			if (!active) {
				for (const shortcut of owned) deps.unregister(shortcut);
				owned.clear();
				return;
			}
			deps.showControls();
			for (const [shortcut, callback] of [
				[STOP_RECORDING_SHORTCUT, stop],
				[SHOW_RECORDING_CONTROLS_SHORTCUT, deps.showControls],
			] as const) {
				if (deps.register(shortcut, callback)) owned.add(shortcut);
				else deps.reportUnavailable(shortcut);
			}
		},
	};
}

interface HudWindow {
	on(event: "close", listener: (event: { preventDefault(): void }) => void): void;
	on(event: "minimize" | "hide", listener: () => void): void;
	isDestroyed(): boolean;
	isMinimized(): boolean;
	restore(): void;
	showInactive(): void;
	webContents: { send(channel: string): void };
}
/** Keep the capture-owning renderer alive; closing means stop and save first. */
export function protectRecordingControls(window: HudWindow, active: () => boolean) {
	const restore = () => {
		if (window.isDestroyed() || !active()) return;
		if (window.isMinimized()) window.restore();
		window.showInactive();
	};
	window.on("close", (event) => {
		if (!active()) return;
		event.preventDefault();
		window.webContents.send("stop-recording-from-tray");
		restore();
	});
	for (const event of ["minimize", "hide"] as const) window.on(event, restore);
}
