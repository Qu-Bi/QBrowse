/**
 * High-performance binary GIF duration parser & loop orchestrator for QBrowse
 * Reads GIF89a / GIF87a graphic control extension blocks to compute exact loop durations.
 * Supports converting infinite-loop GIFs to single-play GIFs to enable silky-smooth,
 * hardware-accelerated cross-dissolve and ambient dip loop transitions.
 * Zero external dependencies. Zero unicode emojis.
 */

function skipSubBlocks(bytes, start) {
    let pos = start;
    while (pos < bytes.length) {
        const len = bytes[pos];
        if (len === 0) {
            return pos + 1;
        }
        pos += 1 + len;
    }
    return bytes.length;
}

function getGifGctEndOffset(bytes) {
    if (bytes.length < 13) return bytes.length;
    const gctFlag = bytes[10] & 0x80;
    if (!gctFlag) return 13;
    const gctSize = 3 * (1 << ((bytes[10] & 0x07) + 1));
    return Math.min(bytes.length, 13 + gctSize);
}

/**
 * Parses the total loop duration (ms) and frame count from a GIF buffer.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {{ duration: number, frames: number } | null}
 */
export function parseGifInfo(buffer) {
    if (!buffer) return null;
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 13) return null;

    // Header validation: "GIF87a" or "GIF89a"
    if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return null;

    let totalDurationMs = 0;
    let gceCount = 0;
    let imageCount = 0;
    let i = getGifGctEndOffset(bytes);

    while (i < bytes.length) {
        const blockType = bytes[i++];
        if (blockType === 0x3B) break; // Trailer (EOF)

        if (blockType === 0x21) {
            if (i >= bytes.length) break;
            const extType = bytes[i++];
            if (extType === 0xF9) {
                // Graphic Control Extension
                if (i >= bytes.length) break;
                const blockSize = bytes[i++];
                if (blockSize >= 4 && i + blockSize <= bytes.length) {
                    const delay = bytes[i + 1] | (bytes[i + 2] << 8);
                    // Standard browser convention: delays <= 1 (10ms) default to 100ms
                    totalDurationMs += (delay <= 1 ? 10 : delay) * 10;
                    gceCount++;
                }
                i = skipSubBlocks(bytes, Math.min(bytes.length, i + blockSize));
            } else {
                // Skip other extension blocks (Application, Comment, Plain Text, etc.)
                i = skipSubBlocks(bytes, i);
            }
        } else if (blockType === 0x2C) {
            // Image descriptor
            imageCount++;
            i += 9;
            if (i <= bytes.length && (bytes[i - 1] & 0x80)) {
                // Local Color Table
                const lctSize = 3 * (1 << ((bytes[i - 1] & 0x07) + 1));
                i += lctSize;
            }
            if (i >= bytes.length) break;
            i++; // LZW minimum code size
            i = skipSubBlocks(bytes, i);
        }
    }

    const frames = Math.max(imageCount, gceCount);
    return (totalDurationMs > 0 && frames > 1)
        ? { duration: totalDurationMs, frames }
        : null;
}

/**
 * Parses the total loop duration in milliseconds from a GIF buffer
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @returns {number|null} Total animation duration in milliseconds, or null if invalid/static
 */
export function parseGifDuration(buffer) {
    return parseGifInfo(buffer)?.duration ?? null;
}

/**
 * Converts an animated GIF buffer into a true single-play GIF binary.
 * Strips NETSCAPE2.0 / ANIMEXTS1.0 looping application extensions (including 0-iteration
 * infinite loops or non-standard sub-block layouts) so Chromium/Blink/Wuffs plays every
 * frame strictly once and cleanly holds the final frame instead of wrapping back to Frame 0.
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @returns {Uint8Array} Single-play GIF binary bytes
 */
