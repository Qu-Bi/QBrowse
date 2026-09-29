import { create } from 'zustand';
import useUIStore from './useUIStore';
import useVaultStore from './useVaultStore';
import useTabStore, { isValidSyncTab, getCleanTabTitle } from './useTabStore';
import useHistoryStore from './useHistoryStore';
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

// Global active snapshot listener unsubscribers
let unsubscribeCloudListeners = [];
let isApplyingCloudUpdate = false;
let autoSyncIntervalTimer = null;
let debounceSyncTimer = null;
let storeUnsubscribers = [];

function setupLocalStoreWatchers() {
    if (storeUnsubscribers.length > 0) return;

    try {
        const unsubTabs = useTabStore.subscribe((state, prevState) => {
            if (isApplyingCloudUpdate) return;
            const current = useSyncStore.getState();
            if (!current.autoSyncEnabled || !current.user || !current.masterPassword) return;
            if (
                state.privateTabs !== prevState?.privateTabs || 
                state.workTabs !== prevState?.workTabs ||
                state.pinnedTabs !== prevState?.pinnedTabs
            ) {
                current.triggerDebouncedSync(8000);
            }
        });

        const unsubVault = useVaultStore.subscribe((state, prevState) => {
            if (isApplyingCloudUpdate) return;
            const current = useSyncStore.getState();
            if (!current.autoSyncEnabled || !current.user || !current.masterPassword) return;
            if (state.passwords !== prevState?.passwords || (state.isUnlocked && !prevState?.isUnlocked)) {
                current.triggerDebouncedSync(3000);
            }
        });

        const unsubUI = useUIStore.subscribe((state, prevState) => {
            if (isApplyingCloudUpdate) return;
            const current = useSyncStore.getState();
            if (!current.autoSyncEnabled || !current.user || !current.masterPassword) return;
            if (state.settings !== prevState?.settings) {
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
    masterPassword: localStorage.getItem('qbrowse_master_passphrase') || '',
    isAuthInitialized: false,
    authError: null,
    isSyncing: false,
    syncStatus: 'idle', // 'idle' | 'synced' | 'syncing' | 'permission-error' | 'error' | 'offline'
    lastSyncTime: localStorage.getItem('qbrowse_last_sync') || null,
    syncedItemsCount: 0,
    cloudBackups: [],
    isLoadingBackups: false,
    isCreatingBackup: false,

    // Auto-Sync Configuration
    autoSyncEnabled: localStorage.getItem('qbrowse_auto_sync') !== 'false',
    autoSyncIntervalMinutes: 5,

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
        set({ masterPassword: passphrase });
        localStorage.setItem('qbrowse_master_passphrase', passphrase);
    },

    startAutoSync: (intervalMinutes = 5) => {
        if (autoSyncIntervalTimer) {
            clearInterval(autoSyncIntervalTimer);
            autoSyncIntervalTimer = null;
        }
        setupLocalStoreWatchers();

        const ms = Math.max(1, intervalMinutes) * 60 * 1000;
        autoSyncIntervalTimer = setInterval(() => {
            const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
            if (autoSyncEnabled && user && masterPassword && !isSyncing && !isApplyingCloudUpdate) {
                get().syncNow({ silent: true }).catch(() => {});
            }
        }, ms);

        // Silent warm-up sync after 4 seconds if ready
        setTimeout(() => {
            const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
            if (autoSyncEnabled && user && masterPassword && !isSyncing && !isApplyingCloudUpdate) {
                get().syncNow({ silent: true }).catch(() => {});
            }
        }, 4000);
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

    triggerDebouncedSync: (delayMs = 15000) => {
        const { autoSyncEnabled, user, masterPassword, isSyncing } = get();
        if (!autoSyncEnabled || !user || !masterPassword || isSyncing || isApplyingCloudUpdate) {
            return;
        }
        if (debounceSyncTimer) {
            clearTimeout(debounceSyncTimer);
        }
        debounceSyncTimer = setTimeout(() => {
            const state = get();
            if (state.autoSyncEnabled && state.user && state.masterPassword && !state.isSyncing && !isApplyingCloudUpdate) {
                state.syncNow({ silent: true }).catch(() => {});
            }
        }, delayMs);
    },

    toggleAutoSync: () => {
        const next = !get().autoSyncEnabled;
        set({ autoSyncEnabled: next });
        localStorage.setItem('qbrowse_auto_sync', next ? 'true' : 'false');
        if (next) {
            get().startAutoSync();
            useUIStore.getState().showToast("Auto-Sync active (syncs every 5m & on changes)");
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
                // If masterPassword is missing, check if saved in session or local
                const currentPass = get().masterPassword;
                if (!currentPass) {
                    const saved = localStorage.getItem('qbrowse_master_passphrase');
                    if (saved) set({ masterPassword: saved });
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
            get().setMasterPassword(passToUse);
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
            get().setMasterPassword(passToUse);
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
        await signOut(auth);
        set({ 
            user: null, 
            lastSyncTime: null, 
            syncedItemsCount: 0, 
            cloudBackups: [],
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

            // 1. Write directly to root user doc: doc(db, 'users', user.uid)
            // Storing on root document fits standard match /users/{userId} security rules!
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

            // 2. Also mirror to subcollection for full backwards-compatibility
            try {
                await setDoc(doc(db, 'users', user.uid, 'sync', dataName), {
                    encrypted,
                    updatedAt: nowIso
                }, { merge: true });
            } catch(subErr) {
                // If subcollection permissions are blocked, root document write already succeeded!
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
        const { user, masterPassword, syncCategories } = get();
        if (!user) {
            if (!isSilent) useUIStore.getState().showToast("Sign in to sync your data");
            return;
        }
        if (!masterPassword) {
            if (!isSilent) useUIStore.getState().showToast("Encryption key required. Please enter your account password in profile.");
            set({ syncStatus: 'error', authError: 'Master encryption passphrase missing.' });
            return;
        }

        set({ isSyncing: true, syncStatus: 'syncing', authError: null });
        try {
            let totalItems = 0;

            // 1. Sync Settings
            if (syncCategories?.settings !== false) {
                const uiSettings = { ...useUIStore.getState().settings };
                delete uiSettings.syncedCloudSettings;
                // Safe handling for custom wallpaper: only sync URL backgrounds, keep local file wallpapers device-local
                if (uiSettings.customWallpaperSource !== 'url') {
                    delete uiSettings.customWallpaper;
                    delete uiSettings.customWallpaperOriginalUrl;
                } else if (uiSettings.customWallpaperOriginalUrl) {
                    uiSettings.customWallpaper = uiSettings.customWallpaperOriginalUrl;
                }
                await get().syncDataToCloud('settings', uiSettings);
                totalItems += Object.keys(uiSettings).length;
            }

            // 2. Sync Vault (Passwords, Passkeys, Cards, Addresses & Notes)
            if (syncCategories?.vault !== false) {
                let vaultItems = useVaultStore.getState().passwords || [];
                let isVaultUnlockedLocally = useVaultStore.getState().isUnlocked;

                // If vault is not yet unlocked in UI, check if masterPassword matches vault key
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

                // SAFEGUARD: Only upload if vault is confirmed unlocked (in UI or via verified master key).
                // If locked without credentials, NEVER overwrite the cloud vault!
                if (isVaultUnlockedLocally) {
                    await get().syncDataToCloud('vault', vaultItems);
                    totalItems += vaultItems.length;
                }
            }

            // 3. Sync Tabs & Pinned Apps (Personal & Work Spaces) - only sync valid open tabs, never empty/placeholder new tabs
            if (syncCategories?.tabs !== false) {
                const formatTab = (t) => ({
                    id: t.id,
                    title: getCleanTabTitle(t),
                    url: t.url,
                    lastActiveAt: t.lastActiveAt || Date.now()
                });

                const validPrivateTabs = (useTabStore.getState().privateTabs || [])
                    .filter(isValidSyncTab)
                    .map(formatTab);
                const validWorkTabs = (useTabStore.getState().workTabs || [])
                    .filter(isValidSyncTab)
                    .map(formatTab);
                const pinnedTabsList = useTabStore.getState().pinnedTabs || [];

                const tabsPayload = {
                    privateTabs: validPrivateTabs,
                    workTabs: validWorkTabs,
                    pinnedTabs: pinnedTabsList
                };
                await get().syncDataToCloud('tabs', tabsPayload);
                totalItems += (tabsPayload.privateTabs.length + tabsPayload.workTabs.length);

                // Granular sync for pinnedTabs category for fast syncing and listener support
                await get().syncDataToCloud('pinnedTabs', pinnedTabsList);
                totalItems += pinnedTabsList.length;
            }

            // 4. Sync History & Bookmarks (limited to 200 items to keep document lightweight)
            if (syncCategories?.history !== false) {
                const historyList = useHistoryStore.getState().history || [];
                const historyPayload = historyList.slice(0, 200);
                await get().syncDataToCloud('history', historyPayload);
                totalItems += historyPayload.length;
            }

            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            const cleanSettings = { ...useUIStore.getState().settings };
            delete cleanSettings.syncedCloudSettings;
            if (cleanSettings.customWallpaperSource !== 'url') {
                delete cleanSettings.customWallpaper;
                delete cleanSettings.customWallpaperOriginalUrl;
            } else if (cleanSettings.customWallpaperOriginalUrl) {
                cleanSettings.customWallpaper = cleanSettings.customWallpaperOriginalUrl;
            }

            // 2. Gather browser state (with safe bounds on history)
            const payload = {
                version: "1.2.1",
                createdAt: new Date().toISOString(),
                label: customLabel.trim() || `Manual Backup (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                settings: cleanSettings,
                vault: await (async () => {
                    let v = useVaultStore.getState().passwords || [];
                    if (v.length === 0 && useVaultStore.getState().isUnlocked && window.electronAPI?.getPasswords) {
                        try {
                            const disk = await window.electronAPI.getPasswords();
                            if (Array.isArray(disk) && disk.length > 0) return disk;
                        } catch(e) {}
                    }
                    return v;
                })(),
                tabs: {
                    privateTabs: (useTabStore.getState().privateTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    workTabs: (useTabStore.getState().workTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) }))
                },
                history: (useHistoryStore.getState().history || []).slice(0, 200),
                pinnedTabs: useTabStore.getState().pinnedTabs || []
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

            // 1. Restore Settings
            if (decrypted.settings) {
                Object.keys(decrypted.settings).forEach(k => {
                    useUIStore.getState().setSettingValue(k, decrypted.settings[k]);
                });
            }

            // 2. Restore Vault Passwords
            if (Array.isArray(decrypted.vault) && decrypted.vault.length > 0) {
                useVaultStore.getState().mergeRemoteVault(decrypted.vault);
            }

            // 3. Restore Tabs
            if (decrypted.tabs) {
                const cleanRemoteTabs = {
                    privateTabs: (decrypted.tabs.privateTabs || []).filter(isValidSyncTab),
                    workTabs: (decrypted.tabs.workTabs || []).filter(isValidSyncTab)
                };
                useTabStore.getState().setCloudTabs(cleanRemoteTabs);
                if (cleanRemoteTabs.privateTabs.length > 0) {
                    useTabStore.getState().setPrivateTabs(cleanRemoteTabs.privateTabs);
                }
                if (cleanRemoteTabs.workTabs.length > 0) {
                    useTabStore.getState().setWorkTabs(cleanRemoteTabs.workTabs);
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

    // Offline / Local File Backup Export
    exportLocalBackup: async () => {
        const { masterPassword } = get();
        const passToUse = masterPassword || 'qbrowse_local';
        try {
            const cleanSettings = { ...useUIStore.getState().settings };
            delete cleanSettings.syncedCloudSettings;
            if (cleanSettings.customWallpaperSource !== 'url') {
                delete cleanSettings.customWallpaper;
                delete cleanSettings.customWallpaperOriginalUrl;
            } else if (cleanSettings.customWallpaperOriginalUrl) {
                cleanSettings.customWallpaper = cleanSettings.customWallpaperOriginalUrl;
            }

            const payload = {
                app: "QBrowse",
                version: "1.2.1",
                exportedAt: new Date().toISOString(),
                settings: cleanSettings,
                vault: await (async () => {
                    let v = useVaultStore.getState().passwords || [];
                    if (v.length === 0 && useVaultStore.getState().isUnlocked && window.electronAPI?.getPasswords) {
                        try {
                            const disk = await window.electronAPI.getPasswords();
                            if (Array.isArray(disk) && disk.length > 0) return disk;
                        } catch(e) {}
                    }
                    return v;
                })(),
                tabs: {
                    privateTabs: (useTabStore.getState().privateTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) })),
                    workTabs: (useTabStore.getState().workTabs || [])
                        .filter(isValidSyncTab)
                        .map(t => ({ ...t, title: getCleanTabTitle(t) }))
                },
                history: (useHistoryStore.getState().history || []).slice(0, 300),
                pinnedTabs: useTabStore.getState().pinnedTabs || []
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
                Object.keys(data.settings).forEach(k => useUIStore.getState().setSettingValue(k, data.settings[k]));
            }
            if (Array.isArray(data.vault)) {
                useVaultStore.getState().mergeRemoteVault(data.vault);
            }
            if (data.tabs) {
                const cleanTabs = {
                    privateTabs: (data.tabs.privateTabs || []).filter(isValidSyncTab),
                    workTabs: (data.tabs.workTabs || []).filter(isValidSyncTab)
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
            isApplyingCloudUpdate = true;
            try {
                const data = docSnap.data();

                // Handle manual backups update (preserve any in-memory decrypted/encrypted payload references)
                if (Array.isArray(data.manual_backups)) {
                    const currentBackups = get().cloudBackups || [];
                    const merged = data.manual_backups.map(mb => {
                        const existing = currentBackups.find(b => b.id === mb.id);
                        return (existing?.encrypted) ? { ...mb, encrypted: existing.encrypted } : mb;
                    });
                    set({ cloudBackups: merged });
                }

                // Sync Settings
                if (syncCategories?.settings !== false && data.settings?.encrypted) {
                    try {
                        const decrypted = await decryptData(data.settings.encrypted, masterPassword);
                        const currentSettings = useUIStore.getState().settings;
                        Object.keys(decrypted).forEach(key => {
                            if (key !== 'syncedCloudSettings' && currentSettings[key] !== decrypted[key]) {
                                if (key === 'customWallpaper' && decrypted.customWallpaper && decrypted.customWallpaperSource === 'url') {
                                    if (window.electronAPI && window.electronAPI.importWallpaperUrl) {
                                        window.electronAPI.importWallpaperUrl(decrypted.customWallpaper).then(res => {
                                            if (res && res.success) {
                                                useUIStore.getState().setCustomWallpaper(res.url, 'url', decrypted.customWallpaper);
                                            }
                                        }).catch(() => {});
                                    }
                                } else {
                                    useUIStore.getState().setSettingValue(key, decrypted[key]);
                                }
                            }
                        });
                    } catch(e) {}
                }

                // Sync Vault
                if (syncCategories?.vault !== false && data.vault?.encrypted) {
                    try {
                        const remoteVault = await decryptData(data.vault.encrypted, masterPassword);
                        if (Array.isArray(remoteVault) && remoteVault.length > 0) {
                            await useVaultStore.getState().mergeRemoteVault(remoteVault);
                        }
                    } catch(e) {}
                }

                // Sync Tabs
                if (syncCategories?.tabs !== false && data.tabs?.encrypted) {
                    try {
                        const remoteTabs = await decryptData(data.tabs.encrypted, masterPassword);
                        if (remoteTabs && (remoteTabs.privateTabs || remoteTabs.workTabs)) {
                            const cleanRemoteTabs = {
                                privateTabs: (remoteTabs.privateTabs || []).filter(isValidSyncTab),
                                workTabs: (remoteTabs.workTabs || []).filter(isValidSyncTab)
                            };
                            useTabStore.getState().setCloudTabs(cleanRemoteTabs);
                        }
                        if (remoteTabs && Array.isArray(remoteTabs.pinnedTabs) && remoteTabs.pinnedTabs.length > 0 && !data.pinnedTabs?.encrypted) {
                            useTabStore.getState().setPinnedTabs(remoteTabs.pinnedTabs);
                        }
                    } catch(e) {}
                }

                // Sync Pinned Apps / Tabs
                if (syncCategories?.tabs !== false && data.pinnedTabs?.encrypted) {
                    try {
                        const remotePinned = await decryptData(data.pinnedTabs.encrypted, masterPassword);
                        if (Array.isArray(remotePinned) && remotePinned.length > 0) {
                            useTabStore.getState().setPinnedTabs(remotePinned);
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

                set({ syncStatus: 'synced', authError: null });
            } finally {
                setTimeout(() => {
                    isApplyingCloudUpdate = false;
                }, 1500);
            }
        }, (err) => {
            console.warn("[Sync] Root user listener notice:", err.message);
            set({ syncStatus: 'offline', authError: null });
        });

        unsubscribeCloudListeners.push(unsubRoot);
    },

    serializeCurrentProfileSync: (profileId) => {
        try {
            const passKey = (!profileId || profileId === 'default') ? 'qbrowse_master_passphrase' : `qbrowse_master_passphrase_${profileId}`;
            const syncKey = (!profileId || profileId === 'default') ? 'qbrowse_last_sync' : `qbrowse_last_sync_${profileId}`;
            const catKey = (!profileId || profileId === 'default') ? 'qbrowse_sync_categories' : `qbrowse_sync_categories_${profileId}`;

            if (get().masterPassword) localStorage.setItem(passKey, get().masterPassword);
            if (get().lastSyncTime) localStorage.setItem(syncKey, get().lastSyncTime);
            localStorage.setItem(catKey, JSON.stringify(get().syncCategories));
        } catch (e) {
            console.error('Failed to serialize profile sync data', e);
        }
    },

    loadProfileSync: (profileId) => {
        try {
            const passKey = (!profileId || profileId === 'default') ? 'qbrowse_master_passphrase' : `qbrowse_master_passphrase_${profileId}`;
            const syncKey = (!profileId || profileId === 'default') ? 'qbrowse_last_sync' : `qbrowse_last_sync_${profileId}`;
            const catKey = (!profileId || profileId === 'default') ? 'qbrowse_sync_categories' : `qbrowse_sync_categories_${profileId}`;

            const masterPass = localStorage.getItem(passKey) || '';
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
