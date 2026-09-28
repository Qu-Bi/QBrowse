import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExternalLink, Tv, Monitor, X, Play, ShieldAlert } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export const VMP_STREAMING_PLATFORMS = [
    {
        id: 'netflix',
        name: 'Netflix',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('netflix.com');
            } catch (_) { return false; }
        },
        protocol: 'netflix://',
        note: 'Netflix requires Google Widevine VMP hardware DRM for 1080p/4K playback.'
    },
    {
        id: 'primevideo',
        name: 'Prime Video',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('primevideo.com') || 
                       (u.hostname.includes('amazon.') && (u.pathname.includes('/video') || u.pathname.includes('/gp/video')));
            } catch (_) { return false; }
        },
        protocol: 'primevideo://',
        note: 'Prime Video requires hardware DRM certification for HD/UHD playback.'
    },
    {
        id: 'disneyplus',
        name: 'Disney+',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('disneyplus.com');
            } catch (_) { return false; }
        },
        protocol: 'disneyplus://',
        note: 'Disney+ requires certified hardware DRM for protected video streaming.'
    },
    {
        id: 'max',
        name: 'Max',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('max.com') || u.hostname.includes('hbomax.com');
            } catch (_) { return false; }
        },
        protocol: null,
        note: 'Max requires certified Widevine VMP DRM for protected streams.'
    },
    {
        id: 'hulu',
        name: 'Hulu',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('hulu.com');
            } catch (_) { return false; }
        },
        protocol: 'hulu://',
        note: 'Hulu requires a certified browser DRM pipeline for video playback.'
    },
    {
        id: 'appletv',
        name: 'Apple TV+',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('tv.apple.com');
            } catch (_) { return false; }
        },
        protocol: 'appletv://',
        note: 'Apple TV+ requires Apple FairPlay or certified system browser DRM.'
    },
    {
        id: 'paramountplus',
        name: 'Paramount+',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('paramountplus.com');
            } catch (_) { return false; }
        },
        protocol: null,
        note: 'Paramount+ requires certified hardware DRM for protected content.'
    },
    {
        id: 'peacock',
        name: 'Peacock',
        match: (url) => {
            try {
                const u = new URL(url);
                return u.hostname.includes('peacocktv.com');
            } catch (_) { return false; }
        },
        protocol: null,
        note: 'Peacock requires certified hardware DRM for protected content.'
    }
];

export function detectVmpPlatform(url) {
    if (!url || typeof url !== 'string' || url === 'about:blank' || url.startsWith('qbrowse://')) {
        return null;
    }
    return VMP_STREAMING_PLATFORMS.find(platform => platform.match(url)) || null;
}

