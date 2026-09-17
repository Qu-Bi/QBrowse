import { create } from 'zustand';
import useUIStore from './useUIStore';
import useVaultStore from './useVaultStore';
import useTabStore from './useTabStore';
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
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

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

// Global active snapshot listener unsubscribers
let unsubscribeCloudListeners = [];

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
                setTimeout(() => {
                    get().listenToCloudSync();
                    get().fetchCloudBackups();
                }, 100);
            } else {
                set({ user: null, isAuthInitialized: true, syncStatus: 'offline' });
                get().stopListening();
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
            await setDoc(rootRef, {
                [dataName]: {
                    encrypted,
                    updatedAt: nowIso
                },
                lastSync: nowIso,
                userAgent: navigator.userAgent
            }, { merge: true });

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

    syncNow: async () => {
        const { user, masterPassword, syncCategories } = get();
        if (!user) {
            useUIStore.getState().showToast("Sign in to sync your data");
            return;
        }
        if (!masterPassword) {
            useUIStore.getState().showToast("Encryption key required. Please enter your account password in profile.");
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
                await get().syncDataToCloud('settings', uiSettings);
                totalItems += Object.keys(uiSettings).length;
            }

            // 2. Sync Vault (Passwords, Passkeys & Notes)
            if (syncCategories?.vault !== false) {
                const vaultItems = useVaultStore.getState().passwords || [];
                await get().syncDataToCloud('vault', vaultItems);
                totalItems += vaultItems.length;
            }

            // 3. Sync Tabs (Personal & Work Spaces)
            if (syncCategories?.tabs !== false) {
                const tabsPayload = {
                    privateTabs: (useTabStore.getState().privateTabs || []).map(t => ({
                        id: t.id,
                        title: t.title,
                        url: t.url,
                        lastActiveAt: t.lastActiveAt
                    })),
                    workTabs: (useTabStore.getState().workTabs || []).map(t => ({
                        id: t.id,
                        title: t.title,
                        url: t.url,
                        lastActiveAt: t.lastActiveAt
                    }))
                };
                await get().syncDataToCloud('tabs', tabsPayload);
                totalItems += (tabsPayload.privateTabs.length + tabsPayload.workTabs.length);
            }

            // 4. Sync History & Bookmarks
            if (syncCategories?.history !== false) {
                const historyList = useHistoryStore.getState().history || [];
                const historyPayload = historyList.slice(0, 500);
                await get().syncDataToCloud('history', historyPayload);
                totalItems += historyPayload.length;
            }

            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            set({ isSyncing: false, syncStatus: 'synced', lastSyncTime: nowTime, syncedItemsCount: totalItems, authError: null });
            useUIStore.getState().showToast(`Cloud Sync Complete! (${totalItems} items encrypted)`);
        } catch(e) {
            console.warn("[Sync] syncNow notice:", e);
            set({ 
                isSyncing: false, 
                syncStatus: 'offline', 
                authError: null 
            });
            useUIStore.getState().showToast("Cloud sync paused. Changes saved locally.");
        }
    },

    // MANUAL BACKUP PUSH (User's specific requirement!)
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
            // 1. Gather all current browser state
            const payload = {
                version: "1.2.1",
                createdAt: new Date().toISOString(),
                label: customLabel.trim() || `Manual Backup (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                settings: useUIStore.getState().settings || {},
                vault: useVaultStore.getState().passwords || [],
                tabs: {
                    privateTabs: useTabStore.getState().privateTabs || [],
                    workTabs: useTabStore.getState().workTabs || []
                },
                history: (useHistoryStore.getState().history || []).slice(0, 500),
                pinnedTabs: useTabStore.getState().pinnedTabs || []
            };

            // 2. Encrypt entire payload with AES-GCM
            const encrypted = await encryptData(payload, masterPassword);

            const backupId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const backupRecord = {
                id: backupId,
                label: payload.label,
                createdAt: payload.createdAt,
                stats: {
                    passwords: payload.vault.length,
                    tabs: payload.tabs.privateTabs.length + payload.tabs.workTabs.length,
                    history: payload.history.length
                },
                encrypted
            };

            // 3. Save to user's root document backups array (works with standard match /users/{userId} rule)
            const rootRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(rootRef);
            let existingBackups = [];
            if (userSnap.exists() && Array.isArray(userSnap.data().manual_backups)) {
                existingBackups = userSnap.data().manual_backups;
            }
            // Keep up to 10 latest manual snapshots
            const updatedBackups = [backupRecord, ...existingBackups.filter(b => b.id !== backupId)].slice(0, 10);
            await setDoc(rootRef, { manual_backups: updatedBackups }, { merge: true });

            // 4. Also mirror to backups subcollection if permitted
            try {
                await setDoc(doc(db, 'users', user.uid, 'backups', backupId), backupRecord);
            } catch(e) {}

            set(state => ({
                isCreatingBackup: false,
                cloudBackups: updatedBackups,
                syncStatus: 'synced'
            }));

            useUIStore.getState().showToast(`Cloud Backup "${payload.label}" pushed successfully!`);
            return true;
        } catch(e) {
            console.warn("[Sync] pushManualBackup notice:", e);
            set({ 
                isCreatingBackup: false, 
                syncStatus: 'offline',
                authError: null 
            });
            useUIStore.getState().showToast("Could not upload cloud backup right now. Saved locally.");
            return false;
        }
    },

    // Fetch existing manual backups
    fetchCloudBackups: async () => {
        const { user } = get();
        if (!user) return;
        set({ isLoadingBackups: true });
        try {
            const rootRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(rootRef);
            let backups = [];
            if (userSnap.exists() && Array.isArray(userSnap.data().manual_backups)) {
                backups = userSnap.data().manual_backups;
            }

            // Also check subcollection if root was empty
            if (backups.length === 0) {
                try {
                    const subSnap = await getDocs(collection(db, 'users', user.uid, 'backups'));
                    subSnap.forEach(d => {
                        if (d.exists()) backups.push(d.data());
                    });
                } catch(e) {}
            }

            backups.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            set({ cloudBackups: backups, isLoadingBackups: false });
        } catch(e) {
            console.warn("[Sync] fetchCloudBackups error:", e);
            set({ isLoadingBackups: false });
        }
    },

    // Restore from a selected manual cloud backup
    restoreCloudBackup: async (backupItem) => {
        const { masterPassword } = get();
        if (!backupItem || !backupItem.encrypted) return false;
        if (!masterPassword) {
            useUIStore.getState().showToast("Enter encryption key to restore backup");
            return false;
        }

        try {
            const decrypted = await decryptData(backupItem.encrypted, masterPassword);
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
                useTabStore.getState().setCloudTabs(decrypted.tabs);
                if (Array.isArray(decrypted.tabs.privateTabs) && decrypted.tabs.privateTabs.length > 0) {
                    useTabStore.getState().setPrivateTabs(decrypted.tabs.privateTabs);
                }
                if (Array.isArray(decrypted.tabs.workTabs) && decrypted.tabs.workTabs.length > 0) {
                    useTabStore.getState().setWorkTabs(decrypted.tabs.workTabs);
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
        if (!user || !backupId) return;
        try {
            const nextBackups = cloudBackups.filter(b => b.id !== backupId);
            set({ cloudBackups: nextBackups });

            const rootRef = doc(db, 'users', user.uid);
            await setDoc(rootRef, { manual_backups: nextBackups }, { merge: true });

            try {
                await deleteDoc(doc(db, 'users', user.uid, 'backups', backupId));
            } catch(e) {}

            useUIStore.getState().showToast("Backup deleted from cloud");
        } catch(e) {
            console.error("[Sync] deleteCloudBackup error:", e);
        }
    },

    // Offline / Local File Backup Export
    exportLocalBackup: async () => {
        const { masterPassword } = get();
        const passToUse = masterPassword || 'qbrowse_local';
        try {
            const payload = {
                app: "QBrowse",
                version: "1.2.1",
                exportedAt: new Date().toISOString(),
                settings: useUIStore.getState().settings,
                vault: useVaultStore.getState().passwords,
                tabs: {
                    privateTabs: useTabStore.getState().privateTabs,
                    workTabs: useTabStore.getState().workTabs
                },
                history: useHistoryStore.getState().history.slice(0, 500),
                pinnedTabs: useTabStore.getState().pinnedTabs
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
                useTabStore.getState().setCloudTabs(data.tabs);
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

            // Handle manual backups update
            if (Array.isArray(data.manual_backups)) {
                set({ cloudBackups: data.manual_backups });
            }

            // Sync Settings
            if (syncCategories?.settings !== false && data.settings?.encrypted) {
                try {
                    const decrypted = await decryptData(data.settings.encrypted, masterPassword);
                    const currentSettings = useUIStore.getState().settings;
                    Object.keys(decrypted).forEach(key => {
                        if (key !== 'syncedCloudSettings' && currentSettings[key] !== decrypted[key]) {
                            useUIStore.getState().setSettingValue(key, decrypted[key]);
                        }
                    });
                } catch(e) {}
            }

            // Sync Vault
            if (syncCategories?.vault !== false && data.vault?.encrypted) {
                try {
                    const remoteVault = await decryptData(data.vault.encrypted, masterPassword);
                    if (Array.isArray(remoteVault)) {
                        useVaultStore.getState().mergeRemoteVault(remoteVault);
                    }
                } catch(e) {}
            }

            // Sync Tabs
            if (syncCategories?.tabs !== false && data.tabs?.encrypted) {
                try {
                    const remoteTabs = await decryptData(data.tabs.encrypted, masterPassword);
                    if (remoteTabs && (remoteTabs.privateTabs || remoteTabs.workTabs)) {
                        useTabStore.getState().setCloudTabs(remoteTabs);
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
        }, (err) => {
            console.warn("[Sync] Root user listener notice:", err.message);
            set({ syncStatus: 'offline', authError: null });
        });

        unsubscribeCloudListeners.push(unsubRoot);
    }
}));

// Initialize Firebase auth observer immediately
useSyncStore.getState().initAuth();

export default useSyncStore;
