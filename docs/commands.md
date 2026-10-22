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

`auth`、`course`、`grade` 命令支持 `--network system|direct`：

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
| 20 | 配置、页面、接口或完整性检查失败 |
| 30 | 请求被限流 |
| 39 | 等待本人登录超时 |

课表历史学期查询的请求和转换已由合成测试覆盖，尚未做真实账户验收。其他已核对场景尚未接入，未实现的命令会明确拒绝。
