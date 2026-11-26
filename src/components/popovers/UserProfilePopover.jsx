import React, { useState, useMemo, useEffect } from 'react';
import { 
    User, ShieldCheck, RefreshCw, LogOut, Key, 
    Check, Camera, Edit3, Globe, Image as ImageIcon,
    Lock, ArrowRight, Sliders, Palette, Layers, History, Puzzle, 
    Cloud, UploadCloud, DownloadCloud, Trash2, Download, Upload,
    ChevronDown, ChevronUp, Plus, ExternalLink,
    Laptop, Monitor, Fingerprint, AlertCircle,
    Rocket, Zap, Sparkles, Terminal, Compass, Gem, Flame, Crown, Shield, Activity
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useSyncStore from '../../store/useSyncStore';
import useTabStore, { isValidSyncTab, getCleanTabTitle } from '../../store/useTabStore';
import useVaultStore from '../../store/useVaultStore';
import { isLinuxPlatform } from '../../utils/platform';
import useHistoryStore from '../../store/useHistoryStore';
import useExtensionStore from '../../store/useExtensionStore';
import useProfileStore from '../../store/useProfileStore';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses, getLiquidGlassCardClasses } from '../common/ContextMenuProvider';
import { useTranslation } from '../../i18n/index';
import { getSafeFaviconUrl } from '../../utils/networkPrivacy';

export const AVATAR_PRESETS = [
    { id: 'rocket', icon: Rocket, name: 'Rocket', nameKey: 'pop.profile.avatarRocket' },
    { id: 'zap', icon: Zap, name: 'Energy', nameKey: 'pop.profile.avatarEnergy' },
    { id: 'fox', icon: Sparkles, name: 'Cyber Fox', nameKey: 'pop.profile.avatarCyberFox' },
    { id: 'alien', icon: Terminal, name: 'Pixel', nameKey: 'pop.profile.avatarPixel' },
    { id: 'galaxy', icon: Compass, name: 'Cosmos', nameKey: 'pop.profile.avatarCosmos' },
    { id: 'gem', icon: Gem, name: 'Diamond', nameKey: 'pop.profile.avatarDiamond' },
    { id: 'dragon', icon: Flame, name: 'Dragon', nameKey: 'pop.profile.avatarDragon' },
    { id: 'crown', icon: Crown, name: 'Royal', nameKey: 'pop.profile.avatarRoyal' },
    { id: 'shield', icon: Shield, name: 'Guardian', nameKey: 'pop.profile.avatarGuardian' },
    { id: 'dna', icon: Activity, name: 'Genesis', nameKey: 'pop.profile.avatarGenesis' }
];

export const AVATAR_ICON_MAP = {
    rocket: Rocket,
    zap: Zap,
    fox: Sparkles,
    alien: Terminal,
    galaxy: Compass,
    gem: Gem,
    dragon: Flame,
    crown: Crown,
    shield: Shield,
    dna: Activity
};

export function renderProfileAvatar(avatar, size = 13, className = "") {
    const key = (avatar || 'rocket').toLowerCase();
    const Icon = AVATAR_ICON_MAP[key] || Rocket;
    return <Icon size={size} className={className} />;
}

const PROFILE_COLORS = [
    '#d4bc94', '#60a5fa', '#34d399', '#f472b6', 
    '#a78bfa', '#fbbf24', '#f87171', '#38bdf8'
];

function formatTimeAgo(ts, t) {
    const tr = t || ((_, __, fb) => fb);
    if (!ts) return tr('pop.profile.justNow', null, 'Just now');
    const num = Number(ts);
    if (isNaN(num) || num <= 0) return tr('pop.profile.justNow', null, 'Just now');
    const diff = Math.floor((Date.now() - num) / 1000);
    if (diff < 30) return tr('pop.profile.justNow', null, 'Just now');
    if (diff < 60) return tr('pop.profile.secondsAgo', { n: diff }, '{n}s ago');
    const mins = Math.floor(diff / 60);
    if (mins < 60) return tr('pop.profile.minutesAgo', { n: mins }, '{n}m ago');
    const hours = Math.floor(mins / 60);
    if (hours < 24) return tr('pop.profile.hoursAgo', { n: hours }, '{n}h ago');
    const days = Math.floor(hours / 24);
    return tr('pop.profile.daysAgo', { n: days }, '{n}d ago');
}

