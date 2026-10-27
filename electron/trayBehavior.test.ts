import { expect, it, vi } from "vitest";
import { activateTrayClick, shouldUseTray } from "./trayBehavior";

it("keeps a tray entry on Windows and Linux", () => {
	expect(shouldUseTray("win32")).toBe(true);
	expect(shouldUseTray("linux")).toBe(true);
	expect(shouldUseTray("darwin")).toBe(false);
});

it("Windows left click opens the floating controls instead of the homepage", () => {
	const showHud = vi.fn(() => true);
	const showMain = vi.fn();
	activateTrayClick("win32", { button: 0 }, showHud, showMain);
	expect(showHud).toHaveBeenCalledOnce();
	expect(showMain).not.toHaveBeenCalled();
});

it("leaves Windows right click to the context menu", () => {
	const showHud = vi.fn(() => true);
	const showMain = vi.fn();
	activateTrayClick("win32", { button: 2 }, showHud, showMain);
	expect(showHud).not.toHaveBeenCalled();
	expect(showMain).not.toHaveBeenCalled();
});

it("handles tray events without a button and falls back if controls cannot open", () => {
	const showHud = vi.fn(() => false);
	const showMain = vi.fn();
	activateTrayClick("win32", {}, showHud, showMain);
	expect(showHud).toHaveBeenCalledOnce();
	expect(showMain).toHaveBeenCalledOnce();
});
