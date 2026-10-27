export function supportsHudCaptureProtection(platform: string): boolean {
	return platform === "darwin" || platform === "win32";
}

export function getHudCaptureExcludedProcessIds(
	platform: string,
	enabled: boolean,
	processId: number,
): number[] {
	if (platform !== "darwin" || !enabled || !Number.isSafeInteger(processId) || processId <= 0) {
		return [];
	}

	return [processId];
}

export function shouldProtectHudCapture(
	enabled: boolean,
	recording: boolean,
	starting: boolean,
	capture?: { platform: string; directWindowCapture: boolean },
): boolean {
	// WGC window capture already excludes overlapping windows. Global Windows
	// exclusion would also hide the HUD from the user's remote desktop viewer.
	if (capture?.platform === "win32" && capture.directWindowCapture) return false;
	return enabled && (recording || starting);
}

export function shouldProtectSelectionOverlay(
	platform: string,
	recording: boolean,
	starting: boolean,
	directWindowCapture: boolean,
): boolean {
	return platform !== "win32" || ((recording || starting) && !directWindowCapture);
}
