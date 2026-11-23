import React, { useEffect, useState } from 'react';
import { 
    Shield, Globe, RotateCw, RefreshCw, 
    X, Download, Server, Laptop, ExternalLink,
    AlertTriangle, Zap, Copy, Check, Lock
} from 'lucide-react';
import useTorStore from '../../store/useTorStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import usePopoverAnchor from '../../hooks/usePopoverAnchor';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses, getLiquidGlassCardClasses } from '../common/ContextMenuProvider';
import { useTranslation } from '../../i18n/index';

const COUNTRY_CODES = {
    'Germany': 'DE',
    'DE': 'DE',
    'Netherlands': 'NL',
    'NL': 'NL',
    'Switzerland': 'CH',
    'CH': 'CH',
    'United States': 'US',
    'USA': 'US',
    'US': 'US',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'GB': 'GB',
    'France': 'FR',
    'FR': 'FR',
    'Sweden': 'SE',
    'SE': 'SE',
    'Canada': 'CA',
    'CA': 'CA',
    'Austria': 'AT',
    'AT': 'AT',
    'Romania': 'RO',
    'RO': 'RO',
    'Finland': 'FI',
    'FI': 'FI',
    'Norway': 'NO',
    'NO': 'NO',
    'Iceland': 'IS',
    'IS': 'IS',
    'Czechia': 'CZ',
    'Czech Republic': 'CZ',
    'CZ': 'CZ',
    'Poland': 'PL',
    'PL': 'PL',
    'Italy': 'IT',
    'IT': 'IT',
    'Spain': 'ES',
    'ES': 'ES',
    'Australia': 'AU',
    'AU': 'AU',
    'Japan': 'JP',
    'JP': 'JP',
    'Singapore': 'SG',
    'SG': 'SG'
};

const getCountryCode = (country) => {
    if (!country) return 'TOR';
    return COUNTRY_CODES[country] || (country.length === 2 ? country.toUpperCase() : country.slice(0, 3).toUpperCase());
};

const getLocalizedCountry = (country, t) => {
    if (!country) return '';
    const code = COUNTRY_CODES[country];
    return code ? t(`pop.tor.country_${code}`, null, country) : country;
};

