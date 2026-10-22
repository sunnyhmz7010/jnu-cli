# 暨大本科教务命令

所有命令从仓库目录使用 `node src/cli.js` 运行，也可用 `npm run jnu-cli --`。查询命令支持 `--json`；省略时输出简明文字。

## 登录与浏览器

```bash
node src/cli.js browser status --json
node src/cli.js browser use edge --json
node src/cli.js auth login --timeout 900 --network direct --json
node src/cli.js auth status --network direct --json
```

`browser status` 只检查浏览器与配置，不建立登录档案。`browser use` 保存选择，不安装浏览器。`JNU_BROWSER` 的优先级高于保存的选择；未指定时检测已安装浏览器。Chromium 需要本人事先安装 Playwright 对应的浏览器，程序不会自动下载。

默认目录是 `~/.jnu-cli/`，可用 `JNU_CLI_HOME` 指定。登录档案按浏览器隔离，不共享常用浏览器的会话。不要并行执行占用同一档案的命令。

登录默认等待 300 秒，`--timeout` 可设为 1 至 1800 秒。本人正常完成认证后，CLI 进入本科课表并验证业务响应，再关闭和重开档案验证，成功才返回 `persisted=true`。状态命令在未登录时成功返回 `loggedIn=false`，查询则返回 `LOGIN_REQUIRED`。

当前统一使用可见浏览器，`--headed` 参数保留兼容。程序使用浏览器正常的恢复上次会话功能，不导出、复制或延长学校 Cookie。

## 网络选项

所有教务命令支持 `--network system|direct`：

- `system`：默认值，沿用系统网络配置。
- `direct`：仅让此次 CLI 浏览器直连，不修改全局代理或 DNS。

登录后的重启检查沿用同一选项，后续查询也应使用适合当前环境的路径。JSON 的 `meta.network` 标明本次选择。此选项与 WebVPN 无关，WebVPN 尚未适配。

在一台 Windows 机器上，代理 DNS 与系统 DNS 选择了不同的学校公开 WAF 节点，前者的认证链路间歇出现 502；同一代理使用系统解析得到的公开 WAF 地址时正常。`--network direct` 已在该环境通过真实验收。程序不固定这些地址，不在失败后自动切换路径，也不将网络错误当作需要重新登录。

## 个人课表

```bash
node src/cli.js course status --network direct --json
node src/cli.js course list --network direct --json
node src/cli.js course list --week 7 --weekday 3 --network direct --json
node src/cli.js course list --all-weeks --network direct --json
node src/cli.js course list --term 2025-2026-2 --network direct --json
node src/cli.js course today --date 2026-10-22 --network direct --json
```

`status` 与列表查询都实际访问课表业务。默认返回当前教学周；`--all-weeks` 返回全学期，显式 `--term` 且没有 `--week` 时也返回该学期全部周次。`--week` 与 `--all-weeks` 互斥；星期取周一至周日的 1 至 7。

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

## 个人成绩

```bash
node src/cli.js grade status --network direct --json
node src/cli.js grade list --network direct --json
node src/cli.js grade list --term 2025-2026-2 --network direct --json
```

接口为 `/jwapp/sys/cjcx/modules/cjcx/xscjcx.do`。查询有效成绩，关闭仅最高成绩限制，取得全部分页后再按学期筛选；默认不沿用网页最近两个学期的过滤。

展示成绩来自 `XSZCJMC`，兼容等级与数值成绩；`numericScore` 保留 `ZCJ`，单科 `gradePoint` 来自 `XFJD`，缺失值不补零。累计 GPA 规则未核实，`gpa=null`。

分页依据 `totalSize` 与实际累计条数，不使用偶尔为零的 `totalPage`。重复页、重复记录标识、总数变化和提前空页均返回错误，避免把不完整列表标为完整。

## 考试安排

```bash
node src/cli.js exam status --network direct --json
node src/cli.js exam list --network direct --json
node src/cli.js exam list --term 2026-2027-1 --network direct --json
```

默认使用考试应用返回的当前学期。主列表请求将学期和排序包装为 `requestParamStr`，接口为 `/jwapp/sys/studentWdksapApp/WdksapController/cxxsksap.do`。

此接口按学期一次返回数组，已核对的 `totalSize=-1` 不作为分页总数。保留尚未提供的考场、座位为 `null`；不因任务或发布时间标志为空而丢弃考试。`serverTime` 来自学校服务器时间。

`conflictCheck.status=not-checked`、`hasConflicts=null`：考试冲突核验未适配，不能将该结果解释为没有冲突。此前页面附带的冲突接口返回业务错误，尚无成功样本。

## 学业完成

```bash
node src/cli.js completion status --network direct --json
node src/cli.js completion summary --network direct --json
node src/cli.js completion modules --network direct --json
node src/cli.js completion courses --module MODULE_CODE --network direct --json
node src/cli.js completion courses --module MODULE_CODE --state selected --network direct --json
```

将 `MODULE_CODE` 替换为 `completion modules` 返回的模块 `code`。可用 `--plan` 选择 `plans` 中的本人方案，不能传入其他学生身份或任意外部方案。主要接口位于 `/jwapp/sys/xywccx/modules/xywccx/`。

