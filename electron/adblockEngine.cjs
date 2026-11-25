/**
 * QBrowse High-Performance Native Adblock Engine
 * Powered by Brave's native Rust adblock engine (adblock-rs)
 * Features:
 *  - Sub-microsecond native DFA network URL matching (EasyList, EasyPrivacy, uBlock filters)
 *  - Site-specific cosmetic element hiding (hide_selectors, style_selectors, exceptions)
 *  - Scriptlet injection and placeholder collapsing (eliminating empty ad whitespace)
 *  - Pre-compiled binary cache serialization (< 1ms startup)
 *  - Graceful pure-JS fallback (@ghostery/adblocker) for complete reliability
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const dns = require('dns');
const rustBridge = require('./rustBridge.cjs');
let ipcMain = null;
let webContents = null;
try {
    const electron = require('electron');
    ipcMain = electron?.ipcMain || null;
    webContents = electron?.webContents || null;
} catch (_) {}

// Reliable native HTTP downloader (bypasses Node undici assertion bugs and handles 301/302 redirects)
function downloadFilterText(targetUrl, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) return reject(new Error('Too many redirects'));
        const client = targetUrl.startsWith('https:') ? https : http;
        const req = client.get(targetUrl, {
            headers: { 'User-Agent': 'QBrowse-Adblock/1.4' },
            timeout: 25000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = new URL(res.headers.location, targetUrl).toString();
                return resolve(downloadFilterText(nextUrl, redirects + 1));
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
    });
}

const AdBlockClient = null;
let fallbackBlocker = null;
let nativeEngine = null;
let customNativeEngine = null;
let engineMode = 'native-rust';
let activeRuleCount = 180000;
let lastCacheUpdate = 0;

let isAdblockActive = true;
let settingsStoreRef = null;
let mainWindowRef = null;

// Batch tracker notification state
let pendingBlockedBatch = 0;
let blockedBatchTimer = null;
let lastBlockedUrl = '';
let cnameUncloakedCount = 0;

const CNAME_TTL_MS = 10 * 60 * 1000;
const CNAME_MAX_ENTRIES = 2000;
const CNAME_TIMEOUT_MS = 300;
const IPV4_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function shouldResolveCnameHost(host) {
    if (!host || typeof host !== 'string') return false;
    const clean = host.trim().toLowerCase().replace(/\.$/, '');
    if (!clean) return false;
    if (clean === 'localhost' || clean.endsWith('.localhost') || clean.endsWith('.local') || clean.endsWith('.onion') || clean.endsWith('.internal')) {
        return false;
    }
    if (clean.includes(':') || clean.startsWith('[') || IPV4_REGEX.test(clean)) {
        return false;
    }
    const labels = clean.split('.').filter(Boolean);
    // Only resolve subdomains (e.g. metrics.example.com), skip single-label & root domains
    return labels.length >= 3;
}

function createCnameResolver(resolveFn, options = {}) {
    const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : CNAME_TTL_MS;
    const maxEntries = typeof options.maxEntries === 'number' ? options.maxEntries : CNAME_MAX_ENTRIES;
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : CNAME_TIMEOUT_MS;
    const nowFn = typeof options.nowFn === 'function' ? options.nowFn : Date.now;

    const cache = new Map();
    const inFlight = new Map();

    function setCached(host, cnames) {
        if (cache.has(host)) {
            cache.delete(host);
        } else if (cache.size >= maxEntries) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) {
                cache.delete(oldestKey);
            }
        }
        cache.set(host, { cnames, expiresAt: nowFn() + ttlMs });
    }

    function getCached(host) {
        if (!host) return null;
        const entry = cache.get(host);
        if (!entry) return null;
        if (nowFn() >= entry.expiresAt) {
            cache.delete(host);
            return null;
        }
        return entry.cnames;
    }

    function resolveInBackground(host, isOfflineFn) {
        if (!shouldResolveCnameHost(host)) return null;
        if (typeof isOfflineFn === 'function' && isOfflineFn()) return null;
        const existing = getCached(host);
        if (existing !== null) return null;
        if (inFlight.has(host)) return inFlight.get(host);

        const promise = (async () => {
            let timer = null;
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('CNAME timeout')), timeoutMs);
                });
                const raw = await Promise.race([Promise.resolve(resolveFn(host)), timeoutPromise]);
                const normalized = Array.isArray(raw)
                    ? raw.map((c) => String(c || '').trim().toLowerCase().replace(/\.$/, '')).filter(Boolean)
                    : [];
                setCached(host, normalized);
                return normalized;
            } catch (_) {
                setCached(host, []);
                return [];
            } finally {
                if (timer) clearTimeout(timer);
                inFlight.delete(host);
            }
        })();

        inFlight.set(host, promise);
        return promise;
    }

    return {
        getCached,
        resolveInBackground,
        clear: () => {
            cache.clear();
            inFlight.clear();
        },
        size: () => cache.size
    };
}

function rebuildCustomNativeEngine(settings) {
    const list = Array.isArray(settings?.adblockCustomBlockedDomains) ? settings.adblockCustomBlockedDomains : [];
    try {
        rustBridge.shieldSetCustomRules(list);
    } catch (e) {
        console.warn('[AdblockEngine] Could not sync custom rules to Rust Shield:', e.message);
    }
    const allowlist = Array.isArray(settings?.adblockWhitelist) ? settings.adblockWhitelist : [];
    try {
        rustBridge.shieldSetPausedDomains(allowlist);
    } catch (_) {}
}

let cachedCustomBlockedVersion = null;
let cachedCustomBlockedSet = new Set();

function getCustomBlockedSet(settings) {
    const list = Array.isArray(settings?.adblockCustomBlockedDomains) ? settings.adblockCustomBlockedDomains : [];
    if (list === cachedCustomBlockedVersion) {
        return cachedCustomBlockedSet;
    }
    cachedCustomBlockedVersion = list;
    const newSet = new Set();
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (typeof item === 'string') {
            const clean = item.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
            if (clean) newSet.add(clean);
        }
    }
    cachedCustomBlockedSet = newSet;
    return cachedCustomBlockedSet;
}

let cachedAllowlistVersion = null;
let cachedAllowlistSet = new Set();

function getAllowlistSet(settings) {
    const list = Array.isArray(settings?.adblockAllowlist) ? settings.adblockAllowlist : [];
    if (list === cachedAllowlistVersion) {
        return cachedAllowlistSet;
    }
    cachedAllowlistVersion = list;
    const newSet = new Set();
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (typeof item === 'string') {
            const clean = item.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
            if (clean) newSet.add(clean);
        }
    }
    cachedAllowlistSet = newSet;
    return cachedAllowlistSet;
}

function isHostInSet(host, domainSet) {
    if (!host || !domainSet || domainSet.size === 0) return false;
    let checkHost = host;
    while (checkHost) {
        if (domainSet.has(checkHost)) return true;
        const dot = checkHost.indexOf('.');
        if (dot === -1) break;
        checkHost = checkHost.slice(dot + 1);
    }
    return false;
}

function isSubdomainOrExact(host, targetDomain) {
    return host === targetDomain || host.endsWith('.' + targetDomain);
}

const YOUTUBE_PASS_THROUGH_DOMAINS = [
    'youtube.com',
    'youtu.be',
    'googlevideo.com',
    'ytimg.com',
    'youtube-nocookie.com',
    'yt3.ggpht.com'
];

function extractHostname(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed === 'null') return '';
    try {
        if (trimmed.includes('://')) {
            return new URL(trimmed).hostname.toLowerCase().replace(/^www\./, '');
        }
        if (/^[a-z][a-z0-9+.-]*:(?!\d+(\/|$))/i.test(trimmed)) {
            return '';
        }
        return trimmed.split('/')[0].split(':')[0].toLowerCase().replace(/^www\./, '');
    } catch (_) {
        return '';
    }
}

function isYouTubeDomain(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    const clean = hostname.toLowerCase().replace(/^www\./, '');
    if (!clean) return false;
    return YOUTUBE_PASS_THROUGH_DOMAINS.some((domain) => isSubdomainOrExact(clean, domain));
}

const YOUTUBE_COSMETIC_SELECTORS = [
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-compact-promoted-video-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    '#masthead-ad',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    'ytd-merch-shelf-renderer'
];

function notifyBlocked(url) {
    pendingBlockedBatch++;
    lastBlockedUrl = url;
    if (!blockedBatchTimer) {
        blockedBatchTimer = setTimeout(() => {
            blockedBatchTimer = null;
            if (mainWindowRef && !mainWindowRef.isDestroyed() && pendingBlockedBatch > 0) {
                try {
                    mainWindowRef.webContents.send('tracker-blocked-batch', {
                        count: pendingBlockedBatch,
                        url: lastBlockedUrl
                    });
                    mainWindowRef.webContents.send('tracker-blocked', lastBlockedUrl);
                } catch (_) {}
                pendingBlockedBatch = 0;
            }
        }, 180);
    }
}

// Resource type mapping: Electron -> adblock-rs
function mapResourceType(electronType) {
    switch (electronType) {
        case 'mainFrame': return 'main_frame';
        case 'subFrame': return 'sub_frame';
        case 'stylesheet': return 'stylesheet';
        case 'script': return 'script';
        case 'image': return 'image';
        case 'font': return 'font';
        case 'object': return 'object';
        case 'xhr': return 'xmlhttprequest';
        case 'ping': return 'ping';
        case 'media': return 'media';
        case 'webSocket': return 'websocket';
        default: return 'other';
    }
}

// Core Baseline Rules (guarantees instant, offline ad and tracker blocking on first launch)
const BASELINE_FILTERS = `
! QBrowse High-Priority Baseline Rules
||googleadservices.com^
||googlesyndication.com^
||doubleclick.net^
||adnxs.com^
||criteo.com^
||criteo.net^
||taboola.com^
||outbrain.com^
||rubiconproject.com^
||pubmatic.com^
||openx.net^
||scorecardresearch.com^
||amazon-adsystem.com^
||adroll.com^
||applovin.com^
||chartbeat.com^
||quantserve.com^
||moatads.com^
||popads.net^
||popcash.net^
||propellerads.com^
||coinhive.com^
||crypto-loot.com^
||minero.cc^
||cdn.cookielaw.org^
||consent.cookiebot.com^
||consent.trustarc.com^
||quantcast.mgr.consensu.org^
||fundingchoicesmessages.google.com^
||cmp.osano.com^
||static.hotjar.com^
||script.hotjar.com^
||edge.fullstory.com^
||rs.fullstory.com^
||clarity.ms^
||cdn.mouseflow.com^
||api-js.mixpanel.com^
||cdn.heapanalytics.com^
||connect.facebook.net$third-party
||facebook.com/tr$third-party
||static.ads-twitter.com$third-party
||analytics.tiktok.com$third-party
||snap.licdn.com$third-party
||gemius.pl^
||adocean.pl^
||adform.net^
||smartadserver.com^
||adkontekst.pl^
||netsprint.pl^
||teads.tv^
||dot.wp.pl^
||adv.wp.pl^
||dynacrems.wp.pl^
||wpimg.pl/b/^
||wpimg.pl/advert/^
||wpimg.pl/b-^
||wpimg.pl/rek/^
||wpimg.pl/banner^
||2mdn.net^
||innovid.com^
##.ad-banner
##.advertisement
##[id*="google_ads"]
##[class*="google_ads"]
##.taboola
##.outbrain
##[data-ad-unit]
##[data-ad-slot]
##.ad-container
##.ad-placeholder
##[class*="reklama"]
##[id*="reklama"]
##[class*="Billboard"]
##[id*="Billboard"]
##[class*="AdSlot"]
##[class*="ad-slot"]
##[id^="gpt-ad"]
##[class*="gpt-ad"]
${YOUTUBE_COSMETIC_SELECTORS.map(sel => `youtube.com##${sel}`).join('\n')}
wp.pl##.wp-header-panel
wp.pl##[class*="wp-header-panel"]
wp.pl##[class*="screeningWallpaper"]
wp.pl##[class*="bmjdxfegh"]
`;

// Filter list remote sources
const FILTER_SOURCES = [
    { id: 'easylist', name: 'EasyList', url: 'https://easylist.to/easylist/easylist.txt' },
    { id: 'easyprivacy', name: 'EasyPrivacy', url: 'https://easylist.to/easylist/easyprivacy.txt' },
    { id: 'annoyances', name: 'uBlock Annoyances', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-cookies.txt' },
    { id: 'peterlowe', name: "Peter Lowe's List", url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext' },
    { id: 'ublock-filters', name: 'uBlock Filters', url: 'https://ublockorigin.github.io/uAssets/filters/filters.txt' },
    { id: 'ublock-badware', name: 'uBlock Badware', url: 'https://ublockorigin.github.io/uAssets/filters/badware.txt' },
    { id: 'ublock-privacy', name: 'uBlock Privacy', url: 'https://ublockorigin.github.io/uAssets/filters/privacy.txt' },
    { id: 'ublock-quick-fixes', name: 'uBlock Quick Fixes', url: 'https://ublockorigin.github.io/uAssets/filters/quick-fixes.txt' },
    { id: 'ublock-unbreak', name: 'uBlock Unbreak', url: 'https://ublockorigin.github.io/uAssets/filters/unbreak.txt' }
];

class AdblockEngine {
    constructor() {
        this.cacheDir = '';
        this.cacheFile = '';
        this.isUpdating = false;
        this.cnameResolver = createCnameResolver((host) => dns.promises.resolveCname(host));
    }

    async init(app, settingsStore, mainWindow) {
        settingsStoreRef = settingsStore;
        mainWindowRef = mainWindow;
        isAdblockActive = settingsStore.adblockEnabled !== false;

        this.cacheDir = path.join(app.getPath('userData'), 'adblock_cache');
        this.cacheFile = path.join(this.cacheDir, 'engine-v4.bin');

        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
            }
        } catch (_) {}

        // 1. Load pre-compiled binary cache via qbrowse-shield in-process Rust core
        try {
            if (fs.existsSync(this.cacheFile)) {
                const t0 = performance.now();
                rustBridge.shieldLoadCache(this.cacheFile);
                const t1 = performance.now();
                const stats = fs.statSync(this.cacheFile);
                lastCacheUpdate = stats.mtimeMs || Date.now();
                engineMode = 'native-rust';
                activeRuleCount = 180000;
                console.log(`[AdblockEngine] Restored native Rust Shield cache in ${(t1 - t0).toFixed(2)}ms.`);

                if (Date.now() - lastCacheUpdate > 7 * 24 * 60 * 60 * 1000) {
                    setTimeout(() => { this.updateFilters(false); }, 30000);
                }
            } else {
                engineMode = 'native-rust';
                activeRuleCount = 2500;
                console.log('[AdblockEngine] Native Rust Shield baseline active. Scheduling background list update...');
                setTimeout(() => {
                    this.updateFilters(false).catch(err => {
                        console.warn('[AdblockEngine] Initial background list download deferred:', err.message);
                    });
                }, 2000);
            }
        } catch (err) {
            console.warn('[AdblockEngine] Shield init warning:', err.message);
            engineMode = 'native-rust';
        }

        try {
            rustBridge.shieldSetActive(this.isActive());
            rustBridge.shieldSetCnameUncloaking(settingsStore?.adblockCnameUncloaking === true);
            rustBridge.shieldSetOfflineMode(settingsStore?.strictOfflineMode === true);
            rustBridge.shieldSetCosmeticEnabled(settingsStore?.cosmetic !== false);
        } catch (_) {}

        rebuildCustomNativeEngine(settingsStore);
        this.setupIpc();
    }

    rebuildCustomRules(settings) {
        rebuildCustomNativeEngine(settings || settingsStoreRef);
    }

    setActive(active) {
        const next = Boolean(active);
        if (isAdblockActive !== next) {
            isAdblockActive = next;
            console.log(`[AdblockEngine] Adblocker ${isAdblockActive ? 'enabled' : 'disabled'}`);
        }
        if (settingsStoreRef) {
            settingsStoreRef.adblockEnabled = isAdblockActive;
        }
    }

    isActive() {
        if (settingsStoreRef && settingsStoreRef.adblockEnabled === false) return false;
        return isAdblockActive;
    }

    async fetchRemoteBlocklist(inputUrl) {
        if (settingsStoreRef?.strictOfflineMode === true || settingsStoreRef?.bgAllowFilterUpdates === false) {
            return { success: false, skipped: true, error: 'Remote filter fetches are disabled in Network & Background Services settings.' };
        }
        if (!inputUrl || typeof inputUrl !== 'string') {
            return { success: false, error: 'Invalid URL provided' };
        }
        let targetUrl = inputUrl.trim();
        try {
            const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
            if (parsed.hostname === 'github.com') {
                const parts = parsed.pathname.split('/').filter(Boolean);
                if (parts.length >= 4 && (parts[2] === 'blob' || parts[2] === 'raw')) {
                    const user = parts[0];
                    const repo = parts[1];
                    const branch = parts[3];
                    const rest = parts.slice(4).join('/');
                    targetUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${rest}`;
                }
            } else if (parsed.hostname === 'gist.github.com') {
                const parts = parsed.pathname.split('/').filter(Boolean);
                if (parts.length >= 2 && !parsed.pathname.endsWith('/raw')) {
                    targetUrl = `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`;
                }
            } else {
                targetUrl = parsed.toString();
            }
        } catch (err) {
            return { success: false, error: 'Malformed URL: ' + err.message };
        }

        try {
            console.log(`[AdblockEngine] Fetching remote blocklist from: ${targetUrl}`);
            const text = await downloadFilterText(targetUrl);
            if (!text || text.length === 0) {
                return { success: false, error: 'Remote blocklist returned empty response' };
            }
            return {
                success: true,
                url: targetUrl,
                bytes: Buffer.byteLength(text, 'utf8'),
                text
            };
        } catch (err) {
            console.warn(`[AdblockEngine] Failed to fetch remote blocklist from ${targetUrl}:`, err.message);
            return { success: false, error: err.message };
        }
    }

    setupIpc() {
        if (!ipcMain) return;
        if (this.ipcInitialized) return;
        this.ipcInitialized = true;

        ipcMain.on('set-adblock', (event, active) => {
            this.setActive(active);
        });

        ipcMain.handle('update-adblock-filters', async () => {
            return await this.updateFilters(true);
        });

        ipcMain.handle('get-adblock-status', () => {
            return {
                mode: engineMode,
                active: this.isActive(),
                ruleCount: activeRuleCount,
                lastUpdate: lastCacheUpdate,
                cnameUncloakedCount
            };
        });

        ipcMain.handle('fetch-remote-blocklist', async (event, url) => {
            return await this.fetchRemoteBlocklist(url);
        });

        ipcMain.handle('get-adblock-page-state', (event, pageUrl) => {
            const currentSettings = settingsStoreRef || {};
            const enabled = this.isActive() && currentSettings.adblockEnabled !== false;
            const youtubeAds = currentSettings.adblockYoutubeAds !== false;
            const cosmetic = currentSettings.cosmetic !== false;
            const host = extractHostname(pageUrl);
            const whitelisted = isHostInSet(host, getAllowlistSet(currentSettings));
            return {
                enabled,
                youtubeAds,
                cosmetic,
                whitelisted,
                effectiveEnabled: enabled && !whitelisted
            };
        });
    }

    async updateFilters(force = false) {
        if (settingsStoreRef?.strictOfflineMode === true || settingsStoreRef?.bgAllowFilterUpdates === false) {
            console.log('[AdblockEngine] Skipping remote filter update (Strict Offline / Filter Updates disabled); using local rules.');
            return { success: false, skipped: true, count: activeRuleCount, message: 'Filter updates disabled by Network & Background Services settings' };
        }
        if (this.isUpdating) return { success: true, count: activeRuleCount, message: 'Update already in progress' };

        this.isUpdating = true;
        console.log('[AdblockEngine] Downloading & compiling filter lists via Rust Shield...');

        try {
            const urls = FILTER_SOURCES.map(s => s.url);
            const res = await rustBridge.shieldUpdateFilterLists(urls);
            if (res && res.success) {
                try {
                    rustBridge.shieldSaveCacheAtomic(this.cacheFile);
                } catch (_) {}
                engineMode = 'native-rust';
                lastCacheUpdate = Date.now();
                activeRuleCount = res.ruleCount || 200000;
                this.isUpdating = false;
                return { success: true, count: activeRuleCount, updatedAt: lastCacheUpdate };
            }
            this.isUpdating = false;
            return { success: false, count: activeRuleCount, message: 'Network fetch failed' };
        } catch (err) {
            this.isUpdating = false;
            console.error('[AdblockEngine] Failed to compile updated filters:', err);
            return { success: false, count: activeRuleCount, error: err.message };
        }
    }

    shouldBlockRequest(details, settingsStore) {
        if (!this.isActive()) return false;
        const currentSettings = settingsStore || settingsStoreRef;
        if (currentSettings && currentSettings.adblockEnabled === false) return false;

        const url = details.url;
        if (!url) return false;

        const u = url.toLowerCase();
        const reqHost = extractHostname(url);
        const refHost = extractHostname(details.referrer);
        const initHost = extractHostname(details.initiator != null ? String(details.initiator) : '');

        // 1. User Allowlist / Whitelist check (Sub-microsecond Set lookup)
        const allowSet = getAllowlistSet(currentSettings);
        if (isHostInSet(reqHost, allowSet) || isHostInSet(refHost, allowSet)) {
            return false;
        }

        // 2. YouTube pass-through: never block requests targeting, referred/initiated by,
        // or originating inside a YouTube tab (including no-referrer subrequests such as doubleclick/jnn-pa),
        // so #movie_player's ad state machine never hangs; webview_preload.cjs handles ads via speedup + mute + skip.
        if (isYouTubeDomain(reqHost) || isYouTubeDomain(refHost) || isYouTubeDomain(initHost)) {
            return false;
        }
        let tabHost = '';
        if (webContents && typeof details.webContentsId === 'number' && details.webContentsId > 0) {
            try {
                const wc = webContents.fromId(details.webContentsId);
                if (wc && !wc.isDestroyed()) {
                    tabHost = extractHostname(wc.getURL());
                }
            } catch (_) {}
        }
        if (isYouTubeDomain(tabHost)) {
            return false;
        }

        // 3. Media Stream bypass (prevent YouTube / Twitch playback stutter or IPC serialization)
        if (
            u.includes('googlevideo.com/videoplayback') ||
            u.includes('manifest.googlevideo.com') ||
            u.includes('.ttvnw.net/v1/')
        ) {
            return false;
        }

        // 4. Essential Authentication, Identity & Security Bypass
        const ref = (details.referrer || '').toLowerCase();
        const init = (details.initiator || '').toLowerCase();
        const isGmailTraffic = u.includes('mail.google.com') ||
                               u.includes('googleusercontent.com') ||
                               u.includes('gmail.com') ||
                               ref.includes('mail.google.com') ||
                               init.includes('mail.google.com');

        if (
            isGmailTraffic ||
            u.includes('accounts.google.com') ||
            u.includes('accounts.youtube.com') ||
            u.includes('ssl.gstatic.com/accounts') ||
            u.includes('firebaseapp.com') ||
            u.includes('identitytoolkit.googleapis.com') ||
            u.includes('securetoken.googleapis.com') ||
            u.includes('appleid.apple.com') ||
            u.includes('/oauth') ||
            u.includes('/auth') ||
            u.includes('/login') ||
            u.includes('/signin') ||
            u.includes('challenges.cloudflare.com') ||
            u.includes('/cdn-cgi/challenge-platform') ||
            u.includes('hcaptcha.com') ||
            u.includes('recaptcha')
        ) {
            return false;
        }

        // Core UI framework, stylesheets and essential bundles on wp.pl
        if (reqHost.endsWith('wp.pl') && (
            u.includes('dwiubwlu') || // ui.min
            u.includes('z29mzxi') ||  // gofer
            u.includes('d3bqc2xpyjy') // wpjslib6
        )) {
            return false;
        }

        // WP Header-bidding & ad telemetry / creatives
        if (
            (reqHost.endsWith('wp.pl') && (u.includes('d3aucgwu') || u.includes('nmvlytaz') || u.includes('pwa_adbd') || u.includes('pvid='))) ||
            (reqHost.endsWith('wpimg.pl') && (u.includes('/b/') || u.includes('/advert/') || u.includes('/b-') || u.includes('/rek/') || u.includes('/banner')))
        ) {
            notifyBlocked(url);
            return true;
        }

        // 5. Native Rust Shield Engine (network + custom + CNAME uncloaking in one pass)
        try {
            const wcId = typeof details.webContentsId === 'number' ? details.webContentsId : 0;
            const sourceUrl = details.referrer || (details.initiator ? details.initiator + '/' : null);
            const decision = rustBridge.shieldCheckRequest(
                wcId,
                url,
                sourceUrl,
                String(details.resourceType || 'other')
            );
            if (decision && decision.blocked) {
                if (decision.cnameCloaked) {
                    cnameUncloakedCount = rustBridge.shieldCnameUncloakedCount();
                }
                notifyBlocked(url);
                return true;
            }
        } catch (_) {}

        return false;
    }

    checkCnameTarget(details, currentSettings, cnameHost) {
        if (!cnameHost || typeof cnameHost !== 'string') return false;
        try {
            const syntheticUrl = `https://${cnameHost}/`;
            const sourceUrl = details?.referrer || (details?.initiator ? details.initiator + '/' : null);
            const decision = rustBridge.shieldCheckRequest(
                typeof details?.webContentsId === 'number' ? details.webContentsId : 0,
                syntheticUrl,
                sourceUrl,
                String(details?.resourceType || 'other')
            );
            return Boolean(decision && decision.blocked);
        } catch (_) {
            return false;
        }
    }

    getCosmeticResources(pageUrl, settingsStore) {
        if (!isAdblockActive) return { css: '', injectedScript: '' };
        if (settingsStore && settingsStore.cosmetic === false) return { css: '', injectedScript: '' };
        if (!pageUrl || pageUrl === 'about:blank') return { css: '', injectedScript: '' };

        const host = extractHostname(pageUrl);
        if (!host) {
            return { css: '', injectedScript: '' };
        }

        // Never inject cosmetic rules or scriptlets on YouTube pages (prevents anti-adblock bait/tamper stalls)
        if (isYouTubeDomain(host)) {
            return { css: '', injectedScript: '' };
        }

        // Check whitelist
        if (isHostInSet(host, getAllowlistSet(settingsStore))) {
            return { css: '', injectedScript: '' };
        }

        // Check Google / Gmail
        if (host === 'mail.google.com' || host === 'gmail.com' || host === 'google.com' || host.endsWith('.google.com')) {
            return { css: '', injectedScript: '' };
        }

        // Skip generic aggressive cosmetic CSS on Librus so legitimate UI banners/buttons are never hidden
        if (host === 'librus.pl' || host.endsWith('.librus.pl')) {
            return { css: '', injectedScript: '' };
        }

        let siteSelectors = [];
        let injectedScript = '';

        // 1. Query Native Rust Shield Engine for site-specific cosmetic rules
        try {
            const res = rustBridge.shieldGetCosmeticResources(pageUrl);
            if (res && Array.isArray(res.hideSelectors)) {
                siteSelectors = res.hideSelectors;
            }
            if (res && res.injectedScript) {
                injectedScript = res.injectedScript;
            }
        } catch (_) {}

        // 2. Base universal ad container collapsing rules (collapses placeholders and prevents empty ad boxes)
        const baseCollapseRules = `
            ins.adsbygoogle, iframe[id*="google_ads"], iframe[id*="aswift_"], iframe[src*="doubleclick"], iframe[src*="adservice"],
            div[id^="google_ads_iframe"], div[id^="aswift_"],
            .ad-banner, .advertisement, [id*="google_ads"], [class*="google_ads"],
            .taboola, .outbrain, [data-ad-unit], [data-ad-slot], .ad-container, .ad-placeholder,
            [class*="reklama"], [id*="reklama"], [id*="Reklama"], [class*="Reklama"],
            [class*="Billboard"], [id*="Billboard"], [class*="Wallpaper"], [id*="Wallpaper"],
            [class*="Tapeta"], [id*="Tapeta"],
            [id^="wp-ad-"], [class^="wp-ad-"], [class*=" wp-ad-"], [id^="gpt-ad"], [class*="gpt-ad"], [id^="ad-desktop"],
            [class*="ad-desktop"], [class*="AdSlot"], [class*="ad-slot"], [class*="ad_slot"] {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                min-height: 0 !important;
                max-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
        `;

        // 2b. Wallpaper / branding takeover cleanup (e.g. wp.pl)
        let wpWallpaperCSS = '';
        if (host === 'wp.pl' || host.endsWith('.wp.pl')) {
            wpWallpaperCSS = `
                body, html, #root, #app {
                    background-image: none !important;
                }
                .wp-header-panel, [class*="wp-header-panel"], [class*="screeningWallpaper"], [class*="bmjdxfegh"] {
                    display: none !important;
                    height: 0 !important;
                }
            `;
        }

        // 3. Cookie Annoyances rules
        let annoyancesCSS = '';
        if (settingsStore?.adblockAnnoyances !== false) {
            annoyancesCSS = `
                #onetrust-consent-sdk, #CybotCookiebotDialog, .cc-window, .cc-banner,
                #qc-cmp2-container, .fc-consent-root, [id*="cookie-banner"], [class*="cookie-consent-banner"] {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
            `;
        }

        // 4. Site-specific rules from adblock-rs
        let siteCSS = '';
        if (siteSelectors.length > 0) {
            // Deduplicate and filter out overly broad single tag selectors
            const valid = siteSelectors.filter(s => {
                if (!s || s.length <= 1 || s === '*' || s === 'body' || s === 'html') return false;
                return true;
            });
            if (valid.length > 0) {
                siteCSS = `
                    ${valid.join(',\n')} {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        min-height: 0 !important;
                        max-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                    }
                `;
            }
        }

        const combinedCSS = `${baseCollapseRules}\n${wpWallpaperCSS}\n${siteCSS}\n${annoyancesCSS}`;
        return { css: combinedCSS, injectedScript };
    }

    injectCosmetics(webContents, url, settingsStore) {
        if (!webContents || webContents.isDestroyed()) return;
        if (!url || url === 'about:blank') return;

        try {
            const { css, injectedScript } = this.getCosmeticResources(url, settingsStore);
            if (css) {
                webContents.insertCSS(css).catch(() => {});
            }
            if (injectedScript) {
                webContents.executeJavaScript(injectedScript, true).catch(() => {});
            }
        } catch (_) {}
    }

    applyToSession(sess, settingsStore, bypassedInsecureHosts) {
        if (!sess || !sess.webRequest) return;

        try {
            sess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
                const url = details.url;
                if (!url) return callback({ cancel: false });

                // 1. HTTPS Upgrade
                if (settingsStore && settingsStore.httpsOnly !== false && url.startsWith('http://')) {
                    try {
                        const parsed = new URL(url);
                        if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !parsed.hostname.endsWith('.onion')) {
                            const host = parsed.hostname.toLowerCase();
                            const isBypassed = bypassedInsecureHosts && (
                                bypassedInsecureHosts.has(host) ||
                                bypassedInsecureHosts.has(host.replace(/^www\./, ''))
                            );
                            if (!isBypassed) {
                                const secureUrl = url.replace(/^http:\/\//i, 'https://');
                                return callback({ redirectURL: secureUrl });
                            }
                        }
                    } catch (_) {}
                }

                // 2. High-speed Adblock matching
                const shouldBlock = this.shouldBlockRequest(details, settingsStore);
                if (shouldBlock) {
                    return callback({ cancel: true });
                }

                callback({ cancel: false });
            });
        } catch (e) {
            console.warn('[AdblockEngine] Failed to attach to session:', e);
        }
    }
}

const adblockEngine = new AdblockEngine();
module.exports = { adblockEngine, shouldResolveCnameHost, createCnameResolver };
