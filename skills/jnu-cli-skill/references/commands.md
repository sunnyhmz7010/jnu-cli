# 校园命令路由

这是模块路由卡。精确输出结构和参数以已安装 CLI 的帮助及其随包 README 使用说明为准；也可查阅[仓库使用说明](https://github.com/sunnyhmz7010/jnu-cli#-使用说明)。

## 固定检查

```bash
jnu-cli doctor
jnu-cli auth status
```

仅在需要登录时让用户执行 `jnu-cli auth login`；用户在 CLI 打开的浏览器中完成登录。查询默认无界面，只有需要查看浏览器时添加 `--headed`。不要追加 `--json`。

## 按请求路由

| 用户意图 | 使用 | 避免 |
|---|---|---|
| 环境或登录态 | `doctor`，再 `auth status` | 索取密码或 Cookie |
| 浏览器选择 | `browser status`，再 `browser use <chrome\|edge\|chromium>` | 选择未安装浏览器或静默安装 |
| 今天或指定日期的我的课表 | `course today`；指定日期加 `--date YYYY-MM-DD` | 猜测教学周或使用其他人的课表 |
| 按周次、星期查询我的课表 | `course list --week <n> --weekday <1-7>` | 把默认当前教学周结果当成全部学期 |
| 培养方案要求 | `program list ...`，再 `program item <id-or-planCode>` | 把未修课程当作当前开课 |
| 剩余学分或未完成模块 | `completion summary`、`completion modules`；再用 `completion courses --module <moduleCode>` 深入 | 从成绩自行重算进度或触发重算 |
| 成绩 | `grade list`；按需加 `--term` | 自行重算 GPA、推断排名或在摘要足够时输出完整成绩表 |
| 考试安排 | `exam list`；按需加 `--term` | 把考场、座位的空值或未检查冲突当作确定结果 |
| 评教进度与待评项 | `evaluation summary`；`evaluation list --state pending\|completed\|all` | 提交评教或把问卷条数当作课程门数 |
| 本人学籍摘要或完整页面信息 | 摘要用 `profile status`；完整字段用 `profile show` | 指定他人身份或展示无关个人字段 |

`program list` 默认每页 10 条；通过 `--page` 和 `--limit` 分页，`--keyword`、`--grade`、`--department`、`--major` 筛选。详情的位置参数只使用列表返回的 `id` 或 `planCode`。

`completion courses` 的 `--state` 支持 `all`、`failed`、`passed`、`unread`、`pending`、`selected`；`--plan` 使用本人 `plans` 中的 `code`。没有已有结果时说明 `not-calculated`，不要把空记录当作完成。

`profile show` 的 `profile` 为学籍摘要，`fields` 按已核对页面顺序包含 39 个可见字段，每项提供 `name`、`label`、`value` 和 `displayValue`，包含证件和联系方式。只在回答中展示当前问题需要的字段；`profile status` 只返回学籍摘要。

教务命令支持 `--network system|direct`；默认 `direct`，禁用代理。只有显式添加 `--network system` 才沿用系统代理配置。仅影响本次浏览器，不修改全局网络，也不替代校园网络或 WebVPN。

## 回答形式

- 概述返回 JSON；除非用户要求，否则不要粘贴原始 JSON。
- 日期、名称、ID、模块重要时要准确给出；日期按 `Asia/Shanghai` 解释。
- 字段缺失或不确定时明确说明；不要推断 CLI 未返回的数据。
- 私人记录保持最小化：回答问题，不展示整个账户。
