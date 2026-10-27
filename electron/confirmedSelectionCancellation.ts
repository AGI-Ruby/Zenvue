/** Own Escape only while a confirmed selection is waiting to record. */
export function createConfirmedSelectionCancellation(deps: {
	register(callback: () => void): boolean;
	unregister(): void;
	cancel(): void;
}) {
	let owned = false;
	let active = false;
	return {
		setActive(value: boolean) {
			active = value;
			if (active && !owned)
				owned = deps.register(() => {
					if (active) deps.cancel();
				});
			if (!active && owned) {
				owned = false;
				deps.unregister();
			}
		},
	};
}
