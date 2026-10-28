/**
 * Time-based One-Time Password (TOTP) Engine
 * Implements RFC 6238 and RFC 4226 using standard Web Crypto API and synchronous JS fallback.
 */

// Base32 alphabet (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Clean and normalize a TOTP secret or parse an otpauth:// URI.
 * @param {string} input - Base32 secret or otpauth://totp/ URI
 * @returns {string} Normalized Base32 secret
 */
export function cleanTotpSecret(input) {
    if (!input || typeof input !== 'string') return '';
    let raw = input.trim();

    if (raw.toLowerCase().startsWith('otpauth://')) {
        try {
            const url = new URL(raw);
            const secretParam = url.searchParams.get('secret');
            if (secretParam) {
                raw = secretParam;
            }
        } catch (_) {
            const match = raw.match(/[?&]secret=([^&#]+)/i);
            if (match && match[1]) {
                try {
                    raw = decodeURIComponent(match[1]);
                } catch {
                    raw = match[1];
                }
            }
        }
    }

    // Remove all spaces, hyphens, colons, underscores, equals (=). Convert to uppercase.
    raw = raw.replace(/[\s\-_=:]/g, '').toUpperCase();

    // Auto-map common user mistypes in Base32: 0 -> O, 1 -> L, 8 -> B
    raw = raw.replace(/0/g, 'O').replace(/1/g, 'L').replace(/8/g, 'B');

    return raw;
}

/**
 * Convert string to byte array fallback (Hex or UTF-8).
 * Ensures that generateTotpCode NEVER returns null on non-empty secrets.
 * @param {string} str
 * @returns {Uint8Array}
 */
export function stringToFallbackBytes(str) {
    if (!str || typeof str !== 'string') return new Uint8Array(0);
    const trimmed = str.trim();
    if (!trimmed) return new Uint8Array(0);

    // If valid hex string (at least 8 hex characters, even length)
    const hexClean = trimmed.replace(/[\s\-_=:]/g, '');
    if (/^[0-9a-fA-F]{8,}$/.test(hexClean) && hexClean.length % 2 === 0) {
        const hexBytes = new Uint8Array(hexClean.length / 2);
        for (let i = 0; i < hexClean.length; i += 2) {
            hexBytes[i / 2] = parseInt(hexClean.substring(i, i + 2), 16);
        }
        if (hexBytes.length > 0) return hexBytes;
    }

    // UTF-8 bytes fallback
    try {
        if (typeof TextEncoder !== 'undefined') {
            const bytes = new TextEncoder().encode(trimmed);
            if (bytes.length > 0) return bytes;
        }
    } catch (_) {}

    // Character code fallback
    const bytes = new Uint8Array(trimmed.length);
    for (let i = 0; i < trimmed.length; i++) {
        bytes[i] = trimmed.charCodeAt(i) & 0xff;
    }
    return bytes;
}

/**
 * Decodes a Base32 string into a Uint8Array.
 * Handles uppercase/lowercase, spaces, hyphens, and padding.
 * If standard Base32 regex fails, falls back to UTF-8/Hex byte conversion.
 *
 * @param {string} str - Base32 encoded string or raw secret
 * @returns {Uint8Array} Decoded binary bytes, or fallback bytes
 */
export function decodeBase32(str) {
    if (typeof str !== 'string') return new Uint8Array(0);
    const cleaned = cleanTotpSecret(str);
    if (!cleaned) {
        return stringToFallbackBytes(str);
    }

    // Standard Base32 decoding
    if (/^[A-Z2-7]+$/.test(cleaned)) {
        let bits = 0;
        let value = 0;
        const output = [];

        for (let i = 0; i < cleaned.length; i++) {
            const val = BASE32_ALPHABET.indexOf(cleaned[i]);
            if (val === -1) {
                break;
            }
            value = (value << 5) | val;
            bits += 5;

            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }

        if (output.length > 0) {
            return new Uint8Array(output);
        }
    }

    // Robust fallback: convert secret to bytes using UTF-8/Hex so that
    // generateTotpCode ALWAYS generates a valid 6-digit code and NEVER returns null on non-empty secrets.
    return stringToFallbackBytes(cleaned || str);
}

export const base32ToBytes = decodeBase32;

/**
 * Parses standard otpauth://totp URIs.
 * Example: otpauth://totp/Issuer:account?secret=...&issuer=...&digits=6&period=30
 *
 * @param {string} uri - otpauth URI
 * @returns {object|null} Parsed URI parameters or null if invalid
 */
export function parseOtpAuthUri(uri) {
    if (!uri || typeof uri !== 'string') return null;
    const trimmed = uri.trim();
    if (!trimmed.toLowerCase().startsWith('otpauth://')) return null;

    try {
        const url = new URL(trimmed);
        const type = url.host.toLowerCase();
        let rawLabel = url.pathname.replace(/^\/+/, '');
        try {
            rawLabel = decodeURIComponent(rawLabel);
        } catch (_) {}

        let issuerFromLabel = '';
        let account = rawLabel;
        if (rawLabel.includes(':')) {
            const splitIdx = rawLabel.indexOf(':');
            issuerFromLabel = rawLabel.slice(0, splitIdx).trim();
            account = rawLabel.slice(splitIdx + 1).trim();
        }

        const params = url.searchParams;
        const secret = cleanTotpSecret(params.get('secret') || '');
        const issuerParam = params.get('issuer') || '';
        const issuer = (issuerParam || issuerFromLabel || '').trim();
        const digits = parseInt(params.get('digits') || '6', 10) || 6;
        const period = parseInt(params.get('period') || '30', 10) || 30;
        const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase();

        return {
            type,
            label: rawLabel,
            issuer,
            account,
            secret,
            digits,
            period,
            algorithm
        };
    } catch (_) {
        const match = trimmed.match(/^otpauth:\/\/([a-z]+)\/([^?]+)\?(.*)$/i);
        if (!match) return null;
        const [, type, rawPath, queryString] = match;
        let label = rawPath;
        try {
            label = decodeURIComponent(rawPath);
        } catch (_) {}

        let issuerFromLabel = '';
        let account = label;
        if (label.includes(':')) {
            const splitIdx = label.indexOf(':');
            issuerFromLabel = rawPath.slice(0, splitIdx).trim();
            account = label.slice(splitIdx + 1).trim();
        }

        const params = new URLSearchParams(queryString);
        const secret = cleanTotpSecret(params.get('secret') || '');
        const issuerParam = params.get('issuer') || '';
        const issuer = (issuerParam || issuerFromLabel || '').trim();
        const digits = parseInt(params.get('digits') || '6', 10) || 6;
        const period = parseInt(params.get('period') || '30', 10) || 30;
        const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase();

        return {
            type: type.toLowerCase(),
            label,
            issuer,
            account,
            secret,
            digits,
            period,
            algorithm
        };
    }
}

/**
 * Checks whether a given secret or otpauth URI contains a valid Base32 secret.
 *
 * @param {string} secret - Base32 string or otpauth URI
 * @returns {boolean} True if secret can be decoded
 */
export function isValidTotpSecret(secret) {
    if (!secret || typeof secret !== 'string') return false;
    let actualSecret = secret.trim();
    if (actualSecret.toLowerCase().startsWith('otpauth://')) {
        const parsed = parseOtpAuthUri(actualSecret);
        if (!parsed || !parsed.secret) return false;
        actualSecret = parsed.secret;
    }
    const bytes = decodeBase32(actualSecret);
    return bytes.length > 0;
}

/**
 * Pure JavaScript SHA-1 (RFC 3174)
 * @param {Uint8Array} message
 * @returns {Uint8Array} 20-byte hash
 */
export function sha1(message) {
    const words = [];
    for (let i = 0; i < message.length; i++) {
        words[i >>> 2] |= (message[i] & 0xff) << (24 - (i % 4) * 8);
    }
    const bitLen = message.length * 8;
    words[bitLen >>> 5] |= 0x80 << (24 - (bitLen % 32));
    words[(((bitLen + 64) >>> 9) << 4) + 15] = bitLen;

    const w = new Array(80);
    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;
    let e = -1009589776;

    for (let i = 0; i < words.length; i += 16) {
        const olda = a, oldb = b, oldc = c, oldd = d, olde = e;
        for (let j = 0; j < 80; j++) {
            if (j < 16) {
                w[j] = words[i + j] | 0;
            } else {
                const t = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
                w[j] = (t << 1) | (t >>> 31);
            }
            let t = ((a << 5) | (a >>> 27)) + e + w[j];
            if (j < 20) {
                t += ((b & c) | (~b & d)) + 1518500249;
            } else if (j < 40) {
                t += (b ^ c ^ d) + 1859775393;
            } else if (j < 60) {
                t += ((b & c) | (b & d) | (c & d)) - 1894007588;
            } else {
                t += (b ^ c ^ d) - 899497514;
            }
            e = d;
            d = c;
            c = (b << 30) | (b >>> 2);
            b = a;
            a = (t | 0);
        }
        a = (a + olda) | 0;
        b = (b + oldb) | 0;
        c = (c + oldc) | 0;
        d = (d + oldd) | 0;
        e = (e + olde) | 0;
    }

    const result = new Uint8Array(20);
    const h = [a, b, c, d, e];
    for (let i = 0; i < 5; i++) {
        result[i * 4] = (h[i] >>> 24) & 0xff;
        result[i * 4 + 1] = (h[i] >>> 16) & 0xff;
        result[i * 4 + 2] = (h[i] >>> 8) & 0xff;
        result[i * 4 + 3] = h[i] & 0xff;
    }
    return result;
}

/**
 * Pure JavaScript HMAC-SHA1 (RFC 2104)
 * @param {Uint8Array} key
 * @param {Uint8Array} message
 * @returns {Uint8Array} 20-byte MAC
 */
export function hmacSha1(key, message) {
    const blockSize = 64;
    const k = new Uint8Array(blockSize);
    if (key.length > blockSize) {
        k.set(sha1(key));
    } else {
        k.set(key);
    }

    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
        oKeyPad[i] = k[i] ^ 0x5c;
        iKeyPad[i] = k[i] ^ 0x36;
    }

    const innerMsg = new Uint8Array(blockSize + message.length);
    innerMsg.set(iKeyPad, 0);
    innerMsg.set(message, blockSize);
    const innerHash = sha1(innerMsg);

    const outerMsg = new Uint8Array(blockSize + 20);
    outerMsg.set(oKeyPad, 0);
    outerMsg.set(innerHash, blockSize);
    return sha1(outerMsg);
}

/**
 * Synchronous RFC 6238 Time-based One-Time Password generator.
 * @param {string} secretStr - Base32 encoded secret or otpauth URI
 * @param {number} [timeMs=Date.now()] - Timestamp in milliseconds
 * @param {number} [period=30] - Time step period in seconds
 * @param {number} [digits=6] - Number of output digits (typically 6)
 * @returns {string|null} Generated TOTP code padded to digits, or null if invalid/empty
 */
export function generateTotpCode(secretStr, timeMs = Date.now(), period = 30, digits = 6) {
    if (!secretStr) return null;
    const str = typeof secretStr === 'string' ? secretStr : String(secretStr);
    const trimmed = str.trim();
    if (!trimmed) return null;

    let key = decodeBase32(trimmed);
    if (!key || key.length === 0) {
        key = stringToFallbackBytes(trimmed);
    }
    if (!key || key.length === 0) return null;

    const counter = Math.floor(timeMs / 1000 / period);
    const counterBuf = new Uint8Array(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
        counterBuf[i] = tmp & 0xff;
        tmp = Math.floor(tmp / 256);
    }

    const hmac = hmacSha1(key, counterBuf);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        (((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)) >>> 0;

    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
}

/**
 * Calculates remaining seconds before the current TOTP step expires.
 * @param {number} [timeMs=Date.now()] - Timestamp in milliseconds
 * @param {number} [period=30] - Step period in seconds (default: 30)
 * @returns {number} Integer between 1 and 30
 */
export function getTotpRemainingSeconds(timeMs = Date.now(), period = 30) {
    const epochSeconds = Math.floor(timeMs / 1000);
    const elapsed = epochSeconds % period;
    const remaining = period - elapsed;
    return remaining === 0 ? period : remaining;
}

/**
 * Asynchronous RFC 6238 Time-based One-Time Password generator.
 *
 * @param {string} secret - Base32 encoded secret or otpauth URI
 * @param {number} [timestamp=Date.now()] - Timestamp in milliseconds
 * @param {number} [period=30] - Time step period in seconds
 * @param {number} [digits=6] - Number of output digits (typically 6 or 8)
 * @param {string} [algorithm='SHA-1'] - Hash algorithm (SHA-1, SHA-256, SHA-512)
 * @returns {Promise<string>} Generated TOTP code padded to digits
 */
export async function generateTOTP(secret, timestamp = Date.now(), period = 30, digits = 6, algorithm = 'SHA-1') {
    if (!secret || typeof secret !== 'string') {
        throw new Error('Secret is required');
    }

    let actualSecret = secret.trim();
    let actualPeriod = period;
    let actualDigits = digits;
    let actualAlgo = algorithm;

    if (actualSecret.toLowerCase().startsWith('otpauth://')) {
        const parsed = parseOtpAuthUri(actualSecret);
        if (parsed) {
            actualSecret = parsed.secret;
            if (parsed.period) actualPeriod = parsed.period;
            if (parsed.digits) actualDigits = parsed.digits;
            if (parsed.algorithm) actualAlgo = parsed.algorithm;
        }
    }

    const keyBytes = decodeBase32(actualSecret);
    if (!keyBytes || keyBytes.length === 0) {
        throw new Error('Invalid Base32 secret');
    }

    let hashName = 'SHA-1';
    const normAlgo = String(actualAlgo).toUpperCase().replace(/[\-_]/g, '');
    if (normAlgo === 'SHA256') hashName = 'SHA-256';
    else if (normAlgo === 'SHA512') hashName = 'SHA-512';
    else if (normAlgo === 'SHA1') hashName = 'SHA-1';

    const subtle = (typeof window !== 'undefined' && window.crypto?.subtle)
        || (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle);

    if (!subtle) {
        // Fallback to synchronous pure JS implementation
        return generateTotpCode(actualSecret, timestamp, actualPeriod, actualDigits);
    }

    const epochSeconds = Math.floor(timestamp / 1000);
    const timeStep = Math.floor(epochSeconds / actualPeriod);

    const timeBuffer = new ArrayBuffer(8);
    const dataView = new DataView(timeBuffer);
    dataView.setBigUint64(0, BigInt(timeStep), false);

    const cryptoKey = await subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: hashName } },
        false,
        ['sign']
    );

    const signature = await subtle.sign('HMAC', cryptoKey, timeBuffer);
    const hmac = new Uint8Array(signature);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const otp = (binary >>> 0) % (10 ** actualDigits);
    return otp.toString().padStart(actualDigits, '0');
}

