import React, { useState, useEffect, useMemo } from 'react';
import { Archive, Search, X, ExternalLink, Copy, Check, Trash2, Globe } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import useTabStore from '../../store/useTabStore';
import { cleanAndDeduplicateHistory, formatDisplayDomain } from '../../utils/historyExtractors';

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
        const d = new Date(timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

export default function HistoryModal() {
    const {
        activeModal,
        isModalClosing,
        closeModal,
        historySearchQuery,
        setHistorySearchQuery,
        theme
    } = useUIStore();
    const history = useHistoryStore(state => state.history);
    const clearHistory = useHistoryStore(state => state.clearHistory);
    const deleteEntry = useHistoryStore(state => state.deleteEntry);
    const activeSpace = useTabStore(state => state.activeSpace);

    const [copiedUrl, setCopiedUrl] = useState(null);
    const [selectedSegment, setSelectedSegment] = useState('all');

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'history';

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeModal]);

    // Cleaned, intelligently enriched, and deduplicated history items
    // Coalesces Google Maps pan/zoom spam, search redirect spam, and SPA states
    const cleanedHistory = useMemo(() => {
        return cleanAndDeduplicateHistory(history);
    }, [history]);

    const handleClearHistory = () => {
        clearHistory();
        setHistorySearchQuery('');
        useUIStore.getState().showToast('Archive cleared');
    };

    const handleDeleteItem = (e, url) => {
        e.stopPropagation();
        deleteEntry(url);
    };

    const handleCopyUrl = (e, url) => {
        e.stopPropagation();
        if (!url) return;
        navigator.clipboard?.writeText(url);
        setCopiedUrl(url);
        useUIStore.getState().showToast('Copied link');
        setTimeout(() => setCopiedUrl(null), 1500);
    };

    const handleOpenUrl = (url, inBackground = false) => {
        if (!url) return;
        if (inBackground) {
            useTabStore.getState().handleNewTab(url, false);
            useUIStore.getState().showToast('Opened in background tab');
        } else {
            const activeTab = useTabStore.getState().getActiveTab();
            if (activeTab) {
                useTabStore.getState().handleNavigateTab(activeTab.id, url);
            } else {
                useTabStore.getState().handleAddTab('personal', url);
            }
            closeModal();
        }
    };

    // Filter by search query
    const query = (historySearchQuery || '').trim().toLowerCase();
    const searchedHistory = useMemo(() => {
        if (!query) return cleanedHistory;
        return cleanedHistory.filter(item => 
            (item.displayTitle && item.displayTitle.toLowerCase().includes(query)) ||
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.url && item.url.toLowerCase().includes(query)) ||
            (item.domain && item.domain.toLowerCase().includes(query))
        );
    }, [cleanedHistory, query]);

    // Grouping by time
    const groups = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const lastWeek = today - 86400000 * 7;

        const res = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };
        searchedHistory.forEach(item => {
            const time = item.lastVisit || 0;
            if (time >= today) {
                res.Today.push(item);
            } else if (time >= yesterday) {
                res.Yesterday.push(item);
            } else if (time >= lastWeek) {
                res['Last 7 Days'].push(item);
            } else {
                res.Older.push(item);
            }
        });
        return res;
    }, [searchedHistory]);

    // Segments with accurate live counts
    const availableSegments = useMemo(() => [
        { id: 'all', label: 'All', count: searchedHistory.length },
        { id: 'today', label: 'Today', count: groups.Today.length },
        { id: 'yesterday', label: 'Yesterday', count: groups.Yesterday.length },
        { id: 'week', label: 'Last 7 Days', count: groups['Last 7 Days'].length },
        { id: 'older', label: 'Older', count: groups.Older.length }
    ].filter(s => s.count > 0 || s.id === 'all'), [searchedHistory.length, groups]);

    // Active displayed groups based on selectedSegment
    const displayedGroups = useMemo(() => {
        const allGroups = [
            { id: 'today', name: 'Today', items: groups.Today },
            { id: 'yesterday', name: 'Yesterday', items: groups.Yesterday },
            { id: 'week', name: 'Last 7 Days', items: groups['Last 7 Days'] },
            { id: 'older', name: 'Older', items: groups.Older }
        ];
        return allGroups.filter(g => {
            if (g.items.length === 0) return false;
            if (selectedSegment === 'all') return true;
            return g.id === selectedSegment;
        });
    }, [groups, selectedSegment]);

    if (activeModal !== 'history' && !isClosingThis) return null;

    let globalRowIndex = 0;

    const renderHistoryRow = (item, animIndex) => (
        <div 
            key={`${item.url}-${item.lastVisit || animIndex}`}
            onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    handleOpenUrl(item.url, true);
                } else {
                    handleOpenUrl(item.url, false);
                }
            }}
            style={{ animationDelay: `${Math.min(animIndex * 15, 300)}ms` }}
            className={`group flex items-center justify-between p-2.5 px-3 rounded-xl cursor-pointer transition-all border border-transparent animate-tab-fade select-none ${
                isBright 
                    ? 'hover:bg-black/[0.04] hover:border-black/[0.06] active:bg-black/[0.06]' 
                    : 'hover:bg-white/[0.05] hover:border-white/[0.08] active:bg-white/[0.08]'
            }`}
        >
            {/* Left Side: Favicon + Clean Human Title + Subtitle Domain */}
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                {/* Favicon */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border ${
                    isBright ? 'bg-black/[0.03] border-black/[0.06]' : 'bg-white/[0.04] border-white/[0.08]'
                }`}>
                    <img 
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} 
                        alt="" 
                        className="w-4 h-4 object-contain"
                        onError={(e) => { 
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'block';
                            }
                        }} 
                    />
                    <Globe size={13} className={`hidden ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`} />
                </div>

                {/* Clean Title & Domain */}
                <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-xs font-semibold truncate leading-snug ${
                        isBright ? 'text-zinc-900 group-hover:text-accent' : 'text-zinc-100 group-hover:text-white'
                    }`}>
                        {item.displayTitle || item.title || item.url}
                    </span>
                    <span className={`text-[11px] truncate mt-0.5 ${
                        isBright ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                        {item.domain || formatDisplayDomain(item.url)}
                    </span>
                </div>
            </div>

            {/* Right Side: Quick Action Buttons & Clean Timestamp */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={(e) => handleCopyUrl(e, item.url)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            isBright 
                                ? 'hover:bg-black/[0.06] text-zinc-500 hover:text-zinc-800' 
                                : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
                        }`}
                        title="Copy link"
                    >
                        {copiedUrl === item.url ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUrl(item.url, true);
                        }}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            isBright 
                                ? 'hover:bg-black/[0.06] text-zinc-500 hover:text-zinc-800' 
                                : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
                        }`}
                        title="Open in new tab"
                    >
                        <ExternalLink size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, item.url)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            isBright 
                                ? 'hover:bg-red-50 text-zinc-400 hover:text-red-600' 
                                : 'hover:bg-red-500/10 text-zinc-500 hover:text-red-400'
                        }`}
                        title="Remove from archive"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>

                <span className={`text-[11px] tabular-nums font-mono text-right min-w-12 ${
                    isBright ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                    {formatTime(item.lastVisit)}
                </span>
            </div>
        </div>
    );

    return (
        <div 
            className={`absolute inset-0 z-[200] flex items-center justify-center p-6 ${
                isBright ? 'bg-black/30 backdrop-blur-xl text-zinc-900' : 'bg-black/50 backdrop-blur-2xl text-white'
            } font-sans ${isModalClosing ? 'animate-modal-out' : 'animate-modal'}`} 
            onClick={closeModal}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div 
                id="history-modal"
                className={`w-[1020px] max-w-[95vw] h-[88vh] max-h-[920px] rounded-3xl overflow-hidden flex flex-col ${
                    isModalClosing ? 'animate-modal-dialog-out' : 'animate-modal-dialog'
                } ${
                    isBright 
                        ? 'bg-white/80 backdrop-blur-3xl border border-black/[0.08] shadow-[0_30px_90px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-black/[0.04] text-zinc-900' 
                        : 'bg-[#0c0d14]/78 backdrop-blur-3xl border border-white/12 shadow-[0_35px_90px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] ring-1 ring-white/[0.06] text-white'
                }`} 
                onClick={e => e.stopPropagation()}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
            >
                {/* Header */}
                <div className={`p-4 px-6 border-b flex justify-between items-center ${
                    isBright ? 'border-black/[0.06] bg-black/[0.015]' : 'border-white/[0.06] bg-white/[0.02]'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
                            isBright ? 'bg-accent/15 border-accent/30 text-zinc-900' : 'bg-accent/10 border-accent/25 text-accent'
                        }`}>
                            <Archive size={18} strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight">Archive</h2>
                            <span className={`text-[11px] font-medium ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                {cleanedHistory.length} {cleanedHistory.length === 1 ? 'entry' : 'entries'} saved
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Rounded-full Search Bar */}
                        <div className="relative">
                            <Search size={13} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                                isBright ? 'text-zinc-400' : 'text-white/35'
                            }`} />
                            <input
                                type="text"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                                placeholder="Search archive..."
                                className={`border rounded-full py-1.5 pl-9 pr-7 text-xs focus:outline-none transition-all w-64 sm:w-80 ${
                                    isBright 
                                        ? 'bg-black/[0.03] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent focus:bg-white' 
                                        : 'bg-white/[0.04] border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:bg-white/[0.07]'
                                }`}
                                autoFocus
                            />
                            {historySearchQuery && (
                                <button 
                                    onClick={() => setHistorySearchQuery('')} 
                                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs ${
                                        isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Rounded-full Clear All */}
                        {cleanedHistory.length > 0 && (
                            <button 
                                onClick={handleClearHistory} 
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer border ${
                                    isBright 
                                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                }`}
                                title="Clear all browsing history"
                            >
                                Clear
                            </button>
                        )}

                        {/* Rounded-full Close Modal */}
                        <button 
                            onClick={closeModal} 
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer border ${
                                isBright 
                                    ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-600' 
                                    : 'bg-white/[0.05] hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                            }`}
                            title="Close (Esc)"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Top Segmented Pill Filter Bar */}
                {availableSegments.length > 1 && (
                    <div className={`px-6 py-2.5 border-b flex items-center gap-1.5 overflow-x-auto hide-scroll ${
                        isBright ? 'border-black/[0.05] bg-black/[0.01]' : 'border-white/[0.05] bg-white/[0.01]'
                    }`}>
                        {availableSegments.map(seg => (
                            <button
                                key={seg.id}
                                onClick={() => setSelectedSegment(seg.id)}
                                className={`px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                                    selectedSegment === seg.id
                                        ? (isBright 
                                            ? 'bg-zinc-900 text-white shadow-xs font-semibold' 
                                            : 'bg-white text-zinc-950 shadow-xs font-semibold')
                                        : (isBright 
                                            ? 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04] font-medium' 
                                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-medium')
                                }`}
                            >
                                <span>{seg.label}</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                    selectedSegment === seg.id
                                        ? (isBright ? 'bg-white/20 text-white' : 'bg-black/20 text-zinc-950')
                                        : (isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-zinc-400')
                                }`}>
                                    {seg.count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Segmented Content Cards */}
                <div className="flex-1 overflow-y-auto hide-scroll p-6 space-y-5">
                    {displayedGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-28 animate-tab-fade">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border shadow-xs ${
                                isBright ? 'bg-black/[0.03] border-black/[0.06] text-zinc-400' : 'bg-white/[0.03] border-white/[0.06] text-zinc-500'
                            }`}>
                                <Archive size={22} strokeWidth={1.75} />
                            </div>
                            <p className={`text-xs font-semibold mb-1 ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                {query ? `No results matching "${historySearchQuery}"` : 'Archive is empty'}
                            </p>
                            <p className={`text-[11px] max-w-xs ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                {query ? 'Try checking your spelling or selecting another filter.' : 'Pages you visit will be saved here for quick reference.'}
                            </p>
                        </div>
                    ) : (
                        displayedGroups.map(group => (
                            <div 
                                key={group.id}
                                className={`rounded-2xl border overflow-hidden ${
                                    isBright 
                                        ? 'bg-black/[0.02] border-black/[0.08] shadow-xs' 
                                        : 'bg-white/[0.03] border-white/10 shadow-sm'
                                }`}
                            >
                                {/* Segment Card Header */}
                                <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                                    isBright ? 'border-black/[0.06] bg-black/[0.02]' : 'border-white/[0.08] bg-white/[0.025]'
                                }`}>
                                    <span className={`text-xs font-bold ${isBright ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                        {group.name}
                                    </span>
                                    <span className={`text-[11px] font-mono ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                        {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                                    </span>
                                </div>

                                {/* Segment Card Items */}
                                <div className="p-1.5 flex flex-col gap-0.5">
                                    {group.items.map((item) => renderHistoryRow(item, globalRowIndex++))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
