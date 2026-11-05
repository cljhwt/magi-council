# DeepSeek Harness adapter

已实现工具适配 `harness-plugin.js`，共享 Web 版核心，不需要启动 Web 服务。依赖官方 `defineTool` 和 Cordis 生命周期，参考 [Build a tool](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool)。

当前目标为本机已有的 `@deepseek-ai/dsh-tools@0.1.5-rc.2`。支持普通文本结果，无专用宿主 UI。凭证从 Harness 进程环境读取，不读取宿主内部 Key，不声称已经完成完整宿主安装、重启及卸载验收。

环境变量与 Web 版一致：MODEL_BASE_URL、MODEL_ID、MODEL_API_KEY。可用 MAGI_MELCHIOR_MODEL、MAGI_MELCHIOR_BASE_URL、MAGI_MELCHIOR_API_KEY 单独覆盖，BALTHASAR 和 CASPER 同理。

在已准备好官方开发环境的 Harness 项目中，将本仓库置于能够解析 `@deepseek-ai/dsh-tools` 的依赖环境，按官方 overlay 方式加载绝对路径 `harness-plugin.js`。示例补丁（替换路径）：

```yaml
- insert:
    - id: magi-council
      name: '/absolute/path/to/magi-council/harness-plugin.js'
```

在官方源码项目根目录运行：

```sh
pnpm dsh web --patch /absolute/path/to/magi-overlay.yml
```

让宿主使用 `magi_deliberate` 工具评估用户已确认的提案。最多六次独立模型调用，180 秒时限；接收宿主取消信号，插件卸载也会取消进行中的运行。不使用自动重试。

v0.2 起，`context_json` 是必填参数：由宿主 Agent 根据当前可见对话和项目记忆整理 `summary`、有来源的 `facts`、`constraints`、`decisions`、`unknowns`。缺少背景不会启动模型调用；用户不需要自己填写 JSON。此适配不直接抓取宿主内部会话数据库，调用方需要显式传入背景。格式与数据边界见 [AGENT-CONTEXT.md](AGENT-CONTEXT.md)。

发布前仍需在目标宿主真实验证安装、工具调用、取消、重启和卸载；未完成这些检查前不要宣传为已上架插件。
