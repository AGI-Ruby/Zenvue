import type { BrowserWindow } from "electron";

export function createRecordingEditorNavigation(createEditor: () => void) {
	let returnWindow: BrowserWindow | null = null;
	return {
		setReturnWindow(window: BrowserWindow | null) {
			returnWindow = window;
		},
		open(reload = true) {
			const target = returnWindow;
			if (reload) returnWindow = null;
			if (!target || target.isDestroyed()) {
				createEditor();
				return;
			}
			// Reset only the editor project; keep the renderer, assets, and fonts warm.
			if (reload) target.webContents.send("open-recording-in-editor");
			if (target.isMinimized()) target.restore();
			target.show();
			target.focus();
		},
	};
}
