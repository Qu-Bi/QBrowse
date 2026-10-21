import { create } from 'zustand';
import useUIStore from './useUIStore';

export const isValidSyncTab = (tab) => {
  if (!tab || typeof tab !== 'object') return false;
  const url = typeof tab.url === 'string' ? tab.url.trim() : '';
  if (!url) return false;
  if (url === 'about:blank' || url.startsWith('about:')) return false;
  if (url.startsWith('qbrowse://newtab') || url === 'chrome://newtab' || url === 'edge://newtab') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('qbrowse://') && !url.startsWith('file://')) {
    return false;
  }
  const title = typeof tab.title === 'string' ? tab.title.trim().toLowerCase() : '';
  if ((title === 'new tab' || title === 'new incognito tab') && (!url || url.startsWith('qbrowse://newtab') || url === 'about:blank')) {
    return false;
  }
  return true;
};

export const getCleanTabTitle = (tab) => {
  if (!tab) return '';
  const rawTitle = typeof tab.title === 'string' ? tab.title.trim() : '';
  const isPlaceholderTitle = !rawTitle || 
    rawTitle.toLowerCase() === 'new tab' || 
    rawTitle.toLowerCase() === 'new incognito tab' ||
    rawTitle.toLowerCase() === 'untitled';
  if (!isPlaceholderTitle) return rawTitle;
  if (tab.url) {
    try {
      const parsed = new URL(tab.url);
      return parsed.hostname.replace(/^www\./i, '') || tab.url;
    } catch {
      return tab.url;
    }
  }
  return 'Web Page';
};

export const getSpaceListName = (space) => {
  if (space === 'work') return 'workTabs';
  if (space === 'ghost') return 'ghostTabs';
  if (space === 'tor') return 'torTabs';
  return 'privateTabs';
};

export const getFallbackTabForSpace = (space) => {
  const isGhost = space === 'ghost';
  const isTor = space === 'tor';
  const prefix = isGhost ? 'g' : (isTor ? 'tor' : (space === 'work' ? 'w' : 't'));
  const title = isGhost ? 'New Incognito Tab' : (isTor ? 'New Tor Tab' : 'New Tab');
  return {
    id: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    url: '',
    active: true,
    folderId: null,
    lastActiveAt: Date.now(),
    suspended: false
  };
};

