const { app, BrowserWindow, webContents, session, net, powerMonitor } = require('electron');

class GitHubEngine {
    constructor() {
        this.timer = null;
        this.cache = null;
        this.lastFetch = 0;
        this.activeProfileId = 'default';
        this.isSuspended = false;
        this.isFetching = false;
        this.config = {
            enabled: false,
            authMode: 'auto',
            token: '',
            interval: 10, // minutes (0 = manual only)
            repoFilter: '',
            includeDrafts: false,
            showReviews: true,
            showMyPrs: true,
            showAssignedIssues: true
        };

        try {
            if (powerMonitor) {
                powerMonitor.on('suspend', () => {
                    this.isSuspended = true;
                });
                powerMonitor.on('resume', () => {
                    this.isSuspended = false;
                    if (this.config.enabled && this.config.interval > 0) {
                        this.fetchWorkData(this.activeProfileId, false).catch(() => {});
                    }
                });
            }
        } catch (_) {}
    }

    updateConfig(newConfig, profileId = 'default') {
        const wasEnabled = this.config.enabled;
        this.activeProfileId = profileId || 'default';
        this.config = { ...this.config, ...newConfig };

        if (!this.config.enabled) {
            this.stop();
            return { status: 'stopped', enabled: false };
        }

        this.restartTimer();

        // Immediate background fetch if transitioning from disabled to enabled
        if (!wasEnabled && this.config.enabled) {
            this.fetchWorkData(this.activeProfileId, false).catch(() => {});
        }

        return { status: 'running', enabled: true };
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.cache = null;
        this.lastFetch = 0;
        this.isFetching = false;
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
                    this.fetchWorkData(this.activeProfileId, false).catch(() => {});
                }
            }, minutes * 60 * 1000);
        }
    }

    async getSessionAuth(profileId = 'default') {
        const token = (this.config.token || '').trim();
        if (this.config.authMode === 'token' && token) {
            return { authenticated: true, mode: 'token', token, username: null };
        }

        try {
            const partitionSession = session.fromPartition(`persist:profile_${profileId || 'default'}`);
            
            // Check both url and domain to reliably locate user_session & dotcom_user
            const [urlCookies, domainCookies] = await Promise.all([
                partitionSession.cookies.get({ url: 'https://github.com' }),
                partitionSession.cookies.get({ domain: 'github.com' })
            ]);

            const allCookies = [...urlCookies, ...domainCookies];
            const userCookie = allCookies.find(c => c.name === 'dotcom_user');
            const sessionCookie = allCookies.find(c => c.name === 'user_session' || c.name === '__Host-user_session_same_site');

            if (userCookie && userCookie.value) {
                return {
                    authenticated: true,
                    username: userCookie.value,
                    sessionToken: sessionCookie ? sessionCookie.value : null,
                    mode: 'session'
                };
            }
        } catch (e) {
            console.warn('[GitHubEngine] Error checking session cookies:', e.message);
        }

        if (token) {
            return { authenticated: true, mode: 'token', token, username: null };
        }

        return { authenticated: false };
    }

    async fetchViaToken(token, profileId) {
        const partitionSession = session.fromPartition(`persist:profile_${profileId || 'default'}`);
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'QBrowse-WorkMode',
            'Authorization': `Bearer ${token}`
        };

        // Resolve authenticated username
        let username = 'GitHub User';
        try {
            const uRes = await net.fetch('https://api.github.com/user', { headers, session: partitionSession });
            if (uRes.ok) {
                const uData = await uRes.json();
                username = uData.login || username;
            }
        } catch (_) {}

        let repoConstraint = '';
        if (this.config.repoFilter && typeof this.config.repoFilter === 'string' && this.config.repoFilter.trim()) {
            const repos = this.config.repoFilter.split(',').map(r => r.trim()).filter(Boolean);
            if (repos.length > 0) {
                repoConstraint = '+' + repos.map(r => `repo:${r}`).join('+');
            }
        }

        const draftFilter = this.config.includeDrafts ? '' : '+draft:false';

        const [reviewRes, myPrsRes, issuesRes] = await Promise.all([
            net.fetch(`https://api.github.com/search/issues?q=is:pr+is:open+review-requested:${username}${draftFilter}${repoConstraint}&sort=updated`, { headers, session: partitionSession }).catch(() => null),
            net.fetch(`https://api.github.com/search/issues?q=is:pr+is:open+author:${username}${draftFilter}${repoConstraint}&sort=updated`, { headers, session: partitionSession }).catch(() => null),
            net.fetch(`https://api.github.com/search/issues?q=is:issue+is:open+assignee:${username}${repoConstraint}&sort=updated`, { headers, session: partitionSession }).catch(() => null)
        ]);

        const mapItem = (item) => {
            const repoUrl = item.repository_url || '';
            const repoName = repoUrl.replace('https://api.github.com/repos/', '');
            return {
                id: String(item.id || item.html_url),
                number: String(item.number || ''),
                title: item.title,
                url: item.html_url,
                repo: repoName,
                author: item.user?.login || 'unknown',
                avatar: item.user?.avatar_url || '',
                isDraft: !!item.draft,
                comments: item.comments || 0,
                updatedAt: item.updated_at
            };
        };

        const reviewData = reviewRes && reviewRes.ok ? await reviewRes.json() : { items: [] };
        const myPrsData = myPrsRes && myPrsRes.ok ? await myPrsRes.json() : { items: [] };
        const issuesData = issuesRes && issuesRes.ok ? await issuesRes.json() : { items: [] };

        return {
            username,
            reviewRequests: (reviewData.items || []).map(mapItem),
            myPrs: (myPrsData.items || []).map(mapItem),
            assignedIssues: (issuesData.items || []).map(mapItem)
        };
    }

    async fetchViaDashboardWindow(profileId, username) {
        // 1. Check if any existing webContents is already loaded on https://github.com/
        const allWc = webContents.getAllWebContents();
        for (const wc of allWc) {
            try {
                const u = wc.getURL() || '';
                if (u.includes('github.com') && !wc.isDestroyed() && !wc.isCrashed()) {
                    const extracted = await wc.executeJavaScript(`
                        (() => {
                            try {
                                const prs = [];
                                const issues = [];
                                document.querySelectorAll('a[href*="/pull/"]').forEach(a => {
                                    const href = a.href;
                                    const text = a.innerText.trim();
                                    if (text && href && !prs.some(p => p.url === href)) {
                                        const match = href.match(/github\\.com\\/([^\\/]+\\/[^\\/]+)\\/pull\\/(\\d+)/);
                                        if (match) {
                                            prs.push({
                                                id: href,
                                                number: match[2],
                                                title: text.split('\\n')[0],
                                                url: href,
                                                repo: match[1],
                                                author: ${JSON.stringify(username || 'You')},
                                                isDraft: text.toLowerCase().includes('draft'),
                                                comments: 0,
                                                updatedAt: new Date().toISOString()
                                            });
                                        }
                                    }
                                });
                                return { prs, issues };
                            } catch (_) {
                                return null;
                            }
                        })()
                    `).catch(() => null);

                    if (extracted && extracted.prs && extracted.prs.length > 0) {
                        return {
                            username: username || 'GitHub User',
                            reviewRequests: [],
                            myPrs: extracted.prs,
                            assignedIssues: extracted.issues || []
                        };
                    }
                }
            } catch (_) {}
        }

        // 2. Otherwise spawn a hidden window to read the personal dashboard
        const win = new BrowserWindow({
            show: false,
            width: 800,
            height: 600,
            webPreferences: {
                partition: `persist:profile_${profileId || 'default'}`
            }
        });

        try {
            await win.loadURL('https://github.com/');

            // Poll for GitHub's React dashboard to render PR and Issue sections
            let extracted = null;
            for (let i = 0; i < 8; i++) {
                await new Promise(r => setTimeout(r, 400));
                if (win.isDestroyed()) break;

                extracted = await win.webContents.executeJavaScript(`
                    (() => {
                        try {
                            const prs = [];
                            const issues = [];
                            let resolvedUser = null;

                            const userMeta = document.querySelector('meta[name="user-login"]');
                            if (userMeta) resolvedUser = userMeta.content;

                            document.querySelectorAll('a[href*="/pull/"]').forEach(a => {
                                const href = a.href;
                                const text = a.innerText.trim();
                                if (text && href && !prs.some(p => p.url === href)) {
                                    const match = href.match(/github\\.com\\/([^\\/]+\\/[^\\/]+)\\/pull\\/(\\d+)/);
                                    if (match) {
                                        prs.push({
                                            id: href,
                                            number: match[2],
                                            title: text.split('\\n')[0],
                                            url: href,
                                            repo: match[1],
                                            author: resolvedUser || ${JSON.stringify(username || 'You')},
                                            isDraft: text.toLowerCase().includes('draft'),
                                            comments: 0,
                                            updatedAt: new Date().toISOString()
                                        });
                                    }
                                }
                            });

                            document.querySelectorAll('a[href*="/issues/"]').forEach(a => {
                                const href = a.href;
                                const text = a.innerText.trim();
                                if (text && href && !href.includes('/issues/created_by') && !issues.some(i => i.url === href)) {
                                    const match = href.match(/github\\.com\\/([^\\/]+\\/[^\\/]+)\\/issues\\/(\\d+)/);
                                    if (match) {
                                        issues.push({
                                            id: href,
                                            number: match[2],
                                            title: text.split('\\n')[0],
                                            url: href,
                                            repo: match[1],
                                            author: resolvedUser || ${JSON.stringify(username || 'You')},
                                            comments: 0,
                                            updatedAt: new Date().toISOString()
                                        });
                                    }
                                }
                            });

                            return { resolvedUser, prs, issues };
                        } catch (_) {
                            return null;
                        }
                    })()
                `).catch(() => null);

                if (extracted && extracted.prs && extracted.prs.length > 0) {
                    break;
                }
            }

            return {
                username: extracted?.resolvedUser || username || 'GitHub User',
                reviewRequests: [],
                myPrs: extracted?.prs || [],
                assignedIssues: extracted?.issues || []
            };
        } finally {
            if (!win.isDestroyed()) {
                win.destroy();
            }
        }
    }

    async fetchWorkData(profileId = 'default', force = false) {
        if (!this.config.enabled) {
            return { enabled: false, authenticated: false, reviewRequests: [], myPrs: [], assignedIssues: [], lastUpdated: 0 };
        }

        const now = Date.now();
        if (!force && this.cache && (now - this.lastFetch < 30000)) {
            return this.cache;
        }

        if (this.currentFetchPromise) {
            return await this.currentFetchPromise;
        }

        this.currentFetchPromise = (async () => {
            let auth = null;
            try {
                auth = await this.getSessionAuth(profileId);
                if (!auth.authenticated) {
                    this.cache = {
                        enabled: true,
                        authenticated: false,
                        username: null,
                        reviewRequests: [],
                        myPrs: [],
                        assignedIssues: [],
                        lastUpdated: now
                    };
                    this.lastFetch = now;
                    return this.cache;
                }

                let result = null;
                if (auth.mode === 'token' && auth.token) {
                    result = await this.fetchViaToken(auth.token, profileId);
                } else {
                    result = await this.fetchViaDashboardWindow(profileId, auth.username);
                }

                this.cache = {
                    enabled: true,
                    authenticated: true,
                    username: result?.username || auth.username || 'GitHub User',
                    reviewRequests: result?.reviewRequests || [],
                    myPrs: result?.myPrs || [],
                    assignedIssues: result?.assignedIssues || [],
                    lastUpdated: now
                };
                this.lastFetch = now;
                return this.cache;
            } catch (err) {
                console.error('[GitHubEngine] Fetch error:', err.message);
                return this.cache || {
                    enabled: true,
                    authenticated: !!auth?.authenticated,
                    username: auth?.username || null,
                    error: err.message,
                    reviewRequests: [],
                    myPrs: [],
                    assignedIssues: [],
                    lastUpdated: now
                };
            }
        })();

        try {
            return await this.currentFetchPromise;
        } finally {
            this.currentFetchPromise = null;
        }
    }
}

module.exports = new GitHubEngine();
