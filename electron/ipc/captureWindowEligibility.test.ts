import { expect, it } from "vitest";
import { isAuxiliaryCaptureWindow, isEligibleWindowsCaptureWindow } from "./captureWindowEligibility";

it("rejects the cursor helper without excluding ordinary applications", () => {
	expect(isAuxiliaryCaptureWindow("Cua.AgentCursorOverlay.defaultCua.AgentCursor")).toBe(true);
	expect(isAuxiliaryCaptureWindow("Clash Verge")).toBe(false);
});

it("rejects protected and click-through layered windows, but keeps normal layered apps", () => {
	expect(isEligibleWindowsCaptureWindow({ displayAffinity: 0x11 })).toBe(false);
	expect(isEligibleWindowsCaptureWindow({ extendedStyle: 0x80020 })).toBe(false);
	expect(isEligibleWindowsCaptureWindow({ extendedStyle: 0x80000 })).toBe(true);
	expect(isEligibleWindowsCaptureWindow({ extendedStyle: 0 })).toBe(true);
});
