/**
 * High-performance binary GIF duration parser & loop orchestrator for QBrowse
 * Reads GIF89a / GIF87a graphic control extension blocks to compute exact loop durations.
 * Supports converting infinite-loop GIFs to single-play GIFs to enable silky-smooth,
 * hardware-accelerated cross-dissolve and ambient dip loop transitions.
 * Zero external dependencies. Zero unicode emojis.
 */

/**
 * Parses the total loop duration in milliseconds from a GIF buffer
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @returns {number|null} Total animation duration in milliseconds, or null if invalid/static
 */
export function parseGifDuration(buffer) {
    if (!buffer) return null;
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 13) return null;

    // Header validation: "GIF87a" or "GIF89a"
    if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return null;

    let totalDurationMs = 0;
    let frameCount = 0;
    let i = 13;

    // Check for Global Color Table
    const gctFlag = bytes[10] & 0x80;
    if (gctFlag) {
        const gctSize = 3 * (1 << ((bytes[10] & 0x07) + 1));
        i += gctSize;
    }

    while (i < bytes.length) {
        const blockType = bytes[i++];
        if (blockType === 0x3B) break; // Trailer (EOF)

        if (blockType === 0x21) {
            // Extension block
            const extType = bytes[i++];
            if (extType === 0xF9) {
                // Graphic Control Extension
                const blockSize = bytes[i++];
                if (blockSize >= 4) {
                    const delay = bytes[i + 1] | (bytes[i + 2] << 8);
                    // Standard browser convention: delays <= 1 (10ms) default to 100ms
                    totalDurationMs += (delay <= 1 ? 10 : delay) * 10;
                    frameCount++;
                }
                i += blockSize;
                while (i < bytes.length && bytes[i] !== 0) {
                    i += bytes[i] + 1;
                }
                if (i < bytes.length) i++;
            } else {
                // Skip other extension blocks (Application, Comment, etc.)
                while (i < bytes.length && bytes[i] !== 0) {
                    i += bytes[i] + 1;
                }
                if (i < bytes.length) i++;
            }
        } else if (blockType === 0x2C) {
            // Image descriptor
            i += 9;
            if (i < bytes.length && (bytes[i - 1] & 0x80)) {
                // Local Color Table
                const lctSize = 3 * (1 << ((bytes[i - 1] & 0x07) + 1));
                i += lctSize;
            }
            i++; // LZW minimum code size
            while (i < bytes.length && bytes[i] !== 0) {
                i += bytes[i] + 1;
            }
            if (i < bytes.length) i++;
        }
    }

    return (totalDurationMs > 0 && frameCount > 1) ? totalDurationMs : null;
}

/**
 * Patches or injects Netscape 2.0 application extension to configure loop count = 1.
 * In Chromium / WebKit, a GIF with loop count = 1 plays all frames exactly once
 * and cleanly stops/holds the final frame instead of abruptly snapping back to frame 0.
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @returns {Uint8Array} Single-play GIF binary bytes
 */
export function makeGifSinglePlay(buffer) {
    const src = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (src.length < 13 || src[0] !== 0x47 || src[1] !== 0x49 || src[2] !== 0x46) {
        return src;
    }
    const bytes = new Uint8Array(src);

    // Scan for existing NETSCAPE2.0 or ANIMEXTS1.0 application extension
    for (let i = 0; i < bytes.length - 18; i++) {
        if (bytes[i] === 0x21 && bytes[i + 1] === 0xFF && bytes[i + 2] === 0x0B) {
            const app = String.fromCharCode(...bytes.slice(i + 3, i + 14));
            if (app === 'NETSCAPE2.0' || app === 'ANIMEXTS1.0') {
                if (bytes[i + 14] === 0x03 && bytes[i + 15] === 0x01) {
                    bytes[i + 16] = 0x01; // loop count low byte = 1
                    bytes[i + 17] = 0x00; // loop count high byte = 0
                    return bytes;
                }
            }
        }
    }

    // If no Netscape block exists, insert a 19-byte block right after the Global Color Table
    let insertPos = 13;
    const gctFlag = bytes[10] & 0x80;
    if (gctFlag) {
        const gctSize = 3 * (1 << ((bytes[10] & 0x07) + 1));
        insertPos += gctSize;
    }

    const netscapeBlock = new Uint8Array([
        0x21, 0xFF, 0x0B,
        0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, // NETSCAPE2.0
        0x03, 0x01, 0x01, 0x00, 0x00 // sub-block: loop count = 1, term = 0
    ]);

    const out = new Uint8Array(bytes.length + netscapeBlock.length);
    out.set(bytes.subarray(0, insertPos), 0);
    out.set(netscapeBlock, insertPos);
    out.set(bytes.subarray(insertPos), insertPos + netscapeBlock.length);
    return out;
}

/**
 * Loads GIF data, duration, and generates single-play and raw Blobs
 * Uses Electron IPC when available for zero-CORS local/remote fetches,
 * falling back to browser fetch.
 * @param {string} url 
 * @returns {Promise<{duration: number, singlePlayBlob: Blob, rawBlob: Blob}|null>}
 */
export async function loadGifData(url) {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.split('?')[0].split('#')[0];
    let uint8Array = null;
    let duration = null;

    if (window.electronAPI?.getGifData) {
        try {
            const res = await window.electronAPI.getGifData(cleanUrl);
            if (res && res.success && res.buffer) {
                uint8Array = res.buffer instanceof Uint8Array ? res.buffer : new Uint8Array(res.buffer);
                duration = res.duration || parseGifDuration(uint8Array);
            }
        } catch (_) {}
    }

    if (!uint8Array) {
        try {
            const res = await fetch(cleanUrl);
            if (res.ok) {
                const arrayBuf = await res.arrayBuffer();
                uint8Array = new Uint8Array(arrayBuf);
                duration = parseGifDuration(uint8Array);
            }
        } catch (_) {}
    }

    if (!uint8Array || !duration || duration <= 50) return null;

    try {
        const rawBlob = new Blob([uint8Array], { type: 'image/gif' });
        return {
            duration,
            rawBlob
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
