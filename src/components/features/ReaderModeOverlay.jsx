import React, { useState, useEffect, useRef } from 'react';
import useUIStore from '../../store/useUIStore';
import { 
    X, ArrowLeft, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, 
    Type, BookOpen, Clock, Globe, ExternalLink, RotateCcw, ChevronDown, Check
} from 'lucide-react';

const THEMES = {
    dark: {
        id: 'dark',
        name: 'Dark',
        bg: '#0f0f12',
        card: '#18181c',
        text: '#f4f4f5',
        muted: '#a1a1aa',
        border: 'rgba(255, 255, 255, 0.08)',
        dot: '#18181c',
        ring: '#ffffff',
        accent: '#d4bc94',
        themeClass: 'reader-theme-dark'
    },
    sepia: {
        id: 'sepia',
        name: 'Sepia',
        bg: '#f5ede0',
        card: '#ede2d0',
        text: '#32271d',
        muted: '#786554',
        border: 'rgba(0, 0, 0, 0.08)',
        dot: '#f5ede0',
        ring: '#b45309',
        accent: '#b45309',
        themeClass: 'reader-theme-sepia'
    },
    light: {
        id: 'light',
        name: 'Light',
        bg: '#ffffff',
        card: '#f4f4f5',
        text: '#18181b',
        muted: '#71717a',
        border: 'rgba(0, 0, 0, 0.08)',
        dot: '#ffffff',
        ring: '#3b82f6',
        accent: '#3b82f6',
        themeClass: 'reader-theme-light'
    },
    midnight: {
        id: 'midnight',
        name: 'Midnight',
        bg: '#0d1117',
        card: '#161b22',
        text: '#f0f6fc',
        muted: '#8b949e',
        border: 'rgba(255, 255, 255, 0.08)',
        dot: '#161b22',
        ring: '#38bdf8',
        accent: '#38bdf8',
        themeClass: 'reader-theme-midnight'
    }
};

