import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Command, Search, ChevronUp, ChevronDown, X, Moon, Sun, Trash2,
    ShieldAlert, Download, Cpu, Pause, XCircle, FolderOpen,
    Music, SkipBack, SkipForward, ExternalLink, Maximize, WifiOff,
    RefreshCw, Ghost, MonitorPlay, ShieldCheck, Zap, Check, FileText, ArrowLeftRight, Globe,
    ZoomIn, RotateCcw, AlertCircle, Info, Sliders, Camera, Copy,
    Columns, LayoutGrid, SplitSquareHorizontal, SplitSquareVertical, Layers, Sparkles, CornerDownLeft, Plus
} from 'lucide-react';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses, getLiquidGlassCardClasses } from '../common/ContextMenuProvider';
import ElementEraserHUD from '../common/ElementEraserHUD';
import SlidingPillSwitcher from '../common/SlidingPillSwitcher';
import { findDarkModeExclusionMatch } from '../../utils/darkModeWhitelist';

const SplitPaneLauncher = React.lazy(() => import('../features/SplitPaneLauncher'));
import { useTranslation } from '../../i18n/index';
import { formatTabCount } from '../../i18n/helpers.js';
import { isBackgroundServiceAllowed, getSafeFaviconUrl } from '../../utils/networkPrivacy';
import {
    getFocusedSlotIndex,
    getSlotRectCss,
    isBlankSplitTab,
    resolveSplitSlotTabs,
    slotIndexToFocusedPane
} from '../../utils/splitLayoutHelpers';

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
        str.includes('limit') ||
        str.includes('błąd') || str.includes('nie udało') || str.includes('maksymaln') || str.includes('wyłącz') ||
        str.includes('fehler') || str.includes('fehlgeschlagen') || str.includes('deaktiv') ||
        str.includes('erreur') || str.includes('échec') || str.includes('désactiv') ||
        str.includes('fallo') || str.includes('erro') || str.includes('desativ') || str.includes('desactiv') ||
        str.includes('errore') || str.includes('disattiv') ||
        str.includes('ошибк') || str.includes('не удалось') || str.includes('помилк') || str.includes('не вдалося') || str.includes('вичерпано') ||
        str.includes('失败') || str.includes('错误') || str.includes('已停用') ||
        str.includes('エラー') || str.includes('失敗') || str.includes('無効') ||
        str.includes('오류') || str.includes('실패') || str.includes('비활성화')
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
        str.includes('reader') ||
        str.includes('podzielon') || str.includes('tryb:') ||
        str.includes('trennansicht') || str.includes('modus:') ||
        str.includes('vue scindée') || str.includes('mode :') ||
        str.includes('vista dividida') || str.includes('divisão') || str.includes('affiancat') ||
        str.includes('режим:') || str.includes('раздел') || str.includes('розділ') ||
        str.includes('分屏') || str.includes('分割') || str.includes('분할')
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
        str.includes('cleared') ||
        str.includes('activated') ||
        str.includes('woke') ||
        str.includes('skopiow') || str.includes('zapisan') || str.includes('włącz') || str.includes('wyczyszcz') || str.includes('aktywow') ||
        str.includes('gespeichert') || str.includes('kopiert') || str.includes('aktiviert') || str.includes('verbunden') || str.includes('gelöscht') ||
        str.includes('enregistr') || str.includes('copié') || str.includes('activé') || str.includes('connecté') || str.includes('effacé') ||
        str.includes('guardado') || str.includes('copiado') || str.includes('conectado') || str.includes('activado') ||
        str.includes('salvo') || str.includes('ativado') || str.includes('salvat') || str.includes('copiat') || str.includes('connesso') || str.includes('attivato') ||
        str.includes('сохран') || str.includes('скопир') || str.includes('подключ') || str.includes('включ') || str.includes('очищ') ||
        str.includes('збереж') || str.includes('скопійов') || str.includes('підключ') || str.includes('увімкн') ||
        str.includes('已保存') || str.includes('已复制') || str.includes('已连接') || str.includes('已启用') ||
        str.includes('保存') || str.includes('コピー') || str.includes('接続') || str.includes('有効') ||
        str.includes('저장') || str.includes('복사') || str.includes('연결') || str.includes('활성화')
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
import SavePasswordBanner from '../popovers/SavePasswordBanner';
import SiteInfoPopover from '../popovers/SiteInfoPopover';
import PermissionPromptPopup from '../popovers/PermissionPromptPopup';
import { formatCompactNumber } from '../../utils/formatters';
import MediaPlayerPopover from '../common/MediaPlayerPopover';
import FindInPageBar from '../common/FindInPageBar';
import ScreenshotBar from '../common/ScreenshotBar';
import ReadAloudPlayer from '../common/ReadAloudPlayer';
import SnippingOverlay from '../common/SnippingOverlay';
import BrowserDialogOverlay from './BrowserDialogOverlay';
import usePopoverAnchor from '../../hooks/usePopoverAnchor';
import HomepageOmnibox from '../features/HomepageOmnibox';

const QVaultPopover = React.lazy(() => import('../popovers/QVaultPopover'));
const TorCircuitPopover = React.lazy(() => import('../popovers/TorCircuitPopover'));
const ReaderModeOverlay = React.lazy(() => import('../features/ReaderModeOverlay'));

function LazyPopoverGate({ when, children }) {
    if (!when) return null;
    return <React.Suspense fallback={null}>{children}</React.Suspense>;
}

