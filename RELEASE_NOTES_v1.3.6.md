# 🚀 QBrowse v1.3.6 Release Notes

> **Release Version**: `v1.3.6`  
> **Release Date**: October 25, 2026  
> **Repository**: [https://github.com/Qu-Bi/QBrowse](https://github.com/Qu-Bi/QBrowse)

---

## 🌟 Highlights

QBrowse **v1.3.6** brings a comprehensive UI overhaul focused on visual refinement, high-contrast readability across bright websites, fluid tactile animations, and a brand-new draggable floating HUD for the Read Aloud TTS player.

---

## 🎧 Draggable Floating Read Aloud Island HUD

- **Top-Center Default Placement**: Read Aloud now spawns centered at the top of the viewport (`top: 20px`), keeping your reading content unobstructed and preventing clashes with window controls or Find in page.
- **Full Drag & Drop Freedom**: Equipped with a tactile `GripVertical` handle and freeform dragging. Grab any non-interactive part of the player or the grip handle to relocate the player anywhere on your screen.
- **Webview Pointer Trap & Boundaries**: Added a transparent drag overlay during movement to prevent underlying webviews from intercepting mouse focus, with viewport boundary clamping so the player cannot be lost off-screen.
- **Adaptive Speed Dropdown**: The narration playback speed dropdown dynamically detects its proximity to screen edges and flips upward (`bottom-full mb-2`) when positioned near the bottom of the container.
- **Liquid Glass Aesthetic**: Replaced harsh obsidian backgrounds with translucent smoky glass (`rgba(24, 26, 36, 0.80)` with 28px backdrop blur, subtle `border-white/[0.08]`, and KaTeX/font-mono counter typography).

---

## 🪟 Split Screen View Polish & Alignment

- **Restored Sleek Search Pill**: Restored the original, clean search input design with `liquid-pill-dark` / `liquid-pill-bright` and a compact rounded accent search button.
- **Mathematical Pixel-Level Alignment**: Decoupled the Available Tabs list from the centering flexbox flow, ensuring the right split search input mathematically aligns with the Zen Dashboard search bar on the left pane at the exact same Y pixel coordinate.
- **Smoky Glass Autocomplete**: Restyled the live suggestion dropdown to translucent slate glass matching the right-click menu, eliminating solid black boxes.

---

## 🔐 QVault Readability & High-Contrast Overhaul

- **Bright Page Contrast Fix**: Increased QVault's base glass density to `92%` (`bg-[#141520]/92`) with deep drop shadows (`shadow-[0_25px_80px_rgba(0,0,0,0.7)]`), preventing bright white websites (such as Canva or Google Docs) from diffusing white light through the glass.
- **High-Contrast Typography**: Eliminated low-contrast zinc grays in favor of crisp `text-white`, `text-white/80`, and `text-white/60 font-mono` across all views (Unlock, Settings, Add/Edit Item, and Vault Items list).
- **Elevated Inputs & Controls**: Form fields now feature high-contrast `bg-white/[0.07] border-white/[0.12]` with bright text and accent focus rings.
- **Solid Primary Action Buttons**: Replaced transparent washed-out buttons with punchy `bg-accent text-zinc-950 font-bold border border-accent/40 shadow-xs` for Unlock, Save PIN, Import, and Autofill actions.

---

## 🧅 Tor Popover & UI Harmonization

- **Tor Circuit Redesign**: Upgraded the Tor circuit popover to match QVault and the right-click menu with high-contrast circuit node badges, active status indicators, and rounded pill switchers.
- **Unified Liquid Glass Surface**: Unified `FindInPageBar` and `ScreenshotBar` under the same 28px backdrop-blur liquid glass styling with subtle 1px hairlines.
- **Spaces Switcher Animation**: Propagated smooth sliding pill indicator animations across all tab switchers, category filters, and task managers.
- **Closing Last Tab**: Closing the last remaining tab via the tab close button now triggers the clean, consistent app close loop matching `Ctrl+W`.

---

## 📦 Commits & Files Changed

- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/webview_preload.cjs`
- `package.json` (bumped to `1.3.6`)
- `src/App.jsx`
- `src/components/common/ContextMenuProvider.jsx`
- `src/components/common/FindInPageBar.jsx`
- `src/components/common/ReadAloudPlayer.jsx`
- `src/components/common/ScreenshotBar.jsx`
- `src/components/common/TabSwitcherOverlay.jsx`
- `src/components/features/Omnibox.jsx`
- `src/components/features/ReaderModeOverlay.jsx`
- `src/components/features/TabMap.jsx`
- `src/components/layout/MainFrame.jsx`
- `src/components/popovers/QVaultPopover.jsx`
- `src/components/popovers/TorCircuitPopover.jsx`
