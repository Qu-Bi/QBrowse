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
        saveOrUpdateCredential, isUnlocked, pinCode, unlockWithPin, 
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
    const [unlockMode, setUnlockMode] = useState('pin'); // 'pin' | 'password'
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
            setUnlockMode(pinCode ? 'pin' : 'password');
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
    }, [pendingSavePrompt, pinCode]);

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
            className={`fixed top-14 right-6 z-[70000] w-[350px] rounded-2xl backdrop-blur-3xl p-4 ${
                isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'
            } origin-top-right overflow-hidden select-none transition-all duration-300 ${
                isBright 
                    ? 'bg-white/85 border border-black/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.14)] text-zinc-900' 
                    : 'bg-[#0c0d14]/78 border border-white/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.85)] text-white'
            }`}
            onClick={e => e.stopPropagation()}
        >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent/80 via-amber-300/70 to-accent/80" />

            {/* Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${isBright ? 'border-black/10' : 'border-white/8'}`}>
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
                        <p className={`text-[11px] truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/45'}`} title={domain}>
                            {domain}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={dismissSavePrompt}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isBright ? 'hover:bg-black/5 text-zinc-400 hover:text-zinc-900' : 'hover:bg-white/10 text-white/40 hover:text-white'
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
                        isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900' : 'bg-black/40 border-white/8 text-white'
                    }`}>
                        <User size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                        <input 
                            type="text"
                            value={usernameInput}
                            onChange={e => setUsernameInput(e.target.value)}
                            placeholder="Username or Email"
                            className={`w-full bg-transparent text-xs outline-none font-medium ${
                                isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/25'
                            }`}
                        />
                    </div>

                    {/* Password Input */}
                    <div className={`relative flex items-center border rounded-xl px-2.5 py-1.5 transition-colors focus-within:border-accent ${
                        isBright ? 'bg-black/[0.04] border-black/10 text-zinc-900' : 'bg-black/40 border-white/8 text-white'
                    }`}>
                        <Lock size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                        <input 
                            type={showPassword ? 'text' : 'password'}
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            placeholder="Password"
                            className={`w-full bg-transparent text-xs outline-none font-mono ${
                                isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/25'
                            }`}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`p-0.5 ml-1 transition-colors cursor-pointer ${
                                isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white/80'
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
                                isBright ? 'text-zinc-400 hover:text-red-600' : 'text-white/40 hover:text-red-400'
                            }`}
                        >
                            Never for this site
                        </button>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={dismissSavePrompt}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                    isBright ? 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5' : 'text-white/60 hover:text-white hover:bg-white/5'
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
                    <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                        Your vault is locked. Enter authentication to encrypt and store this login:
                    </p>

                    {unlockMode === 'pin' ? (
                        <div className={`relative flex items-center border rounded-xl px-2.5 py-2 focus-within:border-accent ${
                            isBright ? 'bg-black/[0.04] border-black/10' : 'bg-black/40 border-white/10'
                        }`}>
                            <Lock size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                            <input 
                                ref={pinInputRef}
                                type="password"
                                inputMode="numeric"
                                value={pinInput}
                                onChange={e => { setPinInput(e.target.value); setUnlockError(''); }}
                                placeholder="Enter Quick PIN..."
                                className={`w-full bg-transparent text-xs outline-none font-mono tracking-widest ${
                                    isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/25'
                                }`}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className={`relative flex items-center border rounded-xl px-2.5 py-2 focus-within:border-accent ${
                            isBright ? 'bg-black/[0.04] border-black/10' : 'bg-black/40 border-white/10'
                        }`}>
                            <Lock size={13} className={`shrink-0 mr-2 ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                            <input 
                                ref={pinInputRef}
                                type="password"
                                value={masterPassInput}
                                onChange={e => { setMasterPassInput(e.target.value); setUnlockError(''); }}
                                placeholder="Master Password..."
                                className={`w-full bg-transparent text-xs outline-none font-mono ${
                                    isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/25'
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
                                isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white'
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
                                        isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700 hover:text-zinc-900' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
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
