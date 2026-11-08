# QBrowse Master Bugfix & Polish TODO

Status Legend: `[ ]` Pending | `[~]` In Progress | `[x]` Completed

1. [x] **Right-click menu copy/paste and image copy**
   - Ensure native/custom context menu Copy, Cut, Paste, and Copy Image work reliably inside webviews and UI inputs.
2. [x] **Remember websites on close or not setting**
   - Add/verify setting to toggle session restoration (reopen previous tabs on startup vs start fresh).
3. [x] **Eco mode transparent bg problem**
   - Fix transparent background issue when Eco Mode / Battery Saver is active.
4. [x] **Top bar F11 mode strange bg**
   - Fix strange background styling on the TopBar when in fullscreen (F11) mode.
5. [x] **Esc shouldn't close F11**
   - Prevent pressing `Escape` from exiting fullscreen (F11) mode.
6. [x] **Too often sync**
   - Throttle/debounce cloud sync triggers so it doesn't fire excessively.
7. [x] **Websites open in wrong windows**
   - Fix target="_blank" / window.open / external link routing so websites open in the active QBrowse tab/window properly.
8. [x] **Ctrl + +/- overrule for websites**
   - Override default behavior so `Ctrl++` / `Ctrl+-` / `Ctrl+0` consistently zoom the active webview rather than breaking or zooming the shell.
9. [x] **Zoom with touchpad & Ctrl+Alt+Scroll/+/-**
   - Pinch-to-zoom on touchpad and `Ctrl+Alt+Scroll` / `Ctrl+Alt++/-` should zoom the website content smoothly, not the entire browser UI shell.
10. [x] **HTML5 tokenizer missing/issue**
    - Investigate and fix the missing HTML5 tokenizer error/issue (e.g., in Reader Mode / Readability / parser).
11. [x] **Clicking outside the URL bar doesn't close it**
    - Fix click-outside detection on the Omnibox / TopBarMiniOmnibox (including when clicking into the webview).
12. [x] **Autofill working mid & passkey activation by websites by default triggers Windows**
    - Improve QVault autofill reliability and intercept WebAuthn / Passkey requests so QVault handles them instead of triggering the default Windows Hello popup unexpectedly.
13. [x] **Forgot password freezes the website**
    - Fix the freeze/lockup when triggering "Forgot Password" or password reset flows.
14. [x] **Presets & Studio bugs**
    - Fix laggy presets, accent color changing on its own in Studio, window curvature breaking the sidebar tab selector, "Apply to Browser" resetting accent color to default, and remove shortcuts from the Studio dashboard preview.
15. [x] **Tor mode switching logic**
    - Fix Tor mode switching lifecycle, proxy binding, and state transitions.
16. [x] **F5 reload**
    - Bind `F5` (and `Ctrl+R`) globally/in-webview to reload the active tab.
17. [x] **Tab suspending timer not working**
    - Fix background tab auto-suspend timer logic so inactive tabs properly suspend according to settings.
18. [x] **Tool Hub notes custom spaces integration**
    - Integrate Tool Hub Notes with Custom Spaces so notes scope/filter properly per custom workspace.
19. [x] **Sidebar on the right changes the order of the nav buttons in a wrong order**
    - Fix navigation button ordering when Sidebar is docked on the right (`flex-row-reverse` vs natural button order like Back/Forward).
20. [x] **Pin app to sidebar has no bg blur**
    - Add proper `backdrop-blur` liquid glass styling to the "Pin App to Sidebar" (`AddPinModal`) modal/popover.
21. [x] **GitHub Glance doesn't disappear, no animation, and wrong bg**
    - Fix `GitHubGlancePopover` click-outside dismissal, open/close transition animation, and liquid glass background.
22. [x] **Tool Hub closing animation**
    - Add smooth closing transition animation to `ToolHub` drawer instead of instant unmount/snap.
23. [x] **Presets & layout settings sync**
    - Include custom presets, active preset, and layout architecture settings in Cloud Sync.
