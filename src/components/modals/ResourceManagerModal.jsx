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
        privateTabs, workTabs, ghostTabs, activeSpace,
        suspendTab, wakeTab, closeTabById, handleSwitchToTab,
        setPrivateTabs, setWorkTabs, setGhostTabs
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
        return list;
    }, [privateTabs, workTabs, ghostTabs]);

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
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                            <Activity size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                    Resource & Task Manager
                                </h2>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    LIVE MONITOR
                                </span>
                            </div>
                            <p className="text-xs text-white/40 mt-0.5">
                                Real-time memory consumption, CPU distribution, and proactive tab sleep
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Auto-Refresh Toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                                autoRefresh 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10' 
                                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                            }`}
                            title="Toggle 2s background polling"
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                            {autoRefresh ? 'Auto 2s' : 'Paused'}
                        </button>

                        {/* Manual Refresh Button */}
                        <button 
                            onClick={fetchMetrics}
                            disabled={isLoading}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-50 cursor-pointer"
                            title="Refresh telemetry now"
                        >
                            <RefreshCw size={15} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
                        </button>

                        {/* Close Modal */}
                        <button 
                            onClick={closeModal} 
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 text-white/70 hover:text-white transition cursor-pointer ml-1"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-4 gap-3 p-5 border-b border-white/10 bg-black/20">
                    {/* Card 1: RAM */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                <HardDrive size={13} className="text-cyan-400" />
                                Browser Memory
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">
                                {metrics.length} procs
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1 font-mono">
                                {totalAppMemMB} <span className="text-xs font-normal text-white/40">MB</span>
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5">
                                {systemInfo?.totalMB 
                                    ? `~${((totalAppMemMB / systemInfo.totalMB) * 100).toFixed(1)}% of ${Math.round(systemInfo.totalMB / 1024)}GB System RAM`
                                    : `Sum across all threads`}
                            </div>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2.5">
                            <div 
                                className="h-full bg-cyan-400 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(5, (totalAppMemMB / (systemInfo?.totalMB || 16384)) * 100 * 3))}%` }}
                            />
                        </div>
                    </div>

                    {/* Card 2: CPU */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                <Cpu size={13} className="text-emerald-400" />
                                Browser CPU
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                totalCpuPercent > 20 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-300'
                            }`}>
                                {totalCpuPercent > 0 ? 'Active' : 'Idle'}
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1 font-mono">
                                {totalCpuPercent} <span className="text-xs font-normal text-white/40">%</span>
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5 truncate">
                                {peakProcess ? `Peak: ${peakProcess.type} (${peakProcess.cpu}%)` : 'All tasks nominal'}
                            </div>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2.5">
                            <div 
                                className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(3, totalCpuPercent))}%` }}
                            />
                        </div>
                    </div>

                    {/* Card 3: Tab Memory Optimization */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                <Moon size={13} className="text-purple-400" />
                                Tab Sleep Engine
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
                                {suspendedTabCount} Asleep
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1 font-mono">
                                ~{suspendedTabCount * 120} <span className="text-xs font-normal text-white/40">MB Saved</span>
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5">
                                {liveTabCount} live webviews active
                            </div>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2.5">
                            <div 
                                className="h-full bg-purple-400 rounded-full transition-all duration-500" 
                                style={{ width: `${allTabs.length > 0 ? (suspendedTabCount / allTabs.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Card 4: Quick Optimization Actions */}
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-cyan-400" />
                                Instant Free RAM
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <button
                                onClick={handleHibernateInactiveTabs}
                                className="w-full py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-semibold text-cyan-200 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-500/10"
                            >
                                <Moon size={13} />
                                Hibernate Inactive Tabs
                            </button>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={handleWakeAllTabs}
                                    className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-white/70 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <Zap size={11} className="text-yellow-400" /> Wake All
                                </button>
                                <button
                                    onClick={handlePurgeCache}
                                    className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-white/70 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <Trash2 size={11} className="text-red-400" /> Purge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar & Filters */}
                <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                activeFilter === 'all' 
                                    ? 'bg-white/15 text-white shadow-sm' 
                                    : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            All Tasks ({combinedItems.length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('tabs')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                activeFilter === 'tabs' 
                                    ? 'bg-white/15 text-white shadow-sm' 
                                    : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            Browser Tabs ({allTabs.length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('processes')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                activeFilter === 'processes' 
                                    ? 'bg-white/15 text-white shadow-sm' 
                                    : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            Processes ({metrics.length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('sleeping')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                activeFilter === 'sleeping' 
                                    ? 'bg-white/15 text-white shadow-sm' 
                                    : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            Sleeping ({suspendedTabCount})
                        </button>
                    </div>

                    {/* Search & Sort */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter tasks by name or PID..."
                                className="bg-white/5 border border-white/10 rounded-xl py-1.5 pl-9 pr-8 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors w-64"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2 text-white/40 hover:text-white"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs text-white/60">
                            <span className="text-[10px] uppercase font-bold text-white/40">Sort:</span>
                            <button 
                                onClick={() => {
                                    if (sortBy === 'memory') setSortAsc(!sortAsc);
                                    else { setSortBy('memory'); setSortAsc(false); }
                                }}
                                className={`cursor-pointer transition ${sortBy === 'memory' ? 'text-cyan-400 font-semibold' : 'hover:text-white'}`}
                            >
                                Memory {sortBy === 'memory' ? (sortAsc ? '↑' : '↓') : ''}
                            </button>
                            <span className="text-white/20">|</span>
                            <button 
                                onClick={() => {
                                    if (sortBy === 'cpu') setSortAsc(!sortAsc);
                                    else { setSortBy('cpu'); setSortAsc(false); }
                                }}
                                className={`cursor-pointer transition ${sortBy === 'cpu' ? 'text-emerald-400 font-semibold' : 'hover:text-white'}`}
                            >
                                CPU {sortBy === 'cpu' ? (sortAsc ? '↑' : '↓') : ''}
                            </button>
                            <span className="text-white/20">|</span>
                            <button 
                                onClick={() => {
                                    if (sortBy === 'name') setSortAsc(!sortAsc);
                                    else { setSortBy('name'); setSortAsc(false); }
                                }}
                                className={`cursor-pointer transition ${sortBy === 'name' ? 'text-white font-semibold' : 'hover:text-white'}`}
                            >
                                Name {sortBy === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-2.5 border-b border-white/5 text-[11px] font-semibold text-white/40 uppercase tracking-wider bg-black/10">
                    <div className="col-span-5">Task / Domain</div>
                    <div className="col-span-2">Type / Space</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-1 text-right">CPU</div>
                    <div className="col-span-2 text-right">Memory (RAM)</div>
                    <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Task List Table Body */}
                <div className="flex-1 overflow-y-auto hide-scroll divide-y divide-white/[0.04]">
                    {sortedItems.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-white/30 gap-2">
                            <Activity size={32} className="opacity-20" />
                            <p className="text-sm">No tasks or processes found matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        sortedItems.map((item) => {
                            const isTerminating = terminatingPids.has(item.pid);

                            return (
                                <div 
                                    key={item.id} 
                                    className={`grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-white/[0.03] transition-colors group ${
                                        item.isTab && item.active ? 'bg-cyan-500/[0.04]' : ''
                                    }`}
                                >
                                    {/* Name & Subtitle */}
                                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                            item.isProcess 
                                                ? (item.isMain 
                                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                                                    : item.type === 'GPU' 
                                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                        : 'bg-white/10 text-white/70 border-white/15')
                                                : (item.suspended 
                                                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30')
                                        }`}>
                                            {item.isProcess ? (
                                                item.isMain ? <ShieldAlert size={15} /> : (item.type === 'GPU' ? <Monitor size={15} /> : <Cpu size={15} />)
                                            ) : (
                                                item.suspended ? <Moon size={15} /> : <Globe size={15} />
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="text-xs font-semibold text-white/90 truncate flex items-center gap-2">
                                                {item.title}
                                                {item.isTab && item.active && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-medium">
                                                        Active View
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-white/40 truncate font-mono">
                                                {item.subtitle}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Type / Space Badge */}
                                    <div className="col-span-2 flex items-center">
                                        {item.isTab ? (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                                                item.space === 'personal' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                item.space === 'work' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                            }`}>
                                                {item.space} Tab
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-white/60 bg-white/5 border border-white/10">
                                                {item.type || 'System'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <div className="col-span-1 flex justify-center">
                                        {item.isTab ? (
                                            item.suspended ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                                    <Moon size={10} /> Asleep
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                                                </span>
                                            )
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/50 border border-white/10 font-mono">
                                                PID {item.pid}
                                            </span>
                                        )}
                                    </div>

                                    {/* CPU Usage */}
                                    <div className="col-span-1 text-right font-mono text-xs">
                                        <span className={item.cpu > 5 ? 'text-amber-400 font-bold' : 'text-white/70'}>
                                            {item.cpu > 0 ? `${item.cpu}%` : '0%'}
                                        </span>
                                    </div>

                                    {/* Memory (RAM) Bar & MB */}
                                    <div className="col-span-2 flex flex-col items-end justify-center">
                                        <div className="flex items-baseline gap-1 font-mono text-xs font-bold text-white">
                                            {item.memoryMB === 0 ? (
                                                <span className="text-purple-400 text-[11px] font-medium">0 MB (Freed)</span>
                                            ) : (
                                                <>
                                                    {item.memoryMB} <span className="text-[10px] font-normal text-white/40">MB</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="w-full max-w-[120px] h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    item.memoryMB === 0 
                                                        ? 'bg-transparent' 
                                                        : item.memoryMB > 250 
                                                            ? 'bg-red-400' 
                                                            : item.memoryMB > 120 
                                                                ? 'bg-amber-400' 
                                                                : 'bg-cyan-400'
                                                }`}
                                                style={{ width: `${Math.min(100, (item.memoryMB / maxItemMem) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                                        {item.isTab ? (
                                            <>
                                                {item.suspended ? (
                                                    <button
                                                        onClick={() => wakeTab(item.tabId)}
                                                        className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition cursor-pointer"
                                                        title="Wake tab from sleep"
                                                    >
                                                        <Zap size={13} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => suspendTab(item.tabId)}
                                                        disabled={item.active}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title={item.active ? 'Active tab cannot be suspended' : 'Suspend to free memory'}
                                                    >
                                                        <Moon size={13} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleJumpToTab(item.tabId, item.space)}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
                                                    title="Switch to tab"
                                                >
                                                    <ArrowRight size={13} />
                                                </button>

                                                <button
                                                    onClick={() => closeTabById(item.tabId)}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 border border-white/10 transition cursor-pointer"
                                                    title="Close tab"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </>
                                        ) : (
                                            item.isMain ? (
                                                <span className="text-[10px] text-white/30 italic px-2">
                                                    Protected
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleKillProcess(item.pid)}
                                                    disabled={isTerminating}
                                                    className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/25 text-[11px] font-medium transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                                    title="Force terminate this process"
                                                >
                                                    <Power size={11} className={isTerminating ? 'animate-spin' : ''} />
                                                    End Task
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="px-6 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-white/40">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-white/30" />
                            Updated: {new Date(lastUpdated).toLocaleTimeString()}
                        </span>
                        <span>•</span>
                        <span>Showing {sortedItems.length} of {combinedItems.length} total tasks</span>
                        <span>•</span>
                        <span className="text-cyan-400/80">Press ESC or click outside to dismiss</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-white/30">
                            Tip: Hibernating inactive tabs saves up to 80% RAM with zero lost state
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
