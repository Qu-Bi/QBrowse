import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Activity, Cpu, HardDrive, Zap, Moon, RefreshCw, Search, X, 
    Layers, Trash2, ArrowRight, Power, Shield, Clock, Monitor, Globe,
    ChevronUp, ChevronDown, Check, ShieldAlert
} from 'lucide-react';
import useUIStore, { getAnimationTimeout } from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function ResourceManagerModal() {
    const { activeModal, isModalClosing, closeModal, showToast, theme } = useUIStore();
    const { 
        privateTabs, workTabs, ghostTabs, torTabs, activeSpace,
        suspendTab, wakeTab, closeTabById, handleSwitchToTab,
        setPrivateTabs, setWorkTabs, setGhostTabs, setTorTabs
    } = useTabStore();

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    const isClosingThis = isModalClosing && (
        useUIStore.getState().closingModal === 'tasks' || 
        useUIStore.getState().closingModal === 'resources' || 
        useUIStore.getState().closingModal === 'top'
    );

    const isOpen = (
        activeModal === 'tasks' || 
        activeModal === 'resources' || 
        activeModal === 'top'
    ) || isClosingThis;

    const [metrics, setMetrics] = useState([]);
    const [systemInfo, setSystemInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'tabs' | 'processes' | 'sleeping'
    const [sortBy, setSortBy] = useState('memory'); // 'memory' | 'cpu' | 'name' | 'type'
    const [sortAsc, setSortAsc] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const [terminatingPids, setTerminatingPids] = useState(new Set());

    // Filter Bar Sliding Pill Refs & State (Spaces Switcher Physics)
    const filterBarRef = useRef(null);
    const filterBtnRefs = useRef({});
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const [hoveredFilter, setHoveredFilter] = useState(null);
    const [hoverPillStyle, setHoverPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

    // Fetch live process metrics from Electron
    const fetchMetrics = useCallback(async () => {
        if (!window.electronAPI?.getAppMetrics) return;
        try {
            setIsLoading(true);
            const data = await window.electronAPI.getAppMetrics();
            if (Array.isArray(data)) {
                setMetrics(data);
                if (data.system) setSystemInfo(data.system);
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.processes)) setMetrics(data.processes);
                if (data.system) setSystemInfo(data.system);
            }
            setLastUpdated(Date.now());
        } catch (e) {
            console.warn('[ResourceManager] Failed to fetch app metrics:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch & live polling loop
    useEffect(() => {
        if (isOpen) {
            fetchMetrics();
        }
    }, [isOpen, fetchMetrics]);

    useEffect(() => {
        if (!isOpen || !autoRefresh) return;
        const timer = setInterval(() => {
            fetchMetrics();
        }, 2000);
        return () => clearInterval(timer);
    }, [isOpen, autoRefresh, fetchMetrics]);

    // Aggregate tabs across spaces
    const allTabs = useMemo(() => {
        const list = [];
        privateTabs.forEach(t => list.push({ ...t, space: 'personal' }));
        workTabs.forEach(t => list.push({ ...t, space: 'work' }));
        ghostTabs.forEach(t => list.push({ ...t, space: 'ghost' }));
        (torTabs || []).forEach(t => list.push({ ...t, space: 'tor' }));
        return list;
    }, [privateTabs, workTabs, ghostTabs, torTabs]);

    const liveTabCount = useMemo(() => allTabs.filter(t => !t.suspended && t.url && t.url !== 'about:blank').length, [allTabs]);
    const suspendedTabCount = useMemo(() => allTabs.filter(t => t.suspended).length, [allTabs]);

    // Total memory consumed by processes
    const totalAppMemMB = useMemo(() => {
        return metrics.reduce((acc, m) => acc + (m.memoryMB || 0), 0);
    }, [metrics]);

    // Total CPU load
    const totalCpuPercent = useMemo(() => {
        return Math.round(metrics.reduce((acc, m) => acc + (m.cpu || 0), 0) * 10) / 10;
    }, [metrics]);

    // Process type descriptive labels
    const getProcessLabel = (type, isMain) => {
        if (isMain) return 'QBrowse Main Process';
        switch (type?.toLowerCase()) {
            case 'gpu':
                return 'GPU Process';
            case 'tab':
            case 'renderer':
                return 'Webview Renderer';
            case 'utility':
                return 'Utility Service (Audio/Storage)';
            case 'zygote':
                return 'Sandbox Preloader';
            case 'pepperplugin':
                return 'Plugin Host';
            default:
                return `${type || 'Child'} Process`;
        }
    };

    // Combine Tab entities and Process entities for unified listing
    const combinedItems = useMemo(() => {
        const items = [];

        // 1. Add Browser Tabs
        allTabs.forEach(tab => {
            const isTabActive = tab.active && tab.space === activeSpace;
            const isBlank = !tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://newtab');
            const estMem = (tab.suspended || isBlank) ? 0 : 85; 
            items.push({
                id: `tab-${tab.id}`,
                tabId: tab.id,
                isTab: true,
                title: tab.title || tab.url || 'Blank Tab',
                subtitle: isBlank ? 'Zen New Tab Dashboard' : (tab.url || 'about:blank'),
                space: tab.space,
                active: isTabActive,
                suspended: !!tab.suspended || isBlank,
                cpu: isBlank ? 0 : (isTabActive ? 0.3 : (tab.suspended ? 0 : 0.05)),
                memoryMB: estMem,
                rawItem: tab
            });
        });

        // 2. Add System Processes
        metrics.forEach(proc => {
            items.push({
                id: `proc-${proc.pid}`,
                pid: proc.pid,
                isProcess: true,
                title: getProcessLabel(proc.type, proc.isMain),
                subtitle: `PID ${proc.pid} · ${proc.type}`,
                type: proc.type,
                isMain: !!proc.isMain,
                cpu: proc.cpu || 0,
                memoryMB: proc.memoryMB || 0,
                peakMemoryMB: proc.peakMemoryMB || 0,
                rawItem: proc
            });
        });

        return items;
    }, [allTabs, metrics, activeSpace]);

    // Filter items
    const filteredItems = useMemo(() => {
        return combinedItems.filter(item => {
            if (activeFilter === 'tabs' && !item.isTab) return false;
            if (activeFilter === 'processes' && !item.isProcess) return false;
            if (activeFilter === 'sleeping' && (!item.isTab || !item.suspended)) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const matchTitle = (item.title || '').toLowerCase().includes(q);
            const matchSub = (item.subtitle || '').toLowerCase().includes(q);
            const matchPid = item.pid ? String(item.pid).includes(q) : false;
            const matchSpace = item.space ? item.space.toLowerCase().includes(q) : false;
            return matchTitle || matchSub || matchPid || matchSpace;
        });
    }, [combinedItems, activeFilter, searchQuery]);

    // Sort items
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            let res = 0;
            if (sortBy === 'memory') {
                res = (b.memoryMB || 0) - (a.memoryMB || 0);
            } else if (sortBy === 'cpu') {
                res = (b.cpu || 0) - (a.cpu || 0);
            } else if (sortBy === 'name') {
                res = (a.title || '').localeCompare(b.title || '');
            } else if (sortBy === 'type') {
                const typeA = a.isTab ? (a.space || 'tab') : (a.type || 'proc');
                const typeB = b.isTab ? (b.space || 'tab') : (b.type || 'proc');
                res = typeA.localeCompare(typeB);
            }
            return sortAsc ? -res : res;
        });
    }, [filteredItems, sortBy, sortAsc]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortBy(field);
            setSortAsc(false);
        }
    };

    // Filter definitions
    const filterOptions = useMemo(() => [
        { id: 'all', label: 'All', count: combinedItems.length },
        { id: 'tabs', label: 'Tabs', count: allTabs.length },
        { id: 'processes', label: 'Processes', count: metrics.length },
        { id: 'sleeping', label: 'Sleeping', count: suspendedTabCount }
    ], [combinedItems.length, allTabs.length, metrics.length, suspendedTabCount]);

    // Measure Sliding Pill Geometry for Spaces-Style Filter Switcher
    const updateFilterPillGeometry = useCallback(() => {
        const btn = filterBtnRefs.current[activeFilter];
        const bar = filterBarRef.current;
        if (btn && bar && btn.offsetWidth > 0) {
            setPillStyle({
                left: btn.offsetLeft,
                width: btn.offsetWidth,
                opacity: 1
            });
        }
    }, [activeFilter]);

    useEffect(() => {
        if (!isOpen) return;
        updateFilterPillGeometry();
        const raf = requestAnimationFrame(updateFilterPillGeometry);
        const timer = setTimeout(updateFilterPillGeometry, 50);
        window.addEventListener('resize', updateFilterPillGeometry);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timer);
            window.removeEventListener('resize', updateFilterPillGeometry);
        };
    }, [isOpen, activeFilter, updateFilterPillGeometry]);

    useEffect(() => {
        if (!isOpen) return;
        updateFilterPillGeometry();
    }, [isOpen, filterOptions, updateFilterPillGeometry]);

    useEffect(() => {
        if (!isOpen || !hoveredFilter) {
            setHoverPillStyle(prev => ({ ...prev, opacity: 0 }));
            return;
        }
        const btn = filterBtnRefs.current[hoveredFilter];
        const bar = filterBarRef.current;
        if (btn && bar && btn.offsetWidth > 0) {
            setHoverPillStyle({
                left: btn.offsetLeft,
                width: btn.offsetWidth,
                opacity: hoveredFilter !== activeFilter ? 1 : 0
            });
        }
    }, [isOpen, hoveredFilter, activeFilter]);

    // Quick Action: Sleep all background tabs
    const handleHibernateInactiveTabs = () => {
        let count = 0;
        const sleepTabs = (tabs, setTabs) => {
            const updated = tabs.map(t => {
                const isActive = t.active && t.space === activeSpace;
                if (!isActive && !t.suspended && t.url && t.url !== 'about:blank') {
                    count++;
                    return { ...t, suspended: true };
                }
                return t;
            });
            setTabs(updated);
        };

        sleepTabs(privateTabs, setPrivateTabs);
        sleepTabs(workTabs, setWorkTabs);
        sleepTabs(ghostTabs, setGhostTabs);
        if (torTabs && setTorTabs) sleepTabs(torTabs, setTorTabs);

        const freedEst = count * 120;
        showToast(`Hibernated ${count} inactive tab${count === 1 ? '' : 's'} (~${freedEst} MB RAM freed)`);
        fetchMetrics();
    };

    // Quick Action: Wake all tabs
    const handleWakeAllTabs = () => {
        let count = 0;
        const wakeAll = (tabs, setTabs) => {
            const updated = tabs.map(t => {
                if (t.suspended) {
                    count++;
                    return { ...t, suspended: false };
                }
                return t;
            });
            setTabs(updated);
        };

        wakeAll(privateTabs, setPrivateTabs);
        wakeAll(workTabs, setWorkTabs);
        wakeAll(ghostTabs, setGhostTabs);
        if (torTabs && setTorTabs) wakeAll(torTabs, setTorTabs);

        showToast(`Restored ${count} sleeping tab${count === 1 ? '' : 's'}`);
        fetchMetrics();
    };

    // Quick Action: Purge Cache
    const handlePurgeCache = async () => {
        if (window.electronAPI?.clearAllData) {
            await window.electronAPI.clearAllData({ cache: true, storage: false, cookies: false });
            showToast('Browser cache purged & memory trimmed');
            fetchMetrics();
        }
    };

    // End Process Task
    const handleKillProcess = async (pid) => {
        if (!pid) return;
        if (!window.electronAPI?.killProcess) {
            showToast('Cannot terminate process: API unavailable');
            return;
        }

        setTerminatingPids(prev => new Set([...prev, pid]));
        const timeout = getAnimationTimeout(200);
        setTimeout(async () => {
            try {
                const ok = await window.electronAPI.killProcess(pid);
                if (ok) {
                    showToast(`Terminated process ${pid}`);
                    setMetrics(prev => prev.filter(p => p.pid !== pid));
                } else {
                    showToast(`Unable to terminate process ${pid}`);
                }
            } catch (e) {
                showToast(`Error killing process ${pid}`);
            } finally {
                setTerminatingPids(prev => {
                    const next = new Set(prev);
                    next.delete(pid);
                    return next;
                });
                setTimeout(fetchMetrics, 500);
            }
        }, timeout);
    };

    // Switch to a Tab
    const handleJumpToTab = (tabId, space) => {
        handleSwitchToTab(tabId, space);
        closeModal();
    };

    if (!isOpen) return null;

    return (
        <div 
            className={`absolute inset-0 z-[200] flex items-center justify-center p-4 select-none font-sans ${
                isBright ? 'bg-black/35 backdrop-blur-md text-zinc-900' : 'bg-black/60 backdrop-blur-md text-white'
            } ${isModalClosing ? 'animate-modal-out' : 'animate-modal'}`}
            onClick={closeModal}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div 
                id="resource-manager-modal"
                className={`w-full max-w-4xl h-[82vh] min-h-[540px] rounded-3xl flex flex-col overflow-hidden relative shadow-2xl ${
                    isModalClosing ? 'animate-modal-dialog-out' : 'animate-modal-dialog'
                } ${
                    isBright 
                        ? 'bg-white border border-zinc-200/90 text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)]' 
                        : 'bg-[#14151a] border border-white/[0.08] text-white shadow-[0_30px_70px_rgba(0,0,0,0.7)]'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Clean, Native Desktop Header */}
                <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 ${
                    isBright ? 'border-zinc-200 bg-zinc-50/80' : 'border-white/[0.07] bg-white/[0.02]'
                }`}>
                    {/* Left: Window Title & Telemetry Strip */}
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                isBright ? 'bg-zinc-200/60 border-zinc-300 text-zinc-700' : 'bg-white/[0.06] border-white/10 text-zinc-300'
                            }`}>
                                <Activity size={15} />
                            </div>
                            <h2 className="text-sm font-bold tracking-tight">Task Manager</h2>
                        </div>

                        {/* Telemetry Pills (Clean, rounded-full, high-density stats) */}
                        <div className="hidden sm:flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
                                isBright ? 'bg-white border-zinc-200 text-zinc-600 shadow-xs' : 'bg-white/[0.03] border-white/[0.06] text-zinc-300'
                            }`}>
                                <span className="opacity-50">CPU</span>
                                <span className="font-semibold">{totalCpuPercent}%</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
                                isBright ? 'bg-white border-zinc-200 text-zinc-600 shadow-xs' : 'bg-white/[0.03] border-white/[0.06] text-zinc-300'
                            }`}>
                                <span className="opacity-50">RAM</span>
                                <span className="font-semibold">{totalAppMemMB} MB</span>
                            </div>
                            {suspendedTabCount > 0 && (
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
                                    isBright ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-white/[0.03] border-white/[0.06] text-zinc-400'
                                }`}>
                                    <Moon size={11} className="opacity-60" />
                                    <span>{suspendedTabCount} asleep</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Clean Actions Bar with Rounded Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={handleHibernateInactiveTabs}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 border cursor-pointer active:scale-95 ${
                                isBright 
                                    ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 shadow-xs' 
                                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300'
                            }`}
                            title="Sleep inactive background tabs to free memory"
                        >
                            <Moon size={12} />
                            <span className="hidden md:inline">Sleep Inactive</span>
                        </button>

                        {suspendedTabCount > 0 && (
                            <button
                                onClick={handleWakeAllTabs}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 border cursor-pointer active:scale-95 ${
                                    isBright 
                                        ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 shadow-xs' 
                                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300'
                                }`}
                                title="Wake all hibernated tabs"
                            >
                                <Zap size={12} />
                                <span className="hidden md:inline">Wake All</span>
                            </button>
                        )}

                        <button
                            onClick={handlePurgeCache}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border cursor-pointer active:scale-95 ${
                                isBright 
                                    ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600 shadow-xs' 
                                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-400 hover:text-white'
                            }`}
                            title="Trim browser memory cache"
                        >
                            <Trash2 size={13} />
                        </button>

                        <div className={`w-px h-3.5 mx-0.5 ${isBright ? 'bg-zinc-200' : 'bg-white/10'}`} />

                        {/* Polling Toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-mono border flex items-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
                                isBright 
                                    ? (autoRefresh ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-600')
                                    : (autoRefresh ? 'bg-white/[0.06] border-white/15 text-zinc-200' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300')
                            }`}
                            title={autoRefresh ? "Auto-refresh active (every 2s)" : "Auto-refresh paused"}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500' : (isBright ? 'bg-zinc-300' : 'bg-zinc-600')}`} />
                            <span className="hidden sm:inline">{autoRefresh ? '2s' : 'Paused'}</span>
                        </button>

                        <button 
                            onClick={fetchMetrics}
                            disabled={isLoading}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 disabled:opacity-40 cursor-pointer active:scale-95 ${
                                isBright ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600 shadow-xs' : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-400 hover:text-white'
                            }`}
                            title="Refresh process metrics"
                        >
                            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        </button>

                        <button 
                            onClick={closeModal} 
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
                                isBright ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600 shadow-xs' : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-400 hover:text-white'
                            }`}
                            title="Close (ESC)"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Toolbar: Spaces-Style Category Switcher & Search Input */}
                <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 ${
                    isBright ? 'border-zinc-200 bg-white' : 'border-white/[0.06] bg-black/20'
                }`}>
                    {/* Spaces-Style Sliding Pill Switcher */}
                    <div
                        ref={filterBarRef}
                        onMouseLeave={() => setHoveredFilter(null)}
                        className={`relative flex items-center p-1 rounded-full border shadow-xs transition-colors duration-200 select-none ${
                            isBright 
                                ? 'bg-black/[0.03] border-black/[0.06]' 
                                : 'bg-[#0c0d14]/78 border-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                        }`}
                    >
                        {/* Subtle Hover Preview Pill */}
                        <div
                            className={`absolute top-1 bottom-1 rounded-full transition-all duration-200 pointer-events-none ${
                                isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                            }`}
                            style={{
                                left: hoverPillStyle.left,
                                width: hoverPillStyle.width,
                                opacity: hoveredFilter && hoveredFilter !== activeFilter ? hoverPillStyle.opacity : 0
                            }}
                        />

                        {/* Signature Liquid Glass Sliding Pill */}
                        <div
                            className={`absolute top-1 bottom-1 rounded-full border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none ${
                                isBright
                                    ? 'bg-white border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                    : 'shadow-xs'
                            }`}
                            style={{
                                left: pillStyle.left,
                                width: pillStyle.width,
                                opacity: pillStyle.opacity,
                                ...(!isBright ? {
                                    borderColor: 'var(--accent-30, rgba(212, 188, 148, 0.4))',
                                    backgroundColor: 'var(--accent-15, rgba(212, 188, 148, 0.16))',
                                    boxShadow: '0 2px 10px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                                } : {})
                            }}
                        />

                        {filterOptions.map(f => {
                            const isActive = activeFilter === f.id;
                            return (
                                <button
                                    key={f.id}
                                    ref={el => { filterBtnRefs.current[f.id] = el; }}
                                    onMouseEnter={() => setHoveredFilter(f.id)}
                                    onClick={() => setActiveFilter(f.id)}
                                    className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors duration-200 active:scale-95 cursor-pointer outline-none focus:outline-none select-none ${
                                        isActive
                                            ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                            : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/60 hover:text-white')
                                    }`}
                                >
                                    <span>{f.label}</span>
                                    <span className={`text-[10px] font-mono transition-opacity ${isActive ? 'opacity-80' : 'opacity-40'}`}>
                                        ({f.count})
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Clean Rounded Search Input */}
                    <div className="relative flex items-center">
                        <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by name, PID..."
                            className={`border rounded-full h-8 pl-9 pr-7 text-xs transition-all w-60 font-mono outline-none ${
                                isBright 
                                    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-400 shadow-xs' 
                                    : 'bg-black/35 border-white/10 text-white placeholder-zinc-500 focus:border-white/25'
                            }`}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center transition ${isBright ? 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Headers (Clickable Column Sorting) */}
                <div className={`grid grid-cols-12 gap-3 px-6 py-2 border-b text-[11px] font-semibold select-none ${
                    isBright ? 'border-zinc-200 text-zinc-500 bg-zinc-50/50' : 'border-white/[0.06] text-zinc-400 bg-white/[0.015]'
                }`}>
                    <div 
                        onClick={() => handleSort('name')}
                        className="col-span-5 flex items-center gap-1 cursor-pointer hover:text-accent transition"
                    >
                        <span>Task / Process</span>
                        {sortBy === 'name' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                    <div 
                        onClick={() => handleSort('type')}
                        className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-accent transition"
                    >
                        <span>Space / Type</span>
                        {sortBy === 'type' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                    <div className="col-span-1 text-center">Status</div>
                    <div 
                        onClick={() => handleSort('cpu')}
                        className="col-span-1 flex items-center justify-end gap-1 cursor-pointer hover:text-accent transition"
                    >
                        <span>CPU</span>
                        {sortBy === 'cpu' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                    <div 
                        onClick={() => handleSort('memory')}
                        className="col-span-2 flex items-center justify-end gap-1 cursor-pointer hover:text-accent transition"
                    >
                        <span>Memory</span>
                        {sortBy === 'memory' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                    <div className="col-span-1 text-right">Action</div>
                </div>

                {/* Task List Table Body */}
                <div className={`flex-1 overflow-y-auto divide-y ${isBright ? 'divide-zinc-100' : 'divide-white/[0.03]'}`}>
                    {sortedItems.length === 0 ? (
                        <div className={`h-64 flex flex-col items-center justify-center gap-2 ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            <Activity size={24} className="opacity-30" />
                            <p className="text-xs">No tasks matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        sortedItems.map((item) => {
                            const isTerminating = terminatingPids.has(item.pid);

                            return (
                                <div 
                                    key={item.id} 
                                    className={`grid grid-cols-12 gap-3 px-6 py-2.5 items-center transition-colors group ${
                                        isTerminating ? 'opacity-30 pointer-events-none' : ''
                                    } ${
                                        isBright ? 'hover:bg-zinc-50' : 'hover:bg-white/[0.025]'
                                    } ${
                                        item.isTab && item.active ? (isBright ? 'bg-zinc-100/60' : 'bg-white/[0.03]') : ''
                                    }`}
                                >
                                    {/* Task Name & Favicon/Icon */}
                                    <div className="col-span-5 flex items-center gap-3 min-w-0 pr-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${
                                            isBright ? 'bg-black/[0.03] border-black/[0.06] text-zinc-600' : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                                        }`}>
                                            {item.isProcess ? (
                                                item.isMain ? <Shield size={13} className="text-accent" /> : (item.type === 'GPU' ? <Monitor size={13} /> : <Cpu size={13} />)
                                            ) : (
                                                item.rawItem?.url && item.rawItem.url !== 'about:blank' ? (
                                                    <img 
                                                        src={`https://www.google.com/s2/favicons?sz=32&domain=${item.rawItem.url}`}
                                                        alt="" 
                                                        className="w-4 h-4 rounded-full"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    item.suspended ? <Moon size={13} className="text-zinc-400" /> : <Globe size={13} />
                                                )
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className={`text-xs truncate flex items-center gap-1.5 ${
                                                isBright ? 'text-zinc-800' : 'text-zinc-200'
                                            } ${item.active ? 'font-semibold' : 'font-normal'}`}>
                                                <span className="truncate">{item.title}</span>
                                                {item.isTab && item.active && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border ${
                                                        isBright ? 'bg-zinc-100 text-zinc-700 border-zinc-300' : 'bg-white/10 text-zinc-300 border-white/15'
                                                    }`}>
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-[10px] truncate font-mono ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                {item.subtitle}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Space / Type */}
                                    <div className="col-span-2 flex items-center">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono capitalize border ${
                                            isBright ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-white/[0.04] border-white/[0.06] text-zinc-400'
                                        }`}>
                                            {item.isTab ? `${item.space} tab` : (item.isMain ? 'Main Core' : item.type)}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-1 flex justify-center text-[10px] font-mono">
                                        {item.isTab ? (
                                            item.suspended ? (
                                                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 ${
                                                    isBright ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                                }`}>
                                                    <Moon size={9} /> Sleep
                                                </span>
                                            ) : (
                                                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1.5 ${
                                                    isBright ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                }`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                                                </span>
                                            )
                                        ) : (
                                            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${isBright ? 'text-zinc-500 bg-black/[0.02]' : 'text-zinc-500 bg-white/[0.02]'}`}>
                                                {item.pid}
                                            </span>
                                        )}
                                    </div>

                                    {/* CPU Usage */}
                                    <div className={`col-span-1 text-right font-mono text-xs tabular-nums ${
                                        item.cpu > 25 
                                            ? (isBright ? 'text-amber-700 font-semibold' : 'text-amber-400 font-semibold') 
                                            : (isBright ? 'text-zinc-700' : 'text-zinc-300')
                                    }`}>
                                        {item.cpu > 0 ? `${item.cpu}%` : <span className="opacity-30">0%</span>}
                                    </div>

                                    {/* Memory (RAM) */}
                                    <div className="col-span-2 flex items-center justify-end gap-1.5 font-mono text-xs tabular-nums">
                                        {item.memoryMB === 0 ? (
                                            <span className={`text-[10px] ${isBright ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                0 MB <span className="opacity-70">(Saved)</span>
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={isBright ? 'text-zinc-900 font-medium' : 'text-zinc-100 font-medium'}>
                                                    {item.memoryMB} MB
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex items-center justify-end gap-1">
                                        {item.isTab ? (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.suspended ? (
                                                    <button
                                                        onClick={() => wakeTab(item.tabId)}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition border cursor-pointer active:scale-95 ${
                                                            isBright ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                                                        }`}
                                                        title="Wake tab"
                                                    >
                                                        <Zap size={10} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => suspendTab(item.tabId)}
                                                        disabled={item.active}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition border cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed active:scale-95 ${
                                                            isBright ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                                                        }`}
                                                        title={item.active ? 'Active tab cannot be slept' : 'Put tab to sleep'}
                                                    >
                                                        <Moon size={10} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleJumpToTab(item.tabId, item.space)}
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition border cursor-pointer active:scale-95 ${
                                                        isBright ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                                                    }`}
                                                    title="Switch to tab"
                                                >
                                                    <ArrowRight size={10} />
                                                </button>

                                                <button
                                                    onClick={() => closeTabById(item.tabId)}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center transition border cursor-pointer text-red-500 hover:bg-red-500/15 border-transparent hover:border-red-500/30 active:scale-95"
                                                    title="Close tab"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {item.isMain ? (
                                                    <span className="text-[10px] text-zinc-500 font-mono">Core</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleKillProcess(item.pid)}
                                                        disabled={isTerminating}
                                                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center transition border cursor-pointer text-red-500 hover:bg-red-500/15 border-transparent hover:border-red-500/30 active:scale-95"
                                                        title={`End process PID ${item.pid}`}
                                                    >
                                                        <Power size={10} className={isTerminating ? 'animate-spin' : ''} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className={`px-6 py-2.5 border-t flex items-center justify-between text-[11px] font-mono ${
                    isBright ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/[0.06] bg-black/30 text-zinc-400'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <Clock size={11} className="opacity-40" />
                            {new Date(lastUpdated).toLocaleTimeString()}
                        </span>
                        <span>•</span>
                        <span>{sortedItems.length} of {combinedItems.length} items</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-60">
                        <span>Press</span>
                        <kbd className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                            isBright ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-white/[0.06] border-white/10 text-zinc-400'
                        }`}>ESC</kbd>
                        <span>to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