24. [x] **Summarise this web page & website context doesn't work**
    - Fix AI page summarization and website DOM text extraction context pipeline.
25. [x] **When reordering spaces the browser sometimes lags and freezes**
    - Fix performance bottleneck / state loop when reordering workspaces in Sidebar / Settings, and prevent live `<webview>` DOM node detachment via CSS flex `order`.
26. [x] **Llama context size resized incorrectly**
    - Fix llama.cpp context size (`-c` / `n_ctx`) calculation, CustomSelect layout width, and server restart race condition.
27. [x] **Sidebar drag and drop is very laggy & no clear indicator where the tab goes**
    - Optimize sidebar tab drag-and-drop performance via DOM ref ghost positioning and render a clear drop insertion line/indicator (`before` / `after`).
28. [x] **App feels laggy and unstable**
    - Eliminate 1-second full `MainFrame` re-renders, 60–120fps dragover state churn, and unstable selector references across the app.

---

## Phase 2: Refinement, Polish & Advanced Controls

29. [x] **TopBar Live Backdrop Blur**
    - Maintain active backdrop blur throughout the entire top bar slide/peek transition (not only when fully down).
30. [x] **F11 URL Bar Focus & Suggestions Decoupling**
    - In F11/fullscreen mode, keep the top bar locked down while the URL bar is focused so suggestions are never left floating alone without the URL bar.
31. [x] **Remove Unwanted Status Badges / Pills**
    - Clean up clunky inline status badges from the Preset Library and settings screens.
32. [x] **Preset Management (Delete / Edit / Modify) in Library & Settings**
    - Add direct delete and edit actions for custom presets inside both Preset Library (`PresetStudioModal.jsx`) and Appearance settings (`SettingsModal.jsx`).
33. [x] **Preset Studio Pill Switches & Organic Roundness**
    - Transform option selectors in Preset Studio into animated sliding pill switches (like the spaces switcher) and enhance overall dialog curvature.
34. [x] **Remove Inline Tor Switcher Button from Sidebar Header**
    - Remove the extra `[Tor Mode]` button from the Incognito tab header in the sidebar, keeping the clean bottom morphing Ghost/Tor switcher.
35. [x] **Redesign Settings Status Pill**
    - Redesign the clunky `[6 Pages in RAM (Ultra)]` purple status pill in cache/performance settings with flagship liquid glass aesthetics.
36. [x] **Snappy Ctrl+Tab Switch Animation**
    - Replace the sluggish eye-straining fade on the Ctrl+Tab switcher with an ultra-fast, smooth, instant-response preview transition.
37. [x] **Premature Tab Suspending Fix**
    - Eliminate premature tab suspension; enforce strict inactivity thresholds and safeguard active/recent tabs.
38. [x] **Workspace Icon Picker Background Blur**
    - Add proper liquid glass backdrop blur, saturation, and glass borders to the workspace icon changer popover.
39. [x] **Spaces Switcher Drag-to-Reorder Fix**
    - Fix drag-and-drop workspace reordering on the bottom sidebar switcher pills so it works reliably in Electron.
40. [x] **GitHub Live Folder Box / Border Animation**
    - Add smooth container box and border transition animations to `GitHubLiveFolder` matching the inner item animations.
41. [x] **Cross-Device Cloud Tabs Sync Polish**
    - Fix edge cases in remote device tab synchronization so "Tabs from other devices" sync and display reliably in the sync popover and settings.
42. [x] **High-Performance Custom Liquid Glass Tooltips**
    - Replace standard Windows OS `title="..."` tooltips with a lightweight, high-performance liquid-glass custom tooltip engine.

---

## Phase 3: Geometry Alignment, GitHub Switcher & Zoom Architecture

43. [x] **Preset Library Cards Curvature Alignment**
    - Align the border radius of preset cards in `PresetStudioModal.jsx` to `rounded-2xl` matching the internal `Apply` and `Customize` buttons according to QBrowse design language.
