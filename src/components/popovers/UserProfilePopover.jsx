import React, { useState } from 'react';
import { 
    User, ShieldCheck, RefreshCw, LogOut, Settings, Key, 
    Check, Sparkles, Camera, Edit3, Globe, Zap, Image as ImageIcon,
    Lock, ArrowRight, BookOpen, AlertCircle, Eye, EyeOff, Sliders,
    Palette, Layers, History, HelpCircle, Info
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useSyncStore from '../../store/useSyncStore';

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
    const { closePopover, openModal, setOnboardingStep, showToast } = useUIStore();
    const { 
        user, isSyncing, lastSyncTime, syncNow, logout, 
        masterPassword, setMasterPassword, changePassword,
        syncCategories, toggleSyncCategory 
    } = useSyncStore();

    const [username, setUsername] = useState(() => localStorage.getItem('qbrowse_profile_username') || (user ? user.email.split('@')[0] : 'Zen Explorer'));
    const [statusQuote, setStatusQuote] = useState(() => localStorage.getItem('qbrowse_profile_status') || 'Exploring the Zen web 🌌');
    const [avatarPreset, setAvatarPreset] = useState(() => localStorage.getItem('qbrowse_profile_avatar_preset') || 'rocket');
    const [customAvatarUrl, setCustomAvatarUrl] = useState(() => localStorage.getItem('qbrowse_profile_avatar_url') || '');
    
    const [isEditing, setIsEditing] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showSecuritySection, setShowSecuritySection] = useState(false);
    const [showSyncCategories, setShowSyncCategories] = useState(false);

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
        });
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

    const handleSyncKeys = () => {
        if (newPass) {
            setMasterPassword(newPass);
            showToast('Master Key updated to match new password!');
        } else if (currPass) {
            setMasterPassword(currPass);
            showToast('Master Key synced with Account Password!');
        } else {
            showToast('Enter password above to sync Master Key');
        }
    };

    const activeEmoji = AVATAR_PRESETS.find(p => p.id === avatarPreset)?.emoji || '🚀';

    return (
        <div 
            className={`absolute top-14 left-4 z-[10000] w-96 bg-[#0a0b0e]/95 backdrop-blur-3xl border border-white/15 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] p-5 text-white select-none origin-top-left ${
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
                    </div>
                )}
            </div>

            {/* Cloud Sync Status Card */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl mb-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className={user ? "text-emerald-400" : "text-white/40"} />
                        <span className="text-xs font-semibold text-white">
                            {user ? "AES-256 Cloud Sync" : "Offline / Guest Mode"}
                        </span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${user ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                        {user ? 'Active' : 'Guest'}
                    </span>
                </div>

                <p className="text-[11px] text-white/40">
                    {user ? `Last sync: ${lastSyncTime || 'Just now'} • End-to-end encrypted` : 'Sign in to sync your encrypted data across PCs.'}
                </p>

                {user ? (
                    <button
                        onClick={syncNow}
                        disabled={isSyncing}
                        className="w-full py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            closePopover();
                            openModal('auth');
                        }}
                        className="w-full py-1.5 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 cursor-pointer shadow-md"
                    >
                        Sign In / Create Account
                    </button>
                )}
            </div>

            {/* Granular Sync Categories Accordion */}
            <div className="mb-3 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
                <button
                    onClick={() => setShowSyncCategories(!showSyncCategories)}
                    className="w-full p-3 flex items-center justify-between text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Sliders size={14} className="text-accent" /> Configure Sync Categories
                    </div>
                    <span className="text-[10px] text-accent font-bold">{showSyncCategories ? 'Hide' : 'Configure'}</span>
                </button>

                {showSyncCategories && (
                    <div className="p-3 border-t border-white/10 space-y-2 animate-pop-in text-left">
                        {[
                            { key: 'vault', label: 'QVault & Passwords', icon: Key },
                            { key: 'settings', label: 'Settings & Theme', icon: Palette },
                            { key: 'tabs', label: 'Tabs & Workspaces', icon: Layers },
                            { key: 'history', label: 'History & Bookmarks', icon: History }
                        ].map((cat) => {
                            const Icon = cat.icon;
                            const isEnabled = syncCategories ? syncCategories[cat.key] !== false : true;
                            return (
                                <div key={cat.key} onClick={() => toggleSyncCategory(cat.key)} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                                    <div className="flex items-center gap-2.5">
                                        <Icon size={14} className={isEnabled ? "text-accent" : "text-white/30"} />
                                        <span className="text-xs font-medium text-white">{cat.label}</span>
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

            {/* Password & Security Dropdown Accordion */}
            <div className="mb-3 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
                <button
                    onClick={() => setShowSecuritySection(!showSecuritySection)}
                    className="w-full p-3 flex items-center justify-between text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Lock size={14} className="text-accent" /> Security & Passwords
                    </div>
                    <span className="text-[10px] text-accent font-bold">{showSecuritySection ? 'Hide' : 'Manage'}</span>
                </button>

                {showSecuritySection && (
                    <div className="p-3 border-t border-white/10 space-y-3 animate-pop-in text-left">
                        {/* Explanation Info Banner */}
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/70 leading-relaxed space-y-1">
                            <div className="flex items-center gap-1.5 text-accent font-bold text-xs mb-1">
                                <Info size={13} /> Two Passwords System Explained:
                            </div>
                            <p>🔑 <strong className="text-white">Account Password:</strong> Used to sign into Firebase Cloud.</p>
                            <p>🛡️ <strong className="text-white">Master Encryption Key:</strong> Used locally to AES-256 encrypt your Vault & tabs on your device before syncing.</p>
                        </div>

                        {/* Change Account Password Form */}
                        {user && (
                            <form onSubmit={handleChangeAccountPassword} className="space-y-2 pb-2 border-b border-white/10">
                                <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">1. Change Firebase Account Password</span>
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

                        {/* Master Encryption Passphrase */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">2. Master AES-256 Encryption Key</span>
                                <button type="button" onClick={handleSyncKeys} className="text-[10px] text-accent hover:underline font-medium">Use Account Password</button>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Key size={13} className="text-white/40 ml-1" />
                                <input
                                    type={showPassText ? "text" : "password"}
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    placeholder="Master Encryption Passphrase"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-accent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassText(!showPassText)}
                                    className="p-1.5 text-white/40 hover:text-white"
                                >
                                    {showPassText ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Introduction / Setup Wizard Re-launcher */}
            <button
                onClick={() => {
                    closePopover();
                    openModal('onboarding');
                    setOnboardingStep(0);
                }}
                className="w-full py-2 mb-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs text-white/80 hover:text-white font-medium transition cursor-pointer flex items-center justify-center gap-2"
            >
                <BookOpen size={13} className="text-accent" /> Re-open Setup Wizard
            </button>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <button
                    onClick={() => {
                        closePopover();
                        useUIStore.getState().setSettingsTab('about');
                        openModal('settings');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/80 hover:text-white font-medium transition cursor-pointer"
                >
                    <Globe size={13} className="text-accent" /> About Account
                </button>

                {user ? (
                    <button
                        onClick={() => {
                            logout();
                            closePopover();
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                        <LogOut size={13} /> Sign Out
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            closePopover();
                            openModal('auth');
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 cursor-pointer shadow-md"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </div>
    );
}
