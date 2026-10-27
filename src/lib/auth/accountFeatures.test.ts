import { afterEach, expect, it, vi } from "vitest";
import { areAccountFeaturesEnabled } from "./accountFeatures";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

it("requires deliberate opt-in and complete configuration", () => {
	expect(areAccountFeaturesEnabled(undefined, "https://auth.example.test", "public-key")).toBe(
		false,
	);
	expect(areAccountFeaturesEnabled("0", "https://auth.example.test", "public-key")).toBe(false);
	expect(areAccountFeaturesEnabled("1", " ", "public-key")).toBe(false);
	expect(areAccountFeaturesEnabled("1", "https://auth.example.test", "")).toBe(false);
	expect(areAccountFeaturesEnabled("1", "https://auth.example.test", "public-key")).toBe(true);
});

it("does not create an auth client or require a session in the default free build even with credentials present", async () => {
	vi.stubEnv("VITE_ZENVUE_ACCOUNTS_ENABLED", "0");
	vi.stubEnv("VITE_SUPABASE_URL", "https://auth.example.test");
	vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-key");
	vi.stubEnv("VITE_RECORDLY_LOCAL_BUILD", "0");
	const auth = await import("./recordlyAuth");
	const recording = await import("./localRecordingMode");
	expect(auth.recordlyAuth).toBeNull();
	expect(await auth.getEnabledSignInProviders()).toEqual([]);
	expect(recording.LOCAL_RECORDING_MODE).toBe(true);
});
