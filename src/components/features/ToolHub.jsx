import React, { useState, useEffect, useRef } from 'react';
import { 
    Puzzle, X, PenTool, ClipboardList, MessageSquare, 
    Copy, Cpu, Download, Zap, Globe, Send, FolderOpen, ExternalLink,
    Trash2, RefreshCw, Paperclip, FileText, Image as ImageIcon, Play, Square, Sliders,
    Mic, Volume2, Loader2, Search, Camera, Crop, Maximize2,
    Highlighter, StickyNote, ChevronDown, ChevronRight, FileDown, ArrowUpRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useUIStore from '../../store/useUIStore';
import useAIStore, { MODEL_PRESETS } from '../../store/useAIStore';
import useTabStore from '../../store/useTabStore';
import { useAnnotationStore, normalizeAnnotationUrl, HIGHLIGHT_COLORS } from '../../store/useAnnotationStore';
import { startRecording, stopRecordingAndTranscribe } from '../../utils/whisperSTT';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function ToolHub() {
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const setIsRightPanelOpen = useUIStore(state => state.setIsRightPanelOpen);
    const rightPanelTab = useUIStore(state => state.rightPanelTab);
    const setRightPanelTab = useUIStore(state => state.setRightPanelTab);
    const openModal = useUIStore(state => state.openModal);
    const setSettingsTab = useUIStore(state => state.setSettingsTab);
    const currentUrl = useUIStore(state => state.currentUrl);
    const downloads = useUIStore(state => state.downloads) || [];

    // AI Store Hooks
    const { 
        chatHistory, chatInput, setChatInput, attachedFiles, addAttachment, 
        removeAttachment, clearAttachments, aiContextEnabled, setAiContextEnabled, 
        ttsEnabled, setTtsEnabled, webSearchEnabled, setWebSearchEnabled, parsePdfAsImage,
        isGenerating, isRunning, status, toggleEngine, sendChatMessage, stopChatMessage, activeModelId
    } = useAIStore();

    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const [notesContent, setNotesContent] = useState(() => {
        try {
            return localStorage.getItem('qbrowse_notes_content') || '';
        } catch {
            return '';
        }
    });

    const [hubToast, setHubToast] = useState(null);
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    const [clipboardHistory, setClipboardHistory] = useState(() => {
        try {
            const stored = localStorage.getItem('qbrowse_clipboard_history');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const showHubToast = (msg) => {
        setHubToast(msg);
        setTimeout(() => setHubToast(null), 2500);
    };

    // Web Notes State
    const [notesSubTab, setNotesSubTab] = useState('web'); // 'web' | 'scratchpad'
    const [webNotesQuery, setWebNotesQuery] = useState('');
    const [webNotesSpaceFilter, setWebNotesSpaceFilter] = useState('all'); // 'all' | 'current'
    const [collapsedDomains, setCollapsedDomains] = useState({});
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState('');

    const annotations = useAnnotationStore(state => state.annotations);
    const removeAnnotation = useAnnotationStore(state => state.removeAnnotation);
    const updateAnnotation = useAnnotationStore(state => state.updateAnnotation);
    const exportToMarkdown = useAnnotationStore(state => state.exportToMarkdown);
    const activeSpace = useTabStore(state => state.activeSpace);

    const toggleDomainCollapse = (domain) => {
        setCollapsedDomains(prev => ({ ...prev, [domain]: !prev[domain] }));
    };

    const handleJumpToAnnotation = (ann) => {
        const tabStore = useTabStore.getState();
        if (ann.space && tabStore.activeSpace !== ann.space) {
            tabStore.setActiveSpace(ann.space);
        }
        const currentSpace = ann.space || tabStore.activeSpace;
        const spaceTabs = currentSpace === 'personal' ? tabStore.privateTabs : (currentSpace === 'work' ? tabStore.workTabs : tabStore.ghostTabs);
        const targetCleanUrl = normalizeAnnotationUrl(ann.url);
        const existingTab = spaceTabs.find(t => normalizeAnnotationUrl(t.url) === targetCleanUrl);

        if (existingTab) {
            tabStore.setActiveTab(existingTab.id, currentSpace);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('qbrowse-jump-to-annotation', {
                    detail: { id: ann.id, tabId: existingTab.id, url: ann.url }
                }));
            }, 250);
        } else {
            tabStore.handleNewTab(ann.url);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('qbrowse-jump-to-annotation', {
                    detail: { id: ann.id, url: ann.url }
                }));
            }, 800);
        }
        setIsRightPanelOpen(false);
        showHubToast('Navigating to highlight...');
    };

    const handleExportMarkdown = () => {
        const md = exportToMarkdown(webNotesSpaceFilter === 'current' ? activeSpace : null);
        try {
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qbrowse-notes-${new Date().toISOString().slice(0, 10)}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showHubToast('Exported Markdown file!');
        } catch (_) {
            navigator.clipboard.writeText(md);
            showHubToast('Copied notes to clipboard as Markdown!');
        }
    };

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (rightPanelTab === 'ai' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isGenerating, rightPanelTab]);

    // Save notes persistently
    useEffect(() => {
        try {
            localStorage.setItem('qbrowse_notes_content', notesContent);
        } catch(e) {}
    }, [notesContent]);

    // Real System Clipboard Reader
    const syncSystemClipboard = async () => {
        try {
            let text = '';
            if (window.electronAPI && typeof window.electronAPI.readClipboardText === 'function') {
                text = await window.electronAPI.readClipboardText();
            } else if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                text = await navigator.clipboard.readText();
            }

            if (!text || !text.trim()) return;
            const cleanText = text.trim();

            setClipboardHistory(prev => {
                if (prev.length > 0 && prev[0].content === cleanText) {
                    return prev;
                }

                let type = 'text';
                if (/^#(?:[0-9a-fA-F]{3}){1,2}$|^rgb/i.test(cleanText)) {
                    type = 'color';
                } else if (/^https?:\/\//i.test(cleanText)) {
                    type = 'url';
                }

                const filtered = prev.filter(item => item.content !== cleanText);
                const newItem = {
                    id: Date.now().toString(),
                    type,
                    content: cleanText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                const updated = [newItem, ...filtered].slice(0, 100);
                try {
                    localStorage.setItem('qbrowse_clipboard_history', JSON.stringify(updated));
                } catch (e) {}
                return updated;
            });
        } catch (e) {
            console.warn('Sync clipboard failed:', e);
        }
    };

    useEffect(() => {
        if (isRightPanelOpen || rightPanelTab === 'clipboard') {
            syncSystemClipboard();
        }
    }, [isRightPanelOpen, rightPanelTab]);

    const handleCopyClip = async (text) => {
        if (!text) return;
        try {
            if (window.electronAPI && typeof window.electronAPI.writeClipboardText === 'function') {
                await window.electronAPI.writeClipboardText(text);
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            }
            showHubToast('Copied to clipboard!');
        } catch {
            showHubToast('Copied!');
        }
    };

    const handleDeleteClip = (id, e) => {
        e.stopPropagation();
        setClipboardHistory(prev => {
            const updated = prev.filter(item => item.id !== id);
            try {
                localStorage.setItem('qbrowse_clipboard_history', JSON.stringify(updated));
            } catch (e) {}
            return updated;
        });
        showHubToast('Clip deleted');
    };

    const handleClearAllClips = () => {
        setClipboardHistory([]);
        try {
            localStorage.removeItem('qbrowse_clipboard_history');
        } catch (e) {}
        showHubToast('Clipboard history cleared');
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
            
            // PDF to Image Processing
            if (isPdf && parsePdfAsImage) {
                showHubToast(`Parsing PDF visually: ${file.name}`);
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    
                    // Limit to first 10 pages to save VRAM
                    const totalPagesToParse = Math.min(pdf.numPages, 10);
                    
                    for (let pageNum = 1; pageNum <= totalPagesToParse; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.5 });
                        
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        await page.render({ canvasContext: context, viewport }).promise;
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        
                        addAttachment({
                            name: `${file.name} (Pg ${pageNum})`,
                            size: 'PDF Image',
                            type: 'image',
                            dataUrl: dataUrl,
                            content: undefined
                        });
                    }
                    
                    if (pdf.numPages > 10) {
                        showHubToast(`Parsed first 10 pages of ${file.name} as images (VRAM limit).`);
                    }
                } catch (err) {
                    console.error('Failed to parse PDF as image:', err);
                    showHubToast('Failed to parse PDF visually. Falling back to text extraction.');
                    // Fallback to old behavior inside error block if needed
                }
                continue;
            }

            let contentText = undefined;
            let previewDataUrl = undefined;

            if (isImage) {
                const reader = new FileReader();
                previewDataUrl = await new Promise(r => { reader.onload = e => r(e.target.result); reader.readAsDataURL(file); });
            }

            if (window.electronAPI && typeof window.electronAPI.parseFile === 'function' && file.path) {
                try {
                    // This extracts text from PDF, DOCX, Images via OCR, and regular files
                    contentText = await window.electronAPI.parseFile(file.path);
                } catch(err) {
                    console.error('Failed to parse file via IPC:', err);
                    if (!isImage && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
                        const reader = new FileReader();
                        contentText = await new Promise(r => { reader.onload = e => r(e.target.result); reader.readAsText(file); });
                    }
                }
            } else if (!isImage) {
                const reader = new FileReader();
                contentText = await new Promise(r => { reader.onload = e => r(e.target.result); reader.readAsText(file); });
            }

            addAttachment({
                name: file.name,
                size: (file.size / 1024).toFixed(1) + ' KB',
                type: isImage ? 'image' : 'text',
                dataUrl: previewDataUrl,
                content: contentText
            });
        }
        e.target.value = null; // Reset input
    };

    const handleSend = async () => {
        if (!chatInput.trim() && attachedFiles.length === 0) return;
        
        let fullPageContext = currentUrl;
        if (aiContextEnabled) {
            const activeTabId = useTabStore.getState().activeTabId;
            const wv = window.qbrowseWebviews?.[activeTabId];
            if (wv && typeof wv.executeJavaScript === 'function') {
                try {
                    const text = await wv.executeJavaScript('document.body.innerText');
                    fullPageContext = `URL: ${currentUrl}\n\nPAGE CONTENT:\n${text ? text.substring(0, 15000) : '(No text found on page)'}`;
                } catch(e) {
                    console.warn('Failed to extract page text:', e);
                }
            }
        }

        sendChatMessage(chatInput, fullPageContext);
    };

    const handleMicToggle = async () => {
        if (isRecording) {
            setIsTranscribing(true);
            setIsRecording(false);
            try {
                const text = await stopRecordingAndTranscribe();
                if (text) {
                    setChatInput(prev => prev + (prev ? ' ' : '') + text);
                }
            } catch (err) {
                showHubToast('Transcription failed');
            } finally {
                setIsTranscribing(false);
            }
        } else {
            try {
                await startRecording();
                setIsRecording(true);
            } catch (err) {
                showHubToast('Microphone access denied');
            }
        }
    };

    const activePresetName = MODEL_PRESETS.find(m => m.id === activeModelId)?.name || 'Gemma 4 E2B Instruct (Q4_K_M)';

    return (
        <>
            {/* Click-outside backdrop */}
            {isRightPanelOpen && (
                <div 
                    className="fixed inset-0 z-[44999] bg-transparent" 
                    onClick={() => setIsRightPanelOpen(false)}
                />
            )}
            
            <div
                className="fixed right-0 top-1/2 -translate-y-1/2 w-4 h-40 z-[40000] cursor-pointer group flex items-center justify-end pr-1"
                onClick={() => setIsRightPanelOpen(true)}
            >
                <div className={`w-1 h-12 rounded-full transition-all duration-300 ease-out group-hover:h-24 ${isRightPanelOpen ? 'bg-transparent' : 'bg-white/10 group-hover:bg-accent/60 group-hover:shadow-[0_0_15px_var(--accent-30)]'}`}></div>
            </div>

            <div className={`fixed top-4 bottom-4 right-4 w-96 md:w-[460px] bg-[#0c0d14]/78 backdrop-blur-3xl border border-white/[0.08] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col overflow-hidden z-[45000] transform-gpu transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isRightPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0'}`} onClick={e => e.stopPropagation()}>

                {hubToast && (
                    <div className="absolute -left-32 top-1/2 -translate-y-1/2 bg-accent text-black px-3 py-1.5 rounded-lg text-xs font-bold animate-pop-in shadow-lg">
                        {hubToast}
                    </div>
                )}

                <div className="p-3 px-4 flex justify-between items-center border-b border-white/[0.05] bg-white/[0.02] backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <Puzzle size={14} className="text-accent" />
                        <h2 className="text-xs font-semibold tracking-tight text-white uppercase font-mono">
                            Tool Hub
                        </h2>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                setIsRightPanelOpen(false);
                                setTimeout(() => useUIStore.getState().setIsSnippingMode(true), 150);
                            }}
                            className="px-2 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/25 transition text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                            title="Interactive Screen Snip (Crop Selection)"
                        >
                            <Crop size={11} />
                            <span>Snip</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsRightPanelOpen(false);
                                useUIStore.getState().captureVisibleViewport();
                            }}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-zinc-400 hover:text-white border border-white/8 transition cursor-pointer"
                            title="Capture Visible Viewport"
                        >
                            <Camera size={12} />
                        </button>
                        <button
                            onClick={() => {
                                setIsRightPanelOpen(false);
                                useUIStore.getState().captureFullPage();
                            }}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-zinc-400 hover:text-white border border-white/8 transition cursor-pointer"
                            title="Capture Full Scrolling Page"
                        >
                            <Maximize2 size={12} />
                        </button>
                        <div className="w-px h-3.5 bg-white/10 mx-0.5" />
                        <button 
                            onClick={() => setIsRightPanelOpen(false)} 
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                            <X size={13} />
                        </button>
                    </div>
                </div>

                <div className="px-4 pt-3 pb-1">
                    <div className="grid grid-cols-4 bg-white/[0.025] border border-white/[0.05] p-0.5 rounded-lg font-mono text-[11px]">
                        {[
                            { id: 'notes', label: 'Notes', icon: PenTool, iconColor: 'text-amber-400' },
                            { id: 'clipboard', label: 'Clipboard', icon: ClipboardList, iconColor: 'text-cyan-400' },
                            { id: 'ai', label: 'Local AI', icon: Cpu, iconColor: 'text-purple-400' },
                            { id: 'downloads', label: 'Downloads', icon: Download, iconColor: 'text-emerald-400' }
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = rightPanelTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setRightPanelTab(tab.id)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
                                        isActive 
                                            ? 'bg-white/10 text-white font-medium shadow-xs border border-white/10' 
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                                    }`}
                                >
                                    <Icon size={12} className={tab.iconColor} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {/* NOTES TAB */}
                    <div className={`absolute inset-0 p-4 pb-2 flex flex-col transition-all duration-300 ${rightPanelTab === 'notes' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 -translate-x-4 pointer-events-none z-0'}`}>
                        {/* Segmented Subtab Header */}
                        <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl mb-3 flex-shrink-0">
                            <button
                                onClick={() => setNotesSubTab('web')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    notesSubTab === 'web'
                                        ? 'bg-accent text-black shadow-md font-bold'
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Globe size={13} />
                                <span>Web Notes ({annotations.length})</span>
                            </button>
                            <button
                                onClick={() => setNotesSubTab('scratchpad')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    notesSubTab === 'scratchpad'
                                        ? 'bg-accent text-black shadow-md font-bold'
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <PenTool size={13} />
                                <span>Scratchpad</span>
                            </button>
                        </div>

                        {notesSubTab === 'scratchpad' ? (
                            <div className="flex-1 flex flex-col min-h-0 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                                <textarea
                                    value={notesContent}
                                    onChange={e => setNotesContent(e.target.value)}
                                    placeholder="Jot down quick thoughts, notes, links... markdown supported."
                                    className="w-full h-full bg-transparent text-sm text-white/90 placeholder-white/30 resize-none outline-none custom-scrollbar leading-relaxed font-sans"
                                    spellCheck="false"
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Search & Space Filter Bar */}
                                <div className="flex flex-col gap-2 mb-3 flex-shrink-0">
                                    <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-accent/50 transition">
                                        <Search size={13} className="text-white/40 flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={webNotesQuery}
                                            onChange={e => setWebNotesQuery(e.target.value)}
                                            placeholder="Search highlights, notes, domains..."
                                            className="flex-1 bg-transparent text-xs text-white placeholder-white/30 outline-none"
                                        />
                                        {webNotesQuery && (
                                            <button onClick={() => setWebNotesQuery('')} className="text-white/40 hover:text-white text-xs">✕</button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-lg border border-white/5">
                                            <button
                                                onClick={() => setWebNotesSpaceFilter('all')}
                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${webNotesSpaceFilter === 'all' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'}`}
                                            >
                                                All Spaces
                                            </button>
                                            <button
                                                onClick={() => setWebNotesSpaceFilter('current')}
                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition flex items-center gap-1 ${webNotesSpaceFilter === 'current' ? 'bg-accent/20 text-accent font-bold' : 'text-white/40 hover:text-white'}`}
                                            >
                                                <span className="capitalize">{activeSpace}</span> Space
                                            </button>
                                        </div>

                                        <button
                                            onClick={handleExportMarkdown}
                                            disabled={annotations.length === 0}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 text-[11px] font-medium border border-white/5 transition cursor-pointer"
                                            title="Export Notes as Markdown (.md)"
                                        >
                                            <FileDown size={12} />
                                            <span>Export MD</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Domain-Grouped Highlights List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-2.5">
                                    {(() => {
                                        const spaceFiltered = webNotesSpaceFilter === 'current' ? annotations.filter(a => a.space === activeSpace) : annotations;
                                        const queryLower = webNotesQuery.toLowerCase().trim();
                                        const filtered = queryLower
                                            ? spaceFiltered.filter(a =>
                                                (a.text && a.text.toLowerCase().includes(queryLower)) ||
                                                (a.note && a.note.toLowerCase().includes(queryLower)) ||
                                                (a.domain && a.domain.toLowerCase().includes(queryLower)) ||
                                                (a.title && a.title.toLowerCase().includes(queryLower))
                                              )
                                            : spaceFiltered;

                                        if (filtered.length === 0) {
                                            return (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/40">
                                                    <Highlighter size={32} className="text-accent/30 mb-2.5" />
                                                    <p className="text-xs font-semibold text-white/70 mb-1">No Web Notes Saved</p>
                                                    <p className="text-[11px] leading-relaxed max-w-[260px]">
                                                        Highlight text on any webpage or click "Note" in the floating pill to keep persistent notes across visits.
                                                    </p>
                                                </div>
                                            );
                                        }

                                        const domainMap = new Map();
                                        filtered.forEach(ann => {
                                            const d = ann.domain || 'Other';
                                            if (!domainMap.has(d)) domainMap.set(d, []);
                                            domainMap.get(d).push(ann);
                                        });

                                        const domainGroups = Array.from(domainMap.entries()).map(([domain, items]) => ({
                                            domain,
                                            count: items.length,
                                            items: items.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
                                        })).sort((a, b) => b.count - a.count);

                                        return domainGroups.map(group => {
                                            const isCollapsed = !!collapsedDomains[group.domain];
                                            return (
                                                <div key={group.domain} className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
                                                    {/* Group Header */}
                                                    <button
                                                        onClick={() => toggleDomainCollapse(group.domain)}
                                                        className="w-full flex items-center justify-between p-2.5 px-3 bg-white/[0.02] hover:bg-white/[0.05] transition text-left cursor-pointer border-b border-white/5"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Globe size={13} className="text-accent flex-shrink-0" />
                                                            <span className="text-xs font-bold text-white/90 truncate">{group.domain}</span>
                                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white/60">
                                                                {group.count}
                                                            </span>
                                                        </div>
                                                        <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                                                    </button>

                                                    {/* Group Items */}
                                                    {!isCollapsed && (
                                                        <div className="p-2 flex flex-col gap-2">
                                                            {group.items.map(ann => {
                                                                const colorConfig = HIGHLIGHT_COLORS[ann.color] || HIGHLIGHT_COLORS.accent;
                                                                const isEditing = editingNoteId === ann.id;

                                                                return (
                                                                    <div 
                                                                        key={ann.id} 
                                                                        className="p-2.5 rounded-lg bg-black/40 border border-white/5 hover:border-white/15 transition flex flex-col gap-2 group/card"
                                                                    >
                                                                        {/* Page Title & Space Badge */}
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                                <div 
                                                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                                                                    style={{ backgroundColor: colorConfig.border }} 
                                                                                    title={`Color: ${colorConfig.label}`}
                                                                                />
                                                                                <span className="text-[11px] font-medium text-white/70 truncate max-w-[200px]" title={ann.title || ann.url}>
                                                                                    {ann.title || ann.domain}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                                                                                {ann.space || 'personal'}
                                                                            </span>
                                                                        </div>

                                                                        {/* Text Quote Snippet */}
                                                                        <div 
                                                                            className="text-xs text-white/90 pl-2.5 border-l-2 leading-relaxed cursor-pointer hover:text-white transition"
                                                                            style={{ borderColor: colorConfig.border }}
                                                                            onClick={() => handleJumpToAnnotation(ann)}
                                                                            title="Click to jump to this highlight on page"
                                                                        >
                                                                            "{ann.text}"
                                                                        </div>

                                                                        {/* Attached Sticky Note */}
                                                                        {isEditing ? (
                                                                            <div className="flex flex-col gap-1.5 mt-1">
                                                                                <textarea
                                                                                    value={editingNoteText}
                                                                                    onChange={e => setEditingNoteText(e.target.value)}
                                                                                    placeholder="Add a note or thought..."
                                                                                    className="w-full h-16 bg-black/50 border border-white/20 rounded-lg p-2 text-xs text-white outline-none resize-none"
                                                                                    autoFocus
                                                                                />
                                                                                <div className="flex items-center justify-end gap-1.5">
                                                                                    <button
                                                                                        onClick={() => setEditingNoteId(null)}
                                                                                        className="px-2 py-0.5 rounded text-[10px] text-white/50 hover:text-white cursor-pointer"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            updateAnnotation(ann.id, { note: editingNoteText.trim() });
                                                                                            setEditingNoteId(null);
                                                                                            showHubToast('Note updated');
                                                                                        }}
                                                                                        className="px-2.5 py-0.5 rounded bg-accent text-black text-[10px] font-bold cursor-pointer hover:opacity-90"
                                                                                    >
                                                                                        Save
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : ann.note ? (
                                                                            <div 
                                                                                onClick={() => {
                                                                                    setEditingNoteId(ann.id);
                                                                                    setEditingNoteText(ann.note);
                                                                                }}
                                                                                className="flex items-start gap-1.5 p-2 rounded-lg bg-white/[0.04] border border-white/5 text-xs text-white/80 cursor-pointer hover:border-white/20 transition group/note"
                                                                                title="Click to edit note"
                                                                            >
                                                                                <StickyNote size={12} className="text-accent flex-shrink-0 mt-0.5" />
                                                                                <span className="flex-1 leading-snug">{ann.note}</span>
                                                                            </div>
                                                                        ) : null}

                                                                        {/* Action Buttons Row */}
                                                                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-white/40">
                                                                            <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                                                            <div className="flex items-center gap-1.5">
                                                                                {!ann.note && !isEditing && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setEditingNoteId(ann.id);
                                                                                            setEditingNoteText('');
                                                                                        }}
                                                                                        className="hover:text-accent flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-white/5 transition cursor-pointer"
                                                                                        title="Add note"
                                                                                    >
                                                                                        <StickyNote size={11} />
                                                                                        <span>Note</span>
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={() => {
                                                                                        navigator.clipboard.writeText(ann.text);
                                                                                        showHubToast('Copied quote');
                                                                                    }}
                                                                                    className="hover:text-white p-1 rounded hover:bg-white/5 transition cursor-pointer"
                                                                                    title="Copy quote"
                                                                                >
                                                                                    <Copy size={11} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleJumpToAnnotation(ann)}
                                                                                    className="hover:text-accent flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer font-medium"
                                                                                    title="Jump to page"
                                                                                >
                                                                                    <ArrowUpRight size={11} />
                                                                                    <span>Jump</span>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        removeAnnotation(ann.id);
                                                                                        showHubToast('Highlight removed');
                                                                                    }}
                                                                                    className="hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition cursor-pointer"
                                                                                    title="Delete highlight"
                                                                                >
                                                                                    <Trash2 size={11} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CLIPBOARD TAB */}
                    <div className={`absolute inset-0 p-5 flex flex-col transition-all duration-300 ${rightPanelTab === 'clipboard' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-4 pointer-events-none z-0'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">System Clipboard History</span>
                            <button 
                                onClick={syncSystemClipboard}
                                className="flex items-center gap-1 text-[10px] font-bold text-accent opacity-80 hover:opacity-100 hover:bg-accent-10 px-2 py-1 rounded-lg transition"
                                title="Sync system clipboard"
                            >
                                <RefreshCw size={10} /> Sync
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scroll flex flex-col gap-2 pr-0.5">
                            {clipboardHistory.length > 0 ? (
                                clipboardHistory.map((item, i) => (
                                    <div 
                                        key={item.id || i} 
                                        className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition cursor-pointer group animate-pop-in relative" 
                                        style={{ animationDelay: `${i * 0.04}s` }} 
                                        onClick={() => handleCopyClip(item.content)}
                                    >
                                        {item.type === 'color' ? (
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-4 h-4 rounded-md border border-white/20 shadow-sm" style={{ backgroundColor: item.content }}></div>
                                                <span className="text-xs text-white/90 font-mono font-semibold">{item.content}</span>
                                            </div>
                                        ) : (
                                            <p className={`text-xs text-white/80 line-clamp-3 leading-relaxed break-words ${item.type === 'text' ? 'font-mono' : 'font-sans text-purple-300 underline'}`}>{item.content}</p>
                                        )}

                                        <div className="flex justify-between items-center mt-2.5">
                                            <span className="text-[9px] font-mono text-white/30">{item.time}</span>
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition">
                                                <button 
                                                    onClick={(e) => handleDeleteClip(item.id, e)}
                                                    className="p-1 hover:text-red-400 text-white/40 transition"
                                                    title="Delete clip"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                <Copy size={12} className="text-white/40 group-hover:text-accent transition" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                                    <ClipboardList size={32} className="text-white/10 mb-2" />
                                    <p className="text-xs text-white/40 font-medium">Clipboard history is empty</p>
                                    <p className="text-[10px] text-white/20 mt-1">Copy text or URLs anywhere to see them here</p>
                                </div>
                            )}
                        </div>

                        {clipboardHistory.length > 0 && (
                            <button 
                                className="w-full mt-3 py-2 border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer" 
                                onClick={handleClearAllClips}
                            >
                                Clear Clipboard History
                            </button>
                        )}
                    </div>

                    {/* QU-AI TAB */}
                    <div className={`absolute inset-0 p-5 pb-4 flex flex-col transition-all duration-300 ${rightPanelTab === 'ai' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-4 pointer-events-none z-0'}`}>
                        {/* Header Bar: Status & Engine Launcher */}
                        <div className="p-2.5 bg-black/40 border border-white/10 rounded-2xl mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${status === 'loading' || status === 'downloading_engine' ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]' : isRunning ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-white/30'}`} />
                                <div>
                                    <span className="text-[11px] font-bold text-white block leading-none">{activePresetName}</span>
                                    <span className="text-[9px] font-mono text-white/40">{status === 'downloading_engine' ? 'Downloading llama.cpp Engine...' : status === 'loading' ? 'Loading Model to RAM/VRAM...' : isRunning ? 'llama-server Active (Port 8080)' : 'Offline (Click to Start)'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={toggleEngine}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                        isRunning ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-accent text-black hover:scale-105'
                                    }`}
                                >
                                    {isRunning ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                                    {isRunning ? 'Stop' : 'Start'}
                                </button>
                                {isRunning && status !== 'loading' && (
                                    <button
                                        onClick={() => {
                                            const tabStore = useTabStore.getState();
                                            const activeTabId = tabStore.activeTabId;
                                            if (activeTabId) {
                                                tabStore.handleNavigate(activeTabId, 'qbrowse://ai');
                                            } else {
                                                tabStore.handleNewTab('qbrowse://ai');
                                            }
                                            setIsRightPanelOpen(false);
                                        }}
                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition cursor-pointer"
                                        title="Open llama.cpp Web UI"
                                    >
                                        <Globe size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setSettingsTab('ai');
                                        openModal('settings');
                                    }}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition cursor-pointer"
                                    title="llama.cpp Console & Advanced Settings"
                                >
                                    <Sliders size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto hide-scroll flex flex-col gap-3.5 pr-1 animate-pop-in">
                            {chatHistory.filter((msg, i, arr) => {
                                if (msg.role === 'tool') return false;
                                if (msg.role === 'ai' && msg.tool_calls) {
                                    // Hide this intermediate message if a final AI answer has started streaming
                                    const hasFinalAnswer = arr.slice(i + 1).some(m => m.role === 'ai');
                                    if (hasFinalAnswer) return false;
                                }
                                return true;
                            }).map((msg, i) => (
                                <div key={i} className={`flex items-start gap-2.5 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {msg.role === 'ai' && (
                                        <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                                            <Cpu size={12} />
                                        </div>
                                    )}

                                    <div className={`p-3 rounded-xl text-xs leading-relaxed max-w-[85%] border ${
                                        msg.role === 'user' ? 'bg-accent/15 border-accent/25 text-white rounded-tr-sm' : 'bg-white/[0.025] border-white/[0.05] text-zinc-200 rounded-tl-sm'
                                    }`}>
                                        {/* Attachments rendering */}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="flex gap-1.5 flex-wrap mb-2 pb-2 border-b border-white/10">
                                                {msg.attachments.map((file, fIndex) => (
                                                    <div key={fIndex} className="flex items-center gap-1 px-2 py-0.5 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white/80">
                                                        {file.type === 'image' ? <ImageIcon size={10} className="text-accent" /> : <FileText size={10} className="text-purple-400" />}
                                                        <span className="truncate max-w-[100px]">{file.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {msg.role === 'ai' ? (
                                            <div className="markdown-prose prose prose-invert max-w-none text-xs leading-relaxed prose-p:my-1 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:p-2 prose-pre:rounded-lg">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || "..."}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.content || "..."}</p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isGenerating && (
                                <div className="flex items-start gap-2.5 w-full">
                                    <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/10 text-zinc-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Cpu size={12} />
                                    </div>
                                    <div className="bg-white/[0.03] border border-white/8 text-zinc-300 p-2.5 px-3 rounded-xl rounded-tl-sm text-xs flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Box & Attachment Tray */}
                        <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-white/10">
                            {/* Attached Files Tray */}
                            {attachedFiles.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap">
                                    {attachedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 border border-accent/30 rounded-xl text-[10px] text-accent font-semibold animate-pop-in">
                                            {file.type === 'image' ? <ImageIcon size={11} /> : <FileText size={11} />}
                                            <span className="truncate max-w-[120px]">{file.name}</span>
                                            <button onClick={() => removeAttachment(index)} className="text-white/40 hover:text-white ml-0.5">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <button
                                        onClick={() => setAiContextEnabled(!aiContextEnabled)}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium tracking-wide transition-all cursor-pointer flex-1 min-w-0 truncate ${
                                            aiContextEnabled ? 'bg-accent-20 border-accent-30 text-accent shadow-[0_0_12px_var(--accent-10)]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white/80'
                                        }`}
                                    >
                                        <Globe size={11} className="flex-shrink-0" />
                                        <span className="truncate">Context</span>
                                    </button>

                                    <button
                                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium tracking-wide transition-all cursor-pointer flex-1 min-w-0 truncate ${
                                            webSearchEnabled ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white/80'
                                        }`}
                                    >
                                        <Search size={11} className="flex-shrink-0" />
                                        <span className="truncate">Search</span>
                                    </button>

                                    <button
                                        onClick={() => setTtsEnabled(!ttsEnabled)}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium tracking-wide transition-all cursor-pointer flex-1 min-w-0 truncate ${
                                            ttsEnabled ? 'bg-green-500/20 border-green-500/30 text-green-400 shadow-[0_0_12px_rgba(74,222,128,0.2)]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white/80'
                                        }`}
                                    >
                                        <Volume2 size={11} className="flex-shrink-0" />
                                        <span className="truncate">Voice</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => sendChatMessage("Summarize this web page", currentUrl)}
                                    className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-medium tracking-wide text-white/70 hover:text-white transition cursor-pointer flex-shrink-0"
                                >
                                    ✨ Summarize
                                </button>
                            </div>

                            {/* Hidden Native File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                multiple
                                className="hidden"
                                accept="image/*,.txt,.pdf,.js,.py,.json,.csv,.md"
                            />

                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-1.5 pr-2 focus-within:border-accent-30 transition-colors">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                                    title="Attach File or Image"
                                >
                                    <Paperclip size={14} />
                                </button>

                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask local Gemma 4 AI or drop files..."
                                    className="flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder-white/30"
                                />

                                <button
                                    onClick={handleMicToggle}
                                    disabled={isTranscribing}
                                    className={`p-1.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                                        isRecording ? 'text-red-400 bg-red-500/20 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/10'
                                    }`}
                                    title="Voice Input (Whisper)"
                                >
                                    {isTranscribing ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
                                </button>

                                {isGenerating ? (
                                    <button 
                                        onClick={stopChatMessage} 
                                        className="w-7 h-7 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center transition cursor-pointer hover:bg-red-500/30"
                                    >
                                        <Square size={12} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSend} 
                                        disabled={(!chatInput.trim() && attachedFiles.length === 0)} 
                                        className="w-7 h-7 rounded-xl bg-accent text-black flex items-center justify-center disabled:opacity-40 transition cursor-pointer hover:scale-105"
                                    >
                                        <Send size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DOWNLOADS TAB */}
                    <div className={`absolute inset-0 p-5 overflow-y-auto hide-scroll transition-all duration-300 ${rightPanelTab === 'downloads' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-4 pointer-events-none z-0'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Active & Recent Downloads</span>
                            <span className="text-[10px] font-mono text-accent font-bold">{downloads.length} Items</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {downloads.length > 0 ? (
                                downloads.map((dl, i) => (
                                    <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-white truncate max-w-[200px]">{dl.filename || dl.url}</span>
                                            <span className="font-mono text-[10px] text-accent">{dl.progress || 100}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                                            <div className="h-full bg-accent" style={{ width: `${dl.progress || 100}%` }}></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8">
                                    <Download size={32} className="text-white/10 mb-2" />
                                    <p className="text-xs text-white/40 font-medium">No active downloads</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
