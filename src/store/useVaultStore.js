import { create } from 'zustand';
import { unlockVault, unlockVaultWindowsHello, getPasswords, addPassword, deletePassword, updatePassword } from '../services/electronIPC';

export function isRawCiphertextString(str) {
    return typeof str === 'string' && /^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(str.trim());
}

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

export const enrichPasswords = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(p => {
        let meta = {
            type: p.itemType || 'login',
            notes: p.notes || '',
            passkeyData: p.passkeyData || null,
            cardData: p.cardData || null,
            addressData: p.addressData || null
        };
        let cleanTitle = p.title || '';
        if (cleanTitle.includes('|||')) {
            const parts = cleanTitle.split('|||');
            cleanTitle = parts[0];
            try {
                const parsed = JSON.parse(parts[1]);
                meta = {
                    type: parsed.type || meta.type,
                    notes: parsed.notes !== undefined ? parsed.notes : meta.notes,
                    passkeyData: parsed.passkeyData || meta.passkeyData,
                    cardData: parsed.cardData || meta.cardData,
                    addressData: parsed.addressData || meta.addressData
                };
            } catch (_) {}
        }
        return {
            ...p,
            rawTitle: p.title,
            title: cleanTitle,
            itemType: p.itemType || meta.type || 'login',
            notes: p.notes || meta.notes || '',
            passkeyData: p.passkeyData || meta.passkeyData || null,
            cardData: p.cardData || meta.cardData || null,
            addressData: p.addressData || meta.addressData || null
        };
    });
};

const syncMasterPasswordToCloud = (mp) => {
    if (!mp) return;
    try {
        if (typeof window !== 'undefined' && window.__syncStore) {
            const syncState = window.__syncStore.getState();
            if (syncState.user && !syncState.masterPassword) {
                syncState.receiveVaultMasterPassword?.(mp);
            }
        }
    } catch (e) {
        console.warn('[VaultStore] syncMasterPasswordToCloud notice:', e);
    }
};

const triggerVaultSync = () => {
    const { isUnlocked, passwords } = useVaultStore.getState();
    if (!isUnlocked) return;
    import('./useSyncStore').then(m => {
        const syncStore = m.default.getState();
        if (syncStore.syncCategories?.vault !== false && syncStore.user && syncStore.masterPassword) {
            const cleanVault = (passwords || []).filter(item => !isRawCiphertextString(item.password));
            syncStore.syncDataToCloud('vault', cleanVault);
        }
    }).catch(() => {});
};

let inactivityTimer = null;

// Immediately purge legacy plaintext PIN and session password keys
try {
    localStorage.removeItem('qbrowse_vault_pin');
    sessionStorage.removeItem('qbrowse_vault_mp');
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('qbrowse_vault_pin_')) {
            localStorage.removeItem(k);
        }
    });
} catch (_) {}

