import { useState, useLayoutEffect, useCallback } from 'react';
import useUIStore from '../store/useUIStore';

/**
 * Custom hook to dynamically anchor topbar and extension hub popovers
 * to their corresponding trigger buttons.
 *
 * @param {string} triggerSelector - CSS selector for trigger element (e.g. '#tour-darkmode-trigger')
 * @param {number} popoverWidth - Estimated or exact width of the popover card in px
 * @param {object} options - Optional configuration (fallbackSelector, defaultRight, defaultTop, defaultLeft, align)
 * @returns {{ style: { top: string, right?: string, left?: string }, anchorCoords: { top: number, right?: number, left?: number } }}
 */
export default function usePopoverAnchor(triggerSelector, popoverWidth = 320, options = {}) {
    const {
        fallbackSelector = '#qbrowse-extensions-hub',
        defaultRight = 16,
        defaultLeft = null,
        defaultTop = 64,
        align = 'center' // 'center' | 'right' | 'left'
    } = options;

    const hiddenTopBarIcons = useUIStore(state => state.settings?.hiddenTopBarIcons);
    const uiScale = useUIStore(state => state.settings?.uiScale);
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const isSplitView = useUIStore(state => state.isSplitView);
    const activePopover = useUIStore(state => state.activePopover);

    const [coords, setCoords] = useState({
        right: defaultLeft !== null ? undefined : defaultRight,
        left: defaultLeft !== null ? defaultLeft : undefined,
        top: defaultTop
    });

    const updatePosition = useCallback(() => {
        if (typeof window === 'undefined') return;

        const mainEl = document.getElementById('qbrowse-main-frame') || document.querySelector('main');
        if (!mainEl) return;

        const mainRect = mainEl.getBoundingClientRect();
        let triggerEl = document.querySelector(triggerSelector);

        // Fallback to extensions hub pill if the specific icon was hidden or not rendered
        if (!triggerEl && fallbackSelector) {
            triggerEl = document.querySelector(fallbackSelector);
        }

        if (!triggerEl) {
            setCoords({
                right: defaultLeft !== null ? undefined : defaultRight,
                left: defaultLeft !== null ? defaultLeft : undefined,
                top: defaultTop
            });
            return;
        }

        const triggerRect = triggerEl.getBoundingClientRect();

        // 1. Calculate Top offset: directly beneath the trigger with a clean 8px gap
        const calculatedTop = Math.max(48, Math.round(triggerRect.bottom - mainRect.top + 8));

        // 2. Calculate horizontal offset:
        if (align === 'left') {
            const idealLeft = triggerRect.left - mainRect.left;
            const minLeft = 12;
            const maxLeft = Math.max(minLeft, Math.round(mainRect.width - popoverWidth - 12));
            const clampedLeft = Math.min(Math.max(minLeft, Math.round(idealLeft)), maxLeft);

            setCoords(prev => {
                if (prev.left === clampedLeft && prev.top === calculatedTop && prev.right === undefined) {
                    return prev;
                }
                return { left: clampedLeft, right: undefined, top: calculatedTop };
            });
            return;
        }

        const btnCenterFromRight = mainRect.right - (triggerRect.left + triggerRect.width / 2);
        
        let idealRight = defaultRight;
        if (align === 'center') {
            idealRight = btnCenterFromRight - (popoverWidth / 2);
        } else {
            // Right-aligned to trigger button's right edge
            idealRight = mainRect.right - triggerRect.right;
        }

        const minRight = 12;
        const maxRight = Math.max(minRight, Math.round(mainRect.width - popoverWidth - 12));
        const clampedRight = Math.min(Math.max(minRight, Math.round(idealRight)), maxRight);

        setCoords(prev => {
            if (prev.right === clampedRight && prev.top === calculatedTop && prev.left === undefined) {
                return prev;
            }
            return { right: clampedRight, left: undefined, top: calculatedTop };
        });
    }, [triggerSelector, fallbackSelector, popoverWidth, defaultRight, defaultLeft, defaultTop, align]);

    useLayoutEffect(() => {
        updatePosition();

        // Listen to window resize and orientation events
        window.addEventListener('resize', updatePosition);

        // Also observe main element size changes
        const mainEl = document.getElementById('qbrowse-main-frame') || document.querySelector('main');
        let resizeObserver = null;
        if (mainEl && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                updatePosition();
            });
            resizeObserver.observe(mainEl);
        }

        return () => {
            window.removeEventListener('resize', updatePosition);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [
        updatePosition,
        hiddenTopBarIcons,
        uiScale,
        isSidebarHidden,
        isRightPanelOpen,
        isSplitView,
        activePopover
    ]);

    const style = {
        top: `${coords.top}px`
    };
    if (coords.left !== undefined) {
        style.left = `${coords.left}px`;
    }
    if (coords.right !== undefined) {
        style.right = `${coords.right}px`;
    }

    return {
        style,
        anchorCoords: coords
    };
}
