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

export default function TorCircuitPopover({ isClosing }) {
    const isForceDark = useUIStore(state => state.isForceDark);
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
        standard: 'All browser features and media enabled.',
        safer: 'WebGL disabled; HTML5 media requires click-to-play on HTTP.',
        safest: 'JavaScript completely disabled for maximum privacy.'
    };

    const guardNode = circuitNodes[0] || { role: 'Guard (Entry)', name: 'GuardRelay-DE', country: 'Germany', ip: '185.220.101.42', latency: '48ms' };
    const middleNode = circuitNodes[1] || { role: 'Middle Relay', name: 'RelayNode-NL', country: 'Netherlands', ip: '194.126.177.10', latency: '92ms' };
    const exitNode = circuitNodes[2] || { role: 'Exit Relay', name: 'ExitNode-CH', country: 'Switzerland', ip: '185.220.101.5', latency: '150ms' };

    return (
        <div 
            onClick={e => e.stopPropagation()}
            className={`absolute top-2 right-4 w-[390px] max-h-[calc(100vh-70px)] overflow-y-auto hide-scroll rounded-2xl backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-[70000] p-4 text-white origin-top-right transition-all duration-200 ${
                isClosing ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'
            } ${
                isForceDark 
                    ? 'bg-[#0c0e14]/95 border-white/10' 
                    : 'bg-[#10121a]/95 border-white/10'
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                            <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                            <circle cx="12" cy="12" r="1.5"/>
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-white tracking-wide">Tor Network</h3>
                            {isConnected ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                    Offline
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                            {isConnected && '3-hop encrypted circuit established'}
                            {isStarting && `Connecting to relays (${bootstrapProgress}%)`}
                            {isDownloading && `Downloading Tor Bundle (${downloadProgress}%)`}
                            {isError && (lastError || 'Connection error')}
                            {!isConnected && !isStarting && !isDownloading && !isError && 'Multi-hop onion routing'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Master Switch */}
                    <button
                        onClick={() => toggleTorEnabled()}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                            isTorEnabled ? 'bg-purple-600' : 'bg-white/15 hover:bg-white/25'
                        }`}
                        title={isTorEnabled ? 'Disable Tor' : 'Enable Tor'}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                            isTorEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                    </button>

                    <button 
                        onClick={closePopover}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="Close (Esc)"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Connecting / Downloading Progress State */}
            {(isStarting || isDownloading) && (
                <div className="mt-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-purple-300">
                            {isDownloading ? 'Downloading Tor components...' : 'Bootstrapping Tor circuit...'}
                        </span>
                        <span className="text-purple-300 font-mono font-bold">
                            {isDownloading ? downloadProgress : bootstrapProgress}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-purple-500 rounded-full transition-all duration-300"
                            style={{ width: `${isDownloading ? downloadProgress : bootstrapProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Offline State */}
            {!isConnected && !isStarting && !isDownloading && (
                <div className="mt-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-2.5 text-purple-400">
                        <Shield size={18} />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                        Private Onion Routing
                    </h4>
                    <p className="text-[11px] text-white/50 leading-relaxed mb-3.5 max-w-[280px] mx-auto">
                        Routes web requests across decentralized encrypted nodes to disguise your origin and browse .onion addresses.
                    </p>

                    {isError && lastError && (
                        <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1.5 text-left">
                            <AlertTriangle size={12} className="shrink-0" />
                            <span className="truncate">{lastError}</span>
                        </div>
                    )}

                    {!hasLocalBinary ? (
                        <button
                            onClick={downloadBinary}
                            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                            <Download size={13} />
                            Download Tor Component
                        </button>
                    ) : (
                        <button
                            onClick={startTor}
                            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                            <Zap size={13} />
                            Connect to Tor
                        </button>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                        <span>Proxy: 127.0.0.1:{socksPort || 9050}</span>
                        <span>DNS Isolation: Enabled</span>
                    </div>
                </div>
            )}

            {/* Connected State Content */}
            {isConnected && (
                <>
                    {/* Vertical Circuit Path */}
                    <div className="mt-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                Circuit for this session
                            </span>
                            <button 
                                onClick={newCircuit}
                                disabled={isRequestingCircuit}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                                    isRequestingCircuit 
                                        ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' 
                                        : 'text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20'
                                }`}
                                title="Request new circuit with a different IP address (SIGNAL NEWNYM)"
                            >
                                <RotateCw size={10} className={isRequestingCircuit ? 'animate-spin text-purple-400' : ''} />
                                <span>{isRequestingCircuit ? 'Switching...' : 'New Identity'}</span>
                            </button>
                        </div>

                        {/* Node Timeline */}
                        <div className="space-y-0 text-xs">
                            {/* 1. Client Browser */}
                            <div className="flex items-start gap-2.5 relative">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                                        <Laptop size={11} />
                                    </div>
                                    <div className="w-px h-6 bg-white/15 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-white text-[11px]">This Browser</span>
                                        <span className="text-[9px] text-white/40 font-mono">Local</span>
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate">QBrowse Client</p>
                                </div>
                            </div>

                            {/* 2. Guard / Entry Node */}
                            <div className="flex items-start gap-2.5 relative">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                                        <Shield size={11} />
                                    </div>
                                    <div className="w-px h-6 bg-white/15 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-[11px]">Guard (Entry)</span>
                                            <span className="text-[11px]">{getFlag(guardNode.country)}</span>
                                            <span className="text-[10px] text-white/60">{guardNode.country || 'Guard'}</span>
                                        </div>
                                        {guardNode.latency && (
                                            <span className="text-[9px] text-purple-300/80 font-mono">{guardNode.latency}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate font-mono">
                                        {guardNode.name || 'GuardRelay'} · {guardNode.ip || 'Relay IP'}
                                    </p>
                                </div>
                            </div>

                            {/* 3. Middle Relay */}
                            <div className="flex items-start gap-2.5 relative">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                                        <Server size={11} />
                                    </div>
                                    <div className="w-px h-6 bg-white/15 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white text-[11px]">Middle Relay</span>
                                            <span className="text-[11px]">{getFlag(middleNode.country)}</span>
                                            <span className="text-[10px] text-white/60">{middleNode.country || 'Relay'}</span>
                                        </div>
                                        {middleNode.latency && (
                                            <span className="text-[9px] text-indigo-300/80 font-mono">{middleNode.latency}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate font-mono">
                                        {middleNode.name || 'MiddleRelay'} · {middleNode.ip || 'Relay IP'}
                                    </p>
                                </div>
                            </div>

                            {/* 4. Exit Node */}
                            <div className="flex items-start gap-2.5 relative">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                                        <Globe size={11} />
                                    </div>
                                    <div className="w-px h-6 bg-white/15 my-0.5" />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-emerald-300 text-[11px]">Exit Node</span>
                                            <span className="text-[11px]">{getFlag(exitNode.country)}</span>
                                            <span className="text-[10px] text-white/60">{exitNode.country || 'Exit'}</span>
                                        </div>
                                        {exitNode.latency && (
                                            <span className="text-[9px] text-emerald-300/80 font-mono">{exitNode.latency}</span>
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
                            <div className="flex items-start gap-2.5 relative">
                                <div className="flex flex-col items-center shrink-0 w-6">
                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                                        <ExternalLink size={11} />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-white text-[11px]">Internet</span>
                                        <span className="text-[9px] text-emerald-400 font-medium">Encrypted</span>
                                    </div>
                                    <p className="text-[10px] text-white/40 truncate">Clearweb &amp; .onion Sites</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exit Identity Card */}
                    <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                Public Exit IP
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={checkExitIp}
                                    disabled={isCheckingIp || isRequestingCircuit}
                                    className="flex items-center gap-1 text-[10px] font-medium text-white/50 hover:text-white transition disabled:opacity-50 cursor-pointer"
                                    title="Verify exit node with Tor Project directory"
                                >
                                    <RefreshCw size={10} className={isCheckingIp ? 'animate-spin' : ''} />
                                    <span>Verify</span>
                                </button>
                                {isTorVerified && !isRequestingCircuit && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                        <Check size={9} />
                                        Tor Verified
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs font-bold font-mono tracking-wide select-all transition-colors ${
                                isRequestingCircuit ? 'text-purple-300 animate-pulse' : 'text-white'
                            }`}>
                                {isRequestingCircuit ? 'Negotiating new exit node...' : (verifiedExitIp || (isCheckingIp ? 'Verifying IP...' : (exitNode.ip || '185.220.101.5')))}
                            </span>
                            <button
                                onClick={handleCopyIp}
                                className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition flex items-center gap-1 text-[10px] font-medium cursor-pointer"
                                title="Copy Exit IP"
                            >
                                {copiedIp ? (
                                    <>
                                        <Check size={11} className="text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={11} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                            <span>SOCKS5: 127.0.0.1:{socksPort || 9050}</span>
                            <span className="text-white/60 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                DNS &amp; WebRTC Isolated
                            </span>
                        </div>
                    </div>

                    {/* Security Level Control */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                Security Level
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1 p-1 bg-black/30 rounded-xl border border-white/10">
                            {[
                                { id: 'standard', label: 'Standard' },
                                { id: 'safer', label: 'Safer' },
                                { id: 'safest', label: 'Safest' }
                            ].map(item => {
                                const isSelected = securityLevel === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setSecurityLevel(item.id)}
                                        className={`py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-purple-600 text-white shadow-sm' 
                                                : 'text-white/50 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-[10px] text-white/45 mt-1.5 px-0.5 leading-snug">
                            {securityDescriptions[securityLevel] || securityDescriptions.standard}
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2">
                        {activeSpace !== 'tor' && (
                            <button
                                onClick={() => {
                                    setActiveSpace('tor');
                                    closePopover();
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            >
                                <Globe size={13} />
                                Switch to Tor Space
                            </button>
                        )}

                        <button
                            onClick={stopTor}
                            className={`py-2 px-3 rounded-xl border border-white/10 hover:border-rose-500/30 bg-white/[0.03] hover:bg-rose-500/15 text-white/60 hover:text-rose-300 transition text-xs font-medium cursor-pointer ${
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
