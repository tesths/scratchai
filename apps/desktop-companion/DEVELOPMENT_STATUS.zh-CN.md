# Scratch Desktop Companion 开发交接文档

最后更新：2026-04-30

这份文档给下一位继续维护 `apps/desktop-companion` 的人看。

## 1. 当前结论

这轮最重要的产品收敛已经完成：

- 界面不再以“模块 / 扩展”为主
- 当前主目标是“角色 + 角色对应的程序”
- DeepSeek Key 已从主页面拆到独立设置窗口
- 自动识别路径、受控启动、连接建立、角色程序显示，这 4 段已经在真实 Windows 环境串通

也就是说，当前桌面伴随程序的主交付是：

1. 打开软件后自动识别 Scratch。
2. 没识别到时允许手动选择路径。
3. 通过伴随程序启动 Scratch 并建立连接。
4. 实时显示当前角色和当前角色程序。

## 2. 本轮新增或补齐的内容

这轮补齐了两类东西：稳定性和测试。

### 稳定性

- `src/session-manager.ts`
  - 启动 Scratch 后不再只做一次 CDP 注入
  - 现在会等待 bridge 连接结果，并在必要时自动重试
  - 当前常量：
    - `BRIDGE_CONNECTION_SETTLE_MS = 6000`
    - `MAX_CDP_INJECTION_ATTEMPTS = 5`

这解决的是：Scratch 已启动，但第一次注入没有真正连上 bridge 的不稳定问题。

### 测试

- `build.mjs`
  - 现在会额外产出 `dist/scratch-executable-finder.js`
- `test/session-manager.test.mjs`
  - 补了“未配置 Scratch 路径时进入等待状态”的测试
  - 补了“已配置路径时进入等待状态”的测试
- `test/scratch-executable-finder.test.mjs`
  - 补了常见安装目录候选、直接 exe、`.lnk` 解析、非 Scratch 快捷方式拒绝、去重等测试
- `Windows-Test/verify-desktop-companion-real-e2e.mjs`
  - 已更新到当前 UI 结构
  - 已对齐当前打包版 `userData` 目录定位
  - 已对齐稳定的 CDP `Runtime.evaluate` 参数
  - 已支持真实 `.sb3` 加载后的角色与程序断言

## 3. 当前已完成能力

截至 2026-04-28，已完成并验证：

- Electron 桌面伴随程序主链路
- Windows only 运行模式
- 本地 bridge server
- Scratch 可执行文件路径保存
- `.lnk` 桌面快捷方式解析
- 常见安装目录自动探测
- 受控启动 Scratch Desktop
- CDP `Runtime.evaluate` 注入桥接脚本
- 首次连接失败后的自动重试注入
- 托盘驻留
- 运行日志
- 单元测试
- Electron UI 自动化
- 打包后 `win-unpacked` UI 自动化
- 打包版真实端到端 E2E
- 本地 `.sb3` 读取验证
- 便携版 `portable.exe` 打包
- NSIS 安装包 `ScratchDesktopCompanion-setup.exe` 打包
- 安装包自动复制到仓库根目录
- 图标资产生成与窗口 / 托盘 / 安装包图标统一

## 4. 当前界面和状态口径

### 界面主显示

当前主窗口重点显示：

- `当前角色`
- `当前角色程序`
- `AI 开发提示`

DeepSeek 自定义 Key 不再放在主页面，而是放在独立 `DeepSeek 设置` 窗口。

示例输出：

```text
脚本 1: event_whenflagclicked -> control_forever -> motion_movesteps -> pen_clear
```

### 当前常见状态文案

- `请先选择 Scratch 路径`
- `请从伴随程序启动 Scratch Desktop`
- `已连接到 Scratch Desktop`

### 内部状态

底层状态仍保留这些字段：

- `currentTargetId`
- `currentTargetName`
- `currentTargetIsStage`
- `currentTargetPrograms`
- `toolboxCategories`
- `loadedExtensions`
- `usedExtensions`
- `programAreaModules`

注意：

- 模块和扩展现在是兼容保留字段，不再是 UI 主目标
- 后续如果接 AI，优先直接消费 `currentTargetName + currentTargetPrograms`

## 5. 当前关键实现文件

最重要的几个文件：

- `src/session-manager.ts`
  - 启动、重试注入、bridge payload 收敛、状态更新
- `src/scratch-executable-finder.ts`
  - Scratch 路径探测、快捷方式解析、候选去重
- `src/bridge-script.ts`
  - 注入到 Scratch renderer 的只读脚本
- `src/renderer-view.ts`
  - 把状态渲染成“角色 + 程序 + AI 提示”视图
- `src/renderer.ts`
  - 绑定主窗口 DOM 与 preload API
- `src/settings-renderer.ts`
  - 绑定独立设置窗口 DOM 与 preload API
- `src/main.ts`
  - Electron 主进程、主窗口/设置窗口创建、自动化入口
- `../../packages/shared/src/project-snapshot.js`
  - 根据 `projectData` 推导当前角色程序
- `../../packages/shared/src/schemas.js`
  - 共享状态契约

