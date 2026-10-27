import { afterEach, describe, expect, it, vi } from "vitest";
import { createAreaScreenCapture } from "./areaScreenCapture";

class Track extends EventTarget {
	readyState = "live";
	contentHint = "";
	stop = vi.fn(() => {
		this.readyState = "ended";
	});
}

function setup(play?: () => Promise<void>) {
	vi.useFakeTimers();
	const original = new Track();
	const cropped = new Track();
	const audio = { kind: "audio" };
	class Stream {
		constructor(public tracks: unknown[]) {}
		getVideoTracks() {
			return this.tracks.filter((track) => track !== audio);
		}
		getAudioTracks() {
			return this.tracks.filter((track) => track === audio);
		}
	}
	const context = { imageSmoothingEnabled: true, drawImage: vi.fn() };
	const video = {
		videoWidth: 1920,
		videoHeight: 1080,
		muted: false,
		playsInline: false,
		srcObject: null as unknown,
		play: play ?? vi.fn().mockResolvedValue(undefined),
		pause: vi.fn(),
	};
	const canvas = {
		width: 0,
		height: 0,
		getContext: () => context,
		captureStream: vi.fn(() => new Stream([cropped])),
	};
	vi.stubGlobal("MediaStream", Stream);
	vi.stubGlobal("document", {
		createElement: (tag: string) => (tag === "video" ? video : canvas),
	});
	return {
		original,
		cropped,
		audio,
		video,
		canvas,
		context,
		source: new Stream([original, audio]) as unknown as MediaStream,
	};
}

const area = { x: 100, y: 200, width: 640, height: 480 };
const display = { x: 0, y: 0, width: 1920, height: 1080 };
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("area capture lifecycle without a real display", () => {
	it("encodes only the cropped video, retains audio, and releases the timer on cleanup", async () => {
		const m = setup();
		const capture = await createAreaScreenCapture(m.source, area, display);
		expect(capture.stream.getVideoTracks()).toEqual([m.cropped]);
		expect(capture.stream.getAudioTracks()).toEqual([m.audio]);
		expect(m.context.drawImage).toHaveBeenCalledWith(
			m.video,
			100,
			200,
			640,
			480,
			0,
			0,
			640,
			480,
		);
		expect(m.context.imageSmoothingEnabled).toBe(false);
		capture.stop();
		expect(vi.getTimerCount()).toBe(0);
		expect(m.cropped.stop).toHaveBeenCalledOnce();
		expect(m.video.srcObject).toBeNull();
		// Original ownership remains with the caller's cleanupCapturedMedia.
		expect(m.original.stop).not.toHaveBeenCalled();
	});
	it("propagates loss of the source instead of continuing a frozen canvas recording", async () => {
		const m = setup();
		const capture = await createAreaScreenCapture(m.source, area, display);
		const ended = vi.fn();
		capture.stream.getVideoTracks()[0].addEventListener("ended", ended);
		m.original.dispatchEvent(new Event("ended"));
		expect(ended).toHaveBeenCalledOnce();
		expect(vi.getTimerCount()).toBe(0);
	});
	it("rejects an ended source during asynchronous video initialization", async () => {
		let finish!: () => void;
		const m = setup(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		const pending = createAreaScreenCapture(m.source, area, display);
		m.original.dispatchEvent(new Event("ended"));
		finish();
		await expect(pending).rejects.toThrow("no video frames");
		expect(m.canvas.captureStream).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});
	it("ends capture if the display dimensions change", async () => {
		const m = setup();
		const capture = await createAreaScreenCapture(m.source, area, display);
		const ended = vi.fn();
		capture.stream.getVideoTracks()[0].addEventListener("ended", ended);
		m.video.videoWidth = 1280;
		vi.advanceTimersByTime(20);
		expect(ended).toHaveBeenCalledOnce();
		expect(m.context.drawImage).toHaveBeenCalledTimes(1);
	});
});
