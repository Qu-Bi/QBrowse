// Canonical Keyboard Shortcuts Registry & Pure Helpers

export const SHORTCUT_CATEGORIES = ['Tabs', 'Navigation', 'View', 'Tools', 'Window'];

export const SHORTCUT_ACTIONS = [
    // Tabs
    { id: 'newTab', label: 'New Tab', category: 'Tabs', defaultCombo: 'mod+t' },
    { id: 'closeTab', label: 'Close Tab', category: 'Tabs', defaultCombo: 'mod+w' },
    { id: 'reopenClosedTab', label: 'Reopen Closed Tab', category: 'Tabs', defaultCombo: 'mod+shift+t' },
    { id: 'toggleMuteTab', label: 'Mute / Unmute Tab', category: 'Tabs', defaultCombo: 'mod+m' },
    { id: 'openTabMap', label: 'Tab Map (Mission Control)', category: 'Tabs', defaultCombo: 'mod+e' },
    { id: 'pinOrBookmarkTab', label: 'Pin / Bookmark Tab', category: 'Tabs', defaultCombo: 'mod+d' },

    // Navigation
    { id: 'openOmnibox', label: 'Open Command Omnibox', category: 'Navigation', defaultCombo: 'mod+k' },
    { id: 'focusAddressBar', label: 'Focus Address Bar', category: 'Navigation', defaultCombo: 'mod+l' },
    { id: 'copyCurrentUrl', label: 'Copy Current URL', category: 'Navigation', defaultCombo: 'mod+shift+c' },
    { id: 'reloadTab', label: 'Reload Page', category: 'Navigation', defaultCombo: 'mod+r' },
    { id: 'hardReloadTab', label: 'Hard Reload (Purge Cache)', category: 'Navigation', defaultCombo: 'mod+shift+r' },
    { id: 'navigateBack', label: 'Back in History', category: 'Navigation', defaultCombo: 'mod+[' },
    { id: 'navigateForward', label: 'Forward in History', category: 'Navigation', defaultCombo: 'mod+]' },
    { id: 'openHistory', label: 'History Archive', category: 'Navigation', defaultCombo: 'mod+h' },
    { id: 'openFile', label: 'Open Local File', category: 'Navigation', defaultCombo: 'mod+o' },

    // View
    { id: 'toggleSidebar', label: 'Toggle Sidebar', category: 'View', defaultCombo: 'mod+b' },
    { id: 'toggleRightPanel', label: 'Toggle Tool Hub / Right Panel', category: 'View', defaultCombo: 'mod+j' },
    { id: 'toggleFramelessMode', label: 'Toggle Frameless / Zen Mode', category: 'View', defaultCombo: 'mod+alt+f' },
    { id: 'toggleSplitView', label: 'Toggle Split View', category: 'View', defaultCombo: 'mod+\\' },
    { id: 'toggleSplitOrientation', label: 'Cycle Split View Layout (2-Col / 2-Row / 2×2)', category: 'View', defaultCombo: 'mod+shift+\\' },
    { id: 'swapSplitPanes', label: 'Swap Split Panes', category: 'View', defaultCombo: 'mod+alt+\\' },
    { id: 'toggleReaderMode', label: 'Toggle Reader Mode', category: 'View', defaultCombo: 'mod+alt+r' },
    { id: 'zoomIn', label: 'Zoom In', category: 'View', defaultCombo: 'mod++' },
    { id: 'zoomOut', label: 'Zoom Out', category: 'View', defaultCombo: 'mod+-' },
    { id: 'resetZoom', label: 'Reset Zoom', category: 'View', defaultCombo: 'mod+0' },
    { id: 'toggleFullscreen', label: 'Toggle Fullscreen', category: 'View', defaultCombo: 'f11' },

    // Tools
    { id: 'findInPage', label: 'Find in Page', category: 'Tools', defaultCombo: 'mod+f' },
    { id: 'findNext', label: 'Find Next Match', category: 'Tools', defaultCombo: 'f3' },
    { id: 'findPrev', label: 'Find Previous Match', category: 'Tools', defaultCombo: 'shift+f3' },
    { id: 'toggleElementEraser', label: 'Element Eraser', category: 'Tools', defaultCombo: 'mod+shift+x' },
    { id: 'toggleScreenshotBar', label: 'Screenshot & Snipping Bar', category: 'Tools', defaultCombo: 'mod+shift+s' },
    { id: 'toggleReadAloud', label: 'Read Aloud Assistant', category: 'Tools', defaultCombo: 'alt+r' },
    { id: 'printPage', label: 'Print Page', category: 'Tools', defaultCombo: 'mod+p' },
    { id: 'openDevTools', label: 'Developer Tools', category: 'Tools', defaultCombo: 'f12' },
    { id: 'toggleCaretBrowsing', label: 'Toggle Caret Browsing', category: 'Tools', defaultCombo: 'f7' },

    // Window
    { id: 'newWindow', label: 'New Window', category: 'Window', defaultCombo: 'mod+n' },
    { id: 'newPrivateWindow', label: 'New Private / Tor Window', category: 'Window', defaultCombo: 'mod+shift+n' },
    { id: 'closeWindow', label: 'Close Window', category: 'Window', defaultCombo: 'mod+shift+w' },
    { id: 'openSettings', label: 'Open Settings', category: 'Window', defaultCombo: 'mod+,' },
    { id: 'openHelp', label: 'Help Center & Shortcuts', category: 'Window', defaultCombo: 'f1' },
    { id: 'openTaskManager', label: 'Task Manager', category: 'Window', defaultCombo: 'shift+escape' },
];

