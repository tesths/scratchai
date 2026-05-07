
# Scratch AI Server API

`apps/server-api` 是服务器端第一阶段的 FastAPI 后端，负责老师/学生认证、发布单、学生进度、AI 提示和教师实时看板接口。

## 本地开发

优先从仓库根目录运行：

```bash
npm run server:api:test
uv run --project apps/server-api python -m app.main
```

如需单独进入目录，也可以使用：

```bash
cd apps/server-api
uv run --python python3 pytest
```

## 关键接口

- `GET /health`
- `POST /api/teacher/register`
- `POST /api/teacher/login`
- `POST /api/student/login`
- `GET /api/students`
- `POST /api/students`
- `GET /api/releases`
- `POST /api/releases`
- `POST /api/student/releases/{releaseId}/progress`
- `POST /api/student/releases/{releaseId}/hints`
- `GET /api/dashboard/releases/{releaseId}/live`

## 环境变量

- `SERVER_API_DB_PATH`
- `AI_PROVIDER`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
