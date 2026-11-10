import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Type, 
    Search, 
    Sliders, 
    RotateCcw, 
    UploadCloud, 
    Check, 
    CheckCircle2, 
    AlertCircle, 
    Sparkles, 
    Laptop, 
    Globe, 
    FileText, 
    Trash2, 
    Layers,
    ArrowRight
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { 
    PRESET_FONTS, 
    SYSTEM_FONT_SUGGESTIONS, 
    POPULAR_GOOGLE_FONTS, 
    LETTER_SPACING_OPTIONS, 
    WEIGHT_SHIFT_OPTIONS,
    isFontAvailable 
} from '../../utils/appFontManager';

export default function CustomFontManager({ isStudio = false }) {
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const settings = useUIStore(state => state.settings) || {};
    const setAppFont = useUIStore(state => state.setAppFont);
    const setAppFontLetterSpacing = useUIStore(state => state.setAppFontLetterSpacing);
    const setAppFontSizeScale = useUIStore(state => state.setAppFontSizeScale);
    const setAppFontWeightShift = useUIStore(state => state.setAppFontWeightShift);
    const resetAppFont = useUIStore(state => state.resetAppFont);
    const showToast = useUIStore(state => state.showToast);

    // Active typography settings from store
    const appFontType = settings.appFontType || 'default';
    const appFontFamily = settings.appFontFamily || 'default';
    const appFontGoogleFamily = settings.appFontGoogleFamily || '';
    const appFontCustomName = settings.appFontCustomName || '';
    const appFontLetterSpacing = settings.appFontLetterSpacing || 'normal';
    const appFontSizeScale = typeof settings.appFontSizeScale === 'number' ? settings.appFontSizeScale : 100;
    const appFontWeightShift = settings.appFontWeightShift || 'normal';
    const appFontFileData = settings.appFontFileData || null;
    const appFontFileName = settings.appFontFileName || '';

    // Active font manager mode tab: 'preset' | 'google' | 'system' | 'file'
    const [activeModeTab, setActiveModeTab] = useState(() => {
        if (appFontType === 'google') return 'google';
        if (appFontType === 'system') return 'system';
        if (appFontType === 'file') return 'file';
        return 'preset';
    });

    // Preset filter
    const [presetCategory, setPresetCategory] = useState('all');

    // Google font search & custom entry
    const [googleSearch, setGoogleSearch] = useState('');
    const [customGoogleInput, setCustomGoogleInput] = useState('');

    // System font input & metric detection check
    const [systemFontInput, setSystemFontInput] = useState(appFontCustomName || '');
    const [isSystemFontDetected, setIsSystemFontDetected] = useState(() => {
        return appFontCustomName ? isFontAvailable(appFontCustomName) : false;
    });

    // File upload
    const fileInputRef = useRef(null);
    const [uploadError, setUploadError] = useState('');
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    // Re-check system font metric differential when input changes
    useEffect(() => {
        const trimmed = systemFontInput.trim();
        if (!trimmed) {
            setIsSystemFontDetected(false);
            return;
        }
        const timer = setTimeout(() => {
            setIsSystemFontDetected(isFontAvailable(trimmed));
        }, 120);
        return () => clearTimeout(timer);
    }, [systemFontInput]);

    // Filter preset fonts by category
    const filteredPresets = useMemo(() => {
        if (presetCategory === 'all') return PRESET_FONTS;
        if (presetCategory === 'sans') return PRESET_FONTS.filter(f => !f.category.includes('Monospace') && !f.category.includes('Serif'));
        if (presetCategory === 'mono') return PRESET_FONTS.filter(f => f.category.includes('Monospace'));
        if (presetCategory === 'serif') return PRESET_FONTS.filter(f => f.category.includes('Serif'));
        return PRESET_FONTS;
    }, [presetCategory]);

    // Filter popular google fonts with search query
    const filteredGoogleFonts = useMemo(() => {
        const q = googleSearch.trim().toLowerCase();
        if (!q) return POPULAR_GOOGLE_FONTS;
        return POPULAR_GOOGLE_FONTS.filter(f => f.toLowerCase().includes(q));
    }, [googleSearch]);

    // Handle Preset Selection
    const handleSelectPreset = (preset) => {
        if (preset.id === 'default') {
            resetAppFont();
            return;
        }
        setAppFont({
            appFontType: 'preset',
            appFontFamily: preset.id,
            appFontGoogleFamily: preset.googleFamily || '',
            appFontCustomName: '',
            appFontLetterSpacing,
            appFontSizeScale,
            appFontWeightShift
        });
        showToast(`App font set to ${preset.name}`);
    };

    // Handle Google Font Selection / Submission
    const handleApplyGoogleFont = (fontName) => {
        const target = (fontName || customGoogleInput).trim();
        if (!target) return;
        setAppFont({
            appFontType: 'google',
            appFontFamily: `"${target}", sans-serif`,
            appFontGoogleFamily: target,
            appFontCustomName: '',
            appFontLetterSpacing,
            appFontSizeScale,
            appFontWeightShift
        });
        setCustomGoogleInput('');
        showToast(`Google Font "${target}" applied to QBrowse`);
    };

    // Handle Local System Font Apply
    const handleApplySystemFont = (fontName) => {
        const target = (fontName || systemFontInput).trim();
        if (!target) return;
        setAppFont({
            appFontType: 'system',
            appFontFamily: `"${target}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
            appFontGoogleFamily: '',
            appFontCustomName: target,
            appFontLetterSpacing,
            appFontSizeScale,
            appFontWeightShift
        });
        setSystemFontInput(target);
        showToast(`System font "${target}" applied`);
    };

    // Handle Font File Upload
    const handleProcessFontFile = (file) => {
        setUploadError('');
        if (!file) return;

        const validExts = ['.ttf', '.otf', '.woff', '.woff2'];
        const lowerName = file.name.toLowerCase();
        const isValid = validExts.some(ext => lowerName.endsWith(ext));

        if (!isValid) {
            setUploadError('Invalid font format. Please upload .ttf, .otf, .woff, or .woff2 files.');
            return;
        }

        // Limit size to 12MB
        if (file.size > 12 * 1024 * 1024) {
            setUploadError('Font file is too large. Maximum supported size is 12MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64Data = reader.result;
            setAppFont({
                appFontType: 'file',
                appFontFamily: '"QBrowseCustomFont", sans-serif',
                appFontGoogleFamily: '',
                appFontCustomName: '',
                appFontFileData: base64Data,
                appFontFileName: file.name,
                appFontLetterSpacing,
                appFontSizeScale,
                appFontWeightShift
            });
            showToast(`Custom font file "${file.name}" loaded successfully`);
        };
        reader.onerror = () => {
            setUploadError('Failed to read the font file. Please try another file.');
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleProcessFontFile(file);
    };

    const handleDropFile = (e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleProcessFontFile(file);
    };

    // Current active display name for status header
    const currentActiveFontName = useMemo(() => {
        if (appFontType === 'default') return 'System Default (Segoe UI / Native)';
        if (appFontType === 'preset') {
            const p = PRESET_FONTS.find(f => f.id === appFontFamily);
            return p ? p.name : appFontFamily;
        }
        if (appFontType === 'google') return `Google Font: ${appFontGoogleFamily || 'Custom'}`;
        if (appFontType === 'system') return `System Font: ${appFontCustomName || 'Installed OS'}`;
        if (appFontType === 'file') return `Custom File: ${appFontFileName || 'Uploaded Font'}`;
        return 'System Default';
    }, [appFontType, appFontFamily, appFontGoogleFamily, appFontCustomName, appFontFileName]);

    return (
        <div className={`space-y-5 ${isStudio ? 'w-full' : ''}`}>
            
            {/* HEADER SUMMARY CARD */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isBright 
                    ? 'bg-black/[0.02] border-black/10' 
                    : 'bg-white/[0.025] border-white/[0.06]'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0 shadow-sm">
                            <Type size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm tracking-tight">App Typography &amp; Font</h3>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold border border-accent/30">
                                    {appFontType.toUpperCase()}
                                </span>
                            </div>
                            <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Active: <span className="font-semibold text-accent">{currentActiveFontName}</span>
                            </p>
                        </div>
                    </div>

                    {appFontType !== 'default' && (
                        <button
                            type="button"
                            onClick={resetAppFont}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 ${
                                isBright 
                                    ? 'border-black/10 hover:bg-black/5 text-zinc-700' 
                                    : 'border-white/10 hover:bg-white/10 text-zinc-300'
                            }`}
                            title="Reset font to operating system default"
                        >
                            <RotateCcw size={13} />
                            <span>Reset to Default</span>
                        </button>
                    )}
                </div>
            </div>

            {/* MODE SELECTION TABS */}
            <div className={`p-1 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-1 select-none ${
                isBright ? 'bg-black/[0.03] border-black/10' : 'bg-black/30 border-white/5'
            }`}>
                {[
                    { id: 'preset', label: 'Curated Presets', icon: Sparkles },
                    { id: 'google', label: 'Google Fonts', icon: Globe },
                    { id: 'system', label: 'Installed OS Font', icon: Laptop },
                    { id: 'file', label: 'Upload Font File', icon: UploadCloud }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isSelected = activeModeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveModeTab(tab.id)}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
                                isSelected
                                    ? (isBright 
                                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-zinc-950 font-bold border border-black/10' 
                                        : 'bg-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.3)] text-accent font-bold border border-white/15')
                                    : (isBright ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                            }`}
                        >
                            <Icon size={14} className={isSelected ? 'text-accent' : ''} />
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* TAB CONTENT: 1. CURATED PRESETS */}
            {activeModeTab === 'preset' && (
                <div className="space-y-3.5">
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {[
                            { id: 'all', label: 'All Typefaces' },
                            { id: 'sans', label: 'Modern Sans' },
                            { id: 'mono', label: 'Monospace & Dev' },
                            { id: 'serif', label: 'Editorial Serif' }
                        ].map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setPresetCategory(cat.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap active:scale-95 ${
                                    presetCategory === cat.id
                                        ? 'bg-accent/20 text-accent font-semibold border border-accent/30'
                                        : (isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-600' : 'bg-white/5 hover:bg-white/10 text-zinc-400')
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredPresets.map(preset => {
                            const isSelected = appFontType === 'preset' && appFontFamily === preset.id;
                            const isDefaultSelected = preset.id === 'default' && appFontType === 'default';
                            const active = isSelected || isDefaultSelected;

                            return (
                                <div
                                    key={preset.id}
                                    onClick={() => handleSelectPreset(preset)}
                                    className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative ${
                                        active
                                            ? (isBright 
                                                ? 'bg-accent/15 border-accent shadow-sm ring-1 ring-accent/30' 
                                                : 'bg-accent/10 border-accent shadow-[0_0_20px_rgba(var(--accent-rgb,212,188,148),0.15)] ring-1 ring-accent/40')
                                            : (isBright 
                                                ? 'bg-white/80 border-black/[0.06] hover:border-black/20 hover:shadow-xs' 
                                                : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 hover:shadow-xs')
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                                {preset.name}
                                                {active && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block"></span>
                                                )}
                                            </span>
                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                                                isBright ? 'bg-black/5 text-zinc-600 border-black/10' : 'bg-white/5 text-zinc-400 border-white/10'
                                            }`}>
                                                {preset.category}
                                            </span>
                                        </div>

                                        <p className={`text-[11px] line-clamp-2 mb-3 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {preset.description}
                                        </p>
                                    </div>

                                    {/* Font Preview Line */}
                                    <div 
                                        className={`p-2 rounded-lg border text-sm font-medium tracking-normal truncate transition-all ${
                                            isBright ? 'bg-black/[0.02] border-black/5' : 'bg-black/40 border-white/5'
                                        }`}
                                        style={{ fontFamily: preset.family }}
                                    >
                                        {preset.previewText}
                                    </div>

                                    {/* Action Footnote */}
                                    <div className="mt-2 flex items-center justify-between text-[11px]">
                                        <span className={`font-mono text-[10px] ${active ? 'text-accent font-semibold' : 'text-zinc-400'}`}>
                                            {active ? 'Active Font' : 'Click to apply'}
                                        </span>
                                        {active && (
                                            <Check size={13} className="text-accent" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 2. GOOGLE FONTS */}
            {activeModeTab === 'google' && (
                <div className="space-y-4">
                    {/* Custom Google Font Search / Apply Bar */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                        isBright ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.025] border-white/[0.06]'
                    }`}>
                        <div className="flex items-center gap-2">
                            <Globe size={16} className="text-accent shrink-0" />
                            <div className="flex-1">
                                <span className="text-xs font-bold tracking-tight block">Use Any Google Font</span>
                                <span className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Type any font name from fonts.google.com and press Enter to instantly load it into QBrowse.
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`relative flex-1 flex items-center px-3 py-1.5 rounded-xl border text-xs ${
                                isBright ? 'bg-white border-black/10' : 'bg-black/40 border-white/10'
                            }`}>
                                <Search size={14} className="text-zinc-400 mr-2 shrink-0" />
                                <input
                                    type="text"
                                    value={customGoogleInput}
                                    onChange={(e) => setCustomGoogleInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleApplyGoogleFont(customGoogleInput);
                                        }
                                    }}
                                    placeholder="e.g. Montserrat, Space Grotesk, Syne, Cinzel..."
                                    className="w-full bg-transparent outline-none text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleApplyGoogleFont(customGoogleInput)}
                                disabled={!customGoogleInput.trim()}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 ${
                                    customGoogleInput.trim()
                                        ? 'bg-accent text-zinc-950 hover:brightness-105 shadow-sm'
                                        : 'bg-zinc-500/20 text-zinc-400 cursor-not-allowed'
                                }`}
                            >
                                Apply Font
                            </button>
                        </div>
                    </div>

                    {/* Popular Google Fonts Quick Chips */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-accent">
                                Popular Google Fonts
                            </span>
                            <div className={`relative flex items-center px-2 py-0.5 rounded-lg border text-[11px] w-44 ${
                                isBright ? 'bg-black/5 border-black/10' : 'bg-black/40 border-white/10'
                            }`}>
                                <Search size={11} className="text-zinc-400 mr-1.5 shrink-0" />
                                <input
                                    type="text"
                                    value={googleSearch}
                                    onChange={(e) => setGoogleSearch(e.target.value)}
                                    placeholder="Filter list..."
                                    className="w-full bg-transparent outline-none text-[11px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {filteredGoogleFonts.map(fontName => {
                                const isSelected = appFontType === 'google' && appFontGoogleFamily.toLowerCase() === fontName.toLowerCase();
                                return (
                                    <button
                                        key={fontName}
                                        type="button"
                                        onClick={() => handleApplyGoogleFont(fontName)}
                                        className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-between ${
                                            isSelected
                                                ? 'bg-accent/20 border-accent text-accent font-bold shadow-sm'
                                                : (isBright 
                                                    ? 'bg-white/80 border-black/[0.06] hover:border-black/20 text-zinc-800' 
                                                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 text-zinc-200')
                                        }`}
                                    >
                                        <span className="text-xs truncate font-medium">{fontName}</span>
                                        {isSelected && <Check size={13} className="text-accent shrink-0 ml-1" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 3. INSTALLED OS SYSTEM FONT */}
            {activeModeTab === 'system' && (
                <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                        isBright ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.025] border-white/[0.06]'
                    }`}>
                        <div className="flex items-center gap-2">
                            <Laptop size={16} className="text-accent shrink-0" />
                            <div className="flex-1">
                                <span className="text-xs font-bold tracking-tight block">Installed System Font Picker</span>
                                <span className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Enter any font installed on your operating system (e.g. Segoe UI Variable, Calibri, Helvetica, Comic Sans MS).
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`relative flex-1 flex items-center px-3 py-1.5 rounded-xl border text-xs ${
                                isBright ? 'bg-white border-black/10' : 'bg-black/40 border-white/10'
                            }`}>
                                <Type size={14} className="text-zinc-400 mr-2 shrink-0" />
                                <input
                                    type="text"
                                    value={systemFontInput}
                                    onChange={(e) => setSystemFontInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleApplySystemFont(systemFontInput);
                                        }
                                    }}
                                    placeholder="Enter system font name..."
                                    className="w-full bg-transparent outline-none text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono"
                                />
                                {systemFontInput.trim() && (
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        {isSystemFontDetected ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                <CheckCircle2 size={11} /> Installed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded" title="Font not detected by canvas metrics differential, but CSS will still attempt to render it if available">
                                                <AlertCircle size={11} /> Not detected
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleApplySystemFont(systemFontInput)}
                                disabled={!systemFontInput.trim()}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 ${
                                    systemFontInput.trim()
                                        ? 'bg-accent text-zinc-950 hover:brightness-105 shadow-sm'
                                        : 'bg-zinc-500/20 text-zinc-400 cursor-not-allowed'
                                }`}
                            >
                                Apply Font
                            </button>
                        </div>
                    </div>

                    {/* Common Operating System Fonts Suggestions */}
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">
                            Common Operating System Fonts
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {SYSTEM_FONT_SUGGESTIONS.map(s => {
                                const isSelected = appFontType === 'system' && appFontCustomName.toLowerCase() === s.name.toLowerCase();
                                return (
                                    <button
                                        key={s.name}
                                        type="button"
                                        onClick={() => {
                                            setSystemFontInput(s.name);
                                            handleApplySystemFont(s.name);
                                        }}
                                        className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-between ${
                                            isSelected
                                                ? 'bg-accent/20 border-accent text-accent font-bold shadow-sm'
                                                : (isBright 
                                                    ? 'bg-white/80 border-black/[0.06] hover:border-black/20 text-zinc-800' 
                                                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 text-zinc-200')
                                        }`}
                                    >
                                        <div className="truncate">
                                            <span className="text-xs font-medium block truncate">{s.name}</span>
                                            <span className="text-[10px] text-zinc-400 font-mono">{s.os}</span>
                                        </div>
                                        {isSelected && <Check size={13} className="text-accent shrink-0 ml-1" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 4. UPLOAD FONT FILE */}
            {activeModeTab === 'file' && (
                <div className="space-y-4">
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".ttf,.otf,.woff,.woff2" 
                        className="hidden" 
                        onChange={handleFileInputChange}
                    />

                    {/* Dropzone */}
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={handleDropFile}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            isDraggingFile 
                                ? 'border-accent bg-accent/10 scale-[1.01]' 
                                : (isBright 
                                    ? 'border-black/15 hover:border-accent bg-black/[0.02] hover:bg-black/[0.04]' 
                                    : 'border-white/15 hover:border-accent bg-white/[0.02] hover:bg-white/[0.04]')
                        }`}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center mb-3 shadow-sm">
                            <UploadCloud size={24} />
                        </div>
                        <h4 className="text-sm font-bold tracking-tight mb-1">
                            Click or drag &amp; drop your font file here
                        </h4>
                        <p className={`text-xs max-w-sm mb-3 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Supports TrueType (.ttf), OpenType (.otf), WOFF (.woff), and WOFF2 (.woff2) up to 12MB.
                        </p>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-accent text-zinc-950 font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 cursor-pointer pointer-events-none"
                        >
                            Select Local Font File
                        </button>
                    </div>

                    {uploadError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Active Uploaded File Card */}
                    {appFontType === 'file' && appFontFileName && (
                        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                            isBright ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.03] border-white/10'
                        }`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-bold block truncate text-zinc-900 dark:text-zinc-100">
                                        {appFontFileName}
                                    </span>
                                    <span className="text-[10px] text-emerald-500 font-mono font-medium">
                                        Active Custom Font Face
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={resetAppFont}
                                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                title="Remove uploaded font file"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* FINE-TUNING CONTROLS: LETTER SPACING, FONT SCALE, WEIGHT SHIFT */}
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                isBright ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.025] border-white/[0.06]'
            }`}>
                <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                        Typography Fine-Tuning
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Letter Spacing */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-semibold block ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            Letter Spacing (Tracking)
                        </label>
                        <div className={`p-1 rounded-xl border grid grid-cols-4 gap-1 ${
                            isBright ? 'bg-black/5 border-black/10' : 'bg-black/40 border-white/5'
                        }`}>
                            {LETTER_SPACING_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setAppFontLetterSpacing(opt.id)}
                                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-95 text-center ${
                                        appFontLetterSpacing === opt.id
                                            ? 'bg-accent text-zinc-950 font-bold shadow-xs'
                                            : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Weight Shift */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-semibold block ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            Weight Shift (Boldness)
                        </label>
                        <div className={`p-1 rounded-xl border grid grid-cols-3 gap-1 ${
                            isBright ? 'bg-black/5 border-black/10' : 'bg-black/40 border-white/5'
                        }`}>
                            {WEIGHT_SHIFT_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setAppFontWeightShift(opt.id)}
                                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-95 text-center ${
                                        appFontWeightShift === opt.id
                                            ? 'bg-accent text-zinc-950 font-bold shadow-xs'
                                            : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Font Scale Slider */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={`text-xs font-semibold block ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                UI Font Scale
                            </label>
                            <span className="text-xs font-mono font-bold text-accent">
                                {appFontSizeScale}%
                            </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="range"
                                min={90}
                                max={115}
                                step={1}
                                value={appFontSizeScale}
                                onChange={(e) => setAppFontSizeScale(Number(e.target.value))}
                                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-accent ${
                                    isBright ? 'bg-black/10' : 'bg-white/10'
                                }`}
                            />
                            {appFontSizeScale !== 100 && (
                                <button
                                    type="button"
                                    onClick={() => setAppFontSizeScale(100)}
                                    className="text-[10px] font-mono text-zinc-400 hover:text-accent cursor-pointer shrink-0"
                                    title="Reset to 100%"
                                >
                                    100%
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LIVE TYPOGRAPHY PREVIEW SANDBOX */}
            <div className={`p-5 rounded-2xl border space-y-4 ${
                isBright ? 'bg-white border-black/10 shadow-sm' : 'bg-[#0f111a] border-white/10 shadow-lg'
            }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <Sparkles size={13} />
                        Live Typography Preview
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 truncate max-w-xs">
                        family: {appFontFamily}
                    </span>
                </div>

                {/* Typography Sample Section */}
                <div className="space-y-2 p-4 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                        The quick brown fox jumps over the lazy dog
                    </h2>
                    <p className={`text-xs sm:text-sm leading-relaxed ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        Sphinx of black quartz, judge my vow. 0123456789 &bull; Modern interface typography dynamically adapting across all tabs, omnibox, settings, and modal controls.
                    </p>
                </div>

                {/* Interactive Mini UI Components in Font */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    {/* Pill Tab Mock */}
                    <div className="px-3 py-1.5 rounded-full bg-accent text-zinc-950 font-bold text-xs shadow-sm flex items-center gap-1.5">
                        <Layers size={12} />
                        <span>Active Tab Pill</span>
                    </div>

                    {/* Search Mock */}
                    <div className={`px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 ${
                        isBright ? 'bg-black/5 border-black/10 text-zinc-700' : 'bg-white/5 border-white/10 text-zinc-300'
                    }`}>
                        <Search size={12} className="text-zinc-400" />
                        <span>Search or enter URL...</span>
                    </div>

                    {/* Secondary Button Mock */}
                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${
                        isBright ? 'border-black/10 text-zinc-800' : 'border-white/10 text-zinc-200'
                    }`}>
                        Button Control
                    </div>

                    {/* Status Badge Mock */}
                    <div className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Shields 100% Protected
                    </div>
                </div>
            </div>

        </div>
    );
}

