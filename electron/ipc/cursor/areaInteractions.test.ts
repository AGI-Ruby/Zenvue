import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ cursor: { x: -1500, y: 200 } }));
vi.mock("electron", () => ({ app: { getPath: () => "/tmp" } }));
vi.mock("../utils", () => ({
	getScreen: () => ({
		getCursorScreenPoint: () => fixture.cursor,
		dipToScreenPoint: (point: { x: number; y: number }) => ({
			x: point.x * 1.5,
			y: point.y * 1.5,
		}),
		screenToDipPoint: (point: { x: number; y: number }) => ({
			x: point.x / 1.5,
			y: point.y / 1.5,
		}),
		getPrimaryDisplay: () => ({ scaleFactor: 1.5 }),
		getDisplayNearestPoint: () => ({ scaleFactor: 1.5 }),
	}),
}));
import {
	activeCursorSamples,
	setActiveCursorSamples,
	setCursorCaptureStartTimeMs,
	setIsCursorCaptureActive,
	setLastLeftClick,
	setSelectedSource,
	setSelectedWindowBounds,
	setWindowsCaptureFrameSize,
} from "../state";
import {
	getNormalizedCursorPoint,
	resetCursorCaptureClock,
	normalizeCursorTelemetrySamples,
	pauseCursorCapture,
} from "./telemetry";
import {
	getHookCursorDipPoint,
	recordCursorMouseDown,
	recordCursorMouseUp,
	recordTypingKey,
	stopInteractionCapture,
} from "./interaction";

const originalPlatform = process.platform;
beforeEach(() => {
	Object.defineProperty(process, "platform", { value: "win32" });
	setSelectedSource({
		id: "area:2",
		name: "Area",
		display_id: "2",
		sourceType: "area",
		area: { x: -1800, y: 100, width: 800, height: 600 },
	});
	fixture.cursor = { x: -1400, y: 400 };
	setIsCursorCaptureActive(true);
	setActiveCursorSamples([]);
	setCursorCaptureStartTimeMs(Date.now());
	setLastLeftClick(null);
	setWindowsCaptureFrameSize(null);
	setSelectedWindowBounds(null);
	resetCursorCaptureClock();
});
afterEach(() => {
	Object.defineProperty(process, "platform", { value: originalPlatform });
	setSelectedSource(null);
	setWindowsCaptureFrameSize(null);
	setSelectedWindowBounds(null);
	setIsCursorCaptureActive(false);
	setActiveCursorSamples([]);
});

describe("Windows area click telemetry", () => {
	it("normalizes Electron DIP coordinates without applying display scaling twice", () => {
		expect(getNormalizedCursorPoint({ excludeOutsideArea: true })).toEqual({
			cx: 0.5,
			cy: 0.5,
		});
		recordCursorMouseDown(1);
		recordCursorMouseUp();
		expect(
			activeCursorSamples.map(({ cx, cy, interactionType }) => ({ cx, cy, interactionType })),
		).toEqual([
			{ cx: 0.5, cy: 0.5, interactionType: "click" },
			{ cx: 0.5, cy: 0.5, interactionType: "mouseup" },
		]);
	});
	it.each([
		[-1801, 400],
		[-999, 400],
		[-1400, 99],
		[-1400, 701],
		[-1000, 400],
		[-1400, 700],
	])("ignores global clicks outside the selected area at %d,%d", (x, y) => {
		fixture.cursor = { x, y };
		recordCursorMouseDown(1);
		recordCursorMouseDown(2);
		recordCursorMouseUp();
		expect(activeCursorSamples).toEqual([]);
	});
	it("retains edge clamping for cursor motion without inventing interactions", () => {
		fixture.cursor = { x: -900, y: 400 };
		expect(getNormalizedCursorPoint()).toEqual({ cx: 1, cy: 0.5 });
		expect(getNormalizedCursorPoint({ excludeOutsideArea: true })).toBeNull();
	});
});

describe("event-time click coordinates", () => {
	it("uses the click's physical location even after the live pointer moved", () => {
		fixture.cursor = { x: -1200, y: 200 };
		const point = getHookCursorDipPoint({ x: -2100, y: 600 });
		recordCursorMouseDown(1, point);
		recordCursorMouseUp(point);
		expect(activeCursorSamples.map((s) => ({ cx: s.cx, cy: s.cy }))).toEqual([
			{ cx: 0.5, cy: 0.5 },
			{ cx: 0.5, cy: 0.5 },
		]);
	});
	it("normalizes window clicks in physical capture pixels with a fixed recording canvas", () => {
		setSelectedSource({ id: "window:101:0", name: "Window" });
		setSelectedWindowBounds({
			x: -1800,
			y: 100,
			width: 800,
			height: 600,
			physicalBounds: { x: -2700, y: 150, width: 1200, height: 900 },
		});
		setWindowsCaptureFrameSize({ width: 1600, height: 1000 });
		expect(getNormalizedCursorPoint()).toEqual({ cx: 0.375, cy: 0.45 });
		recordCursorMouseDown(1);
		expect(activeCursorSamples[0]).toMatchObject({ cx: 0.375, cy: 0.45 });
		setWindowsCaptureFrameSize({ width: 500, height: 400 });
		expect(getNormalizedCursorPoint({ excludeOutsideArea: true })).toBeNull();
	});
	it("does not normalize window clicks against the whole display before geometry arrives", () => {
		setSelectedSource({ id: "window:101:0", name: "Window" });
		setSelectedWindowBounds(null);
		expect(getNormalizedCursorPoint()).toBeNull();
		recordCursorMouseDown(1);
		expect(activeCursorSamples).toEqual([]);
		setSelectedWindowBounds({ x: -1800, y: 100, width: 800, height: 600 });
		expect(getNormalizedCursorPoint()).toEqual({ cx: 0.5, cy: 0.5 });
		setSelectedWindowBounds(null);
	});
});

describe("typing recording integration", () => {
	it("saves typing focus independently of the moving pointer and restores it", () => {
		recordCursorMouseDown(1);
		fixture.cursor = { x: -1200, y: 200 };
		recordTypingKey({ keycode: 30 });
		const sample = activeCursorSamples.find((s) => s.typingFocus);
		expect(sample).toMatchObject({ cx: 0.75, cy: 1 / 6, typingFocus: { cx: 0.5, cy: 0.5 } });
		const loaded = normalizeCursorTelemetrySamples(
			JSON.parse(JSON.stringify({ samples: activeCursorSamples })),
		);
		expect(loaded.find((s) => s.typingFocus)?.typingFocus).toEqual({ cx: 0.5, cy: 0.5 });
		expect(JSON.stringify(loaded)).not.toContain("keycode");
	});
	it("suppresses typing after clicking outside the selected area", () => {
		recordCursorMouseDown(1);
		fixture.cursor = { x: 0, y: 0 };
		recordCursorMouseDown(1);
		recordTypingKey({ keycode: 30 });
		expect(activeCursorSamples.some((s) => s.typingFocus)).toBe(false);
	});
	it("suppresses input when paused, stopped or cleaned up", () => {
		recordCursorMouseDown(1);
		pauseCursorCapture(Date.now());
		recordTypingKey({ keycode: 30 });
		resetCursorCaptureClock();
		stopInteractionCapture();
		recordTypingKey({ keycode: 30 });
		recordCursorMouseDown(1);
		setIsCursorCaptureActive(false);
		recordTypingKey({ keycode: 30 });
		expect(activeCursorSamples.some((s) => s.typingFocus)).toBe(false);
	});
});
