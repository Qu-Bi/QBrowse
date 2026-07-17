import { create } from 'zustand';
import { unlockVault, getPasswords, addPassword } from '../services/electronIPC';

const useVaultStore = create((set, get) => ({
    isUnlocked: false,
    masterPassword: '',
    passwords: [],
    isLoading: false,
    error: null,

    unlock: async (password) => {
        set({ isLoading: true, error: null });
        try {
            const unlocked = await unlockVault(password);
            if (unlocked) {
                set({ isUnlocked: true, masterPassword: password });
                await get().fetchPasswords();
            } else {
                set({ error: 'Invalid master password', isLoading: false });
            }
        } catch (err) {
            set({ error: err.message, isLoading: false });
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
            set({ passwords: list, isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    addNewPassword: async (title, username, passwordPlaintext, url) => {
        const { isUnlocked, masterPassword } = get();
        if (!isUnlocked) throw new Error("Vault is locked");

        set({ isLoading: true });
        try {
            await addPassword(title, username, passwordPlaintext, url, masterPassword);
            await get().fetchPasswords();
        } catch (err) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    }
}));

export default useVaultStore;
