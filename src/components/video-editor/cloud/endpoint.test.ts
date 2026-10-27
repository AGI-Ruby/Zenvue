import { expect, it } from "vitest";
import { resolvePublishDestination } from "./endpoint";

it("recovers a saved cloud export destination when sharing is unavailable", () => {
	expect(resolvePublishDestination("link", false)).toBe("local");
	expect(resolvePublishDestination("local", false)).toBe("local");
	expect(resolvePublishDestination("link", true)).toBe("link");
});
