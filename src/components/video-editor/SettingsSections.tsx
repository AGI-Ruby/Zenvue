import { createContext, useContext, useState, type ReactNode } from "react";
import { ChoiceGroup, ChoiceItem } from "@/components/ui/choice-group";

type Category =
	| "general"
	| "account"
	| "permissions"
	| "motion"
	| "recording"
	| "files"
	| "advanced";
const labels: Record<Category, string> = {
	general: "通用",
	account: "账户",
	permissions: "权限",
	motion: "动效",
	recording: "录制",
	files: "文件",
	advanced: "高级",
};
const SettingsCategoryContext = createContext<Category | null>(null);

/** Dashboard and editor share the same controls and category selection. */
export function SettingsSections({
	children,
	categories,
}: {
	children: ReactNode;
	categories: Category[];
}) {
	const parent = useContext(SettingsCategoryContext);
	const [selected, setSelected] = useState<Category>("general");
	if (parent) return <div className="space-y-6">{children}</div>;
	const active = categories.includes(selected) ? selected : categories[0];
	return (
		<SettingsCategoryContext.Provider value={active}>
			<div className="space-y-6">
				<ChoiceGroup
					aria-label="设置分类"
					value={active}
					onValueChange={(value) => setSelected(value as Category)}
					size="sm"
				>
					{categories.map((category) => (
						<ChoiceItem key={category} value={category}>
							{labels[category]}
						</ChoiceItem>
					))}
				</ChoiceGroup>
				<div role="region" aria-label={`${labels[active]}设置`} className="space-y-6">
					{children}
				</div>
			</div>
		</SettingsCategoryContext.Provider>
	);
}

export function SettingsCategory({
	category,
	children,
}: {
	category: Category | Category[];
	children: ReactNode;
}) {
	const active = useContext(SettingsCategoryContext);
	const visible = Array.isArray(category)
		? active !== null && category.includes(active)
		: active === category;
	return visible ? <div className="space-y-6">{children}</div> : null;
}
