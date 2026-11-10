// QBrowse Custom Typography & App Font Engine

export const PRESET_FONTS = [
    {
        id: 'default',
        name: 'System Default',
        category: 'Native',
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        description: 'Native operating system typography (Segoe UI / San Francisco).',
        previewText: 'Aa Bb Gg 123',
        type: 'default'
    },
    {
        id: 'inter',
        name: 'Inter',
        category: 'Neo-Grotesque',
        family: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        googleFamily: 'Inter',
        googleWeights: '300;400;500;600;700',
        description: 'Clean, hyper-legible modern interface sans crafted for digital screens.',
        previewText: 'Modern Neo-Grotesque',
        type: 'preset'
    },
    {
        id: 'geist',
        name: 'Geist',
        category: 'Minimalist',
        family: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        googleFamily: 'Geist',
        googleWeights: '300;400;500;600;700',
        description: 'Vercel\'s signature developer typeface with geometric precision.',
        previewText: 'Minimalist Engineering',
        type: 'preset'
    },
    {
        id: 'outfit',
        name: 'Outfit',
        category: 'Geometric',
        family: '"Outfit", sans-serif',
        googleFamily: 'Outfit',
        googleWeights: '300;400;500;600;700',
        description: 'Sophisticated geometric sans with high-fashion and luxury brand aesthetics.',
        previewText: 'Luxury Geometric Sans',
        type: 'preset'
    },
    {
        id: 'plus-jakarta',
        name: 'Plus Jakarta Sans',
        category: 'Contemporary',
        family: '"Plus Jakarta Sans", sans-serif',
        googleFamily: 'Plus Jakarta Sans',
        googleWeights: '400;500;600;700',
        description: 'Fresh, warm, and friendly contemporary typeface designed for premium web apps.',
        previewText: 'Friendly Contemporary',
        type: 'preset'
    },
    {
        id: 'poppins',
        name: 'Poppins',
        category: 'Geometric Rounded',
        family: '"Poppins", sans-serif',
        googleFamily: 'Poppins',
        googleWeights: '300;400;500;600;700',
        description: 'Approachable geometric rounded sans with playful, energetic curves.',
        previewText: 'Approachable Curves',
        type: 'preset'
    },
    {
        id: 'roboto',
        name: 'Roboto',
        category: 'Material',
        family: '"Roboto", sans-serif',
        googleFamily: 'Roboto',
        googleWeights: '300;400;500;700',
        description: 'Google\'s signature Android and Material Design workhorse.',
        previewText: 'Material Architecture',
        type: 'preset'
    },
    {
        id: 'manrope',
        name: 'Manrope',
        category: 'Semi-Geometric',
        family: '"Manrope", sans-serif',
        googleFamily: 'Manrope',
        googleWeights: '400;500;600;700',
        description: 'Crossover between modern grotesk and geometric sans with superior legibility.',
        previewText: 'Precision Semi-Geometric',
        type: 'preset'
    },
    {
        id: 'lexend',
        name: 'Lexend',
        category: 'High-Readability',
        family: '"Lexend", sans-serif',
        googleFamily: 'Lexend',
        googleWeights: '300;400;500;600;700',
        description: 'Scientifically designed to reduce visual stress and accelerate reading speed.',
        previewText: 'Effortless Readability',
        type: 'preset'
    },
    {
        id: 'jetbrains-mono',
        name: 'JetBrains Mono',
        category: 'Developer Monospace',
        family: '"JetBrains Mono", monospace',
        googleFamily: 'JetBrains Mono',
        googleWeights: '400;500;600;700',
        description: 'High-contrast code font with increased letter heights for dev enthusiasts.',
        previewText: 'Developer Aesthetics',
        type: 'preset'
    },
    {
        id: 'fira-code',
        name: 'Fira Code',
        category: 'Developer Monospace',
        family: '"Fira Code", monospace',
        googleFamily: 'Fira Code',
        googleWeights: '400;500;600;700',
        description: 'Monospaced font featuring programming ligatures and crystal clarity.',
        previewText: '=> Programmer Ligatures',
        type: 'preset'
    },
    {
        id: 'playfair-display',
        name: 'Playfair Display',
        category: 'Editorial Serif',
        family: '"Playfair Display", serif',
        googleFamily: 'Playfair Display',
        googleWeights: '400;500;600;700',
        description: 'High-contrast transitional serif reminiscent of European Enlightenment print.',
        previewText: 'Editorial High Fashion',
        type: 'preset'
    },
    {
        id: 'merriweather',
        name: 'Merriweather',
        category: 'Warm Serif',
        family: '"Merriweather", serif',
        googleFamily: 'Merriweather',
        googleWeights: '300;400;700',
        description: 'Warm, pleasant literary serif engineered for pleasant long-form reading.',
        previewText: 'Literary Classic Serif',
        type: 'preset'
    }
];

