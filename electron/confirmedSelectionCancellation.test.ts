import { expect, it, vi } from "vitest";
import { createConfirmedSelectionCancellation } from "./confirmedSelectionCancellation";

it("cancels the confirmed selection even when a different application has focus", () => {
	let onEscape!: () => void;
	const cancel = vi.fn();
	const controller = createConfirmedSelectionCancellation({
		register: (callback) => {
			onEscape = callback;
			return true;
		},
		unregister: vi.fn(),
		cancel,
	});
	controller.setActive(true);
	onEscape();
	expect(cancel).toHaveBeenCalledOnce();
});

it("releases Escape before recording and ignores a stale selection callback", () => {
	let onEscape!: () => void;
	const unregister = vi.fn();
	const cancel = vi.fn();
	const register = vi.fn((callback: () => void) => {
		onEscape = callback;
		return true;
	});
	const controller = createConfirmedSelectionCancellation({ register, unregister, cancel });
	controller.setActive(true);
	controller.setActive(true);
	expect(register).toHaveBeenCalledOnce();
	controller.setActive(false);
	onEscape();
	expect(cancel).not.toHaveBeenCalled();
	expect(unregister).toHaveBeenCalledOnce();
	controller.setActive(false);
	expect(unregister).toHaveBeenCalledOnce();
});

it("does not unregister Escape if another application owns it", () => {
	const unregister = vi.fn();
	const controller = createConfirmedSelectionCancellation({
		register: () => false,
		unregister,
		cancel: vi.fn(),
	});
	controller.setActive(true);
	controller.setActive(false);
	expect(unregister).not.toHaveBeenCalled();
});
