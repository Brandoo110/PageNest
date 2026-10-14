# PN-DESKTOP · macOS 桌面版完整工作单

## 目标、基线与角色
用户已批准实现前述 Electron 桌面方案。一个可独立验收的完整里程碑：macOS Apple Silicon 的 PageNest.app/.dmg，点击自动启动现有 HTML 阅读库、重复启动仅唤起同窗口、退出关闭本地服务，独立应用资料目录，验收后安装迁入原5份资料并打开给用户使用。保持当前界面，不做原生重写。
accepted main=5e3761b274f89185507832cd1411827d7ba58f30。代码管理准备 /Users/junjieli/PageNest-library 的 codex/macos-desktop，HEAD/base 同 main且clean后才派 Writer。原root feat/ai-html-generation/31e9b83 dirty、暂停12源码/原型/正式.data保持，不切换/清理/运行root。
唯一业务Writer：PageNest V1 实现 01a133e7-4a95-7522-8c0e-462fc8da80b2；唯一Git：PageNest 代码管理 01a133f1-512d-72a0-bd9d-dfb533aa1c3e。6.1 Sol / High / 用户已开启Fast；actual tier未知不伪报。总控独占治理/Brain、一次完整候选验收、正式安装/资料迁移。

## 前置与读取
必须读本工作单、docs/开发与分支约定.md、package.json、src/server.js的createApp/close、src/store.js的构造/backup/close、src/html.js的CSP、public/app.js的notes/批量/导出与iframe消息、public/index.html/style.css、.gitignore与README。
当前arm64，Node22.23.2/npm10.9.8，16GiB RAM、可用磁盘22GiB。npm registry fresh stable electron44.7.2、electron-builder26.15.3；明确固定版本及lock。官方 app lifecycle/single-instance/userData 与security： https://www.electronjs.org/docs/latest/api/app ，https://www.electronjs.org/docs/latest/tutorial/security ，https://www.electron.build/mac/ 。若已有固定版本并证实适配，不为追最新版改包。首次安装后先核实 Electron 实际process.versions/node:sqlite可用；不是用系统Node smoke冒充Electron运行。

## 允许写入与非目标
业务 allowlist：desktop/**（入口/安全策略/必要图标assets/少量打包脚本）、electron-builder.yml（若采用独立配置）、package.json、package-lock.json、.gitignore、README.md、tests/desktop.test.js；src/server.js仅必要close/start复用改动，public/app.js仅必要桌面退出草稿/在途提醒或外链下载适配。其它public布局、store/schema/html/backup/bridge/upload/test既有文件只读，发现必要共享合同改动先报exact缺口。
Writer只写artifacts/desktop/**报告与隔离临时数据。允许安装所需固定开发依赖/serial打包，禁止私有.data/桌面原件/Brain/Git/Root源码/其它项目写入。不新增可见任务、模型调用/AI/Key、账号/付费、同步/自动更新/开机启动/文件关联/Windows/Linux/公开发布/证书账号或全面工程化。
代码管理仅机械复制本工作单与管理分支/证据/准确PR，不改业务。

## 冻结合同（五项）
1. 复用createApp：Electron主进程在127.0.0.1:0自动listen，health ready后单一BrowserWindow加载其origin/#library；不依赖外部Node/npm/Codex/当前4173。requestSingleInstanceLock先于DB打开，重复启动复原/聚焦同窗口。启动失败用户可见、无空白假成功；红色关闭与Cmd+Q均有界关闭连接/DB/进程，既有notes草稿/在途导入通过beforeunload+原生确认允许保留或退出，不能借此新增特权bridge。
2. 默认资料路径固定 app.getPath(userData)=~/Library/Application Support/PageNest 下 library；开发/测试可显式PAGENEST_DESKTOP_DATA_DIR=隔离临时目录，不能偷用正式root/.data。更新不删除资料，默认不自动读取root。第一次正式迁移只由总控在ACCEPT+Git后做：快照/export现有库→停止旧服务→空desktop库restore现有v2备份→逐字段/raw/位置核对→重开；原库/快照保留。不承诺两库同步。
3. 不可信HTML保持opaque sandbox/CSP、无same-origin、无Node/Electron权限。BrowserWindow nodeIntegration=false/contextIsolation=true/sandbox=true/webSecurity=true，无通用IPC/preload/remote。限制主窗口导航/弹窗、拒绝权限请求及外部协议/任意shell命令。外部来源仅经明确用户点击并限定HTTPS打开默认浏览器，须核对发起主frame，不能让导入iframe触发。下载复用现有MD/原件/备份，系统保存对话框用户选择位置；blob MD正常。禁止为了桌面便利去掉Origin/Host校验。
4. 产品入口PageNest图标/标题，标准macOS菜单（关于、退出、编辑快捷键、窗口），布局原样紧凑；不默认DevTools、不后台托盘或开机启动。生成arm64 .app和.dmg，安装包仅正面业务源码、public、运行依赖和图标的显式allowlist，绝不包含.artifacts/.data/原型/Brain/暂停AI/源路径绝对依赖；离开repo后仍可启动。可做本机adhoc签名，不用Developer ID/Apple账号/付费/notarization；个人本机包限制如实说明，不关闭系统安全或批量xattr清理。
5. 小样本比例验证：一个desktop focused测试文件（策略/数据路径/生命周期helper必要反例）+受影响语法；一次真实Electron fake临时库桌面主流程：导入2份/原文或PDF/目录/搜索高亮/notes+MD/备份，关闭重开保持，duplicate实例不第二DB/server，不可信frame无Node且导航/弹窗/权限受限，failedstart和未保存草稿确认。一次打包后用独立目录fake启动，核验NodeSQLite、数据路径、实际bundle源hash、下载与退出无遗留。不重跑有效全量/重复build，不做压力或500MB虚构样本；串行CPU工作，发热/环境连续失败两次先定位。

## 执行与验收
先Electron运行证明→连续实现全部体验→一个focused+必要真实Electron验证→serial打包→实际打包app fake启动/退出/重开→整包scope/hash；遇缺口精确上报，健康任务不中断等总控逐文件审核。
建议命令明确到npm scripts：npm run desktop:dev / desktop:package（实际名称记录），node --test --test-concurrency=1 tests/desktop.test.js，node --check受影响JS；可用Electron DevTools protocol/Playwright仅任务自启测试端口读取/操作fake库，默认headless若Electron原生窗口必须显示则单窗口，最终关闭自己测试实例/端口。不得操纵用户Chrome或私人内容。
报告 artifacts/desktop/交付.md 一页：用户结果、变更allowlist、fixed版本和实际process.versions、命令/结果、fake与packaged证据、app/dmg路径与sha/size、显式包文件scope、defaultdataDir、诊断runtime读回方法（可在userData用600 JSON记录当前pid/origin且退出删除，不写业务内容）、已知限制/测试进程清理、source-sha256.json。完整候选后idle。独立代码管理仅一次只读隔离/本地桌面权限/打包/生命周期审核复用证据；总控ACCEPT后正常功能PR准确head合Private main，禁止直接push main。最终已打包源码若无变化不重复构建，可依据包内源hash对应accepted tree。root安装 ~/Applications/PageNest.app（目标预查不存在、不覆盖他人app），原库v2迁入并核对；真实打开与退出/再打开运行正常才goal complete。
