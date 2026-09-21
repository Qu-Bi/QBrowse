import React, { useState, useEffect, useRef } from 'react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { 
    X, ArrowLeft, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, 
    Type, BookOpen, Clock, Globe, ExternalLink, RotateCcw, ChevronDown, Check, Copy
} from 'lucide-react';
import { applyAnnotationsToContainer, extractPrefixAndSuffix } from '../../utils/domHighlighter';
import { useAnnotationStore, HIGHLIGHT_COLORS } from '../../store/useAnnotationStore';

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

    // In-Page Annotations State
    const activeSpace = useTabStore(state => state.activeSpace);
    const addAnnotation = useAnnotationStore(state => state.addAnnotation);
    const updateAnnotation = useAnnotationStore(state => state.updateAnnotation);
    const removeAnnotation = useAnnotationStore(state => state.removeAnnotation);
    const annotations = useAnnotationStore(state => state.annotations);

    const [floatingPill, setFloatingPill] = useState(null);
    const [activeNoteCard, setActiveNoteCard] = useState(null);
    const [noteDraftText, setNoteDraftText] = useState('');

    const handleOpenNoteCard = (id, anchorEl) => {
        setFloatingPill(null);
        const rect = anchorEl.getBoundingClientRect();
        const ann = useAnnotationStore.getState().annotations.find(a => a.id === id) || { id, note: '', color: 'accent' };
        setActiveNoteCard({
            id,
            x: Math.max(16, Math.min(rect.left, window.innerWidth - 320)),
            y: rect.bottom + 8,
            note: ann.note || '',
            color: ann.color || 'accent'
        });
        setNoteDraftText(ann.note || '');
    };

    // Re-apply annotations whenever article, URL, or annotations change
    useEffect(() => {
        if (!isReaderOpen || !articleBodyRef.current || !article?.url) return;
        const urlAnnotations = useAnnotationStore.getState().getAnnotationsForUrl(article.url, activeSpace);
        applyAnnotationsToContainer(articleBodyRef.current, urlAnnotations, handleOpenNoteCard);
    }, [isReaderOpen, article?.url, article?.contentHtml, annotations, activeSpace]);

    // Listen for text selections & clicks inside articleBodyRef
    useEffect(() => {
        if (!isReaderOpen || !articleBodyRef.current) return;

        const checkSelection = () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                setFloatingPill(null);
                return;
            }
            const text = sel.toString().trim();
            if (text.length < 2) {
                setFloatingPill(null);
                return;
            }
            const range = sel.getRangeAt(0);
            if (!articleBodyRef.current.contains(range.commonAncestorContainer)) {
                setFloatingPill(null);
                return;
            }
            const rect = range.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                setFloatingPill(null);
                return;
            }

            let top = rect.top - 46;
            if (rect.top < 54) top = rect.bottom + 8;
            const left = Math.max(16, Math.min(rect.left + (rect.width / 2) - 100, window.innerWidth - 240));

            setFloatingPill({
                x: left,
                y: top,
                range: range.cloneRange(),
                text
            });
        };

        const handleMouseUp = (e) => {
            if (e.target.closest('#reader-highlight-pill') || e.target.closest('#reader-note-card')) return;
            setTimeout(checkSelection, 20);
        };

        const handleKeyUp = (e) => {
            if (['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                setTimeout(checkSelection, 20);
            }
        };

        const el = articleBodyRef.current;
        el.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keyup', handleKeyUp);

        const handleClick = (e) => {
            const mark = e.target.closest('.qbrowse-highlight');
            if (mark) {
                const id = mark.getAttribute('data-qbrowse-id');
                if (id) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOpenNoteCard(id, mark);
                }
            }
        };
        el.addEventListener('click', handleClick);

        return () => {
            el.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keyup', handleKeyUp);
            el.removeEventListener('click', handleClick);
        };
    }, [isReaderOpen, activeSpace, article]);

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
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
                e.preventDefault();
                e.stopPropagation();
                closeReaderMode(true);
                useUIStore.getState().setIsReaderAvailable(false);
                const activeTab = useTabStore.getState().getActiveTab();
                if (activeTab) {
                    useTabStore.getState().handleCloseTab(activeTab.id);
                }
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

            {/* Floating Highlight Pill in Reader Mode */}
            {floatingPill && (
                <div 
                    id="reader-highlight-pill"
                    className="fixed z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#121218]/95 backdrop-blur-2xl border border-white/20 shadow-2xl animate-pop-in"
                    style={{ top: `${floatingPill.y}px`, left: `${floatingPill.x}px` }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-1.5">
                        {Object.keys(HIGHLIGHT_COLORS).map(key => (
                            <button
                                key={key}
                                onClick={() => {
                                    const { prefix, suffix } = extractPrefixAndSuffix(floatingPill.range);
                                    addAnnotation({
                                        space: activeSpace,
                                        url: article.url,
                                        title: article.title,
                                        text: floatingPill.text,
                                        prefix,
                                        suffix,
                                        color: key,
                                        note: ''
                                    });
                                    if (window.getSelection) window.getSelection().removeAllRanges();
                                    setFloatingPill(null);
                                }}
                                title={`Highlight with ${HIGHLIGHT_COLORS[key].label}`}
                                className="w-4 h-4 rounded-full border border-white/30 hover:scale-125 transition-transform cursor-pointer"
                                style={{ backgroundColor: HIGHLIGHT_COLORS[key].border }}
                            />
                        ))}
                    </div>
                    <div className="w-px h-3.5 bg-white/20 mx-0.5" />
                    <button
                        onClick={() => {
                            const { prefix, suffix } = extractPrefixAndSuffix(floatingPill.range);
                            const created = addAnnotation({
                                space: activeSpace,
                                url: article.url,
                                title: article.title,
                                text: floatingPill.text,
                                prefix,
                                suffix,
                                color: 'accent',
                                note: ''
                            });
                            if (window.getSelection) window.getSelection().removeAllRanges();
                            setFloatingPill(null);
                            setTimeout(() => {
                                const mark = articleBodyRef.current?.querySelector(`.qbrowse-highlight[data-qbrowse-id="${created.id}"]`);
                                if (mark) handleOpenNoteCard(created.id, mark);
                            }, 50);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold transition cursor-pointer"
                    >
                        📝 Note
                    </button>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(floatingPill.text);
                            setFloatingPill(null);
                        }}
                        className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                        title="Copy text"
                    >
                        <Copy size={12} />
                    </button>
                </div>
            )}

            {/* In-Page Glassmorphic Note Card in Reader Mode */}
            {activeNoteCard && (
                <div
                    id="reader-note-card"
                    className="fixed z-50 w-72 p-3 rounded-2xl bg-[#121218]/95 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col gap-2.5 animate-pop-in text-white"
                    style={{ top: `${activeNoteCard.y}px`, left: `${activeNoteCard.x}px` }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Sticky Note</span>
                            <div className="flex items-center gap-1">
                                {Object.keys(HIGHLIGHT_COLORS).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            updateAnnotation(activeNoteCard.id, { color: key });
                                            setActiveNoteCard(prev => ({ ...prev, color: key }));
                                        }}
                                        className={`w-3 h-3 rounded-full border transition-transform cursor-pointer ${activeNoteCard.color === key ? 'border-white scale-125' : 'border-white/20'}`}
                                        style={{ backgroundColor: HIGHLIGHT_COLORS[key].border }}
                                    />
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveNoteCard(null)}
                            className="text-white/40 hover:text-white text-xs cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    <textarea
                        value={noteDraftText}
                        onChange={e => setNoteDraftText(e.target.value)}
                        placeholder="Type your note or thought..."
                        className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white outline-none resize-none"
                        autoFocus
                    />

                    <div className="flex items-center justify-between pt-0.5">
                        <button
                            onClick={() => {
                                removeAnnotation(activeNoteCard.id);
                                const marks = articleBodyRef.current?.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${activeNoteCard.id}"]`);
                                marks?.forEach(m => {
                                    const p = m.parentNode;
                                    while (m.firstChild) p.insertBefore(m.firstChild, m);
                                    m.remove();
                                });
                                const badge = articleBodyRef.current?.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${activeNoteCard.id}"]`);
                                badge?.remove();
                                setActiveNoteCard(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition cursor-pointer"
                        >
                            Delete
                        </button>
                        <button
                            onClick={() => {
                                updateAnnotation(activeNoteCard.id, { note: noteDraftText.trim() });
                                setActiveNoteCard(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-accent text-black text-xs font-bold hover:opacity-90 transition cursor-pointer"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
