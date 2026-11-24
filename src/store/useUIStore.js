import { create } from 'zustand';
import { parseArticle } from '../utils/readerExtractor.js';
import { playDownloadCompleteChime } from '../utils/bootAudio.js';
import { 
    EXPERIENCE_PRESETS, 
    loadCustomPresets, 
    saveCustomPresetsToStorage, 
    getSavedPresetId, 
    setSavedPresetId 
} from '../utils/experiencePresets.js';
import { getNextZoomStep, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from '../utils/zoomSteps.js';
import { applyAppFont } from '../utils/appFontManager.js';
import { applyTextHighlightToDocument } from '../utils/textHighlight.js';
import {
    pruneTabsFromParkedGroups,
    upsertParkedSplitGroup
} from '../utils/splitGroupHelpers.js';
import {
    DEFAULT_DARK_EXCLUSIONS,
    normalizeWhitelist,
    addWhitelistEntry,
    removeWhitelistEntry,
    toggleWhitelistForUrl,
    getDefaultDarkExclusions
} from '../utils/darkModeWhitelist.js';
import {
    EMPTY_MEDIA_STATE,
    resolveMediaStateUpdate,
    resolveMediaStateClearForTab,
    resolveMediaCommandTargetTabId
} from '../utils/mediaStateHelpers.js';
import {
    SPLIT_ORIENTATIONS,
    isBlankSplitTab,
    getNextSplitOrientation
} from '../utils/splitLayoutHelpers.js';

const tr = (path, paramsOrFallback, fallback) => {
    if (typeof window !== 'undefined' && typeof window.__qbrowseT === 'function') {
        return window.__qbrowseT(path, paramsOrFallback, fallback);
    }
    const fb = typeof paramsOrFallback === 'string' ? paramsOrFallback : fallback;
    return fb || path;
};

let unsubscribePerformanceProfile = null;

export const shouldOptimizeEcoVisuals = (tier, reduceVisualsOnEco) =>
    tier === 'eco' && reduceVisualsOnEco !== false;

const applyPerformanceDom = (tier, reduceVisualsOnEco, wallpaperBlur) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const resolvedTier = tier || 'balanced';
    const optimizeVisuals = shouldOptimizeEcoVisuals(resolvedTier, reduceVisualsOnEco);
    root.dataset.performanceTier = resolvedTier;
    root.dataset.ecoVisuals = optimizeVisuals ? 'true' : 'false';

    if (optimizeVisuals) {
        root.classList.add('eco-mode');
        root.classList.remove('ultra-mode');
        root.style.setProperty('--glass-blur', '0px');
        root.style.setProperty('--animation-speed', '0.12s');
    } else if (resolvedTier === 'ultra') {
        root.classList.remove('eco-mode');
        root.classList.add('ultra-mode');
        root.style.setProperty('--glass-blur', `${wallpaperBlur ?? 24}px`);
        root.style.setProperty('--animation-speed', '0.32s');
    } else {
        // balanced, or eco with visual optimization turned off
        root.classList.remove('eco-mode');
        root.classList.remove('ultra-mode');
        root.style.setProperty('--glass-blur', `${wallpaperBlur ?? 24}px`);
        root.style.setProperty('--animation-speed', '0.24s');
    }
};

export const hexToRgbString = (hex) => {
    if (!hex || typeof hex !== 'string') return '212, 188, 148';
    const clean = hex.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(clean)) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return `${r}, ${g}, ${b}`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(clean)) {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    }
    return '212, 188, 148';
};

export const syncRootAccentCssVariables = (accentHex, theme = 'dark') => {
    if (typeof document === 'undefined') return;
    try {
        const root = document.documentElement;
        const activeSpace = (typeof window !== 'undefined' && window.__tabStore?.getState?.()?.activeSpace) || 'personal';
        const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
        let finalAccent = accentHex || '#d4bc94';
        if (activeSpace === 'ghost') {
            finalAccent = '#a855f7';
        } else if (activeSpace === 'tor') {
            finalAccent = '#c084fc';
        } else if (isBright && finalAccent.toLowerCase() === '#d4bc94') {
            finalAccent = '#c08434';
        }
        const rgb = hexToRgbString(finalAccent);
        root.style.setProperty('--accent', `rgb(${rgb})`);
        root.style.setProperty('--accent-rgb', rgb);
        root.style.setProperty('--accent-10', `rgba(${rgb}, 0.1)`);
        root.style.setProperty('--accent-15', `rgba(${rgb}, 0.15)`);
        root.style.setProperty('--accent-20', `rgba(${rgb}, 0.2)`);
        root.style.setProperty('--accent-30', `rgba(${rgb}, 0.3)`);
        root.style.setProperty('--accent-40', `rgba(${rgb}, 0.4)`);
    } catch (_) {}
};

let globalToastTimeout = null;
let globalZoomTimeout = null;
let globalCanvasZoomTimeout = null;
let globalModalCloseTimeout = null;

const loadInitialDownloads = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem('qbrowse_downloads');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map(d => (
                        d && (d.state === 'progressing' || d.state === 'paused')
                            ? { ...d, state: 'interrupted', speedBytesPerSec: 0 }
                            : d
                    ));
                }
            }
        }
    } catch (_) {}
    return [];
};

const saveDownloadsToStorage = (downloads) => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('qbrowse_downloads', JSON.stringify((downloads || []).slice(0, 50)));
        }
    } catch (_) {}
};

const loadCustomShortcuts = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem('qbrowse_custom_shortcuts');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
        }
    } catch (_) {}
    return {};
};

const saveCustomShortcutsToStorage = (shortcuts) => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('qbrowse_custom_shortcuts', JSON.stringify(shortcuts || {}));
        }
    } catch (_) {}
};

const defaultSettings = {
    sidebarPosition: 'left', // 'left' | 'right'
    topBarPosition: 'top',    // 'top' | 'bottom'
    toolHubPosition: 'right', // 'right' | 'left'
    glassBlur: 'balanced', // 'subtle' | 'balanced' | 'frosted' | 'off'
    omniboxStyle: 'capsule', // 'capsule' | 'wide' | 'minimal'
    frameCurvature: 'default', // 'default' | 'cohesive' | 'square'
    tabPresentation: 'pills', // 'pills' | 'compact' | 'cards'
    windowControlsStyle: 'mac', // 'mac' | 'windows' | 'minimal'
    windowControlsOrder: 'auto', // 'auto' | 'close-first' | 'minimize-first'
    httpsOnly: true,
    isolation: false,
    webrtc: true,
    dnt: true,
    block3rdParty: false,
    clearOnExit: false,
    hardware: true,
    memory: true,
    suspendTimeout: '30m',
    smooth: true,
    battery: false,
    blockPopups: true,
    blockAutoplay: false,
    cosmetic: true,
    social: true,
    adblockLevel: 'standard',
    adblockAnnoyances: true,
    adblockTelemetry: true,
    adblockMalware: true,
    adblockYoutubeAds: true,
    adblockFilterLists: { easylist: true, easyprivacy: true, annoyances: true, malware: true, peterlowe: true },
    adblockAllowlist: [],
    adblockCustomBlockedDomains: [],
    adblockCnameUncloaking: false,
    searchEngine: 'google',
    customSearchEngines: [],
    smartCalc: true,
    liveSearch: true,
    showFullUrls: false,
    searchInNewTab: false,
    askSave: false,
    groupDownloads: true,
    downloadSound: true,
    uiScale: 'comfortable',
    faviconGlow: true,
    doh: 'cloudflare',
    dohMode: 'automatic',
    customDohUrl: '',
    customBangs: [],
    readerTheme: 'dark',
    readerFont: 'serif',
    readerFontSize: 18,
    readerWidth: 'balanced',
    customWallpaper: null,
    customWallpaperSource: 'default',
    customWallpaperOriginalUrl: null,
    wallpaperDimming: 25,
    wallpaperBlur: 24,
    blurWallpaper: false,
    pauseWallpaperInBackground: true,
    pauseWallpaperInEcoMode: true,
    pauseWallpaperOnWebview: false,
    wallpaperVideoLoopMode: 'crossfade', // 'crossfade' (Smooth Dissolve) | 'dip' (Ambient Dip) | 'cut' (Instant Restart)
    wallpaperVideoCrossfadeDuration: 1.2, // seconds (0.4 - 2.5)
    closeWindowOnLastTab: true,
    restoreTabsOnStartup: true,
    visualTabSwitcher: true, // Show Windows-style visual card switcher overlay on Ctrl+Tab
    tabSwitcherOrder: 'mru', // 'mru' (Recently Used) | 'sidebar' (Sidebar Order)
    playStartupSound: false,

    // Accessibility (EU European Accessibility Act / EN 301 549 & WCAG 2.1 AA)
    a11yHighContrast: false,
    a11yDyslexiaFont: false,
    a11yMinFontSize: 'default', // 'default' | '12px' | '14px' | '16px' | '18px'
    a11yPageZoom: 100, // 50 - 200%
    a11yReducedMotion: false,
    a11ySuppressAutoplay: false,
    a11yCaretBrowsing: false,
    a11yFocusRings: false,
    a11yVideoCaptions: false,
    a11yMonoAudio: false,

    // Toolbar & Extensions Hub
    hiddenTopBarIcons: [],

    // GitHub Work Mode Integration (Zero-Resource footprint by default)
    githubIntegrationEnabled: false,
    githubAuthMode: 'auto', // 'auto' | 'token'
    githubPersonalAccessToken: '',
    githubUsername: '',
    githubSyncInterval: 10, // minutes (0 = manual only)
    githubShowReviews: true,
    githubShowMyPrs: true,
    githubShowAssignedIssues: true,
    githubIncludeDrafts: false,
    githubHoverGlanceEnabled: true,
    githubRepoFilter: '',
    githubBadgeCountEnabled: true,

    customSpaces: [
        { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
        { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false },
    ],

    // App Typography & Custom Font System
    appFontType: 'default', // 'default' | 'preset' | 'google' | 'system' | 'file'
    appFontFamily: 'default', // preset id or CSS family
    appFontGoogleFamily: '', // Google font name
    appFontCustomName: '', // Local system font name
    appFontLetterSpacing: 'normal', // 'tight' | 'normal' | 'relaxed' | 'wide'
    appFontSizeScale: 100, // 85 - 120 %
    appFontWeightShift: 'normal', // 'normal' | 'medium' | 'semibold'
    appFontFileData: null, // Base64 data URL for uploaded font
    appFontFileName: '', // Original uploaded font file name

    // Internationalization & Language
    appLanguage: 'auto', // 'auto' | 'en' | 'pl' | 'fr' | 'de' | 'es' | 'pt' | 'zh' | 'ja' | 'ru' | 'it' | 'uk' | 'ko'

    // Passkey & Hardware Security Key Routing
    passkeyProviderMode: 'qvault', // 'qvault' (QVault with hardware fallback) | 'hardware' (Always use Hardware / System Key)
    passkeyHardwareFallback: true, // Automatically fall back to Hardware/OS authenticator when QVault has no matching passkey or is unavailable

    // Network Privacy & Background Services Kill Switch
    strictOfflineMode: false,
    bgAllowAutoUpdates: true,
    bgAllowFilterUpdates: true,
    bgAllowLiveSuggestions: true,
    bgAllowRemoteFavicons: true,
    bgAllowCloudSync: true,
};

const loadSettings = () => {
    try {
        const stored = localStorage.getItem('qbrowse_settings');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.wallpaperDimming === 40 || parsed.wallpaperDimming === 30 || parsed.wallpaperDimming === undefined) {
                parsed.wallpaperDimming = 25;
            }
            if (parsed.wallpaperBlur === undefined) {
                parsed.wallpaperBlur = 24;
            }
            if (parsed.blurWallpaper === undefined) {
                parsed.blurWallpaper = false;
            }
            if (typeof parsed.pauseWallpaperOnWebview !== 'boolean') {
                parsed.pauseWallpaperOnWebview = false;
            }
            if (!parsed.wallpaperVideoLoopMode) {
                parsed.wallpaperVideoLoopMode = 'crossfade';
            }
            if (parsed.wallpaperVideoCrossfadeDuration === undefined) {
                parsed.wallpaperVideoCrossfadeDuration = 1.2;
            }
            if (!parsed.sidebarPosition) {
                parsed.sidebarPosition = 'left';
            }
            if (!parsed.topBarPosition) {
                parsed.topBarPosition = 'top';
            }
            if (!parsed.toolHubPosition) {
                parsed.toolHubPosition = 'right';
            }
            if (!parsed.glassBlur) {
                parsed.glassBlur = 'balanced';
            }
            if (!parsed.omniboxStyle) {
                parsed.omniboxStyle = 'capsule';
            }
            if (!parsed.frameCurvature) {
                parsed.frameCurvature = 'default';
            }
            if (!parsed.tabPresentation) {
                parsed.tabPresentation = 'pills';
            }
            if (!parsed.windowControlsStyle) {
                parsed.windowControlsStyle = 'mac';
            }
            if (!parsed.windowControlsOrder) {
                parsed.windowControlsOrder = 'auto';
            }
            if (!Array.isArray(parsed.customSpaces) || parsed.customSpaces.length === 0) {
                parsed.customSpaces = defaultSettings.customSpaces;
            }
            if (!parsed.appFontType) parsed.appFontType = 'default';
            if (!parsed.appFontFamily) parsed.appFontFamily = 'default';
            if (!parsed.appFontLetterSpacing) parsed.appFontLetterSpacing = 'normal';
            if (typeof parsed.appFontSizeScale !== 'number') parsed.appFontSizeScale = 100;
            if (!parsed.appFontWeightShift) parsed.appFontWeightShift = 'normal';
            if (!parsed.appLanguage) parsed.appLanguage = 'auto';
            if (parsed.passkeyProviderMode !== 'hardware' && parsed.passkeyProviderMode !== 'qvault') {
                parsed.passkeyProviderMode = 'qvault';
            }
            if (typeof parsed.passkeyHardwareFallback !== 'boolean') {
                parsed.passkeyHardwareFallback = true;
            }
            const merged = { ...defaultSettings, ...parsed };
            try {
                applyAppFont(merged);
            } catch (_) {}
            return merged;
        }
    } catch(e) {}
    return defaultSettings;
};

