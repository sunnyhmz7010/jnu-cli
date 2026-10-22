# 暨南大学—校园服务 Skill

这是 `jnu-cli` 配套的 Codex/Agent Skill，用来告诉 agent 如何安全地调用暨南大学本科教务 CLI。该项目非学校官方项目，可在 [GitHub](https://github.com/sunnyhmz7010/jnu-cli/issues) 反馈问题。核心业务逻辑在 `jnu-cli` 内，Skill 只保存使用说明、命令路由和安全边界。

本目录改编自 [szu-cli-skill](https://github.com/AwesomeHou/szu-cli/tree/406e5627494e404203752746fbc97ddc3a06a932/skills/szu-cli-skill)，原始内容遵循 [MIT 许可证](LICENSE)。

## 安装

本机需要先安装 CLI：

```bash
npm install -g jnu-cli
```

将本目录完整复制到 Codex 的 `~/.codex/skills/jnu-cli-skill/`；自定义 `CODEX_HOME` 时使用其 `skills/jnu-cli-skill/`。也可按其他 Agent 的规则加载同一目录。npm 包内包含 `skills/jnu-cli-skill/`，不需要另建契约文件。

## 使用前检查

```bash
jnu-cli doctor
jnu-cli auth status
```

如需登录：

```bash
jnu-cli auth login
```

登录过程由用户在浏览器中完成。不要把密码、Cookie、Token 或浏览器 profile 交给 agent。

CLI 默认输出 JSON，不接受 `--json`。浏览器优先采用 `JNU_BROWSER`、保存的选择或系统中检测到的浏览器，并为 Chrome、Edge、Chromium 分别保存独立的 `jnu-cli` profile。CLI 不自动下载浏览器。

## 目录

- [SKILL.md](SKILL.md)：agent 入口说明。
- [references/commands.md](references/commands.md)：模块到命令的路由。
- [references/examples.md](references/examples.md)：自然语言到 CLI 命令的示例。
- [references/errors.md](references/errors.md)：结构化错误码处理。
- [references/privacy-safety.md](references/privacy-safety.md)：隐私、安全和登录态边界。
- [agents/openai.yaml](agents/openai.yaml)：Agent 展示信息。

## 安全边界

- 默认使用 JSON，让 agent 解析结构化输出。
- 教务查询只读；不提交评教、修改资料或重新计算学业结果。
- 不索取凭据，不绕过认证、验证码、网络限制、限流或访问控制。
