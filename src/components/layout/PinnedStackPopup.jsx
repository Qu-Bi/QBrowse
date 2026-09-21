import React, { useEffect, useRef } from 'react';
import { X, Plus, Volume2, Globe, Trash2, PinOff } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export const getPinDomain = (pin) => {
    if (!pin || !pin.domain) return '';
    return pin.domain.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '');
};

export const isTabForPin = (tab, pin) => {
    if (!tab || !pin) return false;
    if (tab.pinnedId === pin.id) return true;
    if (!tab.url || typeof tab.url !== 'string') return false;
    const domain = getPinDomain(pin);
    if (!domain) return false;
    return tab.url.toLowerCase().includes(domain);
};

export default function PinnedStackPopup() {
    const activePinnedStack = useUIStore(state => state.activePinnedStack);
    const closePinnedStack = useUIStore(state => state.closePinnedStack);
    const setCurrentUrl = useUIStore(state => state.setCurrentUrl);
    const showToast = useUIStore(state => state.showToast);

    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    const torTabs = useTabStore(state => state.torTabs) || [];

    const setPrivateTabs = useTabStore(state => state.setPrivateTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setGhostTabs = useTabStore(state => state.setGhostTabs);
    const setTorTabs = useTabStore(state => state.setTorTabs);

    const handleCloseTab = useTabStore(state => state.handleCloseTab);
    const handleUnpinTab = useTabStore(state => state.handleUnpinTab);
    const addTab = useTabStore(state => state.addTab);

    const popupRef = useRef(null);

    // Escape listener
    useEffect(() => {
        if (!activePinnedStack) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closePinnedStack();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [activePinnedStack, closePinnedStack]);

    if (!activePinnedStack || !activePinnedStack.pin) {
        return null;
    }

    const { pin, rect } = activePinnedStack;

    // Get current space tabs
    const currentTabs = activeSpace === 'personal' ? privateTabs : 
                       (activeSpace === 'work' ? workTabs : 
                       (activeSpace === 'ghost' ? ghostTabs : torTabs));

    const setTabs = activeSpace === 'personal' ? setPrivateTabs : 
                   (activeSpace === 'work' ? setWorkTabs : 
                   (activeSpace === 'ghost' ? setGhostTabs : setTorTabs));

    const pinTabs = currentTabs.filter(t => isTabForPin(t, pin));

    // Calculate position anchored to the pin button in sidebar
    let top = 100;
    let left = 270;
    if (rect) {
        top = Math.max(16, Math.min(rect.top - 8, window.innerHeight - 390));
        left = Math.min(rect.right + 12, window.innerWidth - 340);
    }

    const handleSelectTab = (tab) => {
        setTabs(currentTabs.map(t => ({ 
            ...t, 
            active: t.id === tab.id,
            suspended: t.id === tab.id ? false : t.suspended,
            lastActiveAt: t.id === tab.id ? Date.now() : t.lastActiveAt
        })));
        setCurrentUrl(tab.url || '');
        closePinnedStack();

        // Focus webview
        setTimeout(() => {
            const wv = window.qbrowseWebviews ? window.qbrowseWebviews[tab.id] : null;
            if (wv && typeof wv.focus === 'function') {
                try { wv.focus(); } catch (_) {}
            }
        }, 30);
    };

    const handleNewTabForPin = () => {
        const targetUrl = pin.domain.startsWith('http') ? pin.domain : `https://${pin.domain}`;
        addTab({
            id: `t-${Date.now()}`,
            pinnedId: pin.id,
            title: pin.title,
            url: targetUrl,
            active: true,
            folderId: null
        });
        closePinnedStack();
    };

    const handleCloseAllInStack = () => {
        pinTabs.forEach(t => handleCloseTab(t.id));
        showToast(`Closed ${pinTabs.length} tabs for ${pin.title}`);
        closePinnedStack();
    };

    const handleUnpin = () => {
        handleUnpinTab(pin);
        closePinnedStack();
    };

    return (
        <>
            {/* Backdrop click-catcher */}
            <div 
                className="fixed inset-0 z-[64990] bg-black/20 backdrop-blur-[2px] transition-opacity"
                onClick={closePinnedStack}
            />

            {/* Floating Stack Popup Picker */}
            <div 
                ref={popupRef}
                className="fixed z-[65000] w-[320px] bg-[#121217]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.4)] flex flex-col p-3 gap-2.5 animate-pop-in select-none"
                style={{ top: `${top}px`, left: `${left}px` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header: Service Info & Actions */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1 flex-shrink-0 shadow-inner">
                            <img 
                                src={`https://www.google.com/s2/favicons?sz=64&domain=${pin.domain}`} 
                                alt="" 
                                className="w-4 h-4 rounded-sm object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-semibold text-xs truncate max-w-[130px]">{pin.title}</h3>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                                    {pinTabs.length} {pinTabs.length === 1 ? 'tab' : 'tabs'}
                                </span>
                            </div>
                            <span className="text-[10px] text-white/40 font-mono truncate">{pin.domain}</span>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-1">
                        {pinTabs.length > 1 && (
                            <button
                                onClick={handleCloseAllInStack}
                                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition"
                                title={`Close all ${pinTabs.length} tabs`}
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                        <button
                            onClick={handleUnpin}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                            title="Unpin service"
                        >
                            <PinOff size={13} />
                        </button>
                        <button
                            onClick={closePinnedStack}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                            title="Close picker (Esc)"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Tabs List */}
                <div className="max-h-60 overflow-y-auto hide-scroll flex flex-col gap-1 pr-0.5">
                    {pinTabs.length === 0 ? (
                        <div className="py-6 flex flex-col items-center justify-center text-center gap-1.5 text-white/40">
                            <Globe size={22} className="opacity-40 mb-1" />
                            <span className="text-xs font-medium text-white/70">No open tabs</span>
                            <span className="text-[10px] text-white/40 max-w-[200px]">Click below to launch an instance of {pin.title}</span>
                        </div>
                    ) : (
                        pinTabs.map((tab) => {
                            const isAudible = tab.isAudioPlaying || tab.isAudible;
                            return (
                                <div
                                    key={tab.id}
                                    onClick={() => handleSelectTab(tab)}
                                    className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                        tab.active 
                                            ? 'bg-accent/20 border-accent/40 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/80 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                            {tab.url && tab.url !== 'about:blank' ? (
                                                <img 
                                                    src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} 
                                                    alt="" 
                                                    className="w-3.5 h-3.5 rounded-sm object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <Globe size={13} className="text-white/40" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-medium truncate max-w-[190px]">
                                                {tab.title || 'New Tab'}
                                            </span>
                                            {tab.url && (
                                                <span className="text-[9px] font-mono text-white/40 truncate max-w-[190px]">
                                                    {tab.url.replace(/^https?:\/\//i, '')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Status / Actions */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {isAudible && (
                                            <Volume2 size={12} className="text-emerald-400 animate-pulse flex-shrink-0" />
                                        )}
                                        {tab.active && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)] flex-shrink-0" />
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCloseTab(tab.id);
                                            }}
                                            className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-white/10 transition opacity-60 group-hover:opacity-100"
                                            title="Close tab"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer: Open New Tab Action */}
                <div className="pt-1.5 border-t border-white/10">
                    <button
                        onClick={handleNewTabForPin}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-accent/20 hover:text-accent hover:border-accent/40 border border-white/[0.08] text-xs font-medium text-white/80 transition shadow-sm cursor-pointer"
                    >
                        <Plus size={13} />
                        <span>New {pin.title} Tab</span>
                    </button>
                </div>
            </div>
        </>
    );
}
