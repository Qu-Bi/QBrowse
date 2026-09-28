import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { 
    ArrowLeft, ArrowRight, RefreshCw, Copy, MonitorPlay, Pin, Minus, 
    VolumeX, Volume2, Layers, X, Pencil, Trash2, Moon, Search,
    Printer, FileDown, BookOpen, Highlighter, StickyNote, ExternalLink,
    Download, Image as ImageIcon, Sparkles, Globe, FileText, MessageSquare,
    HelpCircle, RotateCcw, RotateCw, Scissors, Clipboard, CheckSquare,
    Code, Terminal, Briefcase, User, EyeOff, Shield, FolderOpen, Plus,
    CornerDownLeft, ChevronRight, ArrowRightLeft, Bookmark, Check
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import useAIStore from '../../store/useAIStore';
import { useAnnotationStore, HIGHLIGHT_COLORS } from '../../store/useAnnotationStore';
import { isTabForPin } from '../layout/PinnedStackPopup';

// Helper: Search URL generation based on active space and user settings
const getSearchUrl = (query) => {
    const activeSpace = useTabStore.getState().activeSpace;
    const q = encodeURIComponent(query.trim());
    if (activeSpace === 'tor') {
        return `https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/?q=${q}`;
    }
    const engine = useUIStore.getState().settings?.searchEngine || 'google';
    if (engine === 'duckduckgo') return `https://duckduckgo.com/?q=${q}`;
    if (engine === 'bing') return `https://www.bing.com/search?q=${q}`;
    if (engine === 'brave') return `https://search.brave.com/search?q=${q}`;
    if (engine === 'ecosia') return `https://www.ecosia.org/search?q=${q}`;
    return `https://www.google.com/search?q=${q}`;
};

const getEngineName = () => {
    const activeSpace = useTabStore.getState().activeSpace;
    if (activeSpace === 'tor') return 'DuckDuckGo Onion';
    const engine = useUIStore.getState().settings?.searchEngine || 'google';
    const names = {
        google: 'Google',
        duckduckgo: 'DuckDuckGo',
        bing: 'Bing',
        brave: 'Brave Search',
        ecosia: 'Ecosia'
    };
    return names[engine] || 'Google';
};

// Context for theme support in context menus
const ContextMenuThemeContext = React.createContext({ isBright: false });

// Reusable Glassmorphic Menu Container with Smart Edge Collision Detection & Keyboard Navigation
function MenuContainer({ x, y, isClosing, onClose, children, className = '' }) {
    const { isBright } = React.useContext(ContextMenuThemeContext);
    const containerRef = useRef(null);

    const getInitialPos = () => {
        const pad = 12;
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const estW = 260;
        const estH = 340;
        const safeX = Math.max(pad, Math.min(x ?? pad, screenW - estW - pad));
        const safeY = Math.max(pad, Math.min(y ?? pad, screenH - estH - pad));
        return { x: safeX, y: safeY };
    };

    const [pos, setPos] = useState(getInitialPos);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const pad = 12;
        const springOvershootMargin = 6; // Safety buffer for animate-pop-in spring scale(1.02)
        
        const clampPosition = () => {
            if (!containerRef.current) return;
            const currentEl = containerRef.current;
            // offsetWidth and offsetHeight provide the un-transformed layout dimensions,
            // immune to CSS animation transforms (scale(0.9) / translateY)
            const width = Math.max(currentEl.offsetWidth, currentEl.scrollWidth, 240);
            const height = Math.max(currentEl.offsetHeight, currentEl.scrollHeight, 180);

            let adjX = x ?? pad;
            let adjY = y ?? pad;

            if (adjX + width + pad + springOvershootMargin > window.innerWidth) {
                adjX = window.innerWidth - width - pad - springOvershootMargin;
            }
            if (adjY + height + pad + springOvershootMargin > window.innerHeight) {
                adjY = window.innerHeight - height - pad - springOvershootMargin;
            }
            adjX = Math.max(pad, adjX);
            adjY = Math.max(pad, adjY);

            setPos({ x: Math.round(adjX), y: Math.round(adjY) });
        };

        clampPosition();

        const ro = new ResizeObserver(() => {
            clampPosition();
        });
        ro.observe(el);

        window.addEventListener('resize', clampPosition);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', clampPosition);
        };
    }, [x, y]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (!containerRef.current) return;
                const items = Array.from(
                    containerRef.current.querySelectorAll('[data-menu-item]:not([disabled])')
                );
                if (items.length === 0) return;
                const currentIndex = items.indexOf(document.activeElement);
                let nextIndex = 0;
                if (e.key === 'ArrowDown') {
                    nextIndex = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
                } else {
                    nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                }
                items[nextIndex]?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onClose]);

    return (
        <>
            {!isClosing && (
                <div
                    className="fixed inset-0 z-[29990] bg-transparent cursor-default select-none"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                    }}
                />
            )}
            <div
                ref={containerRef}
                data-context-menu
                tabIndex={-1}
                className={`fixed z-[30000] flex flex-col max-h-[calc(100vh-24px)] max-w-[calc(100vw-24px)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden backdrop-blur-2xl rounded-2xl p-1.5 select-none outline-none ${
                    isBright 
                        ? 'bg-white/80 border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)] text-zinc-900' 
                        : 'bg-[#0c0c0f]/94 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.08)] text-white/90'
                } ${isClosing ? 'animate-pop-out' : 'animate-pop-in'} ${className}`}
                style={{
                    top: `${pos.y}px`,
                    left: `${pos.x}px`,
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)'
                }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
                {children}
            </div>
        </>
    );
}

// Compact Horizontal Header Icon Buttons
function MenuHeaderPills({ items }) {
    const { isBright } = React.useContext(ContextMenuThemeContext);
    return (
        <div className={`flex items-center justify-between gap-1 p-1 border rounded-xl mb-1 ${
            isBright ? 'bg-black/[0.03] border-black/[0.06]' : 'bg-white/[0.04] border-white/[0.06]'
        }`}>
            {items.map((it, idx) => {
                const Icon = it.icon;
                return (
                    <button
                        key={idx}
                        disabled={it.disabled}
                        onClick={(e) => {
                            if (it.disabled) return;
                            e.stopPropagation();
                            it.onClick?.(e);
                        }}
                        title={it.title}
                        className={`p-1.5 rounded-lg transition flex items-center justify-center flex-1 cursor-pointer outline-none ${
                            isBright
                                ? (it.disabled
                                    ? 'opacity-25 pointer-events-none text-zinc-400'
                                    : it.danger
                                    ? 'text-red-500 hover:text-red-600 hover:bg-red-500/10 active:scale-95 focus:bg-red-500/10'
                                    : it.accent
                                    ? 'text-accent hover:bg-accent/20 active:scale-95 focus:bg-accent/15'
                                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5 active:scale-95 focus:bg-black/5')
                                : (it.disabled
                                    ? 'opacity-25 pointer-events-none text-white/40'
                                    : it.danger
                                    ? 'text-red-400/80 hover:text-red-300 hover:bg-red-500/20 active:scale-95 focus:bg-white/15'
                                    : it.accent
                                    ? 'text-accent hover:bg-accent/20 active:scale-95 focus:bg-white/15'
                                    : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95 focus:bg-white/15')
                        }`}
                    >
                        <Icon size={14} />
                    </button>
                );
            })}
        </div>
    );
}

