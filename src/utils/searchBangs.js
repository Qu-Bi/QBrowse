import {
    Search, Globe, Video, Code, BookOpen, MessageSquare,
    Code2, ShoppingBag, Twitter, MapPin, Package, FileText,
    Bot, Sparkles, Terminal, Cloud, DollarSign, Newspaper,
    Gamepad2, Briefcase, Compass
} from 'lucide-react';
import { EXPANDED_BANG_TUPLES } from './expandedBangsData.js';

export const DEFAULT_SEARCH_BANGS = [
    {
        id: 'google',
        name: 'Google',
        prefix: 'g',
        bangs: ['!g', '!google', '@google', '@g'],
        url: 'https://www.google.com/search?q={q}',
        color: '#4285F4',
        bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        category: 'General',
        icon: Search
    },
    {
        id: 'duckduckgo',
        name: 'DuckDuckGo',
        prefix: 'ddg',
        bangs: ['!ddg', '!duckduckgo', '@duckduckgo', '@ddg'],
        url: 'https://duckduckgo.com/?q={q}',
        color: '#DE5833',
        bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        category: 'General',
        icon: Globe
    },
    {
        id: 'bing',
        name: 'Bing',
        prefix: 'b',
        bangs: ['!b', '!bing', '@bing', '@b'],
        url: 'https://www.bing.com/search?q={q}',
        color: '#008373',
        bg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        category: 'General',
        icon: Globe
    },
    {
        id: 'brave',
        name: 'Brave Search',
        prefix: 'br',
        bangs: ['!br', '!brave', '@brave', '@br'],
        url: 'https://search.brave.com/search?q={q}',
        color: '#FB542B',
        bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        category: 'General',
        icon: Globe
    },
    {
        id: 'ecosia',
        name: 'Ecosia',
        prefix: 'eco',
        bangs: ['!eco', '!ecosia', '@ecosia', '@eco'],
        url: 'https://www.ecosia.org/search?q={q}',
        color: '#009688',
        bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        category: 'General',
        icon: Globe
    },
    {
        id: 'startpage',
        name: 'Startpage',
        prefix: 'sp',
        bangs: ['!sp', '!startpage', '@startpage', '@sp'],
        url: 'https://www.startpage.com/sp/search?query={q}',
        color: '#3B82F6',
        bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        category: 'General',
        icon: Globe
    },
    {
        id: 'kagi',
        name: 'Kagi',
        prefix: 'k',
        bangs: ['!k', '!kagi', '@kagi', '@k'],
        url: 'https://kagi.com/search?q={q}',
        color: '#F59E0B',
        bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        category: 'General',
        icon: Search
    },
    {
        id: 'youtube',
        name: 'YouTube',
        prefix: 'yt',
        bangs: ['!yt', '!youtube', '@youtube', '@yt'],
        url: 'https://www.youtube.com/results?search_query={q}',
        color: '#FF0000',
        bg: 'bg-red-500/20 text-red-400 border-red-500/30',
        category: 'Media',
        icon: Video
    },
    {
        id: 'github',
        name: 'GitHub',
        prefix: 'gh',
        bangs: ['!gh', '!github', '@github', '@gh'],
        url: 'https://github.com/search?q={q}',
        color: '#A855F7',
        bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        category: 'Development',
        icon: Code
    },
    {
        id: 'wikipedia',
        name: 'Wikipedia',
        prefix: 'w',
        bangs: ['!w', '!wiki', '!wikipedia', '@wiki', '@wikipedia'],
        url: 'https://en.wikipedia.org/wiki/Special:Search?search={q}',
        color: '#94A3B8',
        bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        category: 'Reference',
        icon: BookOpen
    },
    {
        id: 'reddit',
        name: 'Reddit',
        prefix: 'r',
        bangs: ['!r', '!reddit', '@reddit', '@r'],
        url: 'https://www.reddit.com/search/?q={q}',
        color: '#FF4500',
        bg: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
        category: 'Social',
        icon: MessageSquare
    },
    {
        id: 'stackoverflow',
        name: 'Stack Overflow',
        prefix: 'so',
        bangs: ['!so', '!stackoverflow', '@stackoverflow', '@so'],
        url: 'https://stackoverflow.com/search?q={q}',
        color: '#F48024',
        bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        category: 'Development',
        icon: Code2
    },
    {
        id: 'amazon',
        name: 'Amazon',
        prefix: 'a',
        bangs: ['!a', '!amazon', '@amazon'],
        url: 'https://www.amazon.com/s?k={q}',
        color: '#F59E0B',
        bg: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
        category: 'Shopping',
        icon: ShoppingBag
    },
    {
        id: 'x',
        name: 'X (Twitter)',
        prefix: 'x',
        bangs: ['!x', '!twitter', '@x', '@twitter'],
        url: 'https://x.com/search?q={q}',
        color: '#38BDF8',
        bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        category: 'Social',
        icon: Twitter
    },
    {
        id: 'maps',
        name: 'Google Maps',
        prefix: 'maps',
        bangs: ['!maps', '!map', '@maps', '@map'],
        url: 'https://www.google.com/maps/search/{q}',
        color: '#10B981',
        bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        category: 'Reference',
        icon: MapPin
    },
    {
        id: 'npm',
        name: 'NPM Packages',
        prefix: 'npm',
        bangs: ['!npm', '@npm'],
        url: 'https://www.npmjs.com/search?q={q}',
        color: '#EF4444',
        bg: 'bg-red-600/20 text-red-400 border-red-600/30',
        category: 'Development',
        icon: Package
    },
    {
        id: 'mdn',
        name: 'MDN Web Docs',
        prefix: 'mdn',
        bangs: ['!mdn', '@mdn'],
        url: 'https://developer.mozilla.org/en-US/search?q={q}',
        color: '#3B82F6',
        bg: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
        category: 'Development',
        icon: FileText
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        prefix: 'gemini',
        bangs: ['!gemini', '!gem', '@gemini', '@gem', '!ai'],
        url: 'https://gemini.google.com/app?q={q}',
        color: '#818CF8',
        bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        category: 'AI',
        icon: Sparkles
    },
    {
        id: 'chatgpt',
        name: 'ChatGPT',
        prefix: 'chatgpt',
        bangs: ['!chatgpt', '!gpt', '@chatgpt', '@gpt'],
        url: 'https://chatgpt.com/?q={q}',
        color: '#14B8A6',
        bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        category: 'AI',
        icon: Bot
    },
    {
        id: 'perplexity',
        name: 'Perplexity AI',
        prefix: 'p',
        bangs: ['!p', '!px', '!perplexity', '@perplexity', '@p', '@px'],
        url: 'https://www.perplexity.ai/search?q={q}',
        color: '#06B6D4',
        bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        category: 'AI',
        icon: Sparkles
    }
];

