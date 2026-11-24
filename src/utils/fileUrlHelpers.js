/**
 * Pure helpers for normalizing local filesystem paths to safe file:// URLs,
 * distinguishing HTML files (rendered in <webview>) from other local resources
 * (rendered in LocalFileViewer), and extracting clean display names.
 */

export function pathToSafeFileUrl(fsPath) {
    if (!fsPath || typeof fsPath !== 'string') return '';
    let trimmed = fsPath.trim();
    if (!trimmed) return '';
    if (/^file:\/\//i.test(trimmed)) return trimmed;

    const normalized = trimmed.replace(/\\/g, '/');
    const isWindowsDrive = /^[a-zA-Z]:/.test(normalized);
    const segments = normalized.split('/');

    const encodedSegments = segments.map((seg, idx) => {
        if (idx === 0 && isWindowsDrive && /^[a-zA-Z]:$/.test(seg)) {
            return seg; // Keep drive letter e.g. C: unencoded
        }
        return encodeURIComponent(seg);
    });

    const joined = encodedSegments.join('/');
    if (isWindowsDrive) {
        return `file:///${joined}`;
    }
    if (joined.startsWith('/')) {
        return `file://${joined}`;
    }
    return `file:///${joined}`;
}

export function isLocalHtmlUrl(url) {
    return Boolean(url && typeof url === 'string' && /^file:\/\//i.test(url) && /\.(html?|xhtml)(?:[?#].*)?$/i.test(url));
}

export function isLocalViewerUrl(url) {
    return Boolean(url && typeof url === 'string' && /^file:\/\//i.test(url) && !isLocalHtmlUrl(url));
}

export function extractLocalFileName(url, fallback = 'Local Resource') {
    if (!url || typeof url !== 'string') return fallback;
    try {
        const clean = url.split(/[?#]/)[0];
        const decoded = decodeURIComponent(clean);
        const withoutScheme = decoded.replace(/^file:\/\//i, '');
        const parts = withoutScheme.split(/[/\\]/).filter(Boolean);
        if (parts.length === 0) return fallback;
        return parts[parts.length - 1] || fallback;
    } catch (_) {
        return fallback;
    }
}
