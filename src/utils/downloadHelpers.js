/**
 * Download Detection & Tab Lifecycle Helpers
 * Intelligently classifies download URLs to prevent orphaned/blank tabs
 */

export const DIRECT_DOWNLOAD_EXTENSIONS = new Set([
    // Executables & Installers
    'exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'appimage', 'bin',
    // Compressed Archives & Images
    'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'iso', 'img',
    // Browser extensions & torrents
    'crx', 'xpi', 'torrent'
]);

/**
 * Checks whether a given URL is directly pointing to a downloadable binary/archive file.
 * @param {string} url 
 * @returns {boolean}
 */
export function isLikelyDownloadUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl.startsWith('about:') || cleanUrl.startsWith('javascript:')) return false;

    try {
        const parsed = new URL(cleanUrl);
        const pathname = parsed.pathname.toLowerCase();
        
        // Check file extension at the end of pathname
        const extMatch = pathname.match(/\.([a-z0-9]+)$/i);
        if (extMatch && DIRECT_DOWNLOAD_EXTENSIONS.has(extMatch[1].toLowerCase())) {
            return true;
        }

        // Secondary check for compound extensions like .tar.gz
        if (/\.(tar\.(gz|bz2|xz))$/i.test(pathname)) {
            return true;
        }

        // Common download indicators in query params
        const search = parsed.search.toLowerCase();
        if (search.includes('export=download') || 
            search.includes('response-content-disposition=attachment') ||
            search.includes('format=direct') ||
            (pathname.includes('/download') && search.includes('dl=1'))) {
            return true;
        }

        // Check if query string contains a file with a binary extension (e.g. ?file=setup.exe)
        for (const ext of DIRECT_DOWNLOAD_EXTENSIONS) {
            if (search.includes(`.${ext}`)) return true;
        }
    } catch (_) {
        const cleanNoQuery = cleanUrl.split('?')[0].split('#')[0].toLowerCase();
        const extMatch = cleanNoQuery.match(/\.([a-z0-9]+)$/i);
        if (extMatch && DIRECT_DOWNLOAD_EXTENSIONS.has(extMatch[1])) {
            return true;
        }
    }

    return false;
}
