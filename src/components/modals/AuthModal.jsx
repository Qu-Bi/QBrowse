import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Key, ArrowRight, X, Loader, UserCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useSyncStore from '../../store/useSyncStore';

const AuthModal = () => {
    const { activeModal, isModalClosing, closeModal, showToast } = useUIStore();
    const { signIn, signUp, user, logout, isSyncing, authError, masterPassword, setMasterPassword } = useSyncStore();

    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [customMasterPass, setCustomMasterPass] = useState('');
    const [useAccountPassAsMaster, setUseAccountPassAsMaster] = useState(true);
    const [showPass, setShowPass] = useState(false);

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'auth';
    if (activeModal !== 'auth' && !isClosingThis) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return;

        const masterPassToUse = useAccountPassAsMaster ? password : customMasterPass;

        if (mode === 'login') {
            const success = await signIn(email, password, masterPassToUse);
            if (success) closeModal();
        } else {
            const success = await signUp(email, password, masterPassToUse);
            if (success) closeModal();
        }
    };

    return (
        <div className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-3xl text-white font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-pop-in'}`} onClick={closeModal}>
            <div className="w-full max-w-md bg-[#0d0e12]/90 border border-white/10 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.8)] p-8 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Ambient Glow */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

                <button onClick={closeModal} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition text-white/50 hover:text-white cursor-pointer">
                    <X size={16} />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center mb-3 shadow-lg shadow-accent/10">
                        <ShieldCheck size={28} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">QBrowse Cloud Sync</h2>
                    <p className="text-xs text-white/40 mt-1">End-to-End Encrypted Firebase Firestore Sync</p>
                </div>

                {/* Account Status when logged in */}
                {user ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{user.email}</p>
                                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                    <UserCheck size={12} /> Active Cloud Sync
                                </p>
                            </div>
                        </div>

                        {/* Master Password Setting */}
                        <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                            <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                                <Key size={13} className="text-accent" /> Master Encryption Password
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    placeholder="Master Passphrase"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-accent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="p-2 text-white/40 hover:text-white"
                                >
                                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-white/40">Derives AES-GCM 256-bit keys on your device. Never leaves your hardware.</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={logout}
                                className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                            >
                                Sign Out
                            </button>
                            <button
                                onClick={closeModal}
                                className="flex-1 py-2.5 bg-accent text-black font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Auth Form */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Tab Selector */}
                        <div className="flex p-1 bg-black/40 border border-white/10 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${mode === 'login' ? 'bg-accent text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('register')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${mode === 'register' ? 'bg-accent text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                            >
                                Register
                            </button>
                        </div>

                        {authError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                <span className="truncate">{authError}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-semibold text-white/60 block mb-1">Email Address</label>
                                <div className="relative flex items-center">
                                    <Mail size={14} className="absolute left-3 text-white/40" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-white/30 outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-white/60 block mb-1">Account Password</label>
                                <div className="relative flex items-center">
                                    <Lock size={14} className="absolute left-3 text-white/40" />
                                    <input
                                        type={showPass ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-9 text-xs text-white placeholder-white/30 outline-none focus:border-accent transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 text-white/40 hover:text-white"
                                    >
                                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Encryption Passphrase Option */}
                            <div className="pt-2 border-t border-white/5">
                                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none mb-2">
                                    <input
                                        type="checkbox"
                                        checked={useAccountPassAsMaster}
                                        onChange={(e) => setUseAccountPassAsMaster(e.target.checked)}
                                        className="rounded bg-white/10 border-white/20 text-accent focus:ring-0"
                                    />
                                    Use account password as Master Encryption Key
                                </label>

                                {!useAccountPassAsMaster && (
                                    <div className="space-y-1 mt-2">
                                        <label className="text-[11px] font-semibold text-accent block">Custom Master Encryption Password</label>
                                        <div className="relative flex items-center">
                                            <Key size={14} className="absolute left-3 text-accent" />
                                            <input
                                                type="password"
                                                required
                                                value={customMasterPass}
                                                onChange={(e) => setCustomMasterPass(e.target.value)}
                                                placeholder="Custom Passphrase"
                                                className="w-full bg-black/40 border border-accent/30 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSyncing}
                            className="w-full py-3 bg-accent text-black font-bold rounded-xl text-xs shadow-lg shadow-accent/10 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader size={14} className="animate-spin" /> Authenticating...
                                </>
                            ) : (
                                <>
                                    {mode === 'login' ? 'Sign In to Cloud Sync' : 'Create Encrypted Account'} <ArrowRight size={14} />
                                </>
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    closeModal();
                                    showToast("Continuing in Guest Mode (Offline)");
                                }}
                                className="text-[11px] text-white/40 hover:text-white transition cursor-pointer"
                            >
                                Continue as Guest (Offline Local Mode)
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
