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
            style={{ 
                backdropFilter: 'blur(28px) saturate(180%)', 
                WebkitBackdropFilter: 'blur(28px) saturate(180%)' 
            }}
            className={`absolute top-5 right-7 z-[60] flex items-center gap-1.5 backdrop-blur-2xl rounded-full h-11 p-1.5 pl-2 pr-2.5 animate-slide-down-fade select-none transition-all duration-200 border ${
                isBright
                    ? 'bg-white/90 border-black/[0.06] shadow-[0_16px_40px_rgba(0,0,0,0.12)] text-zinc-900'
                    : 'bg-[#181a24]/80 border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.55)] text-white/90'
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-2 pl-1 pr-3 py-1 text-xs font-semibold border-r mr-0.5 ${
                isBright ? 'text-zinc-700 border-black/10' : 'text-white/60 border-white/10'
            }`}>
                <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
                    <Camera size={13} />
                </div>
                <span className="font-bold tracking-tight">Screenshot</span>
            </div>

            <button
                onClick={() => {
                    setIsScreenshotBarOpen(false);
                    setTimeout(() => setIsSnippingMode(true), 50);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                    isBright 
                        ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' 
                        : 'hover:bg-white/[0.08] text-white/85 hover:text-white'
                }`}
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                    isBright 
                        ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' 
                        : 'hover:bg-white/[0.08] text-white/85 hover:text-white'
                }`}
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                    isBright 
                        ? 'hover:bg-black/5 text-zinc-700 hover:text-zinc-950' 
                        : 'hover:bg-white/[0.08] text-white/85 hover:text-white'
                }`}
                title="Capture complete scrolling webpage from top to bottom"
            >
                <ScrollText size={14} className="text-emerald-400" />
                <span>Full Page</span>
            </button>

            <div className={`w-px h-4 mx-0.5 ${isBright ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />

            <button
                onClick={() => setIsScreenshotBarOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
                    isBright 
                        ? 'hover:bg-black/5 text-zinc-400 hover:text-red-500' 
                        : 'hover:bg-white/10 text-white/45 hover:text-rose-400'
                }`}
                title="Close (Esc)"
            >
                <X size={14} />
            </button>
        </div>
    );
}
