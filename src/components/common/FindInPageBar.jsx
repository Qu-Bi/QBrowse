import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function FindInPageBar() {
    const {
        isFindOpen,
        findQuery,
        findMatchCase,
        findResults,
        setIsFindOpen,
        setFindQuery,
        setFindMatchCase,
        findNextMatch
    } = useUIStore();

    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const inputRef = useRef(null);

    const [displayedOpen, setDisplayedOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const closeTimerRef = useRef(null);

    useEffect(() => {
        if (isFindOpen) {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            setDisplayedOpen(true);
            setIsClosing(false);
            // Auto focus and select existing query on open
            const timer = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 50);
            return () => clearTimeout(timer);
        } else if (displayedOpen && !isClosing) {
            setIsClosing(true);
            closeTimerRef.current = setTimeout(() => {
                setDisplayedOpen(false);
                setIsClosing(false);
            }, 200);
        }
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, [isFindOpen]);

    if (!displayedOpen) return null;

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
            e.preventDefault();
            e.stopPropagation();
            setIsFindOpen(false);
            const activeTab = useTabStore.getState().getActiveTab();
            if (activeTab) {
                useTabStore.getState().handleCloseTab(activeTab.id);
            }
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            findNextMatch(!e.shiftKey);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsFindOpen(false);
        } else if (e.key === 'F3') {
            e.preventDefault();
            findNextMatch(!e.shiftKey);
        }
    };

    const hasQuery = Boolean(findQuery && findQuery.trim());
    const hasMatches = findResults.matches > 0;

    return (
        <div 
            style={{ 
                backdropFilter: 'blur(28px) saturate(180%)', 
                WebkitBackdropFilter: 'blur(28px) saturate(180%)' 
            }}
            className={`absolute top-5 right-7 z-[60] flex items-center gap-1.5 backdrop-blur-2xl rounded-full h-11 px-3.5 ${
                isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'
            } origin-top-right select-none transition-all duration-200 border ${
                isBright
                    ? 'bg-white/90 border-black/[0.06] shadow-[0_16px_40px_rgba(0,0,0,0.12)] text-zinc-900'
                    : 'bg-[#181a24]/80 border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.55)] text-white/90'
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0">
                <Search size={12} className={isBright ? 'text-zinc-500' : 'text-accent'} />
            </div>
            
            <input
                ref={inputRef}
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Find in page..."
                className={`w-44 md:w-56 bg-transparent text-xs outline-none border-none pr-1 ${
                    isBright ? 'text-zinc-900 placeholder-zinc-400 font-medium' : 'text-white placeholder-white/40 font-medium'
                }`}
                spellCheck={false}
                autoComplete="off"
            />

            {/* Match Counter Badge */}
            {hasQuery && (
                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                    hasMatches 
                        ? (isBright ? 'bg-black/[0.06] text-zinc-700' : 'bg-white/10 text-white/90')
                        : (isBright ? 'bg-red-500/10 text-red-600' : 'bg-rose-500/15 text-rose-300')
                }`}>
                    {hasMatches ? (
                        <span>{findResults.activeMatchOrdinal} of {findResults.matches}</span>
                    ) : (
                        <span>0 of 0</span>
                    )}
                </div>
            )}

            <div className={`h-4 w-px mx-0.5 ${isBright ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />

            {/* Previous Button */}
            <button
                onClick={() => findNextMatch(false)}
                disabled={!hasQuery || !hasMatches}
                className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none transition-all duration-200 cursor-pointer active:scale-95 ${
                    isBright 
                        ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Previous match (Shift+Enter / Shift+F3)"
            >
                <ChevronUp size={14} />
            </button>

            {/* Next Button */}
            <button
                onClick={() => findNextMatch(true)}
                disabled={!hasQuery || !hasMatches}
                className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none transition-all duration-200 cursor-pointer active:scale-95 ${
                    isBright 
                        ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Next match (Enter / F3)"
            >
                <ChevronDown size={14} />
            </button>

            {/* Case Sensitive Toggle Button */}
            <button
                onClick={() => setFindMatchCase(!findMatchCase)}
                className={`h-6 px-2.5 rounded-full text-[10px] font-bold tracking-tight transition-all duration-200 cursor-pointer active:scale-95 ${
                    findMatchCase 
                        ? 'bg-accent/20 text-accent font-bold' 
                        : (isBright ? 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/5')
                }`}
                title="Match Case (Case Sensitive)"
            >
                Aa
            </button>

            {/* Close Button */}
            <button
                onClick={() => setIsFindOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ml-0.5 ${
                    isBright ? 'text-zinc-400 hover:text-rose-600 hover:bg-black/5' : 'text-white/40 hover:text-rose-400 hover:bg-white/10'
                }`}
                title="Close (Esc)"
            >
                <X size={14} />
            </button>
        </div>
    );
}
