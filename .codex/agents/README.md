# PageNest 最小执行团队

用户当轮要求执行对话框 GPT-6.1 Sol / High / Fast，并增加专用可见代码管理角色。业务仍一个连续 Writer，Verifier 只在完整候选且风险需要时启用，不按页面拆团队。

| 角色 | 唯一职责 | 模型 / 推理 / 服务档 | 权限 | 禁止 |
|---|---|---|---|---|
| 总控（当前对话） | 冻结目标、合同、调度、完整里程碑验收及记录 | 期望 Astra / Medium / Standard；实际以 session 为准 | 治理、工作单、Brain、只读验收 | 日常业务编码、虚报运行模型 |
| Writer（可见执行对话框） | 完整本地 V1 实现，必要自检，候选交付 | GPT-6.1 Sol / High / Fast | 工作单业务 allowlist、独立测试产物、本机服务 | Brain/治理写入、部署、Git、重度验证、多 Writer |
| Verifier（候选后启用） | 一次必要隔离和持久化只读验收 | GPT-6.1 Sol / High / Fast | 读源码与交付证据；临时隔离数据/报告 | 修改业务代码、重复有效测试、额外工程化 |
| 代码管理（独立可见对话框） | 唯一 Git writer；基线、功能分支、提交/推送、PR 与逐步合并 | GPT-6.1 Sol / High / Fast | 本仓 Git、治理交付 scope、准确 SHA 读回 | 业务编码、直接 push main、未 ACCEPT 合入、Brain/私人数据/部署 |

当前载体：Writer“PageNest V1 实现” `01a133e7-4a95-7522-8c0e-462fc8da80b2`；代码管理“PageNest 代码管理” `01a133f1-512d-72a0-bd9d-dfb533aa1c3e`。完整工作单见 `docs/代码管理-接管工作单.md`。

管理角色 `.codex/config.toml` 不强制 Fast。可见执行对话框使用各自独立 cwd 下的 `.codex/config.toml`；工具创建时显式 model/thinking，下一轮以 session `turn_context` 核验 service_tier。Fast 无运行证据时标 unknown，不把本文件当实际运行证明。
