import { create } from 'zustand';

// Color definitions for highlights
export const HIGHLIGHT_COLORS = {
  accent: { id: 'accent', label: 'Accent', bg: 'rgba(212, 188, 148, 0.4)', border: '#d4bc94', text: '#d4bc94' },
  yellow: { id: 'yellow', label: 'Yellow', bg: 'rgba(253, 224, 71, 0.35)', border: '#fde047', text: '#eab308' },
  green:  { id: 'green',  label: 'Green',  bg: 'rgba(134, 239, 172, 0.35)', border: '#86efac', text: '#22c55e' },
  blue:   { id: 'blue',   label: 'Blue',   bg: 'rgba(147, 197, 253, 0.35)', border: '#93c5fd', text: '#3b82f6' },
  pink:   { id: 'pink',   label: 'Pink',   bg: 'rgba(244, 114, 182, 0.35)', border: '#f472b6', text: '#ec4899' },
};

// Helper: normalize URL by removing hashes/fragments and normalizing trailing slashes
export function normalizeAnnotationUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    let res = parsed.toString().toLowerCase();
    if (res.endsWith('/') && parsed.pathname !== '/') {
      res = res.slice(0, -1);
    }
    return res;
  } catch (_) {
    return (rawUrl || '').split('#')[0].replace(/\/+$/, '').toLowerCase();
  }
}

// Helper: extract clean domain
export function extractDomainFromUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

const STORAGE_KEY = 'qbrowse_annotations';

/**
 * Checks whether two annotations represent the same highlighted passage.
 */
