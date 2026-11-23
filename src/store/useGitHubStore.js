import { create } from 'zustand';
import useUIStore from './useUIStore';

let closeGlanceTimeout = null;
let unmountGlanceTimeout = null;
let ipcUnsubscribe = null;

function getActiveProfileId() {
    try {
        return localStorage.getItem('qbrowse_active_profile_id') || 'default';
    } catch (_) {
        return 'default';
    }
}

function buildEngineConfig(settings, overrides = {}) {
    const rawToken = overrides.token !== undefined ? overrides.token : (settings?.githubPersonalAccessToken || '');
    const cleanToken = String(rawToken || '').trim();
    const rawUsername = overrides.username !== undefined ? overrides.username : (settings?.githubUsername || '');
    const cleanUsername = String(rawUsername || '').trim().replace(/^@+/, '');
    const rawRepoFilter = overrides.repoFilter !== undefined ? overrides.repoFilter : (settings?.githubRepoFilter || '');
    const cleanRepoFilter = String(rawRepoFilter || '').trim();

    return {
        enabled: overrides.enabled !== undefined ? !!overrides.enabled : !!settings?.githubIntegrationEnabled,
        authMode: cleanToken ? 'token' : (settings?.githubAuthMode || 'auto'),
        token: cleanToken,
        username: cleanUsername,
        interval: settings?.githubSyncInterval ?? 10,
        repoFilter: cleanRepoFilter,
        includeDrafts: !!(settings?.githubIncludeDrafts),
        showReviews: settings?.githubShowReviews ?? true,
        showMyPrs: settings?.githubShowMyPrs ?? true,
        showAssignedIssues: settings?.githubShowAssignedIssues ?? true
    };
}

