import { HIGHLIGHT_COLORS } from '../store/useAnnotationStore';

export function extractPrefixAndSuffix(range) {
  let prefix = '';
  let suffix = '';
  try {
    const startNode = range.startContainer;
    if (startNode && startNode.nodeValue) {
      prefix = startNode.nodeValue.substring(Math.max(0, range.startOffset - 32), range.startOffset);
    }
    const endNode = range.endContainer;
    if (endNode && endNode.nodeValue) {
      suffix = endNode.nodeValue.substring(range.endOffset, Math.min(endNode.nodeValue.length, range.endOffset + 32));
    }
  } catch (_) {}
  return { prefix, suffix };
}

export function attachNoteBadge(targetEl, id, onClick = null) {
  let existing = targetEl.parentNode?.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${id}"]`);
  if (existing) return existing;

  const badge = document.createElement('span');
  badge.className = 'qbrowse-note-badge';
  badge.setAttribute('data-qbrowse-id', id);
  badge.title = 'Click to view note';
  badge.innerHTML = '📝';
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 3px;
    vertical-align: 1px;
    cursor: pointer;
    background: rgba(18, 18, 24, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    padding: 1px 4px;
    font-size: 11px;
    line-height: 14px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    user-select: none;
    transition: transform 0.15s ease;
  `;
  if (onClick) {
    badge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(id, badge);
    };
  }

  if (targetEl.nextSibling) {
    targetEl.parentNode.insertBefore(badge, targetEl.nextSibling);
  } else {
    targetEl.parentNode.appendChild(badge);
  }
  return badge;
}

export function wrapRangeWithHighlight(range, id, colorKey = 'accent', noteText = '', onBadgeClick = null) {
  const color = HIGHLIGHT_COLORS[colorKey] || HIGHLIGHT_COLORS.accent;
  const marks = [];

  try {
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer;
      const selectedText = textNode.textContent.substring(range.startOffset, range.endOffset);

      const mark = document.createElement('mark');
      mark.className = 'qbrowse-highlight';
      mark.setAttribute('data-qbrowse-id', id);
      mark.setAttribute('data-color', colorKey);
      mark.style.cssText = `background-color: ${color.bg} !important; border-bottom: 2px solid ${color.border} !important; color: inherit !important; border-radius: 3px; padding: 1px 1px; cursor: pointer; text-decoration: none;`;
      mark.textContent = selectedText;

      const afterText = textNode.splitText(range.startOffset);
      afterText.deleteData(0, range.endOffset - range.startOffset);
      afterText.parentNode.insertBefore(mark, afterText);
      marks.push(mark);
    } else {
      const mark = document.createElement('mark');
      mark.className = 'qbrowse-highlight';
      mark.setAttribute('data-qbrowse-id', id);
      mark.setAttribute('data-color', colorKey);
      mark.style.cssText = `background-color: ${color.bg} !important; border-bottom: 2px solid ${color.border} !important; color: inherit !important; border-radius: 3px; padding: 1px 1px; cursor: pointer; text-decoration: none;`;

      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
      marks.push(mark);
    }
  } catch (e) {
    console.warn('[QBrowse Annotations] wrapRangeWithHighlight error:', e);
  }

  if (marks.length > 0 && noteText) {
    attachNoteBadge(marks[marks.length - 1], id, onBadgeClick);
  }

  return marks;
}

export function findTextRangeInContainer(container, targetText, prefix = '', suffix = '') {
  if (!targetText || !container) return null;
  const cleanTarget = targetText.trim();
  if (!cleanTarget) return null;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_SKIP;
        const tag = parent.tagName.toUpperCase();
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'MARK'].includes(tag)) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let node;
  let fullText = '';
  while ((node = walker.nextNode())) {
    const start = fullText.length;
    const val = node.nodeValue;
    fullText += val;
    textNodes.push({ node, start, end: start + val.length });
  }

  let bestIndex = -1;
  let bestScore = -1;
  let searchIdx = -1;

  while ((searchIdx = fullText.indexOf(cleanTarget, searchIdx + 1)) !== -1) {
    let score = 0;
    if (prefix) {
      const actualPrefix = fullText.slice(Math.max(0, searchIdx - prefix.length), searchIdx);
      if (actualPrefix.includes(prefix) || prefix.includes(actualPrefix)) score += 2;
    }
    if (suffix) {
      const actualSuffix = fullText.slice(searchIdx + cleanTarget.length, searchIdx + cleanTarget.length + suffix.length);
      if (actualSuffix.includes(suffix) || suffix.includes(actualSuffix)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = searchIdx;
    }
    if (!prefix && !suffix) {
      bestIndex = searchIdx;
      break;
    }
  }

  if (bestIndex === -1) {
    const lowerFull = fullText.toLowerCase();
    const lowerTarget = cleanTarget.toLowerCase();
    bestIndex = lowerFull.indexOf(lowerTarget);
  }

  if (bestIndex === -1) return null;

  const matchEnd = bestIndex + cleanTarget.length;
  let startContainer = null, startOffset = 0;
  let endContainer = null, endOffset = 0;

  for (const item of textNodes) {
    if (!startContainer && item.start <= bestIndex && bestIndex <= item.end) {
      startContainer = item.node;
      startOffset = bestIndex - item.start;
    }
    if (item.start <= matchEnd && matchEnd <= item.end) {
      endContainer = item.node;
      endOffset = matchEnd - item.start;
      break;
    }
  }

  if (startContainer && endContainer) {
    try {
      const range = document.createRange();
      range.setStart(startContainer, startOffset);
      range.setEnd(endContainer, endOffset);
      return range;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function applyAnnotationsToContainer(container, annotations = [], onBadgeClick = null) {
  if (!container || !Array.isArray(annotations)) return;

  annotations.forEach(ann => {
    // If already rendered, update styles and note badge
    const existingMarks = container.querySelectorAll(`.qbrowse-highlight[data-qbrowse-id="${ann.id}"]`);
    if (existingMarks.length > 0) {
      const color = HIGHLIGHT_COLORS[ann.color] || HIGHLIGHT_COLORS.accent;
      existingMarks.forEach(m => {
        m.style.backgroundColor = `${color.bg} !important`;
        m.style.borderBottom = `2px solid ${color.border} !important`;
      });
      if (ann.note) {
        attachNoteBadge(existingMarks[existingMarks.length - 1], ann.id, onBadgeClick);
      } else {
        const badge = container.querySelector(`.qbrowse-note-badge[data-qbrowse-id="${ann.id}"]`);
        if (badge) badge.remove();
      }
      return;
    }

    // Otherwise find range and wrap
    const range = findTextRangeInContainer(container, ann.text, ann.prefix, ann.suffix);
    if (range) {
      wrapRangeWithHighlight(range, ann.id, ann.color || 'accent', ann.note || '', onBadgeClick);
    }
  });
}
