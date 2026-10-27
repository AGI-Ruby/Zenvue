import { describe, expect, it } from "vitest";
import type { CursorTelemetryPoint } from "../types";
import {
	buildInteractionZoomSuggestions,
	hasAutoZoomTelemetry,
	CLICK_CLUSTER_MERGE_GAP_MS,
	CLICK_CLUSTER_PAD_MS,
	shouldAutoApplyFreshRecordingZoomsForSource,
} from "./zoomSuggestionUtils";

function makeClick(
	timeMs: number,
	cx = 0.5,
	cy = 0.5,
	interactionType: CursorTelemetryPoint["interactionType"] = "click",
): CursorTelemetryPoint {
	return { timeMs, cx, cy, interactionType };
}

function makeMove(timeMs: number, cx = 0.5, cy = 0.5): CursorTelemetryPoint {
	return { timeMs, cx, cy, interactionType: "move" };
}

/** Wraps click samples with surrounding move events to mimic real mixed telemetry. */
function withMoves(clicks: CursorTelemetryPoint[], totalMs: number): CursorTelemetryPoint[] {
	return [makeMove(0), ...clicks, makeMove(totalMs)];
}

const TOTAL_MS = 30_000;

describe("shouldAutoApplyFreshRecordingZoomsForSource", () => {
	it("allows automatic fresh-recording zooms for landscape captures", () => {
		expect(shouldAutoApplyFreshRecordingZoomsForSource(1920, 1080)).toBe(true);
		expect(shouldAutoApplyFreshRecordingZoomsForSource(1280, 960)).toBe(true);
	});

	it("blocks automatic fresh-recording zooms for narrow or near-square captures", () => {
		expect(shouldAutoApplyFreshRecordingZoomsForSource(960, 1020)).toBe(false);
		expect(shouldAutoApplyFreshRecordingZoomsForSource(1080, 1080)).toBe(false);
	});

	it("allows narrow Windows window captures when click telemetry is available", () => {
		expect(shouldAutoApplyFreshRecordingZoomsForSource(936, 1028, "win32")).toBe(true);
	});

	it("does not block when source dimensions are not available yet", () => {
		expect(shouldAutoApplyFreshRecordingZoomsForSource()).toBe(true);
	});
});