export function makeGifSinglePlay(buffer) {
    if (!buffer) return new Uint8Array(0);
    const src = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (src.length < 13 || src[0] !== 0x47 || src[1] !== 0x49 || src[2] !== 0x46) {
        return src;
    }

    const headerEnd = getGifGctEndOffset(src);
    const omitRanges = [];
    let i = headerEnd;

    while (i < src.length) {
        const blockStart = i;
        const blockType = src[i++];
        if (blockType === 0x3B) break;

        if (blockType === 0x21) {
            if (i >= src.length) break;
            const extType = src[i++];

            if (extType === 0xF9) {
                if (i >= src.length) break;
                const blockSize = src[i++];
                i = skipSubBlocks(src, Math.min(src.length, i + blockSize));
            } else if (extType === 0xFF) {
                const appLen = i < src.length ? src[i] : 0;
                let isLoopAppExt = false;

                if (appLen === 11 && i + 12 <= src.length) {
                    const app = String.fromCharCode(...src.subarray(i + 1, i + 12));
                    if (app === 'NETSCAPE2.0' || app === 'ANIMEXTS1.0') {
                        isLoopAppExt = true;
                    }
                }

                // Handle both standard sub-blocks (ending in 0x00) and malformed missing-terminator layouts
                const afterAppId = i + 1 + appLen;
                if (
                    isLoopAppExt &&
                    afterAppId + 4 <= src.length &&
                    src[afterAppId] === 0x03 &&
                    src[afterAppId + 1] === 0x01 &&
                    src[afterAppId + 4] !== 0x00 &&
                    (src[afterAppId + 4] === 0x21 || src[afterAppId + 4] === 0x2C || src[afterAppId + 4] === 0x3B)
                ) {
                    i = afterAppId + 4;
                } else {
                    i = skipSubBlocks(src, i);
                }

                if (isLoopAppExt) {
                    omitRanges.push([blockStart, i]);
                }
            } else {
                i = skipSubBlocks(src, i);
            }
        } else if (blockType === 0x2C) {
            i += 9;
            if (i <= src.length && (src[i - 1] & 0x80)) {
                const lctSize = 3 * (1 << ((src[i - 1] & 0x07) + 1));
                i += lctSize;
            }
            if (i >= src.length) break;
            i++; // LZW minimum code size
            i = skipSubBlocks(src, i);
        }
    }

    if (omitRanges.length === 0) {
        return new Uint8Array(src);
    }

    let omitTotal = 0;
    for (const [start, end] of omitRanges) {
        omitTotal += (end - start);
    }

    const out = new Uint8Array(src.length - omitTotal);
    let readPos = 0;
    let writePos = 0;

    for (const [start, end] of omitRanges) {
        if (start > readPos) {
            const slice = src.subarray(readPos, start);
            out.set(slice, writePos);
            writePos += slice.length;
        }
        readPos = end;
    }

    if (readPos < src.length) {
        out.set(src.subarray(readPos), writePos);
    }

    return out;
}

/**
 * Creates a blob: ObjectURL from a GIF buffer or Blob.
 * Each minted blob: URL gives Chromium's Blink engine an independent animation clock at Frame 0.
 * @param {ArrayBuffer|Uint8Array|Blob} buffer
 * @returns {string|null}
 */
export function createGifBlobUrl(buffer) {
    if (!buffer) return null;
    try {
        const blob = buffer instanceof Blob
            ? buffer
            : new Blob([buffer], { type: 'image/gif' });
        return URL.createObjectURL(blob);
    } catch (_) {
        return null;
    }
}

/**
 * Safely revokes a previously created blob: ObjectURL to prevent memory leaks.
 * @param {string|null|undefined} url
 */
export function revokeGifBlobUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('blob:')) return;
    try {
        URL.revokeObjectURL(url);
    } catch (_) {}
}

/**
 * Computes clamped GIF transition timings so short/ultra-short GIFs remain smooth.
 * @param {number} durationMs
 * @param {number} requestedFadeSec
 */
export function computeGifTransitionTimings(durationMs, requestedFadeSec = 1.2) {
    const safeDuration = Math.max(100, Number(durationMs) || 1000);
    const clampedSec = Math.max(0.4, Math.min(2.5, Number(requestedFadeSec) || 1.2));
    const fadeMs = Math.round(clampedSec * 1000);
    const effectiveFadeMs = Math.min(fadeMs, Math.max(250, Math.round(safeDuration * 0.45)));
    const halfDipMs = Math.max(125, Math.round(effectiveFadeMs * 0.5));
    const dipWaitMs = Math.max(150, safeDuration - halfDipMs);
    const crossfadeLeadMs = Math.max(150, safeDuration - effectiveFadeMs, effectiveFadeMs + 48);

    return {
        effectiveFadeMs,
        halfDipMs,
        dipWaitMs,
        crossfadeLeadMs
    };
}

/**
 * Orchestrates frame-accurate GIF 'dip' and 'crossfade' loop transitions using
 * single-play Blob URLs so Blink starts each cycle cleanly at exact Frame 0.
 * Returns a cleanup function that cancels all timers/rAFs and revokes all Blob URLs.
 */
