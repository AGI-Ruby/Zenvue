import { describe, expect, it } from "vitest";
import { SmoothedCursorState } from "./smoothedCursorState";

const makeState = () =>
	new SmoothedCursorState({ smoothingFactor: 0.5, trailLength: 4, springTuning: {} });

describe("SmoothedCursorState media timing", () => {
	it("does not drift or grow trails when a paused frame is redrawn", () => {
		const state = makeState();
		state.update(0.1, 0.2, 0);
		state.update(0.8, 0.9, 16);
		const position = { x: state.x, y: state.y, trail: [...state.trail] };
		for (let i = 0; i < 100; i++) state.update(0.8, 0.9, 16);
		expect(state.x).toBe(position.x);
		expect(state.y).toBe(position.y);
		expect(state.trail).toEqual(position.trail);
	});

	it.each([2000, -100])("snaps and clears the trail on a seek to %d ms", (timeMs) => {
		const state = makeState();
		state.update(0.1, 0.2, 0);
		state.update(0.8, 0.9, 16);
		state.update(0.4, 0.6, timeMs);
		expect(state.x).toBe(0.4);
		expect(state.y).toBe(0.6);
		expect(state.trail).toEqual([]);
	});

	it("continues smoothing during regular playback", () => {
		const state = makeState();
		state.update(0.1, 0.2, 0);
		state.update(0.8, 0.9, 16);
		expect(state.x).toBeGreaterThan(0.1);
		expect(state.x).toBeLessThan(0.8);
		expect(state.trail).toEqual([{ x: 0.1, y: 0.2 }]);
		for (let time = 32; time <= 2000; time += 16) state.update(0.8, 0.9, time);
		expect(state.x).toBeCloseTo(0.8, 3);
		expect(state.y).toBeCloseTo(0.9, 3);
		expect(state.trail.length).toBeLessThanOrEqual(4);
	});
});
