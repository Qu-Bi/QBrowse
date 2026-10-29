import { Sparkles, Code, ShieldCheck, Feather } from 'lucide-react';

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
        isAdblockActive: true,
        adblockLevel: 'standard',
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'work', name: 'Work', icon: 'Layers', showGitHub: true, isBuiltIn: false }
        ],
        highlights: ['Dual Workspaces', 'Standard Shields', 'Google']
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
        isAdblockActive: true,
        adblockLevel: 'standard',
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'work', name: 'Work', icon: 'Briefcase', showGitHub: true, isBuiltIn: false },
            { id: 'dev', name: 'Development', icon: 'Code', showGitHub: true, isBuiltIn: false },
            { id: 'research', name: 'Research', icon: 'Compass', showGitHub: false, isBuiltIn: false }
        ],
        highlights: ['4 Workspaces', 'GitHub Live PRs', 'Dev Focus']
    },
    {
        id: 'privacy',
        name: 'Privacy',
        tagline: 'Strict tracker protection, DuckDuckGo, and instant Tor onion routing.',
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
        isAdblockActive: true,
        adblockLevel: 'strict',
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true },
            { id: 'research', name: 'Research', icon: 'Compass', showGitHub: false, isBuiltIn: false }
        ],
        highlights: ['Strict Blocking', 'DuckDuckGo', 'Tor Ready']
    },
    {
        id: 'minimalist',
        name: 'Minimal',
        tagline: 'Single workspace, compact interface, and clutter-free focus.',
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
        isAdblockActive: true,
        adblockLevel: 'standard',
        customSpaces: [
            { id: 'personal', name: 'Personal', icon: 'User', showGitHub: false, isBuiltIn: true }
        ],
        highlights: ['Compact Chrome', 'Single Workspace', 'Brave']
    }
];

export const applyExperiencePreset = (preset, { uiStore, tabStore, showToast } = {}) => {
    if (!preset) return;

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

    // Persist active preset id in local storage
    try {
        localStorage.setItem('qbrowse_active_preset', preset.id);
    } catch (_) { }

    if (showToast) {
        showToast(`Preset Applied: ${preset.name}`);
    }
};

export const getSavedPresetId = () => {
    try {
        return localStorage.getItem('qbrowse_active_preset') || 'balanced';
    } catch (_) {
        return 'balanced';
    }
};