44. [x] **GitHub Live Pill Switcher Layout & Counter Overflow Fix**
    - Fix the tab counter badges in `GitHubLiveFolder.jsx` so numbers never overflow or push buttons outside the right border of the sidebar container, with adaptive pill sliding math.
45. [x] **Workspace Icon Picker Flagship Menu Background Match**
    - Update the workspace icon picker dropdown in `SettingsModal.jsx` to use the exact flagship context menu liquid glass background, borders, and shadows.
46. [x] **Separate Ctrl+Wheel (Page Zoom) vs Ctrl+Alt+Wheel (Canvas Zoom)**
    - Disentangle zoom shortcuts so `Ctrl + Scroll` (and touchpad pinch) performs webpage zoom, while `Ctrl + Alt + Scroll` performs browser canvas/UI scale zoom.
47. [x] **Canvas Zoom HUD Isolation (No Zoom Recursion)**
    - Move or counter-scale the zoom value indicator HUD so it never scales or zooms recursively with the canvas.
48. [x] **OAuth Popout Window Zoom & TopBar Chrome Isolation**
    - Restrict zoom shortcuts in popup/OAuth windows to the webview content only (preventing top bar chrome from scaling) with smooth animations and custom zoom indicator.

---

## Phase 4: Polish, UI Spacing & Zoom Unification

49. [x] **Preset Library Cards Margin & Spacing Geometry**
    - Fix Preset Library card footer buttons (`Apply`, `Customize`, `Duplicate`, `Delete`) touching card borders in `PresetStudioModal.jsx`. Add proper container padding/margins (`p-5`, inner padding, gap, and bottom margin) so buttons never touch the card borders.
50. [x] **GitHub Live Pill Switcher Text & Badge Flow**
    - Fix the text truncation (`Revi... 0`) and cramped layout in `GitHubLiveFolder.jsx`. Ensure labels ("Reviews", "PRs", "Issues") and their count numbers fit without truncation, ellipsis, or clipping on all sidebar widths.
51. [x] **Workspace Icon Picker Background & Settings Modal Opacity Root Cause Fix**
    - Resolved exact Chromium compositor and layout root causes:
      - **Settings Solid Opacity**: Kept `#settings-modal` background 100% solid, fully opaque `bg-[#090a0f]` (dark) and `bg-[#f4f5f8]` (light), preventing underlying websites and wallpapers from bleeding through.
      - **In-Tree Liquid Glass Anchoring**: Portaling outside the scrolling container caused Chromium to decouple the popover from the workspace card textures and sample an empty/black composite buffer. Anchored the popover directly in-tree inside the workspace item row (`absolute left-0 top-full/bottom-full mt-2 z-50`) inside the active scrolling DOM context.
      - **Luminous Glass Optics**: Applied `rgba(22, 25, 38, 0.65)` with `backdrop-filter: blur(28px) saturate(190%) contrast(105%) brightness(1.10)`, inner reflection rim, and smooth click-outside layer for instant, glitch-free glass rendering.
52. [x] **Canvas Zoom Duplicate HUD Elimination**
    - Remove the duplicate in-page HUD (`vZoomHudEl` / `#__qbrowse-vzoom-hud`) in `electron/webview_preload.cjs` so that only ONE single, authoritative Canvas Zoom HUD is displayed via `MainFrame.jsx`.
53. [x] **Unify OAuth Popout Zoom UI & System with Normal Window**
    - Unify the Zoom UI / HUD between normal browser windows and the OAuth popup window so they share the exact same flagship design, typography, controls, and smooth animation.

---

## Phase 5: Zoom Engine Refinement & Performance

54. [x] **Chromium Standard Zoom Ladder & Smooth Reflow Fade Transition**
    - Replaced the delayed scale-preview engine with direct `setZoomFactor` on active `<webview>`, unified across a standardized Chromium zoom ladder `[25%, 33%, 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, 200%, 250%, 300%, 400%, 500%]` via `src/utils/zoomSteps.js`.
    - Added subtle 90ms opacity dip (`0.92 -> 1.0` ease-out) to cushion reflow paint passes without raster blur, distortion, or lag.
    - Integrated touchpad pinch and mouse wheel accumulator rate-limiting (max 1 step / 60ms) and automatic zoom re-application on cross-origin `dom-ready`.
