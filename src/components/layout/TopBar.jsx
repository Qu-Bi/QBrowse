import React from 'react';
import { PanelLeft, Lock, X, RefreshCw, SplitSquareHorizontal, Moon, Sun, ShieldCheck, Download, Music } from 'lucide-react';
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
    
    const setIsSidebarHidden = useUIStore(state => state.setIsSidebarHidden);
    const showToast = useUIStore(state => state.showToast);
    const openOmnibox = useUIStore(state => state.openOmnibox);
    const setZoomLevel = useUIStore(state => state.setZoomLevel);
    const refresh = useUIStore(state => state.refresh);
    const setIsSplitView = useUIStore(state => state.setIsSplitView);
    const togglePopover = useUIStore(state => state.togglePopover);

    const activeSpace = useTabStore(state => state.activeSpace);
    const isIncognito = activeSpace === 'ghost';

    if (isFullscreen) return null;

    return (
        <>
            <div data-tauri-drag-region className="absolute top-0 left-0 right-0 h-6 z-40" />
            <div className="hidden md:flex absolute top-4 left-6 z-50 items-center gap-2 w-1/3 min-w-[250px]">
                <button
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        const nextState = !isSidebarHidden;
                        setIsSidebarHidden(nextState);
                        showToast(nextState ? 'Zen Mode active' : 'Sidebar visible'); 
                    }}
                    className={`p-2 rounded-xl shadow-sm border transition-all hover:scale-[1.05] active:scale-[0.95] group cursor-pointer backdrop-blur-md ${isForceDark || isIncognito ? (isSidebarHidden ? 'bg-accent-20 border-accent-30 text-accent' : 'bg-black/60 border-white/10 hover:bg-white/10 text-white/60 hover:text-white') : (isSidebarHidden ? 'bg-accent-10 border-accent-30 text-accent' : 'bg-white/80 border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-800')}`}
                    title="Zen Mode (CMD+B)"
                >
                    <PanelLeft size={16} />
                </button>

                <button
                    onClick={() => openOmnibox(currentUrl)}
                    className={`flex-1 flex items-center gap-3 px-3 py-1.5 rounded-xl shadow-sm border transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer overflow-hidden ${isForceDark || isIncognito ? 'bg-black/60 border-white/10 backdrop-blur-md hover:bg-black/80' : 'bg-white/80 border-gray-200 backdrop-blur-md hover:bg-white'}`}
                >
                    <div className={`absolute bottom-0 left-0 h-[2px] bg-accent transition-all ease-out ${isRefreshing ? 'w-full duration-1000 opacity-100' : 'w-0 duration-0 opacity-0'}`}></div>

                    <div
                        className={`p-1.5 rounded-lg transition-colors z-10 ${isForceDark || isIncognito ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        onClick={(e) => { e.stopPropagation(); showToast('Secure connection (SSL)'); }}
                    >
                        {isRefreshing ? <X size={12} className="text-gray-400" /> : <Lock size={12} className={isForceDark || isIncognito ? 'text-green-400' : 'text-green-600'} />}
                    </div>

                    <span className={`text-sm font-medium truncate w-full text-left transition-colors z-10 ${isForceDark || isIncognito ? 'text-white/90 group-hover:text-white' : 'text-gray-700 group-hover:text-black'}`}>
                        {currentUrl || 'Zen Dashboard'}
                    </span>

                    {zoomLevel !== 100 && (
                        <div
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider transition-colors z-10 flex-shrink-0 cursor-pointer ${isForceDark || isIncognito ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                            onClick={(e) => { e.stopPropagation(); setZoomLevel(100); showToast('Zoom: 100%'); }}
                            title="Reset Zoom (CMD+0)"
                        >
                            {zoomLevel}%
                        </div>
                    )}

                    <div
                        className={`p-1.5 rounded-lg transition-colors ml-auto z-10 ${isForceDark || isIncognito ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'}`}
                        onClick={(e) => { e.stopPropagation(); refresh(); }}
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-accent' : ''} />
                    </div>
                </button>
            </div>

            <div className={`hidden md:flex absolute top-4 right-6 z-50 items-center gap-2 px-3 py-1.5 rounded-full shadow-sm border transition-colors ${isForceDark || isIncognito ? 'bg-black/60 border-white/10 backdrop-blur-md' : 'bg-white/80 border-gray-200 backdrop-blur-md'}`}>
                <button onClick={() => setIsSplitView(!isSplitView)} className={`px-2 py-1 rounded-md transition group border-r pr-3 mr-1 ${isForceDark || isIncognito ? (isSplitView ? 'border-accent text-accent bg-accent-10' : 'border-white/10 text-white/60 hover:text-white') : (isSplitView ? 'border-gray-200 text-accent bg-accent-10' : 'border-gray-200 text-gray-500 hover:bg-gray-100')} `} title="Podziel ekran">
                    <SplitSquareHorizontal size={14} className="group-hover:scale-110 transition-transform" />
                </button>
                <button onClick={() => togglePopover('darkmode')} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition group ${activePopover === 'darkmode' || isForceDark ? 'bg-indigo-500/20 text-indigo-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:bg-gray-100')}`}>
                    {isForceDark ? <Moon size={14} className="group-hover:scale-110 transition-transform fill-current" /> : <Sun size={14} className="group-hover:scale-110 transition-transform" />}
                </button>
                <button onClick={() => togglePopover('adblock')} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition group border-x px-3 mx-1 ${isForceDark || isIncognito ? 'border-white/10' : 'border-gray-200'} ${activePopover === 'adblock' ? 'bg-green-500/20 text-green-400' : (isAdblockActive ? (isForceDark || isIncognito ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:bg-gray-100') : 'text-gray-400 hover:bg-gray-100')}`}>
                    <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
                    {isAdblockActive && <span className="text-[10px] font-bold opacity-80">12</span>}
                </button>
                <button onClick={() => togglePopover('downloads')} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition group border-r pr-3 mr-1 ${isForceDark || isIncognito ? 'border-white/10' : 'border-gray-200'} ${activePopover === 'downloads' ? 'bg-blue-500/20 text-blue-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:bg-gray-100')}`}>
                    <Download size={14} className="group-hover:scale-110 transition-transform" />
                </button>
                <button onClick={() => togglePopover('media')} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition group ${activePopover === 'media' ? 'bg-purple-500/20 text-purple-400' : (isForceDark || isIncognito ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:bg-gray-100')}`}>
                    <Music size={14} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </>
    );
}
