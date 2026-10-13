# PageNest
私人 HTML 阅读库：保存 AI 整理页面与原始资料，按文件夹归类并继续阅读。

## 本机第一版

Node.js 22.13+（当前核验为 22.23.2），普通 HTML/CSS/JS、Node HTTP、内置 SQLite 与普通文件。`node:sqlite` 在当前版本仍会发出 ExperimentalWarning。

```sh
npm ci
npm start
```

默认仅监听 `http://127.0.0.1:4173`，默认资料目录为项目 `.data/`。端口占用会明确失败，不自动换端口或绑定网络。可用 `PAGENEST_PORT` 和 `PAGENEST_DATA_DIR` 指定独立本机实例；测试应使用临时目录与独立端口。**本次候选的正式 `.data` 启动仍须总控 ACCEPT；Writer 只启动隔离测试实例。**

应用从空库开始。电脑选择一份真实 HTML（20 MB 以内），可选一份 PDF/TXT/HTML 原文（50 MB 以内）及 HTTPS 来源链接，保存后直接阅读。单层文件夹、全库标题搜索、最近阅读、资料编辑/移动、回收站恢复、原文件下载和独立阅读位置均由服务端存储。`examples/` 全部为公开虚构材料，须手动选择并真实导入，不会预填进资料库。

阅读器沿用用户批准的原型：顶栏 HTML/原文圆润胶囊、绿色底块约260ms滑动、减少动态效果、手机44px触控区域。HTML 自身图文和离线交互在独立沙箱中显示。固定宽度只影响正文区域，可缩放到屏幕；缩放不修改原文件。

## 数据与边界

- 原始字节在 `.data/files/<UUID>`；用于阅读的 HTML/TXT 展示副本在 `.data/display/<UUID>.html`；元数据、分类与阅读位置在 `.data/library.sqlite`。原文件下载始终取原始字节。展示副本移除资源 base/自动刷新和旧编码声明，注入最小阅读桥，单独套用 CSP，不修改原件。
- 同一次 `requestId` 重试返回原结果；同一 HTML SHA-256 的新导入提示重复并提供原 materialId，不覆盖条目。HTML、附件文件与元数据全部成功后才返回保存成功；失败回滚元数据并清理本次新文件。
- 删夹只归入未分类；回收站只改变资料状态。没有永久删除或自动清空。替换原文只改变当前关联，旧原文文件保守保留，首版没有版本管理/孤立文件清理。
- 展示端点响应 CSP `sandbox allow-scripts`，iframe 同样仅 `sandbox="allow-scripts"`，不给 same-origin。联网、嵌套 iframe、对象、base/form 等被禁；应用 `frame-src 'self'` 进一步阻止子页外部导航。主页面只接受当前 iframe Window、opaque/null origin、有界数字的 position/size 消息；其它消息不能触发业务操作。
- HTML 资源依赖先提示并提供 HTTP 受限预览，用户明确确认继续。首版承诺自包含页面与简单离线交互；不保证任意网页应用、第三方脚本、外部字体/图像或所有编码和图表兼容。沙箱不代表执行脚本的 CPU/内存已经被限额。
- PDF 使用浏览器原生预览，提供手动页码跳转、新窗口和下载。**仅保存手动跳转页码，不会自动报告或精确恢复 PDF 页内位置**。浏览器不支持内嵌 PDF 时用 fallback。TXT 安全转义为纯文本，HTML 原文采用同等隔离。
- 无登录、同步、真机/跨设备验证、部署、公开分享、AI、批量导入、多级目录、PWA 或离线缓存承诺。服务严格 loopback；只允许 `127.0.0.1:<实际端口>` Host，同源写入必须带该 Origin，拒绝外来/null/缺失 Origin；不同来源无法跨站读写。`localhost` 别名也不开放。
- 完整备份请停止本机服务后复制整个资料目录；保持 SQLite 与 files/display 配套。不要单独复制运行中的数据库文件。本次未做备份恢复专项验收。

## API

均返回 JSON（文件/页面端点除外）；错误 `{error, code?, materialId?, warnings?}`。无认证仅限当前 loopback 个人阶段。

| 方法与路径 | 输入与结果 |
|---|---|
| `GET /api/health` | 本机健康状态 |
| `GET /api/library` | `{folders,materials,files}` 当前权威元数据，含回收站 |
| `POST /api/folders` | JSON `{name}` → `{id,name}` |
| `PATCH /api/folders/:id` | `{name}` 重命名 |
| `DELETE /api/folders/:id` | 删夹并由外键将条目归未分类 |
| `POST /api/inspect` | multipart `html` 或 `source` HTML → `{title,warnings,previewUrl}`；最多保留3份短期预览 |
| `GET /api/previews/:id` | 10分钟受限展示副本，执行展示 CSP |
| `POST /api/import` | multipart `html`, 可选 `source`, `title`, `folderId`, `sourceUrl`, `requestId`, `acceptExternal` → `{material,replayed}`；新保存201，同请求200，内容重复409 |
| `GET /api/materials/:id` | material DTO |
| `PATCH /api/materials/:id` | `{title?,folderId?,sourceUrl?,deleted?}`；空 folderId 为未分类 |
| `POST /api/materials/:id/open` | 更新最近阅读，返回 `{material,reading}` |
| `POST /api/materials/:id/source` | multipart 可选 `source`, `sourceUrl`, `requestId`, `removeSource`, `acceptExternal`；更新当前原文关联 |
| `GET /api/materials/:id/reading` | `{html?,source?}`，各含 `{scrollTop,page,updatedAt}` |
| `PUT /api/materials/:id/reading/:view` | view=`html/source`；`{scrollTop,page}` 有界校验 |
| `GET /api/files/:id/download` | 取 metadata 指向的 UUID 原文件，attachment |
| `GET /api/files/:id/display` | HTML/TXT 展示副本（沙箱 CSP） |
| `GET /api/files/:id/raw` | 仅 PDF，供原生预览；HTML 不开放原始 inline 路径 |

文件夹名称trim后1–30字符、不能同名或占系统名；资料标题trim后1–120；来源链接仅HTTPS。资料DTO为 `{id,title,folderId,htmlFileId,sourceFileId,sourceUrl,deletedAt,createdAt,lastReadAt}`；file为 `{id,name,mime,size,sha256}`。服务端从 metadata 查文件，不接收用户路径。

## 轻量检查

```sh
npm run check
npm test
```

`npm test` 仅一份 focused 文件、并发1、独立临时目录：真实导入、原件字节、去重/幂等、分类、位置、重启，以及最小 Host/Origin/路径/CSP/附件故障回滚反例；不运行压力或全量测试。本次浏览器证据与限制见本地 `artifacts/V1-交付.md`（Git忽略），不把原型检查当业务验收。
