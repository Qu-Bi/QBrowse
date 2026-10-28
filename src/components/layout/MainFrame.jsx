import React, { useState, useEffect, useRef } from 'react';
import { 
    Command, Search, ChevronUp, ChevronDown, X, Moon, Sun, Trash2, 
    ShieldAlert, Download, Cpu, Pause, XCircle, FolderOpen, 
    Music, SkipBack, SkipForward, ExternalLink, Maximize, WifiOff, 
    RefreshCw, Ghost, MonitorPlay, ShieldCheck, Zap, Check, FileText, ArrowLeftRight, Globe,
    ZoomIn, RotateCcw, AlertCircle, Info, Sliders, Camera, Copy,
    Columns, Layers, Sparkles, CornerDownLeft
} from 'lucide-react';

function getToastIcon(message, isBright = false) {
    const iconClass = isBright ? "text-zinc-700 flex-shrink-0" : "text-white/80 flex-shrink-0";
    if (!message) return <Info size={13} className={iconClass} />;
    const str = String(message).toLowerCase();
    
    // Alert / Error / Warning
    if (
        str.includes('error') || 
        str.includes('fail') || 
        str.includes('cannot') || 
        str.includes('not supported') ||
        str.includes('disabled') ||
        str.includes('disconnect') ||
        str.includes('limit')
    ) {
        return <AlertCircle size={13} className={isBright ? "text-red-500 flex-shrink-0" : "text-red-400 flex-shrink-0"} />;
    }
    
    // Performance / Mode / Settings / Toggles
    if (
        str.includes('performance') || 
        str.includes('split view') || 
        str.includes('mode:') || 
        str.includes('tier') ||
        str.includes('flags') ||
        str.includes('reader')
    ) {
        return <Sliders size={13} className={iconClass} />;
    }
    
    // Success / Copied / Saved / Connected / Restored / Enabled
    if (
        str.includes('saved') || 
        str.includes('copied') || 
        str.includes('success') || 
        str.includes('connected') || 
        str.includes('restored') || 
        str.includes('enabled') || 
        str.includes('pinned') || 
        str.includes('unpinned') ||
        str.includes('freed') ||
        str.includes('cleared')
    ) {
        return <Check size={13} className={isBright ? "text-emerald-600 flex-shrink-0" : "text-emerald-400 flex-shrink-0"} />;
    }
    
    // Default Info
    return <Info size={13} className={iconClass} />;
}
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useHistoryStore from '../../store/useHistoryStore';
import { topSites } from '../../utils/topSites';
import TopBar from './TopBar';
import WebViewContainer from './WebViewContainer';
import QVaultPopover from '../popovers/QVaultPopover';
import SavePasswordBanner from '../popovers/SavePasswordBanner';
import SiteInfoPopover from '../popovers/SiteInfoPopover';
import { formatCompactNumber } from '../../utils/formatters';
import TorCircuitPopover from '../popovers/TorCircuitPopover';
import MediaPlayerPopover from '../common/MediaPlayerPopover';
import FindInPageBar from '../common/FindInPageBar';
import ScreenshotBar from '../common/ScreenshotBar';
import ReadAloudPlayer from '../common/ReadAloudPlayer';
import SnippingOverlay from '../common/SnippingOverlay';
import ReaderModeOverlay from '../features/ReaderModeOverlay';
import BrowserDialogOverlay from './BrowserDialogOverlay';
import usePopoverAnchor from '../../hooks/usePopoverAnchor';
import HomepageOmnibox from '../features/HomepageOmnibox';

