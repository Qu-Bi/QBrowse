// Pure helpers for media playback detection, Picture-in-Picture eligibility,
// multi-tab mediaState attribution, and ephemeral tab media-field sanitization.

export const EMPTY_MEDIA_STATE = Object.freeze({
    isPlaying: false,
    title: '',
    artist: '',
    albumArt: '',
    currentTime: 0,
    duration: 0,
    tabId: null,
    hasVideo: false,
    url: ''
});

export const EPHEMERAL_TAB_MEDIA_FIELDS = Object.freeze([
    'isAudible',
    'isAudioPlaying',
    'hasAudio',
    'mediaPlaying',
    'hasActiveVideo',
    'isPipActive',
    'lastAudibleAt'
]);

/**
 * Strips/resets transient audio/media/PiP flags on a tab object so stale media state
 * is never persisted to storage, restored on startup, duplicated, or carried across navigations.
 */
export function stripEphemeralTabMediaFields(tab, { omitKeys = false } = {}) {
    if (!tab || typeof tab !== 'object') return tab;
    if (omitKeys) {
        const cleaned = { ...tab };
        for (const key of EPHEMERAL_TAB_MEDIA_FIELDS) {
            delete cleaned[key];
        }
        return cleaned;
    }
    return {
        ...tab,
        isAudible: false,
        isAudioPlaying: false,
        hasAudio: false,
        mediaPlaying: false,
        hasActiveVideo: false,
        isPipActive: false,
        lastAudibleAt: null
    };
}

/**
 * Validates whether a media element descriptor represents genuine, active, user-facing playback.
 * Rejects muted autoplay videos, ambient/looping GIF-like videos, tiny/hidden/0x0 elements,
 * and ultra-short UI sound clips while allowing live streams (Infinity/NaN duration).
 */
