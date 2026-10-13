# PageNest
私人 HTML 阅读库：保存 AI 整理页面与原始资料，按文件夹归类并继续阅读。

## 本机第一版

Node.js 22.13+（当前核验为 22.23.2），普通 HTML/CSS/JS、Node HTTP、内置 SQLite 与普通文件。`node:sqlite` 在当前版本仍会发出 ExperimentalWarning。

```sh
npm ci
npm start
```

默认仅监听 `http://127.0.0.1:4173`，默认资料目录为项目 `.data/`。端口占用会明确失败，不自动换端口或绑定网络。可用 `PAGENEST_PORT` 和 `PAGENEST_DATA_DIR` 指定独立本机实例；测试应使用临时目录与独立端口。**本次候选的正式 `.data` 启动仍须总控 ACCEPT；Writer 只启动隔离测试实例。**

应用从空库开始。电脑选择一份真实 HTML（20 MB 以内），可选一份 PDF/TXT/HTML 原文（50 MB 以内）及 HTTPS 来源链接，保存后直接阅读。资料库或导入页可拖放 / 选择多份 HTML：最多20份、每份20MiB、总100MiB，统一分类、先检查再串行真实保存。逐份显示新增、重复跳过与失败，失败可沿原 requestId 重试，成功条目不重导；外部资源逐份重新取得受限预览并明确确认，未确认不会保存。停止只阻止剩余项，等待当前请求读回（每请求有120秒上限，超时结果未确认时沿同一次请求重试）；已保存保留，不表示整批回滚。分类在保存开始后固定，批量来源随后逐份补充；一份文件仍用原标题 / 可选来源 / 保存阅读流程。队列仅保留在当前页面，刷新或关页不承诺续传，已有保存仍在库中。

单层文件夹、全库标题与 HTML 静态正文搜索、最近阅读、资料编辑/移动、回收站恢复、原文件下载和独立阅读位置均由服务端存储。`examples/` 全部为公开虚构材料，须手动选择并真实导入，不会预填进资料库。

阅读器沿用用户批准的原型：桌面48px / 手机约55px紧凑顶栏，HTML/原文圆润胶囊、绿色底块约260ms滑动、减少动态效果、手机44px触控区域。无底部状态栏；顶栏“从头阅读”只重置当前 HTML/TXT/原文 HTML 至顶部，或 PDF 的手动页码到1，另一视图位置不变；原文视图没有可读文件时该动作禁用。HTML 自身图文和离线交互在独立沙箱中显示。固定宽度只影响正文区域，可缩放到屏幕；缩放不修改原文件。

## 章节目录

HTML 阅读页的“目录”从静态 h1–h6 提取，最多200项、标题最多200字；桌面为可收起窄侧栏，手机复用分类同款抽屉，点章节后自动关闭并滚动到对应标题。跳转继续保存 HTML 阅读位置，重开可接着读；原文视图不提供主 HTML 目录。没有标题时给出空态，载入失败可重试。紧凑顶栏、HTML/原文胶囊和原件下载保留；窄屏“从头阅读”使用带可访问名称的箭头按钮。

目录和展示副本由同一解析规则生成，排除 head/template/script/style/noscript、hidden、aria-hidden=true、内联 display:none / visibility:hidden 等已知不可见标题及空标题；不计算外部/样式表 CSS，不包含脚本生成的标题。原有 id 保留，输入的 data-pagenest-heading 清除后只在可导航标题添加受控标记。旧资料读取时从原件生成当前展示与目录，不改原件、数据库、位置或磁盘中的旧派生文件；每次 HTML 展示/目录请求各做一次有界文件解析，不声称大文件性能已验收。

跳转消息只由 parent 发给当前 opaque iframe，channel=pagenest-reading / type=heading / 白名单 pn-heading-N。桥只检查父窗口并滚动受控标题；消息不提供业务写命令。主应用仍只接受当前 iframe 的有界 position/size，CSP 与 sandbox 不变。

## 阅读状态与个人备注

列表显示未读 / 在读 / 已读，可与现有分类和关键词搜索组合筛选。新导入为未读，打开未读资料自动变为在读；手动已读后再打开仍为已读。更多菜单可手动切换三种状态，改回未读不会重置原有阅读位置。滚动消息仅保存位置，不修改状态。

列表和阅读器的更多菜单均可打开“个人备注”，使用普通 textarea，最多8000字；明确保存后才更新权威值。保存期间禁用输入，失败保留草稿；Escape、关闭和应用内换弹窗都会提醒未保存修改，可继续编辑或放弃。保存请求最多等待120秒，超时表示结果未确认，可保存同一草稿后核对。备注不纳入 HTML 全文索引。

