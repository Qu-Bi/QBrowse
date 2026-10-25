import React, { useState, useEffect, useRef } from 'react';
import { 
    Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, 
    X, ChevronDown, GripVertical
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function ReadAloudPlayer() {
    const isReadAloudOpen = useUIStore(state => state.isReadAloudOpen);
    const isReadAloudClosing = useUIStore(state => state.isReadAloudClosing);
    const closeReadAloud = useUIStore(state => state.closeReadAloud);
    const isFindOpen = useUIStore(state => state.isFindOpen);
    const isScreenshotBarOpen = useUIStore(state => state.isScreenshotBarOpen);
    const showToast = useUIStore(state => state.showToast);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [paragraphs, setParagraphs] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [articleTitle, setArticleTitle] = useState('Read Aloud');
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [voices, setVoices] = useState([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Draggable & Centering State
    const [position, setPosition] = useState(null); // { x: number, y: number }
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, parentWidth: 0, parentHeight: 0, playerWidth: 0, playerHeight: 0 });
    const hasUserDraggedRef = useRef(false);
    const playerRef = useRef(null);

    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const utteranceRef = useRef(null);
    const currentIndexRef = useRef(0);
    currentIndexRef.current = currentIndex;
    const paragraphsRef = useRef([]);
    paragraphsRef.current = paragraphs;

    // Position player at top-center in the webview container by default on popup
    useEffect(() => {
        if (!isReadAloudOpen) {
            setPosition(null);
            setIsDragging(false);
            hasUserDraggedRef.current = false;
            return;
        }

        const positionTopCenter = () => {
            const node = playerRef.current;
            if (!node) return;
            const parent = node.offsetParent || node.parentElement;
            if (!parent) return;

            const parentRect = parent.getBoundingClientRect();
            const playerRect = node.getBoundingClientRect();

            const x = Math.max(12, Math.round((parentRect.width - playerRect.width) / 2));
            const y = 20; // Top center by default (20px from container top)
            setPosition({ x, y });
        };

        const timer = setTimeout(positionTopCenter, 0);

        const handleResize = () => {
            if (!hasUserDraggedRef.current) {
                positionTopCenter();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [isReadAloudOpen]);

    // Drag handlers
    const handleMouseDown = (e) => {
        // Do not drag if user clicked an interactive button or control
        if (e.target.closest('button, input, select, [role="button"]')) {
            return;
        }
        if (e.button !== 0) return; // Left click only

        e.preventDefault();
        const node = playerRef.current;
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const parent = node.offsetParent || node.parentElement;
        const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

        const currentX = position ? position.x : (rect.left - parentRect.left);
        const currentY = position ? position.y : (rect.top - parentRect.top);

        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: currentX,
            initialY: currentY,
            parentWidth: parentRect.width,
            parentHeight: parentRect.height,
            playerWidth: rect.width,
            playerHeight: rect.height,
        };

        hasUserDraggedRef.current = true;
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const { startX, startY, initialX, initialY, parentWidth, parentHeight, playerWidth, playerHeight } = dragRef.current;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Clamped within container bounds with 12px padding
            const minX = 12;
            const maxX = Math.max(minX, parentWidth - playerWidth - 12);
            const minY = 12;
            const maxY = Math.max(minY, parentHeight - playerHeight - 12);

            const newX = Math.max(minX, Math.min(maxX, initialX + deltaX));
            const newY = Math.max(minY, Math.min(maxY, initialY + deltaY));

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Load available Web Speech API voices
    useEffect(() => {
        if (!synthRef.current) return;
        const loadVoices = () => {
            const avail = synthRef.current.getVoices() || [];
            if (avail.length > 0) {
                setVoices(avail);
                if (!selectedVoiceURI) {
                    const defaultVoice = avail.find(v => v.default) || avail[0];
                    if (defaultVoice) setSelectedVoiceURI(defaultVoice.voiceURI);
                }
            }
        };

        loadVoices();
        if (synthRef.current.onvoiceschanged !== undefined) {
            synthRef.current.onvoiceschanged = loadVoices;
        }
    }, [selectedVoiceURI]);

    // Request text from active webview when player opens
    useEffect(() => {
        if (!isReadAloudOpen) {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
            setIsPlaying(false);
            setIsPaused(false);
            return;
        }

        // Listener for extracted text from active webview
        const handleExtractedText = (e) => {
            const data = e.detail;
            if (data && data.paragraphs && data.paragraphs.length > 0) {
                setParagraphs(data.paragraphs);
                setArticleTitle(data.title || 'Page Content');
                setCurrentIndex(0);
                startSpeakingParagraph(data.paragraphs[0], 0, data.paragraphs);
            } else {
                const fallback = ['No readable paragraph content detected on this page.'];
                setParagraphs(fallback);
                setCurrentIndex(0);
                startSpeakingParagraph(fallback[0], 0, fallback);
            }
        };

        window.addEventListener('qbrowse-extracted-tts-text', handleExtractedText);

        // Dispatch request to active webview
        window.dispatchEvent(new CustomEvent('qbrowse-request-tts-extraction'));

        // Fallback timer if webview doesn't respond (e.g., on internal newtab page)
        const timeout = setTimeout(() => {
            if (paragraphsRef.current.length === 0) {
                const fallback = ['QBrowse Read Aloud is ready. Select text or navigate to any web article to begin reading.'];
                setParagraphs(fallback);
                setCurrentIndex(0);
                setArticleTitle('QBrowse Assistant');
                startSpeakingParagraph(fallback[0], 0, fallback);
            }
        }, 1200);

        return () => {
            window.removeEventListener('qbrowse-extracted-tts-text', handleExtractedText);
            clearTimeout(timeout);
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, [isReadAloudOpen]);

    // Keyboard shortcuts (Escape to close, Space to toggle play/pause when not in input)
    useEffect(() => {
        if (!isReadAloudOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeReadAloud();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isReadAloudOpen, closeReadAloud]);

    const startSpeakingParagraph = (text, index, parasList = paragraphs) => {
        if (!synthRef.current || !text) return;
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = playbackSpeed;
        utterance.volume = isMuted ? 0 : 1;

        if (selectedVoiceURI && voices.length > 0) {
            const chosen = voices.find(v => v.voiceURI === selectedVoiceURI);
            if (chosen) utterance.voice = chosen;
        }

        utterance.onstart = () => {
            setIsPlaying(true);
            setIsPaused(false);
        };

        utterance.onend = () => {
            const nextIdx = index + 1;
            if (nextIdx < parasList.length) {
                setCurrentIndex(nextIdx);
                startSpeakingParagraph(parasList[nextIdx], nextIdx, parasList);
            } else {
                setIsPlaying(false);
                setIsPaused(false);
                showToast('Finished reading article.');
            }
        };

        utterance.onerror = (err) => {
            if (err.error !== 'interrupted' && err.error !== 'canceled') {
                console.warn('[ReadAloud] Speech error:', err);
                setIsPlaying(false);
                setIsPaused(false);
            }
        };

        utteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    };

    const handlePlayPause = () => {
        if (!synthRef.current) return;

        if (isPlaying && !isPaused) {
            synthRef.current.pause();
            setIsPaused(true);
        } else if (isPaused) {
            synthRef.current.resume();
            setIsPaused(false);
        } else {
            const list = paragraphsRef.current;
            if (list.length > 0) {
                startSpeakingParagraph(list[currentIndexRef.current], currentIndexRef.current, list);
            }
        }
    };

    const handleNext = () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < paragraphs.length) {
            setCurrentIndex(nextIdx);
            startSpeakingParagraph(paragraphs[nextIdx], nextIdx, paragraphs);
        }
    };

    const handlePrev = () => {
        const prevIdx = Math.max(0, currentIndex - 1);
        setCurrentIndex(prevIdx);
        startSpeakingParagraph(paragraphs[prevIdx], prevIdx, paragraphs);
    };

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        setIsSpeedDropdownOpen(false);
        if (isPlaying && !isPaused) {
            const list = paragraphsRef.current;
            startSpeakingParagraph(list[currentIndexRef.current], currentIndexRef.current, list);
        }
    };

    if (!isReadAloudOpen && !isReadAloudClosing) return null;

    const isNearBottom = position && position.y > (dragRef.current.parentHeight || 500) - 170;

    return (
        <>
            {/* Fullscreen transparent mouse trap during dragging so underlying webview cannot swallow pointer focus */}
            {isDragging && (
                <div className="fixed inset-0 z-[99999] cursor-grabbing select-none bg-transparent" />
            )}

            <div 
                ref={playerRef}
                id="read-aloud-player"
                onMouseDown={handleMouseDown}
                style={{ 
                    position: 'absolute',
                    top: position ? `${position.y}px` : '20px',
                    left: position ? `${position.x}px` : 'calc(50% - 175px)',
                    backdropFilter: 'blur(28px) saturate(180%)', 
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)' 
                }}
                className={`z-[60] flex items-center h-11 px-3.5 gap-2 backdrop-blur-2xl rounded-full select-none border transition-shadow cursor-grab active:cursor-grabbing ${
                    isDragging ? 'shadow-[0_25px_60px_rgba(0,0,0,0.8)] ring-2 ring-accent/40' : ''
                } ${
                    isBright 
                        ? 'bg-white/90 border-black/[0.06] text-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.12)]' 
                        : 'bg-[#181a24]/80 border-white/[0.08] text-white/90 shadow-[0_16px_40px_rgba(0,0,0,0.55)]'
                } ${
                    isReadAloudClosing ? 'animate-slide-up-fade-out pointer-events-none' : (position ? '' : 'animate-pop-in')
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Grip Handle */}
                <GripVertical size={13} className="text-white/30 hover:text-white/60 transition-colors shrink-0 cursor-grab active:cursor-grabbing -ml-1 mr-0.5" title="Drag to move" />

                {/* Status Icon */}
                <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                    <Volume2 size={13} className={isPlaying && !isPaused ? 'text-accent animate-pulse' : (isBright ? 'text-zinc-600' : 'text-accent')} />
                </div>

                {/* Title & Counter */}
                <div className="flex items-center gap-1.5 max-w-[140px] sm:max-w-[200px] truncate text-left pr-1">
                    <span className={`text-xs font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                        {articleTitle}
                    </span>
                    {paragraphs.length > 0 && (
                        <span className={`text-[10px] font-mono shrink-0 ${isBright ? 'text-zinc-500 font-bold' : 'text-white/60 font-bold'}`}>
                            {currentIndex + 1}/{paragraphs.length}
                        </span>
                    )}
                </div>

                {/* Subtle Divider */}
                <div className={`w-[1px] h-4 ${isBright ? 'bg-black/10' : 'bg-white/10'} shrink-0`} />

                {/* Transport Controls */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        title="Previous paragraph"
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer ${
                            isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <SkipBack size={12} />
                    </button>

                    <button
                        onClick={handlePlayPause}
                        title={isPlaying && !isPaused ? "Pause (Space)" : "Play / Resume (Space)"}
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-accent text-zinc-950 font-bold hover:brightness-110 active:scale-90 transition cursor-pointer shadow-xs shrink-0"
                    >
                        {isPlaying && !isPaused ? (
                            <Pause size={12} fill="currentColor" />
                        ) : (
                            <Play size={12} fill="currentColor" className="ml-0.5" />
                        )}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= paragraphs.length - 1}
                        title="Next paragraph"
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-20 disabled:pointer-events-none cursor-pointer ${
                            isBright ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5' : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <SkipForward size={12} />
                    </button>
                </div>

                {/* Speed Selector */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => {
                            setIsSpeedDropdownOpen(!isSpeedDropdownOpen);
                            setIsVoiceDropdownOpen(false);
                        }}
                        title="Playback speed"
                        className={`h-6 px-2 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                            isBright 
                                ? 'text-zinc-700 hover:bg-black/5' 
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <span>{playbackSpeed}x</span>
                        <ChevronDown size={10} className={`text-white/40 transition-transform duration-200 ${isSpeedDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSpeedDropdownOpen && (
                        <div 
                            style={{ 
                                backdropFilter: 'blur(28px) saturate(180%)', 
                                WebkitBackdropFilter: 'blur(28px) saturate(180%)' 
                            }}
                            className={`absolute ${isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 p-1 rounded-2xl border backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 flex flex-col min-w-[76px] animate-pop-in ${
                                isBright 
                                    ? 'bg-white/95 border-black/[0.06] text-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.12)]' 
                                    : 'bg-[#181a24]/90 border-white/[0.08] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
                            }`}
                        >
                            {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                                <button
                                    key={spd}
                                    onClick={() => handleSpeedChange(spd)}
                                    className={`px-2.5 py-1 text-[11px] font-mono rounded-xl transition text-left cursor-pointer ${
                                        playbackSpeed === spd 
                                            ? 'bg-accent text-zinc-950 font-bold' 
                                            : (isBright ? 'hover:bg-black/5 text-zinc-700' : 'hover:bg-white/10 text-white/70 hover:text-white')
                                    }`}
                                >
                                    {spd}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={closeReadAloud}
                    title="Close Read Aloud (Escape)"
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                        isBright 
                            ? 'text-zinc-400 hover:text-rose-600 hover:bg-black/5' 
                            : 'text-white/50 hover:text-rose-400 hover:bg-white/10'
                    }`}
                >
                    <X size={12} />
                </button>
            </div>
        </>
    );
}
