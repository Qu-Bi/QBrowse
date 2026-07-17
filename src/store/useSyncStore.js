import { create } from 'zustand';
import useUIStore from './useUIStore';
import { auth, db } from '../services/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInAnonymously,
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const useSyncStore = create((set, get) => ({
    user: null,
    isAuthInitialized: false,
    authError: null,
    isSyncing: false,
    lastSyncTime: null,
    userStats: { tabsOpened: 0, trackersBlocked: 0, memorySaved: 0 },

    initAuth: () => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                set({ user, isAuthInitialized: true });
                get().listenToCloudSync();
                get().fetchStats();
            } else {
                // Auto-login anonymously to ensure we have a UID for stats
                signInAnonymously(auth).catch(console.error);
            }
        });
    },

    signUp: async (email, password) => {
        set({ authError: null, isSyncing: true });
        try {
            // Mock successful sign up for now
            setTimeout(() => {
                set({ isSyncing: false, user: { uid: 'mock-user-id', email } });
                useUIStore.getState().showToast("Mock Sync Enabled");
            }, 1000);
            return true;
        } catch (error) {
            set({ authError: error.message, isSyncing: false });
            return false;
        }
    },

    signIn: async (email, password) => {
        set({ authError: null, isSyncing: true });
        try {
            // Mock successful sign in
            setTimeout(() => {
                set({ isSyncing: false, user: { uid: 'mock-user-id', email } });
                useUIStore.getState().showToast("Mock Sync Enabled");
            }, 1000);
            return true;
        } catch (error) {
            set({ authError: error.message, isSyncing: false });
            return false;
        }
    },

    logout: async () => {
        await signOut(auth);
        set({ user: null, lastSyncTime: null });
    },

    syncDataToCloud: async (dataName, dataPayload) => {
        const { user } = get();
        if (!user) return;
        
        set({ isSyncing: true });
        try {
            await setDoc(doc(db, `users/${user.uid}/sync`, dataName), {
                payload: dataPayload,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            set({ isSyncing: false, lastSyncTime: new Date().toISOString() });
        } catch (error) {
            console.error('Failed to sync to cloud:', error);
            set({ isSyncing: false });
        }
    },

    listenToCloudSync: () => {
        const { user } = get();
        if (!user) return;

        onSnapshot(doc(db, `users/${user.uid}/sync`, 'vault'), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                // We would decrypt and update local vault here.
                console.log('Cloud Vault updated natively', data);
            }
        });
    },

    fetchStats: () => {
        const { user } = get();
        if (!user) return;
        onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                if (data.stats) {
                    set({ userStats: data.stats });
                }
            }
        });
    }
}));

// Initialize Firebase auth observer immediately
useSyncStore.getState().initAuth();

export default useSyncStore;
