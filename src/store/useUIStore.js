import { create } from 'zustand';

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
  setIsFullscreen: (val) => set({ isFullscreen: val }),
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

  closeContextMenus: () => {
    set({ isContextMenuClosing: true, isTabContextMenuClosing: true });
    setTimeout(() => set({ contextMenu: null, isContextMenuClosing: false, tabContextMenu: null, isTabContextMenuClosing: false }), 200);
  },

  showSwitcher: false,
  setShowSwitcher: (val) => set({ showSwitcher: val }),

  currentUrl: '',

  setCurrentUrl: (url) => set({ currentUrl: url }),
  isRefreshing: false,
  refresh: () => {
    set({ isRefreshing: true });
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
    setTimeout(() => set({ toast: null }), 2500);
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

  contextMenu: null,
  isContextMenuClosing: false,
  setContextMenu: (menu) => set({ contextMenu: menu, isContextMenuClosing: false, tabContextMenu: null }),
  
  tabContextMenu: null,
  isTabContextMenuClosing: false,
  setTabContextMenu: (menu) => set({ tabContextMenu: menu, isTabContextMenuClosing: false, contextMenu: null }),

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
  isForceDark: false,
  setIsForceDark: (val) => set({ isForceDark: val }),
  isAdblockActive: true,
  setIsAdblockActive: (val) => set({ isAdblockActive: val }),
  darkExclusions: ['youtube.com'],
  setDarkExclusions: (exclusions) => set({ darkExclusions: exclusions }),
  
  mockSettings: { httpsOnly: true, isolation: false, hardware: true, memory: true, cosmetic: true, smartCalc: true, askSave: false },
  toggleMockSetting: (key) => set((state) => ({ mockSettings: { ...state.mockSettings, [key]: !state.mockSettings[key] } })),

  zoomLevel: 100,
  setZoomLevel: (val) => set({ zoomLevel: val }),
  isGlassEnabled: true,
  setIsGlassEnabled: (val) => set({ isGlassEnabled: val }),
  isSwipeEnabled: true,
  setIsSwipeEnabled: (val) => set({ isSwipeEnabled: val }),
  accentColor: '#d4bc94',
  setAccentColor: (color) => set({ accentColor: color }),

  // Onboarding
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
