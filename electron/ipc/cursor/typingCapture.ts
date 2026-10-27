import type { HookMouseEvent } from "../types";
type Point = { cx: number; cy: number };
/** Stores timing and a clicked focus only. Never stores key codes or text. */
export class TypingCapture {
	private anchor: Point | null = null;
	private lastTimeMs = -Infinity;
	reset() {
		this.anchor = null;
		this.lastTimeMs = -Infinity;
	}
	click(point: Point | null) {
		this.anchor = point;
		this.lastTimeMs = -Infinity;
	}
	key(event: HookMouseEvent, timeMs: number): Point | null {
		const code = event.keycode;
		if (event.altKey || event.metaKey || code === 15 || code === 1) {
			this.reset();
			return null;
		}
		if (event.ctrlKey || typeof code !== "number") return null;
		const isTypingKey =
			(code >= 2 && code <= 14) ||
			(code >= 16 && code <= 28) ||
			(code >= 30 && code <= 53) ||
			code === 57 ||
			(code >= 71 && code <= 83) ||
			code === 3667;
		if (!isTypingKey || !this.anchor || timeMs - this.lastTimeMs < 100) return null;
		this.lastTimeMs = timeMs;
		return { ...this.anchor };
	}
}
