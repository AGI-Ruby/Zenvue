import { createSourceListPicker } from "../../sourceListPicker";
import { isAuxiliaryCaptureWindow } from "../captureWindowEligibility";
import { writeAppSetting } from "../../appSettingsStore";
import { getSessionCaptureSource, validateCaptureSource } from "../captureSelection";
import { createRecordingEditorNavigation } from "../../recordingEditorNavigation";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { app, BrowserWindow, desktopCapturer, ipcMain, systemPreferences } from "electron";
import {
	setHudRecordingPreparationActive,
	createHudOverlayWindow,
	getHudOverlayWindow,
	showAreaRecordingBorder,
	hideAreaRecordingBorder,
	closeCapturePickerWindows,
	setConfirmedSelectionCancelHandler,
} from "../../windows";
import { ALLOW_RECORDLY_WINDOW_CAPTURE } from "../constants";
import {
	getNativeMacWindowSources,
	resolveLinuxWindowBounds,
	resolveMacWindowBounds,
	stopWindowBoundsCapture,
} from "../cursor/bounds";
import { getDisplayBoundsForSource } from "../recording/ffmpeg";
import { isCursorCaptureActive, selectedSource, setSelectedSource } from "../state";
import type { SelectedSource, WindowBounds } from "../types";
import { getSourceArea } from "../sourceArea";
import { getScreen, parseWindowId } from "../utils";
import { bringWindowsWindowForward, resolveWindowsWindowBounds } from "../windowsWindowControl";
import {
	getScreenSourceIdForDisplay,
	isLikelyLinuxWaylandSession,
	LINUX_PORTAL_SCREEN_SOURCE_ID,
} from "./sourceMapping";

const execFileAsync = promisify(execFile);
const SOURCE_LIST_CACHE_TTL_MS = 1200;
let sourceListCache: {
	key: string;
	expiresAt: number;
	value: SelectedSource[];
} | null = null;

function normalizeDesktopSourceName(value: string) {
	return value.trim().replace(/\s+/g, " ").toLowerCase();
}

let highlightRevision = 0;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;
export function clearSelectedSourceHighlight() {
	highlightRevision++;
	clearTimeout(highlightTimer);
	hideAreaRecordingBorder();
}
export async function refreshSelectedSourceHighlight() {
	const revision = ++highlightRevision;
	clearTimeout(highlightTimer);
	const source = selectedSource;
	if (!source) {
		hideAreaRecordingBorder();
		return;
	}
	const refresh = async () => {
		if (revision !== highlightRevision) return;
		let bounds = getSourceArea(source);
		if (source.id?.startsWith("window:")) {
			bounds =
				process.platform === "win32"
					? await resolveWindowsWindowBounds(source)
					: process.platform === "darwin"
						? await resolveMacWindowBounds(source)
						: await resolveLinuxWindowBounds(source);
		} else if (!bounds && source.id?.startsWith("screen:")) {
			bounds = getDisplayBoundsForSource(source);
		}
		if (revision !== highlightRevision) return;
		if (bounds) showAreaRecordingBorder(bounds);
		else hideAreaRecordingBorder();
		if (source.id?.startsWith("window:"))
			highlightTimer = setTimeout(
				() => void refresh(),
				process.platform === "win32" ? 100 : 1000,
			);
	};
	await refresh();
}
export function broadcastSelectedSourceChange() {
	void refreshSelectedSourceHighlight();
	for (const window of BrowserWindow.getAllWindows()) {
		if (!window.isDestroyed()) {
			window.webContents.send("selected-source-changed", selectedSource);
		}
	}
}

