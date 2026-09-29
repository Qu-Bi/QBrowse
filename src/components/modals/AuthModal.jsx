import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Key, ArrowRight, X, Loader2, UserCheck, AlertCircle, Eye, EyeOff, Check, Settings, Sparkles } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useSyncStore from '../../store/useSyncStore';
import useTabStore from '../../store/useTabStore';
import { isFirebaseConfigured, reinitializeFirebase } from '../../services/firebase';

// Apple-style synthesized unlock chime using Web Audio API
const playUnlockChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        // Crisp multi-tone harmonic chime (E5 -> A5 -> E6)
        osc1.frequency.setValueAtTime(659.25, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.16);

        osc2.frequency.setValueAtTime(1318.51, now);
        osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.36);
        osc2.stop(now + 0.36);
    } catch(e) {}
};

const AuthModal = () => {
    const { activeModal, isModalClosing, closeModal, showToast, theme } = useUIStore();
    const { signIn, signUp, user, logout, isSyncing, authError, masterPassword, setMasterPassword } = useSyncStore();
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [customMasterPass, setCustomMasterPass] = useState('');
    const [useAccountPassAsMaster, setUseAccountPassAsMaster] = useState(true);
    const [showPass, setShowPass] = useState(false);
    const [showCustomPass, setShowCustomPass] = useState(false);
    const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'authenticating' | 'success'
    const [showConfigDrawer, setShowConfigDrawer] = useState(!isFirebaseConfigured);
    const [customConfigInput, setCustomConfigInput] = useState('');

    const handleSaveCustomFirebase = async () => {
        if (!customConfigInput.trim()) return;
        try {
            let configObj = null;
            const trimmed = customConfigInput.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                configObj = JSON.parse(trimmed);
            } else if (trimmed.includes('=')) {
                configObj = {};
                trimmed.split(/\r?\n/).forEach(line => {
                    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                    if (match) {
                        let val = (match[2] || '').trim();
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            val = val.slice(1, -1);
                        }
                        const k = match[1].replace(/^VITE_FIREBASE_/, '').replace(/^FIREBASE_/, '');
                        if (k === 'API_KEY') configObj.apiKey = val;
                        if (k === 'AUTH_DOMAIN') configObj.authDomain = val;
                        if (k === 'PROJECT_ID') configObj.projectId = val;
                        if (k === 'STORAGE_BUCKET') configObj.storageBucket = val;
                        if (k === 'MESSAGING_SENDER_ID') configObj.messagingSenderId = val;
                        if (k === 'APP_ID') configObj.appId = val;
                        if (k === 'MEASUREMENT_ID') configObj.measurementId = val;
                    }
                });
            } else {
                configObj = { apiKey: trimmed };
            }

            if (configObj && configObj.apiKey) {
                localStorage.setItem('qbrowse_firebase_config', JSON.stringify(configObj));
                if (window.electronAPI?.saveFirebaseConfig) {
                    await window.electronAPI.saveFirebaseConfig(configObj);
                }
                reinitializeFirebase(configObj);
                useSyncStore.getState().initAuth();
                setShowConfigDrawer(false);
                showToast("Firebase Cloud Sync credentials configured!");
            } else {
                showToast("Invalid configuration. Please provide a valid Firebase API Key.", "error");
            }
        } catch (e) {
            showToast("Failed to parse config: " + e.message, "error");
        }
    };

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'auth';
    if (activeModal !== 'auth' && !isClosingThis) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password || authStatus !== 'idle') return;

        setAuthStatus('authenticating');
        const masterPassToUse = useAccountPassAsMaster ? password : customMasterPass;

        let success = false;
        if (mode === 'login') {
            success = await signIn(email, password, masterPassToUse);
        } else {
            success = await signUp(email, password, masterPassToUse);
        }

        if (success) {
            setAuthStatus('success');
            playUnlockChime();
            await new Promise(r => setTimeout(r, 750));
            closeModal();
            setAuthStatus('idle');
        } else {
            setAuthStatus('idle');
        }
    };

    return (
        <div 
            className={`absolute inset-0 z-[200] flex items-center justify-center p-6 ${
                isBright ? 'bg-black/25 backdrop-blur-xl text-zinc-900' : 'bg-black/80 backdrop-blur-3xl text-white'
            } font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-pop-in'}`} 
            onClick={authStatus !== 'success' ? closeModal : undefined}
        >
            <div 
                className={`w-full max-w-md rounded-3xl p-8 relative overflow-hidden transition-all duration-500 ${
                    authStatus === 'success'
                        ? 'border-emerald-500/40 shadow-[0_0_90px_rgba(16,185,129,0.35)]'
                        : (isBright 
                            ? 'bg-white/85 backdrop-blur-3xl border border-black/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.14)] text-zinc-900' 
                            : 'bg-[#0d0e12]/90 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.8)] text-white')
                }`} 
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient Glows that bloom emerald upon success */}
                <div className={`absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
                    authStatus === 'success' ? 'bg-emerald-500/25' : 'bg-accent/15'
                }`} />
                <div className={`absolute -bottom-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
                    authStatus === 'success' ? 'bg-emerald-500/20' : 'bg-accent/10'
                }`} />

                {authStatus !== 'success' && (
                    <button 
                        onClick={closeModal} 
                        className={`absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer ${
                            isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-600 hover:text-zinc-900' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
                        }`}
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Header & Reticle with Passkey/Face ID style animations */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                        {/* 4 Animated Corner Brackets */}
                        <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
                            authStatus === 'success' 
                                ? 'scale-125 opacity-0' 
                                : authStatus === 'authenticating'
                                    ? 'scale-105 animate-pulse'
                                    : 'scale-100 opacity-60'
                        }`}>
                            <span className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-md transition-colors duration-300 ${authStatus === 'authenticating' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                            <span className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 rounded-tr-md transition-colors duration-300 ${authStatus === 'authenticating' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                            <span className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 rounded-bl-md transition-colors duration-300 ${authStatus === 'authenticating' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 rounded-br-md transition-colors duration-300 ${authStatus === 'authenticating' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                        </div>

                        {/* Center Core Badge */}
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${
                            authStatus === 'success'
                                ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-500 shadow-[0_0_40px_rgba(52,211,153,0.5)] scale-110 animate-success-pulse'
                                : authStatus === 'authenticating'
                                    ? 'bg-accent/15 border-2 border-accent text-accent shadow-[0_0_30px_rgba(212,188,148,0.3)]'
                                    : 'bg-accent/10 text-accent border border-accent/25 shadow-lg shadow-accent/10'
                        }`}>
                            {/* Scanning Laser Bar during active authentication */}
                            {authStatus === 'authenticating' && (
                                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-faceid-laser pointer-events-none shadow-[0_0_8px_var(--accent)]"></div>
                            )}

                            {/* Dynamic Icon */}
                            {authStatus === 'success' ? (
                                <Check size={30} className="animate-checkmark-bloom stroke-[3]" />
                            ) : authStatus === 'authenticating' ? (
                                <Lock size={26} className="animate-pulse" />
                            ) : (
                                <ShieldCheck size={28} />
                            )}
                        </div>
                    </div>

                    <h2 className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${
                        authStatus === 'success' ? 'text-emerald-500' : (isBright ? 'text-zinc-900' : 'text-white')
                    }`}>
                        {authStatus === 'success' 
                            ? 'Cloud Sync Connected!' 
                            : authStatus === 'authenticating'
                                ? (mode === 'login' ? 'Authenticating...' : 'Creating Account...')
                                : 'QBrowse Cloud Sync'}
                    </h2>
                    <p className={`text-xs mt-1 transition-colors duration-300 ${
                        authStatus === 'success' ? 'text-emerald-500/80 font-medium' : (isBright ? 'text-zinc-500' : 'text-white/40')
                    }`}>
                        {authStatus === 'success'
                            ? 'End-to-End Encrypted Cloud Storage Linked'
                            : 'End-to-End Encrypted Firebase Firestore Sync'}
                    </p>
                </div>

                {/* Account Status when logged in */}
                {user ? (
                    <div className="space-y-4">
                        <div className={`p-4 border rounded-2xl flex items-center gap-3 ${isBright ? 'bg-black/[0.03] border-black/10' : 'bg-white/5 border-white/10'}`}>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>{user.email}</p>
                                <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                    <UserCheck size={12} /> Active Cloud Sync
                                </p>
                            </div>
                        </div>

                        {/* Master Password Setting */}
                        <div className={`p-4 border rounded-2xl space-y-2 ${isBright ? 'bg-black/[0.02] border-black/10' : 'bg-black/40 border-white/10'}`}>
                            <label className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-700' : 'text-white/70'}`}>
                                <Key size={13} className="text-accent" /> Master Encryption Password
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    placeholder="Master Passphrase"
                                    className={`flex-1 border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-accent ${
                                        isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400' : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className={`p-2 ${isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white'}`}
                                >
                                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <p className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Derives AES-GCM 256-bit keys on your device. Never leaves your hardware.</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={logout}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                    isBright 
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20' 
                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                }`}
                            >
                                Sign Out
                            </button>
                            <button
                                onClick={closeModal}
                                className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-black font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Auth Form */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Tab Selector */}
                        <div className={`flex p-1 border rounded-xl ${isBright ? 'bg-black/[0.04] border-black/10' : 'bg-black/40 border-white/10'}`}>
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    mode === 'login' 
                                        ? 'bg-accent text-black shadow-md' 
                                        : (isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/60 hover:text-white')
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('register')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    mode === 'register' 
                                        ? 'bg-accent text-black shadow-md' 
                                        : (isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/60 hover:text-white')
                                }`}
                            >
                                Register
                            </button>
                        </div>

                        {authError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                <span className="truncate">{authError}</span>
                            </div>
                        )}

                        {/* Firebase Setup Drawer for Packaged Apps (.deb, .exe) or Custom Config */}
                        {(!isFirebaseConfigured || showConfigDrawer) && (
                            <div className={`p-4 rounded-2xl border space-y-3 animate-pop-in ${
                                isBright 
                                    ? 'bg-amber-500/[0.06] border-amber-500/25 text-zinc-900' 
                                    : 'bg-amber-500/[0.08] border-amber-500/30 text-white shadow-[0_0_30px_rgba(245,158,11,0.12)]'
                            }`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                                        <Settings size={14} />
                                        <span>Cloud Sync Configuration</span>
                                    </div>
                                    {isFirebaseConfigured && (
                                        <button
                                            type="button"
                                            onClick={() => setShowConfigDrawer(false)}
                                            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <p className={`text-[11px] leading-relaxed ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                                    Paste your Firebase API Key or full <code>.env</code> / JSON config below to connect sync in this installed package.
                                </p>
                                <textarea
                                    rows={2}
                                    value={customConfigInput}
                                    onChange={(e) => setCustomConfigInput(e.target.value)}
                                    placeholder="Paste API Key (AIzaSy...) or .env lines"
                                    className={`w-full text-xs font-mono p-2.5 rounded-xl border outline-none resize-none transition-colors ${
                                        isBright 
                                            ? 'bg-white border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-amber-500' 
                                            : 'bg-black/40 border-white/10 text-white placeholder-white/30 focus:border-amber-500'
                                    }`}
                                />
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                        Saves to <code>~/.config/QBrowse/</code>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleSaveCustomFirebase}
                                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
                                    >
                                        Save & Connect
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className={`text-[11px] font-semibold block mb-1 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>Email Address</label>
                                <div className="relative flex items-center">
                                    <Mail size={14} className={`absolute left-3 ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className={`w-full border rounded-xl py-2 pl-9 pr-3 text-xs outline-none transition-colors ${
                                            isBright 
                                                ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                                : 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-accent'
                                        }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`text-[11px] font-semibold block mb-1 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>Account Password</label>
                                <div className="relative flex items-center">
                                    <Lock size={14} className={`absolute left-3 ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                                    <input
                                        type={showPass ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className={`w-full border rounded-xl py-2 pl-9 pr-9 text-xs outline-none transition-colors ${
                                            isBright 
                                                ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                                : 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-accent'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className={`absolute right-3 ${isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white'}`}
                                    >
                                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Master Encryption Key Option (Redesigned Glass Switch Card) */}
                            <div className="space-y-2 pt-1">
                                <div 
                                    onClick={() => setUseAccountPassAsMaster(!useAccountPassAsMaster)}
                                    className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 select-none ${
                                        isBright 
                                            ? (useAccountPassAsMaster 
                                                ? 'bg-black/[0.03] border-black/10 hover:border-black/20' 
                                                : 'bg-accent/5 border-accent/30')
                                            : (useAccountPassAsMaster 
                                                ? 'bg-white/[0.04] border-white/10 hover:border-white/20' 
                                                : 'bg-accent/10 border-accent/30 shadow-[0_0_20px_var(--accent-15)]')
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                            useAccountPassAsMaster 
                                                ? (isBright ? 'bg-black/5 text-zinc-600' : 'bg-white/10 text-white/70')
                                                : 'bg-accent/20 text-accent border border-accent/30 shadow-[0_0_12px_var(--accent-30)]'
                                        }`}>
                                            <Key size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-semibold leading-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                Use account password as Master Key
                                            </p>
                                            <p className={`text-[10px] mt-0.5 truncate ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                                {useAccountPassAsMaster 
                                                    ? 'Derives AES-GCM 256-bit keys from your login password' 
                                                    : 'Using dedicated custom encryption passphrase'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Smooth iOS-style Sliding Glass Switch */}
                                    <div 
                                        className={`w-10 h-5.5 rounded-full transition-colors duration-300 relative flex items-center p-0.5 flex-shrink-0 ${
                                            useAccountPassAsMaster 
                                                ? 'bg-accent shadow-[0_0_14px_var(--accent-40)]' 
                                                : (isBright ? 'bg-black/15' : 'bg-white/15')
                                        }`}
                                    >
                                        <div 
                                            className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-sm ${
                                                useAccountPassAsMaster ? 'translate-x-4.5' : 'translate-x-0'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Custom Passphrase Drawer (Smoothly expands when switch is toggled off) */}
                                {!useAccountPassAsMaster && (
                                    <div className={`p-3.5 rounded-2xl border space-y-2 animate-pop-in ${
                                        isBright 
                                            ? 'bg-black/[0.02] border-black/10' 
                                            : 'bg-black/40 border-accent/25 shadow-[0_0_25px_var(--accent-15)]'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-semibold text-accent flex items-center gap-1.5">
                                                <Key size={12} /> Custom Master Encryption Passphrase
                                            </label>
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 font-mono">
                                                AES-256
                                            </span>
                                        </div>

                                        <div className="relative flex items-center">
                                            <input
                                                type={showCustomPass ? "text" : "password"}
                                                required={!useAccountPassAsMaster}
                                                value={customMasterPass}
                                                onChange={(e) => setCustomMasterPass(e.target.value)}
                                                placeholder="Enter custom encryption passphrase"
                                                className={`w-full border rounded-xl py-2 pl-3 pr-9 text-xs outline-none transition-colors font-mono ${
                                                    isBright 
                                                        ? 'bg-white border-black/15 text-zinc-900 placeholder-zinc-400 focus:border-accent' 
                                                        : 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-accent'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCustomPass(!showCustomPass)}
                                                className={`absolute right-3 ${isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white'}`}
                                            >
                                                {showCustomPass ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                        </div>

                                        <p className={`text-[10px] leading-relaxed flex items-center gap-1.5 ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                                            <AlertCircle size={12} className="shrink-0 text-amber-500" />
                                            <span>Make sure to save this passphrase securely. QBrowse cannot recover encrypted data if lost.</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSyncing || authStatus === 'authenticating' || authStatus === 'success'}
                            className={`w-full py-3 font-bold rounded-xl text-xs transition duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 ${
                                authStatus === 'success'
                                    ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/30'
                                    : 'bg-accent text-zinc-950 shadow-lg shadow-accent/20 hover:scale-[1.01] active:scale-[0.98]'
                            }`}
                        >
                            {authStatus === 'success' ? (
                                <>
                                    <Check size={15} className="stroke-[2.5]" /> Connected!
                                </>
                            ) : authStatus === 'authenticating' ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> Authenticating & Encrypting...
                                </>
                            ) : (
                                <>
                                    {mode === 'login' ? 'Sign In to Cloud Sync' : 'Create Encrypted Account'} <ArrowRight size={14} />
                                </>
                            )}
                        </button>

                        <div className="text-center pt-2 space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    closeModal();
                                    showToast("Continuing in Guest Mode (Offline)");
                                }}
                                className={`text-[11px] transition cursor-pointer block mx-auto ${isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/40 hover:text-white'}`}
                            >
                                Continue as Guest (Offline Local Mode)
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                                className={`inline-flex items-center gap-1.5 text-[10px] transition cursor-pointer px-2.5 py-1 rounded-lg ${
                                    isBright 
                                        ? 'text-zinc-400 hover:text-zinc-700 hover:bg-black/5' 
                                        : 'text-white/35 hover:text-white/80 hover:bg-white/5'
                                }`}
                            >
                                <Settings size={11} />
                                {showConfigDrawer ? 'Hide Sync Settings' : 'Configure Custom Firebase Sync'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
