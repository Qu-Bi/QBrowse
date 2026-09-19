import React, { useRef } from 'react';
import { X, Minus, Maximize2, UserPlus, Clock, Settings, Home, Plus, ChevronRight, User, Layers, Ghost, PictureInPicture2, VolumeX, Volume2, Pin, Globe, FolderPlus, Check, Edit2, FolderOpen } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useSyncStore from '../../store/useSyncStore';
import useProfileStore, { getAvatarEmoji } from '../../store/useProfileStore';
import useTorStore from '../../store/useTorStore';
import { checkIsArticle, CHECK_ARTICLE_DOM_SCRIPT } from '../../utils/readerExtractor';

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
    const faviconGlow = useUIStore(state => state.settings?.faviconGlow);
    const togglePopover = useUIStore(state => state.togglePopover);
    const activePopover = useUIStore(state => state.activePopover);

    const activeProfileId = useProfileStore(state => state.activeProfileId);
    const profiles = useProfileStore(state => state.profiles);
    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

    // Tab Store State
    const activeSpace = useTabStore(state => state.activeSpace);
    const setActiveSpace = useTabStore(state => state.setActiveSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];
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
    
    const folders = useTabStore(state => state.folders);
    const createFolder = useTabStore(state => state.createFolder);
    const renameFolder = useTabStore(state => state.renameFolder);
    const toggleFolder = useTabStore(state => state.toggleFolder);
    const renamingFolderId = useTabStore(state => state.renamingFolderId);
    const setRenamingFolderId = useTabStore(state => state.setRenamingFolderId);
    
    const setPrivateTabs = useTabStore(state => state.setPrivateTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setGhostTabs = useTabStore(state => state.setGhostTabs);
    const setTorTabs = useTabStore(state => state.setTorTabs);

    const torStatus = useTorStore(state => state.status);
    const isTorEnabled = useTorStore(state => state.isTorEnabled);
    const isIncognito = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const isForceDark = useUIStore(state => state.isForceDark);
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

    const handlePinnedTabClick = (pin) => {
        const tabs = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs));
        const setTabs = activeSpace === 'personal' ? setPrivateTabs : (activeSpace === 'work' ? setWorkTabs : (activeSpace === 'ghost' ? setGhostTabs : setTorTabs));
        
        const existingTab = tabs.find(t => t.pinnedId === pin.id || (t.url && typeof t.url === 'string' && t.url.includes(pin.domain)));
        
        if (existingTab) {
            setTabs(prev => prev.map(t => ({ ...t, active: t.id === existingTab.id })));
            useUIStore.getState().setCurrentUrl(existingTab.url || '');
        } else {
            useTabStore.getState().addTab({ id: `t-${Date.now()}`, pinnedId: pin.id, title: pin.title, url: pin.domain, active: true, folderId: null });
        }
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
                const ui = useUIStore.getState();
                if (ui.isReaderOpen) {
                    ui.closeReaderMode();
                }
                const { isSplitView, focusedPane, setSplitRightTabId } = ui;
                if (isSplitView && focusedPane === 'right') {
                    setSplitRightTabId(tab.id);
                    ui.setCurrentUrl(tab.url || '');
                } else {
                    const list = spaceType === 'personal' ? privateTabs : (spaceType === 'work' ? workTabs : (spaceType === 'ghost' ? ghostTabs : torTabs));
                    const setList = spaceType === 'personal' ? setPrivateTabs : (spaceType === 'work' ? setWorkTabs : (spaceType === 'ghost' ? setGhostTabs : setTorTabs));
                    setList(list.map(t => ({ ...t, active: t.id === tab.id })));
                    ui.setCurrentUrl(tab.url || '');
                }

                // Check Reader Mode availability for the selected tab
                const wv = window.qbrowseWebviews ? window.qbrowseWebviews[tab.id] : null;
                if (wv && typeof wv.executeJavaScript === 'function') {
                    wv.executeJavaScript(CHECK_ARTICLE_DOM_SCRIPT).then(isArticle => {
                        useUIStore.getState().setIsReaderAvailable(!!isArticle);
                    }).catch(() => {
                        useUIStore.getState().setIsReaderAvailable(false);
                    });
                } else {
                    useUIStore.getState().setIsReaderAvailable(false);
                }
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
            onAuxClick={(e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    clearTimeout(hoverTimeout.current);
                    setHoverPreview(null);
                    handleCloseTab(tab.id);
                }
            }}
            className={`group relative flex items-center justify-between p-3 rounded-xl ${tab.active ? 'bg-accent-20 text-accent border-accent-30 shadow-accent' : 'bg-transparent hover:bg-[color:var(--sidebar-bg-hover)] text-[color:var(--sidebar-text-normal)] hover:text-[color:var(--sidebar-text-hover)] border-transparent'} border cursor-grab active:cursor-grabbing w-full ${tab.isClosing ? 'tab-closing-anim' : 'animate-pop-in'} ${dragOverItem === tab.id ? 'border-t-2 border-t-accent' : ''}`}>
            <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                {spaceType === 'ghost' ? (
                    <Ghost size={14} className={`flex-shrink-0 opacity-50 ${tab.suspended ? 'grayscale opacity-30' : ''}`} />
                ) : spaceType === 'tor' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-purple-400 opacity-70 ${tab.suspended ? 'grayscale opacity-30' : ''}`}>
                        <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                        <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                        <circle cx="12" cy="12" r="1.5"/>
                    </svg>
                ) : (
                    tab.url && tab.url !== 'about:blank' ? <img src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} alt="icon" className={`w-4 h-4 rounded-sm flex-shrink-0 transition-all duration-300 ${tab.suspended ? 'grayscale opacity-50' : ''} ${tab.active && faviconGlow !== false ? 'shadow-[0_0_12px_var(--accent)] shadow-accent/60 scale-105' : ''}`} onError={(e) => e.target.style.display = 'none'} /> : <Globe size={14} className={`flex-shrink-0 opacity-50 ${tab.suspended ? 'grayscale opacity-30' : ''}`} />
                )}<span className="text-sm font-medium truncate hidden md:block">{tab.title}</span>
            </div>

            {(tab.isAudioPlaying || tab.isMuted) && (
                <div className="absolute right-3 opacity-100 group-hover:opacity-0 transition md:flex hidden pointer-events-none">
                    {tab.isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-accent opacity-80 animate-pulse" />}
                </div>
            )}

            <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition absolute right-2 gap-1 bg-[#1a1a1c] p-1 rounded-xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.6)] z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleMute(tab.id, spaceType); }} 
                    className={`p-1 transition rounded ${tab.isMuted ? 'text-red-400 hover:bg-red-400/20' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10'}`} 
                    title={tab.isMuted ? "Unmute Tab" : "Mute Tab"}
                >
                    {tab.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>

                {tab.isAudioPlaying && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            useUIStore.getState().sendMediaCommand('toggle-pip'); 
                            showToast('Picture-in-Picture'); 
                        }} 
                        className="p-1 text-accent opacity-70 hover:opacity-100 hover:bg-accent-10 rounded transition" 
                        title="Picture in Picture"
                    >
                        <PictureInPicture2 size={12} />
                    </button>
                )}
                {spaceType !== 'ghost' && spaceType !== 'tor' && tab.url && tab.url !== 'about:blank' && (
                    <button onClick={(e) => { e.stopPropagation(); handlePinTab(tab); }} className="p-1 text-accent opacity-70 hover:opacity-100 hover:bg-accent-10 rounded transition" title="Pin Tab"><Pin size={12} /></button>
                )}
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        clearTimeout(hoverTimeout.current);
                        setHoverPreview(null);
                        handleCloseTab(tab.id); 
                    }} 
                    className="p-1 text-accent opacity-70 hover:opacity-100 hover:bg-accent-10 rounded transition" 
                    title="Close Tab"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );

    const syncUser = useSyncStore(state => state.user);
    const syncStatus = useSyncStore(state => state.syncStatus);
    const isSyncing = useSyncStore(state => state.isSyncing);

    return (
        <aside className={`flex-shrink-0 flex flex-col backdrop-blur-2xl rounded-[2rem] shadow-2xl overflow-hidden relative z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isForceDark || isIncognito ? 'bg-black/50 border border-white/10 text-white/90 sidebar-dark' : 'bg-white/60 border border-black/10 text-black/90 sidebar-light'} ${isFullscreen || isSidebarHidden ? 'w-0 opacity-0 border-none m-0' : 'w-16 md:w-64 opacity-100'}`}>

            <div className="drag-region flex gap-2 p-5 border-b border-[color:var(--sidebar-border)] items-center justify-between">
                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button onClick={() => window.electronAPI.close()} className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-400 transition shadow-[0_0_8px_rgba(239,68,68,0.5)] flex items-center justify-center group/btn"><X size={10} className="opacity-0 group-hover/btn:opacity-100 text-black" /></button>
                    <button onClick={() => window.electronAPI.minimize()} className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition shadow-[0_0_8px_rgba(234,179,8,0.5)] flex items-center justify-center group/btn"><Minus size={10} className="opacity-0 group-hover/btn:opacity-100 text-black" /></button>
                    <button onClick={() => window.electronAPI.maximize()} className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-400 transition shadow-[0_0_8px_rgba(34,197,94,0.5)] flex items-center justify-center group/btn"><Maximize2 size={10} className="opacity-0 group-hover/btn:opacity-100 text-black" /></button>
                </div>
                <div className="hidden md:flex gap-3 text-[color:var(--sidebar-text-muted)] items-center" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button 
                        onClick={() => togglePopover('user')} 
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all hover:scale-110 cursor-pointer relative ${
                            activePopover === 'user' || activePopover === 'userProfile'
                                ? 'bg-accent-20 border-accent text-accent shadow-[0_0_10px_var(--accent)]'
                                : 'bg-white/10 border-white/20 text-white/70 hover:text-white'
                        }`} 
                        style={{ borderColor: activeProfile?.color || '#d4bc94' }}
                        title={`Profile: ${activeProfile?.name || 'Default'} & Cloud Sync`}
                    >
                        {localStorage.getItem('qbrowse_profile_avatar_url') ? (
                            <img src={localStorage.getItem('qbrowse_profile_avatar_url')} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="text-xs">
                                {getAvatarEmoji(activeProfile?.avatar)}
                            </span>
                        )}
                        {syncUser && (
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                                isSyncing ? 'bg-blue-400 animate-ping' :
                                syncStatus === 'synced' ? 'bg-emerald-400' :
                                'bg-white/40'
                            }`} />
                        )}
                    </button>
                    <button onClick={() => setActiveModal('history')} className="hover:text-accent transition" title="History"><Clock size={14} /></button>
                    <button onClick={() => setActiveModal('settings')} className="hover:text-accent transition" title="Settings"><Settings size={14} /></button>
                    <button onClick={handleGoHome} className={`transition ${currentUrl === '' || currentUrl === 'about:blank' ? 'text-accent drop-shadow-[0_0_8px_var(--accent)] scale-110' : 'hover:text-accent'}`} title="Zen Dashboard"><Home size={14} /></button>
                </div>
            </div>

            <div className="px-4 py-4 hidden md:grid grid-cols-4 gap-2 border-b border-[color:var(--sidebar-border)] relative z-10">
                {pinnedTabs.map((pin) => {
                    const tabs = activeSpace === 'personal' ? privateTabs : activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs);
                    const isActive = tabs.find(t => t.active)?.pinnedId === pin.id || tabs.find(t => t.active && t.url && typeof t.url === 'string' && t.url.includes(pin.domain));
                    return (
                    <div key={pin.id} className="relative group flex justify-center animate-pin-in" onContextMenu={(e) => handleTabContextMenuClick(e, pin, 'pinned')}>
                        <button onClick={() => handlePinnedTabClick(pin)} className={`w-10 h-10 flex flex-col items-center justify-center border rounded-xl transition-all shadow-sm overflow-hidden ${isActive ? 'bg-[color:var(--sidebar-bg-active)] border-white/30 scale-105' : 'bg-[color:var(--sidebar-bg-hover)] hover:bg-[color:var(--sidebar-bg-active)] border-[color:var(--sidebar-border)] group-hover:scale-105'}`} title={pin.title}>
                            <img src={`https://www.google.com/s2/favicons?sz=64&domain=${pin.domain}`} alt={pin.title} className="w-6 h-6 rounded-md drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; }} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleUnpinTab(pin); }} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-[#2a251e] border-accent-30 text-accent rounded-full p-0.5 hover:scale-110 bg-accent hover:text-black transition-all shadow-md z-10" title="Unpin"><Minus size={10} /></button>
                    </div>
                )})}
                <div className="relative group flex justify-center animate-pin-in">
                    <button onClick={() => setActiveModal('addPin')} className="w-10 h-10 flex flex-col items-center justify-center bg-[color:var(--sidebar-bg-hover)] hover:bg-[color:var(--sidebar-bg-active)] border border-[color:var(--sidebar-border)] border-dashed rounded-xl transition-all hover:scale-105 shadow-sm text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer" title="Pin New App / Shortcut">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="relative flex-1 w-full overflow-hidden min-w-[64px]">
                <div className="absolute inset-y-0 left-0 w-[400%] flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ transform: activeSpace === 'personal' ? 'translateX(0)' : activeSpace === 'work' ? 'translateX(-25%)' : activeSpace === 'ghost' ? 'translateX(-50%)' : 'translateX(-75%)' }}>

                    {/* PERSONAL TABS */}
                    <div 
                        className="w-1/4 h-full flex flex-col gap-1 p-4 pt-2 overflow-y-auto hide-scroll"
                        onDragOver={(e) => { e.preventDefault(); handleDragOver('root-personal'); }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropRoot(e, 'personal')}
                    >
                        <div className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-personal' ? 'border-accent border-dashed bg-accent-10 py-1' : 'border-transparent'}`}>
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[color:var(--sidebar-text-muted)] tracking-widest">Open Tabs</h3>
                            <button onClick={() => handleNewTab()} className="hidden md:flex text-[color:var(--sidebar-text-muted)] hover:text-accent transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Tab (CMD+T)">
                                <Plus size={12} strokeWidth={2.5} />
                            </button>
                        </div>
                        {(() => {
                            const filtered = privateTabs.filter(t => !t.pinnedId && !pinnedTabs.some(p => t.url && typeof t.url === 'string' && t.url.includes(p.domain)));
                            if (filtered.length === 0) {
                                return (
                                    <button onClick={() => handleNewTab()} className="group relative flex items-center justify-between p-3 rounded-xl bg-[color:var(--sidebar-bg-hover)] border border-[color:var(--sidebar-border)] border-dashed text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer transition w-full shadow-sm animate-pop-in">
                                        <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                            <Plus size={14} className="flex-shrink-0 opacity-50" />
                                            <span className="text-sm font-medium truncate hidden md:block italic">New Tab</span>
                                        </div>
                                    </button>
                                );
                            }
                            return filtered.map(tab => renderTab(tab, 'personal'));
                        })()}
                    </div>

                    {/* WORK TABS */}
                    <div 
                        className="w-1/4 h-full flex flex-col gap-1 p-4 pt-2 overflow-y-auto hide-scroll"
                        onDragOver={(e) => { e.preventDefault(); handleDragOver('root-work'); }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropRoot(e, 'work')}
                    >
                        <div className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-work' ? 'border-blue-400 border-dashed bg-blue-500/10 py-1' : 'border-transparent'}`}>
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[color:var(--sidebar-text-muted)] tracking-widest">Open Tabs</h3>
                            <button onClick={() => handleNewTab()} className="hidden md:flex text-[color:var(--sidebar-text-muted)] hover:text-blue-400 transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Tab (CMD+T)">
                                <Plus size={12} strokeWidth={2.5} />
                            </button>
                        </div>
                        {(() => {
                            const filtered = workTabs.filter(t => !t.pinnedId && !pinnedTabs.some(p => t.url && typeof t.url === 'string' && t.url.includes(p.domain)));
                            if (filtered.length === 0) {
                                return (
                                    <button onClick={() => handleNewTab()} className="group relative flex items-center justify-between p-3 rounded-xl bg-[color:var(--sidebar-bg-hover)] border border-[color:var(--sidebar-border)] border-dashed text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer transition w-full shadow-sm animate-pop-in">
                                        <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                            <Plus size={14} className="flex-shrink-0 opacity-50" />
                                            <span className="text-sm font-medium truncate hidden md:block italic">New Tab</span>
                                        </div>
                                    </button>
                                );
                            }
                            return filtered.map(tab => renderTab(tab, 'work'));
                        })()}
                    </div>

                    {/* GHOST TABS */}
                    <div 
                        className="w-1/4 h-full flex flex-col gap-1 p-4 pt-2 overflow-y-auto hide-scroll"
                        onDragOver={(e) => { e.preventDefault(); handleDragOver('root-ghost'); }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropRoot(e, 'ghost')}
                    >
                        <div className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-ghost' ? 'border-[#a855f7] border-dashed bg-[#a855f7]/10 py-1' : 'border-transparent'}`}>
                            <div className="flex items-center gap-1.5">
                                <h3 className="hidden md:block text-[10px] uppercase font-bold text-[#a855f7]/60 tracking-widest">Incognito Tabs</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => useTorStore.getState().toggleTorEnabled(true)}
                                    className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/15 transition border border-purple-500/20" 
                                    title="Enable Tor Onion Routing (converts private space to Tor space)"
                                >
                                    <span>🧅</span> Tor Mode
                                </button>
                                <button onClick={() => handleNewTab()} className="hidden md:flex text-[#a855f7]/50 hover:text-[#a855f7] transition p-1 hover:bg-[#a855f7]/10 rounded-md" title="New Incognito Tab (CMD+T)">
                                    <Plus size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                        {(() => {
                            const filtered = ghostTabs.filter(t => !t.pinnedId && !pinnedTabs.some(p => t.url && typeof t.url === 'string' && t.url.includes(p.domain)));
                            if (filtered.length === 0) {
                                return (
                                    <button onClick={() => handleNewTab()} className="group relative flex items-center justify-between p-3 rounded-xl bg-[color:var(--sidebar-bg-hover)] border border-[color:var(--sidebar-border)] border-dashed text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer transition w-full shadow-sm animate-pop-in">
                                        <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                            <Plus size={14} className="flex-shrink-0 opacity-50" />
                                            <span className="text-sm font-medium truncate hidden md:block italic">New Incognito Tab</span>
                                        </div>
                                    </button>
                                );
                            }
                            return filtered.map(tab => renderTab(tab, 'ghost'));
                        })()}
                    </div>

                    {/* TOR TABS */}
                    <div 
                        className="w-1/4 h-full flex flex-col gap-1 p-4 pt-2 overflow-y-auto hide-scroll"
                        onDragOver={(e) => { e.preventDefault(); handleDragOver('root-tor'); }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropRoot(e, 'tor')}
                    >
                        <div className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-tor' ? 'border-purple-400 border-dashed bg-purple-500/10 py-1' : 'border-transparent'}`}>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${torStatus === 'connected' ? 'bg-purple-400 shadow-[0_0_6px_#c084fc]' : 'bg-amber-400'}`}></span>
                                <h3 className="hidden md:block text-[10px] uppercase font-bold text-purple-400/80 tracking-widest">Tor Tabs</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => useTorStore.getState().toggleTorEnabled(false)}
                                    className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition border border-white/10" 
                                    title="Turn off Tor and return to Ghost mode"
                                >
                                    <span>👻</span> Ghost
                                </button>
                                <button onClick={() => handleNewTab()} className="hidden md:flex text-purple-400/60 hover:text-purple-300 transition p-1 hover:bg-purple-500/10 rounded-md" title="New Tor Tab (CMD+T)">
                                    <Plus size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                        {(() => {
                            const filtered = (torTabs || []).filter(t => !t.pinnedId && !pinnedTabs.some(p => t.url && typeof t.url === 'string' && t.url.includes(p.domain)));
                            if (filtered.length === 0) {
                                return (
                                    <button onClick={() => handleNewTab()} className="group relative flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 border-dashed text-purple-300/60 hover:text-purple-200 cursor-pointer transition w-full shadow-sm animate-pop-in">
                                        <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                            <Plus size={14} className="flex-shrink-0 opacity-50" />
                                            <span className="text-sm font-medium truncate hidden md:block italic">New Tor Tab</span>
                                        </div>
                                    </button>
                                );
                            }
                            return filtered.map(tab => renderTab(tab, 'tor'));
                        })()}
                    </div>

                </div>
            </div>

            <div className="p-3 border-t border-[color:var(--sidebar-border)] bg-transparent flex gap-2">
                <div className="relative flex-1 flex bg-[color:var(--sidebar-bg-hover)] p-1 rounded-xl border border-[color:var(--sidebar-border)]">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-accent-20 border border-accent-30 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-sm ${isIncognito || isTor ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={{ transform: activeSpace === 'work' ? 'translateX(100%)' : 'translateX(0)' }}></div>
                    <button onClick={() => setActiveSpace('personal')} className={`relative z-10 flex-1 flex items-center justify-center gap-2 p-1.5 text-xs font-semibold transition-colors duration-300 ${activeSpace === 'personal' ? 'text-accent' : 'text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)]'}`}><User size={14} /> <span className="hidden md:block">Personal</span></button>
                    <button onClick={() => setActiveSpace('work')} className={`relative z-10 flex-1 flex items-center justify-center gap-2 p-1.5 text-xs font-semibold transition-colors duration-300 ${activeSpace === 'work' ? 'text-accent' : 'text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)]'}`}><Layers size={14} /> <span className="hidden md:block">Work</span></button>
                </div>

                {/* Animated Morphing Ghost <-> Onion Button */}
                <button
                    onClick={() => {
                        if (isTorEnabled) {
                            setActiveSpace(isTor ? 'personal' : 'tor');
                            showToast(!isTor ? 'Tor Space: Activated' : 'Tor Space: Deactivated');
                        } else {
                            setActiveSpace(isIncognito ? 'personal' : 'ghost');
                            showToast(!isIncognito ? 'Ghost Mode: Activated' : 'Ghost Mode: Deactivated');
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        useTorStore.getState().toggleTorEnabled();
                    }}
                    className={`relative p-2 rounded-xl transition-all duration-300 border flex-shrink-0 overflow-hidden group ${
                        (isTorEnabled ? isTor : isIncognito)
                            ? (isTorEnabled 
                                ? 'border-purple-500/40 text-purple-300 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.35)]' 
                                : 'border-accent-30 text-accent bg-accent-20 shadow-accent')
                            : (isTorEnabled
                                ? 'border-transparent text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10'
                                : 'border-transparent text-[color:var(--sidebar-text-muted)] hover:bg-[color:var(--sidebar-bg-hover)] hover:text-[color:var(--sidebar-text-hover)]')
                    }`}
                    title={isTorEnabled 
                        ? (isTor ? "Tor Space Active (Click to switch to Personal • Right-click to switch to Ghost)" : "Enter Tor Space • Right-click to switch to Ghost")
                        : (isIncognito ? "Ghost Mode Active (Click to switch to Personal • Right-click to enable Tor)" : "Ghost Mode (CMD+Shift+N) • Right-click to enable Tor")
                    }
                >
                    {/* Dual Layered Icons Container with Spring 3D Rotation */}
                    <div className="relative w-4 h-4 flex items-center justify-center pointer-events-none">
                        {/* Ghost Icon */}
                        <div
                            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                isTorEnabled
                                    ? 'opacity-0 rotate-90 scale-0 pointer-events-none'
                                    : 'opacity-100 rotate-0 scale-100'
                            }`}
                        >
                            <Ghost size={16} className={isIncognito ? 'text-accent' : ''} />
                        </div>

                        {/* Onion Icon */}
                        <div
                            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                isTorEnabled
                                    ? 'opacity-100 rotate-0 scale-100'
                                    : 'opacity-0 -rotate-90 scale-0 pointer-events-none'
                            }`}
                        >
                            <svg 
                                viewBox="0 0 24 24" 
                                width="16" 
                                height="16" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2.2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className={isTor ? 'text-purple-300' : 'text-purple-400'}
                            >
                                <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                                <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                                <circle cx="12" cy="12" r="1.5"/>
                            </svg>
                        </div>
                    </div>

                    {/* Tor Active / Bootstrapping Status Dot */}
                    {isTorEnabled && torStatus === 'connected' && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc] animate-pulse"></span>
                    )}
                    {isTorEnabled && (torStatus === 'starting' || torStatus === 'downloading') && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-ping"></span>
                    )}
                </button>
            </div>
        </aside>
    );
}
