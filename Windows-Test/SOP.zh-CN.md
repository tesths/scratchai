# Scratch Desktop 机房部署 SOP

相关文档：

- [根工作区总览](../README.md)
- [Windows 测试说明](README.zh-CN.md)
- [桌面伴随程序说明](../apps/desktop-companion/README.md)
- [开发接力文档](../apps/desktop-companion/DEVELOPMENT_STATUS.zh-CN.md)

适用对象：

- 机房管理员
- 信息老师
- 需要批量部署 `Scratch Desktop Companion` 的维护人员

适用范围：

- Windows 机房电脑
- 当前试验分支使用“伴随程序受控启动 Scratch”路线

说明：

- 项目现在已经支持 macOS 开发、源码版 UI 自动化和内测打包
- 这份 SOP 只覆盖 Windows 机房现场部署，不负责 macOS 的分发和验收

## 1. 当前目标

当前现场流程不是“学生直接双击 Scratch”，而是：

1. 先启动伴随程序。
2. 由伴随程序自动识别 Scratch 路径；如果之前已经选过，就继续使用上次保存的路径。
3. 如果没识别到，手动选择 `Scratch.exe` 或 `Scratch 3.exe`。
4. 从伴随程序里点击 `打开已选 Scratch`。
5. 把老师准备好的 `.sb3`、Scratch 作品页或 Scratch API 地址填入 `教师 sb3 地址`。
6. 连接成功后查看：
   - `当前角色`
   - `当前角色程序`
   - `AI 当前一步提示`

截至 2026-05-05，以上主流程已在本地真实 Windows 环境验证通过。

## 2. 已验证交付物

当前优先使用：

- `../installers/ScratchDesktopCompanion-setup.exe`
- `../installers/ScratchDesktopCompanion-portable.exe`
- `../installers/ScratchDesktopCompanion-with-key-setup.exe`
- `../installers/ScratchDesktopCompanion-with-key-portable.exe`
- `../installers/SHA256SUMS.txt`
- `../installers/RELEASE-NOTES.md`
- `../apps/desktop-companion/release-single/win-unpacked/ScratchDesktopCompanion.exe`
- `../apps/desktop-companion/release-single/ScratchDesktopCompanion-portable.exe`

说明：

- 单机或小规模部署可以优先使用 `../installers/ScratchDesktopCompanion-setup.exe`
- 如果交付目标是“开箱即可直接使用已打包的 DeepSeek 配置”，优先发 `../installers/ScratchDesktopCompanion-with-key-setup.exe` 或 `../installers/ScratchDesktopCompanion-with-key-portable.exe`
- 发包前可以对照 `../installers/SHA256SUMS.txt` 校验文件，并查看 `../installers/RELEASE-NOTES.md` 确认本次交付说明
- `win-unpacked` 是当前最稳的交付形态
- `portable.exe` 可发现场，但启动速度通常慢于 `win-unpacked`

## 3. 部署前准备

每台 Windows 机器需要满足：

- 已安装 `Scratch Desktop`
- 允许本地运行普通桌面程序
- 允许官方 Scratch 可执行文件用 `--remote-debugging-port=<port>` 启动
- 能运行 PowerShell

如果要人工选择路径，最好满足以下任一条件：

- 桌面上有 `Scratch Desktop` 快捷方式
- 能直接找到真实 `Scratch.exe` / `Scratch 3.exe`

## 4. 单机安装步骤

### 4.1 `win-unpacked`

1. 将 `win-unpacked` 目录复制到目标机器，例如：

```text
C:\ScratchDesktopCompanion\
```

2. 双击 `ScratchDesktopCompanion.exe`。
3. 确认系统托盘中出现伴随程序图标。
4. 打开主窗口，确认是否已经自动识别到 Scratch 路径。
5. 如果没有识别到，点击 `选择 Scratch 软件`，手动选中真实 exe。
6. 点击 `打开已选 Scratch`。
7. 等待 3 到 10 秒，确认状态进入 `已连接到 Scratch Desktop`。
8. 如需课堂参考作品，继续在 `教师 sb3 地址` 输入框里粘贴老师准备好的地址。

### 4.2 `portable.exe`

1. 将 `ScratchDesktopCompanion-portable.exe` 复制到固定目录，例如：

```text
C:\ScratchDesktopCompanion\ScratchDesktopCompanion-portable.exe
```

2. 双击运行。
3. 后续流程与 `win-unpacked` 一致。

### 4.3 `setup.exe`