export async function bringSelectedWindowForward(
	source: SelectedSource,
): Promise<WindowBounds | null> {
	const windowId = parseWindowId(source.id);
	if (!windowId) return null;

	try {
		if (process.platform === "darwin") {
			const rawAppName = source.appName || source.name?.split(" — ")[0]?.trim();
			const appName =
				rawAppName && /^[\w .&()+'-]{1,64}$/.test(rawAppName) ? rawAppName : null;
			if (!appName) return null;
			await execFileAsync("open", ["-a", appName], { timeout: 2000 });
			try {
				systemPreferences?.isTrustedAccessibilityClient?.(true);
				const { stdout } = await execFileAsync(
					"osascript",
					[
						"-e",
						"on run argv",
						"-e",
						'tell application "System Events" to tell process (item 1 of argv)',
						"-e",
						"repeat with candidate in windows",
						"-e",
						"try",
						"-e",
						'if value of attribute "AXWindowNumber" of candidate is (item 2 of argv) as integer then',
						"-e",
						'perform action "AXRaise" of candidate',
						"-e",
						"set windowPosition to position of candidate",
						"-e",
						"set windowSize to size of candidate",
						"-e",
						'return ((item 1 of windowPosition) as text) & "," & ((item 2 of windowPosition) as text) & "," & ((item 1 of windowSize) as text) & "," & ((item 2 of windowSize) as text)',
						"-e",
						"end if",
						"-e",
						"end try",
						"-e",
						"end repeat",
						"-e",
						"end tell",
						"-e",
						"end run",
						"--",
						appName,
						String(windowId),
					],
					{ timeout: 2000 },
				);
				const [x, y, width, height] = stdout.trim().split(",").map(Number);
				if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
					await new Promise((resolve) => setTimeout(resolve, 250));
					return { x, y, width, height };
				}
			} catch {
				// App activation still works without macOS Accessibility permission.
			}
		} else if (process.platform === "win32") {
			return await bringWindowsWindowForward(windowId);
		} else if (process.platform === "linux") {
			await execFileAsync("wmctrl", ["-i", "-a", `0x${windowId.toString(16)}`], {
				timeout: 1500,
			});
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	} catch {
		// Raising the source is best-effort; selection and capture can still continue.
	}
	return null;
}

export async function getDesktopSources(
	opts?: Electron.SourcesOptions,
	options?: { strict?: boolean },
): Promise<SelectedSource[]> {
	if (process.platform === "linux" && isLikelyLinuxWaylandSession(process.env)) {
		return opts?.types && !opts.types.includes("screen")
			? []
			: [{ id: LINUX_PORTAL_SCREEN_SOURCE_ID, name: "System picker", sourceType: "screen" }];
	}
	const cacheKey = JSON.stringify({
		types: opts?.types,
		thumbnailSize: opts?.thumbnailSize,
		fetchWindowIcons: opts?.fetchWindowIcons,
	});
	if (
		!options?.strict &&
		sourceListCache &&
		sourceListCache.key === cacheKey &&
		sourceListCache.expiresAt > Date.now()
	) {
		return sourceListCache.value;
	}

	const includeScreens = Array.isArray(opts?.types) ? opts.types.includes("screen") : true;
	const includeWindows = Array.isArray(opts?.types) ? opts.types.includes("window") : true;
	const includeWindowIcons = Boolean(opts?.fetchWindowIcons);
	const electronTypes = [
		...(includeScreens ? ["screen" as const] : []),
		...(includeWindows ? ["window" as const] : []),
	];
	const electronSources =
		electronTypes.length > 0
			? await desktopCapturer
					.getSources({
						...opts,
						types: electronTypes,
					})
					.catch((error) => {
						if (options?.strict)
							throw new Error(
								"Unable to detect recording sources. Check capture permission and try again.",
							);
						console.warn(
							"desktopCapturer.getSources failed (screen recording permission may be missing):",
							error,
						);
						return [];
					})
			: [];
	const ownWindowNames = new Set(
		[
			app.getName(),
			"Zenvue",
			...BrowserWindow.getAllWindows().flatMap((win) => {
				const title = win.getTitle().trim();
				return title ? [title] : [];
			}),
		]
			.map((name) => normalizeDesktopSourceName(name))
			.filter(Boolean),
	);
	const ownAppName = normalizeDesktopSourceName(app.getName());

	const displays = includeScreens
		? [...getScreen().getAllDisplays()].sort(
				(left, right) =>
					left.bounds.x - right.bounds.x ||
					left.bounds.y - right.bounds.y ||
					left.id - right.id,
			)
		: [];
	const primaryDisplayId = includeScreens ? String(getScreen().getPrimaryDisplay().id) : "";
	const electronScreenSourcesByDisplayId = new Map(
		electronSources
			.filter((source) => source.id?.startsWith("screen:"))
			.map((source) => [String(source.display_id ?? ""), source] as const),
	);
	// On Linux, desktopCapturer display_id values may not match screen.getAllDisplays() IDs.
	// Keep an ordered list so we can fall back to position-based matching.
	const electronScreenSourcesByIndex = electronSources.filter((source) =>
		source.id?.startsWith("screen:"),
	);

	const screenSources = displays.map((display, index) => {
		const displayId = String(display.id);
		const matchedSource =
			electronScreenSourcesByDisplayId.get(displayId) ??
			(electronScreenSourcesByIndex.length === displays.length
				? electronScreenSourcesByIndex[index]
				: undefined);
		if (options?.strict && !matchedSource)
			throw new Error("Unable to identify this screen. Try the picker again.");
		const displayName =
			displayId === primaryDisplayId
				? `Screen ${index + 1} (Primary)`
				: `Screen ${index + 1}`;

		return {
			id: getScreenSourceIdForDisplay({
				displayId,
				env: process.env,
				matchedSourceId: matchedSource?.id,
				platform: process.platform,
			}),
			name: displayName,
			originalName: matchedSource?.name ?? displayName,
			display_id: displayId,
			thumbnail: matchedSource?.thumbnail ? matchedSource.thumbnail.toDataURL() : null,
			appIcon: null,
			sourceType: "screen" as const,
		};
	});

	if (process.platform !== "darwin" || !includeWindows) {
		const windowSources = electronSources
			.filter((source) => source.id?.startsWith("window:"))
			.filter((source) => !isAuxiliaryCaptureWindow(source.name))
			.filter((source) => {
				const normalizedName = normalizeDesktopSourceName(source.name);
				if (!normalizedName) {
					return true;
				}

				if (ALLOW_RECORDLY_WINDOW_CAPTURE && normalizedName.includes("recordly")) {
					return true;
				}

				for (const ownName of ownWindowNames) {
					if (!ownName) continue;
					if (normalizedName === ownName) {
						return false;
					}
				}

				return true;
			})
			.map((source) => ({
				id: source.id,
				name: source.name,
				originalName: source.name,
				display_id: source.display_id,
				thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
				appIcon: includeWindowIcons && source.appIcon ? source.appIcon.toDataURL() : null,
				sourceType: "window" as const,
			}));
		const result = [...screenSources, ...windowSources];
		sourceListCache = {
			key: cacheKey,
			expiresAt: Date.now() + SOURCE_LIST_CACHE_TTL_MS,
			value: result,
		};
		return result;
	}

	try {
		const nativeWindowSources = await getNativeMacWindowSources();
		const electronWindowSourceMap = new Map(
			electronSources
				.filter((source) => source.id?.startsWith("window:"))
				.map((source) => [source.id, source] as const),
		);

		const mergedWindowSources = nativeWindowSources
			.filter((source) => {
				const normalizedWindowName = normalizeDesktopSourceName(
					source.windowTitle ?? source.name,
				);
				const normalizedAppName = normalizeDesktopSourceName(source.appName ?? "");

				if (
					!ALLOW_RECORDLY_WINDOW_CAPTURE &&
					normalizedAppName &&
					normalizedAppName === ownAppName
				) {
					return false;
				}

				if (
					ALLOW_RECORDLY_WINDOW_CAPTURE &&
					(normalizedAppName === "recordly" || normalizedWindowName?.includes("recordly"))
				) {
					return true;
				}

				if (!normalizedWindowName) {
					return true;
				}

				for (const ownName of ownWindowNames) {
					if (!ownName) continue;
					if (normalizedWindowName === ownName) {
						return false;
					}
				}

				return true;
			})
			.map((source) => {
				const electronWindowSource = electronWindowSourceMap.get(source.id);
				return {
					id: source.id,
					name: source.name,
					originalName: source.name,
					display_id: source.display_id ?? electronWindowSource?.display_id ?? "",
					thumbnail: electronWindowSource?.thumbnail
						? electronWindowSource.thumbnail.toDataURL()
						: null,
					appIcon: includeWindowIcons
						? (source.appIcon ??
							(electronWindowSource?.appIcon
								? electronWindowSource.appIcon.toDataURL()
								: null))
						: null,
					appName: source.appName,
					windowTitle: source.windowTitle,
					bundleId: source.bundleId,
					sourceType: "window" as const,
				};
			});

		const result = [...screenSources, ...mergedWindowSources];
		sourceListCache = {
			key: cacheKey,
			expiresAt: Date.now() + SOURCE_LIST_CACHE_TTL_MS,
			value: result,
		};
		return result;
	} catch (error) {
		console.warn("Falling back to Electron window enumeration on macOS:", error);

		const windowSources = electronSources
			.filter((source) => source.id?.startsWith("window:"))
			.filter((source) => {
				const normalizedName = normalizeDesktopSourceName(source.name);
				if (!normalizedName) {
					return true;
				}

				if (ALLOW_RECORDLY_WINDOW_CAPTURE && normalizedName.includes("recordly")) {
					return true;
				}

				for (const ownName of ownWindowNames) {
					if (!ownName) continue;
					if (
						normalizedName === ownName ||
						normalizedName.includes(ownName) ||
						ownName.includes(normalizedName)
					) {
						return false;
					}
				}

				return true;
			})
			.map((source) => ({
				id: source.id,
				name: source.name,
				originalName: source.name,
				display_id: source.display_id,
				thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
				appIcon: includeWindowIcons && source.appIcon ? source.appIcon.toDataURL() : null,
				sourceType: "window" as const,
			}));

		const result = [...screenSources, ...windowSources];
		sourceListCache = {
			key: cacheKey,
			expiresAt: Date.now() + SOURCE_LIST_CACHE_TTL_MS,
			value: result,
		};
		return result;
	}
}

export function registerSourceHandlers({
	createEditorWindow,
	createSourceSelectorWindow,
	getSourceSelectorWindow,
}: {
	createEditorWindow: () => void;
	createSourceSelectorWindow: () => BrowserWindow;
	getSourceSelectorWindow: () => BrowserWindow | null;
}) {
	const recordingNavigation = createRecordingEditorNavigation(createEditorWindow);
	setConfirmedSelectionCancelHandler(() => {
		if (isCursorCaptureActive) return;
		clearSelectedSourceHighlight();
		closeCapturePickerWindows();
		setSelectedSource(null);
		stopWindowBoundsCapture();
		broadcastSelectedSourceChange();
	});
	const sourceListPicker = createSourceListPicker(
		() => getSourceSelectorWindow() ?? createSourceSelectorWindow(),
	);
	ipcMain.handle("get-sources", (_, opts) => getDesktopSources(opts));

	ipcMain.handle("select-source", async (event, source: SelectedSource) => {
		if (isCursorCaptureActive) return selectedSource;
		const fromSelector = getSourceSelectorWindow()?.webContents === event.sender;
		if (process.platform === "linux") {
			const validated = await validateCaptureSource(source);
			if (!validated)
				throw new Error(
					"That window or screen is no longer available. Refresh the source list.",
				);
			source = validated;
		}
		if (source.id?.startsWith("window:")) {
			await bringSelectedWindowForward(source);
		}
		if (isCursorCaptureActive) return selectedSource;
		if (fromSelector && getSourceSelectorWindow()?.webContents !== event.sender)
			return selectedSource;
		setSelectedSource(source);
		broadcastSelectedSourceChange();
		if (sourceListPicker.isSender(event.sender)) sourceListPicker.complete(source);
		stopWindowBoundsCapture();
		const sourceSelectorWin = getSourceSelectorWindow();
		if (sourceSelectorWin) {
			sourceSelectorWin.close();
		}
		app.focus({ steal: true });
		return selectedSource;
	});

	ipcMain.handle("show-source-highlight", async () => {
		await refreshSelectedSourceHighlight();
		return { success: true };
	});

	ipcMain.handle("get-selected-source", () => {
		const source = getSessionCaptureSource();
		if (!source || (!source.id?.startsWith("screen:") && !source.id?.startsWith("area:")))
			return source;
		const display = getScreen()
			.getAllDisplays()
			.find((entry) => String(entry.id) === source.display_id);
		return display
			? { ...source, displayBounds: display.bounds, displayScaleFactor: display.scaleFactor }
			: source;
	});

	ipcMain.handle("open-source-selector", async () => {
		if (isCursorCaptureActive) return;
		if (process.platform === "linux" && isLikelyLinuxWaylandSession(process.env)) {
			setSelectedSource({
				id: LINUX_PORTAL_SCREEN_SOURCE_ID,
				name: "System picker",
				sourceType: "screen",
			});
			broadcastSelectedSourceChange();
			return;
		}
		const sourceSelectorWin = getSourceSelectorWindow();
		if (sourceSelectorWin) {
			sourceSelectorWin.focus();
			return;
		}
		createSourceSelectorWindow();
	});
	ipcMain.handle("show-recording-hud", (event, hideHome?: boolean) => {
		setHudRecordingPreparationActive(true);
		const home = BrowserWindow.fromWebContents(event.sender);
		recordingNavigation.setReturnWindow(home);
		const hud = getHudOverlayWindow();
		if (hud && !hud.isDestroyed()) {
			if (hud.isMinimized()) hud.restore();
			hud.show();
			hud.moveTop();
			hud.focus();
		} else {
			createHudOverlayWindow();
		}
		if (hideHome === true && home && home !== hud && !home.isDestroyed()) home.hide();
	});
	ipcMain.handle("show-recording-permissions", () => {
		if (isCursorCaptureActive) return;
		writeAppSetting("recordly.onboarding.permissionsRequested", true);
		setHudRecordingPreparationActive(false);
		recordingNavigation.open(false);
		for (const window of BrowserWindow.getAllWindows()) {
			if (!window.isDestroyed()) window.webContents.send("recording-permissions-requested");
		}
	});
	ipcMain.handle("show-project-dashboard", () => {
		setHudRecordingPreparationActive(false);
		recordingNavigation.open(false);
	});
	ipcMain.handle("switch-to-editor", () => {
		setHudRecordingPreparationActive(false);
		console.log("[switch-to-editor] Opening editor window");
		const sourceSelectorWin = getSourceSelectorWindow();
		if (sourceSelectorWin && !sourceSelectorWin.isDestroyed()) {
			sourceSelectorWin.close();
		}
		recordingNavigation.open();
	});
	return { pickSourceList: () => sourceListPicker.open() };
}
