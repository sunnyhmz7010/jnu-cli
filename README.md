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
| 环境诊断 | 检查 CLI、Node.js、Playwright、浏览器和档案目录 | `jnu-cli doctor` |
| 浏览器与认证 | 检查浏览器和当前登录状态，复用本机独立登录档案 | `jnu-cli browser status`<br>`jnu-cli auth status` |
| 个人课表 | 按教学周、星期或日期查询个人课程，处理调课与停课 | `jnu-cli course list`<br>`jnu-cli course today` |
| 个人成绩 | 查询全部学期有效成绩，按学期筛选，展示单科绩点 | `jnu-cli grade list` |
| 考试安排 | 查询考试时间、考场和座位信息 | `jnu-cli exam list` |
| 学业进度 | 查看培养方案已有的学分完成结果、模块和课程修读状态 | `jnu-cli completion summary`<br>`jnu-cli completion modules` |
| 培养方案 | 分页查询已发布方案，读取方案详情、课程模块和指导计划 | `jnu-cli program list --page 1` |
| 评教进度 | 查看评教统计和待评、已评的课程评估项 | `jnu-cli evaluation summary`<br>`jnu-cli evaluation list` |
| 个人信息 | 查询本人的院系、专业、班级、校区和学籍状态等常用信息 | `jnu-cli profile show` |

## ⚡ 快速开始

### 📋 前置要求

- Node.js 20 及以上版本和 npm。
- 已安装的 Microsoft Edge 或 Google Chrome，以及可显示浏览器窗口的桌面环境。
- 可正常访问暨大本科教务系统的网络和本人本科学生账户。（默认直连并禁用代理；用户明确需要系统代理时，在命令中添加 `--network system`。网络选择仅影响此次浏览器。）

### 📦 安装与运行

#### 从 npm 安装

```bash
npm install -g jnu-cli
```

安装后可直接使用 `jnu-cli` 命令。

#### 免安装运行

```bash
npx jnu-cli@latest
```

#### 检查运行环境

```bash
jnu-cli doctor
```

#### 查看浏览器状态

```bash
jnu-cli browser status
```

#### 登录

```bash
jnu-cli auth login
```

`auth login` 会打开一个持久化浏览器 profile。请用户手动完成暨南大学统一身份认证。学校会话到期后重新运行登录命令即可。

### 🤖 Agent Skill

配套 Skill 位于 [skills/jnu-cli-skill](skills/jnu-cli-skill/README.md)，随 npm 包发布。将整个 `jnu-cli-skill` 目录复制到你所用 AI Agent 能识别的 skills 目录中。

#### 推荐通用放置路径

`.agents/skills/` 是目前被 Codex、Gemini CLI、Cursor、OpenCode 等多个 Agent 共同支持的跨客户端标准路径。

```text
~/.agents/skills/jnu-cli-skill/
```

#### Codex 全局目录示例

```text
~/.codex/skills/jnu-cli-skill/
```

使用自定义 `CODEX_HOME` 时：

```text
$CODEX_HOME/skills/jnu-cli-skill/
```

#### Claude Code 全局目录示例

```text
~/.claude/skills/jnu-cli-skill/
```

## 📖 使用说明

### ⌨️ 命令形态

```bash
jnu-cli <domain> <action> [flags]
```

示例：

```bash
jnu-cli doctor
jnu-cli browser status
jnu-cli browser use chrome
jnu-cli auth status
jnu-cli auth login
jnu-cli course status
jnu-cli course list
jnu-cli course list --week 17 --weekday 2
jnu-cli course today
jnu-cli course today --date 2026-06-23
jnu-cli program status
jnu-cli program list --limit 5
jnu-cli program item <id-or-planCode>
jnu-cli grade status
jnu-cli grade list
jnu-cli grade list --term 2025-2026-1
jnu-cli completion status
jnu-cli completion summary
jnu-cli completion modules
jnu-cli completion courses --module <moduleCode>
jnu-cli exam status
jnu-cli exam list --term 2026-2027-1
jnu-cli evaluation status
jnu-cli evaluation summary
jnu-cli evaluation list --state pending
jnu-cli profile status
jnu-cli profile show
```

`jnu-cli doctor` 是无 action 的环境诊断命令；其他业务命令遵循上述 `<domain> <action>` 形式。

命令默认输出 JSON；`--help` 和 `--version` 输出文字。

### ⚙️ 常用参数

