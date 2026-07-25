import React from 'react';
import { Globe } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import AuthModal from '../modals/AuthModal';

export default function Overlays() {
    const hoverPreview = useUIStore(state => state.hoverPreview);
    const tabContextMenu = useUIStore(state => state.tabContextMenu);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isFullscreen = useUIStore(state => state.isFullscreen);
    const draggedItem = useTabStore(state => state.draggedItem);

    return (
        <>
            {/* TAB HOVER CARDS */}
            {hoverPreview && !isSidebarHidden && !isFullscreen && !tabContextMenu && !draggedItem && (
                <div
                    className={`fixed z-[40000] w-64 flex flex-col bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-none animate-pop-in`}
                    style={{ top: Math.min(hoverPreview.top, window.innerHeight - 200), left: hoverPreview.left }}
                >
                    <div className="flex items-center gap-3 p-3 bg-white/5 border-b border-white/10">
                        {hoverPreview.tab.url ? (
                            <img src={`https://www.google.com/s2/favicons?sz=64&domain=${hoverPreview.tab.url}`} alt="icon" className="w-4 h-4 rounded-sm flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                            <Globe size={14} className="text-white/50" />
                        )}
                        <span className="text-sm font-semibold truncate text-white/90">{hoverPreview.tab.title}</span>
                    </div>
                    <div className="w-full h-32 bg-[#121214] relative overflow-hidden flex flex-col items-center justify-center">
                        {hoverPreview.tab.thumbnail ? (
                            <img src={hoverPreview.tab.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        ) : (
                            <>
                                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)]`} style={{ backgroundSize: '12px 12px' }}></div>
                                <Globe size={32} className="text-white/10 mb-2 drop-shadow-md" />
                            </>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 px-2 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 truncate text-[10px] font-mono text-white/50 text-center shadow-lg">
                            {hoverPreview.tab.url || 'New Tab'}
                        </div>
                    </div>
                </div>
            )}
            <AuthModal />
        </>
    );
}