先读取 `grpyfacx` 个人方案和 `cxxsscfa` 已有计算结果，再查询摘要和模块。不触发重算，也不等待未经验证的重算进度接口。没有已有结果时返回 `calculation.state=not-calculated` 和原因，不能把它当作正在计算。

摘要中的 `storedSelectedCredits` 是已有结果的选课学分，`currentSelectedCredits` 来自页面补充查询；模块上的 `storedSelectedCredits` 保留已有模块结果。当前教学学期和选课学期分别读取。

`modules` 返回扁平 `items` 和保留父子关系的 `tree`。模块课程先完整取得已计算列表与当前选课，按当前选课的课程号排除缓存侧重合，再追加全部当前选课行；同一课程号的多行关系不会合并丢失。当前选课的方案、模块字段为空时，关联关系来自已验证的请求上下文。

`--state` 支持 `all`、`failed`、`passed`、`unread`、`pending`、`selected`，对应全部、未通过、通过、未修读、未修读待选、已选课。按合并后的完整列表筛选；`SFTG=4` 表示已选课，不依赖可能为空的 `SFXK`。`score` 保留原展示值，非数值状态不转换为零分。

## 培养方案

```bash
node src/cli.js program list --page 1 --page-size 12 --network direct --json
node src/cli.js program list --page 2 --network direct --json
node src/cli.js program item --code PLAN_CODE --network direct --json
```

将 `PLAN_CODE` 替换为列表的方案 `code`。默认每页 12 条，`--page-size` 支持 1 至 100；`pagination` 标明总数、当前页与是否有下一页，`completeness.scope=page` 只表示本页完整，不会默认下载全校方案。

列表使用 `/jwapp/sys/qxfacx/modules/pyfacxepg/qxpyfacxzl.do`，保持已发布方案过滤。详情使用共享路径 `/jwapp/sys/jwpubapp/modules/pyfa/` 下的 `qxpyfacx`、`kzcx`、`kzkccx`、`faxqcx`，分别取得摘要、模块、课程关系和指导计划。

详情完整读取各组分页，保留模块 `KZH/FKZH` 层级、课程的模块关联及数值字段的空值。模块代码重复、层级循环或课程引用未返回模块时明确失败。

## 评教进度

```bash
node src/cli.js evaluation summary --network direct --json
node src/cli.js evaluation summary --term 2026-2027-1 --network direct --json
node src/cli.js evaluation list --network direct --json
node src/cli.js evaluation list --state completed --network direct --json
node src/cli.js evaluation list --state all --network direct --json
```

默认学期来自评教配置 `PJXNXQ`，`--term` 可覆盖查询；不能直接沿用课表当前学期。接口位于 `/jwapp/sys/wspjyyapp/modules/xspj/`。

`progress` 使用 `WPS/YPS/ZS` 的真实数值校验待评、已评和总数；总数为零时状态是 `no-tasks`。缺失字段、业务失败和不一致统计不会补零。`currentByType` 与 `historyByType` 分别保留来源不同的类别计数。

列表默认待评，支持 `pending|completed|all`，当前范围明确为 `course-assessment`（课程评估，`PGLXDM=05`），保留页面的开放和发布过滤。记录是问卷或评教项，不能直接当作课程门数；课程号和课程名允许为空。

列表保留问卷、批次、起止时间和是否已评，服务器时间供调用方参考。期末与随堂评教目前只提供分类计数，独立列表、非零待评的真实显示与截止状态尚未验收。程序不读取答案或提交评教。

## 本人个人信息

```bash
node src/cli.js profile status --network direct --json
node src/cli.js profile show --network direct --json
```

从当前业务页读取本人身份，先以 `XH` 查询，再用返回的本人 `WID` 读取同一条档案；两次身份与记录标识必须一致。接口为 `/jwapp/sys/xjxxbg/modules/xsxxbgsq/cxxsjbxx.do`，不接受指定他人学号的参数。

`profile` 只包含学号、姓名、院系、专业、方向、年级、入学年级、校区、班级、学生类别、培养层次、在籍、在校和学籍状态。编码字段同时保留 `code` 与学校的显示名称 `name`；班级使用 `BJMC`，空值保留 `null`。

证件号、电话、邮箱、地址、银行卡等字段不进入结果；不输出原始档案。`status` 同样执行实际只读验证并返回上述白名单数据。

## JSON 与退出码

成功返回 `{ "ok": true, "data": {}, "meta": {} }`，失败返回 `{ "ok": false, "error": {}, "meta": {} }`。`meta` 标明命令、学校、本科生角色、浏览器后端与网络选择。错误不附带原始业务记录或带临时票据的完整 URL。

| 退出码 | 含义 |
|---|---|
| 0 | 命令成功；登录状态需另看 `loggedIn` |
| 2 | 参数无效或功能未实现 |
| 11 | 需要正常登录 |
| 12 | 网络或教务服务不可用 |
| 13 | 当前角色无权限 |
| 15 | 浏览器不可用或档案被占用 |
| 19 | 浏览器选择无效 |
| 20 | 配置、页面、接口、完整性检查失败，或方案/模块不存在 |
| 30 | 请求被限流 |
| 39 | 等待本人登录超时 |

课表历史学期查询的请求和转换已由合成测试覆盖，尚未做真实账户验收。课程认定不适配；修改资料、提交评教、重新计算学业结果等写操作不在命令范围内。