const FONTS = {
    serif: { id: 'serif', label: 'Serif', cssClass: 'font-serif', style: { fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' } },
    sans: { id: 'sans', label: 'Sans', cssClass: 'font-sans', style: { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } },
    mono: { id: 'mono', label: 'Mono', cssClass: 'font-mono', style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' } },
    dyslexic: { id: 'dyslexic', label: 'Dyslexic', cssClass: 'font-sans', style: { fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em', wordSpacing: '0.12em', lineHeight: '2.1' } }
};

const WIDTHS = {
    compact: { id: 'compact', label: 'Compact', maxWidth: 'max-w-[620px]' },
    balanced: { id: 'balanced', label: 'Balanced', maxWidth: 'max-w-[740px]' },
    wide: { id: 'wide', label: 'Wide', maxWidth: 'max-w-[920px]' }
};

export default function ReaderModeOverlay() {
    const isReaderOpen = useUIStore(state => state.isReaderOpen);
    const isReaderClosing = useUIStore(state => state.isReaderClosing);
    const closeReaderMode = useUIStore(state => state.closeReaderMode);
    const article = useUIStore(state => state.readerArticle);
    const settings = useUIStore(state => state.settings);
    const setReaderSetting = useUIStore(state => state.setReaderSetting);

    // Preferences
    const currentThemeKey = settings?.readerTheme || 'dark';
    const currentTheme = THEMES[currentThemeKey] || THEMES.dark;
    const currentFontKey = settings?.readerFont || 'serif';
    const currentFont = FONTS[currentFontKey] || FONTS.serif;
    const currentFontSize = settings?.readerFontSize || 18;
    const currentWidthKey = settings?.readerWidth || 'balanced';
    const currentWidth = WIDTHS[currentWidthKey] || WIDTHS.balanced;

    // TTS Read Aloud Audio State
    const [isAudioBarOpen, setIsAudioBarOpen] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
    const [speechRate, setSpeechRate] = useState(1.0);
    const [voices, setVoices] = useState([]);
    const [selectedVoiceUri, setSelectedVoiceUri] = useState('');
    const [showVoicePicker, setShowVoicePicker] = useState(false);

    const articleBodyRef = useRef(null);
    const activeUtteranceRef = useRef(null);
    const ttsBlocks = article?.ttsBlocks || [];

    // Load available speech synthesis voices
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const updateVoices = () => {
            const list = window.speechSynthesis.getVoices();
            if (list && list.length > 0) {
                setVoices(list);
                // Prefer English voice or natural voice as default
                if (!selectedVoiceUri) {
                    const preferred = list.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online'))) ||
                                      list.find(v => v.lang.startsWith('en')) || list[0];
                    if (preferred) setSelectedVoiceUri(preferred.voiceURI);
                }
            }
        };

        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    // Stop speech synthesis and highlight on close or unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try { window.speechSynthesis.cancel(); } catch (_) {}
            }
        };
    }, []);

    // Global keyboard shortcuts (Esc to close, Space to toggle TTS play/pause if audio bar open)
    useEffect(() => {
        if (!isReaderOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeReaderMode();
            } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
                e.preventDefault();
                closeReaderMode();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isReaderOpen, closeReaderMode]);

    // Highlighting current TTS block and smooth auto-scroll
    useEffect(() => {
        if (!isReaderOpen) return;

        // Remove previous active highlights
        const prevActives = document.querySelectorAll('.reader-tts-active');
        prevActives.forEach(el => el.classList.remove('reader-tts-active'));

        if (!isAudioBarOpen || currentBlockIndex < 0 || currentBlockIndex >= ttsBlocks.length) return;

        const blockId = ttsBlocks[currentBlockIndex]?.id;
        if (!blockId) return;

        const targetEl = document.querySelector(`[data-tts-id="${blockId}"]`);
        if (targetEl) {
            targetEl.classList.add('reader-tts-active');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentBlockIndex, isAudioBarOpen, isReaderOpen, ttsBlocks]);

    // Read specific block index
    const speakBlock = (index) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();

        if (index < 0 || index >= ttsBlocks.length) {
            setIsSpeaking(false);
            setIsPaused(false);
            setCurrentBlockIndex(0);
            return;
        }

        const block = ttsBlocks[index];
        if (!block || !block.text) {
            // Skip empty block
            speakBlock(index + 1);
            return;
        }

        setCurrentBlockIndex(index);
        setIsSpeaking(true);
        setIsPaused(false);

        const utterance = new SpeechSynthesisUtterance(block.text);
        utterance.rate = speechRate;
        utterance.pitch = 1.0;

        if (selectedVoiceUri) {
            const chosen = voices.find(v => v.voiceURI === selectedVoiceUri);
            if (chosen) utterance.voice = chosen;
        }

        utterance.onend = () => {
            if (index + 1 < ttsBlocks.length) {
                speakBlock(index + 1);
            } else {
                setIsSpeaking(false);
                setIsPaused(false);
                setCurrentBlockIndex(0);
            }
        };

        utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.warn('[Reader TTS] Utterance error:', e);
            }
            setIsSpeaking(false);
            setIsPaused(false);
        };

        activeUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const handlePlayPause = () => {
        if (!window.speechSynthesis) return;

        if (isSpeaking) {
            if (isPaused) {
                window.speechSynthesis.resume();
                setIsPaused(false);
            } else {
                window.speechSynthesis.pause();
                setIsPaused(true);
            }
        } else {
            speakBlock(currentBlockIndex || 0);
        }
    };

    const handleSkipPrev = () => {
        const prev = Math.max(0, currentBlockIndex - 1);
        speakBlock(prev);
    };

    const handleSkipNext = () => {
        const next = Math.min(ttsBlocks.length - 1, currentBlockIndex + 1);
        speakBlock(next);
    };

    const handleStopAudio = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsPaused(false);
        setIsAudioBarOpen(false);
        const prevActives = document.querySelectorAll('.reader-tts-active');
        prevActives.forEach(el => el.classList.remove('reader-tts-active'));
    };

    const handleCycleSpeed = () => {
        const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
        const nextIdx = (speeds.indexOf(speechRate) + 1) % speeds.length;
        const newSpeed = speeds[nextIdx];
        setSpeechRate(newSpeed);
        if (isSpeaking && !isPaused) {
            speakBlock(currentBlockIndex);
        }
    };

    // Click on any paragraph inside the article to jump TTS narration directly to it
    const handleArticleClick = (e) => {
        const target = e.target.closest('[data-tts-id]');
        if (!target) return;

        const blockId = target.getAttribute('data-tts-id');
        const blockIdx = ttsBlocks.findIndex(b => b.id === blockId);
        if (blockIdx !== -1) {
            setIsAudioBarOpen(true);
            speakBlock(blockIdx);
        }
    };

    if ((!isReaderOpen && !isReaderClosing) || !article) return null;

    return (
        <div 
            className={`absolute inset-0 z-[65] flex flex-col overflow-hidden select-text transition-colors duration-300 ${
                isReaderClosing ? 'animate-reader-exit pointer-events-none' : 'animate-reader-enter'
            } ${currentTheme.themeClass}`}
            style={{ 
                backgroundColor: currentTheme.bg,
                color: currentTheme.text
            }}
        >
            {/* Top Reader Toolbar */}
            <header 
                className="w-full flex-shrink-0 border-b backdrop-blur-2xl transition-colors duration-300 z-20 px-4 md:px-8 py-3 flex items-center justify-between gap-3 shadow-sm"
                style={{ 
                    backgroundColor: currentTheme.card,
                    borderColor: currentTheme.border 
                }}
            >
                {/* Left: Back / Exit Button & Domain */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={closeReaderMode}
                        className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer active:scale-95 flex-shrink-0"
                        style={{ 
                            backgroundColor: `${currentTheme.bg}80`, 
                            borderColor: currentTheme.border,
                            color: currentTheme.text 
                        }}
                        title="Exit Reader Mode (Esc / Ctrl+Alt+R)"
                    >
                        <ArrowLeft size={14} />
                        <span className="hidden sm:inline">Back to Webpage</span>
                    </button>

                    {article.siteName && (
                        <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="hidden md:flex items-center gap-1.5 text-xs font-medium truncate opacity-60 hover:opacity-100 transition"
                            style={{ color: currentTheme.text }}
                            title={`Open original: ${article.url}`}
                        >
                            <Globe size={13} />
                            <span className="truncate max-w-[200px]">{article.siteName}</span>
                            <ExternalLink size={11} className="opacity-60" />
                        </a>
                    )}
                </div>

                {/* Right: Customization Controls (Themes, Fonts, Size, Width, Read Aloud) */}
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    
                    {/* Read Aloud Trigger */}
                    <button
                        type="button"
                        onClick={() => {
                            if (!isAudioBarOpen) {
                                setIsAudioBarOpen(true);
                                speakBlock(currentBlockIndex || 0);
                            } else {
                                handleStopAudio();
                            }
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${isAudioBarOpen ? 'shadow-md' : 'opacity-80 hover:opacity-100'}`}
                        style={{ 
                            backgroundColor: isAudioBarOpen ? currentTheme.accent : `${currentTheme.bg}80`,
                            color: isAudioBarOpen ? '#000000' : currentTheme.text,
                            borderColor: isAudioBarOpen ? currentTheme.accent : currentTheme.border
                        }}
                        title={isAudioBarOpen ? 'Hide Audio Player' : 'Listen to Article (Read Aloud)'}
                    >
                        <Volume2 size={14} className={isSpeaking && !isPaused ? 'animate-pulse' : ''} />
                        <span className="hidden sm:inline">{isAudioBarOpen ? 'Listening' : 'Read Aloud'}</span>
                    </button>

                    <div className="w-[1px] h-5 bg-white/10 mx-0.5 hidden sm:block" />

                    {/* Theme Selector Circles */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}80` }}>
                        {Object.values(THEMES).map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setReaderSetting('readerTheme', t.id)}
                                className={`w-5 h-5 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${currentThemeKey === t.id ? 'scale-110 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                                style={{ 
                                    backgroundColor: t.bg,
                                    borderColor: currentThemeKey === t.id ? t.ring : 'rgba(128,128,128,0.3)'
                                }}
                                title={`${t.name} Theme`}
                            >
                                {currentThemeKey === t.id && (
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.ring }} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Font Family Selector */}
                    <div className="flex items-center rounded-xl border p-0.5 text-xs font-semibold" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}80` }}>
                        {Object.values(FONTS).map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setReaderSetting('readerFont', f.id)}
                                className={`px-2 py-1 rounded-lg transition cursor-pointer ${currentFontKey === f.id ? 'shadow-sm font-bold' : 'opacity-60 hover:opacity-100'}`}
                                style={{ 
                                    backgroundColor: currentFontKey === f.id ? currentTheme.card : 'transparent',
                                    color: currentTheme.text 
                                }}
                                title={`Use ${f.label} Font`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Font Size Stepper */}
                    <div className="flex items-center rounded-xl border p-0.5 text-xs font-bold" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}80` }}>
                        <button
                            type="button"
                            onClick={() => setReaderSetting('readerFontSize', Math.max(14, currentFontSize - 2))}
                            className="px-2 py-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer active:scale-95"
                            style={{ color: currentTheme.text }}
                            title="Decrease text size"
                        >
                            A-
                        </button>
                        <span className="px-1 text-[11px] font-mono opacity-50 select-none">
                            {currentFontSize}
                        </span>
                        <button
                            type="button"
                            onClick={() => setReaderSetting('readerFontSize', Math.min(28, currentFontSize + 2))}
                            className="px-2 py-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer active:scale-95"
                            style={{ color: currentTheme.text }}
                            title="Increase text size"
                        >
                            A+
                        </button>
                    </div>

                    {/* Column Width */}
                    <div className="hidden lg:flex items-center rounded-xl border p-0.5 text-xs font-semibold" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}80` }}>
                        {Object.values(WIDTHS).map(w => (
                            <button
                                key={w.id}
                                type="button"
                                onClick={() => setReaderSetting('readerWidth', w.id)}
                                className={`px-2 py-1 rounded-lg transition cursor-pointer ${currentWidthKey === w.id ? 'shadow-sm font-bold' : 'opacity-60 hover:opacity-100'}`}
                                style={{ 
                                    backgroundColor: currentWidthKey === w.id ? currentTheme.card : 'transparent',
                                    color: currentTheme.text 
                                }}
                                title={`${w.label} Column Width`}
                            >
                                {w.label}
                            </button>
                        ))}
                    </div>

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={closeReaderMode}
                        className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 transition cursor-pointer active:scale-95"
                        style={{ 
                            backgroundColor: `${currentTheme.bg}80`, 
                            borderColor: currentTheme.border,
                            color: currentTheme.text 
                        }}
                        title="Close Reader Mode"
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            {/* Scrollable Reader Article Canvas */}
            <div 
                className="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-16 flex flex-col items-center custom-scrollbar scroll-smooth"
                onClick={handleArticleClick}
            >
                <article 
                    className={`w-full ${currentWidth.maxWidth} transition-all duration-300`}
                    style={{
                        ...currentFont.style,
                        fontSize: `${currentFontSize}px`
                    }}
                >
                    {/* Article Header Metadata */}
                    <header className="mb-8 pb-6 border-b" style={{ borderColor: currentTheme.border }}>
                        <h1 
                            className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4"
                            style={{ color: currentTheme.text }}
                        >
                            {article.title}
                        </h1>

                        <div 
                            className="flex flex-wrap items-center gap-3 text-xs font-medium"
                            style={{ color: currentTheme.muted }}
                        >
                            {article.byline && (
                                <span className="font-semibold text-sm" style={{ color: currentTheme.text }}>
                                    By {article.byline}
                                </span>
                            )}

                            {article.byline && article.siteName && <span>•</span>}

                            {article.siteName && (
                                <span className="font-semibold">{article.siteName}</span>
                            )}

                            {(article.byline || article.siteName) && <span>•</span>}

                            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-mono" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.card }}>
                                <Clock size={11} />
                                <span>{article.readingTimeMinutes} min read</span>
                            </div>

                            <span className="text-[11px] font-mono opacity-60">
                                {article.wordCount.toLocaleString()} words
                            </span>
                        </div>
                    </header>

                    {/* Optional Hero Image */}
                    {article.leadImageUrl && (
                        <figure className="mb-10 overflow-hidden rounded-2xl border shadow-xl" style={{ borderColor: currentTheme.border }}>
                            <img 
                                src={article.leadImageUrl} 
                                alt={article.title}
                                className="w-full h-auto max-h-[460px] object-cover"
                                loading="lazy"
                            />
                        </figure>
                    )}

                    {/* Article Body Content with Annotated TTS Blocks */}
                    <div 
                        ref={articleBodyRef}
                        className="reader-content select-text transition-all duration-300 leading-relaxed"
                        style={{ color: currentTheme.text }}
                        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
                    />
                </article>
            </div>

            {/* Floating TTS Audio Player Bar */}
            {isAudioBarOpen && (
                <div className="absolute bottom-6 inset-x-0 flex justify-center px-4 pointer-events-none z-30 animate-pop-in">
                    <div 
                        className="pointer-events-auto flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl transition-all duration-300"
                        style={{ 
                            backgroundColor: `${currentTheme.card}f0`,
                            borderColor: currentTheme.border,
                            color: currentTheme.text
                        }}
                    >
                        {/* Skip Prev */}
                        <button
                            type="button"
                            onClick={handleSkipPrev}
                            disabled={currentBlockIndex <= 0}
                            className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition cursor-pointer active:scale-95"
                            title="Previous paragraph"
                        >
                            <SkipBack size={16} />
                        </button>

                        {/* Play / Pause Main Button */}
                        <button
                            type="button"
                            onClick={handlePlayPause}
                            className="p-3 rounded-xl transition shadow-md cursor-pointer active:scale-95 flex items-center justify-center"
                            style={{ 
                                backgroundColor: currentTheme.accent,
                                color: '#000000'
                            }}
                            title={isSpeaking && !isPaused ? 'Pause' : 'Play'}
                        >
                            {isSpeaking && !isPaused ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" className="ml-0.5" />}
                        </button>

                        {/* Skip Next */}
                        <button
                            type="button"
                            onClick={handleSkipNext}
                            disabled={currentBlockIndex >= ttsBlocks.length - 1}
                            className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition cursor-pointer active:scale-95"
                            title="Next paragraph"
                        >
                            <SkipForward size={16} />
                        </button>

                        {/* Paragraph Progress Badge */}
                        <div className="flex flex-col min-w-[110px] text-left">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-50">
                                Audio Narration
                            </span>
                            <span className="text-xs font-mono font-semibold">
                                Block {currentBlockIndex + 1} of {Math.max(1, ttsBlocks.length)}
                            </span>
                        </div>

                        <div className="w-[1px] h-6 bg-white/10" />

                        {/* Speed Toggle */}
                        <button
                            type="button"
                            onClick={handleCycleSpeed}
                            className="px-2.5 py-1 rounded-xl border text-xs font-mono font-bold hover:bg-white/10 transition cursor-pointer active:scale-95"
                            style={{ borderColor: currentTheme.border }}
                            title="Change narration speed"
                        >
                            {speechRate}x
                        </button>

                        {/* Voice Picker Dropdown Toggle */}
                        {voices.length > 0 && (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowVoicePicker(!showVoicePicker)}
                                    className="px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:bg-white/10 transition cursor-pointer"
                                    style={{ borderColor: currentTheme.border }}
                                    title="Select voice"
                                >
                                    <span className="truncate max-w-[100px] hidden sm:inline">
                                        {voices.find(v => v.voiceURI === selectedVoiceUri)?.name || 'Voice'}
                                    </span>
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${showVoicePicker ? 'rotate-180' : ''}`} />
                                </button>

                                {showVoicePicker && (
                                    <div 
                                        className="absolute bottom-full mb-2 right-0 w-64 max-h-56 overflow-y-auto rounded-xl border shadow-2xl p-1 flex flex-col gap-0.5 custom-scrollbar backdrop-blur-3xl z-40"
                                        style={{ 
                                            backgroundColor: currentTheme.card,
                                            borderColor: currentTheme.border 
                                        }}
                                    >
                                        <p className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 opacity-50">System Voices</p>
                                        {voices.map(v => (
                                            <button
                                                key={v.voiceURI}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedVoiceUri(v.voiceURI);
                                                    setShowVoicePicker(false);
                                                    if (isSpeaking) speakBlock(currentBlockIndex);
                                                }}
                                                className={`px-2 py-1.5 rounded-lg text-left text-xs transition flex items-center justify-between cursor-pointer ${selectedVoiceUri === v.voiceURI ? 'bg-accent/20 text-accent font-bold' : 'hover:bg-white/10'}`}
                                            >
                                                <span className="truncate mr-2">{v.name}</span>
                                                <span className="text-[10px] font-mono opacity-50">{v.lang}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Close Audio Bar */}
                        <button
                            type="button"
                            onClick={handleStopAudio}
                            className="p-1.5 rounded-xl hover:bg-white/10 opacity-60 hover:opacity-100 transition cursor-pointer active:scale-95"
                            title="Stop & Close Narration"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
