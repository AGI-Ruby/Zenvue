import { useEffect, useState } from "react";
import { ShortcutsProvider } from "../../contexts/ShortcutsContext";
import { loadAllCustomFonts } from "../../lib/customFonts";
import { AnnouncementDialog } from "../announcements/AnnouncementDialog";
import { LiveAnnouncementNotifications } from "../announcements/LiveAnnouncementNotifications";
import { ShortcutsConfigDialog } from "./ShortcutsConfigDialog";
import VideoEditor from "./VideoEditor";

export default function EditorWindow() {
	const [recordingGeneration, setRecordingGeneration] = useState(0);
	useEffect(
		() =>
			window.electronAPI.onOpenRecordingInEditor?.(() => {
				document.documentElement.dataset.startupView = "editor";
				setRecordingGeneration((generation) => generation + 1);
			}),
		[],
	);
	useEffect(() => {
		loadAllCustomFonts().catch((error) => {
			console.error("Failed to load custom fonts:", error);
		});
	}, []);

	return (
		<>
			<ShortcutsProvider>
				<VideoEditor key={recordingGeneration} />
				<ShortcutsConfigDialog />
			</ShortcutsProvider>
			<AnnouncementDialog audience="editor" />
			<LiveAnnouncementNotifications audience="editor" />
		</>
	);
}
