import { useEffect } from 'react';
import useUIStore from '../store/useUIStore';
import useTabStore from '../store/useTabStore';

export default function useGlobalShortcuts() {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Do not trigger global shortcuts if the user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                // Allow Escape to close inputs like Omnibox or Find, but let the component handle it locally if needed
                if (e.key === 'Escape') {
                    // Let UI handle it natively
                } else {
                    return;
                }
            }

            const cmdOrCtrl = e.metaKey || e.ctrlKey;
            const uiStore = useUIStore.getState();
            const tabStore = useTabStore.getState();

            if (e.key === 'Escape') {
                if (uiStore.activePopover || uiStore.contextMenu || uiStore.tabContextMenu) {
                    e.preventDefault();
                    uiStore.closePopover();
                    uiStore.closeContextMenus();
                    return;
                }
                if (uiStore.isFindOpen) {
                    e.preventDefault();
                    uiStore.setIsFindOpen(false);
                    return;
                }
                if (uiStore.isOmniboxOpen) {
                    e.preventDefault();
                    uiStore.closeOmnibox();
                    return;
                }
                if (uiStore.isTabMapOpen) {
                    e.preventDefault();
                    uiStore.closeTabMap();
                    return;
                }
                if (uiStore.activeModal) {
                    e.preventDefault();
                    uiStore.closeModal();
                    return;
                }
                if (uiStore.peekWindow) {
                    e.preventDefault();
                    uiStore.closePeek();
                    return;
                }
                if (uiStore.isRightPanelOpen) {
                    e.preventDefault();
                    uiStore.setIsRightPanelOpen(false);
                    return;
                }
            }

            if (e.key === 'F11') {
                e.preventDefault();
                const newFullscreenState = !uiStore.isFullscreen;
                if (window.electronAPI && window.electronAPI.setFullscreen) {
                    window.electronAPI.setFullscreen(newFullscreenState);
                }
                uiStore.setIsFullscreen(newFullscreenState);
                return;
            }

            if (e.key === 'F12') {
                e.preventDefault();
                if (window.electronAPI && window.electronAPI.openDevTools) {
                    window.electronAPI.openDevTools();
                }
                return;
            }

            if (cmdOrCtrl) {
                switch (e.key.toLowerCase()) {
                    case 'r':
                        e.preventDefault();
                        uiStore.refresh();
                        break;
                    case '1':
                        e.preventDefault();
                        tabStore.setActiveSpace('personal');
                        uiStore.showToast('Space: Personal');
                        break;
                    case '2':
                        e.preventDefault();
                        tabStore.setActiveSpace('work');
                        uiStore.showToast('Space: Work');
                        break;
                    case '3':
                        e.preventDefault();
                        tabStore.setActiveSpace('ghost');
                        uiStore.showToast('Space: Ghost Mode');
                        break;
                    case 'n':
                        if (e.shiftKey) {
                            e.preventDefault();
                            const current = tabStore.activeSpace;
                            tabStore.setActiveSpace(current === 'ghost' ? 'personal' : 'ghost');
                            uiStore.showToast(current !== 'ghost' ? 'Ghost Mode: Activated' : 'Ghost Mode: Deactivated');
                        }
                        break;
                    case 'k':
                        e.preventDefault();
                        if (uiStore.isOmniboxOpen) {
                            uiStore.closeOmnibox();
                        } else {
                            uiStore.openOmnibox('');
                        }
                        break;
                    case 't':
                        e.preventDefault();
                        tabStore.handleNewTab();
                        break;
                    case 'w':
                        e.preventDefault();
                        {
                            const activeSpace = tabStore.activeSpace;
                            const list = activeSpace === 'personal' ? tabStore.privateTabs : (activeSpace === 'work' ? tabStore.workTabs : tabStore.ghostTabs);
                            const activeTab = list.find(t => t.active);
                            if (activeTab) {
                                tabStore.handleCloseTab(activeTab.id);
                            }
                        }
                        break;
                    case 'e':
                        e.preventDefault();
                        if (uiStore.isTabMapOpen) {
                            uiStore.closeTabMap();
                        } else {
                            uiStore.openTabMap();
                        }
                        break;
                    case 'b':
                        e.preventDefault();
                        uiStore.setIsSidebarHidden(!uiStore.isSidebarHidden);
                        uiStore.showToast(uiStore.isSidebarHidden ? 'Sidebar: Visible' : 'Sidebar: Hidden');
                        break;
                    case 'j': // Right panel (tool hub) / Downloads
                        e.preventDefault();
                        uiStore.setIsRightPanelOpen(!uiStore.isRightPanelOpen);
                        break;
                    case 'f':
                        e.preventDefault();
                        uiStore.setIsFindOpen(!uiStore.isFindOpen);
                        break;
                    case 'tab':
                        e.preventDefault();
                        if (!window.__tabSwitcherTimer && !uiStore.showSwitcher) {
                            // Fast switch placeholder
                            // Wait a short bit before showing the heavy UI
                            window.__tabSwitcherTimer = setTimeout(() => {
                                uiStore.setShowSwitcher(true);
                            }, 200);
                        }
                        break;
                    case '+':
                    case '=':
                        e.preventDefault();
                        uiStore.setZoomLevel(Math.min(uiStore.zoomLevel + 10, 200));
                        break;
                    case '-':
                        e.preventDefault();
                        uiStore.setZoomLevel(Math.max(uiStore.zoomLevel - 10, 50));
                        break;
                    case '0':
                        e.preventDefault();
                        uiStore.setZoomLevel(100);
                        break;
                    default:
                        break;
                }
            }
        };

        const handleKeyUp = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrlKey = isMac ? 'Meta' : 'Control';

            if (e.key === cmdOrCtrlKey) {
                let wasFastClick = false;
                if (window.__tabSwitcherTimer) {
                    clearTimeout(window.__tabSwitcherTimer);
                    window.__tabSwitcherTimer = null;
                    wasFastClick = true;
                }
                const uiStore = useUIStore.getState();
                if (uiStore.showSwitcher) {
                    uiStore.setShowSwitcher(false);
                } else if (wasFastClick) {
                    // FAST CLICK LOGIC: switch to previous tab
                    const tabStore = useTabStore.getState();
                    const allTabs = [
                        ...tabStore.privateTabs.map(t => ({...t, spaceType: 'personal'})),
                        ...tabStore.workTabs.map(t => ({...t, spaceType: 'work'})),
                        ...tabStore.ghostTabs.map(t => ({...t, spaceType: 'ghost'}))
                    ];
                    
                    const currentActive = allTabs.find(t => t.active && t.spaceType === tabStore.activeSpace);
                    const others = allTabs.filter(t => t.id !== currentActive?.id);
                    others.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
                    
                    const previous = others[0];
                    if (previous) {
                        tabStore.handleSwitchToTab(previous.id, previous.spaceType);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Listen for shortcuts captured natively by Electron (e.g. when webview has focus)
        if (window.electronAPI && window.electronAPI.onGlobalShortcut) {
            window.electronAPI.onGlobalShortcut((data) => {
                const shortcut = typeof data === 'string' ? data : data.shortcut;
                const shift = typeof data === 'string' ? false : data.shift;
                
                const tabStore = useTabStore.getState();
                const uiStore = useUIStore.getState();
                
                if (shortcut === 'f11') {
                    const isFull = !uiStore.isFullscreen;
                    if (window.electronAPI && window.electronAPI.setFullscreen) {
                        window.electronAPI.setFullscreen(isFull);
                    }
                    uiStore.setIsFullscreen(isFull);
                    return;
                }
                
                if (shortcut === 'f12') {
                    if (window.electronAPI && window.electronAPI.openDevTools) {
                        window.electronAPI.openDevTools();
                    }
                    return;
                }
                
                if (shortcut === 'escape') {
                    if (uiStore.activePopover) uiStore.togglePopover(null);
                    if (uiStore.isFindOpen) uiStore.setIsFindOpen(false);
                    return;
                }
                
                if (shortcut.startsWith('cmd+')) {
                    const key = shortcut.replace('cmd+', '');
                    // Create a synthetic event object that matches what the switch case expects
                    const syntheticEvent = {
                        key: key,
                        preventDefault: () => {},
                        shiftKey: false
                    };
                    
                    // We can reuse the same switch case logic! Let's just duplicate the switch here for safety
                    switch (key.toLowerCase()) {
                        case 'r':
                            uiStore.refresh();
                            break;
                        case '1':
                            tabStore.setActiveSpace('personal');
                            uiStore.showToast('Space: Personal');
                            break;
                        case '2':
                            tabStore.setActiveSpace('work');
                            uiStore.showToast('Space: Work');
                            break;
                        case '3':
                            tabStore.setActiveSpace('ghost');
                            uiStore.showToast('Space: Ghost Mode');
                            break;
                        case 'k':
                            if (uiStore.isOmniboxOpen) {
                                uiStore.closeOmnibox();
                            } else {
                                uiStore.openOmnibox('');
                            }
                            break;
                        case 't':
                            tabStore.handleNewTab();
                            break;
                        case 'w':
                            {
                                const activeSpace = tabStore.activeSpace;
                                const list = activeSpace === 'personal' ? tabStore.privateTabs : (activeSpace === 'work' ? tabStore.workTabs : tabStore.ghostTabs);
                                const activeTab = list.find(t => t.active);
                                if (activeTab) {
                                    tabStore.handleCloseTab(activeTab.id);
                                }
                            }
                            break;
                        case 'e':
                            if (uiStore.isTabMapOpen) {
                                uiStore.closeTabMap();
                            } else {
                                uiStore.openTabMap();
                            }
                            break;
                        case 'b':
                            uiStore.setIsSidebarHidden(!uiStore.isSidebarHidden);
                            uiStore.showToast(uiStore.isSidebarHidden ? 'Sidebar: Visible' : 'Sidebar: Hidden');
                            break;
                        case 'j':
                            uiStore.setIsRightPanelOpen(!uiStore.isRightPanelOpen);
                            break;
                        case 'f':
                            uiStore.setIsFindOpen(!uiStore.isFindOpen);
                            break;
                        case 'tab':
                            if (!window.__tabSwitcherTimer && !uiStore.showSwitcher) {
                                window.__tabSwitcherTimer = setTimeout(() => {
                                    uiStore.setShowSwitcher(true);
                                }, 200);
                            }
                            break;
                        case '+':
                        case '=':
                            uiStore.setZoomLevel(Math.min(uiStore.zoomLevel + 10, 200));
                            break;
                        case '-':
                            uiStore.setZoomLevel(Math.max(uiStore.zoomLevel - 10, 50));
                            break;
                        case '0':
                            uiStore.setZoomLevel(100);
                            break;
                        case 'f11':
                            const newFullscreenState = !uiStore.isFullscreen;
                            if (window.electronAPI && window.electronAPI.setFullscreen) {
                                window.electronAPI.setFullscreen(newFullscreenState);
                            }
                            uiStore.setIsFullscreen(newFullscreenState);
                            break;
                        case 'f12':
                            if (window.electronAPI && window.electronAPI.openDevTools) {
                                window.electronAPI.openDevTools();
                            }
                            break;
                    }
                }
            });
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (window.__tabSwitcherTimer) clearTimeout(window.__tabSwitcherTimer);
        };
    }, []);
}
