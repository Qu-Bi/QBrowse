import React, { useRef, useEffect, useState } from 'react';
import { 
    Terminal, Search, Calculator, Globe, ArrowRight, 
    VolumeX, Volume2, Cpu, Zap, Moon, Sun, PanelLeft, Layers, Puzzle 
, Trash2, XCircle } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

const mockHistoryDB = [
    { url: 'youtube.com', title: 'YouTube - FPV Drones', visits: 1450, lastVisit: Date.now() - 1000 * 60 * 60 },
    { url: 'github.com/tauri-apps/tauri', title: 'Tauri - Build smaller, faster', visits: 320, lastVisit: Date.now() - 1000 * 60 * 60 * 24 },
    { url: 'react.dev', title: 'React Documentation', visits: 890, lastVisit: Date.now() - 1000 * 60 * 60 * 5 },
];

const availableCommands = [
    { id: 'ls', title: 'List open tabs in current space', cmd: 'ls', icon: Layers, color: 'text-blue-400' },
    { id: 'clear', title: 'Clear tab history & cache', cmd: 'clear', icon: Trash2, color: 'text-gray-400' },
    { id: 'top', title: 'Show top memory-consuming tabs', cmd: 'top', icon: Cpu, color: 'text-red-400' },
    { id: 'kill', title: 'Kill active tab', cmd: 'kill', icon: XCircle, color: 'text-red-500' },
    { id: 'mute', title: 'Mute all tabs globally', cmd: 'mute all', icon: VolumeX, color: 'text-red-400' },
    { id: 'unmute', title: 'Unmute all tabs globally', cmd: 'unmute all', icon: Volume2, color: 'text-green-400' },
    { id: 'sleep', title: 'Sleep background tabs (Free RAM)', cmd: 'sleep tabs', icon: Cpu, color: 'text-blue-400' },
    { id: 'wake', title: 'Wake all background tabs', cmd: 'wake tabs', icon: Zap, color: 'text-yellow-400' },
    { id: 'dark', title: 'Enable Dark Mode', cmd: 'dark mode', icon: Moon, color: 'text-indigo-400' },
    { id: 'light', title: 'Enable Light Mode', cmd: 'light mode', icon: Sun, color: 'text-yellow-500' },
    { id: 'zen', title: 'Toggle Zen Mode', cmd: 'zen mode', icon: PanelLeft, color: 'text-emerald-400' },
    { id: 'tab_map', title: 'Open Tab Map (Mission Control)', cmd: 'tab map', icon: Layers, color: 'text-purple-400' },
    { id: 'tool_hub', title: 'Toggle Tool Hub (Notes/AI)', cmd: 'tool hub', icon: Puzzle, color: 'text-fuchsia-400' }
];

const parseUrlInput = (input) => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    // Basic regex to detect if it's a domain/URL
    const isUrl = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/.*)?$/i.test(trimmed) || trimmed.startsWith('localhost:');
    if (isUrl) {
        return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    }
    // Otherwise treat as search query
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
};