export function areAnnotationsDuplicates(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;

  const spaceA = a.space || 'personal';
  const spaceB = b.space || 'personal';
  if (spaceA !== spaceB) return false;

  const textA = (a.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const textB = (b.text || '').replace(/\s+/g, ' ').trim().toLowerCase();

  // URLs
  const urlA = normalizeAnnotationUrl(a.url);
  const urlB = normalizeAnnotationUrl(b.url);

  // Domains
  const domainA = (a.domain || extractDomainFromUrl(urlA) || '').toLowerCase();
  const domainB = (b.domain || extractDomainFromUrl(urlB) || '').toLowerCase();

  // Handle sticky notes without highlight text
  if (!textA && !textB) {
    if (urlA && urlB && urlA === urlB) {
      const noteA = (a.note || '').trim().toLowerCase();
      const noteB = (b.note || '').trim().toLowerCase();
      if (noteA && noteB && noteA === noteB) return true;
    }
    return false;
  }

  // If one has highlight text and one doesn't, they are distinct items
  if (!textA || !textB) return false;

  const isExactText = textA === textB;
  const isPrefixOrSubstring = (textA.length >= 10 && textB.length >= 10) && (textA.startsWith(textB) || textB.startsWith(textA) || textA.includes(textB) || textB.includes(textA));

  if (!isExactText && !isPrefixOrSubstring) return false;

  // If exact text or prefix match on the same URL
  if (urlA && urlB && urlA === urlB) return true;

  // On matching domain
  if (domainA && domainB && domainA === domainB) {
    if (textA.length >= 10 || textB.length >= 10) return true;
    try {
      const pA = new URL(urlA).pathname.replace(/\/+$/, '').toLowerCase();
      const pB = new URL(urlB).pathname.replace(/\/+$/, '').toLowerCase();
      if (pA === pB) return true;
      const isRootA = !pA || pA === '/' || pA === '/wiki/main_page' || pA === '/index.html' || pA === '/index.php';
      const isRootB = !pB || pB === '/' || pB === '/wiki/main_page' || pB === '/index.html' || pB === '/index.php';
      if (isRootA && isRootB) return true;
    } catch (_) {
      return true;
    }
  }

  return false;
}

/**
 * Deduplicate any array of annotations by matching ID, space, normalized text, and domain/URL.
 * Keeps the one with a non-empty note (or merges notes) and most recent updatedAt / createdAt.
 */
export function deduplicateAnnotationList(list) {
  if (!Array.isArray(list)) return [];
  const result = [];

  for (const item of list) {
    if (!item) continue;
    const existingIndex = result.findIndex(r => areAnnotationsDuplicates(r, item));
    if (existingIndex === -1) {
      result.push({
        ...item,
        space: item.space || 'personal',
        url: normalizeAnnotationUrl(item.url),
        domain: item.domain || extractDomainFromUrl(item.url)
      });
    } else {
      const existing = result[existingIndex];
      const existingTime = existing.updatedAt || existing.createdAt || 0;
      const itemTime = item.updatedAt || item.createdAt || 0;

      // Keep the one with a non-empty note (or merge the note)
      const existingNote = (existing.note || '').trim();
      const itemNote = (item.note || '').trim();
      let mergedNote = existingNote;
      if (!existingNote && itemNote) {
        mergedNote = itemNote;
      } else if (existingNote && itemNote && existingNote !== itemNote) {
        mergedNote = `${existingNote}\n${itemNote}`;
      }

      // Keep the one with most recent updatedAt / createdAt
      const isItemMoreRecent = itemTime > existingTime;
      const base = isItemMoreRecent ? item : existing;

      result[existingIndex] = {
        ...base,
        id: existing.id || item.id,
        space: existing.space || item.space || 'personal',
        url: existing.url || item.url,
        domain: existing.domain || item.domain || extractDomainFromUrl(existing.url || item.url),
        title: base.title || existing.title || item.title || existing.url,
        color: (isItemMoreRecent ? item.color : existing.color) || existing.color || item.color || 'accent',
        note: mergedNote,
        createdAt: Math.min(existing.createdAt || existingTime || Date.now(), item.createdAt || itemTime || Date.now()),
        updatedAt: Math.max(existingTime, itemTime, Date.now())
      };
    }
  }

  return result;
}

function loadStoredAnnotations() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const sanitized = Array.isArray(parsed) 
      ? parsed.filter(a => a && a.space !== 'ghost' && a.space !== 'tor' && !a.url?.includes('.onion')) 
      : [];
    const deduplicated = deduplicateAnnotationList(sanitized);
    if (Array.isArray(parsed) && deduplicated.length !== parsed.length) {
      saveStoredAnnotations(deduplicated);
    }
    return deduplicated;
  } catch (e) {
    console.warn('[useAnnotationStore] Failed to load annotations from localStorage:', e);
    return [];
  }
}

function saveStoredAnnotations(annotations) {
  try {
    if (typeof localStorage === 'undefined') return;
    const sanitized = (annotations || []).filter(a => a && a.space !== 'ghost' && a.space !== 'tor' && !a.url?.includes('.onion'));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('[useAnnotationStore] Failed to save annotations to localStorage:', e);
  }
}

