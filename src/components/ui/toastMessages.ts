// Legacy callers and native IPC results also pass through the shared toast adapter.
// Translate complete messages here; never replace words inside filenames or paths.
const messages: Record<string, string> = {
	"Choose a screen or window in the system picker when you start recording.":
		"开始录制时，请在系统选择器中选择屏幕或窗口。",
	"That window or screen is no longer available.": "所选窗口或屏幕已不可用。",
	"Unable to detect windows": "无法检测窗口",
	"A different project already uses this name": "已有其他项目使用此名称",
	"Unable to verify project identity for the chosen name":
		"无法验证此名称对应的项目，请换一个名称重试",
	"Import is still running": "导入仍在进行中，请稍候",
	"An import is already running": "已有导入任务正在进行",
	"Import cancelled because its editor closed or reloaded": "编辑器已关闭或重新加载，已取消导入",
	"Could not reveal item, but opened directory.": "无法定位文件，已打开所在文件夹。",
	"Failed to open recordings folder.": "无法打开录制文件夹。",
	"Failed to set recordings folder": "设置录制文件夹失败",
	"Project saved successfully": "项目已保存",
	"Save project canceled": "已取消保存项目",
	"Failed to save project file": "保存项目文件失败",
	"Open project canceled": "已取消打开项目",
	"Failed to load project file": "加载项目文件失败",
	"No active project": "当前没有打开的项目",
	"Failed to load current project file": "加载当前项目文件失败",
	"Failed to open project file": "打开项目文件失败",
	"Failed to open projects folder.": "无法打开项目文件夹。",
	"Project path is no longer trusted. Use Save As to choose a project file.":
		"项目路径已失效，请使用“另存为”选择项目文件。",
	"Missing source video path.": "缺少源视频路径。",
	"The selected Whisper executable is not marked as executable.":
		"所选 Whisper 程序没有执行权限。",
	"Whisper could not start because the Microsoft Visual C++ x64 Redistributable is missing. Install it from https://aka.ms/vc14/vc_redist.x64.exe, then restart Zenvue.":
		"Whisper 无法启动：缺少 Microsoft Visual C++ x64 运行库。请从 https://aka.ms/vc14/vc_redist.x64.exe 安装后重启 Zenvue。",
	"Failed to open file picker": "无法打开文件选择器",
	"Failed to open audio file picker": "无法打开音频文件选择器",
	"Countdown already in progress": "倒计时已在进行中",
	"Invalid countdown delay": "倒计时时长无效",
	"Countdown window failed to load": "倒计时窗口加载失败",
	"Permission denied": "权限被拒绝",
	"Requested device not found": "未找到所选设备",
	"Failed to fetch": "网络请求失败",
	"Network Error": "网络连接出错",
	"Cannot place zoom here": "无法在此处添加缩放",
	"Zoom already exists here or there is not enough room before the next zoom or clip end.":
		"此处已有缩放，或到下一个缩放区域、片段结尾之间的空间不足。",
	"Cannot place caption here": "无法在此处添加字幕",
	"A caption already exists at this position.": "此位置已有字幕。",
	"Cannot place audio here": "无法在此处添加音频",
	"There is no remaining space at the current playhead position.":
		"当前播放位置之后已没有可用空间。",
	"Audio region already exists at this location or not enough space available.":
		"此位置已有音频，或可用空间不足。",
	"Could not read audio file": "无法读取音频文件",
	"The selected file may be corrupted or in an unsupported format.":
		"所选文件可能已损坏，或格式不受支持。",
	"Suggested zooms are unavailable while cursor looping is enabled.":
		"启用光标循环时，无法使用缩放建议。",
	"Zoom suggestion handler unavailable": "缩放建议功能暂不可用",
	"No cursor telemetry available": "没有光标轨迹数据",
	"Record a screencast first to generate cursor-based suggestions.":
		"请先录制屏幕，再根据光标轨迹生成缩放建议。",
	"No usable cursor telemetry": "没有可用的光标轨迹数据",
	"The recording does not include enough cursor movement data.": "录制中没有足够的光标移动数据。",
	"No clear interaction moments found": "未找到明显的交互时刻",
	"Try a recording with pauses or clicks around important actions.":
		"请尝试使用在关键操作附近有停顿或点击的录制。",
	"No auto-zoom slots available": "没有可用的自动缩放位置",
	"Detected dwell points overlap existing zoom regions.": "检测到的停留点与现有缩放区域重叠。",
	"Error copied": "已复制错误信息",
	"Could not copy error": "无法复制错误信息",
	Copy: "复制",
	Retry: "重试",
	"Show in folder": "在文件夹中显示",
	"Export failed": "导出失败",
	"Encoder unavailable": "编码器不可用",
	"Whisper executable selected": "已选择 Whisper 程序",
	"Whisper model selected": "已选择 Whisper 模型",
	"Whisper small model deleted": "已删除 Whisper small 模型",
	"Failed to download Whisper small model": "下载 Whisper small 模型失败",
	"Failed to delete Whisper small model": "删除 Whisper small 模型失败",
	"Select a Whisper model or download the small model first":
		"请先选择 Whisper 模型或下载 small 模型",
	"No source video is loaded": "尚未加载源视频",
	"Recording changed; generated captions were not applied.": "录制内容已更改，未应用生成的字幕。",
	"Failed to generate captions": "生成字幕失败",
	"Share created, but its link could not be saved locally": "分享已创建，但无法将链接保存到本地",
	"Unable to open the source picker.": "无法打开录制来源选择器。",
	"Unable to load the recording source. Pick a screen again.":
		"无法加载录制来源，请重新选择屏幕。",
	"Could not open announcement": "无法打开公告",
	"Could not save library preferences": "无法保存素材库偏好设置",
	"Could not complete action": "无法完成操作",
	"Could not save folders": "无法保存文件夹",
	"No video loaded": "尚未加载视频",
	"Video not ready": "视频尚未准备好",
	"Video metadata is still loading": "正在加载视频信息，请稍候",
	"Export canceled": "已取消导出",
	"Save canceled. You can try again.": "已取消保存，可以重试。",
	"Save canceled. You can save again without re-exporting.":
		"已取消保存，可再次保存，无需重新导出。",
	"Failed to reveal item in folder.": "无法在文件夹中显示文件。",
	"Failed to save GIF": "保存 GIF 失败",
	"GIF export failed": "GIF 导出失败",
	"Video added to timeline": "已将视频添加到时间轴",
	"Failed to import file": "导入文件失败",
	"Project loaded": "已加载项目",
	"No media file selected": "尚未选择媒体文件",
	"Media imported": "已导入媒体",
	"Project save canceled": "已取消保存项目",
	"Failed to save project": "保存项目失败",
	"Project name is required": "请输入项目名称",
	"Project renamed, but library preferences could not be updated":
		"项目已重命名，但无法更新素材库偏好设置",
	"Unsupported format": "不支持此格式",
	"Please select a video file (mp4, webm, mov, etc.)": "请选择视频文件（mp4、webm、mov 等）",
	"Video background added": "已添加视频背景",
	"Failed to import video background": "导入视频背景失败",
	"Could not load companion audio sources. Playback and export may miss microphone audio.":
		"无法加载配套音频，播放和导出时可能缺少麦克风声音。",
	"Native Windows capture is unavailable. Falling back to browser capture.":
		"Windows 原生录制不可用，已切换到浏览器录制。",
	"Unable to check native Windows capture. Falling back to browser capture.":
		"无法检查 Windows 原生录制，已切换到浏览器录制。",
	"Native Windows capture failed to start. Falling back to browser capture.":
		"Windows 原生录制启动失败，已切换到浏览器录制。",
	"Microphone permission denied. Recording will continue without microphone audio.":
		"麦克风权限被拒绝，将继续录制，但不包含麦克风声音。",
};

