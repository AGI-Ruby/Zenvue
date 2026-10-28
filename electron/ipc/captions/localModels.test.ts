import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { findLocalWhisperModel, isWhisperModel } from "./localModels";

let root: string;
beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), "zenvue-model-test-"));
});
afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

async function model(relative: string) {
	const target = path.join(root, relative);
	await fs.mkdir(path.dirname(target), { recursive: true });
	const header = Buffer.alloc(44);
	header.writeUInt32LE(0x67676d6c, 0);
	header.writeInt32LE(51865, 4);
	header.writeInt32LE(1500, 8);
	header.writeInt32LE(448, 24);
	header.writeInt32LE(80, 40);
	const file = await fs.open(target, "w");
	await file.write(header);
	await file.truncate(1024 * 1024);
	await file.close();
	return target;
}

it("discovers cached models and prefers multilingual small over larger models", async () => {
	await model("ggml-large-v3.bin");
	const small = await model("snapshots/revision/ggml-small.bin");
	expect(await findLocalWhisperModel([root])).toBe(small);
});

it("rejects CTranslate2, partial downloads and Python Whisper weights", async () => {
	await fs.writeFile(path.join(root, "ggml-small.bin"), Buffer.alloc(1024 * 1024));
	await fs.writeFile(path.join(root, "small.pt"), "python weights");
	await model("ggml-small.bin.download");
	expect(await findLocalWhisperModel([root])).toBeNull();
	expect(await isWhisperModel(path.join(root, "ggml-small.bin"))).toBe(false);
});

it("skips invalid small weights and uses a compatible quantized alternative", async () => {
	await fs.writeFile(path.join(root, "ggml-small.bin"), "incomplete");
	const base = await model("ggml-base-q5_1.bin");
	expect(await findLocalWhisperModel([root])).toBe(base);
});

it("does not automatically pick English-only models for Chinese captions", async () => {
	await model("ggml-small.en.bin");
	expect(await findLocalWhisperModel([root])).toBeNull();
});

it("ignores inaccessible roots and supports a manually named GGML file", async () => {
	const selected = await model("my-model.bin");
	expect(await isWhisperModel(selected)).toBe(true);
	expect(await findLocalWhisperModel([path.join(root, "missing")])).toBeNull();
});

it("does not recurse into symlinked folders or excluded dependency trees", async () => {
	await model("node_modules/ggml-small.bin");
	expect(await findLocalWhisperModel([root])).toBeNull();
});
