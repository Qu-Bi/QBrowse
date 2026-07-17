import { create } from 'zustand';

let globalToastTimeout = null;

const loadSettings = () => {
    try {
        const stored = localStorage.getItem('qbrowse_settings');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return { httpsOnly: true, isolation: false, webrtc: true, hardware: true, memory: true, smooth: true, battery: false, cosmetic: true, smartCalc: true, askSave: false };
};

const useUIStore = create((set) => ({
  // Omnibox
  isOmniboxOpen: false,
  isOmniboxClosing: false,
  searchQuery: '',
  historySearchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHistorySearchQuery: (query) => set({ historySearchQuery: query }),
  openOmnibox: (url = '') => set({ isOmniboxOpen: true, isOmniboxClosing: false, searchQuery: url }),
  closeOmnibox: () => {
    set({ isOmniboxClosing: true });
    setTimeout(() => {
      set({ isOmniboxOpen: false, isOmniboxClosing: false, searchQuery: '' });
    }, 200);
  },

  // View States
  isSplitView: false,
  setIsSplitView: (val) => set({ isSplitView: val }),
  isFullscreen: false,
  setIsFullscreen: async (val) => {
    set({ isFullscreen: val });
    try {
      if (val) {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Native fullscreen not available in this environment');
    }
  },
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

  // Downloads
  downloads: [],
  setDownloads: (downloads) => set({ downloads }),
  addDownload: (download) => set(state => ({ downloads: [download, ...state.downloads] })),
  updateDownload: (id, updates) => set(state => ({
      downloads: state.downloads.map(d => d.id === id ? { ...d, ...updates } : d)
  })),

  // Navigation
  
  hoverPreview: null,
  setHoverPreview: (preview) => set({ hoverPreview: preview }),

  contextMenu: null,
  isContextMenuClosing: false,
  setContextMenu: (menu) => set({ contextMenu: menu, isContextMenuClosing: false }),
  closeContextMenu: () => {
    set({ isContextMenuClosing: true });
    setTimeout(() => set({ contextMenu: null, isContextMenuClosing: false }), 200);
  },

  tabContextMenu: null,
  isTabContextMenuClosing: false,
  setTabContextMenu: (menu) => set({ tabContextMenu: menu, isTabContextMenuClosing: false }),
  closeTabContextMenu: () => {
    set({ isTabContextMenuClosing: true });
    setTimeout(() => set({ tabContextMenu: null, isTabContextMenuClosing: false }), 200);
  },

  folderContextMenu: null,
  isFolderContextMenuClosing: false,
  setFolderContextMenu: (menu) => set({ folderContextMenu: menu, isFolderContextMenuClosing: false }),
  closeFolderContextMenu: () => {
    set({ isFolderContextMenuClosing: true });
    setTimeout(() => set({ folderContextMenu: null, isFolderContextMenuClosing: false }), 200);
  },

  closeContextMenus: () => {
    const state = useUIStore.getState();
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
  },

  showSwitcher: false,
  setShowSwitcher: (val) => set({ showSwitcher: val }),

  currentUrl: '',

  setCurrentUrl: (url) => set({ currentUrl: url }),
  isRefreshing: false,
  refresh: () => {
    set({ isRefreshing: true });
    try {
        const wv = Array.from(document.querySelectorAll('webview')).find(w => w.style.visibility !== 'hidden' && w.style.display !== 'none');
        if (wv && typeof wv.reload === 'function') {
            wv.reload();
        }
    } catch (e) {}
    setTimeout(() => set({ isRefreshing: false }), 1000);
  },

  // Find in Page
  isFindOpen: false,
  findQuery: '',
  setIsFindOpen: (val) => set({ isFindOpen: val, findQuery: val ? useUIStore.getState().findQuery : '' }),
  setFindQuery: (query) => set({ findQuery: query }),

  // Notifications
  toast: null,
  showToast: (message) => {
    set({ toast: message });
    if (globalToastTimeout) clearTimeout(globalToastTimeout);
    globalToastTimeout = setTimeout(() => set({ toast: null }), 2500);
  },

  // Tab Map
  isTabMapOpen: false,
  isTabMapClosing: false,
  openTabMap: () => set({ isTabMapOpen: true, isTabMapClosing: false }),
  closeTabMap: () => {
    set({ isTabMapClosing: true });
    setTimeout(() => set({ isTabMapOpen: false, isTabMapClosing: false }), 300);
  },

  // Popovers & Context Menus
  activePopover: null,
  isPopoverClosing: false,
  openPopover: (popover) => set({ activePopover: popover, isPopoverClosing: false }),
  closePopover: () => {
    set({ isPopoverClosing: true });
    setTimeout(() => set({ activePopover: null, isPopoverClosing: false }), 200);
  },
  togglePopover: (popover) => {
    if (useUIStore.getState().activePopover === popover) {
      useUIStore.getState().closePopover();
    } else {
      set({ activePopover: popover, isPopoverClosing: false });
    }
  },


  // Hover Preview
  hoverPreview: null,
  setHoverPreview: (preview) => set({ hoverPreview: preview }),

  // Modals & Settings
  activeModal: null,
  isModalClosing: false,
  openModal: (modal) => set({ activeModal: modal, isModalClosing: false }),
  closeModal: () => {
    set({ isModalClosing: true });
    setTimeout(() => set({ activeModal: null, isModalClosing: false, onboardingStep: 0 }), 200);
  },

  settingsTab: 'appearance',
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  user: null,
  setUser: (user) => set({ user }),

  isForceDark: localStorage.getItem('qbrowse_isForceDark') === 'true',
  setIsForceDark: (val) => {
      set({ isForceDark: val });
      localStorage.setItem('qbrowse_isForceDark', val);
  },
  isAdblockActive: true,
  setIsAdblockActive: (val) => {
      set({ isAdblockActive: val });
      try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('set-adblock', val);
      } catch(e) {}
  },
  
  adblockStats: { count: 0, domains: [] },
  addBlockedTracker: (url) => set((state) => {
      try {
          const domain = new URL(url).hostname;
          const newDomains = [domain, ...state.adblockStats.domains.filter(d => d !== domain)].slice(0, 5);
          return {
              adblockStats: {
                  count: state.adblockStats.count + 1,
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
      return ['youtube.com'];
  })(),
  setDarkExclusions: (exclusions) => {
      set({ darkExclusions: exclusions });
      localStorage.setItem('qbrowse_dark_exclusions', JSON.stringify(exclusions));
  },
  
  settings: loadSettings(),
  toggleSetting: (key) => {
      set((state) => {
          const newSettings = { ...state.settings, [key]: !state.settings[key] };
          localStorage.setItem('qbrowse_settings', JSON.stringify(newSettings));
          
          if (['hardware', 'isolation'].includes(key)) {
              useUIStore.getState().showToast('Restart required for engine changes.');
          }
          if (window.electronAPI && window.electronAPI.invoke) {
              window.electronAPI.invoke('save-setting', { key, value: newSettings[key] });
          }
          return { settings: newSettings };
      });
  },

  zoomLevel: 100,
  setZoomLevel: (val) => set({ zoomLevel: val }),
  isGlassEnabled: true,
  setIsGlassEnabled: (val) => set({ isGlassEnabled: val }),
  isSwipeEnabled: true,
  setIsSwipeEnabled: (val) => set({ isSwipeEnabled: val }),
  accentColor: '#d4bc94',
  setAccentColor: (color) => set({ accentColor: color }),

  // Onboarding
  setupComplete: false,
  setSetupComplete: (val) => set({ setupComplete: val }),
  onboardingStep: 0,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  obUsername: '',
  setObUsername: (val) => set({ obUsername: val }),
  obPassword: '',
  setObPassword: (val) => set({ obPassword: val }),

  // Tab Switcher Overlay
  showSwitcher: false,
  setShowSwitcher: (val) => set({ showSwitcher: val }),
}));

export default useUIStore;
