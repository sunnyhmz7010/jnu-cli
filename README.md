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

命令默认输出结构化 JSON，完整参数与字段说明见下方「使用说明」。

## ⚡ 快速开始

### 📋 前置要求

- Node.js 20 及以上版本和 npm。
- 已安装的 Microsoft Edge 或 Google Chrome，以及可显示浏览器窗口的桌面环境。
- 可正常访问暨大本科教务系统的网络和本人本科学生账户。

### 📦 安装与运行

```bash
npm install -g jnu-cli
jnu-cli doctor
jnu-cli browser status
jnu-cli auth login
jnu-cli auth status
jnu-cli course today
```

也可免全局安装运行，例如 `npx jnu-cli@latest --help`。

`auth login` 会打开一个持久化浏览器 profile。你在正常网页里完成统一身份认证后，CLI 会验证本科课表访问，再关闭并重新打开同一档案，确认登录态可复用后返回成功。学校会话到期后重新运行登录命令即可。

## 📖 使用说明

安装后使用 `jnu-cli` 运行，执行 `jnu-cli --help` 查看已支持命令。命令形式和公共字段参考 [szu-cli CLI 契约](https://github.com/AwesomeHou/szu-cli/blob/406e5627494e404203752746fbc97ddc3a06a932/docs/cli-contract.md)。命令默认输出 JSON；`--help` 和 `--version` 输出文字。支持 Google Chrome、Microsoft Edge 和已安装的 Playwright Chromium。

### 🩺 环境诊断

```bash
jnu-cli doctor
```

诊断只读取本机环境，返回 `cli`、`node`、`platform`、`home`、`profile`、`playwright` 和 `browser`。`node.ok` 表示 Node.js 是否满足最低版本，`playwright.installed` 表示依赖是否可加载，`browser` 列出浏览器可用性和当前选择。目录路径只作展示，检查不会创建配置或登录档案。登录状态使用 `jnu-cli auth status` 检查。

### 🔑 登录与浏览器

```bash
jnu-cli browser status
jnu-cli browser use edge
jnu-cli auth login --timeout 900 --network direct
jnu-cli auth status --network direct
```

`browser status` 只检查浏览器与配置，不建立登录档案。`browser use` 保存选择，不安装浏览器。`JNU_BROWSER` 的优先级高于保存的选择；未指定时检测已安装浏览器。Chromium 需要本人事先安装 Playwright 对应的浏览器，程序不会自动下载。

默认目录是 `~/.jnu-cli/`，可用 `JNU_CLI_HOME` 指定。登录档案按浏览器隔离，不共享常用浏览器的会话。不要并行执行占用同一档案的命令。

登录默认等待 300 秒，`--timeout` 可设为 1 至 1800 秒。本人正常完成认证后，CLI 进入本科课表并验证业务响应，再关闭和重开档案验证，成功才返回 `persisted=true`。状态命令在未登录时成功返回 `loggedIn=false`，查询则返回 `LOGIN_REQUIRED`。

登录默认打开可见浏览器，可用 `--headless` 复用已有会话；状态检查与业务查询默认无界面，添加 `--headed` 可显示浏览器。`--url` 可覆盖认证或对应业务入口。程序仍使用独立档案和正常的会话恢复功能，不导出、复制或延长学校 Cookie。

### 🌐 网络选项

所有教务命令支持 `--network system|direct`：

- `system`：默认值，沿用系统网络配置。
- `direct`：仅让此次 CLI 浏览器直连，不修改全局代理或 DNS。

登录后的重启检查沿用同一选项，后续查询也应使用适合当前环境的路径。JSON 的 `meta.network` 标明本次选择。此选项与 WebVPN 无关，WebVPN 尚未适配。

在一台 Windows 机器上，代理 DNS 与系统 DNS 选择了不同的学校公开 WAF 节点，前者的认证链路间歇出现 502；同一代理使用系统解析得到的公开 WAF 地址时正常。`--network direct` 已在该环境通过真实验收。程序不固定这些地址，不在失败后自动切换路径，也不将网络错误当作需要重新登录。

### 📅 个人课表

```bash
jnu-cli course status --network direct
jnu-cli course list --network direct
jnu-cli course list --week 7 --weekday 3 --network direct
jnu-cli course list --weekday 3 --network direct
jnu-cli course list --term 2025-2026-2 --network direct
jnu-cli course today --date 2026-10-22 --network direct
```

`status` 核验课表访问，返回 `loggedIn`、`reason`、`term` 和 `sourceUrl`。`list` 默认筛选当前教学周；可用 `--term` 选择学期，`--week` 指定周次，`--weekday` 指定周一至周日的 1 至 7。

日期按 `Asia/Shanghai` 解释。当天或指定日期查询向学校传递目标日期，由校历接口确定教学周；没有有效教学周时返回空结果和 `no-teaching-week`。

接口取自 `/jwapp/sys/wdkb/modules/`：

| 接口 | 用途 |
|---|---|
| `jshkcb/dqxnxq.do` | 当前学期 |
| `jshkcb/dqzc.do` | 目标日期的教学周 |
| `xskcb/xskcb.do` | 基础排课 |
| `xskcb/xsdkkc.do` | 调课和停课 |
| `xskcb/xswpkc.do` | 未排课课程 |

按 `SKZC` 位图判断周次，按 `KBID` 删除调整涉及的原周次，再生成新安排；停课不生成新课。输出 `weeksText` 与有效位图一致。调课教师使用页面显示字段，新校区未提供时保留 `null`。

主列表在 `items`，未排课课程在 `extraItems.unlisted`；`completeness` 标明基础排课数量、分页数及调课记录数。全学期列表中的同一课程可能因时间、地点或有效周次不同出现多项。

### 📊 个人成绩

```bash
jnu-cli grade status --network direct
jnu-cli grade list --network direct
jnu-cli grade list --term 2025-2026-2 --network direct
```

接口为 `/jwapp/sys/cjcx/modules/cjcx/xscjcx.do`。查询有效成绩，关闭仅最高成绩限制，取得全部分页后再按学期筛选；默认不沿用网页最近两个学期的过滤。

展示成绩来自 `XSZCJMC`，兼容等级与数值成绩；`numericScore` 保留 `ZCJ`，单科 `gradePoint` 来自 `XFJD`，缺失值不补零。累计 GPA 规则未核实，`gpa=null`。

分页依据 `totalSize` 与实际累计条数，不使用偶尔为零的 `totalPage`。重复页、重复记录标识、总数变化和提前空页均返回错误，避免把不完整列表标为完整。

### 📝 考试安排

```bash
jnu-cli exam status --network direct
jnu-cli exam list --network direct
jnu-cli exam list --term 2026-2027-1 --network direct
```

默认使用考试应用返回的当前学期。主列表请求将学期和排序包装为 `requestParamStr`，接口为 `/jwapp/sys/studentWdksapApp/WdksapController/cxxsksap.do`。

此接口按学期一次返回数组，已核对的 `totalSize=-1` 不作为分页总数。保留尚未提供的考场、座位为 `null`；不因任务或发布时间标志为空而丢弃考试。`serverTime` 来自学校服务器时间。

`conflictCheck.status=not-checked`、`hasConflicts=null`：考试冲突核验未适配，不能将该结果解释为没有冲突。此前页面附带的冲突接口返回业务错误，尚无成功样本。

### 🎓 学业完成

```bash
jnu-cli completion status --network direct
jnu-cli completion summary --network direct
jnu-cli completion modules --network direct
jnu-cli completion courses --module MODULE_CODE --network direct
jnu-cli completion courses --module MODULE_CODE --state selected --network direct
```

将 `MODULE_CODE` 替换为 `completion modules` 返回的模块 `moduleCode`。可用 `--plan` 选择 `plans` 中的本人方案，不能传入其他学生身份或任意外部方案。主要接口位于 `/jwapp/sys/xywccx/modules/xywccx/`。

先读取 `grpyfacx` 个人方案和 `cxxsscfa` 已有计算结果，再查询摘要和模块。已有结果返回 `calculation.state=completed` 和 `calculation.source=stored-result`；没有已有结果时返回 `calculation.state=not-calculated` 和原因。查询不触发重算。`--timeout` 指定查询总时限，默认 180 秒。

`plan` 提供 `planCode`、`planName`、`requiredCredits`、`completedCredits`、`remainingCredits` 等通用字段。摘要中的 `storedSelectedCredits` 是已有结果的选课学分，`currentSelectedCredits` 来自页面补充查询；模块上的 `storedSelectedCredits` 保留已有模块结果。当前教学学期和选课学期分别读取。

`modules` 返回扁平 `items` 和保留父子关系的 `tree`。模块课程先完整取得已计算列表与当前选课，按当前选课的课程号排除缓存侧重合，再追加全部当前选课行；同一课程号的多行关系不会合并丢失。当前选课的方案、模块字段为空时，关联关系来自已验证的请求上下文。

`--state` 支持 `all`、`failed`、`passed`、`unread`、`pending`、`selected`，对应全部、未通过、通过、未修读、未修读待选、已选课。按合并后的完整列表筛选；`SFTG=4` 表示已选课，不依赖可能为空的 `SFXK`。`status` 使用 `completed`、`selected`、`not-taken`、`unknown`，原中文显示值保存在 `statusName`；`score` 保留原展示值，非数值状态不转换为零分。

### 📚 培养方案

```bash
jnu-cli program list --page 1 --limit 10 --network direct
jnu-cli program list --page 2 --network direct
jnu-cli program item PLAN_CODE --network direct
```

将 `PLAN_CODE` 替换为列表的 `id` 或 `planCode`，详情使用位置参数。默认每页 10 条，`--limit` 指定每页条数，`--page` 指定页码，两者均为正整数；可用 `--keyword`、`--grade`、`--department`、`--major` 筛选。列表顶层返回 `total`、`page`、`pageSize`、`filters`、`items`，方案名称为 `title`；`completeness.scope=page` 只表示本页完整，不会默认下载全校方案。

列表使用 `/jwapp/sys/qxfacx/modules/pyfacxepg/qxpyfacxzl.do`，保持已发布方案过滤。详情使用共享路径 `/jwapp/sys/jwpubapp/modules/pyfa/` 下的 `qxpyfacx`、`kzcx`、`kzkccx`、`faxqcx`，分别取得摘要、模块、课程关系和指导计划。

详情返回 `summary`、`detail`、`modules` 和 `courses`，并保留指导计划与模块树。完整读取各组分页，保留模块 `KZH/FKZH` 层级、课程的模块关联及数值字段的空值。模块代码重复、层级循环或课程引用未返回模块时明确失败。

### 📋 评教进度

```bash
jnu-cli evaluation summary --network direct
jnu-cli evaluation summary --term 2026-2027-1 --network direct
jnu-cli evaluation list --network direct
jnu-cli evaluation list --state completed --network direct
jnu-cli evaluation list --state all --network direct
```

默认学期来自评教配置 `PJXNXQ`，`--term` 可覆盖查询；不能直接沿用课表当前学期。接口位于 `/jwapp/sys/wspjyyapp/modules/xspj/`。

`progress` 使用 `WPS/YPS/ZS` 的真实数值校验待评、已评和总数；总数为零时状态是 `no-tasks`。缺失字段、业务失败和不一致统计不会补零。`currentByType` 与 `historyByType` 分别保留来源不同的类别计数。

列表默认待评，支持 `pending|completed|all`，当前范围明确为 `course-assessment`（课程评估，`PGLXDM=05`），保留页面的开放和发布过滤。记录是问卷或评教项，不能直接当作课程门数；课程号和课程名允许为空。

列表保留问卷、批次、起止时间和是否已评，服务器时间供调用方参考。期末与随堂评教目前只提供分类计数，独立列表、非零待评的真实显示与截止状态尚未验收。程序不读取答案或提交评教。

### 👤 本人个人信息

```bash
jnu-cli profile status --network direct
jnu-cli profile show --network direct
```

从当前业务页读取本人身份，先以 `XH` 查询，再用返回的本人 `WID` 读取同一条档案；两次身份与记录标识必须一致。接口为 `/jwapp/sys/xjxxbg/modules/xsxxbgsq/cxxsjbxx.do`，不接受指定他人学号的参数。

`profile` 只包含学号、姓名、院系、专业、方向、年级、入学年级、校区、班级、学生类别、培养层次、在籍、在校和学籍状态。编码字段同时保留 `code` 与学校的显示名称 `name`；班级使用 `BJMC`，空值保留 `null`。

证件号、电话、邮箱、地址、银行卡等字段不进入结果；不输出原始档案。`status` 同样执行实际只读验证并返回上述白名单数据。

### 🔢 JSON 与退出码

成功返回 `{ "ok": true, "data": {}, "meta": {} }`，失败返回 `{ "ok": false, "error": {}, "meta": {} }`。`meta` 标明命令、学校、本科生角色、浏览器后端与网络选择。错误不附带原始业务记录或带临时票据的完整 URL。

| 退出码 | 含义 |
|---|---|
| 0 | 命令成功；登录状态需另看 `loggedIn` |
| 1 | 参数解析失败或其他未分类错误 |
| 2 | 命令或动作未实现 |
| 11 | 需要正常登录 |
| 12 | 网络或教务服务不可用 |
| 13 | 当前角色无权限 |
| 15 | 浏览器不可用或档案被占用 |
| 19 | 浏览器选择无效 |
| 20 | 配置、页面、接口或完整性检查失败 |
| 23 | 培养方案不存在或不属于本人 |
| 24 | 学业完成查询超时 |
| 25 | 模块不存在 |
| 30 | 请求被限流 |
| 39 | 等待本人登录超时 |

课表历史学期查询的请求和转换已由合成测试覆盖，尚未做真实账户验收。课程认定不适配；修改资料、提交评教、重新计算学业结果等写操作不在命令范围内。

### 🤖 供 AI Agent 调用

以下步骤面向正在协助用户操作的 AI Agent；登录步骤需要用户在浏览器中完成。

```bash
npm install -g jnu-cli
jnu-cli doctor
jnu-cli browser status
jnu-cli auth login
jnu-cli auth status
jnu-cli course today
```

命令默认输出 JSON。成功返回 `ok`、`data` 和 `meta`，失败返回 `ok`、`error` 和 `meta`。检查登录态时应读取 `data.loggedIn`，查询失败时按错误码处理。字段含义与退出码见上方「JSON 与退出码」。

## 🧠 功能细节

- 登录态保存在本机：后续命令复用 `~/.jnu-cli/browser-profiles/<browser>/` 下的登录态。可用 `JNU_CLI_HOME` 指定存储目录；同一档案的命令应顺序执行。
- 通过正常网页访问业务：使用 Playwright 打开独立浏览器窗口，经过学校统一身份认证和本科教务门户进入对应服务，再在业务页中执行同源查询。登录默认显示浏览器窗口，状态检查和业务查询默认无界面，可用 `--headed` 显示。
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
├── tests/                   # 合成业务及 CLI 测试
├── scripts/                 # 项目检查与测试入口
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

发布新版本时，先用 `npm version patch`（或 `minor`、`major`）更新包与锁文件版本并创建标签，再执行 `git push origin main --follow-tags`。推送 `v*` 标签就会触发 [npm 发布工作流](.github/workflows/publish.yml)，自动安装依赖并发布到 npm；发布前由 `prepack` 执行测试和项目检查。GitHub Release 可随后补充发布说明。

工作流通过 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) 认证。npm 包设置中的 GitHub 仓库为 `sunnyhmz7010/jnu-cli`，工作流文件名为 `publish.yml`，允许 `npm publish`；无需配置 npm Token。

## 🔐 安全报告

如果发现安全问题，请不要公开披露细节。请优先参考仓库中的 [SECURITY.md](./SECURITY.md) 提交安全报告。

## 📄 许可证

本项目基于 [GPL-3.0](./LICENSE) 开源。

<div align="center">
  <sub>Built with ❤️ by Sunny</sub>
</div>