export const useGitHubStore = create((set, get) => ({
    authenticated: false,
    authMode: 'none', // 'token' | 'session' | 'public' | 'none'
    username: null,
    avatarUrl: null,
    reviewRequests: [],
    myPrs: [],
    assignedIssues: [],
    lastUpdated: null,
    error: null,
    errorCode: null,
    warning: null,
    rateLimitRemaining: null,
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
    hoverGlanceRect: null,
    isHoverGlanceOpen: false,
    isHoverGlanceClosing: false,

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
        if (closeGlanceTimeout) {
            clearTimeout(closeGlanceTimeout);
            closeGlanceTimeout = null;
        }
        if (unmountGlanceTimeout) {
            clearTimeout(unmountGlanceTimeout);
            unmountGlanceTimeout = null;
        }
        set({ isHoverGlanceOpen: true, isHoverGlanceClosing: false, hoverGlanceRect: rect });
    },

    cancelCloseHoverGlance: () => {
        if (closeGlanceTimeout) {
            clearTimeout(closeGlanceTimeout);
            closeGlanceTimeout = null;
        }
        if (unmountGlanceTimeout) {
            clearTimeout(unmountGlanceTimeout);
            unmountGlanceTimeout = null;
        }
        if (get().isHoverGlanceOpen && get().isHoverGlanceClosing) {
            set({ isHoverGlanceClosing: false });
        }
    },

    scheduleCloseHoverGlance: (delayMs = 180) => {
        if (closeGlanceTimeout) clearTimeout(closeGlanceTimeout);
        closeGlanceTimeout = setTimeout(() => {
            closeGlanceTimeout = null;
            get().closeHoverGlance();
        }, delayMs);
    },

    closeHoverGlance: () => {
        if (closeGlanceTimeout) {
            clearTimeout(closeGlanceTimeout);
            closeGlanceTimeout = null;
        }
        if (!get().isHoverGlanceOpen) return;
        set({ isHoverGlanceClosing: true });
        if (unmountGlanceTimeout) clearTimeout(unmountGlanceTimeout);
        unmountGlanceTimeout = setTimeout(() => {
            unmountGlanceTimeout = null;
            set({ isHoverGlanceOpen: false, isHoverGlanceClosing: false, hoverGlanceRect: null });
        }, 200);
    },

    applyResult: (res) => {
        if (!res) {
            set({ isLoading: false });
            return null;
        }

        const reviews = Array.isArray(res.reviewRequests) ? res.reviewRequests : [];
        const prs = Array.isArray(res.myPrs) ? res.myPrs : [];
        const issues = Array.isArray(res.assignedIssues) ? res.assignedIssues : [];

        let nextSub = get().activeSubFilter;
        if (reviews.length === 0 && prs.length > 0 && nextSub === 'reviews') {
            nextSub = 'prs';
        } else if (reviews.length === 0 && prs.length === 0 && issues.length > 0) {
            nextSub = 'issues';
        }

        set({
            authenticated: !!res.authenticated,
            authMode: res.authMode || 'none',
            username: res.username || null,
            avatarUrl: res.avatarUrl || null,
            reviewRequests: reviews,
            myPrs: prs,
            assignedIssues: issues,
            error: res.error || null,
            errorCode: res.errorCode || null,
            warning: res.warning || null,
            rateLimitRemaining: res.rateLimitRemaining ?? null,
            activeSubFilter: nextSub,
            lastUpdated: res.lastUpdated || Date.now(),
            isLoading: false
        });
        return res;
    },

    initListener: () => {
        if (ipcUnsubscribe || typeof window === 'undefined' || !window.electronAPI?.onGitHubDataUpdated) {
            return () => {};
        }
        ipcUnsubscribe = window.electronAPI.onGitHubDataUpdated((data) => {
            const settings = useUIStore.getState().settings;
            if (!settings?.githubIntegrationEnabled) return;
            get().applyResult(data);
        });
        return () => {
            if (ipcUnsubscribe) {
                ipcUnsubscribe();
                ipcUnsubscribe = null;
            }
        };
    },

    syncWithConfig: async (force = false) => {
        const settings = useUIStore.getState().settings;
        const profileId = getActiveProfileId();

        if (!settings?.githubIntegrationEnabled) {
            if (typeof window !== 'undefined' && window.electronAPI?.githubStop) {
                try {
                    await window.electronAPI.githubStop();
                } catch (_) {}
            }
            set({
                authenticated: false,
                authMode: 'none',
                username: null,
                avatarUrl: null,
                reviewRequests: [],
                myPrs: [],
                assignedIssues: [],
                error: null,
                errorCode: null,
                warning: null,
                rateLimitRemaining: null,
                isLoading: false,
                isHoverGlanceOpen: false
            });
            return null;
        }

        if (typeof window !== 'undefined' && window.electronAPI?.githubUpdateConfig) {
            try {
                const config = buildEngineConfig(settings, { enabled: true });
                await window.electronAPI.githubUpdateConfig(config, profileId);
                return await get().fetchData(force);
            } catch (err) {
                console.warn('[useGitHubStore] Failed to sync config:', err);
                set({
                    isLoading: false,
                    error: err?.message || 'Failed to update GitHub configuration.',
                    errorCode: 'SYNC_CONFIG_ERROR'
                });
                return null;
            }
        }
        return null;
    },

    testAndSync: async (overrides = {}) => {
        const uiStore = useUIStore.getState();
        const settings = uiStore.settings || {};
        const profileId = getActiveProfileId();

        const config = buildEngineConfig(settings, { ...overrides, enabled: true });

        // Persist trimmed values cleanly back into settings
        if (uiStore.setSettingValue) {
            if (config.token !== (settings.githubPersonalAccessToken || '')) {
                uiStore.setSettingValue('githubPersonalAccessToken', config.token);
            }
            if (config.username !== (settings.githubUsername || '')) {
                uiStore.setSettingValue('githubUsername', config.username);
            }
            if (config.repoFilter !== (settings.githubRepoFilter || '')) {
                uiStore.setSettingValue('githubRepoFilter', config.repoFilter);
            }
            const expectedAuthMode = config.token ? 'token' : 'auto';
            if (expectedAuthMode !== settings.githubAuthMode) {
                uiStore.setSettingValue('githubAuthMode', expectedAuthMode);
            }
        }

        if (typeof window === 'undefined' || (!window.electronAPI?.githubTestSync && !window.electronAPI?.githubGetData)) {
            const unavailable = {
                authenticated: false,
                authMode: 'none',
                error: 'GitHub Live sync requires the QBrowse desktop runtime.',
                errorCode: 'DESKTOP_ONLY',
                reviewRequests: [],
                myPrs: [],
                assignedIssues: []
            };
            get().applyResult(unavailable);
            return unavailable;
        }

        set({ isLoading: true, error: null, errorCode: null, warning: null });

        try {
            let res = null;
            if (window.electronAPI.githubTestSync) {
                res = await window.electronAPI.githubTestSync(config, profileId);
            } else {
                await window.electronAPI.githubUpdateConfig(config, profileId);
                res = await window.electronAPI.githubGetData(profileId, true);
            }
            return get().applyResult(res || {
                authenticated: false,
                authMode: 'none',
                error: 'No response received from GitHub sync engine.',
                errorCode: 'EMPTY_RESPONSE',
                reviewRequests: [],
                myPrs: [],
                assignedIssues: []
            });
        } catch (err) {
            console.warn('[useGitHubStore] Test & Sync failed:', err);
            const errRes = {
                authenticated: false,
                authMode: 'none',
                error: err?.message || 'Unexpected error while testing GitHub connection.',
                errorCode: 'IPC_ERROR',
                reviewRequests: [],
                myPrs: [],
                assignedIssues: []
            };
            return get().applyResult(errRes);
        }
    },

    fetchData: async (force = false) => {
        const settings = useUIStore.getState().settings;
        if (!settings?.githubIntegrationEnabled) return null;
        if (typeof window === 'undefined' || !window.electronAPI?.githubGetData) return null;

        set({ isLoading: true });
        try {
            const profileId = getActiveProfileId();
            const res = await window.electronAPI.githubGetData(profileId, force);
            return get().applyResult(res);
        } catch (err) {
            console.warn('[useGitHubStore] Failed to fetch data:', err);
            set({
                isLoading: false,
                error: err?.message || 'Failed to fetch GitHub data.',
                errorCode: 'FETCH_ERROR'
            });
            return null;
        }
    }
}));
