# Recordly 个人增强版 · 第一版

日期：2026-10-23。版本：1.4.0-enhanced.1。

**状态：源码修改、相关单元测试、类型检查、生产构建和独立程序启动已完成；真实录屏画质及完整界面操作尚未验收。**

## 使用

程序位于桌面 `Recordly增强版\win-unpacked\RecordlyEnhanced.exe`，双击即可启动，不需要覆盖原安装版。整个 win-unpacked 文件夹必须保留，不能只拷贝 EXE。

1. 在录制浮窗点击“Choose recording source”。
2. 在目标显示器拖框选择区域，可调整选区，确认后回到录制浮窗。
3. 点击录制。完成后停止，进入编辑器检查自动缩放、鼠标和点击效果。
4. 在编辑器中预览/调整后导出；为比较清晰度，先用与源文件相同的导出分辨率，避免缩小画布造成文字变软。

以上步骤来自功能实现，尚未完成整套界面实测。原安装版仍位于 `E:\software\Recordly`，没有被替换。

## 本次改动

### Windows 自定义区域录屏

- 启用此前仅在 macOS 开放的区域选择入口和选区验证。
- Windows 区域路径使用浏览器屏幕采集与 Canvas 原像素裁切；仅将裁切后的视频轨送入 MediaRecorder，原显示器轨只在内存中用于取帧。
- 使用实际采集尺寸与显示器 DIP 边界映射坐标，支持高 DPI 和副屏负坐标。
- 选区向内取整，并对编码尺寸做偶数对齐，避免拉伸；在部分缩放比例下可能舍去边缘不到两个像素。
- 显示器尺寸变化或采集轨结束时停止该路径，不自动改成整屏录制。
- 区域外的按下/释放事件不再错误钳制到边缘生成点击效果和自动缩放。

### 录制清晰度相关

- 浏览器采集不再统一限制到 3840×2160，而是按显示器原生尺寸申请；未知尺寸的窗口采用更宽的上限。
- 设置视频轨的 detail 内容提示；裁切过程不做插值放大。
- 码率按实际像素与帧率分配，并保留原有分档码率下限。示例：1080p60 不低于 30.6 Mbps，4K60 约 99.5 Mbps，最高限制 160 Mbps。
- **上述调整主要影响浏览器录制路径，包括新增 Windows 区域录制。已有 Windows 原生整屏/窗口采集继续使用原生助手，本次没有重编其编码器。**

这可以避免不必要的降采样，并提高浏览器路径的编码预算；尚不能据此承诺某台机器上的实际观感提升、恒定 60 fps 或达到 FocuSee 同等画质。Canvas 路径在高分辨率下可能增加 CPU/GPU 负担，需要实测。

### 自动缩放

- 连续点击相距很远时分成独立焦点，避免一直聚焦第一处。
- 对相邻缩放片段做分界，避免错误重叠。
- 新录制中单个明确的点击也能触发自动缩放建议。
- 保留已有的缩放时间语义与用户手动编辑功能。

### 鼠标顺滑与点击效果

- 暂停时反复重绘不再继续推进鼠标弹簧。
- 时间线向前/向后大幅跳转时重置平滑状态，避免光标从旧位置缓慢漂移过来。
- 保留原有点击反弹、波纹与鼠标外观路径；区域录制中启用可编辑光标叠加。

### 独立试用配置

- 包名为 recordly-enhanced，产品名 Recordly Enhanced，使用独立用户配置目录。
- 关闭此个人版本的自动更新，以免被上游安装包替换。
- `.env.enhanced` 显式启用本地录制模式。仅在未配置云认证服务时允许本地录制，不伪造账号或访问令牌，不改变云端分享认证。
- 此版本不接管原版的 recordly:// 协议注册。

## 验证

- TypeScript 全局类型检查通过。
- 相关 230 项测试通过，包括区域/DPI 映射、生命周期、区域外点击过滤、Windows 选区、自动缩放、鼠标平滑和原有认证行为。
- 修改文件的 Biome lint 通过。
- Vite 生产构建与 electron-builder Windows 目录打包通过。
- 启动后能读到增强版 HUD 的录制控件与编辑器主页控件。
- **完整 UI 验收未完成**：用户已明确授权 Computer Use，但窗口截图多次返回 `FrameArrived timed out` / `window capture timed out`；点击控件返回 `coordinate input geometry is unavailable`。未关闭捕获保护、未操作其他软件，也未开始录制桌面内容。
- 尚未验证真实录制帧率、编码画质、音画同步、实际点击效果、自动缩放观感及最终导出文件。

构建还出现上游样式依赖的 CSS minifier 警告和已有的大 chunk 提示；构建成功，但界面视觉仍需人工检查。

## 源码与来源

上游：https://github.com/webadderallorg/Recordly

本次下载对应 Git tree：`e4a9d04860f4cbad3358bda3ac4a2307489f1d03`。本地安装版与上游源码均标记 1.4.0，但没有声称二者逐字节一致；增强版基于上述上游快照修改。

完整工作源码：`E:\Desktop\cc对话\recordly-focusee\Recordly-main`。

桌面交付包含源码压缩包、改动补丁、原始 LICENSE.md 和本说明。保留上游及原始项目署名。本次没有复制 FocuSee 的程序代码、DLL 或美术资源。

## 重建方式

开发依赖：Node/npm；安装依赖后运行：

```text
npm ci --ignore-scripts
npm run typecheck
npx vite build --config vite.config.ts --mode enhanced
npx electron-builder --win --dir --config enhanced-builder.json
```

此机器的 enhanced-builder.json 使用已安装 Recordly 的 Electron 运行时副本（recordly-analysis/electron-runtime）。Windows 原生助手、FFmpeg/FFprobe 和 uiohook-napi 的运行二进制来自原安装目录，并未重新编译。完整工作目录已具备它们；源码压缩包不重复打包这些大型二进制，换机器需按上游构建脚本准备原生组件，并调整 electronDist/输出路径。

分析与日志目录：`E:\Desktop\cc对话\recordly-analysis`。
