export const SPLIT_ORIENTATIONS = ['horizontal', 'vertical', 'quad'];

export function isBlankSplitTab(tab) {
    if (!tab || !tab.url) return true;
    const url = String(tab.url);
    return (
        url === '' ||
        url === 'about:blank' ||
        url.startsWith('qbrowse://newtab') ||
        url.startsWith('qbrowse://home') ||
        url.startsWith('qbrowse://blank')
    );
}

export function getSplitSlotCount(isSplitView, splitOrientation) {
    if (!isSplitView) return 1;
    return splitOrientation === 'quad' ? 4 : 2;
}

export function getFocusedSlotIndex(focusedPane) {
    if (focusedPane === 'pane-3') return 3;
    if (focusedPane === 'pane-2') return 2;
    if (focusedPane === 'pane-1' || focusedPane === 'right') return 1;
    return 0;
}

export function slotIndexToFocusedPane(idx) {
    if (idx === 3) return 'pane-3';
    if (idx === 2) return 'pane-2';
    if (idx === 1) return 'right';
    return 'left';
}

export function getNextSplitOrientation(current) {
    if (current === 'horizontal') return 'vertical';
    if (current === 'vertical') return 'quad';
    return 'horizontal';
}

export function getSlotRectCss({ isSplitView, splitOrientation, isSplitLeft, slotIndex }) {
    if (!isSplitView) {
        if (slotIndex === 0) {
            return {
                left: '0%',
                top: '0%',
                width: 'var(--split-x, 100%)',
                height: 'var(--split-y, 100%)',
                paddingTop: '0px',
                visible: true
            };
        }
        return { visible: false };
    }

    if (splitOrientation === 'vertical') {
        if (slotIndex === 0) {
            return {
                left: '0%',
                top: '0%',
                width: '100%',
                height: 'var(--split-y, 50%)',
                paddingTop: '0px',
                visible: true
            };
        }
        if (slotIndex === 1) {
            return {
                left: '0%',
                top: 'var(--split-y, 50%)',
                width: '100%',
                height: 'calc(100% - var(--split-y, 50%))',
                paddingTop: '36px',
                visible: true
            };
        }
        return { visible: false };
    }

    if (splitOrientation === 'quad') {
        if (slotIndex === 0) {
            return {
                left: '0%',
                top: '0%',
                width: 'var(--split-x, 50%)',
                height: 'var(--split-y, 50%)',
                paddingTop: '0px',
                visible: true
            };
        }
        if (slotIndex === 1) {
            return {
                left: 'var(--split-x, 50%)',
                top: '0%',
                width: 'calc(100% - var(--split-x, 50%))',
                height: 'var(--split-y, 50%)',
                paddingTop: '34px',
                visible: true
            };
        }
        if (slotIndex === 2) {
            return {
                left: '0%',
                top: 'var(--split-y, 50%)',
                width: 'var(--split-x, 50%)',
                height: 'calc(100% - var(--split-y, 50%))',
                paddingTop: '34px',
                visible: true
            };
        }
        if (slotIndex === 3) {
            return {
                left: 'var(--split-x, 50%)',
                top: 'var(--split-y, 50%)',
                width: 'calc(100% - var(--split-x, 50%))',
                height: 'calc(100% - var(--split-y, 50%))',
                paddingTop: '34px',
                visible: true
            };
        }
        return { visible: false };
    }

    // Default: 'horizontal' (2-column side-by-side)
    if (slotIndex === 0) {
        return isSplitLeft
            ? {
                left: 'calc(100% - var(--split-x, 50%))',
                top: '0%',
                width: 'var(--split-x, 50%)',
                height: '100%',
                paddingTop: '0px',
                visible: true
            }
            : {
                left: '0%',
                top: '0%',
                width: 'var(--split-x, 50%)',
                height: '100%',
                paddingTop: '0px',
                visible: true
            };
    }
    if (slotIndex === 1) {
        return isSplitLeft
            ? {
                left: '0%',
                top: '0%',
                width: 'calc(100% - var(--split-x, 50%))',
                height: '100%',
                paddingTop: '36px',
                visible: true
            }
            : {
                left: 'var(--split-x, 50%)',
                top: '0%',
                width: 'calc(100% - var(--split-x, 50%))',
                height: '100%',
                paddingTop: '36px',
                visible: true
            };
    }
    return { visible: false };
}

export function resolveSplitSlotTabs({
    spaceTabs = [],
    isSplitView = false,
    splitOrientation = 'horizontal',
    splitPaneTabIds = [null, null, null],
    splitRightTabId = null
}) {
    const slotCount = getSplitSlotCount(isSplitView, splitOrientation);
    const tabById = new Map();
    for (const t of spaceTabs) {
        if (t && t.id) tabById.set(t.id, t);
    }

    const slots = [null, null, null, null];
    const usedSecondaryIds = new Set();

    if (isSplitView) {
        const rawSecondary = [
            splitPaneTabIds?.[0] ?? splitRightTabId ?? null,
            splitPaneTabIds?.[1] ?? null,
            splitPaneTabIds?.[2] ?? null
        ];

        for (let idx = 1; idx < slotCount; idx++) {
            const candidateId = rawSecondary[idx - 1];
            if (!candidateId || usedSecondaryIds.has(candidateId)) continue;
            const tabObj = tabById.get(candidateId);
            if (!tabObj || isBlankSplitTab(tabObj)) continue;
            slots[idx] = tabObj;
            usedSecondaryIds.add(candidateId);
        }
    }

    // Slot 0: primary active tab distinct from any secondary slots
    const slot0Tab =
        spaceTabs.find((t) => t && t.active && !usedSecondaryIds.has(t.id)) ||
        spaceTabs.find((t) => t && !usedSecondaryIds.has(t.id)) ||
        spaceTabs[0] ||
        null;

    slots[0] = slot0Tab;

    // Ensure slot0 is never duplicated in secondary slots
    if (slot0Tab) {
        for (let idx = 1; idx < slotCount; idx++) {
            if (slots[idx] && slots[idx].id === slot0Tab.id) {
                slots[idx] = null;
            }
        }
    }

    const tabSlotMap = new Map();
    for (let idx = 0; idx < slotCount; idx++) {
        if (slots[idx]) {
            tabSlotMap.set(slots[idx].id, idx);
        }
    }

    return { slots, slotCount, tabSlotMap };
}