// Reuse existing translations for messages already covered by the locale catalogs.
const english = import.meta.glob<Record<string, unknown>>("../../i18n/locales/en/*.json", {
	eager: true,
	import: "default",
});
const chinese = import.meta.glob<Record<string, unknown>>("../../i18n/locales/zh-CN/*.json", {
	eager: true,
	import: "default",
});
function collect(source: Record<string, unknown>, target: Record<string, unknown>) {
	for (const [key, value] of Object.entries(source)) {
		const translated = target[key];
		if (typeof value === "string" && typeof translated === "string" && !value.includes("{{")) {
			messages[value] ??= translated;
		} else if (
			value &&
			translated &&
			typeof value === "object" &&
			typeof translated === "object"
		) {
			collect(value as Record<string, unknown>, translated as Record<string, unknown>);
		}
	}
}
for (const [path, source] of Object.entries(english)) {
	const target = chinese[path.replace("/en/", "/zh-CN/")];
	if (target) collect(source, target);
}

const prefixes: Record<string, string> = {
	"Exported successfully to ": "已成功导出到：",
	"Project loaded from ": "已加载项目：",
	"Could not remove videos: ": "无法移除视频：",
	"Could not restore videos: ": "无法恢复视频：",
	"Could not stop import processing: ": "无法停止导入处理：",
	"Could not add video: ": "无法添加视频：",
	"Could not save project: ": "无法保存项目：",
	"Could not load companion audio sources: ": "无法加载配套音频：",
	"Could not load companion audio source: ": "无法加载配套音频：",
	"Error revealing in folder: ": "在文件夹中显示文件时出错：",
	"Failed to reveal item in folder: ": "无法在文件夹中显示文件：",
};

export function translateToastText(text: string): string {
	if (messages[text]) return messages[text];
	const zooms = /^Added (\d+) interaction-based zoom suggestions?$/.exec(text);
	if (zooms) return `已添加 ${zooms[1]} 个基于交互的缩放建议`;
	const captions = /^Generated (\d+) captions$/.exec(text);
	if (captions) return `已生成 ${captions[1]} 条字幕`;
	const videos = /^(\d+) videos added to timeline$/.exec(text);
	if (videos) return `已将 ${videos[1]} 个视频添加到时间轴`;
	for (const [prefix, translated] of Object.entries(prefixes)) {
		if (text.startsWith(prefix))
			return translated + translateToastText(text.slice(prefix.length));
	}
	for (const [suffix, translated] of [
		[
			". Recording was saved without the fallback microphone track.",
			"。录制已保存，但不包含备用麦克风音轨。",
		],
		[
			". Recording will continue without microphone audio.",
			"。将继续录制，但不包含麦克风声音。",
		],
	]) {
		if (text.endsWith(suffix))
			return translateToastText(text.slice(0, -suffix.length)) + translated;
	}
	if (text.includes("\n")) return text.split("\n").map(translateToastText).join("\n");
	// Preserve unknown native diagnostics so errors remain actionable and copyable.
	return text;
}

export function shouldTranslateToasts(): boolean {
	return (
		import.meta.env.VITE_RECORDLY_LOCAL_BUILD === "1" ||
		(typeof document !== "undefined" &&
			document.documentElement.lang.toLowerCase().startsWith("zh"))
	);
}
