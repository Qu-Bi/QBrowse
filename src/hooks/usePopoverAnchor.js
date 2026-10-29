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
    const topBarPosition = useUIStore(state => state.settings?.topBarPosition || 'top');
    const sidebarPosition = useUIStore(state => state.settings?.sidebarPosition || 'left');
    const isSidebarHidden = useUIStore(state => state.isSidebarHidden);
    const isRightPanelOpen = useUIStore(state => state.isRightPanelOpen);
    const isSplitView = useUIStore(state => state.isSplitView);
    const activePopover = useUIStore(state => state.activePopover);

    const isInitiallyBottom = topBarPosition === 'bottom';
    const [coords, setCoords] = useState(() => ({
        right: defaultLeft !== null ? undefined : defaultRight,
        left: defaultLeft !== null ? defaultLeft : undefined,
        top: isInitiallyBottom ? undefined : defaultTop,
        bottom: isInitiallyBottom ? defaultTop : undefined
    }));

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

        const isBottomMode = topBarPosition === 'bottom';

        if (!triggerEl) {
            setCoords({
                right: defaultLeft !== null ? undefined : defaultRight,
                left: defaultLeft !== null ? defaultLeft : undefined,
                top: isBottomMode ? undefined : defaultTop,
                bottom: isBottomMode ? defaultTop : undefined
            });
            return;
        }

        const triggerRect = triggerEl.getBoundingClientRect();

        // 1. Calculate vertical offset:
        // Detect if anchored from bottom (explicit setting or trigger located in lower half)
        const isBottom = isBottomMode || (triggerRect.top > mainRect.top + mainRect.height / 2);

        let calculatedTop = undefined;
        let calculatedBottom = undefined;

        if (isBottom) {
            calculatedBottom = Math.max(48, Math.round(mainRect.bottom - triggerRect.top + 8));
        } else {
            calculatedTop = Math.max(48, Math.round(triggerRect.bottom - mainRect.top + 8));
        }

        // 2. Calculate horizontal offset:
        const triggerCenter = triggerRect.left + triggerRect.width / 2;
        const mainCenter = mainRect.left + mainRect.width / 2;
        const isTriggerOnLeft = triggerCenter < mainCenter;

        if (align === 'left' || (align === 'center' && isTriggerOnLeft)) {
            const idealLeft = align === 'left' 
                ? triggerRect.left - mainRect.left 
                : (triggerCenter - mainRect.left) - (popoverWidth / 2);
            const minLeft = 12;
            const maxLeft = Math.max(minLeft, Math.round(mainRect.width - popoverWidth - 12));
            const clampedLeft = Math.min(Math.max(minLeft, Math.round(idealLeft)), maxLeft);

            setCoords(prev => {
                if (
                    prev.left === clampedLeft && 
                    prev.top === calculatedTop && 
                    prev.bottom === calculatedBottom && 
                    prev.right === undefined
                ) {
                    return prev;
                }
                return { left: clampedLeft, right: undefined, top: calculatedTop, bottom: calculatedBottom };
            });
            return;
        }

        const btnCenterFromRight = mainRect.right - triggerCenter;
        
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
            if (
                prev.right === clampedRight && 
                prev.top === calculatedTop && 
                prev.bottom === calculatedBottom && 
                prev.left === undefined
            ) {
                return prev;
            }
            return { right: clampedRight, left: undefined, top: calculatedTop, bottom: calculatedBottom };
        });
    }, [triggerSelector, fallbackSelector, popoverWidth, defaultRight, defaultLeft, defaultTop, align, topBarPosition, sidebarPosition]);

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
        topBarPosition,
        sidebarPosition,
        isSidebarHidden,
        isRightPanelOpen,
        isSplitView,
        activePopover
    ]);

    const style = {};
    if (coords.bottom !== undefined) {
        style.bottom = `${coords.bottom}px`;
    } else if (coords.top !== undefined) {
        style.top = `${coords.top}px`;
    }
    if (coords.left !== undefined) {
        style.left = `${coords.left}px`;
    }
    if (coords.right !== undefined) {
        style.right = `${coords.right}px`;
    }

    return {
        style,
        anchorCoords: coords,
        isBottom: coords.bottom !== undefined
    };
}