const DownloadPopup = () => {
    const { t } = useTranslation();
    const downloads = useUIStore(state => state.downloads);
    const activeDownloadPopup = useUIStore(state => state.activeDownloadPopup);
    const setActiveDownloadPopup = useUIStore(state => state.setActiveDownloadPopup);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

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

    if (!popupData || typeof document === 'undefined') return null;

    const handleClose = (e) => {
        if (e) e.stopPropagation();
        setActiveDownloadPopup(null);
    };

    return (
        <div
            id="download-toast-popup"
            onClick={e => e.stopPropagation()}
            style={getLiquidGlassInlineStyle(isBright)}
            className={`absolute top-4 right-5 w-72 rounded-2xl p-1.5 select-none outline-none origin-top-right z-[70000] ${getLiquidGlassSurfaceClasses(isBright)} ${isClosing ? 'animate-slide-up-fade-out pointer-events-none' : 'animate-slide-down-fade'}`}
        >
            {/* Header: Section Header matching right-click menu */}
            <div className={`flex items-center justify-between px-2.5 py-1 text-xs font-semibold border-b mb-1 ${isBright ? 'text-zinc-600 border-black/[0.08]' : 'text-white/60 border-white/[0.08]'
                }`}>
                <div className="flex items-center gap-2 truncate">
                    {popupData.isScreenshot ? (
                        <Camera size={13} className="text-accent flex-shrink-0" />
                    ) : popupData.state === 'cancelled' ? (
                        <XCircle size={13} className={isBright ? 'text-rose-500 flex-shrink-0' : 'text-rose-400 flex-shrink-0'} />
                    ) : popupData.state === 'failed' || popupData.state === 'interrupted' ? (
                        <AlertCircle size={13} className={isBright ? 'text-rose-500 flex-shrink-0' : 'text-rose-400 flex-shrink-0'} />
                    ) : (
                        <Download size={13} className="text-accent flex-shrink-0" />
                    )}
                    <span className="truncate">
                        {popupData.isScreenshot
                            ? (popupData.screenshotType
                                ? t('chrome.downloadScreenshotType', { type: popupData.screenshotType }, `Screenshot (${popupData.screenshotType})`)
                                : t('chrome.downloadScreenshot', null, 'Screenshot'))
                            : (popupData.state === 'completed'
                                ? (popupData.verified
                                    ? t('chrome.downloadVerifiedTitle', null, 'Verified Download')
                                    : t('chrome.downloadCompleteTitle', null, 'Download Complete'))
                                : popupData.state === 'cancelled'
                                    ? t('chrome.downloadCancelledTitle', null, 'Download Cancelled')
                                    : popupData.state === 'failed' || popupData.state === 'interrupted'
                                        ? t('chrome.downloadFailedTitle', null, 'Download Failed')
                                        : t('chrome.downloadingTitle', null, 'Downloading...'))}
                    </span>
                </div>
                <button
                    onClick={handleClose}
                    className={`p-1 rounded-lg transition cursor-pointer ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.06]' : 'text-white/55 hover:text-white hover:bg-white/10'
                        }`}
                >
                    <X size={12} />
                </button>
            </div>

            {/* Details row */}
            <div className={`px-2.5 py-1.5 rounded-xl transition ${getLiquidGlassCardClasses(isBright)}`}>
                <div className={`text-xs font-medium truncate ${isBright ? 'text-zinc-900' : 'text-white/95'}`} title={popupData.fileName}>
                    {popupData.fileName}
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${isBright ? 'text-zinc-600' : 'text-white/55'}`}>
                    <span>
                        {popupData.state === 'progressing'
                            ? `${((popupData.receivedBytes || 0) / 1024 / 1024).toFixed(1)} / ${((popupData.totalBytes || 1) / 1024 / 1024).toFixed(1)} MB`
                            : popupData.state === 'cancelled'
                                ? <span className={isBright ? 'text-rose-600 font-semibold' : 'text-rose-400 font-semibold'}>{t('chrome.downloadCancelled', null, 'Cancelled')}</span>
                                : (popupData.state === 'failed' || popupData.state === 'interrupted')
                                    ? <span className={isBright ? 'text-rose-600 font-semibold' : 'text-rose-400 font-semibold'}>{popupData.error || t('chrome.downloadFailed', null, 'Failed')}</span>
                                    : (popupData.actualBytes || popupData.totalBytes) > 0
                                        ? (popupData.actualBytes || popupData.totalBytes) < 1048576
                                            ? `${((popupData.actualBytes || popupData.totalBytes) / 1024).toFixed(1)} KB`
                                            : `${((popupData.actualBytes || popupData.totalBytes) / 1024 / 1024).toFixed(1)} MB`
                                        : t('chrome.downloadSaved', null, 'Saved')
                        }
                    </span>
                    {popupData.state === 'progressing' && popupData.speedBytesPerSec > 0 && (
                        <span className="text-accent font-semibold">
                            • {((popupData.speedBytesPerSec || 0) / 1024 / 1024).toFixed(1)} MB/s
                        </span>
                    )}
                    {popupData.state === 'completed' && popupData.verified && (
                        <span className={`font-semibold flex items-center gap-0.5 ${isBright ? 'text-emerald-700' : 'text-emerald-400'}`}>
                            • <ShieldCheck size={11} className={`inline ${isBright ? 'text-emerald-600' : 'text-emerald-400'}`} /> {t('chrome.downloadVerified', null, 'Verified')}
                        </span>
                    )}
                    {popupData.state === 'completed' && popupData.verified === false && (
                        <span className={`font-semibold flex items-center gap-0.5 ${isBright ? 'text-amber-700' : 'text-amber-400'}`}>
                            • <AlertCircle size={11} className={`inline ${isBright ? 'text-amber-600' : 'text-amber-400'}`} /> {t('chrome.downloadUnverified', null, 'Unverified')}
                        </span>
                    )}
                    {popupData.isScreenshot && (
                        <span className={`font-sans ${isBright ? 'text-emerald-700' : 'text-emerald-400/90'}`}>• {t('chrome.copiedToClipboard', null, 'Copied to clipboard')}</span>
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
                <div className={`flex items-center gap-1 mt-1 pt-1 border-t ${isBright ? 'border-black/[0.08]' : 'border-white/[0.08]'
                    }`}>
                    <button
                        onClick={() => window.electronAPI?.openFile?.(popupData.savePath)}
                        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer outline-none ${isBright
                                ? 'text-zinc-800 hover:text-zinc-950 hover:bg-black/[0.06] active:bg-black/10'
                                : 'text-white/85 hover:text-white hover:bg-white/10 active:bg-white/15'
                            }`}
                    >
                        <ExternalLink size={13} className={isBright ? 'text-zinc-600' : 'text-white/60'} />
                        <span>{t('chrome.open', null, 'Open')}</span>
                    </button>
                    <button
                        onClick={() => window.electronAPI?.showItemInFolder?.(popupData.savePath)}
                        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer outline-none ${isBright
                                ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06] active:bg-black/10'
                                : 'text-white/75 hover:text-white hover:bg-white/10 active:bg-white/15'
                            }`}
                    >
                        <FolderOpen size={13} className={isBright ? 'text-zinc-600' : 'text-white/60'} />
                        <span>{t('chrome.folder', null, 'Folder')}</span>
                    </button>
                    {popupData.checksum && (
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(popupData.checksum);
                                useUIStore.getState().showToast(t('chrome.toastChecksumCopied', null, 'SHA-256 checksum copied to clipboard'));
                            }}
                            title={`SHA-256: ${popupData.checksum}`}
                            className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer outline-none ${isBright
                                    ? 'text-emerald-700 hover:text-emerald-950 hover:bg-emerald-500/10 active:bg-emerald-500/20'
                                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:bg-emerald-500/20'
                                }`}
                        >
                            <ShieldCheck size={13} className={isBright ? 'text-emerald-600' : 'text-emerald-400'} />
                            <span>{t('chrome.hash', null, 'Hash')}</span>
                        </button>
                    )}
                    {popupData.isScreenshot && popupData.savePath && (
                        <button
                            onClick={async () => {
                                if (window.electronAPI?.copyImageToClipboard) {
                                    await window.electronAPI.copyImageToClipboard(popupData.savePath);
                                    useUIStore.getState().showToast(t('chrome.toastScreenshotCopied', null, 'Screenshot copied to clipboard'));
                                }
                            }}
                            title={t('chrome.copyImageTooltip', null, 'Copy Image to Clipboard')}
                            className={`p-1.5 rounded-xl transition cursor-pointer outline-none ${isBright
                                    ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06] active:bg-black/10'
                                    : 'text-white/75 hover:text-white hover:bg-white/10 active:bg-white/15'
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
    const { t, resolvedLanguage, intlLocale } = useTranslation();
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const setIsFullscreen = useUIStore(state => state.setIsFullscreen);
    const isFramelessMode = useUIStore(state => state.isFramelessMode);
    const isChromeHidden = isFullscreen || isFramelessMode;
    const theme = useUIStore(state => state.theme);
    const setTheme = useUIStore(state => state.setTheme);
    const isForceDark = useUIStore(state => state.isForceDark);
    const smartDarkStatusByTab = useUIStore(state => state.smartDarkStatusByTab);
    const darkExcludeMedia = useUIStore(state => state.darkExcludeMedia);
    const setDarkExcludeMedia = useUIStore(state => state.setDarkExcludeMedia);
    const darkExclusions = useUIStore(state => state.darkExclusions);
    const addDarkExclusion = useUIStore(state => state.addDarkExclusion);
    const removeDarkExclusion = useUIStore(state => state.removeDarkExclusion);
    const toggleDarkExclusionForUrl = useUIStore(state => state.toggleDarkExclusionForUrl);
    const resetDarkExclusions = useUIStore(state => state.resetDarkExclusions);
    const setIsForceDark = useUIStore(state => state.setIsForceDark);
    const openModal = useUIStore(state => state.openModal);
    const setSettingsTab = useUIStore(state => state.setSettingsTab);
    const toast = useUIStore(state => state.toast);
    const isToastClosing = useUIStore(state => state.isToastClosing);
    const showToast = useUIStore(state => state.showToast);
    const activePopover = useUIStore(state => state.activePopover);
    const isReaderOpen = useUIStore(state => state.isReaderOpen);
    const isReaderClosing = useUIStore(state => state.isReaderClosing);
    const isPopoverClosing = useUIStore(state => state.isPopoverClosing);
    const closePopover = useUIStore(state => state.closePopover);
    const isSwipeEnabled = useUIStore(state => state.isSwipeEnabled);
    const zoomLevel = useUIStore(state => state.zoomLevel);
    const isZoomHUDVisible = useUIStore(state => state.isZoomHUDVisible);
    const setZoomLevel = useUIStore(state => state.setZoomLevel);
    const zoomIn = useUIStore(state => state.zoomIn);
    const zoomOut = useUIStore(state => state.zoomOut);
    const resetZoom = useUIStore(state => state.resetZoom);
    const canvasZoomLevel = useUIStore(state => state.canvasZoomLevel);
    const isCanvasZoomHUDVisible = useUIStore(state => state.isCanvasZoomHUDVisible);

    const handleResetCanvasZoom = useCallback(() => {
        const activeTab = useTabStore.getState().getActiveTab();
        const wv = activeTab ? document.querySelector(`webview#webview-${activeTab.id}`) : document.querySelector('webview');
        if (wv && typeof wv.send === 'function') {
            try { wv.send('webview-visual-zoom', 'reset'); } catch (_) { }
        }
    }, []);
    const isSplitView = useUIStore(state => state.isSplitView);
    const splitRightTabId = useUIStore(state => state.splitRightTabId);
    const splitPaneTabIds = useUIStore(state => state.splitPaneTabIds);
    const setSplitPaneTabId = useUIStore(state => state.setSplitPaneTabId);
    const swapSplitPanes = useUIStore(state => state.swapSplitPanes);
    const focusedPane = useUIStore(state => state.focusedPane);
    const setFocusedPane = useUIStore(state => state.setFocusedPane);
    const splitRatio = useUIStore(state => state.splitRatio);
    const setSplitRatio = useUIStore(state => state.setSplitRatio);
    const splitRatioY = useUIStore(state => state.splitRatioY);
    const setSplitRatioY = useUIStore(state => state.setSplitRatioY);
    const splitOrientation = useUIStore(state => state.splitOrientation);
    const setSplitOrientation = useUIStore(state => state.setSplitOrientation);
    const isDraggingSplit = useUIStore(state => state.isDraggingSplit);
    const setIsDraggingSplit = useUIStore(state => state.setIsDraggingSplit);
    const isSplitAxisAnimating = useUIStore(state => state.isSplitAxisAnimating);
    const setIsSplitAxisAnimating = useUIStore(state => state.setIsSplitAxisAnimating);
    const setIsSplitClosingStore = useUIStore(state => state.setIsSplitClosing);
    const setSplitTransitionMode = useUIStore(state => state.setSplitTransitionMode);
    const isVerticalSplit = splitOrientation === 'vertical';
    const isQuadSplit = splitOrientation === 'quad';
    const toggleSplitView = useUIStore(state => state.toggleSplitView);
    const isRefreshing = useUIStore(state => state.isRefreshing);
    const refresh = useUIStore(state => state.refresh);
    const openOmnibox = useUIStore(state => state.openOmnibox);
    const settings = useUIStore(state => state.settings);
    const isReducedMotion = useUIStore(state => Boolean(state.settings?.a11yReducedMotion || state.isSystemReducedMotion));
    const topBarPosition = useUIStore(state => state.settings?.topBarPosition || 'top');
    const sidebarPosition = useUIStore(state => state.settings?.sidebarPosition || 'left');
    const isSplitLeft = sidebarPosition === 'right';

    const darkmodeAnchor = usePopoverAnchor('#tour-darkmode-trigger', 320, { defaultRight: 128 });
    const adblockAnchor = usePopoverAnchor('#tour-shield-trigger', 288, { defaultRight: 48 });
    const downloadsAnchor = usePopoverAnchor('#tour-downloads-trigger', 320, { defaultRight: 24 });

    const [darkPopoverInput, setDarkPopoverInput] = useState('');
    const [hoveredThemePreview, setHoveredThemePreview] = useState(null);

    useEffect(() => {
        if (activePopover === 'darkmode') {
            setDarkPopoverInput('');
        }
    }, [activePopover]);
    const peekWindow = useUIStore(state => state.peekWindow);
    const setPeekWindow = useUIStore(state => state.setPeekWindow);
    const isPeekClosing = useUIStore(state => state.isPeekClosing);
    const closePeek = useUIStore(state => state.closePeek);

    const customSpaces = useUIStore(state => state.settings?.customSpaces) || [
        { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
        { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
    ];

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];
    const customSpaceTabs = useTabStore(state => state.customSpaceTabs) || {};
    const getTabsForSpace = useTabStore(state => state.getTabsForSpace);

    const isIncognito = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const isBright = theme === 'light' && !isIncognito && !isTor;

    const getEffectiveLeftTab = (tabs) => {
        if (isSplitView) {
            const { slots } = resolveSplitSlotTabs({
                spaceTabs: tabs || [],
                isSplitView: true,
                splitOrientation,
                splitPaneTabIds,
                splitRightTabId
            });
            return slots[0];
        }
        return (tabs || []).find(t => t.active) || (tabs || [])[0];
    };

    const isSpaceEmpty = (spaceId) => {
        const tabs = getTabsForSpace ? getTabsForSpace(spaceId) : (
            spaceId === 'personal' ? privateTabs :
                spaceId === 'work' ? workTabs :
                    spaceId === 'ghost' ? ghostTabs :
                        spaceId === 'tor' ? torTabs : []
        );
        const effTab = getEffectiveLeftTab(tabs || []);
        return !effTab || effTab.url === '' || effTab.url === 'about:blank';
    };

    const visibleSpaces = [...customSpaces, { id: 'ghost' }, { id: 'tor' }];

    const isAdblockActive = useUIStore(state => state.isAdblockActive);
    const setIsAdblockActive = useUIStore(state => state.setIsAdblockActive);
    const adblockStats = useUIStore(state => state.adblockStats);
    const accentColor = useUIStore(state => state.accentColor);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const frameCurvature = useUIStore(state => state.settings?.frameCurvature || 'default');

    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(prev => (prev.getMinutes() !== now.getMinutes() ? now : prev));
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const dateString = currentTime.toLocaleDateString(intlLocale, { weekday: 'long', month: 'long', day: 'numeric' });
    const timeString = currentTime.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit', hour12: false });

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
            <div className={`absolute inset-0 flex flex-col items-center justify-center overflow-visible z-10 w-full h-full ${isReducedMotion ? 'transition-none' : 'animate-pop-in'}`}>
                <div
                    className={`relative z-10 flex flex-col items-center origin-center w-full mt-[-10vh] ${isReducedMotion ? 'transition-none' : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
                    style={{ transform: `translateY(${isZenDropdownOpen ? '-10vh' : '0px'}) scale(${zoomLevel / 100})` }}
                >
                    <div className={`flex flex-col items-center px-4 w-full text-center ${isReducedMotion ? 'transition-none' : 'transition-[margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'} ${isZenDropdownOpen ? 'mb-6 md:mb-8' : 'mb-10 md:mb-14'
                        }`}>
                        <span className={`text-sm font-bold uppercase tracking-[0.4em] mb-4 drop-shadow-sm transition-colors duration-500 ${isSpaceTor ? 'text-purple-300/60' : (isDark ? 'text-white/50' : 'text-zinc-700 font-bold')
                            }`}>{dateString}</span>
                        <h1
                            className={`qbrowse-hero-clock text-[5rem] md:text-[8rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${isSpaceTor
                                    ? 'from-purple-200 via-purple-300/85 to-purple-500/20'
                                    : (isDark
                                        ? 'from-white via-white/90 to-white/20'
                                        : 'from-zinc-900 via-zinc-800 to-zinc-700')
                                } select-none transition-colors duration-500 px-4`}
                            style={{
                                fontFamily: 'var(--clock-font-family)',
                                filter: isSpaceTor
                                    ? 'drop-shadow(0 16px 36px rgba(168,85,247,0.35)) drop-shadow(0 4px 12px rgba(0,0,0,0.45))'
                                    : (isDark
                                        ? 'drop-shadow(0 18px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(var(--accent-rgb),0.14))'
                                        : 'drop-shadow(0 16px 36px rgba(0,0,0,0.08))')
                            }}
                        >
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

    const [isSplitMenuHovered, setIsSplitMenuHovered] = useState(false);
    const [isSplitMenuPinned, setIsSplitMenuPinned] = useState(false);
    const [isSplitClosing, setIsSplitClosing] = useState(false);
    const [isInstantSplitSwitch, setIsInstantSplitSwitch] = useState(false);
    const [splitFadeNonce, setSplitFadeNonce] = useState(0);
    const splitMenuLeaveTimerRef = useRef(null);
    const splitAxisAnimTimerRef = useRef(null);
    const splitCloseTimerRef = useRef(null);
    const splitInstantTimerRef = useRef(null);
    const prevSplitViewRef = useRef(isSplitView);
    const closingSplitSnapshotRef = useRef({ orientation: splitOrientation, slots: [], slotCount: 2 });
    const splitDragDistanceRef = useRef(0);
    const splitDragStartRef = useRef({ x: 0, y: 0 });
    const dragAxisRef = useRef('x'); // 'x' | 'y' | 'both'
    const mainContainerRef = useRef(null);
    const viewportFrameRef = useRef(null);
    const spacesLayerRef = useRef(null);
    const [toastCenterX, setToastCenterX] = useState(() => (typeof window !== 'undefined' ? window.innerWidth / 2 : 0));

    useEffect(() => {
        const updateToastCenter = () => {
            const el = viewportFrameRef.current;
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0) {
                    setToastCenterX(rect.left + rect.width / 2);
                    return;
                }
            }
            if (typeof window !== 'undefined') {
                setToastCenterX(window.innerWidth / 2);
            }
        };

        updateToastCenter();
        window.addEventListener('resize', updateToastCenter);

        let ro = null;
        if (typeof ResizeObserver !== 'undefined' && viewportFrameRef.current) {
            ro = new ResizeObserver(updateToastCenter);
            ro.observe(viewportFrameRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateToastCenter);
            if (ro) ro.disconnect();
        };
    }, [toast, isToastClosing, sidebarPosition]);
    const currentRatioXRef = useRef(splitRatio);
    const currentRatioYRef = useRef(splitRatioY);

    useEffect(() => {
        currentRatioXRef.current = splitRatio;
    }, [splitRatio]);

    useEffect(() => {
        currentRatioYRef.current = splitRatioY;
    }, [splitRatioY]);

    const triggerSplitAxisAnim = useCallback((durationMs = 520) => {
        if (isReducedMotion) return;
        if (splitAxisAnimTimerRef.current) clearTimeout(splitAxisAnimTimerRef.current);
        setIsSplitAxisAnimating(true);
        splitAxisAnimTimerRef.current = setTimeout(() => {
            setIsSplitAxisAnimating(false);
        }, durationMs);
    }, [isReducedMotion, setIsSplitAxisAnimating]);

    useEffect(() => {
        return () => {
            if (splitMenuLeaveTimerRef.current) clearTimeout(splitMenuLeaveTimerRef.current);
            if (splitAxisAnimTimerRef.current) clearTimeout(splitAxisAnimTimerRef.current);
            if (splitCloseTimerRef.current) clearTimeout(splitCloseTimerRef.current);
            if (splitInstantTimerRef.current) clearTimeout(splitInstantTimerRef.current);
        };
    }, []);

    useLayoutEffect(() => {
        const wasSplit = prevSplitViewRef.current;
        prevSplitViewRef.current = isSplitView;
        const mode = useUIStore.getState().splitTransitionMode;

        if (isSplitView !== wasSplit && mode === 'instant') {
            // Instant tab-switch crossfade between standalone tab and Split Group (no resizing glide)
            if (splitCloseTimerRef.current) {
                clearTimeout(splitCloseTimerRef.current);
                splitCloseTimerRef.current = null;
            }
            if (splitInstantTimerRef.current) clearTimeout(splitInstantTimerRef.current);
            setIsSplitClosing(false);
            setIsSplitClosingStore(false);
            setIsInstantSplitSwitch(true);
            setIsSplitAxisAnimating(true);
            if (isSplitView) {
                setSplitFadeNonce(n => n + 1);
            }
            splitInstantTimerRef.current = setTimeout(() => {
                setIsInstantSplitSwitch(false);
                setIsSplitAxisAnimating(false);
                setSplitTransitionMode('animate');
            }, 60);
            return;
        }

        if (isSplitView && !wasSplit) {
            if (splitCloseTimerRef.current) {
                clearTimeout(splitCloseTimerRef.current);
                splitCloseTimerRef.current = null;
            }
            setIsSplitClosing(false);
            setIsSplitClosingStore(false);
            triggerSplitAxisAnim(520);
        } else if (!isSplitView && wasSplit) {
            setIsSplitMenuHovered(false);
            setIsSplitMenuPinned(false);
            if (isReducedMotion) {
                setIsSplitClosing(false);
                setIsSplitClosingStore(false);
                setIsSplitAxisAnimating(false);
            } else {
                triggerSplitAxisAnim(440);
                setIsSplitClosing(true);
                setIsSplitClosingStore(true);
                if (splitCloseTimerRef.current) clearTimeout(splitCloseTimerRef.current);
                splitCloseTimerRef.current = setTimeout(() => {
                    setIsSplitClosing(false);
                    setIsSplitClosingStore(false);
                }, 440);
            }
        }
    }, [isSplitView, isReducedMotion, setIsSplitAxisAnimating, setIsSplitClosingStore, setSplitTransitionMode, triggerSplitAxisAnim]);

    const openSplitMenuHover = () => {
        if (splitMenuLeaveTimerRef.current) {
            clearTimeout(splitMenuLeaveTimerRef.current);
            splitMenuLeaveTimerRef.current = null;
        }
        setIsSplitMenuHovered(true);
    };

    const scheduleSplitMenuClose = () => {
        if (splitMenuLeaveTimerRef.current) clearTimeout(splitMenuLeaveTimerRef.current);
        splitMenuLeaveTimerRef.current = setTimeout(() => {
            setIsSplitMenuHovered(false);
        }, 320);
    };

    useLayoutEffect(() => {
        if (spacesLayerRef.current) {
            spacesLayerRef.current.scrollLeft = 0;
            spacesLayerRef.current.scrollTop = 0;
        }
        if (viewportFrameRef.current) {
            viewportFrameRef.current.scrollLeft = 0;
            viewportFrameRef.current.scrollTop = 0;
        }
    }, [activeSpace, visibleSpaces.length]);

    const spaceTabs = getTabsForSpace ? getTabsForSpace(activeSpace) : (activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : (activeSpace === 'ghost' ? ghostTabs : torTabs)));
    const { slots: splitSlots, slotCount: splitSlotCount, tabSlotMap: splitTabSlotMap } = resolveSplitSlotTabs({
        spaceTabs,
        isSplitView,
        splitOrientation,
        splitPaneTabIds,
        splitRightTabId
    });
    const activeLeftTab = splitSlots[0] || null;
    const rightTab = splitSlots[1] || null;
    const availableRightTabs = spaceTabs.filter(t => !splitTabSlotMap.has(t.id) && !isBlankSplitTab(t));
    const focusedSlotIndex = getFocusedSlotIndex(focusedPane);

    if (isSplitView) {
        closingSplitSnapshotRef.current = {
            orientation: splitOrientation,
            slots: splitSlots,
            slotCount: splitSlotCount
        };
    }

    const handleSplitMouseDown = (e, axis = 'x') => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragAxisRef.current = axis;
        splitDragStartRef.current = { x: e.clientX, y: e.clientY };
        splitDragDistanceRef.current = 0;
        setIsDraggingSplit(true);
    };

    useEffect(() => {
        if (!isDraggingSplit) return;
        let animationFrameId = null;

        const handleMouseMove = (e) => {
            if (!viewportFrameRef.current) return;
            const dx = e.clientX - splitDragStartRef.current.x;
            const dy = e.clientY - splitDragStartRef.current.y;
            splitDragDistanceRef.current = Math.max(splitDragDistanceRef.current, Math.hypot(dx, dy));
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                const rect = viewportFrameRef.current.getBoundingClientRect();
                const axis = dragAxisRef.current;

                if (axis === 'x' || axis === 'both') {
                    const offsetX = e.clientX - rect.left;
                    const rawX = Math.min(80, Math.max(20, (offsetX / Math.max(1, rect.width)) * 100));
                    const primaryX = (!isQuadSplit && isSplitLeft) ? (100 - rawX) : rawX;
                    currentRatioXRef.current = primaryX;
                    viewportFrameRef.current.style.setProperty('--split-x', `${primaryX}%`);
                }

                if (axis === 'y' || axis === 'both') {
                    const offsetY = e.clientY - rect.top;
                    const rawY = Math.min(80, Math.max(20, (offsetY / Math.max(1, rect.height)) * 100));
                    currentRatioYRef.current = rawY;
                    viewportFrameRef.current.style.setProperty('--split-y', `${rawY}%`);
                }
            });
        };

        const handleMouseUp = () => {
            setIsDraggingSplit(false);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (splitDragDistanceRef.current < 4) {
                setIsSplitMenuPinned(prev => !prev);
            } else {
                const axis = dragAxisRef.current;
                if (axis === 'x' || axis === 'both') {
                    setSplitRatio(currentRatioXRef.current);
                }
                if (axis === 'y' || axis === 'both') {
                    setSplitRatioY(currentRatioYRef.current);
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isDraggingSplit, setIsDraggingSplit, setSplitRatio, setSplitRatioY, isSplitLeft, isQuadSplit]);

    const handleSwapPanes = (e, slotA = 0, slotB = 1) => {
        if (e) e.stopPropagation();
        if (!isSplitView) return;
        swapSplitPanes(slotA, slotB);
    };

    const handleSelectSplitLayout = (mode) => {
        setSplitOrientation(mode);
        const labelMap = {
            horizontal: t('stores.ui.splitHorizontal', null, 'Split View: Side-by-Side'),
            vertical: t('stores.ui.splitVertical', null, 'Split View: Stacked (Top/Bottom)'),
            quad: t('stores.ui.splitQuad', null, 'Split View: 2×2 Quad Grid')
        };
        showToast(labelMap[mode] || labelMap.horizontal);
    };

    const handleReloadBothSplitPanes = (e) => {
        if (e) e.stopPropagation();
        const reloadById = (id) => {
            if (!id) return;
            const wv = (window.qbrowseWebviews && window.qbrowseWebviews[id]) || document.querySelector(`webview#webview-${id}`);
            if (wv && typeof wv.reload === 'function') {
                try { wv.reload(); } catch (_) { }
            }
        };
        splitSlots.slice(0, splitSlotCount).forEach(tabObj => reloadById(tabObj?.id));
        showToast(t('chrome.splitReloadedBoth', null, 'Reloaded all split panes'));
        setIsSplitMenuPinned(false);
    };

    const handlePromoteSecondaryPane = (e, slotIdx = 1) => {
        if (e) e.stopPropagation();
        const targetTab = splitSlots[slotIdx] || rightTab;
        if (!targetTab) return;
        const targetId = targetTab.id;
        setIsSplitMenuPinned(false);
        toggleSplitView();
        useTabStore.getState().handleSwitchToTab(targetId, activeSpace);
    };

    const handleOpenSplitUrl = (eOrUrl, slotIdx = 1, titleOverride = null) => {
        if (eOrUrl && typeof eOrUrl.preventDefault === 'function') {
            eOrUrl.preventDefault();
        }
        const raw = (typeof eOrUrl === 'string' ? eOrUrl : '').trim();
        if (!raw) return;
        let url = raw;
        if (!url.includes('://') && !url.startsWith('about:') && !url.startsWith('qbrowse://')) {
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        const newTab = useTabStore.getState().addTab({
            id: 't-' + Date.now(),
            title: titleOverride || url.replace(/^https?:\/\//, ''),
            url,
            active: false,
            folderId: null
        });
        setSplitPaneTabId(slotIdx, newTab.id);
        setFocusedPane(slotIndexToFocusedPane(slotIdx));
    };

    return (
        <main
            id="qbrowse-main-frame"
            className="flex-1 min-w-0 relative z-20 flex flex-col"
        >

            {topBarPosition === 'top' && <TopBar />}


            {(activePopover === 'siteinfo' || (isPopoverClosing && activePopover === 'siteinfo')) && (
                <SiteInfoPopover isClosing={isPopoverClosing} />
            )}

            {(activePopover === 'darkmode' || (isPopoverClosing && activePopover === 'darkmode')) && (
                <div
                    id="popover-darkmode-container"
                    onClick={e => e.stopPropagation()}
                    style={{ ...darkmodeAnchor.style, ...getLiquidGlassInlineStyle(isBright) }}
                    className={`absolute z-[60] w-80 rounded-2xl overflow-hidden flex flex-col transition-all ${getLiquidGlassSurfaceClasses(isBright)} ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                >
                    {/* Section 1: Browser Appearance Theme */}
                    <div className={`p-4 border-b ${isBright ? 'border-black/[0.06] bg-black/[0.02]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 block ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                            {t('chrome.darkPopoverAppearance', null, 'Browser Appearance')}
                        </span>
                        <div
                            onMouseLeave={() => setHoveredThemePreview(null)}
                            className={`relative flex p-1 rounded-full border shadow-xs backdrop-blur-2xl select-none ${isBright
                                    ? 'bg-black/[0.03] border-black/[0.05]'
                                    : 'bg-[#0c0d14]/78 border-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                                }`}>
                            {/* Hover Preview Pill */}
                            {hoveredThemePreview && hoveredThemePreview !== theme && (
                                <div
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-200 pointer-events-none ${isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                                        }`}
                                    style={{
                                        transform: hoveredThemePreview === 'light' ? 'translateX(100%)' : 'translateX(0)',
                                    }}
                                />
                            )}
                            {/* Sliding Pill Indicator */}
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isBright
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
                                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${theme === 'dark'
                                        ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                        : (isBright ? 'text-zinc-600 hover:text-black' : 'text-white/60 hover:text-white')
                                    }`}
                            >
                                <Moon size={14} className={theme === 'dark' ? 'fill-current' : ''} />
                                <span>{t('chrome.themeDark', null, 'Dark')}</span>
                            </button>
                            <button
                                type="button"
                                onMouseEnter={() => setHoveredThemePreview('light')}
                                onClick={() => setTheme('light')}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${theme === 'light'
                                        ? (isBright ? 'text-zinc-900 font-bold' : 'text-accent font-bold')
                                        : (isBright ? 'text-zinc-600 hover:text-black' : 'text-white/60 hover:text-white')
                                    }`}
                            >
                                <Sun size={14} className={theme === 'light' ? 'text-amber-600 fill-amber-500/20' : ''} />
                                <span>{t('chrome.themeBright', null, 'Bright')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Smart Dark Mode for Websites */}
                    <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white/95'}`}>{t('chrome.webSmartDark', null, 'Web Smart Dark')}</span>
                                <span className={`text-[10px] ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('chrome.webSmartDarkDesc', null, 'Invert light webpages only')}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsForceDark(!isForceDark)}
                                className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-200 cursor-pointer ${isForceDark ? 'bg-accent shadow-[0_0_8px_var(--accent)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                    }`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${isForceDark ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white/95'}`}>{t('chrome.smartDarkExcludeMedia', null, 'Exclude Images & Videos')}</span>
                                <span className={`text-[10px] ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('chrome.smartDarkExcludeMediaDesc', null, 'Preserve photos, videos & embeds')}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDarkExcludeMedia(!darkExcludeMedia)}
                                className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-200 cursor-pointer ${darkExcludeMedia ? 'bg-accent shadow-[0_0_8px_var(--accent)]' : (isBright ? 'bg-zinc-300' : 'bg-white/20')
                                    }`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${darkExcludeMedia ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        {(() => {
                            const activeTabsList = getTabsForSpace
                                ? (getTabsForSpace(activeSpace) || [])
                                : (activeSpace === 'personal' ? privateTabs : activeSpace === 'work' ? workTabs : activeSpace === 'ghost' ? ghostTabs : activeSpace === 'tor' ? torTabs : (customSpaceTabs[activeSpace] || []));
                            const currentWebTab = activeTabsList.find(tb => tb.active) || activeTabsList[0];
                            const darkMatch = findDarkModeExclusionMatch(currentWebTab?.url, darkExclusions);
                            const isInheritedMatch = darkMatch.excluded && (darkMatch.matchType === 'subdomain' || darkMatch.matchType === 'wildcard');
                            const exclusionsList = Array.isArray(darkExclusions) ? darkExclusions : [];

                            const handleQuickAdd = (e) => {
                                e.preventDefault();
                                const raw = darkPopoverInput.trim();
                                if (!raw) return;
                                const res = addDarkExclusion(raw);
                                if (!res.ok) {
                                    showToast(
                                        res.reason === 'duplicate'
                                            ? t('cfg.appearance.whitelistDuplicate', { domain: res.entry }, `${res.entry} is already whitelisted.`)
                                            : t('cfg.appearance.whitelistInvalid', null, 'Enter a valid domain, URL, or *.domain.com wildcard.')
                                    );
                                    return;
                                }
                                setDarkPopoverInput('');
                                showToast(t('cfg.appearance.whitelistAddedToast', { domain: res.entry }, `Excluded ${res.entry} from Smart Dark Mode`));
                            };

                            return (
                                <div className="flex flex-col gap-2.5">
                                    {/* 1-Click Current Site Toggle */}
                                    {darkMatch.hostname && (() => {
                                        const siteFaviconUrl = getSafeFaviconUrl(currentWebTab?.url, settings, 32);
                                        const tabDarkStatus = smartDarkStatusByTab?.[currentWebTab?.id];
                                        const isNativeDarkDetected = Boolean(isForceDark && !darkMatch.excluded && tabDarkStatus?.isNativelyDark);
                                        const statusDotClass = darkMatch.excluded
                                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]'
                                            : isNativeDarkDetected
                                                ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                                                : isForceDark
                                                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]'
                                                    : (isBright ? 'bg-zinc-400' : 'bg-white/35');
                                        const statusLabel = isInheritedMatch
                                            ? t('pop.site.darkExcludedVia', { rule: darkMatch.matchedRule }, `Excluded via ${darkMatch.matchedRule}`)
                                            : darkMatch.excluded
                                                ? t('pop.site.darkWhitelisted', null, 'Native theme')
                                                : isNativeDarkDetected
                                                    ? t('pop.site.darkNativeDetected', null, 'Native dark detected')
                                                    : isForceDark
                                                        ? t('pop.site.darkActiveOnSite', null, 'Smart Dark active')
                                                        : t('pop.site.darkGlobalOff', null, 'Force Dark is off');
                                        return (
                                            <div className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-2xl border transition-colors ${isBright
                                                    ? 'bg-white/80 border-black/[0.08] shadow-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
                                                    : 'bg-white/[0.04] border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                                }`}>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`relative w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 border ${isBright
                                                            ? 'bg-black/[0.04] border-black/[0.08]'
                                                            : 'bg-white/[0.06] border-white/[0.10]'
                                                        }`}>
                                                        {siteFaviconUrl ? (
                                                            <img
                                                                src={siteFaviconUrl}
                                                                alt=""
                                                                className="w-4 h-4 rounded-sm object-contain"
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <Globe size={13} className={isBright ? 'text-zinc-600' : 'text-white/65'} />
                                                        )}
                                                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ${isBright ? 'ring-white' : 'ring-[#12141c]'} ${statusDotClass}`} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`text-[11.5px] font-semibold tracking-tight truncate ${isBright ? 'text-zinc-900' : 'text-white/95'}`}>
                                                            {darkMatch.hostname}
                                                        </span>
                                                        <span className={`text-[10px] truncate ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const res = toggleDarkExclusionForUrl(currentWebTab?.url);
                                                        if (!res.ok) return;
                                                        if (res.action === 'added') {
                                                            showToast(t('pop.site.darkExcludedToast', { domain: res.rule }, `Excluded ${res.rule} from Force Dark Mode`));
                                                        } else {
                                                            showToast(t('pop.site.darkIncludedToast', { domain: res.rule }, `Removed ${res.rule} from Force Dark whitelist`));
                                                        }
                                                    }}
                                                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold border transition-all cursor-pointer active:scale-95 ${darkMatch.excluded
                                                            ? (isBright
                                                                ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20'
                                                                : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25')
                                                            : (isBright
                                                                ? 'bg-white/90 border-black/[0.10] text-zinc-700 hover:bg-white hover:text-zinc-950 shadow-2xs'
                                                                : 'bg-white/[0.08] border-white/[0.12] text-white/85 hover:bg-white/[0.14] hover:text-white')
                                                        }`}
                                                >
                                                    {darkMatch.excluded ? <Moon size={11} /> : <Sun size={11} />}
                                                    <span>
                                                        {darkMatch.excluded
                                                            ? t('pop.site.darkAllowBtn', null, 'Re-enable')
                                                            : t('pop.site.darkExcludeBtn', null, 'Exclude')}
                                                    </span>
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    {/* Whitelist Header & Quick Add */}
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                                            {t('chrome.whitelistedDomainsLabel', null, 'Whitelisted Sites')}
                                        </span>
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isBright ? 'bg-black/[0.05] text-zinc-600' : 'bg-white/[0.06] text-white/55'}`}>
                                            {exclusionsList.length}
                                        </span>
                                    </div>

                                    <form onSubmit={handleQuickAdd} className="flex gap-1.5">
                                        <input
                                            type="text"
                                            value={darkPopoverInput}
                                            onChange={(e) => setDarkPopoverInput(e.target.value)}
                                            placeholder="domain.com or *.site.com"
                                            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl text-[11px] font-mono outline-none transition-colors border ${isBright
                                                    ? 'bg-black/[0.03] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent focus:bg-white/90'
                                                    : 'bg-white/[0.04] border-white/[0.08] text-white/90 placeholder-white/35 focus:border-accent/60'
                                                }`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!darkPopoverInput.trim()}
                                            className="px-2.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-xs transition cursor-pointer active:scale-95"
                                            title={t('cfg.common.add', null, 'Add')}
                                        >
                                            <Plus size={13} strokeWidth={2.5} />
                                        </button>
                                    </form>

                                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto hide-scroll">
                                        {exclusionsList.length === 0 ? (
                                            <span className={`text-[10px] italic py-0.5 ${isBright ? 'text-zinc-400' : 'text-white/35'}`}>
                                                {t('chrome.whitelistEmptyShort', null, 'No sites excluded')}
                                            </span>
                                        ) : (
                                            exclusionsList.map((domain) => (
                                                <span
                                                    key={domain}
                                                    className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-[10px] font-mono border ${isBright
                                                            ? 'bg-white/80 border-black/10 text-zinc-800'
                                                            : 'bg-white/[0.05] border-white/10 text-white/85'
                                                        }`}
                                                >
                                                    <span className="max-w-[140px] truncate">{domain}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDarkExclusion(domain)}
                                                        className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition cursor-pointer"
                                                        title={t('cfg.common.remove', null, 'Remove')}
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))
                                        )}
                                    </div>

                                    <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                resetDarkExclusions();
                                                showToast(t('cfg.appearance.whitelistResetToastShort', null, 'Restored default Smart Dark whitelist'));
                                            }}
                                            className={`inline-flex items-center gap-1 transition cursor-pointer ${isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/45 hover:text-white/85'}`}
                                        >
                                            <RotateCcw size={10} />
                                            <span>{t('cfg.appearance.whitelistResetBtn', null, 'Reset Defaults')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closePopover();
                                                setSettingsTab?.('appearance');
                                                openModal?.('settings');
                                            }}
                                            className={`font-semibold hover:underline transition cursor-pointer ${isBright ? 'text-amber-700' : 'text-accent'}`}
                                        >
                                            {t('chrome.manageWhitelistSettings', null, 'Manage in Settings')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {(activePopover === 'adblock' || (isPopoverClosing && activePopover === 'adblock')) && (
                <div
                    id="popover-adblock-container"
                    onClick={e => e.stopPropagation()}
                    style={{ ...adblockAnchor.style, ...getLiquidGlassInlineStyle(isBright) }}
                    className={`absolute z-[60] w-72 rounded-2xl overflow-hidden flex flex-col ${getLiquidGlassSurfaceClasses(isBright)} ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                >
                    <div className={`p-5 flex flex-col items-center justify-center border-b transition-colors duration-500 ${isBright
                            ? (isAdblockActive ? 'bg-emerald-500/10 border-black/[0.06]' : 'bg-black/[0.02] border-black/[0.06]')
                            : (isAdblockActive ? 'bg-green-500/10 border-white/[0.06]' : 'bg-white/[0.02] border-white/[0.06]')
                        }`}>
                        <ShieldAlert size={40} className={`mb-2 drop-shadow-md transition-colors ${isAdblockActive ? (isBright ? 'text-emerald-600' : 'text-green-400') : (isBright ? 'text-zinc-400' : 'text-white/25')}`} strokeWidth={1.5} />
                        <span
                            title={isAdblockActive
                                ? t('chrome.adblockCountTooltip', { count: Number(adblockStats.count || 0).toLocaleString(intlLocale) }, `${Number(adblockStats.count || 0).toLocaleString(intlLocale)} blocked trackers`)
                                : t('chrome.adblockInactive', null, 'Adblock inactive')}
                            className={`text-3xl font-black tracking-tight ${isAdblockActive ? (isBright ? 'text-zinc-900' : 'text-white') : (isBright ? 'text-zinc-500' : 'text-white/45')}`}
                        >
                            {isAdblockActive ? formatCompactNumber(adblockStats.count) : '0'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('chrome.blockedTrackers', null, 'Blocked Trackers')}</span>
                    </div>
                    <div className="p-4 bg-transparent flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold ${isBright ? 'text-zinc-900' : 'text-white/90'}`}>{t('chrome.nativeInterceptor', null, 'Native Interceptor')}</span>
                            <button onClick={() => setIsAdblockActive(!isAdblockActive)} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 cursor-pointer ${isAdblockActive ? 'bg-green-500' : (isBright ? 'bg-zinc-300' : 'bg-white/20')}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isAdblockActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                        <div className={`flex flex-col gap-1.5 text-[10px] font-mono transition-opacity duration-300 rounded-xl p-2.5 ${getLiquidGlassCardClasses(isBright)} ${isBright ? 'text-zinc-800' : 'text-white/85'
                            } ${isAdblockActive ? 'opacity-100' : 'opacity-30'}`}>
                            {adblockStats.domains.length === 0 && <div className={`text-center py-2 ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>{t('chrome.noTrackersBlocked', null, 'No trackers blocked yet')}</div>}
                            {adblockStats.domains.map((domain, i) => (
                                <div key={i} className="flex justify-between"><span className="truncate mr-2">{domain}</span><span className={`flex-shrink-0 font-semibold ${isBright ? 'text-red-600' : 'text-red-400'}`}>{t('chrome.blocked', null, 'Blocked')}</span></div>
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
                    id="popover-downloads-container"
                    onClick={e => e.stopPropagation()}
                    style={{ ...downloadsAnchor.style, ...getLiquidGlassInlineStyle(isBright) }}
                    className={`absolute z-[60] w-80 rounded-2xl overflow-hidden flex flex-col ${getLiquidGlassSurfaceClasses(isBright)} ${isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                >
                    <div className={`p-4 border-b flex items-center justify-between ${isBright ? 'border-black/[0.06] bg-black/[0.02] text-zinc-900' : 'border-white/[0.06] bg-white/[0.02] text-white'}`}>
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Download size={16} className="text-accent" /> {t('nav.downloads', null, 'Downloads')}
                        </div>
                        <button className={`px-2 py-1 rounded-lg transition text-xs font-medium cursor-pointer ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.06]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>{t('chrome.clearAll', null, 'Clear All')}</button>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        <div className={`p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden group transition ${getLiquidGlassCardClasses(isBright)}`}>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner ${isBright ? 'bg-blue-500/15 text-blue-600' : 'bg-blue-500/20 text-blue-400'}`}><Cpu size={14} /></div>
                                    <div className="flex flex-col truncate">
                                        <span className={`text-sm font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white/95'}`}>ubuntu-24.04-desktop.iso</span>
                                        <span className={`text-[10px] font-mono mt-0.5 ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>1.2 GB / 4.5 GB • 12 MB/s</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className={`p-1 rounded-lg transition cursor-pointer ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.06]' : 'text-white/60 hover:text-white hover:bg-white/10'}`} title={t('chrome.pause', null, 'Pause')}><Pause size={14} /></button>
                                    <button className={`p-1 rounded-lg transition cursor-pointer ${isBright ? 'text-red-600 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-500/15'}`} title={t('common.cancel', null, 'Cancel')}><XCircle size={14} /></button>
                                </div>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 relative z-10 border ${isBright ? 'bg-black/10 border-black/5' : 'bg-black/40 border-white/5'}`}>
                                <div className="h-full bg-accent w-[35%] rounded-full relative">
                                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className={`p-3 rounded-xl flex items-center justify-between transition group cursor-pointer mt-1 ${getLiquidGlassCardClasses(isBright)}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner ${isBright ? 'bg-emerald-500/15 text-emerald-600' : 'bg-green-500/20 text-green-400'}`}><FolderOpen size={14} /></div>
                                <div className="flex flex-col truncate">
                                    <span className={`text-sm font-medium truncate ${isBright ? 'text-zinc-800 group-hover:text-zinc-950' : 'text-white/85 group-hover:text-white'}`}>Q4_Financial_Report.pdf</span>
                                    <span className={`text-[10px] font-mono mt-0.5 ${isBright ? 'text-emerald-600' : 'text-emerald-400'}`}>{t('chrome.completed', null, 'Completed')} • 2.4 MB</span>
                                </div>
                            </div>
                            <button className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm cursor-pointer ${isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.06]' : 'text-white/60 hover:text-white hover:bg-white/10'}`} title={t('chrome.showInFolder', null, 'Show in folder')}>
                                <FolderOpen size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SavePasswordBanner />
            <LazyPopoverGate when={activePopover === 'vault' || (isPopoverClosing && activePopover === 'vault')}>
                <QVaultPopover isClosing={isPopoverClosing} />
            </LazyPopoverGate>
            <LazyPopoverGate when={activePopover === 'tor' || (isPopoverClosing && activePopover === 'tor')}>
                <TorCircuitPopover isClosing={isPopoverClosing} />
            </LazyPopoverGate>
            {((activePopover && activePopover !== 'user' && activePopover !== 'userProfile') || (isPopoverClosing && activePopover !== 'user' && activePopover !== 'userProfile')) && (
                <div className="absolute inset-0 z-[50] bg-transparent" onClick={closePopover} />
            )}

            {(() => {
                const isZenActive = isSpaceEmpty(activeSpace);
                const activeIndex = Math.max(0, visibleSpaces.findIndex(s => s.id === activeSpace));
                const slot0Rect = getSlotRectCss({
                    isSplitView,
                    splitOrientation,
                    isSplitLeft,
                    slotIndex: 0
                });
                const renderSplitActive = isSplitView || isSplitClosing;
                const effectiveSplitOrientation = isSplitView ? splitOrientation : closingSplitSnapshotRef.current.orientation;
                const effectiveSlots = isSplitView ? splitSlots : closingSplitSnapshotRef.current.slots;
                const effectiveIsVertical = effectiveSplitOrientation === 'vertical';
                const effectiveIsQuad = effectiveSplitOrientation === 'quad';
                const secondarySlotIndices = renderSplitActive
                    ? (effectiveIsQuad ? [1, 2, 3] : [1])
                    : [];
                const dividerXPercent = (!isQuadSplit && isSplitLeft) ? (100 - splitRatio) : splitRatio;
                const dividerYPercent = splitRatioY;
                const isMenuOpen = (isSplitMenuHovered || isSplitMenuPinned) && !isDraggingSplit;
                const activeAxisPct = isVerticalSplit ? splitRatioY : splitRatio;
                const activePreset = isQuadSplit
                    ? ([30, 50, 70].find(p => Math.abs(splitRatio - p) <= 4 && Math.abs(splitRatioY - p) <= 4) ?? null)
                    : ([30, 50, 70].find(p => Math.abs(activeAxisPct - p) <= 4) ?? null);
                const hasAnySecondaryTab = secondarySlotIndices.some(idx => Boolean(splitSlots[idx]));

                const pillOpaqueStyle = isBright
                    ? {
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        borderColor: 'rgba(0, 0, 0, 0.12)',
                        color: '#27272a',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)'
                    }
                    : {
                        backgroundColor: 'rgba(18, 19, 28, 0.96)',
                        borderColor: 'rgba(255, 255, 255, 0.14)',
                        color: 'rgba(255, 255, 255, 0.88)',
                        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.65)'
                    };

                return (
                    <div
                        ref={mainContainerRef}
                        className={`flex-1 min-w-0 relative transition-[color] duration-250 ease-out flex ${isBright ? 'text-zinc-900' : 'text-white'} pt-0`}
                    >
                        <div
                            id="qbrowse-viewport-frame"
                            ref={viewportFrameRef}
                            onScroll={(e) => {
                                if (e.currentTarget.scrollLeft !== 0) e.currentTarget.scrollLeft = 0;
                                if (e.currentTarget.scrollTop !== 0) e.currentTarget.scrollTop = 0;
                            }}
                            style={{
                                overflow: 'clip',
                                '--split-x': (isSplitView && (!isVerticalSplit || isQuadSplit)) ? `${splitRatio}%` : '100%',
                                '--split-y': (isSplitView && (isVerticalSplit || isQuadSplit)) ? `${splitRatioY}%` : '100%',
                                transition: (isDraggingSplit || isReducedMotion || isInstantSplitSwitch)
                                    ? 'border-radius 300ms ease, box-shadow 300ms ease, border-color 300ms ease'
                                    : 'border-radius 300ms ease, box-shadow 300ms ease, border-color 300ms ease, --split-x 500ms cubic-bezier(0.22,1,0.36,1), --split-y 500ms cubic-bezier(0.22,1,0.36,1)'
                            }}
                            className={`relative w-full h-full overflow-hidden ${isChromeHidden
                                    ? 'is-fullscreen-frame rounded-none border-transparent shadow-none !border-0 !shadow-none'
                                    : frameCurvature === 'square'
                                        ? `rounded-none !rounded-none ${isBright ? 'liquid-glass-bright' : 'liquid-glass-dark'}`
                                        : frameCurvature === 'cohesive'
                                            ? `rounded-2xl ${isBright ? 'liquid-glass-bright' : 'liquid-glass-dark'}`
                                            : uiScale === 'compact'
                                                ? `rounded-[1.25rem] ${isBright ? 'liquid-glass-bright' : 'liquid-glass-dark'}`
                                                : `rounded-[2rem] ${isBright ? 'liquid-glass-bright' : 'liquid-glass-dark'}`
                                }`}
                        >
                            <DownloadPopup />
                            <PermissionPromptPopup />
                            <FindInPageBar />
                            <ScreenshotBar />
                            <ElementEraserHUD />
                            <ReadAloudPlayer />
                            <SnippingOverlay />
                            <LazyPopoverGate when={isReaderOpen || isReaderClosing}>
                                <ReaderModeOverlay />
                            </LazyPopoverGate>
                            <BrowserDialogOverlay />

                            {/* UNIFIED FULL-VIEWPORT SPACES & WEBVIEW LAYER (ZERO RELOADS) */}
                            <div
                                ref={spacesLayerRef}
                                onClick={() => { if (isSplitView) setFocusedPane('left'); }}
                                onScroll={(e) => {
                                    if (e.currentTarget.scrollLeft !== 0) e.currentTarget.scrollLeft = 0;
                                    if (e.currentTarget.scrollTop !== 0) e.currentTarget.scrollTop = 0;
                                }}
                                style={{ contain: 'strict', overflow: 'clip' }}
                                className={`absolute inset-0 w-full h-full ${isDraggingSplit ? 'pointer-events-none select-none' : ''}`}
                            >
                                <div
                                    className={`absolute inset-y-0 left-0 flex ${isReducedMotion || isSwipeEnabled === false ? 'transition-none' : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
                                    style={{
                                        width: `${visibleSpaces.length * 100}%`,
                                        transform: `translateX(-${activeIndex * (100 / visibleSpaces.length)}%)`
                                    }}
                                >
                                    {[...visibleSpaces].sort((a, b) => String(a.id).localeCompare(String(b.id))).map(sp => {
                                        const isActive = activeSpace === sp.id;
                                        const isEmpty = isSpaceEmpty(sp.id);
                                        const isSpaceTor = sp.id === 'tor';
                                        const isSpaceGhost = sp.id === 'ghost';
                                        const visualOrder = visibleSpaces.findIndex(v => v.id === sp.id);
                                        const zenRect = (isActive && isSplitView) ? slot0Rect : { left: '0%', top: '0%', width: '100%', height: '100%' };

                                        return (
                                            <div
                                                key={sp.id}
                                                className={`flex-shrink-0 h-full flex flex-col items-center justify-center relative overflow-hidden ${isActive ? 'pointer-events-auto' : 'pointer-events-none select-none'
                                                    } ${isSpaceGhost || isSpaceTor ? 'text-white' : (!isBright ? 'text-white' : 'text-zinc-900')
                                                    }`}
                                                style={{ width: `${100 / visibleSpaces.length}%`, order: visualOrder >= 0 ? visualOrder : 0 }}
                                                aria-hidden={!isActive}
                                                {...(!isActive ? { inert: '' } : {})}
                                            >
                                                {isEmpty && (
                                                    <div
                                                        key="dash"
                                                        className={`absolute z-10 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                                                        style={{
                                                            left: zenRect.left,
                                                            top: zenRect.top,
                                                            width: zenRect.width,
                                                            height: zenRect.height,
                                                            transition: (isDraggingSplit || isSplitAxisAnimating || isReducedMotion)
                                                                ? 'none'
                                                                : 'left 340ms cubic-bezier(0.22,1,0.36,1), top 340ms cubic-bezier(0.22,1,0.36,1), width 340ms cubic-bezier(0.22,1,0.36,1), height 340ms cubic-bezier(0.22,1,0.36,1)'
                                                        }}
                                                    >
                                                        {renderZenDashboard(sp.id)}
                                                    </div>
                                                )}
                                                <div
                                                    key="bg"
                                                    className={`absolute inset-0 pointer-events-none z-0 ${isSpaceTor
                                                            ? 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08)_1px,transparent_1px)] opacity-30 invert'
                                                            : (isSpaceGhost
                                                                ? 'bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] opacity-20 invert'
                                                                : `bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_1px,transparent_1px)] ${!isBright ? 'opacity-20 invert' : ''}`)
                                                        }`}
                                                    style={{ backgroundSize: '24px 24px', opacity: isEmpty ? (isSpaceTor ? 0.3 : 1) : 0.2 }}
                                                />
                                                <div
                                                    key="wv"
                                                    className={`absolute inset-0 ${isReducedMotion ? 'transition-none' : 'transition-opacity duration-300'} ${isEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                                >
                                                    <WebViewContainer space={sp.id} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SECONDARY SPLIT PANE OVERLAYS (HEADER BARS & LAUNCHERS) */}
                            {secondarySlotIndices.map((slotIdx) => {
                                const slotTab = effectiveSlots[slotIdx] || null;
                                const rectCss = getSlotRectCss({
                                    isSplitView: renderSplitActive,
                                    splitOrientation: effectiveSplitOrientation,
                                    isSplitLeft,
                                    slotIndex: slotIdx
                                });
                                if (!rectCss.visible) return null;

                                const isSlotFocused = isSplitView && focusedSlotIndex === slotIdx;
                                const paneBarHeight = effectiveIsQuad ? 'h-[34px]' : 'h-[36px]';
                                const slotHeaderBg = isBright ? 'rgba(250, 250, 252, 0.96)' : 'rgba(16, 17, 24, 0.96)';
                                const slotHeaderBorder = isBright ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

                                return (
                                    <div
                                        key={`split-overlay-${slotIdx}-${splitFadeNonce}`}
                                        id={slotIdx === 1 ? 'tour-splitview-rightpane' : `qbrowse-split-pane-${slotIdx}`}
                                        onMouseDown={() => { if (isSplitView) setFocusedPane(slotIndexToFocusedPane(slotIdx)); }}
                                        style={{
                                            left: rectCss.left,
                                            top: rectCss.top,
                                            width: rectCss.width,
                                            height: rectCss.height,
                                            opacity: isSplitClosing ? 0 : 1,
                                            transform: isSplitClosing ? 'scale(0.96)' : 'scale(1)',
                                            transition: (isDraggingSplit || isSplitAxisAnimating || isReducedMotion)
                                                ? 'opacity 220ms ease-out, transform 300ms cubic-bezier(0.22,1,0.36,1)'
                                                : 'left 340ms cubic-bezier(0.22,1,0.36,1), top 340ms cubic-bezier(0.22,1,0.36,1), width 340ms cubic-bezier(0.22,1,0.36,1), height 340ms cubic-bezier(0.22,1,0.36,1), opacity 280ms ease-out, transform 300ms cubic-bezier(0.22,1,0.36,1)'
                                        }}
                                        className={`absolute z-20 overflow-hidden ${slotTab || isSplitClosing ? 'pointer-events-none' : 'pointer-events-auto'} ${(!isReducedMotion && splitFadeNonce > 0 && !isSplitClosing) ? 'animate-pane-fade-in' : ''}`}
                                    >
                                        {slotTab ? (
                                            /* Slim opaque pane header bar; webview below remains 100% interactive */
                                            <div
                                                style={{
                                                    backgroundColor: slotHeaderBg,
                                                    borderBottom: `1px solid ${slotHeaderBorder}`,
                                                    boxShadow: isSlotFocused ? 'inset 0 -1.5px 0 0 var(--accent)' : 'none'
                                                }}
                                                className={`pointer-events-auto ${paneBarHeight} px-3 flex items-center justify-between text-xs transition-colors ${isReducedMotion ? '' : 'animate-slide-down-fade'}`}
                                            >
                                                <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                                                    {isQuadSplit && (
                                                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isSlotFocused
                                                                ? 'bg-accent text-zinc-950'
                                                                : (isBright ? 'bg-black/[0.06] text-zinc-600' : 'bg-white/[0.08] text-white/60')
                                                            }`}>
                                                            P{slotIdx + 1}
                                                        </span>
                                                    )}
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isBright ? 'bg-black/[0.04] border-black/[0.08]' : 'bg-white/[0.06] border-white/10'
                                                        }`}>
                                                        {getSafeFaviconUrl(slotTab.url, settings, 32) ? (
                                                            <img
                                                                src={getSafeFaviconUrl(slotTab.url, settings, 32)}
                                                                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                                                onError={e => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <Globe size={11} className={isBright ? 'text-zinc-600' : 'text-white/55'} />
                                                        )}
                                                    </div>
                                                    <span className="font-semibold truncate text-xs">{slotTab.title}</span>
                                                    {!isQuadSplit && slotTab.url && (
                                                        <span className={`hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full border truncate max-w-[140px] ${isBright ? 'bg-black/[0.04] border-black/[0.08] text-zinc-600' : 'bg-white/[0.04] border-white/[0.06] text-white/55'
                                                            }`}>
                                                            {slotTab.url.replace(/^https?:\/\//, '').split('/')[0]}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleSwapPanes(e, 0, slotIdx)}
                                                        className={`w-6 h-6 rounded-full border transition active:scale-95 cursor-pointer flex items-center justify-center ${isBright
                                                                ? 'border-black/[0.08] bg-black/[0.03] text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06]'
                                                                : 'border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/75 hover:text-white'
                                                            }`}
                                                        title={t('chrome.swapPanesTooltip', null, 'Swap with Primary Pane')}
                                                    >
                                                        <ArrowLeftRight size={11} className="transition-transform duration-300 hover:rotate-180" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSplitPaneTabId(slotIdx, null);
                                                        }}
                                                        className={`w-6 h-6 rounded-full border transition active:scale-95 cursor-pointer flex items-center justify-center ${isBright
                                                                ? 'border-black/[0.08] bg-black/[0.03] text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.06]'
                                                                : 'border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/75 hover:text-white'
                                                            }`}
                                                        title={t('chrome.changeSplitTabTooltip', null, 'Change Split Tab')}
                                                    >
                                                        <Search size={11} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isQuadSplit) {
                                                                setSplitPaneTabId(slotIdx, null);
                                                            } else {
                                                                toggleSplitView();
                                                            }
                                                        }}
                                                        className={`w-6 h-6 rounded-full border transition active:scale-95 cursor-pointer flex items-center justify-center ${isBright
                                                                ? 'border-black/[0.08] bg-black/[0.03] text-zinc-700 hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/25'
                                                                : 'border-white/[0.08] hover:border-rose-500/30 bg-white/[0.04] hover:bg-rose-500/15 text-white/75 hover:text-rose-300'
                                                            }`}
                                                        title={isQuadSplit ? t('chrome.clearSplitSlotTooltip', null, 'Clear Pane') : t('chrome.closeSplitViewTooltip', null, 'Close Split View')}
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <React.Suspense fallback={null}>
                                                <SplitPaneLauncher
                                                    slotIdx={slotIdx}
                                                    isFocusedSlot={isSlotFocused}
                                                    isQuadSplit={isQuadSplit}
                                                    isVerticalSplit={isVerticalSplit}
                                                    isSplitLeft={isSplitLeft}
                                                    isBright={isBright}
                                                    isTor={isTor}
                                                    isDark={!isBright}
                                                    isReducedMotion={isReducedMotion}
                                                    zoomLevel={zoomLevel}
                                                    availableTabs={availableRightTabs}
                                                    settings={settings}
                                                    resolvedLanguage={resolvedLanguage}
                                                    onSelectTab={(tabId) => setSplitPaneTabId(slotIdx, tabId)}
                                                    onOpenUrl={(url, title) => handleOpenSplitUrl(url, slotIdx, title)}
                                                />
                                            </React.Suspense>
                                        )}
                                    </div>
                                );
                            })}

                            {/* FULLSCREEN MOUSE TRAP OVERLAY DURING DRAGGING */}
                            {isDraggingSplit && (
                                <div
                                    className={`fixed inset-0 z-[99999] select-none bg-transparent ${dragAxisRef.current === 'both'
                                            ? 'cursor-move'
                                            : (dragAxisRef.current === 'y' ? 'cursor-row-resize' : 'cursor-col-resize')
                                        }`}
                                />
                            )}

                            {/* RESIZABLE SPLIT HAIRLINES + SEGMENTED FLOATING PILLS */}
                            {renderSplitActive && (
                                <>
                                    {/* Vertical Divider Hairline (Horizontal & Quad) */}
                                    {(!effectiveIsVertical || effectiveIsQuad) && (
                                        <div
                                            onMouseDown={(e) => handleSplitMouseDown(e, 'x')}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                triggerSplitAxisAnim(520);
                                                setSplitRatio(50);
                                                if (isQuadSplit) setSplitRatioY(50);
                                                showToast(t('chrome.splitRatioReset', null, 'Split View: 50 / 50'));
                                            }}
                                            style={{
                                                left: 'var(--split-x, 50%)',
                                                opacity: isSplitClosing ? 0 : 1,
                                                pointerEvents: isSplitClosing ? 'none' : undefined,
                                                transition: 'opacity 280ms ease-out',
                                                ...(isSplitLeft && !effectiveIsQuad ? { left: 'calc(100% - var(--split-x, 50%))' } : {})
                                            }}
                                            className="absolute top-0 bottom-0 w-3 -ml-1.5 z-40 cursor-col-resize flex items-center justify-center group"
                                            title={t('chrome.dragResizeSplit', null, 'Drag to resize • Double-click to reset 50/50')}
                                        >
                                            <div className={`w-[1px] h-full pointer-events-none transition-all duration-200 ${isDraggingSplit
                                                    ? 'bg-accent shadow-[0_0_12px_var(--accent)]'
                                                    : (!isBright ? 'bg-white/[0.10] group-hover:bg-accent/70' : 'bg-black/[0.10] group-hover:bg-accent/70')
                                                }`} />
                                            {!effectiveIsQuad && (
                                                <div
                                                    onMouseEnter={openSplitMenuHover}
                                                    onMouseLeave={scheduleSplitMenuClose}
                                                    style={{
                                                        backgroundColor: isDraggingSplit ? 'var(--accent)' : (isBright ? 'rgba(255,255,255,0.95)' : 'rgba(20,21,30,0.95)'),
                                                        borderColor: isDraggingSplit ? 'var(--accent)' : (isBright ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.16)')
                                                    }}
                                                    className={`absolute w-4 h-10 rounded-full border flex items-center justify-center transition-transform duration-200 shadow-md ${isDraggingSplit ? 'text-zinc-950 scale-110 shadow-[0_0_20px_var(--accent)]' : 'hover:scale-105'
                                                        }`}
                                                >
                                                    <div className="flex flex-col gap-0.5 items-center pointer-events-none">
                                                        <div className="w-1 h-1 rounded-full bg-current opacity-65" />
                                                        <div className="w-1 h-1 rounded-full bg-current opacity-65" />
                                                        <div className="w-1 h-1 rounded-full bg-current opacity-65" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Horizontal Divider Hairline (Vertical & Quad) */}
                                    {(effectiveIsVertical || effectiveIsQuad) && (
                                        <div
                                            onMouseDown={(e) => handleSplitMouseDown(e, 'y')}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                triggerSplitAxisAnim(520);
                                                setSplitRatioY(50);
                                                if (isQuadSplit) setSplitRatio(50);
                                                showToast(t('chrome.splitRatioReset', null, 'Split View: 50 / 50'));
                                            }}
                                            style={{
                                                top: 'var(--split-y, 50%)',
                                                opacity: isSplitClosing ? 0 : 1,
                                                pointerEvents: isSplitClosing ? 'none' : undefined,
                                                transition: 'opacity 280ms ease-out'
                                            }}
                                            className="absolute left-0 right-0 h-3 -mt-1.5 z-40 cursor-row-resize flex items-center justify-center group"
                                            title={t('chrome.dragResizeSplit', null, 'Drag to resize • Double-click to reset 50/50')}
                                        >
                                            <div className={`h-[1px] w-full pointer-events-none transition-all duration-200 ${isDraggingSplit
                                                    ? 'bg-accent shadow-[0_0_12px_var(--accent)]'
                                                    : (!isBright ? 'bg-white/[0.10] group-hover:bg-accent/70' : 'bg-black/[0.10] group-hover:bg-accent/70')
                                                }`} />
                                            {!effectiveIsQuad && (
                                                <div
                                                    onMouseEnter={openSplitMenuHover}
                                                    onMouseLeave={scheduleSplitMenuClose}
                                                    style={{
                                                        backgroundColor: isDraggingSplit ? 'var(--accent)' : (isBright ? 'rgba(255,255,255,0.95)' : 'rgba(20,21,30,0.95)'),
                                                        borderColor: isDraggingSplit ? 'var(--accent)' : (isBright ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.16)')
                                                    }}
                                                    className={`absolute w-10 h-4 rounded-full border flex items-center justify-center transition-transform duration-200 shadow-md ${isDraggingSplit ? 'text-zinc-950 scale-110 shadow-[0_0_20px_var(--accent)]' : 'hover:scale-105'
                                                        }`}
                                                >
                                                    <div className="flex flex-row gap-0.5 items-center pointer-events-none">
                                                        <div className="w-1 h-1 rounded-full bg-current opacity-65" />
                                                        <div className="w-1 h-1 rounded-full bg-current opacity-65" />
                                                        <div className="w-1 h-1 rounded-full bg-current opacity-65" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Quad Center Crosshair Handle */}
                                    {effectiveIsQuad && (
                                        <div
                                            onMouseDown={(e) => handleSplitMouseDown(e, 'both')}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                triggerSplitAxisAnim(520);
                                                setSplitRatio(50);
                                                setSplitRatioY(50);
                                                showToast(t('chrome.splitRatioReset', null, 'Split View: 50 / 50'));
                                            }}
                                            onMouseEnter={openSplitMenuHover}
                                            onMouseLeave={scheduleSplitMenuClose}
                                            style={{
                                                left: 'var(--split-x, 50%)',
                                                top: 'var(--split-y, 50%)',
                                                opacity: isSplitClosing ? 0 : 1,
                                                pointerEvents: isSplitClosing ? 'none' : undefined,
                                                transition: 'opacity 280ms ease-out',
                                                backgroundColor: isDraggingSplit ? 'var(--accent)' : (isBright ? 'rgba(255,255,255,0.96)' : 'rgba(20,21,30,0.96)'),
                                                borderColor: isDraggingSplit ? 'var(--accent)' : (isBright ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.18)')
                                            }}
                                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border z-40 cursor-move flex items-center justify-center shadow-lg transition-transform duration-200 ${isDraggingSplit ? 'text-zinc-950 scale-110 shadow-[0_0_20px_var(--accent)]' : 'hover:scale-110'
                                                }`}
                                            title={t('chrome.dragResizeQuadTooltip', null, 'Drag to resize 2×2 grid • Click for options • Double-click to reset')}
                                        >
                                            <LayoutGrid size={12} className="pointer-events-none opacity-80" />
                                        </div>
                                    )}

                                    {/* Segmented Floating Split Divider Pills (2-Row Staggered Spring Stack) */}
                                    {isSplitView && !isSplitClosing && (
                                        <div
                                            onMouseEnter={openSplitMenuHover}
                                            onMouseLeave={scheduleSplitMenuClose}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            style={{
                                                left: isVerticalSplit ? '50%' : `clamp(100px, ${dividerXPercent}%, calc(100% - 100px))`,
                                                top: isVerticalSplit
                                                    ? `clamp(48px, calc(${dividerYPercent}% + 14px), calc(100% - 82px))`
                                                    : (isQuadSplit
                                                        ? `clamp(48px, calc(${dividerYPercent}% + 18px), calc(100% - 82px))`
                                                        : 'calc(50% + 22px)')
                                            }}
                                            className={`absolute -translate-x-1/2 z-50 pt-1.5 ${isMenuOpen
                                                    ? 'pointer-events-auto'
                                                    : 'pointer-events-none'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                {/* Row 1: Layout + Ratio SlidingPillSwitchers */}
                                                <div className={`flex items-center justify-center gap-1 transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMenuOpen
                                                        ? 'opacity-100 translate-y-0 scale-100'
                                                        : 'opacity-0 -translate-y-1.5 scale-95'
                                                    }`}>
                                                    <SlidingPillSwitcher
                                                        size="xs"
                                                        opaque
                                                        isBright={isBright}
                                                        value={splitOrientation}
                                                        onChange={handleSelectSplitLayout}
                                                        options={[
                                                            { id: 'horizontal', icon: SplitSquareHorizontal, title: t('chrome.splitHorizontalTooltip', null, 'Side-by-Side (2-Col)') },
                                                            { id: 'vertical', icon: SplitSquareVertical, title: t('chrome.splitVerticalTooltip', null, 'Stacked (2-Row)') },
                                                            { id: 'quad', icon: LayoutGrid, title: t('chrome.splitQuadTooltip', null, 'Quad Grid (2×2)') }
                                                        ]}
                                                    />

                                                    <SlidingPillSwitcher
                                                        size="xs"
                                                        opaque
                                                        allowNone
                                                        isBright={isBright}
                                                        className="font-mono"
                                                        value={activePreset}
                                                        onChange={(pct) => {
                                                            triggerSplitAxisAnim(520);
                                                            if (isQuadSplit) {
                                                                setSplitRatio(pct);
                                                                setSplitRatioY(pct);
                                                            } else if (isVerticalSplit) {
                                                                setSplitRatioY(pct);
                                                            } else {
                                                                setSplitRatio(pct);
                                                            }
                                                        }}
                                                        options={[
                                                            { id: 30, label: '30', title: '30 / 70' },
                                                            { id: 50, label: '50', title: t('chrome.splitResetTooltip', null, 'Reset 50/50') },
                                                            { id: 70, label: '70', title: '70 / 30' }
                                                        ]}
                                                    />
                                                </div>

                                                {/* Row 2: Centered Quick Actions Capsule (staggered 45ms reveal) */}
                                                <div
                                                    style={pillOpaqueStyle}
                                                    className={`h-7 flex items-center justify-center gap-0.5 p-0.5 rounded-full border transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMenuOpen
                                                            ? 'opacity-100 translate-y-0 scale-100 delay-[45ms]'
                                                            : 'opacity-0 -translate-y-1.5 scale-95 delay-0'
                                                        }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleSwapPanes(e, 0, 1)}
                                                        disabled={!hasAnySecondaryTab}
                                                        className={`group/btn w-6 h-6 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${isBright ? 'hover:bg-black/8 hover:text-zinc-950' : 'hover:bg-white/12 hover:text-white'
                                                            }`}
                                                        title={t('chrome.swapPanesTooltip', null, 'Swap Panes (Ctrl+Alt+\\)')}
                                                    >
                                                        <ArrowLeftRight size={11} className="transition-transform duration-300 group-hover/btn:rotate-180" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleReloadBothSplitPanes}
                                                        className={`group/btn w-6 h-6 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${isBright ? 'hover:bg-black/8 hover:text-zinc-950' : 'hover:bg-white/12 hover:text-white'
                                                            }`}
                                                        title={t('chrome.splitReloadBothTooltip', null, 'Reload All Panes')}
                                                    >
                                                        <RefreshCw size={11} className="transition-transform duration-300 group-hover/btn:rotate-90" />
                                                    </button>
                                                    {hasAnySecondaryTab && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handlePromoteSecondaryPane(e, splitSlots[1] ? 1 : ([2, 3].find(i => splitSlots[i]) || 1))}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${isBright ? 'hover:bg-black/8 hover:text-zinc-950' : 'hover:bg-white/12 hover:text-white'
                                                                }`}
                                                            title={t('chrome.splitKeepSecondaryTooltip', null, 'Focus Secondary as Full Tab')}
                                                        >
                                                            <Maximize size={11} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsSplitMenuPinned(false);
                                                            toggleSplitView();
                                                        }}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${isBright ? 'hover:bg-rose-500/15 hover:text-rose-600' : 'hover:bg-rose-500/20 hover:text-rose-300'
                                                            }`}
                                                        title={t('chrome.closeSplitViewTooltip', null, 'Close Split View')}
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {topBarPosition === 'bottom' && <TopBar />}

            {/* PEEK WINDOW */}
            {(peekWindow || isPeekClosing) && (
                <div
                    style={getLiquidGlassInlineStyle(isBright)}
                    className={`absolute inset-8 md:inset-20 z-[1000] flex flex-col rounded-2xl overflow-hidden ${getLiquidGlassSurfaceClasses(isBright)} ${isPeekClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                >
                    <button onClick={closePeek} className="absolute top-4 left-4 z-10 w-4 h-4 bg-red-500 hover:bg-red-400 text-transparent hover:text-white rounded-full flex items-center justify-center transition-colors shadow-sm group cursor-pointer">
                        <X size={10} className="opacity-0 group-hover:opacity-100" />
                    </button>
                    <div className={`flex-1 flex flex-col items-center justify-center relative ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                        <Globe size={32} className={isBright ? 'text-zinc-400 mb-4' : 'text-white/25 mb-4'} />
                        <span className={`text-sm font-bold uppercase tracking-widest ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('chrome.contentPreview', null, 'Content Preview')}</span>
                    </div>
                </div>
            )}

            {/* FLOATING ZOOM HUDS (Page Zoom & Canvas Zoom) */}
            <div className="absolute bottom-8 right-8 z-[9990] flex flex-col items-end gap-2 pointer-events-none">
                {/* CANVAS ZOOM HUD (Ctrl+Alt+Wheel / Ctrl+Alt++) */}
                <div className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCanvasZoomHUDVisible
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                    }`}>
                    <div
                        style={getLiquidGlassInlineStyle(isBright)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl transition-all ${getLiquidGlassSurfaceClasses(isBright)}`}
                    >
                        <ZoomIn size={14} className="text-accent" />
                        <span className={`text-xs font-semibold tracking-tight select-none ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                            {t('chrome.canvasZoom', null, 'Canvas Zoom:')} <span className="font-mono font-bold">{canvasZoomLevel}%</span>
                        </span>
                        {canvasZoomLevel !== 100 && (
                            <button
                                onClick={handleResetCanvasZoom}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent hover:bg-accent/30 transition ml-1 active:scale-95 flex items-center gap-1 cursor-pointer"
                                title={t('chrome.resetCanvasZoomTooltip', null, 'Reset Canvas Zoom (Ctrl+Alt+0)')}
                            >
                                <RotateCcw size={10} /> {t('common.reset', null, 'Reset')}
                            </button>
                        )}
                    </div>
                </div>

                {/* PAGE ZOOM HUD */}
                <div className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isZoomHUDVisible
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                    }`}>
                    <div
                        style={getLiquidGlassInlineStyle(isBright)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl transition-all ${getLiquidGlassSurfaceClasses(isBright)}`}
                    >
                        <ZoomIn size={14} className="text-accent" />
                        <span className={`text-xs font-bold font-mono tracking-tight min-w-[42px] text-center select-none ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                            {zoomLevel}%
                        </span>
                        <div className={`flex items-center gap-1 pl-2 border-l ${isBright ? 'border-black/10' : 'border-white/10'}`}>
                            <button
                                onClick={() => zoomOut()}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition active:scale-95 cursor-pointer ${isBright ? 'hover:bg-black/[0.06] text-zinc-800 hover:text-zinc-950' : 'hover:bg-white/10 text-white/85 hover:text-white'
                                    }`}
                                title={t('chrome.zoomOutTooltip', null, 'Zoom Out (Ctrl -)')}
                            >
                                -
                            </button>
                            <button
                                onClick={() => zoomIn()}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition active:scale-95 cursor-pointer ${isBright ? 'hover:bg-black/[0.06] text-zinc-800 hover:text-zinc-950' : 'hover:bg-white/10 text-white/85 hover:text-white'
                                    }`}
                                title={t('chrome.zoomInTooltip', null, 'Zoom In (Ctrl +)')}
                            >
                                +
                            </button>
                            {zoomLevel !== 100 && (
                                <button
                                    onClick={() => resetZoom()}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent hover:bg-accent/30 transition ml-1 active:scale-95 flex items-center gap-1 cursor-pointer"
                                    title={t('chrome.resetZoomCtrl0', null, 'Reset Zoom (Ctrl 0)')}
                                >
                                    <RotateCcw size={10} /> {t('common.reset', null, 'Reset')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TOAST POPUP (Minimalist Linear / Raycast Floating Bottom-Center Capsule - Portaled above modals) */}
            {(toast || isToastClosing) && typeof document !== 'undefined' && createPortal(
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        ...getLiquidGlassInlineStyle(isBright),
                        left: `${toastCenterX}px`,
                        bottom: '24px'
                    }}
                    className={`fixed -translate-x-1/2 z-[99999] px-4 py-2 !rounded-full text-xs font-medium ${getLiquidGlassSurfaceClasses(isBright)} ${isToastClosing ? 'animate-toast-out' : 'animate-toast'
                        } flex items-center gap-2.5 max-w-md pointer-events-none select-none tracking-wide ${isBright ? 'text-zinc-900' : 'text-white/95'
                        }`}
                >
                    {getToastIcon(toast, isBright)}
                    <span className="truncate leading-none">{typeof toast === 'object' && toast !== null ? (toast.message || toast.text || '') : toast}</span>
                </div>,
                document.body
            )}
        </main>
    );
}