const CATEGORY_STYLES = {
    General: { icon: Globe, color: '#60A5FA', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    Development: { icon: Code2, color: '#A855F7', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    AI: { icon: Sparkles, color: '#818CF8', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    Reference: { icon: BookOpen, color: '#94A3B8', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    Media: { icon: Video, color: '#F43F5E', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    Shopping: { icon: ShoppingBag, color: '#F59E0B', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    Social: { icon: MessageSquare, color: '#38BDF8', bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    Productivity: { icon: Briefcase, color: '#14B8A6', bg: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
    Gaming: { icon: Gamepad2, color: '#EC4899', bg: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    Linux: { icon: Terminal, color: '#22C55E', bg: 'bg-green-500/20 text-green-400 border-green-500/30' },
    Cloud: { icon: Cloud, color: '#06B6D4', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    Finance: { icon: DollarSign, color: '#10B981', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    News: { icon: Newspaper, color: '#EF4444', bg: 'bg-red-500/20 text-red-400 border-red-500/30' },
    Regional: { icon: Compass, color: '#F97316', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
};

let _builtinCatalogCache = null;
let _builtinIndexCache = null;

function expandTriggers(triggers, prefix) {
    const out = [];
    const seen = new Set();
    const stems = [prefix, ...(Array.isArray(triggers) ? triggers : [])];
    for (const raw of stems) {
        const stem = String(raw || '').trim().toLowerCase().replace(/^[!@]/, '');
        if (!stem) continue;
        for (const t of [`!${stem}`, `@${stem}`]) {
            if (!seen.has(t)) {
                seen.add(t);
                out.push(t);
            }
        }
    }
    return out;
}

function getBuiltinBangs() {
    if (_builtinCatalogCache) return _builtinCatalogCache;

    const merged = [...DEFAULT_SEARCH_BANGS];
    const seenIds = new Set(DEFAULT_SEARCH_BANGS.map(b => b.id.toLowerCase()));
    const seenTriggers = new Set();
    for (const b of DEFAULT_SEARCH_BANGS) {
        for (const t of b.bangs) {
            seenTriggers.add(t.toLowerCase());
        }
    }

    for (const tuple of EXPANDED_BANG_TUPLES) {
        if (!Array.isArray(tuple) || tuple.length < 6) continue;
        const [id, name, rawPrefix, rawTriggers, url, category] = tuple;
        const cleanId = String(id || '').trim().toLowerCase();
        const cleanPrefix = String(rawPrefix || '').trim().toLowerCase().replace(/^[!@]/, '');
        if (!cleanId || !cleanPrefix || !url || seenIds.has(cleanId)) continue;

        const candidateTriggers = expandTriggers(rawTriggers, cleanPrefix);
        const uniqueTriggers = candidateTriggers.filter(t => !seenTriggers.has(t));
        if (uniqueTriggers.length === 0) continue;

        seenIds.add(cleanId);
        for (const t of uniqueTriggers) {
            seenTriggers.add(t);
        }

        const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.General;
        merged.push({
            id: cleanId,
            name,
            prefix: cleanPrefix,
            bangs: uniqueTriggers,
            url,
            color: style.color,
            bg: style.bg,
            category: category || 'General',
            icon: style.icon
        });
    }

    _builtinCatalogCache = merged;
    return _builtinCatalogCache;
}

function getBuiltinIndex() {
    if (_builtinIndexCache) return _builtinIndexCache;

    const index = new Map();
    const all = getBuiltinBangs();

    for (const bang of all) {
        for (const trigger of bang.bangs) {
            const key = trigger.toLowerCase();
            if (!index.has(key)) {
                index.set(key, bang);
            }
        }
        const barePrefix = bang.prefix.toLowerCase();
        if (barePrefix && !index.has(barePrefix)) {
            index.set(barePrefix, bang);
        }
        const bareId = bang.id.toLowerCase();
        if (bareId && !index.has(bareId)) {
            index.set(bareId, bang);
        }
    }

    _builtinIndexCache = index;
    return _builtinIndexCache;
}

export function getBangTriggerIndex(customBangs = []) {
    const builtinIndex = getBuiltinIndex();
    if (!Array.isArray(customBangs) || customBangs.length === 0) {
        return builtinIndex;
    }

    // Custom bangs override built-in triggers when present
    const combined = new Map(builtinIndex);
    for (const raw of customBangs) {
        const bang = normalizeCustomBang(raw);
        if (!bang) continue;
        for (const trigger of bang.bangs) {
            combined.set(trigger.toLowerCase(), bang);
        }
        combined.set(bang.prefix.toLowerCase(), bang);
        combined.set(bang.id.toLowerCase(), bang);
    }
    return combined;
}

export function getBangCatalogCount() {
    return getBuiltinBangs().length;
}

export function normalizeCustomBang(custom) {
    if (!custom) return null;
    const cleanPrefix = (custom.prefix || '').replace(/^[!@]/, '').trim().toLowerCase();
    if (!cleanPrefix || !custom.url) return null;
    return {
        id: custom.id || `custom_${cleanPrefix}`,
        name: custom.name || cleanPrefix,
        prefix: cleanPrefix,
        bangs: [`!${cleanPrefix}`, `@${cleanPrefix}`],
        url: custom.url,
        color: custom.color || '#d4bc94',
        bg: custom.bg || 'bg-accent/20 text-accent border-accent/30',
        category: custom.category || 'Custom',
        icon: Search,
        isCustom: true
    };
}

export function getAllBangs(customBangs = []) {
    const builtin = getBuiltinBangs();
    const customList = Array.isArray(customBangs)
        ? customBangs.map(normalizeCustomBang).filter(Boolean)
        : [];
    return customList.length > 0 ? [...customList, ...builtin] : builtin;
}

function findCustomBang(key, customBangs) {
    if (!Array.isArray(customBangs) || customBangs.length === 0) return null;
    for (const raw of customBangs) {
        const bang = normalizeCustomBang(raw);
        if (!bang) continue;
        if (
            bang.prefix === key ||
            bang.id.toLowerCase() === key ||
            bang.bangs.some(c => c.toLowerCase() === key)
        ) {
            return bang;
        }
    }
    return null;
}

export function findBangByTrigger(trigger, customBangs = []) {
    if (!trigger) return null;
    const cleanTrigger = trigger.trim().toLowerCase();
    if (!cleanTrigger) return null;

    if (Array.isArray(customBangs) && customBangs.length > 0) {
        const customMatch = findCustomBang(cleanTrigger, customBangs);
        if (customMatch && (cleanTrigger.startsWith('!') || cleanTrigger.startsWith('@'))) {
            return customMatch;
        }
    }

    if (!cleanTrigger.startsWith('!') && !cleanTrigger.startsWith('@')) {
        return null;
    }

    return getBuiltinIndex().get(cleanTrigger) || null;
}

export function findBangByKeywordOrTrigger(token, customBangs = [], customEngines = []) {
    if (!token || typeof token !== 'string') return null;
    const clean = token.trim().toLowerCase();
    if (!clean || /\s/.test(clean)) return null;

    // 1. Check exact !bang / @bang trigger first (O(1))
    const byTrigger = findBangByTrigger(clean, customBangs);
    if (byTrigger) return byTrigger;

    // 2. Check bare shortcut/prefix/keyword against all bangs (O(1))
    const bare = clean.replace(/^[!@]/, '');
    if (!bare) return null;

    if (Array.isArray(customBangs) && customBangs.length > 0) {
        const customMatch = findCustomBang(bare, customBangs);
        if (customMatch) return customMatch;
    }

    const index = getBuiltinIndex();
    const matchedBang = index.get(bare) || index.get(`!${bare}`) || index.get(`@${bare}`);
    if (matchedBang) return matchedBang;

    // 3. Check custom search engines by shortcut or keyword
    if (Array.isArray(customEngines) && customEngines.length > 0) {
        const matchedEngine = customEngines.find(e => {
            if (!e || !e.url) return false;
            const kw = (e.keyword || '').trim().toLowerCase().replace(/^[!@]/, '');
            const sc = (e.shortcut || '').trim().toLowerCase().replace(/^[!@]/, '');
            return kw === bare || sc === bare;
        });
        if (matchedEngine) {
            const prefix = (matchedEngine.shortcut || matchedEngine.keyword || bare).trim().toLowerCase().replace(/^[!@]/, '');
            return {
                id: matchedEngine.id || `custom_engine_${prefix}`,
                name: matchedEngine.name || prefix,
                prefix,
                bangs: [`!${prefix}`, `@${prefix}`],
                url: matchedEngine.url.replace(/%s/g, '{q}'),
                color: matchedEngine.color || '#d4bc94',
                bg: 'bg-accent/20 text-accent border-accent/30',
                category: 'Custom',
                icon: Search,
                isCustom: true
            };
        }
    }

    return null;
}

export function parseBangFromQuery(rawQuery, customBangs = []) {
    if (!rawQuery) return null;
    const trimmed = rawQuery.trim();
    if (!trimmed) return null;

    // 1. Check leading bang: "!yt lofi beats" or "@youtube lofi beats"
    const prefixMatch = trimmed.match(/^(![a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
    if (prefixMatch) {
        const trigger = prefixMatch[1].toLowerCase();
        const queryText = prefixMatch[2] || '';
        const bang = findBangByTrigger(trigger, customBangs);
        if (bang) {
            return {
                bang,
                trigger,
                queryText: queryText.trim(),
                position: 'start'
            };
        }
    }

    // 2. Check trailing bang: "lofi beats !yt" or "lofi beats @youtube"
    const suffixMatch = trimmed.match(/^(.*?)\s+(![a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)$/);
    if (suffixMatch) {
        const queryText = suffixMatch[1].trim();
        const trigger = suffixMatch[2].toLowerCase();
        const bang = findBangByTrigger(trigger, customBangs);
        if (bang) {
            return {
                bang,
                trigger,
                queryText,
                position: 'end'
            };
        }
    }

    return null;
}

export function buildBangSearchUrl(bang, queryText = '') {
    if (!bang || !bang.url) return '';
    const trimmed = queryText.trim();
    if (!trimmed) {
        try {
            const parsed = new URL(bang.url.replace('{q}', ''));
            return `${parsed.protocol}//${parsed.host}`;
        } catch {
            return bang.url.replace('{q}', '');
        }
    }
    const encoded = encodeURIComponent(trimmed);
    if (bang.url.includes('{q}')) {
        return bang.url.replace('{q}', encoded);
    }
    return `${bang.url}${encoded}`;
}

export function matchBangSuggestions(input, customBangs = []) {
    if (!input) return [];
    const trimmed = input.trim();
    const match = trimmed.match(/^(![a-zA-Z0-9_-]*|@[a-zA-Z0-9_-]*)$/);
    if (!match) return [];

    const prefix = match[1].toLowerCase();
    const queryStem = prefix.slice(1);
    const all = getAllBangs(customBangs);

    if (!queryStem) {
        return all.slice(0, 10);
    }

    const tier1 = []; // Exact prefix/trigger match
    const tier2 = []; // Trigger or prefix starts with input
    const tier3 = []; // Name starts with stem
    const tier4 = []; // Substring match in name/prefix/category/triggers

    for (const b of all) {
        const lowerName = b.name.toLowerCase();
        const lowerPrefix = b.prefix.toLowerCase();
        const lowerCategory = (b.category || '').toLowerCase();

        const isExact = lowerPrefix === queryStem || b.bangs.some(c => c.toLowerCase() === prefix);
        if (isExact) {
            tier1.push(b);
            continue;
        }

        const isTriggerStart = lowerPrefix.startsWith(queryStem) || b.bangs.some(c => c.toLowerCase().startsWith(prefix));
        if (isTriggerStart) {
            tier2.push(b);
            continue;
        }

        if (lowerName.startsWith(queryStem)) {
            tier3.push(b);
            continue;
        }

        const isSubstring =
            lowerName.includes(queryStem) ||
            lowerPrefix.includes(queryStem) ||
            lowerCategory.includes(queryStem) ||
            b.bangs.some(c => c.toLowerCase().includes(queryStem));
        if (isSubstring) {
            tier4.push(b);
        }
    }

    return [...tier1, ...tier2, ...tier3, ...tier4].slice(0, 10);
}