export const SHORTCUT_ACTION_MAP = Object.fromEntries(
    SHORTCUT_ACTIONS.map((a) => [a.id, a])
);

const MODIFIER_KEYS = new Set([
    'control', 'ctrl', 'meta', 'command', 'cmd', 'os',
    'alt', 'option', 'altgraph', 'shift'
]);

const MODIFIER_ORDER = ['mod', 'ctrl', 'alt', 'shift'];

export function isMacPlatform() {
    if (typeof navigator !== 'undefined' && typeof navigator.platform === 'string') {
        return /mac|iphone|ipad|ipod/i.test(navigator.platform);
    }
    if (typeof process !== 'undefined' && process.platform) {
        return process.platform === 'darwin';
    }
    return false;
}

export function normalizeKeyName(key, code = '') {
    const rawKey = typeof key === 'string' ? key : '';
    const lower = rawKey.toLowerCase();
    const codeStr = typeof code === 'string' ? code : '';

    if (!lower || MODIFIER_KEYS.has(lower)) {
        return null;
    }

    if (lower === ' ' || lower === 'spacebar' || codeStr === 'Space') return 'space';
    if (lower === 'esc' || lower === 'escape') return 'escape';
    if (lower === '+' || lower === '=' || lower === 'add' || codeStr === 'Equal' || codeStr === 'NumpadAdd') return '+';
    if (lower === '-' || lower === '_' || lower === 'subtract' || codeStr === 'Minus' || codeStr === 'NumpadSubtract') return '-';
    if (lower === '0' || codeStr === 'Digit0' || codeStr === 'Numpad0') return '0';
    if (lower === '|' || codeStr === 'Backslash') return '\\';
    if (codeStr === 'BracketLeft') return '[';
    if (codeStr === 'BracketRight') return ']';
    if (codeStr === 'Comma') return ',';

    return lower;
}

function splitComboTokens(combo) {
    if (!combo || typeof combo !== 'string') return [];
    const trimmed = combo.trim();
    if (!trimmed) return [];

    // Handle trailing '+' key (e.g. 'mod++' or '+')
    const tokens = [];
    let current = '';
    for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (ch === '+') {
            if (current.length > 0) {
                tokens.push(current);
                current = '';
            } else if (i === trimmed.length - 1 || trimmed[i + 1] === '+') {
                tokens.push('+');
            }
        } else {
            current += ch;
        }
    }
    if (current.length > 0) {
        tokens.push(current);
    }
    return tokens;
}

