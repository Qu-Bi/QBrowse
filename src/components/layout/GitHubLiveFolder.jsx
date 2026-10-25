import React, { useState, useEffect, useRef } from 'react';
import { 
    GitPullRequest, GitBranch, AlertCircle, RefreshCw, ChevronDown, 
    Settings, MessageSquare, ExternalLink, EyeOff, CheckCircle2
} from 'lucide-react';
import { useGitHubStore } from '../../store/useGitHubStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function GitHubLiveFolder() {
    const settings = useUIStore(state => state.settings);
    const setSettingValue = useUIStore(state => state.setSettingValue);
    const openSettings = useUIStore(state => state.openSettings);
    const showToast = useUIStore(state => state.showToast);
    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light';

    const addTab = useTabStore(state => state.addTab);
    const workTabs = useTabStore(state => state.workTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setCurrentUrl = useUIStore(state => state.setCurrentUrl);

    const [contextMenuPos, setContextMenuPos] = useState(null);
    const [hoveredSubFilter, setHoveredSubFilter] = useState(null);

    const {
        authenticated,
        username,
        reviewRequests,
        myPrs,
        assignedIssues,
        isLoading,
        activeSubFilter,
        setSubFilter,
        isLiveFolderOpen,
        toggleLiveFolder,
        fetchData
    } = useGitHubStore();

    // Close context menu on Escape
    useEffect(() => {
        if (!contextMenuPos) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setContextMenuPos(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [contextMenuPos]);

    // STRICT ZERO-RESOURCE: If feature is disabled, render absolutely nothing
    if (!settings?.githubIntegrationEnabled) {
        return null;
    }

    const handleOpenItem = (e, url) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!url) return;

        const existingTab = (workTabs || []).find(t => t.url && t.url.toLowerCase() === url.toLowerCase());
        if (existingTab) {
            setWorkTabs((workTabs || []).map(t => ({
                ...t,
                active: t.id === existingTab.id
            })));
            setCurrentUrl(url);
            return;
        }

        addTab({
            url,
            active: true,
            title: 'GitHub'
        });
    };

    const handleAuxClick = (e, url) => {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            addTab({
                url,
                active: false,
                title: 'GitHub'
            });
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
    };

    const handleInstaHide = () => {
        setContextMenuPos(null);
        setSettingValue('githubIntegrationEnabled', false);
        useGitHubStore.getState().syncWithConfig();
        showToast('GitHub Live hidden. You can re-enable it in Settings.');
    };

    // Tabs configuration
    const showReviewsTab = settings.githubShowReviews ?? true;
    const showMyPrsTab = settings.githubShowMyPrs ?? true;
    const showIssuesTab = settings.githubShowAssignedIssues ?? true;

    const visibleTabs = [];
    if (showReviewsTab) visibleTabs.push({ 
        id: 'reviews', 
        label: 'Reviews', 
        title: 'Pull Requests awaiting your review',
        count: (reviewRequests || []).length 
    });
    if (showMyPrsTab) visibleTabs.push({ 
        id: 'prs', 
        label: 'PRs', 
        title: 'Pull Requests authored by you',
        count: (myPrs || []).length 
    });
    if (showIssuesTab) visibleTabs.push({ 
        id: 'issues', 
        label: 'Issues', 
        title: 'Issues assigned to you',
        count: (assignedIssues || []).length 
    });

    let activeIndex = visibleTabs.findIndex(t => t.id === activeSubFilter);
    if (activeIndex === -1) activeIndex = 0;
    const hoveredIndex = visibleTabs.findIndex(t => t.id === hoveredSubFilter);

    let currentItems = [];
    if (activeSubFilter === 'reviews') {
        currentItems = reviewRequests || [];
    } else if (activeSubFilter === 'prs') {
        currentItems = myPrs || [];
    } else if (activeSubFilter === 'issues') {
        currentItems = assignedIssues || [];
    }

    return (
        <>
            <div 
                onContextMenu={handleContextMenu}
                className={`mb-2.5 rounded-2xl border transition-all duration-200 select-none shadow-sm ${
                    isBright 
                        ? 'bg-black/[0.02] hover:bg-black/[0.035] border-black/[0.06]' 
                        : 'bg-white/[0.025] hover:bg-white/[0.04] border-white/[0.06]'
                } p-2 space-y-2`}
            >
                {/* Seamless Header */}
                <div 
                    className="flex items-center justify-between cursor-pointer group px-0.5"
                    onClick={toggleLiveFolder}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 shadow-xs">
                            <GitPullRequest size={12} className="text-emerald-400" />
                        </div>
                        <span className="text-xs font-semibold text-[color:var(--sidebar-text-muted)] group-hover:text-[color:var(--sidebar-text-hover)] truncate tracking-tight">
                            GitHub Live
                        </span>
                        {username && (
                            <span className="text-[10px] text-zinc-500 font-mono truncate hidden lg:inline">
                                @{username}
                            </span>
                        )}
                        {settings.githubBadgeCountEnabled && (reviewRequests || []).length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0 animate-pulse">
                                {reviewRequests.length}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => fetchData(true)}
                            className={`p-1 hover:text-white text-[color:var(--sidebar-text-muted)] rounded-md hover:bg-white/10 transition-all cursor-pointer ${isLoading ? 'animate-spin text-accent' : ''}`}
                            title="Refresh GitHub Live"
                        >
                            <RefreshCw size={11} />
                        </button>
                        <button 
                            onClick={() => openSettings('workmode')}
                            className="p-1 hover:text-white text-[color:var(--sidebar-text-muted)] rounded-md hover:bg-white/10 transition-all cursor-pointer"
                            title="Customize GitHub Work Mode"
                        >
                            <Settings size={11} />
                        </button>
                        <button
                            onClick={toggleLiveFolder}
                            className="p-0.5 text-[color:var(--sidebar-text-muted)] hover:text-white transition-all cursor-pointer"
                            title={isLiveFolderOpen ? 'Collapse' : 'Expand'}
                        >
                            <ChevronDown size={12} className={`transition-transform duration-300 ${isLiveFolderOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Folder Body */}
                {isLiveFolderOpen && (
                    <div className="space-y-2 animate-tab-fade">
                        {!authenticated ? (
                            <div className="p-3 text-center rounded-xl bg-black/20 border border-[color:var(--sidebar-border)] space-y-2">
                                <p className="text-[11px] text-[color:var(--sidebar-text-muted)]">
                                    Connect your GitHub session in Work Mode or enter a Personal Access Token in settings.
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <button 
                                        onClick={(e) => handleOpenItem(e, 'https://github.com/login')}
                                        className="px-2.5 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg transition-all cursor-pointer"
                                    >
                                        Log In
                                    </button>
                                    <button 
                                        onClick={() => openSettings('workmode')}
                                        className="px-2.5 py-1 text-xs font-medium bg-white/10 text-zinc-300 hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                                    >
                                        Configure
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Spaces-Switcher Style Round Pill Container */}
                                {visibleTabs.length > 0 && (
                                    <div 
                                        onMouseLeave={() => setHoveredSubFilter(null)}
                                        className={`relative flex p-0.5 rounded-full border shadow-xs select-none ${
                                        isBright 
                                            ? 'bg-black/[0.03] border-black/[0.05]' 
                                            : 'bg-[#0c0d14]/78 border-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                                    }`}>
                                        {/* Hover Preview Pill */}
                                        {hoveredIndex !== -1 && hoveredSubFilter !== activeSubFilter && (
                                            <div
                                                className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-200 pointer-events-none ${
                                                    isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                                                }`}
                                                style={{
                                                    left: '2px',
                                                    width: `calc((100% - 4px) / ${visibleTabs.length})`,
                                                    transform: `translateX(${hoveredIndex * 100}%)`,
                                                }}
                                            />
                                        )}

                                        {/* Animated Sliding Pill */}
                                        <div 
                                            className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                isBright
                                                    ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                                    : 'border'
                                            }`} 
                                            style={{ 
                                                left: '2px',
                                                width: `calc((100% - 4px) / ${visibleTabs.length})`,
                                                transform: `translateX(${activeIndex * 100}%)`,
                                                ...(!isBright ? {
                                                    borderColor: 'var(--accent-30, rgba(212, 188, 148, 0.4))',
                                                    backgroundColor: 'var(--accent-15, rgba(212, 188, 148, 0.16))',
                                                    boxShadow: '0 2px 10px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                                                } : {})
                                            }}
                                        />

                                        {visibleTabs.map((tab) => {
                                            const isActive = activeSubFilter === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onMouseEnter={() => setHoveredSubFilter(tab.id)}
                                                    onClick={() => setSubFilter(tab.id)}
                                                    title={tab.title}
                                                    className={`relative z-10 flex-1 flex items-center justify-center gap-1 py-1 px-1 text-[10.5px] font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap select-none overflow-hidden ${
                                                        isActive 
                                                            ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold') 
                                                            : 'text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text-hover)]'
                                                    }`}
                                                >
                                                    <span>{tab.label}</span>
                                                    {tab.count > 0 ? (
                                                        <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold leading-none ${
                                                            isActive 
                                                                ? 'bg-accent/25 text-accent' 
                                                                : 'bg-white/10 text-zinc-300'
                                                        }`}>
                                                            {tab.count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9.5px] opacity-40 font-mono">
                                                            0
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Items List */}
                                <div className="max-h-56 overflow-y-auto space-y-1 hide-scroll pr-0.5 pt-0.5">
                                    {currentItems.length === 0 ? (
                                        <div className="py-2.5 text-center">
                                            <p className="text-[11px] text-[color:var(--sidebar-text-muted)] italic">
                                                {isLoading ? 'Checking GitHub...' : 'Inbox zero — nothing pending'}
                                            </p>
                                        </div>
                                    ) : (
                                        currentItems.map((item) => (
                                            <div 
                                                key={item.id}
                                                onClick={(e) => handleOpenItem(e, item.url)}
                                                onAuxClick={(e) => handleAuxClick(e, item.url)}
                                                className="group flex items-start justify-between p-2 rounded-xl hover:bg-white/[0.08] cursor-pointer transition-all border border-transparent hover:border-white/5 active:scale-[0.99]"
                                                title={`${item.title}\n${item.repo} #${item.number}\nClick to open in Work Mode • Middle-click for background`}
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        {item.isDraft ? (
                                                            <span className="text-[9px] px-1 py-0.2 bg-zinc-700/60 text-zinc-300 rounded font-mono">
                                                                Draft
                                                            </span>
                                                        ) : (
                                                            <GitBranch size={11} className="text-emerald-400 flex-shrink-0" />
                                                        )}
                                                        <span className="text-[10px] text-[color:var(--sidebar-text-muted)] truncate font-mono">
                                                            {item.repo} #{item.number}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-medium text-[color:var(--sidebar-text-hover)] truncate group-hover:text-accent transition-colors">
                                                        {item.title}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1 flex-shrink-0 text-[10px] text-[color:var(--sidebar-text-muted)] pt-0.5">
                                                    {item.comments > 0 && (
                                                        <span className="flex items-center gap-0.5 text-zinc-400">
                                                            <MessageSquare size={9} />
                                                            {item.comments}
                                                        </span>
                                                    )}
                                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Right-Click Context Menu with Insta-Hide */}
            {contextMenuPos && (
                <div 
                    className="fixed inset-0 z-50 select-none"
                    onClick={() => setContextMenuPos(null)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenuPos(null); }}
                >
                    <div 
                        style={{ 
                            top: `${Math.min(window.innerHeight - 200, contextMenuPos.y)}px`, 
                            left: `${Math.min(window.innerWidth - 220, contextMenuPos.x)}px` 
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute w-52 p-1.5 rounded-2xl border backdrop-blur-2xl shadow-2xl animate-pop-in ${
                            isBright 
                                ? 'bg-white/85 border-black/[0.08] text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.14)]' 
                                : 'bg-[#12131a]/85 border-white/[0.12] text-white/95 shadow-[0_24px_64px_rgba(0,0,0,0.75)]'
                        }`}
                    >
                        {/* Instant Hide */}
                        <button
                            onClick={handleInstaHide}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer group"
                        >
                            <EyeOff size={14} className="group-hover:scale-110 transition-transform" />
                            <span>Hide GitHub Live</span>
                        </button>

                        <div className="my-1 border-t border-white/[0.08]" />

                        <button
                            onClick={() => {
                                fetchData(true);
                                setContextMenuPos(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[color:var(--sidebar-text-muted)] hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        >
                            <RefreshCw size={14} />
                            <span>Refresh Live Data</span>
                        </button>

                        <button
                            onClick={() => {
                                addTab({ url: 'https://github.com/', active: true, title: 'GitHub' });
                                setContextMenuPos(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[color:var(--sidebar-text-muted)] hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        >
                            <ExternalLink size={14} />
                            <span>Open on GitHub</span>
                        </button>

                        <button
                            onClick={() => {
                                openSettings('workmode');
                                setContextMenuPos(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[color:var(--sidebar-text-muted)] hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        >
                            <Settings size={14} />
                            <span>Configure Settings...</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
