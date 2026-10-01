import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    X, ArrowRight, ArrowLeft, Check, Layers, Shield, 
    KeyRound, StickyNote, Command, Sparkles, Compass, CheckCircle2,
    MousePointerClick, Columns, ShieldCheck, Moon
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

const TOUR_STEPS = [
    {
        id: 'spaces',
        targetId: 'tour-spaces-container',
        featureSelector: null,
        title: 'Multi-Space Isolation',
        icon: Layers,
        badge: 'Workspaces',
        description: 'Keep your workflows cleanly separated. Each workspace (Personal, Work, Ghost, Tor) maintains its own completely isolated logins, cookies, and tabs so work never bleeds into personal browsing.',
        missionInstruction: 'Click the "Work" workspace in the sidebar switcher or press Ctrl+2',
        missionSuccess: 'Workspace switched! Notice how your tabs, logins, and session cookies are now cleanly isolated.',
        shortcut: 'Ctrl+1, 2, 3'
    },
    {
        id: 'splitview',
        targetId: 'tour-splitview-trigger',
        featureSelector: '#tour-splitview-rightpane',
        title: 'Native Split-Screen View',
        icon: Columns,
        badge: 'Multitasking',
        description: 'Browse two websites simultaneously side-by-side without opening separate windows. Perfect for research, coding with documentation open, or comparing items side-by-side.',
        missionInstruction: 'Click the Split View icon on the top bar or press Ctrl+\\ to toggle dual-pane browsing',
        missionSuccess: 'Split view toggled! Notice the secondary browser window that just appeared on the right.',
        shortcut: 'Ctrl+\\'
    },
    {
        id: 'tor',
        targetId: 'tour-tor-trigger',
        featureSelector: '#popover-tor-container',
        title: 'Built-in Tor Onion Network',
        icon: Shield,
        badge: 'Privacy & Onion',
        description: 'Browse the decentralized web with built-in multi-hop circuit encryption. QBrowse routes your connection through encrypted Tor relays to access .onion domains without third-party proxies.',
        missionInstruction: 'Click the Tor Network icon on the top bar to inspect your active relay circuit',
        missionSuccess: 'Tor circuit open! You can see your multi-hop relay nodes and toggle onion routing at any time.',
        shortcut: 'Top Bar'
    },
    {
        id: 'vault',
        targetId: 'tour-vault-trigger',
        featureSelector: '#popover-vault-container',
        title: 'Zero-Knowledge QVault',
        icon: KeyRound,
        badge: 'Hardware Security',
        description: 'Your master passwords, passkeys, and credit card autofills are encrypted directly on your device using local hardware keys and Windows Hello biometric security. Zero plain text ever leaves your PC.',
        missionInstruction: 'Click the QVault icon on the top bar to open your local QVault',
        missionSuccess: 'QVault opened! All stored credentials are encrypted locally on your hardware with biometric protection.',
        shortcut: 'Top Bar'
    },
    {
        id: 'shield',
        targetId: 'tour-shield-trigger',
        featureSelector: '#popover-adblock-container',
        title: 'Native Ad & Tracker Interceptor',
        icon: ShieldCheck,
        badge: 'Protection',
        description: 'Hardware-accelerated native network blocking stops third-party telemetry, crypto-miners, fingerprinting scripts, and intrusive ads before network packets even reach your computer.',
        missionInstruction: 'Click the Shield icon on the top bar to inspect blocked trackers and protection rules',
        missionSuccess: 'QShield inspector open! You can view live blocked telemetry domains and toggle the interceptor.',
        shortcut: 'Top Bar'
    },
    {
        id: 'darkmode',
        targetId: 'tour-darkmode-trigger',
        featureSelector: '#popover-darkmode-container',
        title: 'Smart Dark Mode & System Themes',
        icon: Moon,
        badge: 'Appearance',
        description: 'Effortlessly tailor your visual aesthetics. Switch between sleek dark themes, crisp light mode, or toggle Smart Invert to force high-contrast dark styles across legacy bright websites.',
        missionInstruction: 'Click the Theme icon on the top bar to inspect appearance options',
        missionSuccess: 'Theme panel opened! You can toggle between dark, light, and smart invert modes.',
        shortcut: 'Top Bar'
    },
    {
        id: 'toolhub',
        targetId: 'tour-toolhub-trigger',
        featureSelector: '#toolhub-drawer-panel',
        title: 'ToolHub & Persistent Sticky Notes',
        icon: StickyNote,
        badge: 'Research & Tools',
        description: 'Highlight any text on any webpage to pin persistent notes that survive page reloads and browser restarts. Also includes an integrated private AI assistant, clean PDF exports, and clipboard history.',
        missionInstruction: 'Click the ToolHub handle on the right screen edge or press Ctrl+J to open the drawer',
        missionSuccess: 'ToolHub is open! You can attach notes to any site, review clips, or chat with your local AI assistant.',
        shortcut: 'Ctrl+J'
    },
    {
        id: 'omnibox',
        targetId: 'tour-omnibox-trigger',
        featureSelector: '#omnibox-palette',
        title: 'Smart Omnibox & Command Palette',
        icon: Command,
        badge: 'Universal Command',
        description: 'A universal launchpad for everything. Search with bang shortcuts (!yt, @github), run power browser commands (>pdf, >clear), calculate math expressions, or interact with your local private AI model.',
        missionInstruction: 'Press Ctrl+K or click the center address bar to command QBrowse',
        missionSuccess: 'Omnibox activated! Type !yt to search YouTube, @github for repos, or > for power-user commands.',
        shortcut: 'Ctrl+K'
    }
];

