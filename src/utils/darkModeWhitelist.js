/**
 * QBrowse Force Dark Mode Whitelist & Domain Matching Engine (Renderer ESM)
 *
 * Provides canonical domain/wildcard normalization, accurate hostname & subdomain
 * matching (preventing substring false positives like github.com -> evilgithub.com),
 * deduplication, and curated editable defaults.
 */

export const DEFAULT_DARK_EXCLUSIONS = [
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
    // Reject all-numeric TLDs (e.g. malformed IP like 1.2.3)
    const tld = labels[labels.length - 1];
    if (/^\d+$/.test(tld)) return false;
    return true;
}

function stripLeadingWww(host) {
    if (!host) return host;
    const lower = host.toLowerCase();
    if (lower.startsWith('www.')) {
        const stripped = lower.slice(4);
        // Only strip www. when a valid multi-label domain remains (avoid turning www.com into com)
        if (stripped.includes('.')) {
            return stripped;
        }
    }
    return lower;
}

/**
 * Extracts a canonical hostname from a full URL or domain string.
 * Returns null for internal browser URLs (qbrowse://, about:, file:, etc.) or invalid strings.
 */
export function extractHostnameFromUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    // Reject internal schemes explicitly
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

/**
 * Normalizes a single whitelist entry from user input.
 * Accepts:
 *  - Bare domains: "GitHub.com", "www.github.com", ".github.com"
 *  - Full URLs: "https://www.github.com:443/Qu-Bi/QBrowse?tab=1#top" -> "github.com"
 *  - Host:port / host/path: "localhost:3000/app" -> "localhost"
 *  - Wildcards: "*.github.com", "https://*.Example.com/path" -> "*.github.com", "*.example.com"
 * Returns canonical normalized string, or null if invalid.
 */
export function normalizeWhitelistEntry(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null;
    let s = rawInput.trim();
    if (!s) return null;

    // Ignore comment lines
    if (s.startsWith('#') || s.startsWith('!') || s.startsWith('//')) return null;
    // Reject whitespace inside an entry
    if (/\s/.test(s)) return null;

    // Reject non-http(s) explicit schemes
    const schemeMatch = s.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)/);
    if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        if (INTERNAL_SCHEMES.has(scheme)) return null;
        if (s.includes('://') && scheme !== 'http:' && scheme !== 'https:') return null;
        // Reject scheme:foo (non-port colon like mailto:, data:, javascript:)
        if (!s.includes('://') && !/^[a-zA-Z0-9.-]+:\d+(?:\/.*)?$/.test(s)) {
            return null;
        }
    }

    // Strip http:// or https:// prefix first so wildcard detection works on https://*.example.com
    s = s.replace(/^https?:\/\//i, '');

    // Strip credentials if present (user:pass@host)
    const slashIdx = s.search(/[/?#]/);
    const authority = slashIdx === -1 ? s : s.slice(0, slashIdx);
    const atIdx = authority.lastIndexOf('@');
    let hostPart = atIdx === -1 ? authority : authority.slice(atIdx + 1);

    // Strip port (:443, :8080)
    hostPart = hostPart.replace(/:\d+$/, '');

    // Detect optional leading wildcard (*.)
    let hasWildcard = false;
    if (hostPart.startsWith('*.')) {
        hasWildcard = true;
        hostPart = hostPart.slice(2);
    }

    // Strip leading/trailing dots (e.g. .github.com or github.com.)
    hostPart = hostPart.replace(/^\.+/, '').replace(/\.+$/, '').toLowerCase();

    // Reject remaining wildcards, invalid chars, or shorthand numeric IPv4s (e.g. "1.2.3" -> "1.2.0.3")
    if (!hostPart || hostPart.includes('*')) return null;
    if (/^[\d.]+$/.test(hostPart) && !isValidIpv4(hostPart)) return null;

    // Normalize via URL parser for punycode / IDN safety
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
        // Disallow overly broad wildcards like *.localhost, *.127.0.0.1, or single-label TLDs (*.com)
        if (canonicalHost === 'localhost' || isValidIpv4(canonicalHost) || !canonicalHost.includes('.')) {
            return null;
        }
        return `*.${canonicalHost}`;
    }

    return canonicalHost;
}

/**
 * Normalizes and deduplicates a whitelist (array or newline/comma-separated string).
 */
export function normalizeWhitelist(input) {
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

/**
 * Checks if a URL or hostname matches any entry in the Force Dark Mode whitelist.
 * Returns detailed match info:
 * {
 *   excluded: boolean,
 *   matchedRule: string | null,
 *   matchType: 'exact' | 'subdomain' | 'wildcard' | null,
 *   hostname: string | null
 * }
 *
 * Matching rules:
 *  - "github.com" matches "github.com", "www.github.com" (exact) AND "gist.github.com" (subdomain).
 *  - "*.github.com" matches "gist.github.com", "a.b.github.com", and "github.com" (wildcard).
 *  - "github.com" NEVER matches "evilgithub.com" or "google.com/search?q=github.com".
 *  - Most specific rule wins (exact match preferred, then longest matching parent/wildcard rule).
 */
export function findDarkModeExclusionMatch(urlOrHost, exclusions) {
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

/**
 * Boolean convenience helper for checking whether a URL is excluded from Force Dark Mode.
 */
export function isUrlExcludedFromDarkMode(urlOrHost, exclusions) {
    return findDarkModeExclusionMatch(urlOrHost, exclusions).excluded;
}

/**
 * Pure helper to add an entry to a whitelist with normalization & duplicate detection.
 */
export function addWhitelistEntry(exclusions, rawInput) {
    const list = normalizeWhitelist(exclusions);
    const entry = normalizeWhitelistEntry(rawInput);
    if (!entry) {
        return { ok: false, reason: 'invalid', entry: null, list };
    }
    if (list.includes(entry)) {
        return { ok: false, reason: 'duplicate', entry, list };
    }
    return { ok: true, reason: 'added', entry, list: [entry, ...list] };
}

/**
 * Pure helper to remove an entry from a whitelist.
 */
export function removeWhitelistEntry(exclusions, target) {
    const list = normalizeWhitelist(exclusions);
    const canonical = normalizeWhitelistEntry(target) || String(target || '').trim().toLowerCase();
    const next = list.filter(item => item !== canonical);
    return {
        removed: next.length !== list.length,
        entry: canonical,
        list: next
    };
}

/**
 * Pure helper to toggle Force Dark Mode exclusion for a given URL.
 * If already excluded (even via parent/wildcard rule), removes the matching rule.
 * Otherwise adds the site's canonical hostname.
 */
export function toggleWhitelistForUrl(exclusions, url) {
    const list = normalizeWhitelist(exclusions);
    const match = findDarkModeExclusionMatch(url, list);
    if (!match.hostname) {
        return { ok: false, excluded: false, action: 'invalid', rule: null, hostname: null, list };
    }
    if (match.excluded && match.matchedRule) {
        const next = list.filter(item => item !== match.matchedRule);
        return {
            ok: true,
            excluded: false,
            action: 'removed',
            rule: match.matchedRule,
            hostname: match.hostname,
            list: next
        };
    }
    const added = addWhitelistEntry(list, match.hostname);
    return {
        ok: true,
        excluded: true,
        action: 'added',
        rule: match.hostname,
        hostname: match.hostname,
        list: added.list
    };
}

/**
 * Returns a fresh copy of the recommended default whitelist.
 */
export function getDefaultDarkExclusions() {
    return [...DEFAULT_DARK_EXCLUSIONS];
}
