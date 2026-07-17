import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, Layers, Ghost, Home, Play, WifiOff } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function TabMap() {
    const isTabMapOpen = useUIStore(state => state.isTabMapOpen);
    const isTabMapClosing = useUIStore(state => state.isTabMapClosing);
    const handleCloseTabMap = useUIStore(state => state.closeTabMap);
    const setCurrentUrl = useUIStore(state => state.setCurrentUrl);
    
    const activeSpace = useTabStore(state => state.activeSpace);
    const privateTabs = useTabStore(state => state.privateTabs);
    const workTabs = useTabStore(state => state.workTabs);
    const ghostTabs = useTabStore(state => state.ghostTabs);
    
    const setPrivateTabs = useTabStore(state => state.setPrivateTabs);
    const setWorkTabs = useTabStore(state => state.setWorkTabs);
    const setGhostTabs = useTabStore(state => state.setGhostTabs);
    const handleCloseTab = useTabStore(state => state.handleCloseTab);

    const [globalAngle, setGlobalAngle] = useState(0);
    const requestRef = useRef();
    const isOrbitHoveredRef = useRef(false);
    const speedRef = useRef(0.1);

    useEffect(() => {
        const animate = () => {
            const targetSpeed = isOrbitHoveredRef.current ? 0 : 0.1;
            speedRef.current += (targetSpeed - speedRef.current) * 0.05;
            setGlobalAngle(prev => (prev + speedRef.current) % 360);
            
            requestRef.current = requestAnimationFrame(animate);
        };
        
        if (isTabMapOpen && !isTabMapClosing) {
            requestRef.current = requestAnimationFrame(animate);
        }
        
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isTabMapOpen, isTabMapClosing]);

    if (!isTabMapOpen && !isTabMapClosing) return null;

    const tabMapList = activeSpace === 'personal' ? privateTabs : (activeSpace === 'work' ? workTabs : ghostTabs);
    const tabMapActive = tabMapList.find(t => t.active) || tabMapList[0];
    
    const tabMapInactive = tabMapList.filter(t => t.id !== tabMapActive?.id);
    const MAX_INNER_TABS = 5;
    const innerTabs = tabMapInactive.slice(0, MAX_INNER_TABS);
    const outerTabs = tabMapInactive.slice(MAX_INNER_TABS);

    const renderNodeInterior = (tab, isActive) => (
        <>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)]" style={{ backgroundSize: '12px 12px' }}></div>
        {activeSpace === 'ghost' ? (
            <div className="absolute inset-0 flex items-center justify-center"><Ghost size={isActive ? 64 : 32} className={tab.active ? 'text-[#a855f7]' : 'text-white/20'} strokeWidth={1.5} /></div>
        ) : tab.url === 'youtube.com' ? (
            <div className="absolute inset-0 flex flex-col bg-black">
                <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=400&auto=format&fit=crop" className={`w-full h-full object-cover opacity-60 transition-opacity duration-500 ${isActive ? 'opacity-90' : 'opacity-60 group-hover/card:opacity-80'}`} alt="Video" />
                <div className="absolute inset-0 flex items-center justify-center"><div className={`rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-transform duration-300 ${isActive ? 'w-16 h-16 scale-110' : 'w-10 h-10 group-hover/card:scale-110'}`}><Play size={isActive ? 24 : 16} className="text-white drop-shadow-md ml-1" fill="white" /></div></div>
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20"><div className="h-full bg-red-500 w-[45%]"></div></div>
            </div>
        ) : tab.url === 'qu-os.local' ? (
            <div className={`absolute inset-0 flex flex-col items-center justify-center ${isActive ? 'p-8' : 'p-4'}`}>
                <div className={`w-1/2 bg-white/20 rounded-full mb-6 ${isActive ? 'h-3' : 'h-1.5'}`}></div>
                <div className={`w-full bg-white/5 border border-white/10 rounded-xl mb-3 ${isActive ? 'h-12' : 'h-6'}`}></div>
                <div className={`w-full bg-white/5 border border-white/10 rounded-xl flex justify-end items-center pr-3 ${isActive ? 'h-12' : 'h-6'}`}><div className={`bg-blue-500/30 rounded-md ${isActive ? 'w-6 h-6' : 'w-3 h-3'}`}></div></div>
            </div>
        ) : tab.thumbnail ? (
            <div className="absolute inset-0">
                <img src={tab.thumbnail} className="w-full h-full object-cover opacity-90 transition-opacity duration-500 group-hover/card:opacity-100" />
            </div>
        ) : (
            <div className="absolute inset-0 flex items-center justify-center">
                {tab.url ? <img src={`https://www.google.com/s2/favicons?sz=128&domain=${tab.url}`} className={`rounded-2xl drop-shadow-md transition-opacity duration-500 ${isActive ? 'w-20 h-20 opacity-90' : 'w-10 h-10 opacity-40 group-hover/card:opacity-80'}`} alt="icon" /> : <Globe size={isActive ? 64 : 32} className="text-white/20" />}
            </div>
        )}
        </>
    );

    const renderOrbitTrack = (tabs, radiusClamp, speedMod, delayOffset = 0) => {
        if(tabs.length === 0) return null;
        return (
        <div className="absolute top-1/2 left-1/2 w-0 h-0 z-20 pointer-events-none" style={{ transformStyle: 'preserve-3d', '--global-angle': globalAngle, transform: `rotateX(55deg) rotateZ(calc(var(--global-angle) * ${speedMod} * 1deg))` }}>
            {tabs.map((tab, i) => {
                const angleDeg = (i / tabs.length) * 360 + delayOffset;
                const wobbleX = Math.sin(i * 13) * 15; 
                const wobbleY = Math.cos(i * 7) * 20;

                return (
                <React.Fragment key={tab.id}>
                    <div className="absolute bottom-0 left-0 w-px bg-gradient-to-t from-accent/40 to-transparent origin-bottom opacity-0"
                        style={{ height: radiusClamp, transform: `rotateZ(${angleDeg}deg) translateX(-0.5px)`, animation: `cinematic-fade 1.5s ease-out forwards ${i * 0.1}s` }}></div>

                    <div className="absolute top-0 left-0 w-0 h-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', transform: `rotateZ(${angleDeg}deg) translateY(calc(-1 * ${radiusClamp}))` }}>
                        <div className="absolute top-0 left-0 w-0 h-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', transform: `rotateZ(calc(var(--global-angle) * -${speedMod} * 1deg))` }}>
                        <div className="absolute top-0 left-0 w-0 h-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', transform: `rotateZ(-${angleDeg}deg) rotateX(-55deg) translate3d(${wobbleX}px, ${wobbleY}px, 0)` }}>

                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group/card cursor-pointer pointer-events-auto opacity-0"
                                style={{ animation: `cinematic-enter 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards ${i * 0.08}s` }}
                                onMouseEnter={() => { isOrbitHoveredRef.current = true; }}
                                onMouseLeave={() => { isOrbitHoveredRef.current = false; }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const setList = activeSpace === 'personal' ? setPrivateTabs : (activeSpace === 'work' ? setWorkTabs : setGhostTabs);
                                    setList(tabMapList.map(t => ({ ...t, active: t.id === tab.id })));
                                    setCurrentUrl(tab.url || 'New Tab');
                                    handleCloseTabMap();
                                }}
                            >
                                <button onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }} className="absolute -top-4 -right-4 z-[80000] w-8 h-8 rounded-full bg-red-500/90 backdrop-blur-md hover:bg-red-400 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 shadow-xl border border-white/20">
                                <X size={14} strokeWidth={3} />
                                </button>
                                
                                <div className="w-[200px] md:w-[260px] aspect-video rounded-[1.5rem] md:rounded-[2rem] bg-black/60 shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden relative backdrop-blur-xl border border-white/10 group-hover/card:border-white/30 group-hover/card:bg-[#0a0a0c] group-hover/card:shadow-[0_60px_120px_rgba(0,0,0,0.9)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu group-hover/card:scale-[1.04]">
                                    {renderNodeInterior(tab, false)}
                                    <div className="absolute inset-0 bg-black/40 group-hover/card:bg-transparent transition-colors duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"></div>
                                    
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30 flex items-center gap-3">
                                    {tab.url && activeSpace !== 'ghost' && <img src={`https://www.google.com/s2/favicons?sz=64&domain=${tab.url}`} className="w-5 h-5 rounded-md shadow-sm opacity-50 grayscale group-hover/card:opacity-100 group-hover/card:grayscale-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" onError={(e) => e.target.style.display='none'} />}
                                    <div className="flex flex-col truncate w-full">
                                        <span className="text-xs md:text-sm font-bold text-white/70 group-hover/card:text-white truncate transition-colors duration-700">{tab.title}</span>
                                    </div>
                                    </div>
                                </div>
                            </div>

                            </div>
                        </div>
                    </div>
                </React.Fragment>
                );
            })}
        </div>
        );
    };

    return (
        <div className={`fixed inset-0 z-[80000] flex flex-col bg-[#050508]/85 backdrop-blur-3xl overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isTabMapClosing ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'}`} onClick={handleCloseTabMap}>
        
        <style>{`
            @keyframes organic-float { 
                0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(0deg); } 
                33% { transform: translate(-50%, -50%) translateY(-8px) rotate(0.8deg); } 
                66% { transform: translate(-50%, -50%) translateY(5px) rotate(-0.5deg); } 
            }
            .animate-organic { animation: organic-float 14s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
            @keyframes cinematic-enter {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotateX(-15deg); filter: blur(20px); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotateX(0deg); filter: blur(0px); }
            }
            @keyframes cinematic-fade {
                0% { opacity: 0; }
                100% { opacity: 0.3; }
            }
        `}</style>

        <div className="absolute top-0 left-0 right-0 px-8 md:px-16 py-8 md:py-12 flex justify-between items-start z-[90000] pointer-events-none animate-slide-down">
            <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 drop-shadow-lg">Mission Control</h1>
            <p className="text-xs md:text-sm text-white/50 font-bold uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
                {activeSpace === 'personal' ? <Home size={16} className="text-accent" /> : activeSpace === 'work' ? <Layers size={16} className="text-accent" /> : <Ghost size={16} className="text-[#a855f7]" />}
                {activeSpace === 'personal' ? 'Personal Space' : activeSpace === 'work' ? 'Work Space' : 'Ghost Session'}
            </p>
            </div>
            <button onClick={handleCloseTabMap} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-auto border border-white/10"><X size={20} /></button>
        </div>

        <div id="orbit-system" className="relative w-full h-full animate-pop-in pointer-events-none" style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 flex items-center justify-center" style={{ transform: 'rotateX(55deg)' }}>
                <div className="w-[80vw] h-[80vw] max-w-[1200px] max-h-[1200px] rounded-full border border-white/5 opacity-0" style={{ animation: 'cinematic-fade 1.5s ease-out forwards 0.2s' }}></div>
                <div className="absolute w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full border border-white/5 border-dashed opacity-0" style={{ animation: 'cinematic-fade 1.5s ease-out forwards 0.4s' }}></div>
            </div>

            {renderOrbitTrack(innerTabs, 'clamp(280px, 24vw, 420px)', 0.9, 0)}
            {renderOrbitTrack(outerTabs, 'clamp(450px, 36vw, 680px)', 0.5, 45)}

            {tabMapActive && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60000] cursor-pointer group pointer-events-auto opacity-0"
                    style={{ animation: 'cinematic-enter 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
                    onMouseEnter={() => { isOrbitHoveredRef.current = true; }}
                    onMouseLeave={() => { isOrbitHoveredRef.current = false; }}
                    onClick={(e) => { e.stopPropagation(); handleCloseTabMap(); }}
                >
                    <div className="w-[280px] md:w-[380px] aspect-video rounded-[2.5rem] bg-[#0a0a0c] border border-accent/40 shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-hidden relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] group-hover:shadow-[0_60px_200px_var(--accent-40)] group-hover:border-accent/80">
                    {renderNodeInterior(tabMapActive, true)}
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-30 flex items-center gap-4 border-t border-accent/20">
                        {tabMapActive.url && activeSpace !== 'ghost' && <img src={`https://www.google.com/s2/favicons?sz=64&domain=${tabMapActive.url}`} className="w-8 h-8 rounded-xl shadow-md transition-all duration-700" onError={(e) => e.target.style.display='none'} />}
                        <div className="flex flex-col truncate w-full">
                            <span className="text-xl md:text-2xl font-black text-white truncate drop-shadow-md transition-colors duration-700">{tabMapActive.title}</span>
                            <span className="text-[10px] md:text-xs text-accent font-mono uppercase tracking-widest truncate flex items-center gap-2">
                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_var(--accent)]"></div> Active Core
                            </span>
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
