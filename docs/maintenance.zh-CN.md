# 主工程文档维护约定

这份文档只约束主工程文档：

- `README.md`
- `docs/README.zh-CN.md`
- `docs/*.md`
- `apps/server/README.md`
- `apps/desktop-companion/*.md`
- `Windows-Test/*.md`

当前工作区默认不再内嵌上游 Scratch clone，因此也不存在“顺手改上游 README”的维护路径。
如果后续确实需要参考上游实现，应把 clone 当成单独的临时参考输入，而不是恢复成常驻目录结构。

## 1. 文档入口优先级

默认按下面顺序维护：

1. 根 `README.md`
2. 根 `docs/README.zh-CN.md`
3. 根 `docs/architecture.zh-CN.md`
4. 根 `docs/maintenance.zh-CN.md`
5. 子应用自己的 README / 状态文档 / SOP
6. `Windows-Test` 下的测试说明与测试 SOP

原则：

- 根 README 负责“项目总入口”
- `docs/README.zh-CN.md` 负责“文档导航和目录收口约定”
- 架构文档负责“组件关系和数据流”
- 维护文档负责“以后怎么保持不乱”
- 子应用文档负责“这个应用自己怎么开发、接力、部署、排查”
- `Windows-Test` 文档负责“当前测试交付怎么验证、怎么复跑、怎么带回信息”

## 2. 各文档的职责

### 根 `README.md`

必须保持：

- 主工程范围说明
- 快速开始命令
- 文档导航
- 主工程边界
- 当前目录收口说明

出现下面变化时必须更新：

- 根 `package.json` 或工作区入口变化
- workspace 目录变化
- 主工程新增/移除应用
- 文档入口位置变化
- 截图、安装包或临时目录的收口位置变化

### `docs/README.zh-CN.md`

必须保持：

- 文档阅读顺序
- 按任务查找文档的入口
- 当前目录收口约定
- 截图和分发产物的位置说明

出现下面变化时必须更新：

- 文档入口位置变化
- 截图归档位置变化
- 最终安装包收口位置变化
- `Windows-Test` 临时目录清理口径变化

### `docs/architecture.zh-CN.md`

必须保持：

- 组件职责
- 关键数据流
- 主工程边界
- 当前未接通的链路
- 主要风险点

出现下面变化时必须更新：

- 服务端新增或移除关键接口
- 桌面伴随程序的运行链路变化
- `packages/shared` 的系统职责变化
- `apps/server` 与 `apps/desktop-companion` 之间开始直连

### `docs/maintenance.zh-CN.md`

必须保持：

- 文档层级规则
- 每类改动对应要更新哪些文档
- 文档核对清单

只有在维护规则本身变化时才更新。

### `apps/server/README.md`

必须保持：

- 服务职责
- 环境变量
- 启动方式
- 路由概览
- 回退行为

出现下面变化时必须更新：

- `apps/server/src/config.ts` 变化
- 路由路径变化
- 鉴权、错误结构或上游模型调用策略变化

### `apps/desktop-companion/README.md`

必须保持：

- 应用用途
- 本地开发命令
- 打包命令与产物
- 指向接力文档和 SOP 的导航

不要把详细排障步骤塞回这个 README。

### `apps/desktop-companion/DEVELOPMENT_STATUS.zh-CN.md`

必须保持：

- 当前实现形态
- 已完成能力
- 已知风险和限制
- 真机验证状态
- 继续开发建议
- 关键状态文案与日志定位

出现下面变化时必须更新：

- 启动流程
- 注入策略
- 运行状态文案
- 打包建议
- 日志位置

### `apps/desktop-companion/SOP.zh-CN.md`

必须保持：

- 机房部署步骤
- 开机启动设置
- 验收步骤
- 现场排障步骤

不要把架构解释和研发决策堆到 SOP 里。

### `Windows-Test/README.zh-CN.md`

必须保持：

- 当前测试交付里包含什么
- 推荐测试顺序
- 当前已经验证过什么
- 维护人员本地复跑命令
- 当前边界

出现下面变化时必须更新：

- Windows 测试交付目录内容变化
- 本地验证脚本或回归脚本变化
- 关键日志关键词变化
- 当前主试验路线变化

### `Windows-Test/SOP.zh-CN.md`

必须保持：

- 现场测试/验收步骤
- 机房部署口径
- 故障排查步骤
- 维护人员脚本入口

出现下面变化时必须更新：

- 现场测试流程变化
- 当前主试验路线变化
- 故障排查入口变化
- 验收口径变化

## 3. 文档更新检查清单

每次改动完成后，至少检查：

- 根 README 里的工作区入口描述是否和真实目录一致
- `docs/README.zh-CN.md` 里的文档导航和目录收口是否与真实目录一致
- 新增链接是否都能指向真实文件
- `apps/server/README.md` 的环境变量是否和 `apps/server/src/config.ts` 一致
- `apps/server/README.md` 的接口名是否和真实路由一致
- `apps/desktop-companion/README.md`、`DEVELOPMENT_STATUS.zh-CN.md`、`SOP.zh-CN.md` 是否职责清晰、没有明显重复
- `Windows-Test/README.zh-CN.md`、`Windows-Test/SOP.zh-CN.md` 是否与当前主试验路线一致
- 是否清楚说明了根目录不是单一 Git 仓库
- 根目录是否又出现了零散截图或单独分发安装包
- 如果临时 clone 过上游仓库，是否在任务结束后清理，或至少在文档里明确其临时性质
- 是否误把 `dist/` 或打包产物当成源码入口写进文档

## 4. 推荐维护顺序

如果一次改动同时影响代码和文档，推荐顺序：

1. 先确认真实代码边界
2. 先改根 README 和 `docs/README.zh-CN.md`
3. 再改架构文档
4. 再改受影响子应用文档
5. 如果测试交付目录也受影响，再改 `Windows-Test` 文档
6. 最后核对命令、路径、环境变量和链接

这样可以避免局部 README 更新了，但根入口仍然过期。
