import { create } from 'zustand';
import useUIStore from './useUIStore';

export const useGitHubStore = create((set, get) => ({
    authenticated: false,
    username: null,
    reviewRequests: [],
    myPrs: [],
    assignedIssues: [],
    lastUpdated: null,
    isLoading: false,
    activeSubFilter: 'reviews', // 'reviews' | 'prs' | 'issues'
    isLiveFolderOpen: (() => {
        try {
            const saved = localStorage.getItem('qbrowse_gh_folder_open');
            return saved !== null ? saved === 'true' : true;
        } catch (_) {
            return true;
        }
    })(),

    // Hover Peek / Glance state
    hoverGlanceData: null,
    isHoverGlanceOpen: false,

    setSubFilter: (filter) => set({ activeSubFilter: filter }),
    
    toggleLiveFolder: () => {
        set((state) => {
            const next = !state.isLiveFolderOpen;
            try {
                localStorage.setItem('qbrowse_gh_folder_open', String(next));
            } catch (_) {}
            return { isLiveFolderOpen: next };
        });
    },

    openHoverGlance: (rect) => {
        const settings = useUIStore.getState().settings;
        if (!settings?.githubIntegrationEnabled || !settings?.githubHoverGlanceEnabled) return;
        set({ isHoverGlanceOpen: true, hoverGlanceRect: rect });
    },

    closeHoverGlance: () => {
        set({ isHoverGlanceOpen: false, hoverGlanceRect: null });
    },

    syncWithConfig: async () => {
        const settings = useUIStore.getState().settings;
        const profileId = (() => {
            try {
                return localStorage.getItem('qbrowse_active_profile_id') || 'default';
            } catch (_) {
                return 'default';
            }
        })();

        if (!settings?.githubIntegrationEnabled) {
            // Completely tear down background processes and zero out state
            if (typeof window !== 'undefined' && window.electronAPI?.githubStop) {
                try {
                    await window.electronAPI.githubStop();
                } catch (_) {}
            }
            set({
                authenticated: false,
                username: null,
                reviewRequests: [],
                myPrs: [],
                assignedIssues: [],
                isLoading: false,
                isHoverGlanceOpen: false
            });
            return;
        }

        if (typeof window !== 'undefined' && window.electronAPI?.githubUpdateConfig) {
            try {
                await window.electronAPI.githubUpdateConfig({
                    enabled: true,
                    authMode: settings.githubAuthMode || 'auto',
                    token: (settings.githubPersonalAccessToken || '').trim(),
                    interval: settings.githubSyncInterval ?? 10,
                    repoFilter: settings.githubRepoFilter || '',
                    includeDrafts: !!settings.githubIncludeDrafts,
                    showReviews: settings.githubShowReviews ?? true,
                    showMyPrs: settings.githubShowMyPrs ?? true,
                    showAssignedIssues: settings.githubShowAssignedIssues ?? true
                }, profileId);

                await get().fetchData(false);
            } catch (err) {
                console.warn('[useGitHubStore] Failed to sync config:', err);
            }
        }
    },

    fetchData: async (force = false) => {
        const settings = useUIStore.getState().settings;
        if (!settings?.githubIntegrationEnabled) return;
        if (typeof window === 'undefined' || !window.electronAPI?.githubGetData) return;

        set({ isLoading: true });
        try {
            const profileId = (() => {
                try {
                    return localStorage.getItem('qbrowse_active_profile_id') || 'default';
                } catch (_) {
                    return 'default';
                }
            })();

            const res = await window.electronAPI.githubGetData(profileId, force);
            if (res) {
                const reviews = res.reviewRequests || [];
                const prs = res.myPrs || [];
                const issues = res.assignedIssues || [];
                let nextSub = get().activeSubFilter;
                if (reviews.length === 0 && prs.length > 0 && nextSub === 'reviews') {
                    nextSub = 'prs';
                } else if (reviews.length === 0 && prs.length === 0 && issues.length > 0) {
                    nextSub = 'issues';
                }

                set({
                    authenticated: !!res.authenticated,
                    username: res.username || null,
                    reviewRequests: reviews,
                    myPrs: prs,
                    assignedIssues: issues,
                    activeSubFilter: nextSub,
                    lastUpdated: res.lastUpdated || Date.now(),
                    isLoading: false
                });
            } else {
                set({ isLoading: false });
            }
        } catch (err) {
            console.warn('[useGitHubStore] Failed to fetch data:', err);
            set({ isLoading: false });
        }
    }
}));
