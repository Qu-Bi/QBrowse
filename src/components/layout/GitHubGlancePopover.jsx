import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    GitPullRequest, Bell, ExternalLink, RefreshCw
} from 'lucide-react';
import { useGitHubStore } from '../../store/useGitHubStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function GitHubGlancePopover() {
    const isHoverGlanceOpen = useGitHubStore(state => state.isHoverGlanceOpen);
    const isHoverGlanceClosing = useGitHubStore(state => state.isHoverGlanceClosing);
    const hoverGlanceRect = useGitHubStore(state => state.hoverGlanceRect);
    const closeHoverGlance = useGitHubStore(state => state.closeHoverGlance);
    const cancelCloseHoverGlance = useGitHubStore(state => state.cancelCloseHoverGlance);
    const scheduleCloseHoverGlance = useGitHubStore(state => state.scheduleCloseHoverGlance);
    const settings = useUIStore(state => state.settings);
    const theme = useUIStore(state => state.theme);
    const sidebarPosition = useUIStore(state => state.sidebarPosition) || 'left';
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
    const isLight = theme === 'light';

    useEffect(() => {
        if (!isHoverGlanceOpen) return;
        const handleOutsideDown = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                closeHoverGlance();
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeHoverGlance();
            }
        };
        document.addEventListener('mousedown', handleOutsideDown, true);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleOutsideDown, true);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isHoverGlanceOpen, closeHoverGlance]);

    // If disabled in settings or not open, do not render
    if (!isHoverGlanceOpen || !settings?.githubIntegrationEnabled || !settings?.githubHoverGlanceEnabled) {
        return null;
    }

    const handleOpenUrl = (url) => {
        closeHoverGlance();
        addTab({ url, active: true, title: 'GitHub' });
    };

    const popoverWidth = 304;
    // Calculate position next to the pinned icon, respecting left/right sidebar position
    const top = hoverGlanceRect
        ? Math.max(12, Math.min(window.innerHeight - 340, hoverGlanceRect.top - 12))
        : 100;
    const left = hoverGlanceRect
        ? (sidebarPosition === 'right'
            ? Math.max(12, hoverGlanceRect.left - popoverWidth - 12)
            : Math.min(window.innerWidth - popoverWidth - 12, hoverGlanceRect.right + 12))
        : 260;

    return createPortal(
        <div
            ref={popoverRef}
            style={{
                top: `${top}px`,
                left: `${left}px`,
                width: `${popoverWidth}px`,
                backdropFilter: 'blur(var(--glass-blur, 32px)) saturate(190%)',
                WebkitBackdropFilter: 'blur(var(--glass-blur, 32px)) saturate(190%)',
            }}
            onMouseEnter={() => cancelCloseHoverGlance()}
            onMouseLeave={() => scheduleCloseHoverGlance(150)}
            className={`fixed z-[9999] pointer-events-auto rounded-2xl border p-3.5 space-y-3 transition-all duration-200 ease-out origin-top-left ${
                isLight
                    ? 'liquid-glass-bright bg-white/85 border-black/10 text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.18)]'
                    : 'liquid-glass-dark bg-[#0c0d14]/82 border-white/[0.12] text-white shadow-[0_24px_60px_rgba(0,0,0,0.75)]'
            } ${
                isHoverGlanceClosing
                    ? 'opacity-0 scale-95 translate-y-1 pointer-events-none'
                    : 'opacity-100 scale-100 translate-y-0 animate-pop-in'
            }`}
        >
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-2.5 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <GitPullRequest size={13} className="text-emerald-400" />
                    </div>
                    <div>
                        <h4 className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                            GitHub Glance
                            <span className={`text-[10px] font-mono font-normal ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {username ? `@${username}` : ''}
                            </span>
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => fetchData(true)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                            isLight ? 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                        } ${isLoading ? 'animate-spin text-accent' : ''}`}
                        title="Refresh"
                    >
                        <RefreshCw size={11} />
                    </button>
                </div>
            </div>

            {!authenticated ? (
                <div className="text-center py-2 space-y-2">
                    <p className={`text-xs ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Connect GitHub to see live PR and issue previews.</p>
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
                        <div className={`p-2 rounded-xl border ${isLight ? 'bg-black/[0.03] border-black/5' : 'bg-white/[0.04] border-white/[0.07]'}`}>
                            <span className="block text-sm font-bold text-amber-400">
                                {(reviewRequests || []).length}
                            </span>
                            <span className={`text-[9px] uppercase font-semibold tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Reviews
                            </span>
                        </div>
                        <div className={`p-2 rounded-xl border ${isLight ? 'bg-black/[0.03] border-black/5' : 'bg-white/[0.04] border-white/[0.07]'}`}>
                            <span className="block text-sm font-bold text-sky-400">
                                {(myPrs || []).length}
                            </span>
                            <span className={`text-[9px] uppercase font-semibold tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                My PRs
                            </span>
                        </div>
                        <div className={`p-2 rounded-xl border ${isLight ? 'bg-black/[0.03] border-black/5' : 'bg-white/[0.04] border-white/[0.07]'}`}>
                            <span className="block text-sm font-bold text-emerald-400">
                                {(assignedIssues || []).length}
                            </span>
                            <span className={`text-[9px] uppercase font-semibold tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
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
                                <p className={`text-[10px] font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
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
                                                className={`p-1.5 rounded-lg cursor-pointer transition-all border border-transparent group ${
                                                    isLight ? 'hover:bg-black/[0.05] hover:border-black/5' : 'hover:bg-white/[0.08] hover:border-white/5'
                                                }`}
                                            >
                                                <p className={`text-xs font-medium truncate group-hover:text-accent ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                    {pr.title}
                                                </p>
                                                <p className={`text-[10px] truncate font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
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
                    <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                        <button 
                            onClick={() => handleOpenUrl('https://github.com/notifications')}
                            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
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
        </div>,
        document.body
    );
}
