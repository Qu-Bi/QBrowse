import { 
    Sparkles, Code, ShieldCheck, Feather, PanelRight, PanelBottom,
    Layout, Layers, Sliders, Palette, Zap, Cpu, Bookmark,
    Terminal, Heart, Globe, Monitor, Smartphone, Compass, Eye, Shield
} from 'lucide-react';

export const PRESET_ICON_MAP = {
    Sparkles,
    Code,
    ShieldCheck,
    Feather,
    PanelRight,
    PanelBottom,
    Layout,
    Layers,
    Sliders,
    Palette,
    Zap,
    Cpu,
    Bookmark,
    Terminal,
    Heart,
    Globe,
    Monitor,
    Smartphone,
    Compass,
    Eye,
    Shield
};

export const getPresetIcon = (icon) => {
    if (!icon) return Sparkles;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
        return icon;
    }
    if (typeof icon === 'string' && PRESET_ICON_MAP[icon]) {
        return PRESET_ICON_MAP[icon];
    }
    return Sparkles;
};

export const STORAGE_KEY_CUSTOM_PRESETS = 'qbrowse_custom_presets';
export const STORAGE_KEY_ACTIVE_PRESET = 'qbrowse_active_preset';

export const EXPERIENCE_PRESETS = [
    {
        id: 'balanced',
        name: 'Balanced',
        tagline: 'Dual workspaces (Personal & Work), standard privacy, and Google search.',
        spacesSummary: 'Personal · Work',
        badge: 'Default',
        icon: Sparkles,
        theme: 'dark',
        accentColor: '#d4bc94',
        accentRgb: '212, 188, 148',
        accentName: 'Amber Gold',
        searchEngine: 'google',
        searchEngineName: 'Google',
        uiScale: 'comfortable',
        sidebarPosition: 'left',
        topBarPosition: 'top',
        toolHubPosition: 'right',
        omniboxStyle: 'capsule',
        frameCurvature: 'default',
        tabPresentation: 'pills',
        windowControlsStyle: 'mac',
        layoutTag: 'Top Bar · Left Sidebar',
        layoutSummary: 'Top Bar · Left Sidebar · Right ToolHub',
        isAdblockActive: true,
        adblockLevel: 'standard',
        isBuiltIn: true,
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
        ],
        highlights: ['Top Bar · Left Sidebar', 'Dual Workspaces', 'Google']
    },
    {
        id: 'developer',
        name: 'Developer',
        tagline: 'Multi-workspace isolation with GitHub Live PR tracking and dev flows.',
        spacesSummary: 'Personal · Work · Dev · Research',
        badge: 'Dev',
        icon: Code,
        theme: 'dark',
        accentColor: '#8b5cf6',
        accentRgb: '139, 92, 246',
        accentName: 'Royal Violet',
        searchEngine: 'google',
        searchEngineName: 'Google',
        uiScale: 'comfortable',
        sidebarPosition: 'left',
        topBarPosition: 'top',
        toolHubPosition: 'right',
        omniboxStyle: 'wide',
        frameCurvature: 'square',
        tabPresentation: 'compact',
        windowControlsStyle: 'windows',
        layoutTag: 'Top Bar · Left Sidebar',
        layoutSummary: 'Top Bar · Left Sidebar · Right ToolHub',
        isAdblockActive: true,
        adblockLevel: 'standard',
        isBuiltIn: true,
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'work', name: 'Work', icon: 'Briefcase', showGitHub: true, isBuiltIn: false },
            { id: 'dev', name: 'Development', icon: 'Code', showGitHub: true, isBuiltIn: false },
            { id: 'research', name: 'Research', icon: 'Compass', showGitHub: false, isBuiltIn: false }
        ],
        highlights: ['Top Bar · Left Sidebar', '4 Workspaces', 'GitHub Live PRs']
    },
    {
        id: 'classic_reverse',
        name: 'Modern Arc',
        tagline: 'Right-aligned navigation tree, mirrored drawer, and focused tab flow.',
        spacesSummary: 'Personal · Work',
        badge: 'Modern',
        icon: PanelRight,
        theme: 'dark',
        accentColor: '#0284c7',
        accentRgb: '2, 132, 199',
        accentName: 'Ocean Blue',
        searchEngine: 'google',
        searchEngineName: 'Google',
        uiScale: 'comfortable',
        sidebarPosition: 'right',
        topBarPosition: 'top',
        toolHubPosition: 'left',
        omniboxStyle: 'capsule',
        frameCurvature: 'cohesive',
        tabPresentation: 'cards',
        windowControlsStyle: 'mac',
        layoutTag: 'Top Bar · Right Sidebar',
        layoutSummary: 'Top Bar · Right Sidebar · Left ToolHub',
        isAdblockActive: true,
        adblockLevel: 'standard',
        isBuiltIn: true,
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
        ],
        highlights: ['Top Bar · Right Sidebar', 'Left ToolHub', 'Ocean Blue']
    },
    {
        id: 'bottom_bar',
        name: 'Ergonomic Flow',
        tagline: 'Bottom address bar navigation for thumb-friendly, ergonomic browsing flow.',
        spacesSummary: 'Personal · Work · Media',
        badge: 'Ergo',
        icon: PanelBottom,
        theme: 'dark',
        accentColor: '#f43f5e',
        accentRgb: '244, 63, 94',
        accentName: 'Rose Gold',
        searchEngine: 'duckduckgo',
        searchEngineName: 'DuckDuckGo',
        uiScale: 'comfortable',
        sidebarPosition: 'left',
        topBarPosition: 'bottom',
        toolHubPosition: 'right',
        omniboxStyle: 'minimal',
        frameCurvature: 'cohesive',
        tabPresentation: 'pills',
        windowControlsStyle: 'minimal',
        layoutTag: 'Bottom Bar · Left Sidebar',
        layoutSummary: 'Bottom Bar · Left Sidebar · Right ToolHub',
        isAdblockActive: true,
        adblockLevel: 'standard',
        isBuiltIn: true,
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false },
            { id: 'media', name: 'Media', icon: 'Sparkles', showGitHub: false, isBuiltIn: false }
        ],
        highlights: ['Bottom Bar · Left Sidebar', 'DuckDuckGo', 'Rose Gold']
    },
    {
        id: 'minimalist',
        name: 'Minimal Focus',
        tagline: 'Single workspace, right sidebar, compact interface, and clutter-free focus.',
        spacesSummary: 'Personal (Compact)',
        badge: 'Clean',
        icon: Feather,
        theme: 'dark',
        accentColor: '#94a3b8',
        accentRgb: '148, 163, 184',
        accentName: 'Slate Gray',
        searchEngine: 'brave',
        searchEngineName: 'Brave Search',
        uiScale: 'compact',
        sidebarPosition: 'right',
        topBarPosition: 'top',
        toolHubPosition: 'left',
        omniboxStyle: 'minimal',
        frameCurvature: 'square',
        tabPresentation: 'compact',
        windowControlsStyle: 'minimal',
        layoutTag: 'Top Bar · Right Sidebar',
        layoutSummary: 'Top Bar · Right Sidebar · Left ToolHub',
        isAdblockActive: true,
        adblockLevel: 'standard',
        isBuiltIn: true,
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true }
        ],
        highlights: ['Top Bar · Right Sidebar', 'Compact Chrome', 'Brave Search']
    },
    {
        id: 'privacy',
        name: 'Privacy Sentinel',
        tagline: 'Strict tracker protection, mirrored controls, DuckDuckGo, and instant Tor onion routing.',
        spacesSummary: 'Personal · Research · Tor',
        badge: 'Shield',
        icon: ShieldCheck,
        theme: 'dark',
        accentColor: '#10b981',
        accentRgb: '16, 185, 129',
        accentName: 'Cyber Emerald',
        searchEngine: 'duckduckgo',
        searchEngineName: 'DuckDuckGo',
        uiScale: 'comfortable',
        sidebarPosition: 'left',
        topBarPosition: 'top',
        toolHubPosition: 'right',
        omniboxStyle: 'wide',
        frameCurvature: 'cohesive',
        tabPresentation: 'pills',
        windowControlsStyle: 'mac',
        layoutTag: 'Top Bar · Left Sidebar',
        layoutSummary: 'Top Bar · Left Sidebar · Right ToolHub',
        isAdblockActive: true,
        adblockLevel: 'strict',
        isBuiltIn: true,
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'research', name: 'Research', icon: 'Compass', showGitHub: false, isBuiltIn: false }
        ],
        highlights: ['Top Bar · Left Sidebar', 'Right ToolHub', 'Tor Ready']
    }
];

