# Scratch AI Coach 工作区

这个目录是当前维护工作区，不是一个已经整理好的单一 monorepo 入口。

当前真正需要关注的是主工程目录：

- `apps/desktop-companion`
- `packages/shared`
- `apps/server`

特别说明：

- 根目录现在只保留最小化 workspace 入口，不再混入上游 Scratch clone。
- 如果以后确实需要参考上游实现，可以临时单独 clone；参考结束后再清理，不把它们长期留在当前工作区。
- 真正持续维护和已完成 Windows 联调的部分，主要是 `apps/desktop-companion` 和 `packages/shared`。
- `apps/server` 包还在，但当前工作区里 `apps/server/src` 仍未补齐，不能把它当成已完成交付的服务端实现。

## 当前主工程

### `apps/desktop-companion`

Windows 桌面伴随程序。

当前产品视角已经收敛到两件事：

- 读取 `当前角色`
- 读取 `当前角色对应的程序`

在 2026-04-29 这轮迭代里，桌面端已经直接接入 DeepSeek：

- 展示 `当前已用模块`
- 根据当前项目快照生成 `AI 开发提示`
- 没填 key 时自动回退到本地提示
- 默认走 DeepSeek 官方 V4 模型 `deepseek-v4-flash`
- 自定义 Key 现在放在独立 `DeepSeek 设置` 窗口里，优先级高于环境变量和程序自带配置

### `packages/shared`

共享类型和 Scratch 项目解析工具。

当前主要承担：

- Zod schema
- 桌面伴随程序状态契约
- `projectJsonToSnapshot`
- 程序区域模块汇总
- 扩展使用识别

虽然桌面界面不再显示模块和扩展，但这些字段仍保留在共享状态里，方便后续继续接 AI。

### `apps/server`

服务端包仍保留，但当前工作区里源码快照不完整。

现阶段不要把它当成已经联调完成的交付物；如果后续要继续接 AI 服务端，应以当前 `packages/shared` 契约和桌面端状态为基础续做。

## 2026-04-28 已验证结果

这轮已在真实 Windows 环境完成验证：

- 能解析 `Scratch 3.lnk`，定位到真实 `Scratch 3.exe`
- 能用 `--remote-debugging-port=<port>` 受控启动 Scratch Desktop
- 能通过 CDP 注入只读桥接脚本
- 能读取 `当前角色`
- 能从项目 JSON 推导 `当前角色程序`
- 能打开本地 `.sb3` 并抓取项目信息
- 能从任意本地 `.sb3` 提取项目摘要并生成教学 `brief` 草稿
- 桌面伴随程序源码版和打包版都能自动化验证窗口打开与按钮点击

本轮真实 `.sb3` 验证产物在：

- `Windows-Test/last-sb3-capture.json`

## 当前推荐入口

如果你要继续开发，优先看这些位置：

- `apps/desktop-companion/src/`
- `packages/shared/src/`
- `Windows-Test/`

如果你要从一个现成 Scratch 项目直接进入教学流程，优先看这些位置：

- `Windows-Test/generate-teaching-brief-from-sb3.mjs`
- `Windows-Test/sb3-teaching-draft.mjs`
- `Windows-Test/deepseek-workflow/`
- `Windows-Test/fixtures/projects/cat-and-a-mouse/`
- `Windows-Test/fixtures/cat-and-mouse-flow-sample/`

如果你要继续接 AI 服务，优先看这些文件：

- `apps/desktop-companion/src/session-manager.ts`
- `apps/desktop-companion/src/coach-service.ts`
- `apps/desktop-companion/src/deepseek-config.ts`
- `apps/desktop-companion/src/deepseek.config.json`
- `apps/desktop-companion/src/bridge-script.ts`
- `apps/desktop-companion/src/renderer-view.ts`
- `packages/shared/src/project-snapshot.js`
- `packages/shared/src/schemas.js`

DeepSeek 对接补充说明：

- 官方文档：<https://api-docs.deepseek.com/zh-cn/>
- 当前请求方式：`POST https://api.deepseek.com/chat/completions`
- 当前默认模型：`deepseek-v4-flash`
- 当前 Key 优先级：`设置窗口保存的自定义 API Key > DEEPSEEK_API_KEY > apps/desktop-companion/src/deepseek.config.json`

## 常用命令

桌面伴随程序：

```powershell
cd apps\desktop-companion
npm run build
npm test
npm run test:windows-ui
npm run package:win:single
npm run package:win:installer
```

如果你想直接在仓库根目录执行，也可以用：

```powershell
npm run desktop:icons
npm run desktop:build
npm run desktop:test
npm run desktop:package:portable
npm run desktop:package:installer
```

共享包：

```powershell
cd packages\shared
npm test
```

真实 Windows + Scratch 联调脚本从根目录执行：

```powershell
node Windows-Test\verify-scratch-local.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --launch-debug --test-cdp-eval --kill-on-exit --timeout-ms=12000 --expression="window.location.href"
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --injection-attempts=5 --injection-settle-ms=6000
node Windows-Test\verify-desktop-companion-ui.mjs
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3"
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3" --run-workflow
```

## 从任意 `.sb3` 进入教学流程

如果你手上只有一个本地 Scratch 项目，还没有整理好的教学 `brief`，可以先执行：

```powershell
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3"
```

默认会在 `Windows-Test/generated/<项目名>/` 下生成：

- `project-summary.json`
- `brief-draft.json`
- `README.md`

如果环境里已经有可用的 DeepSeek Key，也可以继续直接接完整教学工作流：

```powershell
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3" --run-workflow
```

## 当前打包产物

当前最新且已验证的交付物在：

- `ScratchDesktopCompanion-setup.exe`
- `apps/desktop-companion/release-installer/ScratchDesktopCompanion-setup.exe`
- `apps/desktop-companion/release-single/win-unpacked/ScratchDesktopCompanion.exe`
- `apps/desktop-companion/release-single/ScratchDesktopCompanion-portable.exe`

补充说明：

- 根目录 `ScratchDesktopCompanion-setup.exe` 是 `npm run package:win:installer` 打包完成后自动复制出的最新安装包入口。
- `apps/desktop-companion/release-installer/` 保留安装包原始输出和 blockmap，方便核对与追踪。
- `win-unpacked` 是当前最稳的已验证产物。
- `portable.exe` 已做过压缩，当前体积约 `83.95 MB`。
- `Windows-Test` 目录不再保留历史 exe 副本；交付时优先认根目录安装包，其余产物回到 `apps/desktop-companion/release-*` 下查找。

## 文档导航

- [主工程架构说明](docs/architecture.zh-CN.md)
- [文档维护约定](docs/maintenance.zh-CN.md)
- [桌面伴随程序说明](apps/desktop-companion/README.md)
- [桌面伴随程序开发交接](apps/desktop-companion/DEVELOPMENT_STATUS.zh-CN.md)
- [机房测试说明](Windows-Test/README.zh-CN.md)
- [DeepSeek 教学工作流说明](Windows-Test/deepseek-workflow/README.zh-CN.md)
- [Windows 部署与排查 SOP](apps/desktop-companion/SOP.zh-CN.md)
