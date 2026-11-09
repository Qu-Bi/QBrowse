/**
 * QBrowse Adblock URL & Domain Parser
 * 
 * Provides robust auto URL parsing, domain extraction, GitHub URL normalization,
 * and high-throughput community blocklist parsing (hosts, ABP filter rules, plain domains).
 */

/**
 * Normalizes and extracts a clean, valid domain name from any input format:
 * - Full URLs: https://ads.example.com:8080/path?query=1#hash -> ads.example.com
 * - Hosts file lines: 0.0.0.0 tracking.evil.com # comment -> tracking.evil.com
 * - Adblock / ABP syntax: ||doubleclick.net^ or ||analytics.com$third-party -> doubleclick.net
 * - Wildcards: *.sub.domain.org -> sub.domain.org
 * - Space/port/trailing dot cleanup
 */
export function cleanDomain(input) {
    if (!input || typeof input !== 'string') return null;
    let s = input.trim();
    if (!s) return null;

    // 1. Strip trailing inline comments (#, !, //)
    const commentIdx = s.search(/[\s\t]+(#|!|\/\/)/);
    if (commentIdx !== -1) {
        s = s.slice(0, commentIdx).trim();
    }
    if (!s || s.startsWith('#') || s.startsWith('!') || s.startsWith('[') || s.startsWith(';')) {
        return null;
    }

    // 2. Strip hosts file IP prefix: 0.0.0.0, 127.0.0.1, ::1
    s = s.replace(/^(?:0\.0\.0\.0|127\.0\.0\.1|::1)\s+/, '').trim();

    // 3. Strip Adblock / ABP rule syntax: ||domain.com^ or ||domain.com$third-party
    if (s.startsWith('||')) {
        s = s.slice(2);
    }
    // Remove trailing ABP modifiers: ^, $, etc.
    const caretIdx = s.indexOf('^');
    if (caretIdx !== -1) s = s.slice(0, caretIdx);
    const dollarIdx = s.indexOf('$');
    if (dollarIdx !== -1) s = s.slice(0, dollarIdx);
    s = s.trim();

    // 4. If formatted as a full URL with scheme, extract hostname safely
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) {
        try {
            s = new URL(s).hostname;
        } catch (_) {
            s = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '').replace(/\/.*$/, '');
        }
    } else {
        // Strip path, query params, hash
        s = s.replace(/\/.*$/, '').replace(/\?.*$/, '').replace(/#.*$/, '');
    }

    // 5. Strip port (:443, :8080)
    s = s.replace(/:\d+$/, '');

    // 6. Strip leading wildcards (*.) or dots (.)
    s = s.replace(/^\*+\./, '').replace(/^\.+/, '');

    // 7. Strip leading www. (QBrowse matches subdomains automatically)
    s = s.replace(/^www\./i, '');

    // 8. Strip trailing dots and convert to lowercase
    s = s.replace(/\.+$/, '').toLowerCase().trim();

    // 9. Reject invalid/loopback hostnames
    const invalidHosts = new Set([
        'localhost', 'localhost.localdomain', 'broadcasthost', 'local',
        '0.0.0.0', '127.0.0.1', '255.255.255.255', '::1',
        'ip6-localhost', 'ip6-loopback', 'localdomain'
    ]);
    if (invalidHosts.has(s)) return null;

    // 10. Validate domain syntax (alphanumeric, hyphens, dots; at least 1 dot)
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(s)) {
        return null;
    }

    return s;
}

/**
 * Normalizes remote list URLs (specifically handling GitHub repository links).
 * Automatically converts web GitHub blob/raw views into direct raw.githubusercontent.com URLs.
 * Example:
 * https://github.com/StevenBlack/hosts/blob/master/hosts
 * -> https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
 */
export function normalizeRemoteListUrl(input) {
    if (!input || typeof input !== 'string') return '';
    let u = input.trim();
    if (!u) return '';

    // Add https:// scheme if missing
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(u)) {
        if (u.includes('github.com') || u.includes('githubusercontent.com') || u.includes('.')) {
            u = 'https://' + u;
        }
    }

    try {
        const parsed = new URL(u);
        // github.com/user/repo/blob/branch/path -> raw.githubusercontent.com/user/repo/branch/path
        if (parsed.hostname === 'github.com') {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length >= 4 && (parts[2] === 'blob' || parts[2] === 'raw')) {
                const user = parts[0];
                const repo = parts[1];
                const branch = parts[3];
                const rest = parts.slice(4).join('/');
                return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${rest}`;
            }
        }
        // gist.github.com/user/gistid -> gist.githubusercontent.com/user/gistid/raw
        if (parsed.hostname === 'gist.github.com') {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length >= 2 && !parsed.pathname.endsWith('/raw')) {
                return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`;
            }
        }
        return parsed.toString();
    } catch (_) {
        return u;
    }
}

