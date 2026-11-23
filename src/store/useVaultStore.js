import { create } from 'zustand';
import { t } from '../i18n/index';
import { unlockVault, unlockVaultWindowsHello, getPasswords, addPassword, deletePassword, updatePassword } from '../services/electronIPC.js';

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
            totpSecret: p.totpSecret || null,
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
                    totpSecret: parsed.totpSecret !== undefined ? parsed.totpSecret : meta.totpSecret,
                    passkeyData: parsed.passkeyData || meta.passkeyData,
                    cardData: parsed.cardData || meta.cardData,
                    addressData: parsed.addressData || meta.addressData
                };
            } catch (_) {}
        }
        const effectiveType = p.itemType || meta.type || 'login';
        const effectiveTotpSecret = p.totpSecret || meta.totpSecret || (effectiveType === 'totp' ? p.password : null) || null;
        return {
            ...p,
            rawTitle: p.title,
            title: cleanTitle,
            itemType: effectiveType,
            notes: p.notes || meta.notes || '',
            totpSecret: effectiveTotpSecret,
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

// Immediately purge legacy plaintext PIN, session password, and pending cloud vault keys
function purgeLegacyPendingCloudVault() {
    try {
        localStorage.removeItem('qbrowse_vault_cloud_pending');
    } catch (_) {}
}

async function applyPendingCloudVault(get, set) {
    const pendingRemote = get().cloudVaultBackup;
    if (pendingRemote && Array.isArray(pendingRemote) && pendingRemote.length > 0) {
        await get().mergeRemoteVault(pendingRemote);
        set({ cloudVaultBackup: null });
    }
    purgeLegacyPendingCloudVault();
}

async function runPostUnlockSync(get, set) {
    if (typeof window !== 'undefined' && window.__syncStore) {
        const syncState = window.__syncStore.getState();
        if (typeof syncState.syncVaultOnUnlock === 'function' && syncState.user && syncState.masterPassword && syncState.syncCategories?.vault !== false) {
            syncState.syncVaultOnUnlock().catch(() => {});
            return;
        }
        await applyPendingCloudVault(get, set);
        if (typeof syncState.syncVaultOnUnlock !== 'function') {
            triggerVaultSync();
        }
        return;
    }
    await applyPendingCloudVault(get, set);
    triggerVaultSync();
}

function parseVaultTitleAndMeta(remoteItem) {
    const rawTitle = typeof remoteItem?.title === 'string' ? remoteItem.title : '';
    const idx = rawTitle.indexOf('|||');
    let parsedMeta = {};
    if (idx !== -1) {
        try {
            const candidate = JSON.parse(rawTitle.slice(idx + 3));
            if (candidate && typeof candidate === 'object') parsedMeta = candidate;
        } catch (_) {}
    }
    const cleanTitle = idx !== -1 ? rawTitle.slice(0, idx) : rawTitle;
    return {
        cleanTitle,
        type: remoteItem?.itemType || remoteItem?.type || parsedMeta.type || parsedMeta.itemType || 'login',
        notes: (remoteItem?.notes ?? parsedMeta.notes ?? '') || '',
        totpSecret: (remoteItem?.totpSecret ?? parsedMeta.totpSecret ?? null) || null,
        passkeyData: (remoteItem?.passkeyData ?? parsedMeta.passkeyData ?? null) || null,
        cardData: (remoteItem?.cardData ?? parsedMeta.cardData ?? null) || null,
        addressData: (remoteItem?.addressData ?? parsedMeta.addressData ?? null) || null,
    };
}

try {
    localStorage.removeItem('qbrowse_vault_pin');
    sessionStorage.removeItem('qbrowse_vault_mp');
    purgeLegacyPendingCloudVault();
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
    vaultItemCount: 0,
    selectedItemId: null,
    failedAttempts: 0,
    lockoutUntil: null,
    autoLockMinutes: 15,
    cloudVaultBackup: null,
    isLoading: false,
    error: null,

    // Sync vault status with Electron main process
    syncVaultStatus: async () => {
        purgeLegacyPendingCloudVault();
        try {
            if (!window.electronAPI?.getVaultStatus) return null;
            const status = await window.electronAPI.getVaultStatus();
            if (status) {
                set({
                    isInitialized: Boolean(status.isInitialized),
                    pinEnabled: Boolean(status.hasPin),
                    biometricsEnabled: Boolean(status.hasWindowsHello),
                    vaultItemCount: typeof status?.itemCount === 'number' ? status.itemCount : (get().passwords?.length || 0),
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
                const enriched = enrichPasswords(rawPasswords);
                set({
                    isUnlocked: true,
                    isInitialized: true,
                    masterPassword: password,
                    passwords: enriched,
                    vaultItemCount: enriched.length,
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

                await runPostUnlockSync(get, set);
                return true;
            } else {
                set({ error: t('stores.vault.invalidMasterPassword', 'Invalid master password'), isLoading: false });
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
                const enriched = enrichPasswords(rawPasswords);
                const unwrappedMp = (typeof res === 'object' ? res.masterPassword : null) || get().masterPassword || '';
                set({
                    isUnlocked: true,
                    isInitialized: true,
                    masterPassword: unwrappedMp,
                    passwords: enriched,
                    vaultItemCount: enriched.length,
                    error: null,
                    failedAttempts: 0,
                    lockoutUntil: null,
                    isLoading: false
                });

                await get().syncVaultStatus();
                if (unwrappedMp) {
                    syncMasterPasswordToCloud(unwrappedMp);
                }
                get().resetInactivityTimer();

                await runPostUnlockSync(get, set);
                return true;
            } else {
                const osPlatform = (typeof window !== 'undefined' && window.electronAPI?.platform) || (typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('linux') ? 'linux' : typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? 'darwin' : 'win32');
                const bioLabel = osPlatform === 'darwin'
                    ? t('stores.vault.bioTouchId', 'Touch ID')
                    : osPlatform === 'linux'
                        ? t('stores.vault.bioLinux', 'System Biometrics')
                        : t('stores.vault.bioWindowsHello', 'Windows Hello');
                const errMsg = (typeof res === 'object' && res?.error)
                    ? res.error
                    : t('stores.vault.biometricFailed', { label: bioLabel }, `${bioLabel} verification failed — unlock with Master Password first`);
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
                    error: t('stores.vault.lockedOutSeconds', { seconds: remainingSec }, `Too many failed attempts. Vault locked for ${remainingSec}s.`),
                    isLoading: false
                });
                return false;
            }

            if (res?.success) {
                const rawPasswords = await getPasswords();
                const enriched = enrichPasswords(rawPasswords);
                const unwrappedMp = res.masterPassword || get().masterPassword || '';
                set({
                    isUnlocked: true,
                    isInitialized: true,
                    masterPassword: unwrappedMp,
                    passwords: enriched,
                    vaultItemCount: enriched.length,
                    error: null,
                    failedAttempts: 0,
                    lockoutUntil: null,
                    isLoading: false
                });

                await get().syncVaultStatus();
                if (unwrappedMp) {
                    syncMasterPasswordToCloud(unwrappedMp);
                }
                get().resetInactivityTimer();

                await runPostUnlockSync(get, set);
                return true;
            } else {
                set({
                    failedAttempts: res?.failedAttempts || (get().failedAttempts + 1),
                    lockoutUntil: res?.lockUntil || null,
                    error: res?.error || t('stores.vault.incorrectPin', 'Incorrect PIN'),
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
                const errMsg = res?.error || t('stores.vault.currentPasswordIncorrect', 'Current master password is incorrect');
                set({ error: errMsg, isLoading: false });
                return { success: false, error: errMsg };
            }

            const rawPasswords = await getPasswords(newPass);
            const enriched = enrichPasswords(rawPasswords);
            set({
                masterPassword: newPass,
                passwords: enriched,
                vaultItemCount: enriched.length,
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
            const errMsg = err.message || t('stores.vault.changeMasterPasswordFailed', 'Failed to change master password');
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
                vaultItemCount: 0,
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
        purgeLegacyPendingCloudVault();
        set({
            isUnlocked: false,
            masterPassword: '',
            passwords: [],
            vaultItemCount: 0,
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
        const prevCount = get().isUnlocked ? (get().passwords?.length ?? 0) : get().vaultItemCount;
        try {
            await window.electronAPI?.lockVault?.();
        } catch (_) {}
        set({
            isUnlocked: false,
            masterPassword: '',
            passwords: [],
            vaultItemCount: prevCount,
            selectedItemId: null,
            error: null
        });
        get().syncVaultStatus().catch(() => {});
    },

    fetchPasswords: async () => {
        const { isUnlocked, masterPassword } = get();
        if (!isUnlocked) return;
        
        set({ isLoading: true, error: null });
        try {
            const list = await getPasswords(masterPassword);
            const enriched = enrichPasswords(list || []);
            set({ passwords: enriched, vaultItemCount: enriched.length, isLoading: false });
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
            purgeLegacyPendingCloudVault();
            return;
        }

        let addedAny = false;
        const norm = (s) => (s ? String(s).trim().toLowerCase() : '');

        for (const remoteItem of cleanRemote) {
            const remoteParsed = parseVaultTitleAndMeta(remoteItem);
            const remoteUrl = norm(remoteItem.url);
            const remoteUser = norm(remoteItem.username);
            const cleanRemoteTitle = remoteParsed.cleanTitle;
            const remoteTitle = norm(cleanRemoteTitle);

            const existing = passwords.find(p => {
                if (String(p.id) === String(remoteItem.id)) return true;
                const pUrl = norm(p.url);
                const pUser = norm(p.username);
                const pTitle = norm(parseVaultTitleAndMeta(p).cleanTitle);
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
                            type: remoteParsed.type || existing.itemType || 'login',
                            title: cleanRemoteTitle || existing.title,
                            username: remoteItem.username || '',
                            password: remoteItem.password || '',
                            url: remoteItem.url || '',
                            notes: remoteParsed.notes,
                            totpSecret: remoteParsed.totpSecret || existing.totpSecret || null,
                            passkeyData: remoteParsed.passkeyData,
                            cardData: remoteParsed.cardData,
                            addressData: remoteParsed.addressData
                        });
                        addedAny = true;
                    } catch (e) {
                        console.warn("[VaultStore] Failed to update merged item:", cleanRemoteTitle, e);
                    }
                }
            } else {
                try {
                    await get().addNewItem({
                        type: remoteParsed.type,
                        title: cleanRemoteTitle || 'Synced Account',
                        username: remoteItem.username || '',
                        password: remoteItem.password || '',
                        url: remoteItem.url || '',
                        notes: remoteParsed.notes,
                        totpSecret: remoteParsed.totpSecret,
                        passkeyData: remoteParsed.passkeyData,
                        cardData: remoteParsed.cardData,
                        addressData: remoteParsed.addressData
                    });
                    addedAny = true;
                } catch (e) {
                    console.warn("[VaultStore] Failed to merge remote item:", cleanRemoteTitle, e);
                }
            }
        }
        if (addedAny) {
            await get().fetchPasswords();
            triggerVaultSync();
        }
    },

    addNewItem: async ({ type = 'login', title, username = '', password = '', url = '', passkeyData = null, cardData = null, addressData = null, notes = '', totpSecret = null }) => {
        const { isUnlocked, masterPassword } = get();

        set({ isLoading: true });
        try {
            const payload = {
                type,
                notes,
                totpSecret: totpSecret || null,
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
                    vaultItemCount: updated.length,
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

    updateItem: async ({ id, type = 'login', title, username = '', password = '', url = '', passkeyData = null, cardData = null, addressData = null, notes = '', totpSecret = null }) => {
        set({ isLoading: true, error: null });
        try {
            const payload = {
                type,
                notes,
                totpSecret: totpSecret || null,
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
                    totpSecret: item.totpSecret || null,
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
                    totpSecret: p.totpSecret || meta.totpSecret || null,
                    cardData: p.cardData || meta.cardData || null,
                    addressData: p.addressData || meta.addressData || null
                };
            });

        if (format === 'json') {
            const dataStr = JSON.stringify({ qvault_version: '1.3.5', exported_at: new Date().toISOString(), items: exportable }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qvault-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const headers = ['title', 'type', 'username', 'password', 'url', 'notes', 'totp'];
            const rows = exportable.map(i => [
                `"${(i.title || '').replace(/"/g, '""')}"`,
                `"${(i.type || 'login').replace(/"/g, '""')}"`,
                `"${(i.username || '').replace(/"/g, '""')}"`,
                `"${(i.password || '').replace(/"/g, '""')}"`,
                `"${(i.url || '').replace(/"/g, '""')}"`,
                `"${(i.notes || '').replace(/"/g, '""')}"`,
                `"${(i.totpSecret || '').replace(/"/g, '""')}"`
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
                password: p.password,
                totpSecret: p.totpSecret || null
            }));
    },

    saveOrUpdateCredential: async ({ domain, url, username, password, isUpdate, existingId, totpSecret = null }) => {
        if (isUpdate && existingId) {
            await get().updateItem({
                id: existingId,
                type: 'login',
                title: domain,
                username,
                password,
                url: url || `https://${domain}`,
                ...(totpSecret ? { totpSecret } : {})
            });
        } else {
            await get().addNewItem({
                type: 'login',
                title: domain,
                username,
                password,
                url: url || `https://${domain}`,
                ...(totpSecret ? { totpSecret } : {})
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
