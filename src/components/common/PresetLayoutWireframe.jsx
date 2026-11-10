import React from 'react';

export const PRESET_TAGLINES = {
    balanced: 'Dual personal & work workspaces with Google search.',
    developer: 'Isolated workspaces with GitHub Live PR integration.',
    classic_reverse: 'Right-aligned tab tree with a clean reading canvas.',
    bottom_bar: 'Bottom address bar for thumb-friendly navigation.',
    minimalist: 'Single workspace with compact, distraction-free chrome.',
    privacy: 'Strict tracker protection with DuckDuckGo search.'
};

export default function PresetLayoutWireframe({ preset, isSelected, isBright, compact = false }) {
    const isTopBar = preset.topBarPosition !== 'bottom';
    const isLeftSidebar = preset.sidebarPosition !== 'right';
    const accent = preset.accentColor || 'var(--accent, #d4bc94)';
    const isDev = preset.id === 'developer';
    const isPrivacy = preset.id === 'privacy';
    const heightClass = compact ? 'h-20' : 'h-24';

    return (
        <div 
            className={`${heightClass} w-full rounded-xl border p-1.5 flex flex-col justify-between transition-all duration-300 select-none overflow-hidden ${
                isSelected 
                    ? (isBright ? 'bg-black/[0.04] border-accent/40 shadow-xs' : 'bg-black/40 border-accent/40 shadow-xs')
                    : (isBright ? 'bg-black/[0.02] border-black/[0.06] group-hover:border-black/15' : 'bg-white/[0.02] border-white/[0.06] group-hover:border-white/15')
            }`}
        >
            {/* Window Header / Top Bar (if top layout) */}
            {isTopBar ? (
                <div className={`flex items-center gap-1.5 px-1 py-0.5 border-b mb-1 ${!isLeftSidebar ? 'flex-row-reverse' : 'flex-row'} ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                    <div className="flex gap-1 shrink-0 opacity-40">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>
                    {/* Mini Address Capsule */}
                    <div 
                        className="flex-1 max-w-[110px] mx-auto h-2 rounded-full transition-colors flex items-center justify-center px-1"
                        style={{
                            backgroundColor: isSelected ? `${accent}25` : (isBright ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                            border: `1px solid ${isSelected ? `${accent}50` : 'transparent'}`
                        }}
                    >
                        <span 
                            className="w-8 h-0.5 rounded-full" 
                            style={{ backgroundColor: isSelected ? accent : (isBright ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)') }} 
                        />
                    </div>
                    <div className="w-4 shrink-0" />
                </div>
            ) : (
                /* Compact window controls header when top bar is at bottom */
                <div className={`flex items-center px-1 py-0.5 border-b mb-1 ${!isLeftSidebar ? 'flex-row-reverse' : 'flex-row'} ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                    <div className="flex gap-1 shrink-0 opacity-40">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>
                </div>
            )}

            {/* Middle Viewport (Sidebar + Web Canvas) */}
            <div className="flex-1 flex gap-1.5 min-h-0">
                {/* Left Sidebar if preset is left-aligned */}
                {isLeftSidebar && (
                    <div className={`w-9 shrink-0 rounded-md p-1 flex flex-col justify-between border ${
                        isBright ? 'bg-black/[0.03] border-black/[0.05]' : 'bg-white/[0.03] border-white/[0.05]'
                    }`}>
                        <div className="flex flex-col gap-1">
                            <div 
                                className="h-1.5 rounded-sm transition-all"
                                style={{ 
                                    backgroundColor: isSelected ? accent : (isBright ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.2)'),
                                    boxShadow: isSelected ? `0 0 6px ${accent}60` : undefined
                                }} 
                            />
                            <div className={`h-1.5 rounded-sm ${isBright ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />
                            {!compact && <div className={`h-1.5 rounded-sm ${isBright ? 'bg-black/[0.05]' : 'bg-white/[0.05]'}`} />}
                        </div>
                        {/* Mini Workspace Dots */}
                        <div className="flex gap-0.5 pt-0.5">
                            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                            <span className="w-1 h-1 rounded-full bg-current opacity-25" />
                            {isDev && <span className="w-1 h-1 rounded-full bg-current opacity-25" />}
                        </div>
                    </div>
                )}

                {/* Main Web Page Content Canvas */}
                <div className={`flex-1 rounded-md p-1.5 flex flex-col gap-1 border ${
                    isBright ? 'bg-white/50 border-black/[0.04]' : 'bg-white/[0.02] border-white/[0.04]'
                }`}>
                    {isDev ? (
                        /* Dev code skeleton */
                        <div className="flex-1 flex flex-col gap-1 font-mono">
                            <div className="flex items-center gap-1">
                                <span className={`w-2 h-1 rounded-xs ${isBright ? 'bg-purple-600/40' : 'bg-purple-400/40'}`} />
                                <span className={`w-8 h-1 rounded-xs ${isBright ? 'bg-black/20' : 'bg-white/20'}`} />
                            </div>
                            <div className="pl-2 flex flex-col gap-0.5">
                                <span className={`w-12 h-0.5 rounded-xs ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />
                                <span className={`w-8 h-0.5 rounded-xs ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />
                            </div>
                            <div className="mt-auto flex items-center justify-between">
                                <span className={`text-[8px] font-mono opacity-40 ${isBright ? 'text-zinc-600' : 'text-zinc-400'}`}>git</span>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                            </div>
                        </div>
                    ) : (
                        /* Standard page skeleton */
                        <>
                            <div className="flex items-center gap-1">
                                <div className={`w-10 h-1 rounded-sm ${isBright ? 'bg-black/20' : 'bg-white/25'}`} />
                                <div className={`w-4 h-1 rounded-sm ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />
                            </div>
                            <div className={`w-full h-1 rounded-sm ${isBright ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />
                            {!compact && <div className={`w-3/4 h-1 rounded-sm ${isBright ? 'bg-black/[0.06]' : 'bg-white/[0.06]'}`} />}
                            <div className="mt-auto flex items-center justify-between">
                                <div className={`w-6 h-1 rounded-sm ${isBright ? 'bg-black/[0.05]' : 'bg-white/[0.05]'}`} />
                                {isPrivacy && (
                                    <span 
                                        className="w-1.5 h-1.5 rounded-full" 
                                        style={{ backgroundColor: isSelected ? accent : '#10b981' }} 
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right Sidebar if preset is right-aligned */}
                {!isLeftSidebar && (
                    <div className={`w-9 shrink-0 rounded-md p-1 flex flex-col justify-between border ${
                        isBright ? 'bg-black/[0.03] border-black/[0.05]' : 'bg-white/[0.03] border-white/[0.05]'
                    }`}>
                        <div className="flex flex-col gap-1">
                            <div 
                                className="h-1.5 rounded-sm transition-all"
                                style={{ 
                                    backgroundColor: isSelected ? accent : (isBright ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.2)'),
                                    boxShadow: isSelected ? `0 0 6px ${accent}60` : undefined
                                }} 
                            />
                            <div className={`h-1.5 rounded-sm ${isBright ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />
                            {!compact && <div className={`h-1.5 rounded-sm ${isBright ? 'bg-black/[0.05]' : 'bg-white/[0.05]'}`} />}
                        </div>
                        {/* Mini Workspace Dots */}
                        <div className="flex gap-0.5 pt-0.5 justify-end">
                            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                            <span className="w-1 h-1 rounded-full bg-current opacity-25" />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Bar (if bottom layout) */}
            {!isTopBar && (
                <div className={`flex items-center justify-center pt-1 mt-1 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                    <div 
                        className="w-28 h-2 rounded-full transition-colors flex items-center justify-center px-1"
                        style={{
                            backgroundColor: isSelected ? `${accent}25` : (isBright ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                            border: `1px solid ${isSelected ? `${accent}50` : 'transparent'}`
                        }}
                    >
                        <span 
                            className="w-12 h-0.5 rounded-full" 
                            style={{ backgroundColor: isSelected ? accent : (isBright ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)') }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

