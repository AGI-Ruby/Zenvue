import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { get as httpsGet } from "node:https";
import path from "node:path";
import type Electron from "electron";
import { app } from "electron";
import {
	WHISPER_MODEL_DIR,
	WHISPER_MODEL_DOWNLOAD_URL,
	WHISPER_SMALL_MODEL_PATH,
	WHISPER_SMALL_MODEL_SHA256,
} from "../constants";
import { findLocalWhisperModel, isWhisperModel } from "./localModels";

export function sendWhisperModelDownloadProgress(
	webContents: Electron.WebContents,
	payload: {
		status: "idle" | "downloading" | "downloaded" | "error";
		progress: number;
		path?: string | null;
		error?: string;
	},
) {
	if (!webContents.isDestroyed())
		webContents.send("whisper-small-model-download-progress", payload);
}

function localModelRoots(): string[] {
	const home = app.getPath("home");
	const appData = app.getPath("appData");
	const roots = [
		WHISPER_MODEL_DIR,
		...[
			"Zenvue",
			"Recordly Enhanced",
			"Recordly",
			"Handy",
			"com.pais.handy",
			"Buzz",
			"buzz",
			"vibe",
		].map((name) => path.join(appData, name)),
		path.join(home, ".cache", "whisper"),
		path.join(home, ".cache", "huggingface", "hub", "models--ggerganov--whisper.cpp"),
		path.join(home, ".cache", "modelscope", "hub", "models"),
		path.join(home, "models"),
		path.join(home, "whisper.cpp", "models"),
		app.getPath("downloads"),
		app.getPath("documents"),
		app.getPath("desktop"),
	];
	if (process.env["LOCALAPPDATA"]) {
		for (const name of ["Handy", "com.pais.handy", "Buzz", "buzz", "vibe"])
			roots.push(path.join(process.env["LOCALAPPDATA"], name));
	}
	for (const name of [
		"HF_HOME",
		"HUGGINGFACE_HUB_CACHE",
		"MODELSCOPE_CACHE",
		"WHISPER_MODEL_DIR",
	]) {
		if (process.env[name]) roots.push(process.env[name]);
	}
	if (process.platform === "win32") {
		for (const drive of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
			for (const name of ["AI-models", "models", "whisper.cpp/models"])
				roots.push(`${drive}:/${name}`);
		}
	}
	return roots;
}

export async function getWhisperSmallModelStatus(preferredPath?: string) {
	const managedPath = (await isWhisperModel(WHISPER_SMALL_MODEL_PATH))
		? WHISPER_SMALL_MODEL_PATH
		: null;
	const preferred = preferredPath && (await isWhisperModel(preferredPath)) ? preferredPath : null;
	const modelPath = preferred ?? managedPath ?? (await findLocalWhisperModel(localModelRoots()));
	return { success: true, exists: Boolean(modelPath), path: modelPath, managedPath };
}

export function downloadFileWithProgress(
	url: string,
	destinationPath: string,
	onProgress: (progress: number) => void,
): Promise<void> {
	const request = (currentUrl: string, redirectCount = 0): Promise<void> => {
		return new Promise((resolve, reject) => {
			const req = httpsGet(currentUrl, { timeout: 30_000 }, (response) => {
				const statusCode = response.statusCode ?? 0;
				const location = response.headers.location;

				if (statusCode >= 300 && statusCode < 400 && location) {
					response.resume();
					if (redirectCount >= 5) {
						reject(new Error("Too many redirects while downloading Whisper model."));
						return;
					}

					const nextUrl = new URL(location, currentUrl).toString();
					void request(nextUrl, redirectCount + 1)
						.then(resolve)
						.catch(reject);
					return;
				}

				if (statusCode < 200 || statusCode >= 300) {
					response.resume();
					reject(new Error(`Whisper model download failed with status ${statusCode}.`));
					return;
				}

				const totalBytes = Number.parseInt(
					String(response.headers["content-length"] ?? "0"),
					10,
				);
				let downloadedBytes = 0;
				const hash = createHash("sha256");
				const fileStream = createWriteStream(destinationPath);

				response.on("data", (chunk: Buffer) => {
					downloadedBytes += chunk.length;
					hash.update(chunk);
					if (Number.isFinite(totalBytes) && totalBytes > 0) {
						onProgress(Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)));
					}
				});

				response.on("error", (error) => {
					fileStream.destroy(error);
				});
				response.on("aborted", () => {
					fileStream.destroy(new Error("模型下载连接中断，请重试。"));
				});

				let streamError: Error | undefined;
				fileStream.on("error", (error) => {
					streamError = error;
					response.destroy();
				});

				fileStream.on("close", () => {
					if (streamError) {
						reject(streamError);
						return;
					}
					if (!fileStream.writableFinished) return;
					if (
						downloadedBytes !== 487601967 ||
						hash.digest("hex") !== WHISPER_SMALL_MODEL_SHA256
					) {
						reject(new Error("模型文件不完整或校验失败，请重新下载。"));
						return;
					}
					onProgress(100);
					resolve();
				});

				response.pipe(fileStream);
			});

			req.on("error", reject);
			req.on("timeout", () => {
				req.destroy(new Error("Whisper model download timed out."));
			});
		});
	};

	return request(url);
}

async function performWhisperSmallModelDownload(
	webContents: Electron.WebContents,
): Promise<string> {
	const existing = await getWhisperSmallModelStatus();
	if (existing.path) return existing.path;
	await fs.mkdir(WHISPER_MODEL_DIR, { recursive: true });
	const tempPath = `${WHISPER_SMALL_MODEL_PATH}.download`;

	sendWhisperModelDownloadProgress(webContents, {
		status: "downloading",
		progress: 0,
		path: null,
	});

	try {
		await fs.rm(tempPath, { force: true });
		for (let attempt = 0; ; attempt++) {
			try {
				await downloadFileWithProgress(WHISPER_MODEL_DOWNLOAD_URL, tempPath, (progress) => {
					sendWhisperModelDownloadProgress(webContents, {
						status: "downloading",
						progress,
						path: null,
					});
				});
				break;
			} catch (error) {
				await fs.rm(tempPath, { force: true });
				if (attempt >= 1) throw error;
				sendWhisperModelDownloadProgress(webContents, {
					status: "downloading",
					progress: 0,
					path: null,
				});
			}
		}
		await fs.rename(tempPath, WHISPER_SMALL_MODEL_PATH);
		sendWhisperModelDownloadProgress(webContents, {
			status: "downloaded",
			progress: 100,
			path: WHISPER_SMALL_MODEL_PATH,
		});
		return WHISPER_SMALL_MODEL_PATH;
	} catch (error) {
		await fs.rm(tempPath, { force: true }).catch(() => undefined);
		sendWhisperModelDownloadProgress(webContents, {
			status: "error",
			progress: 0,
			path: null,
			error: String(error),
		});
		throw error;
	}
}

export async function deleteWhisperSmallModel(): Promise<void> {
	await fs.rm(WHISPER_SMALL_MODEL_PATH, { force: true });
}

let activeDownload: Promise<string> | undefined;
export function downloadWhisperSmallModel(webContents: Electron.WebContents): Promise<string> {
	activeDownload ??= performWhisperSmallModelDownload(webContents).finally(() => {
		activeDownload = undefined;
	});
	return activeDownload;
}
