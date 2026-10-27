import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { attachCapturePickerEscape } from "./capturePickerKeyboard";

describe("capture picker native keyboard cancellation", () => {
	it("cancels Escape at key-down even if the renderer would consume the event", () => {
		let listener!: (
			event: { preventDefault: () => void },
			input: { type: string; key: string; code: string },
		) => void;
		const contents = {
			on: vi.fn((_name, handler) => {
				listener = handler;
			}),
		};
		const cancel = vi.fn();
		attachCapturePickerEscape(contents as unknown as WebContents, cancel);
		const preventDefault = vi.fn();
		listener({ preventDefault }, { type: "keyDown", key: "Escape", code: "Escape" });
		expect(preventDefault).toHaveBeenCalledOnce();
		expect(cancel).toHaveBeenCalledOnce();
	});
	it("does not cancel Enter or key-up", () => {
		let listener!: (
			event: { preventDefault: () => void },
			input: { type: string; key: string; code: string },
		) => void;
		const cancel = vi.fn();
		attachCapturePickerEscape(
			{
				on: (_name: string, handler: typeof listener) => {
					listener = handler;
				},
			} as unknown as WebContents,
			cancel,
		);
		listener({ preventDefault: vi.fn() }, { type: "keyUp", key: "Escape", code: "Escape" });
		listener({ preventDefault: vi.fn() }, { type: "keyDown", key: "Enter", code: "Enter" });
		expect(cancel).not.toHaveBeenCalled();
	});
});
