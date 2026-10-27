import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createWindowsGeometryClient } from "./windowsGeometryClient";

const makeProcess = () =>
	Object.assign(new EventEmitter(), {
		stdin: new PassThrough(),
		stdout: new PassThrough(),
		stderr: new PassThrough(),
		kill: vi.fn(),
	});
let child: ReturnType<typeof makeProcess>;
let spawn: ReturnType<typeof vi.fn>;
let client: ReturnType<typeof createWindowsGeometryClient>;
const bounds = { x: -1920, y: 50, width: 942, height: 740 };
beforeEach(() => {
	vi.useFakeTimers();
	child = makeProcess();
	spawn = vi.fn(() => child as unknown as ChildProcessWithoutNullStreams);
	client = createWindowsGeometryClient(spawn);
});
afterEach(() => {
	client.stop();
	vi.useRealTimers();
});

it("shares simultaneous overlay/cursor queries and reuses the native process", async () => {
	const first = client.query(101);
	const second = client.query(101);
	expect(first).toBe(second);
	expect(child.stdin.read().toString()).toBe("1 101\n");
	child.stdout.write('{"id":1,"bounds":');
	child.stdout.write(`${JSON.stringify(bounds)}}\n`);
	expect(await first).toEqual(bounds);
	expect(await client.query(101)).toEqual(bounds);
	expect(child.stdin.read()).toBeNull();
	vi.advanceTimersByTime(101);
	const next = client.query(101);
	expect(child.stdin.read().toString()).toBe("2 101\n");
	child.stdout.write('{"id":2,"bounds":null}\n');
	expect(await next).toBeNull();
	expect(spawn).toHaveBeenCalledOnce();
});

it("cancels a stalled native query without accumulating requests", async () => {
	const first = client.query(101);
	const other = client.query(202);
	vi.advanceTimersByTime(2000);
	expect(await first).toBeNull();
	expect(await other).toBeNull();
	expect(child.kill).toHaveBeenCalledOnce();
	const replacement = makeProcess();
	spawn.mockReturnValue(replacement as unknown as ChildProcessWithoutNullStreams);
	const retry = client.query(101);
	replacement.stdout.write(`{"id":3,"bounds":${JSON.stringify(bounds)}}\n`);
	expect(await retry).toEqual(bounds);
	expect(spawn).toHaveBeenCalledTimes(2);
});

it("rejects non-finite geometry and releases the helper when idle", async () => {
	const request = client.query(101);
	child.stdout.write('{"id":1,"bounds":{"x":0,"y":0,"width":0,"height":100}}\n');
	expect(await request).toBeNull();
	vi.advanceTimersByTime(5000);
	expect(child.kill).toHaveBeenCalledOnce();
});

it("does not spawn a process for invalid handles", async () => {
	for (const handle of [0, -1, NaN, Infinity, 1.5]) expect(await client.query(handle)).toBeNull();
	expect(spawn).not.toHaveBeenCalled();
});

it("activation bypasses stale geometry without starting a separate shell", async () => {
	const first = client.query(101);
	child.stdout.write(`{"id":1,"bounds":${JSON.stringify(bounds)}}\n`);
	await first;
	const activated = client.query(101, true);
	expect(child.stdin.read().toString()).toBe("1 101\n2 101 activate\n");
	const moved = { ...bounds, x: 200 };
	child.stdout.write(`{"id":2,"bounds":${JSON.stringify(moved)}}\n`);
	expect(await activated).toEqual(moved);
	expect(await client.query(101)).toEqual(moved);
	expect(spawn).toHaveBeenCalledOnce();
});
