/**
 * QBrowse Search Engines Engine
 * Preset and Custom Search Engine Definitions & URL Resolvers
 */

export const PRESET_SEARCH_ENGINES = [
    {
        id: 'google',
        name: 'Google',
        keyword: 'google',
        shortcut: 'g',
        url: 'https://www.google.com/search?q=%s',
        suggestUrl: 'https://suggestqueries.google.com/complete/search?client=chrome&q=%s',
        color: '#4285F4',
        isBuiltIn: true
    },
    {
        id: 'duckduckgo',
        name: 'DuckDuckGo',
        keyword: 'duckduckgo',
        shortcut: 'ddg',
        url: 'https://duckduckgo.com/?q=%s',
        suggestUrl: 'https://duckduckgo.com/ac/?q=%s&type=list',
        color: '#DE5833',
        isBuiltIn: true
    },
    {
        id: 'bing',
        name: 'Bing',
        keyword: 'bing',
        shortcut: 'b',
        url: 'https://www.bing.com/search?q=%s',
        suggestUrl: 'https://api.bing.com/osjson.aspx?query=%s',
        color: '#008373',
        isBuiltIn: true
    },
    {
        id: 'brave',
        name: 'Brave Search',
        keyword: 'brave',
        shortcut: 'br',
        url: 'https://search.brave.com/search?q=%s',
        suggestUrl: 'https://search.brave.com/api/suggest?q=%s',
        color: '#FB542B',
        isBuiltIn: true
    },
    {
        id: 'ecosia',
        name: 'Ecosia',
        keyword: 'ecosia',
        shortcut: 'eco',
        url: 'https://www.ecosia.org/search?q=%s',
        color: '#009688',
        isBuiltIn: true
    },
    {
        id: 'startpage',
        name: 'Startpage',
        keyword: 'startpage',
        shortcut: 'sp',
        url: 'https://www.startpage.com/sp/search?query=%s',
        color: '#3B82F6',
        isBuiltIn: true
    },
    {
        id: 'kagi',
        name: 'Kagi',
        keyword: 'kagi',
        shortcut: 'k',
        url: 'https://kagi.com/search?q=%s',
        color: '#F59E0B',
        isBuiltIn: true
    },
    {
        id: 'perplexity',
        name: 'Perplexity AI',
        keyword: 'perplexity',
        shortcut: 'px',
        url: 'https://www.perplexity.ai/search?q=%s',
        color: '#20B2AA',
        isBuiltIn: true
    }
];

export const TOR_SEARCH_ENGINE = {
    id: 'duckduckgo_onion',
    name: 'DuckDuckGo Onion',
    keyword: 'ddg-onion',
    shortcut: 'onion',
    url: 'https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/?q=%s',
    color: '#7D4698',
    isBuiltIn: true
};

/**
 * Combines built-in presets and user-defined custom search engines.
 */
export function getAllSearchEngines(customEngines = []) {
    const customList = Array.isArray(customEngines)
        ? customEngines.map(normalizeCustomEngine).filter(Boolean)
        : [];
    return [...PRESET_SEARCH_ENGINES, ...customList];
}

/**
 * Normalizes a custom engine object.
 */