## 6. 当前测试覆盖

### 单元测试

- `packages/shared`
- `apps/desktop-companion`

### UI 自动化

`Windows-Test/verify-desktop-companion-ui.mjs` 当前会验证：

- 窗口可打开
- 标题为 `Scratch AI 教练`
- `当前角色` 正常显示
- `当前角色程序` 正常显示
- `选择 Scratch`
- `打开 Scratch`
- `重新连接`
- `DeepSeek 设置` 独立窗口

### 真实 Scratch 联调

`Windows-Test/verify-scratch-bridge.mjs` 当前已支持：

- 空白项目
- `cat-motion`
- 本地 `.sb3` 文件加载
- 扩展加载 / 使用场景

### 打包版真实 E2E

`Windows-Test/verify-desktop-companion-real-e2e.mjs` 当前已验证：

- 打包版 Companion 启动
- 自动读取已配置 Scratch 路径
- Companion 受控启动 Scratch
- 连接建立
- 真实 `.sb3` 加载
- `当前角色` 更新
- `当前角色程序` 更新
- `重新连接` 后状态恢复

## 7. 2026-04-28 实际回归结果

本地实跑通过：

- `cd apps\desktop-companion && npm test`
- `node Windows-Test\verify-desktop-companion-ui.mjs`
- `node Windows-Test\verify-desktop-companion-ui.mjs --packaged-app ...`
- `node Windows-Test\verify-scratch-local.mjs ...`
- `node Windows-Test\verify-scratch-bridge.mjs ...`
- `node Windows-Test\verify-scratch-bridge.mjs --scenario=cat-motion ...`
- `node Windows-Test\verify-scratch-bridge.mjs --load-project-file="...sb3" ...`
- `node Windows-Test\verify-desktop-companion-real-e2e.mjs`

真实项目样本结果：

- `当前角色 = 角色1`
- `当前角色程序 = 脚本 1: event_whenflagclicked -> control_forever`

## 8. 当前常用命令

桌面伴随程序目录：

```powershell
cd apps\desktop-companion
npm run icons:generate
npm run build
npm test
npm run test:windows-ui
npm run package:win:single
npm run package:win:installer
```

仓库根目录：

```powershell
node Windows-Test\verify-scratch-local.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --launch-debug --test-cdp-eval --kill-on-exit --timeout-ms=12000 --expression="window.location.href"
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --injection-attempts=5 --injection-settle-ms=6000
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --post-action-payload-timeout-ms=20000 --post-action-settle-ms=1200 --injection-attempts=5 --injection-settle-ms=6000 --scenario=cat-motion
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --load-project-file="C:\Users\Administrator\Desktop\Scratch作品.sb3"
node Windows-Test\verify-desktop-companion-ui.mjs
node Windows-Test\verify-desktop-companion-ui.mjs --packaged-app --electron-exe="C:\Users\Administrator\Desktop\scratch\apps\desktop-companion\release-single\win-unpacked\ScratchDesktopCompanion.exe"
node Windows-Test\verify-desktop-companion-real-e2e.mjs
```

## 9. 已知注意事项

### `verify-scratch-local.mjs`

这个脚本主要是 CDP 冒烟检查。

在当前机器上，存在一种现象：

- `/json/list` 里能找到正确的 Scratch 编辑页
- 但 `Runtime.evaluate("window.location.href")` 偶尔返回 `about:blank`

这不应直接视为产品故障。是否真正可用，以 `verify-scratch-bridge.mjs` 和 `verify-desktop-companion-real-e2e.mjs` 为准。

### 日志目录

当前优先查看：

```text
C:\Users\<当前用户名>\AppData\Roaming\@scratch-ai\desktop-companion\desktop-companion.log
```

兼容旧版本时，也可以检查：

```text
C:\Users\<当前用户名>\AppData\Roaming\scratch-desktop-companion\desktop-companion.log
```

## 10. 如果你下次继续开发

优先从这几个方向继续：

1. 如果改动了启动或连接流程，先看 `src/session-manager.ts`，然后完整复跑 `verify-scratch-bridge.mjs` 和 `verify-desktop-companion-real-e2e.mjs`。
2. 如果改动了路径识别，先看 `src/scratch-executable-finder.ts`，并同步更新 `test/scratch-executable-finder.test.mjs`。
3. 如果改动了界面 DOM 或状态文案，必须同步更新 `verify-desktop-companion-ui.mjs` 和 `verify-desktop-companion-real-e2e.mjs`。
4. 如果改动了程序推导逻辑，先看 `packages/shared/src/project-snapshot.js`，并补回归样本。

不要再从过时的“模块 / 扩展 UI”思路往前扩。当前产品和测试基线都已经围绕“自动识别路径 -> 受控启动 -> 角色与程序显示”对齐。

## 11. 一句话交接

当前这版桌面伴随程序已经把“自动识别 Scratch、受控启动、建立连接、读取当前角色和当前角色程序”这条主链路在真实 Windows 环境跑通；下次继续开发时，直接沿这条链路扩展，不要再把界面目标拉回旧的扩展面板。
