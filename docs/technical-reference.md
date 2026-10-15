# 使用与技术参考

此文描述当前 `0.1.0` 的实际边界。主入口与构建方式见 [README](../README.md)。仓库其他中文工作单保留开发历史，不代表已交付功能或新的执行授权。

## 导入与整理

| 项目 | 当前规则 |
|---|---|
| 主资料 | HTML，单份最多 20 MiB |
| 批量导入 | 最多 20 份、每份 20 MiB、总量 100 MiB，统一分类 |
| 历史附件 | 旧库/备份中的 PDF / TXT / HTML 保留下载；不再新增附件 |
| 来源链接 | 仅 HTTPS |
| 文件夹 / 标题 | 名称去首尾空白后 1–30 / 1–120 字符 |

导入只选择主 HTML，可选填写 HTTPS 来源链接。列表只显示分类与阅读状态；“源码”用于编辑当前 HTML，不再展示附件阅读器。旧附件与阅读位置保留，通过更多菜单下载历史附件。

批量逐份检查并串行保存，外部资源依赖需逐份确认。结果分为新增、重复跳过与失败；失败沿同一次请求重试，停止只阻止剩余项，已保存不会撤销。队列仅保留在当前页面，刷新不承诺继续上传。保存中的结果未确认时应核对资料库或重试同一请求。

同一 HTML 的 SHA-256 相同则跳过整条资料，不覆盖标题、分类、来源、状态和备注。同一次 `requestId` 重试返回既有结果。文件与元数据全部保存后才返回成功，失败回滚本次写入。

文件夹为一层。自定义文件夹行的“⋯”在桌面侧栏与窄屏分类抽屉中常显，在按钮旁展开两项小菜单，提供重命名、删除；名称输入与删除确认保留原弹窗。小菜单可由外部点击、Escape、同一按钮、滚动或窗口尺寸变化收起；支持方向键、Home/End、Tab/Enter，并同步焦点及展开状态。进入自定义文件夹后的工具栏也保留同样操作。系统全部资料、最近阅读、未分类和回收站不提供改名/删除。重命名预填名称，可按 Enter 保存，失败保留输入；删除确认显示该文件夹的非回收资料总数，不受搜索或阅读状态筛选影响。操作与资料库读回期间禁用确认/取消、阻止 Escape 关闭；结果未确认时保留弹窗供重试。删除文件夹使资料归入未分类，原件、阅读状态、备注和位置不变；回收条目仅解除文件夹归属，仍在回收站。操作其它文件夹不会切换当前分类或清空搜索/状态筛选，阅读页也不会退出或重置正文。回收站可以恢复，暂不永久删除。编辑产生的中间 HTML 文件保守保留，暂未提供版本历史界面和孤立文件清理。

## 阅读、状态与备注

仅已保存 HTML 阅读页更新阅读位置；源码草稿与预览不写阅读坐标，旧 `reading.source` 保留。“从头阅读”仅重置已保存 HTML。正常退出有短暂保存机会，强制结束或系统关机不保证最后一刻的位置已保存。

章节目录来自静态 `h1`–`h6`，最多 200 项、每项标题最多 200 字符。排除已知隐藏内容，不计算外部/样式表 CSS，也不包含脚本动态生成的章节。每次打开资料默认收起，切换 HTML/源码不自动展开；桌面约 260ms 左滑并同步推移阅读区，iframe DOM 保持；关闭目录 inert。窄屏使用左滑抽屉，减少动态效果时关闭动画。

新资料为未读，首次打开变为在读；已读不会因再次打开被改回在读。手动改回未读仍保留阅读位置。

备注为纯文本，最多 8000 个 JavaScript 字符单元。点击保存并得到服务端成功反馈才是已保存；失败保留当前草稿，但草稿不跨刷新或重开保留。Markdown 导出只包含服务器已保存的标题、文件名、来源、阅读状态和备注，不包含尚未保存的草稿，也不会自动写入 Obsidian。

## HTML 源码与保存

源码为当前文件的解码原始内容，不含展示桥注入。普通 textarea 编辑，约 350ms 防抖生成隔离预览；窄屏上下排列。切 tab 保留草稿；手动保存，失败/409 保留草稿，重新载入前明确确认放弃。保存中阻止换页，离开或关闭窗口保护未保存编辑。预览用有界临时缓存，不进库或备份。

