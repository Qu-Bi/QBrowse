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

- [ ] **Task 4: Webpage Screenshot & Snipping Tool**
  - *Status*: 🟡 NEXT UP (Ready for design & interview)
  - *Goal*: Omnibox command and ToolHub tool to capture visible viewport or full scrolling webpage with instant copy-to-clipboard and save-to-downloads.

- [ ] **Task 5: Smart Search Bangs & Omnibox Keywords**
  - *Status*: ⚪ PENDING
  - *Goal*: DuckDuckGo-style bangs (`@gh`, `@yt`, `@w`, `@r`, `@so`, `@ddg`, `@g`) with live Omnibox visual chips and search suggestions.

- [ ] **Task 6: Distraction-Free Article Reader Mode**
  - *Status*: ⚪ PENDING
  - *Goal*: Omnibox book icon on articles/blogs, clean reader canvas with custom typography (Serif/Sans/Dyslexic), dark/sepia/light themes, and hands-free local TTS Audio Read Aloud.

- [ ] **Task 7: Webpage Highlighter & Persistent Sticky Notes**
  - *Status*: ⚪ PENDING
  - *Goal*: Select text on any webpage -> Right-click Context Menu -> "Highlight" / "Add Note". Highlights persist across sessions and notes appear grouped by domain in ToolHub.

---

*Last Updated*: 2026-09-19
