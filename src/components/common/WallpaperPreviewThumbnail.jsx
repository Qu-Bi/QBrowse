import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { isVideoWallpaper, isGifWallpaper } from '../../utils/wallpaperHelpers';
import { loadGifData } from '../../utils/gifParser';

/**
 * WallpaperPreviewThumbnail provides real-time, interactive preview of live wallpaper
 * loop transitions (Cross-Dissolve, Ambient Dip, Instant Cut) for videos and animated GIFs.
 * Displays live visual filters (dimming, blur) and transition mode indicators.
 * Zero unicode emojis. Zero memory leaks.
 */
function WallpaperPreviewThumbnail({
    customWallpaper,
    loopMode = 'crossfade',
    crossfadeDuration = 1.2,
    dimming = 25,
    blur = 24,
    blurEnabled = false,
    defaultThumbnail = 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop',
    className = ''
}) {
    const isVideo = isVideoWallpaper(customWallpaper);
    const isGif = isGifWallpaper(customWallpaper);
    const isLive = isVideo || isGif;

    const safeDuration = Math.max(0.4, Math.min(2.5, Number(crossfadeDuration) || 1.2));
    const cleanUrl = customWallpaper ? customWallpaper.split('?')[0].split('#')[0] : '';

    // Video preview state
    const [activeVideoSlot, setActiveVideoSlot] = useState('A');
    const [videoDipPhase, setVideoDipPhase] = useState('idle'); // 'idle' | 'out' | 'in'
    const videoRefA = useRef(null);
    const videoRefB = useRef(null);
    const isVideoCrossfadingRef = useRef(false);
    const isVideoDippingRef = useRef(false);
    const videoCrossfadeTimerRef = useRef(null);
    const videoDipTimerRef = useRef(null);

    // GIF preview state
    const [gifData, setGifData] = useState(null); // { duration, rawBlob }
    const [activeGifSlot, setActiveGifSlot] = useState('A');
    const [gifSlotASrc, setGifSlotASrc] = useState(null);
    const [gifSlotBSrc, setGifSlotBSrc] = useState(null);
    const [gifDipOpacity, setGifDipOpacity] = useState(1);
    const gifSlotARef = useRef(null);
    const gifSlotBRef = useRef(null);
    const crossfadeCanvasRef = useRef(null);
    const activeBlobUrlsRef = useRef(new Set());
    const gifTimerRef = useRef(null);
    const gifSubTimerRef = useRef(null);

    const gifHalfFadeSec = Math.min(safeDuration * 0.5, Math.max(0.25, (gifData?.duration ? (gifData.duration / 1000) * 0.25 : 0.6)));

    // Reset preview states on URL or loop mode change
    useEffect(() => {
        if (videoCrossfadeTimerRef.current) clearTimeout(videoCrossfadeTimerRef.current);
        if (videoDipTimerRef.current) clearTimeout(videoDipTimerRef.current);
        if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
        if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);

        isVideoCrossfadingRef.current = false;
        isVideoDippingRef.current = false;
        setActiveVideoSlot('A');
        setVideoDipPhase('idle');
        setActiveGifSlot('A');
        setGifDipOpacity(1);
        for (const u of activeBlobUrlsRef.current) {
            URL.revokeObjectURL(u);
        }
        activeBlobUrlsRef.current.clear();
        if (crossfadeCanvasRef.current) {
            crossfadeCanvasRef.current.style.transition = 'none';
            crossfadeCanvasRef.current.style.opacity = '0';
        }
    }, [customWallpaper, loopMode]);

    // Fetch and parse GIF data for animated GIFs
    useEffect(() => {
        if (!isGif || !cleanUrl) {
            setGifData(null);
            setGifSlotASrc(null);
            setGifSlotBSrc(null);
            setGifDipOpacity(1);
            return;
        }

        setGifSlotASrc(cleanUrl);
        setGifSlotBSrc(null);
        setGifDipOpacity(1);
        setActiveGifSlot('A');

        let isCancelled = false;
        loadGifData(cleanUrl).then((data) => {
            if (isCancelled || !data) return;
            setGifData(data);
        });

        return () => { isCancelled = true; };
    }, [cleanUrl, isGif]);

    // Video loop transition handlers
    const handleVideoTimeUpdate = useCallback((slot) => {
        const pA = videoRefA.current;
        const pB = videoRefB.current;
        const activePlayer = slot === 'A' ? pA : pB;
        if (!activePlayer || !activePlayer.duration || activePlayer.duration <= 0) return;

        const duration = activePlayer.duration;
        const currentTime = activePlayer.currentTime;
        const effectiveFadeDur = Math.min(safeDuration, Math.max(0.3, duration * 0.4));

        if (loopMode === 'crossfade') {
            if (slot !== activeVideoSlot) return;

            if (currentTime >= duration - effectiveFadeDur && !isVideoCrossfadingRef.current) {
                isVideoCrossfadingRef.current = true;
                const nextSlot = slot === 'A' ? 'B' : 'A';
                const standbyPlayer = slot === 'A' ? pB : pA;

                if (standbyPlayer) {
                    try {
                        standbyPlayer.currentTime = 0;
                        const p = standbyPlayer.play();
                        if (p) p.catch(() => {});
                    } catch (_) {}
                }

                setActiveVideoSlot(nextSlot);

                if (videoCrossfadeTimerRef.current) clearTimeout(videoCrossfadeTimerRef.current);
                videoCrossfadeTimerRef.current = setTimeout(() => {
                    if (activePlayer) {
                        try {
                            activePlayer.pause();
                            activePlayer.currentTime = 0;
                        } catch (_) {}
                    }
                    isVideoCrossfadingRef.current = false;
                }, Math.round(effectiveFadeDur * 1000) + 100);
            }
        } else if (loopMode === 'dip') {
            const halfFade = effectiveFadeDur * 0.5;

            if (currentTime >= duration - effectiveFadeDur && !isVideoDippingRef.current) {
                isVideoDippingRef.current = true;
                setVideoDipPhase('out');

                if (videoDipTimerRef.current) clearTimeout(videoDipTimerRef.current);
                videoDipTimerRef.current = setTimeout(() => {
                    if (activePlayer) {
                        try {
                            activePlayer.currentTime = 0;
                            const p = activePlayer.play();
                            if (p) p.catch(() => {});
                        } catch (_) {}
                    }
                    setVideoDipPhase('in');

                    videoDipTimerRef.current = setTimeout(() => {
                        setVideoDipPhase('idle');
                        isVideoDippingRef.current = false;
                    }, Math.round(halfFade * 1000) + 80);
                }, Math.round(halfFade * 1000));
            }
        }
    }, [activeVideoSlot, loopMode, safeDuration]);

    const handleVideoEnded = useCallback((slot) => {
        const pA = videoRefA.current;
        const pB = videoRefB.current;
        const player = slot === 'A' ? pA : pB;

        if (loopMode === 'crossfade') {
            if (slot !== activeVideoSlot) {
                if (player) {
                    try { player.pause(); } catch (_) {}
                }
            } else if (!isVideoCrossfadingRef.current) {
                isVideoCrossfadingRef.current = true;
                const nextSlot = slot === 'A' ? 'B' : 'A';
                const standbyPlayer = slot === 'A' ? pB : pA;

                if (standbyPlayer) {
                    try {
                        standbyPlayer.currentTime = 0;
                        const p = standbyPlayer.play();
                        if (p) p.catch(() => {});
                    } catch (_) {}
                }

                setActiveVideoSlot(nextSlot);

                if (videoCrossfadeTimerRef.current) clearTimeout(videoCrossfadeTimerRef.current);
                videoCrossfadeTimerRef.current = setTimeout(() => {
                    if (player) {
                        try {
                            player.pause();
                            player.currentTime = 0;
                        } catch (_) {}
                    }
                    isVideoCrossfadingRef.current = false;
                }, Math.round(safeDuration * 1000) + 100);
            }
        } else if (loopMode === 'dip') {
            if (player) {
                try {
                    player.currentTime = 0;
                    const p = player.play();
                    if (p) p.catch(() => {});
                } catch (_) {}
            }
            setVideoDipPhase('idle');
            isVideoDippingRef.current = false;
        } else {
            if (player) {
                try {
                    player.currentTime = 0;
                    const p = player.play();
                    if (p) p.catch(() => {});
                } catch (_) {}
            }
        }
    }, [activeVideoSlot, loopMode, safeDuration]);

    // High-fidelity image frame render to thumbnail canvas preserving cover aspect ratio
    const drawCoverToCanvas = useCallback((img, canvas) => {
        if (!img || !canvas) return false;
        if (!img.complete || !img.naturalWidth || !img.naturalHeight) return false;

        try {
            const rect = canvas.getBoundingClientRect();
            const w = rect.width || canvas.clientWidth || 144;
            const h = rect.height || canvas.clientHeight || 80;
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

    // GIF loop transition manager (Cross-Dissolve, Ambient Dip, or Instant Cut)
    useEffect(() => {
        if (!isGif || !gifData || loopMode === 'cut') {
            if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
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

        if (loopMode === 'dip') {
            const halfFadeSec = Math.min(safeDuration * 0.5, Math.max(0.25, (duration / 1000) * 0.25));
            const halfFadeMs = Math.round(halfFadeSec * 1000);

            setGifDipOpacity(1);

            let cycle = 1;
            const cycleStart = performance.now();

            const scheduleDip = () => {
                if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
                const targetFadeDownTime = cycleStart + (cycle * duration) - halfFadeMs;
                const delay = Math.max(10, targetFadeDownTime - performance.now());

                gifTimerRef.current = setTimeout(() => {
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
                if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
                if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                setGifDipOpacity(1);
            };
        }

        if (loopMode === 'crossfade') {
            const effectiveFadeDuration = Math.min(safeDuration, Math.max(0.3, (duration / 1000) * 0.45));
            const fadeMs = Math.round(effectiveFadeDuration * 1000);
            const leadTime = Math.max(100, duration - fadeMs);

            let urlA = createBlobUrl();
            let urlB = null;

            setGifSlotASrc(urlA);
            setGifSlotBSrc(null);
            setActiveGifSlot('A');

            let loopStartTime = performance.now();

            const scheduleCrossfade = (slot) => {
                if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
                const targetTime = loopStartTime + leadTime;
                const delay = Math.max(20, targetTime - performance.now());

                gifTimerRef.current = setTimeout(() => {
                    if (isCancelled) return;

                    const activeImg = slot === 'A' ? gifSlotARef.current : gifSlotBRef.current;
                    const canvas = crossfadeCanvasRef.current;

                    // Step 1: Capture frame onto canvas
                    const drawn = drawCoverToCanvas(activeImg, canvas);

                    // Step 2: Show canvas at opacity 1 instantly
                    if (canvas && drawn) {
                        canvas.style.transition = 'none';
                        canvas.style.opacity = '1';
                        void canvas.offsetWidth;
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

                    // Step 4: Fade canvas from 1 to 0 over effectiveFadeDuration
                    requestAnimationFrame(() => {
                        if (isCancelled) return;
                        if (canvas && drawn) {
                            canvas.style.transition = `opacity ${effectiveFadeDuration}s cubic-bezier(0.4, 0, 0.2, 1)`;
                            canvas.style.opacity = '0';
                        }
                    });

                    // Step 5: Clean up old URL
                    const outgoingUrl = nextSlot === 'B' ? urlA : urlB;
                    if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                    gifSubTimerRef.current = setTimeout(() => {
                        if (isCancelled) return;
                        revokeBlobUrl(outgoingUrl);
                    }, fadeMs + 100);

                    // Step 6: Schedule next crossfade
                    loopStartTime = performance.now();
                    scheduleCrossfade(nextSlot);
                }, delay);
            };

            scheduleCrossfade('A');

            return () => {
                isCancelled = true;
                if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
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
    }, [isGif, gifData, loopMode, safeDuration, drawCoverToCanvas]);

    const visualFilter = (blurEnabled && blur > 0)
        ? `saturate(1.1) blur(${Math.min(8, blur * 0.2)}px)`
        : 'saturate(1.1)';
    const visualTransform = (blurEnabled && blur > 0) ? 'scale(1.05)' : 'scale(1)';

    return (
        <div className={`w-36 h-20 rounded-lg overflow-hidden relative border border-white/10 shadow-md flex-shrink-0 bg-black/60 select-none ${className}`}>
            {isVideo ? (
                loopMode === 'crossfade' ? (
                    <>
                        <video
                            ref={videoRefA}
                            key={`${cleanUrl}-pv-slotA`}
                            src={cleanUrl}
                            autoPlay
                            muted
                            playsInline
                            preload="auto"
                            onTimeUpdate={() => handleVideoTimeUpdate('A')}
                            onEnded={() => handleVideoEnded('A')}
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeVideoSlot === 'A' ? 1 : 0,
                                transition: `opacity ${safeDuration}s cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                        <video
                            ref={videoRefB}
                            key={`${cleanUrl}-pv-slotB`}
                            src={cleanUrl}
                            muted
                            playsInline
                            preload="auto"
                            onTimeUpdate={() => handleVideoTimeUpdate('B')}
                            onEnded={() => handleVideoEnded('B')}
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeVideoSlot === 'B' ? 1 : 0,
                                transition: `opacity ${safeDuration}s cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                    </>
                ) : (
                    <video
                        ref={videoRefA}
                        key={`${cleanUrl}-pv-single`}
                        src={cleanUrl}
                        autoPlay
                        loop={loopMode === 'cut'}
                        muted
                        playsInline
                        preload="auto"
                        onTimeUpdate={() => handleVideoTimeUpdate('A')}
                        onEnded={() => handleVideoEnded('A')}
                        className="absolute inset-0 w-full h-full object-cover will-change-transform"
                        style={{
                            filter: visualFilter,
                            transform: visualTransform,
                            opacity: loopMode === 'dip' && videoDipPhase === 'out' ? 0 : 1,
                            transition: loopMode === 'dip'
                                ? `opacity ${safeDuration * 0.5}s cubic-bezier(0.4, 0, 0.2, 1)`
                                : 'none'
                        }}
                    />
                )
            ) : isGif ? (
                loopMode === 'crossfade' ? (
                    <>
                        <img
                            ref={gifSlotARef}
                            key="pv-gif-slot-A"
                            src={gifSlotASrc || cleanUrl}
                            alt=""
                            loading="eager"
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeGifSlot === 'A' ? 1 : 0,
                                transition: 'none'
                            }}
                        />
                        <img
                            ref={gifSlotBRef}
                            key="pv-gif-slot-B"
                            src={gifSlotBSrc || cleanUrl}
                            alt=""
                            loading="eager"
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeGifSlot === 'B' ? 1 : 0,
                                transition: 'none'
                            }}
                        />
                        <canvas
                            ref={crossfadeCanvasRef}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: 0
                            }}
                        />
                    </>
                ) : (
                    <img
                        ref={gifSlotARef}
                        key="pv-gif-single"
                        src={cleanUrl}
                        alt=""
                        loading="eager"
                        className="absolute inset-0 w-full h-full object-cover will-change-transform"
                        style={{
                            filter: visualFilter,
                            transform: visualTransform,
                            opacity: loopMode === 'dip' ? gifDipOpacity : 1,
                            transition: loopMode === 'dip'
                                ? `opacity ${gifHalfFadeSec}s cubic-bezier(0.4, 0, 0.2, 1)`
                                : 'none'
                        }}
                    />
                )
            ) : (
                <img
                    src={cleanUrl || defaultThumbnail}
                    alt="Wallpaper preview"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                        filter: visualFilter,
                        transform: visualTransform
                    }}
                    onError={(e) => {
                        e.target.src = defaultThumbnail;
                    }}
                />
            )}

            {/* Ambient Dimming Overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: `rgba(0, 0, 0, ${dimming / 100})` }}
            />

            {/* Clean Simple Preview Badge */}
            <div className="absolute bottom-1 left-1 pointer-events-none">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white/80 border border-white/10">
                    Preview
                </span>
            </div>
        </div>
    );
}

export default memo(WallpaperPreviewThumbnail);

