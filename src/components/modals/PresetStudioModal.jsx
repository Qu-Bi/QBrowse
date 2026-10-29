import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, Sparkles, Layout, Layers, Sliders, Palette, Check, Copy, 
    Trash2, Edit3, Move, ArrowLeftRight, ArrowUpDown, Plus, 
    Monitor, RefreshCw, Sun, Moon, ShieldCheck, Feather, 
    PanelRight, PanelBottom, Code, Terminal, Zap, Cpu, Bookmark, 
    Heart, Globe, Smartphone, Compass, Eye, Shield, Lock, Search,
    GripVertical, GripHorizontal, ChevronRight, RotateCcw,
    Minus, Square
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { 
    EXPERIENCE_PRESETS, 
    applyExperiencePreset, 
    getPresetIcon, 
    PRESET_ICON_MAP 
} from '../../utils/experiencePresets';

const ACCENT_SWATCHES = [
    { name: 'Amber Gold', hex: '#d4bc94', rgb: '212, 188, 148' },
    { name: 'Ocean Blue', hex: '#0284c7', rgb: '2, 132, 199' },
    { name: 'Rose Gold', hex: '#f43f5e', rgb: '244, 63, 94' },
    { name: 'Royal Violet', hex: '#8b5cf6', rgb: '139, 92, 246' },
    { name: 'Cyber Emerald', hex: '#10b981', rgb: '16, 185, 129' },
    { name: 'Slate Gray', hex: '#94a3b8', rgb: '148, 163, 184' },
    { name: 'Sunset Orange', hex: '#f97316', rgb: '249, 115, 22' }
];

