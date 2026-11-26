import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Palette, RotateCcw } from 'lucide-react';
import { getLiquidGlassSurfaceClasses, getLiquidGlassInlineStyle } from './ContextMenuProvider';
import { useTranslation } from '../../i18n/index';

const CURATED_SWATCHES = [
    // Row 1: QBrowse Obsidian & Warm Accents
    '#d4bc94', '#f59e0b', '#f97316', '#f43f5e',
    '#ec4899', '#a855f7', '#8b5cf6', '#6366f1',
    // Row 2: Cool Frosted & Neon Accents
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
    '#10b981', '#84cc16', '#94a3b8', '#e2e8f0'
];

export function normalizeHex(raw, fallback = '#d4bc94') {
    if (typeof raw !== 'string') return fallback;
    const cleaned = raw.trim().replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length === 3) {
        return '#' + cleaned.split('').map((c) => c + c).join('').toLowerCase();
    }
    if (cleaned.length === 6) {
        return '#' + cleaned.toLowerCase();
    }
    return fallback;
}

export function hexToRgb(hex) {
    const norm = normalizeHex(hex, '#d4bc94');
    const intVal = parseInt(norm.slice(1), 16);
    return {
        r: (intVal >> 16) & 255,
        g: (intVal >> 8) & 255,
        b: intVal & 255
    };
}

export function rgbToHex(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    const v = max;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (d !== 0) {
        if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        else if (max === gn) h = ((bn - rn) / d + 2) * 60;
        else h = ((rn - gn) / d + 4) * 60;
    }
    return { h, s, v };
}

export function hsvToRgb(h, s, v) {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(1, s));
    const val = Math.max(0, Math.min(1, v));
    const c = val * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = val - c;
    let r1 = 0, g1 = 0, b1 = 0;
    if (hue < 60) [r1, g1, b1] = [c, x, 0];
    else if (hue < 120) [r1, g1, b1] = [x, c, 0];
    else if (hue < 180) [r1, g1, b1] = [0, c, x];
    else if (hue < 240) [r1, g1, b1] = [0, x, c];
    else if (hue < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    return {
        r: Math.round((r1 + m) * 255),
        g: Math.round((g1 + m) * 255),
        b: Math.round((b1 + m) * 255)
    };
}

export function hsvToHex(h, s, v) {
    const { r, g, b } = hsvToRgb(h, s, v);
    return rgbToHex(r, g, b);
}

export function hexToHsv(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
}

/**
 * Interactive Liquid Glass Color Palette Picker with 2D Saturation/Value square,
 * Hue slider, curated 16-color swatches, live #HEX input, and Reset action.
 */
