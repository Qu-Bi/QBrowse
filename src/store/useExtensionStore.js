import { create } from 'zustand';
import useTabStore from './useTabStore';
import useProfileStore from './useProfileStore';

/**
 * Extracts a 32-character Chrome Web Store extension ID ([a-p]{32})
 * from either a raw ID or a Chrome Web Store URL.
 */
export function extractCwsExtensionId(extIdOrUrl) {
    if (!extIdOrUrl || typeof extIdOrUrl !== 'string') return null;
    const trimmed = extIdOrUrl.trim();
    if (/^[a-p]{32}$/i.test(trimmed)) {
        return trimmed.toLowerCase();
    }
    const detailMatch = trimmed.match(
        /chrome(?:webstore\.google|\.google)\.com\/(?:webstore\/)?detail\/(?:[^/]+\/)?([a-p]{32})(?:[/?#]|$)/i
    );
    if (detailMatch?.[1]) {
        return detailMatch[1].toLowerCase();
    }
    const fallbackMatch = trimmed.match(/\b([a-p]{32})\b/i);
    return fallbackMatch?.[1] ? fallbackMatch[1].toLowerCase() : null;
}

const getActiveProfileId = (explicitProfileId) => {
    if (explicitProfileId) return explicitProfileId;
    return useProfileStore.getState?.().activeProfileId || 'default';
};

const isCwsExtensionEntry = (ext, fallbackId) => {
    if (ext?.source === 'cws') return true;
    const candidate = ext?.id || fallbackId;
    return typeof candidate === 'string' && /^[a-p]{32}$/i.test(candidate.trim());
};

const triggerExtensionsSyncPush = (delayMs = 5000) => {
    import('./useSyncStore')
        .then((m) => {
            const syncState = m?.default?.getState?.();
            if (!syncState || syncState.syncCategories?.extensions === false) return;
            syncState.triggerDebouncedSync?.(delayMs);
        })
        .catch(() => {});
};

let listenersInitialized = false;
let cleanupListeners = [];

const useExtensionStore = create((set, get) => ({
    extensions: [],
    actionStates: {},
    contextMenus: [],
    activePopupExtId: null,
    pendingInstall: null,
    isInstalling: false,
    installError: null,
    isReconcilingSync: false,

    initListeners: () => {
        if (listenersInitialized) {
            return () => {};
        }
        listenersInitialized = true;

        const api = typeof window !== 'undefined' ? window.electronAPI : null;
        const unsubs = [];

        if (api?.onExtListChanged) {
            const unsub = api.onExtListChanged((payload) => {
                const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.extensions) ? payload.extensions : []);
                set({ extensions: list });
            });
            if (typeof unsub === 'function') unsubs.push(unsub);
        }

        if (api?.onExtActionStateChanged) {
            const unsub = api.onExtActionStateChanged((payload) => {
                if (!payload?.extId) return;
                set((state) => ({
                    actionStates: {
                        ...state.actionStates,
                        [payload.extId]: {
                            ...(state.actionStates[payload.extId] || {}),
                            ...(payload.actionState || payload)
                        }
                    }
                }));
            });
            if (typeof unsub === 'function') unsubs.push(unsub);
        }

        if (api?.onExtContextMenusChanged) {
            const unsub = api.onExtContextMenusChanged((payload) => {
                const menus = Array.isArray(payload) ? payload : (Array.isArray(payload?.menus) ? payload.menus : []);
                set({ contextMenus: menus });
            });
            if (typeof unsub === 'function') unsubs.push(unsub);
        }

        cleanupListeners = unsubs;
        get().refreshExtensions();

        return () => {
            cleanupListeners.forEach((fn) => {
                try { fn(); } catch (_) {}
            });
            cleanupListeners = [];
            listenersInitialized = false;
        };
    },

    refreshExtensions: async (profileId) => {
        const api = typeof window !== 'undefined' ? window.electronAPI : null;
        const pid = getActiveProfileId(profileId);
        try {
            if (api?.extList) {
                const res = await api.extList(pid);
                const list = Array.isArray(res) ? res : (Array.isArray(res?.extensions) ? res.extensions : []);
                set({ extensions: list });
                return list;
            }
        } catch (err) {
            console.error('[useExtensionStore] refreshExtensions failed:', err);
        }
        return get().extensions;
    },

    previewCwsInstall: async (extIdOrUrl, profileId) => {
        const extId = extractCwsExtensionId(extIdOrUrl);
        if (!extId) {
            const msg = 'Invalid Chrome Web Store URL or Extension ID';
            set({ installError: msg, isInstalling: false });
            return { ok: false, error: msg };
        }

        const pid = getActiveProfileId(profileId);
        set({ isInstalling: true, installError: null });

        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (!api?.extPreviewCws) {
                const msg = 'Extension runtime is not available yet';
                set({ installError: msg, isInstalling: false });
                return { ok: false, error: msg };
            }
            const res = await api.extPreviewCws(extId, pid);
            if (res?.error || res?.ok === false) {
                const msg = res.error || 'Failed to fetch extension metadata';
                set({ installError: msg, isInstalling: false });
                return { ok: false, error: msg };
            }
            const pending = {
                id: extId,
                profileId: pid,
                ...(res?.manifest || res?.extension || res || {})
            };
            pending.id = pending.id || extId;
            set({ pendingInstall: pending, isInstalling: false, installError: null });
            return { ok: true, pendingInstall: pending };
        } catch (err) {
            const msg = err?.message || 'Failed to preview extension';
            set({ installError: msg, isInstalling: false });
            return { ok: false, error: msg };
        }
    },

    confirmCwsInstall: async () => {
        const pending = get().pendingInstall;
        if (!pending?.id) return { ok: false, error: 'No pending installation' };

        set({ isInstalling: true, installError: null });
        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (!api?.extConfirmInstallCws) {
                const msg = 'Extension installer is not available';
                set({ installError: msg, isInstalling: false });
                return { ok: false, error: msg };
            }
            const res = await api.extConfirmInstallCws(
                pending.id,
                pending.stagedPath,
                getActiveProfileId(pending.profileId)
            );
            if (res?.error || res?.ok === false) {
                const msg = res.error || 'Failed to install extension';
                set({ installError: msg, isInstalling: false });
                return { ok: false, error: msg };
            }
            set({ pendingInstall: null, isInstalling: false, installError: null });
            await get().refreshExtensions(pending.profileId);
            if (!get().isReconcilingSync) {
                triggerExtensionsSyncPush();
            }
            return { ok: true };
        } catch (err) {
            const msg = err?.message || 'Failed to install extension';
            set({ installError: msg, isInstalling: false });
            return { ok: false, error: msg };
        }
    },

    cancelCwsInstall: () => {
        set({ pendingInstall: null, installError: null, isInstalling: false });
    },

    pickAndInstallUnpacked: async (profileId) => {
        const pid = getActiveProfileId(profileId);
        set({ isInstalling: true, installError: null });
        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (!api?.extPickUnpackedFolder || !api?.extInstallUnpacked) {
                set({ isInstalling: false, installError: 'Unpacked extension loader is not available' });
                return { ok: false };
            }
            const pickRes = await api.extPickUnpackedFolder();
            if (!pickRes || pickRes.canceled || !pickRes.path) {
                set({ isInstalling: false });
                return { ok: false, canceled: true };
            }
            const res = await api.extInstallUnpacked(pickRes.path, pid);
            if (res?.error || res?.ok === false) {
                set({ isInstalling: false, installError: res.error || 'Failed to load unpacked extension' });
                return { ok: false, error: res.error };
            }
            set({ isInstalling: false, installError: null });
            await get().refreshExtensions(pid);
            return { ok: true, extension: res?.extension || res };
        } catch (err) {
            const msg = err?.message || 'Failed to load unpacked extension';
            set({ isInstalling: false, installError: msg });
            return { ok: false, error: msg };
        }
    },

    setEnabled: async (extId, enabled) => {
        const targetExt = get().extensions.find((ext) => ext.id === extId);
        set((state) => ({
            extensions: state.extensions.map((ext) =>
                ext.id === extId ? { ...ext, enabled } : ext
            ),
            activePopupExtId: !enabled && state.activePopupExtId === extId ? null : state.activePopupExtId
        }));
        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (api?.extSetEnabled) {
                await api.extSetEnabled(extId, enabled);
                await get().refreshExtensions();
            }
            if (!get().isReconcilingSync && isCwsExtensionEntry(targetExt, extId)) {
                triggerExtensionsSyncPush();
            }
        } catch (err) {
            console.error('[useExtensionStore] setEnabled failed:', err);
        }
    },

    setPinned: async (extId, pinned) => {
        const targetExt = get().extensions.find((ext) => ext.id === extId);
        set((state) => ({
            extensions: state.extensions.map((ext) =>
                ext.id === extId ? { ...ext, pinned } : ext
            )
        }));
        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (api?.extSetPinned) {
                await api.extSetPinned(extId, pinned);
                await get().refreshExtensions();
            }
            if (!get().isReconcilingSync && isCwsExtensionEntry(targetExt, extId)) {
                triggerExtensionsSyncPush();
            }
        } catch (err) {
            console.error('[useExtensionStore] setPinned failed:', err);
        }
    },

    reloadExtension: async (extId) => {
        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (api?.extReload) {
                await api.extReload(extId);
                await get().refreshExtensions();
            }
        } catch (err) {
            console.error('[useExtensionStore] reloadExtension failed:', err);
        }
    },

    removeExtension: async (extId) => {
        const targetExt = get().extensions.find((ext) => ext.id === extId);
        set((state) => ({
            extensions: state.extensions.filter((ext) => ext.id !== extId),
            activePopupExtId: state.activePopupExtId === extId ? null : state.activePopupExtId
        }));
        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (api?.extRemove) {
                await api.extRemove(extId);
                await get().refreshExtensions();
            }
            if (!get().isReconcilingSync && isCwsExtensionEntry(targetExt, extId)) {
                triggerExtensionsSyncPush();
            }
        } catch (err) {
            console.error('[useExtensionStore] removeExtension failed:', err);
        }
    },

    reconcileSyncedExtensions: async (syncedList, profileId) => {
        if (!Array.isArray(syncedList) || syncedList.length === 0) return;
        const pid = getActiveProfileId(profileId);
        const api = typeof window !== 'undefined' ? window.electronAPI : null;
        set({ isReconcilingSync: true });
        try {
            const localMap = new Map(
                (get().extensions || []).map((ext) => [String(ext?.id || '').toLowerCase(), ext])
            );
            let installedAny = false;
            for (const item of syncedList) {
                const cwsId = extractCwsExtensionId(item?.id);
                if (!cwsId) continue;
                const desiredEnabled = item.enabled !== false;
                const desiredPinned = Boolean(item.pinned);
                const local = localMap.get(cwsId);
                if (!local) {
                    if (api?.extInstallCwsDirect) {
                        try {
                            await api.extInstallCwsDirect(cwsId, { enabled: desiredEnabled, pinned: desiredPinned }, pid);
                            installedAny = true;
                        } catch (err) {
                            console.error(`[useExtensionStore] reconcileSyncedExtensions install failed for ${cwsId}:`, err);
                        }
                    }
                } else {
                    if ((local.enabled !== false) !== desiredEnabled) {
                        await get().setEnabled(local.id, desiredEnabled);
                    }
                    if (Boolean(local.pinned) !== desiredPinned) {
                        await get().setPinned(local.id, desiredPinned);
                    }
                }
            }
            if (installedAny) {
                await get().refreshExtensions(pid);
            }
        } finally {
            set({ isReconcilingSync: false });
        }
    },

    openExtensionPopup: (extId) => {
        set({ activePopupExtId: extId || null });
    },

    closeExtensionPopup: () => {
        set({ activePopupExtId: null });
    },

    openOptionsPage: (extId) => {
        const ext = get().extensions.find((e) => e.id === extId);
        if (!ext) return;
        const optionsUrl = ext.optionsUrl || (ext.optionsPage ? `chrome-extension://${ext.id}/${String(ext.optionsPage).replace(/^\/+/, '')}` : null);
        if (optionsUrl) {
            useTabStore.getState().handleNewTab(optionsUrl, true);
        } else if (window.electronAPI?.extOpenOptions) {
            window.electronAPI.extOpenOptions(extId);
        }
    },

    syncTabsToMain: (tabs) => {
        try {
            const api = typeof window !== 'undefined' ? window.electronAPI : null;
            if (!api?.extSyncTabs) return;
            const payload = Array.isArray(tabs)
                ? tabs.map((t, index) => {
                    let wcId = typeof t.webContentsId === 'number' ? t.webContentsId : null;
                    if (!wcId && typeof window !== 'undefined' && window.qbrowseWebviews) {
                        try {
                            const wv = window.qbrowseWebviews[t.id];
                            if (wv && typeof wv.getWebContentsId === 'function') {
                                wcId = wv.getWebContentsId();
                            }
                        } catch (_) {}
                    }
                    return {
                        id: wcId || t.id,
                        qbrowseTabId: t.id,
                        index,
                        url: t.url || 'about:blank',
                        title: t.title || '',
                        active: Boolean(t.active),
                        pinned: Boolean(t.pinned),
                        favIconUrl: t.favicon || ''
                    };
                })
                : [];
            api.extSyncTabs(null, payload);
        } catch (_) {}
    }
}));

export default useExtensionStore;
