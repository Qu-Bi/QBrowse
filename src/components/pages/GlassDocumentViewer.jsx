import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Copy, Check, FileText, Code2, Image as ImageIcon, Film, Music, 
    ExternalLink, ZoomIn, ZoomOut, Maximize2, Sparkles, Eye, FileCode
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function GlassDocumentViewer({ url, filePath, fileName, extension, type }) {
    const theme = useUIStore(state => state.theme);
    const showToast = useUIStore(state => state.showToast);
    const isBright = theme === 'light';

    const [fileData, setFileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [markdownMode, setMarkdownMode] = useState('preview'); // 'preview' | 'raw'
    const [imageZoom, setImageZoom] = useState(1);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const loadContent = async () => {
            try {
                if (window.electronAPI?.readLocalFileData) {
                    const res = await window.electronAPI.readLocalFileData(filePath || url);
                    if (!isMounted) return;
                    if (res?.error) {
                        setError(res.error);
                    } else {
                        setFileData(res);
                    }
                } else {
                    // Web fallback
                    const res = await fetch(url);
                    const text = await res.text();
                    if (!isMounted) return;
                    setFileData({ content: text, isText: true, name: fileName || 'File' });
                }
            } catch (e) {
                if (!isMounted) return;
                setError(e.message || 'Failed to read file');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadContent();

        return () => {
            isMounted = false;
        };
    }, [url, filePath]);

    const handleCopy = () => {
        if (!fileData?.content) return;
        navigator.clipboard.writeText(fileData.content);
        setCopied(true);
        showToast('Copied content to clipboard');
        setTimeout(() => setCopied(false), 1500);
    };

    const handleRevealFile = () => {
        const target = filePath || url;
        if (target && window.electronAPI?.showInFolder) {
            window.electronAPI.showInFolder(target);
            showToast('Revealed file in system folder');
        }
    };

    const ext = (extension || '').toLowerCase().replace('.', '');
    const isMarkdown = ext === 'md' || type === 'markdown';
    const isMediaImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext);
    const isMediaVideo = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'm4v'].includes(ext);
    const isMediaAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus'].includes(ext);

    const [blobUrl, setBlobUrl] = useState(null);

    useEffect(() => {
        if (!fileData?.base64) {
            setBlobUrl(null);
            return;
        }

        try {
            const binary = atob(fileData.base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const mimeType = fileData.mime || (isMediaAudio 
                ? (ext === 'mp3' ? 'audio/mpeg' : (ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`))
                : (isMediaVideo ? (ext === 'mkv' ? 'video/x-matroska' : `video/${ext}`) : 'application/octet-stream'));
            const blob = new Blob([bytes], { type: mimeType });
            const objUrl = URL.createObjectURL(blob);
            setBlobUrl(objUrl);

            return () => {
                URL.revokeObjectURL(objUrl);
            };
        } catch (e) {
            console.error('[Document Viewer] Failed to create media blob:', e);
        }
    }, [fileData?.base64, fileData?.mime, isMediaAudio, isMediaVideo, ext]);

    const mediaSrc = blobUrl || (fileData?.base64 
        ? `data:${fileData.mime || (isMediaAudio ? 'audio/mpeg' : 'application/octet-stream')};base64,${fileData.base64}` 
        : url);

    return (
        <div className={`w-full h-full flex flex-col overflow-hidden font-sans select-none ${
            isBright ? 'bg-zinc-50 text-zinc-900' : 'bg-[#0c0d11] text-zinc-100'
        }`}>
            {/* Frosted Glass Toolbar */}
            <header className={`px-6 py-3 flex items-center justify-between gap-4 border-b backdrop-blur-2xl z-20 shrink-0 ${
                isBright ? 'bg-white/85 border-black/10' : 'bg-[#13141a]/85 border-white/10'
            }`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent border border-accent/25 flex items-center justify-center flex-shrink-0">
                        {isMarkdown ? <FileText size={16} /> : isMediaImage ? <ImageIcon size={16} /> : isMediaVideo ? <Film size={16} /> : isMediaAudio ? <Music size={16} /> : <FileCode size={16} />}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xs font-bold truncate max-w-sm" title={fileName || fileData?.name}>
                            {fileName || fileData?.name || 'Local Document'}
                        </h2>
                        {fileData?.size && (
                            <p className="text-[10px] text-zinc-500 font-mono">
                                {(fileData.size / 1024).toFixed(1)} KB • {ext.toUpperCase()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Markdown Mode Toggle */}
                    {isMarkdown && (
                        <div className={`flex items-center p-0.5 rounded-xl border text-xs font-semibold ${
                            isBright ? 'bg-black/[0.04] border-black/10' : 'bg-white/5 border-white/10'
                        }`}>
                            <button
                                onClick={() => setMarkdownMode('preview')}
                                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                                    markdownMode === 'preview' 
                                        ? 'bg-accent text-black font-bold shadow-sm' 
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Eye size={12} /> Preview
                            </button>
                            <button
                                onClick={() => setMarkdownMode('raw')}
                                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                                    markdownMode === 'raw' 
                                        ? 'bg-accent text-black font-bold shadow-sm' 
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Code2 size={12} /> Raw
                            </button>
                        </div>
                    )}

                    {/* Image Zoom Controls */}
                    {isMediaImage && (
                        <div className={`flex items-center p-0.5 rounded-xl border text-xs ${
                            isBright ? 'bg-black/[0.04] border-black/10' : 'bg-white/5 border-white/10'
                        }`}>
                            <button
                                onClick={() => setImageZoom(z => Math.max(z - 0.25, 0.25))}
                                title="Zoom Out"
                                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                            >
                                <ZoomOut size={13} />
                            </button>
                            <span className="px-1.5 font-mono text-[11px] font-semibold min-w-[36px] text-center">
                                {Math.round(imageZoom * 100)}%
                            </span>
                            <button
                                onClick={() => setImageZoom(z => Math.min(z + 0.25, 4))}
                                title="Zoom In"
                                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                            >
                                <ZoomIn size={13} />
                            </button>
                            <button
                                onClick={() => setImageZoom(1)}
                                title="Reset Zoom"
                                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </div>
                    )}

                    {/* Copy Text Button */}
                    {fileData?.isText && (
                        <button
                            onClick={handleCopy}
                            title="Copy File Content"
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isBright 
                                    ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800' 
                                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                            }`}
                        >
                            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    )}

                    {/* Open in File Manager */}
                    <button
                        onClick={handleRevealFile}
                        title="Reveal in System Folder"
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                            isBright ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                    >
                        <ExternalLink size={13} />
                    </button>
                </div>
            </header>

            {/* Viewer Content Area */}
            <main className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col custom-scrollbar">
                {loading ? (
                    <div className="m-auto flex flex-col items-center gap-2 text-zinc-400">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs">Loading document...</p>
                    </div>
                ) : error ? (
                    <div className="m-auto max-w-md p-6 rounded-3xl border border-red-500/20 bg-red-500/10 text-center space-y-3">
                        <FileCode size={28} className="text-red-400 mx-auto" />
                        <h3 className="text-sm font-bold text-white">Unable to Display File</h3>
                        <p className="text-xs text-zinc-400">{error}</p>
                    </div>
                ) : isMediaImage ? (
                    /* Image Viewer */
                    <div className="m-auto flex items-center justify-center p-4 overflow-auto max-w-full max-h-full">
                        <img 
                            src={mediaSrc} 
                            alt={fileName}
                            style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
                            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl transition-transform duration-200 border border-white/10 object-contain"
                        />
                    </div>
                ) : isMediaVideo ? (
                    /* Video Player */
                    <div className="m-auto max-w-4xl w-full flex items-center justify-center">
                        <video 
                            controls 
                            autoPlay 
                            src={mediaSrc} 
                            className="w-full rounded-2xl shadow-2xl border border-white/10"
                        />
                    </div>
                ) : isMediaAudio ? (
                    /* Audio Player */
                    <div className="m-auto max-w-md w-full p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl text-center space-y-4 shadow-2xl">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                            <Music size={28} />
                        </div>
                        <h3 className="text-sm font-bold truncate">{fileName}</h3>
                        <audio controls autoPlay src={mediaSrc} className="w-full mt-2" />
                    </div>
                ) : isMarkdown && markdownMode === 'preview' ? (
                    /* Rendered Markdown */
                    <div className="max-w-4xl mx-auto w-full py-4 select-text">
                        <article className={`prose max-w-none text-sm leading-relaxed ${
                            isBright ? 'prose-zinc' : 'prose-invert'
                        }`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {fileData?.content || ''}
                            </ReactMarkdown>
                        </article>
                    </div>
                ) : (
                    /* Monospace Code / Text Viewer with Line Numbers */
                    <div className={`rounded-2xl border overflow-hidden max-w-5xl mx-auto w-full select-text shadow-xl shrink-0 ${
                        isBright ? 'bg-white border-black/10' : 'bg-black/40 border-white/10'
                    }`}>
                        <div className="flex font-mono text-xs overflow-x-auto custom-scrollbar">
                            {/* Line Numbers */}
                            <div className={`p-4 pr-3 select-none text-right border-r flex flex-col shrink-0 sticky left-0 z-10 ${
                                isBright ? 'bg-zinc-100 border-black/10 text-zinc-400' : 'bg-[#121318] border-white/10 text-zinc-600'
                            }`}>
                                {(fileData?.content || '').split('\n').map((_, idx) => (
                                    <span key={idx} className="leading-6">{idx + 1}</span>
                                ))}
                            </div>

                            {/* Code Text */}
                            <div className={`p-4 flex-1 whitespace-pre leading-6 ${
                                isBright ? 'text-zinc-800' : 'text-zinc-300'
                            }`}>
                                {(fileData?.content || '')}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
