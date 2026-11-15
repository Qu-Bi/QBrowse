import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { isVideoWallpaper, isGifWallpaper, isLiveWallpaper } from '../../utils/wallpaperHelpers';
import { loadGifData, computeGifTransitionTimings, startGifLoopTransitions } from '../../utils/gifParser';

const DEFAULT_STOCK_WALLPAPER = 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2564&auto=format&fit=crop';

/**
 * WallpaperEngine handles rendering, crossfading, pausing, and hardware optimization
 * for static images, animated GIFs, and looping video wallpapers (MP4/WebM).
 * Supports customizable live wallpaper loop transitions (Videos & Animated GIFs):
 * - 'crossfade' (Dual-player/Dual-slot A/B roll seamless cross-dissolve)
 * - 'dip' (Smooth ambient dip to black with frame-0 reset and return)
 * - 'cut' / 'loop' (Native instant restart loop)
 * Strictly guarantees ZERO residual stacking of wallpaper elements.
 */
function WallpaperEngine() {
    const customWallpaper = useUIStore(state => state.settings?.customWallpaper);
    const wallpaperDimming = useUIStore(state => state.settings?.wallpaperDimming ?? 25);
    const wallpaperBlur = useUIStore(state => state.settings?.wallpaperBlur ?? 24);
    const blurWallpaper = useUIStore(state => state.settings?.blurWallpaper ?? false);
    const pauseWallpaperInBackground = useUIStore(state => state.settings?.pauseWallpaperInBackground ?? true);
    const pauseWallpaperOnWebview = useUIStore(state => state.settings?.pauseWallpaperOnWebview ?? false);
    const pauseWallpaperInEcoMode = useUIStore(state => state.settings?.pauseWallpaperInEcoMode ?? true);
    const wallpaperVideoLoopMode = useUIStore(state => state.settings?.wallpaperVideoLoopMode || 'crossfade');
    const wallpaperVideoCrossfadeDuration = useUIStore(state => state.settings?.wallpaperVideoCrossfadeDuration ?? 1.2);

    const theme = useUIStore(state => state.theme);
    const isBooting = useUIStore(state => state.isBooting);
    const activeModal = useUIStore(state => state.activeModal);
    const isReaderOpen = useUIStore(state => state.isReaderOpen);
    const isFullscreen = useUIStore((s) => s.isFullscreen);
    const htmlFullscreenTabId = useUIStore((s) => s.htmlFullscreenTabId);
    const isSplitView = useUIStore(state => state.isSplitView);
    const splitRightTabId = useUIStore(state => state.splitRightTabId);
    const activeSpace = useTabStore(state => state.activeSpace);
    const activeTabUrl = useTabStore(state => state.getActiveTab?.()?.url || '');
    const splitRightTabUrl = useTabStore(state => {
        if (!isSplitView || !splitRightTabId) return '';
        const list = state.getActiveList?.();
        return Array.isArray(list) ? (list.find(t => t.id === splitRightTabId)?.url || '') : '';
    });
    const a11yReducedMotion = useUIStore(state => state.settings?.a11yReducedMotion);
    const isSystemReducedMotion = useUIStore(state => state.isSystemReducedMotion);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const isReducedMotion = !!(a11yReducedMotion || isSystemReducedMotion);
    const isWebUrl = (url) => Boolean(url && url !== '' && url !== 'about:blank');
    const hasWebUrl = isWebUrl(activeTabUrl) || (isSplitView && isWebUrl(splitRightTabUrl));

    const activeWallpaper = customWallpaper || DEFAULT_STOCK_WALLPAPER;

    const [currentUrl, setCurrentUrl] = useState(activeWallpaper);
    const [exitingUrl, setExitingUrl] = useState(null);

    // Pausing states for live media (Videos & GIFs)
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isWebviewFocused, setIsWebviewFocused] = useState(
        () => hasWebUrl && document.activeElement?.tagName === 'WEBVIEW'
    );
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);
    const [isEcoMode, setIsEcoMode] = useState(false);

    const hasWebUrlRef = useRef(hasWebUrl);
    hasWebUrlRef.current = hasWebUrl;

    useEffect(() => {
        if (!hasWebUrl) {
            setIsWebviewFocused(false);
        }
    }, [hasWebUrl]);

    // Video Dual-Player (A/B roll) state for smooth cross-dissolve looping
    const [activeVideoSlot, setActiveVideoSlot] = useState('A');
    const [dipPhase, setDipPhase] = useState('idle'); // 'idle' | 'out' | 'in'
    const [hasFrozenGif, setHasFrozenGif] = useState(false);

    // GIF seamless transition state
    const [gifData, setGifData] = useState(null); // { duration, frames, buffer, singlePlayBuffer }
    const [activeGifSlot, setActiveGifSlot] = useState('A');
    const [gifSlotASrc, setGifSlotASrc] = useState(null);
    const [gifSlotBSrc, setGifSlotBSrc] = useState(null);
    const [isGifCrossfading, setIsGifCrossfading] = useState(false);
    const [gifDipOverlayOpacity, setGifDipOverlayOpacity] = useState(0);

    const playerRefA = useRef(null);
    const playerRefB = useRef(null);
    const isCrossfadingRef = useRef(false);
    const isDippingRef = useRef(false);
    const crossfadeTimerRef = useRef(null);
    const dipTimerRef = useRef(null);
    const gifSlotARef = useRef(null);
    const gifSlotBRef = useRef(null);
    const freezeCanvasRef = useRef(null);
    const transitionGenRef = useRef(0);

    const crossfadeDuration = Math.max(0.4, Math.min(2.5, Number(wallpaperVideoCrossfadeDuration) || 1.2));
    const {
        effectiveFadeMs: gifCrossfadeMs,
        halfDipMs: gifDipHalfMs
    } = computeGifTransitionTimings(gifData?.duration, crossfadeDuration);

    // Track window focus/blur, webview focus, and visibility for power & GPU optimization
    useEffect(() => {
        let blurCheckTimer = null;

        const syncWebviewFocusState = () => {
            const onWebview = hasWebUrlRef.current && document.activeElement?.tagName === 'WEBVIEW';
            setIsWebviewFocused(onWebview);
            return onWebview;
        };

        const handleFocus = () => {
            if (blurCheckTimer) {
                clearTimeout(blurCheckTimer);
                blurCheckTimer = null;
            }
            setIsWindowFocused(true);
            syncWebviewFocusState();
        };

        const handleBlur = () => {
            if (blurCheckTimer) clearTimeout(blurCheckTimer);
            blurCheckTimer = setTimeout(() => {
                blurCheckTimer = null;
                if (hasWebUrlRef.current && document.activeElement?.tagName === 'WEBVIEW') {
                    // Clicking an Electron <webview> blurs the outer renderer window while remaining in QBrowse
                    setIsWebviewFocused(true);
                    setIsWindowFocused(true);
                    return;
                }
                if (!document.hasFocus()) {
                    setIsWindowFocused(false);
                    setIsWebviewFocused(false);
                }
            }, 20);
        };

        const handleFocusIn = (e) => {
            const onWebview = hasWebUrlRef.current && (
                e?.target?.tagName === 'WEBVIEW' ||
                document.activeElement?.tagName === 'WEBVIEW'
            );
            setIsWebviewFocused(onWebview);
            if (!onWebview) {
                setIsWindowFocused(true);
            }
        };

        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (blurCheckTimer) clearTimeout(blurCheckTimer);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Track Eco Mode mutations on the root HTML element
    useEffect(() => {
        const checkEco = () => {
            setIsEcoMode(document.documentElement.classList.contains('eco-mode'));
        };
        checkEco();

        const observer = new MutationObserver(checkEco);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Calculate whether live media should be paused to preserve CPU, battery, and GPU
    // Pauses when unfocused, optionally when a webview is focused, in background, in Eco Mode, in F11/HTML fullscreen, when reduced motion is enabled, or when Settings/modals/Reader Mode are open
    const shouldPauseLiveMedia = Boolean(
        !isDocumentVisible ||
        (!isWindowFocused && pauseWallpaperInBackground) ||
        (isWebviewFocused && pauseWallpaperOnWebview) ||
        (isEcoMode && pauseWallpaperInEcoMode) ||
        Boolean(isFullscreen) ||
        Boolean(htmlFullscreenTabId) ||
        Boolean(activeModal) ||
        Boolean(isReaderOpen) ||
        isReducedMotion
    );
    const shouldPauseRef = useRef(shouldPauseLiveMedia);
    shouldPauseRef.current = shouldPauseLiveMedia;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
            if (dipTimerRef.current) clearTimeout(dipTimerRef.current);
        };
    }, []);

    // When loop mode changes, cancel active transition timers and reset transition states
    useEffect(() => {
        if (crossfadeTimerRef.current) {
            clearTimeout(crossfadeTimerRef.current);
            crossfadeTimerRef.current = null;
        }
        if (dipTimerRef.current) {
            clearTimeout(dipTimerRef.current);
            dipTimerRef.current = null;
        }
        isCrossfadingRef.current = false;
        isDippingRef.current = false;
        setDipPhase('idle');
        setActiveGifSlot('A');
        setIsGifCrossfading(false);
        setGifDipOverlayOpacity(0);
    }, [wallpaperVideoLoopMode, currentUrl]);

    // High-fidelity image frame render to canvas preserving cover aspect ratio
    const drawCoverToCanvas = useCallback((img, canvas) => {
        if (!img || !canvas) return false;
        if (!img.complete || !img.naturalWidth || !img.naturalHeight) return false;

        try {
            const w = window.innerWidth;
            const h = window.innerHeight;
            canvas.width = Math.round(w * (window.devicePixelRatio || 1));
            canvas.height = Math.round(h * (window.devicePixelRatio || 1));
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;

            const imgRatio = img.naturalWidth / img.naturalHeight;
            const canvasRatio = canvas.width / canvas.height;
            let dw, dh, dx, dy;

            if (imgRatio > canvasRatio) {
                dh = canvas.height;
                dw = img.naturalWidth * (canvas.height / img.naturalHeight);
                dx = (canvas.width - dw) / 2;
                dy = 0;
            } else {
                dw = canvas.width;
                dh = img.naturalHeight * (canvas.width / img.naturalWidth);
                dx = 0;
                dy = (canvas.height - dh) / 2;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, dx, dy, dw, dh);
            return true;
        } catch (_) {
            return false;
        }
    }, []);

    // High-fidelity GIF frame freeze to offscreen canvas
    const captureGifFrame = useCallback(() => {
        const primaryImg = (wallpaperVideoLoopMode === 'crossfade' && activeGifSlot === 'B')
            ? gifSlotBRef.current
            : gifSlotARef.current;
        const fallbackImg = (primaryImg === gifSlotBRef.current)
            ? gifSlotARef.current
            : gifSlotBRef.current;
        const res = drawCoverToCanvas(primaryImg, freezeCanvasRef.current)
            || drawCoverToCanvas(fallbackImg, freezeCanvasRef.current);
        if (res) setHasFrozenGif(true);
        return res;
    }, [activeGifSlot, drawCoverToCanvas, wallpaperVideoLoopMode]);

    // GIF freezing control via offscreen frame capture to canvas
    useEffect(() => {
        if (!isGifWallpaper(currentUrl)) return;

        if (shouldPauseLiveMedia) {
            captureGifFrame();
        } else {
            setHasFrozenGif(false);
        }
    }, [shouldPauseLiveMedia, currentUrl, captureGifFrame]);

    // Fetch and parse GIF duration and single-play buffer
    useEffect(() => {
        if (!isGifWallpaper(currentUrl)) {
            setGifData(null);
            setGifSlotASrc(null);
            setGifSlotBSrc(null);
            setIsGifCrossfading(false);
            setGifDipOverlayOpacity(0);
            return;
        }

        const clean = currentUrl.split('?')[0].split('#')[0];
        setGifSlotASrc(clean);
        setGifSlotBSrc(null);
        setIsGifCrossfading(false);
        setGifDipOverlayOpacity(0);
        setActiveGifSlot('A');

        let isCancelled = false;

        loadGifData(clean).then(data => {
            if (isCancelled || !data) return;
            setGifData(data);
        });

        return () => { isCancelled = true; };
    }, [currentUrl]);

    // GIF seamless loop transition manager (Cross-Dissolve, Ambient Dip, or Native Loop/Cut)
    useEffect(() => {
        const clean = currentUrl ? currentUrl.split('?')[0].split('#')[0] : null;
        if (
            !isGifWallpaper(currentUrl) ||
            !gifData ||
            shouldPauseLiveMedia ||
            isReducedMotion ||
            (wallpaperVideoLoopMode !== 'dip' && wallpaperVideoLoopMode !== 'crossfade')
        ) {
            setIsGifCrossfading(false);
            setGifDipOverlayOpacity(0);
            setActiveGifSlot('A');
            setGifSlotASrc(clean);
            setGifSlotBSrc(null);
            return;
        }

        return startGifLoopTransitions({
            gifData,
            loopMode: wallpaperVideoLoopMode,
            crossfadeDurationSec: crossfadeDuration,
            getSlotImg: (slot) => (slot === 'A' ? gifSlotARef.current : gifSlotBRef.current),
            setSlotSrc: (slot, src) => (slot === 'A' ? setGifSlotASrc(src) : setGifSlotBSrc(src)),
            setActiveSlot: setActiveGifSlot,
            setCrossfading: setIsGifCrossfading,
            setDipOverlayOpacity: setGifDipOverlayOpacity
        });
    }, [currentUrl, gifData, wallpaperVideoLoopMode, crossfadeDuration, shouldPauseLiveMedia, isReducedMotion]);

    // Wallpaper transition management - strictly prevents layer stacking
    useEffect(() => {
        if (activeWallpaper === currentUrl) return;

        const isNewLive = isLiveWallpaper(activeWallpaper);
        const isOldLive = isLiveWallpaper(currentUrl);

        // Cancel any pending video transition timers
        if (crossfadeTimerRef.current) {
            clearTimeout(crossfadeTimerRef.current);
            crossfadeTimerRef.current = null;
        }
        if (dipTimerRef.current) {
            clearTimeout(dipTimerRef.current);
            dipTimerRef.current = null;
        }

        // Reset video & GIF slots and states
        setActiveVideoSlot('A');
        setActiveGifSlot('A');
        setIsGifCrossfading(false);
        setGifDipOverlayOpacity(0);
        isCrossfadingRef.current = false;
        isDippingRef.current = false;
        setDipPhase('idle');
        setHasFrozenGif(false);

        // If either the new or old wallpaper is live (video or GIF), or if reduced motion is on:
        // IMMEDIATELY swap with zero overlap to prevent multi-decoder lag and GPU congestion.
        if (isNewLive || isOldLive || isReducedMotion || isBooting) {
            setExitingUrl(null);
            setCurrentUrl(activeWallpaper);
            return;
        }

        // For static images: crossfade cleanly and guarantee unmounting of the exiting layer
        const currentGen = ++transitionGenRef.current;
        setExitingUrl(currentUrl);
        setCurrentUrl(activeWallpaper);

        const timer = setTimeout(() => {
            if (transitionGenRef.current === currentGen) {
                setExitingUrl(null);
            }
        }, 550);

        return () => clearTimeout(timer);
    }, [activeWallpaper, currentUrl, isReducedMotion, isBooting]);

    // Video playback control (play/pause synchronization)
    useEffect(() => {
        if (!isVideoWallpaper(currentUrl)) return;

        const pA = playerRefA.current;
        const pB = playerRefB.current;

        if (shouldPauseLiveMedia) {
            if (crossfadeTimerRef.current) {
                clearTimeout(crossfadeTimerRef.current);
                crossfadeTimerRef.current = null;
            }
            if (dipTimerRef.current) {
                clearTimeout(dipTimerRef.current);
                dipTimerRef.current = null;
            }
            isCrossfadingRef.current = false;
            isDippingRef.current = false;
            setDipPhase('idle');
            try { if (pA) pA.pause(); } catch (_) {}
            try { if (pB) pB.pause(); } catch (_) {}
        } else {
            try {
                if (wallpaperVideoLoopMode === 'crossfade') {
                    const activePlayer = activeVideoSlot === 'A' ? pA : pB;
                    const standbyPlayer = activeVideoSlot === 'A' ? pB : pA;
                    if (standbyPlayer && !isCrossfadingRef.current) {
                        try {
                            standbyPlayer.pause();
                            standbyPlayer.currentTime = 0;
                        } catch (_) {}
                    }
                    if (activePlayer) {
                        const prom = activePlayer.play();
                        if (prom) prom.catch(() => {});
                    }
                } else {
                    if (pA) {
                        const prom = pA.play();
                        if (prom) prom.catch(() => {});
                    }
                }
            } catch (_) {}
        }
    }, [shouldPauseLiveMedia, currentUrl, activeVideoSlot, wallpaperVideoLoopMode]);

    // Seamless Video Loop Handlers (A/B Roll Crossfade, Ambient Dip, or Direct Cut)
    const handlePlayerTimeUpdate = useCallback((slot) => {
        if (shouldPauseLiveMedia) return;

        const pA = playerRefA.current;
        const pB = playerRefB.current;
        const activePlayer = slot === 'A' ? pA : pB;
        if (!activePlayer || !activePlayer.duration || activePlayer.duration <= 0) return;

        const duration = activePlayer.duration;
        const currentTime = activePlayer.currentTime;
        // Keep crossfade window balanced even for shorter clips
        const effectiveFadeDur = Math.min(crossfadeDuration, Math.max(0.3, duration * 0.4));

        if (wallpaperVideoLoopMode === 'crossfade') {
            // Only trigger crossfade from the currently active video slot!
            if (slot !== activeVideoSlot) return;

            if (currentTime >= duration - effectiveFadeDur && !isCrossfadingRef.current) {
                isCrossfadingRef.current = true;
                const nextSlot = slot === 'A' ? 'B' : 'A';
                const standbyPlayer = slot === 'A' ? pB : pA;

                if (standbyPlayer) {
                    try {
                        standbyPlayer.currentTime = 0;
                        const prom = standbyPlayer.play();
                        if (prom) prom.catch(() => {});
                    } catch (_) {}
                }

                setActiveVideoSlot(nextSlot);

                if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
                crossfadeTimerRef.current = setTimeout(() => {
                    // Outgoing player has now completely faded to opacity 0!
                    // Safely pause and seek back to 0 without any visible glitch
                    if (activePlayer) {
                        try {
                            activePlayer.pause();
                            activePlayer.currentTime = 0;
                        } catch (_) {}
                    }
                    isCrossfadingRef.current = false;
                }, Math.round(effectiveFadeDur * 1000) + 120);
            }
        } else if (wallpaperVideoLoopMode === 'dip') {
            const halfFade = effectiveFadeDur * 0.5;

            if (currentTime >= duration - effectiveFadeDur && !isDippingRef.current) {
                isDippingRef.current = true;
                setDipPhase('out');

                if (dipTimerRef.current) clearTimeout(dipTimerRef.current);
                dipTimerRef.current = setTimeout(() => {
                    if (shouldPauseRef.current) {
                        isDippingRef.current = false;
                        setDipPhase('idle');
                        return;
                    }
                    // Video is now fully dipped to 0 opacity
                    if (activePlayer) {
                        try {
                            activePlayer.currentTime = 0;
                            const prom = activePlayer.play();
                            if (prom) prom.catch(() => {});
                        } catch (_) {}
                    }
                    setDipPhase('in');

                    dipTimerRef.current = setTimeout(() => {
                        setDipPhase('idle');
                        isDippingRef.current = false;
                    }, Math.round(halfFade * 1000) + 100);
                }, Math.round(halfFade * 1000));
            }
        } else {
            // 'cut' / 'loop' (Instant restart loop)
            // Handled natively by loop={true} on the video element!
        }
    }, [activeVideoSlot, crossfadeDuration, shouldPauseLiveMedia, wallpaperVideoLoopMode]);

    const handlePlayerEnded = useCallback((slot) => {
        const pA = playerRefA.current;
        const pB = playerRefB.current;
        const player = slot === 'A' ? pA : pB;

        if (shouldPauseRef.current) {
            if (player) {
                try { player.pause(); } catch (_) {}
            }
            return;
        }

        if (wallpaperVideoLoopMode === 'crossfade') {
            if (slot !== activeVideoSlot) {
                // Outgoing player ended: pause it cleanly. Reset to 0 will happen in crossfadeTimerRef
                if (player) {
                    try { player.pause(); } catch (_) {}
                }
            } else {
                // Active player reached ended unexpectedly (safety net if timeUpdate missed threshold)
                if (!isCrossfadingRef.current) {
                    isCrossfadingRef.current = true;
                    const nextSlot = slot === 'A' ? 'B' : 'A';
                    const standbyPlayer = slot === 'A' ? pB : pA;

                    if (standbyPlayer) {
                        try {
                            standbyPlayer.currentTime = 0;
                            const prom = standbyPlayer.play();
                            if (prom) prom.catch(() => {});
                        } catch (_) {}
                    }

                    setActiveVideoSlot(nextSlot);

                    if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
                    crossfadeTimerRef.current = setTimeout(() => {
                        if (player) {
                            try {
                                player.pause();
                                player.currentTime = 0;
                            } catch (_) {}
                        }
                        isCrossfadingRef.current = false;
                    }, Math.round(crossfadeDuration * 1000) + 120);
                }
            }
        } else if (wallpaperVideoLoopMode === 'dip') {
            // Fallback for dip: if ended fires before dip completes, restart cleanly
            if (player) {
                try {
                    player.currentTime = 0;
                    const prom = player.play();
                    if (prom) prom.catch(() => {});
                } catch (_) {}
            }
            setDipPhase('idle');
            isDippingRef.current = false;
        } else {
            // Fallback for 'cut' / 'loop'
            if (player) {
                try {
                    player.currentTime = 0;
                    const prom = player.play();
                    if (prom) prom.catch(() => {});
                } catch (_) {}
            }
        }
    }, [activeVideoSlot, crossfadeDuration, wallpaperVideoLoopMode]);

    const isCurrentVideo = isVideoWallpaper(currentUrl);
    const isCurrentGif = isGifWallpaper(currentUrl);
    const cleanUrl = currentUrl ? currentUrl.split('?')[0].split('#')[0] : '';

    const visualFilter = (blurWallpaper && wallpaperBlur > 0)
        ? `saturate(1.1) blur(${wallpaperBlur}px)`
        : 'saturate(1.1)';
    const visualTransform = (blurWallpaper && wallpaperBlur > 0) ? 'scale(1.05)' : 'scale(1)';

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
            {/* Exiting Wallpaper Layer (only present momentarily during static image crossfades) */}
            {exitingUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center will-change-transform"
                    style={{
                        backgroundImage: `url('${exitingUrl}')`,
                        filter: visualFilter,
                        transform: visualTransform
                    }}
                />
            )}

            {/* Active Wallpaper Layer */}
            {isCurrentVideo ? (
                /* Hardware-accelerated Video Wallpaper Engine */
                wallpaperVideoLoopMode === 'crossfade' ? (
                    /* A/B Roll Dual Player for Seamless Cross-Dissolve */
                    <>
                        <video
                            ref={playerRefA}
                            key={`${currentUrl}-slotA`}
                            src={currentUrl}
                            autoPlay={!shouldPauseLiveMedia}
                            muted
                            playsInline
                            preload="auto"
                            onTimeUpdate={() => handlePlayerTimeUpdate('A')}
                            onEnded={() => handlePlayerEnded('A')}
                            disablePictureInPicture
                            disableRemotePlayback
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeVideoSlot === 'A' ? 1 : 0,
                                transition: isReducedMotion ? 'none' : `opacity ${crossfadeDuration}s cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                        <video
                            ref={playerRefB}
                            key={`${currentUrl}-slotB`}
                            src={currentUrl}
                            muted
                            playsInline
                            preload="auto"
                            onTimeUpdate={() => handlePlayerTimeUpdate('B')}
                            onEnded={() => handlePlayerEnded('B')}
                            disablePictureInPicture
                            disableRemotePlayback
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeVideoSlot === 'B' ? 1 : 0,
                                transition: isReducedMotion ? 'none' : `opacity ${crossfadeDuration}s cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                    </>
                ) : (
                    /* Single Player for Ambient Dip or Instant Cut */
                    <video
                        ref={playerRefA}
                        key={`${currentUrl}-${wallpaperVideoLoopMode}`}
                        src={currentUrl}
                        autoPlay={!shouldPauseLiveMedia}
                        loop={wallpaperVideoLoopMode === 'cut' || wallpaperVideoLoopMode === 'loop'}
                        muted
                        playsInline
                        preload="auto"
                        onTimeUpdate={() => handlePlayerTimeUpdate('A')}
                        onEnded={() => handlePlayerEnded('A')}
                        disablePictureInPicture
                        disableRemotePlayback
                        className={`absolute inset-0 w-full h-full object-cover will-change-transform ${
                            isReducedMotion ? '' : 'animate-wallpaper-fade'
                        }`}
                        style={{
                            filter: visualFilter,
                            transform: visualTransform,
                            opacity: wallpaperVideoLoopMode === 'dip' && dipPhase === 'out' ? 0 : 1,
                            transition: isReducedMotion
                                ? 'none'
                                : wallpaperVideoLoopMode === 'dip'
                                    ? `opacity ${crossfadeDuration * 0.5}s cubic-bezier(0.4, 0, 0.2, 1)`
                                    : 'none'
                        }}
                    />
                )
            ) : isCurrentGif ? (
                /* Animated GIF Wallpaper with Seamless Loop Transitions (Cross-Dissolve, Ambient Dip, or Instant Cut) */
                wallpaperVideoLoopMode === 'crossfade' ? (
                    <>
                        <img
                            ref={gifSlotARef}
                            key="wallpaper-gif-slot-A"
                            src={gifSlotASrc || (activeGifSlot === 'A' ? cleanUrl : undefined)}
                            alt=""
                            loading="eager"
                            onLoad={() => {
                                if (shouldPauseLiveMedia && activeGifSlot === 'A') {
                                    captureGifFrame();
                                }
                            }}
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: (shouldPauseLiveMedia && hasFrozenGif)
                                    ? 0
                                    : (activeGifSlot === 'A' ? 1 : 0),
                                transition: (isReducedMotion || !isGifCrossfading)
                                    ? 'none'
                                    : `opacity ${gifCrossfadeMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                        <img
                            ref={gifSlotBRef}
                            key="wallpaper-gif-slot-B"
                            src={gifSlotBSrc || undefined}
                            alt=""
                            loading="eager"
                            onLoad={() => {
                                if (shouldPauseLiveMedia && activeGifSlot === 'B') {
                                    captureGifFrame();
                                }
                            }}
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: (shouldPauseLiveMedia && hasFrozenGif)
                                    ? 0
                                    : (activeGifSlot === 'B' ? 1 : 0),
                                transition: (isReducedMotion || !isGifCrossfading)
                                    ? 'none'
                                    : `opacity ${gifCrossfadeMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                        {/* Frozen Frame Canvas when GIF is paused in background, fullscreen, or eco mode */}
                        <canvas
                            ref={freezeCanvasRef}
                            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
                                (shouldPauseLiveMedia && hasFrozenGif) ? 'opacity-100' : 'opacity-0'
                            }`}
                            style={{
                                filter: visualFilter,
                                transform: visualTransform
                            }}
                        />
                    </>
                ) : (
                    /* Ambient Dip or Instant Cut / Native Loop mode */
                    <>
                        <img
                            ref={gifSlotARef}
                            key="wallpaper-gif-single"
                            src={gifSlotASrc || cleanUrl}
                            alt=""
                            loading="eager"
                            onLoad={() => {
                                if (shouldPauseLiveMedia) {
                                    captureGifFrame();
                                }
                            }}
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: (shouldPauseLiveMedia && hasFrozenGif) ? 0 : 1,
                                transition: 'none'
                            }}
                        />
                        {wallpaperVideoLoopMode === 'dip' && (
                            <div
                                className="absolute inset-0 bg-black pointer-events-none"
                                style={{
                                    opacity: (shouldPauseLiveMedia && hasFrozenGif) ? 0 : gifDipOverlayOpacity,
                                    transition: isReducedMotion
                                        ? 'none'
                                        : `opacity ${gifDipHalfMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
                                }}
                            />
                        )}
                        {/* Frozen Frame Canvas when GIF is paused in background, fullscreen, or eco mode */}
                        <canvas
                            ref={freezeCanvasRef}
                            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
                                (shouldPauseLiveMedia && hasFrozenGif) ? 'opacity-100' : 'opacity-0'
                            }`}
                            style={{
                                filter: visualFilter,
                                transform: visualTransform
                            }}
                        />
                    </>
                )
            ) : (
                /* Static Image Wallpaper */
                <div
                    key={currentUrl}
                    className={`absolute inset-0 bg-cover bg-center will-change-transform ${
                        isReducedMotion ? '' : 'animate-wallpaper-fade'
                    }`}
                    style={{
                        backgroundImage: `url('${currentUrl}')`,
                        filter: visualFilter,
                        transform: visualTransform,
                        transition: isReducedMotion ? 'none' : 'filter 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                />
            )}

            {/* Backing Ambient Dimming Overlay Layer */}
            <div
                className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
                style={{
                    backgroundColor: isBright
                        ? `rgba(255, 255, 255, ${(wallpaperDimming / 100) * 0.15})`
                        : `rgba(0, 0, 0, ${wallpaperDimming / 100})`
                }}
            />
        </div>
    );
}

export default memo(WallpaperEngine);
