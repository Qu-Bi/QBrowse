import { create } from 'zustand';
import useUIStore from './useUIStore';
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
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// Web Crypto API Encryption Helpers (AES-GCM 256-bit)
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
        console.error("Encryption error:", e);
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
        console.error("Decryption error:", e);
        throw new Error("Invalid Master Password or corrupted cloud data");
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

const useSyncStore = create((set, get) => ({
    user: null,
    masterPassword: localStorage.getItem('qbrowse_master_passphrase') || '',
    isAuthInitialized: false,
    authError: null,
    isSyncing: false,
    lastSyncTime: localStorage.getItem('qbrowse_last_sync') || null,
    syncedItemsCount: 0,
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
        onAuthStateChanged(auth, (user) => {
            if (user) {
                set({ user, isAuthInitialized: true });
                useUIStore.getState().setSetupComplete(true);
                get().listenToCloudSync();
            } else {
                set({ user: null, isAuthInitialized: true });
            }
        });
    },

    signUp: async (email, password, masterPass) => {
        set({ authError: null, isSyncing: true });
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const passToUse = masterPass || password;
            get().setMasterPassword(passToUse);
            set({ isSyncing: false, user: userCred.user });
            useUIStore.getState().setSetupComplete(true);
            useUIStore.getState().showToast("Account Created & Firebase Sync Active!");
            return true;
        } catch (error) {
            const formatted = formatAuthError(error);
            set({ authError: formatted, isSyncing: false });
            return false;
        }
    },

    signIn: async (email, password, masterPass) => {
        set({ authError: null, isSyncing: true });
        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            const passToUse = masterPass || password;
            get().setMasterPassword(passToUse);
            set({ isSyncing: false, user: userCred.user });
            useUIStore.getState().setSetupComplete(true);
            useUIStore.getState().showToast("Signed In to QBrowse Cloud Sync");
            return true;
        } catch (error) {
            const formatted = formatAuthError(error);
            set({ authError: formatted, isSyncing: false });
            return false;
        }
    },

    logout: async () => {
        await signOut(auth);
        set({ user: null, lastSyncTime: null, syncedItemsCount: 0 });
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

    syncDataToCloud: async (dataName, dataPayload) => {
        const { user, masterPassword, syncCategories } = get();
        if (!user) return;
        if (syncCategories && syncCategories[dataName] === false) {
            return;
        }
        if (!masterPassword) {
            console.warn('Cannot sync to cloud: Master Password not set');
            return;
        }
        
        set({ isSyncing: true });
        try {
            const encrypted = await encryptData(dataPayload, masterPassword);
            await setDoc(doc(db, `users/${user.uid}/sync`, dataName), {
                encrypted,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            const now = new Date().toLocaleTimeString();
            localStorage.setItem('qbrowse_last_sync', now);
            set({ isSyncing: false, lastSyncTime: now });
        } catch (error) {
            console.error('Failed to sync to cloud:', error);
            set({ isSyncing: false, authError: error.message });
        }
    },

    syncNow: async () => {
        const { user } = get();
        if (!user) {
            useUIStore.getState().showToast("Sign in to sync your data");
            return;
        }
        set({ isSyncing: true });
        try {
            const uiSettings = useUIStore.getState().settings;
            await get().syncDataToCloud('settings', uiSettings);
            const now = new Date().toLocaleTimeString();
            set({ isSyncing: false, lastSyncTime: now, syncedItemsCount: Object.keys(uiSettings).length });
            useUIStore.getState().showToast("Cloud Sync Complete!");
        } catch(e) {
            set({ isSyncing: false });
            useUIStore.getState().showToast("Sync failed: Check Master Password");
        }
    },

    listenToCloudSync: () => {
        const { user, masterPassword } = get();
        if (!user || !masterPassword) return;

        onSnapshot(doc(db, `users/${user.uid}/sync`, 'settings'), async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                if (data.encrypted) {
                    try {
                        const decryptedSettings = await decryptData(data.encrypted, masterPassword);
                        useUIStore.getState().setSettingValue('syncedCloudSettings', decryptedSettings);
                        set({ syncedItemsCount: Object.keys(decryptedSettings).length });
                    } catch(e) {
                        console.warn("Could not decrypt remote cloud settings with active Master Password");
                    }
                }
            }
        }, (err) => {
            console.warn("Firestore sync listener error (Permission Denied?):", err.message);
        });
    }
}));

// Initialize Firebase auth observer immediately
useSyncStore.getState().initAuth();

export default useSyncStore;