export const SYSTEM_FONT_SUGGESTIONS = [
    { name: 'Segoe UI Variable', os: 'Windows 11' },
    { name: 'Segoe UI', os: 'Windows' },
    { name: 'San Francisco', os: 'macOS' },
    { name: 'Helvetica Neue', os: 'macOS / Multi' },
    { name: 'Arial', os: 'Universal' },
    { name: 'Calibri', os: 'Windows' },
    { name: 'Trebuchet MS', os: 'Universal' },
    { name: 'Verdana', os: 'Universal' },
    { name: 'Consolas', os: 'Windows Dev' },
    { name: 'Cascadia Code', os: 'Windows Terminal' },
    { name: 'Comic Sans MS', os: 'Casual' },
    { name: 'Ubuntu', os: 'Linux' },
    { name: 'Cantarell', os: 'GNOME' },
    { name: 'Georgia', os: 'Serif' }
];

export const POPULAR_GOOGLE_FONTS = [
    'Space Grotesk',
    'Montserrat',
    'DM Sans',
    'Rubik',
    'Nunito',
    'Cinzel',
    'Orbitron',
    'Sora',
    'Syne',
    'Cabinet Grotesk',
    'Lora',
    'Cinzel Decorative'
];

export const LETTER_SPACING_OPTIONS = [
    { id: 'tight', label: 'Tight', value: '-0.02em' },
    { id: 'normal', label: 'Normal', value: '0em' },
    { id: 'relaxed', label: 'Relaxed', value: '0.02em' },
    { id: 'wide', label: 'Wide', value: '0.04em' }
];

export const WEIGHT_SHIFT_OPTIONS = [
    { id: 'normal', label: 'Normal', value: '400' },
    { id: 'medium', label: 'Medium', value: '500' },
    { id: 'semibold', label: 'Semi-Bold', value: '600' }
];

/**
 * Tests if a local system font is installed on the user's OS
 * using the HTML5 Canvas 2D font metric differential technique.
 */
export function isFontAvailable(fontName) {
    if (typeof document === 'undefined') return false;
    try {
        const testString = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        const baseWidths = {};

        for (const base of baseFonts) {
            ctx.font = `72px ${base}`;
            baseWidths[base] = ctx.measureText(testString).width;
        }

        let detected = false;
        for (const base of baseFonts) {
            ctx.font = `72px "${fontName}", ${base}`;
            const matchedWidth = ctx.measureText(testString).width;
            if (matchedWidth !== baseWidths[base]) {
                detected = true;
                break;
            }
        }
        return detected;
    } catch (_) {
        return false;
    }
}

/**
 * Injects or updates Google Fonts <link> element in the document <head>.
 */
