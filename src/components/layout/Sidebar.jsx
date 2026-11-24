import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Minus, Maximize2, Square, UserPlus, Clock, Settings, Home, Plus, ChevronRight, 
    User, Layers, Ghost, PictureInPicture2, VolumeX, Volume2, Pin, Globe, 
    FolderPlus, Check, Edit2, FolderOpen, Briefcase, Code, Rocket, Compass, 
    Bookmark, Sparkles, Coffee, Folder, Terminal, Shield, Heart,
    Copy, Columns, Moon, Trash2, SplitSquareHorizontal, SplitSquareVertical, LayoutGrid, ArrowLeftRight
} from 'lucide-react';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses } from '../common/ContextMenuProvider';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useSyncStore from '../../store/useSyncStore';
import useProfileStore from '../../store/useProfileStore';
import { renderProfileAvatar } from '../popovers/UserProfilePopover';
import useTorStore from '../../store/useTorStore';
import { checkIsArticle, CHECK_ARTICLE_DOM_SCRIPT } from '../../utils/readerExtractor';
import PinnedStackPopup from './PinnedStackPopup';
import { isTabForPin, getPinHomeUrl } from '../../utils/pinnedAppHelpers';
import { pruneTabsFromParkedGroups } from '../../utils/splitGroupHelpers';
import GitHubLiveFolder from './GitHubLiveFolder';
import GitHubGlancePopover from './GitHubGlancePopover';
import { useGitHubStore } from '../../store/useGitHubStore';
import { useTranslation } from '../../i18n/index';
import { selectPluralForm } from '../../i18n/domains/chrome';
import { PLACEHOLDER_TAB_TITLE_SET } from '../../i18n/domains/stores.js';
import { getSafeFaviconUrl } from '../../utils/networkPrivacy';
import {
    resolveSplitSlotTabs,
    getFocusedSlotIndex,
    slotIndexToFocusedPane
} from '../../utils/splitLayoutHelpers';

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

