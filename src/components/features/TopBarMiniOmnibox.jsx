import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    Search, Lock, Unlock, X, RefreshCw, BookOpen, Terminal
} from 'lucide-react';
import useOmniboxEngine, { getCompletedSuggestionText } from '../../hooks/useOmniboxEngine';
import OmniboxSuggestionsDropdown from '../common/OmniboxSuggestionsDropdown';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

const isBlockedByOtherOverlaySelector = (state) => Boolean(
    state.isOmniboxOpen ||
    state.isTabMapOpen ||
    state.activeModal ||
    state.activePopover ||
    state.isFindOpen ||
    state.isReaderOpen ||
    state.isScreenshotBarOpen ||
    state.isSnippingMode ||
    state.showSwitcher ||
    state.peekWindow
);

export default function TopBarMiniOmnibox({
    rawUrl = '',
    displayUrl = '',
    isTor = false,
    torStatus = 'idle',
    torVerifiedExitIp = '',
    torBootstrapProgress = 0,
    torLastError = '',
    togglePopover,
    isRefreshing = false,
    focusedTab = null,
    isReaderAvailable = false,
    isReaderOpen = false,
    isReaderLoading = false,
    toggleReaderMode,
    zoomLevel = 100,
    setZoomLevel,
    refresh,
    showToast,
    isBright = false
}) {
    const isTopBarOmniboxActive = useUIStore(state => state.isTopBarOmniboxActive);
    const setIsTopBarOmniboxActive = useUIStore(state => state.setIsTopBarOmniboxActive);
    const isBlockedByOtherOverlay = useUIStore(isBlockedByOtherOverlaySelector);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const isSplitView = useUIStore(state => state.isSplitView);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const frameCurvature = useUIStore(state => state.settings?.frameCurvature || 'default');
    const topBarPosition = useUIStore(state => state.settings?.topBarPosition || 'top');
    const isBottomBar = topBarPosition === 'bottom';
    const containerRef = useRef(null);
    const dropdownPortalRef = useRef(null);
    const [portalRect, setPortalRect] = useState(null);

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
        initialQuery: rawUrl || '',
        isActive: isTopBarOmniboxActive && !isBlockedByOtherOverlay,
        onClose: () => {
            setIsTopBarOmniboxActive(false);
            inputRef.current?.blur();
        }
    });

    // Immediately deactivate and blur if another overlay (Tab Map, Omnibox, Modal, etc.) opens
    useEffect(() => {
        if (isBlockedByOtherOverlay && isTopBarOmniboxActive) {
            setIsTopBarOmniboxActive(false);
            inputRef.current?.blur();
        }
    }, [isBlockedByOtherOverlay, isTopBarOmniboxActive, setIsTopBarOmniboxActive, inputRef]);

    // When activating, update input to rawUrl and select all text
    useEffect(() => {
        if (isTopBarOmniboxActive) {
            const initial = rawUrl && rawUrl !== 'about:blank' ? rawUrl : '';
            setInputValue(initial);
            originalQueryRef.current = initial;
            setSelectedOptionText(null);
            clearActiveBang();
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 30);
        }
    }, [isTopBarOmniboxActive, rawUrl, setInputValue, setSelectedOptionText, clearActiveBang, originalQueryRef, inputRef]);

    // Handle outside clicks to exit active mode (checking both pill and portaled dropdown)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                isTopBarOmniboxActive &&
                !containerRef.current?.contains(e.target) &&
                !dropdownPortalRef.current?.contains(e.target)
            ) {
                setIsTopBarOmniboxActive(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [isTopBarOmniboxActive, setIsTopBarOmniboxActive]);

    const isDropdownVisible = !isBlockedByOtherOverlay && (shouldShowDropdown || displayedDropdown);

    const updateDropdownPosition = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
            const left = Math.round(rect.left);
            const width = Math.round(rect.width);
            if (topBarPosition === 'bottom') {
                const bottom = Math.round(window.innerHeight - rect.top + 8);
                const maxHeight = Math.max(120, Math.round(rect.top - 16));
                setPortalRect(prev => {
                    if (
                        prev &&
                        prev.isBottom === true &&
                        prev.bottom === bottom &&
                        prev.left === left &&
                        prev.width === width &&
                        prev.maxHeight === maxHeight
                    ) {
                        return prev;
                    }
                    return { bottom, left, width, isBottom: true, maxHeight };
                });
            } else {
                const top = Math.round(rect.bottom + 8);
                setPortalRect(prev => {
                    if (
                        prev &&
                        prev.isBottom === false &&
                        prev.top === top &&
                        prev.left === left &&
                        prev.width === width
                    ) {
                        return prev;
                    }
                    return { top, left, width, isBottom: false };
                });
            }
        }
    }, [topBarPosition]);

    useLayoutEffect(() => {
        if (!isTopBarOmniboxActive && !isDropdownVisible) return;
        updateDropdownPosition();

        // Track smooth width expansion CSS transition frame-by-frame
        let rafId = null;
        const startTime = performance.now();
        const trackTransition = (now) => {
            updateDropdownPosition();
            if (now - startTime < 340) {
                rafId = requestAnimationFrame(trackTransition);
            }
        };
        rafId = requestAnimationFrame(trackTransition);

        window.addEventListener('resize', updateDropdownPosition);
        window.addEventListener('scroll', updateDropdownPosition, true);

        let resizeObserver = null;
        if (containerRef.current && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateDropdownPosition);
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateDropdownPosition);
            window.removeEventListener('scroll', updateDropdownPosition, true);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [
        isTopBarOmniboxActive,
        isDropdownVisible,
        isSidebarHidden,
        isRightPanelOpen,
        isSplitView,
        uiScale,
        topBarPosition,
        updateDropdownPosition
    ]);

    return (
        <div ref={containerRef} className="relative w-full flex items-center justify-center">
            {/* Main Pill */}
            <div
                id="tour-omnibox-trigger"
                onClick={() => {
                    if (!isTopBarOmniboxActive) {
                        setIsTopBarOmniboxActive(true);
                    }
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const x = e.clientX + 220 > window.innerWidth ? window.innerWidth - 230 : e.clientX;
                    const y = e.clientY + 200 > window.innerHeight ? window.innerHeight - 220 : e.clientY;
                    useUIStore.getState().setTopBarContextMenu({ x, y, url: rawUrl, tabId: focusedTab?.id });
                }}
                className={`relative w-full flex items-center justify-between px-3 h-9 ${
                    frameCurvature === 'square' ? 'rounded-none !rounded-none' : frameCurvature === 'cohesive' ? 'rounded-xl' : 'rounded-full'
                } transition-[border-color,box-shadow,background-color] duration-200 group min-w-0 gap-2 border select-none antialiased ${
                    isBright 
                        ? 'liquid-pill-bright hover:border-accent/60' 
                        : 'liquid-pill-dark hover:border-accent/50'
                } ${
                    isTopBarOmniboxActive
                        ? (isTor
                            ? 'border-purple-400/70 shadow-[0_0_25px_rgba(168,85,247,0.3),0_8px_24px_rgba(0,0,0,0.3)]'
                            : isBright
                                ? 'border-accent/70 shadow-[0_0_20px_var(--accent-20),0_8px_20px_rgba(0,0,0,0.08)]'
                                : 'border-accent/60 shadow-[0_0_25px_var(--accent-25),0_8px_24px_rgba(0,0,0,0.3)]')
                        : 'cursor-pointer'
                }`}
                title={!isTopBarOmniboxActive ? (rawUrl || 'Search or enter address') : undefined}
            >
                {/* Refresh Progress Indicator */}
                <div className={`absolute inset-0 ${
                    frameCurvature === 'square' ? 'rounded-none !rounded-none' : frameCurvature === 'cohesive' ? 'rounded-xl' : 'rounded-full'
                } overflow-hidden pointer-events-none`}>
                    <div className={`absolute bottom-0 left-0 h-[2px] bg-accent transition-all ease-out ${isRefreshing ? 'w-full duration-1000 opacity-100' : 'w-0 duration-0 opacity-0'}`} />
                </div>

                {/* Left Security Icon / Tor Indicator / Command Mode Icon */}
                {isCommandMode ? (
                    <Terminal size={15} className="text-yellow-500 animate-pulse flex-shrink-0" />
                ) : isTor ? (
                    <div
                        id="tour-omnibox-tor-trigger"
                        className="relative group/tor flex items-center flex-shrink-0 z-10 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePopover('tor');
                        }}
                        title="Tor Onion Circuit & Identity (Click to view circuit)"
                    >
                        <div className={`p-1 rounded-full transition-all duration-200 flex items-center justify-center relative select-none hover:scale-110 active:scale-95 ${
                            torStatus === 'connected'
                                ? 'text-purple-400 bg-purple-500/15 hover:bg-purple-500/25'
                                : (torStatus === 'starting' || torStatus === 'downloading')
                                ? 'text-purple-300 bg-purple-500/10 animate-pulse'
                                : 'text-purple-400/30 opacity-60 hover:opacity-100 hover:bg-purple-500/15'
                        }`}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                                <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                                <circle cx="12" cy="12" r="1.5"/>
                            </svg>
                            {torStatus === 'connected' && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                            )}
                            {(torStatus === 'starting' || torStatus === 'downloading') && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-300 animate-ping opacity-75" />
                            )}
                        </div>

                        {/* Micro-Tooltip */}
                        <div className="absolute left-0 top-full mt-2 hidden group-hover/tor:flex flex-col gap-0.5 min-w-[170px] max-w-[240px] p-2 bg-[#0c0c0f]/95 backdrop-blur-2xl border border-white/[0.06] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.65)] text-left text-white z-50 pointer-events-none animate-pop-in">
                            <div className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wide">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    torStatus === 'connected' ? 'bg-purple-400 shadow-[0_0_6px_#c084fc]' : 'bg-purple-300 animate-pulse'
                                }`} />
                                <span className="text-purple-300 font-mono">
                                    {torStatus === 'connected' ? 'Tor Connected' : 'Connecting Tor...'}
                                </span>
                            </div>
                            <div className="text-[10px] text-white/50 font-mono truncate pl-3">
                                {torVerifiedExitIp ? `Exit: ${torVerifiedExitIp}` : 'Circuit Ready'}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        id="tour-siteinfo-trigger"
                        className={`p-1 rounded-lg ${isBright ? 'hover:bg-black/10' : 'hover:bg-white/20'} transition-colors z-10 cursor-pointer group/lock flex-shrink-0 relative`}
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePopover('siteinfo');
                        }}
                        title="Site Security & Permissions"
                    >
                        {isRefreshing ? (
                            <X size={14} strokeWidth={1.85} className={isBright ? "text-zinc-500" : "text-gray-400"} />
                        ) : rawUrl ? (
                            (rawUrl.startsWith('http://') || focusedTab?.title?.startsWith('Insecure') || focusedTab?.title?.startsWith('Error')) ? (
                                <Unlock size={14} strokeWidth={1.85} className="text-amber-400 group-hover/lock:scale-110 transition-transform" />
                            ) : (
                                <Lock size={14} strokeWidth={1.85} className={`group-hover/lock:scale-110 transition-transform ${isBright ? 'text-emerald-600' : 'text-emerald-400'}`} />
                            )
                        ) : (
                            <Search size={14} strokeWidth={1.85} className={isBright ? 'text-zinc-400 group-hover/lock:text-zinc-600' : 'text-white/40 group-hover/lock:text-white/70'} />
                        )}
                    </div>
                )}

                {/* Active Bang Chip */}
                {isTopBarOmniboxActive && activeBang && (
                    <div
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-xs select-none flex-shrink-0 animate-pop-in"
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
                            className="p-0.5 rounded-full hover:bg-black/10 ml-0.5 cursor-pointer"
                        >
                            <X size={10} />
                        </button>
                    </div>
                )}

                {/* Center Content: Interactive Input when active, or Displayed URL when idle */}
                {isTopBarOmniboxActive ? (
                    <div className="flex-1 min-w-0 flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={selectedOptionText !== null ? selectedOptionText : inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                isCommandMode 
                                    ? 'Type a browser command...' 
                                    : activeBang 
                                        ? `Search ${activeBang.name}...` 
                                        : isTor 
                                            ? 'Search web or enter .onion...' 
                                            : 'Search or enter address...'
                            }
                            className={`w-full bg-transparent border-none text-[13px] font-medium focus:outline-none focus:ring-0 p-0 text-left transition-colors ${
                                isCommandMode 
                                    ? (isBright ? 'font-mono text-yellow-600' : 'font-mono text-yellow-400') 
                                    : (isBright ? 'text-zinc-900 placeholder-zinc-400' : 'text-white placeholder-white/35')
                            }`}
                            spellCheck="false"
                            autoComplete="off"
                        />
                    </div>
                ) : (
                    <span className={`flex-1 min-w-0 text-[13px] font-medium truncate transition-colors z-10 text-center select-none px-1 ${
                        isBright 
                            ? (displayUrl ? 'text-zinc-800' : 'text-zinc-500 group-hover:text-zinc-700') 
                            : (displayUrl ? 'text-white/90' : 'text-white/50 group-hover:text-white/80')
                    }`}>
                        {displayUrl || 'Search or enter address'}
                    </span>
                )}

                {/* Right Action Icons */}
                <div className="flex items-center gap-1.5 z-10 flex-shrink-0">
                    {isTopBarOmniboxActive ? (
                        <div className="flex items-center gap-1 flex-shrink-0 select-none">
                            {inputValue.length > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setInputValue('');
                                        setSelectedOptionText(null);
                                        clearActiveBang();
                                        inputRef.current?.focus();
                                    }}
                                    className={`p-1 rounded-full transition-colors cursor-pointer ${
                                        isBright ? 'hover:bg-black/10 text-zinc-400 hover:text-zinc-700' : 'hover:bg-white/10 text-white/40 hover:text-white'
                                    }`}
                                    title="Clear"
                                >
                                    <X size={13} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsTopBarOmniboxActive(false);
                                    inputRef.current?.blur();
                                }}
                                className={`px-1.5 py-0.5 rounded-md border text-[9px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                                    isBright
                                        ? 'bg-black/[0.04] border-black/10 text-zinc-500 hover:text-zinc-800 hover:bg-black/10'
                                        : 'bg-white/[0.06] border-white/10 text-white/45 hover:text-white/80 hover:bg-white/10'
                                }`}
                                title="Close (Esc)"
                            >
                                Esc
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Reader Mode Toggle Button */}
                            {Boolean(rawUrl && !rawUrl.startsWith('qbrowse://') && (isReaderAvailable || isReaderOpen)) && (
                                <div
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer animate-pop-in hover:scale-105 active:scale-95 ${
                                        isReaderOpen 
                                            ? 'bg-accent text-white font-bold shadow-xs' 
                                            : (isBright ? 'bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40' : 'bg-white/10 hover:bg-white/20 text-accent border border-accent/30')
                                    }`}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        toggleReaderMode(); 
                                    }}
                                    title="Toggle Reader Mode (Ctrl+Alt+R)"
                                >
                                    <BookOpen size={13} strokeWidth={1.85} className={isReaderLoading ? 'animate-pulse' : ''} />
                                    <span className="hidden sm:inline">Reader</span>
                                </div>
                            )}

                            {zoomLevel !== 100 && (
                                <div
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider transition-all cursor-pointer animate-pop-in hover:scale-105 active:scale-95 ${
                                        isBright ? 'bg-black/10 text-zinc-700 hover:bg-black/15' : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); setZoomLevel(100); }}
                                    title="Reset Zoom (CMD+0)"
                                >
                                    {zoomLevel}%
                                </div>
                            )}

                            <div
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                    isBright ? 'hover:bg-black/10 text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/10 text-white/40 hover:text-white'
                                }`}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (e.ctrlKey || e.metaKey) {
                                        if (rawUrl && !rawUrl.startsWith('qbrowse://')) {
                                            useTabStore.getState().handleNewTab(rawUrl, false);
                                            showToast('Duplicated tab in background');
                                        }
                                    } else {
                                        refresh(); 
                                    }
                                }}
                                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                                onAuxClick={(e) => {
                                    if (e.button === 1) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (rawUrl && !rawUrl.startsWith('qbrowse://')) {
                                            useTabStore.getState().handleNewTab(rawUrl, false);
                                            showToast('Duplicated tab in background');
                                        }
                                    }
                                }}
                                title="Reload page (Middle-click to duplicate in background)"
                            >
                                <RefreshCw size={13} strokeWidth={1.85} className={isRefreshing ? 'animate-spin' : ''} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Portaled Right-Click Menu Styled Suggestion Dropdown (single root node so backdrop-filter blurs webpage directly) */}
            {isDropdownVisible && portalRect && typeof document !== 'undefined' && createPortal(
                <OmniboxSuggestionsDropdown
                    containerRef={dropdownPortalRef}
                    dropdownRef={dropdownRef}
                    isClosing={isDropdownClosing}
                    style={{
                        position: 'fixed',
                        ...(portalRect.isBottom ? {
                            bottom: `${portalRect.bottom}px`,
                            top: 'auto',
                            transformOrigin: 'bottom center',
                            maxHeight: `${Math.min(380, portalRect.maxHeight)}px`
                        } : {
                            top: `${portalRect.top}px`,
                            bottom: 'auto',
                            transformOrigin: 'top center'
                        }),
                        left: `${portalRect.left}px`,
                        width: `${portalRect.width}px`,
                        zIndex: 10000,
                        WebkitAppRegion: 'no-drag'
                    }}
                    compact={true}
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
                    maxHeightClass={portalRect.isBottom ? '' : "max-h-[360px]"}
                />,
                document.body
            )}
        </div>
    );
}
