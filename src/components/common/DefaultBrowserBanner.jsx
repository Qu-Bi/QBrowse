import React, { useState, useEffect } from 'react';
import { Compass, X, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function DefaultBrowserBanner() {
    const showToast = useUIStore(state => state.showToast);
    const [isVisible, setIsVisible] = useState(false);
    const [isDefault, setIsDefault] = useState(false);
    const [isSetting, setIsSetting] = useState(false);

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

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSetDefault = async () => {
        setIsSetting(true);
        if (window.electronAPI && window.electronAPI.setDefaultBrowser) {
            try {
                const res = await window.electronAPI.setDefaultBrowser();
                if (res.isDefault) {
                    setIsDefault(true);
                    showToast('QBrowse is now your default browser! 🎉');
                    setIsVisible(false);
                } else {
                    showToast('Default browser settings opened.');
                    setIsVisible(false);
                }
            } catch (err) {
                showToast('Could not set default browser.');
            }
        } else {
            showToast('Platform API not available.');
            setIsVisible(false);
        }
        setIsSetting(false);
    };

    const handleNeverAskAgain = () => {
        localStorage.setItem('qbrowse_dismiss_default_browser', 'true');
        setIsVisible(false);
        showToast('Default browser prompt silenced.');
    };

    const handleDismissSession = () => {
        setIsVisible(false);
    };

    if (!isVisible || isDefault) return null;

    return (
        <div className="fixed top-12 right-6 z-[9990] max-w-md w-full animate-pop-in pointer-events-auto select-none">
            <div className="relative overflow-hidden p-4 rounded-2xl bg-[#0c0c10]/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white">
                {/* Subtle top accent gradient line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-80" />

                <div className="flex items-start gap-3.5">
                    {/* App icon badge */}
                    <div className="w-10 h-10 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center flex-shrink-0 shadow-md shadow-accent/10">
                        <Compass size={20} className="animate-spin-slow" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white tracking-tight">Make QBrowse your default browser</h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-accent/20 text-accent border border-accent-30">
                                Privacy
                            </span>
                        </div>
                        <p className="text-xs text-white/60 mt-1 leading-relaxed">
                            Open all web links with built-in Tor onion routing, isolated workspaces, and zero-knowledge encrypted sync.
                        </p>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 mt-3.5">
                            <button
                                onClick={handleSetDefault}
                                disabled={isSetting}
                                className="px-3.5 py-1.5 bg-accent text-black font-bold rounded-xl text-xs transition-all duration-200 hover:scale-105 active:scale-95 shadow-md shadow-accent/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isSetting ? (
                                    <span>Applying...</span>
                                ) : (
                                    <>
                                        <span>Set as Default</span>
                                        <ArrowRight size={12} />
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleNeverAskAgain}
                                className="text-xs text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                            >
                                Don't ask again
                            </button>
                        </div>
                    </div>

                    {/* Dismiss X button */}
                    <button
                        onClick={handleDismissSession}
                        className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Dismiss for now"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
