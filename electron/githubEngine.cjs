const electron = (() => {
    try {
        return require('electron');
    } catch (_) {
        return {};
    }
})();

const { BrowserWindow, session, net, powerMonitor } = electron;

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_WEB_BASE = 'https://github.com';
const USER_AGENT = 'QBrowse-WorkMode/1.4';
const API_VERSION = '2022-11-28';
const CACHE_TTL_MS = 30000;
const REQUEST_TIMEOUT_MS = 15000;

function sanitizeToken(raw) {
    if (typeof raw !== 'string') return '';
    let token = raw.trim();
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1).trim();
    }
    token = token.replace(/^(?:bearer|token)\s+/i, '').trim();
    return token;
}

function sanitizeUsername(raw) {
    if (typeof raw !== 'string') return '';
    let u = raw.trim();
    u = u.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '');
    u = u.replace(/^github\.com\//i, '');
    u = u.replace(/^@+/, '');
    u = u.split(/[/?#]/)[0].trim();
    if (!u || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(u)) {
        return '';
    }
    return u;
}

function parseRepoFilter(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return [];
    const tokens = raw
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean);

    const qualifiers = [];
    const seen = new Set();

    for (let entry of tokens) {
        entry = entry
            .replace(/^https?:\/\/(?:www\.)?github\.com\//i, '')
            .replace(/^github\.com\//i, '')
            .replace(/^repo:/i, '')
            .replace(/^org:/i, '')
            .replace(/^\/+|\/+$/g, '');

        if (!entry) continue;

        const parts = entry.split('/').filter(Boolean);
        let qualifier = '';
        if (parts.length >= 2) {
            const owner = parts[0];
            const repo = parts[1].replace(/\.git$/i, '');
            if (/^[a-zA-Z0-9._-]+$/.test(owner) && /^[a-zA-Z0-9._-]+$/.test(repo)) {
                qualifier = `repo:${owner}/${repo}`;
            }
        } else if (parts.length === 1 && /^[a-zA-Z0-9-]+$/.test(parts[0])) {
            qualifier = `org:${parts[0]}`;
        }

        if (qualifier && !seen.has(qualifier.toLowerCase())) {
            seen.add(qualifier.toLowerCase());
            qualifiers.push(qualifier);
        }
    }

    return qualifiers;
}

function buildSearchQueries(username, { includeDrafts = false, repoFilter = '' } = {}) {
    const cleanUser = username === '@me' ? '@me' : sanitizeUsername(username);
    const repoQualifiers = parseRepoFilter(repoFilter);
    const repoPart = repoQualifiers.length > 0 ? ` ${repoQualifiers.join(' ')}` : '';
    const draftPart = includeDrafts ? '' : ' draft:false';

    let repoPrsQuery = '';
    if (repoQualifiers.length > 0) {
        repoPrsQuery = `is:pr is:open${draftPart}${repoPart}`;
    } else if (cleanUser && cleanUser !== '@me') {
        repoPrsQuery = `is:pr is:open user:${cleanUser}${draftPart}`;
    }

    return {
        reviewsQuery: `is:pr is:open review-requested:${cleanUser}${draftPart}${repoPart}`,
        myPrsQuery: `is:pr is:open author:${cleanUser}${draftPart}${repoPart}`,
        repoPrsQuery,
        issuesQuery: `is:issue is:open assignee:${cleanUser}${repoPart}`,
        repoQualifiers
    };
}

function mergeUniqueGitHubItems(...lists) {
    const byKey = new Map();
    for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            if (!item) continue;
            const key = (item.url || item.id || '').toLowerCase();
            if (!key) continue;
            if (!byKey.has(key)) {
                byKey.set(key, item);
            }
        }
    }
    return Array.from(byKey.values()).sort((a, b) => {
        const ta = Date.parse(a.updatedAt || '') || 0;
        const tb = Date.parse(b.updatedAt || '') || 0;
        return tb - ta;
    });
}

function getHeaderValue(headers, name) {
    if (!headers) return null;
    if (typeof headers.get === 'function') {
        return headers.get(name);
    }
    const lower = name.toLowerCase();
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === lower) {
            const val = headers[key];
            return Array.isArray(val) ? val[0] : val;
        }
    }
    return null;
}

