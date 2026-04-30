# DeepSeek Scratch 教学工作流

这套工作流不是让模型直接生成完整 `.sb3`，而是把任务拆成更适合课堂的四步：

1. `规划`
2. `按角色生成脚本包`
3. `生成学生提示包`
4. `生成课堂排错包`

## 适用场景

- 老师先备课，再带学生一步步搭作品
- 学生卡住时，需要“先提示、再追问、最后再给脚手架”
- 需要把同一个游戏题目拆成角色职责、教学里程碑和排错清单

## 目录

- `core.mjs`
  - 模板渲染与本地校验器
- `config.mjs`
  - CLI 配置与默认模型分配
- `deepseek-client.mjs`
  - DeepSeek API 访问与 repair 重试
- `stages.mjs`
  - 各阶段的声明式定义
- `workflow.mjs`
  - 工作流编排器
- `reporting.mjs`
  - 汇总报告输出
- `prompts/`
  - 4 个阶段的系统提示词和用户提示词模板
- `../run-deepseek-teaching-workflow.mjs`
  - 真实执行脚本
- `../fixtures/deepseek-workflow-brief.example.json`
  - 示例 brief
- `ARCHITECTURE.zh-CN.md`
  - 架构说明与未来扩展建议

## 输入 brief 约定

brief 至少要包含：

- 固定题目信息：`title`、`pitch`
- 学生层级：`studentLevel`
- 胜负条件：`winCondition`、`loseCondition`
- 变量与广播：`variables`、`broadcasts`
- 教学目标：`learningGoals`
- 约束：`constraints`
- 教师备注：`teacherNotes`
- 角色数组：`roles`

每个角色需要定义：

- `name`
- `responsibility`
- `requiredScripts`
- `mustTeach`

如果你手上还没有整理好的 brief，而只有一个本地 `.sb3`，可以先从仓库根目录执行：

```powershell
node Windows-Test\generate-teaching-brief-from-sb3.mjs --sb3="C:\path\to\project.sb3"
```

这个脚本会先生成：

- `project-summary.json`
- `brief-draft.json`

然后再由老师人工修改 `brief-draft.json`，再交给教学工作流继续跑。

## 运行方法

从仓库根目录执行：

```powershell
node Windows-Test\run-deepseek-teaching-workflow.mjs
```

指定 brief：

```powershell
node Windows-Test\run-deepseek-teaching-workflow.mjs --brief="C:\path\to\my-brief.json"
```

指定模型：

```powershell
node Windows-Test\run-deepseek-teaching-workflow.mjs --plan-model=deepseek-v4-pro --role-model=deepseek-v4-flash --hint-model=deepseek-v4-flash --debug-model=deepseek-v4-pro
```

## 输出内容

默认会在桌面生成一个带时间戳的输出目录，里面包含：

- `00-brief.json`
- `01-plan.json`
- `02-role-*.json`
- `03-student-hints.json`
- `04-debug-pack.json`
- `SUMMARY.md`
- `rendered-prompts/`

## 当前建议

- `规划` 用 `deepseek-v4-pro`
- `角色脚本` 优先试 `deepseek-v4-flash`
- `学生提示` 优先试 `deepseek-v4-flash`
- `课堂排错` 用 `deepseek-v4-pro`

原因不是“越贵越好”，而是前面实测里：

- `v4-pro` 更适合做高层规划和排错总结
- `v4-flash` 在局部角色任务上通常更直接

## 维护原则

- 不要把提示词目标写成“直接产出完整 Scratch 工程”
- 先保住固定题目、固定角色、固定变量、固定广播
- 用本地校验器兜底，而不是完全信任模型
- 发现某个角色不稳时，继续细分到“单段脚本”级别再生成
