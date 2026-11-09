/**
 * Intelligent URL & Title Extractors for QBrowse History
 * Automatically transforms raw URLs, coordinates, and query strings into clean, human-readable titles.
 * Coalesces duplicate SPA state pushes, map pans/zooms, and search redirects.
 * Strictly adheres to project rules (zero unicode emojis).
 */

// Tracking and noise parameters to strip when cleaning URLs
const TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid', 'igshid',
    'ref', 'ref_src', 'ref_url', 'source', 'feature', 'ved', 'ei', 'sei',
    'aep', 'udm', 't', '_ga', '_gl', 'mc_cid', 'mc_eid', 'si', 'spm', 'scm',
    'ns_source', 'ns_mchannel', 'ns_campaign', 'cvid', 'form', 'spref'
]);

// Common technical terms and acronyms to preserve in unslugification
const PRESERVED_ACRONYMS = new Set([
    'api', 'url', 'uri', 'css', 'html', 'js', 'ts', 'jsx', 'tsx', 'json', 'xml',
    'sql', 'nosql', 'c++', 'c#', 'cpu', 'gpu', 'ram', 'ssd', 'ui', 'ux', 'cli',
    'pr', 'mr', 'faq', 'sdk', 'ide', 'npm', 'pypi', 'rest', 'graphql', 'grpc',
    'jwt', 'oauth', 'ssh', 'ssl', 'tls', 'tcp', 'ip', 'dns', 'http', 'https',
    'ai', 'ml', 'llm', 'gpt', 'nlp', 'cv', 'wasm', 'svg', 'png', 'jpg', 'pdf',
    'ios', 'os', 'vm', 'vdom', 'dom', 'spa', 'pwa', 'ssr', 'ssg', 'seo', 'rss'
]);

/**
 * Capitalizes and un-slugifies a URL segment or slug
 * (e.g., "how-to-use-fstream-in-cpp" -> "How To Use Fstream In C++")
 */
export const unslugify = (slug) => {
    if (!slug || typeof slug !== 'string') return '';
    try {
        const decoded = decodeURIComponent(slug)
            .replace(/\.[a-zA-Z0-9]{2,5}$/, '') // strip file extension (.html, .php, etc.)
            .replace(/[-_+]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!decoded) return '';

        return decoded
            .split(' ')
            .map(word => {
                if (!word) return '';
                const lower = word.toLowerCase();
                if (PRESERVED_ACRONYMS.has(lower)) {
                    if (lower === 'c++') return 'C++';
                    if (lower === 'c#') return 'C#';
                    return lower.toUpperCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    } catch (_) {
        return slug;
    }
};

/**
 * Strips tracking parameters from a URL for clean display
 */
export const stripTrackingParams = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
        const u = new URL(rawUrl);
        let changed = false;
        TRACKING_PARAMS.forEach(param => {
            if (u.searchParams.has(param)) {
                u.searchParams.delete(param);
                changed = true;
            }
        });
        return changed ? u.toString() : rawUrl;
    } catch (_) {
        return rawUrl;
    }
};

/**
 * Checks if a URL is noise/clutter that shouldn't clutter the history
 * (e.g. empty Google search with no query, auth pingbacks, chrome-extension pings)
 */
export const isJunkHistoryUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return true;
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed === 'about:blank' || trimmed.startsWith('about:')) return true;
    if (trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) return true;

    try {
        const u = new URL(trimmed);

        // Empty Google search (e.g. google.com/search?aep=11&udm=50 without q)
        if (u.hostname.includes('google.') && (u.pathname === '/search' || u.pathname.startsWith('/search/'))) {
            const q = u.searchParams.get('q');
            if (!q || !q.trim()) return true;
        }

        // Empty Bing search
        if (u.hostname.includes('bing.com') && u.pathname.includes('/search')) {
            const q = u.searchParams.get('q');
            if (!q || !q.trim()) return true;
        }

        // Empty DuckDuckGo search
        if (u.hostname.includes('duckduckgo.com') && (u.pathname === '/' || u.pathname === '')) {
            const q = u.searchParams.get('q');
            // If it's just duckduckgo.com homepage with no query, it's valid, but an empty search param is noise
            if (u.search && !q) return true;
        }

        // Google Accounts auth handshakes & pings
        if (u.hostname.includes('accounts.google.com') && (u.pathname.includes('/signin/v2/challenge') || u.pathname.includes('/CheckCookie'))) {
            return true;
        }

        // Common telemetry & ad redirect endpoints
        if (u.pathname.includes('/telemetry') || u.pathname.includes('/beacon') || u.pathname.includes('/collect')) {
            return true;
        }

        return false;
    } catch (_) {
        return false;
    }
};

