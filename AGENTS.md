# PageNest

## 当前阶段：原型已获用户批准，第一版本地开发

2026-10-13 用户已明确批准最新 HTML 原型并要求开始实现，且手动恢复开发目标（已核实 active）。canonical 为 `/Users/junjieli/obsidian/Brain/Projects/active/AI知识阅读库/index.md`；当前执行合同 `docs/V1-实施工作单.md`，Git 接续合同 `docs/开发恢复-代码管理工作单.md`。最新批准原型 `prototype/PageNest.html` SHA256 为 d0e03204ce79fe263983afacd2ca451014ba6d39508d70335ea07d85811229c7，包含顶栏 HTML/原文胶囊和滑动过渡，不回退到旧版原型。

- 总控负责目标、关键合同、调度、完整候选验收及记录；“PageNest V1 实现”是唯一业务 Writer；“PageNest 代码管理”是唯一 Git writer，并在完整候选后做一次独立只读合入审核。原型已获用户批准，开发授权成立。
- 用户于 2026-10-13 增加专用“PageNest 代码管理”可见对话框，唯一 Git writer；[开发与分支约定](docs/开发与分支约定.md) 为 Git 合同。仓库 `Brandoo110/PageNest` 为 Private。业务从功能分支经 PR、总控 ACCEPT 后逐步合到 main，不直接 push main。
- 当前用户专门指定执行对话框 **GPT-6.1 Sol / High / Fast**，优先于所有旧的 Luna / Medium 规则。团队见 `.codex/agents/README.md`；配置与新鲜运行证据分别记录，缺失保持 unknown。
- 允许本地真实 HTML/可选原文导入、单层分类、隔离阅读与位置/文件持久化；必要成熟小型依赖与轻量验证。API/存储/前端代码在本项目，不写 Brain；小样本用虚构文件，不读取私人样本。只在 loopback 运行，登录/同步/部署后置。
- 禁止部署、公网或局域网暴露、账号/凭据操作、付费、读取或上传私人样本、恢复 Cortex。当前用户已授权本项目 GitHub 私有建仓、功能分支、正常代码 commit/push/PR 及经 ACCEPT 的逐步合入；其它外部写入不在授权内，业务 writer 不自行操作 Git。
- 直接复用用户批准的最新原型视觉、响应式布局及紧凑阅读顶栏，把模拟操作连接真实读写；正式应用空库开始，真实保存后才提示成功。保留原型只读作为设计基线，不内置 AI、同步、登录、公开分享、批量导入、多级文件夹、PWA 或离线承诺。
- HTML 是不可信内容：保存原始字节；展示副本用不授予 same-origin 的 sandbox 与禁网络 CSP；不可注入主应用 DOM。只允许经过验证的阅读位置消息，不让消息触发业务写操作。
- 本地无登录，因此服务严格仅绑定 loopback。 API 校验 Origin/Host，限制跨站写入；将来手机真实访问和多用户需要独立冻结身份/归属与部署合同。
- 开发验证预算：本次源码语法检查、一份 focused 低并发测试、一次真实文件浏览器流程及390/320px壳层检查；最小隔离/持久化反例。完整候选后代码管理复用同状态证据做一次只读审核，不重复有效检查、不做全量/压力/复杂CI或全面加固。
- 团队成员不得自己新增可见任务、跨域项目或开放式目标。需要时可在本任务明确范围内设置目标；完成完整候选再交付，不把每次 RED/GREEN 或微提交上报总控。
- 记录总控唯一写入：Brain devlog → index → 日志；`.codex/agents/ACTIVITY_LOG.md` 只记录里程碑，`.codex/agents/DEFERRED_HARDENING.md` 维护后置项。业务 Writer 的 allowlist 见 V1 工作单，不改原型/治理/Brain，不自行 Git；只输出完整 `artifacts/V1-交付.md` 和必要证据。代码管理按最新工作单先保存已获批原型/阶段，再准备 feat/local-reading-library。

## 成熟度触发

本地完整流程经总控 ACCEPT 后进入本人试用；未 ACCEPT 完整候选不启动正式数据目录或合入主线，隔离临时数据目录的必要测试不受此限制。未来私有网页内测部署仍需另行授权与阶段更新，不自动转向全面生产加固。
