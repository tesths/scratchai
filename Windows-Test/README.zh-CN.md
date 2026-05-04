# Windows 测试说明

这个目录存放当前这轮 Windows 真机测试、回归验证和现场排查所需的脚本与说明。

## 当前产品流程

当前已经对齐并验证的主流程是：

1. 打开伴随程序，自动识别是否已安装 Scratch。
2. 如果没有自动识别到路径，手动选择 `Scratch.exe` 或 `Scratch 3.exe`；如果之前已经选过，就继续使用上次保存的路径。
3. 从伴随程序里点击 `打开已选 Scratch`，由伴随程序受控启动并建立连接。
4. 在首页 `教师 sb3 地址` 输入框里粘贴教师参考作品地址。
5. 连接成功后，界面实时显示：
   - `当前角色`
   - `当前角色程序`
   - `AI 当前一步提示`

界面重点已经不是“模块 / 扩展面板”，而是“Scratch 软件 + 教师参考作品 + AI 当前一步提示”。

## 当前交付物口径

截至 2026-04-28，当前最新且已验证通过的交付物以这里为准：

- `installers/ScratchDesktopCompanion-setup.exe`
- `installers/ScratchDesktopCompanion-portable.exe`
- `installers/ScratchDesktopCompanion-with-key-setup.exe`
- `installers/ScratchDesktopCompanion-with-key-portable.exe`
- `installers/SHA256SUMS.txt`
- `installers/RELEASE-NOTES.md`
- `apps/desktop-companion/release-installer/ScratchDesktopCompanion-setup.exe`
- `apps/desktop-companion/release-single/win-unpacked/ScratchDesktopCompanion.exe`
- `apps/desktop-companion/release-single/ScratchDesktopCompanion-portable.exe`

`Windows-Test` 现在不再保留历史 `portable.exe` / `setup.exe` 副本；最新分发入口统一看仓库根目录 `installers/`。如果要验证“已内置 DeepSeek 配置”的安装包或便携包，优先使用 `installers/ScratchDesktopCompanion-with-key-setup.exe` 和 `installers/ScratchDesktopCompanion-with-key-portable.exe`；源产物回到 `apps/desktop-companion/release-installer/` 和 `apps/desktop-companion/release-single/` 查找。分发或验收前可对照 `installers/SHA256SUMS.txt` 做校验，并查看 `installers/RELEASE-NOTES.md` 确认交付批次。

## 目录内容

- `verify-scratch-local.mjs`
  - 验证 `Scratch 3.exe --remote-debugging-port=<port>` 和 `/json/list`
- `verify-scratch-bridge.mjs`
  - 验证桥接脚本是否能回传 Scratch 当前状态
  - 支持空白项目、动态场景、`cat-motion` 场景和本地 `.sb3` 文件加载
- `verify-desktop-companion-ui.mjs`
  - 验证源码版或打包版 Electron 主窗口、设置窗口、按钮和界面状态
- `verify-desktop-companion-real-e2e.mjs`
  - 验证打包版真实链路
  - 覆盖自动识别路径、受控启动 Scratch、连接建立、真实 `.sb3` 加载、角色与程序显示、`重新连接`
- `run-deepseek-teaching-workflow.mjs`
  - 运行 DeepSeek Scratch 教学工作流
  - 输出规划、分角色脚本、学生提示和课堂排错包
- `generate-teaching-brief-from-sb3.mjs`
  - 从任意本地 `.sb3` 提取项目摘要并生成可编辑的教学 `brief` 草稿
  - 可选继续接到现有 DeepSeek 教学工作流
- `deepseek-workflow/`
  - 教学工作流提示词模板、本地校验器和说明文档
- `run-scratch-regression.ps1`
  - 批量执行 Scratch bridge 场景回归
- `artifacts/`
  - 保留需要回看的命名验证结果
- `tmp-*`
  - 本地回归运行时目录和缓存
  - 复跑前后都可以清理
- `last-sb3-capture.json`
  - 最近一次本地 `.sb3` 读取结果
- `fixtures/desktop-companion-mock-state.json`
  - UI 自动化使用的模拟状态

## 2026-04-28 已自动化验证通过

- `apps/desktop-companion` 单测 `13/13`
- 源码版 UI 自动化
- 打包版 `win-unpacked` UI 自动化
- 独立 `DeepSeek 设置` 窗口自动化
- Scratch 本机 CDP 连通性验证
- Scratch bridge 基线验证
- Scratch bridge `cat-motion` 动态场景验证
- 真实 `.sb3` 文件加载验证
- 打包版真实端到端 E2E

打包版真实 E2E 当前已经验证：

- 首屏能进入 `请从伴随程序打开已选 Scratch`
- 点击 `打开已选 Scratch` 后能自动启动 Scratch
- 状态能进入 `已连接到 Scratch Desktop`
- 真实项目加载后能显示 `当前角色 = 角色1`
- 真实项目加载后能显示 `当前角色程序 = 脚本 1: event_whenflagclicked -> control_forever`
- 点击 `重新连接` 后界面仍能恢复到已连接状态

## 常用命令

从仓库根目录执行。

### 快速单项验证

```powershell
node Windows-Test\verify-scratch-local.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --launch-debug --test-cdp-eval --kill-on-exit --timeout-ms=12000 --expression="window.location.href"
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --injection-attempts=5 --injection-settle-ms=6000
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --post-action-payload-timeout-ms=20000 --post-action-settle-ms=1200 --injection-attempts=5 --injection-settle-ms=6000 --scenario=cat-motion
node Windows-Test\verify-scratch-bridge.mjs --exe="C:\Users\Administrator\AppData\Local\Programs\Scratch 3\Scratch 3.exe" --kill-on-exit --timeout-ms=20000 --payload-timeout-ms=30000 --load-project-file="C:\Users\Administrator\Desktop\Scratch作品.sb3"
node Windows-Test\verify-desktop-companion-ui.mjs
node Windows-Test\verify-desktop-companion-ui.mjs --packaged-app --electron-exe="C:\Users\Administrator\Desktop\scratch\apps\desktop-companion\release-single\win-unpacked\ScratchDesktopCompanion.exe"
node Windows-Test\verify-desktop-companion-real-e2e.mjs
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3"
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3" --run-workflow
node Windows-Test\run-deepseek-teaching-workflow.mjs
```