“导出 Markdown”只下载服务器已保存的标题、HTML文件名、可选原文文件名/来源链接、阅读状态和个人备注。备注编辑器内明确提醒未保存内容不会下载；元数据与备注作为纯文本转义，HTTPS来源链接保留可点击形式。文件不自动写入 Brain 或其它目录，由用户选择存放。

启动仅对缺失列做一次事务增量迁移：旧 lastReadAt 非空设在读，否则未读，备注默认空；之后重启不覆盖手动值。新增列默认值与原件、来源、请求ID、分类、位置独立。JSON表单上限为64KiB，支持8000字中文备注，字段仍各自校验。

## 全文搜索

搜索框可匹配资料标题与原 HTML 的静态正文，中文为字面子串，英文忽略大小写；`%` / `_` 是普通字符。最长120字，空白输入显示原分类列表。搜索跨文件夹；回收站中的搜索只返回回收资料。结果显示有限纯文本片段，打开后仍从既有阅读位置继续，不跳到命中段落。

正文由现有 HTML 解析器提取：实体解码、块间留空格、压缩空白，排除 head/title/script/style/template/noscript 与 hidden、aria-hidden=true、内联 display:none / visibility:hidden 内容。不执行脚本、不联网；不能搜索脚本生成的动态内容、CSS 计算后的可见性、原文附件 PDF/TXT/HTML 或 OCR。仅图像/图表页面仍可按标题搜索。

`material_text` 是可重建的正文派生表，新导入与资料事务一并写入；启动时从原件补齐缺失索引，不改原文件或其它业务状态。标题编辑立即生效，回收/恢复改变搜索范围。`/api/library` 保持元数据响应，不包含全文。搜索等待、失败和重新搜索在现有列表中显示，失败不会伪装成空结果。

## 数据与边界

- 原始字节在 `.data/files/<UUID>`；用于阅读的 HTML/TXT 展示副本在 `.data/display/<UUID>.html`；元数据（含阅读状态及个人备注）、分类与阅读位置在 `.data/library.sqlite`。原文件下载始终取原始字节。展示副本移除资源 base/自动刷新和旧编码声明，注入最小阅读桥，单独套用 CSP，不修改原件。
- 同一次 `requestId` 重试返回原结果；同一 HTML SHA-256 的新导入提示重复并提供原 materialId，不覆盖条目。HTML、附件文件与元数据全部成功后才返回保存成功；失败回滚元数据并清理本次新文件。
- 删夹只归入未分类；回收站只改变资料状态。没有永久删除或自动清空。替换原文只改变当前关联，旧原文文件保守保留，首版没有版本管理/孤立文件清理。
- 展示端点响应 CSP `sandbox allow-scripts`，iframe 同样仅 `sandbox="allow-scripts"`，不给 same-origin。联网、嵌套 iframe、对象、base/form 等被禁；应用 `frame-src 'self'` 进一步阻止子页外部导航。主页面只接受当前 iframe Window、opaque/null origin、有界数字的 position/size 消息；其它消息不能触发业务操作。
- HTML 资源依赖先提示并提供 HTTP 受限预览，用户明确确认继续。首版承诺自包含页面与简单离线交互；不保证任意网页应用、第三方脚本、外部字体/图像或所有编码和图表兼容。沙箱不代表执行脚本的 CPU/内存已经被限额。
- PDF 使用浏览器原生预览，提供手动页码跳转、新窗口和下载。**仅保存手动跳转页码，不会自动报告或精确恢复 PDF 页内位置**。浏览器不支持内嵌 PDF 时用 fallback。TXT 安全转义为纯文本，HTML 原文采用同等隔离。
- 无登录、同步、真机/跨设备验证、部署、公开分享、AI、多级文件夹、PWA 或离线缓存承诺。服务严格 loopback；只允许 `127.0.0.1:<实际端口>` Host，同源写入必须带该 Origin，拒绝外来/null/缺失 Origin；不同来源无法跨站读写。`localhost` 别名也不开放。
- 侧栏底部或手机分类抽屉打开“备份与恢复”，下载 .pagenest；恢复仅合并，同一 HTML 原件 hash 的资料整条跳过（包括回收条目），已有分类/来源/位置/回收状态不会覆盖。恢复前完整校验，写入失败回滚 DB 与本次新文件。关闭恢复窗口不会撤销已经确认的服务器操作；结果未确认时可核对当前库或重试同一备份。

