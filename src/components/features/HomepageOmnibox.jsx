import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, Search, X, Command } from 'lucide-react';
import useOmniboxEngine, { getCompletedSuggestionText } from '../../hooks/useOmniboxEngine';
import OmniboxSuggestionsDropdown from '../common/OmniboxSuggestionsDropdown';
import useUIStore from '../../store/useUIStore';

const isOverlayBlockingHomepage = (state) => Boolean(
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
    state.activePinnedStack ||
    (state.isSplitView && state.focusedPane === 'right')
);

export default function HomepageOmnibox({ 
    isTor = false, 
    isDark = true, 
    isBright = false, 
    isActiveSpace = true,
    onDropdownOpenChange 
}) {
    const isBlockedByOverlay = useUIStore(isOverlayBlockingHomepage);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const isSplitView = useUIStore(state => state.isSplitView);
    const zoomLevel = useUIStore(state => state.zoomLevel);

    const canBeActive = isActiveSpace && !isBlockedByOverlay;

    const [isFocused, setIsFocused] = useState(false);
    const [isCardHovered, setIsCardHovered] = useState(false);
    const [portalRect, setPortalRect] = useState(null);

    const wrapperRef = useRef(null);
    const cardRef = useRef(null);
    const dropdownPortalRef = useRef(null);
    const resetRef = useRef(null);
    const onDropdownOpenChangeRef = useRef(onDropdownOpenChange);

    useEffect(() => {
        onDropdownOpenChangeRef.current = onDropdownOpenChange;
    }, [onDropdownOpenChange]);

    const {
        inputValue,
        setInputValue,
        activeBang,
        setActiveBang,
        clearActiveBang,
        selectedIndex,
        setSelectedIndex,
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
        isActive: canBeActive && isFocused,
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
        onDropdownOpenChangeRef.current?.(false);
        inputRef.current?.blur();
    }, [setInputValue, setSelectedOptionText, clearActiveBang, originalQueryRef, inputRef]);

    useEffect(() => {
        resetRef.current = resetToNormalState;
    }, [resetToNormalState]);

    // Auto-focus on mount or when switching into the active space, or immediately reset & blur when blocked by any overlay
    useEffect(() => {
        if (!canBeActive) {
            resetToNormalState();
            return;
        }
        const timer = setTimeout(() => {
            if (!isOverlayBlockingHomepage(useUIStore.getState())) {
                inputRef.current?.focus();
            }
        }, 60);
        return () => clearTimeout(timer);
    }, [canBeActive, inputRef, resetToNormalState]);

    // Capture direct typing when on the homepage in the active space and no other input or overlay is active
    useEffect(() => {
        if (!canBeActive) return;

        const handleGlobalKeyDown = (e) => {
            if (isOverlayBlockingHomepage(useUIStore.getState())) return;
            if (e.target?.closest?.('#tab-map-overlay, [role="dialog"], #omnibox-overlay')) return;
            if (document.activeElement === inputRef.current) return;

            const targetTag = e.target?.tagName?.toLowerCase();
            if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || e.target?.isContentEditable) {
                return;
            }

            if (e.metaKey || e.ctrlKey || e.altKey) return;

            // Only capture printable characters
            if (e.key && e.key.length === 1) {
                inputRef.current?.focus();
                setIsFocused(true);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, [canBeActive, inputRef]);

    const activeStateRef = useRef({ isFocused: false, hasInput: false });
    activeStateRef.current = { isFocused, hasInput: Boolean(inputValue.length > 0 || activeBang) };

    // Click outside to reset Homepage Omnibox back to normal state
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                !wrapperRef.current?.contains(e.target) &&
                !dropdownPortalRef.current?.contains(e.target)
            ) {
                if (activeStateRef.current.isFocused || activeStateRef.current.hasInput) {
                    resetRef.current?.();
                }
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isDropdownVisible = canBeActive && (shouldShowDropdown || displayedDropdown);
    const isTypingOrActive = canBeActive && isFocused && (inputValue.trim().length > 0 || Boolean(activeBang));

    // Notify MainFrame so the Zen Dashboard clock + omnibox smoothly shift upward when suggestions open
    useEffect(() => {
        onDropdownOpenChangeRef.current?.(Boolean(canBeActive && shouldShowDropdown));
    }, [shouldShowDropdown, canBeActive]);

    // Dynamically measure position & available vertical space below #homepage-omnibox-card inside #qbrowse-main-frame
    const updateDropdownPosition = useCallback(() => {
        if (!cardRef.current) return;
        const cardRect = cardRef.current.getBoundingClientRect();
        if (cardRect.width <= 0) return;

        const mainEl = document.getElementById('qbrowse-main-frame');
        const bottomBoundary = mainEl ? mainEl.getBoundingClientRect().bottom : (window.innerHeight - 16);
        const top = Math.round(cardRect.bottom + 10);
        const left = Math.round(cardRect.left);
        const width = Math.round(cardRect.width);
        const maxHeight = Math.min(350, Math.max(140, Math.floor(bottomBoundary - cardRect.bottom - 28)));

        setPortalRect(prev => {
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
        if (!isDropdownVisible || !isActiveSpace) return;
        updateDropdownPosition();

        // Track the 500ms Zen Dashboard translateY transition frame-by-frame
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
    }, [
        isDropdownVisible,
        isActiveSpace,
        isSidebarHidden,
        isRightPanelOpen,
        isSplitView,
        zoomLevel,
        updateDropdownPosition
    ]);

    return (
        <div 
            ref={wrapperRef} 
            className={`relative w-[90%] ${isTypingOrActive ? 'max-w-[760px]' : 'max-w-[720px]'} transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] z-30`}
        >
            {/* Main Input Pill */}
            <div
                ref={cardRef}
                id="homepage-omnibox-card"
                onMouseEnter={() => setIsCardHovered(true)}
                onMouseLeave={() => setIsCardHovered(false)}
                onClick={() => {
                    if (!canBeActive) return;
                    inputRef.current?.focus();
                    setIsFocused(true);
                }}
                className={`group relative w-full rounded-[2rem] p-5 flex items-center gap-4 transition-all duration-300 ${!isTypingOrActive && !isDropdownVisible ? 'hover:scale-[1.015]' : ''} border antialiased ${
                    isTor
                        ? 'bg-purple-950/40 border-purple-500/30 hover:border-purple-400/60 backdrop-blur-3xl text-white'
                        : isDark
                            ? 'liquid-pill-dark hover:border-accent/60 text-white'
                            : 'liquid-pill-bright hover:border-accent/60 text-zinc-900'
                } ${
                    isCommandMode ? (isBright ? 'border-yellow-500/50' : 'border-yellow-500/30') : ''
                } ${
                    isTypingOrActive
                        ? (isTor 
                            ? 'border-purple-400/70' 
                            : 'border-accent/70')
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
                    <Terminal size={20} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse flex-shrink-0" />
                ) : activeBang ? (
                    <div 
                        className="w-5 h-5 flex items-center justify-center flex-shrink-0" 
                        style={{ color: activeBang.color, filter: `drop-shadow(0 0 6px ${activeBang.color}70)` }}
                    >
                        {activeBang.icon ? <activeBang.icon size={20} /> : <Search size={20} />}
                    </div>
                ) : (
                    <Search size={20} className={`transition-colors flex-shrink-0 ${
                        isTor ? 'text-purple-400 group-hover:text-purple-300' : (isDark ? 'text-white/40 group-hover:text-accent' : 'text-zinc-600 group-hover:text-accent')
                    }`} />
                )}

                {/* Active Bang Badge Chip */}
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
                                if (!inputValue.trim()) {
                                    onDropdownOpenChangeRef.current?.(false);
                                }
                                inputRef.current?.focus();
                            }}
                            className={`p-0.5 rounded-full transition ml-0.5 cursor-pointer ${
                                isBright ? 'hover:bg-black/10 text-zinc-500 hover:text-zinc-800' : 'hover:bg-white/20 text-white/70 hover:text-white'
                            }`}
                            title="Remove engine filter (Backspace)"
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
                        onChange={(e) => {
                            handleInputChange(e);
                            if (!e.target.value.trim() && !activeBang) {
                                onDropdownOpenChangeRef.current?.(false);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (!canBeActive || isOverlayBlockingHomepage(useUIStore.getState())) {
                                inputRef.current?.blur();
                                return;
                            }
                            setIsFocused(true);
                        }}
                        onBlur={() => {
                            if (!inputValue.trim() && !activeBang) {
                                setIsFocused(false);
                                onDropdownOpenChangeRef.current?.(false);
                            }
                        }}
                        placeholder={
                            isCommandMode
                                ? 'Type a browser command...'
                                : activeBang
                                    ? `Search ${activeBang.name} directly...`
                                    : isTor
                                        ? 'Search the web via Tor, enter .onion address...'
                                        : 'Search the web, or type a command...'
                        }
                        className={`w-full bg-transparent border-none text-base md:text-lg font-medium focus:outline-none focus:ring-0 p-0 transition-colors ${
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
                            title="Clear input (Esc)"
                        >
                            <X size={15} />
                        </button>
                    ) : (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-colors duration-300 ${
                            isTor 
                                ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' 
                                : (isDark 
                                    ? 'bg-white/5 border-white/10 group-hover:bg-accent/10 group-hover:border-accent/30 text-white/60' 
                                    : 'bg-zinc-100 border border-black/10 group-hover:bg-white text-zinc-700 group-hover:text-zinc-950 shadow-2xs')
                        }`}>
                            <Command size={11} className={`transition-colors ${isTor ? 'text-purple-300' : (isDark ? 'text-white/60 group-hover:text-accent' : 'text-zinc-600 group-hover:text-zinc-900')}`} />
                            <span className={`text-xs font-semibold transition-colors ${isTor ? 'text-purple-300' : (isDark ? 'text-white/60 group-hover:text-accent' : 'text-zinc-700 group-hover:text-zinc-950')}`}>K</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Portaled Right-Click Menu Styled Suggestion Dropdown (single root node so backdrop-filter blurs dashboard directly) */}
            {isDropdownVisible && isActiveSpace && portalRect && typeof document !== 'undefined' && createPortal(
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
                    maxHeightClass="max-h-[380px]"
                />,
                document.body
            )}
        </div>
    );
}
