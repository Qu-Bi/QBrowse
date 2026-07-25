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
        setHistorySearchQuery
    } = useUIStore();
    const history = useHistoryStore(state => state.history);
    const clearHistory = useHistoryStore(state => state.clearHistory);

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
        <div className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-3xl text-white font-sans p-6 ${isModalClosing ? 'animate-pop-out' : 'animate-modal'}`} onClick={closeModal}>
            <div className="w-full max-w-3xl h-[80vh] min-h-[500px] bg-[#121214]/80 backdrop-blur-md border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3"><Clock className="text-accent" /> Archive (History)</h2>
                        <p className="text-xs text-white/40 mt-1">Local SQLite database (Securely synced)</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={clearHistory} className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">Clear</button>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
                            <input
                                type="text"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                                placeholder="Search history..."
                                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-accent-30 transition-colors w-64 text-white"
                            />
                        </div>
                        <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition"><X size={16} /></button>
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
                                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" 
                                            style={{ animationFillMode: 'both', animationDelay: `${i * 0.04}s` }}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-accent transition overflow-hidden">
                                                <img src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-sm font-semibold text-white/90 group-hover:text-white transition truncate">{item.title}</span>
                                                <span className="text-xs text-white/40 truncate">{item.url}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full group-hover:text-purple-300 group-hover:border-purple-500/30 transition flex-shrink-0">
                                                {item.visits || 1} {item.visits === 1 ? 'visit' : 'visits'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-white/40 font-medium animate-pop-in">No results for "{historySearchQuery}"</div>
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

                        return (
                            <div className="animate-pop-in space-y-6">
                                {groupedHistory.map(group => (
                                    <div key={group.name}>
                                        <h3 className="text-xs font-bold uppercase text-white/30 tracking-widest mb-3 pl-1">{group.name}</h3>
                                        <div className="flex flex-col gap-2">
                                            {group.items.map((item) => {
                                                const i = globalIndex++;
                                                return (
                                                <div 
                                                    key={item.url + i} 
                                                    onClick={() => handleOpenUrl(item.url)}
                                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" 
                                                    style={{ animationFillMode: 'both', animationDelay: `${i * 0.03}s` }}
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-accent transition overflow-hidden">
                                                        <img src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-white/90 group-hover:text-white transition truncate max-w-[400px]">{item.title}</span>
                                                            <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">{new Date(item.lastVisit).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                        <span className="text-xs text-white/40 truncate">{item.url}</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full group-hover:text-purple-300 group-hover:border-purple-500/30 transition flex-shrink-0">
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
