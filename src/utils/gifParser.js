/**
 * High-performance binary GIF duration parser for QBrowse
 * Reads GIF89a / GIF87a graphic control extension blocks to compute exact loop durations.
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
        const cleanUrl = url.split('?')[0].split('#')[0];
        const res = await fetch(cleanUrl);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        return parseGifDuration(buf);
    } catch {
        return null;
    }
}

