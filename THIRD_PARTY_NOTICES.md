# 第三方许可说明

PageNest 自身代码、图标及虚构示例采用 [MIT](LICENSE)。第三方依赖保留各自许可证；安装或分发依赖时应保留其 LICENSE、版权与 NOTICE 文件。导入的用户资料和资料引用的资源不受项目 MIT 许可重新授权。

以下为当前锁定的主要直接依赖与 HTML 解析运行链，不是所有开发间接依赖的完整清单；完整版本以 `package-lock.json` 为准，许可证文本以相应软件包为准。

| 软件包 | 版本 | 许可 |
|---|---|---|
| busboy | 1.6.0 | MIT |
| streamsearch | 1.1.0 | MIT |
| htmlparser2 | 12.0.0 | MIT |
| dom-serializer | 3.1.1 | MIT |
| domhandler | 6.0.1 | BSD-2-Clause |
| domutils | 4.0.2 | BSD-2-Clause |
| domelementtype | 3.0.0 | BSD-2-Clause |
| entities | 8.1.0 | BSD-2-Clause |
| Electron | 44.7.2 | MIT，内含第三方组件另有许可 |
| electron-builder | 26.15.3 | MIT |

Electron 分发还包含 Chromium、Node.js 等组件。打包或再分发桌面程序时，应保留 Electron 运行环境提供的 LICENSE 与第三方通知；不能用本项目 MIT 文本替代它们。本项目未声明对全部第三方组件拥有版权。
