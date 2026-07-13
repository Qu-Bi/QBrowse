import React, { useRef } from 'react';
import { X, Minus, Maximize2, UserPlus, Clock, Settings, Home, Plus, ChevronRight, User, Layers, Ghost, PictureInPicture2, VolumeX, Volume2, Pin, Globe } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function Sidebar() {
    // UI Store State
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const currentUrl = useUIStore(state => state.currentUrl);
    const setHoverPreview = useUIStore(state => state.setHoverPreview);
    const showToast = useUIStore(state => state.showToast);
    const setPipWindow = useUIStore(state => state.setPipWindow);
    const setActiveModal = useUIStore(state => state.openModal);
    const setOnboardingStep = useUIStore(state => state.setOnboardingStep);
    const setTabContextMenu = useUIStore(state => state.setTabContextMenu);

    // Tab Store State
    const activeSpace = useTabStore(state => state.activeSpace);
    const setActiveSpace = useTabStore(state => state.setActiveSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const pinnedTabs = useTabStore(state => state.pinnedTabs);
    const draggedItem = useTabStore(state => state.draggedItem);
    const dragOverItem = useTabStore(state => state.dragOverItem);
    
    // Tab Store Actions
    const handleGoHome = useTabStore(state => state.handleGoHome);
    const handleNewTab = useTabStore(state => state.handleNewTab);
    const handleCloseTab = useTabStore(state => state.handleCloseTab);
    const handleToggleMute = useTabStore(state => state.handleToggleMute);
    const handlePinTab = useTabStore(state => state.handlePinTab);
    const handleUnpinTab = useTabStore(state => state.handleUnpinTab);
    const handleDragStart = useTabStore(state => state.handleDragStart);
    const handleDragOver = useTabStore(state => state.setDragOverItem);
    const handleDragLeave = () => useTabStore.getState().setDragOverItem(null);
    const handleDrop = useTabStore(state => state.handleDrop);
    const handleDropFolder = useTabStore(state => state.handleDropFolder);
    const handleDropRoot = useTabStore(state => state.handleDropRoot);
    
    const setPrivateTabs = useTabStore(state => state.setPrivateTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setGhostTabs = useTabStore(state => state.setGhostTabs);

    const isIncognito = activeSpace === 'ghost';
    const hoverTimeout = useRef(null);

    // Vault Store state for folder open logic (since they belong to folders)
    const [isPrivateFolderOpen, setIsPrivateFolderOpen] = [true, () => {}]; // TODO: Link from useVaultStore or local state?
    // Actually folder state was in App.jsx. I will manage it with local state in Sidebar for now since it's just visual toggle.
    const [localPrivateOpen, setLocalPrivateOpen] = React.useState(true);
    const [localWorkOpen, setLocalWorkOpen] = React.useState(true);

    const handleTabContextMenuClick = (e, tab, spaceType) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(hoverTimeout.current);
        setHoverPreview(null);
        const x = e.clientX + 220 > window.innerWidth ? window.innerWidth - 230 : e.clientX;
        const y = e.clientY + 250 > window.innerHeight ? window.innerHeight - 260 : e.clientY;
        setTabContextMenu({ x, y, tab, spaceType });
    };

    const renderTab = (tab, spaceType) => (
        <div key={tab.id}
            draggable
            onDragStart={(e) => { clearTimeout(hoverTimeout.current); setHoverPreview(null); handleDragStart(e, tab, spaceType); }}
            onDragOver={(e) => { e.preventDefault(); handleDragOver(tab.id); }}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tab, spaceType)}
            onContextMenu={(e) => handleTabContextMenuClick(e, tab, spaceType)}
            onClick={() => {
                const list = spaceType === 'prywatne' ? privateTabs : (spaceType === 'praca' ? workTabs : ghostTabs);
                const setList = spaceType === 'prywatne' ? setPrivateTabs : (spaceType === 'praca' ? setWorkTabs : setGhostTabs);
                setList(list.map(t => ({ ...t, active: t.id === tab.id })));
                useUIStore.getState().setCurrentUrl(tab.url || '');
            }}
            onMouseEnter={(e) => {
                if (draggedItem) return;
                const rect = e.currentTarget.getBoundingClientRect();
                hoverTimeout.current = setTimeout(() => {
                    setHoverPreview({ tab, top: rect.top, left: rect.right + 12 });
                }, 600);
            }}
            onMouseLeave={() => {
                clearTimeout(hoverTimeout.current);
                setHoverPreview(null);
            }}
            className={`group relative flex items-center justify-between p-3 rounded-xl ${tab.active ? 'bg-accent-20 text-accent border-accent-30 shadow-accent' : 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white border-transparent'} border cursor-grab active:cursor-grabbing transition w-full ${tab.isClosing ? 'animate-pop-out' : 'animate-pop-in'} ${dragOverItem === tab.id ? 'border-t-2 border-t-accent' : ''}`}>
            <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                {spaceType === 'ghost' ? (
                    <Ghost size={14} className="flex-shrink-0 opacity-50" />
                ) : (
                    tab.url ? <img src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} alt="icon" className="w-4 h-4 rounded-sm flex-shrink-0" onError={(e) => e.target.style.display = 'none'} /> : <Globe size={14} className="flex-shrink-0 opacity-50" />
                )}
                <span className="text-sm font-medium truncate hidden md:block">{tab.title}</span>
            </div>

            {tab.isAudioPlaying && (
                <div className="absolute right-3 opacity-100 group-hover:opacity-0 transition md:flex hidden pointer-events-none">
                    {tab.isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-accent opacity-80 animate-pulse" />}
                </div>
            )}

            <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition absolute right-2 gap-1 bg-[#1a1a1c] p-1.5 rounded-xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                {tab.isAudioPlaying && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); setPipWindow(tab); showToast('PiP Activated'); }} className="p-1 text-accent opacity-70 hover:opacity-100 hover-bg-accent-10 rounded transition" title="Picture in Picture">
                            <PictureInPicture2 size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleToggleMute(tab.id, spaceType); }} className={`p-1 transition rounded ${tab.isMuted ? 'text-red-400 hover:bg-red-400/20' : 'text-accent opacity-70 hover:opacity-100 hover-bg-accent-10'}`} title={tab.isMuted ? "Unmute" : "Mute"}>
                            {tab.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                    </>
                )}
                {spaceType !== 'ghost' && (
                    <button onClick={(e) => { e.stopPropagation(); handlePinTab(tab); }} className="p-1 text-accent opacity-70 hover:opacity-100 hover-bg-accent-10 rounded transition" title="Pin Tab"><Pin size={12} /></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }} className="p-1 text-accent opacity-70 hover:opacity-100 hover-bg-accent-10 rounded transition" title="Close Tab"><X size={12} /></button>
            </div>
        </div>
    );

    return (
        <aside className={`flex-shrink-0 flex flex-col bg-black/50 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFullscreen || isSidebarHidden ? 'w-0 opacity-0 border-none m-0' : 'w-16 md:w-64 opacity-100'}`}>

            <div className="flex gap-2 p-5 border-b border-white/5 items-center justify-between">
                <div className="flex gap-2">
                    <button className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-400 transition shadow-[0_0_8px_rgba(239,68,68,0.5)] flex items-center justify-center group/btn"><X size={10} className="opacity-0 group-hover/btn:opacity-100 text-black" /></button>
                    <button className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition shadow-[0_0_8px_rgba(234,179,8,0.5)] flex items-center justify-center group/btn"><Minus size={10} className="opacity-0 group-hover/btn:opacity-100 text-black" /></button>
                    <button className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-400 transition shadow-[0_0_8px_rgba(34,197,94,0.5)] flex items-center justify-center group/btn"><Maximize2 size={10} className="opacity-0 group-hover/btn:opacity-100 text-black" /></button>
                </div>
                <div className="hidden md:flex gap-3 text-white/40">
                    <button onClick={() => { setActiveModal('onboarding'); setOnboardingStep(0); }} className="hover-text-accent transition" title="QBrowse Sync Setup"><UserPlus size={14} /></button>
                    <button onClick={() => setActiveModal('history')} className="hover-text-accent transition" title="History"><Clock size={14} /></button>
                    <button onClick={() => setActiveModal('settings')} className="hover-text-accent transition" title="Settings"><Settings size={14} /></button>
                    <button onClick={handleGoHome} className={`transition ${currentUrl === '' ? 'text-accent drop-shadow-[0_0_8px_var(--accent)] scale-110' : 'hover-text-accent'}`} title="Zen Dashboard"><Home size={14} /></button>
                </div>
            </div>

            <div className="px-4 py-4 hidden md:grid grid-cols-4 gap-2 border-b border-white/5 relative z-10">
                {pinnedTabs.map((pin) => (
                    <div key={pin.id} className="relative group flex justify-center animate-pin-in" onContextMenu={(e) => handleTabContextMenuClick(e, pin, 'pinned')}>
                        <button onClick={() => showToast(`Opening ${pin.title}`)} className="w-10 h-10 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group-hover:scale-105 shadow-sm overflow-hidden" title={pin.title}>
                            <img src={`https://www.google.com/s2/favicons?sz=64&domain=${pin.domain}`} alt={pin.title} className="w-6 h-6 rounded-md drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; }} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleUnpinTab(pin); }} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-[#2a251e] border-accent-30 text-accent rounded-full p-0.5 hover:scale-110 bg-accent hover:text-black transition-all shadow-md z-10" title="Unpin"><Minus size={10} /></button>
                    </div>
                ))}
                <div className="relative group flex justify-center animate-pin-in">
                    <button onClick={handleNewTab} className="w-10 h-10 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 border-dashed rounded-xl transition-all hover:scale-105 shadow-sm text-white/40 hover:text-white" title="New Tab">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="relative flex-1 w-full overflow-hidden min-w-[64px]">
                <div className="absolute inset-y-0 left-0 w-[300%] flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ transform: activeSpace === 'prywatne' ? 'translateX(0)' : activeSpace === 'praca' ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}>

                    <div className="w-1/3 h-full flex flex-col gap-1 p-4 pt-2 overflow-y-auto hide-scroll">
                        <div
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('root-prywatne'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropRoot(e, 'prywatne')}
                            className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-prywatne' ? 'border-accent border-dashed bg-accent-10 py-1' : 'border-transparent'}`}
                        >
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-white/30 tracking-widest">Open Tabs</h3>
                            <button onClick={handleNewTab} className="hidden md:flex text-white/30 hover-text-accent transition p-1 hover:bg-white/5 rounded-md" title="New Tab (CMD+T)">
                                <Plus size={12} strokeWidth={2.5} />
                            </button>
                        </div>

                        {privateTabs.filter(t => !t.folderId).map(tab => renderTab(tab, 'prywatne'))}

                        <div
                            onClick={() => setLocalPrivateOpen(!localPrivateOpen)}
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('f1'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropFolder(e, 'prywatne', 'f1')}
                            className={`hidden md:flex group relative items-center gap-3 p-2.5 rounded-xl bg-transparent hover:bg-white/5 text-white/60 hover:text-white border border-transparent cursor-pointer transition w-full mb-1 mt-1 ${dragOverItem === 'f1' ? 'border-accent border-dashed bg-accent-10' : ''}`}
                        >
                            <ChevronRight size={14} className={`text-white/40 group-hover-text-accent transition transform ${localPrivateOpen ? 'rotate-90' : ''}`} />
                            <span className="text-sm font-semibold truncate">QBrowse Project</span>
                        </div>

                        <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 relative w-full pl-3 ${localPrivateOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="hidden md:block absolute left-0 top-1 bottom-1 w-[2px] bg-accent rounded-full opacity-50"></div>
                            {privateTabs.filter(t => t.folderId === 'f1').map(tab => renderTab(tab, 'prywatne'))}
                        </div>
                    </div>

                    <div className="w-1/3 h-full flex flex-col gap-1 p-4 pt-2 overflow-y-auto hide-scroll">
                        <div
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('root-praca'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropRoot(e, 'praca')}
                            className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-praca' ? 'border-blue-400 border-dashed bg-blue-500/10 py-1' : 'border-transparent'}`}
                        >
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-white/30 tracking-widest">Open Tabs</h3>
                            <button onClick={handleNewTab} className="hidden md:flex text-white/30 hover:text-blue-400 transition p-1 hover:bg-white/5 rounded-md" title="New Tab (CMD+T)">
                                <Plus size={12} strokeWidth={2.5} />
                            </button>
                        </div>

                        {workTabs.filter(t => !t.folderId).map(tab => renderTab(tab, 'praca'))}

                        <div
                            onClick={() => setLocalWorkOpen(!localWorkOpen)}
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('f2'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropFolder(e, 'praca', 'f2')}
                            className={`hidden md:flex group relative items-center gap-3 p-2.5 rounded-xl bg-transparent hover:bg-white/5 text-white/60 hover:text-white border border-transparent cursor-pointer transition w-full mb-1 mt-1 ${dragOverItem === 'f2' ? 'border-blue-400 border-dashed bg-blue-500/10' : ''}`}
                        >
                            <ChevronRight size={14} className={`text-white/40 group-hover:text-blue-400 transition transform ${localWorkOpen ? 'rotate-90' : ''}`} />
                            <span className="text-sm font-semibold truncate">Sprint 4 - Docs</span>
                        </div>

                        <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 relative w-full pl-3 ${localWorkOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="hidden md:block absolute left-0 top-1 bottom-1 w-[2px] bg-blue-400 rounded-full opacity-50"></div>
                            {workTabs.filter(t => t.folderId === 'f2').map(tab => renderTab(tab, 'praca'))}
                        </div>
                    </div>

                    <div className="w-1/3 h-full flex flex-col gap-1 p-4 pt-2 overflow-y-auto hide-scroll">
                        <div
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('root-ghost'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropRoot(e, 'ghost')}
                            className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-ghost' ? 'border-[#a855f7] border-dashed bg-[#a855f7]/10 py-1' : 'border-transparent'}`}
                        >
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[#a855f7]/50 tracking-widest">Incognito Tabs</h3>
                            <button onClick={handleNewTab} className="hidden md:flex text-[#a855f7]/50 hover:text-[#a855f7] transition p-1 hover:bg-[#a855f7]/10 rounded-md" title="New Tab (CMD+T)">
                                <Plus size={12} strokeWidth={2.5} />
                            </button>
                        </div>
                        {ghostTabs.map(tab => renderTab(tab, 'ghost'))}
                    </div>

                </div>
            </div>

            <div className="p-3 border-t border-white/5 bg-black/20 flex gap-2">
                <div className="relative flex-1 flex bg-[#121214] p-1 rounded-xl border border-white/5">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-accent-20 border border-accent-30 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-sm ${isIncognito ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={{ transform: activeSpace === 'praca' ? 'translateX(100%)' : 'translateX(0)' }}></div>
                    <button onClick={() => setActiveSpace('prywatne')} className={`relative z-10 flex-1 flex items-center justify-center gap-2 p-1.5 text-xs font-semibold transition-colors duration-300 ${activeSpace === 'prywatne' ? 'text-accent' : 'text-white/40 hover:text-white/80'}`}><User size={14} /> <span className="hidden md:block">Personal</span></button>
                    <button onClick={() => setActiveSpace('praca')} className={`relative z-10 flex-1 flex items-center justify-center gap-2 p-1.5 text-xs font-semibold transition-colors duration-300 ${activeSpace === 'praca' ? 'text-accent' : 'text-white/40 hover:text-white/80'}`}><Layers size={14} /> <span className="hidden md:block">Work</span></button>
                </div>
                <button
                    onClick={() => {
                        setActiveSpace(isIncognito ? 'prywatne' : 'ghost');
                        showToast(!isIncognito ? 'Ghost Mode: Activated' : 'Ghost Mode: Deactivated');
                    }}
                    className={`p-2 rounded-xl transition-all border flex-shrink-0 ${isIncognito ? 'border-accent-30 text-accent bg-accent-20 shadow-accent' : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white'}`}
                    title="Ghost Mode (CMD+Shift+N)"
                >
                    <Ghost size={16} className={isIncognito ? 'text-accent' : ''} />
                </button>
            </div>
        </aside>
    );
}