export default function UserProfilePopover({ isClosing }) {
    const settings = useUIStore(state => state.settings);
    const { t, intlLocale } = useTranslation();
    const { closePopover, openModal, showToast, theme } = useUIStore();
    const sidebarPosition = useUIStore(state => state.settings?.sidebarPosition || 'left');
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const { 
        user, isSyncing, syncStatus, lastSyncTime, syncNow, logout, 
        masterPassword, setMasterPassword, changePassword,
        syncCategories, toggleSyncCategory,
        cloudBackups, isLoadingBackups, isCreatingBackup,
        pushManualBackup, restoreCloudBackup, deleteCloudBackup,
        exportLocalBackup, importLocalBackup,
        autoSyncEnabled, toggleAutoSync,
        isRestoringBackup, restoringBackupId
    } = useSyncStore();

    const { 
        profiles, activeProfileId, switchProfile, 
        createProfile, updateProfile, deleteProfile 
    } = useProfileStore();

    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

    const cloudTabs = useTabStore(state => state.cloudTabs);
    const openCloudTab = useTabStore(state => state.openCloudTab);
    const restoreAllCloudTabs = useTabStore(state => state.restoreAllCloudTabs);

    const remoteDeviceTabs = useSyncStore(state => state.remoteDeviceTabs) || [];
    const refreshCloudTabs = useSyncStore(state => state.refreshCloudTabs);
    const [isRefreshingTabs, setIsRefreshingTabs] = useState(false);

    const isVaultInitialized = useVaultStore(state => state.isInitialized);
    const isVaultUnlocked = useVaultStore(state => state.isUnlocked);
    const pinEnabled = useVaultStore(state => state.pinEnabled);
    const biometricsEnabled = useVaultStore(state => state.biometricsEnabled);
    const supportsBiometrics = !isLinuxPlatform();
    const unlockWithPin = useVaultStore(state => state.unlockWithPin);
    const unlockWithWindowsHello = useVaultStore(state => state.unlockWithWindowsHello);
    const unlockVault = useVaultStore(state => state.unlock);
    const vaultItemCount = useVaultStore(state => state.vaultItemCount);
    const passwordsList = useVaultStore(state => state.passwords);
    const syncVaultStatus = useVaultStore(state => state.syncVaultStatus);
    const vaultCount = isVaultUnlocked ? (passwordsList?.length ?? vaultItemCount ?? 0) : (vaultItemCount || 0);
    const pinnedCount = useTabStore(state => state.pinnedTabs?.length || 0);
    const historyCount = useHistoryStore(state => state.history?.length || 0);
    const extensionsList = useExtensionStore(state => state.extensions);
    const extensionsCount = useMemo(
        () => (extensionsList || []).filter((ext) => ext && (ext.source === 'cws' || /^[a-p]{32}$/i.test(String(ext.id || '')))).length,
        [extensionsList]
    );

    useEffect(() => {
        syncVaultStatus?.();
    }, [syncVaultStatus]);

    // Active Category Navigation: 'sync' | 'tabs' | 'backups' | 'profile'
    const [activeCategory, setActiveCategory] = useState('sync');
    const [hoveredCategory, setHoveredCategory] = useState(null);

    // Profile state
    const [username, setUsername] = useState(() => localStorage.getItem('qbrowse_profile_username') || activeProfile?.name || (user ? user.email.split('@')[0] : t('pop.profile.defaultExplorer', null, 'Zen Explorer')));
    const [statusQuote, setStatusQuote] = useState(() => localStorage.getItem('qbrowse_profile_status') || t('pop.profile.defaultQuote', null, 'Exploring the Zen web'));
    const [avatarPreset, setAvatarPreset] = useState(() => localStorage.getItem('qbrowse_profile_avatar_preset') || 'rocket');
    const [customAvatarUrl, setCustomAvatarUrl] = useState(() => localStorage.getItem('qbrowse_profile_avatar_url') || '');
    
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [isClosingAddProfile, setIsClosingAddProfile] = useState(false);

    const handleCloseAddProfile = () => {
        setIsClosingAddProfile(true);
        setTimeout(() => {
            setShowAddProfile(false);
            setIsClosingAddProfile(false);
        }, 180);
    };
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileAvatar, setNewProfileAvatar] = useState('rocket');
    const [newProfileColor, setNewProfileColor] = useState('#d4bc94');

    const [isEditing, setIsEditing] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showSecuritySection, setShowSecuritySection] = useState(false);

    // Manual Backup Input state & inline QVault unlock states
    const [backupLabel, setBackupLabel] = useState('');
    const [showPushBackupForm, setShowPushBackupForm] = useState(false);
    const [isClosingPushBackup, setIsClosingPushBackup] = useState(false);
    const [snapshotPin, setSnapshotPin] = useState('');
    const [snapshotUnlockError, setSnapshotUnlockError] = useState('');
    const [isUnlockingForSnapshot, setIsUnlockingForSnapshot] = useState(false);

    const [pendingRestoreSnapshotId, setPendingRestoreSnapshotId] = useState(null);
    const [restorePin, setRestorePin] = useState('');
    const [restoreUnlockError, setRestoreUnlockError] = useState('');
    const [isUnlockingForRestore, setIsUnlockingForRestore] = useState(false);

    const [vaultUnlockMode, setVaultUnlockMode] = useState(() => (pinEnabled ? 'pin' : 'password'));
    const [hoveredVaultUnlockMode, setHoveredVaultUnlockMode] = useState(null);

    useEffect(() => {
        setVaultUnlockMode(pinEnabled ? 'pin' : 'password');
    }, [pinEnabled]);

    const handleClosePushBackup = () => {
        setIsClosingPushBackup(true);
        setTimeout(() => {
            setShowPushBackupForm(false);
            setIsClosingPushBackup(false);
            setSnapshotPin('');
            setSnapshotUnlockError('');
        }, 180);
    };

    // Security Password Change State
    const [currPass, setCurrPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [passMsg, setPassMsg] = useState(null);
    const [isChangingPass, setIsChangingPass] = useState(false);
    const [showPassText, setShowPassText] = useState(false);

    const handleSwitchProfile = async (targetId) => {
        if (targetId === activeProfileId) return;
        await switchProfile(targetId);
        const target = profiles.find(p => p.id === targetId);
        if (target) {
            setUsername(target.name);
            showToast(t('pop.profile.switchedProfile', { name: target.name }, 'Switched to profile: {name}'));
        }
    };

    const handleCreateProfile = async (e) => {
        e.preventDefault();
        if (!newProfileName.trim()) return;
        const prof = createProfile({
            name: newProfileName.trim(),
            avatar: newProfileAvatar,
            color: newProfileColor
        });
        setNewProfileName('');
        setShowAddProfile(false);
        showToast(t('pop.profile.createdProfile', { name: prof.name }, 'Created profile "{name}"'));
        await handleSwitchProfile(prof.id);
    };

    const handleOpenInNewWindow = (targetId) => {
        if (window.electronAPI && window.electronAPI.openNewWindow) {
            window.electronAPI.openNewWindow({ profileId: targetId });
            showToast(t('pop.profile.openedNewWindow', null, 'Opened profile in new window'));
        }
    };

    const handleDeleteProfile = (id, name) => {
        useUIStore.getState().setActiveDialog({
            type: 'confirm',
            hostname: t('pop.profile.profilesDialogTitle', null, 'QBrowse Profiles'),
            message: t('pop.profile.deleteProfileConfirm', { name }, 'Are you sure you want to delete profile "{name}"? All associated local data will be removed.'),
            onConfirm: () => {
                deleteProfile(id);
                showToast(t('pop.profile.profileDeleted', { name }, 'Profile "{name}" deleted'));
            },
            onCancel: () => {}
        });
    };

    const handleSaveProfile = () => {
        localStorage.setItem('qbrowse_profile_username', username);
        localStorage.setItem('qbrowse_profile_status', statusQuote);
        localStorage.setItem('qbrowse_profile_avatar_preset', avatarPreset);
        localStorage.setItem('qbrowse_profile_avatar_url', customAvatarUrl);
        
        if (activeProfile) {
            updateProfile(activeProfile.id, { name: username });
        }

        setIsEditing(false);
        setShowAvatarPicker(false);
        showToast(t('pop.profile.profileUpdated', null, 'Profile updated!'));
        
        useSyncStore.getState().syncDataToCloud('profile', {
            username,
            statusQuote,
            avatarPreset,
            customAvatarUrl,
            updatedAt: new Date().toISOString()
        }).catch(() => {});
    };

    const verifyAndUnlockVault = async (secretInput) => {
        const effectiveMode = pinEnabled ? vaultUnlockMode : 'password';
        const trimmed = (secretInput || '').trim();
        if (!trimmed) {
            return {
                ok: false,
                error: effectiveMode === 'pin'
                    ? t('pop.profile.enterVaultPinErr', null, 'Please enter your QVault PIN.')
                    : t('pop.profile.enterVaultMasterErr', null, 'Please enter your QVault Master Password.')
            };
        }
        const res = effectiveMode === 'pin' ? await unlockWithPin(trimmed) : await unlockVault(trimmed);
        const unlockedOk = res === true || res?.success === true;
        if (!unlockedOk) {
            return {
                ok: false,
                error: res?.error || useVaultStore.getState().error || (effectiveMode === 'pin'
                    ? t('pop.profile.invalidVaultPin', null, 'Invalid QVault PIN')
                    : t('pop.profile.invalidMasterPass', null, 'Invalid Master Password'))
            };
        }
        return { ok: true, error: '' };
    };

    const handleBiometricSnapshotUnlock = async () => {
        setSnapshotUnlockError('');
        setIsUnlockingForSnapshot(true);
        try {
            const res = await unlockWithWindowsHello();
            const unlockedOk = res === true || res?.success === true;
            if (!unlockedOk) {
                const bioPlatform = (typeof window !== 'undefined' && window.electronAPI?.platform) || 'win32';
                const bioLabel = bioPlatform === 'darwin' ? 'Touch ID' : bioPlatform === 'linux' ? t('pop.vault.systemBiometrics', null, 'System Biometrics') : 'Windows Hello';
                setSnapshotUnlockError(res?.error || useVaultStore.getState().error || t('pop.profile.biometricUnlockFailed', { label: bioLabel }, '{label} unlock failed'));
            } else {
                setSnapshotPin('');
            }
        } finally {
            setIsUnlockingForSnapshot(false);
        }
    };

    const handlePushBackup = async (e) => {
        e.preventDefault();
        setSnapshotUnlockError('');
        const vaultNow = useVaultStore.getState();
        if (vaultNow.isInitialized && !vaultNow.isUnlocked) {
            setIsUnlockingForSnapshot(true);
            try {
                const check = await verifyAndUnlockVault(snapshotPin);
                if (!check.ok) {
                    setSnapshotUnlockError(check.error);
                    return;
                }
            } finally {
                setIsUnlockingForSnapshot(false);
            }
        }
        try {
            const success = await pushManualBackup(backupLabel);
            if (success) {
                setBackupLabel('');
                setSnapshotPin('');
                setSnapshotUnlockError('');
                setShowPushBackupForm(false);
            }
        } catch (err) {
            setSnapshotUnlockError(err?.message || t('pop.profile.snapshotCreateFailed', null, 'Failed to create cloud snapshot.'));
        }
    };

    const handleSnapshotRestoreClick = async (bk) => {
        const vaultNow = useVaultStore.getState();
        if (vaultNow.isInitialized && !vaultNow.isUnlocked) {
            setPendingRestoreSnapshotId(bk.id || bk.createdAt);
            setRestorePin('');
            setRestoreUnlockError('');
            return;
        }
        await restoreCloudBackup(bk);
    };

    const handleConfirmRestoreWithUnlock = async (e, bk) => {
        e.preventDefault();
        setRestoreUnlockError('');
        const vaultNow = useVaultStore.getState();
        if (vaultNow.isInitialized && !vaultNow.isUnlocked) {
            setIsUnlockingForRestore(true);
            try {
                const check = await verifyAndUnlockVault(restorePin);
                if (!check.ok) {
                    setRestoreUnlockError(check.error);
                    return;
                }
            } finally {
                setIsUnlockingForRestore(false);
            }
        }
        setPendingRestoreSnapshotId(null);
        setRestorePin('');
        setRestoreUnlockError('');
        await restoreCloudBackup(bk);
    };

    const handleBiometricRestoreUnlock = async (bk) => {
        setRestoreUnlockError('');
        setIsUnlockingForRestore(true);
        try {
            const res = await unlockWithWindowsHello();
            const unlockedOk = res === true || res?.success === true;
            if (!unlockedOk) {
                const bioPlatform = (typeof window !== 'undefined' && window.electronAPI?.platform) || 'win32';
                const bioLabel = bioPlatform === 'darwin' ? 'Touch ID' : bioPlatform === 'linux' ? t('pop.vault.systemBiometrics', null, 'System Biometrics') : 'Windows Hello';
                setRestoreUnlockError(res?.error || useVaultStore.getState().error || t('pop.profile.biometricUnlockFailed', { label: bioLabel }, '{label} unlock failed'));
                return;
            }
            setPendingRestoreSnapshotId(null);
            setRestorePin('');
            setRestoreUnlockError('');
            await restoreCloudBackup(bk);
        } finally {
            setIsUnlockingForRestore(false);
        }
    };

    const renderInlineVaultUnlockFields = ({ title, value, onChange, errorMsg, onBiometricClick, isBusy }) => {
        const effectiveMode = pinEnabled ? vaultUnlockMode : 'password';
        const bioPlatform = (typeof window !== 'undefined' && window.electronAPI?.platform) || 'win32';
        const bioShortLabel = bioPlatform === 'darwin' ? 'Touch ID' : bioPlatform === 'linux' ? t('pop.profile.bioShort', null, 'Bio') : t('pop.profile.helloShort', null, 'Hello');
        const inputClasses = isBright
            ? 'bg-white border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent shadow-xs'
            : 'bg-black/20 border-white/10 text-white placeholder-white/40 focus:border-accent/50';

        return (
            <div className={`p-3 rounded-2xl border space-y-2.5 ${
                isBright
                    ? 'bg-black/[0.025] border-black/[0.06] text-zinc-900'
                    : 'bg-white/[0.03] border-white/[0.08] text-white'
            }`}>
                <div className="flex items-center gap-2">
                    <Shield size={13} className="text-accent shrink-0" />
                    <span className={`text-[11px] font-semibold ${isBright ? 'text-zinc-800' : 'text-white/90'}`}>
                        {title}
                    </span>
                </div>

                {pinEnabled && (
                    <div
                        onMouseLeave={() => setHoveredVaultUnlockMode(null)}
                        className={`relative grid grid-cols-2 p-0.5 rounded-full border shadow-xs transition-colors duration-200 select-none ${
                            isBright ? 'bg-black/[0.03] border-black/[0.05]' : 'bg-black/25 border-white/[0.08]'
                        }`}
                    >
                        {hoveredVaultUnlockMode && hoveredVaultUnlockMode !== vaultUnlockMode && (
                            <div
                                className={`absolute top-0.5 bottom-0.5 rounded-full pointer-events-none ${
                                    isBright ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
                                }`}
                                style={{
                                    left: '2px',
                                    width: 'calc((100% - 4px) / 2)',
                                    transform: `translateX(${hoveredVaultUnlockMode === 'password' ? 100 : 0}%)`,
                                    transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
                                }}
                            />
                        )}
                        <div
                            className={`absolute top-0.5 bottom-0.5 rounded-full pointer-events-none ${
                                isBright
                                    ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                    : 'bg-white/[0.12] border border-white/20 shadow-xs'
                            }`}
                            style={{
                                left: '2px',
                                width: 'calc((100% - 4px) / 2)',
                                transform: `translateX(${vaultUnlockMode === 'password' ? 100 : 0}%)`,
                                transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'
                            }}
                        />
                        <button
                            type="button"
                            onMouseEnter={() => setHoveredVaultUnlockMode('pin')}
                            onClick={() => {
                                setVaultUnlockMode('pin');
                                onChange('');
                            }}
                            className={`relative z-10 py-1 text-center text-[10px] font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer ${
                                vaultUnlockMode === 'pin'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/70 hover:text-white')
                            }`}
                        >
                            {t('pop.vault.quickPin', null, 'Quick PIN')}
                        </button>
                        <button
                            type="button"
                            onMouseEnter={() => setHoveredVaultUnlockMode('password')}
                            onClick={() => {
                                setVaultUnlockMode('password');
                                onChange('');
                            }}
                            className={`relative z-10 py-1 text-center text-[10px] font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer ${
                                vaultUnlockMode === 'password'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/70 hover:text-white')
                            }`}
                        >
                            {t('pop.vault.masterPassword', null, 'Master Password')}
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-1.5">
                    {effectiveMode === 'pin' ? (
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            disabled={isBusy}
                            placeholder="••••"
                            className={`flex-1 min-w-0 h-9 rounded-full px-4 text-center text-sm font-mono tracking-[0.45em] outline-none transition-all border disabled:opacity-50 ${inputClasses}`}
                        />
                    ) : (
                        <input
                            type="password"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            disabled={isBusy}
                            placeholder={t('pop.vault.enterMasterPlaceholder', null, 'Enter master password...')}
                            className={`flex-1 min-w-0 h-9 rounded-full px-3.5 text-xs font-mono outline-none transition-all border disabled:opacity-50 ${inputClasses}`}
                        />
                    )}
                    {supportsBiometrics && biometricsEnabled && (
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={onBiometricClick}
                            title={t('pop.profile.unlockWith', { method: bioShortLabel }, 'Unlock with {method}')}
                            className={`h-9 px-3 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0 active:scale-95 ${
                                isBright
                                    ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-800 shadow-xs'
                                    : 'bg-white/[0.08] hover:bg-white/[0.12] border-white/10 text-white'
                            }`}
                        >
                            <Fingerprint size={13} className="text-accent" />
                            <span>{bioShortLabel}</span>
                        </button>
                    )}
                </div>

                {errorMsg && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl font-mono font-medium">
                        <AlertCircle size={11} className="shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}
            </div>
        );
    };

    const handleChangeAccountPassword = async (e) => {
        e.preventDefault();
        if (!currPass || !newPass) return;
        setIsChangingPass(true);
        setPassMsg(null);
        try {
            const res = await changePassword(currPass, newPass);
            if (res && res.success === false) {
                setPassMsg({ type: 'error', text: res.error || t('pop.profile.passwordUpdateFailed', null, 'Failed to update password') });
            } else {
                setCurrPass('');
                setNewPass('');
                setPassMsg({ type: 'success', text: t('pop.profile.passwordUpdated', null, 'Account password updated successfully!') });
            }
        } catch(err) {
            setPassMsg({ type: 'error', text: err.message });
        } finally {
            setIsChangingPass(false);
        }
    };

    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const content = evt.target.result;
            await importLocalBackup(content);
        };
        reader.readAsText(file);
    };

    // Grouped Remote Devices & Tabs
    const displayDevices = useMemo(() => {
        if (Array.isArray(remoteDeviceTabs) && remoteDeviceTabs.length > 0) {
            return remoteDeviceTabs;
        }
        // Fallback: legacy cloudTabs from useTabStore
        const rawPrivate = (cloudTabs?.privateTabs || []).filter(isValidSyncTab);
        const rawWork = (cloudTabs?.workTabs || []).filter(isValidSyncTab);
        const customEntries = Object.entries(cloudTabs?.customSpaceTabs || {}).flatMap(([sId, list]) => 
            (list || []).filter(isValidSyncTab).map(t => ({ ...t, spaceId: sId, spaceName: sId }))
        );
        const legacyTabs = [
            ...rawPrivate.map(tb => ({ ...tb, spaceId: 'personal', spaceName: t('nav.personal', null, 'Personal') })),
            ...rawWork.map(tb => ({ ...tb, spaceId: 'work', spaceName: t('nav.work', null, 'Work') })),
            ...customEntries
        ];
        if (legacyTabs.length > 0) {
            return [{
                deviceId: 'legacy-remote',
                deviceName: t('pop.profile.remoteDevice', null, 'Remote Device'),
                lastSynced: Date.now(),
                tabs: legacyTabs
            }];
        }
        return [];
    }, [remoteDeviceTabs, cloudTabs, t]);

    const totalCloudTabs = useMemo(() => {
        return displayDevices.reduce((sum, d) => sum + (d.tabs?.length || 0), 0);
    }, [displayDevices]);

    // Auto-fetch fresh cloud tabs snapshot when switching to Tabs category
    React.useEffect(() => {
        if (activeCategory === 'tabs' && user && refreshCloudTabs) {
            refreshCloudTabs(false);
        }
    }, [activeCategory, user, refreshCloudTabs]);

    const validPrivateTabsCount = useTabStore(state => (state.privateTabs || []).filter(isValidSyncTab).length);
    const validWorkTabsCount = useTabStore(state => (state.workTabs || []).filter(isValidSyncTab).length);
    const totalLocalActiveTabs = validPrivateTabsCount + validWorkTabsCount;

    // Status details
    const getStatusDetails = () => {
        if (!user) return { label: t('pop.profile.statusGuest', null, 'Guest'), color: isBright ? 'text-zinc-500' : 'text-white/40', bg: isBright ? 'bg-black/5' : 'bg-white/10', border: isBright ? 'border-black/10' : 'border-white/10' };
        if (isSyncing) return { label: t('pop.profile.statusSyncing', null, 'Syncing...'), color: isBright ? 'text-blue-600 animate-pulse' : 'text-blue-400 animate-pulse', bg: isBright ? 'bg-blue-500/15' : 'bg-blue-500/20', border: isBright ? 'border-blue-500/25' : 'border-blue-500/30' };
        if (syncStatus === 'synced') return { label: t('pop.profile.statusSynced', null, 'Synced'), color: isBright ? 'text-emerald-700' : 'text-emerald-400', bg: isBright ? 'bg-emerald-500/15' : 'bg-emerald-500/20', border: isBright ? 'border-emerald-500/25' : 'border-emerald-500/30' };
        return { label: t('pop.profile.statusLocalOnly', null, 'Local Only'), color: isBright ? 'text-zinc-600' : 'text-white/60', bg: isBright ? 'bg-black/5' : 'bg-white/10', border: isBright ? 'border-black/10' : 'border-white/15' };
    };

    const statusDetails = getStatusDetails();

    const CATEGORIES = [
        { id: 'sync', label: t('pop.profile.tabSync', null, 'Sync'), icon: RefreshCw },
        { id: 'tabs', label: t('pop.profile.tabTabs', null, 'Tabs'), icon: Layers },
        { id: 'backups', label: t('pop.profile.tabBackups', null, 'Backups'), icon: Cloud },
        { id: 'profile', label: t('pop.profile.tabProfile', null, 'Profile'), icon: User },
    ];

    // Global Escape key dismiss listener
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closePopover();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closePopover]);

    const activeIndex = CATEGORIES.findIndex(cat => cat.id === activeCategory);

    return (
        <div 
            id="user-profile-popover"
            className={`fixed top-[4.75rem] ${
                sidebarPosition === 'right' ? 'right-10 md:right-16 origin-top-right' : 'left-10 md:left-16 origin-top-left'
            } z-[70000] w-[420px] max-w-[calc(100vw-24px)] max-h-[85vh] flex flex-col overflow-hidden ${getLiquidGlassSurfaceClasses(isBright)} rounded-3xl p-4 select-none ${
                isClosing ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'
            }`}
            style={getLiquidGlassInlineStyle(isBright)} 
            onClick={e => e.stopPropagation()}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        >
            {/* Minimal Header */}
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                <div 
                    className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    onClick={() => setActiveCategory('profile')}
                    title={t('pop.profile.profileAndSettings', null, 'Profile & Settings')}
                >
                    <div 
                        className={`w-9 h-9 rounded-2xl border-2 flex items-center justify-center text-xs font-semibold shadow-xs overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-200 ${
                            isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                        }`}
                        style={{ borderColor: activeProfile?.color || 'var(--accent)' }}
                    >
                        {customAvatarUrl ? (
                            <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setCustomAvatarUrl('')} />
                        ) : (
                            renderProfileAvatar(activeProfile?.avatar, 15, isBright ? 'text-zinc-900' : 'text-white')
                        )}
                    </div>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                            <h3 className={`font-semibold text-xs truncate max-w-[170px] group-hover:text-accent transition-colors ${isBright ? 'text-zinc-900' : 'text-white'}`}>{username}</h3>
                            {user && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />}
                        </div>
                        <p className={`text-[11px] truncate ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                            {user ? user.email : t('pop.profile.localWorkspace', null, 'Local Workspace')}
                        </p>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-medium ${statusDetails.bg} ${statusDetails.color} ${statusDetails.border}`}>
                        {user ? <ShieldCheck size={11} className={isBright ? "text-emerald-600" : "text-emerald-400"} /> : <Lock size={10} className="opacity-60" />}
                        {statusDetails.label}
                    </span>
                </div>
            </div>

            {/* Spaces-Switcher Style Sliding Segmented Navigation */}
            <div 
                onMouseLeave={() => setHoveredCategory(null)}
                className={`relative grid grid-cols-4 p-1 rounded-full mb-3.5 border shadow-xs backdrop-blur-2xl transition-colors duration-200 select-none ${
                isBright 
                    ? 'bg-black/[0.04] border-black/[0.06]' 
                    : 'bg-[#0c0d14]/78 border-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
            }`}>
                {/* Subtle Hover Preview Pill */}
                {hoveredCategory && hoveredCategory !== activeCategory && (
                    <div 
                        className={`absolute top-1 bottom-1 rounded-full pointer-events-none ${
                            isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                        }`}
                        style={{ 
                            left: '4px',
                            width: 'calc((100% - 8px) / 4)',
                            transform: `translateX(${CATEGORIES.findIndex(c => c.id === hoveredCategory) * 100}%)`,
                            transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
                        }}
                    />
                )}

                {/* Signature Liquid Glass Sliding Pill */}
                <div 
                    className={`absolute top-1 bottom-1 rounded-full border pointer-events-none ${
                        isBright
                            ? 'bg-white border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                            : 'shadow-xs'
                    }`}
                    style={{ 
                        left: '4px',
                        width: 'calc((100% - 8px) / 4)',
                        transform: `translateX(${activeIndex * 100}%)`,
                        transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                        ...(!isBright ? {
                            borderColor: 'var(--accent-30, rgba(212, 188, 148, 0.4))',
                            backgroundColor: 'var(--accent-15, rgba(212, 188, 148, 0.16))',
                            boxShadow: '0 2px 10px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                        } : {})
                    }}
                />

                {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            onMouseEnter={() => setHoveredCategory(cat.id)}
                            className={`relative z-10 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer whitespace-nowrap select-none outline-none ${
                                isActive 
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold') 
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/45 hover:text-white')
                            }`}
                        >
                            <Icon size={12} className={isActive ? (cat.id === 'sync' && isSyncing ? 'animate-spin text-accent' : (isBright ? 'text-zinc-950' : 'text-accent')) : (isBright ? 'text-zinc-500' : 'text-white/40')} />
                            <span>{cat.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto hide-scroll pr-0.5 space-y-3">
                {/* 1. SYNC TAB */}
                {activeCategory === 'sync' && (
                    <div className="animate-fade-in space-y-3 text-left">
                        {user ? (
                            <>
                                {/* Action Card: Status, Sync Now & Auto-Sync */}
                                <div className={`p-3.5 ${getLiquidGlassCardClasses(isBright)} border rounded-2xl space-y-2.5`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-blue-500 animate-pulse'}`} />
                                            <div>
                                                <span className={`text-xs font-semibold block ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {lastSyncTime ? t('pop.profile.lastSync', { time: lastSyncTime }, 'Last sync {time}') : t('pop.profile.cloudConnected', null, 'Cloud Connected')}
                                                </span>
                                                <span className={`text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>{t('pop.profile.aesZeroKnowledge', null, 'AES-256 zero-knowledge')}</span>
                                            </div>
                                        </div>

                                        {/* Primary Compact Sync Button */}
                                        <button
                                            onClick={syncNow}
                                            disabled={isSyncing}
                                            className="px-3.5 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-[0_0_10px_var(--accent-15)]"
                                        >
                                            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                                            <span>{isSyncing ? t('pop.profile.statusSyncing', null, 'Syncing...') : t('pop.profile.syncNow', null, 'Sync Now')}</span>
                                        </button>
                                    </div>

                                    {/* Auto-Sync Toggle Row */}
                                    <div className={`pt-2 border-t ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'} flex items-center justify-between`}>
                                        <span className={`text-xs font-medium ${isBright ? 'text-zinc-700' : 'text-white/80'}`}>
                                            {t('pop.profile.autoSyncChanges', null, 'Auto-sync changes')}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={toggleAutoSync}
                                            className={`w-8 h-4.5 rounded-full flex items-center p-0.5 transition-all duration-300 cursor-pointer ${
                                                autoSyncEnabled ? 'bg-accent shadow-[0_0_8px_var(--accent-40)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                            }`}
                                            title={autoSyncEnabled ? t('pop.profile.disableAutoSync', null, 'Disable Auto-Sync') : t('pop.profile.enableAutoSync', null, 'Enable Auto-Sync')}
                                        >
                                            <div
                                                className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                                    autoSyncEnabled ? 'translate-x-[14px]' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Granular Categories - Unified Grouped Card with Hairline Dividers */}
                                <div>
                                    <div className="flex items-center justify-between px-1.5 pb-1.5 text-[11px] font-semibold">
                                        <span className={`flex items-center gap-1.5 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                                            <Sliders size={11} className="text-accent" /> {t('pop.profile.syncItems', null, 'SYNC ITEMS')}
                                        </span>
                                    </div>

                                    <div className={`rounded-2xl border ${getLiquidGlassCardClasses(isBright)} ${isBright ? 'divide-black/[0.05]' : 'divide-white/[0.04]'} divide-y overflow-hidden`}>
                                        {[
                                            {
                                                key: 'vault',
                                                label: t('pop.profile.passwords', null, 'Passwords'),
                                                count: isVaultUnlocked
                                                    ? t('pop.profile.itemsCount', { count: vaultCount }, '{count} items')
                                                    : (vaultItemCount > 0 ? t('pop.profile.lockedCount', { count: vaultItemCount }, '{count} locked') : t('pop.profile.locked', null, 'Locked')),
                                                icon: Key
                                            },
                                            { key: 'tabs', label: t('pop.profile.openTabs', null, 'Open Tabs'), count: t('pop.profile.localTabsCount', { count: totalLocalActiveTabs }, '{count} local tabs'), icon: Layers },
                                            { key: 'settings', label: t('pop.profile.settingsTheme', null, 'Settings & Theme'), count: t('pop.profile.preferences', null, 'Preferences'), icon: Palette },
                                            { key: 'history', label: t('pop.profile.browsingHistory', null, 'Browsing History'), count: t('pop.profile.entriesCount', { count: historyCount }, '{count} entries'), icon: History },
                                            { key: 'extensions', label: t('pop.profile.syncExtensions', null, 'Extensions'), count: t('pop.profile.syncExtensionsDesc', { count: extensionsCount }, '{count} extensions'), icon: Puzzle }
                                        ].map((cat) => {
                                            const Icon = cat.icon;
                                            const isEnabled = syncCategories ? syncCategories[cat.key] !== false : true;
                                            return (
                                                <div 
                                                    key={cat.key} 
                                                    onClick={() => toggleSyncCategory(cat.key)} 
                                                    className={`flex items-center justify-between px-3.5 py-2.5 transition-colors cursor-pointer ${
                                                        isBright 
                                                            ? 'hover:bg-black/[0.025]' 
                                                            : 'hover:bg-white/[0.03]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Icon size={13} className={isEnabled ? "text-accent" : (isBright ? "text-zinc-300" : "text-white/25")} />
                                                        <span className={`text-xs font-medium ${isBright ? 'text-zinc-900' : 'text-white/90'}`}>{cat.label}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2.5">
                                                        <span className={`text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>{cat.count}</span>
                                                        <button 
                                                            type="button" 
                                                            className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all duration-300 ${
                                                                isEnabled ? 'bg-accent shadow-[0_0_8px_var(--accent-40)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                                            }`}
                                                        >
                                                            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isEnabled ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={`p-5 text-center rounded-2xl border ${isBright ? 'bg-black/[0.02] border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.06]'} space-y-3`}>
                                <ShieldCheck size={28} className="text-accent mx-auto opacity-80" />
                                <div>
                                    <h4 className={`text-xs font-bold ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('pop.profile.e2eSyncTitle', null, 'End-to-End Encrypted Cloud Sync')}</h4>
                                    <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-white/50'} mt-1`}>
                                        {t('pop.profile.e2eSyncDesc', null, 'Sign in to synchronize passwords, open tabs, and settings across your devices with zero-knowledge AES-256 encryption.')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        closePopover();
                                        openModal('auth');
                                    }}
                                    className="w-full py-2.5 bg-accent text-black font-bold rounded-full text-xs transition hover:scale-[1.01] cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    {t('pop.profile.signInRegister', null, 'Sign In / Register')} <ArrowRight size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. TABS TAB (OTHER DEVICES) */}
                {activeCategory === 'tabs' && (
                    <div className="animate-fade-in space-y-3 text-left">
                        <div className={`p-3.5 ${getLiquidGlassCardClasses(isBright)} border rounded-2xl space-y-3`}>
                            {/* Section Header */}
                            <div className={`flex items-center justify-between pb-2 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                        <Layers size={13} className="text-accent" /> {t('pop.profile.tabsOtherDevices', null, 'Tabs from Other Devices')} {totalCloudTabs > 0 && `(${totalCloudTabs})`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsRefreshingTabs(true);
                                            await refreshCloudTabs(true);
                                            setIsRefreshingTabs(false);
                                        }}
                                        disabled={isRefreshingTabs || isSyncing}
                                        className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
                                            isBright 
                                                ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/[0.08] text-zinc-700' 
                                                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300 hover:text-white'
                                        }`}
                                        title={t('pop.profile.refreshRemoteTabs', null, 'Refresh remote tabs')}
                                    >
                                        <RefreshCw size={12} className={`${isRefreshingTabs || isSyncing ? 'animate-spin text-accent' : ''}`} />
                                    </button>
                                    {totalCloudTabs > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                let count = 0;
                                                displayDevices.forEach(d => {
                                                    (d.tabs || []).forEach(tab => {
                                                        if (isValidSyncTab(tab)) {
                                                            count++;
                                                            useTabStore.getState().addTab({
                                                                id: `t-remote-${Date.now()}-${count}`,
                                                                title: getCleanTabTitle(tab),
                                                                url: tab.url,
                                                                active: false,
                                                                folderId: null
                                                            }, tab.spaceId || 'personal');
                                                        }
                                                    });
                                                });
                                                showToast(t('pop.profile.openedTabsAcrossSpaces', { count }, 'Opened {count} tabs across workspaces'));
                                            }}
                                            className="text-accent hover:underline font-semibold text-xs cursor-pointer px-2 py-0.5 rounded-full"
                                        >
                                            {t('pop.profile.openAll', null, 'Open All')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {totalCloudTabs === 0 ? (
                                <div className={`text-center py-7 text-xs ${isBright ? 'text-zinc-400' : 'text-white/40'} space-y-2`}>
                                    <div className={`w-9 h-9 rounded-xl mx-auto flex items-center justify-center ${
                                        isBright ? 'bg-black/[0.03] text-accent/70 border border-black/[0.06]' : 'bg-white/[0.03] text-accent/70 border border-white/[0.05]'
                                    }`}>
                                        <Layers size={18} />
                                    </div>
                                    <p className={`font-semibold ${isBright ? 'text-zinc-700' : 'text-white/70'}`}>{t('pop.profile.noRemoteTabs', null, 'No tabs from other devices')}</p>
                                    <p className="text-[10px] opacity-60 max-w-[260px] mx-auto leading-relaxed">
                                        {t('pop.profile.noRemoteTabsDesc', null, 'Tabs opened on your other connected devices will appear here automatically with real-time updates.')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsRefreshingTabs(true);
                                            await refreshCloudTabs(true);
                                            setIsRefreshingTabs(false);
                                        }}
                                        className={`mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition cursor-pointer active:scale-95 ${
                                            isBright ? 'bg-black/[0.05] hover:bg-black/10 text-zinc-800 border-black/10' : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                                        }`}
                                    >
                                        <RefreshCw size={11} className={isRefreshingTabs || isSyncing ? 'animate-spin' : ''} />
                                        {t('pop.profile.refreshNow', null, 'Refresh Now')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[50vh] overflow-y-auto hide-scroll pr-0.5">
                                    {displayDevices.map((device, devIdx) => {
                                        const isLaptop = /Mac|Laptop|Notebook|Book/i.test(device.deviceName);
                                        const DeviceIcon = isLaptop ? Laptop : Monitor;
                                        const timeAgo = formatTimeAgo(device.lastSynced, t);
                                        const devTabs = (device.tabs || []).filter(isValidSyncTab);

                                        return (
                                            <div 
                                                key={device.deviceId || devIdx}
                                                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 ${
                                                    isBright 
                                                        ? 'bg-black/[0.02] border-black/[0.06] shadow-xs' 
                                                        : 'bg-white/[0.025] border-white/[0.06]'
                                                }`}
                                            >
                                                {/* Device Header */}
                                                <div className={`flex items-center justify-between gap-2 pb-1.5 mb-2 border-b ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'}`}>
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                            isBright ? 'bg-black/[0.05] text-accent' : 'bg-white/[0.06] text-accent'
                                                        }`}>
                                                            <DeviceIcon size={12} />
                                                        </div>
                                                        <span className={`text-xs font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                            {device.deviceName || t('pop.profile.remoteDevice', null, 'Remote Device')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                                            isBright 
                                                                ? 'bg-black/[0.04] text-zinc-500 border-black/[0.06]' 
                                                                : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
                                                        }`}>
                                                            {timeAgo}
                                                        </span>
                                                        {devTabs.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    let count = 0;
                                                                    devTabs.forEach((tab, index) => {
                                                                        count++;
                                                                        useTabStore.getState().addTab({
                                                                            id: `t-remote-${Date.now()}-${index}`,
                                                                            title: getCleanTabTitle(tab),
                                                                            url: tab.url,
                                                                            active: false,
                                                                            folderId: null
                                                                        }, tab.spaceId || 'personal');
                                                                    });
                                                                    showToast(t('pop.profile.openedTabsFromDevice', { count, device: device.deviceName }, 'Opened {count} tabs from {device}'));
                                                                }}
                                                                className="text-accent hover:underline font-medium text-[11px] cursor-pointer"
                                                            >
                                                                {t('pop.profile.openAll', null, 'Open All')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tab List */}
                                                <div className="space-y-1">
                                                    {devTabs.map((tab, idx) => {
                                                        const cleanTitle = getCleanTabTitle(tab);
                                                        return (
                                                            <div 
                                                                key={tab.id || idx}
                                                                onClick={() => {
                                                                    useTabStore.getState().addTab({
                                                                        id: `t-${Date.now()}-${idx}`,
                                                                        title: cleanTitle,
                                                                        url: tab.url,
                                                                        active: true,
                                                                        folderId: null
                                                                    }, tab.spaceId || 'personal');
                                                                    showToast(t('pop.profile.openedTab', { title: cleanTitle }, 'Opened: {title}'));
                                                                }}
                                                                className={`px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center justify-between group active:scale-[0.99] ${
                                                                    isBright 
                                                                        ? 'bg-white/60 hover:bg-white/95 border-black/[0.04] hover:border-black/[0.1]' 
                                                                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.03] hover:border-accent/40'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                                                    {getSafeFaviconUrl(tab.url, settings, 32) ? (
                                                                        <img 
                                                                            src={getSafeFaviconUrl(tab.url, settings, 32)} 
                                                                            alt="" 
                                                                            className="w-3.5 h-3.5 rounded-xs flex-shrink-0"
                                                                            onError={e => { e.target.style.display = 'none'; }} 
                                                                        />
                                                                    ) : (
                                                                        <Globe size={12} className="opacity-40 flex-shrink-0" />
                                                                    )}
                                                                    <span className={`text-xs block font-medium truncate ${
                                                                        isBright ? 'text-zinc-800' : 'text-zinc-200'
                                                                    } group-hover:text-accent transition-colors`}>
                                                                        {cleanTitle}
                                                                    </span>
                                                                    {tab.spaceName && (
                                                                        <span className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 rounded-xs flex-shrink-0 ${
                                                                            isBright ? 'bg-black/[0.05] text-zinc-600' : 'bg-white/[0.06] text-zinc-400'
                                                                        }`}>
                                                                            {tab.spaceName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="inline-flex items-center gap-1 text-[11px] text-accent opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
                                                                    <span>{t('pop.profile.open', null, 'Open')}</span>
                                                                    <ExternalLink size={10} />
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. BACKUPS TAB */}
                {activeCategory === 'backups' && (
                    <div className="animate-fade-in space-y-3 text-left">
                        {/* Push Snapshot Drawer */}
                        {(showPushBackupForm || isClosingPushBackup) && user && (
                            <div className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                                isClosingPushBackup ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'
                            } ${
                                isBright 
                                    ? 'bg-white/70 border-black/[0.06] shadow-sm text-zinc-900' 
                                    : 'bg-white/[0.03] border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-white'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                                        <UploadCloud size={12} /> {t('pop.profile.newCloudSnapshot', null, 'New Cloud Snapshot')}
                                    </span>
                                    <button type="button" onClick={handleClosePushBackup} className={`text-xs cursor-pointer transition ${isBright ? 'text-zinc-400 hover:text-zinc-800' : 'text-white/40 hover:text-white'}`}>{t('common.cancel', null, 'Cancel')}</button>
                                </div>
                                <form onSubmit={handlePushBackup} className="space-y-2">
                                    <input
                                        type="text"
                                        value={backupLabel}
                                        onChange={(e) => setBackupLabel(e.target.value)}
                                        placeholder={t('pop.profile.snapshotNamePlaceholder', null, 'Snapshot Name (e.g. Workstation Backup)')}
                                        className={`w-full ${
                                            isBright 
                                                ? 'bg-black/[0.03] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent/60 focus:bg-black/[0.05]' 
                                                : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/35 backdrop-blur-md focus:border-accent/60 focus:bg-white/[0.07]'
                                        } border rounded-xl px-3 py-1.5 text-xs outline-none transition`}
                                    />
                                    {isVaultInitialized && !isVaultUnlocked && renderInlineVaultUnlockFields({
                                        title: t('pop.profile.unlockToIncludePasswords', null, 'Unlock QVault to include passwords'),
                                        value: snapshotPin,
                                        onChange: (val) => {
                                            setSnapshotPin(val);
                                            if (snapshotUnlockError) setSnapshotUnlockError('');
                                        },
                                        errorMsg: snapshotUnlockError,
                                        onBiometricClick: handleBiometricSnapshotUnlock,
                                        isBusy: isCreatingBackup || isUnlockingForSnapshot
                                    })}
                                    <button
                                        type="submit"
                                        disabled={isCreatingBackup || isUnlockingForSnapshot}
                                        className="w-full py-1.5 bg-accent text-black font-bold rounded-full text-xs shadow-md transition hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                                    >
                                        {(isCreatingBackup || isUnlockingForSnapshot) ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                                        {isVaultInitialized && !isVaultUnlocked ? t('pop.profile.unlockAndSaveSnapshot', null, 'Unlock & Save Snapshot') : t('pop.profile.saveSnapshot', null, 'Save Snapshot')}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Snapshots Version History */}
                        <div className={`p-3.5 ${getLiquidGlassCardClasses(isBright)} border rounded-2xl space-y-2.5`}>
                            <div className={`flex items-center justify-between pb-1.5 border-b ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'}`}>
                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <Cloud size={13} className="text-accent" /> {t('pop.profile.cloudSnapshots', null, 'Cloud Snapshots')} {cloudBackups.length > 0 && `(${cloudBackups.length})`}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => useSyncStore.getState().fetchCloudBackups()} 
                                        className={`hover:text-accent flex items-center gap-1 text-[11px] cursor-pointer p-1 rounded-full ${
                                            isBright ? 'text-zinc-500 hover:bg-black/[0.05]' : 'text-white/50 hover:bg-white/[0.05]'
                                        }`}
                                        title={t('pop.profile.refresh', null, 'Refresh')}
                                    >
                                        <RefreshCw size={11} />
                                    </button>
                                    {user && !showPushBackupForm && (
                                        <button
                                            onClick={() => setShowPushBackupForm(true)}
                                            className="px-3 py-0.5 rounded-full bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={10} /> {t('pop.profile.pushSnapshot', null, 'Push')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isLoadingBackups ? (
                                <div className={`text-center py-4 text-xs ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                    <RefreshCw size={13} className="animate-spin mx-auto mb-1 text-accent" />
                                    {t('pop.profile.loadingSnapshots', null, 'Loading snapshots...')}
                                </div>
                            ) : cloudBackups.length === 0 ? (
                                <div className={`text-center py-6 text-xs ${isBright ? 'text-zinc-400' : 'text-white/40'} space-y-1`}>
                                    <Cloud size={20} className="text-accent/40 mx-auto opacity-70" />
                                    <p className={`font-medium ${isBright ? 'text-zinc-700' : 'text-white/70'}`}>{t('pop.profile.noSnapshotsYet', null, 'No cloud snapshots yet')}</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-[38vh] overflow-y-auto hide-scroll">
                                    {cloudBackups.map((bk, bkIdx) => {
                                        const bkMatchId = bk.id || bk.createdAt;
                                        const isShowingRestoreUnlock = pendingRestoreSnapshotId === bkMatchId && isVaultInitialized && !isVaultUnlocked;
                                        return (
                                            <div key={bkMatchId || bkIdx} className={`p-2.5 ${isBright ? 'bg-black/[0.02] border-black/[0.04]' : 'bg-white/[0.02] border-white/[0.04]'} border rounded-xl transition space-y-1`}>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'} truncate flex-1 pr-2`}>
                                                        {bk.label || t('pop.profile.snapshotFallback', null, 'Snapshot')}
                                                    </span>
                                                    <span className={`text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'} font-mono`}>
                                                        {bk.createdAt ? new Date(bk.createdAt).toLocaleDateString(intlLocale, { month: 'short', day: 'numeric' }) : ''}
                                                    </span>
                                                </div>
                                                {bk.stats && (
                                                    <div className={`flex gap-2.5 text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                                                        <span className="flex items-center gap-1"><Key size={9} className="text-accent/80" /> {bk.stats.passwords || 0}</span>
                                                        <span className="flex items-center gap-1"><Layers size={9} className="text-accent/80" /> {bk.stats.tabs || 0}</span>
                                                        <span className="flex items-center gap-1"><History size={9} className="text-accent/80" /> {bk.stats.history || 0}</span>
                                                    </div>
                                                )}
                                                {isShowingRestoreUnlock ? (
                                                    <form
                                                        onSubmit={(e) => handleConfirmRestoreWithUnlock(e, bk)}
                                                        className={`pt-2 border-t space-y-2 ${isBright ? 'border-black/[0.04]' : 'border-white/[0.04]'}`}
                                                    >
                                                        {renderInlineVaultUnlockFields({
                                                            title: t('pop.profile.unlockToRestorePasswords', null, 'Unlock QVault to restore passwords'),
                                                            value: restorePin,
                                                            onChange: (val) => {
                                                                setRestorePin(val);
                                                                if (restoreUnlockError) setRestoreUnlockError('');
                                                            },
                                                            errorMsg: restoreUnlockError,
                                                            onBiometricClick: () => handleBiometricRestoreUnlock(bk),
                                                            isBusy: isUnlockingForRestore || isRestoringBackup
                                                        })}
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                type="submit"
                                                                disabled={isUnlockingForRestore || isRestoringBackup}
                                                                className="flex-1 py-1 bg-accent text-black font-bold rounded-full text-[10px] transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                                            >
                                                                {isUnlockingForRestore ? (
                                                                    <>
                                                                        <RefreshCw size={10} className="animate-spin" /> {t('pop.profile.unlocking', null, 'Unlocking...')}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <DownloadCloud size={10} /> {t('pop.profile.unlockAndRestore', null, 'Unlock & Restore')}
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isUnlockingForRestore || isRestoringBackup}
                                                                onClick={() => {
                                                                    setPendingRestoreSnapshotId(null);
                                                                    setRestorePin('');
                                                                    setRestoreUnlockError('');
                                                                }}
                                                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer disabled:opacity-40 ${
                                                                    isBright ? 'bg-black/[0.05] text-zinc-600 hover:bg-black/[0.09]' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12]'
                                                                }`}
                                                            >
                                                                {t('common.cancel', null, 'Cancel')}
                                                            </button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className={`flex gap-1.5 pt-1.5 border-t ${isBright ? 'border-black/[0.04]' : 'border-white/[0.04]'}`}>
                                                        <button
                                                            disabled={isRestoringBackup}
                                                            onClick={() => handleSnapshotRestoreClick(bk)}
                                                            className="flex-1 py-1 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-full text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                                        >
                                                            {restoringBackupId === bk.id ? (
                                                                <>
                                                                    <RefreshCw size={10} className="animate-spin" /> {t('pop.profile.restoring', null, 'Restoring...')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <DownloadCloud size={10} /> {t('pop.profile.restore', null, 'Restore')}
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            disabled={isRestoringBackup}
                                                            onClick={() => deleteCloudBackup(bk.id)}
                                                            className="p-1 rounded-full text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-40"
                                                            title={t('common.delete', null, 'Delete')}
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Offline Zero-Cloud File Sync (.qsync) */}
                        <div className={`p-3 ${getLiquidGlassCardClasses(isBright)} border rounded-2xl flex items-center justify-between`}>
                            <span className={`text-xs font-semibold ${isBright ? 'text-zinc-800' : 'text-white/80'}`}>{t('pop.profile.offlineArchive', null, 'Offline Archive')}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportLocalBackup}
                                    className={`px-3.5 py-1 border rounded-full text-[10px] font-medium transition cursor-pointer hover:border-accent/40 flex items-center gap-1 ${
                                        isBright ? 'bg-black/[0.04] text-zinc-800 border-black/[0.08] hover:bg-black/[0.08]' : 'bg-white/[0.04] text-white border-white/[0.06] hover:bg-white/[0.08]'
                                    }`}
                                >
                                    <Download size={11} className="text-accent" /> {t('pop.profile.export', null, 'Export')}
                                </button>
                                <label className={`px-3.5 py-1 border rounded-full text-[10px] font-medium transition cursor-pointer hover:border-accent/40 flex items-center gap-1 ${
                                    isBright ? 'bg-black/[0.04] text-zinc-800 border-black/[0.08] hover:bg-black/[0.08]' : 'bg-white/[0.04] text-white border-white/[0.06] hover:bg-white/[0.08]'
                                }`}>
                                    <Upload size={11} className="text-accent" /> {t('pop.profile.import', null, 'Import')}
                                    <input type="file" accept=".qsync,.json" onChange={handleImportFile} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. PROFILES & ACCOUNT SECURITY TAB */}
                {activeCategory === 'profile' && (
                    <div className="animate-fade-in space-y-3 text-left">
                        {/* Profile Details & Avatar Card */}
                        <div className={`p-3.5 ${getLiquidGlassCardClasses(isBright)} border rounded-2xl space-y-2.5`}>
                            <div className={`flex items-center justify-between pb-1.5 border-b ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'}`}>
                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <User size={13} className="text-accent" /> {t('pop.profile.activeProfile', null, 'Active Profile')}
                                </span>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Edit3 size={11} /> {isEditing ? t('common.cancel', null, 'Cancel') : t('common.edit', null, 'Edit')}
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                                    <div 
                                        className={`w-11 h-11 rounded-2xl ${isBright ? 'bg-black/[0.04] text-zinc-900' : 'bg-white/[0.05] text-white'} border-2 flex items-center justify-center text-xs font-semibold shadow-xs overflow-hidden`}
                                        style={{ borderColor: activeProfile?.color || 'var(--accent)' }}
                                    >
                                        {customAvatarUrl ? (
                                            <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setCustomAvatarUrl('')} />
                                        ) : (
                                            renderProfileAvatar(activeProfile?.avatar, 18, isBright ? 'text-zinc-900' : 'text-white')
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${isBright ? 'bg-black/10 text-zinc-800' : 'bg-white/15 text-white'} flex items-center justify-center shadow-xs`}>
                                        <Camera size={9} />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <div className="flex gap-1.5">
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className={`flex-1 border rounded-xl px-2.5 py-1 text-xs font-medium outline-none focus:border-accent ${
                                                    isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900' : 'bg-white/[0.04] border-white/10 text-white'
                                                }`}
                                            />
                                            <button
                                                onClick={handleSaveProfile}
                                                className="px-3 py-1 bg-accent text-black font-bold rounded-full text-xs cursor-pointer"
                                            >
                                                {t('common.save', null, 'Save')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <h4 className={`text-xs font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>{username}</h4>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                                {activeProfile?.name || t('pop.profile.defaultProfile', null, 'Default')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Avatar Picker Drawer */}
                            {showAvatarPicker && (
                                <div className={`p-2.5 rounded-2xl border transition-all space-y-2 animate-slide-down-fade ${
                                    isBright 
                                        ? 'bg-white/70 border-black/[0.06] shadow-sm text-zinc-900' 
                                        : 'bg-white/[0.03] border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-white'
                                }`}>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {AVATAR_PRESETS.map(preset => {
                                            const IconComponent = preset.icon;
                                            return (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setAvatarPreset(preset.id);
                                                        setCustomAvatarUrl('');
                                                        if (activeProfile) {
                                                            updateProfile(activeProfile.id, { avatar: preset.id });
                                                        }
                                                    }}
                                                    className={`h-7 rounded-xl border flex items-center justify-center text-xs transition cursor-pointer ${
                                                        avatarPreset === preset.id && !customAvatarUrl 
                                                            ? 'bg-accent/20 border-accent text-accent' 
                                                            : (isBright ? 'bg-black/[0.03] border-black/10 text-zinc-700 hover:bg-black/[0.06]' : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.05]')
                                                    }`}
                                                    title={t(preset.nameKey, null, preset.name)}
                                                >
                                                    <IconComponent size={14} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <input
                                        type="text"
                                        value={customAvatarUrl}
                                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                                        placeholder={t('pop.profile.pasteImageUrl', null, 'Or paste image URL...')}
                                        className={`w-full border rounded-xl px-2.5 py-1 text-[10px] outline-none font-mono ${
                                            isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400' : 'bg-white/[0.04] border-white/10 text-white placeholder-white/40'
                                        }`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Browser Profiles Switcher */}
                        <div className={`p-3.5 ${getLiquidGlassCardClasses(isBright)} border rounded-2xl space-y-2.5`}>
                            <div className={`flex items-center justify-between pb-1.5 border-b ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'}`}>
                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <User size={13} className="text-accent" /> {t('pop.profile.profilesCount', { count: profiles.length }, 'Profiles ({count})')}
                                </span>
                                <button
                                    onClick={() => setShowAddProfile(!showAddProfile)}
                                    className="px-2.5 py-0.5 rounded-full bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-medium flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={12} /> {t('pop.profile.add', null, 'Add')}
                                </button>
                            </div>

                            {/* Add Profile Drawer */}
                            {(showAddProfile || isClosingAddProfile) && (
                                <form onSubmit={handleCreateProfile} className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                                    isClosingAddProfile ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'
                                } ${
                                    isBright 
                                        ? 'bg-white/70 border-black/[0.06] shadow-sm text-zinc-900' 
                                        : 'bg-white/[0.03] border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-white'
                                }`}>
                                    <input
                                        type="text"
                                        placeholder={t('pop.profile.newProfileNamePlaceholder', null, 'New Profile Name')}
                                        value={newProfileName}
                                        onChange={(e) => setNewProfileName(e.target.value)}
                                        className={`w-full ${
                                            isBright 
                                                ? 'bg-black/[0.03] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent/60' 
                                                : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/35 backdrop-blur-md focus:border-accent/60'
                                        } border rounded-xl px-2.5 py-1.5 text-xs outline-none transition`}
                                    />
                                    <div className="flex items-center gap-1.5 py-0.5">
                                        {PROFILE_COLORS.map(col => (
                                            <button
                                                key={col}
                                                type="button"
                                                onClick={() => setNewProfileColor(col)}
                                                className={`w-4 h-4 rounded-full cursor-pointer ${newProfileColor === col ? 'scale-125 ring-2 ring-accent' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: col }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-1.5 pt-0.5">
                                        <button
                                            type="button"
                                            onClick={handleCloseAddProfile}
                                            className={`flex-1 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                                                isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-600' : 'bg-white/[0.06] hover:bg-white/[0.1] text-white/70'
                                            }`}
                                        >
                                            {t('common.cancel', null, 'Cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newProfileName.trim()}
                                            className="flex-1 py-1 bg-accent text-black font-bold rounded-full text-[10px] disabled:opacity-50 cursor-pointer"
                                        >
                                            {t('pop.profile.create', null, 'Create')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Profiles List */}
                            <div className="space-y-1.5 max-h-36 overflow-y-auto hide-scroll">
                                {profiles.map(p => {
                                    const isCurrent = p.id === activeProfileId;
                                    return (
                                        <div
                                            key={p.id}
                                            className={`flex items-center justify-between p-2 rounded-xl border transition ${
                                                isCurrent 
                                                    ? (isBright ? 'bg-accent/15 border-accent/45 text-zinc-950 font-semibold' : 'bg-accent/15 border-accent/40 text-accent font-semibold')
                                                    : (isBright ? 'bg-black/[0.025] border-black/[0.06] text-zinc-800 hover:border-accent/40' : 'bg-white/[0.02] border-white/[0.04] hover:border-accent/30')
                                            }`}
                                        >
                                            <div 
                                                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                                onClick={() => { if (!isCurrent) handleSwitchProfile(p.id); }}
                                            >
                                                <span className={`flex items-center justify-center w-5 h-5 rounded-lg border shrink-0 ${
                                                    isBright ? 'bg-black/[0.04] border-black/10' : 'bg-white/5 border-white/10'
                                                }`}>
                                                    {renderProfileAvatar(p.avatar, 12, 'text-accent')}
                                                </span>
                                                <span className="text-xs truncate">{p.name}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => handleOpenInNewWindow(p.id)}
                                                    className={`p-1 rounded-full opacity-60 hover:opacity-100 transition cursor-pointer ${
                                                        isBright ? 'hover:bg-black/[0.06]' : 'hover:bg-white/[0.05]'
                                                    }`}
                                                    title={t('pop.profile.openInNewWindow', null, 'Open in new window')}
                                                >
                                                    <ExternalLink size={11} />
                                                </button>
                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => handleSwitchProfile(p.id)}
                                                        className={`px-2.5 py-0.5 hover:bg-accent/20 hover:text-accent rounded-full text-[10px] font-medium cursor-pointer ${
                                                            isBright ? 'bg-black/[0.05] text-zinc-700' : 'bg-white/[0.06]'
                                                        }`}
                                                    >
                                                        {t('pop.profile.switch', null, 'Switch')}
                                                    </button>
                                                )}
                                                {profiles.length > 1 && !isCurrent && (
                                                    <button
                                                        onClick={() => handleDeleteProfile(p.id, p.name)}
                                                        className="p-1 rounded-full text-red-400 opacity-60 hover:opacity-100 transition cursor-pointer hover:bg-red-500/10"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Security Accordion */}
                        <div className={`p-3.5 ${getLiquidGlassCardClasses(isBright)} border rounded-2xl space-y-2.5`}>
                            <button
                                onClick={() => setShowSecuritySection(!showSecuritySection)}
                                className="w-full flex items-center justify-between text-xs font-semibold cursor-pointer"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Lock size={12} className="text-accent" /> {t('pop.profile.securityPassphrase', null, 'Security & Passphrase')}
                                </span>
                                {showSecuritySection ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            {showSecuritySection && (
                                <div className={`pt-2 border-t space-y-2.5 animate-slide-down-fade ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'}`}>
                                    {user && (
                                        <form onSubmit={handleChangeAccountPassword} className={`space-y-2 pb-2 border-b ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'}`}>
                                            <span className="text-[10px] font-bold text-accent uppercase block">{t('pop.profile.changePassword', null, 'Change Password')}</span>
                                            {passMsg && (
                                                <p className={`text-[10px] p-1.5 rounded-xl border ${passMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                                                    {passMsg.text}
                                                </p>
                                            )}
                                            <input
                                                type={showPassText ? "text" : "password"}
                                                value={currPass}
                                                onChange={(e) => setCurrPass(e.target.value)}
                                                placeholder={t('pop.profile.currentPassword', null, 'Current Password')}
                                                className={`w-full border rounded-xl px-2.5 py-1 text-xs outline-none ${
                                                    isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400' : 'bg-white/[0.04] border-white/10 text-white placeholder-white/40'
                                                }`}
                                            />
                                            <input
                                                type={showPassText ? "text" : "password"}
                                                value={newPass}
                                                onChange={(e) => setNewPass(e.target.value)}
                                                placeholder={t('pop.profile.newPasswordMin', null, 'New Password (min 6 chars)')}
                                                className={`w-full border rounded-xl px-2.5 py-1 text-xs outline-none ${
                                                    isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400' : 'bg-white/[0.04] border-white/10 text-white placeholder-white/40'
                                                }`}
                                            />
                                            <button
                                                type="submit"
                                                disabled={isChangingPass || !currPass || !newPass}
                                                className="w-full py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-full text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                                            >
                                                {isChangingPass ? t('pop.profile.updating', null, 'Updating...') : t('pop.profile.updatePassword', null, 'Update Password')}
                                            </button>
                                        </form>
                                    )}

                                    {/* Local AES-256 Key */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold uppercase block ${isBright ? 'text-emerald-700' : 'text-emerald-400'}`}>{t('pop.profile.aesKey', null, 'AES-256 Key')}</span>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassText(!showPassText)}
                                                className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer"
                                            >
                                                {showPassText ? t('pop.profile.hide', null, 'Hide') : t('pop.profile.show', null, 'Show')}
                                            </button>
                                        </div>
                                        <input
                                            type={showPassText ? "text" : "password"}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            className={`w-full border rounded-xl px-2.5 py-1 text-xs font-mono outline-none ${
                                                isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900' : 'bg-white/[0.04] border-white/10 text-white'
                                            }`}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sign Out Action */}
                        {user ? (
                            <button
                                onClick={logout}
                                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-full text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                <LogOut size={12} /> {t('pop.profile.signOutCloud', null, 'Sign Out of QBrowse Cloud')}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    closePopover();
                                    openModal('auth');
                                }}
                                className="w-full py-2.5 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-full text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                {t('pop.profile.signInArrow', null, 'Sign In →')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