/**
 * Formats a clean domain badge string (e.g. "google.com/maps", "github.com", "Local File")
 */
export const formatDisplayDomain = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    if (rawUrl.startsWith('file://')) return 'Local File';
    if (rawUrl.startsWith('qbrowse://')) return 'QBrowse';
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        if (host.includes('google.')) {
            if (u.pathname.includes('/maps')) return 'google.com/maps';
            if (u.pathname.includes('/search')) return 'google.com/search';
            if (host.startsWith('docs.')) return 'docs.google.com';
            if (host.startsWith('drive.')) return 'drive.google.com';
        }
        if (host.includes('github.com')) return 'github.com';
        if (host.includes('stackoverflow.com')) return 'stackoverflow.com';
        if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube.com';
        if (host.includes('reddit.com')) return 'reddit.com';
        if (host.includes('wikipedia.org')) return 'wikipedia.org';

        // Localhost with port
        if (host === 'localhost' || host === '127.0.0.1') {
            return u.port ? `localhost:${u.port}` : 'localhost';
        }

        return host;
    } catch {
        return rawUrl;
    }
};

/**
 * Intelligent title extractor that handles search engines, developer hubs,
 * media portals, documentation, e-commerce, cloud apps, and general URL unslugification.
 */
export const getIntelligentTitle = (itemOrUrl, rawTitleArg) => {
    let rawUrl = '';
    let rawTitle = '';

    if (typeof itemOrUrl === 'object' && itemOrUrl !== null) {
        rawUrl = (itemOrUrl.url || '').trim();
        rawTitle = (itemOrUrl.title || '').trim();
    } else {
        rawUrl = (itemOrUrl || '').trim();
        rawTitle = (rawTitleArg || '').trim();
    }

    if (!rawUrl) return rawTitle || 'Untitled';

    // 1. Local Files
    if (rawUrl.startsWith('file://')) {
        try {
            const cleanPath = decodeURIComponent(rawUrl.replace('file:///', '').replace('file://', ''));
            const pathParts = cleanPath.split(/[/\\]/).filter(Boolean);
            const fileName = pathParts[pathParts.length - 1];
            return fileName ? `${fileName} (Local File)` : 'Local File';
        } catch (_) {
            return 'Local File';
        }
    }

    // 2. QBrowse Internal Pages
    if (rawUrl.startsWith('qbrowse://')) {
        const page = rawUrl.replace('qbrowse://', '').split(/[/?#]/)[0];
        if (page === 'flags') return 'QBrowse Flags & Features';
        if (page === 'settings') return 'Browser Settings';
        if (page === 'ai') return 'Qu-AI Assistant';
        if (page === 'vault') return 'Credential Vault';
        if (page === 'adblock') return 'Shield & Content Filtering';
        if (page === 'history') return 'Archive';
        if (page === 'downloads') return 'Downloads';
        return `QBrowse ${unslugify(page)}`;
    }

    // 3. Localhost Development Servers
    try {
        const testU = new URL(rawUrl);
        if (testU.hostname === 'localhost' || testU.hostname === '127.0.0.1') {
            const port = testU.port ? `:${testU.port}` : '';
            if (rawTitle && !rawTitle.startsWith('http://') && !rawTitle.startsWith('https://') && rawTitle !== 'localhost') {
                return `${rawTitle} (Localhost${port})`;
            }
            const path = testU.pathname === '/' ? '' : testU.pathname;
            return path ? `${unslugify(path)} (Localhost${port})` : `Local Server (${testU.hostname}${port})`;
        }
    } catch (_) {}

    // 4. Google Maps: Places, Directions, Coordinates, Searches
    if (rawUrl.includes('google.') && rawUrl.includes('/maps')) {
        try {
            // Place: /maps/place/Place+Name/@lat,lng,zoom/data=...
            const placeMatch = rawUrl.match(/\/maps\/place\/([^/@?#]+)/);
            if (placeMatch && placeMatch[1]) {
                const place = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ').trim();
                return `${place} - Google Maps`;
            }
            // Directions: /maps/dir/Origin/Destination/...
            const dirMatch = rawUrl.match(/\/maps\/dir\/([^/@?#]+)\/([^/@?#]+)/);
            if (dirMatch && dirMatch[1] && dirMatch[2]) {
                const from = decodeURIComponent(dirMatch[1]).replace(/\+/g, ' ').trim();
                const to = decodeURIComponent(dirMatch[2]).replace(/\+/g, ' ').trim();
                return `Directions: ${from} to ${to} - Google Maps`;
            }
            // Search: /maps/search/Term/...
            const searchMatch = rawUrl.match(/\/maps\/search\/([^/@?#]+)/);
            if (searchMatch && searchMatch[1]) {
                const term = decodeURIComponent(searchMatch[1]).replace(/\+/g, ' ').trim();
                return `Search: ${term} - Google Maps`;
            }
            return 'Google Maps';
        } catch (_) {
            return 'Google Maps';
        }
    }

    // 5. Search Engines (Google, Bing, DuckDuckGo, Brave, Ecosia, Kagi, Yandex, Yahoo, Baidu)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // Google Search
        if (host.includes('google.') && (u.pathname === '/search' || u.pathname.startsWith('/search/'))) {
            const q = u.searchParams.get('q');
            if (q) {
                const decoded = decodeURIComponent(q).replace(/\+/g, ' ').trim();
                const isImages = u.searchParams.get('tbm') === 'isch' || u.searchParams.get('udm') === '2';
                const isNews = u.searchParams.get('tbm') === 'nws' || u.searchParams.get('udm') === '12';
                const isVideos = u.searchParams.get('tbm') === 'vid' || u.searchParams.get('udm') === '7';
                let type = 'Search';
                if (isImages) type = 'Images';
                else if (isNews) type = 'News';
                else if (isVideos) type = 'Videos';
                return `${decoded} - Google ${type}`;
            }
            return 'Google Search';
        }

        // Google Scholar
        if (host.includes('scholar.google.')) {
            const q = u.searchParams.get('q');
            if (q) return `${decodeURIComponent(q).replace(/\+/g, ' ').trim()} - Google Scholar`;
            return 'Google Scholar';
        }

        // Google Finance
        if (host.includes('google.') && u.pathname.includes('/finance/quote/')) {
            const ticker = u.pathname.split('/finance/quote/')[1]?.split(/[/?#]/)[0];
            if (ticker) return `${decodeURIComponent(ticker)} - Google Finance`;
        }

        // Bing Search
        if (host.includes('bing.com') && u.pathname.includes('/search')) {
            const q = u.searchParams.get('q');
            if (q) {
                const decoded = decodeURIComponent(q).replace(/\+/g, ' ').trim();
                const isImages = u.pathname.includes('/images');
                return `${decoded} - Bing ${isImages ? 'Images' : 'Search'}`;
            }
            return 'Bing Search';
        }

        // DuckDuckGo Search
        if (host.includes('duckduckgo.com')) {
            const q = u.searchParams.get('q');
            if (q) {
                return `${decodeURIComponent(q).replace(/\+/g, ' ').trim()} - DuckDuckGo Search`;
            }
        }

        // Brave Search
        if (host.includes('search.brave.com')) {
            const q = u.searchParams.get('q');
            if (q) return `${decodeURIComponent(q).replace(/\+/g, ' ').trim()} - Brave Search`;
        }

        // Ecosia Search
        if (host.includes('ecosia.org') && u.pathname.includes('/search')) {
            const q = u.searchParams.get('q');
            if (q) return `${decodeURIComponent(q).replace(/\+/g, ' ').trim()} - Ecosia`;
        }

        // Kagi Search
        if (host.includes('kagi.com') && u.pathname.includes('/search')) {
            const q = u.searchParams.get('q');
            if (q) return `${decodeURIComponent(q).replace(/\+/g, ' ').trim()} - Kagi`;
        }

        // Yandex Search
        if (host.includes('yandex.') && u.pathname.includes('/search')) {
            const text = u.searchParams.get('text');
            if (text) return `${decodeURIComponent(text).replace(/\+/g, ' ').trim()} - Yandex`;
        }

        // Yahoo Search
        if (host.includes('search.yahoo.com') && u.pathname.includes('/search')) {
            const p = u.searchParams.get('p');
            if (p) return `${decodeURIComponent(p).replace(/\+/g, ' ').trim()} - Yahoo Search`;
        }

        // Perplexity AI
        if (host.includes('perplexity.ai')) {
            const q = u.searchParams.get('q');
            if (q) return `${decodeURIComponent(q).replace(/\+/g, ' ').trim()} - Perplexity`;
            if (u.pathname.startsWith('/search/')) {
                const slug = u.pathname.replace('/search/', '').split(/[/?#]/)[0];
                if (slug) return `${unslugify(slug)} - Perplexity`;
            }
        }
    } catch (_) {}

    // 6. Developer Registries & Hubs (GitHub, GitLab, NPM, PyPI, Crates, Go, Docker Hub, Hugging Face)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // GitHub
        if (host.includes('github.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 4 && parts[2] === 'pull') {
                return `PR #${parts[3]} in ${parts[0]}/${parts[1]} - GitHub`;
            }
            if (parts.length >= 4 && parts[2] === 'issues') {
                return `Issue #${parts[3]} in ${parts[0]}/${parts[1]} - GitHub`;
            }
            if (parts.length >= 4 && parts[2] === 'releases' && parts[3] === 'tag') {
                return `Release ${parts[4] || ''} in ${parts[0]}/${parts[1]} - GitHub`;
            }
            if (parts.length >= 4 && (parts[2] === 'commit' || parts[2] === 'commits')) {
                return `Commit ${parts[3].slice(0, 7)} in ${parts[0]}/${parts[1]} - GitHub`;
            }
            if (parts.length >= 4 && (parts[2] === 'blob' || parts[2] === 'tree')) {
                const file = parts.slice(4).join('/');
                return `${file || parts[3]} in ${parts[0]}/${parts[1]} - GitHub`;
            }
            if (parts.length >= 4 && parts[2] === 'actions' && parts[3] === 'runs') {
                return `Workflow Run #${parts[4] || ''} in ${parts[0]}/${parts[1]} - GitHub`;
            }
            if (parts.length >= 2) {
                return `${parts[0]}/${parts[1]} - GitHub`;
            }
            if (parts.length === 1) {
                return `@${parts[0]} - GitHub`;
            }
        }

        // GitHub Gist
        if (host.includes('gist.github.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                return `Gist by @${parts[0]} - GitHub`;
            }
        }

        // GitLab
        if (host.includes('gitlab.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.includes('merge_requests')) {
                const mrIdx = parts.indexOf('merge_requests');
                return `MR #${parts[mrIdx + 1] || ''} - GitLab`;
            }
            if (parts.includes('issues')) {
                const issIdx = parts.indexOf('issues');
                return `Issue #${parts[issIdx + 1] || ''} - GitLab`;
            }
            if (parts.length >= 2) {
                return `${parts[0]}/${parts[1]} - GitLab`;
            }
        }

        // NPM Package
        if (host.includes('npmjs.com')) {
            if (u.pathname.startsWith('/package/')) {
                const pkg = u.pathname.replace('/package/', '').replace(/\/$/, '');
                return `${pkg} - npm`;
            }
            if (u.pathname.startsWith('/search')) {
                const q = u.searchParams.get('q');
                if (q) return `Search: ${decodeURIComponent(q)} - npm`;
            }
        }

        // PyPI (Python Package Index)
        if (host.includes('pypi.org')) {
            if (u.pathname.startsWith('/project/')) {
                const pkg = u.pathname.replace('/project/', '').split('/')[0];
                return `${pkg} - PyPI`;
            }
            if (u.pathname.startsWith('/search')) {
                const q = u.searchParams.get('q');
                if (q) return `Search: ${decodeURIComponent(q)} - PyPI`;
            }
        }

        // Rust Crates.io
        if (host.includes('crates.io')) {
            if (u.pathname.startsWith('/crates/')) {
                const crate = u.pathname.replace('/crates/', '').split('/')[0];
                return `${crate} - Crates.io`;
            }
            if (u.pathname.startsWith('/search')) {
                const q = u.searchParams.get('q');
                if (q) return `Search: ${decodeURIComponent(q)} - Crates.io`;
            }
        }

        // Go Packages (pkg.go.dev)
        if (host.includes('pkg.go.dev')) {
            const pkg = u.pathname.replace(/^\//, '').split('?')[0];
            if (pkg) return `${pkg} - Go Packages`;
        }

        // Docker Hub
        if (host.includes('hub.docker.com')) {
            if (u.pathname.startsWith('/r/')) {
                const repo = u.pathname.replace('/r/', '').replace(/\/$/, '');
                return `${repo} - Docker Hub`;
            }
            if (u.pathname.startsWith('/_/')) {
                const official = u.pathname.replace('/_/', '').replace(/\/$/, '');
                return `${official} (Official) - Docker Hub`;
            }
        }

        // Hugging Face Models & Spaces
        if (host.includes('huggingface.co')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                return `${parts[0]}/${parts[1]} - Hugging Face`;
            }
        }
    } catch (_) {}

    // 7. Developer Documentation (MDN, CppReference, Rust Docs, Microsoft Learn, Tailwind)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // MDN Web Docs
        if (host.includes('developer.mozilla.org')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const docIdx = parts.indexOf('docs');
            if (docIdx !== -1 && parts[docIdx + 1]) {
                const topic = unslugify(parts[parts.length - 1]);
                return `${topic} - MDN Web Docs`;
            }
        }

        // C++ Reference
        if (host.includes('cppreference.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const topic = parts[parts.length - 1] || '';
            if (topic) return `${decodeURIComponent(topic).replace(/_/g, '::')} - C++ Reference`;
        }

        // Rust Standard Library Docs
        if (host.includes('doc.rust-lang.org')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const item = parts[parts.length - 1]?.replace('.html', '') || '';
            if (item) return `std::${item} - Rust Docs`;
        }

        // Microsoft Learn
        if (host.includes('learn.microsoft.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const last = parts[parts.length - 1] || '';
            if (last) return `${unslugify(last)} - Microsoft Learn`;
        }

        // Tailwind CSS Docs
        if (host.includes('tailwindcss.com') && u.pathname.includes('/docs/')) {
            const slug = u.pathname.split('/docs/')[1]?.split(/[/?#]/)[0];
            if (slug) return `${unslugify(slug)} - Tailwind CSS`;
        }
    } catch (_) {}

    // 8. Q&A & Discussions (Stack Overflow, Stack Exchange, Reddit, Hacker News)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // Stack Overflow & Stack Exchange
        if (host.includes('stackoverflow.com') || host.includes('stackexchange.com') || host.includes('superuser.com') || host.includes('serverfault.com')) {
            if (u.pathname.includes('/questions/')) {
                const parts = u.pathname.split('/').filter(Boolean);
                // /questions/12345/how-to-do-xyz
                if (parts.length >= 3 && parts[2]) {
                    const brand = host.includes('stackoverflow.com') ? 'Stack Overflow' : host.includes('superuser.com') ? 'Super User' : 'Stack Exchange';
                    return `${unslugify(parts[2])} - ${brand}`;
                }
            }
        }

        // Reddit
        if (host.includes('reddit.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            // /r/subreddit/comments/id/slug/
            if (parts.length >= 5 && parts[0] === 'r' && parts[2] === 'comments') {
                return `${unslugify(parts[4])} - r/${parts[1]}`;
            }
            if (parts.length >= 2 && parts[0] === 'r') {
                return `r/${parts[1]} - Reddit`;
            }
            if (parts.length >= 2 && (parts[0] === 'user' || parts[0] === 'u')) {
                return `u/${parts[1]} - Reddit`;
            }
        }

        // Hacker News
        if (host.includes('news.ycombinator.com')) {
            const id = u.searchParams.get('id');
            if (id) {
                if (rawTitle && rawTitle !== 'Hacker News' && !rawTitle.startsWith('http')) {
                    return `${rawTitle} - Hacker News`;
                }
                return `Hacker News Item #${id}`;
            }
            return 'Hacker News Frontpage';
        }
    } catch (_) {}

    // 9. Media & Streaming (YouTube, Twitch, Spotify, IMDb, SoundCloud)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // YouTube
        if (host.includes('youtube.com') || host.includes('youtu.be')) {
            if (u.pathname.includes('/watch')) {
                const titleMatch = rawTitle && !rawTitle.startsWith('http') && rawTitle !== 'YouTube' && !rawTitle.includes('youtube.com') ? rawTitle : '';
                return titleMatch ? `${titleMatch.replace(/\s+-\s+YouTube\s*$/, '')} - YouTube` : 'YouTube Video';
            }
            if (u.pathname.startsWith('/shorts/')) {
                return 'YouTube Short';
            }
            if (u.pathname.startsWith('/@')) {
                return `${u.pathname.slice(1).split(/[/?#]/)[0]} - YouTube`;
            }
            if (u.pathname.includes('/playlist')) {
                return 'YouTube Playlist';
            }
            if (u.pathname.includes('/results')) {
                const q = u.searchParams.get('search_query');
                if (q) return `Search: ${decodeURIComponent(q).replace(/\+/g, ' ')} - YouTube`;
            }
        }

        // Twitch
        if (host.includes('twitch.tv')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length === 1 && !['directory', 'settings', 'downloads'].includes(parts[0])) {
                return `@${parts[0]} - Twitch`;
            }
            if (parts.length >= 2 && parts[0] === 'videos') {
                return `VOD #${parts[1]} - Twitch`;
            }
        }

        // Spotify
        if (host.includes('spotify.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.includes('track')) return 'Spotify Track';
            if (parts.includes('album')) return 'Spotify Album';
            if (parts.includes('playlist')) return 'Spotify Playlist';
            if (parts.includes('artist')) return 'Spotify Artist';
        }

        // IMDb
        if (host.includes('imdb.com')) {
            if (u.pathname.includes('/title/')) {
                if (rawTitle && !rawTitle.startsWith('http') && !rawTitle.includes('IMDb')) {
                    return `${rawTitle} - IMDb`;
                }
                return 'IMDb Title';
            }
            if (u.pathname.includes('/name/')) {
                if (rawTitle && !rawTitle.startsWith('http') && !rawTitle.includes('IMDb')) {
                    return `${rawTitle} - IMDb`;
                }
                return 'IMDb Profile';
            }
        }

        // SoundCloud
        if (host.includes('soundcloud.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                return `${unslugify(parts[1])} by ${unslugify(parts[0])} - SoundCloud`;
            }
        }
    } catch (_) {}

    // 10. Social Platforms (X/Twitter, Bluesky, LinkedIn)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // X / Twitter
        if (host.includes('twitter.com') || host === 'x.com') {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 3 && parts[1] === 'status') {
                return `Post by @${parts[0]} on X`;
            }
            if (parts.length === 1 && !['home', 'explore', 'notifications', 'messages'].includes(parts[0])) {
                return `@${parts[0]} - X`;
            }
        }

        // Bluesky
        if (host.includes('bsky.app')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 4 && parts[0] === 'profile' && parts[2] === 'post') {
                return `Post by @${parts[1]} on Bluesky`;
            }
            if (parts.length >= 2 && parts[0] === 'profile') {
                return `@${parts[1]} - Bluesky`;
            }
        }

        // LinkedIn
        if (host.includes('linkedin.com')) {
            if (u.pathname.startsWith('/in/')) {
                const user = u.pathname.replace('/in/', '').split(/[/?#]/)[0];
                return `${unslugify(user)} - LinkedIn`;
            }
            if (u.pathname.startsWith('/company/')) {
                const comp = u.pathname.replace('/company/', '').split(/[/?#]/)[0];
                return `${unslugify(comp)} - LinkedIn`;
            }
            if (u.pathname.startsWith('/jobs/view/')) {
                return 'Job Posting - LinkedIn';
            }
        }
    } catch (_) {}

    // 11. E-Commerce & Marketplaces (Amazon, eBay, AliExpress, Steam)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // Amazon
        if (host.includes('amazon.')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const dpIndex = parts.indexOf('dp');
            if (dpIndex > 0) {
                return `${unslugify(parts[dpIndex - 1])} - Amazon`;
            }
            const q = u.searchParams.get('k');
            if (q) return `Search: ${decodeURIComponent(q).replace(/\+/g, ' ')} - Amazon`;
        }

        // eBay
        if (host.includes('ebay.')) {
            if (u.pathname.includes('/itm/')) {
                const parts = u.pathname.split('/').filter(Boolean);
                const itmIdx = parts.indexOf('itm');
                if (itmIdx !== -1 && parts[itmIdx + 1]) {
                    return `Item #${parts[itmIdx + 1]} - eBay`;
                }
            }
            const q = u.searchParams.get('_nkw');
            if (q) return `Search: ${decodeURIComponent(q).replace(/\+/g, ' ')} - eBay`;
        }

        // Steam
        if (host.includes('steampowered.com') && u.pathname.includes('/app/')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const appIdx = parts.indexOf('app');
            if (appIdx !== -1 && parts[appIdx + 2]) {
                return `${unslugify(parts[appIdx + 2])} - Steam`;
            }
        }
    } catch (_) {}

    // 12. Cloud Productivity & AI (ChatGPT, Claude, Google Docs/Sheets, Figma, Notion)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // ChatGPT
        if (host.includes('chatgpt.com')) {
            if (rawTitle && !rawTitle.startsWith('http') && rawTitle !== 'ChatGPT') {
                return `${rawTitle} - ChatGPT`;
            }
            if (u.pathname.startsWith('/c/')) return 'ChatGPT Conversation';
            if (u.pathname.startsWith('/g/')) return 'Custom GPT';
            return 'ChatGPT';
        }

        // Claude
        if (host.includes('claude.ai')) {
            if (rawTitle && !rawTitle.startsWith('http') && rawTitle !== 'Claude') {
                return `${rawTitle} - Claude`;
            }
            if (u.pathname.startsWith('/chat/')) return 'Claude Chat';
            return 'Claude AI';
        }

        // Google Docs, Sheets, Slides, Drive
        if (host.includes('docs.google.com')) {
            if (rawTitle && !rawTitle.startsWith('http') && !rawTitle.includes('Google Docs')) {
                return `${rawTitle} - Google Docs`;
            }
            if (u.pathname.includes('/document/')) return 'Google Document';
            if (u.pathname.includes('/spreadsheets/')) return 'Google Spreadsheet';
            if (u.pathname.includes('/presentation/')) return 'Google Presentation';
            return 'Google Workspace';
        }
        if (host.includes('drive.google.com')) {
            return 'Google Drive';
        }

        // Figma
        if (host.includes('figma.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if ((parts[0] === 'design' || parts[0] === 'file') && parts[2]) {
                return `${unslugify(parts[2])} - Figma`;
            }
        }

        // Notion
        if (host.includes('notion.so')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length > 0) {
                const last = parts[parts.length - 1];
                const cleanLast = last.replace(/-[a-f0-9]{32}$/, '');
                return `${unslugify(cleanLast)} - Notion`;
            }
        }
    } catch (_) {}

    // 13. Reference & Encyclopedias (Wikipedia, ArXiv)
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');

        // Wikipedia
        if (host.includes('wikipedia.org') && u.pathname.includes('/wiki/')) {
            const article = u.pathname.replace(/^\/wiki\//, '').split(/[?#]/)[0];
            if (article) return `${unslugify(article)} - Wikipedia`;
        }

        // ArXiv
        if (host.includes('arxiv.org')) {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 2 && (parts[0] === 'abs' || parts[0] === 'pdf')) {
                return `Paper ${parts[1]} - arXiv`;
            }
        }
    } catch (_) {}

    // 14. If rawTitle is already a clean human-readable title (and not a raw URL), use it
    if (rawTitle && !rawTitle.startsWith('http://') && !rawTitle.startsWith('https://')) {
        // Strip repetitive generic browser title suffixes
        const sanitized = rawTitle
            .replace(/\s+-\s+Google\s*$/, '')
            .replace(/\s+-\s+Google Search\s*$/, '')
            .trim();
        if (sanitized) return sanitized;
    }

    // 15. Universal Fallback: Unslugify the last meaningful path segment
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');
        const segments = u.pathname.split('/').filter(Boolean);

        if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            const cleanSlug = unslugify(lastSegment);
            if (cleanSlug && cleanSlug.length > 2 && !/^[0-9a-f]{8,}$/i.test(lastSegment)) {
                return `${cleanSlug} (${host})`;
            }
        }
        return host;
    } catch (_) {
        return rawTitle || rawUrl;
    }
};

/**
 * Generates an intelligent deduplication key for coalescing SPA states,
 * Google Maps pans/zooms, search engine queries, and video players.
 */
export const getHistoryDedupeKey = (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return '';
    try {
        const u = new URL(urlStr);
        const host = u.hostname.replace(/^www\./, '');

        // Google Maps -> coalesce by place name, directions, or search query (ignoring zoom/pan coordinates)
        if (host.includes('google.') && u.pathname.includes('/maps')) {
            const placeMatch = u.pathname.match(/\/maps\/place\/([^/@?#]+)/);
            if (placeMatch && placeMatch[1]) return `gmaps:place:${placeMatch[1].toLowerCase()}`;

            const dirMatch = u.pathname.match(/\/maps\/dir\/([^/@?#]+)\/([^/@?#]+)/);
            if (dirMatch && dirMatch[1] && dirMatch[2]) return `gmaps:dir:${dirMatch[1].toLowerCase()}:${dirMatch[2].toLowerCase()}`;

            const searchMatch = u.pathname.match(/\/maps\/search\/([^/@?#]+)/);
            if (searchMatch && searchMatch[1]) return `gmaps:search:${searchMatch[1].toLowerCase()}`;

            return 'gmaps:general';
        }

        // Google Search -> deduplicate by clean search query 'q'
        if (host.includes('google.') && (u.pathname === '/search' || u.pathname.startsWith('/search/'))) {
            const q = u.searchParams.get('q') || '';
            const trimmedQ = q.trim().toLowerCase();
            return trimmedQ ? `gsearch:${trimmedQ}` : 'gsearch:empty';
        }

        // Bing Search
        if (host.includes('bing.') && u.pathname.includes('/search')) {
            const q = u.searchParams.get('q') || '';
            const trimmedQ = q.trim().toLowerCase();
            return trimmedQ ? `bsearch:${trimmedQ}` : 'bsearch:empty';
        }

        // DuckDuckGo Search
        if (host.includes('duckduckgo.com')) {
            const q = u.searchParams.get('q') || '';
            const trimmedQ = q.trim().toLowerCase();
            return trimmedQ ? `ddg:${trimmedQ}` : 'ddg:empty';
        }

        // Brave Search
        if (host.includes('search.brave.com')) {
            const q = u.searchParams.get('q') || '';
            return `brave:${q.trim().toLowerCase()}`;
        }

        // YouTube Watch -> deduplicate by video ID 'v'
        if (host.includes('youtube.com') && u.pathname.includes('/watch')) {
            const v = u.searchParams.get('v') || '';
            return `yt:video:${v}`;
        }

        // YouTube Shorts
        if (host.includes('youtube.com') && u.pathname.startsWith('/shorts/')) {
            const id = u.pathname.split('/shorts/')[1]?.split(/[/?#]/)[0] || '';
            return `yt:shorts:${id}`;
        }

        // Reddit Posts -> deduplicate by post ID
        if (host.includes('reddit.com') && u.pathname.includes('/comments/')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const id = parts[3] || '';
            return `reddit:post:${id}`;
        }

        // GitHub -> deduplicate by normalized path
        if (host.includes('github.com')) {
            return `gh:${u.pathname.replace(/\/$/, '')}`;
        }

        // Spotify -> deduplicate by track/album/artist ID
        if (host.includes('spotify.com')) {
            return `spotify:${u.pathname.replace(/\/$/, '')}`;
        }

        // General -> Origin + normalized pathname (strips tracking query params and hashes)
        return `${u.origin}${u.pathname.replace(/\/$/, '')}`;
    } catch (_) {
        return urlStr;
    }
};

/**
 * Cleans, parses titles, filters noise, and coalesces duplicate navigations within windowMs
 * (default 15 minutes window for contiguous visits to the same item/search/map).
 */
export const cleanAndDeduplicateHistory = (items, windowMs = 900000) => {
    if (!Array.isArray(items)) return [];
    const result = [];
    let lastKey = '';
    let lastTime = 0;

    for (const item of items) {
        if (!item || !item.url) continue;

        // Skip junk history entries (e.g., empty search query redirects)
        if (isJunkHistoryUrl(item.url)) {
            continue;
        }

        const displayTitle = getIntelligentTitle(item);
        const domain = formatDisplayDomain(item.url);
        const dedupeKey = getHistoryDedupeKey(item.url);
        const time = item.lastVisit || 0;

        // If the exact same place on maps, video, search, or page was visited within windowMs, coalesce it
        if (dedupeKey === lastKey && Math.abs(time - lastTime) < windowMs) {
            // Keep the more descriptive title if the existing one is better
            if (result.length > 0) {
                const prev = result[result.length - 1];
                if (displayTitle && (!prev.displayTitle || prev.displayTitle.startsWith('http'))) {
                    prev.displayTitle = displayTitle;
                }
            }
            continue;
        }

        lastKey = dedupeKey;
        lastTime = time;
        result.push({
            ...item,
            displayTitle,
            domain
        });
    }

    return result;
};
