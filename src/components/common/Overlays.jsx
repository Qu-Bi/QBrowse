import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import useUIStore, { getAnimationTimeout, shouldOptimizeEcoVisuals } from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import AuthModal from '../modals/AuthModal';
import PresetStudioModal from '../modals/PresetStudioModal';
import LiquidTooltip from './LiquidTooltip';
import { getLiquidGlassInlineStyle, getLiquidGlassSurfaceClasses } from './ContextMenuProvider';
import { useTranslation } from '../../i18n/index';
import { getSafeFaviconUrl } from '../../utils/networkPrivacy';

export default function Overlays() {
    const { t } = useTranslation();
    const activeModal = useUIStore(state => state.activeModal);
    const hoverPreview = useUIStore(state => state.hoverPreview);
    const tabContextMenu = useUIStore(state => state.tabContextMenu);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const theme = useUIStore(state => state.theme);
    const settings = useUIStore(state => state.settings);
    const activeSpace = useTabStore(state => state.activeSpace);
    const draggedItem = useTabStore(state => state.draggedItem);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const activePerformanceTier = useUIStore(state => state.activePerformanceTier);
    const reduceVisualsOnEco = useUIStore(state => state.reduceVisualsOnEco);
    const isEco = shouldOptimizeEcoVisuals(activePerformanceTier, reduceVisualsOnEco);

    const [displayedPreview, setDisplayedPreview] = useState(null);
    const [isExiting, setIsExiting] = useState(false);
    const exitTimerRef = useRef(null);

    const shouldShow = Boolean(hoverPreview && hoverPreview.tab && !isSidebarHidden && !isFullscreen && !tabContextMenu && !draggedItem);

    useEffect(() => {
        if (shouldShow) {
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
            setDisplayedPreview(hoverPreview);
            setIsExiting(false);
        } else if (displayedPreview && !isExiting) {
            setIsExiting(true);
            const timeout = getAnimationTimeout(120);
            exitTimerRef.current = setTimeout(() => {
                setDisplayedPreview(null);
                setIsExiting(false);
            }, timeout);
        }
        return () => {
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        };
    }, [shouldShow, hoverPreview]);

    const activeCard = displayedPreview || hoverPreview;

    return (
        <>
            {/* TAB HOVER CARDS */}
            {activeCard && activeCard.tab && (
                <div
                    className={`fixed z-[40000] w-64 flex flex-col ${
                        isEco
                            ? (isBright ? 'bg-white border border-black/15 shadow-xl text-zinc-900' : 'bg-[#0f1015] border border-white/15 shadow-2xl text-white')
                            : getLiquidGlassSurfaceClasses(isBright)
                    } rounded-2xl overflow-hidden pointer-events-none ${isExiting ? 'animate-dissolve-out' : 'animate-pop-in'}`}
                    style={{
                        top: Math.min(activeCard.top || 0, window.innerHeight - 200),
                        left: activeCard.left || 0,
                        ...(!isEco ? getLiquidGlassInlineStyle(isBright) : {})
                    }}
                >
                    <div className={`flex items-center gap-3 p-3 ${isBright ? 'bg-black/[0.03] border-b border-black/[0.06]' : 'bg-white/5 border-b border-white/10'}`}>
                        {getSafeFaviconUrl(activeCard.tab?.url, settings, 64) ? (
                            <img src={getSafeFaviconUrl(activeCard.tab.url, settings, 64)} alt="icon" className="w-4 h-4 rounded-sm flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                            <Globe size={14} className={isBright ? "text-zinc-500" : "text-white/50"} />
                        )}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={`text-sm font-semibold truncate ${isBright ? 'text-zinc-900' : 'text-white/90'}`}>{activeCard.tab?.title || t('chrome.untitledTab', null, 'Untitled')}</span>
                            {activeCard.tab?.suspended && (
                                <span className={`flex-shrink-0 px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                                    isBright
                                        ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}>
                                    {t('chrome.sleepingBadge', null, 'Sleeping')}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`w-full h-32 ${isBright ? 'bg-zinc-100/90' : 'bg-[#121214]'} relative overflow-hidden flex flex-col items-center justify-center`}>
                        {activeCard.tab?.thumbnail ? (
                            <img src={activeCard.tab.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                        ) : (
                            <>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(128,128,128,0.1)_1px,transparent_1px)]" style={{ backgroundSize: '12px 12px' }}></div>
                                <Globe size={32} className={`${isBright ? 'text-zinc-300' : 'text-white/10'} mb-2 drop-shadow-md`} />
                            </>
                        )}
                        <div className={`absolute bottom-2 left-2 right-2 px-2 py-1.5 ${isBright ? 'bg-white/90 border-black/10 text-zinc-700 shadow-md' : 'bg-black/60 border-white/10 text-white/50 shadow-lg'} backdrop-blur-md rounded-lg border truncate text-[10px] font-mono text-center`}>
                            {activeCard.tab?.url || t('nav.newTab', null, 'New Tab')}
                        </div>
                    </div>
                </div>
            )}
            <AuthModal />
            {activeModal === 'presetStudio' && <PresetStudioModal />}
            <LiquidTooltip />
        </>
    );
}
