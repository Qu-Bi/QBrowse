import { create } from 'zustand';
import { unlockVault, unlockVaultWindowsHello, getPasswords, addPassword, deletePassword, updatePassword } from '../services/electronIPC';

const useVaultStore = create((set, get) => ({
    isUnlocked: false,
    masterPassword: '',
    pinCode: localStorage.getItem('qbrowse_vault_pin') || '',
    passwords: [],
    isLoading: false,
    error: null,

    unlock: async (password) => {
        set({ isLoading: true, error: null });
        try {
            const unlocked = await unlockVault(password);
            if (unlocked) {
                set({ isUnlocked: true, masterPassword: password, isLoading: false });
                await get().fetchPasswords();
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
                return true;
            }
        } else {
            set({ error: 'Incorrect PIN code' });
            return false;
        }
    },

    setPin: (pin) => {
        localStorage.setItem('qbrowse_vault_pin', pin);
        set({ pinCode: pin });
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

    addNewItem: async ({ type = 'login', title, username = '', password = '', url = '', passkeyData = null, notes = '' }) => {
        const { isUnlocked, masterPassword } = get();
        if (!isUnlocked) throw new Error("Vault is locked");

        set({ isLoading: true });
        try {
            // Format item metadata inside entry
            const payload = {
                type, // 'login' | 'passkey' | 'note'
                notes,
                passkeyData: type === 'passkey' ? (passkeyData || { rpId: url, created: Date.now() }) : null
            };
            const jsonPayload = JSON.stringify(payload);
            const combinedTitle = `${title}|||${jsonPayload}`;

            await addPassword(combinedTitle, username, password, url, masterPassword);
            await get().fetchPasswords();
        } catch (err) {
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
            return res;
        } catch (err) {
            console.error('[VaultStore Debug] deleteItem error:', err);
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    updateItem: async ({ id, type = 'login', title, username = '', password = '', url = '', passkeyData = null, notes = '' }) => {
        set({ isLoading: true, error: null });
        try {
            const payload = {
                type,
                notes,
                passkeyData: type === 'passkey' ? (passkeyData || { rpId: url, created: Date.now() }) : null
            };
            const jsonPayload = JSON.stringify(payload);
            const combinedTitle = `${title}|||${jsonPayload}`;

            await updatePassword(id, combinedTitle, username, password, url);
            await get().fetchPasswords();
            set({ isLoading: false });
        } catch (err) {
            console.error("updateItem error:", err);
            set({ error: err.message, isLoading: false });
            throw err;
        }
    }
}));

export default useVaultStore;
