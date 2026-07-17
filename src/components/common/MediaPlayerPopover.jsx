import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, X } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function MediaPlayerPopover() {
    const currentUrl = useUIStore(state => state.currentUrl);
    const [mediaState, setMediaState] = useState({
        isPlaying: false,
        title: 'No media playing',
        artist: '',
        albumArt: '',
        url: ''
    });

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Disabled mockup auto-popup logic
    }, [currentUrl]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-6 right-6 z-[60000] w-80 bg-black/60 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-pop-in group transition-all duration-500 hover:shadow-[0_40px_120px_rgba(var(--accent),0.2)]">
            
            {/* Background Glow */}
            <div className="absolute -inset-10 bg-[var(--accent)] opacity-20 blur-[60px] rounded-full pointer-events-none transition-opacity duration-1000"></div>

            {/* Close Button */}
            <button onClick={() => setIsVisible(false)} className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 hover:bg-white/10 text-white/40 hover:text-white transition-colors z-20">
                <X size={12} />
            </button>

            <div className="relative p-4 flex gap-4 items-center">
                
                {/* Album Art Container */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden relative shadow-lg bg-white/5 border border-white/10 flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                    {mediaState.albumArt ? (
                        <img src={mediaState.albumArt} alt="Album Art" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--accent)]/50 bg-gradient-to-br from-white/5 to-transparent">
                            <Music size={24} />
                        </div>
                    )}
                    {mediaState.isPlaying && (
                        <div className="absolute bottom-1 right-1 flex gap-0.5 items-end h-3">
                            <div className="w-0.5 bg-[var(--accent)] rounded-t-sm h-full animate-pulse"></div>
                            <div className="w-0.5 bg-[var(--accent)] rounded-t-sm h-[60%] animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-0.5 bg-[var(--accent)] rounded-t-sm h-[80%] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="flex-1 overflow-hidden flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-white truncate drop-shadow-md">{mediaState.title}</h3>
                    <p className="text-xs text-white/50 truncate font-medium mt-0.5">{mediaState.artist || mediaState.url}</p>
                </div>

            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-6 pb-4 relative z-10">
                <button className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110">
                    <SkipBack size={18} fill="currentColor" />
                </button>
                <button 
                    onClick={() => setMediaState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
                    className="w-12 h-12 rounded-full bg-[var(--accent)] text-black flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-[0_0_20px_var(--accent-40)] active:scale-95"
                >
                    {mediaState.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <button className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110">
                    <SkipForward size={18} fill="currentColor" />
                </button>
            </div>

            {/* Progress Bar Stub */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                <div className="h-full bg-[var(--accent)] w-1/3 relative group-hover:w-1/2 transition-all duration-[3000ms] ease-linear">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_8px_rgba(255,255,255,1)] transition-opacity"></div>
                </div>
            </div>
        </div>
    );
}