const SELECTABLE_ICONS = [
    'Sparkles', 'Layout', 'Layers', 'Sliders', 'Palette', 
    'Code', 'Terminal', 'Zap', 'Cpu', 'ShieldCheck', 
    'Feather', 'Compass', 'Bookmark', 'Monitor', 'Globe', 'Heart'
];

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

    const isSystemBright = currentTheme === 'light';

    // Tabs: 'studio' (Canvas & Customizer) | 'library' (Preset Manager)
    const [activeTab, setActiveTab] = useState('studio');

    // Live Draft State for the Studio Canvas
    const [draft, setDraft] = useState(() => ({
        sidebarPosition: settings?.sidebarPosition || 'left',
        topBarPosition: settings?.topBarPosition || 'top',
        toolHubPosition: settings?.toolHubPosition || 'right',
        omniboxStyle: settings?.omniboxStyle || 'capsule',
        frameCurvature: settings?.frameCurvature || 'default',
        tabPresentation: settings?.tabPresentation || 'pills',
        windowControlsStyle: settings?.windowControlsStyle || 'mac',
        theme: currentTheme || 'dark',
        accentColor: currentAccentColor || '#d4bc94',
        accentRgb: currentAccentRgb || '212, 188, 148',
        uiScale: settings?.uiScale || 'comfortable'
    }));

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
            setPreviewTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
            setPreviewDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Save Preset Dialog State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [presetNameInput, setPresetNameInput] = useState('');
    const [presetDescInput, setPresetDescInput] = useState('');
    const [presetIconInput, setPresetIconInput] = useState('Sparkles');
    const [editingPresetId, setEditingPresetId] = useState(null);

    // Delete Confirmation
    const [presetToDelete, setPresetToDelete] = useState(null);

    // Library search & filter
    const [libraryFilter, setLibraryFilter] = useState('all'); // 'all' | 'builtin' | 'custom'
    const [librarySearch, setLibrarySearch] = useState('');

    const modalRef = useRef(null);
    const colorInputRef = useRef(null);

    // Load initial preset if requested
    useEffect(() => {
        if (initialPresetId) {
            const all = [...EXPERIENCE_PRESETS, ...customPresets];
            const found = all.find(p => p.id === initialPresetId);
            if (found) {
                loadPresetIntoStudio(found);
            }
        }
    }, [initialPresetId]);

    // Keyboard dismissal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isSaveModalOpen) {
                    setIsSaveModalOpen(false);
                } else if (presetToDelete) {
                    setPresetToDelete(null);
                } else {
                    closeModal();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeModal, isSaveModalOpen, presetToDelete]);

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
        const tabStore = useTabStore.getState();

        // Apply draft settings to active store
        uiStore.setSettingValue('sidebarPosition', draft.sidebarPosition);
        uiStore.setSettingValue('topBarPosition', draft.topBarPosition);
        uiStore.setSettingValue('toolHubPosition', draft.toolHubPosition);
        uiStore.setSettingValue('omniboxStyle', draft.omniboxStyle);
        uiStore.setSettingValue('frameCurvature', draft.frameCurvature);
        uiStore.setSettingValue('tabPresentation', draft.tabPresentation);
        uiStore.setSettingValue('windowControlsStyle', draft.windowControlsStyle);
        uiStore.setSettingValue('uiScale', draft.uiScale);

        if (draft.theme) {
            uiStore.setTheme(draft.theme);
        }
        if (draft.accentColor) {
            uiStore.setAccentColor(draft.accentColor);
            if (typeof document !== 'undefined') {
                document.documentElement.style.setProperty('--accent', draft.accentColor);
                if (draft.accentRgb) {
                    document.documentElement.style.setProperty('--accent-rgb', draft.accentRgb);
                }
            }
        }

        showToast('Layout applied to browser!');
        playSnapAudio();
    };

    // Reset draft to current active browser settings
    const handleResetDraft = () => {
        const s = settings || {};
        setDraft({
            sidebarPosition: s.sidebarPosition || 'left',
            topBarPosition: s.topBarPosition || 'top',
            toolHubPosition: s.toolHubPosition || 'right',
            omniboxStyle: s.omniboxStyle || 'capsule',
            frameCurvature: s.frameCurvature || 'default',
            tabPresentation: s.tabPresentation || 'pills',
            windowControlsStyle: s.windowControlsStyle || 'mac',
            theme: currentTheme || 'dark',
            accentColor: currentAccentColor || '#d4bc94',
            accentRgb: currentAccentRgb || '212, 188, 148',
            uiScale: s.uiScale || 'comfortable'
        });
        showToast('Studio draft reset to browser setup');
    };

    // Load preset into Studio
    const loadPresetIntoStudio = (preset) => {
        setDraft({
            sidebarPosition: preset.sidebarPosition || 'left',
            topBarPosition: preset.topBarPosition || 'top',
            toolHubPosition: preset.toolHubPosition || 'right',
            omniboxStyle: preset.omniboxStyle || 'capsule',
            frameCurvature: preset.frameCurvature || 'default',
            tabPresentation: preset.tabPresentation || 'pills',
            windowControlsStyle: preset.windowControlsStyle || 'mac',
            theme: preset.theme || 'dark',
            accentColor: preset.accentColor || '#d4bc94',
            accentRgb: preset.accentRgb || '212, 188, 148',
            uiScale: preset.uiScale || 'comfortable'
        });
        setActiveTab('studio');
        showToast(`Loaded "${preset.name}" into Studio Canvas`);
    };

    // Open Save Dialog
    const openSaveDialog = (existingPreset = null) => {
        if (existingPreset) {
            setEditingPresetId(existingPreset.id);
            setPresetNameInput(existingPreset.name || '');
            setPresetDescInput(existingPreset.tagline || '');
            setPresetIconInput(typeof existingPreset.icon === 'string' ? existingPreset.icon : 'Sparkles');
        } else {
            setEditingPresetId(null);
            setPresetNameInput(`${draft.topBarPosition === 'bottom' ? 'Bottom' : 'Top'} ${draft.sidebarPosition === 'right' ? 'Arc' : 'Flow'}`);
            setPresetDescInput(`Custom layout: ${draft.topBarPosition === 'bottom' ? 'Bottom Bar' : 'Top Bar'}, ${draft.sidebarPosition === 'right' ? 'Right Sidebar' : 'Left Sidebar'}, ${draft.tabPresentation} tabs`);
            setPresetIconInput('Sparkles');
        }
        setIsSaveModalOpen(true);
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
            topBarPosition: draft.topBarPosition,
            toolHubPosition: draft.toolHubPosition,
            omniboxStyle: draft.omniboxStyle,
            frameCurvature: draft.frameCurvature,
            tabPresentation: draft.tabPresentation,
            windowControlsStyle: draft.windowControlsStyle,
            uiScale: draft.uiScale,
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
        deleteCustomPreset(presetToDelete.id);
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
                return 'rounded-xl';
            default:
                return 'rounded-2xl';
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[50000] flex items-center justify-center p-3 sm:p-5 select-none"
            style={{ overscrollBehavior: 'contain' }}
            onClick={(e) => {
                if (modalRef.current && !modalRef.current.contains(e.target)) {
                    closeModal();
                }
            }}
        >
            {/* Ambient Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-2xl transition-opacity animate-fade-in" />

            {/* Studio Window Card */}
            <div 
                ref={modalRef}
                className={`relative w-full max-w-6xl h-[92vh] max-h-[860px] min-h-[620px] rounded-3xl border flex flex-col overflow-hidden backdrop-blur-3xl animate-pop-in ${
                    isSystemBright
                        ? 'bg-zinc-100/95 border-black/10 text-zinc-900 shadow-[0_25px_80px_rgba(0,0,0,0.18)]'
                        : 'bg-[#090a0f]/95 border-white/10 text-white shadow-[0_40px_100px_rgba(0,0,0,0.85)]'
                }`}
                style={{
                    backdropFilter: 'blur(36px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(36px) saturate(180%)'
                }}
            >
                {/* STUDIO HEADER */}
                <header className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
                    isSystemBright ? 'bg-black/[0.03] border-black/10' : 'bg-white/[0.025] border-white/[0.08]'
                }`}>
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm shrink-0"
                            style={{
                                backgroundColor: `${draft.accentColor}20`,
                                borderColor: `${draft.accentColor}40`,
                                color: draft.accentColor
                            }}
                        >
                            <Sliders size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight">Preset Studio & Layout Architect</h2>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                                    isSystemBright 
                                        ? 'bg-amber-500/10 text-amber-800 border-amber-500/30' 
                                        : 'bg-accent/15 text-accent border-accent/30'
                                }`}>
                                    Interactive Drag & Drop
                                </span>
                            </div>
                            <p className={`text-xs ${isSystemBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Visually re-dock components, sculpt curvatures, customize themes, and manage custom presets.
                            </p>
                        </div>
                    </div>

                    {/* Mode Navigation Tabs */}
                    <div className="flex items-center gap-2">
                        <div className={`relative p-1 rounded-full border grid grid-cols-2 items-center select-none w-72 ${
                            isSystemBright ? 'bg-black/[0.04] border-black/10' : 'bg-black/40 border-white/10'
                        }`}>
                            {/* Animated Morphing Pill Indicator */}
                            <div 
                                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_2px_10px_rgba(212,188,148,0.25)] pointer-events-none" 
                                style={{ transform: activeTab === 'library' ? 'translateX(100%)' : 'translateX(0)' }} 
                            />

                            <button
                                type="button"
                                onClick={() => setActiveTab('studio')}
                                className={`relative z-10 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-95 outline-none ${
                                    activeTab === 'studio'
                                        ? 'text-zinc-950 font-bold'
                                        : (isSystemBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-zinc-400 hover:text-white')
                                }`}
                            >
                                <Layout size={13} />
                                <span>Visual Canvas</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('library')}
                                className={`relative z-10 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer active:scale-95 outline-none ${
                                    activeTab === 'library'
                                        ? 'text-zinc-950 font-bold'
                                        : (isSystemBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-zinc-400 hover:text-white')
                                }`}
                            >
                                <Bookmark size={13} />
                                <span>Preset Library</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                                    activeTab === 'library' 
                                        ? 'bg-black/20 text-black font-bold' 
                                        : (isSystemBright ? 'bg-black/10 text-zinc-600' : 'bg-white/10 text-zinc-400')
                                }`}>
                                    {allPresets.length}
                                </span>
                            </button>
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={closeModal}
                            aria-label="Close Preset Studio"
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                isSystemBright 
                                    ? 'border-black/10 hover:bg-black/5 text-zinc-600 hover:text-zinc-900' 
                                    : 'border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white'
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
                        <div className={`flex-1 p-5 md:p-6 flex flex-col justify-between overflow-y-auto relative ${
                            isSystemBright ? 'bg-black/[0.03]' : 'bg-white/[0.025]'
                        }`}>
                            {/* MINIATURE DESKTOP MONITOR & WORKSPACE CANVAS */}
                            <div className="flex-1 flex items-center justify-center p-2 min-h-[380px]">
                                <div className={`relative w-full max-w-3xl aspect-[16/10] max-h-[460px] rounded-3xl p-3 shadow-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                                    isSystemBright 
                                        ? 'bg-gradient-to-br from-zinc-200 via-stone-100 to-zinc-300 border-black/10' 
                                        : 'bg-gradient-to-br from-[#121524] via-[#0b0d18] to-[#15192b] border-white/15'
                                }`}>
                                    {/* Ambient Wallpaper Glow */}
                                    <div 
                                        className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-30"
                                        style={{ backgroundColor: draft.accentColor }}
                                    />
                                    <div 
                                        className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
                                        style={{ backgroundColor: draft.accentColor }}
                                    />

                                    {/* DOCK TARGET: TOP BAR DROP ZONE */}
                                    <div 
                                        onDragOver={(e) => handleDragOver(e, 'top')}
                                        onDragLeave={(e) => handleDragLeave(e, 'top')}
                                        onDrop={(e) => handleDrop(e, 'top')}
                                        className={`w-full transition-all duration-200 rounded-xl relative ${
                                            draft.topBarPosition === 'top'
                                                ? 'z-30'
                                                : (draggedComponent === 'topbar' || activeDropZone === 'top')
                                                    ? 'h-10 mb-2 border border-accent/40 bg-accent/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(212,188,148,0.18)] flex items-center justify-center z-40'
                                                    : 'h-2 border border-transparent'
                                        }`}
                                    >
                                        {draft.topBarPosition === 'top' ? (
                                            /* RENDER TOP BAR AT TOP */
                                            <MiniNavBar 
                                                draft={draft}
                                                onDragStart={(e) => handleDragStart(e, 'topbar')}
                                                onDragEnd={handleDragEnd}
                                                onSwap={swapTopBarPosition}
                                                isBright={draft.theme === 'light'}
                                            />
                                        ) : (
                                            (draggedComponent === 'topbar' || activeDropZone === 'top') && (
                                                <span className="text-[11px] font-mono font-medium text-accent flex items-center gap-1.5 drop-shadow-sm">
                                                    <ArrowUpDown size={12} className="animate-bounce" />
                                                    <span>Dock Navigation Bar at Top</span>
                                                </span>
                                            )
                                        )}
                                    </div>

                                    {/* MIDDLE AREA: SIDEBAR + MAINFRAME + TOOLHUB */}
                                    <div className="flex-1 flex min-h-0 relative z-20 my-1 gap-2">
                                        
                                        {/* LEFT ZONE: CAN HOLD SIDEBAR OR DOCK TARGET */}
                                        <div 
                                            onDragOver={(e) => handleDragOver(e, 'left')}
                                            onDragLeave={(e) => handleDragLeave(e, 'left')}
                                            onDrop={(e) => handleDrop(e, 'left')}
                                            className={`transition-all duration-300 flex flex-col shrink-0 ${
                                                draft.sidebarPosition === 'left' 
                                                    ? 'w-48 z-30' 
                                                    : (draggedComponent === 'sidebar' || activeDropZone === 'left')
                                                        ? 'w-48 border border-accent/40 bg-accent/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(212,188,148,0.18)] rounded-2xl flex items-center justify-center'
                                                        : 'w-2 border border-transparent'
                                            }`}
                                        >
                                            {draft.sidebarPosition === 'left' ? (
                                                <MiniSidebar 
                                                    draft={draft} 
                                                    onDragStart={(e) => handleDragStart(e, 'sidebar')}
                                                    onDragEnd={handleDragEnd}
                                                    onSwap={swapSidebarPosition}
                                                    isBright={draft.theme === 'light'}
                                                />
                                            ) : (
                                                (draggedComponent === 'sidebar' || activeDropZone === 'left') && (
                                                    <span className="text-[11px] font-mono font-medium text-accent text-center px-2 flex flex-col items-center gap-1.5 drop-shadow-sm">
                                                        <ArrowLeftRight size={14} className="animate-pulse" />
                                                        <span>Dock Sidebar on Left</span>
                                                    </span>
                                                )
                                            )}
                                        </div>

                                        {/* CENTER: BROWSER VIEWPORT FRAME */}
                                        <div className={`flex-1 relative flex flex-col overflow-hidden border shadow-inner transition-all duration-300 ${
                                            getCurvatureClass(draft.frameCurvature)
                                        } ${
                                            draft.theme === 'light'
                                                ? 'bg-gradient-to-b from-white via-zinc-50/80 to-zinc-100/90 border-black/10 text-zinc-900'
                                                : 'bg-gradient-to-b from-[#0d0f17] via-[#090b12] to-[#0d0e16] border-white/10 text-white'
                                        }`}>
                                            {/* Subtle Ambient Background Mesh in Viewport */}
                                            <div 
                                                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
                                                style={{ backgroundColor: draft.accentColor }}
                                            />

                                            {/* Authentic QBrowse Signature Start Page */}
                                            <div className="flex-1 p-4 flex flex-col items-center justify-center relative z-10 select-none">
                                                {/* Minimal Date Header */}
                                                <span className={`text-[9px] font-semibold uppercase tracking-widest mb-1 ${
                                                    draft.theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'
                                                }`}>
                                                    {previewDate}
                                                </span>

                                                {/* Apple-grade Live Clock Digits */}
                                                <h1 className={`text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${
                                                    draft.theme === 'light'
                                                        ? 'from-zinc-900 via-zinc-800 to-zinc-600'
                                                        : 'from-white via-white/95 to-white/70'
                                                } leading-none mb-3.5`}>
                                                    {previewTime}
                                                </h1>

                                                {/* Sleek Translucent Search Pill */}
                                                <div className={`w-full max-w-xs h-7 px-3 rounded-full border flex items-center justify-between gap-2 mb-3.5 text-[10px] backdrop-blur-md transition-all shadow-sm ${
                                                    draft.theme === 'light'
                                                        ? 'bg-black/[0.035] border-black/10 text-zinc-500 hover:border-black/20'
                                                        : 'bg-white/[0.05] border-white/10 text-white/50 hover:border-white/20'
                                                }`}>
                                                    <div className="flex items-center gap-2 min-w-0 truncate">
                                                        <Search size={11} className="opacity-60 shrink-0" />
                                                        <span className="truncate">Search the web, or type a command...</span>
                                                    </div>
                                                    <kbd className={`px-1.5 py-0.5 rounded text-[8px] font-mono border font-semibold shrink-0 select-none ${
                                                        draft.theme === 'light'
                                                            ? 'bg-black/[0.04] border-black/10 text-zinc-600'
                                                            : 'bg-white/10 border-white/15 text-white/70'
                                                    }`}>
                                                        ⌘K
                                                    </kbd>
                                                </div>

                                                {/* Clean Quick-Access Dials (GitHub, YouTube, Reddit, Docs) */}
                                                <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
                                                    {[
                                                        { name: 'GitHub', letter: 'G' },
                                                        { name: 'YouTube', letter: 'Y' },
                                                        { name: 'Reddit', letter: 'R' },
                                                        { name: 'Docs', letter: 'D' }
                                                    ].map((site) => (
                                                        <div 
                                                            key={site.name} 
                                                            className={`h-11 rounded-xl border flex flex-col items-center justify-center p-1.5 transition-all duration-200 cursor-default backdrop-blur-md ${
                                                                draft.theme === 'light'
                                                                    ? 'bg-black/[0.025] hover:bg-black/[0.04] border-black/8 text-zinc-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                                                                    : 'bg-white/[0.035] hover:bg-white/[0.06] border-white/10 text-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                                                            }`}
                                                        >
                                                            <div 
                                                                className="w-4 h-4 rounded-lg flex items-center justify-center text-[8px] font-bold mb-1 shadow-xs" 
                                                                style={{ 
                                                                    backgroundColor: `${draft.accentColor}25`, 
                                                                    color: draft.accentColor,
                                                                    border: `1px solid ${draft.accentColor}40`
                                                                }} 
                                                            >
                                                                {site.letter}
                                                            </div>
                                                            <span className="text-[9px] font-medium truncate w-full text-center px-0.5 leading-tight">{site.name}</span>
                                                        </div>
                                                    ))}
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
                                                    } w-4 h-10 rounded-full border backdrop-blur-xl flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing transition-all duration-300 shadow-md group hover:scale-105 active:scale-95 ${
                                                        draft.theme === 'light'
                                                            ? 'bg-black/[0.05] hover:bg-black/10 border-black/10 text-zinc-700'
                                                            : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                                                    }`}
                                                >
                                                    <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                                                    <Zap size={9} className="text-accent transition-transform group-hover:scale-110" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT ZONE: CAN HOLD SIDEBAR OR DOCK TARGET */}
                                        <div 
                                            onDragOver={(e) => handleDragOver(e, 'right')}
                                            onDragLeave={(e) => handleDragLeave(e, 'right')}
                                            onDrop={(e) => handleDrop(e, 'right')}
                                            className={`transition-all duration-300 flex flex-col shrink-0 ${
                                                draft.sidebarPosition === 'right' 
                                                    ? 'w-48 z-30' 
                                                    : (draggedComponent === 'sidebar' || activeDropZone === 'right')
                                                        ? 'w-48 border border-accent/40 bg-accent/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(212,188,148,0.18)] rounded-2xl flex items-center justify-center'
                                                        : 'w-2 border border-transparent'
                                            }`}
                                        >
                                            {draft.sidebarPosition === 'right' ? (
                                                <MiniSidebar 
                                                    draft={draft} 
                                                    onDragStart={(e) => handleDragStart(e, 'sidebar')}
                                                    onDragEnd={handleDragEnd}
                                                    onSwap={swapSidebarPosition}
                                                    isBright={draft.theme === 'light'}
                                                />
                                            ) : (
                                                (draggedComponent === 'sidebar' || activeDropZone === 'right') && (
                                                    <span className="text-[11px] font-mono font-medium text-accent text-center px-2 flex flex-col items-center gap-1.5 drop-shadow-sm">
                                                        <ArrowLeftRight size={14} className="animate-pulse" />
                                                        <span>Dock Sidebar on Right</span>
                                                    </span>
                                                )
                                            )}
                                        </div>

                                    </div>

                                    {/* DOCK TARGET: BOTTOM BAR DROP ZONE */}
                                    <div 
                                        onDragOver={(e) => handleDragOver(e, 'bottom')}
                                        onDragLeave={(e) => handleDragLeave(e, 'bottom')}
                                        onDrop={(e) => handleDrop(e, 'bottom')}
                                        className={`w-full transition-all duration-200 rounded-xl relative ${
                                            draft.topBarPosition === 'bottom'
                                                ? 'z-30'
                                                : (draggedComponent === 'topbar' || activeDropZone === 'bottom')
                                                    ? 'h-10 mt-2 border border-accent/40 bg-accent/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(212,188,148,0.18)] flex items-center justify-center z-40'
                                                    : 'h-2 border border-transparent'
                                        }`}
                                    >
                                        {draft.topBarPosition === 'bottom' ? (
                                            /* RENDER TOP BAR AT BOTTOM */
                                            <MiniNavBar 
                                                draft={draft}
                                                onDragStart={(e) => handleDragStart(e, 'topbar')}
                                                onDragEnd={handleDragEnd}
                                                onSwap={swapTopBarPosition}
                                                isBright={draft.theme === 'light'}
                                            />
                                        ) : (
                                            (draggedComponent === 'topbar' || activeDropZone === 'bottom') && (
                                                <span className="text-[11px] font-mono font-medium text-accent flex items-center gap-1.5 drop-shadow-sm">
                                                    <ArrowUpDown size={12} className="animate-bounce" />
                                                    <span>Dock Navigation Bar at Bottom</span>
                                                </span>
                                            )
                                        )}
                                    </div>

                                </div>
                            </div>

                            {/* Canvas Bottom Legend */}
                            <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono shrink-0 ${
                                isSystemBright ? 'border-black/5 text-zinc-500' : 'border-white/5 text-zinc-400'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span>Dock: <strong className="text-accent">{draft.topBarPosition.toUpperCase()}</strong> Bar</span>
                                    <span>·</span>
                                    <span>Sidebar: <strong className="text-accent">{draft.sidebarPosition.toUpperCase()}</strong></span>
                                    <span>·</span>
                                    <span>ToolHub: <strong className="text-accent">{draft.toolHubPosition.toUpperCase()}</strong></span>
                                </div>
                                <span className="text-[10px] opacity-70">
                                    Curvature: {draft.frameCurvature} · Omnibox: {draft.omniboxStyle} · Tabs: {draft.tabPresentation}
                                </span>
                            </div>

                        </div>

                        {/* RIGHT: LIVE CUSTOMIZATION CONTROLS DRAWER */}
                        <div className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l p-5 flex flex-col justify-between overflow-y-auto shrink-0 ${
                            isSystemBright ? 'bg-black/[0.03] border-black/10' : 'bg-white/[0.025] border-white/[0.08]'
                        }`}>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                                        <Sliders size={13} />
                                        Component Architect
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleResetDraft}
                                        title="Reset draft to current browser setup"
                                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer ${
                                            isSystemBright ? 'border-black/10 hover:bg-black/5 text-zinc-600' : 'border-white/10 hover:bg-white/5 text-zinc-400'
                                        }`}
                                    >
                                        <RotateCcw size={10} />
                                        <span>Reset</span>
                                    </button>
                                </div>

                                {/* 1. CURVATURE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Window Curvature</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'default', label: 'Default', desc: 'Organic 20px' },
                                            { id: 'cohesive', label: 'Cohesive', desc: 'Refined 12px' },
                                            { id: 'square', label: 'Sharp', desc: 'Square 0px' }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => updateDraft('frameCurvature', item.id)}
                                                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                                                    draft.frameCurvature === item.id
                                                        ? 'bg-accent/20 border-accent text-accent font-bold shadow-sm'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700 hover:bg-black/5' : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/5')
                                                }`}
                                            >
                                                <div className="text-xs">{item.label}</div>
                                                <div className="text-[9px] opacity-60 font-mono">{item.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. OMNIBOX STYLE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Omnibox Architecture</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'capsule', label: 'Capsule' },
                                            { id: 'wide', label: 'Wide' },
                                            { id: 'minimal', label: 'Minimal' }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => updateDraft('omniboxStyle', item.id)}
                                                className={`py-1.5 px-2 rounded-xl border text-center text-xs font-medium transition cursor-pointer ${
                                                    draft.omniboxStyle === item.id
                                                        ? 'bg-accent/20 border-accent text-accent font-bold'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700 hover:bg-black/5' : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/5')
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. TAB PRESENTATION */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Tab Presentation</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'pills', label: 'Pills' },
                                            { id: 'compact', label: 'Compact' },
                                            { id: 'cards', label: 'Cards' }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => updateDraft('tabPresentation', item.id)}
                                                className={`py-1.5 px-2 rounded-xl border text-center text-xs font-medium transition cursor-pointer ${
                                                    draft.tabPresentation === item.id
                                                        ? 'bg-accent/20 border-accent text-accent font-bold'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700 hover:bg-black/5' : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/5')
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. WINDOW CONTROLS STYLE */}
                                <div>
                                    <label className="text-xs font-semibold block mb-1.5">Window Controls Style</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'mac', label: 'macOS' },
                                            { id: 'windows', label: 'Windows' },
                                            { id: 'minimal', label: 'Minimal' }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => updateDraft('windowControlsStyle', item.id)}
                                                className={`py-1.5 px-2 rounded-xl border text-center text-xs font-medium transition cursor-pointer ${
                                                    draft.windowControlsStyle === item.id
                                                        ? 'bg-accent/20 border-accent text-accent font-bold'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700 hover:bg-black/5' : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/5')
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 5. THEME & UI SCALE */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-semibold block mb-1.5">Theme</label>
                                        <div className="grid grid-cols-2 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => updateDraft('theme', 'dark')}
                                                className={`py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 cursor-pointer ${
                                                    draft.theme === 'dark'
                                                        ? 'bg-accent/20 border-accent text-accent font-bold'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700' : 'bg-white/[0.03] border-white/10 text-zinc-300')
                                                }`}
                                            >
                                                <Moon size={11} />
                                                <span>Dark</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateDraft('theme', 'light')}
                                                className={`py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 cursor-pointer ${
                                                    draft.theme === 'light'
                                                        ? 'bg-accent/20 border-accent text-accent font-bold'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700' : 'bg-white/[0.03] border-white/10 text-zinc-300')
                                                }`}
                                            >
                                                <Sun size={11} />
                                                <span>Light</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold block mb-1.5">UI Scale</label>
                                        <div className="grid grid-cols-2 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => updateDraft('uiScale', 'comfortable')}
                                                className={`py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center cursor-pointer ${
                                                    draft.uiScale === 'comfortable'
                                                        ? 'bg-accent/20 border-accent text-accent font-bold'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700' : 'bg-white/[0.03] border-white/10 text-zinc-300')
                                                }`}
                                            >
                                                Normal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateDraft('uiScale', 'compact')}
                                                className={`py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center cursor-pointer ${
                                                    draft.uiScale === 'compact'
                                                        ? 'bg-accent/20 border-accent text-accent font-bold'
                                                        : (isSystemBright ? 'bg-black/[0.02] border-black/10 text-zinc-700' : 'bg-white/[0.03] border-white/10 text-zinc-300')
                                                }`}
                                            >
                                                Compact
                                            </button>
                                        </div>
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
                                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' 
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
                                        <div className={`w-px h-6 mx-0.5 ${isSystemBright ? 'bg-black/10' : 'bg-white/10'}`} />
                                        <div className={`relative flex items-center rounded-xl border overflow-hidden transition-colors ${
                                            isSystemBright 
                                                ? 'bg-black/[0.04] border-black/10 focus-within:border-accent text-zinc-900' 
                                                : 'bg-black/40 border-white/10 focus-within:border-accent text-white'
                                        }`}>
                                            <button 
                                                type="button"
                                                onClick={() => colorInputRef.current?.click()}
                                                title="Open System Color Picker"
                                                className={`pl-2.5 pr-2 py-1.5 border-r transition cursor-pointer flex items-center justify-center ${
                                                    isSystemBright 
                                                        ? 'border-black/10 hover:bg-black/5 text-zinc-500 hover:text-zinc-800' 
                                                        : 'border-white/10 hover:bg-white/5 text-white/50 hover:text-white'
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
                                                        if (val.length === 6) {
                                                            const r = parseInt(val.slice(0, 2), 16) || 212;
                                                            const g = parseInt(val.slice(2, 4), 16) || 188;
                                                            const b = parseInt(val.slice(4, 6), 16) || 148;
                                                            updateDraft('accentRgb', `${r}, ${g}, ${b}`);
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
                                                    const r = parseInt(hex.slice(1, 3), 16) || 212;
                                                    const g = parseInt(hex.slice(3, 5), 16) || 188;
                                                    const b = parseInt(hex.slice(5, 7), 16) || 148;
                                                    updateDraft('accentRgb', `${r}, ${g}, ${b}`);
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
                            <div className="mt-6 pt-4 border-t border-black/10 dark:border-white/10 space-y-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleApplyToBrowser}
                                    className="w-full py-2.5 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-[0.99] hover:brightness-105"
                                >
                                    <Check size={14} strokeWidth={2.5} />
                                    <span>Apply to Browser</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openSaveDialog()}
                                    className={`w-full py-2.5 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99] ${
                                        isSystemBright
                                            ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800'
                                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                                    }`}
                                >
                                    <Plus size={14} />
                                    <span>Save as Custom Preset</span>
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    /* PRESET LIBRARY VIEW */
                    <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col space-y-4">
                        
                        {/* Top Toolbar: Search, Filters, Capture Current */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className={`relative flex-1 sm:w-64 flex items-center px-3 py-1.5 rounded-xl border text-xs ${
                                    isSystemBright ? 'bg-black/[0.03] border-black/10' : 'bg-white/[0.025] border-white/[0.08]'
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
                                        <button onClick={() => setLibrarySearch('')} className="text-zinc-400 hover:text-white">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                <div className={`p-1 rounded-xl border flex items-center gap-1 ${
                                    isSystemBright ? 'bg-black/5 border-black/10' : 'bg-black/40 border-white/10'
                                }`}>
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'builtin', label: 'Built-in' },
                                        { id: 'custom', label: `Custom (${customPresets.length})` }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setLibraryFilter(f.id)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                                libraryFilter === f.id
                                                    ? 'bg-accent text-zinc-950 font-bold shadow-xs'
                                                    : (isSystemBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-zinc-400 hover:text-white')
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCaptureCurrent}
                                className="px-3 py-1.5 rounded-xl bg-accent/20 border border-accent/40 text-accent font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer hover:bg-accent/30 active:scale-95 shrink-0"
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

                                return (
                                    <div
                                        key={preset.id}
                                        className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 group relative ${
                                            isCurrentlyActive
                                                ? (isSystemBright ? 'bg-accent/15 border-accent shadow-md' : 'bg-accent/10 border-accent/80 shadow-[0_0_25px_rgba(212,188,148,0.15)]')
                                                : (isSystemBright ? 'bg-black/[0.03] border-black/10 hover:border-black/20 shadow-xs' : 'bg-white/[0.025] border-white/[0.08] hover:border-white/20 shadow-sm')
                                        }`}
                                    >
                                        <div>
                                            {/* Card Top: Icon, Badges, Duplicate/Delete Actions */}
                                            <div className="flex items-start justify-between gap-2 mb-2.5">
                                                <div 
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0"
                                                    style={{
                                                        backgroundColor: `${preset.accentColor || '#d4bc94'}18`,
                                                        borderColor: `${preset.accentColor || '#d4bc94'}40`,
                                                        color: preset.accentColor || '#d4bc94'
                                                    }}
                                                >
                                                    <PresetIcon size={18} />
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    {preset.isCustom ? (
                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                            Custom
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 border border-white/10">
                                                            {preset.badge || 'Default'}
                                                        </span>
                                                    )}

                                                    {isCurrentlyActive && (
                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-accent text-zinc-950 flex items-center gap-1 shadow-xs">
                                                            <Check size={10} strokeWidth={3} />
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Title & Tagline */}
                                            <h4 className="text-sm font-bold tracking-tight mb-1">{preset.name}</h4>
                                            <p className={`text-xs line-clamp-2 mb-3 ${isSystemBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                {preset.tagline}
                                            </p>

                                            {/* Spec Tags */}
                                            <div className="flex items-center gap-1.5 flex-wrap mb-4">
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                                                    isSystemBright ? 'bg-black/[0.03] border-black/10 text-zinc-700' : 'bg-white/5 border-white/10 text-zinc-300'
                                                }`}>
                                                    {preset.layoutTag || `${preset.topBarPosition === 'bottom' ? 'Bottom Bar' : 'Top Bar'} · ${preset.sidebarPosition === 'right' ? 'Right Sidebar' : 'Left Sidebar'}`}
                                                </span>
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                                                    isSystemBright ? 'bg-black/[0.03] border-black/10 text-zinc-700' : 'bg-white/5 border-white/10 text-zinc-300'
                                                }`}>
                                                    {preset.tabPresentation || 'pills'} tabs
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Actions Footer */}
                                        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-1">
                                                {/* Apply */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        applyExperiencePreset(preset, {
                                                            uiStore: useUIStore.getState(),
                                                            tabStore: useTabStore.getState(),
                                                            showToast
                                                        });
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-accent text-zinc-950 font-bold text-xs transition cursor-pointer hover:brightness-105 active:scale-95"
                                                >
                                                    Apply
                                                </button>

                                                {/* Edit in Studio */}
                                                <button
                                                    type="button"
                                                    onClick={() => loadPresetIntoStudio(preset)}
                                                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                                                        isSystemBright ? 'border-black/10 hover:bg-black/5 text-zinc-700' : 'border-white/10 hover:bg-white/5 text-zinc-300'
                                                    }`}
                                                >
                                                    <Layout size={11} />
                                                    <span>Edit in Studio</span>
                                                </button>
                                            </div>

                                            {/* Secondary Actions: Duplicate, Rename, Delete */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDuplicate(preset)}
                                                    title="Duplicate preset"
                                                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                                        isSystemBright ? 'border-black/10 hover:bg-black/5 text-zinc-600' : 'border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    <Copy size={12} />
                                                </button>

                                                {preset.isCustom && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => openSaveDialog(preset)}
                                                            title="Edit preset details"
                                                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                                                isSystemBright ? 'border-black/10 hover:bg-black/5 text-zinc-600' : 'border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white'
                                                            }`}
                                                        >
                                                            <Edit3 size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPresetToDelete(preset)}
                                                            title="Delete custom preset"
                                                            className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </>
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
                    <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl flex flex-col space-y-4 animate-pop-in ${
                        isSystemBright ? 'bg-zinc-100 text-zinc-900 border-black/10' : 'bg-[#090a0f] text-white border-white/10'
                    }`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <Sparkles size={16} className="text-accent" />
                                <span>{editingPresetId ? 'Edit Custom Preset' : 'Save as Custom Preset'}</span>
                            </h3>
                            <button 
                                onClick={() => setIsSaveModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
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
                                    className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none focus:border-accent ${
                                        isSystemBright ? 'bg-black/[0.03] border-black/10 text-zinc-900' : 'bg-white/5 border-white/10 text-white'
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
                                    className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none resize-none focus:border-accent ${
                                        isSystemBright ? 'bg-black/[0.03] border-black/10 text-zinc-900' : 'bg-white/5 border-white/10 text-white'
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
                                                        ? 'bg-accent/20 border-accent text-accent font-bold scale-105'
                                                        : (isSystemBright ? 'border-black/10 hover:bg-black/5 text-zinc-600' : 'border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white')
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
                                    className={`px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                        isSystemBright ? 'border-black/10 text-zinc-700' : 'border-white/10 text-zinc-300'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-accent text-zinc-950 font-bold text-xs transition cursor-pointer hover:brightness-105 shadow-md"
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
                    <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl flex flex-col space-y-4 animate-pop-in ${
                        isSystemBright ? 'bg-zinc-100 text-zinc-900 border-black/10' : 'bg-[#090a0f] text-white border-white/10'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">Delete Custom Preset?</h3>
                                <p className={`text-xs ${isSystemBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Are you sure you want to delete <strong className="text-white">"{presetToDelete.name}"</strong>? This cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setPresetToDelete(null)}
                                className={`px-4 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                    isSystemBright ? 'border-black/10 text-zinc-700' : 'border-white/10 text-zinc-300'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeletePreset}
                                className="px-4 py-1.5 rounded-xl bg-red-500 text-white font-bold text-xs transition cursor-pointer hover:bg-red-600 shadow-md"
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

// Subcomponent: Miniature Navigation Bar in Canvas
function MiniNavBar({ draft, onDragStart, onDragEnd, onSwap, isBright }) {
    const isTop = draft.topBarPosition === 'top';
    const isSquare = draft.frameCurvature === 'square' || draft.frameCurvature === 'sharp';

    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`w-full h-8 px-2.5 ${isSquare ? 'rounded-none' : 'rounded-xl'} border shadow-sm flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing group select-none transition-all duration-300 ${
                isBright
                    ? 'bg-black/[0.03] border-black/10 text-zinc-800'
                    : 'bg-white/[0.04] border-white/10 text-white'
            }`}
            title="Draggable Navigation Bar: Drag to Top or Bottom zone, or click swap"
        >
            {/* Window Controls Style */}
            <div className="flex items-center gap-1.5 shrink-0">
                {draft.windowControlsStyle === 'windows' ? (
                    <div className={`flex items-center gap-1.5 ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        <Minus size={9} strokeWidth={2.5} />
                        <Square size={8} strokeWidth={2} />
                        <X size={9} strokeWidth={2.5} />
                    </div>
                ) : draft.windowControlsStyle === 'minimal' ? (
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isBright ? 'bg-zinc-400' : 'bg-white/30'}`} />
                        <div className={`w-2 h-2 rounded-full ${isBright ? 'bg-zinc-300' : 'bg-white/15'}`} />
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/50 shadow-[0_0.5px_2px_rgba(255,95,86,0.3)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/50 shadow-[0_0.5px_2px_rgba(255,189,46,0.3)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/50 shadow-[0_0.5px_2px_rgba(39,201,63,0.3)]" />
                    </div>
                )}
            </div>

            {/* Omnibox Preview */}
            <div className={`flex items-center justify-center min-w-0 transition-all ${
                draft.omniboxStyle === 'wide' 
                    ? 'flex-1' 
                    : draft.omniboxStyle === 'minimal' 
                        ? 'w-36' 
                        : 'w-48'
            }`}>
                <div className={`w-full h-5 px-2 ${isSquare ? 'rounded-none' : 'rounded-full'} border flex items-center justify-center gap-1.5 text-[9px] font-mono ${
                    isBright 
                        ? 'bg-black/[0.04] border-black/10 text-zinc-600' 
                        : 'bg-black/30 border-white/10 text-white/60'
                }`}>
                    <Lock size={8} className="text-emerald-400" />
                    <span className="truncate">qbrowse://studio</span>
                </div>
            </div>

            {/* Drag Handle & Quick Swap */}
            <div className="flex items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSwap();
                    }}
                    title={`Move to ${isTop ? 'Bottom' : 'Top'}`}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                >
                    <ArrowUpDown size={10} />
                </button>
                <div className="text-zinc-500 group-hover:text-accent cursor-grab">
                    <GripHorizontal size={12} />
                </div>
            </div>
        </div>
    );
}

// Subcomponent: Miniature Sidebar in Canvas
function MiniSidebar({ draft, onDragStart, onDragEnd, onSwap, isBright }) {
    const isLeft = draft.sidebarPosition === 'left';
    const isSquare = draft.frameCurvature === 'square' || draft.frameCurvature === 'sharp';
    const curvatureClass = draft.frameCurvature === 'cohesive' ? 'rounded-xl' : isSquare ? 'rounded-none' : 'rounded-2xl';

    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`h-full w-full p-2 ${curvatureClass} border shadow-sm flex flex-col justify-between cursor-grab active:cursor-grabbing group select-none transition-all duration-300 ${
                isBright
                    ? 'bg-black/[0.03] border-black/10 text-zinc-800'
                    : 'bg-white/[0.03] border-white/10 text-white'
            }`}
            title="Draggable Sidebar: Drag between Left and Right dock zones"
        >
            {/* Sidebar Top: Workspaces Strip */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                        <div 
                            className={`w-4 h-4 ${isSquare ? 'rounded-none' : 'rounded-md'} flex items-center justify-center font-bold text-[8px]`}
                            style={{ backgroundColor: `${draft.accentColor}30`, color: draft.accentColor }}
                        >
                            P
                        </div>
                        <div className={`w-4 h-4 ${isSquare ? 'rounded-none' : 'rounded-md'} bg-white/5 border border-white/10 flex items-center justify-center text-[8px] text-zinc-400`}>
                            W
                        </div>
                    </div>

                    {/* Swap button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSwap();
                        }}
                        title={`Swap to ${isLeft ? 'Right' : 'Left'}`}
                        className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                        <ArrowLeftRight size={10} />
                    </button>
                </div>

                {/* Tabs Presentation Preview */}
                <div className="space-y-1">
                    {draft.tabPresentation === 'compact' ? (
                        /* Compact Density Rows */
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
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i === 1 ? draft.accentColor : '#888' }} />
                                    <span className="truncate">Tab #{i}</span>
                                </div>
                            ))}
                        </div>
                    ) : draft.tabPresentation === 'cards' ? (
                        /* Card Tile Mode */
                        <div className="space-y-1.5">
                            {[1, 2].map(i => (
                                <div 
                                    key={i}
                                    className={`p-1 ${isSquare ? 'rounded-none' : 'rounded-lg'} border text-[8px] flex items-center gap-1.5 ${
                                        i === 1 
                                            ? 'bg-accent/15 border-accent text-accent' 
                                            : (isBright ? 'bg-black/[0.02] border-black/5 text-zinc-600' : 'bg-white/5 border-white/5 text-zinc-400')
                                    }`}
                                >
                                    <div className={`w-4 h-4 ${isSquare ? 'rounded-none' : 'rounded'} bg-black/20 shrink-0`} />
                                    <span className="truncate">Card View #{i}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Default Pills */
                        <div className="space-y-1">
                            {[1, 2, 3].map(i => (
                                <div 
                                    key={i} 
                                    className={`h-5 px-2 ${isSquare ? 'rounded-none' : 'rounded-xl'} flex items-center gap-1.5 text-[8px] font-medium transition ${
                                        i === 1 
                                            ? 'bg-accent/20 border border-accent/40 text-accent font-bold' 
                                            : (isBright ? 'bg-black/[0.03] text-zinc-600' : 'bg-white/5 text-zinc-400')
                                    }`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i === 1 ? draft.accentColor : '#888' }} />
                                    <span className="truncate">Active Space Tab</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Bottom: Drag Handle */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-zinc-500">
                <span className="text-[8px] font-mono opacity-60">Sidebar ({draft.sidebarPosition})</span>
                <div className="group-hover:text-accent cursor-grab">
                    <GripVertical size={11} />
                </div>
            </div>
        </div>
    );
}
