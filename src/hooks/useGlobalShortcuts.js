import { useEffect } from 'react';
import useUIStore from '../store/useUIStore';
import useTabStore from '../store/useTabStore';

export const handleEscapeDismissal = () => {
    const uiStore = useUIStore.getState();
    const tabStore = useTabStore.getState();

    // 1. Passkey Verification Prompt
    if (uiStore.passkeyPrompt) {
        if (window.electronAPI && window.electronAPI.respondPasskeyVerification) {
            window.electronAPI.respondPasskeyVerification(uiStore.passkeyPrompt.requestId, false).catch(() => {});
        }
        uiStore.setPasskeyPrompt(null);
        return true;
    }

    // 2. Context Menus (tab, folder, general)
    if (uiStore.contextMenu || uiStore.tabContextMenu || uiStore.folderContextMenu) {
        uiStore.closeContextMenus();
        return true;
    }

    // 3. Active Popover (Vault, SiteInfo, DarkMode, Adblock, Media, Downloads, UserProfile)
    if (uiStore.activePopover) {
        uiStore.closePopover();
        return true;
    }

    // 4. Active Download Popup
    if (uiStore.activeDownloadPopup) {
        uiStore.setActiveDownloadPopup(null);
        return true;
    }

    // 5. Find in Page Bar
    if (uiStore.isFindOpen) {
        uiStore.setIsFindOpen(false);
        return true;
    }

    // 6. Omnibox
    if (uiStore.isOmniboxOpen) {
        uiStore.closeOmnibox();
        // Clean up empty newly-opened tab if it was created when opening omnibox
        const activeSpace = tabStore.activeSpace;
        const list = activeSpace === 'personal' ? tabStore.privateTabs : (activeSpace === 'work' ? tabStore.workTabs : tabStore.ghostTabs);
        const activeTab = list.find(t => t.active);
        if (activeTab && (!activeTab.url || activeTab.url === '' || activeTab.url === 'about:blank') && list.length > 1) {
            tabStore.handleCloseTab(activeTab.id);
        }
        return true;
    }

    // 7. Tab Switcher Overlay (Ctrl+Tab switcher)
    if (uiStore.showSwitcher) {
        if (uiStore.cancelSwitcher) uiStore.cancelSwitcher();
        else uiStore.setShowSwitcher(false);
        return true;
    }

    // 8. Tab Map (Mission Control)
    if (uiStore.isTabMapOpen) {
        uiStore.closeTabMap();
        return true;
    }

    // 9. Active Modal (Settings, History, Auth, Cookies, AddPin, Onboarding, Tutorial)
    if (uiStore.activeModal) {
        uiStore.closeModal();
        return true;
    }

    // 10. Peek Preview Window
    if (uiStore.peekWindow) {
        uiStore.closePeek();
        return true;
    }

    // 11. Custom Picture-in-Picture Window
    if (uiStore.pipWindow) {
        uiStore.closePip();
        return true;
    }

    // 12. Right Panel (Tool Hub / AI Assistant / Downloads)
    if (uiStore.isRightPanelOpen) {
        uiStore.setIsRightPanelOpen(false);
        return true;
    }

    // 13. Hover Preview
    if (uiStore.hoverPreview) {
        uiStore.setHoverPreview(null);
        return true;
    }

    // 14. Fullscreen Mode
    if (uiStore.isFullscreen || uiStore.isWebviewFullscreen) {
        if (window.electronAPI && window.electronAPI.setFullscreen) {
            window.electronAPI.setFullscreen(false);
        }
        uiStore.setIsFullscreen(false);
        uiStore.setIsWebviewFullscreen(false);
        return true;
    }

    // 15. Focused Input / Textarea inside the browser UI
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
        document.activeElement.blur();
        return true;
    }

    return false;
};

export default function useGlobalShortcuts() {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                const handled = handleEscapeDismissal();
                if (handled) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                return;
            }

            // Do not trigger global shortcuts if the user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            const cmdOrCtrl = e.metaKey || e.ctrlKey;
            const uiStore = useUIStore.getState();
            const tabStore = useTabStore.getState();

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
                        if (!uiStore.showSwitcher) {
                            uiStore.openSwitcher();
                        } else {
                            uiStore.cycleSwitcher(e.shiftKey ? -1 : 1);
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
            if (e.key === 'Control' || e.key === 'Meta') {
                const uiStore = useUIStore.getState();
                if (uiStore.showSwitcher) {
                    uiStore.confirmSwitcher();
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
                    handleEscapeDismissal();
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
                            const ui = useUIStore.getState();
                            if (!ui.showSwitcher) {
                                ui.openSwitcher();
                            } else {
                                ui.cycleSwitcher(shift ? -1 : 1);
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

        if (window.electronAPI && window.electronAPI.onGlobalKeyUp) {
            window.electronAPI.onGlobalKeyUp((data) => {
                if (data.key === 'Control' || data.key === 'Meta') {
                    const ui = useUIStore.getState();
                    if (ui.showSwitcher) {
                        ui.confirmSwitcher();
                    }
                }
            });
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (window.__switcherTimer) clearTimeout(window.__switcherTimer);
        };
    }, []);
}
