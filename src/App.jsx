import React, { useEffect } from 'react';
import useUIStore from './store/useUIStore';
import useTabStore from './store/useTabStore';
import useAIStore from './store/useAIStore';
import useGlobalShortcuts from './hooks/useGlobalShortcuts';
import useDragAndDrop from './hooks/useDragAndDrop';
import { listenToEvent, windowShow } from './services/electronIPC';

import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import MainFrame from './components/layout/MainFrame';

import Omnibox from './components/features/Omnibox';
import TabMap from './components/features/TabMap';
import ToolHub from './components/features/ToolHub';

import SettingsModal from './components/modals/SettingsModal';
import HistoryModal from './components/modals/HistoryModal';
import CookiesModal from './components/modals/CookiesModal';
import OnboardingWizard from './components/modals/OnboardingWizard';
import AddPinModal from './components/modals/AddPinModal';
import Overlays from './components/common/Overlays';
import TabSwitcherOverlay from './components/common/TabSwitcherOverlay';
import ContextMenuProvider from './components/common/ContextMenuProvider';


export default function App() {
    const isForceDark = useUIStore(state => state.isForceDark);
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const accentColor = useUIStore(state => state.accentColor);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const toast = useUIStore(state => state.toast);
    const showToast = useUIStore(state => state.showToast);
    const closeContextMenus = useUIStore(state => state.closeContextMenus);
    const activeSpace = useTabStore(state => state.activeSpace);

    const { onDragOver, onDragLeave, onDropRoot } = useDragAndDrop();
    
    // Initialize global shortcuts
    useGlobalShortcuts();

    // Memory Saver Engine: Auto-suspend inactive background tabs
    useEffect(() => {
        const interval = setInterval(() => {
            const memorySaverEnabled = useUIStore.getState().settings?.memory !== false;
            if (!memorySaverEnabled) return;

            const now = Date.now();
            const maxInactiveMs = 15 * 60 * 1000; // 15 mins

            const checkAndSuspend = (tabs, setTabs) => {
                let updated = false;
                const next = tabs.map(t => {
                    if (!t.active && !t.suspended && t.url && t.url !== 'about:blank' && t.lastActiveAt && (now - t.lastActiveAt > maxInactiveMs)) {
                        updated = true;
                        return { ...t, suspended: true };
                    }
                    return t;
                });
                if (updated) {
                    setTabs(next);
                    useUIStore.getState().showToast('Memory Saver: Suspended inactive tabs');
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
            if (window.electronAPI.onTrackerBlocked) {
                window.electronAPI.onTrackerBlocked((url) => {
                    useUIStore.getState().addBlockedTracker(url);
                });
                // Initialize adblocker state in backend
                window.electronAPI.setAdblock(useUIStore.getState().isAdblockActive);
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
            }
        }
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

    useEffect(() => {
        const SUSPEND_TIMEOUT = 10 * 60 * 1000; // 10 minutes
        const interval = setInterval(() => {
            const store = useTabStore.getState();
            const allTabs = [...store.privateTabs, ...store.workTabs, ...store.ghostTabs];
            const now = Date.now();
            
            let suspendedCount = 0;
            allTabs.forEach(tab => {
                if (!tab.active && !tab.suspended && !tab.isAudible && tab.url !== '' && (now - tab.lastActiveAt > SUSPEND_TIMEOUT)) {
                    store.suspendTab(tab.id);
                    suspendedCount++;
                }
            });
            
            if (suspendedCount > 0) {
                console.log(`Suspended ${suspendedCount} inactive tabs to free memory.`);
            }
        }, 60000); // Check every minute
        
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
        } else if (!isForceDark && accentColor === '#d4bc94') {
            finalAccent = '#7a623a'; // Premium darker sand in light mode if default is untouched
        }

        const rgb = hexToRgb(finalAccent);
        if (rgb) {
            root.style.setProperty('--accent', `rgb(${rgb})`);
            root.style.setProperty('--accent-10', `rgba(${rgb}, 0.1)`);
            root.style.setProperty('--accent-20', `rgba(${rgb}, 0.2)`);
            root.style.setProperty('--accent-30', `rgba(${rgb}, 0.3)`);
            root.style.setProperty('--accent-40', `rgba(${rgb}, 0.4)`);
        }

        // Handle startup visibility via custom Rust command
        setTimeout(() => {
            windowShow().catch(console.error);
        }, 300); // Small delay to let React render first

        // Listen to global commands from Rust
        let unlistenCommand;
        listenToEvent('command_executed', (event) => {
            if (event.payload === 'close_peek') {
                useUIStore.getState().closePeek();
            }
        }).then(u => unlistenCommand = u);

        // Show onboarding if setup is incomplete
        if (!useUIStore.getState().setupComplete) {
            useUIStore.getState().openModal('onboarding');
        }

        return () => {
            if (unlistenCommand) unlistenCommand();
        };
    }, [accentColor, activeSpace, isForceDark]);

    const handleContextMenu = (e) => {
        e.preventDefault();
        useUIStore.getState().setContextMenu({ x: e.clientX, y: e.clientY });
    };

    return (
        <ContextMenuProvider>
        <div 
            className={`flex h-screen w-full overflow-hidden font-sans select-none relative z-0 transition-all duration-300 bg-[#08080a] ${isForceDark || activeSpace === 'ghost' ? 'text-white' : 'text-black'} ${isFullscreen ? 'p-0 gap-0' : uiScale === 'compact' ? `p-1.5 ${isSidebarHidden ? 'gap-0' : 'gap-2'}` : `p-3 md:p-4 ${isSidebarHidden ? 'gap-0' : 'gap-4 md:gap-6'}`}`}
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2564&auto=format&fit=crop')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            onClick={() => closeContextMenus()}
            onContextMenu={handleContextMenu}
            onDragOver={(e) => onDragOver(e, 'root')}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDropRoot(e, activeSpace)}
        >
            <Sidebar />
            <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
                <MainFrame />
            </div>

            <Omnibox />
            <TabMap />
            <ToolHub />

            <SettingsModal />
            <CookiesModal />
            <HistoryModal />
            <OnboardingWizard />
            <AddPinModal />
            
            <Overlays />
            <TabSwitcherOverlay />

            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full bg-[#121214]/90 backdrop-blur-xl border border-accent/50 text-white text-sm font-semibold shadow-[0_10px_40px_var(--accent-30)] animate-toast flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                    {toast}
                </div>
            )}
        </div>
        </ContextMenuProvider>
    );
}
