import React, { useEffect, useState } from 'react';
import useUIStore, { syncInitialSettingsToElectron } from './store/useUIStore';
import useTabStore from './store/useTabStore';
import useAIStore from './store/useAIStore';
import useProfileStore from './store/useProfileStore';
import useGlobalShortcuts from './hooks/useGlobalShortcuts';
import useDragAndDrop from './hooks/useDragAndDrop';
import { listenToEvent } from './services/electronIPC';
import { playBootWelcomeChime, playDownloadCompleteChime } from './utils/bootAudio';

import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import MainFrame from './components/layout/MainFrame';

import Omnibox from './components/features/Omnibox';
import TabMap from './components/features/TabMap';
import ToolHub from './components/features/ToolHub';

import SettingsModal from './components/modals/SettingsModal';
import HistoryModal from './components/modals/HistoryModal';
import CookiesModal from './components/modals/CookiesModal';
import ResourceManagerModal from './components/modals/ResourceManagerModal';
import BootCurtain from './components/common/BootCurtain';
import SetupJourney from './components/modals/SetupJourney';
import LivingTour from './components/modals/LivingTour';
import AddPinModal from './components/modals/AddPinModal';
import PasskeyVerificationModal from './components/modals/PasskeyVerificationModal';
import Overlays from './components/common/Overlays';
import TabSwitcherOverlay from './components/common/TabSwitcherOverlay';
import ContextMenuProvider from './components/common/ContextMenuProvider';
import DefaultBrowserBanner from './components/common/DefaultBrowserBanner';
import UserProfilePopover from './components/popovers/UserProfilePopover';

const DEFAULT_STOCK_WALLPAPER = 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2564&auto=format&fit=crop';

