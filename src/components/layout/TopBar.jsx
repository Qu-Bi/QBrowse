import React, { useState, useEffect } from 'react';
import { PanelLeft, Lock, X, RefreshCw, SplitSquareHorizontal, Moon, Sun, ShieldCheck, Download, Music, ChevronLeft, ChevronRight, ArrowLeftRight, User } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useSyncStore from '../../store/useSyncStore';
import { onGlobalNavigateBack, onGlobalNavigateForward } from '../../services/electronIPC';

function formatDisplayUrl(rawUrl) {
    if (!rawUrl || rawUrl === 'about:blank') return '';
    if (rawUrl.startsWith('qbrowse://') || rawUrl.startsWith('chrome://') || rawUrl.startsWith('about:')) return rawUrl;
    
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
    const isForceDark = useUIStore(state => state.isForceDark);
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

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);

    const spaceTabs = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : ghostTabs);
    const leftTab = spaceTabs.find(t => t.active);
    const rightTab = isSplitView && splitRightTabId ? spaceTabs.find(t => t.id === splitRightTabId) : null;
    
    const focusedTab = (isSplitView && focusedPane === 'right' && rightTab) ? rightTab : leftTab;
    const rawUrl = focusedTab && focusedTab.url !== 'about:blank' ? focusedTab.url : '';
    const showFullUrls = useUIStore(state => state.settings?.showFullUrls);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const displayUrl = showFullUrls ? rawUrl : formatDisplayUrl(rawUrl);

    const canGoBack = focusedTab ? !!focusedTab.canGoBack : false;
    const canGoForward = focusedTab ? !!focusedTab.canGoForward : false;

    const isIncognito = activeSpace === 'ghost';

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
            <div className={`relative z-[60] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFullscreen ? '-mt-[60px] opacity-0' : 'mt-0 opacity-100'}`}>
                {/* SINGLE BUBBLE TOPBAR */}
                <div className={`drag-region flex mt-0 mx-0 mb-2 ${uiScale === 'compact' ? 'h-[44px]' : 'h-[52px]'} z-50 items-center justify-between px-3 rounded-full shadow-lg border transition-all duration-300 backdrop-blur-2xl ${isForceDark || isIncognito ? 'bg-black/50 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]' : 'bg-white/70 border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'}`}>

                    {/* LEFT BLOCK: Zen Mode, Navigation */}
                    <div style={{ WebkitAppRegion: 'no-drag' }} className="flex-1 flex items-center justify-start gap-2 min-w-max z-20">
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const nextState = !isSidebarHidden;
                                setIsSidebarHidden(nextState);
                                showToast(nextState ? 'Zen Mode active' : 'Sidebar visible'); 
                            }}
                            className={`h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full shadow-sm border transition-all hover:scale-[1.05] active:scale-[0.95] group cursor-pointer ${isForceDark || isIncognito ? (isSidebarHidden ? 'bg-accent-20 border-accent-30 text-accent' : 'bg-white/10 border-white/5 hover:bg-white/20 text-white/60 hover:text-white') : (isSidebarHidden ? 'bg-accent-10 border-accent-30 text-accent' : 'bg-white/80 border-white/40 hover:bg-white shadow-sm text-gray-700 hover:text-gray-900')}`}
                            title="Zen Mode (CMD+B)"
                        >
                            <PanelLeft size={16} />
                        </button>

                        {/* Compact Unified Navigation Pill */}
                        <div className={`flex items-center p-0.5 h-9 rounded-full border shadow-sm transition-all flex-shrink-0 ${
                            isForceDark || isIncognito
                                ? 'bg-white/5 border-white/10'
                                : 'bg-white/60 border-white/40'
                        }`}>
                            <button 
                                onClick={handleBack} 
                                disabled={!canGoBack}
                                className={`h-8 w-8 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                                    canGoBack 
                                        ? (isForceDark || isIncognito ? 'hover:bg-white/20 text-white/80 hover:text-white hover:scale-105 active:scale-95' : 'hover:bg-black/10 text-gray-700 hover:text-gray-900 hover:scale-105 active:scale-95')
                                        : 'opacity-25 cursor-not-allowed pointer-events-none text-white/30'
                                }`}
                                title="Back (Mouse 4 / Alt+Left)"
                            >
                                <ChevronLeft size={15} strokeWidth={2.5} />
                            </button>

                            <div className={`w-[1px] h-4 mx-0.5 ${isForceDark || isIncognito ? 'bg-white/10' : 'bg-black/10'}`}></div>

                            <button 
                                onClick={handleForward} 
                                disabled={!canGoForward}
                                className={`h-8 w-8 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                                    canGoForward 
                                        ? (isForceDark || isIncognito ? 'hover:bg-white/20 text-white/80 hover:text-white hover:scale-105 active:scale-95' : 'hover:bg-black/10 text-gray-700 hover:text-gray-900 hover:scale-105 active:scale-95')
                                        : 'opacity-25 cursor-not-allowed pointer-events-none text-white/30'
                                }`}
                                title="Forward (Mouse 5 / Alt+Right)"
                            >
                                <ChevronRight size={15} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* CENTER BLOCK: Multi-stage Centered to Fluid URL Bar */}
                    <div style={{ WebkitAppRegion: 'no-drag' }} className="flex-shrink flex-grow-0 w-full max-w-xl min-w-[140px] z-10 mx-2 flex items-center justify-center">
                        <button
                            onClick={() => openOmnibox(rawUrl)}
                            className={`relative w-full flex items-center justify-between px-3 h-[38px] rounded-full transition-all group cursor-pointer overflow-hidden border min-w-0 gap-2 ${isForceDark || isIncognito ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/90 hover:text-white shadow-inner' : 'bg-black/5 border-black/10 hover:bg-black/10 text-gray-900 hover:text-black font-semibold shadow-sm'}`}
                            title={rawUrl || 'Search or enter address'}
                        >
                            {/* Refresh Progress Indicator */}
                            <div className={`absolute bottom-0 left-0 h-[2px] bg-accent transition-all ease-out ${isRefreshing ? 'w-full duration-1000 opacity-100' : 'w-0 duration-0 opacity-0'}`}></div>

                            {/* Left Security Icon */}
                            <div 
                                className="p-1 rounded-full hover:bg-white/20 transition-colors z-10 cursor-pointer group/lock flex-shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePopover('siteinfo');
                                }}
                                title="Site Security & Permissions"
                            >
                                {isRefreshing ? <X size={12} className="text-gray-400" /> : <Lock size={12} className={`group-hover/lock:scale-110 transition-transform ${isForceDark || isIncognito ? 'text-emerald-400' : 'text-emerald-500'}`} />}
                            </div>

                            {/* Center URL Text (Clean truncation, no icon overlap) */}
                            <span className="flex-1 min-w-0 text-[13px] font-medium truncate transition-colors z-10 text-center select-none px-1">
                                {displayUrl || 'Search or enter address'}
                            </span>

                            {/* Right Action Icons */}
                            <div className="flex items-center gap-1 z-10 flex-shrink-0">
                                {zoomLevel !== 100 && (
                                    <div
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${isForceDark || isIncognito ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200/50 text-gray-600 hover:bg-gray-300/50'}`}
                                        onClick={(e) => { e.stopPropagation(); setZoomLevel(100); showToast('Zoom: 100%'); }}
                                        title="Reset Zoom (CMD+0)"
                                    >
                                        {zoomLevel}%
                                    </div>
                                )}
                                <div
                                    className={`p-1 rounded-full transition-colors ${isForceDark || isIncognito ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-gray-200/50 text-gray-400 hover:text-gray-700'}`}
                                    onClick={(e) => { e.stopPropagation(); refresh(); }}
                                >
                                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* RIGHT BLOCK: Extensions & Toggles */}
                    <div style={{ WebkitAppRegion: 'no-drag' }} className="flex-1 flex items-center justify-end min-w-max z-20">
                        <div className={`flex items-center gap-1 flex-shrink-0 min-w-max h-9 rounded-full shadow-sm border px-2 ${isForceDark || isIncognito ? 'bg-black/20 border-white/5 shadow-inner' : 'bg-white/40 border-white/20'}`}>
                            <button onClick={() => setIsSplitView(!isSplitView)} className={`p-1.5 rounded-full transition group border-r pr-3 mr-1 ${isForceDark || isIncognito ? (isSplitView ? 'border-accent/30 text-accent bg-accent/10' : 'border-white/10 text-white/60 hover:text-white') : (isSplitView ? 'border-gray-200/50 text-accent bg-accent/10' : 'border-gray-200/50 text-gray-500 hover:bg-black/5')} `} title="Split View">
                                <SplitSquareHorizontal size={14} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <button onClick={() => togglePopover('darkmode')} className={`p-1.5 rounded-full transition group ${activePopover === 'darkmode' || isForceDark ? 'bg-indigo-500/20 text-indigo-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-800 hover:bg-black/10')}`}>
                                {isForceDark ? <Moon size={14} className="group-hover:scale-110 transition-transform fill-current" /> : <Sun size={14} className="group-hover:scale-110 transition-transform" />}
                            </button>
                            <button onClick={() => togglePopover('adblock')} className={`flex items-center gap-1.5 p-1.5 rounded-full transition group border-x px-3 mx-1 ${isForceDark || isIncognito ? 'border-white/10' : 'border-gray-200/50'} ${activePopover === 'adblock' ? 'bg-green-500/20 text-green-400' : (isAdblockActive ? (isForceDark || isIncognito ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-500/10') : 'text-gray-400 hover:bg-black/5')}`}>
                                <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
                                {isAdblockActive && adblockStats.count > 0 && <span className="text-[10px] font-bold opacity-80">{adblockStats.count}</span>}
                            </button>

                            <button onClick={() => togglePopover('media')} className={`p-1.5 rounded-full transition group ${activePopover === 'media' ? 'bg-purple-500/20 text-purple-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-800 hover:bg-black/10')}`}>
                                <Music size={14} className="group-hover:scale-110 transition-transform" />
                            </button>

                            <button onClick={() => { setIsRightPanelOpen(true); setRightPanelTab('downloads'); }} className={`p-1.5 rounded-full transition group ${isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-800 hover:bg-black/10'}`} title="Downloads">
                                <Download size={14} className="group-hover:scale-110 transition-transform" />
                            </button>

                            <div className={`w-px h-4 mx-1 ${isForceDark || isIncognito ? 'bg-white/10' : 'bg-gray-200/50'}`}></div>

                            <button onClick={() => togglePopover('vault')} className={`p-1.5 rounded-full transition group ${activePopover === 'vault' ? 'bg-blue-500/20 text-blue-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-800 hover:bg-black/10')}`} title="QVault Passwords">
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
