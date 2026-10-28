import React, { useState, useEffect, useRef } from 'react';
import { 
    KeyRound, Lock, Eye, EyeOff, X, Check, Fingerprint, 
    Shield, ArrowLeft, RefreshCw, AlertCircle, User 
} from 'lucide-react';
import useVaultStore from '../../store/useVaultStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function SavePasswordBanner() {
    const { 
        pendingSavePrompt, dismissSavePrompt, addNeverSaveDomain, 
        saveOrUpdateCredential, isUnlocked, pinEnabled, unlockWithPin, 
        unlockWithWindowsHello, unlock 
    } = useVaultStore();

    const showToast = useUIStore(state => state.showToast);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockMode, setUnlockMode] = useState(pinEnabled ? 'pin' : 'password'); // 'pin' | 'password'
    const [pinInput, setPinInput] = useState('');
    const [masterPassInput, setMasterPassInput] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [displayedPrompt, setDisplayedPrompt] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    const pinInputRef = useRef(null);
    const closeTimerRef = useRef(null);

    useEffect(() => {
        if (pendingSavePrompt) {
            useVaultStore.getState().syncVaultStatus?.();
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            setDisplayedPrompt(pendingSavePrompt);
            setIsClosing(false);
            setUsernameInput(pendingSavePrompt.username || '');
            setPasswordInput(pendingSavePrompt.password || '');
            setShowPassword(false);
            setIsUnlocking(false);
            setPinInput('');
            setMasterPassInput('');
            setUnlockError('');
            setUnlockMode(pinEnabled ? 'pin' : 'password');
        } else if (displayedPrompt && !isClosing) {
            setIsClosing(true);
            closeTimerRef.current = setTimeout(() => {
                setDisplayedPrompt(null);
                setIsClosing(false);
            }, 220);
        }
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, [pendingSavePrompt, pinEnabled]);

    if (!displayedPrompt) return null;

    const { domain, url, isUpdate, existingId } = displayedPrompt;

    const handleSaveDirect = async () => {
        if (!passwordInput.trim()) {
            showToast('Password cannot be empty', 'error');
            return;
        }

        if (!isUnlocked) {
            setIsUnlocking(true);
            setTimeout(() => {
                if (pinInputRef.current) pinInputRef.current.focus();
            }, 100);
            return;
        }

        setIsSaving(true);
        try {
            await saveOrUpdateCredential({
                domain,
                url,
                username: usernameInput.trim(),
                password: passwordInput.trim(),
                isUpdate,
                existingId
            });
            showToast(isUpdate ? `Updated password for ${domain}` : `Saved password for ${domain}!`, 'success');
        } catch (err) {
            showToast(`Failed to save: ${err.message || err}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInlineUnlockAndSave = async (e) => {
        if (e) e.preventDefault();
        setUnlockError('');
        setIsSaving(true);

        try {
            let unlocked = false;
            if (unlockMode === 'pin') {
                if (!pinInput.trim()) {
                    setUnlockError('Please enter your PIN');
                    setIsSaving(false);
                    return;
                }
                unlocked = await unlockWithPin(pinInput.trim());
            } else {
                if (!masterPassInput.trim()) {
                    setUnlockError('Please enter your Master Password');
                    setIsSaving(false);
                    return;
                }
                unlocked = await unlock(masterPassInput.trim());
                if (unlocked) {
                    sessionStorage.setItem('qbrowse_vault_mp', masterPassInput.trim());
                }
            }

            if (unlocked) {
                await saveOrUpdateCredential({
                    domain,
                    url,
                    username: usernameInput.trim(),
                    password: passwordInput.trim(),
                    isUpdate,
                    existingId
                });
                showToast(isUpdate ? `Updated password for ${domain}` : `Saved password for ${domain}!`, 'success');
            } else {
                setUnlockError(unlockMode === 'pin' ? 'Incorrect PIN code' : 'Invalid Master Password');
            }
        } catch (err) {
            setUnlockError(err.message || 'Authentication failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleWindowsHelloUnlock = async () => {
        setUnlockError('');
        setIsSaving(true);
        try {
            const success = await unlockWithWindowsHello();
            if (success) {
                await saveOrUpdateCredential({
                    domain,
                    url,
                    username: usernameInput.trim(),
                    password: passwordInput.trim(),
                    isUpdate,
                    existingId
                });
                showToast(isUpdate ? `Updated password for ${domain}` : `Saved password for ${domain}!`, 'success');
            } else {
                setUnlockError('Windows Security verification failed');
            }
        } catch (err) {
            setUnlockError(err.message || 'Windows Hello error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNeverForSite = () => {
        addNeverSaveDomain(domain);
        showToast(`QVault will never ask to save passwords for ${domain}`);
    };

    return (
        <div 
            id="save-password-banner"
            style={{
                backgroundColor: isBright ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 20, 32, 0.58)',
                backdropFilter: isBright
                    ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                    : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)',
                WebkitBackdropFilter: isBright
                    ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                    : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)'
            }}
            className={`absolute top-16 right-6 z-[70000] w-[350px] rounded-3xl p-4 ${
                isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'
            } origin-top-right overflow-hidden select-none transition-all duration-300 border ${
                isBright 
                    ? 'border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.14),inset_0_1px_1px_rgba(255,255,255,0.85)]' 
                    : 'border-white/[0.10] text-white/95 shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.16)]'
            }`}
            onClick={e => e.stopPropagation()}
        >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent/80 via-amber-300/70 to-accent/80" />

            {/* Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${isBright ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0 shadow-sm">
                        <KeyRound size={15} />
                    </div>
                    <div className="min-w-0">
                        <h4 className={`text-xs font-bold leading-tight truncate ${isBright ? 'text-zinc-900' : 'text-white/95'}`}>
                            {isUnlocking 
                                ? 'Unlock QVault to Save' 
                                : (isUpdate ? 'Update Password?' : 'Save Password?')
                            }
                        </h4>
                        <p className={`text-[11px] truncate mt-0.5 ${isBright ? 'text-zinc-600' : 'text-white/70'}`} title={domain}>
                            {domain}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={dismissSavePrompt}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isBright ? 'hover:bg-black/5 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-white/65 hover:text-white'
                    }`}
                    title="Dismiss"
                >
                    <X size={13} />
                </button>
            </div>

            {/* Content Body */}
            {!isUnlocking ? (
                <div className="pt-3.5 space-y-2.5">
                    {/* Username Input */}
                    <div className={`relative flex items-center border rounded-xl px-2.5 py-1.5 transition-colors focus-within:border-accent ${
                        isBright ? 'bg-black/[0.04] border-black/[0.10] text-zinc-900 focus-within:bg-white' : 'bg-black/30 border-white/[0.10] text-white focus-within:bg-black/40'
                    }`}>
                        <User size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-500' : 'text-white/65'}`} />
                        <input 
                            type="text"
                            value={usernameInput}
                            onChange={e => setUsernameInput(e.target.value)}
                            placeholder="Username or Email"
                            className={`w-full bg-transparent text-xs outline-none font-medium ${
                                isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/45'
                            }`}
                        />
                    </div>

                    {/* Password Input */}
                    <div className={`relative flex items-center border rounded-xl px-2.5 py-1.5 transition-colors focus-within:border-accent ${
                        isBright ? 'bg-black/[0.04] border-black/[0.10] text-zinc-900 focus-within:bg-white' : 'bg-black/30 border-white/[0.10] text-white focus-within:bg-black/40'
                    }`}>
                        <Lock size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-500' : 'text-white/65'}`} />
                        <input 
                            type={showPassword ? 'text' : 'password'}
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            placeholder="Password"
                            className={`w-full bg-transparent text-xs outline-none font-mono ${
                                isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/45'
                            }`}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`p-0.5 ml-1 transition-colors cursor-pointer ${
                                isBright ? 'text-zinc-500 hover:text-zinc-800' : 'text-white/65 hover:text-white'
                            }`}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                        <button 
                            onClick={handleNeverForSite}
                            className={`text-[11px] transition-colors cursor-pointer px-1 py-1 ${
                                isBright ? 'text-zinc-500 hover:text-red-600' : 'text-white/65 hover:text-red-400'
                            }`}
                        >
                            Never for this site
                        </button>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={dismissSavePrompt}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                    isBright ? 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5' : 'text-white/75 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                Not now
                            </button>
                            <button 
                                onClick={handleSaveDirect}
                                disabled={isSaving || !passwordInput.trim()}
                                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-accent text-black hover:bg-accent/90 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isSaving ? <RefreshCw size={12} className="animate-spin" /> : null}
                                <span>{isUpdate ? 'Update' : 'Save'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Inline Unlock Body */
                <form onSubmit={handleInlineUnlockAndSave} className="pt-3.5 space-y-3">
                    <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-600' : 'text-white/75'}`}>
                        Your vault is locked. Enter authentication to encrypt and store this login:
                    </p>

                    {/* Unlock Mode Selector (Quick PIN vs Master Password) */}
                    <div className={`flex p-0.5 rounded-xl border text-[11px] font-semibold select-none ${
                        isBright ? 'bg-black/[0.03] border-black/[0.06]' : 'bg-black/25 border-white/[0.08]'
                    }`}>
                        <button
                            type="button"
                            onClick={() => {
                                setUnlockMode('pin');
                                setUnlockError('');
                                setTimeout(() => pinInputRef.current?.focus(), 50);
                            }}
                            className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                unlockMode === 'pin'
                                    ? (isBright ? 'bg-white text-zinc-950 font-bold shadow-xs border border-black/10' : 'bg-white/15 text-white font-bold shadow-xs border border-white/20')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/60 hover:text-white')
                            }`}
                        >
                            <KeyRound size={11} className={unlockMode === 'pin' ? (isBright ? 'text-amber-700' : 'text-accent') : 'opacity-60'} />
                            <span>Quick PIN</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setUnlockMode('password');
                                setUnlockError('');
                                setTimeout(() => pinInputRef.current?.focus(), 50);
                            }}
                            className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                unlockMode === 'password'
                                    ? (isBright ? 'bg-white text-zinc-950 font-bold shadow-xs border border-black/10' : 'bg-white/15 text-white font-bold shadow-xs border border-white/20')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/60 hover:text-white')
                            }`}
                        >
                            <Lock size={11} className={unlockMode === 'password' ? (isBright ? 'text-amber-700' : 'text-accent') : 'opacity-60'} />
                            <span>Master Password</span>
                        </button>
                    </div>

                    {unlockMode === 'pin' ? (
                        <div className={`relative flex items-center border rounded-xl px-2.5 py-2 transition-colors focus-within:border-accent ${
                            isBright ? 'bg-black/[0.04] border-black/[0.10] focus-within:bg-white' : 'bg-black/30 border-white/[0.10] focus-within:bg-black/40'
                        }`}>
                            <KeyRound size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-500' : 'text-white/65'}`} />
                            <input 
                                ref={pinInputRef}
                                type="password"
                                inputMode="numeric"
                                maxLength={6}
                                value={pinInput}
                                onChange={e => { setPinInput(e.target.value.replace(/\D/g, '')); setUnlockError(''); }}
                                placeholder="Enter Quick PIN (4-6 digits)..."
                                className={`w-full bg-transparent text-xs outline-none font-mono tracking-widest ${
                                    isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/45'
                                }`}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className={`relative flex items-center border rounded-xl px-2.5 py-2 transition-colors focus-within:border-accent ${
                            isBright ? 'bg-black/[0.04] border-black/[0.10] focus-within:bg-white' : 'bg-black/30 border-white/[0.10] focus-within:bg-black/40'
                        }`}>
                            <Lock size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-500' : 'text-white/65'}`} />
                            <input 
                                ref={pinInputRef}
                                type="password"
                                value={masterPassInput}
                                onChange={e => { setMasterPassInput(e.target.value); setUnlockError(''); }}
                                placeholder="Master Password..."
                                className={`w-full bg-transparent text-xs outline-none font-mono ${
                                    isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/45'
                                }`}
                                autoFocus
                            />
                        </div>
                    )}

                    {unlockError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{unlockError}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <button 
                            type="button"
                            onClick={() => { setIsUnlocking(false); setUnlockError(''); }}
                            className={`flex items-center gap-1 text-[11px] transition cursor-pointer ${
                                isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/70 hover:text-white'
                            }`}
                        >
                            <ArrowLeft size={12} />
                            <span>Back</span>
                        </button>

                        <div className="flex items-center gap-2">
                            {window.electronAPI?.unlockVaultWindowsHello && (
                                <button 
                                    type="button"
                                    onClick={handleWindowsHelloUnlock}
                                    disabled={isSaving}
                                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                        isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700 hover:text-zinc-900' : 'bg-white/[0.08] hover:bg-white/[0.12] border-white/10 text-white/80 hover:text-white'
                                    }`}
                                    title="Unlock with Windows Hello"
                                >
                                    <Fingerprint size={14} />
                                </button>
                            )}

                            <button 
                                type="submit"
                                disabled={isSaving || (unlockMode === 'pin' ? !pinInput.trim() : !masterPassInput.trim())}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-accent text-black hover:bg-accent/90 transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isSaving ? <RefreshCw size={12} className="animate-spin" /> : null}
                                <span>Unlock & Save</span>
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
