# Scratch Desktop Companion

这是主工程里的 Windows 桌面伴随程序，用来连接 `Scratch Desktop`，读取当前角色、当前角色程序和已用模块，并基于这些上下文给学生生成 AI 开发提示。

## 当前产品流程

当前已经对齐并验证的流程是：

1. 打开伴随程序，自动识别本机是否已安装 Scratch。
2. 如果没有识别到路径，手动选择 `Scratch.exe` 或 `Scratch 3.exe`。
3. 点击 `打开 Scratch`，由伴随程序受控启动 Scratch。
4. 伴随程序通过 CDP 注入只读桥接脚本并建立连接。
5. 界面实时显示：
   - `当前角色`
   - `当前角色程序`
   - `当前已用模块`
6. 学生或老师如需配置 DeepSeek Key，可打开单独的 `DeepSeek 设置` 窗口。
7. 点击 `生成 AI 提示`，桌面端把当前项目快照发送给 DeepSeek，并返回下一步建议、推荐积木和风险提醒。

当前界面重点已经从“模块 / 扩展面板”收敛为“角色 + 角色程序 + AI 提示”。

如果你不是直接在桌面端里做实时提示，而是想拿一个已有 `.sb3` 先整理成教学材料，请改走：

- `Windows-Test/generate-teaching-brief-from-sb3.mjs`
- `Windows-Test/deepseek-workflow/`

## 当前界面状态口径

典型状态有：

- `请先选择 Scratch 路径`
- `请从伴随程序启动 Scratch Desktop`
- `已连接到 Scratch Desktop`

连接成功后，界面重点展示：

- 当前正在编辑哪个角色
- 这个角色当前有哪些脚本，以及脚本里的 opcode 顺序
- 当前角色已经用了哪些模块
- AI 给出的下一步建议、推荐积木和追问

例如：

```text
脚本 1: event_whenflagclicked -> control_forever -> motion_movesteps -> pen_clear
```

## 当前实现要点

- 自动识别常见安装目录下的 `Scratch.exe` / `Scratch 3.exe`
- 支持解析桌面快捷方式 `.lnk`
- 受控启动 Scratch，并附带 `--remote-debugging-port=<port>`
- 通过 Chrome DevTools Protocol 向 Scratch renderer 注入只读桥接脚本
- 桌面端基于 `projectData` 推导 `currentTargetPrograms`
- 桌面端把 `projectData` 转成项目快照后，直接调用 DeepSeek Chat Completions API
- 如果没有配置 DeepSeek Key 或上游失败，自动回退到本地 heuristic 提示
- 连接阶段内置重试注入，降低首次启动时的偶发连接失败
- 关闭主窗口后继续驻留系统托盘

## 内部状态说明

虽然界面不再显示模块和扩展，但底层仍保留这些字段，方便后续继续接 AI：

- `currentTargetId`
- `currentTargetName`
- `currentTargetIsStage`
- `currentTargetPrograms`
- `toolboxCategories`
- `loadedExtensions`
- `usedExtensions`
- `programAreaModules`

其中：

- `currentTargetName + currentTargetPrograms` 是当前最重要的上层输入
- `currentTargetPrograms` 不是桥接脚本直接回传的字符串，而是桌面端根据 `projectData` 和当前角色做二次推导得到的

## DeepSeek 配置

当前这版不依赖 `apps/server`，而是直接由桌面端请求 DeepSeek。
调用方式对齐官方文档：`POST https://api.deepseek.com/chat/completions`。

打包前请先填写：

- `apps/desktop-companion/src/deepseek.config.json`

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

- 只要把 `apiKey` 改成你自己的 DeepSeek Key，再执行打包命令即可。
- 当前默认模型是 DeepSeek 官方 V4 模型 `deepseek-v4-flash`；如果你更关注质量，也可以改成 `deepseek-v4-pro`。
- 桌面端当前显式使用 JSON Output，并把 `thinking` 设为 `disabled`，这样更适合当前 Scratch 教练提示这种低延迟、稳定 JSON 返回的场景。
- 如果不填 key，界面里的 `生成 AI 提示` 仍可用，但会自动走本地 fallback 提示，而不是线上 DeepSeek。
- 程序现在通过单独的 `DeepSeek 设置` 窗口保存 `自定义 DeepSeek API Key`。优先级是：`设置窗口保存的 Key > 环境变量 DEEPSEEK_API_KEY > 程序自带 deepseek.config.json`。
- 清除设置窗口里保存的 Key 后，会按 `DEEPSEEK_API_KEY > deepseek.config.json` 的顺序继续回退。
- DeepSeek 官方文档入口：<https://api-docs.deepseek.com/zh-cn/>

## 2026-04-29 已验证结果

本地真实 Windows 联调已验证通过：

