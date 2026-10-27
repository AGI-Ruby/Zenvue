# Third-party notices

## Voom

Recordly Share includes code adapted from the Voom project:

- Project: [Voom](https://github.com/aritropaul/voom)
- Adapted component: `services/recordly-share/worker`
- License: MIT
- Copyright © 2026 Aritro Paul
- Upstream reference: `c1c0350ed610b0c9bc4a307fcc6a01aab0f926f9`

Recordly changes include product branding, desktop publishing integration,
authenticated commenting, local-development configuration, and viewer styling.

The Voom software is provided under the following license:

> MIT License
>
> Copyright (c) 2026 Aritro Paul
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Solar Icons

Solar Icon Set by 480 Design, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Source: https://github.com/480-Design/Solar-Icon-Set. Icons are rendered using the MIT-licensed `@solar-icons/react` package. The muted microphone adds a diagonal stroke.

## DM Sans

Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts).

DM Sans is licensed under the SIL Open Font License, Version 1.1. The unmodified regular and italic variable fonts are sourced from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/dmsans). The full license is included in [src/assets/fonts/dm-sans/OFL.txt](src/assets/fonts/dm-sans/OFL.txt).

## whisper.cpp 与 SDL2

Windows 字幕运行时包含 [whisper.cpp v1.8.4](https://github.com/ggml-org/whisper.cpp/tree/v1.8.4)，采用 MIT 许可证；完整声明见 [licenses/whisper.cpp-LICENSE.txt](licenses/whisper.cpp-LICENSE.txt)。模型文件不随本次程序包分发。

字幕运行时附带的 SDL2 动态库遵循其 zlib 许可证，声明见 [licenses/SDL2-LICENSE.txt](licenses/SDL2-LICENSE.txt)，来源为 [SDL 官方仓库](https://github.com/libsdl-org/SDL/tree/SDL2)。

## FFmpeg / FFprobe 与 Electron

本次 Windows 包包含由依赖提供的 FFmpeg、FFprobe 和 Electron。其原始许可证、构建说明和 Chromium notices 保留在包内相应组件目录中。FFmpeg 静态二进制的 GPLv3 许可证和对应源码版本信息分别见 `resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg.exe.LICENSE` 与 `ffmpeg.exe.README`。Electron / Chromium 声明位于程序根目录的 `LICENSE.electron.txt` 和 `LICENSES.chromium.html`。这些组件按各自许可证分发。
