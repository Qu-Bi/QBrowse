import { create } from 'zustand';
import useUIStore from './useUIStore';

const useTabStore = create((set, get) => ({
  activeSpace: 'personal',
  setActiveSpace: (space) => set((state) => {
      const updates = { activeSpace: space };
      if (state.activeSpace === 'ghost' && space !== 'ghost') {
          updates.ghostTabs = [{ id: 'g-' + Date.now(), title: 'New Incognito Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false }];
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
        folders: state.folders.filter(f => f.id !== id)
    }));
  },
  
  toggleFolder: (id) => {
    set(state => ({ folders: state.folders.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f) }));
  },

  pinnedTabs: [],
  setPinnedTabs: (tabs) => set({ pinnedTabs: tabs }),

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

  // Actions
  getActiveList: () => {
    const space = get().activeSpace;
    return space === 'personal' ? get().privateTabs : (space === 'work' ? get().workTabs : get().ghostTabs);
  },
  
  getActiveSetList: () => {
    const space = get().activeSpace;
    return space === 'personal' ? get().setPrivateTabs : (space === 'work' ? get().setWorkTabs : get().setGhostTabs);
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
    const setList = get().getActiveSetList();
    setList(prev => [...prev.map(t => ({ ...t, active: false })), { ...tabObj, lastActiveAt: Date.now(), suspended: false }]);
    useUIStore.getState().setCurrentUrl('');
    useUIStore.getState().showToast('New tab created');
  },

  handleNewTab: () => {
    get().addTab({ id: `t-${Date.now()}`, title: 'New Tab', url: '', active: true, folderId: null });
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
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    
    const tabToClose = list.find(t => t.id === id);
    if (!tabToClose) return;

    if (list.length === 1) {
        // Last tab: don't remove it, just reset it to Zen Dashboard
        setList([{ ...tabToClose, url: '', title: 'New Tab', lastActiveAt: Date.now() }]);
        useUIStore.getState().setCurrentUrl('');
        return;
    }

    setList(list.map(t => t.id === id ? { ...t, isClosing: true } : t));
    
    setTimeout(() => {
        const currentList = get().getActiveList();
        const newList = currentList.filter(t => t.id !== id);
        
        if (tabToClose.active && newList.length > 0) {
            const closedIdx = currentList.findIndex(t => t.id === id);
            const nextIdx = Math.max(0, closedIdx > 0 ? closedIdx - 1 : 0);
            newList[nextIdx].active = true;
            useUIStore.getState().setCurrentUrl(newList[nextIdx].url);
        }
        
        setList(newList);
    }, 200);
    useUIStore.getState().showToast('Tab closed');
  },

  handleSwitchToTab: (tabId, spaceType) => {
    if (get().activeSpace !== spaceType) {
        get().setActiveSpace(spaceType);
    }
    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : get().ghostTabs);
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : get().setGhostTabs);
    
    setList(list.map(t => ({
        ...t,
        active: t.id === tabId,
        lastActiveAt: t.id === tabId ? Date.now() : t.lastActiveAt
    })));
  },

  handleToggleMute: (id, spaceType) => {
    const toggle = (list, setList) => setList(list.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t));
    if (spaceType === 'personal') toggle(get().privateTabs, get().setPrivateTabs);
    if (spaceType === 'work') toggle(get().workTabs, get().setWorkTabs);
    if (spaceType === 'ghost') toggle(get().ghostTabs, get().setGhostTabs);
  },

  handlePinTab: (tab) => {
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
    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : get().ghostTabs);
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : get().setGhostTabs);
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
    
    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : get().ghostTabs);
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : get().setGhostTabs);
    
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

    const list = spaceType === 'personal' ? get().privateTabs : (spaceType === 'work' ? get().workTabs : get().ghostTabs);
    const setList = spaceType === 'personal' ? get().setPrivateTabs : (spaceType === 'work' ? get().setWorkTabs : get().setGhostTabs);
    
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
    else updateTab(get().ghostTabs, get().setGhostTabs);

    useUIStore.getState().setCurrentUrl('');
    useUIStore.getState().setIsFullscreen(false);
  },

  updateTabActivity: (tabId) => {
    const update = (list) => list.map(t => t.id === tabId ? { ...t, lastActiveAt: Date.now(), suspended: false } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
  },

  suspendTab: (tabId) => {
    const update = (list) => list.map(t => t.id === tabId ? { ...t, suspended: true } : t);
    get().setPrivateTabs(update(get().privateTabs));
    get().setWorkTabs(update(get().workTabs));
    get().setGhostTabs(update(get().ghostTabs));
  }
}));

export default useTabStore;
