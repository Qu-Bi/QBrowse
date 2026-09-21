import React, { useState, useEffect } from 'react';
import { KeyRound, Lock, Fingerprint, X, Loader2, AlertCircle, Eye, EyeOff, Globe, Check } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

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

        // Crisp multi-tone harmonic chime
        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.16); // E6

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

const PasskeyVerificationModal = () => {
    const { passkeyPrompt, setPasskeyPrompt, showToast } = useUIStore();
    const [passwordInput, setPasswordInput] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'scanning' | 'checking-pass' | 'success'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!passkeyPrompt) {
            setPasswordInput('');
            setErrorMessage('');
            setAuthStatus('idle');
        }
    }, [passkeyPrompt]);

    // Handle Escape key to cancel
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && passkeyPrompt && authStatus !== 'success') {
                handleCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [passkeyPrompt, authStatus]);

    if (!passkeyPrompt) return null;

    const handleCancel = async () => {
        if (authStatus === 'success') return;
        if (window.electronAPI && window.electronAPI.respondPasskeyVerification) {
            await window.electronAPI.respondPasskeyVerification(passkeyPrompt.requestId, false);
        }
        setPasskeyPrompt(null);
    };

    const triggerSuccessSequence = async () => {
        setAuthStatus('success');
        playUnlockChime();
        setErrorMessage('');

        // Wait 750ms for user to enjoy the Apple-like Face ID checkmark animation
        await new Promise(r => setTimeout(r, 750));

        if (window.electronAPI && window.electronAPI.respondPasskeyVerification) {
            await window.electronAPI.respondPasskeyVerification(passkeyPrompt.requestId, true);
        }
        showToast(`Passkey verified for ${passkeyPrompt.rpId || passkeyPrompt.hostname}!`);
        setPasskeyPrompt(null);
    };

    const handleWindowsHello = async () => {
        if (authStatus !== 'idle') return;
        setAuthStatus('scanning');
        setErrorMessage('');
        try {
            const domain = passkeyPrompt.rpId || passkeyPrompt.hostname || 'the website';
            const res = await window.electronAPI.verifyWindowsHello(`Sign in to ${domain} with your QVault passkey`);
            if (res && res.verified) {
                await triggerSuccessSequence();
            } else if (res && res.status === 'Canceled') {
                setAuthStatus('idle');
                setErrorMessage('Windows Hello verification was canceled.');
            } else if (res && res.status === 'NotAvailable') {
                setAuthStatus('idle');
                setErrorMessage('Windows Hello is not configured on this PC. Please enter your Master Password or PIN.');
            } else {
                setAuthStatus('idle');
                setErrorMessage('Windows Hello verification failed. Please try again or use your password.');
            }
        } catch (e) {
            setAuthStatus('idle');
            setErrorMessage('Error triggering Windows Hello: ' + (e.message || e));
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!passwordInput.trim() || authStatus !== 'idle') return;
        setAuthStatus('checking-pass');
        setErrorMessage('');
        try {
            // Check Quick PIN first
            const storedPin = localStorage.getItem('qbrowse_vault_pin');
            if (storedPin && passwordInput.trim() === storedPin) {
                await triggerSuccessSequence();
                return;
            }

            // Check Master Password with main process
            if (window.electronAPI && window.electronAPI.checkVaultPassword) {
                const isValid = await window.electronAPI.checkVaultPassword(passwordInput.trim());
                if (isValid) {
                    await triggerSuccessSequence();
                    return;
                }
            }

            setAuthStatus('idle');
            setErrorMessage('Incorrect master password or PIN.');
        } catch (e) {
            setAuthStatus('idle');
            setErrorMessage('Verification failed: ' + (e.message || e));
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-2xl text-white font-sans animate-pop-in"
            onClick={handleCancel}
        >
            <div 
                className={`w-full max-w-md bg-[#0d0e12]/95 border rounded-3xl p-7 relative overflow-hidden transition-all duration-500 ${
                    authStatus === 'success' 
                        ? 'border-emerald-500/40 shadow-[0_0_90px_rgba(16,185,129,0.35)]' 
                        : 'border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)]'
                }`} 
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient Glows */}
                <div className={`absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
                    authStatus === 'success' ? 'bg-emerald-500/25' : 'bg-accent/15'
                }`}></div>
                <div className={`absolute -bottom-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
                    authStatus === 'success' ? 'bg-emerald-500/20' : 'bg-accent/10'
                }`}></div>

                {/* Close / Cancel Button */}
                {authStatus !== 'success' && (
                    <button 
                        onClick={handleCancel} 
                        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition text-white/50 hover:text-white cursor-pointer"
                        title="Cancel & Deny"
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Header & Biometric Reticle */}
                <div className="flex flex-col items-center text-center mb-5">
                    {/* Apple-style Face ID / Biometric Scanner Frame */}
                    <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                        {/* 4 Animated Corner Brackets */}
                        <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
                            authStatus === 'success' 
                                ? 'scale-125 opacity-0' 
                                : authStatus === 'scanning'
                                    ? 'scale-105 animate-pulse'
                                    : 'scale-100'
                        }`}>
                            <span className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : 'border-white/30'}`}></span>
                            <span className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 rounded-tr-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : 'border-white/30'}`}></span>
                            <span className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 rounded-bl-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : 'border-white/30'}`}></span>
                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 rounded-br-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : 'border-white/30'}`}></span>
                        </div>

                        {/* Center Core Badge */}
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${
                            authStatus === 'success'
                                ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.5)] scale-110 animate-success-pulse'
                                : authStatus === 'scanning'
                                    ? 'bg-accent/15 border-2 border-accent text-accent shadow-[0_0_30px_rgba(212,188,148,0.3)]'
                                    : 'bg-accent/15 text-accent border border-accent/30 shadow-lg shadow-accent/10'
                        }`}>
                            {/* Scanning Laser Bar */}
                            {authStatus === 'scanning' && (
                                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-faceid-laser pointer-events-none shadow-[0_0_8px_var(--accent)]"></div>
                            )}

                            {/* Dynamic Icon */}
                            {authStatus === 'success' ? (
                                <Check size={30} className="animate-checkmark-bloom stroke-[3]" />
                            ) : authStatus === 'scanning' ? (
                                <Fingerprint size={30} className="animate-pulse" />
                            ) : (
                                <KeyRound size={28} />
                            )}
                        </div>
                    </div>

                    <h2 className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
                        authStatus === 'success' ? 'text-emerald-400' : 'text-white'
                    }`}>
                        {authStatus === 'success' 
                            ? 'Identity Verified!' 
                            : authStatus === 'scanning'
                                ? 'Scanning Windows Hello...'
                                : 'Passkey Authentication'}
                    </h2>
                    <p className="text-xs text-white/50 mt-1">
                        {authStatus === 'success'
                            ? 'Passkey released and signed successfully'
                            : authStatus === 'scanning'
                                ? 'Touch your fingerprint sensor or enter your Windows PIN'
                                : 'Verification required to sign in with your passkey'}
                    </p>
                </div>

                {/* Website & Account Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0">
                        <Globe size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                                {passkeyPrompt.rpId || passkeyPrompt.hostname}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                                Passkey
                            </span>
                        </div>
                        <p className="text-xs text-white/50 truncate mt-0.5">
                            Account: <span className="text-white/80 font-medium">{passkeyPrompt.username || 'Passkey User'}</span>
                        </p>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-300 text-xs animate-shake">
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="flex-1">{errorMessage}</span>
                    </div>
                )}

                {/* Verification Actions */}
                <div className="space-y-4">
                    {/* Method 1: Windows Hello */}
                    <button
                        type="button"
                        onClick={handleWindowsHello}
                        disabled={authStatus !== 'idle'}
                        className={`w-full py-3 px-4 rounded-2xl font-bold transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                            authStatus === 'success'
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                                : 'bg-accent text-black hover:brightness-110 active:scale-[0.98] shadow-lg shadow-accent/20'
                        }`}
                    >
                        {authStatus === 'scanning' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Verifying with Windows Hello...</span>
                            </>
                        ) : authStatus === 'success' ? (
                            <>
                                <Check size={18} className="stroke-[3]" />
                                <span>Verified!</span>
                            </>
                        ) : (
                            <>
                                <Fingerprint size={20} />
                                <span>Verify with Windows Hello</span>
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-[10px] tracking-wider uppercase text-white/40 font-semibold">Or with Master Password / PIN</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    {/* Method 2: Master Password / PIN Form */}
                    <form onSubmit={handlePasswordSubmit} className="space-y-3">
                        <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)}
                                placeholder="Master Password or 4-digit PIN"
                                disabled={authStatus !== 'idle'}
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent focus:bg-white/[0.08] transition disabled:opacity-40"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                disabled={authStatus !== 'idle'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer disabled:opacity-40"
                            >
                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={!passwordInput.trim() || authStatus !== 'idle'}
                            className="w-full py-2.5 px-4 rounded-xl font-semibold bg-white/10 hover:bg-white/15 border border-white/10 text-white transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                        >
                            {authStatus === 'checking-pass' ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Checking credentials...</span>
                                </>
                            ) : (
                                <span>Verify & Authenticate</span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Cancel */}
                {authStatus !== 'success' && (
                    <div className="mt-5 pt-3 border-t border-white/5 flex justify-center">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-xs text-white/40 hover:text-white/80 transition cursor-pointer font-medium"
                        >
                            Cancel & Deny Request
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PasskeyVerificationModal;
