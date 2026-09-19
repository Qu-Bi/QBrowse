import { useEffect } from 'react';
import useUIStore from '../store/useUIStore';
import useTabStore from '../store/useTabStore';
import useTorStore from '../store/useTorStore';

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

    // 5. Snipping & Screenshot Overlays
    if (uiStore.isSnippingMode) {
        uiStore.setIsSnippingMode(false);
        return true;
    }
    if (uiStore.isScreenshotBarOpen) {
        uiStore.setIsScreenshotBarOpen(false);
        return true;
    }

    // 6. Find in Page Bar
    if (uiStore.isFindOpen) {
        uiStore.setIsFindOpen(false);
        return true;
    }

    // 7. Reader Mode Overlay
    if (uiStore.isReaderOpen) {
        uiStore.closeReaderMode();
        return true;
    }

    // 7. Omnibox
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

export const executeShortcut = (key, shift = false, alt = false) => {
    const uiStore = useUIStore.getState();
    const tabStore = useTabStore.getState();
    const cleanKey = (key || '').toLowerCase();

    switch (cleanKey) {
        // Space Switching
        case '1':
            tabStore.setActiveSpace('personal');
            uiStore.showToast('Space: Personal');
            break;
        case '2':
            tabStore.setActiveSpace('work');
            uiStore.showToast('Space: Work');
            break;
        case '3': {
            const isTor = useTorStore.getState().isTorEnabled;
            tabStore.setActiveSpace(isTor ? 'tor' : 'ghost');
            uiStore.showToast(isTor ? 'Space: Tor Onion' : 'Space: Ghost Mode');
            break;
        }

        // New Window (Cmd+N) & New Private Window (Cmd+Shift+N)
        case 'n':
            if (shift) {
                // New Private Window / Tor Window
                const isTor = useTorStore.getState().isTorEnabled;
                const targetSpace = isTor ? 'tor' : 'ghost';
                if (window.electronAPI && window.electronAPI.openNewWindow) {
                    window.electronAPI.openNewWindow({ space: targetSpace });
                    uiStore.showToast(isTor ? 'Opening new Tor window...' : 'Opening new private window...');
                } else {
                    tabStore.setActiveSpace(targetSpace);
                    uiStore.showToast(isTor ? 'Tor Space: Activated' : 'Ghost Mode: Activated');
                }
            } else {
                // New Window
                if (window.electronAPI && window.electronAPI.openNewWindow) {
                    window.electronAPI.openNewWindow({ space: 'personal' });
                    uiStore.showToast('Opening new window...');
                } else {
                    tabStore.handleNewTab();
                }
            }
            break;

        // Print Page (Cmd+P) & New Private Window (Cmd+Shift+P)
        case 'p':
            if (shift) {
                const isTor = useTorStore.getState().isTorEnabled;
                const targetSpace = isTor ? 'tor' : 'ghost';
                if (window.electronAPI && window.electronAPI.openNewWindow) {
                    window.electronAPI.openNewWindow({ space: targetSpace });
                    uiStore.showToast(isTor ? 'Opening new Tor window...' : 'Opening new private window...');
                } else {
                    tabStore.setActiveSpace(targetSpace);
                    uiStore.showToast(isTor ? 'Tor Space: Activated' : 'Ghost Mode: Activated');
                }
            } else {
                uiStore.printActivePage();
            }
            break;

        // Tabs: New Tab (Cmd+T) & Reopen Closed Tab (Cmd+Shift+T)
        case 't':
            if (shift) {
                tabStore.restoreRecentlyClosedTab();
            } else {
                tabStore.handleNewTab();
            }
            break;

        // Close Tab (Cmd+W) & Close Window (Cmd+Shift+W)
        case 'w':
            if (shift) {
                if (window.electronAPI && window.electronAPI.closeCurrentWindow) {
                    window.electronAPI.closeCurrentWindow();
                } else {
                    window.close();
                }
            } else {
                if (uiStore.isReaderOpen || uiStore.isReaderClosing) {
                    uiStore.closeReaderMode();
                }
                const activeTab = tabStore.getActiveTab();
                if (activeTab) {
                    tabStore.handleCloseTab(activeTab.id);
                }
            }
            break;

        // Reload (Cmd+R) & Hard Reload (Cmd+Shift+R) & Reader Mode (Cmd+Alt+R / Ctrl+Alt+R)
        case 'r':
            if (alt) {
                uiStore.toggleReaderMode();
            } else if (shift) {
                if (window.electronAPI && window.electronAPI.clearAllData) {
                    window.electronAPI.clearAllData({ cache: true, storage: false, cookies: false }).catch(() => {});
                }
                uiStore.refresh();
                uiStore.showToast('Hard Reload: Cache purged & refreshed');
            } else {
                uiStore.refresh();
            }
            break;

        // Omnibox & Address Bar (Cmd+K and Cmd+L)
        case 'k':
        case 'l':
            if (uiStore.isOmniboxOpen) {
                uiStore.closeOmnibox();
            } else {
                const activeTab = tabStore.getActiveTab();
                const activeUrl = activeTab && activeTab.url !== 'about:blank' ? activeTab.url : '';
                uiStore.openOmnibox(activeUrl);
            }
            break;

        // History Archive (Cmd+H and Cmd+Y)
        case 'h':
        case 'y':
            if (uiStore.activeModal === 'history') {
                uiStore.closeModal();
            } else {
                uiStore.openModal('history');
            }
            break;

        // Bookmarks / Pin Tab (Cmd+D without shift, Cmd+Shift+D is Split)
        case 'd':
            if (shift) {
                uiStore.toggleSplitView();
            } else {
                if (uiStore.activeModal === 'addPin') {
                    uiStore.closeModal();
                } else {
                    uiStore.openModal('addPin');
                }
            }
            break;

        // Split View (Cmd+\ or Cmd+|)
        case '\\':
        case '|':
            uiStore.toggleSplitView();
            break;

        // Tab Map / Mission Control (Cmd+E)
        case 'e':
            if (uiStore.isTabMapOpen) {
                uiStore.closeTabMap();
            } else {
                uiStore.openTabMap();
            }
            break;

        // Sidebar Toggle (Cmd+B)
        case 'b':
            uiStore.setIsSidebarHidden(!uiStore.isSidebarHidden);
            uiStore.showToast(uiStore.isSidebarHidden ? 'Sidebar: Hidden' : 'Sidebar: Visible');
            break;

        // Tool Hub / Right Panel (Cmd+J)
        case 'j':
            uiStore.setIsRightPanelOpen(!uiStore.isRightPanelOpen);
            break;

        // Find in Page (Cmd+F)
        case 'f':
            uiStore.setIsFindOpen(true);
            break;

        // Screenshot & Snipping Bar (Cmd+Shift+S)
        case 's':
            if (shift) {
                uiStore.setIsScreenshotBarOpen(!uiStore.isScreenshotBarOpen);
            }
            break;


        // Find Next / Prev Match (F3 / Shift+F3)
        case 'f3':
            uiStore.findNextMatch(!shift);
            break;

        // Tab Switcher (Cmd+Tab)
        case 'tab':
            if (!uiStore.showSwitcher) {
                uiStore.openSwitcher();
            } else {
                uiStore.cycleSwitcher(shift ? -1 : 1);
            }
            break;

        // History Navigation (Cmd+[ and Cmd+], Alt+Left and Alt+Right)
        case '[':
        case 'alt+arrowleft': {
            const activeTab = tabStore.getActiveTab();
            if (activeTab) {
                tabStore.navigateTabBack(activeTab.id);
            }
            break;
        }
        case ']':
        case 'alt+arrowright': {
            const activeTab = tabStore.getActiveTab();
            if (activeTab) {
                tabStore.navigateTabForward(activeTab.id);
            }
            break;
        }

        // Zoom Controls
        case '+':
        case '=':
            uiStore.setZoomLevel(uiStore.zoomLevel + 10);
            break;
        case '-':
        case '_':
            uiStore.setZoomLevel(uiStore.zoomLevel - 10);
            break;
        case '0':
            uiStore.setZoomLevel(100);
            break;

        // Resource & Task Manager (Shift+Escape)
        case 'shift+escape':
        case 'task-manager':
            if (uiStore.activeModal === 'tasks') {
                uiStore.closeModal();
            } else {
                uiStore.openModal('tasks');
            }
            break;

        // Fullscreen (F11)
        case 'f11': {
            const newFullscreenState = !uiStore.isFullscreen;
            if (window.electronAPI && window.electronAPI.setFullscreen) {
                window.electronAPI.setFullscreen(newFullscreenState);
            }
            uiStore.setIsFullscreen(newFullscreenState);
            break;
        }

        // DevTools (F12)
        case 'f12':
            if (window.electronAPI && window.electronAPI.openDevTools) {
                window.electronAPI.openDevTools();
            }
            break;

        default:
            break;
    }
};

