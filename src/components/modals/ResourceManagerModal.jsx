import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Activity, Cpu, HardDrive, Zap, Moon, RefreshCw, Search, X, 
    Layers, Trash2, ArrowRight, Power, ShieldAlert, Sparkles,
    CheckCircle2, Clock, Check, AlertCircle, Laptop, Monitor, Globe
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function ResourceManagerModal() {
    const { activeModal, isModalClosing, closeModal, showToast } = useUIStore();
    const { 
        privateTabs, workTabs, ghostTabs, torTabs, activeSpace,
        suspendTab, wakeTab, closeTabById, handleSwitchToTab,
        setPrivateTabs, setWorkTabs, setGhostTabs, setTorTabs
    } = useTabStore();

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
    const [sortBy, setSortBy] = useState('memory'); // 'memory' | 'cpu' | 'name'
    const [sortAsc, setSortAsc] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const [terminatingPids, setTerminatingPids] = useState(new Set());

    // Fetch live process metrics from Electron
    const fetchMetrics = useCallback(async () => {
        if (!window.electronAPI?.getAppMetrics) return;
        try {
            setIsLoading(true);
            const data = await window.electronAPI.getAppMetrics();
            if (Array.isArray(data)) {
                setMetrics(data);
                if (data.system) {
                    setSystemInfo(data.system);
                }
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

    // Aggregate tabs across Personal, Work, and Ghost spaces
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

    // Total memory consumed by QBrowse processes
    const totalAppMemMB = useMemo(() => {
        return metrics.reduce((acc, m) => acc + (m.memoryMB || 0), 0);
    }, [metrics]);

    // Total CPU load
    const totalCpuPercent = useMemo(() => {
        return Math.round(metrics.reduce((acc, m) => acc + (m.cpu || 0), 0) * 10) / 10;
    }, [metrics]);

    // Peak process
    const peakProcess = useMemo(() => {
        if (!metrics || metrics.length === 0) return null;
        return metrics.reduce((prev, curr) => ((curr.memoryMB || 0) > (prev.memoryMB || 0) ? curr : prev), metrics[0]);
    }, [metrics]);

    // Process type descriptive labels
    const getProcessLabel = (type, isMain) => {
        if (isMain) return 'QBrowse Core (Main Process)';
        switch (type?.toLowerCase()) {
            case 'gpu':
                return 'GPU Graphics Acceleration Engine';
            case 'tab':
            case 'renderer':
                return 'Webview Renderer Process';
            case 'utility':
                return 'Audio / Storage Utility Service';
            case 'zygote':
                return 'Chromium Sandbox Preloader';
            case 'pepperplugin':
                return 'Browser Plugin Host';
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
            // Estimation: live tab accounts for proportional share of renderer memory, sleeping tab is 0MB
            const estMem = tab.suspended ? 0 : 135; 
            items.push({
                id: `tab-${tab.id}`,
                tabId: tab.id,
                isTab: true,
                title: tab.title || tab.url || 'Blank Tab',
                subtitle: tab.url || 'about:blank',
                space: tab.space,
                active: isTabActive,
                suspended: !!tab.suspended,
                cpu: isTabActive ? 0.4 : (tab.suspended ? 0 : 0.1),
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
                subtitle: `PID: ${proc.pid} · Process Type: ${proc.type}`,
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
            // Category Filter
            if (activeFilter === 'tabs' && !item.isTab) return false;
            if (activeFilter === 'processes' && !item.isProcess) return false;
            if (activeFilter === 'sleeping' && (!item.isTab || !item.suspended)) return false;

            // Search Query Filter
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
            }
            return sortAsc ? -res : res;
        });
    }, [filteredItems, sortBy, sortAsc]);

    // Maximum memory for relative bar width
    const maxItemMem = useMemo(() => {
        if (sortedItems.length === 0) return 1;
        return Math.max(...sortedItems.map(i => i.memoryMB || 0), 100);
    }, [sortedItems]);

    // Quick Action: Hibernate / Sleep all background tabs
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
    };

    // Switch to a Tab
    const handleJumpToTab = (tabId, space) => {
        handleSwitchToTab(tabId, space);
        closeModal();
    };

    if (!isOpen) return null;

    return (
        <div 
            className={`absolute inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-3xl text-white font-sans p-4 select-none ${isModalClosing ? 'animate-pop-out' : 'animate-modal'}`}
            onClick={closeModal}
        >
            <div 
                className="w-full max-w-5xl h-[88vh] min-h-[580px] bg-[#0d0e12]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                            <Activity size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-base font-semibold tracking-tight text-white">
                                    Task Manager
                                </h2>
                                <span className="text-[11px] font-mono text-white/40">
                                    {combinedItems.length} tasks
                                </span>
                            </div>
                            <p className="text-[11px] text-white/40 mt-0.5">
                                Real-time memory consumption, CPU load, and background tab hibernation
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Minimalist Quick Action Pills */}
                        <button
                            onClick={handleHibernateInactiveTabs}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-white/80 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                            title="Hibernate eligible background tabs to free RAM"
                        >
                            <Moon size={12} className="text-white/60" />
                            <span>Hibernate Inactive</span>
                        </button>
                        <button
                            onClick={handleWakeAllTabs}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-white/80 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                            title="Wake all hibernated tabs"
                        >
                            <Zap size={12} className="text-white/60" />
                            <span>Wake All</span>
                        </button>
                        <button
                            onClick={handlePurgeCache}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-white/60 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                            title="Purge cached memory"
                        >
                            <Trash2 size={12} />
                        </button>

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        {/* Polling Toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono border flex items-center gap-1.5 transition-all cursor-pointer ${
                                autoRefresh 
                                    ? 'bg-white/10 border-white/20 text-white' 
                                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                            }`}
                            title="Toggle 2s automatic refresh"
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400' : 'bg-white/30'}`} />
                            {autoRefresh ? 'Auto 2s' : 'Paused'}
                        </button>

                        <button 
                            onClick={fetchMetrics}
                            disabled={isLoading}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition disabled:opacity-40 cursor-pointer"
                            title="Refresh now"
                        >
                            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        </button>

                        <button 
                            onClick={closeModal} 
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer ml-0.5"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* 3 Restrained Monochromatic Metric Tiles */}
                <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-white/[0.08] bg-black/30">
                    {/* Tile 1: Memory */}
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between hover:border-white/15 transition-colors">
                        <div className="flex items-center justify-between text-[11px] text-white/50">
                            <span className="flex items-center gap-1.5 font-medium">
                                <HardDrive size={13} className="text-white/60" />
                                Total Browser Memory
                            </span>
                            <span className="font-mono text-[10px] text-white/40">
                                {metrics.length} processes
                            </span>
                        </div>
                        <div className="mt-1.5">
                            <div className="text-xl font-bold font-mono tracking-tight text-white flex items-baseline gap-1">
                                {totalAppMemMB} <span className="text-xs font-normal text-white/40">MB</span>
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5 font-mono">
                                {systemInfo?.totalMB 
                                    ? `${((totalAppMemMB / systemInfo.totalMB) * 100).toFixed(1)}% of ${Math.round(systemInfo.totalMB / 1024)} GB System RAM`
                                    : 'Sum across all threads'}
                            </div>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                            <div 
                                className="h-full bg-white/30 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(5, (totalAppMemMB / (systemInfo?.totalMB || 16384)) * 100 * 2))}%` }}
                            />
                        </div>
                    </div>

                    {/* Tile 2: CPU */}
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between hover:border-white/15 transition-colors">
                        <div className="flex items-center justify-between text-[11px] text-white/50">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Cpu size={13} className="text-white/60" />
                                Total Browser CPU
                            </span>
                            <span className="font-mono text-[10px] text-white/40">
                                {totalCpuPercent > 0 ? 'Active' : 'Idle'}
                            </span>
                        </div>
                        <div className="mt-1.5">
                            <div className="text-xl font-bold font-mono tracking-tight text-white flex items-baseline gap-1">
                                {totalCpuPercent} <span className="text-xs font-normal text-white/40">%</span>
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5 truncate font-mono">
                                {peakProcess ? `Peak: ${peakProcess.type} (${peakProcess.cpu}%)` : 'All threads normal'}
                            </div>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                            <div 
                                className="h-full bg-white/30 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(3, totalCpuPercent))}%` }}
                            />
                        </div>
                    </div>

                    {/* Tile 3: Sleep Engine */}
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between hover:border-white/15 transition-colors">
                        <div className="flex items-center justify-between text-[11px] text-white/50">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Moon size={13} className="text-white/60" />
                                Tab Hibernation
                            </span>
                            <span className="font-mono text-[10px] text-white/40">
                                {liveTabCount} live / {allTabs.length} tabs
                            </span>
                        </div>
                        <div className="mt-1.5">
                            <div className="text-xl font-bold font-mono tracking-tight text-white flex items-baseline gap-1">
                                ~{suspendedTabCount * 120} <span className="text-xs font-normal text-white/40">MB Saved</span>
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5 font-mono">
                                {suspendedTabCount} tab{suspendedTabCount === 1 ? '' : 's'} asleep in background
                            </div>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                            <div 
                                className="h-full bg-white/30 rounded-full transition-all duration-500" 
                                style={{ width: `${allTabs.length > 0 ? (suspendedTabCount / allTabs.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Toolbar: Category Filters, Search, Sort */}
                <div className="px-6 py-2.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                        {[
                            { id: 'all', label: `All (${combinedItems.length})` },
                            { id: 'tabs', label: `Tabs (${allTabs.length})` },
                            { id: 'processes', label: `Processes (${metrics.length})` },
                            { id: 'sleeping', label: `Sleeping (${suspendedTabCount})` }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                    activeFilter === f.id
                                        ? 'bg-white/15 text-white shadow-sm'
                                        : 'text-white/40 hover:text-white/70'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Sort */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-2.5 text-white/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter tasks by name, PID, space..."
                                className="bg-white/5 border border-white/10 rounded-xl py-1 pl-8 pr-7 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors w-60 font-mono"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2 text-white/40 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 text-xs text-white/50 font-mono">
                            <span className="text-[10px] uppercase text-white/30">Sort:</span>
                            <button 
                                onClick={() => {
                                    if (sortBy === 'memory') setSortAsc(!sortAsc);
                                    else { setSortBy('memory'); setSortAsc(false); }
                                }}
                                className={`cursor-pointer transition ${sortBy === 'memory' ? 'text-white font-semibold' : 'hover:text-white/80'}`}
                            >
                                RAM {sortBy === 'memory' ? (sortAsc ? '↑' : '↓') : ''}
                            </button>
                            <span className="text-white/20">|</span>
                            <button 
                                onClick={() => {
                                    if (sortBy === 'cpu') setSortAsc(!sortAsc);
                                    else { setSortBy('cpu'); setSortAsc(false); }
                                }}
                                className={`cursor-pointer transition ${sortBy === 'cpu' ? 'text-white font-semibold' : 'hover:text-white/80'}`}
                            >
                                CPU {sortBy === 'cpu' ? (sortAsc ? '↑' : '↓') : ''}
                            </button>
                            <span className="text-white/20">|</span>
                            <button 
                                onClick={() => {
                                    if (sortBy === 'name') setSortAsc(!sortAsc);
                                    else { setSortBy('name'); setSortAsc(false); }
                                }}
                                className={`cursor-pointer transition ${sortBy === 'name' ? 'text-white font-semibold' : 'hover:text-white/80'}`}
                            >
                                Name {sortBy === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-2 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/40 bg-black/10">
                    <div className="col-span-5">Task / Domain</div>
                    <div className="col-span-2">Type / Space</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-1 text-right">CPU</div>
                    <div className="col-span-2 text-right">Memory</div>
                    <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Task List Table Body */}
                <div className="flex-1 overflow-y-auto hide-scroll divide-y divide-white/[0.03]">
                    {sortedItems.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-white/30 gap-2">
                            <Activity size={28} className="opacity-20" />
                            <p className="text-xs font-mono">No tasks or processes matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        sortedItems.map((item) => {
                            const isTerminating = terminatingPids.has(item.pid);

                            return (
                                <div 
                                    key={item.id} 
                                    className={`grid grid-cols-12 gap-4 px-6 py-2 items-center hover:bg-white/[0.03] transition-colors group ${
                                        item.isTab && item.active ? 'bg-white/[0.02]' : ''
                                    }`}
                                >
                                    {/* Name & Subtitle */}
                                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/5 border border-white/10 text-white/70">
                                            {item.isProcess ? (
                                                item.isMain ? <ShieldAlert size={13} /> : (item.type === 'GPU' ? <Monitor size={13} /> : <Cpu size={13} />)
                                            ) : (
                                                item.suspended ? <Moon size={13} className="text-white/40" /> : <Globe size={13} />
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="text-xs font-medium text-white/90 truncate flex items-center gap-2">
                                                {item.title}
                                                {item.isTab && item.active && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/10 text-white/80 border border-white/10 font-mono">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-white/40 truncate font-mono">
                                                {item.subtitle}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Type / Space Badge */}
                                    <div className="col-span-2 flex items-center">
                                        {item.isTab ? (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-white/60 bg-white/5 border border-white/10 uppercase tracking-wider">
                                                {item.space} tab
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-white/50 bg-white/5 border border-white/10">
                                                {item.type || 'Process'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <div className="col-span-1 flex justify-center font-mono text-[10px]">
                                        {item.isTab ? (
                                            item.suspended ? (
                                                <span className="text-white/40 flex items-center gap-1">
                                                    <Moon size={9} /> Asleep
                                                </span>
                                            ) : (
                                                <span className="text-white/80 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" /> Live
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-white/40">
                                                PID {item.pid}
                                            </span>
                                        )}
                                    </div>

                                    {/* CPU Usage */}
                                    <div className="col-span-1 text-right font-mono text-xs text-white/70">
                                        {item.cpu > 0 ? `${item.cpu}%` : '0%'}
                                    </div>

                                    {/* Memory (RAM) Bar & MB */}
                                    <div className="col-span-2 flex flex-col items-end justify-center">
                                        <div className="flex items-baseline gap-1 font-mono text-xs text-white/90">
                                            {item.memoryMB === 0 ? (
                                                <span className="text-white/40 text-[10px]">0 MB (Freed)</span>
                                            ) : (
                                                <>
                                                    <span className="font-semibold">{item.memoryMB}</span> <span className="text-[10px] text-white/40">MB</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="w-full max-w-[100px] h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                                            <div 
                                                className="h-full bg-white/30 rounded-full transition-all duration-300"
                                                style={{ width: `${item.memoryMB === 0 ? 0 : Math.min(100, (item.memoryMB / maxItemMem) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Hover-Revealed Actions */}
                                    <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.isTab ? (
                                            <>
                                                {item.suspended ? (
                                                    <button
                                                        onClick={() => wakeTab(item.tabId)}
                                                        className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
                                                        title="Wake tab from sleep"
                                                    >
                                                        <Zap size={12} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => suspendTab(item.tabId)}
                                                        disabled={item.active}
                                                        className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                                                        title={item.active ? 'Active tab cannot be suspended' : 'Suspend to free memory'}
                                                    >
                                                        <Moon size={12} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleJumpToTab(item.tabId, item.space)}
                                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
                                                    title="Switch to tab"
                                                >
                                                    <ArrowRight size={12} />
                                                </button>

                                                <button
                                                    onClick={() => closeTabById(item.tabId)}
                                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white border border-white/10 transition cursor-pointer"
                                                    title="Close tab"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {item.isMain ? (
                                                    <span className="text-[10px] text-white/30 font-mono">Protected</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleKillProcess(item.pid)}
                                                        disabled={isTerminating}
                                                        className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white border border-white/10 transition cursor-pointer"
                                                        title={`End process PID ${item.pid}`}
                                                    >
                                                        <Power size={12} className={isTerminating ? 'animate-spin' : ''} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="px-6 py-2.5 border-t border-white/[0.08] bg-black/30 flex items-center justify-between text-[11px] text-white/40 font-mono">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <Clock size={11} className="text-white/30" />
                            {new Date(lastUpdated).toLocaleTimeString()}
                        </span>
                        <span>•</span>
                        <span>{sortedItems.length} of {combinedItems.length} tasks</span>
                        <span>•</span>
                        <span>Press ESC to dismiss</span>
                    </div>

                    <div className="flex items-center gap-3 text-white/30">
                        <span>Tip: Hibernated tabs use 0 MB RAM</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
