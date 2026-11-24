import { useEffect } from 'react';
import useUIStore from '../store/useUIStore';
import useTabStore from '../store/useTabStore';
import useTorStore from '../store/useTorStore';
import { isTabForPin, getFocusedSplitTab } from '../utils/pinnedAppHelpers';
import { t } from '../i18n/index';
import { resolveActionForEvent } from '../utils/shortcutRegistry';

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

    // 2b. Active Pinned Stack Picker
    if (uiStore.activePinnedStack) {
        uiStore.closePinnedStack();
        return true;
    }

    // 2c. Multi-tab selection
    if (tabStore.selectedTabIds && tabStore.selectedTabIds.length > 0) {
        tabStore.clearTabSelection();
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

    // 5. Snipping, Screenshot & Element Eraser Overlays
    if (uiStore.isElementEraserActive) {
        uiStore.toggleElementEraser(false);
        return true;
    }
    if (uiStore.isSnippingMode) {
        uiStore.setIsSnippingMode(false);
        return true;
    }
    if (uiStore.isScreenshotBarOpen) {
        uiStore.setIsScreenshotBarOpen(false);
        return true;
    }

    // 6. Read Aloud Floating Player
    if (uiStore.isReadAloudOpen) {
        uiStore.closeReadAloud();
        return true;
    }

    // 7. Find in Page Bar
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

    if (uiStore.isTopBarOmniboxActive) {
        uiStore.setIsTopBarOmniboxActive(false);
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

    // 14. HTML5 Video / Element Fullscreen Mode (Note: F11 window fullscreen is NOT exited via Escape)
    if (uiStore.isWebviewHtmlFullscreen || uiStore.htmlFullscreenTabId || uiStore.isWebviewFullscreen) {
        const activeTabId = uiStore.htmlFullscreenTabId;
        const wv = activeTabId ? document.querySelector(`webview#webview-${activeTabId}`) : document.querySelector('webview');
        if (wv) {
            try {
                wv.executeJavaScript('if (document.fullscreenElement) { document.exitFullscreen().catch(()=>{}); }');
            } catch (_) {}
        }
        uiStore.setHtmlFullscreen(null, false);
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

let lastTabShortcutTime = 0;

function closeActiveTabOrWindow(uiStore, tabStore) {
    if (uiStore.isFindOpen) {
        uiStore.setIsFindOpen(false);
    }
    if (uiStore.isReaderOpen || uiStore.isReaderClosing) {
        uiStore.closeReaderMode(true);
    }
    uiStore.setIsReaderAvailable(false);

    const activeList = tabStore.getActiveList() || [];
    const pinnedTabs = tabStore.getPinnedTabsForSpace ? tabStore.getPinnedTabsForSpace(tabStore.activeSpace) : (tabStore.pinnedTabs || []);
    const allPersistedPins = tabStore.pinnedTabs || [];
    const shouldCloseWindowOnEmpty = uiStore.settings?.closeWindowOnLastTab !== false;

    const focusedTab = getFocusedSplitTab({
        spaceTabs: activeList,
        isSplitView: uiStore.isSplitView,
        splitOrientation: uiStore.splitOrientation,
        splitPaneTabIds: uiStore.splitPaneTabIds,
        splitRightTabId: uiStore.splitRightTabId,
        focusedPane: uiStore.focusedPane
    });

    const isTabWithContent = (tab) => {
        if (!tab || tab.isClosing) return false;
        const url = typeof tab.url === 'string' ? tab.url.trim() : '';
        if (!url || url === 'about:blank' || url.startsWith('about:') || url.startsWith('qbrowse://newtab')) {
            return false;
        }
        return true;
    };

    const isAnyPinnedTabOpen = (tabs, pins) => {
        if (!Array.isArray(pins) || pins.length === 0 || !Array.isArray(tabs) || tabs.length === 0) return false;
        return tabs.some(t => isTabWithContent(t) && pins.some(p => isTabForPin(t, p)));
    };

    const isAnyRegularTabOpen = (tabs, pins) => {
        if (!Array.isArray(tabs) || tabs.length === 0) return false;
        return tabs.some(t => isTabWithContent(t) && !(Array.isArray(pins) && pins.some(p => isTabForPin(t, p))));
    };

    const allTabs = [
        ...(tabStore.privateTabs || []),
        ...(tabStore.workTabs || []),
        ...(tabStore.ghostTabs || []),
        ...(tabStore.torTabs || [])
    ];

    const hasRegularTabOpen = isAnyRegularTabOpen(allTabs, allPersistedPins);
    const hasPinnedTabOpen = isAnyPinnedTabOpen(allTabs, allPersistedPins);
    const hasMultipleTabs = activeList.length > 1;

    if (!focusedTab?.pinnedId && shouldCloseWindowOnEmpty && !hasRegularTabOpen && !hasPinnedTabOpen && !hasMultipleTabs) {
        if (window.electronAPI && typeof window.electronAPI.close === 'function') {
            window.electronAPI.close();
        } else if (window.electronAPI && typeof window.electronAPI.closeCurrentWindow === 'function') {
            window.electronAPI.closeCurrentWindow();
        } else {
            window.close();
        }
        return;
    }

    if (focusedTab) {
        tabStore.handleCloseTab(focusedTab.id);
    }
}

function hasActiveTextSelection() {
    const activeEl = document.activeElement;
    const hasDomSelection = Boolean(window.getSelection()?.toString());
    const hasInputSelection = Boolean(
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        activeEl.selectionStart !== activeEl.selectionEnd
    );
    return hasDomSelection || hasInputSelection;
}

export const executeAction = (actionId) => {
    const uiStore = useUIStore.getState();
    const tabStore = useTabStore.getState();

    switch (actionId) {
        case 'newTab':
            tabStore.handleNewTab();
            break;
        case 'closeTab':
            closeActiveTabOrWindow(uiStore, tabStore);
            break;
        case 'reopenClosedTab':
            tabStore.restoreRecentlyClosedTab();
            break;
        case 'toggleMuteTab': {
            const activeTab = getFocusedSplitTab({
                spaceTabs: tabStore.getActiveList() || [],
                isSplitView: uiStore.isSplitView,
                splitOrientation: uiStore.splitOrientation,
                splitPaneTabIds: uiStore.splitPaneTabIds,
                splitRightTabId: uiStore.splitRightTabId,
                focusedPane: uiStore.focusedPane
            });
            if (activeTab && typeof tabStore.handleToggleMute === 'function') {
                tabStore.handleToggleMute(activeTab.id, tabStore.activeSpace);
            }
            break;
        }
        case 'openTabMap':
            if (uiStore.isTabMapOpen) uiStore.closeTabMap();
            else uiStore.openTabMap();
            break;
        case 'pinOrBookmarkTab':
            if (uiStore.activeModal === 'addPin') uiStore.closeModal();
            else uiStore.openModal('addPin');
            break;
        case 'openOmnibox':
            if (uiStore.isTopBarOmniboxActive) uiStore.setIsTopBarOmniboxActive(false);
            if (uiStore.isOmniboxOpen) {
                uiStore.closeOmnibox();
            } else {
                const activeTab = getFocusedSplitTab({
                    spaceTabs: tabStore.getActiveList() || [],
                    isSplitView: uiStore.isSplitView,
                    splitOrientation: uiStore.splitOrientation,
                    splitPaneTabIds: uiStore.splitPaneTabIds,
                    splitRightTabId: uiStore.splitRightTabId,
                    focusedPane: uiStore.focusedPane
                });
                const activeUrl = activeTab && activeTab.url !== 'about:blank' ? activeTab.url : '';
                uiStore.openOmnibox(activeUrl);
            }
            break;
        case 'focusAddressBar':
            if (uiStore.isTopBarOmniboxActive) {
                uiStore.setIsTopBarOmniboxActive(false);
            } else {
                if (uiStore.isFullscreen || uiStore.isFramelessMode) {
                    uiStore.setIsTopBarPeeking(true);
                }
                const activeTab = getFocusedSplitTab({
                    spaceTabs: tabStore.getActiveList() || [],
                    isSplitView: uiStore.isSplitView,
                    splitOrientation: uiStore.splitOrientation,
                    splitPaneTabIds: uiStore.splitPaneTabIds,
                    splitRightTabId: uiStore.splitRightTabId,
                    focusedPane: uiStore.focusedPane
                });
                const activeUrl = activeTab && activeTab.url !== 'about:blank' ? activeTab.url : '';
                if (!activeUrl) {
                    const homeInput = document.getElementById('homepage-omnibox-card')?.querySelector('input');
                    if (homeInput) {
                        homeInput.focus();
                        homeInput.select();
                    } else {
                        uiStore.setIsTopBarOmniboxActive(true);
                    }
                } else {
                    uiStore.setIsTopBarOmniboxActive(true);
                }
            }
            break;
        case 'copyCurrentUrl': {
            if (hasActiveTextSelection()) break;
            let targetTab = tabStore.getActiveTab();
            if (uiStore.isSplitView && uiStore.focusedPane === 'right' && uiStore.splitRightTabId) {
                const activeList = tabStore.getActiveList() || [];
                const rightTab = activeList.find(t => t.id === uiStore.splitRightTabId);
                if (rightTab) targetTab = rightTab;
            }
            const url = targetTab?.url && targetTab.url !== 'about:blank' ? targetTab.url : '';
            if (url) {
                const copyPromise = navigator.clipboard?.writeText
                    ? navigator.clipboard.writeText(url).catch(() => window.electronAPI?.writeClipboardText?.(url))
                    : Promise.resolve(window.electronAPI?.writeClipboardText?.(url));
                Promise.resolve(copyPromise).then(() => {
                    uiStore.showToast(t('stores.shortcuts.copiedUrl', 'Copied URL to clipboard'));
                }).catch(() => {});
            }
            break;
        }
        case 'reloadTab':
            uiStore.refresh();
            break;
        case 'hardReloadTab':
            if (window.electronAPI && window.electronAPI.clearAllData) {
                window.electronAPI.clearAllData({ cache: true, storage: false, cookies: false }).catch(() => {});
            }
            uiStore.refresh();
            uiStore.showToast(t('stores.shortcuts.hardReload', 'Hard Reload: Cache purged & refreshed'));
            break;
        case 'navigateBack': {
            const activeTab = tabStore.getActiveTab();
            if (activeTab) tabStore.navigateTabBack(activeTab.id);
            break;
        }
        case 'navigateForward': {
            const activeTab = tabStore.getActiveTab();
            if (activeTab) tabStore.navigateTabForward(activeTab.id);
            break;
        }
        case 'openHistory':
            if (uiStore.activeModal === 'history') uiStore.closeModal();
            else uiStore.openModal('history');
            break;
        case 'openFile':
            if (window.electronAPI && window.electronAPI.openFileDialog) {
                window.electronAPI.openFileDialog().then(fileUrls => {
                    if (fileUrls && fileUrls.length > 0) {
                        tabStore.openLocalFiles(fileUrls);
                    }
                }).catch(err => {
                    console.error('[Open File] Error:', err);
                });
            }
            break;
        case 'toggleSidebar':
            uiStore.setIsSidebarHidden(!uiStore.isSidebarHidden);
            uiStore.showToast(uiStore.isSidebarHidden ? t('stores.shortcuts.sidebarHidden', 'Sidebar: Hidden') : t('stores.shortcuts.sidebarVisible', 'Sidebar: Visible'));
            break;
        case 'toggleRightPanel':
            uiStore.setIsRightPanelOpen(!uiStore.isRightPanelOpen);
            break;
        case 'toggleFramelessMode': {
            const next = uiStore.toggleFramelessMode();
            uiStore.showToast(
                next
                    ? t('stores.shortcuts.framelessOn', 'Frameless Mode: On (Hover edges for bars)')
                    : t('stores.shortcuts.framelessOff', 'Frameless Mode: Off')
            );
            break;
        }
        case 'toggleSplitView':
            uiStore.toggleSplitView();
            break;
        case 'toggleSplitOrientation':
            uiStore.toggleSplitOrientation();
            break;
        case 'swapSplitPanes':
            uiStore.swapSplitPanes();
            break;
        case 'toggleReaderMode':
            uiStore.toggleReaderMode();
            break;
        case 'zoomIn':
            uiStore.zoomIn();
            break;
        case 'zoomOut':
            uiStore.zoomOut();
            break;
        case 'resetZoom': {
            const activeTab = tabStore.getActiveTab();
            const wv = activeTab ? document.querySelector(`webview#webview-${activeTab.id}`) : document.querySelector('webview');
            if (wv && typeof wv.send === 'function') {
                try { wv.send('webview-visual-zoom', 'reset'); } catch (_) {}
            }
            uiStore.resetZoom();
            break;
        }
        case 'toggleFullscreen': {
            const newFullscreenState = !uiStore.isFullscreen;
            if (window.electronAPI && window.electronAPI.setFullscreen) {
                window.electronAPI.setFullscreen(newFullscreenState);
            }
            uiStore.setIsFullscreen(newFullscreenState);
            break;
        }
        case 'findInPage':
            uiStore.setIsFindOpen(true);
            break;
        case 'findNext':
            uiStore.findNextMatch(true);
            break;
        case 'findPrev':
            uiStore.findNextMatch(false);
            break;
        case 'toggleElementEraser':
            uiStore.toggleElementEraser();
            break;
        case 'toggleScreenshotBar':
            uiStore.setIsScreenshotBarOpen(!uiStore.isScreenshotBarOpen);
            break;
        case 'toggleReadAloud':
            uiStore.toggleReadAloud();
            break;
        case 'printPage':
            uiStore.printActivePage();
            break;
        case 'openDevTools':
            if (window.electronAPI && window.electronAPI.openDevTools) {
                window.electronAPI.openDevTools();
            }
            break;
        case 'toggleCaretBrowsing': {
            const next = !uiStore.settings?.a11yCaretBrowsing;
            uiStore.toggleSetting('a11yCaretBrowsing');
            uiStore.showToast(next ? t('stores.shortcuts.caretEnabled', 'Caret Browsing enabled (Arrow keys navigate page text)') : t('stores.shortcuts.caretDisabled', 'Caret Browsing disabled'));
            break;
        }
        case 'newWindow':
            if (window.electronAPI && window.electronAPI.openNewWindow) {
                window.electronAPI.openNewWindow({ space: 'personal' });
                uiStore.showToast(t('stores.shortcuts.openingWindow', 'Opening new window...'));
            } else {
                tabStore.handleNewTab();
            }
            break;
        case 'newPrivateWindow': {
            const isTor = useTorStore.getState().isTorEnabled;
            const targetSpace = isTor ? 'tor' : 'ghost';
            if (window.electronAPI && window.electronAPI.openNewWindow) {
                window.electronAPI.openNewWindow({ space: targetSpace });
                uiStore.showToast(isTor ? t('stores.shortcuts.openingTorWindow', 'Opening new Tor window...') : t('stores.shortcuts.openingPrivateWindow', 'Opening new private window...'));
            } else {
                tabStore.setActiveSpace(targetSpace);
                uiStore.showToast(isTor ? t('stores.shortcuts.torActivated', 'Tor Space: Activated') : t('stores.shortcuts.ghostActivated', 'Ghost Mode: Activated'));
            }
            break;
        }
        case 'closeWindow':
            if (window.electronAPI && typeof window.electronAPI.closeCurrentWindow === 'function') {
                window.electronAPI.closeCurrentWindow();
            } else if (window.electronAPI && typeof window.electronAPI.close === 'function') {
                window.electronAPI.close();
            } else {
                window.close();
            }
            break;
        case 'openSettings':
            if (uiStore.activeModal === 'settings') uiStore.closeModal();
            else uiStore.openSettings();
            break;
        case 'openHelp':
            if (uiStore.activeModal === 'help') uiStore.closeModal();
            else uiStore.openHelpModal('help');
            break;
        case 'openTaskManager':
            if (uiStore.activeModal === 'tasks') uiStore.closeModal();
            else uiStore.openModal('tasks');
            break;
        default:
            break;
    }
};

export const executeShortcut = (key, shift = false, alt = false) => {
    const uiStore = useUIStore.getState();
    const tabStore = useTabStore.getState();
    const cleanKey = (key || '').toLowerCase();

    // Dynamic Space Switching relative from the left (1 to 9)
    if (/^[1-9]$/.test(cleanKey)) {
        const customSpaces = uiStore.settings?.customSpaces || [
            { id: 'personal', name: 'Personal' },
            { id: 'work', name: 'Work' }
        ];
        const num = parseInt(cleanKey, 10);
        const spaceIdx = num - 1;

        if (spaceIdx < customSpaces.length) {
            const target = customSpaces[spaceIdx];
            tabStore.setActiveSpace(target.id);
            const spaceDisplayName = (target.id === 'personal' && target.name === 'Personal')
                ? t('nav.personal', null, 'Personal')
                : (target.id === 'work' && target.name === 'Work')
                    ? t('nav.work', null, 'Work')
                    : target.name;
            uiStore.showToast(t('stores.shortcuts.spaceNamed', { name: spaceDisplayName }, `Space: ${spaceDisplayName}`));
            return;
        } else if (spaceIdx === customSpaces.length) {
            // Next position corresponds to Ghost / Tor morphing button
            const isTor = useTorStore.getState().isTorEnabled;
            tabStore.setActiveSpace(isTor ? 'tor' : 'ghost');
            uiStore.showToast(isTor ? t('stores.shortcuts.spaceTor', 'Space: Tor Onion') : t('stores.shortcuts.spaceGhost', 'Space: Ghost Mode'));
            return;
        }
    }

    switch (cleanKey) {

        // New Window (Cmd+N) & New Private Window (Cmd+Shift+N)
        case 'n':
            if (shift) {
                // New Private Window / Tor Window
                const isTor = useTorStore.getState().isTorEnabled;
                const targetSpace = isTor ? 'tor' : 'ghost';
                if (window.electronAPI && window.electronAPI.openNewWindow) {
                    window.electronAPI.openNewWindow({ space: targetSpace });
                    uiStore.showToast(isTor ? t('stores.shortcuts.openingTorWindow', 'Opening new Tor window...') : t('stores.shortcuts.openingPrivateWindow', 'Opening new private window...'));
                } else {
                    tabStore.setActiveSpace(targetSpace);
                    uiStore.showToast(isTor ? t('stores.shortcuts.torActivated', 'Tor Space: Activated') : t('stores.shortcuts.ghostActivated', 'Ghost Mode: Activated'));
                }
            } else {
                // New Window
                if (window.electronAPI && window.electronAPI.openNewWindow) {
                    window.electronAPI.openNewWindow({ space: 'personal' });
                    uiStore.showToast(t('stores.shortcuts.openingWindow', 'Opening new window...'));
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
                    uiStore.showToast(isTor ? t('stores.shortcuts.openingTorWindow', 'Opening new Tor window...') : t('stores.shortcuts.openingPrivateWindow', 'Opening new private window...'));
                } else {
                    tabStore.setActiveSpace(targetSpace);
                    uiStore.showToast(isTor ? t('stores.shortcuts.torActivated', 'Tor Space: Activated') : t('stores.shortcuts.ghostActivated', 'Ghost Mode: Activated'));
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
                if (window.electronAPI && typeof window.electronAPI.closeCurrentWindow === 'function') {
                    window.electronAPI.closeCurrentWindow();
                } else if (window.electronAPI && typeof window.electronAPI.close === 'function') {
                    window.electronAPI.close();
                } else {
                    window.close();
                }
            } else {
                if (uiStore.isFindOpen) {
                    uiStore.setIsFindOpen(false);
                }
                if (uiStore.isReaderOpen || uiStore.isReaderClosing) {
                    uiStore.closeReaderMode(true);
                }
                uiStore.setIsReaderAvailable(false);

                closeActiveTabOrWindow(uiStore, tabStore);
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
                uiStore.showToast(t('stores.shortcuts.hardReload', 'Hard Reload: Cache purged & refreshed'));
            } else {
                uiStore.refresh();
            }
            break;

        // Omnibox & Address Bar (Cmd+K and Cmd+L)
        case 'k':
            if (uiStore.isTopBarOmniboxActive) {
                uiStore.setIsTopBarOmniboxActive(false);
            }
            if (uiStore.isOmniboxOpen) {
                uiStore.closeOmnibox();
            } else {
                const activeTab = getFocusedSplitTab({
                    spaceTabs: tabStore.getActiveList() || [],
                    isSplitView: uiStore.isSplitView,
                    splitOrientation: uiStore.splitOrientation,
                    splitPaneTabIds: uiStore.splitPaneTabIds,
                    splitRightTabId: uiStore.splitRightTabId,
                    focusedPane: uiStore.focusedPane
                });
                const activeUrl = activeTab && activeTab.url !== 'about:blank' ? activeTab.url : '';
                uiStore.openOmnibox(activeUrl);
            }
            break;

        case 'l':
            if (uiStore.isTopBarOmniboxActive) {
                uiStore.setIsTopBarOmniboxActive(false);
            } else {
                if (uiStore.isFullscreen || uiStore.isFramelessMode) {
                    uiStore.setIsTopBarPeeking(true);
                }
                const activeTab = getFocusedSplitTab({
                    spaceTabs: tabStore.getActiveList() || [],
                    isSplitView: uiStore.isSplitView,
                    splitOrientation: uiStore.splitOrientation,
                    splitPaneTabIds: uiStore.splitPaneTabIds,
                    splitRightTabId: uiStore.splitRightTabId,
                    focusedPane: uiStore.focusedPane
                });
                const activeUrl = activeTab && activeTab.url !== 'about:blank' ? activeTab.url : '';
                if (!activeUrl) {
                    // On Homepage: focus homepage omnibox directly
                    const homeInput = document.getElementById('homepage-omnibox-card')?.querySelector('input');
                    if (homeInput) {
                        homeInput.focus();
                        homeInput.select();
                    } else {
                        uiStore.setIsTopBarOmniboxActive(true);
                    }
                } else {
                    uiStore.setIsTopBarOmniboxActive(true);
                }
            }
            break;

        // Open File / Folder (Cmd+O / Ctrl+O)
        case 'o':
            if (window.electronAPI && window.electronAPI.openFileDialog) {
                window.electronAPI.openFileDialog().then(fileUrls => {
                    if (fileUrls && fileUrls.length > 0) {
                        tabStore.openLocalFiles(fileUrls);
                    }
                }).catch(err => {
                    console.error('[Open File] Error:', err);
                });
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
            uiStore.showToast(uiStore.isSidebarHidden ? t('stores.shortcuts.sidebarHidden', 'Sidebar: Hidden') : t('stores.shortcuts.sidebarVisible', 'Sidebar: Visible'));
            break;

        // Tool Hub / Right Panel (Cmd+J)
        case 'j':
            uiStore.setIsRightPanelOpen(!uiStore.isRightPanelOpen);
            break;

        // Find in Page (Cmd+F) & Windowed Frameless / Zen Mode (Cmd+Alt+F)
        case 'f':
            if (alt) {
                const next = uiStore.toggleFramelessMode();
                uiStore.showToast(
                    next
                        ? t('stores.shortcuts.framelessOn', 'Frameless Mode: On (Hover edges for bars)')
                        : t('stores.shortcuts.framelessOff', 'Frameless Mode: Off')
                );
            } else {
                uiStore.setIsFindOpen(true);
            }
            break;

        // Screenshot & Snipping Bar (Cmd+Shift+S)
        case 's':
            if (shift) {
                uiStore.setIsScreenshotBarOpen(!uiStore.isScreenshotBarOpen);
            }
            break;

        // Copy Current Tab URL (Cmd/Ctrl+Shift+C)
        case 'c':
            if (shift) {
                const activeEl = document.activeElement;
                const hasDomSelection = Boolean(window.getSelection()?.toString());
                const hasInputSelection = Boolean(
                    activeEl &&
                    (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
                    activeEl.selectionStart !== activeEl.selectionEnd
                );
                if (hasDomSelection || hasInputSelection) {
                    break;
                }
                let targetTab = tabStore.getActiveTab();
                if (uiStore.isSplitView && uiStore.focusedPane === 'right' && uiStore.splitRightTabId) {
                    const activeList = tabStore.getActiveList() || [];
                    const rightTab = activeList.find(t => t.id === uiStore.splitRightTabId);
                    if (rightTab) targetTab = rightTab;
                }
                const url = targetTab?.url && targetTab.url !== 'about:blank' ? targetTab.url : '';
                if (url) {
                    const copyPromise = navigator.clipboard?.writeText
                        ? navigator.clipboard.writeText(url).catch(() => window.electronAPI?.writeClipboardText?.(url))
                        : Promise.resolve(window.electronAPI?.writeClipboardText?.(url));
                    Promise.resolve(copyPromise).then(() => {
                        uiStore.showToast(t('stores.shortcuts.copiedUrl', 'Copied URL to clipboard'));
                    }).catch(() => {});
                }
            }
            break;


        // Find Next / Prev Match (F3 / Shift+F3)
        case 'f3':
            uiStore.findNextMatch(!shift);
            break;

        // Tab Switcher (Cmd+Tab)
        case 'tab': {
            const now = Date.now();
            if (now - lastTabShortcutTime < 50) {
                break;
            }
            lastTabShortcutTime = now;
            if (!uiStore.showSwitcher) {
                uiStore.openSwitcher(shift ? -1 : 1);
            } else {
                uiStore.cycleSwitcher(shift ? -1 : 1);
            }
            break;
        }

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

        // Zoom Controls:
        // - Ctrl++ / Ctrl+- / Ctrl+0 -> Browser page layout zoom (overrules websites)
        // - Ctrl+Alt++ / Ctrl+Alt+- / Ctrl+Alt+0 -> Cursor-centered visual zoom on the website (no layout reflow)
        case '+':
        case '=':
        case 'add': {
            if (alt) {
                const activeTab = getFocusedSplitTab({
                    spaceTabs: tabStore.getActiveList() || [],
                    isSplitView: uiStore.isSplitView,
                    splitOrientation: uiStore.splitOrientation,
                    splitPaneTabIds: uiStore.splitPaneTabIds,
                    splitRightTabId: uiStore.splitRightTabId,
                    focusedPane: uiStore.focusedPane
                });
                const wv = activeTab ? document.querySelector(`webview#webview-${activeTab.id}`) : document.querySelector('webview');
                if (wv && typeof wv.send === 'function') {
                    try { wv.send('webview-visual-zoom', 'in'); } catch (_) {}
                }
            } else {
                uiStore.zoomIn();
            }
            break;
        }
        case '-':
        case '_':
        case 'subtract': {
            if (alt) {
                const activeTab = getFocusedSplitTab({
                    spaceTabs: tabStore.getActiveList() || [],
                    isSplitView: uiStore.isSplitView,
                    splitOrientation: uiStore.splitOrientation,
                    splitPaneTabIds: uiStore.splitPaneTabIds,
                    splitRightTabId: uiStore.splitRightTabId,
                    focusedPane: uiStore.focusedPane
                });
                const wv = activeTab ? document.querySelector(`webview#webview-${activeTab.id}`) : document.querySelector('webview');
                if (wv && typeof wv.send === 'function') {
                    try { wv.send('webview-visual-zoom', 'out'); } catch (_) {}
                }
            } else {
                uiStore.zoomOut();
            }
            break;
        }
        case '0': {
            const activeTab = tabStore.getActiveTab();
            const wv = activeTab ? document.querySelector(`webview#webview-${activeTab.id}`) : document.querySelector('webview');
            if (wv && typeof wv.send === 'function') {
                try { wv.send('webview-visual-zoom', 'reset'); } catch (_) {}
            }
            if (!alt) {
                uiStore.resetZoom();
            }
            break;
        }

        // F5 Reload (F5 = Reload, Shift+F5 / Ctrl+F5 = Hard Reload)
        case 'f5': {
            if (shift) {
                if (window.electronAPI && window.electronAPI.clearAllData) {
                    window.electronAPI.clearAllData({ cache: true, storage: false, cookies: false }).catch(() => {});
                }
                uiStore.refresh();
                uiStore.showToast(t('stores.shortcuts.hardReload', 'Hard Reload: Cache purged & refreshed'));
            } else {
                uiStore.refresh();
            }
            break;
        }

        // Resource & Task Manager (Shift+Escape)
        case 'shift+escape':
        case 'task-manager':
            if (uiStore.activeModal === 'tasks') {
                uiStore.closeModal();
            } else {
                uiStore.openModal('tasks');
            }
            break;

        // Help Center (F1)
        case 'f1':
            if (uiStore.activeModal === 'help') {
                uiStore.closeModal();
            } else {
                uiStore.openHelpModal('help');
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

        // Caret Browsing Toggle (F7)
        case 'f7': {
            const next = !uiStore.settings?.a11yCaretBrowsing;
            uiStore.toggleSetting('a11yCaretBrowsing');
            uiStore.showToast(next ? t('stores.shortcuts.caretEnabled', 'Caret Browsing enabled (Arrow keys navigate page text)') : t('stores.shortcuts.caretDisabled', 'Caret Browsing disabled'));
            break;
        }

        // Read Aloud Assistant (Alt+R)
        case 'alt_r': {
            uiStore.toggleReadAloud();
            break;
        }

        default:
            break;
    }
};

export default function useGlobalShortcuts() {
    useEffect(() => {
        let isHostPhysicalCtrl = false;

        const handleKeyDown = (e) => {
            if (e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight' || e.key === 'Meta') {
                isHostPhysicalCtrl = true;
            }
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

            const cmdOrCtrl = e.metaKey || e.ctrlKey;

            if (e.key === 'F5' || e.code === 'F5') {
                e.preventDefault();
                executeShortcut('f5', e.shiftKey || cmdOrCtrl);
                return;
            }

            if (e.key === 'F1' || e.key === 'F11' || e.key === 'F12' || e.key === 'F3') {
                e.preventDefault();
                executeShortcut(e.key.toLowerCase(), e.shiftKey);
                return;
            }

            if (e.key === 'F7') {
                e.preventDefault();
                executeShortcut('f7');
                return;
            }

            if (e.altKey && !cmdOrCtrl && (e.key === 'r' || e.key === 'R')) {
                e.preventDefault();
                executeShortcut('alt_r');
                return;
            }

            // Do not trigger global shortcuts if the user is typing in an input or textarea,
            // EXCEPT for global browser shortcuts (only let the input consume non-modifier keys and native text-editing shortcuts)
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
            if (isInput) {
                if (!cmdOrCtrl && !e.altKey && !/^f\d{1,2}$/i.test(e.key || '')) {
                    return;
                }
                const k = (e.key || '').toLowerCase();
                if (cmdOrCtrl && !e.altKey) {
                    const isBasicEditShortcut = !e.shiftKey && (k === 'a' || k === 'c' || k === 'v' || k === 'x' || k === 'z');
                    const isShiftEditShortcut = e.shiftKey && (k === 'v' || k === 'z');
                    const isRedoY = !e.shiftKey && k === 'y' && (e.target.value || e.target.textContent || '').length > 0;
                    const isTextNavOrDelete = (
                        k === 'arrowleft' ||
                        k === 'arrowright' ||
                        k === 'arrowup' ||
                        k === 'arrowdown' ||
                        k === 'backspace' ||
                        k === 'delete' ||
                        k === 'home' ||
                        k === 'end' ||
                        k === 'enter'
                    );
                    if (isBasicEditShortcut || isShiftEditShortcut || isRedoY || isTextNavOrDelete) {
                        return;
                    }
                }
            }

            // Preserve Ctrl+Shift+C text-selection guard when user has highlighted text
            if (cmdOrCtrl && e.shiftKey && !e.altKey && (e.key || '').toLowerCase() === 'c' && hasActiveTextSelection()) {
                return;
            }

            // Route modifier / function-key combos through the customizable shortcut registry
            if (cmdOrCtrl || e.altKey || /^f\d{1,2}$/i.test(e.key || '')) {
                if (cmdOrCtrl && (e.key || '').toLowerCase() === 'tab' && e.repeat) {
                    e.preventDefault();
                    return;
                }
                const uiState = useUIStore.getState();
                const matchedAction = resolveActionForEvent(e, uiState.customShortcuts || {});
                if (matchedAction) {
                    if (matchedAction === 'copyCurrentUrl' && hasActiveTextSelection()) {
                        return;
                    }
                    e.preventDefault();
                    executeAction(matchedAction);
                    return;
                }
            }

            if (cmdOrCtrl) {
                if (e.key.toLowerCase() === 'tab' && e.repeat) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                let normalizedKey = (e.key || '').toLowerCase();
                if (e.code === 'Equal' || e.code === 'NumpadAdd') normalizedKey = '+';
                else if (e.code === 'Minus' || e.code === 'NumpadSubtract') normalizedKey = '-';
                else if (e.code === 'Digit0' || e.code === 'Numpad0') normalizedKey = '0';
                executeShortcut(normalizedKey, e.shiftKey, e.altKey);
            }
        };

        const handleKeyUp = (e) => {
            const keyLower = (e.key || '').toLowerCase();
            const codeLower = (e.code || '').toLowerCase();
            const isCtrlOrMeta = keyLower === 'control' || keyLower === 'meta' || 
                                 codeLower.startsWith('control') || codeLower.startsWith('meta');
            if (isCtrlOrMeta) {
                isHostPhysicalCtrl = false;
                const uiStore = useUIStore.getState();
                if (uiStore.showSwitcher) {
                    uiStore.confirmSwitcher();
                }
            }
        };

        let globalWheelAccumulator = 0;
        let globalWheelResetTimer = null;
        let pageWheelAccumulator = 0;
        let pageWheelResetTimer = null;
        let lastZoomTime = 0;

        const handleWheel = (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            if (e.__qbrowseZoomHandled) return;
            e.__qbrowseZoomHandled = true;

            // Always prevent the QBrowse UI shell itself from zooming on touchpad pinch or Ctrl+Wheel
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') {
                e.stopImmediatePropagation();
            }

            // Touchpad Pinch on host UI -> Visual Canvas Zoom (only when physical Ctrl is NOT held on keyboard)
            const isTouchpadPinch = !isHostPhysicalCtrl && !e.altKey && e.deltaMode === 0 && (
                (e.deltaY % 1 !== 0) ||
                (e.deltaX % 1 !== 0)
            );

            if (isTouchpadPinch) {
                clearTimeout(globalWheelResetTimer);
                globalWheelResetTimer = setTimeout(() => {
                    globalWheelAccumulator = 0;
                }, 180);

                globalWheelAccumulator += e.deltaY;
                const threshold = 15;
                if (Math.abs(globalWheelAccumulator) >= threshold) {
                    const now = performance.now();
                    if (now - lastZoomTime >= 40) {
                        const action = globalWheelAccumulator < 0 ? 'in' : 'out';
                        globalWheelAccumulator = 0;
                        lastZoomTime = now;
                        const activeTab = useTabStore.getState().getActiveTab();
                        const wv = activeTab ? document.querySelector(`webview#webview-${activeTab.id}`) : document.querySelector('webview');
                        if (wv && typeof wv.send === 'function') {
                            try { wv.send('webview-visual-zoom', action); } catch (_) {}
                        }
                    }
                }
                return;
            }

            // Ctrl + Wheel (without Alt) -> Page Zoom on active tab
            if (!e.altKey) {
                clearTimeout(pageWheelResetTimer);
                pageWheelResetTimer = setTimeout(() => {
                    pageWheelAccumulator = 0;
                }, 180);

                let dy = e.deltaY;
                if (e.deltaMode === 1) dy *= 33;
                else if (e.deltaMode === 2) dy *= 100;

                pageWheelAccumulator += dy;

                const threshold = 40;
                const now = performance.now();
                if (Math.abs(pageWheelAccumulator) >= threshold && (now - lastZoomTime >= 60)) {
                    lastZoomTime = now;
                    const direction = pageWheelAccumulator < 0 ? 1 : -1;
                    pageWheelAccumulator = 0;
                    const ui = useUIStore.getState();
                    if (direction > 0) ui.zoomIn();
                    else ui.zoomOut();
                }
                return;
            }

            clearTimeout(globalWheelResetTimer);
            globalWheelResetTimer = setTimeout(() => {
                globalWheelAccumulator = 0;
            }, 180);

            let normalizedDelta = e.deltaY;
            if (e.deltaMode === 1) {
                normalizedDelta *= 33;
            } else if (e.deltaMode === 2) {
                normalizedDelta *= 100;
            }

            globalWheelAccumulator += normalizedDelta;
            const threshold = 20;
            if (Math.abs(globalWheelAccumulator) >= threshold) {
                const now = performance.now();
                if (now - lastZoomTime >= 30) {
                    const action = globalWheelAccumulator < 0 ? 'in' : 'out';
                    globalWheelAccumulator = 0;
                    lastZoomTime = now;
                    const activeTab = useTabStore.getState().getActiveTab();
                    const wv = activeTab ? document.querySelector(`webview#webview-${activeTab.id}`) : document.querySelector('webview');
                    if (wv && typeof wv.send === 'function') {
                        try { wv.send('webview-visual-zoom', action); } catch (_) {}
                    }
                }
            }
        };

        const handleBlur = () => {
            isHostPhysicalCtrl = false;
            const ui = useUIStore.getState();
            if (ui.showSwitcher) {
                ui.confirmSwitcher();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        window.addEventListener('blur', handleBlur);

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
                    const uiState = useUIStore.getState();
                    const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || '');
                    const syntheticEvent = {
                        key,
                        ctrlKey: !isMac,
                        metaKey: isMac,
                        shiftKey: Boolean(shift),
                        altKey: Boolean(data.alt)
                    };
                    const matchedAction = resolveActionForEvent(syntheticEvent, uiState.customShortcuts || {}, isMac);
                    if (matchedAction) {
                        executeAction(matchedAction);
                        return;
                    }
                    executeShortcut(key, shift, !!data.alt);
                    return;
                }

                if (shortcut === 'f1' || shortcut === 'f5' || shortcut === 'f11' || shortcut === 'f12' || shortcut === 'f3' || shortcut === 'f7' || shortcut === 'alt_r') {
                    executeShortcut(shortcut, shift, !!data.alt);
                }
            });
        }

        if (window.electronAPI && window.electronAPI.onGlobalKeyUp) {
            window.electronAPI.onGlobalKeyUp((data) => {
                const keyLower = (data?.key || '').toLowerCase();
                const codeLower = (data?.code || '').toLowerCase();
                const isCtrlOrMeta = keyLower === 'control' || keyLower === 'meta' || 
                                     codeLower.startsWith('control') || codeLower.startsWith('meta');
                if (isCtrlOrMeta) {
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
            window.removeEventListener('wheel', handleWheel, { capture: true });
            document.removeEventListener('wheel', handleWheel, { capture: true });
            window.removeEventListener('blur', handleBlur);
            if (window.__switcherTimer) clearTimeout(window.__switcherTimer);
        };
    }, []);
}
