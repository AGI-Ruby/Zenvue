import { describe, expect, it } from "vitest";
import { normalizeExportPreferences } from "./exportPreferences";

describe("explicit export resolution persistence", () => {
	it.each([
		"1080p",
		"1440p",
		"4k",
	] as const)("restores %s without reverting to source dimensions", (exportQuality) => {
		expect(normalizeExportPreferences({ exportQuality }).exportQuality).toBe(exportQuality);
	});
});