## .pagenest 版本1 / 2

内置 gzip 压缩的 UTF-8 JSON，顶层 `{format:"PageNest",version:2,exportedAt,folders,materials,files,reading}`。folders 为 id/name；materials 与 `/api/library` DTO 一致，版本2包含 readingStatus / notes；files 为 id/name/mime/size/sha256/data（严格 base64 原始字节）；reading 为 materialId/view/scrollTop/page/updatedAt。日期使用 ISO UTC 毫秒格式。仅支持 HTML/TXT/PDF；主 HTML 最多20MiB、附件50MiB。上传压缩包100MiB、解压 JSON150MiB、原件总量100MiB、所有数组记录合计2000；超限明确失败。备份不打包 requests、展示副本、搜索索引、程序代码、环境与密钥配置、数据库或服务端绝对数据目录。原件自身内容原样保留。

导出采用一致 DB 快照并校验字节 / 长度 / hash。恢复先验证完整 schema、唯一 ID、名称/标题/HTTPS链接、日期、文件与阅读引用、base64/大小/hash，再从原件重建 display 和正文索引；不信任派生内容。分类按同名复用，新资料分配本机 UUID，保留日期、回收状态和双视图位置。原件包含保守保留的旧来源与空分类；已有原件按 sha256+mime+name 复用，不同名字保留。空库首次恢复保留全部文件记录；重复恢复不增加孤立原件。损坏、未知版本、非法字段、引用或写入失败均不会部分合并。

导出使用严格版本2字段集；恢复同时接受严格版本1字段集，按 lastReadAt 归一化默认状态及空备注。版本2状态须为 unread/reading/read、备注须为≤8000字字符串，缺失/非法/额外字段拒绝且无部分恢复。相同HTML整条跳过，不覆盖现有状态或备注；恢复新资料保留两字段。

备份没有加密，包含完整原件；请保存到你选择的本地位置。此次只在虚构临时库验证，正式资料库恢复由用户另行选择，不自动覆盖或清空。

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
| `POST /api/inspect` | multipart `html` 或 `source` HTML → `{title,warnings,previewUrl}`；最多保留3份短期预览 |
| `GET /api/previews/:id` | 10分钟受限展示副本，执行展示 CSP |
| `POST /api/import` | multipart `html`, 可选 `source`, `title`, `folderId`, `sourceUrl`, `requestId`, `acceptExternal` → `{material,replayed}`；新保存201，同请求200，内容重复409 |
| `GET /api/materials/:id` | material DTO |
| `PATCH /api/materials/:id` | `{title?,folderId?,sourceUrl?,deleted?,readingStatus?,notes?}`；空 folderId 为未分类 |
| `POST /api/materials/:id/open` | 更新最近阅读，返回 `{material,reading}` |
| `POST /api/materials/:id/source` | multipart 可选 `source`, `sourceUrl`, `requestId`, `removeSource`, `acceptExternal`；更新当前原文关联 |
| `GET /api/materials/:id/markdown` | 当前已保存 metadata / 纯文本备注，no-store attachment `.md` |
| `GET /api/materials/:id/outline` | `{outline:[{id,label,level}]}`，主 HTML 的有界静态章节，只读 |
| `GET /api/materials/:id/reading` | `{html?,source?}`，各含 `{scrollTop,page,updatedAt}` |
| `PUT /api/materials/:id/reading/:view` | view=`html/source`；`{scrollTop,page}` 有界校验 |
| `GET /api/files/:id/download` | 取 metadata 指向的 UUID 原文件，attachment |
| `GET /api/files/:id/display` | HTML/TXT 展示副本（沙箱 CSP） |
| `GET /api/files/:id/raw` | 仅 PDF，供原生预览；HTML 不开放原始 inline 路径 |

文件夹名称trim后1–30字符、不能同名或占系统名；资料标题trim后1–120；来源链接仅HTTPS。资料DTO为 `{id,title,folderId,htmlFileId,sourceFileId,sourceUrl,deletedAt,createdAt,lastReadAt,readingStatus,notes}`；file为 `{id,name,mime,size,sha256}`。服务端从 metadata 查文件，不接收用户路径。

## 轻量检查

```sh
npm run check
npm test
```

`npm test` 仅一份 focused 文件、并发1、独立临时目录：真实导入、原件字节、去重/幂等、分类、位置、重启，以及最小 Host/Origin/路径/CSP/附件故障回滚反例；不运行压力或全量测试。本次浏览器证据与限制见本地 `artifacts/V1-交付.md`（Git忽略），不把原型检查当业务验收。
