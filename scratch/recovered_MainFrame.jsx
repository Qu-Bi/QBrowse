import React, { useState, useEffect, useRef } from 'react';
import { 
    Command, Search, ChevronUp, ChevronDown, X, Moon, Trash2, 
    ShieldAlert, Download, Cpu, Pause, XCircle, FolderOpen, 
    Music, SkipBack, SkipForward, ExternalLink, Maximize, WifiOff, Lock, 
    RefreshCw, Ghost, MonitorPlay, ShieldCheck, Zap, Shield, Globe
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
    
    // QVault logic
    const isVaultUnlocked = useUIStore(state => state.isVaultUnlocked);
    const unlockVault = useUIStore(state => state.unlockVault);
    const lockVault = useUIStore(state => state.lockVault);
    const vaultError = useUIStore(state => state.vaultError);
    const vaultPasswords = useUIStore(state => state.vaultPasswords);
    const addNewPassword = useUIStore(state => state.addNewPassword);
    
    const [vaultInput, setVaultInput] = useState('');
    const [isAddingPassword, setIsAddingPassword] = useState(false);
    const [newPwdTitle, setNewPwdTitle] = useState('');
    const [newPwdUsername, setNewPwdUsername] = useState('');
    const [newPwdPlaintext, setNewPwdPlaintext] = useState('');
    const [newPwdUrl, setNewPwdUrl] = useState('');
    
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

    const renderZenDashboard = () => {
        const isDark = isForceDark || isIncognito;
        const hour = currentTime.getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden animate-pop-in z-10 w-full h-full">
                <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--accent-30),transparent_60%)] ${isDark ? 'opacity-40' : 'opacity-20 mix-blend-multiply'} animate-pulse pointer-events-none`} style={{ animationDuration: '8s' }}></div>
                <div className={`absolute top-0 left-0 right-0 h-64 bg-gradient-to-b ${isDark ? 'from-black/20' : 'from-white/40'} to-transparent pointer-events-none`}></div>

                <div className="relative z-10 flex flex-col items-center transition-transform duration-200 w-full" style={{ transform: `scale(${zoomLevel / 100})` }}>
                    <div className="flex flex-col items-center mb-10 md:mb-14">
                        <span className={`text-xs md:text-sm font-bold uppercase tracking-[0.4em] mb-4 drop-shadow-sm transition-colors duration-200 ${isDark ? 'text-white/50' : 'text-slate-500/80'}`}>{dateString}</span>
                        <h1 className={`text-[6rem] md:text-[9rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${isDark ? 'from-white via-white/90 to-white/20' : 'from-slate-800 via-slate-600 to-slate-400'} select-none transition-colors duration-200`} style={{ textShadow: isDark ? '0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.05)' }}>
                            {timeString}
                        </h1>
                        <span className={`text-sm font-medium mt-4 tracking-widest transition-colors duration-200 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{greeting}, Admin</span>
                    </div>

                    <button
                        onClick={() => openOmnibox('')}
                        className={`group relative w-[90%] max-w-2xl backdrop-blur-3xl border rounded-[2rem] p-5 flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] ${isDark ? 'bg-black/40 border-white/10 hover:border-accent/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_80px_var(--accent-20)]' : 'bg-white/60 border-black/5 hover:border-accent/40 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_80px_var(--accent-20)]'}`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent ${isDark ? 'via-white/5' : 'via-black/5'} to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] rounded-[2rem] overflow-hidden`}></div>
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
        <main className={`flex-1 flex flex-col h-screen overflow-hidden transform-gpu transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${isForceDark || isIncognito ? 'bg-[#121214]' : 'bg-[#fafafa]'}`}>
            <TopBar />

            {/* Find popup */}
            <div className={`absolute top-20 right-8 z-[200] bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex items-center p-2 transition-all duration-200 origin-top-right ${isFindOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
                <Search size={14} className="text-white/40 ml-2" />
                <input ref={findInputRef} type="text" value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder="Find in page..." className="bg-transparent border-none outline-none text-white text-sm px-3 py-1 w-48" />
                <span className="text-xs text-white/30 mr-3">0/0</span>
                <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                    <button className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition"><ChevronUp size={16} /></button>
                    <button className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition"><ChevronDown size={16} /></button>
                    <button onClick={() => setIsFindOpen(false)} className="p-1.5 text-white/40 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition ml-1"><X size={16} /></button>
                </div>
            </div>

            {/* Popovers */}
            {(activePopover === 'adblock' || (isPopoverClosing && activePopover === 'adblock')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-20 right-12 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-slide-down'}`}>
                    <div className={`p-5 flex flex-col items-center justify-center border-b border-white/10 transition-colors duration-200 ${isAdblockActive ? 'bg-green-500/10' : 'bg-transparent'}`}>
                        <ShieldAlert size={40} className={`mb-2 drop-shadow-md transition-colors ${isAdblockActive ? 'text-green-400' : 'text-white/20'}`} strokeWidth={1.5} />
                        <span className={`text-3xl font-black tracking-tight ${isAdblockActive ? 'text-white' : 'text-white/40'}`}>{isAdblockActive ? '12' : '0'}</span>
                        <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest mt-1">Blocked Trackers</span>
                    </div>
                    <div className="p-4 bg-black/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white/90">Native Interceptor</span>
                            <button onClick={() => setIsAdblockActive(!isAdblockActive)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-200 ${isAdblockActive ? 'bg-green-500' : 'bg-white/20'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${isAdblockActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                        <div className={`flex flex-col gap-1.5 text-[10px] font-mono transition-opacity duration-200 ${isAdblockActive ? 'opacity-100' : 'opacity-30'}`}>
                            <div className="flex justify-between"><span className="text-white/60">doubleclick.net</span><span className="text-red-400">Blocked</span></div>
                            <div className="flex justify-between"><span className="text-white/60">google-analytics.com</span><span className="text-red-400">Blocked</span></div>
                        </div>
                    </div>
                </div>
            )}

            {(activePopover === 'downloads' || (isPopoverClosing && activePopover === 'downloads')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-20 right-6 z-[60] w-80 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-slide-down'}`}>
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
                <div onClick={e => e.stopPropagation()} className={`absolute top-20 right-6 z-[60] w-72 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white ${isPopoverClosing ? 'animate-pop-out' : 'animate-slide-down'}`}>
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

            {(activePopover === 'vault' || (isPopoverClosing && activePopover === 'vault')) && (
                <div onClick={e => e.stopPropagation()} className={`absolute top-20 right-6 z-[60] w-80 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-white transition-all duration-200 origin-top-right ${isPopoverClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-pop-in'}`}>
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-accent/5"></div>
                        <div className="flex items-center gap-2 font-bold text-sm text-white relative z-10">
                            <Shield size={16} className="text-accent" />
                            QVault
                        </div>
                        {isVaultUnlocked && <button onClick={lockVault} className="text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition relative z-10">Lock</button>}
                    </div>

                    <div className="relative w-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden" style={{ height: !isVaultUnlocked ? 260 : (isAddingPassword ? 280 : 380) }}>
                        
                        {/* LOCKED VIEW */}
                        <div className={`absolute inset-0 w-full flex flex-col transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isVaultUnlocked ? '-translate-y-12 opacity-0 pointer-events-none scale-95' : 'translate-y-0 opacity-100 scale-100'}`}>
                            <div className="p-6 flex flex-col items-center justify-center gap-4 h-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full"></div>
                                <ShieldCheck size={40} className="text-accent mb-2 drop-shadow-[0_0_15px_var(--accent-30)] animate-pulse" />
                                <span className="text-base font-bold text-white text-center leading-relaxed">
                                    QVault Locked<br/>
                                    <span className="text-white/50 text-xs font-normal">Enter your master password.</span>
                                </span>
                                {vaultError && <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 animate-pop-in">{vaultError}</span>}
                                <form className="w-full flex flex-col gap-3 mt-auto relative z-10" onSubmit={(e) => { e.preventDefault(); unlockVault(vaultInput); setVaultInput(''); }}>
                                    <input type="password" value={vaultInput} onChange={e => setVaultInput(e.target.value)} placeholder="Master Password..." className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-accent outline-none transition-all shadow-inner focus:shadow-[0_0_20px_var(--accent-20)]" />
                                    <button type="submit" className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3 rounded-xl transition-all shadow-[0_5px_15px_var(--accent-30)] hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2">
                                        Unlock Vault <Lock size={14} />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* ADD PASSWORD VIEW */}
                        <div className={`absolute inset-0 w-full flex flex-col transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${(!isVaultUnlocked || !isAddingPassword) ? 'translate-x-12 opacity-0 pointer-events-none scale-95' : 'translate-x-0 opacity-100 scale-100'}`}>
                            <div className="p-4 flex flex-col gap-3 h-full">
                                <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Add New Password</span>
                                <input type="text" value={newPwdTitle} onChange={e => setNewPwdTitle(e.target.value)} placeholder="Title (e.g. GitHub)" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none transition" />
                                <input type="text" value={newPwdUsername} onChange={e => setNewPwdUsername(e.target.value)} placeholder="Username / Email" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none transition" />
                                <input type="password" value={newPwdPlaintext} onChange={e => setNewPwdPlaintext(e.target.value)} placeholder="Password" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none transition" />
                                <input type="text" value={newPwdUrl} onChange={e => setNewPwdUrl(e.target.value)} placeholder="Website URL" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none transition" />
                                <div className="flex gap-2 mt-auto">
                                    <button onClick={() => setIsAddingPassword(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium text-xs py-2 rounded-xl transition">Cancel</button>
                                    <button onClick={() => {
                                        addNewPassword(newPwdTitle, newPwdUsername, newPwdPlaintext, newPwdUrl).then(() => {
                                            setIsAddingPassword(false);
                                            setNewPwdTitle(''); setNewPwdUsername(''); setNewPwdPlaintext(''); setNewPwdUrl('');
                                        });
                                    }} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-medium text-xs py-2 rounded-xl transition">Save</button>
                                </div>
                            </div>
                        </div>

                        {/* PASSWORD LIST VIEW */}
                        <div className={`absolute inset-0 w-full flex flex-col transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] delay-75 ${(!isVaultUnlocked || isAddingPassword) ? 'translate-x-12 opacity-0 pointer-events-none scale-95' : 'translate-x-0 opacity-100 scale-100'}`}>
                            <div className="p-3 border-b border-white/10">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                    <input type="text" placeholder="Search passwords..." className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-white/30 focus:border-blue-400/50 outline-none transition" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 h-[280px] overflow-y-auto hide-scroll p-2">
                                {vaultPasswords.length === 0 ? (
                                    <div className="p-4 flex items-center justify-center h-full">
                                        <span className="text-xs text-white/40">No passwords stored yet.</span>
                                    </div>
                                ) : vaultPasswords.map((pwd, index) => (
                                    <div key={pwd.id} 
                                         className="p-3 mb-1 bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md hover:scale-[1.01]">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-9 h-9 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center text-white flex-shrink-0 shadow-inner group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-colors">
                                                {pwd.url ? <img src={`https://www.google.com/s2/favicons?sz=64&domain=${pwd.url}`} className="w-5 h-5 drop-shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} /> : <ShieldCheck size={16} className="text-blue-400" />}
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm font-bold text-white/90 truncate group-hover:text-blue-400 transition-colors">{pwd.title}</span>
                                                <span className="text-[11px] text-white/40 font-mono mt-0.5 truncate">{pwd.username}</span>
                                            </div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 p-2 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-all shadow-sm scale-90 group-hover:scale-100" title="Autofill"><Zap size={14} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-2 bg-black/40 border-t border-white/10 flex justify-between gap-2 mt-auto">
                                <button onClick={() => setIsAddingPassword(true)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-xs font-semibold transition border border-transparent hover:border-white/10">+ Add Password</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* THE WEBVIEW TILE */}
            <div className={`flex-1 flex text-white relative overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] bg-transparent shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isFullscreen ? 'm-0 rounded-none border-none z-[100]' : 'mx-4 mb-4 mt-[72px] rounded-[2rem] border border-black/10 dark:border-white/20'}`}>
                <div className={`relative h-full overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSplitView ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
                    <div className="absolute inset-y-0 left-0 w-[300%] flex transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ transform: activeSpace === 'prywatne' ? 'translateX(0)' : activeSpace === 'praca' ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}>

                        {/* PRYWATNE */}
                        <div className="w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative bg-white dark:bg-[#0a0a0c]">
                            {currentUrl === '' ? renderZenDashboard() : (
                                <>
                                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                                    <WebViewContainer space="prywatne" />
                                </>
                            )}
                        </div>

                        {/* PRACA */}
                        <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative bg-white dark:bg-[#0a0a0c] ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                            {currentUrl === '' ? renderZenDashboard() : (
                                <>
                                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                                    <WebViewContainer space="praca" />
                                </>
                            )}
                        </div>

                        {/* GHOST */}
                        <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative bg-white dark:bg-[#0a0a0c] ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                            {currentUrl === '' ? renderZenDashboard() : (
                                <>
                                    <WebViewContainer space="ghost" />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] h-full overflow-hidden flex flex-col items-center justify-center relative ${isSplitView ? 'w-1/2 opacity-100' : 'w-0 opacity-0'} bg-white dark:bg-[#0a0a0c]`}>
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