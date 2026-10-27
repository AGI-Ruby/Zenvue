import fs from "node:fs";
import { resolveZenvueProfile } from "./zenvueProfile";
import path from "node:path";
import { app } from "electron";

if (process.env["VITE_DEV_SERVER_URL"]) {
	const devUserDataPath = path.join(app.getPath("appData"), "Zenvue-dev");
	app.setPath("userData", devUserDataPath);
	app.setPath("sessionData", path.join(devUserDataPath, "session"));
} else {
	const profile = resolveZenvueProfile({
		appName: app.name,
		appData: app.getPath("appData"),
		currentUserData: app.getPath("userData"),
		platform: process.platform,
		exists: fs.existsSync,
	});
	if (profile !== app.getPath("userData")) {
		app.setPath("userData", profile);
		app.setPath("sessionData", profile);
	}
}

export const USER_DATA_PATH = app.getPath("userData");
export const RECORDINGS_DIR = path.join(USER_DATA_PATH, "recordings");