export function normalizeCombo(combo) {
    const tokens = splitComboTokens(combo);
    if (tokens.length === 0) return '';

    const mods = new Set();
    let mainKey = null;

    for (const rawToken of tokens) {
        const token = rawToken.trim().toLowerCase();
        if (!token) continue;

        if (token === 'mod' || token === 'cmdorctrl' || token === 'commandorcontrol' || token === 'cmd' || token === 'command' || token === 'meta') {
            mods.add('mod');
        } else if (token === 'ctrl' || token === 'control') {
            mods.add('ctrl');
        } else if (token === 'alt' || token === 'option') {
            mods.add('alt');
        } else if (token === 'shift') {
            mods.add('shift');
        } else {
            mainKey = normalizeKeyName(token);
        }
    }

    if (!mainKey) return '';

    const orderedMods = MODIFIER_ORDER.filter((m) => mods.has(m));
    return [...orderedMods, mainKey].join('+');
}

export function eventToCombo(e, isMac = isMacPlatform()) {
    if (!e) return null;
    let mainKey = normalizeKeyName(e.key, e.code);
    if (!mainKey) return null;
    // Fallback to physical key when Alt/AltGr produces a composed non-ASCII character (e.g., Polish AltGr+S -> ś)
    if (e.altKey && mainKey.charCodeAt(0) > 127 && typeof e.code === 'string') {
        if (/^Key[A-Z]$/.test(e.code)) {
            mainKey = e.code.slice(3).toLowerCase();
        } else if (/^Digit[0-9]$/.test(e.code)) {
            mainKey = e.code.slice(5);
        }
    }

    const mods = new Set();
    if (isMac) {
        if (e.metaKey) mods.add('mod');
        if (e.ctrlKey) mods.add('ctrl');
    } else {
        if (e.ctrlKey || e.metaKey) mods.add('mod');
    }
    if (e.altKey) mods.add('alt');
    if (e.shiftKey) mods.add('shift');

    const orderedMods = MODIFIER_ORDER.filter((m) => mods.has(m));
    return [...orderedMods, mainKey].join('+');
}

const DISPLAY_KEY_LABELS = {
    arrowleft: '←',
    arrowright: '→',
    arrowup: '↑',
    arrowdown: '↓',
    escape: 'Esc',
    space: 'Space',
    backspace: 'Backspace',
    delete: 'Del',
    tab: 'Tab',
    enter: 'Enter',
    '\\': '\\',
    ',': ',',
    '[': '[',
    ']': ']',
    '+': '+',
    '-': '-',
};

export function formatComboForDisplay(combo, isMac = isMacPlatform()) {
    const normalized = normalizeCombo(combo);
    if (!normalized) return '';

    const tokens = splitComboTokens(normalized);
    const formatted = tokens.map((token) => {
        if (token === 'mod') return isMac ? '⌘' : 'Ctrl';
        if (token === 'ctrl') return isMac ? '⌃' : 'Ctrl';
        if (token === 'alt') return isMac ? '⌥' : 'Alt';
        if (token === 'shift') return isMac ? '⇧' : 'Shift';
        if (DISPLAY_KEY_LABELS[token]) return DISPLAY_KEY_LABELS[token];
        if (/^f\d{1,2}$/.test(token)) return token.toUpperCase();
        if (token.length === 1) return token.toUpperCase();
        return token.charAt(0).toUpperCase() + token.slice(1);
    });

    return formatted.join(' + ');
}

export function getEffectiveCombo(actionId, customShortcuts = {}) {
    const action = SHORTCUT_ACTION_MAP[actionId];
    if (!action) return '';
    const override = customShortcuts && typeof customShortcuts[actionId] === 'string'
        ? normalizeCombo(customShortcuts[actionId])
        : '';
    return override || normalizeCombo(action.defaultCombo);
}

export function resolveActionForEvent(e, customShortcuts = {}, isMac = isMacPlatform()) {
    const combo = eventToCombo(e, isMac);
    if (!combo) return null;

    for (const action of SHORTCUT_ACTIONS) {
        const effective = getEffectiveCombo(action.id, customShortcuts);
        if (effective && effective === combo) {
            return action.id;
        }
    }
    return null;
}

export function findShortcutConflict(combo, targetActionId, customShortcuts = {}) {
    const normalized = normalizeCombo(combo);
    if (!normalized) return null;

    for (const action of SHORTCUT_ACTIONS) {
        if (action.id === targetActionId) continue;
        const effective = getEffectiveCombo(action.id, customShortcuts);
        if (effective && effective === normalized) {
            return { id: action.id, label: action.label };
        }
    }
    return null;
}
