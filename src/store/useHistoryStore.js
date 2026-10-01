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
                const parsed = JSON.parse(data);
                const sanitized = Array.isArray(parsed) 
                    ? parsed.filter(item => item && item.url && !item.url.includes('.onion') && item.space !== 'ghost' && item.space !== 'tor') 
                    : [];
                if (Array.isArray(parsed) && sanitized.length !== parsed.length) {
                    try { localStorage.setItem(key, JSON.stringify(sanitized)); } catch (_) {}
                }
                set({ history: sanitized });
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
            const cleanHistory = (get().history || []).filter(item => item && item.url && !item.url.includes('.onion') && item.space !== 'ghost' && item.space !== 'tor');
            localStorage.setItem(key, JSON.stringify(cleanHistory));
        } catch (e) {
            console.error('Failed to serialize profile history', e);
        }
    },

    loadProfileHistory: (profileId) => {
        try {
            const key = (!profileId || profileId === 'default') ? 'qbrowse_history' : `qbrowse_history_${profileId}`;
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                const sanitized = Array.isArray(parsed) 
                    ? parsed.filter(item => item && item.url && !item.url.includes('.onion') && item.space !== 'ghost' && item.space !== 'tor') 
                    : [];
                set({ history: sanitized });
            } else {
                set({ history: [] });
            }
        } catch (e) {
            console.error('Failed to load profile history', e);
            set({ history: [] });
        }
    },

    addEntry: (url, title, space) => {
        // STRICT PRIVACY: Never save history for Ghost (incognito) or Tor spaces or .onion domains
        if (space === 'ghost' || space === 'tor') return;
        const currentSpace = typeof window !== 'undefined' ? window.__tabStore?.getState()?.activeSpace : null;
        if (currentSpace === 'ghost' || currentSpace === 'tor') return;
        if (!url || url === 'about:blank' || url.startsWith('about:') || url.startsWith('qbrowse://') || url.startsWith('file://')) return;
        if (url.includes('.onion')) return;

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

    updateLatestTitle: (url, title, space) => {
        // STRICT PRIVACY: Never update or save history for Ghost or Tor spaces or .onion
        if (space === 'ghost' || space === 'tor') return;
        const currentSpace = typeof window !== 'undefined' ? window.__tabStore?.getState()?.activeSpace : null;
        if (currentSpace === 'ghost' || currentSpace === 'tor') return;
        if (!url || url.includes('.onion')) return;

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
            // Load current local history (filtering out any ghost/tor/.onion)
            state.history.forEach(item => {
                if (item && item.url && !item.url.includes('.onion') && item.space !== 'ghost' && item.space !== 'tor') {
                    historyMap.set(item.url, { ...item });
                }
            });
            // Merge remote items
            remoteHistory.forEach(remoteItem => {
                if (!remoteItem || !remoteItem.url || remoteItem.url.includes('.onion') || remoteItem.space === 'ghost' || remoteItem.space === 'tor') return;
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
            // Remove all profile history entries from localStorage to guarantee total clean wipe
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('qbrowse_history')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {}

        // Push empty history to Cloud Sync immediately so it doesn't resurrect from cloud
        try {
            const syncStore = typeof window !== 'undefined' ? window.__syncStore : null;
            if (syncStore?.getState()?.user && typeof syncStore?.getState()?.syncDataToCloud === 'function') {
                syncStore.getState().syncDataToCloud('history', []);
            }
        } catch (e) {}
    }
}));

// Load initially
useHistoryStore.getState().loadHistory();

if (typeof window !== 'undefined') {
    window.__historyStore = useHistoryStore;
}

export default useHistoryStore;
