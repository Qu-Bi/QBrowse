/**
 * Pure helpers for managing multiple independent Split Groups per space and across spaces.
 */

export function getGroupMemberIds(group) {
    if (!group || typeof group !== 'object') return [];
    const seen = new Set();
    const out = [];
    const raw = [group.primaryTabId, ...(Array.isArray(group.paneTabIds) ? group.paneTabIds : [])];
    for (const id of raw) {
        if (id && !seen.has(id)) {
            seen.add(id);
            out.push(id);
        }
    }
    return out;
}

export function pruneTabsFromParkedGroups(groups, tabIdsToRemove) {
    if (!Array.isArray(groups) || groups.length === 0) return [];
    const removeSet = new Set((Array.isArray(tabIdsToRemove) ? tabIdsToRemove : [tabIdsToRemove]).filter(Boolean));
    if (removeSet.size === 0) return groups;

    const result = [];
    for (const g of groups) {
        if (!g || typeof g !== 'object') continue;
        const primaryRemoved = !g.primaryTabId || removeSet.has(g.primaryTabId);
        let nextPaneIds = (Array.isArray(g.paneTabIds) ? g.paneTabIds : [null, null, null]).map(id =>
            id && !removeSet.has(id) ? id : null
        );
        let nextPrimary = primaryRemoved ? (nextPaneIds.find(Boolean) || null) : g.primaryTabId;
        if (nextPrimary) {
            nextPaneIds = nextPaneIds.map(id => (id === nextPrimary ? null : id));
        }
        const remainingCount = (nextPrimary ? 1 : 0) + nextPaneIds.filter(Boolean).length;
        if (remainingCount >= 2 && nextPrimary) {
            result.push({
                ...g,
                primaryTabId: nextPrimary,
                paneTabIds: [nextPaneIds[0] || null, nextPaneIds[1] || null, nextPaneIds[2] || null]
            });
        }
    }
    return result;
}

export function upsertParkedSplitGroup(groups, incomingGroup) {
    const base = Array.isArray(groups) ? groups : [];
    if (!incomingGroup || !incomingGroup.primaryTabId) return base;
    const memberIds = getGroupMemberIds(incomingGroup);
    if (memberIds.length < 2) return base;

    // Disjoint membership: remove any overlapping tabs or matching group ID from existing groups
    const withoutSameId = base.filter(g => g && g.id !== incomingGroup.id);
    const cleaned = pruneTabsFromParkedGroups(withoutSameId, memberIds);

    const nextPaneIds = [null, null, null];
    const rawSec = Array.isArray(incomingGroup.paneTabIds) ? incomingGroup.paneTabIds : [];
    for (let i = 0; i < 3; i++) {
        const cid = rawSec[i] || null;
        nextPaneIds[i] = cid && cid !== incomingGroup.primaryTabId ? cid : null;
    }

    if (!nextPaneIds.some(Boolean)) return cleaned;

    return [
        ...cleaned,
        {
            id: incomingGroup.id || `sg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            space: incomingGroup.space,
            name: typeof incomingGroup.name === 'string' ? incomingGroup.name.trim().slice(0, 40) : '',
            primaryTabId: incomingGroup.primaryTabId,
            paneTabIds: nextPaneIds,
            orientation: ['horizontal', 'vertical', 'quad'].includes(incomingGroup.orientation)
                ? incomingGroup.orientation
                : 'horizontal',
            splitRatio: Math.min(80, Math.max(20, Number(incomingGroup.splitRatio) || 50)),
            splitRatioY: Math.min(80, Math.max(20, Number(incomingGroup.splitRatioY) || 50))
        }
    ];
}

export function sanitizeParkedSplitGroups(rawGroups, getSpaceTabsById, activeExcludeIds = []) {
    if (!Array.isArray(rawGroups) || rawGroups.length === 0) return [];
    const excludeSet = new Set((Array.isArray(activeExcludeIds) ? activeExcludeIds : []).filter(Boolean));
    let acc = [];

    for (const pg of rawGroups) {
        if (!pg || !pg.space || pg.space === 'ghost' || pg.space === 'tor') continue;
        const spList = typeof getSpaceTabsById === 'function' ? (getSpaceTabsById(pg.space) || []) : [];
        const validIds = new Set(spList.map(t => t && t.id).filter(Boolean));
        const primaryId = pg.primaryTabId && validIds.has(pg.primaryTabId) && !excludeSet.has(pg.primaryTabId)
            ? pg.primaryTabId
            : null;
        const cleanedPaneIds = (Array.isArray(pg.paneTabIds) ? pg.paneTabIds : [null, null, null]).map(id =>
            id && id !== primaryId && validIds.has(id) && !excludeSet.has(id) ? id : null
        );
        const resolvedPrimary = primaryId || cleanedPaneIds.find(Boolean) || null;
        const finalPaneIds = cleanedPaneIds.map(id => (id === resolvedPrimary ? null : id));

        if (resolvedPrimary && finalPaneIds.some(Boolean)) {
            acc = upsertParkedSplitGroup(acc, {
                ...pg,
                primaryTabId: resolvedPrimary,
                paneTabIds: finalPaneIds
            });
            excludeSet.add(resolvedPrimary);
            finalPaneIds.forEach(id => { if (id) excludeSet.add(id); });
        }
    }

    return acc;
}
