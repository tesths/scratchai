# Scratch AI Coach 工作区

这是一个收口后的 npm workspace，当前只维护桌面端主应用、共享领域包和跨平台验证工具。

## 当前结构

- `apps/desktop-companion`
  Windows + macOS Electron 桌面伴随程序
- `packages/shared`
  共享 schema、项目快照和 Scratch 项目解析逻辑
- `tools/verification`
  真机验证脚本、教学工作流、fixtures 和回归文档

`apps/server` 已从当前主线移除，不再作为可开发模块保留。

## 快速开始

在新电脑上继续开发，默认流程就是：

```bash
git clone git@github.com:tesths/scratchai.git
cd scratchai
npm ci
npm run test
```

常用命令：

```bash
npm run build
npm run test
npm run clean:dry-run
npm run clean
npm run package:win
npm run package:win:bundle
npm run package:mac
npm run package:mac:dmg
```

说明：

- 这是一个 npm workspace；依赖安装在仓库根目录，`apps/desktop-companion` 不单独维护自己的 `node_modules`
- 桌面伴随程序本地启动请优先使用 `cd apps/desktop-companion && npm start` 或 `npm run dev`，脚本已固定走仓库根目录的本地 Electron
- 不要手工执行裸命令 `electron dist/main.js`；如果系统里刚好装着全局旧版 Electron，可能会报 `Unexpected token {` 或 `node:fs/promises` 相关启动错误
- 当前这台机器上的 `npm` 会对 `Node.js v22.16.0` 打兼容性 warning；只要命令最终退出码为 `0`，可先按告警处理，不是这次桌面端启动问题的根因
- 本地默认只保证“当前平台可开发、可测试、可出包”
- 正式双平台产物由 GitHub Actions 分别在 Windows 和 macOS runner 生成
- `CI` workflow 当前只负责 `build + test`，不会上传可下载产物
- `Desktop Release Artifacts` workflow 会把 `installers/**` 上传为 GitHub Actions artifact；Windows 名称是 `scratch-desktop-companion-windows`，macOS 名称是 `scratch-desktop-companion-macos`，默认保留 `7` 天
- 当前仓库还没有把安装包自动发布到 GitHub Releases；如需正式 Release asset，仍需单独补 release/tag workflow
- `installers/` 只作为本地产物收口目录，不纳入 git

## 目录约定

- `apps/desktop-companion/src/main`
  Electron 主进程、Scratch 启动/桥接、AI 调用、状态管理
- `apps/desktop-companion/src/renderer`
  主窗口、设置窗口、preload 和静态页面
- `apps/desktop-companion/src/common`
  主进程与渲染层共享类型和轻量契约
- `tools/verification/scripts`
  真实验证和回归入口
- `tools/verification/tests`
  verification 自己的自动化测试
- `tools/verification/workflows/deepseek-teaching`
  教学工作流和提示词模板

## 文档导航

- [主工程文档索引](docs/README.zh-CN.md)
- [主工程架构说明](docs/architecture.zh-CN.md)
- [文档维护约定](docs/maintenance.zh-CN.md)
- [桌面伴随程序说明](apps/desktop-companion/README.md)
- [桌面伴随程序开发交接](apps/desktop-companion/DEVELOPMENT_STATUS.zh-CN.md)
- [验证与回归说明](tools/verification/README.zh-CN.md)
- [教学工作流说明](tools/verification/workflows/deepseek-teaching/README.zh-CN.md)
- [Windows 部署 SOP](apps/desktop-companion/SOP.zh-CN.md)

## 当前已验证范围

- Windows 与 macOS 双平台源码构建
- `packages/shared` 单测
- `apps/desktop-companion` 单测
- `tools/verification` 单测
- 桌面端源码版 UI 自动化
- Scratch bridge 基线与本地 `.sb3` 加载验证
- 打包版 `.app` / `win-unpacked` / installer 相关脚本链路

更细的真机验证命令、样例工程和回归说明统一在 `tools/verification/` 下维护。
