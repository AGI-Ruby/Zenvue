import { describe, expect, it } from "vitest";
import {
	buildInteractionZoomSuggestions,
	normalizeCursorTelemetry,
	hasAutoZoomTelemetry,
} from "./zoomSuggestionUtils";
import { findActiveTypingFocus, resolveSceneZoomTarget } from "../videoPlayback/sceneMotion";
import { createCursorFollowCameraState } from "../videoPlayback/cursorFollowCamera";
import type { CursorTelemetryPoint } from "../types";
const focus = { cx: 0.3, cy: 0.6 };
const typing = (timeMs: number): CursorTelemetryPoint => ({
	timeMs,
	cx: 0.9,
	cy: 0.1,
	interactionType: "move",
	typingFocus: focus,
});
const suggest = (
	cursorTelemetry: CursorTelemetryPoint[],
	reservedSpans?: { start: number; end: number }[],
) =>
	buildInteractionZoomSuggestions({
		cursorTelemetry,
		totalMs: 20000,
		defaultDurationMs: 1500,
		reservedSpans,
	});
describe("typing zoom", () => {
	it("accepts one input event and keeps its separate pointer location", () => {
		const samples = normalizeCursorTelemetry([typing(1000)], 20000);
		expect(hasAutoZoomTelemetry(samples)).toBe(true);
		expect(samples[0]).toMatchObject({ cx: 0.9, cy: 0.1, typingFocus: focus });
		expect(suggest(samples).suggestions).toEqual([{ start: 500, end: 2200, focus }]);
	});
	it("holds zoom through sustained typing and ends after a pause", () => {
		const samples = Array.from({ length: 11 }, (_, i) => typing(1000 + i * 1000));
		expect(suggest(samples).suggestions).toEqual([{ start: 500, end: 12200, focus }]);
	});
	it("separates input bursts after a pause", () => {
		const result = suggest([typing(1000), typing(4000)]);
		expect(result.suggestions).toHaveLength(2);
		expect(result.suggestions[0].end).toBe(2200);
	});
	it("keeps manually reserved zooms", () => {
		expect(suggest([typing(1000)], [{ start: 500, end: 2300 }]).status).toBe("no-slots");
	});
	it("discards invalid input locations", () => {
		expect(
			normalizeCursorTelemetry(
				[{ ...typing(1000), typingFocus: { cx: NaN, cy: 0.5 } }],
				20000,
			)[0].typingFocus,
		).toBeUndefined();
	});
	it("holds the camera on input while the visible pointer moves away", () => {
		const samples = [
			typing(1000),
			{ timeMs: 1400, cx: 1, cy: 0, interactionType: "move" as const },
		];
		expect(findActiveTypingFocus(samples, 1500)).toEqual(focus);
		expect(findActiveTypingFocus(samples, 2201)).toBeNull();
		const result = resolveSceneZoomTarget({
			zoomRegions: [
				{ id: "typing", startMs: 500, endMs: 5000, depth: 2, mode: "auto", focus },
			],
			timeMs: 1500,
			cursorTelemetry: samples,
			cursorFollowCamera: createCursorFollowCameraState(),
		});
		expect(result.focus).toEqual(focus);
	});
	it("respects a subsequent click and backwards seeking", () => {
		const samples = [
			typing(1000),
			{ timeMs: 1400, cx: 1, cy: 0, interactionType: "click" as const },
		];
		expect(findActiveTypingFocus(samples, 1500)).toBeNull();
		expect(findActiveTypingFocus(samples, 1100)).toEqual(focus);
		expect(findActiveTypingFocus(samples, 900)).toBeNull();
	});
});