55. [x] **Settings Opening Animation & Modal Performance Overhaul**
    - Isolated the 5,500-line SettingsModal behind a lightweight single-boolean selector gate (`SettingsModalContent`), deferred active tab content mounting by 1 frame to eliminate initial hitching, optimized default stock wallpaper thumbnail resolution (640px) with async decoding, lightened ambient backdrop to `backdrop-blur-md`, and refined sheet entrance keyframes to a crisp, snappy 0.26s curve (`scale(0.985) translateY(10px)`).
56. [x] **Website Page Zoom High-Res Spring Animation (180ms Apple Curve)**
    - Implemented immediate frame-0 `wv.setZoomFactor(targetFactor)` reflow coupled with a buttery 180ms high-resolution spring expansion/contraction animation (`cubic-bezier(0.22, 1, 0.36, 1)`). Added synchronous layout flush (`void wv.offsetHeight`) to guarantee initial scale painting, and matrix-interpolated chained zoom tracking for seamless rapid keystrokes without jumping.
57. [x] **Canvas Zoom Vector-Sharp Anti-Pixelation & Mouse Navigation Engine**
    - Replaced GPU-only texture stretching on `document.documentElement` with in-guest CSS `zoom` and 2D translation panning (`electron/webview_preload.cjs`). DirectWrite/FreeType and Skia rasterize font glyphs, SVGs, and vector elements at the native high resolution, eliminating pixelation and blur at 150%, 200%, 300%, and 400% canvas zoom.
    - Added comprehensive mouse navigation for canvas zoom:
      - **Middle-Mouse Drag**: Hold middle mouse wheel button anywhere to pan the magnified canvas 1:1 with dynamic `grabbing` cursor.
      - **Spacebar Hand Tool**: Hold Spacebar to display the `grab` cursor and left-click drag to pan (auto-disabled when typing in text inputs/editable elements).
      - Suppressed auxiliary click and default middle-click autoscroll conflicts.
58. [x] **Touchpad Pinch Canvas Zoom & 120ms Settle-to-Sharp Anti-Pixelation Engine**
    - Reverted Canvas Zoom from CSS `zoom` back to a true visual loupe magnifier (`transform: translate(...) scale(...)`) so that page layout never reflows, media queries never trigger, and words per line remain identical.
    - Implemented the 120ms settle-to-sharp re-rastering engine: keeps `will-change: transform` active during live scaling for 60fps GPU performance, and clears `will-change` with a 2D `translate` 120ms after scale activity ceases so Chromium re-rasters all text, SVG, and images with razor-sharp clarity.
    - Implemented continuous Precision Touchpad pinch gesture detection (`ctrlKey` + fractional/continuous `deltaY` and `!isPhysicalCtrlPressed`) routed directly to instantaneous 1:1 Canvas Zoom at cursor point, while strictly locking standard `Ctrl + Scroll` (without Alt) to normal website Page Zoom.
    - Enabled full-document 2D touchpad panning: when canvas zoomed in, two-finger touchpad scrolling smoothly translates the viewport across the entire document without jitter, edge walls, or conflicting native document scroll.

---

## Phase 6: Native High-Performance Adblocking & Visual Cosmetic Engine

