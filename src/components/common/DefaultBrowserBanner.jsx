import React, { useState, useEffect, useRef } from 'react';
import { Compass, X, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import qbrowseLogo from '../../assets/icon.png';

export default function DefaultBrowserBanner() {
    const showToast = useUIStore(state => state.showToast);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const activeModal = useUIStore(state => state.activeModal);
    const setupComplete = useUIStore(state => state.setupComplete);
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isDefault, setIsDefault] = useState(false);
    const [isSetting, setIsSetting] = useState(false);
    const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);

    const hasShownThisSessionRef = useRef(false);
    const hasUserRequestedDefaultRef = useRef(false);
    const visibleSinceRef = useRef(0);
    const pollIntervalRef = useRef(null);

    const isSuppressed = 
        !setupComplete || 
        activeModal !== null || 
        isFullscreen ||
        activeSpace === 'tor' ||
        activeSpace === 'ghost';

    const isPermanentlyDismissed = () => {
        try {
            return localStorage.getItem('qbrowse_dismiss_default_browser') === 'true';
        } catch (_) {
            return false;
        }
    };

    const isSessionDismissed = () => {
        try {
            return sessionStorage.getItem('qbrowse_dismiss_default_browser_session') === 'true';
        } catch (_) {
            return false;
        }
    };

    const isPromptDismissed = () => isPermanentlyDismissed() || isSessionDismissed();

    const hasAlreadyPromptedThisSession = () => {
        try {
            return sessionStorage.getItem('qbrowse_default_browser_prompted') === 'true';
        } catch (_) {
            return false;
        }
    };

    const checkDefaultApi = async (force = true) => {
        if (window.electronAPI && window.electronAPI.systemCheckDefaultBrowser) {
            return window.electronAPI.systemCheckDefaultBrowser(force);
        }
        if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
            return window.electronAPI.checkDefaultBrowser({ force });
        }
        return { isDefault: false };
    };

    const setDefaultApi = async () => {
        if (window.electronAPI && window.electronAPI.systemSetDefaultBrowser) {
            return window.electronAPI.systemSetDefaultBrowser();
        }
        if (window.electronAPI && window.electronAPI.setDefaultBrowser) {
            return window.electronAPI.setDefaultBrowser();
        }
        return { isDefault: false };
    };

    const closeBanner = (callback) => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
            setWaitingForConfirmation(false);
            if (callback) callback();
        }, 220);
    };

    // If isSuppressed becomes true while isVisible is true (e.g. user opens modal or switches space),
    // smoothly transition out via closeBanner() instead of abrupt unmount/frame-1 flicker
    useEffect(() => {
        if (isVisible && isSuppressed && !isClosing) {
            const elapsed = Date.now() - visibleSinceRef.current;
            if (elapsed >= 1200) {
                closeBanner();
            } else {
                const timer = setTimeout(() => {
                    closeBanner();
                }, 1200 - elapsed);
                return () => clearTimeout(timer);
            }
        }
    }, [isSuppressed, isVisible, isClosing]);

    // Initial startup check: wait 6000ms after mount, and only when !isSuppressed && !isPromptDismissed.
    // If hasShownThisSessionRef.current is true or session was prompted, never show again.
    useEffect(() => {
        if (!setupComplete || isSuppressed || isPromptDismissed() || hasAlreadyPromptedThisSession() || hasShownThisSessionRef.current) {
            return;
        }

        let isMounted = true;
        const timerId = setTimeout(async () => {
            if (!isMounted || isSuppressed || isPromptDismissed() || hasAlreadyPromptedThisSession() || hasShownThisSessionRef.current) {
                return;
            }

            try {
                const res = await checkDefaultApi(true);
                if (!isMounted) return;

                if (res && res.isDefault) {
                    setIsDefault(true);
                } else if (!isPromptDismissed() && !isSuppressed && !hasShownThisSessionRef.current) {
                    hasShownThisSessionRef.current = true;
                    try {
                        sessionStorage.setItem('qbrowse_default_browser_prompted', 'true');
                    } catch (_) {}
                    visibleSinceRef.current = Date.now();
                    setIsVisible(true);
                }
            } catch (e) {
                console.warn('[DefaultBrowserBanner] Initial check failed:', e);
            }
        }, 6000);

        return () => {
            isMounted = false;
            clearTimeout(timerId);
        };
    }, [setupComplete, isSuppressed]);

    // Window focus listener: ONLY check default browser on window focus IF user actually clicked
    // "Set as Default" (hasUserRequestedDefaultRef.current === true) AND banner has been visible > 1500ms
    useEffect(() => {
        const handleFocus = async () => {
            if (!hasUserRequestedDefaultRef.current) return;
            if (Date.now() - visibleSinceRef.current <= 1500) return;

            try {
                const res = await checkDefaultApi(true);
                if (res && res.isDefault) {
                    setIsDefault(true);
                    try {
                        sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
                    } catch (_) {}
                    showToast('QBrowse is now your default browser!');
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    closeBanner();
                }
            } catch (_) {}
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [showToast]);

    const handleSetDefault = async () => {
        setIsSetting(true);
        hasUserRequestedDefaultRef.current = true;
        try {
            sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
        } catch (_) {}

        try {
            const res = await setDefaultApi();
            if (res && res.isDefault) {
                setIsDefault(true);
                showToast('QBrowse is now your default browser!');
                closeBanner();
            } else {
                setWaitingForConfirmation(true);
                showToast('Opening Windows Default Apps. Click "Set default" for QBrowse.');

                // Background poll every 2s for up to 30s while user interacts with Windows Settings window
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                let polls = 0;
                pollIntervalRef.current = setInterval(async () => {
                    polls++;
                    try {
                        const check = await checkDefaultApi(true);
                        if (check && check.isDefault) {
                            setIsDefault(true);
                            showToast('QBrowse is now your default browser!');
                            if (pollIntervalRef.current) {
                                clearInterval(pollIntervalRef.current);
                                pollIntervalRef.current = null;
                            }
                            closeBanner();
                        }
                    } catch (_) {}

                    if (polls >= 15) {
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                        setWaitingForConfirmation(false);
                    }
                }, 2000);
            }
        } catch (err) {
            showToast('Could not open default browser settings.');
            closeBanner();
        } finally {
            setIsSetting(false);
        }
    };

    const handleNeverAskAgain = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        try {
            localStorage.setItem('qbrowse_dismiss_default_browser', 'true');
            sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
        } catch (_) {}
        closeBanner(() => {
            showToast('Default browser prompt silenced.');
        });
    };

    const handleDismissSession = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        try {
            sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
        } catch (_) {}
        closeBanner();
    };

    // Note: Do NOT abruptly unmount if isSuppressed becomes true while isVisible is true;
    // that is handled by the smooth exit effect above so it animates out gracefully!
    if ((!isVisible && !isClosing) || (isDefault && !isClosing)) return null;

    return (
        <div className={`fixed top-12 right-6 z-[9990] max-w-[350px] w-full ${isClosing ? 'animate-pop-out' : 'animate-pop-in'} origin-top-right pointer-events-auto select-none`}>
            <div className={`relative overflow-hidden p-3 rounded-2xl backdrop-blur-3xl transition-all duration-300 ${
                isBright
                    ? 'bg-white/90 border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] text-zinc-900'
                    : 'bg-[#0c0c10]/95 border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.65)] text-white'
            }`}>
                {/* Subtle top accent gradient line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-80" />

                <div className="flex items-start gap-2.5">
                    {/* App icon badge */}
                    <div className="w-8 h-8 rounded-xl bg-accent-10 border border-accent-30 flex items-center justify-center flex-shrink-0 shadow-sm shadow-accent/10 p-1 mt-0.5">
                        <img 
                            src={qbrowseLogo} 
                            alt="QBrowse" 
                            className="w-full h-full object-contain rounded-md drop-shadow" 
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
                            }}
                        />
                        <Compass size={16} className="hidden text-accent animate-spin-slow" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                        <h4 className={`text-[13px] font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                            Make QBrowse your default browser
                        </h4>
                        <p className={`text-[11.5px] mt-0.5 leading-snug ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                            Open links with built-in Tor routing, isolated spaces, and encrypted sync.
                        </p>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2.5 mt-2.5">
                            <button
                                onClick={handleSetDefault}
                                disabled={isSetting || waitingForConfirmation}
                                className="px-3 py-1 bg-accent text-black font-semibold rounded-lg text-[11px] transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm shadow-accent/20 flex items-center gap-1 cursor-pointer disabled:opacity-75"
                            >
                                {waitingForConfirmation ? (
                                    <span className="animate-pulse">Confirm in Windows Settings...</span>
                                ) : isSetting ? (
                                    <span>Opening Settings...</span>
                                ) : (
                                    <>
                                        <span>Set as Default</span>
                                        <ArrowRight size={11} />
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleNeverAskAgain}
                                className={`text-[11px] transition-colors cursor-pointer ${
                                    isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/40 hover:text-white/80'
                                }`}
                            >
                                Don't ask again
                            </button>
                        </div>
                    </div>

                    {/* Dismiss X button */}
                    <button
                        onClick={handleDismissSession}
                        className={`p-1 rounded-md transition-colors cursor-pointer -mt-0.5 -mr-0.5 ${
                            isBright ? 'hover:bg-black/5 text-zinc-400 hover:text-zinc-900' : 'hover:bg-white/10 text-white/40 hover:text-white'
                        }`}
                        title="Dismiss for now"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
