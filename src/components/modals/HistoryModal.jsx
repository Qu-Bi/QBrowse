import React from 'react';
import { Clock, Search, X } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

// Move mockHistoryDB here
const mockHistoryDB = [
    { url: 'youtube.com', title: 'YouTube - FPV Drones', visits: 1450, lastVisit: Date.now() - 1000 * 60 * 60 },
    { url: 'github.com/tauri-apps/tauri', title: 'Tauri - Build smaller, faster', visits: 320, lastVisit: Date.now() - 1000 * 60 * 60 * 24 },
    { url: 'react.dev', title: 'React Documentation', visits: 890, lastVisit: Date.now() - 1000 * 60 * 60 * 5 },
];

const HistoryModal = () => {
    const {
        activeModal,
        isModalClosing,
        closeModal,
        historySearchQuery,
        setHistorySearchQuery
    } = useUIStore();

    if (activeModal !== 'history' && !isModalClosing) return null;

    return (
        <div className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-3xl text-white font-sans p-6 ${isModalClosing ? 'animate-pop-out' : 'animate-modal'}`} onClick={closeModal}>
            <div className="w-full max-w-3xl h-[80vh] min-h-[500px] bg-[#121214]/80 backdrop-blur-md border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3"><Clock className="text-accent" /> Archive (History)</h2>
                        <p className="text-xs text-white/40 mt-1">Local SQLite database (Securely synced)</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                                {mockHistoryDB.filter(item => item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) || item.url.toLowerCase().includes(historySearchQuery.toLowerCase())).length > 0 ? (
                                    mockHistoryDB.filter(item => item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) || item.url.toLowerCase().includes(historySearchQuery.toLowerCase())).map((item, i) => (
                                        <div key={item.url} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" style={{ animationFillMode: 'both', animationDelay: `${i * 0.04}s` }}>
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover-text-accent transition overflow-hidden">
                                                <img src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-semibold text-white/90 group-hover:text-white transition">{item.title}</span>
                                                <span className="text-xs text-white/40">{item.url}</span>
                                            </div>
                                            <span className="text-xs text-white/20 font-mono opacity-0 group-hover:opacity-100 transition">Visits: {item.visits}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-white/40 font-medium animate-pop-in">No results for "{historySearchQuery}"</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-pop-in space-y-6">
                            <div>
                                <h3 className="text-xs font-bold uppercase text-white/30 tracking-widest mb-3 pl-1">Today</h3>
                                <div className="flex flex-col gap-2">
                                    {mockHistoryDB.slice(0, 3).map((item, i) => (
                                        <div key={item.url} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" style={{ animationFillMode: 'both', animationDelay: `${i * 0.04}s` }}>
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover-text-accent transition overflow-hidden">
                                                <img src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-semibold text-white/90 group-hover:text-white transition">{item.title}</span>
                                                <span className="text-xs text-white/40">{item.url}</span>
                                            </div>
                                            <span className="text-xs text-white/20 font-mono opacity-0 group-hover:opacity-100 transition">Visits: {item.visits}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase text-white/30 tracking-widest mb-3 pl-1">Yesterday</h3>
                                <div className="flex flex-col gap-2">
                                    {mockHistoryDB.slice(3, 5).map((item, i) => (
                                        <div key={item.url} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" style={{ animationFillMode: 'both', animationDelay: `${(i + 3) * 0.04}s` }}>
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover-text-accent transition overflow-hidden">
                                                <img src={`https://www.google.com/s2/favicons?sz=64&domain=${item.url}`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-semibold text-white/90 group-hover:text-white transition">{item.title}</span>
                                                <span className="text-xs text-white/40">{item.url}</span>
                                            </div>
                                            <span className="text-xs text-white/20 font-mono opacity-0 group-hover:opacity-100 transition">Visits: {item.visits}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
