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

`jnu-cli` 是面向暨南大学网页服务的 agent-friendly CLI。

它把常用校园网页能力整理成稳定命令和结构化 JSON 输出，同时复用本机持久化浏览器登录态，不保存账号密码。

## 🚀 核心能力

| 模块 | 实现的功能 | 示例命令 |
|---|---|---|
| 浏览器与认证 | 检查浏览器和当前登录状态，复用本机独立登录档案 | `jnu-cli browser status`<br>`jnu-cli auth status` |
| 个人课表 | 查询当前教学周、全学期或当天课程，处理调课与停课 | `jnu-cli course list`<br>`jnu-cli course today` |
| 个人成绩 | 查询全部学期有效成绩，按学期筛选，展示单科绩点 | `jnu-cli grade list` |
| 考试安排 | 查询考试时间、考场和座位信息 | `jnu-cli exam list` |
| 学业进度 | 查看培养方案已有的学分完成结果、模块和课程修读状态 | `jnu-cli completion summary`<br>`jnu-cli completion modules` |
| 培养方案 | 分页查询已发布方案，读取方案详情、课程模块和指导计划 | `jnu-cli program list --page 1` |
| 评教进度 | 查看评教统计和待评、已评的课程评估项 | `jnu-cli evaluation summary`<br>`jnu-cli evaluation list` |
| 个人信息 | 查询本人的院系、专业、班级、校区和学籍状态等常用信息 | `jnu-cli profile show` |

查询命令添加 `--json` 可输出结构化结果，完整参数与字段说明见[命令说明](docs/commands.md)。

## ⚡ 快速开始

### 📋 前置要求

- Node.js 20 及以上版本和 npm。
- 已安装的 Microsoft Edge 或 Google Chrome，以及可显示浏览器窗口的桌面环境。
- 可正常访问暨大本科教务系统的网络和本人本科学生账户。

### 📦 安装与运行

```bash
npm install -g jnu-cli
jnu-cli browser status
jnu-cli auth login
jnu-cli auth status
jnu-cli course today
```

也可免全局安装运行，例如 `npx jnu-cli@latest --help`。

`auth login` 会打开一个持久化浏览器 profile。你在正常网页里完成统一身份认证后，CLI 会验证本科课表访问，再关闭并重新打开同一档案，确认登录态可复用后返回成功。学校会话到期后重新运行登录命令即可。

## 📖 使用说明

**选择浏览器与检查登录态**

```bash
jnu-cli --help
jnu-cli browser status
jnu-cli browser use edge
jnu-cli auth login --timeout 900
jnu-cli auth status
```

当前支持 Google Chrome、Microsoft Edge 和已安装的 Playwright Chromium。浏览器选择顺序为 `JNU_BROWSER` 环境变量、`browser use` 保存的选择、自动检测；不同浏览器使用各自的独立 CLI profile。

**查询课表、成绩与考试**

```bash
jnu-cli course list
jnu-cli course list --week 7 --weekday 3
jnu-cli course list --all-weeks
jnu-cli course today
jnu-cli grade list
jnu-cli grade list --term 2025-2026-2
jnu-cli exam list
```

默认课表查询当前教学周，`--all-weeks` 查看全学期；星期使用 1 至 7 表示周一至周日。成绩默认查询全部学期的有效成绩，考试安排默认查询考试应用的当前学期。

**查看学业进度与培养方案**

```bash
jnu-cli completion summary
jnu-cli completion modules
jnu-cli program list --page 1 --page-size 12
```

模块课程使用 `completion courses --module` 配合 `completion modules` 返回的模块 `code` 查询，可用 `--state` 筛选修读状态。方案详情使用 `program item --code` 配合 `program list` 返回的方案 `code` 查询。

**查看评教进度与个人信息**

```bash
jnu-cli evaluation summary
jnu-cli evaluation list
jnu-cli evaluation list --state completed
jnu-cli profile show
```

评教列表默认显示待评的课程评估项，`--state completed` 查看已评项，`--state all` 查看全部。默认学期由评教应用配置提供，可能与当前教学学期不同。

