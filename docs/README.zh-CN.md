# 主工程文档索引

## 推荐阅读顺序

1. `../README.md`
2. `./architecture.zh-CN.md`
3. `./maintenance.zh-CN.md`
4. `../apps/desktop-companion/README.md`
5. `../tools/verification/README.zh-CN.md`

## 按任务找文档

- 看 workspace 入口、安装方式和常用命令：`../README.md`
- 看模块职责和数据流：`./architecture.zh-CN.md`
- 看文档长期怎么维护：`./maintenance.zh-CN.md`
- 看 `Scratch AI 教练桌面工具` 的开发、打包和交接：`../apps/desktop-companion/README.md`
- 看真机验证、UI 自动化和教学工作流：`../tools/verification/README.zh-CN.md`
- 看 Windows 现场部署与排查：`../apps/desktop-companion/SOP.zh-CN.md`

## 当前目录收口

- 分发产物统一收口到 `../installers/`
- GitHub Actions `Desktop Release Artifacts` 会把 `../installers/**` 上传为临时 artifact；当前不会自动同步到 GitHub Release assets
- 文档截图统一放 `./assets/screenshots/`
- `../tools/verification/generated/`、`../tools/verification/artifacts/`、`../tools/verification/tmp-*/` 都是可再生产物
- 根目录不再保留上游 Scratch clone、历史截图和历史安装包

## 清理入口

```bash
npm run clean:dry-run
npm run clean
```

当前清理脚本会处理：

- 根目录与各 workspace 的 `node_modules/`
- `apps/desktop-companion/dist/` 和 `release-*`
- `tools/verification/generated/`
- `tools/verification/artifacts/`
- `tools/verification/tmp-*`
- `tools/verification/last-*.json`
- `docs/assets/screenshots/*.png`
- `installers/` 下除 `.gitkeep` 之外的产物
