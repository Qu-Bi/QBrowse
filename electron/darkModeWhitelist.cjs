/**
 * QBrowse Force Dark Mode Whitelist & Luminance Helpers (Electron CommonJS)
 *
 * Mirrors src/utils/darkModeWhitelist.js for the Electron main process so
 * URL/subdomain/wildcard matching and defaults are 100% consistent across
 * renderer, webviews, and OAuth popups, plus pure color/luminance helpers.
 */

const DEFAULT_DARK_EXCLUSIONS = [
    'youtube.com',
    'github.com',
    'figma.com',
    'mail.google.com',
    'discord.com',
    'twitch.tv',
    'spotify.com',
    'netflix.com',
    'x.com',
    'twitter.com',
    'reddit.com',
    'chatgpt.com',
    'claude.ai',
    'notion.so',
    'linear.app',
    'vercel.com',
    'dribbble.com',
    'unsplash.com'
];

const INTERNAL_SCHEMES = new Set([
    'about:',
    'qbrowse:',
    'chrome:',
    'chrome-extension:',
    'devtools:',
    'data:',
    'blob:',
    'javascript:',
    'mailto:',
    'tel:',
    'file:',
    'view-source:'
]);

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function isValidIpv4(host) {
    return IPV4_REGEX.test(host);
}

function isValidDomainHost(host) {
    if (!host || host.length > 253) return false;
    if (host === 'localhost') return true;
    if (isValidIpv4(host)) return true;

    const labels = host.split('.');
    if (labels.length < 2) return false;
    for (const label of labels) {
        if (!DOMAIN_LABEL_REGEX.test(label)) return false;
    }
    const tld = labels[labels.length - 1];
    if (/^\d+$/.test(tld)) return false;
    return true;
}

function stripLeadingWww(host) {
    if (!host) return host;
    const lower = host.toLowerCase();
    if (lower.startsWith('www.')) {
        const stripped = lower.slice(4);
        if (stripped.includes('.')) {
            return stripped;
        }
    }
    return lower;
}

function extractHostnameFromUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)/);
    if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        if (INTERNAL_SCHEMES.has(scheme)) return null;
        if (scheme !== 'http:' && scheme !== 'https:') return null;
    }

    let host = '';
    try {
        const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
            ? trimmed
            : `https://${trimmed}`;
        const parsed = new URL(withScheme);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        host = (parsed.hostname || '').toLowerCase();
    } catch (_) {
        return null;
    }

    host = host.replace(/\.+$/, '');
    host = stripLeadingWww(host);
    if (!isValidDomainHost(host)) return null;
    return host;
}

