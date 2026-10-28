import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

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
    const isBright = propIsBright !== undefined ? propIsBright : storeTheme === 'light';
    const [isOpen, setIsOpen] = useState(false);
    const [openUpwards, setOpenUpwards] = useState(false);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Normalize options if passed as simple strings/numbers
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
            return opt;
        }
        return { value: opt, label: String(opt) };
    });

    const selectedOption = normalizedOptions.find(opt => opt.value === value) || null;

    // Detect if dropdown should flip upwards to avoid viewport clipping
    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const estH = Math.min(normalizedOptions.length * 44 + 20, 320);
        if (rect.bottom + estH > screenH - 12 && rect.top > estH + 12) {
            setOpenUpwards(true);
        } else {
            setOpenUpwards(false);
        }
    }, [isOpen, normalizedOptions.length]);

    // Handle outside clicks and keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
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
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, normalizedOptions, value, onChange]);

    const handleSelect = (optVal) => {
        onChange(optVal);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <div className="relative inline-block text-left select-none">
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
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <selectedOption.icon size={size === 'sm' ? 12 : 14} className="shrink-0 text-accent" />
                    )}
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    {selectedOption?.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
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

            {isOpen && (
                <div
                    ref={dropdownRef}
                    style={{
                        backdropFilter: 'blur(var(--glass-blur, 28px)) saturate(180%)',
                        WebkitBackdropFilter: 'blur(var(--glass-blur, 28px)) saturate(180%)'
                    }}
                    className={`absolute z-[99999] min-w-[210px] max-h-[300px] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1.5 rounded-2xl border backdrop-blur-2xl flex flex-col gap-0.5 animate-pop-in ${
                        openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                    } right-0 ${
                        isBright 
                            ? 'bg-white/95 border-black/[0.08] text-zinc-900 shadow-[0_20px_45px_rgba(0,0,0,0.14)]' 
                            : 'bg-[#12131a]/95 border-white/[0.08] text-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
                    } ${dropdownClassName}`}
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
                                            : 'hover:bg-white/10 text-white/70 hover:text-white')
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
                                                isSelected ? 'text-zinc-900/80' : (isBright ? 'text-zinc-500' : 'text-white/40')
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
                </div>
            )}
        </div>
    );
}