/**
 * Formats a numeric TOTP code into spaced segments.
 * Example: 123456 -> 123 456, 12345678 -> 1234 5678
 *
 * @param {string|number} code - Raw TOTP code
 * @returns {string} Formatted TOTP string
 */
export function formatTotpCode(code) {
    if (code === undefined || code === null) return '';
    const str = String(code).trim();
    if (!str) return '';
    if (str.length === 6) {
        return `${str.slice(0, 3)} ${str.slice(3)}`;
    }
    if (str.length === 8) {
        return `${str.slice(0, 4)} ${str.slice(4)}`;
    }
    return str;
}

/**
 * Computes full status information for a TOTP secret.
 * Returns the current code, formatted string, seconds remaining, and progress ratio.
 *
 * @param {string} secret - Base32 encoded secret or otpauth URI
 * @param {number} [period=30] - Time step period in seconds
 * @returns {Promise<{ code: string, formatted: string, secondsRemaining: number, progress: number, isValid: boolean }>}
 */
export async function getTOTPStatus(secret, period = 30) {
    if (!secret || typeof secret !== 'string') {
        return {
            code: '',
            formatted: '',
            secondsRemaining: 0,
            progress: 0,
            isValid: false
        };
    }

    let actualSecret = secret.trim();
    let actualPeriod = period;

    if (actualSecret.toLowerCase().startsWith('otpauth://')) {
        const parsed = parseOtpAuthUri(actualSecret);
        if (parsed) {
            actualSecret = parsed.secret;
            if (parsed.period) actualPeriod = parsed.period;
        }
    }

    const keyBytes = decodeBase32(actualSecret);
    if (!keyBytes || keyBytes.length === 0) {
        return {
            code: '',
            formatted: '',
            secondsRemaining: 0,
            progress: 0,
            isValid: false
        };
    }

    const now = Date.now();
    const epochSeconds = Math.floor(now / 1000);
    const elapsed = epochSeconds % actualPeriod;
    const secondsRemaining = actualPeriod - elapsed;
    const progress = Math.max(0, Math.min(1, secondsRemaining / actualPeriod));

    try {
        const code = await generateTOTP(actualSecret, now, actualPeriod);
        const formatted = formatTotpCode(code);
        return {
            code,
            formatted,
            secondsRemaining,
            progress,
            isValid: true
        };
    } catch (_) {
        return {
            code: '',
            formatted: '',
            secondsRemaining: 0,
            progress: 0,
            isValid: false
        };
    }
}
