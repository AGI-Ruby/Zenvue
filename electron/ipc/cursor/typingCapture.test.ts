import { describe, expect, it } from "vitest";
import { TypingCapture } from "./typingCapture";
const focus = { cx: 0.3, cy: 0.6 };
describe("typing capture", () => {
	it("requires a click and emits only its location", () => {
		const tracker = new TypingCapture();
		expect(tracker.key({ keycode: 30 }, 1000)).toBeNull();
		tracker.click(focus);
		expect(tracker.key({ keycode: 30 }, 1000)).toEqual(focus);
		expect(tracker.key({ keycode: 48 }, 1040)).toBeNull();
		expect(tracker.key({ keycode: 46 }, 1100)).toEqual(focus);
	});
	it.each([1, 15])("invalidates focus on navigation key %d", (keycode) => {
		const tracker = new TypingCapture();
		tracker.click(focus);
		tracker.key({ keycode }, 1000);
		expect(tracker.key({ keycode: 30 }, 2000)).toBeNull();
	});
	it.each([
		{ keycode: 15, altKey: true },
		{ keycode: 30, metaKey: true },
	])("invalidates switched focus", (event) => {
		const tracker = new TypingCapture();
		tracker.click(focus);
		tracker.key(event, 1000);
		expect(tracker.key({ keycode: 30 }, 2000)).toBeNull();
	});
	it("does not treat shortcuts and arrows as typing", () => {
		const tracker = new TypingCapture();
		tracker.click(focus);
		expect(tracker.key({ keycode: 30, ctrlKey: true }, 1000)).toBeNull();
		expect(tracker.key({ keycode: 57419 }, 2000)).toBeNull();
		expect(tracker.key({ keycode: 14 }, 3000)).toEqual(focus);
	});
	it("clears an anchor after outside clicks and recording cleanup", () => {
		const tracker = new TypingCapture();
		tracker.click(focus);
		tracker.click(null);
		expect(tracker.key({ keycode: 30 }, 1000)).toBeNull();
		tracker.click(focus);
		tracker.reset();
		expect(tracker.key({ keycode: 30 }, 2000)).toBeNull();
	});
});
