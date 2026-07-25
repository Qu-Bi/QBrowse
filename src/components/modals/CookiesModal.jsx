import React, { useState, useEffect } from 'react';
import { Cookie, Search, Trash2, ShieldAlert, RefreshCw, X, Check, Lock, Database, Clock, Filter, AlertTriangle } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function CookiesModal() {
    const { activeModal, isModalClosing, closeModal, showToast } = useUIStore();
    
    const [cookies, setCookies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('all');
    const [clearingOptions, setClearingOptions] = useState({
        cookies: true,
        cache: true,
        storage: false
    });
    const [timeRange, setTimeRange] = useState('all');

    const fetchCookies = async () => {
        setLoading(true);
        if (window.electronAPI && window.electronAPI.getCookies) {
            try {
                const list = await window.electronAPI.getCookies({});
                setCookies(list || []);
            } catch (e) {
                setCookies([]);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeModal === 'cookies') {
            fetchCookies();
        }
    }, [activeModal]);

    if (activeModal !== 'cookies' && !isModalClosing) return null;

    const handleDeleteSingle = async (cookie) => {
        if (window.electronAPI && window.electronAPI.removeCookie) {
            const protocol = cookie.secure ? 'https' : 'http';
            const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
            const url = `${protocol}://${cleanDomain}${cookie.path || '/'}`;
            const success = await window.electronAPI.removeCookie(url, cookie.name);
            if (success) {
                setCookies(prev => prev.filter(c => !(c.domain === cookie.domain && c.name === cookie.name)));
                showToast(`Deleted cookie: ${cookie.name}`);
            }
        }
    };

    const handleClearDomainCookies = async (domain) => {
        if (!domain || domain === 'all') return;
        if (window.electronAPI && window.electronAPI.clearSiteCookies) {
            const count = await window.electronAPI.clearSiteCookies(domain);
            showToast(`Cleared ${count} cookies for ${domain}`);
            fetchCookies();
        }
    };

    const handleClearAllData = async () => {
        if (window.electronAPI && window.electronAPI.clearAllData) {
            await window.electronAPI.clearAllData(clearingOptions);
            showToast('Cleared browsing data & cookies');
            fetchCookies();
        }
    };

    // Extract unique domains
    const domains = Array.from(new Set(cookies.map(c => c.domain.replace(/^\./, '')))).sort();

    const filteredCookies = cookies.filter(c => {
        const cleanDom = c.domain.replace(/^\./, '');
        if (selectedDomain !== 'all' && cleanDom !== selectedDomain) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || c.value.toLowerCase().includes(q);
    });

    return (
        <div className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-3xl text-white font-sans ${isModalClosing ? 'animate-pop-out' : 'animate-modal'}`} onClick={closeModal}>
            <div className="w-[750px] max-w-[92vw] h-[600px] max-h-[85vh] bg-[#0c0d10] border border-white/15 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                            <Cookie size={22} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold tracking-tight">Cookies & Site Storage Explorer</h2>
                            <p className="text-xs text-white/40">Inspect, search, and delete site cookies and local data</p>
                        </div>
                    </div>
                    <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                {/* Main Content Layout */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left Sidebar: Domains List & Actions */}
                    <div className="w-56 border-r border-white/10 bg-black/30 p-4 flex flex-col gap-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Filter Domain</span>
                            <button onClick={fetchCookies} className="p-1 hover:bg-white/10 rounded-md transition text-white/40 hover:text-white" title="Refresh list">
                                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scroll flex flex-col gap-1 pr-1">
                            <button
                                onClick={() => setSelectedDomain('all')}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition ${
                                    selectedDomain === 'all' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'
                                }`}
                            >
                                <span>All Sites</span>
                                <span className="text-[10px] font-mono opacity-60 bg-white/10 px-1.5 py-0.5 rounded-md">{cookies.length}</span>
                            </button>

                            {domains.map(d => {
                                const count = cookies.filter(c => c.domain.includes(d)).length;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => setSelectedDomain(d)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition group ${
                                            selectedDomain === d ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'hover:bg-white/5 text-white/70 hover:text-white border border-transparent'
                                        }`}
                                    >
                                        <span className="truncate mr-2">{d}</span>
                                        <span className="text-[10px] font-mono opacity-60 bg-white/10 px-1.5 py-0.5 rounded-md flex-shrink-0">{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Bulk Clear Actions */}
                        <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                            {selectedDomain !== 'all' && (
                                <button 
                                    onClick={() => handleClearDomainCookies(selectedDomain)}
                                    className="w-full py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Trash2 size={13} /> Clear {selectedDomain}
                                </button>
                            )}
                            <button 
                                onClick={handleClearAllData}
                                className="w-full py-2 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20 cursor-pointer"
                            >
                                <Trash2 size={13} /> Clear All Browsing Data
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Cookie Inspector */}
                    <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
                        
                        {/* Search Bar */}
                        <div className="relative w-full">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input 
                                type="text"
                                placeholder="Search cookies by name, domain, or value..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>

                        {/* Cookies List */}
                        <div className="flex-1 overflow-y-auto hide-scroll flex flex-col gap-2 pr-1">
                            {filteredCookies.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30 py-12">
                                    <Cookie size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-semibold">No cookies found</p>
                                    <p className="text-xs text-white/20 mt-1">Try clearing search or picking another domain</p>
                                </div>
                            ) : (
                                filteredCookies.map((cookie, i) => (
                                    <div key={`${cookie.domain}-${cookie.name}-${i}`} className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition flex items-start justify-between gap-4 group">
                                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-amber-300 font-mono">{cookie.name}</span>
                                                <span className="text-[10px] font-mono text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{cookie.domain}</span>
                                                {cookie.secure && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Secure</span>}
                                                {cookie.httpOnly && <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">HttpOnly</span>}
                                            </div>
                                            <span className="text-[11px] font-mono text-white/70 truncate bg-black/40 p-1.5 rounded-lg border border-white/5 max-w-full">
                                                {cookie.value}
                                            </span>
                                            <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono mt-0.5">
                                                <span>Path: {cookie.path}</span>
                                                {cookie.expirationDate && <span>Expires: {new Date(cookie.expirationDate * 1000).toLocaleDateString()}</span>}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleDeleteSingle(cookie)}
                                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition"
                                            title="Delete cookie"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
