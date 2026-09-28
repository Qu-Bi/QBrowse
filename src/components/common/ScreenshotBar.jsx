import React, { useEffect } from 'react';
import { Crop, Monitor, ScrollText, X, Camera } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function ScreenshotBar() {
    const {
        isScreenshotBarOpen,
        setIsScreenshotBarOpen,
        setIsSnippingMode,
        captureVisibleViewport,
        captureFullPage
    } = useUIStore();

    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

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
            className={`absolute top-4 right-6 z-[60] flex items-center gap-1.5 backdrop-blur-3xl rounded-2xl p-1.5 px-3 animate-slide-down-fade select-none transition-all duration-200 ${
                isBright
                    ? 'bg-white/85 border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] text-zinc-900'
                    : 'bg-[#0e1015]/92 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-1.5 px-2 text-xs font-semibold border-r mr-1 ${
                isBright ? 'text-zinc-600 border-black/10' : 'text-white/50 border-white/10'
            }`}>
                <Camera size={14} className="text-accent" />
                <span>Screenshot</span>
            </div>

            <button
                onClick={() => {
                    setIsScreenshotBarOpen(false);
                    setTimeout(() => setIsSnippingMode(true), 50);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition active:scale-95 ${
                    isBright ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' : 'hover:bg-white/10 text-white/90 hover:text-white'
                }`}
                title="Select a rectangular area to crop and capture"
            >
                <Crop size={14} className="text-amber-500" />
                <span>Snip Area</span>
            </button>

            <button
                onClick={() => {
                    setIsScreenshotBarOpen(false);
                    captureVisibleViewport();
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition active:scale-95 ${
                    isBright ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' : 'hover:bg-white/10 text-white/90 hover:text-white'
                }`}
                title="Capture currently visible viewport"
            >
                <Monitor size={14} className="text-cyan-500" />
                <span>Visible Viewport</span>
            </button>

            <button
                onClick={() => {
                    setIsScreenshotBarOpen(false);
                    captureFullPage();
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition active:scale-95 ${
                    isBright ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' : 'hover:bg-white/10 text-white/90 hover:text-white'
                }`}
                title="Capture complete scrolling webpage from top to bottom"
            >
                <ScrollText size={14} className="text-emerald-500" />
                <span>Full Page</span>
            </button>

            <div className={`w-px h-5 mx-1 ${isBright ? 'bg-black/10' : 'bg-white/10'}`} />

            <button
                onClick={() => setIsScreenshotBarOpen(false)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                    isBright ? 'hover:bg-black/5 text-zinc-400 hover:text-red-500' : 'hover:bg-white/10 text-white/50 hover:text-red-400'
                }`}
                title="Close (Esc)"
            >
                <X size={14} />
            </button>
        </div>
    );
}
