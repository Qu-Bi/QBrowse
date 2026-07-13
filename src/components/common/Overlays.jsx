import React from 'react';
import { 
    ArrowLeft, ArrowRight, RefreshCw, Copy, MonitorPlay, Pin, Minus, 
    PictureInPicture2, VolumeX, Volume2, Layers, X, Ghost, Globe, Play, Pause 
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function Overlays() {
    const isForceDark = useUIStore(state => state.isForceDark);
    const contextMenu = useUIStore(state => state.contextMenu);
    const isContextMenuClosing = useUIStore(state => state.isContextMenuClosing);
    const closeContextMenu = useUIStore(state => state.closeContextMenu);
    
    const tabContextMenu = useUIStore(state => state.tabContextMenu);
    const isTabContextMenuClosing = useUIStore(state => state.isTabContextMenuClosing);
    const closeTabContextMenu = useUIStore(state => state.closeTabContextMenu);
    
    const hoverPreview = useUIStore(state => state.hoverPreview);
    const showSwitcher = useUIStore(state => state.showSwitcher);
    
    const pipWindow = useUIStore(state => state.pipWindow);
    const isPipClosing = useUIStore(state => state.isPipClosing);
    const closePip = useUIStore(state => state.closePip);
    const setPipWindow = useUIStore(state => state.setPipWindow);
    const showToast = useUIStore(state => state.showToast);

    const peekWindow = useUIStore(state => state.peekWindow);
    const isPeekClosing = useUIStore(state => state.isPeekClosing);
    const closePeek = useUIStore(state => state.closePeek);

    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isFullscreen = useUIStore(state => state.isFullscreen);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const draggedItem = useTabStore(state => state.draggedItem);
    
    const handleCloseTab = useTabStore(state => state.handleCloseTab);
    const handleToggleMute = useTabStore(state => state.handleToggleMute);
    const handlePinTab = useTabStore(state => state.handlePinTab);
    const handleUnpinTab = useTabStore(state => state.handleUnpinTab);

    const isIncognito = activeSpace === 'ghost';
    
    const handleRefresh = () => { showToast('Odświeżam...'); }

    return (
        <>
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

            {/* CUSTOMOWE MENU KONTEKSTOWE */}
            {(contextMenu || isContextMenuClosing) && (
                <div
                    className={`fixed z-[30000] w-56 flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] p-1.5 text-white/90 ${isContextMenuClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                    style={{ top: contextMenu?.y, left: contextMenu?.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={() => { showToast('Wstecz'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <ArrowLeft size={14} className="text-white/50 group-hover:text-white transition" /> Back
                    </button>
                    <button onClick={() => { showToast('Dalej'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <ArrowRight size={14} className="text-white/50 group-hover:text-white transition" /> Forward
                    </button>
                    <button onClick={() => { handleRefresh(); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <RefreshCw size={14} className="text-white/50 group-hover:text-white transition" /> Reload
                    </button>
                    <div className="h-px w-full bg-white/10 my-1.5"></div>
                    <button onClick={() => { showToast('Skopiowano URL do schowka'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Copy size={14} className="text-white/50 group-hover:text-white transition" /> Copy URL
                    </button>
                    <div className="h-px w-full bg-white/10 my-1.5"></div>
                    <button onClick={() => { showToast('Otwieram narzędzia dev...'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <MonitorPlay size={14} className="text-white/50 group-hover:text-white transition" /> Inspect Element
                    </button>
                </div>
            )}

            {/* MENU KONTEKSTOWE KART W SIDEBARZE */}
            {(tabContextMenu || isTabContextMenuClosing) && (
                <div
                    className={`fixed z-[30000] w-56 flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] p-1.5 text-white/90 ${isTabContextMenuClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                    style={{ top: tabContextMenu?.y, left: tabContextMenu?.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 text-xs font-semibold text-white/40 border-b border-white/5 mb-1 truncate">
                        {tabContextMenu?.tab.title}
                    </div>
                    {tabContextMenu?.spaceType !== 'pinned' && (
                        <button onClick={() => { handlePinTab(tabContextMenu?.tab, { stopPropagation: () => { } }); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                            <Pin size={14} className="text-white/50 group-hover:text-white transition" /> Pin Tab
                        </button>
                    )}
                    {tabContextMenu?.spaceType === 'pinned' && (
                        <button onClick={() => { handleUnpinTab(tabContextMenu?.tab, { stopPropagation: () => { } }); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                            <Minus size={14} className="text-white/50 group-hover:text-white transition" /> Unpin Tab
                        </button>
                    )}
                    <button onClick={() => { showToast('URL copied to clipboard'); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Copy size={14} className="text-white/50 group-hover:text-white transition" /> Copy URL
                    </button>

                    <div className="h-px w-full bg-white/10 my-1.5"></div>

                    {tabContextMenu?.tab.isAudioPlaying && (
                        <button onClick={() => { setPipWindow(tabContextMenu?.tab); showToast('PiP Activated'); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-purple-500/10 rounded-lg text-sm font-medium transition text-left w-full group text-purple-400">
                            <PictureInPicture2 size={14} className="text-purple-400/60 group-hover:text-purple-400 transition" /> Picture in Picture
                        </button>
                    )}

                    <button onClick={() => { handleToggleMute(tabContextMenu?.tab.id, tabContextMenu?.spaceType, { stopPropagation: () => { } }); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        {tabContextMenu?.tab.isMuted ? <Volume2 size={14} className="text-white/50 group-hover:text-white transition" /> : <VolumeX size={14} className="text-white/50 group-hover:text-white transition" />}
                        {tabContextMenu?.tab.isMuted ? 'Unmute Tab' : 'Mute Tab'}
                    </button>
                    <button onClick={() => { showToast('Duplicated tab'); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Layers size={14} className="text-white/50 group-hover:text-white transition" /> Duplicate Tab
                    </button>

                    <div className="h-px w-full bg-white/10 my-1.5"></div>

                    <button onClick={() => { handleCloseTab(tabContextMenu?.tab.id, { stopPropagation: () => { } }); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition text-left w-full group">
                        <X size={14} className="text-red-400/50 group-hover:text-red-300 transition" /> Close Tab
                    </button>
                </div>
            )}

            {/* TAB HOVER CARDS */}
            {hoverPreview && !isSidebarHidden && !isFullscreen && !tabContextMenu && !draggedItem && (
                <div
                    className={`fixed z-[40000] w-64 flex flex-col bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-none animate-pop-in`}
                    style={{ top: Math.min(hoverPreview.top, window.innerHeight - 200), left: hoverPreview.left }}
                >
                    <div className="flex items-center gap-3 p-3 bg-white/5 border-b border-white/10">
                        {hoverPreview.tab.url ? (
                            <img src={`https://www.google.com/s2/favicons?sz=64&domain=${hoverPreview.tab.url}`} alt="icon" className="w-4 h-4 rounded-sm flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                            <Globe size={14} className="text-white/50" />
                        )}
                        <span className="text-sm font-semibold truncate text-white/90">{hoverPreview.tab.title}</span>
                    </div>
                    <div className="w-full h-32 bg-[#121214] relative overflow-hidden flex flex-col items-center justify-center">
                        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)]`} style={{ backgroundSize: '12px 12px' }}></div>
                        <Globe size={32} className="text-white/10 mb-2 drop-shadow-md" />
                        <div className="absolute bottom-2 left-2 right-2 px-2 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 truncate text-[10px] font-mono text-white/50 text-center shadow-lg">
                            {hoverPreview.tab.url || 'Pusta karta'}
                        </div>
                    </div>
                </div>
            )}

            {/* MAC-STYLE TAB SWITCHER (Ctrl+Tab Overlay) */}
            {showSwitcher && (
                <div className="fixed inset-0 z-[70000] flex flex-col items-center justify-center pointer-events-none animate-pop-in bg-black/40 backdrop-blur-[10px]">
                    <div className="relative w-full h-[60vh] flex items-center justify-center perspective-[1200px]">
                        {(activeSpace === 'prywatne' ? privateTabs : (activeSpace === 'praca' ? workTabs : ghostTabs)).map((tab, i, arr) => {
                            const activeIdx = arr.findIndex(t => t.active);
                            const offset = i - activeIdx;
                            const absOffset = Math.abs(offset);

                            let zIndex = 100 - absOffset;
                            let opacity = offset === 0 ? 1 : Math.max(1 - (absOffset * 0.4), 0);
                            let translateX = offset * 260;
                            let scale = offset === 0 ? 1.2 : 0.85 - (absOffset * 0.1);
                            let rotateY = offset === 0 ? 0 : (offset > 0 ? -25 : 25);
                            let brightness = offset === 0 ? 1 : 0.5;

                            return (
                                <div key={tab.id} className="absolute top-1/2 left-1/2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
                                    style={{
                                        zIndex, opacity,
                                        transform: `translate(-50%, -50%) translateX(${translateX}px) translateZ(${-absOffset * 100}px) scale(${scale}) rotateY(${rotateY}deg)`,
                                        filter: `brightness(${brightness}) ${offset !== 0 ? 'blur(2px)' : 'blur(0px)'}`
                                    }}>

                                    <div className={`w-[400px] aspect-video rounded-3xl overflow-hidden bg-[#0a0a0c] relative transition-all duration-500 border ${tab.active ? 'border-accent shadow-[0_0_80px_var(--accent-20)]' : 'border-white/10'}`}>
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)]" style={{ backgroundSize: '8px 8px' }}></div>

                                        {activeSpace === 'ghost' ? (
                                            <div className="absolute inset-0 flex items-center justify-center"><Ghost size={48} className={tab.active ? 'text-[#a855f7]' : 'text-white/20'} strokeWidth={1.5} /></div>
                                        ) : tab.url === 'youtube.com' ? (
                                            <div className="absolute inset-0 flex flex-col bg-black">
                                                <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="Video" />
                                                <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"><Play size={20} className="text-white drop-shadow-md ml-1" fill="white" /></div></div>
                                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20"><div className="h-full bg-red-500 w-[45%]"></div></div>
                                            </div>
                                        ) : tab.url === 'qu-os.local' ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                                <div className="w-1/2 h-2.5 bg-white/20 rounded-full mb-6"></div>
                                                <div className="w-full h-12 bg-white/5 border border-white/10 rounded-xl mb-3"></div>
                                                <div className="w-full h-12 bg-white/5 border border-white/10 rounded-xl flex justify-end items-center pr-3"><div className="w-6 h-6 bg-blue-500/30 rounded-md"></div></div>
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {tab.url ? <img src={`https://www.google.com/s2/favicons?sz=128&domain=${tab.url}`} className="w-20 h-20 rounded-2xl opacity-50 drop-shadow-md" alt="icon" /> : <Globe size={48} className="text-white/20" />}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* PICTURE IN PICTURE (PiP) WIDGET */}
            {(pipWindow || isPipClosing) && (
                <div className={`fixed bottom-8 right-8 z-[60000] w-80 aspect-video bg-black/90 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col group cursor-move ${isPipClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
                    <div className="absolute top-0 left-0 right-0 p-2.5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none">
                        <span className="text-[10px] font-semibold text-white/90 truncate px-1 drop-shadow-md">{pipWindow?.title}</span>
                        <button onClick={closePip} className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-red-500 text-white transition-colors pointer-events-auto shadow-sm">
                            <X size={10} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center bg-[#0a0a0c]">
                        <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=600&auto=format&fit=crop" alt="Video Stream" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/50 transition-colors duration-300"></div>

                        <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-10">
                            <Pause size={18} fill="currentColor" />
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
                        <div className="h-full bg-accent w-[45%] relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_8px_rgba(255,255,255,1)] transition-opacity"></div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
