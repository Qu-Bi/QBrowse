const fs = require('fs');

let text = fs.readFileSync('src/store/useTabStore.js', 'utf-8');

// Add closedTabs state
text = text.replace(/ghostTabs: \[([\s\S]*?)\],([\s\S]*?)setGhostTabs:/, `ghostTabs: [$1],$2setGhostTabs:`);
text = text.replace(/setGhostTabs: \(tabs\) => set\(\{ ghostTabs: typeof tabs === 'function' \? tabs\(get\(\)\.ghostTabs\) : tabs \}\),/, `setGhostTabs: (tabs) => set({ ghostTabs: typeof tabs === 'function' ? tabs(get().ghostTabs) : tabs }),

  closedTabs: [],
  pushClosedTab: (tab) => set(state => ({ closedTabs: [...state.closedTabs, tab].slice(-20) })),
  reopenLastClosedTab: () => {
      const closedTabs = get().closedTabs;
      if (closedTabs.length > 0) {
          const tabToRestore = closedTabs[closedTabs.length - 1];
          set(state => ({ closedTabs: closedTabs.slice(0, -1) }));
          get().addTab({ ...tabToRestore, active: true, id: \`t-\${Date.now()}\` });
      }
  },`);

// Modify handleCloseTab
const oldCloseTab = `handleCloseTab: (id) => {
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    if (list.length === 1) {
        // Last tab: don't remove it, just reset it to Zen Dashboard
        const updateTab = (list, setList) => setList(list.map(t => t.active ? { ...t, url: '', title: 'New Tab', lastActiveAt: Date.now(), suspended: false } : t));
        updateTab(list, setList);
        useUIStore.getState().setCurrentUrl('');
        return;
    }
    
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const wasActive = list[index].active;
    const newList = [...list];
    newList.splice(index, 1);
    
    if (wasActive && newList.length > 0) {
        const nextIndex = Math.min(index, newList.length - 1);
        newList[nextIndex].active = true;
        useUIStore.getState().setCurrentUrl(newList[nextIndex].url);
    }
    
    setList(newList);
  },`;

const newCloseTab = `handleCloseTab: (id) => {
    const list = get().getActiveList();
    const setList = get().getActiveSetList();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const tabToClose = list[index];
    if (tabToClose.url && tabToClose.url !== 'about:blank') {
        get().pushClosedTab(tabToClose);
    }

    if (list.length === 1) {
        // Last tab: don't remove it, just reset it to Zen Dashboard
        const updateTab = (list, setList) => setList(list.map(t => t.active ? { ...t, url: '', title: 'New Tab', lastActiveAt: Date.now(), suspended: false } : t));
        updateTab(list, setList);
        useUIStore.getState().setCurrentUrl('');
        return;
    }
    
    const wasActive = list[index].active;
    const newList = [...list];
    newList.splice(index, 1);
    
    if (wasActive && newList.length > 0) {
        const nextIndex = Math.min(index, newList.length - 1);
        newList[nextIndex].active = true;
        useUIStore.getState().setCurrentUrl(newList[nextIndex].url);
    }
    
    setList(newList);
  },`;

text = text.replace(oldCloseTab, newCloseTab);

fs.writeFileSync('src/store/useTabStore.js', text);
console.log('Fixed useTabStore.js');
