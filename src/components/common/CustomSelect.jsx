import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { getLiquidGlassInlineStyle, getLiquidGlassMenuClasses } from './ContextMenuProvider';

export default function CustomSelect({
    value,
    onChange,
    options = [],
    isBright: propIsBright,
    placeholder = 'Select option...',
    className = '',
    dropdownClassName = '',
    size = 'md',
    disabled = false,
    ariaLabel
}) {
    const storeTheme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = propIsBright !== undefined
        ? propIsBright
        : (storeTheme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor');
    const [isOpen, setIsOpen] = useState(false);
    const [openUpwards, setOpenUpwards] = useState(false);
    const [menuPositionStyle, setMenuPositionStyle] = useState(null);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    // Normalize options if passed as simple strings/numbers
    const normalizedOptions = useMemo(() => options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
            return opt;
        }
        return { value: opt, label: String(opt) };
    }), [options]);

    const selectedOption = normalizedOptions.find(opt => opt.value === value) || null;

    const updateMenuPosition = useCallback(() => {
        if (!isOpen || !containerRef.current || typeof window === 'undefined') return;
        const rect = (triggerRef.current || containerRef.current).getBoundingClientRect();
        const screenH = window.innerHeight || 800;
        const screenW = window.innerWidth || 1200;
        const estH = Math.min(normalizedOptions.length * 44 + 20, 300);
        const spaceBelow = screenH - rect.bottom - 12;
        const spaceAbove = rect.top - 12;
        const shouldFlipUp = spaceBelow < estH && spaceAbove > spaceBelow;

        const hasRichMeta = normalizedOptions.some(opt => opt.description || opt.badge);
        const minW = hasRichMeta ? Math.max(rect.width, 210) : Math.max(rect.width, size === 'sm' ? 115 : 170);
        const effectiveW = Math.min(minW, screenW - 24);

        let left = rect.left;
        if (left + effectiveW > screenW - 12) {
            left = Math.max(12, rect.right - effectiveW);
        }
        left = Math.max(12, Math.min(left, screenW - effectiveW - 12));

        const nextStyle = {
            position: 'fixed',
            zIndex: 99999,
            left: `${Math.round(left)}px`,
            width: rect.width >= minW ? `${Math.round(rect.width)}px` : undefined,
            minWidth: `${Math.round(effectiveW)}px`,
            maxWidth: `${screenW - 24}px`,
            maxHeight: `${Math.min(300, Math.max(120, (shouldFlipUp ? spaceAbove : spaceBelow) - 6))}px`
        };

        if (shouldFlipUp) {
            nextStyle.bottom = `${Math.round(screenH - rect.top + 6)}px`;
        } else {
            nextStyle.top = `${Math.round(rect.bottom + 6)}px`;
        }

        setOpenUpwards(shouldFlipUp);
        setMenuPositionStyle(nextStyle);
    }, [isOpen, normalizedOptions, size]);

    // Measure trigger bounding rect before paint to position portaled menu without flicker
    useLayoutEffect(() => {
        if (!isOpen) {
            setMenuPositionStyle(null);
            return;
        }
        updateMenuPosition();
    }, [isOpen, updateMenuPosition]);

    // Handle outside clicks, scroll/resize repositioning, and keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            const inContainer = containerRef.current && containerRef.current.contains(e.target);
            const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
            const inMenu = menuRef.current && menuRef.current.contains(e.target);
            if (!inContainer && !inTrigger && !inMenu) {
                setIsOpen(false);
            }
        };
        const handleScrollOrResize = (e) => {
            if (e?.type === 'scroll' && e.target && menuRef.current && menuRef.current.contains(e.target)) {
                return;
            }
            updateMenuPosition();
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const currentIndex = normalizedOptions.findIndex(o => o.value === value);
                let nextIndex = 0;
                if (e.key === 'ArrowDown') {
                    nextIndex = currentIndex === -1 || currentIndex === normalizedOptions.length - 1 ? 0 : currentIndex + 1;
                } else {
                    nextIndex = currentIndex <= 0 ? normalizedOptions.length - 1 : currentIndex - 1;
                }
                const nextOpt = normalizedOptions[nextIndex];
                if (nextOpt && !nextOpt.disabled) {
                    onChange(nextOpt.value);
                }
            }
        };

        window.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, normalizedOptions, value, onChange, updateMenuPosition]);

    const handleSelect = (optVal) => {
        onChange(optVal);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const isFullWidth = typeof className === 'string' && className.includes('w-full');

    return (
        <div ref={containerRef} className={`relative ${isFullWidth ? 'block w-full' : 'inline-block'} text-left select-none`}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-label={ariaLabel}
                aria-expanded={isOpen}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2.5 rounded-xl border font-medium outline-none transition-all duration-150 cursor-pointer ${
                    size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'
                } ${
                    disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
                } ${
                    isOpen ? 'border-accent/60 shadow-[0_0_12px_rgba(255,255,255,0.08)]' : ''
                } ${
                    isBright 
                        ? 'bg-white/90 hover:bg-white border-black/10 text-zinc-800 hover:border-black/20 shadow-sm' 
                        : 'bg-[#12131a]/85 hover:bg-[#181a24] border-white/[0.08] text-white/90 hover:border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                } ${className}`}
                style={{
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)'
                }}
            >
                <div className="flex items-center gap-2 truncate min-w-0">
                    {selectedOption?.icon && (
                        <selectedOption.icon size={size === 'sm' ? 12 : 14} className="shrink-0 text-accent" />
                    )}
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    {selectedOption?.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 ${
                            isBright ? 'bg-black/5 text-zinc-600' : 'bg-white/10 text-white/70'
                        }`}>
                            {selectedOption.badge}
                        </span>
                    )}
                </div>
                <ChevronDown 
                    size={size === 'sm' ? 11 : 13} 
                    className={`shrink-0 transition-transform duration-200 ${
                        isBright ? 'text-zinc-500' : 'text-white/40'
                    } ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {isOpen && menuPositionStyle && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    data-open-upwards={openUpwards ? 'true' : 'false'}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        ...menuPositionStyle,
                        ...getLiquidGlassInlineStyle(isBright)
                    }}
                    className={`fixed overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1.5 rounded-2xl flex flex-col gap-0.5 animate-pop-in select-none ${getLiquidGlassMenuClasses(isBright)} ${dropdownClassName}`}
                >
                    {normalizedOptions.map((opt) => {
                        const isSelected = opt.value === value;
                        const OptIcon = opt.icon;
                        return (
                            <button
                                key={String(opt.value)}
                                type="button"
                                disabled={opt.disabled}
                                onClick={() => handleSelect(opt.value)}
                                className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-150 cursor-pointer ${
                                    opt.disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                                } ${
                                    isSelected
                                        ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                                        : (isBright 
                                            ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' 
                                            : 'hover:bg-white/10 text-white/75 hover:text-white')
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    {OptIcon && (
                                        <OptIcon size={14} className={isSelected ? 'text-zinc-950' : 'text-accent'} />
                                    )}
                                    <div className="flex flex-col truncate">
                                        <span className="truncate">{opt.label}</span>
                                        {opt.description && (
                                            <span className={`text-[10px] font-normal leading-tight mt-0.5 ${
                                                isSelected ? 'text-zinc-900/80' : (isBright ? 'text-zinc-500' : 'text-white/45')
                                            }`}>
                                                {opt.description}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isSelected ? (
                                    <Check size={14} className="shrink-0 text-zinc-950 font-bold" />
                                ) : (
                                    opt.badge && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold tracking-wide shrink-0 ${
                                            isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-white/50'
                                        }`}>
                                            {opt.badge}
                                        </span>
                                    )
                                )}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}