export const loadCustomPresets = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        }
    } catch (_) {}
    return [];
};

export const saveCustomPresetsToStorage = (presets) => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(presets || []));
        }
    } catch (_) {}
};

export const getSavedPresetId = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET) || 'balanced';
        }
        return 'balanced';
    } catch (_) {
        return 'balanced';
    }
};

export const setSavedPresetId = (id) => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, id || 'balanced');
        }
    } catch (_) {}
};

export const getAllPresets = (customPresets = null) => {
    const custom = customPresets !== null ? customPresets : loadCustomPresets();
    return [...EXPERIENCE_PRESETS, ...(custom || [])];
};

export const findPresetById = (id, customPresets = null) => {
    if (!id) return null;
    const all = getAllPresets(customPresets);
    return all.find(p => p.id === id) || null;
};

export const applyExperiencePreset = (preset, { uiStore, tabStore, showToast } = {}) => {
    if (!preset) return;

    // Apply layout positions
    if (preset.sidebarPosition && uiStore?.setSettingValue) {
        uiStore.setSettingValue('sidebarPosition', preset.sidebarPosition);
    }
    if (preset.topBarPosition && uiStore?.setSettingValue) {
        uiStore.setSettingValue('topBarPosition', preset.topBarPosition);
    }
    if (preset.toolHubPosition && uiStore?.setSettingValue) {
        uiStore.setSettingValue('toolHubPosition', preset.toolHubPosition);
    }

    // Apply UI architecture styles
    if (preset.omniboxStyle && uiStore?.setSettingValue) {
        uiStore.setSettingValue('omniboxStyle', preset.omniboxStyle);
    }
    if (preset.frameCurvature && uiStore?.setSettingValue) {
        uiStore.setSettingValue('frameCurvature', preset.frameCurvature);
    }
    if (preset.tabPresentation && uiStore?.setSettingValue) {
        uiStore.setSettingValue('tabPresentation', preset.tabPresentation);
    }
    if (preset.windowControlsStyle && uiStore?.setSettingValue) {
        uiStore.setSettingValue('windowControlsStyle', preset.windowControlsStyle);
    }

    // Apply theme
    if (preset.theme && uiStore?.setTheme) {
        uiStore.setTheme(preset.theme);
    }

    // Apply accent color & CSS variables
    if (preset.accentColor && uiStore?.setAccentColor) {
        uiStore.setAccentColor(preset.accentColor);
        if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--accent', preset.accentColor);
            if (preset.accentRgb) {
                document.documentElement.style.setProperty('--accent-rgb', preset.accentRgb);
            }
        }
    }

    // Apply adblock & privacy level
    if (preset.isAdblockActive !== undefined && uiStore?.setIsAdblockActive) {
        uiStore.setIsAdblockActive(preset.isAdblockActive);
    }
    if (preset.adblockLevel && uiStore?.setSettingValue) {
        uiStore.setSettingValue('adblockLevel', preset.adblockLevel);
    }

    // Apply search engine & UI scale
    if (preset.searchEngine && uiStore?.setSettingValue) {
        uiStore.setSettingValue('searchEngine', preset.searchEngine);
    }
    if (preset.uiScale && uiStore?.setSettingValue) {
        uiStore.setSettingValue('uiScale', preset.uiScale);
    }

    // Apply custom spaces & reset active space to personal
    if (Array.isArray(preset.customSpaces) && uiStore?.reorderSpaces) {
        uiStore.reorderSpaces(preset.customSpaces);
        if (tabStore?.setActiveSpace) {
            tabStore.setActiveSpace('personal');
        }
    }

    // Persist active preset id in local storage and store
    setSavedPresetId(preset.id);
    if (uiStore?.setActivePresetId) {
        uiStore.setActivePresetId(preset.id);
    }

    if (showToast) {
        showToast(`Preset Applied: ${preset.name}`);
    }
};
