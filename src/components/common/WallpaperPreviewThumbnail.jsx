import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import useUIStore from '../../store/useUIStore';
import { isVideoWallpaper, isGifWallpaper } from '../../utils/wallpaperHelpers';
import { loadGifData, computeGifTransitionTimings, startGifLoopTransitions } from '../../utils/gifParser';
import { useTranslation } from '../../i18n/index';

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
    const { t } = useTranslation();
    const isWindowFocused = useUIStore(state => state.isWindowFocused);
    const isWindowMinimized = useUIStore(state => state.isWindowMinimized);
    const isWindowVisible = useUIStore(state => state.isWindowVisible);
    const pauseWallpaperInBackground = useUIStore(state => state.settings?.pauseWallpaperInBackground ?? true);
    const [isDocumentVisible, setIsDocumentVisible] = useState(
        () => (typeof document !== 'undefined' ? !document.hidden : true)
    );

    useEffect(() => {
        const handleVisibilityChange = () => setIsDocumentVisible(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const shouldPausePreview = Boolean(
        !isDocumentVisible ||
        isWindowMinimized ||
        !isWindowVisible ||
        (!isWindowFocused && pauseWallpaperInBackground)
    );
    const shouldPausePreviewRef = useRef(shouldPausePreview);
    shouldPausePreviewRef.current = shouldPausePreview;

    const isVideo = isVideoWallpaper(customWallpaper);
    const isGif = isGifWallpaper(customWallpaper);

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
    const [gifData, setGifData] = useState(null); // { duration, frames, buffer, singlePlayBuffer }
    const [activeGifSlot, setActiveGifSlot] = useState('A');
    const [gifSlotASrc, setGifSlotASrc] = useState(null);
    const [gifSlotBSrc, setGifSlotBSrc] = useState(null);
    const [isGifCrossfading, setIsGifCrossfading] = useState(false);
    const [gifDipOverlayOpacity, setGifDipOverlayOpacity] = useState(0);
    const gifSlotARef = useRef(null);
    const gifSlotBRef = useRef(null);

    const {
        effectiveFadeMs: gifCrossfadeMs,
        halfDipMs: gifDipHalfMs
    } = computeGifTransitionTimings(gifData?.duration, safeDuration);

    // Reset preview states on URL or loop mode change
    useEffect(() => {
        if (videoCrossfadeTimerRef.current) clearTimeout(videoCrossfadeTimerRef.current);
        if (videoDipTimerRef.current) clearTimeout(videoDipTimerRef.current);

        isVideoCrossfadingRef.current = false;
        isVideoDippingRef.current = false;
        setActiveVideoSlot('A');
        setVideoDipPhase('idle');
        setActiveGifSlot('A');
        setIsGifCrossfading(false);
        setGifDipOverlayOpacity(0);
    }, [customWallpaper, loopMode]);

    // Fetch and parse GIF data for animated GIFs
    useEffect(() => {
        if (!isGif || !cleanUrl) {
            setGifData(null);
            setGifSlotASrc(null);
            setGifSlotBSrc(null);
            setIsGifCrossfading(false);
            setGifDipOverlayOpacity(0);
            return;
        }

        setGifSlotASrc(cleanUrl);
        setGifSlotBSrc(null);
        setIsGifCrossfading(false);
        setGifDipOverlayOpacity(0);
        setActiveGifSlot('A');

        let isCancelled = false;
        loadGifData(cleanUrl).then((data) => {
            if (isCancelled || !data) return;
            setGifData(data);
        });

        return () => { isCancelled = true; };
    }, [cleanUrl, isGif]);

    // Sync preview video playback with authoritative window focus & visibility state
    useEffect(() => {
        if (!isVideo) return;
        const pA = videoRefA.current;
        const pB = videoRefB.current;
        if (shouldPausePreview) {
            if (videoCrossfadeTimerRef.current) {
                clearTimeout(videoCrossfadeTimerRef.current);
                videoCrossfadeTimerRef.current = null;
            }
            if (videoDipTimerRef.current) {
                clearTimeout(videoDipTimerRef.current);
                videoDipTimerRef.current = null;
            }
            isVideoCrossfadingRef.current = false;
            isVideoDippingRef.current = false;
            setVideoDipPhase('idle');
            try { if (pA) pA.pause(); } catch (_) {}
            try { if (pB) pB.pause(); } catch (_) {}
        } else {
            const activePlayer = (loopMode === 'crossfade' && activeVideoSlot === 'B') ? pB : pA;
            if (activePlayer) {
                try {
                    const p = activePlayer.play();
                    if (p) p.catch(() => {});
                } catch (_) {}
            }
        }
    }, [isVideo, shouldPausePreview, customWallpaper, loopMode, activeVideoSlot]);

    const handlePreviewVideoPlay = useCallback((e) => {
        if (shouldPausePreviewRef.current) {
            try { e.currentTarget.pause(); } catch (_) {}
        }
    }, []);

    // Video loop transition handlers
    const handleVideoTimeUpdate = useCallback((slot) => {
        if (shouldPausePreviewRef.current) return;
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

        if (shouldPausePreviewRef.current) {
            if (player) {
                try { player.pause(); } catch (_) {}
            }
            return;
        }

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

    // Cleanup video timers on unmount
    useEffect(() => {
        return () => {
            if (videoCrossfadeTimerRef.current) clearTimeout(videoCrossfadeTimerRef.current);
            if (videoDipTimerRef.current) clearTimeout(videoDipTimerRef.current);
        };
    }, []);

    // GIF loop transition manager (Cross-Dissolve, Ambient Dip, or Native Loop/Cut)
    useEffect(() => {
        if (!isGif || !gifData || shouldPausePreview || (loopMode !== 'dip' && loopMode !== 'crossfade')) {
            setIsGifCrossfading(false);
            setGifDipOverlayOpacity(0);
            setActiveGifSlot('A');
            setGifSlotASrc(cleanUrl || null);
            setGifSlotBSrc(null);
            return;
        }

        return startGifLoopTransitions({
            gifData,
            loopMode,
            crossfadeDurationSec: safeDuration,
            getSlotImg: (slot) => (slot === 'A' ? gifSlotARef.current : gifSlotBRef.current),
            setSlotSrc: (slot, src) => (slot === 'A' ? setGifSlotASrc(src) : setGifSlotBSrc(src)),
            setActiveSlot: setActiveGifSlot,
            setCrossfading: setIsGifCrossfading,
            setDipOverlayOpacity: setGifDipOverlayOpacity
        });
    }, [isGif, gifData, loopMode, safeDuration, cleanUrl, shouldPausePreview]);

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
                            autoPlay={!shouldPausePreview}
                            muted
                            playsInline
                            preload="auto"
                            onPlay={handlePreviewVideoPlay}
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
                            onPlay={handlePreviewVideoPlay}
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
                        autoPlay={!shouldPausePreview}
                        loop={loopMode === 'cut' || loopMode === 'loop'}
                        muted
                        playsInline
                        preload="auto"
                        onPlay={handlePreviewVideoPlay}
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
                            src={gifSlotASrc || (activeGifSlot === 'A' ? cleanUrl : undefined)}
                            alt=""
                            loading="eager"
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeGifSlot === 'A' ? 1 : 0,
                                transition: isGifCrossfading
                                    ? `opacity ${gifCrossfadeMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
                                    : 'none'
                            }}
                        />
                        <img
                            ref={gifSlotBRef}
                            key="pv-gif-slot-B"
                            src={gifSlotBSrc || undefined}
                            alt=""
                            loading="eager"
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: activeGifSlot === 'B' ? 1 : 0,
                                transition: isGifCrossfading
                                    ? `opacity ${gifCrossfadeMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
                                    : 'none'
                            }}
                        />
                    </>
                ) : (
                    <>
                        <img
                            ref={gifSlotARef}
                            key="pv-gif-single"
                            src={gifSlotASrc || cleanUrl}
                            alt=""
                            loading="eager"
                            className="absolute inset-0 w-full h-full object-cover will-change-transform"
                            style={{
                                filter: visualFilter,
                                transform: visualTransform,
                                opacity: 1,
                                transition: 'none'
                            }}
                        />
                        {loopMode === 'dip' && (
                            <div
                                className="absolute inset-0 bg-black pointer-events-none"
                                style={{
                                    opacity: gifDipOverlayOpacity,
                                    transition: `opacity ${gifDipHalfMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
                                }}
                            />
                        )}
                    </>
                )
            ) : (
                <img
                    src={cleanUrl || defaultThumbnail}
                    alt={t('tools.wallpaperPreview.alt', null, 'Wallpaper preview')}
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
                    {t('tools.wallpaperPreview.badge', null, 'Preview')}
                </span>
            </div>
        </div>
    );
}

export default memo(WallpaperPreviewThumbnail);

