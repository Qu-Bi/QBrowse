import React, { useState } from 'react';
import { 
    User, ShieldCheck, RefreshCw, LogOut, Settings, Key, 
    Check, Sparkles, Camera, Edit3, Globe, Zap, Image as ImageIcon,
    Lock, ArrowRight, BookOpen, AlertCircle, Eye, EyeOff, Sliders,
    Palette, Layers, History, HelpCircle, Info, Cloud, UploadCloud,
    DownloadCloud, Trash2, Download, Upload,
    CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useSyncStore from '../../store/useSyncStore';
import useTabStore from '../../store/useTabStore';
import useVaultStore from '../../store/useVaultStore';
import useHistoryStore from '../../store/useHistoryStore';

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

export default function UserProfilePopover({ isClosing }) {
    const { closePopover, openModal, showToast } = useUIStore();
    const { 
        user, isSyncing, syncStatus, lastSyncTime, syncNow, logout, 
        masterPassword, setMasterPassword, changePassword,
        syncCategories, toggleSyncCategory, authError,
        cloudBackups, isLoadingBackups, isCreatingBackup,
        pushManualBackup, restoreCloudBackup, deleteCloudBackup,
        exportLocalBackup, importLocalBackup
    } = useSyncStore();

    const cloudTabs = useTabStore(state => state.cloudTabs);
    const openCloudTab = useTabStore(state => state.openCloudTab);
    const restoreAllCloudTabs = useTabStore(state => state.restoreAllCloudTabs);

    const vaultCount = useVaultStore(state => state.passwords?.length || 0);
    const privateTabCount = useTabStore(state => state.privateTabs?.length || 0);
    const workTabCount = useTabStore(state => state.workTabs?.length || 0);
    const historyCount = useHistoryStore(state => state.history?.length || 0);

    const [username, setUsername] = useState(() => localStorage.getItem('qbrowse_profile_username') || (user ? user.email.split('@')[0] : 'Zen Explorer'));
    const [statusQuote, setStatusQuote] = useState(() => localStorage.getItem('qbrowse_profile_status') || 'Exploring the Zen web 🌌');
    const [avatarPreset, setAvatarPreset] = useState(() => localStorage.getItem('qbrowse_profile_avatar_preset') || 'rocket');
    const [customAvatarUrl, setCustomAvatarUrl] = useState(() => localStorage.getItem('qbrowse_profile_avatar_url') || '');
    
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

    const handleSaveProfile = () => {
        localStorage.setItem('qbrowse_profile_username', username);
        localStorage.setItem('qbrowse_profile_status', statusQuote);
        localStorage.setItem('qbrowse_profile_avatar_preset', avatarPreset);
        localStorage.setItem('qbrowse_profile_avatar_url', customAvatarUrl);
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
            await changePassword(currPass, newPass);
            setCurrPass('');
            setNewPass('');
            setPassMsg({ type: 'success', text: 'Account password updated successfully!' });
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

    const totalCloudTabs = (cloudTabs?.privateTabs?.length || 0) + (cloudTabs?.workTabs?.length || 0);
    const activeEmoji = AVATAR_PRESETS.find(p => p.id === avatarPreset)?.emoji || '🚀';

    // Format status label and color
    const getStatusDetails = () => {
        if (!user) return { label: 'Guest Mode (Offline)', color: 'text-white/40', bg: 'bg-white/10', border: 'border-white/10' };
        if (isSyncing) return { label: 'Syncing Changes...', color: 'text-blue-400 animate-pulse', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
        if (syncStatus === 'synced') return { label: 'Encrypted & Synced', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
        return { label: 'Encrypted (Local)', color: 'text-white/60', bg: 'bg-white/10', border: 'border-white/15' };
    };

    const statusDetails = getStatusDetails();

    return (
        <div 
            className={`absolute top-14 left-4 z-[10000] w-[420px] max-h-[85vh] overflow-y-auto hide-scroll bg-[#0a0b0e]/95 backdrop-blur-3xl border border-white/15 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] p-5 text-white select-none origin-top-left ${
                isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'
            }`} 
            onClick={e => e.stopPropagation()}
        >
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Profile Avatar & Header */}
            <div className="flex flex-col items-center text-center relative mb-4">
                <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                    <div className="w-20 h-20 rounded-3xl bg-accent-10 text-accent border-2 border-accent/40 flex items-center justify-center text-3xl shadow-xl shadow-accent/10 transition-transform group-hover:scale-105 overflow-hidden">
                        {customAvatarUrl ? (
                            <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setCustomAvatarUrl('')} />
                        ) : (
                            <span>{activeEmoji}</span>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-black border-2 border-[#0c0d10] flex items-center justify-center shadow-md group-hover:scale-110 transition">
                        <Camera size={12} />
                    </div>
                </div>

                {/* Avatar Picker Dropdown */}
                {showAvatarPicker && (
                    <div className="w-full bg-black/70 border border-white/10 rounded-2xl p-3 mt-3 animate-pop-in space-y-2 text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Select Avatar Emoji</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {AVATAR_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        setAvatarPreset(preset.id);
                                        setCustomAvatarUrl('');
                                    }}
                                    className={`h-9 rounded-xl border flex items-center justify-center text-lg transition cursor-pointer ${avatarPreset === preset.id && !customAvatarUrl ? 'bg-accent/20 border-accent text-accent scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    title={preset.name}
                                >
                                    {preset.emoji}
                                </button>
                            ))}
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 pt-1">Or Image URL</p>
                        <div className="flex items-center gap-1.5">
                            <ImageIcon size={13} className="text-white/40 ml-1" />
                            <input
                                type="text"
                                value={customAvatarUrl}
                                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                                placeholder="https://image-link.png"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                            />
                        </div>
                    </div>
                )}

                {/* Username & Bio Edit */}
                {isEditing ? (
                    <div className="w-full space-y-2 mt-3 text-left">
                        <div>
                            <label className="text-[10px] font-bold text-white/50 block mb-0.5">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-white/50 block mb-0.5">Status Mood</label>
                            <input
                                type="text"
                                value={statusQuote}
                                onChange={(e) => setStatusQuote(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-accent"
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            className="w-full py-1.5 bg-accent text-black font-bold rounded-xl text-xs shadow-md transition hover:scale-105 cursor-pointer mt-1"
                        >
                            Save Profile
                        </button>
                    </div>
                ) : (
                    <div className="mt-3">
                        <div className="flex items-center justify-center gap-1.5">
                            <h3 className="font-bold text-base text-white">{username}</h3>
                            <button onClick={() => setIsEditing(true)} className="text-white/40 hover:text-white transition p-0.5" title="Edit Profile Name">
                                <Edit3 size={13} />
                            </button>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">{statusQuote}</p>
                        {user && <p className="text-[10px] text-accent/80 font-mono mt-0.5">{user.email}</p>}
                    </div>
                )}
            </div>

            {/* Cloud Sync Status Card */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl mb-3 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className={user ? "text-emerald-400" : "text-white/40"} />
                        <span className="text-xs font-semibold text-white">
                            {user ? "AES-256 Cloud Sync" : "Offline / Guest Mode"}
                        </span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${statusDetails.bg} ${statusDetails.color} ${statusDetails.border}`}>
                        {statusDetails.label}
                    </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>{user ? `Last sync: ${lastSyncTime || 'Just now'}` : 'Sign in to sync across devices'}</span>
                    <span className="font-mono text-[10px] text-white/40">v1.2.1</span>
                </div>

                {/* Main Action Buttons */}
                {user ? (
                    <div className="flex gap-2">
                        <button
                            onClick={syncNow}
                            disabled={isSyncing}
                            className="flex-1 py-2 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                            onClick={() => setShowPushBackupForm(!showPushBackupForm)}
                            className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <UploadCloud size={13} className="text-accent" />
                            Push Backup
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            closePopover();
                            openModal('auth');
                        }}
                        className="w-full py-2.5 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                        Sign In / Create Account <ArrowRight size={14} />
                    </button>
                )}
            </div>

            {/* Manual Backup Push Form Drawer (User's direct request) */}
            {showPushBackupForm && user && (
                <div className="mb-3 p-3.5 bg-black/50 border border-accent/30 rounded-2xl animate-pop-in space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                            <UploadCloud size={14} /> Push Manual Version to Cloud
                        </span>
                        <button onClick={() => setShowPushBackupForm(false)} className="text-white/40 hover:text-white text-xs">Cancel</button>
                    </div>
                    <p className="text-[11px] text-white/60">
                        Create a permanent cloud snapshot of your current tabs ({privateTabCount + workTabCount}), vault ({vaultCount}), settings, and history.
                    </p>
                    <form onSubmit={handlePushBackup} className="space-y-2">
                        <input
                            type="text"
                            value={backupLabel}
                            onChange={(e) => setBackupLabel(e.target.value)}
                            placeholder="Snapshot Name (e.g. Workstation 1, Pre-update tabs)"
                            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                        />
                        <button
                            type="submit"
                            disabled={isCreatingBackup}
                            className="w-full py-2 bg-accent text-black font-bold rounded-xl text-xs shadow-md transition hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            {isCreatingBackup ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                            {isCreatingBackup ? 'Encrypting & Uploading...' : 'Save & Push Version to Cloud'}
                        </button>
                    </form>
                </div>
            )}

            {/* Cloud Backup Version History (User's direct request) */}
            {user && (
                <div className="mb-3 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
                    <button
                        onClick={() => setShowBackupsSection(!showBackupsSection)}
                        className="w-full p-3 flex items-center justify-between text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <Cloud size={14} className="text-accent" />
                            <span>Cloud Backup Versions</span>
                            {cloudBackups.length > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-accent/20 text-accent rounded-full">
                                    {cloudBackups.length}
                                </span>
                            )}
                        </div>
                        {showBackupsSection ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                    </button>

                    {showBackupsSection && (
                        <div className="p-3 border-t border-white/10 space-y-2.5 animate-pop-in text-left">
                            <div className="flex items-center justify-between text-[11px] text-white/50">
                                <span>Saved Cloud Versions</span>
                                <button onClick={() => useSyncStore.getState().fetchCloudBackups()} className="hover:text-accent flex items-center gap-1">
                                    <RefreshCw size={10} /> Refresh
                                </button>
                            </div>

                            {isLoadingBackups ? (
                                <div className="text-center py-4 text-xs text-white/40">Loading backups...</div>
                            ) : cloudBackups.length === 0 ? (
                                <div className="text-center py-4 text-xs text-white/40 bg-white/5 rounded-xl border border-white/5">
                                    No manual cloud backups yet. Click "Push Backup" above to save one.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-52 overflow-y-auto hide-scroll">
                                    {cloudBackups.map((bk) => (
                                        <div key={bk.id} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white truncate flex-1 pr-2">{bk.label || 'Cloud Snapshot'}</span>
                                                <span className="text-[10px] text-white/40 font-mono">
                                                    {bk.createdAt ? new Date(bk.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            {bk.stats && (
                                                <div className="flex gap-2 text-[10px] text-white/50">
                                                    <span>🛡️ {bk.stats.passwords || 0} Passwords</span>
                                                    <span>📑 {bk.stats.tabs || 0} Tabs</span>
                                                    <span>🕒 {bk.stats.history || 0} History</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2 pt-1 border-t border-white/5">
                                                <button
                                                    onClick={() => restoreCloudBackup(bk)}
                                                    className="flex-1 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <DownloadCloud size={11} /> Restore Snapshot
                                                </button>
                                                <button
                                                    onClick={() => deleteCloudBackup(bk.id)}
                                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded-lg transition cursor-pointer"
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
                <div className="mb-3 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
                    <button
                        onClick={() => setShowCloudTabsSection(!showCloudTabsSection)}
                        className="w-full p-3 flex items-center justify-between text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <Layers size={14} className="text-accent" />
                            <span>Cloud Tabs (Other Devices)</span>
                            {totalCloudTabs > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-accent/20 text-accent rounded-full">
                                    {totalCloudTabs}
                                </span>
                            )}
                        </div>
                        {showCloudTabsSection ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                    </button>

                    {showCloudTabsSection && (
                        <div className="p-3 border-t border-white/10 space-y-2 animate-pop-in text-left">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/50">Synced Open Tabs</span>
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
                                <div className="text-center py-4 text-xs text-white/40 bg-white/5 rounded-xl">
                                    No cloud tabs synced yet. Click "Sync Now" to push your open tabs.
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto hide-scroll">
                                    {[...(cloudTabs?.privateTabs || []), ...(cloudTabs?.workTabs || [])].map((tab, idx) => (
                                        <div 
                                            key={tab.id || idx}
                                            onClick={() => openCloudTab(tab, 'personal')}
                                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 rounded-xl transition cursor-pointer flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                                {tab.url ? (
                                                    <img 
                                                        src={`https://www.google.com/s2/favicons?sz=32&domain=${tab.url}`} 
                                                        alt="" 
                                                        className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                                        onError={e => e.target.style.display = 'none'} 
                                                    />
                                                ) : <Globe size={13} className="text-white/40" />}
                                                <span className="text-xs text-white/90 truncate group-hover:text-accent transition">
                                                    {tab.title || tab.url}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-accent opacity-0 group-hover:opacity-100 transition font-bold flex-shrink-0">
                                                Open →
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Granular Sync Categories Accordion */}
            <div className="mb-3 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
                <button
                    onClick={() => setShowSyncCategories(!showSyncCategories)}
                    className="w-full p-3 flex items-center justify-between text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Sliders size={14} className="text-accent" /> 
                        <span>Configure Sync Categories</span>
                    </div>
                    {showSyncCategories ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                </button>

                {showSyncCategories && (
                    <div className="p-3 border-t border-white/10 space-y-2 animate-pop-in text-left">
                        {[
                            { key: 'vault', label: 'QVault & Passwords', count: `${vaultCount} items`, icon: Key },
                            { key: 'settings', label: 'Settings & Theme', count: 'Synced', icon: Palette },
                            { key: 'tabs', label: 'Tabs & Workspaces', count: `${privateTabCount + workTabCount} tabs`, icon: Layers },
                            { key: 'history', label: 'History & Bookmarks', count: `${historyCount} entries`, icon: History }
                        ].map((cat) => {
                            const Icon = cat.icon;
                            const isEnabled = syncCategories ? syncCategories[cat.key] !== false : true;
                            return (
                                <div key={cat.key} onClick={() => toggleSyncCategory(cat.key)} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                                    <div className="flex items-center gap-2.5">
                                        <Icon size={14} className={isEnabled ? "text-accent" : "text-white/30"} />
                                        <div>
                                            <span className="text-xs font-medium text-white block">{cat.label}</span>
                                            <span className="text-[10px] text-white/40">{cat.count}</span>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        className={`w-8 h-4.5 rounded-full flex items-center p-0.5 transition-all duration-300 ${isEnabled ? 'bg-accent shadow-[0_0_8px_var(--accent-40)]' : 'bg-white/20'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${isEnabled ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Offline File Backup & Restore (Zero-cloud backup) */}
            <div className="mb-3 p-3 bg-white/5 border border-white/10 rounded-2xl flex gap-2">
                <button
                    onClick={exportLocalBackup}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                    title="Export encrypted file (.qsync)"
                >
                    <Download size={13} className="text-accent" />
                    Export .qsync File
                </button>
                <label className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload size={13} className="text-accent" />
                    Import .qsync
                    <input type="file" accept=".qsync,.json" onChange={handleImportFile} className="hidden" />
                </label>
            </div>

            {/* Security & Password Management Accordion */}
            <div className="mb-3 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
                <button
                    onClick={() => setShowSecuritySection(!showSecuritySection)}
                    className="w-full p-3 flex items-center justify-between text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Lock size={14} className="text-accent" /> 
                        <span>Security & Password</span>
                    </div>
                    {showSecuritySection ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                </button>

                {showSecuritySection && (
                    <div className="p-3 border-t border-white/10 space-y-3 animate-pop-in text-left">
                        {/* Change Account Password Form */}
                        {user && (
                            <form onSubmit={handleChangeAccountPassword} className="space-y-2 pb-2 border-b border-white/10">
                                <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Change Firebase Account Password</span>
                                {passMsg && (
                                    <p className={`text-[10px] p-1.5 rounded-lg border ${passMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                                        {passMsg.text}
                                    </p>
                                )}
                                <input
                                    type={showPassText ? "text" : "password"}
                                    value={currPass}
                                    onChange={(e) => setCurrPass(e.target.value)}
                                    placeholder="Current Account Password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                />
                                <input
                                    type={showPassText ? "text" : "password"}
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    placeholder="New Account Password (min 6 chars)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                />
                                <button
                                    type="submit"
                                    disabled={isChangingPass || !currPass || !newPass}
                                    className="w-full py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                                >
                                    {isChangingPass ? 'Updating...' : 'Update Account Password'}
                                </button>
                            </form>
                        )}

                        {/* Encryption Passphrase (Zero Knowledge Custom Key) */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">AES-256 Encryption Key</span>
                                <button
                                    type="button"
                                    onClick={() => setShowPassText(!showPassText)}
                                    className="text-[10px] text-white/40 hover:text-white"
                                >
                                    {showPassText ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <input
                                type={showPassText ? "text" : "password"}
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder="Derived from Account Password"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-accent"
                            />
                            <p className="text-[10px] text-white/40 leading-relaxed">
                                Used on-device to AES-256 encrypt tabs, vault, and settings. Never leaves your device unencrypted.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Logout / Switch Account */}
            {user ? (
                <button
                    onClick={logout}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
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
