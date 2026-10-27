import { expect, it } from "vitest";
import { isLocalRecordingMode } from "./localRecordingMode";

it("enables offline recording only for the explicitly selected local build without cloud configuration", () => {
	expect(isLocalRecordingMode(true, false)).toBe(true);
	expect(isLocalRecordingMode(false, false)).toBe(false);
	expect(isLocalRecordingMode(true, true)).toBe(false);
	expect(isLocalRecordingMode(false, true)).toBe(false);
});
