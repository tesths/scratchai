# Scratch AI Coach Server

这是主工程里的服务端应用，负责提供 Scratch 项目分析和教练对话接口。

它本身不包含前端页面，当前定位是一个独立 HTTP API 服务。

## 作用

它当前提供三类业务能力：

- 项目分析：根据 Scratch 项目快照给出结构化分析
- 教练对话：根据学生问题和项目状态给出下一步建议
- 会话记录：接收侧边栏打开、分析请求、聊天发送等事件

另外还有两个基础检查接口：

- `GET /health`
- `GET /ready`

## 目录关系

当前这份工作区快照里，`apps/server` 目录实际只有：

- `package.json`
- `README.md`
- `tsconfig.json`

也就是说，文档里提到的 `src/`、`test/`、`dist/` 在这份快照里都还不存在。

共享类型和 schema 位于：

- `../../packages/shared`

但当前这份快照里，`packages/shared/src` 也还不存在。

## 环境变量

原始工程里，环境变量定义应以 `src/config.ts` 为准。

但当前这份快照里，`src/config.ts` 并不存在，因此下面这张表应被视为“目标设计说明”，不是可直接点击核对的源码事实。

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3030` | 服务监听端口 |
| `LOG_LEVEL` | `info` | `pino` 日志级别 |
| `OPENAI_MODEL` | `gpt-4.1-mini` | 调用 OpenAI Responses API 时使用的模型 |
| `OPENAI_API_KEY` | 空 | 不填时不调用 OpenAI，直接走本地 heuristic fallback |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | 允许的跨域来源，逗号分隔 |

根目录提供了示例文件：

```bash
cp .env.example .env
```

## 启动方式

从 `apps/server` 子目录启动开发模式：

```bash
npm run dev
```

从 `apps/server` 子目录构建并启动生产产物：

```bash
npm run build
npm run start
```

但要注意：

- 当前 `package.json` 的 `dev` 脚本指向 `tsx watch src/index.ts`
- `build` / `start` 依赖 `src/` 和 `dist/`
- 这些目录在这份快照里都不存在

所以当前快照下，这几条命令是“原始服务端设计命令”，不是可直接跑通的现状命令。

## 路由概览

### `GET /health`

返回：

```json
{ "ok": true }
```

用途：

- 只检查服务是否启动

### `GET /ready`

返回：

```json
{ "ok": true, "modelConfigured": true }
```

用途：

- 除了检查服务可用，还告诉你是否已经配置 `OPENAI_API_KEY`

### `POST /api/analyze-project`

请求体类型：

- `AnalyzeProjectRequest`

响应体类型：

- `AnalyzeProjectResponse`

用途：

- 只做项目分析，不做开放式聊天

### `POST /api/coach-chat`

请求体类型：

- `CoachRequest`

响应体类型：

- `CoachResponse`

用途：

- 输入学生问题、提示强度和项目快照
- 返回中文、偏“下一步该拖什么积木”的教练式建议

### `POST /api/session-events`

请求体类型：

- `SessionEvent`

响应：

```json
{ "accepted": true }
```

用途：

- 记录 UI 层发送的会话事件

## 请求校验与错误返回

所有请求 schema 都来自 `@scratch-ai/shared`。

当前错误处理行为：

- 请求参数不合法：`400`
- OpenAI 上游失败：`502`
- 其他未处理异常：`500`

错误返回结构统一为：

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Some message",
    "details": {},
    "requestId": "..."
  }
}
```

请求上下文中会：

- 读取传入的 `x-request-id`
- 如果没有则自动生成
- 在响应头里回写 `x-request-id`

## OpenAI 调用行为

原始工程里，模型调用入口在 `src/features/coach/coach.repository.ts`。

但当前这份快照里，这个文件并不存在。

当前行为是：

- 如果没有 `OPENAI_API_KEY`，直接返回本地 fallback 响应
- 如果配置了 `OPENAI_API_KEY`，调用 `https://api.openai.com/v1/responses`
- 如果上游失败或解析失败，记录警告日志并回退到本地 heuristic 响应

这意味着服务端在无模型配置时也能用于开发、联调和接口测试。

## 测试

原始工程里应存在服务端接口测试。

但当前这份快照里：

- `apps/server` 没有 `test/` 目录
- `apps/server/package.json` 也没有 `test` 脚本

所以这份快照目前不能根据仓库现状直接运行服务端测试。
