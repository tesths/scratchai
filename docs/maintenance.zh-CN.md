# 主工程文档维护约定

这份文档只约束当前主线文档：

- `README.md`
- `docs/*.md`
- `apps/desktop-companion/*.md`
- `tools/verification/*.md`
- `tools/verification/workflows/deepseek-teaching/*.md`

## 1. 文档层级

默认按下面顺序维护：

1. 根 `README.md`
2. `docs/README.zh-CN.md`
3. `docs/architecture.zh-CN.md`
4. `docs/maintenance.zh-CN.md`
5. `apps/desktop-companion` 下的 README / 状态文档 / SOP
6. `tools/verification` 下的验证说明与工作流文档

## 2. 每份文档负责什么

### `README.md`

负责：

- workspace 边界
- clone 后怎么继续开发
- 常用命令
- 文档导航

这些变化后必须更新：

- 根 `package.json` 命令变化
- workspace 目录变化
- 主线模块新增或移除

### `docs/README.zh-CN.md`

负责：

- 文档导航
- 目录收口
- 清理入口

这些变化后必须更新：

- 文档路径变化
- 清理脚本覆盖范围变化
- 安装包或截图收口位置变化

### `docs/architecture.zh-CN.md`

负责：

- 组件职责
- 主数据流
- 当前风险点

这些变化后必须更新：

- `desktop-companion` 内部分层变化
- `packages/shared` 职责变化
- `tools/verification` 目录或定位变化
- AI 调用链路变化

### `apps/desktop-companion/*.md`

负责：

- 桌面端开发、打包、部署、交接和现场排查

这些变化后必须更新：

- 真机验证入口变化
- 打包命令变化
- `src/main` / `src/renderer` / `src/common` 结构变化

### `tools/verification/*.md`

负责：

- 真机验证怎么跑
- 教学工作流怎么跑
- fixtures 和可再生产物怎么管理

这些变化后必须更新：

- `scripts/` 入口变化
- `workflows/deepseek-teaching/` 路径变化
- 临时目录、产物目录或 fixtures 位置变化

## 3. 维护检查清单

改完代码后，至少检查下面几项：

- 根 README 的命令能直接在仓库根目录执行
- 文档里的路径与真实目录一致
- 验证脚本示例是否已经带上 `tools/verification/scripts/`
- 文档是否还提到 `apps/server`、`Windows-Test` 这类已退出主线的路径
- `npm run clean:dry-run` 的描述是否和脚本输出一致
