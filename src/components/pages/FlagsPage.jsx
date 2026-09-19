import React, { useState, useEffect } from 'react';
import { 
    Flag, Search, RotateCcw, ShieldAlert, Cpu, Sparkles, CheckCircle2, 
    Zap, AlertTriangle, RefreshCw, Layers, ShieldCheck, Globe, 
    Monitor, Lock, Eye, Download, Sliders, VolumeX, Terminal, Key
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';

const AVAILABLE_FLAGS = [
    // --- PERFORMANCE & COMPOSITING ---
    {
        id: 'gpu-rasterization',
        name: 'GPU Rasterization & Compositor Acceleration',
        description: 'Accelerates web page rasterization and compositing using dedicated hardware GPU pipelines instead of CPU software rendering.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'smooth-scrolling',
        name: 'Smooth Scrolling Engine',
        description: 'Enables fluid physical cubic-bezier easing animations when scrolling page contents via mouse wheel, touchpad, or arrow keys.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'zero-copy-rasterizer',
        name: 'Zero-Copy GPU Rasterizer (GpuMemoryBuffer)',
        description: 'Raster workers write directly into shared GPU textures without CPU memory staging copies, reducing memory bus contention.',
        category: 'Performance',
        defaultState: 'disabled',
        status: 'Experimental'
    },
    {
        id: 'enable-vulkan',
        name: 'Vulkan Graphics & Compositing Backend',
        description: 'Uses the Vulkan cross-platform graphics API for GPU compositing, rendering pipelines, and driver interop on supported GPUs.',
        category: 'Performance',
        defaultState: 'disabled',
        status: 'Experimental'
    },
    {
        id: 'back-forward-cache',
        name: 'Back-forward Cache (bfcache)',
        description: 'Preserves complete in-memory execution snapshots of recently visited web pages for instantaneous back and forward navigations.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'canvas-oop-rasterization',
        name: 'Out-of-Process 2D Canvas Rasterization',
        description: 'Performs HTML5 2D Canvas rendering operations in the dedicated GPU process rather than the sandboxed renderer process.',
        category: 'Performance',
        defaultState: 'disabled',
        status: 'Beta'
    },
    {
        id: 'enable-drdc',
        name: 'Dynamic High Refresh Rate Detection (120Hz/144Hz/240Hz)',
        description: 'Synchronizes frame pacing and V-Sync intervals to adapt dynamically to ProMotion and high-refresh gaming displays.',
        category: 'Performance',
        defaultState: 'disabled',
        status: 'Experimental'
    },
    {
        id: 'auto-suspend-tabs',
        name: 'Auto-Suspend Memory Saver (V8 GC Throttling)',
        description: 'Automatically unloads inactive background tabs after 15 minutes of inactivity to dramatically conserve RAM and battery life.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'parallel-download-engine',
        name: 'Parallel Multi-Threaded Range Downloads',
        description: 'Splits large file downloads into multiple parallel HTTP range requests to maximize bandwidth utilization and transfer speed.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'lazy-image-loading',
        name: 'Lazy Image & Embedded Frame Loading',
        description: 'Defers loading of off-screen images and third-party iframes until they are scrolled into view, reducing initial page payload.',
        category: 'Performance',
        defaultState: 'enabled',
        status: 'Stable'
    },

    // --- SECURITY & CRYPTOGRAPHY ---
    {
        id: 'enable-tls13-kyber',
        name: 'Post-Quantum Cryptography for TLS (Kyber768 / ML-KEM)',
        description: 'Enables quantum-resistant hybrid key encapsulation (X25519Kyber768) in TLS 1.3 handshakes to protect traffic against future quantum decryption.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'enable-encrypted-client-hello',
        name: 'Encrypted Client Hello (ECH / Encrypted SNI)',
        description: 'Encrypts the Server Name Indication (SNI) inside TLS handshakes, preventing ISPs, firewalls, and network snoops from seeing visited domain names.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'strict-origin-isolation',
        name: 'Strict Origin Site-Per-Process Sandboxing',
        description: 'Enforces dedicated OS processes with isolated virtual memory addresses for every distinct origin, mitigating Spectre and Meltdown exploits.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'webrtc-ip-protection',
        name: 'WebRTC Local IP Address & STUN Leak Concealment',
        description: 'Restricts WebRTC ICE candidates to non-proxied UDP endpoints, preventing malicious scripts from enumerating your true local LAN or public IP.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'enable-dns-over-https',
        name: 'Strict DNS-over-HTTPS (DoH Cloudflare/Quad9)',
        description: 'Encrypts all recursive DNS lookups over HTTPS (port 443) to block ISP eavesdropping, DNS hijacking, and domain poisoning.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'disable-hyperlink-auditing',
        name: 'Disable Hyperlink Auditing (<a ping>) & Beacon Pings',
        description: 'Blocks websites from silently dispatching tracking POST requests when user clicks hyperlinks, neutralizing outbound ad tracking beacons.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'enable-fingerprint-randomization',
        name: 'HTML5 Canvas & WebAudio Fingerprint Noise Injection',
        description: 'Subtly perturbs pixel readback and audio buffer values with cryptographic pseudorandom noise to prevent unique hardware device fingerprinting.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Experimental'
    },
    {
        id: 'enable-font-enumeration-shield',
        name: 'Local Font Enumeration & Query Shield',
        description: 'Prevents web applications from probing locally installed system fonts to assemble persistent cross-browser identity hashes.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Beta'
    },
    {
        id: 'aggressive-tracker-blocker',
        name: 'Aggressive Ad & URL Parameter Stripping Engine',
        description: 'Strips telemetry tracking query parameters (utm_source, gclid, fbclid, msclkid) and blocks known tracking pixels across all navigation requests.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'enable-subresource-filter',
        name: 'Subresource Filter for Abusive & Deceptive Interstitials',
        description: 'Automatically detects and suppresses clickjackers, invisible overlay links, and deceptive download prompts on untrusted websites.',
        category: 'Security',
        defaultState: 'enabled',
        status: 'Beta'
    },

    // --- NETWORKING & ONION ROUTING ---
    {
        id: 'enable-quic',
        name: 'Experimental QUIC & HTTP/3 Transport Protocol',
        description: 'Enables UDP-based HTTP/3 transport for zero-RTT handshakes, forward error correction, and multiplexed stream delivery without head-of-line blocking.',
        category: 'Networking',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'tor-stream-isolation',
        name: 'Tor Per-Domain Stream Circuit Isolation (IsolateDestAddr)',
        description: 'Forces each unique top-level domain in Tor Space to traverse a distinct exit circuit, preventing cross-site correlation and exit-node tracking.',
        category: 'Networking',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'dns-prefetching',
        name: 'Predictive DNS Pre-Resolution Engine',
        description: 'Proactively resolves IP addresses for anchor links visible on the current page to eliminate DNS resolution latency upon clicking.',
        category: 'Networking',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'heavy-ad-intervention',
        name: 'Heavy Network Ad Resource Intervention',
        description: 'Unloads advertising iframes that consume more than 4MB of network bandwidth or 60 seconds of CPU execution time.',
        category: 'Networking',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'cross-origin-isolation',
        name: 'Cross-Origin Opener Policy (COOP) & SharedArrayBuffer',
        description: 'Enables high-precision WebAssembly shared memory operations by strictly enforcing Cross-Origin Opener and Embedder policies.',
        category: 'Networking',
        defaultState: 'enabled',
        status: 'Beta'
    },

    // --- MEDIA & USER INTERFACE ---
    {
        id: 'document-pip-api',
        name: 'Document Picture-in-Picture API',
        description: 'Enables floating picture-in-picture windows populated with arbitrary HTML documents, video streams, custom player controls, and widgets.',
        category: 'Media & UI',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'force-dark-contents',
        name: 'Auto Dark Mode for Web Contents (Chromium Inversion)',
        description: 'Automatically synthesizes a dark theme for websites that only support light backgrounds using luminance-preserving color inversion.',
        category: 'Media & UI',
        defaultState: 'disabled',
        status: 'Experimental'
    },
    {
        id: 'overlay-scrollbars',
        name: 'Minimalist Floating Overlay Scrollbars',
        description: 'Replaces chunky OS scrollbars with sleek floating scroll indicators that automatically fade out when scrolling stops.',
        category: 'Media & UI',
        defaultState: 'disabled',
        status: 'Experimental'
    },
    {
        id: 'enable-webgpu',
        name: 'Next-Generation WebGPU Graphics & Compute API',
        description: 'Provides low-overhead, direct GPU access for in-browser neural networks, 3D simulations, and shader computations.',
        category: 'Media & UI',
        defaultState: 'disabled',
        status: 'Beta'
    },
    {
        id: 'tab-audio-muting',
        name: 'One-Click Tab Audio Muting Indicator',
        description: 'Adds an interactive audio speaker badge to active tab buttons, allowing immediate tab audio muting with a single click.',
        category: 'Media & UI',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'webrtc-pipewire',
        name: 'PipeWire Desktop Capturer (Linux Wayland)',
        description: 'Enables screen sharing and window capture via PipeWire portal on modern Linux desktop environments (GNOME, KDE Plasma).',
        category: 'Media & UI',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'hdr-compositing',
        name: 'High Dynamic Range (HDR) Color Compositing',
        description: 'Enables 10-bit wide color gamut (Rec.2020 / DCI-P3) and HDR tone mapping on compatible OLED and mini-LED displays.',
        category: 'Media & UI',
        defaultState: 'enabled',
        status: 'Beta'
    },

    // --- AI & PRODUCTIVITY ---
    {
        id: 'local-ai-assistant',
        name: 'Local GGUF LLM VRAM Acceleration (llama.cpp)',
        description: 'Offloads on-device Gemma and Llama 3 model weights directly to GPU VRAM for private, low-latency summarization and querying.',
        category: 'AI & Tools',
        defaultState: 'enabled',
        status: 'Beta'
    },
    {
        id: 'experimental-split-screen-gestures',
        name: 'Kinetic Split Screen Panes & Snap Gestures',
        description: 'Allows dragging tabs to viewport edges to instantly create responsive horizontal or vertical dual-pane browsing sessions.',
        category: 'AI & Tools',
        defaultState: 'enabled',
        status: 'Experimental'
    },
    {
        id: 'enable-reader-mode',
        name: 'Distraction-Free Article Reader Mode',
        description: 'Extracts article text and typography into a high-legibility layout, eliminating sidebars, advertisements, and page clutter.',
        category: 'AI & Tools',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'auto-password-generation',
        name: 'Cryptographic Strong Password Generation',
        description: 'Automatically detects new account registration forms and proposes 128-bit cryptographically secure passwords backed by QVault.',
        category: 'AI & Tools',
        defaultState: 'enabled',
        status: 'Stable'
    },
    {
        id: 'tab-groups-auto-clustering',
        name: 'Smart Domain & Workspace Tab Clustering',
        description: 'Intelligently suggests grouping open tabs based on shared origin domains and temporal workspace usage patterns.',
        category: 'AI & Tools',
        defaultState: 'enabled',
        status: 'Experimental'
    }
];

const UNAVAILABLE_FLAGS = [
    {
        id: 'touch-ui-layout',
        name: 'Touchscreen Tablet UI Mode',
        description: 'Expands tab bar heights and hit-testing margins for touch-first convertibles. Currently disabled on desktop keyboard/mouse profiles.',
        category: 'Media & UI',
        reason: 'Requires touch-digitizer hardware detection.'
    },
    {
        id: 'eye-tracking-gaze-scroll',
        name: 'Eye-Tracking Gaze Navigation',
        description: 'Controls viewport scrolling based on pupil gaze coordinates. Requires specialized infrared hardware sensors.',
        category: 'Experimental',
        reason: 'Supported eye-tracking sensor not detected.'
    },
    {
        id: 'cellular-data-saver',
        name: 'Cellular Metered Data Saver',
        description: 'Compresses remote images via upstream proxy gateways. Disabled for privacy to prevent remote proxy decryption.',
        category: 'Networking',
        reason: 'Disabled by default to preserve Tor and HTTPS end-to-end privacy.'
    }
];

const CATEGORIES = ['All', 'Performance', 'Security', 'Networking', 'Media & UI', 'AI & Tools'];

export default function FlagsPage() {
    const showToast = useUIStore(state => state.showToast);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('available'); // 'available' | 'unavailable'
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [hasChanged, setHasChanged] = useState(false);

    const [flagValues, setFlagValues] = useState(() => {
        try {
            const stored = localStorage.getItem('qbrowse_flags');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        // Sync with Electron flags backend on load
        if (window.electronAPI && window.electronAPI.getFlags) {
            window.electronAPI.getFlags().then(electronFlags => {
                if (electronFlags && Object.keys(electronFlags).length > 0) {
                    setFlagValues(prev => ({ ...prev, ...electronFlags }));
                }
            }).catch(() => {});
        }
    }, []);

    const handleFlagChange = (flagId, value) => {
        setFlagValues(prev => {
            const next = { ...prev, [flagId]: value };
            try {
                localStorage.setItem('qbrowse_flags', JSON.stringify(next));
            } catch (_) {}
            return next;
        });

        if (window.electronAPI && window.electronAPI.setFlag) {
            window.electronAPI.setFlag(flagId, value).catch(() => {});
        }

        setHasChanged(true);
    };

    const handleResetAll = () => {
        setFlagValues({});
        try {
            localStorage.removeItem('qbrowse_flags');
        } catch (_) {}

        if (window.electronAPI && window.electronAPI.resetFlags) {
            window.electronAPI.resetFlags().catch(() => {});
        }

        setHasChanged(true);
        showToast('All experimental flags restored to default');
    };

    const handleRelaunch = () => {
        showToast('Relaunching QBrowse with updated flags...');
        setTimeout(() => {
            if (window.electronAPI && window.electronAPI.relaunchApp) {
                window.electronAPI.relaunchApp();
            } else {
                window.location.reload();
            }
        }, 500);
    };

    const filteredAvailableFlags = AVAILABLE_FLAGS.filter(f => {
        const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
        const matchesSearch = !search || 
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.description.toLowerCase().includes(search.toLowerCase()) ||
            f.id.toLowerCase().includes(search.toLowerCase()) ||
            f.category.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const filteredUnavailableFlags = UNAVAILABLE_FLAGS.filter(f => {
        if (!search) return true;
        return f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.description.toLowerCase().includes(search.toLowerCase()) ||
            f.id.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="w-full h-full bg-[#0a0a0c] text-white font-sans overflow-y-auto hide-scroll p-6 md:p-12 relative pb-36 select-none">
            {/* Ambient Background Glow */}
            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-lg shadow-accent/10">
                                <Flag size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Experiments</h1>
                                    <span className="px-2.5 py-0.5 rounded-full bg-accent-10 text-accent border border-accent-30 text-xs font-mono font-bold">
                                        qbrowse://flags
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-white/50 max-w-2xl leading-relaxed">
                            Fine-tune experimental browser features, hardware graphics pipelines, post-quantum cryptographic ciphers, and Tor stream isolation parameters.
                        </p>
                    </div>

                    <button 
                        onClick={handleResetAll}
                        className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition shadow-sm cursor-pointer active:scale-95"
                    >
                        <RotateCcw size={14} /> Reset all to default
                    </button>
                </div>

                {/* Warning Banner */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-300 text-xs leading-relaxed shadow-lg shadow-amber-500/5">
                    <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold text-amber-200 uppercase tracking-wide">Warning: Experimental Features Ahead! </span>
                        Enabling these experimental switches alters underlying Chromium V8 execution, hardware compositing, or TLS parameters. Relaunching is required for changes to take effect.
                    </div>
                </div>

                {/* Search & Tabs */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-3.5 text-white/30" />
                        <input 
                            type="text" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search flags (e.g. GPU, Kyber, QUIC, DoH, bfcache)..."
                            className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent transition shadow-inner"
                        />
                    </div>

                    {/* Available / Unavailable Tabs */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                            <button
                                onClick={() => setActiveTab('available')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'available'
                                        ? 'bg-accent text-black shadow-md'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                Available ({AVAILABLE_FLAGS.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('unavailable')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'unavailable'
                                        ? 'bg-accent text-black shadow-md'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                Unavailable ({UNAVAILABLE_FLAGS.length})
                            </button>
                        </div>

                        {/* Category Filter Pills (Available tab only) */}
                        {activeTab === 'available' && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                                            selectedCategory === cat
                                                ? 'bg-white/15 text-white border-accent-30'
                                                : 'bg-white/5 text-white/40 border-transparent hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Flags Content List */}
                {activeTab === 'available' ? (
                    <div className="space-y-3.5">
                        {filteredAvailableFlags.length > 0 ? (
                            filteredAvailableFlags.map((flag) => {
                                const val = flagValues[flag.id] || 'default';
                                const isModified = val !== 'default';

                                return (
                                    <div 
                                        key={flag.id} 
                                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 group backdrop-blur-xl ${
                                            isModified 
                                                ? 'bg-accent-10/40 border-accent-30 shadow-lg shadow-accent/5' 
                                                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="space-y-1.5 flex-1 pr-4">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <h3 className="font-bold text-sm text-white/90 group-hover:text-white transition">
                                                    {flag.name}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/40">
                                                    #{flag.id}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                                    flag.status === 'Stable' 
                                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                                                        : flag.status === 'Beta' 
                                                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' 
                                                        : 'bg-accent-10 text-accent border-accent-30'
                                                }`}>
                                                    {flag.status}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-medium text-white/50">
                                                    {flag.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/50 leading-relaxed">
                                                {flag.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <select 
                                                value={val}
                                                onChange={e => handleFlagChange(flag.id, e.target.value)}
                                                className={`border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none transition cursor-pointer shadow-sm min-w-[130px] ${
                                                    isModified
                                                        ? 'bg-accent-20 border-accent text-accent font-bold'
                                                        : 'bg-black/60 border-white/15 text-white/90 focus:border-accent'
                                                }`}
                                            >
                                                <option value="default" className="bg-[#121216] text-white">Default ({flag.defaultState})</option>
                                                <option value="enabled" className="bg-[#121216] text-emerald-400 font-semibold">Enabled</option>
                                                <option value="disabled" className="bg-[#121216] text-red-400 font-semibold">Disabled</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-16 text-center text-white/40 font-medium bg-white/[0.02] border border-white/5 rounded-2xl">
                                No available flags match "{search}"
                            </div>
                        )}
                    </div>
                ) : (
                    /* Unavailable Flags Tab */
                    <div className="space-y-3.5">
                        {filteredUnavailableFlags.map((flag) => (
                            <div 
                                key={flag.id} 
                                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-60"
                            >
                                <div className="space-y-1.5 flex-1 pr-4">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h3 className="font-bold text-sm text-white/70">
                                            {flag.name}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/30">
                                            #{flag.id}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-medium text-white/40">
                                            {flag.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/40 leading-relaxed">
                                        {flag.description}
                                    </p>
                                    <p className="text-[11px] text-amber-400/80 font-medium pt-1">
                                        Reason: {flag.reason}
                                    </p>
                                </div>

                                <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/40 font-mono">
                                    Unavailable
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Relaunch Floating Bar */}
            {hasChanged && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#121216]/95 border border-accent-30 backdrop-blur-2xl px-6 py-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex items-center gap-6 animate-pop-in">
                    <div className="flex items-center gap-3 text-xs text-white/90 font-medium">
                        <Sparkles size={18} className="text-accent animate-pulse" />
                        <span>Your changes will take effect the next time you relaunch QBrowse.</span>
                    </div>
                    <button 
                        onClick={handleRelaunch}
                        className="px-5 py-2.5 bg-accent hover:bg-accent/90 active:scale-95 text-black font-bold rounded-xl text-xs shadow-lg shadow-accent/20 transition flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw size={13} /> Relaunch
                    </button>
                </div>
            )}
        </div>
    );
}
