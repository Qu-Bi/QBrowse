import React, { useState, useEffect } from 'react';
import { Flag, Search, RotateCcw, ShieldAlert, Cpu, Sparkles, CheckCircle2, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

const DEFAULT_FLAGS = [
    {
        id: 'document-pip-api',
        name: 'Document Picture-in-Picture API',
        description: 'Allows popping out custom HTML/CSS styled floating OS windows for video streams and rich media components.',
        category: 'Media',
        defaultState: 'enabled',
        status: 'Experimental'
    },
    {
        id: 'gpu-rasterization',
        name: 'GPU Rasterization & Acceleration',
        description: 'Forces hardware-accelerated canvas rendering and GPU compositor rasterization for 120Hz smooth scrolling.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'aggressive-tracker-blocker',
        name: 'Aggressive Tracker & Ad Blocker',
        description: 'Enables strict Ghostery rules and removes tracking parameters (utm_source, gclid) from all outgoing network requests.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Experimental'
    },
    {
        id: 'force-dark-contents',
        name: 'Auto Dark Mode for Web Contents',
        description: 'Automatically renders all websites using a high-contrast dark theme even if the website lacks dark mode.',
        category: 'Appearance',
        defaultState: 'disabled',
        status: 'Experimental'
    },
    {
        id: 'parallel-download-engine',
        name: 'Parallel Multi-Threaded Downloads',
        description: 'Breaks large file downloads into multiple parallel HTTP streams to accelerate download speeds.',
        category: 'Network',
        defaultState: 'enabled',
        status: 'Experimental'
    },
    {
        id: 'auto-suspend-tabs',
        name: 'Auto-Suspend Memory Saver',
        description: 'Automatically unloads heavy webview tabs after 15 minutes of inactivity to conserve RAM and CPU cycles.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Beta'
    },
    {
        id: 'local-ai-assistant',
        name: 'Local GGUF LLM VRAM Acceleration',
        description: 'Executes local Gemma and Llama 3 models directly inside GPU VRAM via llama.cpp backend.',
        category: 'AI',
        defaultState: 'enabled',
        status: 'Beta'
    },
    {
        id: 'webrtc-ip-protection',
        name: 'WebRTC Anonymization & IP Concealment',
        description: 'Disables local IP address enumeration over WebRTC peer connections to prevent IP leaks.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'experimental-split-screen-gestures',
        name: 'Kinetic Split Screen Snap Gestures',
        description: 'Enables fluid dragging and snapping when creating vertical or horizontal split view panes.',
        category: 'UX',
        defaultState: 'enabled',
        status: 'Experimental'
    }
];

export default function FlagsPage() {
    const showToast = useUIStore(state => state.showToast);
    const [search, setSearch] = useState('');
    const [hasChanged, setHasChanged] = useState(false);

    const [flagValues, setFlagValues] = useState(() => {
        try {
            const stored = localStorage.getItem('qbrowse_flags');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    const handleFlagChange = (flagId, value) => {
        setFlagValues(prev => {
            const next = { ...prev, [flagId]: value };
            try {
                localStorage.setItem('qbrowse_flags', JSON.stringify(next));
            } catch(e) {}
            return next;
        });
        setHasChanged(true);
    };

    const handleResetAll = () => {
        setFlagValues({});
        try {
            localStorage.removeItem('qbrowse_flags');
        } catch(e) {}
        setHasChanged(true);
        showToast('All experimental flags reset to default');
    };

    const handleRelaunch = () => {
        showToast('Relaunching QBrowse...');
        setTimeout(() => {
            window.location.reload();
        }, 600);
    };

    const filteredFlags = DEFAULT_FLAGS.filter(f => 
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase()) ||
        f.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-full h-full bg-[#0a0a0c] text-white font-sans overflow-y-auto hide-scroll p-8 md:p-12 relative pb-32">
            {/* Background Radial Glow */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-lg shadow-accent/10">
                                <Flag size={20} />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white">Experimental Features</h1>
                            <span className="px-2.5 py-0.5 rounded-full bg-accent-10 text-accent border border-accent-30 text-xs font-mono font-bold">
                                qbrowse://flags
                            </span>
                        </div>
                        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">
                            By enabling these experimental features, you could lose browser data or compromise security or privacy. Enabled features apply to all users of this browser.
                        </p>
                    </div>

                    <button 
                        onClick={handleResetAll}
                        className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition shadow-sm cursor-pointer"
                    >
                        <RotateCcw size={14} /> Reset all to default
                    </button>
                </div>

                {/* Search & Warning Bar */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-3.5 text-white/30" />
                        <input 
                            type="text" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search experimental flags (e.g. GPU, Dark, Media)..."
                            className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent transition shadow-inner"
                        />
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-300/90 text-xs leading-relaxed">
                        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-amber-200">WARNING: EXPERIMENTAL FEATURES AHEAD! </span> 
                            These features are under active development. Changes take effect after relaunching the browser.
                        </div>
                    </div>
                </div>

                {/* Flags List */}
                <div className="space-y-4">
                    {filteredFlags.length > 0 ? (
                        filteredFlags.map((flag) => {
                            const val = flagValues[flag.id] || 'default';
                            return (
                                <div 
                                    key={flag.id} 
                                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex flex-col md:flex-row md:items-center justify-between gap-4 group backdrop-blur-xl"
                                >
                                    <div className="space-y-1.5 flex-1 pr-4">
                                        <div className="flex items-center gap-2.5">
                                            <h3 className="font-bold text-base text-white/90 group-hover:text-white transition">
                                                {flag.name}
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/50">
                                                #{flag.id}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-accent-10 border border-accent-30 text-[10px] font-semibold text-accent">
                                                {flag.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/50 leading-relaxed">
                                            {flag.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <select 
                                            value={val}
                                            onChange={e => handleFlagChange(flag.id, e.target.value)}
                                            className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-accent transition cursor-pointer shadow-sm min-w-[120px]"
                                        >
                                            <option value="default">Default ({flag.defaultState})</option>
                                            <option value="enabled">Enabled</option>
                                            <option value="disabled">Disabled</option>
                                        </select>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-12 text-center text-white/40 font-medium">
                            No experimental flags match "{search}"
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Relaunch Banner */}
            {hasChanged && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#121216]/95 border border-accent-30 backdrop-blur-2xl px-6 py-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-6 animate-pop-in">
                    <div className="flex items-center gap-3 text-xs text-white/90 font-medium">
                        <Sparkles size={16} className="text-accent animate-pulse" />
                        <span>Your changes will take effect the next time you relaunch QBrowse.</span>
                    </div>
                    <button 
                        onClick={handleRelaunch}
                        className="px-4 py-2 bg-accent hover:bg-accent/90 text-black font-bold rounded-xl text-xs shadow-lg shadow-accent/20 transition flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw size={13} /> Relaunch
                    </button>
                </div>
            )}
        </div>
    );
}
