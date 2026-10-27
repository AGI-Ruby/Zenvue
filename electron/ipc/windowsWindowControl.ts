import { spawn } from "node:child_process";
import type { SelectedSource, WindowBounds } from "./types";
import { getScreen, parseWindowId } from "./utils";
import { convertPhysicalBoundsToDip } from "./windowsCaptureSelection";

import { getWindowsCaptureExePath } from "./paths/binaries";
import { createWindowsGeometryClient } from "./windowsGeometryClient";
const geometry = createWindowsGeometryClient(() =>
	spawn(getWindowsCaptureExePath(), ["--window-bounds-server"], {
		stdio: ["pipe", "pipe", "pipe"],
		windowsHide: true,
	}),
);
export const stopWindowsGeometryQueries = () => geometry.stop();
export async function bringWindowsWindowForward(windowId: number): Promise<WindowBounds | null> {
	const bounds = await geometry.query(windowId, true);
	if (!bounds) return null;
	return {
		...convertPhysicalBoundsToDip(bounds, (point) => getScreen().screenToDipPoint(point)),
		physicalBounds: bounds,
	};
}

export async function resolveWindowsWindowBounds(
	source: SelectedSource,
): Promise<WindowBounds | null> {
	const windowId = parseWindowId(source.id);
	if (!windowId) return null;
	const bounds = await geometry.query(windowId);
	if (!bounds) return null;
	const electronScreen = getScreen();
	return {
		...convertPhysicalBoundsToDip(bounds, (point) => electronScreen.screenToDipPoint(point)),
		physicalBounds: bounds,
	};
}