const areRectsDifferent = (r1, r2) => {
    if (!r1 && !r2) return false;
    if (!r1 || !r2) return true;
    return Math.abs(r1.top - r2.top) > 1 ||
           Math.abs(r1.left - r2.left) > 1 ||
           Math.abs(r1.width - r2.width) > 1 ||
           Math.abs(r1.height - r2.height) > 1;
};

export default function LivingTour({ onExit }) {
    // stage: 'selection' | 'tour'
    const [stage, setStage] = useState('selection');
    const [tourMode, setTourMode] = useState('advanced'); // 'quick' | 'advanced'
    const [currentStep, setCurrentStep] = useState(0);
    const [slideDirection, setSlideDirection] = useState('next'); // 'next' | 'back'

    // Box 1: Primary trigger element
    const [targetRect, setTargetRect] = useState(null);
    // Box 2: Activated feature element (e.g. split view right pane, popovers, omnibox card)
    const [featureRect, setFeatureRect] = useState(null);

    const prevTargetRef = useRef(null);
    const prevFeatureRef = useRef(null);

    // Live App State Hooks to detect real user actions
    const activeSpace = useTabStore(state => state.activeSpace);
    const isSplitView = useUIStore(state => state.isSplitView);
    const activePopover = useUIStore(state => state.activePopover);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const isOmniboxOpen = useUIStore(state => state.isOmniboxOpen);
    const showToast = useUIStore(state => state.showToast);

    const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

    // Helper to dismiss all active popovers, drawers, and reset split view
    const dismissOpenOverlays = () => {
        const ui = useUIStore.getState();
        ui.closePopover();
        ui.closeOmnibox();
        ui.setIsRightPanelOpen(false);
        ui.closeTabMap();
        if (ui.isSplitView) {
            useUIStore.setState({ isSplitView: false, splitRightTabId: null, focusedPane: 'left' });
        }
    };

    // Detect if current step's real mission was achieved by user
    const isMissionCompleted = useMemo(() => {
        switch (currentStep) {
            case 0: // Spaces: switched to work, ghost, or tor
                return activeSpace === 'work' || activeSpace === 'ghost' || activeSpace === 'tor';
            case 1: // Split-Screen: isSplitView is true
                return isSplitView;
            case 2: // Tor: opened Tor popover or tor space
                return activePopover === 'tor' || activeSpace === 'tor';
            case 3: // Vault: opened vault popover
                return activePopover === 'vault';
            case 4: // QShield: opened adblock popover
                return activePopover === 'adblock';
            case 5: // Darkmode Theme: opened darkmode popover
                return activePopover === 'darkmode';
            case 6: // ToolHub: right panel open
                return isRightPanelOpen;
            case 7: // Omnibox: omnibox open
                return isOmniboxOpen;
            default:
                return false;
        }
    }, [currentStep, activeSpace, isSplitView, activePopover, isRightPanelOpen, isOmniboxOpen]);

    // High-performance measurement loop with bounded corner radii
    useEffect(() => {
        if (stage !== 'tour') return;

        const measure = () => {
            // 1. Measure Box 1 (Trigger)
            let nextTarget = null;
            
            // When omnibox or ToolHub drawer is open, transfer highlight exclusively to the opened panel
            const shouldHideTargetForFeature = 
                (step.id === 'omnibox' && isOmniboxOpen) ||
                (step.id === 'toolhub' && isRightPanelOpen);

            if (!shouldHideTargetForFeature) {
                const triggerEl = document.getElementById(step.targetId);
                if (triggerEl) {
                    const r = triggerEl.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        const isSmallButton = r.width <= 48 && r.height <= 48;
                        const pad = isSmallButton ? 3 : 4;
                        const w = r.width + pad * 2;
                        const h = r.height + pad * 2;

                        const cs = window.getComputedStyle(triggerEl);
                        const br = parseFloat(cs.borderRadius) || 0;
                        const isPill = triggerEl.classList.contains('rounded-full') || 
                                       cs.borderRadius.includes('9999px') || 
                                       isSmallButton;
                        
                        // Mathematically bound capsule radius to half the smaller dimension
                        const maxRadius = Math.min(w, h) / 2;
                        const cornerRadius = isPill ? maxRadius : Math.min(Math.round(br) + pad, 20);

                        nextTarget = {
                            top: Math.max(0, r.top - pad),
                            left: Math.max(0, r.left - pad),
                            width: w,
                            height: h,
                            cornerRadius
                        };
                    }
                }
            }

            if (areRectsDifferent(prevTargetRef.current, nextTarget)) {
                prevTargetRef.current = nextTarget;
                setTargetRect(nextTarget);
            }

            // 2. Measure Box 2 (Feature element if active/open)
            let nextFeature = null;
            if (step.featureSelector) {
                const featEl = document.querySelector(step.featureSelector);
                if (featEl) {
                    const r = featEl.getBoundingClientRect();
                    if (r.width > 30 && r.height > 30) {
                        const style = window.getComputedStyle(featEl);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                            const pad = 4;
                            const w = r.width + pad * 2;
                            const h = r.height + pad * 2;
                            const cs = window.getComputedStyle(featEl);
                            const br = parseFloat(cs.borderRadius) || 0;

                            // Feature elements are panels/drawers/modals: corner radius MUST match element's own border-radius, NOT half-width!
                            const maxRadius = Math.min(w, h) / 2;
                            const cornerRadius = Math.min(Math.round(br) || 24, Math.min(32, maxRadius));

                            nextFeature = {
                                top: Math.max(0, r.top - pad),
                                left: Math.max(0, r.left - pad),
                                width: w,
                                height: h,
                                cornerRadius
                            };
                        }
                    }
                }
            }

            if (areRectsDifferent(prevFeatureRef.current, nextFeature)) {
                prevFeatureRef.current = nextFeature;
                setFeatureRect(nextFeature);
            }
        };

        measure();
        const interval = setInterval(measure, 70);
        window.addEventListener('resize', measure);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', measure);
        };
    }, [stage, currentStep, step.targetId, step.featureSelector, isOmniboxOpen, isRightPanelOpen]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleExitTour();
            } else if (stage === 'tour') {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    handleNext();
                } else if (e.key === 'ArrowLeft' && currentStep > 0) {
                    e.preventDefault();
                    handleBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [stage, currentStep]);

    const handleExitTour = () => {
        dismissOpenOverlays();
        localStorage.setItem('qbrowse_tutorial_done', 'true');
        useUIStore.getState().closeModal();
        showToast("Tour closed. Press Ctrl+K anytime to explore QBrowse!");
        if (onExit) onExit();
    };

    const handleStartTour = (selectedMode) => {
        dismissOpenOverlays();
        setTourMode(selectedMode);
        setStage('tour');
        setCurrentStep(0);
        setSlideDirection('next');
    };

    const handleNext = () => {
        dismissOpenOverlays();
        setSlideDirection('next');
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleExitTour();
        }
    };

    const handleStepJump = (idx) => {
        dismissOpenOverlays();
        setSlideDirection(idx >= currentStep ? 'next' : 'back');
        setCurrentStep(idx);
    };

    const handleBack = () => {
        dismissOpenOverlays();
        setSlideDirection('back');
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const StepIcon = step.icon;

    // ==========================================
    // 1. DEDICATED SELECTION SCREEN (Frosted Glass)
    // ==========================================
    if (stage === 'selection') {
        return (
            <div className="fixed inset-0 z-[600000] flex items-center justify-center bg-black/60 backdrop-blur-xl select-none font-sans animate-fade-in p-6">
                <style>{`
                    @keyframes hudCardEnter {
                        0% { opacity: 0; transform: scale(0.95) translateY(24px); }
                        100% { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    .animate-hud-enter {
                        animation: hudCardEnter 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
                    }
                `}</style>
                <div className="max-w-xl w-full rounded-[2.5rem] bg-[#0c0d16]/75 backdrop-blur-3xl border border-white/[0.14] p-8 shadow-[0_35px_100px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.15),inset_0_1px_1px_0_rgba(255,255,255,0.25)] flex flex-col items-center text-center space-y-6 relative overflow-hidden animate-hud-enter">
                    {/* Glassmorphic Ambient Mesh Gradients */}
                    <div className="absolute -top-24 left-1/4 w-80 h-36 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 right-1/4 w-80 h-36 bg-purple-500/12 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent pointer-events-none rounded-[2.5rem]" />
                    <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                    {/* Brand Icon & Welcome */}
                    <div className="flex flex-col items-center space-y-2 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/15 p-2 shadow-lg backdrop-blur-xl flex items-center justify-center">
                            <img src="/icon.png" alt="QBrowse" className="w-full h-full object-contain drop-shadow" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight mt-2">
                            Welcome to QBrowse
                        </h2>
                        <p className="text-white/60 text-xs max-w-md leading-relaxed">
                            Choose how you would like to experience the browser walkthrough:
                        </p>
                    </div>

                    {/* Path Selection Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left relative z-10">
                        {/* PATH A: QUICK OVERVIEW (SIMPLIFIED) */}
                        <div 
                            onClick={() => handleStartTour('quick')}
                            className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-accent/50 cursor-pointer transition-all duration-300 group flex flex-col justify-between space-y-4 hover:scale-102 shadow-lg backdrop-blur-xl"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="w-9 h-9 rounded-xl bg-accent-10 border border-accent-30 flex items-center justify-center text-accent">
                                        <Compass size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                        Overview
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white group-hover:text-accent transition-colors">
                                        Quick Overview
                                    </h4>
                                    <p className="text-xs text-white/50 mt-1 leading-snug">
                                        Swift visual tour of the layout, workspaces, and navigation with clear explanations.
                                    </p>
                                </div>
                            </div>
                            <button className="w-full py-2 bg-white/10 group-hover:bg-accent group-hover:text-black text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 pointer-events-none">
                                <span>Start Quick Tour</span>
                                <ArrowRight size={13} />
                            </button>
                        </div>

                        {/* PATH B: INTERACTIVE GUIDED MISSION (ADVANCED) */}
                        <div 
                            onClick={() => handleStartTour('advanced')}
                            className="p-5 rounded-2xl bg-accent/10 hover:bg-accent/15 border-2 border-accent/40 hover:border-accent cursor-pointer transition-all duration-300 group flex flex-col justify-between space-y-4 hover:scale-102 shadow-xl shadow-accent/10 backdrop-blur-xl"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="w-9 h-9 rounded-xl bg-accent text-black flex items-center justify-center shadow-md">
                                        <Sparkles size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-black px-2 py-0.5 rounded-full shadow-xs">
                                        Interactive
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white group-hover:text-accent transition-colors">
                                        Interactive Masterclass
                                    </h4>
                                    <p className="text-xs text-white/70 mt-1 leading-snug">
                                        Real guided missions that prompt you to use the actual browser UI: click buttons, test Tor, and master shortcuts.
                                    </p>
                                </div>
                            </div>
                            <button className="w-full py-2 bg-accent text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-accent/20 pointer-events-none">
                                <span>Start Interactive Tour</span>
                                <ArrowRight size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Skip / Exit Option */}
                    <button
                        onClick={handleExitTour}
                        className="text-xs text-white/40 hover:text-white/80 transition cursor-pointer pt-1 relative z-10"
                    >
                        Skip Tour and Start Browsing (Esc)
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. HARDWARE-ACCELERATED DUAL-BOX SPOTLIGHT
    // ==========================================
    return (
        <div className="fixed inset-0 z-[600000] pointer-events-none select-none font-sans">
            {/* Scoped CSS animations for fluid sliding and glassmorphic card entrance */}
            <style>{`
                @keyframes hudSlideNext {
                    0% { opacity: 0; transform: translateX(36px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @keyframes hudSlideBack {
                    0% { opacity: 0; transform: translateX(-36px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @keyframes hudCardEnter {
                    0% { opacity: 0; transform: translate(-50%, 30px); }
                    100% { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-hud-slide-next {
                    animation: hudSlideNext 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .animate-hud-slide-back {
                    animation: hudSlideBack 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .animate-hud-card-enter {
                    animation: hudCardEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
            `}</style>

            {/* GPU-Accelerated SVG Mask Overlay (Punches crisp, smooth cut-outs without 9999px box-shadows) */}
            <svg className="fixed inset-0 w-full h-full pointer-events-none z-[600000]">
                <defs>
                    <mask id="qbrowse-spotlight-mask">
                        {/* Solid white = dark everywhere */}
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        
                        {/* Cutout 1: Primary Trigger Element (Disappears cleanly when transferred to feature) */}
                        {targetRect && (
                            <rect
                                x={targetRect.left}
                                y={targetRect.top}
                                width={targetRect.width}
                                height={targetRect.height}
                                rx={targetRect.cornerRadius}
                                ry={targetRect.cornerRadius}
                                fill="black"
                            />
                        )}

                        {/* Cutout 2: Activated Feature Element (when open) */}
                        {featureRect && (
                            <rect
                                x={featureRect.left}
                                y={featureRect.top}
                                width={featureRect.width}
                                height={featureRect.height}
                                rx={featureRect.cornerRadius}
                                ry={featureRect.cornerRadius}
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>

                {/* 50% Dimmed Backdrop */}
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.50)"
                    mask="url(#qbrowse-spotlight-mask)"
                />
            </svg>

            {/* Glowing Accent Border Ring 1: Primary Trigger */}
            {targetRect && (
                <div 
                    className="fixed pointer-events-none border-2 border-accent transition-all duration-300 ease-out z-[600005]"
                    style={{
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius: `${targetRect.cornerRadius}px`,
                        boxShadow: '0 0 16px var(--accent, #d4bc94)'
                    }}
                >
                    <div 
                        className="absolute -inset-1 border border-accent/40 animate-pulse pointer-events-none" 
                        style={{ borderRadius: `${targetRect.cornerRadius + 2}px` }}
                    />
                </div>
            )}

            {/* Glowing Accent Border Ring 2: Activated Feature (e.g. Split Screen, Popover, Drawer, Omnibox) */}
            {featureRect && (
                <div 
                    className="fixed pointer-events-none border-2 border-accent transition-all duration-300 ease-out z-[600005] animate-pop-in"
                    style={{
                        top: featureRect.top,
                        left: featureRect.left,
                        width: featureRect.width,
                        height: featureRect.height,
                        borderRadius: `${featureRect.cornerRadius}px`,
                        boxShadow: '0 0 25px var(--accent, #d4bc94)'
                    }}
                >
                    <div 
                        className="absolute -inset-1 border border-accent/40 animate-pulse pointer-events-none" 
                        style={{ borderRadius: `${featureRect.cornerRadius + 2}px` }}
                    />
                </div>
            )}

            {/* Expansive HUD Card (Frosted Glassmorphism, Specular Reflection, Zero Truncation) */}
            <div 
                id="tour-hud-card"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)'
                }}
                className="z-[600010] pointer-events-auto w-[94vw] max-w-[680px] rounded-[2rem] p-6 backdrop-blur-3xl transition-all duration-300 shadow-[0_30px_90px_rgba(0,0,0,0.75),0_0_1px_1px_rgba(255,255,255,0.15),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_20px_0_rgba(255,255,255,0.02)] border border-white/[0.12] bg-[#0c0d16]/75 text-white flex flex-col gap-4 overflow-hidden animate-hud-card-enter"
            >
                {/* Multi-layered Glassmorphic Ambient Mesh Gradients */}
                <div className="absolute -top-24 left-1/4 w-80 h-36 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 right-1/4 w-80 h-36 bg-purple-500/12 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent pointer-events-none rounded-[2rem]" />
                
                {/* Top Specular Rim Reflection */}
                <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                {/* Top Illuminated Sliding Progress Bar */}
                <div className="absolute top-0 inset-x-0 h-[2.5px] bg-white/[0.08] overflow-hidden rounded-t-[2rem]">
                    <div 
                        className="h-full bg-gradient-to-r from-accent/50 via-accent to-accent-light transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_0_12px_var(--accent,#d4bc94)]"
                        style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Animated Sliding Step Content Container */}
                <div 
                    key={currentStep}
                    className={`flex flex-col gap-3.5 relative z-10 ${
                        slideDirection === 'next' ? 'animate-hud-slide-next' : 'animate-hud-slide-back'
                    }`}
                >
                    {/* Header Row: Icon, Badge, Title, Step Counter, Dismiss */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-accent-10 border border-accent-30 flex items-center justify-center text-accent shrink-0 shadow-xs">
                                <StepIcon size={16} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-0.5 rounded-full border border-accent/20 shrink-0">
                                {step.badge}
                            </span>
                            <h3 className="text-sm font-bold text-white tracking-tight truncate">
                                {step.title}
                            </h3>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] text-white/40 font-mono">
                                Step {currentStep + 1} of {TOUR_STEPS.length}
                            </span>
                            <button 
                                onClick={handleExitTour}
                                className="p-1 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition cursor-pointer"
                                title="Close Tour (Esc)"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Explanatory Body Text: Full comfortable readable text without truncation */}
                    <p className="text-xs text-white/80 leading-relaxed font-normal">
                        {step.description}
                    </p>

                    {/* Real Interactive Guidance Mission Box (Advanced Mode) */}
                    {tourMode === 'advanced' && (
                        <div className={`p-3 rounded-2xl transition-all duration-300 border flex items-center gap-3 backdrop-blur-md ${
                            isMissionCompleted
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 shadow-md shadow-emerald-500/10'
                                : 'bg-white/[0.04] border-white/10 text-white/90 shadow-sm'
                        }`}>
                            <div className="shrink-0">
                                {isMissionCompleted ? (
                                    <CheckCircle2 size={18} className="text-emerald-400 animate-bounce" />
                                ) : (
                                    <MousePointerClick size={18} className="text-accent animate-pulse" />
                                )}
                            </div>
                            <div className="flex-1 text-xs">
                                <p className="font-semibold leading-snug">
                                    {isMissionCompleted ? step.missionSuccess : step.missionInstruction}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Row: Navigation, Dots, Shortcuts */}
                <div className="flex items-center justify-between pt-1 relative z-10">
                    {/* Left: Skip & Back */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExitTour}
                            className="text-xs text-white/40 hover:text-white transition px-2 py-1 rounded cursor-pointer"
                        >
                            Skip Tour
                        </button>

                        {currentStep > 0 && (
                            <button
                                onClick={handleBack}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 font-semibold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer border border-white/5 shadow-xs"
                            >
                                <ArrowLeft size={12} />
                                <span>Back</span>
                            </button>
                        )}
                    </div>

                    {/* Center: Step Dots */}
                    <div className="flex items-center gap-1.5">
                        {TOUR_STEPS.map((_, idx) => (
                            <div 
                                key={idx}
                                onClick={() => handleStepJump(idx)}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                    currentStep === idx 
                                        ? 'w-6 bg-accent' 
                                        : (idx < currentStep ? 'w-2 bg-emerald-400/80' : 'w-2 bg-white/20 hover:bg-white/40')
                                }`}
                            />
                        ))}
                    </div>

                    {/* Right: Next / Finish Button */}
                    <button
                        onClick={handleNext}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                            tourMode === 'advanced' && isMissionCompleted
                                ? 'bg-emerald-400 text-black shadow-emerald-400/25 hover:scale-105 active:scale-95 animate-pulse'
                                : 'bg-accent text-black shadow-accent/25 hover:scale-105 active:scale-95'
                        }`}
                    >
                        <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
                        {currentStep === TOUR_STEPS.length - 1 ? <Check size={13} strokeWidth={3} /> : <ArrowRight size={13} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
