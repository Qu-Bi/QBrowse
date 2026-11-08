/**
 * QBrowse Standard Web Zoom Steps
 * Matches Google Chrome / Chromium & Apple WebKit standard zoom ladder.
 */

export const ZOOM_STEPS = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];
export const MIN_ZOOM = 25;
export const MAX_ZOOM = 500;
export const DEFAULT_ZOOM = 100;

/**
 * Get the next zoom level step according to direction (+1 for zoom in, -1 for zoom out)
 * Supports non-standard intermediate values by snapping to the next closest standard tier.
 */
export function getNextZoomStep(current, direction) {
    const cur = typeof current === 'number' && !isNaN(current) ? current : DEFAULT_ZOOM;
    if (direction > 0) {
        const next = ZOOM_STEPS.find(step => step > cur + 0.5);
        return next !== undefined ? next : MAX_ZOOM;
    }
    if (direction < 0) {
        const reversed = [...ZOOM_STEPS].reverse();
        const prev = reversed.find(step => step < cur - 0.5);
        return prev !== undefined ? prev : MIN_ZOOM;
    }
    return DEFAULT_ZOOM;
}

