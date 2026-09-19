import React, { useEffect } from 'react';
import { Crop, Monitor, ScrollText, X, Camera } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function ScreenshotBar() {
    const {
        isScreenshotBarOpen,
        setIsScreenshotBarOpen,
        setIsSnippingMode,
        captureVisibleViewport,
        captureFullPage
    } = useUIStore();

    useEffect(() => {
        if (!isScreenshotBarOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsScreenshotBarOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isScreenshotBarOpen, setIsScreenshotBarOpen]);

    if (!isScreenshotBarOpen) return null;

    return (
        <div 
            className="absolute top-4 right-6 z-[60] flex items-center gap-1.5 bg-[#0e1015]/92 backdrop-blur-3xl border border-white/20 rounded-2xl p-1.5 px-3 shadow-[0_20px_60px_rgba(0,0,0,0.85)] animate-slide-down-fade select-none text-white transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-1.5 px-2 text-white/50 text-xs font-semibold border-r border-white/10 mr-1">
                <Camera size={14} className="text-accent" />
                <span>Screenshot</span>
            </div>

            <button
                onClick={() => {
                    setIsScreenshotBarOpen(false);
                    setTimeout(() => setIsSnippingMode(true), 50);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 text-xs font-medium text-white/90 hover:text-white transition active:scale-95"
                title="Select a rectangular area to crop and capture"
            >
                <Crop size={14} className="text-amber-400" />
                <span>Snip Area</span>
            </button>

            <button
                onClick={() => {
                    setIsScreenshotBarOpen(false);
                    captureVisibleViewport();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 text-xs font-medium text-white/90 hover:text-white transition active:scale-95"
                title="Capture currently visible viewport"
            >
                <Monitor size={14} className="text-cyan-400" />
                <span>Visible Viewport</span>
            </button>

            <button
                onClick={() => {
                    setIsScreenshotBarOpen(false);
                    captureFullPage();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 text-xs font-medium text-white/90 hover:text-white transition active:scale-95"
                title="Capture complete scrolling webpage from top to bottom"
            >
                <ScrollText size={14} className="text-emerald-400" />
                <span>Full Page</span>
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            <button
                onClick={() => setIsScreenshotBarOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-red-400 transition"
                title="Close (Esc)"
            >
                <X size={14} />
            </button>
        </div>
    );
}
