import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, Search, X, CornerDownLeft, Layers, Sparkles, Globe, Columns } from 'lucide-react';
import useOmniboxEngine, { getCompletedSuggestionText } from '../../hooks/useOmniboxEngine';
import OmniboxSuggestionsDropdown from '../common/OmniboxSuggestionsDropdown';
import useUIStore from '../../store/useUIStore';
import { getSafeFaviconUrl } from '../../utils/networkPrivacy';
import { formatTabCount } from '../../i18n/domains/chrome';
import { useTranslation } from '../../i18n/index';

const isOverlayBlockingSplitLauncher = (state) => Boolean(
    state.isOmniboxOpen ||
    state.isOmniboxClosing ||
    state.isTopBarOmniboxActive ||
    state.isTabMapOpen ||
    state.isTabMapClosing ||
    state.activeModal ||
    state.isModalClosing ||
    state.activePopover ||
    state.isPopoverClosing ||
    state.isRightPanelOpen ||
    state.isFindOpen ||
    state.isReaderOpen ||
    state.isScreenshotBarOpen ||
    state.isSnippingMode ||
    state.showSwitcher ||
    state.peekWindow ||
    state.passkeyPrompt ||
    state.activeDialog ||
    state.contextMenu ||
    state.tabContextMenu ||
    state.folderContextMenu ||
    state.pinnedContextMenu ||
    state.topBarContextMenu ||
    state.toolHubContextMenu ||
    state.activePinnedStack
);

