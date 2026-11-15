import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, Sparkles, Layout, Layers, Sliders, Palette, Check, Copy, 
    Trash2, Edit3, Move, ArrowLeftRight, ArrowUpDown, Plus, 
    Monitor, RefreshCw, Sun, Moon, ShieldCheck, Feather, 
    PanelLeft, PanelRight, PanelBottom, Code, Terminal, Zap, Cpu, Bookmark, 
    Heart, Globe, Smartphone, Compass, Eye, Shield, Lock, Search,
    GripVertical, GripHorizontal, ChevronLeft, ChevronRight, RotateCcw,
    Minus, Square, Puzzle
} from 'lucide-react';
import useUIStore, { hexToRgbString } from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import PresetLayoutWireframe from '../common/PresetLayoutWireframe';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses } from '../common/ContextMenuProvider';
import { PRESET_FONTS, LETTER_SPACING_OPTIONS, applyAppFont } from '../../utils/appFontManager';
import { 
    EXPERIENCE_PRESETS, 
    applyExperiencePreset, 
    getPresetIcon, 
    PRESET_ICON_MAP 
} from '../../utils/experiencePresets';

const ACCENT_SWATCHES = [
    { name: 'Amber Gold', hex: '#d4bc94', rgb: '212, 188, 148' },
    { name: 'Ocean', hex: '#3b82f6', rgb: '59, 130, 246' },
    { name: 'Sky Blue', hex: '#0284c7', rgb: '2, 132, 199' },
    { name: 'Cyber Emerald', hex: '#10b981', rgb: '16, 185, 129' },
    { name: 'Royal Violet', hex: '#8b5cf6', rgb: '139, 92, 246' },
    { name: 'Rose Gold', hex: '#f43f5e', rgb: '244, 63, 94' },
    { name: 'Sunset Orange', hex: '#f97316', rgb: '249, 115, 22' },
    { name: 'Cyber Cyan', hex: '#06b6d4', rgb: '6, 182, 212' },
    { name: 'Slate Gray', hex: '#94a3b8', rgb: '148, 163, 184' }
];

const SELECTABLE_ICONS = [
    'Sparkles', 'Layout', 'Layers', 'Sliders', 'Palette', 
    'Code', 'Terminal', 'Zap', 'Cpu', 'ShieldCheck', 
    'Feather', 'Compass', 'Bookmark', 'Monitor', 'Globe', 'Heart'
];

