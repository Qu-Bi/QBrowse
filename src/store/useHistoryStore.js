import { create } from 'zustand';

const getActiveHistoryKey = () => {
    try {
        const profileId = window.__profileStore?.getState()?.activeProfileId || 'default';
        return profileId === 'default' ? 'qbrowse_history' : `qbrowse_history_${profileId}`;
    } catch (e) {
        return 'qbrowse_history';
    }
};

// Persistent history store
const useHistoryStore = create((set, get) => ({
    history: [],

    loadHistory: () => {
        try {
            const key = getActiveHistoryKey();
            const data = localStorage.getItem(key);
            if (data) {
                set({ history: JSON.parse(data) });
            } else {
                set({ history: [] });
            }
        } catch (e) {
            console.error('Failed to load history', e);
        }
    },

    serializeCurrentProfileHistory: (profileId) => {
        try {
            const key = (!profileId || profileId === 'default') ? 'qbrowse_history' : `qbrowse_history_${profileId}`;
            localStorage.setItem(key, JSON.stringify(get().history));
        } catch (e) {
            console.error('Failed to serialize profile history', e);
        }
    },

    loadProfileHistory: (profileId) => {
        try {
            const key = (!profileId || profileId === 'default') ? 'qbrowse_history' : `qbrowse_history_${profileId}`;
            const data = localStorage.getItem(key);
            set({ history: data ? JSON.parse(data) : [] });
        } catch (e) {
            console.error('Failed to load profile history', e);
            set({ history: [] });
        }
    },

    addEntry: (url, title) => {
        // Don't add internal pages or empty urls or about:blank
        if (!url || url === 'about:blank' || url.startsWith('about:') || url.startsWith('qbrowse://') || url.startsWith('file://')) return;

        set(state => {
            const cleanTitle = (title && title !== url) ? title : url;
            const existingIndex = state.history.findIndex(item => item.url === url);

            let newHistory;
            if (existingIndex !== -1) {
                const existing = state.history[existingIndex];
                const updatedItem = {
                    ...existing,
                    title: (cleanTitle !== url) ? cleanTitle : existing.title,
                    lastVisit: Date.now(),
                    visits: (existing.visits || 1) + 1
                };
                newHistory = [
                    updatedItem,
                    ...state.history.filter((_, i) => i !== existingIndex)
                ];
            } else {
                newHistory = [
                    { id: Date.now().toString(), url, title: cleanTitle, lastVisit: Date.now(), visits: 1 },
                    ...state.history
                ];
            }

            const slicedHistory = newHistory.slice(0, 1000);
            try {
                localStorage.setItem(getActiveHistoryKey(), JSON.stringify(slicedHistory));
            } catch (e) {}

            return { history: slicedHistory };
        });
    },

    updateLatestTitle: (url, title) => {
        set(state => {
            if (state.history.length === 0) return state;
            const newHistory = [...state.history];
            // If the latest entry matches the URL or is just missing a title (title === url)
            if (newHistory[0].url === url || newHistory[0].title === newHistory[0].url) {
                newHistory[0] = { ...newHistory[0], title };
                try {
                    localStorage.setItem(getActiveHistoryKey(), JSON.stringify(newHistory));
                } catch (e) {}
                return { history: newHistory };
            }
            return state;
        });
    },

    mergeRemoteHistory: (remoteHistory) => {
        if (!Array.isArray(remoteHistory) || remoteHistory.length === 0) return;
        set(state => {
            const historyMap = new Map();
            // Load current local history
            state.history.forEach(item => {
                if (item && item.url) historyMap.set(item.url, { ...item });
            });
            // Merge remote items
            remoteHistory.forEach(remoteItem => {
                if (!remoteItem || !remoteItem.url) return;
                const existing = historyMap.get(remoteItem.url);
                if (existing) {
                    historyMap.set(remoteItem.url, {
                        ...existing,
                        title: (remoteItem.title && remoteItem.title !== remoteItem.url) ? remoteItem.title : existing.title,
                        lastVisit: Math.max(existing.lastVisit || 0, remoteItem.lastVisit || 0),
                        visits: Math.max(existing.visits || 1, remoteItem.visits || 1)
                    });
                } else {
                    historyMap.set(remoteItem.url, {
                        id: remoteItem.id || `cloud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        url: remoteItem.url,
                        title: remoteItem.title || remoteItem.url,
                        lastVisit: remoteItem.lastVisit || Date.now(),
                        visits: remoteItem.visits || 1
                    });
                }
            });

            const merged = Array.from(historyMap.values())
                .sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0))
                .slice(0, 1000);

            try {
                localStorage.setItem(getActiveHistoryKey(), JSON.stringify(merged));
            } catch (e) {}

            return { history: merged };
        });
    },

    clearHistory: () => {
        set({ history: [] });
        try {
            localStorage.removeItem(getActiveHistoryKey());
        } catch (e) {}
    }
}));

// Load initially
useHistoryStore.getState().loadHistory();

if (typeof window !== 'undefined') {
    window.__historyStore = useHistoryStore;
}

export default useHistoryStore;