export function normalizeCustomEngine(engine) {
    if (!engine || !engine.name || !engine.url) return null;
    const cleanId = engine.id || `custom_${(engine.keyword || engine.name).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}`;
    const cleanKeyword = (engine.keyword || engine.shortcut || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    
    return {
        id: cleanId,
        name: engine.name.trim(),
        keyword: cleanKeyword || engine.name.toLowerCase().replace(/\s+/g, ''),
        shortcut: engine.shortcut || cleanKeyword,
        url: engine.url.trim(),
        suggestUrl: engine.suggestUrl ? engine.suggestUrl.trim() : null,
        color: engine.color || '#d4bc94',
        isBuiltIn: false,
        isCustom: true
    };
}

/**
 * Finds a search engine by its ID.
 */
export function getSearchEngineById(engineId, customEngines = []) {
    if (!engineId) return PRESET_SEARCH_ENGINES[0];
    const all = getAllSearchEngines(customEngines);
    const found = all.find(e => e.id === engineId);
    return found || PRESET_SEARCH_ENGINES[0];
}

/**
 * Finds a search engine by its keyword or shortcut (e.g. "yt", "ddg", "gh").
 */
export function findEngineByKeyword(keyword, customEngines = []) {
    if (!keyword) return null;
    const clean = keyword.trim().toLowerCase().replace(/^[@!]/, '');
    if (!clean) return null;
    const all = getAllSearchEngines(customEngines);
    return all.find(e => 
        (e.keyword && e.keyword.toLowerCase() === clean) ||
        (e.shortcut && e.shortcut.toLowerCase() === clean) ||
        (e.id && e.id.toLowerCase() === clean)
    ) || null;
}

/**
 * Resolves a search query into a complete URL using the specified engine or engine ID.
 * Supports '%s' and '{q}' placeholders.
 */
export function buildSearchEngineUrl(engineOrId, queryText = '', customEngines = [], isTor = false) {
    if (isTor) {
        return buildUrlFromTemplate(TOR_SEARCH_ENGINE.url, queryText);
    }

    const engine = typeof engineOrId === 'object' && engineOrId !== null
        ? engineOrId
        : getSearchEngineById(engineOrId, customEngines);

    const template = engine?.url || PRESET_SEARCH_ENGINES[0].url;
    return buildUrlFromTemplate(template, queryText);
}

/**
 * Core string formatter replacing %s or {q} with encoded query, or appending query param.
 */
export function buildUrlFromTemplate(template, queryText = '') {
    if (!template) return 'https://www.google.com';
    const trimmed = (queryText || '').trim();

    if (!trimmed) {
        try {
            // Strip placeholders and return root or clean path
            const cleanUrl = template.replace(/%s/g, '').replace(/\{q\}/g, '');
            const parsed = new URL(cleanUrl);
            return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
        } catch {
            return template.replace(/%s/g, '').replace(/\{q\}/g, '');
        }
    }

    const encoded = encodeURIComponent(trimmed);
    if (template.includes('%s')) {
        return template.replace(/%s/g, encoded);
    }
    if (template.includes('{q}')) {
        return template.replace(/\{q\}/g, encoded);
    }
    // Fallback: append query param
    const separator = template.includes('?') ? '&' : '?';
    return `${template}${separator}q=${encoded}`;
}

/**
 * Parses user input to check for leading keyword syntax (e.g. "yt lofi beats" or "@yt lofi beats").
 */
export function parseKeywordQuery(rawInput, customEngines = []) {
    if (!rawInput) return null;
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    // Pattern: keyword followed by space and query
    const match = trimmed.match(/^([@!]?[a-zA-Z0-9_-]+)\s+(.+)$/);
    if (!match) return null;

    const candidateKeyword = match[1];
    const queryText = match[2].trim();

    const engine = findEngineByKeyword(candidateKeyword, customEngines);
    if (engine) {
        return {
            engine,
            keyword: candidateKeyword,
            queryText
        };
    }
    return null;
}

/**
 * Validates a search engine URL template.
 */
export function isValidSearchUrlTemplate(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    try {
        new URL(trimmed.replace(/%s/g, 'test').replace(/\{q\}/g, 'test'));
        return true;
    } catch {
        return false;
    }
}

/**
 * Common file extensions that are NOT web TLDs.
 * If user types a bare filename without a protocol (e.g. "setup.exe", "discord.exe", "file.pdf"),
 * it must be treated as a web search query rather than a website domain.
 */
export const NON_WEB_TLDS = new Set([
    // Executables, binaries, installers & scripts
    'exe', 'msi', 'bat', 'cmd', 'dll', 'sys', 'bin', 'iso', 'apk', 'dmg', 'pkg', 'deb', 'rpm', 'ps1', 'vbs',
    // Documents, text & spreadsheets
    'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'log', 'ini', 'cfg', 'env', 'csv', 'tsv',
    // Images & vector assets
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'psd', 'tif', 'tiff',
    // Media, video & audio
    'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm',
    // Archives & compressed packages
    'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
    // Code, markup & data configs
    'py', 'cpp', 'cs', 'java', 'json', 'xml', 'yaml', 'yml', 'toml'
]);

/**
 * Determines whether raw input is intended as a direct web URL rather than a search query.
 */
export function isLikelyWebUrl(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return false;
    const trimmed = rawInput.trim();
    if (!trimmed) return false;

    // Explicit web protocols or browser schemes
    if (/^(https?:\/\/|file:\/\/|qbrowse:\/\/|chrome:\/\/|about:)/i.test(trimmed)) {
        return true;
    }

    // Localhost or direct IP addresses
    if (/^(https?:\/\/)?localhost(:\d+)?(\/.*)?$/i.test(trimmed) ||
        /^(https?:\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/i.test(trimmed)) {
        return true;
    }

    // Domain pattern: e.g. domain.tld or sub.domain.tld optionally with port and path
    const match = trimmed.match(/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/.*)?$/i);
    if (!match) return false;

    const hasProtocol = Boolean(match[1]);
    const tld = (match[3] || '').toLowerCase();

    // If explicit protocol given, it's definitely a URL
    if (hasProtocol) return true;

    // If the detected "TLD" is a known non-web file extension (e.g. .exe, .bat, .dll), treat as search
    if (NON_WEB_TLDS.has(tld)) {
        return false;
    }

    return true;
}
