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
        <div className={`absolute inset-0 z-[200] flex items-center justify-center p-6 ${isBright ? 'bg-black/25 backdrop-blur-xl text-zinc-900' : 'bg-black/60 backdrop-blur-3xl text-white'} font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-modal'}`} onClick={closeModal}>
            <div 
                className={`w-full max-w-3xl h-[80vh] min-h-[500px] rounded-3xl overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isBright 
                        ? 'bg-white/60 backdrop-blur-3xl border border-black/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.12)] text-zinc-900' 
                        : 'bg-[#121214]/80 backdrop-blur-md border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] text-white'
                }`} 
                onClick={e => e.stopPropagation()}
            >
                <div className={`p-6 border-b flex justify-between items-center ${isBright ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-black/20'}`}>
                    <div>
                        <h2 className={`text-xl font-bold tracking-tight flex items-center gap-3 ${isBright ? 'text-zinc-900' : 'text-white'}`}><Clock className="text-accent" /> Archive (History)</h2>
                        <p className={`text-xs mt-1 ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>Local SQLite database (Securely synced)</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={clearHistory} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${isBright ? 'bg-black/5 hover:bg-red-500/15 text-zinc-700 hover:text-red-600' : 'bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400'}`}>Clear</button>
                        <div className="relative">
                            <Search size={14} className={`absolute left-3 top-2.5 ${isBright ? 'text-zinc-400' : 'text-white/30'}`} />
                            <input
                                type="text"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                                placeholder="Search history..."
                                className={`border rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-accent-30 transition-colors w-64 ${
                                    isBright 
                                        ? 'bg-black/[0.04] border-black/10 text-zinc-900 placeholder-zinc-400' 
                                        : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                                }`}
                            />
                        </div>
                        <button onClick={closeModal} className={`w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer ${isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-600' : 'bg-white/5 hover:bg-white/10 text-white'}`}><X size={16} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto hide-scroll p-6 space-y-6">

                    {historySearchQuery ? (
                        <div className="animate-pop-in">
                            <h3 className="text-xs font-bold uppercase text-accent tracking-widest mb-3 pl-1">Search Results</h3>
                            <div className="flex flex-col gap-2">
                                {history.filter(item => item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) || item.url.toLowerCase().includes(historySearchQuery.toLowerCase())).length > 0 ? (
                                    history.filter(item => item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) || item.url.toLowerCase().includes(historySearchQuery.toLowerCase())).map((item, i) => (
                                        <div 
                                            key={item.url} 
                                            onClick={() => handleOpenUrl(item.url)}
                                            className={`flex items-center gap-4 p-3 rounded-xl transition group cursor-pointer border animate-pop-in ${
                                                isBright 
                                                    ? 'hover:bg-black/[0.04] border-transparent hover:border-black/5' 
                                                    : 'hover:bg-white/5 border-transparent hover:border-white/5'
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
                                    <div className={`p-8 text-center font-medium animate-pop-in ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>No results for "{historySearchQuery}"</div>
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
                                <div className={`p-12 text-center font-medium animate-pop-in ${isBright ? 'text-zinc-500' : 'text-white/40'}`}>
                                    No browsing history recorded yet.
                                </div>
                            );
                        }

                        return (
                            <div className="animate-pop-in space-y-6">
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
                                                    className={`flex items-center gap-4 p-3 rounded-xl transition group cursor-pointer border animate-pop-in ${
                                                        isBright 
                                                            ? 'hover:bg-black/[0.04] border-transparent hover:border-black/5' 
                                                            : 'hover:bg-white/5 border-transparent hover:border-white/5'
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