- `--headed`：状态检查和教务查询使用可见浏览器窗口，默认无界面。
- `auth login --headless`：登录默认显示浏览器；此参数供已有会话的无界面验证使用。
- `--url <entryUrl>`：覆盖认证或业务入口 URL，仅接受 HTTP/HTTPS。
- `--network system|direct`：认证和教务命令默认 `direct`，禁用代理。只有显式添加 `--network system` 才沿用系统代理配置。仅作用于本次浏览器进程，不修改全局代理或 DNS，也不替代校园网络或 WebVPN。
- `--term <termId>`：课表、成绩、考试和评教的学期筛选，格式为 `2026-2027-1` 或 `2026-2027-2`。
- `course list --week <n> --weekday <1-7>`：周次为 1 至 60，星期一为 1、星期日为 7。
- `course today --date YYYY-MM-DD`：查询指定日期，默认日期按 `Asia/Shanghai` 解释。
- `auth login --timeout <seconds>`：等待本人登录的时限，默认 300 秒，范围 1 至 1800 秒。
- `completion ... --timeout <seconds>`：学业完成查询总时限，默认 180 秒。
- `browser status`：查看可用浏览器、当前选择和对应的 CLI profile。
- `browser use <chrome|edge|chromium>`：选择浏览器；浏览器必须已安装。

浏览器后端支持 Google Chrome、Microsoft Edge 和已安装的 Playwright Chromium。`JNU_BROWSER` 优先于保存的选择；未指定时检测已安装浏览器。默认数据目录为 `~/.jnu-cli/`，可用 `JNU_CLI_HOME` 覆盖。各浏览器使用独立的 `browser-profiles/<browser>/`，同一档案的命令应顺序执行。

### 🧾 JSON 包装结构

