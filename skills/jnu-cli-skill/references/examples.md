# 校园 CLI 示例

用户以自然语言描述任务、需要具体命令示例时读取本文件。模块级路由先读取 [commands.md](commands.md)。

## 自然语言到 CLI

| 用户自然语言 | 推荐命令 | 说明 |
|---|---|---|
| “帮我看看今天有什么课” | `jnu-cli course today` | 查询当前用户课表。 |
| “查一下这周三第 3 到 4 节有什么课” | `jnu-cli course list --weekday 3` | 根据返回的 `startSection`、`endSection` 筛选节次；明确周次再加 `--week <n>`。 |
| “查指定日期的课” | `jnu-cli course today --date YYYY-MM-DD` | 将日期替换为用户指定的真实日期；教学周由学校返回。 |
| “查 2025-2026 学年第二学期成绩” | `jnu-cli grade list --term 2025-2026-2` | 只概述用户需要的成绩；不自行计算累计 GPA。 |
| “接下来有哪些考试” | `jnu-cli exam list` | 根据返回的日期整理；没有考场或座位时说明未提供。 |
| “我还差哪些学分，哪些课能补” | `jnu-cli completion modules`，再 `jnu-cli completion courses --module <moduleCode>` | 使用返回的模块代码；未修课程不保证当前可选。 |
| “这个模块已经选了什么课” | `jnu-cli completion courses --module <moduleCode> --state selected` | 使用已返回的模块代码；保留同课程号的多行关系。 |
| “查某专业的培养方案” | `jnu-cli program list --major <专业名> --page 1 --limit 10` | 根据结果再执行 `jnu-cli program item <id-or-planCode>`；不要猜方案代码。 |
| “还有哪些评教没做” | `jnu-cli evaluation summary`，再 `jnu-cli evaluation list` | 默认待评；列表只包含课程评估项，不代填问卷。 |
| “查看我的班级和校区” | `jnu-cli profile show` | 只展示本次需要的 `className` 和 `campus`。 |
| “CLI 为什么用不了” | `jnu-cli doctor`，必要时 `jnu-cli browser status` | 先检查本机环境，按结构化错误处理。 |

同一浏览器档案的命令应顺序运行。需要登录时让用户完成 `jnu-cli auth login`，然后原查询最多重试一次。
