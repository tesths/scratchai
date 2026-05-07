# Scratch AI Coach 主工程架构说明

本文只描述当前主线里真正维护的工程：

- `apps/server-api`
- `apps/server-web`
- `apps/desktop-companion`
- `packages/shared`
- `tools/verification`

如果要单独看服务器端，优先阅读 [`./server-development.zh-CN.md`](./server-development.zh-CN.md)。

## 1. 工作区边界

当前仓库是混合语言 monorepo：

- `apps/server-web`、`apps/desktop-companion`、`packages/shared`、`tools/verification` 继续走 npm workspace
- `apps/server-api` 作为独立 Python 工程并行维护

主线目标有两条：

1. 持续维护 Windows + macOS 的 `Scratch AI 教练桌面工具`
2. 启动面向课堂的服务器端教学工作流，并保持仓库可 clone、安装、测试和联调

当前产品形态变为 **桌面端本地基础版 + 服务器端教学版并行维护**。

## 2. 组件职责

### `apps/desktop-companion`

Electron 桌面工具，源码拆成三层：

- `src/main`
  主进程、Scratch 受控启动、CDP 注入、AI 请求、状态存储
- `src/renderer`
  主窗口、设置窗口、preload 和静态页面
- `src/common`
  主进程与渲染层共享类型和轻量契约

当前能力：

- 探测 Windows 与 macOS 常见 Scratch 安装位置
- 受控启动 Scratch Desktop 并附带 `--remote-debugging-port`
- 向 Scratch renderer 注入只读桥接脚本
- 读取当前角色、项目数据、脚本序列、模块摘要
- 把 `当前角色程序 / 推荐积木` 渲染成 Scratch 原版只读积木
- 推荐积木链路会先做官方 opcode 白名单归一化，AI 给出未支持或编造的 opcode 时会自动降级到安全、可渲染的官方积木
- 直接调用 DeepSeek 生成“下一步提示”

### `apps/server-api`

Python FastAPI 服务端，负责：

- 老师注册/登录、学生账号登录验证
- 老师创建学生账号与发布 `sb3` 地址
- 保存学生进度与 AI 提示日志
- 聚合教师实时看板数据
- 以服务端 provider 方式调用 AI，向学生客户端返回提示

### `apps/server-web`

Vue 教师后台，负责：

- 老师登录
- 学生账号管理
- `sb3` 发布单管理
- 按发布单轮询查看学生最新进度与 AI 提示

### `packages/shared`

共享领域包，负责：

- 定义桌面端使用的状态 schema
- 把 Scratch 项目 JSON 转成稳定的项目快照
- 汇总当前角色脚本、模块和扩展使用情况

### `tools/verification`

跨平台验证工具包，负责：

- `scripts/`
  真机验证、UI 自动化、打包后回归、从 `.sb3` 生成教学草稿
- `tests/`
  verification 自己的自动化测试
- `fixtures/`
  样例项目和固定测试输入
- `workflows/deepseek-teaching/`
  教学工作流与提示词模板

## 3. 主数据流

当前主线存在两条核心链路。

### 桌面端本地链路

1. Electron 主进程启动 `SessionManager`
2. `SessionManager` 启动本地 bridge server
3. 自动探测 Scratch 可执行文件，必要时允许用户手动选择
4. 桌面工具受控启动 Scratch Desktop
5. 通过 `http://127.0.0.1:<port>/json/list` 找到真实编辑页
6. 通过 CDP 注入只读桥接脚本
7. 桥接脚本回传 `projectData`、当前角色和模块信息
8. `SessionManager` 结合 `@scratch-ai/shared` 生成项目快照和角色脚本文本摘要
9. `SessionManager` 额外把 `projectData` 转成 `currentTargetScriptXmlList`
10. `StateStore` 更新状态，渲染层先生成 workspace 宿主节点
11. `renderScratchWorkspaces(...)` 使用 `scratch-blocks` 把 XML 加载成只读 SVG
12. 用户请求 AI 提示时，桌面端直接调用 DeepSeek 或本地 fallback
13. `CoachService` 会先把 DeepSeek 返回的 `recommendedBlocks` 归一化，超出白名单的 opcode 会自动映射到可渲染的官方积木

### 服务器端教学链路

1. 老师在 `apps/server-web` 登录教师后台
2. 教师后台调用 `apps/server-api` 创建学生账号与项目发布单
3. 发布单保存 `sb3` 地址、目标说明和分配关系
4. 学生客户端使用老师发放的账号密码登录服务端
5. 学生客户端读取发布单，并在创作过程中持续上报当前完成情况
6. 服务端保存最近进度快照，并在请求提示时调用 AI provider
7. AI 返回的提示和推荐动作写入提示日志
8. 教师后台按发布单轮询教师看板接口，展示每个学生最近进度和最近 AI 提示

关键约束：

- 不修改 Scratch 官方源码
- 桌面端运行时只读注入仍是本地版唯一主路线
- 服务器端第一阶段只做“老师 / 学生 / 发布单”三类核心对象
- 服务器端第一阶段实时能力统一采用轮询，不上 WebSocket/SSE

## 4. 原版积木渲染链路

当前 1:1 积木显示不是靠样式模拟，而是靠两层转换：

1. `projectData -> Blockly XML`
2. `Blockly XML -> scratch-blocks readOnly workspace`

对应实现位置：

- `apps/desktop-companion/src/common/scratch-block-xml.ts`
  - 负责顶层脚本排序、`next`、`SUBSTACK / SUBSTACK2`、shadow input、变量/列表/广播字段，以及推荐积木白名单和默认模板
- `apps/desktop-companion/src/renderer/scratch-workspace-renderer.ts`
  - 负责初始化 `ScratchBlocks.inject(...)`、`clearWorkspaceAndLoadFromXml(...)`、尺寸自适应和只读动态菜单兜底
  - 当前只读 workspace 统一使用本地 `scratch-blocks/media`，缩放比例也已下调得更紧凑
- `apps/desktop-companion/build.mjs`
  - 负责复制 `scratch-blocks/media`

## 5. 当前风险点

- 真机验证脚本虽然已跨平台收口，但仍有部分现场运维流程只写了 Windows 口径
- macOS 正式签名、公证和发版还没有自动化
- CI 负责双平台正式产物；本地只承诺当前平台可出包
- `tools/verification/artifacts/` 不再进 git，需要通过文档和 CI artifact 回看验证结果
- 推荐积木白名单外的新 opcode，先扩 `src/common/scratch-block-xml.ts` 的默认模板，再决定是否放行到 AI 输出
- 新出现的扩展块、动态菜单块或特殊 mutation，可能还需要在只读渲染层补兜底定义
- Python 服务端与现有 JS 共享逻辑存在跨语言边界，第一阶段先以独立领域层实现为主
- 服务器端当前用 SQLite 起步，后续若转线上部署还要补迁移和更完整的运维策略
