import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
	frontmostAt,
	MIN_AREA_SIZE,
	normalizeAreaRect,
	moveAreaRect,
	resizeAreaRect,
	rectContains,
	AREA_HANDLES,
	type AreaHandle,
	type AreaRect,
} from "./areaGeometry";

type Target =
	| { kind: "window"; window: CapturePickerWindow; rect: AreaRect }
	| { kind: "screen"; rect: AreaRect }
	| { kind: "area"; rect: AreaRect };

function screenRect() {
	return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
}

/** Chooses a source only. Recording remains controlled by the existing HUD. */
export function CapturePicker() {
	const displayId = Number(new URLSearchParams(window.location.search).get("displayId"));
	const [target, setTarget] = useState<Target | null>(null);
	const [selected, setSelected] = useState(false);
	const [allowArea, setAllowArea] = useState(false);
	const [pixelScale, setPixelScale] = useState(1);
	const windows = useRef<{ window: CapturePickerWindow; rect: AreaRect }[]>([]);
	const origin = useRef({ x: window.screenX, y: window.screenY });
	const current = useRef<Target | null>(null);
	const press = useRef<{
		x: number;
		y: number;
		drawing: boolean;
		rect?: AreaRect;
		handle?: AreaHandle;
	} | null>(null);
	const editingArea = useRef(false);
	const completed = useRef(false);
	const targetAt = useCallback((x: number, y: number): Target => {
		const hit = frontmostAt(windows.current, x, y);
		return hit
			? { kind: "window", window: hit.window, rect: hit.rect }
			: { kind: "screen", rect: screenRect() };
	}, []);
	const update = (next: Target) => {
		const previous = current.current;
		if (
			previous?.kind === next.kind &&
			(previous.kind !== "window" ||
				(next.kind === "window" && previous.window.id === next.window.id)) &&
			previous.rect.x === next.rect.x &&
			previous.rect.y === next.rect.y &&
			previous.rect.width === next.rect.width &&
			previous.rect.height === next.rect.height
		)
			return;
		current.current = next;
		setTarget(next);
	};
	const finish = useCallback(
		(pick: Target | null) => {
			if (completed.current) return;
			if (
				pick?.kind === "area" &&
				(pick.rect.width < MIN_AREA_SIZE || pick.rect.height < MIN_AREA_SIZE)
			)
				return;
			completed.current = !pick;
			if (pick) {
				current.current = pick;
				setTarget(pick);
				setSelected(true);
			}
			const common = { displayId, record: false };
			void window.electronAPI.completeCapturePick(
				!pick
					? null
					: pick.kind === "window"
						? { ...common, kind: "window", windowId: pick.window.id }
						: pick.kind === "screen"
							? { ...common, kind: "screen" }
							: {
									...common,
									kind: "area",
									...pick.rect,
									x: origin.current.x + pick.rect.x,
									y: origin.current.y + pick.rect.y,
								},
				Boolean(pick),
			);
		},
		[displayId],
	);
	useEffect(() => {
		let disposed = false;
		void window.electronAPI
			.getCapturePickerContext(displayId)
			.then((context) => {
				if (disposed) return;
				if (context.displayBounds) origin.current = context.displayBounds;
				setAllowArea(context.allowArea === true);
				setPixelScale(context.displayScaleFactor ?? 1);
				windows.current = context.windows
					.map((entry) => ({
						window: entry,
						rect: normalizeAreaRect(
							{
								...entry,
								x: entry.x - origin.current.x,
								y: entry.y - origin.current.y,
							},
							screenRect(),
						),
					}))
					.filter((entry) => entry.rect.width > 0 && entry.rect.height > 0);
				const next = context.cursor
					? targetAt(
							context.cursor.x - origin.current.x,
							context.cursor.y - origin.current.y,
						)
					: null;
				current.current = next;
				editingArea.current = false;
				setTarget(next);
				requestAnimationFrame(() =>
					requestAnimationFrame(() => {
						if (!disposed) window.electronAPI.capturePickerReady();
					}),
				);
			})
			.catch(() => {
				if (!disposed) finish(null);
			});
		return () => {
			disposed = true;
		};
	}, [displayId, targetAt, finish]);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				finish(null);
			}
			if (event.key === "Enter") {
				event.preventDefault();
				if (current.current) finish(current.current);
			}
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [finish]);
	const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const start = press.current;
		if (start?.rect) {
			const dx = event.clientX - start.x;
			const dy = event.clientY - start.y;
			update({
				kind: "area",
				rect: start.handle
					? resizeAreaRect(start.rect, start.handle, dx, dy, screenRect())
					: moveAreaRect(start.rect, dx, dy, screenRect()),
			});
		} else if (
			start &&
			allowArea &&
			(start.drawing || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4)
		) {
			start.drawing = true;
			editingArea.current = true;
			update({
				kind: "area",
				rect: normalizeAreaRect(
					{
						x: start.x,
						y: start.y,
						width: event.clientX - start.x,
						height: event.clientY - start.y,
					},
					screenRect(),
				),
			});
		} else if (!start && !editingArea.current && !selected)
			update(targetAt(event.clientX, event.clientY));
	};
	const fullScreen =
		target &&
		target.rect.x === 0 &&
		target.rect.y === 0 &&
		target.rect.width === window.innerWidth &&
		target.rect.height === window.innerHeight;
	const label =
		target?.kind === "window"
			? [target.window.appName, target.window.title].filter(Boolean).join(" — ")
			: target?.kind === "screen"
				? "Entire screen"
				: "Area";
	return (
		<div
			className="fixed inset-0 select-none overflow-hidden"
			data-selection-phase={selected ? "confirmed" : "picking"}
			style={{ cursor: "crosshair", background: target ? "transparent" : "rgba(0,0,0,0.38)" }}
			onPointerMove={onMove}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				const area =
					!fullScreen && editingArea.current && current.current?.kind === "area"
						? current.current.rect
						: null;
				const handle = (event.target as HTMLElement).closest<HTMLElement>(
					"[data-area-handle]",
				)?.dataset.areaHandle as AreaHandle | undefined;
				press.current = {
					x: event.clientX,
					y: event.clientY,
					drawing: false,
					...(area && (handle || rectContains(area, event.clientX, event.clientY))
						? { rect: area, handle }
						: {}),
				};
				event.currentTarget.setPointerCapture(event.pointerId);
			}}
			onPointerUp={(event) => {
				if (event.button !== 0 || !press.current) return;
				const start = press.current;
				press.current = null;
				if (event.currentTarget.hasPointerCapture(event.pointerId))
					event.currentTarget.releasePointerCapture(event.pointerId);
				if (start.drawing || start.rect) {
					finish(current.current);
					return;
				}
				if (selected) return;
				if (editingArea.current) {
					editingArea.current = false;
				}
				finish(targetAt(event.clientX, event.clientY));
			}}
			onPointerCancel={() => {
				press.current = null;
			}}
			onContextMenu={(event) => {
				event.preventDefault();
				finish(null);
			}}
		>
			<div
				className="absolute right-6 top-6 z-50"
				onPointerDown={(event) => event.stopPropagation()}
				onPointerUp={(event) => event.stopPropagation()}
			>
				<Button variant="secondary" onClick={() => finish(null)}>
					取消选框（Esc）
				</Button>
			</div>
			{selected && (
				<div
					className="absolute bottom-24 left-1/2 z-50 -translate-x-1/2"
					onPointerDown={(event) => event.stopPropagation()}
					onPointerUp={(event) => event.stopPropagation()}
				>
					<Button
						variant="secondary"
						aria-label="Choose another source"
						onClick={() => {
							press.current = null;
							editingArea.current = false;
							current.current = null;
							setSelected(false);
							setTarget(null);
						}}
					>
						重新框选
					</Button>
				</div>
			)}
			{target && (
				<div
					className={
						target.kind === "area" && editingArea.current && !fullScreen
							? "absolute cursor-move"
							: "pointer-events-none absolute"
					}
					style={{
						left: target.rect.x,
						top: target.rect.y,
						width: target.rect.width,
						height: target.rect.height,
						background: selected ? "transparent" : "rgba(10,132,255,0.16)",
						boxShadow: selected ? "none" : "0 0 0 100vmax rgba(0,0,0,0.38)",
						outline: selected ? "none" : "2px solid #0a84ff",
						outlineOffset: -2,
					}}
				>
					{target.kind === "area" &&
						!fullScreen &&
						AREA_HANDLES.map((handle) => {
							const left = handle.includes("w")
								? "0%"
								: handle.includes("e")
									? "100%"
									: "50%";
							const top = handle.includes("n")
								? "0%"
								: handle.includes("s")
									? "100%"
									: "50%";
							return (
								<div
									key={handle}
									data-area-handle={handle}
									className="absolute size-3 rounded-full border border-black/30 bg-white"
									style={{
										left,
										top,
										transform: "translate(-50%, -50%)",
										cursor: `${handle}-resize`,
									}}
								/>
							);
						})}
					{
						<div
							className={`pointer-events-none absolute whitespace-nowrap rounded-md px-2 py-1 text-xs ${selected ? "bg-yellow-300 text-black" : "bg-blue-600 text-white"}`}
							style={{ top: target.rect.y >= 30 ? -28 : 6, left: 6 }}
						>
							{label} · {Math.floor((target.rect.width * pixelScale) / 2) * 2} ×{" "}
							{Math.floor((target.rect.height * pixelScale) / 2) * 2} px
						</div>
					}
				</div>
			)}
			{!selected && (
				<div className="pointer-events-none absolute inset-x-0 top-20 z-50 flex justify-center px-6">
					<div className="rounded-2xl border-2 border-yellow-300 bg-black/95 px-8 py-4 text-center text-xl font-semibold text-white shadow-2xl">
						{target?.kind === "area" && editingArea.current
							? "松开鼠标即选中 · 无需回车 · 按 Esc 退出选择"
							: allowArea
								? "点击窗口或拖动框选 · 松开即选中 · 按 Esc 退出选择"
								: "点击窗口或桌面 · 按 Esc 退出选择"}
					</div>
				</div>
			)}
		</div>
	);
}
export default CapturePicker;
