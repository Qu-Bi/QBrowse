import React, { useState, useEffect, useRef } from 'react';
import { 
    Puzzle, X, PenTool, ClipboardList, MessageSquare, 
    Copy, Cpu, Download, Zap, Globe, Send, FolderOpen, ExternalLink,
    Trash2, RefreshCw, Paperclip, FileText, Image as ImageIcon, Play, Square, Sliders,
    Mic, Volume2, Loader2, Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useUIStore from '../../store/useUIStore';
import useAIStore, { MODEL_PRESETS } from '../../store/useAIStore';
import useTabStore from '../../store/useTabStore';
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

            <div className={`fixed top-4 bottom-4 right-4 w-96 md:w-[460px] bg-[#0a0a0c]/95 border border-white/10 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col z-[45000] transform-gpu transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isRightPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0'}`} onClick={e => e.stopPropagation()}>

                {hubToast && (
                    <div className="absolute -left-32 top-1/2 -translate-y-1/2 bg-accent text-black px-3 py-1.5 rounded-lg text-xs font-bold animate-pop-in shadow-lg">
                        {hubToast}
                    </div>
                )}

                <div className="p-5 pb-3 flex justify-between items-center border-b border-white/5">
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Puzzle size={18} className="text-accent" /> Tool Hub
                    </h2>
                    <button onClick={() => setIsRightPanelOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer">
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="px-5 pt-4 pb-2">
                    <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl relative">
                        <div
                            className="absolute top-1 bottom-1 bg-accent-20 border border-accent-30 rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-sm"
                            style={{ width: 'calc(25% - 2px)', transform: `translateX(${rightPanelTab === 'notes' ? '0%' : rightPanelTab === 'clipboard' ? '100%' : rightPanelTab === 'ai' ? '200%' : '300%'})` }}
                        ></div>
                        <button onClick={() => setRightPanelTab('notes')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'notes' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><PenTool size={12} /> Notes</button>
                        <button onClick={() => setRightPanelTab('clipboard')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'clipboard' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><ClipboardList size={12} /> Copied</button>
                        <button onClick={() => setRightPanelTab('ai')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'ai' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><MessageSquare size={12} /> Qu-AI</button>
                        <button onClick={() => setRightPanelTab('downloads')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelTab === 'downloads' ? 'text-accent' : 'text-white/40 hover:text-white'}`}><Download size={12} /> DL</button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {/* NOTES TAB */}
                    <div className={`absolute inset-0 p-5 transition-all duration-300 ${rightPanelTab === 'notes' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 -translate-x-4 pointer-events-none z-0'}`}>
                        <textarea
                            value={notesContent}
                            onChange={e => setNotesContent(e.target.value)}
                            placeholder="Jot down quick thoughts, markdown supported..."
                            className="w-full h-full bg-transparent text-sm text-white/90 placeholder-white/30 resize-none outline-none hide-scroll leading-relaxed font-sans"
                            spellCheck="false"
                        />
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
                                        <div className="w-6 h-6 rounded-full bg-accent text-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_10px_var(--accent-30)]">
                                            <Zap size={12} />
                                        </div>
                                    )}

                                    <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] border ${
                                        msg.role === 'user' ? 'bg-accent-20 border-accent-30 text-white rounded-tr-sm' : 'bg-white/5 border-white/10 text-white/90 rounded-tl-sm'
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
                                    <div className="w-6 h-6 rounded-full bg-accent text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Zap size={12} className="animate-pulse" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 text-white/90 p-3 rounded-2xl rounded-tl-sm text-xs flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
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