const DownloadPopup = () => {
    const downloads = useUIStore(state => state.downloads);
    const activeDownloadPopup = useUIStore(state => state.activeDownloadPopup);
    const setActiveDownloadPopup = useUIStore(state => state.setActiveDownloadPopup);
    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light';

    const [popupData, setPopupData] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    const activePopupDownload = downloads.find(d => d.id === activeDownloadPopup);

    useEffect(() => {
        if (activePopupDownload) {
            setPopupData(activePopupDownload);
            setIsClosing(false);
        } else if (popupData && !isClosing) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setPopupData(null);
                setIsClosing(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [activeDownloadPopup, activePopupDownload]);

    if (!popupData) return null;

    const handleClose = (e) => {
        if (e) e.stopPropagation();
        setActiveDownloadPopup(null);
    };

    return (
        <div 
            id="download-toast-popup" 
            className={`fixed top-4 right-6 w-72 backdrop-blur-2xl rounded-2xl p-1.5 select-none outline-none z-[70000] ${
                isBright 
                    ? 'bg-white/90 border border-black/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-zinc-900' 
                    : 'bg-[#0c0c0f]/94 border border-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white/90'
            } ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
        >
            {/* Header: Section Header matching right-click menu */}
            <div className={`flex items-center justify-between px-2.5 py-1 text-xs font-semibold border-b mb-1 ${
                isBright ? 'text-zinc-500 border-black/[0.06]' : 'text-white/50 border-white/[0.06]'
            }`}>
                <div className="flex items-center gap-2 truncate">
                    {popupData.isScreenshot ? (
                        <Camera size={13} className="text-accent flex-shrink-0" />
                    ) : (
                        <Download size={13} className="text-accent flex-shrink-0" />
                    )}
                    <span className="truncate">
                        {popupData.isScreenshot 
                            ? (popupData.screenshotType ? `Screenshot (${popupData.screenshotType})` : 'Screenshot') 
                            : (popupData.state === 'completed' 
                                ? (popupData.verified ? 'Verified Download' : 'Download Complete') 
                                : popupData.state === 'failed' || popupData.state === 'interrupted'
                                    ? 'Download Failed'
                                    : 'Downloading...')}
                    </span>
                </div>
                <button 
                    onClick={handleClose} 
                    className={`p-1 rounded-lg transition cursor-pointer ${
                        isBright ? 'text-zinc-400 hover:text-zinc-900 hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <X size={12} />
                </button>
            </div>

            {/* Details row */}
            <div className={`px-2.5 py-1.5 rounded-xl transition ${
                isBright ? 'bg-black/[0.02]' : 'bg-white/[0.03]'
            }`}>
                <div className={`text-xs font-medium truncate ${isBright ? 'text-zinc-800' : 'text-white/90'}`} title={popupData.fileName}>
                    {popupData.fileName}
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                    <span>
                        {popupData.state === 'progressing' 
                            ? `${((popupData.receivedBytes || 0) / 1024 / 1024).toFixed(1)} / ${((popupData.totalBytes || 1) / 1024 / 1024).toFixed(1)} MB`
                            : (popupData.actualBytes || popupData.totalBytes) > 0
                                ? (popupData.actualBytes || popupData.totalBytes) < 1048576
                                    ? `${((popupData.actualBytes || popupData.totalBytes) / 1024).toFixed(1)} KB`
                                    : `${((popupData.actualBytes || popupData.totalBytes) / 1024 / 1024).toFixed(1)} MB`
                                : 'Saved'
                        }
                    </span>
                    {popupData.state === 'progressing' && popupData.speedBytesPerSec > 0 && (
                        <span className="text-accent font-semibold">
                            • {((popupData.speedBytesPerSec || 0) / 1024 / 1024).toFixed(1)} MB/s
                        </span>
                    )}
                    {popupData.state === 'completed' && popupData.verified && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                            • <ShieldCheck size={11} className="inline text-emerald-400" /> Verified
                        </span>
                    )}
                    {popupData.state === 'completed' && popupData.verified === false && (
                        <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                            • <AlertCircle size={11} className="inline text-amber-400" /> Unverified
                        </span>
                    )}
                    {popupData.isScreenshot && (
                        <span className="text-emerald-400/90 font-sans">• Copied to clipboard</span>
                    )}
                </div>
            </div>

            {/* Progress Bar (if progressing) */}
            {popupData.state === 'progressing' && (
                <div className={`w-full h-1 rounded-full overflow-hidden my-1.5 ${isBright ? 'bg-black/10' : 'bg-white/10'}`}>
                    <div className="h-full bg-accent transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, ((popupData.receivedBytes || 0) / (popupData.totalBytes || 1)) * 100))}%` }}></div>
                </div>
            )}

            {/* Action Buttons styled like right click menu items */}
            {popupData.state === 'completed' && (
                <div className={`flex items-center gap-1 mt-1 pt-1 border-t ${
                    isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'
                }`}>
                    <button 
                        onClick={() => window.electronAPI?.openFile?.(popupData.savePath)} 
                        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer outline-none ${
                            isBright
                                ? 'text-zinc-800 hover:text-zinc-950 hover:bg-black/5 active:bg-black/10'
                                : 'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15'
                        }`}
                    >
                        <ExternalLink size={13} className={isBright ? 'text-zinc-500' : 'text-white/50'} />
                        <span>Open</span>
                    </button>
                    <button 
                        onClick={() => window.electronAPI?.showItemInFolder?.(popupData.savePath)} 
                        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer outline-none ${
                            isBright
                                ? 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5 active:bg-black/10'
                                : 'text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15'
                        }`}
                    >
                        <FolderOpen size={13} className={isBright ? 'text-zinc-500' : 'text-white/50'} />
                        <span>Folder</span>
                    </button>
                    {popupData.checksum && (
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(popupData.checksum);
                                useUIStore.getState().showToast('SHA-256 checksum copied to clipboard');
                            }} 
                            title={`SHA-256: ${popupData.checksum}`}
                            className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer outline-none ${
                                isBright
                                    ? 'text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 active:bg-emerald-100'
                                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:bg-emerald-500/20'
                            }`}
                        >
                            <ShieldCheck size={13} className="text-emerald-400" />
                            <span>Hash</span>
                        </button>
                    )}
                    {popupData.isScreenshot && popupData.savePath && (
                        <button 
                            onClick={async () => {
                                if (window.electronAPI?.copyImageToClipboard) {
                                    await window.electronAPI.copyImageToClipboard(popupData.savePath);
                                    useUIStore.getState().showToast('Screenshot copied to clipboard');
                                }
                            }} 
                            title="Copy Image to Clipboard"
                            className={`p-1.5 rounded-xl transition cursor-pointer outline-none ${
                                isBright
                                    ? 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5 active:bg-black/10'
                                    : 'text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15'
                            }`}
                        >
                            <Copy size={13} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default function MainFrame() {
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const setIsFullscreen = useUIStore(state => state.setIsFullscreen);
    const theme = useUIStore(state => state.theme);
    const setTheme = useUIStore(state => state.setTheme);
    const isForceDark = useUIStore(state => state.isForceDark);
    const darkExclusions = useUIStore(state => state.darkExclusions);
    const setDarkExclusions = useUIStore(state => state.setDarkExclusions);
    const setIsForceDark = useUIStore(state => state.setIsForceDark);
    const toast = useUIStore(state => state.toast);
    const isToastClosing = useUIStore(state => state.isToastClosing);
    const activePopover = useUIStore(state => state.activePopover);
    const isPopoverClosing = useUIStore(state => state.isPopoverClosing);
    const closePopover = useUIStore(state => state.closePopover);
    const isSwipeEnabled = useUIStore(state => state.isSwipeEnabled);
    const zoomLevel = useUIStore(state => state.zoomLevel);
    const isZoomHUDVisible = useUIStore(state => state.isZoomHUDVisible);
    const setZoomLevel = useUIStore(state => state.setZoomLevel);
    const isSplitView = useUIStore(state => state.isSplitView);
    const splitRightTabId = useUIStore(state => state.splitRightTabId);
    const setSplitRightTabId = useUIStore(state => state.setSplitRightTabId);
    const focusedPane = useUIStore(state => state.focusedPane);
    const setFocusedPane = useUIStore(state => state.setFocusedPane);
    const splitRatio = useUIStore(state => state.splitRatio);
    const setSplitRatio = useUIStore(state => state.setSplitRatio);
    const toggleSplitView = useUIStore(state => state.toggleSplitView);
    const isRefreshing = useUIStore(state => state.isRefreshing);
    const refresh = useUIStore(state => state.refresh);
    const openOmnibox = useUIStore(state => state.openOmnibox);
    const isReducedMotion = useUIStore(state => Boolean(state.settings?.a11yReducedMotion || state.isSystemReducedMotion));

    const darkmodeAnchor = usePopoverAnchor('#tour-darkmode-trigger', 320, { defaultRight: 128 });
    const adblockAnchor = usePopoverAnchor('#tour-shield-trigger', 288, { defaultRight: 48 });
    const downloadsAnchor = usePopoverAnchor('#tour-downloads-trigger', 320, { defaultRight: 24 });

    const [localDarkExclusions, setLocalDarkExclusions] = useState(() => (darkExclusions || []).join('\n'));
    const [hoveredThemePreview, setHoveredThemePreview] = useState(null);

    useEffect(() => {
        if (activePopover === 'darkmode') {
            setLocalDarkExclusions((darkExclusions || []).join('\n'));
        }
    }, [activePopover]);
    const peekWindow = useUIStore(state => state.peekWindow);
    const setPeekWindow = useUIStore(state => state.setPeekWindow);
    const isPeekClosing = useUIStore(state => state.isPeekClosing);
    const closePeek = useUIStore(state => state.closePeek);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];

    const isIncognito = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const isBright = theme === 'light' && !isIncognito && !isTor;

    const getEffectiveLeftTab = (tabs) => {
        if (isSplitView && splitRightTabId) {
            return tabs.find(t => t.active && t.id !== splitRightTabId) || tabs.find(t => t.id !== splitRightTabId);
        }
        return tabs.find(t => t.active) || tabs[0];
    };

    const effPrivateTab = getEffectiveLeftTab(privateTabs);
    const effWorkTab = getEffectiveLeftTab(workTabs);
    const effGhostTab = getEffectiveLeftTab(ghostTabs);
    const effTorTab = getEffectiveLeftTab(torTabs);

    const isPrywatneEmpty = !effPrivateTab || effPrivateTab.url === '' || effPrivateTab.url === 'about:blank';
    const isPracaEmpty = !effWorkTab || effWorkTab.url === '' || effWorkTab.url === 'about:blank';
    const isGhostEmpty = !effGhostTab || effGhostTab.url === '' || effGhostTab.url === 'about:blank';
    const isTorEmpty = !effTorTab || effTorTab.url === '' || effTorTab.url === 'about:blank';
    
    const isAdblockActive = useUIStore(state => state.isAdblockActive);
    const setIsAdblockActive = useUIStore(state => state.setIsAdblockActive);
    const adblockStats = useUIStore(state => state.adblockStats);
    const accentColor = useUIStore(state => state.accentColor);
    const uiScale = useUIStore(state => state.settings?.uiScale);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Mock states for UI
    const [formEmail, setFormEmail] = useState('admin@qbrowse.local');
    const [formPassword, setFormPassword] = useState('super_secret_password_123');
    const [zenDropdownOpenBySpace, setZenDropdownOpenBySpace] = useState({});

    const renderZenDashboard = (spaceName) => {
        const isDark = spaceName === 'ghost' || spaceName === 'tor' ? true : !isBright;
        const isSpaceTor = spaceName === 'tor';
        const isSpaceBright = spaceName === 'ghost' || spaceName === 'tor' ? false : isBright;
        const isActiveSpace = activeSpace === spaceName;
        const isZenDropdownOpen = Boolean(zenDropdownOpenBySpace[spaceName]);

        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center overflow-visible animate-pop-in z-10 w-full h-full">
                <div 
                    className="relative z-10 flex flex-col items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] origin-center w-full mt-[-10vh]"
                    style={{ transform: `translateY(${isZenDropdownOpen ? '-10vh' : '0px'}) scale(${zoomLevel / 100})` }}
                >
                    <div className={`flex flex-col items-center px-4 w-full text-center transition-[margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isZenDropdownOpen ? 'mb-6 md:mb-8' : 'mb-10 md:mb-14'
                    }`}>
                        <span className={`text-sm font-bold uppercase tracking-[0.4em] mb-4 drop-shadow-sm transition-colors duration-500 ${isSpaceTor ? 'text-purple-300/60' : (isDark ? 'text-white/50' : 'text-zinc-700 font-bold')}`}>{dateString}</span>
                        <h1 className={`text-[5rem] md:text-[8rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${isSpaceTor ? 'from-purple-200 via-purple-300/80 to-purple-500/20' : (isDark ? 'from-white via-white/90 to-white/20' : 'from-zinc-900 via-zinc-800 to-zinc-700')} select-none transition-colors duration-500 px-4`} style={{ textShadow: isSpaceTor ? '0 20px 50px rgba(168,85,247,0.3)' : (isDark ? '0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.05)') }}>
                            {timeString}
                        </h1>
                    </div>

                    <HomepageOmnibox 
                        isTor={isSpaceTor} 
                        isDark={isDark} 
                        isBright={isSpaceBright} 
                        isActiveSpace={isActiveSpace}
                        onDropdownOpenChange={(isOpen) => {
                            setZenDropdownOpenBySpace(prev => {
                                if (Boolean(prev[spaceName]) === Boolean(isOpen)) return prev;
                                return { ...prev, [spaceName]: Boolean(isOpen) };
                            });
                        }}
                    />
                </div>
            </div>
        );
    };

    const [splitSearchUrl, setSplitSearchUrl] = useState('');
    const [splitLiveSuggestions, setSplitLiveSuggestions] = useState([]);
    const [splitSelectedSuggestion, setSplitSelectedSuggestion] = useState(-1);
    const splitSuggestDebounceRef = useRef(null);
    const historyStoreData = useHistoryStore(state => state.history) || [];

    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    const mainContainerRef = useRef(null);
    const leftPaneRef = useRef(null);
    const rightPaneRef = useRef(null);
    const currentRatioRef = useRef(splitRatio);

    const spaceTabs = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs));
    const activeLeftTab = isSplitView && splitRightTabId
        ? (spaceTabs.find(t => t.active && t.id !== splitRightTabId) || spaceTabs.find(t => t.id !== splitRightTabId) || spaceTabs[0])
        : (spaceTabs.find(t => t.active) || spaceTabs[0]);
    const rightTab = isSplitView && splitRightTabId ? spaceTabs.find(t => t.id === splitRightTabId) : null;
    const availableRightTabs = spaceTabs.filter(t => t.id !== activeLeftTab?.id);

    // Live search & autocomplete for split screen input
    useEffect(() => {
        setSplitSelectedSuggestion(-1);
        const q = splitSearchUrl.trim();
        if (!q) {
            setSplitLiveSuggestions([]);
            return;
        }

        const lowerQ = q.toLowerCase();
        const siteMatches = topSites
            .filter(site => site.toLowerCase().includes(lowerQ))
            .slice(0, 3)
            .map(site => ({
                title: site,
                url: site.startsWith('http') ? site : `https://${site}`,
                isSite: true
            }));

        const historyMatches = (isTor || isIncognito) ? [] : historyStoreData
            .filter(h => (h.title && h.title.toLowerCase().includes(lowerQ)) || (h.url && h.url.toLowerCase().includes(lowerQ)))
            .slice(0, 3)
            .map(h => ({
                title: h.title || h.url,
                url: h.url,
                isHistory: true
            }));

        const localItems = [...siteMatches, ...historyMatches];

        let activeCallback = null;
        let activeScript = null;

        if (splitSuggestDebounceRef.current) clearTimeout(splitSuggestDebounceRef.current);
        splitSuggestDebounceRef.current = setTimeout(() => {
            if (/^(https?:\/\/|file:\/\/|qbrowse:\/\/|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$)/i.test(q) || q.length > 150) {
                setSplitLiveSuggestions(localItems);
                return;
            }

            const callbackName = 'splitSuggestCb_' + Math.round(100000 * Math.random());
            activeCallback = callbackName;
            window[callbackName] = (data) => {
                try {
                    if (data && data[1]) {
                        const searchItems = data[1].slice(0, 6).map(s => ({
                            title: s,
                            url: `https://www.google.com/search?q=${encodeURIComponent(s)}`,
                            isSearch: true
                        }));
                        const combined = [...localItems];
                        searchItems.forEach(item => {
                            if (!combined.some(c => c.title.toLowerCase() === item.title.toLowerCase())) {
                                combined.push(item);
                            }
                        });
                        setSplitLiveSuggestions(combined);
                    } else {
                        setSplitLiveSuggestions(localItems);
                    }
                } catch (err) {
                    console.warn('Error processing split suggestions:', err);
                } finally {
                    try { delete window[callbackName]; } catch (_) {}
                    const scriptEl = document.getElementById(callbackName);
                    if (scriptEl && scriptEl.parentNode) scriptEl.remove();
                }
            };

            const script = document.createElement('script');
            script.id = callbackName;
            script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}&callback=${callbackName}`;
            script.onerror = () => {
                try { delete window[callbackName]; } catch (_) {}
                if (script.parentNode) script.remove();
            };
            activeScript = script;
            document.body.appendChild(script);
        }, 120);

        return () => {
            if (splitSuggestDebounceRef.current) clearTimeout(splitSuggestDebounceRef.current);
            if (activeCallback) {
                window[activeCallback] = () => {
                    try { delete window[activeCallback]; } catch (_) {}
                };
                setTimeout(() => {
                    try { delete window[activeCallback]; } catch (_) {}
                }, 10000);
            }
            if (activeScript && activeScript.parentNode) {
                activeScript.remove();
            }
        };
    }, [splitSearchUrl, isTor, isIncognito]);

    const handleSplitKeyDown = (e) => {
        if (!splitLiveSuggestions.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSplitSelectedSuggestion(prev => (prev + 1) % splitLiveSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSplitSelectedSuggestion(prev => (prev - 1 + splitLiveSuggestions.length) % splitLiveSuggestions.length);
        } else if (e.key === 'Escape') {
            setSplitLiveSuggestions([]);
        } else if (e.key === 'Enter') {
            if (splitSelectedSuggestion >= 0 && splitSelectedSuggestion < splitLiveSuggestions.length) {
                e.preventDefault();
                const chosen = splitLiveSuggestions[splitSelectedSuggestion];
                handleOpenSplitUrl(chosen.url || chosen.title);
            }
        }
    };

    const handleSplitMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingSplit(true);
    };

    useEffect(() => {
        if (!isDraggingSplit) return;
        let animationFrameId = null;

        const handleMouseMove = (e) => {
            if (!mainContainerRef.current) return;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                const rect = mainContainerRef.current.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const newRatio = Math.min(80, Math.max(20, (offsetX / rect.width) * 100));
                
                currentRatioRef.current = newRatio;
                if (leftPaneRef.current) leftPaneRef.current.style.width = `${newRatio}%`;
                if (rightPaneRef.current) rightPaneRef.current.style.width = `${100 - newRatio}%`;
            });
        };

        const handleMouseUp = () => {
            setIsDraggingSplit(false);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (currentRatioRef.current !== null) {
                setSplitRatio(currentRatioRef.current);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isDraggingSplit, setSplitRatio]);

    const handleSwapPanes = (e) => {
        if (e) e.stopPropagation();
        if (!isSplitView || !activeLeftTab) return;
        if (rightTab) {
            const oldLeftId = activeLeftTab.id;
            const oldRightId = rightTab.id;
            useTabStore.getState().handleSwitchToTab(oldRightId, activeSpace);
            setSplitRightTabId(oldLeftId);
        }
    };

    const handleOpenSplitUrl = (eOrUrl) => {
        if (eOrUrl && typeof eOrUrl.preventDefault === 'function') {
            eOrUrl.preventDefault();
        }
        const raw = (typeof eOrUrl === 'string' ? eOrUrl : splitSearchUrl).trim();
        if (!raw) return;
        let url = raw;
        if (!url.includes('://') && !url.startsWith('about:')) {
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        const newTab = useTabStore.getState().addTab({
            id: 't-' + Date.now(),
            title: url.replace(/^https?:\/\//, ''),
            url,
            active: false,
            folderId: null
        });
        setSplitRightTabId(newTab.id);
        setFocusedPane('right');
        setSplitSearchUrl('');
        setSplitLiveSuggestions([]);
    };

    return (
        <main 
            id="qbrowse-main-frame"
            className="flex-1 min-w-0 relative z-20 flex flex-col"
        >
            
            <TopBar />


            {(activePopover === 'siteinfo' || (isPopoverClosing && activePopover === 'siteinfo')) && (
                <SiteInfoPopover isClosing={isPopoverClosing} />
            )}

            {(activePopover === 'darkmode' || (isPopoverClosing && activePopover === 'darkmode')) && (
                <div 
                    id="popover-darkmode-container"
                    onClick={e => e.stopPropagation()} 
                    style={darkmodeAnchor.style}
                    className={`absolute z-[60] w-80 backdrop-blur-3xl rounded-2xl overflow-hidden flex flex-col transition-all border ${
                        isBright 
                            ? 'bg-white/60 border-black/[0.08] text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.10)]' 
                            : 'bg-[#0c0d14]/85 border-white/[0.08] text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]'
                    } ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                >
                    {/* Section 1: Browser Appearance Theme */}
                    <div className={`p-4 border-b ${isBright ? 'border-black/5 bg-zinc-50/50' : 'border-white/[0.05] bg-white/[0.02]'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 block ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                            Browser Appearance
                        </span>
                        <div 
                            onMouseLeave={() => setHoveredThemePreview(null)}
                            className={`relative flex p-1 rounded-full border shadow-xs backdrop-blur-2xl select-none ${
                            isBright 
                                ? 'bg-black/[0.03] border-black/[0.05]' 
                                : 'bg-[#0c0d14]/78 border-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                        }`}>
                            {/* Hover Preview Pill */}
                            {hoveredThemePreview && hoveredThemePreview !== theme && (
                                <div
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-200 pointer-events-none ${
                                        isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                                    }`}
                                    style={{
                                        transform: hoveredThemePreview === 'light' ? 'translateX(100%)' : 'translateX(0)',
                                    }}
                                />
                            )}
                            {/* Sliding Pill Indicator */}
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    isBright
                                        ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                        : 'border'
                                }`}
                                style={{ 
                                    transform: theme === 'light' ? 'translateX(100%)' : 'translateX(0)',
                                    ...(!isBright ? {
                                        borderColor: 'var(--accent-30, rgba(212, 188, 148, 0.4))',
                                        backgroundColor: 'var(--accent-15, rgba(212, 188, 148, 0.16))',
                                        boxShadow: '0 2px 10px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                                    } : {})
                                }}
                            />
                            <button
                                type="button"
                                onMouseEnter={() => setHoveredThemePreview('dark')}
                                onClick={() => setTheme('dark')}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
                                    theme === 'dark'
                                        ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                        : (isBright ? 'text-zinc-600 hover:text-black' : 'text-white/60 hover:text-white')
                                }`}
                            >
                                <Moon size={14} className={theme === 'dark' ? 'fill-current' : ''} />
                                <span>Dark</span>
                            </button>
                            <button
                                type="button"
                                onMouseEnter={() => setHoveredThemePreview('light')}
                                onClick={() => setTheme('light')}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
                                    theme === 'light'
                                        ? (isBright ? 'text-zinc-900 font-bold' : 'text-accent font-bold')
                                        : (isBright ? 'text-zinc-600 hover:text-black' : 'text-white/60 hover:text-white')
                                }`}
                            >
                                <Sun size={14} className={theme === 'light' ? 'text-amber-600 fill-amber-500/20' : ''} />
                                <span>Bright</span>
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Smart Dark Mode for Websites */}
                    <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold">Web Smart Dark</span>
                                <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Invert light webpages only</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsForceDark(!isForceDark)} 
                                className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-200 cursor-pointer ${
                                    isForceDark ? 'bg-accent shadow-[0_0_8px_var(--accent)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                }`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${isForceDark ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                Excluded Domains (One per line)
                            </span>
                            <textarea 
                                className={`w-full h-24 rounded-xl p-2.5 text-xs font-mono resize-none outline-none transition-colors border ${
                                    isBright
                                        ? 'bg-zinc-50 border-black/10 text-zinc-800 placeholder-zinc-400 focus:border-accent'
                                        : 'bg-white/[0.04] border-white/[0.08] text-white/90 placeholder-white/30 focus:border-accent/60'
                                }`}
                                value={localDarkExclusions}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalDarkExclusions(val);
                                    const newExclusions = val.split('\n').map(d => d.trim()).filter(Boolean);
                                    setDarkExclusions(newExclusions);
                                }}
                                onBlur={() => {
                                    const cleaned = (localDarkExclusions || '').split('\n').map(d => d.trim()).filter(Boolean);
                                    setDarkExclusions(cleaned);
                                    setLocalDarkExclusions(cleaned.join('\n'));
                                }}
                                placeholder="youtube.com&#10;github.com"
                            />
                        </div>
                    </div>
                </div>
            )}

            {(activePopover === 'adblock' || (isPopoverClosing && activePopover === 'adblock')) && (
                <div 
                    id="popover-adblock-container"
                    onClick={e => e.stopPropagation()} 
                    style={adblockAnchor.style}
                    className={`absolute z-[60] w-72 backdrop-blur-3xl rounded-2xl overflow-hidden flex flex-col border ${
                        isBright 
                            ? 'bg-white/60 border-black/[0.08] text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.10)]' 
                            : 'bg-[#0c0d14]/78 border-white/[0.08] text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]'
                    } ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                >
                    <div className={`p-5 flex flex-col items-center justify-center border-b transition-colors duration-500 ${
                        isBright
                            ? (isAdblockActive ? 'bg-emerald-500/10 border-black/5' : 'bg-black/[0.02] border-black/5')
                            : (isAdblockActive ? 'bg-green-500/10 border-white/[0.05]' : 'bg-white/[0.02] border-white/[0.05]')
                    }`}>
                        <ShieldAlert size={40} className={`mb-2 drop-shadow-md transition-colors ${isAdblockActive ? (isBright ? 'text-emerald-600' : 'text-green-400') : (isBright ? 'text-zinc-300' : 'text-white/20')}`} strokeWidth={1.5} />
                        <span 
                            title={isAdblockActive ? `${Number(adblockStats.count || 0).toLocaleString()} blocked trackers` : 'Adblock inactive'}
                            className={`text-3xl font-black tracking-tight ${isAdblockActive ? (isBright ? 'text-zinc-900' : 'text-white') : (isBright ? 'text-zinc-400' : 'text-white/40')}`}
                        >
                            {isAdblockActive ? formatCompactNumber(adblockStats.count) : '0'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Blocked Trackers</span>
                    </div>
                    <div className="p-4 bg-transparent flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold ${isBright ? 'text-zinc-800' : 'text-white/90'}`}>Native Interceptor</span>
                            <button onClick={() => setIsAdblockActive(!isAdblockActive)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 cursor-pointer ${isAdblockActive ? 'bg-green-500' : (isBright ? 'bg-zinc-300' : 'bg-white/20')}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isAdblockActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                        <div className={`flex flex-col gap-1.5 text-[10px] font-mono transition-opacity duration-300 rounded-xl p-2.5 border ${
                            isBright 
                                ? 'bg-black/[0.02] border-black/5 text-zinc-700' 
                                : 'bg-white/[0.03] border-white/[0.06] text-white/80'
                        } ${isAdblockActive ? 'opacity-100' : 'opacity-30'}`}>
                            {adblockStats.domains.length === 0 && <div className={`text-center py-2 ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>No trackers blocked yet</div>}
                            {adblockStats.domains.map((domain, i) => (
                                <div key={i} className="flex justify-between"><span className="truncate mr-2">{domain}</span><span className="text-red-500 flex-shrink-0 font-semibold">Blocked</span></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(activePopover === 'media' || (isPopoverClosing && activePopover === 'media')) && (
                <MediaPlayerPopover />
            )}

            {(activePopover === 'downloads' || (isPopoverClosing && activePopover === 'downloads')) && (
                <div 
                    onClick={e => e.stopPropagation()} 
                    style={downloadsAnchor.style}
                    className={`absolute z-[60] w-80 backdrop-blur-3xl rounded-2xl overflow-hidden flex flex-col border ${
                        isBright 
                            ? 'bg-white/60 border-black/[0.08] text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.10)]' 
                            : 'bg-[#0c0d14]/78 border-white/[0.08] text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]'
                    } ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                >
                    <div className={`p-4 border-b flex items-center justify-between ${isBright ? 'border-black/5 bg-zinc-50/50' : 'border-white/[0.05] bg-white/[0.02]'}`}>
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Download size={16} className="text-accent" /> Downloads
                        </div>
                        <button className={`transition text-xs font-medium ${isBright ? 'text-zinc-400 hover:text-black' : 'text-white/40 hover:text-white'}`}>Clear All</button>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        <div className={`p-3 border rounded-xl flex flex-col gap-2 relative overflow-hidden group transition ${
                            isBright ? 'bg-black/[0.02] hover:bg-black/[0.04] border-black/5' : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]'
                        }`}>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 flex-shrink-0 shadow-inner"><Cpu size={14} /></div>
                                    <div className="flex flex-col truncate">
                                        <span className={`text-sm font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white/90'}`}>ubuntu-24.04-desktop.iso</span>
                                        <span className={`text-[10px] font-mono mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>1.2 GB / 4.5 GB • 12 MB/s</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className={`p-1 rounded-lg transition ${isBright ? 'text-zinc-400 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/10'}`} title="Pause"><Pause size={14} /></button>
                                    <button className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Cancel"><XCircle size={14} /></button>
                                </div>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 relative z-10 border ${isBright ? 'bg-black/10 border-black/5' : 'bg-black/40 border-white/5'}`}>
                                <div className="h-full bg-accent w-[35%] rounded-full relative">
                                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className={`p-3 border rounded-xl flex items-center justify-between transition group cursor-pointer mt-1 ${
                            isBright ? 'hover:bg-black/[0.03] border-transparent' : 'hover:bg-white/[0.04] border-transparent'
                        }`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500 flex-shrink-0 shadow-inner"><FolderOpen size={14} /></div>
                                <div className="flex flex-col truncate">
                                    <span className={`text-sm font-medium truncate ${isBright ? 'text-zinc-800 group-hover:text-black' : 'text-white/80 group-hover:text-white'}`}>Q4_Financial_Report.pdf</span>
                                    <span className="text-[10px] text-green-500 font-mono mt-0.5">Completed • 2.4 MB</span>
                                </div>
                            </div>
                            <button className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm ${isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 text-white/60'}`} title="Show in folder">
                                <FolderOpen size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SavePasswordBanner />
            {(activePopover === 'vault' || (isPopoverClosing && activePopover === 'vault')) && (
                <QVaultPopover isClosing={isPopoverClosing} />
            )}
            {(activePopover === 'tor' || (isPopoverClosing && activePopover === 'tor')) && (
                <TorCircuitPopover isClosing={isPopoverClosing} />
            )}
            {((activePopover && activePopover !== 'user' && activePopover !== 'userProfile') || (isPopoverClosing && activePopover !== 'user' && activePopover !== 'userProfile')) && (
                <div className="absolute inset-0 z-[50] bg-transparent" onClick={closePopover} />
            )}

            {(() => {
                const isZenActive = (isPrywatneEmpty && activeSpace === 'personal') || 
                                    (isPracaEmpty && activeSpace === 'work') || 
                                    (isGhostEmpty && activeSpace === 'ghost') ||
                                    (isTorEmpty && activeSpace === 'tor');
                return (
                    <div 
                        ref={mainContainerRef} 
                        className={`flex-1 min-w-0 relative transition-[color] duration-250 ease-out flex ${isBright ? 'text-zinc-900' : 'text-white'} pt-0`}
                    >
                        <div 
                            className={`relative w-full h-full overflow-hidden transition-[border-radius,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex ${
                                isFullscreen 
                                    ? 'is-fullscreen-frame rounded-none border-transparent shadow-none !border-0 !shadow-none' 
                                    : uiScale === 'compact'
                                    ? `rounded-[1.25rem] ${isBright ? 'liquid-glass-bright' : 'liquid-glass-dark'}`
                                    : `rounded-[2rem] ${isBright ? 'liquid-glass-bright' : 'liquid-glass-dark'}`
                            }`}
                        >
                    <DownloadPopup />
                    <FindInPageBar />
                    <ScreenshotBar />
                    <ReadAloudPlayer />
                    <SnippingOverlay />
                    <ReaderModeOverlay />
                    <BrowserDialogOverlay />

                    {/* LEFT PANE CONTAINER */}
                    <div 
                        ref={leftPaneRef}
                        onClick={() => setFocusedPane('left')}
                        className={`relative h-full overflow-hidden ${
                            isDraggingSplit ? 'pointer-events-none select-none' : (isReducedMotion ? 'transition-none' : 'transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]')
                        }`}
                        style={{ width: isSplitView ? `${splitRatio}%` : '100%', contain: 'layout paint' }}
                    >
                        <div className={`absolute inset-y-0 left-0 w-[400%] flex ${isReducedMotion || isSwipeEnabled === false ? 'transition-none' : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
                            style={{ transform: activeSpace === 'personal' ? 'translateX(0)' : activeSpace === 'work' ? 'translateX(-25%)' : activeSpace === 'ghost' ? 'translateX(-50%)' : 'translateX(-75%)' }}>

                            {/* PERSONAL */}
                            <div className="w-1/4 flex-shrink-0 h-full flex flex-col items-center justify-center relative">
                                {isPrywatneEmpty && <div key="dash" className="absolute inset-0 z-10 pointer-events-auto">{renderZenDashboard('personal')}</div>}
                                <div key="bg" className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${!isBright ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px', opacity: isPrywatneEmpty ? 1 : 0.2 }}></div>
                                <div key="wv" className={`absolute inset-0 ${isReducedMotion ? 'transition-none' : 'transition-opacity duration-300'} ${isPrywatneEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <WebViewContainer space="personal" />
                                </div>
                            </div>

                            {/* WORK */}
                            <div className={`w-1/4 flex-shrink-0 h-full flex flex-col items-center justify-center relative ${!isBright ? 'text-white' : 'text-zinc-900'}`}>
                                {isPracaEmpty && <div key="dash" className="absolute inset-0 z-10 pointer-events-auto">{renderZenDashboard('work')}</div>}
                                <div key="bg" className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${!isBright ? 'opacity-20 invert' : ''}`} style={{ backgroundSize: '24px 24px', opacity: isPracaEmpty ? 1 : 0.2 }}></div>
                                <div key="wv" className={`absolute inset-0 ${isReducedMotion ? 'transition-none' : 'transition-opacity duration-300'} ${isPracaEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <WebViewContainer space="work" />
                                </div>
                            </div>

                            {/* GHOST */}
                            <div className="w-1/4 flex-shrink-0 h-full flex flex-col items-center justify-center relative text-white">
                                {isGhostEmpty && <div key="dash" className="absolute inset-0 z-10 pointer-events-auto">{renderZenDashboard('ghost')}</div>}
                                <div key="bg" className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 opacity-20 invert" style={{ backgroundSize: '24px 24px', opacity: isGhostEmpty ? 1 : 0.2 }}></div>
                                <div key="wv" className={`absolute inset-0 ${isReducedMotion ? 'transition-none' : 'transition-opacity duration-300'} ${isGhostEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <WebViewContainer space="ghost" />
                                </div>
                            </div>

                            {/* TOR ONION */}
                            <div className="w-1/4 flex-shrink-0 h-full flex flex-col items-center justify-center relative text-white">
                                {isTorEmpty && <div key="dash" className="absolute inset-0 z-10 pointer-events-auto">{renderZenDashboard('tor')}</div>}
                                <div key="bg" className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08)_1px,transparent_1px)] pointer-events-none z-0 opacity-30 invert" style={{ backgroundSize: '24px 24px', opacity: isTorEmpty ? 1 : 0.2 }}></div>
                                <div key="wv" className={`absolute inset-0 ${isReducedMotion ? 'transition-none' : 'transition-opacity duration-300'} ${isTorEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <WebViewContainer space="tor" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FULLSCREEN MOUSE TRAP OVERLAY DURING DRAGGING */}
                    {isDraggingSplit && (
                        <div className="fixed inset-0 z-[99999] cursor-col-resize select-none bg-transparent" />
                    )}

                    {/* RESIZABLE SPLITTER HANDLE (Zero-width floating hairline) */}
                    {isSplitView && (
                        <div 
                            onMouseDown={handleSplitMouseDown}
                            className="relative w-0 h-full z-40 flex items-center justify-center cursor-col-resize group shrink-0"
                            title="Drag to resize split panes"
                        >
                            {/* Sleek 1px Hairline */}
                            <div className={`absolute top-0 bottom-0 w-[1px] pointer-events-none transition-all duration-200 ${
                                isDraggingSplit 
                                    ? 'bg-accent shadow-[0_0_12px_var(--accent)]' 
                                    : (!isBright ? 'bg-white/[0.08] group-hover:bg-accent/60' : 'bg-black/[0.08] group-hover:bg-accent/60')
                            }`} />

                            {/* Floating Grab Pill Handle */}
                            <div className={`absolute w-4 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-col-resize shadow-md ${
                                isDraggingSplit 
                                    ? 'bg-accent border border-accent text-zinc-950 scale-110 shadow-[0_0_20px_var(--accent)]' 
                                    : (isBright
                                        ? 'liquid-pill-bright hover:scale-105 border-black/10'
                                        : 'liquid-pill-dark hover:scale-105 border-white/15')
                            }`}>
                                <div className="flex flex-col gap-0.5 items-center pointer-events-none">
                                    <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                                    <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                                    <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RIGHT PANE CONTAINER */}
                    <div 
                        id="tour-splitview-rightpane"
                        ref={rightPaneRef}
                        onClick={() => setFocusedPane('right')}
                        className={`relative h-full overflow-hidden flex flex-col bg-transparent ${
                            isDraggingSplit 
                                ? 'pointer-events-none select-none' 
                                : (isReducedMotion ? 'transition-none' : 'transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]')
                        } ${isSplitView ? 'opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
                        style={{ width: isSplitView ? `${100 - splitRatio}%` : '0%', contain: 'layout paint' }}
                    >
                            {rightTab ? (
                                <div className="relative w-full h-full flex flex-col">
                                    {/* Right Pane Overlay Controls */}
                                    <div className={`h-10 border-b px-3.5 flex items-center justify-between text-xs z-30 shrink-0 backdrop-blur-2xl transition-colors ${
                                        isBright 
                                            ? 'bg-white/70 border-black/[0.08] text-zinc-900 shadow-xs' 
                                            : 'bg-[#0c0d16]/80 border-white/[0.08] text-white shadow-xs'
                                    }`}>
                                        <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                                            <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                                                {rightTab.url ? (
                                                    <img 
                                                        src={`https://www.google.com/s2/favicons?sz=32&domain=${rightTab.url}`} 
                                                        className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                                                        onError={e=>e.target.style.display='none'} 
                                                    />
                                                ) : (
                                                    <Globe size={11} className={isBright ? 'text-zinc-500' : 'text-white/50'} />
                                                )}
                                            </div>
                                            <span className="font-semibold truncate text-xs">{rightTab.title}</span>
                                            {rightTab.url && (
                                                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/50 truncate max-w-[140px]">
                                                    {rightTab.url.replace(/^https?:\/\//, '').split('/')[0]}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={handleSwapPanes} 
                                                className={`w-7 h-7 rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition active:scale-95 cursor-pointer flex items-center justify-center ${
                                                    isBright ? 'border-black/[0.08] bg-black/[0.03] text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06]' : ''
                                                }`} 
                                                title="Swap Left/Right Panes"
                                            >
                                                <ArrowLeftRight size={12} />
                                            </button>
                                            <button 
                                                onClick={() => setSplitRightTabId(null)} 
                                                className={`w-7 h-7 rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition active:scale-95 cursor-pointer flex items-center justify-center ${
                                                    isBright ? 'border-black/[0.08] bg-black/[0.03] text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06]' : ''
                                                }`} 
                                                title="Change Right Tab"
                                            >
                                                <Search size={12} />
                                            </button>
                                            <button 
                                                onClick={() => toggleSplitView()} 
                                                className={`w-7 h-7 rounded-full border border-white/[0.08] hover:border-rose-500/30 bg-white/[0.04] hover:bg-rose-500/15 text-white/70 hover:text-rose-300 transition active:scale-95 cursor-pointer flex items-center justify-center ${
                                                    isBright ? 'border-black/[0.08] bg-black/[0.03] text-zinc-700 hover:text-rose-600 hover:bg-rose-500/10' : ''
                                                }`} 
                                                title="Close Split View"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Pane Webview */}
                                    <div className="relative flex-1 w-full h-full">
                                        <WebViewContainer space={activeSpace} targetTabId={splitRightTabId} isSplitPane={true} />
                                    </div>
                                </div>
                            ) : (
                                /* Split Screen Launcher / Picker */
                                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden z-10 w-full h-full pointer-events-auto">
                                    <div 
                                        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] pointer-events-none z-0 ${!isBright ? 'opacity-20 invert' : ''}`} 
                                        style={{ backgroundSize: '24px 24px' }}
                                    />
                                    
                                    <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 mt-[-10vh]" style={{ transform: `scale(${zoomLevel / 100})` }}>
                                        {/* Header Block matching Zen Dashboard clock header height exactly */}
                                        <div className="flex flex-col items-center mb-10 md:mb-14 px-4 w-full text-center select-none">
                                            <span className={`text-sm font-bold uppercase tracking-[0.4em] mb-4 drop-shadow-sm transition-colors duration-500 ${
                                                isTor ? 'text-purple-300/60' : (!isBright ? 'text-white/50' : 'text-zinc-700 font-bold')
                                            }`}>
                                                DUAL WORKSPACE
                                            </span>
                                            <div className="h-[5rem] md:h-[8rem] flex flex-col items-center justify-center">
                                                <h2 className={`text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b leading-tight ${
                                                    isTor 
                                                        ? 'from-purple-200 via-purple-300/80 to-purple-500/20' 
                                                        : (!isBright 
                                                            ? 'from-white via-white/90 to-white/20' 
                                                            : 'from-zinc-900 via-zinc-800 to-zinc-700')
                                                }`} style={{ textShadow: !isBright ? '0 10px 30px rgba(0,0,0,0.4)' : 'none' }}>
                                                    Split Screen
                                                </h2>
                                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-white/45'} mt-2 max-w-xs font-normal leading-relaxed`}>
                                                    Search the web or choose an open tab to browse side-by-side
                                                </p>
                                            </div>
                                        </div>

                                        {/* URL Input Form - clean sleek liquid pill */}
                                        <form onSubmit={handleOpenSplitUrl} className="w-full relative z-50">
                                            <div className="relative w-full">
                                                <input 
                                                    type="text"
                                                    placeholder="Search or enter URL for Right Pane..."
                                                    value={splitSearchUrl}
                                                    onChange={e => setSplitSearchUrl(e.target.value)}
                                                    onKeyDown={handleSplitKeyDown}
                                                    className={`w-full h-11 pl-4 pr-11 rounded-full text-xs outline-none transition-all duration-200 ${
                                                        isBright 
                                                            ? 'liquid-pill-bright focus:border-accent/60 placeholder-zinc-500 text-zinc-900' 
                                                            : 'liquid-pill-dark focus:border-accent/60 placeholder-white/40 text-white'
                                                    }`}
                                                />
                                                <button 
                                                    type="submit" 
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent text-zinc-950 font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center"
                                                    title="Open in Right Pane (Enter)"
                                                >
                                                    <Search size={13} />
                                                </button>
                                            </div>

                                            {/* Live Autocomplete Dropdown (Liquid glass matching Context Menu) */}
                                            {splitLiveSuggestions.length > 0 && (
                                                <div 
                                                    style={{ backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)' }}
                                                    className={`absolute top-full left-0 right-0 mt-2 p-1.5 rounded-2xl border backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.55)] z-[100] max-h-60 overflow-y-auto hide-scroll text-left animate-pop-in ${
                                                        isBright 
                                                            ? 'bg-white/90 border-black/[0.06] text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)]' 
                                                            : 'bg-[#181a24]/75 border-white/[0.08] text-white/90'
                                                    }`}
                                                >
                                                    {splitLiveSuggestions.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleOpenSplitUrl(item.url || item.title)}
                                                            onMouseEnter={() => setSplitSelectedSuggestion(idx)}
                                                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 outline-none ${
                                                                splitSelectedSuggestion === idx
                                                                    ? (isBright ? 'bg-black/5 text-accent font-semibold' : 'bg-white/10 text-accent font-semibold')
                                                                    : (isBright ? 'hover:bg-black/5 text-zinc-700' : 'hover:bg-white/[0.06] text-white/80 hover:text-white')
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 truncate min-w-0">
                                                                {item.isSite || item.isHistory ? (
                                                                    <Globe size={14} className={`shrink-0 ${splitSelectedSuggestion === idx ? 'text-accent' : (isBright ? 'text-zinc-400' : 'text-white/40')}`} />
                                                                ) : (
                                                                    <Search size={14} className={`shrink-0 ${splitSelectedSuggestion === idx ? 'text-accent' : (isBright ? 'text-zinc-400' : 'text-white/40')}`} />
                                                                )}
                                                                <span className="truncate">{item.title}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-mono ml-2 shrink-0 ${
                                                                isBright ? 'text-zinc-400' : 'text-white/35 font-mono'
                                                            }`}>
                                                                {item.isSite ? 'Website' : (item.isHistory ? 'History' : 'Google')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </form>

                                        {/* Available Tabs List - Absolute, so it NEVER alters the vertical center calculation! */}
                                        <div className="absolute top-[calc(100%+1.25rem)] left-6 right-6 flex flex-col gap-2 max-h-[30vh] overflow-y-auto hide-scroll text-left">
                                            <div className="flex items-center justify-between w-full mb-1 px-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                                    <Layers size={11} className="text-accent" />
                                                    Open Tabs in this Space
                                                </span>
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isBright ? 'bg-black/[0.03] text-zinc-500' : 'bg-white/[0.04] text-white/40'}`}>
                                                    {availableRightTabs.length} {availableRightTabs.length === 1 ? 'tab' : 'tabs'}
                                                </span>
                                            </div>

                                            {availableRightTabs.length === 0 ? (
                                                <div className={`w-full p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-1 shadow-xs ${
                                                    isBright 
                                                        ? 'bg-black/[0.02] text-zinc-500 border-black/[0.06]' 
                                                        : 'bg-white/[0.02] text-white/40 border-white/[0.06]'
                                                }`}>
                                                    <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 mb-0.5">
                                                        <Sparkles size={13} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-white/70">No other open tabs</span>
                                                    <span className="text-[11px] text-white/40 max-w-[240px]">
                                                        Type a search query or URL above to browse side-by-side.
                                                    </span>
                                                </div>
                                            ) : (
                                                availableRightTabs.map(t => (
                                                    <div 
                                                        key={t.id} 
                                                        onClick={() => setSplitRightTabId(t.id)}
                                                        className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border cursor-pointer transition-all duration-200 group relative ${
                                                            isBright 
                                                                ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.06] hover:border-accent/50 text-zinc-900 shadow-xs' 
                                                                : 'bg-white/[0.025] hover:bg-white/[0.06] border-white/[0.06] hover:border-accent/40 text-white shadow-xs'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 truncate min-w-0 pr-2">
                                                            <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-accent/30 transition-all">
                                                                {t.url ? (
                                                                    <img 
                                                                        src={`https://www.google.com/s2/favicons?sz=32&domain=${t.url}`} 
                                                                        className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                                                                        onError={e => e.target.style.display = 'none'} 
                                                                    />
                                                                ) : (
                                                                    <Globe size={13} className={isBright ? 'text-zinc-400' : 'text-white/40'} />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col text-left truncate min-w-0">
                                                                <span className={`text-xs font-semibold truncate transition-colors ${
                                                                    isBright ? 'text-zinc-900 group-hover:text-accent' : 'text-white/90 group-hover:text-accent'
                                                                }`}>
                                                                    {t.title}
                                                                </span>
                                                                {t.url && (
                                                                    <span className={`text-[10px] font-mono truncate mt-0.5 ${
                                                                        isBright ? 'text-zinc-500' : 'text-white/40'
                                                                    }`}>
                                                                        {t.url}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <button 
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSplitRightTabId(t.id);
                                                            }}
                                                            className="px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent group-hover:bg-accent group-hover:text-zinc-950 text-[11px] font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                                                        >
                                                            <Columns size={12} strokeWidth={2.5} />
                                                            <span>Open</span>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            </div>
            );
            })()}

            {/* PEEK WINDOW */}
            {(peekWindow || isPeekClosing) && (
                <div className={`absolute inset-8 md:inset-20 z-[1000] flex flex-col rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden backdrop-blur-3xl border ${isBright ? 'bg-white/80 border-black/10 text-zinc-900 shadow-[0_30px_90px_rgba(0,0,0,0.15)]' : 'bg-black/60 border-white/10 text-white'} ${isPeekClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
                    <button onClick={closePeek} className="absolute top-4 left-4 z-10 w-4 h-4 bg-red-500 hover:bg-red-400 text-transparent hover:text-white rounded-full flex items-center justify-center transition-colors shadow-sm group">
                        <X size={10} className="opacity-0 group-hover:opacity-100" />
                    </button>
                    <div className={`flex-1 flex flex-col items-center justify-center relative ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                        <Globe size={32} className={isBright ? 'text-zinc-300 mb-4' : 'text-white/20 mb-4'} />
                        <span className={`text-sm font-bold uppercase tracking-widest ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Content Preview</span>
                    </div>
                </div>
            )}

            {/* FLOATING ZOOM HUD */}
            <div className={`absolute bottom-8 right-8 z-[9990] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isZoomHUDVisible 
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                    : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
            }`}>
                <div 
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-2xl border transition-all ${
                        isBright 
                            ? 'bg-white/90 border-black/10 text-zinc-800 shadow-[0_15px_35px_rgba(0,0,0,0.12)]' 
                            : 'bg-[#121216]/90 border-white/15 text-white shadow-[0_15px_35px_rgba(0,0,0,0.7)]'
                    }`}
                >
                    <ZoomIn size={14} className="text-accent" />
                    <span className="text-xs font-bold font-mono tracking-tight min-w-[42px] text-center select-none">
                        {zoomLevel}%
                    </span>
                    <div className={`flex items-center gap-1 pl-2 border-l ${isBright ? 'border-black/10' : 'border-white/10'}`}>
                        <button 
                            onClick={() => setZoomLevel(zoomLevel - 10)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition active:scale-95 ${
                                isBright ? 'hover:bg-black/5 text-zinc-700' : 'hover:bg-white/10 text-white'
                            }`}
                            title="Zoom Out (Ctrl -)"
                        >
                            -
                        </button>
                        <button 
                            onClick={() => setZoomLevel(zoomLevel + 10)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition active:scale-95 ${
                                isBright ? 'hover:bg-black/5 text-zinc-700' : 'hover:bg-white/10 text-white'
                            }`}
                            title="Zoom In (Ctrl +)"
                        >
                            +
                        </button>
                        {zoomLevel !== 100 && (
                            <button 
                                onClick={() => setZoomLevel(100)}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent hover:bg-accent/30 transition ml-1 active:scale-95 flex items-center gap-1"
                                title="Reset Zoom (Ctrl 0)"
                            >
                                <RotateCcw size={10} /> Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* TOAST POPUP (Minimalist Linear / Raycast Floating Bottom-Center Capsule) */}
            {(toast || isToastClosing) && (
                <div 
                    role="status" 
                    aria-live="polite"
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2 rounded-full backdrop-blur-2xl border text-xs font-medium ${
                        isToastClosing ? 'animate-toast-out' : 'animate-toast'
                    } flex items-center gap-2.5 max-w-md pointer-events-none select-none tracking-wide ${
                        isBright 
                            ? 'bg-white/95 border-black/10 text-zinc-900 shadow-[0_12px_36px_rgba(0,0,0,0.15)]' 
                            : 'bg-[#0c0d12]/95 border-white/12 text-white/90 shadow-[0_12px_36px_rgba(0,0,0,0.65)]'
                    }`}
                >
                    {getToastIcon(toast, isBright)}
                    <span className="truncate leading-none">{typeof toast === 'object' && toast !== null ? (toast.message || toast.text || '') : toast}</span>
                </div>
            )}
        </main>
    );
}
