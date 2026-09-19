# QBrowse Flagship Features & Bug Fixes Roadmap

This document tracks our point-by-point execution of flagship browser features and key UX improvements. Each item is addressed in sequence with a dedicated implementation plan and user review.

---

## 📌 Master Task List

- [x] **Task 1: Fix Unwanted Inline Autofill Popup**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Removed unsolicited inline DOM badge injection in `webview_preload.cjs`. Fixed `main.cjs` so `vault-get-matching` strictly returns `[]` when `targetHost` is missing, preventing random popups over search bars and inputs.

- [x] **Task 2: Find in Page (`Ctrl+F`)**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Implemented floating glassmorphic Find in Page bar with real-time Chromium keyword highlighting, live match counter (`X of Y` / `0 of 0`), Next/Prev navigation (`Enter`/`Shift+Enter` and `F3`/`Shift+F3`), case-sensitive toggle (`Aa`), global `Esc` dismissal, right-click context menu item, and Omnibox `>find` command.

- [x] **Task 3: Page Printing & Clean PDF Export (`Ctrl+P`)**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Added native Chromium/OS printing via `Ctrl+P` (both global shell and active webview `before-input-event`), right-click context menu item ("Print..."), and Omnibox `>print` command. Built one-click "Save as Clean PDF" using Electron `printToPDF()` with native OS save file dialog (`dialog.showSaveDialog`), context menu option, and Omnibox `>pdf` command.

- [x] **Task 4: Webpage Screenshot & Snipping Tool**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Added interactive multi-mode screen capture (`Ctrl+Shift+S`, Omnibox `>screenshot` & `>snip`, Tool Hub quick actions). Supports:
    1. Interactive Snip Area with click-drag rectangle selection, live dimensions, corner grippers, and quick confirm/cancel.
    2. Visible Viewport capture via `webview.capturePage()`.
    3. Full Scrolling Webpage capture via Chrome DevTools Protocol (`Page.captureScreenshot` with `captureBeyondViewport: true`).
    - Captured images are automatically copied to the system clipboard (`clipboard.writeImage`) and saved to the user's `Downloads` folder as high-res PNGs, with an interactive toast notification offering "Open Folder" action.

- [x] **Task 5: Smart Search Bangs & Omnibox Keywords**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Added DuckDuckGo-style bangs (`!g`, `!gh`, `!yt`, `!w`, `!r`, `!so`, `!ddg`, `!a`, `!x`, `!maps`, `!npm`, `!mdn`, `!chatgpt`, `!p`) and Arc/Chrome-style `@` keyword mentions (`@youtube`, `@github`, `@wikipedia`, etc.). Features:
    1. Interactive colored engine badge pills inside the Omnibox input (`[YouTube ✕] <query>`).
    2. Instant engine autocomplete suggestions when typing `!` or `@` with `Tab` / `Enter` lock-in.
    3. Trailing and leading bang parsing (e.g. `!yt lofi` or `lofi !yt`).
    4. Backspace dismissal of active bang chips.
    5. Custom Bang Manager in Settings -> Search & Omnibox with filterable catalog, custom prefix, name, URL template (`{q}`), and color picker.

- [ ] **Task 6: Distraction-Free Article Reader Mode**
  - *Status*: 🟡 NEXT UP (Ready for design & interview)
  - *Goal*: Omnibox book icon on articles/blogs, clean reader canvas with custom typography (Serif/Sans/Dyslexic), dark/sepia/light themes, and hands-free local TTS Audio Read Aloud.

- [ ] **Task 7: Webpage Highlighter & Persistent Sticky Notes**
  - *Status*: ⚪ PENDING
  - *Goal*: Select text on any webpage -> Right-click Context Menu -> "Highlight" / "Add Note". Highlights persist across sessions and notes appear grouped by domain in ToolHub.

---

*Last Updated*: 2026-09-19
