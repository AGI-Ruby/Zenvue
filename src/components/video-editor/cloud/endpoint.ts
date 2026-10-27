import { ACCOUNT_FEATURES_ENABLED } from "@/lib/auth/accountFeatures";

export const CLOUD_SHARE_ENDPOINT =
	import.meta.env.VITE_CLOUD_SHARE_ENDPOINT?.trim() ||
	(import.meta.env.DEV ? "http://localhost:8787/api/upload" : "");

export const CLOUD_SHARING_ENABLED = ACCOUNT_FEATURES_ENABLED && Boolean(CLOUD_SHARE_ENDPOINT);

export function resolvePublishDestination(
	destination: "local" | "link",
	cloudEnabled = CLOUD_SHARING_ENABLED,
): "local" | "link" {
	return cloudEnabled ? destination : "local";
}
