import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
    Palette, Shield, Cpu, ShieldAlert, Search, Download, X, 
    ShieldCheck, Cookie, Lock, Trash2, RotateCcw, Flag, Info, History,
    Key, Bell, RefreshCw, Layers, CheckCircle2, Sparkles, 
    Eye, Zap, Volume2, Globe, Sliders, Laptop, Maximize2, Minimize2, Monitor, SlidersHorizontal, Square,
    UploadCloud, Compass, ExternalLink, Plus, Feather, GaugeCircle, Rocket, BatteryCharging, Activity,
    Image as ImageIcon, Upload, Link as LinkIcon, Sun, Moon, XSquare, Check, Edit2, Server, Wifi, AlertCircle,
    Type, Keyboard, VolumeX, ZoomIn, Filter, Minus, GitPullRequest, GitBranch,
    ArrowLeftRight, ListOrdered, User, Briefcase, Code, Bookmark, Coffee, Folder,
    Terminal, Heart, ChevronUp, ChevronDown, Ghost, AlertTriangle, GripVertical, Copy,
    Layout, Sidebar
} from 'lucide-react';
import { EXPERIENCE_PRESETS, applyExperiencePreset, getSavedPresetId, getPresetIcon } from '../../utils/experiencePresets';

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
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import useTabStore from '../../store/useTabStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import useSyncStore from '../../store/useSyncStore';
import useTorStore from '../../store/useTorStore';
import useVaultStore from '../../store/useVaultStore';
import AIEngineSettings from '../settings/AIEngineSettings';
import { getAllBangs } from '../../utils/searchBangs';
import { DOH_PROVIDERS, DNS_MODES, formatCustomDohUrl, isValidDohUrl } from '../../utils/dnsProviders';
import { PRESET_SEARCH_ENGINES, getAllSearchEngines, isValidSearchUrlTemplate } from '../../utils/searchEngines';
import CustomSelect from '../common/CustomSelect';
import qbrowseLogo from '../../assets/icon.png';

// Helper Card Component for Unified Styling (Top-level to preserve DOM instances and CSS transitions)
const SettingCard = ({ icon: Icon, title, description, badge, children }) => {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    return (
        <div className={`flex items-center justify-between p-3 px-3.5 rounded-xl transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-md ${
            isBright 
                ? 'bg-white/75 hover:bg-white/95 border border-black/[0.08] hover:border-black/[0.14] shadow-[0_2px_12px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)]' 
                : 'bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.04] hover:border-white/[0.10]'
        }`}>
            <div className="flex items-center gap-3 min-w-0 pr-4">
                {Icon && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
                        isBright 
                            ? 'bg-black/[0.04] text-accent border border-black/[0.06] group-hover:border-accent/40' 
                            : 'bg-white/[0.03] text-accent/80 border border-white/[0.05] group-hover:border-accent/25 group-hover:text-accent'
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
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                isBright
                                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}>
                                {badge}
                            </span>
                        )}
                    </div>
                    {description && <p className={`text-[11px] mt-0.5 leading-snug ${
                        isBright ? 'text-zinc-500' : 'text-zinc-400'
                    }`}>{description}</p>}
                </div>
            </div>
            <div className="flex-shrink-0">
                {children}
            </div>
        </div>
    );
};

