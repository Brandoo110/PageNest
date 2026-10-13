# PageNest

## 当前阶段：已批准精修UI落地与真实资料本机试用；内置AI暂停

2026-10-13 已批准原型的真实本地V1通过PR3合main31e9b83d4c7f2dcd44566757ab66b954b12a29be并交本人试用。18:35用户明确暂停内置AI/DeepSeek资料生成HTML，继续之前的已有HTML导入阅读设计；HTML可由Codex在软件外生成后导入。新目标已核实paused，两个执行角色已确认停止并idle。canonical 为 `/Users/junjieli/obsidian/Brain/Projects/active/AI知识阅读库/index.md`；`docs/资料生成HTML-工作单.md`和已写候选保留为暂停方案，不构成恢复授权。原型SHA256 d0e03204ce79fe263983afacd2ca451014ba6d39508d70335ea07d85811229c7只读。

- 总控负责目标、关键合同、调度、完整候选验收及记录；“PageNest V1 实现”唯一业务Writer、“PageNest 代码管理”唯一Git writer，当前仅在最新PN-UI-IMPLEMENT范围启用；不推进生成候选。恢复内置AI须用户明确授权。
- 用户于 2026-10-13 增加专用“PageNest 代码管理”可见对话框，唯一 Git writer；[开发与分支约定](docs/开发与分支约定.md) 为 Git 合同。仓库 `Brandoo110/PageNest` 为 Private。业务从功能分支经 PR、总控 ACCEPT 后逐步合到 main，不直接 push main。
- 当前用户专门指定执行对话框 **GPT-6.1 Sol / High / Fast**，优先于所有旧的 Luna / Medium 规则。团队见 `.codex/agents/README.md`；配置与新鲜运行证据分别记录，缺失保持 unknown。
- 当前使用既有本地HTML导入/分类/隔离阅读/持久化，原文仍可选；不要求同一HTML上传两次。内置资料生成及Key设置未启用，用户可由Codex生成HTML后导入。只loopback，登录/同步/部署后置。
- 禁止继续生成功能、Key或模型调用以及该暂停候选的审核/测试/Git/启用/数据迁移；本轮UI落地按最新独立授权执行。原root不切分支/reset/clean/stash或覆盖已写代码。部署、公网或局域网暴露、账号/凭据操作、付费、点名4份HTML以外私人样本及恢复Cortex仍禁止；AI候选本地保留，不为了保留而提交。
- 保留已批准视觉、响应式与紧凑HTML/原文顶栏，以及当前旧版V1服务和私人资料。已写生成源码/方案/报告原样保留在feat/ai-html-generation，未独立审核、未ACCEPT、未提交/合入。现有服务从acceptedV1运行副本启动，不从暂停分支启动。
- HTML 是不可信内容：保存原始字节；展示副本用不授予 same-origin 的 sandbox 与禁网络 CSP；不可注入主应用 DOM。只允许经过验证的阅读位置消息，不让消息触发业务写操作。
- 本地无登录，因此服务严格仅绑定 loopback。 API 校验 Origin/Host，限制跨站写入；将来手机真实访问和多用户需要独立冻结身份/归属与部署合同。
- 暂停AI候选不再测试、构建或审核；新UI里程碑只做最新工作单的轻量检查及完整候选一次合入审核。AI内部mock证据仅保留，不代表独立验收或真实DeepSeek/输出质量核实。
- 团队成员不得自己新增可见任务、跨域项目或开放式目标。需要时可在本任务明确范围内设置目标；完成完整候选再交付，不把每次 RED/GREEN 或微提交上报总控。
- 记录总控唯一写入：Brain devlog→index→日志、ACTIVITY_LOG里程碑与DEFERRED_HARDENING后置项。本轮仅增量标记暂停，不修改业务代码。保留artifacts/AI-HTML-交付.md及候选证据；当前feat/ai-html-generation，base/HEAD31e9b83d4c7f2dcd44566757ab66b954b12a29be，dirty保留；旧服务PID32392/session76286仅127.0.0.1:4173，正式.data不迁移、不清理。

## 成熟度触发

本地完整流程经总控 ACCEPT 后进入本人试用；未 ACCEPT 完整候选不启动正式数据目录或合入主线，隔离临时数据目录的必要测试不受此限制。未来私有网页内测部署仍需另行授权与阶段更新，不自动转向全面生产加固。

