import { 
    Search, Globe, Video, Code, BookOpen, MessageSquare, 
    Code2, ShoppingBag, Twitter, MapPin, Package, FileText, 
    Bot, Sparkles 
} from 'lucide-react';

export const DEFAULT_SEARCH_BANGS = [
    {
        id: 'google',
        name: 'Google',
        prefix: 'g',
        bangs: ['!g', '!google', '@google'],
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
        bangs: ['!p', '!perplexity', '@perplexity', '@p'],
        url: 'https://www.perplexity.ai/search?q={q}',
        color: '#06B6D4',
        bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        category: 'AI',
        icon: Sparkles
    }
];

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
    const customList = Array.isArray(customBangs) 
        ? customBangs.map(normalizeCustomBang).filter(Boolean) 
        : [];
    return [...customList, ...DEFAULT_SEARCH_BANGS];
}

export function findBangByTrigger(trigger, customBangs = []) {
    if (!trigger) return null;
    const cleanTrigger = trigger.trim().toLowerCase();
    const all = getAllBangs(customBangs);
    return all.find(b => b.bangs.some(candidate => candidate.toLowerCase() === cleanTrigger)) || null;
}

export function parseBangFromQuery(rawQuery, customBangs = []) {
    if (!rawQuery) return null;
    const trimmed = rawQuery.trim();
    if (!trimmed) return null;

    const all = getAllBangs(customBangs);

    // 1. Check leading bang: "!yt lofi beats" or "@youtube lofi beats"
    const prefixMatch = trimmed.match(/^(![a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
    if (prefixMatch) {
        const trigger = prefixMatch[1].toLowerCase();
        const queryText = prefixMatch[2] || '';
        const bang = all.find(b => b.bangs.some(c => c.toLowerCase() === trigger));
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
        const bang = all.find(b => b.bangs.some(c => c.toLowerCase() === trigger));
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

    return all.filter(b => {
        if (!queryStem) return true; // Just "!" or "@" shows top suggestions
        return b.bangs.some(c => c.toLowerCase().startsWith(prefix)) ||
               b.name.toLowerCase().startsWith(queryStem) ||
               b.prefix.toLowerCase().startsWith(queryStem);
    }).slice(0, 8);
}
