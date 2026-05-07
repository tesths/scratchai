# 项目结构

当前仓库是一个混合语言 monorepo：前端与共享包继续走 npm workspace，服务器 API 作为并行的 Python 工程维护。

## 顶层目录

- `apps/desktop-companion`
  - Electron 桌面端
  - 负责 Scratch 连接、桥接、AI 调用和主界面
- `apps/server-api`
  - Python FastAPI 服务端
  - 负责老师/学生认证、发布单、进度、AI 提示与教师看板接口
- `apps/server-web`
  - Vue 教师后台
  - 负责老师登录、学生管理、发布单管理和实时看板
- `packages/shared`
  - 共享 schema、项目快照和 Scratch 项目解析逻辑
- `tools/verification`
  - 验证脚本、workflow fixtures、回归测试与教学辅助工作流
- `docs`
  - 开源入口文档与工程说明
- `installers`
  - 本地和 CI 的产物收口目录，不纳入 git

## 当前产品边界

- 维护中的产品包括 `Scratch AI 教练` 桌面端本地基础版，以及正在推进的服务器端教学版
- 服务器端当前采用 `Python FastAPI + Vue`
- 桌面端仍可独立工作，服务器端面向课堂教学流程

## 阅读建议

- 第一次访问仓库：先看 [`../README.zh-CN.md`](../README.zh-CN.md)
- 想参与协作：看 [`../CONTRIBUTING.zh-CN.md`](../CONTRIBUTING.zh-CN.md)
- 想理解模块职责：看 [`./architecture.zh-CN.md`](./architecture.zh-CN.md)
- 想看维护约定：看 [`./maintenance.zh-CN.md`](./maintenance.zh-CN.md)
