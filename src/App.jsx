import React, { useEffect, useState } from 'react';
import useUIStore, { syncInitialSettingsToElectron } from './store/useUIStore';
import useTabStore from './store/useTabStore';
import useAIStore from './store/useAIStore';
import useProfileStore from './store/useProfileStore';
import useTorStore from './store/useTorStore';
import useSyncStore from './store/useSyncStore';
import useGlobalShortcuts from './hooks/useGlobalShortcuts';
import useDragAndDrop from './hooks/useDragAndDrop';
import { listenToEvent } from './services/electronIPC';
import { playBootWelcomeChime, playDownloadCompleteChime } from './utils/bootAudio';
import { applyAppFont } from './utils/appFontManager';

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
import LanguageWarpOverlay from './components/common/LanguageWarpOverlay';
import ContextMenuProvider from './components/common/ContextMenuProvider';
import DefaultBrowserBanner from './components/common/DefaultBrowserBanner';
import UserProfilePopover from './components/popovers/UserProfilePopover';
import { resolveActiveLanguage } from './i18n/index';
import WallpaperEngine from './components/common/WallpaperEngine';
import { isLikelyDownloadUrl } from './utils/downloadHelpers';

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
    const blurWallpaper = useUIStore(state => state.settings?.blurWallpaper ?? false);
    const loadStoredWallpaper = useUIStore(state => state.loadStoredWallpaper);
    const isBooting = useUIStore(state => state.isBooting);
    const finishBoot = useUIStore(state => state.finishBoot);
    const activeModal = useUIStore(state => state.activeModal);
    const a11yHighContrast = useUIStore(state => state.settings?.a11yHighContrast);
    const a11yDyslexiaFont = useUIStore(state => state.settings?.a11yDyslexiaFont);
    const a11yReducedMotion = useUIStore(state => state.settings?.a11yReducedMotion);
    const a11yFocusRings = useUIStore(state => state.settings?.a11yFocusRings);
    const isSystemReducedMotion = useUIStore(state => state.isSystemReducedMotion);
    const initSystemReducedMotion = useUIStore(state => state.initSystemReducedMotion);
    const sidebarPosition = useUIStore(state => state.settings?.sidebarPosition || 'left');
    const frameCurvature = useUIStore(state => state.settings?.frameCurvature || 'default');

    const appFontType = useUIStore(state => state.settings?.appFontType);
    const appFontFamily = useUIStore(state => state.settings?.appFontFamily);
    const appFontGoogleFamily = useUIStore(state => state.settings?.appFontGoogleFamily);
    const appFontCustomName = useUIStore(state => state.settings?.appFontCustomName);
    const appFontLetterSpacing = useUIStore(state => state.settings?.appFontLetterSpacing);
    const appFontSizeScale = useUIStore(state => state.settings?.appFontSizeScale);
    const appFontWeightShift = useUIStore(state => state.settings?.appFontWeightShift);
    const appFontFileData = useUIStore(state => state.settings?.appFontFileData);
    const appLanguage = useUIStore(state => state.settings?.appLanguage);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    // Initialize Windows & OS reduced-motion accessibility synchronization
    useEffect(() => {
        if (typeof initSystemReducedMotion === 'function') {
            initSystemReducedMotion();
        }
    }, [initSystemReducedMotion]);

    useEffect(() => {
        const root = document.documentElement;
        if (!root.classList.contains('eco-mode')) {
            root.style.setProperty('--glass-blur', `${wallpaperBlur}px`);
        }
    }, [wallpaperBlur]);


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
            const initialTabParam = params.get('initialTab');
            if (initialTabParam) {
                try {
                    const rawTab = JSON.parse(decodeURIComponent(initialTabParam));
                    if (rawTab && (rawTab.url || rawTab.title)) {
                        const targetSpace = spaceParam || 'personal';
                        const newTab = {
                            ...rawTab,
                            id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                            active: true,
                            lastActiveAt: Date.now()
                        };
                        useTabStore.getState().setTabsForSpace(targetSpace, [newTab]);
                        useUIStore.getState().setCurrentUrl(newTab.url || '');
                    }
                } catch (_) {}
            }
        } catch(e) {}

        // Initialize Window ID for Cross-Window Drag & Drop
        if (window.electronAPI && window.electronAPI.getWindowId) {
            window.electronAPI.getWindowId().then(id => {
                window.__qbrowseWindowId = id;
            }).catch(() => {});
        }

        // Listen for tab transfers to other windows
        let unsubTabRemoved = null;
        if (window.electronAPI && window.electronAPI.onTabRemovedFromWindow) {
            unsubTabRemoved = window.electronAPI.onTabRemovedFromWindow(({ tabId }) => {
                useTabStore.getState().removeTabById(tabId);
            });
        }

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

        return () => {
            if (unsubTabRemoved) unsubTabRemoved();
        };
    }, []);

    // Listen to backend events
    useEffect(() => {
        const handleBeforeUnload = () => {
            try {
                useSyncStore.getState().flushDebouncedSync();
            } catch (_) {}
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        if (window.electronAPI) {
            // Resiliently merge persisted disk settings on startup, then sync to Electron
            useUIStore.getState().initSettingsFromDisk().then(() => {
                syncInitialSettingsToElectron();
            }).catch(() => {
                syncInitialSettingsToElectron();
            });

            // Initialize hardware profile and dynamic performance tier
            useUIStore.getState().initPerformanceProfile();

            // Initialize Tor network state listeners
            useTorStore.getState().init();

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
                window.electronAPI.onOpenNewTab((data) => {
                    const targetUrl = typeof data === 'string' ? data : (data?.url || '');
                    const disposition = typeof data === 'object' ? data?.disposition : undefined;
                    console.log("[App] Intercepted new window request from Electron:", { targetUrl, disposition });
                    if (targetUrl && targetUrl !== 'about:blank') {
                        if (window.electronAPI?.isAppProtocol?.(targetUrl)) {
                            window.electronAPI.openAppProtocol(targetUrl);
                            return;
                        }
                        const isLikelyDownload = isLikelyDownloadUrl(targetUrl);
                        const makeActive = !isLikelyDownload && (disposition !== 'background-tab');
                        useTabStore.getState().handleNewTab(targetUrl, makeActive, {
                            isOpenedByNewWindow: true,
                            isDownloadTab: isLikelyDownload
                        });
                    }
                });
            }

            if (window.electronAPI.onAppProtocolLaunched) {
                window.electronAPI.onAppProtocolLaunched((data) => {
                    useUIStore.getState().showToast(`Opening ${data.name || 'External App'}...`);
                });
            }

            if (window.electronAPI.onDownloadStarted) {
                window.electronAPI.onDownloadStarted((data) => {
                    useUIStore.getState().addDownload({ ...data, state: 'progressing', receivedBytes: 0, speedBytesPerSec: 0 });
                    useUIStore.getState().setActiveDownloadPopup(data.id);
                    useTabStore.getState().closeDownloadTabIfOrphaned(data);
                });
                window.electronAPI.onDownloadUpdated((data) => {
                    useUIStore.getState().updateDownload(data.id, data);
                    const store = useUIStore.getState();
                    if (store.activeDownloadPopup !== data.id) {
                        store.setActiveDownloadPopup(data.id);
                    }
                });
                window.electronAPI.onDownloadDone((data) => {
                    useUIStore.getState().updateDownload(data.id, { 
                        state: data.state, 
                        savePath: data.savePath,
                        verified: data.verified,
                        checksum: data.checksum,
                        algorithm: data.algorithm,
                        actualBytes: data.actualBytes,
                        error: data.error,
                        verifiedAt: data.verifiedAt
                    });
                    useUIStore.getState().setActiveDownloadPopup(data.id);
                    if (data.state === 'completed' && data.verified !== false) {
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
            if (window.electronAPI.onDisplayMetricsChanged) {
                window.electronAPI.onDisplayMetricsChanged((data) => {
                    console.log("[App] Screen resolution/metrics updated:", data);
                    requestAnimationFrame(() => {
                        window.dispatchEvent(new Event('resize'));
                    });
                });
            }

            if (window.electronAPI.onFullscreenChanged) {
                window.electronAPI.onFullscreenChanged((isFs) => {
                    useUIStore.getState().setIsFullscreen(Boolean(isFs));
                });
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

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Global Drag & Drop: Cross-Window Tabs & Local Files/Folders
    useEffect(() => {
        let dragCounter = 0;
        const handleWindowDragEnter = (e) => {
            dragCounter++;
            if (e.dataTransfer && e.dataTransfer.types) {
                if (e.dataTransfer.types.includes('application/qbrowse-tab') || e.dataTransfer.types.includes('Files')) {
                    document.body.classList.add('is-dragging-global');
                }
            }
        };

        const handleWindowDragLeave = (e) => {
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                document.body.classList.remove('is-dragging-global');
            }
        };

        const handleWindowDragOver = (e) => {
            if (e.dataTransfer && e.dataTransfer.types) {
                if (e.dataTransfer.types.includes('application/qbrowse-tab') || e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/qbrowse-tab') ? 'move' : 'copy';
                }
            }
        };

        const handleWindowDrop = (e) => {
            dragCounter = 0;
            document.body.classList.remove('is-dragging-global');

            // 1. Cross-window tab dropped onto main window canvas
            if (e.dataTransfer) {
                try {
                    const raw = e.dataTransfer.getData('application/qbrowse-tab');
                    if (raw) {
                        const payload = JSON.parse(raw);
                        if (payload && payload.tab) {
                            e.preventDefault();
                            e.stopPropagation();
                            useTabStore.getState().handleDropRoot(e, useTabStore.getState().activeSpace);
                            return;
                        }
                    }
                } catch (_) {}
            }

            // 2. Ignore if internal tab drag is in progress
            if (useTabStore.getState().draggedItem) return;

            // 3. Local file dropped
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

        window.addEventListener('dragenter', handleWindowDragEnter);
        window.addEventListener('dragleave', handleWindowDragLeave);
        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('drop', handleWindowDrop);
        return () => {
            window.removeEventListener('dragenter', handleWindowDragEnter);
            window.removeEventListener('dragleave', handleWindowDragLeave);
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('drop', handleWindowDrop);
            document.body.classList.remove('is-dragging-global');
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

            const rawTimeout = uiStore.tabSleepTimeoutMinutes;
            const sleepTimeoutMinutes = (rawTimeout !== undefined && rawTimeout !== null) ? Number(rawTimeout) : 15;
            if (sleepTimeoutMinutes <= 0) return; // 0 = Never sleep

            const effectiveTimeoutMinutes = Math.max(15, sleepTimeoutMinutes);
            const suspendTimeoutMs = effectiveTimeoutMinutes * 60 * 1000;
            const AUDIO_GRACE_PERIOD_MS = 5 * 60 * 1000;
            const tabStore = useTabStore.getState();
            const splitRightTabId = uiStore.isSplitView ? uiStore.splitRightTabId : null;

            const spaceEntries = [
                ['personal', tabStore.privateTabs || []],
                ['work', tabStore.workTabs || []],
                ['ghost', tabStore.ghostTabs || []],
                ['tor', tabStore.torTabs || []],
                ...Object.entries(tabStore.customSpaceTabs || {})
            ];

            const seenIds = new Set();
            const now = Date.now();
            let suspendedCount = 0;

            spaceEntries.forEach(([spaceId, list]) => {
                (list || []).forEach(tab => {
                    if (!tab || seenIds.has(tab.id)) return;
                    seenIds.add(tab.id);

                    const isActiveTab = tab.active || (splitRightTabId && tab.id === splitRightTabId);
                    const isAudioGrace = tab.lastAudibleAt && (now - tab.lastAudibleAt < AUDIO_GRACE_PERIOD_MS);
                    const isImmune = (
                        isActiveTab ||
                        tab.suspended ||
                        tab.isAudible ||
                        tab.hasAudio ||
                        tab.isAudioPlaying ||
                        tab.mediaPlaying ||
                        isAudioGrace ||
                        tab.isPinned ||
                        tab.pinned ||
                        tab.isDownloading ||
                        !tab.url ||
                        tab.url === 'about:blank' ||
                        tab.url.startsWith('qbrowse://')
                    );

                    const lastActive = tab.lastActiveAt || tab.createdAt || now;
                    if (!isImmune && (now - lastActive >= suspendTimeoutMs)) {
                        tabStore.suspendTab(tab.id, true);
                        suspendedCount++;
                    }
                });
            });

            if (suspendedCount > 0) {
                console.log(`[MemorySaver] Suspended ${suspendedCount} inactive tabs to free RAM (timeout: ${effectiveTimeoutMinutes}m).`);
            }
        }, 10000);

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

    // Synchronize accessibility modifier classes on root document element
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('a11y-high-contrast', !!a11yHighContrast);
        root.classList.toggle('a11y-dyslexia-font', !!a11yDyslexiaFont);
        root.classList.toggle('a11y-reduced-motion', !!(a11yReducedMotion || isSystemReducedMotion));
        root.classList.toggle('a11y-focus-rings', !!a11yFocusRings);
        root.setAttribute('data-frame-curvature', frameCurvature);
        root.classList.toggle('frame-square', frameCurvature === 'square');
        root.classList.toggle('frame-cohesive', frameCurvature === 'cohesive');

        // Synchronize native Windows 11 DWM window corner preference with preset studio
        if (window.electronAPI?.setWindowCornerPreference) {
            window.electronAPI.setWindowCornerPreference(frameCurvature);
        }
    }, [a11yHighContrast, a11yDyslexiaFont, a11yReducedMotion, a11yFocusRings, isSystemReducedMotion, frameCurvature]);

    // Synchronize custom app font and typography variables
    useEffect(() => {
        applyAppFont({
            appFontType,
            appFontFamily,
            appFontGoogleFamily,
            appFontCustomName,
            appFontLetterSpacing,
            appFontSizeScale,
            appFontWeightShift,
            appFontFileData
        });
    }, [appFontType, appFontFamily, appFontGoogleFamily, appFontCustomName, appFontLetterSpacing, appFontSizeScale, appFontWeightShift, appFontFileData]);

    // Synchronize active language with document root
    useEffect(() => {
        const activeCode = resolveActiveLanguage(appLanguage);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = activeCode;
        }
    }, [appLanguage]);

    const handleBootFinish = () => {
        finishBoot();
        if (!useUIStore.getState().setupComplete) {
            useUIStore.getState().openModal('onboarding');
        } else if (!useUIStore.getState().tutorialDone) {
            useUIStore.getState().openModal('tutorial');
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetEl = e.target?.closest?.('input, textarea, [contenteditable="true"]');
        if (targetEl) {
            const type = (targetEl.getAttribute?.('type') || 'text').toLowerCase();
            if (!['checkbox', 'radio', 'range', 'button', 'submit', 'color', 'file', 'hidden'].includes(type)) {
                window.__qbrowseContextInput = targetEl;
                const x = e.clientX + 210 > window.innerWidth ? window.innerWidth - 220 : e.clientX;
                const y = e.clientY + 210 > window.innerHeight ? window.innerHeight - 220 : e.clientY;
                useUIStore.getState().setInputContextMenu({
                    openedAt: Date.now(),
                    x,
                    y,
                    isPassword: type === 'password',
                    readOnly: !!(targetEl.readOnly || targetEl.disabled),
                    hasSelection: typeof targetEl.selectionStart === 'number'
                        ? targetEl.selectionStart !== targetEl.selectionEnd
                        : !!window.getSelection?.()?.toString()
                });
                return;
            }
        }
    };

    return (
        <ContextMenuProvider>
            <div
                className={`flex h-screen w-full overflow-hidden font-sans select-none relative z-0 ${
                    sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'
                } ${
                    isBright ? 'text-zinc-900' : 'bg-[#08080a] text-white'
                } transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isFullscreen ? '!p-0 !m-0' : uiScale === 'compact' ? 'p-1.5' : 'p-3 md:p-4'
                } ${
                    frameCurvature === 'square' ? 'rounded-none !rounded-none' : ''
                }`}
                onClick={() => closeContextMenus()}
                onContextMenu={handleContextMenu}
                onDragOver={(e) => onDragOver(e, 'root')}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDropRoot(e, activeSpace)}
            >
                {/* Hardware-Optimized Live Wallpaper Engine (Zero Stacking, Live Video/GIF, Background Pausing) */}
                <WallpaperEngine />
                {/* Arc-Style Zen Fullscreen Edge Peek Hit Triggers */}
                {isFullscreen && (
                    <>
                        {sidebarPosition === 'right' ? (
                            <div 
                                id="zen-right-peek-trigger"
                                className="fixed right-0 top-0 bottom-0 w-2.5 z-[99975] pointer-events-auto bg-transparent"
                                onMouseEnter={() => useUIStore.getState().setIsSidebarPeeking(true)}
                            />
                        ) : (
                            <div 
                                id="zen-left-peek-trigger"
                                className="fixed left-0 top-0 bottom-0 w-2.5 z-[99975] pointer-events-auto bg-transparent"
                                onMouseEnter={() => useUIStore.getState().setIsSidebarPeeking(true)}
                            />
                        )}
                        <div 
                            id="zen-top-peek-trigger"
                            className={`fixed ${useUIStore.getState().settings?.topBarPosition === 'bottom' ? 'bottom-0' : 'top-0'} left-0 right-0 h-2.5 z-[99975] pointer-events-auto bg-transparent`}
                            onMouseEnter={() => useUIStore.getState().setIsTopBarPeeking(true)}
                        />
                    </>
                )}
                <Sidebar />
                <div 
                    className="flex-1 flex flex-col h-full relative z-20 min-w-0"
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
                <LanguageWarpOverlay />
                <DefaultBrowserBanner />

                {/* USER PROFILE & CLOUD SYNC POPOVER */}
                {((activePopover === 'user' || activePopover === 'userProfile') || (isPopoverClosing && (activePopover === 'user' || activePopover === 'userProfile'))) && (
                    <>
                        <div 
                            className="fixed inset-0 z-[69990] bg-transparent cursor-default select-none"
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
