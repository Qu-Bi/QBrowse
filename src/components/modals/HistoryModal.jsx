import React from 'react';
import { Clock, Search, X, ExternalLink } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import useTabStore from '../../store/useTabStore';

const HistoryModal = () => {
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
    const activeSpace = useTabStore(state => state.activeSpace);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const isClosingThis = isModalClosing && useUIStore.getState().closingModal === 'history';
    if (activeModal !== 'history' && !isClosingThis) return null;

    const handleClearHistory = () => {
        clearHistory();
        setHistorySearchQuery('');
        useUIStore.getState().showToast('Browsing history cleared');
    };

    const handleOpenUrl = (url) => {
        if (!url) return;
        const activeTab = useTabStore.getState().getActiveTab();
        if (activeTab) {
            useTabStore.getState().handleNavigateTab(activeTab.id, url);
        } else {
            useTabStore.getState().handleAddTab('personal', url);
        }
        closeModal();
    };

    return (
        <div 
            className={`absolute inset-0 z-[200] flex items-center justify-center p-6 ${isBright ? 'bg-black/25 backdrop-blur-md text-zinc-900' : 'bg-black/35 backdrop-blur-md text-white'} font-sans ${isModalClosing ? 'animate-modal-out' : 'animate-modal'}`} 
            onClick={closeModal}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div 
                id="history-modal"
                className={`w-full max-w-3xl h-[80vh] min-h-[500px] rounded-3xl overflow-hidden flex flex-col ${
                    isModalClosing ? 'animate-modal-dialog-out' : 'animate-modal-dialog'
                } ${
                    isBright 
                        ? 'bg-white/80 backdrop-blur-3xl border border-black/[0.08] shadow-[0_30px_90px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-black/[0.04] text-zinc-900' 
                        : 'bg-[#0c0d14]/78 backdrop-blur-3xl border border-white/12 shadow-[0_35px_90px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] ring-1 ring-white/[0.06] text-white'
                }`} 
                onClick={e => e.stopPropagation()}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
            >
                <div className={`p-5 px-6 border-b flex justify-between items-center ${isBright ? 'border-black/[0.06] bg-black/[0.015]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs ${
                            isBright ? 'bg-accent/15 border-accent/30 text-zinc-900' : 'bg-accent/10 border-accent/25 text-accent'
                        }`}>
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                Archive
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[11px] font-medium ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                    {history.length} {history.length === 1 ? 'entry' : 'entries'} saved
                                </span>
                                <span className={`w-1 h-1 rounded-full ${isBright ? 'bg-zinc-300' : 'bg-white/20'}`} />
                                <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Synced
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <Search size={13} className={`absolute left-3.5 top-2.5 ${isBright ? 'text-zinc-400' : 'text-white/35'}`} />
                            <input
                                type="text"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                                placeholder="Search history..."
                                className={`border rounded-full py-1.5 pl-9 pr-7 text-xs focus:outline-none transition-all w-56 md:w-64 ${
                                    isBright 
                                        ? 'bg-black/[0.03] border-black/10 text-zinc-900 placeholder-zinc-400 focus:border-accent focus:bg-white' 
                                        : 'bg-white/[0.04] border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:bg-white/[0.07]'
                                }`}
                            />
                            {historySearchQuery && (
                                <button 
                                    onClick={() => setHistorySearchQuery('')} 
                                    className={`absolute right-2.5 top-2 text-xs ${isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white'}`}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {history.length > 0 && (
                            <button 
                                onClick={handleClearHistory} 
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer border ${
                                    isBright 
                                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                }`}
                            >
                                Clear
                            </button>
                        )}
                        <button 
                            onClick={closeModal} 
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer border ${
                                isBright 
                                    ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-600' 
                                    : 'bg-white/[0.05] hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                            }`}
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto hide-scroll p-6 space-y-6">

                    {historySearchQuery ? (
                        <div className="animate-tab-fade">
                            <h3 className="text-xs font-bold uppercase text-accent tracking-widest mb-3 pl-1">Search Results</h3>
                            <div className="flex flex-col gap-2">
                                {history.filter(item => item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) || item.url.toLowerCase().includes(historySearchQuery.toLowerCase())).length > 0 ? (
                                    history.filter(item => item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) || item.url.toLowerCase().includes(historySearchQuery.toLowerCase())).map((item, i) => (
                                        <div 
                                            key={item.url} 
                                            onClick={() => handleOpenUrl(item.url)}
                                            className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer border animate-tab-fade ${
                                                isBright 
                                                    ? 'hover:bg-black/[0.03] border-transparent hover:border-black/[0.06] hover:shadow-xs' 
                                                    : 'hover:bg-white/[0.04] border-transparent hover:border-white/[0.08] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                                            }`} 
                                            style={{ animationFillMode: 'both', animationDelay: `${i * 0.04}s` }}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition overflow-hidden ${
                                                isBright ? 'bg-black/5 text-zinc-500 group-hover:text-accent' : 'bg-white/5 text-white/40 group-hover:text-accent'
                                            }`}>
                                                <img src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} alt="icon" className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className={`text-sm font-semibold transition truncate ${
                                                    isBright ? 'text-zinc-900 group-hover:text-accent' : 'text-white/90 group-hover:text-white'
                                                }`}>{item.title}</span>
                                                <span className={`text-xs truncate ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>{item.url}</span>
                                            </div>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition flex-shrink-0 ${
                                                isBright 
                                                    ? 'text-zinc-600 bg-black/5 border border-black/10 group-hover:text-purple-600 group-hover:border-purple-400/40' 
                                                    : 'text-white/40 bg-white/5 border border-white/10 group-hover:text-purple-300 group-hover:border-purple-500/30'
                                            }`}>
                                                {item.visits || 1} {item.visits === 1 ? 'visit' : 'visits'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className={`p-8 text-center font-medium animate-tab-fade ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>No results for "{historySearchQuery}"</div>
                                )}
                            </div>
                        </div>
                    ) : (() => {
                        const groups = {};
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                        const yesterday = today - 86400000;
                        
                        history.forEach(item => {
                            const time = item.lastVisit;
                            let groupName = 'Older';
                            if (time >= today) {
                                groupName = 'Today';
                            } else if (time >= yesterday) {
                                groupName = 'Yesterday';
                            } else if (time >= today - 86400000 * 7) {
                                groupName = 'Last 7 Days';
                            }
                            
                            if (!groups[groupName]) groups[groupName] = [];
                            groups[groupName].push(item);
                        });
                        
                        const groupedHistory = [
                            { name: 'Today', items: groups['Today'] || [] },
                            { name: 'Yesterday', items: groups['Yesterday'] || [] },
                            { name: 'Last 7 Days', items: groups['Last 7 Days'] || [] },
                            { name: 'Older', items: groups['Older'] || [] },
                        ].filter(g => g.items.length > 0);

                        let globalIndex = 0;

                        if (groupedHistory.length === 0) {
                            return (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-16 animate-tab-fade">
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border shadow-xs ${
                                        isBright ? 'bg-black/[0.03] border-black/[0.06] text-zinc-400' : 'bg-white/[0.03] border-white/[0.06] text-white/30'
                                    }`}>
                                        <Clock size={30} />
                                    </div>
                                    <p className={`text-sm font-semibold ${isBright ? 'text-zinc-800' : 'text-white/90'} mb-1`}>
                                        No Browsing History Yet
                                    </p>
                                    <p className={`text-xs max-w-sm leading-relaxed ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                        Pages you visit in standard and work spaces will be archived here with fast instant search.
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div className="animate-tab-fade space-y-6">
                                {groupedHistory.map(group => (
                                    <div key={group.name}>
                                        <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 pl-1 ${isBright ? 'text-zinc-500' : 'text-white/30'}`}>{group.name}</h3>
                                        <div className="flex flex-col gap-2">
                                            {group.items.map((item) => {
                                                const i = globalIndex++;
                                                return (
                                                <div 
                                                    key={item.url + i} 
                                                    onClick={() => handleOpenUrl(item.url)}
                                                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer border animate-tab-fade ${
                                                        isBright 
                                                            ? 'hover:bg-black/[0.03] border-transparent hover:border-black/[0.06] hover:shadow-xs' 
                                                            : 'hover:bg-white/[0.04] border-transparent hover:border-white/[0.08] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                                                    }`} 
                                                    style={{ animationFillMode: 'both', animationDelay: `${i * 0.03}s` }}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition overflow-hidden ${
                                                        isBright ? 'bg-black/5 text-zinc-500 group-hover:text-accent' : 'bg-white/5 text-white/40 group-hover:text-accent'
                                                    }`}>
                                                        <img src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} alt="icon" className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-semibold transition truncate max-w-[400px] ${
                                                                isBright ? 'text-zinc-900 group-hover:text-accent' : 'text-white/90 group-hover:text-white'
                                                            }`}>{item.title}</span>
                                                            <span className={`text-[10px] font-mono whitespace-nowrap ${isBright ? 'text-zinc-400' : 'text-white/30'}`}>{new Date(item.lastVisit).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                        <span className={`text-xs truncate ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>{item.url}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full transition flex-shrink-0 ${
                                                        isBright 
                                                            ? 'text-zinc-600 bg-black/5 border border-black/10 group-hover:text-purple-600 group-hover:border-purple-400/40' 
                                                            : 'text-white/40 bg-white/5 border border-white/10 group-hover:text-purple-300 group-hover:border-purple-500/30'
                                                    }`}>
                                                        {item.visits || 1} {item.visits === 1 ? 'visit' : 'visits'}
                                                    </span>
                                                </div>
                                            )})}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
