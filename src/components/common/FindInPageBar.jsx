import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

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

    const inputRef = useRef(null);

    useEffect(() => {
        if (isFindOpen) {
            // Auto focus and select existing query on open
            const timer = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isFindOpen]);

    if (!isFindOpen) return null;

    const handleKeyDown = (e) => {
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
            className="absolute top-4 right-6 z-[60] flex items-center gap-1.5 bg-[#0e1015]/92 backdrop-blur-3xl border border-white/20 rounded-2xl p-1.5 pl-3 pr-2 shadow-[0_20px_60px_rgba(0,0,0,0.85)] animate-slide-down-fade select-none text-white transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <Search size={14} className="text-white/40 flex-shrink-0 mr-1" />
            
            <input
                ref={inputRef}
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Find in page..."
                className="w-44 md:w-56 bg-transparent text-xs text-white placeholder-white/40 outline-none border-none pr-1"
                spellCheck={false}
                autoComplete="off"
            />

            {/* Match Counter Badge */}
            {hasQuery && (
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                    hasMatches 
                        ? 'bg-white/10 text-white/80 border border-white/10' 
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}>
                    {hasMatches ? (
                        <span>{findResults.activeMatchOrdinal} of {findResults.matches}</span>
                    ) : (
                        <span>0 of 0</span>
                    )}
                </div>
            )}

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Previous Button */}
            <button
                onClick={() => findNextMatch(false)}
                disabled={!hasQuery || !hasMatches}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition cursor-pointer"
                title="Previous match (Shift+Enter / Shift+F3)"
            >
                <ChevronUp size={14} />
            </button>

            {/* Next Button */}
            <button
                onClick={() => findNextMatch(true)}
                disabled={!hasQuery || !hasMatches}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition cursor-pointer"
                title="Next match (Enter / F3)"
            >
                <ChevronDown size={14} />
            </button>

            {/* Case Sensitive Toggle Button */}
            <button
                onClick={() => setFindMatchCase(!findMatchCase)}
                className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold tracking-tight transition cursor-pointer border ${
                    findMatchCase 
                        ? 'bg-accent/20 border-accent/40 text-accent' 
                        : 'border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                }`}
                title="Match Case (Case Sensitive)"
            >
                Aa
            </button>

            {/* Close Button */}
            <button
                onClick={() => setIsFindOpen(false)}
                className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer ml-0.5"
                title="Close (Esc)"
            >
                <X size={14} />
            </button>
        </div>
    );
}
