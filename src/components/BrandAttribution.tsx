/** Upstream attribution required by the bundled Recordly license. */
export function BrandAttribution() {
	return (
		<div
			className="px-3 py-2 text-[10px] leading-relaxed text-muted-foreground"
			aria-label="Open-source attribution"
		>
			<p>
				Zenvue · alienzhang23 ·{" "}
				<a
					className="underline underline-offset-2"
					href="https://github.com/alienzhang23/Zenvue"
					target="_blank"
					rel="noreferrer"
				>
					源代码
				</a>
			</p>
			<p>
				Based on{" "}
				<a
					className="underline underline-offset-2"
					href="https://github.com/webadderallorg/Recordly"
					target="_blank"
					rel="noreferrer"
				>
					Recordly
				</a>{" "}
				· © 2026 webadderall
			</p>
			<p>OpenScreen · © 2025 Siddharth Vaddem</p>
			<p>
				<a
					className="underline underline-offset-2"
					href="https://www.gnu.org/licenses/agpl-3.0.html"
					target="_blank"
					rel="noreferrer"
				>
					AGPLv3
				</a>{" "}
				· No warranty
			</p>
		</div>
	);
}
