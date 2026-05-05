# Scratch AI Coach 工作区

这个仓库现在是一个收口后的维护工作区，不再把上游 Scratch clone、历史打包产物和零散截图长期混在根目录里。

当前主工程只有三块：

- `apps/desktop-companion`：Windows + macOS 桌面伴随程序，也是当前持续维护的主应用
- `packages/shared`：共享类型、状态契约和 Scratch 项目解析能力
- `apps/server`：服务端包保留中，但当前源码快照不完整，不能视为已交付实现

## 当前边界

- 根目录只保留 workspace 入口、统一脚本和文档导航
- 真正持续维护的主要是 `apps/desktop-companion` 和 `packages/shared`
- 真实 Scratch 联调目前仍以 Windows 为主；macOS 已补齐开发、基础测试和打包入口
- 如果后续要参考上游 Scratch 实现，应该临时单独 clone，任务结束后清理，不恢复成常驻目录

## 常用命令

仓库根目录可直接执行：

```powershell
npm run desktop:icons
npm run desktop:build
npm run desktop:test
npm run desktop:test:ui
npm run desktop:package:portable
npm run desktop:package:installer
npm run desktop:package:bundle
npm run desktop:package:mac:app
npm run desktop:package:mac:dmg
npm run workspace:clean:dry-run
npm run workspace:clean
```

子目录常用入口：

```powershell
cd apps\desktop-companion
npm test

cd ..\..\packages\shared
npm test
```

## 文档导航

- [主工程文档索引](docs/README.zh-CN.md)
- [主工程架构说明](docs/architecture.zh-CN.md)
- [文档维护约定](docs/maintenance.zh-CN.md)
- [桌面伴随程序说明](apps/desktop-companion/README.md)
- [桌面伴随程序开发交接](apps/desktop-companion/DEVELOPMENT_STATUS.zh-CN.md)
- [机房测试说明](Windows-Test/README.zh-CN.md)
- [DeepSeek 教学工作流说明](Windows-Test/deepseek-workflow/README.zh-CN.md)
- [Windows 部署与排查 SOP](apps/desktop-companion/SOP.zh-CN.md)

## 目录收口

- 文档总入口统一看 `docs/README.zh-CN.md`
- 最终安装包统一收口到 `installers/`
- 文档截图统一收口到 `docs/assets/screenshots/`
- `Windows-Test/generated/`、`Windows-Test/tmp-*`、`Windows-Test/last-*.json` 属于可再生产物
- `apps/desktop-companion/dist/`、`apps/desktop-companion/release-*` 和各级 `node_modules/` 属于本地依赖或打包输出

如果只想清理当前工作区而不碰源码，执行：

```powershell
npm run workspace:clean
```

如果要先预览会删什么，执行：

```powershell
npm run workspace:clean:dry-run
```

## 继续开发时优先看哪里

- 课堂首页和 AI 引导流程：`apps/desktop-companion/src/`
- 共享状态和项目快照：`packages/shared/src/`
- Windows 真机验证与回归入口：`Windows-Test/`
- 从 `.sb3` 生成教学草稿：`Windows-Test/generate-teaching-brief-from-sb3.mjs`

## 当前已验证范围

这条工作线已经在真实 Windows 环境完整验证过，并补上了 macOS 开发与打包入口：

- 可定位并启动真实 `Scratch 3.exe`
- 可用 `--remote-debugging-port=<port>` 受控拉起 Scratch Desktop
- 可通过 CDP 注入只读桥接脚本并读取当前角色信息
- 可从本地 `.sb3` 提取项目摘要并生成教学 `brief` 草稿
- 桌面伴随程序源码版和打包版都做过自动化 UI 验证
- macOS 现已支持本地开发构建、源码版 UI 自动化，以及 `.app` / `.dmg` 内测打包命令

更细的验证脚本、样例工程和测试 SOP 统一放在 `Windows-Test/` 下维护。
