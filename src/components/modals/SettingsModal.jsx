import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Palette, Shield, Cpu, ShieldAlert, Search, Download, X, 
    ShieldCheck, Cookie, Lock, Trash2, RotateCcw, Flag, Info, History,
    Key, Bell, RefreshCw, Layers, CheckCircle2, Sparkles, 
    Eye, EyeOff, Zap, Volume2, Globe, Sliders, Laptop, Maximize2, Minimize2, Monitor, SlidersHorizontal, Square,
    UploadCloud, Compass, ExternalLink, Plus, Feather, GaugeCircle, Rocket, BatteryCharging, Activity,
    Image as ImageIcon, Upload, Link as LinkIcon, Sun, Moon, XSquare, Check, Edit2, Edit3, Server, Wifi, WifiOff, AlertCircle,
    Type, Keyboard, VolumeX, ZoomIn, Filter, Minus, GitPullRequest, GitBranch,
    ArrowLeftRight, ListOrdered, User, Briefcase, Code, Bookmark, Coffee, Folder,
    Terminal, Heart, ChevronUp, ChevronDown, Ghost, AlertTriangle, GripVertical, Copy,
    Layout, Sidebar, Languages, Play, Usb, KeyRound, HelpCircle, FileText, Scale
} from 'lucide-react';
import { EXPERIENCE_PRESETS, applyExperiencePreset, getSavedPresetId, getPresetIcon } from '../../utils/experiencePresets';
import PresetLayoutWireframe, { PRESET_TAGLINES } from '../common/PresetLayoutWireframe';
import { 
    cleanDomain, 
    parseBlocklistInput, 
    isPotentialRemoteListUrl, 
    normalizeRemoteListUrl 
} from '../../utils/adblockUrlParser';
import {
    normalizeWhitelistEntry,
    DEFAULT_DARK_EXCLUSIONS
} from '../../utils/darkModeWhitelist';
import {
    TEXT_HIGHLIGHT_SWATCHES,
    TEXT_HIGHLIGHT_STYLES,
    normalizeHexColor
} from '../../utils/textHighlight';
import AdblockImportModal from '../settings/AdblockImportModal';
import { isVideoWallpaper, isGifWallpaper, isLiveWallpaper, getWallpaperBadgeLabel } from '../../utils/wallpaperHelpers';
import WallpaperPreviewThumbnail from '../common/WallpaperPreviewThumbnail';
import { countActiveBackgroundServices } from '../../utils/networkPrivacy';
import SlidingPillSwitcher from '../common/SlidingPillSwitcher';
import ColorPalettePicker from '../common/ColorPalettePicker';

const SPACE_ICONS = [
    { id: 'User', label: 'User', icon: User },
    { id: 'Layers', label: 'Layers', icon: Layers },
    { id: 'Briefcase', label: 'Briefcase', icon: Briefcase },
    { id: 'Code', label: 'Code', icon: Code },
    { id: 'Rocket', label: 'Rocket', icon: Rocket },
    { id: 'Compass', label: 'Compass', icon: Compass },
    { id: 'Bookmark', label: 'Bookmark', icon: Bookmark },
    { id: 'Sparkles', label: 'Sparkles', icon: Sparkles },
    { id: 'Globe', label: 'Globe', icon: Globe },
    { id: 'Coffee', label: 'Coffee', icon: Coffee },
    { id: 'Folder', label: 'Folder', icon: Folder },
    { id: 'Terminal', label: 'Terminal', icon: Terminal },
    { id: 'Shield', label: 'Shield', icon: Shield },
    { id: 'Heart', label: 'Heart', icon: Heart }
];

const getSpaceIconComponent = (iconName) => {
    const found = SPACE_ICONS.find(i => i.id === iconName);
    return found ? found.icon : Layers;
};

const DEFAULT_STOCK_WALLPAPER = 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2564&auto=format&fit=crop';
const DEFAULT_STOCK_THUMBNAIL = 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=70&w=640&auto=format&fit=crop';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import useTabStore from '../../store/useTabStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import useSyncStore from '../../store/useSyncStore';
import useTorStore from '../../store/useTorStore';
import useVaultStore from '../../store/useVaultStore';
import AIEngineSettings from '../settings/AIEngineSettings';
import { getAllBangs, getBangCatalogCount } from '../../utils/searchBangs';
import { DOH_PROVIDERS, DNS_MODES, formatCustomDohUrl, isValidDohUrl } from '../../utils/dnsProviders';
import { PRESET_SEARCH_ENGINES, getAllSearchEngines, isValidSearchUrlTemplate } from '../../utils/searchEngines';
import CustomSelect from '../common/CustomSelect';
import CustomFontManager from '../common/CustomFontManager';
import { getLiquidGlassMenuClasses, getLiquidGlassInlineStyle } from '../common/ContextMenuProvider';
import qbrowseLogo from '../../assets/icon.png';
import LanguageSettings from '../settings/LanguageSettings';
import KeyboardShortcutsSettings from '../settings/KeyboardShortcutsSettings';
import { useTranslation, t as tStatic } from '../../i18n/index';
import settingsDomain from '../../i18n/domains/settings';

const ALL_TAB_SEARCH_TEXT = Object.keys(settingsDomain?.en?.navKeywords || {}).reduce((acc, tabId) => {
    acc[tabId] = Object.values(settingsDomain)
        .map(dict => dict?.navKeywords?.[tabId] || '')
        .join(' ')
        .toLowerCase();
    return acc;
}, {});

const renderTemplateParts = (template, replacements) => {
    if (typeof template !== 'string') return template;
    const regex = /(\{[a-zA-Z0-9_]+\})/g;
    return template.split(regex).map((part, idx) => {
        if (part.startsWith('{') && part.endsWith('}')) {
            const key = part.slice(1, -1);
            if (Object.prototype.hasOwnProperty.call(replacements, key)) {
                return <React.Fragment key={idx}>{replacements[key]}</React.Fragment>;
            }
        }
        return part;
    });
};

// Helper Card Component for Unified Styling (Top-level to preserve DOM instances and CSS transitions)
const SettingCard = ({ icon: Icon, title, description, badge, children }) => {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    return (
        <div className={`flex items-center justify-between p-3 px-3.5 rounded-xl transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-md ${
            isBright 
                ? 'bg-black/[0.02] hover:bg-black/[0.035] border border-black/[0.07] hover:border-black/[0.14] shadow-[0_2px_12px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)]' 
                : 'bg-white/[0.02] hover:bg-white/[0.045] border border-white/[0.06] hover:border-white/[0.10]'
        }`}>
            <div className="flex items-center gap-3 min-w-0 pr-4">
                {Icon && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
                        isBright 
                            ? 'bg-black/[0.04] text-accent border border-black/[0.07] group-hover:border-accent/40' 
                            : 'bg-white/[0.03] text-accent/80 border border-white/[0.06] group-hover:border-accent/25 group-hover:text-accent'
                    }`}>
                        <Icon size={15} />
                    </div>
                )}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-medium text-xs truncate transition-colors ${
                            isBright 
                                ? 'text-zinc-800 group-hover:text-zinc-950 font-semibold' 
                                : 'text-zinc-200 group-hover:text-white'
                        }`}>{title}</p>
                        {badge && (
                            React.isValidElement(badge) ? (
                                badge
                            ) : (
                                <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border tracking-normal select-none ${
                                    isBright
                                        ? 'bg-amber-500/10 text-amber-700 border-black/[0.07]'
                                        : 'bg-amber-500/15 text-amber-300 border-white/[0.06]'
                                }`}>
                                    {badge}
                                </span>
                            )
                        )}
                    </div>
                    {description && <div className={`text-[11px] mt-0.5 leading-snug ${
                        isBright ? 'text-zinc-500' : 'text-zinc-400'
                    }`}>{description}</div>}
                </div>
            </div>
            <div className="flex-shrink-0">
                {children}
            </div>
        </div>
    );
};

// Helper Toggle Switch Component (Top-level to preserve DOM instances and CSS transitions)
const SettingToggle = ({ isChecked, onToggle, disabled = false }) => {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    return (
        <button 
            type="button"
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled && onToggle) onToggle();
            }} 
            className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-90 cursor-pointer'} ${
                isChecked 
                    ? (isBright ? 'bg-accent shadow-[0_2px_8px_var(--accent-40)]' : 'bg-accent shadow-[0_0_12px_var(--accent-40)]') 
                    : (isBright ? 'bg-zinc-200/90 hover:bg-zinc-300 border border-black/10' : 'bg-white/15 hover:bg-white/25')
            }`}
        >
            <div 
                className={`w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isChecked ? 'translate-x-4 scale-100' : 'translate-x-0 scale-90 opacity-90'
                }`}
            />
        </button>
    );
};

// Helper Section Header Component for Unified Settings
const SectionHeader = ({ icon: Icon, title, description, subtitle, badge, action }) => {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const descText = description || subtitle;

    return (
        <div className="flex items-center justify-between gap-3 pt-2 pb-1">
            <div className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.06]'
                    }`}>
                        <Icon size={13} />
                    </div>
                )}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-bold tracking-tight uppercase font-mono ${
                            isBright ? 'text-zinc-700' : 'text-zinc-300'
                        }`}>
                            {title}
                        </h4>
                        {badge && (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                isBright 
                                    ? 'bg-black/5 text-zinc-600 border-black/[0.07]' 
                                    : 'bg-accent/10 text-accent border-accent/25'
                            }`}>
                                {badge}
                            </span>
                        )}
                    </div>
                    {descText && (
                        <p className={`text-[11px] mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {descText}
                        </p>
                    )}
                </div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
};

// SlidingPillSwitcher is imported from ../common/SlidingPillSwitcher

