/**
 * Network Privacy & Background Services Kill Switch utilities.
 * Controls whether optional background network requests are permitted.
 */

export const BACKGROUND_SERVICE_KEYS = [
    'autoUpdates',
    'filterUpdates',
    'liveSuggestions',
    'remoteFavicons',
    'cloudSync'
];

const SERVICE_SETTING_MAP = {
    autoUpdates: 'bgAllowAutoUpdates',
    filterUpdates: 'bgAllowFilterUpdates',
    liveSuggestions: 'bgAllowLiveSuggestions',
    remoteFavicons: 'bgAllowRemoteFavicons',
    cloudSync: 'bgAllowCloudSync'
};

const INTERNAL_SCHEME_RE = /^(?:qbrowse|about|file|data|blob|javascript|chrome):/i;

/**
 * Returns true if the given background service is permitted under current settings.
 * Returns false immediately when strictOfflineMode is enabled.
 */
export function isBackgroundServiceAllowed(settings, serviceKey) {
    if (settings?.strictOfflineMode === true) return false;
    const settingProp = SERVICE_SETTING_MAP[serviceKey];
    if (!settingProp) return false;
    return settings?.[settingProp] !== false;
}

/**
 * Counts how many of the 5 background services are currently active.
 */
export function countActiveBackgroundServices(settings) {
    const total = BACKGROUND_SERVICE_KEYS.length;
    if (settings?.strictOfflineMode === true) {
        return { active: 0, total };
    }
    let active = 0;
    for (const key of BACKGROUND_SERVICE_KEYS) {
        if (isBackgroundServiceAllowed(settings, key)) {
            active += 1;
        }
    }
    return { active, total };
}

/**
 * Safely builds a Google S2 favicon URL when remoteFavicons is allowed,
 * or returns '' when disabled, empty, or for internal/local schemes.
 */
export function getSafeFaviconUrl(pageUrl, settings, size = 32) {
    if (!isBackgroundServiceAllowed(settings, 'remoteFavicons')) return '';
    if (!pageUrl || typeof pageUrl !== 'string') return '';
    const trimmed = pageUrl.trim();
    if (!trimmed || INTERNAL_SCHEME_RE.test(trimmed)) return '';

    try {
        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
        const parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
        const hostname = parsed.hostname;
        if (!hostname) return '';
        const safeSize = Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 32;
        return `https://www.google.com/s2/favicons?sz=${safeSize}&domain=${encodeURIComponent(hostname)}`;
    } catch (_) {
        return '';
    }
}