- 能自动识别 `C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe`
- 能解析桌面快捷方式 `Scratch 3.lnk`
- 能受控启动 Scratch 并连上 CDP
- 能在首次连接时自动重试注入桥接脚本
- 能读取 `当前角色`
- 能推导 `当前角色程序`
- 能显示 `当前已用模块`
- 能生成桌面端 AI 提示，并在无 key 时回退到本地提示
- 能打开本地 `.sb3` 并抓取项目信息
- Electron UI 自动化已覆盖新窗口标题和新界面结构
- `npm run package:win:single` 已在当前工作区成功生成可执行目录包和便携包
- `npm run package:win:installer` 已在当前工作区成功生成 NSIS 安装包，并自动复制一份到仓库根目录

## 本地开发命令

在 `apps/desktop-companion` 目录执行：

```powershell
npm run icons:generate
npm run build
npm test
npm run test:windows-ui
npm run dev
npm run package:win
npm run package:win:single
npm run package:win:installer
```

## 从现成 `.sb3` 生成教学草稿

如果老师先给你一个 Scratch 项目文件，希望你先整理成可编辑的教学 `brief`，从仓库根目录执行：

```powershell
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3"
```

如果已经配置好 DeepSeek Key，还可以继续直接接完整教学工作流：

```powershell
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3" --run-workflow
```

这个入口会先生成 `project-summary.json` 和 `brief-draft.json`，再由老师人工确认题目、学生层级、胜负条件和教学目标。

## 真实 Scratch 联调命令

从仓库根目录执行：

```powershell
node Windows-Test\verify-scratch-local.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --launch-debug --test-cdp-eval --kill-on-exit --timeout-ms=12000 --expression="window.location.href"
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --injection-attempts=5 --injection-settle-ms=6000
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --post-action-payload-timeout-ms=20000 --post-action-settle-ms=1200 --injection-attempts=5 --injection-settle-ms=6000 --scenario=cat-motion
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --load-project-file="C:\Users\Administrator\Desktop\Scratch作品.sb3"
node Windows-Test\verify-desktop-companion-ui.mjs
node Windows-Test\verify-desktop-companion-ui.mjs --packaged-app --electron-exe="C:\Users\Administrator\Desktop\scratch\apps\desktop-companion\release-single\win-unpacked\ScratchDesktopCompanion.exe"
node Windows-Test\verify-desktop-companion-real-e2e.mjs
```

## 当前交付物

当前这轮实际生成并验证过的产物是：

- `../../ScratchDesktopCompanion-setup.exe`
- `release-installer/ScratchDesktopCompanion-setup.exe`
- `apps/desktop-companion/release-single/win-unpacked/ScratchDesktopCompanion.exe`
- `apps/desktop-companion/release-single/ScratchDesktopCompanion-portable.exe`

说明：

- `npm run icons:generate` 会根据当前图标源文件刷新 `src/assets/*.png` 和 `buildResources/ScratchDesktop.ico`
- 根目录 `../../ScratchDesktopCompanion-setup.exe` 是对外分发时优先使用的最新安装包入口
- `release-installer/` 保留安装包原始输出和 blockmap
- `win-unpacked` 是当前最稳的交付形态
- `portable.exe` 启动速度通常慢于 `win-unpacked`
- `Windows-Test` 目录现在不再保留历史 exe 副本

## 自动化测试覆盖

当前已覆盖：

- `packages/shared` 单元测试
- `apps/desktop-companion` 单元测试
- Electron UI 自动化
- 打包后 `win-unpacked` UI 自动化
- 真实 Windows + Scratch bridge 联调
- 真实 `.sb3` 读取验证
- 打包版真实端到端 E2E

UI 自动化当前重点断言：

- 软件窗口能正常打开
- `选择 Scratch`、`打开 Scratch`、`重新连接` 3 个按钮都能点击
- `DeepSeek 设置` 按钮能打开独立设置窗口
- 页面能显示 `当前角色`
- 页面能显示 `当前角色程序`

## 日志位置

当前优先查看：

```text
C:\Users\<当前用户名>\AppData\Roaming\@scratch-ai\desktop-companion\desktop-companion.log
```

兼容旧版本时，也可以顺手检查：

```text
C:\Users\<当前用户名>\AppData\Roaming\scratch-desktop-companion\desktop-companion.log
```

## 当前限制

- 只支持 Windows
- 当前主路线仍然是“受控启动 Scratch + CDP 注入”，不是“用户手工打开 Scratch 后再附着”
- 界面不再展示模块和扩展，但这些字段仍作为兼容状态保留
- `verify-scratch-local.mjs` 更适合做 CDP 冒烟检查，不是最终产品验收结论

## 文档入口

- [根工作区总览](../../README.md)
- [开发交接文档](DEVELOPMENT_STATUS.zh-CN.md)
- [部署与排查 SOP](SOP.zh-CN.md)
- [Windows 测试说明](../../Windows-Test/README.zh-CN.md)
- [DeepSeek 教学工作流说明](../../Windows-Test/deepseek-workflow/README.zh-CN.md)
