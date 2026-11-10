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
                if (Array.isArray(parsed)) return parsed;
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
  focusedPane: 'left', // 'left' | 'right'
  splitRatio: 50, // 50% width
  setIsSplitView: (val) => set({ isSplitView: val }),
  setSplitRightTabId: (id) => {
    set({ splitRightTabId: id });
    if (id && typeof window !== 'undefined' && window.__tabStore) {
      try {
        const tabStore = window.__tabStore.getState();
        const currentActive = tabStore.getActiveTab();
        if (currentActive && currentActive.id === id) {
          const list = tabStore.getActiveList();
          const setList = tabStore.getActiveSetList();
          const candidate = list.find(t => t.id !== id);
          if (candidate) {
            setList(list.map(t => ({
              ...t,
              active: t.id === candidate.id,
              suspended: t.id === candidate.id ? false : t.suspended,
              lastActiveAt: t.id === candidate.id ? Date.now() : t.lastActiveAt
            })));
          }
        }
      } catch (_) {}
    }
  },
  setFocusedPane: (pane) => set({ focusedPane: pane }),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  toggleSplitView: (targetRightId = null) => {
    const currentState = useUIStore.getState();
    const nextState = !currentState.isSplitView;

    if (!nextState) {
      useUIStore.setState({ isSplitView: false, splitRightTabId: null, focusedPane: 'left' });
      useUIStore.getState().showToast('Split View: Disabled');
      return;
    }

    let rightId = targetRightId;
    let spaceTabs = [];
    let activeTab = null;
    try {
      const tabStore = window.__tabStore?.getState();
      if (tabStore) {
        const space = tabStore.activeSpace;
        spaceTabs = space === 'personal' ? tabStore.privateTabs : (space === 'work' ? tabStore.workTabs : (space === 'tor' ? (tabStore.torTabs || []) : tabStore.ghostTabs));
        activeTab = spaceTabs.find(t => t.active);
      }
    } catch (_) {}

    if (rightId && (!spaceTabs.some(t => t.id === rightId) || (activeTab && rightId === activeTab.id))) {
      rightId = null;
    }

    if (!rightId) {
      if (currentState.splitRightTabId && spaceTabs.some(t => t.id === currentState.splitRightTabId) && (!activeTab || currentState.splitRightTabId !== activeTab.id)) {
        rightId = currentState.splitRightTabId;
      } else {
        const candidate = spaceTabs.find(t => t.id !== activeTab?.id);
        if (candidate) {
          rightId = candidate.id;
        }
      }
    }

    useUIStore.setState({ 
      isSplitView: true, 
      splitRightTabId: rightId || null,
      focusedPane: rightId ? 'right' : 'left'
    });
    useUIStore.getState().showToast(rightId ? 'Split View: Enabled' : 'Split View: Select a tab');
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
        get().showToast('No active webpage to export');
        return;
      }

      let title = 'Webpage';
      try {
        if (typeof wv.getTitle === 'function') {
          title = wv.getTitle() || title;
        }
      } catch (_) {}

      if (title === 'Webpage' && window.__tabStore) {
        try {
          const tab = window.__tabStore.getState()?.getActiveTab?.();
          if (tab?.title) title = tab.title;
        } catch (_) {}
      }

      const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 80) || 'Webpage';
      const defaultName = `${safeTitle}.pdf`;

      get().showToast('Generating Clean PDF...');

      if (typeof wv.printToPDF !== 'function') {
        get().showToast('PDF export not supported on this view');
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
        get().showToast('Failed to generate PDF');
        return;
      }

      if (window.electronAPI && typeof window.electronAPI.savePdfFile === 'function') {
        const res = await window.electronAPI.savePdfFile({
          defaultName,
          data: pdfData
        });
        if (res?.success) {
          get().showToast('PDF exported successfully');
        } else if (!res?.canceled) {
          get().showToast(`PDF export failed: ${res?.error || 'Unknown error'}`);
        }
      } else {
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        get().showToast('PDF downloaded');
      }
    } catch (e) {
      console.error('[PDF Export] error:', e);
      get().showToast(`PDF export failed: ${e.message}`);
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
          get().registerScreenshotDownload(res, title, 'Visible Viewport');
          get().showToast('Screenshot saved to Downloads & copied to clipboard!');
        } else {
          get().showToast(`Failed to capture screenshot: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('[Screenshot] Visible capture error:', e);
      get().showToast(`Screenshot failed: ${e.message}`);
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
        get().showToast('Open a website to capture a full scrolling page');
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
        get().showToast('Unable to access page webcontents');
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
      const title = activeTab?.title || 'Webpage';

      // If page is not taller than the viewport, do a single clean guest capture!
      if (totalHeight <= viewportHeight + 20) {
        if (window.electronAPI && typeof window.electronAPI.captureAndSave === 'function') {
          const res = await window.electronAPI.captureAndSave({ webContentsId: wcId, title });
          if (res?.success) {
            set({ lastScreenshotPath: res.filePath });
            get().registerScreenshotDownload(res, title, 'Full Page');
            get().showToast('Full page screenshot saved & copied to clipboard!');
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
          get().registerScreenshotDownload(res, title, 'Full Page');
          get().showToast('Full page screenshot saved & copied to clipboard!');
        } else {
          get().showToast(`Failed to save screenshot: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('[Screenshot] Full page error:', e);
      get().showToast(`Full page screenshot failed: ${e.message}`);
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
      const title = activeTab?.title || 'Snip';
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
          get().registerScreenshotDownload(res, title, 'Snip');
          get().showToast('Snip saved to Downloads & copied to clipboard!');
        } else {
          get().showToast(`Failed to save snip: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('[Screenshot] Snip error:', e);
      get().showToast(`Snip failed: ${e.message}`);
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
    const timeout = tier === 'eco' ? 120 : (tier === 'ultra' ? 260 : 230);
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
    const timeout = tier === 'eco' ? 100 : (tier === 'ultra' ? 220 : 180);
    setTimeout(() => set({ activePinnedStack: null, isPinnedStackClosing: false }), timeout);
  },
  mediaState: {
      isPlaying: false,
      title: '',
      artist: '',
      albumArt: '',
      currentTime: 0,
      duration: 0,
      tabId: null
  },
  setMediaState: (mediaObj) => set(state => ({
      mediaState: { ...state.mediaState, ...mediaObj }
  })),
  sendMediaCommand: (cmd) => {
      const commandName = typeof cmd === 'string' ? cmd : (cmd ? cmd.action : 'unknown');
      const cmdPayload = typeof cmd === 'object' && cmd !== null ? cmd : { action: cmd };
      console.log(`[QBrowse MediaControl] Dispatching command: "${commandName}"`, cmdPayload);

      // Optimistic state toggle for play/pause
      if (commandName === 'toggle-play' || commandName === 'play-pause') {
          set(state => ({
              mediaState: {
                  ...state.mediaState,
                  isPlaying: !state.mediaState.isPlaying
              }
          }));
      }

      // Determine target webview(s)
      const mediaState = get().mediaState;
      let targetWebviews = [];

      // 1. Try to target the specific tab playing media
      if (mediaState && mediaState.tabId) {
          const matchingWv = document.querySelector(`webview#webview-${mediaState.tabId}`);
          if (matchingWv) {
              targetWebviews.push(matchingWv);
          }
      }

      // 2. Fall back to the active tab's webview
      if (targetWebviews.length === 0) {
          const activeWv = get().getActiveWebView?.();
          if (activeWv) {
              targetWebviews.push(activeWv);
          }
      }

      // 3. Fall back to visible webviews or any webview in DOM
      if (targetWebviews.length === 0) {
          const allWvs = Array.from(document.querySelectorAll('webview'));
          const visibleWvs = allWvs.filter(wv => wv.style.visibility !== 'hidden' && wv.style.display !== 'none');
          targetWebviews = visibleWvs.length > 0 ? visibleWvs : allWvs;
      }

      if (targetWebviews.length === 0) {
          console.warn('[QBrowse MediaControl] No webview element available to receive command');
          return;
      }

      targetWebviews.forEach((wv, index) => {
          try {
              if (typeof wv.executeJavaScript === 'function') {
                  let script = '';

                  if (commandName === 'toggle-play' || commandName === 'play-pause') {
                      script = `
                          (function() {
                              try {
                                  window.__qbrowse_last_media_cmd = Date.now();

                                  // 1. YouTube Player API
                                  const yt = document.querySelector('#movie_player, .html5-video-player');
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
                                      '.playControl, ' +
                                      'button[aria-label*="Play" i], ' +
                                      'button[aria-label*="Pause" i]'
                                  );
                                  if (streamBtn) {
                                      streamBtn.click();
                                      return 'stream-btn-clicked';
                                  }

                                  // 4. HTML5 Video / Audio elements
                                  const mediaEls = Array.from(document.querySelectorAll('video, audio'));
                                  const playing = mediaEls.find(m => !m.paused && !m.ended);
                                  const targetMedia = playing || mediaEls.find(m => m.readyState > 0) || mediaEls[0];
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

                                  // 5. Fallback keyboard event for YouTube
                                  const keyEv = new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', keyCode: 75, which: 75, bubbles: true });
                                  document.dispatchEvent(keyEv);
                                  return 'simulated-key-k';
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
                                  const yt = document.querySelector('#movie_player, .html5-video-player');
                                  if (yt && typeof yt.nextVideo === 'function') {
                                      yt.nextVideo();
                                      return 'yt-next';
                                  }
                                  const btn = document.querySelector('.ytp-next-button, button[data-testid="control-button-skip-forward"], .skipControl__next, .next-button');
                                  if (btn) {
                                      btn.click();
                                      return 'next-btn';
                                  }
                                  const media = Array.from(document.querySelectorAll('video, audio')).find(m => !m.paused) || document.querySelector('video, audio');
                                  if (media && media.duration) {
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
                                  const yt = document.querySelector('#movie_player, .html5-video-player');
                                  if (yt && typeof yt.previousVideo === 'function') {
                                      yt.previousVideo();
                                      return 'yt-prev';
                                  }
                                  const btn = document.querySelector('.ytp-prev-button, button[data-testid="control-button-skip-back"], .skipControl__previous, .previous-button');
                                  if (btn) {
                                      btn.click();
                                      return 'prev-btn';
                                  }
                                  const media = Array.from(document.querySelectorAll('video, audio')).find(m => !m.paused) || document.querySelector('video, audio');
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
                                  const yt = document.querySelector('#movie_player, .html5-video-player');
                                  if (yt && typeof yt.seekTo === 'function') {
                                      yt.seekTo(${seekTime}, true);
                                      return 'yt-seek';
                                  }
                                  const media = Array.from(document.querySelectorAll('video, audio')).find(m => !m.paused) || document.querySelector('video, audio');
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
                                  const yt = document.querySelector('#movie_player, .html5-video-player');
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
                                  mediaEls.forEach(el => { el.muted = !el.muted; });
                                  return 'html5-mute';
                              } catch(e) {
                                  return 'mute-err: ' + e.toString();
                              }
                          })()
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

                                  const videoEls = Array.from(document.querySelectorAll('video'));
                                  const activeVideo = videoEls.find(v => !v.paused && v.readyState > 1) || videoEls[0];

                                  if (activeVideo) {
                                      activeVideo.removeAttribute('disablepictureinpicture');
                                      activeVideo.disablePictureInPicture = false;
                                      await activeVideo.requestPictureInPicture();
                                      return 'native-pip-success';
                                  }

                                  const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
                                  if (ytPlayer && typeof ytPlayer.togglePictureInPicture === 'function') {
                                      ytPlayer.togglePictureInPicture();
                                      return 'yt-player-pip';
                                  }

                                  const pipBtn = document.querySelector('.ytp-pip-button, button[title*="Picture-in-picture"]');
                                  if (pipBtn) {
                                      pipBtn.click();
                                      return 'pip-btn-clicked';
                                  }

                                  return 'no-video-found';
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
  },


  // Hover Preview
  hoverPreview: null,
  setHoverPreview: (preview) => set({ hoverPreview: preview }),

  // Passkey Prompt
  passkeyPrompt: null,
  setPasskeyPrompt: (prompt) => set({ passkeyPrompt: prompt }),

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
    const timeout = tier === 'eco' ? 120 : (tier === 'ultra' ? 280 : 240);
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
    const timeout = tier === 'eco' ? 120 : (tier === 'ultra' ? 280 : 240);
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
    const timeout = tier === 'eco' ? 100 : (tier === 'ultra' ? 240 : 200);
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
      set({ isForceDark: val });
      try {
          localStorage.setItem('qbrowse_isForceDark', val);
      } catch (_) {}
      if (typeof window !== 'undefined' && window.electronAPI) {
          if (window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting('isForceDark', val);
          }
          if (window.electronAPI.syncSmartDarkState) {
              window.electronAPI.syncSmartDarkState({
                  isForceDark: val,
                  darkExclusions: get().darkExclusions
              });
          }
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
          if (stored) return JSON.parse(stored);
      } catch (e) {}
      return ['youtube.com', 'github.com', 'figma.com', 'mail.google.com'];
  })(),
  setDarkExclusions: (exclusions) => {
      set({ darkExclusions: exclusions });
      try {
          localStorage.setItem('qbrowse_dark_exclusions', JSON.stringify(exclusions));
      } catch (_) {}
      if (typeof window !== 'undefined' && window.electronAPI) {
          if (window.electronAPI.saveSetting) {
              window.electronAPI.saveSetting('darkExclusions', exclusions);
          }
          if (window.electronAPI.syncSmartDarkState) {
              window.electronAPI.syncSmartDarkState({
                  isForceDark: get().isForceDark,
                  darkExclusions: exclusions
              });
          }
      }
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
          if (typeof diskSettings.isForceDark === 'boolean') {
            get().setIsForceDark(diskSettings.isForceDark);
          }
          if (Array.isArray(diskSettings.darkExclusions)) {
            get().setDarkExclusions(diskSettings.darkExclusions);
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
              accentColor: get().accentColor,
              theme: get().theme
            });
          } else if (window.electronAPI.saveSetting) {
            window.electronAPI.saveSetting({
              batch: {
                ...merged,
                isForceDark: get().isForceDark,
                darkExclusions: get().darkExclusions,
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
    set({
      settings: cleanSettings,
      theme: 'dark',
      themeTransition: null,
      accentColor: '#d4bc94',
      accentRgb: '212, 188, 148',
      isGlassEnabled: true,
      isSwipeEnabled: true,
      isForceDark: false,
      darkExclusions: [],
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
      localStorage.removeItem('qbrowse_dark_exclusions');
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
        window.electronAPI.saveSetting('darkExclusions', []);
      }
      if (window.electronAPI.syncThemeSource) {
        window.electronAPI.syncThemeSource('dark');
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
              useUIStore.getState().showToast('Restart required for engine changes.');
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
      get().showToast('Typography reset to System Default');
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
          get().showToast('Maximum of 8 workspaces allowed', 'warning');
          return null;
      }

      const id = `space_${Date.now()}`;
      const cleanName = (typeof name === 'string' && name.trim()) ? name.trim() : 'New Space';
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
      get().showToast(`Workspace "${cleanName}" created`);
      return newSpace;
  },

  updateSpace: (id, updates) => {
      const currentSpaces = Array.isArray(get().settings?.customSpaces) && get().settings.customSpaces.length > 0
          ? get().settings.customSpaces
          : defaultSettings.customSpaces;
      const updated = currentSpaces.map(s => s.id === id ? { ...s, ...updates, id } : s);
      get().saveSetting('customSpaces', updated);
      get().showToast('Workspace updated');
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

      get().showToast('Workspace removed. Open tabs moved to Personal.');
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
      get().showToast(`Preset "${preset.name}" saved!`);
      return preset;
  },

  updateCustomPreset: (presetId, updates) => {
      const current = get().customPresets || [];
      const index = current.findIndex(p => p.id === presetId);
      if (index === -1) {
          get().showToast('Preset not found to update', 'warning');
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
      get().showToast(`Preset "${updatedPreset.name}" updated!`);
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
      get().showToast(`Preset "${target.name}" deleted`);
  },

  duplicatePreset: (presetId) => {
      const all = get().getAllPresets();
      const source = all.find(p => p.id === presetId);
      if (!source) {
          get().showToast('Preset not found to duplicate', 'warning');
          return null;
      }
      const newId = `custom_${Date.now()}`;
      const clone = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
          badge: 'Custom',
          isCustom: true,
          isBuiltIn: false,
          createdAt: Date.now()
      };
      const currentCustom = get().customPresets || [];
      const updated = [...currentCustom, clone];
      set({ customPresets: updated });
      saveCustomPresetsToStorage(updated);
      get().showToast(`Duplicated "${source.name}"`);
      return clone;
  },

  captureCurrentAsPreset: (name = 'Custom Preset', description = '', icon = 'Sparkles') => {
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

    const settings = get().settings || {};
    const isVisual = settings.visualTabSwitcher !== false;
    const order = settings.tabSwitcherOrder || 'mru';

    const activeIndex = list.findIndex(t => t.active);
    const activeTab = activeIndex !== -1 ? list[activeIndex] : list[0];

    let orderedTabs = [];
    let initialIndex = 0;

    if (order === 'sidebar') {
      orderedTabs = [...list];
      const curIdx = activeIndex !== -1 ? activeIndex : 0;
      initialIndex = (curIdx + direction + orderedTabs.length) % orderedTabs.length;
    } else {
      // 'mru'
      const otherTabs = list.filter(t => t.id !== activeTab.id).sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
      orderedTabs = [activeTab, ...otherTabs];
      initialIndex = direction === -1 ? orderedTabs.length - 1 : 1;
    }

    const targetTab = orderedTabs[initialIndex];

    if (window.__switcherTimer) {
      clearTimeout(window.__switcherTimer);
      window.__switcherTimer = null;
    }

    if (!isVisual) {
      if (targetTab) {
        tabStore.handleSwitchToTab(targetTab.id, tabStore.activeSpace);
        get().setCurrentUrl(targetTab.url || '');
        setTimeout(() => {
          const wv = document.getElementById('webview-' + targetTab.id);
          if (wv && typeof wv.focus === 'function') {
            try { wv.focus(); } catch (_) {}
          }
        }, 20);
      }
      set({
        showSwitcher: true,
        showSwitcherUI: false,
        switcherStartTime: Date.now(),
        switcherTabs: orderedTabs,
        switcherIndex: initialIndex,
        switcherOriginalTab: activeTab
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
      switcherOriginalTab: activeTab
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
      const targetTab = state.switcherTabs[nextIdx];
      if (targetTab) {
        const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
        if (tabStore) {
          tabStore.handleSwitchToTab(targetTab.id, tabStore.activeSpace);
          useUIStore.getState().setCurrentUrl(targetTab.url || '');
          setTimeout(() => {
            const wv = document.getElementById('webview-' + targetTab.id);
            if (wv && typeof wv.focus === 'function') {
              try { wv.focus(); } catch (_) {}
            }
          }, 20);
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

    const targetTab = switcherTabs[switcherIndex];
    set({ showSwitcher: false, showSwitcherUI: false, switcherStartTime: 0, switcherOriginalTab: null });

    if (targetTab) {
      const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
      if (tabStore) {
        tabStore.handleSwitchToTab(targetTab.id, tabStore.activeSpace);
        useUIStore.getState().setCurrentUrl(targetTab.url || '');
        setTimeout(() => {
          const wv = document.getElementById(`webview-${targetTab.id}`);
          if (wv && typeof wv.focus === 'function') {
            try { wv.focus(); } catch (_) {}
          }
        }, 30);
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
      const originalTab = state.switcherOriginalTab || state.switcherTabs[0];
      if (originalTab) {
        const tabStore = (typeof window !== 'undefined' && window.__tabStore) ? window.__tabStore.getState() : null;
        if (tabStore) {
          tabStore.handleSwitchToTab(originalTab.id, tabStore.activeSpace);
          useUIStore.getState().setCurrentUrl(originalTab.url || '');
          setTimeout(() => {
            const wv = document.getElementById(`webview-${originalTab.id}`);
            if (wv && typeof wv.focus === 'function') {
              try { wv.focus(); } catch (_) {}
            }
          }, 30);
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
      state.showToast('Reader Mode is not available for this tab');
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
        state.showToast('Could not extract readable article content');
      }
    } catch (e) {
      console.error('[ReaderMode] Failed to extract article:', e);
      set({ isReaderLoading: false });
      state.showToast('Failed to load Reader Mode');
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
      const applyDom = (tier, reduce) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        root.dataset.performanceTier = tier;

        if (tier === 'eco') {
          root.classList.add('eco-mode');
          root.classList.remove('ultra-mode');
          root.style.setProperty('--glass-blur', '0px');
          root.style.setProperty('--animation-speed', '0.12s');
        } else if (tier === 'ultra') {
          root.classList.remove('eco-mode');
          root.classList.add('ultra-mode');
          root.style.setProperty('--glass-blur', `${get().settings?.wallpaperBlur ?? 24}px`);
          root.style.setProperty('--animation-speed', '0.32s');
        } else {
          // balanced
          root.classList.remove('eco-mode');
          root.classList.remove('ultra-mode');
          root.style.setProperty('--glass-blur', `${get().settings?.wallpaperBlur ?? 20}px`);
          root.style.setProperty('--animation-speed', '0.24s');
        }
      };

      const profile = await window.electronAPI.getHardwareProfile();
      if (profile) {
        set({
          hardwareProfile: profile,
          performanceMode: profile.mode || 'auto',
          activePerformanceTier: profile.activeTier || 'balanced',
          tabSleepTimeoutMinutes: profile.tabSleepTimeoutMinutes ?? 15,
          reduceVisualsOnEco: profile.reduceVisuals !== false,
          bfcacheEnabled: profile.bfcacheEnabled !== false
        });
        applyDom(profile.activeTier, profile.reduceVisuals !== false);
      }

      if (window.electronAPI.onPerformanceProfileChanged) {
        window.electronAPI.onPerformanceProfileChanged((updatedProfile) => {
          if (updatedProfile) {
            set({
              hardwareProfile: updatedProfile,
              performanceMode: updatedProfile.mode || 'auto',
              activePerformanceTier: updatedProfile.activeTier || 'balanced',
              tabSleepTimeoutMinutes: updatedProfile.tabSleepTimeoutMinutes ?? 15,
              reduceVisualsOnEco: updatedProfile.reduceVisuals !== false,
              bfcacheEnabled: updatedProfile.bfcacheEnabled !== false
            });
            applyDom(updatedProfile.activeTier, updatedProfile.reduceVisuals !== false);
          }
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
      const reduceVisuals = get().reduceVisualsOnEco;

      set({
        performanceMode: mode,
        activePerformanceTier: activeTier,
        tabSleepTimeoutMinutes: sleepTimeout,
        hardwareProfile: updatedProfile || get().hardwareProfile
      });

      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.dataset.performanceTier = activeTier;
        if (activeTier === 'eco') {
          root.classList.add('eco-mode');
          root.classList.remove('ultra-mode');
          root.style.setProperty('--glass-blur', '0px');
          root.style.setProperty('--animation-speed', '0.12s');
        } else if (activeTier === 'ultra') {
          root.classList.remove('eco-mode');
          root.classList.add('ultra-mode');
          root.style.setProperty('--glass-blur', `${get().settings?.wallpaperBlur ?? 24}px`);
          root.style.setProperty('--animation-speed', '0.32s');
        } else {
          root.classList.remove('eco-mode');
          root.classList.remove('ultra-mode');
          root.style.setProperty('--glass-blur', `${get().settings?.wallpaperBlur ?? 20}px`);
          root.style.setProperty('--animation-speed', '0.24s');
        }
      }
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
      auto: `Auto (Adapting: ${String(activeTier || 'balanced').toUpperCase()})`,
      eco: 'Eco Saver (Max Battery & RAM Savings)',
      balanced: 'Balanced (Optimal Glass & Responsiveness)',
      ultra: 'Ultra (Maximum Frame Rates & RAM)'
    };
    get().showToast(`Performance: ${labels[nextMode] || nextMode}`);
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
      get().showToast(newVal ? 'Instant Back/Forward Cache enabled' : 'Instant Back/Forward Cache disabled');
    } catch (_) {
      set({ bfcacheEnabled: newVal });
    }
  },

  setReduceVisualsOnEco: async (enabled) => {
    try {
      if (window.electronAPI?.setPerformanceSettings) {
        const updated = await window.electronAPI.setPerformanceSettings({ reduceVisualsOnEco: enabled });
        set({ reduceVisualsOnEco: enabled, hardwareProfile: updated || get().hardwareProfile });
      } else {
        set({ reduceVisualsOnEco: enabled });
      }
      if (typeof document !== 'undefined') {
        if (get().activePerformanceTier === 'eco' && enabled !== false) {
          document.documentElement.classList.add('eco-mode');
        } else {
          document.documentElement.classList.remove('eco-mode');
        }
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
          darkExclusions: state.darkExclusions
        });
      }
    } catch (_) {}
  }
};

if (typeof window !== 'undefined') {
  window.__uiStore = useUIStore;
  try {
    applyAppFont(useUIStore.getState().settings);
  } catch (_) {}
}

// Hardware-aware animation duration scaler for eco, balanced, and ultra performance tiers
export const getAnimationTimeout = (baseMs = 200) => {
    try {
        const tier = (typeof document !== 'undefined' && document.documentElement?.dataset?.performanceTier) || useUIStore?.getState?.()?.activePerformanceTier;
        if (tier === 'eco') return Math.max(70, Math.round(baseMs * 0.5));
        if (tier === 'ultra') return Math.round(baseMs * 1.15);
    } catch (_) {}
    return baseMs;
};

export default useUIStore;
