import type { WebContents } from "electron";

/** Handle Escape before the renderer or a focused control can consume it. */
export function attachCapturePickerEscape(contents: Pick<WebContents, "on">, cancel: () => void) {
	contents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown" || (input.key !== "Escape" && input.code !== "Escape")) return;
		event.preventDefault();
		cancel();
	});
}
