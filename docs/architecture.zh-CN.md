# Scratch AI Coach 主工程架构说明

本文只描述当前工作区里真正维护的主工程部分：

- `apps/desktop-companion`
- `packages/shared`
- `apps/server`

## 1. 工作区边界

当前工作区不是一个已经整理好的单一 monorepo。

要注意两个现实：

1. 根目录只保留最小 workspace 入口，不再混入上游 Scratch clone
2. 真正持续维护和已完成 Windows 联调的，是 `apps/desktop-companion` 和 `packages/shared`

如果后续调研或排查需要参考上游 Scratch 仓库，可以再单独 clone 到工作区中临时查看；但它们不应默认作为当前主工程的一部分长期保留。

当前源码快照里：

- `apps/desktop-companion/src` 已补回并在维护
- `packages/shared/src` 已补回并在维护
- `apps/server/src` 仍未补齐

所以这份架构文档描述的是“当前已验证的桌面链路”和“未来服务端接入的契约基础”。

## 2. 组件职责

### `apps/desktop-companion`

Windows + macOS Electron 桌面伴随程序。

职责：

- 探测 `Scratch.exe`、`Scratch 3.exe` 或桌面快捷方式 `.lnk`
- 在 macOS 上探测 `Scratch.app`、`Scratch Desktop.app` 及其 app bundle 可执行文件
- 以受控方式启动 Scratch Desktop
- 通过 Chrome DevTools Protocol 向 Scratch renderer 注入只读桥接脚本
- 接收 Scratch 回传状态
- 在本地窗口中显示 `当前角色`、`当前角色程序` 和 `当前已用模块`
- 直接调用 DeepSeek API，给出下一步开发提示

### `packages/shared`

共享领域契约和项目解析层。

职责：

- 定义桌面伴随程序状态 schema
- 定义服务端请求 / 响应 schema
- 把 Scratch 项目 JSON 转成更稳定的项目快照
- 识别项目已使用扩展
- 汇总当前角色程序区域模块

### `apps/server`

服务端包仍在架构范围内，但当前工作区源码不完整。

它的定位仍然是：

- 接收项目快照
- 返回分析结果
- 返回教练式对话
- 记录会话事件

但截至 2026-04-28，它还不是当前已完成联调的主线。

## 3. 桌面链路数据流

当前最重要、也已经跑通的链路，完全发生在 `apps/desktop-companion` 内部。

顺序如下：

1. Electron 主进程启动 `SessionManager`
2. `SessionManager` 启动本地 bridge server
3. 程序自动探测 Scratch 可执行文件，必要时允许用户手动选择
4. 伴随程序用 `--remote-debugging-port=<port>` 受控启动 Scratch Desktop
5. 通过 `http://127.0.0.1:<port>/json/list` 找到真实编辑页 target
6. 通过 CDP `Runtime.evaluate` 注入只读桥接脚本
7. 桥接脚本在 Scratch renderer 中读取 `vm`、`projectData`、当前编辑角色、工具箱与扩展信息
8. 桥接脚本把状态 `POST` 回本地 `/api/scratch-state`
9. `SessionManager` 解析 payload，更新 `StateStore`
10. 渲染层把状态显示到 Electron 窗口
11. 用户点击 `生成 AI 提示` 后，桌面端读取最近一次项目快照并直接调用 DeepSeek

这里最关键的一点是：

- 我们没有改 Scratch 官方源码
- 当前方案依赖运行时只读注入

## 4. 当前状态模型

### 界面主显示字段

这版界面只突出两组数据：

- `currentTargetName`
- `currentTargetPrograms`
- `programAreaModules`
- `aiCoachResponse`

其中：

- `currentTargetName` 表示当前编辑角色
- `currentTargetPrograms` 表示当前角色的脚本序列列表

示例：

```text
脚本 1: event_whenflagclicked -> control_forever -> motion_movesteps -> pen_clear
```

### 兼容保留字段

虽然界面不再显示模块和扩展，但状态契约仍保留：

- `currentTargetId`
- `currentTargetIsStage`
- `toolboxCategories`
- `loadedExtensions`
- `usedExtensions`
- `programAreaModules`

保留这些字段的原因是：

- 后续接 AI 时可能仍需要更细的上下文
- 现有桥接测试和共享解析逻辑已经依赖它们
- 兼容已有自动化和未来扩展成本更低

另外，桌面状态里现在还新增了：

