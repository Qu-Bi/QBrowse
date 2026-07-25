import React, { useState, useEffect, useRef } from 'react';
import { 
    Command, Search, ChevronUp, ChevronDown, X, Moon, Trash2, 
    ShieldAlert, Download, Cpu, Pause, XCircle, FolderOpen, 
    Music, SkipBack, SkipForward, ExternalLink, Maximize, WifiOff, 
    RefreshCw, Ghost, MonitorPlay, ShieldCheck, Zap, Check, FileText, ArrowLeftRight, Globe
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import TopBar from './TopBar';
import WebViewContainer from './WebViewContainer';
import QVaultPopover from '../popovers/QVaultPopover';
import SiteInfoPopover from '../popovers/SiteInfoPopover';
import UserProfilePopover from '../popovers/UserProfilePopover';
import MediaPlayerPopover from '../common/MediaPlayerPopover';

const DownloadPopup = () => {
    const downloads = useUIStore(state => state.downloads);
    const activeDownloadPopup = useUIStore(state => state.activeDownloadPopup);
    const setActiveDownloadPopup = useUIStore(state => state.setActiveDownloadPopup);

    const [popupData, setPopupData] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    const activePopupDownload = downloads.find(d => d.id === activeDownloadPopup);

    useEffect(() => {
        if (activePopupDownload) {
            setPopupData(activePopupDownload);
            setIsClosing(false);
        } else if (popupData && !isClosing) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setPopupData(null);
                setIsClosing(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [activeDownloadPopup, activePopupDownload]);

    if (!popupData) return null;

    const handleClose = (e) => {
        if (e) e.stopPropagation();
        setActiveDownloadPopup(null);
    };

    return (
        <div className={`absolute top-4 right-4 w-[330px] rounded-2xl bg-[#0c0d0f]/60 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[70000] p-4 text-white overflow-hidden ${isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'}`}>
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                    {popupData.state === 'completed' ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <Check size={11} strokeWidth={3} />
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center border border-accent/30 animate-pulse">
                            <Download size={11} strokeWidth={3} />
                        </div>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${popupData.state === 'completed' ? 'text-emerald-400' : 'text-accent'}`}>
                        {popupData.state === 'completed' ? 'Download Complete' : 'Downloading'}
                    </span>
                </div>
                <button onClick={handleClose} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <X size={12} />
                </button>
            </div>

            {/* Body */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 shrink-0">
                    <FileText size={18} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white/90 truncate" title={popupData.fileName}>{popupData.fileName}</span>
                    <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono mt-0.5">
                        <span>
                            {popupData.state === 'progressing' 
                                ? `${((popupData.receivedBytes || 0) / 1024 / 1024).toFixed(1)} / ${((popupData.totalBytes || 1) / 1024 / 1024).toFixed(1)} MB`
                                : `${((popupData.totalBytes || popupData.receivedBytes || 0) / 1024 / 1024).toFixed(1)} MB`
                            }
                        </span>
                        {popupData.state === 'progressing' && popupData.speedBytesPerSec > 0 && (
                            <span className="text-accent font-semibold">
                                • {((popupData.speedBytesPerSec || 0) / 1024 / 1024).toFixed(1)} MB/s
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar (if active) */}
            {popupData.state === 'progressing' && (
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mt-3 relative">
                    <div className="h-full bg-accent rounded-full shadow-[0_0_10px_var(--accent)] transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, ((popupData.receivedBytes || 0) / (popupData.totalBytes || 1)) * 100))}%` }}></div>
                </div>
            )}

            {/* Action Buttons (if completed) */}
            {popupData.state === 'completed' && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => window.electronAPI.showItemInFolder(popupData.savePath)} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition" title="Show in folder">
                        <FolderOpen size={13} /> Folder
                    </button>
                    <button onClick={() => window.electronAPI.openFile(popupData.savePath)} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-accent hover:brightness-110 text-white text-xs font-semibold transition shadow-md shadow-accent/20" title="Open file">
                        <ExternalLink size={13} /> Open
                    </button>
                </div>
            )}
        </div>
    );
};

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
    const isSwipeEnabled = useUIStore(state => state.isSwipeEnabled);
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
    const isPrywatneEmpty = privateTabs.find(t => t.active)?.url === '' || privateTabs.find(t => t.active)?.url === 'about:blank';
    const isPracaEmpty = workTabs.find(t => t.active)?.url === '' || workTabs.find(t => t.active)?.url === 'about:blank';
    const isGhostEmpty = ghostTabs.find(t => t.active)?.url === '' || ghostTabs.find(t => t.active)?.url === 'about:blank';
    
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
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-inner transition-colors duration-300 ${isDark ? 'bg-white/5 border-white/10 group-hover:bg-accent/10 group-hover:border-accent/30' : 'bg-black/5 border-black/5 group-hover:bg-accent/10 group-hover:border-accent/30'}`}>
                            <Command size={12} className={`transition-colors ${isDark ? 'text-white/60 group-hover:text-accent' : 'text-slate-500 group-hover:text-accent'}`} />
                            <span className={`text-xs font-bold transition-colors ${isDark ? 'text-white/60 group-hover:text-accent' : 'text-slate-500 group-hover:text-accent'}`}>K</span>
                        </div>
                    </button>

                </div>
            </div>
        );
    };

    const splitRightTabId = useUIStore(state => state.splitRightTabId);
    const setSplitRightTabId = useUIStore(state => state.setSplitRightTabId);
    const focusedPane = useUIStore(state => state.focusedPane);
    const setFocusedPane = useUIStore(state => state.setFocusedPane);
    const splitRatio = useUIStore(state => state.splitRatio);
    const setSplitRatio = useUIStore(state => state.setSplitRatio);
    const toggleSplitView = useUIStore(state => state.toggleSplitView);

    const [splitSearchUrl, setSplitSearchUrl] = useState('');
    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    const mainContainerRef = useRef(null);
    const leftPaneRef = useRef(null);
    const rightPaneRef = useRef(null);
    const currentRatioRef = useRef(splitRatio);

    const spaceTabs = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : ghostTabs);
    const activeLeftTab = spaceTabs.find(t => t.active);
    const rightTab = isSplitView && splitRightTabId ? spaceTabs.find(t => t.id === splitRightTabId) : null;
    const availableRightTabs = spaceTabs.filter(t => t.id !== activeLeftTab?.id);

    const handleSplitMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingSplit(true);
    };

    useEffect(() => {
        if (!isDraggingSplit) return;
        let animationFrameId = null;

        const handleMouseMove = (e) => {
            if (!mainContainerRef.current) return;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                const rect = mainContainerRef.current.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const newRatio = Math.min(80, Math.max(20, (offsetX / rect.width) * 100));
                
                currentRatioRef.current = newRatio;
                if (leftPaneRef.current) leftPaneRef.current.style.width = `${newRatio}%`;
                if (rightPaneRef.current) rightPaneRef.current.style.width = `${100 - newRatio}%`;
            });
        };

        const handleMouseUp = () => {
            setIsDraggingSplit(false);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (currentRatioRef.current !== null) {
                setSplitRatio(currentRatioRef.current);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isDraggingSplit, setSplitRatio]);

    const handleSwapPanes = (e) => {
        if (e) e.stopPropagation();
        if (!isSplitView || !activeLeftTab) return;
        if (rightTab) {
            const oldLeftId = activeLeftTab.id;
            const oldRightId = rightTab.id;
            useTabStore.getState().handleSwitchToTab(oldRightId, activeSpace);
            setSplitRightTabId(oldLeftId);
        }
    };

    const handleOpenSplitUrl = (e) => {
        e.preventDefault();
        if (!splitSearchUrl.trim()) return;
        let url = splitSearchUrl.trim();
        if (!url.includes('://') && !url.startsWith('about:')) {
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        const newTab = useTabStore.getState().addTab({
            id: 't-' + Date.now(),
            title: url.replace(/^https?:\/\//, ''),
            url,
            active: false,
            folderId: null
        });
        setSplitRightTabId(newTab.id);
        setSplitSearchUrl('');
    };

    return (
        <main className={`flex-1 min-w-0 relative z-10 flex flex-col overflow-hidden transform-gpu transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}>
            
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

            {(activePopover === 'siteinfo' || (isPopoverClosing && activePopover === 'siteinfo')) && (
                <SiteInfoPopover isClosing={isPopoverClosing} />
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

            {(activePopover === 'media' || (isPopoverClosing && activePopover === 'media')) && (
                <MediaPlayerPopover />
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

            <div ref={mainContainerRef} className={`flex-1 min-w-0 relative overflow-hidden transition-colors duration-700 ease-in-out flex ${isForceDark || isIncognito ? 'text-white' : 'text-black'} ${isFullscreen ? '' : 'pb-0 pt-2'}`}>
                <div className={`relative w-full h-full overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-[background-color,border] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex ${isFullscreen ? 'rounded-none border-none' : 'rounded-[2rem] border border-white/20'} ${isForceDark || isIncognito ? 'bg-black/60 backdrop-blur-3xl' : 'bg-white/60 backdrop-blur-3xl'}`}>
                    <DownloadPopup />
                    {(activePopover === 'vault' || (isPopoverClosing && activePopover === 'vault')) && (
                        <QVaultPopover isClosing={isPopoverClosing} />
                    )}
                    {(activePopover === 'user' || (isPopoverClosing && activePopover === 'user')) && (
                        <UserProfilePopover isClosing={isPopoverClosing} />
                    )}
                    {(activePopover || isPopoverClosing) && (
                        <div className={`absolute inset-0 z-[50] transition-colors duration-200 ${isPopoverClosing ? 'bg-transparent' : 'bg-black/60'}`} onClick={closePopover} />
                    )}

                    {/* LEFT PANE CONTAINER */}
                    <div 
                        ref={leftPaneRef}
                        onClick={() => setFocusedPane('left')}
                        className={`relative h-full overflow-hidden ${
                            isDraggingSplit ? 'pointer-events-none select-none' : 'transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
                        }`}
                        style={{ width: isSplitView ? `${splitRatio}%` : '100%' }}
                    >
                        <div className={`absolute inset-y-0 left-0 w-[300%] flex ${isSwipeEnabled !== false ? 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'transition-none'}`}
                            style={{ transform: activeSpace === 'personal' ? 'translateX(0)' : activeSpace === 'work' ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}>

                            {/* PRYWATNE */}
                            <div className="w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative">
                                {isPrywatneEmpty && <div key="dash">{renderZenDashboard()}</div>}
                                <div key="bg" className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px', opacity: isPrywatneEmpty ? 1 : 0.2 }}></div>
                                <div key="wv" className={`absolute inset-0 transition-opacity duration-300 ${isPrywatneEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <WebViewContainer space="personal" />
                                </div>
                            </div>

                            {/* PRACA */}
                            <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                                {isPracaEmpty && <div key="dash">{renderZenDashboard()}</div>}
                                <div key="bg" className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px', opacity: isPracaEmpty ? 1 : 0.2 }}></div>
                                <div key="wv" className={`absolute inset-0 transition-opacity duration-300 ${isPracaEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <WebViewContainer space="work" />
                                </div>
                            </div>

                            {/* GHOST */}
                            <div className={`w-1/3 flex-shrink-0 h-full flex flex-col items-center justify-center relative ${isForceDark || isIncognito ? 'text-white' : 'text-black'}`}>
                                {isGhostEmpty && <div key="dash">{renderZenDashboard()}</div>}
                                <div key="bg" className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px', opacity: isGhostEmpty ? 1 : 0.2 }}></div>
                                <div key="wv" className={`absolute inset-0 transition-opacity duration-300 ${isGhostEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <WebViewContainer space="ghost" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FULLSCREEN MOUSE TRAP OVERLAY DURING DRAGGING */}
                    {isDraggingSplit && (
                        <div className="fixed inset-0 z-[99999] cursor-col-resize select-none bg-transparent" />
                    )}

                    {/* RESIZABLE SPLITTER HANDLE (Zero-width floating hairline) */}
                    {isSplitView && (
                        <div 
                            onMouseDown={handleSplitMouseDown}
                            className="relative w-0 h-full z-40 flex items-center justify-center cursor-col-resize group shrink-0"
                            title="Drag to resize split panes"
                        >
                            {/* Sleek 1px Hairline */}
                            <div className={`absolute top-0 bottom-0 w-[1px] pointer-events-none transition-colors ${
                                isDraggingSplit 
                                    ? 'bg-accent shadow-[0_0_10px_var(--accent)]' 
                                    : (isForceDark || isIncognito ? 'bg-white/10 group-hover:bg-accent' : 'bg-black/10 group-hover:bg-accent')
                            }`} />

                            {/* Floating Grab Pill Handle */}
                            <div className={`absolute w-4 h-10 rounded-full border flex items-center justify-center transition-all duration-200 shadow-xl cursor-col-resize ${
                                isDraggingSplit 
                                    ? 'bg-accent border-accent text-white scale-110 shadow-[0_0_20px_var(--accent)]' 
                                    : (isForceDark || isIncognito
                                        ? 'bg-[#18181b] border-white/20 text-white/50 group-hover:text-white group-hover:border-accent group-hover:bg-accent/20 group-hover:scale-105'
                                        : 'bg-white border-black/10 text-gray-400 group-hover:text-accent group-hover:border-accent group-hover:bg-white group-hover:scale-105')
                            }`}>
                                <div className="flex flex-col gap-0.5 items-center pointer-events-none">
                                    <div className="w-1 h-1 rounded-full bg-current opacity-80" />
                                    <div className="w-1 h-1 rounded-full bg-current opacity-80" />
                                    <div className="w-1 h-1 rounded-full bg-current opacity-80" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RIGHT PANE CONTAINER */}
                    <div 
                        ref={rightPaneRef}
                        onClick={() => setFocusedPane('right')}
                        className={`relative h-full overflow-hidden flex flex-col ${
                            isDraggingSplit 
                                ? 'pointer-events-none select-none' 
                                : 'transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
                        } ${isSplitView ? 'opacity-100' : 'w-0 opacity-0 pointer-events-none'} ${
                            isForceDark || isIncognito ? 'bg-[#0a0a0c]' : 'bg-[#f0f0f0]'
                        }`}
                        style={{ width: isSplitView ? `${100 - splitRatio}%` : '0%' }}
                    >
                            {rightTab ? (
                                <div className="relative w-full h-full flex flex-col">
                                    {/* Right Pane Overlay Controls */}
                                    <div className="h-8 bg-black/40 border-b border-white/10 px-3 flex items-center justify-between text-white text-xs z-30 shrink-0 backdrop-blur-md">
                                        <div className="flex items-center gap-2 truncate max-w-[60%]">
                                            {rightTab.url ? (
                                                <img src={`https://www.google.com/s2/favicons?sz=32&domain=${rightTab.url}`} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" onError={e=>e.target.style.display='none'} />
                                            ) : (
                                                <Globe size={13} className="text-white/50" />
                                            )}
                                            <span className="font-semibold truncate text-[11px]">{rightTab.title}</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button onClick={handleSwapPanes} className="p-1 hover:bg-white/10 rounded-md transition text-white/70 hover:text-white" title="Swap Left/Right Panes">
                                                <ArrowLeftRight size={12} />
                                            </button>
                                            <button onClick={() => setSplitRightTabId(null)} className="p-1 hover:bg-white/10 rounded-md transition text-white/70 hover:text-white" title="Change Right Tab">
                                                <Search size={12} />
                                            </button>
                                            <button onClick={() => toggleSplitView()} className="p-1 hover:bg-red-500/20 text-white/70 hover:text-red-400 rounded-md transition" title="Close Split View">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Pane Webview */}
                                    <div className="relative flex-1 w-full h-full">
                                        <WebViewContainer space={activeSpace} targetTabId={splitRightTabId} isSplitPane={true} />
                                    </div>
                                </div>
                            ) : (
                                /* Split Screen Launcher / Picker */
                                <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center overflow-y-auto relative z-10">
                                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] pointer-events-none z-0 ${isForceDark || isIncognito ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px' }}></div>
                                    
                                    <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-pop-in">
                                        <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent mb-4 shadow-lg shadow-accent/10">
                                            <MonitorPlay size={28} strokeWidth={2} />
                                        </div>
                                        <h2 className={`text-xl font-bold tracking-tight mb-1 ${isForceDark || isIncognito ? 'text-white' : 'text-gray-800'}`}>Split Screen View</h2>
                                        <p className="text-xs text-white/50 mb-6">Select an open tab or enter a URL to view side-by-side</p>

                                        {/* URL Input Form */}
                                        <form onSubmit={handleOpenSplitUrl} className="w-full mb-6 relative">
                                            <input 
                                                type="text"
                                                placeholder="Search or enter URL for Right Pane..."
                                                value={splitSearchUrl}
                                                onChange={e => setSplitSearchUrl(e.target.value)}
                                                className="w-full h-10 pl-4 pr-10 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 outline-none focus:border-accent transition-colors shadow-inner"
                                            />
                                            <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-accent text-white rounded-lg hover:brightness-110 transition shadow-sm">
                                                <Search size={12} />
                                            </button>
                                        </form>

                                        {/* Available Tabs List */}
                                        <div className="w-full flex flex-col gap-2 max-h-60 overflow-y-auto hide-scroll pr-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 text-left mb-1">Open Tabs in this Space</span>
                                            {availableRightTabs.length === 0 ? (
                                                <div className="text-center text-xs text-white/30 italic py-4 bg-white/5 rounded-xl border border-white/5">
                                                    No other open tabs. Type a URL above to open a split tab!
                                                </div>
                                            ) : (
                                                availableRightTabs.map(t => (
                                                    <div 
                                                        key={t.id} 
                                                        onClick={() => setSplitRightTabId(t.id)}
                                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/40 cursor-pointer transition-all group"
                                                    >
                                                        <div className="flex items-center gap-3 truncate min-w-0">
                                                            {t.url ? (
                                                                <img src={`https://www.google.com/s2/favicons?sz=32&domain=${t.url}`} className="w-4 h-4 rounded-sm flex-shrink-0" onError={e=>e.target.style.display='none'} />
                                                            ) : (
                                                                <Globe size={14} className="text-white/40" />
                                                            )}
                                                            <div className="flex flex-col text-left truncate">
                                                                <span className="text-xs font-semibold text-white/90 group-hover:text-white truncate">{t.title}</span>
                                                                {t.url && <span className="text-[10px] text-white/40 font-mono truncate">{t.url}</span>}
                                                            </div>
                                                        </div>
                                                        <button className="px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/30 text-accent group-hover:bg-accent group-hover:text-white text-[10px] font-bold transition">
                                                            Open Side
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
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
