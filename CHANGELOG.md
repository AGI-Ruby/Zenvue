# Zenvue changes

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