export default function DrmHandOffBanner({
    url,
    genericDrmError = null,
    isDismissed = false,
    onDismiss
}) {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const platform = useMemo(() => detectVmpPlatform(url), [url]);
    const info = platform || (genericDrmError ? {
        name: 'Protected Stream',
        protocol: null,
        note: genericDrmError.keySystem
            ? `Site requested ${genericDrmError.keySystem} which requires certified platform DRM.`
            : 'Protected media playback requires certified Google Widevine VMP hardware DRM.'
    } : null);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const collapseTimerRef = useRef(null);

    // 8-second auto-collapse timer
    useEffect(() => {
        if (!info || isDismissed) {
            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
            return;
        }

        // Reset collapse state when url/platform changes
        setIsCollapsed(false);

        if (!isHovered) {
            collapseTimerRef.current = setTimeout(() => {
                setIsCollapsed(true);
            }, 8000);
        }

        return () => {
            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
        };
    }, [url, genericDrmError, isDismissed, isHovered]);

    if (!info || isDismissed) return null;

    const handleOpenWithDialog = () => {
        if (window.electronAPI && window.electronAPI.openWithDialog) {
            window.electronAPI.openWithDialog(url);
        } else if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    const handleOpenAppProtocol = () => {
        if (info.protocol && window.electronAPI && window.electronAPI.openAppProtocol) {
            window.electronAPI.openAppProtocol(info.protocol, url);
        } else {
            handleOpenWithDialog();
        }
    };

    // Render collapsed floating corner badge
    if (isCollapsed) {
        return (
            <div className="absolute top-3 right-4 z-40 pointer-events-auto select-none animate-in fade-in duration-200">
                <button
                    onClick={() => {
                        setIsCollapsed(false);
                    }}
                    title={`${info.name} requires certified DRM. Click to open hand-off options.`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl text-xs transition-all duration-200 group active:scale-95 ${
                        isBright 
                            ? 'bg-white/90 hover:bg-white border-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-zinc-800 hover:text-zinc-950'
                            : 'bg-[#0c0d12]/92 hover:bg-[#161722] border-white/12 hover:border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.6)] text-zinc-300 hover:text-white'
                    }`}
                >
                    <Tv className={`w-3.5 h-3.5 transition-colors ${isBright ? 'text-zinc-500 group-hover:text-zinc-900' : 'text-zinc-400 group-hover:text-white'}`} />
                    <span className="font-medium text-[11px] tracking-tight">{info.name} Stream</span>
                    <ExternalLink className={`w-3 h-3 ${isBright ? 'text-zinc-400 group-hover:text-zinc-700' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                </button>
            </div>
        );
    }

    // Render full floating action banner
    return (
        <div 
            className="absolute top-3 inset-x-0 mx-auto z-40 max-w-xl px-4 pointer-events-none select-none animate-in fade-in slide-in-from-top-2 duration-300"
            onMouseEnter={() => {
                setIsHovered(true);
                if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
        >
            <div className={`pointer-events-auto backdrop-blur-3xl rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-300 ${
                isBright
                    ? 'bg-white/85 border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] text-zinc-900'
                    : 'bg-[#0c0d12]/95 border border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-white'
            }`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        isBright ? 'bg-black/[0.04] border-black/10 text-zinc-600' : 'bg-white/[0.06] border-white/10 text-zinc-300'
                    }`}>
                        {platform ? <Tv className="w-4 h-4" /> : <ShieldAlert className={`w-4 h-4 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`} />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`font-semibold text-xs tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                {info.name} Stream Detected
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${
                                isBright ? 'bg-black/5 border-black/10 text-zinc-600' : 'bg-white/[0.06] border-white/10 text-zinc-400'
                            }`}>
                                VMP DRM
                            </span>
                        </div>
                        <p className={`text-[11px] truncate max-w-sm mt-0.5 ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {info.note}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {info.protocol && (
                        <button
                            onClick={handleOpenAppProtocol}
                            title="Open in Windows Store App"
                            className={`px-2.5 py-1.5 rounded-lg active:scale-95 border text-[11px] font-medium flex items-center gap-1.5 transition ${
                                isBright 
                                    ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800 hover:text-zinc-950' 
                                    : 'bg-white/[0.06] hover:bg-white/10 border-white/10 text-zinc-200 hover:text-white'
                            }`}
                        >
                            <Play className={`w-3 h-3 fill-current ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`} />
                            <span>Windows App</span>
                        </button>
                    )}

                    <button
                        onClick={handleOpenWithDialog}
                        title="Choose browser via Windows 'How do you want to open this?' dialog"
                        className={`px-3 py-1.5 rounded-lg active:scale-95 border text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm ${
                            isBright
                                ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-900 hover:text-black'
                                : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                        }`}
                    >
                        <ExternalLink className={`w-3 h-3 ${isBright ? 'text-zinc-600' : 'text-zinc-300'}`} />
                        <span>Open With...</span>
                    </button>

                    <button
                        onClick={onDismiss}
                        title="Dismiss for this tab"
                        className={`p-1.5 rounded-lg transition ${
                            isBright ? 'text-zinc-400 hover:text-zinc-900 hover:bg-black/5' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
