import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    Terminal, Search, Calculator, Globe,
    VolumeX, Volume2, Cpu, Zap, Moon, Sun, PanelLeft, Layers, Puzzle,
    Trash2, XCircle, SplitSquareHorizontal,
    RotateCw, Plus, Settings, History, Download, Maximize, Key, Activity, HardDrive, Users,
    Printer, FileDown, Camera, Crop, BookOpen
} from 'lucide-react';
import useUIStore, { getAnimationTimeout } from '../store/useUIStore';
import useTabStore from '../store/useTabStore';
import useHistoryStore from '../store/useHistoryStore';
import useAIStore from '../store/useAIStore';
import useTorStore from '../store/useTorStore';
import { topSites } from '../utils/topSites';
import { 
    getAllBangs, 
    parseBangFromQuery, 
    buildBangSearchUrl, 
    matchBangSuggestions, 
    findBangByTrigger,
    findBangByKeywordOrTrigger
} from '../utils/searchBangs';
import { 
    getAllSearchEngines, 
    getSearchEngineById, 
    buildSearchEngineUrl, 
    parseKeywordQuery 
} from '../utils/searchEngines';

export const availableCommands = [
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

export const parseUrlInput = (input, activeBang = null, customBangs = []) => {
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

    // Direct local file:// URLs
    if (/^file:\/\//i.test(trimmed)) {
        return trimmed;
    }

    // Windows local drive paths (e.g. C:\Users, D:/Documents)
    if (/^[a-zA-Z]:[\\/]/i.test(trimmed)) {
        const normalized = trimmed.replace(/\\/g, '/');
        return `file:///${normalized}`;
    }

    // Unix absolute paths (/home, /usr, /etc, /tmp) or Home directory (~/)
    if (/^(\/|~\/)/.test(trimmed)) {
        return `file://${trimmed}`;
    }

    // Explicit scheme with a host (e.g. http://site.com or https://site.com)
    if (/^https?:\/\/\S+/i.test(trimmed)) {
        const withoutScheme = trimmed.replace(/^https?:\/\//i, '').trim();
        if (withoutScheme.length > 0 && withoutScheme !== '/') {
            return trimmed;
        }
    }

    const isLocal = /^(https?:\/\/)?localhost(:\d+)?(\/.*)?$/i.test(trimmed) ||
                    /^(https?:\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/i.test(trimmed);
                    
    const isUrl = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/.*)?$/i.test(trimmed) || isLocal;
                  
    if (isUrl) {
        const isOnion = /\.onion(\/.*)?$/i.test(trimmed);
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        // .onion services default to http
        if (isOnion) return `http://${trimmed}`;
        return isLocal ? `http://${trimmed}` : `https://${trimmed}`;
    }

    const activeSpace = useTabStore.getState().activeSpace;
    const settings = useUIStore.getState().settings || {};
    const customEngines = settings.customSearchEngines || [];
    const searchEngine = settings.searchEngine || 'google';

    const keywordMatch = parseKeywordQuery(trimmed, customEngines);
    if (keywordMatch) {
        return buildSearchEngineUrl(keywordMatch.engine, keywordMatch.queryText, customEngines, activeSpace === 'tor');
    }

    return buildSearchEngineUrl(searchEngine, trimmed, customEngines, activeSpace === 'tor');
};

export const getCompletedSuggestionText = (target, currentInput) => {
    if (!target) return '';
    if (target.isSearch) {
        return target.title.replace(/^Search [^:]+:\s*"?/, '').replace(/"?$/, '') || target.title;
    }
    if (target.isLocalFile) {
        const input = (currentInput || '').trim();
        let raw = target.rawPath || target.subtitle || target.url || target.title;

        if (input.startsWith('file://')) {
            let fileUrl = target.url;
            if (!fileUrl) {
                const norm = raw.replace(/\\/g, '/');
                fileUrl = norm.startsWith('/') ? `file://${norm}` : `file:///${norm}`;
            }
            if (target.isDirectory && !fileUrl.endsWith('/')) {
                fileUrl += '/';
            }
            return fileUrl;
        }

        // Native path input (e.g. C:\... or C:/... or /home/...)
        if (raw.startsWith('file://')) {
            try {
                raw = decodeURIComponent(raw.replace(/^file:\/\/\/?/, ''));
            } catch (_) {}
        }

        const hasForwardSlash = input.includes('/') && !input.includes('\\');
        if (hasForwardSlash) {
            raw = raw.replace(/\\/g, '/');
            if (target.isDirectory && !raw.endsWith('/')) {
                raw += '/';
            }
            return raw;
        }

        // Windows backslash style or Unix
        if (raw.includes('\\') || /^[a-zA-Z]:/.test(raw)) {
            raw = raw.replace(/\//g, '\\');
            if (target.isDirectory && !raw.endsWith('\\')) {
                raw += '\\';
            }
            return raw;
        }

        if (target.isDirectory && !raw.endsWith('/')) {
            raw += '/';
        }
        return raw;
    }

    let text = target.url || target.title;
    if (target.isDirectory && !text.endsWith('/') && !text.endsWith('\\')) {
        text += '/';
    }
    return text;
};

/**
 * Shared Omnibox Engine Hook
 * Powers Homepage Inline Omnibox, TopBar Mini-Omnibox, and Floating Omnibox Modal
 */
export default function useOmniboxEngine({
    initialQuery = '',
    onNavigate,
    onClose,
    isActive = true
} = {}) {
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

    const isIncognito = activeSpace === 'ghost';
    const isTor = activeSpace === 'tor';
    const liveSearch = useUIStore(state => state.settings?.liveSearch);
    const smartCalc = useUIStore(state => state.settings?.smartCalc);
    const searchInNewTab = useUIStore(state => state.settings?.searchInNewTab);
    const searchEngine = useUIStore(state => state.settings?.searchEngine) || 'google';
    const customSearchEngines = useUIStore(state => state.settings?.customSearchEngines) || [];
    const customBangs = useUIStore(state => state.settings?.customBangs) || [];
    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor' && !isTor;

    const [inputValue, setInputValue] = useState(initialQuery || '');
    const [activeBang, setActiveBang] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedOptionText, setSelectedOptionText] = useState(null);
    const [liveSuggestions, setLiveSuggestions] = useState([]);
    const [localSuggestions, setLocalSuggestions] = useState([]);
    
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const originalQueryRef = useRef(initialQuery || '');
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    const activeEngineObj = useMemo(() => getSearchEngineById(searchEngine, customSearchEngines), [searchEngine, customSearchEngines]);
    const keywordEngineMatch = useMemo(() => parseKeywordQuery(inputValue, customSearchEngines), [inputValue, customSearchEngines]);
    const currentEngineName = isTor 
        ? 'DuckDuckGo Onion' 
        : (keywordEngineMatch ? keywordEngineMatch.engine.name : (activeEngineObj?.name || 'Google'));

    const isBangSuggestionMode = !activeBang && (inputValue.startsWith('!') || inputValue.startsWith('@')) && !inputValue.includes(' ');
    const bangSuggestions = useMemo(() => {
        return isBangSuggestionMode ? matchBangSuggestions(inputValue, customBangs) : [];
    }, [isBangSuggestionMode, inputValue, customBangs]);

    const detectedBang = useMemo(() => {
        return !activeBang ? parseBangFromQuery(inputValue, customBangs) : null;
    }, [activeBang, inputValue, customBangs]);

    const effectiveBang = activeBang || detectedBang?.bang || null;
    const effectiveQueryText = activeBang ? inputValue.trim() : (detectedBang ? detectedBang.queryText : inputValue.trim());

    const isCommandMode = !activeBang && inputValue.startsWith('>');
    const commandQuery = isCommandMode ? inputValue.slice(1).trim().toLowerCase() : '';
    const filteredCommands = useMemo(() => {
        if (!isCommandMode) return [];
        return availableCommands.filter(c => c.cmd.includes(commandQuery) || c.title.toLowerCase().includes(commandQuery));
    }, [isCommandMode, commandQuery]);

    // Live suggestion fetcher
    useEffect(() => {
        if (!isActive) return;
        setSelectedIndex(0);
        setSelectedOptionText(null);

        const trimmedQ = (inputValue || '').trim();
        const isLocalPath = /^file:\/\//i.test(trimmedQ) || /^[a-zA-Z]:[\\/]/.test(trimmedQ) || /^(\/|~\/)/.test(trimmedQ);

        if (isTor || isIncognito || !trimmedQ || trimmedQ.startsWith('>') || isBangSuggestionMode || liveSearch === false) {
            setLiveSuggestions([]);
            if (!isLocalPath) setLocalSuggestions([]);
            if (liveSearch === false && !isLocalPath) return;
        }

        // Live Local Path Autocomplete
        if (isLocalPath && window.electronAPI?.autocompleteLocalPath) {
            setLiveSuggestions([]);
            window.electronAPI.autocompleteLocalPath(trimmedQ).then(matches => {
                setLocalSuggestions(matches || []);
            }).catch(() => {
                setLocalSuggestions([]);
            });
            return;
        } else {
            setLocalSuggestions([]);
        }

        // Clean up any stray script tags from previous suggestions
        const strayScripts = document.querySelectorAll('script[id^="googleSuggestCb_"]');
        strayScripts.forEach(el => el.remove());

        let activeCallback = null;
        let activeScript = null;

        // Debounce Google Suggestions API
        const timer = setTimeout(() => {
            const trimmed = (inputValue || '').trim();
            if (/^(https?:\/\/|file:\/\/|qbrowse:\/\/|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$)/i.test(trimmed) || trimmed.length > 150) {
                setLiveSuggestions([]);
                return;
            }

            const callbackName = 'googleSuggestCb_' + Math.round(100000 * Math.random());
            activeCallback = callbackName;
            window[callbackName] = (data) => {
                try {
                    if (data && data[1]) {
                        setLiveSuggestions(data[1].slice(0, 10));
                    }
                } catch (err) {
                    console.warn('Error processing search suggestions:', err);
                } finally {
                    try { delete window[callbackName]; } catch (_) {}
                    const scriptEl = document.getElementById(callbackName);
                    if (scriptEl && scriptEl.parentNode) scriptEl.remove();
                }
            };

            const script = document.createElement('script');
            script.id = callbackName;
            script.src = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmed)}&jsonp=${callbackName}`;
            script.onerror = () => {
                try { delete window[callbackName]; } catch (_) {}
                if (script.parentNode) script.remove();
            };
            activeScript = script;
            document.body.appendChild(script);
        }, 130);

        return () => {
            clearTimeout(timer);
            if (activeCallback) {
                // Keep a safe no-op stub so late in-flight network responses don't throw Uncaught ReferenceError
                window[activeCallback] = () => {
                    try { delete window[activeCallback]; } catch (_) {}
                };
                setTimeout(() => {
                    try { delete window[activeCallback]; } catch (_) {}
                }, 10000);
            }
            if (activeScript && activeScript.parentNode) {
                activeScript.remove();
            }
        };
    }, [inputValue, isBangSuggestionMode, isTor, isIncognito, liveSearch, isActive]);

    // Scroll active item into view
    useEffect(() => {
        if (!dropdownRef.current) return;
        const selectedBtn = dropdownRef.current.querySelector('[data-selected="true"]');
        if (selectedBtn) {
            selectedBtn.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    const getSmartPredictions = useCallback((query) => {
        if (!query) return [];
        const q = query.toLowerCase();
        const cleanQ = q.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
        const scheme = q.startsWith('http://') ? 'http://' : 'https://';

        const siteMatches = cleanQ 
            ? topSites
                .filter(site => site.startsWith(cleanQ))
                .map(site => ({ url: `${scheme}${site}`, title: `Go to ${scheme}${site}`, score: 100, visits: 10, lastVisit: Date.now() }))
            : [];

        const rawHistory = (isTor || isIncognito) ? [] : (Array.isArray(historyStoreData) ? historyStoreData : []);
        // Slice to the most recent 200 items to avoid iterating/sorting through thousands of items on every keystroke
        const historySource = rawHistory.length > 200 ? rawHistory.slice(0, 200) : rawHistory;

        const results = [...siteMatches];
        const now = Date.now();

        for (let i = 0; i < historySource.length; i++) {
            const item = historySource[i];
            if (!item || !item.url) continue;
            const itemUrl = item.url.toLowerCase();
            const itemTitle = (item.title || '').toLowerCase();
            if (
                itemUrl.includes(q) || 
                itemTitle.includes(q) || 
                (cleanQ && (itemUrl.includes(cleanQ) || itemTitle.includes(cleanQ)))
            ) {
                const cleanedTitle = (item.title || '')
                    .replace(/^Search [^:]+:\s*"?/i, '')
                    .replace(/"$/, '')
                    .trim() || item.title;
                const hoursSinceVisit = (now - (item.lastVisit || now)) / 3600000;
                const recencyBoost = Math.max(0, 24 - hoursSinceVisit) * 0.1;
                const score = (item.visits || 1) * (1 + recencyBoost);
                results.push({
                    ...item,
                    title: cleanedTitle,
                    score
                });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, 8);
    }, [isTor, isIncognito, historyStoreData]);

    const mathPrediction = useMemo(() => {
        if (smartCalc === false) return null;
        const q = inputValue.trim();
        if (/^[-+]?[0-9.()]+(?:[\s+\-*/]+[0-9.()]+)+$/.test(q)) {
            try {
                // eslint-disable-next-line no-new-func
                const res = new Function(`return (${q})`)();
                if (isFinite(res)) return { isMath: true, url: `= ${res}`, title: `Calculator: ${q}`, score: 10000 };
            } catch (e) { }
        }
        return null;
    }, [inputValue, smartCalc]);

    const aiPrediction = useMemo(() => {
        const q = inputValue.trim();
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
    }, [inputValue]);

    const filteredPredictions = useMemo(() => {
        const normalizeUrl = (u) => (u || '').trim().toLowerCase().replace(/\/$/, '');
        const normalizeTitle = (t) => (t || '').replace(/^Search [^:]+:\s*"?/i, '').replace(/"$/, '').trim().toLowerCase();

        const basePredictions = getSmartPredictions(inputValue);
        const apiPredictions = liveSuggestions.map(s => ({
            url: effectiveBang ? buildBangSearchUrl(effectiveBang, s) : parseUrlInput(s, null, customBangs),
            title: s,
            score: 50,
            isSearch: true,
            bang: effectiveBang
        }));

        const merged = [];
        const seenMergedUrls = new Set();
        const seenMergedTitles = new Set();

        [...basePredictions, ...apiPredictions].forEach(p => {
            const normU = normalizeUrl(p.url);
            const normT = normalizeTitle(p.title);
            if ((normU && seenMergedUrls.has(normU)) || (normT && seenMergedTitles.has(normT))) return;
            if (normU) seenMergedUrls.add(normU);
            if (normT) seenMergedTitles.add(normT);
            merged.push(p);
        });

        const parsedInput = parseUrlInput(inputValue, activeBang, customBangs);
        const allEngines = getAllSearchEngines(customSearchEngines);
        const isSearchEngineUrl = !!effectiveBang || !!keywordEngineMatch ||
                                  allEngines.some(e => {
                                      try {
                                          const host = new URL(e.url.replace(/%s/g, '').replace(/\{q\}/g, '')).host;
                                          return parsedInput.includes(host);
                                      } catch {
                                          return false;
                                      }
                                  }) ||
                                  parsedInput.includes('duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion');
        const isDirectUrl = parsedInput && !isSearchEngineUrl;
        const isLocalInput = parsedInput && parsedInput.startsWith('file://');
        const directUrlPrediction = isDirectUrl ? { 
            url: parsedInput, 
            title: isLocalInput ? `Open ${parsedInput.endsWith('/') || parsedInput.endsWith('\\') ? 'Folder' : 'File'}: ${inputValue}` : `Go to ${parsedInput}`, 
            score: 100000,
            isLocalFile: isLocalInput,
            isDirectory: parsedInput.endsWith('/') || parsedInput.endsWith('\\')
        } : null;

        const searchPrediction = (!isDirectUrl && (effectiveQueryText.length > 0 || effectiveBang || keywordEngineMatch)) ? [{
            url: effectiveBang 
                ? buildBangSearchUrl(effectiveBang, effectiveQueryText) 
                : (keywordEngineMatch 
                    ? buildSearchEngineUrl(keywordEngineMatch.engine, keywordEngineMatch.queryText, customSearchEngines, isTor) 
                    : parsedInput),
            title: effectiveBang 
                ? (effectiveQueryText ? `Search ${effectiveBang.name}: "${effectiveQueryText}"` : `Go to ${effectiveBang.name}`) 
                : (keywordEngineMatch 
                    ? `Search ${keywordEngineMatch.engine.name}: "${keywordEngineMatch.queryText}"`
                    : `Search ${currentEngineName}: "${inputValue.trim()}"`),
            score: 150000,
            isSearch: true,
            bang: effectiveBang
        }] : [];

        const localPredictions = localSuggestions.map(match => ({
            url: match.url,
            title: match.name,
            subtitle: match.path,
            rawPath: match.path,
            score: 300000,
            isLocalFile: true,
            isDirectory: match.isDirectory,
            extension: match.extension
        }));

        let rawFinalPreds = [
            ...localPredictions,
            ...(aiPrediction 
                ? [aiPrediction, ...merged] 
                : mathPrediction 
                    ? [mathPrediction, ...merged] 
                    : [...searchPrediction, ...merged])
        ];

        if (directUrlPrediction && !aiPrediction && !localPredictions.some(p => normalizeUrl(p.url) === normalizeUrl(directUrlPrediction.url))) {
            rawFinalPreds = [directUrlPrediction, ...rawFinalPreds];
        }

        const finalPreds = [];
        const seenFinalUrls = new Set();
        const seenFinalTitles = new Set();
        rawFinalPreds.forEach(p => {
            if (!p) return;
            const normU = normalizeUrl(p.url);
            const normT = normalizeTitle(p.title);
            if ((normU && seenFinalUrls.has(normU)) || (normT && seenFinalTitles.has(normT))) return;
            if (normU) seenFinalUrls.add(normU);
            if (normT) seenFinalTitles.add(normT);
            finalPreds.push(p);
        });

        return finalPreds.slice(0, 14);
    }, [inputValue, activeBang, effectiveBang, effectiveQueryText, customBangs, customSearchEngines, keywordEngineMatch, currentEngineName, isTor, getSmartPredictions, liveSuggestions, localSuggestions, aiPrediction, mathPrediction]);

    const shouldShowDropdown = Boolean(isActive && (inputValue.trim().length > 0 || isBangSuggestionMode || activeBang));
    const [displayedDropdown, setDisplayedDropdown] = useState(false);
    const [isDropdownClosing, setIsDropdownClosing] = useState(false);
    const dropdownCloseTimerRef = useRef(null);

    const closeDropdownWithAnimation = useCallback((onAfterClose) => {
        if (dropdownCloseTimerRef.current) clearTimeout(dropdownCloseTimerRef.current);
        setIsDropdownClosing(true);
        const timeout = getAnimationTimeout(160);
        dropdownCloseTimerRef.current = setTimeout(() => {
            setDisplayedDropdown(false);
            setIsDropdownClosing(false);
            onAfterClose?.();
        }, timeout);
    }, []);

    useEffect(() => {
        if (shouldShowDropdown) {
            if (dropdownCloseTimerRef.current) {
                clearTimeout(dropdownCloseTimerRef.current);
                dropdownCloseTimerRef.current = null;
            }
            setDisplayedDropdown(true);
            setIsDropdownClosing(false);
        } else if (displayedDropdown) {
            setIsDropdownClosing(true);
            const timeout = getAnimationTimeout(160);
            if (dropdownCloseTimerRef.current) clearTimeout(dropdownCloseTimerRef.current);
            dropdownCloseTimerRef.current = setTimeout(() => {
                setDisplayedDropdown(false);
                setIsDropdownClosing(false);
                dropdownCloseTimerRef.current = null;
            }, timeout);
        }
    }, [shouldShowDropdown, displayedDropdown]);

    useEffect(() => {
        return () => {
            if (dropdownCloseTimerRef.current) clearTimeout(dropdownCloseTimerRef.current);
        };
    }, []);

    const handleExecuteCommand = useCallback(async (cmdId) => {
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
                onClose?.(true);
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
                onClose?.(true);
                uiStore.printActivePage();
                break;

            case 'pdf':
                onClose?.(true);
                uiStore.saveActivePageAsPDF();
                break;

            case 'screenshot':
                onClose?.(true);
                uiStore.setIsScreenshotBarOpen(true);
                break;

            case 'snip':
                onClose?.(true);
                setTimeout(() => {
                    uiStore.setIsSnippingMode(true);
                }, 50);
                break;

            case 'reader':
                onClose?.(true);
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
                import('../store/useTorStore').then(m => {
                    m.default.getState().toggleTorEnabled();
                }).catch(() => {});
                break;
            }

            case 'newnym': {
                import('../store/useTorStore').then(m => {
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
        onClose?.(true);
    }, [openTabMap, showToast, onClose, setIsForceDark, setIsSidebarHidden]);

    const handleSelectPrediction = useCallback((pred) => {
        if (!pred) return;
        if (pred.isAI) {
            useUIStore.getState().setIsRightPanelOpen(true);
            useUIStore.getState().setRightPanelTab('ai');
            if (pred.query) {
                useAIStore.getState().sendChatMessage(pred.query, useUIStore.getState().currentUrl);
            }
            onClose?.(true);
            return;
        }

        if (pred.isMath) {
            navigator.clipboard.writeText(pred.url.replace('= ', ''));
            showToast(`Copied to clipboard: ${pred.url.replace('= ', '')}`);
            onClose?.(false);
            return;
        }

        if (pred.isLocalFile || (pred.url && pred.url.startsWith('file://'))) {
            useTabStore.getState().openLocalFiles([pred.url]);
            onClose?.(true);
            return;
        }

        const targetUrl = pred.url;
        if (targetUrl) {
            const norm = targetUrl.toLowerCase();
            if (norm.startsWith('qbrowse://settings') || norm.startsWith('chrome://settings')) {
                const sub = targetUrl.split('settings/')[1] || targetUrl.split('settings#')[1] || 'appearance';
                useUIStore.getState().openSettings(sub);
                onClose?.(true);
                return;
            }
            if (norm.startsWith('qbrowse://history') || norm.startsWith('chrome://history')) {
                useUIStore.getState().openModal('history');
                onClose?.(true);
                return;
            }
            if (norm.startsWith('qbrowse://cookies')) {
                useUIStore.getState().openModal('cookies');
                onClose?.(true);
                return;
            }
            if (norm.startsWith('qbrowse://resources') || norm.startsWith('qbrowse://taskmanager')) {
                useUIStore.getState().openModal('resources');
                onClose?.(true);
                return;
            }
            if (norm.startsWith('qbrowse://downloads') || norm.startsWith('chrome://downloads')) {
                useUIStore.getState().setIsToolHubOpen(true);
                onClose?.(true);
                return;
            }
        }

        const cleanTitle = pred.isSearch
            ? ((pred.title || '').replace(/^Search [^:]+:\s*"?/i, '').replace(/"$/, '').trim() || effectiveQueryText || inputValue.trim())
            : pred.title;

        setCurrentUrl(targetUrl);

        if (onNavigate) {
            onNavigate(targetUrl, cleanTitle);
        } else {
            const isSplit = useUIStore.getState().isSplitView;
            const focusedPane = useUIStore.getState().focusedPane;
            const splitRightTabId = useUIStore.getState().splitRightTabId;

            const currentTabs = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : (activeSpace === 'tor' ? torTabs : ghostTabs));
            let targetTab = null;

            if (isSplit && focusedPane === 'right' && splitRightTabId) {
                targetTab = currentTabs.find(t => t.id === splitRightTabId);
            }
            if (!targetTab) {
                targetTab = currentTabs.find(t => t.active);
            }

            if (targetTab && !searchInNewTab) {
                useTabStore.getState().handleNavigateTab(targetTab.id, targetUrl, cleanTitle);
            } else {
                useTabStore.getState().handleNewTab(targetUrl);
            }
        }

        if (activeSpace === 'tor') {
            const torStatus = useTorStore.getState().status;
            if (torStatus !== 'connected' && torStatus !== 'starting' && torStatus !== 'downloading') {
                useTorStore.getState().startTor();
            }
        }
        onClose?.(true);
    }, [showToast, onClose, setCurrentUrl, onNavigate, activeSpace, privateTabs, workTabs, torTabs, ghostTabs, searchInNewTab, effectiveQueryText, inputValue]);

    const handleInputChange = useCallback((e) => {
        const val = e.target.value;
        setSelectedOptionText(null);
        originalQueryRef.current = val;

        // Check if user completed a bang trigger with a space, e.g. "!yt " or "@github "
        if (!activeBang && (val.startsWith('!') || val.startsWith('@')) && val.includes(' ')) {
            const spaceIdx = val.indexOf(' ');
            const trigger = val.slice(0, spaceIdx).trim();
            const remainder = val.slice(spaceIdx + 1);
            const matchedBang = findBangByTrigger(trigger, customBangs) || findBangByKeywordOrTrigger(trigger, customBangs, customSearchEngines);
            if (matchedBang) {
                setActiveBang(matchedBang);
                setInputValue(remainder);
                originalQueryRef.current = remainder;
                return;
            }
        }
        setInputValue(val);
    }, [activeBang, customBangs, customSearchEngines]);

    const handleOptionMouseMove = useCallback((i, e) => {
        if (Math.abs(e.clientX - lastMousePosRef.current.x) > 3 || Math.abs(e.clientY - lastMousePosRef.current.y) > 3) {
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            if (selectedIndex !== i) {
                setSelectedIndex(i);
            }
        }
    }, [selectedIndex]);

    const navigateOptions = useCallback((direction) => {
        const max = isCommandMode 
            ? filteredCommands.length 
            : (isBangSuggestionMode ? bangSuggestions.length : filteredPredictions.length);

        if (max <= 0) return;

        const nextIndex = (selectedIndex + direction + max) % max;
        setSelectedIndex(nextIndex);

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
                if (pred.isLocalFile) {
                    previewText = getCompletedSuggestionText(pred, inputValue);
                } else if (nextIndex === 0 && originalQueryRef.current && pred.isSearch) {
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
    }, [isCommandMode, filteredCommands, isBangSuggestionMode, bangSuggestions, filteredPredictions, selectedIndex, inputValue]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setSelectedOptionText(null);
            setSelectedIndex(0);
            setActiveBang(null);
            onClose?.(false);
            return;
        } else if (e.key === 'Backspace' && inputValue === '' && activeBang) {
            e.preventDefault();
            const trigger = activeBang.bangs?.[0] || `!${activeBang.prefix}`;
            setActiveBang(null);
            setSelectedOptionText(null);
            setInputValue(trigger);
            originalQueryRef.current = trigger;
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (!activeBang && !isCommandMode) {
                const trimmedInput = inputValue.trim();
                const matchedBang = !trimmedInput.includes(' ')
                    ? findBangByKeywordOrTrigger(trimmedInput, customBangs, customSearchEngines)
                    : null;
                if (matchedBang && (!isBangSuggestionMode || selectedOptionText === null)) {
                    setActiveBang(matchedBang);
                    setSelectedOptionText(null);
                    setInputValue('');
                    originalQueryRef.current = '';
                    return;
                }
            }
            if (isBangSuggestionMode && bangSuggestions.length > 0) {
                const target = bangSuggestions[selectedIndex] || bangSuggestions[0];
                if (target) {
                    setActiveBang(target);
                    setSelectedOptionText(null);
                    setInputValue('');
                    originalQueryRef.current = '';
                }
            } else if (!isCommandMode && filteredPredictions.length > 0) {
                const target = filteredPredictions[selectedIndex] || filteredPredictions[0];
                if (target) {
                    const text = getCompletedSuggestionText(target, inputValue);
                    originalQueryRef.current = text;
                    setSelectedOptionText(null);
                    setInputValue(text);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateOptions(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateOptions(-1);
        } else if (e.key === 'ArrowRight' && inputRef.current) {
            const input = inputRef.current;
            const currentVal = input.value;
            if (input.selectionStart === currentVal.length && !isCommandMode && !isBangSuggestionMode && filteredPredictions.length > 0) {
                const target = filteredPredictions[selectedIndex];
                if (target) {
                    const text = getCompletedSuggestionText(target, currentVal);
                    if (text && text.toLowerCase().startsWith(currentVal.toLowerCase()) && text !== currentVal) {
                        e.preventDefault();
                        originalQueryRef.current = text;
                        setSelectedOptionText(null);
                        setInputValue(text);
                    }
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isCommandMode && filteredCommands.length > 0) {
                handleExecuteCommand(filteredCommands[selectedIndex]?.id || filteredCommands[0].id);
            } else if (isBangSuggestionMode && bangSuggestions.length > 0 && !inputValue.includes(' ')) {
                const target = bangSuggestions[selectedIndex] || bangSuggestions[0];
                if (target) {
                    setActiveBang(target);
                    setSelectedOptionText(null);
                    setInputValue('');
                }
            } else if (!isCommandMode) {
                if (filteredPredictions.length > 0) {
                    handleSelectPrediction(filteredPredictions[selectedIndex] || filteredPredictions[0]);
                } else if (inputValue.trim().length > 0 || activeBang) {
                    const val = selectedOptionText !== null ? selectedOptionText : (inputRef.current?.value || inputValue);
                    const url = parseUrlInput(val, activeBang, customBangs);
                    const title = val.trim();
                    handleSelectPrediction({ url, title, isSearch: true });
                }
            }
        }
    }, [selectedOptionText, activeBang, inputValue, isBangSuggestionMode, bangSuggestions, selectedIndex, isCommandMode, filteredPredictions, navigateOptions, filteredCommands, handleExecuteCommand, handleSelectPrediction, customBangs, customSearchEngines, onClose]);

    const clearActiveBang = useCallback(() => {
        setActiveBang(null);
        setSelectedOptionText(null);
    }, []);

    return {
        inputValue,
        setInputValue,
        activeBang,
        setActiveBang,
        clearActiveBang,
        selectedIndex,
        setSelectedIndex,
        selectedOptionText,
        setSelectedOptionText,
        inputRef,
        containerRef,
        dropdownRef,
        originalQueryRef,
        isTor,
        isIncognito,
        isBright,
        isCommandMode,
        isBangSuggestionMode,
        bangSuggestions,
        filteredCommands,
        filteredPredictions,
        currentEngineName,
        shouldShowDropdown,
        displayedDropdown,
        isDropdownClosing,
        closeDropdownWithAnimation,
        handleInputChange,
        handleOptionMouseMove,
        handleKeyDown,
        handleExecuteCommand,
        handleSelectPrediction,
        navigateOptions
    };
}
