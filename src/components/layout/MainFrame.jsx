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
    const darkExclusions = useUIStore(state => state.darkExclusions);
    const setDarkExclusions = useUIStore(state => state.setDarkExclusions);
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
    const openOmnibox = useUIStore(state => state.openOmnibox);
    const peekWindow = useUIStore(state => state.peekWindow);
    const setPeekWindow = useUIStore(state => state.setPeekWindow);
    const isPeekClosing = useUIStore(state => state.isPeekClosing);
    const closePeek = useUIStore(state => state.closePeek);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);

    const isIncognito = activeSpace === 'ghost';
    const isPrywatneEmpty = privateTabs.find(t => t.active)?.url === '';
    const isPracaEmpty = workTabs.find(t => t.active)?.url === '';
    const isGhostEmpty = ghostTabs.find(t => t.active)?.url === '';
    
    const isAdblockActive = useUIStore(state => state.isAdblockActive);
    const setIsAdblockActive = useUIStore(state => state.setIsAdblockActive);
    const adblockStats = useUIStore(state => state.adblockStats);
    const accentColor = useUIStore(state => state.accentColor);
    
    
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

    const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Mock states for UI
    const [formEmail, setFormEmail] = useState('admin@qbrowse.local');
    const [formPassword, setFormPassword] = useState('super_secret_password_123');


    const renderZenDashboard = () => {
        const isDark = isForceDark || isIncognito;
        const greeting = "Welcome";

        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden animate-pop-in z-10 w-full h-full">
                <div className="relative z-10 flex flex-col items-center transition-transform duration-500 w-full mt-[-10vh]" style={{ transform: `scale(${zoomLevel / 100})` }}>
                    <div className="flex flex-col items-center mb-10 md:mb-14 px-4 w-full text-center">
                        <span className={`text-sm font-bold uppercase tracking-[0.4em] mb-4 drop-shadow-sm transition-colors duration-500 ${isDark ? 'text-white/50' : 'text-slate-500/80'}`}>{dateString}</span>
                        <h1 className={`text-[5rem] md:text-[8rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${isDark ? 'from-white via-white/90 to-white/20' : 'from-slate-800 via-slate-600 to-slate-400'} select-none transition-colors duration-500 px-4`} style={{ textShadow: isDark ? '0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.05)' }}>
                            {timeString}
                        </h1>
                    </div>

                    <button
                        onClick={() => openOmnibox('')}
                        className={`group relative w-[90%] max-w-2xl backdrop-blur-3xl border rounded-[2rem] p-5 flex items-center gap-4 transition-all duration-500 hover:scale-[1.02] ${isDark ? 'bg-black/40 border-white/10 hover:border-accent/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_80px_var(--accent-20)]' : 'bg-white/60 border-black/5 hover:border-accent/40 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_80px_var(--accent-20)]'}`}
                    >
                        <Search size={22} className={`transition-colors ${isDark ? 'text-white/40 group-hover:text-accent' : 'text-slate-400 group-hover:text-accent'}`} />
                        <span className={`text-lg font-medium transition-colors flex-1 text-left ${isDark ? 'text-white/30 group-hover:text-white/80' : 'text-slate-400 group-hover:text-slate-700'}`}>Search the web, or type a command...</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-inner transition-colors ${isDark ? 'bg-white/5 border-white/10 group-hover:bg-accent/10 group-hover:border-accent/30' : 'bg-black/5 border-black/5 group-hover:bg-accent/10 group-hover:border-accent/30'}`}>
                            <Command size={12} className={`transition-colors ${isDark ? 'text-white/60 group-hover:text-accent' : 'text-slate-500 group-hover:text-accent'}`} />
                            <span className={`text-xs font-bold transition-colors ${isDark ? 'text-white/60 group-hover:text-accent' : 'text-slate-500 group-hover:text-accent'}`}>K</span>
                        </div>
                    </button>

                </div>
            </div>
        );
    };

    return (
        <main className={`flex-1 relative z-10 flex flex-col overflow-hidden transform-gpu transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}>
            
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
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-32 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Moon size={16} className="text-accent" /> Smart Dark Mode
                        </div>
                        <button onClick={() => setIsForceDark(!isForceDark)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ${isForceDark ? 'bg-accent' : 'bg-white/20'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isForceDark ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                    <div className="p-4 bg-black/20">
                        <span className="text-xs font-bold uppercase text-white/40 tracking-wider mb-2 block">Site List (One per line)</span>
                        <textarea 
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white/80 resize-none outline-none focus:border-accent transition-colors"
                            value={darkExclusions.join('\n')}
                            onChange={(e) => {
                                const newExclusions = e.target.value.split('\n').map(d => d.trim()).filter(d => d.length > 0);
                                setDarkExclusions(newExclusions);
                            }}
                            placeholder="example.com\ngithub.com"
                        />
                    </div>
                </div>
            )}

            {(activePopover === 'adblock' || (isPopoverClosing && activePopover === 'adblock')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-12 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
                    <div className={`p-5 flex flex-col items-center justify-center border-b border-white/10 transition-colors duration-500 ${isAdblockActive ? 'bg-green-500/10' : 'bg-transparent'}`}>
                        <ShieldAlert size={40} className={`mb-2 drop-shadow-md transition-colors ${isAdblockActive ? 'text-green-400' : 'text-white/20'}`} strokeWidth={1.5} />
                        <span className={`text-3xl font-black tracking-tight ${isAdblockActive ? 'text-white' : 'text-white/40'}`}>{isAdblockActive ? adblockStats.count : '0'}</span>
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
                            {adblockStats.domains.length === 0 && <div className="text-center text-white/40 py-2">No trackers blocked yet</div>}
                            {adblockStats.domains.map((domain, i) => (
                                <div key={i} className="flex justify-between"><span className="text-white/60 truncate mr-2">{domain}</span><span className="text-red-400 flex-shrink-0">Blocked</span></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(activePopover === 'downloads' || (isPopoverClosing && activePopover === 'downloads')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-6 z-[60] w-80 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
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
                <div onClick={e => e.stopPropagation()} className={`absolute top-16 right-6 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
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

            <div className={`flex-1 w-full relative overflow-hidden transition-colors duration-700 ease-in-out flex ${isForceDark || isIncognito ? 'text-white' : 'text-black'} ${isFullscreen ? '' : 'px-4 pb-0 pt-2'}`}>
                <div className={`relative w-full h-full overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex ${isFullscreen ? 'rounded-none border-none' : 'rounded-[2rem] border border-white/20'} ${isForceDark || isIncognito ? 'bg-black/60 backdrop-blur-3xl' : 'bg-white/60 backdrop-blur-3xl'}`}>
                    <div className={`relative h-full overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSplitView ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
                    <div className="absolute inset-y-0 left-0 w-[300%] flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ transform: activeSpace === 'personal' ? 'translateX(0)' : activeSpace === 'work' ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}>

                        {/* PRYWATNE */}
                        <div className="w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative">
                            {isPrywatneEmpty ? renderZenDashboard() : (
                                <>
                                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                                    <WebViewContainer space="personal" />
                                </>
                            )}
                        </div>

                        {/* PRACA */}
                        <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                            {isPracaEmpty ? renderZenDashboard() : (
                                <>
                                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                                    <WebViewContainer space="work" />
                                </>
                            )}
                        </div>

                        {/* GHOST */}
                        <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                            {isGhostEmpty ? renderZenDashboard() : (
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
