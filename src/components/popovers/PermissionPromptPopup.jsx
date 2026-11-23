import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Mic, Video, MapPin, Bell, Clipboard, Music, Compass, Clock,
    Monitor, LayoutGrid, Volume2, ExternalLink, ShieldAlert, X, Shield
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { useTranslation } from '../../i18n/index';

function getPermissionMeta(permissionKey, host, t) {
    const safeHost = host || t('pop.permission.thisSite', null, 'This site');

    switch (permissionKey) {
        case 'camera':
            return {
                icon: Video,
                title: t('pop.permission.titleCamera', null, 'Camera Access'),
                description: t('pop.permission.descCamera', { host: safeHost }, `${safeHost} wants to use your camera`),
                accentClass: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
                accentBrightClass: 'text-sky-600 bg-sky-500/10 border-sky-500/25'
            };
        case 'microphone':
            return {
                icon: Mic,
                title: t('pop.permission.titleMicrophone', null, 'Microphone Access'),
                description: t('pop.permission.descMicrophone', { host: safeHost }, `${safeHost} wants to use your microphone`),
                accentClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
                accentBrightClass: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/25'
            };
        case 'camera-microphone':
            return {
                icon: Video,
                secondaryIcon: Mic,
                title: t('pop.permission.titleCameraMic', null, 'Camera & Microphone'),
                description: t('pop.permission.descCameraMic', { host: safeHost }, `${safeHost} wants to use your camera & microphone`),
                accentClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
                accentBrightClass: 'text-amber-700 bg-amber-500/10 border-amber-500/25'
            };
        case 'geolocation':
            return {
                icon: MapPin,
                title: t('pop.permission.titleGeolocation', null, 'Location Access'),
                description: t('pop.permission.descGeolocation', { host: safeHost }, `${safeHost} wants to know your location`),
                accentClass: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
                accentBrightClass: 'text-rose-600 bg-rose-500/10 border-rose-500/25'
            };
        case 'notifications':
            return {
                icon: Bell,
                title: t('pop.permission.titleNotifications', null, 'Notifications'),
                description: t('pop.permission.descNotifications', { host: safeHost }, `${safeHost} wants to show notifications`),
                accentClass: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
                accentBrightClass: 'text-violet-600 bg-violet-500/10 border-violet-500/25'
            };
        case 'clipboard-read':
            return {
                icon: Clipboard,
                title: t('pop.permission.titleClipboard', null, 'Clipboard Access'),
                description: t('pop.permission.descClipboard', { host: safeHost }, `${safeHost} wants to read text and images copied to your clipboard`),
                accentClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
                accentBrightClass: 'text-cyan-700 bg-cyan-500/10 border-cyan-500/25'
            };
        case 'midi':
            return {
                icon: Music,
                title: t('pop.permission.titleMidi', null, 'MIDI Devices'),
                description: t('pop.permission.descMidi', { host: safeHost }, `${safeHost} wants to control and communicate with MIDI devices`),
                accentClass: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
                accentBrightClass: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/25'
            };
        case 'sensors':
            return {
                icon: Compass,
                title: t('pop.permission.titleSensors', null, 'Motion & Sensors'),
                description: t('pop.permission.descSensors', { host: safeHost }, `${safeHost} wants to access motion and orientation sensors`),
                accentClass: 'text-teal-400 bg-teal-500/15 border-teal-500/30',
                accentBrightClass: 'text-teal-700 bg-teal-500/10 border-teal-500/25'
            };
        case 'idle-detection':
            return {
                icon: Clock,
                title: t('pop.permission.titleIdle', null, 'Idle Detection'),
                description: t('pop.permission.descIdle', { host: safeHost }, `${safeHost} wants to know when you are actively using this device`),
                accentClass: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
                accentBrightClass: 'text-orange-600 bg-orange-500/10 border-orange-500/25'
            };
        case 'display-capture':
            return {
                icon: Monitor,
                title: t('pop.permission.titleDisplayCapture', null, 'Screen Sharing'),
                description: t('pop.permission.descDisplayCapture', { host: safeHost }, `${safeHost} wants to capture and share your screen`),
                accentClass: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
                accentBrightClass: 'text-blue-600 bg-blue-500/10 border-blue-500/25'
            };
        case 'window-management':
            return {
                icon: LayoutGrid,
                title: t('pop.permission.titleWindowManagement', null, 'Window Management'),
                description: t('pop.permission.descWindowManagement', { host: safeHost }, `${safeHost} wants to manage windows across your displays`),
                accentClass: 'text-slate-300 bg-white/10 border-white/20',
                accentBrightClass: 'text-zinc-700 bg-black/5 border-black/15'
            };
        case 'speaker-selection':
            return {
                icon: Volume2,
                title: t('pop.permission.titleSpeakerSelection', null, 'Audio Output'),
                description: t('pop.permission.descSpeakerSelection', { host: safeHost }, `${safeHost} wants to select audio output devices`),
                accentClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
                accentBrightClass: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/25'
            };
        case 'openExternal':
            return {
                icon: ExternalLink,
                title: t('pop.permission.titleOpenExternal', null, 'External Application'),
                description: t('pop.permission.descOpenExternal', { host: safeHost }, `${safeHost} wants to open an external application`),
                accentClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
                accentBrightClass: 'text-amber-700 bg-amber-500/10 border-amber-500/25'
            };
        default:
            return {
                icon: ShieldAlert,
                title: t('pop.permission.titleGeneric', null, 'Site Permission'),
                description: t(
                    'pop.permission.descGeneric',
                    { host: safeHost, permission: permissionKey || 'device access' },
                    `${safeHost} wants to access ${permissionKey || 'this feature'}`
                ),
                accentClass: 'text-accent bg-accent/15 border-accent/30',
                accentBrightClass: 'text-amber-700 bg-amber-500/10 border-amber-500/25'
            };
    }
}

