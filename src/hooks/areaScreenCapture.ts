export interface CaptureRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Map desktop DIPs to the actual captured pixels, including mixed-DPI displays. */
export function resolveAreaPixels(
	area: CaptureRect,
	display: CaptureRect,
	width: number,
	height: number,
) {
	if (
		![...Object.values(area), ...Object.values(display), width, height].every(
			Number.isFinite,
		) ||
		display.width <= 0 ||
		display.height <= 0 ||
		area.width <= 0 ||
		area.height <= 0 ||
		width < 2 ||
		height < 2 ||
		area.x < display.x ||
		area.y < display.y ||
		area.x + area.width > display.x + display.width ||
		area.y + area.height > display.y + display.height
	) {
		throw new Error(
			"The recording area is no longer on the selected display. Select it again.",
		);
	}
	const sx = width / display.width;
	const sy = height / display.height;
	// Round inward: the encoder must never receive pixels outside the selected area.
	const x = Math.ceil((area.x - display.x) * sx);
	const y = Math.ceil((area.y - display.y) * sy);
	const right = Math.floor((area.x + area.width - display.x) * sx);
	const bottom = Math.floor((area.y + area.height - display.y) * sy);
	const croppedWidth = Math.floor((right - x) / 2) * 2;
	const croppedHeight = Math.floor((bottom - y) / 2) * 2;
	if (croppedWidth < 2 || croppedHeight < 2) throw new Error("The recording area is too small.");
	return { x, y, width: croppedWidth, height: croppedHeight };
}

export function recordingBitrate(width: number, height: number, fps = 60) {
	// Scale with actual pixels and fps rather than giving every source above 4K the same budget.
	const pixels = Math.max(1, width) * Math.max(1, height);
	const frameRate = Math.min(120, Math.max(1, fps));
	const previousTier =
		pixels >= 3840 * 2160 ? 45_000_000 : pixels >= 2560 * 1440 ? 28_000_000 : 18_000_000;
	const qualityFloor = previousTier * (frameRate >= 60 ? 1.7 : 1);
	return Math.round(Math.min(160_000_000, Math.max(qualityFloor, pixels * frameRate * 0.2)));
}

export function captureLimits(display?: CaptureRect, scaleFactor = 1) {
	if (display && Number.isFinite(scaleFactor) && scaleFactor > 0) {
		return {
			width: Math.max(2, Math.ceil(display.width * scaleFactor)),
			height: Math.max(2, Math.ceil(display.height * scaleFactor)),
		};
	}
	return { width: 8192, height: 8192 };
}

/** Only the cropped canvas track is encoded. The original display track stays transient. */
export async function createAreaScreenCapture(
	source: MediaStream,
	area: CaptureRect,
	display: CaptureRect,
	fps = 60,
) {
	const video = document.createElement("video");
	video.muted = true;
	video.playsInline = true;
	video.srcObject = new MediaStream(source.getVideoTracks());
	let timer: ReturnType<typeof setInterval> | undefined;
	let cropped: MediaStream | undefined;
	let stopped = false;
	const sourceTrack = source.getVideoTracks()[0];
	const sourceHasEnded = () => !sourceTrack || sourceTrack.readyState === "ended";
	const stop = () => {
		stopped = true;
		if (timer !== undefined) clearInterval(timer);
		sourceTrack?.removeEventListener("ended", onEnded);
		cropped?.getVideoTracks().forEach((track) => track.stop());
		video.pause();
		video.srcObject = null;
	};
	const onEnded = () => {
		const track = cropped?.getVideoTracks()[0];
		stop();
		track?.dispatchEvent(new Event("ended"));
	};
	try {
		if (sourceHasEnded()) throw new Error("The selected display has stopped.");
		sourceTrack.addEventListener("ended", onEnded, { once: true });
		await video.play();
		if (stopped || sourceHasEnded() || !video.videoWidth || !video.videoHeight)
			throw new Error("The selected display has no video frames.");
		const pixels = resolveAreaPixels(area, display, video.videoWidth, video.videoHeight);
		const sourceWidth = video.videoWidth;
		const sourceHeight = video.videoHeight;
		const canvas = document.createElement("canvas");
		canvas.width = pixels.width;
		canvas.height = pixels.height;
		const context = canvas.getContext("2d", { alpha: false });
		if (!context) throw new Error("Area capture is unavailable on this system.");
		context.imageSmoothingEnabled = false;
		const draw = () => {
			if (stopped) return;
			// A changing source invalidates the mapping; never silently capture a broader area.
			if (video.videoWidth !== sourceWidth || video.videoHeight !== sourceHeight) {
				onEnded();
				return;
			}
			context.drawImage(
				video,
				pixels.x,
				pixels.y,
				pixels.width,
				pixels.height,
				0,
				0,
				pixels.width,
				pixels.height,
			);
		};
		draw();
		cropped = canvas.captureStream(fps);
		cropped.getVideoTracks()[0].contentHint = "detail";
		const output = new MediaStream([...cropped.getVideoTracks(), ...source.getAudioTracks()]);
		timer = setInterval(draw, 1000 / fps);
		return { stream: output, stop };
	} catch (error) {
		stop();
		throw error;
	}
}
