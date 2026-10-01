import React, { useState, useEffect } from 'react';
import { PanelLeft, Lock, Search, X, RefreshCw, SplitSquareHorizontal, Moon, Sun, ShieldCheck, Download, Music, ChevronLeft, ChevronRight, ArrowLeftRight, User, BookOpen, Leaf, Gauge, Zap, Cpu } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useSyncStore from '../../store/useSyncStore';
import useTorStore from '../../store/useTorStore';
import { onGlobalNavigateBack, onGlobalNavigateForward } from '../../services/electronIPC';
import { formatCompactNumber } from '../../utils/formatters';

function formatDisplayUrl(rawUrl) {
    if (!rawUrl || rawUrl === 'about:blank') return '';
    if (rawUrl.startsWith('qbrowse://') || rawUrl.startsWith('chrome://') || rawUrl.startsWith('about:')) return rawUrl;
    if (rawUrl.startsWith('file://')) {
        try {
            const decoded = decodeURIComponent(rawUrl.replace(/^file:\/\/\/?/, ''));
            return decoded.length > 45 ? '...' + decoded.slice(-42) : decoded;
        } catch (_) {
            return rawUrl;
        }
    }
    
    try {
        let urlObj;
        if (rawUrl.includes('://')) {
            urlObj = new URL(rawUrl);
        } else {
            urlObj = new URL(`https://${rawUrl}`);
        }
        
        let hostname = urlObj.hostname.replace(/^www\./i, '');
        let pathname = urlObj.pathname;
        if (pathname === '/') pathname = '';
        
        let formatted = `${hostname}${pathname}`;
        
        if (urlObj.search && formatted.length < 30) {
            const searchParams = urlObj.searchParams;
            const q = searchParams.get('q') || searchParams.get('query');
            if (q) {
                formatted += `?q=${q}`;
            } else {
                formatted += urlObj.search;
            }
        }
        
        if (formatted.length > 40) {
            formatted = formatted.substring(0, 37) + '...';
        }
        
        return formatted;
    } catch {
        return rawUrl.length > 40 ? rawUrl.substring(0, 37) + '...' : rawUrl;
    }
}