export default function PermissionPromptPopup() {
    const { t } = useTranslation();
    const permissionQueue = useUIStore(state => state.permissionQueue) || [];
    const dismissPermissionPrompt = useUIStore(state => state.dismissPermissionPrompt);
    const activeDownloadPopup = useUIStore(state => state.activeDownloadPopup);
    const theme = useUIStore(state => state.theme);
    const isReducedMotion = useUIStore(state => Boolean(state.settings?.a11yReducedMotion || state.isSystemReducedMotion));
    const activeSpace = useTabStore(state => state.activeSpace);

    const activePrompt = permissionQueue[0] || null;
    const queueTotal = permissionQueue.length;

    const [displayedPrompt, setDisplayedPrompt] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const closeTimerRef = useRef(null);

    useEffect(() => {
        if (activePrompt) {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            setDisplayedPrompt(activePrompt);
            setIsClosing(false);
        } else if (displayedPrompt && !isClosing) {
            if (isReducedMotion) {
                setDisplayedPrompt(null);
                setIsClosing(false);
            } else {
                setIsClosing(true);
                closeTimerRef.current = setTimeout(() => {
                    setDisplayedPrompt(null);
                    setIsClosing(false);
                }, 180);
            }
        }
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, [activePrompt?.requestId, Boolean(activePrompt), isReducedMotion]);

    const handleDecision = useCallback((decision) => {
        const target = activePrompt || displayedPrompt;
        if (!target?.requestId) return;
        try {
            window.electronAPI?.respondPermissionRequest?.(target.requestId, decision);
        } catch (_) {}
        dismissPermissionPrompt(target.requestId);
    }, [activePrompt, displayedPrompt, dismissPermissionPrompt]);

    useEffect(() => {
        if (!activePrompt) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                handleDecision('dismiss');
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [activePrompt?.requestId, handleDecision]);

    if (!displayedPrompt) return null;

    const isEphemeral = Boolean(displayedPrompt.isEphemeral);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor' && !isEphemeral;
    const meta = getPermissionMeta(displayedPrompt.permissionKey, displayedPrompt.host, t);
    const PrimaryIcon = meta.icon;
    const SecondaryIcon = meta.secondaryIcon || null;

    // Crisp opaque/near-opaque elevated surface over <webview> (no backdrop-filter so Chromium never bleeds dark corners!)
    const surfaceStyle = isBright
        ? {
            backgroundColor: '#fcfcfd',
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,247,251,0.98) 100%)',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            isolation: 'isolate'
        }
        : {
            backgroundColor: isEphemeral ? '#14111f' : '#13151f',
            backgroundImage: isEphemeral
                ? 'linear-gradient(180deg, rgba(32, 24, 52, 0.98) 0%, rgba(17, 14, 27, 0.99) 100%)'
                : 'linear-gradient(180deg, rgba(28, 31, 44, 0.98) 0%, rgba(17, 19, 29, 0.99) 100%)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.68), 0 6px 18px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
            isolation: 'isolate'
        };

    const topOffsetClass = activeDownloadPopup ? 'top-[136px]' : 'top-4';

    return (
        <div
            id="qbrowse-permission-popup"
            role="dialog"
            aria-modal="false"
            aria-label={meta.title}
            onClick={(e) => e.stopPropagation()}
            style={surfaceStyle}
            className={`absolute ${topOffsetClass} right-5 z-[75000] w-[352px] max-w-[calc(100%-2.5rem)] rounded-2xl overflow-hidden select-none border transition-[top,opacity,transform] duration-200 origin-top-right ${
                isBright
                    ? 'border-black/[0.10] text-zinc-900'
                    : (isEphemeral ? 'border-purple-400/25 text-white' : 'border-white/[0.12] text-white')
            } ${
                isReducedMotion
                    ? ''
                    : (isClosing ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade')
            }`}
        >
            {/* Top Accent Shimmer Line */}
            <div
                className={`h-[2px] w-full ${
                    isEphemeral
                        ? 'bg-gradient-to-r from-purple-500/80 via-fuchsia-400/90 to-purple-500/80'
                        : 'bg-gradient-to-r from-accent/80 via-amber-300/75 to-accent/80'
                }`}
            />

            <div className="p-3.5 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div
                            className={`h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${
                                SecondaryIcon ? 'px-2 gap-1' : 'w-9'
                            } ${isBright ? meta.accentBrightClass : meta.accentClass}`}
                        >
                            <PrimaryIcon size={15} />
                            {SecondaryIcon && <SecondaryIcon size={14} />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className={`text-xs font-bold truncate ${isBright ? 'text-zinc-900' : 'text-white/95'}`}
                                    title={displayedPrompt.origin || displayedPrompt.host}
                                >
                                    {displayedPrompt.host || displayedPrompt.origin}
                                </span>
                                {queueTotal > 1 && (
                                    <span
                                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                                            isBright
                                                ? 'bg-black/[0.06] text-zinc-600'
                                                : 'bg-white/[0.10] text-white/75'
                                        }`}
                                    >
                                        {t('pop.permission.queueCount', { current: 1, total: queueTotal }, `1 of ${queueTotal}`)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                    isBright ? 'text-zinc-500' : 'text-white/50'
                                }`}>
                                    {meta.title}
                                </span>
                                {isEphemeral && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/25">
                                        <Shield size={9} />
                                        {t('pop.permission.sessionOnly', null, 'Session only')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleDecision('dismiss')}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                            isBright
                                ? 'text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.06]'
                                : 'text-white/55 hover:text-white hover:bg-white/10'
                        }`}
                        title={t('chrome.closeEsc', null, 'Close (Esc)')}
                        aria-label={t('chrome.closeEsc', null, 'Close (Esc)')}
                    >
                        <X size={13} />
                    </button>
                </div>

                {/* Explanation */}
                <p className={`text-xs leading-relaxed ${isBright ? 'text-zinc-700' : 'text-white/80'}`}>
                    {meta.description}
                </p>

                {/* Action Buttons */}
                {isEphemeral ? (
                    <div className="flex items-center justify-end gap-2 pt-0.5">
                        <button
                            type="button"
                            onClick={() => handleDecision('block')}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer border bg-white/[0.05] hover:bg-red-500/15 hover:border-red-400/35 text-white/80 hover:text-red-300 border-white/[0.10]"
                        >
                            {t('pop.permission.block', null, 'Block')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDecision('allow-once')}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm bg-purple-500 hover:bg-purple-400 text-white"
                        >
                            {t('pop.permission.allowSession', null, 'Allow for session')}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <button
                            type="button"
                            onClick={() => handleDecision('block')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer border ${
                                isBright
                                    ? 'bg-black/[0.04] hover:bg-red-500/10 hover:border-red-500/25 text-zinc-700 hover:text-red-600 border-black/[0.08]'
                                    : 'bg-white/[0.05] hover:bg-red-500/15 hover:border-red-400/35 text-white/75 hover:text-red-300 border-white/[0.10]'
                            }`}
                        >
                            {t('pop.permission.block', null, 'Block')}
                        </button>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleDecision('allow-once')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer border ${
                                    isBright
                                        ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.10]'
                                        : 'bg-white/[0.07] hover:bg-white/[0.13] text-white/90 border-white/[0.12]'
                                }`}
                            >
                                {t('pop.permission.allowOnce', null, 'Allow once')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDecision('allow')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-accent text-zinc-950 hover:brightness-110 shadow-sm transition active:scale-95 cursor-pointer"
                            >
                                {t('pop.permission.allow', null, 'Allow')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