const useVaultStore = create((set, get) => ({
    isInitialized: localStorage.getItem('qbrowse_vault_init') === 'true',
    isUnlocked: false,
    masterPassword: '',
    pinEnabled: localStorage.getItem('qbrowse_vault_pin_enabled') === 'true',
    biometricsEnabled: localStorage.getItem('qbrowse_vault_bio') === 'true',
    passwords: [],
    selectedItemId: null,
    failedAttempts: 0,
    lockoutUntil: null,
    autoLockMinutes: 15,
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

    // Sync vault status with Electron main process
    syncVaultStatus: async () => {
        try {
            if (!window.electronAPI?.getVaultStatus) return null;
            const status = await window.electronAPI.getVaultStatus();
            if (status) {
                set({
                    isInitialized: Boolean(status.isInitialized),
                    pinEnabled: Boolean(status.hasPin),
                    biometricsEnabled: Boolean(status.hasWindowsHello),
                    failedAttempts: status.failedPinAttempts || 0,
                    lockoutUntil: status.pinLockUntil || null
                });
                try {
                    localStorage.setItem('qbrowse_vault_init', Boolean(status.isInitialized) ? 'true' : 'false');
                    localStorage.setItem('qbrowse_vault_pin_enabled', Boolean(status.hasPin) ? 'true' : 'false');
                    localStorage.setItem('qbrowse_vault_bio', Boolean(status.hasWindowsHello) ? 'true' : 'false');
                } catch (_) {}
                return status;
            }
        } catch (err) {
            console.warn('[VaultStore] syncVaultStatus failed:', err);
        }
        return null;
    },

    resetInactivityTimer: () => {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        const mins = get().autoLockMinutes || 15;
        if (mins > 0) {
            inactivityTimer = setTimeout(() => {
                get().lock();
            }, mins * 60 * 1000);
        }
    },

    clearInactivityTimer: () => {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    },

    unlock: async (password) => {
        set({ isLoading: true, error: null });
        try {
            const success = await unlockVault(password);
            if (success) {
                const rawPasswords = await getPasswords(password);
                set({
                    isUnlocked: true,
                    isInitialized: true,
                    masterPassword: password,
                    passwords: enrichPasswords(rawPasswords),
                    error: null,
                    failedAttempts: 0,
                    lockoutUntil: null,
                    isLoading: false
                });
                try {
                    localStorage.setItem('qbrowse_vault_init', 'true');
                } catch (_) {}
                await get().syncVaultStatus();
                syncMasterPasswordToCloud(password);
                get().resetInactivityTimer();

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
            const res = await unlockVaultWindowsHello();
            const ok = res === true || res?.success === true;
            if (ok) {
                const rawPasswords = await getPasswords();
                const unwrappedMp = (typeof res === 'object' ? res.masterPassword : null) || get().masterPassword || '';
                set({
                    isUnlocked: true,
                    isInitialized: true,
                    masterPassword: unwrappedMp,
                    passwords: enrichPasswords(rawPasswords),
                    error: null,
                    failedAttempts: 0,
                    lockoutUntil: null,
                    isLoading: false
                });

                if (unwrappedMp) {
                    syncMasterPasswordToCloud(unwrappedMp);
                }
                get().resetInactivityTimer();

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
                const errMsg = (typeof res === 'object' && res?.error)
                    ? res.error
                    : 'Windows Hello verification failed — unlock with Master Password first';
                set({ error: errMsg, isLoading: false });
                return false;
            }
        } catch (err) {
            set({ error: err.message, isLoading: false });
            return false;
        }
    },

    unlockWithPin: async (enteredPin) => {
        set({ isLoading: true, error: null });
        try {
            const res = await window.electronAPI?.unlockVaultWithPin?.(enteredPin);

            if (res?.lockedOut || (res?.lockUntil && res.lockUntil > Date.now())) {
                const remainingSec = Math.max(1, Math.ceil(((res.lockUntil || Date.now()) - Date.now()) / 1000));
                set({
                    lockoutUntil: res.lockUntil,
                    failedAttempts: res.failedAttempts || 5,
                    error: `Too many failed attempts. Vault locked for ${remainingSec}s.`,
                    isLoading: false
                });
                return false;
            }

            if (res?.success) {
                const rawPasswords = await getPasswords();
                const unwrappedMp = res.masterPassword || get().masterPassword || '';
                set({
                    isUnlocked: true,
                    isInitialized: true,
                    masterPassword: unwrappedMp,
                    passwords: enrichPasswords(rawPasswords),
                    error: null,
                    failedAttempts: 0,
                    lockoutUntil: null,
                    isLoading: false
                });

                if (unwrappedMp) {
                    syncMasterPasswordToCloud(unwrappedMp);
                }
                get().resetInactivityTimer();

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
                set({
                    failedAttempts: res?.failedAttempts || (get().failedAttempts + 1),
                    lockoutUntil: res?.lockUntil || null,
                    error: res?.error || 'Incorrect PIN',
                    isLoading: false
                });
                return false;
            }
        } catch (err) {
            set({ error: err.message, isLoading: false });
            return false;
        }
    },

    enablePin: async (pin) => {
        try {
            const mp = get().masterPassword;
            const res = await window.electronAPI?.setupVaultPin?.(pin, mp);
            if (res?.success) {
                set({ pinEnabled: true });
                try {
                    localStorage.setItem('qbrowse_vault_pin_enabled', 'true');
                } catch (_) {}
                await get().syncVaultStatus();
                return true;
            }
            return false;
        } catch (err) {
            console.error('[VaultStore] enablePin error:', err);
            return false;
        }
    },

    disablePin: async () => {
        try {
            const res = await window.electronAPI?.removeVaultPin?.();
            if (res?.success || res === true) {
                set({ pinEnabled: false });
                try {
                    localStorage.setItem('qbrowse_vault_pin_enabled', 'false');
                } catch (_) {}
                await get().syncVaultStatus();
                return true;
            }
            return false;
        } catch (err) {
            console.error('[VaultStore] disablePin error:', err);
            return false;
        }
    },

    setPin: async (pin) => {
        if (!pin) {
            return await get().disablePin();
        }
        return await get().enablePin(pin);
    },

    setBiometrics: async (val) => {
        try {
            const mp = get().masterPassword;
            const res = await window.electronAPI?.setupVaultWindowsHello?.(Boolean(val), mp);
            const ok = res === true || res?.success === true;
            if (ok) {
                set({ biometricsEnabled: Boolean(val) });
                try {
                    localStorage.setItem('qbrowse_vault_bio', val ? 'true' : 'false');
                } catch (_) {}
                await get().syncVaultStatus();
                return true;
            }
            return false;
        } catch (err) {
            console.error('[VaultStore] setBiometrics error:', err);
            return false;
        }
    },

    changeMasterPassword: async (oldPass, newPass) => {
        set({ isLoading: true, error: null });
        try {
            const res = await window.electronAPI?.changeMasterPassword?.(oldPass, newPass);
            const ok = res === true || res?.success === true;
            if (!ok) {
                const errMsg = res?.error || 'Current master password is incorrect';
                set({ error: errMsg, isLoading: false });
                return { success: false, error: errMsg };
            }

            const rawPasswords = await getPasswords(newPass);
            set({
                masterPassword: newPass,
                passwords: enrichPasswords(rawPasswords),
                error: null,
                isLoading: false
            });

            // Synchronize with useSyncStore
            if (typeof window !== 'undefined' && window.__syncStore) {
                try {
                    await window.__syncStore.getState().updateMasterPasswordAndResync?.(newPass);
                } catch (syncErr) {
                    console.warn('[VaultStore] sync updateMasterPasswordAndResync notice:', syncErr);
                }
            }

            await get().syncVaultStatus();
            return { success: true };
        } catch (err) {
            const errMsg = err.message || 'Failed to change master password';
            set({ error: errMsg, isLoading: false });
            return { success: false, error: errMsg };
        }
    },

    resetVault: async () => {
        set({ isLoading: true, error: null });
        try {
            if (window.electronAPI?.resetVault) {
                await window.electronAPI.resetVault();
            }
            try {
                localStorage.removeItem('qbrowse_vault_init');
                localStorage.removeItem('qbrowse_vault_pin_enabled');
                localStorage.removeItem('qbrowse_vault_bio');
                localStorage.removeItem('qbrowse_vault_pin');
                localStorage.removeItem('qbrowse_vault_cloud_pending');
                sessionStorage.removeItem('qbrowse_vault_mp');
            } catch (_) {}

            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
                inactivityTimer = null;
            }

            set({
                isInitialized: false,
                isUnlocked: false,
                masterPassword: '',
                passwords: [],
                selectedItemId: null,
                pinEnabled: false,
                biometricsEnabled: false,
                failedAttempts: 0,
                lockoutUntil: null,
                cloudVaultBackup: null,
                isLoading: false,
                error: null
            });

            await get().syncVaultStatus();
            return { success: true };
        } catch (err) {
            set({ error: err.message, isLoading: false });
            return { success: false, error: err.message };
        }
    },

    serializeCurrentProfileVault: () => {
        // Kept for backward compatibility without saving plaintext PINs
    },

    loadProfileVault: () => {
        // Kept for backward compatibility
        set({
            isUnlocked: false,
            masterPassword: '',
            passwords: [],
            cloudVaultBackup: null,
            error: null
        });
        get().syncVaultStatus();
    },

    lock: async () => {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        try {
            await window.electronAPI?.lockVault?.();
        } catch (_) {}
        set({
            isUnlocked: false,
            masterPassword: '',
            passwords: [],
            selectedItemId: null,
            error: null
        });
    },

    fetchPasswords: async () => {
        const { isUnlocked, masterPassword } = get();
        if (!isUnlocked) return;
        
        set({ isLoading: true, error: null });
        try {
            const list = await getPasswords(masterPassword);
            set({ passwords: enrichPasswords(list || []), isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    refreshPasswords: async () => {
        await get().fetchPasswords();
    },

    mergeRemoteVault: async (remoteVault) => {
        if (!Array.isArray(remoteVault) || remoteVault.length === 0) return;
        let { isUnlocked, passwords } = get();

        // Guard against corrupted ciphertext strings
        const cleanRemote = remoteVault.filter(item => item && !isRawCiphertextString(item.password));
        if (cleanRemote.length === 0) return;

        if (!isUnlocked) {
            set({ cloudVaultBackup: cleanRemote });
            try {
                localStorage.setItem('qbrowse_vault_cloud_pending', JSON.stringify(cleanRemote));
            } catch(e) {}
            return;
        }

        let addedAny = false;
        const norm = (s) => (s ? String(s).trim().toLowerCase() : '');

        for (const remoteItem of cleanRemote) {
            const remoteUrl = norm(remoteItem.url);
            const remoteUser = norm(remoteItem.username);
            const remoteTitle = norm(remoteItem.title);

            const existing = passwords.find(p => {
                if (String(p.id) === String(remoteItem.id)) return true;
                const pUrl = norm(p.url);
                const pUser = norm(p.username);
                const pTitle = norm(p.title);
                const sameUser = (pUser === remoteUser);
                const sameUrl = (remoteUrl && pUrl && (pUrl === remoteUrl || matchDomains(pUrl, remoteUrl)));
                const sameTitle = (remoteTitle && pTitle && pTitle === remoteTitle);
                return sameUser && (sameUrl || sameTitle);
            });

            if (existing) {
                const remoteUpdated = new Date(remoteItem.updatedAt || 0).getTime();
                const localUpdated = new Date(existing.updatedAt || 0).getTime();
                if (remoteUpdated > localUpdated && remoteItem.password && remoteItem.password !== existing.password) {
                    try {
                        await get().updateItem({
                            id: existing.id,
                            type: remoteItem.itemType || 'login',
                            title: remoteItem.title,
                            username: remoteItem.username || '',
                            password: remoteItem.password || '',
                            url: remoteItem.url || '',
                            notes: remoteItem.notes || '',
                            passkeyData: remoteItem.passkeyData || null,
                            cardData: remoteItem.cardData || null,
                            addressData: remoteItem.addressData || null
                        });
                        addedAny = true;
                    } catch (e) {
                        console.warn("[VaultStore] Failed to update merged item:", remoteItem.title, e);
                    }
                }
            } else {
                try {
                    await get().addNewItem({
                        type: remoteItem.itemType || 'login',
                        title: remoteItem.title || 'Synced Account',
                        username: remoteItem.username || '',
                        password: remoteItem.password || '',
                        url: remoteItem.url || '',
                        notes: remoteItem.notes || '',
                        passkeyData: remoteItem.passkeyData || null,
                        cardData: remoteItem.cardData || null,
                        addressData: remoteItem.addressData || null
                    });
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
            if (isUnlocked) {
                await get().fetchPasswords();
            }
            set({ isLoading: false });
            triggerVaultSync();
        } catch (err) {
            console.error("[VaultStore] addNewItem error:", err);
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    deleteItem: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const res = await deletePassword(id);
            set(state => {
                const updated = state.passwords.filter(p => String(p.id) !== String(id));
                return {
                    passwords: updated,
                    isLoading: false
                };
            });
            triggerVaultSync();
            return res;
        } catch (err) {
            console.error('[VaultStore] deleteItem error:', err);
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
                if (isRawCiphertextString(item.password)) continue;
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
        const exportable = (passwords || [])
            .filter(p => !isRawCiphertextString(p.password))
            .map(p => {
                let meta = {};
                let rawTitle = p.title || '';
                if (rawTitle.includes('|||')) {
                    const parts = rawTitle.split('|||');
                    rawTitle = parts[0];
                    try { meta = JSON.parse(parts[1]); } catch (_) {}
                }
                return {
                    title: rawTitle,
                    type: p.itemType || meta.type || 'login',
                    username: p.username || '',
                    password: p.password || '',
                    url: p.url || '',
                    notes: p.notes || meta.notes || '',
                    cardData: p.cardData || meta.cardData || null,
                    addressData: p.addressData || meta.addressData || null
                };
            });

        if (format === 'json') {
            const dataStr = JSON.stringify({ qvault_version: '1.3.4', exported_at: new Date().toISOString(), items: exportable }, null, 2);
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
                if (!p.username || !p.password || isRawCiphertextString(p.password)) return false;

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
