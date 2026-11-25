import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Lock, Fingerprint, X, Loader2, AlertCircle, Eye, EyeOff, Globe, Check, Usb } from 'lucide-react';
import useUIStore, { getAnimationTimeout } from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useVaultStore, { enrichPasswords } from '../../store/useVaultStore';
import { isLinuxPlatform } from '../../utils/platform';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses, getLiquidGlassCardClasses } from '../common/ContextMenuProvider';
import { useTranslation } from '../../i18n/index';

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
    const { t } = useTranslation();
    const { passkeyPrompt, setPasskeyPrompt, showToast, theme } = useUIStore();
    const activeSpace = useTabStore(state => state.activeSpace);
    const { pinEnabled, biometricsEnabled, isUnlocked, lockoutUntil } = useVaultStore();
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const osPlatform = (typeof window !== 'undefined' && window.electronAPI?.platform) || (typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('linux') ? 'linux' : typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? 'darwin' : 'win32');
    const osKey = osPlatform === 'darwin' ? 'darwin' : osPlatform === 'linux' ? 'linux' : 'win32';
    const supportsBiometrics = !isLinuxPlatform();
    const biometricLabel = t(`tools.passkey.biometrics.${osKey}`, null, osKey === 'darwin' ? 'Touch ID' : osKey === 'linux' ? 'System Biometrics' : 'Windows Hello');
    const biometricPinHint = t(
        `tools.passkey.hints.${osKey}`,
        null,
        osKey === 'darwin'
            ? 'Touch the Touch ID sensor or enter your macOS password'
            : osKey === 'linux'
                ? 'Touch your fingerprint sensor or enter your system password'
                : 'Touch your fingerprint sensor or enter your Windows PIN'
    );

    const [passwordInput, setPasswordInput] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'scanning' | 'checking-pass' | 'success'
    const [errorMessage, setErrorMessage] = useState('');

    const [displayedPrompt, setDisplayedPrompt] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const closeTimerRef = useRef(null);

    useEffect(() => {
        if (passkeyPrompt) {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            setDisplayedPrompt(passkeyPrompt);
            setIsClosing(false);
            setPasswordInput('');
            setErrorMessage('');
            setAuthStatus('idle');
            // Refresh fresh QVault security status (PIN, biometrics, lockout)
            useVaultStore.getState().syncVaultStatus?.();
        } else if (displayedPrompt && !isClosing) {
            setIsClosing(true);
            closeTimerRef.current = setTimeout(() => {
                setDisplayedPrompt(null);
                setIsClosing(false);
                setPasswordInput('');
                setErrorMessage('');
                setAuthStatus('idle');
            }, 200);
        }
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, [passkeyPrompt]);

    // Handle Escape key to cancel
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && displayedPrompt && authStatus !== 'success') {
                handleCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [displayedPrompt, authStatus]);

    if (!displayedPrompt) return null;
    const activePrompt = displayedPrompt || passkeyPrompt;

    const handleCancel = async () => {
        if (authStatus === 'success') return;
        if (window.electronAPI && window.electronAPI.respondPasskeyVerification && activePrompt?.requestId) {
            await window.electronAPI.respondPasskeyVerification(activePrompt.requestId, {
                approved: false,
                verified: false,
                fallbackToNative: false
            });
        }
        setPasskeyPrompt(null);
    };

    const handleHardwareFallback = async () => {
        if (authStatus === 'success') return;
        if (window.electronAPI && window.electronAPI.respondPasskeyVerification && activePrompt?.requestId) {
            await window.electronAPI.respondPasskeyVerification(activePrompt.requestId, {
                approved: false,
                verified: false,
                fallbackToNative: true
            });
        }
        const domain = activePrompt?.rpId || activePrompt?.hostname || t('tools.passkey.websiteFallback', null, 'Website');
        showToast(
            t('tools.passkey.toastHardwareHandoff', { domain }, `Switching to Hardware / System Security Key for ${domain}...`),
            'info'
        );
        setPasskeyPrompt(null);
    };

    const isWebAuthnPrompt = activePrompt?.mode !== 'autofill';
    const canUseHardwareKey = isWebAuthnPrompt && activePrompt?.hardwareFallbackAvailable !== false;
    const hardwareKeyHint = t(
        `tools.passkey.useHardwareKeyHint.${osKey}`,
        null,
        osKey === 'darwin'
            ? 'YubiKey · FIDO2 · Touch ID · Phone QR'
            : osKey === 'linux'
                ? 'YubiKey · FIDO2 · USB / NFC / BLE · Phone QR'
                : 'YubiKey · FIDO2 · Windows Hello · Phone QR'
    );

    const triggerSuccessSequence = async () => {
        setAuthStatus('success');
        playUnlockChime();
        setErrorMessage('');

        // Wait 750ms for user to enjoy the Apple-like Face ID checkmark animation
        await new Promise(r => setTimeout(r, 750));

        if (window.electronAPI && window.electronAPI.respondPasskeyVerification && activePrompt?.requestId) {
            await window.electronAPI.respondPasskeyVerification(activePrompt.requestId, true);
        }
        const domain = activePrompt?.rpId || activePrompt?.hostname || t('tools.passkey.websiteFallback', null, 'Website');
        const isAutofill = activePrompt?.mode === 'autofill';
        const isCreate = activePrompt?.mode === 'passkey-create';
        showToast(
            isAutofill
                ? t('tools.passkey.toastAutofill', { domain }, `Vault unlocked & credentials autofilled for ${domain}!`)
                : isCreate
                    ? t('tools.passkey.toastPasskeyCreated', { domain }, `Passkey verified & saving for ${domain}!`)
                    : t('tools.passkey.toastPasskey', { domain }, `Passkey verified for ${domain}!`)
        );
        setPasskeyPrompt(null);
    };

    const completeVerification = async (success = true) => {
        if (success) {
            await triggerSuccessSequence();
        } else {
            await handleCancel();
        }
    };

    const handleWindowsHello = async () => {
        if (!supportsBiometrics || authStatus !== 'idle') return;
        setAuthStatus('scanning');
        setErrorMessage('');
        try {
            const vaultState = useVaultStore.getState();
            let verified = false;

            // If QVault has biometrics enabled and is currently locked, unlockWithWindowsHello
            // will run ONE single Windows Hello prompt to unwrap the vault key AND verify identity.
            if (vaultState.biometricsEnabled && !vaultState.isUnlocked) {
                const unlocked = await vaultState.unlockWithWindowsHello();
                if (unlocked) {
                    verified = true;
                } else {
                    const currentErr = useVaultStore.getState().error;
                    if (currentErr && !currentErr.toLowerCase().includes('cancel')) {
                        setErrorMessage(currentErr);
                    }
                }
            } else {
                // If biometrics not bound to vault or vault already unlocked, verify identity directly
                const domain = activePrompt?.rpId || activePrompt?.hostname || t('tools.passkey.theWebsiteFallback', null, 'the website');
                if (window.electronAPI?.verifyWindowsHello) {
                    const isAutofill = activePrompt?.mode === 'autofill';
                    const isCreate = activePrompt?.mode === 'passkey-create';
                    const promptMsg = isAutofill
                        ? t('tools.passkey.promptAutofill', { domain }, `Verify your identity to autofill credentials for ${domain}`)
                        : isCreate
                            ? t('tools.passkey.promptPasskeyCreate', { domain }, `Create and save a QVault passkey for ${domain}`)
                            : t('tools.passkey.promptPasskey', { domain }, `Sign in to ${domain} with your QVault passkey`);
                    const res = await window.electronAPI.verifyWindowsHello(promptMsg);
                    if (res && (res.verified || res.success)) {
                        verified = true;
                        if (res.unlockedVault) {
                            const rawPasswords = await window.electronAPI.getPasswords?.();
                            if (Array.isArray(rawPasswords) && rawPasswords.length > 0) {
                                useVaultStore.setState({
                                    isUnlocked: true,
                                    masterPassword: res.masterPassword || useVaultStore.getState().masterPassword || '',
                                    passwords: enrichPasswords(rawPasswords)
                                });
                            }
                        }
                        vaultState.syncVaultStatus?.();
                    } else if (res && res.error && !res.error.toLowerCase().includes('cancel')) {
                        setErrorMessage(res.error);
                    }
                }
            }

            if (verified) {
                await completeVerification(true);
            } else {
                setAuthStatus('idle');
            }
        } catch (e) {
            setAuthStatus('idle');
            setErrorMessage(t('tools.passkey.biometricError', { error: e.message || e }, 'Biometric error: ' + (e.message || e)));
        }
    };

    const handlePasswordSubmit = async (e) => {
        e?.preventDefault?.();
        const trimmed = passwordInput.trim();
        if (!trimmed || authStatus !== 'idle') return;

        const vaultState = useVaultStore.getState();

        // Check if vault is locked out from failed PIN attempts
        if (vaultState.lockoutUntil && Date.now() < vaultState.lockoutUntil) {
            const remainingSec = Math.max(1, Math.ceil((vaultState.lockoutUntil - Date.now()) / 1000));
            setErrorMessage(t('tools.passkey.vaultLockedOut', { seconds: remainingSec }, `Vault locked due to failed attempts. Try again in ${remainingSec}s.`));
            return;
        }

        setAuthStatus('checking-pass');
        setErrorMessage('');

        try {
            let pinFailedError = null;

            // Step 1 (Quick PIN Check): cryptographically verified against vault.json
            if (vaultState.pinEnabled && /^\d{4,8}$/.test(trimmed)) {
                const pinOk = await vaultState.unlockWithPin(trimmed);
                if (pinOk) {
                    await completeVerification(true);
                    return;
                } else {
                    const updatedState = useVaultStore.getState();
                    pinFailedError = updatedState.error;
                    if (updatedState.lockoutUntil && Date.now() < updatedState.lockoutUntil) {
                        setAuthStatus('idle');
                        const remainingSec = Math.max(1, Math.ceil((updatedState.lockoutUntil - Date.now()) / 1000));
                        setErrorMessage(t('tools.passkey.vaultLockedOut', { seconds: remainingSec }, `Vault locked due to failed attempts. Try again in ${remainingSec}s.`));
                        return;
                    }
                }
            }

            // Step 2 (Master Password Check): verify password and unlock vault (or initialize if first-time vault setup)
            if (!vaultState.isInitialized) {
                const initializedOk = await useVaultStore.getState().unlock(trimmed);
                if (initializedOk) {
                    await completeVerification(true);
                    return;
                }
            } else if (window.electronAPI && window.electronAPI.checkVaultPassword) {
                const res = await window.electronAPI.checkVaultPassword(trimmed);
                const isValid = res === true || res?.valid === true || res?.success === true;
                if (isValid) {
                    if (!useVaultStore.getState().isUnlocked) {
                        await useVaultStore.getState().unlock(trimmed);
                    }
                    await completeVerification(true);
                    return;
                }
            }

            setAuthStatus('idle');
            setErrorMessage(pinFailedError || useVaultStore.getState().error || t('tools.passkey.incorrectCreds', null, 'Incorrect Master Password or Quick PIN. Please try again.'));
        } catch (e) {
            setAuthStatus('idle');
            setErrorMessage(t('tools.passkey.verificationFailed', { error: e.message || e }, 'Verification failed: ' + (e.message || e)));
        }
    };

    return (
        <div 
            className={`fixed inset-0 z-[300] flex items-center justify-center p-6 ${
                isBright ? 'bg-black/25 backdrop-blur-xl text-zinc-900' : 'bg-black/80 backdrop-blur-2xl text-white'
            } font-sans ${isClosing ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'}`}
            onClick={handleCancel}
        >
            <div 
                id="passkey-modal"
                className={`w-full max-w-md rounded-3xl p-7 relative overflow-hidden transition-all duration-500 border ${isClosing ? 'animate-modal-dialog-out' : 'animate-modal-dialog'} ${getLiquidGlassSurfaceClasses(isBright)} ${
                    authStatus === 'success' 
                        ? '!border-emerald-500/40 !shadow-[0_0_90px_rgba(16,185,129,0.35)]' 
                        : ''
                }`} 
                style={getLiquidGlassInlineStyle(isBright)}
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
                        className={`absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer ${
                            isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-500 hover:text-zinc-900' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
                        }`}
                        title={t('tools.passkey.cancelDenyTitle', null, 'Cancel & Deny')}
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
                            <span className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                            <span className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 rounded-tr-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                            <span className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 rounded-bl-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 rounded-br-md transition-colors duration-300 ${authStatus === 'scanning' ? 'border-accent' : (isBright ? 'border-black/20' : 'border-white/30')}`}></span>
                        </div>

                        {/* Center Core Badge */}
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${
                            authStatus === 'success'
                                ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-500 shadow-[0_0_40px_rgba(52,211,153,0.5)] scale-110 animate-success-pulse'
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
                        authStatus === 'success' 
                            ? 'text-emerald-500' 
                            : (isBright ? 'text-zinc-900' : 'text-white')
                    }`}>
                        {authStatus === 'success' 
                            ? t('tools.passkey.verifiedTitle', null, 'Identity Verified!')
                            : authStatus === 'scanning'
                                ? t('tools.passkey.scanningTitle', { biometric: biometricLabel }, `Scanning ${biometricLabel}...`)
                                : (activePrompt?.mode === 'autofill'
                                    ? t('tools.passkey.autofillTitle', null, 'Autofill Saved Password')
                                    : activePrompt?.mode === 'passkey-create'
                                        ? t('tools.passkey.passkeyCreateTitle', null, 'Create QVault Passkey')
                                        : t('tools.passkey.passkeyTitle', null, 'Passkey Authentication'))}
                    </h2>
                    <p className={`text-xs mt-1 ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                        {authStatus === 'success'
                            ? (activePrompt?.mode === 'autofill'
                                ? t('tools.passkey.verifiedAutofillDesc', null, 'Vault unlocked and credentials autofilled')
                                : activePrompt?.mode === 'passkey-create'
                                    ? t('tools.passkey.verifiedPasskeyCreateDesc', null, 'Identity verified — saving passkey to QVault')
                                    : t('tools.passkey.verifiedPasskeyDesc', null, 'Passkey released and signed successfully'))
                            : authStatus === 'scanning'
                                ? biometricPinHint
                                : (activePrompt?.mode === 'autofill'
                                    ? t('tools.passkey.requireAutofillDesc', null, 'Verification required to unlock vault & autofill')
                                    : activePrompt?.mode === 'passkey-create'
                                        ? t('tools.passkey.requirePasskeyCreateDesc', null, 'Verification required to create and save this passkey')
                                        : t('tools.passkey.requirePasskeyDesc', null, 'Verification required to sign in with your passkey'))}
                    </p>
                </div>

                {/* Website & Account Card */}
                <div className={`border rounded-2xl p-3.5 mb-5 flex items-center gap-3 ${getLiquidGlassCardClasses(isBright)}`}>
                    <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0">
                        <Globe size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                {activePrompt?.rpId || activePrompt?.hostname || t('tools.passkey.websiteFallback', null, 'Website')}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                                {activePrompt?.mode === 'autofill'
                                    ? t('tools.passkey.passwordBadge', null, 'Password')
                                    : t('tools.passkey.passkeyBadge', null, 'Passkey')}
                            </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                            {t('tools.passkey.accountLabel', null, 'Account:')} <span className={`font-medium ${isBright ? 'text-zinc-800' : 'text-white/80'}`}>{activePrompt?.username || (activePrompt?.mode === 'autofill' ? t('tools.passkey.savedLogin', null, 'Saved Login') : t('tools.passkey.passkeyUser', null, 'Passkey User'))}</span>
                        </p>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className={`mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs animate-shake ${isBright ? 'text-rose-600' : 'text-rose-300'}`}>
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="flex-1">{errorMessage}</span>
                    </div>
                )}

                {/* Verification Actions */}
                <div className="space-y-4">
                    {supportsBiometrics && (
                    <>
                    {/* Method 1: System Biometrics */}
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
                                <span>{t('tools.passkey.verifyingWith', { biometric: biometricLabel }, `Verifying with ${biometricLabel}...`)}</span>
                            </>
                        ) : authStatus === 'success' ? (
                            <>
                                <Check size={18} className="stroke-[3]" />
                                <span>{t('tools.passkey.verifiedBtn', null, 'Verified!')}</span>
                            </>
                        ) : (
                            <>
                                <Fingerprint size={20} />
                                <span>{t('tools.passkey.verifyWith', { biometric: biometricLabel }, `Verify with ${biometricLabel}`)}</span>
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className={`flex-1 h-px ${isBright ? 'bg-black/10' : 'bg-white/10'}`}></div>
                        <span className={`text-[10px] tracking-wider uppercase font-semibold ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>
                            {pinEnabled
                                ? t('tools.passkey.orPassPin', null, 'Or with Master Password / PIN')
                                : t('tools.passkey.orPass', null, 'Or with Master Password')}
                        </span>
                        <div className={`flex-1 h-px ${isBright ? 'bg-black/10' : 'bg-white/10'}`}></div>
                    </div>
                    </>
                    )}

                    {/* Method 2: Master Password / PIN Form */}
                    <form onSubmit={handlePasswordSubmit} className="space-y-3">
                        <div className="relative">
                            <Lock size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)}
                                placeholder={pinEnabled
                                    ? t('tools.passkey.placeholderPin', null, 'Enter Master Password or 4–8 digit Quick PIN')
                                    : t('tools.passkey.placeholderPass', null, 'Enter QVault Master Password')}
                                disabled={authStatus !== 'idle'}
                                autoFocus
                                className={`w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm transition disabled:opacity-40 focus:outline-none focus:border-accent ${
                                    isBright 
                                        ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder:text-zinc-400 focus:bg-white' 
                                        : 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08]'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                disabled={authStatus !== 'idle'}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer disabled:opacity-40 ${
                                    isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white'
                                }`}
                            >
                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={!passwordInput.trim() || authStatus !== 'idle'}
                            className={`w-full py-2.5 px-4 rounded-xl font-semibold border transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs ${
                                isBright 
                                    ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800' 
                                    : 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
                            }`}
                        >
                            {authStatus === 'checking-pass' ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>{t('tools.passkey.checking', null, 'Checking credentials...')}</span>
                                </>
                            ) : (
                                <span>{t('tools.passkey.verifyAuth', null, 'Verify & Authenticate')}</span>
                            )}
                        </button>
                    </form>

                    {/* Method 3: Hardware / System Security Key Fallback (YubiKey, FIDO2, Windows Hello, Touch ID, Phone QR) */}
                    {canUseHardwareKey && authStatus !== 'success' && (
                        <button
                            type="button"
                            onClick={handleHardwareFallback}
                            className={`w-full py-2.5 px-4 rounded-xl border transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] ${
                                isBright
                                    ? 'bg-black/[0.03] hover:bg-black/[0.07] border-black/10 hover:border-accent/40 text-zinc-800'
                                    : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 hover:border-accent/40 text-white/90'
                            }`}
                        >
                            <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0">
                                <Usb size={14} />
                            </div>
                            <div className="flex flex-col items-start text-left min-w-0">
                                <span className="text-xs font-semibold leading-tight truncate">
                                    {t('tools.passkey.useHardwareKeyBtn', null, 'Use Hardware / System Key')}
                                </span>
                                <span className={`text-[10px] leading-tight truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                    {hardwareKeyHint}
                                </span>
                            </div>
                        </button>
                    )}
                </div>

                {/* Footer Cancel */}
                {authStatus !== 'success' && (
                    <div className={`mt-5 pt-3 border-t flex justify-center ${isBright ? 'border-black/10' : 'border-white/5'}`}>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className={`text-xs transition cursor-pointer font-medium ${isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/40 hover:text-white/80'}`}
                        >
                            {t('tools.passkey.cancelDenyBtn', null, 'Cancel & Deny Request')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PasskeyVerificationModal;
