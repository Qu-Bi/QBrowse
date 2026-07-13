import React, { useState, useEffect, useRef } from 'react';
import { 
    Command, Search, ChevronUp, ChevronDown, X, Moon, Trash2, 
    ShieldAlert, Download, Cpu, Pause, XCircle, FolderOpen, 
    Music, SkipBack, SkipForward, ExternalLink, Maximize, WifiOff, 
    RefreshCw, Ghost, MonitorPlay, ShieldCheck, Zap 
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import TopBar from './TopBar';
import WebViewContainer from './WebViewContainer';

export default function MainFrame() {
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const setIsFullscreen = useUIStore(state => state.setIsFullscreen);
    const isForceDark = useUIStore(state => state.isForceDark);
    const setIsForceDark = useUIStore(state => state.setIsForceDark);
    const toast = useUIStore(state => state.toast);
    const activePopover = useUIStore(state => state.activePopover);
    const isPopoverClosing = useUIStore(state => state.isPopoverClosing);
    const closePopover = useUIStore(state => state.closePopover);
    const isFindOpen = useUIStore(state => state.isFindOpen);
    const setIsFindOpen = useUIStore(state => state.setIsFindOpen);
    const zoomLevel = useUIStore(state => state.zoomLevel);
    const isSplitView = useUIStore(state => state.isSplitView);
    const isRefreshing = useUIStore(state => state.isRefreshing);
    const refresh = useUIStore(state => state.refresh);
    const currentUrl = useUIStore(state => state.currentUrl);
    const openOmnibox = useUIStore(state => state.openOmnibox);
    const peekWindow = useUIStore(state => state.peekWindow);
    const setPeekWindow = useUIStore(state => state.setPeekWindow);
    const isPeekClosing = useUIStore(state => state.isPeekClosing);
    const closePeek = useUIStore(state => state.closePeek);
    const isAdblockActive = useUIStore(state => state.isAdblockActive);
    const setIsAdblockActive = useUIStore(state => state.setIsAdblockActive);
    const accentColor = useUIStore(state => state.accentColor);
    
    const activeSpace = useTabStore(state => state.activeSpace);
    const isIncognito = activeSpace === 'ghost';
    
    const [findQuery, setFindQuery] = useState('');
    const findInputRef = useRef(null);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (isFindOpen) {
            setTimeout(() => {
                findInputRef.current?.focus();
                findInputRef.current?.select();
            }, 50);
        } else {
            setFindQuery('');
        }
    }, [isFindOpen]);

    const dateString = currentTime.toLocaleDateString('pl-PL', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeString = currentTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

    // Mock states for UI
    const [formEmail, setFormEmail] = useState('admin@qbrowse.local');
    const [formPassword, setFormPassword] = useState('super_secret_password_123');
    const darkExclusions = ['github.com', 'stackoverflow.com'];

    const renderZenDashboard = () => {
        const isDark = isForceDark || isIncognito;
        const hour = currentTime.getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden animate-pop-in z-10 w-full h-full">
                <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--accent-30),transparent_60%)] ${isDark ? 'opacity-40' : 'opacity-20 mix-blend-multiply'} animate-pulse pointer-events-none`} style={{ animationDuration: '8s' }}></div>
                <div className={`absolute top-0 left-0 right-0 h-64 bg-gradient-to-b ${isDark ? 'from-black/20' : 'from-white/40'} to-transparent pointer-events-none`}></div>

                <div className="relative z-10 flex flex-col items-center transition-transform duration-500 w-full" style={{ transform: `scale(${zoomLevel / 100})` }}>
                    <div className="flex flex-col items-center mb-10 md:mb-14">
                        <span className={`text-xs md:text-sm font-bold uppercase tracking-[0.4em] mb-4 drop-shadow-sm transition-colors duration-500 ${isDark ? 'text-white/50' : 'text-slate-500/80'}`}>{dateString}</span>
                        <h1 className={`text-[6rem] md:text-[9rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${isDark ? 'from-white via-white/90 to-white/20' : 'from-slate-800 via-slate-600 to-slate-400'} select-none transition-colors duration-500`} style={{ textShadow: isDark ? '0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.05)' }}>
                            {timeString}
                        </h1>
                        <span className={`text-sm font-medium mt-4 tracking-widest transition-colors duration-500 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{greeting}, Admin</span>
                    </div>

                    <button
                        onClick={() => openOmnibox('')}
                        className={`group relative w-[90%] max-w-2xl backdrop-blur-3xl border rounded-[2rem] p-5 flex items-center gap-4 transition-all duration-500 hover:scale-[1.02] ${isDark ? 'bg-black/40 border-white/10 hover:border-accent/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_80px_var(--accent-20)]' : 'bg-white/60 border-black/5 hover:border-accent/40 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_80px_var(--accent-20)]'}`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent ${isDark ? 'via-white/5' : 'via-black/5'} to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] rounded-[2rem] overflow-hidden`}></div>
                        <Search size={22} className={`transition-colors ${isDark ? 'text-white/40 group-hover:text-accent' : 'text-slate-400 group-hover:text-accent'}`} />
                        <span className={`text-lg font-medium transition-colors flex-1 text-left ${isDark ? 'text-white/30 group-hover:text-white/80' : 'text-slate-400 group-hover:text-slate-700'}`}>Search the web, or type a command...</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-inner transition-colors ${isDark ? 'bg-white/5 border-white/10 group-hover:bg-accent/10 group-hover:border-accent/30' : 'bg-black/5 border-black/5 group-hover:bg-accent/10 group-hover:border-accent/30'}`}>
                            <Command size={12} className={`transition-colors ${isDark ? 'text-white/60 group-hover:text-accent' : 'text-slate-500 group-hover:text-accent'}`} />
                            <span className={`text-xs font-bold transition-colors ${isDark ? 'text-white/60 group-hover:text-accent' : 'text-slate-500 group-hover:text-accent'}`}>K</span>
                        </div>
                    </button>

                    <div className={`mt-14 md:mt-20 flex items-center gap-6 md:gap-8 px-8 py-4 backdrop-blur-3xl border rounded-full transition-colors duration-500 ${isDark ? 'bg-[#0a0a0c]/60 border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] hover:border-white/10' : 'bg-white/60 border-black/5 shadow-[0_30px_60px_rgba(0,0,0,0.05)] hover:border-black/10'}`}>
                        <div className="flex items-center gap-3 group/stat cursor-default">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? 'bg-green-500/10 border-green-500/20 group-hover/stat:bg-green-500/20' : 'bg-green-100 border-green-200 group-hover/stat:bg-green-200'}`}>
                                <ShieldCheck size={16} className="text-green-500 group-hover/stat:drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-all" />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Privacy</span>
                                <span className={`text-xs font-semibold transition-colors ${isDark ? 'text-white/70 group-hover/stat:text-white' : 'text-slate-600 group-hover/stat:text-slate-900'}`}>12,401 Blocked</span>
                            </div>
                        </div>
                        <div className={`w-px h-8 transition-colors ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
                        <div className="flex items-center gap-3 group/stat cursor-default">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? 'bg-blue-500/10 border-blue-500/20 group-hover/stat:bg-blue-500/20' : 'bg-blue-100 border-blue-200 group-hover/stat:bg-blue-200'}`}>
                                <Cpu size={16} className="text-blue-500 group-hover/stat:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all" />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Memory</span>
                                <span className={`text-xs font-semibold transition-colors ${isDark ? 'text-white/70 group-hover/stat:text-white' : 'text-slate-600 group-hover/stat:text-slate-900'}`}>1.4 GB Saved</span>
                            </div>
                        </div>
                        <div className={`w-px h-8 transition-colors ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
                        <div className="flex items-center gap-3 group/stat cursor-default">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? 'bg-accent-10 border-accent-20 group-hover/stat:bg-accent-20' : 'bg-accent/10 border-accent/20 group-hover/stat:bg-accent/20'}`}>
                                <Zap size={16} className="text-accent group-hover/stat:drop-shadow-[0_0_8px_var(--accent)] transition-all" />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Engine</span>
                                <span className={`text-xs font-semibold transition-colors ${isDark ? 'text-white/70 group-hover/stat:text-white' : 'text-slate-600 group-hover/stat:text-slate-900'}`}>Hardware Accel.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className={`flex-1 relative z-10 flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform-gpu transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFullscreen ? 'rounded-none border-none' : 'rounded-[2rem] border border-white/20'} ${isForceDark || isIncognito ? 'bg-[#121214]' : 'bg-[#fafafa]'}`}>
            {toast && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[20000] px-5 py-3 bg-accent-20 border border-accent-30 text-accent rounded-2xl backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] font-semibold text-sm animate-toast flex items-center gap-3 pointer-events-none">
                    <Command size={16} />{toast}
                </div>
            )}

            {(activePopover || isPopoverClosing) && (
                <div className={`absolute inset-0 z-[50] bg-black/10 backdrop-blur-[2px] transition-opacity duration-200 ${isPopoverClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closePopover} />
            )}

            <TopBar />

            {isFindOpen && (
                <div className={`absolute top-16 right-6 z-[55] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] border animate-pop-in ${isForceDark || isIncognito ? 'bg-black/80 border-white/20 backdrop-blur-xl' : 'bg-white/90 border-gray-300 backdrop-blur-xl'}`}>
                    <Search size={14} className={isForceDark || isIncognito ? 'text-white/40' : 'text-gray-400'} />
                    <input
                        ref={findInputRef}
                        type="text"
                        value={findQuery}
                        onChange={e => setFindQuery(e.target.value)}
                        placeholder="Find in page..."
                        className={`bg-transparent border-none outline-none text-sm w-32 md:w-48 font-medium ${isForceDark || isIncognito ? 'text-white placeholder-white/30' : 'text-gray-800 placeholder-gray-400'}`}
                    />
                    <span className={`text-xs font-mono px-2 border-r ${isForceDark || isIncognito ? 'text-white/40 border-white/10' : 'text-gray-400 border-gray-200'}`}>
                        {findQuery.length > 0 ? '1/4' : '0/0'}
                    </span>
                    <div className="flex items-center gap-1 pl-1">
                        <button className={`p-1 rounded-md transition ${isForceDark || isIncognito ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}><ChevronUp size={14} /></button>
                        <button className={`p-1 rounded-md transition ${isForceDark || isIncognito ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}><ChevronDown size={14} /></button>
                        <div className={`w-px h-4 mx-1 ${isForceDark || isIncognito ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                        <button onClick={() => setIsFindOpen(false)} className={`p-1 rounded-md transition ${isForceDark || isIncognito ? 'hover:bg-red-500/20 text-white/60 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}><X size={14} /></button>
                    </div>
                </div>
            )}

            {(activePopover === 'darkmode' || (isPopoverClosing && activePopover === 'darkmode')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-32 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-slide-down'}`}>
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Moon size={16} className="text-accent" /> Smart Dark Mode
                        </div>
                        <button onClick={() => setIsForceDark(!isForceDark)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${isForceDark ? 'bg-accent' : 'bg-white/20'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isForceDark ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                    <div className="p-4 bg-black/20">
                        <span className="text-xs font-bold uppercase text-white/40 tracking-wider mb-2 block">Blacklist</span>
                        <div className="flex flex-col gap-2">
                            {darkExclusions.map((domain, i) => (
                                <div key={i} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs font-mono text-white/80">
                                    {domain} <Trash2 size={12} className="text-red-400 hover:text-red-300 cursor-pointer" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(activePopover === 'adblock' || (isPopoverClosing && activePopover === 'adblock')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-12 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-slide-down'}`}>
                    <div className={`p-5 flex flex-col items-center justify-center border-b border-white/10 transition-colors duration-500 ${isAdblockActive ? 'bg-green-500/10' : 'bg-transparent'}`}>
                        <ShieldAlert size={40} className={`mb-2 drop-shadow-md transition-colors ${isAdblockActive ? 'text-green-400' : 'text-white/20'}`} strokeWidth={1.5} />
                        <span className={`text-3xl font-black tracking-tight ${isAdblockActive ? 'text-white' : 'text-white/40'}`}>{isAdblockActive ? '12' : '0'}</span>
                        <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest mt-1">Blocked Trackers</span>
                    </div>
                    <div className="p-4 bg-black/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white/90">Native Interceptor</span>
                            <button onClick={() => setIsAdblockActive(!isAdblockActive)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${isAdblockActive ? 'bg-green-500' : 'bg-white/20'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isAdblockActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                        <div className={`flex flex-col gap-1.5 text-[10px] font-mono transition-opacity duration-300 ${isAdblockActive ? 'opacity-100' : 'opacity-30'}`}>
                            <div className="flex justify-between"><span className="text-white/60">doubleclick.net</span><span className="text-red-400">Blocked</span></div>
                            <div className="flex justify-between"><span className="text-white/60">google-analytics.com</span><span className="text-red-400">Blocked</span></div>
                        </div>
                    </div>
                </div>
            )}

            {(activePopover === 'downloads' || (isPopoverClosing && activePopover === 'downloads')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-6 z-[60] w-80 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-slide-down'}`}>
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Download size={16} className="text-accent" /> Downloads
                        </div>
                        <button className="text-white/40 hover:text-white transition text-xs font-medium">Clear All</button>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-2 relative overflow-hidden group">
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-inner"><Cpu size={14} /></div>
                                    <div className="flex flex-col truncate">
                                        <span className="text-sm font-semibold text-white/90 truncate">ubuntu-24.04-desktop.iso</span>
                                        <span className="text-[10px] text-white/40 font-mono mt-0.5">1.2 GB / 4.5 GB • 12 MB/s</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Pause"><Pause size={14} /></button>
                                    <button className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Cancel"><XCircle size={14} /></button>
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mt-1 relative z-10 border border-white/5">
                                <div className="h-full bg-accent w-[35%] rounded-full relative">
                                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-transparent hover:bg-white/5 border border-transparent rounded-xl flex items-center justify-between transition group cursor-pointer mt-1">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0 shadow-inner"><FolderOpen size={14} /></div>
                                <div className="flex flex-col truncate">
                                    <span className="text-sm font-medium text-white/80 group-hover:text-white truncate">Q4_Financial_Report.pdf</span>
                                    <span className="text-[10px] text-green-400 font-mono mt-0.5">Completed • 2.4 MB</span>
                                </div>
                            </div>
                            <button className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm" title="Show in folder">
                                <FolderOpen size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(activePopover === 'media' || (isPopoverClosing && activePopover === 'media')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-6 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-slide-down'}`}>
                    <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Music size={14} className="text-purple-400" /> Media Controls
                        </div>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <img src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&h=100&auto=format&fit=crop" className="w-12 h-12 rounded-lg shadow-md object-cover" alt="album cover" />
                            <div className="flex flex-col overflow-hidden w-full">
                                <span className="text-sm font-bold truncate">Lofi Chill Beats 2026</span>
                                <span className="text-xs text-white/50 truncate">YouTube</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                                <div className="h-full bg-purple-400 w-[45%] rounded-full relative"></div>
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-white/40">
                                <span>12:45</span>
                                <span>28:10</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 mt-1">
                            <button className="text-white/50 hover:text-white transition hover:scale-110"><SkipBack size={18} fill="currentColor" /></button>
                            <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 flex items-center justify-center text-white transition shadow-sm hover:scale-105"><Pause size={18} fill="currentColor" /></button>
                            <button className="text-white/50 hover:text-white transition hover:scale-110"><SkipForward size={18} fill="currentColor" /></button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex-1 w-full relative overflow-hidden transition-colors duration-700 ease-in-out flex text-white`}>
                <div className={`relative h-full overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSplitView ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
                    <div className="absolute inset-y-0 left-0 w-[300%] flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ transform: activeSpace === 'prywatne' ? 'translateX(0)' : activeSpace === 'praca' ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}>

                        {/* PRYWATNE */}
                        <div className="w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative">
                            {currentUrl === '' ? renderZenDashboard() : (
                                <>
                                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                                    <WebViewContainer space="prywatne" />
                                </>
                            )}
                        </div>

                        {/* PRACA */}
                        <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                            {currentUrl === '' ? renderZenDashboard() : (
                                <>
                                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                                    <WebViewContainer space="praca" />
                                </>
                            )}
                        </div>

                        {/* GHOST */}
                        <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                            {currentUrl === '' ? renderZenDashboard() : (
                                <>
                                    <WebViewContainer space="ghost" />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] h-full overflow-hidden flex flex-col items-center justify-center relative ${isSplitView ? 'w-1/2 opacity-100' : 'w-0 opacity-0'} ${isForceDark || isIncognito ? 'bg-[#0a0a0c]' : 'bg-[#f0f0f0]'}`}>
                    <div className="w-full min-w-[300px] h-full flex flex-col items-center justify-center relative">
                        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                        <div className="relative z-10 flex flex-col items-center transition-transform duration-200" style={{ transform: `scale(${zoomLevel / 100})` }}>
                            <MonitorPlay size={48} className="text-gray-400 mb-6 drop-shadow-sm transition-transform hover:scale-110 cursor-pointer" strokeWidth={1.5} />
                            <h2 className={`text-xl md:text-2xl font-bold tracking-tight mb-2 ${isForceDark || isIncognito ? 'text-gray-200' : 'text-gray-700'}`}>Second Screen</h2>
                            <p className="font-semibold tracking-widest text-gray-500 uppercase text-[10px] md:text-xs">Tab 2 (Split View)</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* PEEK WINDOW */}
            {(peekWindow || isPeekClosing) && (
                <div className={`absolute inset-8 md:inset-20 z-[1000] flex flex-col rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden backdrop-blur-3xl border ${isForceDark || isIncognito ? 'bg-black/60 border-white/10' : 'bg-white/70 border-white/30'} ${isPeekClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
                    <button onClick={closePeek} className="absolute top-4 left-4 z-10 w-4 h-4 bg-red-500 hover:bg-red-400 text-transparent hover:text-white rounded-full flex items-center justify-center transition-colors shadow-sm group">
                        <X size={10} className="opacity-0 group-hover:opacity-100" />
                    </button>
                    <div className={`flex-1 flex flex-col items-center justify-center relative ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                        <Globe size={32} className={isForceDark || isIncognito ? 'text-white/20 mb-4' : 'text-gray-300 mb-4'} />
                        <span className={`text-sm font-bold uppercase tracking-widest ${isForceDark || isIncognito ? 'text-white/40' : 'text-gray-400'}`}>Content Preview</span>
                    </div>
                </div>
            )}
        </main>
    );
}
