# Scratch Desktop Companion

这是主工程里的 Windows + macOS 桌面伴随程序。  
当前主线已经收敛为 **本地基础版**：连接本机 `Scratch Desktop`，读取当前角色和当前角色程序，再基于学生当前作品生成 AI 下一步提示。

## 当前产品流程

当前已经对齐并验证的流程是：

1. 打开伴随程序，自动识别本机是否已安装 Scratch。
2. 如果没有识别到路径，Windows 手动选择 `Scratch.exe`、`Scratch 3.exe` 或桌面快捷方式；macOS 手动选择 `Scratch.app`、`Scratch Desktop.app` 或应用包里的可执行文件。
3. 点击 `打开已选 Scratch`，由伴随程序受控启动 Scratch。
4. 伴随程序通过 CDP 注入只读桥接脚本并建立连接。
5. 读取当前角色、当前角色程序和项目快照。
6. 点击 `生成下一步提示`，桌面端把当前作品上下文发送给 DeepSeek，并返回下一步建议、推荐积木和风险提醒。

当前界面重点已经收敛为：

- Scratch 软件连接状态
- 当前角色
- 当前角色程序
- AI 当前一步提示

如果你不是直接在桌面端里做实时提示，而是想拿一个已有 `.sb3` 先整理成教学材料，请改走：

- `tools/verification/scripts/generate-teaching-brief-from-sb3.mjs`
- `tools/verification/workflows/deepseek-teaching/`

## 当前界面状态口径

典型状态有：

- `请先选择 Scratch 软件`
- `请从伴随程序打开已选 Scratch`
- `已连接到 Scratch Desktop`

连接成功后，界面重点展示：

- 当前正在编辑哪个角色
- 这个角色当前有哪些脚本，以及脚本里的 opcode 顺序
- AI 给出的下一步建议、推荐积木和追问

例如：

```text
脚本 1: event_whenflagclicked -> control_forever -> motion_movesteps -> pen_clear
```

## 当前实现要点

- 自动识别常见安装目录下的 `Scratch.exe` / `Scratch 3.exe`
- 支持解析桌面快捷方式 `.lnk`
- 支持识别 `/Applications` 和 `~/Applications` 下的 `Scratch.app` / `Scratch Desktop.app` / `Scratch 3.app`
- 受控启动 Scratch，并附带 `--remote-debugging-port=<port>`
- 通过 Chrome DevTools Protocol 向 Scratch renderer 注入只读桥接脚本
- 桌面端基于 `projectData` 推导 `currentTargetPrograms`
- 桌面端把 `projectData` 转成项目快照后，直接调用 DeepSeek Chat Completions API
- 如果没有配置 DeepSeek Key 或上游失败，自动回退到本地 heuristic 提示
- 连接阶段内置重试注入，降低首次启动时的偶发连接失败
- 关闭主窗口后继续驻留系统托盘

## DeepSeek 配置

当前这版不依赖 `apps/server`，而是直接由桌面端请求 DeepSeek。  
调用方式对齐官方文档：`POST https://api.deepseek.com/chat/completions`。

打包前可在：

- `apps/desktop-companion/src/main/deepseek.config.json`

里填写默认配置。

当前默认内容如下：

```json
{
  "apiKey": "PLEASE_FILL_DEEPSEEK_API_KEY",
  "model": "deepseek-v4-flash",
  "baseUrl": "https://api.deepseek.com",
  "timeoutMs": 20000
}
```

说明：

- 程序提供独立的 `DeepSeek 设置` 窗口，允许在本机保存 `自定义 DeepSeek API Key`。
- 优先级是：`设置窗口保存的 Key > 环境变量 DEEPSEEK_API_KEY > 程序自带 deepseek.config.json`。
- 清除设置窗口里保存的 Key 后，会按 `DEEPSEEK_API_KEY > deepseek.config.json` 的顺序继续回退。
- 如果不填 key，`生成下一步提示` 仍可用，但会自动走本地 fallback 提示，而不是线上 DeepSeek。
- 桌面端当前显式使用 JSON Output，并把 `thinking` 设为 `disabled`，这样更适合 Scratch 教练提示这种低延迟、稳定 JSON 返回的场景。
- 主窗口与设置窗口都提供鼠标右键菜单；设置页 API Key 输入框支持复制、粘贴、全选。
- DeepSeek 官方文档入口：<https://api-docs.deepseek.com/zh-cn/>

## 2026-05-06 已验证结果

当前已验证结果同时覆盖 Windows 和 macOS。

Windows / macOS 已验证通过：

- 能自动识别常见 Scratch 安装路径
- 能受控启动 Scratch 并连上 CDP
- 能读取 `当前角色`
- 能推导 `当前角色程序`
- 能生成桌面端 AI 提示，并在无 key 时回退到本地提示
- Electron UI 自动化已覆盖当前本地版界面结构
- 源码版和打包版 UI 冒烟可通过

## 本地开发命令

在 `apps/desktop-companion` 目录执行：

```powershell
npm run icons:generate
npm run build
npm test
npm run test:desktop-ui
npm run test:windows-ui
npm run dev
npm run package:win
npm run package:win:single
npm run package:win:installer
npm run package:win:bundle
npm run package:mac:app
npm run package:mac:dmg
```

说明：

