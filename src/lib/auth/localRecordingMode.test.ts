import { expect, it } from "vitest";
import { isLocalRecordingMode } from "./localRecordingMode";

it("keeps recording offline without an account service or when the local build is selected", () => {
	expect(isLocalRecordingMode(true, false)).toBe(true);
	expect(isLocalRecordingMode(false, false)).toBe(true);
	expect(isLocalRecordingMode(true, true)).toBe(true);
	expect(isLocalRecordingMode(false, true)).toBe(false);
});
