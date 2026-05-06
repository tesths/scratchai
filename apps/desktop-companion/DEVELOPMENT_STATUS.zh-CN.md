# Scratch Desktop Companion 开发交接文档

最后更新：2026-05-06

这份文档给下一位继续维护 `apps/desktop-companion` 的人看。

## 1. 当前结论

当前主线已经明确收敛为 **本地基础版**：

- 只支持 Windows + macOS
- 只做本机 `Scratch Desktop` 连接与 AI 辅助提示
- 只看学生当前作品，不再走教师参考作品 / 远程 `sb3` / 课堂流
- DeepSeek 配置入口收敛为独立设置窗口里的 `API Key + 模型选择`

也就是说，当前桌面伴随程序的主交付是：

1. 打开软件后自动识别 Scratch。
2. 没识别到时允许手动选择路径。
3. 通过伴随程序启动 Scratch 并建立连接。
4. 实时显示当前角色和当前角色程序。
5. 基于当前作品生成 AI 下一步提示。

## 2. 这轮收敛完成了什么

### 产品收敛

- 移除了 `教师 sb3 地址` 输入和参考作品导入链路
- 移除了“跟老师做 / 自己先做”模式切换
- AI 提示现在只消费当前学生作品上下文
- 主界面改为更像桌面工具的布局，不再是网页式教学流程页

### 界面与配置

- 主窗口只保留：
  - Scratch 连接状态
  - 已选 Scratch 路径
  - 当前角色
  - 同步时间
  - 当前角色程序
  - AI 当前提示
  - 关键操作按钮
- `DeepSeek 设置` 页现在只保留本地 `API Key` 和 `Flash / Pro 模型选择`
- 主窗口与设置窗口都保留右键菜单支持

### 测试与验证

- 桌面端单测已覆盖本地版新文案和新状态流
- `verify-desktop-companion-ui.mjs` 已同步为本地版界面结构
- macOS 源码版 UI 冒烟已确认能读取 mock state
- 真实联调时不要带 `DESKTOP_COMPANION_MOCK_STATE_FILE`、`DESKTOP_COMPANION_AUTOMATION_ACTIONS`、`DESKTOP_COMPANION_AUTOMATION_SCRATCH_PATH`；这些只给自动化和纯界面演示用，带上后主窗口会显示 mock 路径，且路径选择不会写回真实会话

## 3. 当前已完成能力

截至 2026-05-06，已完成：

- Electron 桌面伴随程序主链路
- Windows + macOS 平台口径
- 本地 bridge server
- Scratch 可执行文件路径保存
- `.lnk` 桌面快捷方式解析
- 常见安装目录自动探测
- `Scratch.app` / `Scratch Desktop.app` 自动探测
- 受控启动 Scratch Desktop
- CDP `Runtime.evaluate` 注入桥接脚本
- 首次连接失败后的自动重试注入
- 托盘驻留
- 运行日志
- 单元测试
- Electron UI 自动化
- 打包后 `win-unpacked` UI 自动化
- 打包后 macOS `.app` UI 冒烟
- 打包版真实端到端 E2E
- 本地 `.sb3` 读取验证
- 便携版 `portable.exe` 打包
- NSIS 安装包 `ScratchDesktopCompanion-setup.exe` 打包
- macOS `.app` / `.dmg` 内测包打包

## 4. 当前界面和状态口径

### 界面主显示

当前主窗口重点显示：

- `已选 Scratch`
- `当前角色`
- `当前角色程序`
- `AI 下一步提示`

示例输出：

```text
脚本 1: event_whenflagclicked -> control_forever -> motion_movesteps -> pen_clear
```

补充：

- `当前角色程序` 现在会继续展开 `重复执行 / 一直重复 / 如果` 这类控制积木里的嵌套子堆栈，不再只读取顶层 `next` 链。

### 当前常见状态文案

- `请先选择 Scratch 软件`
- `请从伴随程序打开已选 Scratch`
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
- 上层 AI 当前优先直接消费 `currentTargetName + currentTargetPrograms`

## 5. 当前关键实现文件

最重要的几个文件：

- `src/main/platform-adapter.ts`
  - 平台适配、路径选择、默认目录、自动探测
- `src/main/session-manager.ts`
  - 启动、重试注入、bridge payload 收敛、状态更新、AI 触发
- `src/main/coach-service.ts`
  - 当前作品上下文整理、DeepSeek 请求与 fallback 提示
- `src/main/scratch-executable-finder.ts`
  - Windows 路径探测、快捷方式解析、候选去重
- `src/main/bridge-script.ts`
  - 注入到 Scratch renderer 的只读脚本
- `src/renderer/renderer-view.ts`
  - 把状态渲染成“角色 + 程序 + AI 提示”视图
- `src/renderer/renderer.ts`
  - 绑定主窗口 DOM 与 preload API
- `src/renderer/settings-renderer.ts`
  - 绑定独立设置窗口 DOM 与 preload API

## 6. 当前测试覆盖

### 单元测试

- `packages/shared`
- `apps/desktop-companion`

### UI 自动化

`tools/verification/scripts/verify-desktop-companion-ui.mjs` 当前会验证：

- 窗口可打开
- 标题为 `Scratch AI 教练`
- `已选 Scratch` 正常显示
- `当前角色` 正常显示
- `当前角色程序` 正常显示
- `选择 Scratch 软件`
- `打开已选 Scratch`
- `重新连接`
- `DeepSeek 设置` 独立窗口

### 真实 Scratch 联调

`tools/verification/scripts/verify-scratch-bridge.mjs` 当前已支持：

- 空白项目
- `cat-motion`
- 本地 `.sb3` 文件加载
- 扩展加载 / 使用场景

### 打包版真实 E2E

`tools/verification/scripts/verify-desktop-companion-real-e2e.mjs` 当前已验证：

- 打包版 Companion 启动
- 自动读取已配置 Scratch 路径
- Companion 受控启动 Scratch
- 连接建立
- 真实 `.sb3` 加载
- `当前角色` 更新
- `当前角色程序` 更新
- `重新连接` 后状态恢复

## 7. 当前常用命令

桌面伴随程序目录：

```powershell
cd apps\desktop-companion
npm run icons:generate
npm run build
npm test
npm run test:desktop-ui
npm run test:windows-ui
npm run package:win:single
npm run package:win:installer
npm run package:mac:app
npm run package:mac:dmg
```

仓库根目录：

```powershell
node tools/verification\scripts\verify-scratch-local.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --launch-debug --test-cdp-eval --kill-on-exit --timeout-ms=12000 --expression="window.location.href"
node tools/verification\scripts\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --injection-attempts=5 --injection-settle-ms=6000
node tools/verification\scripts\verify-desktop-companion-ui.mjs
node tools/verification\scripts\verify-desktop-companion-real-e2e.mjs
```

## 8. 已知注意事项

- `verify-deepseek-live-seq.mjs` 这类依赖真实线上模型的脚本仍需要可用的 DeepSeek Key
- 真实 Scratch 联调深度目前仍以 Windows 为主
- macOS 现在更接近“开发可用 + UI 冒烟可用 + 内测包可出”
- 当前主路线仍然是“受控启动 Scratch + CDP 注入”，不是“用户手工打开 Scratch 后再附着”
