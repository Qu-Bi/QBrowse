import { getFocusedSlotIndex, resolveSplitSlotTabs } from './splitLayoutHelpers.js';

const OAUTH_ALLOWED_HOSTS = new Set([
    'accounts.google.com',
    'accounts.youtube.com',
    'myaccount.google.com',
    'login.microsoftonline.com',
    'login.live.com',
    'appleid.apple.com',
    'idmsa.apple.com',
    'auth0.com',
    'okta.com',
    'onelogin.com',
    'duosecurity.com'
]);

const OAUTH_HOST_PREFIXES = ['auth.', 'login.', 'sso.', 'id.', 'oauth.', 'signin.', 'accounts.'];

export function getPinDomain(pin) {
    if (!pin || !pin.domain) return '';
    return String(pin.domain)
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .split(':')[0]
        .replace(/^www\./i, '');
}

export function getPinHomeUrl(pin) {
    if (!pin) return '';
    if (pin.url && /^https?:\/\//i.test(String(pin.url).trim())) {
        return String(pin.url).trim();
    }
    const rawDomain = String(pin.domain || '').trim();
    if (!rawDomain) return '';
    return /^https?:\/\//i.test(rawDomain) ? rawDomain : `https://${rawDomain}`;
}

/**
 * Arc-style strict ownership: a tab belongs to a pinned app ONLY when
 * its explicit `pinnedId` matches `pin.id`. Normal tabs are never swallowed.
 */
export function isTabForPin(tab, pin) {
    if (!tab || !pin || !tab.pinnedId || !pin.id) return false;
    return tab.pinnedId === pin.id;
}

function getRegistrableRoot(host) {
    const parts = String(host || '').split('.').filter(Boolean);
    if (parts.length <= 2) return host;
    return parts.slice(-2).join('.');
}

export function isUrlAllowedInPin(targetUrl, pin) {
    if (!targetUrl || typeof targetUrl !== 'string') return true;
    const trimmed = targetUrl.trim();
    if (
        !trimmed ||
        trimmed === 'about:blank' ||
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('data:')
    ) {
        return true;
    }

    const pinDomain = getPinDomain(pin);
    if (!pinDomain) return true;

    let host = '';
    try {
        host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, '');
    } catch (_) {
        return true;
    }
    if (!host) return true;

    if (host === pinDomain || host.endsWith('.' + pinDomain) || pinDomain.endsWith('.' + host)) {
        return true;
    }

    if (getRegistrableRoot(host) === getRegistrableRoot(pinDomain)) {
        return true;
    }

    if (OAUTH_ALLOWED_HOSTS.has(host)) return true;
    if (OAUTH_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) return true;
    if (host.endsWith('.auth0.com') || host.endsWith('.okta.com') || host.endsWith('.oktapreview.com')) {
        return true;
    }

    return false;
}

export function isSamePinHomeUrl(currentUrl, pin) {
    const home = getPinHomeUrl(pin);
    if (!currentUrl || !home) return false;
    try {
        const cur = new URL(currentUrl.includes('://') ? currentUrl : `https://${currentUrl}`);
        const hom = new URL(home);
        const curHost = cur.hostname.toLowerCase().replace(/^www\./, '');
        const homHost = hom.hostname.toLowerCase().replace(/^www\./, '');
        const curPath = (cur.pathname || '/').replace(/\/+$/, '') || '/';
        const homPath = (hom.pathname || '/').replace(/\/+$/, '') || '/';
        return curHost === homHost && curPath === homPath;
    } catch (_) {
        return false;
    }
}

export function migrateLegacyPins(rawPins) {
    if (!Array.isArray(rawPins)) return [];
    const normalized = rawPins.map((p) => {
        if (!p || typeof p !== 'object') return null;
        if (p.domain === 'chatgpt.com' || (p.title === 'ChatGPT' && String(p.domain).includes('chatgpt'))) {
            return { ...p, title: 'Gemini', domain: 'gemini.google.com' };
        }
        return p;
    }).filter(Boolean);

    const hasAnySpaceId = normalized.some((p) => Boolean(p.spaceId));
    if (hasAnySpaceId) {
        return normalized.map((p) => (p.spaceId ? p : { ...p, spaceId: 'personal' }));
    }

    const personalPins = normalized.map((p) => ({ ...p, spaceId: 'personal' }));
    const workPins = normalized.map((p) => ({ ...p, id: `${p.id}__work`, spaceId: 'work' }));
    return [...personalPins, ...workPins];
}

export function getFocusedSplitTab({
    spaceTabs = [],
    isSplitView = false,
    splitOrientation = 'horizontal',
    splitPaneTabIds = [null, null, null],
    splitRightTabId = null,
    focusedPane = 'left'
}) {
    if (!Array.isArray(spaceTabs) || spaceTabs.length === 0) return null;
    if (!isSplitView) {
        return spaceTabs.find((t) => t && t.active) || spaceTabs[0] || null;
    }
    const { slots } = resolveSplitSlotTabs({
        spaceTabs,
        isSplitView: true,
        splitOrientation,
        splitPaneTabIds,
        splitRightTabId
    });
    const idx = getFocusedSlotIndex(focusedPane);
    return slots[idx] || slots[0] || spaceTabs.find((t) => t && t.active) || spaceTabs[0] || null;
}
