# 发布材料（无语音版）

## 中文文案

我把 EVA 里 MAGI 的三种人格合议，做成了一个可以自己运行的 AI 终端。

一个提案，三个视角：科学家检查证据，守护者权衡后果，自我视角追问“这是不是你想要的”。先独立评估，再交换意见，最后投票。

它会保留反对票，也允许弃权。如果某个单元故障，系统会明确告诉你讨论不完整。多数票不是正确性的保证，但能帮你看见一个答案背后的不同取舍。

支持三个单元分别配置兼容 API、无需密钥的固定脚本回放，以及 Markdown 导出。无语音，非官方 EVA 启发项目。

仓库链接：https://github.com/cljhwt/magi-council 。Harness 适配目前为开发预览，尚未完成宿主完整验收。

## English

I built an EVA-inspired MAGI terminal: three perspectives evaluate your proposal independently, review each other's opinions, and vote. Evidence, consequences, and personal values—without hiding the dissenting vote. Bring your own compatible model APIs, or try the clearly labeled scripted replay. Local-first, no voice, unofficial fan-inspired experiment.

## 无声视频建议

先用实际网页回放录制短演示：首屏 → 点击回放 → 三方初票 → 互评 → 两票赞成与一票反对 → 展开少数意见 → 模型配置。回放标签必须保留；不能剪成真实模型实时运行。当前录屏素材属于操作演示，后续可剪辑为横版和竖版宣传片。

## 发布前剩余检查

- 使用自备真实 API Key 跑通至少一次讨论与连接测试。
- 运行 20 题人工质量评估，记录成本与延迟。
- GitHub 仓库：cljhwt/magi-council；版本定位为开发预览。
- 若宣传 Harness 插件，先完成宿主实际安装与生命周期验收。