export function startGifLoopTransitions({
    gifData,
    loopMode,
    crossfadeDurationSec = 1.2,
    getSlotImg,
    setSlotSrc,
    setActiveSlot,
    setCrossfading,
    setDipOverlayOpacity
}) {
    if (!gifData || !gifData.duration) return () => {};
    if (loopMode !== 'dip' && loopMode !== 'crossfade') return () => {};

    const duration = gifData.duration;
    const singlePlayBuf = gifData.singlePlayBuffer || gifData.buffer;
    if (!singlePlayBuf) return () => {};

    const { effectiveFadeMs, halfDipMs, dipWaitMs, crossfadeLeadMs } = computeGifTransitionTimings(
        duration,
        crossfadeDurationSec
    );

    let isCancelled = false;
    const activeBlobUrls = new Set();
    const pendingTimeouts = new Set();
    const pendingRafs = new Set();
    const slotUrls = { A: null, B: null };

    const mintBlobUrl = () => {
        const url = createGifBlobUrl(singlePlayBuf);
        if (url) activeBlobUrls.add(url);
        return url;
    };

    const releaseBlobUrl = (url) => {
        if (!url) return;
        activeBlobUrls.delete(url);
        revokeGifBlobUrl(url);
    };

    const scheduleTimeout = (fn, ms) => {
        const id = setTimeout(() => {
            pendingTimeouts.delete(id);
            if (!isCancelled) fn();
        }, ms);
        pendingTimeouts.add(id);
        return id;
    };

    const scheduleRaf = (fn) => {
        const id = requestAnimationFrame(() => {
            pendingRafs.delete(id);
            if (!isCancelled) fn();
        });
        pendingRafs.add(id);
        return id;
    };

    const waitForSlotReady = (slot, expectedUrl) => new Promise((resolve) => {
        const imgEl = getSlotImg?.(slot);
        if (isCancelled || !imgEl) {
            resolve();
            return;
        }
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        const fallbackId = scheduleTimeout(finish, 120);

        const attemptDecode = (tries = 0) => {
            if (isCancelled) {
                clearTimeout(fallbackId);
                pendingTimeouts.delete(fallbackId);
                finish();
                return;
            }
            const currentImg = getSlotImg?.(slot);
            if (!currentImg) {
                clearTimeout(fallbackId);
                pendingTimeouts.delete(fallbackId);
                finish();
                return;
            }
            if (currentImg.src !== expectedUrl && tries < 10) {
                scheduleRaf(() => attemptDecode(tries + 1));
                return;
            }
            if (typeof currentImg.decode === 'function') {
                currentImg.decode()
                    .catch(() => {})
                    .finally(() => {
                        if (isCancelled) {
                            finish();
                            return;
                        }
                        scheduleRaf(() => {
                            clearTimeout(fallbackId);
                            pendingTimeouts.delete(fallbackId);
                            finish();
                        });
                    });
            } else {
                scheduleRaf(() => {
                    clearTimeout(fallbackId);
                    pendingTimeouts.delete(fallbackId);
                    finish();
                });
            }
        };

        scheduleRaf(() => attemptDecode(0));
    });

    if (loopMode === 'dip') {
        const startDipCycle = async () => {
            const initialUrl = mintBlobUrl();
            if (!initialUrl || isCancelled) return;

            slotUrls.A = initialUrl;
            slotUrls.B = null;
            setActiveSlot('A');
            setSlotSrc('A', initialUrl);
            setSlotSrc('B', null);
            setDipOverlayOpacity(0);

            await waitForSlotReady('A', initialUrl);
            if (isCancelled) return;

            const scheduleNextDip = () => {
                if (isCancelled) return;
                scheduleTimeout(() => {
                    if (isCancelled) return;
                    // Transition black dip overlay to opacity: 1 over halfDipMs
                    setDipOverlayOpacity(1);

                    scheduleTimeout(async () => {
                        if (isCancelled) return;
                        // At peak black (overlay === 1): swap to newly minted Blob URL at Frame 0
                        const prevUrl = slotUrls.A;
                        const nextUrl = mintBlobUrl();
                        if (!nextUrl || isCancelled) return;

                        slotUrls.A = nextUrl;
                        setSlotSrc('A', nextUrl);

                        await waitForSlotReady('A', nextUrl);
                        if (isCancelled) return;

                        if (prevUrl && prevUrl !== nextUrl) {
                            releaseBlobUrl(prevUrl);
                        }

                        // Fade black dip overlay back to opacity: 0 over halfDipMs
                        setDipOverlayOpacity(0);
                        scheduleNextDip();
                    }, halfDipMs + 20);
                }, dipWaitMs);
            };

            scheduleNextDip();
        };

        startDipCycle().catch(() => {});
    } else if (loopMode === 'crossfade') {
        const startCrossfadeCycle = async () => {
            const initialUrl = mintBlobUrl();
            if (!initialUrl || isCancelled) return;

            slotUrls.A = initialUrl;
            slotUrls.B = null;
            setCrossfading(false);
            setActiveSlot('A');
            setSlotSrc('A', initialUrl);
            setSlotSrc('B', null);

            await waitForSlotReady('A', initialUrl);
            if (isCancelled) return;
            setCrossfading(true);

            const scheduleNextCrossfade = (currentSlot) => {
                if (isCancelled) return;
                scheduleTimeout(async () => {
                    if (isCancelled) return;

                    const nextSlot = currentSlot === 'A' ? 'B' : 'A';
                    const nextUrl = mintBlobUrl();
                    if (!nextUrl || isCancelled) return;

                    if (slotUrls[nextSlot]) {
                        releaseBlobUrl(slotUrls[nextSlot]);
                    }
                    slotUrls[nextSlot] = nextUrl;
                    setSlotSrc(nextSlot, nextUrl);

                    await waitForSlotReady(nextSlot, nextUrl);
                    if (isCancelled) return;

                    // Simultaneously transition outgoing -> 0 and incoming -> 1
                    setActiveSlot(nextSlot);

                    const outgoingUrl = slotUrls[currentSlot];
                    scheduleTimeout(() => {
                        if (isCancelled) return;
                        if (slotUrls[currentSlot] === outgoingUrl) {
                            slotUrls[currentSlot] = null;
                            releaseBlobUrl(outgoingUrl);
                            setSlotSrc(currentSlot, null);
                        }
                    }, effectiveFadeMs + 30);

                    // Schedule next cycle synced to the moment incoming slot started Frame 0
                    scheduleNextCrossfade(nextSlot);
                }, crossfadeLeadMs);
            };

            scheduleNextCrossfade('A');
        };

        startCrossfadeCycle().catch(() => {});
    }

    return () => {
        isCancelled = true;
        for (const id of pendingTimeouts) {
            clearTimeout(id);
        }
        pendingTimeouts.clear();
        for (const id of pendingRafs) {
            cancelAnimationFrame(id);
        }
        pendingRafs.clear();
        for (const url of activeBlobUrls) {
            revokeGifBlobUrl(url);
        }
        activeBlobUrls.clear();
        slotUrls.A = null;
        slotUrls.B = null;
    };
}