59. [x] **Brave Native Rust Adblock Engine (`adblock-rs`) & Clean Cosmetic Collapser (Option A)**
    - Upgraded QBrowse's adblocking infrastructure from pure-JS Ghostery string loops to Brave Software's native Rust DFA engine (`adblock-rs` v0.13.5) with N-API ABI stability:
      - **Microsecond URL Matching**: Replaced ~250 lines of synchronous JavaScript regex/array iterations per HTTP request with native Rust deterministic finite automaton (DFA) matching (~3.7 microseconds per URL across 200,000+ EasyList/EasyPrivacy rules).
      - **Pre-Compiled Binary Snapshot Serialization**: Engine serializes compiled filter trees directly to binary format (`userData/adblock_cache/engine.bin`), enabling instant `< 1ms` startup and cache hydration without re-parsing text rules.
      - **Dynamic Site-Specific Cosmetic Element Hiding**: Automatically queries `engine.urlCosmeticResources(url)` on navigation to extract exact site-specific `hide_selectors`, `style_selectors`, and scriptlets (e.g. 443 specific selectors for nytimes.com, 100+ for wp.pl/cnn.com), injecting them on `did-start-navigation` to prevent ad flashes and layout shifts before render.
      - **DOM Placeholder & Empty Wrapper Collapser**: Added a dedicated `setupAdPlaceholderCollapser()` in `electron/webview_preload.cjs` with an adaptive `MutationObserver` that collapses empty ad placeholders (`ins.adsbygoogle`, `[data-ad-slot]`, `[data-ad-unit]`, `iframe[id*="google_ads"]`) and collapses residual parent sponsor wrappers and blank grey/white boxes so page layout reflows seamlessly.
      - **Graceful Fallback & Auth Safeguards**: Retains `@ghostery/adblocker-electron` as an automatic pure-JS fallback, while preserving strict whitelist bypasses for Google Accounts, Gmail, OAuth, Cloudflare Turnstile, reCAPTCHA, and media streams.
60. [x] **Setup Journey Step 0 ("Choose your setup") Flagship Redesign**
    - Completely transformed Step 0 of the onboarding flow from cramped, generic AI cards to a flagship experience:
      - **Interactive Miniature Layout Wireframes (`PresetLayoutWireframe`)**: Built responsive, real-time CSS mini browser window previews for each preset showcasing top bar vs bottom bar, left sidebar vs right sidebar, active tab and workspace dots illuminated with the preset's accent color, and specialized canvas previews (e.g. IDE code split view for Developer, privacy badge for Privacy Sentinel).
      - **Spacious & Breathable Architecture**: Expanded Step 0 container to `max-w-4xl` (896px) with a 3x2 grid, removing all truncated ellipses (`...`), redundant gray tag badges (`Top Bar · Left Sidebar`), and color dot labels.
      - **Intentional Human Typography**: Replaced robotic copy with crisp, curated 1-line taglines for each preset.
      - **Refined Appearance Bar & Studio Action**: Replaced all-caps labels with elegant title case (`Theme`, `Accent`), liquid glass segmented sliding pill, and an understated `Custom layout? Preset Studio →` shortcut.
61. [x] **Settings Modal Browsing Presets & Layouts Flagship Wireframe Redesign**
    - Brought the interactive visual miniature layout wireframes into `SettingsModal.jsx` ("Browsing Presets & Layouts") with tailored compact sizing (`h-20`).
    - Added clean preset activation, active badge illumination, understated `Preset Studio →` link, and integrated Duplicate/Edit/Delete actions with un-truncated 1-line taglines.
62. [x] **Cross-Window Tab Drag & Drop and Window Tear-off Engine**
    - Implemented full HTML5 OS-level drag-and-drop across separate QBrowse windows:
      - **Cross-Window DataTransfer Protocol**: Drag payload encodes `application/qbrowse-tab` with `{ tab, spaceType, sourceWindowId }`, complete with native OS floating drag chip.
      - **Drop Reception & Automatic Hand-off**: Target window inserts incoming tab at exact drop target (tab position, folder, or root), activates it, and notifies source window via IPC `tab-transferred`.
      - **Source Window Cleanup**: Source window removes the transferred tab via `removeTabById(tabId)` and smoothly activates the nearest neighbor.
      - **Global Drag Shield & Webview Transparency**: Added `body.is-dragging-global webview { pointer-events: none !important; }` so hovering over `<webview>` never swallows drop events.
      - **Tab Tear-off to New Window**: Dropping a tab outside any window boundary automatically invokes `openNewWindowWithTab` near cursor coordinates and detaches it from the current window.
