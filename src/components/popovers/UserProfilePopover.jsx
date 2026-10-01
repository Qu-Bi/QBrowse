import React, { useState, useMemo } from 'react';
import { 
    User, ShieldCheck, RefreshCw, LogOut, Key, 
    Check, Camera, Edit3, Globe, Image as ImageIcon,
    Lock, ArrowRight, Sliders, Palette, Layers, History, 
    Cloud, UploadCloud, DownloadCloud, Trash2, Download, Upload,
    ChevronDown, ChevronUp, Plus, ExternalLink
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useSyncStore from '../../store/useSyncStore';
import useTabStore, { isValidSyncTab, getCleanTabTitle } from '../../store/useTabStore';
import useVaultStore from '../../store/useVaultStore';
import useHistoryStore from '../../store/useHistoryStore';
import useProfileStore, { getAvatarEmoji } from '../../store/useProfileStore';

const AVATAR_PRESETS = [
    { id: 'rocket', emoji: '🚀', name: 'Rocket' },
    { id: 'zap', emoji: '⚡', name: 'Energy' },
    { id: 'fox', emoji: '🦊', name: 'Cyber Fox' },
    { id: 'alien', emoji: '👾', name: 'Pixel' },
    { id: 'galaxy', emoji: '🌌', name: 'Cosmos' },
    { id: 'gem', emoji: '💎', name: 'Diamond' },
    { id: 'dragon', emoji: '🐉', name: 'Dragon' },
    { id: 'crown', emoji: '👑', name: 'Royal' },
    { id: 'shield', emoji: '🛡️', name: 'Guardian' },
    { id: 'dna', emoji: '🧬', name: 'Genesis' }
];

const PROFILE_COLORS = [
    '#d4bc94', '#60a5fa', '#34d399', '#f472b6', 
    '#a78bfa', '#fbbf24', '#f87171', '#38bdf8'
];

export default function UserProfilePopover({ isClosing }) {
    const { closePopover, openModal, showToast, theme } = useUIStore();
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const { 
        user, isSyncing, syncStatus, lastSyncTime, syncNow, logout, 
        masterPassword, setMasterPassword, changePassword,
        syncCategories, toggleSyncCategory,
        cloudBackups, isLoadingBackups, isCreatingBackup,
        pushManualBackup, restoreCloudBackup, deleteCloudBackup,
        exportLocalBackup, importLocalBackup,
        autoSyncEnabled, toggleAutoSync
    } = useSyncStore();

    const { 
        profiles, activeProfileId, switchProfile, 
        createProfile, updateProfile, deleteProfile 
    } = useProfileStore();

    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

    const cloudTabs = useTabStore(state => state.cloudTabs);
    const openCloudTab = useTabStore(state => state.openCloudTab);
    const restoreAllCloudTabs = useTabStore(state => state.restoreAllCloudTabs);

    const isVaultUnlocked = useVaultStore(state => state.isUnlocked);
    const vaultCount = useVaultStore(state => state.passwords?.length || 0);
    const pinnedCount = useTabStore(state => state.pinnedTabs?.length || 0);
    const historyCount = useHistoryStore(state => state.history?.length || 0);

    // Active Category Navigation: 'sync' | 'tabs' | 'backups' | 'profile'
    const [activeCategory, setActiveCategory] = useState('sync');

    // Profile state
    const [username, setUsername] = useState(() => localStorage.getItem('qbrowse_profile_username') || activeProfile?.name || (user ? user.email.split('@')[0] : 'Zen Explorer'));
    const [statusQuote, setStatusQuote] = useState(() => localStorage.getItem('qbrowse_profile_status') || 'Exploring the Zen web');
    const [avatarPreset, setAvatarPreset] = useState(() => localStorage.getItem('qbrowse_profile_avatar_preset') || 'rocket');
    const [customAvatarUrl, setCustomAvatarUrl] = useState(() => localStorage.getItem('qbrowse_profile_avatar_url') || '');
    
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileAvatar, setNewProfileAvatar] = useState('🚀');
    const [newProfileColor, setNewProfileColor] = useState('#d4bc94');

    const [isEditing, setIsEditing] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showSecuritySection, setShowSecuritySection] = useState(false);

    // Manual Backup Input state
    const [backupLabel, setBackupLabel] = useState('');
    const [showPushBackupForm, setShowPushBackupForm] = useState(false);

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
            showToast(`Switched to profile: ${target.name}`);
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
        showToast(`Created profile "${prof.name}"`);
        await handleSwitchProfile(prof.id);
    };

    const handleOpenInNewWindow = (targetId) => {
        if (window.electronAPI && window.electronAPI.openNewWindow) {
            window.electronAPI.openNewWindow({ profileId: targetId });
            showToast('Opened profile in new window');
        }
    };

    const handleDeleteProfile = (id, name) => {
        if (window.confirm(`Are you sure you want to delete profile "${name}"? All associated local data will be removed.`)) {
            deleteProfile(id);
            showToast(`Profile "${name}" deleted`);
        }
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
        showToast('Profile updated!');
        
        useSyncStore.getState().syncDataToCloud('profile', {
            username,
            statusQuote,
            avatarPreset,
            customAvatarUrl,
            updatedAt: new Date().toISOString()
        }).catch(() => {});
    };

    const handlePushBackup = async (e) => {
        e.preventDefault();
        const success = await pushManualBackup(backupLabel);
        if (success) {
            setBackupLabel('');
            setShowPushBackupForm(false);
        }
    };

    const handleChangeAccountPassword = async (e) => {
        e.preventDefault();
        if (!currPass || !newPass) return;
        setIsChangingPass(true);
        setPassMsg(null);
        try {
            const res = await changePassword(currPass, newPass);
            if (res && res.success === false) {
                setPassMsg({ type: 'error', text: res.error || 'Failed to update password' });
            } else {
                setCurrPass('');
                setNewPass('');
                setPassMsg({ type: 'success', text: 'Account password updated successfully!' });
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

    const validCloudPrivateTabs = useMemo(() => (cloudTabs?.privateTabs || []).filter(isValidSyncTab), [cloudTabs?.privateTabs]);
    const validCloudWorkTabs = useMemo(() => (cloudTabs?.workTabs || []).filter(isValidSyncTab), [cloudTabs?.workTabs]);
    const allValidCloudTabs = useMemo(() => [...validCloudPrivateTabs, ...validCloudWorkTabs], [validCloudPrivateTabs, validCloudWorkTabs]);
    const totalCloudTabs = allValidCloudTabs.length;

    const validPrivateTabsCount = useTabStore(state => (state.privateTabs || []).filter(isValidSyncTab).length);
    const validWorkTabsCount = useTabStore(state => (state.workTabs || []).filter(isValidSyncTab).length);
    const totalLocalActiveTabs = validPrivateTabsCount + validWorkTabsCount;

    // Status details
    const getStatusDetails = () => {
        if (!user) return { label: 'Guest', color: isBright ? 'text-zinc-500' : 'text-white/40', bg: isBright ? 'bg-black/5' : 'bg-white/10', border: isBright ? 'border-black/10' : 'border-white/10' };
        if (isSyncing) return { label: 'Syncing...', color: isBright ? 'text-blue-600 animate-pulse' : 'text-blue-400 animate-pulse', bg: isBright ? 'bg-blue-500/15' : 'bg-blue-500/20', border: isBright ? 'border-blue-500/25' : 'border-blue-500/30' };
        if (syncStatus === 'synced') return { label: 'Synced', color: isBright ? 'text-emerald-700' : 'text-emerald-400', bg: isBright ? 'bg-emerald-500/15' : 'bg-emerald-500/20', border: isBright ? 'border-emerald-500/25' : 'border-emerald-500/30' };
        return { label: 'Local Only', color: isBright ? 'text-zinc-600' : 'text-white/60', bg: isBright ? 'bg-black/5' : 'bg-white/10', border: isBright ? 'border-black/10' : 'border-white/15' };
    };

    const statusDetails = getStatusDetails();

    const CATEGORIES = [
        { id: 'sync', label: 'Sync', icon: RefreshCw },
        { id: 'tabs', label: 'Tabs', icon: Layers },
        { id: 'backups', label: 'Backups', icon: Cloud },
        { id: 'profile', label: 'Profile', icon: User },
    ];

    const activeIndex = CATEGORIES.findIndex(cat => cat.id === activeCategory);

    return (
        <div 
            className={`fixed top-[4.75rem] left-10 md:left-16 z-[70000] w-[420px] max-w-[calc(100vw-24px)] max-h-[85vh] flex flex-col overflow-hidden ${
                isBright 
                    ? 'bg-white/85 backdrop-blur-3xl border border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.14)]' 
                    : 'bg-[#0c0d14]/92 backdrop-blur-3xl border border-white/[0.08] text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]'
            } rounded-3xl p-4 select-none origin-top-left ${
                isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'
            }`} 
            onClick={e => e.stopPropagation()}
        >
            {/* Minimal Header */}
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                <div 
                    className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    onClick={() => setActiveCategory('profile')}
                    title="Profile & Settings"
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
                            <span className="font-mono">{getAvatarEmoji(activeProfile?.avatar) || (username || 'U').substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                            <h3 className={`font-semibold text-xs truncate max-w-[170px] group-hover:text-accent transition-colors ${isBright ? 'text-zinc-900' : 'text-white'}`}>{username}</h3>
                            {user && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />}
                        </div>
                        <p className={`text-[11px] truncate ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                            {user ? user.email : 'Local Workspace'}
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
            <div className={`relative flex p-1 rounded-full mb-3.5 border shadow-xs backdrop-blur-2xl ${
                isBright 
                    ? 'bg-black/[0.04] border-black/[0.06]' 
                    : 'bg-[#0c0d14]/78 border-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
            }`}>
                {/* Animated Sliding Pill (Matching Spaces Switcher Ease & Dynamics) */}
                <div 
                    className={`absolute top-1 bottom-1 w-[calc(25%-2px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isBright
                            ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                            : 'border shadow-xs'
                    }`}
                    style={{ 
                        left: '4px',
                        transform: `translateX(${activeIndex * 100}%)`,
                        ...(!isBright ? {
                            borderColor: 'var(--accent-30)',
                            backgroundColor: 'var(--accent-15)',
                            boxShadow: '0 0 12px var(--accent-15)'
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
                            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-full transition-colors duration-300 cursor-pointer whitespace-nowrap select-none ${
                                isActive 
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold') 
                                    : (isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/45 hover:text-white')
                            }`}
                        >
                            <Icon size={12} className={isActive ? (cat.id === 'sync' && isSyncing ? 'animate-spin text-accent' : (isBright ? 'text-zinc-950' : 'text-accent')) : (isBright ? 'text-zinc-400' : 'text-white/40')} />
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
                                <div className={`p-3.5 ${isBright ? 'bg-white/70 border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-2xl space-y-2.5`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-blue-500 animate-pulse'}`} />
                                            <div>
                                                <span className={`text-xs font-semibold block ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {lastSyncTime ? `Last sync ${lastSyncTime}` : 'Cloud Connected'}
                                                </span>
                                                <span className={`text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>AES-256 zero-knowledge</span>
                                            </div>
                                        </div>

                                        {/* Primary Compact Sync Button */}
                                        <button
                                            onClick={syncNow}
                                            disabled={isSyncing}
                                            className="px-3.5 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-[0_0_10px_var(--accent-15)]"
                                        >
                                            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                                            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                                        </button>
                                    </div>

                                    {/* Auto-Sync Toggle Row */}
                                    <div className={`pt-2 border-t ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'} flex items-center justify-between`}>
                                        <span className={`text-xs font-medium ${isBright ? 'text-zinc-700' : 'text-white/80'}`}>
                                            Auto-sync changes
                                        </span>
                                        <button
                                            type="button"
                                            onClick={toggleAutoSync}
                                            className={`w-8 h-4.5 rounded-full flex items-center p-0.5 transition-all duration-300 cursor-pointer ${
                                                autoSyncEnabled ? 'bg-accent shadow-[0_0_8px_var(--accent-40)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                            }`}
                                            title={autoSyncEnabled ? 'Disable Auto-Sync' : 'Enable Auto-Sync'}
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
                                            <Sliders size={11} className="text-accent" /> SYNC ITEMS
                                        </span>
                                    </div>

                                    <div className={`rounded-2xl border ${isBright ? 'bg-white/60 border-black/[0.06] divide-black/[0.05]' : 'bg-white/[0.02] border-white/[0.05] divide-white/[0.04]'} divide-y overflow-hidden`}>
                                        {[
                                            { key: 'vault', label: 'Passwords', count: isVaultUnlocked ? `${vaultCount} items` : 'Encrypted', icon: Key },
                                            { key: 'tabs', label: 'Open Tabs', count: `${totalLocalActiveTabs} local tabs`, icon: Layers },
                                            { key: 'settings', label: 'Settings & Theme', count: 'Preferences', icon: Palette },
                                            { key: 'history', label: 'Browsing History', count: `${historyCount} entries`, icon: History }
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
                                    <h4 className={`text-xs font-bold ${isBright ? 'text-zinc-900' : 'text-white'}`}>End-to-End Encrypted Cloud Sync</h4>
                                    <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-white/50'} mt-1`}>
                                        Sign in to synchronize passwords, open tabs, and settings across your devices with zero-knowledge AES-256 encryption.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        closePopover();
                                        openModal('auth');
                                    }}
                                    className="w-full py-2.5 bg-accent text-black font-bold rounded-full text-xs transition hover:scale-[1.01] cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    Sign In / Register <ArrowRight size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. TABS TAB (OTHER DEVICES) */}
                {activeCategory === 'tabs' && (
                    <div className="animate-fade-in space-y-3 text-left">
                        <div className={`p-3.5 ${isBright ? 'bg-white/70 border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-2xl space-y-2.5`}>
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <Layers size={13} className="text-accent" /> Other Devices {totalCloudTabs > 0 && `(${totalCloudTabs})`}
                                </span>
                                {totalCloudTabs > 0 && (
                                    <button
                                        onClick={() => restoreAllCloudTabs('personal')}
                                        className="text-accent hover:underline font-semibold text-xs cursor-pointer px-2 py-0.5 rounded-full"
                                    >
                                        Open All
                                    </button>
                                )}
                            </div>

                            {totalCloudTabs === 0 ? (
                                <div className={`text-center py-7 text-xs ${isBright ? 'text-zinc-400' : 'text-white/40'} space-y-1.5`}>
                                    <Layers size={22} className="text-accent/40 mx-auto opacity-70" />
                                    <p className={`font-medium ${isBright ? 'text-zinc-700' : 'text-white/70'}`}>No tabs from other devices</p>
                                    <p className="text-[10px] opacity-60">Tabs opened on your other devices will appear here automatically.</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto hide-scroll">
                                    {allValidCloudTabs.map((tab, idx) => {
                                        const cleanTitle = getCleanTabTitle(tab);
                                        return (
                                            <div 
                                                key={tab.id || idx}
                                                onClick={() => openCloudTab(tab, 'personal')}
                                                className={`px-3 py-2 rounded-xl border transition cursor-pointer flex items-center justify-between group active:scale-[0.99] ${
                                                    isBright ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.04]' : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04] hover:border-accent/40'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                                    {tab.url ? (
                                                        <img 
                                                            src={`https://www.google.com/s2/favicons?sz=32&domain=${tab.url}`} 
                                                            alt="" 
                                                            className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                                            onError={e => e.target.style.display = 'none'} 
                                                        />
                                                    ) : <Globe size={13} className="opacity-40" />}
                                                    <span className={`text-xs block font-medium truncate ${isBright ? 'text-zinc-800' : 'text-white/90'} group-hover:text-accent transition-colors`}>
                                                        {cleanTitle}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity font-semibold shrink-0">
                                                    Open →
                                                </span>
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
                        {showPushBackupForm && user && (
                            <div className={`p-3.5 ${isBright ? 'bg-white/95 border-accent/40 shadow-xl' : 'bg-black/60 border-accent/30'} border rounded-2xl animate-slide-down-fade space-y-2.5`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                                        <UploadCloud size={12} /> New Cloud Snapshot
                                    </span>
                                    <button onClick={() => setShowPushBackupForm(false)} className="text-white/40 hover:text-white text-xs cursor-pointer">Cancel</button>
                                </div>
                                <form onSubmit={handlePushBackup} className="space-y-2">
                                    <input
                                        type="text"
                                        value={backupLabel}
                                        onChange={(e) => setBackupLabel(e.target.value)}
                                        placeholder="Snapshot Name (e.g. Workstation Backup)"
                                        className={`w-full ${
                                            isBright 
                                                ? 'bg-black/[0.04] border-black/10 text-zinc-900 focus:border-accent' 
                                                : 'bg-white/[0.04] border-white/[0.08] text-white focus:border-accent'
                                        } border rounded-xl px-3 py-1.5 text-xs outline-none`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isCreatingBackup}
                                        className="w-full py-1.5 bg-accent text-black font-bold rounded-full text-xs shadow-md transition hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                                    >
                                        {isCreatingBackup ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                                        Save Snapshot
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Snapshots Version History */}
                        <div className={`p-3.5 ${isBright ? 'bg-white/70 border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-2xl space-y-2.5`}>
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <Cloud size={13} className="text-accent" /> Cloud Snapshots {cloudBackups.length > 0 && `(${cloudBackups.length})`}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => useSyncStore.getState().fetchCloudBackups()} 
                                        className="hover:text-accent flex items-center gap-1 text-[11px] text-white/50 cursor-pointer p-1 rounded-full hover:bg-white/[0.05]"
                                        title="Refresh"
                                    >
                                        <RefreshCw size={11} />
                                    </button>
                                    {user && !showPushBackupForm && (
                                        <button
                                            onClick={() => setShowPushBackupForm(true)}
                                            className="px-3 py-0.5 rounded-full bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={10} /> Push
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isLoadingBackups ? (
                                <div className="text-center py-4 text-xs text-white/40">
                                    <RefreshCw size={13} className="animate-spin mx-auto mb-1 text-accent" />
                                    Loading snapshots...
                                </div>
                            ) : cloudBackups.length === 0 ? (
                                <div className={`text-center py-6 text-xs ${isBright ? 'text-zinc-400' : 'text-white/40'} space-y-1`}>
                                    <Cloud size={20} className="text-accent/40 mx-auto opacity-70" />
                                    <p className={`font-medium ${isBright ? 'text-zinc-700' : 'text-white/70'}`}>No cloud snapshots yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-[38vh] overflow-y-auto hide-scroll">
                                    {cloudBackups.map((bk) => (
                                        <div key={bk.id} className={`p-2.5 ${isBright ? 'bg-black/[0.02] border-black/[0.04]' : 'bg-white/[0.02] border-white/[0.04]'} border rounded-xl transition space-y-1`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'} truncate flex-1 pr-2`}>
                                                    {bk.label || 'Snapshot'}
                                                </span>
                                                <span className={`text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'} font-mono`}>
                                                    {bk.createdAt ? new Date(bk.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                                </span>
                                            </div>
                                            {bk.stats && (
                                                <div className={`flex gap-2.5 text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                                                    <span className="flex items-center gap-1"><Key size={9} className="text-accent/80" /> {bk.stats.passwords || 0}</span>
                                                    <span className="flex items-center gap-1"><Layers size={9} className="text-accent/80" /> {bk.stats.tabs || 0}</span>
                                                    <span className="flex items-center gap-1"><History size={9} className="text-accent/80" /> {bk.stats.history || 0}</span>
                                                </div>
                                            )}
                                            <div className={`flex gap-1.5 pt-1.5 border-t ${isBright ? 'border-black/[0.04]' : 'border-white/[0.04]'}`}>
                                                <button
                                                    onClick={() => restoreCloudBackup(bk)}
                                                    className="flex-1 py-1 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-full text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <DownloadCloud size={10} /> Restore
                                                </button>
                                                <button
                                                    onClick={() => deleteCloudBackup(bk.id)}
                                                    className="p-1 rounded-full text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Offline Zero-Cloud File Sync (.qsync) */}
                        <div className={`p-3 ${isBright ? 'bg-white/70 border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-2xl flex items-center justify-between`}>
                            <span className={`text-xs font-semibold ${isBright ? 'text-zinc-800' : 'text-white/80'}`}>Offline Archive</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportLocalBackup}
                                    className={`px-3.5 py-1 ${
                                        isBright ? 'bg-black/[0.04] text-zinc-800 hover:bg-black/[0.08]' : 'bg-white/[0.04] text-white hover:bg-white/[0.08]'
                                    } border border-white/[0.06] rounded-full text-[10px] font-medium transition cursor-pointer hover:border-accent/40 flex items-center gap-1`}
                                >
                                    <Download size={11} className="text-accent" /> Export
                                </button>
                                <label className={`px-3.5 py-1 ${
                                    isBright ? 'bg-black/[0.04] text-zinc-800 hover:bg-black/[0.08]' : 'bg-white/[0.04] text-white hover:bg-white/[0.08]'
                                } border border-white/[0.06] rounded-full text-[10px] font-medium transition cursor-pointer hover:border-accent/40 flex items-center gap-1`}>
                                    <Upload size={11} className="text-accent" /> Import
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
                        <div className={`p-3.5 ${isBright ? 'bg-white/70 border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-2xl space-y-2.5`}>
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <User size={13} className="text-accent" /> Active Profile
                                </span>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Edit3 size={11} /> {isEditing ? 'Cancel' : 'Edit'}
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
                                            <span className="font-mono text-sm">{getAvatarEmoji(activeProfile?.avatar) || (username || 'U').substring(0, 2).toUpperCase()}</span>
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
                                                className={`flex-1 ${
                                                    isBright ? 'bg-black/[0.04] text-zinc-900' : 'bg-white/[0.04] text-white'
                                                } border border-white/10 rounded-xl px-2.5 py-1 text-xs font-medium outline-none focus:border-accent`}
                                            />
                                            <button
                                                onClick={handleSaveProfile}
                                                className="px-3 py-1 bg-accent text-black font-bold rounded-full text-xs cursor-pointer"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <h4 className={`text-xs font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>{username}</h4>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                                {activeProfile?.name || 'Default'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Avatar Picker Drawer */}
                            {showAvatarPicker && (
                                <div className={`p-2.5 ${isBright ? 'bg-white/95 border-black/10' : 'bg-black/80 border-white/10'} border rounded-2xl animate-slide-down-fade space-y-2`}>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {AVATAR_PRESETS.map(preset => (
                                            <button
                                                key={preset.id}
                                                onClick={() => {
                                                    setAvatarPreset(preset.id);
                                                    setCustomAvatarUrl('');
                                                    if (activeProfile) {
                                                        updateProfile(activeProfile.id, { avatar: preset.emoji });
                                                    }
                                                }}
                                                className={`h-7 rounded-xl border flex items-center justify-center text-xs transition cursor-pointer ${
                                                    avatarPreset === preset.id && !customAvatarUrl 
                                                        ? 'bg-accent/20 border-accent text-accent' 
                                                        : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.05]'
                                                }`}
                                            >
                                                {preset.emoji}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={customAvatarUrl}
                                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                                        placeholder="Or paste image URL..."
                                        className={`w-full ${isBright ? 'bg-black/[0.04]' : 'bg-white/[0.04]'} border border-white/10 rounded-xl px-2.5 py-1 text-[10px] outline-none font-mono`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Browser Profiles Switcher */}
                        <div className={`p-3.5 ${isBright ? 'bg-white/70 border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-2xl space-y-2.5`}>
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <User size={13} className="text-accent" /> Profiles ({profiles.length})
                                </span>
                                <button
                                    onClick={() => setShowAddProfile(!showAddProfile)}
                                    className="px-2.5 py-0.5 rounded-full bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-medium flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={12} /> Add
                                </button>
                            </div>

                            {/* Add Profile Drawer */}
                            {showAddProfile && (
                                <form onSubmit={handleCreateProfile} className={`p-3 ${isBright ? 'bg-white/95' : 'bg-black/60'} border border-accent/30 rounded-2xl space-y-2 animate-slide-down-fade`}>
                                    <input
                                        type="text"
                                        placeholder="New Profile Name"
                                        value={newProfileName}
                                        onChange={(e) => setNewProfileName(e.target.value)}
                                        className={`w-full ${isBright ? 'bg-black/[0.04]' : 'bg-white/[0.04]'} border border-white/10 rounded-xl px-2.5 py-1 text-xs outline-none`}
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
                                            onClick={() => setShowAddProfile(false)}
                                            className="flex-1 py-1 bg-white/5 text-white/60 rounded-full text-[10px] cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newProfileName.trim()}
                                            className="flex-1 py-1 bg-accent text-black font-bold rounded-full text-[10px] disabled:opacity-50 cursor-pointer"
                                        >
                                            Create
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
                                                    ? 'bg-accent/15 border-accent/40 text-accent font-semibold' 
                                                    : 'bg-white/[0.02] border-white/[0.04] hover:border-accent/30'
                                            }`}
                                        >
                                            <div 
                                                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                                onClick={() => { if (!isCurrent) handleSwitchProfile(p.id); }}
                                            >
                                                <span className="text-xs">{getAvatarEmoji(p.avatar)}</span>
                                                <span className="text-xs truncate">{p.name}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => handleOpenInNewWindow(p.id)}
                                                    className="p-1 rounded-full opacity-50 hover:opacity-100 transition cursor-pointer hover:bg-white/[0.05]"
                                                    title="Open in new window"
                                                >
                                                    <ExternalLink size={11} />
                                                </button>
                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => handleSwitchProfile(p.id)}
                                                        className="px-2.5 py-0.5 bg-white/[0.06] hover:bg-accent/20 hover:text-accent rounded-full text-[10px] font-medium cursor-pointer"
                                                    >
                                                        Switch
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
                        <div className={`p-3.5 ${isBright ? 'bg-white/70 border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-2xl space-y-2.5`}>
                            <button
                                onClick={() => setShowSecuritySection(!showSecuritySection)}
                                className="w-full flex items-center justify-between text-xs font-semibold cursor-pointer"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Lock size={12} className="text-accent" /> Security & Passphrase
                                </span>
                                {showSecuritySection ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            {showSecuritySection && (
                                <div className="pt-2 border-t border-white/[0.04] space-y-2.5 animate-slide-down-fade">
                                    {user && (
                                        <form onSubmit={handleChangeAccountPassword} className="space-y-2 pb-2 border-b border-white/[0.04]">
                                            <span className="text-[10px] font-bold text-accent uppercase block">Change Password</span>
                                            {passMsg && (
                                                <p className={`text-[10px] p-1.5 rounded-xl border ${passMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                                                    {passMsg.text}
                                                </p>
                                            )}
                                            <input
                                                type={showPassText ? "text" : "password"}
                                                value={currPass}
                                                onChange={(e) => setCurrPass(e.target.value)}
                                                placeholder="Current Password"
                                                className={`w-full ${isBright ? 'bg-black/[0.04]' : 'bg-white/[0.04]'} border border-white/10 rounded-xl px-2.5 py-1 text-xs outline-none`}
                                            />
                                            <input
                                                type={showPassText ? "text" : "password"}
                                                value={newPass}
                                                onChange={(e) => setNewPass(e.target.value)}
                                                placeholder="New Password (min 6 chars)"
                                                className={`w-full ${isBright ? 'bg-black/[0.04]' : 'bg-white/[0.04]'} border border-white/10 rounded-xl px-2.5 py-1 text-xs outline-none`}
                                            />
                                            <button
                                                type="submit"
                                                disabled={isChangingPass || !currPass || !newPass}
                                                className="w-full py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-full text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                                            >
                                                {isChangingPass ? 'Updating...' : 'Update Password'}
                                            </button>
                                        </form>
                                    )}

                                    {/* Local AES-256 Key */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase block">AES-256 Key</span>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassText(!showPassText)}
                                                className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer"
                                            >
                                                {showPassText ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                        <input
                                            type={showPassText ? "text" : "password"}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            className={`w-full ${isBright ? 'bg-black/[0.04]' : 'bg-white/[0.04]'} border border-white/10 rounded-xl px-2.5 py-1 text-xs font-mono outline-none`}
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
                                <LogOut size={12} /> Sign Out of QBrowse Cloud
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    closePopover();
                                    openModal('auth');
                                }}
                                className="w-full py-2.5 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-full text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                Sign In →
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
