import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { WindowBounds } from "./types";

/** Share one native process between the selection overlay and cursor tracking. */
export function createWindowsGeometryClient(spawnHelper: () => ChildProcessWithoutNullStreams) {
	let process: ChildProcessWithoutNullStreams | null = null;
	let buffer = "";
	let serial = 0;
	let idle: ReturnType<typeof setTimeout> | undefined;
	const pending = new Map<
		number,
		{ finish: (bounds: WindowBounds | null) => void; windowId: number }
	>();
	const requests = new Map<string, Promise<WindowBounds | null>>();
	const cache = new Map<number, { bounds: WindowBounds | null; at: number }>();
	const stop = () => {
		const previous = process;
		process = null;
		clearTimeout(idle);
		buffer = "";
		cache.clear();
		for (const request of [...pending.values()]) request.finish(null);
		previous?.kill();
	};
	const start = () => {
		if (process) return process;
		const child = spawnHelper();
		process = child;
		child.once("error", () => {
			if (process === child) stop();
		});
		child.once("exit", () => {
			if (process === child) stop();
		});
		child.stdin.on("error", () => {
			if (process === child) stop();
		});
		child.stderr.resume();
		child.stdout.on("data", (chunk: Buffer) => {
			if (process !== child) return;
			buffer += chunk.toString();
			const lines = buffer.split(/\r?\n/);
			buffer = lines.pop() ?? "";
			for (const line of lines) {
				try {
					const reply = JSON.parse(line);
					const request = pending.get(reply.id);
					if (!request) continue;
					const bounds = reply.bounds;
					const valid =
						bounds &&
						[bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) &&
						bounds.width > 0 &&
						bounds.height > 0;
					cache.set(request.windowId, { bounds: valid ? bounds : null, at: Date.now() });
					request.finish(valid ? bounds : null);
				} catch {
					/* Ignore malformed lines; the request timeout still applies. */
				}
			}
		});
		return child;
	};
	return {
		stop,
		query(windowId: number, activate = false): Promise<WindowBounds | null> {
			if (!Number.isSafeInteger(windowId) || windowId <= 0) return Promise.resolve(null);
			clearTimeout(idle);
			idle = setTimeout(stop, 5000);
			idle.unref();
			const key = `${windowId}:${activate}`;
			const current = requests.get(key);
			if (current) return current;
			const cached = cache.get(windowId);
			if (!activate && cached && Date.now() - cached.at < 40)
				return Promise.resolve(cached.bounds);
			let child: ChildProcessWithoutNullStreams;
			try {
				child = start();
			} catch {
				return Promise.resolve(null);
			}
			const id = ++serial;
			const result = new Promise<WindowBounds | null>((resolve) => {
				const timeout = setTimeout(stop, 2000);
				pending.set(id, {
					windowId,
					finish: (bounds) => {
						clearTimeout(timeout);
						pending.delete(id);
						requests.delete(key);
						resolve(bounds);
					},
				});
			});
			requests.set(key, result);
			child.stdin.write(`${id} ${windowId}${activate ? " activate" : ""}\n`, (error) => {
				if (error && process === child) stop();
			});
			return result;
		},
	};
}
