import React, { useState, useEffect, useRef } from 'react';
import { 
    KeyRound, Lock, Eye, EyeOff, X, Check, Fingerprint, 
    Shield, ArrowLeft, RefreshCw, AlertCircle, User 
} from 'lucide-react';
import useVaultStore from '../../store/useVaultStore';
import useUIStore from '../../store/useUIStore';

export default function SavePasswordBanner() {
    const { 
        pendingSavePrompt, dismissSavePrompt, addNeverSaveDomain, 
        saveOrUpdateCredential, isUnlocked, pinCode, unlockWithPin, 
        unlockWithWindowsHello, unlock 
    } = useVaultStore();

    const showToast = useUIStore(state => state.showToast);

    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockMode, setUnlockMode] = useState('pin'); // 'pin' | 'password'
    const [pinInput, setPinInput] = useState('');
    const [masterPassInput, setMasterPassInput] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const pinInputRef = useRef(null);

    useEffect(() => {
        if (pendingSavePrompt) {
            setUsernameInput(pendingSavePrompt.username || '');
            setPasswordInput(pendingSavePrompt.password || '');
            setShowPassword(false);
            setIsUnlocking(false);
            setPinInput('');
            setMasterPassInput('');
            setUnlockError('');
            setUnlockMode(pinCode ? 'pin' : 'password');
        }
    }, [pendingSavePrompt, pinCode]);

    if (!pendingSavePrompt) return null;

    const { domain, url, isUpdate, existingId } = pendingSavePrompt;

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
            className="fixed top-14 right-6 z-[70000] w-[350px] rounded-2xl bg-[#121316]/92 backdrop-blur-2xl border border-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.7)] text-white p-4 animate-slide-down-fade overflow-hidden select-none"
            onClick={e => e.stopPropagation()}
        >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent/80 via-amber-300/70 to-accent/80" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0 shadow-sm">
                        <KeyRound size={15} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white/95 leading-tight truncate">
                            {isUnlocking 
                                ? 'Unlock QVault to Save' 
                                : (isUpdate ? 'Update Password?' : 'Save Password?')
                            }
                        </h4>
                        <p className="text-[11px] text-white/45 truncate mt-0.5" title={domain}>
                            {domain}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={dismissSavePrompt}
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                    title="Dismiss"
                >
                    <X size={13} />
                </button>
            </div>

            {/* Content Body */}
            {!isUnlocking ? (
                <div className="pt-3.5 space-y-2.5">
                    {/* Username Input */}
                    <div className="relative flex items-center bg-black/40 border border-white/8 focus-within:border-accent/60 rounded-xl px-2.5 py-1.5 transition-colors">
                        <User size={13} className="text-white/40 shrink-0 mr-2" />
                        <input 
                            type="text"
                            value={usernameInput}
                            onChange={e => setUsernameInput(e.target.value)}
                            placeholder="Username or Email"
                            className="w-full bg-transparent text-xs text-white placeholder-white/25 outline-none font-medium"
                        />
                    </div>

                    {/* Password Input */}
                    <div className="relative flex items-center bg-black/40 border border-white/8 focus-within:border-accent/60 rounded-xl px-2.5 py-1.5 transition-colors">
                        <Lock size={13} className="text-white/40 shrink-0 mr-2" />
                        <input 
                            type={showPassword ? 'text' : 'password'}
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-transparent text-xs text-white placeholder-white/25 outline-none font-mono"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-white/40 hover:text-white/80 p-0.5 ml-1 transition-colors cursor-pointer"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                        <button 
                            onClick={handleNeverForSite}
                            className="text-[11px] text-white/40 hover:text-red-400 transition-colors cursor-pointer px-1 py-1"
                        >
                            Never for this site
                        </button>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={dismissSavePrompt}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition cursor-pointer"
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
                    <p className="text-[11px] text-white/60 leading-snug">
                        Your vault is locked. Enter authentication to encrypt and store this login:
                    </p>

                    {unlockMode === 'pin' ? (
                        <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-accent rounded-xl px-2.5 py-2">
                            <Lock size={13} className="text-white/40 shrink-0 mr-2" />
                            <input 
                                ref={pinInputRef}
                                type="password"
                                inputMode="numeric"
                                value={pinInput}
                                onChange={e => { setPinInput(e.target.value); setUnlockError(''); }}
                                placeholder="Enter Quick PIN..."
                                className="w-full bg-transparent text-xs text-white placeholder-white/25 outline-none font-mono tracking-widest"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="relative flex items-center bg-black/40 border border-white/10 focus-within:border-accent rounded-xl px-2.5 py-2">
                            <Lock size={13} className="text-white/40 shrink-0 mr-2" />
                            <input 
                                ref={pinInputRef}
                                type="password"
                                value={masterPassInput}
                                onChange={e => { setMasterPassInput(e.target.value); setUnlockError(''); }}
                                placeholder="Master Password..."
                                className="w-full bg-transparent text-xs text-white placeholder-white/25 outline-none font-mono"
                                autoFocus
                            />
                        </div>
                    )}

                    {unlockError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{unlockError}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <button 
                            type="button"
                            onClick={() => { setIsUnlocking(false); setUnlockError(''); }}
                            className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white transition cursor-pointer"
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
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition cursor-pointer"
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
