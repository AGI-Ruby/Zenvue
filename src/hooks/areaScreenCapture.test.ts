import { describe, expect, it } from "vitest";
import { captureLimits, recordingBitrate, resolveAreaPixels } from "./areaScreenCapture";

describe("area capture pixel mapping", () => {
	it("preserves native pixels on a 150% display with a negative desktop origin", () => {
		expect(
			resolveAreaPixels(
				{ x: -1500, y: 200, width: 800, height: 600 },
				{ x: -1920, y: 0, width: 1920, height: 1080 },
				2880,
				1620,
			),
		).toEqual({ x: 630, y: 300, width: 1200, height: 900 });
	});
	it("rounds inward without stretching fractional pixel bounds", () => {
		const crop = resolveAreaPixels(
			{ x: 1, y: 1, width: 33, height: 33 },
			{ x: 0, y: 0, width: 100, height: 100 },
			125,
			125,
		);
		expect(crop).toEqual({ x: 2, y: 2, width: 40, height: 40 });
		expect(crop.x + crop.width).toBeLessThanOrEqual(34 * 1.25);
	});
	it("rejects stale or invalid areas rather than recording the whole screen", () => {
		for (const area of [
			{ x: -1, y: 0, width: 100, height: 100 },
			{ x: 0, y: 0, width: 2000, height: 100 },
			{ x: 0, y: 0, width: NaN, height: 100 },
		])
			expect(() =>
				resolveAreaPixels(area, { x: 0, y: 0, width: 1920, height: 1080 }, 1920, 1080),
			).toThrow();
	});
	it("does not constrain ultrawide/high-DPI displays to 4K", () => {
		expect(captureLimits({ x: 0, y: 0, width: 2560, height: 1440 }, 2)).toEqual({
			width: 5120,
			height: 2880,
		});
	});
	it("budgets bitrate for actual resolution and frame rate with a bounded maximum", () => {
		expect(recordingBitrate(3840, 2160, 60)).toBeGreaterThan(recordingBitrate(1920, 1080, 60));
		expect(recordingBitrate(5120, 2880, 60)).toBeGreaterThan(recordingBitrate(3840, 2160, 60));
		expect(recordingBitrate(1920, 1080, 60)).toBeGreaterThan(recordingBitrate(1920, 1080, 30));
		expect(recordingBitrate(16384, 16384, 120)).toBe(160_000_000);
	});
});
