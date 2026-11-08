import { create } from 'zustand';
import useUIStore from './useUIStore';
import useVaultStore from './useVaultStore';
import useTabStore, { isValidSyncTab, getCleanTabTitle } from './useTabStore';
import useHistoryStore from './useHistoryStore';
import { saveCustomPresetsToStorage, setSavedPresetId } from '../utils/experiencePresets';
import { auth, db } from '../services/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteField, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

export function isRawCiphertextString(str) {
    return typeof str === 'string' && /^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(str.trim());
}

export async function saveWrappedPassphrase(passphrase) {
    try {
        localStorage.removeItem('qbrowse_master_passphrase');
    } catch (_) {}
    if (!passphrase) {
        try {
            localStorage.removeItem('qbrowse_wrapped_mp');
        } catch (_) {}
        return;
    }
    try {
        if (window.electronAPI?.wrapSyncSecret) {
            const wrapped = await window.electronAPI.wrapSyncSecret(passphrase);
            if (wrapped) {
                localStorage.setItem('qbrowse_wrapped_mp', wrapped);
                return wrapped;
            }
        } else {
            const encoded = btoa(unescape(encodeURIComponent(passphrase)));
            localStorage.setItem('qbrowse_wrapped_mp', encoded);
            return encoded;
        }
    } catch (e) {
        console.warn('[Sync] saveWrappedPassphrase error:', e);
    }
}

export async function loadWrappedPassphrase() {
    try {
        const legacy = localStorage.getItem('qbrowse_master_passphrase');
        if (legacy) {
            await saveWrappedPassphrase(legacy);
            try { localStorage.removeItem('qbrowse_master_passphrase'); } catch (_) {}
            return legacy;
        }

        const wrapped = localStorage.getItem('qbrowse_wrapped_mp');
        if (!wrapped) return '';

        if (window.electronAPI?.unwrapSyncSecret) {
            const unwrapped = await window.electronAPI.unwrapSyncSecret(wrapped);
            return unwrapped || '';
        } else {
            try {
                return decodeURIComponent(escape(atob(wrapped)));
            } catch (_) {
                return '';
            }
        }
    } catch (e) {
        console.warn('[Sync] loadWrappedPassphrase error:', e);
        return '';
    }
}

// Web Crypto API Encryption Helpers (AES-GCM 256-bit with PBKDF2)
async function deriveKey(passphrase, saltHex) {
    const encoder = new TextEncoder();
    const passphraseKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passphraseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function generateSaltHex() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function encryptData(payloadObj, passphrase) {
    try {
        const jsonStr = JSON.stringify(payloadObj);
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(jsonStr);
        const saltHex = generateSaltHex();
        const key = await deriveKey(passphrase, saltHex);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBytes
        );
        return {
            salt: saltHex,
            iv: Array.from(iv, b => b.toString(16).padStart(2, '0')).join(''),
            cipher: Array.from(new Uint8Array(encryptedContent), b => b.toString(16).padStart(2, '0')).join('')
        };
    } catch(e) {
        console.error("[Encryption Error]", e);
        throw e;
    }
}

async function decryptData(encryptedObj, passphrase) {
    try {
        const { salt, iv, cipher } = encryptedObj;
        const key = await deriveKey(passphrase, salt);
        const ivArray = new Uint8Array(iv.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const cipherArray = new Uint8Array(cipher.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const decryptedBytes = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            key,
            cipherArray
        );
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedBytes));
    } catch(e) {
        console.warn("[Decryption Error] Passphrase mismatch or corrupted payload", e);
        throw new Error("Invalid Master Encryption Password or corrupted cloud data");
    }
}

function formatAuthError(error) {
    if (!error) return null;
    const code = error.code || '';
    const message = error.message || '';

    if (code === 'auth/configuration-not-found' || message.includes('configuration-not-found')) {
        return 'Email/Password Authentication is not enabled in Firebase Console. Please enable Email/Password under Firebase Console -> Authentication -> Sign-in method.';
    }
    if (code === 'auth/api-key-not-valid' || message.includes('api-key-not-valid') || message.includes('API key not valid')) {
        return 'Firebase API key is invalid or expired. Check your .env configuration.';
    }
    if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
        return 'Network connection error. Please check your internet connection.';
    }
    if (code === 'auth/email-already-in-use') {
        return 'An account with this email already exists. Try signing in instead.';
    }
    if (code === 'auth/weak-password') {
        return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
        return 'Please enter a valid email address.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return 'Invalid email or password combination.';
    }
    return message.replace(/^Firebase:\s*/, '');
}

// Self-healing migration to keep Firestore root document strictly below the 1MB (1,048,576 bytes) limit.
// Moves any heavy backup payloads to the subcollection 'users/{uid}/backups/{id}' and purges them from the root document.
async function healBloatedRootDocument(userId) {
    if (!userId) return;
    try {
        const rootRef = doc(db, 'users', userId);
        const userSnap = await getDoc(rootRef);
        if (!userSnap.exists()) return;

        const data = userSnap.data();
        let needsPurge = false;

        // 1. Detect if manual_backups array has bulky encrypted payloads
        if (Array.isArray(data.manual_backups) && data.manual_backups.some(b => b && b.encrypted)) {
            needsPurge = true;
        }

        if (!needsPurge) return;

        console.log("[Sync] Bloated root document detected (>1MB potential). Migrating backups to subcollection and cleaning root document...");

        // 2. Migrate each full backup payload to the subcollection so the user never loses their backups
        if (Array.isArray(data.manual_backups)) {
            for (const b of data.manual_backups) {
                if (b && b.id && b.encrypted) {
                    try {
                        await setDoc(doc(db, 'users', userId, 'backups', b.id), b);
                    } catch(subErr) {
                        console.warn("[Sync] Backup migration subcollection notice:", subErr);
                    }
                }
            }
        }

        // 3. Create clean metadata-only array (no encrypted string)
        const cleanedMetadataBackups = Array.isArray(data.manual_backups)
            ? data.manual_backups.map(b => ({
                id: b.id,
                label: b.label || 'Manual Backup',
                createdAt: b.createdAt || new Date().toISOString(),
                stats: b.stats || {}
            })).slice(0, 5)
            : [];

        // 4. Purge the bloated manual_backups field directly using deleteField()
        try {
            await updateDoc(rootRef, { manual_backups: deleteField() });
            console.log("[Sync] Successfully purged legacy oversized manual_backups from root document.");
        } catch(delErr) {
            console.warn("[Sync] updateDoc deleteField notice (trying full setDoc overwrite):", delErr);
            const cleanDoc = { ...data, manual_backups: cleanedMetadataBackups };
            try {
                await setDoc(rootRef, cleanDoc);
            } catch(e) {}
        }

        // 5. Update root doc with clean metadata only
        try {
            await setDoc(rootRef, { manual_backups: cleanedMetadataBackups }, { merge: true });
        } catch(e) {}

        console.log("[Sync] Root document healed successfully! Size is now ~50KB.");
    } catch(err) {
        console.warn("[Sync] healBloatedRootDocument notice:", err);
    }
}

// Persistent Device Identification for Cross-Device Tabs Sync
export function getOrCreateDeviceId() {
    let id = '';
    try {
        id = localStorage.getItem('qbrowse_device_id');
        if (!id) {
            id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('qbrowse_device_id', id);
        }
    } catch (_) {
        id = `dev-${Date.now()}`;
    }
    return id;
}

export function getDeviceName() {
    try {
        const customName = localStorage.getItem('qbrowse_custom_device_name');
        if (customName && customName.trim()) return customName.trim();
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        if (ua.includes('Windows')) return 'Windows PC';
        if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac';
        if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux PC';
        if (ua.includes('Android')) return 'Android Device';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Device';
        return 'Browser Client';
    } catch (_) {
        return 'Browser Client';
    }
}

