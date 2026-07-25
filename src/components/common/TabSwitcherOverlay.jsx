import React, { useEffect, useState } from 'react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function TabSwitcherOverlay() {
    const showSwitcher = useUIStore(state => state.showSwitcher);
    const setShowSwitcher = useUIStore(state => state.setShowSwitcher);
    const getActiveList = useTabStore(state => state.getActiveList);
    const tabs = getActiveList();

    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (showSwitcher) {
            const activeIdx = tabs.findIndex(t => t.active);
            setSelectedIndex(activeIdx >= 0 ? activeIdx : 0);
        }
    }, [showSwitcher, tabs]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showSwitcher) return;

            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    setSelectedIndex(prev => (prev - 1 + tabs.length) % tabs.length);
                } else {
                    setSelectedIndex(prev => (prev + 1) % tabs.length);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowSwitcher(false);
            }
        };

        const handleKeyUp = (e) => {
            if (!showSwitcher) return;
            if (e.key === 'Control' || e.key === 'Meta') {
                // Activate the selected tab
                const selectedTab = tabs[selectedIndex];
                if (selectedTab) {
                    const activeSpace = useTabStore.getState().activeSpace;
                    const setList = useTabStore.getState().getActiveSetList();
                    setList(prev => prev.map(t => ({ ...t, active: t.id === selectedTab.id })));
                    useUIStore.getState().setCurrentUrl(selectedTab.url || '');
                }
                setShowSwitcher(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [showSwitcher, selectedIndex, tabs, setShowSwitcher]);

    if (!showSwitcher || tabs.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[60000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-pop-in">
            <div className="relative w-full max-w-5xl h-96 flex items-center justify-center" style={{ perspective: '1200px' }}>
                {tabs.map((tab, idx) => {
                    const isActive = idx === selectedIndex;
                    const offset = idx - selectedIndex;
                    const isVisible = Math.abs(offset) <= 2;

                    if (!isVisible && tabs.length > 5) return null;

                    let transform = 'translateZ(-400px) rotateY(0deg) translateX(0)';
                    let opacity = 0;
                    let zIndex = 10;

                    if (isActive) {
                        transform = 'translateZ(100px) rotateY(0deg) translateX(0)';
                        opacity = 1;
                        zIndex = 50;
                    } else if (offset === -1 || (offset > 1 && tabs.length <= 5 && idx === tabs.length - 1)) {
                        transform = 'translateZ(-100px) rotateY(35deg) translateX(-60%)';
                        opacity = 0.7;
                        zIndex = 40;
                    } else if (offset === 1 || (offset < -1 && tabs.length <= 5 && idx === 0)) {
                        transform = 'translateZ(-100px) rotateY(-35deg) translateX(60%)';
                        opacity = 0.7;
                        zIndex = 40;
                    } else if (offset === -2) {
                        transform = 'translateZ(-300px) rotateY(45deg) translateX(-100%)';
                        opacity = 0.3;
                        zIndex = 30;
                    } else if (offset === 2) {
                        transform = 'translateZ(-300px) rotateY(-45deg) translateX(100%)';
                        opacity = 0.3;
                        zIndex = 30;
                    }

                    return (
                        <div
                            key={tab.id}
                            className="absolute w-80 md:w-[400px] aspect-video bg-[#1a1a1c] border border-white/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out"
                            style={{
                                transform,
                                opacity,
                                zIndex,
                                boxShadow: isActive ? '0 0 50px rgba(59, 130, 246, 0.4)' : '0 20px 40px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div className="h-10 bg-black/40 border-b border-white/10 flex items-center px-4 gap-3">
                                {tab.url && tab.url !== 'about:blank' ? (
                                    <img src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} alt="" className="w-5 h-5 rounded" onError={(e) => e.target.style.display='none'} />
                                ) : (
                                    <div className="w-5 h-5 bg-white/10 rounded flex-shrink-0"></div>
                                )}
                                <span className="text-white font-semibold truncate text-sm">{tab.title}</span>
                            </div>
                            <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center p-4">
                                {tab.url && tab.url !== 'about:blank' ? (
                                    <div className="text-white/30 font-mono text-xs text-center break-all">{tab.url}</div>
                                ) : (
                                    <span className="text-white/20 font-medium">New Tab</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
