import { Toast, toast as heroToast } from "@heroui/react";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { shouldTranslateToasts, translateToastText } from "./toastMessages";

type Options = {
	id?: string | number;
	description?: ReactNode;
	duration?: number;
	action?: { label: ReactNode; onClick: () => void };
	onDismiss?: () => void;
};
type Variant = "default" | "accent" | "success" | "warning" | "danger";
const ids = new Map<string | number, string>();

function plainText(value: ReactNode): string {
	if (typeof value === "string" || typeof value === "number") return String(value);
	if (Array.isArray(value)) return value.map(plainText).join("");
	if (isValidElement<{ children?: ReactNode }>(value)) return plainText(value.props.children);
	return "";
}

function localize(value: ReactNode): ReactNode {
	if (!shouldTranslateToasts()) return value;
	if (typeof value === "string") return translateToastText(value);
	if (Array.isArray(value)) return value.map(localize);
	if (isValidElement<{ children?: ReactNode }>(value) && value.props.children !== undefined) {
		return cloneElement(value, {}, localize(value.props.children));
	}
	return value;
}

// Keep existing callers compatible while HeroUI owns the queue and presentation.
function notify(title: ReactNode, options: Options = {}, variant: Variant = "default") {
	const errorText = [plainText(title), plainText(options.description)]
		.filter(Boolean)
		.join("\n\n");
	const action = options.action;
	const nativeOptions = {
		variant,
		description: localize(options.description),
		timeout:
			options.duration === Infinity
				? 0
				: (options.duration ?? (variant === "danger" ? 8000 : 4000)),
		onClose: () => {
			if (options.id !== undefined) ids.delete(options.id);
			options.onDismiss?.();
		},
		actionProps: action
			? {
					children: localize(action.label),
					onPress: action.onClick,
				}
			: variant === "danger" && errorText
				? {
						children: localize("Copy"),
						onPress: () => {
							void navigator.clipboard.writeText(errorText).then(
								() => notify("Error copied", {}, "success"),
								() =>
									notify(
										"Could not copy error",
										{
											description: errorText,
										},
										"danger",
									),
							);
						},
					}
				: undefined,
	};
	const previous = options.id === undefined ? undefined : ids.get(options.id);
	const key = previous
		? heroToast.update(previous, localize(title), nativeOptions)
		: heroToast(localize(title), nativeOptions);
	if (options.id !== undefined) ids.set(options.id, key);
	return key;
}
export const toast = Object.assign(notify, {
	success: (message: ReactNode, options?: Options) => notify(message, options, "success"),
	error: (message: ReactNode, options?: Options) => notify(message, options, "danger"),
	info: (message: ReactNode, options?: Options) => notify(message, options, "accent"),
	warning: (message: ReactNode, options?: Options) => notify(message, options, "warning"),
	dismiss: (id?: string | number) => {
		if (id === undefined) {
			heroToast.clear();
			ids.clear();
		} else heroToast.close(ids.get(id) ?? String(id));
	},
});
export function Toaster({ className }: { className?: string }) {
	return <Toast.Provider placement="bottom end" className={className} />;
}