export default function TorCircuitPopover({ isClosing }) {
    const { t } = useTranslation();
    const closePopover = useUIStore(state => state.closePopover);
    const showToast = useUIStore(state => state.showToast);

    const securityLevels = [
        { id: 'standard', label: t('pop.tor.secStandard', null, 'Standard'), desc: t('pop.tor.secStandardDesc', null, 'All browser features, media, and scripts enabled normally.') },
        { id: 'safer', label: t('pop.tor.secSafer', null, 'Safer'), desc: t('pop.tor.secSaferDesc', null, 'WebGL disabled; HTML5 audio and video require click-to-play on HTTP.') },
        { id: 'safest', label: t('pop.tor.secSafest', null, 'Safest'), desc: t('pop.tor.secSafestDesc', null, 'JavaScript completely disabled for maximum cyber anonymity.') }
    ];

    const {
        isTorEnabled, toggleTorEnabled,
        status, bootstrapProgress, downloadProgress,
        verifiedExitIp, isTorVerified, securityLevel,
        hasLocalBinary, lastError, isCheckingIp, isRequestingCircuit,
        circuitNodes, startTor, stopTor, newCircuit,
        checkExitIp, downloadBinary, setSecurityLevel, init,
        socksPort
    } = useTorStore();

    const [copiedIp, setCopiedIp] = useState(false);
    const [hoveredSecurityLevel, setHoveredSecurityLevel] = useState(null);

    useEffect(() => {
        init();
    }, [init]);

    const activeSpace = useTabStore(state => state.activeSpace);
    const setActiveSpace = useTabStore(state => state.setActiveSpace);
    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const isConnected = status === 'connected';
    const isStarting = status === 'starting';
    const isDownloading = status === 'downloading';
    const isError = status === 'error';

    const handleCopyIp = () => {
        const ipToCopy = verifiedExitIp || (circuitNodes[2]?.ip);
        if (!ipToCopy) return;
        navigator.clipboard.writeText(ipToCopy);
        setCopiedIp(true);
        showToast(t('pop.tor.exitIpCopied', null, 'Exit IP copied to clipboard'));
        setTimeout(() => setCopiedIp(false), 2000);
    };

    const securityDescriptions = {
        standard: t('pop.tor.secStandardDesc', null, 'All browser features, media, and scripts enabled normally.'),
        safer: t('pop.tor.secSaferDesc', null, 'WebGL disabled; HTML5 audio and video require click-to-play on HTTP.'),
        safest: t('pop.tor.secSafestDesc', null, 'JavaScript completely disabled for maximum cyber anonymity.')
    };

    const guardNode = circuitNodes[0] || { role: 'Guard (Entry)', name: 'GuardRelay-DE', country: 'Germany', ip: '185.220.101.42', latency: '48ms' };
    const middleNode = circuitNodes[1] || { role: 'Middle Relay', name: 'RelayNode-NL', country: 'Netherlands', ip: '194.126.177.10', latency: '92ms' };
    const exitNode = circuitNodes[2] || { role: 'Exit Relay', name: 'ExitNode-CH', country: 'Switzerland', ip: '185.220.101.5', latency: '150ms' };

    const activeIndex = securityLevels.findIndex(s => s.id === securityLevel);
    const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
    const hoveredIndex = securityLevels.findIndex(s => s.id === hoveredSecurityLevel);

    const anchor = usePopoverAnchor('#tour-tor-trigger', 420, { 
        fallbackSelector: '#tour-omnibox-tor-trigger, #qbrowse-extensions-hub',
        defaultRight: 16 
    });

    return (
        <div 
            id="popover-tor-container"
            data-testid="tor-popover"
            onClick={e => e.stopPropagation()}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
            style={{
                ...anchor.style,
                ...getLiquidGlassInlineStyle(isBright)
            }}
            className={`absolute w-[420px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-70px)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-3xl p-4 transition-all duration-200 z-[70000] ${getLiquidGlassSurfaceClasses(isBright)} ${
                isBright
                    ? 'border-purple-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.14),0_0_32px_rgba(168,85,247,0.10)]'
                    : 'border-purple-500/20 shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_40px_rgba(168,85,247,0.12)]'
            } origin-top-right ${
                isClosing ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'
            }`}
        >
            {/* Header */}
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.08]'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center shadow-sm shrink-0 ${
                        isBright ? 'bg-purple-500/10 border-purple-500/25 text-purple-700' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                    }`}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                            <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                            <circle cx="12" cy="12" r="1.5"/>
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className={`text-xs font-bold tracking-wide ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('pop.tor.title', null, 'Tor Network')}</h3>
                            {isConnected ? (
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs ${
                                    isBright ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                                }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {t('common.active', null, 'Active')}
                                </span>
                            ) : isStarting ? (
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs ${
                                    isBright ? 'text-purple-700 bg-purple-500/10 border-purple-500/25' : 'text-purple-300 bg-purple-500/10 border-purple-500/25'
                                }`}>
                                    <RotateCw size={10} className="animate-spin" />
                                    {t('pop.tor.connecting', null, 'Connecting')}
                                </span>
                            ) : isDownloading ? (
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs ${
                                    isBright ? 'text-purple-700 bg-purple-500/10 border-purple-500/25' : 'text-purple-300 bg-purple-500/10 border-purple-500/25'
                                }`}>
                                    <Download size={10} className="animate-bounce" />
                                    {t('pop.tor.downloading', null, 'Downloading')}
                                </span>
                            ) : (
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                    isBright ? 'text-zinc-600 bg-black/[0.04] border-black/[0.08]' : 'text-white/50 bg-white/[0.05] border-white/[0.08]'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isBright ? 'bg-zinc-400' : 'bg-white/40'}`} />
                                    {t('pop.tor.offline', null, 'Offline')}
                                </span>
                            )}
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 font-sans ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                            {isConnected && t('pop.tor.circuitEstablished', null, '3-hop encrypted circuit established')}
                            {isStarting && t('pop.tor.connectingRelays', { progress: bootstrapProgress }, 'Connecting to relays ({progress}%)')}
                            {isDownloading && t('pop.tor.downloadingComponents', { progress: downloadProgress }, 'Downloading Tor components ({progress}%)')}
                            {isError && (lastError || t('pop.tor.connectionError', null, 'Connection error'))}
                            {!isConnected && !isStarting && !isDownloading && !isError && t('pop.tor.multiHopRouting', null, 'Multi-hop onion routing')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Master Switch */}
                    <button
                        onClick={() => toggleTorEnabled()}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 cursor-pointer active:scale-95 ${
                            isTorEnabled ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.5)]' : (isBright ? 'bg-black/15 hover:bg-black/25' : 'bg-white/15 hover:bg-white/25')
                        }`}
                        title={isTorEnabled ? t('pop.tor.disableTor', null, 'Disable Tor') : t('pop.tor.enableTor', null, 'Enable Tor')}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                            isTorEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                    </button>

                    <button 
                        onClick={closePopover}
                        className={`w-8 h-8 rounded-full border transition active:scale-95 cursor-pointer flex items-center justify-center ${
                            isBright
                                ? 'border-black/10 hover:border-black/20 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-600 hover:text-zinc-900'
                                : 'border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white'
                        }`}
                        title={t('pop.tor.closeEsc', null, 'Close (Esc)')}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Connecting / Downloading Progress State */}
            {(isStarting || isDownloading) && (
                <div className={`p-3.5 rounded-2xl border shadow-xs mb-3 ${
                    isBright ? 'bg-purple-500/[0.08] border-purple-500/25' : 'bg-purple-500/[0.08] border-purple-500/25'
                }`}>
                    <div className="flex justify-between items-center text-xs font-semibold mb-2">
                        <span className={`flex items-center gap-1.5 ${isBright ? 'text-purple-900' : 'text-purple-200'}`}>
                            <RotateCw size={12} className={`animate-spin ${isBright ? 'text-purple-600' : 'text-purple-400'}`} />
                            {isDownloading ? t('pop.tor.downloadingProgress', null, 'Downloading Tor components...') : t('pop.tor.bootstrappingProgress', null, 'Bootstrapping Tor circuit...')}
                        </span>
                        <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full border ${
                            isBright ? 'text-purple-700 bg-purple-500/15 border-purple-500/30' : 'text-purple-300 bg-purple-500/20 border-purple-500/30'
                        }`}>
                            {isDownloading ? downloadProgress : bootstrapProgress}%
                        </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 border ${
                        isBright ? 'bg-black/10 border-black/[0.06]' : 'bg-black/40 border-white/[0.06]'
                    }`}>
                        <div 
                            className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                            style={{ width: `${isDownloading ? downloadProgress : bootstrapProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Offline State */}
            {!isConnected && !isStarting && !isDownloading && (
                <div className={`p-4 rounded-2xl border text-center shadow-xs flex flex-col items-center ${getLiquidGlassCardClasses(isBright)}`}>
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-md mb-2.5 ${
                        isBright ? 'bg-purple-500/10 border-purple-500/25 text-purple-700' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                    }`}>
                        <Shield size={20} />
                    </div>
                    <h4 className={`text-xs font-bold mb-1 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                        {t('pop.tor.privateOnionRouting', null, 'Private Onion Routing')}
                    </h4>
                    <p className={`text-[11px] leading-relaxed mb-4 max-w-[290px] mx-auto ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                        {t('pop.tor.privateOnionDesc', null, 'Routes web requests across decentralized encrypted nodes to disguise your origin and browse .onion addresses.')}
                    </p>

                    {isError && lastError && (
                        <div className={`mb-3.5 w-full px-3 py-2 rounded-xl border text-[11px] flex items-center gap-2 text-left ${
                            isBright ? 'bg-rose-500/10 border-rose-500/25 text-rose-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}>
                            <AlertTriangle size={13} className="shrink-0" />
                            <span className="truncate flex-1">{lastError}</span>
                        </div>
                    )}

                    {!hasLocalBinary ? (
                        <button
                            onClick={downloadBinary}
                            className="w-full h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer"
                        >
                            <Download size={14} />
                            {t('pop.tor.downloadTorComponent', null, 'Download Tor Component')}
                        </button>
                    ) : (
                        <button
                            onClick={startTor}
                            className="w-full h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer"
                        >
                            <Zap size={14} />
                            {t('pop.tor.connectToTor', null, 'Connect to Tor')}
                        </button>
                    )}

                    <div className={`w-full mt-3.5 pt-2.5 border-t flex items-center justify-between text-[10px] ${
                        isBright ? 'border-black/[0.06] text-zinc-500' : 'border-white/[0.06] text-white/40'
                    }`}>
                        <span className={`px-2.5 py-1 rounded-full border font-mono ${
                            isBright ? 'bg-black/[0.03] border-black/[0.08]' : 'bg-white/[0.03] border-white/[0.06]'
                        }`}>
                            {t('pop.tor.proxyLabel', { port: socksPort || 9050 }, 'Proxy: 127.0.0.1:{port}')}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
                            isBright ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700' : 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t('pop.tor.dnsIsolated', null, 'DNS Isolated')}
                        </span>
                    </div>
                </div>
            )}

            {/* Connected State Content */}
            {isConnected && (
                <>
                    {/* Vertical Circuit Path */}
                    <div className={`p-3.5 rounded-2xl border shadow-xs mb-3 ${getLiquidGlassCardClasses(isBright)}`}>
                        <div className={`flex items-center justify-between mb-3 pb-2.5 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                                {t('pop.tor.circuitPath', null, 'Circuit Path (3 Hops)')}
                            </span>
                            <button 
                                onClick={newCircuit}
                                disabled={isRequestingCircuit}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition active:scale-95 cursor-pointer border ${
                                    isRequestingCircuit 
                                        ? (isBright ? 'bg-purple-500/15 text-purple-800 border-purple-500/35' : 'bg-purple-500/20 text-purple-200 border-purple-500/40')
                                        : (isBright ? 'text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/25' : 'text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30')
                                }`}
                                title={t('pop.tor.newIdentityTitle', null, 'Request new circuit with a different IP address (SIGNAL NEWNYM)')}
                            >
                                <RotateCw size={10} className={isRequestingCircuit ? 'animate-spin' : ''} />
                                <span>{isRequestingCircuit ? t('pop.tor.switching', null, 'Switching...') : t('pop.tor.newIdentity', null, 'New Identity')}</span>
                            </button>
                        </div>

                        {/* Connected Node Stepper */}
                        <div className="space-y-0 text-xs">
                            {/* 1. Client Browser */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center group-hover:scale-105 transition-transform ${
                                        isBright ? 'bg-black/[0.04] border-black/10 text-zinc-700' : 'bg-white/[0.06] border-white/10 text-white/70'
                                    }`}>
                                        <Laptop size={12} />
                                    </div>
                                    <div className={`w-0.5 h-6 bg-gradient-to-b my-0.5 ${isBright ? 'from-zinc-400/50 to-purple-500/40' : 'from-white/20 to-purple-500/30'}`} />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className={`font-semibold text-[11px] ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('pop.tor.thisBrowser', null, 'This Browser')}</span>
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                            isBright ? 'text-zinc-600 bg-black/[0.04] border-black/[0.08]' : 'text-white/50 bg-white/[0.04] border-white/[0.06]'
                                        }`}>{t('pop.tor.local', null, 'Local')}</span>
                                    </div>
                                    <p className={`text-[10px] truncate ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>{t('pop.tor.qbrowseClientEncrypted', null, 'QBrowse Client · Encrypted')}</p>
                                </div>
                            </div>

                            {/* 2. Guard / Entry Node */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.2)] group-hover:scale-105 transition-transform ${
                                        isBright ? 'bg-purple-500/15 border-purple-500/30 text-purple-700' : 'bg-purple-500/20 border-purple-500/35 text-purple-300'
                                    }`}>
                                        <Shield size={12} />
                                    </div>
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500/30 to-indigo-500/30 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-semibold text-[11px] ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('pop.tor.guardEntry', null, 'Guard (Entry)')}</span>
                                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                                isBright ? 'bg-purple-500/10 text-purple-800 border-purple-500/25' : 'bg-white/10 text-purple-200 border-purple-500/20'
                                            }`}>{getCountryCode(guardNode.country)}</span>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>{getLocalizedCountry(guardNode.country, t) || t('pop.tor.guardFallback', null, 'Guard')}</span>
                                        </div>
                                        {guardNode.latency && (
                                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                                isBright ? 'text-purple-700 bg-purple-500/10 border-purple-500/25' : 'text-purple-300 bg-purple-500/15 border-purple-500/25'
                                            }`}>{guardNode.latency}</span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] truncate font-mono ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                        {guardNode.name || 'GuardRelay'} · {guardNode.ip || 'Relay IP'}
                                    </p>
                                </div>
                            </div>

                            {/* 3. Middle Relay */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.2)] group-hover:scale-105 transition-transform ${
                                        isBright ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-700' : 'bg-indigo-500/20 border-indigo-500/35 text-indigo-300'
                                    }`}>
                                        <Server size={12} />
                                    </div>
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500/30 to-emerald-500/30 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-semibold text-[11px] ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('pop.tor.middleRelay', null, 'Middle Relay')}</span>
                                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                                isBright ? 'bg-indigo-500/10 text-indigo-800 border-indigo-500/25' : 'bg-white/10 text-indigo-200 border-indigo-500/20'
                                            }`}>{getCountryCode(middleNode.country)}</span>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>{getLocalizedCountry(middleNode.country, t) || t('pop.tor.relayFallback', null, 'Relay')}</span>
                                        </div>
                                        {middleNode.latency && (
                                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                                isBright ? 'text-indigo-700 bg-indigo-500/10 border-indigo-500/25' : 'text-indigo-300 bg-indigo-500/15 border-indigo-500/25'
                                            }`}>{middleNode.latency}</span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] truncate font-mono ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                        {middleNode.name || 'MiddleRelay'} · {middleNode.ip || 'Relay IP'}
                                    </p>
                                </div>
                            </div>

                            {/* 4. Exit Node */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)] group-hover:scale-105 transition-transform ${
                                        isBright ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700' : 'bg-emerald-500/20 border-emerald-500/35 text-emerald-300'
                                    }`}>
                                        <Globe size={12} />
                                    </div>
                                    <div className={`w-0.5 h-6 bg-gradient-to-b my-0.5 ${isBright ? 'from-emerald-500/40 to-zinc-400/50' : 'from-emerald-500/30 to-white/20'}`} />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-semibold text-[11px] ${isBright ? 'text-emerald-700' : 'text-emerald-300'}`}>{t('pop.tor.exitNode', null, 'Exit Node')}</span>
                                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                                isBright ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25' : 'bg-white/10 text-emerald-200 border-emerald-500/20'
                                            }`}>{getCountryCode(exitNode.country)}</span>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>{getLocalizedCountry(exitNode.country, t) || t('pop.tor.exitFallback', null, 'Exit')}</span>
                                        </div>
                                        {exitNode.latency && (
                                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                                isBright ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25' : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25'
                                            }`}>{exitNode.latency}</span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] truncate font-mono ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                        {isRequestingCircuit ? (
                                            <span className={`animate-pulse ${isBright ? 'text-purple-700' : 'text-purple-300'}`}>{t('pop.tor.switchingExitRelay', null, 'Switching exit relay...')}</span>
                                        ) : (
                                            `${exitNode.name || 'ExitRelay'} · ${verifiedExitIp || exitNode.ip || 'Exit IP'}`
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* 5. Destination Internet */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center group-hover:scale-105 transition-transform ${
                                        isBright ? 'bg-black/[0.04] border-black/10 text-zinc-700' : 'bg-white/[0.06] border-white/10 text-white/70'
                                    }`}>
                                        <ExternalLink size={12} />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className={`font-semibold text-[11px] ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('pop.tor.internet', null, 'Internet')}</span>
                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                            isBright ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                        }`}>{t('pop.tor.endToEndEncrypted', null, 'End-to-End Encrypted')}</span>
                                    </div>
                                    <p className={`text-[10px] truncate ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>{t('pop.tor.clearwebOnion', null, 'Clearweb & .onion Hidden Services')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exit Identity Card */}
                    <div className={`p-3.5 rounded-2xl border shadow-xs mb-3 flex flex-col gap-2.5 ${getLiquidGlassCardClasses(isBright)}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                                {t('pop.tor.publicExitIp', null, 'Public Exit IP')}
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={checkExitIp}
                                    disabled={isCheckingIp || isRequestingCircuit}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition active:scale-95 disabled:opacity-50 text-[10px] font-medium cursor-pointer ${
                                        isBright
                                            ? 'border-black/10 hover:border-black/20 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-zinc-900'
                                            : 'border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white'
                                    }`}
                                    title={t('pop.tor.verifyTitle', null, 'Verify exit node with Tor Project directory')}
                                >
                                    <RefreshCw size={10} className={isCheckingIp ? 'animate-spin' : ''} />
                                    <span>{t('pop.tor.verify', null, 'Verify')}</span>
                                </button>
                                {isTorVerified && !isRequestingCircuit && (
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-xs ${
                                        isBright ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                    }`}>
                                        <Check size={10} />
                                        {t('pop.tor.torVerified', null, 'Tor Verified')}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold font-mono tracking-wide select-all transition-colors ${
                                isRequestingCircuit
                                    ? (isBright ? 'text-purple-700 animate-pulse' : 'text-purple-300 animate-pulse')
                                    : (isBright ? 'text-zinc-900' : 'text-white')
                            }`}>
                                {isRequestingCircuit ? t('pop.tor.negotiatingExit', null, 'Negotiating new exit node...') : (verifiedExitIp || (isCheckingIp ? t('pop.tor.verifyingIp', null, 'Verifying IP...') : (exitNode.ip || '185.220.101.5')))}
                            </span>
                            <button
                                onClick={handleCopyIp}
                                className={`px-3 py-1 rounded-full border transition flex items-center gap-1.5 text-[11px] font-medium active:scale-95 cursor-pointer ${
                                    isBright
                                        ? 'border-black/10 hover:border-black/20 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-zinc-950'
                                        : 'border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white'
                                }`}
                                title={t('pop.tor.copyExitIpTitle', null, 'Copy Exit IP')}
                            >
                                {copiedIp ? (
                                    <>
                                        <Check size={12} className="text-emerald-500" />
                                        <span className={isBright ? 'text-emerald-700' : 'text-emerald-400'}>{t('pop.tor.copied', null, 'Copied')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        <span>{t('common.copy', null, 'Copy')}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${
                            isBright ? 'border-black/[0.06] text-zinc-500' : 'border-white/[0.06] text-white/40'
                        }`}>
                            <span className={`px-2 py-0.5 rounded-full border font-mono ${
                                isBright ? 'bg-black/[0.03] border-black/[0.08]' : 'bg-white/[0.03] border-white/[0.06]'
                            }`}>
                                SOCKS5: 127.0.0.1:{socksPort || 9050}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
                                isBright ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700' : 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
                            }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {t('pop.tor.dnsWebrtcIsolated', null, 'DNS & WebRTC Isolated')}
                            </span>
                        </div>
                    </div>

                    {/* Security Level Control */}
                    <div className="mb-3.5">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                                {t('pop.tor.securityLevel', null, 'Security Level')}
                            </span>
                        </div>
                        
                        {/* Signature Sliding Pill Switcher */}
                        <div 
                            onMouseLeave={() => setHoveredSecurityLevel(null)} 
                            className={`relative grid grid-cols-3 p-1 rounded-full border transition-colors duration-200 select-none ${
                                isBright
                                    ? 'border-black/[0.08] bg-black/[0.03] shadow-xs'
                                    : 'border-white/[0.08] bg-[#0c0d16]/78 shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                            }`}
                        >
                            {/* Hover preview pill */}
                            {hoveredIndex >= 0 && hoveredIndex !== safeActiveIndex && (
                                <div
                                    className={`absolute top-1 bottom-1 rounded-full pointer-events-none ${
                                        isBright ? 'bg-black/[0.05]' : 'bg-white/[0.06]'
                                    }`}
                                    style={{
                                        left: '4px',
                                        width: 'calc((100% - 8px) / 3)',
                                        transform: `translateX(${hoveredIndex * 100}%)`,
                                        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
                                    }}
                                />
                            )}

                            {/* Active Pill Indicator */}
                            <div
                                className="absolute top-1 bottom-1 rounded-full border pointer-events-none"
                                style={{
                                    left: '4px',
                                    width: 'calc((100% - 8px) / 3)',
                                    transform: `translateX(${safeActiveIndex * 100}%)`,
                                    transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                                    borderColor: isBright ? 'rgba(147, 51, 234, 0.35)' : 'rgba(168, 85, 247, 0.45)',
                                    backgroundColor: isBright ? 'rgba(168, 85, 247, 0.14)' : 'rgba(168, 85, 247, 0.22)',
                                    boxShadow: isBright
                                        ? '0 2px 8px rgba(168, 85, 247, 0.14)'
                                        : '0 2px 12px rgba(168, 85, 247, 0.28), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                                }}
                            />

                            {securityLevels.map((item) => {
                                const isSelected = securityLevel === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onMouseEnter={() => setHoveredSecurityLevel(item.id)}
                                        onClick={() => setSecurityLevel(item.id)}
                                        className={`relative z-10 py-1.5 text-center text-xs font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer ${
                                            isSelected 
                                                ? (isBright ? 'text-purple-800 font-bold' : 'text-purple-200 font-bold drop-shadow-sm')
                                                : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/50 hover:text-white/80')
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Security Level Callout Card */}
                        <div className={`mt-2 p-2.5 rounded-2xl border text-[11px] leading-relaxed flex items-center gap-2.5 ${getLiquidGlassCardClasses(isBright)} ${
                            isBright ? 'text-zinc-700' : 'text-white/55'
                        }`}>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isBright ? 'bg-purple-500/10 border-purple-500/25 text-purple-700' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                            }`}>
                                <Lock size={10} />
                            </div>
                            <span>{securityDescriptions[securityLevel] || securityDescriptions.standard}</span>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className={`pt-3 border-t flex items-center gap-2.5 ${isBright ? 'border-black/[0.06]' : 'border-white/[0.08]'}`}>
                        {activeSpace !== 'tor' && (
                            <button
                                onClick={() => {
                                    setActiveSpace('tor');
                                    closePopover();
                                }}
                                className="flex-1 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer"
                            >
                                <Globe size={13} />
                                {t('pop.tor.switchToTorSpace', null, 'Switch to Tor Space')}
                            </button>
                        )}

                        <button
                            onClick={stopTor}
                            className={`h-10 px-5 rounded-full border transition text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                isBright
                                    ? 'border-black/10 hover:border-rose-500/35 bg-black/[0.04] hover:bg-rose-500/10 text-zinc-700 hover:text-rose-700'
                                    : 'border-white/[0.08] hover:border-rose-500/30 bg-white/[0.04] hover:bg-rose-500/15 text-white/70 hover:text-rose-300'
                            } ${
                                activeSpace === 'tor' ? 'w-full' : ''
                            }`}
                        >
                            {t('pop.tor.disconnect', null, 'Disconnect')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
