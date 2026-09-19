import { create } from 'zustand';

// Color definitions for highlights
export const HIGHLIGHT_COLORS = {
  accent: { id: 'accent', label: 'Accent', bg: 'rgba(212, 188, 148, 0.4)', border: '#d4bc94', text: '#d4bc94' },
  yellow: { id: 'yellow', label: 'Yellow', bg: 'rgba(253, 224, 71, 0.35)', border: '#fde047', text: '#eab308' },
  green:  { id: 'green',  label: 'Green',  bg: 'rgba(134, 239, 172, 0.35)', border: '#86efac', text: '#22c55e' },
  blue:   { id: 'blue',   label: 'Blue',   bg: 'rgba(147, 197, 253, 0.35)', border: '#93c5fd', text: '#3b82f6' },
  pink:   { id: 'pink',   label: 'Pink',   bg: 'rgba(244, 114, 182, 0.35)', border: '#f472b6', text: '#ec4899' },
};

// Helper: normalize URL by removing hashes/fragments
export function normalizeAnnotationUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return (rawUrl || '').split('#')[0];
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

function loadStoredAnnotations() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[useAnnotationStore] Failed to load annotations from localStorage:', e);
    return [];
  }
}

function saveStoredAnnotations(annotations) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch (e) {
    console.warn('[useAnnotationStore] Failed to save annotations to localStorage:', e);
  }
}

export const useAnnotationStore = create((set, get) => ({
  annotations: loadStoredAnnotations(),

  /**
   * Add a new highlight or sticky note.
   * @param {Object} data - { space, url, domain, title, text, prefix, suffix, color, note }
   * @returns {Object} created annotation
   */
  addAnnotation: (data) => {
    const cleanUrl = normalizeAnnotationUrl(data.url);
    const domain = data.domain || extractDomainFromUrl(cleanUrl);
    const id = data.id || `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    const newAnnotation = {
      id,
      space: data.space || 'personal',
      url: cleanUrl,
      domain,
      title: data.title || cleanUrl,
      text: data.text || '',
      prefix: data.prefix || '',
      suffix: data.suffix || '',
      color: data.color || 'accent',
      note: (data.note || '').trim(),
      createdAt: now,
      updatedAt: now
    };

    set(state => {
      // Remove any existing duplicate by ID
      const filtered = state.annotations.filter(a => a.id !== id);
      const updated = [...filtered, newAnnotation];
      saveStoredAnnotations(updated);
      return { annotations: updated };
    });

    return newAnnotation;
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
      saveStoredAnnotations(updated);
      return { annotations: updated };
    });
  },

  /**
   * Remove an annotation by ID.
   */
  removeAnnotation: (id) => {
    set(state => {
      const updated = state.annotations.filter(a => a.id !== id);
      saveStoredAnnotations(updated);
      return { annotations: updated };
    });
  },

  /**
   * Clear all annotations for a specific URL in a space.
   */
  clearAnnotationsForUrl: (url, space = null) => {
    const cleanUrl = normalizeAnnotationUrl(url);
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
      md += `## 🌐 ${group.domain} (${group.count})\n\n`;

      group.items.forEach(item => {
        const dateStr = new Date(item.createdAt).toLocaleDateString();
        md += `### [${item.title || item.domain}](${item.url})\n`;
        md += `> ${item.text}\n\n`;
        if (item.note) {
          md += `📝 **Note**: ${item.note}\n\n`;
        }
        md += `*Saved on ${dateStr} • Color: ${item.color}*\n\n---\n\n`;
      });
    });

    return md;
  }
}));

export default useAnnotationStore;