成功：

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "command": "course list",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct"
  }
}
```

字段以当前 CLI 实际返回为准；业务响应和结构化错误写入 stdout，登录提示写入 stderr。`meta.backend` 为 `playwright`；`meta.school` 为 `jnu`，`meta.audience` 为 `undergraduate`。认证与环境命令的 `gateway` 为 `auto`，教务查询成功时为 `direct`；失败时为 `auto`。教务与认证命令在 `meta.network` 中保留网络选择，业务来源存在时附带 `meta.sourceUrl`。

失败：

```json
{
  "ok": false,
  "error": {
    "code": "LOGIN_REQUIRED",
    "message": "浏览器 profile 尚未登录。",
    "hint": "运行 jnu-cli auth login 并在浏览器中完成登录。"
  },
  "meta": {
    "command": "course list",
    "gateway": "auto",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct"
  }
}
```

### 🚨 错误码

- `BACKEND_UNAVAILABLE`：浏览器后端不可用。
- `BROWSER_UNAVAILABLE`：当前选择的浏览器未安装、无法启动或档案被占用。
- `BROWSER_SELECTION_INVALID`：浏览器选择不是 chrome、edge 或 chromium。
- `BROWSER_CONFIG_INVALID`：保存的浏览器配置无效。
- `AUTH_LOGIN_TIMEOUT`：本人登录流程在限定时间内没有完成。
- `LOGIN_REQUIRED`：目标服务需要登录。
- `NETWORK_REQUIRED`：当前网络无法访问目标服务，或目标服务暂时不可用。
- `PERMISSION_DENIED`：当前账号或角色无权访问。
- `PAGE_CHANGED`：页面结构、业务上下文或身份与预期不一致。
- `API_ERROR`：接口业务失败或返回了不符合请求条件的记录。
- `INCOMPLETE_DATA`：分页、记录数量或模块关系未通过完整性校验。
- `RATE_LIMITED`：远端服务限制请求。
- `PROGRAM_NOT_FOUND`：培养方案不存在，或不属于当前学生的个人方案。
- `CALCULATION_TIMEOUT`：学业完成查询超时。
- `MODULE_NOT_FOUND`：学业完成中找不到指定模块。
- `UNSUPPORTED_ACTION`：命令或动作尚未实现。
- `UNKNOWN_ERROR`：参数解析失败或未分类错误。

### 🔢 退出码

- `0`：命令成功；登录状态需另看 `data.loggedIn`。
- `1`：参数解析失败或通用失败。
- `2`：命令或动作未实现。
- `10`：浏览器后端不可用。
- `11`：需要登录。
- `12`：目标服务网络不可达或暂时不可用。
- `13`：无权访问。
- `15`：浏览器不可用或档案被占用。
- `19`：浏览器选择无效。
- `20`：配置、页面、接口或数据完整性检查失败。
- `23`：培养方案不存在或不属于本人。
- `24`：学业完成查询超时。
- `25`：模块不存在。
- `30`：请求被限流。
- `39`：等待本人登录超时。

### 🩺 环境诊断 Schema

`jnu-cli doctor` 只读取本机环境，不启动浏览器、不访问学校服务，也不创建配置或登录档案。`node.ok` 表示最低 Node.js 版本检查结果，`playwright.installed` 表示依赖能否加载，`browser.browsers` 列出浏览器可用性。命令成功只表示诊断已完成，仍需检查这些字段。

```json
{
  "ok": true,
  "data": {
    "cli": {
      "name": "jnu-cli",
      "version": "0.1.0"
    },
    "node": {
      "version": "24.12.0",
      "ok": true,
      "minimumMajor": 20
    },
    "platform": {
      "os": "linux",
      "arch": "x64"
    },
    "home": {
      "path": "/home/example/.jnu-cli"
    },
    "profile": {
      "path": "/home/example/.jnu-cli/browser-profiles/chrome"
    },
    "playwright": {
      "installed": true
    },
    "browser": {
      "selected": {
        "id": "chrome",
        "label": "Google Chrome",
        "channel": "chrome",
        "source": "detected",
        "profilePath": "/home/example/.jnu-cli/browser-profiles/chrome"
      },
      "browsers": {
        "edge": {
          "id": "edge",
          "label": "Microsoft Edge",
          "channel": "msedge",
          "installed": false,
          "profilePath": "/home/example/.jnu-cli/browser-profiles/edge"
        },
        "chrome": {
          "id": "chrome",
          "label": "Google Chrome",
          "channel": "chrome",
          "installed": true,
          "profilePath": "/home/example/.jnu-cli/browser-profiles/chrome"
        },
        "chromium": {
          "id": "chromium",
          "label": "Playwright Chromium",
          "channel": null,
          "installed": false,
          "profilePath": "/home/example/.jnu-cli/browser-profiles/chromium"
        }
      },
      "channel": "chrome",
      "profileMode": "persistent"
    }
  },
  "meta": {
    "command": "doctor",
    "gateway": "auto",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate"
  }
}
```

### 🔑 认证与浏览器输出

`jnu-cli auth status` 返回 `loggedIn`、`reason`、`profileExists`、`profilePath`，必要时给出 `hint`。未建立档案或需要重新登录时，仍可 `ok=true`、`loggedIn=false`；网络、权限或页面错误不会伪装成未登录。

`jnu-cli auth login` 由本人在可见浏览器里完成统一身份认证。CLI 验证本科课表访问后自动关闭窗口，再重开同一档案验证会话可复用，成功返回 `loggedIn=true`、`persisted=true`，以及 `opened`、`closed`、`url`、`profilePath` 和 `backend`。

`browser status` 返回 `selected` 和 `browsers`，结构同诊断结果中的对应字段。`browser use` 保存已安装浏览器的选择，返回 `id`、`label`、`channel`、`source`、`profilePath`；`source` 为 `saved`。浏览器选择不等于已经登录，切换后需检查对应档案的登录状态。

### 📤 输出规则

- JSON key 使用 `camelCase`。
- 列表始终使用数组，即使为空。
- 日期尽量使用 ISO 8601。
- 业务响应的 stdout 保持为单个 JSON 结果；帮助和版本命令除外。
- 不输出 Cookie、Token、临时认证票据或原始个人档案。课表和成绩不附加姓名、学号；本人信息查询只返回下述白名单字段，Agent 只回显本次请求所需内容。

### 📅 我的课表列表 Schema

`jnu-cli course list` 返回暨大本科教务的个人课表，不暴露姓名或学号。

```json
{
  "ok": true,
  "data": {
    "term": {
      "id": "2025-2026-2",
      "name": "2025-2026学年第二学期",
      "year": "2025-2026",
      "semester": "2",
      "currentWeek": 16
    },
    "items": [
      {
        "courseCode": "COURSE-001",
        "courseName": "示例课程",
        "section": "01",
        "teachers": [
          "示例教师"
        ],
        "weeksText": "1-17周",
        "weekday": 2,
        "startSection": 3,
        "endSection": 4,
        "location": "示例教室",
        "campus": "01",
        "rawId": "teaching-class-001",
        "weekMask": "11111111111111111",
        "campusName": "示例校区",
        "scheduleId": "schedule-001",
        "adjusted": false
      }
    ],
    "extraItems": {
      "unlisted": []
    },
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/wdkb/",
    "filters": {},
    "completeness": {
      "complete": true,
      "scheduledRows": 1,
      "pages": 1,
      "adjustmentRows": 0
    }
  },
  "meta": {
    "command": "course list",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/wdkb/"
  }
}
```

`jnu-cli course list` 可用 `--term <termId>`、`--week <n>` 和 `--weekday <1-7>` 过滤课表，其中星期一为 `1`、星期日为 `7`。`jnu-cli course today` 返回同样的课程 item 结构，但按上海时区日期和学校返回的教学周过滤；使用 `--date YYYY-MM-DD` 可查询指定日期。`jnu-cli course status` 只检查访问状态，返回 `loggedIn`、`reason`、`term` 和 `sourceUrl`。

`list` 默认筛选当前教学周；学校没有提供当前教学周时，列表保留所读学期的排课。`today` 在没有有效教学周时返回空 `items` 和 `reason=no-teaching-week`。历史学期查询已有合成测试，尚未完成真实账户验收。

`items` 已合并调课并移除停课对应周次；`weeksText` 与有效 `weekMask` 一致。`adjusted` 标记调整后的安排；新校区没有来源时保留 `null`。未排课课程在 `extraItems.unlisted`，`completeness` 表示基础排课分页与调课记录是否完整。

### 📚 培养方案 Schema

`jnu-cli program list` 返回已发布的全校培养方案摘要。可用 `--keyword`、`--grade`、`--department`、`--major`、`--page` 和 `--limit` 缩小结果范围。

```json
{
  "ok": true,
  "data": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "filters": {
      "grade": "2025"
    },
    "items": [
      {
        "id": "program-001",
        "planCode": "2025-050101-01",
        "title": "2025级示例专业主修培养方案",
        "grade": "2025",
        "department": "示例学院",
        "major": "示例专业",
        "direction": null,
        "minimumCredits": 160,
        "durationYears": 4,
        "degree": "文学学士",
        "startYear": "2025-2026学年",
        "startSemester": "第一学期",
        "status": "99",
        "published": true
      }
    ],
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/qxfacx/",
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 1,
      "totalPages": 1,
      "hasMore": false
    },
    "completeness": {
      "complete": true,
      "scope": "page"
    }
  },
  "meta": {
    "command": "program list",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/qxfacx/"
  }
}
```

`jnu-cli program status` 只检查访问状态，返回 `loggedIn`、`reason`、`total` 和 `sourceUrl`。

`jnu-cli program item <id-or-planCode>` 返回一个已发布培养方案详情。参数使用 `program list` 返回的 `id` 或 `planCode`。

```json
{
  "ok": true,
  "data": {
    "summary": {
      "id": "program-001",
      "planCode": "2025-050101-01",
      "title": "2025级示例专业主修培养方案",
      "grade": "2025",
      "department": "示例学院",
      "major": "示例专业",
      "minimumCredits": 160
    },
    "detail": {
      "trainingObjectives": null,
      "graduationRequirements": null,
      "mainSubjects": [],
      "coreCourses": [],
      "notes": [],
      "features": null
    },
    "modules": [
      {
        "id": "module-002",
        "groupCode": "group-basic",
        "parentGroupCode": null,
        "name": "示例课程模块",
        "type": "课组",
        "category": "示例类别",
        "courseNature": "必修",
        "requiredCredits": 20,
        "totalCredits": 20,
        "totalHours": 360,
        "courseCount": 6,
        "order": 1
      }
    ],
    "courses": [
      {
        "id": "course-001",
        "groupCode": "group-basic",
        "courseCode": "COURSE-001",
        "courseName": "示例课程",
        "credits": 3,
        "hours": 54,
        "termId": "2025-2026-1",
        "termName": "2025-2026学年第一学期",
        "recommendedSemester": 1,
        "courseNature": "必修",
        "examType": "考试",
        "order": 1
      }
    ],
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/qxfacx/",
    "guidance": [],
    "completeness": {
      "complete": true,
      "modules": 1,
      "courses": 1,
      "guidance": 0
    }
  },
  "meta": {
    "command": "program item",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/qxfacx/"
  }
}
```

列表默认 `--page 1 --limit 10`；`page`、`limit` 均为正整数。`completeness.scope=page` 只表示本页完整，不会默认读取全校全部方案。`id` 没有来源时为 `null`，可以改用 `planCode`。

详情中的模块保留父子关系，另有 `tree`；课程通过 `groupCode` 关联模块，`guidance` 为指导计划。`detail` 的文字字段无来源时为 `null`，列表字段为空数组，不补造培养目标或毕业要求。模块重复、层级循环或课程引用缺失模块时明确失败。详情还返回 `plan`、`items` 等辅助字段，与 `summary`、`courses` 对应。

### 📊 成绩列表 Schema

`jnu-cli grade list` 返回暨大本科教务的有效成绩记录，不暴露姓名或学号。

使用 `--term <termId>` 过滤单个学期，例如 `--term 2025-2026-1`。

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "termId": "2025-2026-1",
        "termName": "2025-2026学年第一学期",
        "courseCode": "COURSE-001",
        "courseName": "示例课程",
        "courseNatureCode": "02",
        "courseNature": "选修",
        "credit": 2,
        "earnedCredit": 2,
        "score": "90",
        "gradePoint": 3.5,
        "section": "02",
        "examDate": "2026-01-18",
        "valid": true,
        "rawId": "grade-001",
        "numericScore": 90
      }
    ],
    "terms": [
      {
        "termId": "2025-2026-1",
        "termName": "2025-2026学年第一学期",
        "itemCount": 1
      }
    ],
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/cjcx/",
    "filters": {
      "term": null,
      "validOnly": true,
      "highestOnly": false
    },
    "completeness": {
      "complete": true,
      "allTermRecords": 1,
      "pages": 1
    },
    "gpa": null,
    "gpaNote": "尚未核实累计或学期 GPA 规则，仅展示系统给出的单科绩点。"
  },
  "meta": {
    "command": "grade list",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/cjcx/"
  }
}
```