export const useAnnotationStore = create((set, get) => ({
  annotations: loadStoredAnnotations(),

  /**
   * Add a new highlight or sticky note.
   * Deduplicates by matching URL + space + normalized text, or ID.
   * @param {Object} data - { space, url, domain, title, text, prefix, suffix, color, note }
   * @returns {Object} created or updated annotation
   */
  addAnnotation: (data) => {
    // STRICT PRIVACY: Never persist annotations in ghost or tor spaces
    if (!data || data.space === 'ghost' || data.space === 'tor') return null;
    const cleanUrl = normalizeAnnotationUrl(data.url);
    if (cleanUrl.includes('.onion')) return null;

    const targetSpace = data.space || 'personal';
    const targetText = (data.text || '').trim();
    if (!targetText) return null;

    const candidate = {
      id: data.id,
      space: targetSpace,
      url: cleanUrl,
      domain: data.domain || extractDomainFromUrl(cleanUrl),
      text: targetText
    };

    // Check if an annotation already exists with matching ID or areAnnotationsDuplicates
    const currentList = get().annotations;
    const existing = currentList.find(a => areAnnotationsDuplicates(a, candidate));

    if (existing) {
      let hasChanges = false;
      const updates = {};

      if (data.color && data.color !== existing.color) {
        updates.color = data.color;
        hasChanges = true;
      }
      if (data.note && (typeof data.note === 'string' ? data.note.trim() : data.note)) {
        const trimmedNote = (typeof data.note === 'string' ? data.note.trim() : data.note);
        if (trimmedNote !== existing.note) {
          updates.note = trimmedNote;
          hasChanges = true;
        }
      }
      if (data.title && !existing.title) {
        updates.title = data.title;
        hasChanges = true;
      }

      if (hasChanges) {
        const updatedAnnotation = {
          ...existing,
          ...updates,
          updatedAt: Date.now()
        };
        set(state => {
          const mapped = state.annotations.map(a => a.id === existing.id ? updatedAnnotation : a);
          const next = deduplicateAnnotationList(mapped);
          saveStoredAnnotations(next);
          return { annotations: next };
        });

        // Broadcast update to all live webviews
        if (typeof window !== 'undefined' && window.qbrowseWebviews) {
          Object.values(window.qbrowseWebviews).forEach(wv => {
            try {
              if (wv && typeof wv.send === 'function') {
                wv.send('qbrowse-annotation-update', { id: existing.id, ...updates });
              }
            } catch (_) {}
          });
        }
        return updatedAnnotation;
      }

      return existing;
    }

    const domain = data.domain || extractDomainFromUrl(cleanUrl);
    const id = data.id || `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    const newAnnotation = {
      id,
      space: targetSpace,
      url: cleanUrl,
      domain,
      title: data.title || cleanUrl,
      text: targetText,
      prefix: data.prefix || '',
      suffix: data.suffix || '',
      color: data.color || 'accent',
      note: (data.note || '').trim(),
      createdAt: now,
      updatedAt: now
    };

    set(state => {
      const combined = [newAnnotation, ...state.annotations.filter(a => !areAnnotationsDuplicates(a, newAnnotation))];
      const deduplicated = deduplicateAnnotationList(combined);
      saveStoredAnnotations(deduplicated);
      return { annotations: deduplicated };
    });

    return newAnnotation;
  },

  /**
   * Helper to deduplicate annotations array anytime to clean up duplicates.
   * @returns {Array} sanitized deduplicated annotations
   */
  deduplicateAnnotations: () => {
    const current = get().annotations;
    const deduplicated = deduplicateAnnotationList(current);
    if (deduplicated.length !== current.length) {
      set({ annotations: deduplicated });
      saveStoredAnnotations(deduplicated);
    }
    return deduplicated;
  },

  /**
   * Update an existing annotation (color, note, etc.)
   */
  updateAnnotation: (id, updates) => {
    set(state => {
      const updated = state.annotations.map(a => {
        if (a.id === id) {
          return {
            ...a,
            ...updates,
            updatedAt: Date.now()
          };
        }
        return a;
      });
      const deduplicated = deduplicateAnnotationList(updated);
      saveStoredAnnotations(deduplicated);
      return { annotations: deduplicated };
    });

    // Broadcast update to all live webviews
    if (typeof window !== 'undefined' && window.qbrowseWebviews) {
      Object.values(window.qbrowseWebviews).forEach(wv => {
        try {
          if (wv && typeof wv.send === 'function') {
            wv.send('qbrowse-annotation-update', { id, ...updates });
          }
        } catch (_) {}
      });
    }
  },

  /**
   * Remove an annotation by ID, along with any duplicate references.
   */
  removeAnnotation: (id) => {
    const target = get().annotations.find(a => a.id === id);
    const removedIds = new Set([id]);

    const updated = get().annotations.filter(a => {
      if (a.id === id) return false;
      if (target && areAnnotationsDuplicates(a, target)) {
        removedIds.add(a.id);
        return false;
      }
      return true;
    });

    const deduplicated = deduplicateAnnotationList(updated);
    set({ annotations: deduplicated });
    saveStoredAnnotations(deduplicated);

    // Broadcast deletion to all live webviews
    if (typeof window !== 'undefined') {
      const liveWebviews = [
        ...(window.qbrowseWebviews ? Object.values(window.qbrowseWebviews) : []),
        ...Array.from(document.querySelectorAll('webview'))
      ];
      removedIds.forEach(delId => {
        liveWebviews.forEach(wv => {
          try {
            if (wv && typeof wv.send === 'function') {
              wv.send('qbrowse-annotation-delete', delId);
            }
          } catch (_) {}
        });
      });
      window.dispatchEvent(new CustomEvent('qbrowse-annotation-deleted', { detail: { id, removedIds: Array.from(removedIds) } }));
    }
  },

  /**
   * Clear all annotations for a specific URL in a space.
   */
  clearAnnotationsForUrl: (url, space = null) => {
    const cleanUrl = normalizeAnnotationUrl(url);
    const removedIds = get().annotations
      .filter(a => normalizeAnnotationUrl(a.url) === cleanUrl && (!space || a.space === space))
      .map(a => a.id);

    set(state => {
      const updated = state.annotations.filter(a => {
        if (normalizeAnnotationUrl(a.url) === cleanUrl) {
          if (!space || a.space === space) return false;
        }
        return true;
      });
      saveStoredAnnotations(updated);
      return { annotations: updated };
    });

    // Broadcast deletions to all live webviews
    if (typeof window !== 'undefined' && window.qbrowseWebviews) {
      Object.values(window.qbrowseWebviews).forEach(wv => {
        try {
          if (wv && typeof wv.send === 'function') {
            removedIds.forEach(id => wv.send('qbrowse-annotation-delete', id));
          }
        } catch (_) {}
      });
    }
  },

  /**
   * Get all annotations for a given URL and space.
   */
  getAnnotationsForUrl: (url, space = 'personal') => {
    const cleanUrl = normalizeAnnotationUrl(url);
    const all = get().annotations;
    return all.filter(a => normalizeAnnotationUrl(a.url) === cleanUrl && (!space || a.space === space));
  },

  /**
   * Get all annotations grouped by domain for a given space.
   * @param {string} [space] - Optional space filter
   * @returns {Array<{ domain: string, count: number, items: Array }>}
   */
  getAnnotationsByDomain: (space = null) => {
    const all = get().annotations;
    const filtered = space ? all.filter(a => a.space === space) : all;
    const map = new Map();

    filtered.forEach(ann => {
      const domain = ann.domain || extractDomainFromUrl(ann.url) || 'Other';
      if (!map.has(domain)) {
        map.set(domain, []);
      }
      map.get(domain).push(ann);
    });

    const result = [];
    map.forEach((items, domain) => {
      // Sort items by most recent
      items.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
      result.push({
        domain,
        count: items.length,
        items
      });
    });

    // Sort domains by note count descending
    result.sort((a, b) => b.count - a.count);
    return result;
  },

  /**
   * Export annotations to clean formatted Markdown.
   * @param {string} [space] - Optional space filter
   * @returns {string} Markdown text
   */
  exportToMarkdown: (space = null) => {
    const groups = get().getAnnotationsByDomain(space);
    if (groups.length === 0) return '# QBrowse Web Notes\n\n*No notes or highlights saved yet.*';

    let md = `# QBrowse Web Notes\n*Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n\n---\n\n`;

    groups.forEach(group => {
      md += `## ${group.domain} (${group.count})\n\n`;

      group.items.forEach(item => {
        const dateStr = new Date(item.createdAt).toLocaleDateString();
        md += `### [${item.title || item.domain}](${item.url})\n`;
        md += `> ${item.text}\n\n`;
        if (item.note) {
          md += `**Note**: ${item.note}\n\n`;
        }
        md += `*Saved on ${dateStr} • Color: ${item.color}*\n\n---\n\n`;
      });
    });

    return md;
  }
}));

export default useAnnotationStore;
