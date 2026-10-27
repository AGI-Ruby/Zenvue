import path from "node:path";
/** Reuse only this user's enhanced-build profile, never the original Recordly profile. */
export function resolveZenvueProfile(options: {
	appName: string;
	appData: string;
	currentUserData: string;
	platform: NodeJS.Platform;
	exists: (path: string) => boolean;
}) {
	if (options.platform !== "win32" || !["Zenvue", "zenvue"].includes(options.appName))
		return options.currentUserData;
	const legacy = path.join(options.appData, "Recordly Enhanced");
	return options.exists(path.join(legacy, "recordings")) ? legacy : options.currentUserData;
}
