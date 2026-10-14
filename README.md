# PageNest

[![English](docs/images/lang-en.svg)](README.md) [![简体中文](docs/images/lang-zh.svg)](README.zh-CN.md)

Keep your HTML reading materials together. Pick up where you left off.

PageNest is a local-first HTML reading library. Import articles, study notes, or AI-generated pages, organize them into folders, search their contents, and keep track of your reading progress and personal notes. It includes a macOS desktop app for Apple Silicon and a lightweight local web version. The current app interface is in Simplified Chinese.

![PageNest library with highlighted search results](docs/images/library.png)

*The screenshot uses fictional materials. A new installation starts with an empty library.*

## Features

- **Import and organize**: drag in one HTML file or a batch, choose a shared folder, and skip duplicates. Original PDF, TXT, or HTML attachments and HTTPS source links are optional.
- **Folder management**: use the visible ⋯ beside a custom folder in the sidebar or category drawer to open a small menu beside that button. Rename and delete keep their existing input and confirmation dialogs. Deleting a folder moves its materials to Uncategorized and preserves their contents; system categories cannot be renamed or deleted.
- **Full-text search**: search titles and static HTML text, with highlighted keywords in result titles and snippets.
- **Resume reading**: save your reading position, navigate with a collapsible table of contents, and switch between HTML and the original source within the same entry.
- **Reading status**: filter by unread, reading, or read alongside folders and search results.
- **Personal notes**: save plain-text notes and export the title, source, status, and notes as Markdown for tools such as Obsidian.
- **Library backup**: export a `.pagenest` file and restore by merging and deduplicating, preserving existing materials.

Your materials stay on your computer. No account or API key is required. You can generate HTML with your preferred tools outside PageNest, then import it.

## Use the desktop app

Open `PageNest.app` to start reading. It includes its runtime, so you do not need to start a terminal service first. Opening it again brings the existing window forward. Closing the window or quitting the app stops its local service; unsaved edits prompt for confirmation.

**No downloadable installer has been published on GitHub yet.** Build from source using the steps below. The current desktop delivery targets macOS Apple Silicon; Intel Macs, Windows, and Linux have not been validated.

The default library location is:

```text
~/Library/Application Support/PageNest/library
```

Use **Backup and Restore** (`备份与恢复`) in the sidebar to export backups regularly. Updating the app does not automatically delete this directory. The desktop library and the source-run web version's `.data/` directory are independent; transfer materials manually through backup and restore.

## Run from source

Requires Node.js **22.13 or newer**, npm, and an internet connection for the initial dependency installation.

```sh
git clone https://github.com/Brandoo110/PageNest.git
cd PageNest
npm ci
PAGENEST_DESKTOP_DATA_DIR="$PWD/.data-desktop-dev" npm run desktop:dev
```

This command uses a separate development library to keep your everyday desktop library untouched. The first installation downloads the Electron runtime.

To run the local web version:

```sh
npm start
```

Open `http://127.0.0.1:4173`. Materials are stored in the project's `.data/` directory. The service listens only on the local loopback address and does not support direct LAN or public hosting.

## Build the macOS installer

After installing dependencies on macOS Apple Silicon, run:

```sh
npm run desktop:package
```

Outputs are placed in `artifacts/desktop/build/`:

- `mac-arm64/PageNest.app`
- `PageNest-0.1.0-arm64.dmg`

The current build is ad-hoc signed and **has no Developer ID signature or Apple notarization**. Gatekeeper may restrict it on other computers. Packaging does not upload the installer, and automatic updates are not available.

## Before you import

- Prefer self-contained HTML. External images, fonts, scripts, and complex web applications may not display fully.
- Imported HTML runs in an isolated sandbox, while original file bytes are preserved. Use trusted materials: script CPU and memory use are not independently capped.
- Search covers titles and static HTML text. It does not include PDF/OCR, original attachments, notes, or script-generated content. The table of contents uses static headings.
- PDF preview depends on the runtime. Progress stores manually selected page numbers; restoring a position within a PDF page is not guaranteed. The desktop **Open in new window** action saves the PDF file.
- Backups include complete originals and notes and **are not encrypted**. Restore merges materials; matching HTML entries are skipped without overwriting existing statuses or notes.
- Built-in AI, accounts, synchronization, nested folders, cloud services, and collaboration are not available.

For file limits, batch import, saving behavior, and backup formats, see the [Usage and Technical Reference](docs/technical-reference.md) (Chinese).

## Development and contributions

Plain HTML/CSS/JavaScript, Node HTTP, and SQLite, with Electron as the desktop entry point. No frontend build framework is required.

- [Contributing](CONTRIBUTING.md) (Chinese): workspaces, branches, submissions, and proportionate checks.
- [Data and Security](SECURITY.md) (Chinese): isolation, privacy, and reporting issues.
- [Changelog](CHANGELOG.md) (Chinese): delivered features.
- [Third-Party Notices](THIRD_PARTY_NOTICES.md) (Chinese).

PageNest is licensed under the [MIT License](LICENSE). This license covers the project's own code and examples; it does not change the copyright or licenses of materials you import.
