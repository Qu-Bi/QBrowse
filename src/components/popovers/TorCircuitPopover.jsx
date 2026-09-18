import React, { useEffect, useState } from 'react';
import { 
    Shield, ShieldCheck, ShieldAlert, Globe, RotateCw, RefreshCw, 
    X, ArrowRight, Download, Server, Cpu, Lock, CheckCircle2, 
    AlertTriangle, ExternalLink, Zap, Wifi, Radio
} from 'lucide-react';
import useTorStore from '../../store/useTorStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function TorCircuitPopover({ isClosing }) {
    const isForceDark = useUIStore(state => state.isForceDark);
    const closePopover = useUIStore(state => state.closePopover);
    const showToast = useUIStore(state => state.showToast);

    const {
        isTorEnabled, toggleTorEnabled,
        status, bootstrapProgress, downloadProgress,
        verifiedExitIp, isTorVerified, securityLevel,
        hasLocalBinary, lastError, isCheckingIp, isRequestingCircuit,
        circuitNodes, fetchStatus, startTor, stopTor, newCircuit,
        checkExitIp, downloadBinary, setSecurityLevel, init
    } = useTorStore();

    useEffect(() => {
        init();
    }, [init]);

    const activeSpace = useTabStore(state => state.activeSpace);
    const setActiveSpace = useTabStore(state => state.setActiveSpace);

    const isConnected = status === 'connected';
    const isStarting = status === 'starting';
    const isDownloading = status === 'downloading';

    const getStatusBadge = () => {
        if (isConnected) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected
                </div>
            );
        }
        if (isStarting) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[11px] font-semibold animate-pulse">
                    <RefreshCw size={10} className="animate-spin" />
                    Bootstrapping {bootstrapProgress}%
                </div>
            );
        }
        if (isDownloading) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold">
                    <Download size={10} className="animate-bounce" />
                    Downloading {downloadProgress}%
                </div>
            );
        }
        if (status === 'error') {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-semibold">
                    <AlertTriangle size={10} />
                    Error
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/50 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                Disconnected
            </div>
        );
    };

    return (
        <div 
            onClick={e => e.stopPropagation()}
            className={`absolute top-2 right-4 w-[410px] max-h-[calc(100vh-80px)] overflow-y-auto hide-scroll rounded-3xl backdrop-blur-2xl border shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-[70000] p-5 text-white origin-top-right transition-all duration-200 ${
                isClosing ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'
            } ${
                isForceDark 
                    ? 'bg-[#0f0b14]/95 border-purple-500/20 shadow-[0_20px_50px_rgba(168,85,247,0.15)]' 
                    : 'bg-[#130f1c]/95 border-purple-500/25 shadow-[0_20px_50px_rgba(168,85,247,0.2)]'
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                            <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                            <circle cx="12" cy="12" r="1.5"/>
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white tracking-wide">Tor Onion Network</h3>
                        </div>
                        <p className="text-[11px] text-purple-300/60 font-mono mt-0.5">Ephemeral In-Memory SOCKS5h Route</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge()}
                    <button 
                        onClick={closePopover}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Tor Routing Master Toggle Banner */}
            <div className="mt-3.5 p-3 rounded-2xl bg-black/40 border border-purple-500/20 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                        isTorEnabled 
                            ? (status === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse') 
                            : 'bg-white/30'
                    }`} />
                    <div>
                        <span className="text-xs font-bold text-white block">Tor Onion Routing Mode</span>
                        <span className="text-[10px] text-white/50">
                            {isTorEnabled 
                                ? 'Private space routes through 3-hop onion relays' 
                                : 'Private space operates in standard Incognito mode'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => toggleTorEnabled()}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 p-0.5 focus:outline-none ${
                        isTorEnabled ? 'bg-purple-600' : 'bg-white/20'
                    }`}
                    title={isTorEnabled ? 'Disable Tor Mode' : 'Enable Tor Mode'}
                >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-md ${
                        isTorEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </button>
            </div>

            {/* Bootstrap Progress Bar (if starting or downloading) */}
            {(isStarting || isDownloading) && (
                <div className="mt-4 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-purple-300">{isDownloading ? 'Downloading Tor Bundle...' : 'Establishing Tor Consensus...'}</span>
                        <span className="text-purple-400 font-mono">{isDownloading ? downloadProgress : bootstrapProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-300 shadow-[0_0_10px_#a855f7]"
                            style={{ width: `${isDownloading ? downloadProgress : bootstrapProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Circuit Visualization HUD */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/70 flex items-center gap-1.5">
                        <Radio size={12} className="text-purple-400" />
                        Active Onion Circuit (3-Hop Relay)
                    </span>
                    {isConnected && (
                        <button 
                            onClick={newCircuit}
                            disabled={isRequestingCircuit}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition active:scale-95 disabled:opacity-50"
                            title="Signal NEWNYM: Request fresh circuit and reset cookies"
                        >
                            <RotateCw size={10} className={isRequestingCircuit ? 'animate-spin' : ''} />
                            New Circuit
                        </button>
                    )}
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 relative overflow-hidden">
                    {/* Background glow flow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-purple-500/5 pointer-events-none" />

                    <div className="flex items-center justify-between relative z-10">
                        {/* Hop 0: Client */}
                        <div className="flex flex-col items-center text-center w-20">
                            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-1 shadow-sm">
                                <Cpu size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-white/90">You</span>
                            <span className="text-[9px] text-white/40 font-mono">Client</span>
                        </div>

                        {/* Arrow 1 */}
                        <div className="flex-1 flex items-center justify-center relative">
                            <div className={`h-0.5 w-full ${isConnected ? 'bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse' : 'bg-white/10'}`} />
                        </div>

                        {/* Hop 1: Guard */}
                        <div className="flex flex-col items-center text-center w-24">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-1 transition-all ${
                                isConnected 
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]' 
                                    : 'bg-white/5 border-white/10 text-white/30'
                            }`}>
                                <Server size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-white/90 truncate max-w-full">
                                {circuitNodes[0]?.name || 'Guard'}
                            </span>
                            <span className="text-[9px] text-purple-300/60 font-mono">
                                {circuitNodes[0]?.country || 'Entry'}
                            </span>
                        </div>

                        {/* Arrow 2 */}
                        <div className="flex-1 flex items-center justify-center relative">
                            <div className={`h-0.5 w-full ${isConnected ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' : 'bg-white/10'}`} />
                        </div>

                        {/* Hop 2: Middle */}
                        <div className="flex flex-col items-center text-center w-24">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-1 transition-all ${
                                isConnected 
                                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                                    : 'bg-white/5 border-white/10 text-white/30'
                            }`}>
                                <Zap size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-white/90 truncate max-w-full">
                                {circuitNodes[1]?.name || 'Relay'}
                            </span>
                            <span className="text-[9px] text-indigo-300/60 font-mono">
                                {circuitNodes[1]?.country || 'Middle'}
                            </span>
                        </div>

                        {/* Arrow 3 */}
                        <div className="flex-1 flex items-center justify-center relative">
                            <div className={`h-0.5 w-full ${isConnected ? 'bg-gradient-to-r from-purple-500 to-emerald-500 animate-pulse' : 'bg-white/10'}`} />
                        </div>

                        {/* Hop 3: Exit */}
                        <div className="flex flex-col items-center text-center w-24">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-1 transition-all ${
                                isConnected 
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                    : 'bg-white/5 border-white/10 text-white/30'
                            }`}>
                                <Globe size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-white/90 truncate max-w-full">
                                {circuitNodes[2]?.name || 'Exit'}
                            </span>
                            <span className="text-[9px] text-emerald-300/60 font-mono">
                                {circuitNodes[2]?.country || 'Exit'}
                            </span>
                        </div>
                    </div>

                    {/* Circuit Details Footer */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono">
                        <span>Proxy: 127.0.0.1:{useTorStore.getState().socksPort} (SOCKS5h)</span>
                        <span className="text-purple-300/80">3-Layer Onion Encryption</span>
                    </div>
                </div>
            </div>

            {/* Verified Exit IP & Leak Shield */}
            <div className="mt-4 p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span>Public Exit Node IP</span>
                    </div>
                    <button 
                        onClick={checkExitIp}
                        disabled={isCheckingIp}
                        className="flex items-center gap-1 text-[10px] text-purple-300 hover:text-white transition disabled:opacity-50"
                        title="Verify exit IP against check.torproject.org"
                    >
                        <RefreshCw size={10} className={isCheckingIp ? 'animate-spin' : ''} />
                        Verify
                    </button>
                </div>
                <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold font-mono tracking-tight text-white">
                        {verifiedExitIp || (isConnected ? 'Verifying...' : 'No active exit node')}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isTorVerified 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-white/5 text-white/40'
                    }`}>
                        {isTorVerified ? 'Tor Project Verified' : 'Checking Status'}
                    </span>
                </div>
                <div className="mt-2 text-[10px] text-white/50 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                        <span>DNS Leaks Blocked (.onion resolved inside Tor circuit)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                        <span>WebRTC Non-Proxied UDP Disabled (Strict IP Leak Guard)</span>
                    </div>
                </div>
            </div>

            {/* Security Level Presets */}
            <div className="mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/70 block mb-2 px-0.5">
                    Security Level Preset
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                    {[
                        { id: 'standard', title: 'Standard', desc: 'All features active' },
                        { id: 'safer', title: 'Safer', desc: 'WebGL & HTTP Media off' },
                        { id: 'safest', title: 'Safest', desc: 'No JavaScript' }
                    ].map(lvl => (
                        <button
                            key={lvl.id}
                            onClick={() => setSecurityLevel(lvl.id)}
                            className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                                securityLevel === lvl.id
                                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="text-xs font-bold">{lvl.title}</span>
                            <span className="text-[8px] opacity-70 mt-0.5 text-center leading-tight">{lvl.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Bottom Bar */}
            <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2">
                {!hasLocalBinary && status === 'stopped' ? (
                    <button
                        onClick={downloadBinary}
                        disabled={isDownloading}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-98 disabled:opacity-50"
                    >
                        <Download size={14} />
                        1-Click Download Tor {window.electronAPI?.platform === 'linux' ? 'Linux' : window.electronAPI?.platform === 'darwin' ? 'macOS' : 'Windows'} Bundle
                    </button>
                ) : isConnected ? (
                    <>
                        <button
                            onClick={() => {
                                if (activeSpace !== 'tor') setActiveSpace('tor');
                                closePopover();
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                            <Globe size={13} />
                            Go to Tor Space
                        </button>
                        <button
                            onClick={stopTor}
                            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 border border-white/10 transition text-xs font-medium"
                        >
                            Disconnect
                        </button>
                    </>
                ) : (
                    <button
                        onClick={startTor}
                        disabled={isStarting}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-98 disabled:opacity-50"
                    >
                        <Zap size={14} />
                        {isStarting ? 'Connecting...' : 'Connect to Tor Network'}
                    </button>
                )}
            </div>
        </div>
    );
}
