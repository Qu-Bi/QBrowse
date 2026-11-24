/**
 * Pure helpers for multi-tab selection and bulk tab operations.
 * Kept free of browser/Electron globals so they can be unit-tested directly in Node.
 */

/**
 * Compute the next selection state after a tab click with optional Ctrl/Cmd or Shift modifiers.
 */
export function computeNextTabSelection(
  currentSelectedIds = [],
  lastSelectedTabId = null,
  tabId,
  { ctrl = false, shift = false, orderedTabIds = [] } = {}
) {
  if (!tabId) {
    return { selectedTabIds: [...(currentSelectedIds || [])], lastSelectedTabId };
  }

  const current = Array.isArray(currentSelectedIds) ? currentSelectedIds : [];
  const ordered = Array.isArray(orderedTabIds) ? orderedTabIds : [];

  if (shift && lastSelectedTabId && ordered.includes(lastSelectedTabId) && ordered.includes(tabId)) {
    const startIdx = ordered.indexOf(lastSelectedTabId);
    const endIdx = ordered.indexOf(tabId);
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    const rangeIds = ordered.slice(lo, hi + 1);

    if (ctrl) {
      const merged = [...current];
      for (const id of rangeIds) {
        if (!merged.includes(id)) merged.push(id);
      }
      return { selectedTabIds: merged, lastSelectedTabId: tabId };
    }
    return { selectedTabIds: rangeIds, lastSelectedTabId: tabId };
  }

  if (ctrl) {
    const exists = current.includes(tabId);
    const nextIds = exists ? current.filter((id) => id !== tabId) : [...current, tabId];
    const nextLast = exists ? (nextIds[nextIds.length - 1] || null) : tabId;
    return { selectedTabIds: nextIds, lastSelectedTabId: nextLast };
  }

  return { selectedTabIds: [tabId], lastSelectedTabId: tabId };
}

/**
 * Remove one or more closed/deleted tab IDs from the current selection.
 */
export function pruneTabSelection(selectedTabIds = [], lastSelectedTabId = null, removedIds = []) {
  const removedSet = new Set(Array.isArray(removedIds) ? removedIds : [removedIds]);
  const nextIds = (selectedTabIds || []).filter((id) => !removedSet.has(id));
  const nextLast = removedSet.has(lastSelectedTabId)
    ? (nextIds[nextIds.length - 1] || null)
    : lastSelectedTabId;
  return { selectedTabIds: nextIds, lastSelectedTabId: nextLast };
}

/**
 * Determine the target mute state for a set of selected tabs across lists:
 * if all matching tabs are already muted -> unmute all (false); otherwise mute all (true).
 */
export function computeBulkMuteTarget(tabs = [], tabIds = []) {
  const idsSet = new Set(Array.isArray(tabIds) ? tabIds : []);
  const matching = (tabs || []).filter((t) => t && idsSet.has(t.id));
  if (matching.length === 0) return true;
  const allMuted = matching.every((t) => Boolean(t.isMuted));
  return !allMuted;
}

/**
 * Collect valid copyable URLs (http://, https://, file://) from tabs matching `tabIds`,
 * filtering out blanks, about:blank, and internal qbrowse:// URLs.
 */
export function collectSelectedTabUrls(tabs = [], tabIds = []) {
  const idsSet = new Set(Array.isArray(tabIds) ? tabIds : []);
  if (idsSet.size === 0) return '';

  const byId = new Map();
  for (const tab of tabs || []) {
    if (tab && tab.id && idsSet.has(tab.id)) {
      byId.set(tab.id, tab);
    }
  }

  const urls = [];
  const seenUrls = new Set();
  const orderedSource = Array.isArray(tabIds) ? tabIds : [];
  for (const id of orderedSource) {
    const tab = byId.get(id);
    if (!tab) continue;
    const rawUrl = typeof tab.url === 'string' ? tab.url.trim() : '';
    if (!rawUrl) continue;
    const lower = rawUrl.toLowerCase();
    if (lower === 'about:blank' || lower.startsWith('about:') || lower.startsWith('qbrowse://')) {
      continue;
    }
    if (!lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('file://')) {
      continue;
    }
    if (!seenUrls.has(rawUrl)) {
      seenUrls.add(rawUrl);
      urls.push(rawUrl);
    }
  }

  return urls.join('\n');
}
