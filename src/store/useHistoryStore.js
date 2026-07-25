import { create } from 'zustand';

// Persistent history store
const useHistoryStore = create((set, get) => ({
    history: [],

    loadHistory: () => {
        try {
            const data = localStorage.getItem('qbrowse_history');
            if (data) {
                set({ history: JSON.parse(data) });
            }
        } catch (e) {
            console.error('Failed to load history', e);
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
                localStorage.setItem('qbrowse_history', JSON.stringify(slicedHistory));
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
                    localStorage.setItem('qbrowse_history', JSON.stringify(newHistory));
                } catch (e) {}
                return { history: newHistory };
            }
            return state;
        });
    },

    clearHistory: () => {
        set({ history: [] });
        try {
            localStorage.removeItem('qbrowse_history');
        } catch (e) {}
    }
}));

// Load initially
useHistoryStore.getState().loadHistory();

export default useHistoryStore;