export function isGenuineActiveMediaDescriptor(desc) {
    if (!desc || typeof desc !== 'object') return false;
    if (desc.isConnected === false) return false;

    const tag = String(desc.tagName || '').toUpperCase();
    if (tag !== 'VIDEO' && tag !== 'AUDIO') return false;

    // Must be actively playing with decoded data
    if (desc.paused || desc.ended) return false;
    const readyState = Number(desc.readyState ?? 0);
    if (readyState < 2) return false;

    // Must be audible (reject muted autoplay / zero-volume elements)
    if (desc.muted === true) return false;
    if (desc.ytMuted === true) return false;
    const volume = desc.volume === undefined || desc.volume === null ? 1 : Number(desc.volume);
    if (!Number.isFinite(volume) || volume <= 0) return false;

    // Duration checks: allow live streams (Infinity / NaN / 0 while live), reject ultra-short sound/GIF clips
    const duration = desc.duration;
    const hasFiniteDuration = typeof duration === 'number' && Number.isFinite(duration) && duration > 0;
    if (hasFiniteDuration && duration <= 3) return false;

    if (tag === 'VIDEO') {
        // Reject short looping GIF-like / ambient background videos
        if (desc.loop === true && hasFiniteDuration && duration <= 15) return false;

        // Must have real intrinsic video frame dimensions (reject 0x0 / 1x1 / tiny preview thumbnails)
        const vw = Number(desc.videoWidth ?? 0);
        const vh = Number(desc.videoHeight ?? 0);
        if (vw < 160 || vh < 90) return false;

        // Reject explicitly hidden videos (unless currently in native PiP)
        if (!desc.isPipElement) {
            if (desc.hidden === true) return false;
            if (desc.display === 'none' || desc.visibility === 'hidden') return false;
            if (desc.opacity !== undefined && Number(desc.opacity) === 0) return false;
            if (
                desc.rectWidth !== undefined &&
                desc.rectHeight !== undefined &&
                (Number(desc.rectWidth) <= 1 || Number(desc.rectHeight) <= 1)
            ) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Validates whether a <video> descriptor is eligible for Picture-in-Picture.
 * Strictly rejects muted autoplay / looping background videos, tiny/hidden/0x0 videos,
 * and unready or ultra-short clips.
 */
export function isEligiblePipVideoDescriptor(desc, { allowPaused = false } = {}) {
    if (!desc || typeof desc !== 'object') return false;
    if (desc.isConnected === false) return false;

    const tag = String(desc.tagName || '').toUpperCase();
    if (tag !== 'VIDEO') return false;

    const readyState = Number(desc.readyState ?? 0);
    if (readyState < 2) return false;

    const vw = Number(desc.videoWidth ?? 0);
    const vh = Number(desc.videoHeight ?? 0);
    if (vw < 160 || vh < 90) return false;

    if (!desc.isPipElement) {
        if (desc.hidden === true) return false;
        if (desc.display === 'none' || desc.visibility === 'hidden') return false;
        if (desc.opacity !== undefined && Number(desc.opacity) === 0) return false;
        if (
            desc.rectWidth !== undefined &&
            desc.rectHeight !== undefined &&
            (Number(desc.rectWidth) <= 1 || Number(desc.rectHeight) <= 1)
        ) {
            return false;
        }
    }

    const duration = desc.duration;
    const hasFiniteDuration = typeof duration === 'number' && Number.isFinite(duration) && duration > 0;
    if (hasFiniteDuration && duration <= 3) return false;
    if (desc.loop === true && hasFiniteDuration && duration <= 15) return false;

    // Never auto-select or PiP muted background videos
    if (desc.muted === true || desc.ytMuted === true) return false;
    const volume = desc.volume === undefined || desc.volume === null ? 1 : Number(desc.volume);
    if (!Number.isFinite(volume) || volume <= 0) return false;

    const isActivelyPlaying = !desc.paused && !desc.ended;
    if (isActivelyPlaying) return true;

    if (!allowPaused) return false;

    // When user explicitly clicks manual PiP on a paused main player video, require a large non-looping player
    if (desc.ended) return false;
    if (desc.loop === true) return false;
    if (vw < 320 || vh < 180) return false;
    if (hasFiniteDuration && duration <= 15) return false;
    return true;
}

/**
 * Picks the best PiP-eligible video from a list of video descriptors.
 * Prefers the largest actively playing unmuted video; optionally falls back to a large paused main video.
 */
export function selectBestPipVideoDescriptor(descriptors, { allowPaused = false } = {}) {
    if (!Array.isArray(descriptors) || descriptors.length === 0) return null;

    const scoreVideo = (d) => (Number(d.videoWidth || 0) * Number(d.videoHeight || 0));

    const playingCandidates = descriptors
        .filter(d => isEligiblePipVideoDescriptor(d, { allowPaused: false }))
        .sort((a, b) => scoreVideo(b) - scoreVideo(a));
    if (playingCandidates.length > 0) {
        return playingCandidates[0];
    }

    if (allowPaused) {
        const pausedCandidates = descriptors
            .filter(d => isEligiblePipVideoDescriptor(d, { allowPaused: true }))
            .sort((a, b) => scoreVideo(b) - scoreVideo(a));
        if (pausedCandidates.length > 0) {
            return pausedCandidates[0];
        }
    }

    return null;
}

function pickMostRecentPlayingSession(sessionsByTab, excludeTabId = null) {
    let best = null;
    for (const [id, session] of Object.entries(sessionsByTab || {})) {
        if (!session || id === excludeTabId) continue;
        if (!session.isPlaying) continue;
        if (!best || (session.updatedAt || 0) >= (best.updatedAt || 0)) {
            best = session;
        }
    }
    return best;
}

/**
 * Pure reducer for updating per-tab media sessions and global active mediaState.
 * Prevents idle/paused tabs from hijacking mediaState from a genuinely playing tab,
 * and promotes another playing tab (or clears to EMPTY_MEDIA_STATE) on stop/clear.
 */
export function resolveMediaStateUpdate(currentState, tabId, payload) {
    const prevSessions = { ...(currentState?.mediaSessionsByTab || {}) };
    const prevMedia = currentState?.mediaState || { ...EMPTY_MEDIA_STATE };
    let nextPipTabId = currentState?.pipTabId || null;

    if (!tabId || !payload || typeof payload !== 'object') {
        return {
            mediaSessionsByTab: prevSessions,
            mediaState: prevMedia,
            pipTabId: nextPipTabId
        };
    }

    const now = Date.now();
    const isPlaying = Boolean(payload.isPlaying);
    const isCleared = Boolean(payload.cleared || payload.hasMedia === false);

    if (typeof payload.isPipActive === 'boolean') {
        if (payload.isPipActive) {
            nextPipTabId = tabId;
        } else if (nextPipTabId === tabId) {
            nextPipTabId = null;
        }
    }

    if (isCleared) {
        delete prevSessions[tabId];
        if (nextPipTabId === tabId) {
            nextPipTabId = null;
        }
        if (prevMedia.tabId === tabId) {
            const promoted = pickMostRecentPlayingSession(prevSessions, tabId);
            return {
                mediaSessionsByTab: prevSessions,
                mediaState: promoted ? { ...EMPTY_MEDIA_STATE, ...promoted } : { ...EMPTY_MEDIA_STATE },
                pipTabId: nextPipTabId
            };
        }
        return {
            mediaSessionsByTab: prevSessions,
            mediaState: prevMedia,
            pipTabId: nextPipTabId
        };
    }

    if (isPlaying) {
        const nextSession = {
            ...EMPTY_MEDIA_STATE,
            ...(prevSessions[tabId] || {}),
            ...payload,
            tabId,
            isPlaying: true,
            updatedAt: now
        };
        prevSessions[tabId] = nextSession;
        return {
            mediaSessionsByTab: prevSessions,
            mediaState: nextSession,
            pipTabId: nextPipTabId
        };
    }

    // Payload is paused / not playing:
    // If this tab never had an active session, ignore it completely so it NEVER stomps another tab!
    if (!prevSessions[tabId]) {
        return {
            mediaSessionsByTab: prevSessions,
            mediaState: prevMedia,
            pipTabId: nextPipTabId
        };
    }

    const updatedPausedSession = {
        ...prevSessions[tabId],
        ...payload,
        tabId,
        isPlaying: false,
        updatedAt: now
    };
    prevSessions[tabId] = updatedPausedSession;

    if (prevMedia.tabId === tabId) {
        const promoted = pickMostRecentPlayingSession(prevSessions, tabId);
        return {
            mediaSessionsByTab: prevSessions,
            mediaState: promoted ? { ...EMPTY_MEDIA_STATE, ...promoted } : updatedPausedSession,
            pipTabId: nextPipTabId
        };
    }

    return {
        mediaSessionsByTab: prevSessions,
        mediaState: prevMedia,
        pipTabId: nextPipTabId
    };
}

/**
 * Pure reducer to remove all media/PiP state attributed to a closed, navigated, suspended, or blanked tab.
 */
export function resolveMediaStateClearForTab(currentState, tabId) {
    const prevSessions = { ...(currentState?.mediaSessionsByTab || {}) };
    const prevMedia = currentState?.mediaState || { ...EMPTY_MEDIA_STATE };
    let nextPipTabId = currentState?.pipTabId || null;

    if (!tabId) {
        return {
            mediaSessionsByTab: prevSessions,
            mediaState: prevMedia,
            pipTabId: nextPipTabId
        };
    }

    delete prevSessions[tabId];
    if (nextPipTabId === tabId) {
        nextPipTabId = null;
    }

    let nextMedia = prevMedia;
    if (prevMedia.tabId === tabId) {
        const promoted = pickMostRecentPlayingSession(prevSessions, tabId);
        nextMedia = promoted ? { ...EMPTY_MEDIA_STATE, ...promoted } : { ...EMPTY_MEDIA_STATE };
    }

    return {
        mediaSessionsByTab: prevSessions,
        mediaState: nextMedia,
        pipTabId: nextPipTabId
    };
}

/**
 * Deterministically resolves which single tabId a media/PiP command should target.
 * NEVER falls back to webviews[0] or all webviews!
 */
export function resolveMediaCommandTargetTabId({
    explicitTabId = null,
    mediaStateTabId = null,
    activeTabId = null,
    hasWebviewForTab = () => false
} = {}) {
    if (explicitTabId) {
        return hasWebviewForTab(explicitTabId) ? explicitTabId : null;
    }
    if (mediaStateTabId && hasWebviewForTab(mediaStateTabId)) {
        return mediaStateTabId;
    }
    if (activeTabId && hasWebviewForTab(activeTabId)) {
        return activeTabId;
    }
    return null;
}
