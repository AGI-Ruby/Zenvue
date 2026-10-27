/** Cloud accounts are opt-in until Zenvue's own service is deployed. */
export function areAccountFeaturesEnabled(
	requested: string | undefined,
	url: string | undefined,
	key: string | undefined,
) {
	return requested === "1" && Boolean(url?.trim() && key?.trim());
}

export const ACCOUNT_FEATURES_ENABLED = areAccountFeaturesEnabled(
	import.meta.env.VITE_ZENVUE_ACCOUNTS_ENABLED,
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
