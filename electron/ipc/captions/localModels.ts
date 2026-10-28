import fs from "node:fs/promises";
import path from "node:path";

// Only multilingual whisper.cpp models: .pt, CTranslate2 and .en weights cannot
// serve the Chinese caption default. File names alone do not establish format.
const modelName = /^ggml-(tiny|base|small|medium|large(?:-v[123])?(?:-turbo)?)(?:-q\d_\d)?\.bin$/i;
const skippedDirectories = new Set(["node_modules", ".git", "venv", ".venv", "recordings"]);

export async function isWhisperModel(filePath: string): Promise<boolean> {
	let file: Awaited<ReturnType<typeof fs.open>> | undefined;
	try {
		file = await fs.open(filePath, "r");
		const stat = await file.stat();
		if (!stat.isFile() || stat.size < 1024 * 1024) return false;
		const header = Buffer.alloc(44);
		const { bytesRead } = await file.read(header, 0, header.length, 0);
		if (bytesRead !== header.length || header.readUInt32LE(0) !== 0x67676d6c) return false;
		// Whisper GGML hyperparameters, unlike unrelated GGML language models.
		return (
			header.readInt32LE(4) >= 51864 &&
			header.readInt32LE(4) <= 51866 &&
			header.readInt32LE(8) === 1500 &&
			header.readInt32LE(24) === 448 &&
			[80, 128].includes(header.readInt32LE(40))
		);
	} catch {
		return false;
	} finally {
		await file?.close();
	}
}

export async function findLocalWhisperModel(roots: string[]): Promise<string | null> {
	const candidates: string[] = [];
	const visited = new Set<string>();
	let directories = 0;
	async function visit(directory: string, depth: number): Promise<void> {
		const key = path.resolve(directory).toLowerCase();
		if (visited.has(key) || depth > 6 || directories >= 4000) return;
		visited.add(key);
		directories++;
		const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
		for (const entry of entries) {
			if (modelName.test(entry.name) && !entry.isDirectory())
				candidates.push(path.join(directory, entry.name));
		}
		for (const entry of entries) {
			if (entry.isDirectory() && !skippedDirectories.has(entry.name.toLowerCase())) {
				await visit(path.join(directory, entry.name), depth + 1);
			}
		}
	}
	for (const root of roots) await visit(root, 0);
	// Prefer the app's default model, then smaller compatible alternatives.
	const rank = (file: string) => {
		const name = path.basename(file).toLowerCase();
		if (name === "ggml-small.bin") return 0;
		return (
			["small", "base", "tiny", "medium", "large"].findIndex((size) =>
				name.startsWith(`ggml-${size}`),
			) + 1
		);
	};
	candidates.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
	for (const candidate of candidates) if (await isWhisperModel(candidate)) return candidate;
	return null;
}