// Aggregates remote devices from Firestore snapshot while strictly ignoring the current device
async function parseRemoteDevicesFromSnapshot(data, masterPassword, currentDeviceId) {
    if (!data || !masterPassword) return [];
    const rawDeviceMap = { ...(data.devices || {}), ...(data.deviceTabs || {}) };
    const remoteList = [];

    for (const [dId, devData] of Object.entries(rawDeviceMap)) {
        if (!devData) continue;
        // Strictly ignore tabs from current device to prevent startup race & self-echo
        if (dId === currentDeviceId || devData.deviceId === currentDeviceId) {
            continue;
        }

        let dec = null;
        if (devData.encrypted) {
            try {
                dec = await decryptData(devData.encrypted, masterPassword);
            } catch (e) {
                console.warn('[Sync] Could not decrypt device tabs for:', dId, e);
            }
        } else if (Array.isArray(devData.tabs)) {
            dec = devData;
        }

        if (dec) {
            let tabs = Array.isArray(dec.tabs) ? dec.tabs.filter(isValidSyncTab) : [];
            if (tabs.length === 0) {
                const p = (dec.privateTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'personal', spaceName: 'Personal' }));
                const w = (dec.workTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'work', spaceName: 'Work' }));
                const c = [];
                if (dec.customSpaceTabs && typeof dec.customSpaceTabs === 'object') {
                    Object.entries(dec.customSpaceTabs).forEach(([sId, list]) => {
                        (list || []).filter(isValidSyncTab).forEach(t => c.push({ ...t, spaceId: sId, spaceName: sId }));
                    });
                }
                tabs = [...p, ...w, ...c];
            }

            remoteList.push({
                deviceId: dId,
                deviceName: dec.deviceName || devData.deviceName || 'Remote Device',
                lastSynced: dec.lastSynced || devData.lastSynced || (devData.updatedAt ? new Date(devData.updatedAt).getTime() : Date.now()),
                tabs
            });
        }
    }

    // Fallback: If no structured device tabs yet, check legacy data.tabs.encrypted
    // Ensure we do NOT echo back if it was written by this same device!
    if (remoteList.length === 0 && data.tabs?.encrypted && data.lastSyncDeviceId !== currentDeviceId) {
        try {
            const dec = await decryptData(data.tabs.encrypted, masterPassword);
            if (dec) {
                const p = (dec.privateTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'personal', spaceName: 'Personal' }));
                const w = (dec.workTabs || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: 'work', spaceName: 'Work' }));
                const c = [];
                if (dec.customSpaceTabs && typeof dec.customSpaceTabs === 'object') {
                    Object.entries(dec.customSpaceTabs).forEach(([sId, list]) => {
                        (list || []).filter(isValidSyncTab).forEach(t => c.push({ ...t, spaceId: sId, spaceName: sId }));
                    });
                }
                const tabs = [...p, ...w, ...c];
                if (tabs.length > 0) {
                    remoteList.push({
                        deviceId: 'legacy-remote',
                        deviceName: data.userAgent?.includes('Mac') ? 'Mac' : data.userAgent?.includes('Windows') ? 'Windows PC' : 'Remote Client',
                        lastSynced: data.tabs.updatedAt ? new Date(data.tabs.updatedAt).getTime() : Date.now(),
                        tabs
                    });
                }
            }
        } catch (_) {}
    }

    return remoteList;
}

// Global active snapshot listener unsubscribers
let unsubscribeCloudListeners = [];
let isApplyingCloudUpdate = false;
let autoSyncIntervalTimer = null;
let debounceSyncTimer = null;
let storeUnsubscribers = [];
let lastAutoSyncExecutedAt = 0;
let lastLocalWriteIso = '';
const MIN_AUTO_SYNC_COOLDOWN_MS = 30000; // Minimum 30s between automatic silent syncs

// Cached payload signatures to prevent re-encrypting & re-uploading unchanged categories
let lastSyncedSignatures = {
    settings: '',
    vault: '',
    tabs: '',
    pinnedTabs: '',
    history: ''
};

let lastObservedTabSig = '';
let lastObservedVaultSig = '';
let lastObservedSettingsSig = '';

function computeTabsWatcherSignature(tabState) {
    if (!tabState) return '';
    const formatSigTab = (t) => `${t.id}|${t.url || ''}|${getCleanTabTitle(t)}`;
    const priv = (tabState.privateTabs || []).filter(isValidSyncTab).map(formatSigTab).join(';');
    const work = (tabState.workTabs || []).filter(isValidSyncTab).map(formatSigTab).join(';');
    const customEntries = Object.entries(tabState.customSpaceTabs || {})
        .map(([sId, list]) => `${sId}:${(list || []).filter(isValidSyncTab).map(formatSigTab).join(',')}`)
        .join('|');
    const pins = (tabState.pinnedTabs || []).map(p => `${p.id}|${p.domain || ''}|${p.title || ''}`).join(';');
    const spaces = JSON.stringify(tabState.customSpaces || []);
    return `${priv}::${work}::${customEntries}::${pins}::${spaces}`;
}

function computeVaultWatcherSignature(vaultState) {
    if (!vaultState || !Array.isArray(vaultState.passwords)) return '';
    return vaultState.passwords
        .map(p => `${p.id}|${p.updatedAt || ''}|${p.url || ''}|${p.username || ''}|${p.password || ''}`)
        .join(';');
}

function computeSettingsWatcherSignature(uiState) {
    if (!uiState) return '';
    const s = { ...(uiState.settings || {}) };
    delete s.syncedCloudSettings;
    if (s.customWallpaperSource !== 'url') {
        delete s.customWallpaper;
        delete s.customWallpaperOriginalUrl;
    }
    return JSON.stringify({
        s,
        activePresetId: uiState.activePresetId || uiState.activePreset || '',
        customPresets: uiState.customPresets || [],
        presetOverrides: uiState.presetOverrides || {},
        theme: uiState.theme || 'dark',
        accentColor: uiState.accentColor || '#d4bc94'
    });
}

function applySyncedUIPresetsAndTheme(decryptedSettings) {
    if (!decryptedSettings || typeof decryptedSettings !== 'object') return;
    const uiStore = useUIStore.getState();

    if (Array.isArray(decryptedSettings._syncCustomPresets)) {
        try {
            saveCustomPresetsToStorage(decryptedSettings._syncCustomPresets);
            useUIStore.setState({ customPresets: decryptedSettings._syncCustomPresets });
        } catch (_) {}
    }
    if (decryptedSettings._syncPresetOverrides && typeof decryptedSettings._syncPresetOverrides === 'object') {
        try {
            localStorage.setItem('qbrowse_preset_overrides', JSON.stringify(decryptedSettings._syncPresetOverrides));
            useUIStore.setState({ presetOverrides: decryptedSettings._syncPresetOverrides });
        } catch (_) {}
    }
    const syncedPresetId = decryptedSettings._syncActivePresetId || decryptedSettings._syncActivePreset;
    if (syncedPresetId && syncedPresetId !== uiStore.activePresetId) {
        try {
            setSavedPresetId(syncedPresetId);
            useUIStore.setState({ activePresetId: syncedPresetId });
        } catch (_) {}
    }
    if (decryptedSettings._syncTheme && decryptedSettings._syncTheme !== uiStore.theme && typeof uiStore.setTheme === 'function') {
        try {
            uiStore.setTheme(decryptedSettings._syncTheme);
        } catch (_) {}
    }
    if (decryptedSettings._syncAccentColor && decryptedSettings._syncAccentColor !== uiStore.accentColor && typeof uiStore.setAccentColor === 'function') {
        try {
            uiStore.setAccentColor(decryptedSettings._syncAccentColor);
        } catch (_) {}
    }
}

function setupLocalStoreWatchers() {
    if (storeUnsubscribers.length > 0) return;

    try {
        lastObservedTabSig = computeTabsWatcherSignature(useTabStore.getState());
        lastObservedVaultSig = computeVaultWatcherSignature(useVaultStore.getState());
        lastObservedSettingsSig = computeSettingsWatcherSignature(useUIStore.getState());

        const unsubTabs = useTabStore.subscribe((state) => {
            if (isApplyingCloudUpdate) return;
            const current = useSyncStore.getState();
            if (!current.autoSyncEnabled || !current.user || !current.masterPassword) return;
            const nextSig = computeTabsWatcherSignature(state);
            if (nextSig !== lastObservedTabSig) {
                lastObservedTabSig = nextSig;
                current.triggerDebouncedSync(30000);
            }
        });

        const unsubVault = useVaultStore.subscribe((state) => {
            if (isApplyingCloudUpdate) return;
            const current = useSyncStore.getState();
            if (!current.autoSyncEnabled || !current.user || !current.masterPassword) return;
            const nextSig = computeVaultWatcherSignature(state);
            if (nextSig !== lastObservedVaultSig) {
                lastObservedVaultSig = nextSig;
                current.triggerDebouncedSync(12000);
            }
        });

        const unsubUI = useUIStore.subscribe((state) => {
            if (isApplyingCloudUpdate) return;
            const current = useSyncStore.getState();
            if (!current.autoSyncEnabled || !current.user || !current.masterPassword) return;
            const nextSig = computeSettingsWatcherSignature(state);
            if (nextSig !== lastObservedSettingsSig) {
                lastObservedSettingsSig = nextSig;
                try {
                    localStorage.setItem('qbrowse_settings_updated_at', String(Date.now()));
                } catch (_) {}
                current.triggerDebouncedSync(15000);
            }
        });

        storeUnsubscribers.push(unsubTabs, unsubVault, unsubUI);
    } catch (e) {
        console.warn('[AutoSync] Notice on store subscribers:', e);
    }
}

