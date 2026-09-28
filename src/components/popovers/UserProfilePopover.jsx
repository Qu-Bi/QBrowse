import React, { useState, useMemo } from 'react';
import { 
    User, ShieldCheck, RefreshCw, LogOut, Settings, Key, 
    Check, Sparkles, Camera, Edit3, Globe, Zap, Image as ImageIcon,
    Lock, ArrowRight, BookOpen, AlertCircle, Eye, EyeOff, Sliders,
    Palette, Layers, History, HelpCircle, Info, Cloud, UploadCloud,
    DownloadCloud, Trash2, Download, Upload,
    CheckCircle2, ChevronDown, ChevronUp, Users, Plus, ExternalLink
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
    { name: 'Amber Gold', hex: '#d4bc94' },
    { name: 'Cyber Blue', hex: '#3b82f6' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Cyan', hex: '#06b6d4' }
];

const PROFILE_AVATARS = ['🚀', '⚡', '🦊', '👾', '🌌', '💎', '🐉', '👑', '🛡️', '🧬', '☕', '🎯'];

export default function UserProfilePopover({ isClosing }) {
    const { closePopover, openModal, showToast, theme } = useUIStore();
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const { 
        user, isSyncing, syncStatus, lastSyncTime, syncNow, logout, 
        masterPassword, setMasterPassword, changePassword,
        syncCategories, toggleSyncCategory, authError,
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
    const privateTabCount = useTabStore(state => state.privateTabs?.length || 0);
    const workTabCount = useTabStore(state => state.workTabs?.length || 0);
    const historyCount = useHistoryStore(state => state.history?.length || 0);

    const [username, setUsername] = useState(() => localStorage.getItem('qbrowse_profile_username') || activeProfile?.name || (user ? user.email.split('@')[0] : 'Zen Explorer'));
    const [statusQuote, setStatusQuote] = useState(() => localStorage.getItem('qbrowse_profile_status') || 'Exploring the Zen web 🌌');
    const [avatarPreset, setAvatarPreset] = useState(() => localStorage.getItem('qbrowse_profile_avatar_preset') || 'rocket');
    const [customAvatarUrl, setCustomAvatarUrl] = useState(() => localStorage.getItem('qbrowse_profile_avatar_url') || '');
    
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileAvatar, setNewProfileAvatar] = useState('🚀');
    const [newProfileColor, setNewProfileColor] = useState('#d4bc94');

    const [isEditing, setIsEditing] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showSecuritySection, setShowSecuritySection] = useState(false);
    const [showSyncCategories, setShowSyncCategories] = useState(false);
    const [showBackupsSection, setShowBackupsSection] = useState(false);
    const [showCloudTabsSection, setShowCloudTabsSection] = useState(false);
    const [showRuleModal, setShowRuleModal] = useState(false);

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

    const activeEmoji = AVATAR_PRESETS.find(p => p.id === avatarPreset)?.emoji || getAvatarEmoji(activeProfile?.avatar) || '🚀';

    // Format status label and color
    const getStatusDetails = () => {
        if (!user) return { label: 'Guest Mode (Offline)', color: isBright ? 'text-zinc-500' : 'text-white/40', bg: isBright ? 'bg-black/5' : 'bg-white/10', border: isBright ? 'border-black/10' : 'border-white/10' };
        if (isSyncing) return { label: 'Syncing Changes...', color: isBright ? 'text-blue-600 animate-pulse' : 'text-blue-400 animate-pulse', bg: isBright ? 'bg-blue-500/15' : 'bg-blue-500/20', border: isBright ? 'border-blue-500/25' : 'border-blue-500/30' };
        if (syncStatus === 'synced') return { label: 'Encrypted & Synced', color: isBright ? 'text-emerald-700' : 'text-emerald-400', bg: isBright ? 'bg-emerald-500/15' : 'bg-emerald-500/20', border: isBright ? 'border-emerald-500/25' : 'border-emerald-500/30' };
        return { label: 'Encrypted (Local)', color: isBright ? 'text-zinc-600' : 'text-white/60', bg: isBright ? 'bg-black/5' : 'bg-white/10', border: isBright ? 'border-black/10' : 'border-white/15' };
    };

    const statusDetails = getStatusDetails();

    return (
        <div 
            className={`fixed top-[4.75rem] left-3 md:left-4 z-[70000] w-[390px] max-h-[85vh] overflow-y-auto hide-scroll ${
                isBright 
                    ? 'bg-white/60 backdrop-blur-3xl border border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.12)]' 
                    : 'bg-[#0c0d14]/78 backdrop-blur-3xl border border-white/[0.08] text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]'
            } rounded-2xl p-4 select-none origin-top-left ${
                isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'
            }`} 
            onClick={e => e.stopPropagation()}
        >
            {/* Profile Avatar & Header */}
            <div className="flex flex-col items-center text-center relative mb-3">
                <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                    <div 
                        className={`w-14 h-14 rounded-full ${isBright ? 'bg-black/[0.04] text-zinc-900' : 'bg-white/[0.05] text-white'} border-2 flex items-center justify-center text-base font-semibold shadow-md transition-transform group-hover:scale-105 overflow-hidden`}
                        style={{ borderColor: activeProfile?.color || 'var(--accent)' }}
                    >
                        {customAvatarUrl ? (
                            <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setCustomAvatarUrl('')} />
                        ) : (
                            <span className="font-mono">{(username || 'User').substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${isBright ? 'bg-black/10 border-black/15 text-zinc-800' : 'bg-white/15 border-white/20 text-white'} flex items-center justify-center shadow-sm group-hover:scale-110 transition`}>
                        <Camera size={10} />
                    </div>
                </div>

                {/* Avatar Picker Dropdown */}
                {showAvatarPicker && (
                    <div className={`w-full ${isBright ? 'bg-white/95 border-black/10 shadow-xl' : 'bg-black/80 border-white/10'} border rounded-xl p-3 mt-3 animate-pop-in space-y-2 text-left`}>
                        <p className={`text-[10px] font-mono uppercase tracking-wider ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>Select Profile Avatar</p>
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
                                    className={`h-8 rounded-lg border flex items-center justify-center text-sm transition cursor-pointer ${
                                        avatarPreset === preset.id && !customAvatarUrl 
                                            ? (isBright ? 'bg-accent/25 border-accent text-zinc-900 scale-105 font-bold shadow-xs' : 'bg-white/15 border-white/25 text-white scale-105') 
                                            : (isBright ? 'bg-black/[0.03] border-black/10 hover:bg-black/[0.06]' : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06]')
                                    }`}
                                    title={preset.name}
                                >
                                    {preset.emoji}
                                </button>
                            ))}
                        </div>

                        <p className={`text-[10px] font-mono uppercase tracking-wider ${isBright ? 'text-zinc-500' : 'text-zinc-400'} pt-1`}>Or Image URL</p>
                        <div className="flex items-center gap-1.5">
                            <ImageIcon size={12} className={isBright ? "text-zinc-400 ml-1" : "text-zinc-400 ml-1"} />
                            <input
                                type="text"
                                value={customAvatarUrl}
                                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                                placeholder="https://image-link.png"
                                className={`flex-1 ${
                                    isBright 
                                        ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                        : 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500 focus:border-white/25'
                                } border rounded-lg px-2.5 py-1 text-xs outline-none font-mono`}
                            />
                        </div>
                    </div>
                )}

                {/* Username & Bio Edit */}
                {isEditing ? (
                    <div className="w-full space-y-2 mt-3 text-left">
                        <div>
                            <label className={`text-[10px] font-mono uppercase ${isBright ? 'text-zinc-500' : 'text-zinc-400'} block mb-0.5`}>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={`w-full ${
                                    isBright 
                                        ? 'bg-black/[0.04] border-black/10 text-zinc-900 focus:border-accent' 
                                        : 'bg-white/[0.04] border-white/10 text-white focus:border-white/25'
                                } border rounded-lg px-3 py-1 text-xs font-medium outline-none`}
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            className={`w-full py-1.5 ${
                                isBright 
                                    ? 'bg-black/[0.06] hover:bg-black/[0.1] text-zinc-900 border-black/10' 
                                    : 'bg-white/10 hover:bg-white/15 text-white border-white/12'
                            } font-medium rounded-lg text-xs transition cursor-pointer mt-1 border`}
                        >
                            Save Profile
                        </button>
                    </div>
                ) : (
                    <div className="mt-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                            <h3 className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>{username}</h3>
                            <button onClick={() => setIsEditing(true)} className={`${isBright ? 'text-zinc-400 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'} transition p-0.5`} title="Edit Profile Name">
                                <Edit3 size={12} />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            <span 
                                className="w-1.5 h-1.5 rounded-full inline-block" 
                                style={{ backgroundColor: activeProfile?.color || '#a1a1aa' }}
                            />
                            <span className={`text-[11px] font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {activeProfile?.name || 'Default Profile'}
                            </span>
                        </div>
                        {user && <p className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'} font-mono mt-0.5`}>{user.email}</p>}
                    </div>
                )}
            </div>

            {/* Chrome-like Profile Switcher Section */}
            <div className={`p-3 ${isBright ? 'bg-white/60 border-black/[0.06] shadow-xs' : 'bg-white/[0.025] border-white/[0.05]'} border rounded-xl mb-3 space-y-2.5`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-accent" />
                        <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>Browser Profiles</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isBright ? 'bg-black/[0.05] text-zinc-600' : 'bg-white/[0.06] text-white/70'} font-mono`}>
                            {profiles.length}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowAddProfile(!showAddProfile)}
                        className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium cursor-pointer transition"
                    >
                        <Plus size={13} /> Add
                    </button>
                </div>

                {/* List of profiles */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {profiles.map(p => {
                        const isCurrent = p.id === activeProfileId;
                        return (
                            <div
                                key={p.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition ${
                                    isCurrent 
                                        ? (isBright ? 'bg-accent/20 border-accent/40 shadow-xs' : 'bg-accent/15 border-accent/30 shadow-xs')
                                        : (isBright ? 'bg-white/60 border-black/[0.05] hover:bg-white/90 hover:border-black/10' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08]')
                                }`}
                            >
                                <div 
                                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                        if (!isCurrent) handleSwitchProfile(p.id);
                                    }}
                                >
                                    <div 
                                        className="w-7 h-7 rounded-md flex items-center justify-center text-sm shadow-inner shrink-0"
                                        style={{ backgroundColor: `${p.color || '#d4bc94'}25`, border: `1px solid ${p.color || '#d4bc94'}60` }}
                                    >
                                        <span>{getAvatarEmoji(p.avatar)}</span>
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xs truncate ${
                                                isCurrent 
                                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-white font-bold') 
                                                    : (isBright ? 'text-zinc-800 font-medium' : 'text-white/80 font-medium')
                                            }`}>
                                                {p.name}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-accent text-black font-bold tracking-wide uppercase">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {/* Open in new window button */}
                                    <button
                                        onClick={() => handleOpenInNewWindow(p.id)}
                                        className={`p-1.5 ${isBright ? 'text-zinc-400 hover:text-zinc-900 hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/10'} rounded-lg transition cursor-pointer`}
                                        title="Open in new window"
                                    >
                                        <ExternalLink size={13} />
                                    </button>

                                    {/* Switch button if not current */}
                                    {!isCurrent && (
                                        <button
                                            onClick={() => handleSwitchProfile(p.id)}
                                            className={`px-2 py-1 ${isBright ? 'bg-black/[0.05] hover:bg-black/10 text-zinc-800' : 'bg-white/[0.06] hover:bg-white/15 text-white'} rounded-lg text-[11px] font-medium transition cursor-pointer`}
                                        >
                                            Switch
                                        </button>
                                    )}

                                    {/* Delete button if more than 1 profile and not current */}
                                    {profiles.length > 1 && !isCurrent && (
                                        <button
                                            onClick={() => handleDeleteProfile(p.id, p.name)}
                                            className="p-1.5 text-red-400/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                                            title="Delete profile"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add Profile Inline Drawer/Form */}
                {showAddProfile && (
                    <form onSubmit={handleCreateProfile} className={`p-2.5 ${isBright ? 'bg-white/95 border-black/10 shadow-lg' : 'bg-black/40 border-white/[0.07]'} border rounded-xl space-y-2.5 animate-pop-in text-left`}>
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Create New Profile</span>
                        <input
                            type="text"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            placeholder="Profile name (e.g. Work, Research)"
                            className={`w-full ${
                                isBright 
                                    ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                    : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-accent'
                            } border rounded-lg px-2.5 py-1.5 text-xs outline-none`}
                            autoFocus
                        />

                        {/* Avatar presets */}
                        <div>
                            <label className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/50'} block mb-1`}>Choose Avatar</label>
                            <div className="grid grid-cols-6 gap-1">
                                {PROFILE_AVATARS.map(emoji => (
                                    <button
                                        type="button"
                                        key={emoji}
                                        onClick={() => setNewProfileAvatar(emoji)}
                                        className={`h-7 rounded-lg border text-sm flex items-center justify-center transition cursor-pointer ${
                                            newProfileAvatar === emoji 
                                                ? 'bg-accent/30 border-accent scale-105' 
                                                : (isBright ? 'bg-black/[0.03] border-black/10 hover:bg-black/[0.06]' : 'bg-white/5 border-white/[0.08] hover:bg-white/10')
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accent Color presets */}
                        <div>
                            <label className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/50'} block mb-1`}>Accent Theme</label>
                            <div className="flex items-center gap-2">
                                {PROFILE_COLORS.map(c => (
                                    <button
                                        type="button"
                                        key={c.hex}
                                        onClick={() => setNewProfileColor(c.hex)}
                                        className={`w-5 h-5 rounded-full border transition cursor-pointer flex items-center justify-center ${
                                            newProfileColor === c.hex ? 'scale-125 border-zinc-900 shadow-md' : (isBright ? 'border-black/20 hover:scale-110' : 'border-white/20 hover:scale-110')
                                        }`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                    >
                                        {newProfileColor === c.hex && <Check size={10} className="text-black font-bold" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowAddProfile(false)}
                                className={`flex-1 py-1.5 ${isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-600' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70'} rounded-lg text-xs font-medium transition cursor-pointer`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newProfileName.trim()}
                                className="flex-1 py-1.5 bg-accent hover:bg-accent/90 text-black rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            >
                                Create Profile
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Cloud Sync Status Card */}
            <div className={`p-3 ${isBright ? 'bg-white/60 border-black/[0.06] shadow-xs' : 'bg-white/[0.025] border-white/[0.05]'} border rounded-xl mb-3 space-y-2.5`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={15} className={user ? (isBright ? "text-emerald-600" : "text-emerald-400") : (isBright ? "text-zinc-400" : "text-white/40")} />
                        <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                            {user ? "AES-256 Cloud Sync" : "Offline / Guest Mode"}
                        </span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${statusDetails.bg} ${statusDetails.color} ${statusDetails.border}`}>
                        {statusDetails.label}
                    </span>
                </div>

                <div className={`flex items-center justify-between text-[11px] ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                    <span>{user ? `Last sync: ${lastSyncTime || 'Just now'}` : 'Sign in to sync across devices'}</span>
                    <span className={`font-mono text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>v1.2.1</span>
                </div>

                {/* Main Action Buttons */}
                {user ? (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={syncNow}
                                disabled={isSyncing}
                                className="flex-1 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <button
                                onClick={() => setShowPushBackupForm(!showPushBackupForm)}
                                className={`flex-1 py-1.5 ${
                                    isBright 
                                        ? 'bg-black/[0.05] hover:bg-black/10 text-zinc-800 border-black/10' 
                                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border-white/[0.08]'
                                } border rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5`}
                            >
                                <UploadCloud size={12} className="text-accent" />
                                Push Backup
                            </button>
                        </div>

                        {/* Auto-Sync Toggle Row */}
                        <div className={`pt-2 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.05]'} flex items-center justify-between`}>
                            <div className="flex items-center gap-2 text-left">
                                <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : (isBright ? 'bg-zinc-300' : 'bg-white/30')}`} />
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>Auto-Sync</span>
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${isBright ? 'bg-black/[0.05] text-zinc-600' : 'bg-white/[0.06] text-white/70'} font-mono`}>
                                            {autoSyncEnabled ? '5 min' : 'OFF'}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/50'} block`}>
                                        {autoSyncEnabled ? 'Syncs every 5 mins & on changes' : 'Manual sync only'}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleAutoSync}
                                className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${
                                    autoSyncEnabled ? 'bg-accent shadow-[0_0_10px_var(--accent-40)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                }`}
                                title={autoSyncEnabled ? 'Disable Auto-Sync' : 'Enable Auto-Sync'}
                            >
                                <div
                                    className="w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200"
                                    style={{
                                        transform: autoSyncEnabled ? 'translateX(16px)' : 'translateX(0px)'
                                    }}
                                />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            closePopover();
                            openModal('auth');
                        }}
                        className="w-full py-2 bg-accent text-black font-bold rounded-lg text-xs transition hover:scale-105 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                        Sign In / Create Account <ArrowRight size={14} />
                    </button>
                )}
            </div>

            {/* Manual Backup Push Form Drawer */}
            {showPushBackupForm && user && (
                <div className={`mb-3 p-3 ${isBright ? 'bg-white/95 border-accent/40 shadow-xl' : 'bg-black/50 border-accent/30'} border rounded-xl animate-pop-in space-y-2 text-left`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                            <UploadCloud size={13} /> Push Manual Version to Cloud
                        </span>
                        <button onClick={() => setShowPushBackupForm(false)} className={`${isBright ? 'text-zinc-400 hover:text-zinc-900' : 'text-white/40 hover:text-white'} text-xs`}>Cancel</button>
                    </div>
                    <p className={`text-[11px] ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                        Create a cloud snapshot of current tabs ({totalLocalActiveTabs}), vault ({vaultCount}), settings, and history.
                    </p>
                    <form onSubmit={handlePushBackup} className="space-y-2">
                        <input
                            type="text"
                            value={backupLabel}
                            onChange={(e) => setBackupLabel(e.target.value)}
                            placeholder="Snapshot Name (e.g. Workstation 1)"
                            className={`w-full ${
                                isBright 
                                    ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                    : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-accent'
                            } border rounded-lg px-2.5 py-1.5 text-xs outline-none`}
                        />
                        <button
                            type="submit"
                            disabled={isCreatingBackup}
                            className="w-full py-1.5 bg-accent text-black font-bold rounded-lg text-xs shadow-md transition hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            {isCreatingBackup ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                            Upload Snapshot
                        </button>
                    </form>
                </div>
            )}

            {/* Cloud Backup Version History */}
            {user && (
                <div className={`mb-2.5 border ${isBright ? 'border-black/[0.06] bg-white/60 shadow-xs' : 'border-white/[0.05] bg-white/[0.015]'} rounded-xl overflow-hidden`}>
                    <button
                        onClick={() => setShowBackupsSection(!showBackupsSection)}
                        className={`w-full p-2.5 px-3 flex items-center justify-between text-xs font-medium ${
                            isBright ? 'text-zinc-800 hover:text-zinc-950 hover:bg-black/[0.03]' : 'text-white/80 hover:text-white hover:bg-white/[0.03]'
                        } transition cursor-pointer`}
                    >
                        <div className="flex items-center gap-2">
                            <Cloud size={14} className="text-accent" />
                            <span>Cloud Backup Versions</span>
                            {cloudBackups.length > 0 && (
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 ${isBright ? 'bg-black/[0.05] text-zinc-600' : 'bg-white/[0.06] text-white/70'} rounded-full`}>
                                    {cloudBackups.length}
                                </span>
                            )}
                        </div>
                        {showBackupsSection ? <ChevronUp size={13} className={isBright ? "text-zinc-400" : "text-white/40"} /> : <ChevronDown size={13} className={isBright ? "text-zinc-400" : "text-white/40"} />}
                    </button>

                    {showBackupsSection && (
                        <div className={`p-2.5 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.05]'} space-y-2 text-left`}>
                            <div className={`flex items-center justify-between text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>
                                <span>Saved Cloud Versions</span>
                                <button onClick={() => useSyncStore.getState().fetchCloudBackups()} className="hover:text-accent flex items-center gap-1">
                                    <RefreshCw size={10} /> Refresh
                                </button>
                            </div>

                            {isLoadingBackups ? (
                                <div className={`text-center py-3 text-xs ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>Loading backups...</div>
                            ) : cloudBackups.length === 0 ? (
                                <div className={`text-center py-3 text-xs ${isBright ? 'text-zinc-400 bg-black/[0.02] border-black/[0.04]' : 'text-white/40 bg-white/[0.02] border-white/[0.04]'} rounded-lg border`}>
                                    No manual cloud backups yet. Click "Push Backup" above to save one.
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-52 overflow-y-auto hide-scroll">
                                    {cloudBackups.map((bk) => (
                                        <div key={bk.id} className={`p-2 ${isBright ? 'bg-black/[0.02] hover:bg-black/[0.04] border-black/[0.05]' : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04]'} border rounded-lg transition space-y-1`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'} truncate flex-1 pr-2`}>{bk.label || 'Cloud Snapshot'}</span>
                                                <span className={`text-[10px] ${isBright ? 'text-zinc-400' : 'text-white/40'} font-mono`}>
                                                    {bk.createdAt ? new Date(bk.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            {bk.stats && (
                                                <div className={`flex gap-2 text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                                                    <span>🛡️ {bk.stats.passwords || 0} Passwords</span>
                                                    <span>📑 {bk.stats.tabs || 0} Tabs</span>
                                                    <span>🕒 {bk.stats.history || 0} History</span>
                                                </div>
                                            )}
                                            <div className={`flex gap-2 pt-1 border-t ${isBright ? 'border-black/[0.05]' : 'border-white/[0.04]'}`}>
                                                <button
                                                    onClick={() => restoreCloudBackup(bk)}
                                                    className="flex-1 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <DownloadCloud size={11} /> Restore Snapshot
                                                </button>
                                                <button
                                                    onClick={() => deleteCloudBackup(bk.id)}
                                                    className="p-1 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-md transition cursor-pointer"
                                                    title="Delete Version"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Cloud Tabs (Tabs from other devices/sessions) */}
            {user && (
                <div className={`mb-2.5 border ${isBright ? 'border-black/[0.06] bg-white/60 shadow-xs' : 'border-white/[0.05] bg-white/[0.015]'} rounded-xl overflow-hidden`}>
                    <button
                        onClick={() => setShowCloudTabsSection(!showCloudTabsSection)}
                        className={`w-full p-2.5 px-3 flex items-center justify-between text-xs font-medium ${
                            isBright ? 'text-zinc-800 hover:text-zinc-950 hover:bg-black/[0.03]' : 'text-white/80 hover:text-white hover:bg-white/[0.03]'
                        } transition cursor-pointer`}
                    >
                        <div className="flex items-center gap-2">
                            <Layers size={14} className="text-accent" />
                            <span>Cloud Tabs (Other Devices)</span>
                            {totalCloudTabs > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-accent/20 text-accent rounded-full font-bold">
                                    {totalCloudTabs}
                                </span>
                            )}
                        </div>
                        {showCloudTabsSection ? <ChevronUp size={13} className={isBright ? "text-zinc-400" : "text-white/40"} /> : <ChevronDown size={13} className={isBright ? "text-zinc-400" : "text-white/40"} />}
                    </button>

                    {showCloudTabsSection && (
                        <div className={`p-2.5 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.05]'} space-y-2 text-left`}>
                            <div className="flex items-center justify-between text-[11px]">
                                <span className={isBright ? "text-zinc-500" : "text-white/50"}>Synced Open Tabs</span>
                                {totalCloudTabs > 0 && (
                                    <button
                                        onClick={() => restoreAllCloudTabs('personal')}
                                        className="text-accent hover:underline font-bold text-[11px] cursor-pointer"
                                    >
                                        Open All ({totalCloudTabs})
                                    </button>
                                )}
                            </div>

                            {totalCloudTabs === 0 ? (
                                <div className={`text-center py-3 text-xs ${isBright ? 'text-zinc-400 bg-black/[0.02]' : 'text-white/40 bg-white/[0.02]'} rounded-lg`}>
                                    No open tabs synced from other devices.
                                </div>
                            ) : (
                                <div className="space-y-1 max-h-48 overflow-y-auto hide-scroll">
                                    {allValidCloudTabs.map((tab, idx) => {
                                        const cleanTitle = getCleanTabTitle(tab);
                                        return (
                                            <div 
                                                key={tab.id || idx}
                                                onClick={() => openCloudTab(tab, 'personal')}
                                                className={`p-2 ${
                                                    isBright ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.05]' : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.04]'
                                                } hover:border-accent/40 rounded-lg transition cursor-pointer flex items-center justify-between group border`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                                    {tab.url ? (
                                                        <img 
                                                            src={`https://www.google.com/s2/favicons?sz=32&domain=${tab.url}`} 
                                                            alt="" 
                                                            className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                                            onError={e => e.target.style.display = 'none'} 
                                                        />
                                                    ) : <Globe size={13} className={isBright ? "text-zinc-400" : "text-white/40"} />}
                                                    <span className={`text-xs ${isBright ? 'text-zinc-800' : 'text-white/90'} truncate group-hover:text-accent transition`}>
                                                        {cleanTitle}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-accent opacity-0 group-hover:opacity-100 transition font-bold flex-shrink-0">
                                                    Open →
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Granular Sync Categories Accordion */}
            <div className={`mb-2.5 border ${isBright ? 'border-black/[0.06] bg-white/60 shadow-xs' : 'border-white/[0.05] bg-white/[0.015]'} rounded-xl overflow-hidden`}>
                <button
                    onClick={() => setShowSyncCategories(!showSyncCategories)}
                    className={`w-full p-2.5 px-3 flex items-center justify-between text-xs font-medium ${
                        isBright ? 'text-zinc-800 hover:text-zinc-950 hover:bg-black/[0.03]' : 'text-white/80 hover:text-white hover:bg-white/[0.03]'
                    } transition cursor-pointer`}
                >
                    <div className="flex items-center gap-2">
                        <Sliders size={14} className="text-accent" /> 
                        <span>Configure Sync Categories</span>
                    </div>
                    {showSyncCategories ? <ChevronUp size={13} className={isBright ? "text-zinc-400" : "text-white/40"} /> : <ChevronDown size={13} className={isBright ? "text-zinc-400" : "text-white/40"} />}
                </button>

                {showSyncCategories && (
                    <div className={`p-2.5 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.05]'} space-y-1.5 text-left`}>
                        {[
                            { key: 'vault', label: 'QVault & Passwords', count: isVaultUnlocked ? `${vaultCount} items` : 'Locked (Syncs on unlock)', icon: Key },
                            { key: 'settings', label: 'Settings & Theme', count: 'Synced', icon: Palette },
                            { key: 'tabs', label: 'Tabs & Pinned Apps', count: `${totalLocalActiveTabs} tabs · ${pinnedCount} pinned`, icon: Layers },
                            { key: 'history', label: 'History & Bookmarks', count: `${historyCount} entries`, icon: History }
                        ].map((cat) => {
                            const Icon = cat.icon;
                            const isEnabled = syncCategories ? syncCategories[cat.key] !== false : true;
                            return (
                                <div key={cat.key} onClick={() => toggleSyncCategory(cat.key)} className={`flex items-center justify-between p-2 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.05] hover:border-black/15' : 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]'
                                } border rounded-lg cursor-pointer transition`}>
                                    <div className="flex items-center gap-2.5">
                                        <Icon size={14} className={isEnabled ? "text-accent" : (isBright ? "text-zinc-300" : "text-white/30")} />
                                        <div>
                                            <span className={`text-xs font-medium ${isBright ? 'text-zinc-900' : 'text-white'} block`}>{cat.label}</span>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>{cat.count}</span>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all duration-300 ${
                                            isEnabled ? 'bg-accent shadow-[0_0_8px_var(--accent-40)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                        }`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isEnabled ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Offline File Backup & Restore (Zero-cloud backup) */}
            <div className={`mb-2.5 p-2.5 ${isBright ? 'bg-black/[0.02] border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'} border rounded-xl flex gap-2`}>
                <button
                    onClick={exportLocalBackup}
                    className={`flex-1 py-1.5 ${
                        isBright 
                            ? 'bg-black/[0.03] hover:bg-black/[0.06] border-black/10 text-zinc-800' 
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white'
                    } border rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5`}
                    title="Export encrypted file (.qsync)"
                >
                    <Download size={12} className="text-accent" />
                    Export .qsync
                </button>
                <label className={`flex-1 py-1.5 ${
                    isBright 
                        ? 'bg-black/[0.03] hover:bg-black/[0.06] border-black/10 text-zinc-800' 
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white'
                } border rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5`}>
                    <Upload size={12} className="text-accent" />
                    Import .qsync
                    <input type="file" accept=".qsync,.json" onChange={handleImportFile} className="hidden" />
                </label>
            </div>

            {/* Security & Password Management Accordion */}
            <div className={`mb-2.5 border ${isBright ? 'border-black/[0.06] bg-white/60 shadow-xs' : 'border-white/[0.05] bg-white/[0.015]'} rounded-xl overflow-hidden`}>
                <button
                    onClick={() => setShowSecuritySection(!showSecuritySection)}
                    className={`w-full p-2.5 px-3 flex items-center justify-between text-xs font-medium ${
                        isBright ? 'text-zinc-800 hover:text-zinc-950 hover:bg-black/[0.03]' : 'text-white/80 hover:text-white hover:bg-white/[0.03]'
                    } transition cursor-pointer`}
                >
                    <div className="flex items-center gap-2">
                        <Lock size={14} className="text-accent" /> 
                        <span>Security & Password</span>
                    </div>
                    {showSecuritySection ? <ChevronUp size={13} className={isBright ? "text-zinc-400" : "text-white/40"} /> : <ChevronDown size={13} className={isBright ? "text-zinc-400" : "text-white/40"} />}
                </button>

                {showSecuritySection && (
                    <div className={`p-2.5 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.05]'} space-y-2.5 text-left`}>
                        {/* Change Account Password Form */}
                        {user && (
                            <form onSubmit={handleChangeAccountPassword} className={`space-y-2 pb-2 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.05]'}`}>
                                <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Change Firebase Account Password</span>
                                {passMsg && (
                                    <p className={`text-[10px] p-1.5 rounded-lg border ${passMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                                        {passMsg.text}
                                    </p>
                                )}
                                <input
                                    type={showPassText ? "text" : "password"}
                                    value={currPass}
                                    onChange={(e) => setCurrPass(e.target.value)}
                                    placeholder="Current Account Password"
                                    className={`w-full ${
                                        isBright 
                                            ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                            : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-accent'
                                    } border rounded-lg px-2.5 py-1 text-xs outline-none`}
                                />
                                <input
                                    type={showPassText ? "text" : "password"}
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    placeholder="New Account Password (min 6 chars)"
                                    className={`w-full ${
                                        isBright 
                                            ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                            : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-accent'
                                    } border rounded-lg px-2.5 py-1 text-xs outline-none`}
                                />
                                <button
                                    type="submit"
                                    disabled={isChangingPass || !currPass || !newPass}
                                    className="w-full py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                                >
                                    {isChangingPass ? 'Updating...' : 'Update Account Password'}
                                </button>
                            </form>
                        )}

                        {/* Encryption Passphrase (Zero Knowledge Custom Key) */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-bold ${isBright ? 'text-emerald-700' : 'text-emerald-400'} uppercase tracking-wider block`}>AES-256 Encryption Key</span>
                                <button
                                    type="button"
                                    onClick={() => setShowPassText(!showPassText)}
                                    className={`text-[10px] ${isBright ? 'text-zinc-400 hover:text-zinc-900' : 'text-white/40 hover:text-white'}`}
                                >
                                    {showPassText ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <input
                                type={showPassText ? "text" : "password"}
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder="Derived from Account Password"
                                className={`w-full ${
                                    isBright 
                                        ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                        : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-accent'
                                } border rounded-lg px-2.5 py-1 text-xs font-mono outline-none`}
                            />
                            <p className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/40'} leading-relaxed`}>
                                Used on-device to AES-256 encrypt tabs, vault, and settings.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Logout / Switch Account */}
            {user ? (
                <button
                    onClick={logout}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                    <LogOut size={13} /> Sign Out of QBrowse Cloud
                </button>
            ) : (
                <div className="text-center">
                    <button
                        onClick={() => {
                            closePopover();
                            openModal('auth');
                        }}
                        className="text-xs text-accent hover:underline cursor-pointer"
                    >
                        Sign In with an existing account →
                    </button>
                </div>
            )}
        </div>
    );
}
