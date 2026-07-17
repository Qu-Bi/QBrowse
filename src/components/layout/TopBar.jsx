import React, { useState } from 'react';
import { PanelLeft, Lock, X, RefreshCw, SplitSquareHorizontal, Moon, Sun, ShieldCheck, Download, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
export default function TopBar() {
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const isForceDark = useUIStore(state => state.isForceDark);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const currentUrl = useUIStore(state => state.currentUrl);
    const isRefreshing = useUIStore(state => state.isRefreshing);
    const zoomLevel = useUIStore(state => state.zoomLevel);
    const activePopover = useUIStore(state => state.activePopover);
    const isSplitView = useUIStore(state => state.isSplitView);
    const isAdblockActive = useUIStore(state => state.isAdblockActive);
    const adblockStats = useUIStore(state => state.adblockStats);
    
    const setIsSidebarHidden = useUIStore(state => state.setIsSidebarHidden);
    const showToast = useUIStore(state => state.showToast);
    const openOmnibox = useUIStore(state => state.openOmnibox);
    const setZoomLevel = useUIStore(state => state.setZoomLevel);
    const refresh = useUIStore(state => state.refresh);
    const setIsSplitView = useUIStore(state => state.setIsSplitView);
    const togglePopover = useUIStore(state => state.togglePopover);
    
    const setIsRightPanelOpen = useUIStore(state => state.setIsRightPanelOpen);
    const setRightPanelTab = useUIStore(state => state.setRightPanelTab);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);

    let currentTab = null;
    if (activeSpace === 'personal') currentTab = privateTabs.find(t => t.active);
    if (activeSpace === 'work') currentTab = workTabs.find(t => t.active);
    if (activeSpace === 'ghost') currentTab = ghostTabs.find(t => t.active);
    const displayUrl = currentTab ? currentTab.url : '';

    const isIncognito = activeSpace === 'ghost';

    

    const activeTabId = (() => {
        const tabs = activeSpace === 'personal' ? privateTabs : activeSpace === 'work' ? workTabs : ghostTabs;
        return tabs.find(t => t.active)?.id;
    })();

    const handleBack = async (e) => {
        e.stopPropagation();
        if (activeTabId) {
            const wv = document.getElementById(`webview-${activeTabId}`);
            if (wv && wv.canGoBack && wv.canGoBack()) {
                wv.goBack();
            } else {
                const newUrl = useTabStore.getState().navigateTabBack(activeTabId);
                if (newUrl && wv) {
                    wv.loadURL(newUrl);
                }
            }
        }
    };

    const handleForward = async (e) => {
        e.stopPropagation();
        if (activeTabId) {
            const wv = document.getElementById(`webview-${activeTabId}`);
            if (wv && wv.canGoForward && wv.canGoForward()) {
                wv.goForward();
            } else {
                const newUrl = useTabStore.getState().navigateTabForward(activeTabId);
                if (newUrl && wv) {
                    wv.loadURL(newUrl);
                }
            }
        }
    };

    return (
        <>
            <div className={`relative z-[60] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFullscreen ? '-mt-[76px] opacity-0' : 'mt-0 opacity-100'}`}>
                {/* Invisible drag region for Electron */}
                <div style={{ WebkitAppRegion: 'drag' }} className="absolute top-0 left-0 right-0 h-6 z-40" />
                
                {/* SINGLE BUBBLE TOPBAR */}
                <div className={`flex mt-0 mx-4 mb-2 h-[52px] z-50 items-center justify-between px-3 rounded-full shadow-lg border transition-colors backdrop-blur-2xl ${isForceDark || isIncognito ? 'bg-black/50 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]' : 'bg-white/70 border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'}`}>

                    {/* LEFT BLOCK: Zen Mode, Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const nextState = !isSidebarHidden;
                                setIsSidebarHidden(nextState);
                                showToast(nextState ? 'Zen Mode active' : 'Sidebar visible'); 
                            }}
                            className={`h-9 w-9 flex items-center justify-center rounded-full shadow-sm border transition-all hover:scale-[1.05] active:scale-[0.95] group cursor-pointer ${isForceDark || isIncognito ? (isSidebarHidden ? 'bg-accent-20 border-accent-30 text-accent' : 'bg-white/10 border-white/5 hover:bg-white/20 text-white/60 hover:text-white') : (isSidebarHidden ? 'bg-accent-10 border-accent-30 text-accent' : 'bg-white/80 border-white/40 hover:bg-white shadow-sm text-gray-500 hover:text-gray-800')}`}
                            title="Zen Mode (CMD+B)"
                        >
                            <PanelLeft size={16} />
                        </button>

                        <div className={`flex items-center gap-1 p-0.5 h-9 rounded-full shadow-sm border ${isForceDark || isIncognito ? 'bg-black/20 border-white/5 shadow-inner' : 'bg-white/40 border-white/20'}`}>
                            <button onClick={handleBack} className={`p-1.5 rounded-full transition-colors ${isForceDark || isIncognito ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-200/50 text-gray-500 hover:text-gray-800'}`}>
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={handleForward} className={`p-1.5 rounded-full transition-colors ${isForceDark || isIncognito ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-200/50 text-gray-500 hover:text-gray-800'}`}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* CENTER BLOCK: URL Bar */}
                    <div className="flex-1 max-w-2xl px-4 h-full flex items-center justify-center">
                        <button
                            onClick={() => openOmnibox(currentUrl)}
                            className={`relative w-full flex items-center gap-3 px-4 h-[38px] rounded-full transition-all group cursor-pointer overflow-hidden border ${isForceDark || isIncognito ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/90 hover:text-white shadow-inner' : 'bg-black/5 border-black/10 hover:bg-black/10 text-gray-700 hover:text-black shadow-sm'}`}
                        >
                            {/* Refresh Progress Indicator */}
                            <div className={`absolute bottom-0 left-0 h-[2px] bg-accent transition-all ease-out ${isRefreshing ? 'w-full duration-1000 opacity-100' : 'w-0 duration-0 opacity-0'}`}></div>

                            <div
                                className={`p-1 rounded-full transition-colors z-10`}
                            >
                                {isRefreshing ? <X size={12} className="text-gray-400" /> : <Lock size={12} className={isForceDark || isIncognito ? 'text-emerald-400' : 'text-emerald-500'} />}
                            </div>

                            <span className="text-[13px] font-medium truncate w-full text-left transition-colors z-10 text-center">
                                {displayUrl || 'Search or enter address'}
                            </span>

                            {zoomLevel !== 100 && (
                                <div
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider transition-colors z-10 flex-shrink-0 cursor-pointer ${isForceDark || isIncognito ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200/50 text-gray-600 hover:bg-gray-300/50'}`}
                                    onClick={(e) => { e.stopPropagation(); setZoomLevel(100); showToast('Zoom: 100%'); }}
                                    title="Reset Zoom (CMD+0)"
                                >
                                    {zoomLevel}%
                                </div>
                            )}

                            <div
                                className={`p-1 rounded-full transition-colors ml-auto z-10 ${isForceDark || isIncognito ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-gray-200/50 text-gray-400 hover:text-gray-700'}`}
                                onClick={(e) => { e.stopPropagation(); refresh(); }}
                                title="Refresh"
                            >
                                <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-accent' : ''} />
                            </div>
                        </button>
                    </div>

                    {/* RIGHT BLOCK: Extensions & Toggles */}
                    <div className="flex items-center gap-1 h-9 rounded-full shadow-sm border px-2 ${isForceDark || isIncognito ? 'bg-black/20 border-white/5 shadow-inner' : 'bg-white/40 border-white/20'}">
                        <button onClick={() => setIsSplitView(!isSplitView)} className={`p-1.5 rounded-full transition group border-r pr-3 mr-1 ${isForceDark || isIncognito ? (isSplitView ? 'border-accent/30 text-accent bg-accent/10' : 'border-white/10 text-white/60 hover:text-white') : (isSplitView ? 'border-gray-200/50 text-accent bg-accent/10' : 'border-gray-200/50 text-gray-500 hover:bg-black/5')} `} title="Split View">
                            <SplitSquareHorizontal size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button onClick={() => togglePopover('darkmode')} className={`p-1.5 rounded-full transition group ${activePopover === 'darkmode' || isForceDark ? 'bg-indigo-500/20 text-indigo-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:bg-black/5')}`}>
                            {isForceDark ? <Moon size={14} className="group-hover:scale-110 transition-transform fill-current" /> : <Sun size={14} className="group-hover:scale-110 transition-transform" />}
                        </button>
                        <button onClick={() => togglePopover('adblock')} className={`flex items-center gap-1.5 p-1.5 rounded-full transition group border-x px-3 mx-1 ${isForceDark || isIncognito ? 'border-white/10' : 'border-gray-200/50'} ${activePopover === 'adblock' ? 'bg-green-500/20 text-green-400' : (isAdblockActive ? (isForceDark || isIncognito ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-500/10') : 'text-gray-400 hover:bg-black/5')}`}>
                            <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
                            {isAdblockActive && adblockStats.count > 0 && <span className="text-[10px] font-bold opacity-80">{adblockStats.count}</span>}
                        </button>

                        <button onClick={() => togglePopover('media')} className={`p-1.5 rounded-full transition group ${activePopover === 'media' ? 'bg-purple-500/20 text-purple-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:bg-black/5')}`}>
                            <Music size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button onClick={() => { setIsRightPanelOpen(true); setRightPanelTab('downloads'); }} className={`p-1.5 rounded-full transition group ${isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:bg-black/5'}`} title="Downloads">
                            <Download size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <div className={`w-px h-4 mx-1 ${isForceDark || isIncognito ? 'bg-white/10' : 'bg-gray-200/50'}`}></div>
                        <button onClick={() => togglePopover('vault')} className={`p-1.5 rounded-full transition group ${activePopover === 'vault' ? 'bg-blue-500/20 text-blue-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:bg-black/5')}`} title="QVault Passwords">
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
}