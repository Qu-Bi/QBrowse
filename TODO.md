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

- [x] **Task 6: Distraction-Free Article Reader Mode**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Added Arc/Safari-grade distraction-free reading experience:
    1. **Mozilla Readability Engine**: Integrated `@mozilla/readability` to extract clean headlines, bylines, reading time estimates, hero images, and sanitized HTML without ads, trackers, or sidebars.
    2. **Automatic Article Detection**: Detects article-friendly pages on page load and dynamically pops up an interactive `BookOpen` Reader badge in the address bar.
    3. **Multiple Triggers**: Activated via Address Bar Book pill, `Ctrl+Alt+R` global shortcut, right-click context menu ("Toggle Reader Mode"), and Omnibox `>reader` command.
    4. **Arc/Safari-Grade Customization Toolbar**:
       - 4 Curated Themes: Dark (Obsidian), Sepia (Warm Paper), Light (Porcelain), and Midnight (Slate).
       - 4 Font Families: Serif (Editorial), Sans (Modern), Mono (Technical), and Dyslexic (High legibility).
       - Font Size `A-` / `A+` stepper and Column Width switcher (Compact, Balanced, Wide).
    5. **Hands-Free Local TTS Read Aloud Audio Player**:
       - Floating player bar with Play/Pause, Skip Prev/Next paragraph, Speed rates (0.75x to 2.0x), and System Voice selector.
       - Live sentence/paragraph highlighting with smooth auto-scroll to keep current narration centered in view.
       - Interactive paragraph jump: Click any paragraph in the article to immediately begin narrating from that spot.
       - Instant zero-reload exit (Esc / Back button) leaving background webview alive and untouched.

- [x] **Task 7: Webpage Highlighter & Persistent Sticky Notes**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Implemented webpage highlights and persistent sticky notes with multi-space isolation, reload resilience, and unified ToolHub workspace:
    1. **Triggering**: Floating mini-toolbar (`#qbrowse-highlight-pill`) appearing automatically on non-empty text selection with 5 color swatches, Note button, and Copy button, plus right-click Context Menu ("Highlight" with 5 color swatches, "Add Note...", "Copy", "Search with Google").
    2. **DOM Re-anchoring**: Robust text re-anchoring engine using `TreeWalker` with prefix/suffix context matching (32-character disambiguation), surviving page reloads, SPA navigations, and browser restarts.
    3. **In-Page Sticky Notes**: Inline note pin badges (`📝`) next to highlighted text. Clicking or hovering opens an interactive glassmorphic popover card (`#qbrowse-note-card`) with live note editing, color picker, delete, and auto-save.
    4. **Space Isolation**: Annotations are strictly partitioned per Space (`personal`, `work`, `ghost`) so personal and work research stay isolated on the same URL.
    5. **ToolHub Integration**: Redesigned Notes panel with segmented toggle `[ Web Notes | Scratchpad ]`:
       - Domain-grouped accordion with domain icons, note counters, and expandable highlight cards.
       - Live search bar filtering by quote, note, domain, or title.
       - Space filter toggle ("All Spaces" vs active space).
       - One-click "Jump to Page" navigation that switches to or opens the target tab, smoothly scrolls to the highlight, and pulses it.
       - One-click "Export to Markdown" (`.md` file generation).
       - Retained freeform scratchpad notepad.
    6. **Reader Mode Synchronization**: Highlights and sticky notes created on a webpage immediately reflect inside Reader Mode for that article, and annotations created in Reader Mode automatically propagate to the underlying webpage.

- [x] **Task 8: Native Default Web Browser Integration (Windows & Linux)**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Fixed the "Set as default browser" functionality across the entire desktop application:
    1. **Windows Capabilities & App Registration**: Implemented `registerWindowsBrowser()` which dynamically generates and applies standard `HKCU` registry entries without requiring administrator elevation:
       - `HKCU\Software\Clients\StartMenuInternet\QBrowse` with full `Capabilities` (`URLAssociations` for `http`/`https` and `FileAssociations` for `.htm`, `.html`, `.shtml`, `.xht`, `.xhtml`, `.svg`, `.webp`).
       - `HKCU\Software\RegisteredApplications` linking `QBrowse` to its capabilities so Windows 10/11 Default Apps recognizes QBrowse as a legitimate web browser.
       - `HKCU\Software\Classes\QBrowseHTML` ProgID defining application metadata, app icon, and execution command lines for both packaged and dev environments.
    2. **Direct Windows Settings Deep-Linking**: When clicking "Set as Default", launches `ms-settings:defaultapps?registeredAppMachine=QBrowse` directly navigating the user to QBrowse's default configuration page in Windows Settings with the top-level "Set default" button.
    3. **Linux XDG Desktop & MIME Registration**: Implemented `ensureLinuxDesktopEntry()` creating a fully-featured `~/.local/share/applications/qbrowse.desktop` file with MimeTypes and application icons, and executing `xdg-settings set default-web-browser qbrowse.desktop` and `xdg-mime default qbrowse.desktop x-scheme-handler/http x-scheme-handler/https text/html application/xhtml+xml`.
    4. **Accurate Default Detection**: Replaced unreliable checks with direct queries of `HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice\ProgId` on Windows and `xdg-settings get default-web-browser` on Linux.
    5. **External URL & File Launching**: Improved `extractUrlFromArgs` to support HTTP/HTTPS, `qbrowse://`, `file://`, and local HTML documents with path normalization. Added cold-start initial URL retrieval in `App.jsx` and window focus auto-refresh in `SettingsModal.jsx` and `DefaultBrowserBanner.jsx`.

- [x] **Task 9: Cinematic Bootup Animation, Setup Journey & Interactive Living Tour**
  - *Status*: ✅ COMPLETED
  - *Outcome*: Delivered a complete first-run and startup experience for QBrowse:
    1. **Minimalist Monogram Fast-Boot Curtain**:
       - Daily startup: snappy ~750ms silent boot sequence with ambient radial glow and outward expansion.
       - First startup post-install: cinematic ~1.8s sequence accompanied by a Web Audio synthesized D Major 9th warm welcome chord (`bootAudio.js`), requiring zero external audio assets.
    2. **Full-Screen 5-Step Setup Journey (`SetupJourney.jsx`)**:
       - Step 1 (Appearance): Live preview and instant switching between Dark/Light themes and 5 curated neon accents.
       - Step 2 (Data Migration): Automatic 1-click detection and import of bookmarks from Chrome, Microsoft Edge, and Brave, alongside Netscape HTML bookmark file import.
       - Step 3 (Privacy Defaults): One-click toggles for HTTPS-Only, native ad blocking, WebRTC IP leakage protection, and Tor Onion Routing.
       - Step 4 (Default Browser): 1-click system default browser integration with Windows 10/11 deep-linking.
       - Step 5 (Profile Selection): Prominent "Continue with Local Profile (No Account Needed)" high-contrast primary path, alongside optional zero-knowledge encrypted Cloud Sync.
    3. **Interactive Living Spotlight Tour (`LivingTour.jsx`)**:
       - Non-blocking floating spotlight cards with live DOM element tracking, targeting Spaces, Tor, QVault, ToolHub, and the Omnibox.
       - 1-click exit and keyboard navigation support (`Esc`, arrows).
    4. **Settings & Discovery Integration**:
       - Added "Experience & Discovery" section in Settings -> About tab allowing users to toggle startup chime sound and relaunch the Setup Journey or Living Tour anytime.
       - Configured NSIS installer settings (`package.json`) for seamless desktop installation.

---

*Last Updated*: 2026-09-30

