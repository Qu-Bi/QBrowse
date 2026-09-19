import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Crop } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function SnippingOverlay() {
    const isSnippingMode = useUIStore(state => state.isSnippingMode);
    const setIsSnippingMode = useUIStore(state => state.setIsSnippingMode);
    const captureSelectedArea = useUIStore(state => state.captureSelectedArea);
    const getActiveWebView = useUIStore(state => state.getActiveWebView);

    const [startPos, setStartPos] = useState(null);
    const [currentPos, setCurrentPos] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selection, setSelection] = useState(null);
    const overlayRef = useRef(null);

    // Cancel on Escape or confirm on Enter
    useEffect(() => {
        if (!isSnippingMode) {
            setStartPos(null);
            setCurrentPos(null);
            setIsDragging(false);
            setSelection(null);
            return;
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsSnippingMode(false);
            } else if (e.key === 'Enter' && selection && selection.width > 15 && selection.height > 15) {
                e.preventDefault();
                handleConfirmCapture();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSnippingMode, selection, setIsSnippingMode]);

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Left click only
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX;
        const y = e.clientY;
        setStartPos({ x, y });
        setCurrentPos({ x, y });
        setIsDragging(true);
        setSelection(null);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !startPos) return;
        const x = e.clientX;
        const y = e.clientY;
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

    const handleConfirmCapture = useCallback(async () => {
        if (!selection || selection.width < 10 || selection.height < 10) return;

        const wv = getActiveWebView();
        const wvRect = wv ? wv.getBoundingClientRect() : overlayRef.current?.getBoundingClientRect();

        let cropX = 0;
        let cropY = 0;
        let cropWidth = selection.width;
        let cropHeight = selection.height;

        if (wvRect) {
            cropX = Math.max(0, selection.left - wvRect.left);
            cropY = Math.max(0, selection.top - wvRect.top);
            cropWidth = Math.min(wvRect.width - cropX, selection.width);
            cropHeight = Math.min(wvRect.height - cropY, selection.height);
        }

        setIsSnippingMode(false);
        await captureSelectedArea({
            x: Math.round(cropX),
            y: Math.round(cropY),
            width: Math.round(cropWidth),
            height: Math.round(cropHeight)
        });
    }, [selection, getActiveWebView, captureSelectedArea, setIsSnippingMode]);

    if (!isSnippingMode) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[100000] cursor-crosshair select-none bg-black/45 backdrop-blur-[1px] overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={(e) => { e.preventDefault(); setIsSnippingMode(false); }}
        >
            {/* Instruction Pill */}
            {!selection && !isDragging && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none bg-[#0e1015]/90 border border-white/20 rounded-full px-4 py-2 text-xs font-medium text-white/90 shadow-2xl flex items-center gap-2 animate-bounce-subtle">
                    <Crop size={14} className="text-accent" />
                    <span>Click and drag to select an area to snip • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Esc</kbd> to cancel</span>
                </div>
            )}

            {/* Dragged Selection Box */}
            {selection && (
                <div
                    className="absolute border-2 border-accent bg-accent/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none rounded-sm transition-none"
                    style={{
                        left: `${selection.left}px`,
                        top: `${selection.top}px`,
                        width: `${selection.width}px`,
                        height: `${selection.height}px`
                    }}
                >
                    {/* Dimension Badge */}
                    <div className="absolute -top-7 left-0 bg-black/90 border border-white/20 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
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
                    className="absolute z-10 flex items-center gap-1.5 bg-[#0e1015]/95 border border-white/20 rounded-xl p-1 shadow-[0_15px_35px_rgba(0,0,0,0.8)] pointer-events-auto animate-pop-in"
                    style={{
                        left: `${Math.min(window.innerWidth - 180, Math.max(10, selection.left + selection.width - 160))}px`,
                        top: `${Math.min(window.innerHeight - 50, selection.top + selection.height + 12)}px`
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleConfirmCapture}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black font-bold text-xs hover:bg-accent/90 transition shadow-sm active:scale-95"
                    >
                        <Check size={14} strokeWidth={3} />
                        <span>Snip</span>
                    </button>
                    <button
                        onClick={() => {
                            setSelection(null);
                            setIsSnippingMode(false);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-red-400 transition"
                        title="Cancel (Esc)"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