保存 multipart HTML（20 MiB）与当前文件 SHA-256 revision。服务端同一事务读当前版本：新 hash 与当前相同则幂等成功；否则旧 revision 或另一条目的当前 hash 冲突返回 409，不盲覆盖。不可变新增文件、首次 originalHtmlFileId、当前 htmlFileId/htmlHash 与正文索引同一事务提交，失败回滚并清新增文件。标题、状态、备注、旧位置/附件保持。

编辑保存与预览统一 UTF-8，只借助 parser 源索引修改真实 meta charset / http-equiv 声明；脚本、注释中的伪 meta 不匹配，不整体序列化源码。解码按 BOM 与真实 meta 识别 GBK/UTF16 等编码。首次保存保留原导入 HTML 引用，后续不变；更多菜单分别下载当前 HTML 和导入原件。再次导入旧原件可能成为另一条资料，去重依据当前 HTML 字节 hash。

## 搜索

标题与原 HTML 静态正文采用中文字面子串、英文忽略大小写的匹配；`%` 和 `_` 为普通字符，查询最多 120 字符。搜索跨文件夹，回收站范围只返回回收条目，可与阅读状态组合筛选。标题与结果片段显示关键词高亮；打开资料仍从已保存位置继续，不跳至命中词。

解析器实体解码、压缩空白，排除 head/title/script/style/template/noscript 及已知隐藏内容，不执行脚本、不联网。PDF/OCR、原文附件、备注、脚本动态正文与 CSS 计算后可见性暂不索引。搜索正文派生表可从原件重建。

## 本地文件布局

`<dataDir>` 为桌面标准资料目录、独立开发目录或网页版 `.data/`。

```text
<dataDir>/
  library.sqlite       元数据、文件夹、位置与正文索引
  files/<UUID>         原始文件字节
  display/<UUID>.html  用于阅读的派生展示副本
```

原文件下载取 `files/` 的原始字节，展示副本的隔离处理不改原件。不要在应用运行时手动改动数据库或文件；迁移推荐使用整库导出/恢复。

桌面配置与 `runtime.json` 位于标准库目录的上级，诊断文件记录运行 PID、origin、版本与目录，正常退出删除。每次启动使用随机回环端口。桌面与网页版不自动同步；卸载应用包不等于删除资料目录，操作资料前请备份。

网页版可通过 `PAGENEST_PORT` 和 `PAGENEST_DATA_DIR` 选择独立本机实例，端口冲突明确失败。桌面开发用绝对路径 `PAGENEST_DESKTOP_DATA_DIR` 隔离资料与 Electron 配置；仅隔离开发模式下可显式启用 `PAGENEST_DESKTOP_TEST_PORT` 调试端口，日常应用默认不开调试端口。

## 整库备份与恢复

`.pagenest` 是 gzip 压缩的 UTF-8 JSON，包含原件、分类、标题/来源/日期/回收状态、阅读状态、备注及两个视图的位置。备份没有加密。它不包含程序、环境配置、请求重试记录、展示副本、派生索引或密钥。

恢复先完整校验，再事务合并；同名文件夹复用，新资料重新分配本机 UUID。相同 HTML 整条跳过，不覆盖已有内容；新资料保留原来的日期、状态、备注和位置。文件或数据库写入失败回滚本次新增，不部分合并。关闭恢复弹窗不会取消已确认的服务端操作。

| 限制 | 数值 |
|---|---|
| 压缩备份 | 100 MiB |
| 解压 JSON | 150 MiB |
| 原件总量 | 100 MiB |
| 所有数组记录合计 | 2000 |

导出版本 3；恢复接受严格的版本 1 / 2 / 3。v1 根据 `lastReadAt` 设默认未读/在读，备注为空；v2/v3 必须有合法状态与备注。v3 另外要求 nullable originalHtmlFileId，非空须引用存在、HTML MIME 且不超过 20 MiB 的文件；v1/v2 该引用规范为 null。未知版本、额外/缺失/非法字段、引用、大小、base64 或 hash 不匹配会拒绝恢复。

顶层结构：

```js
{ format: "PageNest", version: 3, exportedAt, folders, materials, files, reading }
```

`folders` 含 id/name；`materials` 与下方 DTO 一致；`files` 含 id/name/mime/size/sha256/data（严格 base64 原件）；`reading` 含 materialId/view/scrollTop/page/updatedAt。日期使用 ISO UTC 毫秒格式；展示与索引恢复时从原件重建，不信任备份派生内容。

