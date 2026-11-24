// Custom Text Highlight Color & Style helpers (browser UI + webpages)

export const TEXT_HIGHLIGHT_SWATCHES = [
    { id: 'accent', name: 'Follow Accent', hex: 'accent' },
    { id: '#d4bc94', name: 'Sand', hex: '#d4bc94' },
    { id: '#3b82f6', name: 'Electric Blue', hex: '#3b82f6' },
    { id: '#10b981', name: 'Emerald', hex: '#10b981' },
    { id: '#f43f5e', name: 'Rose', hex: '#f43f5e' },
    { id: '#a855f7', name: 'Violet', hex: '#a855f7' },
    { id: '#f59e0b', name: 'Amber', hex: '#f59e0b' },
    { id: '#06b6d4', name: 'Cyan', hex: '#06b6d4' },
    { id: '#ec4899', name: 'Pink', hex: '#ec4899' }
];

export const TEXT_HIGHLIGHT_STYLES = [
    { id: 'system', label: 'System' },
    { id: 'tinted', label: 'Tinted' },
    { id: 'vibrant', label: 'Vibrant' },
    { id: 'glow', label: 'Glow' },
    { id: 'underline', label: 'Underline' }
];

export function normalizeHexColor(raw, fallback = '#d4bc94') {
    if (typeof raw !== 'string') return fallback;
    const cleaned = raw.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
        const r = cleaned[1];
        const g = cleaned[2];
        const b = cleaned[3];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return fallback;
}

export function hexToRgbTuple(hex) {
    const norm = normalizeHexColor(hex, '#d4bc94');
    return {
        r: parseInt(norm.slice(1, 3), 16),
        g: parseInt(norm.slice(3, 5), 16),
        b: parseInt(norm.slice(5, 7), 16)
    };
}

export function getContrastingForeground(hex) {
    const { r, g, b } = hexToRgbTuple(hex);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.56 ? '#09090b' : '#ffffff';
}

export function buildTextHighlightCss({ style = 'tinted', color = 'accent', accentColor = '#d4bc94' } = {}) {
    const validStyle = ['system', 'tinted', 'vibrant', 'glow', 'underline'].includes(style) ? style : 'tinted';
    if (validStyle === 'system') {
        return {
            style: 'system',
            resolvedHex: normalizeHexColor(color === 'accent' ? accentColor : color),
            bg: '',
            fg: '',
            shadow: '',
            decoration: '',
            cssText: ''
        };
    }

    const resolvedHex = normalizeHexColor(color === 'accent' ? accentColor : color);
    const { r, g, b } = hexToRgbTuple(resolvedHex);

    let bg = `rgba(${r}, ${g}, ${b}, 0.32)`;
    let fg = 'inherit';
    let shadow = 'none';
    let decoration = 'none';

    if (validStyle === 'vibrant') {
        bg = `rgb(${r}, ${g}, ${b})`;
        fg = getContrastingForeground(resolvedHex);
    } else if (validStyle === 'glow') {
        bg = `rgba(${r}, ${g}, ${b}, 0.24)`;
        shadow = `0 0 8px rgba(${r}, ${g}, ${b}, 0.55)`;
    } else if (validStyle === 'underline') {
        bg = `rgba(${r}, ${g}, ${b}, 0.16)`;
        decoration = `underline solid rgb(${r}, ${g}, ${b})`;
    }

    const cssText = `::selection { background-color: ${bg} !important; color: ${fg} !important; text-shadow: ${shadow} !important; text-decoration: ${decoration} !important; }
::-moz-selection { background-color: ${bg} !important; color: ${fg} !important; text-shadow: ${shadow} !important; text-decoration: ${decoration} !important; }`;

    return { style: validStyle, resolvedHex, bg, fg, shadow, decoration, cssText };
}

export function applyTextHighlightToDocument({ style, color, accentColor } = {}) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const res = buildTextHighlightCss({ style, color, accentColor });
    root.dataset.highlightStyle = res.style;
    if (res.style === 'system') {
        root.style.removeProperty('--qbrowse-sel-bg');
        root.style.removeProperty('--qbrowse-sel-fg');
        root.style.removeProperty('--qbrowse-sel-shadow');
        root.style.removeProperty('--qbrowse-sel-deco');
        return;
    }
    root.style.setProperty('--qbrowse-sel-bg', res.bg);
    root.style.setProperty('--qbrowse-sel-fg', res.fg);
    root.style.setProperty('--qbrowse-sel-shadow', res.shadow);
    root.style.setProperty('--qbrowse-sel-deco', res.decoration);
}
