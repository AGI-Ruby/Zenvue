import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveZenvueProfile } from "./zenvueProfile";
const appData = path.resolve("fixtures/appdata"),
	currentUserData = path.join(appData, "Zenvue");
const base = { appName: "Zenvue", appData, currentUserData, platform: "win32" as const };
describe("Zenvue profile compatibility", () => {
	it("reuses the enhanced recording profile without moving recordings", () => {
		const legacy = path.join(appData, "Recordly Enhanced");
		expect(
			resolveZenvueProfile({ ...base, exists: (p) => p === path.join(legacy, "recordings") }),
		).toBe(legacy);
	});
	it("keeps a fresh profile when only original Recordly data is present", () => {
		expect(
			resolveZenvueProfile({
				...base,
				exists: (p) => p === path.join(appData, "Recordly", "recordings"),
			}),
		).toBe(currentUserData);
	});
	it("does not redirect other application identities", () => {
		expect(resolveZenvueProfile({ ...base, appName: "Recordly", exists: () => true })).toBe(
			currentUserData,
		);
	});
	it("does not apply a Windows legacy directory to other platforms", () => {
		expect(resolveZenvueProfile({ ...base, platform: "darwin", exists: () => true })).toBe(
			currentUserData,
		);
	});
});