export function injectGoogleFontLink(family, weights = '300;400;500;600;700') {
    if (typeof document === 'undefined' || !family) return;
    try {
        const cleanFamily = family.trim().replace(/^['"]|['"]$/g, '');
        const encodedFamily = cleanFamily.replace(/ /g, '+');
        const href = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weights}&display=swap`;

        let link = document.getElementById('qbrowse-google-font');
        if (!link) {
            link = document.createElement('link');
            link.id = 'qbrowse-google-font';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        if (link.getAttribute('href') !== href) {
            link.setAttribute('href', href);
        }
    } catch (_) {}
}

/**
 * Removes Google Fonts link if custom font is disabled or local.
 */
export function removeGoogleFontLink() {
    if (typeof document === 'undefined') return;
    try {
        const link = document.getElementById('qbrowse-google-font');
        if (link && link.parentNode) {
            link.parentNode.removeChild(link);
        }
    } catch (_) {}
}

/**
 * Injects or updates custom @font-face style tag for uploaded font files.
 */
export function injectCustomFontFileStyle(fontName, fileDataUrl) {
    if (typeof document === 'undefined' || !fileDataUrl) return;
    try {
        let style = document.getElementById('qbrowse-custom-font-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'qbrowse-custom-font-style';
            document.head.appendChild(style);
        }

        let format = 'woff2';
        if (fileDataUrl.includes('font/ttf') || fileDataUrl.includes('application/x-font-ttf')) {
            format = 'truetype';
        } else if (fileDataUrl.includes('font/otf') || fileDataUrl.includes('application/x-font-opentype')) {
            format = 'opentype';
        } else if (fileDataUrl.includes('font/woff')) {
            format = 'woff';
        }

        style.textContent = `
@font-face {
  font-family: '${fontName || 'QBrowseCustomFont'}';
  src: url('${fileDataUrl}') format('${format}');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
`;
    } catch (_) {}
}

/**
 * Clears uploaded custom font style tag.
 */
export function removeCustomFontFileStyle() {
    if (typeof document === 'undefined') return;
    try {
        const style = document.getElementById('qbrowse-custom-font-style');
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    } catch (_) {}
}

/**
 * Applies the entire typography configuration to document.documentElement
 * via CSS variables and dynamic font injections.
 */
export function applyAppFont(settings = {}) {
    if (typeof document === 'undefined') return;
    try {
        const root = document.documentElement;

        const fontType = settings.appFontType || 'default';
        const fontFamily = settings.appFontFamily || 'default';
        const googleFamily = settings.appFontGoogleFamily || '';
        const customName = settings.appFontCustomName || '';
        const fileData = settings.appFontFileData || null;
        const letterSpacing = settings.appFontLetterSpacing || 'normal';
        const sizeScale = Number(settings.appFontSizeScale) || 100;
        const weightShift = settings.appFontWeightShift || 'normal';

        let resolvedFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

        if (fontType === 'default' || fontFamily === 'default') {
            removeGoogleFontLink();
            removeCustomFontFileStyle();
            resolvedFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        } else if (fontType === 'preset') {
            const foundPreset = PRESET_FONTS.find(p => p.id === fontFamily);
            if (foundPreset) {
                if (foundPreset.googleFamily) {
                    injectGoogleFontLink(foundPreset.googleFamily, foundPreset.googleWeights);
                } else {
                    removeGoogleFontLink();
                }
                removeCustomFontFileStyle();
                resolvedFontFamily = foundPreset.family;
            }
        } else if (fontType === 'google') {
            const familyToUse = (googleFamily || fontFamily || '').trim();
            if (familyToUse) {
                injectGoogleFontLink(familyToUse);
                removeCustomFontFileStyle();
                resolvedFontFamily = `"${familyToUse}", sans-serif`;
            }
        } else if (fontType === 'system') {
            removeGoogleFontLink();
            removeCustomFontFileStyle();
            const sysName = (customName || fontFamily || '').trim().replace(/^['"]|['"]$/g, '');
            resolvedFontFamily = sysName ? `"${sysName}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` : resolvedFontFamily;
        } else if (fontType === 'file' && fileData) {
            removeGoogleFontLink();
            const localFamilyName = 'QBrowseCustomFont';
            injectCustomFontFileStyle(localFamilyName, fileData);
            resolvedFontFamily = `"${localFamilyName}", sans-serif`;
        }

        // Letter spacing mapping
        const spacingMap = {
            tight: '-0.02em',
            normal: '0em',
            relaxed: '0.02em',
            wide: '0.04em'
        };
        const resolvedSpacing = spacingMap[letterSpacing] || (letterSpacing.endsWith('em') ? letterSpacing : '0em');

        // Font scale mapping (e.g. 100% -> 1)
        const scaleFactor = Math.max(0.85, Math.min(1.25, sizeScale / 100));

        // Weight shift
        const weightMap = {
            normal: '400',
            medium: '500',
            semibold: '600'
        };
        const resolvedWeightShift = weightMap[weightShift] || '400';

        // Set Root CSS Variables
        root.style.setProperty('--app-font-family', resolvedFontFamily);
        root.style.setProperty('--app-letter-spacing', resolvedSpacing);
        root.style.setProperty('--app-font-scale', String(scaleFactor));
        root.style.setProperty('--app-font-weight-shift', resolvedWeightShift);

        root.dataset.appFontType = fontType;
        root.dataset.appFont = (fontType === 'preset' ? fontFamily : (googleFamily || customName || fontType));
    } catch (err) {
        console.warn('[FontManager] Failed to apply app font:', err);
    }
}

