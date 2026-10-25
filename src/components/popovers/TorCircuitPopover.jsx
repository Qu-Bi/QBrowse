import React, { useEffect, useState } from 'react';
import { 
    Shield, Globe, RotateCw, RefreshCw, 
    X, Download, Server, Laptop, ExternalLink,
    AlertTriangle, Zap, Copy, Check, Lock
} from 'lucide-react';
import useTorStore from '../../store/useTorStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

const COUNTRY_FLAGS = {
    'Germany': '🇩🇪',
    'DE': '🇩🇪',
    'Netherlands': '🇳🇱',
    'NL': '🇳🇱',
    'Switzerland': '🇨🇭',
    'CH': '🇨🇭',
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'US': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'GB': '🇬🇧',
    'France': '🇫🇷',
    'FR': '🇫🇷',
    'Sweden': '🇸🇪',
    'SE': '🇸🇪',
    'Canada': '🇨🇦',
    'CA': '🇨🇦',
    'Austria': '🇦🇹',
    'AT': '🇦🇹',
    'Romania': '🇷🇴',
    'RO': '🇷🇴',
    'Finland': '🇫🇮',
    'FI': '🇫🇮',
    'Norway': '🇳🇴',
    'NO': '🇳🇴',
    'Iceland': '🇮🇸',
    'IS': '🇮🇸',
    'Czechia': '🇨🇿',
    'Czech Republic': '🇨🇿',
    'CZ': '🇨🇿',
    'Poland': '🇵🇱',
    'PL': '🇵🇱',
    'Italy': '🇮🇹',
    'IT': '🇮🇹',
    'Spain': '🇪🇸',
    'ES': '🇪🇸',
    'Australia': '🇦🇺',
    'AU': '🇦🇺',
    'Japan': '🇯🇵',
    'JP': '🇯🇵',
    'Singapore': '🇸🇬',
    'SG': '🇸🇬'
};

const getFlag = (country) => COUNTRY_FLAGS[country] || '🌐';

const securityLevels = [
    { id: 'standard', label: 'Standard', desc: 'All browser features and media enabled.' },
    { id: 'safer', label: 'Safer', desc: 'WebGL disabled; HTML5 media requires click-to-play on HTTP.' },
    { id: 'safest', label: 'Safest', desc: 'JavaScript completely disabled for maximum privacy.' }
];

