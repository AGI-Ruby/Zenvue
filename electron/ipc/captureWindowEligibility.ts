/** Auxiliary overlays can cover an app while being excluded from video capture. */
export function isAuxiliaryCaptureWindow(name: string): boolean {
	return /^Cua\.AgentCursorOverlay(?:\.|$)/i.test(name.trim());
}

export function isEligibleWindowsCaptureWindow(entry: {
	extendedStyle?: number;
	displayAffinity?: number;
}): boolean {
	// WS_EX_LAYERED + WS_EX_TRANSPARENT denotes a click-through overlay.
	const clickThroughOverlay = ((entry.extendedStyle ?? 0) & 0x80020) === 0x80020;
	return !clickThroughOverlay && (entry.displayAffinity ?? 0) === 0;
}