/**
 * Determines whether an input string is likely a remote blocklist URL rather than an individual domain.
 */
export function isPotentialRemoteListUrl(input) {
    if (!input || typeof input !== 'string') return false;
    const s = input.trim().toLowerCase();
    if (!/^(https?:\/\/|github\.com\/|raw\.githubusercontent\.com\/|gist\.github)/.test(s)) {
        return false;
    }
    // Check for common list extensions or GitHub paths
    if (/\.(txt|hosts|list|filter|zone|rules|conf)($|\?)/i.test(s)) return true;
    if (s.includes('github.com') && (s.includes('/blob/') || s.includes('/raw/'))) return true;
    if (s.includes('raw.githubusercontent.com')) return true;
    if (s.includes('gist.githubusercontent.com') || s.includes('gist.github.com')) return true;
    return false;
}

/**
 * High-speed parser for blocklist text content (hosts files, plain domain lists, ABP filters).
 * Designed to process 100,000+ lines in milliseconds with automatic deduplication.
 */
export function parseBlocklistText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return { domains: [], totalLines: 0, validCount: 0, duplicatesCount: 0, invalidCount: 0 };
    }

    const lines = rawText.split(/\r?\n/);
    const seen = new Set();
    const domains = [];
    let duplicates = 0;
    let invalid = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const d = cleanDomain(line);
        if (!d) {
            // Count non-empty, non-comment lines that failed domain validation
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith(';')) {
                invalid++;
            }
            continue;
        }

        if (seen.has(d)) {
            duplicates++;
        } else {
            seen.add(d);
            domains.push(d);
        }
    }

    return {
        domains,
        totalLines: lines.length,
        validCount: domains.length,
        duplicatesCount: duplicates,
        invalidCount: invalid
    };
}

/**
 * Parses user input from form fields (single domain, comma-separated, space-separated, or multi-line pasted text).
 */
export function parseBlocklistInput(input) {
    if (!input || typeof input !== 'string') {
        return { domains: [], totalFound: 0, duplicatesCount: 0 };
    }
    const trimmed = input.trim();
    if (!trimmed) return { domains: [], totalFound: 0, duplicatesCount: 0 };

    let items;
    if (trimmed.includes('\n')) {
        items = trimmed.split(/\r?\n/);
    } else if (trimmed.includes(',') || trimmed.includes(';')) {
        items = trimmed.split(/[,;]/);
    } else {
        // Test if single domain or hosts line
        const singleClean = cleanDomain(trimmed);
        if (singleClean) {
            items = [trimmed];
        } else if (trimmed.includes(' ')) {
            items = trimmed.split(/\s+/);
        } else {
            items = [trimmed];
        }
    }

    const seen = new Set();
    const domains = [];
    let dups = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const d = cleanDomain(item);
        if (!d) continue;

        if (seen.has(d)) {
            dups++;
        } else {
            seen.add(d);
            domains.push(d);
        }
    }

    return {
        domains,
        totalFound: domains.length,
        duplicatesCount: dups
    };
}

/**
 * Curated, reputable popular blocklists hosted on GitHub and official repositories
 */
export const POPULAR_BLOCKLIST_PRESETS = [
    {
        id: 'stevenblack',
        name: 'StevenBlack Unified Hosts',
        source: 'GitHub',
        url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts',
        desc: 'Comprehensive community-curated adware and malware protection.',
        badge: 'Recommended'
    },
    {
        id: 'oisd-basic',
        name: 'OISD Basic Filter',
        source: 'GitHub',
        url: 'https://raw.githubusercontent.com/sjhgvr/oisd/main/basic.txt',
        desc: 'Lightweight, false-positive-free domains blocking mobile & web tracking.',
        badge: 'Low Overhead'
    },
    {
        id: 'adguard-trackers',
        name: 'AdGuard Trackers Filter',
        source: 'GitHub',
        url: 'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/TrackersFilter/sections/specific_domains.txt',
        desc: 'Specialized domain blocklist targeting analytical telemetry scripts.',
        badge: 'Privacy'
    },
    {
        id: 'peterlowe',
        name: "Peter Lowe's Adservers",
        source: 'yoyo.org',
        url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext',
        desc: 'Long-standing standard plain list of active advertisement servers.',
        badge: 'Fast'
    },
    {
        id: 'danpollock',
        name: "Dan Pollock's Hosts",
        source: 'someonewhocares.org',
        url: 'https://someonewhocares.org/hosts/zero/hosts',
        desc: 'Trusted zero-host list blocking telemetry, shock sites, and spam networks.',
        badge: 'Classic'
    }
];

