/**
 * Deduplicates hardware mouse back/forward navigation events (Mouse 4 / Mouse 5).
 * On Windows, a single Mouse 4/5 click fires both Chromium/Electron `app-command`
 * (`global-navigate-back`/`forward`) and DOM `mouseup` (`button === 3`/`4`).
 * Do NOT use this for toolbar button clicks or Alt+Left/Alt+Right keyboard shortcuts.
 */
let fallbackLastHwNav = { dir: null, at: 0 };

export function consumeHardwareNavEvent(direction, windowMs = 160) {
    if (direction !== 'back' && direction !== 'forward') return false;
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const state = typeof window !== 'undefined'
        ? (window.__qbrowseLastHwNav || (window.__qbrowseLastHwNav = { dir: null, at: 0 }))
        : fallbackLastHwNav;

    if (state.dir === direction && (now - state.at) < windowMs) {
        return false;
    }

    state.dir = direction;
    state.at = now;
    return true;
}
