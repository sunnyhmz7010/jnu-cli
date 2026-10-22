<div align="center">
  <h1>jnu-cli</h1>
  <p>面向暨南大学网页服务的 agent-friendly CLI</p>
  <p>本项目借鉴 <a href="https://github.com/AwesomeHou/szu-cli">szu-cli</a> 的开发思路，针对暨南大学本科教务系统及其他网页服务完成适配。在此谨向原作者致以诚挚谢意，感谢其作出的原创性贡献。</p>
  <p>本项目为个人开源项目，与暨南大学及其相关部门无隶属、合作或授权关系。项目按“现状”提供，不保证功能可用性与数据准确性；使用所产生的风险及后果由使用者自行承担，请遵守学校相关规定。</p>
</div>

<p align="center">
  <a href="https://github.com/sunnyhmz7010/jnu-cli/blob/main/LICENSE"><img src="https://img.shields.io/github/license/sunnyhmz7010/jnu-cli?color=10b981" alt="License" /></a>
</p>

---

## ✨ 为什么做这个项目



## 🚀 核心能力



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

- Node.js >= 20

### ⚙️ 命令

```bash
npm ci
npm test
npm run check
npm pack --dry-run --ignore-scripts
```

## 🔐 安全报告

如果发现安全问题，请不要公开披露细节。请优先参考仓库中的 [SECURITY.md](./SECURITY.md) 提交安全报告。

## 📄 许可证

本项目基于 [GPL-3.0](./LICENSE) 开源。

<div align="center">
  <sub>Built with ❤️ by Sunny</sub>
</div>
