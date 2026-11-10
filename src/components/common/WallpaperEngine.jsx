import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import { isVideoWallpaper, isGifWallpaper, isLiveWallpaper } from '../../utils/wallpaperHelpers';
import { loadGifData } from '../../utils/gifParser';

const DEFAULT_STOCK_WALLPAPER = 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2564&auto=format&fit=crop';

/**
 * WallpaperEngine handles rendering, crossfading, pausing, and hardware optimization
 * for static images, animated GIFs, and looping video wallpapers (MP4/WebM).
 * Supports customizable live wallpaper loop transitions (Videos & Animated GIFs):
 * - 'crossfade' (Dual-player/Dual-slot A/B roll seamless cross-dissolve)
 * - 'dip' (Smooth ambient dip into backdrop dimming and return)
 * - 'cut' (Instant restart loop)
 * Strictly guarantees ZERO residual stacking of wallpaper elements.
 */
function WallpaperEngine() {
    const customWallpaper = useUIStore(state => state.settings?.customWallpaper);
    const wallpaperDimming = useUIStore(state => state.settings?.wallpaperDimming ?? 25);
    const wallpaperBlur = useUIStore(state => state.settings?.wallpaperBlur ?? 24);
    const blurWallpaper = useUIStore(state => state.settings?.blurWallpaper ?? false);
    const pauseWallpaperInBackground = useUIStore(state => state.settings?.pauseWallpaperInBackground ?? true);
    const pauseWallpaperInEcoMode = useUIStore(state => state.settings?.pauseWallpaperInEcoMode ?? true);
    const wallpaperVideoLoopMode = useUIStore(state => state.settings?.wallpaperVideoLoopMode || 'crossfade');
    const wallpaperVideoCrossfadeDuration = useUIStore(state => state.settings?.wallpaperVideoCrossfadeDuration ?? 1.2);

    const theme = useUIStore(state => state.theme);
    const isBooting = useUIStore(state => state.isBooting);
    const activeModal = useUIStore(state => state.activeModal);
    const isReaderOpen = useUIStore(state => state.isReaderOpen);
    const activeSpace = useTabStore(state => state.activeSpace);
    const a11yReducedMotion = useUIStore(state => state.settings?.a11yReducedMotion);
    const isSystemReducedMotion = useUIStore(state => state.isSystemReducedMotion);

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const isReducedMotion = !!(a11yReducedMotion || isSystemReducedMotion);

    const activeWallpaper = customWallpaper || DEFAULT_STOCK_WALLPAPER;

    const [currentUrl, setCurrentUrl] = useState(activeWallpaper);
    const [exitingUrl, setExitingUrl] = useState(null);

    // Pausing states for live media (Videos & GIFs)
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);
    const [isEcoMode, setIsEcoMode] = useState(false);

    // Video Dual-Player (A/B roll) state for smooth cross-dissolve looping
    const [activeVideoSlot, setActiveVideoSlot] = useState('A');
    const [dipPhase, setDipPhase] = useState('idle'); // 'idle' | 'out' | 'in'
    const [hasFrozenGif, setHasFrozenGif] = useState(false);

    // GIF seamless transition state
    const [gifData, setGifData] = useState(null); // { duration, rawBlob }
    const [activeGifSlot, setActiveGifSlot] = useState('A');
    const [gifSlotASrc, setGifSlotASrc] = useState(null);
    const [gifSlotBSrc, setGifSlotBSrc] = useState(null);
    const [gifDipOpacity, setGifDipOpacity] = useState(1);

    const playerRefA = useRef(null);
    const playerRefB = useRef(null);
    const isCrossfadingRef = useRef(false);
    const isDippingRef = useRef(false);
    const crossfadeTimerRef = useRef(null);
    const dipTimerRef = useRef(null);
    const gifLoopTimerRef = useRef(null);
    const gifSubTimerRef = useRef(null);
    const gifSlotARef = useRef(null);
    const gifSlotBRef = useRef(null);
    const crossfadeCanvasRef = useRef(null);
    const freezeCanvasRef = useRef(null);
    const transitionGenRef = useRef(0);
    const activeBlobUrlsRef = useRef(new Set());

    const crossfadeDuration = Math.max(0.4, Math.min(2.5, Number(wallpaperVideoCrossfadeDuration) || 1.2));
    const gifHalfFadeSec = Math.min(crossfadeDuration * 0.5, Math.max(0.25, (gifData?.duration ? (gifData.duration / 1000) * 0.25 : 0.6)));

    // Track window focus/blur and visibility for power & GPU optimization
    useEffect(() => {
        const handleFocus = () => setIsWindowFocused(true);
        const handleBlur = () => setIsWindowFocused(false);
        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
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
    // Pauses when unfocused, in background, in Eco Mode, when reduced motion is enabled, or when Settings/modals/Reader Mode are open
    const shouldPauseLiveMedia = Boolean(
        !isDocumentVisible ||
        (!isWindowFocused && pauseWallpaperInBackground) ||
        (isEcoMode && pauseWallpaperInEcoMode) ||
        Boolean(activeModal) ||
        Boolean(isReaderOpen) ||
        isReducedMotion
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
            if (dipTimerRef.current) clearTimeout(dipTimerRef.current);
            if (gifLoopTimerRef.current) clearTimeout(gifLoopTimerRef.current);
            if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
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
        if (gifLoopTimerRef.current) {
            clearTimeout(gifLoopTimerRef.current);
            gifLoopTimerRef.current = null;
        }
        if (gifSubTimerRef.current) {
            clearTimeout(gifSubTimerRef.current);
            gifSubTimerRef.current = null;
        }
        isCrossfadingRef.current = false;
        isDippingRef.current = false;
        setDipPhase('idle');
        setActiveGifSlot('A');
        setGifDipOpacity(1);
        if (crossfadeCanvasRef.current) {
            crossfadeCanvasRef.current.style.transition = 'none';
            crossfadeCanvasRef.current.style.opacity = '0';
        }
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
        const activeImg = (wallpaperVideoLoopMode === 'crossfade' && activeGifSlot === 'B')
            ? gifSlotBRef.current
            : gifSlotARef.current;
        const res = drawCoverToCanvas(activeImg, freezeCanvasRef.current);
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

    // Fetch and parse GIF duration and raw buffer
    useEffect(() => {
        if (!isGifWallpaper(currentUrl)) {
            setGifData(null);
            setGifSlotASrc(null);
            setGifSlotBSrc(null);
            setGifDipOpacity(1);
            return;
        }

        const clean = currentUrl.split('?')[0].split('#')[0];
        setGifSlotASrc(clean);
        setGifSlotBSrc(null);
        setGifDipOpacity(1);
        setActiveGifSlot('A');

        let isCancelled = false;

        loadGifData(clean).then(data => {
            if (isCancelled || !data) return;
            setGifData(data);
        });

        return () => { isCancelled = true; };
    }, [currentUrl]);

    // GIF seamless loop transition manager (Cross-Dissolve, Ambient Dip, or Instant Cut)
    useEffect(() => {
        if (!isGifWallpaper(currentUrl) || !gifData || shouldPauseLiveMedia || isReducedMotion) {
            if (gifLoopTimerRef.current) clearTimeout(gifLoopTimerRef.current);
            if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
            setGifDipOpacity(1);
            if (crossfadeCanvasRef.current) {
                crossfadeCanvasRef.current.style.transition = 'none';
                crossfadeCanvasRef.current.style.opacity = '0';
            }
            return;
        }

        if (wallpaperVideoLoopMode === 'cut') {
            if (gifLoopTimerRef.current) clearTimeout(gifLoopTimerRef.current);
            if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
            setGifDipOpacity(1);
            if (crossfadeCanvasRef.current) {
                crossfadeCanvasRef.current.style.transition = 'none';
                crossfadeCanvasRef.current.style.opacity = '0';
            }
            return;
        }

        const duration = gifData.duration;
        let isCancelled = false;

        const createBlobUrl = () => {
            const url = URL.createObjectURL(gifData.rawBlob);
            activeBlobUrlsRef.current.add(url);
            return url;
        };

        const revokeBlobUrl = (url) => {
            if (url && activeBlobUrlsRef.current.has(url)) {
                URL.revokeObjectURL(url);
                activeBlobUrlsRef.current.delete(url);
            }
        };

        if (wallpaperVideoLoopMode === 'dip') {
            const halfFadeSec = Math.min(crossfadeDuration * 0.5, Math.max(0.25, (duration / 1000) * 0.25));
            const halfFadeMs = Math.round(halfFadeSec * 1000);

            setGifDipOpacity(1);

            let cycle = 1;
            const cycleStart = performance.now();

            const scheduleDip = () => {
                if (gifLoopTimerRef.current) clearTimeout(gifLoopTimerRef.current);
                const targetFadeDownTime = cycleStart + (cycle * duration) - halfFadeMs;
                const delay = Math.max(10, targetFadeDownTime - performance.now());

                gifLoopTimerRef.current = setTimeout(() => {
                    if (isCancelled) return;

                    // 1. Smoothly fade down to 0 over halfFadeSec
                    setGifDipOpacity(0);

                    // 2. Exactly at loop time (when opacity is 0 and GIF loops in dark):
                    if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                    const targetLoopTime = cycleStart + (cycle * duration);
                    const fadeUpDelay = Math.max(10, targetLoopTime - performance.now());

                    gifSubTimerRef.current = setTimeout(() => {
                        if (isCancelled) return;

                        // 3. Smoothly fade back up to 1
                        setGifDipOpacity(1);

                        // 4. Advance to next cycle
                        cycle++;
                        scheduleDip();
                    }, fadeUpDelay);
                }, delay);
            };

            scheduleDip();

            return () => {
                isCancelled = true;
                if (gifLoopTimerRef.current) clearTimeout(gifLoopTimerRef.current);
                if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                setGifDipOpacity(1);
            };
        }

        if (wallpaperVideoLoopMode === 'crossfade') {
            const effectiveFadeSec = Math.min(crossfadeDuration, Math.max(0.3, (duration / 1000) * 0.45));
            const fadeMs = Math.round(effectiveFadeSec * 1000);
            const leadTime = Math.max(100, duration - fadeMs);

            let urlA = createBlobUrl();
            let urlB = null;

            setGifSlotASrc(urlA);
            setGifSlotBSrc(null);
            setActiveGifSlot('A');

            let loopStartTime = performance.now();

            const scheduleCrossfade = (slot) => {
                if (gifLoopTimerRef.current) clearTimeout(gifLoopTimerRef.current);
                const targetTime = loopStartTime + leadTime;
                const delay = Math.max(20, targetTime - performance.now());

                gifLoopTimerRef.current = setTimeout(() => {
                    if (isCancelled) return;

                    const activeImg = slot === 'A' ? gifSlotARef.current : gifSlotBRef.current;
                    const canvas = crossfadeCanvasRef.current;

                    // Step 1: Capture the exact outgoing frame onto canvas
                    const drawn = drawCoverToCanvas(activeImg, canvas);

                    // Step 2: Show canvas at opacity 1 instantly with no transition
                    if (canvas && drawn) {
                        canvas.style.transition = 'none';
                        canvas.style.opacity = '1';
                        void canvas.offsetWidth; // Force layout reflow
                    }

                    // Step 3: Mount next slot starting from frame 0
                    const nextSlot = slot === 'A' ? 'B' : 'A';
                    const nextUrl = createBlobUrl();

                    if (nextSlot === 'B') {
                        urlB = nextUrl;
                        setGifSlotBSrc(nextUrl);
                    } else {
                        urlA = nextUrl;
                        setGifSlotASrc(nextUrl);
                    }
                    setActiveGifSlot(nextSlot);

                    // Step 4: In the very next frame, fade canvas from 1 to 0 over effectiveFadeSec
                    requestAnimationFrame(() => {
                        if (isCancelled) return;
                        if (canvas && drawn) {
                            canvas.style.transition = isReducedMotion
                                ? 'none'
                                : `opacity ${effectiveFadeSec}s cubic-bezier(0.4, 0, 0.2, 1)`;
                            canvas.style.opacity = '0';
                        }
                    });

                    // Step 5: Once fade completes, clean up the old URL
                    const outgoingUrl = nextSlot === 'B' ? urlA : urlB;
                    if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                    gifSubTimerRef.current = setTimeout(() => {
                        if (isCancelled) return;
                        revokeBlobUrl(outgoingUrl);
                    }, fadeMs + 100);

                    // Step 6: Schedule next crossfade from the new slot
                    loopStartTime = performance.now();
                    scheduleCrossfade(nextSlot);
                }, delay);
            };

            scheduleCrossfade('A');

            return () => {
                isCancelled = true;
                if (gifLoopTimerRef.current) clearTimeout(gifLoopTimerRef.current);
                if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                for (const u of activeBlobUrlsRef.current) {
                    URL.revokeObjectURL(u);
                }
                activeBlobUrlsRef.current.clear();
                if (crossfadeCanvasRef.current) {
                    crossfadeCanvasRef.current.style.transition = 'none';
                    crossfadeCanvasRef.current.style.opacity = '0';
                }
            };
        }
    }, [currentUrl, gifData, wallpaperVideoLoopMode, crossfadeDuration, shouldPauseLiveMedia, isReducedMotion, drawCoverToCanvas]);

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
        if (gifLoopTimerRef.current) {
            clearTimeout(gifLoopTimerRef.current);
            gifLoopTimerRef.current = null;
        }
        if (gifSubTimerRef.current) {
            clearTimeout(gifSubTimerRef.current);
            gifSubTimerRef.current = null;
        }

        // Reset video slots and states
        setActiveVideoSlot('A');
        setActiveGifSlot('A');
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
            try { if (pA) pA.pause(); } catch (_) {}
            try { if (pB) pB.pause(); } catch (_) {}
        } else {
            try {
                if (wallpaperVideoLoopMode === 'crossfade') {
                    const activePlayer = activeVideoSlot === 'A' ? pA : pB;
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
            // 'cut' (Instant restart loop)
            // Handled natively by loop={true} on the video element!
        }
    }, [activeVideoSlot, crossfadeDuration, shouldPauseLiveMedia, wallpaperVideoLoopMode]);

    const handlePlayerEnded = useCallback((slot) => {
        const pA = playerRefA.current;
        const pB = playerRefB.current;
        const player = slot === 'A' ? pA : pB;

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
            // Fallback for 'cut'
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
                            autoPlay
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
                        autoPlay
                        loop={wallpaperVideoLoopMode === 'cut'}
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
                            src={gifSlotASrc || cleanUrl}
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
                                transition: 'none'
                            }}
                        />
                        <img
                            ref={gifSlotBRef}
                            key="wallpaper-gif-slot-B"
                            src={gifSlotBSrc || cleanUrl}
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
                                transition: 'none'
                            }}
                        />
                        {/* Hardware-accelerated Crossfade Frame Capture Canvas */}
                        <canvas
                            ref={crossfadeCanvasRef}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: 0
                            }}
                        />
                        {/* Frozen Frame Canvas when GIF is paused in background or eco mode */}
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
                    /* Ambient Dip or Instant Cut mode */
                    <>
                        <img
                            ref={gifSlotARef}
                            key="wallpaper-gif-single"
                            src={cleanUrl}
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
                                opacity: (shouldPauseLiveMedia && hasFrozenGif)
                                    ? 0
                                    : (wallpaperVideoLoopMode === 'dip' ? gifDipOpacity : 1),
                                transition: isReducedMotion
                                    ? 'none'
                                    : (wallpaperVideoLoopMode === 'dip'
                                        ? `opacity ${gifHalfFadeSec}s cubic-bezier(0.4, 0, 0.2, 1)`
                                        : 'none')
                            }}
                        />
                        {/* Frozen Frame Canvas when GIF is paused in background or eco mode */}
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
