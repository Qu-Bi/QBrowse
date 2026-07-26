import React, { useState } from 'react';
import { 
    Layers, Search, Command, Map as MapIcon, Monitor, 
    Sparkles, Bot, CheckCircle, X, ArrowRight, Zap, 
    Compass, Keyboard, Shield, ChevronRight, Terminal,
    Sidebar as SidebarIcon, Sliders, Play, Check, Globe, RefreshCw, Eye, Lock,
    Calculator, Trash2, Cpu
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';

const TutorialWizard = () => {
    const {
        activeModal,
        isModalClosing,
        closeModal,
        tutorialStep,
        setTutorialStep
    } = useUIStore();

    // Interactive Demo States for each slide
    const [demoSpace, setDemoSpace] = useState('personal');
    const [demoQuery, setDemoQuery] = useState('> ls');
    const [isSimulatingSearch, setIsSimulatingSearch] = useState(false);
    const [activeShortcutDemo, setActiveShortcutDemo] = useState(null);

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'tutorial';
    if (activeModal !== 'tutorial' && !isClosingThis) return null;

    const finishTutorial = () => {
        useUIStore.getState().setTutorialDone(true);
        closeModal();
        useUIStore.getState().showToast("You're all set! Press Ctrl+K anytime to command QBrowse.");
    };

    const steps = [
        { id: 0, label: 'Zen & Spaces', icon: Layers, subtitle: 'Multitasking Evolved' },
        { id: 1, label: 'Command Palette', icon: Command, subtitle: 'Ctrl / Cmd + K' },
        { id: 2, label: 'Spatial Tab Map', icon: MapIcon, subtitle: 'Ctrl / Cmd + E' },
        { id: 3, label: 'On-Device AI', icon: Sparkles, subtitle: '100% Offline & Private' },
        { id: 4, label: 'Power Shortcuts', icon: Keyboard, subtitle: 'Master Key Bindings' }
    ];

    const shortcutsList = [
        { key: 'Ctrl / Cmd + K', name: 'Command Palette', desc: 'Summon Omnibox for instant web search, terminal commands (>), AI queries (?), and math.', cat: 'Navigation', icon: Command },
        { key: 'Ctrl / Cmd + E', name: 'Spatial Tab Map', desc: 'Enter 3D spatial overview mode to see live web view thumbnails of all open tabs.', cat: 'Navigation', icon: MapIcon },
        { key: 'Ctrl / Cmd + 1 / 2 / 3', name: 'Switch Spaces', desc: 'Instantly jump between Personal (1), Work (2), and Ghost Mode (3) environments.', cat: 'Spaces', icon: Layers },
        { key: 'Ctrl / Cmd + Shift + N', name: 'Toggle Ghost Mode', desc: 'Activate zero-footprint private browsing where no history or cookies are stored.', cat: 'Spaces', icon: Eye },
        { key: 'Ctrl / Cmd + B', name: 'Toggle Left Sidebar', desc: 'Hide or show the sidebar for an edge-to-edge, distraction-free Zen browsing experience.', cat: 'Interface', icon: SidebarIcon },
        { key: 'Ctrl / Cmd + J', name: 'Toggle Right Panel', desc: 'Open or close the Tool Hub, built-in AI assistant, and downloads drawer.', cat: 'Interface', icon: Sliders },
        { key: 'Ctrl / Cmd + T / W', name: 'New / Close Tab', desc: 'Instantly open a new Zen tab in the current space or terminate the active view.', cat: 'Tabs', icon: RefreshCw },
        { key: 'Ctrl / Cmd + Tab', name: 'Fast Tab Switcher', desc: 'Quickly toggle back to your previously active tab, or hold to open the switcher grid.', cat: 'Tabs', icon: Monitor },
        { key: 'F11', name: 'Fullscreen Zen', desc: 'Expand the web viewport to fill your entire screen without OS menus or toolbars.', cat: 'Interface', icon: Zap }
    ];

    const getDemoStatus = (query) => {
        const q = query.trim();
        if (q.startsWith('>')) {
            return { type: 'Terminal Action', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: Terminal, desc: `Executing browser command: "${q.slice(1).trim()}"` };
        }
        if (q.startsWith('?')) {
            return { type: 'Ask Qu-AI (Offline)', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: Sparkles, desc: `Querying local Llama/Gemma neural engine...` };
        }
        if (/^[-+]?[0-9.()]+(?:[\s+\-*/]+[0-9.()]+)+$/.test(q)) {
            try {
                // eslint-disable-next-line no-new-func
                const res = new Function(`return (${q})`)();
                return { type: 'Instant Math Evaluation', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: Calculator, desc: `Result: = ${res}` };
            } catch (e) {}
        }
        return { type: 'Web URL / Search', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Globe, desc: `Navigating to ${q}...` };
    };

    const handleSearchDemo = (text) => {
        setDemoQuery(text);
        setIsSimulatingSearch(true);
        setTimeout(() => setIsSimulatingSearch(false), 450);
    };

    const currentDemoStatus = getDemoStatus(demoQuery);
    const StatusIcon = currentDemoStatus.icon;

    return (
        <div className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-3xl text-white font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-pop-in duration-500'}`} onClick={finishTutorial}>
            <div className="w-full max-w-[960px] h-[640px] bg-[#0a0a0c]/95 border border-white/15 rounded-[2.5rem] shadow-[0_50px_130px_rgba(0,0,0,0.95)] overflow-hidden flex transition-all duration-500 relative" onClick={e => e.stopPropagation()}>

                {/* Left Navigation Sidebar */}
                <div className="w-68 bg-black/60 border-r border-white/10 p-8 flex flex-col relative z-20 flex-shrink-0">
                    <div className="mb-8">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent-30 shadow-[0_0_15px_var(--accent-20)] flex items-center gap-1.5 w-max">
                            <Sparkles size={11} className="animate-spin-slow" /> Interactive Tour
                        </span>
                        <h2 className="text-2xl font-black text-white mt-3 tracking-tight flex items-center gap-2.5">
                            <Compass className="text-accent animate-spin-slow" size={24} /> QBrowse Guide
                        </h2>
                    </div>

                    <div className="flex flex-col gap-4 relative flex-1">
                        <div className="absolute left-[11px] top-4 bottom-8 w-px bg-gradient-to-b from-accent/50 via-white/10 to-transparent"></div>
                        {steps.map(step => (
                            <button
                                key={step.id}
                                onClick={() => { setTutorialStep(step.id); setActiveShortcutDemo(null); }}
                                className={`flex items-center gap-4 relative z-10 p-2.5 rounded-2xl transition-all duration-300 text-left group ${tutorialStep === step.id ? 'bg-white/10 border border-white/15 text-white shadow-lg translate-x-1' : 'hover:bg-white/5 text-white/50 hover:text-white/80'}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${tutorialStep === step.id ? 'bg-accent text-black shadow-[0_0_20px_var(--accent-40)] font-black scale-110' : (tutorialStep > step.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#1a1a1c] border border-white/10 text-white/30 group-hover:border-white/30')}`}>
                                    {tutorialStep > step.id ? <CheckCircle size={12} /> : <step.icon size={12} />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-sm font-bold tracking-wide truncate transition-colors ${tutorialStep === step.id ? 'text-white' : ''}`}>{step.label}</span>
                                    <span className="text-[10px] font-mono text-white/40 truncate">{step.subtitle}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                        <button onClick={finishTutorial} className="text-xs text-white/40 hover:text-white transition font-medium flex items-center gap-1.5 group">
                            Skip walkthrough <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Right Container: Sliding Slides */}
                <div className="flex-1 relative overflow-hidden bg-[#121214]">
                    {/* Dynamic Ambient Glow based on Step */}
                    <div className={`absolute inset-0 transition-all duration-1000 pointer-events-none ${
                        tutorialStep === 0 ? 'bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_65%)]' :
                        tutorialStep === 1 ? 'bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_65%)]' :
                        tutorialStep === 2 ? 'bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_65%)]' :
                        tutorialStep === 3 ? 'bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),transparent_65%)]' :
                        'bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.15),transparent_65%)]'
                    }`}></div>

                    <button onClick={finishTutorial} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-all z-50 text-white/50 hover:text-white border border-white/10 hover:scale-110"><X size={18} /></button>

                    <div className="absolute inset-y-0 left-0 w-[500%] flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${tutorialStep * 20}%)` }}>

                        {/* Step 0: Zen & Spaces */}
                        <div className="w-1/5 h-full p-10 flex flex-col justify-center relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 rounded-2xl flex items-center justify-center border border-blue-500/30 mb-5 text-blue-400 shadow-xl shadow-blue-500/10 animate-float"><Layers size={28} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span> Multitasking Evolved
                            </span>
                            <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Organize with Spaces.</h3>
                            <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-lg">
                                Say goodbye to messy tab clutter. QBrowse isolates browsing into distinct environments. Try switching spaces below to see real-time workspace separation:
                            </p>

                            {/* Interactive Live Demo */}
                            <div className="p-5 rounded-2xl bg-black/50 border border-white/15 backdrop-blur-xl mb-6 shadow-2xl max-w-lg">
                                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                                    <span className="text-[11px] font-mono text-white/40 uppercase">Interactive Demo: Click to Test</span>
                                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white/80">Shortcut: Ctrl + 1 / 2 / 3</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2.5 mb-4">
                                    {[
                                        { id: 'personal', name: 'Personal', color: 'blue', desc: 'YouTube, Reddit, News', shortcut: 'Ctrl + 1' },
                                        { id: 'work', name: 'Work', color: 'emerald', desc: 'GitHub, Docs, Jira', shortcut: 'Ctrl + 2' },
                                        { id: 'ghost', name: 'Ghost Mode', color: 'purple', desc: '0 Cookies, 0 History', shortcut: 'Ctrl + 3' }
                                    ].map((sp) => (
                                        <button
                                            key={sp.id}
                                            onClick={() => setDemoSpace(sp.id)}
                                            className={`p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group ${
                                                demoSpace === sp.id 
                                                    ? (sp.id === 'personal' ? 'border-blue-500 bg-blue-500/20 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-[1.02]' :
                                                       sp.id === 'work' ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]' :
                                                       'border-purple-500 bg-purple-500/20 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[1.02]') 
                                                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between font-bold text-xs mb-1">
                                                <span className="flex items-center gap-1.5">
                                                    {sp.id === 'ghost' ? <Eye size={13} /> : <Layers size={13} />}
                                                    {sp.name}
                                                </span>
                                                <span className="text-[9px] font-mono opacity-60">{sp.shortcut}</span>
                                            </div>
                                            <div className="text-[10px] opacity-70 truncate">{sp.desc}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs font-mono">
                                    <span className="text-white/70 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${demoSpace === 'personal' ? 'bg-blue-400' : demoSpace === 'work' ? 'bg-emerald-400' : 'bg-purple-400 animate-pulse'}`}></span>
                                        Active View: <strong className="text-white uppercase">{demoSpace} Space</strong>
                                    </span>
                                    <span className="text-accent text-[10px] font-bold">100% Isolated Storage</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(1)} className="px-7 py-3.5 bg-accent text-black rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: Command Palette <ArrowRight size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Step 1: Command Palette */}
                        <div className="w-1/5 h-full p-10 flex flex-col justify-center relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 rounded-2xl flex items-center justify-center border border-amber-500/30 mb-5 text-amber-400 shadow-xl shadow-amber-500/10 animate-float"><Command size={28} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> The Ultimate Omnibox
                            </span>
                            <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Command Palette (Ctrl + K).</h3>
                            <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-lg">
                                The QBrowse Omnibox is a 4-in-1 power hub. Type <span className="font-mono font-bold bg-white/10 px-1 py-0.5 rounded text-amber-300">&gt;</span> for terminal commands, <span className="font-mono font-bold bg-white/10 px-1 py-0.5 rounded text-purple-300">?</span> to ask offline AI, or math equations for instant answers!
                            </p>

                            {/* Interactive Search Simulator */}
                            <div className="p-5 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl mb-6 shadow-2xl max-w-lg">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3.5 top-3.5 text-amber-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={demoQuery} 
                                        onChange={e => setDemoQuery(e.target.value)}
                                        placeholder="Try '> ls', '? summarize', or '25 * 4'"
                                        className="w-full bg-white/10 border border-amber-500/40 rounded-xl pl-10 pr-20 py-3 text-xs text-white font-mono outline-none shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all"
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] font-mono font-bold bg-white/15 text-amber-300 px-2 py-1 rounded border border-white/10">CTRL + K</span>
                                </div>

                                {/* 4 Mode Trigger Buttons */}
                                <div className="flex gap-2 flex-wrap mb-4">
                                    {[
                                        { label: '> ls (List Tabs)', query: '> ls', badge: 'Terminal' },
                                        { label: '> sleep tabs (Free RAM)', query: '> sleep tabs', badge: 'Terminal' },
                                        { label: '? Explain quantum AI', query: '? Explain quantum AI', badge: 'Qu-AI' },
                                        { label: '144 / 12 * 5', query: '144 / 12 * 5', badge: 'Math' },
                                        { label: 'github.com', query: 'github.com', badge: 'Web' }
                                    ].map((item, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleSearchDemo(item.query)}
                                            className="px-2.5 py-1.5 bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/40 border border-white/10 rounded-lg text-[11px] font-mono text-white/80 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
                                        >
                                            <span>{item.label}</span>
                                            <span className="text-[9px] font-bold opacity-60 bg-white/10 px-1 py-0.2 rounded">{item.badge}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${currentDemoStatus.color}`}>
                                    {isSimulatingSearch ? (
                                        <span className="flex items-center gap-2 animate-pulse font-bold">
                                            <RefreshCw size={14} className="animate-spin" /> Processing input in real-time...
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <StatusIcon size={16} className="flex-shrink-0 animate-bounce" />
                                            <div className="truncate">
                                                <span className="font-bold uppercase tracking-wider text-[10px] opacity-75 block">{currentDemoStatus.type}</span>
                                                <span className="font-semibold text-white/95 truncate block">{currentDemoStatus.desc}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(0)} className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-colors">Back</button>
                                <button onClick={() => setTutorialStep(2)} className="px-7 py-3.5 bg-accent text-black rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: Spatial Tab Map <ArrowRight size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Step 2: Spatial Tab Map */}
                        <div className="w-1/5 h-full p-10 flex flex-col justify-center relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/30 mb-5 text-emerald-400 shadow-xl shadow-emerald-500/10 animate-float"><MapIcon size={28} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Spatial Architecture
                            </span>
                            <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Spatial Tab Map (Ctrl + E).</h3>
                            <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-lg">
                                Never get overwhelmed by 50 open tabs. Press <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-bold">Ctrl + E</span> or <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-bold">Cmd + E</span> to enter a stunning 3D spatial overview of all running web viewports:
                            </p>

                            {/* Animated 3D Grid Demo */}
                            <div className="p-5 rounded-2xl bg-black/50 border border-white/15 backdrop-blur-xl mb-6 shadow-2xl max-w-lg perspective-[1200px]">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex flex-col items-center justify-center aspect-video shadow-[0_10px_30px_rgba(16,185,129,0.2)] transform hover:scale-105 transition-all duration-300 group cursor-pointer">
                                        <Monitor className="text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" size={22} />
                                        <span className="text-[11px] font-bold text-white group-hover:text-emerald-300 transition-colors">Active Viewport</span>
                                        <span className="text-[9px] font-mono text-emerald-400/80">60 FPS Render</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center aspect-video opacity-60 hover:opacity-100 hover:border-white/30 transform hover:scale-105 transition-all duration-300 cursor-pointer">
                                        <Monitor className="text-white/50 mb-1.5" size={22} />
                                        <span className="text-[11px] font-bold text-white/80">Background Tab</span>
                                        <span className="text-[9px] font-mono text-white/40">Suspended in RAM</span>
                                    </div>
                                </div>
                                <div className="mt-3 text-center">
                                    <span className="text-[10px] font-mono text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/5 inline-flex items-center gap-1.5">
                                        <Zap size={11} className="text-emerald-400" /> Press <strong>Ctrl + E</strong> anytime to toggle Map View
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(1)} className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-colors">Back</button>
                                <button onClick={() => setTutorialStep(3)} className="px-7 py-3.5 bg-accent text-black rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: On-Device AI <ArrowRight size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Step 3: Local AI */}
                        <div className="w-1/5 h-full p-10 flex flex-col justify-center relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl flex items-center justify-center border border-purple-500/30 mb-5 text-purple-400 shadow-xl shadow-purple-500/10 animate-float"><Bot size={28} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span> 100% Offline Guarantee
                            </span>
                            <h3 className="text-3xl font-black text-white mb-3 tracking-tight">On-Device Llama AI.</h3>
                            <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-lg">
                                QBrowse features an embedded neural engine. Type <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-bold">?</span> in the Omnibox (e.g., <span className="font-mono text-purple-300">? summarize</span>) or open the Tool Hub (<span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-bold">Ctrl + J</span>) to chat with total privacy.
                            </p>

                            <div className="p-5 rounded-2xl bg-black/60 border border-purple-500/30 backdrop-blur-xl mb-6 shadow-2xl max-w-lg">
                                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black text-xs">AI</div>
                                    <div>
                                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                            Local Llama Engine <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.2 rounded-full border border-purple-500/30">Offline RAM</span>
                                        </div>
                                        <div className="text-[10px] text-white/40">Zero telemetry • Data never leaves your PC</div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-200 leading-relaxed">
                                    <span className="font-bold text-purple-400">✨ Qu-AI:</span> "I analyze web pages and answer questions entirely inside your machine's RAM without external APIs."
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(2)} className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-colors">Back</button>
                                <button onClick={() => setTutorialStep(4)} className="px-7 py-3.5 bg-accent text-black rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: Power Shortcuts <ArrowRight size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Step 4: Keyboard Shortcuts Cheat Sheet */}
                        <div className="w-1/5 h-full p-8 flex flex-col justify-center relative">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent mb-0.5 flex items-center gap-1.5">
                                        <Keyboard size={13} /> Master Key Bindings
                                    </span>
                                    <h3 className="text-3xl font-black text-white tracking-tight">Shortcuts Cheat Sheet.</h3>
                                </div>
                                {activeShortcutDemo && (
                                    <div className="px-4 py-2 bg-accent-10 border border-accent-30 rounded-xl text-xs font-mono text-accent animate-pulse font-bold">
                                        Testing: {activeShortcutDemo.key}
                                    </div>
                                )}
                            </div>
                            
                            {/* Interactive Scrollable Grid of All Accurate Shortcuts */}
                            <div className="grid grid-cols-3 gap-2.5 max-w-2xl max-h-[380px] overflow-y-auto pr-1 mb-6 hide-scroll">
                                {shortcutsList.map((item, idx) => {
                                    const Icon = item.icon;
                                    const isSelected = activeShortcutDemo?.key === item.key;
                                    return (
                                        <button 
                                            key={idx} 
                                            onClick={() => setActiveShortcutDemo(item)}
                                            className={`p-3 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between group active:scale-95 ${
                                                isSelected 
                                                    ? 'bg-accent text-black border-accent shadow-[0_0_20px_var(--accent-40)] scale-[1.02]' 
                                                    : 'bg-black/50 border-white/10 hover:border-white/30 hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5 w-full">
                                                <span className={`font-mono text-[11px] font-black px-1.5 py-0.5 rounded transition-colors ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-accent group-hover:bg-accent/20 group-hover:text-white'}`}>
                                                    {item.key}
                                                </span>
                                                <Icon size={14} className={isSelected ? 'text-black' : 'text-white/40 group-hover:text-white'} />
                                            </div>
                                            <div>
                                                <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-black' : 'text-white'}`}>{item.name}</div>
                                                <div className={`text-[9px] mt-1 line-clamp-2 ${isSelected ? 'text-black/80 font-medium' : 'text-white/50'}`}>{item.desc}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/10">
                                <button onClick={() => setTutorialStep(3)} className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-colors">Back</button>
                                <button onClick={finishTutorial} className="px-8 py-3.5 bg-accent text-black rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_15px_35px_var(--accent-40)] flex items-center gap-2 animate-pulse-border">
                                    Start Browsing <Zap size={16} />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorialWizard;