- `aiConfigured`
- `aiStatus`
- `aiProvider`
- `aiModel`
- `aiCoachResponse`
- `aiLastUpdatedAt`

## 5. `currentTargetPrograms` 的来源

`currentTargetPrograms` 不是桥接脚本直接拼好再传回来的。

当前实现是：

1. 桥接脚本回传 `projectData`
2. 桌面端在 `session-manager.ts` 中调用 `projectJsonToSnapshot`
3. 再结合 `currentTargetId` / `currentTargetName`
4. 找到当前角色对应的脚本
5. 生成 `opcode -> opcode -> opcode` 形式的程序序列

这样做的好处是：

- 桥接 payload 保持接近 Scratch 原始信息
- 程序提取逻辑可以复用 `packages/shared`
- 后续如果要把这套结构直接送给 AI，更容易统一契约

## 6. `packages/shared` 的系统位置

`packages/shared` 是当前最接近“领域契约层”的部分。

它同时服务两类场景：

- 桌面端：把 `projectData` 转换成角色程序、模块统计、扩展使用信息
- 服务端：校验请求响应并承接未来 AI 分析输入

当前已确认的关键导出包括：

- `projectJsonToSnapshot`
- `summarizeProgramAreaModulesFromProject`
- `getUsedExtensionsFromProject`
- 各类 Zod schema

桌面端当前直接依赖这些导出，把 Scratch 状态整理成适合给 DeepSeek 的项目快照，而不是先绕到当前缺失源码的 `apps/server`。

## 7. 当前已验证能力

截至 2026-05-05：

Windows 真实环境已验证：

- 能解析桌面 `Scratch 3.lnk`
- 能受控启动 `Scratch 3.exe`
- 能连接 `/json/list`
- 能在 target `title` 为空时仍定位真实编辑页
- 能读取 `currentTargetName`
- 能推导 `currentTargetPrograms`
- 能读取并保留模块与扩展状态
- 能根据项目快照生成 DeepSeek / 本地 fallback AI 提示
- 能打开本地 `.sb3` 并抓取项目信息
- Electron 源码版和打包版都能自动化验证窗口与按钮交互

macOS 当前已补齐：

- 平台适配层
- `Scratch.app` / `Scratch Desktop.app` 自动探测与手动选择
- 受控启动所需的 app bundle 可执行文件解析
- 源码版 UI 自动化入口
- `.app` / `.dmg` 内测打包命令

## 8. 当前边界与风险

- 当前正式真机回归仍以 Windows 为主
- macOS 虽已支持开发、基础测试和打包，但真实 Scratch 回归深度仍低于 Windows
- 当前主路线是“受控启动 Scratch + CDP 注入”，不是“附着到用户手工启动的 Scratch”
- Scratch 没有提供稳定公开 API 直接给外部程序读取这些状态
- `apps/server` 仍不是本轮已完成交付物
- `Windows-Test` 目录中的历史副本产物不应默认视为最新交付

## 9. 当前推荐阅读顺序

1. [根 README](../README.md)
2. [桌面伴随程序说明](../apps/desktop-companion/README.md)
3. [桌面伴随程序开发交接](../apps/desktop-companion/DEVELOPMENT_STATUS.zh-CN.md)
4. [Windows 测试说明](../Windows-Test/README.zh-CN.md)

## 10. 2026-05-03 补充：远程项目 URL 旁路

在原来的“受控启动 Scratch Desktop + CDP 注入”主路线之外，当前又补了一条不依赖本地 Scratch 的分析旁路，专门用于直接读取网页作品地址并生成提示。

顺序如下：

1. 用户在桌面端输入远程项目 URL 和可选教学目标
2. `renderer.ts` 通过 IPC 调用主进程
3. `SessionManager.requestAiHintFromProjectUrl` 接管这条链路
4. `ProjectUrlLoader` 按 URL 类型选择读取方式
5. 如果是 Scratch 项目页或 API，则先取元数据和 `project_token`
6. 如果是直接 `.sb3`，则下载压缩包并解出 `project.json`
7. 复用 `projectJsonToSnapshot`、`summarizeProgramAreaModulesFromProject` 和当前角色脚本提取逻辑
8. 把结果继续送入 `CoachService.generateHint`
9. UI 最终展示当前角色、脚本序列、模块摘要和 AI 提示

这条旁路的边界：

- 只做读取和分析，不会回写远程项目
- 仍然沿用“提示不给答案”的 AI 输出约束
- 对 Scratch 官网项目页的读取依赖远端返回的 `project_token`