export default function SplitPaneLauncher({
    slotIdx = 1,
    isFocusedSlot = false,
    isQuadSplit = false,
    isVerticalSplit = false,
    isSplitLeft = false,
    isBright = false,
    isTor = false,
    isDark = true,
    isReducedMotion = false,
    zoomLevel = 100,
    availableTabs = [],
    settings,
    resolvedLanguage,
    onSelectTab,
    onOpenUrl
}) {
    const { t } = useTranslation();
    const isBlockedByOverlay = useUIStore(isOverlayBlockingSplitLauncher);
    const canBeActive = isFocusedSlot && !isBlockedByOverlay;

    const [isFocused, setIsFocused] = useState(false);
    const [isCardHovered, setIsCardHovered] = useState(false);
    const [portalRect, setPortalRect] = useState(null);

    const rootRef = useRef(null);
    const wrapperRef = useRef(null);
    const cardRef = useRef(null);
    const dropdownPortalRef = useRef(null);
    const resetRef = useRef(null);

    const {
        inputValue,
        setInputValue,
        activeBang,
        setActiveBang,
        clearActiveBang,
        selectedIndex,
        selectedOptionText,
        setSelectedOptionText,
        inputRef,
        dropdownRef,
        originalQueryRef,
        isCommandMode,
        isBangSuggestionMode,
        bangSuggestions,
        filteredCommands,
        filteredPredictions,
        shouldShowDropdown,
        displayedDropdown,
        isDropdownClosing,
        handleInputChange,
        handleOptionMouseMove,
        handleKeyDown,
        handleExecuteCommand,
        handleSelectPrediction
    } = useOmniboxEngine({
        initialQuery: '',
        isActive: !isBlockedByOverlay && (isFocused || isFocusedSlot),
        onNavigate: (targetUrl, cleanTitle) => {
            onOpenUrl?.(targetUrl, cleanTitle);
        },
        onClose: () => {
            resetRef.current?.();
        }
    });

    const resetToNormalState = useCallback(() => {
        setInputValue('');
        originalQueryRef.current = '';
        setSelectedOptionText(null);
        clearActiveBang();
        setIsFocused(false);
        inputRef.current?.blur();
    }, [setInputValue, originalQueryRef, setSelectedOptionText, clearActiveBang, inputRef]);

    useEffect(() => {
        resetRef.current = resetToNormalState;
    }, [resetToNormalState]);

    // Auto-focus when this split slot becomes the focused slot
    useEffect(() => {
        if (!canBeActive) return;
        const timer = setTimeout(() => {
            if (!isOverlayBlockingSplitLauncher(useUIStore.getState())) {
                inputRef.current?.focus();
                setIsFocused(true);
            }
        }, 60);
        return () => clearTimeout(timer);
    }, [canBeActive, inputRef]);

    // Capture direct printable keystrokes when this split slot is focused
    useEffect(() => {
        if (!canBeActive) return;
        const handleGlobalKeyDown = (e) => {
            if (isOverlayBlockingSplitLauncher(useUIStore.getState())) return;
            if (e.target?.closest?.('#tab-map-overlay, [role="dialog"], #omnibox-overlay')) return;
            if (document.activeElement === inputRef.current) return;

            const targetTag = e.target?.tagName?.toLowerCase();
            if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || e.target?.isContentEditable) {
                return;
            }
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key && e.key.length === 1) {
                inputRef.current?.focus();
                setIsFocused(true);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, [canBeActive, inputRef]);

    // Reset only when clicking outside the entire Split Screen launcher & dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (e.target?.closest?.('[data-context-menu]')) return;
            if (
                !rootRef.current?.contains(e.target) &&
                !dropdownPortalRef.current?.contains(e.target)
            ) {
                if (isFocused || inputValue.length > 0 || activeBang) {
                    resetRef.current?.();
                }
            }
        };
        window.addEventListener('mousedown', handleClickOutside, true);
        return () => window.removeEventListener('mousedown', handleClickOutside, true);
    }, [isFocused, inputValue, activeBang]);

    const isDropdownVisible = Boolean(!isBlockedByOverlay && (shouldShowDropdown || displayedDropdown));
    const isDropdownOpen = Boolean(!isBlockedByOverlay && shouldShowDropdown);
    const isTypingOrActive = isFocused && (inputValue.trim().length > 0 || Boolean(activeBang));

    const updateDropdownPosition = useCallback(() => {
        if (!cardRef.current) return;
        const cardRect = cardRef.current.getBoundingClientRect();
        if (cardRect.width <= 0) return;

        const mainEl = document.getElementById('qbrowse-main-frame');
        const bottomBoundary = mainEl ? mainEl.getBoundingClientRect().bottom : (window.innerHeight - 16);
        const top = Math.round(cardRect.bottom + 10);
        const left = Math.round(cardRect.left);
        const width = Math.round(cardRect.width);
        const maxHeight = Math.min(340, Math.max(120, Math.floor(bottomBoundary - cardRect.bottom - 24)));

        setPortalRect((prev) => {
            if (
                prev &&
                prev.top === top &&
                prev.left === left &&
                prev.width === width &&
                prev.maxHeight === maxHeight
            ) {
                return prev;
            }
            return { top, left, width, maxHeight };
        });
    }, []);

    useLayoutEffect(() => {
        if (!isDropdownVisible) return;
        updateDropdownPosition();

        let rafId = null;
        const startTime = performance.now();
        const trackTransition = (now) => {
            updateDropdownPosition();
            if (now - startTime < 540) {
                rafId = requestAnimationFrame(trackTransition);
            }
        };
        rafId = requestAnimationFrame(trackTransition);

        window.addEventListener('resize', updateDropdownPosition);
        window.addEventListener('scroll', updateDropdownPosition, true);

        let resizeObserver = null;
        if (cardRef.current && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateDropdownPosition);
            resizeObserver.observe(cardRef.current);
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateDropdownPosition);
            window.removeEventListener('scroll', updateDropdownPosition, true);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [isDropdownVisible, isDropdownOpen, zoomLevel, isQuadSplit, updateDropdownPosition]);

    const placeholderText = isCommandMode
        ? t('chrome.omniboxPlaceholderCommand', null, 'Type a browser command...')
        : activeBang
            ? t('chrome.omniboxPlaceholderBang', { engine: activeBang.name }, `Search ${activeBang.name} directly...`)
            : isQuadSplit
                ? t('chrome.splitSearchPanePlaceholder', { pane: slotIdx + 1 }, `Search or URL for Pane ${slotIdx + 1}...`)
                : isVerticalSplit
                    ? t('chrome.splitSearchBottomPlaceholder', null, 'Search or enter URL for Bottom Pane...')
                    : isSplitLeft
                        ? t('chrome.splitSearchLeftPlaceholder', null, 'Search or enter URL for Left Pane...')
                        : t('chrome.splitSearchRightPlaceholder', null, 'Search or enter URL for Right Pane...');

    return (
        <div
            ref={rootRef}
            onMouseDown={(e) => {
                // Clicking empty Split Screen space focuses the URL pill directly
                if (!e.target?.closest?.('[data-split-tab-item], button')) {
                    setTimeout(() => {
                        inputRef.current?.focus();
                        setIsFocused(true);
                    }, 0);
                }
            }}
            className={`absolute inset-0 flex flex-col items-center justify-center overflow-visible z-10 w-full h-full pointer-events-auto ${
                isReducedMotion ? 'transition-none' : 'animate-pop-in'
            }`}
        >
            <div
                className={`relative z-10 flex flex-col items-center origin-center w-full ${
                    isQuadSplit ? 'mt-0 px-3' : 'mt-[-10vh]'
                } ${
                    isReducedMotion ? 'transition-none' : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
                }`}
                style={{
                    transform: `translateY(${isDropdownOpen ? '-10vh' : '0px'}) scale(${isQuadSplit ? 1 : zoomLevel / 100})`
                }}
            >
                {/* Hero Header — exact same baseline height as New Tab's clock */}
                <div
                    className={`flex flex-col items-center px-4 w-full text-center select-none ${
                        isReducedMotion ? 'transition-none' : 'transition-[margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
                    } ${
                        isQuadSplit
                            ? (isDropdownOpen ? 'mb-2' : 'mb-4')
                            : (isDropdownOpen ? 'mb-6 md:mb-8' : 'mb-10 md:mb-14')
                    }`}
                >
                    <span
                        className={`font-bold uppercase tracking-[0.4em] drop-shadow-sm transition-colors duration-500 ${
                            isQuadSplit ? 'text-[10px] mb-1.5' : 'text-sm mb-4'
                        } ${
                            isTor ? 'text-purple-300/60' : (isDark ? 'text-white/50' : 'text-zinc-700 font-bold')
                        }`}
                    >
                        {isQuadSplit
                            ? t('chrome.quadWorkspaceSlot', { pane: slotIdx + 1 }, `QUAD • PANE ${slotIdx + 1}`)
                            : t('chrome.dualWorkspace', null, 'DUAL WORKSPACE')}
                    </span>

                    <div className={isQuadSplit ? 'flex items-center justify-center' : 'h-[5rem] md:h-[8rem] flex items-center justify-center'}>
                        <h2
                            className={`${
                                isQuadSplit ? 'text-3xl md:text-4xl' : 'text-[3rem] md:text-[5rem]'
                            } leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${
                                isTor
                                    ? 'from-purple-200 via-purple-300/85 to-purple-500/20'
                                    : (isDark
                                        ? 'from-white via-white/90 to-white/20'
                                        : 'from-zinc-900 via-zinc-800 to-zinc-700')
                            } transition-colors duration-500 px-4`}
                            style={{
                                fontFamily: 'var(--clock-font-family)',
                                filter: isTor
                                    ? 'drop-shadow(0 16px 36px rgba(168,85,247,0.35)) drop-shadow(0 4px 12px rgba(0,0,0,0.45))'
                                    : (isDark
                                        ? 'drop-shadow(0 18px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(var(--accent-rgb),0.14))'
                                        : 'drop-shadow(0 16px 36px rgba(0,0,0,0.08))')
                            }}
                        >
                            {t('chrome.splitScreen', null, 'Split Screen')}
                        </h2>
                    </div>
                </div>

                {/* New-Tab-Parity Liquid Glass Omnibox Pill */}
                <div
                    ref={wrapperRef}
                    className={`relative ${
                        isQuadSplit
                            ? 'w-[94%] max-w-[440px]'
                            : `w-[90%] ${isTypingOrActive ? 'max-w-[760px]' : 'max-w-[720px]'}`
                    } transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] z-30`}
                >
                    <div
                        ref={cardRef}
                        onMouseEnter={() => setIsCardHovered(true)}
                        onMouseLeave={() => setIsCardHovered(false)}
                        onClick={() => {
                            inputRef.current?.focus();
                            setIsFocused(true);
                        }}
                        className={`group relative w-full ${
                            isQuadSplit ? 'rounded-[1.5rem] p-3 gap-2.5' : 'rounded-[2rem] p-5 gap-4'
                        } flex items-center transition-all duration-300 ${!isTypingOrActive && !isDropdownVisible ? 'hover:scale-[1.015]' : ''} border antialiased ${
                            isTor
                                ? 'bg-purple-950/40 border-purple-500/30 hover:border-purple-400/60 backdrop-blur-3xl text-white'
                                : isDark
                                    ? 'liquid-pill-dark hover:border-accent/60 text-white'
                                    : 'liquid-pill-bright hover:border-accent/60 text-zinc-900'
                        } ${
                            isCommandMode ? (isBright ? 'border-yellow-500/50' : 'border-yellow-500/30') : ''
                        } ${
                            isTypingOrActive
                                ? (isTor ? 'border-purple-400/70' : 'border-accent/70')
                                : ''
                        }`}
                        style={{
                            boxShadow: isCommandMode
                                ? (isBright
                                    ? '0 20px 60px -10px rgba(234, 179, 8, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.08)'
                                    : '0 0 35px -5px rgba(234, 179, 8, 0.2), 0 25px 70px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)')
                                : isTor
                                    ? (isTypingOrActive || isCardHovered
                                        ? '0 0 35px rgba(168, 85, 247, 0.4), 0 20px 80px rgba(168, 85, 247, 0.35)'
                                        : '0 20px 50px rgba(168, 85, 247, 0.2)')
                                    : isBright
                                        ? (activeBang
                                            ? `0 20px 60px -10px ${activeBang.color}25, 0 8px 24px -4px rgba(0, 0, 0, 0.08)`
                                            : (isTypingOrActive || isCardHovered
                                                ? '0 0 30px var(--accent-30), 0 10px 35px var(--accent-20)'
                                                : '0 12px 36px rgba(0, 0, 0, 0.06)'))
                                        : (activeBang
                                            ? `0 0 35px -5px ${activeBang.color}25, 0 25px 70px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)`
                                            : (isTypingOrActive || isCardHovered
                                                ? '0 0 35px var(--accent-40), 0 15px 50px var(--accent-20)'
                                                : '0 20px 50px rgba(0, 0, 0, 0.4)'))
                        }}
                    >
                        {isCommandMode ? (
                            <Terminal size={isQuadSplit ? 16 : 20} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse flex-shrink-0" />
                        ) : activeBang ? (
                            <div
                                className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                                style={{ color: activeBang.color, filter: `drop-shadow(0 0 6px ${activeBang.color}70)` }}
                            >
                                {activeBang.icon ? <activeBang.icon size={isQuadSplit ? 16 : 20} /> : <Search size={isQuadSplit ? 16 : 20} />}
                            </div>
                        ) : (
                            <Search
                                size={isQuadSplit ? 16 : 20}
                                className={`transition-colors flex-shrink-0 ${
                                    isTor ? 'text-purple-400 group-hover:text-purple-300' : (isDark ? 'text-white/40 group-hover:text-accent' : 'text-zinc-600 group-hover:text-accent')
                                }`}
                            />
                        )}

                        {activeBang && (
                            <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs select-none flex-shrink-0 animate-pop-in"
                                style={{
                                    backgroundColor: `${activeBang.color}20`,
                                    borderColor: `${activeBang.color}40`,
                                    color: activeBang.color
                                }}
                            >
                                <span>{activeBang.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearActiveBang();
                                        inputRef.current?.focus();
                                    }}
                                    className={`p-0.5 rounded-full transition ml-0.5 cursor-pointer ${
                                        isBright ? 'hover:bg-black/10 text-zinc-500 hover:text-zinc-800' : 'hover:bg-white/20 text-white/70 hover:text-white'
                                    }`}
                                    title={t('chrome.omniboxRemoveEngine', null, 'Remove engine filter (Backspace)')}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        <div className="relative flex-1 min-w-0 flex items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={selectedOptionText !== null ? selectedOptionText : inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => {
                                    if (!inputValue.trim() && !activeBang) {
                                        setIsFocused(false);
                                    }
                                }}
                                placeholder={placeholderText}
                                className={`w-full bg-transparent border-none ${
                                    isQuadSplit ? 'text-xs md:text-sm' : 'text-base md:text-lg'
                                } font-medium focus:outline-none focus:ring-0 p-0 transition-colors ${
                                    isCommandMode
                                        ? (isBright ? 'font-mono text-yellow-600 tracking-wide' : 'font-mono text-yellow-400 tracking-wide')
                                        : isTor
                                            ? 'text-white placeholder-purple-200/70 group-hover:placeholder-purple-100'
                                            : isDark
                                                ? 'text-white placeholder-white/40 group-hover:placeholder-white/85'
                                                : 'text-zinc-900 placeholder-zinc-700 group-hover:placeholder-zinc-950'
                                }`}
                                spellCheck="false"
                                autoComplete="off"
                            />
                        </div>

                        <div className="h-[26px] flex items-center gap-1.5 flex-shrink-0 select-none">
                            {inputValue.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        resetToNormalState();
                                    }}
                                    className={`p-1 rounded-full transition-colors cursor-pointer ${
                                        isBright ? 'hover:bg-black/10 text-zinc-400 hover:text-zinc-700' : 'hover:bg-white/10 text-white/40 hover:text-white'
                                    }`}
                                    title={t('chrome.omniboxClearInput', null, 'Clear input (Esc)')}
                                >
                                    <X size={15} />
                                </button>
                            ) : (
                                <div
                                    className={`flex items-center gap-1 px-2 py-1 rounded-xl border transition-colors duration-300 ${
                                        isTor
                                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                                            : (isDark
                                                ? 'bg-white/5 border-white/10 group-hover:bg-accent/10 group-hover:border-accent/30 text-white/60'
                                                : 'bg-zinc-100 border border-black/10 group-hover:bg-white text-zinc-700 group-hover:text-zinc-950 shadow-2xs')
                                    }`}
                                >
                                    <CornerDownLeft size={11} className={`transition-colors ${isTor ? 'text-purple-300' : (isDark ? 'text-white/60 group-hover:text-accent' : 'text-zinc-600 group-hover:text-zinc-900')}`} />
                                </div>
                            )}
                        </div>
                    </div>

                    {isDropdownVisible && portalRect && typeof document !== 'undefined' && createPortal(
                        <OmniboxSuggestionsDropdown
                            containerRef={dropdownPortalRef}
                            dropdownRef={dropdownRef}
                            isClosing={isDropdownClosing}
                            style={{
                                position: 'fixed',
                                top: `${portalRect.top}px`,
                                left: `${portalRect.left}px`,
                                width: `${portalRect.width}px`,
                                maxHeight: `${portalRect.maxHeight}px`,
                                zIndex: 10000
                            }}
                            isCommandMode={isCommandMode}
                            commandQuery={inputValue.slice(1).trim()}
                            filteredCommands={filteredCommands}
                            isBangSuggestionMode={isBangSuggestionMode}
                            bangSuggestions={bangSuggestions}
                            filteredPredictions={filteredPredictions}
                            selectedIndex={selectedIndex}
                            searchQuery={inputValue}
                            onSelectCommand={handleExecuteCommand}
                            onSelectBang={(bang) => {
                                setActiveBang(bang);
                                setInputValue('');
                                setSelectedOptionText(null);
                                inputRef.current?.focus();
                            }}
                            onSelectPrediction={handleSelectPrediction}
                            onOptionMouseMove={handleOptionMouseMove}
                            onTabIntoFolder={(pred) => {
                                const text = getCompletedSuggestionText(pred, inputValue);
                                originalQueryRef.current = text;
                                setSelectedOptionText(null);
                                setInputValue(text);
                                inputRef.current?.focus();
                            }}
                            isBright={isBright}
                            isTor={isTor}
                            maxHeightClass="max-h-[340px]"
                        />,
                        document.body
                    )}
                </div>

                {/* Open Tabs Tray — absolute in 2-pane so URL pill matches New Tab baseline */}
                <div
                    className={`${
                        isQuadSplit
                            ? 'mt-3 w-[94%] max-w-[440px] max-h-[120px]'
                            : 'absolute top-[calc(100%+1.5rem)] w-[90%] max-w-[720px] max-h-[26vh]'
                    } flex flex-col gap-1.5 overflow-y-auto hide-scroll text-left transition-all duration-250 ${
                        isDropdownVisible ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'
                    }`}
                >
                    <div className="flex items-center justify-between w-full mb-0.5 px-1">
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 ${isBright ? 'text-zinc-600' : 'text-white/45'}`}>
                            <Layers size={11} className="text-accent" />
                            {t('chrome.openTabsInSpace', null, 'Open Tabs in this Space')}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isBright ? 'bg-black/[0.04] text-zinc-600' : 'bg-white/[0.04] text-white/45'}`}>
                            {formatTabCount(availableTabs.length, resolvedLanguage, t)}
                        </span>
                    </div>

                    {availableTabs.length === 0 ? (
                        <div
                            className={`w-full p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 text-center shadow-xs ${
                                isBright
                                    ? 'bg-black/[0.02] text-zinc-600 border-black/[0.06]'
                                    : 'bg-white/[0.025] text-white/50 border-white/[0.07]'
                            }`}
                        >
                            <Sparkles size={13} className="text-accent shrink-0" />
                            <span className={`text-xs font-medium ${isBright ? 'text-zinc-700' : 'text-white/70'}`}>
                                {t('chrome.noOtherOpenTabs', null, 'No other open tabs')}
                            </span>
                        </div>
                    ) : (
                        availableTabs.map((tabItem, idx) => (
                            <div
                                key={tabItem.id}
                                data-split-tab-item="true"
                                onClick={() => onSelectTab?.(tabItem.id)}
                                style={!isReducedMotion ? { animationDelay: `${Math.min(idx * 40, 240)}ms` } : undefined}
                                className={`flex items-center justify-between ${
                                    isQuadSplit ? 'px-2.5 py-1.5 rounded-xl' : 'px-3.5 py-2.5 rounded-2xl'
                                } border cursor-pointer transition-all duration-200 hover:translate-x-[2px] group relative ${
                                    isReducedMotion ? '' : 'animate-split-row'
                                } ${
                                    isBright
                                        ? 'bg-black/[0.02] hover:bg-black/[0.05] border-black/[0.06] hover:border-accent/50 text-zinc-900 shadow-xs'
                                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.07] hover:border-accent/45 text-white shadow-xs'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                                    <div
                                        className={`${isQuadSplit ? 'w-5 h-5' : 'w-7 h-7'} rounded-full border flex items-center justify-center shrink-0 group-hover:border-accent/30 transition-all ${
                                            isBright ? 'bg-black/[0.04] border-black/[0.08]' : 'bg-white/[0.04] border-white/[0.07]'
                                        }`}
                                    >
                                        {getSafeFaviconUrl(tabItem.url, settings, 32) ? (
                                            <img
                                                src={getSafeFaviconUrl(tabItem.url, settings, 32)}
                                                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <Globe size={12} className={isBright ? 'text-zinc-400' : 'text-white/40'} />
                                        )}
                                    </div>
                                    <div className="flex flex-col text-left truncate min-w-0">
                                        <span
                                            className={`text-xs font-semibold truncate transition-colors flex items-center gap-1.5 ${
                                                isBright ? 'text-zinc-900 group-hover:text-accent' : 'text-white/90 group-hover:text-accent'
                                            }`}
                                        >
                                            {tabItem.title}
                                            {tabItem.pinnedId && (
                                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-accent/15 text-accent shrink-0">
                                                    Pin
                                                </span>
                                            )}
                                        </span>
                                        {!isQuadSplit && tabItem.url && (
                                            <span
                                                className={`text-[10px] font-mono truncate mt-0.5 ${
                                                    isBright ? 'text-zinc-500' : 'text-white/40'
                                                }`}
                                            >
                                                {tabItem.url}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectTab?.(tabItem.id);
                                    }}
                                    className={`${
                                        isQuadSplit ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]'
                                    } rounded-full bg-accent/15 border border-accent/30 text-accent group-hover:bg-accent group-hover:text-zinc-950 group-hover:scale-105 font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1 shrink-0`}
                                >
                                    <Columns size={11} strokeWidth={2.5} />
                                    <span>{t('chrome.open', null, 'Open')}</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