### 从任意 `.sb3` 起步生成教学草稿

如果你手上只有一个 Scratch 项目文件，还没有整理好的 brief，可以先执行：

```powershell
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3"
```

默认会在 `Windows-Test\generated\<项目名>\` 下生成：

- `project-summary.json`
- `brief-draft.json`
- `README.md`

如果环境里已经有可用的 DeepSeek Key，也可以继续直接跑完整教学工作流：

```powershell
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\Users\Administrator\Desktop\Scratch作品.sb3" --run-workflow
```

### 完整回归顺序

建议每次改动启动、连接、角色解析或 UI 后，按这个顺序回归：

1. `cd apps\desktop-companion && npm test`
2. `node Windows-Test\verify-desktop-companion-ui.mjs`
3. `node Windows-Test\verify-desktop-companion-ui.mjs --packaged-app --electron-exe="...\\ScratchDesktopCompanion.exe"`
4. `node Windows-Test\verify-scratch-local.mjs ...`
5. `node Windows-Test\verify-scratch-bridge.mjs ...`
6. `node Windows-Test\verify-scratch-bridge.mjs --scenario=cat-motion ...`
7. `node Windows-Test\verify-scratch-bridge.mjs --load-project-file="...sb3" ...`
8. `node Windows-Test\verify-desktop-companion-real-e2e.mjs`

### 回归前清理残留进程

```powershell
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'Scratch*' -or $_.ProcessName -like '*Companion*' -or $_.ProcessName -eq 'electron' } | Stop-Process -Force -ErrorAction SilentlyContinue
```

## 手工验收建议

如果你是人工验收，建议按下面顺序：

1. 运行 `apps/desktop-companion/release-single/win-unpacked/ScratchDesktopCompanion.exe`。
2. 确认窗口能正常打开。
3. 观察是否自动识别到 Scratch 路径。
4. 如果没有识别到，点击 `选择 Scratch 软件` 并手动选中真实 exe。
5. 点击 `打开已选 Scratch`。
6. 观察页面顶部状态是否变成 `已连接到 Scratch Desktop`。
7. 检查 `当前角色` 是否正确。
8. 检查 `当前角色程序` 是否能列出脚本序列。
9. 在 Scratch 中切换角色，确认界面会刷新。
10. 点击 `重新连接`，确认状态能恢复。

## 维护注意事项

### `verify-scratch-local.mjs` 的定位

这个脚本主要是 CDP 冒烟检查。

如果出现下面这种情况：

- `/json/list` 里的 `preferredTarget.url` 已经是 Scratch 编辑页
- 但 `Runtime.evaluate("window.location.href")` 返回了 `about:blank`

不要单独把它当成产品故障。当前以 `verify-scratch-bridge.mjs` 和 `verify-desktop-companion-real-e2e.mjs` 的结果为准，因为它们更贴近真实桥接链路。

### 日志位置

当前优先查看：

```text
C:\Users\<当前用户名>\AppData\Roaming\@scratch-ai\desktop-companion\desktop-companion.log
```

兼容旧版本时，也可以顺手检查：

```text
C:\Users\<当前用户名>\AppData\Roaming\scratch-desktop-companion\desktop-companion.log
```

### 现场回传信息最少要带

- 你测试的是源码版、`win-unpacked` 还是 `portable.exe`
- 窗口顶部状态文案
- `当前角色`
- `当前角色程序`
- 最后 30 到 50 行日志

## 2026-05-03 补充：教师参考作品 URL 功能与截图测试

本轮新增了一个专门覆盖“教师参考作品地址 -> 远程项目加载 -> AI 提示”链路的 UI 自动化脚本：

```powershell
node Windows-Test\verify-desktop-companion-project-url-ui.mjs
```

脚本行为：

- 启动桌面伴随程序
- 填入远程 `.sb3` 地址
- 选择课堂模式
- 点击 `读取 sb3，生成跟做步骤`
- 断言页面最终能显示 `当前角色`、`当前角色程序` 和 AI 提示
- 保存前后两张截图

截图输出：

- `C:\Users\Administrator\Desktop\scratch\docs\assets\screenshots\current-ui-project-url-before.png`
- `C:\Users\Administrator\Desktop\scratch\docs\assets\screenshots\current-ui-project-url-after.png`

建议补一轮人工点检：
- 在 `教师 sb3 地址` 输入框里点一次鼠标右键，确认能看到复制、粘贴、全选菜单

已有脚本 `verify-desktop-companion-ui.mjs` 也补充了两个断言：

- 页面存在 `教师 sb3 地址` 输入框
- 页面存在 `读取 sb3，生成跟做步骤` 按钮

它会额外保存一张静态界面截图：

- `C:\Users\Administrator\Desktop\scratch\docs\assets\screenshots\current-ui-desktop-companion-mock.png`

建议回归顺序：

1. `cd apps\desktop-companion && npm test`
2. `node Windows-Test\verify-desktop-companion-ui.mjs`
3. `node Windows-Test\verify-desktop-companion-project-url-ui.mjs`

注意：

- 这三步不要并行跑
- 并行执行时，`dist` 目录构建和 Electron 单实例容易互相抢占，导致 `EBUSY` 或 WebSocket 连接失败
