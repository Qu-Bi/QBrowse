import { create } from 'zustand';
import useUIStore from './useUIStore';

const DEFAULT_PROFILE_ID = 'default';

export const AVATAR_MAP = {
    rocket: '🚀',
    zap: '⚡',
    fox: '🦊',
    alien: '👾',
    galaxy: '🌌',
    gem: '💎',
    dragon: '🐉',
    crown: '👑',
    shield: '🛡️',
    dna: '🧬',
    coffee: '☕',
    target: '🎯'
};

export const getAvatarEmoji = (avatarOrPreset) => {
    if (!avatarOrPreset) return '🚀';
    return AVATAR_MAP[avatarOrPreset] || avatarOrPreset;
};

const loadInitialProfiles = () => {
    try {
        const stored = localStorage.getItem('qbrowse_profiles');
        if (stored) {
            let parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                let modified = false;
                parsed = parsed.map(p => {
                    const newAvatar = getAvatarEmoji(p.avatar);
                    let newColor = p.color;
                    if (p.id === DEFAULT_PROFILE_ID && (!p.color || p.color === '#06b6d4' || p.color === '#3b82f6')) {
                        newColor = '#d4bc94';
                    }
                    if (newAvatar !== p.avatar || newColor !== p.color) {
                        modified = true;
                        return { ...p, avatar: newAvatar, color: newColor };
                    }
                    return p;
                });
                if (modified) {
                    localStorage.setItem('qbrowse_profiles', JSON.stringify(parsed));
                }
                return parsed;
            }
        }
    } catch (e) {}

    // Initial Migration: Preserve existing user data as the default profile
    const existingName = localStorage.getItem('qbrowse_profile_username') || 'Personal';
    let existingAvatar = localStorage.getItem('qbrowse_profile_avatar_preset') || 'rocket';
    existingAvatar = getAvatarEmoji(existingAvatar);
    const existingAvatarUrl = localStorage.getItem('qbrowse_profile_avatar_url') || '';
    const existingColor = '#d4bc94'; // Nice sandy yellow signature color

    const defaultProfile = {
        id: DEFAULT_PROFILE_ID,
        name: existingName,
        avatar: existingAvatar,
        avatarUrl: existingAvatarUrl,
        color: existingColor,
        isDefault: true,
        createdAt: Date.now()
    };

    localStorage.setItem('qbrowse_profiles', JSON.stringify([defaultProfile]));
    return [defaultProfile];
};