const getTabDomain = (url) => {
    if (!url || url === 'about:blank') return '';
    try {
        const u = new URL(url.includes('://') ? url : `https://${url}`);
        return u.hostname.replace(/^www\./, '');
    } catch (_) {
        return url.replace(/^https?:\/\//, '').split('/')[0] || '';
    }
};

export default function Sidebar() {
    const { t, resolvedLanguage } = useTranslation();
    const getSpaceDisplayName = (sp) => {
        if (!sp) return '';
        if (sp.id === 'personal' && sp.name === 'Personal') return t('nav.personal', null, 'Personal');
        if (sp.id === 'work' && sp.name === 'Work') return t('nav.work', null, 'Work');
        return sp.name || '';
    };

    // UI Store State
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const isFramelessMode = useUIStore(state => state.isFramelessMode);
    const isChromeHidden = isFullscreen || isFramelessMode;
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isSidebarPeeking = useUIStore(state => state.isSidebarPeeking);
    const setIsSidebarPeeking = useUIStore(state => state.setIsSidebarPeeking);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const settings = useUIStore(state => state.settings);
    const sidebarPosition = useUIStore(state => state.settings?.sidebarPosition || 'left');
    const frameCurvature = useUIStore(state => state.settings?.frameCurvature || 'default');
    const tabPresentation = useUIStore(state => state.settings?.tabPresentation || 'pills');
    const windowControlsStyle = useUIStore(state => state.settings?.windowControlsStyle || 'mac');
    const windowControlsOrder = useUIStore(state => state.settings?.windowControlsOrder || 'auto');

    // Natural corner-aware window controls layout:
    // - 'close-first': [Close, Minimize, Maximize] (natural when controls are docked on the left corner)
    // - 'minimize-first': [Minimize, Maximize, Close] (natural when controls are docked on the right corner)
    const effectiveControlsOrder = (windowControlsOrder === 'close-first' || windowControlsOrder === 'left')
        ? 'close-first'
        : (windowControlsOrder === 'minimize-first' || windowControlsOrder === 'right')
        ? 'minimize-first'
        : (sidebarPosition === 'right' ? 'minimize-first' : 'close-first');
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
    const isSplitView = useUIStore(state => state.isSplitView);
    const splitOrientation = useUIStore(state => state.splitOrientation);
    const splitPaneTabIds = useUIStore(state => state.splitPaneTabIds);
    const splitRightTabId = useUIStore(state => state.splitRightTabId);
    const focusedPane = useUIStore(state => state.focusedPane);
    const setFocusedPane = useUIStore(state => state.setFocusedPane);
    const swapSplitPanes = useUIStore(state => state.swapSplitPanes);
    const toggleSplitView = useUIStore(state => state.toggleSplitView);
    const setSplitPaneTabId = useUIStore(state => state.setSplitPaneTabId);
    const parkedSplitGroups = useUIStore(state => state.parkedSplitGroups) || [];
    const activeSplitGroupId = useUIStore(state => state.activeSplitGroupId);
    const activeSplitGroupName = useUIStore(state => state.activeSplitGroupName) || '';
    const renameSplitGroup = useUIStore(state => state.renameSplitGroup);
    const restoreParkedSplitGroup = useUIStore(state => state.restoreParkedSplitGroup);
    const clearParkedSplitGroup = useUIStore(state => state.clearParkedSplitGroup);
    const [editingSplitGroupKey, setEditingSplitGroupKey] = React.useState(null);
    const [editingSplitGroupDraft, setEditingSplitGroupDraft] = React.useState('');

    const activeProfileId = useProfileStore(state => state.activeProfileId);
    const isPeeking = isChromeHidden && isSidebarPeeking;
    const isActuallyHidden = isChromeHidden ? !isPeeking : isSidebarHidden;
    const peekLeaveTimeoutRef = useRef(null);

    const handleSidebarMouseEnter = () => {
        if (peekLeaveTimeoutRef.current) {
            clearTimeout(peekLeaveTimeoutRef.current);
            peekLeaveTimeoutRef.current = null;
        }
    };

    const handleSidebarMouseLeave = () => {
        if (isChromeHidden && isSidebarPeeking) {
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
    const ephemeralPinnedTabs = useTabStore(state => state.ephemeralPinnedTabs);
    const getPinnedTabsForSpace = useTabStore(state => state.getPinnedTabsForSpace);
    const activatePinnedApp = useTabStore(state => state.activatePinnedApp);
    const draggedItem = useTabStore(state => state.draggedItem);
    const dragOverItem = useTabStore(state => state.dragOverItem);
    const dragOverPosition = useTabStore(state => state.dragOverPosition);
    
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
    const selectedTabIds = useTabStore(state => state.selectedTabIds) || [];
    const toggleTabSelection = useTabStore(state => state.toggleTabSelection);
    const clearTabSelection = useTabStore(state => state.clearTabSelection);
    const bulkCloseTabs = useTabStore(state => state.bulkCloseTabs);
    const bulkSuspendTabs = useTabStore(state => state.bulkSuspendTabs);
    const bulkToggleMuteTabs = useTabStore(state => state.bulkToggleMuteTabs);
    const getSelectedTabUrls = useTabStore(state => state.getSelectedTabUrls);
    
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
        const unsubscribe = useGitHubStore.getState().initListener?.();
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    React.useEffect(() => {
        useGitHubStore.getState().syncWithConfig();
    }, [activeProfileId]);

    // Vault Store state for folder open logic (since they belong to folders)
    const [isPrivateFolderOpen, setIsPrivateFolderOpen] = [true, () => {}]; // TODO: Link from useVaultStore or local state?
    // Actually folder state was in App.jsx. I will manage it with local state in Sidebar for now since it's just visual toggle.
    const [localPrivateOpen, setLocalPrivateOpen] = React.useState(true);
    const [localWorkOpen, setLocalWorkOpen] = React.useState(true);
    const customSpaces = useUIStore(state => state.settings?.customSpaces) || [
        { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
        { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
    ];
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
    const footerBarRef = React.useRef(null);
    const [, setRenameResizeTick] = React.useState(0);

    React.useEffect(() => {
        if (!activeRenamingSpace) return;
        const onResize = () => setRenameResizeTick(t => t + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [activeRenamingSpace]);

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
            showToast(t('chrome.maxWorkspacesReached', null, 'Maximum of 8 workspaces reached'));
            return;
        }
        const nextIdx = customSpaces.length + 1;
        const name = t('chrome.defaultNewWorkspaceName', { index: nextIdx }, `Workspace ${nextIdx}`);
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

    const dragGhostRef = React.useRef(null);
    const initialDragPosRef = React.useRef({ x: -9999, y: -9999 });
    const [hoveredSpace, setHoveredSpace] = React.useState(null);
    const [draggedSidebarSpaceIdx, setDraggedSidebarSpaceIdx] = React.useState(null);
    const [dragOverSidebarSpaceIdx, setDragOverSidebarSpaceIdx] = React.useState(null);

    React.useEffect(() => {
        if (!draggedItem) {
            return;
        }
        if (dragGhostRef.current && initialDragPosRef.current.x > 0) {
            dragGhostRef.current.style.transform = `translate3d(${initialDragPosRef.current.x + 12}px, ${initialDragPosRef.current.y - 18}px, 0)`;
            dragGhostRef.current.style.opacity = '1';
        }
        const handleWindowDragOver = (e) => {
            e.preventDefault();
            if ((e.clientX > 0 || e.clientY > 0) && dragGhostRef.current) {
                dragGhostRef.current.style.transform = `translate3d(${e.clientX + 12}px, ${e.clientY - 18}px, 0)`;
                dragGhostRef.current.style.opacity = '1';
            }
        };
        const handleDragEndWindow = () => {
            initialDragPosRef.current = { x: -9999, y: -9999 };
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
        const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
        activatePinnedApp(pin, rect);
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
            const targetUrl = getPinHomeUrl(pin);
            useTabStore.getState().addTab({
                id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                pinnedId: pin.id,
                title: pin.title,
                url: targetUrl,
                active: false,
                folderId: null
            });
            useUIStore.getState().showToast(t('chrome.toastOpenedPinBg', { title: pin.title }, `Opened ${pin.title} in background tab`));
        }
    };

    const handleNewTabAuxClick = (e) => {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            handleNewTab('', false);
        }
    };

    const renderTab = (tab, spaceType, orderedTabIds = []) => {
        const isSelected = selectedTabIds.includes(tab.id);
        const isSquare = frameCurvature === 'square';
        const isCohesive = frameCurvature === 'cohesive';
        const domain = getTabDomain(tab.url);
        const isPlaceholder = !tab.title || tab.title === 'about:blank' || tab.title === '' ||
            ((!tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://newtab')) && PLACEHOLDER_TAB_TITLE_SET.has(String(tab.title).trim().toLowerCase()));
        const tabTitle = isPlaceholder
            ? (spaceType === 'ghost'
                ? t('chrome.newIncognitoTab', null, 'New Incognito Tab')
                : spaceType === 'tor'
                    ? t('chrome.newTorTab', null, 'New Tor Tab')
                    : t('nav.newTab', null, 'New Tab'))
            : tab.title;

        const commonProps = {
            key: tab.id,
            draggable: true,
            onDragStart: (e) => { 
                clearTimeout(hoverTimeout.current); 
                setHoverPreview(null); 
                initialDragPosRef.current = { x: e.clientX || 0, y: e.clientY || 0 };
                if (e.dataTransfer) {
                    try {
                        const dragBadge = document.createElement('div');
                        dragBadge.style.cssText = 'position:fixed;top:-9999px;left:-9999px;display:flex;align-items:center;gap:8px;padding:6px 12px;background:#141721;color:#fff;border:1px solid rgba(212,188,148,0.5);border-radius:10px;font-size:12px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:999999;pointer-events:none;';
                        dragBadge.textContent = tabTitle;
                        document.body.appendChild(dragBadge);
                        e.dataTransfer.setDragImage(dragBadge, 15, 15);
                        setTimeout(() => dragBadge.remove(), 50);
                    } catch (_) {}
                }
                handleDragStart(e, tab, spaceType); 
            },
            onDragEnd: (e) => {
                initialDragPosRef.current = { x: -9999, y: -9999 };
                useTabStore.getState().setDraggedItem(null);
                useTabStore.getState().setDragOverItem(null);

                // Tear-off tab into a new window if dropped outside any window
                if (e && e.dataTransfer && e.dataTransfer.dropEffect === 'none') {
                    const isOutside = (e.clientX < -10 || e.clientX > window.innerWidth + 10 || e.clientY < -10 || e.clientY > window.innerHeight + 10);
                    if (isOutside && window.electronAPI?.openNewWindowWithTab) {
                        window.electronAPI.openNewWindowWithTab({
                            tab,
                            spaceType,
                            screenX: e.screenX,
                            screenY: e.screenY
                        });
                        useTabStore.getState().removeTabById(tab.id);
                        useUIStore.getState().showToast(t('chrome.toastDetachedTab', { title: tabTitle }, `Detached "${tabTitle}" into a new window`));
                    }
                }
            },
            onDragOver: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                if (draggedItem?.tab?.id === tab.id) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                handleDragOver(tab.id, pos);
            },
            onDragLeave: (e) => {
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget)) return;
                if (useTabStore.getState().dragOverItem === tab.id) {
                    handleDragLeave();
                }
            },
            onDrop: (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDrop(e, tab, spaceType);
            },
            onContextMenu: (e) => handleTabContextMenuClick(e, tab, spaceType),
            onClick: (e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTabSelection(tab.id, {
                        ctrl: e.ctrlKey || e.metaKey,
                        shift: e.shiftKey,
                        orderedTabIds
                    });
                    return;
                }
                if (selectedTabIds.length > 0) {
                    clearTabSelection();
                }
                const ui = useUIStore.getState();
                if (ui.isReaderOpen) {
                    ui.closeReaderMode();
                }
                const { isSplitView } = ui;
                if (isSplitView) {
                    ui.parkOrCloseSplitViewForTabSwitch?.();
                }
                const list = getTabsForSpace ? getTabsForSpace(spaceType) : (spaceType === 'personal' ? privateTabs : (spaceType === 'work' ? workTabs : (spaceType === 'ghost' ? ghostTabs : torTabs)));
                const setList = (updater) => setTabsForSpace ? setTabsForSpace(spaceType, updater) : (spaceType === 'personal' ? setPrivateTabs(updater) : (spaceType === 'work' ? setWorkTabs(updater) : (spaceType === 'ghost' ? setGhostTabs(updater) : setTorTabs(updater))));
                const nowTs = Date.now();
                setList((list || []).map(t => ({ 
                    ...t, 
                    active: t.id === tab.id,
                    suspended: t.id === tab.id ? false : t.suspended,
                    lastActiveAt: (t.id === tab.id || t.active) ? nowTs : t.lastActiveAt
                })));
                ui.setCurrentUrl(tab.url || '');

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
            },
            onMouseEnter: (e) => {
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
                    setHoverPreview({ 
                        tab: latestTab, 
                        top: rect.top, 
                        left: sidebarPosition === 'right' ? Math.max(12, rect.left - 268) : rect.right + 12 
                    });

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
            },
            onMouseLeave: () => {
                clearTimeout(hoverTimeout.current);
                setHoverPreview(null);
            },
            onMouseDown: (e) => {
                if (e.button === 1) e.preventDefault();
            },
            onAuxClick: (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    clearTimeout(hoverTimeout.current);
                    setHoverPreview(null);
                    handleCloseTab(tab.id);
                }
            }
        };

        const renderTabIcon = (size = 14) => {
            if (spaceType === 'ghost') {
                return <Ghost size={size} className={`flex-shrink-0 transition-colors duration-200 ${tab.active ? (isBright ? 'text-zinc-800' : 'text-accent') : 'opacity-50'} ${tab.suspended ? 'grayscale opacity-30' : ''}`} />;
            }
            if (spaceType === 'tor') {
                return (
                    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-purple-400 opacity-70 transition-colors duration-200 ${tab.suspended ? 'grayscale opacity-30' : ''}`}>
                        <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                        <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                        <circle cx="12" cy="12" r="1.5"/>
                    </svg>
                );
            }
            const safeFavicon = getSafeFaviconUrl(tab.url, settings, 64);
            if (safeFavicon) {
                return (
                    <img 
                        src={safeFavicon} 
                        alt="icon" 
                        style={{ width: size, height: size }}
                        className={`rounded-sm flex-shrink-0 transition-all duration-300 ${tab.suspended ? 'grayscale opacity-50' : ''} ${tab.active && faviconGlow !== false ? 'shadow-[0_0_12px_var(--accent)] shadow-accent/60 scale-105' : ''}`} 
                        onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                );
            }
            return <Globe size={size} className={`flex-shrink-0 transition-colors duration-200 ${tab.active ? (isBright ? 'text-zinc-800' : 'text-accent') : 'opacity-50'} ${tab.suspended ? 'grayscale opacity-30' : ''}`} />;
        };

        const renderActionButtons = (size = 'normal') => {
            const isCompactSize = size === 'compact';
            return (
                <div className={`hidden md:flex opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] absolute ${
                    isCompactSize ? 'right-1.5 p-0.5' : 'right-2 p-1'
                } gap-0.5 ${
                    isBright 
                        ? 'bg-white/90 border border-black/[0.08] text-zinc-700 shadow-sm' 
                        : 'bg-[#1a1a1c]/95 border border-white/10 text-white shadow-sm'
                } ${isSquare ? 'rounded-none !rounded-none' : isCompactSize ? 'rounded-md' : 'rounded-xl'} z-20`}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleMute(tab.id, spaceType); }} 
                        className={`p-1 ${isSquare ? 'rounded-none' : 'rounded'} transition-all duration-150 hover:scale-115 active:scale-85 ${tab.isMuted ? 'text-red-500 hover:bg-red-500/20' : (isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10')}`} 
                        title={tab.isMuted ? t('nav.unmuteTab', null, 'Unmute Tab') : t('nav.muteTab', null, 'Mute Tab')}
                    >
                        {tab.isMuted ? <VolumeX size={isCompactSize ? 10 : 12} /> : <Volume2 size={isCompactSize ? 10 : 12} />}
                    </button>

                    {!tab.suspended && !tab.isClosing && tab.url && tab.url !== 'about:blank' && (tab.isAudioPlaying || tab.isAudible) && (
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const sent = useUIStore.getState().sendMediaCommand('toggle-pip', { targetTabId: tab.id }); 
                                if (sent) {
                                    showToast(t('chrome.pipToast', null, 'Picture-in-Picture')); 
                                }
                            }} 
                            className={`p-1 ${isSquare ? 'rounded-none' : 'rounded'} transition-all duration-150 hover:scale-115 active:scale-85 ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10'}`} 
                            title={t('chrome.pipTooltip', null, 'Picture in Picture')}
                        >
                            <PictureInPicture2 size={isCompactSize ? 10 : 12} />
                        </button>
                    )}
                    {spaceType !== 'ghost' && spaceType !== 'tor' && tab.url && tab.url !== 'about:blank' && (
                        <button onClick={(e) => { e.stopPropagation(); handlePinTab(tab); }} className={`p-1 ${isSquare ? 'rounded-none' : 'rounded'} transition-all duration-150 hover:scale-115 active:scale-85 ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10'}`} title={t('nav.pinTab', null, 'Pin Tab')}><Pin size={isCompactSize ? 10 : 12} /></button>
                    )}
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            clearTimeout(hoverTimeout.current);
                            setHoverPreview(null);
                            handleCloseTab(tab.id); 
                        }} 
                        className={`p-1 ${isSquare ? 'rounded-none' : 'rounded'} transition-all duration-150 hover:scale-115 active:scale-85 ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-accent opacity-70 hover:opacity-100 hover:bg-accent-10'}`} 
                        title={t('nav.closeTab', null, 'Close Tab')}
                    >
                        <X size={isCompactSize ? 10 : 12} />
                    </button>
                </div>
            );
        };

        const isDropTarget = dragOverItem === tab.id && draggedItem?.tab?.id !== tab.id;
        const renderDropIndicator = () => {
            if (!isDropTarget) return null;
            const isAfter = dragOverPosition === 'after';
            return (
                <div
                    className={`pointer-events-none absolute left-1 right-1 z-30 flex items-center ${
                        isAfter ? '-bottom-[5px]' : '-top-[5px]'
                    }`}
                >
                    <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)] -ml-0.5 shrink-0" />
                    <div className="h-[2.5px] flex-1 bg-accent rounded-full shadow-[0_0_12px_var(--accent)]" />
                </div>
            );
        };

        // 1. Compact High-Density Row Mode
        if (tabPresentation === 'compact') {
            return (
                <div 
                    {...commonProps}
                    className={`sidebar-tab-item group relative flex items-center justify-between py-1 px-2.5 ${
                        isSquare ? 'rounded-none !rounded-none' : isCohesive ? 'rounded-lg' : 'rounded-md'
                    } border cursor-grab active:cursor-grabbing w-full select-none transition-all duration-150 ${tab.isClosing ? 'tab-closing-anim' : 'animate-pop-in'} ${isDropTarget ? 'bg-accent/[0.06] border-accent/35' : ''} ${draggedItem?.tab?.id === tab.id ? 'opacity-35 scale-[0.98]' : ''} ${
                        isSelected
                            ? 'ring-1 ring-accent/60 bg-accent/15 border-accent/50'
                            : tab.active 
                            ? (isBright 
                                ? 'bg-white/90 border-black/15 text-zinc-950 font-semibold shadow-xs' 
                                : 'bg-white/10 border-white/20 text-white font-medium shadow-xs') 
                            : (isBright 
                                ? 'bg-transparent hover:bg-black/[0.04] text-zinc-700 hover:text-zinc-950 border-transparent' 
                                : 'bg-transparent hover:bg-[color:var(--sidebar-bg-hover)] text-[color:var(--sidebar-text-normal)] hover:text-[color:var(--sidebar-text-hover)] border-transparent')
                    }`}
                >
                    {renderDropIndicator()}
                    <div className="flex items-center gap-2 w-full justify-center md:justify-start pointer-events-none pr-7">
                        {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full bg-accent text-black flex items-center justify-center shrink-0 shadow-xs">
                                <Check size={9} strokeWidth={3} />
                            </span>
                        )}
                        {renderTabIcon(12)}
                        <span className={`text-xs truncate hidden md:block transition-colors duration-150 ${tab.active ? (isBright ? 'font-bold text-zinc-950' : 'font-semibold text-accent') : 'font-normal'}`}>
                            {tabTitle}
                        </span>
                    </div>

                    {!tab.suspended && !tab.isClosing && tab.url && tab.url !== 'about:blank' && (tab.isAudioPlaying || tab.isAudible || tab.isMuted) && (
                        <div className="absolute right-2 opacity-100 group-hover:opacity-0 transition-opacity duration-150 md:flex hidden pointer-events-none">
                            {tab.isMuted ? <VolumeX size={11} className="text-red-400" /> : <Volume2 size={11} className="text-accent opacity-80 animate-pulse" />}
                        </div>
                    )}

                    {renderActionButtons('compact')}
                </div>
            );
        }

        // 2. Rich Card Tile Mode
        if (tabPresentation === 'cards') {
            return (
                <div 
                    {...commonProps}
                    className={`sidebar-tab-item group relative flex flex-col justify-between p-2.5 ${
                        isSquare ? 'rounded-none !rounded-none' : isCohesive ? 'rounded-2xl' : 'rounded-xl'
                    } border cursor-grab active:cursor-grabbing w-full select-none transition-all duration-200 ${tab.isClosing ? 'tab-closing-anim' : 'animate-pop-in'} ${isDropTarget ? 'bg-accent/[0.06] border-accent/40' : ''} ${draggedItem?.tab?.id === tab.id ? 'opacity-35 scale-[0.98]' : ''} ${
                        isSelected
                            ? 'ring-1 ring-accent/60 bg-accent/15 border-accent/50'
                            : tab.active 
                            ? (isBright 
                                ? 'bg-white/95 border-accent/40 shadow-sm text-zinc-950' 
                                : 'bg-white/[0.08] border-accent/40 text-white shadow-[0_4px_20px_rgba(0,0,0,0.3),0_0_15px_var(--accent-20)]') 
                            : (isBright 
                                ? 'bg-white/50 hover:bg-white/80 border-black/[0.06] hover:border-black/[0.12] text-zinc-700 hover:text-zinc-950 shadow-xs' 
                                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.05] hover:border-white/[0.10] text-[color:var(--sidebar-text-normal)] hover:text-[color:var(--sidebar-text-hover)]')
                    }`}
                >
                    {renderDropIndicator()}
                    {/* Top row: Favicon in clear container + Title */}
                    <div className="flex items-center gap-2.5 w-full pointer-events-none pr-6">
                        {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-accent text-black flex items-center justify-center shrink-0 shadow-xs">
                                <Check size={10} strokeWidth={3} />
                            </span>
                        )}
                        <div className={`w-6 h-6 ${isSquare ? 'rounded-none' : 'rounded-lg'} flex items-center justify-center flex-shrink-0 border ${
                            isBright ? 'bg-black/[0.04] border-black/[0.08]' : 'bg-white/[0.06] border-white/10 shadow-xs'
                        }`}>
                            {renderTabIcon(13)}
                        </div>
                        <span className={`text-xs truncate hidden md:block transition-colors duration-200 ${tab.active ? (isBright ? 'font-bold text-zinc-950' : 'font-semibold text-accent') : 'font-medium'}`}>
                            {tabTitle}
                        </span>
                    </div>

                    {/* Bottom row: Subtle domain badge */}
                    <div className="hidden md:flex items-center justify-between w-full mt-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.05] pointer-events-none">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 ${isSquare ? 'rounded-none' : 'rounded'} border truncate max-w-[130px] ${
                            isBright ? 'bg-black/[0.03] text-zinc-600 border-black/[0.06]' : 'bg-white/[0.04] text-white/60 border-white/[0.06]'
                        }`}>
                            {domain || (spaceType === 'ghost'
                                ? t('chrome.badgeIncognito', null, 'incognito')
                                : spaceType === 'tor'
                                    ? t('chrome.badgeTorCircuit', null, 'tor circuit')
                                    : t('chrome.badgeLocal', null, 'local'))}
                        </span>
                        {tab.suspended && (
                            <span className={`text-[9px] font-mono uppercase tracking-wider ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                {t('chrome.badgeSleep', null, 'sleep')}
                            </span>
                        )}
                    </div>

                    {!tab.suspended && !tab.isClosing && tab.url && tab.url !== 'about:blank' && (tab.isAudioPlaying || tab.isAudible || tab.isMuted) && (
                        <div className="absolute top-2.5 right-2.5 opacity-100 group-hover:opacity-0 transition-opacity duration-200 md:flex hidden pointer-events-none">
                            {tab.isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-accent opacity-80 animate-pulse" />}
                        </div>
                    )}

                    {renderActionButtons('normal')}
                </div>
            );
        }

        // 3. Signature Liquid Glass Pills Mode (Default)
        return (
            <div 
                {...commonProps}
                className={`sidebar-tab-item group relative flex items-center justify-between ${
                    uiScale === 'compact' ? 'py-2 px-2.5' : 'p-3'
                } ${
                    isSquare ? 'rounded-none !rounded-none' : isCohesive ? 'rounded-xl' : (uiScale === 'compact' ? 'rounded-lg' : 'rounded-xl')
                } border cursor-grab active:cursor-grabbing w-full select-none transition-all duration-200 ${tab.isClosing ? 'tab-closing-anim' : 'animate-pop-in'} ${isDropTarget ? 'bg-accent/[0.06] border-accent/40' : ''} ${draggedItem?.tab?.id === tab.id ? 'opacity-35 scale-[0.98]' : ''} ${
                    isSelected
                        ? 'ring-1 ring-accent/60 bg-accent/15 border-accent/50'
                        : tab.active 
                        ? (isBright 
                            ? 'bg-white/80 border-black/[0.08] text-zinc-950 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)]' 
                            : 'text-accent font-semibold') 
                        : (isBright 
                            ? 'bg-transparent hover:bg-black/[0.04] text-zinc-700 hover:text-zinc-950 border-transparent' 
                            : 'bg-transparent hover:bg-[color:var(--sidebar-bg-hover)] text-[color:var(--sidebar-text-normal)] hover:text-[color:var(--sidebar-text-hover)] border-transparent')
                }`}
                style={tab.active && !isBright && !isSelected ? { 
                    borderColor: 'var(--accent-40)', 
                    backgroundColor: 'var(--accent-15)',
                    boxShadow: draggedItem?.tab?.id === tab.id ? 'none' : '0 0 18px var(--accent-30)'
                } : undefined}
            >
                {renderDropIndicator()}
                <div className="flex items-center gap-2.5 w-full justify-center md:justify-start pointer-events-none pr-8">
                    {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-accent text-black flex items-center justify-center shrink-0 shadow-xs">
                            <Check size={10} strokeWidth={3} />
                        </span>
                    )}
                    {renderTabIcon(14)}
                    <span className={`${uiScale === 'compact' ? 'text-xs' : 'text-sm'} truncate hidden md:block transition-colors duration-200 ${tab.active ? (isBright ? 'font-bold text-zinc-950' : 'font-semibold text-accent') : 'font-medium'}`}>
                        {tabTitle}
                    </span>
                </div>

                {!tab.suspended && !tab.isClosing && tab.url && tab.url !== 'about:blank' && (tab.isAudioPlaying || tab.isAudible || tab.isMuted) && (
                    <div className="absolute right-3 opacity-100 group-hover:opacity-0 transition-opacity duration-200 md:flex hidden pointer-events-none">
                        {tab.isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-accent opacity-80 animate-pulse" />}
                    </div>
                )}

                {renderActionButtons('normal')}
            </div>
        );
    };

    const renderSplitGroupSlotBadge = (slotIdx) => {
        if (splitOrientation === 'quad') return `P${slotIdx + 1}`;
        if (splitOrientation === 'vertical') return slotIdx === 0 ? 'T' : 'B';
        return slotIdx === 0 ? 'L' : 'R';
    };

    const renderSplitTabGroup = (
        slots,
        slotCount,
        spaceType,
        isParked = false,
        groupOrientation = splitOrientation,
        groupId = null,
        groupName = '',
        groupNumber = 1
    ) => {
        const isSquare = frameCurvature === 'square';
        const isCohesive = frameCurvature === 'cohesive';
        const isQuad = groupOrientation === 'quad';
        const focusedSlotIdx = isParked ? -1 : getFocusedSlotIndex(focusedPane);
        const LayoutIcon = isQuad
            ? LayoutGrid
            : (groupOrientation === 'vertical' ? SplitSquareVertical : SplitSquareHorizontal);
        const hasSecondaryTab = slots.slice(1, slotCount).some(Boolean);

        const groupRadiusClass = isSquare
            ? 'rounded-none !rounded-none'
            : (tabPresentation === 'compact'
                ? (isCohesive ? 'rounded-xl' : 'rounded-lg')
                : (isCohesive ? 'rounded-2xl' : 'rounded-xl'));

        const renderMiniFavicon = (tabObj, size = 13) => {
            if (!tabObj) return <Plus size={size - 1} className="opacity-50" />;
            if (spaceType === 'ghost') return <Ghost size={size} className="text-accent opacity-80 shrink-0" />;
            if (spaceType === 'tor') return <Globe size={size} className="text-purple-400 shrink-0" />;
            const safeFav = getSafeFaviconUrl(tabObj.url, settings, 32);
            if (safeFav) {
                return (
                    <img
                        src={safeFav}
                        alt=""
                        style={{ width: size, height: size }}
                        className="rounded-sm shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                );
            }
            return <Globe size={size} className="opacity-65 shrink-0" />;
        };

        const getTabLabel = (tabObj) => {
            if (!tabObj) return t('chrome.splitPickTabShort', null, 'Select tab...');
            return (!tabObj.title || PLACEHOLDER_TAB_TITLE_SET.has(tabObj.title))
                ? t('nav.newTab', null, 'New Tab')
                : tabObj.title;
        };

        const handleSlotClick = (e, slotIdx, tabObj) => {
            e.stopPropagation();
            if (isParked) {
                restoreParkedSplitGroup(groupId, slotIdx);
                return;
            }
            if (!tabObj) {
                setFocusedPane(slotIndexToFocusedPane(slotIdx));
                return;
            }
            setFocusedPane(slotIndexToFocusedPane(slotIdx));
            useUIStore.getState().setCurrentUrl(tabObj.url || '');
        };

        const handleSlotContextMenu = (e, tabObj) => {
            if (!tabObj) return;
            e.preventDefault();
            e.stopPropagation();
            setTabContextMenu({ x: e.clientX, y: e.clientY, tab: tabObj, spaceType });
        };

        const handleSlotClose = (e, slotIdx, tabObj) => {
            e.stopPropagation();
            if (!tabObj) return;
            if (slotIdx >= 1 && isQuad) {
                setSplitPaneTabId(slotIdx, null);
            } else {
                handleCloseTab(tabObj.id);
            }
        };

        const groupContainerStyle = isParked
            ? (isBright
                ? { backgroundColor: 'rgba(0, 0, 0, 0.025)', borderColor: 'rgba(0, 0, 0, 0.08)' }
                : { backgroundColor: 'rgba(255, 255, 255, 0.025)', borderColor: 'rgba(255, 255, 255, 0.08)', boxShadow: 'none' })
            : (isBright
                ? { backgroundColor: 'rgba(255, 255, 255, 0.72)', borderColor: 'var(--accent-40, rgba(212,188,148,0.4))' }
                : { backgroundColor: 'rgba(255, 255, 255, 0.045)', borderColor: 'var(--accent-30, rgba(212,188,148,0.35))', boxShadow: '0 4px 18px rgba(0,0,0,0.22)' });

        const editKey = `${spaceType}:${groupId || 'active'}`;
        const isEditingGroup = editingSplitGroupKey === editKey;
        const baseGroupLabel = isQuad ? t('chrome.quadGroupLabel', null, 'Quad Split') : t('chrome.splitGroupLabel', null, 'Split Group');
        const displayGroupLabel = groupName ? groupName : `${baseGroupLabel} ${groupNumber}`;

        const startGroupRename = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            setEditingSplitGroupKey(editKey);
            setEditingSplitGroupDraft(groupName || '');
        };

        const commitGroupRename = () => {
            renameSplitGroup(isParked ? groupId : (activeSplitGroupId || 'active'), editingSplitGroupDraft);
            setEditingSplitGroupKey(null);
            setEditingSplitGroupDraft('');
        };

        const cancelGroupRename = () => {
            setEditingSplitGroupKey(null);
            setEditingSplitGroupDraft('');
        };

        const handleGroupContainerClick = (e) => {
            if (!isParked || isEditingGroup) return;
            e.stopPropagation();
            restoreParkedSplitGroup(groupId, 0);
        };

        const renderGroupHeader = (compactHeader = false) => (
            <div className={`flex items-center justify-between ${compactHeader ? 'px-1.5 py-0.5' : 'px-1.5 py-0.5'} select-none gap-1`}>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <LayoutIcon size={11} className={`${isParked ? (isBright ? 'text-zinc-500' : 'text-white/45') : 'text-accent'} shrink-0`} />
                    {isEditingGroup ? (
                        <input
                            type="text"
                            autoFocus
                            value={editingSplitGroupDraft}
                            placeholder={`${baseGroupLabel} ${groupNumber}`}
                            maxLength={40}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditingSplitGroupDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') commitGroupRename();
                                else if (e.key === 'Escape') cancelGroupRename();
                            }}
                            onBlur={commitGroupRename}
                            className={`hidden md:block w-full min-w-0 px-1.5 py-0.5 rounded text-[10px] font-semibold outline-none border ${
                                isBright
                                    ? 'bg-white text-zinc-900 border-accent/60 placeholder:text-zinc-400'
                                    : 'bg-black/40 text-white border-accent/60 placeholder:text-white/35'
                            }`}
                        />
                    ) : (
                        <span
                            onDoubleClick={startGroupRename}
                            title={isParked ? `${displayGroupLabel} • Click to open • Double-click to rename` : `${displayGroupLabel} • Double-click to rename`}
                            className={`hidden md:inline text-[10px] font-bold ${groupName ? 'tracking-normal' : 'uppercase tracking-wider'} truncate ${
                                isParked ? (isBright ? 'text-zinc-600' : 'text-white/55') : 'text-accent'
                            }`}
                        >
                            {displayGroupLabel}
                        </span>
                    )}
                </div>
                <div className="hidden md:flex items-center gap-0.5 shrink-0">
                    {!isEditingGroup && (
                        <button
                            type="button"
                            onClick={startGroupRename}
                            className={`opacity-0 group-hover/splitgrp:opacity-100 p-0.5 rounded transition-all duration-150 cursor-pointer ${
                                isBright ? 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5' : 'text-white/45 hover:text-white hover:bg-white/10'
                            }`}
                            title={t('chrome.renameSplitGroupTooltip', null, 'Rename Split Group')}
                        >
                            <Edit2 size={9.5} />
                        </button>
                    )}
                    {!isParked && hasSecondaryTab && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); swapSplitPanes(); }}
                            className={`p-0.5 rounded transition-all duration-200 cursor-pointer ${isBright ? 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                            title={t('chrome.swapPanesTooltip', null, 'Swap Panes')}
                        >
                            <ArrowLeftRight size={10} className="transition-transform duration-300 hover:rotate-180" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isParked) {
                                clearParkedSplitGroup(groupId);
                            } else {
                                toggleSplitView();
                            }
                        }}
                        className={`p-0.5 rounded transition cursor-pointer ${isBright ? 'text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10' : 'text-white/50 hover:text-rose-300 hover:bg-rose-500/15'}`}
                        title={t('chrome.closeSplitViewTooltip', null, 'Close Split View')}
                    >
                        <X size={10} />
                    </button>
                </div>
            </div>
        );

        // 1. Compact High-Density Mode
        if (tabPresentation === 'compact') {
            return (
                <div
                    key={`split-tab-group-compact-${groupId || 'active'}`}
                    style={groupContainerStyle}
                    onClick={handleGroupContainerClick}
                    className={`group/splitgrp relative flex flex-col gap-0.5 p-1 border border-l-2 ${
                        isParked ? `cursor-pointer ${isBright ? 'border-l-black/15 hover:border-black/20' : 'border-l-white/15 hover:border-white/20'}` : 'border-l-accent'
                    } ${groupRadiusClass} ${isReducedMotion ? '' : 'animate-split-group'}`}
                >
                    {renderGroupHeader(true)}
                    {Array.from({ length: slotCount }, (_, slotIdx) => {
                        const tabObj = slots[slotIdx];
                        const isSlotFocused = focusedSlotIdx === slotIdx;
                        const slotRadius = isSquare ? 'rounded-none' : 'rounded-md';
                        return (
                            <div
                                key={tabObj ? tabObj.id : `empty-slot-${slotIdx}`}
                                data-tab-id={tabObj?.id}
                                onClick={(e) => handleSlotClick(e, slotIdx, tabObj)}
                                onContextMenu={(e) => handleSlotContextMenu(e, tabObj)}
                                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                                onAuxClick={(e) => { if (e.button === 1 && tabObj) handleSlotClose(e, slotIdx, tabObj); }}
                                className={`group/slot flex items-center justify-between py-1 px-2 ${slotRadius} cursor-pointer transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-[2px] ${
                                    !tabObj
                                        ? `border border-dashed ${isSlotFocused ? 'border-accent/60 bg-accent/10' : (isBright ? 'border-black/15 text-zinc-500' : 'border-white/15 text-white/45')}`
                                        : (isSlotFocused
                                            ? (isBright ? 'bg-white text-zinc-950 font-semibold shadow-2xs' : 'bg-white/12 text-accent font-semibold')
                                            : (isBright ? 'hover:bg-black/[0.04] text-zinc-700' : 'hover:bg-white/[0.06] text-white/80'))
                                }`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`hidden md:inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-mono font-bold rounded shrink-0 ${
                                        isSlotFocused ? 'bg-accent text-zinc-950' : (isBright ? 'bg-black/[0.06] text-zinc-600' : 'bg-white/[0.08] text-white/55')
                                    }`}>
                                        {slotIdx + 1}
                                    </span>
                                    {renderMiniFavicon(tabObj, 12)}
                                    <span className="text-xs truncate hidden md:block">{getTabLabel(tabObj)}</span>
                                </div>
                                {tabObj && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleSlotClose(e, slotIdx, tabObj)}
                                        className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded hover:bg-white/10 transition shrink-0 hidden md:flex"
                                        title={t('nav.closeTab', null, 'Close Tab')}
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        // 2. Rich Card Tile Mode (mirrors spatial split layout inside the card!)
        if (tabPresentation === 'cards') {
            const cardRadius = isSquare ? 'rounded-none' : (isCohesive ? 'rounded-xl' : 'rounded-lg');
            const useGridCols = groupOrientation === 'horizontal' || isQuad;
            return (
                <div
                    key={`split-tab-group-cards-${groupId || 'active'}`}
                    style={groupContainerStyle}
                    onClick={handleGroupContainerClick}
                    className={`group/splitgrp relative flex flex-col gap-1.5 p-2 border ${isParked ? 'cursor-pointer' : ''} ${groupRadiusClass} ${isReducedMotion ? '' : 'animate-split-group'}`}
                >
                    {renderGroupHeader(false)}
                    <div className={useGridCols ? 'grid grid-cols-1 md:grid-cols-2 gap-1.5' : 'flex flex-col gap-1.5'}>
                        {Array.from({ length: slotCount }, (_, slotIdx) => {
                            const tabObj = slots[slotIdx];
                            const isSlotFocused = focusedSlotIdx === slotIdx;
                            let domainStr = '';
                            try { if (tabObj?.url) domainStr = new URL(tabObj.url).hostname.replace(/^www\./, ''); } catch (_) {}
                            return (
                                <div
                                    key={tabObj ? tabObj.id : `empty-card-${slotIdx}`}
                                    data-tab-id={tabObj?.id}
                                    onClick={(e) => handleSlotClick(e, slotIdx, tabObj)}
                                    onContextMenu={(e) => handleSlotContextMenu(e, tabObj)}
                                    onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                                    onAuxClick={(e) => { if (e.button === 1 && tabObj) handleSlotClose(e, slotIdx, tabObj); }}
                                    className={`group/slot relative flex flex-col justify-between p-2 ${cardRadius} border cursor-pointer transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] ${
                                        !tabObj
                                            ? `border-dashed ${isSlotFocused ? 'border-accent/60 bg-accent/10' : (isBright ? 'border-black/15 bg-black/[0.02] text-zinc-500' : 'border-white/15 bg-white/[0.02] text-white/45')}`
                                            : (isSlotFocused
                                                ? (isBright ? 'bg-white border-accent/60 text-zinc-950 shadow-xs' : 'bg-white/[0.10] border-accent/55 text-white shadow-xs')
                                                : (isBright ? 'bg-white/60 hover:bg-white/90 border-black/[0.06] text-zinc-800' : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/85'))
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {renderMiniFavicon(tabObj, 12)}
                                            <span className={`text-[11px] font-semibold truncate hidden md:block ${isSlotFocused && !isBright ? 'text-accent' : ''}`}>
                                                {getTabLabel(tabObj)}
                                            </span>
                                        </div>
                                        <span className={`hidden md:inline text-[9px] font-mono font-bold px-1 rounded shrink-0 ${
                                            isSlotFocused ? 'bg-accent text-zinc-950' : (isBright ? 'bg-black/[0.06] text-zinc-500' : 'bg-white/[0.08] text-white/50')
                                        }`}>
                                            {renderSplitGroupSlotBadge(slotIdx)}
                                        </span>
                                    </div>
                                    <div className="hidden md:flex items-center justify-between mt-1 text-[9px] font-mono opacity-60 truncate">
                                        <span className="truncate">{domainStr || (tabObj ? 'tab' : 'pick')}</span>
                                        {tabObj && (
                                            <button
                                                type="button"
                                                onClick={(e) => handleSlotClose(e, slotIdx, tabObj)}
                                                className="opacity-0 group-hover/slot:opacity-100 hover:text-rose-400 transition shrink-0"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // 3. Signature Liquid Glass Pills Mode (Default)
        const itemRadius = isSquare ? 'rounded-none' : (isCohesive ? 'rounded-xl' : 'rounded-lg');
        return (
            <div
                key={`split-tab-group-pills-${groupId || 'active'}`}
                style={groupContainerStyle}
                onClick={handleGroupContainerClick}
                className={`group/splitgrp relative flex flex-col gap-1 p-1.5 border ${isParked ? 'cursor-pointer' : ''} ${groupRadiusClass} ${isReducedMotion ? '' : 'animate-split-group'}`}
            >
                {renderGroupHeader(false)}
                <div className="relative flex flex-col gap-1 pl-2">
                    {/* Vertical Accent Connector Rail */}
                    <div className={`hidden md:block absolute left-0.5 top-2 bottom-2 w-[2px] rounded-full pointer-events-none ${
                        isParked ? (isBright ? 'bg-black/15' : 'bg-white/15') : 'bg-accent/65'
                    }`} />
                    {Array.from({ length: slotCount }, (_, slotIdx) => {
                        const tabObj = slots[slotIdx];
                        const isSlotFocused = focusedSlotIdx === slotIdx;
                        return (
                            <div
                                key={tabObj ? tabObj.id : `empty-pill-${slotIdx}`}
                                data-tab-id={tabObj?.id}
                                onClick={(e) => handleSlotClick(e, slotIdx, tabObj)}
                                onContextMenu={(e) => handleSlotContextMenu(e, tabObj)}
                                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                                onAuxClick={(e) => { if (e.button === 1 && tabObj) handleSlotClose(e, slotIdx, tabObj); }}
                                className={`group/slot flex items-center justify-between ${uiScale === 'compact' ? 'py-1.5 px-2' : 'py-2 px-2.5'} ${itemRadius} border cursor-pointer transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-[2px] ${
                                    !tabObj
                                        ? `border-dashed ${isSlotFocused ? 'border-accent/60 bg-accent/10 text-accent' : (isBright ? 'border-black/15 text-zinc-500 hover:border-accent/40' : 'border-white/15 text-white/45 hover:border-accent/40')}`
                                        : (isSlotFocused
                                            ? (isBright ? 'bg-white border-black/10 text-zinc-950 font-semibold shadow-xs' : 'bg-accent/15 border-accent/40 text-accent font-semibold')
                                            : (isBright ? 'bg-black/[0.02] hover:bg-white/80 border-transparent text-zinc-800' : 'bg-white/[0.03] hover:bg-white/[0.08] border-transparent text-white/85'))
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                    {renderMiniFavicon(tabObj, 13)}
                                    <span className="text-xs truncate hidden md:block">{getTabLabel(tabObj)}</span>
                                </div>
                                <div className="hidden md:flex items-center gap-1 shrink-0">
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                        isSlotFocused ? 'bg-accent text-zinc-950' : (isBright ? 'bg-black/[0.06] text-zinc-600' : 'bg-white/[0.08] text-white/55')
                                    }`}>
                                        {renderSplitGroupSlotBadge(slotIdx)}
                                    </span>
                                    {tabObj && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleSlotClose(e, slotIdx, tabObj)}
                                            className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded hover:bg-white/10 transition"
                                            title={t('nav.closeTab', null, 'Close Tab')}
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderSpaceTabList = (fullSpaceTabs, filtered, spaceType) => {
        const orderedIds = filtered.map(t => t.id);
        const filteredIds = new Set(orderedIds);
        const groupedTabIds = new Set();
        const anchorDescriptors = new Map(); // anchorTabId -> Array<descriptor>
        const topDescriptors = [];

        if (isSplitView && spaceType === activeSpace) {
            const { slots, slotCount } = resolveSplitSlotTabs({
                spaceTabs: fullSpaceTabs,
                isSplitView: true,
                splitOrientation,
                splitPaneTabIds,
                splitRightTabId
            });
            slots.slice(0, slotCount).filter(Boolean).forEach(t => groupedTabIds.add(t.id));
            const anchorTab = slots.slice(0, slotCount).find(t => t && filteredIds.has(t.id)) || null;
            const desc = {
                slots,
                slotCount,
                isParked: false,
                orientation: splitOrientation,
                groupId: activeSplitGroupId || 'active',
                groupName: activeSplitGroupName
            };
            if (anchorTab) {
                anchorDescriptors.set(anchorTab.id, [desc]);
            } else {
                topDescriptors.push(desc);
            }
        }

        const byId = new Map((fullSpaceTabs || []).map(t => [t.id, t]));
        for (const pg of parkedSplitGroups) {
            if (!pg || pg.space !== spaceType) continue;
            const pOrientation = pg.orientation || 'horizontal';
            const pSlotCount = pOrientation === 'quad' ? 4 : 2;
            const pSlots = [
                byId.get(pg.primaryTabId) || null,
                ...(pg.paneTabIds || []).slice(0, 3).map(id => (id ? (byId.get(id) || null) : null))
            ];
            const populated = pSlots.slice(0, pSlotCount).filter(t => t && !groupedTabIds.has(t.id));
            if (populated.length < 2 || !pSlots[0] || groupedTabIds.has(pSlots[0].id)) continue;

            populated.forEach(t => groupedTabIds.add(t.id));
            const anchorTab = populated.find(t => filteredIds.has(t.id)) || null;
            const desc = {
                slots: pSlots,
                slotCount: pSlotCount,
                isParked: true,
                orientation: pOrientation,
                groupId: pg.id,
                groupName: pg.name || ''
            };
            if (anchorTab) {
                const prev = anchorDescriptors.get(anchorTab.id) || [];
                anchorDescriptors.set(anchorTab.id, [...prev, desc]);
            } else {
                topDescriptors.push(desc);
            }
        }

        if (groupedTabIds.size === 0) {
            return filtered.map(tab => renderTab(tab, spaceType, orderedIds));
        }

        let groupNumberCounter = 0;
        const renderDescriptor = (d) => {
            groupNumberCounter += 1;
            return renderSplitTabGroup(
                d.slots,
                d.slotCount,
                spaceType,
                d.isParked,
                d.orientation,
                d.groupId,
                d.groupName,
                groupNumberCounter
            );
        };

        const topNodes = topDescriptors.map(renderDescriptor);
        return (
            <>
                {topNodes}
                {filtered.map((tab) => {
                    if (groupedTabIds.has(tab.id)) {
                        const list = anchorDescriptors.get(tab.id);
                        return list ? list.map(renderDescriptor) : null;
                    }
                    return renderTab(tab, spaceType, orderedIds);
                })}
            </>
        );
    };

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
            className={`sidebar-container min-w-0 flex-shrink-0 flex flex-col ${
                frameCurvature === 'square'
                    ? 'rounded-none !rounded-none'
                    : frameCurvature === 'cohesive'
                    ? 'rounded-2xl'
                    : 'rounded-[2rem]'
            } overflow-hidden relative z-10 ${
            isBright 
                ? 'liquid-glass-bright text-zinc-900 sidebar-light' 
                : 'liquid-glass-dark text-white/90 sidebar-dark'
        } ${
            isChromeHidden
                ? `!fixed ${sidebarPosition === 'right' ? '!right-3' : '!left-3'} !top-3 !bottom-3 !z-[99980] shadow-[0_25px_70px_rgba(0,0,0,0.75)] backdrop-blur-3xl`
                : (isSidebarHidden ? 'is-hidden pointer-events-none' : '')
        }`}
        style={isChromeHidden ? {
            position: 'fixed',
            left: sidebarPosition === 'right' ? 'auto' : '12px',
            right: sidebarPosition === 'right' ? '12px' : 'auto',
            top: '12px',
            bottom: '12px',
            width: uiScale === 'compact' ? 240 : 256,
            maxWidth: uiScale === 'compact' ? 240 : 256,
            zIndex: 99980,
            transform: isSidebarPeeking 
                ? 'translateX(0)' 
                : (sidebarPosition === 'right' ? 'translateX(calc(100% + 24px))' : 'translateX(calc(-100% - 24px))'),
            opacity: isSidebarPeeking ? 1 : 0,
            pointerEvents: isSidebarPeeking ? 'auto' : 'none',
            transition: isReducedMotion ? 'none' : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
            willChange: 'transform, opacity'
        } : {
            width: isSidebarHidden ? 0 : (uiScale === 'compact' ? 240 : 256),
            minWidth: 0,
            maxWidth: isSidebarHidden ? 0 : (uiScale === 'compact' ? 240 : 256),
            marginRight: sidebarPosition === 'right' ? 0 : (isSidebarHidden ? 0 : (uiScale === 'compact' ? 6 : 16)),
            marginLeft: sidebarPosition === 'right' ? (isSidebarHidden ? 0 : (uiScale === 'compact' ? 6 : 16)) : 0,
            opacity: isSidebarHidden ? 0 : 1,
            pointerEvents: isSidebarHidden ? 'none' : 'auto',
            transition: isReducedMotion ? 'none' : (isSidebarHidden
                ? (sidebarPosition === 'right'
                    ? 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
                    : 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease')
                : (sidebarPosition === 'right'
                    ? 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease'
                    : 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease')),
            willChange: sidebarPosition === 'right' ? 'width, max-width, margin-left, opacity' : 'width, max-width, margin-right, opacity'
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
                    transform: (!isChromeHidden && isSidebarHidden) 
                        ? (sidebarPosition === 'right' ? 'translateX(100%)' : 'translateX(-100%)') 
                        : 'translateX(0)',
                    opacity: (!isChromeHidden && isSidebarHidden) ? 0 : 1,
                    transition: isReducedMotion ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                    pointerEvents: (!isChromeHidden && isSidebarHidden) ? 'none' : 'auto',
                    willChange: 'transform, opacity'
                }}
            >

            <div 
                className={`drag-region flex px-4 py-3.5 border-b border-[color:var(--sidebar-border)] items-center justify-between ${
                    sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'
                }`}
                onDoubleClick={(e) => {
                    if (!e.target.closest('button, input, select, textarea, [data-no-drag]')) {
                        window.electronAPI?.maximize();
                    }
                }}
            >
                {(() => {
                    const isCloseFirst = effectiveControlsOrder === 'close-first';

                    if (windowControlsStyle === 'windows') {
                        const btnClose = (
                            <button 
                                key="win-close"
                                onClick={() => window.electronAPI?.close?.()} 
                                className={`w-6 h-6 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-md'} flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer hover:bg-red-500 hover:text-white ${
                                    isBright ? 'text-zinc-600' : 'text-white/70'
                                }`} 
                                title={t('common.close', null, 'Close')}
                            >
                                <X size={12} strokeWidth={2} />
                            </button>
                        );
                        const btnMin = (
                            <button 
                                key="win-min"
                                onClick={() => window.electronAPI?.minimize?.()} 
                                className={`w-6 h-6 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-md'} flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                                    isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.06]' : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`} 
                                title={t('chrome.windowMinimize', null, 'Minimize')}
                            >
                                <Minus size={11} strokeWidth={2} />
                            </button>
                        );
                        const btnMax = (
                            <button 
                                key="win-max"
                                onClick={() => window.electronAPI?.maximize?.()} 
                                className={`w-6 h-6 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-md'} flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                                    isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.06]' : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`} 
                                title={t('chrome.windowMaximize', null, 'Maximize')}
                            >
                                <Square size={10} strokeWidth={1.8} />
                            </button>
                        );

                        return (
                            <div className="flex items-center gap-0.5 flex-row" style={{ WebkitAppRegion: 'no-drag' }}>
                                {isCloseFirst ? [btnClose, btnMin, btnMax] : [btnMin, btnMax, btnClose]}
                            </div>
                        );
                    }

                    if (windowControlsStyle === 'minimal') {
                        const btnClose = (
                            <button 
                                key="min-close"
                                onClick={() => window.electronAPI?.close?.()} 
                                className={`w-3.5 h-3.5 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-full'} border transition-all duration-200 hover:scale-110 active:scale-90 flex items-center justify-center group/btn cursor-pointer ${
                                    isBright 
                                        ? 'bg-black/10 border-black/15 hover:bg-red-500/20 hover:border-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                                        : 'bg-white/15 border-white/20 hover:bg-red-500/30 hover:border-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                }`} 
                                title={t('common.close', null, 'Close')}
                            >
                                <X size={8} strokeWidth={2.5} className="opacity-0 group-hover/btn:opacity-100 text-red-400 transition-opacity duration-150" />
                            </button>
                        );
                        const btnMin = (
                            <button 
                                key="min-min"
                                onClick={() => window.electronAPI?.minimize?.()} 
                                className={`w-3.5 h-3.5 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-full'} border transition-all duration-200 hover:scale-110 active:scale-90 flex items-center justify-center group/btn cursor-pointer ${
                                    isBright 
                                        ? 'bg-black/10 border-black/15 hover:bg-amber-500/20 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                                        : 'bg-white/15 border-white/20 hover:bg-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                }`} 
                                title={t('chrome.windowMinimize', null, 'Minimize')}
                            >
                                <Minus size={8} strokeWidth={2.5} className="opacity-0 group-hover/btn:opacity-100 text-amber-300 transition-opacity duration-150" />
                            </button>
                        );
                        const btnMax = (
                            <button 
                                key="min-max"
                                onClick={() => window.electronAPI?.maximize?.()} 
                                className={`w-3.5 h-3.5 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-full'} border transition-all duration-200 hover:scale-110 active:scale-90 flex items-center justify-center group/btn cursor-pointer ${
                                    isBright 
                                        ? 'bg-black/10 border-black/15 hover:bg-emerald-500/20 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                                        : 'bg-white/15 border-white/20 hover:bg-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                }`} 
                                title={t('chrome.windowMaximize', null, 'Maximize')}
                            >
                                <Maximize2 size={8} strokeWidth={2.5} className="opacity-0 group-hover/btn:opacity-100 text-emerald-300 transition-opacity duration-150" />
                            </button>
                        );

                        return (
                            <div className="flex items-center gap-2 flex-row" style={{ WebkitAppRegion: 'no-drag' }}>
                                {isCloseFirst ? [btnClose, btnMin, btnMax] : [btnMin, btnMax, btnClose]}
                            </div>
                        );
                    }

                    // macOS Window Controls (Default)
                    const btnClose = (
                        <button 
                            key="mac-close"
                            onClick={() => window.electronAPI?.close?.()} 
                            className={`w-3.5 h-3.5 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-full'} bg-red-500/80 hover:bg-red-400 transition-all duration-150 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(239,68,68,0.5)] flex items-center justify-center group/btn cursor-pointer`}
                            title={t('common.close', null, 'Close')}
                        >
                            <X size={10} className="opacity-0 group-hover/btn:opacity-100 text-black transition-opacity duration-150" />
                        </button>
                    );
                    const btnMin = (
                        <button 
                            key="mac-min"
                            onClick={() => window.electronAPI?.minimize?.()} 
                            className={`w-3.5 h-3.5 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-full'} bg-yellow-500/80 hover:bg-yellow-400 transition-all duration-150 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(234,179,8,0.5)] flex items-center justify-center group/btn cursor-pointer`}
                            title={t('chrome.windowMinimize', null, 'Minimize')}
                        >
                            <Minus size={10} className="opacity-0 group-hover/btn:opacity-100 text-black transition-opacity duration-150" />
                        </button>
                    );
                    const btnMax = (
                        <button 
                            key="mac-max"
                            onClick={() => window.electronAPI?.maximize?.()} 
                            className={`w-3.5 h-3.5 ${frameCurvature === 'square' ? 'rounded-none' : 'rounded-full'} bg-green-500/80 hover:bg-green-400 transition-all duration-150 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(34,197,94,0.5)] flex items-center justify-center group/btn cursor-pointer`}
                            title={t('chrome.windowMaximize', null, 'Maximize')}
                        >
                            <Maximize2 size={10} className="opacity-0 group-hover/btn:opacity-100 text-black transition-opacity duration-150" />
                        </button>
                    );

                    return (
                        <div className="flex gap-2 flex-row" style={{ WebkitAppRegion: 'no-drag' }}>
                            {isCloseFirst ? [btnClose, btnMin, btnMax] : [btnMin, btnMax, btnClose]}
                        </div>
                    );
                })()}
                <div className="hidden md:flex gap-1.5 text-[color:var(--sidebar-text-muted)] items-center flex-row" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button 
                        onClick={() => togglePopover('user')} 
                        className={`w-[25px] h-[25px] rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer relative ${
                            activePopover === 'user' || activePopover === 'userProfile'
                                ? 'bg-accent-20 border-accent text-accent shadow-[0_0_10px_var(--accent)] scale-105'
                                : (isBright ? 'bg-white/70 border-white/40 text-zinc-700 hover:text-black shadow-xs' : 'bg-white/10 border-white/20 text-white/70 hover:text-white')
                        }`} 
                        style={{ borderColor: activeProfile?.color || '#d4bc94' }}
                        title={t('chrome.profileTooltip', {
                            name: activeProfile?.name || t('chrome.defaultProfileName', null, 'Default')
                        }, `Profile: ${activeProfile?.name || 'Default'} & Cloud Sync`)}
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
                    <button onClick={() => setActiveModal('history')} className="hover:text-accent hover:scale-110 active:scale-90 transition-all duration-200 p-1 rounded-md cursor-pointer" title={t('nav.history', null, 'History')}><Clock size={15} strokeWidth={1.85} /></button>
                    <button onClick={() => setActiveModal('settings')} className="hover:text-accent hover:scale-110 active:scale-90 hover:rotate-45 transition-all duration-200 p-1 rounded-md cursor-pointer" title={t('nav.settings', null, 'Settings')}><Settings size={15} strokeWidth={1.85} /></button>
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
                        title={t('chrome.zenDashboardTooltip', null, 'Zen Dashboard (Middle-click to open in background)')}
                    >
                        <Home size={15} strokeWidth={1.85} />
                    </button>
                </div>
            </div>

            <div className={`px-4 ${uiScale === 'compact' ? 'py-2.5 gap-1.5' : 'py-4 gap-2'} hidden md:grid grid-cols-4 border-b border-[color:var(--sidebar-border)] relative z-10`}>
                {(getPinnedTabsForSpace ? getPinnedTabsForSpace(activeSpace) : pinnedTabs).map((pin) => {
                    const tabs = getTabsForSpace ? getTabsForSpace(activeSpace) : (activeSpace === 'personal' ? privateTabs : activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs));
                    const pinTabs = (tabs || []).filter(t => isTabForPin(t, pin));
                    const activeSplitSlots = isSplitView ? resolveSplitSlotTabs({
                        spaceTabs: tabs || [],
                        isSplitView: true,
                        splitOrientation,
                        splitPaneTabIds,
                        splitRightTabId
                    }).slots : [];
                    const focusedSlotTab = isSplitView ? (activeSplitSlots[getFocusedSlotIndex(focusedPane)] || activeSplitSlots[0]) : null;
                    const hasActiveTab = isSplitView
                        ? Boolean(focusedSlotTab && isTabForPin(focusedSlotTab, pin))
                        : pinTabs.some(t => t.active);
                    const isAudible = pinTabs.some(t => t.isAudioPlaying || t.isAudible);
                    const isPopupOpen = activePinnedStack?.pin?.id === pin.id;
                    const isGitHubPin = pin.domain && pin.domain.toLowerCase().includes('github.com');

                    return (
                    <div key={pin.id} className="relative group flex justify-center animate-pin-in">
                        <button 
                            onClick={(e) => {
                                if (isGitHubPin) useGitHubStore.getState().closeHoverGlance();
                                handlePinnedTabClick(e, pin);
                            }} 
                            onContextMenu={(e) => {
                                if (isGitHubPin) useGitHubStore.getState().closeHoverGlance();
                                handlePinnedContextMenu(e, pin);
                            }}
                            onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                            onAuxClick={(e) => {
                                if (isGitHubPin) useGitHubStore.getState().closeHoverGlance();
                                handlePinnedAuxClick(e, pin);
                            }}
                            onMouseEnter={(e) => {
                                if (isGitHubPin) {
                                    useGitHubStore.getState().cancelCloseHoverGlance();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    if (ghHoverTimeoutRef.current) clearTimeout(ghHoverTimeoutRef.current);
                                    ghHoverTimeoutRef.current = setTimeout(() => {
                                        openHoverGlance(rect);
                                    }, 240);
                                }
                            }}
                            onMouseLeave={() => {
                                if (ghHoverTimeoutRef.current) {
                                    clearTimeout(ghHoverTimeoutRef.current);
                                    ghHoverTimeoutRef.current = null;
                                }
                                if (isGitHubPin) {
                                    useGitHubStore.getState().scheduleCloseHoverGlance(180);
                                }
                            }}
                            className={`relative w-10 h-10 flex flex-col items-center justify-center border rounded-xl transition-all duration-200 active:scale-95 shadow-sm overflow-hidden ${
                                hasActiveTab 
                                    ? 'bg-[color:var(--sidebar-bg-active)] border-accent/60 shadow-[0_0_12px_var(--accent)] scale-105' 
                                    : isPopupOpen
                                    ? 'bg-[color:var(--sidebar-bg-active)] border-white/40 scale-105'
                                    : 'bg-[color:var(--sidebar-bg-hover)] hover:bg-[color:var(--sidebar-bg-active)] border-[color:var(--sidebar-border)] group-hover:scale-105'
                            }`} 
                            title={(() => {
                                if (pinTabs.length > 0) {
                                    const countLabel = t(
                                        selectPluralForm(pinTabs.length, resolvedLanguage, 'chrome.openTabOne', 'chrome.openTabFew', 'chrome.openTabMany'),
                                        { count: pinTabs.length },
                                        `${pinTabs.length} open tab${pinTabs.length > 1 ? 's' : ''}`
                                    );
                                    return t(
                                        'chrome.pinnedTabTooltipWithCount',
                                        { title: pin.title, countLabel },
                                        `${pin.title} (${countLabel}) • Middle-click to open in background • Right-click for tab list`
                                    );
                                }
                                return t(
                                    'chrome.pinnedTabTooltipNoCount',
                                    { title: pin.title },
                                    `${pin.title} • Middle-click to open in background • Right-click for tab list`
                                );
                            })()}
                        >
                            {getSafeFaviconUrl(pin.domain, settings, 64) ? (
                                <img 
                                    src={getSafeFaviconUrl(pin.domain, settings, 64)} 
                                    alt={pin.title} 
                                    className={`w-5 h-5 rounded-md drop-shadow-md transition-transform duration-200 ${pinTabs.length > 0 ? '-translate-y-1' : ''}`} 
                                    onError={(e) => { e.target.style.display = 'none'; }} 
                                />
                            ) : (
                                <Globe size={16} className={`transition-transform duration-200 ${pinTabs.length > 0 ? '-translate-y-1' : ''} ${isBright ? 'text-zinc-500' : 'text-white/55'}`} />
                            )}

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
                            title={t('chrome.unpin', null, 'Unpin')}
                        >
                            <Minus size={10} />
                        </button>
                    </div>
                )})}
                <div className="relative group flex justify-center animate-pin-in">
                    <button onClick={() => setActiveModal('addPin')} className="w-10 h-10 flex flex-col items-center justify-center bg-[color:var(--sidebar-bg-hover)] hover:bg-[color:var(--sidebar-bg-active)] border border-[color:var(--sidebar-border)] border-dashed rounded-xl transition-all duration-200 hover:scale-110 active:scale-90 hover:border-accent/60 shadow-sm text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer" title={t('chrome.pinNewAppTooltip', null, 'Pin New App / Shortcut')}>
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
                                const spPins = getPinnedTabsForSpace ? getPinnedTabsForSpace(sp.id) : pinnedTabs;
                                const filtered = spaceTabs.filter(t => !spPins.some(p => isTabForPin(t, p)));
                                const isDragOverRoot = dragOverItem === `root-${sp.id}`;

                                return (
                                    <div 
                                        key={sp.id}
                                        className={`h-full flex flex-col ${
                                            tabPresentation === 'compact' 
                                                ? 'gap-0.5 p-2 pt-1' 
                                                : tabPresentation === 'cards' 
                                                ? 'gap-2 p-3 pt-1.5' 
                                                : (uiScale === 'compact' ? 'gap-0.5 p-3 pt-1.5' : 'gap-1 p-4 pt-2')
                                        } overflow-y-auto hide-scroll`}
                                        style={{ width: `${100 / allSpaces.length}%` }}
                                        onDragOver={(e) => { e.preventDefault(); handleDragOver(`root-${sp.id}`); }}
                                        onDragLeave={(e) => {
                                            if (e.currentTarget.contains(e.relatedTarget)) return;
                                            handleDragLeave();
                                        }}
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
                                                {getSpaceDisplayName(sp)}
                                            </h3>
                                            <button 
                                                onClick={() => handleNewTab()} 
                                                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} 
                                                onAuxClick={handleNewTabAuxClick} 
                                                className="hidden md:flex text-[color:var(--sidebar-text-muted)] hover:text-accent transition-all duration-200 hover:scale-115 active:scale-90 p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md shrink-0" 
                                                title={t('chrome.newTabInSpaceTooltip', { space: getSpaceDisplayName(sp) }, `New Tab in ${getSpaceDisplayName(sp)} (CMD+T) • Middle-click for background`)}
                                            >
                                                <Plus size={12} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                        {(() => {
                                            const hasSplitInSpace = (isSplitView && sp.id === activeSpace) || parkedSplitGroups.some(pg => pg?.space === sp.id);
                                            if (filtered.length === 0 && !hasSplitInSpace) {
                                                return (
                                                    <button 
                                                        onClick={() => handleNewTab()} 
                                                        onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} 
                                                        onAuxClick={handleNewTabAuxClick} 
                                                        className={`group relative flex items-center justify-between ${
                                                            uiScale === 'compact' ? 'py-2 px-2.5' : 'p-3'
                                                        } ${
                                                            frameCurvature === 'square' ? 'rounded-none !rounded-none' : frameCurvature === 'cohesive' ? 'rounded-xl' : (uiScale === 'compact' ? 'rounded-lg' : 'rounded-xl')
                                                        } bg-[color:var(--sidebar-bg-hover)] border border-[color:var(--sidebar-border)] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-20)] border-dashed text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] w-full shadow-sm animate-pop-in`} 
                                                        title={t('chrome.newTabBtnTooltip', null, 'New Tab (CMD+T) • Middle-click for background')}
                                                    >
                                                        <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                                            <Plus size={14} className="flex-shrink-0 opacity-50 transition-transform duration-200 group-hover:rotate-90" />
                                                            <span className="text-sm font-medium truncate hidden md:block italic">{t('nav.newTab', null, 'New Tab')}</span>
                                                        </div>
                                                    </button>
                                                );
                                            }
                                            return renderSpaceTabList(spaceTabs, filtered, sp.id);
                                        })()}
                                    </div>
                                );
                            })}

                            {/* GHOST TABS */}
                            <div 
                                className={`h-full flex flex-col ${
                                    tabPresentation === 'compact' 
                                        ? 'gap-0.5 p-2 pt-1' 
                                        : tabPresentation === 'cards' 
                                        ? 'gap-2 p-3 pt-1.5' 
                                        : (uiScale === 'compact' ? 'gap-0.5 p-3 pt-1.5' : 'gap-1 p-4 pt-2')
                                } overflow-y-auto hide-scroll`}
                                style={{ width: `${100 / allSpaces.length}%` }}
                                onDragOver={(e) => { e.preventDefault(); handleDragOver('root-ghost'); }}
                                onDragLeave={(e) => {
                                    if (e.currentTarget.contains(e.relatedTarget)) return;
                                    handleDragLeave();
                                }}
                                onDrop={(e) => handleDropRoot(e, 'ghost')}
                            >
                                <div className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-ghost' ? 'border-[#a855f7] border-dashed bg-[#a855f7]/10 py-1' : 'border-transparent'}`}>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="hidden md:block text-[10px] uppercase font-bold text-[#a855f7]/60 tracking-widest">{t('chrome.incognitoTabs', null, 'Incognito Tabs')}</h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className="hidden md:flex text-[#a855f7]/50 hover:text-[#a855f7] transition-all duration-200 hover:scale-115 active:scale-90 p-1 hover:bg-[#a855f7]/10 rounded-md" title={t('chrome.newIncognitoTabTooltip', null, 'New Incognito Tab (CMD+T) • Middle-click for background')}>
                                            <Plus size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                                {(() => {
                                    const ghostPins = getPinnedTabsForSpace ? getPinnedTabsForSpace('ghost') : [];
                                    const filtered = ghostTabs.filter(t => !ghostPins.some(p => isTabForPin(t, p)));
                                    const hasSplitInGhost = (isSplitView && activeSpace === 'ghost') || parkedSplitGroups.some(pg => pg?.space === 'ghost');
                                    if (filtered.length === 0 && !hasSplitInGhost) {
                                        return (
                                            <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className={`group relative flex items-center justify-between ${
                                                uiScale === 'compact' ? 'py-2 px-2.5' : 'p-3'
                                            } ${
                                                frameCurvature === 'square' ? 'rounded-none !rounded-none' : frameCurvature === 'cohesive' ? 'rounded-xl' : (uiScale === 'compact' ? 'rounded-lg' : 'rounded-xl')
                                            } bg-[color:var(--sidebar-bg-hover)] border border-[color:var(--sidebar-border)] border-dashed text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] w-full shadow-sm animate-pop-in`} title={t('chrome.newIncognitoTabTooltip', null, 'New Incognito Tab (CMD+T) • Middle-click for background')}>
                                                <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                                    <Plus size={14} className="flex-shrink-0 opacity-50 transition-transform duration-200 group-hover:rotate-90" />
                                                    <span className="text-sm font-medium truncate hidden md:block italic">{t('chrome.newIncognitoTab', null, 'New Incognito Tab')}</span>
                                                </div>
                                            </button>
                                        );
                                    }
                                    return renderSpaceTabList(ghostTabs, filtered, 'ghost');
                                })()}
                            </div>

                            {/* TOR TABS */}
                            <div 
                                className={`h-full flex flex-col ${
                                    tabPresentation === 'compact' 
                                        ? 'gap-0.5 p-2 pt-1' 
                                        : tabPresentation === 'cards' 
                                        ? 'gap-2 p-3 pt-1.5' 
                                        : (uiScale === 'compact' ? 'gap-0.5 p-3 pt-1.5' : 'gap-1 p-4 pt-2')
                                } overflow-y-auto hide-scroll`}
                                style={{ width: `${100 / allSpaces.length}%` }}
                                onDragOver={(e) => { e.preventDefault(); handleDragOver('root-tor'); }}
                                onDragLeave={(e) => {
                                    if (e.currentTarget.contains(e.relatedTarget)) return;
                                    handleDragLeave();
                                }}
                                onDrop={(e) => handleDropRoot(e, 'tor')}
                            >
                                <div className={`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border ${dragOverItem === 'root-tor' ? 'border-purple-400 border-dashed bg-purple-500/10 py-1' : 'border-transparent'}`}>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${torStatus === 'connected' ? 'bg-purple-400 shadow-[0_0_6px_#c084fc]' : 'bg-amber-400'}`}></span>
                                        <h3 className="hidden md:block text-[10px] uppercase font-bold text-purple-400/80 tracking-widest">{t('chrome.torTabs', null, 'Tor Tabs')}</h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => useTorStore.getState().toggleTorEnabled(false, { fallbackSpace: 'ghost' })}
                                            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10 cursor-pointer" 
                                            title={t('chrome.turnOffTorTooltip', null, 'Turn off Tor and return to Ghost mode')}
                                        >
                                            <Ghost size={11} /> {t('chrome.ghostShort', null, 'Ghost')}
                                        </button>
                                        <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className="hidden md:flex text-purple-400/60 hover:text-purple-300 transition-all duration-200 hover:scale-115 active:scale-90 p-1 hover:bg-purple-500/10 rounded-md" title={t('chrome.newTorTabTooltip', null, 'New Tor Tab (CMD+T) • Middle-click for background')}>
                                            <Plus size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                                {(() => {
                                    const torPins = getPinnedTabsForSpace ? getPinnedTabsForSpace('tor') : [];
                                    const filtered = (torTabs || []).filter(t => !torPins.some(p => isTabForPin(t, p)));
                                    const hasSplitInTor = (isSplitView && activeSpace === 'tor') || parkedSplitGroups.some(pg => pg?.space === 'tor');
                                    if (filtered.length === 0 && !hasSplitInTor) {
                                        return (
                                            <button onClick={() => handleNewTab()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={handleNewTabAuxClick} className={`group relative flex items-center justify-between p-3 ${
                                                frameCurvature === 'square' ? 'rounded-none !rounded-none' : 'rounded-xl'
                                            } bg-purple-500/5 border border-purple-500/20 border-dashed text-purple-300/60 hover:text-purple-200 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] w-full shadow-sm animate-pop-in`} title={t('chrome.newTorTabTooltip', null, 'New Tor Tab (CMD+T) • Middle-click for background')}>
                                                <div className="flex items-center gap-3 w-full justify-center md:justify-start pointer-events-none pr-8">
                                                    <Plus size={14} className="flex-shrink-0 opacity-50 transition-transform duration-200 group-hover:rotate-90" />
                                                    <span className="text-sm font-medium truncate hidden md:block italic">{t('chrome.newTorTab', null, 'New Tor Tab')}</span>
                                                </div>
                                            </button>
                                        );
                                    }
                                    return renderSpaceTabList(torTabs || [], filtered, 'tor');
                                })()}
                            </div>

                        </div>
                    );
                })()}
            </div>

            {selectedTabIds.length >= 2 && (() => {
                const activeTabsList = getTabsForSpace ? (getTabsForSpace(activeSpace) || []) : [];
                const selectedTabs = activeTabsList.filter(t => selectedTabIds.includes(t.id));
                const allSelectedMuted = selectedTabs.length > 0 && selectedTabs.every(t => Boolean(t.isMuted));

                const handleBulkCopyUrls = () => {
                    const joined = getSelectedTabUrls(selectedTabIds);
                    if (!joined) {
                        showToast(t('chrome.noCopyableUrls', null, 'No copyable URLs in selected tabs'));
                        return;
                    }
                    const count = joined.split('\n').length;
                    const copyPromise = navigator.clipboard?.writeText
                        ? navigator.clipboard.writeText(joined).catch(() => window.electronAPI?.writeClipboardText?.(joined))
                        : Promise.resolve(window.electronAPI?.writeClipboardText?.(joined));
                    Promise.resolve(copyPromise).then(() => {
                        showToast(`Copied ${count} URL${count === 1 ? '' : 's'} to clipboard`);
                    }).catch(() => {});
                };

                const handleBulkSplitView = () => {
                    if (selectedTabIds.length < 2 || selectedTabIds.length > 4) return;
                    const isBlankTab = (t) => !t || !t.url || t.url === '' || t.url === 'about:blank' || t.url === 'qbrowse://newtab';
                    const orderedIds = [...selectedTabIds];
                    // Prefer placing a non-blank tab in secondary slots
                    const firstNonBlankIdx = orderedIds.findIndex(id => !isBlankTab(activeTabsList.find(t => t.id === id)));
                    const primaryId = orderedIds[0];
                    const secondaryRaw = orderedIds.slice(1, 4);
                    const secondaryResolved = [0, 1, 2].map((i) => {
                        const cid = secondaryRaw[i];
                        if (!cid) return null;
                        const tabObj = activeTabsList.find(t => t.id === cid);
                        return isBlankTab(tabObj) ? null : cid;
                    });
                    const nextOrientation = selectedTabIds.length >= 3 ? 'quad' : 'horizontal';
                    try { localStorage.setItem('qbrowse_split_orientation', nextOrientation); } catch (_) {}
                    const setList = (updater) => setTabsForSpace
                        ? setTabsForSpace(activeSpace, updater)
                        : (activeSpace === 'personal' ? setPrivateTabs(updater) : (activeSpace === 'work' ? setWorkTabs(updater) : (activeSpace === 'ghost' ? setGhostTabs(updater) : setTorTabs(updater))));
                    const nowTs = Date.now();
                    const activeSet = new Set([primaryId, ...secondaryResolved.filter(Boolean)]);
                    setList(activeTabsList.map(t => ({
                        ...t,
                        active: t.id === primaryId,
                        suspended: activeSet.has(t.id) ? false : t.suspended,
                        lastActiveAt: activeSet.has(t.id) ? nowTs : t.lastActiveAt
                    })));
                    const uiBefore = useUIStore.getState();
                    if (uiBefore.isSplitView) {
                        uiBefore.parkOrCloseSplitViewForTabSwitch?.({ instant: true });
                    }
                    const nextGroupId = `sg-${nowTs}-${Math.floor(Math.random() * 1000)}`;
                    const nextParked = pruneTabsFromParkedGroups(useUIStore.getState().parkedSplitGroups, Array.from(activeSet));
                    useUIStore.setState({
                        isSplitView: true,
                        activeSplitGroupId: nextGroupId,
                        activeSplitGroupName: '',
                        splitOrientation: nextOrientation,
                        splitRightTabId: secondaryResolved[0] || null,
                        splitPaneTabIds: secondaryResolved,
                        focusedPane: secondaryResolved[0] ? 'left' : 'right',
                        parkedSplitGroups: nextParked
                    });
                    const firstTab = firstNonBlankIdx >= 0 ? activeTabsList.find(t => t.id === primaryId) : null;
                    if (firstTab) {
                        useUIStore.getState().setCurrentUrl(firstTab.url || '');
                    }
                    clearTabSelection();
                };

                return (
                    <div
                        className={`mx-2 mb-2 p-2 flex flex-col gap-1.5 border shadow-lg animate-pop-in ${
                            frameCurvature === 'square' ? 'rounded-none' : 'rounded-xl'
                        } ${getLiquidGlassSurfaceClasses(isBright)}`}
                        style={getLiquidGlassInlineStyle(isBright)}
                    >
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                                {selectedTabIds.length} selected
                            </span>
                            <button
                                onClick={clearTabSelection}
                                className="p-1 rounded-md text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)] hover:bg-white/10 transition-colors cursor-pointer"
                                title={t('common.clearSelection', null, 'Clear selection (Esc)')}
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                            <button
                                onClick={handleBulkCopyUrls}
                                className="flex-1 min-w-[60px] flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] hover:bg-accent/20 hover:text-accent border border-white/[0.08] transition-all cursor-pointer"
                                title={t('chrome.copyUrls', null, 'Copy URLs')}
                            >
                                <Copy size={11} />
                                <span className="hidden md:inline">Copy</span>
                            </button>
                            {selectedTabIds.length >= 2 && selectedTabIds.length <= 4 && (
                                <button
                                    onClick={handleBulkSplitView}
                                    className="flex-1 min-w-[60px] flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] hover:bg-accent/20 hover:text-accent border border-white/[0.08] transition-all cursor-pointer"
                                    title={selectedTabIds.length >= 3 ? t('chrome.splitQuadSelected', null, 'Open in 2×2 Quad Split') : t('chrome.splitViewSelected', null, 'Open in Split View')}
                                >
                                    <Columns size={11} />
                                    <span className="hidden md:inline">{selectedTabIds.length >= 3 ? 'Quad' : 'Split'}</span>
                                </button>
                            )}
                            <button
                                onClick={() => bulkSuspendTabs(selectedTabIds)}
                                className="flex-1 min-w-[60px] flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] hover:bg-accent/20 hover:text-accent border border-white/[0.08] transition-all cursor-pointer"
                                title={t('chrome.suspendSelected', null, 'Suspend selected tabs')}
                            >
                                <Moon size={11} />
                                <span className="hidden md:inline">Sleep</span>
                            </button>
                            <button
                                onClick={() => bulkToggleMuteTabs(selectedTabIds)}
                                className="flex-1 min-w-[60px] flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] hover:bg-accent/20 hover:text-accent border border-white/[0.08] transition-all cursor-pointer"
                                title={allSelectedMuted ? t('chrome.unmuteSelected', null, 'Unmute selected tabs') : t('chrome.muteSelected', null, 'Mute selected tabs')}
                            >
                                {allSelectedMuted ? <Volume2 size={11} /> : <VolumeX size={11} />}
                                <span className="hidden md:inline">{allSelectedMuted ? 'Unmute' : 'Mute'}</span>
                            </button>
                            <button
                                onClick={() => bulkCloseTabs(selectedTabIds)}
                                className="flex-1 min-w-[60px] flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/25 transition-all cursor-pointer"
                                title={t('chrome.closeSelected', null, 'Close selected tabs')}
                            >
                                <Trash2 size={11} />
                                <span className="hidden md:inline">Close</span>
                            </button>
                        </div>
                    </div>
                );
            })()}

            <div ref={footerBarRef} className="relative p-3 border-t border-[color:var(--sidebar-border)] bg-transparent flex gap-1.5 items-center">
                {/* Anchored Rename Workspace Popover (Portaled to body for true backdrop blur) */}
                {(activeRenamingSpace || (renamingSpaceId && customSpaces.find(s => s.id === renamingSpaceId))) && typeof document !== 'undefined' && (() => {
                    const targetSpace = activeRenamingSpace || customSpaces.find(s => s.id === renamingSpaceId);
                    if (!targetSpace) return null;
                    const SpaceIcon = (targetSpace.icon && SPACE_ICONS[targetSpace.icon]) ? SPACE_ICONS[targetSpace.icon] : Layers;
                    const anchorRect = footerBarRef.current?.getBoundingClientRect();
                    const popW = anchorRect && anchorRect.width > 40 ? Math.max(200, anchorRect.width - 20) : 236;
                    const popLeft = anchorRect
                        ? Math.max(12, Math.min(anchorRect.left + 10, window.innerWidth - popW - 12))
                        : 12;
                    const popBottom = anchorRect
                        ? Math.max(12, Math.min(window.innerHeight - anchorRect.top + 8, window.innerHeight - 170))
                        : 68;

                    return createPortal(
                        <>
                            {/* Dismiss Backdrop (transparent like global context menu) */}
                            <div 
                                className={`fixed inset-0 z-[99990] bg-transparent cursor-default select-none transition-opacity ${
                                    isRenamingClosing ? 'pointer-events-none' : ''
                                }`}
                                onClick={closeRenamePopover}
                            />

                            {/* Anchored Glass Popover directly above space pill */}
                            <div 
                                className={`fixed z-[99995] p-3 rounded-2xl select-none outline-none ${
                                    isRenamingClosing ? 'animate-pop-out' : 'animate-pop-in'
                                } ${getLiquidGlassSurfaceClasses(isBright)}`}
                                style={{
                                    bottom: `${popBottom}px`,
                                    left: `${popLeft}px`,
                                    width: `${popW}px`,
                                    ...getLiquidGlassInlineStyle(isBright)
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
                                                isBright ? 'bg-black/[0.05] text-zinc-800' : 'bg-white/10 text-accent'
                                            }`}>
                                                <SpaceIcon size={13} />
                                            </div>
                                            <span className={`text-xs font-bold truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('chrome.renameWorkspace', null, 'Rename Workspace')}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeRenamePopover}
                                            className={`p-1 rounded-md transition-colors cursor-pointer active:scale-90 ${
                                                isBright ? 'hover:bg-black/[0.06] text-zinc-600 hover:text-zinc-950' : 'hover:bg-white/10 text-white/55 hover:text-white'
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
                                            placeholder={t('chrome.workspaceNamePlaceholder', null, 'Workspace name...')}
                                            className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium transition outline-none ${
                                                isBright 
                                                    ? 'bg-black/[0.04] border-black/12 text-zinc-900 placeholder-zinc-400 focus:border-accent focus:bg-white' 
                                                    : 'bg-white/[0.06] border-white/[0.10] text-white placeholder-white/35 focus:border-accent/80 focus:bg-white/[0.09]'
                                            }`}
                                        />
                                        <span className={`absolute right-2 top-2 text-[9px] font-mono select-none ${
                                            isBright ? 'text-zinc-500' : 'text-white/40'
                                        }`}>
                                            {renameValue.length}/30
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[10px] select-none ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>{t('chrome.enterToSave', null, '↵ to save')}</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={closeRenamePopover}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                                                    isBright ? 'hover:bg-black/[0.06] text-zinc-700 hover:text-zinc-950' : 'hover:bg-white/10 text-white/75 hover:text-white'
                                                }`}
                                            >
                                                {t('common.cancel', null, 'Cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3 py-1 rounded-lg text-xs font-bold bg-accent text-zinc-950 hover:brightness-110 active:scale-95 transition cursor-pointer shadow-sm"
                                            >
                                                {t('common.save', null, 'Save')}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </>,
                        document.body
                    );
                })()}
                <div 
                    id="tour-spaces-container"
                    onDragOver={(e) => {
                        if (draggedSidebarSpaceIdx !== null) {
                            e.preventDefault();
                            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                        }
                    }}
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
                                ? getSpaceDisplayName(customSpaces[0]).length <= 18
                                : customSpaces.length === 2 
                                    ? customSpaces.every(s => getSpaceDisplayName(s).length <= 10)
                                    : false;

                        return customSpaces.map((sp, spIdx) => {
                            const isActive = activeSpace === sp.id && !isIncognito && !isTor;
                            const isSpaceDragOver = dragOverSidebarSpaceIdx === spIdx && draggedSidebarSpaceIdx !== null && draggedSidebarSpaceIdx !== spIdx;

                            return (
                                <div 
                                    key={sp.id}
                                    role="button"
                                    tabIndex={0}
                                    draggable={customSpaces.length > 1}
                                    onDragStart={(e) => {
                                        e.stopPropagation();
                                        setDraggedSidebarSpaceIdx(spIdx);
                                        if (e.dataTransfer) {
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.dataTransfer.setData('text/plain', String(spIdx));
                                        }
                                    }}
                                    onDragOver={(e) => {
                                        if (draggedSidebarSpaceIdx === null) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                                        if (dragOverSidebarSpaceIdx !== spIdx) {
                                            setDragOverSidebarSpaceIdx(spIdx);
                                        }
                                    }}
                                    onDragLeave={(e) => {
                                        if (e.currentTarget.contains(e.relatedTarget)) return;
                                        if (dragOverSidebarSpaceIdx === spIdx) {
                                            setDragOverSidebarSpaceIdx(null);
                                        }
                                    }}
                                    onDrop={(e) => {
                                        if (draggedSidebarSpaceIdx === null) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (draggedSidebarSpaceIdx !== spIdx && reorderSpaces) {
                                            const next = [...customSpaces];
                                            const [moved] = next.splice(draggedSidebarSpaceIdx, 1);
                                            next.splice(spIdx, 0, moved);
                                            reorderSpaces(next);
                                        }
                                        setDraggedSidebarSpaceIdx(null);
                                        setDragOverSidebarSpaceIdx(null);
                                    }}
                                    onDragEnd={() => {
                                        setDraggedSidebarSpaceIdx(null);
                                        setDragOverSidebarSpaceIdx(null);
                                    }}
                                    onClick={() => setActiveSpace(sp.id)} 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setActiveSpace(sp.id);
                                        }
                                    }}
                                    onMouseEnter={() => setHoveredSpace(sp.id)}
                                    onContextMenu={(e) => handleSpaceContextMenu(e, sp)}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setRenamingSpaceId(sp.id);
                                    }}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 p-1.5 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95 cursor-pointer outline-none min-w-0 ${
                                        draggedSidebarSpaceIdx === spIdx ? 'opacity-35 scale-[0.98]' : ''
                                    } ${
                                        isSpaceDragOver ? 'ring-2 ring-accent bg-accent/20' : ''
                                    } ${
                                        isActive 
                                            ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold') 
                                            : 'text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)]'
                                    }`}
                                    title={t('chrome.workspaceBtnTooltip', { name: getSpaceDisplayName(sp) }, `${getSpaceDisplayName(sp)} (Drag to reorder • Right-click for options • Double-click to rename)`)}
                                >
                                    {getSpaceIcon(sp.icon, { size: showSpaceLabels ? 14 : 15, className: 'shrink-0 pointer-events-none' })}
                                    {showSpaceLabels && (
                                        <span className="hidden md:inline truncate select-none pointer-events-none">{getSpaceDisplayName(sp)}</span>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Animated Morphing Ghost <-> Onion Button */}
                <button
                    onClick={() => {
                        const lastNormal = useTabStore.getState().lastNormalSpace;
                        const returnSpace = (lastNormal && customSpaces.some(s => s.id === lastNormal))
                            ? lastNormal
                            : (customSpaces[0]?.id || 'personal');
                        if (isTorEnabled) {
                            setActiveSpace(isTor ? returnSpace : 'tor');
                            showToast(!isTor
                                ? t('chrome.toastTorActivated', null, 'Tor Space: Activated')
                                : t('chrome.toastTorDeactivated', null, 'Tor Space: Deactivated'));
                        } else {
                            setActiveSpace(isIncognito ? returnSpace : 'ghost');
                            showToast(!isIncognito
                                ? t('chrome.toastGhostActivated', null, 'Ghost Mode: Activated')
                                : t('chrome.toastGhostDeactivated', null, 'Ghost Mode: Deactivated'));
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const currentSpace = useTabStore.getState().activeSpace;
                        const inPrivateSpace = currentSpace === 'ghost' || currentSpace === 'tor';
                        useTorStore.getState().toggleTorEnabled(undefined, {
                            switchSpace: inPrivateSpace,
                            targetSpace: 'tor',
                            fallbackSpace: 'ghost'
                        });
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
                        ? (isTor ? t('chrome.torSpaceActiveTooltip', null, 'Tor Space Active (Click to switch to Personal • Right-click to switch to Ghost)') : t('chrome.enterTorSpaceTooltip', null, 'Enter Tor Space • Right-click to switch to Ghost'))
                        : (isIncognito ? t('chrome.ghostModeActiveTooltip', null, 'Ghost Mode Active (Click to switch to Personal • Right-click to enable Tor)') : t('chrome.ghostModeTooltip', null, 'Ghost Mode (CMD+Shift+N) • Right-click to enable Tor'))
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
        {draggedItem && (
            <div
                ref={dragGhostRef}
                className={`fixed left-0 top-0 pointer-events-none z-[999999] flex items-center justify-between px-3 py-2.5 border select-none shadow-2xl backdrop-blur-2xl transition-none will-change-transform ${
                    isBright 
                        ? 'bg-white/95 border-black/15 text-zinc-950 shadow-[0_12px_28px_rgba(0,0,0,0.18)]' 
                        : 'bg-[#18191f]/95 border-accent/40 text-accent shadow-[0_16px_36px_rgba(0,0,0,0.8),0_0_15px_var(--accent-20)]'
                }`}
                style={{
                    transform: initialDragPosRef.current.x > 0
                        ? `translate3d(${initialDragPosRef.current.x + 12}px, ${initialDragPosRef.current.y - 18}px, 0)`
                        : 'translate3d(-9999px, -9999px, 0)',
                    opacity: initialDragPosRef.current.x > 0 ? 1 : 0,
                    width: uiScale === 'compact' ? '200px' : '220px',
                    borderRadius: uiScale === 'compact' ? '8px' : '12px'
                }}
            >
                <div className="flex items-center gap-2.5 truncate">
                    {getSafeFaviconUrl(draggedItem.tab.url, settings, 64) ? (
                        <img 
                            src={getSafeFaviconUrl(draggedItem.tab.url, settings, 64)} 
                            className="w-4 h-4 rounded-sm shrink-0" 
                            onError={(e) => e.target.style.display = 'none'} 
                        />
                    ) : (
                        <Globe size={14} className={`shrink-0 ${isBright ? 'text-zinc-800' : 'text-accent'}`} />
                    )}
                    <span className="text-xs font-semibold truncate">
                        {draggedItem.tab.title || t('nav.newTab', null, 'New Tab')}
                    </span>
                </div>
            </div>
        )}
        <PinnedStackPopup />
        <GitHubGlancePopover />
        </>
    );
}