1. 从仓库根目录取用 `../installers/ScratchDesktopCompanion-setup.exe`，或先将它复制到目标机器。
2. 双击安装包，按向导安装到固定目录，例如 `C:\ScratchDesktopCompanion\`。
3. 安装完成后立即打开程序，确认系统托盘中出现伴随程序图标。
4. 后续验收流程与 `win-unpacked` 一致。

## 5. 设置开机自动启动

### 5.1 当前用户

如果部署目录里带了启动脚本，在部署目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install-lab-startup.ps1 -LaunchNow
```

效果：

- 创建当前用户开机启动快捷方式
- 立即以 `--hidden` 模式启动伴随程序

### 5.2 单文件版手工创建启动项

如果你只发了 `portable.exe`，可以直接执行：

```powershell
$exe = 'C:\ScratchDesktopCompanion\ScratchDesktopCompanion-portable.exe'; $startup = [Environment]::GetFolderPath('Startup'); $ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut((Join-Path $startup 'Scratch Desktop Monitor.lnk')); $sc.TargetPath = $exe; $sc.Arguments = '--hidden'; $sc.WorkingDirectory = Split-Path $exe; $sc.IconLocation = $exe; $sc.Save()
```

## 6. 验收步骤

每批机器至少抽查 3 台。

### 6.1 启动验收

1. 重启电脑并登录 Windows。
2. 确认托盘中出现伴随程序。
3. 打开主窗口，确认是否自动识别到 Scratch 路径。
4. 如果没有识别到，执行一次 `选择 Scratch 软件`。
5. 点击 `打开已选 Scratch`。
6. 观察状态是否变成 `已连接到 Scratch Desktop`。

### 6.2 角色与程序验收

在 Scratch 中分别做下面动作：

1. 打开空白项目，确认窗口已连接。
2. 查看 `当前角色` 是否与 Scratch 当前编辑角色一致。
3. 查看 `当前角色程序` 是否能列出脚本序列。
4. 切换到另一个角色，确认伴随程序窗口会刷新。
5. 打开一个本地 `.sb3` 项目，再检查 `当前角色` 和 `当前角色程序`。
6. 点击 `重新连接`，确认状态能恢复。

### 6.3 失败重试验收

如果第一次没有连上：

1. 打开伴随程序窗口。
2. 点击 `重新连接`。
3. 再等待 3 到 10 秒。
4. 如果仍失败，转到第 8 节排查。

## 7. 日常使用说明

学生：

- 当前试验阶段不要自行双击打开 `Scratch Desktop`
- 先让伴随程序完成路径识别或路径选择
- 再从伴随程序里点击 `打开已选 Scratch`

老师：

- 需要看状态时，点击托盘图标打开伴随程序窗口
- 如果首次没有路径，先执行 `选择 Scratch 软件`
- 上课前把老师准备好的 `.sb3` 或 Scratch 作品页地址贴进 `教师 sb3 地址`
- 如果状态长时间不更新，点击 `重新连接`
- 关闭窗口不会退出程序，只会缩回托盘

## 8. 故障排查

### 现象 1：一直停在 `请先选择 Scratch 软件`

检查：

- `Scratch Desktop` 是否真的已经安装
- 是否选中了正确的 `Scratch.exe` / `Scratch 3.exe`
- 桌面快捷方式是否有效

处理：

- 重新点一次 `选择 Scratch 软件`
- 优先选择真实 exe，而不是来源不明的快捷方式

### 现象 2：一直停在 `请从伴随程序打开已选 Scratch`

说明：

- 当前还没有成功通过伴随程序启动 Scratch

处理：

- 确认是从伴随程序点击 `打开已选 Scratch`
- 不要让用户先手工双击 Scratch

### 现象 3：点了 `打开已选 Scratch` 但没有连上

检查：

- Scratch 是否已被启动
- `Scratch 3.exe --remote-debugging-port=<port>` 在本机是否能正常返回 `/json/list`
- 是否真的选中了 Scratch 本体，而不是错误快捷方式

处理：

- 先点击 `重新连接`
- 仍失败时收集日志并按第 9 节回传

### 现象 4：角色或程序没有刷新

检查：

- Scratch 当前是否已经切换到另一个角色
- 当前项目是否确实存在脚本

处理：

- 先点击 `重新连接`
- 再切一次角色观察是否刷新

## 9. 日志与现场回传

当前优先查看：

```text
C:\Users\<当前用户名>\AppData\Roaming\@scratch-ai\desktop-companion\desktop-companion.log
```

兼容旧版本时，也可以检查：

```text
C:\Users\<当前用户名>\AppData\Roaming\scratch-desktop-companion\desktop-companion.log
```

如果需要把现场问题回传给开发，至少带上：

- 你使用的是 `win-unpacked` 还是 `portable.exe`
- 当前窗口顶部状态文案
- `当前角色`
- `当前角色程序`
- 最后 30 到 50 行日志