**供 AI Agent 调用**

以下步骤面向正在协助用户操作的 AI Agent；登录步骤需要用户在浏览器中完成。

```bash
npm install -g jnu-cli
jnu-cli browser status --json
jnu-cli auth login --json
jnu-cli auth status --json
jnu-cli course today --json
```

命令默认输出简明文字；添加 `--json` 后，成功返回 `ok`、`data` 和 `meta`，失败返回 `ok`、`error` 和 `meta`。检查登录态时应读取 `data.loggedIn`，查询失败时按错误码处理。字段含义与退出码见[命令说明](docs/commands.md#json-与退出码)。

## 🧠 功能细节

- 登录态保存在本机：后续命令复用 `~/.jnu-cli/browser-profiles/<browser>/` 下的登录态。可用 `JNU_CLI_HOME` 指定存储目录；同一档案的命令应顺序执行。
- 通过正常网页访问业务：使用 Playwright 打开独立浏览器窗口，经过学校统一身份认证和本科教务门户进入对应服务，再在业务页中执行同源查询。登录、状态检查和业务查询都会显示浏览器窗口。
- 按环境选择网络：默认沿用系统网络；代理链路出现 502 时，可在登录或查询命令中添加 `--network direct` 让本次 CLI 浏览器直连，例如 `jnu-cli auth login --network direct`。网络选择仅影响此次浏览器，后续命令使用适合当前环境的同一选项。

## 🧱 技术栈

- 语言：JavaScript，Node.js 20+，ES Modules。
- 浏览器：Playwright 1.61.0，使用持久化本地档案。
- 测试：Node.js 内置测试运行器，全部夹具使用合成数据。
- 目标平台：支持 Chrome、Edge 或 Playwright Chromium 的桌面环境；已验收 Windows Edge。

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
│   ├── grade.js             # 个人成绩
│   ├── exam.js              # 考试安排
│   ├── completion.js        # 学业完成和当前选课
│   ├── program.js           # 培养方案
│   ├── evaluation.js        # 评教进度
│   ├── profile.js           # 本人常用学籍信息
│   ├── module-tree.js       # 模块层级检查
│   └── format.js            # 普通文字输出
├── tests/                   # 合成业务及 CLI 测试
├── scripts/                 # 项目检查与测试入口
├── docs/                    # 命令与接口说明
└── .github/ISSUE_TEMPLATE/   # 问题反馈模板
```

## 👨‍💻 本地开发

### 🧰 环境

- Node.js >= 20 和 npm。
- 真实登录与查询需要可用浏览器、网络和本人账户；自动化测试使用合成数据。

### ⚙️ 命令

```bash
git clone https://github.com/sunnyhmz7010/jnu-cli.git
cd jnu-cli
npm ci
npm run jnu-cli -- --help
npm test
npm run check
npm pack --dry-run --ignore-scripts
```

源码入口为 `node src/cli.js`，也可使用 `npm run jnu-cli -- <参数>`。安装后的命令与源码入口使用同一套参数。

发布新版本时，先用 `npm version patch`（或 `minor`、`major`）更新包与锁文件版本并创建标签，再执行 `git push origin main --follow-tags`。在 GitHub 为该标签发布正式 Release，例如 `v0.1.1`，会触发 [npm 发布工作流](.github/workflows/publish.yml)：校验标签与版本一致，运行测试和项目检查，通过后自动发布到 npm。预发布 Release 会跳过；Actions 中手动运行 `Publish npm` 只检查和打包。

工作流通过 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) 认证。npm 包设置中的 GitHub 仓库为 `sunnyhmz7010/jnu-cli`，工作流文件名为 `publish.yml`，允许 `npm publish`；无需配置 npm Token。

## 🔐 安全报告

如果发现安全问题，请不要公开披露细节。请优先参考仓库中的 [SECURITY.md](./SECURITY.md) 提交安全报告。

## 📄 许可证

本项目基于 [GPL-3.0](./LICENSE) 开源。

<div align="center">
  <sub>Built with ❤️ by Sunny</sub>
</div>