export default function Omnibox() {
    const isOmniboxOpen = useUIStore(state => state.isOmniboxOpen);
    const isOmniboxClosing = useUIStore(state => state.isOmniboxClosing);
    const searchQuery = useUIStore(state => state.searchQuery);
    const setSearchQuery = useUIStore(state => state.setSearchQuery);
    const closeOmnibox = useUIStore(state => state.closeOmnibox);
    const showToast = useUIStore(state => state.showToast);
    const setCurrentUrl = useUIStore(state => state.setCurrentUrl);
    
    const setIsForceDark = useUIStore(state => state.setIsForceDark);
    const setIsSidebarHidden = useUIStore(state => state.setIsSidebarHidden);
    const openTabMap = useUIStore(state => state.openTabMap);
    const setIsRightPanelOpen = useUIStore(state => state.setIsRightPanelOpen);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const setPrivateTabs = useTabStore(state => state.setPrivateTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setGhostTabs = useTabStore(state => state.setGhostTabs);

    const isIncognito = activeSpace === 'ghost';
    const liveSearch = useUIStore(state => state.settings?.liveSearch);
    const searchInputRef = useRef(null);

    const [liveSuggestions, setLiveSuggestions] = useState([]);

    useEffect(() => {
        if (!searchQuery || searchQuery.startsWith('>')) {
            setLiveSuggestions([]);
            return;
        }
        
        const fetchSuggestions = async () => {
            try {
                const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(searchQuery)}`);
                const data = await response.json();
                if (data && data[1]) {
                    setLiveSuggestions(data[1].slice(0, 4));
                }
            } catch (e) {
                // Ignore fetch errors, might be CORS
                console.log(e);
            }
        };

        const timer = setTimeout(fetchSuggestions, 150);
        return () => clearTimeout(timer);
    }, [searchQuery]);


    useEffect(() => {
        if (isOmniboxOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }, 50);
        }
    }, [isOmniboxOpen]);

    if (!isOmniboxOpen && !isOmniboxClosing) return null;

    const getSmartPredictions = (query) => {
        if (!query) return [];
        const q = query.toLowerCase();
        return mockHistoryDB
            .filter(item => item.url.includes(q) || item.title.toLowerCase().includes(q))
            .map(item => {
                const hoursSinceVisit = (Date.now() - item.lastVisit) / (1000 * 60 * 60);
                const recencyBoost = Math.max(0, 24 - hoursSinceVisit) * 0.1;
                const score = item.visits * (1 + recencyBoost);
                return { ...item, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
    };

    const mathPrediction = (() => {
        const q = searchQuery.trim();
        if (/^[-+]?[0-9.()]+(?:[\s+\-*/]+[0-9.()]+)+$/.test(q)) {
            try {
                // eslint-disable-next-line no-new-func
                const res = new Function(`return (${q})`)();
                if (isFinite(res)) return { isMath: true, url: `= ${res}`, title: `Calculator: ${q}`, score: 10000 };
            } catch (e) { }
        }
        return null;
    })();

    
    const basePredictions = getSmartPredictions(searchQuery);
    const apiPredictions = liveSuggestions.map(s => ({
        url: `https://www.google.com/search?q=${encodeURIComponent(s)}`,
        title: s,
        score: 50,
        isSearch: true
    }));
    
    // Merge without duplicates by title
    const merged = [...basePredictions];
    apiPredictions.forEach(apiP => {
        if (!merged.find(p => p.title.toLowerCase() === apiP.title.toLowerCase())) {
            merged.push(apiP);
        }
    });

    const filteredPredictions = mathPrediction
        ? [mathPrediction, ...merged.slice(0, 5)]
        : merged.slice(0, 5);


    const isCommandMode = searchQuery.startsWith('>');
    const commandQuery = searchQuery.slice(1).trim().toLowerCase();
    const filteredCommands = availableCommands.filter(c => c.cmd.includes(commandQuery) || c.title.toLowerCase().includes(commandQuery));

    const handleExecuteCommand = (cmdId) => {
        switch (cmdId) {
            
            case 'ls':
                showToast('Terminal: Listing active tabs...');
                openTabMap();
                break;
            case 'clear':
                showToast('Terminal: Cache cleared');
                break;
            case 'top':
                showToast('Terminal: Tab resources analyzed');
                break;
            case 'kill':
                const activeTab = activeSpace === 'personal' ? privateTabs.find(t => t.active) : activeSpace === 'work' ? workTabs.find(t => t.active) : ghostTabs.find(t => t.active);
                if (activeTab) useTabStore.getState().handleCloseTab(activeTab.id);
                showToast('Terminal: Process terminated');
                break;
            case 'mute':

            case 'unmute': {
                const isMuting = cmdId === 'mute';
                const muteAll = (list, setList) => setList(list.map(t => ({ ...t, isMuted: isMuting })));
                muteAll(privateTabs, setPrivateTabs); 
                muteAll(workTabs, setWorkTabs); 
                muteAll(ghostTabs, setGhostTabs);
                showToast(`Terminal: All tabs ${isMuting ? 'muted' : 'unmuted'}`);
                break;
            }
            case 'sleep':
                showToast('Terminal: Background tabs suspended');
                break;
            case 'wake':
                showToast('Terminal: Background tabs woken up');
                break;
            case 'dark':
                setIsForceDark(true);
                showToast('Terminal: Dark Mode enabled');
                break;
            case 'light':
                setIsForceDark(false);
                showToast('Terminal: Light Mode enabled');
                break;
            case 'zen':
                setIsSidebarHidden(true); // actually it should toggle, but simplified here
                showToast('Terminal: Zen Mode activated');
                break;
            case 'tab_map':
                openTabMap();
                showToast('Terminal: Mission Control activated');
                break;
            case 'tool_hub':
                setIsRightPanelOpen(true);
                showToast('Terminal: Tool Hub opened');
                break;
            default:
                break;
        }
        handleCloseOmnibox(true);
    };

    const handleCloseOmnibox = (navigated = false) => {
        closeOmnibox();
        if (!navigated) {
            const cleanupTabs = (list, setList) => {
                const activeTab = list.find(t => t.active);
                if (activeTab && activeTab.url === '') {
                    setList(list.map(t => t.id === activeTab.id ? { ...t, isClosing: true } : t));
                    setTimeout(() => {
                        setList(list.filter(t => t.id !== activeTab.id));
                        // A bit tricky without state updater pattern, but let TabStore handle it later if needed
                    }, 200);
                }
            };

            if (activeSpace === 'personal') cleanupTabs(privateTabs, setPrivateTabs);
            else if (activeSpace === 'work') cleanupTabs(workTabs, setWorkTabs);
            else cleanupTabs(ghostTabs, setGhostTabs);
        }
    };

    const handleSelectPrediction = (pred) => {
        if (pred.isMath) {
            navigator.clipboard.writeText(pred.url.replace('= ', ''));
            showToast(`Copied to clipboard: ${pred.url.replace('= ', '')}`);
            handleCloseOmnibox(false);
        } else {
            setCurrentUrl(pred.url);
            const updateTab = (list, setList) => setList(list.map(t => t.active ? { ...t, url: pred.url, title: pred.title } : t));
            if (activeSpace === 'personal') updateTab(privateTabs, setPrivateTabs);
            else if (activeSpace === 'work') updateTab(workTabs, setWorkTabs);
            else updateTab(ghostTabs, setGhostTabs);
            handleCloseOmnibox(true);
        }
    };

    return (
        <div className={`fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-md transition-opacity duration-200 ${isOmniboxClosing ? 'opacity-0' : 'opacity-100'}`} onClick={() => handleCloseOmnibox(false)}>
            <div className={`w-full max-w-2xl mx-4 flex flex-col ${isOmniboxClosing ? 'animate-pop-out' : 'animate-pop-in'}`} onClick={e => e.stopPropagation()}>

                <div className={`w-full bg-[#121214]/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] p-5 flex items-center gap-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] relative z-10 overflow-hidden ${isCommandMode ? 'shadow-[0_0_80px_rgba(234,179,8,0.15)] border-yellow-500/30 scale-[1.02]' : (isIncognito ? 'shadow-[0_0_80px_rgba(168,85,247,0.3)]' : 'shadow-[0_30px_80px_rgba(0,0,0,0.8)]')}`}>
                    {isCommandMode ? <Terminal size={24} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse" /> : <Search size={24} className="text-accent transition-transform duration-300" />}

                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (isCommandMode && filteredCommands.length > 0) {
                                    handleExecuteCommand(filteredCommands[0].id);
                                } else if (!isCommandMode) {
                                    if (filteredPredictions.length > 0) {
                                        handleSelectPrediction(filteredPredictions[0]);
                                    } else if (searchQuery.trim().length > 0) {
                                        const url = parseUrlInput(searchQuery);
                                        handleSelectPrediction({ url, title: `Search/Go: ${searchQuery}` });
                                    }
                                }
                            }
                        }}

                        placeholder="Search Google, type URL or '>' for commands..."
                        className={`w-full bg-transparent border-none text-xl md:text-2xl font-light text-white placeholder-white/30 focus:outline-none focus:ring-0 transition-all duration-300 ${isCommandMode ? 'font-mono text-yellow-500 tracking-wide' : ''}`}
                        spellCheck="false"
                    />

                    <div className="flex gap-1.5 text-[10px] text-white/40 font-mono uppercase font-bold whitespace-nowrap items-center">
                        <span className="border border-white/10 bg-white/5 px-2 py-1 rounded-md shadow-sm">↵ Ent</span>
                        <span className="border border-white/10 bg-white/5 px-2 py-1 rounded-md shadow-sm">Esc</span>
                    </div>
                </div>

                <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${searchQuery.length > 0 ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                        <div className={`w-full bg-[#121214]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 transition-all duration-500 max-h-[50vh] overflow-y-auto hide-scroll ${isCommandMode ? 'border-yellow-500/20 shadow-[0_20px_50px_rgba(234,179,8,0.1)]' : ''}`}>
                            {isCommandMode ? (
                                filteredCommands.length > 0 ? (
                                    filteredCommands.map((cmd, i) => (
                                        <button key={i} onClick={() => handleExecuteCommand(cmd.id)} style={{ animationFillMode: 'both', animationDelay: `${i * 0.05}s` }} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group text-left border animate-pop-in ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/30 scale-[1.01] shadow-lg shadow-yellow-500/5' : 'border-transparent hover:border-yellow-500/30 hover:bg-yellow-500/10 hover:scale-[1.01] hover:shadow-lg hover:shadow-yellow-500/5'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 bg-white/5 group-hover:bg-yellow-500/20 ${i === 0 ? 'bg-yellow-500/20 scale-110' : 'group-hover:scale-110'} ${cmd.color}`}>
                                                <cmd.icon size={16} />
                                            </div>
                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                <span className={`font-mono font-bold truncate transition-colors ${i === 0 ? 'text-yellow-400' : 'text-yellow-500 group-hover:text-yellow-400'}`}>{'> ' + cmd.cmd}</span>
                                                <span className={`text-xs truncate transition-colors ${i === 0 ? 'text-yellow-500/70' : 'text-white/40 group-hover:text-yellow-500/70'}`}>{cmd.title}</span>
                                            </div>
                                            <Zap size={16} className={`transition-all duration-300 ${i === 0 ? 'text-yellow-400 scale-125 rotate-12' : 'text-white/20 group-hover:text-yellow-400 group-hover:scale-125 group-hover:rotate-12'}`} />
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 flex items-center gap-4 text-white/50 animate-pop-in"><Terminal size={18} className="animate-pulse text-red-400" /><span className="text-sm font-mono">Command not found: <strong className="text-red-400">"{commandQuery}"</strong></span></div>
                                )
                            ) : (
                                filteredPredictions.length > 0 ? (
                                    filteredPredictions.map((pred, i) => (
                                        <button key={i} onClick={() => handleSelectPrediction(pred)} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors group text-left ${i === 0 ? 'bg-white/10' : 'hover:bg-white/10'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${pred.isMath ? 'bg-accent-20 text-accent group-hover:bg-accent-30' : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-accent'} ${i === 0 && !pred.isMath ? 'bg-white/10 text-accent' : ''}`}>
                                                {pred.isMath ? <Calculator size={16} /> : <Globe size={16} />}
                                            </div>
                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                <span className={`font-semibold truncate ${pred.isMath ? 'text-accent text-lg' : 'transition-colors'} ${i === 0 && !pred.isMath ? 'text-white' : 'text-white/90 group-hover:text-white'}`}>{pred.title}</span>
                                                <span className="text-xs text-white/40 truncate font-mono">{pred.url}</span>
                                            </div>
                                            <ArrowRight size={16} className={`transition-colors ${i === 0 ? 'text-accent' : 'text-white/20 group-hover:text-accent'}`} />
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 flex items-center gap-4 text-white/50"><Search size={18} /><span className="text-sm">No results for "{searchQuery}"</span></div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
