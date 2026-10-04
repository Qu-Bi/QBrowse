import { create } from 'zustand';
import { unlockVault, unlockVaultWindowsHello, getPasswords, addPassword, deletePassword, updatePassword } from '../services/electronIPC';

const triggerVaultSync = () => {
    const { isUnlocked, passwords } = useVaultStore.getState();
    if (!isUnlocked) return;
    import('./useSyncStore').then(m => {
        const syncStore = m.default.getState();
        if (syncStore.syncCategories?.vault !== false && syncStore.user && syncStore.masterPassword) {
            syncStore.syncDataToCloud('vault', passwords || []);
        }
    }).catch(() => {});
};

export function extractDomain(input) {
    if (!input) return '';
    try {
        const u = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
        return u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch (_) {
        return String(input).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
    }
}

export function matchDomains(d1, d2) {
    if (!d1 || !d2) return false;
    const clean1 = extractDomain(d1);
    const clean2 = extractDomain(d2);
    if (!clean1 || !clean2) return false;
    if (clean1 === clean2) return true;
    if (clean1.endsWith('.' + clean2) || clean2.endsWith('.' + clean1)) return true;
    return false;
}

const useVaultStore = create((set, get) => ({
    isUnlocked: false,
    masterPassword: '',
    pinCode: localStorage.getItem('qbrowse_vault_pin') || '',
    passwords: [],
    cloudVaultBackup: (() => {
        try {
            const pending = localStorage.getItem('qbrowse_vault_cloud_pending');
            return pending ? JSON.parse(pending) : null;
        } catch(e) {
            return null;
        }
    })(),
    isLoading: false,
    error: null,

    unlock: async (password) => {
        set({ isLoading: true, error: null });
        try {
            const unlocked = await unlockVault(password);
            if (unlocked) {
                set({ isUnlocked: true, masterPassword: password, isLoading: false });
                await get().fetchPasswords();
                const pendingRemote = get().cloudVaultBackup || (() => {
                    try {
                        const p = localStorage.getItem('qbrowse_vault_cloud_pending');
                        return p ? JSON.parse(p) : null;
                    } catch(e) { return null; }
                })();
                if (pendingRemote && Array.isArray(pendingRemote) && pendingRemote.length > 0) {
                    await get().mergeRemoteVault(pendingRemote);
                    set({ cloudVaultBackup: null });
                    try { localStorage.removeItem('qbrowse_vault_cloud_pending'); } catch(e) {}
                }
                triggerVaultSync();
                return true;
            } else {
                set({ error: 'Invalid master password', isLoading: false });
                return false;
            }
        } catch (err) {
            set({ error: err.message, isLoading: false });
            return false;
        }
    },

    unlockWithWindowsHello: async () => {
        set({ isLoading: true, error: null });
        try {
            const success = await unlockVaultWindowsHello();
            if (success) {
                set({ isUnlocked: true, isLoading: false });
                await get().fetchPasswords();
                const pendingRemote = get().cloudVaultBackup || (() => {
                    try {
                        const p = localStorage.getItem('qbrowse_vault_cloud_pending');
                        return p ? JSON.parse(p) : null;
                    } catch(e) { return null; }
                })();
                if (pendingRemote && Array.isArray(pendingRemote) && pendingRemote.length > 0) {
                    await get().mergeRemoteVault(pendingRemote);
                    set({ cloudVaultBackup: null });
                    try { localStorage.removeItem('qbrowse_vault_cloud_pending'); } catch(e) {}
                }
                triggerVaultSync();
                return true;
            } else {
                set({ error: 'Windows Security authentication failed', isLoading: false });
                return false;
            }
        } catch (err) {
            set({ error: err.message, isLoading: false });
            return false;
        }
    },

    unlockWithPin: async (pin) => {
        const { pinCode } = get();
        if (!pinCode) {
            set({ error: 'No PIN set yet' });
            return false;
        }
        if (pin === pinCode) {
            // Retrieve stored session master pass if available or unlock
            const storedPass = sessionStorage.getItem('qbrowse_vault_mp');
            if (storedPass) {
                return await get().unlock(storedPass);
            } else {
                set({ isUnlocked: true });
                await get().fetchPasswords();
                const pendingRemote = get().cloudVaultBackup || (() => {
                    try {
                        const p = localStorage.getItem('qbrowse_vault_cloud_pending');
                        return p ? JSON.parse(p) : null;
                    } catch(e) { return null; }
                })();
                if (pendingRemote && Array.isArray(pendingRemote) && pendingRemote.length > 0) {
                    await get().mergeRemoteVault(pendingRemote);
                    set({ cloudVaultBackup: null });
                    try { localStorage.removeItem('qbrowse_vault_cloud_pending'); } catch(e) {}
                }
                triggerVaultSync();
                return true;
            }
        } else {
            set({ error: 'Incorrect PIN code' });
            return false;
        }
    },

    setPin: (pin) => {
        const profileId = window.__profileStore?.getState()?.activeProfileId || 'default';
        const key = (!profileId || profileId === 'default') ? 'qbrowse_vault_pin' : `qbrowse_vault_pin_${profileId}`;
        localStorage.setItem(key, pin);
        set({ pinCode: pin });
    },

    serializeCurrentProfileVault: (profileId) => {
        try {
            const key = (!profileId || profileId === 'default') ? 'qbrowse_vault_pin' : `qbrowse_vault_pin_${profileId}`;
            if (get().pinCode) {
                localStorage.setItem(key, get().pinCode);
            }
        } catch (e) {
            console.error('Failed to serialize profile vault pin', e);
        }
    },

    loadProfileVault: (profileId) => {
        try {
            const key = (!profileId || profileId === 'default') ? 'qbrowse_vault_pin' : `qbrowse_vault_pin_${profileId}`;
            const pin = localStorage.getItem(key) || '';
            set({
                isUnlocked: false,
                masterPassword: '',
                passwords: [],
                cloudVaultBackup: null,
                pinCode: pin,
                error: null
            });
        } catch (e) {
            console.error('Failed to load profile vault', e);
        }
    },

    lock: () => {
        set({ isUnlocked: false, masterPassword: '', passwords: [] });
    },

    fetchPasswords: async () => {
        const { isUnlocked, masterPassword } = get();
        if (!isUnlocked) return;
        
        set({ isLoading: true, error: null });
        try {
            const list = await getPasswords(masterPassword);
            set({ passwords: list || [], isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    mergeRemoteVault: async (remoteVault) => {
        if (!Array.isArray(remoteVault) || remoteVault.length === 0) return;
        let { isUnlocked, masterPassword, passwords } = get();

        // If not unlocked, check if stored session pass from an active session is available
        if (!isUnlocked) {
            const sessionPass = sessionStorage.getItem('qbrowse_vault_mp');
            if (sessionPass) {
                try {
                    const unlocked = await unlockVault(sessionPass);
                    if (unlocked) {
                        set({ isUnlocked: true, masterPassword: sessionPass });
                        await get().fetchPasswords();
                        isUnlocked = true;
                        masterPassword = sessionPass;
                        passwords = get().passwords;
                    }
                } catch(_) {}
            }
        }

        if (!isUnlocked) {
            set({ cloudVaultBackup: remoteVault });
            try {
                localStorage.setItem('qbrowse_vault_cloud_pending', JSON.stringify(remoteVault));
            } catch(e) {}
            return;
        }
        let addedAny = false;
        for (const remoteItem of remoteVault) {
            const exists = passwords.some(p => String(p.id) === String(remoteItem.id) || (p.title === remoteItem.title && p.username === remoteItem.username && p.itemType === remoteItem.itemType));
            if (!exists) {
                try {
                    const payload = {
                        type: remoteItem.itemType || 'login',
                        notes: remoteItem.notes || '',
                        passkeyData: remoteItem.passkeyData || null,
                        cardData: remoteItem.cardData || null,
                        addressData: remoteItem.addressData || null
                    };
                    const jsonPayload = JSON.stringify(payload);
                    const combinedTitle = `${remoteItem.title}|||${jsonPayload}`;
                    await addPassword(combinedTitle, remoteItem.username || '', remoteItem.password || '', remoteItem.url || '', masterPassword);
                    addedAny = true;
                } catch (e) {
                    console.warn("[VaultStore] Failed to merge remote item:", remoteItem.title, e);
                }
            }
        }
        if (addedAny) {
            await get().fetchPasswords();
            triggerVaultSync();
        }
    },

    addNewItem: async ({ type = 'login', title, username = '', password = '', url = '', passkeyData = null, cardData = null, addressData = null, notes = '' }) => {
        const { isUnlocked, masterPassword } = get();
        console.log("[VaultStore Debug] addNewItem called:", { type, title, username, url, isUnlocked });

        set({ isLoading: true });
        try {
            const payload = {
                type,
                notes,
                passkeyData: type === 'passkey' ? (passkeyData || { rpId: url, created: Date.now() }) : null,
                cardData: type === 'card' ? cardData : null,
                addressData: type === 'address' ? addressData : null
            };
            const jsonPayload = JSON.stringify(payload);
            const combinedTitle = `${title}|||${jsonPayload}`;

            await addPassword(combinedTitle, username, password, url, masterPassword);
            console.log("[VaultStore Debug] addPassword IPC resolved successfully for:", title);
            if (isUnlocked) {
                await get().fetchPasswords();
            }
            set({ isLoading: false });
            triggerVaultSync();
        } catch (err) {
            console.error("[VaultStore Debug] addNewItem error:", err);
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    deleteItem: async (id) => {
        console.log('[VaultStore Debug] deleteItem called with id:', id);
        set({ isLoading: true, error: null });
        try {
            const res = await deletePassword(id);
            console.log('[VaultStore Debug] deletePassword IPC returned:', res);
            set(state => {
                const updated = state.passwords.filter(p => String(p.id) !== String(id));
                console.log('[VaultStore Debug] Passwords before:', state.passwords.length, 'after:', updated.length);
                return {
                    passwords: updated,
                    isLoading: false
                };
            });
            triggerVaultSync();
            return res;
        } catch (err) {
            console.error('[VaultStore Debug] deleteItem error:', err);
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    updateItem: async ({ id, type = 'login', title, username = '', password = '', url = '', passkeyData = null, cardData = null, addressData = null, notes = '' }) => {
        set({ isLoading: true, error: null });
        try {
            const payload = {
                type,
                notes,
                passkeyData: type === 'passkey' ? (passkeyData || { rpId: url, created: Date.now() }) : null,
                cardData: type === 'card' ? cardData : null,
                addressData: type === 'address' ? addressData : null
            };
            const jsonPayload = JSON.stringify(payload);
            const combinedTitle = `${title}|||${jsonPayload}`;

            await updatePassword(id, combinedTitle, username, password, url);
            await get().fetchPasswords();
            set({ isLoading: false });
            triggerVaultSync();
        } catch (err) {
            console.error("updateItem error:", err);
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    importBatchItems: async (itemsList) => {
        const { masterPassword, passwords } = get();
        set({ isLoading: true, error: null });
        let importedCount = 0;
        let updatedCount = 0;

        try {
            for (const item of itemsList) {
                const payload = {
                    type: item.type || 'login',
                    notes: item.notes || '',
                    passkeyData: item.passkeyData || null,
                    cardData: item.cardData || null,
                    addressData: item.addressData || null
                };
                const jsonPayload = JSON.stringify(payload);
                const title = item.title || item.url || item.username || 'Imported Account';
                const combinedTitle = `${title}|||${jsonPayload}`;

                // Check if matching credential exists to update rather than duplicate
                const existing = passwords.find(p => 
                    p.username && item.username && 
                    p.username.toLowerCase() === item.username.toLowerCase() &&
                    ((p.url && item.url && matchDomains(p.url, item.url)) || p.title === title)
                );

                if (existing) {
                    await updatePassword(existing.id, combinedTitle, item.username || '', item.password || '', item.url || '');
                    updatedCount++;
                } else {
                    await addPassword(combinedTitle, item.username || '', item.password || '', item.url || '', masterPassword);
                    importedCount++;
                }
            }

            await get().fetchPasswords();
            triggerVaultSync();
            set({ isLoading: false });
            return { importedCount, updatedCount, total: importedCount + updatedCount };
        } catch (err) {
            console.error('[VaultStore] importBatchItems error:', err);
            await get().fetchPasswords();
            set({ isLoading: false, error: err.message });
            throw err;
        }
    },

    exportVaultData: (format = 'json') => {
        const { passwords } = get();
        const exportable = (passwords || []).map(p => {
            let meta = {};
            let rawTitle = p.title || '';
            if (rawTitle.includes('|||')) {
                const parts = rawTitle.split('|||');
                rawTitle = parts[0];
                try { meta = JSON.parse(parts[1]); } catch (_) {}
            }
            return {
                title: rawTitle,
                type: meta.type || 'login',
                username: p.username || '',
                password: p.password || '',
                url: p.url || '',
                notes: meta.notes || '',
                cardData: meta.cardData || null,
                addressData: meta.addressData || null
            };
        });

        if (format === 'json') {
            const dataStr = JSON.stringify({ qvault_version: '1.3.1', exported_at: new Date().toISOString(), items: exportable }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qvault-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const headers = ['title', 'type', 'username', 'password', 'url', 'notes'];
            const rows = exportable.map(i => [
                `"${(i.title || '').replace(/"/g, '""')}"`,
                `"${(i.type || 'login').replace(/"/g, '""')}"`,
                `"${(i.username || '').replace(/"/g, '""')}"`,
                `"${(i.password || '').replace(/"/g, '""')}"`,
                `"${(i.url || '').replace(/"/g, '""')}"`,
                `"${(i.notes || '').replace(/"/g, '""')}"`
            ]);
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qvault-export-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    },

    // --- SMART CREDENTIAL PROMPTS & AUTOFILL ---
    pendingSavePrompt: null,
    neverSaveDomains: (() => {
        try {
            return JSON.parse(localStorage.getItem('qbrowse_vault_never_save') || '[]');
        } catch (_) {
            return [];
        }
    })(),
    allowVaultInGhostTor: localStorage.getItem('qbrowse_vault_ghost_tor') !== 'false',

    setPendingSavePrompt: (prompt) => set({ pendingSavePrompt: prompt }),
    dismissSavePrompt: () => set({ pendingSavePrompt: null }),

    addNeverSaveDomain: (domain) => {
        const clean = extractDomain(domain);
        if (!clean) return;
        const current = get().neverSaveDomains || [];
        if (!current.includes(clean)) {
            const next = [...current, clean];
            localStorage.setItem('qbrowse_vault_never_save', JSON.stringify(next));
            set(state => ({
                neverSaveDomains: next,
                pendingSavePrompt: (state.pendingSavePrompt && extractDomain(state.pendingSavePrompt.domain) === clean) ? null : state.pendingSavePrompt
            }));
        }
    },

    removeNeverSaveDomain: (domain) => {
        const clean = extractDomain(domain);
        const current = get().neverSaveDomains || [];
        const next = current.filter(d => d !== clean && d !== domain);
        localStorage.setItem('qbrowse_vault_never_save', JSON.stringify(next));
        set({ neverSaveDomains: next });
    },

    setAllowVaultInGhostTor: (allow) => {
        localStorage.setItem('qbrowse_vault_ghost_tor', String(allow));
        set({ allowVaultInGhostTor: !!allow });
    },

    getMatchingCredentials: (urlOrHost) => {
        const { isUnlocked, passwords } = get();
        if (!isUnlocked || !Array.isArray(passwords) || passwords.length === 0) return [];
        const targetDomain = extractDomain(urlOrHost);
        if (!targetDomain) return [];

        return passwords
            .filter(p => {
                const isLogin = !p.itemType || p.itemType === 'login';
                if (!isLogin) return false;
                if (!p.username || !p.password) return false;

                const itemDomain = extractDomain(p.url || p.title);
                if (matchDomains(targetDomain, itemDomain)) return true;
                if (p.title && targetDomain.includes(p.title.toLowerCase())) return true;
                return false;
            })
            .map(p => ({
                id: p.id,
                title: p.title,
                username: p.username,
                password: p.password
            }));
    },

    saveOrUpdateCredential: async ({ domain, url, username, password, isUpdate, existingId }) => {
        if (isUpdate && existingId) {
            await get().updateItem({
                id: existingId,
                type: 'login',
                title: domain,
                username,
                password,
                url: url || `https://${domain}`
            });
        } else {
            await get().addNewItem({
                type: 'login',
                title: domain,
                username,
                password,
                url: url || `https://${domain}`
            });
        }
        set({ pendingSavePrompt: null });
        return true;
    }
}));

if (typeof window !== 'undefined') {
    window.__vaultStore = useVaultStore;
}

export default useVaultStore;
