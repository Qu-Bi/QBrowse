import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Download, Upload, Globe, Link as LinkIcon, 
    Check, RefreshCw, AlertCircle, Sparkles, Filter, 
    FileText, Copy, Trash2, ArrowRight, ArrowLeft
} from 'lucide-react';
import { 
    cleanDomain, 
    normalizeRemoteListUrl, 
    parseBlocklistText, 
    parseBlocklistInput,
    isPotentialRemoteListUrl,
    POPULAR_BLOCKLIST_PRESETS 
} from '../../utils/adblockUrlParser';
import { fetchRemoteBlocklist } from '../../services/electronIPC';

export default function AdblockImportModal({ 
    isOpen, 
    onClose, 
    initialUrl = '', 
    initialText = '', 
    existingDomains = [], 
    onImport, 
    isBright 
}) {
    const [mode, setMode] = useState('url'); // 'url' | 'paste'
    const [hoveredMode, setHoveredMode] = useState(null);
    const [urlInput, setUrlInput] = useState(initialUrl);
    const [rawTextInput, setRawTextInput] = useState(initialText);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [parsedResult, setParsedResult] = useState(null);
    const [previewSearch, setPreviewSearch] = useState('');

    const isReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Escape Key Stepping:
    // If the parsed inspection preview is active, step back to the source input form.
    // If already on the source input form, close the import modal.
    // Captured on window in capture phase to stop immediate propagation so the parent SettingsModal does NOT close.
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof e.stopImmediatePropagation === 'function') {
                    e.stopImmediatePropagation();
                }

                if (parsedResult) {
                    // Step 1: Step back from parsed inspection preview to input/preset form
                    setParsedResult(null);
                    setErrorMsg(null);
                    setPreviewSearch('');
                } else {
                    // Step 2: Step out / close the import modal
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen, parsedResult, onClose]);

    useEffect(() => {
        if (isOpen) {
            if (initialUrl) {
                setUrlInput(initialUrl);
                setMode('url');
                // Automatically trigger fetch if an initial URL was passed
                handleFetchUrl(initialUrl);
            } else if (initialText) {
                setRawTextInput(initialText);
                setMode('paste');
                handleParseText(initialText);
            } else {
                setParsedResult(null);
                setErrorMsg(null);
            }
        } else {
            setParsedResult(null);
            setErrorMsg(null);
            setIsLoading(false);
            setPreviewSearch('');
        }
    }, [isOpen, initialUrl, initialText]);

    if (!isOpen) return null;

    const handleSelectPreset = (preset) => {
        const normalized = normalizeRemoteListUrl(preset.url);
        setUrlInput(normalized);
        handleFetchUrl(normalized);
    };

    const handleFetchUrl = async (targetUrlOverride) => {
        const raw = targetUrlOverride || urlInput;
        if (!raw || !raw.trim()) {
            setErrorMsg('Please enter a valid blocklist URL.');
            return;
        }

        const normalized = normalizeRemoteListUrl(raw);
        setUrlInput(normalized);
        setIsLoading(true);
        setErrorMsg(null);
        setParsedResult(null);

        try {
            const res = await fetchRemoteBlocklist(normalized);
            if (!res || !res.success || !res.text) {
                throw new Error(res?.error || 'Failed to fetch remote blocklist');
            }

            const parsed = parseBlocklistText(res.text);
            if (parsed.domains.length === 0) {
                throw new Error('No valid domain names could be parsed from this source.');
            }

            // Calculate new domains not already in existing blocked domains
            const existingSet = new Set(existingDomains.map(d => d.toLowerCase()));
            const newCount = parsed.domains.filter(d => !existingSet.has(d)).length;

            setParsedResult({
                ...parsed,
                sourceUrl: normalized,
                bytes: res.bytes || res.text.length,
                newCount
            });
        } catch (err) {
            setErrorMsg(err.message || 'Error downloading remote list');
        } finally {
            setIsLoading(false);
        }
    };

    const handleParseText = (textOverride) => {
        const text = textOverride !== undefined ? textOverride : rawTextInput;
        if (!text || !text.trim()) {
            setErrorMsg('Please paste some domain or hosts rules first.');
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);
        setParsedResult(null);

        try {
            const parsed = parseBlocklistText(text);
            if (parsed.domains.length === 0) {
                throw new Error('No valid domain names could be extracted from the text.');
            }

            const existingSet = new Set(existingDomains.map(d => d.toLowerCase()));
            const newCount = parsed.domains.filter(d => !existingSet.has(d)).length;

            setParsedResult({
                ...parsed,
                sourceUrl: 'Pasted Text',
                bytes: text.length,
                newCount
            });
        } catch (err) {
            setErrorMsg(err.message || 'Error parsing text');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCommitImport = (replace = false) => {
        if (!parsedResult || parsedResult.domains.length === 0) return;
        onImport(parsedResult.domains, replace);
        onClose();
    };

    const filteredPreviewDomains = parsedResult?.domains?.filter(d => {
        if (!previewSearch.trim()) return true;
        return d.toLowerCase().includes(previewSearch.toLowerCase().trim());
    }) || [];

    const isGitHubUrl = (urlInput || '').includes('github.com') || (urlInput || '').includes('githubusercontent.com');

    const modalContent = (
        <div 
            className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    if (parsedResult) {
                        setParsedResult(null);
                        setErrorMsg(null);
                        setPreviewSearch('');
                    } else {
                        onClose();
                    }
                }
            }}
        >
            <div 
                className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden transition-all duration-300 animate-pop-in ${
                    isBright 
                        ? 'bg-white/95 border-black/10 text-zinc-900 shadow-black/20' 
                        : 'bg-[#0f111a]/95 border-white/10 text-white shadow-black/60'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-4 px-5 border-b flex items-center justify-between shrink-0 ${
                    isBright ? 'border-black/[0.08] bg-black/[0.02]' : 'border-white/[0.06] bg-white/[0.02]'
                }`}>
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isBright ? 'bg-accent/15 text-accent' : 'bg-accent/15 text-accent'
                        }`}>
                            <Download size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight">Import Blocklist from GitHub / Web</h3>
                            <p className={`text-[11px] ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Auto-parse hosts files, GitHub raw lists, or Adblock rules into your custom blocklist.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            isBright 
                                ? 'bg-black/5 hover:bg-black/10 text-zinc-600 border-black/10' 
                                : 'bg-white/5 hover:bg-white/10 text-zinc-400 border-white/10'
                        }`}
                        title="Close"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {/* Mode Selector - Spaces Signature Sliding Pill Switcher */}
                    <div 
                        onMouseLeave={() => setHoveredMode(null)}
                        className={`relative flex items-center p-1 rounded-full border shadow-xs transition-colors duration-200 select-none overflow-hidden ${
                            isBright 
                                ? 'bg-black/[0.03] border-black/[0.05]' 
                                : 'bg-white/[0.04] border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                        }`}
                    >
                        {/* Inner wrapper for sliding pills */}
                        <div className="absolute inset-1 pointer-events-none overflow-hidden">
                            {/* Hover Preview Pill */}
                            <div 
                                className={`absolute top-0 bottom-0 rounded-full transition-all duration-200 pointer-events-none ${
                                    isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                                }`} 
                                style={{ 
                                    left: hoveredMode === 'paste' ? 'calc(50% + 2px)' : '2px',
                                    width: 'calc(50% - 4px)',
                                    opacity: hoveredMode && hoveredMode !== mode ? 1 : 0
                                }}
                            />

                            {/* Signature Liquid Glass Sliding Pill */}
                            <div 
                                className={`absolute top-0 bottom-0 rounded-full border pointer-events-none ${
                                    isReducedMotion ? 'transition-none' : 'transition-[left,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                                } ${
                                    isBright
                                        ? 'bg-white border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                        : 'shadow-xs'
                                }`} 
                                style={{ 
                                    left: mode === 'paste' ? 'calc(50% + 2px)' : '2px',
                                    width: 'calc(50% - 4px)',
                                    ...(!isBright ? {
                                        borderColor: 'var(--accent-30, rgba(212, 188, 148, 0.4))',
                                        backgroundColor: 'var(--accent-15, rgba(212, 188, 148, 0.16))',
                                        boxShadow: '0 2px 10px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                                    } : {})
                                }}
                            />
                        </div>

                        {/* Interactive Tab Buttons */}
                        <button
                            type="button"
                            onMouseEnter={() => setHoveredMode('url')}
                            onClick={() => { 
                                setMode('url'); 
                                setErrorMsg(null); 
                                if (parsedResult && parsedResult.sourceUrl === 'Pasted Text') {
                                    setParsedResult(null);
                                    setPreviewSearch('');
                                }
                            }}
                            className={`relative z-10 flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 active:scale-98 ${
                                mode === 'url'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-200 font-medium')
                            }`}
                        >
                            <Globe size={13} className={`transition-transform duration-200 shrink-0 ${mode === 'url' ? 'scale-110' : ''}`} />
                            <span>Remote URL / GitHub</span>
                        </button>

                        <button
                            type="button"
                            onMouseEnter={() => setHoveredMode('paste')}
                            onClick={() => { 
                                setMode('paste'); 
                                setErrorMsg(null); 
                                if (parsedResult && parsedResult.sourceUrl !== 'Pasted Text') {
                                    setParsedResult(null);
                                    setPreviewSearch('');
                                }
                            }}
                            className={`relative z-10 flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 active:scale-98 ${
                                mode === 'paste'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-200 font-medium')
                            }`}
                        >
                            <FileText size={13} className={`transition-transform duration-200 shrink-0 ${mode === 'paste' ? 'scale-110' : ''}`} />
                            <span>Paste Raw Text</span>
                        </button>
                    </div>

                    {/* Mode 1: Remote URL (When not reviewing parsed results) */}
                    {!parsedResult && mode === 'url' && (
                        <div className="space-y-3">
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1.5 ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                    Blocklist URL (GitHub raw, Gist, or hosts URL)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts"
                                            value={urlInput}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setUrlInput(val);
                                                // Live auto-normalization of GitHub links
                                                if (val.includes('github.com/') && (val.includes('/blob/') || val.includes('/raw/'))) {
                                                    const norm = normalizeRemoteListUrl(val);
                                                    if (norm !== val) {
                                                        setUrlInput(norm);
                                                    }
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleFetchUrl();
                                                }
                                            }}
                                            className={`w-full px-3 py-2 pr-8 rounded-xl text-xs font-mono outline-none border transition ${
                                                isBright 
                                                    ? 'bg-white border-black/15 text-zinc-900 focus:border-accent' 
                                                    : 'bg-black/40 border-white/10 text-white focus:border-accent'
                                            }`}
                                        />
                                        {isGitHubUrl && (
                                            <span 
                                                className="absolute right-2.5 top-2.5 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                                title="GitHub repository link detected and auto-converted to raw format"
                                            >
                                                GitHub Raw
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleFetchUrl()}
                                        disabled={isLoading || !urlInput.trim()}
                                        className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
                                    >
                                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                                        <span>{isLoading ? 'Fetching...' : 'Fetch & Parse'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Popular Presets */}
                            <div>
                                <span className={`text-[11px] font-semibold block mb-1.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Popular Community Blocklists
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {POPULAR_BLOCKLIST_PRESETS.map((p) => {
                                        const isSelected = urlInput === p.url;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleSelectPreset(p)}
                                                className={`p-2.5 px-3 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                                                    isSelected 
                                                        ? (isBright ? 'bg-accent/15 border-accent text-zinc-900' : 'bg-accent/15 border-accent text-white')
                                                        : (isBright ? 'bg-white/80 border-black/[0.08] hover:border-black/20 text-zinc-800' : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 text-zinc-200')
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-semibold truncate">{p.name}</span>
                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${
                                                            isBright ? 'bg-black/5 text-zinc-600' : 'bg-white/10 text-white/60'
                                                        }`}>
                                                            {p.badge}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[10px] truncate mt-0.5 ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        {p.desc}
                                                    </p>
                                                </div>
                                                <ArrowRight size={12} className="shrink-0 opacity-40" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode 2: Direct Paste (When not reviewing parsed results) */}
                    {!parsedResult && mode === 'paste' && (
                        <div className="space-y-3">
                            <label className={`block text-[11px] font-semibold mb-1 ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                Paste hosts file, ABP filter rules, or domain list
                            </label>
                            <textarea
                                rows={6}
                                placeholder={"# Paste any format below:\n0.0.0.0 tracking.evil.com\n127.0.0.1 ads.adserver.org\n||telemetry.network.io^\nanalytics.badsite.com"}
                                value={rawTextInput}
                                onChange={(e) => setRawTextInput(e.target.value)}
                                className={`w-full p-3 rounded-xl text-xs font-mono outline-none border transition resize-none ${
                                    isBright 
                                        ? 'bg-white border-black/15 text-zinc-900 focus:border-accent' 
                                        : 'bg-black/40 border-white/10 text-white focus:border-accent'
                                }`}
                            />
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => handleParseText()}
                                    disabled={isLoading || !rawTextInput.trim()}
                                    className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs active:scale-95"
                                >
                                    <Sparkles size={13} className={isLoading ? 'animate-spin' : ''} />
                                    <span>{isLoading ? 'Parsing...' : 'Parse Domains'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error display */}
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Parsed Inspection & Results Preview with Esc Key Stepping Support */}
                    {parsedResult && (
                        <div className={`p-4 rounded-xl border space-y-3 animate-fade-in ${
                            isBright ? 'bg-black/[0.02] border-black/[0.08]' : 'bg-white/[0.02] border-white/[0.06]'
                        }`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setParsedResult(null);
                                            setErrorMsg(null);
                                            setPreviewSearch('');
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                                            isBright 
                                                ? 'bg-white hover:bg-black/5 text-zinc-700 border-black/10 shadow-xs' 
                                                : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                                        }`}
                                        title="Step back to source input (Esc)"
                                    >
                                        <ArrowLeft size={12} />
                                        <span>Back</span>
                                        <kbd className={`text-[10px] font-mono px-1 py-0.2 rounded border ml-0.5 ${
                                            isBright ? 'bg-black/5 border-black/10 text-zinc-500' : 'bg-white/10 border-white/10 text-white/50'
                                        }`}>
                                            Esc
                                        </kbd>
                                    </button>
                                    <div className="flex items-center gap-1.5 ml-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className={`text-xs font-bold ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                            Ready to Import
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border truncate max-w-[240px] ${
                                        isBright ? 'bg-white border-black/10 text-zinc-600' : 'bg-white/5 border-white/10 text-white/60'
                                    }`} title={parsedResult.sourceUrl}>
                                        {parsedResult.sourceUrl}
                                    </span>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                        isBright ? 'bg-white border-black/10 text-zinc-600' : 'bg-white/5 border-white/10 text-white/60'
                                    }`}>
                                        {(parsedResult.bytes / 1024).toFixed(1)} KB source
                                    </span>
                                </div>
                            </div>

                            {/* Stat Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className={`p-2.5 rounded-lg border text-center ${
                                    isBright ? 'bg-white border-black/[0.06]' : 'bg-white/[0.03] border-white/[0.06]'
                                }`}>
                                    <span className="text-base font-black font-mono text-emerald-400 block">
                                        {parsedResult.validCount.toLocaleString()}
                                    </span>
                                    <span className={`text-[10px] font-semibold ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        Valid Domains
                                    </span>
                                </div>
                                <div className={`p-2.5 rounded-lg border text-center ${
                                    isBright ? 'bg-white border-black/[0.06]' : 'bg-white/[0.03] border-white/[0.06]'
                                }`}>
                                    <span className="text-base font-black font-mono text-accent block">
                                        {parsedResult.newCount.toLocaleString()}
                                    </span>
                                    <span className={`text-[10px] font-semibold ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        New Unique
                                    </span>
                                </div>
                                <div className={`p-2.5 rounded-lg border text-center ${
                                    isBright ? 'bg-white border-black/[0.06]' : 'bg-white/[0.03] border-white/[0.06]'
                                }`}>
                                    <span className="text-base font-black font-mono opacity-80 block">
                                        {parsedResult.duplicatesCount.toLocaleString()}
                                    </span>
                                    <span className={`text-[10px] font-semibold ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        Duplicates Filtered
                                    </span>
                                </div>
                                <div className={`p-2.5 rounded-lg border text-center ${
                                    isBright ? 'bg-white border-black/[0.06]' : 'bg-white/[0.03] border-white/[0.06]'
                                }`}>
                                    <span className="text-base font-black font-mono opacity-80 block">
                                        {parsedResult.totalLines.toLocaleString()}
                                    </span>
                                    <span className={`text-[10px] font-semibold ${isBright ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        Lines Analyzed
                                    </span>
                                </div>
                            </div>

                            {/* Domain Preview Filter & Cloud */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                    <span className={`text-[11px] font-semibold ${isBright ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                        Extracted Domains Sample ({filteredPreviewDomains.length.toLocaleString()})
                                    </span>
                                    <div className="w-44">
                                        <input
                                            type="text"
                                            placeholder="Search sample..."
                                            value={previewSearch}
                                            onChange={(e) => setPreviewSearch(e.target.value)}
                                            className={`w-full px-2 py-0.5 rounded-lg text-[11px] font-mono outline-none border ${
                                                isBright 
                                                    ? 'bg-white border-black/10 text-zinc-800' 
                                                    : 'bg-black/30 border-white/10 text-zinc-200'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <div className={`p-2 rounded-xl border max-h-40 overflow-y-auto flex flex-wrap gap-1 hide-scroll ${
                                    isBright ? 'bg-white border-black/[0.06]' : 'bg-black/30 border-white/[0.05]'
                                }`}>
                                    {filteredPreviewDomains.slice(0, 100).map((d) => (
                                        <span 
                                            key={d} 
                                            className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                                                isBright 
                                                    ? 'bg-black/[0.03] border-black/5 text-zinc-700' 
                                                    : 'bg-white/[0.04] border-white/10 text-zinc-300'
                                            }`}
                                        >
                                            {d}
                                        </span>
                                    ))}
                                    {filteredPreviewDomains.length > 100 && (
                                        <span className={`text-[11px] font-mono px-2 py-0.5 italic ${
                                            isBright ? 'text-zinc-400' : 'text-white/40'
                                        }`}>
                                            + {(filteredPreviewDomains.length - 100).toLocaleString()} more domains
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className={`p-4 px-5 border-t flex items-center justify-between shrink-0 ${
                    isBright ? 'border-black/[0.08] bg-black/[0.02]' : 'border-white/[0.06] bg-white/[0.02]'
                }`}>
                    <button
                        type="button"
                        onClick={() => {
                            if (parsedResult) {
                                setParsedResult(null);
                                setErrorMsg(null);
                                setPreviewSearch('');
                            } else {
                                onClose();
                            }
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                            isBright 
                                ? 'bg-white border-black/15 text-zinc-700 hover:bg-black/5' 
                                : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                        }`}
                    >
                        {parsedResult && <ArrowLeft size={12} />}
                        <span>{parsedResult ? 'Back to Source' : 'Cancel'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {parsedResult && existingDomains.length > 0 && (
                            <button
                                type="button"
                                onClick={() => handleCommitImport(true)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer text-rose-400 hover:bg-rose-500/10 border-rose-500/20 active:scale-95`}
                                title="Replaces your existing custom blocklist with the parsed domains"
                            >
                                Replace Entire List
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleCommitImport(false)}
                            disabled={!parsedResult || parsedResult.domains.length === 0}
                            className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-bold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs active:scale-95"
                        >
                            <Check size={14} />
                            <span>
                                {parsedResult 
                                    ? `Import ${parsedResult.newCount.toLocaleString()} Domains` 
                                    : 'Import Domains'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
}