const useProfileStore = create((set, get) => ({
    profiles: loadInitialProfiles(),
    activeProfileId: localStorage.getItem('qbrowse_active_profile_id') || DEFAULT_PROFILE_ID,

    getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        return profiles.find(p => p.id === activeProfileId) || profiles[0] || null;
    },

    createProfile: ({ name, avatar = '🚀', color = '#d4bc94', avatarUrl = '' }) => {
        const id = `p_${Date.now()}`;
        const newProfile = {
            id,
            name: (name || 'New Profile').trim(),
            avatar: getAvatarEmoji(avatar),
            avatarUrl,
            color,
            isDefault: false,
            createdAt: Date.now()
        };

        set(state => {
            const next = [...state.profiles, newProfile];
            localStorage.setItem('qbrowse_profiles', JSON.stringify(next));
            return { profiles: next };
        });

        useUIStore.getState().showToast(`Profile "${newProfile.name}" created!`);
        return newProfile;
    },

    updateProfile: (id, updates) => {
        set(state => {
            const next = state.profiles.map(p => {
                if (p.id === id) {
                    const updated = { ...p, ...updates };
                    // If updating active profile, sync accent color
                    if (id === state.activeProfileId && updates.color) {
                        useUIStore.getState().setAccentColor(updates.color);
                    }
                    return updated;
                }
                return p;
            });
            localStorage.setItem('qbrowse_profiles', JSON.stringify(next));
            return { profiles: next };
        });
        useUIStore.getState().showToast('Profile updated');
    },

    deleteProfile: async (id) => {
        const { profiles, activeProfileId, switchProfile } = get();
        if (profiles.length <= 1) {
            useUIStore.getState().showToast('Cannot delete the only remaining profile');
            return false;
        }

        const target = profiles.find(p => p.id === id);
        if (!target) return false;

        // If deleting active profile, switch to first remaining profile first
        if (id === activeProfileId) {
            const fallback = profiles.find(p => p.id !== id);
            if (fallback) {
                await switchProfile(fallback.id);
            }
        }

        set(state => {
            const next = state.profiles.filter(p => p.id !== id);
            localStorage.setItem('qbrowse_profiles', JSON.stringify(next));
            return { profiles: next };
        });

        // Clean up storage keys for this profile
        try {
            localStorage.removeItem(`qbrowse_tabs_${id}_personal`);
            localStorage.removeItem(`qbrowse_tabs_${id}_work`);
            localStorage.removeItem(`qbrowse_tabs_${id}_ghost`);
            localStorage.removeItem(`qbrowse_history_${id}`);
            localStorage.removeItem(`qbrowse_vault_${id}`);
            localStorage.removeItem(`qbrowse_auth_${id}`);
            localStorage.removeItem(`qbrowse_master_passphrase_${id}`);
            localStorage.removeItem(`qbrowse_sync_categories_${id}`);
        } catch (e) {}

        useUIStore.getState().showToast(`Deleted profile "${target.name}"`);
        return true;
    },

    switchProfile: async (targetId) => {
        const { activeProfileId, profiles } = get();
        if (targetId === activeProfileId) return;

        const target = profiles.find(p => p.id === targetId);
        if (!target) return;

        const uiStore = useUIStore.getState();

        // 1. Serialize and save current profile state
        try {
            const tabStore = window.__tabStore?.getState();
            if (tabStore?.serializeCurrentProfileTabs) {
                tabStore.serializeCurrentProfileTabs(activeProfileId);
            }
            const historyStore = window.__historyStore?.getState();
            if (historyStore?.serializeCurrentProfileHistory) {
                historyStore.serializeCurrentProfileHistory(activeProfileId);
            }
            const vaultStore = window.__vaultStore?.getState();
            if (vaultStore?.serializeCurrentProfileVault) {
                vaultStore.serializeCurrentProfileVault(activeProfileId);
            }
            const syncStore = window.__syncStore?.getState();
            if (syncStore?.serializeCurrentProfileSync) {
                syncStore.serializeCurrentProfileSync(activeProfileId);
            }
        } catch (e) {
            console.warn('[ProfileStore] Error saving current profile state:', e);
        }

        // 2. Set new active profile ID
        set({ activeProfileId: targetId });
        localStorage.setItem('qbrowse_active_profile_id', targetId);

        // 3. Apply profile theme color
        if (target.color) {
            uiStore.setAccentColor(target.color);
        }

        // 4. Hydrate target profile data across stores
        try {
            const tabStore = window.__tabStore?.getState();
            if (tabStore?.loadProfileTabs) {
                tabStore.loadProfileTabs(targetId);
            }
            const historyStore = window.__historyStore?.getState();
            if (historyStore?.loadProfileHistory) {
                historyStore.loadProfileHistory(targetId);
            }
            const vaultStore = window.__vaultStore?.getState();
            if (vaultStore?.loadProfileVault) {
                vaultStore.loadProfileVault(targetId);
            }
            const syncStore = window.__syncStore?.getState();
            if (syncStore?.loadProfileSync) {
                syncStore.loadProfileSync(targetId);
            }
        } catch (e) {
            console.warn('[ProfileStore] Error loading new profile state:', e);
        }

        uiStore.showToast(`Switched to profile: ${target.name}`);
    }
}));

// Expose globally for cross-store references
if (typeof window !== 'undefined') {
    window.__profileStore = useProfileStore;
    try {
        const initialActive = useProfileStore.getState().getActiveProfile();
        if (initialActive && initialActive.color) {
            useUIStore.getState().setAccentColor(initialActive.color);
        }
    } catch (e) {}
}

export default useProfileStore;
