import { recordlyAuthConfigured } from "./recordlyAuth";

/** Local recording is independent of a cloud account in this explicitly selected build. */
export function isLocalRecordingMode(requested: boolean, cloudConfigured: boolean) {
	return requested && !cloudConfigured;
}

export const LOCAL_RECORDING_MODE = isLocalRecordingMode(
	import.meta.env.VITE_RECORDLY_LOCAL_BUILD === "1",
	recordlyAuthConfigured,
);
