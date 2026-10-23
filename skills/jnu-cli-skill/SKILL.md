---
name: jnu-cli-skill
description: 当用户需要通过本地 jnu-cli 查询暨南大学本科教务信息时使用，包括个人课表、成绩、考试安排、培养方案、学业完成、评教进度、本人学籍信息，以及 CLI 环境、浏览器和登录状态检查。该工具非学校官方项目。
license: MIT
metadata:
  author: Sunny
  source: https://github.com/AwesomeHou/szu-cli/tree/406e5627494e404203752746fbc97ddc3a06a932/skills/szu-cli-skill
---

# 暨南大学—校园服务 Skill

以本地 `jnu-cli` 为唯一事实来源。这是非官方的暨南大学本科教务查询 Skill，可在 [GitHub](https://github.com/sunnyhmz7010/jnu-cli/issues) 反馈问题。它只提供调用指引，不在此实现校园网站抓取、浏览器自动化或业务逻辑。

本 Skill 改编自 [szu-cli-skill](https://github.com/AwesomeHou/szu-cli/tree/406e5627494e404203752746fbc97ddc3a06a932/skills/szu-cli-skill)，保留原始 [MIT 许可证](LICENSE)。

## 开始前

执行校园查询前，先检查本地环境：

```bash
node --version
jnu-cli --version
```

`jnu-cli` 要求 Node.js 20 或更高版本。若 Node.js 缺失或版本过低，先提示用户安装或升级。

若未安装 `jnu-cli`，变更用户环境前先征得同意，再让用户执行：

```bash
npm install -g jnu-cli
```

安装后验证 CLI：

```bash
jnu-cli doctor
jnu-cli auth status
```

命令默认输出 JSON；`--help` 和 `--version` 输出文字。不要追加不受支持的 `--json`。

不要静默安装 CLI。需要登录时，让用户执行：

```bash
jnu-cli auth login
```

用户应在 CLI 打开的浏览器窗口中完成登录。

## 工作流

1. 将用户请求映射到最小可用的只读命令。
2. 直接执行命令；仅在需要可视浏览器时添加 `--headed`。
3. `ok: false` 时，按 `references/errors.md` 中的 `error.code` 处理。
4. `ok: true` 时，只基于返回字段作答，并仅保留必要的隐私数据。

## 成绩查询流程

成绩请求直接使用 `jnu-cli grade list`；单个学期加 `--term <termId>`，例如 `--term 2025-2026-2`。默认返回全部学期的有效成绩，不只查询最近两个学期。相对学期需结合学校返回的学期和用户语境确定，不要只凭日历猜测。

单科绩点以 `gradePoint` 为准。`gpa=null` 表示累计或学期 GPA 规则尚未核实，不能自行重算 GPA 或推断排名。

## 学业完成与评教

先用 `completion summary` 或 `completion modules` 查询，再用返回的 `moduleCode` 查询 `completion courses --module <moduleCode>`。`--plan` 只能使用本人 `plans` 返回的方案代码。

学业完成只读取已有结果，不触发重算。`calculation.state=not-calculated` 时说明没有已有结果；不能把空列表解释为已完成全部要求。摘要、模块及模块树中的 `currentSelectedCredits` 为当前查询值；`selectedCredits`、`storedSelectedCredits` 保留已有结果，不能相加或互相替代。未修读候选课程不代表当前开课或可选。

评教列表只包含课程评估项；`progress`、`currentByType` 和 `historyByType` 应分别解释。`no-tasks` 表示没有任务，不能说成已完成评教。当前 CLI 不提交评教、不读取答案。

## 操作规则

- Agent 工作流解析默认 JSON，不要依赖 stdout 文案。
- 每次只运行一条会启动浏览器的命令；如果执行工具显示进程仍在运行，先等待并读取结果，不能因暂时无输出就重启。遇到特定的浏览器启动错误时，先检查是否有前一条命令未结束。
- 浏览器不可用时，先用 `jnu-cli browser status` 检查已有 Chrome、Edge 或 Playwright Chromium；仅选择已安装浏览器。CLI 没有浏览器安装命令，不要静默下载或安装。
- 教务命令均为只读查询；不要调用隐藏接口实现写操作。安装 CLI、切换浏览器或重新登录按用户授权执行。
- 不要索取密码、Cookie、令牌或浏览器 profile 文件。
- 不要绕过认证、验证码、校园网络限制、限流或访问控制。
- 不要激进重试。遇到 `RATE_LIMITED` 立即停止；登录和网络错误各处理一次。
- 成绩、绩点、考试、评教、身份字段和学习记录均为隐私；只回显用户所需内容。

## 按需读取参考文件

仅读取当前任务需要的文件：

- `@references/commands.md`：模块级路由，用于确定请求属于哪个命令域。
- `@references/examples.md`：自然语言到 CLI 的示例；用户用日常语言提问或命令形式不明确时读取。
- `@references/errors.md`：结构化错误、重试限制与后续命令。
- `@references/privacy-safety.md`：密码、Cookie、profile、隐私数据和登录态边界。

信息冲突时，以已安装 `jnu-cli` 的实际行为及其随包 README 使用说明为准；也可查阅[仓库使用说明](https://github.com/sunnyhmz7010/jnu-cli#-使用说明)。
