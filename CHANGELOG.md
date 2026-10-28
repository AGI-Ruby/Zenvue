# Zenvue changes

## 1.4.3 — 2026-10-28

- 字幕模型下载入口改为 HF-Mirror，增加失败重试及文件大小、SHA-256 完整性校验。
- 优先验证已保存的模型路径，再检测常见缓存、模型目录和下载目录；找到兼容的本地 GGML 模型后直接复用。
- 字幕面板显示当前模型路径，支持手动选择模型；其他软件的模型仅复用，不通过删除按钮移除。
- 手动选择模型时校验 whisper.cpp 格式，并提示 Python Whisper 与 Faster-Whisper 模型不兼容。
- 新增本地模型检测、下载失败重试、并发下载与损坏文件校验测试；修正原有字幕测试的 Windows 路径匹配。

## 1.4.2 — 2026-10-27

- 编辑器右上角新增关闭按钮，沿用现有窗口关闭与未保存内容处理流程。
- 简化主页右上角入口，移除重复的“返回录制浮窗”文字按钮，保留关闭主页并返回浮窗的图标。
- 桌面快捷方式更新脚本使用带 BOM 的 UTF-8 编码，改善 Windows PowerShell 的中文兼容性。

## 1.4.1 — 2026-10-27

- 默认 README 改为中文，介绍主要功能、下载方式与录制操作；保留英文说明和上游声明。
- 黄色待录制选框新增醒目的 Esc 提示；支持取消已确认的录制区域并清理遮罩。
- 框选松开即选中，支持调整非全屏框选区域，并保持录制浮窗可见。
- Windows 托盘支持唤出录制浮窗；主页新增返回浮窗和关闭入口。
- 新增桌面快捷方式更新脚本，打包后将桌面入口指向当前程序。
- 发布 Windows x64 ZIP 包，附带许可证、对应源码包和 SHA-256 校验文件。


- Hide unavailable sign-in, account settings and cloud-sharing controls by default.
- Keep the local build's recording path independent of optional cloud accounts.
- Restore saved cloud-export choices to local export when sharing is unavailable.
- Route feedback to the Zenvue GitHub Issues page without an application login.

## 1.4.0-zenvue.1 — derivative snapshot, 2026-10-27

- Establish independent Zenvue branding and retain Recordly / OpenScreen attribution.
- Add Windows region recording and improve recording-source selection and overlay behavior.
- Add typing-triggered zoom using the most recent click as the input anchor.
- Improve cursor presentation, transitions, export options and recording-library workflows.
- Provide a Simplified Chinese interface, including shared notification messages.
- Preserve editable project compatibility, third-party notices and AGPLv3 licensing.

This is an initial source snapshot of an existing local derivative, not a reconstruction of its upstream commit history. Automated checks and source inspection do not replace end-to-end recording acceptance on each supported machine.
