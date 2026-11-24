import React, { useState, useEffect, useMemo } from 'react';
import { Keyboard, Search, RotateCcw, AlertTriangle, X, Check } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import {
    SHORTCUT_ACTIONS,
    SHORTCUT_CATEGORIES,
    eventToCombo,
    formatComboForDisplay,
    getEffectiveCombo,
    findShortcutConflict,
    isMacPlatform
} from '../../utils/shortcutRegistry';

export default function KeyboardShortcutsSettings({ isBright, showToast, t }) {
    const customShortcuts = useUIStore((state) => state.customShortcuts) || {};
    const setCustomShortcut = useUIStore((state) => state.setCustomShortcut);
    const resetCustomShortcut = useUIStore((state) => state.resetCustomShortcut);
    const resetAllCustomShortcuts = useUIStore((state) => state.resetAllCustomShortcuts);

    const [searchQuery, setSearchQuery] = useState('');
    const [recordingActionId, setRecordingActionId] = useState(null);
    const [pendingConflict, setPendingConflict] = useState(null); // { actionId, combo, conflict: { id, label } }
    const isMac = useMemo(() => isMacPlatform(), []);

    const tr = (key, fallback) => (typeof t === 'function' ? t(key, null, fallback) : fallback);

    useEffect(() => {
        if (!recordingActionId) return undefined;

        const handleCaptureKeyDown = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                setRecordingActionId(null);
                setPendingConflict(null);
                return;
            }

            if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                resetCustomShortcut(recordingActionId);
                setRecordingActionId(null);
                setPendingConflict(null);
                showToast?.(tr('cfg.shortcuts.restoredDefault', 'Shortcut restored to default'));
                return;
            }

            const combo = eventToCombo(e, isMac);
            if (!combo) return; // Ignore modifier-only presses

            const conflict = findShortcutConflict(combo, recordingActionId, customShortcuts);
            if (conflict) {
                setPendingConflict({ actionId: recordingActionId, combo, conflict });
                setRecordingActionId(null);
                return;
            }

            setCustomShortcut(recordingActionId, combo);
            setRecordingActionId(null);
            setPendingConflict(null);
            showToast?.(tr('cfg.shortcuts.updatedToast', 'Shortcut updated'));
        };

        window.addEventListener('keydown', handleCaptureKeyDown, true);
        return () => window.removeEventListener('keydown', handleCaptureKeyDown, true);
    }, [recordingActionId, customShortcuts, isMac, resetCustomShortcut, setCustomShortcut, showToast]);

    const handleSwapReplace = () => {
        if (!pendingConflict) return;
        const { actionId, combo, conflict } = pendingConflict;
        const previousCombo = getEffectiveCombo(actionId, customShortcuts);
        setCustomShortcut(actionId, combo);
        if (previousCombo) {
            setCustomShortcut(conflict.id, previousCombo);
        } else {
            resetCustomShortcut(conflict.id);
        }
        setPendingConflict(null);
        showToast?.(tr('cfg.shortcuts.swappedToast', 'Shortcuts swapped'));
    };

    const handleReplaceOnly = () => {
        if (!pendingConflict) return;
        const { actionId, combo, conflict } = pendingConflict;
        resetCustomShortcut(conflict.id);
        setCustomShortcut(actionId, combo);
        setPendingConflict(null);
        showToast?.(tr('cfg.shortcuts.updatedToast', 'Shortcut updated'));
    };

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredActions = useMemo(() => {
        if (!normalizedQuery) return SHORTCUT_ACTIONS;
        return SHORTCUT_ACTIONS.filter((action) => {
            const effective = getEffectiveCombo(action.id, customShortcuts);
            const displayCombo = formatComboForDisplay(effective, isMac).toLowerCase();
            return (
                action.label.toLowerCase().includes(normalizedQuery) ||
                action.category.toLowerCase().includes(normalizedQuery) ||
                effective.toLowerCase().includes(normalizedQuery) ||
                displayCombo.includes(normalizedQuery)
            );
        });
    }, [normalizedQuery, customShortcuts, isMac]);

    const groupedCategories = useMemo(() => {
        return SHORTCUT_CATEGORIES.map((category) => ({
            category,
            actions: filteredActions.filter((a) => a.category === category)
        })).filter((g) => g.actions.length > 0);
    }, [filteredActions]);

    const customizedCount = Object.keys(customShortcuts).length;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className={`text-base font-bold tracking-tight flex items-center gap-2 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                        <Keyboard size={18} className="text-accent" />
                        <span>{tr('cfg.shortcuts.title', 'Keyboard Shortcuts')}</span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {tr('cfg.shortcuts.subtitle', 'Click any shortcut chip to record a new key combination. Press Esc to cancel or Backspace to reset.')}
                    </p>
                </div>
                <button
                    type="button"
                    disabled={customizedCount === 0}
                    onClick={() => {
                        resetAllCustomShortcuts();
                        setPendingConflict(null);
                        setRecordingActionId(null);
                        showToast?.(tr('cfg.shortcuts.resetAllToast', 'All keyboard shortcuts restored to defaults'));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 flex-shrink-0 ${
                        customizedCount === 0
                            ? 'opacity-40 cursor-not-allowed'
                            : 'cursor-pointer active:scale-95'
                    } ${
                        isBright
                            ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/[0.08]'
                            : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.08]'
                    }`}
                >
                    <RotateCcw size={12} />
                    <span>{tr('cfg.shortcuts.resetAllBtn', 'Reset All Shortcuts')}</span>
                </button>
            </div>

            {/* Search Filter */}
            <div className="relative">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tr('cfg.shortcuts.searchPlaceholder', 'Search actions or key combinations (e.g. "Split", "Ctrl + T")...')}
                    className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border outline-none transition ${
                        isBright
                            ? 'bg-black/[0.03] border-black/[0.08] text-zinc-900 placeholder-zinc-400 focus:border-accent/60'
                            : 'bg-white/[0.04] border-white/[0.08] text-white placeholder-zinc-500 focus:border-accent/60'
                    }`}
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded ${
                            isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-zinc-200'
                        }`}
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Conflict Warning Banner */}
            {pendingConflict && (
                <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isBright ? 'bg-amber-500/10 border-amber-500/30 text-amber-900' : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                }`}>
                    <div className="flex items-start gap-2.5 text-xs">
                        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">
                                {formatComboForDisplay(pendingConflict.combo, isMac)} is already bound to "{pendingConflict.conflict.label}".
                            </p>
                            <p className="opacity-80 mt-0.5">
                                Swap their bindings, replace the existing shortcut, or cancel.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleSwapReplace}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold text-[11px] hover:bg-amber-400 transition cursor-pointer flex items-center gap-1"
                        >
                            <Check size={12} />
                            <span>Swap / Replace</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleReplaceOnly}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                isBright ? 'border-black/15 hover:bg-black/5' : 'border-white/15 hover:bg-white/10'
                            }`}
                        >
                            Override
                        </button>
                        <button
                            type="button"
                            onClick={() => setPendingConflict(null)}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                                isBright ? 'hover:bg-black/5' : 'hover:bg-white/10'
                            }`}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Category Groups */}
            {groupedCategories.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border text-xs ${
                    isBright ? 'bg-black/[0.02] border-black/[0.06] text-zinc-500' : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                }`}>
                    No shortcuts matching "{searchQuery}".
                </div>
            ) : (
                <div className="space-y-5">
                    {groupedCategories.map(({ category, actions }) => (
                        <div key={category} className="space-y-2">
                            <h4 className={`text-[11px] font-bold uppercase tracking-wider font-mono px-1 ${
                                isBright ? 'text-zinc-500' : 'text-zinc-400'
                            }`}>
                                {category}
                            </h4>
                            <div className={`rounded-2xl border divide-y overflow-hidden ${
                                isBright
                                    ? 'bg-black/[0.02] border-black/[0.07] divide-black/[0.05]'
                                    : 'bg-white/[0.02] border-white/[0.06] divide-white/[0.05]'
                            }`}>
                                {actions.map((action) => {
                                    const isRecording = recordingActionId === action.id;
                                    const effectiveCombo = getEffectiveCombo(action.id, customShortcuts);
                                    const isCustomized = Boolean(customShortcuts[action.id]);
                                    const display = formatComboForDisplay(effectiveCombo, isMac);

                                    return (
                                        <div
                                            key={action.id}
                                            className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                                                isBright ? 'hover:bg-black/[0.025]' : 'hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 pr-3">
                                                <span className={`text-xs font-medium truncate ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                    {action.label}
                                                </span>
                                                {isCustomized && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25">
                                                        Custom
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPendingConflict(null);
                                                        setRecordingActionId(isRecording ? null : action.id);
                                                    }}
                                                    className={`min-w-[110px] px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition cursor-pointer text-center ${
                                                        isRecording
                                                            ? 'bg-accent text-zinc-950 border-accent animate-pulse'
                                                            : isBright
                                                                ? 'bg-white hover:bg-black/5 text-zinc-700 border-black/10 shadow-xs'
                                                                : 'bg-black/40 hover:bg-white/10 text-zinc-200 border-white/10'
                                                    }`}
                                                    title={isRecording ? 'Press new key combination (Esc to cancel)' : 'Click to record new shortcut'}
                                                >
                                                    {isRecording ? 'Press keys...' : display}
                                                </button>

                                                {isCustomized && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            resetCustomShortcut(action.id);
                                                            showToast?.(tr('cfg.shortcuts.restoredDefault', 'Shortcut restored to default'));
                                                        }}
                                                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                                            isBright
                                                                ? 'border-black/10 text-zinc-500 hover:text-zinc-800 hover:bg-black/5'
                                                                : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                                                        }`}
                                                        title="Restore default shortcut"
                                                    >
                                                        <RotateCcw size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
