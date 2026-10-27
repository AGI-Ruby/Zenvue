import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
	displays: [{ id: 2, bounds: { x: -1920, y: 0, width: 1920, height: 1080 } }],
}));
vi.mock("./capturePickerSources", () => ({ listCapturePickerWindows: vi.fn(async () => []) }));
vi.mock("./register/sources", () => ({ getDesktopSources: vi.fn(async () => []) }));
vi.mock("./state", () => ({ selectedSource: null }));
vi.mock("./utils", () => ({ getScreen: () => ({ getAllDisplays: () => fixture.displays }) }));
import { validateCaptureSource } from "./captureSelection";
const originalPlatform = process.platform;
const source = () => ({
	id: "area:2",
	name: "Area",
	display_id: "2",
	sourceType: "area",
	area: { x: -1800, y: 100, width: 800, height: 600 },
});
beforeEach(() => {
	Object.defineProperty(process, "platform", { value: "win32" });
	fixture.displays = [{ id: 2, bounds: { x: -1920, y: 0, width: 1920, height: 1080 } }];
});
afterEach(() => Object.defineProperty(process, "platform", { value: originalPlatform }));

describe("Windows area source validation", () => {
	it("accepts an exact region on a connected negative-origin display", async () => {
		expect(await validateCaptureSource(source())).toMatchObject({
			...source(),
			name: "Area 800×600",
		});
	});
	it("rejects a removed display instead of changing the target to the primary screen", async () => {
		fixture.displays = [];
		expect(await validateCaptureSource(source())).toBeNull();
	});
	it("rejects stale geometry if a display move would clip the saved region", async () => {
		fixture.displays[0].bounds.x = -1000;
		expect(await validateCaptureSource(source())).toBeNull();
	});
	it("rejects a region spanning two monitors", async () => {
		const candidate = source();
		candidate.area.x = -400;
		expect(await validateCaptureSource(candidate)).toBeNull();
	});
});
