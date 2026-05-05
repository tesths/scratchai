# Scratch AI Coach 主工程架构说明

本文只描述当前主线里真正维护的工程：

- `apps/desktop-companion`
- `packages/shared`
- `tools/verification`

## 1. 工作区边界

当前仓库已经整理成标准 npm workspace，`apps/server` 已移出主线，不再保留空壳目录。

主线目标只有两个：

1. 持续维护 Windows + macOS 桌面伴随程序
2. 保持一套可在新电脑直接 clone、安装、测试和本机出包的验证型工作区

## 2. 组件职责

### `apps/desktop-companion`

Electron 桌面伴随程序，源码拆成三层：

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
- 读取当前角色、脚本序列、模块摘要
- 直接调用 DeepSeek 生成“下一步提示”

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

当前最重要的主链路全部发生在桌面端内部：

1. Electron 主进程启动 `SessionManager`
2. `SessionManager` 启动本地 bridge server
3. 自动探测 Scratch 可执行文件，必要时允许用户手动选择
4. 伴随程序受控启动 Scratch Desktop
5. 通过 `http://127.0.0.1:<port>/json/list` 找到真实编辑页
6. 通过 CDP 注入只读桥接脚本
7. 桥接脚本回传 `projectData`、当前角色和模块信息
8. `SessionManager` 结合 `@scratch-ai/shared` 生成项目快照和角色脚本
9. `StateStore` 更新状态，渲染层刷新 UI
10. 用户请求 AI 提示时，桌面端直接调用 DeepSeek 或本地 fallback

关键约束：

- 不修改 Scratch 官方源码
- 运行时只读注入是当前唯一主路线
- 当前不支持“附着到用户手工启动的 Scratch”

## 4. 当前风险点

- 真机验证脚本虽然已跨平台收口，但仍有部分现场运维流程只写了 Windows 口径
- macOS 正式签名、公证和发版还没有自动化
- CI 负责双平台正式产物；本地只承诺当前平台可出包
- `tools/verification/artifacts/` 不再进 git，需要通过文档和 CI artifact 回看验证结果