// Standard Menu Item
function MenuItem({ 
    icon: Icon, 
    label, 
    onClick, 
    shortcut, 
    danger = false, 
    accent = false, 
    disabled = false,
    className = ''
}) {
    const { isBright } = React.useContext(ContextMenuThemeContext);
    return (
        <button
            data-menu-item
            disabled={disabled}
            onClick={(e) => {
                if (disabled) return;
                e.stopPropagation();
                onClick?.(e);
            }}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer text-left w-full group outline-none ${
                isBright
                    ? (disabled 
                        ? 'opacity-30 cursor-not-allowed pointer-events-none text-zinc-400' 
                        : danger 
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-500/10 active:bg-red-500/20 focus:bg-red-500/10'
                        : accent
                        ? 'text-accent hover:text-accent hover:bg-accent/15 active:bg-accent/25 focus:bg-accent/15'
                        : 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5 active:bg-black/10 focus:bg-black/5')
                    : (disabled 
                        ? 'opacity-30 cursor-not-allowed pointer-events-none' 
                        : danger 
                        ? 'text-red-400 hover:text-red-300 hover:bg-red-500/15 active:bg-red-500/25 focus:bg-white/10' 
                        : accent
                        ? 'text-accent hover:text-accent hover:bg-accent/15 active:bg-accent/25 focus:bg-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 focus:bg-white/10')
            } ${className}`}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                    <Icon 
                        size={14} 
                        className={`flex-shrink-0 transition-transform duration-150 ${
                            isBright
                                ? (danger ? 'text-red-500 group-hover:scale-110' : accent ? 'text-accent group-hover:scale-110' : 'text-zinc-400 group-hover:text-zinc-900 group-hover:scale-105')
                                : (danger ? 'text-red-400 group-hover:scale-110' : accent ? 'text-accent group-hover:scale-110' : 'text-white/50 group-hover:text-white group-hover:scale-105')
                        }`} 
                    />
                )}
                <span className="truncate">{label}</span>
            </div>
            {shortcut && (
                <span className={`text-[10px] font-mono ml-2 flex-shrink-0 ${
                    isBright ? 'text-zinc-400 group-hover:text-zinc-600' : 'text-white/35 font-mono group-hover:text-white/60'
                }`}>
                    {shortcut}
                </span>
            )}
        </button>
    );
}

// Menu Divider
function MenuDivider() {
    const { isBright } = React.useContext(ContextMenuThemeContext);
    return <div className={`h-px w-full my-1 ${isBright ? 'bg-black/[0.06]' : 'bg-white/[0.08]'}`} />;
}

// Section Header for context menus
function MenuSectionHeader({ children, className = '' }) {
    const { isBright } = React.useContext(ContextMenuThemeContext);
    return (
        <div className={`px-2.5 py-1 text-xs font-semibold border-b mb-1 truncate ${
            isBright ? 'text-zinc-500 border-black/[0.06]' : 'text-white/50 border-white/[0.06]'
        } ${className}`}>
            {children}
        </div>
    );
}

// Flyout Submenu for AI and Space Moving
function MenuItemWithSubmenu({ icon: Icon, label, children, accent = false }) {
    const { isBright } = React.useContext(ContextMenuThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const itemRef = useRef(null);
    const [flyoutStyle, setFlyoutStyle] = useState({ top: '0px', left: 'calc(100% + 6px)' });

    const handleMouseEnter = () => {
        setIsOpen(true);
        if (itemRef.current) {
            const itemRect = itemRef.current.getBoundingClientRect();
            const submenuWidth = 220;
            const submenuHeight = 220;
            const pad = 12;
            let leftStyle = 'calc(100% + 6px)';
            if (itemRect.right + submenuWidth > window.innerWidth - pad) {
                leftStyle = 'calc(-100% - 6px)';
            }
            let topStyle = '0px';
            if (itemRect.top + submenuHeight > window.innerHeight - pad) {
                const diff = (itemRect.top + submenuHeight) - (window.innerHeight - pad);
                topStyle = `-${Math.max(0, diff)}px`;
            }
            setFlyoutStyle({ top: topStyle, left: leftStyle });
        }
    };

    const handleMouseLeave = () => {
        setIsOpen(false);
    };

    return (
        <div 
            ref={itemRef} 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                data-menu-item
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer text-left w-full group outline-none ${
                    isBright
                        ? (isOpen ? 'bg-black/5 text-zinc-950' : accent ? 'text-accent hover:bg-accent/15' : 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5')
                        : (isOpen ? 'bg-white/10 text-white' : accent ? 'text-accent hover:bg-accent/15' : 'text-white/80 hover:text-white hover:bg-white/10')
                }`}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(prev => !prev);
                }}
            >
                <div className="flex items-center gap-2.5">
                    {Icon && (
                        <Icon 
                            size={14} 
                            className={
                                accent 
                                    ? 'text-accent group-hover:scale-105 transition-transform' 
                                    : (isBright ? 'text-zinc-400 group-hover:text-zinc-900 group-hover:scale-105 transition-transform' : 'text-white/50 group-hover:text-white group-hover:scale-105 transition-transform')
                            } 
                        />
                    )}
                    <span>{label}</span>
                </div>
                <ChevronRight size={13} className={`transition-transform ${
                    isBright
                        ? (isOpen ? 'translate-x-0.5 text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-950')
                        : (isOpen ? 'translate-x-0.5 text-white' : 'text-white/40 group-hover:text-white')
                }`} />
            </button>

            {isOpen && (
                <div
                    className={`absolute z-10 w-52 max-h-[calc(100vh-48px)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col backdrop-blur-2xl rounded-2xl p-1.5 animate-pop-in select-none ${
                        isBright
                            ? 'bg-white/85 border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)] text-zinc-900'
                            : 'bg-[#0c0c0f]/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.08)] text-white/90'
                    }`}
                    style={flyoutStyle}
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

// Highlight Color Swatches
function HighlightSwatches({ onSelectColor }) {
    const { isBright } = React.useContext(ContextMenuThemeContext);
    const colors = [
        { id: 'accent', bg: '#d4bc94', title: 'Accent' },
        { id: 'yellow', bg: '#fde047', title: 'Yellow' },
        { id: 'green',  bg: '#86efac', title: 'Green' },
        { id: 'blue',   bg: '#93c5fd', title: 'Blue' },
        { id: 'pink',   bg: '#f472b6', title: 'Pink' }
    ];

    return (
        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition group ${
            isBright ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.06]'
        }`}>
            <div className={`flex items-center gap-2 text-xs font-medium ${isBright ? 'text-zinc-800' : 'text-white/90'}`}>
                <Highlighter size={13} className="text-accent" />
                <span>Highlight</span>
            </div>
            <div className="flex items-center gap-1.5">
                {colors.map(c => (
                    <button
                        key={c.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectColor(c.id);
                        }}
                        title={`Highlight with ${c.title}`}
                        className={`w-3.5 h-3.5 rounded-full border hover:scale-125 transition-transform cursor-pointer ${
                            isBright ? 'border-black/20' : 'border-white/30'
                        }`}
                        style={{ backgroundColor: c.bg }}
                    />
                ))}
            </div>
        </div>
    );
}

export default function ContextMenuProvider({ children }) {
    const contextMenu = useUIStore(state => state.contextMenu);
    const isContextMenuClosing = useUIStore(state => state.isContextMenuClosing);
    const closeContextMenu = useUIStore(state => state.closeContextMenu);
    
    const tabContextMenu = useUIStore(state => state.tabContextMenu);
    const isTabContextMenuClosing = useUIStore(state => state.isTabContextMenuClosing);
    const closeTabContextMenu = useUIStore(state => state.closeTabContextMenu);
    
    const pinnedContextMenu = useUIStore(state => state.pinnedContextMenu);
    const isPinnedContextMenuClosing = useUIStore(state => state.isPinnedContextMenuClosing);
    const closePinnedContextMenu = useUIStore(state => state.closePinnedContextMenu);

    const folderContextMenu = useUIStore(state => state.folderContextMenu);
    const isFolderContextMenuClosing = useUIStore(state => state.isFolderContextMenuClosing);
    const closeFolderContextMenu = useUIStore(state => state.closeFolderContextMenu);

    const topBarContextMenu = useUIStore(state => state.topBarContextMenu);
    const isTopBarContextMenuClosing = useUIStore(state => state.isTopBarContextMenuClosing);
    const closeTopBarContextMenu = useUIStore(state => state.closeTopBarContextMenu);

    const toolHubContextMenu = useUIStore(state => state.toolHubContextMenu);
    const isToolHubContextMenuClosing = useUIStore(state => state.isToolHubContextMenuClosing);
    const closeToolHubContextMenu = useUIStore(state => state.closeToolHubContextMenu);
    
    const showToast = useUIStore(state => state.showToast);
    const theme = useUIStore(state => state.theme);

    // Tab store methods
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];
    const setPrivateTabs = useTabStore(state => state.setPrivateTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setGhostTabs = useTabStore(state => state.setGhostTabs);
    const setTorTabs = useTabStore(state => state.setTorTabs);
    const addTab = useTabStore(state => state.addTab);
    const handleCloseTab = useTabStore(state => state.handleCloseTab);
    const handleToggleMute = useTabStore(state => state.handleToggleMute);
    const handlePinTab = useTabStore(state => state.handlePinTab);
    const handleUnpinTab = useTabStore(state => state.handleUnpinTab);
    const handleNewTab = useTabStore(state => state.handleNewTab);
    const duplicateTab = useTabStore(state => state.duplicateTab);
    const closeOtherTabs = useTabStore(state => state.closeOtherTabs);
    const closeTabsBelow = useTabStore(state => state.closeTabsBelow);
    const moveTabToSpace = useTabStore(state => state.moveTabToSpace);
    const suspendTab = useTabStore(state => state.suspendTab);
    const reloadTab = useTabStore(state => state.reloadTab);

    // Webview reference resolver
    const getActiveWebview = () => {
        const activeTabId = useTabStore.getState().activeTabId;
        return window.qbrowseWebviews ? window.qbrowseWebviews[activeTabId] : null;
    };

    const getTargetWebview = (tabId) => {
        if (tabId && window.qbrowseWebviews?.[tabId]) return window.qbrowseWebviews[tabId];
        return getActiveWebview();
    };

    // Annotation handlers
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

    // AI Action Handler
    const handleAIAction = (promptPrefix, text, autoSend = true) => {
        const ui = useUIStore.getState();
        const ai = useAIStore.getState();
        ui.setIsRightPanelOpen(true);
        ui.setRightPanelTab('ai');
        
        if (autoSend) {
            const fullPrompt = `${promptPrefix}:\n\n"${text}"`;
            ai.setChatInput(fullPrompt);
            setTimeout(() => {
                ai.sendChatMessage();
            }, 100);
        } else {
            ai.setChatInput(`"${text}"\n\n`);
        }
    };

    // Paste and Go Action for Omnibox
    const handlePasteAndGo = async () => {
        try {
            let text = '';
            if (window.electronAPI && window.electronAPI.readClipboardText) {
                text = await window.electronAPI.readClipboardText();
            } else {
                text = await navigator.clipboard.readText();
            }
            text = (text || '').trim();
            if (!text) return;
            
            let targetUrl = text;
            const isUrl = /^(https?:\/\/|[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}(:\d+)?(\/.*)?$)/i.test(text);
            if (!isUrl) {
                targetUrl = getSearchUrl(text);
            } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = `https://${targetUrl}`;
            }
            
            const activeTabId = useTabStore.getState().activeTabId;
            if (activeTabId) {
                useTabStore.getState().handleNavigate(activeTabId, targetUrl);
            } else {
                useTabStore.getState().handleNewTab(targetUrl);
            }
            useUIStore.getState().setCurrentUrl(targetUrl);
        } catch (err) {
            console.error('Failed to paste and go:', err);
        }
    };

    // Global listener to close context menus when clicking outside
    useEffect(() => {
        const handleGlobalDismiss = (e) => {
            if (e && e.target && e.target.closest && e.target.closest('[data-context-menu]')) return;
            useUIStore.getState().closeContextMenus();
        };
        window.addEventListener('mousedown', handleGlobalDismiss);
        window.addEventListener('click', handleGlobalDismiss);
        return () => {
            window.removeEventListener('mousedown', handleGlobalDismiss);
            window.removeEventListener('click', handleGlobalDismiss);
        };
    }, []);

    const engineName = getEngineName();

    return (
        <ContextMenuThemeContext.Provider value={{ isBright }}>
            {children}

            {/* ========================================================================= */}
            {/* 1. WEBVIEW CONTEXT MENU */}
            {/* ========================================================================= */}
            {(contextMenu || isContextMenuClosing) && (() => {
                const cm = contextMenu || {};
                const wv = getTargetWebview(cm.tabId);
                const hasImage = cm.hasImage || cm.mediaType === 'image' || !!cm.srcURL;
                const hasSelection = !hasImage && (cm.hasSelection || !!(cm.selectionText && cm.selectionText.trim()));
                const selectionText = cm.selectionText || '';
                const linkURL = cm.linkURL || '';
                const srcURL = cm.srcURL || '';
                const isEditable = cm.isEditable;
                const editFlags = cm.editFlags || {};
                const pageURL = cm.pageURL || useUIStore.getState().currentUrl || '';
                const activeTab = useTabStore.getState().getActiveTab();

                const headerPillItems = [
                    {
                        icon: ArrowLeft,
                        title: 'Back',
                        disabled: !cm.canGoBack,
                        onClick: () => {
                            if (wv && typeof wv.goBack === 'function') wv.goBack();
                            closeContextMenu();
                        }
                    },
                    {
                        icon: ArrowRight,
                        title: 'Forward',
                        disabled: !cm.canGoForward,
                        onClick: () => {
                            if (wv && typeof wv.goForward === 'function') wv.goForward();
                            closeContextMenu();
                        }
                    },
                    {
                        icon: RefreshCw,
                        title: 'Reload',
                        onClick: () => {
                            if (wv && typeof wv.reload === 'function') wv.reload();
                            closeContextMenu();
                        }
                    },
                    {
                        icon: Pin,
                        title: 'Pin Tab',
                        onClick: () => {
                            if (activeTab) handlePinTab(activeTab);
                            closeContextMenu();
                        }
                    },
                    {
                        icon: Copy,
                        title: 'Copy Page URL',
                        onClick: () => {
                            if (pageURL) {
                                navigator.clipboard.writeText(pageURL);
                                showToast('Page URL copied to clipboard');
                            }
                            closeContextMenu();
                        }
                    }
                ];

                return (
                    <MenuContainer
                        key={`wv-${cm.openedAt || `${cm.x}-${cm.y}`}`}
                        x={cm.x}
                        y={cm.y}
                        isClosing={isContextMenuClosing}
                        onClose={closeContextMenu}
                        className="w-64"
                    >
                        {/* Header Pill Row */}
                        <MenuHeaderPills items={headerPillItems} />

                        {/* MEDIA / IMAGE CONTEXT (Prioritized on image right-click) */}
                        {hasImage && srcURL && (
                            <>
                                <div className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                                    Image
                                </div>
                                <MenuItem
                                    icon={ImageIcon}
                                    label="Open Image in New Tab"
                                    onClick={() => {
                                        handleNewTab(srcURL);
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Copy}
                                    label="Copy Image Address"
                                    onClick={() => {
                                        navigator.clipboard.writeText(srcURL);
                                        showToast('Image address copied');
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Download}
                                    label="Save Image As..."
                                    onClick={() => {
                                        if (wv && typeof wv.downloadURL === 'function') {
                                            wv.downloadURL(srcURL);
                                        }
                                        showToast('Downloading image...');
                                        closeContextMenu();
                                    }}
                                />
                                <MenuDivider />
                            </>
                        )}

                        {/* LINK CONTEXT */}
                        {linkURL && (
                            <>
                                <div className="px-2.5 py-1 text-[10px] font-mono text-accent truncate border-b border-white/[0.06] mb-1">
                                    {linkURL}
                                </div>
                                <MenuItem
                                    icon={ExternalLink}
                                    label="Open Link in New Tab"
                                    onClick={() => {
                                        handleNewTab(linkURL);
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Layers}
                                    label="Open in Background Tab"
                                    onClick={() => {
                                        handleNewTab(linkURL, false);
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={MonitorPlay}
                                    label="Open Link in Split View"
                                    accent
                                    onClick={() => {
                                        const newTabId = `t-${Date.now()}`;
                                        useTabStore.getState().addTab({
                                            id: newTabId,
                                            title: 'Link Split',
                                            url: linkURL,
                                            active: false,
                                            folderId: null
                                        });
                                        useUIStore.getState().toggleSplitView(newTabId);
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Copy}
                                    label="Copy Link Address"
                                    shortcut="Ctrl+C"
                                    onClick={() => {
                                        navigator.clipboard.writeText(linkURL);
                                        showToast('Link address copied');
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Download}
                                    label="Download Link Target"
                                    onClick={() => {
                                        if (wv && typeof wv.downloadURL === 'function') {
                                            wv.downloadURL(linkURL);
                                        } else if (window.electronAPI?.openExternal) {
                                            window.electronAPI.openExternal(linkURL);
                                        }
                                        showToast('Download started...');
                                        closeContextMenu();
                                    }}
                                />
                                <MenuDivider />
                            </>
                        )}

                        {/* TEXT SELECTION CONTEXT */}
                        {hasSelection && (
                            <>
                                <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold text-white/50 border-b border-white/[0.06] mb-1">
                                    <span className="truncate max-w-[150px]">"{selectionText}"</span>
                                    <span className="text-[10px] text-accent font-mono">Selected</span>
                                </div>

                                <MenuItem
                                    icon={Copy}
                                    label="Copy"
                                    shortcut="Ctrl+C"
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectionText);
                                        showToast('Selected text copied');
                                        closeContextMenu();
                                    }}
                                />

                                <MenuItem
                                    icon={Search}
                                    label={`Search with ${engineName}`}
                                    onClick={() => {
                                        handleNewTab(getSearchUrl(selectionText));
                                        closeContextMenu();
                                    }}
                                />

                                <HighlightSwatches
                                    onSelectColor={(colorId) => {
                                        handleContextHighlight(colorId);
                                        closeContextMenu();
                                    }}
                                />

                                <MenuItem
                                    icon={StickyNote}
                                    label="Add Note..."
                                    onClick={() => {
                                        handleContextAddNote();
                                        closeContextMenu();
                                    }}
                                />

                                {/* AI Actions Submenu */}
                                <MenuItemWithSubmenu
                                    icon={Sparkles}
                                    label="AI Actions"
                                    accent
                                >
                                    <MenuItem
                                        icon={HelpCircle}
                                        label="Explain Selection"
                                        onClick={() => {
                                            handleAIAction('Please explain this concisely in simple terms', selectionText);
                                            closeContextMenu();
                                        }}
                                    />
                                    <MenuItem
                                        icon={FileText}
                                        label="Summarize Selection"
                                        onClick={() => {
                                            handleAIAction('Please provide a bulleted summary of this text', selectionText);
                                            closeContextMenu();
                                        }}
                                    />
                                    <MenuItem
                                        icon={Globe}
                                        label="Translate to English"
                                        onClick={() => {
                                            handleAIAction('Please translate this to English and explain key nuances', selectionText);
                                            closeContextMenu();
                                        }}
                                    />
                                    <MenuItem
                                        icon={MessageSquare}
                                        label="Send to AI Chat"
                                        onClick={() => {
                                            handleAIAction('', selectionText, false);
                                            closeContextMenu();
                                        }}
                                    />
                                </MenuItemWithSubmenu>

                                <MenuDivider />
                            </>
                        )}

                        {/* EDITABLE INPUT CONTEXT */}
                        {isEditable && (
                            <>
                                <MenuItem
                                    icon={RotateCcw}
                                    label="Undo"
                                    shortcut="Ctrl+Z"
                                    disabled={editFlags.canUndo === false}
                                    onClick={() => {
                                        if (wv && typeof wv.undo === 'function') wv.undo();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={RotateCw}
                                    label="Redo"
                                    shortcut="Ctrl+Y"
                                    disabled={editFlags.canRedo === false}
                                    onClick={() => {
                                        if (wv && typeof wv.redo === 'function') wv.redo();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuDivider />
                                <MenuItem
                                    icon={Scissors}
                                    label="Cut"
                                    shortcut="Ctrl+X"
                                    disabled={editFlags.canCut === false}
                                    onClick={() => {
                                        if (wv && typeof wv.cut === 'function') wv.cut();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Copy}
                                    label="Copy"
                                    shortcut="Ctrl+C"
                                    disabled={editFlags.canCopy === false}
                                    onClick={() => {
                                        if (wv && typeof wv.copy === 'function') wv.copy();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Clipboard}
                                    label="Paste"
                                    shortcut="Ctrl+V"
                                    disabled={editFlags.canPaste === false}
                                    onClick={() => {
                                        if (wv && typeof wv.paste === 'function') wv.paste();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={CheckSquare}
                                    label="Select All"
                                    shortcut="Ctrl+A"
                                    disabled={editFlags.canSelectAll === false}
                                    onClick={() => {
                                        if (wv && typeof wv.selectAll === 'function') wv.selectAll();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuDivider />
                            </>
                        )}

                        {/* GENERAL PAGE ACTIONS */}
                        {!linkURL && !hasImage && !hasSelection && !isEditable && (
                            <>
                                <MenuItem
                                    icon={BookOpen}
                                    label="Toggle Reader Mode"
                                    shortcut="Ctrl+Alt+R"
                                    onClick={() => {
                                        useUIStore.getState().toggleReaderMode();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Search}
                                    label="Find in Page..."
                                    shortcut="Ctrl+F"
                                    onClick={() => {
                                        useUIStore.getState().setIsFindOpen(true);
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={FileDown}
                                    label="Save as Clean PDF..."
                                    onClick={() => {
                                        useUIStore.getState().saveActivePageAsPDF();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Printer}
                                    label="Print..."
                                    shortcut="Ctrl+P"
                                    onClick={() => {
                                        useUIStore.getState().printActivePage();
                                        closeContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Code}
                                    label="View Page Source"
                                    onClick={() => {
                                        if (pageURL) {
                                            handleNewTab(`view-source:${pageURL}`);
                                        }
                                        closeContextMenu();
                                    }}
                                />
                                <MenuDivider />
                            </>
                        )}

                        <MenuItem
                            icon={Terminal}
                            label="Inspect Element"
                            onClick={() => {
                                if (wv && typeof wv.inspectElement === 'function' && cm.x != null && cm.y != null) {
                                    wv.inspectElement(cm.x, cm.y);
                                } else if (window.electronAPI?.openDevTools) {
                                    window.electronAPI.openDevTools();
                                }
                                closeContextMenu();
                            }}
                        />
                    </MenuContainer>
                );
            })()}

            {/* ========================================================================= */}
            {/* 2. TAB CONTEXT MENU (SIDEBAR TABS) */}
            {/* ========================================================================= */}
            {(tabContextMenu || isTabContextMenuClosing) && (() => {
                const tm = tabContextMenu || {};
                const tab = tm.tab || {};
                const spaceType = tm.spaceType || 'personal';

                const tabPillItems = [
                    {
                        icon: RefreshCw,
                        title: 'Reload Tab',
                        onClick: () => {
                            reloadTab(tab.id);
                            closeTabContextMenu();
                        }
                    },
                    {
                        icon: tab.isMuted ? Volume2 : VolumeX,
                        title: tab.isMuted ? 'Unmute Tab' : 'Mute Tab',
                        onClick: () => {
                            handleToggleMute(tab.id, spaceType);
                            closeTabContextMenu();
                        }
                    },
                    {
                        icon: spaceType === 'pinned' ? Minus : Pin,
                        title: spaceType === 'pinned' ? 'Unpin Tab' : 'Pin Tab',
                        onClick: () => {
                            if (spaceType === 'pinned') handleUnpinTab(tab);
                            else handlePinTab(tab);
                            closeTabContextMenu();
                        }
                    },
                    {
                        icon: MonitorPlay,
                        title: 'Open in Split View',
                        accent: true,
                        onClick: () => {
                            useUIStore.getState().toggleSplitView(tab.id);
                            closeTabContextMenu();
                        }
                    },
                    {
                        icon: X,
                        title: 'Close Tab',
                        danger: true,
                        onClick: () => {
                            handleCloseTab(tab.id);
                            closeTabContextMenu();
                        }
                    }
                ];

                return (
                    <MenuContainer
                        key={`tab-${tm.openedAt || `${tm.x}-${tm.y}`}`}
                        x={tm.x}
                        y={tm.y}
                        isClosing={isTabContextMenuClosing}
                        onClose={closeTabContextMenu}
                        className="w-60"
                    >
                        {/* Header Pill Row */}
                        <MenuHeaderPills items={tabPillItems} />

                        {/* Tab Title preview */}
                        <MenuSectionHeader>
                            {tab.title || 'Tab Actions'}
                        </MenuSectionHeader>

                        <MenuItem
                            icon={Layers}
                            label="Duplicate Tab"
                            onClick={() => {
                                duplicateTab(tab.id, spaceType);
                                closeTabContextMenu();
                            }}
                        />

                        {spaceType !== 'pinned' && tab.url && tab.url !== 'about:blank' && (
                            <MenuItem
                                icon={Pin}
                                label="Pin to App Bar"
                                onClick={() => {
                                    handlePinTab(tab);
                                    closeTabContextMenu();
                                }}
                            />
                        )}

                        <MenuItem
                            icon={Copy}
                            label="Copy Tab URL"
                            onClick={() => {
                                if (tab.url) {
                                    navigator.clipboard.writeText(tab.url);
                                    showToast('Tab URL copied');
                                }
                                closeTabContextMenu();
                            }}
                        />

                        <MenuItem
                            icon={MonitorPlay}
                            label="Open in Split View"
                            accent
                            onClick={() => {
                                useUIStore.getState().toggleSplitView(tab.id);
                                closeTabContextMenu();
                            }}
                        />

                        {!tab.suspended && (
                            <MenuItem
                                icon={Moon}
                                label="Suspend Tab (Save RAM)"
                                onClick={() => {
                                    suspendTab(tab.id);
                                    closeTabContextMenu();
                                }}
                            />
                        )}

                        <MenuDivider />

                        {/* Move to Space Submenu */}
                        <MenuItemWithSubmenu
                            icon={ArrowRightLeft}
                            label="Move to Space"
                        >
                            <MenuItem
                                icon={User}
                                label="Personal Space"
                                disabled={spaceType === 'personal'}
                                onClick={() => {
                                    moveTabToSpace(tab.id, spaceType, 'personal');
                                    closeTabContextMenu();
                                }}
                            />
                            <MenuItem
                                icon={Briefcase}
                                label="Work Space"
                                disabled={spaceType === 'work'}
                                onClick={() => {
                                    moveTabToSpace(tab.id, spaceType, 'work');
                                    closeTabContextMenu();
                                }}
                            />
                            <MenuItem
                                icon={EyeOff}
                                label="Ghost Space"
                                disabled={spaceType === 'ghost'}
                                onClick={() => {
                                    moveTabToSpace(tab.id, spaceType, 'ghost');
                                    closeTabContextMenu();
                                }}
                            />
                            <MenuItem
                                icon={Shield}
                                label="Tor Space"
                                disabled={spaceType === 'tor'}
                                onClick={() => {
                                    moveTabToSpace(tab.id, spaceType, 'tor');
                                    closeTabContextMenu();
                                }}
                            />
                        </MenuItemWithSubmenu>

                        <MenuDivider />

                        <MenuItem
                            icon={Layers}
                            label="Close Other Tabs"
                            danger
                            onClick={() => {
                                closeOtherTabs(tab.id, spaceType);
                                closeTabContextMenu();
                            }}
                        />
                        <MenuItem
                            icon={ArrowRight}
                            label="Close Tabs Below"
                            danger
                            onClick={() => {
                                closeTabsBelow(tab.id, spaceType);
                                closeTabContextMenu();
                            }}
                        />
                        <MenuItem
                            icon={X}
                            label="Close Tab"
                            shortcut="Ctrl+W"
                            danger
                            onClick={() => {
                                handleCloseTab(tab.id);
                                closeTabContextMenu();
                            }}
                        />
                    </MenuContainer>
                );
            })()}

            {/* ========================================================================= */}
            {/* 3. PINNED APPS CONTEXT MENU (MULTI-TAB STACK SUPPORT) */}
            {/* ========================================================================= */}
            {(pinnedContextMenu || isPinnedContextMenuClosing) && (() => {
                const pm = pinnedContextMenu || {};
                const pin = pm.pin || {};
                const pinUrl = pin.domain ? (pin.domain.startsWith('http') ? pin.domain : `https://${pin.domain}`) : '';

                const currentTabs = activeSpace === 'personal' ? privateTabs : 
                                   (activeSpace === 'work' ? workTabs : 
                                   (activeSpace === 'ghost' ? ghostTabs : torTabs));
                const setTabs = activeSpace === 'personal' ? setPrivateTabs : 
                               (activeSpace === 'work' ? setWorkTabs : 
                               (activeSpace === 'ghost' ? setGhostTabs : setTorTabs));

                const pinTabs = currentTabs.filter(t => isTabForPin(t, pin));

                const handleSelectTab = (tab) => {
                    setTabs(currentTabs.map(t => ({ 
                        ...t, 
                        active: t.id === tab.id,
                        suspended: t.id === tab.id ? false : t.suspended,
                        lastActiveAt: t.id === tab.id ? Date.now() : t.lastActiveAt
                    })));
                    useUIStore.getState().setCurrentUrl(tab.url || '');
                    closePinnedContextMenu();

                    setTimeout(() => {
                        const wv = window.qbrowseWebviews ? window.qbrowseWebviews[tab.id] : null;
                        if (wv && typeof wv.focus === 'function') {
                            try { wv.focus(); } catch (_) {}
                        }
                    }, 30);
                };

                const handleNewTabForPin = () => {
                    addTab({
                        id: `t-${Date.now()}`,
                        pinnedId: pin.id,
                        title: pin.title,
                        url: pinUrl,
                        active: true,
                        folderId: null
                    });
                    closePinnedContextMenu();
                };

                const handleCloseAllInStack = () => {
                    pinTabs.forEach(t => handleCloseTab(t.id));
                    showToast(`Closed ${pinTabs.length} tabs for ${pin.title}`);
                    closePinnedContextMenu();
                };

                return (
                    <MenuContainer
                        key={`pin-${pm.openedAt || `${pm.x}-${pm.y}`}`}
                        x={pm.x}
                        y={pm.y}
                        isClosing={isPinnedContextMenuClosing}
                        onClose={closePinnedContextMenu}
                        className="w-64"
                    >
                        {/* Pinned App Info Banner */}
                        <div className={`flex items-center justify-between p-1.5 border rounded-xl mb-1.5 ${
                            isBright ? 'bg-black/[0.03] border-black/[0.06]' : 'bg-white/[0.04] border-white/[0.06]'
                        }`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center p-1 flex-shrink-0 ${
                                    isBright ? 'bg-black/[0.04] border-black/10' : 'bg-white/5 border-white/10'
                                }`}>
                                    <img 
                                        src={`https://www.google.com/s2/favicons?sz=64&domain=${pin.domain}`} 
                                        alt="" 
                                        className="w-3.5 h-3.5 rounded-sm object-contain"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-xs font-semibold truncate max-w-[120px] ${
                                        isBright ? 'text-zinc-900' : 'text-white'
                                    }`}>
                                        {pin.title || pin.domain || 'Pinned App'}
                                    </span>
                                    <span className={`text-[9px] font-mono truncate max-w-[120px] ${
                                        isBright ? 'text-zinc-500' : 'text-white/40'
                                    }`}>
                                        {pin.domain}
                                    </span>
                                </div>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                                isBright ? 'bg-black/5 text-zinc-700 border-black/10' : 'bg-white/10 text-white/70 border-white/10'
                            }`}>
                                {pinTabs.length} {pinTabs.length === 1 ? 'tab' : 'tabs'}
                            </span>
                        </div>

                        {/* Open Tabs in Stack List */}
                        {pinTabs.length > 0 && (
                            <div className="flex flex-col gap-1 mb-1">
                                <div className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    isBright ? 'text-zinc-500' : 'text-white/40'
                                }`}>
                                    Active Tabs in Stack
                                </div>
                                <div className="max-h-40 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-0.5">
                                    {pinTabs.map((tab) => {
                                        const isAudible = tab.isAudioPlaying || tab.isAudible;
                                        return (
                                            <div
                                                key={tab.id}
                                                data-menu-item
                                                onClick={() => handleSelectTab(tab)}
                                                className={`group flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                                                    tab.active
                                                        ? (isBright ? 'bg-accent/20 border border-accent/40 text-zinc-900 font-semibold shadow-xs' : 'bg-accent/20 border border-accent/40 text-white shadow-[0_0_12px_rgba(99,102,241,0.2)]')
                                                        : (isBright ? 'bg-black/[0.03] hover:bg-black/[0.07] text-zinc-700 hover:text-zinc-950 border border-transparent' : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white border border-transparent')
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                                    <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                                                        {tab.url && tab.url !== 'about:blank' ? (
                                                            <img 
                                                                src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} 
                                                                alt="" 
                                                                className="w-3 h-3 rounded-sm object-contain"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <Globe size={11} className={isBright ? 'text-zinc-400' : 'text-white/40'} />
                                                        )}
                                                    </div>
                                                    <span className={`truncate max-w-[130px] text-[11px] ${
                                                        isBright ? (tab.active ? 'text-zinc-950 font-semibold' : 'text-zinc-700') : (tab.active ? 'text-white font-medium' : 'text-white/80')
                                                    }`}>
                                                        {tab.title || 'New Tab'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    {isAudible && (
                                                        <Volume2 size={11} className="text-emerald-500 animate-pulse" />
                                                    )}
                                                    {tab.active && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCloseTab(tab.id);
                                                        }}
                                                        className={`p-1 rounded transition opacity-0 group-hover:opacity-100 ${
                                                            isBright ? 'text-zinc-400 hover:text-red-500 hover:bg-black/5' : 'text-white/30 hover:text-red-400 hover:bg-white/10'
                                                        }`}
                                                        title="Close tab"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <MenuDivider />
                            </div>
                        )}

                        {/* Stack Actions */}
                        <MenuItem
                            icon={Plus}
                            label={`New ${pin.title || 'App'} Tab`}
                            accent
                            onClick={handleNewTabForPin}
                        />

                        <MenuItem
                            icon={MonitorPlay}
                            label="Open in Split View"
                            onClick={() => {
                                const newTabId = `t-${Date.now()}`;
                                useTabStore.getState().addTab({
                                    id: newTabId,
                                    title: pin.title || 'Pinned App',
                                    url: pinUrl,
                                    active: false,
                                    folderId: null
                                });
                                useUIStore.getState().toggleSplitView(newTabId);
                                closePinnedContextMenu();
                            }}
                        />

                        <MenuItem
                            icon={Copy}
                            label="Copy App URL"
                            onClick={() => {
                                if (pinUrl) {
                                    navigator.clipboard.writeText(pinUrl);
                                    showToast('App URL copied');
                                }
                                closePinnedContextMenu();
                            }}
                        />

                        <MenuDivider />

                        {pinTabs.length > 1 && (
                            <MenuItem
                                icon={Trash2}
                                label={`Close All in Stack (${pinTabs.length})`}
                                danger
                                onClick={handleCloseAllInStack}
                            />
                        )}

                        <MenuItem
                            icon={Minus}
                            label="Unpin from Bar"
                            danger
                            onClick={() => {
                                handleUnpinTab(pin);
                                closePinnedContextMenu();
                            }}
                        />
                    </MenuContainer>
                );
            })()}

            {/* ========================================================================= */}
            {/* 4. FOLDER CONTEXT MENU */}
            {/* ========================================================================= */}
            {(folderContextMenu || isFolderContextMenuClosing) && (() => {
                const fm = folderContextMenu || {};
                const folder = fm.folder || {};
                const spaceType = fm.spaceType || useTabStore.getState().activeSpace;

                return (
                    <MenuContainer
                        key={`folder-${fm.openedAt || `${fm.x}-${fm.y}`}`}
                        x={fm.x}
                        y={fm.y}
                        isClosing={isFolderContextMenuClosing}
                        onClose={closeFolderContextMenu}
                        className="w-56"
                    >
                        <MenuSectionHeader>
                            {folder.name || 'Folder'}
                        </MenuSectionHeader>

                        <MenuItem
                            icon={Plus}
                            label="New Tab in Folder"
                            onClick={() => {
                                useTabStore.getState().addTabToFolder(folder.id, spaceType);
                                closeFolderContextMenu();
                            }}
                        />
                        <MenuItem
                            icon={Pencil}
                            label="Rename Folder"
                            onClick={() => {
                                closeFolderContextMenu();
                                useTabStore.getState().setRenamingFolderId(folder.id);
                            }}
                        />

                        <MenuDivider />

                        <MenuItem
                            icon={Layers}
                            label="Close All Tabs in Folder"
                            danger
                            onClick={() => {
                                useTabStore.getState().closeAllTabsInFolder(folder.id, spaceType);
                                closeFolderContextMenu();
                            }}
                        />
                        <MenuItem
                            icon={Trash2}
                            label="Delete Folder"
                            danger
                            onClick={() => {
                                closeFolderContextMenu();
                                useTabStore.getState().deleteFolder(folder.id);
                                showToast('Folder deleted');
                            }}
                        />
                    </MenuContainer>
                );
            })()}

            {/* ========================================================================= */}
            {/* 5. TOP BAR / OMNIBOX CONTEXT MENU */}
            {/* ========================================================================= */}
            {(topBarContextMenu || isTopBarContextMenuClosing) && (() => {
                const tbm = topBarContextMenu || {};
                const url = tbm.url || useUIStore.getState().currentUrl || '';
                const wv = getTargetWebview(tbm.tabId);

                return (
                    <MenuContainer
                        key={`topbar-${tbm.openedAt || `${tbm.x}-${tbm.y}`}`}
                        x={tbm.x}
                        y={tbm.y}
                        isClosing={isTopBarContextMenuClosing}
                        onClose={closeTopBarContextMenu}
                        className="w-56"
                    >
                        <MenuSectionHeader>
                            Address Bar
                        </MenuSectionHeader>

                        <MenuItem
                            icon={Copy}
                            label="Copy Current URL"
                            shortcut="Ctrl+C"
                            onClick={() => {
                                if (url) {
                                    navigator.clipboard.writeText(url);
                                    showToast('URL copied to clipboard');
                                }
                                closeTopBarContextMenu();
                            }}
                        />
                        <MenuItem
                            icon={CornerDownLeft}
                            label="Paste & Go"
                            accent
                            onClick={async () => {
                                await handlePasteAndGo();
                                closeTopBarContextMenu();
                            }}
                        />
                        <MenuItem
                            icon={RefreshCw}
                            label="Hard Reload (Bypass Cache)"
                            shortcut="Ctrl+Shift+R"
                            onClick={() => {
                                if (wv && typeof wv.reloadIgnoringCache === 'function') {
                                    wv.reloadIgnoringCache();
                                } else if (wv && typeof wv.reload === 'function') {
                                    wv.reload();
                                }
                                showToast('Reloading without cache...');
                                closeTopBarContextMenu();
                            }}
                        />
                        <MenuItem
                            icon={BookOpen}
                            label="Toggle Reader Mode"
                            shortcut="Ctrl+Alt+R"
                            onClick={() => {
                                useUIStore.getState().toggleReaderMode();
                                closeTopBarContextMenu();
                            }}
                        />

                        <MenuDivider />

                        <MenuItem
                            icon={Terminal}
                            label="Inspect Page"
                            onClick={() => {
                                if (window.electronAPI?.openDevTools) {
                                    window.electronAPI.openDevTools();
                                }
                                closeTopBarContextMenu();
                            }}
                        />
                    </MenuContainer>
                );
            })()}

            {/* ========================================================================= */}
            {/* 6. TOOL HUB CONTEXT MENU (DOWNLOADS, NOTES, AI CHAT) */}
            {/* ========================================================================= */}
            {(toolHubContextMenu || isToolHubContextMenuClosing) && (() => {
                const thm = toolHubContextMenu || {};
                const item = thm.item || {};
                const type = thm.type; // 'download' | 'note' | 'ai-chat'

                return (
                    <MenuContainer
                        key={`toolhub-${thm.openedAt || `${thm.x}-${thm.y}`}`}
                        x={thm.x}
                        y={thm.y}
                        isClosing={isToolHubContextMenuClosing}
                        onClose={closeToolHubContextMenu}
                        className="w-56"
                    >
                        {type === 'download' && (
                            <>
                                <MenuSectionHeader>
                                    {item.filename || 'Download'}
                                </MenuSectionHeader>
                                {item.savePath && (
                                    <>
                                        <MenuItem
                                            icon={ExternalLink}
                                            label="Open File"
                                            onClick={() => {
                                                if (window.electronAPI?.openFile) {
                                                    window.electronAPI.openFile(item.savePath);
                                                }
                                                closeToolHubContextMenu();
                                            }}
                                        />
                                        <MenuItem
                                            icon={FolderOpen}
                                            label="Show in Folder"
                                            onClick={() => {
                                                if (window.electronAPI?.showItemInFolder) {
                                                    window.electronAPI.showItemInFolder(item.savePath);
                                                }
                                                closeToolHubContextMenu();
                                            }}
                                        />
                                    </>
                                )}
                                {item.url && (
                                    <MenuItem
                                        icon={Copy}
                                        label="Copy Download Link"
                                        onClick={() => {
                                            navigator.clipboard.writeText(item.url);
                                            showToast('Download link copied');
                                            closeToolHubContextMenu();
                                        }}
                                    />
                                )}
                                <MenuDivider />
                                <MenuItem
                                    icon={Trash2}
                                    label="Remove from List"
                                    danger
                                    onClick={() => {
                                        useUIStore.getState().removeDownload?.(item.id);
                                        closeToolHubContextMenu();
                                    }}
                                />
                            </>
                        )}

                        {type === 'note' && (
                            <>
                                <MenuSectionHeader>
                                    {item.title || item.domain || 'Web Note'}
                                </MenuSectionHeader>
                                <MenuItem
                                    icon={Copy}
                                    label="Copy Note Text"
                                    onClick={() => {
                                        const noteText = item.note || item.text || '';
                                        if (noteText) {
                                            navigator.clipboard.writeText(noteText);
                                            showToast('Note copied');
                                        }
                                        closeToolHubContextMenu();
                                    }}
                                />
                                {item.text && item.note && (
                                    <MenuItem
                                        icon={Copy}
                                        label="Copy Highlighted Passage"
                                        onClick={() => {
                                            navigator.clipboard.writeText(item.text);
                                            showToast('Highlighted passage copied');
                                            closeToolHubContextMenu();
                                        }}
                                    />
                                )}
                                <MenuDivider />
                                <MenuItem
                                    icon={Trash2}
                                    label="Delete Note"
                                    danger
                                    onClick={() => {
                                        useAnnotationStore.getState().removeAnnotation(item.id);
                                        showToast('Note deleted');
                                        closeToolHubContextMenu();
                                    }}
                                />
                            </>
                        )}

                        {type === 'ai-chat' && (
                            <>
                                <MenuSectionHeader>
                                    {item.role === 'ai' ? 'AI Response' : 'User Message'}
                                </MenuSectionHeader>
                                <MenuItem
                                    icon={Copy}
                                    label="Copy Message Markdown"
                                    onClick={() => {
                                        if (item.content) {
                                            navigator.clipboard.writeText(item.content);
                                            showToast('Message copied to clipboard');
                                        }
                                        closeToolHubContextMenu();
                                    }}
                                />
                                <MenuItem
                                    icon={Volume2}
                                    label="Speak Aloud (TTS)"
                                    onClick={() => {
                                        if (item.content && window.speechSynthesis) {
                                            window.speechSynthesis.cancel();
                                            const utter = new SpeechSynthesisUtterance(item.content);
                                            window.speechSynthesis.speak(utter);
                                        }
                                        closeToolHubContextMenu();
                                    }}
                                />
                                <MenuDivider />
                                <MenuItem
                                    icon={Trash2}
                                    label="Delete Message"
                                    danger
                                    onClick={() => {
                                        const ai = useAIStore.getState();
                                        const filtered = ai.chatHistory.filter(m => m !== item);
                                        ai.clearChat();
                                        filtered.forEach(m => ai.addChatMessage(m));
                                        showToast('Message deleted');
                                        closeToolHubContextMenu();
                                    }}
                                />
                            </>
                        )}
                    </MenuContainer>
                );
            })()}
        </ContextMenuThemeContext.Provider>
    );
}