## API

均返回 JSON（文件/页面端点除外）；错误 `{error, code?, materialId?, warnings?}`。无认证仅限当前 loopback 个人阶段。

| 方法与路径 | 输入与结果 |
|---|---|
| `GET /api/backup/export` | 校验后返回 no-store attachment `.pagenest` 二进制 |
| `POST /api/backup/restore` | 单个二进制备份，合并 → `{added,skipped}`；沿用同源写入校验 |
| `GET /api/health` | 本机健康状态 |
| `GET /api/search?q=...&trash=0` | `{results:[{id,snippet}]}`，默认非回收全库；trash=1 只搜索回收站，片段为最多182字符的纯文本 |
| `GET /api/library` | `{folders,materials,files}` 当前权威元数据，含回收站 |
| `POST /api/folders` | JSON `{name}` → `{id,name}` |
| `PATCH /api/folders/:id` | `{name}` 重命名 |
| `DELETE /api/folders/:id` | 删夹并由外键将条目归未分类 |
| `POST /api/inspect` | multipart `html`，源码预览另带 `editorPreview=true` → `{title,warnings,previewUrl}`；最多保留3份短期预览 |
| `GET /api/previews/:id` | 10分钟受限展示副本，执行展示 CSP |
| `POST /api/import` | multipart `html`, 可选 `title`, `folderId`, `sourceUrl`, `requestId`, `acceptExternal` → `{material,replayed}`；新保存201，同请求200，内容重复409 |
| `GET /api/materials/:id` | material DTO |
| `PATCH /api/materials/:id` | `{title?,folderId?,sourceUrl?,deleted?,readingStatus?,notes?}`；空 folderId 为未分类 |
| `POST /api/materials/:id/open` | 更新最近阅读，返回 `{material,reading}` |
| `GET /api/materials/:id/html` | `{source,revision,filename,material}`，当前原始 HTML 解码源码，无展示注入 |
| `PUT /api/materials/:id/html` | multipart 仅 `html` 与 `revision`，UTF-8 规范化/CAS；返回 `{material,revision,filename,source}`，冲突409 |
| `GET /api/materials/:id/markdown` | 当前已保存 metadata / 纯文本备注，no-store attachment `.md` |
| `GET /api/materials/:id/outline` | `{outline:[{id,label,level}]}`，主 HTML 的有界静态章节，只读 |
| `GET /api/materials/:id/reading` | `{html?,source?}`，各含 `{scrollTop,page,updatedAt}` |
| `PUT /api/materials/:id/reading/:view` | view=`html/source`；`{scrollTop,page}` 有界校验 |
| `GET /api/files/:id/download` | 取 metadata 指向的 UUID 原文件，attachment |
| `GET /api/files/:id/display` | HTML/TXT 展示副本（沙箱 CSP） |
| `GET /api/files/:id/raw` | 仅 PDF，供原生预览；HTML 不开放原始 inline 路径 |

文件夹名称trim后1–30字符、不能同名或占系统名；资料标题trim后1–120；来源链接仅HTTPS。资料DTO为 `{id,title,folderId,htmlFileId,originalHtmlFileId,sourceFileId,sourceUrl,deletedAt,createdAt,lastReadAt,readingStatus,notes}`；file为 `{id,name,mime,size,sha256}`。服务端从 metadata 查文件，不接收用户路径。

## 桌面与隔离限制

主窗口关闭 Node 集成，启用 context isolation / sandbox / webSecurity，无通用 preload/IPC。展示 HTML 的 iframe 仅允许脚本，不授予 same-origin，继续限制外部网络、嵌套框架与对象。消息桥只处理受控导航及当前 iframe 的有界位置/尺寸，不提供业务写命令。

外部来源仅在可信主页面发起 HTTPS 并经原生确认后打开默认浏览器。原件、Markdown 和备份通过系统保存对话框下载；历史 PDF/TXT/HTML 附件只提供下载，不提供新的附件编辑或阅读入口。

当前 macOS 包未 Apple 公证，没有自动更新、开机启动、文件关联或托盘。Electron 固定 44.7.2，electron-builder 固定 26.15.3；版本以 package-lock 为准。不要把本机运行证据当作跨平台、任意恶意 HTML、长期大库或多人部署保证。