`jnu-cli grade status` 只检查访问状态，返回 `loggedIn`、`reason`、`total`、`terms` 和 `sourceUrl`。

默认读取全部学期的有效成绩，不沿用网页最近两个学期的过滤，也不只保留最高成绩。`score` 保留展示值，`numericScore` 和 `gradePoint` 保留学校提供的数值；缺失值不补零。`terms` 只提供学期标识、名称和 `itemCount`，不计算学期或累计 GPA、学分汇总、排名；`gpa=null`。

### 🎓 学业完成 Schema

学业完成只读取本人方案的已有计算结果，不触发重算。查询总时限默认 180 秒，可用 `--timeout <seconds>` 修改。使用 `--plan <planCode>` 选择本人 `plans` 中的 `code`。

`jnu-cli completion summary` 返回培养方案层面的学分汇总。`completion modules` 额外返回模块行：

```json
{
  "ok": true,
  "data": {
    "plan": {
      "planCode": "plan-code",
      "planName": "2025级示例专业主修培养方案",
      "requiredCredits": 150,
      "completedCredits": 90,
      "selectedCredits": 100,
      "actualCompletedCredits": 88,
      "outsidePlanCredits": 2,
      "remainingCredits": 60,
      "note": null
    },
    "calculation": {
      "state": "completed",
      "source": "stored-result",
      "calculatedAt": "2026-10-20 12:00:00"
    },
    "items": [
      {
        "moduleCode": "module-code",
        "parentModuleCode": null,
        "moduleName": "公共基础课程",
        "moduleTypeCode": "01",
        "courseCategoryCode": "01",
        "requiredCredits": 20,
        "completedCredits": 16,
        "selectedCredits": 18,
        "remainingCredits": 4,
        "requiredCourseCount": 10,
        "completedCourseCount": 8,
        "passed": false,
        "storedSelectedCredits": 18,
        "currentSelectedCredits": 4
      }
    ],
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/xywccx/",
    "plans": [
      {
        "code": "plan-code",
        "name": "2025级示例专业主修培养方案"
      }
    ],
    "summary": {
      "requiredCredits": 150,
      "completedCredits": 90,
      "storedSelectedCredits": 100,
      "currentSelectedCredits": 12
    },
    "currentTerm": {
      "id": "2026-2027-1",
      "name": "2026-2027学年第一学期"
    },
    "selectionTerm": {
      "id": "2026-2027-1",
      "name": "2026-2027学年第一学期"
    },
    "completeness": {
      "complete": true,
      "modules": 1,
      "pages": 1
    }
  },
  "meta": {
    "command": "completion modules",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/xywccx/"
  }
}
```

