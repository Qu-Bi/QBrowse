import React, { useState, useEffect } from 'react';
import { Compass, X, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import qbrowseLogo from '../../assets/icon.png';

export default function DefaultBrowserBanner() {
    const showToast = useUIStore(state => state.showToast);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isDefault, setIsDefault] = useState(false);
    const [isSetting, setIsSetting] = useState(false);

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
        // Do not display if user explicitly chose "Don't ask again"
        const isDismissedForever = localStorage.getItem('qbrowse_dismiss_default_browser') === 'true';
        if (isDismissedForever) return;

        let isMounted = true;

        const verifyDefault = async () => {
            if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
                try {
                    const res = await window.electronAPI.checkDefaultBrowser();
                    if (isMounted) {
                        setIsDefault(!!res.isDefault);
                        if (!res.isDefault) {
                            // Brief delay so browser UI settles gracefully before prompt
                            setTimeout(() => {
                                if (isMounted) setIsVisible(true);
                            }, 1800);
                        }
                    }
                } catch (e) {
                    console.warn('[DefaultBrowserBanner] Check failed:', e);
                }
            }
        };

        verifyDefault();

        const handleFocus = async () => {
            if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
                try {
                    const res = await window.electronAPI.checkDefaultBrowser();
                    if (isMounted) {
                        if (res.isDefault) {
                            closeBanner(() => setIsDefault(true));
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
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const handleSetDefault = async () => {
        setIsSetting(true);
        if (window.electronAPI && window.electronAPI.setDefaultBrowser) {
            try {
                const res = await window.electronAPI.setDefaultBrowser();
                if (res.isDefault) {
                    showToast('QBrowse is now your default browser!');
                    closeBanner(() => setIsDefault(true));
                } else {
                    showToast('System settings opened. Click "Set default" for QBrowse.');
                    closeBanner();
                }
            } catch (err) {
                showToast('Could not set default browser.');
            }
        } else {
            showToast('Platform API not available.');
            closeBanner();
        }
        setIsSetting(false);
    };

    const handleNeverAskAgain = () => {
        closeBanner(() => {
            localStorage.setItem('qbrowse_dismiss_default_browser', 'true');
            showToast('Default browser prompt silenced.');
        });
    };

    const handleDismissSession = () => {
        closeBanner();
    };

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
