import React, { useRef, useEffect, useState } from 'react';
import { 
    Terminal, Search, Calculator, Globe, ArrowRight, 
    VolumeX, Volume2, Cpu, Zap, Moon, Sun, PanelLeft, Layers, Puzzle,
    Trash2, XCircle, Sparkles, SplitSquareHorizontal,
    RotateCw, Plus, Settings, History, Download, Maximize, Key, Activity, HardDrive, Users,
    Printer, FileDown, Camera, Crop, X, Video, Code, BookOpen, MessageSquare, Code2, ShoppingBag, Twitter, MapPin, Package, FileText, Bot
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useHistoryStore from '../../store/useHistoryStore';
import useAIStore from '../../store/useAIStore';
import useTorStore from '../../store/useTorStore';
import { topSites } from '../../utils/topSites';
import { 
    getAllBangs, 
    parseBangFromQuery, 
    buildBangSearchUrl, 
    matchBangSuggestions, 
    findBangByTrigger 
} from '../../utils/searchBangs';

const availableCommands = [
    { id: 'ls', title: 'List open tabs (Mission Control)', cmd: 'ls', icon: Layers, color: 'text-blue-400' },
    { id: 'clear', title: 'Clear history & browser cache', cmd: 'clear', icon: Trash2, color: 'text-amber-400' },
    { id: 'top', title: 'Open Resource & Task Manager', cmd: 'top', icon: Cpu, color: 'text-cyan-400' },
    { id: 'tasks', title: 'Open Resource & Task Manager', cmd: 'tasks', icon: Activity, color: 'text-emerald-400' },
    { id: 'resources', title: 'Open Resource & Task Manager', cmd: 'resources', icon: HardDrive, color: 'text-blue-400' },
    { id: 'ps', title: 'Process list & activity monitor', cmd: 'ps', icon: Terminal, color: 'text-purple-400' },
    { id: 'kill', title: 'Kill / close active tab', cmd: 'kill', icon: XCircle, color: 'text-red-500' },
    { id: 'new', title: 'Open a new tab in current space', cmd: 'new tab', icon: Plus, color: 'text-emerald-400' },
    { id: 'reload', title: 'Reload / refresh active tab', cmd: 'reload', icon: RotateCw, color: 'text-cyan-400' },
    { id: 'mute', title: 'Mute all tabs globally', cmd: 'mute all', icon: VolumeX, color: 'text-red-400' },
    { id: 'unmute', title: 'Unmute all tabs globally', cmd: 'unmute all', icon: Volume2, color: 'text-green-400' },
    { id: 'sleep', title: 'Sleep background tabs (Free RAM)', cmd: 'sleep tabs', icon: Cpu, color: 'text-blue-400' },
    { id: 'wake', title: 'Wake all background tabs', cmd: 'wake tabs', icon: Zap, color: 'text-yellow-400' },
    { id: 'dark', title: 'Enable Smart Dark Mode', cmd: 'dark mode', icon: Moon, color: 'text-indigo-400' },
    { id: 'light', title: 'Enable Light Mode', cmd: 'light mode', icon: Sun, color: 'text-yellow-500' },
    { id: 'zen', title: 'Toggle Zen Mode (Hide/Show Sidebar)', cmd: 'zen mode', icon: PanelLeft, color: 'text-emerald-400' },
    { id: 'tab_map', title: 'Open Tab Map (Mission Control)', cmd: 'tab map', icon: Layers, color: 'text-purple-400' },
    { id: 'tool_hub', title: 'Toggle Tool Hub (Notes/AI)', cmd: 'tool hub', icon: Puzzle, color: 'text-fuchsia-400' },
    { id: 'split', title: 'Toggle Split Screen (Ctrl+\\ or ⇧⌘D)', cmd: 'split screen', icon: SplitSquareHorizontal, color: 'text-cyan-400' },
    { id: 'settings', title: 'Open Browser Settings', cmd: 'settings', icon: Settings, color: 'text-slate-400' },
    { id: 'history', title: 'Open Browsing History', cmd: 'history', icon: History, color: 'text-orange-400' },
    { id: 'downloads', title: 'Open Downloads Manager', cmd: 'downloads', icon: Download, color: 'text-lime-400' },
    { id: 'fullscreen', title: 'Toggle Fullscreen Mode', cmd: 'fullscreen', icon: Maximize, color: 'text-violet-400' },
    { id: 'vault', title: 'Open QVault Passwords & Passkeys', cmd: 'vault', icon: Key, color: 'text-blue-400' },
    { id: 'profiles', title: 'Manage Browser Profiles & Cloud Sync', cmd: 'profiles', icon: Users, color: 'text-amber-400' },
    { id: 'profile', title: 'Manage Browser Profiles & Cloud Sync', cmd: 'profile', icon: Users, color: 'text-amber-400' },
    { id: 'tor', title: 'Toggle Tor Onion Routing Mode', cmd: 'tor', icon: Globe, color: 'text-purple-400' },
    { id: 'newnym', title: 'Request new Tor identity (SIGNAL NEWNYM)', cmd: 'newnym', icon: RotateCw, color: 'text-purple-400' },
    { id: 'circuit', title: 'Open Tor Circuit & Security HUD', cmd: 'circuit', icon: Terminal, color: 'text-purple-400' },
    { id: 'find', title: 'Find in page (Ctrl+F)', cmd: 'find', icon: Search, color: 'text-amber-400' },
    { id: 'print', title: 'Print active page (Ctrl+P)', cmd: 'print', icon: Printer, color: 'text-indigo-400' },
    { id: 'pdf', title: 'Save page as Clean PDF', cmd: 'pdf', icon: FileDown, color: 'text-rose-400' },
    { id: 'screenshot', title: 'Capture Webpage Screenshot (Ctrl+Shift+S)', cmd: 'screenshot', icon: Camera, color: 'text-pink-400' },
    { id: 'snip', title: 'Interactive Snip Area (Ctrl+Shift+S)', cmd: 'snip', icon: Crop, color: 'text-rose-400' },
    { id: 'reader', title: 'Toggle Distraction-Free Reader Mode (Ctrl+Alt+R)', cmd: 'reader', icon: BookOpen, color: 'text-amber-400' }
];

const parseUrlInput = (input, activeBang = null, customBangs = []) => {
    const trimmed = (input || '').trim();
    if (!trimmed && !activeBang) return '';

    // If an active bang chip is selected in Omnibox
    if (activeBang) {
        return buildBangSearchUrl(activeBang, trimmed);
    }

    // If a bang is embedded in query (!yt or @gh or query !yt)
    const bangMatch = parseBangFromQuery(trimmed, customBangs);
    if (bangMatch) {
        return buildBangSearchUrl(bangMatch.bang, bangMatch.queryText);
    }
    
    // Internal browser protocols
    if (/^(qbrowse:\/\/|chrome:\/\/|about:)/i.test(trimmed)) {
        return trimmed;
    }

    const isLocal = /^(https?:\/\/)?localhost(:\d+)?(\/.*)?$/i.test(trimmed) ||
                    /^(https?:\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/i.test(trimmed);
                    
    const isUrl = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/.*)?$/i.test(trimmed) || isLocal;
                  
    if (isUrl) {
        const isOnion = /\.onion(\/.*)?$/i.test(trimmed);
        const httpsOnly = useUIStore.getState().settings?.httpsOnly !== false;
        if (trimmed.startsWith('http://') && !isLocal && httpsOnly && !isOnion) {
            return trimmed.replace(/^http:\/\//i, 'https://');
        }
        if (trimmed.startsWith('http')) return trimmed;
        // .onion services default to http
        if (isOnion) return `http://${trimmed}`;
        return isLocal ? `http://${trimmed}` : `https://${trimmed}`;
    }

    const activeSpace = useTabStore.getState().activeSpace;
    const q = encodeURIComponent(trimmed);
    if (activeSpace === 'tor') {
        return `https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/?q=${q}`;
    }

    const engine = useUIStore.getState().settings?.searchEngine || 'google';
    if (engine === 'duckduckgo') return `https://duckduckgo.com/?q=${q}`;
    if (engine === 'bing') return `https://www.bing.com/search?q=${q}`;
    if (engine === 'brave') return `https://search.brave.com/search?q=${q}`;
    if (engine === 'ecosia') return `https://www.ecosia.org/search?q=${q}`;
    return `https://www.google.com/search?q=${q}`;
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
    const torTabs = useTabStore(state => state.torTabs) || [];
    const historyStoreData = useHistoryStore(state => state.history);
    const setPrivateTabs = useTabStore(state => state.setPrivateTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setGhostTabs = useTabStore(state => state.setGhostTabs);
    const setTorTabs = useTabStore(state => state.setTorTabs);

    const isIncognito = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const liveSearch = useUIStore(state => state.settings?.liveSearch);
    const searchEngine = useUIStore(state => state.settings?.searchEngine) || 'google';
    const activeBang = useUIStore(state => state.activeBang);
    const setActiveBang = useUIStore(state => state.setActiveBang);
    const clearActiveBang = useUIStore(state => state.clearActiveBang);
    const customBangs = useUIStore(state => state.settings?.customBangs) || [];

    const engineNames = {
        google: 'Google',
        duckduckgo: 'DuckDuckGo',
        bing: 'Bing',
        brave: 'Brave',
        ecosia: 'Ecosia'
    };
    const currentEngineName = isTor ? 'DuckDuckGo Onion' : (engineNames[searchEngine] || 'Google');
    const searchInputRef = useRef(null);

    const [liveSuggestions, setLiveSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedOptionText, setSelectedOptionText] = useState(null);
    const originalQueryRef = useRef('');
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const omniboxContainerRef = useRef(null);

    const isBangSuggestionMode = !activeBang && (searchQuery.startsWith('!') || searchQuery.startsWith('@')) && !searchQuery.includes(' ');
    const bangSuggestions = isBangSuggestionMode ? matchBangSuggestions(searchQuery, customBangs) : [];

    const detectedBang = !activeBang ? parseBangFromQuery(searchQuery, customBangs) : null;
    const effectiveBang = activeBang || detectedBang?.bang || null;
    const effectiveQueryText = activeBang ? searchQuery.trim() : (detectedBang ? detectedBang.queryText : searchQuery.trim());

    useEffect(() => {
        setSelectedIndex(0);
        setSelectedOptionText(null);
        if (isTor || !searchQuery || searchQuery.startsWith('>') || isBangSuggestionMode) {
            setLiveSuggestions([]);
            return;
        }
        
        // Debounce Google Suggestions API
        const timer = setTimeout(() => {
            const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (domainRegex.test(searchQuery.trim())) {
                setLiveSuggestions([]);
                return;
            }
            
            const callbackName = 'googleSuggestCb_' + Math.round(100000 * Math.random());
            window[callbackName] = (data) => {
                if (data && data[1]) {
                    setLiveSuggestions(data[1].slice(0, 5));
                }
                delete window[callbackName];
                const scriptEl = document.getElementById(callbackName);
                if (scriptEl) scriptEl.remove();
            };
            
            const script = document.createElement('script');
            script.id = callbackName;
            script.src = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(searchQuery)}&jsonp=${callbackName}`;
            document.body.appendChild(script);
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery, isBangSuggestionMode]);

    useEffect(() => {
        if (!omniboxContainerRef.current) return;
        const selectedBtn = omniboxContainerRef.current.querySelector('[data-selected="true"]');
        if (selectedBtn) {
            selectedBtn.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    useEffect(() => {
        if (isOmniboxOpen) {
            setSelectedOptionText(null);
            originalQueryRef.current = searchQuery || '';
            const webviews = document.querySelectorAll('webview');
            webviews.forEach(wv => {
                try { wv.blur(); } catch (err) {}
            });
            window.focus();
            if (searchInputRef.current) {
                searchInputRef.current.focus();
                searchInputRef.current.select();
                setTimeout(() => {
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                }, 50);
            }
        }
    }, [isOmniboxOpen]);

    const getSmartPredictions = (query) => {
        if (!query) return [];
        const q = query.toLowerCase();

        const siteMatches = topSites
            .filter(site => site.startsWith(q))
            .map(site => ({ url: site, title: `Go to ${site}`, score: 100, visits: 10, lastVisit: Date.now() }));

        return [...historyStoreData, ...siteMatches]
            .filter(item => item.url.includes(q) || item.title.toLowerCase().includes(q))
            .map(item => {
                const hoursSinceVisit = (Date.now() - item.lastVisit) / (1000 * 60 * 60);
                const recencyBoost = Math.max(0, 24 - hoursSinceVisit) * 0.1;
                const score = item.visits * (1 + recencyBoost);
                return { ...item, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
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

    const aiPrediction = (() => {
        const q = searchQuery.trim();
        if (q.startsWith('?')) {
            const queryText = q.slice(1).trim();
            return {
                isAI: true,
                query: queryText,
                title: `Ask Qu-AI (llama.cpp Gemma 4): "${queryText || 'Type your question...'}"`,
                score: 200000
            };
        }
        return null;
    })();

    const basePredictions = getSmartPredictions(searchQuery);
    const apiPredictions = liveSuggestions.map(s => ({
        url: effectiveBang ? buildBangSearchUrl(effectiveBang, s) : parseUrlInput(s, null, customBangs),
        title: s,
        score: 50,
        isSearch: true,
        bang: effectiveBang
    }));
    
    // Merge without duplicates by title
    const merged = [...basePredictions];
    apiPredictions.forEach(apiP => {
        if (!merged.find(p => p.title.toLowerCase() === apiP.title.toLowerCase())) {
            merged.push(apiP);
        }
    });

    const parsedInput = parseUrlInput(searchQuery, activeBang, customBangs);
    const isSearchEngineUrl = !!effectiveBang ||
                              parsedInput.includes('google.com/search?q=') ||
                              parsedInput.includes('duckduckgo.com/?q=') ||
                              parsedInput.includes('duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion') ||
                              parsedInput.includes('bing.com/search?q=') ||
                              parsedInput.includes('search.brave.com/search?q=') ||
                              parsedInput.includes('ecosia.org/search?q=');
    const isDirectUrl = parsedInput && !isSearchEngineUrl;
    const directUrlPrediction = isDirectUrl ? { url: parsedInput, title: `Go to ${searchQuery}`, score: 100000 } : null;

    const searchPrediction = (!isDirectUrl && (effectiveQueryText.length > 0 || effectiveBang)) ? [{
        url: effectiveBang ? buildBangSearchUrl(effectiveBang, effectiveQueryText) : parsedInput,
        title: effectiveBang 
            ? (effectiveQueryText ? `Search ${effectiveBang.name}: "${effectiveQueryText}"` : `Go to ${effectiveBang.name}`) 
            : `Search ${currentEngineName}: "${searchQuery.trim()}"`,
        score: 150000,
        isSearch: true,
        bang: effectiveBang
    }] : [];

    let finalPredictions = aiPrediction 
        ? [aiPrediction, ...merged] 
        : mathPrediction 
            ? [mathPrediction, ...merged] 
            : [...searchPrediction, ...merged];

    if (directUrlPrediction && !aiPrediction) {
        finalPredictions = [directUrlPrediction, ...finalPredictions.filter(p => p.url !== directUrlPrediction.url)];
    }

    const filteredPredictions = finalPredictions.slice(0, 6);

    const isCommandMode = searchQuery.startsWith('>');
    const commandQuery = searchQuery.slice(1).trim().toLowerCase();
    const filteredCommands = availableCommands.filter(c => c.cmd.includes(commandQuery) || c.title.toLowerCase().includes(commandQuery));

    const handleExecuteCommand = async (cmdId) => {
        const tabStore = useTabStore.getState();
        const uiStore = useUIStore.getState();
        const activeSpace = tabStore.activeSpace;
        const spaceTabs = activeSpace === 'personal' 
            ? tabStore.privateTabs 
            : (activeSpace === 'work' 
                ? tabStore.workTabs 
                : (activeSpace === 'tor' ? (tabStore.torTabs || []) : tabStore.ghostTabs));

        switch (cmdId) {
            case 'ls':
            case 'tab_map':
                openTabMap();
                showToast('Terminal: Tab Map activated');
                break;

            case 'clear':
                useHistoryStore.getState().clearHistory();
                if (window.electronAPI && window.electronAPI.clearAllData) {
                    window.electronAPI.clearAllData({ cache: true, storage: false, cookies: false }).catch(() => {});
                }
                showToast('Terminal: History & browser cache cleared!');
                break;

            case 'top':
            case 'tasks':
            case 'resources':
            case 'ps': {
                closeOmnibox();
                uiStore.openModal('tasks');
                showToast('Terminal: Resource & Task Manager opened');
                break;
            }

            case 'kill':
            case 'close': {
                const activeTab = spaceTabs.find(t => t.active);
                if (activeTab) {
                    tabStore.handleCloseTab(activeTab.id);
                    showToast('Terminal: Active tab closed');
                }
                break;
            }

            case 'new':
                tabStore.handleNewTab();
                showToast('Terminal: New tab opened');
                break;

            case 'reload':
                uiStore.refresh();
                showToast('Terminal: Reloading tab...');
                break;

            case 'find':
                uiStore.setIsFindOpen(true);
                showToast('Find in page opened');
                break;

            case 'print':
                closeOmnibox();
                uiStore.printActivePage();
                break;

            case 'pdf':
                closeOmnibox();
                uiStore.saveActivePageAsPDF();
                break;

            case 'screenshot':
                closeOmnibox();
                uiStore.setIsScreenshotBarOpen(true);
                break;

            case 'snip':
                closeOmnibox();
                setTimeout(() => {
                    uiStore.setIsSnippingMode(true);
                }, 50);
                break;

            case 'reader':
                closeOmnibox();
                uiStore.toggleReaderMode();
                break;

            case 'mute':
            case 'unmute': {
                const isMuting = cmdId === 'mute';
                const muteAll = (list, setList) => setList(list.map(t => ({ ...t, isMuted: isMuting })));
                muteAll(tabStore.privateTabs, tabStore.setPrivateTabs); 
                muteAll(tabStore.workTabs, tabStore.setWorkTabs); 
                muteAll(tabStore.ghostTabs, tabStore.setGhostTabs);
                muteAll(tabStore.torTabs || [], tabStore.setTorTabs);
                if (window.qbrowseWebviews) {
                    Object.values(window.qbrowseWebviews).forEach(wv => {
                        if (wv && typeof wv.setAudioMuted === 'function') {
                            try { wv.setAudioMuted(isMuting); } catch(e) {}
                        }
                    });
                }
                showToast(`Terminal: All tabs ${isMuting ? 'muted' : 'unmuted'}`);
                break;
            }

            case 'sleep': {
                let count = 0;
                const suspendList = (tabs, setTabs) => {
                    const updated = tabs.map(t => {
                        if (!t.active && !t.suspended && t.url && t.url !== 'about:blank') {
                            count++;
                            return { ...t, suspended: true };
                        }
                        return t;
                    });
                    setTabs(updated);
                };
                suspendList(tabStore.privateTabs, tabStore.setPrivateTabs);
                suspendList(tabStore.workTabs, tabStore.setWorkTabs);
                suspendList(tabStore.ghostTabs, tabStore.setGhostTabs);
                suspendList(tabStore.torTabs || [], tabStore.setTorTabs);
                showToast(`Terminal: Suspended ${count} background tab${count === 1 ? '' : 's'} (Freed RAM)`);
                break;
            }

            case 'wake': {
                let count = 0;
                const wakeList = (tabs, setTabs) => {
                    const updated = tabs.map(t => {
                        if (t.suspended) {
                            count++;
                            return { ...t, suspended: false };
                        }
                        return t;
                    });
                    setTabs(updated);
                };
                wakeList(tabStore.privateTabs, tabStore.setPrivateTabs);
                wakeList(tabStore.workTabs, tabStore.setWorkTabs);
                wakeList(tabStore.ghostTabs, tabStore.setGhostTabs);
                wakeList(tabStore.torTabs || [], tabStore.setTorTabs);
                showToast(`Terminal: Woke ${count} suspended tab${count === 1 ? '' : 's'}`);
                break;
            }

            case 'dark':
                setIsForceDark(true);
                showToast('Terminal: Smart Dark Mode enabled');
                break;

            case 'light':
                setIsForceDark(false);
                showToast('Terminal: Smart Dark Mode disabled');
                break;

            case 'zen': {
                const nextHidden = !uiStore.isSidebarHidden;
                uiStore.setIsSidebarHidden(nextHidden);
                showToast(`Terminal: Zen Mode ${nextHidden ? 'activated (Sidebar hidden)' : 'deactivated (Sidebar visible)'}`);
                break;
            }

            case 'tool_hub': {
                const nextOpen = !uiStore.isRightPanelOpen;
                uiStore.setIsRightPanelOpen(nextOpen);
                if (nextOpen) uiStore.setRightPanelTab('ai');
                showToast(`Terminal: Tool Hub ${nextOpen ? 'opened' : 'closed'}`);
                break;
            }

            case 'split':
                uiStore.toggleSplitView();
                break;

            case 'settings':
                uiStore.openModal('settings');
                showToast('Terminal: Settings opened');
                break;

            case 'history':
                uiStore.openModal('history');
                showToast('Terminal: History opened');
                break;

            case 'downloads':
                uiStore.setIsRightPanelOpen(true);
                uiStore.setRightPanelTab('downloads');
                showToast('Terminal: Downloads opened');
                break;

            case 'fullscreen': {
                const nextFull = !uiStore.isFullscreen;
                if (window.electronAPI && window.electronAPI.setFullscreen) {
                    window.electronAPI.setFullscreen(nextFull);
                }
                uiStore.setIsFullscreen(nextFull);
                showToast(`Terminal: Fullscreen ${nextFull ? 'enabled' : 'exited'}`);
                break;
            }

            case 'vault':
                uiStore.togglePopover('vault');
                showToast('Terminal: QVault opened');
                break;

            case 'profiles':
            case 'profile':
                uiStore.openPopover('userProfile');
                showToast('Terminal: Profiles & Cloud Sync opened');
                break;

            case 'tor': {
                import('../../store/useTorStore').then(m => {
                    m.default.getState().toggleTorEnabled();
                }).catch(() => {});
                break;
            }

            case 'newnym': {
                import('../../store/useTorStore').then(m => {
                    m.default.getState().newCircuit();
                }).catch(() => {});
                showToast('Terminal: Requesting new Tor identity...');
                break;
            }

            case 'circuit':
                uiStore.openPopover('tor');
                showToast('Terminal: Tor Circuit HUD opened');
                break;

            default:
                break;
        }
        handleCloseOmnibox(true);
    };

    const handleCloseOmnibox = (navigated = false) => {
        clearActiveBang();
        closeOmnibox();
        if (!navigated) {
            const cleanupTabs = (list) => {
                const activeTab = list.find(t => t.active);
                if (activeTab && activeTab.url === '' && list.length > 1) {
                    useTabStore.getState().handleCloseTab(activeTab.id);
                }
            };

            if (activeSpace === 'personal') cleanupTabs(privateTabs);
            else if (activeSpace === 'work') cleanupTabs(workTabs);
            else if (activeSpace === 'tor') cleanupTabs(torTabs);
            else cleanupTabs(ghostTabs);
        }
    };

    const handleSelectPrediction = (pred) => {
        if (pred.isAI) {
            useUIStore.getState().setIsRightPanelOpen(true);
            useUIStore.getState().setRightPanelTab('ai');
            if (pred.query) {
                useAIStore.getState().sendChatMessage(pred.query, useUIStore.getState().currentUrl);
            }
            handleCloseOmnibox(true);
            return;
        }

        if (pred.isMath) {
            navigator.clipboard.writeText(pred.url.replace('= ', ''));
            showToast(`Copied to clipboard: ${pred.url.replace('= ', '')}`);
            handleCloseOmnibox(false);
        } else {
            setCurrentUrl(pred.url);
            const updateTab = (list, setList) => setList(list.map(t => t.active ? { ...t, url: pred.url, title: pred.title } : t));
            if (activeSpace === 'personal') updateTab(privateTabs, setPrivateTabs);
            else if (activeSpace === 'work') updateTab(workTabs, setWorkTabs);
            else if (activeSpace === 'tor') {
                updateTab(torTabs, setTorTabs);
                const torStatus = useTorStore.getState().status;
                if (torStatus !== 'connected') {
                    useUIStore.getState().showToast('Tor is offline. Click "Connect to Tor Network" to browse.');
                }
            }
            else updateTab(ghostTabs, setGhostTabs);
            handleCloseOmnibox(true);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSelectedOptionText(null);
        originalQueryRef.current = val;
        // Check if user completed a bang trigger with a space, e.g. "!yt " or "@github "
        if (!activeBang && (val.startsWith('!') || val.startsWith('@')) && val.includes(' ')) {
            const spaceIdx = val.indexOf(' ');
            const trigger = val.slice(0, spaceIdx).trim();
            const remainder = val.slice(spaceIdx + 1);
            const matchedBang = findBangByTrigger(trigger, customBangs);
            if (matchedBang) {
                setActiveBang(matchedBang);
                setSearchQuery(remainder);
                originalQueryRef.current = remainder;
                return;
            }
        }
        setSearchQuery(val);
    };

    const handleOptionMouseMove = (i, e) => {
        if (Math.abs(e.clientX - lastMousePosRef.current.x) > 3 || Math.abs(e.clientY - lastMousePosRef.current.y) > 3) {
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            if (selectedIndex !== i) {
                setSelectedIndex(i);
            }
        }
    };

    const navigateOptions = (direction) => {
        const max = isCommandMode 
            ? filteredCommands.length 
            : (isBangSuggestionMode ? bangSuggestions.length : filteredPredictions.length);

        if (max <= 0) return;

        // Circular wrap-around navigation
        const nextIndex = (selectedIndex + direction + max) % max;
        setSelectedIndex(nextIndex);

        // Determine preview text to show in Omnibox input
        let previewText = null;
        if (isCommandMode) {
            const cmd = filteredCommands[nextIndex];
            if (cmd) {
                previewText = '> ' + cmd.cmd;
            }
        } else if (isBangSuggestionMode) {
            const bang = bangSuggestions[nextIndex];
            if (bang) {
                previewText = bang.bangs?.[0] || `!${bang.prefix}`;
            }
        } else {
            const pred = filteredPredictions[nextIndex];
            if (pred) {
                if (nextIndex === 0 && originalQueryRef.current && pred.isSearch) {
                    previewText = originalQueryRef.current;
                } else if (pred.isSearch) {
                    const cleanText = pred.title.replace(/^Search [^:]+:\s*"?/, '').replace(/"?$/, '');
                    previewText = cleanText || originalQueryRef.current;
                } else if (pred.url && !pred.url.startsWith('https://www.google.com/search') && !pred.url.startsWith('https://duckduckgo.com') && !pred.url.startsWith('https://www.bing.com') && !pred.url.startsWith('https://search.brave.com') && !pred.url.startsWith('https://www.ecosia.org')) {
                    previewText = pred.url;
                } else {
                    previewText = pred.title;
                }
            }
        }

        setSelectedOptionText(previewText);
    };

    const handleOmniboxKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (selectedOptionText !== null) {
                setSelectedOptionText(null);
                setSelectedIndex(0);
                return;
            }
            if (activeBang) {
                clearActiveBang();
            } else {
                handleCloseOmnibox(false);
            }
        } else if (e.key === 'Backspace' && searchQuery === '' && activeBang) {
            e.preventDefault();
            const trigger = activeBang.bangs?.[0] || `!${activeBang.prefix}`;
            clearActiveBang();
            setSelectedOptionText(null);
            setSearchQuery(trigger);
            originalQueryRef.current = trigger;
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (isBangSuggestionMode && bangSuggestions.length > 0) {
                const target = bangSuggestions[selectedIndex] || bangSuggestions[0];
                if (target) {
                    setActiveBang(target);
                    setSelectedOptionText(null);
                    setSearchQuery('');
                    originalQueryRef.current = '';
                }
            } else if (!isCommandMode && filteredPredictions.length > 0) {
                const target = filteredPredictions[selectedIndex] || filteredPredictions[0];
                if (target) {
                    const text = target.isSearch 
                        ? (target.title.replace(/^Search [^:]+:\s*"?/, '').replace(/"?$/, '') || target.title)
                        : (target.url || target.title);
                    originalQueryRef.current = text;
                    setSelectedOptionText(null);
                    setSearchQuery(text);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateOptions(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateOptions(-1);
        } else if (e.key === 'ArrowRight' && searchInputRef.current) {
            const input = searchInputRef.current;
            const currentVal = input.value;
            if (input.selectionStart === currentVal.length && !isCommandMode && !isBangSuggestionMode && filteredPredictions.length > 0) {
                const target = filteredPredictions[selectedIndex];
                if (target && target.title !== currentVal) {
                    const text = target.isSearch 
                        ? (target.title.replace(/^Search [^:]+:\s*"?/, '').replace(/"?$/, '') || target.title)
                        : (target.url || target.title);
                    if (text && text.toLowerCase().startsWith(currentVal.toLowerCase())) {
                        e.preventDefault();
                        originalQueryRef.current = text;
                        setSelectedOptionText(null);
                        setSearchQuery(text);
                    }
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isCommandMode && filteredCommands.length > 0) {
                handleExecuteCommand(filteredCommands[selectedIndex]?.id || filteredCommands[0].id);
            } else if (isBangSuggestionMode && bangSuggestions.length > 0 && !searchQuery.includes(' ')) {
                const target = bangSuggestions[selectedIndex] || bangSuggestions[0];
                if (target) {
                    setActiveBang(target);
                    setSelectedOptionText(null);
                    setSearchQuery('');
                }
            } else if (!isCommandMode) {
                if (filteredPredictions.length > 0) {
                    handleSelectPrediction(filteredPredictions[selectedIndex] || filteredPredictions[0]);
                } else if (searchQuery.trim().length > 0 || activeBang) {
                    const val = selectedOptionText !== null ? selectedOptionText : (searchInputRef.current?.value || searchQuery);
                    const url = parseUrlInput(val, activeBang, customBangs);
                    const title = activeBang 
                        ? `Search ${activeBang.name}: ${val}` 
                        : `Search/Go: ${val}`;
                    handleSelectPrediction({ url, title });
                }
            }
        }
    };

    useEffect(() => {
        if (!isOmniboxOpen) return;
        const handleWindowKeyDown = (e) => {
            if (e.target === searchInputRef.current) return;
            if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
                handleOmniboxKeyDown(e);
            }
        };
        window.addEventListener('keydown', handleWindowKeyDown);
        return () => window.removeEventListener('keydown', handleWindowKeyDown);
    }, [isOmniboxOpen, selectedIndex, filteredPredictions, filteredCommands, bangSuggestions, isCommandMode, isBangSuggestionMode, searchQuery, selectedOptionText, activeBang]);

    if (!isOmniboxOpen && !isOmniboxClosing) return null;

    return (
        <div className={`fixed inset-0 z-[10000] flex items-start justify-center pt-[23vh] bg-black/50 backdrop-blur-md transition-opacity duration-200 ${isOmniboxClosing ? 'opacity-0' : 'opacity-100'}`} onClick={() => handleCloseOmnibox(false)}>
            <div className={`w-full max-w-[720px] mx-4 flex flex-col relative ${isOmniboxClosing ? 'animate-pop-out' : 'animate-pop-in'}`} onClick={e => { e.stopPropagation(); searchInputRef.current?.focus(); }} onKeyDown={handleOmniboxKeyDown}>

                <div 
                    className={`w-full bg-[#121214]/85 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] p-4 md:p-5 flex items-center gap-3 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] relative z-10 overflow-hidden ${
                        isCommandMode ? 'border-yellow-500/30' : ''
                    }`}
                    style={{
                        boxShadow: isCommandMode 
                            ? '0 0 50px -5px rgba(234, 179, 8, 0.25), 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)' 
                            : isTor 
                                ? '0 0 50px -5px rgba(168, 85, 247, 0.3), 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)'
                                : activeBang 
                                    ? `0 0 50px -5px ${activeBang.color}30, 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`
                                    : '0 0 50px -5px var(--accent-30, rgba(59, 130, 246, 0.28)), 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)'
                    }}
                >
                    {isCommandMode ? (
                        <Terminal size={24} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse flex-shrink-0" />
                    ) : activeBang ? (
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ color: activeBang.color, filter: `drop-shadow(0 0 6px ${activeBang.color}70)` }}>
                            {activeBang.icon ? <activeBang.icon size={22} /> : <Search size={22} />}
                        </div>
                    ) : (
                        <Search size={24} className="text-accent transition-transform duration-300 flex-shrink-0" style={{ filter: 'drop-shadow(0 0 8px var(--accent-30, rgba(59, 130, 246, 0.4)))' }} />
                    )}

                    {/* Active Bang Badge Chip */}
                    {activeBang && (
                        <div 
                            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-sm select-none flex-shrink-0 animate-pop-in"
                            style={{ 
                                backgroundColor: `${activeBang.color}20`, 
                                borderColor: `${activeBang.color}40`,
                                color: activeBang.color 
                            }}
                        >
                            <span>{activeBang.name}</span>
                            <button 
                                type="button" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearActiveBang();
                                    searchInputRef.current?.focus();
                                }}
                                className="p-0.5 hover:bg-white/20 rounded-full transition ml-0.5 cursor-pointer text-white/70 hover:text-white"
                                title="Remove engine filter (Backspace)"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    <input
                        ref={searchInputRef}
                        id="omnibox-search-input"
                        data-testid="omnibox-input"
                        type="text"
                        value={selectedOptionText !== null ? selectedOptionText : searchQuery}
                        onChange={handleInputChange}
                        onKeyDown={handleOmniboxKeyDown}

                        placeholder={
                            isCommandMode 
                                ? "Type a browser command..." 
                                : activeBang 
                                    ? `Search ${activeBang.name} directly...` 
                                    : `Search ${currentEngineName}, type '!bang' or '>' for commands...`
                        }
                        className={`flex-1 min-w-0 bg-transparent border-none text-lg font-light text-white placeholder-white/30 focus:outline-none focus:ring-0 transition-all duration-300 ${isCommandMode ? 'font-mono text-yellow-500 tracking-wide' : ''}`}
                        spellCheck="false"
                    />

                    <div className="flex gap-1.5 text-[10px] text-white/40 font-mono uppercase font-bold whitespace-nowrap items-center flex-shrink-0">
                        <span className="border border-white/10 bg-white/5 px-2 py-1 rounded-md shadow-sm">↵ Ent</span>
                        <span className="border border-white/10 bg-white/5 px-2 py-1 rounded-md shadow-sm">Esc</span>
                    </div>
                </div>

                <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${(searchQuery.length > 0 || isBangSuggestionMode) ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                        <div 
                            ref={omniboxContainerRef} 
                            className={`w-full bg-[#121214]/85 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 flex flex-col gap-1 transition-all duration-300 max-h-[50vh] overflow-y-auto hide-scroll ${
                                isCommandMode ? 'border-yellow-500/20' : ''
                            }`}
                            style={{
                                boxShadow: isCommandMode 
                                    ? '0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 30px -10px rgba(234, 179, 8, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)' 
                                    : isTor 
                                        ? '0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 30px -10px rgba(168, 85, 247, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
                                        : activeBang 
                                            ? `0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 30px -10px ${activeBang.color}20, inset 0 1px 0 0 rgba(255, 255, 255, 0.08)`
                                            : '0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 30px -10px var(--accent-15, rgba(59, 130, 246, 0.15)), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
                            }}
                        >
                            {isCommandMode ? (
                                filteredCommands.length > 0 ? (
                                    filteredCommands.map((cmd, i) => {
                                        const isSelected = i === selectedIndex;
                                        return (
                                            <button 
                                                key={i} 
                                                data-selected={isSelected} 
                                                onClick={() => handleExecuteCommand(cmd.id)} 
                                                onMouseMove={(e) => handleOptionMouseMove(i, e)}
                                                style={{ 
                                                    animationFillMode: 'both', 
                                                    animationDelay: `${i * 0.03}s`
                                                }} 
                                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-150 group text-left border ${
                                                    isSelected 
                                                        ? 'bg-yellow-500/15 border-yellow-500/30 scale-[1.005]' 
                                                        : 'border-transparent hover:border-white/5 hover:bg-white/5'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelected ? 'bg-yellow-500/25 scale-105' : 'bg-white/5 group-hover:scale-105'} ${cmd.color}`}>
                                                    <cmd.icon size={16} />
                                                </div>
                                                <div className="flex flex-col flex-1 overflow-hidden">
                                                    <span className={`font-mono font-medium truncate transition-colors ${isSelected ? 'text-yellow-300 font-semibold' : 'text-yellow-500 group-hover:text-yellow-400'}`}>{'> ' + cmd.cmd}</span>
                                                    <span className={`text-xs truncate transition-colors ${isSelected ? 'text-yellow-200/80' : 'text-white/40 group-hover:text-yellow-500/70'}`}>{cmd.title}</span>
                                                </div>
                                                {isSelected ? (
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="border border-yellow-500/30 bg-yellow-500/15 text-yellow-300 text-[10px] font-mono font-medium px-2 py-0.5 rounded shadow-sm">↵ Enter</span>
                                                        <Zap size={15} className="text-yellow-400 rotate-12" />
                                                    </div>
                                                ) : (
                                                    <Zap size={15} className="text-white/20 opacity-0 group-hover:opacity-100 group-hover:text-yellow-400 transition-all duration-200" />
                                                )}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 flex items-center gap-4 text-white/50 animate-pop-in"><Terminal size={18} className="animate-pulse text-red-400" /><span className="text-sm font-mono">Command not found: <strong className="text-red-400">"{commandQuery}"</strong></span></div>
                                )
                            ) : isBangSuggestionMode ? (
                                bangSuggestions.length > 0 ? (
                                    <div className="flex flex-col gap-1 p-1">
                                        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center justify-between border-b border-white/5 mb-1">
                                            <span className="flex items-center gap-1.5">
                                                <Sparkles size={12} className="text-accent" />
                                                Search Bangs & Engines
                                            </span>
                                            <span className="text-[10px] font-mono lowercase text-white/30">Tab ⇥ or Enter ↵ to activate</span>
                                        </div>
                                        {bangSuggestions.map((bang, i) => {
                                            const BangIcon = bang.icon || Search;
                                            const isSelected = i === selectedIndex;
                                            const bangColor = bang.color || '#a855f7';
                                            return (
                                                <button 
                                                    key={bang.id} 
                                                    data-selected={isSelected} 
                                                    onClick={() => {
                                                        setActiveBang(bang);
                                                        setSearchQuery('');
                                                        setSelectedOptionText(null);
                                                        searchInputRef.current?.focus();
                                                    }}
                                                    onMouseMove={(e) => handleOptionMouseMove(i, e)}
                                                    style={isSelected ? {
                                                        backgroundColor: `${bangColor}15`,
                                                        borderColor: `${bangColor}30`
                                                    } : undefined}
                                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 group text-left border ${
                                                        isSelected 
                                                            ? 'scale-[1.005]' 
                                                            : 'border-transparent hover:border-white/5 hover:bg-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div 
                                                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                                            style={{ backgroundColor: `${bangColor}25`, color: bangColor }}
                                                        >
                                                            <BangIcon size={16} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-white/90'}`}>{bang.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {bang.bangs.slice(0, 3).map((b, bi) => (
                                                                        <span key={bi} className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}>
                                                                            {b}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-[10px] text-white/30 font-medium">({bang.category || 'Engine'})</span>
                                                            </div>
                                                            <span className={`text-xs truncate font-mono mt-0.5 ${isSelected ? 'text-white/70' : 'text-white/40'}`}>
                                                                {bang.url}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 text-[10px] font-mono transition ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        <span className="border border-white/20 bg-white/10 text-white/90 px-2 py-0.5 rounded font-medium shadow-sm">Tab ⇥ or ↵ Enter</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-4 flex items-center gap-4 text-white/50 animate-pop-in">
                                        <Search size={18} className="text-accent" />
                                        <span className="text-sm">No search engine bang found for <strong>"{searchQuery}"</strong></span>
                                    </div>
                                )
                            ) : (
                                filteredPredictions.length > 0 ? (
                                    filteredPredictions.map((pred, i) => {
                                        const BangIcon = pred.bang?.icon;
                                        const isSelected = i === selectedIndex;
                                        return (
                                            <button 
                                                key={i} 
                                                data-selected={isSelected} 
                                                onClick={() => handleSelectPrediction(pred)} 
                                                onMouseMove={(e) => handleOptionMouseMove(i, e)}
                                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-150 group text-left border ${
                                                    isSelected 
                                                        ? 'bg-white/10 border-white/15 scale-[1.005]' 
                                                        : 'border-transparent hover:border-white/5 hover:bg-white/5'
                                                }`}
                                            >
                                                <div 
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                                        pred.bang 
                                                            ? '' 
                                                            : (pred.isMath 
                                                                ? (isSelected ? 'bg-accent/25 text-accent scale-105' : 'bg-accent-20 text-accent group-hover:bg-accent-30') 
                                                                : (pred.isSearch 
                                                                    ? (isSelected ? 'bg-purple-500/25 text-purple-200 scale-105' : 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20')
                                                                    : (isSelected ? 'bg-white/20 text-accent scale-105' : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-accent')))
                                                    } ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                                    style={pred.bang ? { backgroundColor: `${pred.bang.color}25`, color: pred.bang.color } : undefined}
                                                >
                                                    {pred.bang ? (BangIcon ? <BangIcon size={16} /> : <Search size={16} />) : (pred.isMath ? <Calculator size={16} /> : (pred.isSearch ? <Search size={16} /> : <Globe size={16} />))}
                                                </div>
                                                <div className="flex flex-col flex-1 overflow-hidden">
                                                    <span className={`font-medium truncate transition-colors ${pred.isMath ? 'text-accent text-lg font-bold' : (isSelected ? 'text-white font-semibold' : 'text-white/80 group-hover:text-white')}`}>
                                                        {pred.title}
                                                    </span>
                                                    <span className={`text-xs truncate font-mono transition-colors ${isSelected ? 'text-white/70' : 'text-white/40'}`}>
                                                        {pred.url}
                                                    </span>
                                                </div>
                                                {isSelected ? (
                                                    <div className="flex items-center gap-2 flex-shrink-0 animate-fade-in">
                                                        <span className="border border-white/15 bg-white/10 text-white/80 text-[10px] font-mono font-medium px-2 py-0.5 rounded shadow-sm">↵ Enter</span>
                                                        <ArrowRight size={15} className="text-accent translate-x-0.5 transition-all" />
                                                    </div>
                                                ) : (
                                                    <ArrowRight size={15} className="text-white/20 opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-200" />
                                                )}
                                            </button>
                                        );
                                    })
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