function parseGitHubApiError(status, body, headers) {
    const apiMessage = typeof body?.message === 'string' ? body.message.trim() : '';
    const remainingRaw = getHeaderValue(headers, 'x-ratelimit-remaining');
    const resetRaw = getHeaderValue(headers, 'x-ratelimit-reset');
    const ssoHeader = getHeaderValue(headers, 'x-github-sso');

    const remaining = remainingRaw !== null && remainingRaw !== undefined ? Number(remainingRaw) : null;
    const resetEpoch = resetRaw !== null && resetRaw !== undefined ? Number(resetRaw) : null;

    if (status === 401) {
        return {
            errorCode: 'INVALID_TOKEN',
            error: 'Invalid or expired Personal Access Token (HTTP 401). Please verify or regenerate your token.',
            status,
            rateLimitRemaining: remaining
        };
    }

    if (status === 403) {
        if (remaining === 0 || /rate limit/i.test(apiMessage)) {
            let resetHint = '';
            if (Number.isFinite(resetEpoch) && resetEpoch > 0) {
                const mins = Math.max(1, Math.ceil((resetEpoch * 1000 - Date.now()) / 60000));
                resetHint = ` Resets in ~${mins}m.`;
            }
            return {
                errorCode: 'RATE_LIMITED',
                error: `GitHub API rate limit exceeded.${resetHint}`,
                status,
                rateLimitRemaining: 0,
                rateLimitReset: Number.isFinite(resetEpoch) ? resetEpoch : null
            };
        }
        if (ssoHeader || /\b(?:saml|sso)\b/i.test(apiMessage)) {
            return {
                errorCode: 'SSO_REQUIRED',
                error: 'Organization SSO/SAML authorization is required for this token.',
                status,
                rateLimitRemaining: remaining
            };
        }
        return {
            errorCode: 'FORBIDDEN',
            error: apiMessage ? `GitHub access denied (403): ${apiMessage}` : 'GitHub access denied (HTTP 403). Check token scopes.',
            status,
            rateLimitRemaining: remaining
        };
    }

    if (status === 404) {
        return {
            errorCode: 'NOT_FOUND',
            error: apiMessage ? `GitHub resource not found (404): ${apiMessage}` : 'GitHub user or resource not found (HTTP 404).',
            status,
            rateLimitRemaining: remaining
        };
    }

    if (status === 422) {
        const detail = Array.isArray(body?.errors) && body.errors[0]?.message ? ` (${body.errors[0].message})` : '';
        return {
            errorCode: 'INVALID_QUERY',
            error: `GitHub rejected the search filter (422)${detail}. Check your Repository Scope.`,
            status,
            rateLimitRemaining: remaining
        };
    }

    return {
        errorCode: 'API_ERROR',
        error: apiMessage ? `GitHub API error (${status}): ${apiMessage}` : `GitHub API returned HTTP ${status}.`,
        status,
        rateLimitRemaining: remaining
    };
}

function mapSearchIssueItem(item) {
    const repoUrl = item?.repository_url || '';
    const htmlUrl = item?.html_url || '';
    let repoName = repoUrl.replace(/^https?:\/\/api\.github\.com\/repos\//i, '');
    if (!repoName && htmlUrl) {
        const match = htmlUrl.match(/github\.com\/([^/]+\/[^/]+)\/(?:pull|issues)\/\d+/i);
        if (match) repoName = match[1];
    }
    return {
        id: String(item?.id || htmlUrl || `${repoName}#${item?.number || ''}`),
        number: String(item?.number ?? ''),
        title: String(item?.title || '').trim() || `#${item?.number || ''}`,
        url: htmlUrl,
        repo: repoName,
        author: item?.user?.login || 'unknown',
        avatar: item?.user?.avatar_url || '',
        isDraft: !!item?.draft,
        comments: Number(item?.comments) || 0,
        updatedAt: item?.updated_at || new Date().toISOString()
    };
}

function decodeHtmlEntities(str) {
    if (!str) return '';
    return String(str)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
        .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractEmbeddedReactIssues(html, kind = 'issue', fallbackAuthor = '') {
    const items = [];
    const seen = new Set();
    const scriptRegex = /<script[^>]*type=["']application\/json["'][^>]*data-target=["']react-app\.embeddedData["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            const walk = (node) => {
                if (!node || typeof node !== 'object') return;
                if (Array.isArray(node)) {
                    for (const el of node) walk(el);
                    return;
                }
                const maybeNum = node.number;
                const maybeTitle = node.title;
                const maybeRepo = node.repository?.nameWithOwner || (node.repository?.owner?.login && node.repository?.name ? `${node.repository.owner.login}/${node.repository.name}` : null);
                const maybeUrl = node.url || (maybeRepo && maybeNum ? `${GITHUB_WEB_BASE}/${maybeRepo}/${kind === 'pr' ? 'pull' : 'issues'}/${maybeNum}` : null);

                if (maybeTitle && maybeNum && maybeUrl && /github\.com\/[^/]+\/[^/]+\/(?:pull|issues)\/\d+/i.test(maybeUrl)) {
                    const isPrUrl = /\/pull\/\d+/i.test(maybeUrl);
                    const matchesKind = kind === 'pr' ? isPrUrl : !isPrUrl;
                    if (matchesKind && !seen.has(maybeUrl)) {
                        seen.add(maybeUrl);
                        const repoMatch = maybeUrl.match(/github\.com\/([^/]+\/[^/]+)\/(?:pull|issues)\/(\d+)/i);
                        items.push({
                            id: String(node.id || maybeUrl),
                            number: String(maybeNum),
                            title: String(maybeTitle).trim(),
                            url: maybeUrl,
                            repo: maybeRepo || (repoMatch ? repoMatch[1] : ''),
                            author: node.author?.login || node.user?.login || fallbackAuthor || 'unknown',
                            avatar: node.author?.avatarUrl || node.user?.avatar_url || '',
                            isDraft: !!(node.isDraft || node.draft),
                            comments: Number(node.commentsCount ?? node.comments?.totalCount ?? node.comments) || 0,
                            updatedAt: node.updatedAt || node.updated_at || new Date().toISOString()
                        });
                    }
                }

                for (const key of Object.keys(node)) {
                    walk(node[key]);
                }
            };
            walk(parsed);
        } catch (_) {}
    }

    return items;
}

