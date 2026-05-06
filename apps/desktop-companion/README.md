# Scratch Desktop Companion

这是主工程里的 Windows + macOS 桌面伴随程序。  
当前主线已经收敛为 **本地基础版**：连接本机 `Scratch Desktop`，读取当前角色和项目数据，把 `当前角色程序 / 推荐积木` 以 Scratch 原版 `scratch-blocks` 只读方式渲染出来，再基于学生当前作品生成 AI 下一步提示。

## 当前产品流程

当前已经对齐并验证的流程是：

1. 打开伴随程序，自动识别本机是否已安装 Scratch。
2. 如果没有识别到路径，Windows 手动选择 `Scratch.exe`、`Scratch 3.exe` 或桌面快捷方式；macOS 手动选择 `Scratch.app`、`Scratch Desktop.app` 或应用包里的可执行文件。
3. 点击 `打开已选 Scratch`，由伴随程序受控启动 Scratch。
4. 伴随程序通过 CDP 注入只读桥接脚本并建立连接。
5. 读取当前角色、项目快照和当前角色脚本，并生成只读 Scratch 积木视图。
6. 点击 `生成下一步提示`，桌面端把当前作品上下文发送给 DeepSeek，并返回下一步建议和推荐积木；推荐积木同样按 Scratch 原版样式展示。

当前界面重点已经收敛为：

- Scratch 软件连接状态
- 已选 Scratch 路径
- 当前角色
- 同步时间
- 当前角色程序
- 推荐积木
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

- 当前是否已经连接
- 当前正在编辑哪个角色
- 当前正在使用哪个 Scratch 可执行文件
- 这个角色当前有哪些脚本，并按 Scratch 原版积木 SVG 只读显示
- AI 给出的下一步建议，以及对应的原版推荐积木

补充：

- `currentTargetPrograms` 这条文本链路仍然保留，主要给 AI、兼容层和排障使用；UI 主显示优先使用官方积木 SVG。
- 当前界面截图可参考：[current-ui-desktop-companion-scratch-blocks.png](../../docs/assets/screenshots/current-ui-desktop-companion-scratch-blocks.png)

## 当前实现要点

- 自动识别常见安装目录下的 `Scratch.exe` / `Scratch 3.exe`
- 支持解析桌面快捷方式 `.lnk`
- 支持识别 `/Applications` 和 `~/Applications` 下的 `Scratch.app` / `Scratch Desktop.app` / `Scratch 3.app`
- 受控启动 Scratch，并附带 `--remote-debugging-port=<port>`
- 通过 Chrome DevTools Protocol 向 Scratch renderer 注入只读桥接脚本
- 桌面端基于 `projectData` 推导 `currentTargetPrograms`
- 桌面端基于 `projectData` 生成 `currentTargetScriptXmlList`
- 桌面端把 `projectData` 转成项目快照后，直接调用 DeepSeek Chat Completions API
- 如果没有配置 DeepSeek Key 或上游失败，自动回退到本地 heuristic 提示
- 连接阶段内置重试注入，降低首次启动时的偶发连接失败
- 关闭主窗口后继续驻留系统托盘

## Scratch 原版积木渲染

当前“当前角色程序 / 推荐积木”不再使用手写 `div + CSS` 去模拟积木，而是直接走官方渲染链路：

1. 主进程收到 Scratch `projectData`
2. `src/common/scratch-block-xml.ts` 把目标脚本和推荐积木转换成 Blockly XML
3. 渲染层在 DOM 中放置 `.scratch-workspace-host[data-xml]`
4. `src/renderer/scratch-workspace-renderer.ts` 用 `scratch-blocks` 创建只读 workspace，并把 XML 加载成 SVG

当前 XML 生成层已经覆盖：

- 顶层脚本排序
- `next` 串联
- `SUBSTACK / SUBSTACK2` 嵌套语句输入
- 常见 primitive input 对应的 shadow block
- 变量 / 列表 / 广播变量字段

这意味着像 `重复执行` 包裹 `移动 10 步`、`一直重复`、`如果` 这类结构，现在显示的是实际嵌套积木，而不是字符串或近似卡片。

## DeepSeek 配置

当前这版不依赖 `apps/server`，而是直接由桌面端请求 DeepSeek。  
调用方式对齐官方文档：`POST https://api.deepseek.com/chat/completions`。

打包前可在：

- `apps/desktop-companion/src/main/deepseek.config.json`

里填写默认的非敏感配置。

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

- 程序提供独立的 `DeepSeek 设置` 窗口，允许在本机保存 `DeepSeek API Key`，并选择 `deepseek-v4-flash / deepseek-v4-pro`。
- `DeepSeek API Key` 和模型选择都只保存在当前电脑本地。
- 运行时只认设置窗口里保存的本机 Key，不再回退 `DEEPSEEK_API_KEY` 或 `deepseek.config.json` 里的 `apiKey`。
- `deepseek.config.json` 现在只保留 `baseUrl`、`timeoutMs` 和默认 `model` 这类非敏感默认项。
- 如果不填 key，`生成下一步提示` 仍可用，但会自动走本地 fallback 提示，而不是线上 DeepSeek。
- 桌面端当前显式使用 JSON Output，并把 `thinking` 设为 `disabled`，这样更适合 Scratch 教练提示这种低延迟、稳定 JSON 返回的场景。
- 主窗口与设置窗口都提供鼠标右键菜单；设置页输入框支持复制、粘贴、全选。
- DeepSeek 官方文档入口：<https://api-docs.deepseek.com/zh-cn/>

## 2026-05-06 已验证结果

当前已验证结果同时覆盖 Windows 和 macOS。

Windows / macOS 已验证通过：

- 能自动识别常见 Scratch 安装路径
- 能受控启动 Scratch 并连上 CDP
- 能读取 `当前角色`
- 能把 `当前角色程序` 渲染成 Scratch 原版只读积木
- 能把 `推荐积木` 渲染成 Scratch 原版单块积木
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

- `npm run dev` / `npm start` 默认应当作为**正常联调启动**使用，不要额外带 `DESKTOP_COMPANION_MOCK_STATE_FILE`、`DESKTOP_COMPANION_AUTOMATION_ACTIONS`、`DESKTOP_COMPANION_AUTOMATION_SCRATCH_PATH` 这 3 个环境变量。
- 如果之前为了 UI 冒烟或演示手动带过这些环境变量，下一次做真实 Scratch 联调前，先清掉它们；否则主窗口会读取 mock 状态，路径可能显示成测试用的 `C:\...`，而且“选择 Scratch 软件”等交互不会落到真实会话。
- `DESKTOP_COMPANION_MOCK_STATE_FILE` 只用于自动化或纯界面演示，不作为人工验收、路径选择或真实 Scratch 联调入口。
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
- 页面能显示 `已选 Scratch`
- 页面能显示 `当前角色`
- 页面能显示 `当前角色程序`
- 页面能挂载 Scratch 只读 workspace 宿主节点

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
- 如果真实项目里出现新的动态菜单块或扩展块，而 `scratch-blocks` 只读渲染还没有兜底定义，需要在 `src/renderer/scratch-workspace-renderer.ts` 继续补注册

## 文档入口

- [根工作区总览](../../README.md)
- [开发交接文档](DEVELOPMENT_STATUS.zh-CN.md)
- [部署与排查 SOP](SOP.zh-CN.md)
- [验证与回归说明](../../tools/verification/README.zh-CN.md)
- [DeepSeek 教学工作流说明](../../tools/verification/workflows/deepseek-teaching/README.zh-CN.md)