把返回的 `moduleCode` 传给 `jnu-cli completion courses --module <moduleCode>`。`items` 包含课程号、名称、`credit`、`hours`、`statusCode`、`state`、`status`、`statusName`、`passed`、`selected`、`score`、`numericScore`、`termId`、`nature`，以及 `planCode`、`moduleCode`、`source`。

`status` 可能为 `completed`、`selected`、`not-taken` 或 `unknown`；原中文状态保存在 `statusName`。`not-taken` 表示方案候选课程，不保证当前开课或可选。`--state` 支持 `all`、`failed`、`passed`、`unread`、`pending`、`selected`，分别筛选全部、未通过、通过、未修读、未修读待选、已选课。非数值成绩不会转换为零分。

课程合并已有结果与当前选课，同课程号的当前选课行全部保留，`source` 区分 `stored-result` 与 `current-selection`。方案与模块上的 `selectedCredits`、`storedSelectedCredits` 是已有结果；摘要、模块行、模块树及课程查询的 `module` 均通过 `currentSelectedCredits` 单独返回当前查询值，不能把新旧学分相加。模块列表逐模块补查，课程列表仅补查所选模块；补查失败时返回错误，不使用旧值伪装成功。`currentTerm` 与 `selectionTerm` 分别表示教学学期和选课学期，不能混用。