function parseGitHubHtmlList(html, kind = 'pr', fallbackAuthor = '') {
    if (typeof html !== 'string' || !html) return [];

    // 1. Try modern React embedded JSON payload first (used by GitHub /issues)
    const embedded = extractEmbeddedReactIssues(html, kind, fallbackAuthor);
    if (embedded.length > 0) {
        return embedded;
    }

    // 2. Parse GitHub classic SSR rows (/pulls, /pulls/review-requested, classic /issues)
    const items = [];
    const seen = new Set();
    const pathSegment = kind === 'pr' ? 'pull' : 'issues';
    const linkRegex = new RegExp(
        `<a[^>]+href=["'](\\/([^/"']+)\\/([^/"']+)\\/${pathSegment}\\/(\\d+))["'][^>]*>([\\s\\S]*?)<\\/a>`,
        'gi'
    );

    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const relPath = match[1];
        const owner = match[2];
        const repo = match[3];
        const number = match[4];
        const rawInner = match[5];
        const tag = match[0];

        // Skip pagination / navigation / comment anchor / icon-only links
        if (!rawInner || rawInner.trim().startsWith('<svg')) continue;
        if (/aria-label=["'][^"']*comment/i.test(tag)) continue;

        const title = decodeHtmlEntities(rawInner);
        if (!title || /^\d+$/.test(title) || /^#\d+$/.test(title)) continue;
        if (/^(?:pull requests|issues|open|closed|draft)$/i.test(title)) continue;

        const url = `${GITHUB_WEB_BASE}${relPath}`;
        if (seen.has(url)) continue;
        seen.add(url);

        // Inspect nearby row HTML (up to ~1200 chars around the link) for draft & comment count
        const startIdx = Math.max(0, match.index - 250);
        const endIdx = Math.min(html.length, match.index + match[0].length + 1200);
        const snippet = html.slice(startIdx, endIdx);

        const isDraft = /aria-label=["']Draft Pull Request["']|>Draft<\/span>/i.test(snippet);
        const commentsMatch = snippet.match(/aria-label=["'](\d+)\s+comments?["']/i);
        const comments = commentsMatch ? Number(commentsMatch[1]) || 0 : 0;
        const timeMatch = snippet.match(/datetime=["']([^"']+)["']/i);
        const updatedAt = timeMatch ? timeMatch[1] : new Date().toISOString();

        items.push({
            id: url,
            number: String(number),
            title,
            url,
            repo: `${owner}/${repo}`,
            author: fallbackAuthor || 'unknown',
            avatar: '',
            isDraft,
            comments,
            updatedAt
        });
    }

    return items;
}

class GitHubEngine {
    constructor(deps = {}) {
        this.timer = null;
        this.cache = null;
        this.lastFetch = 0;
        this.activeProfileId = 'default';
        this.isSuspended = false;
        this.currentFetchPromise = null;
        this.configVersion = 0;
        this.customFetch = deps.fetchImpl || null;
        this.customSession = deps.sessionImpl || null;
        this.config = {
            enabled: false,
            authMode: 'auto',
            token: '',
            username: '',
            interval: 10, // minutes (0 = manual only)
            repoFilter: '',
            includeDrafts: false,
            showReviews: true,
            showMyPrs: true,
            showAssignedIssues: true
        };

        try {
            if (powerMonitor && typeof powerMonitor.on === 'function') {
                powerMonitor.on('suspend', () => {
                    this.isSuspended = true;
                });
                powerMonitor.on('resume', () => {
                    this.isSuspended = false;
                    if (this.config.enabled && this.config.interval > 0) {
                        this.fetchWorkData(this.activeProfileId, true)
                            .then((data) => this.broadcastData(data))
                            .catch(() => {});
                    }
                });
            }
        } catch (_) {}
    }

    broadcastData(data) {
        if (!data || !BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;
        try {
            for (const win of BrowserWindow.getAllWindows()) {
                if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                    win.webContents.send('github-data-updated', data);
                }
            }
        } catch (_) {}
    }

    updateConfig(newConfig = {}, profileId = 'default') {
        const prev = this.config;
        const prevProfileId = this.activeProfileId;
        const wasEnabled = prev.enabled;
        const nextProfileId = profileId || 'default';

        const sanitizedConfig = {
            ...prev,
            ...newConfig,
            token: newConfig.token !== undefined ? sanitizeToken(newConfig.token) : prev.token,
            username: newConfig.username !== undefined ? sanitizeUsername(newConfig.username) : prev.username,
            repoFilter: newConfig.repoFilter !== undefined ? String(newConfig.repoFilter || '').trim() : prev.repoFilter
        };

        const credentialsOrFiltersChanged = (
            sanitizedConfig.token !== prev.token ||
            sanitizedConfig.username !== prev.username ||
            sanitizedConfig.authMode !== prev.authMode ||
            sanitizedConfig.repoFilter !== prev.repoFilter ||
            Boolean(sanitizedConfig.includeDrafts) !== Boolean(prev.includeDrafts) ||
            nextProfileId !== prevProfileId
        );

        this.activeProfileId = nextProfileId;
        this.config = sanitizedConfig;

        if (credentialsOrFiltersChanged) {
            this.configVersion += 1;
            this.cache = null;
            this.lastFetch = 0;
            this.currentFetchPromise = null;
        }

        if (!this.config.enabled) {
            this.stop();
            return { status: 'stopped', enabled: false };
        }

        this.restartTimer();

        // Immediate background fetch if transitioning from disabled to enabled
        if (!wasEnabled && this.config.enabled) {
            this.fetchWorkData(this.activeProfileId, true)
                .then((data) => this.broadcastData(data))
                .catch(() => {});
        }

        return { status: 'running', enabled: true };
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.configVersion += 1;
        this.cache = null;
        this.lastFetch = 0;
        this.currentFetchPromise = null;
        return { status: 'stopped', enabled: false };
    }

    restartTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        const minutes = Number(this.config.interval) || 0;
        if (minutes > 0 && this.config.enabled) {
            this.timer = setInterval(() => {
                if (!this.isSuspended && this.config.enabled) {
                    this.fetchWorkData(this.activeProfileId, true)
                        .then((data) => this.broadcastData(data))
                        .catch(() => {});
                }
            }, minutes * 60 * 1000);
        }
    }

    getPartitionSession(profileId = 'default') {
        if (this.customSession) return this.customSession;
        if (session && typeof session.fromPartition === 'function') {
            return session.fromPartition(`persist:profile_${profileId || 'default'}`);
        }
        return null;
    }

    async performFetch(url, options = {}) {
        const fetchFn = this.customFetch || (net && typeof net.fetch === 'function' ? net.fetch.bind(net) : globalThis.fetch);
        if (typeof fetchFn !== 'function') {
            throw new Error('No fetch implementation available');
        }

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller
            ? setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS)
            : null;

        try {
            const fetchInit = {
                method: options.method || 'GET',
                headers: options.headers || {},
                redirect: options.redirect || 'follow'
            };
            if (options.credentials) {
                fetchInit.credentials = options.credentials;
            }
            if (controller) {
                fetchInit.signal = controller.signal;
            }
            return await fetchFn(url, fetchInit);
        } catch (err) {
            if (err && (err.name === 'AbortError' || /abort/i.test(String(err.message || '')))) {
                const timeoutErr = new Error('Request to GitHub timed out. Check your internet connection.');
                timeoutErr.code = 'NETWORK_TIMEOUT';
                throw timeoutErr;
            }
            throw err;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    async apiRequestJson(url, { token = null } = {}) {
        const headers = {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': API_VERSION,
            'User-Agent': USER_AGENT
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await this.performFetch(url, {
            headers,
            credentials: 'omit'
        });

        let body = null;
        try {
            body = await res.json();
        } catch (_) {
            body = null;
        }

        const remainingRaw = getHeaderValue(res.headers, 'x-ratelimit-remaining');
        const rateLimitRemaining = remainingRaw !== null && remainingRaw !== undefined && remainingRaw !== ''
            ? Number(remainingRaw)
            : null;

        if (!res.ok) {
            const parsedErr = parseGitHubApiError(res.status, body, res.headers);
            return {
                ok: false,
                status: res.status,
                data: body,
                rateLimitRemaining: parsedErr.rateLimitRemaining ?? rateLimitRemaining,
                error: parsedErr.error,
                errorCode: parsedErr.errorCode
            };
        }

        return {
            ok: true,
            status: res.status,
            data: body,
            rateLimitRemaining
        };
    }

    async getSessionAuth(profileId = 'default') {
        const token = sanitizeToken(this.config.token);
        if (token) {
            return { authenticated: true, mode: 'token', token, username: null };
        }

        const partitionSession = this.getPartitionSession(profileId);
        if (partitionSession && partitionSession.cookies && typeof partitionSession.cookies.get === 'function') {
            try {
                const [urlCookies, domainCookies] = await Promise.all([
                    partitionSession.cookies.get({ url: GITHUB_WEB_BASE }),
                    partitionSession.cookies.get({ domain: 'github.com' })
                ]);

                const allCookies = [...(urlCookies || []), ...(domainCookies || [])];
                const userCookie = allCookies.find(c => c.name === 'dotcom_user' && c.value);
                const loggedInCookie = allCookies.find(c => c.name === 'logged_in');
                const sessionCookie = allCookies.find(
                    c => (c.name === 'user_session' || c.name === '__Host-user_session_same_site') && c.value
                );

                const isSessionLoggedIn = Boolean(
                    userCookie &&
                    userCookie.value &&
                    (loggedInCookie?.value === 'yes' || (loggedInCookie?.value !== 'no' && sessionCookie?.value))
                );

                if (isSessionLoggedIn) {
                    return {
                        authenticated: true,
                        username: sanitizeUsername(userCookie.value) || userCookie.value,
                        sessionToken: sessionCookie ? sessionCookie.value : null,
                        mode: 'session'
                    };
                }
            } catch (e) {
                console.warn('[GitHubEngine] Error checking session cookies:', e.message);
            }
        }

        const publicUsername = sanitizeUsername(this.config.username);
        if (publicUsername) {
            return { authenticated: true, mode: 'public', username: publicUsername };
        }

        return {
            authenticated: false,
            mode: 'none',
            errorCode: 'NOT_CONFIGURED',
            error: 'Not signed in to GitHub. Log in on github.com, enter a Personal Access Token, or specify a GitHub username.'
        };
    }

    async fetchViaApi({ token = null, usernameOverride = null }) {
        let username = usernameOverride ? sanitizeUsername(usernameOverride) : '';
        let avatarUrl = null;
        let rateLimitRemaining = null;

        if (token) {
            const userRes = await this.apiRequestJson(`${GITHUB_API_BASE}/user`, { token });
            rateLimitRemaining = userRes.rateLimitRemaining;

            if (!userRes.ok) {
                return {
                    authenticated: false,
                    authMode: 'token',
                    username: null,
                    avatarUrl: null,
                    reviewRequests: [],
                    myPrs: [],
                    assignedIssues: [],
                    error: userRes.error,
                    errorCode: userRes.errorCode,
                    rateLimitRemaining
                };
            }

            username = sanitizeUsername(userRes.data?.login || '') || userRes.data?.login || '';
            avatarUrl = userRes.data?.avatar_url || null;

            if (!username) {
                return {
                    authenticated: false,
                    authMode: 'token',
                    username: null,
                    avatarUrl: null,
                    reviewRequests: [],
                    myPrs: [],
                    assignedIssues: [],
                    error: 'GitHub did not return a username for this token.',
                    errorCode: 'INVALID_USER_RESPONSE',
                    rateLimitRemaining
                };
            }
        } else {
            // Public username verification
            if (!username) {
                return {
                    authenticated: false,
                    authMode: 'public',
                    username: null,
                    avatarUrl: null,
                    reviewRequests: [],
                    myPrs: [],
                    assignedIssues: [],
                    error: 'Invalid GitHub username.',
                    errorCode: 'INVALID_USERNAME'
                };
            }

            const userRes = await this.apiRequestJson(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`);
            rateLimitRemaining = userRes.rateLimitRemaining;
            if (!userRes.ok) {
                return {
                    authenticated: false,
                    authMode: 'public',
                    username: null,
                    avatarUrl: null,
                    reviewRequests: [],
                    myPrs: [],
                    assignedIssues: [],
                    error: userRes.status === 404
                        ? `GitHub user "@${username}" was not found.`
                        : userRes.error,
                    errorCode: userRes.errorCode,
                    rateLimitRemaining
                };
            }
            username = userRes.data?.login || username;
            avatarUrl = userRes.data?.avatar_url || null;
        }

        const { reviewsQuery, myPrsQuery, repoPrsQuery, issuesQuery } = buildSearchQueries(username, {
            includeDrafts: !!this.config.includeDrafts,
            repoFilter: this.config.repoFilter
        });

        const buildSearchUrl = (q) => {
            const params = new URLSearchParams({
                q,
                sort: 'updated',
                order: 'desc',
                per_page: '30'
            });
            return `${GITHUB_API_BASE}/search/issues?${params.toString()}`;
        };

        const [reviewRes, myPrsRes, repoPrsRes, issuesRes] = await Promise.all([
            this.apiRequestJson(buildSearchUrl(reviewsQuery), { token }),
            this.apiRequestJson(buildSearchUrl(myPrsQuery), { token }),
            repoPrsQuery
                ? this.apiRequestJson(buildSearchUrl(repoPrsQuery), { token })
                : Promise.resolve({ ok: true, data: { items: [] }, rateLimitRemaining: null }),
            this.apiRequestJson(buildSearchUrl(issuesQuery), { token })
        ]);

        const effectiveMyPrsOk = myPrsRes.ok || (Boolean(repoPrsQuery) && repoPrsRes.ok);
        const primaryResponses = [
            reviewRes,
            effectiveMyPrsOk ? { ok: true } : myPrsRes,
            issuesRes
        ];
        const firstError = primaryResponses.find(r => !r.ok) || (repoPrsQuery && !myPrsRes.ok && !repoPrsRes.ok ? repoPrsRes : null);
        const allFailed = !reviewRes.ok && !effectiveMyPrsOk && !issuesRes.ok;

        const latestRemaining = [issuesRes, repoPrsRes, myPrsRes, reviewRes]
            .map(r => r.rateLimitRemaining)
            .find(v => typeof v === 'number' && !Number.isNaN(v));

        if (allFailed && firstError) {
            return {
                authenticated: firstError.errorCode !== 'INVALID_TOKEN',
                authMode: token ? 'token' : 'public',
                username,
                avatarUrl,
                reviewRequests: [],
                myPrs: [],
                assignedIssues: [],
                error: firstError.error,
                errorCode: firstError.errorCode,
                rateLimitRemaining: latestRemaining ?? rateLimitRemaining
            };
        }

        const authoredPrs = myPrsRes.ok && Array.isArray(myPrsRes.data?.items) ? myPrsRes.data.items.map(mapSearchIssueItem) : [];
        const repoPrs = repoPrsRes.ok && Array.isArray(repoPrsRes.data?.items) ? repoPrsRes.data.items.map(mapSearchIssueItem) : [];

        return {
            authenticated: true,
            authMode: token ? 'token' : 'public',
            username,
            avatarUrl,
            reviewRequests: reviewRes.ok && Array.isArray(reviewRes.data?.items) ? reviewRes.data.items.map(mapSearchIssueItem) : [],
            myPrs: mergeUniqueGitHubItems(authoredPrs, repoPrs),
            assignedIssues: issuesRes.ok && Array.isArray(issuesRes.data?.items) ? issuesRes.data.items.map(mapSearchIssueItem) : [],
            warning: firstError ? firstError.error : null,
            error: null,
            errorCode: null,
            rateLimitRemaining: latestRemaining ?? rateLimitRemaining
        };
    }

    async fetchViaSession(profileId, username) {
        const partitionSession = this.getPartitionSession(profileId);
        const sessionFetch = this.customFetch || (partitionSession && typeof partitionSession.fetch === 'function'
            ? partitionSession.fetch.bind(partitionSession)
            : null);

        if (!sessionFetch) {
            // Fallback to public API with the detected username
            return await this.fetchViaApi({ token: null, usernameOverride: username });
        }

        const { reviewsQuery, myPrsQuery, issuesQuery } = buildSearchQueries('@me', {
            includeDrafts: !!this.config.includeDrafts,
            repoFilter: this.config.repoFilter
        });
        const initialRepoPrsQuery = buildSearchQueries(username || '@me', {
            includeDrafts: !!this.config.includeDrafts,
            repoFilter: this.config.repoFilter
        }).repoPrsQuery;

        const fetchPage = async (path, q) => {
            const url = `${GITHUB_WEB_BASE}${path}?${new URLSearchParams({ q }).toString()}`;
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
            try {
                const res = await sessionFetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    redirect: 'follow',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    ...(controller ? { signal: controller.signal } : {})
                });
                const finalUrl = res.url || url;
                if (/\/login\b/i.test(finalUrl)) {
                    return { ok: false, expired: true, html: '' };
                }
                const html = res.ok ? await res.text() : '';
                return { ok: res.ok, expired: false, status: res.status, html };
            } catch (err) {
                return { ok: false, expired: false, error: err.message, html: '' };
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
        };

        const [reviewsPage, myPrsPage, repoPrsPageInitial, issuesPage] = await Promise.all([
            fetchPage('/pulls', reviewsQuery),
            fetchPage('/pulls', myPrsQuery),
            initialRepoPrsQuery ? fetchPage('/pulls', initialRepoPrsQuery) : Promise.resolve({ ok: false, expired: false, html: '' }),
            fetchPage('/issues', issuesQuery)
        ]);

        if (reviewsPage.expired || myPrsPage.expired || repoPrsPageInitial.expired || issuesPage.expired) {
            return {
                authenticated: false,
                authMode: 'session',
                username: null,
                avatarUrl: null,
                reviewRequests: [],
                myPrs: [],
                assignedIssues: [],
                error: 'Your GitHub browser session has expired. Please sign in to github.com again or enter a Personal Access Token.',
                errorCode: 'SESSION_EXPIRED'
            };
        }

        const resolveMetaUser = (html) => {
            if (!html) return null;
            const m = html.match(/<meta\s+name=["']user-login["']\s+content=["']([^"']+)["']/i)
                || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']user-login["']/i);
            return m && m[1] ? sanitizeUsername(m[1]) : null;
        };

        const resolvedUser = resolveMetaUser(myPrsPage.html) || resolveMetaUser(reviewsPage.html) || resolveMetaUser(issuesPage.html) || username;

        let repoPrsPage = repoPrsPageInitial;
        if (!initialRepoPrsQuery && resolvedUser) {
            const lateRepoPrsQuery = buildSearchQueries(resolvedUser, {
                includeDrafts: !!this.config.includeDrafts,
                repoFilter: this.config.repoFilter
            }).repoPrsQuery;
            if (lateRepoPrsQuery) {
                repoPrsPage = await fetchPage('/pulls', lateRepoPrsQuery);
            }
        }

        let reviewRequests = reviewsPage.ok ? parseGitHubHtmlList(reviewsPage.html, 'pr', resolvedUser) : [];
        const authoredPrs = myPrsPage.ok ? parseGitHubHtmlList(myPrsPage.html, 'pr', resolvedUser) : [];
        const repoPrs = repoPrsPage.ok ? parseGitHubHtmlList(repoPrsPage.html, 'pr', resolvedUser) : [];
        let myPrs = mergeUniqueGitHubItems(authoredPrs, repoPrs);
        let assignedIssues = issuesPage.ok ? parseGitHubHtmlList(issuesPage.html, 'issue', resolvedUser) : [];

        // If GitHub /issues rendered client-side without SSR data, supplement public issues via REST API
        if (assignedIssues.length === 0 && resolvedUser && issuesPage.ok && !issuesPage.html.includes('No results matched')) {
            try {
                const { issuesQuery: pubIssuesQ } = buildSearchQueries(resolvedUser, {
                    includeDrafts: !!this.config.includeDrafts,
                    repoFilter: this.config.repoFilter
                });
                const pubUrl = `${GITHUB_API_BASE}/search/issues?${new URLSearchParams({ q: pubIssuesQ, sort: 'updated', order: 'desc', per_page: '30' }).toString()}`;
                const pubRes = await this.apiRequestJson(pubUrl);
                if (pubRes.ok && Array.isArray(pubRes.data?.items)) {
                    assignedIssues = pubRes.data.items.map(mapSearchIssueItem);
                }
            } catch (_) {}
        }

        if (!reviewsPage.ok && !myPrsPage.ok && !issuesPage.ok) {
            return {
                authenticated: false,
                authMode: 'session',
                username: resolvedUser || null,
                avatarUrl: null,
                reviewRequests: [],
                myPrs: [],
                assignedIssues: [],
                error: reviewsPage.error || 'Could not reach github.com with your browser session.',
                errorCode: 'NETWORK_ERROR'
            };
        }

        return {
            authenticated: true,
            authMode: 'session',
            username: resolvedUser || username || 'GitHub User',
            avatarUrl: resolvedUser ? `https://github.com/${encodeURIComponent(resolvedUser)}.png?size=64` : null,
            reviewRequests,
            myPrs,
            assignedIssues,
            warning: null,
            error: null,
            errorCode: null
        };
    }

    async testAndSync(overrideConfig = {}, profileId = 'default') {
        this.updateConfig({ ...overrideConfig, enabled: true }, profileId);
        const result = await this.fetchWorkData(profileId, true);
        this.broadcastData(result);
        return result;
    }

    async fetchWorkData(profileId = 'default', force = false) {
        if (!this.config.enabled) {
            return {
                enabled: false,
                authenticated: false,
                authMode: 'none',
                username: null,
                avatarUrl: null,
                reviewRequests: [],
                myPrs: [],
                assignedIssues: [],
                error: null,
                errorCode: null,
                warning: null,
                lastUpdated: 0
            };
        }

        const now = Date.now();
        if (!force && this.cache && (now - this.lastFetch < CACHE_TTL_MS)) {
            return this.cache;
        }

        if (!force && this.currentFetchPromise) {
            return await this.currentFetchPromise;
        }

        const fetchConfigVersion = this.configVersion;

        const runFetch = (async () => {
            let auth = null;
            try {
                auth = await this.getSessionAuth(profileId);
                if (!auth.authenticated) {
                    const unauthResult = {
                        enabled: true,
                        authenticated: false,
                        authMode: auth.mode || 'none',
                        username: null,
                        avatarUrl: null,
                        reviewRequests: [],
                        myPrs: [],
                        assignedIssues: [],
                        error: auth.error || null,
                        errorCode: auth.errorCode || 'NOT_CONFIGURED',
                        warning: null,
                        lastUpdated: Date.now()
                    };
                    if (fetchConfigVersion === this.configVersion) {
                        this.cache = unauthResult;
                        this.lastFetch = unauthResult.lastUpdated;
                    }
                    return unauthResult;
                }

                let result = null;
                if (auth.mode === 'token' && auth.token) {
                    result = await this.fetchViaApi({ token: auth.token });
                } else if (auth.mode === 'session') {
                    result = await this.fetchViaSession(profileId, auth.username);
                } else if (auth.mode === 'public' && auth.username) {
                    result = await this.fetchViaApi({ token: null, usernameOverride: auth.username });
                }

                const payload = {
                    enabled: true,
                    authenticated: !!result?.authenticated,
                    authMode: result?.authMode || auth.mode || 'none',
                    username: result?.username || (result?.authenticated ? auth.username : null),
                    avatarUrl: result?.avatarUrl || null,
                    reviewRequests: result?.reviewRequests || [],
                    myPrs: result?.myPrs || [],
                    assignedIssues: result?.assignedIssues || [],
                    error: result?.error || null,
                    errorCode: result?.errorCode || null,
                    warning: result?.warning || null,
                    rateLimitRemaining: result?.rateLimitRemaining ?? null,
                    lastUpdated: Date.now()
                };

                if (fetchConfigVersion === this.configVersion) {
                    this.cache = payload;
                    this.lastFetch = payload.lastUpdated;
                }
                return payload;
            } catch (err) {
                console.error('[GitHubEngine] Fetch error:', err?.message || err);
                const errResult = {
                    enabled: true,
                    authenticated: false,
                    authMode: auth?.mode || 'none',
                    username: auth?.username || null,
                    avatarUrl: null,
                    error: err?.message || 'Network error while contacting GitHub.',
                    errorCode: err?.code || 'NETWORK_ERROR',
                    warning: null,
                    reviewRequests: [],
                    myPrs: [],
                    assignedIssues: [],
                    lastUpdated: Date.now()
                };
                if (!force && this.cache && this.cache.authenticated) {
                    return {
                        ...this.cache,
                        warning: errResult.error
                    };
                }
                return errResult;
            }
        })();

        this.currentFetchPromise = runFetch;
        try {
            return await runFetch;
        } finally {
            if (this.currentFetchPromise === runFetch) {
                this.currentFetchPromise = null;
            }
        }
    }
}

const instance = new GitHubEngine();
instance.GitHubEngine = GitHubEngine;
instance.helpers = {
    sanitizeToken,
    sanitizeUsername,
    parseRepoFilter,
    buildSearchQueries,
    mergeUniqueGitHubItems,
    parseGitHubApiError,
    mapSearchIssueItem,
    parseGitHubHtmlList
};

module.exports = instance;
