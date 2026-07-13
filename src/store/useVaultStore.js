import { create } from 'zustand';
import useUIStore from './useUIStore';

const useVaultStore = create((set, get) => ({
  formEmail: '',
  setFormEmail: (val) => set({ formEmail: typeof val === 'function' ? val(get().formEmail) : val }),
  
  formPassword: '',
  setFormPassword: (val) => set({ formPassword: typeof val === 'function' ? val(get().formPassword) : val }),
  
  isPrivateFolderOpen: true,
  setIsPrivateFolderOpen: (val) => set({ isPrivateFolderOpen: val }),
  
  isWorkFolderOpen: true,
  setIsWorkFolderOpen: (val) => set({ isWorkFolderOpen: val }),

  fillBitwardenMock: () => {
    useUIStore.getState().closePopover();
    const targetEmail = 'admin@qbrowse.local';
    const targetPass = 'super_secret_password_123';
    set({ formEmail: '', formPassword: '' });
    useUIStore.getState().showToast('Auto-filling from Vault...');

    let eIdx = 0;
    const emailInterval = setInterval(() => {
        set(state => ({ formEmail: targetEmail.slice(0, state.formEmail.length + 1) }));
        eIdx++;
        if (eIdx >= targetEmail.length) {
            clearInterval(emailInterval);
            let pIdx = 0;
            const passInterval = setInterval(() => {
                set(state => ({ formPassword: targetPass.slice(0, state.formPassword.length + 1) }));
                pIdx++;
                if (pIdx >= targetPass.length) clearInterval(passInterval);
            }, 30);
        }
    }, 30);
  }
}));

export default useVaultStore;