const useUIStore = create((set, get) => ({
  // Custom Keyboard Shortcuts
  customShortcuts: loadCustomShortcuts(),
  setCustomShortcut: (actionId, combo) => {
    if (!actionId || typeof actionId !== 'string') return;
    set((state) => {
      const next = { ...(state.customShortcuts || {}) };
      if (!combo || typeof combo !== 'string' || !combo.trim()) {
        delete next[actionId];
      } else {
        next[actionId] = combo.trim().toLowerCase();
      }
      saveCustomShortcutsToStorage(next);
      return { customShortcuts: next };
    });
  },
  resetCustomShortcut: (actionId) => {
    if (!actionId) return;
    set((state) => {
      const next = { ...(state.customShortcuts || {}) };
      delete next[actionId];
      saveCustomShortcutsToStorage(next);
      return { customShortcuts: next };
    });
  },
  resetAllCustomShortcuts: () => {
    saveCustomShortcutsToStorage({});
    set({ customShortcuts: {} });
  },

  // Omnibox
  isOmniboxOpen: false,
  isOmniboxClosing: false,
  isTopBarOmniboxActive: false,
  setIsTopBarOmniboxActive: (val) => set({ isTopBarOmniboxActive: Boolean(val) }),
  activateTopBarOmnibox: () => set({ isTopBarOmniboxActive: true }),
  deactivateTopBarOmnibox: () => set({ isTopBarOmniboxActive: false }),
  searchQuery: '',
  historySearchQuery: '',
  activeBang: null,
  setActiveBang: (bang) => set({ activeBang: bang }),
  clearActiveBang: () => set({ activeBang: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHistorySearchQuery: (query) => set({ historySearchQuery: query }),
  openOmnibox: (url = '') => set({ isOmniboxOpen: true, isOmniboxClosing: false, isTopBarOmniboxActive: false, activeBang: null, searchQuery: (!url || url === 'about:blank') ? '' : url }),
  closeOmnibox: () => {
    set({ isOmniboxClosing: true });
    setTimeout(() => {
      set({ isOmniboxOpen: false, isOmniboxClosing: false, activeBang: null, searchQuery: '' });
    }, 200);
  },

  // View States
  isSplitView: false,
  splitRightTabId: null,
  splitPaneTabIds: [null, null, null], // Secondary slots 1, 2, 3 (slot 1 mirrors splitRightTabId)
  focusedPane: 'left', // 'left' | 'right' | 'pane-2' | 'pane-3'
  splitRatio: 50, // Horizontal split % (20..80)
  splitRatioY: 50, // Vertical / Quad-Y split % (20..80)
  isDraggingSplit: false,
  isSplitAxisAnimating: false,
  isSplitClosing: false,
  splitTransitionMode: 'animate', // 'animate' | 'instant'
  activeSplitGroupId: null,
  activeSplitGroupName: '',
  parkedSplitGroups: [], // Array<{ id, space, name, primaryTabId, paneTabIds, orientation, splitRatio, splitRatioY }>
  splitOrientation: (() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage?.getItem('qbrowse_split_orientation') : null;
      return SPLIT_ORIENTATIONS.includes(saved) ? saved : 'horizontal';
    } catch (_) {
      return 'horizontal';
    }
  })(),
  setIsSplitView: (val) => set({ isSplitView: val }),
  setIsDraggingSplit: (val) => set({ isDraggingSplit: Boolean(val) }),
  setIsSplitAxisAnimating: (val) => set({ isSplitAxisAnimating: Boolean(val) }),
  setIsSplitClosing: (val) => set({ isSplitClosing: Boolean(val) }),
  setSplitTransitionMode: (mode) => set({ splitTransitionMode: mode === 'instant' ? 'instant' : 'animate' }),
  setSplitOrientation: (orient) => {
    const next = SPLIT_ORIENTATIONS.includes(orient) ? orient : 'horizontal';
    try { localStorage.setItem('qbrowse_split_orientation', next); } catch (_) {}
    set({ splitOrientation: next });
  },
  toggleSplitOrientation: () => {
    const state = useUIStore.getState();
    const next = getNextSplitOrientation(state.splitOrientation);
    try { localStorage.setItem('qbrowse_split_orientation', next); } catch (_) {}

    const labelMap = {
      horizontal: tr('stores.ui.splitHorizontal', 'Split View: Side-by-Side'),
      vertical: tr('stores.ui.splitVertical', 'Split View: Stacked (Top/Bottom)'),
      quad: tr('stores.ui.splitQuad', 'Split View: 2×2 Quad Grid')
    };

    if (!state.isSplitView) {
      // Enable Split View cleanly with the tab-selection launcher instead of corrupting layout
      set({
        isSplitView: true,
        splitOrientation: next,
        splitTransitionMode: 'animate',
        splitRightTabId: null,
        splitPaneTabIds: [null, null, null],
        focusedPane: 'right'
      });
    } else {
      set({ splitOrientation: next, splitTransitionMode: 'animate' });
    }
    useUIStore.getState().showToast(labelMap[next] || labelMap.horizontal);
  },
  setSplitPaneTabId: (slotIndex, id) => {
    if (slotIndex < 1 || slotIndex > 3) return;
    const state = useUIStore.getState();
    const prevSlots = [...(state.splitPaneTabIds || [state.splitRightTabId || null, null, null])];

    if (id && typeof window !== 'undefined' && window.__tabStore) {
      try {
        const tabStore = window.__tabStore.getState();
        const list = tabStore.getActiveList();
        const targetTab = list.find(t => t.id === id);
        if (!targetTab || isBlankSplitTab(targetTab)) return;

        // Remove from any other secondary slot to avoid duplicate panes
        for (let i = 0; i < prevSlots.length; i++) {
          if (i !== slotIndex - 1 && prevSlots[i] === id) {
            prevSlots[i] = null;
          }
        }

        // If target tab is currently primary active tab, switch primary to a distinct tab first
        const currentActive = tabStore.getActiveTab();
        if (currentActive && currentActive.id === id) {
          const setList = tabStore.getActiveSetList();
          const occupied = new Set([id, ...prevSlots.filter(Boolean)]);
          const candidate = list.find(t => !occupied.has(t.id)) || list.find(t => t.id !== id);
          if (candidate) {
            setList(list.map(t => ({
              ...t,
              active: t.id === candidate.id,
              suspended: t.id === candidate.id ? false : t.suspended,
              lastActiveAt: t.id === candidate.id ? Date.now() : t.lastActiveAt
            })));
          }
        } else if (targetTab.suspended) {
          // Ensure secondary pane tab is unsuspended
          const setList = tabStore.getActiveSetList();
          setList(list.map(t => (t.id === id ? { ...t, suspended: false, lastActiveAt: Date.now() } : t)));
        }
      } catch (_) {}
    }

    prevSlots[slotIndex - 1] = id || null;
    set({
      splitPaneTabIds: prevSlots,
      splitRightTabId: prevSlots[0] || null,
      ...(id ? { parkedSplitGroups: pruneTabsFromParkedGroups(state.parkedSplitGroups, [id]) } : {})
    });
  },
  setSplitRightTabId: (id) => {
    useUIStore.getState().setSplitPaneTabId(1, id);
  },
  clearSplitTabFromPanes: (tabId) => {
    if (!tabId) return;
    const state = useUIStore.getState();
    const prevSlots = state.splitPaneTabIds || [state.splitRightTabId || null, null, null];
    const updates = {};

    if (prevSlots.includes(tabId) || state.splitRightTabId === tabId) {
      const nextSlots = prevSlots.map(id => (id === tabId ? null : id));
      updates.splitPaneTabIds = nextSlots;
      updates.splitRightTabId = nextSlots[0] || null;
    }

    if (Array.isArray(state.parkedSplitGroups) && state.parkedSplitGroups.length > 0) {
      const pruned = pruneTabsFromParkedGroups(state.parkedSplitGroups, [tabId]);
      if (pruned !== state.parkedSplitGroups) {
        updates.parkedSplitGroups = pruned;
      }
    }

    if (Object.keys(updates).length > 0) {
      set(updates);
    }
  },
  parkOrCloseSplitViewForTabSwitch: ({ instant = true } = {}) => {
    const state = useUIStore.getState();
    if (!state.isSplitView) return;

    const secondaryIds = [...(state.splitPaneTabIds || [state.splitRightTabId || null, null, null])];
    const hasSecondaryTab = secondaryIds.some(Boolean);
    let nextParkedGroups = state.parkedSplitGroups || [];

    if (hasSecondaryTab && typeof window !== 'undefined' && window.__tabStore) {
      try {
        const tabStore = window.__tabStore.getState();
        const space = tabStore.activeSpace;
        const list = tabStore.getActiveList() || [];
        const secondarySet = new Set(secondaryIds.filter(Boolean));
        const primaryTab =
          list.find(t => t.active && !secondarySet.has(t.id)) ||
          list.find(t => !secondarySet.has(t.id)) ||
          list[0];
        if (primaryTab) {
          nextParkedGroups = upsertParkedSplitGroup(nextParkedGroups, {
            id: state.activeSplitGroupId || `sg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            space,
            name: state.activeSplitGroupName || '',
            primaryTabId: primaryTab.id,
            paneTabIds: secondaryIds,
            orientation: state.splitOrientation || 'horizontal',
            splitRatio: state.splitRatio || 50,
            splitRatioY: state.splitRatioY || 50
          });
        }
      } catch (_) {}
    }

    set({
      isSplitView: false,
      activeSplitGroupId: null,
      activeSplitGroupName: '',
      splitTransitionMode: instant ? 'instant' : 'animate',
      splitRightTabId: null,
      splitPaneTabIds: [null, null, null],
      focusedPane: 'left',
      parkedSplitGroups: nextParkedGroups
    });
  },
  renameSplitGroup: (groupId, nextName) => {
    const clean = typeof nextName === 'string' ? nextName.trim().slice(0, 40) : '';
    set((state) => {
      if (!groupId || groupId === 'active' || (state.isSplitView && groupId === state.activeSplitGroupId)) {
        return { activeSplitGroupName: clean };
      }
      return {
        parkedSplitGroups: (state.parkedSplitGroups || []).map(g =>
          g && g.id === groupId ? { ...g, name: clean } : g
        )
      };
    });
  },
  restoreParkedSplitGroup: (groupIdOrSlotIdx = null, focusSlotIdx = 0, { instant = true } = {}) => {
    const state = useUIStore.getState();
    if (typeof window === 'undefined' || !window.__tabStore) return;
    const tabStore = window.__tabStore.getState();

    // Support both restoreParkedSplitGroup(groupId, slotIdx, opts) and legacy restoreParkedSplitGroup(slotIdx, opts)
    let targetGroupId = typeof groupIdOrSlotIdx === 'string' ? groupIdOrSlotIdx : null;
    let resolvedSlotIdx = typeof groupIdOrSlotIdx === 'number' ? groupIdOrSlotIdx : focusSlotIdx;
    let resolvedOpts = (typeof groupIdOrSlotIdx === 'number' && typeof focusSlotIdx === 'object' && focusSlotIdx !== null)
      ? focusSlotIdx
      : { instant };
    const useInstant = resolvedOpts?.instant !== false;

    const groups = state.parkedSplitGroups || [];
    const pg = targetGroupId
      ? groups.find(g => g.id === targetGroupId)
      : groups.find(g => g.space === tabStore.activeSpace);
    if (!pg) return;

    // If another Split View is currently active, park it first into parkedSplitGroups
    let nextParkedGroups = groups;
    if (state.isSplitView) {
      const curSecondary = [...(state.splitPaneTabIds || [state.splitRightTabId || null, null, null])];
      if (curSecondary.some(Boolean)) {
        const curList = tabStore.getActiveList() || [];
        const curSecSet = new Set(curSecondary.filter(Boolean));
        const curPrimary = curList.find(t => t.active && !curSecSet.has(t.id)) || curList.find(t => !curSecSet.has(t.id)) || curList[0];
        if (curPrimary) {
          nextParkedGroups = upsertParkedSplitGroup(nextParkedGroups, {
            id: state.activeSplitGroupId || `sg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            space: tabStore.activeSpace,
            name: state.activeSplitGroupName || '',
            primaryTabId: curPrimary.id,
            paneTabIds: curSecondary,
            orientation: state.splitOrientation || 'horizontal',
            splitRatio: state.splitRatio || 50,
            splitRatioY: state.splitRatioY || 50
          });
        }
      }
    }
    nextParkedGroups = nextParkedGroups.filter(g => g.id !== pg.id);

    if (tabStore.activeSpace !== pg.space) {
      tabStore.setActiveSpace(pg.space, { skipAutoSplitRestore: true });
    }
    const freshTabStore = window.__tabStore.getState();
    const list = freshTabStore.getTabsForSpace
      ? freshTabStore.getTabsForSpace(pg.space)
      : freshTabStore.getActiveList();
    const validIds = new Set((list || []).map(t => t.id));
    const paneIds = (pg.paneTabIds || [null, null, null]).map(id => (id && validIds.has(id) ? id : null));
    const primaryId = pg.primaryTabId && validIds.has(pg.primaryTabId) ? pg.primaryTabId : null;

    if (!primaryId || !paneIds.some(Boolean)) {
      set({ parkedSplitGroups: nextParkedGroups });
      return;
    }

    const setList = freshTabStore.setTabsForSpace
      ? (updater) => freshTabStore.setTabsForSpace(pg.space, updater)
      : freshTabStore.getActiveSetList();
    const nowTs = Date.now();
    const activeSet = new Set([primaryId, ...paneIds.filter(Boolean)]);
    setList((list || []).map(t => ({
      ...t,
      active: t.id === primaryId,
      suspended: activeSet.has(t.id) ? false : t.suspended,
      lastActiveAt: activeSet.has(t.id) ? nowTs : t.lastActiveAt
    })));

    const focusedPaneMap = { 0: 'left', 1: 'right', 2: 'pane-2', 3: 'pane-3' };
    const focusedTabObj = (list || []).find(t => t.id === (resolvedSlotIdx === 0 ? primaryId : (paneIds[resolvedSlotIdx - 1] || primaryId)));
    set({
      isSplitView: true,
      activeSplitGroupId: pg.id,
      activeSplitGroupName: pg.name || '',
      splitTransitionMode: useInstant ? 'instant' : 'animate',
      splitOrientation: pg.orientation || 'horizontal',
      splitRatio: pg.splitRatio || 50,
      splitRatioY: pg.splitRatioY || 50,
      splitPaneTabIds: paneIds,
      splitRightTabId: paneIds[0] || null,
      focusedPane: focusedPaneMap[resolvedSlotIdx] || 'left',
      parkedSplitGroups: nextParkedGroups,
      ...(focusedTabObj ? { currentUrl: focusedTabObj.url || '' } : {})
    });
  },
  clearParkedSplitGroup: (groupId = null) => set((state) => ({
    parkedSplitGroups: groupId
      ? (state.parkedSplitGroups || []).filter(g => g.id !== groupId)
      : []
  })),
  swapSplitPanes: (slotA = 0, slotB = 1) => {
    const state = useUIStore.getState();
    if (!state.isSplitView || typeof window === 'undefined' || !window.__tabStore) return;
    const tabStore = window.__tabStore.getState();
    const list = tabStore.getActiveList();
    const setList = tabStore.getActiveSetList();
    const spaceTabs = list || [];

    const prevSlots = [...(state.splitPaneTabIds || [state.splitRightTabId || null, null, null])];
    const secondarySet = new Set(prevSlots.filter(Boolean));
    const slot0Tab =
      spaceTabs.find(t => t.active && !secondarySet.has(t.id)) ||
      spaceTabs.find(t => !secondarySet.has(t.id)) ||
      spaceTabs[0] ||
      null;

    const slots = [slot0Tab?.id || null, prevSlots[0] || null, prevSlots[1] || null, prevSlots[2] || null];
    let idxA = slotA;
    let idxB = slotB;

    // In 2-pane or generic shortcut swap, if slotB is empty try first populated secondary slot
    if (!slots[idxB]) {
      const firstPopulated = [1, 2, 3].find(i => i !== idxA && slots[i]);
      if (firstPopulated !== undefined) idxB = firstPopulated;
    }
    if (idxA === idxB || !slots[idxA] || !slots[idxB]) return;

    const tmp = slots[idxA];
    slots[idxA] = slots[idxB];
    slots[idxB] = tmp;

    const nextPrimaryId = slots[0];
    const nextSecondary = [slots[1] || null, slots[2] || null, slots[3] || null];

    if (nextPrimaryId) {
      const nowTs = Date.now();
      setList(spaceTabs.map(t => ({
        ...t,
        active: t.id === nextPrimaryId,
        suspended: (t.id === nextPrimaryId || nextSecondary.includes(t.id)) ? false : t.suspended,
        lastActiveAt: t.id === nextPrimaryId ? nowTs : t.lastActiveAt
      })));
      const primaryObj = spaceTabs.find(t => t.id === nextPrimaryId);
      if (primaryObj) {
        set({ currentUrl: primaryObj.url || '' });
      }
    }

    set({
      splitPaneTabIds: nextSecondary,
      splitRightTabId: nextSecondary[0] || null
    });
    useUIStore.getState().showToast(tr('stores.shortcuts.splitSwapped', 'Swapped Split Panes'));
  },
  setFocusedPane: (pane) => set({ focusedPane: pane }),
  setSplitRatio: (ratio) => set({ splitRatio: Math.min(80, Math.max(20, Number(ratio) || 50)) }),
  setSplitRatioY: (ratio) => set({ splitRatioY: Math.min(80, Math.max(20, Number(ratio) || 50)) }),
  toggleSplitView: (targetRightId = null) => {
    const currentState = useUIStore.getState();
    const nextState = !currentState.isSplitView;

    if (!nextState) {
      useUIStore.setState({
        isSplitView: false,
        activeSplitGroupId: null,
        activeSplitGroupName: '',
        splitTransitionMode: 'animate',
        splitRightTabId: null,
        splitPaneTabIds: [null, null, null],
        focusedPane: 'left'
      });
      useUIStore.getState().showToast(tr('stores.ui.splitDisabled', 'Split View: Disabled'));
      return;
    }

    let rightId = targetRightId;
    let activeTab = null;
    if (rightId) {
      let spaceTabs = [];
      try {
        const tabStore = window.__tabStore?.getState();
        if (tabStore) {
          spaceTabs = tabStore.getActiveList();
          activeTab = spaceTabs.find(t => t.active);
        }
      } catch (_) {}

      const targetObj = spaceTabs.find(t => t.id === rightId);
      if (!targetObj || (activeTab && rightId === activeTab.id) || isBlankSplitTab(targetObj)) {
        rightId = null;
      }
    } else {
      try {
        activeTab = window.__tabStore?.getState()?.getActiveTab?.() || null;
      } catch (_) {}
    }

    const nextGroupId = `sg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nextParkedGroups = pruneTabsFromParkedGroups(
      currentState.parkedSplitGroups,
      [activeTab?.id, rightId].filter(Boolean)
    );

    // When toggled without an explicit target tab (Ctrl+\ or TopBar button),
    // always open the Split Screen tab-selection launcher instead of auto-picking a tab.
    useUIStore.setState({
      isSplitView: true,
      activeSplitGroupId: nextGroupId,
      activeSplitGroupName: '',
      splitTransitionMode: 'animate',
      splitRightTabId: rightId || null,
      splitPaneTabIds: [rightId || null, null, null],
      focusedPane: 'right',
      parkedSplitGroups: nextParkedGroups
    });
    useUIStore.getState().showToast(
      rightId
        ? tr('stores.ui.splitEnabled', 'Split View: Enabled')
        : tr('stores.ui.splitSelectTab', 'Split View: Select a tab')
    );
  },
  // Windows & OS Accessibility Sync
  isSystemReducedMotion: typeof window !== 'undefined' && typeof window.matchMedia === 'function' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false,
  setIsSystemReducedMotion: (val) => set({ isSystemReducedMotion: Boolean(val) }),
  initSystemReducedMotion: () => {
    if (typeof window === 'undefined') return;
    
    // 1. Native Chromium Media Query (Immediate & Real-Time)
    if (typeof window.matchMedia === 'function') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      set({ isSystemReducedMotion: motionQuery.matches });
      
      const handleMotionChange = (e) => {
        set({ isSystemReducedMotion: Boolean(e.matches) });
      };
      
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', handleMotionChange);
      } else if (typeof motionQuery.addListener === 'function') {
        motionQuery.addListener(handleMotionChange);
      }
    }

    // 2. Electron Main Process NativeTheme Sync (OS Level & Registry Check)
    const refreshReducedMotionFromMain = () => {
      const mediaQueryMatches = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

      if (window.electronAPI?.getSystemReducedMotion) {
        window.electronAPI.getSystemReducedMotion().then((nativeVal) => {
          if (typeof nativeVal === 'boolean') {
            set({ isSystemReducedMotion: nativeVal || mediaQueryMatches });
          } else if (mediaQueryMatches) {
            set({ isSystemReducedMotion: true });
          }
        }).catch(() => {
          set({ isSystemReducedMotion: mediaQueryMatches });
        });
      } else {
        set({ isSystemReducedMotion: mediaQueryMatches });
      }
    };

    refreshReducedMotionFromMain();

    if (window.electronAPI?.onSystemReducedMotionChanged) {
      window.electronAPI.onSystemReducedMotionChanged((nativeVal) => {
        if (typeof nativeVal === 'boolean') {
          const mediaQueryMatches = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;
          set({ isSystemReducedMotion: nativeVal || mediaQueryMatches });
        }
      });
    }

    // Re-verify on window focus (e.g. user toggles Windows Settings and tabs back)
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('focus', refreshReducedMotionFromMain);
    }
  },

  // Topbar Extensions Hub Customization
  hideTopBarIcon: (iconId) => {
    const current = get().settings?.hiddenTopBarIcons || [];
    if (!current.includes(iconId)) {
      const next = [...current, iconId];
      get().setSetting('hiddenTopBarIcons', next);

      // Auto-close popover if its corresponding trigger icon was hidden
      const iconToPopover = {
        theme: 'darkmode',
        shield: 'adblock',
        media: 'media',
        downloads: 'downloads',
        tor: 'tor',
        vault: 'vault'
      };
      if (iconToPopover[iconId] && get().activePopover === iconToPopover[iconId]) {
        get().closePopover();
      }
    }
  },
  showTopBarIcon: (iconId) => {
    const current = get().settings?.hiddenTopBarIcons || [];
    if (current.includes(iconId)) {
      const next = current.filter(id => id !== iconId);
      get().setSetting('hiddenTopBarIcons', next);
    }
  },
  toggleTopBarIcon: (iconId) => {
    const current = get().settings?.hiddenTopBarIcons || [];
    const willHide = !current.includes(iconId);
    const next = willHide
      ? [...current, iconId]
      : current.filter(id => id !== iconId);
    get().setSetting('hiddenTopBarIcons', next);

    if (willHide) {
      const iconToPopover = {
        theme: 'darkmode',
        shield: 'adblock',
        media: 'media',
        downloads: 'downloads',
        tor: 'tor',
        vault: 'vault'
      };
      if (iconToPopover[iconId] && get().activePopover === iconToPopover[iconId]) {
        get().closePopover();
      }
    }
  },
  resetTopBarIcons: () => {
    get().setSetting('hiddenTopBarIcons', []);
  },

  isFullscreen: false,
  setIsFullscreen: async (val) => {
    set({ isFullscreen: val, isSidebarPeeking: false, isTopBarPeeking: false });
  },
  isFramelessMode: false,
  toggleFramelessMode: (forced) => {
    const current = useUIStore.getState().isFramelessMode;
    const next = typeof forced === 'boolean' ? forced : !current;
    set({
      isFramelessMode: next,
      isSidebarPeeking: false,
      isTopBarPeeking: false
    });
    return next;
  },
  // Authoritative OS BrowserWindow focus & visibility state (immune to <webview> focus steal)
  isWindowFocused: true,
  isWindowMinimized: false,
  isWindowVisible: typeof document !== 'undefined' ? !document.hidden : true,
  setWindowFocusState: (nextState) => {
    if (!nextState || typeof nextState !== 'object') return;
    set((state) => {
      const isMinimized = typeof nextState.isMinimized === 'boolean'
        ? nextState.isMinimized
        : state.isWindowMinimized;
      const isVisible = typeof nextState.isVisible === 'boolean'
        ? (nextState.isVisible && !isMinimized)
        : (state.isWindowVisible && !isMinimized);
      const isFocused = typeof nextState.isFocused === 'boolean'
        ? (nextState.isFocused && isVisible)
        : (state.isWindowFocused && isVisible);
      if (
        state.isWindowFocused === isFocused &&
        state.isWindowMinimized === isMinimized &&
        state.isWindowVisible === isVisible
      ) {
        return state;
      }
      return {
        isWindowFocused: isFocused,
        isWindowMinimized: isMinimized,
        isWindowVisible: isVisible
      };
    });
  },
  // Zen Fullscreen Hover Peeks (Arc-style)
  isSidebarPeeking: false,
  setIsSidebarPeeking: (val) => set({ isSidebarPeeking: val }),
  isTopBarPeeking: false,
  setIsTopBarPeeking: (val) => set({ isTopBarPeeking: val }),

  // HTML5 Video Fullscreen (YouTube, Netflix overlay)
  htmlFullscreenTabId: null,
  isWebviewHtmlFullscreen: false,
  setHtmlFullscreen: (tabId, isActive) => set({
    htmlFullscreenTabId: isActive ? tabId : null,
    isWebviewHtmlFullscreen: Boolean(isActive)
  }),
  isSidebarHidden: false,
  setIsSidebarHidden: (val) => set({ isSidebarHidden: val }),
  
  // Windows & Panels
  peekWindow: null,
  isPeekClosing: false,
  setPeekWindow: (win) => set({ peekWindow: win, isPeekClosing: false }),
  closePeek: () => {
    set({ isPeekClosing: true });
    setTimeout(() => {
      set({ peekWindow: null, isPeekClosing: false });
    }, 200);
  },
  
  pipWindow: null,
  isPipClosing: false,
  setPipWindow: (win) => set({ pipWindow: win, isPipClosing: false }),
  closePip: () => {
    set({ isPipClosing: true });
    setTimeout(() => set({ pipWindow: null, isPipClosing: false }), 200);
  },

  isRightPanelOpen: false,
  setIsRightPanelOpen: (val) => set({ isRightPanelOpen: val }),
  rightPanelTab: 'ai', // 'ai' | 'downloads' | 'settings' | 'history'
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  // Downloads (Persistent & Synchronized with ToolHub)
  downloads: loadInitialDownloads(),
  setDownloads: (downloads) => {
    saveDownloadsToStorage(downloads);
    set({ downloads });
  },
  addDownload: (download) => set(state => {
    const next = [download, ...(state.downloads || []).filter(d => d.id !== download.id)];
    saveDownloadsToStorage(next);
    return { downloads: next };
  }),
  updateDownload: (id, updates) => set(state => {
    const next = (state.downloads || []).map(d => d.id === id ? { ...d, ...updates } : d);
    saveDownloadsToStorage(next);
    return { downloads: next };
  }),
  removeDownload: async (id, deleteFile = true) => {
    const item = (get().downloads || []).find(d => d.id === id);
    if (item && deleteFile) {
      const filePath = item.savePath || item.filePath;
      if (filePath && window.electronAPI?.deleteDownloadFile) {
        try {
          await window.electronAPI.deleteDownloadFile(filePath);
        } catch (e) {
          console.warn('[Downloads] Failed to remove file from disk:', e);
        }
      }
    }
    const next = (get().downloads || []).filter(d => d.id !== id);
    saveDownloadsToStorage(next);
    set({ downloads: next });
  },
  clearDownloads: () => set(() => {
    saveDownloadsToStorage([]);
    return { downloads: [] };
  }),

  activeDownloadPopup: null,
  setActiveDownloadPopup: (popup) => set({ activeDownloadPopup: popup }),

  registerScreenshotDownload: (res, title, type = 'Screenshot') => {
    if (!res || !res.success || !res.filePath) return;
    const fileName = res.fileName || res.filePath.split(/[\\/]/).pop() || `${type}.png`;
    const downloadItem = {
      id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      fileName,
      filename: fileName,
      url: `file://${res.filePath.replace(/\\/g, '/')}`,
      savePath: res.filePath,
      filePath: res.filePath,
      state: 'completed',
      progress: 100,
      totalBytes: res.fileSize || 0,
      receivedBytes: res.fileSize || 0,
      speedBytesPerSec: 0,
      isScreenshot: true,
      screenshotType: type,
      createdAt: Date.now(),
      completedAt: Date.now()
    };

    get().addDownload(downloadItem);
    get().setActiveDownloadPopup(downloadItem.id);

    const s = get().settings;
    if (s?.downloadSound !== false) {
      try {
        playDownloadCompleteChime();
      } catch (_) {}
    }

    setTimeout(() => {
      if (get().activeDownloadPopup === downloadItem.id) {
        get().setActiveDownloadPopup(null);
      }
    }, 4500);
  },

  // Navigation
  
  hoverPreview: null,
  setHoverPreview: (preview) => set({ hoverPreview: preview }),

  contextMenu: null,
  isContextMenuClosing: false,
  setContextMenu: (menu) => set({ contextMenu: menu, isContextMenuClosing: false }),
  closeContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ contextMenu: null, isContextMenuClosing: false });
      return;
    }
    set({ isContextMenuClosing: true });
    setTimeout(() => set({ contextMenu: null, isContextMenuClosing: false }), 200);
  },

  tabContextMenu: null,
  isTabContextMenuClosing: false,
  setTabContextMenu: (menu) => set({ tabContextMenu: menu, isTabContextMenuClosing: false }),
  closeTabContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ tabContextMenu: null, isTabContextMenuClosing: false });
      return;
    }
    set({ isTabContextMenuClosing: true });
    setTimeout(() => set({ tabContextMenu: null, isTabContextMenuClosing: false }), 200);
  },

  folderContextMenu: null,
  isFolderContextMenuClosing: false,
  setFolderContextMenu: (menu) => set({ folderContextMenu: menu, isFolderContextMenuClosing: false }),
  closeFolderContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ folderContextMenu: null, isFolderContextMenuClosing: false });
      return;
    }
    set({ isFolderContextMenuClosing: true });
    setTimeout(() => set({ folderContextMenu: null, isFolderContextMenuClosing: false }), 200);
  },

  pinnedContextMenu: null,
  isPinnedContextMenuClosing: false,
  setPinnedContextMenu: (menu) => set({ pinnedContextMenu: menu, isPinnedContextMenuClosing: false }),
  closePinnedContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ pinnedContextMenu: null, isPinnedContextMenuClosing: false });
      return;
    }
    set({ isPinnedContextMenuClosing: true });
    setTimeout(() => set({ pinnedContextMenu: null, isPinnedContextMenuClosing: false }), 200);
  },

  topBarContextMenu: null,
  isTopBarContextMenuClosing: false,
  setTopBarContextMenu: (menu) => set({ topBarContextMenu: menu, isTopBarContextMenuClosing: false }),
  closeTopBarContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ topBarContextMenu: null, isTopBarContextMenuClosing: false });
      return;
    }
    set({ isTopBarContextMenuClosing: true });
    setTimeout(() => set({ topBarContextMenu: null, isTopBarContextMenuClosing: false }), 200);
  },

  toolHubContextMenu: null,
  isToolHubContextMenuClosing: false,
  setToolHubContextMenu: (menu) => set({ toolHubContextMenu: menu, isToolHubContextMenuClosing: false }),
  closeToolHubContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ toolHubContextMenu: null, isToolHubContextMenuClosing: false });
      return;
    }
    set({ isToolHubContextMenuClosing: true });
    setTimeout(() => set({ toolHubContextMenu: null, isToolHubContextMenuClosing: false }), 200);
  },

  spaceContextMenu: null,
  isSpaceContextMenuClosing: false,
  setSpaceContextMenu: (menu) => set({ spaceContextMenu: menu, isSpaceContextMenuClosing: false }),
  closeSpaceContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ spaceContextMenu: null, isSpaceContextMenuClosing: false });
      return;
    }
    set({ isSpaceContextMenuClosing: true });
    setTimeout(() => set({ spaceContextMenu: null, isSpaceContextMenuClosing: false }), 200);
  },

  inputContextMenu: null,
  isInputContextMenuClosing: false,
  setInputContextMenu: (menu) => set({ inputContextMenu: menu, isInputContextMenuClosing: false }),
  closeInputContextMenu: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ inputContextMenu: null, isInputContextMenuClosing: false });
      return;
    }
    set({ isInputContextMenuClosing: true });
    setTimeout(() => set({ inputContextMenu: null, isInputContextMenuClosing: false }), 200);
  },

  renamingSpaceId: null,
  setRenamingSpaceId: (id) => set({ renamingSpaceId: id }),

  closeContextMenus: () => {
    const state = useUIStore.getState();
    const isReduced = Boolean(state.settings?.a11yReducedMotion || state.isSystemReducedMotion);
    if (isReduced) {
      set({
        contextMenu: null,
        isContextMenuClosing: false,
        tabContextMenu: null,
        isTabContextMenuClosing: false,
        folderContextMenu: null,
        isFolderContextMenuClosing: false,
        pinnedContextMenu: null,
        isPinnedContextMenuClosing: false,
        topBarContextMenu: null,
        isTopBarContextMenuClosing: false,
        toolHubContextMenu: null,
        isToolHubContextMenuClosing: false,
        spaceContextMenu: null,
        isSpaceContextMenuClosing: false,
        inputContextMenu: null,
        isInputContextMenuClosing: false,
        activePinnedStack: null
      });
      return;
    }
    if (state.contextMenu) {
      set({ isContextMenuClosing: true });
      setTimeout(() => set({ contextMenu: null, isContextMenuClosing: false }), 200);
    }
    if (state.tabContextMenu) {
      set({ isTabContextMenuClosing: true });
      setTimeout(() => set({ tabContextMenu: null, isTabContextMenuClosing: false }), 200);
    }
    if (state.folderContextMenu) {
      set({ isFolderContextMenuClosing: true });
      setTimeout(() => set({ folderContextMenu: null, isFolderContextMenuClosing: false }), 200);
    }
    if (state.pinnedContextMenu) {
      set({ isPinnedContextMenuClosing: true });
      setTimeout(() => set({ pinnedContextMenu: null, isPinnedContextMenuClosing: false }), 200);
    }
    if (state.topBarContextMenu) {
      set({ isTopBarContextMenuClosing: true });
      setTimeout(() => set({ topBarContextMenu: null, isTopBarContextMenuClosing: false }), 200);
    }
    if (state.toolHubContextMenu) {
      set({ isToolHubContextMenuClosing: true });
      setTimeout(() => set({ toolHubContextMenu: null, isToolHubContextMenuClosing: false }), 200);
    }
    if (state.spaceContextMenu) {
      set({ isSpaceContextMenuClosing: true });
      setTimeout(() => set({ spaceContextMenu: null, isSpaceContextMenuClosing: false }), 200);
    }
    if (state.inputContextMenu) {
      set({ isInputContextMenuClosing: true });
      setTimeout(() => set({ inputContextMenu: null, isInputContextMenuClosing: false }), 200);
    }
    if (state.activePinnedStack) {
      set({ activePinnedStack: null });
    }
  },


  currentUrl: '',
  setCurrentUrl: (url) => set({ currentUrl: url }),

  isRefreshing: false,
  refresh: () => {
    set({ isRefreshing: true });
    try {
        const activeWv = get().getActiveWebView();
        if (activeWv && typeof activeWv.reload === 'function') {
            activeWv.reload();
        } else {
            const wv = Array.from(document.querySelectorAll('webview')).find(w => w.style.visibility !== 'hidden' && w.style.display !== 'none');
            if (wv && typeof wv.reload === 'function') {
                wv.reload();
            }
        }
    } catch (e) {}
    setTimeout(() => set({ isRefreshing: false }), 1000);
  },

  // Find in Page
  isFindOpen: false,
  findQuery: '',
  findMatchCase: false,
  findResults: { activeMatchOrdinal: 0, matches: 0 },
  getActiveWebView: () => {
    try {
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const uiStore = get();
      let activeTabId = null;
      if (uiStore.isSplitView && uiStore.focusedPane === 'right' && uiStore.splitRightTabId) {
        activeTabId = uiStore.splitRightTabId;
      } else if (tabStore?.getActiveTab) {
        const activeTab = tabStore.getActiveTab();
        activeTabId = activeTab?.id;
      }

      if (activeTabId) {
        if (typeof window !== 'undefined' && window.qbrowseWebviews && window.qbrowseWebviews[activeTabId]) {
          return window.qbrowseWebviews[activeTabId];
        }
        const wv = document.getElementById(`webview-${activeTabId}`);
        if (wv) return wv;
      }
      const webviews = Array.from(document.querySelectorAll('webview'));
      const visibleWv = webviews.find(w => {
        const parent = w.parentElement;
        if (!parent) return false;
        const style = window.getComputedStyle(parent);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });
      if (visibleWv) return visibleWv;
      return webviews[0] || null;
    } catch {
      return null;
    }
  },
  setIsFindOpen: (val) => {
    const currentState = get();
    if (!val) {
      if (currentState.isFindOpen) {
        try {
          const wv = currentState.getActiveWebView();
          if (wv && typeof wv.stopFindInPage === 'function') {
            wv.stopFindInPage('clearSelection');
          }
        } catch (e) {}
        // Discard find overlay and match counters, but KEEP findQuery remembered!
        set({ isFindOpen: false, findResults: { activeMatchOrdinal: 0, matches: 0 } });
        try {
          const wv = currentState.getActiveWebView();
          if (wv && typeof wv.focus === 'function') {
            wv.focus();
          }
        } catch (e) {}
      }
      return;
    }

    set({ isFindOpen: true, ...(val ? { isScreenshotBarOpen: false } : {}) });
    const q = currentState.findQuery;
    if (q && q.trim()) {
      setTimeout(() => {
        get().executeFind(q, { forward: true });
      }, 50);
    }
  },
  setFindQuery: (query) => {
    set({ findQuery: query });
    const trimmed = (query || '').trim();
    if (!trimmed) {
      try {
        const wv = get().getActiveWebView();
        if (wv && typeof wv.stopFindInPage === 'function') {
          wv.stopFindInPage('clearSelection');
        }
      } catch (e) {}
      set({ findResults: { activeMatchOrdinal: 0, matches: 0 } });
      return;
    }
    // Automatically update search with each symbol inputted
    get().executeFind(query, { forward: true });
  },
  setFindMatchCase: (matchCase) => {
    set({ findMatchCase: matchCase });
    const q = get().findQuery;
    if (q && q.trim()) {
      get().executeFind(q, { forward: true, matchCase });
    }
  },
  setFindResults: (results) => set({ findResults: results }),
  executeFind: (query, { forward = true, findNext, matchCase } = {}) => {
    if (!query || !query.trim()) return;
    const caseSensitive = typeof matchCase === 'boolean' ? matchCase : get().findMatchCase;
    const options = { forward, matchCase: caseSensitive };
    if (typeof findNext === 'boolean') {
      options.findNext = findNext;
    }
    try {
      const wv = get().getActiveWebView();
      if (wv && typeof wv.findInPage === 'function') {
        wv.findInPage(query, options);
      }
    } catch (e) {
      console.warn('[FindInPage] execute error:', e);
    }
  },
  findNextMatch: (forward = true) => {
    const { findQuery, isFindOpen } = get();
    if (!isFindOpen) {
      get().setIsFindOpen(true);
      return;
    }
    if (!findQuery || !findQuery.trim()) return;
    get().executeFind(findQuery, { forward, findNext: true });
  },

  // Printing & PDF Export
  printActivePage: () => {
    try {
      const wv = get().getActiveWebView();
      if (wv && typeof wv.print === 'function') {
        wv.print();
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('[Print] error triggering print:', e);
      window.print();
    }
  },

  saveActivePageAsPDF: async () => {
    try {
      const wv = get().getActiveWebView();
      if (!wv) {
        get().showToast(tr('stores.ui.noWebpageToExport', 'No active webpage to export'));
        return;
      }

      const defaultWebpage = tr('stores.ui.webpageDefault', 'Webpage');
      let title = defaultWebpage;
      try {
        if (typeof wv.getTitle === 'function') {
          title = wv.getTitle() || title;
        }
      } catch (_) {}

      if (title === defaultWebpage && window.__tabStore) {
        try {
          const tab = window.__tabStore.getState()?.getActiveTab?.();
          if (tab?.title) title = tab.title;
        } catch (_) {}
      }

      const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 80) || defaultWebpage;
      const defaultName = `${safeTitle}.pdf`;

      get().showToast(tr('stores.ui.generatingCleanPdf', 'Generating Clean PDF...'));

      if (typeof wv.printToPDF !== 'function') {
        get().showToast(tr('stores.ui.pdfNotSupported', 'PDF export not supported on this view'));
        return;
      }

      // Temporarily remove dark mode inversion/filter so PDF prints as crisp, clean black text on white paper
      let wasDark = false;
      try {
        if (typeof wv.executeJavaScript === 'function') {
          wasDark = await wv.executeJavaScript(`
            (function() {
              const doc = document.documentElement;
              const hasDark = doc.classList.contains('qbrowse-smart-dark-active');
              if (hasDark) doc.classList.remove('qbrowse-smart-dark-active');
              return hasDark;
            })()
          `);
        }
      } catch (_) {}

      // Short yield to let DOM style recalc apply
      await new Promise(r => setTimeout(r, 80));

      let pdfData = null;
      try {
        pdfData = await wv.printToPDF({
          landscape: false,
          displayHeaderFooter: false,
          printBackground: true,
          pageSize: 'A4'
        });
      } finally {
        if (wasDark) {
          try {
            if (typeof wv.executeJavaScript === 'function') {
              await wv.executeJavaScript(`document.documentElement.classList.add('qbrowse-smart-dark-active')`);
            }
          } catch (_) {}
        }
      }

      if (!pdfData || pdfData.length === 0) {
        get().showToast(tr('stores.ui.pdfFailedGenerate', 'Failed to generate PDF'));
        return;
      }

      if (window.electronAPI && typeof window.electronAPI.savePdfFile === 'function') {
        const res = await window.electronAPI.savePdfFile({
          defaultName,
          data: pdfData
        });
        if (res?.success) {
          get().showToast(tr('stores.ui.pdfExportedSuccess', 'PDF exported successfully'));
        } else if (!res?.canceled) {
          const reason = res?.error || tr('stores.ui.unknownError', 'Unknown error');
          get().showToast(tr('stores.ui.pdfExportFailed', { error: reason }, `PDF export failed: ${reason}`));
        }
      } else {
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        get().showToast(tr('stores.ui.pdfDownloaded', 'PDF downloaded'));
      }
    } catch (e) {
      console.error('[PDF Export] error:', e);
      get().showToast(tr('stores.ui.pdfExportFailed', { error: e.message }, `PDF export failed: ${e.message}`));
    }
  },

  // Webpage Screenshot & Snipping Tool
  isScreenshotBarOpen: false,
  isSnippingMode: false,
  lastScreenshotPath: null,
  setIsScreenshotBarOpen: (val) => {
    if (val) {
      if (get().isFindOpen) {
        get().setIsFindOpen(false);
      }
      set({ isScreenshotBarOpen: true });
    } else {
      set({ isScreenshotBarOpen: false });
    }
  },
  setIsSnippingMode: (val) => set({ isSnippingMode: !!val }),
  openLastScreenshotFolder: () => {
    const { lastScreenshotPath } = get();
    if (lastScreenshotPath && window.electronAPI && typeof window.electronAPI.showItemInFolder === 'function') {
      window.electronAPI.showItemInFolder(lastScreenshotPath);
    }
  },

  captureVisibleViewport: async () => {
    try {
      set({ toast: null, isToastClosing: false }); // Ensure no toast overlays the capture
      const wv = get().getActiveWebView();
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const activeTab = tabStore?.getActiveTab ? tabStore.getActiveTab() : null;
      const isOnNewTab = !activeTab || !activeTab.url || activeTab.url === '' || activeTab.url === 'about:blank';
      const title = activeTab?.title || 'Webpage';

      let wcId = null;
      if (!isOnNewTab && wv && typeof wv.getWebContentsId === 'function') {
        try {
          wcId = wv.getWebContentsId();
        } catch (e) {
          console.warn('[Screenshot] getWebContentsId error:', e);
        }
      }

      if (window.electronAPI && typeof window.electronAPI.captureAndSave === 'function') {
        let res;
        if (wcId) {
          // Capture guest webpage directly: 100% clean, NO rounded corners, NO window overlays, NO toasts!
          res = await window.electronAPI.captureAndSave({ webContentsId: wcId, title });
        } else {
          // New Tab / Zen Dashboard fallback
          let rect = null;
          if (wv) {
            const r = wv.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              rect = { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
            }
          }
          res = await window.electronAPI.captureAndSave({ rect, title });
        }

        if (res?.success) {
          set({ lastScreenshotPath: res.filePath });
          get().registerScreenshotDownload(res, title, tr('stores.ui.visibleViewport', 'Visible Viewport'));
          get().showToast(tr('stores.ui.screenshotSavedCopied', 'Screenshot saved to Downloads & copied to clipboard!'));
        } else {
          const reason = res?.error || tr('stores.ui.unknownError', 'Unknown error');
          get().showToast(tr('stores.ui.screenshotCaptureFailed', { error: reason }, `Failed to capture screenshot: ${reason}`));
        }
      }
    } catch (e) {
      console.error('[Screenshot] Visible capture error:', e);
      get().showToast(tr('stores.ui.screenshotFailed', { error: e.message }, `Screenshot failed: ${e.message}`));
    }
  },

  captureFullPage: async () => {
    try {
      set({ toast: null, isToastClosing: false }); // Clear any toast immediately
      const wv = get().getActiveWebView();
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const activeTab = tabStore?.getActiveTab ? tabStore.getActiveTab() : null;
      const isOnNewTab = !activeTab || !activeTab.url || activeTab.url === '' || activeTab.url === 'about:blank';

      if (isOnNewTab || !wv) {
        get().showToast(tr('stores.ui.openWebsiteForFullScreenshot', 'Open a website to capture a full scrolling page'));
        return;
      }

      let wcId = null;
      if (typeof wv.getWebContentsId === 'function') {
        try {
          wcId = wv.getWebContentsId();
        } catch (e) {
          console.warn('[Screenshot] getWebContentsId error:', e);
        }
      }
      if (!wcId) {
        get().showToast(tr('stores.ui.unableAccessWebcontents', 'Unable to access page webcontents'));
        return;
      }

      // 1. Get webpage scroll metrics and store original scroll position
      const metrics = await wv.executeJavaScript(`
        (function() {
          const body = document.body;
          const html = document.documentElement;
          const totalHeight = Math.max(
            body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight
          );
          return {
            totalHeight: Math.min(totalHeight, 25000),
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            origX: window.scrollX,
            origY: window.scrollY
          };
        })()
      `);

      const { totalHeight, viewportHeight, viewportWidth, origX, origY } = metrics;
      const title = activeTab?.title || tr('stores.ui.webpageDefault', 'Webpage');

      // If page is not taller than the viewport, do a single clean guest capture!
      if (totalHeight <= viewportHeight + 20) {
        if (window.electronAPI && typeof window.electronAPI.captureAndSave === 'function') {
          const res = await window.electronAPI.captureAndSave({ webContentsId: wcId, title });
          if (res?.success) {
            set({ lastScreenshotPath: res.filePath });
            get().registerScreenshotDownload(res, title, tr('stores.ui.fullPage', 'Full Page'));
            get().showToast(tr('stores.ui.fullPageSavedCopied', 'Full page screenshot saved & copied to clipboard!'));
          }
        }
        return;
      }

      // 2. Set up offscreen Canvas for stitching
      const canvas = document.createElement('canvas');
      canvas.width = viewportWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      let currentY = 0;
      while (currentY < totalHeight) {
        // Scroll the webview to currentY
        await wv.executeJavaScript(`window.scrollTo(0, ${currentY})`);
        // Wait 130ms for Chromium to paint the newly scrolled content
        await new Promise(r => setTimeout(r, 130));

        // Capture guest slice directly via webContentsId: clean, NO overlays, NO toasts, NO window borders!
        if (window.electronAPI && typeof window.electronAPI.captureSliceDataUrl === 'function') {
          const sliceDataUrl = await window.electronAPI.captureSliceDataUrl({ webContentsId: wcId });
          if (sliceDataUrl) {
            const sliceImg = await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () => resolve(null);
              img.src = sliceDataUrl;
            });

            if (sliceImg) {
              const remainingHeight = totalHeight - currentY;
              if (remainingHeight < viewportHeight) {
                // Last slice: draw the bottom portion of the slice to avoid overlap
                const scale = sliceImg.height / viewportHeight;
                const srcH = remainingHeight * scale;
                const srcY = sliceImg.height - srcH;
                ctx.drawImage(
                  sliceImg,
                  0, srcY, sliceImg.width, srcH,
                  0, currentY, viewportWidth, remainingHeight
                );
              } else {
                ctx.drawImage(sliceImg, 0, currentY, viewportWidth, viewportHeight);
              }
            }
          }
        }

        currentY += viewportHeight;
      }

      // 3. Restore original user scroll position
      await wv.executeJavaScript(`window.scrollTo(${origX}, ${origY})`);

      // 4. Save stitched canvas to disk and clipboard
      const finalDataUrl = canvas.toDataURL('image/png');
      if (window.electronAPI && typeof window.electronAPI.saveScreenshotDataUrl === 'function') {
        const res = await window.electronAPI.saveScreenshotDataUrl({
          dataUrl: finalDataUrl,
          title,
          copyToClipboard: true
        });
        if (res?.success) {
          set({ lastScreenshotPath: res.filePath });
          get().registerScreenshotDownload(res, title, tr('stores.ui.fullPage', 'Full Page'));
          get().showToast(tr('stores.ui.fullPageSavedCopied', 'Full page screenshot saved & copied to clipboard!'));
        } else {
          const reason = res?.error || tr('stores.ui.unknownError', 'Unknown error');
          get().showToast(tr('stores.ui.fullPageSaveFailed', { error: reason }, `Failed to save screenshot: ${reason}`));
        }
      }
    } catch (e) {
      console.error('[Screenshot] Full page error:', e);
      get().showToast(tr('stores.ui.fullPageFailed', { error: e.message }, `Full page screenshot failed: ${e.message}`));
    }
  },

  captureSelectedArea: async (rect) => {
    try {
      // 1. Clear any active toast notifications so they don't leak into capture
      set({ toast: null, isToastClosing: false });

      // 2. Ensure snipping mode is turned off and any overlay DOM is hidden
      if (get().isSnippingMode) {
        set({ isSnippingMode: false });
      }
      const overlayEl = document.getElementById('qbrowse-snipping-overlay');
      if (overlayEl) {
        overlayEl.style.display = 'none';
        overlayEl.style.visibility = 'hidden';
        overlayEl.style.opacity = '0';
      }

      // 3. Guarantee compositor has flushed clean frame before capture
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))));

      const cleanRect = {
        x: Math.max(0, Math.round(rect.x)),
        y: Math.max(0, Math.round(rect.y)),
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height))
      };

      const wv = get().getActiveWebView();
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      const activeTab = tabStore?.getActiveTab ? tabStore.getActiveTab() : null;
      const isOnNewTab = !activeTab || !activeTab.url || activeTab.url === '' || activeTab.url === 'about:blank';
      const title = activeTab?.title || tr('stores.ui.snip', 'Snip');
      let wcId = null;
      if (!isOnNewTab && wv && typeof wv.getWebContentsId === 'function') {
        try {
          wcId = wv.getWebContentsId();
        } catch (e) {
          console.warn('[Screenshot] getWebContentsId error:', e);
        }
      }

      if (window.electronAPI && typeof window.electronAPI.captureAndSave === 'function') {
        let res;
        const r = wv?.getBoundingClientRect?.();
        const isInsideWv = wv && wcId && r && (
          cleanRect.x >= r.left - 2 &&
          cleanRect.y >= r.top - 2 &&
          (cleanRect.x + cleanRect.width) <= (r.right + 2) &&
          (cleanRect.y + cleanRect.height) <= (r.bottom + 2)
        );

        if (isInsideWv) {
          // Translate to guest webview local coordinates
          const localX = Math.max(0, Math.round(cleanRect.x - r.left));
          const localY = Math.max(0, Math.round(cleanRect.y - r.top));
          const localRect = {
            x: localX,
            y: localY,
            width: Math.max(1, Math.min(cleanRect.width, Math.round(r.width - localX))),
            height: Math.max(1, Math.min(cleanRect.height, Math.round(r.height - localY)))
          };
          res = await window.electronAPI.captureAndSave({ webContentsId: wcId, rect: localRect, title });
        } else {
          res = await window.electronAPI.captureAndSave({ rect: cleanRect, title });
        }

        if (res?.success) {
          set({ lastScreenshotPath: res.filePath });
          get().registerScreenshotDownload(res, title, tr('stores.ui.snip', 'Snip'));
          get().showToast(tr('stores.ui.snipSavedCopied', 'Snip saved to Downloads & copied to clipboard!'));
        } else {
          const reason = res?.error || tr('stores.ui.unknownError', 'Unknown error');
          get().showToast(tr('stores.ui.snipSaveFailed', { error: reason }, `Failed to save snip: ${reason}`));
        }
      }
    } catch (e) {
      console.error('[Screenshot] Snip error:', e);
      get().showToast(tr('stores.ui.snipFailed', { error: e.message }, `Snip failed: ${e.message}`));
    }
  },

  // Notifications
  toast: null,
  isToastClosing: false,
  showToast: (message) => {
    const toastText = typeof message === 'object' && message !== null ? (message.message || message.text || '') : (message ? String(message) : '');
    if (globalToastTimeout) clearTimeout(globalToastTimeout);
    set({ toast: toastText, isToastClosing: false });
    globalToastTimeout = setTimeout(() => {
      set({ isToastClosing: true });
      globalToastTimeout = setTimeout(() => {
        set({ toast: null, isToastClosing: false });
      }, 220);
    }, 2500);
  },
  clearToast: () => {
    if (globalToastTimeout) clearTimeout(globalToastTimeout);
    set({ toast: null, isToastClosing: false });
  },

  // Tab Map
  isTabMapOpen: false,
  isTabMapClosing: false,
  openTabMap: () => set({ isTabMapOpen: true, isTabMapClosing: false, isTopBarOmniboxActive: false }),
  closeTabMap: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ isTabMapOpen: false, isTabMapClosing: false });
      return;
    }
    set({ isTabMapClosing: true });
    setTimeout(() => set({ isTabMapOpen: false, isTabMapClosing: false }), 300);
  },

  // Popovers & Context Menus
  activePopover: null,
  isPopoverClosing: false,
  openPopover: (popover) => set({ activePopover: popover, isPopoverClosing: false, isTopBarOmniboxActive: false }),
  closePopover: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ activePopover: null, isPopoverClosing: false });
      return;
    }
    set({ isPopoverClosing: true });
    const tier = get().activePerformanceTier;
    const optimizeEcoVisuals = shouldOptimizeEcoVisuals(tier, get().reduceVisualsOnEco);
    const timeout = optimizeEcoVisuals ? 120 : (tier === 'ultra' ? 260 : 230);
    setTimeout(() => set({ activePopover: null, isPopoverClosing: false }), timeout);
  },
  togglePopover: (popover) => {
    if (useUIStore.getState().activePopover === popover) {
      useUIStore.getState().closePopover();
    } else {
      set({ activePopover: popover, isPopoverClosing: false, isTopBarOmniboxActive: false });
    }
  },
  activePinnedStack: null, // { pin, anchorRect }
  isPinnedStackClosing: false,
  setActivePinnedStack: (stack) => set({ activePinnedStack: stack, isPinnedStackClosing: false }),
  closePinnedStack: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ activePinnedStack: null, isPinnedStackClosing: false });
      return;
    }
    set({ isPinnedStackClosing: true });
    const tier = get().activePerformanceTier;
    const optimizeEcoVisuals = shouldOptimizeEcoVisuals(tier, get().reduceVisualsOnEco);
    const timeout = optimizeEcoVisuals ? 100 : (tier === 'ultra' ? 220 : 180);
    setTimeout(() => set({ activePinnedStack: null, isPinnedStackClosing: false }), timeout);
  },
  mediaState: { ...EMPTY_MEDIA_STATE },
  mediaSessionsByTab: {},
  pipTabId: null,
  updateTabMediaState: (tabId, payload) => set(state => {
      if (!tabId) return state;
      return resolveMediaStateUpdate(state, tabId, payload);
  }),
  clearMediaStateForTab: (tabId) => set(state => {
      if (!tabId) return state;
      return resolveMediaStateClearForTab(state, tabId);
  }),
  resetAllMediaState: () => set({
      mediaState: { ...EMPTY_MEDIA_STATE },
      mediaSessionsByTab: {},
      pipTabId: null
  }),
  setPipTabId: (tabId, sourceTabId = null) => set(state => {
      if (tabId) {
          return { pipTabId: tabId };
      }
      if (!sourceTabId || state.pipTabId === sourceTabId) {
          return { pipTabId: null };
      }
      return state;
  }),
  setMediaState: (mediaObj) => set(state => {
      if (!mediaObj || typeof mediaObj !== 'object') return state;
      if (mediaObj.tabId) {
          return resolveMediaStateUpdate(state, mediaObj.tabId, mediaObj);
      }
      return {
          mediaState: { ...state.mediaState, ...mediaObj }
      };
  }),
  sendMediaCommand: (cmd, options = {}) => {
      const commandName = typeof cmd === 'string' ? cmd : (cmd ? cmd.action : 'unknown');
      const cmdPayload = typeof cmd === 'object' && cmd !== null ? cmd : { action: cmd };
      const explicitTabId = options?.targetTabId || (typeof cmd === 'object' && cmd !== null ? cmd.tabId : null) || null;
      console.log(`[QBrowse MediaControl] Dispatching command: "${commandName}"`, cmdPayload, explicitTabId ? `(tab=${explicitTabId})` : '');

      const getWebviewForTab = (id) => {
          if (!id || typeof document === 'undefined') return null;
          if (typeof window !== 'undefined' && window.qbrowseWebviews && window.qbrowseWebviews[id]) {
              return window.qbrowseWebviews[id];
          }
          return document.querySelector(`webview#webview-${id}`);
      };

      const mediaState = get().mediaState;
      let activeTabId = null;
      try {
          const tabStore = typeof window !== 'undefined' && window.__tabStore ? window.__tabStore.getState() : null;
          const uiState = get();
          if (uiState.isSplitView && uiState.focusedPane === 'right' && uiState.splitRightTabId) {
              activeTabId = uiState.splitRightTabId;
          } else if (tabStore?.getActiveTab) {
              activeTabId = tabStore.getActiveTab()?.id || null;
          }
      } catch (_) {}

      const resolvedTabId = resolveMediaCommandTargetTabId({
          explicitTabId,
          mediaStateTabId: mediaState?.tabId || null,
          activeTabId,
          hasWebviewForTab: (id) => Boolean(getWebviewForTab(id))
      });

      const targetWv = resolvedTabId ? getWebviewForTab(resolvedTabId) : null;
      if (!targetWv) {
          console.warn('[QBrowse MediaControl] No matching webview element available to receive command:', commandName);
          return false;
      }

      // Optimistic state toggle for play/pause only when targeting the current mediaState tab
      if ((commandName === 'toggle-play' || commandName === 'play-pause') && mediaState?.tabId && mediaState.tabId === resolvedTabId) {
          set(state => ({
              mediaState: {
                  ...state.mediaState,
                  isPlaying: !state.mediaState.isPlaying
              }
          }));
      }

      const targetWebviews = [targetWv];

      targetWebviews.forEach((wv, index) => {
          try {
              if (typeof wv.executeJavaScript === 'function') {
                  let script = '';

                  if (commandName === 'toggle-play' || commandName === 'play-pause') {
                      script = `
                          (function() {
                              try {
                                  window.__qbrowse_last_media_cmd = Date.now();

                                  // 1. YouTube Player API (main watch player)
                                  const isYt = /(^|\\.)youtube\\.com$/i.test(window.location.hostname || '');
                                  const yt = isYt ? document.querySelector('#movie_player') : null;
                                  if (yt && typeof yt.getPlayerState === 'function') {
                                      const state = yt.getPlayerState();
                                      if (state === 1 || state === 3) {
                                          if (typeof yt.pauseVideo === 'function') yt.pauseVideo();
                                          return 'yt-paused';
                                      } else {
                                          if (typeof yt.playVideo === 'function') yt.playVideo();
                                          return 'yt-played';
                                      }
                                  }

                                  // 2. YouTube & YouTube Music Play/Pause Buttons
                                  const ytBtn = document.querySelector('.ytp-play-button, button.ytp-play-button, #play-pause-button, tp-yt-paper-icon-button#play-pause-button');
                                  if (ytBtn) {
                                      ytBtn.click();
                                      return 'yt-btn-clicked';
                                  }

                                  // 3. Spotify, Twitch, SoundCloud & Web Player Buttons
                                  const streamBtn = document.querySelector(
                                      'button[data-testid="control-button-playpause"], ' +
                                      'button[data-testid="play-pause-button"], ' +
                                      'button[data-a-target="player-play-pause-button"], ' +
                                      '.playControl'
                                  );
                                  if (streamBtn) {
                                      streamBtn.click();
                                      return 'stream-btn-clicked';
                                  }

                                  // 4. HTML5 Video / Audio elements (only genuine unmuted media)
                                  const mediaEls = Array.from(document.querySelectorAll('video, audio'));
                                  const playing = mediaEls.find(m => !m.paused && !m.ended && !m.muted && m.volume > 0 && m.readyState >= 2);
                                  const targetMedia = playing || mediaEls.find(m => !m.muted && m.volume > 0 && m.readyState >= 2);
                                  if (targetMedia) {
                                      if (targetMedia.paused) {
                                          const p = targetMedia.play();
                                          if (p && typeof p.catch === 'function') p.catch(() => {});
                                          return 'html5-play';
                                      } else {
                                          targetMedia.pause();
                                          return 'html5-pause';
                                      }
                                  }

                                  return 'no-media-found';
                              } catch(e) {
                                  return 'toggle-err: ' + e.toString();
                              }
                          })()
                      `;
                  } else if (commandName === 'next-track') {
                      script = `
                          (function() {
                              try {
                                  window.__qbrowse_last_media_cmd = Date.now();
                                  const isYt = /(^|\\.)youtube\\.com$/i.test(window.location.hostname || '');
                                  const yt = isYt ? document.querySelector('#movie_player') : null;
                                  if (yt && typeof yt.nextVideo === 'function') {
                                      yt.nextVideo();
                                      return 'yt-next';
                                  }
                                  const btn = document.querySelector('.ytp-next-button, button[data-testid="control-button-skip-forward"], .skipControl__next, .next-button');
                                  if (btn) {
                                      btn.click();
                                      return 'next-btn';
                                  }
                                  const media = Array.from(document.querySelectorAll('video, audio')).find(m => !m.paused && !m.muted && m.volume > 0);
                                  if (media && Number.isFinite(media.duration)) {
                                      media.currentTime = Math.min(media.duration, media.currentTime + 10);
                                      return 'skip-10s';
                                  }
                              } catch(e) {
                                  return 'next-err: ' + e.toString();
                              }
                          })()
                      `;
                  } else if (commandName === 'prev-track') {
                      script = `
                          (function() {
                              try {
                                  window.__qbrowse_last_media_cmd = Date.now();
                                  const isYt = /(^|\\.)youtube\\.com$/i.test(window.location.hostname || '');
                                  const yt = isYt ? document.querySelector('#movie_player') : null;
                                  if (yt && typeof yt.previousVideo === 'function') {
                                      yt.previousVideo();
                                      return 'yt-prev';
                                  }
                                  const btn = document.querySelector('.ytp-prev-button, button[data-testid="control-button-skip-back"], .skipControl__previous, .previous-button');
                                  if (btn) {
                                      btn.click();
                                      return 'prev-btn';
                                  }
                                  const media = Array.from(document.querySelectorAll('video, audio')).find(m => !m.paused && !m.muted && m.volume > 0);
                                  if (media) {
                                      media.currentTime = Math.max(0, media.currentTime - 10);
                                      return 'rewind-10s';
                                  }
                              } catch(e) {
                                  return 'prev-err: ' + e.toString();
                              }
                          })()
                      `;
                  } else if (commandName === 'seek') {
                      const seekTime = typeof cmdPayload.time === 'number' ? cmdPayload.time : 0;
                      script = `
                          (function() {
                              try {
                                  window.__qbrowse_last_media_cmd = Date.now();
                                  const isYt = /(^|\\.)youtube\\.com$/i.test(window.location.hostname || '');
                                  const yt = isYt ? document.querySelector('#movie_player') : null;
                                  if (yt && typeof yt.seekTo === 'function') {
                                      yt.seekTo(${seekTime}, true);
                                      return 'yt-seek';
                                  }
                                  const media = Array.from(document.querySelectorAll('video, audio')).find(m => !m.paused && !m.muted && m.volume > 0) || Array.from(document.querySelectorAll('video, audio')).find(m => !m.muted && m.readyState >= 2);
                                  if (media) {
                                      media.currentTime = ${seekTime};
                                      return 'html5-seek';
                                  }
                              } catch(e) {
                                  return 'seek-err: ' + e.toString();
                              }
                          })()
                      `;
                  } else if (commandName === 'mute-toggle') {
                      script = `
                          (function() {
                              try {
                                  window.__qbrowse_last_media_cmd = Date.now();
                                  const isYt = /(^|\\.)youtube\\.com$/i.test(window.location.hostname || '');
                                  const yt = isYt ? document.querySelector('#movie_player') : null;
                                  if (yt && typeof yt.isMuted === 'function') {
                                      if (yt.isMuted()) yt.unMute?.();
                                      else yt.mute?.();
                                      return 'yt-mute';
                                  }
                                  const muteBtn = document.querySelector('.ytp-mute-button');
                                  if (muteBtn) {
                                      muteBtn.click();
                                      return 'mute-btn';
                                  }
                                  const mediaEls = Array.from(document.querySelectorAll('video, audio'));
                                  const active = mediaEls.find(el => !el.paused && !el.ended && el.readyState >= 2);
                                  if (active) {
                                      active.muted = !active.muted;
                                      return 'html5-mute';
                                  }
                                  return 'no-media-found';
                              } catch(e) {
                                  return 'mute-err: ' + e.toString();
                              }
                          })()
                      `;
                  } else if (commandName === 'exit-pip') {
                      script = `
                          (async () => {
                              try {
                                  if (document.pictureInPictureElement) {
                                      await document.exitPictureInPicture();
                                      return 'exited-pip';
                                  }
                                  return 'no-pip-active';
                              } catch(e) {
                                  return 'exit-pip-error: ' + e.toString();
                              }
                          })();
                      `;
                  } else if (commandName === 'toggle-pip' || commandName === 'pip') {
                      script = `
                          (async () => {
                              try {
                                  window.__qbrowse_last_media_cmd = Date.now();
                                  if (document.pictureInPictureElement) {
                                      await document.exitPictureInPicture();
                                      return 'exited-pip';
                                  }

                                  const isEligible = (v, allowPaused) => {
                                      if (!v || !v.isConnected || v.readyState < 2) return false;
                                      const vw = v.videoWidth || 0;
                                      const vh = v.videoHeight || 0;
                                      if (vw < 160 || vh < 90) return false;
                                      if (v.hidden) return false;
                                      const st = window.getComputedStyle ? window.getComputedStyle(v) : null;
                                      if (st && (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0)) return false;
                                      const rect = v.getBoundingClientRect ? v.getBoundingClientRect() : null;
                                      if (rect && rect.width <= 1 && rect.height <= 1) return false;
                                      const dur = v.duration;
                                      const finite = typeof dur === 'number' && Number.isFinite(dur) && dur > 0;
                                      if (finite && dur <= 3) return false;
                                      if (v.loop && finite && dur <= 15) return false;
                                      if (v.muted || (typeof v.volume === 'number' && v.volume <= 0)) return false;
                                      const ytC = v.closest ? v.closest('#movie_player, .html5-video-player') : null;
                                      if (ytC && typeof ytC.isMuted === 'function' && ytC.isMuted()) return false;
                                      if (!v.paused && !v.ended) return true;
                                      if (!allowPaused || v.ended || v.loop) return false;
                                      if (vw < 320 || vh < 180) return false;
                                      if (finite && dur <= 15) return false;
                                      return true;
                                  };

                                  const videoEls = Array.from(document.querySelectorAll('video'));
                                  const score = (v) => (v.videoWidth || 0) * (v.videoHeight || 0);
                                  const playingVids = videoEls.filter(v => isEligible(v, false)).sort((a, b) => score(b) - score(a));
                                  const activeVideo = playingVids[0] || videoEls.filter(v => isEligible(v, true)).sort((a, b) => score(b) - score(a))[0] || null;

                                  if (activeVideo) {
                                      activeVideo.removeAttribute('disablepictureinpicture');
                                      activeVideo.disablePictureInPicture = false;
                                      await activeVideo.requestPictureInPicture();
                                      return 'native-pip-success';
                                  }

                                  const isYt = /(^|\\.)youtube\\.com$/i.test(window.location.hostname || '');
                                  const ytPlayer = isYt ? document.querySelector('#movie_player') : null;
                                  if (ytPlayer && typeof ytPlayer.togglePictureInPicture === 'function') {
                                      ytPlayer.togglePictureInPicture();
                                      return 'yt-player-pip';
                                  }

                                  return 'no-eligible-video-found';
                              } catch(e) {
                                  return 'pip-error: ' + e.toString();
                              }
                          })();
                      `;
                  }

                  if (script) {
                      wv.executeJavaScript(script, true)
                          .then(res => console.log(`[QBrowse MediaControl] "${commandName}" result on webview #${index}:`, res))
                          .catch(err => {
                              console.warn(`[QBrowse MediaControl] executeJavaScript failed on webview #${index}, falling back to IPC:`, err);
                              if (typeof wv.send === 'function') {
                                  wv.send('media-control-command', cmdPayload);
                              }
                          });
                      return;
                  }
              }

              if (typeof wv.send === 'function') {
                  wv.send('media-control-command', cmdPayload);
              }
          } catch (e) {
              console.error(`[QBrowse MediaControl] Error sending command to webview #${index}:`, e);
          }
      });
      return true;
  },


  // Hover Preview
  hoverPreview: null,
  setHoverPreview: (preview) => set({ hoverPreview: preview }),

  // Passkey Prompt
  passkeyPrompt: null,
  setPasskeyPrompt: (prompt) => set({ passkeyPrompt: prompt }),

  // Site Permission Request Queue (Mic, Camera, Location, Notifications, etc.)
  permissionQueue: [],
  enqueuePermissionPrompt: (prompt) => set((state) => {
    if (!prompt || !prompt.requestId) return state;
    if ((state.permissionQueue || []).some(p => p.requestId === prompt.requestId)) {
      return state;
    }
    return { permissionQueue: [...(state.permissionQueue || []), prompt] };
  }),
  dismissPermissionPrompt: (requestId) => set((state) => {
    if (!requestId) return state;
    const next = (state.permissionQueue || []).filter(p => p.requestId !== requestId);
    if (next.length === (state.permissionQueue || []).length) return state;
    return { permissionQueue: next };
  }),
  clearPermissionPrompts: () => set({ permissionQueue: [] }),

  // Browser In-Tab Dialogs (Alerts, Confirms, Prompts, HTTP Auth)
  activeDialog: null,
  setActiveDialog: (dialog) => set({ activeDialog: dialog }),
  closeActiveDialog: () => set({ activeDialog: null }),
  // Bootup State
  isBooting: true,
  isFirstBoot: typeof window !== 'undefined' ? localStorage.getItem('qbrowse_first_boot_completed') !== 'true' : false,
  finishBoot: () => {
    const isFirst = localStorage.getItem('qbrowse_first_boot_completed') !== 'true';
    if (isFirst) {
      localStorage.setItem('qbrowse_first_boot_completed', 'true');
    }
    set({ isBooting: false, isFirstBoot: false });
  },
  completeFirstBoot: () => {
    localStorage.setItem('qbrowse_first_boot_completed', 'true');
    set({ isFirstBoot: false });
  },

  // Modals & Settings
  activeModal: null,
  isModalClosing: false,
  closingModal: null,
  openModal: (modal) => {
    if (globalModalCloseTimeout) {
      clearTimeout(globalModalCloseTimeout);
      globalModalCloseTimeout = null;
    }
    set({
      activeModal: modal,
      isModalClosing: false,
      closingModal: null,
      isRightPanelOpen: false,
      isTopBarOmniboxActive: false
    });
  },
  closeModal: () => {
    if (globalModalCloseTimeout) {
      clearTimeout(globalModalCloseTimeout);
      globalModalCloseTimeout = null;
    }
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ activeModal: null, closingModal: null, isModalClosing: false, onboardingStep: 0, tutorialStep: 0 });
      return;
    }
    const targetModal = get().activeModal;
    set({ isModalClosing: true, closingModal: targetModal });
    const tier = get().activePerformanceTier;
    const optimizeEcoVisuals = shouldOptimizeEcoVisuals(tier, get().reduceVisualsOnEco);
    const timeout = optimizeEcoVisuals ? 120 : (tier === 'ultra' ? 280 : 240);
    globalModalCloseTimeout = setTimeout(() => {
      globalModalCloseTimeout = null;
      const state = get();
      if (state.isModalClosing && state.closingModal === targetModal) {
        set({ activeModal: null, closingModal: null, isModalClosing: false, onboardingStep: 0, tutorialStep: 0 });
      }
    }, timeout);
  },
  switchModal: (newModal) => {
    if (globalModalCloseTimeout) {
      clearTimeout(globalModalCloseTimeout);
      globalModalCloseTimeout = null;
    }
    const current = get().activeModal;
    if (!current) {
      get().openModal(newModal);
      return;
    }
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      get().openModal(newModal);
      return;
    }
    set({ isModalClosing: true, closingModal: current });
    const tier = get().activePerformanceTier;
    const optimizeEcoVisuals = shouldOptimizeEcoVisuals(tier, get().reduceVisualsOnEco);
    const timeout = optimizeEcoVisuals ? 120 : (tier === 'ultra' ? 280 : 240);
    globalModalCloseTimeout = setTimeout(() => {
      globalModalCloseTimeout = null;
      set({
        activeModal: newModal,
        closingModal: null,
        isModalClosing: false,
        isRightPanelOpen: false,
        isTopBarOmniboxActive: false
      });
    }, timeout);
  },

  settingsTab: 'appearance',
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  helpLegalTab: 'help',
  setHelpLegalTab: (tab) => set({ helpLegalTab: tab || 'help' }),
  openHelpModal: (tab = 'help') => {
    set({ helpLegalTab: tab || 'help' });
    const current = get().activeModal;
    if (current && current !== 'help') {
      get().switchModal('help');
    } else {
      get().openModal('help');
    }
  },
  openSettings: (tab = 'appearance') => {
    if (globalModalCloseTimeout) {
      clearTimeout(globalModalCloseTimeout);
      globalModalCloseTimeout = null;
    }
    const targetTab = (tab === 'performance' || tab === 'perf') ? 'engine' : tab;
    set({ activeModal: 'settings', settingsTab: targetTab, isModalClosing: false, closingModal: null, isRightPanelOpen: false, isTopBarOmniboxActive: false });
  },

  // Read Aloud Floating Player
  isReadAloudOpen: false,
  isReadAloudClosing: false,
  openReadAloud: () => set({ isReadAloudOpen: true, isReadAloudClosing: false }),
  closeReadAloud: () => {
    const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
    if (isReduced) {
      set({ isReadAloudOpen: false, isReadAloudClosing: false });
      return;
    }
    set({ isReadAloudClosing: true });
    const tier = get().activePerformanceTier;
    const optimizeEcoVisuals = shouldOptimizeEcoVisuals(tier, get().reduceVisualsOnEco);
    const timeout = optimizeEcoVisuals ? 100 : (tier === 'ultra' ? 240 : 200);
    setTimeout(() => set({ isReadAloudOpen: false, isReadAloudClosing: false }), timeout);
  },
  toggleReadAloud: () => {
    if (get().isReadAloudOpen) {
      get().closeReadAloud();
    } else {
      get().openReadAloud();
    }
  },
  user: null,
  setUser: (user) => set({ user }),

  isForceDark: localStorage.getItem('qbrowse_isForceDark') === 'true',
  setIsForceDark: (val) => {
      const enabled = Boolean(val);
      set({ isForceDark: enabled });
      try {
          localStorage.setItem('qbrowse_isForceDark', String(enabled));
          localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
      } catch (_) {}
      if (typeof window !== 'undefined' && window.electronAPI) {
          if (window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting('isForceDark', enabled);
          }
          if (window.electronAPI.syncSmartDarkState) {
              window.electronAPI.syncSmartDarkState({
                  isForceDark: enabled,
                  darkExclusions: get().darkExclusions,
                  darkExcludeMedia: get().darkExcludeMedia
              });
          }
      }
  },
  darkExcludeMedia: localStorage.getItem('qbrowse_dark_exclude_media') !== 'false',
  setDarkExcludeMedia: (val) => {
      const enabled = Boolean(val);
      set({ darkExcludeMedia: enabled });
      try {
          localStorage.setItem('qbrowse_dark_exclude_media', String(enabled));
          localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
      } catch (_) {}
      if (typeof window !== 'undefined' && window.electronAPI) {
          if (window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting('darkExcludeMedia', enabled);
          }
          if (window.electronAPI.syncSmartDarkState) {
              window.electronAPI.syncSmartDarkState({
                  isForceDark: get().isForceDark,
                  darkExclusions: get().darkExclusions,
                  darkExcludeMedia: enabled
              });
          }
      }
  },

  // Custom Text Highlight Color & Style
  textHighlightStyle: localStorage.getItem('qbrowse_text_highlight_style') || 'tinted',
  textHighlightColor: localStorage.getItem('qbrowse_text_highlight_color') || 'accent',
  textHighlightApplyToWeb: localStorage.getItem('qbrowse_text_highlight_web') !== 'false',
  setTextHighlightStyle: (style) => {
      const valid = ['system', 'tinted', 'vibrant', 'glow', 'underline'].includes(style) ? style : 'tinted';
      set({ textHighlightStyle: valid });
      try {
          localStorage.setItem('qbrowse_text_highlight_style', valid);
          localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
      } catch (_) {}
      const state = get();
      applyTextHighlightToDocument({ style: valid, color: state.textHighlightColor, accentColor: state.accentColor });
      if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.saveSetting?.('textHighlightStyle', valid);
          window.electronAPI.syncTextHighlightState?.({
              style: valid,
              color: state.textHighlightColor,
              accentColor: state.accentColor,
              applyToWeb: state.textHighlightApplyToWeb
          });
      }
  },
  setTextHighlightColor: (color) => {
      const val = typeof color === 'string' && color.trim() ? color.trim() : 'accent';
      set({ textHighlightColor: val });
      try {
          localStorage.setItem('qbrowse_text_highlight_color', val);
          localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
      } catch (_) {}
      const state = get();
      applyTextHighlightToDocument({ style: state.textHighlightStyle, color: val, accentColor: state.accentColor });
      if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.saveSetting?.('textHighlightColor', val);
          window.electronAPI.syncTextHighlightState?.({
              style: state.textHighlightStyle,
              color: val,
              accentColor: state.accentColor,
              applyToWeb: state.textHighlightApplyToWeb
          });
      }
  },
  setTextHighlightApplyToWeb: (val) => {
      const enabled = Boolean(val);
      set({ textHighlightApplyToWeb: enabled });
      try {
          localStorage.setItem('qbrowse_text_highlight_web', String(enabled));
          localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
      } catch (_) {}
      const state = get();
      if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.saveSetting?.('textHighlightApplyToWeb', enabled);
          window.electronAPI.syncTextHighlightState?.({
              style: state.textHighlightStyle,
              color: state.textHighlightColor,
              accentColor: state.accentColor,
              applyToWeb: enabled
          });
      }
  },
  isAdblockActive: true,
  isAdblockEnabled: true,
  setIsAdblockActive: (val) => {
      const active = Boolean(val);
      set({ isAdblockActive: active, isAdblockEnabled: active });
      try {
          if (window.electronAPI?.setAdblock) window.electronAPI.setAdblock(active);
          if (window.electronAPI?.saveSetting) {
              window.electronAPI.saveSetting('adblockEnabled', active);
              window.electronAPI.saveSetting({ key: 'adblockEnabled', value: active });
          }
      } catch (_) {}
      try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('set-adblock', active);
      } catch(e) {}
  },
  setAdblockEnabled: (val) => {
      const active = Boolean(val);
      set({ isAdblockEnabled: active, isAdblockActive: active });
      try {
          if (window.electronAPI?.setAdblock) window.electronAPI.setAdblock(active);
          if (window.electronAPI?.saveSetting) {
              window.electronAPI.saveSetting('adblockEnabled', active);
              window.electronAPI.saveSetting({ key: 'adblockEnabled', value: active });
          }
      } catch (_) {}
      try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('set-adblock', active);
      } catch(e) {}
  },
  toggleAdblock: () => {
      const current = get().isAdblockEnabled ?? get().isAdblockActive ?? true;
      const nextVal = !current;
      set({ isAdblockEnabled: nextVal, isAdblockActive: nextVal });
      try {
          if (window.electronAPI?.setAdblock) window.electronAPI.setAdblock(nextVal);
          if (window.electronAPI?.saveSetting) {
              window.electronAPI.saveSetting('adblockEnabled', nextVal);
              window.electronAPI.saveSetting({ key: 'adblockEnabled', value: nextVal });
          }
      } catch (_) {}
      try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('set-adblock', nextVal);
      } catch(e) {}
  },
  
  adblockStats: (() => {
      try {
          const stored = localStorage.getItem('qbrowse_adblock_count');
          return { count: stored !== null ? Math.max(1, parseInt(stored, 10)) : 1, domains: [] };
      } catch (e) {
          return { count: 1, domains: [] };
      }
  })(),
  addBlockedTracker: (data) => set((state) => {
      try {
          const url = typeof data === 'string' ? data : (data?.url || '');
          const increment = typeof data === 'object' && typeof data?.count === 'number' ? data.count : 1;
          let newDomains = state.adblockStats.domains;
          if (url) {
              try {
                  const domain = new URL(url).hostname;
                  newDomains = [domain, ...state.adblockStats.domains.filter(d => d !== domain)].slice(0, 5);
              } catch (_) {}
          }
          const nextCount = (state.adblockStats.count || 0) + increment;
          if (!window.__debouncedSaveAdblockCount) {
              let t = null;
              window.__debouncedSaveAdblockCount = (cnt) => {
                  if (t) clearTimeout(t);
                  t = setTimeout(() => {
                      try { localStorage.setItem('qbrowse_adblock_count', String(cnt)); } catch (_) {}
                  }, 800);
              };
          }
          window.__debouncedSaveAdblockCount(nextCount);
          return {
              adblockStats: {
                  count: nextCount,
                  domains: newDomains
              }
          };
      } catch (e) { return state; }
  }),

  darkExclusions: (() => {
      try {
          const stored = localStorage.getItem('qbrowse_dark_exclusions');
          if (stored !== null) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                  return normalizeWhitelist(parsed);
              }
          }
      } catch (e) {}
      return getDefaultDarkExclusions();
  })(),
  setDarkExclusions: (exclusions) => {
      const normalized = normalizeWhitelist(exclusions);
      set({ darkExclusions: normalized });
      try {
          localStorage.setItem('qbrowse_dark_exclusions', JSON.stringify(normalized));
          localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
      } catch (_) {}
      if (typeof window !== 'undefined' && window.electronAPI) {
          if (window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting('darkExclusions', normalized);
          }
          if (window.electronAPI.syncSmartDarkState) {
              window.electronAPI.syncSmartDarkState({
                  isForceDark: get().isForceDark,
                  darkExclusions: normalized,
                  darkExcludeMedia: get().darkExcludeMedia
              });
          }
      }
      return normalized;
  },
  addDarkExclusion: (rawInput) => {
      const res = addWhitelistEntry(get().darkExclusions, rawInput);
      if (res.ok) {
          get().setDarkExclusions(res.list);
      }
      return res;
  },
  removeDarkExclusion: (target) => {
      const res = removeWhitelistEntry(get().darkExclusions, target);
      if (res.removed) {
          get().setDarkExclusions(res.list);
      }
      return res;
  },
  toggleDarkExclusionForUrl: (url) => {
      const res = toggleWhitelistForUrl(get().darkExclusions, url);
      if (res.ok) {
          get().setDarkExclusions(res.list);
      }
      return res;
  },
  resetDarkExclusions: () => {
      const defaults = getDefaultDarkExclusions();
      get().setDarkExclusions(defaults);
      return defaults;
  },
  clearDarkExclusions: () => {
      get().setDarkExclusions([]);
      return [];
  },

  // Safari-Style "Hide Distracting Items" (Element Eraser) State & Persistence
  isElementEraserActive: false,
  eraserSessionRules: {}, // { [tabId]: Array<{ selector, label, unlockScroll, createdAt }> } for Ghost/Tor ephemeral tabs
  eraserUndoStack: [], // Array<{ domain, tabId, selector, ephemeral }>
  hiddenElementsByDomain: (() => {
      try {
          const stored = localStorage.getItem('qbrowse_hidden_elements');
          if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  const clean = {};
                  for (const [d, rules] of Object.entries(parsed)) {
                      const arr = (Array.isArray(rules) ? rules : []).filter(r => r && !String(r.selector || '').includes('qbrowse-eraser'));
                      if (arr.length) clean[d] = arr;
                  }
                  return clean;
              }
          }
      } catch (_) {}
      return {};
  })(),
  toggleElementEraser: (forced) => {
      const next = typeof forced === 'boolean' ? forced : !get().isElementEraserActive;
      set({
          isElementEraserActive: next,
          ...(next ? { activePopover: null, isPopoverClosing: false, isTopBarOmniboxActive: false } : {})
      });
  },
  addHiddenElementRule: (domain, rule, options = {}) => {
      if (!rule || !rule.selector) return;
      const isEphemeral = Boolean(options.ephemeral || !domain);
      const tabId = options.tabId || null;
      const entry = {
          selector: rule.selector,
          label: rule.label || rule.selector,
          unlockScroll: Boolean(rule.unlockScroll),
          createdAt: Date.now()
      };

      if (isEphemeral && tabId) {
          const prevSession = get().eraserSessionRules || {};
          const existing = Array.isArray(prevSession[tabId]) ? prevSession[tabId] : [];
          if (existing.some(r => r.selector === entry.selector)) return;
          const nextSession = { ...prevSession, [tabId]: [...existing, entry] };
          set({
              eraserSessionRules: nextSession,
              eraserUndoStack: [...(get().eraserUndoStack || []), { domain: null, tabId, selector: entry.selector, ephemeral: true }]
          });
          return;
      }

      if (!domain) return;
      const cleanDomain = String(domain).replace(/^www\./i, '').toLowerCase();
      const prevMap = get().hiddenElementsByDomain || {};
      const existing = Array.isArray(prevMap[cleanDomain]) ? prevMap[cleanDomain] : [];
      if (existing.some(r => r.selector === entry.selector)) return;
      const nextMap = { ...prevMap, [cleanDomain]: [...existing, entry] };
      set({
          hiddenElementsByDomain: nextMap,
          eraserUndoStack: [...(get().eraserUndoStack || []), { domain: cleanDomain, tabId, selector: entry.selector, ephemeral: false }]
      });
      try {
          localStorage.setItem('qbrowse_hidden_elements', JSON.stringify(nextMap));
      } catch (_) {}
  },
  removeLastHiddenElementRule: (domain, options = {}) => {
      const isEphemeral = Boolean(options.ephemeral);
      const tabId = options.tabId || null;
      const undoStack = [...(get().eraserUndoStack || [])];

      if (isEphemeral && tabId) {
          const prevSession = get().eraserSessionRules || {};
          const list = Array.isArray(prevSession[tabId]) ? prevSession[tabId] : [];
          if (list.length === 0) return false;
          const nextList = list.slice(0, -1);
          const nextSession = { ...prevSession };
          if (nextList.length > 0) nextSession[tabId] = nextList;
          else delete nextSession[tabId];
          set({
              eraserSessionRules: nextSession,
              eraserUndoStack: undoStack.filter(u => !(u.ephemeral && u.tabId === tabId)).concat(
                  undoStack.filter(u => u.ephemeral && u.tabId === tabId).slice(0, -1)
              )
          });
          return true;
      }

      if (!domain) return false;
      const cleanDomain = String(domain).replace(/^www\./i, '').toLowerCase();
      const prevMap = get().hiddenElementsByDomain || {};
      const list = Array.isArray(prevMap[cleanDomain]) ? prevMap[cleanDomain] : [];
      if (list.length === 0) return false;
      const nextList = list.slice(0, -1);
      const nextMap = { ...prevMap };
      if (nextList.length > 0) nextMap[cleanDomain] = nextList;
      else delete nextMap[cleanDomain];
      set({
          hiddenElementsByDomain: nextMap,
          eraserUndoStack: undoStack.filter(u => !(!u.ephemeral && u.domain === cleanDomain)).concat(
              undoStack.filter(u => !u.ephemeral && u.domain === cleanDomain).slice(0, -1)
          )
      });
      try {
          localStorage.setItem('qbrowse_hidden_elements', JSON.stringify(nextMap));
      } catch (_) {}
      return true;
  },
  clearHiddenElementsForDomain: (domain, options = {}) => {
      const isEphemeral = Boolean(options.ephemeral);
      const tabId = options.tabId || null;

      if (isEphemeral && tabId) {
          const prevSession = get().eraserSessionRules || {};
          if (!prevSession[tabId]?.length) return;
          const nextSession = { ...prevSession };
          delete nextSession[tabId];
          set({
              eraserSessionRules: nextSession,
              eraserUndoStack: (get().eraserUndoStack || []).filter(u => !(u.ephemeral && u.tabId === tabId))
          });
          return;
      }

      if (!domain) return;
      const cleanDomain = String(domain).replace(/^www\./i, '').toLowerCase();
      const prevMap = get().hiddenElementsByDomain || {};
      if (!prevMap[cleanDomain]?.length) return;
      const nextMap = { ...prevMap };
      delete nextMap[cleanDomain];
      set({
          hiddenElementsByDomain: nextMap,
          eraserUndoStack: (get().eraserUndoStack || []).filter(u => !(!u.ephemeral && u.domain === cleanDomain))
      });
      try {
          localStorage.setItem('qbrowse_hidden_elements', JSON.stringify(nextMap));
      } catch (_) {}
  },
  
  settings: loadSettings(),
  initSettingsFromDisk: async () => {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getSettings) {
      try {
        const diskSettings = await window.electronAPI.getSettings();
        if (diskSettings && typeof diskSettings === 'object' && Object.keys(diskSettings).length > 0) {
          const localStored = localStorage.getItem('qbrowse_settings');
          let localParsed = null;
          try {
            if (localStored) localParsed = JSON.parse(localStored);
          } catch (_) {}

          // Disk settings provides resilient persistence if Local Storage was out of sync
          const merged = localParsed
            ? { ...defaultSettings, ...diskSettings, ...localParsed }
            : { ...defaultSettings, ...diskSettings };

          if (!Array.isArray(merged.customSpaces) || merged.customSpaces.length === 0) {
            merged.customSpaces = defaultSettings.customSpaces;
          }

          set({ settings: merged });
          try {
            applyAppFont(merged);
          } catch (_) {}
          try {
            localStorage.setItem('qbrowse_settings', JSON.stringify(merged));
          } catch (_) {}

          // Mirror top-level appearance settings if present in disk store (without clobbering newer localStorage values)
          const localTheme = localStorage.getItem('qbrowse_theme');
          if (!localTheme && diskSettings.theme && (diskSettings.theme === 'light' || diskSettings.theme === 'dark')) {
            get().setTheme(diskSettings.theme);
          }
          const localAccent = localStorage.getItem('qbrowse_accent_color');
          if (!localAccent && diskSettings.accentColor && typeof diskSettings.accentColor === 'string') {
            get().setAccentColor(diskSettings.accentColor);
          } else if (localAccent && localAccent.startsWith('#')) {
            merged.accentColor = localAccent;
            syncRootAccentCssVariables(localAccent, get().theme);
          }
          if (typeof diskSettings.isGlassEnabled === 'boolean') {
            get().setIsGlassEnabled(diskSettings.isGlassEnabled);
          }
          const localForceDark = localStorage.getItem('qbrowse_isForceDark');
          if (localForceDark === null && typeof diskSettings.isForceDark === 'boolean') {
            get().setIsForceDark(diskSettings.isForceDark);
          }
          const localDarkExclusions = localStorage.getItem('qbrowse_dark_exclusions');
          if (localDarkExclusions === null && Array.isArray(diskSettings.darkExclusions)) {
            get().setDarkExclusions(diskSettings.darkExclusions);
          }
          const localDarkExcludeMedia = localStorage.getItem('qbrowse_dark_exclude_media');
          if (localDarkExcludeMedia === null && typeof diskSettings.darkExcludeMedia === 'boolean') {
            get().setDarkExcludeMedia(diskSettings.darkExcludeMedia);
          }
          if (typeof diskSettings.isSwipeEnabled === 'boolean') {
            get().setIsSwipeEnabled(diskSettings.isSwipeEnabled);
          }
          if (typeof diskSettings.adblockEnabled === 'boolean') {
            set({ isAdblockEnabled: diskSettings.adblockEnabled, isAdblockActive: diskSettings.adblockEnabled });
            try {
              window.electronAPI?.setAdblock?.(diskSettings.adblockEnabled);
            } catch (_) {}
          }

          if (typeof merged.a11yPageZoom === 'number' && merged.a11yPageZoom >= 50 && merged.a11yPageZoom <= 200) {
            set({ zoomLevel: merged.a11yPageZoom });
          }

          // Ensure disk store has all current merged fields in a single batched IPC call
          if (window.electronAPI.saveSettingsBatch) {
            window.electronAPI.saveSettingsBatch({
              ...merged,
              isForceDark: get().isForceDark,
              darkExclusions: get().darkExclusions,
              darkExcludeMedia: get().darkExcludeMedia,
              accentColor: get().accentColor,
              theme: get().theme
            });
          } else if (window.electronAPI.saveSetting) {
            window.electronAPI.saveSetting({
              batch: {
                ...merged,
                isForceDark: get().isForceDark,
                darkExclusions: get().darkExclusions,
                darkExcludeMedia: get().darkExcludeMedia,
                accentColor: get().accentColor,
                theme: get().theme
              }
            });
          }
        }
      } catch (e) {
        console.warn('[useUIStore] initSettingsFromDisk notice:', e);
      }
    }
  },
  resetAllToFactoryDefaults: async () => {
    const cleanSettings = { ...defaultSettings };
    const defaultExclusions = getDefaultDarkExclusions();
    set({
      settings: cleanSettings,
      theme: 'dark',
      themeTransition: null,
      accentColor: '#d4bc94',
      accentRgb: '212, 188, 148',
      isGlassEnabled: true,
      isSwipeEnabled: true,
      isForceDark: false,
      darkExclusions: defaultExclusions,
      darkExcludeMedia: true,
      customPresets: [],
      activePresetId: 'balanced',
      zoomLevel: 1.0
    });

    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light', 'bright-mode');
    }

    try {
      localStorage.setItem('qbrowse_settings', JSON.stringify(cleanSettings));
      localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
      localStorage.setItem('qbrowse_theme', 'dark');
      localStorage.setItem('qbrowse_accent_color', '#d4bc94');
      localStorage.setItem('qbrowse_isGlassEnabled', 'true');
      localStorage.setItem('qbrowse_isSwipeEnabled', 'true');
      localStorage.setItem('qbrowse_isForceDark', 'false');
      localStorage.setItem('qbrowse_active_preset', 'balanced');
      localStorage.setItem('qbrowse_dark_exclusions', JSON.stringify(defaultExclusions));
      localStorage.setItem('qbrowse_dark_exclude_media', 'true');
      localStorage.removeItem('qbrowse_custom_presets');
      localStorage.removeItem('qbrowse_preset_overrides');
      localStorage.removeItem('qbrowse_custom_search_engines');
    } catch (_) {}

    try {
      if (get().resetCustomWallpaper) {
        await get().resetCustomWallpaper();
      }
      if (typeof window !== 'undefined' && window.electronAPI?.resetWallpaper) {
        await window.electronAPI.resetWallpaper().catch(() => {});
      }
    } catch (_) {}

    try {
      applyAppFont(cleanSettings);
      if (typeof document !== 'undefined') {
        const customFontEl = document.getElementById('qbrowse-custom-font');
        if (customFontEl) customFontEl.remove();
        const googleFontEl = document.getElementById('qbrowse-google-font');
        if (googleFontEl) googleFontEl.remove();
      }
    } catch (_) {}

    try {
      get().resetTopBarIcons?.();
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.setZoomLevel) {
        window.electronAPI.setZoomLevel(1.0);
      }
    } catch (_) {}

    try {
      const { applyExperiencePreset, EXPERIENCE_PRESETS } = await import('../utils/experiencePresets');
      applyExperiencePreset(EXPERIENCE_PRESETS[0], {
        uiStore: get(),
        tabStore: typeof window !== 'undefined' ? window.__tabStore?.getState?.() : null
      });
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.__tabStore) {
        window.__tabStore.getState()?.setActiveSpace?.('personal');
      }
    } catch (_) {}

    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.saveSettingsBatch) {
        window.electronAPI.saveSettingsBatch(cleanSettings);
      } else if (window.electronAPI.saveSetting) {
        window.electronAPI.saveSetting({ batch: cleanSettings });
      }
      if (window.electronAPI.saveSetting) {
        window.electronAPI.saveSetting('theme', 'dark');
        window.electronAPI.saveSetting('isGlassEnabled', true);
        window.electronAPI.saveSetting('isSwipeEnabled', true);
        window.electronAPI.saveSetting('isForceDark', false);
        window.electronAPI.saveSetting('darkExclusions', defaultExclusions);
        window.electronAPI.saveSetting('darkExcludeMedia', true);
      }
      if (window.electronAPI.syncSmartDarkState) {
        window.electronAPI.syncSmartDarkState({
          isForceDark: false,
          darkExclusions: defaultExclusions,
          darkExcludeMedia: true
        });
      }
      if (window.electronAPI.syncThemeSource) {
        window.electronAPI.syncThemeSource('dark');
      }
      if (window.electronAPI.syncPasskeySettings) {
        window.electronAPI.syncPasskeySettings({
          passkeyProviderMode: 'qvault',
          passkeyHardwareFallback: true
        });
      }
    }
  },
  resetAllSettings: function() {
    return this.resetAllToFactoryDefaults();
  },
  toggleSetting: (key) => {
      set((state) => {
          const newSettings = { ...state.settings, [key]: !state.settings[key] };
          try {
              localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
              localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
          } catch(e) {}
          
          if (['hardware', 'isolation'].includes(key)) {
              useUIStore.getState().showToast(tr('stores.ui.restartRequiredEngine', 'Restart required for engine changes.'));
          }
          if (key === 'restoreTabsOnStartup' && typeof window !== 'undefined' && window.__tabStore) {
              const profileId = window.__profileStore?.getState()?.activeProfileId || 'default';
              if (newSettings.restoreTabsOnStartup) {
                  window.__tabStore.getState().serializeCurrentProfileTabs?.(profileId);
              } else {
                  window.__tabStore.getState().clearPersistedProfileTabs?.(profileId);
              }
          }
          if (window.electronAPI && window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting(key, newSettings[key]);
          }
          if ((key === 'passkeyProviderMode' || key === 'passkeyHardwareFallback') && window.electronAPI?.syncPasskeySettings) {
              window.electronAPI.syncPasskeySettings({
                  passkeyProviderMode: newSettings.passkeyProviderMode || 'qvault',
                  passkeyHardwareFallback: newSettings.passkeyHardwareFallback !== false
              });
          }
          return { settings: newSettings };
      });
  },
  setSetting: (key, value) => get().setSettingValue(key, value),
  saveSetting: (key, value) => get().setSettingValue(key, value),
  setSettingValue: (key, value) => {
      if (key === 'accentColor' && typeof value === 'string') {
          get().setAccentColor(value);
          return;
      }
      if (key === 'theme' && (value === 'light' || value === 'dark')) {
          get().setTheme(value);
          return;
      }
      set((state) => {
          const newSettings = { ...state.settings, [key]: value };
          try {
              localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
              localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
          } catch(e) {}
          if (key === 'restoreTabsOnStartup' && typeof window !== 'undefined' && window.__tabStore) {
              const profileId = window.__profileStore?.getState()?.activeProfileId || 'default';
              if (value) {
                  window.__tabStore.getState().serializeCurrentProfileTabs?.(profileId);
              } else {
                  window.__tabStore.getState().clearPersistedProfileTabs?.(profileId);
              }
          }
          if (window.electronAPI && window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting(key, value);
          }
          if ((key === 'passkeyProviderMode' || key === 'passkeyHardwareFallback') && window.electronAPI?.syncPasskeySettings) {
              window.electronAPI.syncPasskeySettings({
                  passkeyProviderMode: newSettings.passkeyProviderMode || 'qvault',
                  passkeyHardwareFallback: newSettings.passkeyHardwareFallback !== false
              });
          }
          if (typeof key === 'string' && key.startsWith('appFont')) {
              try {
                  applyAppFont(newSettings);
              } catch (_) {}
          }
          return { settings: newSettings };
      });
  },
  setSettingsBatch: (partialSettings) => {
      if (!partialSettings || typeof partialSettings !== 'object') return;
      set((state) => {
          const newSettings = { ...state.settings, ...partialSettings };
          try {
              localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
              localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
          } catch(e) {}
          if (typeof window !== 'undefined' && window.electronAPI) {
              if (window.electronAPI.saveSettingsBatch) {
                  window.electronAPI.saveSettingsBatch(partialSettings);
              } else if (window.electronAPI.saveSetting) {
                  window.electronAPI.saveSetting({ batch: partialSettings });
              }
          }
          if (Object.keys(partialSettings).some(k => k.startsWith('appFont'))) {
              try {
                  applyAppFont(newSettings);
              } catch (_) {}
          }
          return { settings: newSettings };
      });
  },
  setAppFont: (config) => {
      const current = get().settings || {};
      const updates = {
          appFontType: config.appFontType || 'default',
          appFontFamily: config.appFontFamily || 'default',
          appFontGoogleFamily: config.appFontGoogleFamily !== undefined ? config.appFontGoogleFamily : (current.appFontGoogleFamily || ''),
          appFontCustomName: config.appFontCustomName !== undefined ? config.appFontCustomName : (current.appFontCustomName || ''),
          appFontLetterSpacing: config.appFontLetterSpacing || current.appFontLetterSpacing || 'normal',
          appFontSizeScale: typeof config.appFontSizeScale === 'number' ? config.appFontSizeScale : (current.appFontSizeScale ?? 100),
          appFontWeightShift: config.appFontWeightShift || current.appFontWeightShift || 'normal',
          appFontFileData: config.appFontFileData !== undefined ? config.appFontFileData : (current.appFontFileData || null),
          appFontFileName: config.appFontFileName !== undefined ? config.appFontFileName : (current.appFontFileName || '')
      };
      get().setSettingsBatch(updates);
      try {
          applyAppFont({ ...current, ...updates });
      } catch (_) {}
  },
  setAppFontLetterSpacing: (spacing) => {
      get().setSettingValue('appFontLetterSpacing', spacing);
  },
  setAppFontSizeScale: (scale) => {
      get().setSettingValue('appFontSizeScale', scale);
  },
  setAppFontWeightShift: (shift) => {
      get().setSettingValue('appFontWeightShift', shift);
  },
  resetAppFont: () => {
      get().setAppFont({
          appFontType: 'default',
          appFontFamily: 'default',
          appFontGoogleFamily: '',
          appFontCustomName: '',
          appFontLetterSpacing: 'normal',
          appFontSizeScale: 100,
          appFontWeightShift: 'normal',
          appFontFileData: null,
          appFontFileName: ''
      });
      get().showToast(tr('stores.ui.typographyReset', 'Typography reset to System Default'));
  },
  setAppLanguage: (langCode) => {
      get().setSettingValue('appLanguage', langCode);
  },
  setSidebarPosition: (pos) => {
      const opposite = pos === 'right' ? 'left' : 'right';
      get().setSettingsBatch({ sidebarPosition: pos, toolHubPosition: opposite });
  },
  setTopBarPosition: (pos) => get().setSettingValue('topBarPosition', pos),
  setToolHubPosition: (pos) => get().setSettingValue('toolHubPosition', pos),
  setGlassBlur: (blur) => {
      get().setSettingValue('glassBlur', blur);
      if (typeof document !== 'undefined') {
          const blurMap = { subtle: '14px', balanced: '24px', frosted: '40px', off: '0px' };
          document.documentElement.style.setProperty('--glass-blur', blurMap[blur] || '24px');
      }
  },
  addCustomBang: (bang) => {
      const customBangs = get().settings?.customBangs || [];
      const cleanPrefix = (bang.prefix || '').replace(/^[!@]/, '').trim().toLowerCase();
      if (!cleanPrefix || !bang.url) return;
      const cleanBang = {
          id: bang.id || `custom_${cleanPrefix}`,
          name: bang.name || cleanPrefix,
          prefix: cleanPrefix,
          url: bang.url,
          color: bang.color || '#d4bc94',
          bg: bang.bg || 'bg-accent/20 text-accent border-accent/30',
          category: 'Custom'
      };
      const exists = customBangs.some(b => b.prefix?.toLowerCase() === cleanPrefix);
      const updated = exists
          ? customBangs.map(b => b.prefix?.toLowerCase() === cleanPrefix ? { ...b, ...cleanBang } : b)
          : [...customBangs, cleanBang];
      get().setSettingValue('customBangs', updated);
  },
  removeCustomBang: (prefix) => {
      const customBangs = get().settings?.customBangs || [];
      const cleanPrefix = (prefix || '').replace(/^[!@]/, '').trim().toLowerCase();
      const updated = customBangs.filter(b => b.prefix?.toLowerCase() !== cleanPrefix);
      get().setSettingValue('customBangs', updated);
  },

  // Custom Search Engines Management
  addCustomSearchEngine: (engine) => {
      const customEngines = get().settings?.customSearchEngines || [];
      const cleanName = (engine.name || '').trim();
      const cleanKeyword = (engine.keyword || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const cleanUrl = (engine.url || '').trim();
      if (!cleanName || !cleanUrl) return;

      const newEngine = {
          id: engine.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: cleanName,
          keyword: cleanKeyword || cleanName.toLowerCase().replace(/\s+/g, ''),
          url: cleanUrl,
          suggestUrl: engine.suggestUrl ? engine.suggestUrl.trim() : null,
          color: engine.color || '#d4bc94',
          isCustom: true
      };

      const updated = [...customEngines, newEngine];
      get().setSettingValue('customSearchEngines', updated);
      return newEngine;
  },
  updateCustomSearchEngine: (id, updatedEngine) => {
      const customEngines = get().settings?.customSearchEngines || [];
      const updated = customEngines.map(e => {
          if (e.id === id) {
              return {
                  ...e,
                  ...updatedEngine,
                  id,
                  isCustom: true
              };
          }
          return e;
      });
      get().setSettingValue('customSearchEngines', updated);
  },
  removeCustomSearchEngine: (id) => {
      const customEngines = get().settings?.customSearchEngines || [];
      const currentDefault = get().settings?.searchEngine;
      const updated = customEngines.filter(e => e.id !== id);
      get().setSettingValue('customSearchEngines', updated);
      if (currentDefault === id) {
          get().setSettingValue('searchEngine', 'google');
      }
  },
  setDefaultSearchEngine: (id) => {
      get().setSettingValue('searchEngine', id);
  },

  // Dynamic Workspace / Custom Spaces Management
  addSpace: (name, icon = 'Layers', showGitHub = false) => {
      const currentSpaces = Array.isArray(get().settings?.customSpaces) && get().settings.customSpaces.length > 0
          ? get().settings.customSpaces
          : defaultSettings.customSpaces;
      if (currentSpaces.length >= 8) {
          get().showToast(tr('stores.ui.maxWorkspacesAllowed', 'Maximum of 8 workspaces allowed'), 'warning');
          return null;
      }

      const id = `space_${Date.now()}`;
      const cleanName = (typeof name === 'string' && name.trim()) ? name.trim() : tr('stores.ui.newSpaceDefault', 'New Space');
      const newSpace = {
          id,
          name: cleanName,
          icon: icon || 'Layers',
          showGitHub: !!showGitHub,
          isBuiltIn: false
      };
      const updated = [...currentSpaces, newSpace];
      get().saveSetting('customSpaces', updated);

      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      if (tabStore?.initSpaceTabs) {
          tabStore.initSpaceTabs(id);
      }
      get().showToast(tr('stores.ui.workspaceCreated', { name: cleanName }, `Workspace "${cleanName}" created`));
      return newSpace;
  },

  updateSpace: (id, updates) => {
      const currentSpaces = Array.isArray(get().settings?.customSpaces) && get().settings.customSpaces.length > 0
          ? get().settings.customSpaces
          : defaultSettings.customSpaces;
      const updated = currentSpaces.map(s => s.id === id ? { ...s, ...updates, id } : s);
      get().saveSetting('customSpaces', updated);
      get().showToast(tr('stores.ui.workspaceUpdated', 'Workspace updated'));
  },

  removeSpace: (id) => {
      if (id === 'personal') return;

      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      if (tabStore?.migrateSpaceTabsToPersonal) {
          tabStore.migrateSpaceTabsToPersonal(id);
      }
      if (tabStore?.activeSpace === id) {
          tabStore.setActiveSpace('personal');
      }

      const currentSpaces = Array.isArray(get().settings?.customSpaces) && get().settings.customSpaces.length > 0
          ? get().settings.customSpaces
          : defaultSettings.customSpaces;
      const updated = currentSpaces.filter(s => s.id !== id);
      get().saveSetting('customSpaces', updated);

      try {
          const profileId = (() => {
              try {
                  return (typeof window !== 'undefined' && window.__profileStore?.getState()?.activeProfileId) || 
                      localStorage.getItem('qbrowse_active_profile_id') || 'default';
              } catch (_) {
                  return 'default';
              }
          })();
          localStorage.removeItem(`qbrowse_tabs_${profileId}_${id}`);
      } catch (_) {}

      get().showToast(tr('stores.ui.workspaceRemoved', 'Workspace removed. Open tabs moved to Personal.'));
  },

  reorderSpaces: (arg1, arg2) => {
      if (Array.isArray(arg1)) {
          get().saveSetting('customSpaces', arg1);
          return;
      }
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
          const fromIdx = arg1;
          const toIdx = arg2;
          const currentSpaces = Array.isArray(get().settings?.customSpaces) && get().settings.customSpaces.length > 0
              ? get().settings.customSpaces
              : defaultSettings.customSpaces;
          if (fromIdx < 0 || fromIdx >= currentSpaces.length || toIdx < 0 || toIdx >= currentSpaces.length) return;
          if (fromIdx === toIdx) return;
          const next = [...currentSpaces];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          get().saveSetting('customSpaces', next);
      }
  },

  // Experience Presets & Custom Preset Studio Management
  customPresets: loadCustomPresets(),
  activePresetId: getSavedPresetId(),
  presetStudioInitialId: null,

  setPresetStudioInitialId: (id) => set({ presetStudioInitialId: id }),

  openPresetStudio: (presetId = null) => {
      set({ 
          presetStudioInitialId: presetId, 
          activeModal: 'presetStudio', 
          closingModal: null, 
          isModalClosing: false, 
          isRightPanelOpen: false, 
          isTopBarOmniboxActive: false 
      });
  },

  setActivePresetId: (id) => {
      set({ activePresetId: id });
      setSavedPresetId(id);
  },

  getAllPresets: () => {
      return [...EXPERIENCE_PRESETS, ...(get().customPresets || [])];
  },

  saveCustomPreset: (newPreset) => {
      if (!newPreset) return null;
      const id = newPreset.id || `custom_${Date.now()}`;
      const preset = {
          ...newPreset,
          id,
          isCustom: true,
          isBuiltIn: false,
          badge: 'Custom',
          createdAt: newPreset.createdAt || Date.now()
      };
      const current = get().customPresets || [];
      const existingIndex = current.findIndex(p => p.id === id);
      let updated;
      if (existingIndex >= 0) {
          updated = [...current];
          updated[existingIndex] = preset;
      } else {
          updated = [...current, preset];
      }
      set({ customPresets: updated, activePresetId: id });
      saveCustomPresetsToStorage(updated);
      setSavedPresetId(id);
      get().showToast(tr('stores.ui.presetSaved', { name: preset.name }, `Preset "${preset.name}" saved!`));
      return preset;
  },

  updateCustomPreset: (presetId, updates) => {
      const current = get().customPresets || [];
      const index = current.findIndex(p => p.id === presetId);
      if (index === -1) {
          get().showToast(tr('stores.ui.presetNotFoundUpdate', 'Preset not found to update'), 'warning');
          return null;
      }
      const updatedPreset = {
          ...current[index],
          ...updates,
          id: presetId,
          isCustom: true,
          badge: 'Custom'
      };
      const updated = [...current];
      updated[index] = updatedPreset;
      set({ customPresets: updated });
      saveCustomPresetsToStorage(updated);
      get().showToast(tr('stores.ui.presetUpdated', { name: updatedPreset.name }, `Preset "${updatedPreset.name}" updated!`));
      return updatedPreset;
  },

  deleteCustomPreset: (presetId) => {
      const current = get().customPresets || [];
      const target = current.find(p => p.id === presetId);
      if (!target) return;
      const updated = current.filter(p => p.id !== presetId);
      const updates = { customPresets: updated };
      if (get().activePresetId === presetId) {
          updates.activePresetId = 'balanced';
          setSavedPresetId('balanced');
      }
      if (get().presetStudioInitialId === presetId) {
          updates.presetStudioInitialId = null;
      }
      set(updates);
      saveCustomPresetsToStorage(updated);
      get().showToast(tr('stores.ui.presetDeleted', { name: target.name }, `Preset "${target.name}" deleted`));
  },

  duplicatePreset: (presetId) => {
      const all = get().getAllPresets();
      const source = all.find(p => p.id === presetId);
      if (!source) {
          get().showToast(tr('stores.ui.presetNotFoundDuplicate', 'Preset not found to duplicate'), 'warning');
          return null;
      }
      const newId = `custom_${Date.now()}`;
      const clone = {
          ...source,
          id: newId,
          name: tr('stores.ui.presetCopySuffix', { name: source.name }, `${source.name} (Copy)`),
          badge: 'Custom',
          isCustom: true,
          isBuiltIn: false,
          createdAt: Date.now()
      };
      const currentCustom = get().customPresets || [];
      const updated = [...currentCustom, clone];
      set({ customPresets: updated });
      saveCustomPresetsToStorage(updated);
      get().showToast(tr('stores.ui.presetDuplicated', { name: source.name }, `Duplicated "${source.name}"`));
      return clone;
  },

  captureCurrentAsPreset: (name = tr('stores.ui.customPresetDefault', 'Custom Preset'), description = '', icon = 'Sparkles') => {
      const s = get().settings || defaultSettings;
      const theme = get().theme || 'dark';
      const accentColor = get().accentColor || '#d4bc94';
      const accentRgb = hexToRgbString(accentColor);
      const isAdblockActive = get().isAdblockActive !== undefined ? get().isAdblockActive : true;
      const id = `custom_${Date.now()}`;

      const spaces = Array.isArray(s.customSpaces) && s.customSpaces.length > 0
          ? s.customSpaces
          : defaultSettings.customSpaces;

      const sidebarPos = s.sidebarPosition || 'left';
      const topBarPos = s.topBarPosition || 'top';
      const toolHubPos = s.toolHubPosition || (sidebarPos === 'left' ? 'right' : 'left');

      const layoutTag = `${topBarPos === 'bottom' ? 'Bottom Bar' : 'Top Bar'} · ${sidebarPos === 'right' ? 'Right Sidebar' : 'Left Sidebar'}`;
      const layoutSummary = `${topBarPos === 'bottom' ? 'Bottom Bar' : 'Top Bar'} · ${sidebarPos === 'right' ? 'Right Sidebar' : 'Left Sidebar'} · ${toolHubPos === 'left' ? 'Left ToolHub' : 'Right ToolHub'}`;
      const spacesSummary = spaces.map(sp => sp.name).join(' · ');

      const preset = {
          id,
          name: (name || 'Custom Preset').trim(),
          tagline: (description || 'Custom configured layout and browser environment').trim(),
          spacesSummary,
          badge: 'Custom',
          icon: icon || 'Sparkles',
          theme,
          accentColor,
          accentRgb,
          accentName: 'Custom Accent',
          searchEngine: s.searchEngine || 'google',
          searchEngineName: s.searchEngine === 'duckduckgo' ? 'DuckDuckGo' : s.searchEngine === 'brave' ? 'Brave' : 'Google',
          uiScale: s.uiScale || 'comfortable',
          sidebarPosition: sidebarPos,
          topBarPosition: topBarPos,
          toolHubPosition: toolHubPos,
          omniboxStyle: s.omniboxStyle || 'capsule',
          frameCurvature: s.frameCurvature || 'default',
          tabPresentation: s.tabPresentation || 'pills',
          windowControlsStyle: s.windowControlsStyle || 'mac',
          windowControlsOrder: s.windowControlsOrder || 'auto',
          layoutTag,
          layoutSummary,
          isAdblockActive,
          adblockLevel: s.adblockLevel || 'standard',
          customSpaces: spaces,
          appFontType: s.appFontType || 'default',
          appFontFamily: s.appFontFamily || 'default',
          appFontGoogleFamily: s.appFontGoogleFamily || '',
          appFontCustomName: s.appFontCustomName || '',
          appFontLetterSpacing: s.appFontLetterSpacing || 'normal',
          appFontSizeScale: s.appFontSizeScale ?? 100,
          appFontWeightShift: s.appFontWeightShift || 'normal',
          highlights: [
              layoutTag,
              `${spaces.length} Workspace${spaces.length > 1 ? 's' : ''}`,
              s.uiScale === 'compact' ? 'Compact UI' : 'Comfortable UI'
          ],
          isCustom: true,
          createdAt: Date.now()
      };
      return preset;
  },

  // Secure DNS & Host Resolver Configuration
  setDnsConfiguration: async ({ provider, mode, customUrl }) => {
      const current = get().settings || {};
      const newDoh = provider !== undefined ? provider : (current.doh || 'cloudflare');
      const newMode = mode !== undefined ? mode : (current.dohMode || 'automatic');
      const newCustomUrl = customUrl !== undefined ? customUrl : (current.customDohUrl || '');

      get().setSettingValue('doh', newDoh);
      get().setSettingValue('dohMode', newMode);
      get().setSettingValue('customDohUrl', newCustomUrl);

      if (window.electronAPI?.setDoh) {
          try {
              await window.electronAPI.setDoh({
                  provider: newDoh,
                  mode: newMode,
                  customUrl: newCustomUrl
              });
          } catch (e) {
              console.warn('[Store] Failed to apply DNS config via IPC:', e);
          }
      }
  },

  // Custom Wallpaper & Background
  setCustomWallpaper: (url, source = 'url', originalUrl = null) => {
      set((state) => {
          const newSettings = {
              ...state.settings,
              customWallpaper: url,
              customWallpaperSource: source,
              customWallpaperOriginalUrl: originalUrl || (source === 'url' ? url : null)
          };
          try {
              localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
              localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
          } catch(e) {}
          if (window.electronAPI && window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting('customWallpaper', url);
              window.electronAPI.saveSetting('customWallpaperSource', source);
              window.electronAPI.saveSetting('customWallpaperOriginalUrl', originalUrl || (source === 'url' ? url : null));
          }
          return { settings: newSettings };
      });
  },
  setWallpaperDimming: (dimming) => {
      const raw = Math.max(0, Math.min(80, Number(dimming) || 0));
      const val = Math.round(raw / 5) * 5;
      get().setSettingValue('wallpaperDimming', val);
  },
  setWallpaperBlur: (blur) => {
      const raw = Math.max(0, Math.min(48, Number(blur) ?? 24));
      const val = Math.round(raw);
      get().setSettingValue('wallpaperBlur', val);
      if (typeof document !== 'undefined') {
          const root = document.documentElement;
          if (!root.classList.contains('eco-mode')) {
              root.style.setProperty('--glass-blur', `${val}px`);
          }
      }
  },
  setBlurWallpaper: (enabled) => {
      get().setSettingValue('blurWallpaper', Boolean(enabled));
  },
  setWallpaperVideoLoopMode: (mode) => {
      get().setSettingValue('wallpaperVideoLoopMode', mode);
  },
  setWallpaperVideoCrossfadeDuration: (dur) => {
      const raw = Math.max(0.4, Math.min(2.5, Number(dur) || 1.2));
      const val = Math.round(raw * 10) / 10;
      get().setSettingValue('wallpaperVideoCrossfadeDuration', val);
  },
  resetCustomWallpaper: async () => {
      if (window.electronAPI && window.electronAPI.resetWallpaper) {
          await window.electronAPI.resetWallpaper().catch(() => {});
      }
      set((state) => {
          const newSettings = {
              ...state.settings,
              customWallpaper: null,
              customWallpaperSource: 'default',
              customWallpaperOriginalUrl: null
          };
          try {
              localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
              localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
          } catch(e) {}
          if (window.electronAPI && window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting('customWallpaper', null);
              window.electronAPI.saveSetting('customWallpaperSource', 'default');
              window.electronAPI.saveSetting('customWallpaperOriginalUrl', null);
          }
          return { settings: newSettings };
      });
  },
  loadStoredWallpaper: async () => {
      if (window.electronAPI && window.electronAPI.getActiveWallpaper) {
          try {
              const res = await window.electronAPI.getActiveWallpaper();
              if (res && res.exists && res.url) {
                  const current = get().settings?.customWallpaper;
                  if (current !== res.url) {
                      set((state) => ({
                          settings: {
                              ...state.settings,
                              customWallpaper: res.url
                          }
                      }));
                  }
              } else if (res && !res.exists) {
                  const current = get().settings?.customWallpaper;
                  if (current && current.startsWith('qbrowse-media://')) {
                      set((state) => ({
                          settings: {
                              ...state.settings,
                              customWallpaper: null,
                              customWallpaperSource: null,
                              customWallpaperOriginalUrl: null
                          }
                      }));
                  }
              }
          } catch (e) {
              console.warn('[UIStore] Error checking stored wallpaper:', e);
          }
      }
  },

  zoomLevel: 100,
  isZoomHUDVisible: false,
  setZoomLevel: (val) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(val)));
    const prev = get().zoomLevel;
    if (prev === clamped && get().isZoomHUDVisible) {
      if (globalZoomTimeout) clearTimeout(globalZoomTimeout);
      globalZoomTimeout = setTimeout(() => {
        set({ isZoomHUDVisible: false });
      }, 1800);
      return;
    }
    set({ zoomLevel: clamped, isZoomHUDVisible: true });
    if (globalZoomTimeout) clearTimeout(globalZoomTimeout);
    globalZoomTimeout = setTimeout(() => {
      set({ isZoomHUDVisible: false });
    }, 1800);
  },
  zoomIn: () => {
    const current = get().zoomLevel;
    const next = getNextZoomStep(current, 1);
    get().setZoomLevel(next);
  },
  zoomOut: () => {
    const current = get().zoomLevel;
    const next = getNextZoomStep(current, -1);
    get().setZoomLevel(next);
  },
  resetZoom: () => {
    get().setZoomLevel(DEFAULT_ZOOM);
  },
  hideZoomHUD: () => {
    if (globalZoomTimeout) clearTimeout(globalZoomTimeout);
    set({ isZoomHUDVisible: false });
  },

  canvasZoomLevel: 100,
  isCanvasZoomHUDVisible: false,
  showCanvasZoomHUD: (pct) => {
    const validPct = typeof pct === 'number' ? pct : 100;
    set({ canvasZoomLevel: validPct, isCanvasZoomHUDVisible: true });
    if (globalCanvasZoomTimeout) clearTimeout(globalCanvasZoomTimeout);
    globalCanvasZoomTimeout = setTimeout(() => {
      set({ isCanvasZoomHUDVisible: false });
    }, 1200);
  },
  hideCanvasZoomHUD: () => {
    if (globalCanvasZoomTimeout) clearTimeout(globalCanvasZoomTimeout);
    set({ isCanvasZoomHUDVisible: false });
  },
  isGlassEnabled: (() => {
    try {
      const stored = localStorage.getItem('qbrowse_isGlassEnabled');
      if (stored !== null) return JSON.parse(stored);
    } catch (_) {}
    return true;
  })(),
  setIsGlassEnabled: (val) => {
    set({ isGlassEnabled: val });
    try {
      localStorage.setItem('qbrowse_isGlassEnabled', JSON.stringify(val));
    } catch (_) {}
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveSetting) {
      window.electronAPI.saveSetting('isGlassEnabled', val);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('no-glass', !val);
    }
  },
  isSwipeEnabled: (() => {
    try {
      const stored = localStorage.getItem('qbrowse_isSwipeEnabled');
      if (stored !== null) return JSON.parse(stored);
    } catch (_) {}
    return true;
  })(),
  setIsSwipeEnabled: (val) => {
    set({ isSwipeEnabled: val });
    try {
      localStorage.setItem('qbrowse_isSwipeEnabled', JSON.stringify(val));
    } catch (_) {}
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveSetting) {
      window.electronAPI.saveSetting('isSwipeEnabled', val);
    }
  },
  // Webview Fullscreen
  isWebviewFullscreen: false,
  setIsWebviewFullscreen: (val) => set({ isWebviewFullscreen: val }),

  // Theme & Appearance
  theme: localStorage.getItem('qbrowse_theme') || 'dark', // 'dark' | 'light'
  themeTransition: null, // { from: 'dark', to: 'light' } or null
  setTheme: (theme) => {
      const validTheme = theme === 'light' ? 'light' : 'dark';
      const currentTheme = get().theme;
      if (currentTheme === validTheme) return;
      
      try {
          localStorage.setItem('qbrowse_theme', validTheme);
          if (typeof document !== 'undefined') {
              if (validTheme === 'light') {
                  document.documentElement.classList.add('theme-light', 'bright-mode');
                  document.documentElement.classList.remove('theme-dark');
              } else {
                  document.documentElement.classList.add('theme-dark');
                  document.documentElement.classList.remove('theme-light', 'bright-mode');
              }
          }
      } catch(e) {}
      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveSetting) {
          window.electronAPI.saveSetting('theme', validTheme);
      }
      if (typeof window !== 'undefined' && window.electronAPI?.syncThemeSource) {
          window.electronAPI.syncThemeSource(validTheme);
      }

      const isReduced = Boolean(get().settings?.a11yReducedMotion || get().isSystemReducedMotion);
      if (isReduced) {
          set({ 
              theme: validTheme,
              themeTransition: null
          });
          return;
      }

      // Trigger GPU compositor veil crossfade
      set({ 
          theme: validTheme,
          themeTransition: { from: currentTheme, to: validTheme }
      });

      // Clear veil after animation finishes
      setTimeout(() => {
          set({ themeTransition: null });
      }, 340);
  },
  toggleTheme: () => {
      const next = get().theme === 'light' ? 'dark' : 'light';
      get().setTheme(next);
  },
  accentColor: (() => {
      try {
          const stored = localStorage.getItem('qbrowse_accent_color');
          if (stored && stored.startsWith('#')) return stored;
      } catch (_) {}
      return '#d4bc94';
  })(),
  accentRgb: (() => {
      try {
          const stored = localStorage.getItem('qbrowse_accent_color');
          if (stored && stored.startsWith('#')) return hexToRgbString(stored);
      } catch (_) {}
      return '212, 188, 148';
  })(),
  setAccentColor: (color) => {
      if (!color || typeof color !== 'string') return;
      const validColor = color.startsWith('#') ? color : `#${color}`;
      const rgb = hexToRgbString(validColor);
      set((state) => {
          const newSettings = { ...(state.settings || {}), accentColor: validColor };
          try {
              localStorage.setItem('qbrowse_accent_color', validColor);
              localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
              localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
          } catch (_) {}
          return {
              accentColor: validColor,
              accentRgb: rgb,
              settings: newSettings
          };
      });
      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(validColor)) {
          syncRootAccentCssVariables(validColor, get().theme);
          const st = get();
          applyTextHighlightToDocument({ style: st.textHighlightStyle, color: st.textHighlightColor, accentColor: validColor });
          if (typeof window !== 'undefined' && window.electronAPI?.syncTextHighlightState) {
              window.electronAPI.syncTextHighlightState({
                  style: st.textHighlightStyle,
                  color: st.textHighlightColor,
                  accentColor: validColor,
                  applyToWeb: st.textHighlightApplyToWeb
              });
          }
      }
      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveSetting) {
          window.electronAPI.saveSetting('accentColor', validColor);
      }
      try {
          const profileStore = window.__profileStore?.getState();
          if (profileStore && profileStore.activeProfileId && profileStore.updateProfile) {
              const activeProfile = profileStore.getActiveProfile?.();
              if (activeProfile && activeProfile.color !== validColor) {
                  profileStore.updateProfile(profileStore.activeProfileId, { color: validColor, silent: true });
              }
          }
      } catch (_) {}
  },

  // Onboarding & Tutorial
  setupComplete: localStorage.getItem('qbrowse_setup_complete') === 'true',
  setSetupComplete: (val) => {
      set({ setupComplete: val });
      localStorage.setItem('qbrowse_setup_complete', val ? 'true' : 'false');
  },
  tutorialDone: localStorage.getItem('qbrowse_tutorial_done') === 'true',
  setTutorialDone: (val) => {
      set({ tutorialDone: val });
      localStorage.setItem('qbrowse_tutorial_done', val ? 'true' : 'false');
  },
  onboardingStep: 0,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  tutorialStep: 0,
  setTutorialStep: (step) => set({ tutorialStep: step }),
  obUsername: '',
  setObUsername: (val) => set({ obUsername: val }),
  obPassword: '',
  setObPassword: (val) => set({ obPassword: val }),

  // Tab Switcher Overlay
  showSwitcher: false,
  showSwitcherUI: false,
  switcherIndex: 0,
  switcherTabs: [],
  switcherStartTime: 0,
  switcherOriginalTab: null,
  setShowSwitcher: (val) => set({ showSwitcher: val, showSwitcherUI: val }),
  setSwitcherIndex: (idx) => set({ switcherIndex: idx }),
  setSwitcherTabs: (tabs) => set({ switcherTabs: tabs }),
  openSwitcher: (direction = 1) => {
    const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
    if (!tabStore) return;
    const rawList = tabStore.getActiveList ? tabStore.getActiveList() : [];
    const list = (rawList || []).filter(t => !t.isClosing);
    if (!list || list.length <= 1) return;

    const uiState = get();
    const settings = uiState.settings || {};
    const isVisual = settings.visualTabSwitcher !== false;
    const order = settings.tabSwitcherOrder || 'mru';
    const activeSpace = tabStore.activeSpace;

    // Build switcher entries collapsing ALL active & parked Split Groups in activeSpace into 1 unified entry each
    const byId = new Map(list.map(t => [t.id, t]));
    const validIds = new Set(list.map(t => t.id));
    const groupMemberIds = new Set();
    const groupEntryByPrimaryId = new Map();

    let groupNumCounter = 0;
    const registerGroup = ({ splitGroupId, customName, primaryId, secondaryIds, orientation, isGroupActive }) => {
      const members = [byId.get(primaryId), ...secondaryIds.map(id => byId.get(id))].filter(Boolean);
      if (members.length < 2) return;
      if (members.some(m => groupMemberIds.has(m.id))) return;
      groupNumCounter += 1;
      const resolvedOrient = orientation || 'horizontal';
      const defaultGroupLabel = `${resolvedOrient === 'quad' ? 'Quad Split' : 'Split Group'} ${groupNumCounter}`;
      members.forEach(m => groupMemberIds.add(m.id));
      groupEntryByPrimaryId.set(members[0].id, {
        ...members[0],
        id: `split-group:${splitGroupId}:${members[0].id}`,
        splitGroupId,
        splitGroupName: customName || defaultGroupLabel,
        targetTabId: members[0].id,
        isSplitGroupEntry: true,
        splitOrientation: resolvedOrient,
        splitMemberTabs: members,
        title: members.map(t => t.title || 'Tab').join('  |  '),
        lastActiveAt: Math.max(...members.map(t => t.lastActiveAt || 0)),
        active: isGroupActive
      });
    };

    if (uiState.isSplitView) {
      const sec = (uiState.splitPaneTabIds || [uiState.splitRightTabId || null, null, null]).filter(id => id && validIds.has(id));
      if (sec.length > 0) {
        const secSet = new Set(sec);
        const pTab = list.find(t => t.active && !secSet.has(t.id)) || list.find(t => !secSet.has(t.id));
        if (pTab) {
          registerGroup({
            splitGroupId: uiState.activeSplitGroupId || 'active',
            customName: uiState.activeSplitGroupName || '',
            primaryId: pTab.id,
            secondaryIds: sec,
            orientation: uiState.splitOrientation || 'horizontal',
            isGroupActive: true
          });
        }
      }
    }

    for (const pg of (uiState.parkedSplitGroups || [])) {
      if (!pg || pg.space !== activeSpace) continue;
      const sec = (pg.paneTabIds || []).filter(id => id && validIds.has(id));
      if (pg.primaryTabId && validIds.has(pg.primaryTabId) && sec.length > 0) {
        registerGroup({
          splitGroupId: pg.id,
          customName: pg.name || '',
          primaryId: pg.primaryTabId,
          secondaryIds: sec,
          orientation: pg.orientation || 'horizontal',
          isGroupActive: false
        });
      }
    }

    const entries = [];
    for (const t of list) {
      if (groupMemberIds.has(t.id)) {
        const groupEntry = groupEntryByPrimaryId.get(t.id);
        if (groupEntry) {
          entries.push(groupEntry);
        }
      } else {
        entries.push(t);
      }
    }

    if (entries.length <= 1) return;

    const activeIndex = entries.findIndex(e => e.active);
    const activeEntry = activeIndex !== -1 ? entries[activeIndex] : entries[0];

    let orderedTabs = [];
    let initialIndex = 0;

    if (order === 'sidebar') {
      orderedTabs = [...entries];
      const curIdx = activeIndex !== -1 ? activeIndex : 0;
      initialIndex = (curIdx + direction + orderedTabs.length) % orderedTabs.length;
    } else {
      const otherTabs = entries.filter(e => e.id !== activeEntry.id).sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
      orderedTabs = [activeEntry, ...otherTabs];
      initialIndex = direction === -1 ? orderedTabs.length - 1 : 1;
    }

    const targetEntry = orderedTabs[initialIndex];

    const activateSwitcherEntry = (entry) => {
      if (!entry) return;
      const ui = useUIStore.getState();
      if (entry.isSplitGroupEntry) {
        if (!ui.isSplitView || ui.activeSplitGroupId !== entry.splitGroupId) {
          ui.restoreParkedSplitGroup(entry.splitGroupId, 0, { instant: true });
        }
        const focusId = entry.targetTabId || entry.splitMemberTabs?.[0]?.id;
        setTimeout(() => {
          const wv = focusId ? document.getElementById(`webview-${focusId}`) : null;
          if (wv && typeof wv.focus === 'function') {
            try { wv.focus(); } catch (_) {}
          }
        }, 25);
      } else {
        if (ui.isSplitView) {
          ui.parkOrCloseSplitViewForTabSwitch({ instant: true });
        }
        tabStore.handleSwitchToTab(entry.id, tabStore.activeSpace);
        ui.setCurrentUrl(entry.url || '');
        setTimeout(() => {
          const wv = document.getElementById(`webview-${entry.id}`);
          if (wv && typeof wv.focus === 'function') {
            try { wv.focus(); } catch (_) {}
          }
        }, 25);
      }
    };

    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }

    if (!isVisual) {
      activateSwitcherEntry(targetEntry);
      set({
        showSwitcher: true,
        showSwitcherUI: false,
        switcherStartTime: Date.now(),
        switcherTabs: orderedTabs,
        switcherIndex: initialIndex,
        switcherOriginalTab: activeEntry
      });
      return;
    }

    window.__switcherTimer = setTimeout(() => {
      set({ showSwitcherUI: true });
    }, 150);

    set({
      showSwitcher: true,
      showSwitcherUI: false,
      switcherStartTime: Date.now(),
      switcherTabs: orderedTabs,
      switcherIndex: initialIndex,
      switcherOriginalTab: activeEntry
    });
  },
  cycleSwitcher: (direction = 1) => {
    const state = useUIStore.getState();
    if (!state.showSwitcher) {
      useUIStore.getState().openSwitcher(direction);
      return;
    }
    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }
    const len = state.switcherTabs ? state.switcherTabs.length : 0;
    if (len === 0) return;
    const nextIdx = (state.switcherIndex + direction + len) % len;
    const isVisual = state.settings?.visualTabSwitcher !== false;

    if (!isVisual) {
      const targetEntry = state.switcherTabs[nextIdx];
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      if (targetEntry && tabStore) {
        const ui = useUIStore.getState();
        if (targetEntry.isSplitGroupEntry) {
          if (!ui.isSplitView || ui.activeSplitGroupId !== targetEntry.splitGroupId) {
            ui.restoreParkedSplitGroup(targetEntry.splitGroupId, 0, { instant: true });
          }
          const focusId = targetEntry.targetTabId || targetEntry.splitMemberTabs?.[0]?.id;
          setTimeout(() => {
            const wv = focusId ? document.getElementById(`webview-${focusId}`) : null;
            if (wv && typeof wv.focus === 'function') {
              try { wv.focus(); } catch (_) {}
            }
          }, 25);
        } else {
          if (ui.isSplitView) ui.parkOrCloseSplitViewForTabSwitch({ instant: true });
          tabStore.handleSwitchToTab(targetEntry.id, tabStore.activeSpace);
          ui.setCurrentUrl(targetEntry.url || '');
          setTimeout(() => {
            const wv = document.getElementById(`webview-${targetEntry.id}`);
            if (wv && typeof wv.focus === 'function') {
              try { wv.focus(); } catch (_) {}
            }
          }, 25);
        }
      }
      set({ switcherIndex: nextIdx, showSwitcherUI: false });
    } else {
      set({ switcherIndex: nextIdx, showSwitcherUI: true });
    }
  },
  confirmSwitcher: () => {
    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }
    const { showSwitcher, switcherTabs, switcherIndex } = useUIStore.getState();
    if (!showSwitcher) return;

    const targetEntry = switcherTabs[switcherIndex];
    set({ showSwitcher: false, showSwitcherUI: false, switcherStartTime: 0, switcherOriginalTab: null });

    if (targetEntry) {
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      if (tabStore) {
        const ui = useUIStore.getState();
        if (targetEntry.isSplitGroupEntry) {
          if (!ui.isSplitView || ui.activeSplitGroupId !== targetEntry.splitGroupId) {
            ui.restoreParkedSplitGroup(targetEntry.splitGroupId, 0, { instant: true });
          }
          const focusId = targetEntry.targetTabId || targetEntry.splitMemberTabs?.[0]?.id;
          setTimeout(() => {
            const wv = focusId ? document.getElementById(`webview-${focusId}`) : null;
            if (wv && typeof wv.focus === 'function') {
              try { wv.focus(); } catch (_) {}
            }
          }, 30);
        } else {
          if (ui.isSplitView) ui.parkOrCloseSplitViewForTabSwitch({ instant: true });
          tabStore.handleSwitchToTab(targetEntry.id, tabStore.activeSpace);
          ui.setCurrentUrl(targetEntry.url || '');
          setTimeout(() => {
            const wv = document.getElementById(`webview-${targetEntry.id}`);
            if (wv && typeof wv.focus === 'function') {
              try { wv.focus(); } catch (_) {}
            }
          }, 30);
        }
      }
    }
  },
  cancelSwitcher: () => {
    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }
    const state = useUIStore.getState();
    const isVisual = state.settings?.visualTabSwitcher !== false;
    if (!isVisual && state.switcherTabs && state.switcherTabs.length > 0) {
      const originalEntry = state.switcherOriginalTab || state.switcherTabs[0];
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      if (originalEntry && tabStore) {
        const ui = useUIStore.getState();
        if (originalEntry.isSplitGroupEntry) {
          if (!ui.isSplitView || ui.activeSplitGroupId !== originalEntry.splitGroupId) {
            ui.restoreParkedSplitGroup(originalEntry.splitGroupId, 0, { instant: true });
          }
        } else {
          if (ui.isSplitView) ui.parkOrCloseSplitViewForTabSwitch({ instant: true });
          tabStore.handleSwitchToTab(originalEntry.id, tabStore.activeSpace);
          ui.setCurrentUrl(originalEntry.url || '');
        }
      }
    }
    set({ showSwitcher: false, showSwitcherUI: false, switcherStartTime: 0, switcherOriginalTab: null });
  },

  // Reader Mode
  isReaderOpen: false,
  isReaderClosing: false,
  isReaderAvailable: false,
  isReaderLoading: false,
  readerArticle: null,
  setIsReaderAvailable: (available) => set({ isReaderAvailable: !!available }),
  openReaderMode: (articleData) => set({ isReaderOpen: true, isReaderClosing: false, readerArticle: articleData, isReaderLoading: false }),
  closeReaderMode: (instant = false) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    const state = get();
    if (!state.isReaderOpen && !state.isReaderClosing) return;
    if (instant || state.isReaderClosing) {
      set({ isReaderOpen: false, isReaderClosing: false, readerArticle: null });
      return;
    }
    set({ isReaderClosing: true });
    setTimeout(() => {
      set({ isReaderOpen: false, isReaderClosing: false, readerArticle: null });
    }, 220);
  },
  toggleReaderMode: async () => {
    const state = get();
    if (state.isReaderOpen) {
      state.closeReaderMode();
      return;
    }

    const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
    if (!tabStore) return;

    const activeSpace = tabStore.activeSpace;
    const spaceTabs = activeSpace === 'personal'
      ? tabStore.privateTabs
      : (activeSpace === 'work' ? tabStore.workTabs : (activeSpace === 'ghost' ? tabStore.ghostTabs : tabStore.torTabs || []));
    const activeTab = spaceTabs.find(t => t.active);
    if (!activeTab || !activeTab.id) return;

    const wv = window.qbrowseWebviews ? window.qbrowseWebviews[activeTab.id] : null;
    if (!wv || typeof wv.executeJavaScript !== 'function') {
      state.showToast(tr('stores.ui.readerNotAvailable', 'Reader Mode is not available for this tab'));
      return;
    }

    set({ isReaderLoading: true });
    try {
      const html = await wv.executeJavaScript('document.documentElement.outerHTML');
      const url = activeTab.url || await wv.executeJavaScript('window.location.href');
      const article = parseArticle(html, url);

      if (article && article.contentHtml && article.contentHtml.length > 50) {
        set({ isReaderOpen: true, readerArticle: article, isReaderAvailable: true, isReaderLoading: false });
      } else {
        set({ isReaderLoading: false });
        state.showToast(tr('stores.ui.readerExtractFailed', 'Could not extract readable article content'));
      }
    } catch (e) {
      console.error('[ReaderMode] Failed to extract article:', e);
      set({ isReaderLoading: false });
      state.showToast(tr('stores.ui.readerLoadFailed', 'Failed to load Reader Mode'));
    }
  },
  setReaderSetting: (key, val) => {
    get().setSettingValue(key, val);
  },

  // Read Aloud (Text-to-Speech Accessibility Player)
  isReadAloudOpen: false,
  openReadAloud: () => set({ isReadAloudOpen: true }),
  closeReadAloud: () => set({ isReadAloudOpen: false }),
  toggleReadAloud: () => set(state => ({ isReadAloudOpen: !state.isReadAloudOpen })),

  // Hardware-Aware Performance Scaling System
  hardwareProfile: null,
  performanceMode: 'auto', // 'auto' | 'eco' | 'balanced' | 'ultra'
  activePerformanceTier: 'balanced',
  tabSleepTimeoutMinutes: 15,
  reduceVisualsOnEco: true,
  bfcacheEnabled: true,

  initPerformanceProfile: async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.getHardwareProfile) return;
    try {
      const resolveReducePref = (profile) => {
        if (typeof profile?.reduceVisualsOnEco === 'boolean') return profile.reduceVisualsOnEco;
        if (profile?.activeTier === 'eco' && typeof profile?.reduceVisuals === 'boolean') {
          return profile.reduceVisuals;
        }
        return get().reduceVisualsOnEco !== false;
      };

      const applyProfile = (profile) => {
        if (!profile) return;
        const activeTier = profile.activeTier || 'balanced';
        const reducePref = resolveReducePref(profile);
        set({
          hardwareProfile: profile,
          performanceMode: profile.mode || 'auto',
          activePerformanceTier: activeTier,
          tabSleepTimeoutMinutes: profile.tabSleepTimeoutMinutes ?? 15,
          reduceVisualsOnEco: reducePref,
          bfcacheEnabled: profile.bfcacheEnabled !== false
        });
        applyPerformanceDom(activeTier, reducePref, get().settings?.wallpaperBlur);
      };

      const profile = await window.electronAPI.getHardwareProfile();
      applyProfile(profile);

      if (window.electronAPI.onPerformanceProfileChanged) {
        if (typeof unsubscribePerformanceProfile === 'function') {
          try { unsubscribePerformanceProfile(); } catch (_) {}
          unsubscribePerformanceProfile = null;
        }
        unsubscribePerformanceProfile = window.electronAPI.onPerformanceProfileChanged((updatedProfile) => {
          applyProfile(updatedProfile);
        });
      }
    } catch (e) {
      console.warn('[PerformanceProfile] Init error:', e);
    }
  },

  setPerformanceMode: async (mode) => {
    const validModes = ['auto', 'eco', 'balanced', 'ultra'];
    if (!validModes.includes(mode)) return;
    try {
      let updatedProfile = null;
      if (window.electronAPI?.setPerformanceSettings) {
        updatedProfile = await window.electronAPI.setPerformanceSettings({ mode });
      }
      const activeTier = updatedProfile?.activeTier || (mode === 'auto' ? (get().hardwareProfile?.detectedTier || 'balanced') : mode);
      const sleepTimeout = updatedProfile?.tabSleepTimeoutMinutes ?? (activeTier === 'eco' ? 5 : (activeTier === 'ultra' ? 60 : 15));
      const reduceVisualsOnEco = typeof updatedProfile?.reduceVisualsOnEco === 'boolean'
        ? updatedProfile.reduceVisualsOnEco
        : get().reduceVisualsOnEco !== false;

      set({
        performanceMode: mode,
        activePerformanceTier: activeTier,
        tabSleepTimeoutMinutes: sleepTimeout,
        reduceVisualsOnEco,
        hardwareProfile: updatedProfile || get().hardwareProfile
      });

      applyPerformanceDom(activeTier, reduceVisualsOnEco, get().settings?.wallpaperBlur);
      return activeTier;
    } catch (e) {
      console.warn('[PerformanceProfile] Mode change error:', e);
    }
  },

  cyclePerformanceMode: async () => {
    const modes = ['auto', 'eco', 'balanced', 'ultra'];
    const currentMode = get().performanceMode || 'auto';
    const nextIdx = (modes.indexOf(currentMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];

    const activeTier = await get().setPerformanceMode(nextMode);

    const labels = {
      auto: tr('stores.ui.perfAuto', { tier: String(activeTier || 'balanced').toUpperCase() }, `Auto (Adapting: ${String(activeTier || 'balanced').toUpperCase()})`),
      eco: tr('stores.ui.perfEco', 'Eco Saver (Max Battery & RAM Savings)'),
      balanced: tr('stores.ui.perfBalanced', 'Balanced (Optimal Glass & Responsiveness)'),
      ultra: tr('stores.ui.perfUltra', 'Ultra (Maximum Frame Rates & RAM)')
    };
    get().showToast(tr('stores.ui.perfToast', { label: labels[nextMode] || nextMode }, `Performance: ${labels[nextMode] || nextMode}`));
  },

  setTabSleepTimeoutMinutes: async (minutes) => {
    try {
      if (window.electronAPI?.setPerformanceSettings) {
        const updated = await window.electronAPI.setPerformanceSettings({ tabSleepTimeoutMinutes: minutes });
        set({ tabSleepTimeoutMinutes: minutes, hardwareProfile: updated || get().hardwareProfile });
      } else {
        set({ tabSleepTimeoutMinutes: minutes });
      }
    } catch (e) {
      console.warn('[PerformanceProfile] Sleep timeout error:', e);
    }
  },

  toggleBfcache: async () => {
    const newVal = !get().bfcacheEnabled;
    try {
      if (window.electronAPI?.setPerformanceSettings) {
        const updated = await window.electronAPI.setPerformanceSettings({ bfcacheEnabled: newVal });
        set({ bfcacheEnabled: newVal, hardwareProfile: updated || get().hardwareProfile });
      } else {
        set({ bfcacheEnabled: newVal });
      }
      get().showToast(newVal ? tr('stores.ui.bfcacheEnabled', 'Instant Back/Forward Cache enabled') : tr('stores.ui.bfcacheDisabled', 'Instant Back/Forward Cache disabled'));
    } catch (_) {
      set({ bfcacheEnabled: newVal });
    }
  },

  setReduceVisualsOnEco: async (enabled) => {
    const nextEnabled = Boolean(enabled);
    // Apply optimistically so toggling visuals responds instantaneously
    set({ reduceVisualsOnEco: nextEnabled });
    applyPerformanceDom(get().activePerformanceTier, nextEnabled, get().settings?.wallpaperBlur);
    try {
      if (window.electronAPI?.setPerformanceSettings) {
        const updated = await window.electronAPI.setPerformanceSettings({ reduceVisualsOnEco: nextEnabled });
        const resolvedTier = updated?.activeTier || get().activePerformanceTier;
        const resolvedPref = typeof updated?.reduceVisualsOnEco === 'boolean' ? updated.reduceVisualsOnEco : nextEnabled;
        set({
          reduceVisualsOnEco: resolvedPref,
          activePerformanceTier: resolvedTier,
          hardwareProfile: updated || get().hardwareProfile
        });
        applyPerformanceDom(resolvedTier, resolvedPref, get().settings?.wallpaperBlur);
      }
    } catch (e) {
      console.warn('[PerformanceProfile] Visual setting error:', e);
    }
  },
}));