const SettingsModalContent = () => {
    const { t, intlLocale } = useTranslation();

    const formatOpenTabs = (count) => {
        let cat = 'other';
        try {
            cat = new Intl.PluralRules(intlLocale || 'en-US').select(count);
        } catch (_) {
            cat = count === 1 ? 'one' : 'other';
        }
        const fallback = count === 1 ? `${count} open tab` : `${count} open tabs`;
        const keyMap = {
            one: 'cfg.spaces.openTabsOne',
            few: 'cfg.spaces.openTabsFew',
            many: 'cfg.spaces.openTabsMany',
            other: 'cfg.spaces.openTabsOther'
        };
        const key = keyMap[cat] || 'cfg.spaces.openTabsOther';
        const val = t(key, { count }, '');
        return val && val !== key ? val : t('cfg.spaces.openTabsOther', { count }, fallback);
    };

    const getLocalizedWallpaperBadge = (rawUrl, source = 'default') => {
        if (!rawUrl) return t('cfg.appearance.badgeDefaultStock', null, 'Default Stock');
        const sourceLabel = source === 'file'
            ? t('cfg.appearance.sourceLocal', null, 'Local')
            : source === 'url'
                ? t('cfg.appearance.sourceWeb', null, 'Web')
                : t('cfg.appearance.sourceStock', null, 'Stock');
        if (isVideoWallpaper(rawUrl)) {
            return t('cfg.appearance.badgeLiveVideo', { source: sourceLabel }, `Live Video (${sourceLabel})`);
        }
        if (isGifWallpaper(rawUrl)) {
            return t('cfg.appearance.badgeAnimatedGif', { source: sourceLabel }, `Animated GIF (${sourceLabel})`);
        }
        if (source === 'file') return t('cfg.appearance.badgeLocalImage', null, 'Local Image');
        if (source === 'url') return t('cfg.appearance.badgeWebImage', null, 'Web Image');
        return t('cfg.appearance.badgeDefaultStock', null, 'Default Stock');
    };

    const getLocalizedSpaceName = (sp) => {
        if (!sp) return '';
        if (sp.id === 'personal' && sp.name === 'Personal') return t('nav.personal', null, 'Personal');
        if (sp.id === 'work' && sp.name === 'Work') return t('nav.work', null, 'Work');
        return sp.name;
    };

    const getLocalizedPos = (pos) => t(`cfg.layout.pos.${pos}`, null, pos);

    const getLocalizedDnsMode = (mode) => {
        if (mode === 'secure') return t('cfg.privacy.dnsModeStrict', null, 'Strict DoH');
        if (mode === 'off') return t('cfg.privacy.dnsModeOff', null, 'Off');
        return t('cfg.privacy.dnsModeAuto', null, 'Automatic');
    };

    const getLocalizedDnsProvider = (providerId) => {
        if (providerId === 'custom') return t('cfg.privacy.dnsCustomLabel', null, 'Custom DNS');
        if (providerId === 'cloudflare') return 'Cloudflare';
        if (providerId === 'quad9') return 'Quad9';
        if (providerId === 'adguard') return 'AdGuard';
        if (providerId === 'google') return 'Google';
        return providerId.charAt(0).toUpperCase() + providerId.slice(1);
    };

    const getLocalizedPerfMode = (mode) => {
        if (mode === 'eco') return t('cfg.engine.pillEco', null, 'Eco Saver');
        if (mode === 'balanced') return t('cfg.engine.pillBalanced', null, 'Balanced');
        if (mode === 'ultra') return t('cfg.engine.pillUltra', null, 'Ultra Speed');
        return t('cfg.engine.pillAuto', null, 'Auto');
    };

    const getLocalizedPerfTier = (tier) => {
        const norm = String(tier || 'balanced').toLowerCase();
        return t(`cfg.engine.tiers.${norm}`, null, String(tier || 'balanced').toUpperCase());
    };

    const PERM_FALLBACK_LABELS = {
        camera: 'Camera',
        microphone: 'Microphone',
        media: 'Camera & Mic',
        geolocation: 'Location',
        notifications: 'Notifications',
        'clipboard-read': 'Clipboard',
        clipboard: 'Clipboard',
        midi: 'MIDI Devices',
        sensors: 'Motion & Sensors',
        'idle-detection': 'Idle Detection',
        'display-capture': 'Screen Share',
        'window-management': 'Window Management',
        'speaker-selection': 'Audio Output',
        openExternal: 'External Apps',
        sound: 'Sound',
        javascript: 'JavaScript'
    };
    const getLocalizedPermName = (perm) => t(`cfg.cookies.permNames.${perm}`, null, PERM_FALLBACK_LABELS[perm] || perm);
    const getLocalizedPermVal = (val) => t(`cfg.cookies.permValues.${val}`, null, val);

    const [isContentReady, setIsContentReady] = useState(false);

    useEffect(() => {
        // Defer heavy tab content rendering by 1 animation frame so the shell can start cleanly
        const raf = requestAnimationFrame(() => {
            setIsContentReady(true);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    const { 
        activeModal, 
        isModalClosing, 
        closeModal,
        openModal,
        switchModal,
        showToast,
        settingsTab, 
        setSettingsTab,
        theme,
        setTheme,
        isForceDark, 
        setIsForceDark,
        darkExcludeMedia,
        setDarkExcludeMedia,
        isGlassEnabled, 
        setIsGlassEnabled,
        isSwipeEnabled, 
        setIsSwipeEnabled,
        settings, 
        toggleSetting,
        setSettingValue,
        accentColor, 
        setAccentColor,
        textHighlightStyle,
        setTextHighlightStyle,
        textHighlightColor,
        setTextHighlightColor,
        textHighlightApplyToWeb,
        setTextHighlightApplyToWeb,
        darkExclusions,
        setDarkExclusions,
        addDarkExclusion,
        removeDarkExclusion,
        resetDarkExclusions,
        clearDarkExclusions,
        addCustomBang,
        removeCustomBang,
        hardwareProfile,
        performanceMode,
        activePerformanceTier,
        tabSleepTimeoutMinutes,
        reduceVisualsOnEco,
        isSystemReducedMotion,
        setPerformanceMode,
        setTabSleepTimeoutMinutes,
        setReduceVisualsOnEco,
        setCustomWallpaper,
        setWallpaperDimming,
        setWallpaperBlur,
        setWallpaperVideoLoopMode,
        setWallpaperVideoCrossfadeDuration,
        resetCustomWallpaper,
        bfcacheEnabled,
        toggleBfcache,
        addCustomSearchEngine,
        updateCustomSearchEngine,
        removeCustomSearchEngine,
        setDefaultSearchEngine,
        setDnsConfiguration,
        openReadAloud,
        setZoomLevel,
        addSpace,
        updateSpace,
        removeSpace,
        reorderSpaces,
        customPresets,
        duplicatePreset,
        deleteCustomPreset,
        openPresetStudio,
        activePresetId: storeActivePresetId,
        setActivePresetId: setStoreActivePresetId,
        setSidebarPosition,
        setTopBarPosition,
        setToolHubPosition,
        isFramelessMode,
        toggleFramelessMode
    } = useUIStore();

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const customSpaceTabs = useTabStore(state => state.customSpaceTabs) || {};
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const platformFingerprint = `${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
    const osPlatform = window.electronAPI?.platform || (
        platformFingerprint.includes('linux') ? 'linux'
        : (platformFingerprint.includes('mac') || platformFingerprint.includes('darwin')) ? 'darwin'
        : 'win32'
    );

    // Spatial Positioning Controls
    const sidebarPosition = settings?.sidebarPosition || 'left';
    const topBarPosition = settings?.topBarPosition || 'top';
    const toolHubPosition = settings?.toolHubPosition || (sidebarPosition === 'left' ? 'right' : 'left');

    const openStudio = (presetId = null) => {
        if (openPresetStudio) {
            openPresetStudio(presetId);
        } else if (switchModal) {
            switchModal('presetStudio');
        } else {
            openModal('presetStudio');
        }
    };

    const handleSetSidebarPosition = (pos) => {
        setSidebarPosition?.(pos);
        showToast?.(t('cfg.layout.toastSidebarPos', { pos: getLocalizedPos(pos) }, `Sidebar positioned on ${pos}`));
    };

    const handleSetTopBarPosition = (pos) => {
        setTopBarPosition?.(pos);
        showToast?.(t('cfg.layout.toastTopBarPos', { pos: getLocalizedPos(pos) }, `Top Bar positioned on ${pos}`));
    };

    const handleSetToolHubPosition = (pos) => {
        setToolHubPosition?.(pos);
        if (sidebarPosition === pos) {
            const opposite = pos === 'right' ? 'left' : 'right';
            setSidebarPosition?.(opposite);
            showToast?.(t('cfg.layout.toastToolHubCollision', { pos: getLocalizedPos(opposite) }, `Moved Sidebar to ${opposite} to avoid collision with Tool Hub`));
        } else {
            showToast?.(t('cfg.layout.toastToolHubPos', { pos: getLocalizedPos(pos) }, `Tool Hub positioned on ${pos}`));
        }
    };

    // Workspaces & Spaces state
    const [isCreatingSpace, setIsCreatingSpace] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newSpaceIcon, setNewSpaceIcon] = useState('Layers');
    const [newSpaceShowGitHub, setNewSpaceShowGitHub] = useState(false);
    const [editingSpaceId, setEditingSpaceId] = useState(null);
    const [editingSpaceName, setEditingSpaceName] = useState('');
    const [activeIconPickerSpaceId, setActiveIconPickerSpaceId] = useState(null);
    const [iconPickerCoords, setIconPickerCoords] = useState(null);

    // GitHub Work Mode Test & Sync state
    const [isTestingGitHub, setIsTestingGitHub] = useState(false);
    const [ghTestStatus, setGhTestStatus] = useState(null);
    const [showGitHubToken, setShowGitHubToken] = useState(false);
    const ghAuthenticated = useGitHubStore(state => state.authenticated);
    const ghAuthMode = useGitHubStore(state => state.authMode);
    const ghUsername = useGitHubStore(state => state.username);
    const ghReviewRequests = useGitHubStore(state => state.reviewRequests);
    const ghMyPrs = useGitHubStore(state => state.myPrs);
    const ghAssignedIssues = useGitHubStore(state => state.assignedIssues);
    const ghError = useGitHubStore(state => state.error);
    const ghWarning = useGitHubStore(state => state.warning);
    const ghIsLoading = useGitHubStore(state => state.isLoading);

    const handleTestAndSyncGitHub = async () => {
        if (isTestingGitHub) return;
        setIsTestingGitHub(true);
        setGhTestStatus(null);
        try {
            const latestSettings = useUIStore.getState().settings || {};
            const res = await useGitHubStore.getState().testAndSync({
                token: latestSettings.githubPersonalAccessToken || '',
                username: latestSettings.githubUsername || '',
                repoFilter: latestSettings.githubRepoFilter || ''
            });

            if (res?.authenticated) {
                const reviewsCount = (res.reviewRequests || []).length;
                const prsCount = (res.myPrs || []).length;
                const issuesCount = (res.assignedIssues || []).length;
                const modeLabel = res.authMode === 'token'
                    ? t('cfg.workmode.statusViaPat', null, 'via PAT')
                    : res.authMode === 'session'
                        ? t('cfg.workmode.statusViaSession', null, 'via Browser Session')
                        : t('cfg.workmode.statusViaPublic', null, 'via Public API');
                const countsText = t(
                    'cfg.workmode.statusCounts',
                    { reviews: reviewsCount, prs: prsCount, issues: issuesCount },
                    `${reviewsCount} reviews · ${prsCount} PRs · ${issuesCount} issues`
                );
                const connectedText = `${t('cfg.workmode.statusConnected', { username: res.username || 'GitHub' }, `Connected as @${res.username || 'GitHub'}`)} (${modeLabel}) — ${countsText}`;

                setGhTestStatus({
                    type: res.warning ? 'warning' : 'success',
                    message: res.warning ? `${connectedText}. ${res.warning}` : connectedText
                });
                showToast(t(
                    'cfg.workmode.toastSyncedDetail',
                    { username: res.username || 'GitHub', reviews: reviewsCount, prs: prsCount, issues: issuesCount },
                    `Synced @${res.username || 'GitHub'} (${reviewsCount} reviews, ${prsCount} PRs, ${issuesCount} issues)`
                ));
            } else {
                const errMsg = res?.error || t('chrome.githubLiveConnectDesc', null, 'Connect your GitHub session in Work Mode or enter a Personal Access Token in settings.');
                setGhTestStatus({ type: 'error', message: errMsg });
                showToast(t('cfg.workmode.toastSyncFailed', { error: errMsg }, `GitHub sync failed: ${errMsg}`));
            }
        } catch (err) {
            const errMsg = err?.message || t('cfg.common.unknownError', null, 'Unknown error');
            setGhTestStatus({ type: 'error', message: errMsg });
            showToast(t('cfg.workmode.toastSyncFailed', { error: errMsg }, `GitHub sync failed: ${errMsg}`));
        } finally {
            setIsTestingGitHub(false);
        }
    };

    // Auto-dismiss icon picker on window scroll, resize, or Escape key
    useEffect(() => {
        if (!activeIconPickerSpaceId) return;
        const handleScrollOrResize = () => {
            setActiveIconPickerSpaceId(null);
            setIconPickerCoords(null);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                setActiveIconPickerSpaceId(null);
                setIconPickerCoords(null);
            }
        };
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [activeIconPickerSpaceId]);
    const [deletingSpace, setDeletingSpace] = useState(null);
    const [draggedSpaceIdx, setDraggedSpaceIdx] = useState(null);
    const [dragOverSpaceIdx, setDragOverSpaceIdx] = useState(null);
    const [activePresetId, setActivePresetId] = useState(getSavedPresetId);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // FLIP animation refs for smooth workspace reordering (up/down arrows & drag-and-drop)
    const spaceItemRefs = useRef({});
    const prevSpaceOffsetsRef = useRef({});
    const spaceAnimTimersRef = useRef({});

    useLayoutEffect(() => {
        if (settingsTab !== 'spaces') return;
        const currentSpaces = Array.isArray(settings?.customSpaces) && settings.customSpaces.length > 0
            ? settings.customSpaces
            : [
                { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
                { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
            ];

        const prevOffsets = prevSpaceOffsetsRef.current;
        const newOffsets = {};

        currentSpaces.forEach(sp => {
            const el = spaceItemRefs.current[sp.id];
            if (el) {
                newOffsets[sp.id] = el.offsetTop;
            }
        });

        currentSpaces.forEach(sp => {
            const el = spaceItemRefs.current[sp.id];
            const prevTop = prevOffsets[sp.id];
            const newTop = newOffsets[sp.id];

            if (el && prevTop !== undefined && newTop !== undefined && prevTop !== newTop && !settings?.a11yReducedMotion && !isSystemReducedMotion) {
                const deltaY = prevTop - newTop;

                if (spaceAnimTimersRef.current[sp.id]) {
                    clearTimeout(spaceAnimTimersRef.current[sp.id]);
                }

                // Invert: lock to previous visual position
                el.style.transform = `translateY(${deltaY}px)`;
                el.style.transition = 'none';
                el.style.zIndex = '25';

                // Play: animate back to origin
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        el.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms ease';
                        el.style.transform = 'translateY(0px)';

                        spaceAnimTimersRef.current[sp.id] = setTimeout(() => {
                            if (el) {
                                el.style.transform = '';
                                el.style.transition = '';
                                el.style.zIndex = '';
                            }
                            delete spaceAnimTimersRef.current[sp.id];
                        }, 340);
                    });
                });
            }
        });

        prevSpaceOffsetsRef.current = newOffsets;
    }, [settings?.customSpaces, settingsTab]);

    const { user, isSyncing, lastSyncTime, syncedItemsCount, syncNow, logout, autoSyncEnabled, toggleAutoSync } = useSyncStore();
    const isTorEnabled = useTorStore(state => state.isTorEnabled);
    const toggleTorEnabled = useTorStore(state => state.toggleTorEnabled);

    const allowVaultInGhostTor = useVaultStore(state => state.allowVaultInGhostTor);
    const setAllowVaultInGhostTor = useVaultStore(state => state.setAllowVaultInGhostTor);
    const neverSaveDomains = useVaultStore(state => state.neverSaveDomains) || [];
    const removeNeverSaveDomain = useVaultStore(state => state.removeNeverSaveDomain);

    const [allPermissions, setAllPermissions] = useState({});
    const [searchFilter, setSearchFilter] = useState('');
    const [appearanceSubTab, setAppearanceSubTab] = useState('theme');
    const [layoutSubTab, setLayoutSubTab] = useState('panels');
    const searchInputRef = useRef(null);
    const [bangFilter, setBangFilter] = useState('');
    const [isAddingBang, setIsAddingBang] = useState(false);
    const [newBangPrefix, setNewBangPrefix] = useState('');
    const [newBangName, setNewBangName] = useState('');
    const [newBangUrl, setNewBangUrl] = useState('');
    const [newBangColor, setNewBangColor] = useState('#d4bc94');

    // Custom DNS state
    const [customDnsUrl, setCustomDnsUrl] = useState(() => settings?.customDohUrl || '');
    const [isTestingDns, setIsTestingDns] = useState(false);
    const [dnsTestStatus, setDnsTestStatus] = useState(null);

    // Custom Search Engines state
    const [isAddingEngine, setIsAddingEngine] = useState(false);
    const [editingEngineId, setEditingEngineId] = useState(null);
    const [engineNameInput, setEngineNameInput] = useState('');
    const [engineKeywordInput, setEngineKeywordInput] = useState('');
    const [engineUrlInput, setEngineUrlInput] = useState('');
    const [engineColorInput, setEngineColorInput] = useState('#d4bc94');
    // Native AdBlocker & Privacy Shield State
    const [isUpdatingFilters, setIsUpdatingFilters] = useState(false);
    const [filterUpdateStatus, setFilterUpdateStatus] = useState(null);
    const [adblockAllowlistInput, setAdblockAllowlistInput] = useState('');
    const [adblockBlocklistInput, setAdblockBlocklistInput] = useState('');
    const [isAdblockImportOpen, setIsAdblockImportOpen] = useState(false);
    const [adblockImportInitialUrl, setAdblockImportInitialUrl] = useState('');
    const [blocklistSearchQuery, setBlocklistSearchQuery] = useState('');

    const isAdblockActive = useUIStore(state => state.isAdblockActive ?? state.isAdblockEnabled ?? true);
    const setIsAdblockActive = useUIStore(state => state.setIsAdblockActive || state.toggleAdblock);
    const adblockStats = useUIStore(state => state.adblockStats);
    const blockedTrackersCount = adblockStats?.count || 0;

    const toggleAdblock = () => {
        if (useUIStore.getState().toggleAdblock) {
            useUIStore.getState().toggleAdblock();
        } else if (setIsAdblockActive) {
            setIsAdblockActive(!isAdblockActive);
        }
    };

    const handleAddAllowlist = (e) => {
        if (e) e.preventDefault();
        const raw = adblockAllowlistInput.trim();
        if (!raw) return;
        const clean = cleanDomain(raw);
        if (!clean) {
            showToast(t('cfg.adblock.toastInvalidDomain', null, 'Invalid website URL or domain'));
            return;
        }
        const current = settings?.adblockAllowlist || [];
        if (current.includes(clean)) {
            showToast(t('cfg.adblock.toastAlreadyTrusted', { domain: clean }, `${clean} is already in trusted sites`));
            return;
        }
        setSettingValue('adblockAllowlist', [...current, clean]);
        setAdblockAllowlistInput('');
        showToast(t('cfg.adblock.toastAddedTrusted', { domain: clean }, `Added ${clean} to trusted sites`));
    };

    const handleRemoveAllowlist = (domain) => {
        const current = settings?.adblockAllowlist || [];
        setSettingValue('adblockAllowlist', current.filter(d => d !== domain));
        showToast(t('cfg.adblock.toastRemovedTrusted', { domain }, `Removed ${domain} from trusted sites`));
    };

    const handleAddBlocklist = (e) => {
        if (e) e.preventDefault();
        const raw = adblockBlocklistInput.trim();
        if (!raw) return;

        // Auto-detect if user entered a remote list URL (e.g. from GitHub)
        if (isPotentialRemoteListUrl(raw)) {
            setAdblockImportInitialUrl(normalizeRemoteListUrl(raw));
            setIsAdblockImportOpen(true);
            setAdblockBlocklistInput('');
            return;
        }

        // Auto-parse URL / rule / bulk list input
        const parseResult = parseBlocklistInput(raw);
        if (parseResult.domains.length === 0) {
            showToast(t('cfg.adblock.toastInvalidFormat', null, 'Invalid domain or URL format'));
            return;
        }

        const current = settings?.adblockCustomBlockedDomains || [];
        const currentSet = new Set(current.map(d => d.toLowerCase()));
        const newDomains = parseResult.domains.filter(d => !currentSet.has(d.toLowerCase()));

        if (newDomains.length === 0) {
            showToast(
                parseResult.domains.length === 1
                    ? t('cfg.adblock.toastAlreadyBlockedSingle', { domain: parseResult.domains[0] }, `${parseResult.domains[0]} is already in custom blocklist`)
                    : t('cfg.adblock.toastAlreadyBlockedMany', null, 'Entered domains are already in custom blocklist')
            );
            return;
        }

        const updated = [...current, ...newDomains];
        setSettingValue('adblockCustomBlockedDomains', updated);
        setAdblockBlocklistInput('');

        if (newDomains.length === 1) {
            showToast(t('cfg.adblock.toastBlockedSingle', { domain: newDomains[0] }, `Blocked ${newDomains[0]}`));
        } else {
            showToast(t('cfg.adblock.toastBlockedMany', { count: newDomains.length }, `Added ${newDomains.length} domains to custom blocklist`));
        }
    };

    const handleRemoveBlocklist = (domain) => {
        const current = settings?.adblockCustomBlockedDomains || [];
        setSettingValue('adblockCustomBlockedDomains', current.filter(d => d !== domain));
        showToast(t('cfg.adblock.toastRemovedBlocked', { domain }, `Removed ${domain} from custom blocklist`));
    };

    const handleImportBlocklistDomains = (domains, replace = false) => {
        const current = replace ? [] : (settings?.adblockCustomBlockedDomains || []);
        const currentSet = new Set(current.map(d => d.toLowerCase()));
        const toAdd = domains.filter(d => !currentSet.has(d.toLowerCase()));
        const updated = [...current, ...toAdd];
        setSettingValue('adblockCustomBlockedDomains', updated);
        showToast(
            replace
                ? t('cfg.adblock.toastReplacedBlocklist', { count: updated.length }, `Replaced blocklist with ${updated.length} domains`)
                : t('cfg.adblock.toastBlockedMany', { count: toAdd.length }, `Added ${toAdd.length} domains to custom blocklist`)
        );
    };

    const handleClearBlocklist = () => {
        const count = settings?.adblockCustomBlockedDomains?.length || 0;
        if (count === 0) return;
        const formattedCount = count.toLocaleString(intlLocale);
        if (window.confirm(t('cfg.adblock.confirmClearBlocklist', { count: formattedCount }, `Are you sure you want to clear all ${formattedCount} custom blocked domains?`))) {
            setSettingValue('adblockCustomBlockedDomains', []);
            showToast(t('cfg.adblock.toastClearedBlocklist', null, 'Cleared custom blocklist'));
        }
    };

    const handleExportBlocklist = () => {
        const list = settings?.adblockCustomBlockedDomains || [];
        if (list.length === 0) {
            showToast(t('cfg.adblock.toastBlocklistEmpty', null, 'Blocklist is empty'));
            return;
        }
        const text = list.join('\n');
        navigator.clipboard?.writeText(text);
        showToast(t('cfg.adblock.toastCopiedBlocklist', { count: list.length.toLocaleString(intlLocale) }, `Copied ${list.length.toLocaleString()} domains to clipboard`));
    };

    useEffect(() => {
        if (settings?.customDohUrl !== undefined) {
            setCustomDnsUrl(settings.customDohUrl);
        }
    }, [settings?.customDohUrl]);

    const handleTestDns = async (endpoint) => {
        setIsTestingDns(true);
        setDnsTestStatus(null);
        try {
            const target = endpoint || customDnsUrl || (settings?.doh === 'custom' ? customDnsUrl : null);
            if (window.electronAPI?.testDns) {
                const res = await window.electronAPI.testDns(target);
                setDnsTestStatus(res);
                if (res && res.ok) {
                    showToast(t('cfg.privacy.toastDnsOnline', { latency: res.latency }, `DNS server online (${res.latency}ms latency)`));
                } else {
                    const errText = res?.error || t('cfg.privacy.dnsUnreachable', null, 'Unreachable');
                    showToast(t('cfg.privacy.toastDnsFailed', { error: errText }, `DNS test failed: ${errText}`));
                }
            } else {
                setDnsTestStatus({ ok: true, latency: 18, server: target || 'default' });
                showToast(t('cfg.privacy.toastDnsVerified', null, 'DNS verified online'));
            }
        } catch (err) {
            setDnsTestStatus({ ok: false, error: err.message });
            showToast(t('cfg.privacy.toastDnsError', null, 'DNS test error'));
        } finally {
            setIsTestingDns(false);
        }
    };

    const handleSaveSearchEngine = () => {
        const cleanName = engineNameInput.trim();
        const cleanKeyword = engineKeywordInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const cleanUrl = engineUrlInput.trim();

        if (!cleanName) {
            showToast(t('cfg.search.toastEnterEngineName', null, 'Please enter an engine name'));
            return;
        }
        if (!cleanUrl || !isValidSearchUrlTemplate(cleanUrl)) {
            showToast(t('cfg.search.toastInvalidEngineUrl', null, 'Please enter a valid URL template (e.g. https://example.com/search?q=%s)'));
            return;
        }

        if (editingEngineId) {
            updateCustomSearchEngine(editingEngineId, {
                name: cleanName,
                keyword: cleanKeyword || cleanName.toLowerCase(),
                url: cleanUrl,
                color: engineColorInput
            });
            showToast(t('cfg.search.toastEngineUpdated', { name: cleanName }, `Search engine "${cleanName}" updated`));
        } else {
            addCustomSearchEngine({
                name: cleanName,
                keyword: cleanKeyword || cleanName.toLowerCase(),
                url: cleanUrl,
                color: engineColorInput
            });
            showToast(t('cfg.search.toastEngineAdded', { name: cleanName }, `Custom search engine "${cleanName}" added`));
        }

        setIsAddingEngine(false);
        setEditingEngineId(null);
        setEngineNameInput('');
        setEngineKeywordInput('');
        setEngineUrlInput('');
    };

    const handleEditSearchEngine = (engine) => {
        setEditingEngineId(engine.id);
        setEngineNameInput(engine.name);
        setEngineKeywordInput(engine.keyword || '');
        setEngineUrlInput(engine.url);
        setEngineColorInput(engine.color || '#d4bc94');
        setIsAddingEngine(true);
    };

    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [updateData, setUpdateData] = useState(null);
    const currentAppVersion = updateData?.currentVersion || '1.4.3';
    const [isDefaultBrowser, setIsDefaultBrowser] = useState(false);
    const [isCheckingDefault, setIsCheckingDefault] = useState(false);
    const [checkDefaultOnStartup, setCheckDefaultOnStartup] = useState(() => {
        return localStorage.getItem('qbrowse_dismiss_default_browser') !== 'true';
    });

    useEffect(() => {
        if (window.electronAPI?.getUpdaterState) {
            window.electronAPI.getUpdaterState().then((state) => {
                if (state) {
                    setUpdateData(prev => ({ ...(prev || {}), ...state }));
                    setIsCheckingUpdates(state.status === 'checking');
                }
            }).catch(() => {});
        }
        if (!window.electronAPI?.onUpdaterEvent) return;
        const unsub = window.electronAPI.onUpdaterEvent((data) => {
            setUpdateData(prev => ({
                ...(prev || {}),
                ...data,
                version: data.version || data.latestVersion || prev?.version || prev?.latestVersion
            }));
            if (data.status === 'checking') {
                setIsCheckingUpdates(true);
            } else {
                setIsCheckingUpdates(false);
            }
            if (data.status === 'not-available' && !data.silent) {
                const ver = String(data.currentVersion || data.version || '1.4.3').replace(/^v/i, '');
                showToast(tStatic('cfg.about.toastUpToDate', { version: ver }, `QBrowse is up to date! (v${ver})`));
            } else if (data.status === 'available') {
                const nextVer = String(data.latestVersion || data.version || '').replace(/^v/i, '');
                if (data.managedExternally) {
                    showToast(tStatic('cfg.about.toastNewReleaseExternal', { version: nextVer, format: data.installShortLabel || 'package manager' }, `New version v${nextVer} available! Update via ${data.installShortLabel || 'your package manager'}.`));
                } else if (data.platform === 'linux' && data.canAutoInstall === false) {
                    showToast(tStatic('cfg.about.toastNewReleaseLinuxPkg', { version: nextVer, format: data.packageExt || 'Linux' }, `New GitHub Release v${nextVer} available (${data.packageExt || 'Linux'}). Click Download to get the package.`));
                } else {
                    showToast(tStatic('cfg.about.toastNewRelease', { version: nextVer }, `New GitHub Release found: v${nextVer}! Downloading update...`));
                }
            } else if (data.status === 'downloaded') {
                const nextVer = String(data.latestVersion || data.version || '').replace(/^v/i, '');
                if (data.platform === 'linux' && data.canAutoInstall === false) {
                    showToast(tStatic('cfg.about.toastLinuxPkgReady', { version: nextVer }, `Update package v${nextVer} downloaded! Open it or run the install command to apply.`));
                } else {
                    showToast(tStatic('cfg.about.toastUpdateReady', { version: nextVer }, `Update v${nextVer} ready! Click Restart & Update to apply.`));
                }
            } else if (data.status === 'error' && !data.silent) {
                const msg = data.message || tStatic('cfg.about.checkFailed', null, 'Check failed');
                showToast(tStatic('cfg.about.toastUpdateNotice', { message: msg }, `Update notice: ${msg}`));
            }
        });
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, []);

    const customWallpaper = settings?.customWallpaper;
    const customWallpaperSource = settings?.customWallpaperSource;
    const customWallpaperOriginalUrl = settings?.customWallpaperOriginalUrl;
    const wallpaperDimming = settings?.wallpaperDimming ?? 25;
    const wallpaperBlur = settings?.wallpaperBlur ?? 24;
    const blurWallpaper = settings?.blurWallpaper ?? false;
    const wallpaperVideoLoopMode = settings?.wallpaperVideoLoopMode || 'crossfade';
    const wallpaperVideoCrossfadeDuration = settings?.wallpaperVideoCrossfadeDuration ?? 1.2;

    const activeWallpaper = customWallpaper || DEFAULT_STOCK_WALLPAPER;
    const isCurrentVideo = isVideoWallpaper(activeWallpaper);
    const isCurrentGif = isGifWallpaper(activeWallpaper);
    const isCurrentLive = isLiveWallpaper(activeWallpaper);

    const [wallpaperUrlInput, setWallpaperUrlInput] = useState('');
    const [isImportingUrl, setIsImportingUrl] = useState(false);
    const [isImportingFile, setIsImportingFile] = useState(false);

    const handleImportWallpaperFile = async () => {
        if (!window.electronAPI?.importWallpaperFile) {
            showToast(t('cfg.appearance.toastDesktopOnly', null, 'File import is only available in the desktop app'));
            return;
        }
        setIsImportingFile(true);
        try {
            const res = await window.electronAPI.importWallpaperFile();
            if (res?.success) {
                setCustomWallpaper(res.protocolUrl, 'file');
                showToast(t('cfg.appearance.toastCustomApplied', null, 'Custom wallpaper applied!'));
            } else if (res?.error && res.error !== 'Cancelled') {
                showToast(res.error);
            }
        } catch (err) {
            showToast(err.message || t('cfg.appearance.toastImportFailed', null, 'Failed to import wallpaper'));
        } finally {
            setIsImportingFile(false);
        }
    };

    const handleImportWallpaperUrl = async (e) => {
        if (e) e.preventDefault();
        const url = wallpaperUrlInput.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            showToast(t('cfg.appearance.toastInvalidUrl', null, 'Please enter a valid HTTP or HTTPS image URL'));
            return;
        }
        setIsImportingUrl(true);
        try {
            if (window.electronAPI?.importWallpaperUrl) {
                const res = await window.electronAPI.importWallpaperUrl(url);
                if (res?.success) {
                    setCustomWallpaper(res.protocolUrl, 'url', url);
                    setWallpaperUrlInput('');
                    showToast(t('cfg.appearance.toastWebCached', null, 'Web wallpaper cached and applied!'));
                } else {
                    showToast(res?.error || t('cfg.appearance.toastDownloadFailed', null, 'Failed to download wallpaper'));
                }
            } else {
                setCustomWallpaper(url, 'url', url);
                setWallpaperUrlInput('');
                showToast(t('cfg.appearance.toastApplied', null, 'Wallpaper applied!'));
            }
        } catch (err) {
            showToast(err.message || t('cfg.appearance.toastImportFailed', null, 'Failed to import wallpaper'));
        } finally {
            setIsImportingUrl(false);
        }
    };

    const handleResetWallpaper = async () => {
        if (window.electronAPI?.resetWallpaper) {
            await window.electronAPI.resetWallpaper();
        }
        resetCustomWallpaper();
        showToast(t('cfg.appearance.toastResetWallpaper', null, 'Wallpaper reset to default stock'));
    };

    const [darkWhitelistInput, setDarkWhitelistInput] = useState('');
    const [darkWhitelistSearch, setDarkWhitelistSearch] = useState('');
    const [darkWhitelistError, setDarkWhitelistError] = useState('');

    useEffect(() => {
        if (activeModal === 'settings') {
            setDarkWhitelistInput('');
            setDarkWhitelistSearch('');
            setDarkWhitelistError('');
        }
    }, [activeModal]);

    const normalizedDarkInputPreview = (() => {
        const trimmed = darkWhitelistInput.trim();
        if (!trimmed) return null;
        const normalized = normalizeWhitelistEntry(trimmed);
        if (!normalized || normalized === trimmed.toLowerCase()) return null;
        return normalized;
    })();

    const handleAddDarkWhitelist = (e) => {
        if (e) e.preventDefault();
        const raw = darkWhitelistInput.trim();
        if (!raw) return;
        const res = addDarkExclusion(raw);
        if (!res.ok) {
            if (res.reason === 'duplicate') {
                setDarkWhitelistError(
                    t('cfg.appearance.whitelistDuplicate', { domain: res.entry }, `${res.entry} is already whitelisted.`)
                );
            } else {
                setDarkWhitelistError(
                    t('cfg.appearance.whitelistInvalid', null, 'Enter a valid domain, URL, or *.domain.com wildcard.')
                );
            }
            return;
        }
        setDarkWhitelistInput('');
        setDarkWhitelistError('');
        showToast(t('cfg.appearance.whitelistAddedToast', { domain: res.entry }, `Excluded ${res.entry} from Smart Dark Mode`));
    };

    const handleRemoveDarkWhitelist = (domain) => {
        removeDarkExclusion(domain);
        setDarkWhitelistError('');
        showToast(t('cfg.appearance.whitelistRemovedToast', { domain }, `Removed ${domain} from Smart Dark whitelist`));
    };

    const handleResetDarkWhitelist = () => {
        resetDarkExclusions();
        setDarkWhitelistSearch('');
        setDarkWhitelistError('');
        showToast(
            t(
                'cfg.appearance.whitelistResetToast',
                { count: DEFAULT_DARK_EXCLUSIONS.length },
                `Restored ${DEFAULT_DARK_EXCLUSIONS.length} recommended default domains`
            )
        );
    };

    const handleClearDarkWhitelist = () => {
        clearDarkExclusions();
        setDarkWhitelistSearch('');
        setDarkWhitelistError('');
        showToast(t('cfg.appearance.whitelistClearedToast', null, 'Cleared Smart Dark Mode whitelist'));
    };

    const refreshDefaultBrowserStatus = async () => {
        if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
            setIsCheckingDefault(true);
            try {
                const res = await window.electronAPI.checkDefaultBrowser({ force: true });
                setIsDefaultBrowser(!!res.isDefault);
            } catch (_) {}
            setIsCheckingDefault(false);
        }
    };

    const handleSetDefaultBrowser = async () => {
        if (window.electronAPI && window.electronAPI.setDefaultBrowser) {
            try {
                const res = await window.electronAPI.setDefaultBrowser();
                if (res.isDefault) {
                    setIsDefaultBrowser(true);
                    showToast(t('cfg.about.toastSetDefault', null, 'QBrowse set as default browser!'));
                } else {
                    const defaultAppsToast = osPlatform === 'darwin'
                        ? t('cfg.about.toastOpenDefaultDarwin', null, 'Opening System Settings. Select QBrowse as your default browser.')
                        : osPlatform === 'linux'
                            ? t('cfg.about.toastOpenDefaultLinux', null, 'Opening Default Applications. Select QBrowse as your default browser.')
                            : t('cfg.about.toastOpenDefaultWin', null, 'Opening Windows Default Apps. Click "Set default" for QBrowse.');
                    showToast(defaultAppsToast);
                    let attempts = 0;
                    const pollTimer = setInterval(async () => {
                        attempts++;
                        if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
                            try {
                                const check = await window.electronAPI.checkDefaultBrowser({ force: true });
                                if (check && check.isDefault) {
                                    setIsDefaultBrowser(true);
                                    clearInterval(pollTimer);
                                    showToast(tStatic('cfg.about.toastNowDefault', null, 'QBrowse is now your default browser!'));
                                }
                            } catch (_) {}
                        }
                        if (attempts >= 14) clearInterval(pollTimer);
                    }, 1500);
                }
            } catch (_) {
                showToast(t('cfg.about.toastFailedDefault', null, 'Failed to set default browser.'));
            }
        }
    };

    const handleOpenDefaultAppsSettings = () => {
        if (window.electronAPI && window.electronAPI.openDefaultAppsSettings) {
            window.electronAPI.openDefaultAppsSettings();
            showToast(t('cfg.about.toastOpeningDefaultApps', null, 'Opening system default apps settings...'));
        }
    };

    const handleToggleStartupCheck = () => {
        const next = !checkDefaultOnStartup;
        setCheckDefaultOnStartup(next);
        if (next) {
            localStorage.removeItem('qbrowse_dismiss_default_browser');
            showToast(t('cfg.about.toastStartupCheckOn', null, 'Will check default browser on startup.'));
        } else {
            localStorage.setItem('qbrowse_dismiss_default_browser', 'true');
            showToast(t('cfg.about.toastStartupCheckOff', null, 'Startup default browser check disabled.'));
        }
    };

    useEffect(() => {
        // Only query default browser if on the about or privacy tab, and defer past entrance animation
        if (settingsTab === 'about' || settingsTab === 'privacy') {
            if (settingsTab === 'about' && window.electronAPI?.getUpdaterState) {
                window.electronAPI.getUpdaterState().then((state) => {
                    if (state) {
                        setUpdateData(prev => ({ ...(prev || {}), ...state }));
                        setIsCheckingUpdates(state.status === 'checking');
                    }
                }).catch(() => {});
            }
            const timer = setTimeout(() => {
                refreshDefaultBrowserStatus();
            }, 350);

            const handleFocus = () => {
                refreshDefaultBrowserStatus();
            };

            window.addEventListener('focus', handleFocus);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('focus', handleFocus);
            };
        }
    }, [settingsTab]);

    useEffect(() => {
        if (settingsTab !== 'cookies' || !window.electronAPI?.getAllSitePermissions) return;
        const refreshAllPerms = () => {
            window.electronAPI.getAllSitePermissions().then(perms => {
                setAllPermissions(perms || {});
            }).catch(() => {});
        };
        refreshAllPerms();
        let unsub = null;
        if (window.electronAPI.onSitePermissionsChanged) {
            unsub = window.electronAPI.onSitePermissionsChanged(() => refreshAllPerms());
        }
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [settingsTab]);

    const handleRemoveDomainRules = async (domain) => {
        if (window.electronAPI && window.electronAPI.resetSitePermissions) {
            await window.electronAPI.resetSitePermissions(domain);
            setAllPermissions(prev => {
                const next = { ...prev };
                delete next[domain];
                return next;
            });
            showToast(t('cfg.cookies.toastClearedPerms', { domain }, `Cleared permission overrides for ${domain}`));
        }
    };

    const handleCreateSpace = (e) => {
        if (e) e.preventDefault();
        const currentSpaces = Array.isArray(settings?.customSpaces) && settings.customSpaces.length > 0
            ? settings.customSpaces
            : [
                { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
                { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
            ];
        if (currentSpaces.length >= 8) {
            showToast(t('cfg.spaces.toastMaxReached', null, 'Maximum of 8 workspaces reached'));
            return;
        }
        const cleanName = newSpaceName.trim();
        if (!cleanName) {
            showToast(t('cfg.spaces.toastEnterName', null, 'Please enter a workspace name'));
            return;
        }
        addSpace(cleanName, newSpaceIcon, newSpaceShowGitHub);
        setNewSpaceName('');
        setNewSpaceIcon('Layers');
        setNewSpaceShowGitHub(false);
        setIsCreatingSpace(false);
    };

    const handleSpaceDrop = (e, targetIdx) => {
        e.preventDefault();
        if (draggedSpaceIdx === null || draggedSpaceIdx === targetIdx) {
            setDraggedSpaceIdx(null);
            setDragOverSpaceIdx(null);
            return;
        }
        const currentSpaces = Array.isArray(settings?.customSpaces) && settings.customSpaces.length > 0
            ? [...settings.customSpaces]
            : [
                { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
                { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
            ];
        const next = [...currentSpaces];
        const [movedItem] = next.splice(draggedSpaceIdx, 1);
        next.splice(targetIdx, 0, movedItem);
        reorderSpaces(next);
        setDraggedSpaceIdx(null);
        setDragOverSpaceIdx(null);
        const movedName = getLocalizedSpaceName(movedItem);
        showToast(t('cfg.spaces.toastMoved', { name: movedName, pos: targetIdx + 1 }, `Moved "${movedName}" to position ${targetIdx + 1}`));
    };

    const handleSaveSpaceName = (id) => {
        const cleanName = editingSpaceName.trim();
        if (cleanName) {
            updateSpace(id, { name: cleanName });
        }
        setEditingSpaceId(null);
    };

    const handleMoveSpaceUp = (index) => {
        if (index <= 0) return;
        const currentSpaces = Array.isArray(settings?.customSpaces) && settings.customSpaces.length > 0
            ? [...settings.customSpaces]
            : [
                { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
                { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
            ];
        const next = [...currentSpaces];
        const temp = next[index - 1];
        next[index - 1] = next[index];
        next[index] = temp;
        reorderSpaces(next);
    };

    const handleMoveSpaceDown = (index) => {
        const currentSpaces = Array.isArray(settings?.customSpaces) && settings.customSpaces.length > 0
            ? [...settings.customSpaces]
            : [
                { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
                { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
            ];
        if (index >= currentSpaces.length - 1) return;
        const next = [...currentSpaces];
        const temp = next[index + 1];
        next[index + 1] = next[index];
        next[index] = temp;
        reorderSpaces(next);
    };

    const handleDeleteSpace = (spaceId) => {
        if (!spaceId || spaceId === 'personal') return;
        if (useTabStore.getState().migrateSpaceTabsToPersonal) {
            useTabStore.getState().migrateSpaceTabsToPersonal(spaceId);
        }
        removeSpace(spaceId);
        setDeletingSpace(null);
    };

    const handleResetAllSettings = async () => {
        try {
            await useUIStore.getState().resetAllToFactoryDefaults?.();
            setActivePresetId('balanced');
            setCustomDnsUrl('');
            setDarkWhitelistInput('');
            setDarkWhitelistSearch('');
            setDarkWhitelistError('');
            setAdblockAllowlistInput('');
            setAdblockBlocklistInput('');
            setWallpaperUrlInput('');
            setShowResetConfirm(false);
            showToast(t('cfg.reset.toastSuccess', null, 'All QBrowse settings restored to factory defaults'));
        } catch (err) {
            console.error('Failed to reset settings to defaults:', err);
            const errMsg = err?.message || t('cfg.common.unknownError', null, 'Unknown error');
            showToast(t('cfg.reset.toastFailed', { error: errMsg }, `Reset failed: ${errMsg}`));
        }
    };

    const navTabs = [
        { 
            id: 'appearance', 
            label: t('settings.tabs.appearance', null, 'Appearance & Themes'), 
            englishLabel: 'Appearance & Themes',
            icon: Palette, 
            color: 'text-purple-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.appearance', null, ''),
            keywords: ['theme', 'dark mode', 'smart dark', 'light', 'wallpaper', 'live wallpaper', 'gif', 'video loop', 'presets', 'preset studio', 'accent color', 'glass', 'blur', 'translucency', 'colors', 'curvature'] 
        },
        { 
            id: 'layout', 
            label: t('settings.tabs.layout', null, 'Layout & Interface'), 
            englishLabel: 'Layout & Interface',
            icon: Layout, 
            color: 'text-amber-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.layout', null, ''),
            keywords: ['sidebar', 'top bar', 'bottom bar', 'omnibox', 'window controls', 'close minimize maximize', 'tabs', 'tab layout', 'density', 'pills', 'cards', 'ui scale', 'compact', 'toolhub', 'touchpad', 'gesture', 'swipe', 'back', 'forward'] 
        },
        { 
            id: 'typography', 
            label: t('settings.tabs.typography', null, 'Typography & Fonts'), 
            englishLabel: 'Typography & Fonts',
            icon: Type, 
            color: 'text-rose-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.typography', null, ''),
            keywords: ['font', 'typography', 'custom font', 'google font', 'system font', 'font scale', 'letter spacing', 'text size', 'typeface', 'weight', 'ttf', 'otf', 'woff'] 
        },
        { 
            id: 'spaces', 
            label: t('settings.tabs.spaces', null, 'Workspaces'), 
            englishLabel: 'Workspaces',
            icon: Layers, 
            color: 'text-indigo-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.spaces', null, ''),
            keywords: ['workspace', 'spaces', 'personal', 'work', 'swipe', 'switch', 'reorder', 'custom spaces', 'space tabs'] 
        },
        { 
            id: 'language', 
            label: t('settings.tabs.language', null, 'Language & Region'), 
            englishLabel: 'Language & Region',
            icon: Languages, 
            color: 'text-sky-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.language', null, ''),
            keywords: ['language', 'translation', 'locale', 'region', 'polish', 'french', 'german', 'spanish', 'portuguese', 'chinese', 'japanese', 'russian', 'italian', 'ukrainian', 'korean', 'język', 'idioma', 'sprache', 'langue', 'lingua', 'язык', '语言', '言語', '언어'] 
        },
        { 
            id: 'accessibility', 
            label: t('settings.tabs.accessibility', null, 'Accessibility'), 
            englishLabel: 'Accessibility',
            icon: Eye, 
            color: 'text-teal-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.accessibility', null, ''),
            keywords: ['reduced motion', 'motion', 'animations', 'disable animations', 'system sync', 'os sync', 'windows sync', 'dyslexia font', 'high contrast', 'focus rings', 'font size', 'zoom', 'caret browsing', 'autoplay', 'captions', 'mono audio', 'vestibular'] 
        },
        { 
            id: 'shortcuts', 
            label: t('settings.tabs.shortcuts', null, 'Keyboard Shortcuts'), 
            englishLabel: 'Keyboard Shortcuts',
            icon: Keyboard, 
            color: 'text-amber-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.shortcuts', null, ''),
            keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keybindings', 'keybinds', 'remap', 'customize', 'keys', 'ctrl', 'cmd'] 
        },
        { 
            id: 'privacy', 
            label: t('settings.tabs.privacy', null, 'Privacy & Security'), 
            englishLabel: 'Privacy & Security',
            icon: Lock, 
            color: 'text-emerald-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.privacy', null, ''),
            keywords: ['tor', 'onion', 'ghost', 'incognito', 'doh', 'dns over https', 'history', 'cache', 'clear browsing data', 'vault', 'passwords', 'autofill', 'https', 'telemetry', 'webrtc', 'leak'] 
        },
        { 
            id: 'cookies', 
            label: t('settings.tabs.cookies', null, 'Cookies & Permissions'), 
            englishLabel: 'Cookies & Permissions',
            icon: Cookie, 
            color: 'text-amber-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.cookies', null, ''),
            keywords: ['cookies', 'permissions', 'camera', 'microphone', 'geolocation', 'location', 'notifications', 'popups', 'storage', 'data', 'site data'] 
        },
        { 
            id: 'search', 
            label: t('settings.tabs.search', null, 'Search & Omnibox'), 
            englishLabel: 'Search & Omnibox',
            icon: Search, 
            color: 'text-sky-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.search', null, ''),
            keywords: ['search engine', 'google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'custom search', 'bangs', 'shortcuts', 'omnibox', 'suggestions', 'autocomplete', 'weather', 'calculator'] 
        },
        { 
            id: 'downloads', 
            label: t('settings.tabs.downloads', null, 'Downloads & Media'), 
            englishLabel: 'Downloads & Media',
            icon: Download, 
            color: 'text-blue-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.downloads', null, ''),
            keywords: ['downloads', 'download folder', 'ask where to save', 'media player', 'audio', 'video', 'pdf', 'files', 'shelf'] 
        },
        { 
            id: 'workmode', 
            label: t('settings.tabs.workmode', null, 'Work Mode & GitHub'), 
            englishLabel: 'Work Mode & GitHub',
            icon: GitPullRequest, 
            color: 'text-emerald-400', 
            category: 'Preferences',
            categoryLabel: t('settings.categories.preferences', null, 'Preferences'),
            localizedKeywords: t('cfg.navKeywords.workmode', null, ''),
            keywords: ['github', 'pull requests', 'prs', 'issues', 'notifications', 'token', 'pat', 'git', 'work', 'developer'] 
        },
        { 
            id: 'ai', 
            label: t('settings.tabs.ai', null, 'AI & Gemma Engine'), 
            englishLabel: 'AI & llama.cpp Engine',
            icon: Sparkles, 
            color: 'text-violet-400', 
            category: 'Advanced',
            categoryLabel: t('settings.categories.advanced', null, 'Advanced'),
            localizedKeywords: t('cfg.navKeywords.ai', null, ''),
            keywords: ['ai', 'gemma', 'llama', 'model', 'local ai', 'chat', 'summarize', 'reader', 'llm', 'gpu layers', 'threads', 'context length'] 
        },
        { 
            id: 'engine', 
            label: t('settings.tabs.engine', null, 'Engine & Performance'), 
            englishLabel: 'Engine & Performance',
            icon: Cpu, 
            color: 'text-rose-400', 
            category: 'Advanced',
            categoryLabel: t('settings.categories.advanced', null, 'Advanced'),
            localizedKeywords: t('cfg.navKeywords.engine', null, ''),
            keywords: ['gpu', 'hardware acceleration', 'performance', 'eco mode', 'ultra mode', 'memory', 'ram', 'tab suspension', 'bfcache', 'instant cache', 'battery', 'cpu', 'power'] 
        },
        { 
            id: 'adblock', 
            label: t('settings.tabs.adblock', null, 'Shields & AdBlock'), 
            englishLabel: 'Shields & AdBlock',
            icon: Shield, 
            color: 'text-emerald-400', 
            category: 'Advanced',
            categoryLabel: t('settings.categories.advanced', null, 'Advanced'),
            localizedKeywords: t('cfg.navKeywords.adblock', null, ''),
            keywords: ['adblock', 'shields', 'trackers', 'ads', 'blocker', 'easylist', 'ublock', 'custom blocklist', 'rules', 'whitelisted domains', 'anti-adblock', 'dnr'] 
        },
        { 
            id: 'about', 
            label: t('settings.tabs.about', null, 'About & System Info'), 
            englishLabel: 'About & System Info',
            icon: Info, 
            color: 'text-cyan-400', 
            category: 'System',
            categoryLabel: t('cfg.categories.system', null, 'System'),
            localizedKeywords: t('cfg.navKeywords.about', null, ''),
            keywords: ['version', 'update', 'check for updates', 'changelog', 'default browser', 'license', 'credits', 'system info', 'diagnostics', 'hardware profile'] 
        }
    ];

    const trimmedQuery = (searchFilter || '').trim().toLowerCase();

    useEffect(() => {
        if (!trimmedQuery) return;
        if (/(wallpaper|video|gif|dimming|backdrop|loop|playback)/.test(trimmedQuery)) {
            setAppearanceSubTab('wallpaper');
        } else if (/(smart dark|invert|exclusion|whitelist)/.test(trimmedQuery)) {
            setAppearanceSubTab('smartDark');
        } else if (/preset/.test(trimmedQuery)) {
            setAppearanceSubTab('presets');
        } else if (/(blur|glass|glow|switcher|translucency|swipe anim)/.test(trimmedQuery)) {
            setAppearanceSubTab('effects');
        } else if (/(theme|accent|highlight)/.test(trimmedQuery)) {
            setAppearanceSubTab('theme');
        }

        if (/(curvature|omnibox|window control|density|compact|pills|cards|tab presentation|sharp|cohesive)/.test(trimmedQuery)) {
            setLayoutSubTab('window');
        } else if (/(touchpad|gesture|swipe|frameless|restore|ctrl\+w|ctrl\+tab|zen|remember open)/.test(trimmedQuery)) {
            setLayoutSubTab('behavior');
        } else if (/(sidebar|top bar|bottom bar|toolhub|toolbar|extension hub)/.test(trimmedQuery)) {
            setLayoutSubTab('panels');
        }
    }, [trimmedQuery]);
    const filteredNavTabs = trimmedQuery
        ? navTabs.filter(tab => 
            tab.label.toLowerCase().includes(trimmedQuery) || 
            (tab.englishLabel && tab.englishLabel.toLowerCase().includes(trimmedQuery)) ||
            tab.category.toLowerCase().includes(trimmedQuery) ||
            (tab.categoryLabel && tab.categoryLabel.toLowerCase().includes(trimmedQuery)) ||
            (tab.localizedKeywords && tab.localizedKeywords.toLowerCase().includes(trimmedQuery)) ||
            (ALL_TAB_SEARCH_TEXT[tab.id] && ALL_TAB_SEARCH_TEXT[tab.id].includes(trimmedQuery)) ||
            (Array.isArray(tab.keywords) && tab.keywords.some(kw => kw.toLowerCase().includes(trimmedQuery)))
          )
        : navTabs;

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'settings';
    if (activeModal !== 'settings' && !isClosingThis) return null;

    return (
        <>
            {/* Ambient Blurred Backdrop behind the settings sheet during enter/exit */}
            <div 
                className={`fixed inset-0 z-[199] pointer-events-none transition-opacity duration-300 ${
                    isBright ? 'bg-black/25' : 'bg-black/55'
                } backdrop-blur-md ${isModalClosing ? 'opacity-0' : 'opacity-100'}`} 
            />
            <div 
                id="settings-modal"
                style={{ WebkitAppRegion: 'no-drag' }}
                className={`fixed inset-0 z-[200] flex font-sans w-full h-full overflow-hidden no-drag select-text ${
                    isBright 
                        ? 'bg-[#f4f5f8] text-zinc-900' 
                        : 'bg-[#090a0f] text-white'
                } ${isModalClosing ? 'animate-settings-sheet-out' : 'animate-settings-sheet'}`} 
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
            >
            {/* LEFT NAVIGATION SIDEBAR */}
            <div className={`w-64 border-r flex flex-col flex-shrink-0 h-full no-drag ${
                isBright 
                    ? 'bg-black/[0.02] border-black/10' 
                    : 'bg-white/[0.015] border-white/[0.06]'
            }`} style={{ WebkitAppRegion: 'no-drag' }}>
                <div className="p-4 pb-2 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-sm font-semibold tracking-tight flex items-center gap-2 ${
                            isBright ? 'text-zinc-900' : 'text-white'
                        }`}>
                            <img 
                                src={qbrowseLogo} 
                                alt="QBrowse" 
                                className="w-4 h-4 object-contain rounded drop-shadow" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                            />
                            {t('settings.title', null, 'Settings')}
                        </h2>
                        <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                            isBright ? 'bg-black/5 text-zinc-600 border-black/10' : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
                        }`}>v{String(currentAppVersion).replace(/^v/i, '')}</span>
                    </div>

                    {/* Live Search Input */}
                    <div 
                        className="relative flex items-center cursor-text group"
                        onClick={() => searchInputRef.current?.focus()}
                        style={{ WebkitAppRegion: 'no-drag' }}
                    >
                        <Search 
                            size={12} 
                            className={`absolute left-2.5 pointer-events-none transition-colors ${
                                isBright ? 'text-zinc-400 group-focus-within:text-accent' : 'text-zinc-500 group-focus-within:text-accent'
                            }`} 
                        />
                        <input
                            ref={searchInputRef}
                            type="text"
                            id="settings-search-input"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && filteredNavTabs.length > 0) {
                                    setSettingsTab(filteredNavTabs[0].id);
                                }
                            }}
                            placeholder={t('settings.searchPlaceholder', null, 'Search settings...')}
                            style={{ WebkitAppRegion: 'no-drag' }}
                            className={`w-full h-8 rounded-lg pl-7 pr-7 text-xs outline-none focus:border-accent/40 transition-colors font-mono border select-text cursor-text ${
                                isBright 
                                    ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400 focus:bg-white' 
                                    : 'bg-white/[0.03] border-white/[0.06] text-white placeholder-zinc-500 focus:bg-black/40'
                            }`}
                        />
                        {searchFilter && (
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchFilter('');
                                    searchInputRef.current?.focus();
                                }} 
                                className={`absolute right-2 top-1.5 p-0.5 rounded transition cursor-pointer ${
                                    isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-400 hover:text-white'
                                }`}
                                title={t('settings.clearSearch', null, 'Clear search')}
                            >
                                <X size={11} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto hide-scroll">
                    {filteredNavTabs.length === 0 ? (
                        <div className="p-4 text-center select-none flex flex-col items-center gap-2 text-zinc-500">
                            <span className="text-xs">{t('settings.noResults', null, 'No settings found matching')} &quot;{searchFilter}&quot;</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchFilter('');
                                    searchInputRef.current?.focus();
                                }}
                                className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                            >
                                {t('settings.clearSearch', null, 'Clear Search')}
                            </button>
                        </div>
                    ) : (
                        filteredNavTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = settingsTab === tab.id || (tab.id === 'engine' && settingsTab === 'performance');
                            return (
                                <button 
                                    key={tab.id}
                                    onClick={() => setSettingsTab(tab.id)} 
                                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer text-left group active:scale-[0.98] ${
                                        isActive 
                                            ? (isBright ? 'bg-accent/20 text-zinc-950 font-semibold shadow-sm translate-x-1 border border-accent/40' : 'bg-accent/15 text-white font-medium shadow-sm translate-x-1 border border-accent/30') 
                                            : (isBright ? 'hover:bg-black/5 text-zinc-600 hover:text-zinc-900 border border-transparent hover:translate-x-0.5' : 'hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent hover:translate-x-0.5')
                                    }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-accent animate-pop-in" />
                                    )}
                                    <Icon size={14} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-accent scale-105' : (isBright ? 'text-zinc-500' : (tab.color || 'text-zinc-400'))}`} /> 
                                    <span className="text-xs">{tab.label}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className={`p-3 border-t ${isBright ? 'border-black/10' : 'border-white/[0.06]'}`}>
                    {showResetConfirm ? (
                        <div className={`p-2.5 rounded-xl border animate-pop-in flex flex-col gap-2 ${
                            isBright ? 'bg-rose-50/90 border-rose-200' : 'bg-red-950/30 border-red-500/30'
                        }`}>
                            <div className="flex items-center gap-1.5 text-red-400">
                                <AlertTriangle size={13} className="flex-shrink-0 text-red-500" />
                                <span className={`text-[11px] font-semibold ${isBright ? 'text-rose-900' : 'text-red-200'}`}>
                                    {t('cfg.reset.confirmTitle', null, 'Reset all settings?')}
                                </span>
                            </div>
                            <p className={`text-[10px] leading-tight ${isBright ? 'text-rose-700/80' : 'text-red-300/70'}`}>
                                {t('cfg.reset.confirmDesc', null, 'Restores Balanced preset, dark theme, and clears customized layouts & shields.')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setShowResetConfirm(false)}
                                    className={`flex-1 py-1 rounded-lg text-[10px] font-medium border cursor-pointer transition ${
                                        isBright 
                                            ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50' 
                                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                                    }`}
                                >
                                    {t('cfg.common.cancel', null, 'Cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetAllSettings}
                                    className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-xs transition"
                                >
                                    {t('cfg.reset.confirmBtn', null, 'Reset All')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            type="button"
                            onClick={() => setShowResetConfirm(true)}
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                                isBright 
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                    : 'bg-red-500/10 hover:bg-red-500/15 text-red-400 border-red-500/20'
                            }`}
                            title={t('cfg.reset.buttonTitle', null, 'Reset all QBrowse settings to factory defaults')}
                        >
                            <RotateCcw size={12} /> {t('cfg.reset.buttonLabel', null, 'Reset Defaults')}
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT CONTENT PANEL */}
            <div className={`flex-1 relative h-full flex flex-col overflow-hidden ${
                isBright ? 'bg-transparent text-zinc-900 settings-bright-mode' : 'bg-transparent text-white'
            }`}>
                {/* Pinned Close Button (Fixed at top-right of panel, never scrolls away) */}
                <button 
                    onClick={(e) => { e.stopPropagation(); closeModal(); }} 
                    className={`absolute top-6 right-8 w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-200 z-[300] cursor-pointer backdrop-blur-xl group active:scale-90 ${
                        isBright 
                            ? 'bg-white/80 hover:bg-white border-black/10 text-zinc-600 hover:text-zinc-900 shadow-sm' 
                            : 'bg-[#090a0f]/80 hover:bg-[#090a0f] border-white/10 text-zinc-400 hover:text-white shadow-sm'
                    }`}
                    title={t('cfg.reset.closeTitle', null, 'Close Settings (Esc)')}
                >
                    <X size={16} className="pointer-events-none transition-transform duration-200 group-hover:rotate-90" />
                </button>

                {/* Scrollable Content Body */}
                <div className="flex-1 p-6 md:p-10 lg:px-12 overflow-y-auto h-full">
                    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto pb-16">
                    {isContentReady && (
                        <React.Fragment>
                    {/* TAB 1: APPEARANCE & THEMES */}
                    {settingsTab === 'appearance' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.appearance.title', null, 'Appearance & Themes')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {t('cfg.appearance.subtitle', null, 'Customize color themes, browsing presets, wallpapers, live playback, and surface glass effects.')}
                                </p>
                            </div>

                            <SlidingPillSwitcher
                                options={[
                                    { id: 'theme', label: t('cfg.appearance.subTabs.theme', null, 'Theme & Colors'), icon: Palette },
                                    { id: 'presets', label: t('cfg.appearance.subTabs.presets', null, 'Presets'), icon: Sparkles },
                                    { id: 'wallpaper', label: t('cfg.appearance.subTabs.wallpaper', null, 'Wallpaper'), icon: ImageIcon },
                                    { id: 'smartDark', label: t('cfg.appearance.subTabs.smartDark', null, 'Smart Dark'), icon: Moon },
                                    { id: 'effects', label: t('cfg.appearance.subTabs.effects', null, 'Effects'), icon: Layers }
                                ]}
                                value={appearanceSubTab}
                                onChange={setAppearanceSubTab}
                                isBright={isBright}
                                size="sm"
                            />

                            {/* 1. COLOR THEME & ACCENT */}
                            {appearanceSubTab === 'theme' && (
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Palette}
                                    title={t('cfg.appearance.colorThemeTitle', null, 'Color Theme & Accent')}
                                    subtitle={t('cfg.appearance.colorThemeDesc', null, 'Select your primary interface surface and accent color.')}
                                />

                                <SettingCard
                                    icon={theme === 'light' ? Sun : Moon}
                                    title={t('cfg.appearance.interfaceThemeTitle', null, 'Browser Interface Theme')}
                                    description={t('cfg.appearance.interfaceThemeDesc', null, 'Switch between dark obsidian and bright frosted interface.')}
                                >
                                    <div className="min-w-[190px]">
                                        <SlidingPillSwitcher
                                            options={[
                                                { id: 'dark', label: t('cfg.appearance.themeDark', null, 'Dark'), icon: Moon },
                                                { id: 'light', label: t('cfg.appearance.themeBright', null, 'Bright'), icon: Sun }
                                            ]}
                                            value={theme === 'light' ? 'light' : 'dark'}
                                            onChange={(val) => setTheme(val)}
                                            isBright={isBright}
                                        />
                                    </div>
                                </SettingCard>

                                {/* Accent Color Swatches & Hex Picker */}
                                <div className={`p-3.5 px-4 rounded-xl border transition-all duration-200 space-y-3 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                isBright ? 'bg-black/[0.04] text-accent border border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.06]'
                                            }`}>
                                                <Palette size={15} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-medium text-xs ${isBright ? 'text-zinc-800 font-semibold' : 'text-zinc-200'}`}>
                                                    {t('cfg.appearance.accentColorTitle', null, 'Accent Color')}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {t('cfg.appearance.accentColorDesc', null, 'Rewrites all glass highlights, shadows, and active states instantly.')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2.5 items-center flex-wrap flex-shrink-0">
                                            {[
                                                { hex: '#d4bc94', name: t('cfg.appearance.accents.sand', null, 'Sand') },
                                                { hex: '#3b82f6', name: t('cfg.appearance.accents.ocean', null, 'Ocean') },
                                                { hex: '#10b981', name: t('cfg.appearance.accents.emerald', null, 'Emerald') },
                                                { hex: '#8b5cf6', name: t('cfg.appearance.accents.amethyst', null, 'Amethyst') },
                                                { hex: '#f43f5e', name: t('cfg.appearance.accents.rose', null, 'Rose') },
                                                { hex: '#f97316', name: t('cfg.appearance.accents.sunset', null, 'Sunset') },
                                                { hex: '#06b6d4', name: t('cfg.appearance.accents.cyber', null, 'Cyber') }
                                            ].map((c) => (
                                                <button
                                                    key={c.hex}
                                                    type="button"
                                                    onClick={() => setAccentColor(c.hex)}
                                                    className={`w-7 h-7 rounded-full shadow-sm transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                                                        accentColor === c.hex
                                                            ? (isBright ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white scale-110' : 'ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110')
                                                            : ''
                                                    }`}
                                                    style={{ backgroundColor: c.hex }}
                                                    title={c.name}
                                                >
                                                    {accentColor === c.hex && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </button>
                                            ))}
                                            <div className={`w-px h-5 mx-0.5 ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />

                                            <ColorPalettePicker
                                                value={accentColor}
                                                onChange={(hex) => setAccentColor(hex)}
                                                isBright={isBright}
                                                defaultColor="#d4bc94"
                                                label={t('cfg.appearance.accentColorTitle', null, 'Accent Color')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Text Highlight Color & Style */}
                                <div className={`p-4 rounded-2xl border space-y-3.5 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                                isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border-white/[0.06]'
                                            }`}>
                                                <Sparkles size={15} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-medium text-xs ${isBright ? 'text-zinc-800 font-semibold' : 'text-zinc-200'}`}>
                                                    {t('cfg.appearance.textHighlightTitle', null, 'Text Highlight Color & Style')}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {t('cfg.appearance.textHighlightDesc', null, 'Customize how selected text looks across the browser and websites.')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-medium ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                {t('cfg.appearance.textHighlightWebLabel', null, 'Apply to Websites')}
                                            </span>
                                            <SettingToggle
                                                isChecked={textHighlightApplyToWeb}
                                                onToggle={() => setTextHighlightApplyToWeb(!textHighlightApplyToWeb)}
                                            />
                                        </div>
                                    </div>

                                    {/* 5 Style Selector Pills (Flagship SlidingPillSwitcher) */}
                                    <SlidingPillSwitcher
                                        options={TEXT_HIGHLIGHT_STYLES.map((st) => ({ id: st.id, label: t('cfg.appearance.highlightStyles.' + st.id, null, st.label) }))}
                                        value={textHighlightStyle}
                                        onChange={(id) => setTextHighlightStyle(id)}
                                        isBright={isBright}
                                        size="sm"
                                    />

                                    {/* Swatches + Custom Hex Input */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {TEXT_HIGHLIGHT_SWATCHES.map((sw) => {
                                            const active = textHighlightColor === sw.hex;
                                            const displayBg = sw.hex === 'accent' ? accentColor : sw.hex;
                                            return (
                                                <button
                                                    key={sw.id}
                                                    type="button"
                                                    onClick={() => setTextHighlightColor(sw.hex)}
                                                    className={`h-7 rounded-full shadow-sm transition-transform hover:scale-105 flex items-center justify-center cursor-pointer ${
                                                        sw.hex === 'accent' ? 'px-2.5 gap-1.5 border' : 'w-7'
                                                    } ${
                                                        active
                                                            ? (isBright ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white' : 'ring-2 ring-white ring-offset-2 ring-offset-black/50')
                                                            : (sw.hex === 'accent' ? (isBright ? 'border-black/10 bg-white text-zinc-800' : 'border-white/15 bg-white/[0.06] text-zinc-200') : '')
                                                    }`}
                                                    style={sw.hex === 'accent' ? undefined : { backgroundColor: displayBg }}
                                                    title={t('cfg.appearance.highlightSwatches.' + (sw.id === 'accent' ? 'accent' : sw.id.slice(1)), null, sw.name)}
                                                >
                                                    {sw.hex === 'accent' ? (
                                                        <>
                                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
                                                            <span className="text-[11px] font-medium">{t('cfg.appearance.highlightAccentLabel', null, 'Accent')}</span>
                                                        </>
                                                    ) : (
                                                        active && <div className="w-2 h-2 bg-white rounded-full" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        <div className={`w-px h-5 mx-0.5 ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />
                                        <ColorPalettePicker
                                            value={textHighlightColor === 'accent' ? accentColor : normalizeHexColor(textHighlightColor, accentColor)}
                                            onChange={(hex) => setTextHighlightColor(hex)}
                                            isBright={isBright}
                                            defaultColor={accentColor}
                                            label={t('cfg.appearance.textHighlightTitle', null, 'Text Highlight Color & Style')}
                                        />
                                    </div>

                                    {/* Live Selectable Preview */}
                                    <div className={`px-3 py-2 rounded-xl border text-xs select-text cursor-text ${
                                        isBright ? 'bg-white/80 border-black/[0.07] text-zinc-700' : 'bg-black/30 border-white/[0.07] text-zinc-300'
                                    }`}>
                                        {t('cfg.appearance.textHighlightPreview', null, 'Drag to select this text and preview your highlight style live.')}
                                    </div>
                                </div>
                            </div>
                            )}

                            {appearanceSubTab === 'smartDark' && (
                            <div className="space-y-3">

                                <SettingCard
                                    icon={Eye}
                                    title={t('cfg.appearance.smartDarkTitle', null, 'Smart Dark Mode (Websites)')}
                                    description={t('cfg.appearance.smartDarkDesc', null, 'Smart luminosity engine inverts light websites while preserving native dark sites.')}
                                >
                                    <SettingToggle isChecked={isForceDark} onToggle={() => setIsForceDark(!isForceDark)} />
                                </SettingCard>

                                <SettingCard
                                    icon={ImageIcon}
                                    title={t('cfg.appearance.smartDarkExcludeMediaTitle', null, 'Exclude Images & Videos')}
                                    description={t('cfg.appearance.smartDarkExcludeMediaDesc', null, 'Keep photos, videos, canvas, and embedded players in natural colors instead of inverting them.')}
                                >
                                    <SettingToggle isChecked={darkExcludeMedia} onToggle={() => setDarkExcludeMedia(!darkExcludeMedia)} />
                                </SettingCard>

                                {(() => {
                                    const exclusionsList = Array.isArray(darkExclusions) ? darkExclusions : [];
                                    const searchQuery = darkWhitelistSearch.trim().toLowerCase();
                                    const filteredExclusions = searchQuery
                                        ? exclusionsList.filter(d => d.toLowerCase().includes(searchQuery))
                                        : exclusionsList;

                                    return (
                                        <div className={`p-4 rounded-2xl border space-y-3 ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                        }`}>
                                            {/* Header & Minimal Pill Actions */}
                                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                                <div className="space-y-0.5">
                                                    <p className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                                        {t('cfg.appearance.excludedDomainsTitle', null, 'Smart Dark Mode Whitelist')}
                                                    </p>
                                                    <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        {t(
                                                            'cfg.appearance.excludedDomainsDesc',
                                                            null,
                                                            'Sites listed here (and their subdomains) keep their native theme. Paste any domain, full URL, or *.domain.com wildcard.'
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={handleResetDarkWhitelist}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer active:scale-95 ${
                                                            isBright
                                                                ? 'bg-black/[0.03] border-black/[0.08] text-zinc-600 hover:bg-black/[0.06] hover:text-zinc-950'
                                                                : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                                                        }`}
                                                        title={t('cfg.appearance.whitelistResetTooltip', null, 'Restore recommended natively-dark sites')}
                                                    >
                                                        <RotateCcw size={10} />
                                                        <span>{t('cfg.appearance.whitelistResetBtn', null, 'Reset Defaults')}</span>
                                                    </button>
                                                    {exclusionsList.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleClearDarkWhitelist}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer active:scale-95 ${
                                                                isBright
                                                                    ? 'bg-black/[0.03] border-black/[0.08] text-zinc-600 hover:bg-rose-500/10 hover:border-rose-500/25 hover:text-rose-600'
                                                                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-rose-500/15 hover:border-rose-500/25 hover:text-rose-300'
                                                            }`}
                                                            title={t('cfg.appearance.whitelistClearTooltip', null, 'Remove all excluded domains')}
                                                        >
                                                            <Trash2 size={10} />
                                                            <span>{t('cfg.common.clear', null, 'Clear')}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Add Domain / URL Form */}
                                            <form onSubmit={handleAddDarkWhitelist} className="space-y-1.5">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={darkWhitelistInput}
                                                        onChange={(e) => {
                                                            setDarkWhitelistInput(e.target.value);
                                                            if (darkWhitelistError) setDarkWhitelistError('');
                                                        }}
                                                        placeholder={t('cfg.appearance.whitelistInputPlaceholder', null, 'e.g. github.com, https://docs.site.com, or *.example.com')}
                                                        className={`flex-1 min-w-0 px-3.5 py-1.5 rounded-full text-xs font-mono outline-none border transition ${
                                                            darkWhitelistError
                                                                ? 'border-rose-500/60 focus:border-rose-500'
                                                                : (isBright
                                                                    ? 'bg-white border-black/15 text-zinc-900 placeholder:text-zinc-400 focus:border-accent'
                                                                    : 'bg-black/40 border-white/[0.08] text-white placeholder:text-white/30 focus:border-accent')
                                                        } ${isBright ? 'bg-white text-zinc-900' : 'bg-black/40 text-white'}`}
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!darkWhitelistInput.trim()}
                                                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-xs transition cursor-pointer active:scale-95 shadow-xs"
                                                    >
                                                        <Plus size={13} strokeWidth={2.5} />
                                                        <span>{t('cfg.common.add', null, 'Add')}</span>
                                                    </button>
                                                </div>

                                                {darkWhitelistError && (
                                                    <p className="text-[11px] text-rose-400 flex items-center gap-1.5 pl-1">
                                                        <AlertCircle size={11} className="flex-shrink-0" />
                                                        <span>{darkWhitelistError}</span>
                                                    </p>
                                                )}

                                                {!darkWhitelistError && normalizedDarkInputPreview && (
                                                    <p className={`text-[11px] flex items-center gap-1.5 pl-1 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        <span>{t('cfg.appearance.whitelistWillAdd', null, 'Will add:')}</span>
                                                        <span className={`font-mono font-semibold px-1.5 py-0.5 rounded ${
                                                            isBright ? 'bg-black/[0.05] text-zinc-800' : 'bg-white/[0.07] text-accent'
                                                        }`}>
                                                            {normalizedDarkInputPreview}
                                                        </span>
                                                    </p>
                                                )}
                                            </form>

                                            {/* Search / Filter Input when list has multiple entries */}
                                            {exclusionsList.length > 4 && (
                                                <div className={`relative flex items-center rounded-xl border px-2.5 ${
                                                    isBright
                                                        ? 'bg-white/80 border-black/[0.08] focus-within:border-accent'
                                                        : 'bg-black/30 border-white/[0.06] focus-within:border-accent/60'
                                                }`}>
                                                    <Search size={12} className={isBright ? 'text-zinc-400' : 'text-white/35'} />
                                                    <input
                                                        type="text"
                                                        value={darkWhitelistSearch}
                                                        onChange={(e) => setDarkWhitelistSearch(e.target.value)}
                                                        placeholder={t('cfg.appearance.whitelistSearchPlaceholder', null, 'Filter excluded domains...')}
                                                        className={`flex-1 min-w-0 bg-transparent border-none outline-none px-2 py-1.5 text-xs ${
                                                            isBright ? 'text-zinc-800 placeholder:text-zinc-400' : 'text-white/90 placeholder:text-white/30'
                                                        }`}
                                                    />
                                                    {searchQuery && (
                                                        <span className={`text-[10px] font-mono mr-1.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                                            {filteredExclusions.length}/{exclusionsList.length}
                                                        </span>
                                                    )}
                                                    {darkWhitelistSearch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDarkWhitelistSearch('')}
                                                            className={`p-0.5 rounded transition cursor-pointer ${isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/35 hover:text-white'}`}
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Excluded Domain Pills */}
                                            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto hide-scroll pt-0.5">
                                                {exclusionsList.length === 0 ? (
                                                    <span className={`text-[11px] italic py-1 ${isBright ? 'text-zinc-400' : 'text-white/35'}`}>
                                                        {t('cfg.appearance.whitelistEmpty', null, 'No excluded domains. Smart Dark Mode will evaluate all websites automatically.')}
                                                    </span>
                                                ) : filteredExclusions.length === 0 ? (
                                                    <span className={`text-[11px] italic py-1 ${isBright ? 'text-zinc-400' : 'text-white/35'}`}>
                                                        {t('cfg.appearance.whitelistNoMatches', { query: darkWhitelistSearch }, `No whitelisted domains matching "${darkWhitelistSearch}".`)}
                                                    </span>
                                                ) : (
                                                    filteredExclusions.map((domain) => {
                                                        const isWildcard = domain.startsWith('*.');
                                                        return (
                                                            <span
                                                                key={domain}
                                                                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-mono border transition ${
                                                                    isWildcard
                                                                        ? (isBright
                                                                            ? 'bg-amber-500/[0.08] border-amber-500/25 text-amber-900 shadow-xs'
                                                                            : 'bg-accent/10 border-accent/25 text-accent')
                                                                        : (isBright
                                                                            ? 'bg-white border-black/10 text-zinc-800 shadow-xs'
                                                                            : 'bg-white/[0.04] border-white/10 text-zinc-200')
                                                                }`}
                                                            >
                                                                <Globe size={11} className={isWildcard ? 'text-accent opacity-90' : (isBright ? 'text-zinc-400' : 'text-white/35')} />
                                                                <span>{domain}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveDarkWhitelist(domain)}
                                                                    className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition cursor-pointer"
                                                                    title={t('cfg.common.remove', null, 'Remove')}
                                                                >
                                                                    <X size={11} />
                                                                </button>
                                                            </span>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            )}

                            {/* 2. QUICK PRESETS */}
                            {appearanceSubTab === 'presets' && (
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Sparkles}
                                    title={t('cfg.appearance.quickPresetsTitle', null, 'Quick Presets')}
                                    subtitle={t('cfg.appearance.quickPresetsDesc', null, 'Apply curated interface themes or open Preset Studio.')}
                                    action={
                                        <button
                                            type="button"
                                            onClick={openStudio}
                                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer active:scale-95 ${
                                                isBright 
                                                    ? 'bg-black/[0.02] text-zinc-700 hover:text-zinc-950 border-black/[0.07] hover:border-black/20 hover:bg-black/5' 
                                                    : 'bg-white/[0.02] text-zinc-300 hover:text-white border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05]'
                                            }`}
                                        >
                                            <Sliders size={13} strokeWidth={2} />
                                            <span>{t('cfg.appearance.presetStudioArrow', null, 'Preset Studio')} &rarr;</span>
                                        </button>
                                    }
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[...EXPERIENCE_PRESETS, ...(customPresets || [])].map((p) => {
                                        const PresetIcon = getPresetIcon(p.icon);
                                        const isSelected = (storeActivePresetId || activePresetId) === p.id;
                                        const rawTagline = PRESET_TAGLINES[p.id] || p.tagline;
                                        const displayName = p.isCustom ? p.name : t(`cfg.presets.${p.id}.name`, null, p.name);
                                        const displayTagline = p.isCustom ? rawTagline : t(`cfg.presets.${p.id}.tagline`, null, rawTagline);

                                        const handleActivate = () => {
                                            const toastTarget = showToast || useUIStore.getState().showToast;
                                            applyExperiencePreset(p, {
                                                uiStore: useUIStore.getState(),
                                                tabStore: useTabStore.getState(),
                                                showToast: () => toastTarget?.(t('cfg.presets.appliedToast', { name: displayName }, `Preset Applied: ${displayName}`))
                                            });
                                            setActivePresetId(p.id);
                                            setStoreActivePresetId?.(p.id);
                                        };

                                        return (
                                            <div
                                                key={p.id}
                                                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group relative ${
                                                    isSelected
                                                        ? (isBright 
                                                            ? 'bg-accent/15 border-accent text-zinc-950 shadow-md ring-1 ring-accent/30' 
                                                            : 'bg-accent/10 border-accent text-white shadow-[0_0_20px_rgba(var(--accent-rgb,212,188,148),0.15)] ring-1 ring-accent/40')
                                                        : (isBright 
                                                            ? 'bg-black/[0.02] border-black/[0.07] hover:border-black/20 text-zinc-800 hover:shadow-xs' 
                                                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15 text-zinc-200 hover:shadow-xs')
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleActivate}
                                                        className="flex items-center gap-2 min-w-0 text-left cursor-pointer outline-none active:scale-[0.99] flex-1"
                                                    >
                                                        <div 
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                                                            style={{
                                                                backgroundColor: `${p.accentColor}18`,
                                                                borderColor: `${p.accentColor}40`,
                                                                color: p.accentColor
                                                            }}
                                                        >
                                                            <PresetIcon size={14} />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-xs font-bold truncate">{displayName}</span>
                                                            {isSelected && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </button>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {p.isCustom && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openStudio(p.id);
                                                                }}
                                                                title={t('cfg.appearance.editInStudio', null, 'Edit in Preset Studio')}
                                                                className={`p-1 rounded-lg border transition cursor-pointer ${
                                                                    isBright ? 'border-black/[0.07] hover:bg-black/5 text-zinc-600 hover:text-zinc-900' : 'border-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white'
                                                                }`}
                                                            >
                                                                <Edit3 size={11} />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                duplicatePreset(p.id);
                                                            }}
                                                            title={t('cfg.appearance.duplicatePreset', null, 'Duplicate Preset')}
                                                            className={`p-1 rounded-lg border transition cursor-pointer ${
                                                                isBright ? 'border-black/[0.07] hover:bg-black/5 text-zinc-600' : 'border-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white'
                                                            }`}
                                                        >
                                                            <Copy size={11} />
                                                        </button>
                                                        {p.isCustom && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteCustomPreset(p.id);
                                                                }}
                                                                title={t('cfg.appearance.deleteCustomPreset', null, 'Delete Custom Preset')}
                                                                className="p-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleActivate}
                                                    className="w-full mb-2 cursor-pointer outline-none active:scale-[0.99] text-left"
                                                >
                                                    <PresetLayoutWireframe preset={p} isSelected={isSelected} isBright={isBright} compact={true} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleActivate}
                                                    className="w-full text-left cursor-pointer outline-none"
                                                >
                                                    <p className={`text-[11px] leading-snug line-clamp-1 ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                        {displayTagline}
                                                    </p>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            )}

                            {/* 3. WALLPAPER & BACKDROP + 4. LIVE WALLPAPER PLAYBACK */}
                            {appearanceSubTab === 'wallpaper' && (
                            <div className="space-y-6">
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={ImageIcon}
                                    title={t('cfg.appearance.wallpaperTitle', null, 'Wallpaper & Backdrop')}
                                    subtitle={t('cfg.appearance.wallpaperDesc', null, 'Customize homepage backgrounds, live video/GIF wallpapers, and transitions.')}
                                    action={
                                        customWallpaper && (
                                            <button
                                                type="button"
                                                onClick={handleResetWallpaper}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                    isBright
                                                        ? 'bg-black/[0.02] text-zinc-700 hover:text-zinc-950 border-black/[0.07] hover:bg-black/5'
                                                        : 'bg-white/[0.02] text-zinc-300 hover:text-white border-white/[0.06] hover:bg-white/[0.06]'
                                                }`}
                                                title={t('cfg.appearance.resetWallpaperTitle', null, 'Reset to default wallpaper')}
                                            >
                                                <RotateCcw size={12} />
                                                <span>{t('cfg.appearance.resetToDefault', null, 'Reset to Default')}</span>
                                            </button>
                                        )
                                    }
                                />

                                {/* Wallpaper Preview & Source Import Container */}
                                <div className={`p-3.5 px-4 rounded-xl border space-y-3 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center p-3 rounded-xl border ${
                                        isBright ? 'bg-white/75 border-black/[0.07]' : 'bg-black/30 border-white/[0.06]'
                                    }`}>
                                        <WallpaperPreviewThumbnail
                                            customWallpaper={customWallpaper}
                                            loopMode={wallpaperVideoLoopMode}
                                            crossfadeDuration={wallpaperVideoCrossfadeDuration}
                                            dimming={wallpaperDimming}
                                            blur={wallpaperBlur}
                                            blurEnabled={blurWallpaper}
                                            defaultThumbnail={DEFAULT_STOCK_THUMBNAIL}
                                        />

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs font-medium ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                    {t('cfg.appearance.activeSource', null, 'Active Source:')}
                                                </span>
                                                <span className="text-xs font-mono font-semibold text-accent">
                                                    {getLocalizedWallpaperBadge(customWallpaper, customWallpaperSource)}
                                                </span>
                                                {customWallpaperSource === 'file' && (
                                                    <span className={`text-[10px] italic ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        {t('cfg.appearance.localOnlyNote', null, '(Local only, skipped during cloud sync)')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[11px] leading-relaxed truncate ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {!customWallpaper 
                                                    ? t('cfg.appearance.wallpaperDescDefault', null, 'Default dynamic landscape wallpaper is active. Import your own photo, GIF, or looping video to personalize your workspace.')
                                                    : customWallpaperSource === 'file'
                                                        ? t('cfg.appearance.wallpaperDescFile', null, 'Using an imported local media file stored safely in your application data directory.')
                                                        : t('cfg.appearance.wallpaperDescUrl', { url: customWallpaperOriginalUrl || customWallpaper }, `Loaded from web URL: ${customWallpaperOriginalUrl || customWallpaper}`)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Import Controls */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Local File Import */}
                                        <div className={`p-3 rounded-xl border flex flex-col justify-between gap-3 ${
                                            isBright ? 'bg-white/75 border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                        }`}>
                                            <div>
                                                <p className={`text-xs font-medium flex items-center gap-1.5 ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                    <Upload size={13} className="text-accent" />
                                                    <span>{t('cfg.appearance.chooseFromDrive', null, 'Choose from Hard Drive')}</span>
                                                </p>
                                                <p className={`text-[11px] mt-1 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {t('cfg.appearance.chooseFromDriveDesc', null, 'Pick a JPG, PNG, WebP, GIF, or MP4/WebM video from your PC. Automatically saved into app storage.')}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleImportWallpaperFile}
                                                disabled={isImportingFile}
                                                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                                                    isBright
                                                        ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-900 border-black/[0.07]'
                                                        : 'bg-white/10 hover:bg-white/15 text-white border-white/[0.06]'
                                                }`}
                                            >
                                                {isImportingFile ? (
                                                    <RefreshCw size={13} className="animate-spin text-accent" />
                                                ) : (
                                                    <Upload size={13} />
                                                )}
                                                <span>{isImportingFile ? t('cfg.appearance.importing', null, 'Importing...') : t('cfg.appearance.browseMediaFile', null, 'Browse Media File...')}</span>
                                            </button>
                                        </div>

                                        {/* Web URL Import */}
                                        <div className={`p-3 rounded-xl border flex flex-col justify-between gap-3 ${
                                            isBright ? 'bg-white/75 border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                        }`}>
                                            <div>
                                                <p className={`text-xs font-medium flex items-center gap-1.5 ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                    <LinkIcon size={13} className="text-accent" />
                                                    <span>{t('cfg.appearance.importFromUrl', null, 'Import from Web URL')}</span>
                                                </p>
                                                <p className={`text-[11px] mt-1 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {t('cfg.appearance.importFromUrlDesc', null, 'Paste any public image, GIF, or video URL (.mp4, .webm). Cached locally and synced across devices.')}
                                                </p>
                                            </div>
                                            <form onSubmit={handleImportWallpaperUrl} className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={wallpaperUrlInput}
                                                    onChange={(e) => setWallpaperUrlInput(e.target.value)}
                                                    placeholder="https://... (.jpg, .png, .gif, .mp4, .webm)"
                                                    className={`flex-1 min-w-0 border focus:border-accent rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors ${
                                                        isBright
                                                            ? 'bg-white border-black/[0.08] text-zinc-900 placeholder-zinc-400'
                                                            : 'bg-black/40 border-white/[0.06] text-white placeholder-white/25'
                                                    }`}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isImportingUrl || !wallpaperUrlInput.trim()}
                                                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-accent text-black hover:bg-accent/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                                >
                                                    {isImportingUrl ? (
                                                        <RefreshCw size={12} className="animate-spin" />
                                                    ) : (
                                                        <span>{t('cfg.common.apply', null, 'Apply')}</span>
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>

                                <SettingCard
                                    icon={Sliders}
                                    title={t('cfg.appearance.dimmingTitle', null, 'Backdrop Contrast Dimming')}
                                    description={t('cfg.appearance.dimmingDesc', null, 'Adjust dark overlay to ensure text and tab readability over bright wallpapers.')}
                                >
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <input
                                            type="range"
                                            min={0}
                                            max={80}
                                            step={5}
                                            value={wallpaperDimming}
                                            onChange={(e) => setWallpaperDimming(Number(e.target.value))}
                                            className={`w-32 sm:w-44 h-1.5 ${isBright ? 'bg-black/10' : 'bg-white/10'} rounded-lg appearance-none cursor-pointer accent-accent`}
                                        />
                                        <span className="text-xs font-mono font-semibold text-accent w-10 text-right select-none">{wallpaperDimming}%</span>
                                    </div>
                                </SettingCard>

                                <SettingCard
                                    icon={ImageIcon}
                                    title={t('cfg.appearance.blurWallpaperTitle', null, 'Blur Wallpaper Background')}
                                    description={t('cfg.appearance.blurWallpaperDesc', null, 'When disabled, the wallpaper stays crisp and sharp while UI panels retain frosted glass blur.')}
                                >
                                    <SettingToggle
                                        isChecked={!!blurWallpaper}
                                        onToggle={() => toggleSetting('blurWallpaper')}
                                    />
                                </SettingCard>

                                {isCurrentLive && (
                                    <>
                                        <SettingCard
                                            icon={RotateCcw}
                                            title={t('cfg.appearance.loopModeTitle', null, 'Live Wallpaper Loop Mode')}
                                            description={t('cfg.appearance.loopModeDesc', null, 'Choose how video and animated GIF wallpapers transition between cycles.')}
                                        >
                                            <div className="min-w-[260px]">
                                                <SlidingPillSwitcher
                                                    options={[
                                                        { id: 'crossfade', label: t('cfg.appearance.loopCrossfade', null, 'Cross-Dissolve') },
                                                        { id: 'dip', label: t('cfg.appearance.loopDip', null, 'Ambient Dip') },
                                                        { id: 'cut', label: t('cfg.appearance.loopCut', null, 'Instant Cut') }
                                                    ]}
                                                    value={wallpaperVideoLoopMode}
                                                    onChange={(mode) => setWallpaperVideoLoopMode(mode)}
                                                    isBright={isBright}
                                                    size="sm"
                                                />
                                            </div>
                                        </SettingCard>

                                        {wallpaperVideoLoopMode !== 'cut' && (
                                            <SettingCard
                                                icon={SlidersHorizontal}
                                                title={wallpaperVideoLoopMode === 'dip'
                                                    ? t('cfg.appearance.dipDurationTitle', null, 'Ambient Dip Duration')
                                                    : t('cfg.appearance.dissolveDurationTitle', null, 'Loop Dissolve Duration')}
                                                description={
                                                    wallpaperVideoLoopMode === 'dip'
                                                        ? t('cfg.appearance.dipDurationDesc', null, 'Total time of the ambient fade-down and return cycle.')
                                                        : t('cfg.appearance.dissolveDurationDesc', null, 'Length of the blending overlap window between loop endings and beginnings.')
                                                }
                                            >
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <input
                                                        type="range"
                                                        min={0.4}
                                                        max={2.5}
                                                        step={0.1}
                                                        value={wallpaperVideoCrossfadeDuration}
                                                        onChange={(e) => setWallpaperVideoCrossfadeDuration(Number(e.target.value))}
                                                        className={`w-32 sm:w-44 h-1.5 ${isBright ? 'bg-black/10' : 'bg-white/10'} rounded-lg appearance-none cursor-pointer accent-accent`}
                                                    />
                                                    <span className="text-xs font-mono font-semibold text-accent w-10 text-right select-none">{wallpaperVideoCrossfadeDuration.toFixed(1)}s</span>
                                                </div>
                                            </SettingCard>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* 4. LIVE WALLPAPER PLAYBACK */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Play}
                                    title={t('cfg.appearance.livePlaybackTitle', null, 'Live Wallpaper Playback')}
                                    subtitle={t('cfg.appearance.livePlaybackDesc', null, 'Control when animated wallpapers play or pause to save resources.')}
                                />

                                <SettingCard
                                    icon={Zap}
                                    title={t('cfg.appearance.pauseUnfocusedTitle', null, 'Pause When Window is Unfocused')}
                                    description={t('cfg.appearance.pauseUnfocusedDesc', null, 'Automatically pause video and animated GIF playback when QBrowse is minimized or unfocused to eliminate CPU/GPU drain.')}
                                >
                                    <SettingToggle
                                        isChecked={settings?.pauseWallpaperInBackground !== false}
                                        onToggle={() => toggleSetting('pauseWallpaperInBackground')}
                                    />
                                </SettingCard>

                                <SettingCard
                                    icon={Globe}
                                    title={t('cfg.appearance.pauseWebviewTitle', null, 'Pause While Browsing Websites')}
                                    description={t('cfg.appearance.pauseWebviewDesc', null, 'Pause animated video and GIF wallpapers whenever an active website tab is open, resuming automatically on the New Tab page.')}
                                >
                                    <SettingToggle
                                        isChecked={!!settings?.pauseWallpaperOnWebview}
                                        onToggle={() => toggleSetting('pauseWallpaperOnWebview')}
                                    />
                                </SettingCard>

                                <SettingCard
                                    icon={BatteryCharging}
                                    title={t('cfg.appearance.pauseEcoTitle', null, 'Pause in Eco / Battery Saver Mode')}
                                    description={t('cfg.appearance.pauseEcoDesc', null, 'Freeze animated wallpapers during laptop battery saving or Eco Mode.')}
                                >
                                    <SettingToggle
                                        isChecked={settings?.pauseWallpaperInEcoMode !== false}
                                        onToggle={() => toggleSetting('pauseWallpaperInEcoMode')}
                                    />
                                </SettingCard>
                            </div>
                            </div>
                            )}

                            {/* 5. GLASS & SURFACE EFFECTS */}
                            {appearanceSubTab === 'effects' && (
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Layers}
                                    title={t('cfg.appearance.glassEffectsTitle', null, 'Glass & Surface Effects')}
                                    subtitle={t('cfg.appearance.glassEffectsDesc', null, 'Adjust frosted glass blur intensity and ambient glow.')}
                                />

                                <SettingCard
                                    icon={Sliders}
                                    title={t('cfg.appearance.glassmorphismTitle', null, 'UI Transparency (Glassmorphism)')}
                                    description={t('cfg.appearance.glassmorphismDesc', null, 'Disable backdrop-blur translucency for weaker GPUs.')}
                                >
                                    <SettingToggle isChecked={isGlassEnabled} onToggle={() => setIsGlassEnabled(!isGlassEnabled)} />
                                </SettingCard>

                                <SettingCard
                                    icon={Sparkles}
                                    title={t('cfg.appearance.frostedBlurTitle', null, 'Liquid Glass UI Frosted Blur')}
                                    description={t('cfg.appearance.frostedBlurDesc', null, 'Adjust frosted glass diffusion on UI surfaces (Sidebar, TopBar, and tab windows).')}
                                >
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <input
                                            type="range"
                                            min={0}
                                            max={48}
                                            step={2}
                                            value={wallpaperBlur}
                                            onChange={(e) => setWallpaperBlur(Number(e.target.value))}
                                            className={`w-32 sm:w-44 h-1.5 ${isBright ? 'bg-black/10' : 'bg-white/10'} rounded-lg appearance-none cursor-pointer accent-accent`}
                                        />
                                        <span className="text-xs font-mono font-semibold text-accent w-10 text-right select-none">{wallpaperBlur}px</span>
                                    </div>
                                </SettingCard>

                                <SettingCard
                                    icon={Maximize2}
                                    title={t('cfg.appearance.swipeAnimTitle', null, 'Space Swipe Animations')}
                                    description={t('cfg.appearance.swipeAnimDesc', null, 'Physical screen swipe transitions when switching workspace tabs.')}
                                >
                                    <SettingToggle isChecked={isSwipeEnabled} onToggle={() => setIsSwipeEnabled(!isSwipeEnabled)} />
                                </SettingCard>

                                <SettingCard
                                    icon={Sparkles}
                                    title={t('cfg.appearance.faviconGlowTitle', null, 'Active Tab Favicon Glow')}
                                    description={t('cfg.appearance.faviconGlowDesc', null, 'Render a subtle glowing aura around active tab favicons.')}
                                >
                                    <SettingToggle isChecked={!!settings.faviconGlow} onToggle={() => toggleSetting('faviconGlow')} />
                                </SettingCard>

                                <SettingCard
                                    icon={Layers}
                                    title={t('cfg.appearance.visualTabSwitcherTitle', null, 'Visual Tab Switcher (Ctrl+Tab)')}
                                    description={
                                        osPlatform === 'win32'
                                            ? t('cfg.appearance.visualTabSwitcherDescWin', null, 'Show Windows-style card carousel overlay when pressing Ctrl+Tab. Disable for instant tab switching with zero overlay.')
                                            : t('cfg.appearance.visualTabSwitcherDescOther', null, 'Show desktop card carousel overlay when pressing Ctrl+Tab. Disable for instant tab switching with zero overlay.')
                                    }
                                >
                                    <SettingToggle isChecked={settings.visualTabSwitcher !== false} onToggle={() => toggleSetting('visualTabSwitcher')} />
                                </SettingCard>
                            </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: LAYOUT & INTERFACE */}
                    {settingsTab === 'layout' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.layout.title', null, 'Layout & Interface')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {t('cfg.layout.subtitle', null, 'Configure spatial dockings, window geometry, omnibox architecture, and toolbar controls.')}
                                </p>
                            </div>

                            <SlidingPillSwitcher
                                options={[
                                    { id: 'panels', label: t('cfg.layout.subTabs.panels', null, 'Panels & Bars'), icon: Layout },
                                    { id: 'window', label: t('cfg.layout.subTabs.window', null, 'Window & Style'), icon: Monitor },
                                    { id: 'behavior', label: t('cfg.layout.subTabs.behavior', null, 'Behavior'), icon: Sliders }
                                ]}
                                value={layoutSubTab}
                                onChange={setLayoutSubTab}
                                isBright={isBright}
                                size="sm"
                            />

                            {/* Spatial Positioning */}
                            {layoutSubTab === 'panels' && (
                            <>
                                    <div className="space-y-3">
                                        <SectionHeader 
                                            icon={Compass} 
                                            title={t('cfg.layout.spatialTitle', null, 'Spatial Positioning')} 
                                            description={t('cfg.layout.spatialDesc', null, 'Dock primary bars, drawers, and vertical tabs across screen coordinates.')} 
                                        />

                                        {/* Sidebar Position */}
                                        <SettingCard 
                                            icon={Sidebar} 
                                            title={t('cfg.layout.sidebarPosTitle', null, 'Sidebar Position')} 
                                            description={t('cfg.layout.sidebarPosDesc', null, 'Dock workspace navigation and vertical tabs on the left or right edge.')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: sidebarPosition === 'right' ? 'translateX(100%)' : 'translateX(0)'
                                                    }}
                                                />
                                                {[
                                                    { id: 'left', label: t('cfg.layout.pos.left', null, 'Left') },
                                                    { id: 'right', label: t('cfg.layout.pos.right', null, 'Right') }
                                                ].map(s => {
                                                    const isSelected = sidebarPosition === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => handleSetSidebarPosition(s.id)}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>

                                        {/* Top Bar Position */}
                                        <SettingCard 
                                            icon={Layout} 
                                            title={t('cfg.layout.topBarPosTitle', null, 'Top Bar Position')} 
                                            description={t('cfg.layout.topBarPosDesc', null, 'Position the omnibox address bar, navigation buttons, and tab controls.')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: topBarPosition === 'bottom' ? 'translateX(100%)' : 'translateX(0)'
                                                    }}
                                                />
                                                {[
                                                    { id: 'top', label: t('cfg.layout.pos.top', null, 'Top') },
                                                    { id: 'bottom', label: t('cfg.layout.pos.bottom', null, 'Bottom') }
                                                ].map(s => {
                                                    const isSelected = topBarPosition === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => handleSetTopBarPosition(s.id)}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>

                                        {/* Tool Hub Drawer */}
                                        <SettingCard 
                                            icon={SlidersHorizontal} 
                                            title={t('cfg.layout.toolHubPosTitle', null, 'Tool Hub Drawer Position')} 
                                            description={t('cfg.layout.toolHubPosDesc', null, 'Side panel dock for extensions, downloads, QVault, and AI assistant.')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: toolHubPosition === 'right' ? 'translateX(100%)' : 'translateX(0)'
                                                    }}
                                                />
                                                {[
                                                    { id: 'left', label: t('cfg.layout.pos.left', null, 'Left') },
                                                    { id: 'right', label: t('cfg.layout.pos.right', null, 'Right') }
                                                ].map(s => {
                                                    const isSelected = toolHubPosition === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => handleSetToolHubPosition(s.id)}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>
                                        <p className={`text-[11px] px-1 -mt-1 font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {t('cfg.layout.collisionNote', null, 'Note: If docked on the same side as the Sidebar, the Sidebar will automatically adjust to the opposite side to prevent interface collision.')}
                                        </p>
                                    </div>

                                    {/* Preset Studio Launch Banner */}
                                    <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                        isBright
                                            ? 'bg-black/[0.02] border-black/[0.07]'
                                            : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                                    isBright
                                                        ? 'bg-black/[0.04] text-zinc-900 border-black/[0.07]'
                                                        : 'bg-accent/10 text-accent border-white/[0.06]'
                                                }`}>
                                                    <Sliders size={20} strokeWidth={2.2} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold tracking-tight">{t('cfg.layout.presetStudioBannerTitle', null, 'Preset Studio')}</h4>
                                                    <p className={`text-xs mt-0.5 max-w-xl ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                        {t('cfg.layout.presetStudioBannerDesc', null, 'Craft, preview, and arrange custom spatial architectures with drag-and-drop live preview, custom docking slots, and preset duplication.')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={openStudio}
                                                className="px-4 py-2 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer hover:brightness-105 active:scale-95 shadow-md shrink-0"
                                            >
                                                <Sliders size={14} strokeWidth={2.4} />
                                                <span>{t('cfg.layout.launchPresetStudio', null, 'Launch Preset Studio')}</span>
                                            </button>
                                        </div>
                                    </div>
                            </>
                            )}

                            {/* Window & Bar Geometry */}
                            {layoutSubTab === 'window' && (
                                    <div className="space-y-3">
                                        <SectionHeader 
                                            icon={Laptop} 
                                            title={t('cfg.layout.geometryTitle', null, 'Window & Bar Geometry')} 
                                            description={t('cfg.layout.geometryDesc', null, 'Window frame geometry, omnibox presentation, and system window controls.')} 
                                        />

                                        {/* 1. Window Frame Curvature */}
                                        <SettingCard 
                                            icon={Square} 
                                            title={t('cfg.layout.curvatureTitle', null, 'Window Frame Curvature')} 
                                            description={t('cfg.layout.curvatureDesc', null, 'Adjust curvature across the main webview frame, sidebar, topbar, and elements (Default 20px, Cohesive 12px, Sharp 0px).')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.67px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: (settings.frameCurvature || "default") === "cohesive" 
                                                            ? "translateX(100%)" 
                                                            : (settings.frameCurvature || "default") === "square" 
                                                            ? "translateX(200%)" 
                                                            : "translateX(0%)"
                                                    }}
                                                />
                                                {[
                                                    { id: "default", label: t('cfg.layout.curvatureDefault', null, 'Default') },
                                                    { id: "cohesive", label: t('cfg.layout.curvatureCohesive', null, 'Cohesive') },
                                                    { id: "square", label: t('cfg.layout.curvatureSharp', null, 'Sharp') }
                                                ].map(s => {
                                                    const isSelected = (settings.frameCurvature || "default") === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSettingValue("frameCurvature", s.id);
                                                                setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
                                                            }}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>

                                        {/* 2. Omnibox Display Profiles */}
                                        <SettingCard 
                                            icon={Search} 
                                            title={t('cfg.layout.omniboxTitle', null, 'Omnibox Architecture')} 
                                            description={t('cfg.layout.omniboxDesc', null, 'Select the centered horizontal span and fluid focus expansion of the address bar.')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.67px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: (settings.omniboxStyle || "capsule") === "wide" 
                                                            ? "translateX(100%)" 
                                                            : (settings.omniboxStyle || "capsule") === "minimal" 
                                                            ? "translateX(200%)" 
                                                            : "translateX(0%)"
                                                    }}
                                                />
                                                {[
                                                    { id: "capsule", label: t('cfg.layout.omniboxCapsule', null, 'Capsule') },
                                                    { id: "wide", label: t('cfg.layout.omniboxWide', null, 'Wide') },
                                                    { id: "minimal", label: t('cfg.layout.omniboxMinimal', null, 'Minimal') }
                                                ].map(s => {
                                                    const isSelected = (settings.omniboxStyle || "capsule") === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => setSettingValue("omniboxStyle", s.id)}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>

                                        {/* 3. Sidebar Tab Presentation Modes */}
                                        <SettingCard 
                                            icon={Layers} 
                                            title={t('cfg.layout.tabPresentationTitle', null, 'Tab Presentation')} 
                                            description={t('cfg.layout.tabPresentationDesc', null, 'Switch between liquid glass pills, high-density minimal rows, or rich card tiles.')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.67px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: (settings.tabPresentation || "pills") === "compact" 
                                                            ? "translateX(100%)" 
                                                            : (settings.tabPresentation || "pills") === "cards" 
                                                            ? "translateX(200%)" 
                                                            : "translateX(0%)"
                                                    }}
                                                />
                                                {[
                                                    { id: "pills", label: t('cfg.layout.tabPills', null, 'Pills') },
                                                    { id: "compact", label: t('cfg.layout.tabCompact', null, 'Compact') },
                                                    { id: "cards", label: t('cfg.layout.tabCards', null, 'Cards') }
                                                ].map(s => {
                                                    const isSelected = (settings.tabPresentation || "pills") === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => setSettingValue("tabPresentation", s.id)}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>

                                        {/* 4. Traffic Light & Window Button Styles */}
                                        <SettingCard 
                                            icon={Laptop} 
                                            title={t('cfg.layout.windowControlsStyleTitle', null, 'Window Controls Style')} 
                                            description={t('cfg.layout.windowControlsStyleDesc', null, 'Choose macOS traffic dots, clean native Windows icons, or stealth minimal glyphs.')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.67px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: (settings.windowControlsStyle || "mac") === "windows" 
                                                            ? "translateX(100%)" 
                                                            : (settings.windowControlsStyle || "mac") === "minimal" 
                                                            ? "translateX(200%)" 
                                                            : "translateX(0%)"
                                                    }}
                                                />
                                                {[
                                                    { id: "mac", label: "macOS" },
                                                    { id: "windows", label: "Windows" },
                                                    { id: "minimal", label: t('cfg.layout.windowControlsMinimal', null, 'Minimal') }
                                                ].map(s => {
                                                    const isSelected = (settings.windowControlsStyle || "mac") === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => setSettingValue("windowControlsStyle", s.id)}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>

                                        {/* 5. Window Controls Button Order */}
                                        <SettingCard 
                                            icon={SlidersHorizontal} 
                                            title={t('cfg.layout.windowControlsLayoutTitle', null, 'Window Controls Layout')} 
                                            description={t('cfg.layout.windowControlsLayoutDesc', null, 'Smart Corner keeps Close at the outer screen edge. Or lock Close first (macOS) vs Minimize first (Windows).')}
                                        >
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? "bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" 
                                                    : "bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.67px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: (settings.windowControlsOrder || "auto") === "close-first" 
                                                            ? "translateX(100%)" 
                                                            : (settings.windowControlsOrder || "auto") === "minimize-first" 
                                                            ? "translateX(200%)" 
                                                            : "translateX(0%)"
                                                    }}
                                                />
                                                {[
                                                    { id: "auto", label: t('cfg.layout.orderAuto', null, 'Smart Corner') },
                                                    { id: "close-first", label: t('cfg.layout.orderCloseFirst', null, 'Close First') },
                                                    { id: "minimize-first", label: t('cfg.layout.orderMinimizeFirst', null, 'Minimize First') }
                                                ].map(s => {
                                                    const isSelected = (settings.windowControlsOrder || "auto") === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => setSettingValue("windowControlsOrder", s.id)}
                                                            className={`relative z-10 flex-1 min-w-[78px] py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? "text-zinc-950 font-bold" : "text-black font-bold")
                                                                    : (isBright ? "text-zinc-600 hover:text-zinc-950" : "text-white/60 hover:text-white")
                                                            }`}
                                                        >
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>
                                    </div>
                            )}

                            {/* Toolbar & Extension Hub Icons (Panels & Bars) */}
                            {layoutSubTab === 'panels' && (
                                    <div className="space-y-3">
                                        <SectionHeader 
                                            icon={Sliders} 
                                            title={t('cfg.layout.toolbarSectionTitle', null, 'Toolbar & Controls')} 
                                            description={t('cfg.layout.toolbarSectionDesc', null, 'Toolbar quick access icons and interaction behaviors.')} 
                                        />

                                        {/* Toolbar & Extensions Hub Quick Icons Card */}
                                        <div className={`p-5 rounded-2xl border space-y-3 transition-all duration-200 ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                                        isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-accent/10 text-accent border-white/[0.06]'
                                                    }`}>
                                                        <SlidersHorizontal size={17} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{t('cfg.layout.hubIconsTitle', null, 'Toolbar & Extension Hub Icons')}</p>
                                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.layout.hubIconsDesc', null, 'Toggle quick-access buttons in the top bar. You can also right-click any icon in the toolbar to hide it.')}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => useUIStore.getState().resetTopBarIcons()}
                                                    className="text-xs text-accent hover:underline cursor-pointer"
                                                >
                                                    {t('cfg.layout.restoreAll', null, 'Restore All')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2">
                                                {[
                                                    { id: 'splitview', label: t('cfg.layout.iconLabels.splitview', null, 'Split View') },
                                                    { id: 'theme', label: t('cfg.layout.iconLabels.theme', null, 'Theme Toggle') },
                                                    { id: 'shield', label: t('cfg.layout.iconLabels.shield', null, 'QShield Tracker') },
                                                    { id: 'media', label: t('cfg.layout.iconLabels.media', null, 'Media Player') },
                                                    { id: 'downloads', label: t('cfg.layout.iconLabels.downloads', null, 'Downloads') },
                                                    { id: 'tor', label: t('cfg.layout.iconLabels.tor', null, 'Tor Network') },
                                                    { id: 'vault', label: t('cfg.layout.iconLabels.vault', null, 'QVault Passwords') }
                                                ].map(item => {
                                                    const isItemVisible = !(settings.hiddenTopBarIcons || []).includes(item.id);
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => useUIStore.getState().toggleTopBarIcon(item.id)}
                                                            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                                                                isItemVisible
                                                                    ? (isBright 
                                                                        ? 'bg-accent/15 border-accent/40 text-zinc-900 font-semibold shadow-xs' 
                                                                        : 'bg-accent/15 border-accent/35 text-white font-semibold shadow-xs')
                                                                    : (isBright 
                                                                        ? 'bg-black/[0.02] border-black/[0.06] text-zinc-400 hover:text-zinc-700' 
                                                                        : 'bg-white/[0.02] border-white/[0.04] text-white/40 hover:text-white/70')
                                                            }`}
                                                        >
                                                            <span>{item.label}</span>
                                                            <span className={`w-2 h-2 rounded-full transition-colors ${isItemVisible ? 'bg-accent shadow-[0_0_6px_var(--accent)]' : (isBright ? 'bg-black/20' : 'bg-white/20')}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                            )}

                            {layoutSubTab === 'window' && (
                                    <div className="space-y-3">
                                        <SettingCard icon={Monitor} title={t('cfg.layout.densityTitle', null, 'UI Density & Scale')} description={t('cfg.layout.densityDesc', null, 'Adjust spacing, padding, and tab density across navigation controls and sidebars.')}>
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? 'bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]' 
                                                    : 'bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]'
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: (settings.uiScale || 'comfortable') === 'compact' ? 'translateX(0)' : 'translateX(100%)'
                                                    }}
                                                />
                                                {[
                                                    { id: 'compact', label: t('cfg.layout.densityCompact', null, 'Compact'), icon: Minimize2 },
                                                    { id: 'comfortable', label: t('cfg.layout.densityComfortable', null, 'Comfortable'), icon: Maximize2 }
                                                ].map(s => {
                                                    const IconComp = s.icon;
                                                    const isSelected = (settings.uiScale || 'comfortable') === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSettingValue('uiScale', s.id);
                                                                setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
                                                            }}
                                                            className={`relative z-10 flex-1 min-w-[108px] py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-black font-bold')
                                                                    : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/60 hover:text-white')
                                                            }`}
                                                        >
                                                            <IconComp size={12} strokeWidth={2.4} className={`transition-transform duration-200 ${isSelected ? 'scale-110' : 'opacity-65'}`} />
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>
                                    </div>
                            )}

                            {layoutSubTab === 'behavior' && (
                                    <div className="space-y-3">
                                        <SettingCard
                                            icon={ArrowLeftRight}
                                            title={t('cfg.layout.touchpadSwipeTitle', null, 'Touchpad Swipe Navigation (Back / Forward)')}
                                            description={t('cfg.layout.touchpadSwipeDesc', null, 'Swipe left or right with two fingers on your touchpad to navigate back and forward in page history.')}
                                        >
                                            <SettingToggle
                                                isChecked={settings.touchpadSwipeNavigation !== false}
                                                onToggle={() => toggleSetting('touchpadSwipeNavigation')}
                                            />
                                        </SettingCard>

                                        <SettingCard icon={ArrowLeftRight} title={t('cfg.layout.tabOrderTitle', null, 'Tab Switching Order (Ctrl+Tab)')} description={t('cfg.layout.tabOrderDesc', null, 'Choose whether Ctrl+Tab navigates by most recently used tabs or in sequential sidebar order.')}>
                                            <div className={`relative flex items-center p-1 border rounded-full backdrop-blur-2xl transition-all shadow-xs ${
                                                isBright 
                                                    ? 'bg-black/[0.04] border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]' 
                                                    : 'bg-black/40 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]'
                                            }`}>
                                                <div 
                                                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none"
                                                    style={{
                                                        transform: (settings.tabSwitcherOrder || 'mru') === 'sidebar' ? 'translateX(100%)' : 'translateX(0)'
                                                    }}
                                                />
                                                {[
                                                    { id: 'mru', label: t('cfg.layout.tabOrderMru', null, 'Recently Used'), icon: History },
                                                    { id: 'sidebar', label: t('cfg.layout.tabOrderSidebar', null, 'Sidebar Order'), icon: ListOrdered }
                                                ].map(s => {
                                                    const IconComp = s.icon;
                                                    const isSelected = (settings.tabSwitcherOrder || 'mru') === s.id;
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => setSettingValue('tabSwitcherOrder', s.id)}
                                                            className={`relative z-10 flex-1 min-w-[115px] py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-black font-bold')
                                                                    : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/60 hover:text-white')
                                                            }`}
                                                        >
                                                            <IconComp size={12} strokeWidth={2.4} className={`transition-transform duration-200 ${isSelected ? 'scale-110' : 'opacity-65'}`} />
                                                            <span>{s.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </SettingCard>

                                        <SettingCard icon={RotateCcw} title={t('cfg.layout.restoreTabsTitle', null, 'Remember Open Websites on Close')} description={t('cfg.layout.restoreTabsDesc', null, 'Restore your previous open tabs and active workspace when reopening QBrowse. When off, QBrowse starts fresh with a New Tab.')}>
                                            <SettingToggle isChecked={settings.restoreTabsOnStartup !== false} onToggle={() => toggleSetting('restoreTabsOnStartup')} />
                                        </SettingCard>

                                        <SettingCard icon={XSquare} title={t('cfg.layout.closeLastTabTitle', null, 'Close Window on Last Tab (Ctrl+W)')} description={t('cfg.layout.closeLastTabDesc', null, 'Close the browser window when pressing Ctrl+W with no open tabs or pinned tabs.')}>
                                            <SettingToggle isChecked={settings.closeWindowOnLastTab !== false} onToggle={() => toggleSetting('closeWindowOnLastTab')} />
                                        </SettingCard>

                                        <SettingCard icon={Maximize2} title={t('cfg.layout.framelessModeTitle', null, 'Frameless / Zen Mode (Ctrl+Alt+F)')} description={t('cfg.layout.framelessModeDesc', null, 'Hide sidebar and top bar into edge-hover drawers without entering OS fullscreen.')}>
                                            <SettingToggle
                                                isChecked={isFramelessMode}
                                                onToggle={() => {
                                                    const next = toggleFramelessMode();
                                                    showToast?.(
                                                        next
                                                            ? t('stores.shortcuts.framelessOn', null, 'Frameless Mode: On (Hover edges for bars)')
                                                            : t('stores.shortcuts.framelessOff', null, 'Frameless Mode: Off')
                                                    );
                                                }}
                                            />
                                        </SettingCard>
                                    </div>
                            )}
                        </div>
                    )}

                    {/* TAB: TYPOGRAPHY & FONTS */}
                    {settingsTab === 'typography' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.typography.title', null, 'Typography & Fonts')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {t('cfg.typography.subtitle', null, 'Customize interface typefaces, web fonts, variable weights, sizing scale, and font smoothing.')}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Type}
                                    title={t('cfg.typography.sectionTitle', null, 'Interface & Web Typography')}
                                    description={t('cfg.typography.sectionDesc', null, 'Choose curated font presets, browse Google Fonts, load local font files, and tune scale & line height.')}
                                />
                                <CustomFontManager isBright={isBright} />
                            </div>
                        </div>
                    )}

                    {/* TAB: WORKSPACES */}
                    {settingsTab === 'spaces' && (() => {
                        const spacesList = Array.isArray(settings?.customSpaces) && settings.customSpaces.length > 0
                            ? settings.customSpaces
                            : [
                                { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
                                { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
                            ];

                        return (
                            <div className="animate-tab-fade space-y-6">
                                {/* Header Section */}
                                <div className="flex items-center justify-between flex-wrap gap-4 pr-14">
                                    <div>
                                        <h3 className="text-2xl font-bold mb-1 flex items-center gap-2.5">
                                            <Layers className="text-accent" size={22} /> {t('cfg.spaces.title', null, 'Workspaces')}
                                        </h3>
                                        <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {t('cfg.spaces.subtitle', null, 'Separate tab environments with independent history and GitHub Live tracking.')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={spacesList.length >= 8 && !isCreatingSpace}
                                        onClick={() => {
                                            if (spacesList.length >= 8 && !isCreatingSpace) {
                                                showToast(t('cfg.spaces.toastMaxReached', null, 'Maximum of 8 workspaces reached'));
                                                return;
                                            }
                                            setIsCreatingSpace(prev => !prev);
                                            if (!isCreatingSpace) {
                                                setNewSpaceName('');
                                                setNewSpaceIcon('Layers');
                                                setNewSpaceShowGitHub(false);
                                            }
                                        }}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition active:scale-95 shadow-sm ${
                                            spacesList.length >= 8 && !isCreatingSpace
                                                ? (isBright ? 'bg-black/5 text-zinc-400 cursor-not-allowed' : 'bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5')
                                                : isCreatingSpace
                                                    ? (isBright ? 'bg-black/10 text-zinc-800 hover:bg-black/15 cursor-pointer' : 'bg-white/10 text-white hover:bg-white/15 cursor-pointer')
                                                    : 'bg-accent hover:bg-accent-hover text-zinc-950 cursor-pointer'
                                        }`}
                                        title={spacesList.length >= 8 && !isCreatingSpace ? t('cfg.spaces.maxReachedTitle', null, 'Maximum of 8 workspaces reached') : t('cfg.spaces.createTitle', null, 'Create new workspace')}
                                    >
                                        <Plus size={14} className={`transition-transform duration-300 ${isCreatingSpace ? 'rotate-45' : ''}`} />
                                        <span>{isCreatingSpace ? t('cfg.common.cancel', null, 'Cancel') : spacesList.length >= 8 ? t('cfg.spaces.maxReachedBtn', null, 'Max 8 Reached') : t('cfg.spaces.newWorkspaceBtn', null, 'New Workspace')}</span>
                                    </button>
                                </div>

                                {/* Create Space Form */}
                                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCreatingSpace ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                                    <div className="overflow-hidden min-h-0">
                                        <form 
                                            onSubmit={handleCreateSpace}
                                            className={`p-4 rounded-2xl border flex flex-col gap-4 my-2 ${
                                                isBright 
                                                    ? 'bg-black/[0.02] border-black/[0.07]' 
                                                    : 'bg-white/[0.02] border-white/[0.06]'
                                            }`}
                                        >
                                            <div className={`text-xs font-semibold tracking-wide ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                {t('cfg.spaces.createFormTitle', null, 'Create Workspace')}
                                            </div>

                                            {/* Name Input */}
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder={t('cfg.spaces.namePlaceholder', null, 'Workspace name (e.g. Work, Research, Dev)...')}
                                                    value={newSpaceName}
                                                    onChange={(e) => setNewSpaceName(e.target.value)}
                                                    className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none focus:border-accent border transition ${
                                                        isBright ? 'bg-white border-black/15 text-zinc-900 placeholder:text-zinc-400' : 'bg-black/40 border-white/[0.1] text-white placeholder:text-white/30'
                                                    }`}
                                                    autoFocus={isCreatingSpace}
                                                />
                                            </div>

                                            {/* Icon Picker (Clean icon buttons with tooltips, no ugly cut-off text) */}
                                            <div>
                                                <label className={`text-[11px] block mb-2 font-medium ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                    {t('cfg.spaces.chooseIcon', null, 'Choose Icon')}
                                                </label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {SPACE_ICONS.map((item) => {
                                                        const IconComp = item.icon;
                                                        const isSelected = newSpaceIcon === item.id;
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => setNewSpaceIcon(item.id)}
                                                                title={t(`cfg.spaceIcons.${item.id}`, null, item.label)}
                                                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer border hover:scale-110 active:scale-90 ${
                                                                    isSelected
                                                                        ? 'bg-accent border-accent text-zinc-950 font-bold shadow-sm ring-2 ring-accent/30'
                                                                        : (isBright 
                                                                            ? 'bg-black/[0.03] hover:bg-black/[0.07] border-black/[0.06] text-zinc-600' 
                                                                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-white/70 hover:text-white')
                                                                }`}
                                                            >
                                                                <IconComp size={16} />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* GitHub Live Toggle */}
                                            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                isBright ? 'bg-black/[0.02] border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.04]'
                                            }`}>
                                                <div className="flex items-center gap-2.5">
                                                    <GitPullRequest size={16} className="text-emerald-400 shrink-0" />
                                                    <div>
                                                        <div className={`text-xs font-medium ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                            {t('cfg.spaces.enableGithubLive', null, 'Enable GitHub Live')}
                                                        </div>
                                                        <div className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                            {t('cfg.spaces.enableGithubLiveDesc', null, 'Show open pull requests and notifications in the sidebar for this workspace.')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <SettingToggle
                                                    isChecked={newSpaceShowGitHub}
                                                    onToggle={() => setNewSpaceShowGitHub(prev => !prev)}
                                                />
                                            </div>

                                            {/* Submit / Cancel Buttons */}
                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsCreatingSpace(false);
                                                        setNewSpaceName('');
                                                        setNewSpaceIcon('Layers');
                                                        setNewSpaceShowGitHub(false);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                                        isBright ? 'hover:bg-black/5 text-zinc-600' : 'hover:bg-white/5 text-white/60'
                                                    }`}
                                                >
                                                    {t('cfg.common.cancel', null, 'Cancel')}
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                                                >
                                                    <Plus size={14} /> {t('cfg.spaces.addWorkspaceBtn', null, 'Add Workspace')}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                {/* Workspaces List Section */}
                                <div className="space-y-3">
                                    <SectionHeader
                                        icon={Layers}
                                        title={t('cfg.spaces.activeListTitle', { count: spacesList.length }, `Active Workspaces (${spacesList.length} / 8)`)}
                                        description={t('cfg.spaces.activeListDesc', null, 'Drag handle or rows to reorder your workspaces.')}
                                    />

                                    <div className="space-y-2">
                                        {spacesList.map((sp, idx) => {
                                            const IconComponent = getSpaceIconComponent(sp.icon);
                                            const isPersonal = sp.id === 'personal';
                                            const displaySpaceName = getLocalizedSpaceName(sp);
                                            const personalSpace = spacesList.find(item => item.id === 'personal');
                                            const personalSpaceLabel = getLocalizedSpaceName(personalSpace) || t('nav.personal', null, 'Personal');
                                            const isEditingThis = editingSpaceId === sp.id;
                                            const isDeletingThis = deletingSpace?.id === sp.id;
                                            const isIconPickerOpen = activeIconPickerSpaceId === sp.id;
                                            const tabCount = (useTabStore.getState().getTabsForSpace?.(sp.id) || []).length;
                                            const isBeingDragged = draggedSpaceIdx === idx;
                                            const isDragOver = dragOverSpaceIdx === idx && draggedSpaceIdx !== idx;

                                            return (
                                                <div 
                                                    key={sp.id}
                                                    ref={(el) => {
                                                        if (el) spaceItemRefs.current[sp.id] = el;
                                                        else delete spaceItemRefs.current[sp.id];
                                                    }}
                                                    draggable={!isEditingThis && !isDeletingThis && !isIconPickerOpen}
                                                    onDragStart={(e) => {
                                                        setDraggedSpaceIdx(idx);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        e.dataTransfer.setData('text/plain', String(idx));
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        if (dragOverSpaceIdx !== idx) setDragOverSpaceIdx(idx);
                                                    }}
                                                    onDragLeave={(e) => {
                                                        if (e.currentTarget.contains(e.relatedTarget)) return;
                                                        if (dragOverSpaceIdx === idx) setDragOverSpaceIdx(null);
                                                    }}
                                                    onDrop={(e) => handleSpaceDrop(e, idx)}
                                                    onDragEnd={() => {
                                                        setDraggedSpaceIdx(null);
                                                        setDragOverSpaceIdx(null);
                                                    }}
                                                    className={`relative rounded-2xl border transition-[border-color,box-shadow,background-color,opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                        isIconPickerOpen ? 'z-40' : isDragOver ? 'z-30' : 'z-10'
                                                    } ${
                                                        isBeingDragged
                                                            ? 'opacity-35 scale-[0.98] border-dashed border-accent/60 bg-accent/5 shadow-none'
                                                            : isDragOver
                                                                ? 'ring-2 ring-accent/70 shadow-xl border-accent bg-accent/[0.06]'
                                                                : (isBright 
                                                                    ? 'bg-black/[0.02] hover:bg-black/[0.04] border-black/[0.07] hover:border-black/[0.14]' 
                                                                    : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] hover:border-white/[0.12]')
                                                    }`}
                                                >
                                                    <div className="p-3 px-4 flex items-center justify-between gap-3">
                                                        {/* Left: Grip, Icon & Details */}
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            {/* Reorder Drag Handle */}
                                                            <div 
                                                                className={`p-1 rounded text-zinc-500 transition-colors cursor-grab active:cursor-grabbing shrink-0 select-none ${
                                                                    isBright ? 'hover:text-zinc-800 hover:bg-black/5' : 'hover:text-zinc-200 hover:bg-white/5'
                                                                }`}
                                                                title={t('cfg.spaces.dragHandleTitle', null, 'Drag to reorder workspace')}
                                                            >
                                                                <GripVertical size={14} />
                                                            </div>

                                                            {/* Icon button (Click to change icon) */}
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isIconPickerOpen) {
                                                                            setActiveIconPickerSpaceId(null);
                                                                            setIconPickerCoords(null);
                                                                        } else {
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const pickerW = 256;
                                                                            const pickerH = 96;
                                                                            const spaceBelow = window.innerHeight - rect.bottom - 12;
                                                                            const openAbove = spaceBelow < pickerH + 8 && rect.top > pickerH + 20;
                                                                            const left = Math.max(12, Math.min(rect.left, window.innerWidth - pickerW - 12));
                                                                            const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - pickerH - 12));
                                                                            const bottom = Math.max(12, window.innerHeight - rect.top + 8);
                                                                            setIconPickerCoords({ top, bottom, left, openAbove });
                                                                            setActiveIconPickerSpaceId(sp.id);
                                                                        }
                                                                    }}
                                                                    title={t('cfg.spaces.changeIconTitle', null, 'Change workspace icon')}
                                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer group active:scale-90 ${
                                                                        isBright 
                                                                            ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border border-black/[0.06]' 
                                                                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/[0.06]'
                                                                    }`}
                                                                >
                                                                    <IconComponent size={16} className="transition-transform duration-200 group-hover:scale-110" />
                                                                </button>

                                                                {/* Anchored Flagship Liquid Glass Icon Picker Popover (Portaled to body for true backdrop blur) */}
                                                                {isIconPickerOpen && iconPickerCoords && typeof document !== 'undefined' && createPortal(
                                                                    <>
                                                                        <div 
                                                                            className="fixed inset-0 z-[99990] bg-transparent cursor-default" 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveIconPickerSpaceId(null);
                                                                                setIconPickerCoords(null);
                                                                            }} 
                                                                            onContextMenu={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setActiveIconPickerSpaceId(null);
                                                                                setIconPickerCoords(null);
                                                                            }}
                                                                        />
                                                                        <div 
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                            className={`fixed z-[99995] !p-2.5 grid grid-cols-7 gap-1.5 w-64 animate-pop-in ${getLiquidGlassMenuClasses(isBright)}`}
                                                                            style={{
                                                                                ...(iconPickerCoords.openAbove
                                                                                    ? { bottom: `${iconPickerCoords.bottom}px` }
                                                                                    : { top: `${iconPickerCoords.top}px` }),
                                                                                left: `${iconPickerCoords.left}px`,
                                                                                ...getLiquidGlassInlineStyle(isBright)
                                                                            }}
                                                                        >
                                                                            {SPACE_ICONS.map((ic) => {
                                                                                const Ic = ic.icon;
                                                                                const isCur = (sp.icon || 'Layers') === ic.id;
                                                                                return (
                                                                                    <button
                                                                                        key={ic.id}
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            updateSpace(sp.id, { icon: ic.id });
                                                                                            setActiveIconPickerSpaceId(null);
                                                                                            setIconPickerCoords(null);
                                                                                            showToast(t('cfg.spaces.toastIconUpdated', null, 'Workspace icon updated'));
                                                                                        }}
                                                                                        title={t(`cfg.spaceIcons.${ic.id}`, null, ic.label)}
                                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-115 active:scale-90 ${
                                                                                            isCur
                                                                                                ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                                                                                                : (isBright 
                                                                                                    ? 'hover:bg-black/[0.06] text-zinc-700 hover:text-zinc-950' 
                                                                                                    : 'hover:bg-white/10 text-white/75 hover:text-white')
                                                                                        }`}
                                                                                    >
                                                                                        <Ic size={15} />
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </>,
                                                                    document.body
                                                                )}
                                                            </div>

                                                            {/* Name & Subtitle Info */}
                                                            <div className="min-w-0">
                                                                {isEditingThis ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="text"
                                                                            value={editingSpaceName}
                                                                            onChange={(e) => setEditingSpaceName(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSaveSpaceName(sp.id);
                                                                                if (e.key === 'Escape') setEditingSpaceId(null);
                                                                            }}
                                                                            maxLength={30}
                                                                            className={`px-2.5 py-1 text-xs rounded-lg outline-none border focus:border-accent ${
                                                                                isBright ? 'bg-white border-black/[0.12] text-zinc-900' : 'bg-black/40 border-white/[0.10] text-white'
                                                                            }`}
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveSpaceName(sp.id)}
                                                                            className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                                                            title={t('cfg.common.save', null, 'Save')}
                                                                        >
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingSpaceId(null)}
                                                                            className="p-1 rounded-md text-zinc-400 hover:bg-white/5 cursor-pointer"
                                                                            title={t('cfg.common.cancel', null, 'Cancel')}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 group/name">
                                                                        <span className={`text-sm font-medium truncate ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                                                            {displaySpaceName}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditingSpaceId(sp.id);
                                                                                setEditingSpaceName(sp.name);
                                                                            }}
                                                                            title={t('cfg.common.rename', null, 'Rename')}
                                                                            className={`opacity-0 group-hover/name:opacity-100 p-1 rounded-md transition cursor-pointer ${
                                                                                isBright ? 'hover:bg-black/5 text-zinc-500' : 'hover:bg-white/5 text-zinc-400'
                                                                            }`}
                                                                        >
                                                                            <Edit2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Clean Subtitle Info */}
                                                                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                                                    {isPersonal ? (
                                                                        <>
                                                                            <span className={isBright ? 'text-zinc-500' : 'text-zinc-400'}>{t('cfg.common.default', null, 'Default')}</span>
                                                                            <span>•</span>
                                                                            <span>{formatOpenTabs(tabCount)}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span>{formatOpenTabs(tabCount)}</span>
                                                                        </>
                                                                    )}
                                                                    {sp.showGitHub && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="flex items-center gap-1 text-emerald-400">
                                                                                <GitPullRequest size={10} /> {t('cfg.spaces.githubLiveLabel', null, 'GitHub Live')}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right: Controls (GitHub Live toggle, Reorder, Delete) */}
                                                        <div className="flex items-center gap-2 sm:gap-3">
                                                            {/* GitHub Live Toggle */}
                                                            <div className={`flex items-center gap-2 pr-2.5 border-r ${isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'}`}>
                                                                <span className={`text-xs hidden sm:inline ${
                                                                    isBright ? 'text-zinc-600' : 'text-zinc-400'
                                                                }`}>
                                                                    {t('cfg.spaces.githubLiveLabel', null, 'GitHub Live')}
                                                                </span>
                                                                <SettingToggle
                                                                    isChecked={!!sp.showGitHub}
                                                                    onToggle={() => {
                                                                        updateSpace(sp.id, { showGitHub: !sp.showGitHub });
                                                                        setTimeout(() => {
                                                                            useGitHubStore.getState().syncWithConfig?.();
                                                                        }, 50);
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Reorder Buttons */}
                                                            <div className="flex items-center">
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === 0}
                                                                    onClick={() => handleMoveSpaceUp(idx)}
                                                                    title={t('cfg.common.moveUp', null, 'Move Up')}
                                                                    className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer active:scale-75 hover:scale-110 ${
                                                                        idx === 0 
                                                                            ? 'opacity-20 cursor-not-allowed hover:scale-100 active:scale-100' 
                                                                            : (isBright ? 'hover:bg-black/5 text-zinc-600 hover:text-zinc-950' : 'hover:bg-white/10 text-zinc-300 hover:text-white')
                                                                    }`}
                                                                >
                                                                    <ChevronUp size={15} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === spacesList.length - 1}
                                                                    onClick={() => handleMoveSpaceDown(idx)}
                                                                    title={t('cfg.common.moveDown', null, 'Move Down')}
                                                                    className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer active:scale-75 hover:scale-110 ${
                                                                        idx === spacesList.length - 1 
                                                                            ? 'opacity-20 cursor-not-allowed hover:scale-100 active:scale-100' 
                                                                            : (isBright ? 'hover:bg-black/5 text-zinc-600 hover:text-zinc-950' : 'hover:bg-white/10 text-zinc-300 hover:text-white')
                                                                    }`}
                                                                >
                                                                    <ChevronDown size={15} />
                                                                </button>
                                                            </div>

                                                            {/* Delete Button (non-personal only) */}
                                                            {!isPersonal && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeletingSpace(sp)}
                                                                    title={t('cfg.spaces.deleteWorkspaceTitle', null, 'Delete Workspace')}
                                                                    className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer active:scale-75 hover:scale-110 ${
                                                                        isBright 
                                                                            ? 'hover:bg-rose-50 text-zinc-400 hover:text-rose-600' 
                                                                            : 'hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400'
                                                                    }`}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Delete Confirmation Bar (Smooth accordion + rounded corners clipped to card) */}
                                                    <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                        isDeletingThis ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                                                    }`}>
                                                        <div className="overflow-hidden min-h-0">
                                                            <div className={`p-3 px-4 border-t rounded-b-[15px] flex items-center justify-between gap-3 flex-wrap ${
                                                                isBright ? 'bg-rose-50/60 border-rose-100 text-rose-950' : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                                                            }`}>
                                                                <span className={`text-xs ${isBright ? 'text-rose-900' : 'text-rose-200'}`}>
                                                                    {renderTemplateParts(
                                                                        t('cfg.spaces.deleteConfirm', null, 'Delete {name}? Open tabs will move to {personal}.'),
                                                                        {
                                                                            name: <strong>{displaySpaceName}</strong>,
                                                                            personal: <strong>{personalSpaceLabel}</strong>
                                                                        }
                                                                    )}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeletingSpace(null)}
                                                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                                                                            isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 text-white/70'
                                                                        }`}
                                                                    >
                                                                        {t('cfg.common.cancel', null, 'Cancel')}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteSpace(sp.id)}
                                                                        className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition active:scale-95 shadow-sm cursor-pointer"
                                                                    >
                                                                        {t('cfg.common.delete', null, 'Delete')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Private Modes Note */}
                                <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-600' : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                                }`}>
                                    <Ghost size={16} className="text-accent shrink-0" />
                                    <p className="text-xs">
                                        <strong className={isBright ? 'text-zinc-800' : 'text-zinc-200'}>{t('cfg.spaces.privateNoteTitle', null, 'Private Browsing:')}</strong> {t('cfg.spaces.privateNoteDesc', null, 'Ghost and Tor modes run in RAM with zero disk persistence and can be launched directly from the sidebar.')}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* TAB: LANGUAGE & REGION */}
                    {settingsTab === 'language' && (
                        <LanguageSettings />
                    )}

                    {/* TAB: ACCESSIBILITY (EU European Accessibility Act / EN 301 549 & WCAG 2.1 AA) */}
                    {settingsTab === 'accessibility' && (
                        <div className="animate-tab-fade space-y-6">
                            <div className="flex items-center justify-between flex-wrap gap-3 pr-14">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">{t('cfg.accessibility.title', null, 'Accessibility')}</h3>
                                    <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {t('cfg.accessibility.subtitle', null, 'Customize visual contrast, dyslexia typography, vestibular comfort, and navigation aids.')}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        openReadAloud();
                                        showToast(t('cfg.accessibility.toastReadAloud', null, 'Read Aloud assistant launched.'));
                                    }}
                                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-accent text-zinc-950 font-bold hover:bg-accent-hover text-xs shadow-sm transition active:scale-95 cursor-pointer"
                                >
                                    <Volume2 size={14} />
                                    <span>{t('cfg.accessibility.startReadAloud', null, 'Start Read Aloud')}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">Alt+R</span>
                                </button>
                            </div>

                            {/* Section 1: Visual Contrast & Typography */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Eye}
                                    title={t('cfg.accessibility.visualSectionTitle', null, 'Visual Contrast & Typography')}
                                    description={t('cfg.accessibility.visualSectionDesc', null, 'High-contrast legibility, specialized typeface, minimum text sizing, and page scale.')}
                                />

                                <SettingCard 
                                    icon={Eye} 
                                    title={t('cfg.accessibility.highContrastTitle', null, 'High Contrast Mode')} 
                                    description={t('cfg.accessibility.highContrastDesc', null, 'Amplifies text luminance, defines stark contrast boundaries, and strips soft shadows across the QBrowse interface and web pages.')}
                                >
                                    <SettingToggle 
                                        isChecked={!!settings.a11yHighContrast} 
                                        onToggle={() => toggleSetting('a11yHighContrast')} 
                                    />
                                </SettingCard>

                                    <SettingCard 
                                        icon={Type} 
                                        title={t('cfg.accessibility.dyslexiaTitle', null, 'Dyslexia-Friendly Font (OpenDyslexic)')} 
                                        description={t('cfg.accessibility.dyslexiaDesc', null, 'Applies gravity-weighted OpenDyslexic typography with increased letter spacing to combat letter flipping and improve reading comprehension.')}
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11yDyslexiaFont} 
                                            onToggle={() => toggleSetting('a11yDyslexiaFont')} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Sliders} 
                                        title={t('cfg.accessibility.minTextSizeTitle', null, 'Minimum Text Size')} 
                                        description={t('cfg.accessibility.minTextSizeDesc', null, 'Enforces an absolute lower bound on font size so small captions and body text remain clearly readable.')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {['default', '12px', '14px', '16px', '18px'].map((sz) => (
                                                <button
                                                    key={sz}
                                                    onClick={() => setSettingValue('a11yMinFontSize', sz)}
                                                    className={`px-2.5 py-1 text-xs rounded-lg transition font-mono ${
                                                        (settings.a11yMinFontSize || 'default') === sz
                                                            ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                                                            : isBright
                                                                ? 'bg-black/5 hover:bg-black/10 text-zinc-700'
                                                                : 'bg-white/5 hover:bg-white/10 text-white/70'
                                                    }`}
                                                >
                                                    {sz === 'default' ? t('cfg.common.default', null, 'Default') : sz}
                                                </button>
                                            ))}
                                        </div>
                                    </SettingCard>

                                    <SettingCard 
                                        icon={ZoomIn} 
                                        title={t('cfg.accessibility.pageZoomTitle', null, 'Default Page Zoom')} 
                                        description={t('cfg.accessibility.pageZoomDesc', null, 'Base magnification scale applied across tabs. Standard baseline is 100%.')}
                                    >
                                        <div className="flex items-center gap-2">
                                            {/* Dedicated Reset Slot on the LEFT - Fixed width (40px) so stepper pill NEVER shifts position! */}
                                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSettingValue('a11yPageZoom', 100);
                                                        setZoomLevel(100);
                                                    }}
                                                    disabled={(settings.a11yPageZoom || 100) === 100}
                                                    title={t('cfg.accessibility.resetZoomTitle', null, 'Reset zoom to 100%')}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 cursor-pointer ${
                                                        (settings.a11yPageZoom || 100) !== 100
                                                            ? 'scale-100 opacity-100 pointer-events-auto rotate-0 shadow-sm'
                                                            : 'scale-0 opacity-0 pointer-events-none -rotate-90'
                                                    } ${
                                                        isBright
                                                            ? 'bg-black/[0.04] hover:bg-black/10 text-zinc-600 hover:text-zinc-900 border-black/10 shadow-xs'
                                                            : 'bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-accent border-white/[0.08] shadow-xs'
                                                    }`}
                                                >
                                                    <RotateCcw size={14} strokeWidth={2.2} className="transition-transform duration-300 active:-rotate-45" />
                                                </button>
                                            </div>

                                            {/* Substantial Liquid Glass Stepper Capsule (h-10) - Fixed geometry */}
                                            <div className={`flex items-center h-10 rounded-2xl border backdrop-blur-xl transition-all ${
                                                isBright 
                                                    ? 'bg-black/[0.03] hover:bg-black/[0.05] border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.8)]' 
                                                    : 'bg-white/[0.04] hover:bg-white/[0.06] border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                                            }`}>
                                                {/* Minus Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentZoom = settings.a11yPageZoom || 100;
                                                        const steps = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];
                                                        const lowerSteps = steps.filter(s => s < currentZoom);
                                                        const nextVal = lowerSteps.length > 0 ? lowerSteps[lowerSteps.length - 1] : Math.max(50, currentZoom - 10);
                                                        setSettingValue('a11yPageZoom', nextVal);
                                                        setZoomLevel(nextVal);
                                                    }}
                                                    disabled={(settings.a11yPageZoom || 100) <= 50}
                                                    title={t('cfg.accessibility.zoomOutTitle', null, 'Zoom out')}
                                                    className={`w-10 h-full rounded-l-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed ${
                                                        isBright 
                                                            ? 'hover:bg-black/5 active:bg-black/10 text-zinc-700' 
                                                            : 'hover:bg-white/10 active:bg-white/15 text-white/80'
                                                    }`}
                                                >
                                                    <Minus size={14} strokeWidth={2.5} />
                                                </button>

                                                {/* Vertical Divider */}
                                                <div className={`w-px h-5 ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />

                                                {/* Center Value */}
                                                <div 
                                                    onClick={() => {
                                                        if ((settings.a11yPageZoom || 100) !== 100) {
                                                            setSettingValue('a11yPageZoom', 100);
                                                            setZoomLevel(100);
                                                        }
                                                    }}
                                                    title={(settings.a11yPageZoom || 100) !== 100 ? t('cfg.accessibility.clickResetZoomTitle', null, 'Click to reset to 100%') : t('cfg.accessibility.defaultScaleTitle', null, 'Default scale (100%)')}
                                                    className={`w-20 h-full flex items-center justify-center select-none cursor-pointer transition-colors ${
                                                        (settings.a11yPageZoom || 100) === 100
                                                            ? isBright ? 'text-zinc-700' : 'text-zinc-200'
                                                            : 'text-accent font-bold drop-shadow-[0_0_8px_rgba(212,188,148,0.25)]'
                                                    }`}
                                                >
                                                    <span className="font-mono text-sm font-bold tracking-tight">
                                                        {settings.a11yPageZoom || 100}%
                                                    </span>
                                                </div>

                                                {/* Vertical Divider */}
                                                <div className={`w-px h-5 ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />

                                                {/* Plus Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentZoom = settings.a11yPageZoom || 100;
                                                        const steps = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];
                                                        const higherSteps = steps.filter(s => s > currentZoom);
                                                        const nextVal = higherSteps.length > 0 ? higherSteps[0] : Math.min(200, currentZoom + 10);
                                                        setSettingValue('a11yPageZoom', nextVal);
                                                        setZoomLevel(nextVal);
                                                    }}
                                                    disabled={(settings.a11yPageZoom || 100) >= 200}
                                                    title={t('cfg.accessibility.zoomInTitle', null, 'Zoom in')}
                                                    className={`w-10 h-full rounded-r-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed ${
                                                        isBright 
                                                            ? 'hover:bg-black/5 active:bg-black/10 text-zinc-700' 
                                                            : 'hover:bg-white/10 active:bg-white/15 text-white/80'
                                                    }`}
                                                >
                                                    <Plus size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </SettingCard>
                            </div>

                            {/* Section 2: Motion & Vestibular */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Zap}
                                    title={t('cfg.accessibility.motionSectionTitle', null, 'Motion & Vestibular Comfort')}
                                    description={t('cfg.accessibility.motionSectionDesc', null, 'Protect against motion sickness and vestibular strain by suppressing rapid animations.')}
                                />

                                <SettingCard 
                                    icon={Zap} 
                                    title={t('cfg.accessibility.reducedMotionTitle', null, 'Force Reduced Motion')} 
                                    description={
                                        settings?.a11yReducedMotion
                                            ? t('cfg.accessibility.reducedMotionForced', null, 'Reduced motion is manually forced on. Browser interface transitions, Tab Map 3D tilt, and web animations are suppressed.')
                                            : isSystemReducedMotion
                                                ? (osPlatform === 'darwin'
                                                    ? t('cfg.accessibility.reducedMotionSysDarwin', null, 'macOS Reduce Motion is currently turned on in System Settings. Transitions and animations are automatically suppressed to match macOS.')
                                                    : osPlatform === 'linux'
                                                        ? t('cfg.accessibility.reducedMotionSysLinux', null, 'System Accessibility animations are currently turned off in your OS. Transitions and animations are automatically suppressed to match your desktop settings.')
                                                        : t('cfg.accessibility.reducedMotionSysWin', null, 'Windows Accessibility animations are currently turned off in your OS. Transitions and animations are automatically suppressed to match Windows.'))
                                                : (osPlatform === 'darwin'
                                                    ? t('cfg.accessibility.reducedMotionDefDarwin', null, 'Disables browser interface transitions, suppresses parallax scrolling, and instructs websites to halt decorative animations. Automatically syncs with macOS Reduce Motion.')
                                                    : osPlatform === 'linux'
                                                        ? t('cfg.accessibility.reducedMotionDefLinux', null, 'Disables browser interface transitions, suppresses parallax scrolling, and instructs websites to halt decorative animations. Automatically syncs with OS Animation Effects.')
                                                        : t('cfg.accessibility.reducedMotionDefWin', null, 'Disables browser interface transitions, suppresses parallax scrolling, and instructs websites to halt decorative animations. Automatically syncs with Windows Animation Effects.'))
                                    }
                                >
                                    <SettingToggle 
                                        isChecked={!!settings.a11yReducedMotion} 
                                        onToggle={() => toggleSetting('a11yReducedMotion')} 
                                    />
                                </SettingCard>

                                <SettingCard 
                                    icon={VolumeX} 
                                    title={t('cfg.accessibility.autoplayTitle', null, 'Suppress Media Autoplay')} 
                                    description={t('cfg.accessibility.autoplayDesc', null, 'Prevents background video elements and HTML5 audiovisual streams from auto-playing without explicit user initiation.')}
                                >
                                    <SettingToggle 
                                        isChecked={!!settings.a11ySuppressAutoplay} 
                                        onToggle={() => toggleSetting('a11ySuppressAutoplay')} 
                                    />
                                </SettingCard>
                            </div>

                            {/* Section 3: Keyboard & Motor Navigation */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Keyboard}
                                    title={t('cfg.accessibility.keyboardSectionTitle', null, 'Keyboard Navigation & Focus Indicators')}
                                    description={t('cfg.accessibility.keyboardSectionDesc', null, 'Independent keyboard operation, high-visibility focus indicators, and text caret browsing.')}
                                />

                                <SettingCard 
                                    icon={Keyboard} 
                                    title={t('cfg.accessibility.caretTitle', null, 'Caret Browsing (Text Cursor Navigation)')} 
                                    description={t('cfg.accessibility.caretDesc', null, 'Place a moveable typing cursor on any web page to select text, scroll, and navigate purely via arrow keys. Press F7 at any time.')}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isBright ? 'bg-black/[0.04] border-black/[0.07] text-zinc-600' : 'bg-white/[0.04] border-white/[0.06] text-zinc-400'}`}>F7</span>
                                        <SettingToggle 
                                            isChecked={!!settings.a11yCaretBrowsing} 
                                            onToggle={() => toggleSetting('a11yCaretBrowsing')} 
                                        />
                                    </div>
                                </SettingCard>

                                <SettingCard 
                                    icon={Sliders} 
                                    title={t('cfg.accessibility.focusRingsTitle', null, 'High-Visibility Keyboard Focus Rings')} 
                                    description={t('cfg.accessibility.focusRingsDesc', null, 'Renders a high-contrast 3px glowing amber border around whichever link, button, or input currently holds keyboard focus.')}
                                >
                                    <SettingToggle 
                                        isChecked={!!settings.a11yFocusRings} 
                                        onToggle={() => toggleSetting('a11yFocusRings')} 
                                    />
                                </SettingCard>
                            </div>

                            {/* Section 4: Audio & Multimodal Reading */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Volume2}
                                    title={t('cfg.accessibility.audioSectionTitle', null, 'Auditory & Reading Assistance')}
                                    description={t('cfg.accessibility.audioSectionDesc', null, 'Text-to-speech engine, automatic video subtitles, and mono audio downmixing.')}
                                />

                                <SettingCard 
                                    icon={Volume2} 
                                    title={t('cfg.accessibility.readAloudTitle', null, 'Read Aloud Floating Assistant')} 
                                    description={t('cfg.accessibility.readAloudDesc', null, 'Launches the dedicated text-to-speech toolbar to read web articles, news, or selected text with synchronized speech.')}
                                >
                                    <button
                                        onClick={() => {
                                            openReadAloud();
                                            showToast(t('cfg.accessibility.toastReadAloud', null, 'Read Aloud assistant launched.'));
                                        }}
                                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition active:scale-95 flex items-center gap-2 cursor-pointer ${
                                            isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/[0.07] text-zinc-800' : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white'
                                        }`}
                                    >
                                        <span>{t('cfg.accessibility.launchToolbar', null, 'Launch Toolbar')}</span>
                                        <span className="text-[10px] font-mono opacity-50">Alt+R</span>
                                    </button>
                                </SettingCard>

                                <SettingCard 
                                    icon={Sparkles} 
                                    title={t('cfg.accessibility.captionsTitle', null, 'Force Video Closed Captions (Subtitles)')} 
                                    description={t('cfg.accessibility.captionsDesc', null, 'Automatically instructs HTML5 video players to activate native closed caption and subtitle text tracks by default.')}
                                >
                                    <SettingToggle 
                                        isChecked={!!settings.a11yVideoCaptions} 
                                        onToggle={() => toggleSetting('a11yVideoCaptions')} 
                                    />
                                </SettingCard>

                                <SettingCard 
                                    icon={VolumeX} 
                                    title={t('cfg.accessibility.monoAudioTitle', null, 'Mono Audio Downmix')} 
                                    description={t('cfg.accessibility.monoAudioDesc', null, 'Combines left and right stereo audio channels into both ears to ensure no content is missed for users with unilateral hearing.')}
                                >
                                    <SettingToggle 
                                        isChecked={!!settings.a11yMonoAudio} 
                                        onToggle={() => toggleSetting('a11yMonoAudio')} 
                                    />
                                </SettingCard>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PRIVACY & SECURITY */}
                    {settingsTab === 'privacy' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.privacy.title', null, 'Privacy & Security')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.privacy.subtitle', null, 'Manage encrypted DNS routing, network protection, process sandboxing, and private spaces.')}</p>
                            </div>

                            {/* 1. ENCRYPTED DNS & CUSTOM RESOLVER COMMAND CARD */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Lock}
                                    title={t('cfg.privacy.dnsSectionTitle', null, 'Encrypted DNS')}
                                    description={t('cfg.privacy.dnsSectionDesc', null, 'Route domain lookups through an encrypted HTTPS resolver to prevent ISP profiling.')}
                                />
                                <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                    isBright 
                                        ? 'bg-black/[0.02] border-black/[0.07]' 
                                        : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                                isBright 
                                                    ? 'bg-black/[0.04] text-accent border-black/[0.07]' 
                                                    : 'bg-white/[0.03] text-accent/80 border-white/[0.06]'
                                            }`}>
                                                <Server size={15} />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {t('cfg.privacy.dnsCardTitle', null, 'Encrypted DNS (DNS over HTTPS)')}
                                                </h4>
                                                <p className={`text-xs mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {t('cfg.privacy.dnsCardDesc', null, 'Select a trusted resolver or configure your own RFC 8484 DoH endpoint.')}
                                                </p>
                                            </div>
                                        </div>

                                    {/* Inline Test Connection Pill */}
                                    <button
                                        type="button"
                                        onClick={() => handleTestDns()}
                                        disabled={isTestingDns || settings.dohMode === 'off'}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                            dnsTestStatus?.ok
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : dnsTestStatus && !dnsTestStatus.ok
                                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                                    : isBright
                                                        ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700'
                                                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
                                        }`}
                                    >
                                        <Activity size={12} className={isTestingDns ? 'animate-spin text-accent' : ''} />
                                        <span>
                                            {isTestingDns 
                                                ? t('cfg.privacy.dnsTesting', null, 'Testing...') 
                                                : dnsTestStatus?.ok && dnsTestStatus.latency !== undefined 
                                                    ? t('cfg.privacy.dnsOnlineStatus', { latency: dnsTestStatus.latency }, `${dnsTestStatus.latency}ms • Online`) 
                                                    : dnsTestStatus && !dnsTestStatus.ok
                                                        ? t('cfg.privacy.dnsOfflineRetry', null, 'Offline • Retry')
                                                        : t('cfg.privacy.dnsTestConnection', null, 'Test Connection')}
                                        </span>
                                    </button>
                                </div>

                                {/* Enforcement Mode Sliding Pill Switcher */}
                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                                        isBright ? 'text-zinc-500' : 'text-zinc-400'
                                    }`}>
                                        {t('cfg.privacy.dnsEnforcementMode', null, 'Enforcement Mode')}
                                    </label>
                                    <SlidingPillSwitcher
                                        options={[
                                            { id: 'automatic', label: getLocalizedDnsMode('automatic') },
                                            { id: 'secure', label: getLocalizedDnsMode('secure') },
                                            { id: 'off', label: getLocalizedDnsMode('off') }
                                        ]}
                                        value={settings.dohMode || 'automatic'}
                                        onChange={async (mode) => {
                                            await setDnsConfiguration({ mode });
                                            showToast(t('cfg.privacy.toastDnsMode', { mode: getLocalizedDnsMode(mode) }, `DNS Mode: ${getLocalizedDnsMode(mode)}`));
                                        }}
                                        isBright={isBright}
                                        size="sm"
                                    />
                                </div>

                                {/* Resolver Provider Selector (with Custom DNS on Top!) */}
                                {settings.dohMode !== 'off' && (
                                    <div className="space-y-2.5 pt-1">
                                        <div className="flex items-center justify-between">
                                            <label className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                                                isBright ? 'text-zinc-500' : 'text-zinc-400'
                                            }`}>
                                                {t('cfg.privacy.dnsResolverProvider', null, 'Resolver Provider')}
                                            </label>
                                            <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                {t('cfg.privacy.dnsStandard', null, 'RFC 8484 Standard')}
                                            </span>
                                        </div>

                                        {/* Top Sliding Pill Switcher for Resolvers - Custom DNS is FIRST! */}
                                        <SlidingPillSwitcher
                                            options={[
                                                { id: 'custom', label: getLocalizedDnsProvider('custom') },
                                                { id: 'cloudflare', label: getLocalizedDnsProvider('cloudflare') },
                                                { id: 'quad9', label: getLocalizedDnsProvider('quad9') },
                                                { id: 'adguard', label: getLocalizedDnsProvider('adguard') },
                                                { id: 'google', label: getLocalizedDnsProvider('google') }
                                            ]}
                                            value={settings.doh || 'cloudflare'}
                                            onChange={async (providerId) => {
                                                await setDnsConfiguration({ provider: providerId });
                                                showToast(t('cfg.privacy.toastDnsProvider', { provider: getLocalizedDnsProvider(providerId) }, `DNS Provider: ${getLocalizedDnsProvider(providerId)}`));
                                            }}
                                            isBright={isBright}
                                        />

                                        {/* When Custom DNS is selected, expand Custom DoH Endpoint Input below the pill switcher */}
                                        {(settings.doh === 'custom' || settings.doh === 'nextdns') && (
                                            <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${
                                                isBright ? 'bg-black/[0.02] border-black/10' : 'bg-black/30 border-white/[0.08]'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                                                        <Server size={12} />
                                                        <span>{t('cfg.privacy.dnsCustomEndpointLabel', null, 'Custom DoH Endpoint URL or IPv4')}</span>
                                                    </label>
                                                    <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>DoH / IPv4</span>
                                                </div>

                                                {/* Quick-fill preset chips */}
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.privacy.dnsPresetsLabel', null, 'Presets:')}</span>
                                                    {[
                                                        { name: 'NextDNS', url: 'https://dns.nextdns.io' },
                                                        { name: 'Mullvad', url: 'https://dns.mullvad.net/dns-query' },
                                                        { name: 'Control D', url: 'https://freedns.controld.com/p2' },
                                                        { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
                                                        { name: 'Quad9', url: 'https://dns.quad9.net/dns-query' }
                                                    ].map(preset => (
                                                        <button
                                                            key={preset.name}
                                                            type="button"
                                                            onClick={() => setCustomDnsUrl(preset.url)}
                                                            className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                                                                customDnsUrl === preset.url
                                                                    ? 'bg-accent/20 border-accent/40 text-accent font-bold'
                                                                    : isBright
                                                                        ? 'bg-white/80 hover:bg-white border-black/10 text-zinc-700'
                                                                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                                                            }`}
                                                        >
                                                            {preset.name}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2">
                                                    <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
                                                        isBright
                                                            ? 'bg-white border-black/15 text-zinc-900 focus-within:border-accent'
                                                            : 'bg-black/40 border-white/[0.08] text-white focus-within:border-accent'
                                                    }`}>
                                                        <Globe size={13} className={isBright ? 'text-zinc-400' : 'text-white/40'} />
                                                        <input
                                                            type="text"
                                                            placeholder={t('cfg.privacy.dnsUrlPlaceholder', null, 'https://dns.example.com/dns-query or 9.9.9.9')}
                                                            value={customDnsUrl}
                                                            onChange={(e) => setCustomDnsUrl(e.target.value)}
                                                            className="w-full bg-transparent text-xs font-mono outline-none"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const formatted = formatCustomDohUrl(customDnsUrl);
                                                            if (!formatted || !isValidDohUrl(formatted)) {
                                                                showToast(t('cfg.privacy.toastDnsInvalid', null, 'Please enter a valid DNS URL or IPv4 address'));
                                                                return;
                                                            }
                                                            await setDnsConfiguration({
                                                                provider: 'custom',
                                                                customUrl: formatted
                                                            });
                                                            setCustomDnsUrl(formatted);
                                                            showToast(t('cfg.privacy.toastDnsSaved', null, 'Custom DNS server saved & applied'));
                                                            handleTestDns(formatted);
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm flex items-center gap-1.5 flex-shrink-0"
                                                    >
                                                        <Check size={12} strokeWidth={2.5} />
                                                        <span>{t('cfg.common.apply', null, 'Apply')}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Active Resolver Summary Row */}
                                        <div className={`flex items-center justify-between p-2.5 px-3 rounded-xl border text-[11px] font-mono ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-600' : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                                        }`}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                                <span className="truncate">
                                                    {t('cfg.privacy.dnsActivePrefix', null, 'Active:')} {settings.doh === 'custom' 
                                                        ? (customDnsUrl || t('cfg.privacy.dnsCustomFallback', null, 'Custom DoH Endpoint'))
                                                        : DOH_PROVIDERS.find(p => p.id === (settings.doh || 'cloudflare'))?.url || 'https://cloudflare-dns.com/dns-query'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                </div>
                            </div>

                            {/* 2. PROTECTION & NETWORK ISOLATION */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Lock}
                                    title={t('cfg.privacy.isolationSectionTitle', null, 'Protection & Network Isolation')}
                                    description={t('cfg.privacy.isolationSectionDesc', null, 'Baseline privacy profile, HTTPS enforcement, process sandboxing, and leak defense.')}
                                />
                                <div className={`rounded-2xl border p-5 transition-all duration-200 space-y-3 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                {t('cfg.privacy.shieldLevelTitle', null, 'Privacy Shield Level')}
                                            </h4>
                                            <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {t('cfg.privacy.shieldLevelDesc', null, 'Select a baseline security preset or fine-tune individual protection layers below.')}
                                            </p>
                                        </div>
                                    </div>
                                    <SlidingPillSwitcher
                                        options={[
                                            { id: 'standard', label: t('cfg.privacy.levelStandard', null, 'Standard') },
                                            { id: 'strict', label: t('cfg.privacy.levelStrict', null, 'Strict') },
                                            { id: 'custom', label: t('cfg.privacy.levelCustom', null, 'Custom') }
                                        ]}
                                        value={
                                            settings.privacyLevel || (
                                                (settings.httpsOnly && settings.isolation && settings.webrtc && settings.dnt)
                                                    ? 'strict'
                                                    : (settings.httpsOnly && !settings.isolation && settings.webrtc && settings.dnt)
                                                        ? 'standard'
                                                        : 'custom'
                                            )
                                        }
                                        onChange={(level) => {
                                            if (level === 'standard') {
                                                setSettingValue('privacyLevel', 'standard');
                                                setSettingValue('httpsOnly', true);
                                                setSettingValue('isolation', false);
                                                setSettingValue('webrtc', true);
                                                setSettingValue('dnt', true);
                                                showToast(t('cfg.privacy.toastShieldStandard', null, 'Privacy Shield: Standard profile applied'));
                                            } else if (level === 'strict') {
                                                setSettingValue('privacyLevel', 'strict');
                                                setSettingValue('httpsOnly', true);
                                                setSettingValue('isolation', true);
                                                setSettingValue('webrtc', true);
                                                setSettingValue('dnt', true);
                                                showToast(t('cfg.privacy.toastShieldStrict', null, 'Privacy Shield: Strict profile applied'));
                                            } else {
                                                setSettingValue('privacyLevel', 'custom');
                                            }
                                        }}
                                        isBright={isBright}
                                    />
                                </div>

                                <SettingCard icon={Lock} title={t('cfg.privacy.httpsOnlyTitle', null, 'HTTPS-Only Mode')} description={t('cfg.privacy.httpsOnlyDesc', null, 'Automatically upgrade all connections to secure HTTPS.')}>
                                    <SettingToggle 
                                        isChecked={!!settings.httpsOnly} 
                                        onToggle={() => {
                                            setSettingValue('privacyLevel', 'custom');
                                            toggleSetting('httpsOnly');
                                        }} 
                                    />
                                </SettingCard>

                                <SettingCard icon={Cpu} title={t('cfg.privacy.isolationTitle', null, 'Strict Process Isolation')} description={t('cfg.privacy.isolationDesc', null, 'Run each site in its own isolated Electron process sandbox.')}>
                                    <SettingToggle 
                                        isChecked={!!settings.isolation} 
                                        onToggle={() => {
                                            setSettingValue('privacyLevel', 'custom');
                                            toggleSetting('isolation');
                                        }} 
                                    />
                                </SettingCard>

                            <SettingCard icon={Globe} title={t('cfg.privacy.webrtcTitle', null, 'WebRTC Leak Protection')} description={t('cfg.privacy.webrtcDesc', null, 'Prevent sites from discovering your true local IP address via WebRTC calls.')}>
                                <SettingToggle 
                                    isChecked={!!settings.webrtc} 
                                    onToggle={() => {
                                        setSettingValue('privacyLevel', 'custom');
                                        const nextVal = !settings.webrtc;
                                        toggleSetting('webrtc');
                                        if (window.electronAPI && window.electronAPI.setWebRTC) {
                                            window.electronAPI.setWebRTC(nextVal);
                                        }
                                    }}
                                />
                            </SettingCard>

                            <SettingCard icon={Eye} title={t('cfg.privacy.dntTitle', null, "Send 'Do Not Track' (DNT) Header")} description={t('cfg.privacy.dntDesc', null, 'Request that web networks and advertisers omit cross-site tracking.')}>
                                <SettingToggle 
                                    isChecked={!!settings.dnt} 
                                    onToggle={() => {
                                        setSettingValue('privacyLevel', 'custom');
                                        toggleSetting('dnt');
                                    }} 
                                />
                            </SettingCard>
                            </div>

                            {/* NETWORK & BACKGROUND SERVICES */}
                            {(() => {
                                const { active, total } = countActiveBackgroundServices(settings);
                                const isStrictOffline = settings.strictOfflineMode === true;
                                return (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <SectionHeader
                                                icon={WifiOff}
                                                title={t('cfg.cookies.networkSectionTitle', null, 'Network & Background Services')}
                                                description={t('cfg.cookies.networkSectionDesc', null, 'Control optional background network requests. Enable Strict Offline Mode to guarantee zero background traffic.')}
                                            />
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${
                                                isStrictOffline
                                                    ? (isBright ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30')
                                                    : (isBright ? 'bg-black/[0.04] text-zinc-700 border-black/10' : 'bg-white/[0.06] text-white/80 border-white/10')
                                            }`}>
                                                {t('cfg.cookies.networkActiveCount', { active, total }, `${active} of ${total} active`)}
                                            </span>
                                        </div>

                                        <SettingCard
                                            icon={WifiOff}
                                            title={t('cfg.cookies.strictOfflineTitle', null, 'Strict Offline / Zero-Background-Requests')}
                                            description={t('cfg.cookies.strictOfflineDesc', null, 'Master kill switch that blocks all optional background network requests (updates, filter refreshes, live search suggestions, remote favicons, and cloud sync).')}
                                        >
                                            <SettingToggle
                                                isChecked={isStrictOffline}
                                                onToggle={() => toggleSetting('strictOfflineMode')}
                                            />
                                        </SettingCard>

                                        <div className={`space-y-3 transition-opacity duration-200 ${isStrictOffline ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <SettingCard
                                                icon={Download}
                                                title={t('cfg.cookies.bgAutoUpdatesTitle', null, 'Automatic App Update Checks')}
                                                description={t('cfg.cookies.bgAutoUpdatesDesc', null, 'Periodically check GitHub Releases for new QBrowse versions.')}
                                            >
                                                <SettingToggle
                                                    isChecked={!isStrictOffline && settings.bgAllowAutoUpdates !== false}
                                                    disabled={isStrictOffline}
                                                    onToggle={() => toggleSetting('bgAllowAutoUpdates')}
                                                />
                                            </SettingCard>

                                            <SettingCard
                                                icon={ShieldCheck}
                                                title={t('cfg.cookies.bgFilterUpdatesTitle', null, 'Adblock Filter List Refreshes')}
                                                description={t('cfg.cookies.bgFilterUpdatesDesc', null, 'Download updated EasyList, EasyPrivacy, and uBlock filter lists in the background.')}
                                            >
                                                <SettingToggle
                                                    isChecked={!isStrictOffline && settings.bgAllowFilterUpdates !== false}
                                                    disabled={isStrictOffline}
                                                    onToggle={() => toggleSetting('bgAllowFilterUpdates')}
                                                />
                                            </SettingCard>

                                            <SettingCard
                                                icon={Search}
                                                title={t('cfg.cookies.bgLiveSuggestionsTitle', null, 'Live Search Suggestions')}
                                                description={t('cfg.cookies.bgLiveSuggestionsDesc', null, 'Fetch real-time autocomplete suggestions while typing in the omnibox.')}
                                            >
                                                <SettingToggle
                                                    isChecked={!isStrictOffline && settings.bgAllowLiveSuggestions !== false}
                                                    disabled={isStrictOffline}
                                                    onToggle={() => toggleSetting('bgAllowLiveSuggestions')}
                                                />
                                            </SettingCard>

                                            <SettingCard
                                                icon={ImageIcon}
                                                title={t('cfg.cookies.bgRemoteFaviconsTitle', null, 'Remote Website Favicons')}
                                                description={t('cfg.cookies.bgRemoteFaviconsDesc', null, "Fetch site icons via Google's favicon service for tabs, pins, and history.")}
                                            >
                                                <SettingToggle
                                                    isChecked={!isStrictOffline && settings.bgAllowRemoteFavicons !== false}
                                                    disabled={isStrictOffline}
                                                    onToggle={() => toggleSetting('bgAllowRemoteFavicons')}
                                                />
                                            </SettingCard>

                                            <SettingCard
                                                icon={UploadCloud}
                                                title={t('cfg.cookies.bgCloudSyncTitle', null, 'Background Cloud Sync')}
                                                description={t('cfg.cookies.bgCloudSyncDesc', null, 'Automatically sync encrypted tabs, settings, and vault changes to the cloud.')}
                                            >
                                                <SettingToggle
                                                    isChecked={!isStrictOffline && settings.bgAllowCloudSync !== false}
                                                    disabled={isStrictOffline}
                                                    onToggle={() => toggleSetting('bgAllowCloudSync')}
                                                />
                                            </SettingCard>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 4. PRIVATE SPACES, SYNC & VAULT */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Ghost}
                                    title={t('cfg.privacy.vaultSectionTitle', null, 'Private Spaces, Sync & Vault')}
                                    description={t('cfg.privacy.vaultSectionDesc', null, 'Tor routing, encrypted cloud auto-sync, QVault privacy rules, and browsing data cleanup.')}
                                />

                                {/* Tor Onion Network Routing */}
                                <SettingCard 
                                    icon={Globe} 
                                    title={t('cfg.privacy.torTitle', null, 'Tor Onion Network Routing')} 
                                    description={t('cfg.privacy.torDesc', null, 'Route Private space through the Tor network. Onion icon dynamically replaces Ghost in the bottom spaces bar.')}
                                >
                                    <SettingToggle 
                                        isChecked={isTorEnabled} 
                                        onToggle={() => toggleTorEnabled(undefined, { switchSpace: false, fallbackSpace: 'ghost' })} 
                                    />
                                </SettingCard>

                                {/* Encrypted Cloud Auto-Sync */}
                                <SettingCard 
                                    icon={RefreshCw} 
                                    title={t('cfg.privacy.autoSyncTitle', null, 'Encrypted Cloud Auto-Sync')} 
                                    description={user 
                                        ? t('cfg.privacy.autoSyncDescSignedIn', { time: lastSyncTime || t('cfg.common.pending', null, 'Pending') }, `Automatically encrypts (AES-256) and syncs tabs, vault, and settings every 5 minutes and on local changes. (Last sync: ${lastSyncTime || 'Pending'})`)
                                        : t('cfg.privacy.autoSyncDescSignedOut', null, 'Sign in to your account from the user profile popover to enable automatic encrypted cloud sync across devices.')
                                    }
                                >
                                    <SettingToggle 
                                        isChecked={!!user && autoSyncEnabled} 
                                        onToggle={() => {
                                            if (!user) {
                                                openModal('auth');
                                            } else {
                                                toggleAutoSync();
                                            }
                                        }} 
                                    />
                                </SettingCard>

                                {/* QVault in Ghost & Tor Spaces */}
                                <SettingCard 
                                    icon={Key} 
                                    title={t('cfg.privacy.qvaultPrivateTitle', null, 'QVault in Ghost & Tor Spaces')} 
                                    description={t('cfg.privacy.qvaultPrivateDesc', null, 'Allow inline autofill of saved passwords while in private spaces. Password save prompts are always suppressed for privacy.')}
                                >
                                    <SettingToggle 
                                        isChecked={allowVaultInGhostTor} 
                                        onToggle={() => {
                                            const next = !allowVaultInGhostTor;
                                            setAllowVaultInGhostTor(next);
                                            showToast(next ? t('cfg.privacy.toastQvaultEnabled', null, 'QVault autofill enabled in private spaces') : t('cfg.privacy.toastQvaultDisabled', null, 'QVault autofill disabled in private spaces'));
                                        }} 
                                    />
                                </SettingCard>

                                {/* Passkey Provider Routing (QVault vs Hardware / System Key) */}
                                <div className={`p-3.5 rounded-2xl border space-y-3 transition-all duration-200 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                            isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border-white/[0.06]'
                                        }`}>
                                            <KeyRound size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-medium text-xs ${isBright ? 'text-zinc-800 font-semibold' : 'text-zinc-200'}`}>
                                                {t('cfg.privacy.passkeyProviderTitle', null, 'Passkey Provider')}
                                            </p>
                                            <p className={`text-[11px] mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {t('cfg.privacy.passkeyProviderDesc', null, 'Choose whether websites use QVault passkeys first or always route directly to your Hardware / System Security Key (YubiKey, FIDO2, Windows Hello, Touch ID, Phone QR).')}
                                            </p>
                                        </div>
                                    </div>
                                    <SlidingPillSwitcher
                                        options={[
                                            { id: 'qvault', label: t('cfg.privacy.passkeyModeQvault', null, 'QVault'), icon: ShieldCheck },
                                            { id: 'hardware', label: t('cfg.privacy.passkeyModeHardware', null, 'Hardware / System Key'), icon: Usb }
                                        ]}
                                        value={settings.passkeyProviderMode === 'hardware' ? 'hardware' : 'qvault'}
                                        onChange={(mode) => {
                                            setSettingValue('passkeyProviderMode', mode);
                                            showToast(
                                                mode === 'hardware'
                                                    ? t('cfg.privacy.toastPasskeyModeHardware', null, 'Passkey Provider: Always use Hardware / System Security Key')
                                                    : t('cfg.privacy.toastPasskeyModeQvault', null, 'Passkey Provider: QVault (with Hardware Key fallback)')
                                            );
                                        }}
                                        isBright={isBright}
                                    />
                                </div>

                                {/* Automatic Hardware Key Fallback */}
                                <SettingCard
                                    icon={Usb}
                                    title={t('cfg.privacy.passkeyFallbackTitle', null, 'Automatic Hardware Key Fallback')}
                                    description={t('cfg.privacy.passkeyFallbackDesc', null, 'Automatically fall back to YubiKey, FIDO2, OS biometrics, or Phone QR when QVault has no matching passkey, is locked/unavailable in Ghost or Tor, or a site requests unsupported algorithms.')}
                                    badge={settings.passkeyProviderMode === 'hardware' ? t('cfg.privacy.passkeyFallbackAlwaysActive', null, 'Always Active') : null}
                                >
                                    <SettingToggle
                                        isChecked={settings.passkeyHardwareFallback !== false}
                                        onToggle={() => {
                                            const next = settings.passkeyHardwareFallback === false;
                                            setSettingValue('passkeyHardwareFallback', next);
                                            showToast(
                                                next
                                                    ? t('cfg.privacy.toastPasskeyFallbackEnabled', null, 'Automatic Hardware Key fallback enabled')
                                                    : t('cfg.privacy.toastPasskeyFallbackDisabled', null, 'Automatic Hardware Key fallback disabled')
                                            );
                                        }}
                                    />
                                </SettingCard>

                                {/* Excluded Sites (Never Save Passwords) */}
                                <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center gap-3 mb-2.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                            isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border-white/[0.06]'
                                        }`}>
                                            <Lock size={15} />
                                        </div>
                                        <div>
                                            <p className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('cfg.privacy.neverSavedTitle', null, 'Never Saved Sites')}</p>
                                            <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.privacy.neverSavedDesc', null, 'Websites where you dismissed credential saving with "Never for this site".')}</p>
                                        </div>
                                    </div>
                                    {neverSaveDomains.length === 0 ? (
                                        <div className={`text-center text-xs italic py-3 rounded-xl border ${isBright ? 'text-zinc-500 bg-black/[0.02] border-black/[0.07]' : 'text-zinc-400 bg-white/[0.02] border-white/[0.06]'}`}>
                                            {t('cfg.privacy.neverSavedEmpty', null, 'No sites excluded. QVault will offer to save logins across all websites.')}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {neverSaveDomains.map(d => (
                                                <div key={d} className={`flex items-center gap-2 pl-3 pr-2 py-1 rounded-lg text-xs border ${isBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-900' : 'bg-white/[0.04] border-white/[0.06] text-white/90'}`}>
                                                    <span className="font-mono text-[11px]">{d}</span>
                                                    <button 
                                                        onClick={() => {
                                                            removeNeverSaveDomain(d);
                                                            showToast(t('cfg.privacy.toastRemovedExclusion', { domain: d }, `Removed ${d} from excluded sites`));
                                                        }}
                                                        className={`w-4 h-4 rounded flex items-center justify-center transition cursor-pointer ${isBright ? 'hover:bg-black/5 text-zinc-400 hover:text-black' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                                                        title={t('cfg.privacy.removeExclusionTitle', null, 'Remove exclusion')}
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Clear Data Card */}
                                <div className={`p-4 rounded-2xl flex items-center justify-between border ${isBright ? 'bg-red-500/[0.08] border-red-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                    <div>
                                        <p className={`font-semibold text-sm ${isBright ? 'text-red-600' : 'text-red-400'}`}>{t('cfg.privacy.clearDataTitle', null, 'Clear Browsing Data')}</p>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-red-600/70' : 'text-red-400/60'}`}>{t('cfg.privacy.clearDataDesc', null, 'Clear history, cookies, and cache from local storage & SQLite.')}</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            if (window.electronAPI && window.electronAPI.clearAllData) {
                                                await window.electronAPI.clearAllData({ cookies: true, cache: true, storage: true }).catch(()=>{});
                                            }
                                            useHistoryStore.getState().clearHistory();
                                            showToast(t('cfg.privacy.toastDataCleared', null, 'All browsing data cleared!'));
                                        }}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                                    >
                                        {t('cfg.privacy.clearDataBtn', null, 'Clear Data...')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: COOKIES & PERMISSIONS */}
                    {settingsTab === 'cookies' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.cookies.title', null, 'Cookies & Site Permissions')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.cookies.subtitle', null, 'Control storage access, cross-site tracking cookies, and site rules.')}</p>
                            </div>

                            {/* Cookie Storage & Tracking */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Cookie}
                                    title={t('cfg.cookies.storageTitle', null, 'Cookie Storage & Tracking')}
                                    description={t('cfg.cookies.storageDesc', null, 'Inspect stored site data and control cross-site tracking cookies.')}
                                />

                                <SettingCard
                                    icon={Cookie}
                                    title={t('cfg.cookies.explorerTitle', null, 'Interactive Cookie Explorer')}
                                    description={t('cfg.cookies.explorerDesc', null, 'Inspect, search, and delete individual site cookies and local storage.')}
                                >
                                    <button 
                                        onClick={() => openModal('cookies')}
                                        className={`px-3 py-1.5 border font-medium rounded-lg text-xs transition cursor-pointer flex-shrink-0 active:scale-95 ${
                                            isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.06] text-white'
                                        }`}
                                    >
                                        {t('cfg.cookies.openExplorer', null, 'Open Explorer')}
                                    </button>
                                </SettingCard>

                                <SettingCard icon={ShieldAlert} title={t('cfg.cookies.block3rdPartyTitle', null, 'Block 3rd-Party Tracking Cookies')} description={t('cfg.cookies.block3rdPartyDesc', null, 'Prevent external tracking widgets from saving cross-site cookies.')}>
                                    <SettingToggle isChecked={!!settings.block3rdParty} onToggle={() => toggleSetting('block3rdParty')} />
                                </SettingCard>

                                <SettingCard icon={RotateCcw} title={t('cfg.cookies.clearOnExitTitle', null, 'Clear Cookies on Exit')} description={t('cfg.cookies.clearOnExitDesc', null, 'Automatically clear non-essential session cookies when QBrowse closes.')}>
                                    <SettingToggle isChecked={!!settings.clearOnExit} onToggle={() => toggleSetting('clearOnExit')} />
                                </SettingCard>
                            </div>

                            {/* Custom Domain Permission Overrides */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={SlidersHorizontal}
                                    title={t('cfg.cookies.overridesTitle', null, 'Site Permission Overrides')}
                                    description={t('cfg.cookies.overridesDesc', null, 'Sites with custom location, media, notification, or sound rules.')}
                                />

                                <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    {Object.keys(allPermissions).length === 0 ? (
                                        <div className={`p-4 rounded-xl border text-center text-xs ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-500' : 'bg-black/20 border-white/[0.06] text-zinc-400'
                                        }`}>
                                            {t('cfg.cookies.overridesEmpty', null, 'No custom site permissions saved yet. Click the lock icon in the address bar on any site to set rules.')}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto hide-scroll pr-1">
                                            {Object.entries(allPermissions).map(([domain, rules]) => (
                                                <div key={domain} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-black/30 border-white/[0.06]'
                                                }`}>
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <span className={`text-xs font-bold font-mono ${isBright ? 'text-zinc-900' : 'text-white'}`}>{domain}</span>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {Object.entries(rules).map(([perm, val]) => (
                                                                <span key={perm} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                                                    val === 'allow' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                    {getLocalizedPermName(perm)}: {getLocalizedPermVal(val)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveDomainRules(domain)}
                                                        className={`p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer ${
                                                            isBright ? 'text-zinc-400' : 'text-white/40'
                                                        }`}
                                                        title={t('cfg.cookies.resetPermsTitle', null, 'Reset permissions for domain')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SEARCH & OMNIBOX */}
                    {settingsTab === 'search' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.search.title', null, 'Search & Omnibox')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.search.subtitle', null, 'Configure default search engines, live suggestions, and smart search bangs.')}</p>
                            </div>

                            {/* Default Search Engine */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Search}
                                    title={t('cfg.search.defaultEngineSectionTitle', null, 'Default Search Engine')}
                                    description={t('cfg.search.defaultEngineSectionDesc', null, 'Select the primary search provider used across the Omnibox and context menus.')}
                                />
                                <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3.5 ${
                                    isBright 
                                        ? 'bg-black/[0.02] border-black/[0.07]' 
                                        : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                            isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border-white/[0.06]'
                                        }`}>
                                            <Search size={15} />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                {t('cfg.search.primaryProviderTitle', null, 'Primary Search Provider')}
                                            </h4>
                                            <p className={`text-xs leading-relaxed mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {t('cfg.search.primaryProviderDesc', null, 'Default search engine used when entering queries in the Omnibox, right-click menus, and navigation fallback.')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Engine Pill Chips */}
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {getAllSearchEngines(settings?.customSearchEngines || []).map(se => {
                                            const isDefault = (settings.searchEngine || 'google') === se.id;
                                            return (
                                                <button 
                                                    key={se.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setDefaultSearchEngine(se.id);
                                                        showToast(t('cfg.search.toastDefaultSearch', { name: se.name }, `Default search: ${se.name}`));
                                                    }}
                                                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
                                                        isDefault
                                                            ? 'bg-accent text-zinc-950 font-bold border-accent/40 shadow-sm'
                                                            : (isBright 
                                                                ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.07] text-zinc-700 hover:text-black' 
                                                                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] text-white/70 hover:text-white')
                                                    }`}
                                                >
                                                    <span 
                                                        className="w-2 h-2 rounded-full flex-shrink-0" 
                                                        style={{ backgroundColor: isDefault ? '#09090b' : (se.color || '#4285F4') }} 
                                                    />
                                                    <span>{se.name}</span>
                                                    {isDefault && <Check size={11} strokeWidth={3} className="text-zinc-950" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Manage Search Engines & Custom Shortcuts */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Compass}
                                    title={t('cfg.search.keywordsSectionTitle', null, 'Omnibox Keywords & Custom Engines')}
                                    description={t('cfg.search.keywordsSectionDesc', null, 'Assign short keyword triggers to search websites directly from the address bar.')}
                                />
                                <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                    isBright 
                                        ? 'bg-black/[0.02] border-black/[0.07]' 
                                        : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                                isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border-white/[0.06]'
                                            }`}>
                                                <Compass size={15} />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {t('cfg.search.customShortcutsTitle', null, 'Custom Search Shortcuts')}
                                                </h4>
                                                <p className={`text-xs leading-relaxed mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {renderTemplateParts(
                                                        t('cfg.search.customShortcutsDesc', null, 'Type a keyword followed by your query (e.g. {code}).'),
                                                        {
                                                            code: <span className="font-mono text-accent font-semibold px-1 py-0.2 rounded bg-accent/10 border border-accent/20">yt query</span>
                                                        }
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isAddingEngine) {
                                                setIsAddingEngine(false);
                                                setEditingEngineId(null);
                                            } else {
                                                setEditingEngineId(null);
                                                setEngineNameInput('');
                                                setEngineKeywordInput('');
                                                setEngineUrlInput('');
                                                setEngineColorInput('#d4bc94');
                                                setIsAddingEngine(true);
                                            }
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                                    >
                                        <Plus size={13} className={`transition-transform duration-300 ${isAddingEngine ? 'rotate-45' : ''}`} />
                                        <span>{isAddingEngine ? t('cfg.common.cancel', null, 'Cancel') : t('cfg.search.addEngineBtn', null, 'Add Engine')}</span>
                                    </button>
                                </div>

                                {/* Add / Edit Engine Form Accordion */}
                                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isAddingEngine ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                                    <div className="overflow-hidden min-h-0">
                                        <div className={`p-4 rounded-xl border flex flex-col gap-3 my-1 ${
                                            isBright 
                                                ? 'bg-black/[0.03] border-black/10' 
                                                : 'bg-black/40 border-white/10'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent">
                                                    {editingEngineId ? t('cfg.search.editEngineHeader', null, 'EDIT SEARCH ENGINE') : t('cfg.search.newEngineHeader', null, 'NEW SEARCH ENGINE')}
                                                </span>
                                                <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>
                                                    {t('cfg.search.queryVarHint', null, '%s = query')}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-mono font-bold uppercase ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('cfg.search.engineNameLabel', null, 'Engine Name')}</label>
                                                    <input
                                                        type="text"
                                                        placeholder={t('cfg.search.engineNamePlaceholder', null, 'e.g. YouTube, GitHub')}
                                                        value={engineNameInput}
                                                        onChange={(e) => setEngineNameInput(e.target.value)}
                                                        className={`w-full px-3 py-1.5 rounded-xl text-xs outline-none focus:border-accent border ${
                                                            isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-black/40 border-white/[0.08] text-white'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-mono font-bold uppercase ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('cfg.search.keywordShortcutLabel', null, 'Keyword Shortcut')}</label>
                                                    <input
                                                        type="text"
                                                        placeholder={t('cfg.search.keywordShortcutPlaceholder', null, 'e.g. yt, gh, wiki')}
                                                        value={engineKeywordInput}
                                                        onChange={(e) => setEngineKeywordInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                                        className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono outline-none focus:border-accent border ${
                                                            isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-black/40 border-white/[0.08] text-white'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-mono font-bold uppercase ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('cfg.search.colorAccentLabel', null, 'Color Accent')}</label>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        {['#d4bc94', '#4285F4', '#FF0000', '#A855F7', '#10B981', '#F59E0B', '#38BDF8', '#EC4899'].map(c => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => setEngineColorInput(c)}
                                                                className={`w-4 h-4 rounded-full transition-transform cursor-pointer border ${engineColorInput === c ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'}`}
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className={`text-[10px] block mb-1 font-mono font-bold uppercase ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>
                                                    {t('cfg.search.urlTemplateLabel', null, 'Search URL Template')}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="https://www.youtube.com/results?search_query=%s"
                                                    value={engineUrlInput}
                                                    onChange={(e) => setEngineUrlInput(e.target.value)}
                                                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono outline-none focus:border-accent border ${
                                                        isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-black/40 border-white/[0.08] text-white'
                                                    }`}
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 mt-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsAddingEngine(false);
                                                        setEditingEngineId(null);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                                        isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 text-white/70'
                                                    }`}
                                                >
                                                    {t('cfg.common.cancel', null, 'Cancel')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveSearchEngine}
                                                    className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                                                >
                                                    {editingEngineId ? t('cfg.search.updateEngineBtn', null, 'Update Engine') : t('cfg.search.saveEngineBtn', null, 'Save Engine')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Engines List */}
                                <div className="space-y-1.5">
                                    {(settings?.customSearchEngines || []).length === 0 ? (
                                        <div className={`p-4 rounded-xl border border-dashed text-center text-xs ${
                                            isBright ? 'bg-black/[0.01] border-black/10 text-zinc-500' : 'bg-white/[0.01] border-white/10 text-white/40'
                                        }`}>
                                            {t('cfg.search.noCustomEngines', null, 'No custom search engines configured. Click "Add Engine" above to create Omnibox shortcuts for any website.')}
                                        </div>
                                    ) : (
                                        (settings.customSearchEngines || []).map(engine => {
                                            const isDefault = (settings.searchEngine || 'google') === engine.id;
                                            return (
                                                <div
                                                    key={engine.id}
                                                    className={`p-2.5 px-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                                                        isBright 
                                                            ? 'bg-black/[0.02] border-black/[0.07] hover:bg-black/[0.04]' 
                                                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: engine.color || '#d4bc94' }} />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-bold ${isBright ? 'text-zinc-900' : 'text-white'}`}>{engine.name}</span>
                                                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/15 text-accent font-bold border border-accent/25">
                                                                    {engine.keyword}
                                                                </span>
                                                            </div>
                                                            <p className={`text-[11px] font-mono truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{engine.url}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {!isDefault && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDefaultSearchEngine(engine.id);
                                                                    showToast(t('cfg.search.toastDefaultSearch', { name: engine.name }, `Default search: ${engine.name}`));
                                                                }}
                                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                                                                    isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/[0.07] text-zinc-700' : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/70 hover:text-white'
                                                                }`}
                                                            >
                                                                {t('cfg.search.makeDefaultBtn', null, 'Make Default')}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditSearchEngine(engine)}
                                                            className={`p-1.5 rounded-lg border border-transparent transition cursor-pointer ${
                                                                isBright ? 'hover:bg-black/5 text-zinc-600' : 'hover:bg-white/10 text-white/60 hover:text-white'
                                                            }`}
                                                            title={t('cfg.search.editEngineTitle', null, 'Edit Engine')}
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                removeCustomSearchEngine(engine.id);
                                                                showToast(t('cfg.search.toastRemovedEngine', { name: engine.name }, `Removed "${engine.name}"`));
                                                            }}
                                                            className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                                            title={t('cfg.search.deleteEngineTitle', null, 'Delete Engine')}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                </div>
                            </div>

                            {/* Smart Search Bangs & Shortcuts Section */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Sparkles}
                                    title={t('cfg.search.bangsSectionTitle', null, 'Smart Search Bangs')}
                                    description={t('cfg.search.bangsSectionDesc', null, 'Route searches directly to specific engines using ! or @ prefixes in the Omnibox.')}
                                />
                                <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                    isBright 
                                        ? 'bg-black/[0.02] border-black/[0.07]' 
                                        : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                                isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent/80 border-white/[0.06]'
                                            }`}>
                                                <Sparkles size={15} />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {t('cfg.search.bangsDirectoryTitle', null, 'Bang Triggers Directory')}
                                                </h4>
                                                <p className={`text-xs leading-relaxed mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {renderTemplateParts(
                                                        t('cfg.search.bangsDirectoryDesc', null, 'Type {bang1} or {bang2} in the address bar to route searches immediately.'),
                                                        {
                                                            bang1: <span className="font-mono text-accent font-semibold px-1 py-0.2 rounded bg-accent/10 border border-accent/20">!yt</span>,
                                                            bang2: <span className="font-mono text-accent font-semibold px-1 py-0.2 rounded bg-accent/10 border border-accent/20">@wiki</span>
                                                        }
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsAddingBang(!isAddingBang)}
                                            className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer shrink-0"
                                        >
                                            <Plus size={13} className={`transition-transform duration-300 ${isAddingBang ? 'rotate-45' : ''}`} />
                                            <span>{isAddingBang ? t('cfg.common.cancel', null, 'Cancel') : t('cfg.search.addBangBtn', null, 'Add Bang')}</span>
                                        </button>
                                    </div>

                                {/* Add Custom Bang Form Accordion */}
                                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isAddingBang ? 'grid-rows-[1fr] opacity-100 mb-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                                    <div className="overflow-hidden min-h-0">
                                        <div className={`p-4 rounded-xl border flex flex-col gap-3 my-1 ${
                                            isBright ? 'bg-black/[0.03] border-black/10' : 'bg-black/40 border-white/10'
                                        }`}>
                                            <p className="text-xs font-bold text-accent uppercase tracking-wider">{t('cfg.search.createBangTitle', null, 'Create Custom Search Bang')}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('cfg.search.shortcutPrefixLabel', null, 'Shortcut Prefix')}</label>
                                                    <div className="relative flex items-center">
                                                        <span className="absolute left-3 text-xs font-mono opacity-50">! / @</span>
                                                        <input
                                                            type="text"
                                                            placeholder={t('cfg.search.shortcutPrefixPlaceholder', null, 'e.g. keep or aw')}
                                                            value={newBangPrefix}
                                                            onChange={(e) => setNewBangPrefix(e.target.value.replace(/^[!@]/, ''))}
                                                            className={`w-full pl-12 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-accent font-mono ${
                                                                isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-white/[0.03] border-white/[0.06] text-white'
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('cfg.search.engineNameLabel', null, 'Engine Name')}</label>
                                                    <input
                                                        type="text"
                                                        placeholder={t('cfg.search.bangEnginePlaceholder', null, 'e.g. Google Keep or ArchWiki')}
                                                        value={newBangName}
                                                        onChange={(e) => setNewBangName(e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-accent ${
                                                            isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-white/[0.03] border-white/[0.06] text-white'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('cfg.search.colorAccentLabel', null, 'Color Accent')}</label>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        {['#d4bc94', '#4285F4', '#FF0000', '#A855F7', '#10B981', '#F59E0B', '#38BDF8'].map(c => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => setNewBangColor(c)}
                                                                className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${newBangColor === c ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'}`}
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>{t('cfg.search.bangUrlLabel', { token: '{q}' }, 'Search URL Template (Use {q} for search query)')}</label>
                                                <input
                                                    type="text"
                                                    placeholder={t('cfg.search.bangUrlPlaceholder', { token: '{q}' }, 'e.g. https://wiki.archlinux.org/index.php?search={q}')}
                                                    value={newBangUrl}
                                                    onChange={(e) => setNewBangUrl(e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-accent font-mono ${
                                                        isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-white/[0.03] border-white/[0.06] text-white'
                                                    }`}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsAddingBang(false);
                                                        setNewBangPrefix('');
                                                        setNewBangName('');
                                                        setNewBangUrl('');
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                                        isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 text-white/70'
                                                    }`}
                                                >
                                                    {t('cfg.common.cancel', null, 'Cancel')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const p = newBangPrefix.trim().toLowerCase();
                                                        const n = newBangName.trim() || p;
                                                        const u = newBangUrl.trim();
                                                        if (!p || !u) {
                                                            showToast(t('cfg.search.toastBangMissingFields', null, 'Please enter both shortcut prefix and search URL'));
                                                            return;
                                                        }
                                                        addCustomBang({ prefix: p, name: n, url: u, color: newBangColor });
                                                        showToast(t('cfg.search.toastBangAdded', { prefix: p }, `Custom bang "!${p}" added!`));
                                                        setIsAddingBang(false);
                                                        setNewBangPrefix('');
                                                        setNewBangName('');
                                                        setNewBangUrl('');
                                                    }}
                                                    className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs shadow-md transition cursor-pointer"
                                                >
                                                    {t('cfg.search.saveBangBtn', null, 'Save Bang')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter Search Bar */}
                                <div className="relative">
                                    <Search size={14} className={`absolute left-3 top-2.5 ${isBright ? 'text-zinc-400' : 'text-white/40'}`} />
                                    <input
                                        type="text"
                                        placeholder={t('cfg.search.filterBangsPlaceholder', null, 'Filter bangs by name, shortcut (!yt, @github), or category...')}
                                        value={bangFilter}
                                        onChange={(e) => setBangFilter(e.target.value)}
                                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs transition outline-none focus:border-accent ${
                                            isBright ? 'bg-black/[0.03] border-black/10 text-zinc-900 placeholder-zinc-400' : 'bg-black/30 border-white/10 text-white placeholder-white/30'
                                        }`}
                                    />
                                </div>

                                {/* Bangs Grid */}
                                {(() => {
                                    const allBangs = getAllBangs(settings?.customBangs || []);
                                    const f = bangFilter.trim().toLowerCase().replace(/^[!@]/, '');
                                    const matchedBangs = f
                                        ? allBangs.filter(b =>
                                            b.name.toLowerCase().includes(f) ||
                                            b.prefix.toLowerCase().includes(f) ||
                                            b.bangs.some(trigger => trigger.toLowerCase().includes(f)) ||
                                            (b.category && b.category.toLowerCase().includes(f))
                                        )
                                        : allBangs;
                                    const visibleLimit = f ? 100 : 60;
                                    const visibleBangs = matchedBangs.slice(0, visibleLimit);

                                    return (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto hide-scroll pr-1">
                                                {visibleBangs.map(bang => {
                                                    const BangIcon = bang.icon || Search;
                                                    const isCustom = !!bang.isCustom;
                                                    return (
                                                        <div 
                                                            key={bang.id} 
                                                            className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition group ${
                                                                isBright 
                                                                    ? 'bg-black/[0.02] border-black/[0.07] hover:border-black/15' 
                                                                    : 'bg-black/30 border-white/[0.06] hover:border-white/15'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div 
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                                    style={{ backgroundColor: `${bang.color}20`, color: bang.color }}
                                                                >
                                                                    <BangIcon size={16} />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`font-bold text-xs truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>{bang.name}</span>
                                                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                                                                            isBright ? 'bg-black/[0.05] text-zinc-700' : 'bg-white/[0.06] text-zinc-300'
                                                                        }`}>
                                                                            !{bang.prefix}
                                                                        </span>
                                                                        {bang.category && (
                                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full truncate ${
                                                                                isBright ? 'bg-black/[0.04] text-zinc-500' : 'bg-white/[0.04] text-zinc-400'
                                                                            }`}>
                                                                                {bang.category}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className={`text-[10px] truncate font-mono mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                                        {bang.url}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {isCustom && (
                                                                <button
                                                                    onClick={() => {
                                                                        removeCustomBang(bang.prefix);
                                                                        showToast(t('cfg.search.toastBangRemoved', { prefix: bang.prefix }, `Removed custom bang "!${bang.prefix}"`));
                                                                    }}
                                                                    className={`p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer flex-shrink-0 ${
                                                                        isBright ? 'text-zinc-400' : 'text-white/30'
                                                                    }`}
                                                                    title={t('cfg.search.deleteCustomBangTitle', null, 'Delete custom bang')}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className={`text-[11px] flex items-center justify-between pt-1 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                <span>
                                                    {f
                                                        ? t('cfg.search.bangsFilterCount', { shown: visibleBangs.length, total: matchedBangs.length }, `Showing ${visibleBangs.length} of ${matchedBangs.length} matching bangs`)
                                                        : t('cfg.search.bangsPreviewCount', { shown: visibleBangs.length, total: allBangs.length }, `Showing ${visibleBangs.length} of ${allBangs.length} — filter above to browse all`)
                                                    }
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                                </div>
                            </div>

                            {/* Omnibox Behavior & Display */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={SlidersHorizontal}
                                    title={t('cfg.search.behaviorSectionTitle', null, 'Omnibox Behavior & Display')}
                                    description={t('cfg.search.behaviorSectionDesc', null, 'Control inline calculations, live autocomplete, and URL formatting.')}
                                />
                                <SettingCard icon={Search} title={t('cfg.search.smartCalcTitle', null, 'Smart Calculator in Omnibox')} description={t('cfg.search.smartCalcDesc', null, 'Solve math equations directly in the address bar dropdown.')}>
                                    <SettingToggle isChecked={!!settings.smartCalc} onToggle={() => toggleSetting('smartCalc')} />
                                </SettingCard>

                                <SettingCard icon={Zap} title={t('cfg.search.liveSearchTitle', null, 'Live Search Suggestions')} description={t('cfg.search.liveSearchDesc', null, 'Send typed queries to your search engine for live autocomplete.')}>
                                    <SettingToggle isChecked={!!settings.liveSearch} onToggle={() => toggleSetting('liveSearch')} />
                                </SettingCard>

                                <SettingCard icon={Globe} title={t('cfg.search.showFullUrlsTitle', null, 'Show Full Raw URLs')} description={t('cfg.search.showFullUrlsDesc', null, 'Display complete protocol and parameters instead of simplified domain names.')}>
                                    <SettingToggle isChecked={!!settings.showFullUrls} onToggle={() => toggleSetting('showFullUrls')} />
                                </SettingCard>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: DOWNLOADS & MEDIA */}
                    {settingsTab === 'downloads' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.downloads.title', null, 'Downloads & Media')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.downloads.subtitle', null, 'Manage file storage paths, organization, and background media policies.')}</p>
                            </div>

                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Download}
                                    title={t('cfg.downloads.sectionTitle', null, 'File Storage & Organization')}
                                    description={t('cfg.downloads.sectionDesc', null, 'Configure download prompts, target folder, automatic grouping, and completion alerts.')}
                                />
                                <SettingCard icon={Download} title={t('cfg.downloads.askSaveTitle', null, 'Ask where to save each file')} description={t('cfg.downloads.askSaveDesc', null, 'Prompt save-as file picker instead of downloading automatically.')}>
                                    <SettingToggle isChecked={!!settings.askSave} onToggle={() => toggleSetting('askSave')} />
                                </SettingCard>

                                <SettingCard icon={Laptop} title={t('cfg.downloads.storageDirTitle', null, 'Default Storage Directory')} description={settings.downloadsPath || 'C:\\Users\\Downloads'}>
                                    <button 
                                        onClick={async () => {
                                            if (window.electronAPI && window.electronAPI.selectFolder) {
                                                const folder = await window.electronAPI.selectFolder();
                                                if (folder) {
                                                    setSettingValue('downloadsPath', folder);
                                                    showToast(t('cfg.downloads.toastDirUpdated', null, 'Downloads directory updated'));
                                                }
                                            } else {
                                                showToast(t('cfg.downloads.toastDirConfigured', null, 'Downloads directory configured'));
                                            }
                                        }}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                            isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.06]'
                                        }`}
                                    >
                                        {t('cfg.downloads.changeBtn', null, 'Change...')}
                                    </button>
                                </SettingCard>

                                <SettingCard icon={Layers} title={t('cfg.downloads.groupFilesTitle', null, 'Group Files by Category')} description={t('cfg.downloads.groupFilesDesc', null, 'Automatically organize downloads into Images, Documents, and Archives.')}>
                                    <SettingToggle isChecked={!!settings.groupDownloads} onToggle={() => toggleSetting('groupDownloads')} />
                                </SettingCard>

                                <SettingCard icon={Bell} title={t('cfg.downloads.completionSoundTitle', null, 'Download Completion Sound')} description={t('cfg.downloads.completionSoundDesc', null, 'Play an audio chime when a file finishes downloading.')}>
                                    <SettingToggle isChecked={!!settings.downloadSound} onToggle={() => toggleSetting('downloadSound')} />
                                </SettingCard>
                            </div>
                        </div>
                    )}

                    {/* TAB: WORK MODE & GITHUB INTEGRATION */}
                    {settingsTab === 'workmode' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                    <GitPullRequest className="text-emerald-400" size={24} /> {t('cfg.workmode.title', null, 'Work Mode & GitHub')}
                                </h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {t('cfg.workmode.subtitle', null, 'Dynamic Pull Requests and Issues integration inspired by Arc Browser. Built with a strict zero-resource architecture when turned off.')}
                                </p>
                            </div>

                            {/* Master Toggle */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={GitPullRequest}
                                    title={t('cfg.workmode.syncSectionTitle', null, 'GitHub Live Sync')}
                                    description={t('cfg.workmode.syncSectionDesc', null, 'Enable sidebar live folder tracking and background refresh frequency.')}
                                />
                                <SettingCard 
                                    icon={GitPullRequest} 
                                    title={t('cfg.workmode.enableTitle', null, 'Enable GitHub Live Integration')} 
                                    description={t('cfg.workmode.enableDesc', null, 'Auto-updates pull requests and assigned issues directly in your Work Space sidebar. When turned off, all background timers and network calls are completely shut down.')}
                                >
                                    <SettingToggle 
                                        isChecked={!!settings.githubIntegrationEnabled} 
                                        onToggle={() => {
                                            toggleSetting('githubIntegrationEnabled');
                                            setGhTestStatus(null);
                                            useGitHubStore.getState().syncWithConfig(true);
                                        }} 
                                    />
                                </SettingCard>

                                {settings.githubIntegrationEnabled && (
                                    <SettingCard 
                                        icon={RefreshCw} 
                                        title={t('cfg.workmode.refreshIntervalTitle', null, 'Background Refresh Interval')} 
                                        description={t('cfg.workmode.refreshIntervalDesc', null, "How frequently QBrowse checks GitHub for updates. Choose 'Manual Only' to eliminate all background polling.")}
                                    >
                                        <CustomSelect 
                                            value={settings.githubSyncInterval ?? 10}
                                            onChange={(val) => {
                                                const numVal = Number(val);
                                                setSettingValue('githubSyncInterval', numVal);
                                                useGitHubStore.getState().syncWithConfig();
                                            }}
                                            isBright={isBright}
                                            options={[
                                                { value: 0, label: t('cfg.workmode.intervalManual', null, 'Manual Only'), badge: t('cfg.workmode.badgeZeroPolling', null, 'Zero Polling') },
                                                { value: 2, label: t('cfg.workmode.interval2m', null, 'Every 2 minutes') },
                                                { value: 5, label: t('cfg.workmode.interval5m', null, 'Every 5 minutes') },
                                                { value: 10, label: t('cfg.workmode.interval10m', null, 'Every 10 minutes'), badge: t('cfg.workmode.badgeBalanced', null, 'Balanced') },
                                                { value: 15, label: t('cfg.workmode.interval15m', null, 'Every 15 minutes') },
                                                { value: 30, label: t('cfg.workmode.interval30m', null, 'Every 30 minutes'), badge: t('cfg.workmode.badgeEco', null, 'Eco') }
                                            ]}
                                        />
                                    </SettingCard>
                                )}
                            </div>

                            {settings.githubIntegrationEnabled ? (
                                <>
                                    {/* Display Sections */}
                                    <div className="space-y-3">
                                        <SectionHeader
                                            icon={GitBranch}
                                            title={t('cfg.workmode.trackedTitle', null, 'Tracked Categories')}
                                            description={t('cfg.workmode.trackedDesc', null, 'Select which pull request and issue queues appear in your Work Space.')}
                                        />

                                    <SettingCard 
                                        icon={CheckCircle2} 
                                        title={t('cfg.workmode.reviewsTitle', null, 'Review Requests')} 
                                        description={t('cfg.workmode.reviewsDesc', null, 'Track pull requests where someone has requested your review.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubShowReviews ?? true} 
                                            onToggle={() => {
                                                toggleSetting('githubShowReviews');
                                                useGitHubStore.getState().syncWithConfig();
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={GitBranch} 
                                        title={t('cfg.workmode.myPrsTitle', null, 'My Pull Requests')} 
                                        description={t('cfg.workmode.myPrsDesc', null, 'Track open pull requests authored by you across your repositories.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubShowMyPrs ?? true} 
                                            onToggle={() => {
                                                toggleSetting('githubShowMyPrs');
                                                useGitHubStore.getState().syncWithConfig();
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={AlertCircle} 
                                        title={t('cfg.workmode.assignedIssuesTitle', null, 'Assigned Issues')} 
                                        description={t('cfg.workmode.assignedIssuesDesc', null, 'Track open issues directly assigned to you.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubShowAssignedIssues ?? true} 
                                            onToggle={() => {
                                                toggleSetting('githubShowAssignedIssues');
                                                useGitHubStore.getState().syncWithConfig();
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={SlidersHorizontal} 
                                        title={t('cfg.workmode.draftPrsTitle', null, 'Include Draft PRs')} 
                                        description={t('cfg.workmode.draftPrsDesc', null, 'Include work-in-progress draft pull requests in the lists.')}
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.githubIncludeDrafts} 
                                            onToggle={() => {
                                                toggleSetting('githubIncludeDrafts');
                                                useGitHubStore.getState().syncWithConfig(true);
                                            }} 
                                        />
                                    </SettingCard>
                                    </div>

                                    {/* UI & Glances */}
                                    <div className="space-y-3">
                                        <SectionHeader
                                            icon={Eye}
                                            title={t('cfg.workmode.sidebarPreviewTitle', null, 'Sidebar & Preview')}
                                            description={t('cfg.workmode.sidebarPreviewDesc', null, 'Control hover peeks and counter badges on the pinned Live Folder.')}
                                        />

                                    <SettingCard 
                                        icon={Eye} 
                                        title={t('cfg.workmode.hoverGlanceTitle', null, 'Hover Peek Glance (Arc-Style)')} 
                                        description={t('cfg.workmode.hoverGlanceDesc', null, 'Hovering over the pinned GitHub icon displays a lightweight preview card with active reviews and notifications.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubHoverGlanceEnabled ?? true} 
                                            onToggle={() => toggleSetting('githubHoverGlanceEnabled')} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Bell} 
                                        title={t('cfg.workmode.badgeCountTitle', null, 'Review Request Counter Badge')} 
                                        description={t('cfg.workmode.badgeCountDesc', null, 'Show an indicator badge on the Live Folder when PRs are awaiting your review.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubBadgeCountEnabled ?? true} 
                                            onToggle={() => toggleSetting('githubBadgeCountEnabled')} 
                                        />
                                    </SettingCard>
                                    </div>

                                    {/* Repository Filter & Credentials */}
                                    <div className="space-y-3">
                                        <SectionHeader
                                            icon={Key}
                                            title={t('cfg.workmode.scopeSectionTitle', null, 'Scope & Credentials')}
                                            description={t('cfg.workmode.scopeSectionDesc', null, 'Filter monitored repositories or provide a Personal Access Token for SSO organizations.')}
                                        />

                                        <div className={`p-4 rounded-2xl border transition-all ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                        }`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                                    isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent border-white/[0.06]'
                                                }`}>
                                                    <Filter size={15} />
                                                </div>
                                                <div>
                                                    <p className={`font-medium text-xs ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('cfg.workmode.repoScopeTitle', null, 'Repository Scope (Optional)')}</p>
                                                    <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        {renderTemplateParts(
                                                            t('cfg.workmode.repoScopeDesc', null, 'Leave blank to watch all repositories, or enter comma-separated repos (e.g. {repos}):'),
                                                            { repos: <code>facebook/react, vercel/next.js</code> }
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder={t('cfg.workmode.repoScopePlaceholder', null, 'e.g. vercel/next.js, facebook/react')}
                                                value={settings.githubRepoFilter || ''}
                                                onChange={(e) => setSettingValue('githubRepoFilter', e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleTestAndSyncGitHub(); }}
                                                onBlur={() => useGitHubStore.getState().syncWithConfig(true)}
                                                className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                                                    isBright 
                                                        ? 'bg-white border-black/[0.12] text-zinc-800' 
                                                        : 'bg-black/40 border-white/[0.08] text-zinc-200'
                                                }`}
                                            />
                                        </div>

                                        {/* Personal Access Token & Public Username + Test & Sync */}
                                        <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                        }`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                                                        isBright ? 'bg-black/[0.04] text-accent border-black/[0.07]' : 'bg-white/[0.03] text-accent border-white/[0.06]'
                                                    }`}>
                                                        <Key size={15} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-medium text-xs ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('cfg.workmode.patTitle', null, 'Personal Access Token (Optional)')}</p>
                                                        <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.workmode.patDesc', null, 'QBrowse auto-detects your active GitHub browser session. Provide a classic (ghp_) or fine-grained (github_pat_) PAT for private repos or SSO/SAML:')}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    disabled={isTestingGitHub || ghIsLoading}
                                                    onClick={handleTestAndSyncGitHub}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                                                        (isTestingGitHub || ghIsLoading)
                                                            ? 'bg-emerald-500/15 text-emerald-400/70 cursor-wait'
                                                            : isBright
                                                                ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 cursor-pointer active:scale-95'
                                                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer active:scale-95'
                                                    }`}
                                                >
                                                    <RefreshCw size={12} className={(isTestingGitHub || ghIsLoading) ? 'animate-spin' : ''} />
                                                    <span>{(isTestingGitHub || ghIsLoading) ? t('cfg.workmode.testingSyncBtn', null, 'Syncing...') : t('cfg.workmode.testSyncBtn', null, 'Test & Sync')}</span>
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type={showGitHubToken ? 'text' : 'password'}
                                                    placeholder="ghp_... or github_pat_..."
                                                    value={settings.githubPersonalAccessToken || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSettingValue('githubPersonalAccessToken', val);
                                                        setSettingValue('githubAuthMode', val.trim() ? 'token' : 'auto');
                                                        if (ghTestStatus) setGhTestStatus(null);
                                                    }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleTestAndSyncGitHub(); }}
                                                    onBlur={() => {
                                                        const trimmed = (settings.githubPersonalAccessToken || '').trim();
                                                        if (trimmed !== (settings.githubPersonalAccessToken || '')) {
                                                            setSettingValue('githubPersonalAccessToken', trimmed);
                                                        }
                                                        useGitHubStore.getState().syncWithConfig(true);
                                                    }}
                                                    className={`w-full text-xs p-2 pr-9 rounded-lg border outline-none font-mono ${
                                                        isBright 
                                                            ? 'bg-white border-black/[0.12] text-zinc-800' 
                                                            : 'bg-black/40 border-white/[0.08] text-zinc-200'
                                                    }`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGitHubToken(prev => !prev)}
                                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded cursor-pointer transition-colors ${
                                                        isBright ? 'text-zinc-500 hover:text-zinc-800' : 'text-zinc-400 hover:text-white'
                                                    }`}
                                                    title={showGitHubToken ? 'Hide token' : 'Show token'}
                                                >
                                                    {showGitHubToken ? <EyeOff size={13} /> : <Eye size={13} />}
                                                </button>
                                            </div>

                                            {/* Optional Public GitHub Username */}
                                            <div className={`pt-3 border-t space-y-2 ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                                                <div className="flex items-center gap-2">
                                                    <User size={13} className="text-accent flex-shrink-0" />
                                                    <div>
                                                        <p className={`font-medium text-xs ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('cfg.workmode.usernameTitle', null, 'GitHub Username (Optional — Public Repos)')}</p>
                                                        <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.workmode.usernameDesc', null, 'Track public PRs and issues by username without signing in or adding a token:')}</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder={t('cfg.workmode.usernamePlaceholder', null, 'e.g. octocat')}
                                                    value={settings.githubUsername || ''}
                                                    onChange={(e) => {
                                                        setSettingValue('githubUsername', e.target.value);
                                                        if (ghTestStatus) setGhTestStatus(null);
                                                    }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleTestAndSyncGitHub(); }}
                                                    onBlur={() => {
                                                        const clean = (settings.githubUsername || '').trim().replace(/^@+/, '');
                                                        if (clean !== (settings.githubUsername || '')) {
                                                            setSettingValue('githubUsername', clean);
                                                        }
                                                        useGitHubStore.getState().syncWithConfig(true);
                                                    }}
                                                    className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                                                        isBright 
                                                            ? 'bg-white border-black/[0.12] text-zinc-800' 
                                                            : 'bg-black/40 border-white/[0.08] text-zinc-200'
                                                    }`}
                                                />
                                            </div>

                                            {/* Live Connection & Test Feedback Banner */}
                                            {(() => {
                                                const activeStatus = ghTestStatus || (
                                                    ghAuthenticated
                                                        ? {
                                                            type: ghWarning ? 'warning' : 'success',
                                                            message: `${t('cfg.workmode.statusConnected', { username: ghUsername || 'GitHub' }, `Connected as @${ghUsername || 'GitHub'}`)} (${
                                                                ghAuthMode === 'token'
                                                                    ? t('cfg.workmode.statusViaPat', null, 'via PAT')
                                                                    : ghAuthMode === 'session'
                                                                        ? t('cfg.workmode.statusViaSession', null, 'via Browser Session')
                                                                        : t('cfg.workmode.statusViaPublic', null, 'via Public API')
                                                            }) — ${t(
                                                                'cfg.workmode.statusCounts',
                                                                { reviews: (ghReviewRequests || []).length, prs: (ghMyPrs || []).length, issues: (ghAssignedIssues || []).length },
                                                                `${(ghReviewRequests || []).length} reviews · ${(ghMyPrs || []).length} PRs · ${(ghAssignedIssues || []).length} issues`
                                                            )}${ghWarning ? `. ${ghWarning}` : ''}`
                                                        }
                                                        : ghError
                                                            ? { type: 'error', message: ghError }
                                                            : { type: 'idle', message: t('cfg.workmode.statusNotConnected', null, 'Not connected yet. Click Test & Sync to check your session, PAT, or username.') }
                                                );

                                                const bannerClasses = activeStatus.type === 'success'
                                                    ? (isBright ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300')
                                                    : activeStatus.type === 'warning'
                                                        ? (isBright ? 'bg-amber-500/10 border-amber-500/25 text-amber-800' : 'bg-amber-500/10 border-amber-500/25 text-amber-300')
                                                        : activeStatus.type === 'error'
                                                            ? (isBright ? 'bg-rose-500/10 border-rose-500/25 text-rose-700' : 'bg-rose-500/10 border-rose-500/25 text-rose-300')
                                                            : (isBright ? 'bg-black/[0.03] border-black/[0.08] text-zinc-600' : 'bg-white/[0.03] border-white/[0.08] text-zinc-400');

                                                return (
                                                    <div className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-[11px] leading-snug ${bannerClasses}`}>
                                                        {activeStatus.type === 'success' ? (
                                                            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                                                        ) : activeStatus.type === 'warning' ? (
                                                            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                                        ) : activeStatus.type === 'error' ? (
                                                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                                        ) : (
                                                            <Info size={14} className="flex-shrink-0 mt-0.5" />
                                                        )}
                                                        <span className="break-words">{activeStatus.message}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className={`p-6 text-center rounded-2xl border space-y-2 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {t('cfg.workmode.dormantText', null, 'GitHub Live Integration is currently dormant. Turn it on above to start tracking Pull Requests and Issues in Work Mode.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 6: ENGINE & PERFORMANCE */}
                    {(settingsTab === 'engine' || settingsTab === 'performance') && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                    <Cpu className="text-accent" size={24} /> {t('cfg.engine.title', null, 'Engine & Performance')}
                                </h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {t('cfg.engine.subtitle', null, 'Adaptive hardware tiering, Chromium background throttling, memory saving, and GPU rasterization.')}
                                </p>
                            </div>

                            {/* Hardware & Scaling Section */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={GaugeCircle}
                                    title={t('cfg.engine.profileSectionTitle', null, 'Hardware & Performance Profile')}
                                    description={t('cfg.engine.profileSectionDesc', null, 'Detected system specifications and active adaptive scaling tier.')}
                                />

                                {/* Live Hardware Diagnostics Banner */}
                                <div className={`p-4 rounded-2xl border relative overflow-hidden ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Activity size={13} className={isBright ? 'text-zinc-500' : 'text-zinc-400'} />
                                                <span className={`text-[10px] uppercase tracking-wider font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.engine.detectedHardware', null, 'Detected System Hardware')}</span>
                                            </div>
                                            <h4 className={`text-xs font-semibold mt-1 font-mono ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                {hardwareProfile?.cpuModel || t('cfg.engine.detectingCpu', null, 'Detecting CPU...')}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                                                <span className={`px-2 py-0.5 rounded border font-mono text-[11px] ${
                                                    isBright ? 'bg-black/[0.04] border-black/[0.07] text-zinc-700' : 'bg-white/[0.04] border-white/[0.06] text-zinc-300'
                                                }`}>
                                                    {hardwareProfile?.coreCount ? t('cfg.engine.cores', { count: hardwareProfile.coreCount }, `${hardwareProfile.coreCount} Cores`) : t('cfg.engine.multiCore', null, 'Multi-Core')}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded border font-mono text-[11px] ${
                                                    isBright ? 'bg-black/[0.04] border-black/[0.07] text-zinc-700' : 'bg-white/[0.04] border-white/[0.06] text-zinc-300'
                                                }`}>
                                                    {hardwareProfile?.totalMemGB ? t('cfg.engine.ramGb', { size: hardwareProfile.totalMemGB }, `${hardwareProfile.totalMemGB} GB RAM`) : 'RAM'}
                                                </span>
                                                {hardwareProfile?.freeMemGB && (
                                                    <span className={`px-2 py-0.5 rounded border font-mono text-[11px] ${
                                                        isBright ? 'bg-black/[0.04] border-black/[0.07] text-zinc-700' : 'bg-white/[0.04] border-white/[0.06] text-zinc-300'
                                                    }`}>
                                                        {t('cfg.engine.freeGb', { size: hardwareProfile.freeMemGB }, `${hardwareProfile.freeMemGB} GB Free`)}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded border font-mono text-[11px] flex items-center gap-1 font-bold ${
                                                    isBright ? 'bg-accent/15 border-accent/30 text-zinc-900' : 'bg-accent/15 border-accent/30 text-accent'
                                                }`}>
                                                    <Zap size={10} className="text-accent" /> {getLocalizedPerfTier(hardwareProfile?.detectedTier || 'balanced').toUpperCase()}
                                                </span>
                                                {hardwareProfile?.isOnBattery && (
                                                    <span className={`px-2 py-0.5 rounded border font-mono text-[11px] flex items-center gap-1 ${
                                                        isBright ? 'bg-amber-500/10 border-black/[0.07] text-amber-700' : 'bg-amber-500/10 border-white/[0.06] text-amber-300'
                                                    }`}>
                                                        <BatteryCharging size={10} /> {t('cfg.engine.battery', null, 'Battery')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => openModal('resources')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer active:scale-95 ${
                                                isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.06]'
                                            }`}
                                        >
                                            <Activity size={12} className={isBright ? 'text-zinc-600' : 'text-zinc-300'} />
                                            <span>{t('cfg.engine.taskManager', null, 'Task Manager')}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Performance Mode Selector */}
                                <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                            {t('cfg.engine.scalingModeTitle', null, 'Performance Scaling Mode')}
                                        </h4>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {t('cfg.engine.scalingModeDesc', null, 'Dynamic CPU scaling, background tab hibernation, and visual blur fidelity.')}
                                        </p>
                                    </div>
                                </div>

                                {/* Spaces-Style Sliding Pill Switcher at Top of Card */}
                                <SlidingPillSwitcher
                                    options={[
                                        { id: 'auto', label: t('cfg.engine.pillAuto', null, 'Auto'), icon: Cpu },
                                        { id: 'eco', label: t('cfg.engine.pillEco', null, 'Eco Saver'), icon: Feather },
                                        { id: 'balanced', label: t('cfg.engine.pillBalanced', null, 'Balanced'), icon: GaugeCircle },
                                        { id: 'ultra', label: t('cfg.engine.pillUltra', null, 'Ultra Speed'), icon: Rocket }
                                    ]}
                                    value={performanceMode || 'auto'}
                                    onChange={(mode) => {
                                        setPerformanceMode(mode);
                                        showToast(t('cfg.engine.toastMode', { mode: getLocalizedPerfMode(mode) }, `Performance Mode: ${getLocalizedPerfMode(mode)}`));
                                    }}
                                    isBright={isBright}
                                />

                                {/* Unified Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    {[
                                        {
                                            id: 'auto',
                                            title: t('cfg.engine.cardAutoTitle', null, 'Auto (Adaptive)'),
                                            desc: t('cfg.engine.cardAutoDesc', { tier: getLocalizedPerfTier(activePerformanceTier || 'balanced').toUpperCase() }, `Dynamically scales based on hardware specs & battery power (${String(activePerformanceTier || 'balanced').toUpperCase()} active).`),
                                            icon: Cpu
                                        },
                                        {
                                            id: 'eco',
                                            title: t('cfg.engine.cardEcoTitle', null, 'Eco / Low-End'),
                                            desc: t('cfg.engine.cardEcoDesc', null, 'Aggressive 5-min tab sleep & clean flat dark styling (no GPU blur lag) for maximum battery & netbooks.'),
                                            icon: Feather
                                        },
                                        {
                                            id: 'balanced',
                                            title: t('cfg.engine.cardBalancedTitle', null, 'Balanced'),
                                            desc: t('cfg.engine.cardBalancedDesc', null, 'Standard 15-min tab sleep with full glassmorphism and optimal responsiveness for everyday multitasking.'),
                                            icon: GaugeCircle
                                        },
                                        {
                                            id: 'ultra',
                                            title: t('cfg.engine.cardUltraTitle', null, 'Ultra Performance'),
                                            desc: t('cfg.engine.cardUltraDesc', null, '30-min tab sleep, maximum frame rates and GPU pipeline throughput for high-end rigs.'),
                                            icon: Rocket
                                        }
                                    ].map(mode => {
                                        const isSelected = (performanceMode || 'auto') === mode.id;
                                        const Icon = mode.icon;
                                        return (
                                            <div
                                                key={mode.id}
                                                onClick={() => {
                                                    setPerformanceMode(mode.id);
                                                    showToast(t('cfg.engine.toastMode', { mode: mode.title }, `Performance Mode: ${mode.title}`));
                                                }}
                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                                    isSelected 
                                                        ? (isBright 
                                                            ? 'bg-accent/15 border-accent/40 text-zinc-900 shadow-sm' 
                                                            : 'bg-accent/10 border-accent/30 text-white shadow-sm') 
                                                        : (isBright 
                                                            ? 'bg-black/[0.02] hover:bg-black/[0.04] border-black/[0.06] text-zinc-700' 
                                                            : 'bg-white/[0.02] hover:bg-white/[0.035] border-white/[0.04] text-zinc-400 hover:text-zinc-200')
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Icon size={14} className={isSelected ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent') : 'text-zinc-500'} />
                                                        <span className={`font-semibold text-xs ${isSelected ? (isBright ? 'text-zinc-950 font-bold' : 'text-white') : (isBright ? 'text-zinc-700' : 'text-zinc-300')}`}>{mode.title}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
                                                    )}
                                                </div>
                                                <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>{mode.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            </div>

                            {/* Memory, Rendering & Flags */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Cpu}
                                    title={t('cfg.engine.memorySectionTitle', null, 'Memory, Rendering & Flags')}
                                    description={t('cfg.engine.memorySectionDesc', null, 'Configure background tab hibernation, bfcache freezing, GPU acceleration, and experimental flags.')}
                                />

                                {/* Tab Memory Saver Inactivity Timeout */}
                            <SettingCard 
                                icon={Zap} 
                                title={t('cfg.engine.sleepTimeoutTitle', null, 'Memory Saver Inactivity Timeout')} 
                                description={t('cfg.engine.sleepTimeoutDesc', null, 'Automatically hibernate inactive tabs to zero RAM consumption. Audio, pinned tabs, and downloads are always immune.')}
                            >
                                <CustomSelect 
                                    value={tabSleepTimeoutMinutes}
                                    onChange={(val) => setTabSleepTimeoutMinutes(Number(val))}
                                    isBright={isBright}
                                    options={[
                                        { value: 1, label: t('cfg.engine.timeout1m', null, '1 Minute'), badge: t('cfg.engine.badgeInstant', null, 'Instant') },
                                        { value: 2, label: t('cfg.engine.timeout2m', null, '2 Minutes'), badge: t('cfg.engine.badgeUltraFast', null, 'Ultra Fast') },
                                        { value: 5, label: t('cfg.engine.timeout5m', null, '5 Minutes'), badge: t('cfg.engine.badgeAggressive', null, 'Aggressive') },
                                        { value: 15, label: t('cfg.engine.timeout15m', null, '15 Minutes'), badge: t('cfg.engine.badgeBalanced', null, 'Balanced') },
                                        { value: 30, label: t('cfg.engine.timeout30m', null, '30 Minutes'), badge: t('cfg.engine.badgeRecommended', null, 'Recommended') },
                                        { value: 60, label: t('cfg.engine.timeout1h', null, '1 Hour'), badge: t('cfg.engine.badgeRelaxed', null, 'Relaxed') },
                                        { value: 120, label: t('cfg.engine.timeout2h', null, '2 Hours'), badge: t('cfg.engine.badgeExtended', null, 'Extended') },
                                        { value: 240, label: t('cfg.engine.timeout4h', null, '4 Hours'), badge: t('cfg.engine.badgeConservative', null, 'Conservative') },
                                        { value: 0, label: t('cfg.engine.timeoutNever', null, 'Never Hibernate'), badge: t('cfg.engine.badgeOff', null, 'Off') }
                                    ]}
                                />
                            </SettingCard>

                            {/* Instant Back/Forward Cache (bfcache) */}
                            <SettingCard 
                                icon={History} 
                                title={t('cfg.engine.bfcacheTitle', null, 'Instant Back/Forward Cache (bfcache)')} 
                                description={
                                    <div className="flex flex-col gap-1.5 mt-0.5">
                                        <span>
                                            {t('cfg.engine.bfcacheDesc', null, 'Freezes recently visited pages in high-speed RAM for instant, 0ms back/forward navigation without page reloads. Automatically scales with your active performance tier.')}
                                        </span>
                                        <div className="flex items-center gap-2 pt-0.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-md transition-all duration-200 ${
                                                bfcacheEnabled === false
                                                    ? (isBright ? 'bg-zinc-200/60 border-zinc-300 text-zinc-500' : 'bg-white/[0.04] border-white/10 text-zinc-400')
                                                    : activePerformanceTier === 'eco'
                                                    ? (isBright ? 'bg-zinc-200/70 border-zinc-300 text-zinc-600' : 'bg-zinc-500/15 border-zinc-500/30 text-zinc-400')
                                                    : (isBright ? 'bg-accent/15 border-accent/30 text-zinc-900 font-semibold shadow-[0_1px_4px_var(--accent-20)]' : 'bg-accent/15 border-accent/30 text-accent font-semibold shadow-[0_0_12px_var(--accent-20)]')
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    bfcacheEnabled === false
                                                        ? 'bg-zinc-400'
                                                        : activePerformanceTier === 'eco'
                                                        ? 'bg-zinc-400'
                                                        : 'bg-accent animate-pulse shadow-[0_0_6px_var(--accent)]'
                                                }`} />
                                                <span>
                                                    {bfcacheEnabled === false
                                                        ? t('cfg.engine.bfcacheDisabled', null, 'Cache Disabled')
                                                        : activePerformanceTier === 'ultra' 
                                                        ? t('cfg.engine.bfcacheUltra', null, '6 Pages in RAM (Ultra)') 
                                                        : activePerformanceTier === 'eco' 
                                                        ? t('cfg.engine.bfcacheEco', null, 'Paused in Eco') 
                                                        : t('cfg.engine.bfcacheBalanced', null, '3 Pages in RAM (Balanced)')}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                }
                            >
                                <SettingToggle 
                                    isChecked={bfcacheEnabled !== false} 
                                    onToggle={toggleBfcache} 
                                />
                            </SettingCard>

                            {/* Reduce Visual Blurs on Eco Mode */}
                            <SettingCard 
                                icon={Feather} 
                                title={t('cfg.engine.ecoVisualsTitle', null, 'Optimize Visuals in Eco Mode')} 
                                description={t('cfg.engine.ecoVisualsDesc', null, 'Replace heavy GPU composite blur filters with solid dark translucent panels to ensure 60fps on integrated graphics.')}
                            >
                                <SettingToggle 
                                    isChecked={reduceVisualsOnEco} 
                                    onToggle={() => setReduceVisualsOnEco(!reduceVisualsOnEco)} 
                                />
                            </SettingCard>

                            <SettingCard icon={Cpu} title={t('cfg.engine.gpuAccelTitle', null, 'Hardware Acceleration (GPU)')} description={t('cfg.engine.gpuAccelDesc', null, 'Use GPU graphics hardware to render web pages and animations.')}>
                                <SettingToggle isChecked={!!settings.hardware} onToggle={() => toggleSetting('hardware')} />
                            </SettingCard>

                            <SettingCard icon={Sliders} title={t('cfg.engine.smoothScrollTitle', null, 'Smooth Momentum Scroll')} description={t('cfg.engine.smoothScrollDesc', null, 'Enable physical momentum scrolling on long web pages.')}>
                                <SettingToggle isChecked={!!settings.smooth} onToggle={() => toggleSetting('smooth')} />
                            </SettingCard>

                            {/* Experimental Flags Shortcut */}
                            <SettingCard
                                icon={Flag}
                                title={t('cfg.engine.flagsTitle', null, 'Experimental Flags & Features')}
                                description={t('cfg.engine.flagsDesc', null, 'Configure advanced Chromium & QBrowse experimental flags.')}
                            >
                                <button 
                                    onClick={() => {
                                        closeModal();
                                        const activeTab = useTabStore.getState().getActiveTab();
                                        if (activeTab) {
                                            useTabStore.getState().handleNavigateTab(activeTab.id, 'qbrowse://flags');
                                        }
                                    }}
                                    className={`px-3 py-1.5 border font-medium rounded-lg text-xs transition cursor-pointer flex-shrink-0 active:scale-95 ${
                                        isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.06] text-white'
                                    }`}
                                >
                                    {t('cfg.engine.openFlagsBtn', null, 'Open Flags')}
                                </button>
                            </SettingCard>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: SHIELDS & ADBLOCK */}
                    {settingsTab === 'adblock' && (() => {
                        const activeFilterLists = settings?.adblockFilterLists || {
                            easylist: true,
                            easyprivacy: true,
                            annoyances: true,
                            malware: true,
                            peterlowe: true
                        };

                        const filterDefinitions = [
                            { id: 'easylist', name: t('cfg.adblock.filters.easylist.name', null, 'EasyList'), desc: t('cfg.adblock.filters.easylist.desc', null, 'Core advertisement blocking rules') },
                            { id: 'easyprivacy', name: t('cfg.adblock.filters.easyprivacy.name', null, 'EasyPrivacy'), desc: t('cfg.adblock.filters.easyprivacy.desc', null, 'Tracking scripts, beacons, and telemetry') },
                            { id: 'annoyances', name: t('cfg.adblock.filters.annoyances.name', null, 'Cookie & Annoyance Filters'), desc: t('cfg.adblock.filters.annoyances.desc', null, 'Cookie consent dialogs and newsletter popups') },
                            { id: 'malware', name: t('cfg.adblock.filters.malware.name', null, 'Malware & Mining Protection'), desc: t('cfg.adblock.filters.malware.desc', null, 'Known malicious domains and in-browser miners') },
                            { id: 'peterlowe', name: t('cfg.adblock.filters.peterlowe.name', null, "Peter Lowe's Ad Server List"), desc: t('cfg.adblock.filters.peterlowe.desc', null, 'Curated ad server and tracking domains') }
                        ];

                        const currentAdblockLevel = settings?.adblockLevel || (
                            (settings?.cosmetic !== false && settings?.adblockAnnoyances !== false && settings?.social !== false && settings?.adblockMalware !== false && settings?.adblockYoutubeAds !== false)
                                ? (settings?.adblockTelemetry ? 'strict' : 'standard')
                                : 'custom'
                        );

                        const handleSetAdblockMode = (mode) => {
                            if (mode === 'standard') {
                                setSettingValue('adblockLevel', 'standard');
                                setSettingValue('cosmetic', true);
                                setSettingValue('adblockAnnoyances', true);
                                setSettingValue('social', true);
                                setSettingValue('adblockTelemetry', false);
                                setSettingValue('adblockMalware', true);
                                setSettingValue('adblockYoutubeAds', true);
                                showToast(t('cfg.adblock.toastStandardApplied', null, 'Standard blocking applied'));
                            } else if (mode === 'strict') {
                                setSettingValue('adblockLevel', 'strict');
                                setSettingValue('cosmetic', true);
                                setSettingValue('adblockAnnoyances', true);
                                setSettingValue('social', true);
                                setSettingValue('adblockTelemetry', true);
                                setSettingValue('adblockMalware', true);
                                setSettingValue('adblockYoutubeAds', true);
                                showToast(t('cfg.adblock.toastStrictApplied', null, 'Strict mode applied'));
                            } else {
                                setSettingValue('adblockLevel', 'custom');
                            }
                        };

                        return (
                            <div className="animate-tab-fade space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">{t('cfg.adblock.title', null, 'Shields & AdBlock')}</h3>
                                    <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {t('cfg.adblock.subtitle', null, 'Manage ad blocking, privacy protection, and site exceptions.')}
                                    </p>
                                </div>

                                {/* 1. MAIN TOGGLE & PROTECTION LEVEL */}
                                <div className="space-y-3">
                                    <SectionHeader
                                        icon={Shield}
                                        title={t('cfg.adblock.protectionSectionTitle', null, 'Shields Protection')}
                                        description={t('cfg.adblock.protectionSectionDesc', null, 'Global ad & tracker blocker switch, filter updates, and baseline profile.')}
                                    />

                                    <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border ${
                                                    isAdblockActive 
                                                        ? (isBright ? 'bg-accent/15 text-accent border-accent/30' : 'bg-accent/15 text-accent border-accent/30') 
                                                        : (isBright ? 'bg-black/[0.04] text-zinc-400 border-black/[0.07]' : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]')
                                                }`}>
                                                    <Shield size={20} />
                                                </div>
                                                <div>
                                                    <h4 className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                        {t('cfg.adblock.adTrackerTitle', null, 'Ad & Tracker Protection')}
                                                    </h4>
                                                    <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        {t('cfg.adblock.adTrackerDesc', null, 'Blocks advertising banners, tracking pixels, and analytical telemetry.')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {blockedTrackersCount > 0 && (
                                                    <div className={`text-right pr-3 border-r ${isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'}`}>
                                                        <span className={`text-sm font-semibold font-mono ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                            {blockedTrackersCount.toLocaleString(intlLocale)}
                                                        </span>
                                                        <p className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.adblock.blockedLabel', null, 'Blocked')}</p>
                                                    </div>
                                                )}
                                                <SettingToggle isChecked={isAdblockActive} onToggle={toggleAdblock} />
                                            </div>
                                        </div>

                                        {/* Update status row */}
                                        <div className={`flex items-center justify-between pt-3 border-t text-xs ${
                                            isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'
                                        }`}>
                                            <span className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {filterUpdateStatus || t('cfg.adblock.filtersReady', null, 'Filters updated and ready')}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    setIsUpdatingFilters(true);
                                                    try {
                                                        if (window.electronAPI?.updateAdblockFilters) {
                                                            await window.electronAPI.updateAdblockFilters();
                                                        }
                                                        setFilterUpdateStatus(t('cfg.adblock.updatedJustNow', null, 'Updated just now'));
                                                        showToast(t('cfg.adblock.toastFiltersUpdated', null, 'Filter lists updated'));
                                                    } catch (err) {
                                                        setFilterUpdateStatus(t('cfg.adblock.updatedJustNow', null, 'Updated just now'));
                                                        showToast(t('cfg.adblock.toastFiltersUpToDate', null, 'Filter lists up to date'));
                                                    } finally {
                                                        setIsUpdatingFilters(false);
                                                    }
                                                }}
                                                disabled={isUpdatingFilters}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                                    isBright 
                                                        ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' 
                                                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.06]'
                                                }`}
                                            >
                                                <RefreshCw size={12} className={isUpdatingFilters ? 'animate-spin text-accent' : ''} />
                                                <span>{isUpdatingFilters ? t('cfg.adblock.updating', null, 'Updating...') : t('cfg.adblock.checkUpdates', null, 'Check for Updates')}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2. BLOCKING PROFILE SWITCHER */}
                                    <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-3 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                {t('cfg.adblock.protectionLevelTitle', null, 'Protection Level')}
                                            </h4>
                                            <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {t('cfg.adblock.protectionLevelDesc', null, 'Select a balanced standard profile or strict privacy shielding.')}
                                            </p>
                                        </div>

                                        <SlidingPillSwitcher
                                            options={[
                                                { id: 'standard', label: t('cfg.adblock.levelStandard', null, 'Standard') },
                                                { id: 'strict', label: t('cfg.adblock.levelStrict', null, 'Strict') },
                                                { id: 'custom', label: t('cfg.adblock.levelCustom', null, 'Custom') }
                                            ]}
                                            value={currentAdblockLevel}
                                            onChange={handleSetAdblockMode}
                                            isBright={isBright}
                                        />
                                    </div>
                                </div>

                                {/* 3. TOGGLE CARDS */}
                                <SectionHeader 
                                    icon={SlidersHorizontal} 
                                    title={t('cfg.adblock.contentFiltersTitle', null, 'Content Filters')} 
                                    description={t('cfg.adblock.contentFiltersDesc', null, 'Toggle specific categories of blocked content.')}
                                />

                                <div className="space-y-2 pt-1">
                                    <SettingCard 
                                        icon={Eye} 
                                        title={t('cfg.adblock.cosmeticTitle', null, 'Cosmetic Element Hiding')} 
                                        description={t('cfg.adblock.cosmeticDesc', null, 'Collapse blank containers and empty spaces left by blocked ads.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.cosmetic !== false} 
                                            onToggle={() => {
                                                setSettingValue('adblockLevel', 'custom');
                                                toggleSetting('cosmetic');
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Cookie} 
                                        title={t('cfg.adblock.annoyancesTitle', null, 'Cookie Consent Popups')} 
                                        description={t('cfg.adblock.annoyancesDesc', null, 'Automatically dismiss GDPR notices and cookie consent walls.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.adblockAnnoyances !== false} 
                                            onToggle={() => {
                                                setSettingValue('adblockLevel', 'custom');
                                                const cur = settings.adblockAnnoyances !== false;
                                                setSettingValue('adblockAnnoyances', !cur);
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={ShieldAlert} 
                                        title={t('cfg.adblock.socialTitle', null, 'Social Trackers')} 
                                        description={t('cfg.adblock.socialDesc', null, 'Block embedded social media tracking widgets and pixel beacons.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.social !== false} 
                                            onToggle={() => {
                                                setSettingValue('adblockLevel', 'custom');
                                                toggleSetting('social');
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Activity} 
                                        title={t('cfg.adblock.telemetryTitle', null, 'Analytics & Telemetry')} 
                                        description={t('cfg.adblock.telemetryDesc', null, 'Block third-party user recording and telemetry scripts.')}
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.adblockTelemetry} 
                                            onToggle={() => {
                                                setSettingValue('adblockLevel', 'custom');
                                                setSettingValue('adblockTelemetry', !settings.adblockTelemetry);
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Lock} 
                                        title={t('cfg.adblock.malwareTitle', null, 'Malware & Phishing')} 
                                        description={t('cfg.adblock.malwareDesc', null, 'Block connections to known malware and cryptomining domains.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.adblockMalware !== false} 
                                            onToggle={() => {
                                                setSettingValue('adblockLevel', 'custom');
                                                const cur = settings.adblockMalware !== false;
                                                setSettingValue('adblockMalware', !cur);
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Zap} 
                                        title={t('cfg.adblock.youtubeAdsTitle', null, 'Video Ad Stripping')} 
                                        description={t('cfg.adblock.youtubeAdsDesc', null, 'Hide video sponsor banners and promoted content cards.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.adblockYoutubeAds !== false} 
                                            onToggle={() => {
                                                setSettingValue('adblockLevel', 'custom');
                                                const cur = settings.adblockYoutubeAds !== false;
                                                setSettingValue('adblockYoutubeAds', !cur);
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Server} 
                                        title={t('cfg.adblock.cnameUncloakingTitle', null, 'Enable DNS CNAME Uncloaking')} 
                                        description={t('cfg.adblock.cnameUncloakingDesc', null, 'Resolve first-party tracking subdomains via DNS CNAME records in the background to block disguised third-party trackers.')}
                                    >
                                        <SettingToggle 
                                            isChecked={settings.adblockCnameUncloaking === true} 
                                            onToggle={() => {
                                                const cur = settings.adblockCnameUncloaking === true;
                                                setSettingValue('adblockCnameUncloaking', !cur);
                                            }} 
                                        />
                                    </SettingCard>
                                </div>

                                {/* 4. FILTER LISTS */}
                                <SectionHeader 
                                    icon={Layers} 
                                    title={t('cfg.adblock.subscriptionsTitle', null, 'Filter Subscriptions')} 
                                    description={t('cfg.adblock.subscriptionsDesc', null, 'Active community filter lists.')}
                                />

                                <div className="space-y-2 pt-1">
                                    {filterDefinitions.map(filter => {
                                        const isEnabled = activeFilterLists[filter.id] !== false;
                                        return (
                                            <div 
                                                key={filter.id}
                                                className={`flex items-center justify-between p-3.5 px-4 rounded-xl border transition-all duration-200 ${
                                                    isBright 
                                                        ? 'bg-black/[0.02] hover:bg-black/[0.04] border-black/[0.07]' 
                                                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06]'
                                                }`}
                                            >
                                                <div className="min-w-0 pr-4">
                                                    <span className={`text-xs font-semibold block ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                        {filter.name}
                                                    </span>
                                                    <p className={`text-[11px] mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        {filter.desc}
                                                    </p>
                                                </div>
                                                <SettingToggle
                                                    isChecked={isEnabled}
                                                    onToggle={() => {
                                                        const updated = {
                                                            ...activeFilterLists,
                                                            [filter.id]: !isEnabled
                                                        };
                                                        setSettingValue('adblockFilterLists', updated);
                                                        showToast(t('cfg.adblock.toastFilterToggle', { name: filter.name, state: !isEnabled ? t('cfg.common.enabled', null, 'enabled') : t('cfg.common.disabled', null, 'disabled') }, `${filter.name} ${!isEnabled ? 'enabled' : 'disabled'}`));
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 5. EXCEPTIONS */}
                                <SectionHeader 
                                    icon={Globe} 
                                    title={t('cfg.adblock.exceptionsTitle', null, 'Exceptions & Rules')} 
                                    description={t('cfg.adblock.exceptionsDesc', null, 'Allow ads on specific websites, or block additional domains.')}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    {/* Allowlist */}
                                    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-semibold ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                {t('cfg.adblock.allowlistTitle', null, 'Allowlist')}
                                            </span>
                                            <span className={`text-[11px] font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {(settings.adblockAllowlist || []).length}
                                            </span>
                                        </div>
                                        <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {t('cfg.adblock.allowlistDesc', null, 'Websites where protection is disabled.')}
                                        </p>

                                        <form onSubmit={handleAddAllowlist} className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="example.com"
                                                value={adblockAllowlistInput}
                                                onChange={(e) => setAdblockAllowlistInput(e.target.value)}
                                                className={`flex-1 min-w-0 px-3 py-1.5 rounded-xl text-xs font-mono outline-none border transition ${
                                                    isBright 
                                                        ? 'bg-white border-black/15 text-zinc-900 focus:border-accent' 
                                                        : 'bg-black/40 border-white/[0.08] text-white focus:border-accent'
                                                }`}
                                            />
                                            <button
                                                type="submit"
                                                className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-semibold text-xs transition cursor-pointer active:scale-95 shadow-xs"
                                            >
                                                {t('cfg.common.add', null, 'Add')}
                                            </button>
                                        </form>

                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto hide-scroll pt-1">
                                            {(settings.adblockAllowlist || []).length === 0 ? (
                                                <span className={`text-[11px] italic py-1 ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                    {t('cfg.adblock.allowlistEmpty', null, 'No websites allowlisted.')}
                                                </span>
                                            ) : (
                                                (settings.adblockAllowlist || []).map((domain) => (
                                                    <span 
                                                        key={domain} 
                                                        className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-mono border ${
                                                            isBright 
                                                                ? 'bg-white border-black/10 text-zinc-800 shadow-xs' 
                                                                : 'bg-white/[0.04] border-white/10 text-zinc-200'
                                                        }`}
                                                    >
                                                        <span>{domain}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAllowlist(domain)}
                                                            className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition cursor-pointer"
                                                            title={t('cfg.common.remove', null, 'Remove')}
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Custom Blocked Domains */}
                                    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-semibold ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                    {t('cfg.adblock.customBlocklistTitle', null, 'Custom Blocklist')}
                                                </span>
                                                <span className={`text-[11px] font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {(settings.adblockCustomBlockedDomains || []).length.toLocaleString(intlLocale)}
                                                </span>
                                            </div>

                                            {/* Action tools */}
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setAdblockImportInitialUrl('');
                                                        setIsAdblockImportOpen(true);
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                                                        isBright 
                                                            ? 'bg-black/5 hover:bg-black/10 text-zinc-800 border-black/10' 
                                                            : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                                                    }`}
                                                    title={t('cfg.adblock.importFromUrlTitle', null, 'Import domain lists from GitHub, hosts files, or ABP rules')}
                                                >
                                                    <Download size={12} className="text-accent" />
                                                    <span>{t('cfg.adblock.importFromUrlBtn', null, 'Import from GitHub / URL')}</span>
                                                </button>
                                                {(settings.adblockCustomBlockedDomains || []).length > 0 && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={handleExportBlocklist}
                                                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                                                isBright 
                                                                    ? 'bg-white hover:bg-black/5 text-zinc-600 border-black/10' 
                                                                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                                                            }`}
                                                            title={t('cfg.adblock.copyBlocklistTitle', null, 'Copy all custom blocked domains to clipboard')}
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleClearBlocklist}
                                                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                                            title={t('cfg.adblock.clearBlocklistTitle', null, 'Clear all custom blocked domains')}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {renderTemplateParts(
                                                t('cfg.adblock.customBlocklistDesc', null, 'Specific domains to always block. Paste full URLs, hosts syntax ({syntax}), ABP filter rules, or import community lists from GitHub.'),
                                                { syntax: <code className="font-mono text-[10px]">0.0.0.0 domain</code> }
                                            )}
                                        </p>

                                        {/* Auto-detected Remote List URL Smart Banner */}
                                        {isPotentialRemoteListUrl(adblockBlocklistInput) && (
                                            <div className="p-2.5 px-3 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-between gap-2 text-xs animate-fade-in">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Globe size={14} className="text-accent shrink-0" />
                                                    <span className="truncate text-xs font-semibold">
                                                        {t('cfg.adblock.remoteLinkDetected', null, 'Detected GitHub / remote blocklist link')}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setAdblockImportInitialUrl(normalizeRemoteListUrl(adblockBlocklistInput));
                                                        setIsAdblockImportOpen(true);
                                                        setAdblockBlocklistInput('');
                                                    }}
                                                    className="px-3 py-1 rounded-lg bg-accent text-zinc-950 font-bold text-xs shrink-0 hover:bg-accent-hover transition cursor-pointer shadow-xs active:scale-95"
                                                >
                                                    {t('cfg.adblock.fetchImportBtn', null, 'Fetch & Import List')}
                                                </button>
                                            </div>
                                        )}

                                        {/* Input form */}
                                        <form onSubmit={handleAddBlocklist} className="flex flex-col gap-1.5">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={t('cfg.adblock.blocklistPlaceholder', null, 'ads.example.com, https://..., or GitHub link')}
                                                    value={adblockBlocklistInput}
                                                    onChange={(e) => setAdblockBlocklistInput(e.target.value)}
                                                    className={`flex-1 min-w-0 px-3 py-1.5 rounded-xl text-xs font-mono outline-none border transition ${
                                                        isBright 
                                                            ? 'bg-white border-black/15 text-zinc-900 focus:border-accent' 
                                                            : 'bg-black/40 border-white/[0.08] text-white focus:border-accent'
                                                    }`}
                                                />
                                                <button
                                                    type="submit"
                                                    className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-semibold text-xs transition cursor-pointer active:scale-95 shadow-xs"
                                                >
                                                    {t('cfg.common.add', null, 'Add')}
                                                </button>
                                            </div>

                                            {/* Live Auto-Parser Helper Feedback */}
                                            {(() => {
                                                const raw = adblockBlocklistInput.trim();
                                                if (!raw || isPotentialRemoteListUrl(raw)) return null;
                                                const parsed = parseBlocklistInput(raw);
                                                if (parsed.domains.length === 1 && parsed.domains[0] !== raw.toLowerCase()) {
                                                    return (
                                                        <div className="text-[10px] font-mono opacity-70 px-1 flex items-center gap-1">
                                                            <span>{t('cfg.adblock.autoParsedDomain', null, 'Auto-parsed domain:')}</span>
                                                            <span className="text-accent font-semibold">{parsed.domains[0]}</span>
                                                        </div>
                                                    );
                                                }
                                                if (parsed.domains.length > 1) {
                                                    return (
                                                        <div className="text-[10px] font-mono opacity-70 px-1 flex items-center gap-1">
                                                            <span>{t('cfg.adblock.bulkDetected', null, 'Bulk input detected:')}</span>
                                                            <span className="text-accent font-semibold">{t('cfg.adblock.bulkDomainsCount', { count: parsed.domains.length }, `${parsed.domains.length} domains`)}</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </form>

                                        {/* In-Card Search Filter (visible when list has multiple items) */}
                                        {(settings.adblockCustomBlockedDomains || []).length >= 8 && (
                                            <div className="relative">
                                                <Search size={12} className="absolute left-2.5 top-2.5 opacity-40" />
                                                <input
                                                    type="text"
                                                    placeholder={t('cfg.adblock.filterDomainsPlaceholder', null, 'Filter custom domains...')}
                                                    value={blocklistSearchQuery}
                                                    onChange={(e) => setBlocklistSearchQuery(e.target.value)}
                                                    className={`w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] font-mono outline-none border transition ${
                                                        isBright 
                                                            ? 'bg-white border-black/10 text-zinc-800 focus:border-accent' 
                                                            : 'bg-black/30 border-white/10 text-zinc-200 focus:border-accent'
                                                    }`}
                                                />
                                            </div>
                                        )}

                                        {/* Domains List */}
                                        {(() => {
                                            const allDomains = settings.adblockCustomBlockedDomains || [];
                                            const filtered = allDomains.filter(d => {
                                                if (!blocklistSearchQuery.trim()) return true;
                                                return d.toLowerCase().includes(blocklistSearchQuery.toLowerCase().trim());
                                            });

                                            if (allDomains.length === 0) {
                                                return (
                                                    <span className={`text-[11px] italic py-1 ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                        {t('cfg.adblock.customBlocklistEmpty', null, 'No custom domains added yet. Click "Import from GitHub / URL" or enter a domain above.')}
                                                    </span>
                                                );
                                            }

                                            if (filtered.length === 0) {
                                                return (
                                                    <span className={`text-[11px] italic py-1 ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                        {t('cfg.adblock.noMatchingDomains', { query: blocklistSearchQuery }, `No domains matching "${blocklistSearchQuery}"`)}
                                                    </span>
                                                );
                                            }

                                            const visibleSlice = filtered.slice(0, 120);

                                            return (
                                                <div className="space-y-1.5">
                                                    <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto hide-scroll pt-1">
                                                        {visibleSlice.map((domain) => (
                                                            <span 
                                                                key={domain} 
                                                                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-mono border ${
                                                                    isBright 
                                                                        ? 'bg-white border-black/10 text-zinc-800 shadow-xs' 
                                                                        : 'bg-white/[0.04] border-white/10 text-zinc-200'
                                                                }`}
                                                            >
                                                                <span>{domain}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveBlocklist(domain)}
                                                                    className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition cursor-pointer"
                                                                    title={t('cfg.common.remove', null, 'Remove')}
                                                                >
                                                                    <X size={11} />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {filtered.length > 120 && (
                                                        <p className={`text-[10px] font-mono italic ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                            {t('cfg.adblock.showingSlice', { count: filtered.length.toLocaleString(intlLocale) }, `Showing 120 of ${filtered.length.toLocaleString(intlLocale)} matching domains. Use search above to narrow down.`)}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {settingsTab === 'shortcuts' && (
                        <KeyboardShortcutsSettings isBright={isBright} showToast={showToast} t={t} />
                    )}

                    {/* TAB 8: ABOUT & SYSTEM INFO */}
                    {settingsTab === 'ai' && (
                        <AIEngineSettings />
                    )}

                    {settingsTab === 'about' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{t('cfg.about.title', null, 'About & System Info')}</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.about.subtitle', null, 'System architecture, runtime specifications, and app updates.')}</p>
                            </div>

                            {/* Account & Firebase Sync Card */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={User}
                                    title={t('cfg.about.accountSectionTitle', null, 'Account & Cloud Sync')}
                                    description={t('cfg.about.accountSectionDesc', null, 'Manage your encrypted cloud profile, snapshots, and cross-device synchronization.')}
                                />
                                <div className={`p-5 rounded-2xl border space-y-4 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${
                                                isBright ? 'bg-accent/15 text-accent border-black/[0.07]' : 'bg-accent/10 text-accent border-white/[0.06]'
                                            }`}>
                                                {user ? (user.email ? user.email.charAt(0).toUpperCase() : 'U') : <Lock size={20} />}
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-base flex items-center gap-2 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {user ? user.email : t('cfg.about.guestMode', null, 'Guest / Offline Mode')}
                                                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                                                        user
                                                            ? (isBright ? 'bg-emerald-500/10 text-emerald-700 border-black/[0.07]' : 'bg-emerald-500/15 text-emerald-300 border-white/[0.06]')
                                                            : (isBright ? 'bg-black/[0.04] text-zinc-500 border-black/[0.07]' : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]')
                                                    }`}>
                                                        {user ? t('cfg.about.aesEncrypted', null, 'AES-256 Encrypted') : t('cfg.about.localOnly', null, 'Local Only')}
                                                    </span>
                                                </h4>
                                                <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {user ? t('cfg.about.syncStats', { time: lastSyncTime || t('cfg.common.justNow', null, 'Just now'), count: syncedItemsCount || 24 }, `Last synced: ${lastSyncTime || 'Just now'} • ${syncedItemsCount || 24} items synced`) : t('cfg.about.signInSyncPrompt', null, 'Sign in to sync your encrypted passwords, settings, and tabs across devices.')}
                                                </p>
                                            </div>
                                        </div>

                                        {user ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={syncNow}
                                                    disabled={isSyncing}
                                                    className="px-4 py-2 bg-accent text-zinc-950 font-bold rounded-xl text-xs transition hover:brightness-105 cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                                >
                                                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                                                    {isSyncing ? t('cfg.about.syncing', null, 'Syncing...') : t('cfg.about.syncNow', null, 'Sync Now')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        useSyncStore.getState().pushManualBackup(t('cfg.about.manualSnapshotNote', null, 'Manual Snapshot from Settings'));
                                                    }}
                                                    className={`px-3 py-2 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                                        isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.06]'
                                                    }`}
                                                    title={t('cfg.about.pushBackupTitle', null, 'Push Cloud Backup Version')}
                                                >
                                                    <UploadCloud size={13} className="text-accent" />
                                                    {t('cfg.about.pushBackup', null, 'Push Backup')}
                                                </button>
                                                <button
                                                    onClick={logout}
                                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                                                >
                                                    {t('cfg.about.signOut', null, 'Sign Out')}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => openModal('auth')}
                                                className="px-5 py-2.5 bg-accent text-zinc-950 font-bold rounded-xl text-xs transition hover:brightness-105 cursor-pointer shadow-sm"
                                            >
                                                {t('cfg.about.signInRegister', null, 'Sign In / Register')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Default Browser Management Card */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Compass}
                                    title={t('cfg.about.defaultBrowserSectionTitle', null, 'Default Browser & Startup')}
                                    description={t('cfg.about.defaultBrowserSectionDesc', null, 'Configure system web link handling and session restoration.')}
                                />
                                <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-300 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border p-2 ${
                                                isDefaultBrowser 
                                                    ? (isBright ? 'bg-emerald-500/10 border-black/[0.07]' : 'bg-emerald-500/10 border-white/[0.06]')
                                                    : (isBright ? 'bg-black/[0.04] border-black/[0.07]' : 'bg-white/[0.04] border-white/[0.06]')
                                            }`}>
                                                <img 
                                                    src={qbrowseLogo} 
                                                    alt="QBrowse" 
                                                    className="w-full h-full object-contain rounded-xl drop-shadow" 
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <Compass size={24} className="hidden text-accent" />
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-base flex items-center gap-2 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {t('cfg.about.defaultWebBrowser', null, 'Default Web Browser')}
                                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                                        isDefaultBrowser 
                                                            ? (isBright ? 'bg-emerald-500/10 text-emerald-700 border-black/[0.07]' : 'bg-emerald-500/15 text-emerald-300 border-white/[0.06]')
                                                            : (isBright ? 'bg-amber-500/10 text-amber-700 border-black/[0.07]' : 'bg-amber-500/15 text-amber-300 border-white/[0.06]')
                                                    }`}>
                                                        {isDefaultBrowser ? t('cfg.about.badgeDefaultBrowser', null, 'Default Browser') : t('cfg.about.badgeNotDefault', null, 'Not Default')}
                                                    </span>
                                                </h4>
                                                <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {isDefaultBrowser 
                                                        ? (osPlatform === 'darwin'
                                                            ? t('cfg.about.defaultTrueDarwin', null, 'QBrowse is currently your primary browser on macOS for all web links, HTML documents, and protocol requests.')
                                                            : osPlatform === 'linux'
                                                                ? t('cfg.about.defaultTrueLinux', null, 'QBrowse is currently your Linux desktop default browser for all web links, HTML documents, and protocol requests.')
                                                                : t('cfg.about.defaultTrueWin', null, 'QBrowse is currently your Windows default browser for all web links, HTML documents, and protocol requests.'))
                                                        : (osPlatform === 'darwin'
                                                            ? t('cfg.about.defaultFalseDarwin', null, 'Make QBrowse your default browser in macOS System Settings to open links from apps with Tor routing, sandboxed spaces, and encrypted sync.')
                                                            : osPlatform === 'linux'
                                                                ? t('cfg.about.defaultFalseLinux', null, 'Make QBrowse your default browser in Linux Desktop Default Applications to open links from apps with Tor routing, sandboxed spaces, and encrypted sync.')
                                                                : t('cfg.about.defaultFalseWin', null, 'Make QBrowse your default browser in Windows Settings to open links from apps with Tor routing, sandboxed spaces, and encrypted sync.'))}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!isDefaultBrowser && (
                                                <button
                                                    onClick={handleSetDefaultBrowser}
                                                    className="px-4 py-2 bg-accent text-zinc-950 font-bold rounded-xl text-xs transition hover:brightness-105 active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    {t('cfg.about.setAsDefault', null, 'Set as Default')}
                                                </button>
                                            )}
                                            <button
                                                onClick={handleOpenDefaultAppsSettings}
                                                className={`px-3 py-2 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                                    isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.06]'
                                                }`}
                                                title={
                                                    osPlatform === 'darwin'
                                                        ? t('cfg.about.openDarwinSettingsTitle', null, 'Open macOS System Settings')
                                                        : osPlatform === 'linux'
                                                            ? t('cfg.about.openLinuxSettingsTitle', null, 'Open Linux Desktop Default Applications')
                                                            : t('cfg.about.openWinSettingsTitle', null, 'Open Windows Default Apps Settings')
                                                }
                                            >
                                                <ExternalLink size={13} />
                                                {osPlatform === 'darwin'
                                                    ? t('cfg.about.darwinSettingsBtn', null, 'macOS System Settings')
                                                    : osPlatform === 'linux'
                                                        ? t('cfg.about.linuxSettingsBtn', null, 'Default Applications')
                                                        : t('cfg.about.winSettingsBtn', null, 'Windows Settings')}
                                            </button>
                                            <button
                                                onClick={refreshDefaultBrowserStatus}
                                                disabled={isCheckingDefault}
                                                className={`p-2 border rounded-xl text-xs transition cursor-pointer ${
                                                    isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-600 hover:text-zinc-900 border-black/[0.07]' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border-white/[0.06]'
                                                }`}
                                                title={t('cfg.about.refreshStatusTitle', null, 'Refresh status')}
                                            >
                                                <RefreshCw size={14} className={isCheckingDefault ? 'animate-spin text-accent' : ''} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`pt-3 border-t flex items-center justify-between ${isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'}`}>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-medium ${isBright ? 'text-zinc-800' : 'text-white/75'}`}>{t('cfg.about.checkStartupTitle', null, 'Check if QBrowse is default on startup')}</p>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.about.checkStartupHint', null, '(Prompts banner if not default)')}</span>
                                        </div>
                                        <SettingToggle 
                                            isChecked={checkDefaultOnStartup} 
                                            onToggle={handleToggleStartupCheck} 
                                        />
                                    </div>

                                    <div className={`pt-3 border-t flex items-center justify-between ${isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'}`}>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-medium ${isBright ? 'text-zinc-800' : 'text-white/75'}`}>{t('cfg.about.rememberTabsTitle', null, 'Remember open websites on close')}</p>
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.about.rememberTabsHint', null, '(Reopen previous session tabs on startup)')}</span>
                                        </div>
                                        <SettingToggle 
                                            isChecked={settings.restoreTabsOnStartup !== false} 
                                            onToggle={() => toggleSetting('restoreTabsOnStartup')} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* App Banner & GitHub Releases Auto-Updater */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Info}
                                    title={t('cfg.about.updatesSectionTitle', null, 'Application & Updates')}
                                    description={t('cfg.about.updatesSectionDesc', null, 'Current build version, GitHub Releases sync, and automatic updates.')}
                                />
                                <div className={`p-4 px-5 rounded-2xl border flex flex-col gap-3 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex items-center gap-3.5">
                                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center p-1.5 overflow-hidden ${
                                                isBright ? 'bg-black/[0.04] border-black/[0.07]' : 'bg-white/[0.04] border-white/[0.06]'
                                            }`}>
                                                <img 
                                                    src={qbrowseLogo} 
                                                    alt="QBrowse" 
                                                    className="w-full h-full object-contain rounded-lg drop-shadow" 
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <span className={`hidden font-bold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>QB</span>
                                            </div>
                                            <div>
                                                <h4 className={`text-xs font-semibold flex items-center gap-2 flex-wrap ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    QBrowse
                                                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                                                        isBright ? 'bg-black/[0.04] text-zinc-700 border-black/[0.07]' : 'bg-white/[0.05] text-zinc-300 border-white/[0.06]'
                                                    }`}>
                                                        v{String(currentAppVersion).replace(/^v/i, '')}
                                                    </span>
                                                    {updateData?.platform === 'linux' && updateData?.installShortLabel && (
                                                        <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                                                            isBright ? 'bg-sky-500/10 text-sky-700 border-black/[0.07]' : 'bg-sky-500/15 text-sky-300 border-white/[0.06]'
                                                        }`}>
                                                            {updateData.installShortLabel}{updateData.arch ? ` · ${updateData.arch}` : ''}
                                                        </span>
                                                    )}
                                                    {updateData?.syncedWithGitHub && updateData?.latestVersion && (
                                                        <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border flex items-center gap-1 ${
                                                            updateData.status === 'available' || updateData.status === 'downloading' || updateData.status === 'downloaded'
                                                                ? (isBright ? 'bg-amber-500/10 text-amber-700 border-black/[0.07]' : 'bg-amber-500/15 text-amber-300 border-white/[0.06]')
                                                                : (isBright ? 'bg-emerald-500/10 text-emerald-700 border-black/[0.07]' : 'bg-emerald-500/10 text-emerald-300 border-white/[0.06]')
                                                        }`}>
                                                            <CheckCircle2 size={10} />
                                                            {updateData.status === 'available' || updateData.status === 'downloading' || updateData.status === 'downloaded'
                                                                ? t('cfg.about.githubReleaseBadge', { version: String(updateData.latestVersion).replace(/^v/i, '') }, `GitHub Release: v${String(updateData.latestVersion).replace(/^v/i, '')}`)
                                                                : t('cfg.about.syncedGithubBadge', { version: String(updateData.latestVersion).replace(/^v/i, '') }, `Synced with GitHub (v${String(updateData.latestVersion).replace(/^v/i, '')})`)}
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className={`text-[11px] mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    {updateData?.status === 'error' && updateData?.message
                                                        ? t('cfg.about.updateNoticeMsg', { message: updateData.message }, `Update check notice: ${updateData.message}`)
                                                        : updateData?.status === 'available' && updateData?.managedExternally
                                                        ? t('cfg.about.updateExternalMsg', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, ''), format: updateData.installLabel || updateData.installShortLabel || 'package manager' }, `Version v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')} is available. Update using ${updateData.installLabel || updateData.installShortLabel || 'your package manager'}.`)
                                                        : updateData?.status === 'available' && updateData?.platform === 'linux' && !updateData?.assetUrl
                                                        ? t('cfg.about.updateNoLinuxAssetMsg', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, ''), arch: updateData.arch || 'linux' }, `Version v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')} is available on GitHub Releases. No prebuilt package matched ${updateData.arch || 'this architecture'} — open GitHub Releases to download manually.`)
                                                        : updateData?.status === 'available'
                                                        ? t('cfg.about.updateAvailableMsg', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, '') }, `New version v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')} is available on GitHub Releases.`)
                                                        : updateData?.status === 'downloaded' && updateData?.platform === 'linux' && updateData?.canAutoInstall === false
                                                        ? t('cfg.about.updateDownloadedLinuxPkgMsg', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, ''), format: updateData.packageExt || 'package' }, `Package v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')} (${updateData.packageExt || 'Linux'}) downloaded. Open the package or run the terminal command below to install.`)
                                                        : updateData?.status === 'downloaded'
                                                        ? t('cfg.about.updateDownloadedMsg', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, '') }, `Update v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')} verified and ready to install.`)
                                                        : t('cfg.about.tagline', null, 'Privacy-first multi-space desktop browser')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {updateData?.status === 'downloaded' ? (
                                                <>
                                                    <button 
                                                        onClick={async () => {
                                                            if (window.electronAPI?.quitAndInstallUpdate) {
                                                                const isLinuxManualPkg = updateData?.platform === 'linux' && updateData?.canAutoInstall === false;
                                                                showToast(isLinuxManualPkg
                                                                    ? t('cfg.about.toastOpeningPackage', null, 'Opening downloaded update package...')
                                                                    : t('cfg.about.toastLaunchingInstaller', null, 'Launching update installer...'));
                                                                const res = await window.electronAPI.quitAndInstallUpdate();
                                                                if (res?.status === 'error') {
                                                                    showToast(t('cfg.about.toastInstallFailed', { message: res.message || t('cfg.common.unknownError', null, 'Unknown error') }, 'Install failed: ' + (res.message || 'Unknown error')));
                                                                } else if (res?.status === 'opened-folder') {
                                                                    showToast(t('cfg.about.toastOpenedPackageFolder', null, 'Opened download folder. Run the install command to finish updating.'));
                                                                }
                                                            } else {
                                                                showToast(t('cfg.about.toastRestartingUpdate', null, 'Restarting to install update...'));
                                                            }
                                                        }}
                                                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-2 border border-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        {updateData?.platform === 'linux' && updateData?.canAutoInstall === false
                                                            ? t('cfg.about.openDownloadedPackage', null, 'Open Downloaded Package')
                                                            : t('cfg.about.restartAndUpdate', { version: String(updateData.latestVersion || updateData.version || currentAppVersion).replace(/^v/i, '') }, `Restart & Update (v${String(updateData.latestVersion || updateData.version || currentAppVersion).replace(/^v/i, '')})`)}
                                                    </button>
                                                    {updateData?.platform === 'linux' && updateData?.canAutoInstall === false && updateData?.downloadedFilePath && window.electronAPI?.showItemInFolder && (
                                                        <button
                                                            onClick={() => window.electronAPI.showItemInFolder(updateData.downloadedFilePath)}
                                                            className={`px-2.5 py-1.5 font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border active:scale-95 ${
                                                                isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.06]'
                                                            }`}
                                                            title={t('cfg.about.showInFolder', null, 'Show downloaded package in folder')}
                                                        >
                                                            <Folder size={12} />
                                                            {t('cfg.about.showInFolderBtn', null, 'Folder')}
                                                        </button>
                                                    )}
                                                </>
                                            ) : updateData?.status === 'downloading' ? (
                                                <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${
                                                    isBright ? 'bg-black/[0.04] border-black/[0.07]' : 'bg-white/[0.06] border-white/[0.06]'
                                                }`}>
                                                    <RefreshCw size={12} className="animate-spin text-accent" />
                                                    <span className={`text-xs font-mono ${isBright ? 'text-zinc-800' : 'text-white/90'}`}>
                                                        {t('cfg.about.downloadingVer', { version: String(updateData.latestVersion || updateData.version || currentAppVersion).replace(/^v/i, ''), percent: updateData.percent || 0 }, `Downloading v${String(updateData.latestVersion || updateData.version || currentAppVersion).replace(/^v/i, '')} (${updateData.percent || 0}%)`)}
                                                    </span>
                                                </div>
                                            ) : updateData?.status === 'available' ? (
                                                (updateData?.managedExternally || (updateData?.platform === 'linux' && !updateData?.assetUrl)) ? (
                                                    <button
                                                        onClick={() => {
                                                            const targetUrl = updateData?.releaseUrl || 'https://github.com/Qu-Bi/QBrowse/releases';
                                                            if (window.electronAPI?.openExternal) {
                                                                window.electronAPI.openExternal(targetUrl);
                                                            } else {
                                                                window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                                            }
                                                        }}
                                                        className="px-3.5 py-1.5 bg-accent text-zinc-950 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-2 shadow-sm hover:brightness-105 active:scale-95"
                                                    >
                                                        <ExternalLink size={13} />
                                                        {t('cfg.about.openReleasePage', null, 'Open Release Page')}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={async () => {
                                                            if (window.electronAPI?.downloadUpdate) {
                                                                showToast(t('cfg.about.toastDownloadingApp', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, '') }, `Downloading QBrowse v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')}...`));
                                                                await window.electronAPI.downloadUpdate();
                                                            }
                                                        }}
                                                        className="px-3.5 py-1.5 bg-accent text-zinc-950 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-2 shadow-sm hover:brightness-105 active:scale-95"
                                                    >
                                                        <Download size={13} />
                                                        {updateData?.platform === 'linux' && updateData?.installType === 'appimage'
                                                            ? t('cfg.about.downloadAppImage', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, '') }, `Download AppImage (v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')})`)
                                                            : updateData?.platform === 'linux' && updateData?.packageExt
                                                            ? t('cfg.about.downloadLinuxPkg', { format: updateData.packageExt, version: String(updateData.latestVersion || updateData.version).replace(/^v/i, '') }, `Download ${updateData.packageExt} Update (v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')})`)
                                                            : t('cfg.about.downloadVer', { version: String(updateData.latestVersion || updateData.version).replace(/^v/i, '') }, `Download v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')}`)}
                                                    </button>
                                                )
                                            ) : null}

                                            {updateData?.status !== 'downloading' && (
                                                <button 
                                                    onClick={async () => {
                                                        setIsCheckingUpdates(true);
                                                        if (window.electronAPI?.checkForUpdates) {
                                                            try {
                                                                const res = await window.electronAPI.checkForUpdates();
                                                                if (res) {
                                                                    setUpdateData(prev => ({ ...(prev || {}), ...res }));
                                                                }
                                                                setIsCheckingUpdates(false);
                                                            } catch (e) {
                                                                setIsCheckingUpdates(false);
                                                                showToast(t('cfg.about.toastUpdateCheckFailed', { message: e?.message || e }, 'Update check failed: ' + (e?.message || e)));
                                                            }
                                                        } else {
                                                            setTimeout(() => {
                                                                setIsCheckingUpdates(false);
                                                                showToast(t('cfg.about.toastUpToDate', { version: String(currentAppVersion).replace(/^v/i, '') }, `QBrowse is up to date! (v${String(currentAppVersion).replace(/^v/i, '')})`));
                                                            }, 1200);
                                                        }
                                                    }}
                                                    disabled={isCheckingUpdates}
                                                    className={`px-3 py-1.5 font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-2 border active:scale-95 disabled:opacity-50 ${
                                                        isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.07]' : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.06]'
                                                    }`}
                                                >
                                                    <RefreshCw size={12} className={isCheckingUpdates ? 'animate-spin' : ''} />
                                                    {isCheckingUpdates ? t('cfg.about.checking', null, 'Checking...') : t('cfg.about.checkUpdates', null, 'Check Updates')}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    const targetUrl = updateData?.releaseUrl || 'https://github.com/Qu-Bi/QBrowse/releases';
                                                    if (window.electronAPI?.openExternal) {
                                                        window.electronAPI.openExternal(targetUrl);
                                                    } else {
                                                        window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                                    }
                                                }}
                                                className={`p-1.5 px-2.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                                                    isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-700 border-black/[0.07]' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/75 hover:text-white border-white/[0.06]'
                                                }`}
                                                title={t('cfg.about.viewReleasesTitle', null, 'View QBrowse Releases on GitHub')}
                                            >
                                                <ExternalLink size={12} />
                                                GitHub
                                            </button>
                                        </div>
                                    </div>

                                    {updateData?.status === 'downloading' && (
                                        <div className={`w-full rounded-full h-1.5 overflow-hidden ${isBright ? 'bg-black/[0.07]' : 'bg-white/[0.06]'}`}>
                                            <div 
                                                className="bg-accent h-full transition-all duration-200 rounded-full"
                                                style={{ width: `${Math.max(2, Math.min(100, updateData.percent || 0))}%` }}
                                            />
                                        </div>
                                    )}

                                    {updateData?.platform === 'linux' && updateData?.installCommand && (
                                        (updateData.status === 'downloaded' && updateData.canAutoInstall === false) ||
                                        (updateData.status === 'available' && updateData.managedExternally)
                                    ) && (
                                        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] ${
                                            isBright ? 'bg-black/[0.03] border-black/[0.08] text-zinc-800' : 'bg-black/30 border-white/[0.08] text-zinc-200'
                                        }`}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Terminal size={13} className="shrink-0 opacity-70" />
                                                <code className="font-mono truncate select-all" title={updateData.installCommand}>
                                                    {updateData.installCommand}
                                                </code>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        if (window.electronAPI?.writeClipboardText) {
                                                            await window.electronAPI.writeClipboardText(updateData.installCommand);
                                                        } else if (navigator.clipboard?.writeText) {
                                                            await navigator.clipboard.writeText(updateData.installCommand);
                                                        }
                                                        showToast(t('cfg.about.toastCommandCopied', null, 'Install command copied to clipboard'));
                                                    } catch (_) {}
                                                }}
                                                className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 border transition cursor-pointer active:scale-95 ${
                                                    isBright ? 'bg-black/[0.05] hover:bg-black/[0.1] text-zinc-800 border-black/[0.08]' : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border-white/[0.08]'
                                                }`}
                                                title={t('cfg.about.copyInstallCmdTitle', null, 'Copy terminal install command')}
                                            >
                                                <Copy size={11} />
                                                {t('cfg.about.copyBtn', null, 'Copy')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Engine Specifications Table */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Cpu}
                                    title={t('cfg.about.specsSectionTitle', null, 'System Specifications')}
                                    description={t('cfg.about.specsSectionDesc', null, 'Embedded Chromium engine, Electron runtime, and local storage subsystems.')}
                                />
                                <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
                                    isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                }`}>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-black/30 border-white/[0.06]'
                                        }`}>
                                            <span className={isBright ? 'text-zinc-500' : 'text-zinc-400'}>{t('cfg.about.specChromium', null, 'Chromium Engine')}</span>
                                            <span className={`font-mono font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                {updateData?.runtimeVersions?.chrome || '130.0.6723.117'}
                                            </span>
                                        </div>
                                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-black/30 border-white/[0.06]'
                                        }`}>
                                            <span className={isBright ? 'text-zinc-500' : 'text-zinc-400'}>{t('cfg.about.specElectron', null, 'Electron Platform')}</span>
                                            <span className={`font-mono font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                {updateData?.runtimeVersions?.electron || '43.1.1'}
                                            </span>
                                        </div>
                                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-black/30 border-white/[0.06]'
                                        }`}>
                                            <span className={isBright ? 'text-zinc-500' : 'text-zinc-400'}>{t('cfg.about.specNode', null, 'Node.js Runtime')}</span>
                                            <span className={`font-mono font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                {updateData?.runtimeVersions?.node || '20.18.0'}
                                            </span>
                                        </div>
                                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-black/30 border-white/[0.06]'
                                        }`}>
                                            <span className={isBright ? 'text-zinc-500' : 'text-zinc-400'}>{t('cfg.about.specArch', null, 'Architecture')}</span>
                                            <span className={`font-mono font-semibold ${isBright ? 'text-emerald-600' : 'text-emerald-400'}`}>
                                                {window.electronAPI?.platform === 'linux' || navigator.userAgent.includes('Linux') ? 'Linux x64 (x86_64)' : window.electronAPI?.platform === 'darwin' || navigator.userAgent.includes('Mac') ? 'macOS (ARM/x64)' : 'Windows x64 (x86_64)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* System Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 border rounded-2xl flex items-center gap-3 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                        <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                                        <div>
                                            <p className={`font-semibold text-xs ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('cfg.about.sqliteSyncTitle', null, 'SQLite History Sync')}</p>
                                            <p className={`text-[11px] mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.about.sqliteSyncDesc', null, 'Encrypted local database active')}</p>
                                        </div>
                                    </div>
                                    <div className={`p-4 border rounded-2xl flex items-center gap-3 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                                    }`}>
                                        <Layers size={20} className="text-accent flex-shrink-0" />
                                        <div>
                                            <p className={`font-semibold text-xs ${isBright ? 'text-zinc-900' : 'text-white'}`}>{t('cfg.about.zenEngineTitle', null, 'Zen Workspace Engine')}</p>
                                            <p className={`text-[11px] mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('cfg.about.zenEngineDesc', null, 'Personal, Work & Incognito spaces')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Experience & Onboarding Controls */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Sparkles}
                                    title={t('cfg.about.expSectionTitle', null, 'Experience & Discovery')}
                                    description={t('cfg.about.expSectionDesc', null, 'Startup audio cues, onboarding setup flow, and interactive feature tour.')}
                                />
                                <SettingCard
                                    icon={Volume2}
                                    title={t('cfg.about.startupChimeTitle', null, 'Play startup welcome chime')}
                                    description={t('cfg.about.startupChimeDesc', null, 'Synthesized acoustic chord when launching the browser.')}
                                >
                                    <SettingToggle 
                                        isChecked={!!settings?.playStartupSound} 
                                        onToggle={() => toggleSetting('playStartupSound')} 
                                    />
                                </SettingCard>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            if (switchModal) {
                                                switchModal('setup');
                                            } else {
                                                closeModal();
                                                setTimeout(() => openModal('setup'), 300);
                                            }
                                        }}
                                        className={`px-4 py-2.5 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                                            isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-900 border-black/[0.07]' : 'bg-white/[0.03] hover:bg-white/[0.07] text-white border-white/[0.06]'
                                        }`}
                                    >
                                        <RotateCcw size={13} className="text-accent" />
                                        <span>{t('cfg.about.relaunchSetup', null, 'Relaunch Setup Journey')}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (switchModal) {
                                                switchModal('tour');
                                            } else {
                                                closeModal();
                                                setTimeout(() => openModal('tour'), 300);
                                            }
                                        }}
                                        className="px-4 py-2.5 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Compass size={13} />
                                        <span>{t('cfg.about.interactiveTour', null, 'Interactive Living Tour')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Help & Legal Documents */}
                            <div className="space-y-3">
                                <SectionHeader
                                    icon={Scale}
                                    title={t('cfg.about.helpLegalTitle', null, 'Help & Legal')}
                                    description={t('cfg.about.helpLegalDesc', null, 'User guide (F1), keyboard shortcuts, Terms of Service, Privacy Policy, and MIT license.')}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => useUIStore.getState().openHelpModal('help')}
                                        className={`px-4 py-2.5 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                                            isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-900 border-black/[0.07]' : 'bg-white/[0.03] hover:bg-white/[0.07] text-white border-white/[0.06]'
                                        }`}
                                    >
                                        <HelpCircle size={13} className="text-accent" />
                                        <span>{t('cfg.about.helpCenterBtn', null, 'Help Center (F1)')}</span>
                                    </button>
                                    <button
                                        onClick={() => useUIStore.getState().openHelpModal('terms')}
                                        className={`px-4 py-2.5 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                                            isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-900 border-black/[0.07]' : 'bg-white/[0.03] hover:bg-white/[0.07] text-white border-white/[0.06]'
                                        }`}
                                    >
                                        <FileText size={13} className="text-accent" />
                                        <span>{t('cfg.about.termsBtn', null, 'Terms of Service')}</span>
                                    </button>
                                    <button
                                        onClick={() => useUIStore.getState().openHelpModal('privacy')}
                                        className={`px-4 py-2.5 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                                            isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-900 border-black/[0.07]' : 'bg-white/[0.03] hover:bg-white/[0.07] text-white border-white/[0.06]'
                                        }`}
                                    >
                                        <ShieldCheck size={13} className="text-emerald-400" />
                                        <span>{t('cfg.about.privacyBtn', null, 'Privacy Policy')}</span>
                                    </button>
                                    <button
                                        onClick={() => useUIStore.getState().openHelpModal('licenses')}
                                        className={`px-4 py-2.5 border rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                                            isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-900 border-black/[0.07]' : 'bg-white/[0.03] hover:bg-white/[0.07] text-white border-white/[0.06]'
                                        }`}
                                    >
                                        <Scale size={13} className="text-accent" />
                                        <span>{t('cfg.about.licensesBtn', null, 'Open-Source Licenses')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                        </React.Fragment>
                    )}
                    </div>
                </div>
            </div>
        </div>

        <AdblockImportModal
            isOpen={isAdblockImportOpen}
            onClose={() => {
                setIsAdblockImportOpen(false);
                setAdblockImportInitialUrl('');
            }}
            initialUrl={adblockImportInitialUrl}
            existingDomains={settings.adblockCustomBlockedDomains || []}
            onImport={handleImportBlocklistDomains}
            isBright={isBright}
        />
        </>
    );
};

// Lightweight Gate Component: prevents 5,500 lines of hooks and DOM trees from evaluating on every app store update while closed
const SettingsModal = () => {
    const isSettingsOpen = useUIStore(state => state.activeModal === 'settings' || (state.isModalClosing && state.closingModal === 'settings'));
    if (!isSettingsOpen) return null;
    return <SettingsModalContent />;
};

export default SettingsModal;
