import React, { useState, useEffect } from 'react';
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

    const isSuppressed = 
        !setupComplete || 
        activeModal !== null || 
        isFullscreen ||
        activeSpace === 'tor' ||
        activeSpace === 'ghost';

    const closeBanner = (callback) => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
            if (callback) callback();
        }, 220);
    };

    useEffect(() => {
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

        const hasAlreadyCheckedThisSession = () => {
            try {
                return sessionStorage.getItem('qbrowse_default_browser_prompted') === 'true';
            } catch (_) {
                return false;
            }
        };

        if (isPermanentlyDismissed() || isSessionDismissed()) return;

        let isMounted = true;
        let timerId = null;

        // Startup check: Only run ONCE per browser session
        if (setupComplete && !hasAlreadyCheckedThisSession()) {
            try {
                sessionStorage.setItem('qbrowse_default_browser_prompted', 'true');
            } catch (_) {}

            if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
                window.electronAPI.checkDefaultBrowser({ force: true }).then((res) => {
                    if (!isMounted) return;
                    if (res && res.isDefault) {
                        setIsDefault(true);
                    } else if (!isPermanentlyDismissed() && !isSessionDismissed()) {
                        // Delay gracefully so the browser window and tabs load without jarring the user
                        timerId = setTimeout(() => {
                            if (isMounted && !isPermanentlyDismissed() && !isSessionDismissed()) {
                                setIsVisible(true);
                            }
                        }, 4000);
                    }
                }).catch((e) => {
                    console.warn('[DefaultBrowserBanner] Initial check failed:', e);
                });
            }
        }

        const handleFocus = async () => {
            if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
                try {
                    const res = await window.electronAPI.checkDefaultBrowser({ force: true });
                    if (isMounted) {
                        if (res && res.isDefault) {
                            setIsDefault(true);
                            try {
                                sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
                            } catch (_) {}
                            closeBanner();
                        } else {
                            setIsDefault(false);
                        }
                    }
                } catch (_) {}
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            isMounted = false;
            if (timerId) clearTimeout(timerId);
            window.removeEventListener('focus', handleFocus);
        };
    }, [setupComplete]);

    const handleSetDefault = async () => {
        setIsSetting(true);
        try {
            sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
        } catch (_) {}

        if (window.electronAPI && window.electronAPI.setDefaultBrowser) {
            try {
                const res = await window.electronAPI.setDefaultBrowser();
                if (res && res.isDefault) {
                    showToast('QBrowse is now your default browser!');
                    closeBanner(() => setIsDefault(true));
                } else {
                    showToast('Opening Windows Default Apps. Click "Set default" for QBrowse.');
                    closeBanner();

                    // Background poll for up to 30s while user interacts with Windows Settings
                    let polls = 0;
                    const pollInterval = setInterval(async () => {
                        polls++;
                        if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
                            try {
                                const check = await window.electronAPI.checkDefaultBrowser({ force: true });
                                if (check && check.isDefault) {
                                    setIsDefault(true);
                                    showToast('QBrowse is now your default browser!');
                                    clearInterval(pollInterval);
                                }
                            } catch (_) {}
                        }
                        if (polls >= 20) clearInterval(pollInterval);
                    }, 1500);
                }
            } catch (err) {
                showToast('Could not open default browser settings.');
                closeBanner();
            }
        } else {
            showToast('Platform API not available.');
            closeBanner();
        }
        setIsSetting(false);
    };

    const handleNeverAskAgain = () => {
        try {
            localStorage.setItem('qbrowse_dismiss_default_browser', 'true');
            sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
        } catch (_) {}
        closeBanner(() => {
            showToast('Default browser prompt silenced.');
        });
    };

    const handleDismissSession = () => {
        try {
            sessionStorage.setItem('qbrowse_dismiss_default_browser_session', 'true');
        } catch (_) {}
        closeBanner();
    };

    if (isSuppressed || (!isVisible && !isClosing) || (isDefault && !isClosing)) return null;

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
                                disabled={isSetting}
                                className="px-3 py-1 bg-accent text-black font-semibold rounded-lg text-[11px] transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm shadow-accent/20 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                {isSetting ? (
                                    <span>Applying...</span>
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