const useSyncStore = create((set, get) => ({
    user: null,
    masterPassword: '',
    syncKeyError: false,
    isAuthInitialized: false,
    authError: null,
    isSyncing: false,
    syncStatus: 'idle', // 'idle' | 'synced' | 'syncing' | 'permission-error' | 'error' | 'offline'
    lastSyncTime: localStorage.getItem('qbrowse_last_sync') || null,
    syncedItemsCount: 0,
    cloudBackups: [],
    isLoadingBackups: false,
    isCreatingBackup: false,

    // Cross-Device Cloud Tabs Sync
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    remoteDeviceTabs: [],
    isRefreshingTabs: false,

    // Auto-Sync Configuration
    autoSyncEnabled: localStorage.getItem('qbrowse_auto_sync') !== 'false',
    autoSyncIntervalMinutes: 15,

    syncCategories: (() => {
        try {
            const stored = localStorage.getItem('qbrowse_sync_categories');
            if (stored) return JSON.parse(stored);
        } catch(e) {}
        return { vault: true, settings: true, tabs: true, history: true };
    })(),

    toggleSyncCategory: (categoryKey) => {
        set((state) => {
            const next = { ...state.syncCategories, [categoryKey]: !state.syncCategories[categoryKey] };
            localStorage.setItem('qbrowse_sync_categories', JSON.stringify(next));
            return { syncCategories: next };
        });
    },

    setMasterPassword: (passphrase) => {
        set({ masterPassword: passphrase, syncKeyError: false });
        saveWrappedPassphrase(passphrase);
        if (passphrase && window.electronAPI?.unlockVault) {
            window.electronAPI.unlockVault(passphrase).catch(() => {});
        }
        if (typeof window !== 'undefined' && window.__vaultStore) {
            window.__vaultStore.getState().syncVaultStatus?.().catch(() => {});
        }
    },

    receiveVaultMasterPassword: async (vaultMp) => {
        if (!vaultMp) return;
        const { user, masterPassword } = get();
        if (!user) return;
        if (!masterPassword) {
            set({ masterPassword: vaultMp, syncKeyError: false });
            await saveWrappedPassphrase(vaultMp);
            get().listenToCloudSync();
            get().syncNow({ silent: true }).catch(() => {});
        }
    },

    updateMasterPasswordAndResync: async (newPass) => {
        if (!newPass) return;
        set({ masterPassword: newPass, syncKeyError: false });
        await saveWrappedPassphrase(newPass);
        const { user, autoSyncEnabled, syncCategories } = get();
        if (user && (autoSyncEnabled || syncCategories?.vault !== false)) {
            await get().syncNow({ silent: true }).catch(() => {});
        }
    },

    unlockSyncVault: async (passphrase) => {
        if (!passphrase) return false;
        await get().setMasterPassword(passphrase);
        if (get().user) {
            get().listenToCloudSync();
            get().syncNow({ silent: true }).catch(() => {});
        }
        return true;
    },

    mergeRemoteVault: async (remoteVaultItems, masterPassword) => {
        if (!Array.isArray(remoteVaultItems) || remoteVaultItems.length === 0) return;
        const pass = masterPassword || get().masterPassword;

        try {
            // Filter out any corrupted raw ciphertext passwords
            const cleanRemote = remoteVaultItems.filter(item => item && !isRawCiphertextString(item.password));
            if (cleanRemote.length === 0) return;

            // Ensure local vault is unlocked
            if (pass && window.electronAPI?.unlockVault) {
                try {
                    await window.electronAPI.unlockVault(pass);
                } catch (_) {}
            }

            let localPasswords = [];
            if (window.electronAPI?.getPasswords) {
                try {
                    localPasswords = (await window.electronAPI.getPasswords()) || [];
                } catch (_) {}
            }

            const norm = (s) => (s ? String(s).trim().toLowerCase() : '');

            for (const remoteItem of cleanRemote) {
                const remoteUrl = norm(remoteItem.url);
                const remoteUser = norm(remoteItem.username);
                const remoteTitle = norm(remoteItem.title?.split('|||')[0]);

                // Match existing credentials by normalized (url, username) OR (title, username)
                const localMatch = localPasswords.find(lp => {
                    const lpUrl = norm(lp.url);
                    const lpUser = norm(lp.username);
                    const lpTitle = norm(lp.title?.split('|||')[0]);
                    const sameUser = (lpUser === remoteUser);
                    const sameUrl = (remoteUrl && lpUrl && (lpUrl === remoteUrl || lpUrl.includes(remoteUrl) || remoteUrl.includes(lpUrl)));
                    const sameTitle = (remoteTitle && lpTitle && lpTitle === remoteTitle);
                    return sameUser && (sameUrl || sameTitle);
                });

                if (localMatch) {
                    const remoteUpdated = new Date(remoteItem.updatedAt || 0).getTime();
                    const localUpdated = new Date(localMatch.updatedAt || 0).getTime();
                    if (remoteUpdated > localUpdated && remoteItem.password && remoteItem.password !== localMatch.password) {
                        if (window.electronAPI?.updatePassword) {
                            try {
                                await window.electronAPI.updatePassword(
                                    localMatch.id,
                                    remoteItem.title || localMatch.title,
                                    remoteItem.url || '',
                                    remoteItem.username || '',
                                    remoteItem.password
                                );
                            } catch (err) {
                                console.warn('[Sync] updatePassword during mergeRemoteVault failed:', err);
                            }
                        }
                    }
                } else {
                    if (window.electronAPI?.addPassword) {
                        try {
                            const payload = {
                                type: remoteItem.itemType || 'login',
                                notes: remoteItem.notes || '',
                                passkeyData: remoteItem.passkeyData || null,
                                cardData: remoteItem.cardData || null,
                                addressData: remoteItem.addressData || null
                            };
                            const jsonPayload = JSON.stringify(payload);
                            const combinedTitle = `${remoteItem.title || 'Synced Account'}|||${jsonPayload}`;
                            await window.electronAPI.addPassword(
                                combinedTitle,
                                remoteItem.url || '',
                                remoteItem.username || '',
                                remoteItem.password || ''
                            );
                        } catch (err) {
                            console.warn('[Sync] addPassword during mergeRemoteVault failed:', err);
                        }
                    }
                }
            }

            // After merging, refresh open QVault UI immediately
            if (typeof window !== 'undefined' && window.__vaultStore?.getState()?.isUnlocked) {
                await window.__vaultStore.getState().refreshPasswords?.();
            }
        } catch (err) {
            console.warn('[Sync] mergeRemoteVault error:', err);
        }
    },

    startAutoSync: (intervalMinutes = 15) => {
        if (autoSyncIntervalTimer) {
            clearInterval(autoSyncIntervalTimer);
            autoSyncIntervalTimer = null;
        }
        setupLocalStoreWatchers();

        const ms = Math.max(5, intervalMinutes) * 60 * 1000;
        autoSyncIntervalTimer = setInterval(() => {
            const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
            if (autoSyncEnabled && user && masterPassword && !isSyncing && !isApplyingCloudUpdate) {
                get().syncNow({ silent: true }).catch(() => {});
            }
        }, ms);

        // Silent warm-up sync after 12 seconds if ready and not recently synced
        setTimeout(() => {
            const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
            if (
                autoSyncEnabled &&
                user &&
                masterPassword &&
                !isSyncing &&
                !isApplyingCloudUpdate &&
                Date.now() - lastAutoSyncExecutedAt > MIN_AUTO_SYNC_COOLDOWN_MS
            ) {
                get().syncNow({ silent: true }).catch(() => {});
            }
        }, 12000);
    },

    stopAutoSync: () => {
        if (autoSyncIntervalTimer) {
            clearInterval(autoSyncIntervalTimer);
            autoSyncIntervalTimer = null;
        }
        if (debounceSyncTimer) {
            clearTimeout(debounceSyncTimer);
            debounceSyncTimer = null;
        }
    },

    triggerDebouncedSync: (delayMs = 25000) => {
        const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
        if (!autoSyncEnabled || !user || !masterPassword || isSyncing || isApplyingCloudUpdate) {
            return;
        }
        if (debounceSyncTimer) {
            clearTimeout(debounceSyncTimer);
        }
        const elapsedSinceLast = Date.now() - lastAutoSyncExecutedAt;
        const cooldownRemaining = Math.max(0, MIN_AUTO_SYNC_COOLDOWN_MS - elapsedSinceLast);
        const effectiveDelay = Math.max(delayMs, cooldownRemaining, 10000);
        debounceSyncTimer = setTimeout(() => {
            debounceSyncTimer = null;
            const state = get();
            if (state.autoSyncEnabled && state.user && state.masterPassword && !state.isSyncing && !isApplyingCloudUpdate) {
                state.syncNow({ silent: true }).catch(() => {});
            }
        }, effectiveDelay);
    },

    flushDebouncedSync: () => {
        if (debounceSyncTimer) {
            clearTimeout(debounceSyncTimer);
            debounceSyncTimer = null;
            const state = get();
            if (state.autoSyncEnabled && state.user && state.masterPassword && !state.isSyncing && !isApplyingCloudUpdate) {
                state.syncNow({ silent: true }).catch(() => {});
            }
        }
    },

    toggleAutoSync: () => {
        const next = !get().autoSyncEnabled;
        set({ autoSyncEnabled: next });
        localStorage.setItem('qbrowse_auto_sync', next ? 'true' : 'false');
        if (next) {
            get().startAutoSync();
            useUIStore.getState().showToast("Auto-Sync active (syncs periodically & on changes)");
        } else {
            get().stopAutoSync();
            useUIStore.getState().showToast("Auto-Sync turned off");
        }
    },

    setAutoSyncEnabled: (enabled) => {
        set({ autoSyncEnabled: enabled });
        localStorage.setItem('qbrowse_auto_sync', enabled ? 'true' : 'false');
        if (enabled) {
            get().startAutoSync();
        } else {
            get().stopAutoSync();
        }
    },

    initAuth: () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                set({ user, isAuthInitialized: true, syncStatus: 'idle' });
                try {
                    await user.getIdToken();
                } catch(e) {}

                // Load OS-wrapped passphrase if available
                let currentPass = get().masterPassword;
                if (!currentPass) {
                    currentPass = await loadWrappedPassphrase();
                    if (currentPass) {
                        set({ masterPassword: currentPass, syncKeyError: false });
                        if (window.electronAPI?.unlockVault) {
                            try { await window.electronAPI.unlockVault(currentPass); } catch (_) {}
                        }
                        if (typeof window !== 'undefined' && window.__vaultStore) {
                            try { await window.__vaultStore.getState().syncVaultStatus?.(); } catch (_) {}
                        }
                    }
                }

                // Auto-heal any legacy bloated root document to stay strictly under the 1MB limit
                healBloatedRootDocument(user.uid).catch(() => {});

                setTimeout(() => {
                    get().listenToCloudSync();
                    get().fetchCloudBackups();
                    if (get().autoSyncEnabled) {
                        get().startAutoSync();
                    }
                }, 100);
            } else {
                set({ user: null, isAuthInitialized: true, syncStatus: 'offline' });
                get().stopListening();
                get().stopAutoSync();
            }
        });
    },

    signUp: async (email, password, masterPass) => {
        set({ authError: null, isSyncing: true, syncStatus: 'syncing' });
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const passToUse = masterPass || password;
            await get().setMasterPassword(passToUse);
            set({ isSyncing: false, user: userCred.user, syncStatus: 'synced' });
            useUIStore.getState().setSetupComplete(true);
            if (get().autoSyncEnabled) {
                get().startAutoSync();
            }
            useUIStore.getState().showToast("Account Created & Cloud Sync Active!");
            return true;
        } catch (error) {
            const formatted = formatAuthError(error);
            set({ authError: formatted, isSyncing: false, syncStatus: 'error' });
            return false;
        }
    },

    signIn: async (email, password, masterPass) => {
        set({ authError: null, isSyncing: true, syncStatus: 'syncing' });
        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            const passToUse = masterPass || password;
            await get().setMasterPassword(passToUse);
            set({ isSyncing: false, user: userCred.user, syncStatus: 'synced' });
            useUIStore.getState().setSetupComplete(true);
            if (get().autoSyncEnabled) {
                get().startAutoSync();
            }
            useUIStore.getState().showToast("Signed In to QBrowse Cloud Sync");
            return true;
        } catch (error) {
            const formatted = formatAuthError(error);
            set({ authError: formatted, isSyncing: false, syncStatus: 'error' });
            return false;
        }
    },

    logout: async () => {
        get().stopListening();
        get().stopAutoSync();
        lastSyncedSignatures = { settings: '', vault: '', tabs: '', pinnedTabs: '', history: '' };
        lastLocalWriteIso = '';
        await signOut(auth);
        await saveWrappedPassphrase('');
        set({ 
            user: null, 
            masterPassword: '',
            lastSyncTime: null, 
            syncedItemsCount: 0, 
            cloudBackups: [],
            remoteDeviceTabs: [],
            syncStatus: 'offline',
            authError: null 
        });
        useUIStore.getState().showToast("Signed out of QBrowse Cloud");
    },

    changePassword: async (currentPassword, newPassword) => {
        const { user } = get();
        if (!user || !user.email) throw new Error("No active user logged in");
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            useUIStore.getState().showToast("Account password updated successfully!");
            return true;
        } catch(error) {
            console.error("Change password error:", error);
            const msg = (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
                ? "Incorrect current password"
                : error.message.replace(/^Firebase:\s*/, '');
            throw new Error(msg);
        }
    },

    stopListening: () => {
        unsubscribeCloudListeners.forEach(unsub => {
            try { unsub(); } catch(e) {}
        });
        unsubscribeCloudListeners = [];
    },

    syncDataToCloud: async (dataName, dataPayload) => {
        const { user, masterPassword, syncCategories } = get();
        if (!user) return;
        if (syncCategories && syncCategories[dataName] === false) {
            return;
        }
        if (!masterPassword) {
            console.warn('[Sync] Cannot sync to cloud: Master Password not set');
            throw new Error("Master Password or Account Passphrase required for encryption");
        }
        
        try {
            const encrypted = await encryptData(dataPayload, masterPassword);
            const nowIso = new Date().toISOString();
            lastLocalWriteIso = nowIso;

            const rootRef = doc(db, 'users', user.uid);
            try {
                await setDoc(rootRef, {
                    [dataName]: {
                        encrypted,
                        updatedAt: nowIso
                    },
                    lastSync: nowIso,
                    userAgent: navigator.userAgent
                }, { merge: true });
            } catch(writeErr) {
                if (writeErr?.message && writeErr.message.includes('exceeds the maximum allowed size')) {
                    console.warn("[Sync] Document size limit detected during sync. Healing root document...");
                    await healBloatedRootDocument(user.uid);
                    await setDoc(rootRef, {
                        [dataName]: {
                            encrypted,
                            updatedAt: nowIso
                        },
                        lastSync: nowIso,
                        userAgent: navigator.userAgent
                    }, { merge: true });
                } else {
                    throw writeErr;
                }
            }

            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem('qbrowse_last_sync', nowTime);
            set({ lastSyncTime: nowTime, syncStatus: 'synced', authError: null });
        } catch (error) {
            console.warn(`[Sync] Notice during ${dataName} cloud sync:`, error.message);
            set({ syncStatus: 'offline', authError: null });
            throw error;
        }
    },

    syncNow: async (options = { silent: false }) => {
        const isSilent = options && options.silent === true;
        const { user, masterPassword, syncCategories, isSyncing } = get();
        if (!user) {
            if (!isSilent) useUIStore.getState().showToast("Sign in to sync your data");
            return;
        }
        if (!masterPassword) {
            if (!isSilent) useUIStore.getState().showToast("Encryption key required. Please enter your account password in profile.");
            set({ syncStatus: 'error', authError: 'Master encryption passphrase missing.' });
            return;
        }
        if (isSyncing) return;

        lastAutoSyncExecutedAt = Date.now();
        set({ isSyncing: true, syncStatus: 'syncing', authError: null });
        try {
            let totalItems = 0;
            const nowIso = new Date().toISOString();
            const nowMs = new Date(nowIso).getTime();
            const rootBatchUpdate = {};
            const updatedSigs = {};

            // 1. Sync Settings
            if (syncCategories?.settings !== false) {
                const uiState = useUIStore.getState();
                const uiSettings = { ...uiState.settings };
                delete uiSettings.syncedCloudSettings;
                if (uiSettings.customWallpaperSource !== 'url') {
                    delete uiSettings.customWallpaper;
                    delete uiSettings.customWallpaperOriginalUrl;
                } else if (uiSettings.customWallpaperOriginalUrl) {
                    uiSettings.customWallpaper = uiSettings.customWallpaperOriginalUrl;
                }
                // Include custom presets, overrides, active preset, theme, and accent color in settings payload
                uiSettings._syncActivePresetId = uiState.activePresetId || uiState.activePreset || 'default';
                uiSettings._syncActivePreset = uiSettings._syncActivePresetId;
                uiSettings._syncCustomPresets = uiState.customPresets || [];
                uiSettings._syncPresetOverrides = uiState.presetOverrides || {};
                uiSettings._syncTheme = uiState.theme || 'dark';
                uiSettings._syncAccentColor = uiState.accentColor || '#d4bc94';

                const settingsSig = JSON.stringify(uiSettings);
                totalItems += Object.keys(uiSettings).length;
                if (!isSilent || settingsSig !== lastSyncedSignatures.settings) {
                    const encrypted = await encryptData(uiSettings, masterPassword);
                    rootBatchUpdate.settings = { encrypted, updatedAt: nowIso };
                    updatedSigs.settings = settingsSig;
                }
            }

            // 2. Sync Vault (Passwords, Passkeys, Cards, Addresses & Notes)
            if (syncCategories?.vault !== false) {
                let vaultItems = useVaultStore.getState().passwords || [];
                let isVaultUnlockedLocally = useVaultStore.getState().isUnlocked;

                if (!isVaultUnlockedLocally && masterPassword && window.electronAPI?.checkVaultPassword) {
                    try {
                        const verified = await window.electronAPI.checkVaultPassword(masterPassword);
                        if (verified) {
                            isVaultUnlockedLocally = true;
                            if (window.electronAPI?.getPasswords) {
                                const localList = await window.electronAPI.getPasswords();
                                if (Array.isArray(localList) && localList.length > 0) {
                                    vaultItems = localList;
                                }
                            }
                        }
                    } catch(e) {}
                }

                if (isVaultUnlockedLocally) {
                    const cleanVault = (vaultItems || []).filter(item => item && !isRawCiphertextString(item.password));
                    const vaultSig = JSON.stringify(cleanVault.map(v => ({
                        id: v.id,
                        u: v.username,
                        url: v.url,
                        p: v.password,
                        t: v.title,
                        up: v.updatedAt
                    })));
                    totalItems += cleanVault.length;
                    if (!isSilent || vaultSig !== lastSyncedSignatures.vault) {
                        const encrypted = await encryptData(cleanVault, masterPassword);
                        rootBatchUpdate.vault = { encrypted, updatedAt: nowIso };
                        updatedSigs.vault = vaultSig;
                    }
                }
            }

            // 3. Sync Tabs & Pinned Apps (Personal, Work & Custom Spaces)
            if (syncCategories?.tabs !== false) {
                const tabState = useTabStore.getState();
                const formatTab = (t) => ({
                    id: t.id,
                    title: getCleanTabTitle(t),
                    url: t.url,
                    lastActiveAt: t.lastActiveAt || Date.now()
                });
                const formatSigTab = (t) => ({
                    id: t.id,
                    title: getCleanTabTitle(t),
                    url: t.url
                });

                const validPrivateTabs = (tabState.privateTabs || [])
                    .filter(isValidSyncTab)
                    .map(formatTab);
                const validWorkTabs = (tabState.workTabs || [])
                    .filter(isValidSyncTab)
                    .map(formatTab);
                const validCustomSpaceTabs = {};
                const sigCustomSpaceTabs = {};
                Object.entries(tabState.customSpaceTabs || {}).forEach(([sId, list]) => {
                    const filtered = (list || []).filter(isValidSyncTab);
                    if (filtered.length > 0) {
                        validCustomSpaceTabs[sId] = filtered.map(formatTab);
                        sigCustomSpaceTabs[sId] = filtered.map(formatSigTab);
                    }
                });
                const pinnedTabsList = tabState.pinnedTabs || [];

                // Build space lookup map to preserve custom workspace names
                const customSpacesList = tabState.customSpaces || [];
                const spaceNameMap = { personal: 'Personal', work: 'Work' };
                customSpacesList.forEach(s => {
                    if (s && s.id) spaceNameMap[s.id] = s.name || s.id;
                });

                // Flat tabs list across all spaces with preserved space labels
                const flatTabsList = [
                    ...validPrivateTabs.map(t => ({ ...t, spaceId: 'personal', spaceName: 'Personal' })),
                    ...validWorkTabs.map(t => ({ ...t, spaceId: 'work', spaceName: 'Work' })),
                    ...Object.entries(validCustomSpaceTabs).flatMap(([sId, list]) => {
                        const sName = spaceNameMap[sId] || sId;
                        return (list || []).map(t => ({ ...t, spaceId: sId, spaceName: sName }));
                    })
                ];

                const currentDeviceId = getOrCreateDeviceId();
                const currentDeviceName = getDeviceName();

                const tabsPayload = {
                    privateTabs: validPrivateTabs,
                    workTabs: validWorkTabs,
                    customSpaceTabs: validCustomSpaceTabs,
                    tabs: flatTabsList,
                    pinnedTabs: pinnedTabsList,
                    customSpaces: customSpacesList,
                    spaceOrder: tabState.spaceOrder || [],
                    deviceId: currentDeviceId,
                    deviceName: currentDeviceName,
                    lastSynced: Date.now()
                };
                const tabsSig = JSON.stringify({
                    priv: (tabState.privateTabs || []).filter(isValidSyncTab).map(formatSigTab),
                    work: (tabState.workTabs || []).filter(isValidSyncTab).map(formatSigTab),
                    custom: sigCustomSpaceTabs,
                    pins: pinnedTabsList,
                    customSpaces: customSpacesList,
                    spaceOrder: tabState.spaceOrder || []
                });

                totalItems += (tabsPayload.privateTabs.length + tabsPayload.workTabs.length + pinnedTabsList.length);

                if (!isSilent || tabsSig !== lastSyncedSignatures.tabs) {
                    const encryptedTabs = await encryptData(tabsPayload, masterPassword);
                    rootBatchUpdate.tabs = { encrypted: encryptedTabs, updatedAt: nowIso };

                    // Per-device payload prevents cross-device overwrites
                    const deviceEntry = {
                        deviceId: currentDeviceId,
                        deviceName: currentDeviceName,
                        lastSynced: Date.now(),
                        encrypted: encryptedTabs,
                        updatedAt: nowIso
                    };
                    rootBatchUpdate.devices = {
                        [currentDeviceId]: deviceEntry
                    };
                    rootBatchUpdate.deviceTabs = {
                        [currentDeviceId]: deviceEntry
                    };
                    rootBatchUpdate.lastSyncDeviceId = currentDeviceId;
                    updatedSigs.tabs = tabsSig;
                }

                const pinsSig = JSON.stringify(pinnedTabsList);
                if (!isSilent || pinsSig !== lastSyncedSignatures.pinnedTabs) {
                    const encryptedPins = await encryptData(pinnedTabsList, masterPassword);
                    rootBatchUpdate.pinnedTabs = { encrypted: encryptedPins, updatedAt: nowIso };
                    updatedSigs.pinnedTabs = pinsSig;
                }
            }

            // 4. Sync History & Bookmarks (limited to 200 items to keep document lightweight)
            if (syncCategories?.history !== false) {
                const historyList = useHistoryStore.getState().history || [];
                const historyPayload = historyList.slice(0, 200);
                const historySig = JSON.stringify(historyPayload.map(h => `${h.url}|${h.timestamp || ''}`));
                totalItems += historyPayload.length;
                if (!isSilent || historySig !== lastSyncedSignatures.history) {
                    const encryptedHistory = await encryptData(historyPayload, masterPassword);
                    rootBatchUpdate.history = { encrypted: encryptedHistory, updatedAt: nowIso };
                    updatedSigs.history = historySig;
                }
            }

            const changedCategoryKeys = Object.keys(rootBatchUpdate);
            if (changedCategoryKeys.length > 0) {
                lastLocalWriteIso = nowIso;
                rootBatchUpdate.lastSync = nowIso;
                rootBatchUpdate.userAgent = navigator.userAgent;

                const rootRef = doc(db, 'users', user.uid);
                try {
                    await setDoc(rootRef, rootBatchUpdate, { merge: true });
                } catch(writeErr) {
                    if (writeErr?.message && writeErr.message.includes('exceeds the maximum allowed size')) {
                        await healBloatedRootDocument(user.uid);
                        await setDoc(rootRef, rootBatchUpdate, { merge: true });
                    } else {
                        throw writeErr;
                    }
                }

                Object.assign(lastSyncedSignatures, updatedSigs);
                if (rootBatchUpdate.settings) {
                    try {
                        localStorage.setItem('qbrowse_settings_updated_at', String(nowMs));
                    } catch (_) {}
                }
            }

            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem('qbrowse_last_sync', nowTime);
            set({ isSyncing: false, syncStatus: 'synced', lastSyncTime: nowTime, syncedItemsCount: totalItems, authError: null });
            if (!isSilent) {
                useUIStore.getState().showToast(`Cloud Sync Complete! (${totalItems} items encrypted)`);
            }
        } catch(e) {
            console.warn("[Sync] syncNow notice:", e);
            set({ 
                isSyncing: false, 
                syncStatus: 'offline', 
                authError: null 
            });
            if (!isSilent) {
                useUIStore.getState().showToast("Cloud sync paused. Changes saved locally.");
            }
        }
    },

    // MANUAL BACKUP PUSH
    pushManualBackup: async (customLabel = '') => {
        const { user, masterPassword } = get();
        if (!user) {
            useUIStore.getState().showToast("Sign in to push a cloud backup");
            return false;
        }
        if (!masterPassword) {
            useUIStore.getState().showToast("Encryption passphrase required");
            return false;
        }

        set({ isCreatingBackup: true, authError: null });
        try {
            // 1. Clean settings to avoid huge base64 wallpaper bloating payload
            const uiState = useUIStore.getState();
            const cleanSettings = { ...uiState.settings };
            delete cleanSettings.syncedCloudSettings;
            if (cleanSettings.customWallpaperSource !== 'url') {
                delete cleanSettings.customWallpaper;
                delete cleanSettings.customWallpaperOriginalUrl;
            } else if (cleanSettings.customWallpaperOriginalUrl) {
                cleanSettings.customWallpaper = cleanSettings.customWallpaperOriginalUrl;
            }
            cleanSettings._syncActivePresetId = uiState.activePresetId || 'default';
            cleanSettings._syncActivePreset = cleanSettings._syncActivePresetId;
            cleanSettings._syncCustomPresets = uiState.customPresets || [];
            cleanSettings._syncPresetOverrides = uiState.presetOverrides || {};
            cleanSettings._syncTheme = uiState.theme || 'dark';
            cleanSettings._syncAccentColor = uiState.accentColor || '#d4bc94';

            const tabState = useTabStore.getState();
            const cleanCustomSpaceTabs = {};
            Object.entries(tabState.customSpaceTabs || {}).forEach(([sId, list]) => {
                const filtered = (list || []).filter(isValidSyncTab).map(t => ({ ...t, title: getCleanTabTitle(t) }));
                if (filtered.length > 0) cleanCustomSpaceTabs[sId] = filtered;
            });

            // 2. Gather browser state (with safe bounds on history)
            const payload = {
                version: "1.3.5",
                createdAt: new Date().toISOString(),
                label: customLabel.trim() || `Manual Backup (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                settings: cleanSettings,
                vault: await (async () => {
                    let v = useVaultStore.getState().passwords || [];
                    if (v.length === 0 && useVaultStore.getState().isUnlocked && window.electronAPI?.getPasswords) {
                        try {
                            const disk = await window.electronAPI.getPasswords();
                            if (Array.isArray(disk) && disk.length > 0) v = disk;
                        } catch(e) {}
                    }
                    return (v || []).filter(item => item && !isRawCiphertextString(item.password));
                })(),
                tabs: {
                    privateTabs: (tabState.privateTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    workTabs: (tabState.workTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    customSpaceTabs: cleanCustomSpaceTabs,
                    customSpaces: tabState.customSpaces || []
                },
                history: (useHistoryStore.getState().history || []).slice(0, 200),
                pinnedTabs: tabState.pinnedTabs || []
            };

            // 3. Encrypt entire payload with AES-GCM
            const encrypted = await encryptData(payload, masterPassword);

            const backupId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const fullBackupRecord = {
                id: backupId,
                label: payload.label,
                createdAt: payload.createdAt,
                stats: {
                    passwords: payload.vault?.length || 0,
                    tabs: (payload.tabs?.privateTabs?.length || 0) + (payload.tabs?.workTabs?.length || 0),
                    history: payload.history?.length || 0
                },
                encrypted
            };

            const backupMetadata = {
                id: backupId,
                label: payload.label,
                createdAt: payload.createdAt,
                stats: fullBackupRecord.stats
            };

            // 4. Save full backup to local storage as an immediate offline backup safeguard
            try {
                const localBackups = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                const nextLocal = [fullBackupRecord, ...localBackups.filter(b => b.id !== backupId)].slice(0, 5);
                localStorage.setItem('qbrowse_local_backups', JSON.stringify(nextLocal));
            } catch(_) {}

            // 5. Save full encrypted backup to backups subcollection (each doc has its own 1MB limit!)
            let cloudSaved = false;
            try {
                await setDoc(doc(db, 'users', user.uid, 'backups', backupId), fullBackupRecord);
                cloudSaved = true;
            } catch(subErr) {
                console.warn("[Sync] Subcollection backup write notice:", subErr);
            }

            // 6. Save ONLY lightweight metadata to user's root document (keeps root doc < 60KB!)
            const rootRef = doc(db, 'users', user.uid);
            let existingMetadata = [];
            try {
                const userSnap = await getDoc(rootRef);
                if (userSnap.exists() && Array.isArray(userSnap.data().manual_backups)) {
                    // Strip any legacy encrypted field from existing backups
                    existingMetadata = userSnap.data().manual_backups.map(b => ({
                        id: b.id,
                        label: b.label,
                        createdAt: b.createdAt,
                        stats: b.stats || {}
                    }));
                }
            } catch(e) {}

            const updatedBackupsMeta = [backupMetadata, ...existingMetadata.filter(b => b.id !== backupId)].slice(0, 5);

            try {
                await setDoc(rootRef, { manual_backups: updatedBackupsMeta }, { merge: true });
                cloudSaved = true;
            } catch(rootErr) {
                console.warn("[Sync] Root doc metadata save notice, attempting self-heal:", rootErr);
                try {
                    await updateDoc(rootRef, { manual_backups: deleteField() });
                    await setDoc(rootRef, { manual_backups: updatedBackupsMeta }, { merge: true });
                    cloudSaved = true;
                } catch(healErr) {
                    console.warn("[Sync] Root doc heal during backup notice:", healErr);
                }
            }

            // In local Zustand state, keep fullBackupRecord available for instant restore
            const currentList = get().cloudBackups || [];
            const nextCloudList = [fullBackupRecord, ...currentList.filter(b => b.id !== backupId)].slice(0, 5);

            set(state => ({
                isCreatingBackup: false,
                cloudBackups: nextCloudList,
                syncStatus: cloudSaved ? 'synced' : 'offline'
            }));

            if (cloudSaved) {
                useUIStore.getState().showToast(`Cloud Backup "${payload.label}" pushed successfully!`);
                return true;
            } else {
                useUIStore.getState().showToast(`Backup saved to local storage (cloud sync offline).`);
                return true;
            }
        } catch(e) {
            console.warn("[Sync] pushManualBackup notice:", e);
            set({ 
                isCreatingBackup: false, 
                syncStatus: 'offline', 
                authError: null 
            });
            const errMsg = e?.message ? e.message.replace(/^Firebase:\s*/, '') : "Network or size issue";
            useUIStore.getState().showToast(`Backup notice: ${errMsg}`);
            return false;
        }
    },

    // Fetch existing manual backups
    fetchCloudBackups: async () => {
        const { user } = get();
        set({ isLoadingBackups: true });
        try {
            let backups = [];
            if (user) {
                // 1. Fetch from subcollection where full encrypted payloads reside
                try {
                    const subSnap = await getDocs(collection(db, 'users', user.uid, 'backups'));
                    subSnap.forEach(d => {
                        if (d.exists()) {
                            backups.push(d.data());
                        }
                    });
                } catch(e) {}

                // 2. Fetch metadata from root document and merge any missing
                const rootRef = doc(db, 'users', user.uid);
                try {
                    const userSnap = await getDoc(rootRef);
                    if (userSnap.exists() && Array.isArray(userSnap.data().manual_backups)) {
                        for (const r of userSnap.data().manual_backups) {
                            if (!backups.some(b => b.id === r.id)) {
                                backups.push(r);
                            }
                        }
                    }
                } catch(e) {}
            }

            // 3. Merge local offline backups
            try {
                const localB = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                if (Array.isArray(localB)) {
                    for (const lb of localB) {
                        const existingIdx = backups.findIndex(b => b.id === lb.id);
                        if (existingIdx >= 0) {
                            if (!backups[existingIdx].encrypted && lb.encrypted) {
                                backups[existingIdx].encrypted = lb.encrypted;
                            }
                        } else {
                            backups.push(lb);
                        }
                    }
                }
            } catch(e) {}

            backups.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            set({ cloudBackups: backups, isLoadingBackups: false });
        } catch(e) {
            console.warn("[Sync] fetchCloudBackups error:", e);
            set({ isLoadingBackups: false });
        }
    },

    // Restore from a selected manual cloud backup
    restoreCloudBackup: async (backupItem) => {
        const { user, masterPassword } = get();
        if (!backupItem || !backupItem.id) return false;
        if (!masterPassword) {
            useUIStore.getState().showToast("Enter encryption key to restore backup");
            return false;
        }

        try {
            let encryptedPayload = backupItem.encrypted;

            // If backupItem in UI only has metadata (no encrypted payload), fetch it from subcollection
            if (!encryptedPayload && user) {
                try {
                    const subDoc = await getDoc(doc(db, 'users', user.uid, 'backups', backupItem.id));
                    if (subDoc.exists() && subDoc.data().encrypted) {
                        encryptedPayload = subDoc.data().encrypted;
                    }
                } catch(e) {}
            }

            // Fallback to local storage if not in subcollection
            if (!encryptedPayload) {
                try {
                    const localB = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                    const match = localB.find(b => b.id === backupItem.id);
                    if (match?.encrypted) encryptedPayload = match.encrypted;
                } catch(e) {}
            }

            if (!encryptedPayload) {
                throw new Error("Backup encrypted data not found in cloud or local cache");
            }

            const decrypted = await decryptData(encryptedPayload, masterPassword);
            if (!decrypted) throw new Error("Could not decrypt backup payload");

            // 1. Restore Settings & Presets
            if (decrypted.settings) {
                Object.keys(decrypted.settings).forEach(k => {
                    if (k.startsWith('_sync')) return;
                    useUIStore.getState().setSettingValue(k, decrypted.settings[k]);
                });
                applySyncedUIPresetsAndTheme(decrypted.settings);
            }

            // 2. Restore Vault Passwords
            if (Array.isArray(decrypted.vault) && decrypted.vault.length > 0) {
                await get().mergeRemoteVault(decrypted.vault, masterPassword);
            }

            // 3. Restore Tabs
            if (decrypted.tabs) {
                const cleanRemoteTabs = {
                    privateTabs: (decrypted.tabs.privateTabs || []).filter(isValidSyncTab),
                    workTabs: (decrypted.tabs.workTabs || []).filter(isValidSyncTab),
                    customSpaceTabs: decrypted.tabs.customSpaceTabs || {}
                };
                useTabStore.getState().setCloudTabs(cleanRemoteTabs);
                if (cleanRemoteTabs.privateTabs.length > 0) {
                    useTabStore.getState().setPrivateTabs(cleanRemoteTabs.privateTabs);
                }
                if (cleanRemoteTabs.workTabs.length > 0) {
                    useTabStore.getState().setWorkTabs(cleanRemoteTabs.workTabs);
                }
                if (decrypted.tabs.customSpaceTabs && typeof decrypted.tabs.customSpaceTabs === 'object') {
                    Object.entries(decrypted.tabs.customSpaceTabs).forEach(([sId, list]) => {
                        if (Array.isArray(list) && list.length > 0 && typeof useTabStore.getState().setTabsForSpace === 'function') {
                            useTabStore.getState().setTabsForSpace(sId, list.filter(isValidSyncTab));
                        }
                    });
                }
            }

            // 4. Restore History
            if (Array.isArray(decrypted.history)) {
                useHistoryStore.getState().mergeRemoteHistory(decrypted.history);
            }

            // 5. Restore Pinned Tabs
            if (Array.isArray(decrypted.pinnedTabs)) {
                useTabStore.getState().setPinnedTabs(decrypted.pinnedTabs);
            }

            useUIStore.getState().showToast(`Successfully restored "${backupItem.label}"!`);
            return true;
        } catch(e) {
            console.error("[Sync] restoreCloudBackup error:", e);
            useUIStore.getState().showToast(`Restore failed: ${e.message}`);
            return false;
        }
    },

    // Delete a cloud backup
    deleteCloudBackup: async (backupId) => {
        const { user, cloudBackups } = get();
        if (!backupId) return;
        try {
            const nextBackups = cloudBackups.filter(b => b.id !== backupId);
            set({ cloudBackups: nextBackups });

            try {
                const localBackups = JSON.parse(localStorage.getItem('qbrowse_local_backups') || '[]');
                const nextLocal = localBackups.filter(b => b.id !== backupId);
                localStorage.setItem('qbrowse_local_backups', JSON.stringify(nextLocal));
            } catch(e) {}

            if (user) {
                try {
                    const rootRef = doc(db, 'users', user.uid);
                    const metaOnly = nextBackups.map(b => ({
                        id: b.id,
                        label: b.label,
                        createdAt: b.createdAt,
                        stats: b.stats || {}
                    }));
                    await setDoc(rootRef, { manual_backups: metaOnly }, { merge: true });
                } catch(e) {}

                try {
                    await deleteDoc(doc(db, 'users', user.uid, 'backups', backupId));
                } catch(e) {}
            }

            useUIStore.getState().showToast("Backup deleted");
        } catch(e) {
            console.error("[Sync] deleteCloudBackup error:", e);
        }
    },

    // Cross-Device Remote Tabs Refresh
    refreshCloudTabs: async (showToastNotice = true) => {
        const { user, masterPassword } = get();
        if (!user || !masterPassword) {
            if (showToastNotice) useUIStore.getState().showToast("Sign in to sync remote tabs");
            return;
        }

        try {
            set({ isRefreshingTabs: true });
            const rootRef = doc(db, 'users', user.uid);
            const snap = await getDoc(rootRef);
            if (!snap.exists()) {
                set({ isRefreshingTabs: false });
                return;
            }
            const data = snap.data();
            const currentDeviceId = getOrCreateDeviceId();
            const remoteDevices = await parseRemoteDevicesFromSnapshot(data, masterPassword, currentDeviceId);

            set({ remoteDeviceTabs: remoteDevices, isRefreshingTabs: false });

            // Mirror to useTabStore cloudTabs for backward compatibility
            const aggregatedPrivate = [];
            const aggregatedWork = [];
            const aggregatedCustom = {};
            remoteDevices.forEach(dev => {
                (dev.tabs || []).forEach(t => {
                    if (t.spaceId === 'work') aggregatedWork.push(t);
                    else if (t.spaceId && t.spaceId !== 'personal') {
                        if (!aggregatedCustom[t.spaceId]) aggregatedCustom[t.spaceId] = [];
                        aggregatedCustom[t.spaceId].push(t);
                    } else {
                        aggregatedPrivate.push(t);
                    }
                });
            });
            useTabStore.getState().setCloudTabs({
                privateTabs: aggregatedPrivate,
                workTabs: aggregatedWork,
                customSpaceTabs: aggregatedCustom
            });

            if (showToastNotice) {
                const count = remoteDevices.reduce((acc, d) => acc + (d.tabs?.length || 0), 0);
                useUIStore.getState().showToast(`Cloud tabs refreshed (${count} tabs from ${remoteDevices.length} device${remoteDevices.length === 1 ? '' : 's'})`);
            }
        } catch (e) {
            console.warn('[Sync] refreshCloudTabs notice:', e);
            set({ isRefreshingTabs: false });
        }
    },

    // Offline / Local File Backup Export
    exportLocalBackup: async () => {
        const { masterPassword } = get();
        const passToUse = masterPassword || 'qbrowse_local';
        try {
            const uiState = useUIStore.getState();
            const cleanSettings = { ...uiState.settings };
            delete cleanSettings.syncedCloudSettings;
            if (cleanSettings.customWallpaperSource !== 'url') {
                delete cleanSettings.customWallpaper;
                delete cleanSettings.customWallpaperOriginalUrl;
            } else if (cleanSettings.customWallpaperOriginalUrl) {
                cleanSettings.customWallpaper = cleanSettings.customWallpaperOriginalUrl;
            }
            cleanSettings._syncActivePresetId = uiState.activePresetId || 'default';
            cleanSettings._syncActivePreset = cleanSettings._syncActivePresetId;
            cleanSettings._syncCustomPresets = uiState.customPresets || [];
            cleanSettings._syncPresetOverrides = uiState.presetOverrides || {};
            cleanSettings._syncTheme = uiState.theme || 'dark';
            cleanSettings._syncAccentColor = uiState.accentColor || '#d4bc94';

            const tabState = useTabStore.getState();
            const cleanCustomSpaceTabs = {};
            Object.entries(tabState.customSpaceTabs || {}).forEach(([sId, list]) => {
                const filtered = (list || []).filter(isValidSyncTab).map(t => ({ ...t, title: getCleanTabTitle(t) }));
                if (filtered.length > 0) cleanCustomSpaceTabs[sId] = filtered;
            });

            const payload = {
                app: "QBrowse",
                version: "1.3.5",
                exportedAt: new Date().toISOString(),
                settings: cleanSettings,
                vault: await (async () => {
                    let v = useVaultStore.getState().passwords || [];
                    if (v.length === 0 && useVaultStore.getState().isUnlocked && window.electronAPI?.getPasswords) {
                        try {
                            const disk = await window.electronAPI.getPasswords();
                            if (Array.isArray(disk) && disk.length > 0) v = disk;
                        } catch(e) {}
                    }
                    return (v || []).filter(item => item && !isRawCiphertextString(item.password));
                })(),
                tabs: {
                    privateTabs: (tabState.privateTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    workTabs: (tabState.workTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    customSpaceTabs: cleanCustomSpaceTabs,
                    customSpaces: tabState.customSpaces || []
                },
                history: (useHistoryStore.getState().history || []).slice(0, 300),
                pinnedTabs: tabState.pinnedTabs || []
            };
            const encrypted = await encryptData(payload, passToUse);
            const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qbrowse_backup_${new Date().toISOString().slice(0, 10)}.qsync`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            useUIStore.getState().showToast("Encrypted backup exported to file (.qsync)");
        } catch(e) {
            console.error("Export backup error:", e);
            useUIStore.getState().showToast("Export failed: " + e.message);
        }
    },

    // Offline / Local File Backup Import
    importLocalBackup: async (fileJsonStr, passphrase) => {
        const { masterPassword } = get();
        const passToUse = passphrase || masterPassword || 'qbrowse_local';
        try {
            const encryptedObj = JSON.parse(fileJsonStr);
            const data = await decryptData(encryptedObj, passToUse);
            if (!data) throw new Error("Invalid format");

            if (data.settings) {
                Object.keys(data.settings).forEach(k => {
                    if (k.startsWith('_sync')) return;
                    useUIStore.getState().setSettingValue(k, data.settings[k]);
                });
                applySyncedUIPresetsAndTheme(data.settings);
            }
            if (Array.isArray(data.vault)) {
                await get().mergeRemoteVault(data.vault, passToUse);
            }
            if (data.tabs) {
                const cleanTabs = {
                    privateTabs: (data.tabs.privateTabs || []).filter(isValidSyncTab),
                    workTabs: (data.tabs.workTabs || []).filter(isValidSyncTab),
                    customSpaceTabs: data.tabs.customSpaceTabs || {}
                };
                useTabStore.getState().setCloudTabs(cleanTabs);
            }
            if (Array.isArray(data.history)) {
                useHistoryStore.getState().mergeRemoteHistory(data.history);
            }
            if (Array.isArray(data.pinnedTabs)) {
                useTabStore.getState().setPinnedTabs(data.pinnedTabs);
            }
            useUIStore.getState().showToast("Backup imported successfully!");
            return true;
        } catch(e) {
            console.error("Import backup error:", e);
            useUIStore.getState().showToast("Import failed: check password");
            return false;
        }
    },

    listenToCloudSync: () => {
        const { user, masterPassword, syncCategories } = get();
        if (!user || !masterPassword) return;

        get().stopListening();

        // 1. Single Root User Document Listener (Handles standard match /users/{userId} rule!)
        const rootDocRef = doc(db, 'users', user.uid);
        const unsubRoot = onSnapshot(rootDocRef, async (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();

            // Skip self-echo snapshots produced by our own recent write
            if (data.lastSync && lastLocalWriteIso && data.lastSync === lastLocalWriteIso) {
                return;
            }

            isApplyingCloudUpdate = true;
            try {
                // Handle manual backups update (preserve any in-memory decrypted/encrypted payload references)
                if (Array.isArray(data.manual_backups)) {
                    const currentBackups = get().cloudBackups || [];
                    const merged = data.manual_backups.map(mb => {
                        const existing = currentBackups.find(b => b.id === mb.id);
                        return (existing?.encrypted) ? { ...mb, encrypted: existing.encrypted } : mb;
                    });
                    set({ cloudBackups: merged });
                }

                // Sync Settings with Last-Write-Wins Timestamp Resolution
                if (syncCategories?.settings !== false && data.settings?.encrypted) {
                    try {
                        const remoteIso = data.settings?.updatedAt;
                        const remoteUpdatedAtMs = remoteIso ? new Date(remoteIso).getTime() : 0;
                        const localSettingsUpdatedAt = parseInt(localStorage.getItem('qbrowse_settings_updated_at') || '0', 10);

                        if (remoteUpdatedAtMs >= localSettingsUpdatedAt) {
                            const decrypted = await decryptData(data.settings.encrypted, masterPassword);
                            if (decrypted && typeof decrypted === 'object') {
                                const uiStore = useUIStore.getState();
                                const currentSettings = uiStore.settings;
                                Object.keys(decrypted).forEach(key => {
                                    if (key.startsWith('_sync')) return;
                                    if (key !== 'syncedCloudSettings' && decrypted[key] !== undefined && currentSettings[key] !== decrypted[key]) {
                                        if (key === 'customWallpaper' && decrypted.customWallpaper && decrypted.customWallpaperSource === 'url') {
                                            if (window.electronAPI && window.electronAPI.importWallpaperUrl) {
                                                window.electronAPI.importWallpaperUrl(decrypted.customWallpaper).then(res => {
                                                    if (res && res.success) {
                                                        useUIStore.getState().setCustomWallpaper(res.url, 'url', decrypted.customWallpaper);
                                                    }
                                                }).catch(() => {});
                                            }
                                        } else {
                                            uiStore.setSettingValue(key, decrypted[key]);
                                        }
                                    }
                                });
                                applySyncedUIPresetsAndTheme(decrypted);
                                lastSyncedSignatures.settings = JSON.stringify(decrypted);
                                if (remoteUpdatedAtMs > 0) {
                                    try {
                                        localStorage.setItem('qbrowse_settings_updated_at', String(remoteUpdatedAtMs));
                                    } catch (_) {}
                                }
                            }
                        }
                    } catch(e) {}
                }

                // Sync Vault
                if (syncCategories?.vault !== false && data.vault?.encrypted) {
                    try {
                        const remoteVault = await decryptData(data.vault.encrypted, masterPassword);
                        if (Array.isArray(remoteVault) && remoteVault.length > 0) {
                            await get().mergeRemoteVault(remoteVault, masterPassword);
                        }
                    } catch(e) {}
                }

                // Sync Cross-Device Remote Tabs
                if (syncCategories?.tabs !== false) {
                    try {
                        const currentDeviceId = getOrCreateDeviceId();
                        const remoteDevices = await parseRemoteDevicesFromSnapshot(data, masterPassword, currentDeviceId);
                        set({ remoteDeviceTabs: remoteDevices });

                        // Mirror to useTabStore cloudTabs for backward compatibility
                        const aggregatedPrivate = [];
                        const aggregatedWork = [];
                        const aggregatedCustom = {};
                        remoteDevices.forEach(dev => {
                            (dev.tabs || []).forEach(t => {
                                if (t.spaceId === 'work') aggregatedWork.push(t);
                                else if (t.spaceId && t.spaceId !== 'personal') {
                                    if (!aggregatedCustom[t.spaceId]) aggregatedCustom[t.spaceId] = [];
                                    aggregatedCustom[t.spaceId].push(t);
                                } else {
                                    aggregatedPrivate.push(t);
                                }
                            });
                        });
                        useTabStore.getState().setCloudTabs({
                            privateTabs: aggregatedPrivate,
                            workTabs: aggregatedWork,
                            customSpaceTabs: aggregatedCustom
                        });

                        // Fallback sync pinned tabs if included in legacy payload
                        if (data.tabs?.encrypted && !data.pinnedTabs?.encrypted) {
                            try {
                                const legacyTabs = await decryptData(data.tabs.encrypted, masterPassword);
                                if (legacyTabs && Array.isArray(legacyTabs.pinnedTabs) && legacyTabs.pinnedTabs.length > 0) {
                                    useTabStore.getState().setPinnedTabs(legacyTabs.pinnedTabs);
                                }
                            } catch (_) {}
                        }
                    } catch(e) {
                        console.warn('[Sync] Notice processing remote tabs in snapshot:', e);
                    }
                }

                // Sync Pinned Apps / Tabs
                if (syncCategories?.tabs !== false && data.pinnedTabs?.encrypted) {
                    try {
                        const remotePinned = await decryptData(data.pinnedTabs.encrypted, masterPassword);
                        if (Array.isArray(remotePinned) && remotePinned.length > 0) {
                            useTabStore.getState().setPinnedTabs(remotePinned);
                            lastSyncedSignatures.pinnedTabs = JSON.stringify(remotePinned);
                        }
                    } catch(e) {}
                }

                // Sync History
                if (syncCategories?.history !== false && data.history?.encrypted) {
                    try {
                        const remoteHistory = await decryptData(data.history.encrypted, masterPassword);
                        if (Array.isArray(remoteHistory)) {
                            useHistoryStore.getState().mergeRemoteHistory(remoteHistory);
                        }
                    } catch(e) {}
                }

                // Update local watcher signatures so incoming cloud changes never echo back a sync
                lastObservedTabSig = computeTabsWatcherSignature(useTabStore.getState());
                lastObservedVaultSig = computeVaultWatcherSignature(useVaultStore.getState());
                lastObservedSettingsSig = computeSettingsWatcherSignature(useUIStore.getState());

                set({ syncStatus: 'synced', authError: null });
            } finally {
                setTimeout(() => {
                    lastObservedTabSig = computeTabsWatcherSignature(useTabStore.getState());
                    lastObservedVaultSig = computeVaultWatcherSignature(useVaultStore.getState());
                    lastObservedSettingsSig = computeSettingsWatcherSignature(useUIStore.getState());
                    isApplyingCloudUpdate = false;
                }, 2000);
            }
        }, (err) => {
            console.warn("[Sync] Root user listener notice:", err.message);
            set({ syncStatus: 'offline', authError: null });
        });

        unsubscribeCloudListeners.push(unsubRoot);
    },

    serializeCurrentProfileSync: (profileId) => {
        try {
            const syncKey = (!profileId || profileId === 'default') ? 'qbrowse_last_sync' : `qbrowse_last_sync_${profileId}`;
            const catKey = (!profileId || profileId === 'default') ? 'qbrowse_sync_categories' : `qbrowse_sync_categories_${profileId}`;

            if (get().masterPassword) {
                saveWrappedPassphrase(get().masterPassword);
            }
            if (get().lastSyncTime) localStorage.setItem(syncKey, get().lastSyncTime);
            localStorage.setItem(catKey, JSON.stringify(get().syncCategories));
        } catch (e) {
            console.error('Failed to serialize profile sync data', e);
        }
    },

    loadProfileSync: async (profileId) => {
        try {
            const syncKey = (!profileId || profileId === 'default') ? 'qbrowse_last_sync' : `qbrowse_last_sync_${profileId}`;
            const catKey = (!profileId || profileId === 'default') ? 'qbrowse_sync_categories' : `qbrowse_sync_categories_${profileId}`;

            const masterPass = await loadWrappedPassphrase();
            const lastSync = localStorage.getItem(syncKey) || null;
            let cats = { vault: true, settings: true, tabs: true, history: true };
            try {
                const storedCats = localStorage.getItem(catKey);
                if (storedCats) cats = JSON.parse(storedCats);
            } catch(e) {}

            set({
                masterPassword: masterPass,
                lastSyncTime: lastSync,
                syncCategories: cats,
                cloudBackups: [],
                isLoadingBackups: false
            });

            if (masterPass && window.electronAPI?.unlockVault) {
                try { await window.electronAPI.unlockVault(masterPass); } catch (_) {}
            }
            if (typeof window !== 'undefined' && window.__vaultStore) {
                try { await window.__vaultStore.getState().syncVaultStatus?.(); } catch (_) {}
            }

            // If user is authenticated, refresh cloud backups and listener for this profile
            if (get().user) {
                get().stopListening();
                setTimeout(() => {
                    get().listenToCloudSync();
                    get().fetchCloudBackups();
                }, 50);
            }
        } catch (e) {
            console.error('Failed to load profile sync data', e);
        }
    }
}));

// Initialize Firebase auth observer immediately
useSyncStore.getState().initAuth();

if (typeof window !== 'undefined') {
    window.__syncStore = useSyncStore;
}

export default useSyncStore;
