import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    ZoomIn, ZoomOut, RotateCw, Moon, Sun, Search, Sparkles, 
    ChevronLeft, ChevronRight, Layout, Download, ExternalLink, 
    Maximize2, Minimize2, FileText, Loader2, AlertCircle, Copy, Check
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import useUIStore from '../../store/useUIStore';
import useAIStore from '../../store/useAIStore';

// Configure offline local pdf.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export default function GlassPdfViewer({ url, filePath, fileName }) {
    const theme = useUIStore(state => state.theme);
    const showToast = useUIStore(state => state.showToast);
    const setIsRightPanelOpen = useUIStore(state => state.setIsRightPanelOpen);
    const setRightPanelTab = useUIStore(state => state.setRightPanelTab);
    const setChatInput = useAIStore(state => state.setChatInput);

    const isBright = theme === 'light';

    const [pdfDoc, setPdfDoc] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [rotation, setRotation] = useState(0);
    const [isDarkModeInvert, setIsDarkModeInvert] = useState(!isBright);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pageThumbnails, setPageThumbnails] = useState({});
    const [fitMode, setFitMode] = useState('custom'); // 'custom' | 'width' | 'page'

    const containerRef = useRef(null);
    const canvasContainerRef = useRef(null);
    const renderTaskRef = useRef(null);

    // Load PDF Document
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const loadPdf = async () => {
            try {
                let docData = null;

                // 1. If we have Electron API, read raw bytes directly
                if (window.electronAPI?.readLocalFileData && (filePath || url)) {
                    const res = await window.electronAPI.readLocalFileData(filePath || url);
                    if (res?.base64) {
                        const binaryStr = atob(res.base64);
                        const len = binaryStr.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }
                        docData = bytes.buffer;
                    }
                }

                // 2. Fallback to standard fetch
                if (!docData) {
                    const response = await fetch(url);
                    docData = await response.arrayBuffer();
                }

                if (!isMounted) return;

                const loadingTask = pdfjsLib.getDocument({ data: docData });
                const loadedDoc = await loadingTask.promise;

                if (!isMounted) return;
                setPdfDoc(loadedDoc);
                setNumPages(loadedDoc.numPages);
                setCurrentPage(1);
                setLoading(false);
            } catch (err) {
                if (!isMounted) return;
                console.error('[PDF Viewer] Failed to load PDF:', err);
                setError(err.message || 'Failed to open PDF document');
                setLoading(false);
            }
        };

        loadPdf();

        return () => {
            isMounted = false;
        };
    }, [url, filePath]);

    // Render Active Page onto Canvas
    const renderPage = useCallback(async (pageNum) => {
        if (!pdfDoc || !canvasContainerRef.current) return;

        try {
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch (_) {}
            }

            const page = await pdfDoc.getPage(pageNum);
            const containerWidth = canvasContainerRef.current.clientWidth || 800;

            let effectiveScale = scale;
            if (fitMode === 'width') {
                const unscaledViewport = page.getViewport({ scale: 1, rotation });
                effectiveScale = (containerWidth - 64) / unscaledViewport.width;
            }

            const viewport = page.getViewport({ scale: effectiveScale, rotation });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            const outputScale = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + 'px';
            canvas.style.height = Math.floor(viewport.height) + 'px';

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            canvasContainerRef.current.innerHTML = '';
            canvasContainerRef.current.appendChild(canvas);

            const renderContext = {
                canvasContext: context,
                transform,
                viewport
            };

            const task = page.render(renderContext);
            renderTaskRef.current = task;
            await task.promise;
        } catch (err) {
            if (err.name !== 'RenderingCancelledException') {
                console.error('[PDF Render Error]:', err);
            }
        }
    }, [pdfDoc, scale, rotation, fitMode]);

    useEffect(() => {
        if (pdfDoc && currentPage) {
            renderPage(currentPage);
        }
    }, [pdfDoc, currentPage, scale, rotation, fitMode, renderPage]);

    // Generate thumbnails on demand when drawer opened
    useEffect(() => {
        if (!showThumbnails || !pdfDoc) return;

        let cancelled = false;
        const generateThumbnails = async () => {
            const thumbs = { ...pageThumbnails };
            const limit = Math.min(numPages, 30); // first 30 pages

            for (let i = 1; i <= limit; i++) {
                if (cancelled) break;
                if (!thumbs[i]) {
                    try {
                        const page = await pdfDoc.getPage(i);
                        const vp = page.getViewport({ scale: 0.25 });
                        const canvas = document.createElement('canvas');
                        canvas.width = vp.width;
                        canvas.height = vp.height;
                        const ctx = canvas.getContext('2d');
                        await page.render({ canvasContext: ctx, viewport: vp }).promise;
                        thumbs[i] = canvas.toDataURL('image/jpeg', 0.7);
                        if (!cancelled) setPageThumbnails({ ...thumbs });
                    } catch (_) {}
                }
            }
        };

        generateThumbnails();

        return () => {
            cancelled = true;
        };
    }, [showThumbnails, pdfDoc, numPages]);

    // Zoom Controls
    const handleZoomIn = () => {
        setFitMode('custom');
        setScale(s => Math.min(s + 0.2, 3.0));
    };

    const handleZoomOut = () => {
        setFitMode('custom');
        setScale(s => Math.max(s - 0.2, 0.4));
    };

    const handleRotate = () => {
        setRotation(r => (r + 90) % 360);
    };

    // Summarize with local Gemma / Qu-AI
    const handleSummarizeWithAI = async () => {
        if (!pdfDoc) return;
        try {
            showToast('Extracting document text for Qu-AI...', 'info');
            let fullText = '';
            const maxPages = Math.min(pdfDoc.numPages, 6);

            for (let i = 1; i <= maxPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageStr = textContent.items.map(item => item.str).join(' ');
                fullText += `\n--- Page ${i} ---\n` + pageStr;
            }

            const prompt = `Please provide a concise, high-level summary and key takeaways of this PDF document (${fileName || 'document'}):\n\n${fullText.slice(0, 4500)}`;
            
            setChatInput(prompt);
            setRightPanelTab('ai');
            setIsRightPanelOpen(true);
            showToast('Opened in Qu-AI Panel with document text!');
        } catch (e) {
            showToast('Failed to extract text: ' + e.message, 'error');
        }
    };

    const lastWheelTurnRef = useRef(0);

    const handleWheel = (e) => {
        if (!containerRef.current || !pdfDoc || numPages <= 1) return;
        const now = Date.now();
        if (now - lastWheelTurnRef.current < 350) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isAtBottom = scrollHeight <= clientHeight + 10 || (scrollTop + clientHeight >= scrollHeight - 20);
        const isAtTop = scrollTop <= 20;

        if (e.deltaY > 25 && isAtBottom && currentPage < numPages) {
            lastWheelTurnRef.current = now;
            setCurrentPage(p => Math.min(p + 1, numPages));
            setTimeout(() => {
                if (containerRef.current) containerRef.current.scrollTop = 0;
            }, 30);
        } else if (e.deltaY < -25 && isAtTop && currentPage > 1) {
            lastWheelTurnRef.current = now;
            setCurrentPage(p => Math.max(p - 1, 1));
            setTimeout(() => {
                if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }, 30);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey) || (e.key === 'ArrowDown' && e.altKey)) {
            e.preventDefault();
            if (currentPage < numPages) {
                setCurrentPage(p => p + 1);
                if (containerRef.current) containerRef.current.scrollTop = 0;
            }
        } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey) || (e.key === 'ArrowUp' && e.altKey)) {
            e.preventDefault();
            if (currentPage > 1) {
                setCurrentPage(p => p - 1);
                if (containerRef.current) containerRef.current.scrollTop = 0;
            }
        }
    };

    const handleRevealFile = () => {
        const target = filePath || url;
        if (target && window.electronAPI?.showInFolder) {
            window.electronAPI.showInFolder(target);
            showToast('Revealed file in system folder');
        }
    };

    return (
        <div className={`w-full h-full flex flex-col overflow-hidden font-sans select-none ${
            isBright ? 'bg-zinc-100 text-zinc-900' : 'bg-[#0f1015] text-zinc-100'
        }`}>
            {/* Frosted Glass Toolbar */}
            <header className={`px-4 py-2.5 flex items-center justify-between gap-3 border-b backdrop-blur-2xl z-30 shrink-0 ${
                isBright ? 'bg-white/85 border-black/10' : 'bg-[#15161c]/85 border-white/10'
            }`}>
                {/* Left: Thumbnail toggle & Title */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => setShowThumbnails(!showThumbnails)}
                        title="Toggle Page Thumbnails"
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            showThumbnails 
                                ? 'bg-accent text-black font-bold border-accent shadow-sm' 
                                : (isBright ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white')
                        }`}
                    >
                        <Layout size={14} />
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                        <FileText size={15} className="text-rose-400 flex-shrink-0" />
                        <span className="text-xs font-semibold truncate max-w-[200px] sm:max-w-xs" title={fileName || 'PDF Document'}>
                            {fileName || 'PDF Document'}
                        </span>
                        {numPages > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono border border-accent/20 flex-shrink-0">
                                {numPages} {numPages === 1 ? 'page' : 'pages'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Center: Page Navigation Dock */}
                {numPages > 0 && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-2xl border ${
                        isBright ? 'bg-black/[0.04] border-black/10' : 'bg-black/40 border-white/10'
                    }`}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage <= 1}
                            title="Previous Page"
                            className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        <div className="flex items-center gap-1 text-xs font-mono">
                            <input
                                type="number"
                                min={1}
                                max={numPages}
                                value={currentPage}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (val >= 1 && val <= numPages) setCurrentPage(val);
                                }}
                                className={`w-10 text-center rounded-md py-0.5 outline-none font-bold ${
                                    isBright ? 'bg-white text-zinc-900 border border-black/10' : 'bg-white/10 text-white border border-white/15'
                                }`}
                            />
                            <span className="text-zinc-500">/</span>
                            <span>{numPages}</span>
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, numPages))}
                            disabled={currentPage >= numPages}
                            title="Next Page"
                            className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* Right: Zoom, Dark Mode, AI & Utility Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Zoom Dock */}
                    <div className={`flex items-center p-0.5 rounded-xl border text-xs ${
                        isBright ? 'bg-black/[0.04] border-black/10' : 'bg-white/5 border-white/10'
                    }`}>
                        <button
                            onClick={handleZoomOut}
                            title="Zoom Out"
                            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                        >
                            <ZoomOut size={13} />
                        </button>
                        <span className="px-1.5 font-mono text-[11px] font-semibold min-w-[40px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            title="Zoom In"
                            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                        >
                            <ZoomIn size={13} />
                        </button>
                    </div>

                    {/* Fit Width */}
                    <button
                        onClick={() => {
                            setFitMode(fitMode === 'width' ? 'custom' : 'width');
                        }}
                        title="Fit to Width"
                        className={`p-1.5 rounded-xl border transition cursor-pointer text-xs ${
                            fitMode === 'width' 
                                ? 'bg-accent text-black font-bold border-accent shadow-sm' 
                                : (isBright ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10')
                        }`}
                    >
                        <Maximize2 size={13} />
                    </button>

                    {/* Rotate */}
                    <button
                        onClick={handleRotate}
                        title="Rotate 90° Clockwise"
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            isBright ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                    >
                        <RotateCw size={13} />
                    </button>

                    {/* Smart Dark Mode Invert Toggle */}
                    <button
                        onClick={() => setIsDarkModeInvert(!isDarkModeInvert)}
                        title={isDarkModeInvert ? "Normal Mode" : "Dark Reader Invert Mode"}
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            isDarkModeInvert 
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]' 
                                : (isBright ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10')
                        }`}
                    >
                        {isDarkModeInvert ? <Sun size={13} /> : <Moon size={13} />}
                    </button>

                    {/* AI Summarize */}
                    <button
                        onClick={handleSummarizeWithAI}
                        className="px-3 py-1.5 rounded-xl bg-accent text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-accent/20 hover:scale-105 active:scale-95 transition cursor-pointer"
                    >
                        <Sparkles size={12} />
                        <span className="hidden sm:inline">Summarize</span>
                    </button>

                    {/* Reveal in Explorer */}
                    <button
                        onClick={handleRevealFile}
                        title="Open in System File Manager"
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            isBright ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                    >
                        <ExternalLink size={13} />
                    </button>
                </div>
            </header>

            {/* Viewer Body: Thumbnails Drawer + Canvas */}
            <div className="flex-1 min-h-0 flex overflow-hidden relative">
                {/* Thumbnails Drawer */}
                {showThumbnails && (
                    <aside className={`w-52 border-r flex flex-col overflow-y-auto p-3 gap-3 transition-all duration-300 z-20 ${
                        isBright ? 'bg-white/70 border-black/10' : 'bg-[#121318]/90 border-white/10 backdrop-blur-xl'
                    }`}>
                        <div className="flex items-center justify-between text-xs font-semibold px-1 text-zinc-400">
                            <span>Pages</span>
                            <span>{numPages}</span>
                        </div>
                        <div className="space-y-3">
                            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                                <div
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                                        currentPage === pageNum 
                                            ? 'border-accent bg-accent/10 shadow-[0_0_15px_var(--accent-20)]' 
                                            : (isBright ? 'border-black/10 hover:bg-black/5' : 'border-white/5 hover:bg-white/5')
                                    }`}
                                >
                                    {pageThumbnails[pageNum] ? (
                                        <img 
                                            src={pageThumbnails[pageNum]} 
                                            alt={`Page ${pageNum}`} 
                                            className="w-full h-auto rounded shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-full h-32 bg-white/5 rounded flex items-center justify-center text-zinc-500 text-xs">
                                            {pageNum}
                                        </div>
                                    )}
                                    <span className="text-[11px] font-mono font-medium">Page {pageNum}</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                )}

                {/* Canvas Render Container */}
                <main 
                    ref={containerRef}
                    onWheel={handleWheel}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    className="flex-1 min-h-0 overflow-y-auto outline-none custom-scrollbar flex flex-col items-center justify-start p-8 select-text"
                >
                    {loading ? (
                        <div className="m-auto flex flex-col items-center gap-3 text-zinc-400">
                            <Loader2 size={32} className="animate-spin text-accent" />
                            <p className="text-xs font-medium">Rendering PDF with PDF.js...</p>
                        </div>
                    ) : error ? (
                        <div className="m-auto max-w-md p-6 rounded-3xl border border-red-500/20 bg-red-500/10 text-center space-y-3">
                            <AlertCircle size={28} className="text-red-400 mx-auto" />
                            <h3 className="text-sm font-bold text-white">Failed to Open Document</h3>
                            <p className="text-xs text-zinc-400">{error}</p>
                        </div>
                    ) : (
                        <div 
                            ref={canvasContainerRef}
                            className={`rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
                                isDarkModeInvert 
                                    ? 'filter invert-[0.92] hue-rotate-180 brightness-[0.92] contrast-[1.08] shadow-[0_15px_60px_rgba(0,0,0,0.8)]' 
                                    : 'shadow-[0_20px_70px_rgba(0,0,0,0.25)]'
                            }`}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