try {
  if (typeof document !== 'undefined') {
    const initialTheme = localStorage.getItem('qbrowse_theme') || 'dark';
    if (initialTheme === 'light') {
      document.documentElement.classList.add('theme-light', 'bright-mode');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light', 'bright-mode');
    }

    const initialGlass = localStorage.getItem('qbrowse_isGlassEnabled');
    if (initialGlass !== null && JSON.parse(initialGlass) === false) {
      document.documentElement.classList.add('no-glass');
    }

    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.syncThemeSource?.(initialTheme);
      window.electronAPI.onSystemThemeUpdated?.((data) => {
        const currentTheme = useUIStore.getState().theme;
        if (currentTheme === 'system' && data && typeof data.shouldUseDarkColors === 'boolean') {
          const isDark = data.shouldUseDarkColors;
          if (isDark) {
            document.documentElement.classList.add('theme-dark');
            document.documentElement.classList.remove('theme-light', 'bright-mode');
          } else {
            document.documentElement.classList.add('theme-light', 'bright-mode');
            document.documentElement.classList.remove('theme-dark');
          }
        }
      });
    }
  }
} catch (_) {}

export const syncInitialSettingsToElectron = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const state = useUIStore.getState();
      if (window.electronAPI.syncThemeSource) {
        window.electronAPI.syncThemeSource(state.theme || 'dark');
      }
      const batchPayload = {
        ...(state.settings || {}),
        isForceDark: state.isForceDark,
        darkExclusions: state.darkExclusions,
        darkExcludeMedia: state.darkExcludeMedia,
        accentColor: state.accentColor,
        theme: state.theme
      };
      if (window.electronAPI.saveSettingsBatch) {
        window.electronAPI.saveSettingsBatch(batchPayload);
      } else if (window.electronAPI.saveSetting) {
        window.electronAPI.saveSetting({ batch: batchPayload });
      }
      if (window.electronAPI.syncSmartDarkState) {
        window.electronAPI.syncSmartDarkState({
          isForceDark: state.isForceDark,
          darkExclusions: state.darkExclusions,
          darkExcludeMedia: state.darkExcludeMedia
        });
      }
      if (window.electronAPI.syncPasskeySettings) {
        window.electronAPI.syncPasskeySettings({
          passkeyProviderMode: state.settings?.passkeyProviderMode === 'hardware' ? 'hardware' : 'qvault',
          passkeyHardwareFallback: state.settings?.passkeyHardwareFallback !== false
        });
      }
      if (window.electronAPI.syncTextHighlightState) {
        window.electronAPI.syncTextHighlightState({
          style: state.textHighlightStyle,
          color: state.textHighlightColor,
          accentColor: state.accentColor,
          applyToWeb: state.textHighlightApplyToWeb
        });
      }
    } catch (_) {}
  }
};

if (typeof window !== 'undefined') {
  window.__uiStore = useUIStore;
  try {
    applyAppFont(useUIStore.getState().settings);
    const st = useUIStore.getState();
    applyTextHighlightToDocument({
      style: st.textHighlightStyle,
      color: st.textHighlightColor,
      accentColor: st.accentColor
    });
  } catch (_) {}
}

// Hardware-aware animation duration scaler for eco, balanced, and ultra performance tiers
export const getAnimationTimeout = (baseMs = 200) => {
    try {
        const uiState = useUIStore?.getState?.();
        const tier = (typeof document !== 'undefined' && document.documentElement?.dataset?.performanceTier) || uiState?.activePerformanceTier;
        const optimizeEcoVisuals = (typeof document !== 'undefined' && document.documentElement?.classList?.contains('eco-mode'))
            || shouldOptimizeEcoVisuals(tier, uiState?.reduceVisualsOnEco);
        if (optimizeEcoVisuals) return Math.max(70, Math.round(baseMs * 0.5));
        if (tier === 'ultra') return Math.round(baseMs * 1.15);
    } catch (_) {}
    return baseMs;
};

export default useUIStore;
