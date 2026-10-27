import { ACCOUNT_FEATURES_ENABLED } from "./accountFeatures";

/** Recording stays available offline even when optional cloud accounts are configured. */
export function isLocalRecordingMode(requested: boolean, cloudConfigured: boolean) {
	return requested || !cloudConfigured;
}

export const LOCAL_RECORDING_MODE = isLocalRecordingMode(
	import.meta.env.VITE_RECORDLY_LOCAL_BUILD === "1",
	ACCOUNT_FEATURES_ENABLED,
);
