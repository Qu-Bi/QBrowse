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
    const sidebarStyle = preset.sidebarStyle || 'classic';
    const isSidebarHidden = sidebarStyle === 'hidden';
    const isSidebarCompact = sidebarStyle === 'compact';
    const isSidebarFloating = sidebarStyle === 'floating';
    const isSidebarAutoHide = sidebarStyle === 'auto-hide';
    const showDock = !!(preset.dockEnabled || preset.showDock || preset.dockVisible || preset.dockPosition === 'bottom');
    const isSquare = preset.frameCurvature === 'square' || preset.frameCurvature === 'sharp';
    const isCohesive = preset.frameCurvature === 'cohesive';
    const accent = preset.accentColor || 'var(--accent, #d4bc94)';
    const isDev = preset.id === 'developer';
    const isPrivacy = preset.id === 'privacy';
    const heightClass = compact ? 'h-20' : 'h-24';

    const renderWindowDots = (tiny = false) => (
        <div className={`flex ${tiny ? 'gap-0.5' : 'gap-1'} shrink-0 opacity-45`}>
            <span className={`${tiny ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full bg-current`} />
            <span className={`${tiny ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full bg-current`} />
            <span className={`${tiny ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full bg-current`} />
        </div>
    );

    const renderNavDots = () => (
        <div className="flex items-center gap-0.5 shrink-0 opacity-50">
            <span className="w-1.5 h-1.5 rounded-xs bg-current" />
            <span className="w-1 h-1 rounded-full bg-current opacity-75" />
            <span className="w-1 h-1 rounded-full bg-current opacity-50" />
        </div>
    );

    const renderActionDots = () => (
        <div className="flex items-center gap-0.5 shrink-0 opacity-30">
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="w-1 h-1 rounded-full bg-current" />
        </div>
    );

    const renderNavBar = () => (
        <div
            className={`flex items-center justify-between gap-1.5 px-1 py-0.5 shrink-0 ${
                isTopBar
                    ? `border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`
                    : `border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.06]'}`
            }`}
        >
            {/* Left cluster: Nav dots when left sidebar, Action dots when right sidebar */}
            <div className="flex items-center gap-1 min-w-[18px]">
                {isLeftSidebar ? renderNavDots() : renderActionDots()}
            </div>

            {/* Centered Mini Address Capsule */}
            <div
                className={`flex-1 max-w-[96px] mx-auto h-2 ${isSquare ? 'rounded-none' : 'rounded-full'} transition-colors flex items-center justify-center px-1`}
                style={{
                    backgroundColor: isSelected ? `${accent}25` : (isBright ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                    border: `1px solid ${isSelected ? `${accent}50` : 'transparent'}`
                }}
            >
                <span
                    className={`w-8 h-0.5 ${isSquare ? 'rounded-none' : 'rounded-full'}`}
                    style={{ backgroundColor: isSelected ? accent : (isBright ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)') }}
                />
            </div>

            {/* Right cluster: Action dots when left sidebar, Nav dots when right sidebar (+ window controls if hidden) */}
            <div className="flex items-center justify-end gap-1 min-w-[18px]">
                {isLeftSidebar ? renderActionDots() : renderNavDots()}
                {isSidebarHidden && renderWindowDots(true)}
            </div>
        </div>
    );

    const sidebarRadius = isSquare ? 'rounded-none' : isSidebarFloating ? 'rounded-lg' : 'rounded-md';
    const sidebarSurface = isSidebarFloating
        ? (isBright ? 'bg-white/85 border-black/10 shadow-xs' : 'bg-white/[0.07] border-white/[0.14] shadow-xs')
        : isSidebarAutoHide
            ? (isBright ? 'bg-black/[0.02] border-black/15 border-dashed opacity-75' : 'bg-white/[0.02] border-white/15 border-dashed opacity-75')
            : (isBright ? 'bg-black/[0.03] border-black/[0.05]' : 'bg-white/[0.03] border-white/[0.05]');

    return (
        <div
            className={`${heightClass} w-full ${isSquare ? 'rounded-none' : 'rounded-xl'} border p-1.5 flex ${
                isLeftSidebar ? 'flex-row' : 'flex-row-reverse'
            } ${isCohesive ? 'gap-1' : 'gap-1.5'} transition-all duration-300 select-none overflow-hidden ${
                isSelected
                    ? (isBright ? 'bg-black/[0.04] border-accent/40 shadow-xs' : 'bg-black/40 border-accent/40 shadow-xs')
                    : (isBright ? 'bg-black/[0.02] border-black/[0.06] group-hover:border-black/15' : 'bg-white/[0.02] border-white/[0.06] group-hover:border-white/15')
            }`}
        >
            {/* FULL-HEIGHT SIDEBAR (Left or Right, omitted when hidden) */}
            {!isSidebarHidden && (
                <div
                    className={`${isSidebarCompact ? 'w-4 px-0.5 py-1 items-center' : 'w-9 p-1'} h-full shrink-0 ${sidebarRadius} flex flex-col justify-between border ${sidebarSurface}`}
                >
                    {/* Window controls at top of sidebar */}
                    <div className={`flex flex-col ${isSidebarCompact ? 'items-center gap-1' : 'gap-1'}`}>
                        <div className={`flex ${isSidebarCompact ? 'justify-center' : isLeftSidebar ? 'justify-start' : 'justify-end'} pb-0.5`}>
                            {isSidebarCompact ? (
                                <span className="w-1.5 h-1 rounded-full bg-current opacity-40" />
                            ) : (
                                renderWindowDots(true)
                            )}
                        </div>

                        {/* Sidebar tab items */}
                        {isSidebarCompact ? (
                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className={`w-2 h-2 ${isSquare ? 'rounded-none' : 'rounded-xs'}`}
                                    style={{
                                        backgroundColor: isSelected ? accent : (isBright ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)'),
                                        boxShadow: isSelected ? `0 0 4px ${accent}60` : undefined
                                    }}
                                />
                                <div className={`w-2 h-2 ${isSquare ? 'rounded-none' : 'rounded-xs'} ${isBright ? 'bg-black/[0.1]' : 'bg-white/[0.1]'}`} />
                                {!compact && <div className={`w-2 h-2 ${isSquare ? 'rounded-none' : 'rounded-xs'} ${isBright ? 'bg-black/[0.06]' : 'bg-white/[0.06]'}`} />}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div
                                    className={`h-1.5 ${isSquare ? 'rounded-none' : 'rounded-sm'} transition-all`}
                                    style={{
                                        backgroundColor: isSelected ? accent : (isBright ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.2)'),
                                        boxShadow: isSelected ? `0 0 6px ${accent}60` : undefined
                                    }}
                                />
                                <div className={`h-1.5 ${isSquare ? 'rounded-none' : 'rounded-sm'} ${isBright ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />
                                {!compact && <div className={`h-1.5 ${isSquare ? 'rounded-none' : 'rounded-sm'} ${isBright ? 'bg-black/[0.05]' : 'bg-white/[0.05]'}`} />}
                            </div>
                        )}
                    </div>

                    {/* Mini Workspace Dots */}
                    <div className={`flex gap-0.5 pt-0.5 ${isSidebarCompact ? 'justify-center' : isLeftSidebar ? 'justify-start' : 'justify-end'}`}>
                        <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                        {!isSidebarCompact && <span className="w-1 h-1 rounded-full bg-current opacity-25" />}
                        {!isSidebarCompact && isDev && <span className="w-1 h-1 rounded-full bg-current opacity-25" />}
                    </div>
                </div>
            )}

            {/* MAIN COLUMN: TOP/BOTTOM NAV BAR + WEB VIEWPORT */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-1">
                {isTopBar && renderNavBar()}

                {/* Main Web Page Content Canvas */}
                <div
                    className={`flex-1 min-h-0 ${isSquare ? 'rounded-none' : isCohesive ? 'rounded-lg' : 'rounded-md'} p-1.5 flex flex-col gap-1 border relative ${
                        isBright ? 'bg-white/50 border-black/[0.04]' : 'bg-white/[0.02] border-white/[0.04]'
                    }`}
                >
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

                    {/* Optional Floating Mini Dock Preview */}
                    {showDock && (
                        <div className={`mx-auto px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
                            isBright ? 'bg-white/80 border-black/10' : 'bg-black/50 border-white/15'
                        }`}>
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: accent }} />
                            <span className="w-1 h-1 rounded-full bg-current opacity-35" />
                            <span className="w-1 h-1 rounded-full bg-current opacity-35" />
                        </div>
                    )}
                </div>

                {!isTopBar && renderNavBar()}
            </div>
        </div>
    );
}