export default function ColorPalettePicker({
    value,
    onChange,
    isBright = false,
    defaultColor = '#d4bc94',
    label,
    swatches,
    compact = false
}) {
    const { t } = useTranslation();
    const fallbackHex = normalizeHex(defaultColor, '#d4bc94');
    const resolvedHex = normalizeHex(value, fallbackHex);

    const [isOpen, setIsOpen] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [hsv, setHsv] = useState(() => hexToHsv(resolvedHex));
    const [hexInput, setHexInput] = useState(() => resolvedHex.slice(1).toUpperCase());
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, openDirection: 'below' });
    const [isDraggingSv, setIsDraggingSv] = useState(false);
    const [isDraggingHue, setIsDraggingHue] = useState(false);
    const [isResetSpinning, setIsResetSpinning] = useState(false);

    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const svSquareRef = useRef(null);
    const hueBarRef = useRef(null);
    const closeTimerRef = useRef(null);
    const resetSpinTimerRef = useRef(null);

    // Sync external value changes without clobbering hue/saturation on pure black/white
    useEffect(() => {
        const currentHsvHex = hsvToHex(hsv.h, hsv.s, hsv.v);
        if (resolvedHex !== currentHsvHex) {
            setHsv(hexToHsv(resolvedHex));
        }
        setHexInput(resolvedHex.slice(1).toUpperCase());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedHex]);

    // Animated mount/unmount lifecycle
    useEffect(() => {
        if (isOpen) {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
            setIsRendered(true);
            setIsClosing(false);
        } else if (isRendered) {
            setIsClosing(true);
            closeTimerRef.current = setTimeout(() => {
                setIsRendered(false);
                setIsClosing(false);
                closeTimerRef.current = null;
            }, 150);
        }
    }, [isOpen, isRendered]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            if (resetSpinTimerRef.current) clearTimeout(resetSpinTimerRef.current);
        };
    }, []);

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const popW = 264;
        const popH = popoverRef.current?.offsetHeight || 336;
        const pad = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = rect.right - popW;
        if (left < pad) left = rect.left;
        if (left + popW > vw - pad) left = Math.max(pad, vw - popW - pad);

        let top = rect.bottom + 8;
        let openDirection = 'below';
        if (top + popH > vh - pad) {
            const above = rect.top - popH - 8;
            if (above >= pad) {
                top = above;
                openDirection = 'above';
            } else {
                top = Math.max(pad, vh - popH - pad);
            }
        }
        setPopoverPos({ top, left, openDirection });
    }, []);

    useLayoutEffect(() => {
        if (!isRendered) return;
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isRendered, updatePosition]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                setIsOpen(false);
            }
        };
        const handlePointerDown = (e) => {
            if (
                popoverRef.current?.contains(e.target) ||
                triggerRef.current?.contains(e.target)
            ) {
                return;
            }
            setIsOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('pointerdown', handlePointerDown, true);
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [isOpen]);

    const commitHsv = useCallback((nextHsv) => {
        setHsv(nextHsv);
        const nextHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
        setHexInput(nextHex.slice(1).toUpperCase());
        onChange?.(nextHex);
    }, [onChange]);

    const handleSvPointer = useCallback((e) => {
        const el = svSquareRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
        commitHsv({ ...hsv, s, v });
    }, [hsv, commitHsv]);

    const handleHuePointer = useCallback((e) => {
        const el = hueBarRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        commitHsv({ ...hsv, h: ratio * 360 });
    }, [hsv, commitHsv]);

    const handleHexTextChange = (e) => {
        const cleaned = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
        setHexInput(cleaned.toUpperCase());
        if (cleaned.length === 3 || cleaned.length === 6) {
            const norm = normalizeHex('#' + cleaned, resolvedHex);
            setHsv(hexToHsv(norm));
            onChange?.(norm);
        }
    };

    const handleHexBlur = () => {
        setHexInput(resolvedHex.slice(1).toUpperCase());
    };

    const paletteList = Array.isArray(swatches) && swatches.length > 0 ? swatches : CURATED_SWATCHES;
    const isDefault = defaultColor && resolvedHex === fallbackHex;
    const hueColor = `hsl(${Math.round(hsv.h)}, 100%, 50%)`;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                title={label || t('cfg.colorPicker.openPicker', null, 'Open Color Palette')}
                aria-label={label || t('cfg.colorPicker.openPicker', null, 'Open Color Palette')}
                aria-expanded={isOpen}
                className={`group inline-flex items-center gap-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 select-none ${
                    compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
                } ${
                    isBright
                        ? 'bg-white border-black/[0.09] hover:border-black/20 text-zinc-900 shadow-xs'
                        : 'bg-black/40 border-white/[0.08] hover:border-white/20 text-white'
                } ${isOpen ? 'ring-1 ring-accent border-accent/60' : ''}`}
            >
                <span
                    className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-full border shrink-0 shadow-xs transition-all duration-200 group-hover:scale-110 ${
                        isBright ? 'border-black/15' : 'border-white/25'
                    }`}
                    style={{
                        backgroundColor: resolvedHex,
                        boxShadow: isOpen ? `0 0 8px ${resolvedHex}66` : undefined
                    }}
                />
                <span className="font-mono uppercase tracking-tight">{resolvedHex}</span>
                <Palette
                    size={compact ? 12 : 13}
                    className={`transition-transform duration-200 ${
                        isOpen
                            ? 'rotate-12 text-accent'
                            : (isBright ? 'text-zinc-500 group-hover:rotate-6' : 'text-white/50 group-hover:rotate-6')
                    }`}
                />
            </button>

            {isRendered && createPortal(
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-label={label || t('cfg.colorPicker.palette', null, 'Color Palette')}
                    className={`fixed z-[99999] w-[264px] p-3.5 rounded-2xl space-y-3 select-none overflow-hidden ${getLiquidGlassSurfaceClasses(isBright)} ${
                        isClosing ? 'animate-color-popover-out pointer-events-none' : 'animate-color-popover-in'
                    }`}
                    style={{
                        ...getLiquidGlassInlineStyle(isBright),
                        top: popoverPos.top,
                        left: popoverPos.left,
                        transformOrigin: popoverPos.openDirection === 'above' ? 'bottom right' : 'top right'
                    }}
                >
                    {/* Subtle Live Ambient Tint */}
                    <div
                        className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{
                            background: `radial-gradient(120% 70% at 50% 0%, ${resolvedHex}${isBright ? '1a' : '26'}, transparent 72%)`,
                            transition: 'background 280ms ease'
                        }}
                    />

                    {/* 2D Saturation / Value Gradient Square */}
                    <div
                        ref={svSquareRef}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setIsDraggingSv(true);
                            handleSvPointer(e);
                        }}
                        onPointerMove={(e) => {
                            if (e.buttons !== 1 && !e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
                            handleSvPointer(e);
                        }}
                        onPointerUp={(e) => {
                            setIsDraggingSv(false);
                            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                            }
                        }}
                        onPointerCancel={() => setIsDraggingSv(false)}
                        className={`relative z-10 w-full h-36 rounded-xl overflow-hidden cursor-crosshair touch-none border ${
                            isBright ? 'border-black/10' : 'border-white/10'
                        }`}
                        style={{
                            backgroundColor: hueColor,
                            transition: isDraggingHue ? 'none' : 'background-color 220ms ease'
                        }}
                    >
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0))' }}
                        />
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: 'linear-gradient(to top, #000000, rgba(0,0,0,0))' }}
                        />
                        <div
                            className="absolute w-3.5 h-3.5 rounded-full border-2 border-white pointer-events-none"
                            style={{
                                left: `${hsv.s * 100}%`,
                                top: `${(1 - hsv.v) * 100}%`,
                                transform: `translate(-50%, -50%) scale(${isDraggingSv ? 1.36 : 1})`,
                                backgroundColor: resolvedHex,
                                boxShadow: isDraggingSv
                                    ? `0 0 0 2px ${resolvedHex}66, 0 0 12px ${resolvedHex}88, 0 2px 8px rgba(0,0,0,0.5)`
                                    : '0 0 0 1px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.45)',
                                transition: isDraggingSv
                                    ? 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms ease'
                                    : 'left 200ms cubic-bezier(0.22, 1, 0.36, 1), top 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, box-shadow 180ms ease'
                            }}
                        />
                    </div>

                    {/* Rainbow Hue Slider Bar */}
                    <div
                        ref={hueBarRef}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setIsDraggingHue(true);
                            handleHuePointer(e);
                        }}
                        onPointerMove={(e) => {
                            if (e.buttons !== 1 && !e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
                            handleHuePointer(e);
                        }}
                        onPointerUp={(e) => {
                            setIsDraggingHue(false);
                            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                            }
                        }}
                        onPointerCancel={() => setIsDraggingHue(false)}
                        className={`relative z-10 w-full h-3.5 rounded-full cursor-pointer touch-none border ${
                            isBright ? 'border-black/10' : 'border-white/15'
                        }`}
                        style={{
                            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                        }}
                    >
                        <div
                            className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none"
                            style={{
                                left: `${(hsv.h / 360) * 100}%`,
                                transform: `translate(-50%, -50%) scale(${isDraggingHue ? 1.3 : 1})`,
                                backgroundColor: hueColor,
                                boxShadow: isDraggingHue
                                    ? `0 0 0 2px ${hueColor}66, 0 0 10px ${hueColor}88, 0 2px 6px rgba(0,0,0,0.45)`
                                    : '0 0 0 1px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.45)',
                                transition: isDraggingHue
                                    ? 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms ease'
                                    : 'left 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, box-shadow 180ms ease'
                            }}
                        />
                    </div>

                    {/* Curated 16-color Harmonious Palette Grid (2x8) */}
                    <div className="relative z-10 grid grid-cols-8 gap-1.5 pt-0.5">
                        {paletteList.slice(0, 16).map((hex, idx) => {
                            const norm = normalizeHex(hex);
                            const isSelected = resolvedHex === norm;
                            return (
                                <button
                                    key={norm}
                                    type="button"
                                    onClick={() => {
                                        setHsv(hexToHsv(norm));
                                        setHexInput(norm.slice(1).toUpperCase());
                                        onChange?.(norm);
                                    }}
                                    title={norm.toUpperCase()}
                                    className={`animate-color-swatch w-6 h-6 rounded-full transition-all duration-200 hover:scale-125 hover:-translate-y-0.5 active:scale-90 cursor-pointer flex items-center justify-center ${
                                        isSelected
                                            ? (isBright
                                                ? 'ring-2 ring-zinc-900 ring-offset-1 ring-offset-white scale-110'
                                                : 'ring-2 ring-white ring-offset-1 ring-offset-black/70 scale-110')
                                            : (isBright ? 'border border-black/10' : 'border border-white/15')
                                    }`}
                                    style={{
                                        backgroundColor: norm,
                                        animationDelay: `${idx * 14}ms`,
                                        boxShadow: isSelected ? `0 0 10px ${norm}80` : undefined
                                    }}
                                >
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs animate-pop-in" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer: Live Preview + Editable #HEX Input + Reset */}
                    <div className="relative z-10 flex items-center gap-2 pt-0.5">
                        <div
                            className={`w-7 h-7 rounded-lg shrink-0 border shadow-xs transition-all duration-200 ${
                                isBright ? 'border-black/15' : 'border-white/20'
                            }`}
                            style={{
                                backgroundColor: resolvedHex,
                                boxShadow: `0 2px 10px ${resolvedHex}40`
                            }}
                        />
                        <div
                            className={`flex-1 flex items-center rounded-lg border px-2 py-1 transition-colors duration-200 focus-within:border-accent ${
                                isBright
                                    ? 'bg-white/90 border-black/[0.1] text-zinc-900'
                                    : 'bg-black/45 border-white/[0.1] text-white'
                            }`}
                        >
                            <span className={`text-xs font-mono select-none ${isBright ? 'text-zinc-400' : 'text-white/40'}`}>#</span>
                            <input
                                type="text"
                                value={hexInput}
                                onChange={handleHexTextChange}
                                onBlur={handleHexBlur}
                                placeholder={t('cfg.colorPicker.hexPlaceholder', null, 'D4BC94')}
                                maxLength={6}
                                className="w-full bg-transparent border-none outline-none text-xs font-mono uppercase pl-1"
                            />
                        </div>
                        {defaultColor && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsResetSpinning(true);
                                    if (resetSpinTimerRef.current) clearTimeout(resetSpinTimerRef.current);
                                    resetSpinTimerRef.current = setTimeout(() => setIsResetSpinning(false), 350);
                                    setHsv(hexToHsv(fallbackHex));
                                    setHexInput(fallbackHex.slice(1).toUpperCase());
                                    onChange?.(fallbackHex);
                                }}
                                disabled={isDefault}
                                title={t('cfg.colorPicker.reset', null, 'Reset')}
                                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isBright
                                        ? 'bg-black/[0.04] border-black/[0.08] text-zinc-700 hover:bg-black/[0.08]'
                                        : 'bg-white/[0.06] border-white/[0.09] text-zinc-300 hover:bg-white/[0.12] hover:text-white'
                                }`}
                            >
                                <RotateCcw
                                    size={11}
                                    className={`transition-transform duration-300 ${isResetSpinning ? '-rotate-180' : ''}`}
                                />
                                <span>{t('cfg.colorPicker.reset', null, 'Reset')}</span>
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
