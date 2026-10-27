# Zenvue

Zenvue 是基于 Recordly 修改的独立本地录屏与演示编辑器，采用已确认的深靛蓝和薄荷绿 Logo。

由 [alienzhang23](https://github.com/alienzhang23) 独立维护。仓库：[alienzhang23/Zenvue](https://github.com/alienzhang23/Zenvue)。问题反馈请提交到本仓库的 Issues。

当前免费版默认免登录使用本地录制与编辑，隐藏尚未上线的登录、账户设置和云端分享入口；反馈按钮打开 GitHub Issues。认证代码保留供以后接入自有服务，默认不创建认证客户端。未来启用账户需要显式设置 `VITE_ZENVUE_ACCOUNTS_ENABLED=1` 并完成自己的后台与回调部署；本地构建不因此强制登录。

源码目录：`E:\workspace\Zenvue`。开发与打包说明见 [README](README.md)。

已保留区域录制、打字自动缩放、Esc 停止并保存和浮窗退出保护。`.recordly` 文件格式和旧设置键继续兼容。已有增强版资料目录会在 Windows 上继续复用，不读取原版 Recordly 的资料目录。

本项目基于 Recordly（© 2026 webadderall）及其上游 OpenScreen（© 2025 Siddharth Vaddem），并非 Recordly 官方版本。采用 [AGPLv3](LICENSE.md)，无担保；保留 [第三方声明](THIRD_PARTY_NOTICES.md)。

修改范围及日期见 [CHANGELOG.md](CHANGELOG.md)，来源、维护关系与许可证说明见 [NOTICE.md](NOTICE.md)。原项目版权与 MIT 署名完整保留，不主张对上游代码的独占所有权。

源码构建步骤见 [README.md](README.md) 和 [RELEASING.md](RELEASING.md)。全新机器需要安装对应平台的原生构建工具；生成的辅助程序、安装包和模型不进入 Git。上传源码不等于已经发布或完成新版安装包验收。

本地规划、密钥、日志及构建产物不提交。向其他人分发程序时，须按 AGPLv3 提供对应版本源码和许可证；接收者无法访问的私有仓库链接不能代替源码交付。