没有已有结果时返回 `calculation.state=not-calculated`、`summary=null`，并给出 `no-stored-result` 或 `no-personal-plan`；模块和课程列表为空。`status` 返回 `loggedIn`、`reason`、`calculation`、`sourceUrl`，仍需检查计算状态。

查询超时返回 `CALCULATION_TIMEOUT`，`error.details.timeoutSeconds` 为本次时限。未知模块返回 `MODULE_NOT_FOUND`。

### 📝 考试安排 Schema

`jnu-cli exam list` 返回本人考试安排，默认学期来自考试应用，可用 `--term <termId>` 覆盖。`exam status` 返回同样的只读查询结构。

```json
{
  "ok": true,
  "data": {
    "term": {
      "id": "2026-2027-1",
      "name": "2026-2027学年第一学期"
    },
    "serverTime": "2026-10-22 12:00:00",
    "items": [
      {
        "examCode": "exam-001",
        "examName": "示例考试",
        "courseCode": "COURSE-001",
        "courseName": "示例课程",
        "termId": "2026-2027-1",
        "date": "2027-01-10",
        "timeDisplay": "09:00-11:00",
        "room": null,
        "seat": null,
        "needsArrangement": "1",
        "timeArranged": "1",
        "taskState": null,
        "timePublished": null
      }
    ],
    "conflictCheck": {
      "status": "not-checked",
      "hasConflicts": null
    },
    "completeness": {
      "complete": true,
      "scope": "term",
      "records": 1
    },
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/studentWdksapApp/"
  },
  "meta": {
    "command": "exam list",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/studentWdksapApp/"
  }
}
```

`room`、`seat` 缺失时为 `null`；不因任务或发布标志为空丢弃考试。`serverTime` 来自学校。`conflictCheck.status=not-checked` 表示尚未核验冲突，`hasConflicts=null` 不能解释为没有冲突。

### 📋 评教进度 Schema

`jnu-cli evaluation summary` 和 `evaluation status` 返回 `term`、`progress`、`serverTime`、`currentByType`、`historyByType`、`sourceUrl`。学期来自评教配置，可用 `--term` 覆盖，不以课表学期代替。

`jnu-cli evaluation list` 在摘要上增加 `filters`、`items`、`completeness`。默认待评，可用 `--state pending|completed|all` 选择。

