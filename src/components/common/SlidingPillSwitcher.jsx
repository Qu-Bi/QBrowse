import React, { useState } from 'react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

/**
 * Flagship Liquid Glass Sliding Pill Switcher.
 * Supports sizes 'xs' | 'sm' | 'md' | 'lg', plus an `opaque` mode for crisp
 * rendering above Electron <webview> surfaces without backdrop-filter bleed.
 */
export const SlidingPillSwitcher = ({
    options = [],
    value,
    onChange,
    isBright: isBrightProp,
    size = 'md',
    opaque = false,
    allowNone = false,
    className = ''
}) => {
    const [hoveredId, setHoveredId] = useState(null);
    const theme = useUIStore((state) => state.theme);
    const activeSpace = useTabStore((state) => state.activeSpace);
    const isBright = isBrightProp !== undefined
        ? isBrightProp
        : (theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor');

    const rawActiveIndex = options.findIndex((o) => o.id === value);
    const hasActive = rawActiveIndex >= 0;
    const activeIndex = hasActive ? rawActiveIndex : (allowNone ? -1 : 0);
    const hoveredIndex = hoveredId !== null ? options.findIndex((o) => o.id === hoveredId) : -1;
    const count = options.length || 1;

    const isXs = size === 'xs';
    const isSm = size === 'sm';
    const containerHeight = isXs ? 'h-7 ' : '';
    const padding = (isXs || isSm) ? 'p-0.5' : 'p-1';
    const itemPy = isXs ? 'h-6 py-0' : (isSm ? 'py-1' : (size === 'lg' ? 'py-2' : 'py-1.5'));
    const itemPx = isXs ? 'px-1.5' : (isSm ? 'px-2.5' : 'px-3');
    const textSize = isXs ? 'text-[10px]' : (isSm ? 'text-[11px]' : 'text-xs');
    const iconSize = isXs ? 12 : (isSm ? 11 : 13);
    const insetOffset = (isXs || isSm) ? 4 : 8;
    const insetValue = (isXs || isSm) ? '2px' : '4px';

    const containerStyle = {
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        ...(opaque
            ? (isBright
                ? {
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)'
                }
                : {
                    backgroundColor: 'rgba(18, 19, 28, 0.96)',
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.65)'
                })
            : {})
    };

    const activePillStyle = {
        top: insetValue,
        bottom: insetValue,
        left: insetValue,
        width: `calc((100% - ${insetOffset}px) / ${count})`,
        transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
        opacity: activeIndex >= 0 ? 1 : 0,
        backgroundColor: opaque
            ? (isBright ? '#ffffff' : 'rgba(var(--accent-rgb, 212, 188, 148), 0.22)')
            : (isBright ? '#ffffff' : 'var(--accent-15, rgba(212, 188, 148, 0.16))'),
        border: opaque
            ? (isBright ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(var(--accent-rgb, 212, 188, 148), 0.55)')
            : (isBright ? '1px solid rgba(0,0,0,0.08)' : '1px solid var(--accent-30, rgba(212, 188, 148, 0.4))'),
        boxShadow: isBright
            ? '0 2px 8px rgba(0,0,0,0.10)'
            : '0 2px 10px rgba(var(--accent-rgb, 212, 188, 148), 0.22), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
    };

    return (
        <div
            className={`relative grid items-center ${containerHeight}${padding} rounded-full border transition-colors duration-200 ${
                opaque
                    ? ''
                    : `backdrop-blur-xl ${isBright ? 'bg-black/[0.04] border-black/[0.08]' : 'bg-black/40 border-white/[0.07]'}`
            } ${className}`}
            style={containerStyle}
            onMouseLeave={() => setHoveredId(null)}
        >
            {/* Subtle Hover Preview Pill */}
            {hoveredIndex >= 0 && hoveredIndex !== activeIndex && (
                <div
                    className="absolute rounded-full transition-all duration-200 pointer-events-none"
                    style={{
                        top: insetValue,
                        bottom: insetValue,
                        left: insetValue,
                        width: `calc((100% - ${insetOffset}px) / ${count})`,
                        transform: `translateX(${hoveredIndex * 100}%)`,
                        backgroundColor: isBright ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.07)'
                    }}
                />
            )}

            {/* Signature Liquid Glass Sliding Pill */}
            <div
                className="absolute rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
                style={activePillStyle}
            />

            {/* Option Buttons */}
            {options.map((opt) => {
                const isActive = opt.id === value;
                const Icon = opt.icon;
                const hasLabel = opt.label !== undefined && opt.label !== null && opt.label !== '';
                const gapClass = Icon && hasLabel ? 'gap-1.5' : '';
                const buttonPadding = isXs && Icon && !hasLabel ? 'w-7 px-0' : itemPx;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange?.(opt.id);
                        }}
                        onMouseEnter={() => setHoveredId(opt.id)}
                        className={`relative z-10 flex items-center justify-center ${gapClass} ${itemPy} ${buttonPadding} ${textSize} font-semibold rounded-full transition-colors duration-200 active:scale-95 cursor-pointer select-none truncate outline-none ${
                            isActive
                                ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/65 hover:text-white')
                        }`}
                        title={opt.title || opt.desc || opt.label}
                    >
                        {Icon && (
                            <Icon
                                size={iconSize}
                                className={isActive ? (isBright ? 'text-zinc-950' : 'text-accent') : 'opacity-70'}
                            />
                        )}
                        {hasLabel && (
                            <span className="truncate">{opt.label}</span>
                        )}
                        {opt.badge && (
                            <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                    isActive
                                        ? (isBright ? 'bg-black/10 text-zinc-900' : 'bg-accent/25 text-accent')
                                        : (isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-white/50')
                                }`}
                            >
                                {opt.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default SlidingPillSwitcher;
