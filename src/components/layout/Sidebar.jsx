import React, { useRef } from 'react';
import { 
    X, Minus, Maximize2, UserPlus, Clock, Settings, Home, Plus, ChevronRight, 
    User, Layers, Ghost, PictureInPicture2, VolumeX, Volume2, Pin, Globe, 
    FolderPlus, Check, Edit2, FolderOpen, Briefcase, Code, Rocket, Compass, 
    Bookmark, Sparkles, Coffee, Folder, Terminal, Shield, Heart
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useSyncStore from '../../store/useSyncStore';
import useProfileStore from '../../store/useProfileStore';
import { renderProfileAvatar } from '../popovers/UserProfilePopover';
import useTorStore from '../../store/useTorStore';
import { checkIsArticle, CHECK_ARTICLE_DOM_SCRIPT } from '../../utils/readerExtractor';
import PinnedStackPopup, { isTabForPin } from './PinnedStackPopup';
import GitHubLiveFolder from './GitHubLiveFolder';
import GitHubGlancePopover from './GitHubGlancePopover';
import { useGitHubStore } from '../../store/useGitHubStore';

const SPACE_ICONS = {
    User,
    Layers,
    Briefcase,
    Code,
    Rocket,
    Compass,
    Bookmark,
    Sparkles,
    Globe,
    Coffee,
    Folder,
    Terminal,
    Shield,
    Heart,
};

const getSpaceIcon = (iconName, props = {}) => {
    const IconComp = (iconName && SPACE_ICONS[iconName]) ? SPACE_ICONS[iconName] : Layers;
    return <IconComp {...props} />;
};

export default function Sidebar() {
    // UI Store State
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isSidebarPeeking = useUIStore(state => state.isSidebarPeeking);
    const setIsSidebarPeeking = useUIStore(state => state.setIsSidebarPeeking);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const isHomeActive = useUIStore(state => !state.currentUrl || state.currentUrl === 'about:blank');
    const setHoverPreview = useUIStore(state => state.setHoverPreview);
    const showToast = useUIStore(state => state.showToast);
    const setPipWindow = useUIStore(state => state.setPipWindow);
    const setActiveModal = useUIStore(state => state.openModal);
    const setOnboardingStep = useUIStore(state => state.setOnboardingStep);
    const setTabContextMenu = useUIStore(state => state.setTabContextMenu);
    const setPinnedContextMenu = useUIStore(state => state.setPinnedContextMenu);
    const setFolderContextMenu = useUIStore(state => state.setFolderContextMenu);
    const faviconGlow = useUIStore(state => state.settings?.faviconGlow);
    const isReducedMotion = useUIStore(state => Boolean(state.settings?.a11yReducedMotion || state.isSystemReducedMotion));
    const togglePopover = useUIStore(state => state.togglePopover);
    const activePopover = useUIStore(state => state.activePopover);
    const activePinnedStack = useUIStore(state => state.activePinnedStack);
    const setActivePinnedStack = useUIStore(state => state.setActivePinnedStack);
    const closePinnedStack = useUIStore(state => state.closePinnedStack);

    const activeProfileId = useProfileStore(state => state.activeProfileId);
    const isPeeking = isFullscreen && isSidebarPeeking;
    const isActuallyHidden = isFullscreen ? !isPeeking : isSidebarHidden;
    const peekLeaveTimeoutRef = useRef(null);

    const handleSidebarMouseEnter = () => {
        if (peekLeaveTimeoutRef.current) {
            clearTimeout(peekLeaveTimeoutRef.current);
            peekLeaveTimeoutRef.current = null;
        }
    };

    const handleSidebarMouseLeave = () => {
        if (isFullscreen && isSidebarPeeking) {
            peekLeaveTimeoutRef.current = setTimeout(() => {
                setIsSidebarPeeking(false);
            }, 200);
        }
    };
    const profiles = useProfileStore(state => state.profiles);
    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

    // Tab Store State
    const activeSpace = useTabStore(state => state.activeSpace);
    const setActiveSpace = useTabStore(state => state.setActiveSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];
    const customSpaceTabs = useTabStore(state => state.customSpaceTabs) || {};
    const getTabsForSpace = useTabStore(state => state.getTabsForSpace);
    const setTabsForSpace = useTabStore(state => state.setTabsForSpace);
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
    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light' && !isIncognito && !isTor;
    const hoverTimeout = useRef(null);
    const ghHoverTimeoutRef = useRef(null);
    const openHoverGlance = useGitHubStore(state => state.openHoverGlance);
    const closeHoverGlance = useGitHubStore(state => state.closeHoverGlance);

    React.useEffect(() => {
        useGitHubStore.getState().syncWithConfig();
    }, []);

    // Vault Store state for folder open logic (since they belong to folders)
    const [isPrivateFolderOpen, setIsPrivateFolderOpen] = [true, () => {}]; // TODO: Link from useVaultStore or local state?
    // Actually folder state was in App.jsx. I will manage it with local state in Sidebar for now since it's just visual toggle.
    const [localPrivateOpen, setLocalPrivateOpen] = React.useState(true);
    const [localWorkOpen, setLocalWorkOpen] = React.useState(true);
    const customSpaces = useUIStore(state => state.settings?.customSpaces || [
        { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
        { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
    ]);
    const addSpace = useUIStore(state => state.addSpace);
    const updateSpace = useUIStore(state => state.updateSpace);
    const removeSpace = useUIStore(state => state.removeSpace);
    const reorderSpaces = useUIStore(state => state.reorderSpaces);
    const openSettings = useUIStore(state => state.openSettings);

    const renamingSpaceId = useUIStore(state => state.renamingSpaceId);
    const setRenamingSpaceId = useUIStore(state => state.setRenamingSpaceId);
    const [renameValue, setRenameValue] = React.useState('');
    const [activeRenamingSpace, setActiveRenamingSpace] = React.useState(null);
    const [isRenamingClosing, setIsRenamingClosing] = React.useState(false);
    const closeRenameTimerRef = React.useRef(null);

    React.useEffect(() => {
        if (renamingSpaceId) {
            const target = customSpaces.find(s => s.id === renamingSpaceId);
            if (target) {
                if (closeRenameTimerRef.current) clearTimeout(closeRenameTimerRef.current);
                setActiveRenamingSpace(target);
                setRenameValue(target.name || '');
                setIsRenamingClosing(false);
            }
        } else {
            if (activeRenamingSpace && !isRenamingClosing) {
                setIsRenamingClosing(true);
                closeRenameTimerRef.current = setTimeout(() => {
                    setActiveRenamingSpace(null);
                    setIsRenamingClosing(false);
                }, 200);
            }
        }
        return () => {
            if (closeRenameTimerRef.current) clearTimeout(closeRenameTimerRef.current);
        };
    }, [renamingSpaceId, customSpaces, activeRenamingSpace, isRenamingClosing]);

    const closeRenamePopover = React.useCallback(() => {
        if (isRenamingClosing) return;
        setRenamingSpaceId(null);
    }, [isRenamingClosing, setRenamingSpaceId]);

    const handleQuickAddSpace = () => {
        if (customSpaces.length >= 8) {
            showToast('Maximum of 8 workspaces reached');
            return;
        }
        const nextIdx = customSpaces.length + 1;
        const name = `Workspace ${nextIdx}`;
        if (addSpace) {
            const newSp = addSpace(name, 'Layers', false);
            if (newSp?.id) {
                setActiveSpace(newSp.id);
                setRenamingSpaceId(newSp.id);
            }
        }
    };

    const handleSpaceContextMenu = (e, sp) => {
        e.preventDefault();
        e.stopPropagation();
        useUIStore.getState().closeContextMenus();
        useUIStore.getState().setSpaceContextMenu({
            x: e.clientX,
            y: e.clientY,
            space: sp
        });
    };

    const [dragPos, setDragPos] = React.useState(null);
    const [hoveredSpace, setHoveredSpace] = React.useState(null);

    React.useEffect(() => {
        if (!draggedItem) {
            setDragPos(null);
            return;
        }
        const handleWindowDragOver = (e) => {
            e.preventDefault();
            if (e.clientX > 0 || e.clientY > 0) {
                setDragPos({ x: e.clientX, y: e.clientY });
            }
        };
        const handleDragEndWindow = () => {
            setDragPos(null);
            useTabStore.getState().setDraggedItem(null);
            useTabStore.getState().setDragOverItem(null);
        };
        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('dragend', handleDragEndWindow);
        window.addEventListener('drop', handleDragEndWindow);
        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('dragend', handleDragEndWindow);
            window.removeEventListener('drop', handleDragEndWindow);
        };
    }, [draggedItem]);

    // Safety auto-heal: guarantee the current space never gets stuck with zero tabs
    React.useEffect(() => {
        const tabs = getTabsForSpace ? getTabsForSpace(activeSpace) : (activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs)));
        if (tabs && tabs.length === 0) {
            handleNewTab('', true);
        }
    }, [activeSpace, privateTabs, workTabs, ghostTabs, torTabs, customSpaceTabs, getTabsForSpace, handleNewTab]);

    const handleTabContextMenuClick = (e, tab, spaceType) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(hoverTimeout.current);
        setHoverPreview(null);
        setTabContextMenu({ x: e.clientX, y: e.clientY, tab, spaceType, openedAt: Date.now() });
    };

    const handlePinnedTabClick = (e, pin) => {
        const tabs = getTabsForSpace ? getTabsForSpace(activeSpace) : (activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs)));
        const setTabs = (updater) => setTabsForSpace ? setTabsForSpace(activeSpace, updater) : (activeSpace === 'personal' ? setPrivateTabs(updater) : (activeSpace === 'work' ? setWorkTabs(updater) : (activeSpace === 'ghost' ? setGhostTabs(updater) : setTorTabs(updater))));
        
        const pinTabs = tabs.filter(t => isTabForPin(t, pin));
        const activeTabInStack = pinTabs.find(t => t.active);

        if (activeTabInStack) {
            // User is ALREADY viewing one of the tabs in this service stack!
            // Toggle the Stack Popup Picker:
            if (activePinnedStack?.pin?.id === pin.id) {
                closePinnedStack();
            } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setActivePinnedStack({ pin, rect });
            }
        } else if (pinTabs.length > 0) {
            // User is not viewing this stack. Switch to the first tab in this stack!
            const targetTab = pinTabs[0];
            setTabs(tabs.map(t => ({ 
                ...t, 
                active: t.id === targetTab.id,
                suspended: t.id === targetTab.id ? false : t.suspended,
                lastActiveAt: t.id === targetTab.id ? Date.now() : t.lastActiveAt
            })));
            useUIStore.getState().setCurrentUrl(targetTab.url || '');
            closePinnedStack();
            setTimeout(() => {
                const wv = window.qbrowseWebviews ? window.qbrowseWebviews[targetTab.id] : null;
                if (wv && typeof wv.focus === 'function') {
                    try { wv.focus(); } catch (_) {}
                }
            }, 30);
        } else {
            // No tabs open for this service yet: create a new tab for this pinned service
            const targetUrl = pin.domain.startsWith('http') ? pin.domain : `https://${pin.domain}`;
            useTabStore.getState().addTab({
                id: `t-${Date.now()}`,
                pinnedId: pin.id,
                title: pin.title,
                url: targetUrl,
                active: true,
                folderId: null
            });
            closePinnedStack();
        }
    };

    const handlePinnedContextMenu = (e, pin) => {
        e.preventDefault();
        e.stopPropagation();
        closePinnedStack();
        setPinnedContextMenu({ x: e.clientX, y: e.clientY, pin, openedAt: Date.now() });
    };

    const handlePinnedAuxClick = (e, pin) => {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            const targetUrl = pin.domain.startsWith('http') ? pin.domain : `https://${pin.domain}`;
            useTabStore.getState().addTab({
                id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                pinnedId: pin.id,
                title: pin.title,
                url: targetUrl,
                active: false,
                folderId: null
            });
            useUIStore.getState().showToast(`Opened ${pin.title} in background tab`);
        }
    };

    const handleNewTabAuxClick = (e) => {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            handleNewTab('', false);
        }
    };

    const renderTab = (tab, spaceType) => (
        <div key={tab.id}
            draggable
            onDragStart={(e) => { 
                clearTimeout(hoverTimeout.current); 
                setHoverPreview(null); 
                if (e.dataTransfer) {
                    try {
                        const emptyImg = new Image();
                        emptyImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
                        e.dataTransfer.setDragImage(emptyImg, 0, 0);
                    } catch (_) {}
                }
                handleDragStart(e, tab, spaceType); 
            }}
            onDragEnd={() => {
                setDragPos(null);
                useTabStore.getState().setDraggedItem(null);
                useTabStore.getState().setDragOverItem(null);
            }}
            onDragOver={(e) => { e.preventDefault(); handleDragOver(tab.id); }}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tab, spaceType)}
            onContextMenu={(e) => handleTabContextMenuClick(e, tab, spaceType)}
            onClick={() => {
                const ui = useUIStore.getState();
                if (ui.isReaderOpen) {
                    ui.closeReaderMode();
                }
                const { isSplitView, focusedPane, setSplitRightTabId, splitRightTabId } = ui;
                if (isSplitView && focusedPane === 'right') {
                    setSplitRightTabId(tab.id);
                    ui.setCurrentUrl(tab.url || '');
                } else {
                    const list = getTabsForSpace ? getTabsForSpace(spaceType) : (spaceType === 'personal' ? privateTabs : (spaceType === 'work' ? workTabs : (spaceType === 'ghost' ? ghostTabs : torTabs)));
                    const setList = (updater) => setTabsForSpace ? setTabsForSpace(spaceType, updater) : (spaceType === 'personal' ? setPrivateTabs(updater) : (spaceType === 'work' ? setWorkTabs(updater) : (spaceType === 'ghost' ? setGhostTabs(updater) : setTorTabs(updater))));
                    if (isSplitView && splitRightTabId === tab.id) {
                        const otherTab = (list || []).find(t => t.id !== tab.id);
                        setSplitRightTabId(otherTab ? otherTab.id : null);
                    }
                    setList((list || []).map(t => ({ 
                        ...t, 
                        active: t.id === tab.id,
                        suspended: t.id === tab.id ? false : t.suspended,
                        lastActiveAt: t.id === tab.id ? Date.now() : t.lastActiveAt
                    })));
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
                    // Always read the latest tab state from useTabStore so the freshest thumbnail is shown
                    const storeState = useTabStore.getState();
                    const allTabs = storeState.getTabsForSpace ? storeState.getTabsForSpace(spaceType) : (
                        spaceType === 'personal' ? storeState.privateTabs
                        : spaceType === 'work' ? storeState.workTabs
                        : spaceType === 'ghost' ? storeState.ghostTabs
                        : storeState.torTabs
                    );
                    const latestTab = (allTabs || []).find(t => t.id === tab.id) || tab;
                    setHoverPreview({ tab: latestTab, top: rect.top, left: rect.right + 12 });

                    // On-demand live thumbnail capture if missing and webview is active
                    if (!latestTab.thumbnail && window.qbrowseWebviews?.[tab.id]) {
                        const wv = window.qbrowseWebviews[tab.id];
                        if (wv && typeof wv.capturePage === 'function') {
                            wv.capturePage().then(img => {
                                if (img && !img.isEmpty()) {
                                    const thumbnail = typeof img.resize === 'function' ? img.resize({ width: 320 }).toDataURL() : img.toDataURL();
                                    useTabStore.getState().updateTabThumbnail(tab.id, thumbnail);
                                    setHoverPreview(prev => (prev?.tab?.id === tab.id ? { ...prev, tab: { ...prev.tab, thumbnail } } : prev));
                                }
                            }).catch(() => {});
                        }
                    }
                }, 400);
            }}
            onMouseLeave={() => {
                clearTimeout(hoverTimeout.current);
                setHoverPreview(null);
            }}
            onMouseDown={(e) => {
                if (e.button === 1) e.preventDefault();
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
            className={`sidebar-tab-item group relative flex items-center justify-between ${uiScale === 'compact' ? 'py-2 px-2.5 rounded-lg' : 'p-3 rounded-xl'} border cursor-grab active:cursor-grabbing w-full select-none transition-all duration-200 ${tab.isClosing ? 'tab-closing-anim' : 'animate-pop-in'} ${dragOverItem === tab.id ? 'border-t-2 border-t-accent' : ''} ${draggedItem?.tab?.id === tab.id ? 'opacity-35 scale-[0.98]' : ''} ${
                tab.active 
                    ? (isBright 
                        ? 'bg-white/80 border-black/[0.08] text-zinc-950 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)]' 
                        : 'text-accent font-semibold') 
                    : (isBright 
                        ? 'bg-transparent hover:bg-black/[0.04] text-zinc-700 hover:text-zinc-950 border-transparent' 
                        : 'bg-transparent hover:bg-[color:var(--sidebar-bg-hover)] text-[color:var(--sidebar-text-normal)] hover:text-[color:var(--sidebar-text-hover)] border-transparent')
            }`}
            style={tab.active && !isBright ? { 
                borderColor: 'var(--accent-40)', 
                backgroundColor: 'var(--accent-15)',
                boxShadow: draggedItem?.tab?.id === tab.id ? 'none' : '0 0 18px var(--accent-30)'
            } : undefined}>
            <div className="flex items-center gap-2.5 w-full justify-center md:justify-start pointer-events-none pr-8">
                {spaceType === 'ghost' ? (
                    <Ghost size={14} className={`flex-shrink-0 transition-colors duration-200 ${tab.active ? (isBright ? 'text-zinc-800' : 'text-accent') : 'opacity-50'} ${tab.suspended ? 'grayscale opacity-30' : ''}`} />
                ) : spaceType === 'tor' ? (
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-purple-400 opacity-70 transition-colors duration-200 ${tab.suspended ? 'grayscale opacity-30' : ''}`}>
                        <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                        <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                        <circle cx="12" cy="12" r="1.5"/>
                    </svg>
                ) : (
                    tab.url && tab.url !== 'about:blank' ? <img src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} alt="icon" className={`w-4 h-4 rounded-sm flex-shrink-0 transition-all duration-300 ${tab.suspended ? 'grayscale opacity-50' : ''} ${tab.active && faviconGlow !== false ? 'shadow-[0_0_12px_var(--accent)] shadow-accent/60 scale-105' : ''}`} onError={(e) => e.target.style.display = 'none'} /> : <Globe size={14} className={`flex-shrink-0 transition-colors duration-200 ${tab.active ? (isBright ? 'text-zinc-800' : 'text-accent') : 'opacity-50'} ${tab.suspended ? 'grayscale opacity-30' : ''}`} />
                )}<span className={`${uiScale === 'compact' ? 'text-xs' : 'text-sm'} truncate hidden md:block transition-colors duration-200 ${tab.active ? (isBright ? 'font-bold text-zinc-950' : 'font-semibold text-accent') : 'font-medium'}`}>
                    {(!tab.title || tab.title === 'about:blank' || tab.title === '') ? (spaceType === 'ghost' ? 'New Incognito Tab' : 'New Tab') : tab.title}
                </span>
            </div>

            {(tab.isAudioPlaying || tab.isMuted) && (
                <div className="absolute right-3 opacity-100 group-hover:opacity-0 transition-opacity duration-200 md:flex hidden pointer-events-none">
                    {tab.isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-accent opacity-80 animate-pulse" />}
                </div>
            )}

            <div className={`hidden md:flex opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] absolute right-2 gap-0.5 ${isBright ? 'bg-white/90 border border-black/[0.08] text-zinc-700 shadow-sm' : 'bg-[#1a1a1c]/95 border border-white/10 text-white shadow-sm'} p-1 rounded-xl z-20`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleMute(tab.id, spaceType); }} 
                    className={`p-1 rounded transition-all duration-150 hover:scale-115 active:scale-85 ${tab.isMuted ? 'text-red-500 hover:bg-red-500/20' : (isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10')}`} 
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
                        className={`p-1 rounded transition-all duration-150 hover:scale-115 active:scale-85 ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10'}`} 
                        title="Picture in Picture"
                    >
                        <PictureInPicture2 size={12} />
                    </button>
                )}
                {spaceType !== 'ghost' && spaceType !== 'tor' && tab.url && tab.url !== 'about:blank' && (
                    <button onClick={(e) => { e.stopPropagation(); handlePinTab(tab); }} className={`p-1 rounded transition-all duration-150 hover:scale-115 active:scale-85 ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10'}`} title="Pin Tab"><Pin size={12} /></button>
                )}
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        clearTimeout(hoverTimeout.current);
                        setHoverPreview(null);
                        handleCloseTab(tab.id); 
                    }} 
                    className={`p-1 rounded transition-all duration-150 hover:scale-115 active:scale-85 ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10'}`} 
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
        <>
        <aside 
            id="qbrowse-sidebar"
            onContextMenu={(e) => {
                if (!e.target.closest('[data-tab-id], [data-folder-id]')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
            className={`sidebar-container min-w-0 flex-shrink-0 flex flex-col rounded-[2rem] overflow-hidden relative z-10 ${
            isBright 
                ? 'liquid-glass-bright text-zinc-900 sidebar-light' 
                : 'liquid-glass-dark text-white/90 sidebar-dark'
        } ${
            isFullscreen
                ? '!fixed !left-3 !top-3 !bottom-3 !z-[99980] shadow-[0_25px_70px_rgba(0,0,0,0.75)] backdrop-blur-3xl'
                : (isSidebarHidden ? 'is-hidden pointer-events-none' : '')
        }`}
        style={isFullscreen ? {
            position: 'fixed',
            left: '12px',
            top: '12px',
            bottom: '12px',
            width: uiScale === 'compact' ? 240 : 256,
            maxWidth: uiScale === 'compact' ? 240 : 256,
            zIndex: 99980,
            transform: isSidebarPeeking ? 'translateX(0)' : 'translateX(calc(-100% - 24px))',
            opacity: isSidebarPeeking ? 1 : 0,
            pointerEvents: isSidebarPeeking ? 'auto' : 'none',
            transition: isReducedMotion ? 'none' : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
            willChange: 'transform, opacity'
        } : {
            width: isSidebarHidden ? 0 : (uiScale === 'compact' ? 240 : 256),
            minWidth: 0,
            maxWidth: isSidebarHidden ? 0 : (uiScale === 'compact' ? 240 : 256),
            marginRight: isSidebarHidden ? 0 : (uiScale === 'compact' ? 6 : 16),
            opacity: isSidebarHidden ? 0 : 1,
            pointerEvents: isSidebarHidden ? 'none' : 'auto',
            transition: isReducedMotion ? 'none' : (isSidebarHidden
                ? 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
                : 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease'),
            willChange: 'width, max-width, margin-right, opacity'
        }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        >
            {/* Fixed-Width Inner Container to prevent content squishing and text wrapping */}
            <div 
                className="sidebar-inner h-full flex flex-col flex-shrink-0"
                style={{
                    width: uiScale === 'compact' ? 240 : 256,
                    minWidth: uiScale === 'compact' ? 240 : 256,
                    transform: (!isFullscreen && isSidebarHidden) ? 'translateX(-100%)' : 'translateX(0)',
                    opacity: (!isFullscreen && isSidebarHidden) ? 0 : 1,
                    transition: isReducedMotion ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                    pointerEvents: (!isFullscreen && isSidebarHidden) ? 'none' : 'auto',
                    willChange: 'transform, opacity'
                }}
            >

            <div 
                className="drag-region flex px-4 py-3.5 border-b border-[color:var(--sidebar-border)] items-center justify-between"
                onDoubleClick={(e) => {
                    if (!e.target.closest('button, input, select, textarea, [data-no-drag]')) {
                        window.electronAPI?.maximize();
                    }
                }}
            >
                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button onClick={() => window.electronAPI.close()} className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-400 transition-all duration-150 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(239,68,68,0.5)] flex items-center justify-center group/btn"><X size={10} className="opacity-0 group-hover/btn:opacity-100 text-black transition-opacity duration-150" /></button>
                    <button onClick={() => window.electronAPI.minimize()} className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-all duration-150 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(234,179,8,0.5)] flex items-center justify-center group/btn"><Minus size={10} className="opacity-0 group-hover/btn:opacity-100 text-black transition-opacity duration-150" /></button>
                    <button onClick={() => window.electronAPI.maximize()} className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-400 transition-all duration-150 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(34,197,94,0.5)] flex items-center justify-center group/btn"><Maximize2 size={10} className="opacity-0 group-hover/btn:opacity-100 text-black transition-opacity duration-150" /></button>
                </div>
                <div className="hidden md:flex gap-1.5 text-[color:var(--sidebar-text-muted)] items-center" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button 
                        onClick={() => togglePopover('user')} 
                        className={`w-[25px] h-[25px] rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer relative ${
                            activePopover === 'user' || activePopover === 'userProfile'
                                ? 'bg-accent-20 border-accent text-accent shadow-[0_0_10px_var(--accent)] scale-105'
                                : (isBright ? 'bg-white/70 border-white/40 text-zinc-700 hover:text-black shadow-xs' : 'bg-white/10 border-white/20 text-white/70 hover:text-white')
                        }`} 
                        style={{ borderColor: activeProfile?.color || '#d4bc94' }}
                        title={`Profile: ${activeProfile?.name || 'Default'} & Cloud Sync`}
                    >
                        {localStorage.getItem('qbrowse_profile_avatar_url') ? (
                            <img src={localStorage.getItem('qbrowse_profile_avatar_url')} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            renderProfileAvatar(activeProfile?.avatar, 13, isBright ? 'text-zinc-900' : 'text-white')
                        )}
                        {syncUser && (
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                                isSyncing ? 'bg-blue-400 animate-ping' :
                                syncStatus === 'synced' ? 'bg-emerald-400' :
                                'bg-white/40'
                            }`} />
                        )}
                    </button>
                    <button onClick={() => setActiveModal('history')} className="hover:text-accent hover:scale-110 active:scale-90 transition-all duration-200 p-1 rounded-md cursor-pointer" title="History"><Clock size={15} strokeWidth={1.85} /></button>
                    <button onClick={() => setActiveModal('settings')} className="hover:text-accent hover:scale-110 active:scale-90 hover:rotate-45 transition-all duration-200 p-1 rounded-md cursor-pointer" title="Settings"><Settings size={15} strokeWidth={1.85} /></button>
                    <button 
                        onClick={handleGoHome} 
                        onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                        onAuxClick={(e) => {
                            if (e.button === 1) {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNewTab('qbrowse://home', false);
                            }
                        }}
                        className={`transition-all duration-200 hover:scale-110 active:scale-90 p-1 rounded-md cursor-pointer ${isHomeActive ? 'text-accent drop-shadow-[0_0_8px_var(--accent)] scale-105' : 'hover:text-accent'}`} 
                        title="Zen Dashboard (Middle-click to open in background)"
                    >
                        <Home size={15} strokeWidth={1.85} />
                    </button>
                </div>
            </div>

            <div className={`px-4 ${uiScale === 'compact' ? 'py-2.5 gap-1.5' : 'py-4 gap-2'} hidden md:grid grid-cols-4 border-b border-[color:var(--sidebar-border)] relative z-10`}>
                {pinnedTabs.map((pin) => {
                    const tabs = getTabsForSpace ? getTabsForSpace(activeSpace) : (activeSpace === 'personal' ? privateTabs : activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs));
                    const pinTabs = (tabs || []).filter(t => isTabForPin(t, pin));
                    const hasActiveTab = pinTabs.some(t => t.active);
                    const isAudible = pinTabs.some(t => t.isAudioPlaying || t.isAudible);
                    const isPopupOpen = activePinnedStack?.pin?.id === pin.id;
                    const isGitHubPin = pin.domain && pin.domain.toLowerCase().includes('github.com');

                    return (
                    <div key={pin.id} className="relative group flex justify-center animate-pin-in">
                        <button 
                            onClick={(e) => handlePinnedTabClick(e, pin)} 
                            onContextMenu={(e) => handlePinnedContextMenu(e, pin)}
                            onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                            onAuxClick={(e) => handlePinnedAuxClick(e, pin)}
                            onMouseEnter={(e) => {
                                if (isGitHubPin) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    if (ghHoverTimeoutRef.current) clearTimeout(ghHoverTimeoutRef.current);
                                    ghHoverTimeoutRef.current = setTimeout(() => {
                                        openHoverGlance(rect);
                                    }, 280);
                                }
                            }}
                            onMouseLeave={() => {
                                if (ghHoverTimeoutRef.current) {
                                    clearTimeout(ghHoverTimeoutRef.current);
                                    ghHoverTimeoutRef.current = null;
                                }
                            }}
                            className={`relative w-10 h-10 flex flex-col items-center justify-center border rounded-xl transition-all duration-200 active:scale-95 shadow-sm overflow-hidden ${
                                hasActiveTab 
                                    ? 'bg-[color:var(--sidebar-bg-active)] border-accent/60 shadow-[0_0_12px_var(--accent)] scale-105' 
                                    : isPopupOpen
                                    ? 'bg-[color:var(--sidebar-bg-active)] border-white/40 scale-105'
                                    : 'bg-[color:var(--sidebar-bg-hover)] hover:bg-[color:var(--sidebar-bg-active)] border-[color:var(--sidebar-border)] group-hover:scale-105'
                            }`} 
                            title={`${pin.title}${pinTabs.length > 0 ? ` (${pinTabs.length} open tab${pinTabs.length > 1 ? 's' : ''})` : ''} • Middle-click to open in background • Right-click for tab list`}
                        >
                            <img 
                                src={`https://www.google.com/s2/favicons?sz=64&domain=${pin.domain}`} 
                                alt={pin.title} 
                                className={`w-5 h-5 rounded-md drop-shadow-md transition-transform duration-200 ${pinTabs.length > 0 ? '-translate-y-1' : ''}`} 
                                onError={(e) => { e.target.style.display = 'none'; }} 
                            />

                            {/* Speaker badge if any tab in this service stack is playing audio */}
                            {isAudible && (
                                <div className="absolute top-0.5 left-0.5 p-0.5 rounded-full bg-black/80 text-emerald-400 animate-pulse shadow-sm">
                                    <Volume2 size={8} />
                                </div>
                            )}

                            {/* macOS Dock-Style Indicator Dots */}
                            {pinTabs.length > 0 && (
                                <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-0.5 pointer-events-none px-1">
                                    {pinTabs.length <= 4 ? (
                                        pinTabs.map((t, idx) => (
                                             <span 
                                                key={t.id || idx} 
                                                className={`rounded-full transition-all duration-300 ${
                                                    t.active 
                                                        ? 'w-1.5 h-1.5 bg-accent shadow-[0_0_6px_var(--accent)]' 
                                                        : 'w-1 h-1 bg-white/40'
                                                }`} 
                                            />
                                        ))
                                    ) : (
                                        <>
                                            {pinTabs.slice(0, 3).map((t, idx) => (
                                                <span 
                                                    key={t.id || idx} 
                                                    className={`rounded-full transition-all duration-300 ${
                                                        t.active 
                                                            ? 'w-1.5 h-1.5 bg-accent shadow-[0_0_6px_var(--accent)]' 
                                                            : 'w-1 h-1 bg-white/40'
                                                    }`} 
                                                />
                                            ))}
                                            <span className="text-[7px] leading-none font-bold text-accent font-mono">
                                                +{pinTabs.length - 3}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleUnpinTab(pin); }} 
                            className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 ${isBright ? 'bg-zinc-100 border border-black/10 text-zinc-700 hover:bg-red-500 hover:text-white' : 'bg-[#2a251e] border-accent-30 text-accent hover:bg-accent hover:text-black'} rounded-full p-0.5 hover:scale-125 active:scale-90 transition-all duration-200 shadow-md z-10`}
                            title="Unpin"
                        >
                            <Minus size={10} />
                        </button>
                    </div>
                )})}
                <div className="relative group flex justify-center animate-pin-in">
                    <button onClick={() => setActiveModal('addPin')} className="w-10 h-10 flex flex-col items-center justify-center bg-[color:var(--sidebar-bg-hover)] hover:bg-[color:var(--sidebar-bg-active)] border border-[color:var(--sidebar-border)] border-dashed rounded-xl transition-all duration-200 hover:scale-110 active:scale-90 hover:border-accent/60 shadow-sm text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer" title="Pin New App / Shortcut">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="relative flex-1 w-full overflow-hidden min-w-[64px]">
                {(() => {
                    const allSpaces = [...customSpaces, { id: 'ghost', isGhost: true }, { id: 'tor', isTor: true }];
                    const currentReelIndex = Math.max(0, allSpaces.findIndex(s => s.id === activeSpace));

                    return (
                        <div 
                            className="absolute inset-y-0 left-0 flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{ 
                                width: `${allSpaces.length * 100}%`, 
                                transform: `translateX(-${currentReelIndex * (100 / allSpaces.length)}%)` 
                            }}
                        >
                            {customSpaces.map((sp) => {
                                const rawTabs = getTabsForSpace ? getTabsForSpace(sp.id) : (sp.id === 'personal' ? privateTabs : (sp.id === 'work' ? workTabs : []));
                                const spaceTabs = rawTabs || [];
                                const filtered = spaceTabs.filter(t => !pinnedTabs.some(p => isTabForPin(t, p)));
                                const isDragOverRoot = dragOverItem === `root-${sp.id}`;

                                return (
                                    <div 
                                        key={sp.id}
                                        className={`h-full flex flex-col ${uiScale === 'compact' ? 'gap-0.5 p-3 pt-1.5' : 'gap-1 p-4 pt-2'} overflow-y-auto hide-scroll`}
                                        style={{ width: `${100 / allSpaces.length}%` }}
                                        onDragOver={(e) => { e.preventDefault(); handleDragOver(`root-${sp.id}`); }}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDropRoot(e, sp.id)}
                                    >
                                        {/* GitHub Live Integration (Pull Requests & Issues) if enabled for this workspace */}
                                        {sp.showGitHub && <GitHubLiveFolder spaceId={sp.id} />}

                                        <div className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${
                                            isDragOverRoot 
                                                ? (sp.id === 'work' ? 'border-blue-400 border-dashed bg-blue-500/10 py-1' : 'border-accent border-dashed bg-accent-10 py-1') 
                                                : 'border-transparent'
                                        }`}>
                                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[color:var(--sidebar-text-muted)] tracking-widest truncate">
                                                {sp.name}
                                            </h3>
                                            <button 
                                                onClick={() => handleNewTab()} 
                                                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} 
                                                onAuxClick={handleNewTabAuxClick} 
                                                className="hidden md:flex text-[color:var(--sidebar-text-muted)] hover:text-accent transition-all duration-200 hover:scale-115 active:scale-90 p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md shrink-0" 
                                                title={`New Tab in ${sp.name} (CMD+T • Middle-click for background)`}
                                            >
                                                <Plus size={12} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                        {(() => {
                                            if (filtered.length === 0) {
                                                return (
                                                    <button 
                                                        onClick={() => handleNewTab()} 
                                                        onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} 
                                                        onAuxClick={handleNewTabAuxClick} 
                                                        className={`group relative flex items-center justify-between ${uiScale === 'compact' ? 'py-2 px-2.5 rounded-lg' : 'p-3 rounded-xl'} bg-[color:var(--sidebar-bg-hover)] border border-[color:var(--sidebar-border)] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-20)] border-dashed text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] w-full shadow-sm animate-pop-in`} 
                                                        title="New Tab (Middle-click for background)"
                                                    >
                                                        <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                                            <Plus size={14} className="flex-shrink-0 opacity-50 transition-transform duration-200 group-hover:rotate-90" />
                                                            <span className="text-sm font-medium truncate hidden md:block italic">New Tab</span>
                                                        </div>
                                                    </button>
                                                );
                                            }
                                            return filtered.map(tab => renderTab(tab, sp.id));
                                        })()}
                                    </div>
                                );
                            })}

                            {/* GHOST TABS */}
                            <div 
                                className={`h-full flex flex-col ${uiScale === 'compact' ? 'gap-0.5 p-3 pt-1.5' : 'gap-1 p-4 pt-2'} overflow-y-auto hide-scroll`}
                                style={{ width: `${100 / allSpaces.length}%` }}
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
                                            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/15 transition-all duration-200 hover:scale-105 active:scale-95 border border-purple-500/20" 
                                            title="Enable Tor Onion Routing (converts private space to Tor space)"
                                        >
                                            <Globe size={11} /> Tor Mode
                                        </button>
                                        <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className="hidden md:flex text-[#a855f7]/50 hover:text-[#a855f7] transition-all duration-200 hover:scale-115 active:scale-90 p-1 hover:bg-[#a855f7]/10 rounded-md" title="New Incognito Tab (CMD+T • Middle-click for background)">
                                            <Plus size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                                {(() => {
                                    const filtered = ghostTabs.filter(t => !pinnedTabs.some(p => isTabForPin(t, p)));
                                    if (filtered.length === 0) {
                                        return (
                                            <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className={`group relative flex items-center justify-between ${uiScale === 'compact' ? 'py-2 px-2.5 rounded-lg' : 'p-3 rounded-xl'} bg-[color:var(--sidebar-bg-hover)] border border-[color:var(--sidebar-border)] border-dashed text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] w-full shadow-sm animate-pop-in`} title="New Incognito Tab (Middle-click for background)">
                                                <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                                    <Plus size={14} className="flex-shrink-0 opacity-50 transition-transform duration-200 group-hover:rotate-90" />
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
                                className={`h-full flex flex-col ${uiScale === 'compact' ? 'gap-0.5 p-3 pt-1.5' : 'gap-1 p-4 pt-2'} overflow-y-auto hide-scroll`}
                                style={{ width: `${100 / allSpaces.length}%` }}
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
                                            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10" 
                                            title="Turn off Tor and return to Ghost mode"
                                        >
                                            <Ghost size={11} /> Ghost
                                        </button>
                                        <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className="hidden md:flex text-purple-400/60 hover:text-purple-300 transition-all duration-200 hover:scale-115 active:scale-90 p-1 hover:bg-purple-500/10 rounded-md" title="New Tor Tab (CMD+T • Middle-click for background)">
                                            <Plus size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                                {(() => {
                                    const filtered = (torTabs || []).filter(t => !pinnedTabs.some(p => isTabForPin(t, p)));
                                    if (filtered.length === 0) {
                                        return (
                                            <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className="group relative flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 border-dashed text-purple-300/60 hover:text-purple-200 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] w-full shadow-sm animate-pop-in" title="New Tor Tab (Middle-click for background)">
                                                <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                                    <Plus size={14} className="flex-shrink-0 opacity-50 transition-transform duration-200 group-hover:rotate-90" />
                                                    <span className="text-sm font-medium truncate hidden md:block italic">New Tor Tab</span>
                                                </div>
                                            </button>
                                        );
                                    }
                                    return filtered.map(tab => renderTab(tab, 'tor'));
                                })()}
                            </div>

                        </div>
                    );
                })()}
            </div>

            <div className="relative p-3 border-t border-[color:var(--sidebar-border)] bg-transparent flex gap-1.5 items-center">
                {/* Anchored Rename Workspace Popover */}
                {(activeRenamingSpace || (renamingSpaceId && customSpaces.find(s => s.id === renamingSpaceId))) && (() => {
                    const targetSpace = activeRenamingSpace || customSpaces.find(s => s.id === renamingSpaceId);
                    if (!targetSpace) return null;
                    const SpaceIcon = (targetSpace.icon && SPACE_ICONS[targetSpace.icon]) ? SPACE_ICONS[targetSpace.icon] : Layers;

                    return (
                        <>
                            {/* Dismiss Backdrop (transparent like global context menu) */}
                            <div 
                                className={`fixed inset-0 z-40 bg-transparent cursor-default select-none transition-opacity ${
                                    isRenamingClosing ? 'pointer-events-none' : ''
                                }`}
                                onClick={closeRenamePopover}
                            />

                            {/* Anchored Glass Popover directly above space pill */}
                            <div 
                                className={`absolute bottom-full mb-2 left-2.5 right-2.5 z-50 p-3 rounded-2xl border select-none outline-none ${
                                    isRenamingClosing ? 'animate-pop-out' : 'animate-pop-in'
                                } ${
                                    isBright 
                                        ? 'border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.14),inset_0_1px_1px_rgba(255,255,255,0.85)]' 
                                        : 'border-white/[0.10] text-white/95 shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.16)]'
                                }`}
                                style={{
                                    backgroundColor: isBright ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 20, 32, 0.58)',
                                    backdropFilter: isBright
                                        ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                                        : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)',
                                    WebkitBackdropFilter: isBright
                                        ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                                        : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const trimmed = renameValue.trim();
                                        if (trimmed) {
                                            updateSpace(targetSpace.id, { name: trimmed });
                                        }
                                        closeRenamePopover();
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                                isBright ? 'bg-black/5 text-zinc-700' : 'bg-white/10 text-accent'
                                            }`}>
                                                <SpaceIcon size={13} />
                                            </div>
                                            <span className="text-xs font-bold truncate">Rename Workspace</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeRenamePopover}
                                            className={`p-1 rounded-md transition-colors cursor-pointer active:scale-90 ${
                                                isBright ? 'hover:bg-black/10 text-zinc-500' : 'hover:bg-white/10 text-white/50 hover:text-white'
                                            }`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>

                                    <div className="relative mb-2.5">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={renameValue}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    closeRenamePopover();
                                                }
                                            }}
                                            maxLength={30}
                                            placeholder="Workspace name..."
                                            className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium transition outline-none ${
                                                isBright 
                                                    ? 'bg-black/[0.03] border-black/10 text-zinc-900 focus:border-accent focus:bg-white' 
                                                    : 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/35 focus:border-accent/80 focus:bg-white/[0.08]'
                                            }`}
                                        />
                                        <span className={`absolute right-2 top-2 text-[9px] font-mono select-none ${
                                            isBright ? 'text-zinc-400' : 'text-white/30'
                                        }`}>
                                            {renameValue.length}/30
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-zinc-400 select-none">↵ to save</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={closeRenamePopover}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                                                    isBright ? 'hover:bg-black/5 text-zinc-600' : 'hover:bg-white/10 text-white/70'
                                                }`}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3 py-1 rounded-lg text-xs font-bold bg-accent text-zinc-950 hover:brightness-110 active:scale-95 transition cursor-pointer shadow-sm"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </>
                    );
                })()}
                <div 
                    id="tour-spaces-container"
                    onMouseLeave={() => setHoveredSpace(null)}
                    onDoubleClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleQuickAddSpace();
                        }
                    }}
                    className={`relative flex-1 flex p-1 rounded-full border shadow-xs transition-colors duration-200 select-none overflow-hidden ${
                    isBright 
                        ? 'bg-black/[0.03] border-black/[0.05]' 
                        : 'bg-white/[0.04] border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                }`}>
                    {/* Inner wrapper for sliding pills that matches content-box dimensions */}
                    <div className="absolute inset-1 pointer-events-none overflow-hidden">
                        {(() => {
                            const activeSpaceIndex = Math.max(0, customSpaces.findIndex(s => s.id === activeSpace));
                            const hoveredSpaceIndex = hoveredSpace ? customSpaces.findIndex(s => s.id === hoveredSpace) : -1;
                            const slotWidthPercent = 100 / customSpaces.length;

                            return (
                                <>
                                    {/* Hover Preview Pill */}
                                    <div 
                                        className={`absolute top-0 bottom-0 rounded-full transition-all duration-200 pointer-events-none ${
                                            isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                                        }`} 
                                        style={{ 
                                            left: `calc(${hoveredSpaceIndex * slotWidthPercent}% + 2px)`,
                                            width: `calc(${slotWidthPercent}% - 4px)`,
                                            opacity: hoveredSpace && hoveredSpace !== activeSpace && !isIncognito && !isTor ? 1 : 0
                                        }}
                                    />

                                    {/* Signature Liquid Glass Sliding Pill */}
                                    <div 
                                        className={`absolute top-0 bottom-0 rounded-full border pointer-events-none ${
                                            isReducedMotion ? 'transition-none' : 'transition-[left,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                                        } ${
                                            isIncognito || isTor ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                        } ${
                                            isBright
                                                ? 'bg-white border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                                : 'shadow-xs'
                                        }`} 
                                        style={{ 
                                            left: `calc(${activeSpaceIndex * slotWidthPercent}% + 2px)`,
                                            width: `calc(${slotWidthPercent}% - 4px)`,
                                            ...(!isBright ? {
                                                borderColor: 'var(--accent-30, rgba(212, 188, 148, 0.4))',
                                                backgroundColor: 'var(--accent-15, rgba(212, 188, 148, 0.16))',
                                                boxShadow: '0 2px 10px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                                            } : {})
                                        }}
                                    />
                                </>
                            );
                        })()}
                    </div>

                    {(() => {
                        const showSpaceLabels = 
                            customSpaces.length === 1 
                                ? (customSpaces[0]?.name || '').length <= 18
                                : customSpaces.length === 2 
                                    ? customSpaces.every(s => (s.name || '').length <= 8)
                                    : false;

                        return customSpaces.map((sp) => {
                            const isActive = activeSpace === sp.id && !isIncognito && !isTor;

                            return (
                                <button 
                                    key={sp.id}
                                    onClick={() => setActiveSpace(sp.id)} 
                                    onMouseEnter={() => setHoveredSpace(sp.id)}
                                    onContextMenu={(e) => handleSpaceContextMenu(e, sp)}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setRenamingSpaceId(sp.id);
                                    }}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 p-1.5 text-xs font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer outline-none min-w-0 ${
                                        isActive 
                                            ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold') 
                                            : 'text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)]'
                                    }`}
                                    title={`${sp.name} (Right-click for options • Double-click to rename)`}
                                >
                                    {getSpaceIcon(sp.icon, { size: showSpaceLabels ? 14 : 15, className: 'shrink-0' })}
                                    {showSpaceLabels && (
                                        <span className="hidden md:inline whitespace-nowrap select-none">{sp.name}</span>
                                    )}
                                </button>
                            );
                        });
                    })()}
                </div>

                {/* Animated Morphing Ghost <-> Onion Button */}
                <button
                    onClick={() => {
                        if (isTorEnabled) {
                            setActiveSpace(isTor ? (customSpaces[0]?.id || 'personal') : 'tor');
                            showToast(!isTor ? 'Tor Space: Activated' : 'Tor Space: Deactivated');
                        } else {
                            setActiveSpace(isIncognito ? (customSpaces[0]?.id || 'personal') : 'ghost');
                            showToast(!isIncognito ? 'Ghost Mode: Activated' : 'Ghost Mode: Deactivated');
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        useTorStore.getState().toggleTorEnabled();
                    }}
                    className={`relative p-2 rounded-2xl transition-all duration-300 active:scale-90 hover:scale-105 border flex-shrink-0 overflow-hidden group cursor-pointer ${
                        (isTorEnabled ? isTor : isIncognito)
                            ? (isTorEnabled 
                                ? 'border-purple-500/30 text-purple-300 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.35)]' 
                                : 'border-accent/30 text-accent bg-accent-15 shadow-accent')
                            : (isTorEnabled
                                ? 'border-transparent bg-transparent text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10'
                                : (isBright ? 'border-transparent bg-transparent text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.05]' : 'border-transparent bg-transparent text-white/50 hover:text-white hover:bg-white/10'))
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
            </div>
        </aside>
        {draggedItem && dragPos && (
            <div
                className={`fixed pointer-events-none z-[999999] flex items-center justify-between px-3 py-2.5 border select-none shadow-2xl backdrop-blur-2xl transition-none ${
                    isBright 
                        ? 'bg-white/95 border-black/15 text-zinc-950 shadow-[0_12px_28px_rgba(0,0,0,0.18)]' 
                        : 'bg-[#18191f]/95 border-accent/40 text-accent shadow-[0_16px_36px_rgba(0,0,0,0.8),0_0_15px_var(--accent-20)]'
                }`}
                style={{
                    left: `${dragPos.x + 10}px`,
                    top: `${dragPos.y - 18}px`,
                    width: uiScale === 'compact' ? '200px' : '220px',
                    borderRadius: uiScale === 'compact' ? '8px' : '12px'
                }}
            >
                <div className="flex items-center gap-2.5 truncate">
                    {draggedItem.tab.url && draggedItem.tab.url !== 'about:blank' ? (
                        <img 
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${draggedItem.tab.url}`} 
                            className="w-4 h-4 rounded-sm shrink-0" 
                            onError={(e) => e.target.style.display = 'none'} 
                        />
                    ) : (
                        <Globe size={14} className={`shrink-0 ${isBright ? 'text-zinc-800' : 'text-accent'}`} />
                    )}
                    <span className="text-xs font-semibold truncate">
                        {draggedItem.tab.title || 'New Tab'}
                    </span>
                </div>
            </div>
        )}
        <PinnedStackPopup />
        <GitHubGlancePopover />
        </>
    );
}
