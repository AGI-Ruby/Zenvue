import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	valid: vi.fn(),
	find: vi.fn(),
	get: vi.fn(),
	mkdir: vi.fn(),
	rm: vi.fn(),
	rename: vi.fn(),
}));
vi.mock("electron", () => ({ app: { getPath: () => "/home/test" } }));
vi.mock("../constants", () => ({
	WHISPER_MODEL_DIR: "/managed",
	WHISPER_SMALL_MODEL_PATH: "/managed/ggml-small.bin",
	WHISPER_MODEL_DOWNLOAD_URL:
		"https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
	WHISPER_SMALL_MODEL_SHA256: "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b",
}));
vi.mock("./localModels", () => ({
	isWhisperModel: mocks.valid,
	findLocalWhisperModel: mocks.find,
}));
vi.mock("node:fs/promises", () => ({
	default: { mkdir: mocks.mkdir, rm: mocks.rm, rename: mocks.rename },
}));
vi.mock("node:https", () => ({ get: mocks.get }));

import {
	deleteWhisperSmallModel,
	downloadFileWithProgress,
	downloadWhisperSmallModel,
	getWhisperSmallModelStatus,
} from "./whisper";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.valid.mockResolvedValue(false);
	mocks.find.mockResolvedValue(null);
	mocks.mkdir.mockResolvedValue(undefined);
	mocks.rm.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

it("reuses a valid saved selection before scanning", async () => {
	mocks.valid.mockImplementation(async (file) => file === "/custom/model.bin");
	expect(await getWhisperSmallModelStatus("/custom/model.bin")).toMatchObject({
		path: "/custom/model.bin",
		managedPath: null,
	});
	expect(mocks.find).not.toHaveBeenCalled();
});

it("replaces a missing saved path with a discovered compatible model", async () => {
	mocks.find.mockResolvedValue("/other-app/ggml-small.bin");
	expect(await getWhisperSmallModelStatus("/missing.bin")).toMatchObject({
		exists: true,
		path: "/other-app/ggml-small.bin",
		managedPath: null,
	});
});

it("does not download when a local model exists, and never deletes it", async () => {
	mocks.find.mockResolvedValue("/other-app/ggml-small.bin");
	const sender = { send: vi.fn(), isDestroyed: () => false };
	expect(await downloadWhisperSmallModel(sender as never)).toBe("/other-app/ggml-small.bin");
	expect(mocks.get).not.toHaveBeenCalled();
	await deleteWhisperSmallModel();
	expect(mocks.rm).toHaveBeenCalledExactlyOnceWith("/managed/ggml-small.bin", { force: true });
});

it("uses the domestic mirror, retries a failed download once and cleans up", async () => {
	mocks.get.mockImplementation(() => {
		const req = new EventEmitter();
		queueMicrotask(() => req.emit("error", new Error("offline")));
		return req;
	});
	const sender = { send: vi.fn(), isDestroyed: () => false };
	const first = downloadWhisperSmallModel(sender as never);
	const second = downloadWhisperSmallModel(sender as never);
	expect(first).toBe(second);
	await expect(first).rejects.toThrow("offline");
	expect(mocks.get).toHaveBeenCalledTimes(2);
	expect(mocks.get.mock.calls[0][0]).toContain("https://hf-mirror.com/");
	expect(mocks.rename).not.toHaveBeenCalled();
	expect(sender.send).toHaveBeenLastCalledWith(
		"whisper-small-model-download-progress",
		expect.objectContaining({ status: "error" }),
	);
});

it("rejects an HTML or truncated response instead of installing it", async () => {
	// Actual filesystem stream exercises the completion and integrity check.
	const os = await import("node:os");
	const path = await import("node:path");
	const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
	const folder = await fs.mkdtemp(path.join(os.tmpdir(), "zenvue-download-test-"));
	mocks.get.mockImplementation((_url, _options, callback) => {
		const response = Readable.from([Buffer.from("<html>unavailable</html>")]);
		Object.assign(response, { statusCode: 200, headers: {} });
		queueMicrotask(() => callback(response));
		return new EventEmitter();
	});
	try {
		await expect(
			downloadFileWithProgress(
				"https://example.test/model.bin",
				path.join(folder, "model.bin"),
				vi.fn(),
			),
		).rejects.toThrow("校验失败");
	} finally {
		await fs.rm(folder, { recursive: true, force: true });
	}
});
