# Agent 上下文与插件

MAGI 不应只拿一句提案猜测用户的时间、预算与偏好。v0.2 的核心同时接收一份任务背景：当前对话中明确的事实、项目约束、已有决定、未知项及来源。三单元首轮和互评使用同一份背景，首轮仍互相隔离。

## Codex：本地插件

本仓库已提供本地插件包 `plugins/magi-council`（技能与本机客户端脚本），以及 `.agents/plugins/marketplace.json`。本机已通过 CLI 注册 `magi-local` 并安装 `magi-council@magi-local`。根据当前官方文档，安装后的技能需在新聊天/会话使用；必要时重启桌面应用。

```powershell
codex plugin marketplace add "E:\code\量化\magi-council"
codex plugin add magi-council@magi-local
```

其他机器将路径替换成实际仓库路径。插件使用你自己的本机 MAGI 服务，不需要 OpenAI API Key：在 MAGI 项目中 `npm start`，沿用已有 `.env` 中的模型配置。Codex 安装目录不包含模型 Key。

在新聊天中调用 MAGI 插件，描述：

> 让 MAGI 结合当前对话、项目约束和已有决定，评估这个方案。列出引用过的背景及仍未知的信息。

主 Agent 负责从它当前可见的对话和相关项目文件提取背景，然后运行插件脚本。你不需要手写 JSON 或重新粘贴整份聊天。插件不是 MCP 服务，不会凭空获得全部聊天、私有思维链或其他 Agent 的完整历史。另一聊天若不在当前上下文中，只有在宿主提供受支持的读取工具、用户限定范围且主 Agent 实际读取后才能使用。

插件客户端只连接本机 HTTP 地址，默认 `http://127.0.0.1:3088`。`MAGI_SERVICE_URL` 可更改本机端口；此配置不接受远程地址。当前调用结果回到 Agent 聊天，不会同步驱动另一个已打开的网页动画。

## DeepSeek Harness：带上下文的工具

原有 `magi_deliberate` 工具增加必填参数 `context_json`。宿主 Agent 在调用前从当前会话整理该字段，不是让用户填写。工具缺少背景时会在创建模型调用器前拒绝执行。

宿主可传入来源标记、sessionId 和项目；本版不直接读取 Harness 私有会话数据库，也不自动检索其他会话。详情见 [HARNESS.md](HARNESS.md)。

## 背景请求格式

```json
{
  "proposal": "下一步优先做带上下文的 Agent 插件",
  "rule": "majority",
  "decisionContext": {
    "host": "codex",
    "project": "MAGI Council",
    "summary": "用户希望决策使用已有会话背景，而非仅凭一句提案。",
    "facts": [{ "text": "本轮暂不做语音", "source": "用户在当前聊天中的明确要求" }],
    "constraints": ["保持已有 MAGI 界面和模型配置"],
    "decisions": ["已选择三个独立视角合议"],
    "unknowns": ["用户预算尚未提供"]
  }
}
```

事实项必须具有 `text` 和 `source`；来源应对应主 Agent 真正看过的消息或文件，不凭空编号。主 Agent 的摘要不等于事实已被独立核验。背景最多 24000 字符，每个列表最多 32 项。默认不读任何文件型记忆，只有调用方提供的背景进入模型。

相关背景会发送给本机 MAGI 已配置的模型服务商（当前用户的配置是通义接口），不是仅在 Codex 进程内推理。技能要求排除密钥和无关信息，服务端也对常见 Key/Token 字符串做辅助脱敏；规则不是完整的秘密检测器，不能替代调用前的内容选择。

模型必须注明依据来源和未知项；关键信息不足应弃权。程序可校验来源字段及调用契约，不能证明摘要真实，也不能保证模型永不猜测。

## 验证与边界

- 测试覆盖背景字段校验、来源必填、辅助脱敏、首轮/互评均收到背景、HTTP 端到端传递、插件客户端的 Unicode 流解析及拒绝远程地址。
- Codex CLI 已完成本机插件安装；桌面新会话中的实际技能触发需重启/新建聊天确认，当前聊天的初始技能列表不会因此重载。
- Harness 的本机 SDK 接受新工具定义；完整宿主安装、调用与卸载验收仍未完成。
- 跨会话自动检索、持久记忆索引、原生 MCP 工具和网页联动不在当前实现中。

官方依据：[Codex 插件](https://developers.openai.com/codex/plugins)、[插件打包](https://developers.openai.com/plugins/build/plugins)、[技能机制](https://developers.openai.com/codex/skills)、[Harness 工具](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool)。