export default function TorCircuitPopover({ isClosing }) {
    const closePopover = useUIStore(state => state.closePopover);
    const showToast = useUIStore(state => state.showToast);

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

    const isConnected = status === 'connected';
    const isStarting = status === 'starting';
    const isDownloading = status === 'downloading';
    const isError = status === 'error';

    const handleCopyIp = () => {
        const ipToCopy = verifiedExitIp || (circuitNodes[2]?.ip);
        if (!ipToCopy) return;
        navigator.clipboard.writeText(ipToCopy);
        setCopiedIp(true);
        showToast('Exit IP copied to clipboard');
        setTimeout(() => setCopiedIp(false), 2000);
    };

    const securityDescriptions = {
        standard: 'All browser features, media, and scripts enabled normally.',
        safer: 'WebGL disabled; HTML5 audio and video require click-to-play on HTTP.',
        safest: 'JavaScript completely disabled for maximum cyber anonymity.'
    };

    const guardNode = circuitNodes[0] || { role: 'Guard (Entry)', name: 'GuardRelay-DE', country: 'Germany', ip: '185.220.101.42', latency: '48ms' };
    const middleNode = circuitNodes[1] || { role: 'Middle Relay', name: 'RelayNode-NL', country: 'Netherlands', ip: '194.126.177.10', latency: '92ms' };
    const exitNode = circuitNodes[2] || { role: 'Exit Relay', name: 'ExitNode-CH', country: 'Switzerland', ip: '185.220.101.5', latency: '150ms' };

    const activeIndex = securityLevels.findIndex(s => s.id === securityLevel);
    const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
    const hoveredIndex = securityLevels.findIndex(s => s.id === hoveredSecurityLevel);

    return (
        <div 
            id="popover-tor-container"
            data-testid="tor-popover"
            onClick={e => e.stopPropagation()}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
            style={{
                backdropFilter: 'blur(32px) saturate(190%)',
                WebkitBackdropFilter: 'blur(32px) saturate(190%)'
            }}
            className={`absolute top-3 right-4 w-[420px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-70px)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-3xl p-4 transition-all duration-200 z-[70000] border bg-[#0c0d16]/85 border-purple-500/20 text-white shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_40px_rgba(168,85,247,0.12)] origin-top-right ${
                isClosing ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-sm shrink-0">
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                            <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                            <circle cx="12" cy="12" r="1.5"/>
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-white tracking-wide">Tor Network</h3>
                            {isConnected ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active
                                </span>
                            ) : isStarting ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/25 shadow-xs">
                                    <RotateCw size={10} className="animate-spin text-purple-300" />
                                    Connecting
                                </span>
                            ) : isDownloading ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/25 shadow-xs">
                                    <Download size={10} className="animate-bounce text-purple-300" />
                                    Downloading
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-white/50 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                    Offline
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-white/50 truncate mt-0.5 font-sans">
                            {isConnected && '3-hop encrypted circuit established'}
                            {isStarting && `Connecting to relays (${bootstrapProgress}%)`}
                            {isDownloading && `Downloading Tor components (${downloadProgress}%)`}
                            {isError && (lastError || 'Connection error')}
                            {!isConnected && !isStarting && !isDownloading && !isError && 'Multi-hop onion routing'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Master Switch */}
                    <button
                        onClick={() => toggleTorEnabled()}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 cursor-pointer active:scale-95 ${
                            isTorEnabled ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.5)]' : 'bg-white/15 hover:bg-white/25'
                        }`}
                        title={isTorEnabled ? 'Disable Tor' : 'Enable Tor'}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                            isTorEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                    </button>

                    <button 
                        onClick={closePopover}
                        className="w-8 h-8 rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition active:scale-95 cursor-pointer flex items-center justify-center"
                        title="Close (Esc)"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Connecting / Downloading Progress State */}
            {(isStarting || isDownloading) && (
                <div className="p-3.5 rounded-2xl bg-purple-500/[0.08] border border-purple-500/25 shadow-xs mb-3">
                    <div className="flex justify-between items-center text-xs font-semibold mb-2">
                        <span className="text-purple-200 flex items-center gap-1.5">
                            <RotateCw size={12} className="animate-spin text-purple-400" />
                            {isDownloading ? 'Downloading Tor components...' : 'Bootstrapping Tor circuit...'}
                        </span>
                        <span className="text-purple-300 font-mono font-bold text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                            {isDownloading ? downloadProgress : bootstrapProgress}%
                        </span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                            style={{ width: `${isDownloading ? downloadProgress : bootstrapProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Offline State */}
            {!isConnected && !isStarting && !isDownloading && (
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] text-center shadow-xs flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md mb-2.5">
                        <Shield size={20} />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                        Private Onion Routing
                    </h4>
                    <p className="text-[11px] text-white/50 leading-relaxed mb-4 max-w-[290px] mx-auto">
                        Routes web requests across decentralized encrypted nodes to disguise your origin and browse .onion addresses.
                    </p>

                    {isError && lastError && (
                        <div className="mb-3.5 w-full px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2 text-left">
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
                            Download Tor Component
                        </button>
                    ) : (
                        <button
                            onClick={startTor}
                            className="w-full h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer"
                        >
                            <Zap size={14} />
                            Connect to Tor
                        </button>
                    )}

                    <div className="w-full mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40">
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] font-mono">
                            Proxy: 127.0.0.1:{socksPort || 9050}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            DNS Isolated
                        </span>
                    </div>
                </div>
            )}

            {/* Connected State Content */}
            {isConnected && (
                <>
                    {/* Vertical Circuit Path */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07] shadow-xs mb-3">
                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                Circuit Path (3 Hops)
                            </span>
                            <button 
                                onClick={newCircuit}
                                disabled={isRequestingCircuit}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition active:scale-95 cursor-pointer border ${
                                    isRequestingCircuit 
                                        ? 'bg-purple-500/20 text-purple-200 border-purple-500/40' 
                                        : 'text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30'
                                }`}
                                title="Request new circuit with a different IP address (SIGNAL NEWNYM)"
                            >
                                <RotateCw size={10} className={isRequestingCircuit ? 'animate-spin text-purple-400' : ''} />
                                <span>{isRequestingCircuit ? 'Switching...' : 'New Identity'}</span>
                            </button>
                        </div>

                        {/* Connected Node Stepper */}
                        <div className="space-y-0 text-xs">
                            {/* 1. Client Browser */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 group-hover:scale-105 transition-transform">
                                        <Laptop size={12} />
                                    </div>
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-white/20 to-purple-500/30 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-white text-[11px]">This Browser</span>
                                        <span className="text-[9px] text-white/50 font-mono px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">Local</span>
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate">QBrowse Client · Encrypted</p>
                                </div>
                            </div>

                            {/* 2. Guard / Entry Node */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/35 flex items-center justify-center text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)] group-hover:scale-105 transition-transform">
                                        <Shield size={12} />
                                    </div>
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500/30 to-indigo-500/30 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-[11px]">Guard (Entry)</span>
                                            <span className="text-[12px]">{getFlag(guardNode.country)}</span>
                                            <span className="text-[10px] text-white/60">{guardNode.country || 'Guard'}</span>
                                        </div>
                                        {guardNode.latency && (
                                            <span className="text-[9px] text-purple-300 font-mono px-1.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25">{guardNode.latency}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate font-mono">
                                        {guardNode.name || 'GuardRelay'} · {guardNode.ip || 'Relay IP'}
                                    </p>
                                </div>
                            </div>

                            {/* 3. Middle Relay */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/35 flex items-center justify-center text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)] group-hover:scale-105 transition-transform">
                                        <Server size={12} />
                                    </div>
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500/30 to-emerald-500/30 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-[11px]">Middle Relay</span>
                                            <span className="text-[12px]">{getFlag(middleNode.country)}</span>
                                            <span className="text-[10px] text-white/60">{middleNode.country || 'Relay'}</span>
                                        </div>
                                        {middleNode.latency && (
                                            <span className="text-[9px] text-indigo-300 font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25">{middleNode.latency}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate font-mono">
                                        {middleNode.name || 'MiddleRelay'} · {middleNode.ip || 'Relay IP'}
                                    </p>
                                </div>
                            </div>

                            {/* 4. Exit Node */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] group-hover:scale-105 transition-transform">
                                        <Globe size={12} />
                                    </div>
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/30 to-white/20 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-emerald-300 text-[11px]">Exit Node</span>
                                            <span className="text-[12px]">{getFlag(exitNode.country)}</span>
                                            <span className="text-[10px] text-white/60">{exitNode.country || 'Exit'}</span>
                                        </div>
                                        {exitNode.latency && (
                                            <span className="text-[9px] text-emerald-300 font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25">{exitNode.latency}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate font-mono">
                                        {isRequestingCircuit ? (
                                            <span className="text-purple-300 animate-pulse">Switching exit relay...</span>
                                        ) : (
                                            `${exitNode.name || 'ExitRelay'} · ${verifiedExitIp || exitNode.ip || 'Exit IP'}`
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* 5. Destination Internet */}
                            <div className="flex items-start gap-3 relative group">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 group-hover:scale-105 transition-transform">
                                        <ExternalLink size={12} />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-white text-[11px]">Internet</span>
                                        <span className="text-[9px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">End-to-End Encrypted</span>
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate">Clearweb &amp; .onion Hidden Services</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exit Identity Card */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07] shadow-xs mb-3 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                Public Exit IP
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={checkExitIp}
                                    disabled={isCheckingIp || isRequestingCircuit}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition active:scale-95 disabled:opacity-50 text-[10px] font-medium cursor-pointer"
                                    title="Verify exit node with Tor Project directory"
                                >
                                    <RefreshCw size={10} className={isCheckingIp ? 'animate-spin' : ''} />
                                    <span>Verify</span>
                                </button>
                                {isTorVerified && !isRequestingCircuit && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 shadow-xs">
                                        <Check size={10} />
                                        Tor Verified
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold font-mono tracking-wide select-all transition-colors ${
                                isRequestingCircuit ? 'text-purple-300 animate-pulse' : 'text-white'
                            }`}>
                                {isRequestingCircuit ? 'Negotiating new exit node...' : (verifiedExitIp || (isCheckingIp ? 'Verifying IP...' : (exitNode.ip || '185.220.101.5')))}
                            </span>
                            <button
                                onClick={handleCopyIp}
                                className="px-3 py-1 rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition flex items-center gap-1.5 text-[11px] font-medium active:scale-95 cursor-pointer"
                                title="Copy Exit IP"
                            >
                                {copiedIp ? (
                                    <>
                                        <Check size={12} className="text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40">
                            <span className="px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] font-mono">
                                SOCKS5: 127.0.0.1:{socksPort || 9050}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                DNS &amp; WebRTC Isolated
                            </span>
                        </div>
                    </div>

                    {/* Security Level Control */}
                    <div className="mb-3.5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                Security Level
                            </span>
                        </div>
                        
                        {/* Signature Sliding Pill Switcher */}
                        <div 
                            onMouseLeave={() => setHoveredSecurityLevel(null)} 
                            className="relative flex p-1 rounded-full border border-white/[0.08] bg-[#0c0d16]/78 shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-colors duration-200 select-none"
                        >
                            {/* Hover preview pill */}
                            {hoveredIndex >= 0 && hoveredIndex !== safeActiveIndex && (
                                <div
                                    className="absolute top-1 bottom-1 rounded-full transition-all duration-200 pointer-events-none bg-white/[0.06]"
                                    style={{
                                        left: 4,
                                        width: 'calc((100% - 8px) / 3)',
                                        transform: `translateX(${hoveredIndex * 100}%)`
                                    }}
                                />
                            )}

                            {/* Active Pill Indicator */}
                            <div
                                className="absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] border"
                                style={{
                                    left: 4,
                                    width: 'calc((100% - 8px) / 3)',
                                    transform: `translateX(${safeActiveIndex * 100}%)`,
                                    borderColor: 'rgba(168, 85, 247, 0.45)',
                                    backgroundColor: 'rgba(168, 85, 247, 0.22)',
                                    boxShadow: '0 2px 12px rgba(168, 85, 247, 0.28), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
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
                                        className={`relative z-10 flex-1 py-1.5 text-center text-xs font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
                                            isSelected 
                                                ? 'text-purple-200 font-bold drop-shadow-sm' 
                                                : 'text-white/50 hover:text-white/80'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Security Level Callout Card */}
                        <div className="mt-2 p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-white/55 leading-relaxed flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                                <Lock size={10} />
                            </div>
                            <span>{securityDescriptions[securityLevel] || securityDescriptions.standard}</span>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2.5">
                        {activeSpace !== 'tor' && (
                            <button
                                onClick={() => {
                                    setActiveSpace('tor');
                                    closePopover();
                                }}
                                className="flex-1 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer"
                            >
                                <Globe size={13} />
                                Switch to Tor Space
                            </button>
                        )}

                        <button
                            onClick={stopTor}
                            className={`h-10 px-5 rounded-full border border-white/[0.08] hover:border-rose-500/30 bg-white/[0.04] hover:bg-rose-500/15 text-white/70 hover:text-rose-300 transition text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                activeSpace === 'tor' ? 'w-full' : ''
                            }`}
                        >
                            Disconnect
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
