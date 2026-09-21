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
      return updates;
  }),

  draggedItem: null,
  setDraggedItem: (item) => set({ draggedItem: item }),
  dragOverItem: null,
  setDragOverItem: (item) => set({ dragOverItem: item }),

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
          const stored = localStorage.getItem('qbrowse_pinned_tabs');
          if (stored) return JSON.parse(stored);
      } catch(e) {}
      return [
          { id: 'pin-1', title: 'GitHub', domain: 'github.com' },
          { id: 'pin-2', title: 'YouTube', domain: 'youtube.com' },
          { id: 'pin-3', title: 'ChatGPT', domain: 'chatgpt.com' }
      ];
  })(),
  setPinnedTabs: (tabs) => set({ pinnedTabs: tabs }),

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
          try {
              localStorage.setItem('qbrowse_pinned_tabs', JSON.stringify(updated));
          } catch(e) {}
          return { pinnedTabs: updated };
      });
      useUIStore.getState().showToast(`Pinned "${newPin.title}" to sidebar`);
  },

  handleUnpinTab: (pin) => {
      set(state => {
          const updated = state.pinnedTabs.filter(p => p.id !== (pin.id || pin));
          try {
              localStorage.setItem('qbrowse_pinned_tabs', JSON.stringify(updated));
          } catch(e) {}
          return { pinnedTabs: updated };
      });
      useUIStore.getState().showToast(`Unpinned "${pin.title || 'app'}"`);
  },

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

  addTab: (tabObj) => {
    const space = get().activeSpace;
    const isGhost = space === 'ghost';
    const isTor = space === 'tor';
    const defaultTitle = isGhost ? 'New Incognito Tab' : 'New Tab';
    const safeTitle = (typeof tabObj.title === 'string' && tabObj.title.trim()) ? tabObj.title : defaultTitle;
    const safeUrl = (typeof tabObj.url === 'string') ? tabObj.url : '';
    const setList = get().getActiveSetList();
    const newTab = {
      ...tabObj,
      title: safeTitle,
      url: safeUrl,
      lastActiveAt: Date.now(),
      suspended: false
    };
    setList(prev => [...prev.map(t => ({ ...t, active: false })), newTab]);
    const ui = useUIStore.getState();
    ui.setCurrentUrl(safeUrl);
    ui.setIsReaderAvailable(false);
    if (ui.isReaderOpen || ui.isReaderClosing) {
        ui.closeReaderMode(true);
    }
    ui.showToast(isTor ? 'New Tor tab created' : (isGhost ? 'New incognito tab created' : 'New tab created'));
    return newTab;
  },

  handleNewTab: (url = '') => {
    const activeSpace = get().activeSpace;
    const isGhost = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const cleanUrl = (typeof url === 'string') ? url.trim() : '';
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
        active: true, 
        folderId: null 
    });
  },

  suspendTab: (tabId) => {
      const { privateTabs, setPrivateTabs, workTabs, setWorkTabs, ghostTabs, setGhostTabs, torTabs, setTorTabs } = get();
      const updateList = (list, setList) => {
          if (list.some(t => t.id === tabId)) {
              const tab = list.find(t => t.id === tabId);
              if (tab.active) {
                  useUIStore.getState().showToast('Cannot suspend active tab');
              } else {
                  setList(list.map(t => t.id === tabId ? { ...t, suspended: true } : t));
                  useUIStore.getState().showToast('Tab suspended to save memory');
              }
              return true;
          }
          return false;
      };
      
      if (updateList(privateTabs, setPrivateTabs)) return;
      if (updateList(workTabs, setWorkTabs)) return;
      if (updateList(ghostTabs, setGhostTabs)) return;
      if (updateList(torTabs, setTorTabs)) return;
  },

  wakeTab: (tabId) => {
      const { privateTabs, setPrivateTabs, workTabs, setWorkTabs, ghostTabs, setGhostTabs, torTabs, setTorTabs } = get();
      const updateList = (list, setList) => {
          if (list.some(t => t.id === tabId)) {
              setList(list.map(t => t.id === tabId ? { ...t, suspended: false } : t));
              useUIStore.getState().showToast('Tab restored from sleep');
              return true;
          }
          return false;
      };
      
      if (updateList(privateTabs, setPrivateTabs)) return;
      if (updateList(workTabs, setWorkTabs)) return;
      if (updateList(ghostTabs, setGhostTabs)) return;
      if (updateList(torTabs, setTorTabs)) return;
  },

  closeTabById: (tabId) => {
      const { privateTabs, workTabs, ghostTabs, torTabs, handleCloseTab, setActiveSpace, activeSpace } = get();
      let targetSpace = activeSpace;
      if (privateTabs.some(t => t.id === tabId)) targetSpace = 'personal';
      else if (workTabs.some(t => t.id === tabId)) targetSpace = 'work';
      else if (ghostTabs.some(t => t.id === tabId)) targetSpace = 'ghost';
      else if (torTabs.some(t => t.id === tabId)) targetSpace = 'tor';

      if (activeSpace !== targetSpace) {
          setActiveSpace(targetSpace);
      }
      handleCloseTab(tabId);
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
    
    const tabToClose = list.find(t => t.id === id);
    if (!tabToClose || tabToClose.isClosing) return;

    // If the closed tab is active (or last tab remaining), discard find in page and reader mode
    const uiStore = useUIStore.getState();
    if (tabToClose.active || list.length === 1) {
        if (uiStore.isFindOpen) {
            uiStore.setIsFindOpen(false);
        }
        uiStore.setIsReaderAvailable(false);
        if (uiStore.isReaderOpen || uiStore.isReaderClosing) {
            uiStore.closeReaderMode(true);
        }
    }

    // Track in recently closed tabs for Cmd+Shift+T restore
    if (tabToClose.url && tabToClose.url !== 'about:blank') {
        const space = get().activeSpace;
        set(state => ({
            recentlyClosedTabs: [
                ...(state.recentlyClosedTabs || []).slice(-19),
                { url: tabToClose.url, title: tabToClose.title, space }
            ]
        }));
    }

    // Reset split view if the closing tab was in split view
    const { splitRightTabId, setSplitRightTabId, isSplitView, toggleSplitView } = useUIStore.getState();
    if (isSplitView && splitRightTabId === id) {
        setSplitRightTabId(null);
        toggleSplitView();
    }

    if (list.length === 1) {
        // Last tab: trigger smooth transition and reset cleanly to Zen Dashboard
        setList([{ ...tabToClose, isClosing: true, thumbnail: null }]);
        const ui = useUIStore.getState();
        ui.setCurrentUrl('');
        if (ui.isFindOpen) {
            ui.setIsFindOpen(false);
        }
        ui.setIsReaderAvailable(false);
        if (ui.isReaderOpen || ui.isReaderClosing) {
            ui.closeReaderMode(true);
        }
        setTimeout(() => {
            const current = get().getActiveList();
            if (current.length > 0) {
                setList([{
                    ...current[0],
                    url: '',
                    title: get().activeSpace === 'ghost' ? 'New Incognito Tab' : 'New Tab',
                    thumbnail: null,
                    isClosing: false,
                    lastActiveAt: Date.now()
                }]);
            }
            useUIStore.getState().setIsReaderAvailable(false);
            if (get().activeSpace === 'ghost' && window.electronAPI && window.electronAPI.clearGhostSession) {
                window.electronAPI.clearGhostSession().catch(() => {});
            }
        }, 250);
        return;
    }

    // Mark closing tab and immediately transfer active status if this tab was active
    let nextActiveId = null;
    let nextUrl = '';

    if (tabToClose.active) {
        const remaining = list.filter(t => t.id !== id && !t.isClosing);
        if (remaining.length > 0) {
            const closedIdx = list.findIndex(t => t.id === id);
            // Activate previous tab or next tab
            const targetIdx = Math.max(0, closedIdx > 0 ? closedIdx - 1 : 0);
            const targetTab = remaining[Math.min(targetIdx, remaining.length - 1)];
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
            return { ...t, active: true };
        }
        return t;
    }));

    if (nextUrl !== undefined && nextActiveId) {
        const ui = useUIStore.getState();
        ui.setCurrentUrl(nextUrl);
        ui.setIsReaderAvailable(false);
    }

    setTimeout(() => {
        const currentList = get().getActiveList();
        const newList = currentList.filter(t => t.id !== id);
        
        // Guarantee at least one active tab exists
        const hasActive = newList.some(t => t.active && !t.isClosing);
        if (!hasActive && newList.length > 0) {
            const targetIdx = 0;
            newList.forEach((t, i) => {
                t.active = i === targetIdx;
            });
            const ui = useUIStore.getState();
            ui.setCurrentUrl(newList[targetIdx].url || '');
            ui.setIsReaderAvailable(false);
        }
        
        setList(newList);
    }, 250);
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
    setPinnedTabs([...pinnedTabs, { id: `p-${tab.id}-${Date.now()}`, title: tab.title, domain: tab.url }]);
    if (activeSpace === 'personal') setPrivateTabs(privateTabs.filter(t => t.id !== tab.id));
    if (activeSpace === 'work') setWorkTabs(workTabs.filter(t => t.id !== tab.id));
    useUIStore.getState().showToast(`Pinned: ${tab.title}`);
  },

  handleUnpinTab: (pin) => {
    const { pinnedTabs, privateTabs, setPinnedTabs, setPrivateTabs } = get();
    setPinnedTabs(pinnedTabs.filter(t => t.id !== pin.id));
    const cleanId = pin.id.split('-')[1] || pin.id;
    setPrivateTabs([...privateTabs, { id: `t-${cleanId}-${Date.now()}`, title: pin.title, url: pin.domain, active: false, folderId: null }]);
    useUIStore.getState().showToast(`Unpinned: ${pin.title}`);
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

  handleNavigateTab: (tabId, url, title) => {
    const update = (list) => list.map(t => t.id === tabId ? { ...t, url, title: title || (url === 'qbrowse://flags' ? 'QBrowse Flags' : t.title), suspended: false, lastActiveAt: Date.now() } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
    get().setTorTabs(update(get().torTabs));
    const activeTab = get().getActiveTab();
    if (activeTab && activeTab.id === tabId) {
      useUIStore.getState().setCurrentUrl(url);
    }
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
    const { privateTabs, workTabs, ghostTabs, pinnedTabs, folders } = get();
    try {
      localStorage.setItem(`qbrowse_tabs_${profileId}_personal`, JSON.stringify(privateTabs));
      localStorage.setItem(`qbrowse_tabs_${profileId}_work`, JSON.stringify(workTabs));
      localStorage.setItem(`qbrowse_tabs_${profileId}_ghost`, JSON.stringify(ghostTabs));
      localStorage.setItem(`qbrowse_pins_${profileId}`, JSON.stringify(pinnedTabs));
      localStorage.setItem(`qbrowse_folders_${profileId}`, JSON.stringify(folders));
    } catch(e) {}
  },

  loadProfileTabs: (profileId) => {
    if (!profileId) return;
    try {
      const storedPersonal = localStorage.getItem(`qbrowse_tabs_${profileId}_personal`);
      const storedWork = localStorage.getItem(`qbrowse_tabs_${profileId}_work`);
      const storedGhost = localStorage.getItem(`qbrowse_tabs_${profileId}_ghost`);
      const storedPins = localStorage.getItem(`qbrowse_pins_${profileId}`);
      const storedFolders = localStorage.getItem(`qbrowse_folders_${profileId}`);

      const defaultPersonal = [{ id: `t1-${profileId}`, title: 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
      const defaultWork = [{ id: `w1-${profileId}`, title: 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
      const defaultGhost = [{ id: `g1-${profileId}`, title: 'New Incognito Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];

      const pTabs = storedPersonal ? JSON.parse(storedPersonal) : defaultPersonal;
      const wTabs = storedWork ? JSON.parse(storedWork) : defaultWork;
      const gTabs = storedGhost ? JSON.parse(storedGhost) : defaultGhost;
      const pins = storedPins ? JSON.parse(storedPins) : [
        { id: 'pin-1', title: 'GitHub', domain: 'github.com' },
        { id: 'pin-2', title: 'YouTube', domain: 'youtube.com' }
      ];
      const folders = storedFolders ? JSON.parse(storedFolders) : [];

      set({
        privateTabs: pTabs,
        workTabs: wTabs,
        ghostTabs: gTabs,
        pinnedTabs: pins,
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

if (typeof window !== 'undefined') {
  window.__tabStore = useTabStore;
}

export default useTabStore;
