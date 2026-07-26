import React from 'react';
import { 
    Globe, Layers, Search, Command, Map as MapIcon, Monitor, 
    Sparkles, Cpu, Bot, CheckCircle, X, ArrowRight, Zap, 
    Compass, Keyboard, Shield, RefreshCw, ChevronRight, Terminal
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

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'tutorial';
    if (activeModal !== 'tutorial' && !isClosingThis) return null;

    const finishTutorial = () => {
        useUIStore.getState().setTutorialDone(true);
        closeModal();
        useUIStore.getState().showToast("You're ready! Enjoy QBrowse.");
    };

    const steps = [
        { id: 0, label: 'Zen & Spaces', icon: Layers },
        { id: 1, label: 'Command Palette', icon: Command },
        { id: 2, label: 'Tab Map Overview', icon: MapIcon },
        { id: 3, label: 'On-Device AI', icon: Sparkles },
        { id: 4, label: 'Power Shortcuts', icon: Keyboard }
    ];

    return (
        <div className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-3xl text-white font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-pop-in duration-500'}`} onClick={finishTutorial}>
            <div className="w-full max-w-[920px] h-[600px] bg-[#0a0a0c]/90 border border-white/15 rounded-[2.5rem] shadow-[0_50px_120px_rgba(0,0,0,0.9)] overflow-hidden flex transition-all duration-500" onClick={e => e.stopPropagation()}>

                {/* Left Navigation Sidebar */}
                <div className="w-64 bg-black/50 border-r border-white/10 p-8 flex flex-col relative z-20">
                    <div className="mb-10">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent-30">
                            Quick Tour
                        </span>
                        <h2 className="text-2xl font-black text-white mt-2 tracking-tight flex items-center gap-2">
                            <Compass className="text-accent animate-spin-slow" size={24} /> Guide
                        </h2>
                    </div>

                    <div className="flex flex-col gap-5 relative flex-1">
                        <div className="absolute left-[11px] top-3 bottom-8 w-px bg-white/10"></div>
                        {steps.map(step => (
                            <button
                                key={step.id}
                                onClick={() => setTutorialStep(step.id)}
                                className={`flex items-center gap-4 relative z-10 transition-all duration-300 text-left ${tutorialStep === step.id ? 'text-accent scale-105' : (tutorialStep > step.id ? 'text-white/60' : 'text-white/30')}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${tutorialStep === step.id ? 'bg-accent text-black shadow-[0_0_20px_var(--accent-40)] font-black' : (tutorialStep > step.id ? 'bg-white/20 text-white font-bold' : 'bg-[#1a1a1c] border border-white/10 text-white/40')}`}>
                                    {tutorialStep > step.id ? <CheckCircle size={12} /> : <step.icon size={12} />}
                                </div>
                                <span className={`text-sm font-bold tracking-wide transition-colors ${tutorialStep === step.id ? 'text-white' : ''}`}>{step.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10">
                        <button onClick={finishTutorial} className="text-xs text-white/40 hover:text-white transition font-medium flex items-center gap-1.5">
                            Skip walkthrough <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Right Container: Sliding Slides */}
                <div className="flex-1 relative overflow-hidden bg-[#121214]">
                    {/* Ambient Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--accent-10),transparent_60%)] pointer-events-none"></div>

                    <button onClick={finishTutorial} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition z-50 text-white/50 hover:text-white border border-white/5"><X size={18} /></button>

                    <div className="absolute inset-y-0 left-0 w-[500%] flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${tutorialStep * 20}%)` }}>

                        {/* Step 0: Spaces & Multitasking */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 rounded-2xl flex items-center justify-center border border-blue-500/30 mb-6 text-blue-400 shadow-lg shadow-blue-500/10"><Layers size={32} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 mb-2">Multitasking Evolved</span>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Organize with Spaces.</h3>
                            <p className="text-sm text-white/60 mb-8 leading-relaxed max-w-md">
                                QBrowse eliminates tab clutter by dividing your browsing into dedicated isolated environments. Switch instantly between Work, Personal, and AI research on the left sidebar without losing focus.
                            </p>

                            {/* Interactive Visual Card */}
                            <div className="grid grid-cols-3 gap-3 max-w-md mb-8">
                                {[
                                    { name: 'Personal', color: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
                                    { name: 'Work', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
                                    { name: 'AI Research', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' }
                                ].map((sp, idx) => (
                                    <div key={idx} className={`p-3 rounded-xl border text-center font-bold text-xs shadow-md ${sp.color}`}>
                                        <Layers size={16} className="mx-auto mb-1 opacity-80" />
                                        {sp.name}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(1)} className="px-8 py-4 bg-accent text-black rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: Command Palette <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Step 1: Command Palette */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 rounded-2xl flex items-center justify-center border border-amber-500/30 mb-6 text-amber-400 shadow-lg shadow-amber-500/10"><Command size={32} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-2">Omnipresent Navigation</span>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Instant Control (Ctrl + K).</h3>
                            <p className="text-sm text-white/60 mb-8 leading-relaxed max-w-md">
                                Press <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-amber-300">Ctrl + K</span> or <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-amber-300">Cmd + K</span> anywhere to summon the Omnibox. Search the web, query your encrypted history, or execute instant browser commands without touching your mouse.
                            </p>

                            <div className="p-4 bg-black/60 border border-white/15 rounded-2xl max-w-md mb-8 flex items-center gap-3 shadow-xl">
                                <Search className="text-amber-400 flex-shrink-0" size={20} />
                                <div className="text-xs font-mono text-white/70 flex-1 truncate">Type a URL, search, or '@ai'...</div>
                                <span className="text-[10px] font-mono font-bold bg-white/10 text-white/50 px-2 py-1 rounded">CTRL + K</span>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(0)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors">Back</button>
                                <button onClick={() => setTutorialStep(2)} className="px-8 py-4 bg-accent text-black rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: Tab Map <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Step 2: Tab Map */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/30 mb-6 text-emerald-400 shadow-lg shadow-emerald-500/10"><MapIcon size={32} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-2">Spatial Architecture</span>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">See the Big Picture.</h3>
                            <p className="text-sm text-white/60 mb-8 leading-relaxed max-w-md">
                                Never get overwhelmed by open tabs again. Hover over the top-right Map icon or press <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-emerald-300">Ctrl + M</span> to enter spatial overview mode, previewing live web views in real time.
                            </p>

                            <div className="grid grid-cols-2 gap-3 max-w-md mb-8">
                                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex flex-col items-center justify-center aspect-video shadow-md group">
                                    <Monitor className="text-emerald-400 mb-2" size={24} />
                                    <span className="text-[11px] font-bold text-white/80">Active View</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center aspect-video opacity-60">
                                    <Monitor className="text-white/40 mb-2" size={24} />
                                    <span className="text-[11px] font-bold text-white/60">Background Tab</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(1)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors">Back</button>
                                <button onClick={() => setTutorialStep(3)} className="px-8 py-4 bg-accent text-black rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: Private AI <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Step 3: Local AI */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl flex items-center justify-center border border-purple-500/30 mb-6 text-purple-400 shadow-lg shadow-purple-500/10"><Bot size={32} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-purple-400 mb-2">100% Offline Privacy</span>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">On-Device Llama AI.</h3>
                            <p className="text-sm text-white/60 mb-8 leading-relaxed max-w-md">
                                QBrowse features an embedded neural engine. Summarize web pages, inspect images with multimodal vision, and chat without sending a single byte of personal data to cloud servers.
                            </p>

                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl max-w-md mb-8 flex items-center gap-3">
                                <Shield className="text-purple-400 flex-shrink-0" size={24} />
                                <div>
                                    <div className="text-xs font-bold text-purple-300">Local Privacy Guarantee</div>
                                    <div className="text-[11px] text-white/50 mt-0.5">Your data stays entirely inside your machine's RAM.</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(2)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors">Back</button>
                                <button onClick={() => setTutorialStep(4)} className="px-8 py-4 bg-accent text-black rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_10px_25px_var(--accent-30)] flex items-center gap-2">
                                    Next: Shortcuts <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Step 4: Keyboard Shortcuts */}
                        <div className="w-1/5 h-full p-12 flex flex-col justify-center relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-accent/30 to-amber-500/10 rounded-2xl flex items-center justify-center border border-accent-40 mb-6 text-accent shadow-lg shadow-accent/10"><Keyboard size={32} /></div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent mb-2">Master the Browser</span>
                            <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Essential Shortcuts.</h3>
                            
                            <div className="grid grid-cols-2 gap-3 max-w-md mb-8">
                                {[
                                    { key: 'Ctrl / Cmd + K', desc: 'Command Palette' },
                                    { key: 'Ctrl / Cmd + M', desc: 'Spatial Tab Map' },
                                    { key: 'Ctrl / Cmd + T', desc: 'New Zen Tab' },
                                    { key: 'Ctrl / Cmd + W', desc: 'Close Active Tab' },
                                    { key: 'Ctrl / Cmd + R', desc: 'Reload Viewport' },
                                    { key: 'F11 / ESC', desc: 'Toggle Fullscreen Zen' }
                                ].map((item, idx) => (
                                    <div key={idx} className="p-3 bg-black/40 border border-white/10 rounded-xl flex flex-col justify-center">
                                        <span className="font-mono text-xs font-bold text-accent mb-0.5">{item.key}</span>
                                        <span className="text-[11px] text-white/60">{item.desc}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <button onClick={() => setTutorialStep(3)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors">Back</button>
                                <button onClick={finishTutorial} className="px-8 py-4 bg-accent text-black rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_15px_35px_var(--accent-40)] flex items-center gap-2 font-black">
                                    Start Browsing <Zap size={18} />
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