## 独立交互与UI设计 · 2026-10-13最新授权

用户另行要求新增“PageNest 交互与 UI 设计”可见对话框，GPT-6 Astra / Medium / Standard，独立负责整个产品的交互与视觉细节审查和优化，直接向用户交付，无需向总控汇报或等待总控验收。此独立设计授权不恢复内置AI目标，也不唤醒原业务Writer或代码管理。

- 唯一设计Writer只写`prototype/ui-review/**`、`artifacts/ui-design/**`，产出可点击优化HTML、桌面/手机对比与简短设计说明；用户已批准的`prototype/PageNest.html`只读保留。既有业务源码、暂停AI候选、Git、治理、Brain及私人.data不在设计写入范围内。
- 以acceptedV1 main31e9b83d4c7f2dcd44566757ab66b954b12a29be的UI源码和已批准原型为基线，不能把dirty AI前端当已交付界面。使用虚构资料的独立静态预览；不读取正式私人资料、不改变现有4173/4174服务或正式数据，不调用模型API或部署。
- 审查资料库/分类/搜索/导入/可选来源/HTML与原文阅读/更多菜单/回收站及空、加载、错误、成功状态；检查字体、层级、配色、间距、尺寸、对齐、圆角、图标、按钮、窄屏和动效。保留紧凑同栏HTML/原文胶囊与滑动意图，不增加内置AI/登录/同步等功能。
- 沿用现有HTML/CSS/JS，用最小桌面与390/320px视觉走查和核心模拟流程完成设计自检，不做业务回归、压力测试或工程打磨。设计完成直接给用户优化稿与变化说明；正式应用改造和Git合入仍需单独安排，不由设计角色擅自操作。

## PN-UI-IMPLEMENT · 2026-10-13 22:06最新授权

用户已批准精修稿并明确要求落实正式程序、启动、导入桌面几份真实文件并分类。该授权覆盖旧暂停条款中对本轮UI开发/轻量验证/Git/正式启动及点名桌面样本的限制；内置AI/Key/DeepSeek仍暂停，不能混入本次。

- 单一业务Writer仍“PageNest V1 实现”，6.1Sol/High/Fast；只写隔离`/Users/junjieli/PageNest-ui`的public/app.js、public/style.css、public/index.html、必要README.md/现有tests/local.test.js及artifacts/ui-implementation/**，不写backend/schema/原root/治理/Brain，不Git。
- 单一Git writer仍代码管理。已准备`/Users/junjieli/PageNest-ui`、`codex/ui-design-implementation`、base/HEAD31e9b83d4c7f2dcd44566757ab66b954b12a29be、clean；原root feat/ai-html-generation dirty和12项候选指纹dc305d95ed0db1c739f59833ee77b60feaeb2473eebbe15aa91249c58f32de66保留。新候选经一次复用证据的只读合入审核与总控ACCEPT后，功能PR准确head合入main，禁止直接push main。
- 批准设计`prototype/ui-review/PageNest.html`只读，SHA256=2f1bcc86a21a9086780b03affd785cf27e9c9790e3c34d641f6210f736e12cdb；工作单`docs/UI落地-工作单.md`。只移植外壳/布局/控件/反馈，不带模拟数据、模拟保存、重置演示、AI页面；保留真实API、R1异步身份与离页位置规则、opaque iframe隔离与CSP。
- 验证限一份既有focused测试、受影响语法和一次虚构临时数据的真实浏览器主流程/390/320壳层。有效证据复用，不加全量/压力/复杂CI。正式资料目录由总控在ACCEPT/Git交付后启动accepted源码，原数据保留、不迁移/重置；正式服务依然loopback。
- 用户仅授权桌面顶层4份HTML：多Agent上下文治理-原生HTML对照版.html、Codex-全局-AGENTS-指令手册.html、junjie-project-dashboard.html、Agent趋势雷达.html。总控使用本机API导入原始字节并按内容分为Agent学习/工具与规范/项目总览，桌面原文件不移动/覆盖，已有库保留。不得读取其它桌面文件或私人目录、外发资料/调用模型；私人内容/数据库不入Git。既有相同文件按hash核对后复用，不造重复。
