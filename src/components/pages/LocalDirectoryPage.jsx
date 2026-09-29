import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, Image, Film, Music, Archive, Code, File, 
    ArrowUp, Search, Grid, List, ExternalLink, HardDrive, RefreshCw, 
    ChevronRight, Clock, Database, Eye, Sparkles
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
}

function getFileIcon(extension, isDirectory) {
    if (isDirectory) return { icon: Folder, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' };
    const ext = (extension || '').toLowerCase();
    
    // PDF
    if (ext === 'pdf') return { icon: FileText, color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' };
    
    // Images
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)) {
        return { icon: Image, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' };
    }
    
    // Video
    if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv'].includes(ext)) {
        return { icon: Film, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' };
    }
    
    // Audio
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
        return { icon: Music, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' };
    }
    
    // Code & Web
    if (['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'json', 'py', 'rs', 'go', 'c', 'cpp', 'java', 'sql', 'sh', 'bat'].includes(ext)) {
        return { icon: Code, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' };
    }
    
    // Documents & Markdown
    if (['md', 'txt', 'rtf', 'docx', 'doc', 'log', 'env'].includes(ext)) {
        return { icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' };
    }
    
    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
        return { icon: Archive, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    }
    
    return { icon: File, color: 'text-zinc-400', bg: 'bg-zinc-400/10 border-zinc-400/20' };
}

export default function LocalDirectoryPage({ url, onNavigate }) {
    const theme = useUIStore(state => state.theme);
    const showToast = useUIStore(state => state.showToast);
    const isBright = theme === 'light';

    const [dirData, setDirData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [sortBy, setSortBy] = useState('name'); // 'name' | 'size' | 'modified'
    const [sortAsc, setSortAsc] = useState(true);

    const loadDirectory = async () => {
        if (!window.electronAPI?.listLocalDirectory) {
            setError('Electron directory API not available');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await window.electronAPI.listLocalDirectory(url);
            if (res.error) {
                setError(res.error);
            } else {
                setDirData(res);
            }
        } catch (e) {
            setError(e.message || 'Failed to open directory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDirectory();
    }, [url]);

    // Parse breadcrumb segments from currentPath
    const breadcrumbs = useMemo(() => {
        if (!dirData?.currentPath) return [];
        const pathStr = dirData.currentPath;
        const isWindows = pathStr.includes('\\') || /^[a-zA-Z]:/.test(pathStr);
        const sep = isWindows ? '\\' : '/';
        const rawParts = pathStr.split(/[\\/]/).filter(Boolean);

        const list = [];
        let accumulated = isWindows ? '' : '/';

        rawParts.forEach((part, index) => {
            if (isWindows && index === 0) {
                accumulated = part + '\\';
            } else {
                accumulated = accumulated + (accumulated.endsWith(sep) ? '' : sep) + part;
            }
            list.push({
                name: part,
                path: accumulated,
                isLast: index === rawParts.length - 1
            });
        });

        return list;
    }, [dirData?.currentPath]);

    const filteredAndSortedItems = useMemo(() => {
        if (!dirData?.items) return [];
        let list = dirData.items;

        if (searchFilter.trim()) {
            const q = searchFilter.trim().toLowerCase();
            list = list.filter(item => 
                item.name.toLowerCase().includes(q) || 
                item.extension.toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            // Folders always first
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;

            let result = 0;
            if (sortBy === 'name') {
                result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortBy === 'size') {
                result = (a.size || 0) - (b.size || 0);
            } else if (sortBy === 'modified') {
                result = (a.modified || 0) - (b.modified || 0);
            }
            return sortAsc ? result : -result;
        });
    }, [dirData?.items, searchFilter, sortBy, sortAsc]);

    const handleOpenInExplorer = () => {
        if (dirData?.currentPath && window.electronAPI?.openPath) {
            window.electronAPI.openPath(dirData.currentPath);
            showToast('Opened in system file manager');
        }
    };

    const handleRevealFile = (e, item) => {
        e.stopPropagation();
        if (window.electronAPI?.showInFolder) {
            window.electronAPI.showInFolder(item.path);
            showToast(`Revealed: ${item.name}`);
        }
    };

    const handleItemClick = (item) => {
        if (item.url && onNavigate) {
            onNavigate(item.url, item.name);
        }
    };

    const handleParentClick = () => {
        if (dirData?.parentUrl && onNavigate) {
            onNavigate(dirData.parentUrl);
        }
    };

    return (
        <div className={`w-full h-full flex flex-col overflow-hidden select-none font-sans ${
            isBright ? 'bg-zinc-50 text-zinc-900' : 'bg-[#0c0d10] text-zinc-100'
        }`}>
            {/* Frosted Glass Header */}
            <header className={`px-6 py-4 flex flex-col gap-3 border-b backdrop-blur-2xl transition-colors shrink-0 ${
                isBright ? 'bg-white/80 border-black/10' : 'bg-[#121318]/80 border-white/10'
            }`}>
                <div className="flex items-center justify-between gap-4">
                    {/* Breadcrumbs Navigation */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
                        <button
                            onClick={handleParentClick}
                            disabled={!dirData?.parentPath}
                            title="Go to Parent Folder"
                            className={`p-1.5 rounded-xl border transition flex items-center justify-center flex-shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                isBright 
                                    ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800' 
                                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                            }`}
                        >
                            <ArrowUp size={14} />
                        </button>

                        <div className="flex items-center gap-1 min-w-0">
                            <span className="text-zinc-500 flex items-center gap-1 flex-shrink-0">
                                <HardDrive size={13} className="text-accent" />
                            </span>

                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={crumb.path}>
                                    <ChevronRight size={12} className="text-zinc-500/60 flex-shrink-0" />
                                    <button
                                        onClick={() => {
                                            if (!crumb.isLast && onNavigate) {
                                                const url = 'file:///' + crumb.path.replace(/\\/g, '/').replace(/^\/+/, '');
                                                onNavigate(url, crumb.name);
                                            }
                                        }}
                                        disabled={crumb.isLast}
                                        className={`px-2 py-1 rounded-lg text-xs truncate transition max-w-[160px] ${
                                            crumb.isLast 
                                                ? 'font-bold text-accent cursor-default' 
                                                : (isBright 
                                                    ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/5 cursor-pointer font-medium' 
                                                    : 'text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer font-medium')
                                        }`}
                                    >
                                        {crumb.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={loadDirectory}
                            title="Reload folder"
                            className={`p-2 rounded-xl border transition cursor-pointer ${
                                isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                            }`}
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={handleOpenInExplorer}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isBright 
                                    ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800' 
                                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                            }`}
                        >
                            <ExternalLink size={12} />
                            <span>Open in File Manager</span>
                        </button>
                    </div>
                </div>

                {/* Search Bar & View Mode Toggles */}
                <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                            isBright ? 'text-zinc-400' : 'text-zinc-500'
                        }`} />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Filter files in this directory..."
                            className={`w-full text-xs rounded-xl py-1.5 pl-9 pr-3 outline-none border transition-colors ${
                                isBright 
                                    ? 'bg-black/[0.04] border-black/10 focus:border-accent text-zinc-900 placeholder-zinc-400' 
                                    : 'bg-white/5 border-white/10 focus:border-accent text-white placeholder-zinc-500'
                            }`}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Sort Selector */}
                        <div className={`flex items-center p-0.5 rounded-xl border text-[11px] font-medium ${
                            isBright ? 'bg-black/[0.03] border-black/10' : 'bg-white/5 border-white/10'
                        }`}>
                            <button
                                onClick={() => {
                                    if (sortBy === 'name') setSortAsc(!sortAsc);
                                    else { setSortBy('name'); setSortAsc(true); }
                                }}
                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    sortBy === 'name' ? 'bg-accent text-black font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Name {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
                            </button>
                            <button
                                onClick={() => {
                                    if (sortBy === 'size') setSortAsc(!sortAsc);
                                    else { setSortBy('size'); setSortAsc(false); }
                                }}
                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    sortBy === 'size' ? 'bg-accent text-black font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Size {sortBy === 'size' && (sortAsc ? '↑' : '↓')}
                            </button>
                            <button
                                onClick={() => {
                                    if (sortBy === 'modified') setSortAsc(!sortAsc);
                                    else { setSortBy('modified'); setSortAsc(false); }
                                }}
                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    sortBy === 'modified' ? 'bg-accent text-black font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Date {sortBy === 'modified' && (sortAsc ? '↑' : '↓')}
                            </button>
                        </div>

                        {/* View Mode Toggle */}
                        <div className={`flex items-center p-0.5 rounded-xl border ${
                            isBright ? 'bg-black/[0.03] border-black/10' : 'bg-white/5 border-white/10'
                        }`}>
                            <button
                                onClick={() => setViewMode('grid')}
                                title="Grid View"
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                    viewMode === 'grid' ? 'bg-accent text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Grid size={13} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                title="List View"
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                    viewMode === 'list' ? 'bg-accent text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <List size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 min-h-0 overflow-y-auto p-6">
                {loading ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-zinc-400">
                        <RefreshCw size={24} className="animate-spin text-accent" />
                        <p className="text-xs font-medium">Scanning directory contents...</p>
                    </div>
                ) : error ? (
                    <div className="max-w-md mx-auto mt-12 p-6 rounded-3xl border border-red-500/20 bg-red-500/10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                            <Folder size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-white">Unable to Open Folder</h3>
                        <p className="text-xs text-zinc-400">{error}</p>
                        {dirData?.parentUrl && (
                            <button
                                onClick={handleParentClick}
                                className="px-4 py-2 bg-accent text-black font-bold rounded-xl text-xs cursor-pointer shadow-md"
                            >
                                Go to Parent Directory
                            </button>
                        )}
                    </div>
                ) : filteredAndSortedItems.length === 0 ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center gap-2 text-zinc-400">
                        <Folder size={32} className="text-zinc-600 mb-1" />
                        <p className="text-xs font-semibold">No files match your query</p>
                        <p className="text-[11px] text-zinc-500">Try clearing the search filter</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid Layout */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
                        {filteredAndSortedItems.map((item) => {
                            const { icon: IconComp, color, bg } = getFileIcon(item.extension, item.isDirectory);
                            return (
                                <div
                                    key={item.path}
                                    onClick={() => handleItemClick(item)}
                                    className={`group relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center text-center gap-2 select-none hover:-translate-y-0.5 ${
                                        isBright 
                                            ? 'bg-white hover:bg-black/[0.03] border-black/10 hover:border-black/20 hover:shadow-lg hover:shadow-black/5' 
                                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 hover:border-white/20 hover:shadow-xl hover:shadow-black/40'
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${bg} ${color}`}>
                                        <IconComp size={22} className="stroke-[1.8]" />
                                    </div>

                                    <div className="w-full">
                                        <p className={`text-xs font-medium truncate ${
                                            isBright ? 'text-zinc-900 group-hover:text-black' : 'text-zinc-200 group-hover:text-white'
                                        }`} title={item.name}>
                                            {item.name}
                                        </p>
                                        <p className={`text-[10px] mt-0.5 truncate ${
                                            isBright ? 'text-zinc-400' : 'text-zinc-500'
                                        }`}>
                                            {item.isDirectory ? 'Folder' : formatBytes(item.size)}
                                        </p>
                                    </div>

                                    {/* Action Hover Tooltip */}
                                    <button
                                        onClick={(e) => handleRevealFile(e, item)}
                                        title="Reveal in File Manager"
                                        className={`absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 ${
                                            isBright ? 'hover:bg-black/10 text-zinc-600' : 'hover:bg-white/15 text-zinc-300'
                                        }`}
                                    >
                                        <ExternalLink size={11} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List / Table Layout */
                    <div className={`rounded-2xl border overflow-hidden ${
                        isBright ? 'bg-white border-black/10' : 'bg-white/[0.02] border-white/10'
                    }`}>
                        <div className={`grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold border-b ${
                            isBright ? 'bg-black/[0.02] border-black/10 text-zinc-500' : 'bg-white/[0.03] border-white/10 text-zinc-400'
                        }`}>
                            <div className="col-span-6 sm:col-span-7 flex items-center gap-2">Name</div>
                            <div className="col-span-3 sm:col-span-3 text-right">Modified</div>
                            <div className="col-span-3 sm:col-span-2 text-right">Size</div>
                        </div>

                        <div className="divide-y divide-white/5">
                            {filteredAndSortedItems.map((item) => {
                                const { icon: IconComp, color, bg } = getFileIcon(item.extension, item.isDirectory);
                                return (
                                    <div
                                        key={item.path}
                                        onClick={() => handleItemClick(item)}
                                        className={`grid grid-cols-12 items-center px-4 py-2.5 text-xs transition cursor-pointer select-none ${
                                            isBright 
                                                ? 'hover:bg-black/[0.03] text-zinc-800' 
                                                : 'hover:bg-white/[0.05] text-zinc-200'
                                        }`}
                                    >
                                        <div className="col-span-6 sm:col-span-7 flex items-center gap-2.5 min-w-0 pr-2">
                                            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${bg} ${color}`}>
                                                <IconComp size={14} />
                                            </div>
                                            <span className="truncate font-medium">{item.name}</span>
                                        </div>
                                        <div className={`col-span-3 sm:col-span-3 text-right text-[11px] font-mono ${
                                            isBright ? 'text-zinc-500' : 'text-zinc-400'
                                        }`}>
                                            {formatDate(item.modified)}
                                        </div>
                                        <div className={`col-span-3 sm:col-span-2 text-right text-[11px] font-mono flex items-center justify-end gap-2 ${
                                            isBright ? 'text-zinc-500' : 'text-zinc-400'
                                        }`}>
                                            <span>{item.isDirectory ? '—' : formatBytes(item.size)}</span>
                                            <button
                                                onClick={(e) => handleRevealFile(e, item)}
                                                title="Reveal in File Manager"
                                                className={`p-1 rounded opacity-0 hover:opacity-100 hover:text-white transition ${
                                                    isBright ? 'hover:bg-black/10' : 'hover:bg-white/10'
                                                }`}
                                            >
                                                <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer Summary */}
            <footer className={`px-6 py-2.5 border-t text-[11px] flex items-center justify-between ${
                isBright ? 'bg-white/80 border-black/10 text-zinc-500' : 'bg-[#121318]/80 border-white/10 text-zinc-400'
            }`}>
                <div className="flex items-center gap-2">
                    <span>{filteredAndSortedItems.length} items</span>
                    {searchFilter && <span className="text-accent">(filtered)</span>}
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                    <Database size={11} className="text-accent" />
                    <span>QBrowse File Suite</span>
                </div>
            </footer>
        </div>
    );
}
