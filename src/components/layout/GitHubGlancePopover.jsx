import React, { useEffect, useRef } from 'react';
import { 
    GitPullRequest, GitBranch, AlertCircle, Bell, ExternalLink, 
    RefreshCw, CheckCircle2, User, Sparkles
} from 'lucide-react';
import { useGitHubStore } from '../../store/useGitHubStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function GitHubGlancePopover() {
    const isHoverGlanceOpen = useGitHubStore(state => state.isHoverGlanceOpen);
    const hoverGlanceRect = useGitHubStore(state => state.hoverGlanceRect);
    const closeHoverGlance = useGitHubStore(state => state.closeHoverGlance);
    const settings = useUIStore(state => state.settings);
    const addTab = useTabStore(state => state.addTab);

    const {
        authenticated,
        username,
        reviewRequests,
        myPrs,
        assignedIssues,
        isLoading,
        fetchData
    } = useGitHubStore();

    const popoverRef = useRef(null);

    // If disabled in settings or not open, do not render
    if (!isHoverGlanceOpen || !settings?.githubIntegrationEnabled || !settings?.githubHoverGlanceEnabled) {
        return null;
    }

    const handleOpenUrl = (url) => {
        closeHoverGlance();
        addTab({ url, active: true, title: 'GitHub' });
    };

    // Calculate position next to the pinned icon
    const top = hoverGlanceRect ? Math.max(12, Math.min(window.innerHeight - 340, hoverGlanceRect.top - 20)) : 100;
    const left = hoverGlanceRect ? Math.min(window.innerWidth - 320, hoverGlanceRect.right + 12) : 260;

    return (
        <div 
            className="fixed inset-0 z-50 pointer-events-none"
            onMouseEnter={closeHoverGlance}
        >
            <div 
                ref={popoverRef}
                style={{ top: `${top}px`, left: `${left}px` }}
                onMouseEnter={(e) => e.stopPropagation()}
                onMouseLeave={closeHoverGlance}
                className="pointer-events-auto absolute w-76 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3.5 space-y-3 animate-pop-in"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <GitPullRequest size={13} className="text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                GitHub Glance
                                <span className="text-[10px] font-mono text-zinc-400 font-normal">
                                    {username ? `@${username}` : ''}
                                </span>
                            </h4>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => fetchData(true)}
                            className={`p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors ${isLoading ? 'animate-spin text-accent' : ''}`}
                            title="Refresh"
                        >
                            <RefreshCw size={11} />
                        </button>
                    </div>
                </div>

                {!authenticated ? (
                    <div className="text-center py-2 space-y-2">
                        <p className="text-xs text-zinc-400">Connect GitHub to see live PR and issue previews.</p>
                        <button 
                            onClick={() => handleOpenUrl('https://github.com/login')}
                            className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-xs font-semibold hover:bg-accent/30 transition-all cursor-pointer"
                        >
                            Log In to GitHub
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Summary Badges */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="block text-sm font-bold text-amber-400">
                                    {(reviewRequests || []).length}
                                </span>
                                <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">
                                    Reviews
                                </span>
                            </div>
                            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="block text-sm font-bold text-sky-400">
                                    {(myPrs || []).length}
                                </span>
                                <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">
                                    My PRs
                                </span>
                            </div>
                            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="block text-sm font-bold text-emerald-400">
                                    {(assignedIssues || []).length}
                                </span>
                                <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">
                                    Issues
                                </span>
                            </div>
                        </div>

                        {/* Top Pull Requests */}
                        {(() => {
                            const hasReviews = (reviewRequests || []).length > 0;
                            const displayItems = hasReviews ? reviewRequests : (myPrs || []);
                            const titleLabel = hasReviews ? 'Needs Your Review' : 'Your Pull Requests';

                            return (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase text-zinc-400 tracking-wider">
                                        {titleLabel}
                                    </p>
                                    <div className="space-y-1 max-h-36 overflow-y-auto hide-scroll">
                                        {displayItems.length === 0 ? (
                                            <p className="text-[11px] text-zinc-500 italic py-1">No pull requests active</p>
                                        ) : (
                                            displayItems.slice(0, 3).map((pr) => (
                                                <div 
                                                    key={pr.id}
                                                    onClick={() => handleOpenUrl(pr.url)}
                                                    className="p-1.5 rounded-lg hover:bg-white/[0.08] cursor-pointer transition-all border border-transparent hover:border-white/5 group"
                                                >
                                                    <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-accent">
                                                        {pr.title}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-400 truncate font-mono">
                                                        {pr.repo} #{pr.number}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Quick Action Links */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                            <button 
                                onClick={() => handleOpenUrl('https://github.com/notifications')}
                                className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <Bell size={11} />
                                Notifications
                            </button>
                            <button 
                                onClick={() => handleOpenUrl('https://github.com/pulls')}
                                className="flex items-center gap-1 text-accent hover:underline cursor-pointer"
                            >
                                All PRs <ExternalLink size={10} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
