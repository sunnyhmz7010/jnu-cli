# 错误处理

始终解析 JSON，并根据 `error.code` 分支处理。

## 常见错误码

- `BACKEND_UNAVAILABLE`：浏览器后端不可用；运行或提示用户运行 `jnu-cli doctor`。
- `BROWSER_UNAVAILABLE`：当前浏览器未安装、无法启动或档案被占用；用 `jnu-cli browser status` 查看已有浏览器，检查上一条命令是否仍在运行。
- `BROWSER_SELECTION_INVALID`：浏览器选择只能是 `chrome`、`edge` 或 `chromium`。
- `BROWSER_CONFIG_INVALID`：浏览器配置无效；保留错误提示，可用 `JNU_BROWSER=edge` 临时选择已安装的 Edge，再用 `jnu-cli browser use edge` 重写配置。
- `AUTH_LOGIN_TIMEOUT`：用户未在限定时间内完成登录；说明原因，按用户需要重新运行 `auth login --timeout <seconds>`，上限 1800 秒。
- `LOGIN_REQUIRED`：让用户运行 `jnu-cli auth login`；完成后原命令最多重试一次。
- `NETWORK_REQUIRED`：当前网络无法访问学校服务；检查实际网络，不清除登录档案，不自动切换路径。
- `PERMISSION_DENIED`：当前账号或角色无权访问；不要绕过或反复重试。
- `PAGE_CHANGED`：页面或身份上下文与预期不一致；不要从异常页面猜测数据。
- `API_ERROR`：学校接口业务失败或响应不符合请求条件；保留安全的错误信息并停止。
- `INCOMPLETE_DATA`：分页、数量或模块关系未通过完整性校验；不要把部分结果说成完整。
- `PROGRAM_NOT_FOUND`：培养方案不存在，或不是本人方案；用 `jnu-cli program list` 或 `completion summary` 取得对应范围内的代码。
- `MODULE_NOT_FOUND`：用 `jnu-cli completion modules` 取得本人方案中的模块代码。
- `CALCULATION_TIMEOUT`：学业完成查询超时；不要激进重试，仅在用户仍需要结果且等待合理时增加 `--timeout <seconds>`。查询不触发重算。
- `RATE_LIMITED`：立即停止重试。
- `UNSUPPORTED_ACTION`：当前 CLI 尚不支持该命令；查看 `jnu-cli --help`，不要尝试隐藏接口。
- `UNKNOWN_ERROR`：参数解析失败或未分类错误；保留安全的错误提示并停止，不猜测结果或循环重试。

## 重试规则

- 仅在用户完成登录后重试需要登录的命令；`auth status` 的 `ok=true` 仍需检查 `data.loggedIn`。
- 短暂网络错误最多重试一次，除非用户明确要求再次尝试。
- 每次只运行一条会启动浏览器的命令。工具显示进程仍在运行时，等待并读取其结果，不因暂时无输出就重启。
- 同一 profile 不能并行启动命令；浏览器启动失败时先检查上一条命令是否结束。
- 访问状态不明确时，运行对应的 `status` 命令并按该命令的返回结构解释。
- `error.hint` 包含安全的后续命令时，保留其原始内容。
