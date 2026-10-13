# PageNest

## 当前阶段：第一版本地开发

2026-10-13 用户已要求开始实现。先交付一条真实流程：HTML 与可选原文导入 → 单层文件夹 → 隔离阅读 → 原文切换 → 刷新及重启后读回。canonical 为 `/Users/junjieli/obsidian/Brain/Projects/active/AI知识阅读库/index.md`，执行合同为 `docs/V1-实施工作单.md`。

- 总控负责范围、关键设计、角色调度及完整候选最终 ACCEPT / REJECT；业务代码只有一名连续 Writer。
- 用户于 2026-10-13 增加专用“PageNest 代码管理”可见对话框，唯一 Git writer；[开发与分支约定](docs/开发与分支约定.md) 为 Git 合同。仓库 `Brandoo110/PageNest` 为 Private。业务从功能分支经 PR、总控 ACCEPT 后逐步合到 main，不直接 push main。
- 当前用户专门指定执行对话框 **GPT-6.1 Sol / High / Fast**，优先于所有旧的 Luna / Medium 规则。团队见 `.codex/agents/README.md`；配置与新鲜运行证据分别记录，缺失保持 unknown。
- 允许本地业务实现、必要公开文档读取、常规依赖安装与低负载验证；在 127.0.0.1 启动服务供本人体验。代码/数据不得写入 Brain。
- 禁止部署、公网或局域网暴露、账号/凭据操作、付费、读取或上传私人样本、恢复 Cortex。当前用户已授权本项目 GitHub 私有建仓、功能分支、正常代码 commit/push/PR 及经 ACCEPT 的逐步合入；其它外部写入不在授权内，业务 writer 不自行操作 Git。
- 首版复用已经接受的页面设计，不重新做视觉概念；不内置 AI、同步、登录、公开分享、批量导入、多级文件夹、PWA 或离线承诺。
- HTML 是不可信内容：保存原始字节；展示副本用不授予 same-origin 的 sandbox 与禁网络 CSP；不可注入主应用 DOM。只允许经过验证的阅读位置消息，不让消息触发业务写操作。
- 本地无登录，因此服务严格仅绑定 loopback。 API 校验 Origin/Host，限制跨站写入；将来手机真实访问和多用户需要独立冻结身份/归属与部署合同。
- 验证预算：语法检查，一份 focused 测试，一次真实浏览器流程及 390px/320px 检查；最多几个小样本。独立审核复用有效证据，仅补缺失的最小隔离/持久化反例，不跑全量/压力/性能测试。
- 团队成员不得自己新增可见任务、跨域项目或开放式目标。需要时可在本任务明确范围内设置目标；完成完整候选再交付，不把每次 RED/GREEN 或微提交上报总控。
- 记录总控唯一写入：Brain devlog → index → 日志；`.codex/agents/ACTIVITY_LOG.md` 只记录里程碑，`.codex/agents/DEFERRED_HARDENING.md` 维护后置项。Writer 仅输出 `artifacts/V1-交付.md` 与必要证据。

## 成熟度触发

本地完整流程获总控 ACCEPT 后进入本人试用。用户另行授权私有网页内测部署时，提醒“项目应该进入下一阶段，应该更新 agents了”，再增加最小身份、归属访问、跨设备及备份恢复验证；不自动转向全面生产加固。
