import React from 'react';
import { 
    ArrowLeft, ArrowRight, RefreshCw, Copy, MonitorPlay, Pin, Minus, 
    PictureInPicture2, VolumeX, Volume2, Layers, X, Pencil, Trash, Moon, Search,
    Printer, FileDown, BookOpen, Highlighter, StickyNote
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

    const handleContextHighlight = (color = 'accent') => {
        const activeTabId = useTabStore.getState().activeTabId;
        const wv = window.qbrowseWebviews?.[activeTabId];
        if (wv && typeof wv.send === 'function') {
            wv.send('qbrowse-context-highlight', { color });
        }
    };

    const handleContextAddNote = () => {
        const activeTabId = useTabStore.getState().activeTabId;
        const wv = window.qbrowseWebviews?.[activeTabId];
        if (wv && typeof wv.send === 'function') {
            wv.send('qbrowse-context-add-note');
        }
    };

    const hasSelection = contextMenu?.hasSelection || !!(contextMenu?.selectionText);
    const selectionText = contextMenu?.selectionText || '';
    const safeX = typeof window !== 'undefined' ? Math.min(contextMenu?.x || 0, window.innerWidth - 240) : (contextMenu?.x || 0);
    const safeY = typeof window !== 'undefined' ? Math.min(contextMenu?.y || 0, window.innerHeight - 380) : (contextMenu?.y || 0);

    return (
        <>
            {children}
            
            {/* GENERAL CONTEXT MENU */}
            {(contextMenu || isContextMenuClosing) && (
                <div
                    className={`fixed z-[30000] w-60 flex flex-col bg-black/70 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] p-1.5 text-white/90 ${isContextMenuClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
                    style={{ top: safeY, left: safeX }}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                    {/* SELECTION ACTIONS */}
                    {hasSelection && (
                        <>
                            <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold text-white/50 border-b border-white/5 mb-1">
                                <span className="truncate max-w-[150px]">"{selectionText}"</span>
                                <span className="text-[10px] text-accent font-mono">Selected</span>
                            </div>
                            
                            {/* Highlight Swatches */}
                            <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-white/5 rounded-lg transition group">
                                <div className="flex items-center gap-2 text-xs font-medium text-white/90">
                                    <Highlighter size={13} className="text-accent" />
                                    <span>Highlight</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {[
                                        { id: 'accent', bg: '#d4bc94', title: 'Accent' },
                                        { id: 'yellow', bg: '#fde047', title: 'Yellow' },
                                        { id: 'green',  bg: '#86efac', title: 'Green' },
                                        { id: 'blue',   bg: '#93c5fd', title: 'Blue' },
                                        { id: 'pink',   bg: '#f472b6', title: 'Pink' }
                                    ].map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                handleContextHighlight(c.id);
                                                closeContextMenu();
                                            }}
                                            title={`Highlight with ${c.title}`}
                                            className="w-3.5 h-3.5 rounded-full border border-white/30 hover:scale-125 transition-transform cursor-pointer"
                                            style={{ backgroundColor: c.bg }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Add Note Button */}
                            <button
                                onClick={() => {
                                    handleContextAddNote();
                                    closeContextMenu();
                                }}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group"
                            >
                                <StickyNote size={14} className="text-accent group-hover:scale-110 transition-transform" />
                                <span>Add Note...</span>
                            </button>

                            {/* Copy Selection */}
                            <button
                                onClick={() => {
                                    if (selectionText) {
                                        navigator.clipboard.writeText(selectionText);
                                        showToast('Selected text copied');
                                    }
                                    closeContextMenu();
                                }}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group"
                            >
                                <Copy size={14} className="text-white/50 group-hover:text-white transition" />
                                <span>Copy</span>
                            </button>

                            {/* Search Google with Selection */}
                            <button
                                onClick={() => {
                                    if (selectionText) {
                                        useTabStore.getState().handleNewTab(`https://www.google.com/search?q=${encodeURIComponent(selectionText)}`);
                                    }
                                    closeContextMenu();
                                }}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group"
                            >
                                <Search size={14} className="text-white/50 group-hover:text-white transition" />
                                <span>Search with Google</span>
                            </button>

                            <div className="h-px w-full bg-white/10 my-1.5"></div>
                        </>
                    )}

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
                    <button onClick={() => { useUIStore.getState().toggleReaderMode(); closeContextMenu(); }} className="flex items-center justify-between px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <div className="flex items-center gap-3">
                            <BookOpen size={14} className="text-white/50 group-hover:text-white transition" /> Toggle Reader Mode
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">Ctrl+Alt+R</span>
                    </button>
                    <button onClick={() => { useUIStore.getState().setIsFindOpen(true); closeContextMenu(); }} className="flex items-center justify-between px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <div className="flex items-center gap-3">
                            <Search size={14} className="text-white/50 group-hover:text-white transition" /> Find in page...
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">Ctrl+F</span>
                    </button>
                    <button onClick={() => { useUIStore.getState().printActivePage(); closeContextMenu(); }} className="flex items-center justify-between px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <div className="flex items-center gap-3">
                            <Printer size={14} className="text-white/50 group-hover:text-white transition" /> Print...
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">Ctrl+P</span>
                    </button>
                    <button onClick={() => { useUIStore.getState().saveActivePageAsPDF(); closeContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                        <FileDown size={14} className="text-white/50 group-hover:text-white transition" /> Save as Clean PDF...
                    </button>
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
                    {tabContextMenu?.spaceType !== 'pinned' && tabContextMenu?.tab?.url && tabContextMenu?.tab?.url !== 'about:blank' && (
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
                    <button onClick={() => { 
                        if (tabContextMenu?.tab) {
                            useUIStore.getState().toggleSplitView(tabContextMenu.tab.id);
                            showToast(`Opened ${tabContextMenu.tab.title} in Split View`);
                        }
                        closeTabContextMenu(); 
                    }} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 rounded-lg text-sm font-medium transition text-left w-full group text-accent">
                        <MonitorPlay size={14} className="text-accent/70 group-hover:text-accent transition" /> Open in Split View
                    </button>
                    
                    <div className="h-px w-full bg-white/10 my-1.5"></div>

                    {tabContextMenu?.tab.isAudioPlaying && (
                        <button onClick={() => { 
                            useUIStore.getState().sendMediaCommand('toggle-pip'); 
                            showToast('Picture-in-Picture'); 
                            closeTabContextMenu(); 
                        }} className="flex items-center gap-3 px-3 py-2 hover:bg-purple-500/10 rounded-lg text-sm font-medium transition text-left w-full group text-purple-400">
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
                    {!tabContextMenu?.tab.suspended && (
                        <button onClick={() => { useTabStore.getState().suspendTab(tabContextMenu?.tab.id); closeTabContextMenu(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition text-left w-full group">
                            <Moon size={14} className="text-white/50 group-hover:text-white transition" /> Suspend Tab
                        </button>
                    )}

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
