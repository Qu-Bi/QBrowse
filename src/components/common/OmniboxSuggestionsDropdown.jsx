import React from 'react';
import { 
    Terminal, Search, Calculator, Globe, ArrowRight,
    Zap, Sparkles, Folder, FileText
} from 'lucide-react';

export default function OmniboxSuggestionsDropdown({
    isCommandMode,
    commandQuery = '',
    filteredCommands = [],
    isBangSuggestionMode,
    bangSuggestions = [],
    filteredPredictions = [],
    selectedIndex = 0,
    searchQuery = '',
    onSelectCommand,
    onSelectBang,
    onSelectPrediction,
    onOptionMouseMove,
    onTabIntoFolder,
    isBright = false,
    isTor = false,
    isClosing = false,
    dropdownRef,
    containerRef,
    className = '',
    maxHeightClass = 'max-h-[380px]',
    compact = false,
    style = {}
}) {
    const liquidGlassSurfaceStyle = {
        backgroundColor: isBright ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 20, 32, 0.58)',
        backdropFilter: isBright
            ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
            : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)',
        WebkitBackdropFilter: isBright
            ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
            : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)'
    };

    const itemPadding = compact ? 'px-3 py-2' : 'px-3.5 py-2.5';
    const iconBoxSize = compact ? 'w-7 h-7 rounded-xl' : 'w-8 h-8 rounded-xl';
    const iconSize = compact ? 14 : 15;
    const titleSize = compact ? 'text-[13px]' : 'text-sm';
    const subtitleSize = compact ? 'text-[11px]' : 'text-xs';

    const selectedItemClasses = isBright
        ? 'bg-black/[0.06] border-black/[0.08] shadow-[0_4px_14px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]'
        : 'bg-white/[0.10] border-white/[0.12] shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]';

    const unselectedItemClasses = isBright
        ? 'border-transparent hover:bg-black/[0.04]'
        : 'border-transparent hover:bg-white/[0.06]';

    return (
        <div
            ref={(node) => {
                if (typeof dropdownRef === 'function') dropdownRef(node);
                else if (dropdownRef) dropdownRef.current = node;
                if (typeof containerRef === 'function') containerRef(node);
                else if (containerRef) containerRef.current = node;
            }}
            tabIndex={-1}
            style={{
                ...liquidGlassSurfaceStyle,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                transformOrigin: 'top center',
                ...style
            }}
            className={`w-full ${compact ? 'p-2' : 'p-2.5'} rounded-[1.75rem] border select-none outline-none overflow-y-auto hide-scroll [&::-webkit-scrollbar]:hidden transition-colors ${
                isClosing ? 'animate-pop-out pointer-events-none' : 'animate-pop-in'
            } ${maxHeightClass} ${
                isBright
                    ? 'border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.14),inset_0_1px_1px_rgba(255,255,255,0.85)]'
                    : 'border-white/[0.10] text-white/95 shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.16)]'
            } ${
                isCommandMode ? (isBright ? 'border-yellow-500/40' : 'border-yellow-500/30') : ''
            } ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {isCommandMode ? (
                filteredCommands.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                        <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-b mb-1 ${
                            isBright ? 'text-zinc-500 border-black/[0.06]' : 'text-white/40 border-white/[0.06]'
                        }`}>
                            <span className="flex items-center gap-1.5">
                                <Terminal size={11} className="text-yellow-500" />
                                Terminal Commands
                            </span>
                            <span className="font-mono text-[9px] lowercase opacity-60">↵ enter to run</span>
                        </div>
                        {filteredCommands.map((cmd, i) => {
                            const isSelected = i === selectedIndex;
                            const CmdIcon = cmd.icon || Terminal;
                            return (
                                <button
                                    key={`cmd-${i}-${cmd.id}`}
                                    type="button"
                                    data-selected={isSelected}
                                    onClick={() => onSelectCommand?.(cmd.id)}
                                    onMouseMove={(e) => onOptionMouseMove?.(i, e)}
                                    className={`w-full flex items-center gap-3 ${itemPadding} rounded-2xl transition-all duration-150 ease-out group text-left cursor-pointer border ${
                                        isSelected
                                            ? (isBright 
                                                ? 'bg-yellow-500/15 border-yellow-500/30 shadow-[0_4px_14px_rgba(234,179,8,0.10),inset_0_1px_0_rgba(255,255,255,0.8)]' 
                                                : 'bg-yellow-500/15 border-yellow-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]')
                                            : unselectedItemClasses
                                    }`}
                                >
                                    <div className={`${iconBoxSize} flex items-center justify-center flex-shrink-0 transition-transform duration-150 ${
                                        isSelected ? 'bg-yellow-500/20 scale-105' : (isBright ? 'bg-black/[0.04]' : 'bg-white/[0.06]')
                                    } ${cmd.color || 'text-yellow-400'}`}>
                                        <CmdIcon size={iconSize} />
                                    </div>
                                    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                                        <span className={`font-mono ${titleSize} font-semibold truncate ${
                                            isSelected 
                                                ? (isBright ? 'text-yellow-700' : 'text-yellow-300') 
                                                : (isBright ? 'text-yellow-600' : 'text-yellow-400')
                                        }`}>
                                            {'> ' + cmd.cmd}
                                        </span>
                                        <span className={`${subtitleSize} truncate ${
                                            isSelected 
                                                ? (isBright ? 'text-zinc-700' : 'text-white/80') 
                                                : (isBright ? 'text-zinc-500' : 'text-white/45')
                                        }`}>
                                            {cmd.title}
                                        </span>
                                    </div>
                                    {isSelected ? (
                                        <div className="flex items-center gap-1.5 flex-shrink-0 animate-fade-in">
                                            <span className={`border text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-lg shadow-2xs ${
                                                isBright 
                                                    ? 'border-yellow-600/30 bg-yellow-500/15 text-yellow-800' 
                                                    : 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300'
                                            }`}>
                                                ↵ Run
                                            </span>
                                            <Zap size={13} className="text-yellow-500" />
                                        </div>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`p-3 flex items-center gap-3 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                        <Terminal size={15} className="text-red-500 animate-pulse" />
                        <span className="text-xs font-mono">No command matching <strong>"{commandQuery}"</strong></span>
                    </div>
                )
            ) : isBangSuggestionMode ? (
                bangSuggestions.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                        <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-b mb-1 ${
                            isBright ? 'text-zinc-500 border-black/[0.06]' : 'text-white/40 border-white/[0.06]'
                        }`}>
                            <span className="flex items-center gap-1.5">
                                <Sparkles size={11} className="text-accent" />
                                Search Bangs & Engines
                            </span>
                            <span className="font-mono text-[9px] lowercase opacity-60">Tab ⇥ or ↵ to use</span>
                        </div>
                        {bangSuggestions.map((bang, i) => {
                            const BangIcon = bang.icon || Search;
                            const isSelected = i === selectedIndex;
                            const bangColor = bang.color || '#a855f7';
                            return (
                                <button
                                    key={`bang-${i}-${bang.id}`}
                                    type="button"
                                    data-selected={isSelected}
                                    onClick={() => onSelectBang?.(bang)}
                                    onMouseMove={(e) => onOptionMouseMove?.(i, e)}
                                    className={`w-full flex items-center justify-between ${itemPadding} rounded-2xl transition-all duration-150 ease-out group text-left cursor-pointer border ${
                                        isSelected ? selectedItemClasses : unselectedItemClasses
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`${iconBoxSize} flex items-center justify-center flex-shrink-0 transition-transform duration-150 ${isSelected ? 'scale-105' : ''}`}
                                            style={{ backgroundColor: `${bangColor}22`, color: bangColor }}
                                        >
                                            <BangIcon size={iconSize} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`${titleSize} ${
                                                    isSelected ? (isBright ? 'text-zinc-950 font-semibold' : 'text-white font-semibold') : (isBright ? 'text-zinc-800 font-medium' : 'text-white/90 font-medium')
                                                }`}>
                                                    {bang.name}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {(bang.bangs || []).slice(0, 3).map((b, bi) => (
                                                        <span key={bi} className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
                                                            isSelected ? (isBright ? 'bg-black/10 text-zinc-900' : 'bg-white/20 text-white') : (isBright ? 'bg-black/[0.04] text-zinc-600' : 'bg-white/10 text-white/70')
                                                        }`}>
                                                            {b}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className={`text-[9px] ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>
                                                    ({bang.category || 'Engine'})
                                                </span>
                                            </div>
                                            <span className={`${subtitleSize} truncate font-mono ${
                                                isSelected ? (isBright ? 'text-zinc-600' : 'text-white/70') : (isBright ? 'text-zinc-400' : 'text-white/40')
                                            }`}>
                                                {bang.url}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 text-[9px] font-mono transition ${isSelected ? 'opacity-100 animate-fade-in' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <span className={`border px-1.5 py-0.5 rounded-lg font-medium ${
                                            isBright ? 'border-black/10 bg-black/5 text-zinc-700' : 'border-white/20 bg-white/10 text-white/90'
                                        }`}>
                                            Tab ⇥
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`p-3 flex items-center gap-3 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>
                        <Search size={15} className="text-accent" />
                        <span className="text-xs">No bang matching <strong>"{searchQuery}"</strong></span>
                    </div>
                )
            ) : (
                filteredPredictions.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                        {filteredPredictions.map((pred, i) => {
                            const BangIcon = pred.bang?.icon;
                            const isSelected = i === selectedIndex;
                            return (
                                <button
                                    key={`pred-${i}-${pred.url || pred.title}`}
                                    type="button"
                                    data-selected={isSelected}
                                    onClick={() => onSelectPrediction?.(pred)}
                                    onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                                    onAuxClick={(e) => onSelectPrediction?.(pred, e)}
                                    onMouseMove={(e) => onOptionMouseMove?.(i, e)}
                                    className={`w-full flex items-center gap-3 ${itemPadding} rounded-2xl transition-all duration-150 ease-out group text-left cursor-pointer border ${
                                        isSelected ? selectedItemClasses : unselectedItemClasses
                                    }`}
                                >
                                    <div
                                        className={`${iconBoxSize} flex items-center justify-center flex-shrink-0 transition-transform duration-150 ${
                                            pred.isLocalFile
                                                ? (pred.isDirectory ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-accent/20 text-accent border border-accent/30')
                                                : (pred.bang
                                                    ? ''
                                                    : (pred.isMath
                                                        ? 'bg-accent/20 text-accent'
                                                        : (pred.isSearch
                                                            ? (isTor ? 'bg-purple-500/20 text-purple-300' : 'bg-accent/15 text-accent')
                                                            : (isBright ? 'bg-black/[0.04] text-zinc-600' : 'bg-white/[0.07] text-white/70'))))
                                        } ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                        style={pred.bang ? { backgroundColor: `${pred.bang.color}22`, color: pred.bang.color } : undefined}
                                    >
                                        {pred.isLocalFile ? (
                                            pred.isDirectory ? <Folder size={iconSize} /> : <FileText size={iconSize} />
                                        ) : pred.bang ? (
                                            BangIcon ? <BangIcon size={iconSize} /> : <Search size={iconSize} />
                                        ) : pred.isMath ? (
                                            <Calculator size={iconSize} />
                                        ) : pred.isSearch ? (
                                            <Search size={iconSize} />
                                        ) : (
                                            <Globe size={iconSize} />
                                        )}
                                    </div>
                                    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                                        <span className={`${titleSize} truncate ${
                                            pred.isMath 
                                                ? 'text-accent font-semibold' 
                                                : (isSelected 
                                                    ? (isBright ? 'text-zinc-950 font-semibold' : 'text-white font-semibold') 
                                                    : (isBright ? 'text-zinc-800 font-medium' : 'text-white/85 font-medium'))
                                        }`}>
                                            {pred.title}
                                        </span>
                                        <span className={`${subtitleSize} truncate font-mono ${
                                            isSelected 
                                                ? (isBright ? 'text-zinc-600' : 'text-white/65') 
                                                : (isBright ? 'text-zinc-400' : 'text-white/40')
                                        }`}>
                                            {pred.isLocalFile ? (pred.subtitle || pred.url) : pred.url}
                                        </span>
                                    </div>

                                    {pred.isLocalFile && pred.isDirectory ? (
                                        <div className="flex items-center gap-1 flex-shrink-0 animate-fade-in">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTabIntoFolder?.(pred);
                                                }}
                                                className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-medium transition border flex items-center gap-0.5 cursor-pointer ${
                                                    isBright
                                                        ? 'border-black/10 bg-black/5 hover:bg-black/10 text-zinc-700'
                                                        : 'border-white/15 bg-white/10 hover:bg-white/20 text-white/90'
                                                }`}
                                                title="Tab into directory"
                                            >
                                                <span>Tab</span>
                                                <span className="text-accent font-bold">⇥</span>
                                            </button>
                                            {isSelected && (
                                                <span className={`border text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-lg ${
                                                    isBright ? 'border-black/10 bg-black/5 text-zinc-700' : 'border-white/15 bg-white/10 text-white/80'
                                                }`}>
                                                    ↵ Open
                                                </span>
                                            )}
                                        </div>
                                    ) : isSelected ? (
                                        <div className="flex items-center gap-1.5 flex-shrink-0 animate-fade-in">
                                            <span className={`border text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-lg ${
                                                isBright ? 'border-black/10 bg-black/5 text-zinc-700' : 'border-white/15 bg-white/10 text-white/80'
                                            }`}>
                                                ↵ Enter
                                            </span>
                                            <ArrowRight size={13} className="text-accent" />
                                        </div>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`p-3 flex items-center gap-3 ${isBright ? 'text-zinc-500' : 'text-white/50'}`}>
                        <Search size={15} />
                        <span className="text-xs">No results for "{searchQuery}"</span>
                    </div>
                )
            )}
        </div>
    );
}