export const uuidv4 = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const useTabStore = create((set, get) => ({
  activeSpace: 'personal',
  getActiveTab: () => {
    const state = get();
    const space = state.activeSpace;
    const list = space === 'personal' ? state.privateTabs : (space === 'work' ? state.workTabs : (space === 'tor' ? (state.torTabs || []) : state.ghostTabs));
    return list.find(t => t.active) || list[0] || null;
  },
  getActiveList: () => {
    const state = get();
    const space = state.activeSpace;
    return space === 'personal' ? state.privateTabs : (space === 'work' ? state.workTabs : (space === 'tor' ? (state.torTabs || []) : state.ghostTabs));
  },
  setActiveSpace: (space) => set((state) => {
      const ui = useUIStore.getState();
      ui.setIsReaderAvailable(false);
      if (ui.isFindOpen) {
          ui.setIsFindOpen(false);
      }
      if (ui.isReaderOpen || ui.isReaderClosing) {
          ui.closeReaderMode(true);
      }
      const updates = { activeSpace: space };
      if (state.activeSpace === 'ghost' && space !== 'ghost') {
          updates.ghostTabs = [{ id: 'g-' + Date.now(), title: 'New Incognito Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
          if (window.electronAPI && window.electronAPI.clearGhostSession) {
              window.electronAPI.clearGhostSession().catch(() => {});
          }
      }
      if (state.activeSpace === 'tor' && space !== 'tor') {
          updates.torTabs = [{ id: 't-' + Date.now(), title: 'New Tor Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
          if (window.electronAPI && window.electronAPI.clearTorSession) {
              window.electronAPI.clearTorSession().catch(() => {});
          }
      }
      if (space === 'tor') {
          import('./useTorStore').then(m => {
              const torStore = m.default;
              torStore.setState({ isTorEnabled: true });
              const torStatus = torStore.getState().status;
              if (torStatus !== 'connected' && torStatus !== 'starting') {
                  torStore.getState().startTor();
              }
          }).catch(() => {});
      }
      return updates;
  }),

  bypassedInsecureHosts: new Set(),
  allowInsecureHost: (hostname) => {
    if (!hostname) return;
    const clean = hostname.toLowerCase().trim();
    const cleanNoWww = clean.replace(/^www\./, '');
    set(state => {
      const next = new Set(state.bypassedInsecureHosts);
      next.add(clean);
      next.add(cleanNoWww);
      return { bypassedInsecureHosts: next };
    });
    if (typeof window !== 'undefined' && window.electronAPI?.allowInsecureHost) {
      window.electronAPI.allowInsecureHost(clean).catch(() => {});
    }
  },
  isHostInsecureBypassed: (hostname) => {
    if (!hostname) return false;
    const clean = hostname.toLowerCase().trim();
    const set_ = get().bypassedInsecureHosts;
    return set_.has(clean) || set_.has(clean.replace(/^www\./, ''));
  },

  draggedItem: null,
  setDraggedItem: (item) => set({ draggedItem: item }),
  dragOverItem: null,
  setDragOverItem: (item) => set({ dragOverItem: item }),

  tabNodeOffsets: {},
  setTabNodeOffset: (tabId, offset) => {
    if (!tabId) return;
    set(state => {
      if (!offset) {
        if (!state.tabNodeOffsets || !state.tabNodeOffsets[tabId]) return {};
        const next = { ...state.tabNodeOffsets };
        delete next[tabId];
        return { tabNodeOffsets: next };
      }
      return {
        tabNodeOffsets: {
          ...state.tabNodeOffsets,
          [tabId]: { dx: Number(offset.dx) || 0, dy: Number(offset.dy) || 0 }
        }
      };
    });
  },
  setBatchTabNodeOffsets: (updatesMap) => {
    if (!updatesMap || typeof updatesMap !== 'object') return;
    set(state => {
      const next = { ...(state.tabNodeOffsets || {}) };
      let changed = false;
      for (const [tabId, offset] of Object.entries(updatesMap)) {
        if (!tabId) continue;
        if (!offset) {
          if (tabId in next) {
            delete next[tabId];
            changed = true;
          }
        } else {
          next[tabId] = { dx: Number(offset.dx) || 0, dy: Number(offset.dy) || 0 };
          changed = true;
        }
      }
      return changed ? { tabNodeOffsets: next } : {};
    });
  },
  clearAllTabNodeOffsets: () => set({ tabNodeOffsets: {} }),

  folders: [],
  renamingFolderId: null,
  setRenamingFolderId: (id) => set({ renamingFolderId: id }),
  setFolders: (folders) => set({ folders: typeof folders === 'function' ? folders(get().folders) : folders }),
  
  createFolder: (spaceType, name) => {
    const newFolder = { id: `f-${Date.now()}`, name, spaceType, isOpen: true };
    set(state => ({ folders: [...state.folders, newFolder] }));
    return newFolder.id;
  },
  
  renameFolder: (id, newName) => {
    set(state => ({ folders: state.folders.map(f => f.id === id ? { ...f, name: newName } : f) }));
  },
  
  deleteFolder: (id) => {
    // move tabs out of the folder
    const moveTabs = (list) => list.map(t => t.folderId === id ? { ...t, folderId: null } : t);
    set(state => ({
        privateTabs: moveTabs(state.privateTabs),
        workTabs: moveTabs(state.workTabs),
        ghostTabs: moveTabs(state.ghostTabs),
        torTabs: moveTabs(state.torTabs || []),
        folders: state.folders.filter(f => f.id !== id)
    }));
  },
  
  toggleFolder: (id) => {
    set(state => ({ folders: state.folders.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f) }));
  },

  pinnedTabs: (() => {
      try {
          const profileId = (() => {
              try { return localStorage.getItem('qbrowse_active_profile_id') || 'default'; } catch (_) { return 'default'; }
          })();
          const stored = localStorage.getItem(`qbrowse_pins_${profileId}`) || localStorage.getItem('qbrowse_pinned_tabs');
          if (stored !== null) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                  // If legacy default pin contains chatgpt, suggest/migrate to Gemini
                  const migrated = parsed.map(p => {
                      if (p.domain === 'chatgpt.com' || (p.title === 'ChatGPT' && String(p.domain).includes('chatgpt'))) {
                          return { ...p, title: 'Gemini', domain: 'gemini.google.com' };
                      }
                      return p;
                  });
                  return migrated;
              }
          }
      } catch(e) {}
      return [
          { id: 'pin-1', title: 'GitHub', domain: 'github.com' },
          { id: 'pin-2', title: 'YouTube', domain: 'youtube.com' },
          { id: 'pin-3', title: 'Gemini', domain: 'gemini.google.com' }
      ];
  })(),
  pinnedDomains: (() => {
      try {
          const profileId = (() => {
              try { return localStorage.getItem('qbrowse_active_profile_id') || 'default'; } catch (_) { return 'default'; }
          })();
          const stored = localStorage.getItem(`qbrowse_pins_${profileId}`) || localStorage.getItem('qbrowse_pinned_tabs');
          if (stored !== null) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                  return parsed.map(p => p.domain).filter(Boolean);
              }
          }
      } catch(e) {}
      return ['github.com', 'youtube.com', 'gemini.google.com'];
  })(),
  setPinnedTabs: (tabs) => {
      const list = Array.isArray(tabs) ? tabs : [];
      const domains = list.map(p => p.domain).filter(Boolean);
      set({ pinnedTabs: list, pinnedDomains: domains });
      try {
          localStorage.setItem('qbrowse_pinned_tabs', JSON.stringify(list));
          const profileId = window.__profileStore?.getState()?.activeProfileId || 'default';
          localStorage.setItem(`qbrowse_pins_${profileId}`, JSON.stringify(list));
      } catch(e) {}
      if (typeof window !== 'undefined' && window.__syncStore) {
          window.__syncStore.getState().triggerDebouncedSync?.(3000);
      }
  },

  addPinnedTab: (title, urlOrDomain) => {
      if (!urlOrDomain) return;
      let cleanDomain = urlOrDomain.trim().replace(/^https?:\/\//i, '').split('/')[0];
      const newPin = {
          id: 'pin-' + Date.now(),
          title: title ? title.trim() : cleanDomain,
          domain: cleanDomain
      };
      set(state => {
          const updated = [...state.pinnedTabs, newPin];
          const domains = updated.map(p => p.domain).filter(Boolean);
          try {
              localStorage.setItem('qbrowse_pinned_tabs', JSON.stringify(updated));
              const profileId = window.__profileStore?.getState()?.activeProfileId || 'default';
              localStorage.setItem(`qbrowse_pins_${profileId}`, JSON.stringify(updated));
          } catch(e) {}
          return { pinnedTabs: updated, pinnedDomains: domains };
      });
      useUIStore.getState().showToast(`Pinned "${newPin.title}" to sidebar`);
      if (typeof window !== 'undefined' && window.__syncStore) {
          window.__syncStore.getState().triggerDebouncedSync?.(3000);
      }
  },

  handleUnpinTab: (pin) => {
      const pinId = pin?.id || pin;
      set(state => {
          const updated = state.pinnedTabs.filter(p => p.id !== pinId);
          const domains = updated.map(p => p.domain).filter(Boolean);
          try {
              localStorage.setItem('qbrowse_pinned_tabs', JSON.stringify(updated));
              const profileId = window.__profileStore?.getState()?.activeProfileId || 'default';
              localStorage.setItem(`qbrowse_pins_${profileId}`, JSON.stringify(updated));
          } catch(e) {}
          return { pinnedTabs: updated, pinnedDomains: domains };
      });
      useUIStore.getState().showToast(`Unpinned "${pin?.title || 'app'}"`);
      if (typeof window !== 'undefined' && window.__syncStore) {
          window.__syncStore.getState().triggerDebouncedSync?.(3000);
      }
  },

  getSpaceListName: (space) => getSpaceListName(space),
  getFallbackTabForSpace: (space) => getFallbackTabForSpace(space),

  privateTabs: [
    { id: 't1', title: 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }
  ],
  setPrivateTabs: (tabs) => set({ privateTabs: typeof tabs === 'function' ? tabs(get().privateTabs) : tabs }),

  workTabs: [
    { id: 'w1', title: 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }
  ],
  setWorkTabs: (tabs) => set({ workTabs: typeof tabs === 'function' ? tabs(get().workTabs) : tabs }),

  ghostTabs: [
    { id: 'g1', title: 'New Incognito Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }
  ],
  setGhostTabs: (tabs) => set({ ghostTabs: typeof tabs === 'function' ? tabs(get().ghostTabs) : tabs }),

  torTabs: [
    { id: 'tor1', title: 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }
  ],
  setTorTabs: (tabs) => set({ torTabs: typeof tabs === 'function' ? tabs(get().torTabs) : tabs }),

  closedTabs: [],
  pushClosedTab: (tab) => set(state => ({ closedTabs: [...state.closedTabs, tab].slice(-20) })),
  reopenLastClosedTab: () => {
      const closedTabs = get().closedTabs;
      if (closedTabs.length > 0) {
          const tabToRestore = closedTabs[closedTabs.length - 1];
          set(state => ({ closedTabs: closedTabs.slice(0, -1) }));
          get().addTab({ ...tabToRestore, active: true, id: `t-${Date.now()}` });
      }
  },

  cloudTabs: { privateTabs: [], workTabs: [] },
  setCloudTabs: (tabs) => {
      const cleanPrivateTabs = Array.isArray(tabs?.privateTabs) 
          ? tabs.privateTabs.filter(isValidSyncTab) 
          : [];
      const cleanWorkTabs = Array.isArray(tabs?.workTabs) 
          ? tabs.workTabs.filter(isValidSyncTab) 
          : [];
      set({ cloudTabs: { privateTabs: cleanPrivateTabs, workTabs: cleanWorkTabs } });
  },

  openCloudTab: (cloudTab, space) => {
      if (!isValidSyncTab(cloudTab)) {
          useUIStore.getState().showToast('Cannot open empty tab');
          return;
      }
      const targetSpace = space || get().activeSpace || 'personal';
      const id = `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      get().setActiveSpace(targetSpace);
      const cleanTitle = getCleanTabTitle(cloudTab);
      get().addTab({
          id,
          title: cleanTitle,
          url: cloudTab.url,
          active: true,
          folderId: null
      });
      useUIStore.getState().showToast(`Opened: ${cleanTitle}`);
  },

  restoreAllCloudTabs: (targetSpace) => {
      const { cloudTabs } = get();
      const rawPrivate = Array.isArray(cloudTabs?.privateTabs) ? cloudTabs.privateTabs.filter(isValidSyncTab) : [];
      const rawWork = Array.isArray(cloudTabs?.workTabs) ? cloudTabs.workTabs.filter(isValidSyncTab) : [];
      const allTabs = [...rawPrivate, ...rawWork];
      if (allTabs.length === 0) {
          useUIStore.getState().showToast('No cloud tabs found to restore');
          return;
      }
      const spaceToUse = targetSpace || get().activeSpace || 'personal';
      get().setActiveSpace(spaceToUse);
      let count = 0;
      allTabs.forEach((tab, index) => {
          count++;
          get().addTab({
              id: `t-cloud-${Date.now()}-${index}`,
              title: getCleanTabTitle(tab),
              url: tab.url,
              active: index === 0,
              folderId: null
          });
      });
      useUIStore.getState().showToast(`Restored ${count} tabs from other devices!`);
  },

  // Actions
  getActiveList: () => {
    const space = get().activeSpace;
    if (space === 'personal') return get().privateTabs;
    if (space === 'work') return get().workTabs;
    if (space === 'ghost') return get().ghostTabs;
    if (space === 'tor') return get().torTabs;
    return get().privateTabs;
  },
  
  getActiveTab: () => {
    const list = get().getActiveList();
    return list.find(t => t.active) || list[0] || null;
  },

  getActiveSetList: () => {
    const space = get().activeSpace;
    if (space === 'personal') return get().setPrivateTabs;
    if (space === 'work') return get().setWorkTabs;
    if (space === 'ghost') return get().setGhostTabs;
    if (space === 'tor') return get().setTorTabs;
    return get().setPrivateTabs;
  },

  reorderTabs: (draggedId, targetId) => {
    if (draggedId === targetId) return;
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    
    const draggedIndex = list.findIndex(t => t.id === draggedId);
    const targetIndex = list.findIndex(t => t.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newList = [...list];
    const [draggedTab] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedTab);
    
    setList(newList);
  },

  addTab: (arg1, arg2, arg3) => {
    let space;
    let tabObj;

    if (typeof arg1 === 'string' && (['personal', 'work', 'ghost', 'tor'].includes(arg1) || typeof arg2 === 'string')) {
      space = ['personal', 'work', 'ghost', 'tor'].includes(arg1) ? arg1 : get().activeSpace;
      const url = typeof arg2 === 'string' ? arg2 : '';
      const customProps = (typeof arg3 === 'object' && arg3 !== null) ? arg3 : {};
      tabObj = {
        url,
        ...customProps
      };
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      tabObj = { ...arg1 };
      space = tabObj.space || tabObj.spaceType || get().activeSpace;
    } else {
      tabObj = {};
      space = get().activeSpace;
    }

    const isGhost = space === 'ghost';
    const isTor = space === 'tor';
    const defaultTitle = isGhost ? 'New Incognito Tab' : (isTor ? 'New Tor Tab' : 'New Tab');
    const safeTitle = (typeof tabObj.title === 'string' && tabObj.title.trim()) ? tabObj.title : defaultTitle;
    const safeUrl = (typeof tabObj.url === 'string') ? tabObj.url : '';
    const shouldBeActive = tabObj.active !== undefined ? tabObj.active : true;

    // Preserve or auto-populate openerTabId
    let resolvedOpenerId = null;
    if (tabObj.openerTabId !== undefined) {
      resolvedOpenerId = tabObj.openerTabId;
    } else if (safeUrl && !safeUrl.startsWith('qbrowse://newtab') && safeUrl !== 'about:blank') {
      const activeTab = get().getActiveTab();
      resolvedOpenerId = activeTab?.id || null;
    }

    const newTab = {
      ...tabObj,
      title: safeTitle,
      url: safeUrl,
      active: shouldBeActive,
      lastActiveAt: Date.now(),
      suspended: false,
      openerTabId: resolvedOpenerId
    };

    const getSetList = (sp) => {
      if (sp === 'personal') return get().setPrivateTabs;
      if (sp === 'work') return get().setWorkTabs;
      if (sp === 'ghost') return get().setGhostTabs;
      if (sp === 'tor') return get().setTorTabs;
      return get().getActiveSetList();
    };
    const setList = getSetList(space);

    if (shouldBeActive) {
      setList(prev => [...(Array.isArray(prev) ? prev : []).map(t => ({ ...t, active: false })), newTab]);
      if (space === get().activeSpace) {
        const ui = useUIStore.getState();
        ui.setCurrentUrl(safeUrl);
        ui.setIsReaderAvailable(false);
        if (ui.isReaderOpen || ui.isReaderClosing) {
          ui.closeReaderMode(true);
        }
      }
    } else {
      setList(prev => [...(Array.isArray(prev) ? prev : []), newTab]);
    }
    const ui = useUIStore.getState();
    ui.showToast(isTor ? 'New Tor tab created' : (isGhost ? 'New incognito tab created' : 'New tab created'));
    return newTab;
  },

  handleNewTab: (url = '', makeActive = true, meta = {}) => {
    const activeSpace = get().activeSpace;
    const isGhost = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const cleanUrl = (typeof url === 'string') ? url.trim() : '';

    // Direct app protocol redirect: launch external app without creating a blank/failing tab
    if (cleanUrl && window.electronAPI?.isAppProtocol?.(cleanUrl)) {
        window.electronAPI.openAppProtocol(cleanUrl);
        return;
    }

    const list = get().getActiveList();
    const now = Date.now();
    // Prevent duplicate tab opening if same URL was opened within the last 800ms
    if (cleanUrl && cleanUrl !== 'about:blank') {
        const recentDuplicate = list.find(t => t.url === cleanUrl && now - (t.lastActiveAt || 0) < 800);
        if (recentDuplicate) return;
    }
    const defaultTitle = isGhost ? 'New Incognito Tab' : 'New Tab';
    const defaultUrl = '';
    const targetTitle = (cleanUrl && cleanUrl !== 'about:blank') ? cleanUrl : defaultTitle;
    get().addTab({ 
        id: `t-${now}-${Math.floor(Math.random() * 1000)}`, 
        title: targetTitle, 
        url: cleanUrl || defaultUrl, 
        active: makeActive, 
        folderId: null,
        createdAt: now,
        ...meta
    });
  },

  setTabWebContentsId: (tabId, webContentsId) => {
    if (!tabId || !webContentsId) return;
    const updateList = (list) => list.map(t => t.id === tabId ? { ...t, webContentsId } : t);
    set(state => ({
        privateTabs: updateList(state.privateTabs),
        workTabs: updateList(state.workTabs),
        ghostTabs: updateList(state.ghostTabs),
        torTabs: updateList(state.torTabs || [])
    }));
  },

  setTabNavigatedToDocument: (tabId) => {
    if (!tabId) return;
    const updateList = (list) => list.map(t => t.id === tabId ? { ...t, hasNavigatedToDocument: true } : t);
    set(state => ({
        privateTabs: updateList(state.privateTabs),
        workTabs: updateList(state.workTabs),
        ghostTabs: updateList(state.ghostTabs),
        torTabs: updateList(state.torTabs || [])
    }));
  },

  closeDownloadTabIfOrphaned: (downloadData) => {
    if (!downloadData) return;
    const { url, urlChain, webContentsId, canGoBack } = downloadData;
    const { privateTabs, workTabs, ghostTabs, torTabs, handleCloseTab } = get();

    const allSpaces = [
        { type: 'personal', list: privateTabs },
        { type: 'work', list: workTabs },
        { type: 'ghost', list: ghostTabs },
        { type: 'tor', list: torTabs || [] }
    ];

    const targetUrls = new Set();
    const normalizeUrl = (u) => {
        if (!u || typeof u !== 'string') return '';
        try {
            const parsed = new URL(u);
            return (parsed.origin + parsed.pathname).toLowerCase().replace(/\/$/, '');
        } catch (_) {
            return u.split('?')[0].split('#')[0].toLowerCase().trim().replace(/\/$/, '');
        }
    };

    if (url) {
        targetUrls.add(url.toLowerCase().trim());
        const norm = normalizeUrl(url);
        if (norm) targetUrls.add(norm);
    }
    if (Array.isArray(urlChain)) {
        for (const u of urlChain) {
            if (u && typeof u === 'string') {
                targetUrls.add(u.toLowerCase().trim());
                const norm = normalizeUrl(u);
                if (norm) targetUrls.add(norm);
            }
        }
    }

    for (const { type, list } of allSpaces) {
        for (const tab of list) {
            if (!tab || tab.isPinned || tab.isClosing) continue;

            const tabUrl = (tab.url || '').toLowerCase().trim();
            const tabNorm = normalizeUrl(tab.url);

            const tabMatchesUrl = (tabUrl && targetUrls.has(tabUrl)) || 
                (tabNorm && targetUrls.has(tabNorm)) || 
                (Array.isArray(urlChain) && urlChain.some(u => {
                    if (!u || !tab.url) return false;
                    const cleanU = u.trim().toLowerCase();
                    return tabUrl === cleanU || tabUrl.startsWith(cleanU) || cleanU.startsWith(tabUrl);
                }));

            const tabMatchesWc = Boolean(webContentsId && tab.webContentsId && tab.webContentsId === webContentsId);

            if (tabMatchesWc || tabMatchesUrl) {
                // Determine if this tab is an orphaned tab opened purely for this download
                // A tab is an orphaned download tab ONLY if:
                // 1) It was explicitly designated as a download tab (tab.isDownloadTab), OR
                // 2) It never navigated to a document (!tab.hasNavigatedToDocument && !canGoBack) AND was opened by a new window / blank popup.
                const isExplicitDownloadTab = Boolean(tab.isDownloadTab);
                const isBlankOrNeverNavigated = !tab.hasNavigatedToDocument && !canGoBack;
                const isOrphaned = isExplicitDownloadTab || (isBlankOrNeverNavigated && (tab.isOpenedByNewWindow || !tab.url || tab.url === 'about:blank'));

                if (isOrphaned) {
                    console.log(`[TabStore] Automatically closing orphaned download tab ${tab.id} (${tab.title || tab.url})`);
                    
                    // Mark as orphaned download so it won't be pushed into recentlyClosedTabs
                    tab.isOrphanedDownload = true;

                    // If this tab was active, restore focus to opener tab or fallback tab
                    if (tab.active && tab.openerTabId) {
                        const openerStillExists = list.some(t => t.id === tab.openerTabId && !t.isClosing);
                        if (openerStillExists) {
                            get().setActiveTab(tab.openerTabId);
                        }
                    }

                    // Gracefully close the orphaned tab
                    handleCloseTab(tab.id);
                    return;
                }
            }
        }
    }
  },

  suspendTab: (tabId, silent = false) => {
      const { privateTabs, setPrivateTabs, workTabs, setWorkTabs, ghostTabs, setGhostTabs, torTabs, setTorTabs, pinnedTabs } = get();
      const updateList = (list, setList) => {
          if (list.some(t => t.id === tabId)) {
              const tab = list.find(t => t.id === tabId);
              if (tab.active) {
                  if (!silent) useUIStore.getState().showToast('Cannot suspend active tab');
                  return true;
              }
              if (tab.isAudible || tab.hasAudio) {
                  if (!silent) useUIStore.getState().showToast('Cannot suspend tab playing audio');
                  return true;
              }
              if (tab.isPinned || (pinnedTabs && pinnedTabs.some(p => p.domain && tab.url && tab.url.includes(p.domain)))) {
                  if (!silent) useUIStore.getState().showToast('Cannot suspend pinned tab');
                  return true;
              }
              if (tab.isDownloading) {
                  if (!silent) useUIStore.getState().showToast('Cannot suspend tab with active download');
                  return true;
              }
              setList(list.map(t => t.id === tabId ? { ...t, suspended: true, suspendedAt: Date.now() } : t));
              if (!silent) useUIStore.getState().showToast('Tab suspended to save memory');
              return true;
          }
          return false;
      };
      
      if (updateList(privateTabs, setPrivateTabs)) return;
      if (updateList(workTabs, setWorkTabs)) return;
      if (updateList(ghostTabs, setGhostTabs)) return;
      if (updateList(torTabs, setTorTabs)) return;
  },

  wakeTab: (tabId, silent = false) => {
      const { privateTabs, setPrivateTabs, workTabs, setWorkTabs, ghostTabs, setGhostTabs, torTabs, setTorTabs } = get();
      const updateList = (list, setList) => {
          if (list.some(t => t.id === tabId)) {
              setList(list.map(t => t.id === tabId ? { ...t, suspended: false, lastActiveAt: Date.now() } : t));
              if (!silent) useUIStore.getState().showToast('Tab restored from sleep');
              return true;
          }
          return false;
      };
      
      if (updateList(privateTabs, setPrivateTabs)) return;
      if (updateList(workTabs, setWorkTabs)) return;
      if (updateList(ghostTabs, setGhostTabs)) return;
      if (updateList(torTabs, setTorTabs)) return;
  },

  handleSwitchToTab: (tabId, targetSpace = null) => {
    const { privateTabs, setPrivateTabs, workTabs, setWorkTabs, ghostTabs, setGhostTabs, torTabs, setTorTabs, activeSpace, setActiveSpace } = get();
    let space = targetSpace || activeSpace;
    let list, setList;
    if (privateTabs.some(t => t.id === tabId)) { space = 'personal'; list = privateTabs; setList = setPrivateTabs; }
    else if (workTabs.some(t => t.id === tabId)) { space = 'work'; list = workTabs; setList = setWorkTabs; }
    else if (ghostTabs.some(t => t.id === tabId)) { space = 'ghost'; list = ghostTabs; setList = setGhostTabs; }
    else if (torTabs.some(t => t.id === tabId)) { space = 'tor'; list = torTabs; setList = setTorTabs; }
    
    if (list && setList) {
      if (activeSpace !== space) {
        setActiveSpace(space);
      }
      setList(list.map(t => ({
        ...t,
        active: t.id === tabId,
        suspended: t.id === tabId ? false : t.suspended,
        lastActiveAt: t.id === tabId ? Date.now() : t.lastActiveAt
      })));
      const target = list.find(t => t.id === tabId);
      if (target) {
        useUIStore.getState().setCurrentUrl(target.url || '');
      }
    }
  },

  closeTabsBatch: (tabIds) => {
      const ids = (Array.isArray(tabIds) ? tabIds : [tabIds]).filter(Boolean);
      if (ids.length === 0) return 0;
      const idSet = new Set(ids);
      const state = get();
      const validSpaces = ['personal', 'work', 'ghost', 'tor'];
      const updates = {};
      const nextOffsets = { ...(state.tabNodeOffsets || {}) };
      const newlyClosedForRestore = [];
      let closedCount = 0;

      const uiStore = useUIStore.getState();
      if (uiStore.isSplitView && uiStore.splitRightTabId && idSet.has(uiStore.splitRightTabId)) {
          uiStore.setSplitRightTabId(null);
          uiStore.toggleSplitView();
      }

      validSpaces.forEach(space => {
          const listName = space === 'personal' ? 'privateTabs' : (space === 'work' ? 'workTabs' : (space === 'ghost' ? 'ghostTabs' : 'torTabs'));
          const list = state[listName] || [];
          const removed = [];
          const remaining = [];

          list.forEach(t => {
              if (idSet.has(t.id)) {
                  removed.push(t);
              } else {
                  remaining.push(t);
              }
          });

          if (removed.length > 0) {
              closedCount += removed.length;
              removed.forEach(t => {
                  delete nextOffsets[t.id];
                  if (space !== 'ghost' && space !== 'tor' && t.url && t.url !== 'about:blank' && !t.url.includes('.onion')) {
                      newlyClosedForRestore.push({ url: t.url, title: t.title, space });
                  }
              });

              if (remaining.length === 0) {
                  const fallback = get().getFallbackTabForSpace(space);
                  updates[listName] = [fallback];
                  if (space === state.activeSpace) {
                      uiStore.setCurrentUrl('');
                  }
              } else {
                  if (!remaining.some(t => t.active)) {
                      const nextActiveIdx = Math.max(0, remaining.length - 1);
                      remaining[nextActiveIdx] = {
                          ...remaining[nextActiveIdx],
                          active: true,
                          suspended: false,
                          lastActiveAt: Date.now()
                      };
                      if (space === state.activeSpace) {
                          uiStore.setCurrentUrl(remaining[nextActiveIdx].url || '');
                      }
                  }
                  updates[listName] = remaining;
              }
          }
      });

      if (closedCount > 0) {
          updates.tabNodeOffsets = nextOffsets;
          if (newlyClosedForRestore.length > 0) {
              updates.recentlyClosedTabs = [
                  ...(state.recentlyClosedTabs || []).slice(-19),
                  ...newlyClosedForRestore
              ].slice(-20);
          }
          set(updates);
          get().saveSession();
      }
      return closedCount;
  },

  closeTabById: (tabId) => {
      const { privateTabs, workTabs, ghostTabs, torTabs, handleCloseTab, activeSpace } = get();
      let targetSpace = activeSpace;
      if (privateTabs.some(t => t.id === tabId)) targetSpace = 'personal';
      else if (workTabs.some(t => t.id === tabId)) targetSpace = 'work';
      else if (ghostTabs.some(t => t.id === tabId)) targetSpace = 'ghost';
      else if ((torTabs || []).some(t => t.id === tabId)) targetSpace = 'tor';

      if (activeSpace === targetSpace) {
          handleCloseTab(tabId);
      } else {
          get().closeTabsBatch([tabId]);
      }
  },

  recentlyClosedTabs: [],
  restoreRecentlyClosedTab: () => {
    const { recentlyClosedTabs, activeSpace, handleNewTab, setActiveSpace } = get();
    if (!recentlyClosedTabs || recentlyClosedTabs.length === 0) {
      useUIStore.getState().showToast('No recently closed tabs to restore');
      return;
    }
    const recent = recentlyClosedTabs[recentlyClosedTabs.length - 1];
    set({ recentlyClosedTabs: recentlyClosedTabs.slice(0, -1) });
    if (recent.space && recent.space !== activeSpace) {
      setActiveSpace(recent.space);
    }
    handleNewTab(recent.url);
    useUIStore.getState().showToast(`Restored tab: ${recent.title || recent.url}`);
  },

  updateTabActivity: (id) => {
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    setList(list.map(t => t.id === id ? { ...t, lastActiveAt: Date.now() } : t));
  },

  navigateTabBack: (tabId) => {
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    const tab = list.find(t => t.id === tabId);
    
    if (tab && tab.history && tab.historyIndex > 0) {
        const newIdx = tab.historyIndex - 1;
        const newUrl = tab.history[newIdx];
        setList(list.map(t => t.id === tabId ? { ...t, url: newUrl, historyIndex: newIdx } : t));
        useUIStore.getState().setCurrentUrl(newUrl);
        return newUrl;
    }
    return null;
  },

  navigateTabForward: (tabId) => {
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    const tab = list.find(t => t.id === tabId);
    
    if (tab && tab.history && tab.historyIndex < tab.history.length - 1) {
        const newIdx = tab.historyIndex + 1;
        const newUrl = tab.history[newIdx];
        setList(list.map(t => t.id === tabId ? { ...t, url: newUrl, historyIndex: newIdx } : t));
        useUIStore.getState().setCurrentUrl(newUrl);
        return newUrl;
    }
    return null;
  },

  handleCloseTab: (id) => {
    // Dismiss hover preview immediately so tooltips never get stuck
    useUIStore.getState().setHoverPreview(null);

    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    const currentSpace = get().activeSpace;
    const defaultTitle = currentSpace === 'ghost' ? 'New Incognito Tab' : (currentSpace === 'tor' ? 'New Tor Tab' : 'New Tab');
    
    const tabToClose = list.find(t => t.id === id);
    if (!tabToClose || tabToClose.isClosing) return;

    // Alive tabs are those not currently in closing animation
    const aliveTabs = list.filter(t => !t.isClosing);
    const isLastAliveTab = aliveTabs.length <= 1 && aliveTabs.some(t => t.id === id);

    // If the closed tab is active (or last tab remaining), discard find in page and reader mode
    const uiStore = useUIStore.getState();
    if (tabToClose.active || isLastAliveTab) {
        if (uiStore.isFindOpen) {
            uiStore.setIsFindOpen(false);
        }
        uiStore.setIsReaderAvailable(false);
        if (uiStore.isReaderOpen || uiStore.isReaderClosing) {
            uiStore.closeReaderMode(true);
        }
    }

    // Track in recently closed tabs for Cmd+Shift+T restore (Strict privacy: never for ghost, tor, or .onion, nor download tabs)
    if (!tabToClose.isOrphanedDownload && !tabToClose.isDownloadTab && tabToClose.url && tabToClose.url !== 'about:blank' && currentSpace !== 'ghost' && currentSpace !== 'tor' && !tabToClose.url.includes('.onion')) {
        set(state => ({
            recentlyClosedTabs: [
                ...(state.recentlyClosedTabs || []).slice(-19),
                { url: tabToClose.url, title: tabToClose.title, space: currentSpace }
            ]
        }));
    }

    // Reset split view if the closing tab was in split view
    const { splitRightTabId, setSplitRightTabId, isSplitView, toggleSplitView } = useUIStore.getState();
    if (isSplitView && splitRightTabId === id) {
        setSplitRightTabId(null);
        toggleSplitView();
    }

    // CASE 1: THIS IS THE LAST ALIVE TAB IN THE SPACE
    if (isLastAliveTab) {
        // If this tab was already an empty New Tab on Zen Dashboard, closing it keeps it on Zen Dashboard
        if (!tabToClose.url || tabToClose.url === '' || tabToClose.url === 'about:blank') {
            uiStore.setCurrentUrl('');
            return;
        }

        // Seamlessly reset this tab to a fresh New Tab (Zen Dashboard)
        setList(list.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    url: '',
                    title: defaultTitle,
                    active: true,
                    thumbnail: null,
                    isClosing: false,
                    lastActiveAt: Date.now(),
                    suspended: false
                };
            }
            return t;
        }));

        const ui = useUIStore.getState();
        ui.setCurrentUrl('');
        ui.setIsReaderAvailable(false);
        if (ui.isFindOpen) ui.setIsFindOpen(false);
        if (ui.isReaderOpen || ui.isReaderClosing) ui.closeReaderMode(true);

        if (currentSpace === 'ghost' && window.electronAPI && window.electronAPI.clearGhostSession) {
            window.electronAPI.clearGhostSession().catch(() => {});
        }
        if (currentSpace === 'tor' && window.electronAPI && window.electronAPI.clearTorSession) {
            window.electronAPI.clearTorSession().catch(() => {});
        }
        return;
    }

    // CASE 2: THERE ARE OTHER ALIVE TABS REMAINING
    let nextActiveId = null;
    let nextUrl = '';

    if (tabToClose.active) {
        const remainingAlive = aliveTabs.filter(t => t.id !== id);
        if (remainingAlive.length > 0) {
            const closedIdxInAlive = aliveTabs.findIndex(t => t.id === id);
            // Activate previous alive tab or next alive tab
            const targetIdx = Math.max(0, closedIdxInAlive > 0 ? closedIdxInAlive - 1 : 0);
            const targetTab = remainingAlive[Math.min(targetIdx, remainingAlive.length - 1)];
            if (targetTab) {
                nextActiveId = targetTab.id;
                nextUrl = targetTab.url || '';
            }
        }
    }

    // Set closing flag; if it was active, seamlessly transfer active to next tab right away
    setList(list.map(t => {
        if (t.id === id) {
            return { ...t, isClosing: true, thumbnail: null, active: false };
        }
        if (nextActiveId && t.id === nextActiveId) {
            return { ...t, active: true, suspended: false, lastActiveAt: Date.now() };
        }
        return t;
    }));

    if (nextActiveId) {
        const ui = useUIStore.getState();
        ui.setCurrentUrl(nextUrl);
        ui.setIsReaderAvailable(false);
    }

    // Remove the tab after its exit animation finishes (250ms)
    setTimeout(() => {
        const currentList = get().getActiveList();
        let newList = currentList.filter(t => t.id !== id);
        
        // Guarantee at least one alive tab exists in the space
        const aliveInNew = newList.filter(t => !t.isClosing);
        if (aliveInNew.length === 0) {
            newList = [{
                id: `t-${Date.now()}`,
                title: defaultTitle,
                url: '',
                active: true,
                folderId: null,
                lastActiveAt: Date.now(),
                suspended: false,
                isClosing: false
            }];
            const ui = useUIStore.getState();
            ui.setCurrentUrl('');
            ui.setIsReaderAvailable(false);
        } else {
            // Guarantee at least one tab is active
            const hasActive = newList.some(t => t.active && !t.isClosing);
            if (!hasActive) {
                const firstAlive = aliveInNew[0];
                newList = newList.map(t => ({
                    ...t,
                    active: t.id === firstAlive.id
                }));
                const ui = useUIStore.getState();
                ui.setCurrentUrl(firstAlive.url || '');
                ui.setIsReaderAvailable(false);
            }
        }
        
        setList(newList);
    }, 250);
  },

  duplicateTab: (tabId, spaceType) => {
    const space = spaceType || get().activeSpace || 'personal';
    const list = space === 'personal' ? get().privateTabs : (space === 'work' ? get().workTabs : (space === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = space === 'personal' ? get().setPrivateTabs : (space === 'work' ? get().setWorkTabs : (space === 'ghost' ? get().setGhostTabs : get().setTorTabs));

    const sourceIdx = list.findIndex(t => t.id === tabId);
    if (sourceIdx === -1) return;
    const sourceTab = list[sourceIdx];

    const newTabId = `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const clonedTab = {
      ...sourceTab,
      id: newTabId,
      title: sourceTab.title || 'New Tab',
      url: sourceTab.url || '',
      active: true,
      lastActiveAt: Date.now(),
      suspended: false,
      isClosing: false
    };

    const nextList = list.map(t => ({ ...t, active: false }));
    nextList.splice(sourceIdx + 1, 0, clonedTab);
    setList(nextList);

    const ui = useUIStore.getState();
    ui.setCurrentUrl(clonedTab.url);
    ui.showToast(`Duplicated "${clonedTab.title}"`);
    return newTabId;
  },

  closeOtherTabs: (tabId, spaceType) => {
    const space = spaceType || get().activeSpace || 'personal';
    const list = space === 'personal' ? get().privateTabs : (space === 'work' ? get().workTabs : (space === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = space === 'personal' ? get().setPrivateTabs : (space === 'work' ? get().setWorkTabs : (space === 'ghost' ? get().setGhostTabs : get().setTorTabs));

    const targetTab = list.find(t => t.id === tabId);
    if (!targetTab) return;

    // Track closed tabs in recentlyClosedTabs (Strict privacy: never for ghost or tor)
    if (space !== 'ghost' && space !== 'tor') {
      const closed = list.filter(t => t.id !== tabId && t.url && t.url !== 'about:blank' && !t.url.includes('.onion'));
      if (closed.length > 0) {
        set(state => ({
          recentlyClosedTabs: [
            ...(state.recentlyClosedTabs || []).slice(-15),
            ...closed.map(t => ({ url: t.url, title: t.title, space }))
          ]
        }));
      }
    }

    const nextList = [{ ...targetTab, active: true, suspended: false, lastActiveAt: Date.now() }];
    setList(nextList);

    const ui = useUIStore.getState();
    ui.setCurrentUrl(targetTab.url || '');
    ui.showToast('Closed other tabs');
  },

  closeTabsBelow: (tabId, spaceType) => {
    const space = spaceType || get().activeSpace || 'personal';
    const list = space === 'personal' ? get().privateTabs : (space === 'work' ? get().workTabs : (space === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = space === 'personal' ? get().setPrivateTabs : (space === 'work' ? get().setWorkTabs : (space === 'ghost' ? get().setGhostTabs : get().setTorTabs));

    const targetIdx = list.findIndex(t => t.id === tabId);
    if (targetIdx === -1 || targetIdx === list.length - 1) return;

    const remaining = list.slice(0, targetIdx + 1);
    if (space !== 'ghost' && space !== 'tor') {
      const closed = list.slice(targetIdx + 1).filter(t => t.url && t.url !== 'about:blank' && !t.url.includes('.onion'));
      if (closed.length > 0) {
        set(state => ({
          recentlyClosedTabs: [
            ...(state.recentlyClosedTabs || []).slice(-15),
            ...closed.map(t => ({ url: t.url, title: t.title, space }))
          ]
        }));
      }
    }

    const hasActive = remaining.some(t => t.active);
    if (!hasActive && remaining.length > 0) {
      remaining[targetIdx].active = true;
      useUIStore.getState().setCurrentUrl(remaining[targetIdx].url || '');
    }

    setList(remaining);
    useUIStore.getState().showToast('Closed tabs below');
  },

  moveTabToSpace: (tabId, sourceSpace, targetSpace) => {
    if (!tabId || !targetSpace) return;

    const spaces = ['personal', 'work', 'ghost', 'tor'];
    const listKeyBySpace = {
      personal: 'privateTabs',
      work: 'workTabs',
      ghost: 'ghostTabs',
      tor: 'torTabs'
    };

    const state = get();
    let resolvedSourceSpace = null;
    let tabToMove = null;

    // Check sourceSpace first if provided
    if (sourceSpace && spaces.includes(sourceSpace)) {
      const list = state[listKeyBySpace[sourceSpace]] || [];
      const found = list.find(t => t && t.id === tabId);
      if (found) {
        resolvedSourceSpace = sourceSpace;
        tabToMove = found;
      }
    }

    // If not found in sourceSpace (or if sourceSpace was not passed), search across all spaces
    if (!tabToMove) {
      for (const sp of spaces) {
        const list = state[listKeyBySpace[sp]] || [];
        const found = list.find(t => t && t.id === tabId);
        if (found) {
          resolvedSourceSpace = sp;
          tabToMove = found;
          break;
        }
      }
    }

    if (!tabToMove || !resolvedSourceSpace || resolvedSourceSpace === targetSpace) return;

    const srcKey = listKeyBySpace[resolvedSourceSpace];
    const dstKey = listKeyBySpace[targetSpace];
    if (!srcKey || !dstKey) return;

    const srcList = state[srcKey] || [];
    const dstList = state[dstKey] || [];

    // Remove tabToMove from resolvedSourceSpace's list
    let nextSrc = srcList.filter(t => t && t.id !== tabId);
    if (nextSrc.length === 0) {
      nextSrc = [get().getFallbackTabForSpace(resolvedSourceSpace)];
    } else if (!nextSrc.some(t => t && t.active)) {
      nextSrc = nextSrc.map((t, idx) => idx === 0 ? { ...t, active: true } : t);
    }

    // Add movedTab to targetSpace's list (marking existing tabs in targetSpace as active: false)
    const movedTab = { ...tabToMove, folderId: null, active: true, lastActiveAt: Date.now() };
    const nextDst = [...dstList.map(t => ({ ...t, active: false })), movedTab];

    const updates = {
      [srcKey]: nextSrc,
      [dstKey]: nextDst
    };

    // Clear any tabNodeOffsets for tabId so the Spatial Tab Map stays in sync
    const currentOffsets = state.tabNodeOffsets || {};
    if (tabId in currentOffsets) {
      const nextOffsets = { ...currentOffsets };
      delete nextOffsets[tabId];
      updates.tabNodeOffsets = nextOffsets;
    }

    set(updates);

    // Switch active space to target
    get().setActiveSpace(targetSpace);
    if (targetSpace === 'ghost' || targetSpace === 'tor') {
      set({ [dstKey]: nextDst });
    }

    const ui = useUIStore.getState();
    ui.setCurrentUrl(movedTab.url || '');
    get().saveSession();

    const spaceLabel = targetSpace.charAt(0).toUpperCase() + targetSpace.slice(1);
    ui.showToast(`Moved "${tabToMove.title || 'Tab'}" to ${spaceLabel} space`);
  },

  saveSession: () => {
    try {
      const profileId = (typeof window !== 'undefined' && window.__profileStore?.getState()?.activeProfileId) || 
        (() => { try { return localStorage.getItem('qbrowse_active_profile_id') || 'default'; } catch (_) { return 'default'; } })();
      get().serializeCurrentProfileTabs(profileId);
    } catch (_) {}
    if (typeof window !== 'undefined' && window.__syncStore) {
      window.__syncStore.getState().triggerDebouncedSync?.(3000);
    }
  },

  moveTabsToZone: (tabIds, targetSpace, targetFolderId = null) => {
    const ids = (Array.isArray(tabIds) ? tabIds : [tabIds]).filter(Boolean);
    if (ids.length === 0) return;
    const validSpaces = ['personal', 'work', 'ghost', 'tor'];
    if (!validSpaces.includes(targetSpace)) return;

    const state = get();
    const idSet = new Set(ids);

    // Verify at least one tab exists across spaces
    let totalFound = 0;
    validSpaces.forEach(sp => {
      const listName = sp === 'personal' ? 'privateTabs' : (sp === 'work' ? 'workTabs' : (sp === 'ghost' ? 'ghostTabs' : 'torTabs'));
      const list = state[listName] || [];
      list.forEach(t => {
        if (idSet.has(t.id)) totalFound++;
      });
    });

    if (totalFound === 0) return;

    const updates = {};
    const movedFromOtherSpaces = [];

    // Process source spaces that are NOT targetSpace
    validSpaces.forEach(sp => {
      if (sp === targetSpace) return;
      const listName = sp === 'personal' ? 'privateTabs' : (sp === 'work' ? 'workTabs' : (sp === 'ghost' ? 'ghostTabs' : 'torTabs'));
      const currentList = state[listName] || [];
      const removedTabs = [];
      const remainingTabs = [];

      currentList.forEach(t => {
        if (idSet.has(t.id)) {
          removedTabs.push(t);
        } else {
          remainingTabs.push(t);
        }
      });

      if (removedTabs.length > 0) {
        movedFromOtherSpaces.push(...removedTabs);
        if (remainingTabs.length === 0) {
          const fallback = get().getFallbackTabForSpace(sp);
          updates[listName] = [fallback];
          if (sp === state.activeSpace) {
            useUIStore.getState().setCurrentUrl('');
          }
        } else {
          const wasActiveMoved = removedTabs.some(t => t.active);
          if (wasActiveMoved && !remainingTabs.some(t => t.active)) {
            const lastIdx = remainingTabs.length - 1;
            remainingTabs[lastIdx] = {
              ...remainingTabs[lastIdx],
              active: true
            };
            if (sp === state.activeSpace) {
              useUIStore.getState().setCurrentUrl(remainingTabs[lastIdx].url || '');
            }
          }
          updates[listName] = remainingTabs;
        }
      }
    });

    // Process targetSpace
    const targetListName = targetSpace === 'personal' ? 'privateTabs' : (targetSpace === 'work' ? 'workTabs' : (targetSpace === 'ghost' ? 'ghostTabs' : 'torTabs'));
    const targetList = state[targetListName] || [];

    // Tabs already in targetSpace: simply update folderId in place
    let updatedTargetList = targetList.map(t => {
      if (idSet.has(t.id)) {
        return {
          ...t,
          folderId: targetFolderId
        };
      }
      return t;
    });

    // Tabs moving in from different spaces: append with folderId and active: false (unless targetSpace had no active tab)
    if (movedFromOtherSpaces.length > 0) {
      let targetHasActive = updatedTargetList.some(t => t.active);
      const tabsToAppend = movedFromOtherSpaces.map((tab, idx) => {
        let makeActive = false;
        if (!targetHasActive && idx === 0) {
          makeActive = true;
          targetHasActive = true;
        }
        return {
          ...tab,
          folderId: targetFolderId,
          active: makeActive,
          lastActiveAt: Date.now()
        };
      });
      updatedTargetList = [...updatedTargetList, ...tabsToAppend];
    }

    updates[targetListName] = updatedTargetList;

    // Clear tabNodeOffsets for moved tabIds so they snap cleanly into their new zone/folder
    const currentOffsets = state.tabNodeOffsets || {};
    let offsetsChanged = false;
    const nextOffsets = { ...currentOffsets };
    ids.forEach(id => {
      if (id in nextOffsets) {
        delete nextOffsets[id];
        offsetsChanged = true;
      }
    });
    if (offsetsChanged) {
      updates.tabNodeOffsets = nextOffsets;
    }

    set(updates);
    get().saveSession();
  },

  mergeTabsIntoNewFolder: (sourceTabIds, targetTabId, targetSpace = null, customName = null) => {
    const sourceArr = Array.isArray(sourceTabIds) ? sourceTabIds : [sourceTabIds];
    const combinedIds = [...new Set([targetTabId, ...sourceArr].filter(Boolean))];
    if (combinedIds.length === 0) return null;

    const state = get();
    const validSpaces = ['personal', 'work', 'ghost', 'tor'];
    let destSpace = targetSpace;
    if (!destSpace || !validSpaces.includes(destSpace)) {
      if (state.privateTabs.some(t => t.id === targetTabId)) destSpace = 'personal';
      else if (state.workTabs.some(t => t.id === targetTabId)) destSpace = 'work';
      else if (state.ghostTabs.some(t => t.id === targetTabId)) destSpace = 'ghost';
      else if ((state.torTabs || []).some(t => t.id === targetTabId)) destSpace = 'tor';
      else {
        for (const sp of validSpaces) {
          const listName = sp === 'personal' ? 'privateTabs' : (sp === 'work' ? 'workTabs' : (sp === 'ghost' ? 'ghostTabs' : 'torTabs'));
          if ((state[listName] || []).some(t => combinedIds.includes(t.id))) {
            destSpace = sp;
            break;
          }
        }
      }
    }
    if (!destSpace || !validSpaces.includes(destSpace)) {
      destSpace = state.activeSpace || 'personal';
    }

    // Determine smart folder name
    let folderName = (typeof customName === 'string' && customName.trim()) ? customName.trim() : null;

    if (!folderName) {
      const allTabs = [
        ...state.privateTabs,
        ...state.workTabs,
        ...state.ghostTabs,
        ...(state.torTabs || [])
      ];
      const targetTab = allTabs.find(t => t.id === targetTabId);
      const candidateTabs = targetTab 
        ? [targetTab, ...allTabs.filter(t => t.id !== targetTabId && combinedIds.includes(t.id))]
        : allTabs.filter(t => combinedIds.includes(t.id));

      const brandMap = {
        'github': 'GitHub',
        'youtube': 'YouTube',
        'google': 'Google',
        'reddit': 'Reddit',
        'twitter': 'Twitter',
        'x': 'X',
        'wikipedia': 'Wikipedia',
        'linkedin': 'LinkedIn',
        'facebook': 'Facebook',
        'instagram': 'Instagram',
        'netflix': 'Netflix',
        'amazon': 'Amazon',
        'gemini': 'Gemini',
        'chatgpt': 'ChatGPT'
      };

      for (const tab of candidateTabs) {
        if (!tab || !tab.url) continue;
        try {
          let u = tab.url.trim();
          if (!u.includes('://')) u = 'https://' + u;
          const parsed = new URL(u);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            const hostname = parsed.hostname.toLowerCase().replace(/^www\./i, '');
            if (hostname) {
              const base = hostname.split('.')[0];
              if (brandMap[base]) {
                folderName = brandMap[base];
              } else {
                folderName = base.charAt(0).toUpperCase() + base.slice(1);
              }
              break;
            }
          }
        } catch (_) {}
      }

      if (!folderName) {
        folderName = 'Tab Group';
      }
    }

    const newFolder = {
      id: uuidv4(),
      name: folderName,
      spaceType: destSpace,
      isOpen: true
    };

    set(s => ({ folders: [...(s.folders || []), newFolder] }));

    // Move tabs into destSpace with folderId: newFolder.id
    get().moveTabsToZone(combinedIds, destSpace, newFolder.id);
    get().saveSession();

    return newFolder;
  },

  autoClusterByDomain: (targetSpace = null) => {
    const validSpaces = ['personal', 'work', 'ghost', 'tor'];
    const spacesToScan = targetSpace && validSpaces.includes(targetSpace) ? [targetSpace] : validSpaces;

    const state = get();
    let clusteredTabCount = 0;
    let createdFolderCount = 0;

    let currentFolders = [...(state.folders || [])];
    const nextOffsets = { ...(state.tabNodeOffsets || {}) };
    const updates = {};

    const getCleanHostname = (url) => {
      if (!url || typeof url !== 'string') return null;
      try {
        let u = url.trim();
        if (!u.includes('://')) u = 'https://' + u;
        const parsed = new URL(u);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.hostname.toLowerCase().replace(/^www\./i, '');
      } catch (_) {
        return null;
      }
    };

    spacesToScan.forEach(space => {
      const listName = space === 'personal' ? 'privateTabs' : (space === 'work' ? 'workTabs' : (space === 'ghost' ? 'ghostTabs' : 'torTabs'));
      const list = state[listName] || [];

      // Group ungrouped tabs with valid HTTP/HTTPS URLs by normalized hostname
      const domainGroups = new Map();
      list.forEach(tab => {
        if (!tab || tab.folderId) return;
        const hostname = getCleanHostname(tab.url);
        if (!hostname) return;
        if (!domainGroups.has(hostname)) {
          domainGroups.set(hostname, []);
        }
        domainGroups.get(hostname).push(tab);
      });

      const updatedTabsMap = new Map();

      domainGroups.forEach((tabs, hostname) => {
        if (tabs.length < 2) return;

        const baseName = hostname.split('.')[0];
        let matchingFolder = currentFolders.find(f => {
          if (f.spaceType !== space) return false;
          const fn = (f.name || '').toLowerCase().trim();
          return fn === hostname || fn === baseName;
        });

        if (!matchingFolder) {
          matchingFolder = {
            id: uuidv4(),
            name: hostname,
            spaceType: space,
            isOpen: true
          };
          currentFolders.push(matchingFolder);
          createdFolderCount++;
        }

        tabs.forEach(tab => {
          updatedTabsMap.set(tab.id, matchingFolder.id);
          delete nextOffsets[tab.id];
          clusteredTabCount++;
        });
      });

      if (updatedTabsMap.size > 0) {
        updates[listName] = list.map(t => {
          if (updatedTabsMap.has(t.id)) {
            return {
              ...t,
              folderId: updatedTabsMap.get(t.id)
            };
          }
          return t;
        });
      }
    });

    if (createdFolderCount > 0) {
      updates.folders = currentFolders;
    }
    if (clusteredTabCount > 0) {
      updates.tabNodeOffsets = nextOffsets;
    }

    if (Object.keys(updates).length > 0) {
      set(updates);
    }

    get().saveSession();
    return { clusteredTabCount, createdFolderCount };
  },

  closeDuplicateTabs: (targetSpace = null) => {
    const validSpaces = ['personal', 'work', 'ghost', 'tor'];
    const spacesToScan = targetSpace && validSpaces.includes(targetSpace) ? [targetSpace] : validSpaces;

    const state = get();
    let closedCount = 0;
    const updates = {};
    const nextOffsets = { ...(state.tabNodeOffsets || {}) };

    const normalizeUrlForDedup = (url) => {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (!trimmed || trimmed === 'about:blank') return '';
      if (trimmed.startsWith('qbrowse://newtab') || trimmed.startsWith('qbrowse://home') || trimmed.startsWith('qbrowse://blank')) {
        return 'qbrowse://newtab';
      }
      try {
        let u = trimmed;
        if (!u.includes('://')) u = 'https://' + u;
        const parsed = new URL(u);
        parsed.hash = '';
        let res = parsed.toString();
        if (res.endsWith('/') && !res.endsWith('://')) {
          res = res.slice(0, -1);
        }
        return res.toLowerCase();
      } catch (_) {
        let res = trimmed.split('#')[0];
        if (res.endsWith('/') && res.length > 1) {
          res = res.slice(0, -1);
        }
        return res.toLowerCase();
      }
    };

    spacesToScan.forEach(space => {
      const listName = space === 'personal' ? 'privateTabs' : (space === 'work' ? 'workTabs' : (space === 'ghost' ? 'ghostTabs' : 'torTabs'));
      const list = state[listName] || [];
      if (list.length <= 1) return;

      const urlGroups = new Map();
      list.forEach(tab => {
        const norm = normalizeUrlForDedup(tab.url);
        if (!urlGroups.has(norm)) {
          urlGroups.set(norm, []);
        }
        urlGroups.get(norm).push(tab);
      });

      const idsToRemove = new Set();

      urlGroups.forEach((groupTabs) => {
        if (groupTabs.length <= 1) return;

        let keepTab = groupTabs.find(t => t.active);
        if (!keepTab) {
          keepTab = groupTabs.reduce((best, cur) => {
            const bestTime = best.lastActiveAt || best.createdAt || 0;
            const curTime = cur.lastActiveAt || cur.createdAt || 0;
            return curTime > bestTime ? cur : best;
          }, groupTabs[0]);
        }

        groupTabs.forEach(t => {
          if (t.id !== keepTab.id) {
            idsToRemove.add(t.id);
          }
        });
      });

      if (idsToRemove.size > 0) {
        let filtered = list.filter(t => !idsToRemove.has(t.id));

        if (filtered.length === 0) {
          filtered = [get().getFallbackTabForSpace(space)];
        } else if (!filtered.some(t => t.active)) {
          filtered[0] = { ...filtered[0], active: true };
        }

        idsToRemove.forEach(id => {
          delete nextOffsets[id];
        });

        closedCount += idsToRemove.size;
        updates[listName] = filtered;
      }
    });

    if (closedCount > 0) {
      updates.tabNodeOffsets = nextOffsets;
      set(updates);
    }

    get().saveSession();
    return closedCount;
  },

  suspendAllInactiveTabs: (targetSpace = null, pinnedDomains = []) => {
    const validSpaces = ['personal', 'work', 'ghost', 'tor'];
    const spacesToScan = targetSpace && validSpaces.includes(targetSpace) ? [targetSpace] : validSpaces;

    const state = get();
    let suspendedCount = 0;
    const updates = {};

    const pinnedHostSet = new Set();
    const addHost = (val) => {
      if (!val) return;
      if (typeof val === 'string') {
        const clean = val.toLowerCase().trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0];
        if (clean) pinnedHostSet.add(clean);
      } else if (typeof val === 'object' && val !== null) {
        if (val.domain) addHost(val.domain);
        if (val.url) addHost(val.url);
      }
    };

    if (Array.isArray(pinnedDomains)) pinnedDomains.forEach(addHost);
    const storePinnedTabs = state.pinnedTabs || [];
    if (Array.isArray(storePinnedTabs)) storePinnedTabs.forEach(addHost);
    const storePinnedDomains = state.pinnedDomains || [];
    if (Array.isArray(storePinnedDomains)) storePinnedDomains.forEach(addHost);

    const isTabPinned = (tab) => {
      if (!tab || !tab.url) return false;
      let host = '';
      try {
        let u = tab.url.trim();
        if (!u.includes('://')) u = 'https://' + u;
        host = new URL(u).hostname.toLowerCase().replace(/^www\./i, '');
      } catch (_) {
        host = tab.url.toLowerCase().trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0];
      }
      if (!host) return false;
      for (const p of pinnedHostSet) {
        if (host === p || host.endsWith('.' + p)) return true;
      }
      return false;
    };

    spacesToScan.forEach(space => {
      const listName = space === 'personal' ? 'privateTabs' : (space === 'work' ? 'workTabs' : (space === 'ghost' ? 'ghostTabs' : 'torTabs'));
      const list = state[listName] || [];
      let spaceChanged = false;

      const nextList = list.map(tab => {
        if (!tab) return tab;
        if (tab.active) return tab;
        if (tab.suspended) return tab;
        if (tab.isAudible || tab.isAudioPlaying || tab.hasAudio) return tab;
        if (tab.isDownloading) return tab;
        if (tab.url && tab.url.startsWith('qbrowse://')) return tab;
        if (isTabPinned(tab)) return tab;

        spaceChanged = true;
        suspendedCount++;
        return {
          ...tab,
          suspended: true,
          suspendedAt: Date.now()
        };
      });

      if (spaceChanged) {
        updates[listName] = nextList;
      }
    });

    if (suspendedCount > 0) {
      set(updates);
    }

    return suspendedCount;
  },

  reloadTab: (tabId) => {
    const wv = window.qbrowseWebviews ? window.qbrowseWebviews[tabId] : null;
    if (wv && typeof wv.reload === 'function') {
      try {
        wv.reload();
        useUIStore.getState().showToast('Reloading tab...');
      } catch (_) {}
    }
  },

  addTabToFolder: (folderId, spaceType) => {
    const space = spaceType || get().activeSpace || 'personal';
    if (get().activeSpace !== space) {
      get().setActiveSpace(space);
    }
    const newTab = {
      id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: 'New Tab',
      url: '',
      active: true,
      folderId: folderId,
      lastActiveAt: Date.now(),
      suspended: false
    };
    get().addTab(newTab);
    useUIStore.getState().showToast('New tab created in folder');
  },

  closeAllTabsInFolder: (folderId, spaceType) => {
    const space = spaceType || get().activeSpace || 'personal';
    const list = space === 'personal' ? get().privateTabs : (space === 'work' ? get().workTabs : (space === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = space === 'personal' ? get().setPrivateTabs : (space === 'work' ? get().setWorkTabs : (space === 'ghost' ? get().setGhostTabs : get().setTorTabs));

    let nextList = list.filter(t => t.folderId !== folderId);
    if (nextList.length === 0) {
      nextList = [{ id: `t-${Date.now()}`, title: space === 'ghost' ? 'New Incognito Tab' : 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
    } else if (!nextList.some(t => t.active)) {
      nextList[0].active = true;
      useUIStore.getState().setCurrentUrl(nextList[0].url || '');
    }
    setList(nextList);
    useUIStore.getState().showToast('Closed all tabs in folder');
  },

  handleSwitchToTab: (tabId, spaceType) => {
    if (get().activeSpace !== spaceType) {
        get().setActiveSpace(spaceType);
    }
    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : (spaceType === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : (spaceType === 'ghost' ? get().setGhostTabs : get().setTorTabs));
    
    const target = list.find(t => t.id === tabId);
    if (target) {
        const ui = useUIStore.getState();
        ui.setCurrentUrl(target.url || '');
        ui.setIsReaderAvailable(false);
        if (ui.isFindOpen) {
            ui.setIsFindOpen(false);
        }
        if (ui.isReaderOpen || ui.isReaderClosing) {
            ui.closeReaderMode(true);
        }
    }

    setList(list.map(t => ({
        ...t,
        active: t.id === tabId,
        suspended: t.id === tabId ? false : t.suspended,
        lastActiveAt: t.id === tabId ? Date.now() : t.lastActiveAt
    })));
  },

  setActiveTab: (tabId, spaceType) => {
    const space = spaceType || get().activeSpace || 'personal';
    get().handleSwitchToTab(tabId, space);
  },

  updateTabThumbnail: (tabId, thumbnail) => {
    if (!tabId || !thumbnail) return;
    const updateList = (list) => list.map(t => t.id === tabId ? { ...t, thumbnail } : t);
    set(state => ({
        privateTabs: updateList(state.privateTabs),
        workTabs: updateList(state.workTabs),
        ghostTabs: updateList(state.ghostTabs),
        torTabs: updateList(state.torTabs || []),
    }));
  },

  handleToggleMute: (id, spaceType) => {
    const toggle = (list, setList) => setList(list.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t));
    if (spaceType === 'personal') toggle(get().privateTabs, get().setPrivateTabs);
    if (spaceType === 'work') toggle(get().workTabs, get().setWorkTabs);
    if (spaceType === 'ghost') toggle(get().ghostTabs, get().setGhostTabs);
    if (spaceType === 'tor') toggle(get().torTabs, get().setTorTabs);
  },

  handlePinTab: (tab) => {
    if (!tab.url || tab.url === 'about:blank') return;
    const { activeSpace, pinnedTabs, privateTabs, workTabs, setPinnedTabs, setPrivateTabs, setWorkTabs } = get();
    let cleanDomain = tab.url.trim().replace(/^https?:\/\//i, '').split('/')[0];
    const newPin = { id: `p-${tab.id}-${Date.now()}`, title: tab.title || cleanDomain, domain: cleanDomain };
    setPinnedTabs([...pinnedTabs, newPin]);
    if (activeSpace === 'personal') setPrivateTabs(privateTabs.filter(t => t.id !== tab.id));
    if (activeSpace === 'work') setWorkTabs(workTabs.filter(t => t.id !== tab.id));
    useUIStore.getState().showToast(`Pinned: ${newPin.title}`);
  },

  handleDragStart: (e, tab, spaceType) => {
    if (e) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData('text/plain', tab.id);
    }
    setTimeout(() => {
      get().setDraggedItem({ tab, spaceType });
    }, 0);
  },

  handleDrop: (e, targetTab, spaceType) => {
    if(e) e.preventDefault();
    const draggedItem = get().draggedItem;
    get().setDragOverItem(null);
    if (!draggedItem || draggedItem.tab.id === targetTab.id) return;
    if (draggedItem.spaceType !== spaceType) {
        useUIStore.getState().showToast('You can only move tabs within the same space');
        return;
    }
    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : (spaceType === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : (spaceType === 'ghost' ? get().setGhostTabs : get().setTorTabs));
    const draggedIdx = list.findIndex(t => t.id === draggedItem.tab.id);
    const originalTargetIdx = list.findIndex(t => t.id === targetTab.id);
    const newList = [...list];
    
    // Remove dragged item
    const [removed] = newList.splice(draggedIdx, 1);
    removed.folderId = targetTab.folderId;
    
    // Find target index in NEW list
    let targetIdx = newList.findIndex(t => t.id === targetTab.id);
    
    // If dragging down, insert AFTER the target so it swaps intuitively
    if (draggedIdx < originalTargetIdx) {
        targetIdx += 1;
    }
    
    newList.splice(targetIdx, 0, removed);
    setList(newList);
    get().setDraggedItem(null);
  },

  handleDropFolder: (e, spaceType, targetFolderId) => {
    if(e) e.preventDefault();
    const draggedItem = get().draggedItem;
    get().setDragOverItem(null);
    if (!draggedItem || draggedItem.spaceType !== spaceType) return;
    
    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : (spaceType === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : (spaceType === 'ghost' ? get().setGhostTabs : get().setTorTabs));
    
    const newList = [...list];
    const draggedTab = newList.find(t => t.id === draggedItem.tab.id);
    if (draggedTab) {
        draggedTab.folderId = targetFolderId;
        const draggedIdx = newList.findIndex(t => t.id === draggedItem.tab.id);
        const [removed] = newList.splice(draggedIdx, 1);
        newList.push(removed);
    }
    setList(newList);
    get().setDraggedItem(null);
  },

  handleDropRoot: (e, spaceType) => {
    if(e) e.preventDefault();
    const draggedItem = get().draggedItem;
    get().setDragOverItem(null);
    if (!draggedItem || draggedItem.spaceType !== spaceType) return;

    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : (spaceType === 'ghost' ? get().ghostTabs : get().torTabs));
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : (spaceType === 'ghost' ? get().setGhostTabs : get().setTorTabs));
    
    const newList = [...list];
    const draggedTab = newList.find(t => t.id === draggedItem.tab.id);
    if (draggedTab && draggedTab.folderId) {
        draggedTab.folderId = null;
        const draggedIdx = newList.findIndex(t => t.id === draggedItem.tab.id);
        const [removed] = newList.splice(draggedIdx, 1);
        newList.unshift(removed);
    }
    setList(newList);
    get().setDraggedItem(null);
  },

  handleGoHome: () => {
    const updateTab = (list, setList) => setList(list.map(t => t.active ? { ...t, url: '', title: 'New Tab', lastActiveAt: Date.now(), suspended: false } : t));
    const activeSpace = get().activeSpace;
    if (activeSpace === 'personal') updateTab(get().privateTabs, get().setPrivateTabs);
    else if (activeSpace === 'work') updateTab(get().workTabs, get().setWorkTabs);
    else if (activeSpace === 'ghost') updateTab(get().ghostTabs, get().setGhostTabs);
    else updateTab(get().torTabs, get().setTorTabs);

    useUIStore.getState().setCurrentUrl('');
    useUIStore.getState().setIsFullscreen(false);
  },

  updateTabActivity: (tabId) => {
    const update = (list) => list.map(t => t.id === tabId ? { ...t, lastActiveAt: Date.now(), suspended: false } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
    get().setTorTabs(update(get().torTabs));
  },

  updateTabAudible: (tabId, isAudible) => {
    const update = (list) => list.map(t => t.id === tabId ? { ...t, isAudioPlaying: !!isAudible, isAudible: !!isAudible } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
    get().setTorTabs(update(get().torTabs));
  },

  updateTabTitle: (tabId, title) => {
    if (!tabId || !title) return;
    const current = get().privateTabs.find(t => t.id === tabId) ||
                    get().workTabs.find(t => t.id === tabId) ||
                    get().ghostTabs.find(t => t.id === tabId) ||
                    get().torTabs.find(t => t.id === tabId);
    if (current && current.title === title) return;
    const update = (list) => list.map(t => t.id === tabId ? { ...t, title } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
    get().setTorTabs(update(get().torTabs));
  },

  updateTabState: (tabId, updates) => {
    if (!tabId || !updates) return;
    const update = (list) => list.map(t => t.id === tabId ? { ...t, ...updates } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
    get().setTorTabs(update(get().torTabs));
  },

  handleNavigateTab: (tabId, url, title) => {
    let targetUrl = url || '';
    if (targetUrl && window.electronAPI?.isAppProtocol?.(targetUrl)) {
      window.electronAPI.openAppProtocol(targetUrl);
      return;
    }
    if (targetUrl && !targetUrl.includes('://') && !targetUrl.startsWith('about:')) {
      targetUrl = `https://${targetUrl}`;
    }

    const isBlank = !targetUrl || targetUrl === 'about:blank' || targetUrl.startsWith('qbrowse://newtab') || targetUrl.startsWith('qbrowse://home') || targetUrl.startsWith('qbrowse://blank');
    const cleanUrl = isBlank ? '' : targetUrl;
    const cleanTitle = isBlank 
      ? (get().activeSpace === 'ghost' ? 'New Incognito Tab' : 'New Tab')
      : (title || (targetUrl === 'qbrowse://flags' ? 'QBrowse Flags' : targetUrl));

    const update = (list) => list.map(t => t.id === tabId ? { 
      ...t, 
      url: cleanUrl, 
      title: cleanTitle, 
      suspended: false, 
      lastActiveAt: Date.now() 
    } : t);

    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
    get().setTorTabs(update(get().torTabs));

    const activeTab = get().getActiveTab();
    if (activeTab && activeTab.id === tabId) {
      useUIStore.getState().setCurrentUrl(cleanUrl);
    }

    // Directly command the underlying Electron <webview> if available in DOM
    if (typeof window !== 'undefined' && targetUrl && !targetUrl.startsWith('file://')) {
      if (targetUrl.startsWith('qbrowse://')) {
        if (targetUrl.startsWith('qbrowse://ai')) {
          const actualLoadUrl = targetUrl.replace('qbrowse://ai', 'http://127.0.0.1:8080');
          const wv = window.qbrowseWebviews?.[tabId] || document.getElementById(`webview-${tabId}`);
          if (wv && typeof wv.loadURL === 'function') {
            try {
              wv.loadURL(actualLoadUrl).catch(() => {});
            } catch (_) {}
          }
        }
        return;
      }
      // If targetUrl is an unencrypted HTTP URL (and not local or onion), do not blindly load before security confirmation
      const isHttp = targetUrl.startsWith('http://') && !targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1') && !targetUrl.includes('.onion');
      let isBypassed = false;
      if (isHttp) {
        try {
          const parsed = new URL(targetUrl);
          isBypassed = get().isHostInsecureBypassed(parsed.hostname);
        } catch (_) {}
      }
      if (isHttp && !isBypassed) {
        return; // WebViewContainer will display the HTTP Security Warning interstitial!
      }
      const wv = window.qbrowseWebviews?.[tabId] || document.getElementById(`webview-${tabId}`);
      if (wv && typeof wv.loadURL === 'function') {
        try {
          wv.loadURL(targetUrl).catch(() => {});
        } catch (_) {}
      }
    }
  },

  openLocalFiles: (fileUrls) => {
    if (!Array.isArray(fileUrls) || fileUrls.length === 0) return;
    const activeTab = get().getActiveTab();
    const isBlank = !activeTab?.url || activeTab.url === 'about:blank' || activeTab.url.startsWith('qbrowse://newtab') || activeTab.url.startsWith('qbrowse://home') || activeTab.url.startsWith('qbrowse://blank');
    
    fileUrls.forEach((url, idx) => {
      let title = '';
      try {
        const decoded = decodeURIComponent(url);
        const parts = decoded.split(/[/\\]/).filter(Boolean);
        title = parts[parts.length - 1] || 'Local Resource';
      } catch (_) {
        title = 'Local Resource';
      }

      if (idx === 0 && isBlank && activeTab) {
        get().handleNavigateTab(activeTab.id, url, title);
      } else {
        get().handleNewTab(url);
      }
    });
  },

  updateTabNavState: (tabId, canGoBack, canGoForward) => {
    const update = (list) => list.map(t => t.id === tabId ? { ...t, canGoBack: !!canGoBack, canGoForward: !!canGoForward } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
    get().setTorTabs(update(get().torTabs));
  },

  serializeCurrentProfileTabs: (profileId) => {
    if (!profileId) return;
    const { privateTabs, workTabs, pinnedTabs, folders } = get();
    try {
      localStorage.setItem(`qbrowse_tabs_${profileId}_personal`, JSON.stringify(privateTabs));
      localStorage.setItem(`qbrowse_tabs_${profileId}_work`, JSON.stringify(workTabs));
      // STRICT PRIVACY: Never persist ghost or tor tabs locally under any circumstances
      localStorage.removeItem(`qbrowse_tabs_${profileId}_ghost`);
      localStorage.removeItem(`qbrowse_tabs_${profileId}_tor`);
      localStorage.setItem(`qbrowse_pins_${profileId}`, JSON.stringify(pinnedTabs));
      localStorage.setItem('qbrowse_pinned_tabs', JSON.stringify(pinnedTabs));
      localStorage.setItem(`qbrowse_folders_${profileId}`, JSON.stringify(folders));
    } catch(e) {}
  },

  loadProfileTabs: (profileId) => {
    if (!profileId) return;
    try {
      // Purge any accidental legacy ghost or tor persisted tabs
      try {
        localStorage.removeItem(`qbrowse_tabs_${profileId}_ghost`);
        localStorage.removeItem(`qbrowse_tabs_${profileId}_tor`);
      } catch (_) {}

      const storedPersonal = localStorage.getItem(`qbrowse_tabs_${profileId}_personal`);
      const storedWork = localStorage.getItem(`qbrowse_tabs_${profileId}_work`);
      const storedPins = localStorage.getItem(`qbrowse_pins_${profileId}`) || localStorage.getItem('qbrowse_pinned_tabs');
      const storedFolders = localStorage.getItem(`qbrowse_folders_${profileId}`);

      const defaultPersonal = [{ id: `t1-${profileId}`, title: 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
      const defaultWork = [{ id: `w1-${profileId}`, title: 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
      const defaultGhost = [{ id: `g1-${profileId}`, title: 'New Incognito Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
      const defaultTor = [{ id: `t1-${profileId}`, title: 'New Tor Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];

      const pTabs = storedPersonal ? JSON.parse(storedPersonal) : defaultPersonal;
      const wTabs = storedWork ? JSON.parse(storedWork) : defaultWork;
      let pins = null;
      if (storedPins) {
        try {
          const parsed = JSON.parse(storedPins);
          if (Array.isArray(parsed)) pins = parsed;
        } catch (_) {}
      }
      if (!pins) {
        pins = [
          { id: 'pin-1', title: 'GitHub', domain: 'github.com' },
          { id: 'pin-2', title: 'YouTube', domain: 'youtube.com' },
          { id: 'pin-3', title: 'Gemini', domain: 'gemini.google.com' }
        ];
      }
      const folders = storedFolders ? JSON.parse(storedFolders) : [];

      set({
        privateTabs: pTabs,
        workTabs: wTabs,
        ghostTabs: defaultGhost,
        torTabs: defaultTor,
        pinnedTabs: pins,
        pinnedDomains: pins.map(p => p.domain).filter(Boolean),
        folders: folders,
        activeSpace: 'personal'
      });

      const activeTab = pTabs.find(t => t.active) || pTabs[0];
      useUIStore.getState().setCurrentUrl(activeTab ? (activeTab.url || '') : '');
    } catch(e) {
      console.warn('[TabStore] Failed to load profile tabs:', e);
    }
  }
}));

// Clean up any legacy ghost or tor persisted keys from localStorage immediately on startup
try {
  if (typeof localStorage !== 'undefined') {
    Object.keys(localStorage).forEach(key => {
      if (key.includes('_ghost') || key.includes('_tor')) {
        localStorage.removeItem(key);
      }
    });
  }
} catch (_) {}

if (typeof window !== 'undefined') {
  window.__tabStore = useTabStore;
}

export default useTabStore;
