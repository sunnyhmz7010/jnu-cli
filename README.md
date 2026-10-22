<div align="center">
  <h1>jnu-cli</h1>
  <p>在命令行中登录暨南大学本科教务系统并查询个人课表和成绩</p>
</div>

<p align="center">
  <a href="https://github.com/sunnyhmz7010/jnu-cli/blob/main/LICENSE"><img src="https://img.shields.io/github/license/sunnyhmz7010/jnu-cli?color=10b981" alt="License" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933" alt="Node.js >=20" />
</p>

---

## ✨ 为什么做这个项目

把本科教务中的个人查询做成可供终端和 Agent 调用的命令，保留正常的浏览器登录流程，用结构化输出读取结果。当前实现覆盖登录、课表和成绩，其他教务场景后续逐步接入。

## 🚀 核心能力

- 正常登录：独立浏览器档案，通过本科业务验证登录，关窗重启后再次验证会话。
- 个人课表：当前周、指定周次、全学期、星期与日期筛选，处理调课、停课及未排课课程。
- 个人成绩：全部学期有效成绩、完整分页、学期筛选，保留展示成绩和学校返回的单科绩点。
- 结构化结果：查询支持 `--json`、明确的错误码和退出码，普通输出方便直接阅读。
- 浏览器网络选项：可选沿用系统代理或仅让本次 CLI 浏览器直连。

## ⚡ 快速开始

### 📋 前置要求

- Node.js 20 及以上版本和 npm。
- 已安装的 Microsoft Edge 或 Google Chrome。程序会检测本机浏览器，也可显式选择。
- 可正常访问暨大本科教务系统的网络和本人本科账户。

### 📦 安装与运行

```bash
git clone https://github.com/sunnyhmz7010/jnu-cli.git
cd jnu-cli
npm ci
node src/cli.js browser status --json
node src/cli.js auth login --network direct --json
node src/cli.js course list --network direct --json
node src/cli.js grade list --network direct --json
```

这是源码运行方式，尚未发布 npm 包。仓库设置为 `private`，避免误发布。也可使用 `npm run jnu-cli -- <参数>`。

登录时会打开可见浏览器，由本人完成统一身份认证。验证业务访问后窗口自动关闭，再打开同一档案检查会话；返回 `persisted=true` 才表示重启复用验证成功。学校会话仍可能到期，到期后重新运行登录命令。

`--network direct` 适用于本机代理解析导致认证链路出现 502 的情况，仅影响本次 CLI 浏览器。默认省略该参数时沿用系统网络；需要代理才能访问的环境请使用默认值或 `--network system`。

## 📖 使用说明

```bash
node src/cli.js --help
node src/cli.js browser use edge --json
node src/cli.js auth status --network direct --json
node src/cli.js auth login --timeout 900 --network direct --json
node src/cli.js course list --all-weeks --network direct --json
node src/cli.js course list --week 7 --weekday 3 --network direct --json
node src/cli.js course today --network direct --json
node src/cli.js grade list --term 2025-2026-2 --network direct --json
```

默认课表查询当前教学周，成绩查询全部学期有效成绩。完整参数、字段含义和退出码见[命令说明](docs/commands.md)。

默认登录档案位于 `~/.jnu-cli/browser-profiles/<browser>/`。可用 `JNU_CLI_HOME` 指定目录，`JNU_BROWSER=chrome|edge|chromium` 指定浏览器；不同浏览器使用各自档案，同一档案的命令应顺序执行。配置只保留本机浏览器选择，程序不保存账户密码，也不导出 Cookie。

## 🧠 功能细节

浏览器正常进入教务门户，通过服务卡片和本科在籍角色打开业务应用，再在同源会话中请求已核对的接口。课表按学校周次位图合并调课和停课，成绩按 `totalSize` 与实际条数验证分页完整性；重复页、截断和业务错误会明确失败。

单科绩点来自教务系统。累计或学期 GPA 的计算规则尚未核实，因此返回 `gpa=null`。网络错误不会自动清除档案或切换访问路径。

2026-10-22 已在 Windows Edge 上完成真实登录、关窗重启复用、课表及成绩查询验收。其他操作系统和浏览器尚未做真实账户验收；当前仅实现正常教务入口，未适配 WebVPN。

考试安排、学业完成、培养方案、评教进度和个人信息尚未实现。课程认定不在适配范围内。

## 🧱 技术栈

- 语言：JavaScript，Node.js 20+，ES Modules。
- 浏览器：Playwright 1.61.0，使用持久化本地档案。
- 测试：Node.js 内置测试运行器，全部夹具使用合成数据。
- 目标平台：有可见浏览器的桌面环境；已验收 Windows Edge。

## 🗂️ 项目结构

```text
jnu-cli/
├── src/
│   ├── cli.js               # 唯一 CLI 入口
│   ├── main.js              # 参数、路由和输出
│   ├── config.js            # 暨大入口与本地目录
│   ├── browser-settings.js  # 独立浏览器配置
│   ├── browser.js           # 登录和正常门户导航
│   ├── api.js               # 同源请求与分页完整性
│   ├── course.js            # 个人课表和调课处理
│   └── grade.js             # 个人成绩
├── tests/                   # 合成业务及 CLI 测试
├── scripts/                 # 项目检查与测试入口
├── docs/                    # 命令与接口说明
└── .github/ISSUE_TEMPLATE/   # 问题反馈模板
```

## 👨‍💻 本地开发

### 🧰 环境

使用与运行环境相同的 Node.js 和 npm。离线测试不需要账户或学校网络；真实验收使用本人正常登录的独立档案，个人数据和临时诊断文件不进入版本控制。

### ⚙️ 命令

```bash
npm ci
npm test
npm run check
npm pack --dry-run --ignore-scripts
```

项目直接运行 JavaScript，无额外构建步骤。自动测试验证业务转换、分页、错误处理与本地配置，不替代真实账户验收。

## 🔐 安全报告

如果发现安全问题，请不要公开披露细节。请优先参考仓库中的 [SECURITY.md](./SECURITY.md) 提交安全报告。

## 📄 许可证

本项目基于 [GPL-3.0](./LICENSE) 开源。

<div align="center">
  <sub>Built with ❤️ by Sunny</sub>
</div>
