import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { isVideoWallpaper, isGifWallpaper } from '../../utils/wallpaperHelpers';
import { fetchGifDuration } from '../../utils/gifParser';

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
    const [activeGifSlot, setActiveGifSlot] = useState('A');
    const activeGifSlotRef = useRef('A');
    useEffect(() => { activeGifSlotRef.current = activeGifSlot; }, [activeGifSlot]);
    const [gifCycleA, setGifCycleA] = useState(0);
    const [gifCycleB, setGifCycleB] = useState(0);
    const [gifDipPhase, setGifDipPhase] = useState('idle');
    const [gifDurationMs, setGifDurationMs] = useState(null);
    const gifTimerRef = useRef(null);
    const gifSubTimerRef = useRef(null);

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
        setGifDipPhase('idle');
    }, [customWallpaper, loopMode]);

    // Fetch and parse GIF duration for animated GIFs
    useEffect(() => {
        if (!isGif || !cleanUrl) {
            setGifDurationMs(null);
            return;
        }
        let isCancelled = false;
        fetchGifDuration(cleanUrl).then((dur) => {
            if (!isCancelled && dur && dur > 400) {
                setGifDurationMs(dur);
            }
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

    // GIF loop transition manager
    useEffect(() => {
        if (!isGif || loopMode === 'cut') {
            if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
            if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
            return;
        }

        const effectiveDur = gifDurationMs || 4990;
        const effectiveFadeMs = Math.min(safeDuration * 1000, Math.max(300, effectiveDur * 0.4));
        const runMs = Math.max(100, effectiveDur - effectiveFadeMs);
        let isActive = true;

        const scheduleCrossfade = () => {
            if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
            const targetSlot = activeGifSlotRef.current === 'A' ? 'B' : 'A';
            const prepDelay = Math.max(0, runMs - 80);

            gifTimerRef.current = setTimeout(() => {
                if (!isActive) return;
                if (targetSlot === 'B') {
                    setGifCycleB(c => c + 1);
                } else {
                    setGifCycleA(c => c + 1);
                }

                if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                gifSubTimerRef.current = setTimeout(() => {
                    if (!isActive) return;
                    setActiveGifSlot(targetSlot);
                    scheduleCrossfade();
                }, 80);
            }, prepDelay);
        };

        const scheduleDip = () => {
            if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
            const halfFadeMs = effectiveFadeMs * 0.5;

            gifTimerRef.current = setTimeout(() => {
                if (!isActive) return;
                setGifDipPhase('out');

                if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
                gifSubTimerRef.current = setTimeout(() => {
                    if (!isActive) return;
                    setGifCycleA(c => c + 1);

                    gifSubTimerRef.current = setTimeout(() => {
                        if (!isActive) return;
                        setGifDipPhase('in');

                        gifSubTimerRef.current = setTimeout(() => {
                            if (!isActive) return;
                            setGifDipPhase('idle');
                            scheduleDip();
                        }, Math.round(halfFadeMs) + 60);
                    }, 50);
                }, Math.round(halfFadeMs));
            }, runMs);
        };

        if (loopMode === 'crossfade') {
            scheduleCrossfade();
        } else if (loopMode === 'dip') {
            scheduleDip();
        }

        return () => {
            isActive = false;
            if (gifTimerRef.current) clearTimeout(gifTimerRef.current);
            if (gifSubTimerRef.current) clearTimeout(gifSubTimerRef.current);
        };
    }, [isGif, gifDurationMs, loopMode, safeDuration, activeGifSlot]);

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
                            key="pv-gif-slot-A"
                            src={`${cleanUrl}?pv=A&v=${gifCycleA}`}
                            alt=""
                            loading="eager"
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeGifSlot === 'A' ? 1 : 0,
                                transition: `opacity ${safeDuration}s cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                        <img
                            key="pv-gif-slot-B"
                            src={`${cleanUrl}?pv=B&v=${gifCycleB}`}
                            alt=""
                            loading="eager"
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeGifSlot === 'B' ? 1 : 0,
                                transition: `opacity ${safeDuration}s cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                        />
                    </>
                ) : (
                    <img
                        key="pv-gif-single"
                        src={loopMode === 'dip' ? `${cleanUrl}?pv=dip&v=${gifCycleA}` : cleanUrl}
                        alt=""
                        loading="eager"
                        className="absolute inset-0 w-full h-full object-cover will-change-transform"
                        style={{
                            filter: visualFilter,
                            transform: visualTransform,
                            opacity: loopMode === 'dip' && gifDipPhase === 'out' ? 0 : 1,
                            transition: loopMode === 'dip'
                                ? `opacity ${safeDuration * 0.5}s cubic-bezier(0.4, 0, 0.2, 1)`
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

