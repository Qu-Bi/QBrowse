import React from 'react';
import { 
    ArrowLeft, ArrowRight, RefreshCw, Copy, MonitorPlay, Pin, Minus, 
    PictureInPicture2, VolumeX, Volume2, Layers, X, Pencil, Trash
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function ContextMenuProvider({ children }) {
    const contextMenu = useUIStore(state => state.contextMenu);
    const isContextMenuClosing = useUIStore(state => state.isContextMenuClosing);
    const closeContextMenu = useUIStore(state => state.closeContextMenu);
    
    const tabContextMenu = useUIStore(state => state.tabContextMenu);
    const isTabContextMenuClosing = useUIStore(state => state.isTabContextMenuClosing);
    const closeTabContextMenu = useUIStore(state => state.closeTabContextMenu);
    
    const folderContextMenu = useUIStore(state => state.folderContextMenu);
    const isFolderContextMenuClosing = useUIStore(state => state.isFolderContextMenuClosing);
    const closeFolderContextMenu = useUIStore(state => state.closeFolderContextMenu);
    
    const showToast = useUIStore(state => state.showToast);
    const setPipWindow = useUIStore(state => state.setPipWindow);
    const setPeekWindow = useUIStore(state => state.setPeekWindow);

    const handleCloseTab = useTabStore(state => state.handleCloseTab);
    const handleToggleMute = useTabStore(state => state.handleToggleMute);
    const handlePinTab = useTabStore(state => state.handlePinTab);
    const handleUnpinTab = useTabStore(state => state.handleUnpinTab);

    const handleRefresh = () => { showToast('Odświeżam...'); };

    return (
        <>
            {children}
            
            {/* GENERAL CONTEXT MENU */}
            {(contextMenu || isContextMenuClosing) && (
                <div
                    className={`fixed z-[30000] w-56 flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] p-1.5 text-white/90 ${isContextMenuClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                    style={{ top: contextMenu?.y, left: contextMenu?.x }}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                    <button onClick={() => { showToast('Back'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <ArrowLeft size={14} className="text-white/50 group-hover:text-white transition" /> Back
                    </button>
                    <button onClick={() => { showToast('Forward'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <ArrowRight size={14} className="text-white/50 group-hover:text-white transition" /> Forward
                    </button>
                    <button onClick={() => { handleRefresh(); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <RefreshCw size={14} className="text-white/50 group-hover:text-white transition" /> Reload
                    </button>
                    <div className="h-px w-full bg-white/10 my-1.5"></div>
                    <button onClick={() => { showToast('URL copied to clipboard'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Copy size={14} className="text-white/50 group-hover:text-white transition" /> Copy URL
                    </button>
                    <div className="h-px w-full bg-white/10 my-1.5"></div>
                    <button onClick={() => { showToast('Download started...'); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <ArrowRight size={14} className="text-white/50 group-hover:text-white transition rotate-90" /> Download Link
                    </button>
                    <button onClick={() => { window.electronAPI && window.electronAPI.openDevTools(); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <MonitorPlay size={14} className="text-white/50 group-hover:text-white transition" /> Inspect Element
                    </button>
                </div>
            )}

            {/* TAB CONTEXT MENU */}
            {(tabContextMenu || isTabContextMenuClosing) && (
                <div
                    className={`fixed z-[30000] w-56 flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] p-1.5 text-white/90 ${isTabContextMenuClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                    style={{ top: tabContextMenu?.y, left: tabContextMenu?.x }}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                    <div className="px-3 py-2 text-xs font-semibold text-white/40 border-b border-white/5 mb-1 truncate">
                        {tabContextMenu?.tab.title}
                    </div>
                    {tabContextMenu?.spaceType !== 'pinned' && (
                        <button onClick={() => { handlePinTab(tabContextMenu?.tab); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                            <Pin size={14} className="text-white/50 group-hover:text-white transition" /> Pin Tab
                        </button>
                    )}
                    {tabContextMenu?.spaceType === 'pinned' && (
                        <button onClick={() => { handleUnpinTab(tabContextMenu?.tab); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                            <Minus size={14} className="text-white/50 group-hover:text-white transition" /> Unpin Tab
                        </button>
                    )}
                    <button onClick={() => { showToast('URL copied to clipboard'); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Copy size={14} className="text-white/50 group-hover:text-white transition" /> Copy URL
                    </button>
                    
                    <button onClick={() => { setPeekWindow(tabContextMenu?.tab); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <MonitorPlay size={14} className="text-white/50 group-hover:text-white transition" /> Peek Preview
                    </button>

                    <div className="h-px w-full bg-white/10 my-1.5"></div>

                    {tabContextMenu?.tab.isAudioPlaying && (
                        <button onClick={() => { setPipWindow(tabContextMenu?.tab); showToast('PiP Activated'); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-purple-500/10 rounded-lg text-sm font-medium transition text-left w-full group text-purple-400">
                            <PictureInPicture2 size={14} className="text-purple-400/60 group-hover:text-purple-400 transition" /> Picture in Picture
                        </button>
                    )}

                    <button onClick={() => { handleToggleMute(tabContextMenu?.tab.id, tabContextMenu?.spaceType); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        {tabContextMenu?.tab.isMuted ? <Volume2 size={14} className="text-white/50 group-hover:text-white transition" /> : <VolumeX size={14} className="text-white/50 group-hover:text-white transition" />}
                        {tabContextMenu?.tab.isMuted ? 'Unmute Tab' : 'Mute Tab'}
                    </button>
                    <button onClick={() => { showToast('Duplicated tab'); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Layers size={14} className="text-white/50 group-hover:text-white transition" /> Duplicate Tab
                    </button>

                    <div className="h-px w-full bg-white/10 my-1.5"></div>

                    <button onClick={() => { handleCloseTab(tabContextMenu?.tab.id); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition text-left w-full group">
                        <X size={14} className="text-red-400/50 group-hover:text-red-300 transition" /> Close Tab
                    </button>
                </div>
            )}

            {/* FOLDER CONTEXT MENU */}
            {(folderContextMenu || isFolderContextMenuClosing) && (
                <div
                    className={`fixed z-[30000] w-56 flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] p-1.5 text-white/90 ${isFolderContextMenuClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                    style={{ top: folderContextMenu?.y, left: folderContextMenu?.x }}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                    <div className="px-3 py-2 text-xs font-semibold text-white/40 border-b border-white/5 mb-1 truncate">
                        {folderContextMenu?.folder.name}
                    </div>
                    <button onClick={() => { 
                        closeFolderContextMenu();
                        useTabStore.getState().setRenamingFolderId(folderContextMenu?.folder.id);
                    }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Pencil size={14} className="text-white/50 group-hover:text-white transition" /> Rename Folder
                    </button>
                    <div className="h-px w-full bg-white/10 my-1.5"></div>
                    <button onClick={() => { 
                        closeFolderContextMenu();
                        useTabStore.getState().deleteFolder(folderContextMenu?.folder.id);
                        showToast('Folder deleted');
                    }} className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition text-left w-full group">
                        <Trash size={14} className="text-red-400/50 group-hover:text-red-300 transition" /> Delete Folder
                    </button>
                </div>
            )}
        </>
    );
}
