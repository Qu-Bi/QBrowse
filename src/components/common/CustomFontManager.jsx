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
    Trash2
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
import { useTranslation } from '../../i18n/index';

// Smooth hardware-accelerated sliding pill switcher matching QBrowse's motion language
function FontSlidingPillSwitcher({ options = [], value, onChange, isBright, compact = false }) {
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const count = options.length || 1;
    const foundIdx = options.findIndex(o => o.id === value);
    const activeIndex = foundIdx >= 0 ? foundIdx : 0;

    return (
        <div
            className={`relative grid items-center p-1 rounded-full border backdrop-blur-xl transition-colors duration-200 select-none ${
                isBright ? 'bg-black/[0.04] border-black/[0.08]' : 'bg-black/40 border-white/[0.08]'
            }`}
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
            onMouseLeave={() => setHoveredIdx(null)}
        >
            {/* Subtle Hover Preview Pill */}
            {hoveredIdx !== null && hoveredIdx !== activeIndex && (
                <div
                    className="absolute top-1 bottom-1 rounded-full pointer-events-none"
                    style={{
                        left: '4px',
                        width: `calc((100% - 8px) / ${count})`,
                        transform: `translateX(${hoveredIdx * 100}%)`,
                        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease',
                        willChange: 'transform',
                        backgroundColor: isBright ? 'rgba(0, 0, 0, 0.045)' : 'rgba(255, 255, 255, 0.05)'
                    }}
                />
            )}

            {/* Smooth Sliding Active Pill */}
            <div
                className="absolute top-1 bottom-1 rounded-full pointer-events-none shadow-sm"
                style={{
                    left: '4px',
                    width: `calc((100% - 8px) / ${count})`,
                    transform: `translateX(${activeIndex * 100}%)`,
                    transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                    willChange: 'transform',
                    backgroundColor: isBright ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                    border: isBright ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: isBright
                        ? '0 2px 8px rgba(0, 0, 0, 0.08)'
                        : '0 2px 10px rgba(0, 0, 0, 0.32), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)'
                }}
            />

            {options.map((opt, idx) => {
                const isActive = opt.id === value;
                const Icon = opt.icon;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        className={`relative z-10 flex items-center justify-center gap-1.5 ${
                            compact ? 'py-1.5 px-2 text-[11px]' : 'py-2 px-3 text-xs'
                        } font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer select-none truncate outline-none ${
                            isActive
                                ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                : (isBright ? 'text-zinc-600 hover:text-zinc-900 font-medium' : 'text-white/60 hover:text-white font-medium')
                        }`}
                    >
                        {Icon && (
                            <Icon
                                size={compact ? 12 : 14}
                                className={`shrink-0 ${isActive ? 'text-accent' : 'opacity-70'}`}
                            />
                        )}
                        <span className="truncate">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function CustomFontManager({ isStudio = false, isBright: isBrightProp }) {
    const { t } = useTranslation();
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const computedBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const isBright = typeof isBrightProp === 'boolean' ? isBrightProp : computedBright;

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
        const displayName = preset.id === 'default'
            ? t('tools.fontManager.presetDefaultName', null, preset.name)
            : preset.name;
        showToast(t('tools.fontManager.toasts.presetSet', { name: displayName }, `App font set to ${displayName}`));
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
        showToast(t('tools.fontManager.toasts.googleApplied', { name: target }, `Google Font "${target}" applied to QBrowse`));
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
        showToast(t('tools.fontManager.toasts.systemApplied', { name: target }, `System font "${target}" applied`));
    };

    // Handle Font File Upload
    const handleProcessFontFile = (file) => {
        setUploadError('');
        if (!file) return;

        const validExts = ['.ttf', '.otf', '.woff', '.woff2'];
        const lowerName = file.name.toLowerCase();
        const isValid = validExts.some(ext => lowerName.endsWith(ext));

        if (!isValid) {
            setUploadError(t('tools.fontManager.errors.invalidFormat', null, 'Invalid font format. Please upload .ttf, .otf, .woff, or .woff2 files.'));
            return;
        }

        // Limit size to 12MB
        if (file.size > 12 * 1024 * 1024) {
            setUploadError(t('tools.fontManager.errors.tooLarge', null, 'Font file is too large. Maximum supported size is 12MB.'));
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
            showToast(t('tools.fontManager.toasts.fileLoaded', { name: file.name }, `Custom font file "${file.name}" loaded successfully`));
        };
        reader.onerror = () => {
            setUploadError(t('tools.fontManager.errors.readFailed', null, 'Failed to read the font file. Please try another file.'));
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
        if (appFontType === 'default') return t('tools.fontManager.activeDefault', null, 'System Default (Segoe UI / Native)');
        if (appFontType === 'preset') {
            const p = PRESET_FONTS.find(f => f.id === appFontFamily);
            if (!p) return appFontFamily;
            return p.id === 'default' ? t('tools.fontManager.presetDefaultName', null, p.name) : p.name;
        }
        if (appFontType === 'google') return t('tools.fontManager.activeGoogle', { name: appFontGoogleFamily || t('tools.fontManager.customLabel', null, 'Custom') }, `Google Font: ${appFontGoogleFamily || 'Custom'}`);
        if (appFontType === 'system') return t('tools.fontManager.activeSystem', { name: appFontCustomName || t('tools.fontManager.installedOsLabel', null, 'Installed OS') }, `System Font: ${appFontCustomName || 'Installed OS'}`);
        if (appFontType === 'file') return t('tools.fontManager.activeFile', { name: appFontFileName || t('tools.fontManager.uploadedFontLabel', null, 'Uploaded Font') }, `Custom File: ${appFontFileName || 'Uploaded Font'}`);
        return t('tools.fontManager.presetDefaultName', null, 'System Default');
    }, [appFontType, appFontFamily, appFontGoogleFamily, appFontCustomName, appFontFileName, t]);

    const localizedSpacingOptions = useMemo(() => (
        LETTER_SPACING_OPTIONS.map(o => ({ ...o, label: t(`tools.fontManager.spacing.${o.id}`, null, o.label) }))
    ), [t]);

    const localizedWeightOptions = useMemo(() => (
        WEIGHT_SHIFT_OPTIONS.map(o => ({ ...o, label: t(`tools.fontManager.weight.${o.id}`, null, o.label) }))
    ), [t]);

    return (
        <div className={`space-y-5 ${isStudio ? 'w-full' : ''}`}>
            
            {/* HEADER SUMMARY CARD */}
            <div className={`p-4 sm:p-5 rounded-2xl transition-all ${
                isBright 
                    ? 'bg-black/[0.02] border border-black/[0.07]' 
                    : 'bg-white/[0.02] border border-white/[0.06]'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0 shadow-sm">
                            <Type size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`font-bold text-sm tracking-tight ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>{t('tools.fontManager.title', null, 'App Typography & Font')}</h3>
                            </div>
                            <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {t('tools.fontManager.active', null, 'Active:')} <span className="font-semibold text-accent">{currentActiveFontName}</span>
                            </p>
                        </div>
                    </div>

                    {appFontType !== 'default' && (
                        <button
                            type="button"
                            onClick={resetAppFont}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 ${
                                isBright 
                                    ? 'border-black/[0.08] hover:border-black/[0.14] hover:bg-black/[0.04] text-zinc-700' 
                                    : 'border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.06] text-zinc-300'
                            }`}
                            title={t('tools.fontManager.resetTitle', null, 'Reset font to operating system default')}
                        >
                            <RotateCcw size={13} />
                            <span>{t('tools.fontManager.resetToDefault', null, 'Reset to Default')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* MODE SELECTION TABS */}
            <FontSlidingPillSwitcher
                isBright={isBright}
                value={activeModeTab}
                onChange={setActiveModeTab}
                options={[
                    { id: 'preset', label: t('tools.fontManager.modes.preset', null, 'Preset Fonts'), icon: Sparkles },
                    { id: 'google', label: t('tools.fontManager.modes.google', null, 'Google Fonts'), icon: Globe },
                    { id: 'system', label: t('tools.fontManager.modes.system', null, 'System Fonts'), icon: Laptop },
                    { id: 'file', label: t('tools.fontManager.modes.file', null, 'Upload Font'), icon: UploadCloud }
                ]}
            />

            {/* TAB CONTENT: 1. CURATED PRESETS */}
            {activeModeTab === 'preset' && (
                <div className="space-y-3.5">
                    {/* Category Filter Pills */}
                    <div className="max-w-sm">
                        <FontSlidingPillSwitcher
                            compact
                            isBright={isBright}
                            value={presetCategory}
                            onChange={setPresetCategory}
                            options={[
                                { id: 'all', label: t('tools.fontManager.categories.all', null, 'All') },
                                { id: 'sans', label: t('tools.fontManager.categories.sans', null, 'Sans') },
                                { id: 'mono', label: t('tools.fontManager.categories.mono', null, 'Mono') },
                                { id: 'serif', label: t('tools.fontManager.categories.serif', null, 'Serif') }
                            ]}
                        />
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
                                    className={`p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative ${
                                        active
                                            ? (isBright 
                                                ? 'bg-accent/15 border border-accent/50' 
                                                : 'bg-accent/10 border border-accent/40')
                                            : (isBright 
                                                ? 'bg-black/[0.02] border border-black/[0.07] hover:border-black/[0.12]' 
                                                : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10]')
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className={`text-xs font-bold tracking-tight flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                                {preset.id === 'default' ? t('tools.fontManager.presetDefaultName', null, preset.name) : preset.name}
                                                {active && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block"></span>
                                                )}
                                            </span>
                                        </div>

                                        <p className={`text-[11px] line-clamp-2 mb-3 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {t(`tools.fontManager.presets.${preset.id}.description`, null, preset.description)}
                                        </p>
                                    </div>

                                    {/* Font Preview Line */}
                                    <div 
                                        className={`p-2 rounded-xl border text-sm font-medium tracking-normal truncate transition-all ${
                                            isBright ? 'bg-black/[0.02] border-black/[0.06] text-zinc-900' : 'bg-black/30 border-white/[0.05] text-zinc-100'
                                        }`}
                                        style={{ fontFamily: preset.family }}
                                    >
                                        {t(`tools.fontManager.presets.${preset.id}.previewText`, null, preset.previewText)}
                                    </div>

                                    {/* Action Footnote */}
                                    <div className="mt-2 flex items-center justify-between text-[11px]">
                                        <span className={`font-mono text-[10px] ${active ? 'text-accent font-semibold' : (isBright ? 'text-zinc-500' : 'text-zinc-400')}`}>
                                            {active ? t('tools.fontManager.activeFont', null, 'Active Font') : t('tools.fontManager.clickToApply', null, 'Click to apply')}
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
                    <div className={`p-4 rounded-2xl space-y-3 ${
                        isBright ? 'bg-black/[0.02] border border-black/[0.07]' : 'bg-white/[0.02] border border-white/[0.06]'
                    }`}>
                        <div className="flex items-center gap-2">
                            <Globe size={16} className="text-accent shrink-0" />
                            <div className="flex-1">
                                <span className={`text-xs font-bold tracking-tight block ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>{t('tools.fontManager.googleTitle', null, 'Use Any Google Font')}</span>
                                <span className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {t('tools.fontManager.googleDesc', null, 'Type any font name from fonts.google.com and press Enter to instantly load it into QBrowse.')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`relative flex-1 flex items-center px-3 py-1.5 rounded-xl border text-xs ${
                                isBright ? 'bg-white border-black/[0.08]' : 'bg-black/35 border-white/[0.08]'
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
                                    placeholder={t('tools.fontManager.googlePlaceholder', null, 'e.g. Montserrat, Space Grotesk, Syne, Cinzel...')}
                                    className={`w-full bg-transparent outline-none text-xs font-mono ${
                                        isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-zinc-100 placeholder-zinc-500'
                                    }`}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleApplyGoogleFont(customGoogleInput)}
                                disabled={!customGoogleInput.trim()}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 ${
                                    customGoogleInput.trim()
                                        ? 'bg-accent text-zinc-950 hover:brightness-105 shadow-sm'
                                        : (isBright ? 'bg-black/[0.06] text-zinc-400 cursor-not-allowed' : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed')
                                }`}
                            >
                                {t('tools.fontManager.applyFont', null, 'Apply Font')}
                            </button>
                        </div>
                    </div>

                    {/* Popular Google Fonts Quick Chips */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-accent">
                                {t('tools.fontManager.popularGoogle', null, 'Popular Google Fonts')}
                            </span>
                            <div className={`relative flex items-center px-2 py-0.5 rounded-lg border text-[11px] w-44 ${
                                isBright ? 'bg-black/[0.03] border-black/[0.08]' : 'bg-black/35 border-white/[0.08]'
                            }`}>
                                <Search size={11} className="text-zinc-400 mr-1.5 shrink-0" />
                                <input
                                    type="text"
                                    value={googleSearch}
                                    onChange={(e) => setGoogleSearch(e.target.value)}
                                    placeholder={t('tools.fontManager.filterPlaceholder', null, 'Filter list...')}
                                    className={`w-full bg-transparent outline-none text-[11px] ${
                                        isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-zinc-100 placeholder-zinc-500'
                                    }`}
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
                                        className={`p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-between ${
                                            isSelected
                                                ? (isBright
                                                    ? 'bg-accent/15 border border-accent/50 text-accent font-bold'
                                                    : 'bg-accent/10 border border-accent/40 text-accent font-bold')
                                                : (isBright 
                                                    ? 'bg-black/[0.02] border border-black/[0.07] hover:border-black/[0.12] text-zinc-900' 
                                                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] text-zinc-100')
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
                    <div className={`p-4 rounded-2xl space-y-3 ${
                        isBright ? 'bg-black/[0.02] border border-black/[0.07]' : 'bg-white/[0.02] border border-white/[0.06]'
                    }`}>
                        <div className="flex items-center gap-2">
                            <Laptop size={16} className="text-accent shrink-0" />
                            <div className="flex-1">
                                <span className={`text-xs font-bold tracking-tight block ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>{t('tools.fontManager.systemTitle', null, 'Installed System Font Picker')}</span>
                                <span className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {t('tools.fontManager.systemDesc', null, 'Enter any font installed on your operating system (e.g. Segoe UI Variable, Calibri, Helvetica, Comic Sans MS).')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`relative flex-1 flex items-center px-3 py-1.5 rounded-xl border text-xs ${
                                isBright ? 'bg-white border-black/[0.08]' : 'bg-black/35 border-white/[0.08]'
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
                                    placeholder={t('tools.fontManager.systemPlaceholder', null, 'Enter system font name...')}
                                    className={`w-full bg-transparent outline-none text-xs font-mono ${
                                        isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-zinc-100 placeholder-zinc-500'
                                    }`}
                                />
                                {systemFontInput.trim() && (
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        {isSystemFontDetected ? (
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                                isBright ? 'text-emerald-700 bg-emerald-500/10' : 'text-emerald-400 bg-emerald-500/10'
                                            }`}>
                                                <CheckCircle2 size={11} /> {t('tools.fontManager.installed', null, 'Installed')}
                                            </span>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                                isBright ? 'text-amber-700 bg-amber-500/10' : 'text-amber-400 bg-amber-500/10'
                                            }`} title={t('tools.fontManager.notDetectedTitle', null, 'Font not detected by canvas metrics differential, but CSS will still attempt to render it if available')}>
                                                <AlertCircle size={11} /> {t('tools.fontManager.notDetected', null, 'Not detected')}
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
                                        : (isBright ? 'bg-black/[0.06] text-zinc-400 cursor-not-allowed' : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed')
                                }`}
                            >
                                {t('tools.fontManager.applyFont', null, 'Apply Font')}
                            </button>
                        </div>
                    </div>

                    {/* Common Operating System Fonts Suggestions */}
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">
                            {t('tools.fontManager.commonOsFonts', null, 'Common Operating System Fonts')}
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
                                        className={`p-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-between ${
                                            isSelected
                                                ? (isBright
                                                    ? 'bg-accent/15 border border-accent/50 text-accent font-bold'
                                                    : 'bg-accent/10 border border-accent/40 text-accent font-bold')
                                                : (isBright 
                                                    ? 'bg-black/[0.02] border border-black/[0.07] hover:border-black/[0.12] text-zinc-900' 
                                                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] text-zinc-100')
                                        }`}
                                    >
                                        <div className="truncate">
                                            <span className="text-xs font-medium block truncate">{s.name}</span>
                                            <span className={`text-[10px] font-mono ${isSelected ? 'text-accent/80' : (isBright ? 'text-zinc-500' : 'text-zinc-400')}`}>{t(`tools.fontManager.osLabels.${s.os}`, null, s.os)}</span>
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
                                    ? 'border-black/[0.12] hover:border-accent/60 bg-black/[0.02] hover:bg-black/[0.03]' 
                                    : 'border-white/[0.12] hover:border-accent/60 bg-white/[0.02] hover:bg-white/[0.03]')
                        }`}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center mb-3 shadow-sm">
                            <UploadCloud size={24} />
                        </div>
                        <h4 className={`text-sm font-bold tracking-tight mb-1 ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                            {t('tools.fontManager.dropTitle', null, 'Click or drag & drop your font file here')}
                        </h4>
                        <p className={`text-xs max-w-sm mb-3 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {t('tools.fontManager.dropDesc', null, 'Supports TrueType (.ttf), OpenType (.otf), WOFF (.woff), and WOFF2 (.woff2) up to 12MB.')}
                        </p>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-accent text-zinc-950 font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 cursor-pointer pointer-events-none"
                        >
                            {t('tools.fontManager.selectFile', null, 'Select Local Font File')}
                        </button>
                    </div>

                    {uploadError && (
                        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Active Uploaded File Card */}
                    {appFontType === 'file' && appFontFileName && (
                        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 ${
                            isBright ? 'bg-black/[0.02] border border-black/[0.07]' : 'bg-white/[0.02] border border-white/[0.06]'
                        }`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                    <span className={`text-xs font-bold block truncate ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                        {appFontFileName}
                                    </span>
                                    <span className={`text-[10px] font-mono font-medium ${isBright ? 'text-emerald-600' : 'text-emerald-400'}`}>
                                        {t('tools.fontManager.activeCustomFace', null, 'Active Custom Font Face')}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={resetAppFont}
                                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                title={t('tools.fontManager.removeFileTitle', null, 'Remove uploaded font file')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* FINE-TUNING CONTROLS: LETTER SPACING, FONT SCALE, WEIGHT SHIFT */}
            <div className={`p-4 sm:p-5 rounded-2xl space-y-4 ${
                isBright ? 'bg-black/[0.02] border border-black/[0.07]' : 'bg-white/[0.02] border border-white/[0.06]'
            }`}>
                <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                        {t('tools.fontManager.fineTuning', null, 'Typography Fine-Tuning')}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Letter Spacing */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-semibold block ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            {t('tools.fontManager.letterSpacing', null, 'Letter Spacing (Tracking)')}
                        </label>
                        <FontSlidingPillSwitcher
                            compact
                            isBright={isBright}
                            value={appFontLetterSpacing}
                            onChange={setAppFontLetterSpacing}
                            options={localizedSpacingOptions}
                        />
                    </div>

                    {/* 2. Weight Shift */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-semibold block ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                            {t('tools.fontManager.weightShift', null, 'Weight Shift (Boldness)')}
                        </label>
                        <FontSlidingPillSwitcher
                            compact
                            isBright={isBright}
                            value={appFontWeightShift}
                            onChange={setAppFontWeightShift}
                            options={localizedWeightOptions}
                        />
                    </div>

                    {/* 3. Font Scale Slider */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={`text-xs font-semibold block ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                {t('tools.fontManager.fontScale', null, 'UI Font Scale')}
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
                                    title={t('tools.fontManager.reset100Title', null, 'Reset to 100%')}
                                >
                                    100%
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TYPOGRAPHY SPECIMEN */}
            <div className={`p-5 rounded-2xl space-y-3 ${
                isBright
                    ? 'bg-black/[0.02] border border-black/[0.07]'
                    : 'bg-white/[0.02] border border-white/[0.06]'
            }`}>
                <span className={`block text-[11px] font-medium opacity-50 ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                    {t('tools.fontManager.specimen', null, 'Typography Specimen')}
                </span>

                <div className="space-y-2">
                    <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isBright ? 'text-zinc-900' : 'text-zinc-100'}`}>
                        {t('tools.fontManager.specimen1', null, 'The quick brown fox jumps over the lazy dog')}
                    </h2>
                    <p className={`text-xs sm:text-sm leading-relaxed ${isBright ? 'text-zinc-600' : 'text-zinc-300'}`}>
                        {t('tools.fontManager.specimen2', null, 'Sphinx of black quartz, judge my vow.')}
                    </p>
                    <p className={`text-xs tracking-wide pt-1 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                    </p>
                </div>
            </div>

        </div>
    );
}