- `npm run test:desktop-ui` 可在 Windows 和 macOS 跑源码版 UI 自动化
- `npm run test:windows-ui` 这个脚本名沿用历史命名，但当前源码版 UI 自动化已可在 Windows 和 macOS 跑
- `tools/verification/scripts/verify-scratch-local.mjs`、`tools/verification/scripts/verify-scratch-bridge.mjs` 和 `tools/verification/scripts/verify-desktop-companion-real-e2e.mjs` 现在都按当前平台自动选择默认二进制路径；需要复现时仍建议显式传 `--exe` / `--scratch-exe` / `--companion-exe`

## 真实 Scratch 联调命令

从仓库根目录执行：

```powershell
node tools/verification\scripts\verify-scratch-local.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --launch-debug --test-cdp-eval --kill-on-exit --timeout-ms=12000 --expression="window.location.href"
node tools/verification\scripts\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --injection-attempts=5 --injection-settle-ms=6000
node tools/verification\scripts\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --post-action-payload-timeout-ms=20000 --post-action-settle-ms=1200 --injection-attempts=5 --injection-settle-ms=6000 --scenario=cat-motion
node tools/verification\scripts\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --load-project-file="C:\Users\Administrator\Desktop\Scratch作品.sb3"
node tools/verification\scripts\verify-desktop-companion-ui.mjs
node tools/verification\scripts\verify-desktop-companion-ui.mjs --packaged-app --electron-exe="C:\Users\Administrator\Desktop\scratch\installers\ScratchDesktopCompanion-win-unpacked\ScratchDesktopCompanion.exe"
node tools/verification\scripts\verify-desktop-companion-real-e2e.mjs
```

macOS 对应入口：

```bash
node tools/verification/scripts/verify-scratch-local.mjs --exe="/Applications/Scratch 3.app/Contents/MacOS/Scratch 3" --launch-debug --test-cdp-eval --kill-on-exit --timeout-ms=20000 --expression="window.location.href"
node tools/verification/scripts/verify-scratch-bridge.mjs --exe="/Applications/Scratch 3.app/Contents/MacOS/Scratch 3" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --injection-attempts=5 --injection-settle-ms=6000
node tools/verification/scripts/verify-scratch-bridge.mjs --exe="/Applications/Scratch 3.app/Contents/MacOS/Scratch 3" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --post-action-payload-timeout-ms=20000 --post-action-settle-ms=1200 --injection-attempts=5 --injection-settle-ms=6000 --scenario=cat-motion
node tools/verification/scripts/verify-scratch-bridge.mjs --exe="/Applications/Scratch 3.app/Contents/MacOS/Scratch 3" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --load-project-file="/absolute/path/to/project.sb3"
node tools/verification/scripts/verify-desktop-companion-ui.mjs
node tools/verification/scripts/verify-desktop-companion-ui.mjs --packaged-app --electron-exe="./installers/ScratchDesktopCompanion-mac.app/Contents/MacOS/ScratchDesktopCompanion"
node tools/verification/scripts/verify-desktop-companion-real-e2e.mjs --project-file="/absolute/path/to/project.sb3"
```

## 自动化测试覆盖

当前已覆盖：

- `packages/shared` 单元测试
- `apps/desktop-companion` 单元测试
- Electron UI 自动化
- 打包后 `win-unpacked` UI 自动化
- 打包后 macOS `.app` UI 冒烟
- 真实 Windows + Scratch bridge 联调
- 真实 `.sb3` 读取验证
- 打包版真实端到端 E2E

UI 自动化当前重点断言：

- 软件窗口能正常打开
- `选择 Scratch 软件`、`打开已选 Scratch`、`重新连接` 3 个按钮都能点击
- `DeepSeek 设置` 按钮能打开独立设置窗口
- 页面能显示 `当前角色`
- 页面能显示 `当前角色程序`

## 日志位置

当前优先查看：

```text
C:\Users\<当前用户名>\AppData\Roaming\@scratch-ai\desktop-companion\desktop-companion.log
```

macOS 默认位置：

```text
~/Library/Application Support/@scratch-ai/desktop-companion/desktop-companion.log
```

兼容旧版本时，也可以顺手检查：

```text
C:\Users\<当前用户名>\AppData\Roaming\scratch-desktop-companion\desktop-companion.log
```

## 当前限制

- `verify-deepseek-live-seq.mjs` 这类依赖真实线上模型的脚本仍需要可用的 DeepSeek Key
- 部分机房部署与开机自启 SOP 仍以 Windows 环境为例，macOS 对应运维文档还不完整
- 当前主路线仍然是“受控启动 Scratch + CDP 注入”，不是“用户手工打开 Scratch 后再附着”
- 界面不再展示模块和扩展，但这些字段仍作为兼容状态保留
- `tools/verification/scripts/verify-scratch-local.mjs` 更适合做 CDP 冒烟检查，不是最终产品验收结论

## 文档入口

- [根工作区总览](../../README.md)
- [开发交接文档](DEVELOPMENT_STATUS.zh-CN.md)
- [部署与排查 SOP](SOP.zh-CN.md)
- [验证与回归说明](../../tools/verification/README.zh-CN.md)
- [DeepSeek 教学工作流说明](../../tools/verification/workflows/deepseek-teaching/README.zh-CN.md)
