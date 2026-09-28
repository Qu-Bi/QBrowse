import React, { useEffect } from 'react';
import { Globe, Volume2, Ghost, Layers, ArrowRight } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function TabSwitcherOverlay() {
    const showSwitcher = useUIStore(state => state.showSwitcher);
    const showSwitcherUI = useUIStore(state => state.showSwitcherUI);
    const switcherIndex = useUIStore(state => state.switcherIndex);
    const switcherTabs = useUIStore(state => state.switcherTabs);
    const cycleSwitcher = useUIStore(state => state.cycleSwitcher);
    const confirmSwitcher = useUIStore(state => state.confirmSwitcher);
    const cancelSwitcher = useUIStore(state => state.cancelSwitcher);
    const setSwitcherIndex = useUIStore(state => state.setSwitcherIndex);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    useEffect(() => {
        if (!showSwitcher || !showSwitcherUI) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                cycleSwitcher(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                cycleSwitcher(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                confirmSwitcher();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelSwitcher();
            }
        };

        const handleKeyUp = (e) => {
            const keyLower = (e.key || '').toLowerCase();
            const codeLower = (e.code || '').toLowerCase();
            if (keyLower === 'control' || keyLower === 'meta' || codeLower.startsWith('control') || codeLower.startsWith('meta')) {
                confirmSwitcher();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [showSwitcher, showSwitcherUI, cycleSwitcher, confirmSwitcher, cancelSwitcher]);

    if (!showSwitcher || !showSwitcherUI || !switcherTabs || switcherTabs.length === 0) {
        return null;
    }

    const CARD_WIDTH = 400;
    const CARD_GAP = 28;
    const TOTAL_STEP = CARD_WIDTH + CARD_GAP;

    const spaceLabel = activeSpace === 'ghost' ? 'Incognito / Ghost Space' : (activeSpace === 'work' ? 'Work Space' : 'Personal Space');

    return (
        <div 
            className={`fixed inset-0 z-[60000] flex flex-col items-center justify-center ${isBright ? 'bg-black/35 backdrop-blur-xl' : 'bg-black/75 backdrop-blur-2xl'} transition-all duration-300 select-none overflow-hidden`}
            onClick={confirmSwitcher}
        >
            {/* Top Indicator Header */}
            <div className="absolute top-12 flex flex-col items-center gap-2 pointer-events-none animate-fade-in">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${isBright ? 'bg-white/85 border-white/70 shadow-lg text-zinc-900' : 'bg-white/[0.08] border-white/10 text-white'} backdrop-blur-xl`}>
                    {activeSpace === 'ghost' ? (
                        <Ghost size={15} className="text-purple-400" />
                    ) : (
                        <Layers size={15} className="text-accent" />
                    )}
                    <span className={`${isBright ? 'text-zinc-900' : 'text-white/90'} text-xs font-semibold tracking-wide`}>{spaceLabel}</span>
                    <span className={`w-1 h-1 rounded-full ${isBright ? 'bg-zinc-400' : 'bg-white/30'} mx-1`}></span>
                    <span className={`${isBright ? 'text-zinc-600' : 'text-white/50'} text-xs font-mono`}>
                        {switcherIndex + 1} / {switcherTabs.length}
                    </span>
                </div>
            </div>

            {/* Centered Carousel Track */}
            <div className="relative w-full h-[320px] md:h-[350px] flex items-center" onClick={e => e.stopPropagation()}>
                <div 
                    className="absolute flex items-center top-0 bottom-0"
                    style={{
                        transform: `translateX(calc(50vw - ${switcherIndex * TOTAL_STEP + CARD_WIDTH / 2}px))`,
                        transition: 'transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)',
                        willChange: 'transform'
                    }}
                >
                    {switcherTabs.map((tab, idx) => {
                        const isSelected = idx === switcherIndex;
                        const offset = idx - switcherIndex;
                        const distance = Math.abs(offset);
                        const scale = isSelected ? 1.04 : Math.max(0.86, 1 - distance * 0.07);
                        const opacity = isSelected ? 1 : Math.max(0.35, 0.85 - distance * 0.2);

                        return (
                            <div
                                key={tab.id || idx}
                                onClick={() => {
                                    setSwitcherIndex(idx);
                                    confirmSwitcher();
                                }}
                                className={`flex-shrink-0 aspect-[16/10] ${
                                    isBright 
                                        ? 'bg-white/85 backdrop-blur-3xl border text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.14)]' 
                                        : 'bg-[#141418] border text-white shadow-2xl'
                                } rounded-2xl overflow-hidden cursor-pointer flex flex-col relative group transition-all duration-300 ${
                                    isSelected 
                                        ? 'border-accent shadow-[0_0_40px_rgba(99,102,241,0.35)] ring-2 ring-accent/40' 
                                        : (isBright ? 'border-white/70 hover:border-black/20' : 'border-white/10 hover:border-white/20')
                                }`}
                                style={{
                                    width: `${CARD_WIDTH}px`,
                                    marginRight: `${CARD_GAP}px`,
                                    transform: `scale(${scale})`,
                                    opacity,
                                    zIndex: isSelected ? 50 : 40 - distance,
                                    willChange: 'transform, opacity'
                                }}
                            >
                                {/* Card Title Header */}
                                <div className={`h-10 ${isBright ? 'bg-white/90 border-b border-black/5' : 'bg-black/50 border-b border-white/10'} flex items-center px-4 justify-between flex-shrink-0`}>
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        {tab.url && tab.url !== 'about:blank' ? (
                                            <img 
                                                src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} 
                                                alt="" 
                                                className="w-4 h-4 rounded-sm flex-shrink-0" 
                                                onError={(e) => { e.target.style.display = 'none'; }} 
                                            />
                                        ) : (
                                            <Globe size={14} className={isBright ? "text-zinc-400 flex-shrink-0" : "text-white/40 flex-shrink-0"} />
                                        )}
                                        <span className={`${isBright ? 'text-zinc-900 font-semibold' : 'text-white font-medium'} text-xs truncate`}>
                                            {tab.title || (tab.url ? tab.url.replace(/^https?:\/\//i, '') : 'New Tab')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {tab.isAudible && (
                                            <Volume2 size={13} className="text-emerald-500 animate-pulse" />
                                        )}
                                        {isSelected && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-accent bg-accent/15 border border-accent/30 px-2 py-0.5 rounded-full">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Preview Canvas */}
                                <div className={`relative flex-1 w-full ${isBright ? 'bg-zinc-100/90' : 'bg-[#0d0d10]'} overflow-hidden flex items-center justify-center`}>
                                    {tab.thumbnail ? (
                                        <img 
                                            src={tab.thumbnail} 
                                            alt={tab.title} 
                                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" 
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex flex-col items-center justify-center p-6 ${isBright ? 'bg-gradient-to-br from-black/[0.02] via-transparent to-black/[0.05]' : 'bg-gradient-to-br from-white/[0.05] via-transparent to-black/40'} text-center`}>
                                            <div className={`w-12 h-12 rounded-2xl ${isBright ? 'bg-white/80 border border-black/10 shadow-sm' : 'bg-white/[0.06] border border-white/10 shadow-inner'} flex items-center justify-center mb-3`}>
                                                {tab.url && tab.url !== 'about:blank' ? (
                                                    <img 
                                                        src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} 
                                                        alt="" 
                                                        className="w-6 h-6 rounded" 
                                                        onError={(e) => { e.target.style.display = 'none'; }} 
                                                    />
                                                ) : (
                                                    <Globe size={22} className={isBright ? "text-zinc-400" : "text-white/30"} />
                                                )}
                                            </div>
                                            <span className={`${isBright ? 'text-zinc-900 font-semibold' : 'text-white/80 font-medium'} text-xs max-w-[280px] truncate`}>
                                                {tab.title || 'Blank Page'}
                                            </span>
                                            <span className={`${isBright ? 'text-zinc-500' : 'text-white/30'} font-mono text-[11px] mt-1 max-w-[280px] truncate`}>
                                                {tab.url || 'about:blank'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Subtle Glass Gradient Overlay & Domain Pill */}
                                    <div className={`absolute inset-0 ${isBright ? 'bg-gradient-to-t from-white/90 via-transparent to-transparent' : 'bg-gradient-to-t from-black/85 via-transparent to-transparent'} pointer-events-none`} />
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                        <span className={`${isBright ? 'text-zinc-800 bg-white/90 border-black/10 shadow-sm' : 'text-white/80 bg-black/60 border-white/10 shadow'} font-mono text-[10px] truncate max-w-[85%] backdrop-blur-md px-2.5 py-1 rounded-full border`}>
                                            {tab.url || 'about:blank'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Keyboard Shortcuts Hint */}
            <div className={`absolute bottom-10 flex items-center gap-3 px-5 py-2 rounded-full ${isBright ? 'bg-white/85 border border-white/70 backdrop-blur-xl text-zinc-600 shadow-xl' : 'bg-white/[0.06] border border-white/10 backdrop-blur-xl text-white/50 shadow-lg'} text-xs font-medium tracking-wide pointer-events-none animate-fade-in`}>
                <span className="flex items-center gap-1"><kbd className={`${isBright ? 'bg-black/10 text-zinc-800' : 'bg-white/10 text-white/80'} px-1.5 py-0.5 rounded text-[10px] font-mono`}>⇥</kbd> Cycle</span>
                <span className={isBright ? "text-zinc-400" : "text-white/20"}>•</span>
                <span className="flex items-center gap-1"><kbd className={`${isBright ? 'bg-black/10 text-zinc-800' : 'bg-white/10 text-white/80'} px-1.5 py-0.5 rounded text-[10px] font-mono`}>⇧⇥</kbd> Back</span>
                <span className={isBright ? "text-zinc-400" : "text-white/20"}>•</span>
                <span className="flex items-center gap-1"><kbd className={`${isBright ? 'bg-black/10 text-zinc-800' : 'bg-white/10 text-white/80'} px-1.5 py-0.5 rounded text-[10px] font-mono`}>Release</kbd> Switch</span>
                <span className={isBright ? "text-zinc-400" : "text-white/20"}>•</span>
                <span className="flex items-center gap-1"><kbd className={`${isBright ? 'bg-black/10 text-zinc-800' : 'bg-white/10 text-white/80'} px-1.5 py-0.5 rounded text-[10px] font-mono`}>Esc</kbd> Cancel</span>
            </div>
        </div>
    );
}
