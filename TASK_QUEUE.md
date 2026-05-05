# TASK_QUEUE

## 待确认

- 2026-05-05：评估将项目扩展为“服务器版 + 单机版并存”的可行性、边界与工作量；本轮仅阅读文档和方案讨论，不改业务代码。

## 已完成

- 2026-05-05：完成 workspace 收口与目录重构；移出 `apps/server` 主线，将 `Windows-Test` 迁移为 `tools/verification`，统一根锁文件、忽略规则、清理脚本与 CI，保证项目在新电脑上 clone 后可继续做 Windows / macOS 开发、测试与出包。