// Sliding Glass Pill Switcher for Preset Studio controls
function StudioSlidingPillSwitcher({ options = [], value, onChange, isBright, size = 'sm' }) {
    const [hoveredId, setHoveredId] = useState(null);
    const activeIndex = Math.max(0, options.findIndex(o => o.id === value));
    const hoveredIndex = hoveredId !== null ? options.findIndex(o => o.id === hoveredId) : -1;
    const count = options.length || 1;

    const padding = 'p-1';
    const itemPy = size === 'sm' ? 'py-1.5' : 'py-2';
    const itemPx = size === 'sm' ? 'px-2' : 'px-3';
    const textSize = 'text-xs';

    return (
        <div 
            className={`relative grid items-center ${padding} rounded-full border backdrop-blur-xl transition-colors duration-200 select-none ${
                isBright ? 'bg-black/[0.04] border-black/[0.07]' : 'bg-black/40 border-white/[0.06]'
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
                        backgroundColor: isBright ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)'
                    }}
                />
            )}

            {/* Smoothly positioned active pill background */}
            <div 
                className="absolute top-1 bottom-1 left-1 rounded-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none shadow-sm"
                style={{
                    width: `calc((100% - 8px) / ${count})`,
                    transform: `translateX(${activeIndex * 100}%)`,
                    backgroundColor: isBright ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                    border: isBright ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: isBright 
                        ? '0 2px 8px rgba(0,0,0,0.08)' 
                        : '0 2px 10px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)'
                }}
            />

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
                                : (isBright ? 'text-zinc-600 hover:text-zinc-900 font-medium' : 'text-white/60 hover:text-white font-medium')
                        }`}
                    >
                        {Icon && <Icon size={12} className={isActive ? 'text-accent' : 'opacity-70'} />}
                        <span className="truncate">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function PresetStudioModal({ initialPresetId = null }) {
    const activeModal = useUIStore(state => state.activeModal);
    const closeModal = useUIStore(state => state.closeModal);
    const showToast = useUIStore(state => state.showToast);
    const currentTheme = useUIStore(state => state.theme);
    const currentAccentColor = useUIStore(state => state.accentColor);
    const currentAccentRgb = useUIStore(state => state.accentRgb);
    const settings = useUIStore(state => state.settings);
    const customPresets = useUIStore(state => state.customPresets) || [];
    const activePresetId = useUIStore(state => state.activePresetId);
    const saveCustomPreset = useUIStore(state => state.saveCustomPreset);
    const updateCustomPreset = useUIStore(state => state.updateCustomPreset);
    const deleteCustomPreset = useUIStore(state => state.deleteCustomPreset);
    const duplicatePreset = useUIStore(state => state.duplicatePreset);
    const captureCurrentAsPreset = useUIStore(state => state.captureCurrentAsPreset);
    const storeInitialPresetId = useUIStore(state => state.presetStudioInitialId);
    const setPresetStudioInitialId = useUIStore(state => state.setPresetStudioInitialId);

    const isSystemBright = currentTheme === 'light';

    // Tabs: 'studio' (Canvas & Customizer) | 'library' (Preset Manager)
    const [activeTab, setActiveTab] = useState('studio');

    // Live Draft State for the Studio Canvas
    const [draft, setDraft] = useState(() => {
        const initHex = currentAccentColor || '#d4bc94';
        return {
            sidebarPosition: settings?.sidebarPosition || 'left',
            sidebarStyle: settings?.sidebarStyle || 'classic',
            topBarPosition: settings?.topBarPosition || 'top',
            toolHubPosition: settings?.toolHubPosition || 'right',
            omniboxStyle: settings?.omniboxStyle || 'capsule',
            frameCurvature: settings?.frameCurvature || 'default',
            tabPresentation: settings?.tabPresentation || 'pills',
            windowControlsStyle: settings?.windowControlsStyle || 'mac',
            windowControlsOrder: settings?.windowControlsOrder || 'auto',
            theme: currentTheme || 'dark',
            accentColor: initHex,
            accentRgb: hexToRgbString(initHex),
            uiScale: settings?.uiScale || 'comfortable',
            appFontType: settings?.appFontType || 'default',
            appFontFamily: settings?.appFontFamily || 'default',
            appFontGoogleFamily: settings?.appFontGoogleFamily || '',
            appFontCustomName: settings?.appFontCustomName || '',
            appFontLetterSpacing: settings?.appFontLetterSpacing || 'normal',
            appFontSizeScale: typeof settings?.appFontSizeScale === 'number' ? settings.appFontSizeScale : 100,
            appFontWeightShift: settings?.appFontWeightShift || 'normal'
        };
    });

    // Keep draft typography synced with live edits made in the Typography tab
    useEffect(() => {
        setDraft(prev => ({
            ...prev,
            appFontType: settings?.appFontType || 'default',
            appFontFamily: settings?.appFontFamily || 'default',
            appFontGoogleFamily: settings?.appFontGoogleFamily || '',
            appFontCustomName: settings?.appFontCustomName || '',
            appFontLetterSpacing: settings?.appFontLetterSpacing || 'normal',
            appFontSizeScale: typeof settings?.appFontSizeScale === 'number' ? settings.appFontSizeScale : 100,
            appFontWeightShift: settings?.appFontWeightShift || 'normal'
        }));
    }, [
        settings?.appFontType,
        settings?.appFontFamily,
        settings?.appFontGoogleFamily,
        settings?.appFontCustomName,
        settings?.appFontLetterSpacing,
        settings?.appFontSizeScale,
        settings?.appFontWeightShift
    ]);

    // Resolve live preview font stack & spacing for MiniNavBar / MiniSidebar chrome
    const previewFontMeta = useMemo(() => {
        const type = draft.appFontType || 'default';
        const fam = draft.appFontFamily || 'default';
        const defaultStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

        if (type === 'default' || fam === 'default') {
            return { family: defaultStack, googleFamily: null, googleWeights: null };
        }
        if (type === 'preset') {
            const found = PRESET_FONTS.find(p => p.id === fam);
            if (found) {
                return {
                    family: found.family,
                    googleFamily: found.googleFamily || null,
                    googleWeights: found.googleWeights || '300;400;500;600;700;800;900'
                };
            }
        }
        if (type === 'google') {
            const g = (draft.appFontGoogleFamily || fam || '').trim();
            if (g) {
                return {
                    family: `"${g}", sans-serif`,
                    googleFamily: g,
                    googleWeights: '300;400;500;600;700;800;900'
                };
            }
        }
        if (type === 'system') {
            const s = (draft.appFontCustomName || fam || '').trim().replace(/^['"]|['"]$/g, '');
            if (s) {
                return {
                    family: `"${s}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
                    googleFamily: null,
                    googleWeights: null
                };
            }
        }
        if (type === 'file') {
            return { family: '"QBrowseCustomFont", sans-serif', googleFamily: null, googleWeights: null };
        }
        const fallbackPreset = PRESET_FONTS.find(p => p.id === fam);
        return {
            family: fallbackPreset ? fallbackPreset.family : (fam || defaultStack),
            googleFamily: fallbackPreset?.googleFamily || null,
            googleWeights: fallbackPreset?.googleWeights || null
        };
    }, [draft.appFontType, draft.appFontFamily, draft.appFontGoogleFamily, draft.appFontCustomName]);

    const resolvedPreviewSpacing = useMemo(() => {
        const opt = LETTER_SPACING_OPTIONS.find(o => o.id === draft.appFontLetterSpacing);
        return opt ? opt.value : '0em';
    }, [draft.appFontLetterSpacing]);

    // Load studio preview Google font without overwriting global active browser font
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById('qbrowse-studio-preview-font');
        if (!previewFontMeta.googleFamily) {
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
            return;
        }
        const cleanFamily = previewFontMeta.googleFamily.trim().replace(/^['"]|['"]$/g, '');
        const encodedFamily = cleanFamily.replace(/ /g, '+');
        const weights = previewFontMeta.googleWeights || '300;400;500;600;700;800;900';
        const href = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weights}&display=swap`;
        let link = existing;
        if (!link) {
            link = document.createElement('link');
            link.id = 'qbrowse-studio-preview-font';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        if (link.getAttribute('href') !== href) {
            link.setAttribute('href', href);
        }
        return () => {
            const el = document.getElementById('qbrowse-studio-preview-font');
            if (el && el.parentNode) el.parentNode.removeChild(el);
        };
    }, [previewFontMeta.googleFamily, previewFontMeta.googleWeights]);

    // Interactive Drag-and-Drop state
    const [draggedComponent, setDraggedComponent] = useState(null); // 'sidebar' | 'topbar' | 'toolhub'
    const [activeDropZone, setActiveDropZone] = useState(null); // 'top' | 'bottom' | 'left' | 'right'

    // Live Clock & Date for Live Preview
    const [previewTime, setPreviewTime] = useState(() => {
        return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    });
    const [previewDate, setPreviewDate] = useState(() => {
        return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const nextTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const nextDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
            setPreviewTime(prev => (prev === nextTime ? prev : nextTime));
            setPreviewDate(prev => (prev === nextDate ? prev : nextDate));
        }, 15000);
        return () => clearInterval(timer);
    }, []);

    // Save Preset Dialog State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [presetNameInput, setPresetNameInput] = useState('');
    const [presetDescInput, setPresetDescInput] = useState('');
    const [presetIconInput, setPresetIconInput] = useState('Sparkles');
    const [editingPresetId, setEditingPresetId] = useState(null);

    // Currently edited custom preset reference
    const editingPreset = useMemo(() => {
        if (!editingPresetId) return null;
        return customPresets.find(p => p.id === editingPresetId) || null;
    }, [editingPresetId, customPresets]);

    // Delete Confirmation
    const [presetToDelete, setPresetToDelete] = useState(null);

    // Library search & filter
    const [libraryFilter, setLibraryFilter] = useState('all'); // 'all' | 'builtin' | 'custom'
    const [librarySearch, setLibrarySearch] = useState('');

    const modalRef = useRef(null);
    const colorInputRef = useRef(null);

    const effectiveInitialId = initialPresetId || storeInitialPresetId;

    // Load initial preset if requested
    useEffect(() => {
        if (effectiveInitialId) {
            const all = [...EXPERIENCE_PRESETS, ...customPresets];
            const found = all.find(p => p.id === effectiveInitialId);
            if (found) {
                loadPresetIntoStudio(found, !!found.isCustom);
            }
        }
    }, [effectiveInitialId]);

    const handleCloseModal = () => {
        if (setPresetStudioInitialId) {
            setPresetStudioInitialId(null);
        }
        if (window.electronAPI?.setWindowCornerPreference) {
            window.electronAPI.setWindowCornerPreference(settings?.frameCurvature || 'default');
        }
        closeModal();
    };

    // Keyboard dismissal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isSaveModalOpen) {
                    setIsSaveModalOpen(false);
                } else if (presetToDelete) {
                    setPresetToDelete(null);
                } else {
                    handleCloseModal();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCloseModal, isSaveModalOpen, presetToDelete]);

    // Audio chime helper
    const playSnapAudio = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (_) {}
    };

    // Helper: update draft property
    const updateDraft = (key, value) => {
        setDraft(prev => ({ ...prev, [key]: value }));
        if (key === 'frameCurvature' && window.electronAPI?.setWindowCornerPreference) {
            window.electronAPI.setWindowCornerPreference(value);
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e, componentType) => {
        e.dataTransfer.setData('text/plain', componentType);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedComponent(componentType);
    };

    const handleDragEnd = () => {
        setDraggedComponent(null);
        setActiveDropZone(null);
    };

    const handleDragOver = (e, zone) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (activeDropZone !== zone) {
            setActiveDropZone(zone);
        }
    };

    const handleDragLeave = (e, zone) => {
        if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) {
            return;
        }
        if (activeDropZone === zone) {
            setActiveDropZone(null);
        }
    };

    const handleDrop = (e, zone) => {
        e.preventDefault();
        const componentType = e.dataTransfer.getData('text/plain') || draggedComponent;
        setDraggedComponent(null);
        setActiveDropZone(null);

        if (!componentType) return;

        if (componentType === 'topbar') {
            if (zone === 'top' || zone === 'bottom') {
                updateDraft('topBarPosition', zone);
                playSnapAudio();
            }
        } else if (componentType === 'sidebar') {
            if (zone === 'left' || zone === 'right') {
                updateDraft('sidebarPosition', zone);
                // If ToolHub was on the same side, flip ToolHub to opposite side
                if (draft.toolHubPosition === zone) {
                    updateDraft('toolHubPosition', zone === 'left' ? 'right' : 'left');
                }
                playSnapAudio();
            }
        } else if (componentType === 'toolhub') {
            if (zone === 'left' || zone === 'right') {
                updateDraft('toolHubPosition', zone);
                playSnapAudio();
            }
        }
    };

    // Swap actions for quick click fallback
    const swapSidebarPosition = () => {
        const next = draft.sidebarPosition === 'left' ? 'right' : 'left';
        updateDraft('sidebarPosition', next);
        if (draft.toolHubPosition === next) {
            updateDraft('toolHubPosition', next === 'left' ? 'right' : 'left');
        }
        playSnapAudio();
    };

    const swapTopBarPosition = () => {
        const next = draft.topBarPosition === 'top' ? 'bottom' : 'top';
        updateDraft('topBarPosition', next);
        playSnapAudio();
    };

    const swapToolHubPosition = () => {
        const next = draft.toolHubPosition === 'left' ? 'right' : 'left';
        updateDraft('toolHubPosition', next);
        playSnapAudio();
    };

    // Apply Draft to Browser
    const handleApplyToBrowser = () => {
        const uiStore = useUIStore.getState();

        const batchUpdates = {
            sidebarPosition: draft.sidebarPosition,
            sidebarStyle: draft.sidebarStyle,
            topBarPosition: draft.topBarPosition,
            toolHubPosition: draft.toolHubPosition,
            omniboxStyle: draft.omniboxStyle,
            frameCurvature: draft.frameCurvature,
            tabPresentation: draft.tabPresentation,
            windowControlsStyle: draft.windowControlsStyle,
            windowControlsOrder: draft.windowControlsOrder,
            uiScale: draft.uiScale,
            appFontType: draft.appFontType,
            appFontFamily: draft.appFontFamily,
            appFontGoogleFamily: draft.appFontGoogleFamily,
            appFontCustomName: draft.appFontCustomName,
            appFontLetterSpacing: draft.appFontLetterSpacing,
            appFontSizeScale: draft.appFontSizeScale,
            appFontWeightShift: draft.appFontWeightShift
        };

        if (uiStore.setSettingsBatch) {
            uiStore.setSettingsBatch(batchUpdates);
        } else {
            Object.entries(batchUpdates).forEach(([k, v]) => uiStore.setSettingValue(k, v));
        }

        applyAppFont({ ...settings, ...batchUpdates });

        if (draft.theme) {
            uiStore.setTheme(draft.theme);
        }
        if (draft.accentColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(draft.accentColor)) {
            uiStore.setAccentColor(draft.accentColor);
        }

        showToast('Layout applied to browser!');
        playSnapAudio();
    };

    // Reset draft to current active browser settings
    const handleResetDraft = () => {
        const s = settings || {};
        const hex = currentAccentColor || '#d4bc94';
        setDraft({
            sidebarPosition: s.sidebarPosition || 'left',
            sidebarStyle: s.sidebarStyle || 'classic',
            topBarPosition: s.topBarPosition || 'top',
            toolHubPosition: s.toolHubPosition || 'right',
            omniboxStyle: s.omniboxStyle || 'capsule',
            frameCurvature: s.frameCurvature || 'default',
            tabPresentation: s.tabPresentation || 'pills',
            windowControlsStyle: s.windowControlsStyle || 'mac',
            windowControlsOrder: s.windowControlsOrder || 'auto',
            theme: currentTheme || 'dark',
            accentColor: hex,
            accentRgb: hexToRgbString(hex),
            uiScale: s.uiScale || 'comfortable',
            appFontType: s.appFontType || 'default',
            appFontFamily: s.appFontFamily || 'default',
            appFontGoogleFamily: s.appFontGoogleFamily || '',
            appFontCustomName: s.appFontCustomName || '',
            appFontLetterSpacing: s.appFontLetterSpacing || 'normal',
            appFontSizeScale: typeof s.appFontSizeScale === 'number' ? s.appFontSizeScale : 100,
            appFontWeightShift: s.appFontWeightShift || 'normal'
        });
        showToast('Studio draft reset to browser setup');
    };

    // Load preset into Studio
    const loadPresetIntoStudio = (preset, isCustomEdit = false) => {
        const hex = preset.accentColor || '#d4bc94';
        const hasPresetFont = Boolean(preset.appFontType || preset.appFontFamily);
        setDraft({
            sidebarPosition: preset.sidebarPosition || 'left',
            sidebarStyle: preset.sidebarStyle || 'classic',
            topBarPosition: preset.topBarPosition || 'top',
            toolHubPosition: preset.toolHubPosition || 'right',
            omniboxStyle: preset.omniboxStyle || 'capsule',
            frameCurvature: preset.frameCurvature || 'default',
            tabPresentation: preset.tabPresentation || 'pills',
            windowControlsStyle: preset.windowControlsStyle || 'mac',
            windowControlsOrder: preset.windowControlsOrder || 'auto',
            theme: preset.theme || 'dark',
            accentColor: hex,
            accentRgb: preset.accentRgb || hexToRgbString(hex),
            uiScale: preset.uiScale || 'comfortable',
            appFontType: hasPresetFont ? (preset.appFontType || 'preset') : (settings?.appFontType || 'default'),
            appFontFamily: hasPresetFont ? (preset.appFontFamily || 'default') : (settings?.appFontFamily || 'default'),
            appFontGoogleFamily: hasPresetFont ? (preset.appFontGoogleFamily || '') : (settings?.appFontGoogleFamily || ''),
            appFontCustomName: hasPresetFont ? (preset.appFontCustomName || '') : (settings?.appFontCustomName || ''),
            appFontLetterSpacing: hasPresetFont ? (preset.appFontLetterSpacing || 'normal') : (settings?.appFontLetterSpacing || 'normal'),
            appFontSizeScale: hasPresetFont ? (preset.appFontSizeScale ?? 100) : (settings?.appFontSizeScale ?? 100),
            appFontWeightShift: hasPresetFont ? (preset.appFontWeightShift || 'normal') : (settings?.appFontWeightShift || 'normal')
        });
        if (isCustomEdit || preset.isCustom) {
            setEditingPresetId(preset.id);
        } else {
            setEditingPresetId(null);
        }
        setActiveTab('studio');
        showToast(isCustomEdit || preset.isCustom 
            ? `Editing "${preset.name}" in Studio` 
            : `Loaded "${preset.name}" into Studio Canvas`
        );
    };

    // Open Save Dialog
    const openSaveDialog = (existingPreset = null) => {
        if (existingPreset) {
            setEditingPresetId(existingPreset.id);
            setPresetNameInput(existingPreset.name || '');
            setPresetDescInput(existingPreset.tagline || '');
            setPresetIconInput(typeof existingPreset.icon === 'string' ? existingPreset.icon : 'Sparkles');
        } else {
            setPresetNameInput(`${draft.topBarPosition === 'bottom' ? 'Bottom' : 'Top'} ${draft.sidebarPosition === 'right' ? 'Arc' : 'Flow'}`);
            setPresetDescInput(`Custom layout: ${draft.topBarPosition === 'bottom' ? 'Bottom Bar' : 'Top Bar'}, ${draft.sidebarPosition === 'right' ? 'Right Sidebar' : 'Left Sidebar'}, ${draft.tabPresentation} tabs`);
            setPresetIconInput('Sparkles');
        }
        setIsSaveModalOpen(true);
    };

    // In-place save changes to currently edited custom preset
    const handleSaveChanges = () => {
        if (!editingPresetId) {
            openSaveDialog(null);
            return;
        }
        const existing = customPresets.find(p => p.id === editingPresetId);
        const name = existing?.name || presetNameInput.trim() || 'Custom Preset';
        const tagline = existing?.tagline || presetDescInput.trim() || 'Custom user configuration';
        const icon = existing?.icon || 'Sparkles';

        const layoutTag = `${draft.topBarPosition === 'bottom' ? 'Bottom Bar' : 'Top Bar'} · ${draft.sidebarPosition === 'right' ? 'Right Sidebar' : 'Left Sidebar'}`;
        const layoutSummary = `${layoutTag} · ${draft.toolHubPosition === 'left' ? 'Left ToolHub' : 'Right ToolHub'}`;

        const updates = {
            name,
            tagline,
            icon,
            theme: draft.theme,
            accentColor: draft.accentColor,
            accentRgb: draft.accentRgb,
            sidebarPosition: draft.sidebarPosition,
            sidebarStyle: draft.sidebarStyle,
            topBarPosition: draft.topBarPosition,
            toolHubPosition: draft.toolHubPosition,
            omniboxStyle: draft.omniboxStyle,
            frameCurvature: draft.frameCurvature,
            tabPresentation: draft.tabPresentation,
            windowControlsStyle: draft.windowControlsStyle,
            windowControlsOrder: draft.windowControlsOrder,
            uiScale: draft.uiScale,
            appFontType: draft.appFontType || settings?.appFontType || 'default',
            appFontFamily: draft.appFontFamily || settings?.appFontFamily || 'default',
            appFontGoogleFamily: draft.appFontGoogleFamily || settings?.appFontGoogleFamily || '',
            appFontCustomName: draft.appFontCustomName || settings?.appFontCustomName || '',
            appFontLetterSpacing: draft.appFontLetterSpacing || settings?.appFontLetterSpacing || 'normal',
            appFontSizeScale: draft.appFontSizeScale ?? settings?.appFontSizeScale ?? 100,
            appFontWeightShift: draft.appFontWeightShift || settings?.appFontWeightShift || 'normal',
            layoutTag,
            layoutSummary,
            highlights: [
                layoutTag,
                draft.tabPresentation.charAt(0).toUpperCase() + draft.tabPresentation.slice(1) + ' Tabs',
                draft.uiScale === 'compact' ? 'Compact Scale' : 'Comfortable Scale'
            ]
        };

        updateCustomPreset(editingPresetId, updates);
        playSnapAudio();
    };

    // Save as new preset (clears editingPresetId)
    const handleSaveAsNew = () => {
        setEditingPresetId(null);
        openSaveDialog(null);
    };

    // Handle Save Custom Preset
    const handleSavePreset = (e) => {
        e?.preventDefault();
        const trimmedName = presetNameInput.trim() || 'Custom Preset';
        const trimmedDesc = presetDescInput.trim() || 'Custom user configuration';

        const layoutTag = `${draft.topBarPosition === 'bottom' ? 'Bottom Bar' : 'Top Bar'} · ${draft.sidebarPosition === 'right' ? 'Right Sidebar' : 'Left Sidebar'}`;
        const layoutSummary = `${layoutTag} · ${draft.toolHubPosition === 'left' ? 'Left ToolHub' : 'Right ToolHub'}`;

        const presetPayload = {
            name: trimmedName,
            tagline: trimmedDesc,
            icon: presetIconInput || 'Sparkles',
            theme: draft.theme,
            accentColor: draft.accentColor,
            accentRgb: draft.accentRgb,
            sidebarPosition: draft.sidebarPosition,
            sidebarStyle: draft.sidebarStyle,
            topBarPosition: draft.topBarPosition,
            toolHubPosition: draft.toolHubPosition,
            omniboxStyle: draft.omniboxStyle,
            frameCurvature: draft.frameCurvature,
            tabPresentation: draft.tabPresentation,
            windowControlsStyle: draft.windowControlsStyle,
            windowControlsOrder: draft.windowControlsOrder,
            uiScale: draft.uiScale,
            appFontType: draft.appFontType || settings?.appFontType || 'default',
            appFontFamily: draft.appFontFamily || settings?.appFontFamily || 'default',
            appFontGoogleFamily: draft.appFontGoogleFamily || settings?.appFontGoogleFamily || '',
            appFontCustomName: draft.appFontCustomName || settings?.appFontCustomName || '',
            appFontLetterSpacing: draft.appFontLetterSpacing || settings?.appFontLetterSpacing || 'normal',
            appFontSizeScale: draft.appFontSizeScale ?? settings?.appFontSizeScale ?? 100,
            appFontWeightShift: draft.appFontWeightShift || settings?.appFontWeightShift || 'normal',
            layoutTag,
            layoutSummary,
            spacesSummary: 'Personal · Work',
            isCustom: true,
            badge: 'Custom',
            highlights: [
                layoutTag,
                draft.tabPresentation.charAt(0).toUpperCase() + draft.tabPresentation.slice(1) + ' Tabs',
                draft.uiScale === 'compact' ? 'Compact Scale' : 'Comfortable Scale'
            ]
        };

        if (editingPresetId) {
            updateCustomPreset(editingPresetId, presetPayload);
        } else {
            saveCustomPreset(presetPayload);
        }

        setIsSaveModalOpen(false);
    };

    // Delete custom preset
    const confirmDeletePreset = () => {
        if (!presetToDelete) return;
        const id = presetToDelete.id;
        deleteCustomPreset(id);
        if (editingPresetId === id) {
            setEditingPresetId(null);
        }
        setPresetToDelete(null);
    };

    // Duplicate preset
    const handleDuplicate = (preset) => {
        duplicatePreset(preset.id);
    };

    // Capture active browser state directly into library
    const handleCaptureCurrent = () => {
        const captured = captureCurrentAsPreset();
        saveCustomPreset(captured);
    };

    // Filter library presets
    const allPresets = useMemo(() => {
        return [...EXPERIENCE_PRESETS, ...customPresets];
    }, [customPresets]);

    const filteredPresets = useMemo(() => {
        return allPresets.filter(p => {
            if (libraryFilter === 'builtin' && p.isCustom) return false;
            if (libraryFilter === 'custom' && !p.isCustom) return false;
            if (librarySearch.trim()) {
                const q = librarySearch.toLowerCase();
                const matchName = (p.name || '').toLowerCase().includes(q);
                const matchTag = (p.tagline || '').toLowerCase().includes(q);
                const matchLayout = (p.layoutTag || '').toLowerCase().includes(q);
                return matchName || matchTag || matchLayout;
            }
            return true;
        });
    }, [allPresets, libraryFilter, librarySearch]);

    // Curvature classes for the mini frame
    const getCurvatureClass = (curvature) => {
        switch (curvature) {
            case 'square':
            case 'sharp':
                return 'rounded-none';
            case 'cohesive':
                return 'rounded-[18px]';
            default:
                return 'rounded-2xl';
        }
    };

    const isCompactScale = draft.uiScale === 'compact';
    const isSquareFrame = draft.frameCurvature === 'square' || draft.frameCurvature === 'sharp';
    const isCohesiveFrame = draft.frameCurvature === 'cohesive';
    const isSidebarHidden = draft.sidebarStyle === 'hidden';
    const isSidebarCompact = draft.sidebarStyle === 'compact';
    const showLeftSidebar = draft.sidebarPosition === 'left' && !isSidebarHidden;
    const showRightSidebar = draft.sidebarPosition === 'right' && !isSidebarHidden;
    const showTopBar = draft.topBarPosition === 'top';
    const showBottomBar = draft.topBarPosition === 'bottom';
    const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘ K' : 'Ctrl K';

    return (
        <div 
            className="fixed inset-0 z-[50000] flex items-center justify-center p-3 sm:p-5 select-none"
            style={{ overscrollBehavior: 'contain' }}
            onClick={(e) => {
                if (modalRef.current && !modalRef.current.contains(e.target)) {
                    handleCloseModal();
                }
            }}
        >
            {/* Ambient Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-2xl transition-opacity animate-fade-in" />

            {/* Studio Window Card */}
            <div 
                ref={modalRef}
                className={`relative w-full max-w-6xl h-[92vh] max-h-[860px] min-h-[620px] rounded-[32px] border flex flex-col overflow-hidden animate-pop-in ${getLiquidGlassSurfaceClasses(isSystemBright)} ${
                    isSystemBright ? 'text-zinc-900' : 'text-white'
                }`}
                style={getLiquidGlassInlineStyle(isSystemBright)}
            >
                {/* STUDIO HEADER */}
                <header className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
                    isSystemBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                }`}>
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 bg-accent/20 border-accent/40 text-accent"
                        >
                            <Sliders size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight">Preset Studio</h2>
                            </div>
                            <p className={`text-xs ${isSystemBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Visually re-dock components, sculpt curvatures, customize themes, and manage custom presets.
                            </p>
                        </div>
                    </div>

                    {/* Mode Navigation Tabs: 2 Tabs on a Single-Row Pill */}
                    <div className="flex items-center gap-2">
                        <div className={`relative p-1 rounded-full border grid grid-cols-2 items-center select-none w-60 sm:w-64 backdrop-blur-xl ${
                            isSystemBright ? 'bg-black/[0.04] border-black/[0.07]' : 'bg-black/40 border-white/[0.06]'
                        }`}>
                            {/* Animated Morphing Pill Indicator */}
                            <div 
                                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none shadow-sm ${
                                    isSystemBright 
                                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/[0.08]' 
                                        : 'bg-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.3)] border border-white/[0.10]'
                                }`}
                                style={{ 
                                    transform: activeTab === 'library' ? 'translateX(100%)' : 'translateX(0)'
                                }} 
                            />

                            <button
                                type="button"
                                onClick={() => setActiveTab('studio')}
                                className={`relative z-10 px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-95 outline-none ${
                                    activeTab === 'studio'
                                        ? (isSystemBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                        : (isSystemBright ? 'text-zinc-600 hover:text-zinc-950 font-medium' : 'text-white/60 hover:text-white font-medium')
                                }`}
                            >
                                <Layout size={13} className="shrink-0" />
                                <span className="whitespace-nowrap truncate">Canvas</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('library')}
                                className={`relative z-10 px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-95 outline-none ${
                                    activeTab === 'library'
                                        ? (isSystemBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                        : (isSystemBright ? 'text-zinc-600 hover:text-zinc-950 font-medium' : 'text-white/60 hover:text-white font-medium')
                                }`}
                            >
                                <Bookmark size={13} className="shrink-0" />
                                <span className="whitespace-nowrap truncate">Presets</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors shrink-0 ${
                                    activeTab === 'library' 
                                        ? (isSystemBright ? 'bg-black/10 text-zinc-900 font-bold' : 'bg-white/20 text-white font-bold') 
                                        : (isSystemBright ? 'bg-black/5 text-zinc-500' : 'bg-white/5 text-zinc-400')
                                }`}>
                                    {allPresets.length}
                                </span>
                            </button>
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            aria-label="Close Preset Studio"
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                isSystemBright 
                                    ? 'border-black/[0.07] hover:border-black/[0.12] hover:bg-black/5 text-zinc-600 hover:text-zinc-900' 
                                    : 'border-white/[0.06] hover:border-white/[0.10] hover:bg-white/10 text-zinc-400 hover:text-white'
                            }`}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </header>

                {/* MAIN CONTENT AREA */}
                {activeTab === 'studio' ? (
                    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                        
                        {/* LEFT: THE INTERACTIVE VISUAL MINI BROWSER CANVAS */}
                        <div className={`flex-1 p-5 md:p-6 flex flex-col justify-between overflow-y-auto hide-scroll relative ${
                            isSystemBright ? 'bg-black/[0.02]' : 'bg-white/[0.02]'
                        }`}>
                            {/* MINIATURE DESKTOP MONITOR & WORKSPACE CANVAS */}
                            <div className="flex-1 flex items-center justify-center p-2 min-h-[380px]">
                                <div 
                                    className={`relative w-full max-w-3xl aspect-[16/10] max-h-[460px] ${
                                        isSquareFrame ? 'rounded-none' : isCohesiveFrame ? 'rounded-[22px]' : 'rounded-3xl'
                                    } ${
                                        isCohesiveFrame ? 'p-2' : isCompactScale ? 'p-2.5' : 'p-3'
                                    } shadow-2xl border transition-all duration-300 flex overflow-hidden ${
                                        isSystemBright 
                                            ? 'bg-gradient-to-br from-zinc-200 via-stone-100 to-zinc-300 border-black/[0.07]' 
                                            : 'bg-gradient-to-br from-[#121524] via-[#0b0d18] to-[#15192b] border-white/[0.06]'
                                    }`}
                                    style={{
                                        '--accent': draft.accentColor || '#d4bc94',
                                        '--accent-rgb': hexToRgbString(draft.accentColor || '#d4bc94'),
                                        '--accent-10': `rgba(${hexToRgbString(draft.accentColor || '#d4bc94')}, 0.1)`,
                                        '--accent-15': `rgba(${hexToRgbString(draft.accentColor || '#d4bc94')}, 0.15)`,
                                        '--accent-20': `rgba(${hexToRgbString(draft.accentColor || '#d4bc94')}, 0.2)`,
                                        '--accent-30': `rgba(${hexToRgbString(draft.accentColor || '#d4bc94')}, 0.3)`,
                                        '--accent-40': `rgba(${hexToRgbString(draft.accentColor || '#d4bc94')}, 0.4)`,
                                        fontFamily: previewFontMeta.family,
                                        letterSpacing: resolvedPreviewSpacing
                                    }}
                                >
                                    {/* Ambient Wallpaper Glow */}
                                    <div 
                                        className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-30"
                                        style={{ backgroundColor: draft.accentColor }}
                                    />
                                    <div 
                                        className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
                                        style={{ backgroundColor: draft.accentColor }}
                                    />

                                    {/* FULL-HEIGHT SIDEBAR + MAIN COLUMN (TOPBAR + VIEWPORT + BOTTOM DOCK) */}
                                    <div className={`flex-1 flex min-w-0 min-h-0 relative z-20 ${
                                        isCohesiveFrame ? 'gap-1.5' : isCompactScale ? 'gap-1.5' : 'gap-2'
                                    }`}>

                                        {/* LEFT ZONE: CAN HOLD FULL-HEIGHT SIDEBAR OR DOCK TARGET */}
                                        {(showLeftSidebar || draggedComponent === 'sidebar') && (
                                            <div 
                                                onDragOver={(e) => handleDragOver(e, 'left')}
                                                onDragLeave={(e) => handleDragLeave(e, 'left')}
                                                onDrop={(e) => handleDrop(e, 'left')}
                                                className={`transition-all duration-300 flex flex-col shrink-0 h-full ${
                                                    showLeftSidebar
                                                        ? (isSidebarCompact ? 'w-14 z-30' : 'w-44 z-30')
                                                        : `${isSquareFrame ? 'rounded-none' : 'rounded-2xl'} w-44 border backdrop-blur-xl shadow-[0_0_20px_rgba(var(--accent-rgb),0.18)] flex items-center justify-center ${
                                                            activeDropZone === 'left'
                                                                ? 'border-accent/70 bg-accent/15'
                                                                : 'border-accent/40 bg-accent/[0.08]'
                                                        }`
                                                }`}
                                            >
                                                {showLeftSidebar ? (
                                                    <MiniSidebar 
                                                        draft={draft} 
                                                        onDragStart={(e) => handleDragStart(e, 'sidebar')}
                                                        onDragEnd={handleDragEnd}
                                                        onSwap={swapSidebarPosition}
                                                        isBright={draft.theme === 'light'}
                                                        previewFont={previewFontMeta.family}
                                                        previewSpacing={resolvedPreviewSpacing}
                                                    />
                                                ) : (
                                                    <span className="text-[11px] font-mono font-medium text-accent text-center px-2 flex flex-col items-center gap-1.5 drop-shadow-sm">
                                                        <ArrowLeftRight size={14} className="animate-pulse" />
                                                        <span>Dock Sidebar on Left</span>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* MAIN COLUMN: TOPBAR + VIEWPORT FRAME + BOTTOMBAR */}
                                        <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${
                                            isCohesiveFrame ? 'gap-1' : isCompactScale ? 'gap-1.5' : 'gap-2'
                                        }`}>
                                            {/* DOCK TARGET: TOP BAR DROP ZONE */}
                                            {(showTopBar || draggedComponent === 'topbar') && (
                                                <div 
                                                    onDragOver={(e) => handleDragOver(e, 'top')}
                                                    onDragLeave={(e) => handleDragLeave(e, 'top')}
                                                    onDrop={(e) => handleDrop(e, 'top')}
                                                    className={`w-full transition-all duration-200 ${isSquareFrame ? 'rounded-none' : 'rounded-xl'} relative shrink-0 ${
                                                        showTopBar
                                                            ? 'z-30'
                                                            : `h-9 border backdrop-blur-xl shadow-[0_0_20px_rgba(var(--accent-rgb),0.18)] flex items-center justify-center z-40 ${
                                                                activeDropZone === 'top'
                                                                    ? 'border-accent/70 bg-accent/15'
                                                                    : 'border-accent/40 bg-accent/[0.08]'
                                                            }`
                                                    }`}
                                                >
                                                    {showTopBar ? (
                                                        <MiniNavBar 
                                                            draft={draft}
                                                            onDragStart={(e) => handleDragStart(e, 'topbar')}
                                                            onDragEnd={handleDragEnd}
                                                            onSwap={swapTopBarPosition}
                                                            isBright={draft.theme === 'light'}
                                                            previewFont={previewFontMeta.family}
                                                            previewSpacing={resolvedPreviewSpacing}
                                                        />
                                                    ) : (
                                                        <span className="text-[11px] font-mono font-medium text-accent flex items-center gap-1.5 drop-shadow-sm">
                                                            <ArrowUpDown size={12} className="animate-bounce" />
                                                            <span>Dock Navigation Bar at Top</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* CENTER: BROWSER VIEWPORT FRAME */}
                                            <div className={`flex-1 min-h-0 relative flex flex-col overflow-hidden border shadow-inner transition-all duration-300 ${
                                                getCurvatureClass(draft.frameCurvature)
                                            } ${
                                                isCohesiveFrame
                                                    ? (draft.theme === 'light' ? 'ring-1 ring-inset ring-black/[0.06]' : 'ring-1 ring-inset ring-white/[0.08]')
                                                    : ''
                                            } ${
                                                draft.theme === 'light'
                                                    ? 'bg-gradient-to-b from-white via-zinc-50/80 to-zinc-100/90 border-black/[0.07] text-zinc-900'
                                                    : 'bg-gradient-to-b from-[#0d0f17] via-[#090b12] to-[#0d0e16] border-white/[0.06] text-white'
                                            }`}>
                                                {/* Subtle Ambient Background Mesh in Viewport */}
                                                <div 
                                                    className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
                                                    style={{ backgroundColor: draft.accentColor }}
                                                />

                                                {/* Authentic QBrowse Signature Start Page */}
                                                <div className={`flex-1 ${isCompactScale ? 'p-3' : 'p-4'} flex flex-col items-center justify-center relative z-10 select-none`}>
                                                    <div className={`flex flex-col items-center w-full transition-transform duration-300 ${
                                                        isCompactScale ? 'scale-[0.92]' : 'scale-100'
                                                    }`}>
                                                        {/* Minimal Date Header */}
                                                        <span className={`text-[9px] font-semibold uppercase tracking-widest mb-1 ${
                                                            draft.theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'
                                                        }`}>
                                                            {previewDate}
                                                        </span>

                                                        {/* Apple-grade Live Clock Digits (isolated from app font via .qbrowse-hero-clock) */}
                                                        <h1 className={`qbrowse-hero-clock text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${
                                                            draft.theme === 'light'
                                                                ? 'from-zinc-900 via-zinc-800 to-zinc-600'
                                                                : 'from-white via-white/95 to-white/70'
                                                        } leading-none mb-3.5`}>
                                                            {previewTime}
                                                        </h1>

                                                        {/* Sleek Translucent Search Pill */}
                                                        <div className={`w-full max-w-xs h-7 px-3 ${isSquareFrame ? 'rounded-none' : 'rounded-full'} border flex items-center justify-between gap-2 text-[10px] backdrop-blur-md transition-all shadow-sm ${
                                                            draft.theme === 'light'
                                                                ? 'bg-black/[0.035] border-black/[0.07] text-zinc-500 hover:border-black/[0.12]'
                                                                : 'bg-white/[0.05] border-white/[0.06] text-white/50 hover:border-white/[0.10]'
                                                        }`}>
                                                            <div className="flex items-center gap-2 min-w-0 truncate">
                                                                <Search size={11} className="opacity-60 shrink-0" />
                                                                <span className="truncate">Search the web, or type a command...</span>
                                                            </div>
                                                            <kbd className={`px-1.5 py-0.5 rounded text-[9px] font-mono tracking-normal leading-none whitespace-nowrap border font-semibold shrink-0 select-none ${
                                                                draft.theme === 'light'
                                                                    ? 'bg-black/[0.04] border-black/[0.07] text-zinc-600'
                                                                    : 'bg-white/10 border-white/[0.10] text-white/70'
                                                            }`}>
                                                                {shortcutLabel}
                                                            </kbd>
                                                        </div>
                                                    </div>

                                                    {/* Authentic Sleek ToolHub Glass Pill Indicator on Active Side */}
                                                    <div 
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, 'toolhub')}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={swapToolHubPosition}
                                                        title={`ToolHub Dock: ${draft.toolHubPosition.toUpperCase()} (Click or drag to swap)`}
                                                        className={`absolute top-1/2 -translate-y-1/2 ${
                                                            draft.toolHubPosition === 'left' ? 'left-1.5' : 'right-1.5'
                                                        } ${isCompactScale ? 'w-3.5 h-8' : 'w-4 h-10'} rounded-full border backdrop-blur-xl flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing transition-all duration-300 shadow-md group hover:scale-105 active:scale-95 ${
                                                            draft.theme === 'light'
                                                                ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/[0.07] hover:border-black/[0.12] text-zinc-700'
                                                                : 'bg-white/[0.07] hover:bg-white/[0.12] border-white/[0.08] hover:border-white/[0.14] text-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                                                        }`}
                                                    >
                                                        <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                                                        <Zap size={9} className="text-accent transition-transform group-hover:scale-110" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DOCK TARGET: BOTTOM BAR DROP ZONE */}
                                            {(showBottomBar || draggedComponent === 'topbar') && (
                                                <div 
                                                    onDragOver={(e) => handleDragOver(e, 'bottom')}
                                                    onDragLeave={(e) => handleDragLeave(e, 'bottom')}
                                                    onDrop={(e) => handleDrop(e, 'bottom')}
                                                    className={`w-full transition-all duration-200 ${isSquareFrame ? 'rounded-none' : 'rounded-xl'} relative shrink-0 ${
                                                        showBottomBar
                                                            ? 'z-30'
                                                            : `h-9 border backdrop-blur-xl shadow-[0_0_20px_rgba(var(--accent-rgb),0.18)] flex items-center justify-center z-40 ${
                                                                activeDropZone === 'bottom'
                                                                    ? 'border-accent/70 bg-accent/15'
                                                                    : 'border-accent/40 bg-accent/[0.08]'
                                                            }`
                                                    }`}
                                                >
                                                    {showBottomBar ? (
                                                        <MiniNavBar 
                                                            draft={draft}
                                                            onDragStart={(e) => handleDragStart(e, 'topbar')}
                                                            onDragEnd={handleDragEnd}
                                                            onSwap={swapTopBarPosition}
                                                            isBright={draft.theme === 'light'}
                                                            previewFont={previewFontMeta.family}
                                                            previewSpacing={resolvedPreviewSpacing}
                                                        />
                                                    ) : (
                                                        <span className="text-[11px] font-mono font-medium text-accent flex items-center gap-1.5 drop-shadow-sm">
                                                            <ArrowUpDown size={12} className="animate-bounce" />
                                                            <span>Dock Navigation Bar at Bottom</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT ZONE: CAN HOLD FULL-HEIGHT SIDEBAR OR DOCK TARGET */}
                                        {(showRightSidebar || draggedComponent === 'sidebar') && (
                                            <div 
                                                onDragOver={(e) => handleDragOver(e, 'right')}
                                                onDragLeave={(e) => handleDragLeave(e, 'right')}
                                                onDrop={(e) => handleDrop(e, 'right')}
                                                className={`transition-all duration-300 flex flex-col shrink-0 h-full ${
                                                    showRightSidebar
                                                        ? (isSidebarCompact ? 'w-14 z-30' : 'w-44 z-30')
                                                        : `${isSquareFrame ? 'rounded-none' : 'rounded-2xl'} w-44 border backdrop-blur-xl shadow-[0_0_20px_rgba(var(--accent-rgb),0.18)] flex items-center justify-center ${
                                                            activeDropZone === 'right'
                                                                ? 'border-accent/70 bg-accent/15'
                                                                : 'border-accent/40 bg-accent/[0.08]'
                                                        }`
                                                }`}
                                            >
                                                {showRightSidebar ? (
                                                    <MiniSidebar 
                                                        draft={draft} 
                                                        onDragStart={(e) => handleDragStart(e, 'sidebar')}
                                                        onDragEnd={handleDragEnd}
                                                        onSwap={swapSidebarPosition}
                                                        isBright={draft.theme === 'light'}
                                                        previewFont={previewFontMeta.family}
                                                        previewSpacing={resolvedPreviewSpacing}
                                                    />
                                                ) : (
                                                    <span className="text-[11px] font-mono font-medium text-accent text-center px-2 flex flex-col items-center gap-1.5 drop-shadow-sm">
                                                        <ArrowLeftRight size={14} className="animate-pulse" />
                                                        <span>Dock Sidebar on Right</span>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                    </div>

                                </div>
                            </div>

                            {/* Canvas Bottom Legend */}
                            <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono shrink-0 ${
                                isSystemBright ? 'border-black/[0.07] text-zinc-500' : 'border-white/[0.06] text-zinc-400'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span>Dock: <strong className="text-accent">{draft.topBarPosition.toUpperCase()}</strong> Bar</span>
                                    <span>·</span>
                                    <span>Sidebar: <strong className="text-accent">{draft.sidebarPosition.toUpperCase()}</strong> ({draft.sidebarStyle})</span>
                                    <span>·</span>
                                    <span>ToolHub: <strong className="text-accent">{draft.toolHubPosition.toUpperCase()}</strong></span>
                                </div>
                                <span className="text-[10px] opacity-70">
                                    Curvature: {draft.frameCurvature} · Omnibox: {draft.omniboxStyle} · Tabs: {draft.tabPresentation}
                                </span>
                            </div>

                        </div>

                        {/* RIGHT: LIVE CUSTOMIZATION CONTROLS DRAWER */}
                        <div className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l p-5 flex flex-col justify-between overflow-y-auto hide-scroll shrink-0 ${
                            isSystemBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]'
                        }`}>
                            <div className="space-y-4">
                                <div className={`flex items-center justify-between pb-2 border-b ${
                                    isSystemBright ? 'border-black/[0.07]' : 'border-white/[0.06]'
                                }`}>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                                        <Sliders size={13} />
                                        Layout Controls
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleResetDraft}
                                        title="Reset draft to current browser setup"
                                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer ${
                                            isSystemBright
                                                ? 'border-black/[0.07] hover:border-black/[0.12] hover:bg-black/5 text-zinc-600'
                                                : 'border-white/[0.06] hover:border-white/[0.10] hover:bg-white/5 text-zinc-400'
                                        }`}
                                    >
                                        <RotateCcw size={10} />
                                        <span>Reset</span>
                                    </button>
                                </div>

                                {editingPreset && (
                                    <div className={`flex items-center justify-between px-3 py-2 rounded-2xl border text-xs animate-fade-in ${
                                        isSystemBright ? 'bg-accent/15 border-accent/50 text-zinc-900' : 'bg-accent/10 border-accent/40 text-white'
                                    }`}>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Edit3 size={13} className="text-accent shrink-0" />
                                            <span className="truncate">Editing: <strong className="text-accent">{editingPreset.name}</strong></span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingPresetId(null);
                                                showToast('Switched to new draft');
                                            }}
                                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition cursor-pointer ${
                                                isSystemBright
                                                    ? 'border-black/[0.07] hover:border-black/[0.12] hover:bg-black/5 text-zinc-600'
                                                    : 'border-white/[0.06] hover:border-white/[0.10] hover:bg-white/10 text-zinc-400 hover:text-white'
                                            }`}
                                            title="Cancel editing and create a new preset"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {/* 0. SIDEBAR STYLE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Sidebar Mode</label>
                                    <StudioSlidingPillSwitcher
                                        options={[
                                            { id: 'classic', label: 'Classic' },
                                            { id: 'floating', label: 'Floating' },
                                            { id: 'compact', label: 'Compact' },
                                            { id: 'hidden', label: 'Hidden' }
                                        ]}
                                        value={draft.sidebarStyle || 'classic'}
                                        onChange={(val) => updateDraft('sidebarStyle', val)}
                                        isBright={isSystemBright}
                                    />
                                </div>

                                {/* 1. CURVATURE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Window Curvature</label>
                                    <StudioSlidingPillSwitcher
                                        options={[
                                            { id: 'default', label: 'Default' },
                                            { id: 'cohesive', label: 'Cohesive' },
                                            { id: 'square', label: 'Sharp' }
                                        ]}
                                        value={draft.frameCurvature}
                                        onChange={(val) => updateDraft('frameCurvature', val)}
                                        isBright={isSystemBright}
                                    />
                                </div>

                                {/* 2. OMNIBOX STYLE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Omnibox Architecture</label>
                                    <StudioSlidingPillSwitcher
                                        options={[
                                            { id: 'capsule', label: 'Capsule' },
                                            { id: 'wide', label: 'Wide' },
                                            { id: 'minimal', label: 'Minimal' }
                                        ]}
                                        value={draft.omniboxStyle}
                                        onChange={(val) => updateDraft('omniboxStyle', val)}
                                        isBright={isSystemBright}
                                    />
                                </div>

                                {/* 3. TAB PRESENTATION */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Tab Presentation</label>
                                    <StudioSlidingPillSwitcher
                                        options={[
                                            { id: 'pills', label: 'Pills' },
                                            { id: 'compact', label: 'Compact' },
                                            { id: 'cards', label: 'Cards' }
                                        ]}
                                        value={draft.tabPresentation}
                                        onChange={(val) => updateDraft('tabPresentation', val)}
                                        isBright={isSystemBright}
                                    />
                                </div>

                                {/* 4. WINDOW CONTROLS STYLE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Window Controls Style</label>
                                    <StudioSlidingPillSwitcher
                                        options={[
                                            { id: 'mac', label: 'macOS' },
                                            { id: 'windows', label: 'Windows' },
                                            { id: 'minimal', label: 'Minimal' }
                                        ]}
                                        value={draft.windowControlsStyle}
                                        onChange={(val) => updateDraft('windowControlsStyle', val)}
                                        isBright={isSystemBright}
                                    />
                                </div>

                                {/* 4b. WINDOW CONTROLS LAYOUT */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Window Controls Layout</label>
                                    <StudioSlidingPillSwitcher
                                        options={[
                                            { id: 'auto', label: 'Smart Corner' },
                                            { id: 'close-first', label: 'Close First' },
                                            { id: 'minimize-first', label: 'Minimize First' }
                                        ]}
                                        value={draft.windowControlsOrder || 'auto'}
                                        onChange={(val) => updateDraft('windowControlsOrder', val)}
                                        isBright={isSystemBright}
                                    />
                                </div>

                                {/* 5. THEME & UI SCALE */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-semibold block mb-1.5">Theme</label>
                                        <StudioSlidingPillSwitcher
                                            options={[
                                                { id: 'dark', label: 'Dark', icon: Moon },
                                                { id: 'light', label: 'Light', icon: Sun }
                                            ]}
                                            value={draft.theme}
                                            onChange={(val) => updateDraft('theme', val)}
                                            isBright={isSystemBright}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold block mb-1.5">UI Scale</label>
                                        <StudioSlidingPillSwitcher
                                            options={[
                                                { id: 'comfortable', label: 'Normal' },
                                                { id: 'compact', label: 'Compact' }
                                            ]}
                                            value={draft.uiScale}
                                            onChange={(val) => updateDraft('uiScale', val)}
                                            isBright={isSystemBright}
                                        />
                                    </div>
                                </div>

                                {/* 6. ACCENT COLOR PALETTE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Accent Color Swatch</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {ACCENT_SWATCHES.map(swatch => (
                                            <button
                                                key={swatch.hex}
                                                type="button"
                                                onClick={() => {
                                                    updateDraft('accentColor', swatch.hex);
                                                    updateDraft('accentRgb', swatch.rgb);
                                                }}
                                                title={swatch.name}
                                                className={`w-7 h-7 rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center ${
                                                    draft.accentColor === swatch.hex 
                                                        ? (isSystemBright
                                                            ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white scale-110'
                                                            : 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110')
                                                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                                                }`}
                                                style={{ backgroundColor: swatch.hex }}
                                            >
                                                {draft.accentColor === swatch.hex && (
                                                    <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
                                                )}
                                            </button>
                                        ))}

                                        {/* Custom Color Input matching SettingsModal */}
                                        <div className={`w-px h-6 mx-0.5 ${isSystemBright ? 'bg-black/[0.07]' : 'bg-white/[0.06]'}`} />
                                        <div className={`relative flex items-center rounded-xl border overflow-hidden transition-colors ${
                                            isSystemBright 
                                                ? 'bg-black/[0.02] border-black/[0.07] focus-within:border-accent/50 text-zinc-900' 
                                                : 'bg-black/40 border-white/[0.06] focus-within:border-accent/50 text-white'
                                        }`}>
                                            <button 
                                                type="button"
                                                onClick={() => colorInputRef.current?.click()}
                                                title="Open System Color Picker"
                                                className={`pl-2.5 pr-2 py-1.5 border-r transition cursor-pointer flex items-center justify-center ${
                                                    isSystemBright 
                                                        ? 'border-black/[0.07] hover:bg-black/5 text-zinc-500 hover:text-zinc-800' 
                                                        : 'border-white/[0.06] hover:bg-white/5 text-white/50 hover:text-white'
                                                }`}
                                            >
                                                <Palette 
                                                    size={13} 
                                                    className="transition-transform hover:scale-110" 
                                                    style={{ color: !ACCENT_SWATCHES.some(s => s.hex.toLowerCase() === (draft.accentColor || '').toLowerCase()) ? draft.accentColor : undefined }} 
                                                />
                                            </button>
                                            <span className={`pl-2 text-xs font-mono select-none ${isSystemBright ? 'text-zinc-400' : 'text-white/40'}`}>#</span>
                                            <input
                                                type="text"
                                                value={(draft.accentColor || '').replace('#', '')}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                                                    if (val.length <= 6) {
                                                        const hex = '#' + val;
                                                        updateDraft('accentColor', hex);
                                                        if (val.length === 6 || val.length === 3) {
                                                            updateDraft('accentRgb', hexToRgbString(hex));
                                                        }
                                                    }
                                                }}
                                                placeholder="D4BC94"
                                                className={`w-16 bg-transparent border-none text-xs font-mono outline-none py-1.5 px-1 uppercase ${
                                                    isSystemBright ? 'text-zinc-900' : 'text-white'
                                                }`}
                                                maxLength={6}
                                            />
                                            <input 
                                                ref={colorInputRef}
                                                type="color" 
                                                value={draft.accentColor?.startsWith('#') && draft.accentColor.length === 7 ? draft.accentColor : '#d4bc94'}
                                                onChange={(e) => {
                                                    const hex = e.target.value;
                                                    updateDraft('accentColor', hex);
                                                    updateDraft('accentRgb', hexToRgbString(hex));
                                                }}
                                                className="sr-only absolute opacity-0 pointer-events-none"
                                                aria-hidden="true"
                                                tabIndex={-1}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* STUDIO ACTION BAR */}
                            <div className={`mt-6 pt-4 border-t space-y-2 shrink-0 ${
                                isSystemBright ? 'border-black/[0.07]' : 'border-white/[0.06]'
                            }`}>
                                {editingPresetId ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleSaveChanges}
                                            className="w-full py-2.5 rounded-2xl bg-accent text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-[0.99] hover:brightness-105"
                                        >
                                            <Check size={14} strokeWidth={2.5} />
                                            <span>Save Changes</span>
                                        </button>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={handleApplyToBrowser}
                                                className={`py-2 rounded-2xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99] ${
                                                    isSystemBright
                                                        ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.07] hover:border-black/[0.12] text-zinc-800'
                                                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] hover:border-white/[0.10] text-white'
                                                }`}
                                            >
                                                <Sparkles size={13} />
                                                <span>Apply Live</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleSaveAsNew}
                                                className={`py-2 rounded-2xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99] ${
                                                    isSystemBright
                                                        ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.07] hover:border-black/[0.12] text-zinc-800'
                                                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] hover:border-white/[0.10] text-white'
                                                }`}
                                            >
                                                <Plus size={13} />
                                                <span>Save as New</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleApplyToBrowser}
                                            className="w-full py-2.5 rounded-2xl bg-accent text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-[0.99] hover:brightness-105"
                                        >
                                            <Check size={14} strokeWidth={2.5} />
                                            <span>Apply to Browser</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => openSaveDialog(null)}
                                            className={`w-full py-2.5 rounded-2xl border font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99] ${
                                                isSystemBright
                                                    ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.07] hover:border-black/[0.12] text-zinc-800'
                                                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] hover:border-white/[0.10] text-white'
                                            }`}
                                        >
                                            <Plus size={14} />
                                            <span>Save as Custom Preset</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                ) : (
                    /* PRESET LIBRARY VIEW */
                    <div className="flex-1 p-5 md:p-6 overflow-y-auto hide-scroll flex flex-col space-y-4">
                        
                        {/* Top Toolbar: Search, Filters, Capture Current */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className={`relative flex-1 sm:w-64 flex items-center px-3 py-1.5 rounded-full border text-xs transition-colors ${
                                    isSystemBright
                                        ? 'bg-black/[0.02] border-black/[0.07] focus-within:border-black/[0.12]'
                                        : 'bg-black/40 border-white/[0.06] focus-within:border-white/[0.10]'
                                }`}>
                                    <Search size={13} className="text-zinc-400 mr-2 shrink-0" />
                                    <input 
                                        type="text"
                                        placeholder="Search presets..."
                                        value={librarySearch}
                                        onChange={(e) => setLibrarySearch(e.target.value)}
                                        className="bg-transparent border-none outline-none w-full text-xs"
                                    />
                                    {librarySearch && (
                                        <button
                                            type="button"
                                            onClick={() => setLibrarySearch('')}
                                            className={`cursor-pointer ${isSystemBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                <div className="shrink-0 w-64 sm:w-72">
                                    <StudioSlidingPillSwitcher
                                        options={[
                                            { id: 'all', label: 'All' },
                                            { id: 'builtin', label: 'Built-in' },
                                            { id: 'custom', label: `Custom (${customPresets.length})` }
                                        ]}
                                        value={libraryFilter}
                                        onChange={setLibraryFilter}
                                        isBright={isSystemBright}
                                        size="sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCaptureCurrent}
                                className="px-3.5 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer hover:bg-accent/30 active:scale-95 shrink-0"
                            >
                                <Sparkles size={13} />
                                <span>Save Active Browser Setup</span>
                            </button>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 flex-1 min-h-0">
                            {filteredPresets.map((preset) => {
                                const PresetIcon = getPresetIcon(preset.icon);
                                const isCurrentlyActive = activePresetId === preset.id;
                                const isEditingThis = editingPresetId === preset.id;

                                return (
                                    <div
                                        key={preset.id}
                                        className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 group relative ${
                                            isCurrentlyActive
                                                ? (isSystemBright ? 'bg-accent/15 border-accent/50' : 'bg-accent/10 border-accent/40')
                                                : (isSystemBright ? 'bg-black/[0.02] border-black/[0.07] hover:border-black/[0.12]' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]')
                                        }`}
                                    >
                                        <div>
                                            {/* Card Top: Icon & Active Status */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <div 
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs shrink-0"
                                                    style={{
                                                        backgroundColor: `${preset.accentColor || '#d4bc94'}18`,
                                                        borderColor: `${preset.accentColor || '#d4bc94'}40`,
                                                        color: preset.accentColor || '#d4bc94'
                                                    }}
                                                >
                                                    <PresetIcon size={17} />
                                                </div>

                                                {isCurrentlyActive && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/20 text-accent border border-accent/30">
                                                        <Check size={10} />
                                                        <span>Active</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Structural Wireframe Preview */}
                                            <div className="mb-3">
                                                <PresetLayoutWireframe
                                                    preset={preset}
                                                    isSelected={isCurrentlyActive}
                                                    isBright={isSystemBright}
                                                    compact
                                                />
                                            </div>

                                            {/* Title & Tagline */}
                                            <h4 className="text-sm font-bold tracking-tight mb-1 flex items-center gap-1.5">
                                                <span>{preset.name}</span>
                                                {isEditingThis && (
                                                    <span className="text-[10px] font-mono font-normal text-accent">(Editing)</span>
                                                )}
                                            </h4>
                                            <p className={`text-xs line-clamp-2 mb-2 ${isSystemBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                {preset.tagline}
                                            </p>

                                            {/* Subtle layout description line */}
                                            <div className={`text-[11px] font-mono truncate mb-1 ${
                                                isSystemBright ? 'text-zinc-500' : 'text-white/45'
                                            }`}>
                                                {preset.layoutSummary || preset.layoutTag || `${preset.topBarPosition === 'bottom' ? 'Bottom Bar' : 'Top Bar'} · ${preset.sidebarPosition === 'right' ? 'Right Sidebar' : 'Left Sidebar'}`}
                                            </div>
                                        </div>

                                        {/* Card Actions Footer */}
                                        <div className={`mt-4 pt-3.5 border-t flex items-center justify-between gap-2 ${
                                            isSystemBright ? 'border-black/[0.07]' : 'border-white/[0.06]'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {/* Apply */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        applyExperiencePreset(preset, {
                                                            uiStore: useUIStore.getState(),
                                                            tabStore: useTabStore.getState(),
                                                            showToast: showToast || useUIStore.getState().showToast
                                                        });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 ${
                                                        isCurrentlyActive
                                                            ? 'bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30'
                                                            : 'bg-accent text-zinc-950 hover:brightness-105 shadow-sm'
                                                    }`}
                                                >
                                                    {isCurrentlyActive ? 'Reapply' : 'Apply'}
                                                </button>

                                                {/* Edit in Studio (for custom) or Customize (for built-in) */}
                                                <button
                                                    type="button"
                                                    onClick={() => loadPresetIntoStudio(preset, !!preset.isCustom)}
                                                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                                        isSystemBright
                                                            ? 'border-black/[0.07] hover:border-black/[0.12] hover:bg-black/5 text-zinc-700'
                                                            : 'border-white/[0.06] hover:border-white/[0.10] hover:bg-white/5 text-zinc-300'
                                                    }`}
                                                    title={preset.isCustom ? 'Edit preset in studio' : 'Customize layout in studio'}
                                                >
                                                    <Edit3 size={12} className="text-accent" />
                                                    <span>{preset.isCustom ? 'Edit in Studio' : 'Customize'}</span>
                                                </button>
                                            </div>

                                            {/* Secondary Actions: Duplicate, Delete */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDuplicate(preset)}
                                                    title="Duplicate preset"
                                                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                                                        isSystemBright
                                                            ? 'border-black/[0.07] hover:border-black/[0.12] hover:bg-black/5 text-zinc-600'
                                                            : 'border-white/[0.06] hover:border-white/[0.10] hover:bg-white/10 text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    <Copy size={13} />
                                                </button>

                                                {preset.isCustom && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPresetToDelete(preset)}
                                                        title="Delete custom preset"
                                                        className="p-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* SAVE CUSTOM PRESET DIALOG */}
            {isSaveModalOpen && (
                <div 
                    className="fixed inset-0 z-[55000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsSaveModalOpen(false);
                    }}
                >
                    <div
                        className={`w-full max-w-md p-6 rounded-[32px] border flex flex-col space-y-4 animate-pop-in ${getLiquidGlassSurfaceClasses(isSystemBright)} ${
                            isSystemBright ? 'text-zinc-900' : 'text-white'
                        }`}
                        style={getLiquidGlassInlineStyle(isSystemBright)}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <Sparkles size={16} className="text-accent" />
                                <span>{editingPresetId ? 'Edit Custom Preset' : 'Save as Custom Preset'}</span>
                            </h3>
                            <button 
                                onClick={() => setIsSaveModalOpen(false)}
                                className={`p-1.5 rounded-full transition cursor-pointer ${
                                    isSystemBright ? 'hover:bg-black/5 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                                }`}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePreset} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold block mb-1">Preset Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={presetNameInput}
                                    onChange={(e) => setPresetNameInput(e.target.value)}
                                    placeholder="e.g. Ergonomic Workflow, Minimalist Arc"
                                    className={`w-full px-3.5 py-2 rounded-2xl border text-xs outline-none focus:border-accent/50 ${
                                        isSystemBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-900' : 'bg-white/[0.02] border-white/[0.06] text-white'
                                    }`}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold block mb-1">Tagline / Description</label>
                                <textarea 
                                    rows={2}
                                    value={presetDescInput}
                                    onChange={(e) => setPresetDescInput(e.target.value)}
                                    placeholder="Short description of this configuration..."
                                    className={`w-full px-3.5 py-2 rounded-2xl border text-xs outline-none resize-none focus:border-accent/50 ${
                                        isSystemBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-900' : 'bg-white/[0.02] border-white/[0.06] text-white'
                                    }`}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold block mb-1.5">Preset Icon</label>
                                <div className="grid grid-cols-8 gap-2">
                                    {SELECTABLE_ICONS.map(iconName => {
                                        const IconComp = PRESET_ICON_MAP[iconName] || Sparkles;
                                        const isSelected = presetIconInput === iconName;
                                        return (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => setPresetIconInput(iconName)}
                                                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                                                    isSelected
                                                        ? (isSystemBright ? 'bg-accent/15 border-accent/50 text-accent font-bold scale-105' : 'bg-accent/10 border-accent/40 text-accent font-bold scale-105')
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/[0.07] hover:border-black/[0.12] hover:bg-black/5 text-zinc-600' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10] hover:bg-white/5 text-zinc-400 hover:text-white')
                                                }`}
                                            >
                                                <IconComp size={16} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className={`px-4 py-2 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                                        isSystemBright
                                            ? 'border-black/[0.07] hover:border-black/[0.12] text-zinc-700'
                                            : 'border-white/[0.06] hover:border-white/[0.10] text-zinc-300'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-2xl bg-accent text-zinc-950 font-bold text-xs transition cursor-pointer hover:brightness-105 shadow-md"
                                >
                                    {editingPresetId ? 'Save Changes' : 'Create Preset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION DIALOG */}
            {presetToDelete && (
                <div 
                    className="fixed inset-0 z-[56000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setPresetToDelete(null);
                    }}
                >
                    <div
                        className={`w-full max-w-sm p-6 rounded-[32px] border flex flex-col space-y-4 animate-pop-in ${getLiquidGlassSurfaceClasses(isSystemBright)} ${
                            isSystemBright ? 'text-zinc-900' : 'text-white'
                        }`}
                        style={getLiquidGlassInlineStyle(isSystemBright)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">Delete Custom Preset?</h3>
                                <p className={`text-xs ${isSystemBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Are you sure you want to delete <strong className={isSystemBright ? 'text-zinc-950' : 'text-white'}>"{presetToDelete.name}"</strong>? This cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setPresetToDelete(null)}
                                className={`px-4 py-1.5 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                                    isSystemBright
                                        ? 'border-black/[0.07] hover:border-black/[0.12] text-zinc-700'
                                        : 'border-white/[0.06] hover:border-white/[0.10] text-zinc-300'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeletePreset}
                                className="px-4 py-1.5 rounded-2xl bg-red-500 text-white font-bold text-xs transition cursor-pointer hover:bg-red-600 shadow-md"
                            >
                                Delete Preset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Shared helper: Miniature Window Controls (macOS / Windows / Minimal)
function MiniWindowControls({ draft, isBright, controlsOnRight = false, compact = false }) {
    const isCloseFirst = (draft.windowControlsOrder === 'close-first')
        ? true
        : (draft.windowControlsOrder === 'minimize-first')
            ? false
            : !controlsOnRight;

    const dotSize = compact ? 'w-2 h-2' : 'w-2.5 h-2.5';
    const minDotSize = compact ? 'w-1.5 h-1.5' : 'w-2 h-2';

    if (draft.windowControlsStyle === 'windows') {
        const min = <Minus size={compact ? 8 : 9} strokeWidth={2.5} key="min" />;
        const max = <Square size={compact ? 7 : 8} strokeWidth={2} key="max" />;
        const cls = <X size={compact ? 8 : 9} strokeWidth={2.5} key="cls" />;
        return (
            <div className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'} shrink-0 ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {isCloseFirst ? [cls, min, max] : [min, max, cls]}
            </div>
        );
    }

    if (draft.windowControlsStyle === 'minimal') {
        const min = <div key="min" className={`${minDotSize} rounded-full ${isBright ? 'bg-amber-400/60' : 'bg-amber-400/50'}`} />;
        const max = <div key="max" className={`${minDotSize} rounded-full ${isBright ? 'bg-emerald-400/60' : 'bg-emerald-400/50'}`} />;
        const cls = <div key="cls" className={`${minDotSize} rounded-full ${isBright ? 'bg-red-400/60' : 'bg-red-400/50'}`} />;
        return (
            <div className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'} shrink-0`}>
                {isCloseFirst ? [cls, min, max] : [min, max, cls]}
            </div>
        );
    }

    const min = <div key="min" className={`${dotSize} rounded-full bg-[#ffbd2e] border border-[#dea123]/50 shadow-[0_0.5px_2px_rgba(255,189,46,0.3)]`} />;
    const max = <div key="max" className={`${dotSize} rounded-full bg-[#27c93f] border border-[#1aab29]/50 shadow-[0_0.5px_2px_rgba(39,201,63,0.3)]`} />;
    const cls = <div key="cls" className={`${dotSize} rounded-full bg-[#ff5f56] border border-[#e0443e]/50 shadow-[0_0.5px_2px_rgba(255,95,86,0.3)]`} />;
    return (
        <div className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'} shrink-0`}>
            {isCloseFirst ? [cls, min, max] : [min, max, cls]}
        </div>
    );
}

// Subcomponent: Miniature Navigation Bar in Canvas
function MiniNavBar({ draft, onDragStart, onDragEnd, onSwap, isBright, previewFont, previewSpacing }) {
    const isTop = draft.topBarPosition === 'top';
    const isRight = draft.sidebarPosition === 'right';
    const isSidebarHidden = draft.sidebarStyle === 'hidden';
    const isCompactScale = draft.uiScale === 'compact';
    const isSquare = draft.frameCurvature === 'square' || draft.frameCurvature === 'sharp';
    const isCohesive = draft.frameCurvature === 'cohesive';

    const navCluster = (
        <div className={`flex items-center gap-1 shrink-0 ${isBright ? 'text-zinc-600' : 'text-zinc-300'}`}>
            {!isRight && <PanelLeft size={10} className="opacity-80" />}
            <ChevronLeft size={11} className="opacity-85" />
            <ChevronRight size={11} className="opacity-40" />
            {isRight && <PanelRight size={10} className="opacity-80" />}
        </div>
    );

    const actionsCluster = (
        <div className="flex items-center gap-1 shrink-0">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 ${isSquare ? 'rounded-none' : 'rounded-full'} border ${
                isBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-600' : 'bg-white/[0.03] border-white/[0.06] text-zinc-300'
            }`}>
                <Shield size={9} className="text-emerald-400" />
                <Puzzle size={9} className="opacity-75" />
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSwap();
                }}
                title={`Move to ${isTop ? 'Bottom' : 'Top'}`}
                className={`p-1 rounded transition cursor-pointer ${
                    isBright ? 'hover:bg-black/10 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
            >
                <ArrowUpDown size={10} />
            </button>
            <div className="text-zinc-500 group-hover:text-accent cursor-grab">
                <GripHorizontal size={12} />
            </div>
        </div>
    );

    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            style={{ fontFamily: previewFont, letterSpacing: previewSpacing }}
            className={`w-full ${isCompactScale ? 'h-7 px-2' : 'h-8 px-2.5'} ${
                isSquare ? 'rounded-none' : isCohesive ? 'rounded-xl' : 'rounded-xl'
            } border shadow-sm flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing group select-none transition-all duration-300 ${
                isBright
                    ? 'bg-black/[0.02] border-black/[0.07] text-zinc-800'
                    : 'bg-white/[0.02] border-white/[0.06] text-white'
            }`}
            title="Draggable Navigation Bar: Drag to Top or Bottom zone, or click swap"
        >
            {/* Left Side: Nav cluster when left sidebar, Extensions/Actions when right sidebar */}
            <div className="flex-1 flex items-center justify-start gap-1 min-w-0">
                {isRight ? actionsCluster : navCluster}
            </div>

            {/* Centered Omnibox Preview */}
            <div className="shrink-0 w-[44%] max-w-[220px] flex items-center justify-center">
                <div className={`transition-all max-w-full ${
                    draft.omniboxStyle === 'wide'
                        ? 'w-full'
                        : draft.omniboxStyle === 'minimal'
                            ? 'w-28 sm:w-32'
                            : 'w-36 sm:w-44'
                }`}>
                    <div className={`w-full ${isCompactScale ? 'h-4 text-[8px]' : 'h-5 text-[9px]'} px-2 ${
                        isSquare ? 'rounded-none' : 'rounded-full'
                    } border flex items-center justify-center gap-1.5 ${
                        isBright
                            ? 'bg-black/[0.04] border-black/[0.07] text-zinc-600'
                            : 'bg-black/30 border-white/[0.06] text-white/60'
                    }`}>
                        <Lock size={8} className="text-emerald-400 shrink-0" />
                        <span className="truncate">qbrowse://studio</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Extensions/Actions when left sidebar, Nav cluster when right sidebar (+ Window Controls when sidebar is hidden) */}
            <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                {isRight ? navCluster : actionsCluster}
                {isSidebarHidden && (
                    <div className={`pl-1.5 ml-0.5 border-l ${isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'}`}>
                        <MiniWindowControls draft={draft} isBright={isBright} controlsOnRight={true} compact={isCompactScale} />
                    </div>
                )}
            </div>
        </div>
    );
}

// Subcomponent: Miniature Sidebar in Canvas
function MiniSidebar({ draft, onDragStart, onDragEnd, onSwap, isBright, previewFont, previewSpacing }) {
    const isLeft = draft.sidebarPosition === 'left';
    const isRight = !isLeft;
    const isCompactScale = draft.uiScale === 'compact';
    const sidebarStyle = draft.sidebarStyle || 'classic';
    const isSidebarCompact = sidebarStyle === 'compact';
    const isSidebarFloating = sidebarStyle === 'floating';
    const isSidebarAutoHide = sidebarStyle === 'auto-hide';
    const isSquare = draft.frameCurvature === 'square' || draft.frameCurvature === 'sharp';
    const curvatureClass = isSquare
        ? 'rounded-none'
        : draft.frameCurvature === 'cohesive'
            ? 'rounded-[18px]'
            : isSidebarFloating
                ? 'rounded-2xl'
                : 'rounded-2xl';

    const surfaceClasses = isSidebarFloating
        ? (isBright
            ? 'bg-white/75 border-black/[0.10] shadow-lg text-zinc-800'
            : 'bg-white/[0.07] border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-white')
        : isSidebarAutoHide
            ? (isBright
                ? 'bg-black/[0.02] border-black/[0.12] border-dashed opacity-80 text-zinc-800'
                : 'bg-white/[0.02] border-white/[0.12] border-dashed opacity-80 text-white')
            : (isBright
                ? 'bg-black/[0.02] border-black/[0.07] text-zinc-800'
                : 'bg-white/[0.02] border-white/[0.06] text-white');

    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            style={{ fontFamily: previewFont, letterSpacing: previewSpacing }}
            className={`h-full w-full ${isSidebarCompact ? 'p-1.5 items-center' : isCompactScale ? 'p-1.5' : 'p-2'} ${curvatureClass} border shadow-sm flex flex-col justify-between cursor-grab active:cursor-grabbing group select-none transition-all duration-300 ${surfaceClasses}`}
            title="Draggable Sidebar: Drag between Left and Right dock zones"
        >
            {/* Sidebar Top: Window Controls + Workspaces Strip */}
            <div className={isSidebarCompact ? 'flex flex-col items-center w-full' : 'w-full'}>
                {/* Window Controls Row (always at top of Sidebar when not hidden) */}
                <div className={`flex items-center mb-2 ${
                    isSidebarCompact
                        ? 'justify-center w-full'
                        : isRight
                            ? 'flex-row-reverse justify-between'
                            : 'flex-row justify-between'
                }`}>
                    <MiniWindowControls
                        draft={draft}
                        isBright={isBright}
                        controlsOnRight={isRight}
                        compact={isSidebarCompact || isCompactScale}
                    />

                    {!isSidebarCompact && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSwap();
                            }}
                            title={`Swap to ${isLeft ? 'Right' : 'Left'}`}
                            className={`p-0.5 rounded transition cursor-pointer ${
                                isBright ? 'hover:bg-black/10 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                            }`}
                        >
                            <ArrowLeftRight size={10} />
                        </button>
                    )}
                </div>

                {/* Workspaces Strip */}
                {isSidebarCompact ? (
                    <div className={`flex flex-col items-center gap-1 mb-2 pb-1.5 border-b w-full ${
                        isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'
                    }`}>
                        <div 
                            className={`w-5 h-5 ${isSquare ? 'rounded-none' : 'rounded-md'} flex items-center justify-center font-bold text-[8px]`}
                            style={{ backgroundColor: `${draft.accentColor}30`, color: draft.accentColor }}
                        >
                            P
                        </div>
                    </div>
                ) : (
                    <div className={`flex items-center gap-1 mb-2 ${isRight ? 'justify-end' : 'justify-start'}`}>
                        <div 
                            className={`${isCompactScale ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isSquare ? 'rounded-none' : 'rounded-md'} flex items-center justify-center font-bold text-[8px]`}
                            style={{ backgroundColor: `${draft.accentColor}30`, color: draft.accentColor }}
                        >
                            P
                        </div>
                        <div className={`${isCompactScale ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isSquare ? 'rounded-none' : 'rounded-md'} border flex items-center justify-center text-[8px] ${
                            isBright ? 'bg-black/[0.04] border-black/[0.07] text-zinc-500' : 'bg-white/5 border-white/[0.06] text-zinc-400'
                        }`}>
                            W
                        </div>
                    </div>
                )}

                {/* Tabs Presentation Preview */}
                {isSidebarCompact ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className={`w-6 h-6 ${isSquare ? 'rounded-none' : 'rounded-lg'} border flex items-center justify-center ${
                                    i === 1
                                        ? (isBright ? 'bg-accent/15 border-accent/50' : 'bg-accent/10 border-accent/40')
                                        : (isBright ? 'bg-black/[0.02] border-black/[0.07]' : 'bg-white/[0.02] border-white/[0.06]')
                                }`}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 1 ? draft.accentColor : '#888' }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {draft.tabPresentation === 'compact' ? (
                            <div className="space-y-0.5">
                                {[1, 2, 3].map(i => (
                                    <div 
                                        key={i} 
                                        className={`h-3.5 px-1.5 ${isSquare ? 'rounded-none' : 'rounded'} flex items-center gap-1 text-[8px] ${
                                            i === 1 
                                                ? 'bg-accent/20 text-accent font-semibold' 
                                                : (isBright ? 'bg-black/[0.03] text-zinc-600' : 'bg-white/5 text-zinc-400')
                                        }`}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: i === 1 ? draft.accentColor : '#888' }} />
                                        <span className="truncate">Tab #{i}</span>
                                    </div>
                                ))}
                            </div>
                        ) : draft.tabPresentation === 'cards' ? (
                            <div className="space-y-1.5">
                                {[1, 2].map(i => (
                                    <div 
                                        key={i}
                                        className={`p-1 ${isSquare ? 'rounded-none' : 'rounded-lg'} border text-[8px] flex items-center gap-1.5 ${
                                            i === 1 
                                                ? (isBright ? 'bg-accent/15 border-accent/50 text-accent' : 'bg-accent/10 border-accent/40 text-accent')
                                                : (isBright ? 'bg-black/[0.02] border-black/[0.07] text-zinc-600' : 'bg-white/[0.02] border-white/[0.06] text-zinc-400')
                                        }`}
                                    >
                                        <div className={`w-4 h-4 ${isSquare ? 'rounded-none' : 'rounded'} bg-black/20 shrink-0`} />
                                        <span className="truncate">Card View #{i}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {[1, 2, 3].map(i => (
                                    <div 
                                        key={i} 
                                        className={`${isCompactScale ? 'h-4' : 'h-5'} px-2 ${isSquare ? 'rounded-none' : 'rounded-xl'} flex items-center gap-1.5 text-[8px] font-medium transition ${
                                            i === 1 
                                                ? (isBright ? 'bg-accent/15 border border-accent/50 text-accent font-bold' : 'bg-accent/10 border border-accent/40 text-accent font-bold')
                                                : (isBright ? 'bg-black/[0.03] text-zinc-600' : 'bg-white/5 text-zinc-400')
                                        }`}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: i === 1 ? draft.accentColor : '#888' }} />
                                        <span className="truncate">Active Space Tab</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sidebar Bottom: Drag Handle */}
            {isSidebarCompact ? (
                <div className={`pt-1.5 border-t flex flex-col items-center gap-1 w-full text-zinc-500 ${
                    isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'
                }`}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSwap();
                        }}
                        title={`Swap to ${isLeft ? 'Right' : 'Left'}`}
                        className={`p-0.5 rounded transition cursor-pointer ${
                            isBright ? 'hover:bg-black/10 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                        }`}
                    >
                        <ArrowLeftRight size={10} />
                    </button>
                    <GripVertical size={10} className="group-hover:text-accent cursor-grab" />
                </div>
            ) : (
                <div className={`pt-2 border-t flex items-center justify-between text-zinc-500 ${
                    isBright ? 'border-black/[0.07]' : 'border-white/[0.06]'
                }`}>
                    <span className="text-[8px] opacity-70 truncate">Sidebar ({draft.sidebarPosition})</span>
                    <div className="group-hover:text-accent cursor-grab shrink-0">
                        <GripVertical size={11} />
                    </div>
                </div>
            )}
        </div>
    );
}
