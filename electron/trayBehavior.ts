export function shouldUseTray(platform: NodeJS.Platform) {
	return platform === "win32" || platform === "linux";
}

export function activateTrayClick(
	platform: NodeJS.Platform,
	event: unknown,
	showHud: () => boolean,
	showMain: () => void,
) {
	const button =
		event && typeof event === "object" && "button" in event
			? (event as { button?: number | string }).button
			: undefined;
	if (platform === "win32" && button !== undefined && button !== 0 && button !== "left") return;
	if (!showHud()) showMain();
}