describe("buildInteractionZoomSuggestions (click-cluster logic)", () => {
	it("creates one zoom track for a single isolated click with 500ms padding", () => {
		const telemetry = withMoves([makeClick(5_000)], TOTAL_MS);

		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("ok");
		expect(result.suggestions).toHaveLength(1);

		const [s] = result.suggestions;
		expect(s.start).toBe(5_000 - CLICK_CLUSTER_PAD_MS);
		expect(s.end).toBe(5_000 + CLICK_CLUSTER_PAD_MS);
	});

	it("accepts a single explicit click sample without needing surrounding moves", () => {
		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: [makeClick(5_000)],
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("ok");
		expect(result.suggestions).toHaveLength(1);
	});

	it.each([
		"right-click",
		"middle-click",
	] as const)("accepts %s telemetry like a standard click", (interactionType) => {
		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: withMoves([makeClick(5_000, 0.5, 0.5, interactionType)], TOTAL_MS),
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("ok");
		expect(result.suggestions).toHaveLength(1);

		const [suggestion] = result.suggestions;
		expect(suggestion.start).toBe(5_000 - CLICK_CLUSTER_PAD_MS);
		expect(suggestion.end).toBe(5_000 + CLICK_CLUSTER_PAD_MS);
	});

	it("merges two clicks within 2500ms into one zoom track", () => {
		const telemetry = withMoves(
			[makeClick(4_000), makeClick(4_000 + CLICK_CLUSTER_MERGE_GAP_MS - 1)],
			TOTAL_MS,
		);

		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("ok");
		expect(result.suggestions).toHaveLength(1);

		const [s] = result.suggestions;
		const lastClickMs = 4_000 + CLICK_CLUSTER_MERGE_GAP_MS - 1;
		expect(s.start).toBe(4_000 - CLICK_CLUSTER_PAD_MS);
		expect(s.end).toBe(lastClickMs + CLICK_CLUSTER_PAD_MS);
	});

	it("splits two clicks more than 2500ms apart into separate zoom tracks", () => {
		const click1 = 3_000;
		const click2 = 3_000 + CLICK_CLUSTER_MERGE_GAP_MS + 1; // just outside the merge gap

		const telemetry = withMoves([makeClick(click1), makeClick(click2)], TOTAL_MS);

		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("ok");
		expect(result.suggestions).toHaveLength(2);

		const [a, b] = result.suggestions;
		expect(a.start).toBe(click1 - CLICK_CLUSTER_PAD_MS);
		expect(a.end).toBe(click1 + CLICK_CLUSTER_PAD_MS);
		expect(b.start).toBe(click2 - CLICK_CLUSTER_PAD_MS);
		expect(b.end).toBe(click2 + CLICK_CLUSTER_PAD_MS);
	});

	it("chains multiple clicks: 3 in a row within 2500ms each become one track", () => {
		// click at 0, 2000, 4000 — each gap is 2000ms < 2500ms
		const telemetry = withMoves([makeClick(0), makeClick(2_000), makeClick(4_000)], TOTAL_MS);

		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("ok");
		expect(result.suggestions).toHaveLength(1);

		const [s] = result.suggestions;
		expect(s.start).toBe(0); // clamped to 0 (would be -500)
		expect(s.end).toBe(4_000 + CLICK_CLUSTER_PAD_MS);
	});

	it("returns no-interactions when there are no click telemetry points", () => {
		// Move events only — no clicks
		const telemetry: CursorTelemetryPoint[] = [
			{ timeMs: 0, cx: 0.5, cy: 0.5, interactionType: "move" },
			{ timeMs: 1_000, cx: 0.5, cy: 0.5, interactionType: "move" },
			{ timeMs: 2_000, cx: 0.6, cy: 0.6, interactionType: "move" },
			{ timeMs: TOTAL_MS, cx: 0.6, cy: 0.6, interactionType: "move" },
		];

		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("no-interactions");
		expect(result.suggestions).toHaveLength(0);
	});

	it("ignores dwell-derived click-like heuristics when there are no explicit clicks", () => {
		const telemetry: CursorTelemetryPoint[] = [
			makeMove(0, 0.5, 0.5),
			makeMove(200, 0.5005, 0.5005),
			makeMove(400, 0.5008, 0.5008),
			makeMove(600, 0.501, 0.501),
		];

		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("no-interactions");
		expect(result.suggestions).toHaveLength(0);
	});

	it("skips clusters that overlap reserved spans", () => {
		const click = 5_000;

		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: withMoves([makeClick(click)], TOTAL_MS),
			totalMs: TOTAL_MS,
			defaultDurationMs: 3_000,
			reservedSpans: [{ start: 4_000, end: 6_000 }], // overlaps the cluster window
		});

		expect(result.status).toBe("no-slots");
		expect(result.suggestions).toHaveLength(0);
	});

	it("clamps start to 0 and end to totalMs at video boundaries", () => {
		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: withMoves([makeClick(200)], 1_000),
			totalMs: 1_000,
			defaultDurationMs: 3_000,
		});

		expect(result.status).toBe("ok");
		const [s] = result.suggestions;
		expect(s.start).toBeGreaterThanOrEqual(0);
		expect(s.end).toBeLessThanOrEqual(1_000);
	});
});

describe("spatial automatic zoom grouping", () => {
	it("keeps rapid clicks in distant areas focused separately without overlaps", () => {
		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: [makeClick(5000, 0.1, 0.5), makeClick(5200, 0.9, 0.5)],
			totalMs: TOTAL_MS,
			defaultDurationMs: 3000,
		});
		expect(result.status).toBe("ok");
		expect(result.suggestions).toHaveLength(2);
		const [left, right] = result.suggestions;
		expect(left.focus.cx).toBe(0.1);
		expect(right.focus.cx).toBe(0.9);
		expect(left.start).toBeLessThanOrEqual(5000);
		expect(left.end).toBeGreaterThanOrEqual(5000);
		expect(right.start).toBeLessThanOrEqual(5200);
		expect(right.end).toBeGreaterThanOrEqual(5200);
		expect(left.end).toBeLessThanOrEqual(right.start);
	});

	it("still merges repeated clicks in the same local area", () => {
		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: [makeClick(5000, 0.4, 0.5), makeClick(5200, 0.42, 0.52)],
			totalMs: TOTAL_MS,
			defaultDurationMs: 3000,
		});
		expect(result.suggestions).toHaveLength(1);
		expect(result.suggestions[0].start).toBe(4500);
		expect(result.suggestions[0].end).toBe(5700);
	});

	it("does not let a chain of small movements merge distant actions forever", () => {
		const result = buildInteractionZoomSuggestions({
			cursorTelemetry: [makeClick(5000, 0.1), makeClick(6000, 0.25), makeClick(7000, 0.4)],
			totalMs: TOTAL_MS,
			defaultDurationMs: 3000,
		});
		expect(result.suggestions).toHaveLength(2);
	});
});

describe("hasAutoZoomTelemetry", () => {
	it("allows a single real click to trigger fresh recording zooms", () => {
		expect(hasAutoZoomTelemetry([makeClick(1000)])).toBe(true);
		expect(hasAutoZoomTelemetry([makeClick(1000, 0.5, 0.5, "right-click")])).toBe(true);
		expect(hasAutoZoomTelemetry([makeMove(1000)])).toBe(false);
		expect(hasAutoZoomTelemetry([])).toBe(false);
	});
});