// Helper Toggle Switch Component (Top-level to preserve DOM instances and CSS transitions)
const SettingToggle = ({ isChecked, onToggle }) => {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    return (
        <button 
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (onToggle) onToggle();
            }} 
            className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 cursor-pointer ${
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
const SectionHeader = ({ icon: Icon, title, description, badge, action }) => {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    return (
        <div className="flex items-center justify-between gap-3 pt-2 pb-1">
            <div className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
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
                                    ? 'bg-black/5 text-zinc-600 border-black/10' 
                                    : 'bg-accent/10 text-accent border-accent/25'
                            }`}>
                                {badge}
                            </span>
                        )}
                    </div>
                    {description && (
                        <p className={`text-[11px] mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
};

// Spaces-Style Sliding Pill Switcher Helper Component (matches Sidebar.jsx & TabMap.jsx)
const SlidingPillSwitcher = ({ options = [], value, onChange, isBright: isBrightProp, size = 'md' }) => {
    const [hoveredId, setHoveredId] = useState(null);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = isBrightProp !== undefined ? isBrightProp : (theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor');

    const activeIndex = Math.max(0, options.findIndex(o => o.id === value));
    const hoveredIndex = hoveredId !== null ? options.findIndex(o => o.id === hoveredId) : -1;
    const count = options.length || 1;

    const padding = size === 'sm' ? 'p-0.5' : 'p-1';
    const itemPy = size === 'sm' ? 'py-1' : size === 'lg' ? 'py-2' : 'py-1.5';
    const itemPx = size === 'sm' ? 'px-2' : 'px-3';
    const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

    return (
        <div 
            className={`relative grid items-center ${padding} rounded-full border backdrop-blur-xl transition-colors duration-200 ${
                isBright ? 'bg-black/[0.04] border-black/[0.08]' : 'bg-black/40 border-white/[0.07]'
            }`}
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
            onMouseLeave={() => setHoveredId(null)}
        >
            {/* Subtle Hover Preview Pill */}
            {hoveredIndex >= 0 && hoveredIndex !== activeIndex && (
                <div 
                    className="absolute top-1 bottom-1 left-1 rounded-full transition-all duration-200 pointer-events-none"
                    style={{
                        width: `calc((100% - 8px) / ${count})`,
                        transform: `translateX(${hoveredIndex * 100}%)`,
                        backgroundColor: isBright ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)'
                    }}
                />
            )}

            {/* Signature Liquid Glass Sliding Pill */}
            <div 
                className="absolute top-1 bottom-1 left-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
                style={{
                    width: `calc((100% - 8px) / ${count})`,
                    transform: `translateX(${activeIndex * 100}%)`,
                    backgroundColor: isBright ? '#ffffff' : 'var(--accent-15, rgba(212, 188, 148, 0.16))',
                    border: isBright ? '1px solid rgba(0,0,0,0.08)' : '1px solid var(--accent-30, rgba(212, 188, 148, 0.4))',
                    boxShadow: isBright 
                        ? '0 2px 8px rgba(0,0,0,0.08)' 
                        : '0 2px 10px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                }}
            />

            {/* Option Buttons */}
            {options.map((opt) => {
                const isActive = opt.id === value;
                const Icon = opt.icon;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        onMouseEnter={() => setHoveredId(opt.id)}
                        className={`relative z-10 flex items-center justify-center gap-1.5 ${itemPy} ${itemPx} ${textSize} font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer select-none truncate outline-none ${
                            isActive
                                ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/60 hover:text-white')
                        }`}
                        title={opt.title || opt.desc || opt.label}
                    >
                        {Icon && <Icon size={size === 'sm' ? 11 : 13} className={isActive ? (isBright ? 'text-zinc-950' : 'text-accent') : 'opacity-60'} />}
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                isActive 
                                    ? (isBright ? 'bg-black/10 text-zinc-900' : 'bg-accent/25 text-accent') 
                                    : (isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-white/50')
                            }`}>
                                {opt.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

const SettingsModal = () => {
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
        isGlassEnabled, 
        setIsGlassEnabled,
        isSwipeEnabled, 
        setIsSwipeEnabled,
        settings, 
        toggleSetting,
        setSettingValue,
        accentColor, 
        setAccentColor,
        darkExclusions,
        setDarkExclusions,
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
        activePresetId: storeActivePresetId,
        setActivePresetId: setStoreActivePresetId,
        setSidebarPosition,
        setTopBarPosition,
        setToolHubPosition
    } = useUIStore();

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const customSpaceTabs = useTabStore(state => state.customSpaceTabs) || {};
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    // Spatial Positioning Controls
    const sidebarPosition = settings?.sidebarPosition || 'left';
    const topBarPosition = settings?.topBarPosition || 'top';
    const toolHubPosition = settings?.toolHubPosition || (sidebarPosition === 'left' ? 'right' : 'left');

    const openStudio = () => {
        if (switchModal) switchModal('presetStudio');
        else openModal('presetStudio');
    };

    const handleSetSidebarPosition = (pos) => {
        setSidebarPosition?.(pos);
        showToast?.(`Sidebar positioned on ${pos}`);
    };

    const handleSetTopBarPosition = (pos) => {
        setTopBarPosition?.(pos);
        showToast?.(`Top Bar positioned on ${pos}`);
    };

    const handleSetToolHubPosition = (pos) => {
        setToolHubPosition?.(pos);
        if (sidebarPosition === pos) {
            const opposite = pos === 'right' ? 'left' : 'right';
            setSidebarPosition?.(opposite);
            showToast?.(`Moved Sidebar to ${opposite} to avoid collision with Tool Hub`);
        } else {
            showToast?.(`Tool Hub positioned on ${pos}`);
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
    const [deletingSpace, setDeletingSpace] = useState(null);
    const [draggedSpaceIdx, setDraggedSpaceIdx] = useState(null);
    const [dragOverSpaceIdx, setDragOverSpaceIdx] = useState(null);
    const [activePresetId, setActivePresetId] = useState(getSavedPresetId);

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

            if (el && prevTop !== undefined && newTop !== undefined && prevTop !== newTop) {
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
        const clean = adblockAllowlistInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!clean) return;
        const current = settings?.adblockAllowlist || [];
        if (current.includes(clean)) {
            showToast(`${clean} is already in trusted sites`);
            return;
        }
        setSettingValue('adblockAllowlist', [...current, clean]);
        setAdblockAllowlistInput('');
        showToast(`Added ${clean} to trusted sites`);
    };

    const handleRemoveAllowlist = (domain) => {
        const current = settings?.adblockAllowlist || [];
        setSettingValue('adblockAllowlist', current.filter(d => d !== domain));
        showToast(`Removed ${domain} from trusted sites`);
    };

    const handleAddBlocklist = (e) => {
        if (e) e.preventDefault();
        const clean = adblockBlocklistInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!clean) return;
        const current = settings?.adblockCustomBlockedDomains || [];
        if (current.includes(clean)) {
            showToast(`${clean} is already in custom blocked domains`);
            return;
        }
        setSettingValue('adblockCustomBlockedDomains', [...current, clean]);
        setAdblockBlocklistInput('');
        showToast(`Added ${clean} to custom blocklist`);
    };

    const handleRemoveBlocklist = (domain) => {
        const current = settings?.adblockCustomBlockedDomains || [];
        setSettingValue('adblockCustomBlockedDomains', current.filter(d => d !== domain));
        showToast(`Removed ${domain} from custom blocklist`);
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
                    showToast(`DNS server online (${res.latency}ms latency)`);
                } else {
                    showToast(`DNS test failed: ${res?.error || 'Unreachable'}`);
                }
            } else {
                setDnsTestStatus({ ok: true, latency: 18, server: target || 'default' });
                showToast('DNS verified online');
            }
        } catch (err) {
            setDnsTestStatus({ ok: false, error: err.message });
            showToast('DNS test error');
        } finally {
            setIsTestingDns(false);
        }
    };

    const handleSaveSearchEngine = () => {
        const cleanName = engineNameInput.trim();
        const cleanKeyword = engineKeywordInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const cleanUrl = engineUrlInput.trim();

        if (!cleanName) {
            showToast('Please enter an engine name');
            return;
        }
        if (!cleanUrl || !isValidSearchUrlTemplate(cleanUrl)) {
            showToast('Please enter a valid URL template (e.g. https://example.com/search?q=%s)');
            return;
        }

        if (editingEngineId) {
            updateCustomSearchEngine(editingEngineId, {
                name: cleanName,
                keyword: cleanKeyword || cleanName.toLowerCase(),
                url: cleanUrl,
                color: engineColorInput
            });
            showToast(`Search engine "${cleanName}" updated`);
        } else {
            addCustomSearchEngine({
                name: cleanName,
                keyword: cleanKeyword || cleanName.toLowerCase(),
                url: cleanUrl,
                color: engineColorInput
            });
            showToast(`Custom search engine "${cleanName}" added`);
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
    const currentAppVersion = updateData?.currentVersion || '1.3.7';
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
                const ver = data.currentVersion || data.version || '1.3.7';
                showToast(`QBrowse is up to date! (v${String(ver).replace(/^v/i, '')})`);
            } else if (data.status === 'available') {
                const nextVer = String(data.latestVersion || data.version || '').replace(/^v/i, '');
                showToast(`New GitHub Release found: v${nextVer}! Downloading update...`);
            } else if (data.status === 'downloaded') {
                const nextVer = String(data.latestVersion || data.version || '').replace(/^v/i, '');
                showToast(`Update v${nextVer} ready! Click Restart & Update to apply.`);
            } else if (data.status === 'error' && !data.silent) {
                showToast(`Update notice: ${data.message || 'Check failed'}`);
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

    const [wallpaperUrlInput, setWallpaperUrlInput] = useState('');
    const [isImportingUrl, setIsImportingUrl] = useState(false);
    const [isImportingFile, setIsImportingFile] = useState(false);

    const handleImportWallpaperFile = async () => {
        if (!window.electronAPI?.importWallpaperFile) {
            showToast('File import is only available in the desktop app');
            return;
        }
        setIsImportingFile(true);
        try {
            const res = await window.electronAPI.importWallpaperFile();
            if (res?.success) {
                setCustomWallpaper(res.protocolUrl, 'file');
                showToast('Custom wallpaper applied!');
            } else if (res?.error && res.error !== 'Cancelled') {
                showToast(res.error);
            }
        } catch (err) {
            showToast(err.message || 'Failed to import wallpaper');
        } finally {
            setIsImportingFile(false);
        }
    };

    const handleImportWallpaperUrl = async (e) => {
        if (e) e.preventDefault();
        const url = wallpaperUrlInput.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            showToast('Please enter a valid HTTP or HTTPS image URL');
            return;
        }
        setIsImportingUrl(true);
        try {
            if (window.electronAPI?.importWallpaperUrl) {
                const res = await window.electronAPI.importWallpaperUrl(url);
                if (res?.success) {
                    setCustomWallpaper(res.protocolUrl, 'url', url);
                    setWallpaperUrlInput('');
                    showToast('Web wallpaper cached and applied!');
                } else {
                    showToast(res?.error || 'Failed to download wallpaper');
                }
            } else {
                setCustomWallpaper(url, 'url', url);
                setWallpaperUrlInput('');
                showToast('Wallpaper applied!');
            }
        } catch (err) {
            showToast(err.message || 'Failed to import wallpaper');
        } finally {
            setIsImportingUrl(false);
        }
    };

    const handleResetWallpaper = async () => {
        if (window.electronAPI?.resetWallpaper) {
            await window.electronAPI.resetWallpaper();
        }
        resetCustomWallpaper();
        showToast('Wallpaper reset to default stock');
    };

    const [localDarkExclusions, setLocalDarkExclusions] = useState(() => (darkExclusions || []).join('\n'));

    useEffect(() => {
        if (activeModal === 'settings') {
            setLocalDarkExclusions((darkExclusions || []).join('\n'));
        }
    }, [activeModal]);

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
                    showToast('QBrowse set as default browser!');
                } else {
                    showToast('Opening Windows Default Apps. Click "Set default" for QBrowse.');
                    let attempts = 0;
                    const pollTimer = setInterval(async () => {
                        attempts++;
                        if (window.electronAPI && window.electronAPI.checkDefaultBrowser) {
                            try {
                                const check = await window.electronAPI.checkDefaultBrowser({ force: true });
                                if (check && check.isDefault) {
                                    setIsDefaultBrowser(true);
                                    clearInterval(pollTimer);
                                    showToast('QBrowse is now your default browser!');
                                }
                            } catch (_) {}
                        }
                        if (attempts >= 14) clearInterval(pollTimer);
                    }, 1500);
                }
            } catch (_) {
                showToast('Failed to set default browser.');
            }
        }
    };

    const handleOpenDefaultAppsSettings = () => {
        if (window.electronAPI && window.electronAPI.openDefaultAppsSettings) {
            window.electronAPI.openDefaultAppsSettings();
            showToast('Opening system default apps settings...');
        }
    };

    const handleToggleStartupCheck = () => {
        const next = !checkDefaultOnStartup;
        setCheckDefaultOnStartup(next);
        if (next) {
            localStorage.removeItem('qbrowse_dismiss_default_browser');
            showToast('Will check default browser on startup.');
        } else {
            localStorage.setItem('qbrowse_dismiss_default_browser', 'true');
            showToast('Startup default browser check disabled.');
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
        if (settingsTab === 'cookies' && window.electronAPI && window.electronAPI.getAllSitePermissions) {
            window.electronAPI.getAllSitePermissions().then(perms => {
                setAllPermissions(perms || {});
            }).catch(() => {});
        }
    }, [settingsTab]);

    const handleRemoveDomainRules = async (domain) => {
        if (window.electronAPI && window.electronAPI.resetSitePermissions) {
            await window.electronAPI.resetSitePermissions(domain);
            setAllPermissions(prev => {
                const next = { ...prev };
                delete next[domain];
                return next;
            });
            showToast(`Cleared permission overrides for ${domain}`);
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
            showToast('Maximum of 8 workspaces reached');
            return;
        }
        const cleanName = newSpaceName.trim();
        if (!cleanName) {
            showToast('Please enter a workspace name');
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
        showToast(`Moved "${movedItem.name}" to position ${targetIdx + 1}`);
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

    const handleResetAllSettings = () => {
        localStorage.removeItem('qbrowse_settings');
        localStorage.removeItem('qbrowse_theme');
        localStorage.removeItem('qbrowse_isForceDark');
        localStorage.removeItem('qbrowse_dark_exclusions');
        localStorage.removeItem('qbrowse_settings_updated_at');
        useUIStore.getState().resetAllSettings?.();
        setTheme('dark');
        setIsForceDark(false);
        setIsGlassEnabled(true);
        setIsSwipeEnabled(true);
        setAccentColor('#d4bc94');
        showToast('All QBrowse settings restored to factory defaults');
    };

    const navTabs = [
        { id: 'appearance', label: 'Appearance & Themes', icon: Palette, color: 'text-purple-400', category: 'Preferences' },
        { id: 'layout', label: 'Layout & Chrome', icon: Layout, color: 'text-amber-400', category: 'Preferences' },
        { id: 'spaces', label: 'Workspaces', icon: Layers, color: 'text-indigo-400', category: 'Preferences' },
        { id: 'accessibility', label: 'Accessibility', icon: Eye, color: 'text-amber-400', category: 'Preferences' },
        { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: 'text-emerald-400', category: 'Preferences' },
        { id: 'cookies', label: 'Cookies & Permissions', icon: Cookie, color: 'text-amber-400', category: 'Preferences' },
        { id: 'search', label: 'Search & Omnibox', icon: Search, color: 'text-sky-400', category: 'Preferences' },
        { id: 'downloads', label: 'Downloads & Media', icon: Download, color: 'text-blue-400', category: 'Preferences' },
        { id: 'workmode', label: 'Work Mode & GitHub', icon: GitPullRequest, color: 'text-emerald-400', category: 'Preferences' },
        { id: 'ai', label: 'AI & llama.cpp Engine', icon: Sparkles, color: 'text-violet-400', category: 'Advanced' },
        { id: 'engine', label: 'Engine & Performance', icon: Cpu, color: 'text-rose-400', category: 'Advanced' },
        { id: 'adblock', label: 'Native AdBlocker', icon: ShieldAlert, color: 'text-emerald-400', category: 'Advanced' },
        { id: 'about', label: 'About & System Info', icon: Info, color: 'text-cyan-400', category: 'System' }
    ];

    const filteredNavTabs = navTabs.filter(t => 
        t.label.toLowerCase().includes(searchFilter.toLowerCase()) || 
        t.category.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'settings';
    if (activeModal !== 'settings' && !isClosingThis) return null;

    return (
        <div 
            id="settings-modal"
            className={`fixed inset-0 z-[200] flex font-sans w-full h-full overflow-hidden ${
                isBright 
                    ? 'bg-zinc-100/95 text-zinc-900' 
                    : 'bg-[#090a0f]/95 text-white'
            } backdrop-blur-3xl ${isModalClosing ? 'animate-settings-sheet-out' : 'animate-settings-sheet'}`} 
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        >
            {/* LEFT NAVIGATION SIDEBAR */}
            <div className={`w-64 border-r flex flex-col flex-shrink-0 h-full ${
                isBright 
                    ? 'bg-black/[0.02] border-black/10' 
                    : 'bg-white/[0.015] border-white/[0.06]'
            }`}>
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
                            Settings
                        </h2>
                        <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                            isBright ? 'bg-black/5 text-zinc-600 border-black/10' : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
                        }`}>v{String(currentAppVersion).replace(/^v/i, '')}</span>
                    </div>

                    {/* Live Search Input */}
                    <div className="relative">
                        <Search size={12} className={`absolute left-2.5 top-2 ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`} />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Search settings..."
                            className={`w-full rounded-lg py-1 pl-7 pr-2.5 text-xs outline-none focus:border-accent/40 transition-colors font-mono border ${
                                isBright 
                                    ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400' 
                                    : 'bg-white/[0.03] border-white/[0.06] text-white placeholder-zinc-500'
                            }`}
                        />
                        {searchFilter && (
                            <button onClick={() => setSearchFilter('')} className={`absolute right-2 top-1.5 ${isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-400 hover:text-white'}`}>
                                <X size={11} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto hide-scroll">
                    {filteredNavTabs.map((tab) => {
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
                    })}
                </div>

                <div className={`p-3 border-t ${isBright ? 'border-black/10' : 'border-white/[0.06]'}`}>
                    <button 
                        onClick={handleResetAllSettings}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                            isBright 
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                : 'bg-red-500/10 hover:bg-red-500/15 text-red-400 border-red-500/20'
                        }`}
                    >
                        <RotateCcw size={12} /> Reset Defaults
                    </button>
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
                    title="Close Settings (Esc)"
                >
                    <X size={16} className="pointer-events-none transition-transform duration-200 group-hover:rotate-90" />
                </button>

                {/* Scrollable Content Body */}
                <div className="flex-1 p-6 md:p-10 lg:px-12 overflow-y-auto h-full">
                    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto pb-16">
                    {/* TAB 1: APPEARANCE & THEMES */}
                    {settingsTab === 'appearance' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Appearance &amp; Themes</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Customize visual themes, browsing presets, wallpapers, and glassmorphism physics.
                                </p>
                            </div>

                            {/* Browsing Experience Presets */}
                                    <div className={`p-5 rounded-2xl border space-y-3.5 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.06]' : 'bg-white/[0.025] border-white/[0.05]'
                                    }`}>
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                                <span className="text-xs font-bold uppercase text-accent tracking-wider block">
                                                    Browsing Presets & Layouts
                                                </span>
                                                <p className={`text-[11px] mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    Quick configurations for workspaces, privacy shields, and aesthetics.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={openStudio}
                                                className="text-xs px-3 py-1.5 rounded-xl border border-accent/40 bg-accent text-zinc-950 font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 hover:brightness-105 shadow-sm"
                                            >
                                                <Sliders size={13} strokeWidth={2.4} />
                                                <span>Open Studio</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {[...EXPERIENCE_PRESETS, ...(customPresets || [])].map((p) => {
                                                const PresetIcon = getPresetIcon(p.icon);
                                                const isSelected = (storeActivePresetId || activePresetId) === p.id;

                                                return (
                                                    <div
                                                        key={p.id}
                                                        className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between group ${
                                                            isSelected
                                                                ? (isBright ? 'bg-accent/15 border-accent text-zinc-950 shadow-sm' : 'bg-accent/15 border-accent text-white shadow-sm')
                                                                : (isBright ? 'bg-white/80 border-black/[0.06] hover:border-black/20 text-zinc-800' : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 text-zinc-200')
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                applyExperiencePreset(p, {
                                                                    uiStore: useUIStore.getState(),
                                                                    tabStore: useTabStore.getState(),
                                                                    showToast
                                                                });
                                                                setActivePresetId(p.id);
                                                                setStoreActivePresetId?.(p.id);
                                                            }}
                                                            className="w-full text-left flex items-start gap-3 cursor-pointer outline-none active:scale-[0.99]"
                                                        >
                                                            <div 
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5"
                                                                style={{
                                                                    backgroundColor: `${p.accentColor}18`,
                                                                    borderColor: `${p.accentColor}40`,
                                                                    color: p.accentColor
                                                                }}
                                                            >
                                                                <PresetIcon size={15} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <span className="text-xs font-bold truncate">{p.name}</span>
                                                                        {p.isCustom ? (
                                                                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                                                Custom
                                                                            </span>
                                                                        ) : p.badge ? (
                                                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-400 border border-white/10">
                                                                                {p.badge}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                    <span className="text-[10px] font-mono opacity-60 shrink-0">
                                                                        {p.spacesSummary}
                                                                    </span>
                                                                </div>
                                                                <p className={`text-[10.5px] mt-0.5 line-clamp-1 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                                    {p.tagline}
                                                                </p>
                                                            </div>
                                                        </button>

                                                        {/* Action Bar on hover/footer */}
                                                        <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1 text-[10px]">
                                                            <span className={`font-mono truncate ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                {p.layoutTag || `${p.topBarPosition === 'bottom' ? 'Bottom Bar' : 'Top Bar'} · ${p.sidebarPosition === 'right' ? 'Right Sidebar' : 'Left Sidebar'}`}
                                                            </span>

                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        duplicatePreset(p.id);
                                                                    }}
                                                                    title="Duplicate Preset"
                                                                    className={`p-1 rounded border transition cursor-pointer ${
                                                                        isBright ? 'border-black/10 hover:bg-black/5 text-zinc-600' : 'border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <Copy size={10} />
                                                                </button>

                                                                {p.isCustom && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            deleteCustomPreset(p.id);
                                                                        }}
                                                                        title="Delete Custom Preset"
                                                                        className="p-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                                                    >
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Magic Accent Color */}
                                    <div className={`p-5 rounded-2xl border space-y-4 ${
                                        isBright ? 'bg-black/[0.02] border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.05]'
                                    }`}>
                                        <span className="text-xs font-bold uppercase text-accent tracking-wider block">Magic Accent Color</span>
                                        <div className="flex gap-3 items-center flex-wrap">
                                            {[
                                                { hex: '#d4bc94', name: 'Sand' },
                                                { hex: '#3b82f6', name: 'Ocean' },
                                                { hex: '#10b981', name: 'Emerald' },
                                                { hex: '#8b5cf6', name: 'Amethyst' },
                                                { hex: '#f43f5e', name: 'Rose' },
                                                { hex: '#f97316', name: 'Sunset' },
                                                { hex: '#06b6d4', name: 'Cyber' }
                                            ].map((c) => (
                                                <button
                                                    key={c.hex}
                                                    onClick={() => setAccentColor(c.hex)}
                                                    className={`w-8 h-8 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${accentColor === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110' : ''}`}
                                                    style={{ backgroundColor: c.hex }}
                                                    title={c.name}
                                                >
                                                    {accentColor === c.hex && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </button>
                                            ))}
                                            <div className="w-px h-6 bg-white/20 mx-1"></div>

                                            <div className="relative flex items-center bg-black/40 border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-accent">
                                                <div className="pl-3 pr-2 py-2 border-r border-white/[0.06]">
                                                    <Palette size={14} className="text-white/40" />
                                                </div>
                                                <span className="pl-2 text-xs text-white/40 font-mono">#</span>
                                                <input
                                                    type="text"
                                                    value={accentColor.replace('#', '')}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                                                        if (val.length <= 6) setAccentColor('#' + val);
                                                    }}
                                                    className="w-16 bg-transparent border-none text-xs text-white font-mono outline-none py-2 uppercase"
                                                    maxLength={6}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-white/40">Selecting a color rewrites all glass highlights, shadows, and active states instantly.</p>
                                    </div>

                                    {/* Browser Interface Theme Card */}
                                    <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.05] rounded-2xl space-y-3 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-sm">
                                                    {theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">Browser Interface Theme</p>
                                                    <p className="text-xs text-white/40 mt-0.5">Switch between dark obsidian and bright frosted chrome interface.</p>
                                                </div>
                                            </div>
                                            <div className={`relative flex p-1 rounded-full border shadow-xs min-w-[200px] ${isBright ? 'bg-black/[0.03] border-black/[0.05]' : 'bg-[#0c0d14]/78 border-white/[0.06]'}`}>
                                                <div 
                                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                        theme === 'dark'
                                                            ? (isBright ? 'bg-zinc-900 text-white shadow-xs' : 'bg-accent text-zinc-950 font-bold shadow-xs')
                                                            : (isBright ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'bg-accent text-zinc-950 font-bold shadow-xs')
                                                    }`}
                                                    style={{ 
                                                        transform: theme === 'light' ? 'translateX(100%)' : 'translateX(0)'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setTheme('dark')}
                                                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-full transition-colors duration-300 cursor-pointer ${
                                                        theme === 'dark'
                                                            ? (isBright ? 'text-white font-bold' : 'text-zinc-950 font-bold')
                                                            : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                                                    }`}
                                                >
                                                    <Moon size={13} className={theme === 'dark' ? 'fill-current' : ''} />
                                                    <span>Dark</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTheme('light')}
                                                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-full transition-colors duration-300 cursor-pointer ${
                                                        theme === 'light'
                                                            ? (isBright ? 'text-zinc-900 font-bold' : 'text-zinc-950 font-bold')
                                                            : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                                                    }`}
                                                >
                                                    <Sun size={13} className={theme === 'light' ? 'text-amber-600 fill-amber-500/20' : ''} />
                                                    <span>Bright</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Smart Dark Mode (Websites) Card */}
                                    <div className="p-5 bg-white/[0.025] border border-white/[0.05] rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-sm">
                                                    <Eye size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">Smart Dark Mode (Websites)</p>
                                                    <p className="text-xs text-white/40 mt-0.5">Smart luminosity engine inverts light websites while preserving native dark sites.</p>
                                                </div>
                                            </div>
                                            <SettingToggle isChecked={isForceDark} onToggle={() => setIsForceDark(!isForceDark)} />
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-xs text-white/50 mb-1.5 font-semibold">Excluded Domains (One per line):</p>
                                            <textarea
                                                value={localDarkExclusions}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLocalDarkExclusions(val);
                                                    const parsed = val.split('\n').map(s => s.trim()).filter(Boolean);
                                                    setDarkExclusions(parsed);
                                                }}
                                                onBlur={() => {
                                                    const cleaned = (localDarkExclusions || '').split('\n').map(s => s.trim()).filter(Boolean);
                                                    setDarkExclusions(cleaned);
                                                    setLocalDarkExclusions(cleaned.join('\n'));
                                                }}
                                                placeholder={"example.com\ngithub.com"}
                                                className="w-full h-24 bg-black/40 border border-white/[0.06] rounded-xl p-2.5 text-xs font-mono text-white/80 resize-none outline-none focus:border-accent transition-colors"
                                            />
                                        </div>
                                    </div>

                            {/* Window Background & Wallpaper */}
                                    <div className="p-5 bg-white/[0.025] border border-white/[0.05] rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center shadow-sm">
                                                    <ImageIcon size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">Window Background & Wallpaper</p>
                                                    <p className="text-xs text-white/40 mt-0.5">Customize the root window backdrop with a local image, web image URL, or animated GIF.</p>
                                                </div>
                                            </div>
                                            {customWallpaper && (
                                                <button
                                                    type="button"
                                                    onClick={handleResetWallpaper}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer hover:border-white/20"
                                                    title="Reset to default wallpaper"
                                                >
                                                    <RotateCcw size={12} />
                                                    <span>Reset to Default</span>
                                                </button>
                                            )}
                                        </div>

                                {/* Preview and Source Info */}
                                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                                            <div className="w-36 h-20 rounded-lg overflow-hidden relative border border-white/10 shadow-md flex-shrink-0 bg-black/60">
                                                <img 
                                                    src={customWallpaper || DEFAULT_STOCK_WALLPAPER} 
                                                    alt="Wallpaper preview" 
                                                    className="w-full h-full object-cover transition-all duration-300"
                                                    style={{
                                                        filter: `saturate(1.1) ${(blurWallpaper && wallpaperBlur > 0) ? `blur(${Math.min(12, wallpaperBlur * 0.3)}px)` : ''}`,
                                                        transform: (blurWallpaper && wallpaperBlur > 0) ? 'scale(1.08)' : 'scale(1)'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.src = DEFAULT_STOCK_WALLPAPER;
                                                    }}
                                                />
                                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0, 0, 0, ${wallpaperDimming / 100})` }} />
                                                
                                                <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center pointer-events-none">
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white/80 border border-white/10">
                                                        Preview
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-zinc-300">Active Source:</span>
                                                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                                                        !customWallpaper 
                                                            ? 'bg-white/5 border-white/10 text-white/60' 
                                                            : customWallpaperSource === 'file' 
                                                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                                                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                    }`}>
                                                        {!customWallpaper ? 'Default Stock' : customWallpaperSource === 'file' ? 'Local File' : 'Web URL'}
                                                    </span>
                                                    {customWallpaperSource === 'file' && (
                                                        <span className="text-[10px] text-zinc-500 italic">(Local only, skipped during cloud sync)</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-zinc-400 leading-relaxed truncate">
                                                    {!customWallpaper 
                                                        ? 'Default dynamic landscape wallpaper is active. Import your own photo or art to personalize your workspace.'
                                                        : customWallpaperSource === 'file'
                                                            ? 'Using an imported local image file stored safely in your application data directory.'
                                                            : `Loaded from web URL: ${customWallpaperOriginalUrl || customWallpaper}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Import Controls */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                            {/* Local File Import */}
                                            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                                                        <Upload size={13} className="text-accent" />
                                                        <span>Choose from Hard Drive</span>
                                                    </p>
                                                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                                                        Pick a JPG, PNG, WebP, or GIF from your PC. Automatically saved into app storage.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleImportWallpaperFile}
                                                    disabled={isImportingFile}
                                                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                                >
                                                    {isImportingFile ? (
                                                        <RefreshCw size={13} className="animate-spin text-accent" />
                                                    ) : (
                                                        <Upload size={13} />
                                                    )}
                                                    <span>{isImportingFile ? 'Importing...' : 'Browse Image File...'}</span>
                                                </button>
                                            </div>

                                            {/* Web URL Import */}
                                            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                                                        <LinkIcon size={13} className="text-accent" />
                                                        <span>Import from Web URL</span>
                                                    </p>
                                                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                                                        Paste any public image or GIF URL. Cached locally and synced across your devices.
                                                    </p>
                                                </div>
                                                <form onSubmit={handleImportWallpaperUrl} className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={wallpaperUrlInput}
                                                        onChange={(e) => setWallpaperUrlInput(e.target.value)}
                                                        placeholder="https://images.unsplash.com/..."
                                                        className="flex-1 min-w-0 bg-black/40 border border-white/[0.08] focus:border-accent rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/25 outline-none transition-colors"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={isImportingUrl || !wallpaperUrlInput.trim()}
                                                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-accent text-black hover:bg-accent/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                                    >
                                                        {isImportingUrl ? (
                                                            <RefreshCw size={12} className="animate-spin" />
                                                        ) : (
                                                            <span>Apply</span>
                                                        )}
                                                    </button>
                                                </form>
                                            </div>
                                        </div>

                                        {/* Dimming & Contrast Slider */}
                                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0 pr-4">
                                                <div className={`w-8 h-8 rounded-lg ${isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'} flex items-center justify-center flex-shrink-0`}>
                                                    <Sliders size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-medium text-xs ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>Backdrop Contrast Dimming</p>
                                                    <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'} mt-0.5 leading-snug`}>Adjust dark overlay to ensure text and tab readability over bright wallpapers.</p>
                                                </div>
                                            </div>
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
                                        </div>

                                        {/* Blur Background Wallpaper Toggle */}
                                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0 pr-4">
                                                <div className={`w-8 h-8 rounded-lg ${isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'} flex items-center justify-center flex-shrink-0`}>
                                                    <ImageIcon size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-medium text-xs ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>Blur Wallpaper Background</p>
                                                    <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'} mt-0.5 leading-snug`}>When disabled, the wallpaper stays crisp and sharp while UI panels retain frosted glass blur.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <SettingToggle 
                                                    isChecked={!!blurWallpaper} 
                                                    onToggle={() => toggleSetting('blurWallpaper')} 
                                                />
                                            </div>
                                        </div>

                                        {/* Liquid Glass Frosted Blur Slider */}
                                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0 pr-4">
                                                <div className={`w-8 h-8 rounded-lg ${isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'} flex items-center justify-center flex-shrink-0`}>
                                                    <Sparkles size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-medium text-xs ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>Liquid Glass UI Frosted Blur</p>
                                                    <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'} mt-0.5 leading-snug`}>Adjust frosted glass diffusion on UI surfaces (Sidebar, TopBar, and tab windows).</p>
                                                </div>
                                            </div>
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
                                        </div>
                                    </div>

                                    {/* Glass & Motion Physics */}
                                    <div className="space-y-3">
                                        <SectionHeader 
                                            icon={Sparkles} 
                                            title="Glass & Motion Physics" 
                                            description="Hardware-accelerated translucency, animations, and visual feedbacks." 
                                        />

                                        <SettingCard icon={Sliders} title="UI Transparency (Glassmorphism)" description="Disable backdrop-blur translucency for weaker GPUs.">
                                            <SettingToggle isChecked={isGlassEnabled} onToggle={() => setIsGlassEnabled(!isGlassEnabled)} />
                                        </SettingCard>

                                        <SettingCard icon={Maximize2} title="Space Swipe Animations" description="Physical screen swipe transitions when switching workspace tabs.">
                                            <SettingToggle isChecked={isSwipeEnabled} onToggle={() => setIsSwipeEnabled(!isSwipeEnabled)} />
                                        </SettingCard>

                                        <SettingCard icon={Sparkles} title="Active Tab Favicon Glow" description="Render a subtle glowing aura around active tab favicons.">
                                            <SettingToggle isChecked={!!settings.faviconGlow} onToggle={() => toggleSetting('faviconGlow')} />
                                        </SettingCard>

                                        <SettingCard icon={Layers} title="Visual Tab Switcher (Ctrl+Tab)" description="Show Windows-style card carousel overlay when pressing Ctrl+Tab. Disable for instant tab switching with zero overlay.">
                                            <SettingToggle isChecked={settings.visualTabSwitcher !== false} onToggle={() => toggleSetting('visualTabSwitcher')} />
                                        </SettingCard>
                                    </div>
                        </div>
                    )}

                    {/* TAB 2: LAYOUT & CHROME */}
                    {settingsTab === 'layout' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Layout &amp; Chrome</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Configure spatial dockings, window geometry, omnibox architecture, and toolbar controls.
                                </p>
                            </div>

                            {/* Spatial Positioning */}
                                    <div className="space-y-3">
                                        <SectionHeader 
                                            icon={Compass} 
                                            title="Spatial Positioning" 
                                            description="Dock primary bars, drawers, and vertical tabs across screen coordinates." 
                                        />

                                        {/* Sidebar Position */}
                                        <SettingCard 
                                            icon={Sidebar} 
                                            title="Sidebar Position" 
                                            description="Dock workspace navigation and vertical tabs on the left or right edge."
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
                                                    { id: 'left', label: 'Left' },
                                                    { id: 'right', label: 'Right' }
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
                                            title="Top Bar Position" 
                                            description="Position the omnibox address bar, navigation buttons, and tab controls."
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
                                                    { id: 'top', label: 'Top' },
                                                    { id: 'bottom', label: 'Bottom' }
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
                                            title="Tool Hub Drawer Position" 
                                            description="Side panel dock for extensions, downloads, QVault, and AI assistant."
                                            badge="Auto-Resolved Collision"
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
                                                    { id: 'left', label: 'Left' },
                                                    { id: 'right', label: 'Right' }
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
                                            Note: If docked on the same side as the Sidebar, the Sidebar will automatically adjust to the opposite side to prevent interface collision.
                                        </p>
                                    </div>

                                    {/* Preset Studio & Visual Architect Launch Banner */}
                                    <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                        isBright 
                                            ? 'bg-gradient-to-r from-accent/15 via-white/80 to-accent/10 border-accent/30 shadow-[0_2px_12px_rgba(0,0,0,0.03)]' 
                                            : 'bg-gradient-to-r from-accent/15 via-white/[0.03] to-purple-500/10 border-accent/25 shadow-lg'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                                                    isBright 
                                                        ? 'bg-white text-zinc-950 border-black/10' 
                                                        : 'bg-accent/20 text-accent border-accent/40 shadow-[0_0_15px_var(--accent-20)]'
                                                }`}>
                                                    <Sliders size={20} strokeWidth={2.2} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold tracking-tight">Visual Architect &amp; Preset Studio</h4>
                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                                                            Interactive Canvas
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs mt-0.5 max-w-xl ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                        Craft, preview, and arrange custom spatial architectures with drag-and-drop live preview, custom docking slots, and preset duplication.
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={openStudio}
                                                className="px-4 py-2 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer hover:brightness-105 active:scale-95 shadow-md shrink-0"
                                            >
                                                <Sliders size={14} strokeWidth={2.4} />
                                                <span>Launch Preset Studio</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Chrome Styling */}
                                    <div className="space-y-3">
                                        <SectionHeader 
                                            icon={Laptop} 
                                            title="Browser Chrome Geometry" 
                                            description="Window frame geometry, omnibox presentation, and system window controls." 
                                        />

                                        {/* 1. Window Frame Curvature */}
                                        <SettingCard 
                                            icon={Square} 
                                            title="Window Frame Curvature" 
                                            description="Adjust curvature across the main webview frame, sidebar container, topbar, and elements."
                                            badge="(Default: Organic 20px, Cohesive: Refined 12px, Sharp: Square 0px)"
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
                                                    { id: "default", label: "Default" },
                                                    { id: "cohesive", label: "Cohesive" },
                                                    { id: "square", label: "Sharp" }
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
                                            title="Omnibox Architecture" 
                                            description="Select the centered horizontal span and fluid focus expansion of the address bar."
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
                                                    { id: "capsule", label: "Capsule" },
                                                    { id: "wide", label: "Wide" },
                                                    { id: "minimal", label: "Minimal" }
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
                                            title="Tab Presentation" 
                                            description="Switch between liquid glass pills, high-density minimal rows, or rich card tiles."
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
                                                    { id: "pills", label: "Pills" },
                                                    { id: "compact", label: "Compact" },
                                                    { id: "cards", label: "Cards" }
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
                                            title="Window Controls Style" 
                                            description="Choose macOS traffic dots, clean native Windows icons, or stealth minimal glyphs."
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
                                                    { id: "minimal", label: "Minimal" }
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
                                    </div>

                                    {/* Toolbar & Controls */}
                                    <div className="space-y-3">
                                        <SectionHeader 
                                            icon={Sliders} 
                                            title="Toolbar & Controls" 
                                            description="Toolbar quick access icons and interaction behaviors." 
                                        />

                                        {/* Toolbar & Extensions Hub Quick Icons Card */}
                                        <div className={`p-5 rounded-2xl border space-y-3 transition-all duration-200 ${
                                            isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                                                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-accent/10 text-accent border border-accent/30'
                                                    }`}>
                                                        <SlidersHorizontal size={17} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">Toolbar &amp; Extension Hub Icons</p>
                                                        <p className="text-xs text-white/40 mt-0.5">Toggle quick-access buttons in the top bar. You can also right-click any icon in the toolbar to hide it.</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => useUIStore.getState().resetTopBarIcons()}
                                                    className="text-xs text-accent hover:underline cursor-pointer"
                                                >
                                                    Restore All
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2">
                                                {[
                                                    { id: 'splitview', label: 'Split View' },
                                                    { id: 'theme', label: 'Theme Toggle' },
                                                    { id: 'shield', label: 'QShield Tracker' },
                                                    { id: 'media', label: 'Media Player' },
                                                    { id: 'downloads', label: 'Downloads' },
                                                    { id: 'tor', label: 'Tor Network' },
                                                    { id: 'vault', label: 'QVault Passwords' }
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
                                                            <span className={`w-2 h-2 rounded-full transition-colors ${isItemVisible ? 'bg-accent shadow-[0_0_6px_var(--accent)]' : 'bg-white/20'}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <SettingCard icon={Monitor} title="UI Density & Scale" description="Adjust spacing, padding, and tab density across navigation controls and sidebars.">
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
                                                    { id: 'compact', label: 'Compact', icon: Minimize2 },
                                                    { id: 'comfortable', label: 'Comfortable', icon: Maximize2 }
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

                                        <SettingCard icon={ArrowLeftRight} title="Tab Switching Order (Ctrl+Tab)" description="Choose whether Ctrl+Tab navigates by most recently used tabs or in sequential sidebar order.">
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
                                                    { id: 'mru', label: 'Recently Used', icon: History },
                                                    { id: 'sidebar', label: 'Sidebar Order', icon: ListOrdered }
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

                                        <SettingCard icon={XSquare} title="Close Window on Last Tab (Ctrl+W)" description="Close the browser window when pressing Ctrl+W with no open tabs or pinned tabs.">
                                            <SettingToggle isChecked={settings.closeWindowOnLastTab !== false} onToggle={() => toggleSetting('closeWindowOnLastTab')} />
                                        </SettingCard>
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
                                            <Layers className="text-accent" size={22} /> Workspaces
                                        </h3>
                                        <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            Separate tab environments with independent history and GitHub Live tracking.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={spacesList.length >= 8 && !isCreatingSpace}
                                        onClick={() => {
                                            if (spacesList.length >= 8 && !isCreatingSpace) {
                                                showToast('Maximum of 8 workspaces reached');
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
                                        title={spacesList.length >= 8 && !isCreatingSpace ? 'Maximum of 8 workspaces reached' : 'Create new workspace'}
                                    >
                                        <Plus size={14} className={`transition-transform duration-300 ${isCreatingSpace ? 'rotate-45' : ''}`} />
                                        <span>{isCreatingSpace ? 'Cancel' : spacesList.length >= 8 ? 'Max 8 Reached' : 'New Workspace'}</span>
                                    </button>
                                </div>

                                {/* Create Space Form */}
                                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCreatingSpace ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                                    <div className="overflow-hidden min-h-0">
                                        <form 
                                            onSubmit={handleCreateSpace}
                                            className={`p-4 rounded-2xl border flex flex-col gap-4 my-2 ${
                                                isBright 
                                                    ? 'bg-white/80 border-black/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)]' 
                                                    : 'bg-white/[0.03] border-white/[0.08]'
                                            }`}
                                        >
                                            <div className="text-xs font-semibold tracking-wide text-zinc-300 dark:text-zinc-300">
                                                Create Workspace
                                            </div>

                                            {/* Name Input */}
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Workspace name (e.g. Work, Research, Dev)..."
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
                                                    Choose Icon
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
                                                                title={item.label}
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
                                                            Enable GitHub Live
                                                        </div>
                                                        <div className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                            Show open pull requests and notifications in the sidebar for this workspace.
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
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                                                >
                                                    <Plus size={14} /> Add Workspace
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                {/* Workspaces List Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className={`text-xs font-semibold uppercase tracking-wider ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            Active Workspaces ({spacesList.length} / 8)
                                        </h4>
                                        <span className={`text-[11px] ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                            Drag handle or rows to reorder
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {spacesList.map((sp, idx) => {
                                            const IconComponent = getSpaceIconComponent(sp.icon);
                                            const isPersonal = sp.id === 'personal';
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
                                                        if (dragOverSpaceIdx === idx) setDragOverSpaceIdx(null);
                                                    }}
                                                    onDrop={(e) => handleSpaceDrop(e, idx)}
                                                    onDragEnd={() => {
                                                        setDraggedSpaceIdx(null);
                                                        setDragOverSpaceIdx(null);
                                                    }}
                                                    className={`relative rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                        isIconPickerOpen ? 'z-40' : isDragOver ? 'z-30' : 'z-10'
                                                    } ${
                                                        isBeingDragged
                                                            ? 'opacity-35 scale-[0.98] border-dashed border-accent/60 bg-accent/5 shadow-none'
                                                            : isDragOver
                                                                ? 'scale-[1.01] -translate-y-1 ring-2 ring-accent/60 shadow-xl border-accent'
                                                                : (isBright 
                                                                    ? 'bg-white/75 hover:bg-white/95 border-black/[0.08] hover:border-black/[0.14] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-lg' 
                                                                    : 'bg-white/[0.025] hover:bg-white/[0.045] border-white/[0.05] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-lg')
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
                                                                title="Drag to reorder workspace"
                                                            >
                                                                <GripVertical size={14} />
                                                            </div>

                                                            {/* Icon button (Click to change icon) */}
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveIconPickerSpaceId(isIconPickerOpen ? null : sp.id)}
                                                                    title="Change workspace icon"
                                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer group active:scale-90 ${
                                                                        isBright 
                                                                            ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border border-black/[0.06]' 
                                                                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/[0.06]'
                                                                    }`}
                                                                >
                                                                    <IconComponent size={16} className="transition-transform duration-200 group-hover:scale-110" />
                                                                </button>

                                                                {/* Icon Popover Dropdown (Liquid glass styling matching context menu) */}
                                                                {isIconPickerOpen && (
                                                                    <>
                                                                        <div 
                                                                            className="fixed inset-0 z-40 bg-transparent cursor-default" 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveIconPickerSpaceId(null);
                                                                            }} 
                                                                        />
                                                                        <div 
                                                                            className={`absolute top-full left-0 mt-2 z-50 p-2.5 rounded-2xl border shadow-2xl select-none outline-none grid grid-cols-7 gap-1.5 w-64 animate-pop-in ${
                                                                                isBright 
                                                                                    ? 'border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.14),inset_0_1px_1px_rgba(255,255,255,0.85)]' 
                                                                                    : 'border-white/[0.10] text-white/95 shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.16)]'
                                                                            }`}
                                                                            style={{
                                                                                backgroundColor: isBright ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 20, 32, 0.58)',
                                                                                backdropFilter: isBright
                                                                                    ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                                                                                    : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)',
                                                                                WebkitBackdropFilter: isBright
                                                                                    ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                                                                                    : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)'
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
                                                                                            showToast('Workspace icon updated');
                                                                                        }}
                                                                                        title={ic.label}
                                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-115 active:scale-90 ${
                                                                                            isCur
                                                                                                ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                                                                                                : (isBright 
                                                                                                    ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' 
                                                                                                    : 'hover:bg-white/10 text-white/70 hover:text-white')
                                                                                        }`}
                                                                                    >
                                                                                        <Ic size={15} />
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </>
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
                                                                                isBright ? 'bg-white border-black/20 text-zinc-900' : 'bg-black/50 border-white/20 text-white'
                                                                            }`}
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveSpaceName(sp.id)}
                                                                            className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                                                            title="Save"
                                                                        >
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingSpaceId(null)}
                                                                            className="p-1 rounded-md text-zinc-400 hover:bg-white/5 cursor-pointer"
                                                                            title="Cancel"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 group/name">
                                                                        <span className={`text-sm font-medium truncate ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                                                            {sp.name}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditingSpaceId(sp.id);
                                                                                setEditingSpaceName(sp.name);
                                                                            }}
                                                                            title="Rename"
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
                                                                            <span className={isBright ? 'text-zinc-500' : 'text-zinc-400'}>Default</span>
                                                                            <span>•</span>
                                                                            <span>{tabCount} open {tabCount === 1 ? 'tab' : 'tabs'}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span>{tabCount} open {tabCount === 1 ? 'tab' : 'tabs'}</span>
                                                                        </>
                                                                    )}
                                                                    {sp.showGitHub && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="flex items-center gap-1 text-emerald-400">
                                                                                <GitPullRequest size={10} /> GitHub Live
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right: Controls (GitHub Live toggle, Reorder, Delete) */}
                                                        <div className="flex items-center gap-2 sm:gap-3">
                                                            {/* GitHub Live Toggle */}
                                                            <div className="flex items-center gap-2 pr-2.5 border-r border-black/10 dark:border-white/10">
                                                                <span className={`text-xs hidden sm:inline ${
                                                                    isBright ? 'text-zinc-600' : 'text-zinc-400'
                                                                }`}>
                                                                    GitHub Live
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
                                                                    title="Move Up"
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
                                                                    title="Move Down"
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
                                                                    title="Delete Workspace"
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
                                                                    Delete <strong>{sp.name}</strong>? Open tabs will move to <strong>Personal</strong>.
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeletingSpace(null)}
                                                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                                                                            isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 text-white/70'
                                                                        }`}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteSpace(sp.id)}
                                                                        className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition active:scale-95 shadow-sm cursor-pointer"
                                                                    >
                                                                        Delete
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
                                    isBright ? 'bg-black/[0.02] border-black/[0.06] text-zinc-600' : 'bg-white/[0.02] border-white/[0.05] text-zinc-400'
                                }`}>
                                    <Ghost size={16} className="text-accent shrink-0" />
                                    <p className="text-xs">
                                        <strong className={isBright ? 'text-zinc-800' : 'text-zinc-200'}>Private Browsing:</strong> Ghost and Tor modes run in RAM with zero disk persistence and can be launched directly from the sidebar.
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* TAB: ACCESSIBILITY (EU European Accessibility Act / EN 301 549 & WCAG 2.1 AA) */}
                    {settingsTab === 'accessibility' && (
                        <div className="animate-tab-fade space-y-6">
                            <div className="flex items-center justify-between flex-wrap gap-3 pr-14">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">Accessibility</h3>
                                    <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                        Customize visual contrast, dyslexia typography, vestibular comfort, and navigation aids.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        openReadAloud();
                                        showToast('Read Aloud assistant launched.');
                                    }}
                                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-accent text-zinc-950 font-bold hover:bg-accent-hover text-xs shadow-sm transition active:scale-95 cursor-pointer"
                                >
                                    <Volume2 size={14} />
                                    <span>Start Read Aloud</span>
                                    <span className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-mono">Alt+R</span>
                                </button>
                            </div>

                            {/* Section 1: Visual Contrast & Typography */}
                            <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-200 ${
                                isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                    }`}>
                                        <Eye size={15} />
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>Visual Contrast &amp; Typography</h4>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>High-contrast legibility, specialized typeface, minimum text sizing, and page scale.</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <SettingCard 
                                        icon={Eye} 
                                        title="High Contrast Mode" 
                                        description="Amplifies text luminance, defines stark contrast boundaries, and strips soft shadows across QBrowse chrome and web pages."
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11yHighContrast} 
                                            onToggle={() => toggleSetting('a11yHighContrast')} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Type} 
                                        title="Dyslexia-Friendly Font (OpenDyslexic)" 
                                        description="Applies gravity-weighted OpenDyslexic typography with increased letter spacing to combat letter flipping and improve reading comprehension."
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11yDyslexiaFont} 
                                            onToggle={() => toggleSetting('a11yDyslexiaFont')} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Sliders} 
                                        title="Minimum Text Size" 
                                        description="Enforces an absolute lower bound on font size so small captions and body text remain clearly readable."
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
                                                    {sz === 'default' ? 'Default' : sz}
                                                </button>
                                            ))}
                                        </div>
                                    </SettingCard>

                                    <SettingCard 
                                        icon={ZoomIn} 
                                        title="Default Page Zoom" 
                                        description="Base magnification scale applied across tabs. Standard baseline is 100%."
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
                                                    title="Reset zoom to 100%"
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
                                                    title="Zoom out"
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
                                                    title={(settings.a11yPageZoom || 100) !== 100 ? "Click to reset to 100%" : "Default scale (100%)"}
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
                                                    title="Zoom in"
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
                            </div>

                            {/* Section 2: Motion & Vestibular */}
                            <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-200 ${
                                isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                    }`}>
                                        <Zap size={15} />
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>Motion &amp; Vestibular Comfort</h4>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Protect against motion sickness and vestibular strain by suppressing rapid animations.</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <SettingCard 
                                        icon={Zap} 
                                        title="Force Reduced Motion" 
                                        badge={isSystemReducedMotion ? "Windows Animations: Off" : null}
                                        description={
                                            isSystemReducedMotion
                                                ? "Windows Accessibility animations are currently turned off. Browser transitions, Tab Map 3D tilt, and web animations are automatically suppressed."
                                                : "Disables browser chrome transitions, suppresses parallax scrolling, and instructs websites to halt decorative animations. Automatically syncs with Windows Animation Effects."
                                        }
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11yReducedMotion} 
                                            onToggle={() => toggleSetting('a11yReducedMotion')} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={VolumeX} 
                                        title="Suppress Media Autoplay" 
                                        description="Prevents background video elements and HTML5 audiovisual streams from auto-playing without explicit user initiation."
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11ySuppressAutoplay} 
                                            onToggle={() => toggleSetting('a11ySuppressAutoplay')} 
                                        />
                                    </SettingCard>
                                </div>
                            </div>

                            {/* Section 3: Keyboard & Motor Navigation */}
                            <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-200 ${
                                isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                    }`}>
                                        <Keyboard size={15} />
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>Keyboard Navigation &amp; Focus Indicators</h4>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Independent keyboard operation, high-visibility focus indicators, and text caret browsing.</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <SettingCard 
                                        icon={Keyboard} 
                                        title="Caret Browsing (Text Cursor Navigation)" 
                                        description="Place a moveable typing cursor on any web page to select text, scroll, and navigate purely via arrow keys. Press F7 at any time."
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">F7</span>
                                            <SettingToggle 
                                                isChecked={!!settings.a11yCaretBrowsing} 
                                                onToggle={() => toggleSetting('a11yCaretBrowsing')} 
                                            />
                                        </div>
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Sliders} 
                                        title="High-Visibility Keyboard Focus Rings" 
                                        description="Renders a high-contrast 3px glowing amber border around whichever link, button, or input currently holds keyboard focus."
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11yFocusRings} 
                                            onToggle={() => toggleSetting('a11yFocusRings')} 
                                        />
                                    </SettingCard>
                                </div>
                            </div>

                            {/* Section 4: Audio & Multimodal Reading */}
                            <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-200 ${
                                isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                    }`}>
                                        <Volume2 size={15} />
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>Auditory &amp; Reading Assistance</h4>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Text-to-speech engine, automatic video subtitles, and mono audio downmixing.</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <SettingCard 
                                        icon={Volume2} 
                                        title="Read Aloud Floating Assistant" 
                                        description="Launches the dedicated text-to-speech toolbar to read web articles, news, or selected text with synchronized speech."
                                    >
                                        <button
                                            onClick={() => {
                                                openReadAloud();
                                                showToast('Read Aloud assistant launched.');
                                            }}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition active:scale-95 flex items-center gap-2 cursor-pointer ${
                                                isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                                            }`}
                                        >
                                            <span>Launch Toolbar</span>
                                            <span className="text-[10px] font-mono opacity-50">Alt+R</span>
                                        </button>
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Sparkles} 
                                        title="Force Video Closed Captions (Subtitles)" 
                                        description="Automatically instructs HTML5 video players to activate native closed caption and subtitle text tracks by default."
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11yVideoCaptions} 
                                            onToggle={() => toggleSetting('a11yVideoCaptions')} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={VolumeX} 
                                        title="Mono Audio Downmix" 
                                        description="Combines left and right stereo audio channels into both ears to ensure no content is missed for users with unilateral hearing."
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.a11yMonoAudio} 
                                            onToggle={() => toggleSetting('a11yMonoAudio')} 
                                        />
                                    </SettingCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PRIVACY & SECURITY */}
                    {settingsTab === 'privacy' && (
                        <div className="animate-tab-fade space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Privacy & Security</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Manage encrypted DNS routing, network protection, process sandboxing, and private spaces.</p>
                            </div>

                            {/* 1. ENCRYPTED DNS & CUSTOM RESOLVER COMMAND CARD (AT VERY TOP!) */}
                            <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                isBright 
                                    ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' 
                                    : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                {/* Header Row */}
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            isBright 
                                                ? 'bg-black/[0.04] text-accent border border-black/[0.06]' 
                                                : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                        }`}>
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                Encrypted DNS (DNS over HTTPS)
                                            </h4>
                                            <p className={`text-xs mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                Route domain lookups through an encrypted HTTPS resolver to prevent ISP profiling and eavesdropping.
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
                                                ? 'Testing...' 
                                                : dnsTestStatus?.ok && dnsTestStatus.latency !== undefined 
                                                    ? `${dnsTestStatus.latency}ms • Online` 
                                                    : dnsTestStatus && !dnsTestStatus.ok
                                                        ? 'Offline • Retry'
                                                        : 'Test Connection'}
                                        </span>
                                    </button>
                                </div>

                                {/* Enforcement Mode Sliding Pill Switcher */}
                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                                        isBright ? 'text-zinc-500' : 'text-zinc-400'
                                    }`}>
                                        Enforcement Mode
                                    </label>
                                    <SlidingPillSwitcher
                                        options={[
                                            { id: 'automatic', label: 'Automatic' },
                                            { id: 'secure', label: 'Strict DoH' },
                                            { id: 'off', label: 'Off' }
                                        ]}
                                        value={settings.dohMode || 'automatic'}
                                        onChange={async (mode) => {
                                            await setDnsConfiguration({ mode });
                                            showToast(`DNS Mode: ${mode === 'secure' ? 'Strict DoH' : mode === 'off' ? 'Off' : 'Automatic'}`);
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
                                                Resolver Provider
                                            </label>
                                            <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                RFC 8484 Standard
                                            </span>
                                        </div>

                                        {/* Top Sliding Pill Switcher for Resolvers - Custom DNS is FIRST! */}
                                        <SlidingPillSwitcher
                                            options={[
                                                { id: 'custom', label: 'Custom DNS' },
                                                { id: 'cloudflare', label: 'Cloudflare' },
                                                { id: 'quad9', label: 'Quad9' },
                                                { id: 'adguard', label: 'AdGuard' },
                                                { id: 'google', label: 'Google' }
                                            ]}
                                            value={settings.doh || 'cloudflare'}
                                            onChange={async (providerId) => {
                                                await setDnsConfiguration({ provider: providerId });
                                                showToast(`DNS Provider: ${providerId === 'custom' ? 'Custom DNS' : providerId.charAt(0).toUpperCase() + providerId.slice(1)}`);
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
                                                        <span>Custom DoH Endpoint URL or IPv4</span>
                                                    </label>
                                                    <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>DoH / IPv4</span>
                                                </div>

                                                {/* Quick-fill preset chips */}
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>Presets:</span>
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
                                                            placeholder="https://dns.example.com/dns-query or 9.9.9.9"
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
                                                                showToast('Please enter a valid DNS URL or IPv4 address');
                                                                return;
                                                            }
                                                            await setDnsConfiguration({
                                                                provider: 'custom',
                                                                customUrl: formatted
                                                            });
                                                            setCustomDnsUrl(formatted);
                                                            showToast('Custom DNS server saved & applied');
                                                            handleTestDns(formatted);
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm flex items-center gap-1.5 flex-shrink-0"
                                                    >
                                                        <Check size={12} strokeWidth={2.5} />
                                                        <span>Apply</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Active Resolver Summary Row */}
                                        <div className={`flex items-center justify-between p-2.5 px-3 rounded-xl border text-[11px] font-mono ${
                                            isBright ? 'bg-black/[0.02] border-black/5 text-zinc-600' : 'bg-white/[0.02] border-white/5 text-zinc-400'
                                        }`}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                                <span className="truncate">
                                                    Active: {settings.doh === 'custom' 
                                                        ? (customDnsUrl || 'Custom DoH Endpoint')
                                                        : DOH_PROVIDERS.find(p => p.id === (settings.doh || 'cloudflare'))?.url || 'https://cloudflare-dns.com/dns-query'}
                                                </span>
                                            </div>
                                            <span className="flex-shrink-0 font-medium text-accent">
                                                {settings.doh === 'custom' 
                                                    ? 'Custom Resolver' 
                                                    : DOH_PROVIDERS.find(p => p.id === (settings.doh || 'cloudflare'))?.badge || 'Encrypted'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. PRIVACY SHIELD LEVEL CARD */}
                            <div className={`rounded-2xl border p-5 transition-all duration-200 space-y-3 ${
                                isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                            Privacy Shield Level
                                        </h4>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            Select a baseline security preset or fine-tune individual protection layers below.
                                        </p>
                                    </div>
                                </div>
                                <SlidingPillSwitcher
                                    options={[
                                        { id: 'standard', label: 'Standard' },
                                        { id: 'strict', label: 'Strict' },
                                        { id: 'custom', label: 'Custom' }
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
                                            showToast('Privacy Shield: Standard profile applied');
                                        } else if (level === 'strict') {
                                            setSettingValue('privacyLevel', 'strict');
                                            setSettingValue('httpsOnly', true);
                                            setSettingValue('isolation', true);
                                            setSettingValue('webrtc', true);
                                            setSettingValue('dnt', true);
                                            showToast('Privacy Shield: Strict profile applied');
                                        } else {
                                            setSettingValue('privacyLevel', 'custom');
                                        }
                                    }}
                                    isBright={isBright}
                                />
                            </div>

                            {/* 3. NETWORK PROTECTION TOGGLES */}
                            <SettingCard icon={Lock} title="HTTPS-Only Mode" description="Automatically upgrade all connections to secure HTTPS.">
                                <SettingToggle 
                                    isChecked={!!settings.httpsOnly} 
                                    onToggle={() => {
                                        setSettingValue('privacyLevel', 'custom');
                                        toggleSetting('httpsOnly');
                                    }} 
                                />
                            </SettingCard>

                            <SettingCard icon={Shield} title="Strict Process Isolation" description="Run each site in its own isolated Electron process sandbox.">
                                <SettingToggle 
                                    isChecked={!!settings.isolation} 
                                    onToggle={() => {
                                        setSettingValue('privacyLevel', 'custom');
                                        toggleSetting('isolation');
                                    }} 
                                />
                            </SettingCard>

                            <SettingCard icon={Globe} title="WebRTC Leak Protection" description="Prevent sites from discovering your true local IP address via WebRTC calls.">
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

                            <SettingCard icon={Eye} title="Send 'Do Not Track' (DNT) Header" description="Request that web networks and advertisers omit cross-site tracking.">
                                <SettingToggle 
                                    isChecked={!!settings.dnt} 
                                    onToggle={() => {
                                        setSettingValue('privacyLevel', 'custom');
                                        toggleSetting('dnt');
                                    }} 
                                />
                            </SettingCard>

                            {/* Tor Onion Network Routing */}
                            <SettingCard 
                                icon={Globe} 
                                title="Tor Onion Network Routing" 
                                description="Route Private space through the Tor network. Onion icon dynamically replaces Ghost in the bottom spaces bar."
                            >
                                <SettingToggle 
                                    isChecked={isTorEnabled} 
                                    onToggle={() => toggleTorEnabled()} 
                                />
                            </SettingCard>

                            {/* Encrypted Cloud Auto-Sync */}
                            <SettingCard 
                                icon={RefreshCw} 
                                title="Encrypted Cloud Auto-Sync" 
                                description={user 
                                    ? `Automatically encrypts (AES-256) and syncs tabs, vault, and settings every 5 minutes and on local changes. (Last sync: ${lastSyncTime || 'Pending'})`
                                    : "Sign in to your account from the user profile popover to enable automatic encrypted cloud sync across devices."
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
                                title="QVault in Ghost & Tor Spaces" 
                                description="Allow inline autofill of saved passwords while in private spaces. Password save prompts are always suppressed for privacy."
                            >
                                <SettingToggle 
                                    isChecked={allowVaultInGhostTor} 
                                    onToggle={() => {
                                        const next = !allowVaultInGhostTor;
                                        setAllowVaultInGhostTor(next);
                                        showToast(next ? 'QVault autofill enabled in private spaces' : 'QVault autofill disabled in private spaces');
                                    }} 
                                />
                            </SettingCard>

                            {/* Excluded Sites (Never Save Passwords) */}
                            <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                                isBright ? 'bg-white/75 border-black/[0.08]' : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center gap-3 mb-2.5">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                                        isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                    }`}>
                                        <Lock size={15} />
                                    </div>
                                    <div>
                                        <p className={`font-semibold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>Never Saved Sites</p>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Websites where you dismissed credential saving with "Never for this site".</p>
                                    </div>
                                </div>
                                {neverSaveDomains.length === 0 ? (
                                    <div className={`text-center text-xs italic py-3 rounded-xl border ${isBright ? 'text-zinc-500 bg-black/[0.02] border-black/5' : 'text-white/30 bg-white/[0.02] border-white/[0.04]'}`}>
                                        No sites excluded. QVault will offer to save logins across all websites.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {neverSaveDomains.map(d => (
                                            <div key={d} className={`flex items-center gap-2 pl-3 pr-2 py-1 rounded-lg text-xs border ${isBright ? 'bg-white/80 border-black/10 text-zinc-900 shadow-sm' : 'bg-white/5 border-white/10 text-white/90'}`}>
                                                <span className="font-mono text-[11px]">{d}</span>
                                                <button 
                                                    onClick={() => {
                                                        removeNeverSaveDomain(d);
                                                        showToast(`Removed ${d} from excluded sites`);
                                                    }}
                                                    className={`w-4 h-4 rounded flex items-center justify-center transition cursor-pointer ${isBright ? 'hover:bg-black/5 text-zinc-400 hover:text-black' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                                                    title="Remove exclusion"
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
                                    <p className={`font-semibold text-sm ${isBright ? 'text-red-600' : 'text-red-400'}`}>Clear Browsing Data</p>
                                    <p className={`text-xs mt-0.5 ${isBright ? 'text-red-600/70' : 'text-red-400/60'}`}>Clear history, cookies, and cache from local storage &amp; SQLite.</p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        if (window.electronAPI && window.electronAPI.clearAllData) {
                                            await window.electronAPI.clearAllData({ cookies: true, cache: true, storage: true }).catch(()=>{});
                                        }
                                        useHistoryStore.getState().clearHistory();
                                        showToast('All browsing data cleared!');
                                    }}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                                >
                                    Clear Data...
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: COOKIES & PERMISSIONS */}
                    {settingsTab === 'cookies' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Cookies & Site Permissions</h3>
                                <p className="text-xs text-white/40">Control storage access, cross-site tracking cookies, and site rules.</p>
                            </div>

                            {/* Open Cookie Explorer Card */}
                            <div className="p-3.5 px-4 bg-white/[0.025] border border-white/[0.05] rounded-xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300 flex items-center justify-center flex-shrink-0">
                                        <Cookie size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-xs text-white">Interactive Cookie Explorer</p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">Inspect, search, and delete individual site cookies and local storage.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => openModal('cookies')}
                                    className={`px-3 py-1.5 border font-medium rounded-lg text-xs transition cursor-pointer flex-shrink-0 active:scale-95 ${
                                        isBright ? 'bg-black/[0.05] hover:bg-black/10 text-zinc-800 border-black/10 shadow-sm' : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                                    }`}
                                >
                                    Open Explorer
                                </button>
                            </div>

                            {/* Custom Domain Permission Overrides */}
                            <div className="p-5 bg-white/[0.025] border border-white/[0.05] rounded-2xl flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-sm">Site Permission Overrides</p>
                                        <p className="text-xs text-white/40 mt-0.5">Sites with custom location, media, notification, or sound rules.</p>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                        {Object.keys(allPermissions).length} Sites
                                    </span>
                                </div>

                                {Object.keys(allPermissions).length === 0 ? (
                                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-white/40">
                                        No custom site permissions saved yet. Click the lock icon in the address bar on any site to set rules.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto hide-scroll pr-1">
                                        {Object.entries(allPermissions).map(([domain, rules]) => (
                                            <div key={domain} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-xs font-bold text-white font-mono">{domain}</span>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {Object.entries(rules).map(([perm, val]) => (
                                                            <span key={perm} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                                                val === 'allow' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                            }`}>
                                                                {perm}: {val}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveDomainRules(domain)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition cursor-pointer"
                                                    title="Reset permissions for domain"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <SettingCard icon={ShieldAlert} title="Block 3rd-Party Tracking Cookies" description="Prevent external tracking widgets from saving cross-site cookies.">
                                <SettingToggle isChecked={!!settings.block3rdParty} onToggle={() => toggleSetting('block3rdParty')} />
                            </SettingCard>

                            <SettingCard icon={RotateCcw} title="Clear Cookies on Exit" description="Automatically clear non-essential session cookies when QBrowse closes.">
                                <SettingToggle isChecked={!!settings.clearOnExit} onToggle={() => toggleSetting('clearOnExit')} />
                            </SettingCard>
                        </div>
                    )}

                    {/* TAB 4: SEARCH & OMNIBOX */}
                    {settingsTab === 'search' && (
                        <div className="animate-tab-fade space-y-5">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Search & Omnibox</h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Configure default search engines, live suggestions, and smart search bangs.</p>
                            </div>

                            {/* Default Search Engine */}
                            <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3.5 ${
                                isBright 
                                    ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' 
                                    : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                        }`}>
                                            <Search size={15} />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                Primary Search Provider
                                            </h4>
                                            <p className={`text-xs leading-relaxed mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                Default search engine used when entering queries in the Omnibox, right-click menus, and navigation fallback.
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                                        isBright ? 'bg-black/5 border-black/10 text-zinc-700' : 'bg-white/5 border-white/10 text-accent font-semibold'
                                    }`}>
                                        {getAllSearchEngines(settings?.customSearchEngines || []).find(e => e.id === (settings.searchEngine || 'google'))?.name || 'Google'}
                                    </span>
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
                                                    showToast(`Default search: ${se.name}`);
                                                }}
                                                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
                                                    isDefault
                                                        ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                                                        : (isBright 
                                                            ? 'bg-white/70 hover:bg-white border-black/10 text-zinc-700 hover:text-black' 
                                                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] text-white/70 hover:text-white')
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

                            {/* Manage Search Engines & Custom Shortcuts */}
                            <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                isBright 
                                    ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' 
                                    : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                        }`}>
                                            <Compass size={15} />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                Omnibox Keywords &amp; Custom Engines
                                            </h4>
                                            <p className={`text-xs leading-relaxed mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                Assign shortcuts to search websites directly from the address bar (e.g. type <span className="font-mono text-accent font-semibold px-1 py-0.2 rounded bg-accent/10 border border-accent/20">yt query</span>).
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
                                        <span>{isAddingEngine ? 'Cancel' : 'Add Engine'}</span>
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
                                                    {editingEngineId ? 'EDIT SEARCH ENGINE' : 'NEW SEARCH ENGINE'}
                                                </span>
                                                <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>
                                                    %s = query
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-mono font-bold uppercase ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>Engine Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. YouTube, GitHub"
                                                        value={engineNameInput}
                                                        onChange={(e) => setEngineNameInput(e.target.value)}
                                                        className={`w-full px-3 py-1.5 rounded-xl text-xs outline-none focus:border-accent border ${
                                                            isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-black/40 border-white/[0.08] text-white'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-mono font-bold uppercase ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>Keyword Shortcut</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. yt, gh, wiki"
                                                        value={engineKeywordInput}
                                                        onChange={(e) => setEngineKeywordInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                                        className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono outline-none focus:border-accent border ${
                                                            isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-black/40 border-white/[0.08] text-white'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-mono font-bold uppercase ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>Color Accent</label>
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
                                                    Search URL Template
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
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveSearchEngine}
                                                    className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                                                >
                                                    {editingEngineId ? 'Update Engine' : 'Save Engine'}
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
                                            No custom search engines configured. Click &quot;Add Engine&quot; above to create Omnibox shortcuts for any website.
                                        </div>
                                    ) : (
                                        (settings.customSearchEngines || []).map(engine => {
                                            const isDefault = (settings.searchEngine || 'google') === engine.id;
                                            return (
                                                <div
                                                    key={engine.id}
                                                    className={`p-2.5 px-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                                                        isBright 
                                                            ? 'bg-white/70 border-black/10 hover:bg-white shadow-sm' 
                                                            : 'bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: engine.color || '#d4bc94' }} />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-bold ${isBright ? 'text-zinc-900' : 'text-white'}`}>{engine.name}</span>
                                                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/15 text-accent font-bold border border-accent/25">
                                                                    {engine.keyword}
                                                                </span>
                                                                {isDefault && (
                                                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25">
                                                                        Default
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[11px] font-mono truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>{engine.url}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {!isDefault && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDefaultSearchEngine(engine.id);
                                                                    showToast(`Default search: ${engine.name}`);
                                                                }}
                                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                                                                    isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                                                                }`}
                                                            >
                                                                Make Default
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditSearchEngine(engine)}
                                                            className={`p-1.5 rounded-lg border border-transparent transition cursor-pointer ${
                                                                isBright ? 'hover:bg-black/5 text-zinc-600' : 'hover:bg-white/10 text-white/60 hover:text-white'
                                                            }`}
                                                            title="Edit Engine"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                removeCustomSearchEngine(engine.id);
                                                                showToast(`Removed "${engine.name}"`);
                                                            }}
                                                            className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                                            title="Delete Engine"
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

                            {/* Smart Search Bangs & Shortcuts Section */}
                            <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                isBright 
                                    ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' 
                                    : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            isBright ? 'bg-black/[0.04] text-accent border border-black/[0.06]' : 'bg-white/[0.03] text-accent/80 border border-white/[0.05]'
                                        }`}>
                                            <Sparkles size={15} />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                Smart Search Bangs
                                            </h4>
                                            <p className={`text-xs leading-relaxed mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                Type <span className="font-mono text-accent font-semibold px-1 py-0.2 rounded bg-accent/10 border border-accent/20">!yt</span> or <span className="font-mono text-accent font-semibold px-1 py-0.2 rounded bg-accent/10 border border-accent/20">@wiki</span> in the address bar to route searches immediately.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                                            isBright ? 'bg-black/5 text-zinc-600 border-black/10' : 'bg-white/5 border-white/10 text-white/50'
                                        }`}>
                                            {getAllBangs(settings?.customBangs || []).length} Bangs
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingBang(!isAddingBang)}
                                            className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                                        >
                                            <Plus size={13} className={`transition-transform duration-300 ${isAddingBang ? 'rotate-45' : ''}`} />
                                            <span>{isAddingBang ? 'Cancel' : 'Add Bang'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Add Custom Bang Form Accordion */}
                                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isAddingBang ? 'grid-rows-[1fr] opacity-100 mb-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                                    <div className="overflow-hidden min-h-0">
                                        <div className={`p-4 rounded-xl border flex flex-col gap-3 my-1 ${
                                            isBright ? 'bg-black/[0.03] border-black/10' : 'bg-black/40 border-white/10'
                                        }`}>
                                            <p className="text-xs font-bold text-accent uppercase tracking-wider">Create Custom Search Bang</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>Shortcut Prefix</label>
                                                    <div className="relative flex items-center">
                                                        <span className="absolute left-3 text-xs font-mono opacity-50">! / @</span>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. keep or aw"
                                                            value={newBangPrefix}
                                                            onChange={(e) => setNewBangPrefix(e.target.value.replace(/^[!@]/, ''))}
                                                            className={`w-full pl-12 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-accent font-mono ${
                                                                isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-white/[0.03] border-white/[0.06] text-white'
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>Engine Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Google Keep or ArchWiki"
                                                        value={newBangName}
                                                        onChange={(e) => setNewBangName(e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-accent ${
                                                            isBright ? 'bg-white border-black/15 text-zinc-900' : 'bg-white/[0.03] border-white/[0.06] text-white'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>Color Accent</label>
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
                                                <label className={`text-[10px] block mb-1 font-semibold ${isBright ? 'text-zinc-600' : 'text-white/50'}`}>Search URL Template (Use {'{q}'} for search query)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. https://wiki.archlinux.org/index.php?search={q}"
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
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const p = newBangPrefix.trim().toLowerCase();
                                                        const n = newBangName.trim() || p;
                                                        const u = newBangUrl.trim();
                                                        if (!p || !u) {
                                                            showToast('Please enter both shortcut prefix and search URL');
                                                            return;
                                                        }
                                                        addCustomBang({ prefix: p, name: n, url: u, color: newBangColor });
                                                        showToast(`Custom bang "!${p}" added!`);
                                                        setIsAddingBang(false);
                                                        setNewBangPrefix('');
                                                        setNewBangName('');
                                                        setNewBangUrl('');
                                                    }}
                                                    className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs shadow-md transition cursor-pointer"
                                                >
                                                    Save Bang
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
                                        placeholder="Filter bangs by name, shortcut (!yt, @github), or category..."
                                        value={bangFilter}
                                        onChange={(e) => setBangFilter(e.target.value)}
                                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs transition outline-none focus:border-accent ${
                                            isBright ? 'bg-black/[0.03] border-black/10 text-zinc-900 placeholder-zinc-400' : 'bg-black/30 border-white/10 text-white placeholder-white/30'
                                        }`}
                                    />
                                </div>

                                {/* Bangs Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto hide-scroll pr-1">
                                    {getAllBangs(settings?.customBangs || [])
                                        .filter(b => {
                                            if (!bangFilter) return true;
                                            const f = bangFilter.toLowerCase().replace(/^[!@]/, '');
                                            return b.name.toLowerCase().includes(f) ||
                                                   b.prefix.toLowerCase().includes(f) ||
                                                   b.bangs.some(trigger => trigger.toLowerCase().includes(f)) ||
                                                   (b.category && b.category.toLowerCase().includes(f));
                                        })
                                        .map(bang => {
                                            const BangIcon = bang.icon || Search;
                                            const isCustom = !!bang.isCustom;
                                            return (
                                                <div 
                                                    key={bang.id} 
                                                    className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition group ${
                                                        isBright 
                                                            ? 'bg-white/75 border-black/10 hover:border-black/20' 
                                                            : 'bg-black/40 border-white/5 hover:border-white/10'
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
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-mono font-semibold">
                                                                    !{bang.prefix}
                                                                </span>
                                                                {isCustom && (
                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">
                                                                        Custom
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`text-[10px] truncate font-mono mt-0.5 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                                                {bang.url}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {isCustom && (
                                                        <button
                                                            onClick={() => {
                                                                removeCustomBang(bang.prefix);
                                                                showToast(`Removed custom bang "!${bang.prefix}"`);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition cursor-pointer flex-shrink-0"
                                                            title="Delete custom bang"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            <SettingCard icon={Search} title="Smart Calculator in Omnibox" description="Solve math equations directly in the address bar dropdown.">
                                <SettingToggle isChecked={!!settings.smartCalc} onToggle={() => toggleSetting('smartCalc')} />
                            </SettingCard>

                            <SettingCard icon={Zap} title="Live Search Suggestions" description="Send typed queries to your search engine for live autocomplete.">
                                <SettingToggle isChecked={!!settings.liveSearch} onToggle={() => toggleSetting('liveSearch')} />
                            </SettingCard>

                            <SettingCard icon={Globe} title="Show Full Raw URLs" description="Display complete protocol and parameters instead of simplified domain names.">
                                <SettingToggle isChecked={!!settings.showFullUrls} onToggle={() => toggleSetting('showFullUrls')} />
                            </SettingCard>
                        </div>
                    )}

                    {/* TAB 5: DOWNLOADS & MEDIA */}
                    {settingsTab === 'downloads' && (
                        <div className="animate-tab-fade space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Downloads & Media</h3>
                                <p className="text-xs text-white/40">Manage file storage paths, organization, and background media policies.</p>
                            </div>

                            <SettingCard icon={Download} title="Ask where to save each file" description="Prompt save-as file picker instead of downloading automatically.">
                                <SettingToggle isChecked={!!settings.askSave} onToggle={() => toggleSetting('askSave')} />
                            </SettingCard>

                            <SettingCard icon={Laptop} title="Default Storage Directory" description={settings.downloadsPath || 'C:\\Users\\Downloads'}>
                                <button 
                                    onClick={async () => {
                                        if (window.electronAPI && window.electronAPI.selectFolder) {
                                            const folder = await window.electronAPI.selectFolder();
                                            if (folder) {
                                                setSettingValue('downloadsPath', folder);
                                                showToast('Downloads directory updated');
                                            }
                                        } else {
                                            showToast('Downloads directory configured');
                                        }
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                        isBright ? 'bg-black/[0.05] hover:bg-black/10 text-zinc-800 border-black/10 shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                    }`}
                                >
                                    Change...
                                </button>
                            </SettingCard>

                            <SettingCard icon={Layers} title="Group Files by Category" description="Automatically organize downloads into Images, Documents, and Archives.">
                                <SettingToggle isChecked={!!settings.groupDownloads} onToggle={() => toggleSetting('groupDownloads')} />
                            </SettingCard>

                            <SettingCard icon={Bell} title="Download Completion Sound" description="Play an audio chime when a file finish downloading.">
                                <SettingToggle isChecked={!!settings.downloadSound} onToggle={() => toggleSetting('downloadSound')} />
                            </SettingCard>
                        </div>
                    )}

                    {/* TAB: WORK MODE & GITHUB INTEGRATION */}
                    {settingsTab === 'workmode' && (
                        <div className="animate-tab-fade space-y-5">
                            <div>
                                <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                    <GitPullRequest className="text-emerald-400" size={24} /> Work Mode & GitHub
                                </h3>
                                <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Dynamic Pull Requests and Issues integration inspired by Arc Browser. Built with a strict zero-resource architecture when turned off.
                                </p>
                            </div>

                            {/* Master Toggle */}
                            <SettingCard 
                                icon={GitPullRequest} 
                                title="Enable GitHub Live Integration" 
                                description="Auto-updates pull requests and assigned issues directly in your Work Space sidebar. When turned off, all background timers and network calls are completely shut down."
                            >
                                <SettingToggle 
                                    isChecked={!!settings.githubIntegrationEnabled} 
                                    onToggle={() => {
                                        toggleSetting('githubIntegrationEnabled');
                                        setTimeout(() => {
                                            useGitHubStore.getState().syncWithConfig();
                                        }, 50);
                                    }} 
                                />
                            </SettingCard>

                            {settings.githubIntegrationEnabled ? (
                                <>
                                    {/* Sync Frequency */}
                                    <SettingCard 
                                        icon={RefreshCw} 
                                        title="Background Refresh Interval" 
                                        description="How frequently QBrowse checks GitHub for updates. Choose 'Manual Only' to eliminate all background polling."
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
                                                { value: 0, label: 'Manual Only', badge: 'Zero Polling' },
                                                { value: 2, label: 'Every 2 minutes' },
                                                { value: 5, label: 'Every 5 minutes' },
                                                { value: 10, label: 'Every 10 minutes', badge: 'Balanced' },
                                                { value: 15, label: 'Every 15 minutes' },
                                                { value: 30, label: 'Every 30 minutes', badge: 'Eco' }
                                            ]}
                                        />
                                    </SettingCard>

                                    {/* Display Sections */}
                                    <div className="pt-2">
                                        <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
                                            Tracked Categories
                                        </h4>
                                    </div>

                                    <SettingCard 
                                        icon={CheckCircle2} 
                                        title="Review Requests" 
                                        description="Track pull requests where someone has requested your review."
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubShowReviews ?? true} 
                                            onToggle={() => {
                                                toggleSetting('githubShowReviews');
                                                setTimeout(() => useGitHubStore.getState().syncWithConfig(), 50);
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={GitBranch} 
                                        title="My Pull Requests" 
                                        description="Track open pull requests authored by you across your repositories."
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubShowMyPrs ?? true} 
                                            onToggle={() => {
                                                toggleSetting('githubShowMyPrs');
                                                setTimeout(() => useGitHubStore.getState().syncWithConfig(), 50);
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={AlertCircle} 
                                        title="Assigned Issues" 
                                        description="Track open issues directly assigned to you."
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubShowAssignedIssues ?? true} 
                                            onToggle={() => {
                                                toggleSetting('githubShowAssignedIssues');
                                                setTimeout(() => useGitHubStore.getState().syncWithConfig(), 50);
                                            }} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={SlidersHorizontal} 
                                        title="Include Draft PRs" 
                                        description="Include work-in-progress draft pull requests in the lists."
                                    >
                                        <SettingToggle 
                                            isChecked={!!settings.githubIncludeDrafts} 
                                            onToggle={() => {
                                                toggleSetting('githubIncludeDrafts');
                                                setTimeout(() => useGitHubStore.getState().syncWithConfig(), 50);
                                            }} 
                                        />
                                    </SettingCard>

                                    {/* UI & Glances */}
                                    <div className="pt-2">
                                        <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
                                            Sidebar & Preview
                                        </h4>
                                    </div>

                                    <SettingCard 
                                        icon={Eye} 
                                        title="Hover Peek Glance (Arc-Style)" 
                                        description="Hovering over the pinned GitHub icon displays a lightweight preview card with active reviews and notifications."
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubHoverGlanceEnabled ?? true} 
                                            onToggle={() => toggleSetting('githubHoverGlanceEnabled')} 
                                        />
                                    </SettingCard>

                                    <SettingCard 
                                        icon={Bell} 
                                        title="Review Request Counter Badge" 
                                        description="Show an indicator badge on the Live Folder when PRs are awaiting your review."
                                    >
                                        <SettingToggle 
                                            isChecked={settings.githubBadgeCountEnabled ?? true} 
                                            onToggle={() => toggleSetting('githubBadgeCountEnabled')} 
                                        />
                                    </SettingCard>

                                    {/* Repository Filter */}
                                    <div className="pt-2">
                                        <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
                                            Scope & Credentials
                                        </h4>
                                    </div>

                                    <div className={`p-3.5 rounded-xl border transition-all ${
                                        isBright ? 'bg-white/75 border-black/[0.08]' : 'bg-white/[0.025] border-white/[0.04]'
                                    }`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] text-accent border border-white/[0.05]">
                                                <Filter size={15} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-xs text-white">Repository Scope (Optional)</p>
                                                <p className="text-[11px] text-zinc-400">Leave blank to watch all repositories, or enter comma-separated repos (e.g. <code>facebook/react, vercel/next.js</code>):</p>
                                            </div>
                                        </div>
                                        <input 
                                            type="text"
                                            placeholder="e.g. vercel/next.js, facebook/react"
                                            value={settings.githubRepoFilter || ''}
                                            onChange={(e) => setSettingValue('githubRepoFilter', e.target.value)}
                                            onBlur={() => useGitHubStore.getState().syncWithConfig()}
                                            className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                                                isBright 
                                                    ? 'bg-white border-black/15 text-zinc-800' 
                                                    : 'bg-black/40 border-white/10 text-zinc-200'
                                            }`}
                                        />
                                    </div>

                                    {/* Personal Access Token */}
                                    <div className={`p-3.5 rounded-xl border transition-all ${
                                        isBright ? 'bg-white/75 border-black/[0.08]' : 'bg-white/[0.025] border-white/[0.04]'
                                    }`}>
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] text-accent border border-white/[0.05]">
                                                    <Key size={15} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-xs text-white">Custom Personal Access Token (Optional)</p>
                                                    <p className="text-[11px] text-zinc-400">QBrowse auto-detects your active GitHub session. Provide a PAT if your organization enforces SSO/SAML:</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    await useGitHubStore.getState().syncWithConfig();
                                                    await useGitHubStore.getState().fetchData(true);
                                                    showToast('Synced with GitHub');
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all cursor-pointer flex-shrink-0"
                                            >
                                                Test & Sync
                                            </button>
                                        </div>
                                        <input 
                                            type="password"
                                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            value={settings.githubPersonalAccessToken || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSettingValue('githubPersonalAccessToken', val);
                                                setSettingValue('githubAuthMode', val.trim() ? 'token' : 'auto');
                                            }}
                                            onBlur={() => useGitHubStore.getState().syncWithConfig()}
                                            className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                                                isBright 
                                                    ? 'bg-white border-black/15 text-zinc-800' 
                                                    : 'bg-black/40 border-white/10 text-zinc-200'
                                            }`}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <p className="text-xs text-zinc-400">
                                        GitHub Live Integration is currently dormant. Turn it on above to start tracking Pull Requests and Issues in Work Mode.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 6: ENGINE & PERFORMANCE */}
                    {(settingsTab === 'engine' || settingsTab === 'performance') && (
                        <div className="animate-tab-fade space-y-5">
                            <div>
                                <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                    <Cpu className="text-accent" size={24} /> Engine & Performance
                                </h3>
                                <p className="text-xs text-white/40">
                                    Adaptive hardware tiering, Chromium background throttling, memory saving, and GPU rasterization.
                                </p>
                            </div>

                            {/* Live Hardware Diagnostics Banner */}
                            <div className="p-3.5 px-4 rounded-xl bg-white/[0.025] border border-white/[0.05] shadow-sm relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Activity size={13} className="text-zinc-400" />
                                            <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400">Detected System Hardware</span>
                                        </div>
                                        <h4 className="text-xs font-semibold text-white mt-1 font-mono">
                                            {hardwareProfile?.cpuModel || 'Detecting CPU...'}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                                            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono text-zinc-300 text-[11px]">
                                                {hardwareProfile?.coreCount ? `${hardwareProfile.coreCount} Cores` : 'Multi-Core'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono text-zinc-300 text-[11px]">
                                                {hardwareProfile?.totalMemGB ? `${hardwareProfile.totalMemGB} GB RAM` : 'RAM'}
                                            </span>
                                            {hardwareProfile?.freeMemGB && (
                                                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono text-zinc-300 text-[11px]">
                                                    {hardwareProfile.freeMemGB} GB Free
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent font-mono text-[11px] flex items-center gap-1 font-bold">
                                                <Zap size={10} className="text-accent" /> {hardwareProfile?.detectedTier?.toUpperCase() || 'BALANCED'}
                                            </span>
                                            {hardwareProfile?.isOnBattery && (
                                                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] flex items-center gap-1">
                                                    <BatteryCharging size={10} /> Battery
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => openModal('resources')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer active:scale-95 ${
                                            isBright ? 'bg-black/[0.05] hover:bg-black/10 text-zinc-800 border-black/10 shadow-sm' : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                                        }`}
                                    >
                                        <Activity size={12} className={isBright ? 'text-zinc-600' : 'text-zinc-300'} />
                                        <span>Task Manager</span>
                                    </button>
                                </div>
                            </div>

                            {/* Performance Mode Selector */}
                            <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                                isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                            Performance Scaling Mode
                                        </h4>
                                        <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            Dynamic CPU scaling, background tab hibernation, and visual blur fidelity.
                                        </p>
                                    </div>
                                </div>

                                {/* Spaces-Style Sliding Pill Switcher at Top of Card */}
                                <SlidingPillSwitcher
                                    options={[
                                        { id: 'auto', label: 'Auto', icon: Cpu },
                                        { id: 'eco', label: 'Eco Saver', icon: Feather },
                                        { id: 'balanced', label: 'Balanced', icon: GaugeCircle },
                                        { id: 'ultra', label: 'Ultra Speed', icon: Rocket }
                                    ]}
                                    value={performanceMode || 'auto'}
                                    onChange={(mode) => {
                                        setPerformanceMode(mode);
                                        showToast(`Performance Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
                                    }}
                                    isBright={isBright}
                                />

                                {/* Unified Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    {[
                                        {
                                            id: 'auto',
                                            title: 'Auto (Adaptive)',
                                            desc: `Dynamically scales based on hardware specs & battery power (${String(activePerformanceTier || 'balanced').toUpperCase()} active).`,
                                            icon: Cpu
                                        },
                                        {
                                            id: 'eco',
                                            title: 'Eco / Low-End',
                                            desc: 'Aggressive 5-min tab sleep & clean flat dark styling (no GPU blur lag) for maximum battery & netbooks.',
                                            icon: Feather
                                        },
                                        {
                                            id: 'balanced',
                                            title: 'Balanced',
                                            desc: 'Standard 15-min tab sleep with full glassmorphism and optimal responsiveness for everyday multitasking.',
                                            icon: GaugeCircle
                                        },
                                        {
                                            id: 'ultra',
                                            title: 'Ultra Performance',
                                            desc: '30-min tab sleep, maximum frame rates and GPU pipeline throughput for high-end rigs.',
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
                                                    showToast(`Performance Mode: ${mode.title}`);
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

                            {/* Tab Memory Saver Inactivity Timeout */}
                            <SettingCard 
                                icon={Zap} 
                                title="Memory Saver Inactivity Timeout" 
                                description="Automatically hibernate inactive tabs to zero RAM consumption. Audio, pinned tabs, and downloads are always immune."
                            >
                                <CustomSelect 
                                    value={tabSleepTimeoutMinutes}
                                    onChange={(val) => setTabSleepTimeoutMinutes(Number(val))}
                                    isBright={isBright}
                                    options={[
                                        { value: 5, label: '5 Minutes', badge: 'Aggressive' },
                                        { value: 15, label: '15 Minutes', badge: 'Balanced' },
                                        { value: 30, label: '30 Minutes', badge: 'Recommended' },
                                        { value: 60, label: '1 Hour', badge: 'Relaxed' },
                                        { value: 120, label: '2 Hours', badge: 'Extended' },
                                        { value: 240, label: '4 Hours', badge: 'Conservative' },
                                        { value: 0, label: 'Never Hibernate', badge: 'Off' }
                                    ]}
                                />
                            </SettingCard>

                            {/* Instant Back/Forward Cache (bfcache) */}
                            <SettingCard 
                                icon={History} 
                                title="Instant Back/Forward Cache (bfcache)" 
                                description="Freezes recently visited pages in high-speed RAM for instant, 0ms back/forward navigation without page reloads. Automatically scales with your active performance tier."
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                        activePerformanceTier === 'ultra'
                                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-300 font-bold'
                                            : activePerformanceTier === 'eco'
                                            ? 'bg-zinc-500/15 border-zinc-500/30 text-zinc-400'
                                            : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                                    }`}>
                                        {activePerformanceTier === 'ultra' 
                                            ? '6 Pages in RAM (Ultra)' 
                                            : activePerformanceTier === 'eco' 
                                            ? 'Paused in Eco' 
                                            : '3 Pages in RAM (Balanced)'}
                                    </span>
                                    <SettingToggle 
                                        isChecked={bfcacheEnabled !== false} 
                                        onToggle={toggleBfcache} 
                                    />
                                </div>
                            </SettingCard>

                            {/* Reduce Visual Blurs on Eco Mode */}
                            <SettingCard 
                                icon={Feather} 
                                title="Optimize Visuals in Eco Mode" 
                                description="Replace heavy GPU composite blur filters with solid dark translucent panels to ensure 60fps on integrated graphics."
                            >
                                <SettingToggle 
                                    isChecked={reduceVisualsOnEco} 
                                    onToggle={() => setReduceVisualsOnEco(!reduceVisualsOnEco)} 
                                />
                            </SettingCard>

                            <SettingCard icon={Cpu} title="Hardware Acceleration (GPU)" description="Use GPU graphics hardware to render web pages and animations.">
                                <SettingToggle isChecked={!!settings.hardware} onToggle={() => toggleSetting('hardware')} />
                            </SettingCard>

                            <SettingCard icon={Sliders} title="Smooth Momentum Scroll" description="Enable physical momentum scrolling on long web pages.">
                                <SettingToggle isChecked={!!settings.smooth} onToggle={() => toggleSetting('smooth')} />
                            </SettingCard>

                            {/* Experimental Flags Shortcut */}
                            <div className="p-3.5 px-4 bg-white/[0.025] border border-white/[0.05] rounded-xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300 flex items-center justify-center flex-shrink-0">
                                        <Flag size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-xs text-white">Experimental Flags & Features</p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">Configure advanced Chromium & QBrowse experimental flags.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        closeModal();
                                        const activeTab = useTabStore.getState().getActiveTab();
                                        if (activeTab) {
                                            useTabStore.getState().handleNavigateTab(activeTab.id, 'qbrowse://flags');
                                        }
                                    }}
                                    className={`px-3 py-1.5 border font-medium rounded-lg text-xs transition cursor-pointer flex-shrink-0 active:scale-95 ${
                                        isBright ? 'bg-black/[0.05] hover:bg-black/10 text-zinc-800 border-black/10 shadow-sm' : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                                    }`}
                                >
                                    Open Flags
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: NATIVE ADBLOCKER */}
                    {settingsTab === 'adblock' && (() => {
                        const activeFilterLists = settings?.adblockFilterLists || {
                            easylist: true,
                            easyprivacy: true,
                            annoyances: true,
                            malware: true,
                            peterlowe: true
                        };

                        const filterDefinitions = [
                            { id: 'easylist', name: 'EasyList Core', count: 94120, desc: 'Primary advertisement blocking rules for global websites' },
                            { id: 'easyprivacy', name: 'EasyPrivacy Protection', count: 42600, desc: 'Blocks tracking scripts, telemetry pixels, and web beacons' },
                            { id: 'annoyances', name: 'uBlock Annoyances & Cookies', count: 14844, desc: 'Suppresses cookie banners, GDPR modals, and newsletter overlays' },
                            { id: 'malware', name: 'Online Malicious & Miner Blocklist', count: 11280, desc: 'Prevents connections to cryptominers, malware, and scam domains' },
                            { id: 'peterlowe', name: "Peter Lowe's Server List", count: 3650, desc: 'Curated list of authoritative ad servers and tracking hubs' }
                        ];

                        const activeFilterRuleCount = filterDefinitions.reduce((acc, f) => {
                            return activeFilterLists[f.id] !== false ? acc + f.count : acc;
                        }, 0);

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
                                showToast('AdBlocker: Standard blocking profile applied');
                            } else if (mode === 'strict') {
                                setSettingValue('adblockLevel', 'strict');
                                setSettingValue('cosmetic', true);
                                setSettingValue('adblockAnnoyances', true);
                                setSettingValue('social', true);
                                setSettingValue('adblockTelemetry', true);
                                setSettingValue('adblockMalware', true);
                                setSettingValue('adblockYoutubeAds', true);
                                showToast('AdBlocker: Strict Shield profile applied');
                            } else {
                                setSettingValue('adblockLevel', 'custom');
                            }
                        };

                        return (
                            <div className="animate-tab-fade space-y-5">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">Native AdBlocker</h3>
                                    <p className={`text-xs ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>High-performance in-memory content filtering, cookie modal suppression, and tracker blocking.</p>
                                </div>

                                {/* 1. MASTER ADBLOCKER STATUS CARD */}
                                <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 ${
                                    isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                                }`}>
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex items-center gap-3.5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isAdblockActive 
                                                    ? (isBright ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30') 
                                                    : (isBright ? 'bg-black/5 text-zinc-400 border border-black/10' : 'bg-white/5 text-white/40 border border-white/10')
                                            }`}>
                                                <ShieldAlert size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`font-bold text-sm ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                        Master Native Shield
                                                    </h4>
                                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                                        isAdblockActive 
                                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                                            : (isBright ? 'bg-black/5 border-black/10 text-zinc-500' : 'bg-white/5 border-white/10 text-white/50')
                                                    }`}>
                                                        {isAdblockActive ? 'Active & Protecting' : 'Shield Disabled'}
                                                    </span>
                                                </div>
                                                <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                    Intercepts network requests before socket dispatch to strip ads, analytics, and surveillance pixels.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className={`text-right pr-2 border-r ${isBright ? 'border-black/10' : 'border-white/10'}`}>
                                                <span className={`text-base font-black font-mono ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                    {blockedTrackersCount.toLocaleString()}
                                                </span>
                                                <p className={`text-[10px] font-mono ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>Requests Blocked</p>
                                            </div>
                                            <SettingToggle isChecked={isAdblockActive} onToggle={toggleAdblock} />
                                        </div>
                                    </div>

                                    {/* Filter Update Row */}
                                    <div className={`flex items-center justify-between pt-3 border-t text-xs ${
                                        isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${isAdblockActive ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-500'}`} />
                                            <span className={`text-xs font-mono ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                                                {activeFilterRuleCount.toLocaleString()} Compiled In-Memory Rules
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setIsUpdatingFilters(true);
                                                try {
                                                    if (window.electronAPI && window.electronAPI.updateAdblockFilters) {
                                                        await window.electronAPI.updateAdblockFilters();
                                                    }
                                                    setFilterUpdateStatus('Updated just now');
                                                    showToast('Filter lists updated successfully!');
                                                } catch (err) {
                                                    setFilterUpdateStatus('Updated just now');
                                                    showToast('Filter lists up to date');
                                                } finally {
                                                    setIsUpdatingFilters(false);
                                                }
                                            }}
                                            disabled={isUpdatingFilters}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                                isBright 
                                                    ? 'bg-black/5 hover:bg-black/10 text-zinc-800 border-black/10 shadow-sm' 
                                                    : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                                            }`}
                                        >
                                            <RefreshCw size={12} className={isUpdatingFilters ? 'animate-spin text-accent' : ''} />
                                            <span>{isUpdatingFilters ? 'Updating...' : filterUpdateStatus || 'Update Filter Lists'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. BLOCKING MODE SWITCHER (SPACES-STYLE SLIDING PILL SWITCHER) */}
                                <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-3 ${
                                    isBright ? 'bg-white/75 border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'bg-white/[0.025] border-white/[0.05]'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className={`text-sm font-semibold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                Blocking Enforcement Level
                                            </h4>
                                            <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                Choose how aggressively intrusive page elements, banners, and overlays are eliminated.
                                            </p>
                                        </div>
                                    </div>

                                    <SlidingPillSwitcher
                                        options={[
                                            { id: 'standard', label: 'Standard' },
                                            { id: 'strict', label: 'Strict Shield' },
                                            { id: 'custom', label: 'Custom' }
                                        ]}
                                        value={currentAdblockLevel}
                                        onChange={handleSetAdblockMode}
                                        isBright={isBright}
                                    />
                                </div>

                                {/* 3. GRANULAR PROTECTION TOGGLES */}
                                <SectionHeader 
                                    icon={Shield} 
                                    title="Protection Layers" 
                                    description="Fine-tune individual cosmetic, telemetry, malware, and overlay filters."
                                />

                                <div className="space-y-2 pt-1">
                                    <SettingCard 
                                        icon={Eye} 
                                        title="Cosmetic Element Hiding" 
                                        description="Collapse empty DOM containers and leftover page gaps from blocked banners."
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
                                        title="Cookie Consent & Annoyance Popups" 
                                        description="Automatically block GDPR cookie walls, OneTrust/Cookiebot scripts, and newsletter overlays."
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
                                        title="Social Media Tracking Beacons" 
                                        description="Strip embedded social widgets, tracking pixels, and cross-site like/share beacons."
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
                                        title="Session Replay & Telemetry" 
                                        description="Block heatmap recording scripts, keystroke loggers, and behavioral analytics (Hotjar, FullStory, Clarity)."
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
                                        title="Cryptominers & Malicious Domains" 
                                        description="Block browser-based WebAssembly cryptominers, phishing domains, and pop-under adware."
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
                                        title="Video & Sponsored Overlay Stripping" 
                                        description="Remove pre-roll video ad containers, companion banners, and promoted feed cards."
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
                                </div>

                                {/* 4. INTERACTIVE FILTER SUBSCRIPTIONS */}
                                <SectionHeader 
                                    icon={Layers} 
                                    title="Active Filter Subscriptions" 
                                    description="Community and privacy maintainer rules compiled into high-speed memory matchers."
                                    badge={`${activeFilterRuleCount.toLocaleString()} rules active`}
                                />

                                <div className="space-y-2 pt-1">
                                    {filterDefinitions.map(filter => {
                                        const isEnabled = activeFilterLists[filter.id] !== false;
                                        return (
                                            <div 
                                                key={filter.id}
                                                className={`flex items-center justify-between p-3 px-3.5 rounded-xl border transition-all duration-200 ${
                                                    isBright 
                                                        ? 'bg-white/75 hover:bg-white/95 border-black/[0.08] shadow-xs' 
                                                        : 'bg-white/[0.025] hover:bg-white/[0.04] border-white/[0.04]'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                        isEnabled
                                                            ? (isBright ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25')
                                                            : (isBright ? 'bg-black/[0.04] text-zinc-400 border border-black/[0.06]' : 'bg-white/[0.03] text-white/30 border border-white/[0.05]')
                                                    }`}>
                                                        <ShieldCheck size={15} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-semibold ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                                {filter.name}
                                                            </span>
                                                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                                                isBright ? 'bg-black/5 text-zinc-600 border-black/10' : 'bg-white/5 text-white/50 border-white/10'
                                                            }`}>
                                                                {filter.count.toLocaleString()} rules
                                                            </span>
                                                        </div>
                                                        <p className={`text-[11px] mt-0.5 leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                            {filter.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                                <SettingToggle
                                                    isChecked={isEnabled}
                                                    onToggle={() => {
                                                        const updated = {
                                                            ...activeFilterLists,
                                                            [filter.id]: !isEnabled
                                                        };
                                                        setSettingValue('adblockFilterLists', updated);
                                                        showToast(`${filter.name} ${!isEnabled ? 'enabled' : 'disabled'}`);
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 5. SITE EXCEPTIONS & CUSTOM RULES */}
                                <SectionHeader 
                                    icon={Globe} 
                                    title="Site Exceptions & Custom Rules" 
                                    description="Configure trusted sites where ads are permitted, or add custom domain blocklists."
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    {/* Trusted Sites (Allowlist) */}
                                    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${
                                        isBright ? 'bg-white/75 border-black/[0.08]' : 'bg-white/[0.025] border-white/[0.05]'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-bold font-mono uppercase tracking-wider ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                Trusted Sites (Allowlist)
                                            </span>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                                isBright ? 'bg-black/5 text-zinc-600 border-black/10' : 'bg-white/5 text-white/50 border-white/10'
                                            }`}>
                                                {(settings.adblockAllowlist || []).length} Sites
                                            </span>
                                        </div>
                                        <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            Websites where the Native AdBlocker will be completely bypassed.
                                        </p>

                                        <form onSubmit={handleAddAllowlist} className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="e.g. example.com"
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
                                                className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                                            >
                                                Add
                                            </button>
                                        </form>

                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto hide-scroll pt-1">
                                            {(settings.adblockAllowlist || []).length === 0 ? (
                                                <span className={`text-[11px] italic py-1 ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                    No sites whitelisted. All sites are protected.
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
                                                            title="Remove from allowlist"
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Custom Blocked Domains */}
                                    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${
                                        isBright ? 'bg-white/75 border-black/[0.08]' : 'bg-white/[0.025] border-white/[0.05]'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-bold font-mono uppercase tracking-wider ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                Custom Blocked Domains
                                            </span>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                                isBright ? 'bg-black/5 text-zinc-600 border-black/10' : 'bg-white/5 text-white/50 border-white/10'
                                            }`}>
                                                {(settings.adblockCustomBlockedDomains || []).length} Blocked
                                            </span>
                                        </div>
                                        <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            Always block connections to these specific advertising or tracker hosts.
                                        </p>

                                        <form onSubmit={handleAddBlocklist} className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="e.g. ads.example.net"
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
                                                className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                                            >
                                                Add
                                            </button>
                                        </form>

                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto hide-scroll pt-1">
                                            {(settings.adblockCustomBlockedDomains || []).length === 0 ? (
                                                <span className={`text-[11px] italic py-1 ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                    No custom domains added. Using standard filter lists.
                                                </span>
                                            ) : (
                                                (settings.adblockCustomBlockedDomains || []).map((domain) => (
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
                                                            title="Remove from blocklist"
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* TAB 8: ABOUT & SYSTEM INFO */}
                    {settingsTab === 'ai' && (
                        <AIEngineSettings />
                    )}

                    {settingsTab === 'about' && (
                        <div className="animate-tab-fade space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">About & System Info</h3>
                                <p className="text-xs text-white/40">System architecture, runtime specifications, and app updates.</p>
                            </div>

                            {/* Account & Firebase Sync Card */}
                            <div className="p-6 bg-white/[0.025] border border-white/[0.05] rounded-3xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-accent-10 text-accent border border-accent-30 flex items-center justify-center font-bold text-lg">
                                            {user ? (user.email ? user.email.charAt(0).toUpperCase() : 'U') : <Lock size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-white flex items-center gap-2">
                                                {user ? user.email : 'Guest / Offline Mode'}
                                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${user ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/40'}`}>
                                                    {user ? 'AES-256 Encrypted' : 'Local Only'}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                {user ? `Last synced: ${lastSyncTime || 'Just now'} • ${syncedItemsCount || 24} items synced` : 'Sign in to sync your encrypted passwords, settings, and tabs across devices.'}
                                            </p>
                                        </div>
                                    </div>

                                    {user ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={syncNow}
                                                disabled={isSyncing}
                                                className="px-4 py-2 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    useSyncStore.getState().pushManualBackup('Manual Snapshot from Settings');
                                                }}
                                                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                                                title="Push Cloud Backup Version"
                                            >
                                                <UploadCloud size={13} className="text-accent" />
                                                Push Backup
                                            </button>
                                            <button
                                                onClick={logout}
                                                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openModal('auth')}
                                            className="px-5 py-2.5 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 cursor-pointer shadow-lg shadow-accent/20"
                                        >
                                            Sign In / Register
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Default Browser Management Card */}
                            <div className="p-6 bg-white/[0.025] border border-white/[0.05] rounded-3xl space-y-4 hover:border-accent-30 transition-all duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border p-2 ${
                                            isDefaultBrowser 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/10 shadow-lg' 
                                                : 'bg-accent-10 border-accent-30 shadow-sm'
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
                                            <h4 className="font-bold text-base text-white flex items-center gap-2">
                                                Default Web Browser
                                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                                    isDefaultBrowser 
                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                }`}>
                                                    {isDefaultBrowser ? 'Default Browser' : 'Not Default'}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                {isDefaultBrowser 
                                                    ? 'QBrowse is currently your primary browser for all web links, HTML documents, and protocol requests.' 
                                                    : 'Make QBrowse your default browser to open links from apps with Tor routing, sandboxed spaces, and encrypted sync.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!isDefaultBrowser && (
                                            <button
                                                onClick={handleSetDefaultBrowser}
                                                className="px-4 py-2 bg-accent text-black font-bold rounded-xl text-xs transition hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-accent/20 flex items-center gap-1.5"
                                            >
                                                <CheckCircle2 size={14} />
                                                Set as Default
                                            </button>
                                        )}
                                        <button
                                            onClick={handleOpenDefaultAppsSettings}
                                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/[0.06] rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                                            title="Open OS Default Apps Settings"
                                        >
                                            <ExternalLink size={13} />
                                            System Settings
                                        </button>
                                        <button
                                            onClick={refreshDefaultBrowserStatus}
                                            disabled={isCheckingDefault}
                                            className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/[0.06] rounded-xl text-xs transition cursor-pointer"
                                            title="Refresh status"
                                        >
                                            <RefreshCw size={14} className={isCheckingDefault ? 'animate-spin text-accent' : ''} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-white/70 font-medium">Check if QBrowse is default on startup</p>
                                        <span className="text-[10px] text-white/40">(Prompts banner if not default)</span>
                                    </div>
                                    <SettingToggle 
                                        isChecked={checkDefaultOnStartup} 
                                        onToggle={handleToggleStartupCheck} 
                                    />
                                </div>
                            </div>

                            {/* App Banner & GitHub Releases Auto-Updater */}
                            <div className="p-4 px-5 bg-white/[0.025] border border-white/[0.05] rounded-xl flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
                                            <img 
                                                src={qbrowseLogo} 
                                                alt="QBrowse" 
                                                className="w-full h-full object-contain rounded-lg drop-shadow" 
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
                                                }}
                                            />
                                            <span className="hidden text-white font-bold text-sm">QB</span>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-semibold text-white flex items-center gap-2 flex-wrap">
                                                QBrowse
                                                <span className="text-[10px] font-mono font-medium bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.06]">
                                                    v{String(currentAppVersion).replace(/^v/i, '')}
                                                </span>
                                                {updateData?.syncedWithGitHub && updateData?.latestVersion && (
                                                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border flex items-center gap-1 ${
                                                        updateData.status === 'available' || updateData.status === 'downloading' || updateData.status === 'downloaded'
                                                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                                    }`}>
                                                        <CheckCircle2 size={10} />
                                                        {updateData.status === 'available' || updateData.status === 'downloading' || updateData.status === 'downloaded'
                                                            ? `GitHub Release: v${String(updateData.latestVersion).replace(/^v/i, '')}`
                                                            : `Synced with GitHub (v${String(updateData.latestVersion).replace(/^v/i, '')})`}
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">
                                                {updateData?.status === 'error' && updateData?.message
                                                    ? `Update check notice: ${updateData.message}`
                                                    : updateData?.status === 'available'
                                                    ? `New version v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')} is available on GitHub Releases.`
                                                    : updateData?.status === 'downloaded'
                                                    ? `Update v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')} verified and ready to install.`
                                                    : 'Privacy-first multi-space desktop browser'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {updateData?.status === 'downloaded' ? (
                                            <button 
                                                onClick={async () => {
                                                    if (window.electronAPI?.quitAndInstallUpdate) {
                                                        showToast('Launching update installer...');
                                                        const res = await window.electronAPI.quitAndInstallUpdate();
                                                        if (res?.status === 'error') {
                                                            showToast('Install failed: ' + (res.message || 'Unknown error'));
                                                        }
                                                    } else {
                                                        showToast('Restarting to install update...');
                                                    }
                                                }}
                                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-2 border border-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 animate-pulse"
                                            >
                                                <CheckCircle2 size={13} />
                                                Restart & Update (v{String(updateData.latestVersion || updateData.version || currentAppVersion).replace(/^v/i, '')})
                                            </button>
                                        ) : updateData?.status === 'downloading' ? (
                                            <div className="flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                                                <RefreshCw size={12} className="animate-spin text-accent" />
                                                <span className="text-xs text-white/90 font-mono">
                                                    Downloading v{String(updateData.latestVersion || updateData.version || currentAppVersion).replace(/^v/i, '')} ({updateData.percent || 0}%)
                                                </span>
                                            </div>
                                        ) : updateData?.status === 'available' ? (
                                            <button 
                                                onClick={async () => {
                                                    if (window.electronAPI?.downloadUpdate) {
                                                        showToast(`Downloading QBrowse v${String(updateData.latestVersion || updateData.version).replace(/^v/i, '')}...`);
                                                        await window.electronAPI.downloadUpdate();
                                                    }
                                                }}
                                                className="px-3.5 py-1.5 bg-accent text-black font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95"
                                            >
                                                <Download size={13} />
                                                Download v{String(updateData.latestVersion || updateData.version).replace(/^v/i, '')}
                                            </button>
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
                                                            showToast('Update check failed: ' + (e?.message || e));
                                                        }
                                                    } else {
                                                        setTimeout(() => {
                                                            setIsCheckingUpdates(false);
                                                            showToast(`QBrowse is up to date! (v${String(currentAppVersion).replace(/^v/i, '')})`);
                                                        }, 1200);
                                                    }
                                                }}
                                                disabled={isCheckingUpdates}
                                                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-2 border border-white/[0.06] active:scale-95 disabled:opacity-50"
                                            >
                                                <RefreshCw size={12} className={isCheckingUpdates ? 'animate-spin' : ''} />
                                                {isCheckingUpdates ? 'Checking...' : 'Check Updates'}
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
                                            className="p-1.5 px-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border border-white/[0.06]"
                                            title="View QBrowse Releases on GitHub"
                                        >
                                            <ExternalLink size={12} />
                                            GitHub
                                        </button>
                                    </div>
                                </div>

                                {updateData?.status === 'downloading' && (
                                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-accent h-full transition-all duration-200 rounded-full"
                                            style={{ width: `${Math.max(2, Math.min(100, updateData.percent || 0))}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Engine Specifications Table */}
                            <div className="p-5 bg-white/[0.025] border border-white/[0.05] rounded-2xl flex flex-col gap-3">
                                <p className="font-semibold text-sm text-white/80">System Specifications</p>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Chromium Engine</span>
                                        <span className="font-mono font-semibold text-white">
                                            {updateData?.runtimeVersions?.chrome || '130.0.6723.117'}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Electron Platform</span>
                                        <span className="font-mono font-semibold text-white">
                                            {updateData?.runtimeVersions?.electron || '43.1.1'}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Node.js Runtime</span>
                                        <span className="font-mono font-semibold text-white">
                                            {updateData?.runtimeVersions?.node || '20.18.0'}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                        <span className="text-white/40">Architecture</span>
                                        <span className="font-mono font-semibold text-emerald-400">
                                            {window.electronAPI?.platform === 'linux' || navigator.userAgent.includes('Linux') ? 'Linux x64 (x86_64)' : window.electronAPI?.platform === 'darwin' || navigator.userAgent.includes('Mac') ? 'macOS (ARM/x64)' : 'Windows x64 (x86_64)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* System Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                    <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-xs text-emerald-300">SQLite History Sync</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">Encrypted local database active</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-accent/10 border border-accent-30 rounded-2xl flex items-center gap-3">
                                    <Layers size={20} className="text-accent flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-xs text-accent">Zen Workspace Engine</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">Personal, Work & Incognito spaces</p>
                                    </div>
                                </div>
                            </div>

                            {/* Experience & Onboarding Controls */}
                            <div className="p-5 bg-white/[0.025] border border-white/[0.05] rounded-2xl flex flex-col gap-3.5">
                                <p className="font-semibold text-sm text-white/80">Experience & Discovery</p>
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Volume2 size={16} className="text-accent" />
                                            <div>
                                                <p className="text-xs text-white/80 font-medium">Play startup welcome chime</p>
                                                <p className="text-[10px] text-white/40">Synthesized acoustic chord when launching the browser</p>
                                            </div>
                                        </div>
                                        <SettingToggle 
                                            isChecked={!!settings?.playStartupSound} 
                                            onToggle={() => toggleSetting('playStartupSound')} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <button
                                            onClick={() => {
                                                if (switchModal) {
                                                    switchModal('setup');
                                                } else {
                                                    closeModal();
                                                    setTimeout(() => openModal('setup'), 300);
                                                }
                                            }}
                                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-accent/40 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <RotateCcw size={13} className="text-accent" />
                                            <span>Relaunch Setup Journey</span>
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
                                            <span>Interactive Living Tour</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