export default function TopBar() {
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const theme = useUIStore(state => state.theme);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const currentUrl = useUIStore(state => state.currentUrl);
    const isRefreshing = useUIStore(state => state.isRefreshing);
    const zoomLevel = useUIStore(state => state.zoomLevel);
    const activePopover = useUIStore(state => state.activePopover);
    const isSplitView = useUIStore(state => state.isSplitView);
    const splitRightTabId = useUIStore(state => state.splitRightTabId);
    const setSplitRightTabId = useUIStore(state => state.setSplitRightTabId);
    const focusedPane = useUIStore(state => state.focusedPane);
    const setFocusedPane = useUIStore(state => state.setFocusedPane);
    const toggleSplitView = useUIStore(state => state.toggleSplitView);
    const isAdblockActive = useUIStore(state => state.isAdblockActive);
    const adblockStats = useUIStore(state => state.adblockStats);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    
    const setIsSidebarHidden = useUIStore(state => state.setIsSidebarHidden);
    const showToast = useUIStore(state => state.showToast);
    const openOmnibox = useUIStore(state => state.openOmnibox);
    const setZoomLevel = useUIStore(state => state.setZoomLevel);
    const refresh = useUIStore(state => state.refresh);
    const setIsSplitView = useUIStore(state => state.setIsSplitView);
    const togglePopover = useUIStore(state => state.togglePopover);
    const openModal = useUIStore(state => state.openModal);
    const syncUser = useSyncStore(state => state.user);
    
    const setIsRightPanelOpen = useUIStore(state => state.setIsRightPanelOpen);
    const setRightPanelTab = useUIStore(state => state.setRightPanelTab);

    // Reader Mode
    const isReaderAvailable = useUIStore(state => state.isReaderAvailable);
    const isReaderOpen = useUIStore(state => state.isReaderOpen);
    const isReaderLoading = useUIStore(state => state.isReaderLoading);
    const toggleReaderMode = useUIStore(state => state.toggleReaderMode);

    // Performance System
    const performanceMode = useUIStore(state => state.performanceMode) || 'auto';
    const activePerformanceTier = useUIStore(state => state.activePerformanceTier) || 'balanced';
    const cyclePerformanceMode = useUIStore(state => state.cyclePerformanceMode);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];
    const torStatus = useTorStore(state => state.status);
    const torBootstrapProgress = useTorStore(state => state.bootstrapProgress);
    const torVerifiedExitIp = useTorStore(state => state.verifiedExitIp);
    const torLastError = useTorStore(state => state.lastError);

    const isIncognito = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const isBright = theme === 'light' && !isIncognito && !isTor;

    const spaceTabs = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs));
    const leftTab = isSplitView && splitRightTabId 
        ? (spaceTabs.find(t => t.active && t.id !== splitRightTabId) || spaceTabs.find(t => t.id !== splitRightTabId) || spaceTabs[0])
        : (spaceTabs.find(t => t.active) || spaceTabs[0]);
    const rightTab = isSplitView && splitRightTabId ? spaceTabs.find(t => t.id === splitRightTabId) : null;
    
    const focusedTab = (isSplitView && focusedPane === 'right' && rightTab) ? rightTab : leftTab;
    const rawUrl = focusedTab && focusedTab.url !== 'about:blank' ? focusedTab.url : '';
    const showFullUrls = useUIStore(state => state.settings?.showFullUrls);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const displayUrl = showFullUrls ? rawUrl : formatDisplayUrl(rawUrl);

    const canGoBack = focusedTab ? !!focusedTab.canGoBack : false;
    const canGoForward = focusedTab ? !!focusedTab.canGoForward : false;

    const activeTabId = focusedTab?.id;

    const handleBack = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (activeTabId) {
            const wv = document.getElementById(`webview-${activeTabId}`);
            if (wv && wv.canGoBack && wv.canGoBack()) {
                wv.goBack();
            }
        }
    };

    const handleForward = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (activeTabId) {
            const wv = document.getElementById(`webview-${activeTabId}`);
            if (wv && wv.canGoForward && wv.canGoForward()) {
                wv.goForward();
            }
        }
    };

    const handleSwapPanes = (e) => {
        if (e) e.stopPropagation();
        if (!isSplitView || !leftTab) return;
        if (rightTab) {
            // Swap active tab and right tab
            const oldLeftId = leftTab.id;
            const oldRightId = rightTab.id;
            useTabStore.getState().handleSwitchToTab(oldRightId, activeSpace);
            setSplitRightTabId(oldLeftId);
            showToast('Swapped split panes');
        }
    };

    // Global Mouse 4 / Mouse 5 & Keyboard Navigation Listeners
    useEffect(() => {
        const handleMouseUp = (e) => {
            if (e.button === 3) {
                e.preventDefault();
                handleBack();
            } else if (e.button === 4) {
                e.preventDefault();
                handleForward();
            }
        };

        const handleKeyDown = (e) => {
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                handleBack();
            } else if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                handleForward();
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);

        onGlobalNavigateBack(() => handleBack());
        onGlobalNavigateForward(() => handleForward());

        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeTabId]);

    return (
        <>
            <div className={`relative z-[60] transition-[margin,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFullscreen ? '-mt-[60px] opacity-0' : 'mt-0 opacity-100'}`}>
                {/* SINGLE BUBBLE TOPBAR */}
                <div className={`drag-region flex mt-0 mx-0 mb-2 ${uiScale === 'compact' ? 'h-[44px]' : 'h-[50px]'} z-50 items-center justify-between px-3 rounded-full transition-all ${
                    isBright ? 'liquid-glass-bright text-zinc-900' : 'liquid-glass-dark text-white'
                }`}>

                    {/* LEFT BLOCK: Zen Mode, Navigation */}
                    <div style={{ WebkitAppRegion: 'no-drag' }} className="flex-1 flex items-center justify-start gap-1.5 min-w-max z-20">
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const nextState = !isSidebarHidden;
                                setIsSidebarHidden(nextState);
                                showToast(nextState ? 'Zen Mode active' : 'Sidebar visible'); 
                            }}
                            className={`h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 group cursor-pointer ${
                                isBright 
                                    ? (isSidebarHidden ? 'bg-accent/25 border border-accent text-zinc-950 font-bold shadow-xs' : 'liquid-pill-bright') 
                                    : (isSidebarHidden ? 'bg-accent/20 border border-accent/40 text-accent shadow-xs' : 'liquid-pill-dark')
                            }`}
                            title="Zen Mode (CMD+B)"
                        >
                            <PanelLeft size={16} strokeWidth={1.9} className={`transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.4,1)] ${isSidebarHidden ? 'rotate-180 opacity-70 scale-95' : 'rotate-0 opacity-100 scale-100'}`} />
                        </button>

                        {/* Compact Segmented Navigation Pill */}
                        <div className={`flex items-center p-0.5 px-1 h-9 rounded-full transition-all flex-shrink-0 ${
                            isBright ? 'liquid-pill-bright' : 'liquid-pill-dark'
                        }`}>
                            <button 
                                onClick={handleBack} 
                                disabled={!canGoBack}
                                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                                    canGoBack 
                                        ? (isBright ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06] active:scale-90 cursor-pointer' : 'text-white/80 hover:text-white hover:bg-white/15 active:scale-90 cursor-pointer')
                                        : (isBright ? 'text-zinc-400/50 cursor-default pointer-events-none' : 'text-white/20 cursor-default pointer-events-none')
                                }`}
                                title="Back (Mouse 4 / Alt+Left)"
                            >
                                <ChevronLeft size={14} strokeWidth={2} />
                            </button>

                            <div className={`w-px h-3.5 mx-0.5 ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />

                            <button 
                                onClick={handleForward} 
                                disabled={!canGoForward}
                                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                                    canGoForward 
                                        ? (isBright ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06] active:scale-90 cursor-pointer' : 'text-white/80 hover:text-white hover:bg-white/15 active:scale-90 cursor-pointer')
                                        : (isBright ? 'text-zinc-400/50 cursor-default pointer-events-none' : 'text-white/20 cursor-default pointer-events-none')
                                }`}
                                title="Forward (Mouse 5 / Alt+Right)"
                            >
                                <ChevronRight size={14} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* CENTER BLOCK: Multi-stage Centered to Fluid URL Bar */}
                    <div style={{ WebkitAppRegion: 'no-drag' }} className="flex-shrink flex-grow-0 w-full max-w-xl min-w-[140px] z-10 mx-2 flex items-center justify-center">
                        <button
                            id="tour-omnibox-trigger"
                            onClick={() => openOmnibox(rawUrl)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const x = e.clientX + 220 > window.innerWidth ? window.innerWidth - 230 : e.clientX;
                                const y = e.clientY + 200 > window.innerHeight ? window.innerHeight - 220 : e.clientY;
                                useUIStore.getState().setTopBarContextMenu({ x, y, url: rawUrl, tabId: activeTab?.id });
                            }}
                            className={`relative w-full flex items-center justify-between px-3.5 h-9 rounded-full transition-all duration-300 group cursor-pointer min-w-0 gap-2.5 ${
                                isBright ? 'liquid-pill-bright hover:border-accent/60' : 'liquid-pill-dark hover:border-accent/50'
                            }`}
                            title={rawUrl || 'Search or enter address'}
                        >
                            {/* Refresh Progress Indicator */}
                            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                                <div className={`absolute bottom-0 left-0 h-[2px] bg-accent transition-all ease-out ${isRefreshing ? 'w-full duration-1000 opacity-100' : 'w-0 duration-0 opacity-0'}`} />
                            </div>

                            {/* Left Security Icon / Tor State Indicator */}
                            {isTor ? (
                                <div 
                                    className="relative group/tor flex items-center flex-shrink-0 z-10"
                                >
                                    <div 
                                        className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center relative select-none ${
                                            torStatus === 'connected'
                                                ? 'text-purple-400 bg-purple-500/15'
                                                : (torStatus === 'starting' || torStatus === 'downloading')
                                                ? 'text-purple-300 bg-purple-500/10 animate-pulse'
                                                : 'text-purple-400/30 opacity-60'
                                        }`}
                                    >
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover/tor:scale-110">
                                            <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                                            <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                                            <circle cx="12" cy="12" r="1.5"/>
                                        </svg>
                                        
                                        {/* Status Dot */}
                                        {torStatus === 'connected' && (
                                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                                        )}
                                        {(torStatus === 'starting' || torStatus === 'downloading') && (
                                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-300 animate-ping opacity-75" />
                                        )}
                                    </div>

                                    {/* Sleek Glassmorphic Micro-Tooltip on Hover */}
                                    <div className="absolute left-0 top-full mt-2 hidden group-hover/tor:flex flex-col gap-0.5 min-w-[170px] max-w-[240px] p-2.5 bg-[#0c0c0f]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.08)] text-left text-white z-50 pointer-events-none animate-pop-in">
                                        <div className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wide">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                torStatus === 'connected' 
                                                    ? 'bg-purple-400 shadow-[0_0_6px_#c084fc]' 
                                                    : (torStatus === 'starting' || torStatus === 'downloading')
                                                    ? 'bg-purple-300 animate-pulse'
                                                    : 'bg-purple-400/40'
                                            }`} />
                                            <span className="text-purple-300 font-mono">
                                                {torStatus === 'connected' ? 'Tor Connected' : 
                                                 (torStatus === 'starting' || torStatus === 'downloading') ? 'Connecting Tor...' :
                                                 torStatus === 'error' ? 'Tor Error' : 'Tor Offline'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-white/50 font-mono truncate pl-3">
                                            {torStatus === 'connected' ? (torVerifiedExitIp ? `Exit: ${torVerifiedExitIp}` : 'Circuit Ready') :
                                             (torStatus === 'starting' || torStatus === 'downloading') ? `Bootstrap: ${torBootstrapProgress || 0}%` :
                                             torStatus === 'error' ? (torLastError || 'Connection error') : 'Ephemeral routing inactive'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className={`p-1 rounded-lg ${isBright ? 'hover:bg-black/10' : 'hover:bg-white/20'} transition-colors z-10 cursor-pointer group/lock flex-shrink-0 relative`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePopover('siteinfo');
                                    }}
                                    title="Site Security & Permissions"
                                >
                                    {isRefreshing ? (
                                        <X size={12} className={isBright ? "text-zinc-500" : "text-gray-400"} />
                                    ) : rawUrl ? (
                                        <Lock size={12} className={`group-hover/lock:scale-110 transition-transform ${isBright ? 'text-emerald-600' : 'text-emerald-400'}`} />
                                    ) : (
                                        <Search size={13} className={isBright ? 'text-zinc-400 group-hover/lock:text-zinc-600' : 'text-white/40 group-hover/lock:text-white/70'} />
                                    )}
                                </div>
                            )}

                            {/* Center URL Text (Clean truncation, no icon overlap) */}
                            <span className={`flex-1 min-w-0 text-[13px] font-medium truncate transition-colors z-10 text-center select-none px-1 ${
                                isBright 
                                    ? (displayUrl ? 'text-zinc-800' : 'text-zinc-500 group-hover:text-zinc-700') 
                                    : (displayUrl ? 'text-white/90' : 'text-white/50 group-hover:text-white/80')
                            }`}>
                                {displayUrl || 'Search or enter address'}
                            </span>

                            {/* Right Action Icons */}
                            <div className="flex items-center gap-1.5 z-10 flex-shrink-0">
                                {/* Reader Mode Toggle Button (pops up when available or open on a valid web page) */}
                                {Boolean(rawUrl && !rawUrl.startsWith('qbrowse://') && (isReaderAvailable || isReaderOpen)) && (
                                    <div
                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer animate-pop-in hover:scale-105 active:scale-95 ${
                                            isReaderOpen 
                                                ? 'bg-accent text-white font-bold shadow-md' 
                                                : (isBright ? 'bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40' : 'bg-white/10 hover:bg-white/20 text-accent border border-accent/30')
                                        }`}
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            toggleReaderMode(); 
                                        }}
                                        title="Toggle Reader Mode (Ctrl+Alt+R)"
                                    >
                                        <BookOpen size={12} className={isReaderLoading ? 'animate-pulse' : ''} />
                                        <span className="hidden sm:inline">Reader</span>
                                    </div>
                                )}

                                {zoomLevel !== 100 && (
                                    <div
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider transition-all cursor-pointer animate-pop-in hover:scale-105 active:scale-95 ${isBright ? 'bg-black/10 text-zinc-700 hover:bg-black/15' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        onClick={(e) => { e.stopPropagation(); setZoomLevel(100); }}
                                        title="Reset Zoom (CMD+0)"
                                    >
                                        {zoomLevel}%
                                    </div>
                                )}
                                <div
                                    className={`p-1 rounded-full transition-colors cursor-pointer ${isBright ? 'hover:bg-black/10 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                                    onClick={(e) => { e.stopPropagation(); refresh(); }}
                                >
                                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* RIGHT BLOCK: Extensions & Toggles */}
                    <div style={{ WebkitAppRegion: 'no-drag' }} className={`flex-1 flex items-center justify-end min-w-max z-20 transition-opacity duration-300 ${isRightPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className={`flex items-center gap-1 flex-shrink-0 min-w-max h-9 rounded-full px-2 transition-all ${
                            isBright ? 'liquid-pill-bright' : 'liquid-pill-dark'
                        }`}>
                            <button 
                                id="tour-splitview-trigger"
                                onClick={() => toggleSplitView()} 
                                className={`p-1.5 rounded-full transition group ${
                                    isBright 
                                        ? (isSplitView ? 'text-accent bg-accent/10' : 'text-zinc-600 hover:bg-black/5 hover:text-zinc-900') 
                                        : (isSplitView ? 'text-accent bg-accent/10' : 'text-white/60 hover:text-white')
                                }`} 
                                title="Split View (Ctrl+\ or Ctrl+Shift+D)"
                            >
                                <SplitSquareHorizontal size={14} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <div className={`w-px h-3.5 mx-0.5 ${isBright ? 'bg-gray-200/60' : 'bg-white/10'}`} />
                            <button 
                                id="tour-darkmode-trigger"
                                onClick={() => togglePopover('darkmode')} 
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    useUIStore.getState().toggleTheme();
                                }}
                                className={`p-1.5 rounded-full transition group ${
                                    activePopover === 'darkmode' || !isBright 
                                        ? 'bg-indigo-500/20 text-indigo-400' 
                                        : 'text-zinc-700 hover:bg-black/10'
                                }`}
                                title="Theme & Smart Dark (Right-click to quick toggle)"
                            >
                                {!isBright ? (
                                    <Moon size={14} className="group-hover:scale-110 transition-transform fill-current" />
                                ) : (
                                    <Sun size={14} className="group-hover:scale-110 transition-transform text-amber-600" />
                                )}
                            </button>
                            <button 
                                id="tour-shield-trigger"
                                onClick={() => togglePopover('adblock')} 
                                className={`flex items-center gap-1.5 p-1.5 rounded-full transition group px-2.5 ${
                                    activePopover === 'adblock' 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : (isAdblockActive 
                                            ? (isBright ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-emerald-400 hover:bg-emerald-500/10') 
                                            : (isBright ? 'text-gray-400 hover:bg-black/5' : 'text-white/30 hover:bg-white/10'))
                                }`}
                                title={`QShield: ${adblockStats?.count ? Number(adblockStats.count).toLocaleString() : 1} trackers blocked`}
                            >
                                <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
                                {isAdblockActive && (
                                    <span className="text-[10px] font-bold opacity-80">
                                        {formatCompactNumber(adblockStats?.count > 0 ? adblockStats.count : 1)}
                                    </span>
                                )}
                            </button>

                            <button 
                                onClick={() => togglePopover('media')} 
                                className={`p-1.5 rounded-full transition group ${
                                    activePopover === 'media' 
                                        ? 'bg-purple-500/20 text-purple-400' 
                                        : (isBright ? 'text-zinc-700 hover:bg-black/10' : 'text-white/60 hover:text-white hover:bg-white/10')
                                }`}
                                title="Media Player"
                            >
                                <Music size={14} className="group-hover:scale-110 transition-transform" />
                            </button>

                            <button 
                                onClick={() => { setIsRightPanelOpen(true); setRightPanelTab('downloads'); }} 
                                className={`p-1.5 rounded-full transition group ${
                                    isBright ? 'text-zinc-700 hover:bg-black/10' : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`} 
                                title="Downloads"
                            >
                                <Download size={14} className="group-hover:scale-110 transition-transform" />
                            </button>

                            <div className={`w-px h-4 mx-1 ${isBright ? 'bg-gray-200/60' : 'bg-white/10'}`}></div>

                            <button 
                                id="tour-tor-trigger"
                                onClick={() => togglePopover('tor')} 
                                className={`p-1.5 rounded-full transition group relative ${
                                    activePopover === 'tor' || isTor 
                                        ? 'bg-purple-500/25 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                                        : (isBright ? 'text-zinc-700 hover:bg-black/10' : 'text-white/60 hover:text-white hover:bg-white/10')
                                }`} 
                                title="Tor Circuit & Onion Network"
                            >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                                    <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                                    <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                                    <circle cx="12" cy="12" r="1.5"/>
                                </svg>
                                {torStatus === 'connected' && (
                                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_5px_#a855f7]"></span>
                                )}
                            </button>

                            <button 
                                id="tour-vault-trigger"
                                onClick={() => togglePopover('vault')} 
                                className={`p-1.5 rounded-full transition group ${
                                    activePopover === 'vault' 
                                        ? 'bg-blue-500/20 text-blue-400' 
                                        : (isBright ? 'text-zinc-700 hover:bg-black/10' : 'text-white/60 hover:text-white hover:bg-white/10')
                                }`} 
                                title="QVault Passwords"
                            >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
