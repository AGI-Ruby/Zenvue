import { describe, expect, it } from "vitest";

import {
	getHudCaptureExcludedProcessIds,
	supportsHudCaptureProtection,
	shouldProtectHudCapture,
	shouldProtectSelectionOverlay,
} from "./hudCaptureProtection";

describe("supportsHudCaptureProtection", () => {
	it.each([
		["win32", true],
		["darwin", true],
		["linux", false],
		["freebsd", false],
	])("reports support for %s as %s", (platform, expected) => {
		expect(supportsHudCaptureProtection(platform)).toBe(expected);
	});
});

describe("getHudCaptureExcludedProcessIds", () => {
	it("passes the current process to macOS capture when protection is enabled", () => {
		expect(getHudCaptureExcludedProcessIds("darwin", true, 4512)).toEqual([4512]);
	});

	it.each([
		["darwin", false, 4512],
		["win32", true, 4512],
		["linux", true, 4512],
		["darwin", true, 0],
		["darwin", true, Number.NaN],
	])("returns no native exclusions for %s, enabled=%s, pid=%s", (platform, enabled, pid) => {
		expect(getHudCaptureExcludedProcessIds(platform, enabled, pid as number)).toEqual([]);
	});
});

describe("remote-visible Windows window recording", () => {
	it.each([
		[true, false],
		[false, true],
		[true, true],
	])("leaves the HUD visible to remote viewers during recording=%s, starting=%s", (recording, starting) => {
		expect(
			shouldProtectHudCapture(true, recording, starting, {
				platform: "win32",
				directWindowCapture: true,
			}),
		).toBe(false);
	});
	it("restores exclusion for screen/area capture and browser fallback", () => {
		expect(
			shouldProtectHudCapture(true, true, false, {
				platform: "win32",
				directWindowCapture: false,
			}),
		).toBe(true);
		expect(
			shouldProtectHudCapture(true, false, true, {
				platform: "win32",
				directWindowCapture: false,
			}),
		).toBe(true);
	});
	it("retains the macOS capture protection policy", () => {
		expect(
			shouldProtectHudCapture(true, true, false, {
				platform: "darwin",
				directWindowCapture: true,
			}),
		).toBe(true);
		expect(
			shouldProtectHudCapture(false, true, false, {
				platform: "darwin",
				directWindowCapture: true,
			}),
		).toBe(false);
	});
	it.each([
		[false, false, false, false],
		[true, false, true, false],
		[false, true, true, false],
		[true, false, false, true],
		[false, true, false, true],
	])("selection overlay recording=%s, starting=%s, direct=%s protects=%s", (recording, starting, direct, expected) => {
		expect(shouldProtectSelectionOverlay("win32", recording, starting, direct)).toBe(expected);
	});
});
