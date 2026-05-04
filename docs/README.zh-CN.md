# 主工程文档索引

这份索引负责三件事：

- 给维护者一个稳定的阅读顺序
- 说明当前工作区里文档、产物和临时目录的收口位置
- 给出整理和清理当前工作区的统一入口

## 1. 推荐阅读顺序

1. `../README.md`
2. `./architecture.zh-CN.md`
3. `./maintenance.zh-CN.md`
4. `../apps/desktop-companion/README.md`
5. `../Windows-Test/README.zh-CN.md`

## 2. 按任务找文档

- 看工作区范围、常用命令和当前入口：`../README.md`
- 看组件职责和数据流：`./architecture.zh-CN.md`
- 看文档应该怎么维护：`./maintenance.zh-CN.md`
- 看桌面端开发、打包和交接：`../apps/desktop-companion/README.md`
- 看 Windows 真机验证和回归：`../Windows-Test/README.zh-CN.md`
- 看机房部署和现场排查：`../apps/desktop-companion/SOP.zh-CN.md`、`../Windows-Test/SOP.zh-CN.md`

## 3. 当前目录收口约定

- 最终分发安装包统一放 `../installers/`
- 文档截图统一归档到 `./assets/screenshots/`
- `../Windows-Test/artifacts/` 只保留需要回看的命名验证结果
- `../Windows-Test/tmp-*/` 和 `../Windows-Test/generated/` 是可再生临时目录，复跑前后都可以清理
- 根目录不再放零散截图和单独分发安装包

## 4. 工作区整理与清理

优先使用根目录统一入口：

```powershell
npm run workspace:clean:dry-run
npm run workspace:clean
```

当前清理脚本会处理这些可再生产物：

- 根目录、`apps/desktop-companion/`、`packages/shared/` 下的 `node_modules/`
- `apps/desktop-companion/dist/`
- `apps/desktop-companion/release-single/`
- `apps/desktop-companion/release-installer/`
- `apps/desktop-companion/release-bundles/`
- `docs/assets/screenshots/*.png`
- `Windows-Test/generated/`
- `Windows-Test/tmp-*`
- `Windows-Test/last-*.json`
- `installers/` 下除 `.gitkeep` 之外的分发产物

## 5. 这次整理后的常用入口

- 文档总导航：本文件
- 主架构文档：`./architecture.zh-CN.md`
- 维护规则：`./maintenance.zh-CN.md`
- 截图归档目录：`./assets/screenshots/`