```json
{
  "ok": true,
  "data": {
    "term": {
      "id": "2026-2027-1",
      "name": "2026-2027学年第一学期",
      "configuredId": "2026-2027-1"
    },
    "progress": {
      "pending": 1,
      "completed": 0,
      "total": 1,
      "state": "pending"
    },
    "serverTime": "2026-10-22 12:00:00",
    "currentByType": {
      "courseAssessment": 1,
      "endOfTerm": 0,
      "classroom": 0
    },
    "historyByType": {
      "courseAssessment": 2,
      "endOfTerm": 0,
      "classroom": 0
    },
    "filters": {
      "state": "pending",
      "assessmentType": "05"
    },
    "items": [
      {
        "questionnaireCode": "questionnaire-001",
        "batchCode": "batch-001",
        "questionnaireName": "示例课程评估",
        "courseCode": null,
        "courseName": null,
        "startTime": "2026-10-20 00:00:00",
        "endTime": "2026-10-30 23:59:59",
        "evaluated": false
      }
    ],
    "completeness": {
      "complete": true,
      "scope": "course-assessment",
      "records": 1,
      "pages": 1
    },
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/wspjyyapp/"
  },
  "meta": {
    "command": "evaluation list",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/wspjyyapp/"
  }
}
```

`progress` 区分待评、已评和总数，总数为零时 `state=no-tasks`。`currentByType` 与 `historyByType` 分别表示来源不同的类别统计。

列表范围为 `course-assessment`（课程评估），每条记录是问卷或评教项，不能直接当成课程门数；课程号、课程名可以为空。期末和随堂评教目前只有类别计数，独立列表未适配；非零待评的真实页面显示与截止状态尚未验收。不读取答案或提交评教。

### 👤 本人信息 Schema

`jnu-cli profile show` 和 `profile status` 只读本人常用学籍信息，两次验证当前学生身份及记录标识一致；不接受他人学号参数。

```json
{
  "ok": true,
  "data": {
    "profile": {
      "studentId": "example-student",
      "name": "示例同学",
      "department": {
        "code": "example-department",
        "name": "示例学院"
      },
      "major": {
        "code": "example-major",
        "name": "示例专业"
      },
      "direction": {
        "code": null,
        "name": null
      },
      "grade": {
        "code": "2025",
        "name": "2025级"
      },
      "admissionGrade": {
        "code": "2025",
        "name": "2025级"
      },
      "campus": {
        "code": "example-campus",
        "name": "示例校区"
      },
      "className": "示例班级",
      "studentCategory": {
        "code": null,
        "name": null
      },
      "trainingLevel": {
        "code": null,
        "name": null
      },
      "registered": {
        "code": "1",
        "name": "是"
      },
      "onCampus": {
        "code": "1",
        "name": "是"
      },
      "enrollmentStatus": {
        "code": null,
        "name": null
      }
    },
    "verified": true,
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/xjxxbg/"
  },
  "meta": {
    "command": "profile show",
    "gateway": "direct",
    "backend": "playwright",
    "school": "jnu",
    "audience": "undergraduate",
    "network": "direct",
    "sourceUrl": "https://jw.jnu.edu.cn/jwapp/sys/xjxxbg/"
  }
}
```

编码字段同时保留 `code` 和 `name`，缺失值为 `null`。证件号、电话、邮箱、地址、银行卡等不进入结果，不输出原始档案。

## 🧠 功能细节

- 登录态保存在本机：后续命令复用 `~/.jnu-cli/browser-profiles/<browser>/` 下的登录态。可用 `JNU_CLI_HOME` 指定存储目录；同一档案的命令应顺序执行。
- 通过正常网页访问业务：使用 Playwright 打开独立浏览器窗口，经过学校统一身份认证和本科教务门户进入对应服务，再在业务页中执行同源查询。登录默认显示浏览器窗口，状态检查和业务查询默认无界面，可用 `--headed` 显示。
- 默认直连：登录和查询均禁用代理；需要使用系统代理配置时，显式添加 `--network system`，例如 `jnu-cli auth login --network system`。网络选择仅影响此次浏览器，不修改全局网络配置。

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
│   ├── doctor.js            # 本机环境诊断
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
│   └── format.js            # 数据格式化辅助
├── skills/jnu-cli-skill/     # Agent Skill 与命令参考
├── tests/                   # 合成业务及 CLI 测试
├── scripts/                 # 项目检查与测试入口
└── .github/ISSUE_TEMPLATE/   # 问题反馈模板
```

## 👨‍💻 本地开发

### 🧰 环境

- Node.js >= 20 和 npm

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

## 🔐 安全报告

如果发现安全问题，请不要公开披露细节。请优先参考仓库中的 [SECURITY.md](./SECURITY.md) 提交安全报告。

## 📄 许可证

本项目基于 [GPL-3.0](./LICENSE) 开源。

<div align="center">
  <sub>Built with ❤️ by Sunny</sub>
</div>
