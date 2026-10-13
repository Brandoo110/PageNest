# PN-UI-IMPLEMENT · 批准精修稿落实与真实资料试用

2026-10-13 22:06用户批准`prototype/ui-review/PageNest.html`并要求“去落实，写好后启动程序，用桌面的几个真实文件放进去分类”。内置AI目标继续paused。本单是独立UI落地授权；旧AI暂停工作单不恢复。writing-plans冻结边界，ui-judgment指导现有界面移植，verification-before-completion要求实际证据。

## 一个完整目标与基线

正式应用使用获批暖白/绿色精修UI，导入/分类/隔离阅读/位置持久化均走既有真实API；轻量候选完成、一次只读合入审核、总控ACCEPT后功能PR合入，随后总控启动并导入4份桌面HTML分类，用户可真实阅读。

- Writer原可见task01a133e7-4a95-7522-8c0e-462fc8da80b2，6.1Sol/High/Fast；本轮独占UI写入。代码管理01a133f1-512d-72a0-bd9d-dfb533aa1c3e唯一Git writer；不新增角色/对话框/目标，不恢复原AIgoal。
- 隔离worktree `/Users/junjieli/PageNest-ui`，branch `codex/ui-design-implementation`，准确HEAD/base `31e9b83d4c7f2dcd44566757ab66b954b12a29be`，已准备clean。原 `/Users/junjieli/PageNest` 的 feat/ai-html-generation dirty与私人.data原样保留，不切换/清理/stash/覆盖。可只在隔离工作区链接已有 `/Users/junjieli/PageNest/node_modules`，不安装新依赖。
- 批准原型只读 `/Users/junjieli/PageNest/prototype/ui-review/PageNest.html` SHA256=2f1bcc86a21a9086780b03affd785cf27e9c9790e3c34d641f6210f736e12cdb；设计交付 `/Users/junjieli/PageNest/artifacts/ui-design/交付.md`。旧批准原型也只读。root暂停AI业务12项指纹dc305d95ed0db1c739f59833ee77b60feaeb2473eebbe15aa91249c58f32de66，不修改/复制其中业务代码。

## 必读接口与冻结选择

读root AGENTS最新PN-UI-IMPLEMENT/本单；读隔离worktree的`public/app.js`、`public/style.css`、`public/index.html`、`tests/local.test.js`及README/package.json，必要只读`src/server.js`/`src/store.js`/`src/html.js`理解既有CSP/文件/接口。原型用于视觉和交互意图，不能复制其假保存/模拟数据来替代正式API。

UI保留紧凑顶部起点、纸面列表、桌面独立日期与手机隐藏日期、统一线性SVG导航和绿色选中、手机前置分类入口、来源资料默认折叠且已填自动展开、HTML只导入一次的清楚文案、统一按钮/焦点/菜单/提示、空/加载/错误/保存反馈、同栏HTML/原文胶囊260ms滑动与减少动态效果。复用现有delegated data-action/data-folder/data-view和真实state处理；可调整DOM/classes，但应保留关键API/reading容器与原frame挂载，禁止把不可信HTML放入主DOM。用既有HTML/CSS/JS，无新库/字体联网。

真实主链：GET `/api/library`；POST `/api/folders` `{name}`；POST multipart `/api/inspect`及`/api/import`（html、可选source、title、folderId、sourceUrl、requestId、acceptExternal）；PATCH material移动/标题/回收；POST open→阅读状态；PUT reading；已有下载/display与来源绑定API不变。成功提示只在真实保存/refresh后；失败保留输入；新UI不要求上传同一HTML两次。来源更换/移除、取消/返回、folder上下文、R1异步inspect身份和dirtyReading未确认集合保持。

## 写入allowlist与五条不变量

只写隔离worktree的`public/app.js`、`public/style.css`、`public/index.html`、必要`README.md`、既有`tests/local.test.js`（有实际行为反例才改）、`artifacts/ui-implementation/**`。不写package/lock/backend/schema/治理/Brain/原型/root暂停源码，不Git/依赖安装/真实文件导入/正式服务变更。测试用临时dataDir与空闲独立端口、虚构文件；用户真实文件导入由总控在ACCEPT后完成。

1. 真实API/原件/关联/持久化继续工作，无模拟列表、模拟成功或重置演示入口。
2. `sandbox="allow-scripts"`不加same-origin；CSP/来源消息校验/权限和文件下载保持，不改HTML正文。
3. R1选择身份/离页位置、阅读切换与文件夹/搜索上下文保持；新源折叠不丢选中文件或字段。
4. 原root AI候选、批准原型、正式.data、旧4173和预览4175均不改；内置AI仍暂停，不调用任何模型API。
5. 源码/证据与私人资料隔离，桌面原件不入Git，服务只loopback；不做同步/登录/部署/多级/批量入口或重度打磨。

## 轻量验证与完成条件

先利用现有测试/类型/依赖，若新行为需RED，只增加一项真实状态反例，不写CSS镜像测试。一次`node --check public/app.js`（必要测试文件也check）及`npm test`（既有tests/local.test.js，并发1）；现有后端未改，复用旧隔离/字节/SQL证据，不重跑整套攻击/故障场景。

命名headless session `pagenest-ui-implementation`，隔离临时dataDir真实HTTP→选择虚构HTML及可选TXT→source折叠/重新渲染仍有选中文件→保存→库分类→HTML/原文切换/位置→返回/刷新读回；保存/失败反馈及新建folder Enter等受影响行为；1440桌面、390/320壳层无横溢出，正文宽内容仍仅正文横滚。最少截图复用批准原型对照。发现缺陷只补受影响检查。不要读取私人样本或启用根dirty前端。测试结束停本轮实例、close命名CLI并list确认，不关闭其它服务/用户Chrome。

一次完整交付`artifacts/ui-implementation/交付.md`及本轮变更文件SHA256 manifest：实际UI/API/读回证据、有效命令exit、截图、风险/限制、实际model/effort/tier、清理结果。完整候选后idle；不逐步汇报。原代码管理一次复用同状态证据只读审核、总控最终裁决；未ACCEPT不Git/正式启动。

## 正式启动、样本与回退（总控后续执行）

保留旧acceptedV1服务直到新UI已验收/Git交付。仅用合入准确accepted源码启动127.0.0.1:4173和原 `/Users/junjieli/PageNest/.data`；后端/schema未变，不做数据迁移/清空。安全停止自己旧服务后启动新进程，health与served UI匹配acceptedSHA；异常保留场景并恢复旧accepted源服务，不删除数据。

用户授权只读/导入桌面顶层4份HTML（不用读取其它文件）：Agent趋势雷达.html与多Agent上下文治理-原生HTML对照版.html→“Agent 学习”；Codex-全局-AGENTS-指令手册.html→“工具与规范”；junjie-project-dashboard.html→“项目总览”。总控经本机API导入原字节，原件在桌面保留。相同hash已存在则复用，不造重复；已有内容不删除。先inspect资源警告，受限预览确认可读后才决定导入，不绕过展示CSP/联网隔离。import后GET库/下载原件hash和四项用户可见分类核验；不外发/调用模型、不把内容/私人DB写入Git。

停止条件：base/权限/共享合同矛盾、需要backend/schema改动或无法隔离环境；先交exact缺口，不能自行扩大AI/同步/部署范围、升档或反复盲测。环境准备连续失败两次先定位；已通过必要检查不额外重复验证。