export default function App() {
    const theme = useUIStore(state => state.theme);
    const themeTransition = useUIStore(state => state.themeTransition);
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const accentColor = useUIStore(state => state.accentColor);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const toast = useUIStore(state => state.toast);
    const showToast = useUIStore(state => state.showToast);
    const closeContextMenus = useUIStore(state => state.closeContextMenus);
    const activePopover = useUIStore(state => state.activePopover);
    const isPopoverClosing = useUIStore(state => state.isPopoverClosing);
    const closePopover = useUIStore(state => state.closePopover);
    const activeSpace = useTabStore(state => state.activeSpace);
    const customWallpaper = useUIStore(state => state.settings?.customWallpaper);
    const wallpaperDimming = useUIStore(state => state.settings?.wallpaperDimming ?? 25);
    const wallpaperBlur = useUIStore(state => state.settings?.wallpaperBlur ?? 24);
    const loadStoredWallpaper = useUIStore(state => state.loadStoredWallpaper);
    const isBooting = useUIStore(state => state.isBooting);
    const finishBoot = useUIStore(state => state.finishBoot);
    const activeModal = useUIStore(state => state.activeModal);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const activeWallpaper = customWallpaper || DEFAULT_STOCK_WALLPAPER;
    const [currentWallpaper, setCurrentWallpaper] = useState(activeWallpaper);
    const [prevWallpaper, setPrevWallpaper] = useState(null);

    // Preload & GPU-decode wallpaper so it is fully rendered before boot curtain dissolves
    useEffect(() => {
        if (activeWallpaper) {
            const img = new Image();
            img.src = activeWallpaper;
            if (img.decode) {
                img.decode().catch(() => {});
            }
        }
    }, [activeWallpaper]);

    useEffect(() => {
        document.documentElement.style.setProperty('--glass-blur', `${wallpaperBlur}px`);
    }, [wallpaperBlur]);

    useEffect(() => {
        if (activeWallpaper !== currentWallpaper) {
            // While boot curtain is still active, immediately set wallpaper without a visible crossfade lag
            if (isBooting) {
                setCurrentWallpaper(activeWallpaper);
                setPrevWallpaper(null);
                return;
            }
            setPrevWallpaper(currentWallpaper);
            setCurrentWallpaper(activeWallpaper);
            const timer = setTimeout(() => {
                setPrevWallpaper(null);
            }, 750);
            return () => clearTimeout(timer);
        }
    }, [activeWallpaper, currentWallpaper, isBooting]);


    const { onDragOver, onDragLeave, onDropRoot } = useDragAndDrop();

    // Initialize global shortcuts
    useGlobalShortcuts();

    // Check for window launch query parameters (e.g., ?space=ghost or ?profileId=...)
    useEffect(() => {
        loadStoredWallpaper();
        try {
            const params = new URLSearchParams(window.location.search);
            const profileParam = params.get('profileId');
            if (profileParam) {
                useProfileStore.getState().switchProfile(profileParam);
            }
            const spaceParam = params.get('space');
            if (spaceParam && ['personal', 'work', 'ghost'].includes(spaceParam)) {
                useTabStore.getState().setActiveSpace(spaceParam);
            }
        } catch(e) {}

        // Listen for URLs opened externally from other apps when QBrowse is default browser
        let lastExternalUrl = null;
        let lastExternalTime = 0;
        const handleExternalNavigation = (targetUrl) => {
            if (!targetUrl || targetUrl === 'about:blank') return;
            const now = Date.now();
            if (lastExternalUrl === targetUrl && (now - lastExternalTime < 2000)) return;
            lastExternalUrl = targetUrl;
            lastExternalTime = now;
            useTabStore.getState().handleNewTab(targetUrl);
        };

        if (window.electronAPI && window.electronAPI.getInitialLaunchUrl) {
            window.electronAPI.getInitialLaunchUrl().then(handleExternalNavigation).catch(() => {});
        }

        if (window.electronAPI && window.electronAPI.onOpenUrl) {
            const unlisten = window.electronAPI.onOpenUrl(({ url }) => {
                handleExternalNavigation(url);
            });
            return () => {
                if (typeof unlisten === 'function') unlisten();
            };
        }
    }, []);

    // Memory Saver Engine: Auto-suspend inactive background tabs based on hardware profile & user settings
    useEffect(() => {
        const interval = setInterval(() => {
            const memorySaverEnabled = useUIStore.getState().settings?.memory !== false;
            if (!memorySaverEnabled) return;

            const sleepTimeoutMinutes = useUIStore.getState().tabSleepTimeoutMinutes;
            if (!sleepTimeoutMinutes || sleepTimeoutMinutes <= 0) return; // 0 or negative = never suspend

            const now = Date.now();
            const maxInactiveMs = sleepTimeoutMinutes * 60 * 1000;

            const checkAndSuspend = (tabs, setTabs) => {
                let updated = false;
                const next = tabs.map(t => {
                    // Do not suspend active, already suspended, blank, pinned, or media-playing tabs
                    const isProtected = t.active || t.suspended || t.pinned || t.isAudioPlaying || t.mediaPlaying || !t.url || t.url === 'about:blank';
                    if (!isProtected && t.lastActiveAt && (now - t.lastActiveAt > maxInactiveMs)) {
                        updated = true;
                        return { ...t, suspended: true };
                    }
                    return t;
                });
                if (updated) {
                    setTabs(next);
                    useUIStore.getState().showToast(`Memory Saver: Suspended inactive tabs (${sleepTimeoutMinutes}m)`);
                }
            };

            const tabState = useTabStore.getState();
            checkAndSuspend(tabState.privateTabs, tabState.setPrivateTabs);
            checkAndSuspend(tabState.workTabs, tabState.setWorkTabs);
            checkAndSuspend(tabState.ghostTabs, tabState.setGhostTabs);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Listen to backend events
    useEffect(() => {
        if (window.electronAPI) {
            // Sync all persisted frontend settings to Electron on startup
            syncInitialSettingsToElectron();

            // Initialize hardware profile and dynamic performance tier
            useUIStore.getState().initPerformanceProfile();

            const startupSettings = useUIStore.getState().settings;
            if (startupSettings?.playStartupSound) {
                playBootWelcomeChime();
            }

            if (window.electronAPI.onTrackerBlocked) {
                window.electronAPI.onTrackerBlocked((url) => {
                    useUIStore.getState().addBlockedTracker(url);
                });
                // Initialize adblocker state in backend
                window.electronAPI.setAdblock(useUIStore.getState().isAdblockActive);
            }

            if (window.electronAPI.onOpenNewTab) {
                window.electronAPI.onOpenNewTab(({ url }) => {
                    console.log("[App] Intercepted new window request from Electron:", url);
                    if (url && url !== 'about:blank') {
                        useTabStore.getState().handleNewTab(url);
                    }
                });
            }

            if (window.electronAPI.onDownloadStarted) {
                window.electronAPI.onDownloadStarted((data) => {
                    useUIStore.getState().addDownload({ ...data, state: 'progressing', receivedBytes: 0, speedBytesPerSec: 0 });
                    useUIStore.getState().setActiveDownloadPopup(data.id);
                });
                window.electronAPI.onDownloadUpdated((data) => {
                    useUIStore.getState().updateDownload(data.id, data);
                    const store = useUIStore.getState();
                    if (store.activeDownloadPopup !== data.id) {
                        store.setActiveDownloadPopup(data.id);
                    }
                });
                window.electronAPI.onDownloadDone((data) => {
                    useUIStore.getState().updateDownload(data.id, { state: data.state, savePath: data.savePath });
                    useUIStore.getState().setActiveDownloadPopup(data.id);
                    if (data.state === 'completed') {
                        const s = useUIStore.getState().settings;
                        if (s?.downloadSound !== false) {
                            playDownloadCompleteChime();
                        }
                        // Keep popup open for a bit
                        setTimeout(() => {
                            if (useUIStore.getState().activeDownloadPopup === data.id) {
                                useUIStore.getState().setActiveDownloadPopup(null);
                            }
                        }, 5000);
                    }
                });
            }

            if (window.electronAPI.onAiStatus) {
                window.electronAPI.onAiStatus((metrics) => {
                    useAIStore.setState({
                        isRunning: metrics.status === 'running' || metrics.status === 'loading',
                        status: metrics.status,
                        metrics: metrics
                    });
                });
                useAIStore.getState().fetchEngineStatus();
            }
            if (window.electronAPI.onPasskeyPrompt) {
                window.electronAPI.onPasskeyPrompt((promptData) => {
                    console.log("[App] Received passkey verification prompt:", promptData);
                    useUIStore.getState().setPasskeyPrompt(promptData);
                });
            }

            if (window.electronAPI.onHttpAuthRequest) {
                window.electronAPI.onHttpAuthRequest((data) => {
                    console.log("[App] Received HTTP auth request:", data);
                    useUIStore.getState().setActiveDialog({
                        type: 'auth',
                        hostname: data.host + (data.port ? `:${data.port}` : ''),
                        realm: data.realm,
                        message: `${data.isProxy ? 'Proxy server' : 'The server'} ${data.host}${data.port ? `:${data.port}` : ''} requires authentication.`,
                        onConfirm: (username, password) => {
                            window.electronAPI?.respondHttpAuth?.({
                                requestId: data.requestId,
                                username,
                                password
                            });
                        },
                        onCancel: () => {
                            window.electronAPI?.respondHttpAuth?.({
                                requestId: data.requestId,
                                cancel: true
                            });
                        }
                    });
                });
            }

            if (window.electronAPI.onJsDialog) {
                window.electronAPI.onJsDialog((data) => {
                    useUIStore.getState().setActiveDialog({
                        dialogId: data.dialogId,
                        type: data.dialogType,
                        message: data.message,
                        hostname: data.hostname,
                        origin: data.origin,
                        defaultValue: data.defaultValue,
                        onConfirm: (val) => {
                            window.electronAPI?.respondJsDialog?.({
                                dialogId: data.dialogId,
                                accept: true,
                                promptText: typeof val === 'string' ? val : ''
                            });
                        },
                        onCancel: () => {
                            window.electronAPI?.respondJsDialog?.({
                                dialogId: data.dialogId,
                                accept: false
                            });
                        }
                    });
                });
            }

            if (window.electronAPI.onJsDialogDismiss) {
                window.electronAPI.onJsDialogDismiss(({ dialogId }) => {
                    const currentDialog = useUIStore.getState().activeDialog;
                    if (currentDialog && currentDialog.dialogId === dialogId) {
                        useUIStore.getState().closeActiveDialog();
                    }
                });
            }
        }
    }, []);

    // Global Drag & Drop: Open local files/folders dropped into QBrowse window
    useEffect(() => {
        const handleWindowDragOver = (e) => {
            if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }
        };

        const handleWindowDrop = (e) => {
            // Ignore if internal tab drag is in progress
            if (useTabStore.getState().draggedItem) return;

            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                const fileUrls = files.map(f => {
                    const filePath = f.path; // Electron exposed file path
                    if (filePath) {
                        const normalized = filePath.replace(/\\/g, '/');
                        return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
                    }
                    return null;
                }).filter(Boolean);

                if (fileUrls.length > 0) {
                    useTabStore.getState().openLocalFiles(fileUrls);
                }
            }
        };

        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('drop', handleWindowDrop);
        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('drop', handleWindowDrop);
        };
    }, []);

    // Resource Manager: Background Tab Suspender
    useEffect(() => {
        const unlisten = listenToEvent('webview_error', (err) => {
            console.error("WEBVIEW ERROR FROM RUST:", err.payload);
            showToast("Webview Error: " + err.payload, 'error');
        });

        return () => {
            unlisten.then(f => f());
        };
    }, [showToast]);

    // Hardware-Aware Adaptive Tab Suspender & Memory Saver
    useEffect(() => {
        const interval = setInterval(() => {
            const uiStore = useUIStore.getState();
            if (uiStore.settings?.memory === false) return;

            const sleepTimeoutMinutes = uiStore.tabSleepTimeoutMinutes || 15;
            if (sleepTimeoutMinutes <= 0) return; // 0 = Never sleep

            const suspendTimeoutMs = sleepTimeoutMinutes * 60 * 1000;
            const tabStore = useTabStore.getState();
            const allTabs = [
                ...tabStore.privateTabs, 
                ...tabStore.workTabs, 
                ...tabStore.ghostTabs, 
                ...(tabStore.torTabs || [])
            ];
            const now = Date.now();

            let suspendedCount = 0;
            allTabs.forEach(tab => {
                const isImmune = (
                    tab.active || 
                    tab.suspended || 
                    tab.isAudible || 
                    tab.hasAudio || 
                    tab.isPinned || 
                    tab.isDownloading || 
                    !tab.url || 
                    tab.url === 'about:blank'
                );

                if (!isImmune && (now - (tab.lastActiveAt || now) > suspendTimeoutMs)) {
                    tabStore.suspendTab(tab.id, true);
                    suspendedCount++;
                }
            });

            if (suspendedCount > 0) {
                console.log(`[MemorySaver] Suspended ${suspendedCount} inactive tabs to free RAM (timeout: ${sleepTimeoutMinutes}m).`);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        // Fix for Tauri/WebView2 HTML5 drag and drop "red symbol" issue
        const handleGlobalDrag = (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        };
        document.addEventListener('dragover', handleGlobalDrag);
        document.addEventListener('dragenter', handleGlobalDrag);

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };

        let finalAccent = accentColor;
        if (activeSpace === 'ghost') {
            finalAccent = '#a855f7';
        } else if (activeSpace === 'tor') {
            finalAccent = '#c084fc';
        } else if (isBright && accentColor === '#d4bc94') {
            finalAccent = '#c08434'; // Radiant warm golden amber with high contrast on light backgrounds
        }

        const rgb = hexToRgb(finalAccent);
        if (rgb) {
            root.style.setProperty('--accent', `rgb(${rgb})`);
            root.style.setProperty('--accent-rgb', rgb);
            root.style.setProperty('--accent-10', `rgba(${rgb}, 0.1)`);
            root.style.setProperty('--accent-20', `rgba(${rgb}, 0.2)`);
            root.style.setProperty('--accent-30', `rgba(${rgb}, 0.3)`);
            root.style.setProperty('--accent-40', `rgba(${rgb}, 0.4)`);
        }

        // Listen to global commands from Rust
        let unlistenCommand;
        listenToEvent('command_executed', (event) => {
            if (event.payload === 'close_peek') {
                useUIStore.getState().closePeek();
            }
        }).then(u => unlistenCommand = u);

        return () => {
            if (unlistenCommand) unlistenCommand();
        };
    }, [accentColor, activeSpace, theme, isBright]);

    const handleBootFinish = () => {
        finishBoot();
        if (!useUIStore.getState().setupComplete) {
            useUIStore.getState().openModal('onboarding');
        } else if (!useUIStore.getState().tutorialDone) {
            useUIStore.getState().openModal('tutorial');
        }
    };

    const handleContextMenu = (e) => {
        // Prevent opening webpage context menu anywhere on application UI chrome, modals, and tool containers.
        // Webpage context menus are exclusively handled by active webviews in WebViewContainer.
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <ContextMenuProvider>
            <div
                className={`flex h-screen w-full overflow-hidden font-sans select-none relative z-0 ${isBright ? 'text-zinc-900' : 'bg-[#08080a] text-white'} ${isFullscreen ? 'p-0 m-0' : uiScale === 'compact' ? 'p-1.5' : 'p-3 md:p-4'}`}
                style={isFullscreen ? { padding: 0, margin: 0 } : undefined}
                onClick={() => closeContextMenus()}
                onContextMenu={handleContextMenu}
                onDragOver={(e) => onDragOver(e, 'root')}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDropRoot(e, activeSpace)}
            >
                {/* Ultra-Smooth Crossfading Wallpaper Layers */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {/* Previous Wallpaper Layer (smoothly sitting underneath during crossfade) */}
                    {prevWallpaper && (
                        <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ 
                                backgroundImage: `url('${prevWallpaper}')`,
                                filter: 'saturate(1.1)'
                            }}
                        />
                    )}
                    {/* Active Wallpaper Layer (fades in smoothly with subtle Apple Sonoma scale settlement) */}
                    <div 
                        key={currentWallpaper}
                        className="absolute inset-0 bg-cover bg-center animate-wallpaper-fade will-change-transform"
                        style={{ 
                            backgroundImage: `url('${currentWallpaper}')`,
                            filter: 'saturate(1.1)'
                        }}
                    />
                    {/* Dimming / Frosted overlay layer to ensure UI readability without bleaching */}
                    <div 
                        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300" 
                        style={{ 
                            backgroundColor: isBright
                                ? `rgba(255, 255, 255, ${(wallpaperDimming / 100) * 0.15})` 
                                : `rgba(0, 0, 0, ${wallpaperDimming / 100})` 
                        }} 
                    />
                </div>
                <Sidebar />
                <div 
                    className={`flex-1 flex flex-col h-full relative z-20 min-w-0 ${isFullscreen ? 'p-0 m-0' : ''}`}
                    style={isFullscreen ? { padding: 0, margin: 0 } : undefined}
                >
                    <MainFrame />
                </div>

                <Omnibox />
                <TabMap />
                <ToolHub />

                <SettingsModal />
                <CookiesModal />
                <HistoryModal />
                <ResourceManagerModal />
                {/* Full-Screen Setup Journey */}
                {(activeModal === 'onboarding' || activeModal === 'setup') && (
                    <SetupJourney 
                        onFinish={() => {
                            useUIStore.getState().closeModal();
                            useUIStore.getState().setSetupComplete(true);
                        }}
                        onStartTour={() => {
                            useUIStore.getState().openModal('tutorial');
                        }}
                    />
                )}

                {/* Interactive Living Spotlight Tour */}
                {(activeModal === 'tutorial' || activeModal === 'tour') && (
                    <LivingTour 
                        onExit={() => {
                            useUIStore.getState().closeModal();
                            useUIStore.getState().setTutorialDone(true);
                        }}
                    />
                )}

                {/* Minimalist Monogram Fast-Boot Curtain */}
                {isBooting && <BootCurtain onFinish={handleBootFinish} />}
                <AddPinModal />
                <PasskeyVerificationModal />

                <Overlays />
                <TabSwitcherOverlay />
                <DefaultBrowserBanner />

                {/* USER PROFILE & CLOUD SYNC POPOVER */}
                {((activePopover === 'user' || activePopover === 'userProfile') || (isPopoverClosing && (activePopover === 'user' || activePopover === 'userProfile'))) && (
                    <>
                        <div 
                            className={`fixed inset-0 z-[69990] bg-black/35 backdrop-blur-[3px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isPopoverClosing ? 'opacity-0 pointer-events-none' : 'animate-fade-in'
                            }`}
                            onClick={closePopover} 
                        />
                        <UserProfilePopover isClosing={isPopoverClosing} />
                    </>
                )}

                {/* 60FPS GPU-COMPOSITED THEME TRANSITION VEIL */}
                {themeTransition && (
                    <div 
                        key={`${themeTransition.from}-to-${themeTransition.to}`}
                        className="theme-transition-curtain"
                        style={{
                            backgroundColor: themeTransition.from === 'dark' 
                                ? 'rgba(8, 8, 10, 0.95)' 
                                : 'rgba(244, 245, 248, 0.95)'
                        }}
                    />
                )}
            </div>
        </ContextMenuProvider>
    );
}
