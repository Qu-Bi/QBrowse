import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, X, PictureInPicture2 } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function MediaPlayerPopover() {
    const activePopover = useUIStore(state => state.activePopover);
    const isPopoverClosing = useUIStore(state => state.isPopoverClosing);
    const closePopover = useUIStore(state => state.closePopover);
    const mediaState = useUIStore(state => state.mediaState);
    const sendMediaCommand = useUIStore(state => state.sendMediaCommand);
    const isForceDark = useUIStore(state => state.isForceDark);

    const activeTab = useTabStore(state => {
        const space = state.activeSpace;
        const tabs = space === 'personal' ? state.privateTabs : space === 'work' ? state.workTabs : state.ghostTabs;
        return tabs.find(t => t.id === mediaState.tabId) || tabs.find(t => t.active);
    });

    const isMuted = activeTab ? !!activeTab.isMuted : false;

    const handleMuteToggle = () => {
        if (activeTab) {
            useTabStore.getState().handleToggleMute(activeTab.id);
        }
        sendMediaCommand('mute-toggle');
    };

    if (activePopover !== 'media' && !isPopoverClosing) return null;

    const progressPercent = mediaState.duration > 0 
        ? Math.min(100, Math.max(0, (mediaState.currentTime / mediaState.duration) * 100))
        : 0;

    const handleSeek = (e) => {
        if (!mediaState.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.min(1, Math.max(0, clickX / rect.width));
        const seekTime = ratio * mediaState.duration;
        sendMediaCommand({ action: 'seek', time: seekTime });
    };

    return (
        <div 
            onClick={e => e.stopPropagation()}
            className={`absolute top-16 right-16 z-[70] w-80 bg-[#0d0d11]/95 backdrop-blur-2xl border border-white/12 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col text-white ${
                isPopoverClosing ? 'animate-pop-out' : 'animate-pop-in'
            }`}
        >
            {/* Header */}
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                    <Music size={14} className="text-accent" />
                    <span className="text-xs font-bold tracking-tight text-white/90">Media Control</span>
                </div>
                <button onClick={closePopover} className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer">
                    <X size={13} />
                </button>
            </div>

            {/* Media Info Section */}
            <div className="p-4 flex gap-3.5 items-center">
                {/* Album Art / Thumbnail */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden relative shadow-md bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    {mediaState.albumArt ? (
                        <img src={mediaState.albumArt} alt="Artwork" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-accent bg-accent-10">
                            <Music size={20} />
                        </div>
                    )}
                    {mediaState.isPlaying && (
                        <div className="absolute bottom-1 right-1 flex gap-0.5 items-end h-2.5 bg-black/70 p-0.5 rounded">
                            <div className="w-0.5 bg-accent rounded-t-sm h-full animate-pulse"></div>
                            <div className="w-0.5 bg-accent rounded-t-sm h-[60%] animate-pulse" style={{ animationDelay: '0.15s' }}></div>
                            <div className="w-0.5 bg-accent rounded-t-sm h-[80%] animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                    )}
                </div>

                {/* Track Metadata */}
                <div className="flex-1 overflow-hidden flex flex-col justify-center min-w-0">
                    <h3 className="text-xs font-bold text-white truncate leading-snug">
                        {mediaState.title || 'No Media Playing'}
                    </h3>
                    <p className="text-[11px] text-white/50 truncate font-medium mt-0.5">
                        {mediaState.artist || 'Play audio or video in any tab'}
                    </p>
                </div>
            </div>

            {/* Seek Bar */}
            <div className="px-4 pb-2 flex flex-col gap-1">
                <div 
                    onClick={handleSeek}
                    className="w-full h-1.5 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer relative overflow-hidden transition-all group/seek"
                >
                    <div 
                        className="h-full bg-accent rounded-full relative transition-all duration-200" 
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                {mediaState.duration > 0 && (
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/40 px-0.5">
                        <span>{formatTime(mediaState.currentTime)}</span>
                        <span>{formatTime(mediaState.duration)}</span>
                    </div>
                )}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-6 px-4 pb-4 pt-1">
                <button 
                    onClick={() => sendMediaCommand('prev-track')}
                    className="p-2 text-white/60 hover:text-white transition-transform active:scale-95 cursor-pointer"
                    title="Previous / Skip 10s"
                >
                    <SkipBack size={16} fill="currentColor" />
                </button>

                <button 
                    onClick={() => sendMediaCommand('toggle-play')}
                    className="w-10 h-10 rounded-full bg-accent hover:bg-accent/90 text-black font-bold flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-accent/20 cursor-pointer"
                    title={mediaState.isPlaying ? 'Pause' : 'Play'}
                >
                    {mediaState.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>

                <button 
                    onClick={() => sendMediaCommand('next-track')}
                    className="p-2 text-white/60 hover:text-white transition-transform active:scale-95 cursor-pointer"
                    title="Next / Skip 10s"
                >
                    <SkipForward size={16} fill="currentColor" />
                </button>

                <button 
                    onClick={handleMuteToggle}
                    className={`p-2 transition-transform active:scale-95 cursor-pointer ml-1 ${
                        isMuted ? 'text-red-400 hover:text-red-300' : 'text-white/40 hover:text-white'
                    }`}
                    title={isMuted ? "Unmute Tab Audio" : "Mute Tab Audio"}
                >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>

                <button 
                    onClick={() => sendMediaCommand('toggle-pip')}
                    className="p-2 text-white/40 hover:text-white transition-transform active:scale-95 cursor-pointer"
                    title="Toggle Picture-in-Picture (PiP)"
                >
                    <PictureInPicture2 size={15} />
                </button>
            </div>
        </div>
    );
}
