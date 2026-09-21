import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExternalLink, Tv, Monitor, X, Play, ShieldAlert } from 'lucide-react';

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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0c0d12]/92 hover:bg-[#161722] border border-white/12 hover:border-white/25 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.6)] text-xs text-zinc-300 hover:text-white transition-all duration-200 group active:scale-95"
                >
                    <Tv className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
                    <span className="font-medium text-[11px] tracking-tight">{info.name} Stream</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
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
            <div className="pointer-events-auto bg-[#0c0d12]/95 backdrop-blur-2xl border border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.7)] rounded-2xl p-3 flex items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0 text-zinc-300">
                        {platform ? <Tv className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-zinc-400" />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-white tracking-tight">
                                {info.name} Stream Detected
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/10 text-zinc-400 font-mono">
                                VMP DRM
                            </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate max-w-sm mt-0.5">
                            {info.note}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {info.protocol && (
                        <button
                            onClick={handleOpenAppProtocol}
                            title="Open in Windows Store App"
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 active:scale-95 border border-white/10 text-[11px] font-medium text-zinc-200 hover:text-white flex items-center gap-1.5 transition"
                        >
                            <Play className="w-3 h-3 fill-current text-zinc-300" />
                            <span>Windows App</span>
                        </button>
                    )}

                    <button
                        onClick={handleOpenWithDialog}
                        title="Choose browser via Windows 'How do you want to open this?' dialog"
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 border border-white/15 text-[11px] font-medium text-white flex items-center gap-1.5 transition shadow-sm"
                    >
                        <ExternalLink className="w-3 h-3 text-zinc-300" />
                        <span>Open With...</span>
                    </button>

                    <button
                        onClick={onDismiss}
                        title="Dismiss for this tab"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