export default function useGlobalShortcuts() {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (e.shiftKey) {
                    // Shift+Escape -> Task Manager
                    e.preventDefault();
                    e.stopPropagation();
                    executeShortcut('shift+escape', true);
                    return;
                }
                const handled = handleEscapeDismissal();
                if (handled) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                return;
            }

            // Alt+Left / Alt+Right for history navigation
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                executeShortcut(e.key === 'ArrowLeft' ? 'alt+arrowleft' : 'alt+arrowright', false);
                return;
            }

            // Do not trigger global shortcuts if the user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            const cmdOrCtrl = e.metaKey || e.ctrlKey;

            if (e.key === 'F11' || e.key === 'F12' || e.key === 'F3') {
                e.preventDefault();
                executeShortcut(e.key.toLowerCase(), e.shiftKey);
                return;
            }

            if (cmdOrCtrl) {
                e.preventDefault();
                executeShortcut(e.key.toLowerCase(), e.shiftKey, e.altKey);
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

        const handleWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 5 : -5;
                const ui = useUIStore.getState();
                ui.setZoomLevel(ui.zoomLevel + delta);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('wheel', handleWheel, { passive: false });

        // Listen for shortcuts captured natively by Electron (e.g. when webview has focus)
        if (window.electronAPI && window.electronAPI.onGlobalShortcut) {
            window.electronAPI.onGlobalShortcut((data) => {
                const shortcut = typeof data === 'string' ? data : data.shortcut;
                const shift = typeof data === 'string' ? false : data.shift;
                
                if (shortcut === 'escape') {
                    handleEscapeDismissal();
                    return;
                }

                if (shortcut === 'shift+escape') {
                    executeShortcut('shift+escape', true);
                    return;
                }

                if (shortcut.startsWith('alt+')) {
                    executeShortcut(shortcut, false);
                    return;
                }

                if (shortcut.startsWith('cmd+')) {
                    const key = shortcut.replace('cmd+', '');
                    executeShortcut(key, shift, !!data.alt);
                    return;
                }

                if (shortcut === 'f11' || shortcut === 'f12' || shortcut === 'f3') {
                    executeShortcut(shortcut, shift);
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
            window.removeEventListener('wheel', handleWheel);
            if (window.__switcherTimer) clearTimeout(window.__switcherTimer);
        };
    }, []);
}