function normalizeWhitelistEntry(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null;
    let s = rawInput.trim();
    if (!s) return null;

    if (s.startsWith('#') || s.startsWith('!') || s.startsWith('//')) return null;
    if (/\s/.test(s)) return null;

    const schemeMatch = s.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)/);
    if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        if (INTERNAL_SCHEMES.has(scheme)) return null;
        if (s.includes('://') && scheme !== 'http:' && scheme !== 'https:') return null;
        if (!s.includes('://') && !/^[a-zA-Z0-9.-]+:\d+(?:\/.*)?$/.test(s)) {
            return null;
        }
    }

    s = s.replace(/^https?:\/\//i, '');

    const slashIdx = s.search(/[/?#]/);
    const authority = slashIdx === -1 ? s : s.slice(0, slashIdx);
    const atIdx = authority.lastIndexOf('@');
    let hostPart = atIdx === -1 ? authority : authority.slice(atIdx + 1);

    hostPart = hostPart.replace(/:\d+$/, '');

    let hasWildcard = false;
    if (hostPart.startsWith('*.')) {
        hasWildcard = true;
        hostPart = hostPart.slice(2);
    }

    hostPart = hostPart.replace(/^\.+/, '').replace(/\.+$/, '').toLowerCase();
    if (!hostPart || hostPart.includes('*')) return null;
    if (/^[\d.]+$/.test(hostPart) && !isValidIpv4(hostPart)) return null;

    let canonicalHost = hostPart;
    try {
        const parsed = new URL(`https://${hostPart}`);
        canonicalHost = (parsed.hostname || '').replace(/\.+$/, '').toLowerCase();
    } catch (_) {
        return null;
    }

    canonicalHost = stripLeadingWww(canonicalHost);
    if (!isValidDomainHost(canonicalHost)) return null;

    if (hasWildcard) {
        if (canonicalHost === 'localhost' || isValidIpv4(canonicalHost) || !canonicalHost.includes('.')) {
            return null;
        }
        return `*.${canonicalHost}`;
    }

    return canonicalHost;
}

function normalizeWhitelist(input) {
    const items = Array.isArray(input)
        ? input
        : (typeof input === 'string' ? input.split(/[\n,]+/) : []);

    const seen = new Set();
    const result = [];
    for (const raw of items) {
        const normalized = normalizeWhitelistEntry(raw);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            result.push(normalized);
        }
    }
    return result;
}

function findDarkModeExclusionMatch(urlOrHost, exclusions) {
    const hostname = extractHostnameFromUrl(urlOrHost);
    if (!hostname || !Array.isArray(exclusions) || exclusions.length === 0) {
        return { excluded: false, matchedRule: null, matchType: null, hostname };
    }

    let bestMatch = null;
    let bestScore = -1;

    for (const rawRule of exclusions) {
        const rule = normalizeWhitelistEntry(rawRule);
        if (!rule) continue;

        const isWildcard = rule.startsWith('*.');
        const baseDomain = isWildcard ? rule.slice(2) : rule;

        let matchType = null;
        let score = -1;

        if (!isWildcard && hostname === baseDomain) {
            matchType = 'exact';
            score = 10000 + baseDomain.length;
        } else if (isWildcard && (hostname === baseDomain || hostname.endsWith(`.${baseDomain}`))) {
            matchType = 'wildcard';
            score = 5000 + baseDomain.length;
        } else if (!isWildcard && hostname.endsWith(`.${baseDomain}`)) {
            matchType = 'subdomain';
            score = 1000 + baseDomain.length;
        }

        if (matchType && score > bestScore) {
            bestScore = score;
            bestMatch = {
                excluded: true,
                matchedRule: rule,
                matchType,
                hostname
            };
        }
    }

    return bestMatch || { excluded: false, matchedRule: null, matchType: null, hostname };
}

function isUrlExcludedFromDarkMode(urlOrHost, exclusions) {
    return findDarkModeExclusionMatch(urlOrHost, exclusions).excluded;
}

/**
 * Pure CSS color parser supporting rgb(), rgba(), space-separated rgb(r g b / a),
 * and CSS Color 4 color(srgb r g b / a). Returns { r, g, b, a } or null if transparent/unparseable.
 */
function parseCssColor(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim().toLowerCase();
    if (!trimmed || trimmed === 'transparent' || trimmed === 'none') return null;

    // Handle color(srgb r g b [/ a]) where r,g,b are 0..1
    const srgbMatch = trimmed.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
    if (srgbMatch) {
        let a = 1;
        if (srgbMatch[4] !== undefined) {
            a = srgbMatch[4].endsWith('%') ? parseFloat(srgbMatch[4]) / 100 : parseFloat(srgbMatch[4]);
        }
        if (!Number.isFinite(a) || a < 0.25) return null;
        return {
            r: Math.max(0, Math.min(255, parseFloat(srgbMatch[1]) * 255)),
            g: Math.max(0, Math.min(255, parseFloat(srgbMatch[2]) * 255)),
            b: Math.max(0, Math.min(255, parseFloat(srgbMatch[3]) * 255)),
            a: Math.max(0, Math.min(1, a))
        };
    }

    // Handle rgb(...) / rgba(...) with comma or space+slash syntax
    if (trimmed.startsWith('rgb')) {
        const nums = trimmed.match(/[\d.]+%?/g);
        if (!nums || nums.length < 3) return null;
        const parseChannel = (token) => {
            if (token.endsWith('%')) return (parseFloat(token) / 100) * 255;
            return parseFloat(token);
        };
        let a = 1;
        if (nums.length >= 4) {
            a = nums[3].endsWith('%') ? parseFloat(nums[3]) / 100 : parseFloat(nums[3]);
        }
        if (!Number.isFinite(a) || a < 0.25) return null;
        const r = parseChannel(nums[0]);
        const g = parseChannel(nums[1]);
        const b = parseChannel(nums[2]);
        if (![r, g, b].every(Number.isFinite)) return null;
        return {
            r: Math.max(0, Math.min(255, r)),
            g: Math.max(0, Math.min(255, g)),
            b: Math.max(0, Math.min(255, b)),
            a: Math.max(0, Math.min(1, a))
        };
    }

    return null;
}

/**
 * Computes perceived luminance (0..1) of a parsed { r, g, b, a } color,
 * compositing semi-transparent colors over a light (#fff) backdrop to prevent
 * subtle dark overlays (like rgba(0, 0, 0, 0.3)) from falsely registering as black.
 */
function getCompositedLuminance(color, backdrop = 255) {
    if (!color) return 1;
    const a = typeof color.a === 'number' ? color.a : 1;
    const r = color.r * a + backdrop * (1 - a);
    const g = color.g * a + backdrop * (1 - a);
    const b = color.b * a + backdrop * (1 - a);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Pure native dark-mode detector (mirrored in webview_preload.cjs) so it can be
 * thoroughly unit-tested in Node against all edge cases.
 */
function evaluateNativeDarkSignals({
    metaColorScheme = '',
    computedColorScheme = '',
    prefersDarkMedia = false,
    hasDarkAttrOrClass = false,
    backgroundLayers = [], // ordered paint-top -> bottom: [{ bg, isInjectedHtmlBg }]
    bodyTextColor = ''
} = {}) {
    const metaNorm = String(metaColorScheme || '').toLowerCase().trim();
    const cssSchemeNorm = String(computedColorScheme || '').toLowerCase().trim();

    // 1. Explicit strict dark declaration via <meta name="color-scheme"> or CSS color-scheme
    if (
        metaNorm === 'dark' || metaNorm === 'only dark' ||
        cssSchemeNorm === 'dark' || cssSchemeNorm === 'only dark'
    ) {
        return true;
    }

    // 2. Explicit dark theme attribute or class on html/body
    if (hasDarkAttrOrClass) {
        return true;
    }

    // 3. Inspect opaque painted background layers in top-to-bottom visual order
    // (SPA root / main -> body -> html). First painted opaque layer determines canvas tone.
    let foundExplicitBackground = false;
    for (const layer of backgroundLayers) {
        if (!layer || !layer.bg) continue;
        const parsed = typeof layer.bg === 'string' ? parseCssColor(layer.bg) : layer.bg;
        if (!parsed) continue;
        // Skip QBrowse's own pre-inversion #ffffff canvas ONLY on html when active
        if (layer.isInjectedHtmlBg && parsed.r === 255 && parsed.g === 255 && parsed.b === 255 && parsed.a >= 0.99) {
            continue;
        }
        foundExplicitBackground = true;
        const lum = getCompositedLuminance(parsed, 255);
        return lum < 0.38;
    }

    // 4. Dual color-scheme ("light dark" / "dark light") + prefers-color-scheme: dark + no explicit light bg
    // Chromium paints its native dark Canvas (#121212) when page declares dark support without overriding bg.
    const declaresDarkSupport =
        /\bdark\b/.test(metaNorm) || /\bdark\b/.test(cssSchemeNorm);
    if (!foundExplicitBackground && declaresDarkSupport && prefersDarkMedia) {
        return true;
    }

    // 5. Fallback: if all root backgrounds are transparent, light foreground text implies dark canvas
    if (!foundExplicitBackground && bodyTextColor) {
        const fg = typeof bodyTextColor === 'string' ? parseCssColor(bodyTextColor) : bodyTextColor;
        if (fg && getCompositedLuminance(fg, 0) > 0.72) {
            return true;
        }
    }

    return false;
}

module.exports = {
    DEFAULT_DARK_EXCLUSIONS,
    extractHostnameFromUrl,
    normalizeWhitelistEntry,
    normalizeWhitelist,
    findDarkModeExclusionMatch,
    isUrlExcludedFromDarkMode,
    parseCssColor,
    getCompositedLuminance,
    evaluateNativeDarkSignals
};
