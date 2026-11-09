/**
 * Wallpaper & Live Media Detection Helpers for QBrowse
 * Supports Static Images (JPG, PNG, WebP, AVIF, SVG), Animated GIFs, and Video Wallpapers (MP4, WebM, MOV, M4V).
 * Zero unicode emojis per project standards.
 */

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'];
const GIF_EXTENSIONS = ['.gif'];

/**
 * Extracts a clean file extension from a URL or path
 */
export const getMediaExtension = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
        const clean = rawUrl.split(/[?#]/)[0];
        const lastDot = clean.lastIndexOf('.');
        if (lastDot === -1) return '';
        return clean.slice(lastDot).toLowerCase();
    } catch {
        return '';
    }
};

/**
 * Determines if a wallpaper URL points to a video file
 */
export const isVideoWallpaper = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    const ext = getMediaExtension(rawUrl);
    if (VIDEO_EXTENSIONS.includes(ext)) return true;
    const lower = rawUrl.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.m4v')) return true;
    if (lower.includes('video/mp4') || lower.includes('video/webm')) return true;
    return false;
};

/**
 * Determines if a wallpaper URL points to an animated GIF
 */
export const isGifWallpaper = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    const ext = getMediaExtension(rawUrl);
    if (GIF_EXTENSIONS.includes(ext)) return true;
    const lower = rawUrl.toLowerCase();
    return lower.includes('.gif');
};

/**
 * Determines if a wallpaper is animated/live (video or GIF)
 */
export const isLiveWallpaper = (rawUrl) => {
    return isVideoWallpaper(rawUrl) || isGifWallpaper(rawUrl);
};

/**
 * Returns the categorical type of wallpaper
 * @returns {'video' | 'gif' | 'image'}
 */
export const getWallpaperType = (rawUrl) => {
    if (isVideoWallpaper(rawUrl)) return 'video';
    if (isGifWallpaper(rawUrl)) return 'gif';
    return 'image';
};

/**
 * Formats a clean human-readable badge label for the active wallpaper
 */
export const getWallpaperBadgeLabel = (rawUrl, source = 'default') => {
    if (!rawUrl) return 'Default Stock';
    const type = getWallpaperType(rawUrl);
    const sourceLabel = source === 'file' ? 'Local' : source === 'url' ? 'Web' : 'Stock';

    if (type === 'video') return `Live Video (${sourceLabel})`;
    if (type === 'gif') return `Animated GIF (${sourceLabel})`;
    return source === 'file' ? 'Local Image' : source === 'url' ? 'Web Image' : 'Default Stock';
};

