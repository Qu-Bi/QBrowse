import { create } from 'zustand';
import useUIStore from './useUIStore';

const useTabStore = create((set, get) => ({
  activeSpace: 'prywatne',
  setActiveSpace: (space) => set({ activeSpace: space }),

  draggedItem: null,
  setDraggedItem: (item) => set({ draggedItem: item }),
  dragOverItem: null,
  setDragOverItem: (item) => set({ dragOverItem: item }),

  pinnedTabs: [
    { id: 'p1', title: 'Messenger', domain: 'messenger.com' },
    { id: 'p2', title: 'X.com', domain: 'x.com' },
    { id: 'p3', title: 'Figma', domain: 'figma.com' }
  ],
  setPinnedTabs: (tabs) => set({ pinnedTabs: tabs }),

  privateTabs: [
    { id: 't1', title: 'New Tab', url: '', active: true, folderId: null },
    { id: 't2', title: 'YouTube - FPV Drones', url: 'youtube.com', active: false, folderId: null, isAudioPlaying: true, isMuted: false },
    { id: 't3', title: 'QBrowse Web App', url: 'qbrowse.local', active: false, folderId: 'f1' },
    { id: 't4', title: 'ChatGPT - Tauri Backend', url: 'chatgpt.com', active: false, folderId: 'f1' },
    { id: 't5', title: 'GitHub - qbrowse/core', url: 'github.com', active: false, folderId: null }
  ],
  setPrivateTabs: (tabs) => set({ privateTabs: typeof tabs === 'function' ? tabs(get().privateTabs) : tabs }),

  workTabs: [
    { id: 'w1', title: 'Jira - Sprint Board', url: 'jira.com', active: true, folderId: 'f2' },
    { id: 'w2', title: 'Tauri Documentation', url: 'tauri.app', active: false, folderId: 'f2' },
    { id: 'w3', title: 'AWS Management Console', url: 'aws.amazon.com', active: false, folderId: null }
  ],
  setWorkTabs: (tabs) => set({ workTabs: typeof tabs === 'function' ? tabs(get().workTabs) : tabs }),

  ghostTabs: [
    { id: 'g1', title: 'New Incognito Tab', url: '', active: true, folderId: null }
  ],
  setGhostTabs: (tabs) => set({ ghostTabs: typeof tabs === 'function' ? tabs(get().ghostTabs) : tabs }),

  // Actions
  getActiveList: () => {
    const space = get().activeSpace;
    return space === 'prywatne' ? get().privateTabs : (space === 'praca' ? get().workTabs : get().ghostTabs);
  },
  
  getActiveSetList: () => {
    const space = get().activeSpace;
    return space === 'prywatne' ? get().setPrivateTabs : (space === 'praca' ? get().setWorkTabs : get().setGhostTabs);
  },

  handleNewTab: () => {
    const newTab = { id: `t-${Date.now()}`, title: 'New Tab', url: '', active: true, folderId: null };
    const setList = get().getActiveSetList();
    setList(prev => [...prev.map(t => ({ ...t, active: false })), newTab]);
    useUIStore.getState().setCurrentUrl('');
    useUIStore.getState().showToast('New tab created');
  },

  handleCloseTab: (id) => {
    const space = get().activeSpace;
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    
    if (list.find(t => t.id === id)) {
      setList(list.map(t => t.id === id ? { ...t, isClosing: true } : t));
      setTimeout(() => {
        setList(prev => prev.filter(t => t.id !== id));
      }, 200);
    }
    useUIStore.getState().showToast('Tab closed');
  },

  handleToggleMute: (id, spaceType) => {
    const toggle = (list, setList) => setList(list.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t));
    if (spaceType === 'prywatne') toggle(get().privateTabs, get().setPrivateTabs);
    if (spaceType === 'praca') toggle(get().workTabs, get().setWorkTabs);
    if (spaceType === 'ghost') toggle(get().ghostTabs, get().setGhostTabs);
  },

  handlePinTab: (tab) => {
    const { activeSpace, pinnedTabs, privateTabs, workTabs, setPinnedTabs, setPrivateTabs, setWorkTabs } = get();
    setPinnedTabs([...pinnedTabs, { id: `p-${tab.id}-${Date.now()}`, title: tab.title, domain: tab.url }]);
    if (activeSpace === 'prywatne') setPrivateTabs(privateTabs.filter(t => t.id !== tab.id));
    if (activeSpace === 'praca') setWorkTabs(workTabs.filter(t => t.id !== tab.id));
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
    get().setDraggedItem({ tab, spaceType });
    if(e) e.dataTransfer.effectAllowed = "move";
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
    const list = spaceType === 'prywatne' ? get().privateTabs : (spaceType === 'praca' ? get().workTabs : get().ghostTabs);
    const setList = spaceType === 'prywatne' ? get().setPrivateTabs : (spaceType === 'praca' ? get().setWorkTabs : get().setGhostTabs);
    
    const draggedIdx = list.findIndex(t => t.id === draggedItem.tab.id);
    const newList = [...list];
    const [removed] = newList.splice(draggedIdx, 1);
    removed.folderId = targetTab.folderId;
    const targetIdx = newList.findIndex(t => t.id === targetTab.id);
    newList.splice(targetIdx, 0, removed);
    setList(newList);
    get().setDraggedItem(null);
  },

  handleDropFolder: (e, spaceType, targetFolderId) => {
    if(e) e.preventDefault();
    const draggedItem = get().draggedItem;
    get().setDragOverItem(null);
    if (!draggedItem || draggedItem.spaceType !== spaceType) return;
    
    const list = spaceType === 'prywatne' ? get().privateTabs : (spaceType === 'praca' ? get().workTabs : get().ghostTabs);
    const setList = spaceType === 'prywatne' ? get().setPrivateTabs : (spaceType === 'praca' ? get().setWorkTabs : get().setGhostTabs);
    
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

    const list = spaceType === 'prywatne' ? get().privateTabs : (spaceType === 'praca' ? get().workTabs : get().ghostTabs);
    const setList = spaceType === 'prywatne' ? get().setPrivateTabs : (spaceType === 'praca' ? get().setWorkTabs : get().setGhostTabs);
    
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
    const updateTab = (list, setList) => setList(list.map(t => t.active ? { ...t, url: '', title: 'New Tab' } : t));
    const activeSpace = get().activeSpace;
    if (activeSpace === 'prywatne') updateTab(get().privateTabs, get().setPrivateTabs);
    else if (activeSpace === 'praca') updateTab(get().workTabs, get().setWorkTabs);
    else updateTab(get().ghostTabs, get().setGhostTabs);

    useUIStore.getState().setCurrentUrl('');
    useUIStore.getState().setIsFullscreen(false);
  }
}));

export default useTabStore;