/**
 * Loads GIF data, duration, frame count, and generates raw + single-play buffers & Blobs.
 * Uses Electron IPC when available for zero-CORS local/remote fetches,
 * falling back to browser fetch.
 * @param {string} url 
 * @returns {Promise<{duration: number, frames: number, buffer: Uint8Array, singlePlayBuffer: Uint8Array, singlePlayBlob: Blob, rawBlob: Blob}|null>}
 */
export async function loadGifData(url) {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.split('?')[0].split('#')[0];
    let uint8Array = null;
    let duration = null;
    let frames = 0;

    if (window.electronAPI?.getGifData) {
        try {
            const res = await window.electronAPI.getGifData(cleanUrl);
            if (res && res.success && res.buffer) {
                uint8Array = res.buffer instanceof Uint8Array ? res.buffer : new Uint8Array(res.buffer);
                const info = parseGifInfo(uint8Array);
                duration = res.duration || info?.duration || null;
                frames = info?.frames || res.frames || 0;
            }
        } catch (_) {}
    }

    if (!uint8Array) {
        try {
            const res = await fetch(cleanUrl);
            if (res.ok) {
                const arrayBuf = await res.arrayBuffer();
                uint8Array = new Uint8Array(arrayBuf);
                const info = parseGifInfo(uint8Array);
                duration = info?.duration || null;
                frames = info?.frames || 0;
            }
        } catch (_) {}
    }

    if (!uint8Array || !duration || duration <= 50) return null;

    try {
        const singlePlayBuffer = makeGifSinglePlay(uint8Array);
        const rawBlob = new Blob([uint8Array], { type: 'image/gif' });
        const singlePlayBlob = new Blob([singlePlayBuffer], { type: 'image/gif' });
        return {
            duration,
            frames,
            buffer: uint8Array,
            singlePlayBuffer,
            rawBlob,
            singlePlayBlob
        };
    } catch (_) {
        return null;
    }
}

/**
 * Fetches and parses the animation duration of a GIF URL
 * @param {string} url 
 * @returns {Promise<number|null>} Duration in milliseconds
 */
export async function fetchGifDuration(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        if (window.electronAPI?.getGifDuration) {
            const dur = await window.electronAPI.getGifDuration(url);
            if (dur && typeof dur === 'number' && dur > 100) return dur;
        }
        const data = await loadGifData(url);
        return data?.duration ?? null;
    } catch {
        return null;
    }
}
