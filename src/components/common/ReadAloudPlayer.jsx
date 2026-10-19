import React, { useState, useEffect, useRef } from 'react';
import { 
    Volume2, VolumeX, Play, Pause, Square, SkipBack, SkipForward, 
    X, ChevronDown, Sparkles, Sliders, Type, FastForward
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function ReadAloudPlayer() {
    const isReadAloudOpen = useUIStore(state => state.isReadAloudOpen);
    const closeReadAloud = useUIStore(state => state.closeReadAloud);
    const showToast = useUIStore(state => state.showToast);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [paragraphs, setParagraphs] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [articleTitle, setArticleTitle] = useState('Current Page');
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [voices, setVoices] = useState([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const utteranceRef = useRef(null);
    const currentIndexRef = useRef(0);
    currentIndexRef.current = currentIndex;
    const paragraphsRef = useRef([]);
    paragraphsRef.current = paragraphs;

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

    const handleStop = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        setIsPlaying(false);
        setIsPaused(false);
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

    const handleVoiceSelect = (uri) => {
        setSelectedVoiceURI(uri);
        setIsVoiceDropdownOpen(false);
        if (isPlaying && !isPaused) {
            const list = paragraphsRef.current;
            startSpeakingParagraph(list[currentIndexRef.current], currentIndexRef.current, list);
        }
    };

    if (!isReadAloudOpen) return null;

    const currentParagraphSnippet = paragraphs[currentIndex] 
        ? paragraphs[currentIndex].slice(0, 110) + (paragraphs[currentIndex].length > 110 ? '…' : '')
        : 'Loading readable text…';

    const selectedVoiceObj = voices.find(v => v.voiceURI === selectedVoiceURI);

    return (
        <div 
            id="read-aloud-player"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[160] flex flex-col items-center animate-tab-fade pointer-events-auto"
        >
            <div className="bg-[#0b0c10]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl p-2.5 px-4 flex items-center gap-3 text-white">
                {/* Visual Status Wave */}
                <div className="flex items-center gap-2.5 pr-2 border-r border-white/10">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isPlaying && !isPaused ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30 animate-pulse' : 'bg-white/5 text-white/50 border border-white/5'}`}>
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </div>
                    <div className="max-w-[180px] sm:max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-accent truncate">
                                {articleTitle}
                            </span>
                            {paragraphs.length > 0 && (
                                <span className="text-[9px] font-mono text-white/40">
                                    [{currentIndex + 1}/{paragraphs.length}]
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-white/70 truncate leading-tight mt-0.5" title={paragraphs[currentIndex]}>
                            {currentParagraphSnippet}
                        </p>
                    </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        title="Previous paragraph"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <SkipBack size={14} />
                    </button>

                    <button
                        onClick={handlePlayPause}
                        title={isPlaying && !isPaused ? "Pause (Space)" : "Play / Resume (Space)"}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#d4bc94] text-zinc-950 font-bold hover:bg-[#e0c8a0] transition shadow-md active:scale-95"
                    >
                        {isPlaying && !isPaused ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button
                        onClick={handleStop}
                        title="Stop reading"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition active:scale-95"
                    >
                        <Square size={13} />
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= paragraphs.length - 1}
                        title="Next paragraph"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <SkipForward size={14} />
                    </button>
                </div>

                {/* Speed Dropdown Selector */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setIsSpeedDropdownOpen(!isSpeedDropdownOpen);
                            setIsVoiceDropdownOpen(false);
                        }}
                        title="Playback speed"
                        className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-mono text-white/80 hover:text-white flex items-center gap-1 transition"
                    >
                        <span>{playbackSpeed}x</span>
                        <ChevronDown size={11} className="text-white/40" />
                    </button>

                    {isSpeedDropdownOpen && (
                        <div className="absolute top-full mt-2 left-0 bg-[#12131a] border border-white/10 rounded-xl p-1 shadow-2xl z-50 flex flex-col min-w-[70px]">
                            {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                                <button
                                    key={spd}
                                    onClick={() => handleSpeedChange(spd)}
                                    className={`px-2 py-1 text-[11px] font-mono rounded-lg text-left transition ${playbackSpeed === spd ? 'bg-[#d4bc94] text-zinc-950 font-bold' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                                >
                                    {spd}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Voice Selection Dropdown */}
                {voices.length > 0 && (
                    <div className="relative hidden md:block">
                        <button
                            onClick={() => {
                                setIsVoiceDropdownOpen(!isVoiceDropdownOpen);
                                setIsSpeedDropdownOpen(false);
                            }}
                            title="Select voice"
                            className="h-7 max-w-[130px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-white/80 hover:text-white flex items-center gap-1.5 transition truncate"
                        >
                            <span className="truncate">{selectedVoiceObj ? selectedVoiceObj.name.replace(/Google|Microsoft/gi, '').trim() : 'Voice'}</span>
                            <ChevronDown size={11} className="text-white/40 flex-shrink-0" />
                        </button>

                        {isVoiceDropdownOpen && (
                            <div className="absolute top-full mt-2 right-0 bg-[#12131a] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 flex flex-col max-h-56 overflow-y-auto w-56 scrollbar-thin">
                                {voices.slice(0, 20).map((v) => (
                                    <button
                                        key={v.voiceURI}
                                        onClick={() => handleVoiceSelect(v.voiceURI)}
                                        className={`px-2 py-1.5 text-[11px] rounded-lg text-left truncate transition ${selectedVoiceURI === v.voiceURI ? 'bg-[#d4bc94] text-zinc-950 font-bold' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                                        title={`${v.name} (${v.lang})`}
                                    >
                                        <div className="font-medium truncate">{v.name}</div>
                                        <div className="text-[9px] opacity-60 font-mono">{v.lang}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Mute Button */}
                <button
                    onClick={() => {
                        const next = !isMuted;
                        setIsMuted(next);
                        if (utteranceRef.current) {
                            utteranceRef.current.volume = next ? 0 : 1;
                        }
                    }}
                    title={isMuted ? "Unmute" : "Mute"}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
                >
                    {isMuted ? <VolumeX size={13} className="text-rose-400" /> : <Volume2 size={13} />}
                </button>

                {/* Close Button */}
                <button
                    onClick={closeReadAloud}
                    title="Close Read Aloud (Alt+R)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition ml-1"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
