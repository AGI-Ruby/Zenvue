# Building and releasing Zenvue

This repository has its own identity and does not publish to Recordly's releases, update servers or Homebrew tap. The upstream publishing guide and Homebrew cask are preserved under docs/upstream/ only as historical reference. No GitHub Actions release workflow is enabled in this source snapshot.

## Build prerequisites

- Node.js 22 or later and npm.
- Windows: Visual Studio C++ Build Tools, Windows SDK and CMake.
- macOS: Xcode Command Line Tools; platform-specific code still needs validation on a Mac.
- Optional NVIDIA export compositor: CUDA Toolkit and NVIDIA Video Codec SDK. Supply the latter via RECORDLY_NVIDIA_VIDEO_CODEC_SDK_ROOT according to its license; it is not included in Git.
- Internet access for npm dependencies, Whisper runtime/model downloads when requested, Electron and packaging tools.

## Windows source build

Run npm ci, npm run build:platform-native-helpers, npm run typecheck, npm test and npm run package:local. The package is written to release/zenvue/win-unpacked. Keep the complete folder together.

The npm install hook prepares native modules and helpers. If diagnosing an installation failure, npm ci --ignore-scripts installs source dependencies without running those steps; explicitly run npm run rebuild:native and npm run build:platform-native-helpers afterward. Ignoring install scripts alone does not produce a runnable native recording build.

Generated native helpers, build caches and packaged executables are excluded from Git. Follow errors from each helper build script to install missing toolchains. An optional component that cannot be built on a fresh machine must not be represented as validated.

## Before distributing

- Retain LICENSE.md, NOTICE.md, THIRD_PARTY_NOTICES.md and the application's visible attribution.
- Provide recipients with the complete corresponding source for the exact released version, including build scripts and your modifications, in a form meeting AGPLv3. A private repository link is not sufficient for recipients without access. Review section 13 for modified programs used over a network.
- Preserve dependency and asset license notices. Review FFmpeg build configuration and licensing, codecs, model/runtime terms, NVIDIA SDK terms and platform signing requirements for the particular binaries being distributed. Downloadable dependencies are not automatically covered by Zenvue's license.
- Test recording, source selection, pause/resume, stopping, cursor/typing zoom, microphone/webcam sync, project reopening and export. No new end-to-end recording acceptance was performed as part of repository preparation.
- Sign releases using your own credentials if appropriate. Do not reuse upstream signing credentials or publish upstream update metadata.

This repository setup uploads source only; it does not publish installers, model files or a release.
