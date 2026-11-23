import React from 'react';
import { EyeOff, Undo2, RotateCcw, Check } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { extractDomain } from '../../store/useVaultStore';
import { useTranslation } from '../../i18n/index';

export default function ElementEraserHUD() {
    const { t } = useTranslation();
    const isElementEraserActive = useUIStore(state => state.isElementEraserActive);
    const toggleElementEraser = useUIStore(state => state.toggleElementEraser);
    const hiddenElementsByDomain = useUIStore(state => state.hiddenElementsByDomain);
    const eraserSessionRules = useUIStore(state => state.eraserSessionRules);
    const removeLastHiddenElementRule = useUIStore(state => state.removeLastHiddenElementRule);
    const clearHiddenElementsForDomain = useUIStore(state => state.clearHiddenElementsForDomain);
    const showToast = useUIStore(state => state.showToast);
    const theme = useUIStore(state => state.theme);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs);
    const customSpaceTabs = useTabStore(state => state.customSpaceTabs);

    if (!isElementEraserActive) return null;

    const isEphemeral = activeSpace === 'ghost' || activeSpace === 'tor';
    const isBright = theme === 'light' && !isEphemeral;

    const spaceTabs = activeSpace === 'personal'
        ? privateTabs
        : activeSpace === 'work'
            ? workTabs
            : activeSpace === 'ghost'
                ? ghostTabs
                : activeSpace === 'tor'
                    ? (torTabs || [])
                    : (customSpaceTabs?.[activeSpace] || []);
    const activeTab = (spaceTabs || []).find(tb => tb.active) || spaceTabs?.[0];
    const domain = activeTab?.url ? extractDomain(activeTab.url) : '';

    const activeRules = isEphemeral
        ? (eraserSessionRules?.[activeTab?.id] || [])
        : (domain ? (hiddenElementsByDomain?.[domain] || []) : []);
    const hiddenCount = activeRules.length;

    const handleUndo = () => {
        const ok = removeLastHiddenElementRule(domain, { ephemeral: isEphemeral, tabId: activeTab?.id });
        if (ok) {
            showToast(t('chrome.eraserUndoToast', null, 'Restored last hidden item'));
        }
    };

    const handleClearAll = () => {
        clearHiddenElementsForDomain(domain, { ephemeral: isEphemeral, tabId: activeTab?.id });
        showToast(t('chrome.eraserRestoredAllToast', null, 'Restored all hidden items on this page'));
    };

    return (
        <div
            id="qbrowse-element-eraser-hud"
            style={{
                backgroundColor: isBright ? 'rgba(255, 255, 255, 0.96)' : 'rgba(20, 21, 30, 0.96)',
                border: isBright ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.10)',
                boxShadow: isBright ? '0 6px 20px rgba(0,0,0,0.14)' : '0 6px 20px rgba(0,0,0,0.38)',
            }}
            className="absolute top-5 right-7 z-[60] flex items-center gap-1.5 rounded-full h-11 p-1.5 pl-2.5 pr-2 select-none overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-2 pr-2.5 py-1 text-xs font-semibold ${
                hiddenCount > 0 ? `border-r mr-0.5 ${isBright ? 'border-black/10' : 'border-white/10'}` : 'pr-1'
            } ${isBright ? 'text-zinc-800' : 'text-white/85'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isBright ? 'bg-black/[0.05] text-zinc-700' : 'bg-white/[0.06] text-accent'}`}>
                    <EyeOff size={13} />
                </div>
                <span className="font-semibold tracking-tight whitespace-nowrap">
                    {t('chrome.eraserTitle', null, 'Hide Distracting Items')}
                </span>
                {hiddenCount > 0 && (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${isBright ? 'bg-black/[0.06] text-zinc-700' : 'bg-white/10 text-white/80'}`}>
                        {hiddenCount}
                    </span>
                )}
            </div>

            {hiddenCount > 0 && (
                <>
                    <button
                        type="button"
                        onClick={handleUndo}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                            isBright
                                ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950'
                                : 'hover:bg-white/[0.08] text-white/80 hover:text-white'
                        }`}
                        title={t('chrome.eraserUndoTooltip', null, 'Undo last hidden item (Ctrl+Z)')}
                    >
                        <Undo2 size={13} />
                        <span>{t('chrome.eraserUndo', null, 'Undo')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                            isBright
                                ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950'
                                : 'hover:bg-white/[0.08] text-white/80 hover:text-white'
                        }`}
                        title={t('chrome.eraserShowAllTooltip', null, 'Restore all hidden items for this site')}
                    >
                        <RotateCcw size={13} />
                        <span>{t('chrome.eraserShowAll', null, 'Show All')}</span>
                    </button>
                </>
            )}

            <button
                type="button"
                onClick={() => toggleElementEraser(false)}
                className={`ml-0.5 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${
                    isBright
                        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                        : 'bg-accent text-zinc-950 hover:brightness-105'
                }`}
            >
                <Check size={13} strokeWidth={2.5} />
                <span>{t('chrome.eraserDone', null, 'Done')}</span>
            </button>
        </div>
    );
}
