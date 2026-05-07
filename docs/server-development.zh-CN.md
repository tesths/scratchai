# 服务器端开发说明

本文是 `Scratch AI 教练` 服务器端第一阶段的专属文档，覆盖当前 `FastAPI + Vue` 教学链路的目录、启动方式、主要接口、数据模型和当前边界。

## 1. 当前目标

服务器端当前只做第一阶段最小闭环：

- 老师注册、登录
- 老师创建学生账号
- 老师发布 `sb3` 地址
- 学生账号登录验证
- 学生进度上报
- 服务端生成 AI 提示
- 教师后台实时查看学生最新进度与最新 AI 提示

当前不做：

- 课程 / 班级多层模型
- 学生自助注册
- 文件上传式 `sb3`
- WebSocket / SSE 推送

## 2. 目录结构

- `apps/server-api`
  - Python `FastAPI` 后端
  - 负责认证、发布单、进度、AI 提示、教师看板接口
- `apps/server-web`
  - Vue 3 + Vite 教师后台
  - 负责老师登录、学生管理、发布单管理、实时看板

## 3. 本地启动

先安装根依赖：

```bash
npm ci
```

单独验证：

```bash
npm run server:api:test
npm run server:web:test
```

单独启动后端：

```bash
uv run --project apps/server-api python -m app.main
```

单独启动前端：

```bash
npm run server:web:dev
```

前后端一起启动：

```bash
npm run server:dev
```

## 4. API 约定

教师认证：

- `POST /api/teacher/register`
- `POST /api/teacher/login`

学生端：

- `POST /api/student/login`
- `POST /api/student/releases/{releaseId}/progress`
- `POST /api/student/releases/{releaseId}/hints`

教师后台：

- `GET /api/students`
- `POST /api/students`
- `GET /api/releases`
- `POST /api/releases`
- `GET /api/dashboard/releases/{releaseId}/live`

兼容接口：

- 后端目前也保留了第一版无 `/api` 前缀的内部接口，方便继续演进；新客户端与教师后台统一优先使用 `/api/...`。

## 5. 数据模型

当前 SQLite 主要表：

- `teachers`
- `students`
- `auth_tokens`
- `releases`
- `release_assignments`
- `progress_updates`
- `ai_prompts`

关系收口为：

- 一个老师可以拥有多个学生
- 一个老师可以创建多个发布单
- 一个发布单可以分配多个学生
- 一个学生可以在多个发布单下产生进度和 AI 提示日志

## 6. 前端联调口径

教师后台默认走 mock client，方便页面独立开发。

切换真实后端时使用：

```bash
VITE_SERVER_WEB_API_MODE=real
VITE_SERVER_WEB_API_BASE_URL=http://localhost:8000
```

当前教师后台主要页面：

- `/login`
- `/dashboard`
- `/students`
- `/releases`
- `/releases/:id/live`

## 7. AI 配置

后端默认走本地 fallback provider。

如需切真实上游，可配置：

- `SERVER_API_DB_PATH`
- `AI_PROVIDER`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

当前策略：

- 如果没配 AI 上游，仍然返回可用的基础提示
- 教师看板始终读取已保存的最新进度与最新提示日志

## 8. 当前限制与下一步

当前限制：

- 数据库存储先用 SQLite
- 教师后台的学生列表与发布单列表仍是第一阶段字段
- 实时看板使用轮询，不是推送

下一步建议：

1. 做完全走服务器的学生客户端接入
2. 收口发布单详情与学生“我的任务”读取接口
3. 再决定是否引入课程 / 班级模型
