import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Crop } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function SnippingOverlay() {
    const isSnippingMode = useUIStore(state => state.isSnippingMode);
    const setIsSnippingMode = useUIStore(state => state.setIsSnippingMode);
    const captureSelectedArea = useUIStore(state => state.captureSelectedArea);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const [startPos, setStartPos] = useState(null);
    const [currentPos, setCurrentPos] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selection, setSelection] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const overlayRef = useRef(null);

    const handleConfirmCapture = useCallback(async () => {
        if (!selection || selection.width < 10 || selection.height < 10 || isCapturing) return;

        setIsCapturing(true);

        // 1. Instantly hide the overlay DOM synchronously to prevent Chromium compositor from baking it in
        if (overlayRef.current) {
            overlayRef.current.style.display = 'none';
            overlayRef.current.style.visibility = 'hidden';
            overlayRef.current.style.opacity = '0';
        }

        const captureRect = {
            x: Math.round(selection.left),
            y: Math.round(selection.top),
            width: Math.round(selection.width),
            height: Math.round(selection.height)
        };

        // 2. Clear snipping mode in store
        setIsSnippingMode(false);

        // 3. Wait for Chromium to flush and present clean frame without any overlay elements
        await new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 80);
                });
            });
        });

        // 4. Capture clean screen area
        try {
            await captureSelectedArea(captureRect);
        } finally {
            setIsCapturing(false);
        }
    }, [selection, isCapturing, captureSelectedArea, setIsSnippingMode]);

    // Cancel on Escape or confirm on Enter
    useEffect(() => {
        if (!isSnippingMode) {
            setStartPos(null);
            setCurrentPos(null);
            setIsDragging(false);
            setSelection(null);
            setIsCapturing(false);
            return;
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (!isCapturing) {
                    setIsSnippingMode(false);
                }
            } else if (e.key === 'Enter' && selection && selection.width > 15 && selection.height > 15 && !isCapturing) {
                e.preventDefault();
                handleConfirmCapture();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSnippingMode, selection, isCapturing, setIsSnippingMode, handleConfirmCapture]);

    const handleMouseDown = (e) => {
        if (isCapturing || e.button !== 0) return; // Left click only
        const rect = overlayRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        setStartPos({ x, y });
        setCurrentPos({ x, y });
        setIsDragging(true);
        setSelection(null);
    };

    const handleMouseMove = (e) => {
        if (isCapturing || !isDragging || !startPos) return;
        const rect = overlayRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        setCurrentPos({ x, y });

        const left = Math.min(startPos.x, x);
        const top = Math.min(startPos.y, y);
        const width = Math.abs(x - startPos.x);
        const height = Math.abs(y - startPos.y);

        setSelection({ left, top, width, height });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (selection && (selection.width < 15 || selection.height < 15)) {
            setSelection(null);
        }
    };

    // Calculate intelligent action bar position (especially on resolutions lower than 1080p)
    const getActionBarStyle = () => {
        if (!selection) return {};

        const BAR_HEIGHT = 44;
        const BAR_WIDTH = 165;
        const MARGIN = 12;

        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const spaceBelow = winH - (selection.top + selection.height);
        const spaceAbove = selection.top;

        let top;
        if (spaceBelow >= BAR_HEIGHT + MARGIN) {
            // Ample space below selection
            top = selection.top + selection.height + MARGIN;
        } else if (spaceAbove >= BAR_HEIGHT + MARGIN) {
            // Low resolution (< 1080p) or near bottom of window: position cleanly ABOVE selection
            top = selection.top - BAR_HEIGHT - MARGIN;
        } else {
            // Selection spans almost the entire vertical viewport: place inside selection bottom
            top = Math.max(10, selection.top + selection.height - BAR_HEIGHT - 10);
        }

        // Horizontal positioning: align with right edge of selection, clamped safely inside viewport
        let left = selection.left + selection.width - BAR_WIDTH;
        left = Math.max(10, Math.min(winW - BAR_WIDTH - 10, left));

        return {
            left: `${Math.round(left)}px`,
            top: `${Math.round(top)}px`
        };
    };

    if (!isSnippingMode || isCapturing) return null;

    return createPortal(
        <div
            ref={overlayRef}
            id="qbrowse-snipping-overlay"
            className={`fixed inset-0 z-[100000] cursor-crosshair select-none ${isBright ? 'bg-black/25' : 'bg-black/40'} backdrop-blur-[0.5px] overflow-hidden`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={(e) => { e.preventDefault(); if (!isCapturing) setIsSnippingMode(false); }}
        >
            {/* Instruction Pill */}
            {!selection && !isDragging && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none ${
                    isBright 
                        ? 'bg-white/90 border-white/70 text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                        : 'bg-[#0e1015]/90 border-white/20 text-white/90 shadow-2xl'
                } border backdrop-blur-xl rounded-full px-4 py-2 text-xs font-medium flex items-center gap-2 animate-bounce-subtle`}>
                    <Crop size={14} className="text-accent" />
                    <span>Click and drag to select an area to snip • Press <kbd className={`px-1.5 py-0.5 rounded ${isBright ? 'bg-black/10 text-zinc-800' : 'bg-white/10 text-white/90'} text-[10px] font-mono`}>Esc</kbd> to cancel</span>
                </div>
            )}

            {/* Dragged Selection Box */}
            {selection && (
                <div
                    className="absolute border-2 border-accent bg-accent/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none rounded-sm transition-none"
                    style={{
                        left: `${selection.left}px`,
                        top: `${selection.top}px`,
                        width: `${selection.width}px`,
                        height: `${selection.height}px`
                    }}
                >
                    {/* Dimension Badge - Flips inside if near window top */}
                    <div className={`absolute ${selection.top < 32 ? 'top-1.5 left-1.5' : '-top-7 left-0'} ${
                        isBright ? 'bg-white/95 border-black/10 text-zinc-900 shadow-md' : 'bg-black/90 border-white/20 text-white shadow-lg'
                    } border font-mono text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap`}>
                        {Math.round(selection.width)} × {Math.round(selection.height)} px
                    </div>

                    {/* Corner Grippers */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-accent rounded-full shadow" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full shadow" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent rounded-full shadow" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-accent rounded-full shadow" />
                </div>
            )}

            {/* Action Bar when Drag completes */}
            {selection && !isDragging && selection.width >= 15 && selection.height >= 15 && (
                <div
                    className={`absolute z-10 flex items-center gap-1.5 ${
                        isBright 
                            ? 'bg-white/95 border-white/70 shadow-[0_15px_35px_rgba(0,0,0,0.15)] text-zinc-900' 
                            : 'bg-[#0e1015]/95 border-white/20 shadow-[0_15px_35px_rgba(0,0,0,0.8)] text-white'
                    } border backdrop-blur-2xl rounded-xl p-1 pointer-events-auto animate-pop-in`}
                    style={getActionBarStyle()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleConfirmCapture}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black font-bold text-xs hover:bg-accent/90 transition shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Check size={14} strokeWidth={3} />
                        <span>Snip</span>
                    </button>
                    <button
                        onClick={() => {
                            setSelection(null);
                            setIsSnippingMode(false);
                        }}
                        className={`p-1.5 rounded-lg ${isBright ? 'hover:bg-black/5 text-zinc-500' : 'hover:bg-white/10 text-white/60'} hover:text-red-500 transition cursor-pointer`}
                        title="Cancel (Esc)"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
}
