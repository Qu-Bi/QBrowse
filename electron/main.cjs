const { app, BrowserWindow, ipcMain, session, crashReporter, shell, clipboard, dialog, webContents, nativeImage, powerMonitor, components, protocol, net, nativeTheme, screen, Menu, MenuItem, safeStorage, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const http = require('http');
const { pathToFileURL, fileURLToPath } = require('url');
const performanceEngine = require('./performanceEngine.cjs');
const rustBridge = require('./rustBridge.cjs');
const githubEngine = require('./githubEngine.cjs');
const { PermissionManager } = require('./permissionEngine.cjs');
const extensionEngine = require('./extensionEngine.cjs');
const {
    DEFAULT_DARK_EXCLUSIONS,
    normalizeWhitelist,
    isUrlExcludedFromDarkMode
} = require('./darkModeWhitelist.cjs');
const {
    normalizeSemver,
    compareSemver,
    normalizeLinuxArch,
    getLinuxMetadataFileName,
    sanitizeUpdateFileName,
    detectLinuxInstallType,
    selectLinuxReleaseAsset,
    selectWindowsReleaseAsset,
    buildLinuxInstallCommand,
    replaceAppImageAtomically,
    resolveLinuxDesktopEntryState
} = require('./linuxUpdateHelper.cjs');

const APP_EDITION = 'rust';
const DEBUG_LOGS = process.env.QBROWSE_DEBUG_LOGS === '1';
const debugLog = (...args) => { if (DEBUG_LOGS) console.log(...args); };

let autoUpdater = null;
try {
    autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
    console.warn('[AutoUpdater] Module load warning:', e.message);
}

function resolveAppIconPath() {
    const candidates = [
        path.join(__dirname, '../icon.png'),
        path.join(__dirname, '../dist/icon.png'),
        path.join(__dirname, '../public/icon.png'),
        path.join(process.resourcesPath || '', 'icon.png')
    ];
    for (const candidate of candidates) {
        try {
            if (candidate && fsSync.existsSync(candidate)) return candidate;
        } catch (_) {}
    }
    return path.join(__dirname, '../icon.png');
}

// Set application identity for Windows Task Manager, Taskbar, and OS shell
app.name = 'QBrowse';
app.setName('QBrowse');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.qbrowse.app');
}
process.title = 'QBrowse';

let currentAppTheme = 'system';
try {
    const initialSettingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fsSync.existsSync(initialSettingsPath)) {
        const initialStore = JSON.parse(fsSync.readFileSync(initialSettingsPath, 'utf8'));
        if (initialStore?.theme === 'light' || initialStore?.theme === 'dark' || initialStore?.theme === 'system') {
            currentAppTheme = initialStore.theme;
        }
    }
} catch (_) {}

function getEffectiveColorScheme() {
    if (currentAppTheme === 'dark') return 'dark';
    if (currentAppTheme === 'light') return 'light';
    if (currentAppTheme === 'system') {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    }
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

try {
    nativeTheme.themeSource = (currentAppTheme === 'light' || currentAppTheme === 'dark') ? currentAppTheme : 'system';
} catch (_) {}

// In-Tab JavaScript Dialog state collections
const activeWebviewDialogs = new Map();
const pendingPromptResponses = new Map();
let localDialogPort = 0;
const localDialogAuthToken = crypto.randomBytes(32).toString('hex');
let latestActiveWebviewUrl = '';

// Active OAuth popup windows registry & settings synchronization
const activeOAuthWindows = new Set();
let liveSmartDarkState = {
    isForceDark: null,
    darkExclusions: [...DEFAULT_DARK_EXCLUSIONS],
    darkExcludeMedia: true
};
let liveTextHighlightState = {
    style: 'tinted',
    color: 'accent',
    accentColor: '#d4bc94',
    applyToWeb: true
};
let livePasskeyState = {
    passkeyProviderMode: null,
    passkeyHardwareFallback: null,
    vaultProvider: null
};

const VALID_VAULT_PROVIDER_RE = /^(qvault|ext:[a-zA-Z0-9_-]{1,64})$/;

function normalizeVaultProvider(val) {
    return (typeof val === 'string' && VALID_VAULT_PROVIDER_RE.test(val)) ? val : 'qvault';
}

function resolvePasskeyConfig(sender) {
    const providerMode = (livePasskeyState.passkeyProviderMode === 'hardware' || livePasskeyState.passkeyProviderMode === 'qvault')
        ? livePasskeyState.passkeyProviderMode
        : (settingsStore?.passkeyProviderMode === 'hardware' ? 'hardware' : 'qvault');
    const hardwareFallback = typeof livePasskeyState.passkeyHardwareFallback === 'boolean'
        ? livePasskeyState.passkeyHardwareFallback
        : (settingsStore?.passkeyHardwareFallback !== false);
    const vaultProvider = livePasskeyState.vaultProvider
        ? normalizeVaultProvider(livePasskeyState.vaultProvider)
        : normalizeVaultProvider(settingsStore?.vaultProvider);
    let isEphemeral = false;
    try {
        if (sender && sender.session && typeof sender.session.isPersistent === 'function') {
            isEphemeral = !sender.session.isPersistent();
        }
    } catch (_) {}
    return {
        passkeyProviderMode: providerMode,
        passkeyHardwareFallback: hardwareFallback,
        vaultProvider,
        isEphemeral
    };
}

// Clean browser User-Agent: Standard desktop Chrome matching Chromium runtime & host OS
const chromePlatformToken =
    process.platform === 'linux'
        ? 'X11; Linux x86_64'
        : process.platform === 'darwin'
            ? 'Macintosh; Intel Mac OS X 10_15_7'
            : 'Windows NT 10.0; Win64; x64';
const CHROME_VERSION = (process.versions && process.versions.chrome) || '134.0.0.0';
const CHROME_USER_AGENT = `Mozilla/5.0 (${chromePlatformToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`;
const cleanChromeUA = CHROME_USER_AGENT;
app.userAgentFallback = CHROME_USER_AGENT;

function isGoogleAuthUrl(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') return false;
    try {
        const u = new URL(targetUrl);
        const h = u.hostname.toLowerCase();
        return h === 'mail.google.com' ||
               h === 'gmail.com' ||
               h.endsWith('.google.com') ||
               h === 'google.com' ||
               h.endsWith('.googleusercontent.com') ||
               h === 'googleusercontent.com' ||
               h.endsWith('.gstatic.com') ||
               h === 'gstatic.com' ||
               h.endsWith('.googleapis.com') ||
               h.startsWith('accounts.google.') ||
               h === 'oauth2.googleapis.com' ||
               h.startsWith('accounts.youtube.') ||
               h === 'myaccount.google.com' ||
               h.startsWith('smartlock.google.') ||
               h.startsWith('consent.google.') ||
               h.startsWith('consent.youtube.') ||
               (h.includes('google.') && (u.pathname.startsWith('/signin') || u.pathname.startsWith('/ServiceLogin') || u.pathname.includes('/gsi'))) ||
               (h === 'apis.google.com' && (u.pathname.includes('/auth') || u.pathname.includes('/oauth') || u.pathname.includes('/gsi')));
    } catch (_) {
        const s = targetUrl.toLowerCase();
        return s.includes('mail.google.com') || s.includes('gmail.') || s.includes('googleusercontent.') || s.includes('accounts.google.') || s.includes('smartlock.google.') || s.includes('oauth2.googleapis.com');
    }
}

function isTrueOAuthUrl(targetUrl, frameName) {
    if (!targetUrl || targetUrl === 'about:blank') {
        const fn = (frameName || '').toLowerCase();
        return fn.includes('google') || fn.includes('gsi') || fn.includes('auth') || fn.includes('oauth') || fn.includes('credential');
    }
    try {
        const u = new URL(targetUrl);
        const host = u.hostname.toLowerCase();
        const path = u.pathname.toLowerCase();

        // Never treat webmail or Google productivity apps as OAuth popups
        if (host === 'mail.google.com' || host === 'gmail.com' || host === 'drive.google.com' || host === 'docs.google.com' || host === 'calendar.google.com' || host === 'meet.google.com') {
            return false;
        }

        // Google Identity / Sign-In
        if (host.startsWith('accounts.google.') || host === 'oauth2.googleapis.com' || host === 'smartlock.google.com' || host.startsWith('consent.google.') || (host.includes('google.com') && (path.includes('/oauth') || path.includes('/signin') || path.includes('/gsi')))) {
            return true;
        }

        // Major OAuth providers
        if (host.includes('github.com') && path.includes('/login/oauth')) return true;
        if (host.includes('facebook.com') && (path.includes('/dialog/oauth') || path.includes('/v'))) return true;
        if (host.includes('appleid.apple.com')) return true;
        if ((host.includes('twitter.com') || host.includes('x.com')) && path.includes('/oauth')) return true;
        if (host.includes('discord.com') && (path.includes('/oauth') || path.includes('/api/oauth2'))) return true;
        if (host.includes('slack.com') && path.includes('/oauth')) return true;
        if (host.includes('linkedin.com') && path.includes('/oauth')) return true;
        if (host.includes('firebaseapp.com') && path.includes('/__/auth')) return true;
        if (path.includes('/oauth/authorize') || path.includes('/oauth2/authorize') || path.includes('/auth/callback') || path.includes('/auth/handler')) return true;
    } catch (_) {}
    return false;
}

function getSettingsStore() {
    try {
        const p = path.join(app.getPath('userData'), 'settings.json');
        if (fsSync.existsSync(p)) {
            settingsStore = JSON.parse(fsSync.readFileSync(p, 'utf8')) || {};
        }
    } catch (_) {}
    return settingsStore || {};
}

function injectOAuthSmartDarkCSS(childWindow) {
    if (!childWindow || childWindow.isDestroyed()) return;
    try {
        childWindow.webContents.insertCSS(`
            @media screen {
                html.qbrowse-smart-dark-active {
                    filter: invert(1) hue-rotate(180deg) !important;
                    background-color: #ffffff !important;
                }
                html.qbrowse-smart-dark-active img,
                html.qbrowse-smart-dark-active picture,
                html.qbrowse-smart-dark-active video,
                html.qbrowse-smart-dark-active canvas,
                html.qbrowse-smart-dark-active svg image,
                html.qbrowse-smart-dark-active [role="img"],
                html.qbrowse-smart-dark-active [style*="background-image"],
                html.qbrowse-smart-dark-active [style*="background: url"],
                html.qbrowse-smart-dark-active [style*="background:url"],
                html.qbrowse-smart-dark-active [class*="bg-image"],
                html.qbrowse-smart-dark-active [class*="background-image"],
                html.qbrowse-smart-dark-active [class*="background_image"],
                html.qbrowse-smart-dark-active [class*="hero-image"],
                html.qbrowse-smart-dark-active [class*="banner-image"],
                html.qbrowse-smart-dark-active [class*="ext-background-image"],
                html.qbrowse-smart-dark-active [id*="backgroundImage"],
                html.qbrowse-smart-dark-active [id*="background-image"],
                html.qbrowse-smart-dark-active .qbrowse-counter-invert {
                    filter: invert(1) hue-rotate(180deg) !important;
                }
                html.qbrowse-smart-dark-active [style*="background-image"] img,
                html.qbrowse-smart-dark-active [style*="background: url"] img,
                html.qbrowse-smart-dark-active [style*="background:url"] img,
                html.qbrowse-smart-dark-active [class*="bg-image"] img,
                html.qbrowse-smart-dark-active [class*="background-image"] img,
                html.qbrowse-smart-dark-active [role="img"] img,
                html.qbrowse-smart-dark-active .qbrowse-counter-invert img {
                    filter: none !important;
                }
                html.qbrowse-smart-dark-active .qbrowse-note-badge,
                html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal,
                html.qbrowse-smart-dark-active #qbrowse-oauth-header,
                html.qbrowse-smart-dark-active #qbrowse-oauth-find-bar {
                    filter: invert(1) hue-rotate(180deg) !important;
                }
            }
            @media print {
                html.qbrowse-smart-dark-active {
                    filter: none !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                }
                html.qbrowse-smart-dark-active img,
                html.qbrowse-smart-dark-active picture,
                html.qbrowse-smart-dark-active video,
                html.qbrowse-smart-dark-active canvas {
                    filter: none !important;
                }
                html.qbrowse-smart-dark-active .qbrowse-note-badge,
                html.qbrowse-smart-dark-active #qbrowse-passkey-popup-modal,
                html.qbrowse-smart-dark-active #qbrowse-oauth-header,
                html.qbrowse-smart-dark-active #qbrowse-oauth-find-bar {
                    filter: none !important;
                }
            }
        `, { cssOrigin: 'user' });
    } catch (_) {}
}

function resolveSmartDarkConfig() {
    const store = getSettingsStore();
    const isForceDark = (store && typeof store.isForceDark === 'boolean')
        ? store.isForceDark
        : (liveSmartDarkState.isForceDark !== null ? liveSmartDarkState.isForceDark : false);
    const rawExclusions = Array.isArray(store?.darkExclusions)
        ? store.darkExclusions
        : liveSmartDarkState.darkExclusions;
    const exclusions = normalizeWhitelist(rawExclusions);
    const excludeMedia = (store && typeof store.darkExcludeMedia === 'boolean')
        ? store.darkExcludeMedia
        : (typeof liveSmartDarkState.darkExcludeMedia === 'boolean' ? liveSmartDarkState.darkExcludeMedia : true);
    return { isForceDark, exclusions, excludeMedia };
}

function syncOAuthWindowSmartDark(childWindow) {
    if (!childWindow || childWindow.isDestroyed()) return;
    try {
        const { isForceDark, exclusions, excludeMedia } = resolveSmartDarkConfig();
        let url = '';
        try { url = childWindow.webContents.getURL() || ''; } catch (_) {}
        const isExcluded = isUrlExcludedFromDarkMode(url, exclusions);

        debugLog('[Electron Main] syncOAuthWindowSmartDark -> url:', url, 'isForceDark:', isForceDark, 'isExcluded:', isExcluded);
        if (childWindow.webContents && typeof childWindow.webContents.setEmulatedMedia === 'function') {
            try {
                childWindow.webContents.setEmulatedMedia({ colorScheme: isForceDark && !isExcluded ? 'dark' : getEffectiveColorScheme() });
            } catch (_) {}
        }
        childWindow.webContents.send('apply-smart-dark', { isForceDark, isExcluded, excludeMedia });
    } catch (e) {
        console.error('[Electron Main] syncOAuthWindowSmartDark error:', e);
    }
}

function broadcastSmartDarkToAllWebviews() {
    try {
        const { isForceDark, exclusions, excludeMedia } = resolveSmartDarkConfig();
        const fallbackScheme = getEffectiveColorScheme();
        for (const wc of webContents.getAllWebContents()) {
            if (!wc || wc.isDestroyed() || wc.getType() !== 'webview') continue;
            try {
                const url = wc.getURL() || '';
                const isExcluded = isUrlExcludedFromDarkMode(url, exclusions);
                const scheme = (isForceDark && !isExcluded) ? 'dark' : fallbackScheme;
                if (typeof wc.setEmulatedMedia === 'function') {
                    wc.setEmulatedMedia({ colorScheme: scheme });
                }
                wc.send('apply-smart-dark', { isForceDark, isExcluded, excludeMedia });
            } catch (_) {}
        }
    } catch (_) {}
}

function broadcastSmartDarkToOAuthWindows() {
    for (const win of activeOAuthWindows) {
        if (win && !win.isDestroyed()) {
            syncOAuthWindowSmartDark(win);
        } else {
            activeOAuthWindows.delete(win);
        }
    }
    broadcastSmartDarkToAllWebviews();
}

// Internal dialog bridge server for synchronous window.alert, confirm, and prompt calls
const localDialogServer = http.createServer((req, res) => {
    const reqOrigin = req.headers.origin;
    if (reqOrigin) {
        res.setHeader('Access-Control-Allow-Origin', reqOrigin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Security: Require cryptographic token (via query parameter or header) to block local port scanning & cross-origin abuse
    let parsedPathname = req.url || '';
    let queryToken = '';
    try {
        const reqUrlObj = new URL(req.url || '/', 'http://127.0.0.1');
        parsedPathname = reqUrlObj.pathname;
        queryToken = reqUrlObj.searchParams.get('token') || '';
    } catch (_) {}
    const clientToken = req.headers['x-qbrowse-dialog-token'] || queryToken;
    if (!clientToken || clientToken !== localDialogAuthToken) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Unauthorized dialog request' }));
        return;
    }

    if (req.method === 'POST' && (parsedPathname === '/dialog' || parsedPathname === '/prompt')) {
        const MAX_DIALOG_BODY_BYTES = 64 * 1024;
        let body = '';
        let bodyBytes = 0;
        let aborted = false;
        req.on('data', chunk => {
            if (aborted) return;
            bodyBytes += Buffer.byteLength(chunk);
            if (bodyBytes > MAX_DIALOG_BODY_BYTES) {
                aborted = true;
                res.writeHead(413, { 'Content-Type': 'text/plain' });
                res.end('Payload Too Large');
                req.destroy();
                return;
            }
            body += chunk;
        });
        req.on('end', () => {
            if (aborted) return;
            try {
                const data = JSON.parse(body || '{}');
                const dialogId = 'dlg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                pendingPromptResponses.set(dialogId, res);

                const resolveDialogTargetWin = () => {
                    const focused = BrowserWindow.getFocusedWindow();
                    if (focused && !focused.isDestroyed() && !activeOAuthWindows.has(focused)) {
                        return focused;
                    }
                    if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
                    return Array.from(browserWindows).find(w => w && !w.isDestroyed()) || null;
                };

                const targetWin = resolveDialogTargetWin();

                // Safety timeout: never allow a synchronous dialog XHR to block a webview forever
                const safetyTimer = setTimeout(() => {
                    if (pendingPromptResponses.has(dialogId)) {
                        pendingPromptResponses.delete(dialogId);
                        if (!res.writableEnded) {
                            try {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ cancelled: true, value: null }));
                            } catch (_) {}
                        }
                        if (targetWin && !targetWin.isDestroyed()) {
                            try { targetWin.webContents.send('qbrowse-js-dialog-dismiss', { dialogId }); } catch (_) {}
                        }
                    }
                }, 60000);

                res.on('close', () => {
                    clearTimeout(safetyTimer);
                    if (!res.writableEnded && pendingPromptResponses.has(dialogId)) {
                        pendingPromptResponses.delete(dialogId);
                        if (targetWin && !targetWin.isDestroyed()) {
                            try { targetWin.webContents.send('qbrowse-js-dialog-dismiss', { dialogId }); } catch (_) {}
                        }
                    }
                });

                let hostname = '';
                const parseHttpHostname = (rawUrl) => {
                    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl === 'about:blank') return '';
                    try {
                        const parsed = new URL(rawUrl);
                        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                            return parsed.hostname || '';
                        }
                    } catch (_) {}
                    return '';
                };
                hostname = parseHttpHostname(req.headers.origin)
                    || parseHttpHostname(latestActiveWebviewUrl)
                    || ((data.hostname && data.hostname !== 'about:blank') ? String(data.hostname) : '');
                if (!hostname) hostname = 'Website';

                const dialogType = data.type || (parsedPathname === '/prompt' ? 'prompt' : 'alert');

                if (targetWin && !targetWin.isDestroyed()) {
                    targetWin.webContents.send('qbrowse-js-dialog-open', {
                        dialogId,
                        dialogType,
                        message: data.message || '',
                        hostname,
                        origin: data.origin || latestActiveWebviewUrl || '',
                        defaultValue: data.defaultValue || ''
                    });
                } else {
                    clearTimeout(safetyTimer);
                    pendingPromptResponses.delete(dialogId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ cancelled: true, value: null }));
                }
            } catch (e) {
                res.writeHead(400);
                res.end();
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

localDialogServer.listen(0, '127.0.0.1', () => {
    localDialogPort = localDialogServer.address().port;
    debugLog('[Electron Main] Local dialog server listening on port:', localDialogPort);
});

ipcMain.on('get-dialog-port', (event) => {
    event.returnValue = { port: localDialogPort, token: localDialogAuthToken };
});

// Suppress internal native OS message boxes and route alerts/confirms through in-tab custom sheets
const originalShowMessageBoxSync = dialog.showMessageBoxSync;
const originalShowMessageBox = dialog.showMessageBox;

dialog.showMessageBoxSync = function(targetWindow, options) {
    const opts = (options && typeof options === 'object') ? options : (targetWindow && typeof targetWindow === 'object' ? targetWindow : {});
    debugLog('[Electron Main] Suppressed native message box sync:', opts.message || opts.title || opts);
    return 0; // Return OK index without opening native OS dialog
};

dialog.showMessageBox = function(targetWindow, options) {
    const opts = (options && typeof options === 'object') ? options : (targetWindow && typeof targetWindow === 'object' ? targetWindow : {});
    debugLog('[Electron Main] showMessageBox intercepted, awaiting in-tab user response:', opts.message || opts.title || opts);

    return new Promise((resolve) => {
        const dialogId = 'msgbox_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const isConfirm = Array.isArray(opts.buttons) && opts.buttons.length > 1;
        const dialogType = isConfirm ? 'confirm' : 'alert';

        let hostname = '';
        try {
            if (latestActiveWebviewUrl) {
                hostname = new URL(latestActiveWebviewUrl).hostname;
            }
        } catch (_) {}
        if (!hostname) hostname = 'Website';

        const focused = BrowserWindow.getFocusedWindow();
        const targetWin = (focused && !focused.isDestroyed() && !activeOAuthWindows.has(focused))
            ? focused
            : ((mainWindow && !mainWindow.isDestroyed()) ? mainWindow : Array.from(browserWindows).find(w => w && !w.isDestroyed()) || null);

        activeWebviewDialogs.set(dialogId, {
            resolve,
            type: dialogType
        });

        if (targetWin && !targetWin.isDestroyed()) {
            targetWin.webContents.send('qbrowse-js-dialog-open', {
                dialogId,
                dialogType,
                message: opts.message || opts.detail || '',
                hostname,
                origin: latestActiveWebviewUrl || '',
                defaultValue: ''
            });
        } else {
            activeWebviewDialogs.delete(dialogId);
            resolve({ response: 0, checkboxChecked: false });
        }
    });
};

// Disable Blink automation features so navigator.webdriver is false and automation flags are suppressed
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// Register custom privileged scheme for streaming local media, files, thumbnails, and wallpapers safely
protocol.registerSchemesAsPrivileged([
    { scheme: 'qbrowse', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
    { scheme: 'qbrowse-media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
    { scheme: 'qbrowse-local', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
    { scheme: 'qbrowse-thumb', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
    { scheme: 'qbrowse-ext-rpc', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true } }
]);

function stripWindowsExtendedPrefix(p) {
    if (!p || typeof p !== 'string') return '';
    if (p.startsWith('\\\\?\\UNC\\')) return '\\\\' + p.slice(8);
    if (p.startsWith('\\\\?\\')) return p.slice(4);
    return p;
}

const authorizedLocalPaths = new Set();
function authorizeLocalPath(p) {
    if (!p || typeof p !== 'string') return;
    try {
        authorizedLocalPaths.add(path.resolve(stripWindowsExtendedPrefix(p)));
    } catch (_) {}
}
function isAuthorizedLocalPath(p) {
    if (!p || typeof p !== 'string') return false;
    try {
        const resolved = path.resolve(stripWindowsExtendedPrefix(p));
        if (authorizedLocalPaths.has(resolved)) return true;
        const dir = path.dirname(resolved);
        return authorizedLocalPaths.has(dir);
    } catch {
        return false;
    }
}

ipcMain.handle('read-clipboard-text', (event) => {
    assertTrustedAppShell(event, 'read-clipboard-text');
    try {
        return clipboard.readText();
    } catch {
        return '';
    }
});

ipcMain.handle('write-clipboard-text', (event, text) => {
    assertTrustedAppShell(event, 'write-clipboard-text');
    try {
        clipboard.writeText(text || '');
        return true;
    } catch {
        return false;
    }
});

// Runtime Firebase Configuration Provider (for production installations like .deb / .exe)
function getStoredFirebaseConfig() {
    try {
        // 1. Process environment variables (e.g. launched via command line: VITE_FIREBASE_API_KEY="..." qbrowse)
        const envKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
        if (envKey && envKey !== 'placeholder_api_key' && !envKey.includes('placeholder')) {
            return {
                apiKey: envKey,
                authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
                measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID
            };
        }

        // 2. User data directory: ~/.config/QBrowse/firebase.json (or %APPDATA%/QBrowse/firebase.json)
        const userConfigPath = path.join(app.getPath('userData'), 'firebase.json');
        if (fsSync.existsSync(userConfigPath)) {
            const raw = fsSync.readFileSync(userConfigPath, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && parsed.apiKey && !parsed.apiKey.includes('placeholder')) {
                return parsed;
            }
        }

        // 3. User data directory .env: ~/.config/QBrowse/.env
        const userEnvPath = path.join(app.getPath('userData'), '.env');
        if (fsSync.existsSync(userEnvPath)) {
            const raw = fsSync.readFileSync(userEnvPath, 'utf8');
            const parsed = {};
            raw.split(/\r?\n/).forEach(line => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    let val = (match[2] || '').trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    parsed[match[1]] = val;
                }
            });
            const key = parsed.VITE_FIREBASE_API_KEY || parsed.FIREBASE_API_KEY;
            if (key && key !== 'placeholder_api_key' && !key.includes('placeholder')) {
                return {
                    apiKey: key,
                    authDomain: parsed.VITE_FIREBASE_AUTH_DOMAIN || parsed.FIREBASE_AUTH_DOMAIN,
                    projectId: parsed.VITE_FIREBASE_PROJECT_ID || parsed.FIREBASE_PROJECT_ID,
                    storageBucket: parsed.VITE_FIREBASE_STORAGE_BUCKET || parsed.FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: parsed.VITE_FIREBASE_MESSAGING_SENDER_ID || parsed.FIREBASE_MESSAGING_SENDER_ID,
                    appId: parsed.VITE_FIREBASE_APP_ID || parsed.FIREBASE_APP_ID,
                    measurementId: parsed.VITE_FIREBASE_MEASUREMENT_ID || parsed.FIREBASE_MEASUREMENT_ID
                };
            }
        }
    } catch (e) {
        console.warn('[Main] Error reading stored Firebase config:', e);
    }
    return null;
}

ipcMain.handle('get-firebase-config', () => getStoredFirebaseConfig());
ipcMain.on('get-firebase-config-sync', (event) => {
    event.returnValue = getStoredFirebaseConfig();
});

ipcMain.handle('save-firebase-config', async (event, config) => {
    try {
        if (!config || typeof config !== 'object') return false;
        const userConfigPath = path.join(app.getPath('userData'), 'firebase.json');
        await fs.writeFile(userConfigPath, JSON.stringify(config, null, 2), 'utf8');
        debugLog('[Main] Saved Firebase config to:', userConfigPath);
        return true;
    } catch (e) {
        console.error('[Main] Failed to save Firebase config:', e);
        return false;
    }
});

// Helper to safely convert file:// or string path to clean OS filesystem path
function toLocalFsPath(input) {
    if (!input || typeof input !== 'string') return '';
    let target = input.trim();
    if (target.startsWith('file://')) {
        const cleanUrl = target.split(/[?#]/)[0];
        try {
            target = fileURLToPath(cleanUrl);
        } catch (_) {
            target = cleanUrl.replace(/^file:\/\/\/?/, '');
            try { target = decodeURIComponent(target); } catch (_) {}
            if (process.platform === 'win32' && /^[a-zA-Z]:/.test(target)) {
                // Keep Windows drive letter
            } else if (process.platform !== 'win32' && !target.startsWith('/')) {
                target = '/' + target;
            }
        }
    }
    if (target.startsWith('~/') || target === '~') {
        target = path.join(os.homedir(), target.slice(1));
    }
    return path.normalize(stripWindowsExtendedPrefix(target));
}

// Native Open File / Folder Dialog (Ctrl+O)
ipcMain.handle('open-file-dialog', async (event, options = {}) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const properties = options.directory ? ['openDirectory'] : ['openFile', 'multiSelections'];
        const result = await dialog.showOpenDialog(win, {
            title: options.title || 'Open File in QBrowse',
            properties,
            filters: options.filters || [
                { name: 'All Supported Formats', extensions: ['pdf', 'html', 'htm', 'md', 'txt', 'json', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'mp4', 'webm', 'mp3', 'wav', 'js', 'css', 'py', 'ts'] },
                { name: 'PDF Documents (*.pdf)', extensions: ['pdf'] },
                { name: 'Web Documents (*.html, *.htm)', extensions: ['html', 'htm'] },
                { name: 'Markdown & Text (*.md, *.txt, *.json)', extensions: ['md', 'txt', 'json', 'js', 'py', 'css'] },
                { name: 'Images & Media', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'webm', 'mp3'] },
                { name: 'All Files (*.*)', extensions: ['*'] }
            ]
        });
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;
        return result.filePaths.map(p => pathToFileURL(p).href);
    } catch (e) {
        console.error('[Main] open-file-dialog error:', e);
        return null;
    }
});

// List Directory contents for QBrowse Local Glass Explorer
ipcMain.handle('list-local-directory', async (event, dirUrlOrPath) => {
    try {
        const targetPath = toLocalFsPath(dirUrlOrPath);
        if (!targetPath || !fsSync.existsSync(targetPath)) {
            return { error: 'Folder does not exist or access is restricted' };
        }
        authorizeLocalPath(targetPath);
        const stat = await fs.stat(targetPath);
        if (!stat.isDirectory()) {
            return { error: 'Path is a file, not a directory', isFile: true, path: targetPath, url: pathToFileURL(targetPath).href };
        }

        const entries = await fs.readdir(targetPath, { withFileTypes: true });
        const items = [];

        for (const entry of entries) {
            try {
                // Ignore broken symlinks or hidden system files if they throw
                const fullItemPath = path.join(targetPath, entry.name);
                let itemStat = null;
                try {
                    itemStat = await fs.stat(fullItemPath);
                } catch (_) {}

                const isDir = entry.isDirectory();
                items.push({
                    name: entry.name,
                    path: fullItemPath,
                    url: pathToFileURL(fullItemPath).href,
                    isDirectory: isDir,
                    size: itemStat && !isDir ? itemStat.size : 0,
                    modified: itemStat ? itemStat.mtimeMs : 0,
                    extension: isDir ? '' : path.extname(entry.name).toLowerCase().replace('.', '')
                });
            } catch (_) {}
        }

        // Sort: directories first alphabetically, then files alphabetically
        items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Determine parent path
        const parentPath = path.dirname(targetPath);
        const hasParent = parentPath && parentPath !== targetPath;

        return {
            success: true,
            currentPath: targetPath,
            currentUrl: pathToFileURL(targetPath).href,
            parentPath: hasParent ? parentPath : null,
            parentUrl: hasParent ? pathToFileURL(parentPath).href : null,
            items,
            totalItems: items.length
        };
    } catch (err) {
        console.error('[Main] list-local-directory error:', err);
        return { error: err.message || 'Failed to list directory' };
    }
});

// Autocomplete Local Paths for Omnibox
ipcMain.handle('autocomplete-local-path', async (event, query) => {
    try {
        if (!query || typeof query !== 'string') return [];
        let raw = query.trim();
        if (raw.startsWith('file://')) {
            try { raw = fileURLToPath(raw); } catch (_) { raw = raw.replace(/^file:\/\/\/?/, ''); }
        }
        if (raw.startsWith('~/') || raw === '~') {
            raw = path.join(os.homedir(), raw.slice(1));
        }

        let searchDir = '';
        let prefix = '';

        if (raw.endsWith('/') || raw.endsWith('\\')) {
            searchDir = path.normalize(raw);
            prefix = '';
        } else {
            searchDir = path.dirname(path.normalize(raw));
            prefix = path.basename(raw).toLowerCase();
        }

        if (!searchDir || !fsSync.existsSync(searchDir)) return [];
        const dirStat = fsSync.statSync(searchDir);
        if (!dirStat.isDirectory()) return [];

        const entries = await fs.readdir(searchDir, { withFileTypes: true });
        const matches = [];

        for (const entry of entries) {
            if (prefix && !entry.name.toLowerCase().startsWith(prefix)) continue;
            const fullP = path.join(searchDir, entry.name);
            const isDir = entry.isDirectory();
            matches.push({
                name: entry.name,
                path: fullP,
                url: pathToFileURL(fullP).href,
                isDirectory: isDir,
                extension: isDir ? '' : path.extname(entry.name).toLowerCase().replace('.', '')
            });
            if (matches.length >= 25) break;
        }
        return matches;
    } catch {
        return [];
    }
});

// Read Local File Content / Binary for In-Tab Glass Viewers
const LOCAL_MEDIA_MIME_MAP = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'opus': 'audio/opus',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    'pdf': 'application/pdf'
};

ipcMain.handle('read-local-file-data', async (event, fileUrlOrPath) => {
    try {
        const targetPath = toLocalFsPath(fileUrlOrPath);
        if (!targetPath || !fsSync.existsSync(targetPath)) {
            return { error: 'File does not exist or has been moved' };
        }
        authorizeLocalPath(targetPath);
        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
            return { isDirectory: true, path: targetPath, url: pathToFileURL(targetPath).href };
        }
        const probe = await rustBridge.mediaProbeLocalFile(targetPath);
        if (probe) {
            return {
                success: true,
                path: targetPath,
                url: pathToFileURL(targetPath).href,
                streamUrl: probe.streamUrl,
                name: probe.name || path.basename(targetPath),
                size: probe.size ?? stat.size,
                modified: probe.mtime ?? stat.mtimeMs,
                extension: path.extname(targetPath).toLowerCase().replace(/^\./, ''),
                mime: probe.mime,
                isText: Boolean(probe.isText),
                content: probe.textContent ?? null,
                base64: null
            };
        }
        return { error: 'Failed to probe file' };
    } catch (err) {
        console.error('[Main] read-local-file-data error:', err);
        return { error: err.message || 'Failed to read file' };
    }
});

// Reveal file in Explorer / Nautilus / Finder
ipcMain.handle('show-in-folder', async (event, fileUrlOrPath) => {
    try {
        const targetPath = toLocalFsPath(fileUrlOrPath);
        if (targetPath && fsSync.existsSync(targetPath)) {
            shell.showItemInFolder(targetPath);
            return true;
        }
        return false;
    } catch {
        return false;
    }
});

// Open folder with system file manager
ipcMain.handle('open-path', async (event, dirUrlOrPath) => {
    try {
        const targetPath = toLocalFsPath(dirUrlOrPath);
        if (targetPath && fsSync.existsSync(targetPath)) {
            await shell.openPath(targetPath);
            return true;
        }
        return false;
    } catch {
        return false;
    }
});

const INTERNAL_BROWSER_SCHEMES = new Set([
    'http:', 'https:', 'qbrowse:', 'about:', 'chrome:', 'data:', 'blob:', 'javascript:', 'file:', 'ws:', 'wss:'
]);

const DANGEROUS_EXTERNAL_SCHEMES = new Set([
    'file:', 'javascript:', 'data:', 'vbscript:', 'powershell:', 'cmd:', 'ms-msdt:', 'search-ms:', 'shell:', 'disk:', 'con:', 'prn:', 'aux:', 'nul:'
]);

const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const APP_PROTOCOL_NAMES = {
    'zoommtg:': 'Zoom Meetings',
    'zoomus:': 'Zoom Meetings',
    'slack:': 'Slack',
    'discord:': 'Discord',
    'discord-canary:': 'Discord Canary',
    'discord-ptb:': 'Discord PTB',
    'spotify:': 'Spotify',
    'tg:': 'Telegram',
    'telegram:': 'Telegram',
    'whatsapp:': 'WhatsApp',
    'signal:': 'Signal',
    'steam:': 'Steam',
    'epicgames:': 'Epic Games Launcher',
    'battlenet:': 'Battle.net',
    'vscode:': 'Visual Studio Code',
    'vscode-insiders:': 'VS Code Insiders',
    'cursor:': 'Cursor',
    'vscodium:': 'VSCodium',
    'figma:': 'Figma',
    'notion:': 'Notion',
    'linear:': 'Linear',
    'obsidian:': 'Obsidian',
    'msteams:': 'Microsoft Teams',
    'teams:': 'Microsoft Teams',
    'skype:': 'Skype',
    'webex:': 'Cisco Webex',
    'magnet:': 'BitTorrent Client',
    'mailto:': 'Default Email Client',
    'tel:': 'Default Phone App',
    'facetime:': 'FaceTime',
    'ms-windows-store:': 'Microsoft Store',
    'itms-apps:': 'App Store'
};

function getAppProtocol(urlStr) {
    if (!urlStr || typeof urlStr !== 'string' || /[\r\n\0]/.test(urlStr)) return null;
    const match = urlStr.trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    if (!match) return null;
    return match[1].toLowerCase() + ':';
}

function isAppProtocolUrl(urlStr) {
    const proto = getAppProtocol(urlStr);
    if (!proto) return false;
    if (INTERNAL_BROWSER_SCHEMES.has(proto)) return false;
    if (DANGEROUS_EXTERNAL_SCHEMES.has(proto)) return false;
    return true;
}

function getAppProtocolDisplayName(urlStr) {
    const proto = getAppProtocol(urlStr);
    if (!proto) return 'External Application';
    return APP_PROTOCOL_NAMES[proto] || `${proto.replace(':', '').toUpperCase()} App`;
}

function notifyAppProtocolLaunched(urlStr) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        const name = getAppProtocolDisplayName(urlStr);
        mainWindow.webContents.send('app-protocol-launched', {
            url: urlStr,
            protocol: getAppProtocol(urlStr),
            name
        });
    }
}

function isSafeExternalUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    if (/[\r\n\0]/.test(urlStr)) return false;
    const proto = getAppProtocol(urlStr);
    if (!proto) return false;
    if (DANGEROUS_EXTERNAL_SCHEMES.has(proto)) return false;
    if (SAFE_EXTERNAL_PROTOCOLS.has(proto)) return true;
    return isAppProtocolUrl(urlStr);
}

ipcMain.handle('open-external', async (event, url) => {
    assertTrustedAppShell(event, 'open-external');
    try {
        if (!isSafeExternalUrl(url)) {
            console.warn('[Security] Blocked unsafe external URL launch:', url);
            return false;
        }
        await shell.openExternal(url);
        if (isAppProtocolUrl(url)) {
            notifyAppProtocolLaunched(url);
        }
        return true;
    } catch (e) {
        console.warn('[Main] Failed to open external URL:', e.message);
        return false;
    }
});

ipcMain.handle('open-app-protocol', async (event, args = {}) => {
    const protocolUrl = typeof args === 'string' ? args : args?.protocolUrl;
    const fallbackUrl = typeof args === 'object' ? args?.fallbackUrl : undefined;

    if (protocolUrl && isAppProtocolUrl(protocolUrl)) {
        try {
            await shell.openExternal(protocolUrl);
            notifyAppProtocolLaunched(protocolUrl);
            return true;
        } catch (e) {
            console.warn('[Main] App protocol launch failed:', e.message);
        }
    }
    if (fallbackUrl && isSafeExternalUrl(fallbackUrl)) {
        try {
            await shell.openExternal(fallbackUrl);
            return true;
        } catch (e) {
            console.warn('[Main] Failed to open fallback URL:', e.message);
        }
    }
    return false;
});

ipcMain.handle('open-with-dialog', async (event, url) => {
    assertTrustedAppShell(event, 'open-with-dialog');
    if (!isSafeExternalUrl(url)) {
        console.warn('[Security] Blocked unsafe URL in open-with-dialog:', url);
        return false;
    }
    try {
        if (process.platform === 'win32') {
            const sanitizedUrl = url.replace(/[\r\n\0]/g, '');
            const tempUrlFile = path.join(os.tmpdir(), `qbrowse_open_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.url`);
            await fs.writeFile(tempUrlFile, `[InternetShortcut]\r\nURL=${sanitizedUrl}\r\n`, 'utf8');
            const openWithPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'OpenWith.exe');
            const child = spawn(openWithPath, [tempUrlFile], { detached: true, stdio: 'ignore' });
            child.unref();

            // Clean up temporary shortcut file after a brief delay
            setTimeout(() => {
                fs.unlink(tempUrlFile).catch(() => {});
            }, 60000);

            return true;
        }
    } catch (e) {
        console.warn('[Main] Failed to invoke OpenWith.exe, falling back:', e.message);
    }
    try {
        await shell.openExternal(url);
        return true;
    } catch (_) {
        return false;
    }
});
const { spawn, execFile } = require('child_process');
const { adblockEngine } = require('./adblockEngine.cjs');
const fetch = require('cross-fetch');
const torEngine = require('./torEngine.cjs');

crashReporter.start({
  uploadToServer: false,
});

process.on('uncaughtException', (err) => {
    const msg = String(err?.message || '');
    if (msg.includes('assert(!this.paused)') || msg.includes('ECONNRESET') || msg.includes('EPIPE')) {
        console.warn('[Electron Main] Handled internal stream/socket exception:', msg);
        return;
    }
    console.error('[Electron Main] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.warn('[Electron Main] Unhandled Rejection:', reason?.message || reason);
});

let mainWindow;
const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || !fsSync.existsSync(path.join(__dirname, '../dist/index.html')));
app.setName('QBrowse');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.qbrowse.app');
}

// Single Instance Lock for Default Browser link routing
const gotTheLock = app.requestSingleInstanceLock();
let initialUrlToOpen = null;

const extractUrlFromArgs = (argv, workingDirectory = null) => {
    if (!Array.isArray(argv)) return null;
    const appPath = (() => { try { return path.resolve(app.getAppPath()); } catch { return ''; } })();
    const execPath = (() => { try { return path.resolve(process.execPath); } catch { return ''; } })();
    for (const rawArg of argv) {
        if (!rawArg || typeof rawArg !== 'string') continue;
        const arg = rawArg.trim().replace(/^["']|["']$/g, '');
        if (!arg || arg.startsWith('--') || arg.startsWith('-')) continue;
        if (arg === '.' || arg.endsWith('main.cjs') || /electron(\.exe)?$/i.test(arg) || /qbrowse(\.exe)?$/i.test(arg)) continue;

        if (arg.startsWith('http://') || arg.startsWith('https://') || arg.startsWith('qbrowse://') || arg.startsWith('file://')) {
            return arg;
        }

        try {
            const resolved = path.isAbsolute(arg) ? path.normalize(arg) : path.resolve(workingDirectory || process.cwd(), arg);
            if ((appPath && resolved === appPath) || (execPath && resolved === execPath) || resolved.includes('app.asar')) {
                continue;
            }
            if (fsSync.existsSync(resolved)) {
                return pathToFileURL(resolved).href;
            }
        } catch (_) {}
    }
    return null;
};

if (!gotTheLock) {
    app.quit();
} else {
    initialUrlToOpen = extractUrlFromArgs(process.argv);

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        const targetWin = (BrowserWindow.getFocusedWindow() && browserWindows.has(BrowserWindow.getFocusedWindow()))
            ? BrowserWindow.getFocusedWindow()
            : (mainWindow && !mainWindow.isDestroyed() ? mainWindow : Array.from(browserWindows)[0]);
        if (targetWin && !targetWin.isDestroyed()) {
            if (targetWin.isMinimized()) targetWin.restore();
            targetWin.focus();
            const incomingUrl = extractUrlFromArgs(commandLine, workingDirectory);
            if (incomingUrl) {
                targetWin.webContents.send('open-new-tab-url', { url: incomingUrl, disposition: 'default' });
            }
        }
    });
}

app.on('open-url', (event, url) => {
    event.preventDefault();
    const targetWin = (BrowserWindow.getFocusedWindow() && browserWindows.has(BrowserWindow.getFocusedWindow()))
        ? BrowserWindow.getFocusedWindow()
        : (mainWindow && !mainWindow.isDestroyed() ? mainWindow : Array.from(browserWindows)[0]);
    if (targetWin && !targetWin.isDestroyed()) {
        targetWin.webContents.send('open-new-tab-url', { url, disposition: 'default' });
    } else {
        initialUrlToOpen = url;
    }
});

app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (!filePath || typeof filePath !== 'string') return;
    let fileUrl = filePath;
    try {
        fileUrl = filePath.startsWith('file://') ? filePath : pathToFileURL(path.resolve(filePath)).href;
    } catch (_) {}
    const targetWin = (BrowserWindow.getFocusedWindow() && browserWindows.has(BrowserWindow.getFocusedWindow()))
        ? BrowserWindow.getFocusedWindow()
        : (mainWindow && !mainWindow.isDestroyed() ? mainWindow : Array.from(browserWindows)[0]);
    if (targetWin && !targetWin.isDestroyed()) {
        if (targetWin.isMinimized()) targetWin.restore();
        targetWin.focus();
        targetWin.webContents.send('open-new-tab-url', { url: fileUrl, disposition: 'default' });
    } else {
        initialUrlToOpen = fileUrl;
    }
});

// Hardware Acceleration & Performance Optimizations
if (process.platform === 'linux' && process.env.WAYLAND_DISPLAY && !process.argv.some(a => a.startsWith('--ozone-platform'))) {
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('canvas-oop-rasterization');
app.commandLine.appendSwitch('enable-blink-features', 'MiddleClickAutoscroll');
app.commandLine.appendSwitch('enable-picture-in-picture');
app.commandLine.appendSwitch('enable-fast-unload');
app.commandLine.appendSwitch('enable-tcp-fastopen');
// Prevent Windows 10/11 EcoQoS downclocking and occlusion throttling on child renderers
const disabledChromiumFeatures = new Set([
    'BlockInsecurePrivateNetworkRequests',
    'HardwareMediaKeyHandling',
    // Strictly disable FedCM: Google Identity Services (GSI) checks "IdentityCredential" in window.
    // In desktop Electron, FedCM has no native account-chooser UI dialog and fails with NetworkError.
    // Disabling FedCM forces GSI on Pinterest and other OAuth sites to fall back to standard popup window.open!
    'FedCm',
    'FedCmButtonMode',
    'FedCmAuthz',
    'FedCmAutoSelectedFlag',
    'FedCmIdPRegistration'
]);
app.commandLine.appendSwitch('disable-features', Array.from(disabledChromiumFeatures).join(','));

// Hardware parallel raster threads tuned to host CPU topology
const cpuCount = Array.isArray(os.cpus()) && os.cpus().length ? os.cpus().length : 4;
app.commandLine.appendSwitch('num-raster-threads', String(Math.max(2, Math.min(cpuCount, 8))));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// GPU Resilience: Prevents Chromium from permanently blacklisting hardware acceleration
// and falling back to CPU software rasterization (SwiftShader) after display resolution/mode switches
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('disable-gpu-watchdog');
app.commandLine.appendSwitch('gpu-no-context-lost');
app.commandLine.appendSwitch('disable-domain-blocking-for-3d-apis');

// Synchronously load user flags from qbrowse://flags before app is ready
let userFlags = {};
try {
    const flagsPath = path.join(app.getPath('userData'), 'flags.json');
    if (fsSync.existsSync(flagsPath)) {
        userFlags = JSON.parse(fsSync.readFileSync(flagsPath, 'utf8'));
    }
} catch (_) {}

const isFlagOn = (id, defaultVal = false) => {
    if (userFlags[id] === 'enabled') return true;
    if (userFlags[id] === 'disabled') return false;
    return defaultVal;
};
let perfMode = 'auto';
try {
    const perfPath = path.join(app.getPath('userData'), 'performance_settings.json');
    if (fsSync.existsSync(perfPath)) {
        const perfData = JSON.parse(fsSync.readFileSync(perfPath, 'utf8'));
        perfMode = perfData?.mode || 'auto';
    }
} catch (_) {}

// Consolidate all Chromium features into a single enable-features switch to avoid command-line overwrite
const enabledChromiumFeatures = new Set([
    'DocumentPictureInPictureAPI',
    'MediaSessionAPIs',
    'ParallelDownloading',
    'CanvasOopRasterization',
    'AutomaticLazyImageLoading',
    'BackForwardCache',
    'BackForwardCacheSameSiteForced',
    'BackForwardCacheMedia',
    'V8VmFuture',
    'WebAssemblyTurboshaft'
]);

if (isFlagOn('enable-vulkan', false)) enabledChromiumFeatures.add('Vulkan');
if (isFlagOn('force-dark-contents', false)) enabledChromiumFeatures.add('WebContentsForceDark');
if (isFlagOn('enable-encrypted-client-hello', true)) enabledChromiumFeatures.add('EncryptedClientHello');
if (isFlagOn('enable-tls13-kyber', true)) enabledChromiumFeatures.add('PostQuantumKyber');
if (isFlagOn('overlay-scrollbars', false)) enabledChromiumFeatures.add('OverlayScrollbar');
if (isFlagOn('enable-drdc', false)) enabledChromiumFeatures.add('DynamicRefreshRateDetection');
// WebGPU feature enablement
if (isFlagOn('enable-webgpu', false)) {
    enabledChromiumFeatures.add('WebGPU');
}

app.commandLine.appendSwitch('enable-features', Array.from(enabledChromiumFeatures).join(','));

// Apply other standalone flags
if (isFlagOn('smooth-scrolling', true)) app.commandLine.appendSwitch('enable-smooth-scrolling');
if (isFlagOn('enable-quic', true)) app.commandLine.appendSwitch('enable-quic');
if (isFlagOn('enable-webgpu', false)) app.commandLine.appendSwitch('enable-unsafe-webgpu');
if (isFlagOn('strict-origin-isolation', false)) app.commandLine.appendSwitch('site-per-process');
if (isFlagOn('disable-hyperlink-auditing', true)) app.commandLine.appendSwitch('no-pings');

// Discrete High-Performance GPU: Directs WebGL/3D to dedicated GPU on hybrid graphics laptops (disabled in Eco mode)
if (perfMode !== 'eco' && isFlagOn('prefer-high-performance-gpu', true)) {
    app.commandLine.appendSwitch('force_high_performance_gpu');
}

// Allow Chromium background throttling for occluded/hidden background tabs (mainWindow stays unthrottled)

// Unlocked Framerate for synthetic WebGL/Canvas benchmarks (xbitlabs, testufo)
if (isFlagOn('unlock-frame-rate', false)) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
}

// Ignore GPU Blocklist for legacy or unclassified drivers
if (isFlagOn('ignore-gpu-blocklist', false)) {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
}

// Experimental Web Platform features
if (isFlagOn('experimental-web-platform', false)) {
    app.commandLine.appendSwitch('enable-experimental-web-platform-features');
}

process.on('unhandledRejection', (reason) => {
    const isAborted = reason && (
        reason.errno === -3 || 
        reason.code === 'ERR_ABORTED' || 
        String(reason?.message || reason).includes('-3') || 
        String(reason?.message || reason).includes('ERR_ABORTED')
    );
    if (isAborted) return;
    console.warn('[Unhandled Promise Rejection]:', reason);
});

// GPU Crash Resilience Monitor
app.on('child-process-gone', (event, details) => {
    if (details.type === 'GPU') {
        console.warn(`[GPU Engine] GPU process reset detected (${details.reason}, code: ${details.exitCode}). Seamless hardware acceleration remains active.`);
    }
});

// Settings & Vault setup
let settingsStore = {};
const appDataPath = app.getPath('userData');
const vaultPath = path.join(appDataPath, 'vault.json');
const settingsPath = path.join(appDataPath, 'settings.json');
const permissionManager = new PermissionManager({
    userDataPath: appDataPath,
    onChange: ({ origin, partition, isEphemeral }) => {
        const payload = { origin, partition, isEphemeral };
        try {
            if (typeof browserWindows !== 'undefined' && browserWindows) {
                for (const win of browserWindows) {
                    if (win && !win.isDestroyed()) {
                        try { win.webContents.send('qbrowse-site-permissions-changed', payload); } catch (_) {}
                    }
                }
            }
            if (typeof mainWindow !== 'undefined' && mainWindow && !mainWindow.isDestroyed() && (!browserWindows || !browserWindows.has(mainWindow))) {
                try { mainWindow.webContents.send('qbrowse-site-permissions-changed', payload); } catch (_) {}
            }
        } catch (_) {}
    }
});
try {
    if (fsSync.existsSync(settingsPath)) {
        settingsStore = JSON.parse(fsSync.readFileSync(settingsPath, 'utf8')) || {};
    }
} catch (_) {}
livePasskeyState.passkeyProviderMode = settingsStore.passkeyProviderMode === 'hardware' ? 'hardware' : 'qvault';
livePasskeyState.passkeyHardwareFallback = settingsStore.passkeyHardwareFallback !== false;
livePasskeyState.vaultProvider = normalizeVaultProvider(settingsStore.vaultProvider);
if (settingsStore.hardware === false) {
    try { app.disableHardwareAcceleration(); } catch (_) {}
}
if (settingsStore.isolation === true) {
    try { app.commandLine.appendSwitch('site-per-process'); } catch (_) {}
}
let masterKey = null;
let activeMasterPassword = null;

// Ensure vault exists and is initialized
async function ensureVault() {
    try {
        await fs.access(vaultPath);
    } catch {
        await fs.writeFile(vaultPath, JSON.stringify({ canary: null, vaultSalt: null, passwords: [] }, null, 2));
    }
}

function readVaultSync() {
    try {
        if (fsSync.existsSync(vaultPath)) {
            const data = fsSync.readFileSync(vaultPath, 'utf8');
            const parsed = JSON.parse(data);
            if (!parsed.passwords || !Array.isArray(parsed.passwords)) {
                parsed.passwords = [];
            }
            // Support legacy testEncryption as canary
            if (!parsed.canary && parsed.testEncryption) {
                parsed.canary = parsed.testEncryption;
            }
            return parsed;
        }
    } catch (e) {
        console.error('[Vault] Error reading vault.json:', e);
    }
    return { canary: null, vaultSalt: null, passwords: [] };
}

function writeVaultSync(vault) {
    try {
        fsSync.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[Vault] Error writing vault.json:', e);
        return false;
    }
}

function deriveKey(password, saltHex) {
    if (!password) return null;
    if (saltHex) {
        try {
            const salt = Buffer.isBuffer(saltHex) ? saltHex : Buffer.from(saltHex, 'hex');
            return crypto.scryptSync(password, salt, 32);
        } catch (e) {
            console.warn('[Vault] deriveKey with saltHex failed:', e.message);
        }
    }
    return deriveLegacyKey(password);
}

function deriveLegacyKey(password) {
    if (!password) return null;
    return crypto.scryptSync(password, 'QBrowseSalt', 32);
}

function deriveLegacyKey2026(password) {
    if (!password) return null;
    return crypto.scryptSync(password, 'QBrowseSecureSalt2026', 32);
}

function isEncryptedPayload(str) {
    return typeof str === 'string' && /^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(str.trim());
}

function encrypt(text, key) {
    if (text === null || text === undefined) text = '';
    text = String(text);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function safeDecrypt(ciphertext, key) {
    if (!ciphertext || !key || !isEncryptedPayload(ciphertext)) return null;
    try {
        const parts = ciphertext.trim().split(':');
        if (parts.length !== 3) return null;
        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return null;
    }
}

function decrypt(text, key) {
    const res = safeDecrypt(text, key);
    if (res === null) {
        throw new Error('Decryption failed');
    }
    return res;
}

function extractVaultItemMeta(rawTitle, item = {}) {
    if (rawTitle && typeof rawTitle === 'object') {
        item = rawTitle;
        rawTitle = item.title || '';
    }
    const baseItem = item && typeof item === 'object' ? item : {};
    if (typeof rawTitle !== 'string' && (!item || typeof item !== 'object')) {
        return {
            cleanTitle: '',
            itemType: 'login',
            type: 'login',
            passkeyData: null,
            cardData: null,
            addressData: null,
            notes: '',
            totpSecret: null
        };
    }

    let cleanTitle = typeof rawTitle === 'string' ? rawTitle : (baseItem.title || '');
    let meta = {
        itemType: baseItem.itemType || 'login',
        type: baseItem.itemType || 'login',
        passkeyData: baseItem.passkeyData || null,
        notes: baseItem.notes || '',
        cardData: baseItem.cardData || null,
        addressData: baseItem.addressData || null,
        totpSecret: baseItem.totpSecret || null
    };

    if (cleanTitle.includes('|||')) {
        const parts = cleanTitle.split('|||');
        cleanTitle = parts[0];
        try {
            const parsed = JSON.parse(parts[1]);
            meta = {
                itemType: parsed.type || parsed.itemType || meta.itemType,
                type: parsed.type || parsed.itemType || meta.itemType,
                notes: parsed.notes || meta.notes || '',
                passkeyData: parsed.passkeyData || meta.passkeyData,
                cardData: parsed.cardData || meta.cardData,
                addressData: parsed.addressData || meta.addressData,
                totpSecret: parsed.totpSecret || baseItem.totpSecret || null
            };
        } catch (e) {}
    }

    return {
        cleanTitle,
        itemType: meta.itemType,
        type: meta.itemType,
        passkeyData: meta.passkeyData,
        cardData: meta.cardData,
        addressData: meta.addressData,
        notes: meta.notes,
        totpSecret: meta.totpSecret || null
    };
}

function healAndDecryptVaultItems(vault, primaryKey, candidatePasswords = []) {
    if (!vault) return [];
    if (!Array.isArray(vault.passwords)) {
        vault.passwords = [];
        return [];
    }
    if (!primaryKey) return [];

    let vaultModified = false;

    // Build unique candidate keys for self-healing
    const candidateKeys = [];
    const seenKeyHexes = new Set();
    const addCandidateKey = (k) => {
        if (k && Buffer.isBuffer(k)) {
            const hex = k.toString('hex');
            if (!seenKeyHexes.has(hex)) {
                seenKeyHexes.add(hex);
                candidateKeys.push(k);
            }
        }
    };

    // 1. Primary key first
    addCandidateKey(primaryKey);

    // 2. Candidate passwords with current salt and legacy salts
    const allCandidatePasswords = [...candidatePasswords];
    if (activeMasterPassword && !allCandidatePasswords.includes(activeMasterPassword)) {
        allCandidatePasswords.push(activeMasterPassword);
    }
    for (const pw of allCandidatePasswords) {
        if (typeof pw === 'string' && pw.length > 0) {
            if (vault.vaultSalt) {
                addCandidateKey(deriveKey(pw, vault.vaultSalt));
            }
            addCandidateKey(deriveLegacyKey(pw));
            addCandidateKey(deriveLegacyKey2026(pw));
        }
    }

    // 3. Fallback default and Windows Hello keys
    addCandidateKey(deriveLegacyKey('QBrowseDefaultVaultKey'));
    addCandidateKey(deriveLegacyKey2026('QBrowseDefaultVaultKey'));
    addCandidateKey(deriveLegacyKey('QBrowseWindowsHelloVaultKey'));
    addCandidateKey(deriveLegacyKey2026('QBrowseWindowsHelloVaultKey'));

    const decryptedResults = [];

    for (const p of vault.passwords) {
        if (!p || typeof p !== 'object') continue;

        const meta = extractVaultItemMeta(p.title, p);

        let rawDecryptedPassword = null;
        let needsReencrypt = false;

        const rawPasswordProp = p.password;

        if (rawPasswordProp === null || rawPasswordProp === undefined || rawPasswordProp === '') {
            rawDecryptedPassword = '';
        } else if (!isEncryptedPayload(rawPasswordProp)) {
            // Raw unencrypted string was stored directly
            rawDecryptedPassword = String(rawPasswordProp);
            needsReencrypt = true;
        } else {
            // It is an encrypted payload: try primaryKey first
            const decPrimary = safeDecrypt(rawPasswordProp, primaryKey);
            if (decPrimary !== null) {
                rawDecryptedPassword = decPrimary;
            } else {
                // Try fallback candidate keys
                for (const fallbackKey of candidateKeys) {
                    if (fallbackKey.equals(primaryKey)) continue;
                    const decFallback = safeDecrypt(rawPasswordProp, fallbackKey);
                    if (decFallback !== null) {
                        rawDecryptedPassword = decFallback;
                        needsReencrypt = true;
                        break;
                    }
                }
            }
        }

        // Repair parameter swap bug from electronIPC.updatePassword
        // In the bug:
        // p.username got url (e.g. 'https://...')
        // p.url got plaintext password
        // p.password got encrypted username
        if (rawDecryptedPassword !== null) {
            const userStr = typeof p.username === 'string' ? p.username.trim() : '';
            const urlStr = typeof p.url === 'string' ? p.url.trim() : '';
            const looksLikeUrl = /^https?:\/\//i.test(userStr);
            const urlLooksLikeUrl = /^https?:\/\//i.test(urlStr);
            const urlLooksLikeDomain = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(urlStr) && !urlStr.includes(' ');

            if (looksLikeUrl && !urlLooksLikeUrl && !urlLooksLikeDomain) {
                const repairedUrl = p.username;
                const repairedUsername = rawDecryptedPassword;
                const repairedPasswordPlaintext = p.url;

                p.url = repairedUrl;
                p.username = repairedUsername;
                rawDecryptedPassword = repairedPasswordPlaintext;
                needsReencrypt = true;
                vaultModified = true;
            }
        }

        // Re-encrypt with primaryKey if decrypted via fallback, or was unencrypted, or was repaired
        if (rawDecryptedPassword !== null && needsReencrypt) {
            p.password = encrypt(rawDecryptedPassword, primaryKey);
            vaultModified = true;
        }

        if (rawDecryptedPassword === null) {
            // Undecryptable item: NEVER return raw ciphertext to renderer
            decryptedResults.push({
                ...p,
                title: meta.cleanTitle,
                rawTitle: p.title,
                itemType: meta.itemType || (meta.passkeyData ? 'passkey' : 'login'),
                passkeyData: meta.passkeyData,
                cardData: meta.cardData,
                addressData: meta.addressData,
                notes: meta.notes || '',
                totpSecret: meta.totpSecret,
                password: '',
                decryptionFailed: true
            });
        } else {
            decryptedResults.push({
                ...p,
                title: meta.cleanTitle,
                rawTitle: p.title,
                itemType: meta.itemType || (meta.passkeyData ? 'passkey' : 'login'),
                passkeyData: meta.passkeyData,
                cardData: meta.cardData,
                addressData: meta.addressData,
                notes: meta.notes || '',
                totpSecret: meta.totpSecret,
                password: rawDecryptedPassword
            });
        }
    }

    if (vaultModified) {
        writeVaultSync(vault);
    }

    return decryptedResults;
}

const browserWindows = new Set();
const windowAnimationState = new WeakMap();
const normalBoundsMap = new WeakMap();

let _cachedWindowsReducedMotion = false;
let _lastWindowsReducedMotionCheck = 0;

function checkWindowsReducedMotion() {
    try {
        if (nativeTheme && typeof nativeTheme.prefersReducedMotion === 'boolean') {
            return nativeTheme.prefersReducedMotion;
        }
    } catch (_) {}

    if (process.platform === 'win32') {
        try {
            const val = Boolean(rustBridge.sysIsReducedMotionEnabled());
            _cachedWindowsReducedMotion = val;
            return val;
        } catch (_) {
            return _cachedWindowsReducedMotion;
        }
    }

    return false;
}

function getAnimationConfig() {
    try {
        if (checkWindowsReducedMotion() || settingsStore?.a11yReducedMotion) {
            return { enabled: false, duration: 0, interval: 16 };
        }
        const isOnBattery = powerMonitor?.isOnBatteryPower ? powerMonitor.isOnBatteryPower() : false;
        const profile = performanceEngine.detectHardwareProfile(null, isOnBattery);
        if (profile.reduceVisuals) {
            return { enabled: false, duration: 0, interval: 16 };
        } else if (profile.activeTier === 'ultra') {
            return { enabled: true, duration: 190, interval: 4 }; // ~250Hz ultra high refresh
        } else {
            return { enabled: true, duration: 180, interval: 6 }; // ~165Hz balanced
        }
    } catch (_) {
        return { enabled: false, duration: 0, interval: 16 };
    }
}

function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function easeInCubic(x) {
    return x * x * x;
}

function animateBounds(window, startBounds, targetBounds, duration = 180, interval = 5, easing = 'easeOut') {
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        const existing = windowAnimationState.get(window);
        if (existing && existing.timer) {
            clearInterval(existing.timer);
        }

        const timer = setInterval(() => {
            if (!window || window.isDestroyed()) {
                clearInterval(timer);
                windowAnimationState.delete(window);
                return resolve();
            }

            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const ease = easing === 'easeIn' ? easeInCubic(progress) : easeOutCubic(progress);

            const current = {
                x: Math.round(startBounds.x + (targetBounds.x - startBounds.x) * ease),
                y: Math.round(startBounds.y + (targetBounds.y - startBounds.y) * ease),
                width: Math.round(startBounds.width + (targetBounds.width - startBounds.width) * ease),
                height: Math.round(startBounds.height + (targetBounds.height - startBounds.height) * ease)
            };

            try {
                window.setBounds(current);
            } catch (_) {}

            if (progress >= 1) {
                clearInterval(timer);
                windowAnimationState.delete(window);
                resolve();
            }
        }, interval);

        windowAnimationState.set(window, { timer });
    });
}

let isSmoothMaximizing = false;

async function toggleMaximizeSmooth(win) {
    if (!win || win.isDestroyed() || isSmoothMaximizing) return;
    const config = getAnimationConfig();
    if (!config.enabled) {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
        return;
    }
    if (windowAnimationState.has(win)) return;

    isSmoothMaximizing = true;
    try {
        const currentScreen = screen.getDisplayMatching(win.getBounds());
        const workArea = currentScreen.workArea;

        if (win.isMaximized()) {
            const rawBounds = normalBoundsMap.get(win) || {
                width: 1580,
                height: 1000,
                x: Math.max(0, Math.round(workArea.x + (workArea.width - 1580) / 2)),
                y: Math.max(0, Math.round(workArea.y + (workArea.height - 1000) / 2))
            };
            const clampedWidth = Math.min(workArea.width, rawBounds.width);
            const clampedHeight = Math.min(workArea.height, rawBounds.height);
            const restoreBounds = {
                width: clampedWidth,
                height: clampedHeight,
                x: Math.max(workArea.x, Math.min(rawBounds.x, workArea.x + workArea.width - clampedWidth)),
                y: Math.max(workArea.y, Math.min(rawBounds.y, workArea.y + workArea.height - clampedHeight))
            };

            win.unmaximize();
            win.setBounds(workArea);
            await animateBounds(win, workArea, restoreBounds, config.duration, config.interval, 'easeOut');
            try {
                if (!win.isDestroyed()) win.setBounds(restoreBounds);
            } catch (_) {}
        } else {
            const currentBounds = win.getBounds();
            normalBoundsMap.set(win, currentBounds);

            await animateBounds(win, currentBounds, workArea, config.duration, config.interval, 'easeOut');
            if (!win.isDestroyed()) {
                win.maximize();
            }
        }
    } finally {
        isSmoothMaximizing = false;
    }
}

function getWindowFocusState(targetWin, overrides = {}) {
  if (!targetWin || targetWin.isDestroyed()) {
    return { isFocused: false, isMinimized: false, isVisible: false };
  }
  const isMinimized = typeof overrides.isMinimized === 'boolean'
    ? overrides.isMinimized
    : Boolean(targetWin.isMinimized());
  const rawVisible = typeof overrides.isVisible === 'boolean'
    ? overrides.isVisible
    : Boolean(targetWin.isVisible());
  const isVisible = rawVisible && !isMinimized;
  const rawFocused = typeof overrides.isFocused === 'boolean'
    ? overrides.isFocused
    : Boolean(targetWin.isFocused());
  const isFocused = rawFocused && isVisible;
  return { isFocused, isMinimized, isVisible };
}

function emitWindowFocusState(targetWin, overrides = {}) {
  if (!targetWin || targetWin.isDestroyed()) return;
  try {
    targetWin.webContents.send('window-focus-state-changed', getWindowFocusState(targetWin, overrides));
  } catch (_) {}
}

function createWindow(options = {}) {
  ensureVault();

  const winConfig = {
    title: 'QBrowse',
    appDetails: {
      appId: 'com.qbrowse.app'
    },
    width: options.width || 1580,
    height: options.height || 1000,
    minWidth: 480,
    minHeight: 400,
    show: false,
    backgroundColor: '#0a0a0c',
    icon: resolveAppIconPath(),
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      webviewTag: true, // Enable <webview>
      contextIsolation: true,
      nodeIntegration: false,
      disableHtmlFullscreenWindowResize: true
    }
  };

  if (typeof options.x === 'number' && typeof options.y === 'number') {
    winConfig.x = Math.max(0, options.x);
    winConfig.y = Math.max(0, options.y);
  }

  const win = new BrowserWindow(winConfig);

  browserWindows.add(win);
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = win;
  }

  win.on('focus', () => {
    _cachedDefaultBrowserStatus = null;
    _cachedDefaultBrowserTimestamp = 0;
    try {
      const isReduced = checkWindowsReducedMotion();
      win.webContents.send('system-reduced-motion-changed', isReduced);
    } catch (_) {}
    emitWindowFocusState(win, { isFocused: true, isMinimized: false, isVisible: true });
  });

  win.on('blur', () => {
    emitWindowFocusState(win, { isFocused: false });
  });

  win.on('minimize', () => {
    emitWindowFocusState(win, { isFocused: false, isMinimized: true, isVisible: false });
  });

  win.on('hide', () => {
    emitWindowFocusState(win, { isFocused: false, isVisible: false });
  });

  win.on('show', () => {
    emitWindowFocusState(win, { isVisible: true });
  });

  win.webContents.on('did-finish-load', () => {
    emitWindowFocusState(win);
  });

  win.webContents.on('console-message', (event) => {
    const level = event?.level ?? 0;
    const message = event?.message ?? '';
    if (typeof message !== 'string') return;
    if (message.startsWith('[WebView') || message.includes('CONSOLE:')) return;
    if (level >= 3 || message.includes('App Crashed')) {
      console.log(`[Renderer] ${message}`);
    }
  });

  win.on('closed', () => {
    browserWindows.delete(win);
    if (mainWindow === win) {
      mainWindow = browserWindows.values().next().value || null;
    }
  });

  win.once('ready-to-show', () => {
    applyWindowCornerPreference(win, currentWindowCornerPreference);
  });
  win.on('unmaximize', () => {
    applyWindowCornerPreference(win, currentWindowCornerPreference);
  });
  win.on('restore', () => {
    applyWindowCornerPreference(win, currentWindowCornerPreference);
    emitWindowFocusState(win, { isMinimized: false });
  });

  const queryParams = {};
  if (options.space) queryParams.space = options.space;
  if (options.profileId) queryParams.profileId = options.profileId;
  if (options.initialTab) queryParams.initialTab = encodeURIComponent(JSON.stringify(options.initialTab));
  const searchStr = new URLSearchParams(queryParams).toString();
  const query = searchStr ? `?${searchStr}` : '';
  if (isDev) {
    win.loadURL(`http://localhost:1420/${query}`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), { query: queryParams });
  }

  // Security: Protect top-level main window against navigating away from local app shell
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const isAppOrigin = isDev
      ? navigationUrl.startsWith('http://localhost:1420')
      : (navigationUrl.startsWith('file://') && navigationUrl.includes('dist/index.html'));

    if (!isAppOrigin) {
      event.preventDefault();
      console.warn('[Security] Prevented top-level mainWindow navigation to:', navigationUrl);
      if (navigationUrl && navigationUrl !== 'about:blank') {
        win.webContents.send('open-new-tab-url', { url: navigationUrl, disposition: 'default' });
      }
    }
  });

  win.once('ready-to-show', () => {
    normalBoundsMap.set(win, win.getBounds());
    win.show();
    if (initialUrlToOpen) {
      setTimeout(() => {
        if (win && !win.isDestroyed() && initialUrlToOpen) {
          win.webContents.send('open-new-tab-url', { url: initialUrlToOpen, disposition: 'default' });
          initialUrlToOpen = null;
        }
      }, 1200);
    }
  });

  win.on('resize', () => {
    if (!win.isMaximized() && !win.isFullScreen() && !win.isMinimized() && !windowAnimationState.has(win)) {
      normalBoundsMap.set(win, win.getBounds());
    }
  });
  win.on('move', () => {
    if (!win.isMaximized() && !win.isFullScreen() && !win.isMinimized() && !windowAnimationState.has(win)) {
      normalBoundsMap.set(win, win.getBounds());
    }
  });

  win.on('enter-full-screen', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('window-fullscreen-changed', true);
    }
  });

  win.on('leave-full-screen', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('window-fullscreen-changed', false);
    }
  });

  win.on('app-command', (e, cmd) => {
      if (cmd === 'browser-backward') {
          e.preventDefault();
          if (win && !win.isDestroyed()) {
              win.webContents.send('global-navigate-back');
          }
      } else if (cmd === 'browser-forward') {
          e.preventDefault();
          if (win && !win.isDestroyed()) {
              win.webContents.send('global-navigate-forward');
          }
      }
  });

  return win;
}

  const INSECURE_HOST_TTL_MS = 30 * 60 * 1000;
  const bypassedInsecureHosts = new Map();

  function isInsecureHostBypassed(host) {
      if (!host) return false;
      const now = Date.now();
      for (const key of [host, host.replace(/^www\./, '')]) {
          const expiresAt = bypassedInsecureHosts.get(key);
          if (expiresAt !== undefined) {
              if (expiresAt > now) return true;
              bypassedInsecureHosts.delete(key);
          }
      }
      return false;
  }

  ipcMain.handle('allow-insecure-host', (event, hostname) => {
      assertTrustedAppShell(event, 'allow-insecure-host');
      if (hostname && typeof hostname === 'string') {
          const clean = hostname.toLowerCase().trim();
          const expiresAt = Date.now() + INSECURE_HOST_TTL_MS;
          bypassedInsecureHosts.set(clean, expiresAt);
          bypassedInsecureHosts.set(clean.replace(/^www\./, ''), expiresAt);
          bypassedInsecureHosts.set('www.' + clean.replace(/^www\./, ''), expiresAt);
      }
      return true;
  });

  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      try {
          if (webContents?.session === session.fromPartition('tor')) {
              return callback(false);
          }
          const parsed = new URL(url);
          const host = parsed.hostname.toLowerCase();
          if (isInsecureHostBypassed(host)) {
              event.preventDefault();
              return callback(true);
          }
      } catch (_) {}
      callback(false);
  });

  function applyAdblockerToSession(sess) {
      adblockEngine.applyToSession(sess, settingsStore, bypassedInsecureHosts);
  }

    ipcMain.on('debug-terminal-log', (event, message, data) => {
    const timestamp = new Date().toLocaleTimeString();
    if (data !== undefined) {
        debugLog(`\x1b[36m[QBrowse Terminal ${timestamp}]\x1b[0m ${message}`, data);
    } else {
        debugLog(`\x1b[36m[QBrowse Terminal ${timestamp}]\x1b[0m ${message}`);
    }
});

    app.on('web-contents-created', (event, contents) => {
        contents.setMaxListeners(0);

        // Safety net: ensure every webview/partition session always has permission, adblock & download handlers attached
        if (contents.session) {
            try { setupWebviewSession(contents.session); } catch (_) {}
        }

        // Guarantee webviews have a backing canvas color matching current color scheme to avoid stark white bleed on dark pages
        if (contents.getType() === 'webview') {
            try {
                contents.setBackgroundColor(getEffectiveColorScheme() === 'dark' ? '#121212' : '#ffffff');
                contents.setVisualZoomLevelLimits(1, 5).catch(() => {});
            } catch (_) {}
            contents.on('did-finish-load', () => {
                try {
                    contents.setVisualZoomLevelLimits(1, 5).catch(() => {});
                } catch (_) {}
            });
        } else {
            contents.on('did-finish-load', () => {
                try {
                    const ownerWin = BrowserWindow.fromWebContents(contents);
                    if (ownerWin && browserWindows.has(ownerWin)) {
                        contents.setVisualZoomLevelLimits(1, 1).catch(() => {});
                    }
                } catch (_) {}
            });
        }

        // Security: Strictly enforce sandbox and process isolation on any attached <webview>
        contents.on('will-attach-webview', (attachEvent, webPreferences, params) => {
            const rawSrc = typeof params?.src === 'string' ? params.src.trim().toLowerCase() : '';
            if (
                rawSrc.startsWith('javascript:') ||
                rawSrc.startsWith('vbscript:') ||
                rawSrc.startsWith('qbrowse-local:') ||
                rawSrc.startsWith('qbrowse-thumb:')
            ) {
                attachEvent.preventDefault();
                return;
            }

            // Guarantee our approved preload script is used
            webPreferences.preload = path.join(__dirname, 'webview_preload.cjs');

            // Strictly disable Node.js integration and enforce context isolation
            webPreferences.nodeIntegration = false;
            webPreferences.nodeIntegrationInSubFrames = false;
            webPreferences.contextIsolation = true;
            webPreferences.webSecurity = true;
            webPreferences.allowRunningInsecureContent = false;
            webPreferences.enableRemoteModule = false;
            if (perfMode !== 'eco') {
                webPreferences.backgroundThrottling = false;
            }
        });
        
        const getTargetWindow = () => {
            if (contents.hostWebContents) {
                const hostWin = BrowserWindow.fromWebContents(contents.hostWebContents);
                if (hostWin && !hostWin.isDestroyed() && !activeOAuthWindows.has(hostWin)) return hostWin;
            }
            const selfWin = BrowserWindow.fromWebContents(contents);
            if (selfWin && !selfWin.isDestroyed() && !activeOAuthWindows.has(selfWin)) {
                return selfWin;
            }
            const focusedWin = BrowserWindow.getFocusedWindow();
            if (focusedWin && !focusedWin.isDestroyed() && !activeOAuthWindows.has(focusedWin)) {
                return focusedWin;
            }
            if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
            return Array.from(browserWindows).find(w => w && !w.isDestroyed()) || null;
        };

        const STANDALONE_IDP_POPUP_HOSTS = [
            'accounts.google.',
            'appleid.apple.com',
            'login.microsoftonline.com',
            'login.live.com',
            'auth0.com',
            'accounts.spotify.com',
            'checkout.stripe.com'
        ];

        const isLibrusDomain = (targetUrl) => {
            if (!targetUrl || typeof targetUrl !== 'string') return false;
            try {
                const host = new URL(targetUrl).hostname.toLowerCase();
                return host === 'librus.pl' || host.endsWith('.librus.pl');
            } catch (_) {
                return false;
            }
        };

        const isLikelyAuthOrOAuthPopupUrl = (rawUrl, frameName = '') => {
            if (!rawUrl || typeof rawUrl !== 'string') return false;
            const trimmedFrame = typeof frameName === 'string' ? frameName.trim() : '';
            const hasNamedPopupFrame = Boolean(trimmedFrame && !/^_(blank|self|parent|top)$/i.test(trimmedFrame));

            if (rawUrl === 'about:blank') {
                return hasNamedPopupFrame && /(auth|oauth|gsi|google|login|signin|popup|credential)/i.test(trimmedFrame);
            }

            // Never treat Librus portal/synergia/api/konto navigations as detached OAuth popups
            if (isLibrusDomain(rawUrl)) {
                return false;
            }

            let host = '';
            let pathAndSearch = '';
            const lower = rawUrl.toLowerCase();
            try {
                const parsed = new URL(rawUrl);
                host = parsed.hostname.toLowerCase();
                pathAndSearch = (parsed.pathname + parsed.search).toLowerCase();
            } catch (_) {
                pathAndSearch = lower;
            }

            const isKnownIdpPopup = (
                STANDALONE_IDP_POPUP_HOSTS.some((idp) => host === idp || host.endsWith('.' + idp) || host.startsWith(idp)) ||
                (host.endsWith('github.com') && pathAndSearch.includes('/login/oauth')) ||
                (host.endsWith('discord.com') && pathAndSearch.includes('/oauth2')) ||
                (host.endsWith('facebook.com') && (/\/v\d+(\.\d+)?\/dialog\/oauth/.test(pathAndSearch) || pathAndSearch.includes('/dialog/oauth'))) ||
                ((host.endsWith('twitter.com') || host.endsWith('x.com')) && (pathAndSearch.includes('/oauth') || pathAndSearch.includes('/i/oauth2'))) ||
                (host.endsWith('firebaseapp.com') && pathAndSearch.includes('/__/auth')) ||
                (host.endsWith('supabase.co') && pathAndSearch.includes('/auth')) ||
                (host.endsWith('paypal.com') && pathAndSearch.includes('/checkoutnow')) ||
                (host === 'id.twitch.tv' && pathAndSearch.includes('/oauth2')) ||
                (host.endsWith('linkedin.com') && pathAndSearch.includes('/oauth')) ||
                (host.endsWith('slack.com') && pathAndSearch.includes('/oauth')) ||
                host.startsWith('clerk.')
            );

            if (isKnownIdpPopup) return true;

            // Only treat generic /oauth, /authorize, or client_id= URLs as popup candidates when explicitly given a named popup frame
            if (hasNamedPopupFrame && (
                pathAndSearch.includes('/oauth') ||
                pathAndSearch.includes('/authorize') ||
                pathAndSearch.includes('client_id=')
            )) {
                return true;
            }

            return false;
        };

        // Handle window.open: Distinguish genuine OAuth/Auth popups from normal website link navigations
        contents.setWindowOpenHandler(({ url, frameName, disposition, features }) => {
            debugLog('\x1b[33m[QBrowse Main] window.open intercepted:\x1b[0m', {
                url: url || '(blank/script)',
                frameName: frameName || '(none)',
                disposition,
                features: features || '(none)'
            });

            // Detect external app protocol links (e.g. slack://, zoommtg://, discord://, spotify://)
            if (isAppProtocolUrl(url)) {
                debugLog('[Electron Main] setWindowOpenHandler launching app protocol:', url);
                shell.openExternal(url).catch(e => console.warn('[Main] shell.openExternal failed:', e.message));
                notifyAppProtocolLaunched(url);
                return { action: 'deny' };
            }

            const featLower = (features || '').toLowerCase();
            const hasNoOpener = featLower.includes('noopener') || featLower.includes('noreferrer');
            const hasPopupFeatures = typeof features === 'string' && /\b(width|height|popup)\s*=/i.test(features);
            const isExplicitPopupDisposition = disposition === 'new-window' || disposition === 'new-popup' || hasPopupFeatures;
            const isTabDisposition = (disposition === 'foreground-tab' || disposition === 'background-tab') && !hasPopupFeatures;

            const routeToNewTab = () => {
                if (url && url !== 'about:blank') {
                    const targetWin = getTargetWindow();
                    if (targetWin && !targetWin.isDestroyed()) {
                        targetWin.webContents.send('open-new-tab-url', { url, disposition, openerWebContentsId: contents.id });
                    }
                }
                return { action: 'deny' };
            };

            // Tab dispositions (and noopener/noreferrer links) without explicit popup features ALWAYS open in a QBrowse tab
            if (isTabDisposition || hasNoOpener) {
                return routeToNewTab();
            }

            // Never hijack Librus navigations into a detached popup unless explicitly opened as a sized popup window
            if (isLibrusDomain(url) && !((disposition === 'new-window' || disposition === 'new-popup') && hasPopupFeatures)) {
                return routeToNewTab();
            }

            const isAuthPopup = isLikelyAuthOrOAuthPopupUrl(url, frameName);

            // Only open a separate child popup window for explicit popup intents (explicit popup features or known auth/OAuth popup flows)
            const shouldOpenAsPopupWindow = isExplicitPopupDisposition && (hasPopupFeatures || isAuthPopup);

            if (shouldOpenAsPopupWindow) {
                let popupWidth = 800;
                let popupHeight = 760;
                if (features) {
                    const wMatch = features.match(/(?:^|,|\s)width=(\d+)/i);
                    const hMatch = features.match(/(?:^|,|\s)height=(\d+)/i);
                    if (wMatch && wMatch[1]) {
                        const parsedW = parseInt(wMatch[1], 10);
                        if (parsedW >= 320 && parsedW <= 1600) popupWidth = parsedW;
                    }
                    if (hMatch && hMatch[1]) {
                        const parsedH = parseInt(hMatch[1], 10);
                        if (parsedH >= 400 && parsedH <= 1400) popupHeight = parsedH;
                    }
                }
                debugLog('\x1b[32m[QBrowse Main] Allowing popup window for:\x1b[0m', {
                    url: url || '(blank/script)',
                    dimensions: `${popupWidth}x${popupHeight}`,
                    frameName: frameName || '(none)'
                });
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        icon: resolveAppIconPath(),
                        width: popupWidth,
                        height: popupHeight,
                        minWidth: 420,
                        minHeight: 520,
                        frame: false,
                        titleBarStyle: 'hidden',
                        titleBarOverlay: false,
                        show: true,
                        roundedCorners: true,
                        hasShadow: true,
                        autoHideMenuBar: true,
                        backgroundColor: '#121214',
                        userAgent: CHROME_USER_AGENT,
                        webPreferences: {
                            preload: path.join(__dirname, 'webview_preload.cjs'),
                            session: contents.session, // CRITICAL: share session with the caller webview for cookies & auth state
                            contextIsolation: true,
                            nodeIntegration: false,
                            additionalArguments: ['--is-oauth-popup']
                        }
                    }
                };
            }

            // Normal browsing links (e.g. target="_blank" or general window.open) -> Route to a new tab in the caller's QBrowse window
            return routeToNewTab();
        });

        // Handle child windows created via window.open (e.g. OAuth popup windows)
        contents.on('did-create-window', (childWindow, details) => {
            if (!childWindow || childWindow.isDestroyed()) return;
            debugLog('\x1b[32m[QBrowse Main] Child OAuth Popup Window Created:\x1b[0m', {
                windowId: childWindow.id,
                url: details?.url || '(empty)'
            });
            try {
                childWindow.setMenuBarVisibility(false);
            } catch (_) {}
            childWindow.once('ready-to-show', () => {
                if (!childWindow.isDestroyed()) {
                    childWindow.show();
                    childWindow.focus();
                }
            });
            setTimeout(() => {
                if (childWindow && !childWindow.isDestroyed()) {
                    childWindow.show();
                    childWindow.focus();
                    childWindow.moveTop();
                }
            }, 60);

            childWindow.webContents.setUserAgent(cleanChromeUA);

            activeOAuthWindows.add(childWindow);
            childWindow.on('closed', () => activeOAuthWindows.delete(childWindow));

            // Force sleek, transparent-track scrollbar at the engine level for child OAuth windows
            const injectChildScrollbar = () => {
                if (!childWindow || childWindow.isDestroyed()) return;
                try {
                    childWindow.webContents.insertCSS(`
                        body {
                            padding-top: 54px !important;
                            box-sizing: border-box !important;
                        }
                        html {
                            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14) !important;
                            border-radius: 12px !important;
                        }
                        ::-webkit-scrollbar {
                            width: 6px !important;
                            height: 6px !important;
                        }
                        ::-webkit-scrollbar-track {
                            background: transparent !important;
                        }
                        ::-webkit-scrollbar-thumb {
                            background: rgba(120, 120, 130, 0.45) !important;
                            border-radius: 9999px !important;
                        }
                        ::-webkit-scrollbar-thumb:hover {
                            background: rgba(120, 120, 130, 0.75) !important;
                        }
                        ::-webkit-scrollbar-corner {
                            background: transparent !important;
                        }
                    `, { cssOrigin: 'user' });
                } catch (_) {}
            };

            const onChildReady = () => {
                if (!childWindow || childWindow.isDestroyed()) return;
                injectChildScrollbar();
                injectOAuthSmartDarkCSS(childWindow);
                syncOAuthWindowSmartDark(childWindow);
                try {
                    childWindow.webContents.send('init-oauth-popup-mode');
                } catch (_) {}
            };

            childWindow.webContents.on('dom-ready', onChildReady);
            childWindow.webContents.on('did-finish-load', onChildReady);
            childWindow.webContents.on('did-navigate', onChildReady);
            childWindow.webContents.on('did-navigate-in-page', onChildReady);

            // Native right-click context menu for OAuth popup window (Cut/Copy/Paste/Zoom/Navigation)
            childWindow.webContents.on('context-menu', (event, params) => {
                try {
                    const menu = new Menu();
                    if (params.isEditable) {
                        menu.append(new MenuItem({ label: 'Undo', role: 'undo' }));
                        menu.append(new MenuItem({ label: 'Redo', role: 'redo' }));
                        menu.append(new MenuItem({ type: 'separator' }));
                        menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
                        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
                        menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
                        menu.append(new MenuItem({ label: 'Paste and Match Style', role: 'pasteAndMatchStyle' }));
                        menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
                    } else if (params.selectionText && params.selectionText.trim().length > 0) {
                        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
                        menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
                    } else {
                        menu.append(new MenuItem({
                            label: 'Back',
                            enabled: childWindow.webContents.navigationHistory.canGoBack(),
                            click: () => childWindow.webContents.navigationHistory.goBack()
                        }));
                        menu.append(new MenuItem({
                            label: 'Forward',
                            enabled: childWindow.webContents.navigationHistory.canGoForward(),
                            click: () => childWindow.webContents.navigationHistory.goForward()
                        }));
                        menu.append(new MenuItem({
                            label: 'Reload',
                            accelerator: 'CmdOrCtrl+R',
                            click: () => childWindow.webContents.reload()
                        }));
                        menu.append(new MenuItem({ type: 'separator' }));
                        menu.append(new MenuItem({
                            label: 'Zoom In',
                            accelerator: 'CmdOrCtrl+Plus',
                            click: () => {
                                try {
                                    childWindow.webContents.send('oauth-zoom-command', 'in');
                                } catch (_) {}
                            }
                        }));
                        menu.append(new MenuItem({
                            label: 'Zoom Out',
                            accelerator: 'CmdOrCtrl+-',
                            click: () => {
                                try {
                                    childWindow.webContents.send('oauth-zoom-command', 'out');
                                } catch (_) {}
                            }
                        }));
                        menu.append(new MenuItem({
                            label: 'Actual Size',
                            accelerator: 'CmdOrCtrl+0',
                            click: () => {
                                try {
                                    childWindow.webContents.send('oauth-zoom-command', 'reset');
                                } catch (_) {}
                            }
                        }));
                    }
                    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
                        menu.append(new MenuItem({ type: 'separator' }));
                        menu.append(new MenuItem({
                            label: 'Inspect Element',
                            click: () => childWindow.webContents.inspectElement(params.x, params.y)
                        }));
                    }
                    menu.popup({ window: childWindow });
                } catch (e) {
                    console.warn('[OAuth Window ContextMenu] Error:', e);
                }
            });

            // Found-in-page handler for native search results
            childWindow.webContents.on('found-in-page', (event, result) => {
                if (childWindow && !childWindow.isDestroyed()) {
                    childWindow.webContents.send('oauth-found-in-page-result', {
                        activeMatchOrdinal: result.activeMatchOrdinal,
                        matches: result.matches,
                        finalUpdate: result.finalUpdate
                    });
                }
            });
        });

        // CRITICAL: Safely wrap executeJavaScript to prevent Ghostery and V8 from throwing fatal Unhandled Rejections during navigation!
        const originalExecute = contents.executeJavaScript;
        contents.executeJavaScript = function(code, userGesture) {
            try {
                return originalExecute.call(this, code, userGesture).catch(err => {
                    return null;
                });
            } catch (err) {
                return Promise.resolve(null);
            }
        };

        // CRITICAL: Safely wrap capturePage to prevent UnknownVizError when webviews are not compositing
        const originalCapturePage = contents.capturePage;
        if (typeof originalCapturePage === 'function') {
            contents.capturePage = function(rect) {
                try {
                    return originalCapturePage.call(this, rect).catch(() => null);
                } catch (_) {
                    return Promise.resolve(null);
                }
            };
        }

        // CRITICAL: Safely wrap loadURL to gracefully absorb ERR_ABORTED (-3), ERR_FAILED (-2), and any navigation rejections
        const originalLoadURL = contents.loadURL;
        contents.loadURL = function(url, options) {
            try {
                return originalLoadURL.call(this, url, options).catch(err => {
                    const isAborted = err && (
                        err.errno === -3 || 
                        err.code === 'ERR_ABORTED' || 
                        String(err.message || '').includes('-3') || 
                        String(err.message || '').includes('ERR_ABORTED')
                    );
                    if (!isAborted) {
                        console.warn('[Electron Main] loadURL absorbed navigation error:', err?.code || err?.message || err);
                    }
                    return Promise.resolve();
                });
            } catch (err) {
                console.warn('[Electron Main] loadURL absorbed sync error:', err?.code || err?.message || err);
                return Promise.resolve();
            }
        };

        // Prevent website beforeunload handlers from silently freezing navigation in guest webviews
        contents.on('will-prevent-unload', (event) => {
            event.preventDefault();
        });

        // Intelligent Background Throttling:
        // Throttle inactive background webviews to prevent CPU/GPU drains and battery drain,
        // but automatically unthrottle whenever media (YouTube, Spotify, etc.) starts playing.
        if (contents.getType() === 'webview') {
            contents.on('will-navigate', (event, navUrl) => {
                if (navUrl && navUrl.startsWith('qbrowse://') && !navUrl.startsWith('qbrowse://ai')) {
                    event.preventDefault();
                    return;
                }
                if (isAppProtocolUrl(navUrl)) {
                    event.preventDefault();
                    debugLog('[Electron Main] webview will-navigate launching app protocol:', navUrl);
                    shell.openExternal(navUrl).catch(e => console.warn('[Main] shell.openExternal failed:', e.message));
                    notifyAppProtocolLaunched(navUrl);
                    return;
                }
            });
            contents.on('will-redirect', (event, redirectUrl) => {
                if (isAppProtocolUrl(redirectUrl)) {
                    event.preventDefault();
                    debugLog('[Electron Main] webview will-redirect launching app protocol:', redirectUrl);
                    shell.openExternal(redirectUrl).catch(e => console.warn('[Main] shell.openExternal failed:', e.message));
                    notifyAppProtocolLaunched(redirectUrl);
                    return;
                }
            });
            contents.on('will-frame-navigate', (event) => {
                const targetUrl = event.url;
                if (isAppProtocolUrl(targetUrl)) {
                    event.preventDefault();
                    debugLog('[Electron Main] webview will-frame-navigate launching app protocol:', targetUrl);
                    shell.openExternal(targetUrl).catch(e => console.warn('[Main] shell.openExternal failed:', e.message));
                    notifyAppProtocolLaunched(targetUrl);
                    return;
                }
            });
            try {
                const effectiveScheme = getEffectiveColorScheme();
                contents.setEmulatedMedia({ colorScheme: effectiveScheme });
                contents.setBackgroundColor(effectiveScheme === 'dark' ? '#121212' : '#ffffff');
            } catch (_) {}

            // Never throttle active guest webviews on media-paused so YouTube ad -> main video transitions never stall
            contents.setBackgroundThrottling(false);
        } else {
            // Main application window stays unthrottled for UI responsiveness
            contents.setBackgroundThrottling(false);
        }

        // Apply clean Chrome User-Agent for webviews and popup windows
        if (contents.getType() === 'webview' || (contents.getType() === 'window' && contents !== mainWindow?.webContents)) {
            contents.setUserAgent(cleanChromeUA);
        }

        contents.on('render-process-gone', (event, details) => {
            console.warn(`[Electron Main] render-process-gone on webContents (${contents.id}, type: ${contents.getType()}): `, details);
        });

        // Track active webview URL and dynamically inject site-specific adblock cosmetic filters
        if (contents.getType() === 'webview') {
            const injectCosmeticsNow = (url) => {
                const targetUrl = url || contents.getURL() || latestActiveWebviewUrl;
                if (targetUrl && targetUrl !== 'about:blank') {
                    adblockEngine.injectCosmetics(contents, targetUrl, settingsStore);
                }
            };
            const resolveWebviewProfileId = () => {
                try {
                    const ses = contents.session;
                    if (!ses) return 'default';
                    if (ses === session.fromPartition('ghost') || ses === session.fromPartition('tor')) {
                        return null;
                    }
                    for (const pid of Object.keys(extensionEngine.registry || {})) {
                        if (ses === session.fromPartition(extensionEngine.getProfilePartition(pid))) {
                            return pid;
                        }
                    }
                    return 'default';
                } catch (_) {
                    return 'default';
                }
            };

            contents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
                if (isMainFrame !== false && url && url !== 'about:blank') {
                    latestActiveWebviewUrl = url;
                    const pid = resolveWebviewProfileId();
                    if (pid) {
                        extensionEngine.notifyNavigation(pid, 'did-start-navigation', {
                            tabId: contents.id,
                            url,
                            isInPlace,
                            isMainFrame
                        });
                    }
                }
            });
            contents.on('did-navigate', (event, url) => {
                if (url && url !== 'about:blank') {
                    latestActiveWebviewUrl = url;
                    injectCosmeticsNow(url);
                    const pid = resolveWebviewProfileId();
                    if (pid) {
                        extensionEngine.notifyNavigation(pid, 'did-navigate', {
                            tabId: contents.id,
                            url,
                            isMainFrame: true
                        });
                    }
                }
            });
            contents.on('did-navigate-in-page', (event, url, isMainFrame) => {
                if (isMainFrame === false) return;
                if (url && url !== 'about:blank') {
                    latestActiveWebviewUrl = url;
                    injectCosmeticsNow(url);
                    const pid = resolveWebviewProfileId();
                    if (pid) {
                        extensionEngine.notifyNavigation(pid, 'did-navigate-in-page', {
                            tabId: contents.id,
                            url,
                            isMainFrame: true
                        });
                    }
                }
            });
            contents.on('dom-ready', () => {
                injectCosmeticsNow();
                const pid = resolveWebviewProfileId();
                const url = contents.getURL() || '';
                if (pid && url && url !== 'about:blank') {
                    extensionEngine.notifyNavigation(pid, 'dom-ready', {
                        tabId: contents.id,
                        url,
                        isMainFrame: true
                    });
                }
            });
            contents.on('did-finish-load', () => {
                const pid = resolveWebviewProfileId();
                const url = contents.getURL() || '';
                if (pid && url && url !== 'about:blank') {
                    extensionEngine.notifyNavigation(pid, 'did-finish-load', {
                        tabId: contents.id,
                        url,
                        isMainFrame: true
                    });
                }
            });
        }

        contents.on('before-input-event', (event, input) => {
            const selfWin = BrowserWindow.fromWebContents(contents);
            if (selfWin && !selfWin.isDestroyed() && activeOAuthWindows.has(selfWin)) {
                if (input.type === 'keyDown') {
                    const isCmdOrCtrl = input.control || input.meta;
                    const keyLower = String(input.key || '').toLowerCase();
                    const codeRaw = String(input.code || '');

                    if (isCmdOrCtrl) {
                        if (keyLower === '+' || keyLower === '=' || keyLower === 'add' || codeRaw === 'Equal' || codeRaw === 'NumpadAdd') {
                            event.preventDefault();
                            try { selfWin.webContents.send('oauth-zoom-command', 'in'); } catch (_) {}
                            return;
                        }
                        if (keyLower === '-' || keyLower === '_' || keyLower === 'subtract' || codeRaw === 'Minus' || codeRaw === 'NumpadSubtract') {
                            event.preventDefault();
                            try { selfWin.webContents.send('oauth-zoom-command', 'out'); } catch (_) {}
                            return;
                        }
                        if (keyLower === '0' || codeRaw === 'Digit0' || codeRaw === 'Numpad0') {
                            event.preventDefault();
                            try { selfWin.webContents.send('oauth-zoom-command', 'reset'); } catch (_) {}
                            return;
                        }
                        if (keyLower === 'w') {
                            event.preventDefault();
                            try { selfWin.close(); } catch (_) {}
                            return;
                        }
                        if (keyLower === 'r') {
                            event.preventDefault();
                            try { selfWin.webContents.reload(); } catch (_) {}
                            return;
                        }
                    }
                    if (input.key === 'F5' || keyLower === 'f5') {
                        event.preventDefault();
                        try { selfWin.webContents.reload(); } catch (_) {}
                        return;
                    }
                }
                // Never forward OAuth window events to mainWindow!
                return;
            }

            const targetWin = getTargetWindow();
            if (!targetWin || targetWin.isDestroyed()) return;

            // If event originates from mainWindow itself, mainWindow's React DOM listeners handle it.
            // Skipping here prevents double-dispatching shortcuts (such as double Tab cycling).
            if (targetWin && contents === targetWin.webContents) {
                return;
            }

            if (input.type === 'keyUp') {
                const keyLower = String(input.key || '').toLowerCase();
                const codeLower = String(input.code || '').toLowerCase();
                if (keyLower === 'control' || keyLower === 'meta' || codeLower.startsWith('control') || codeLower.startsWith('meta')) {
                    try {
                        targetWin.webContents.send('global-keyup', { key: input.key, code: input.code, control: input.control, meta: input.meta });
                    } catch(e) {}
                }
                return;
            }
            if (input.type !== 'keyDown') return;

            // Shift+Escape -> Task Manager
            if (input.shift && (input.key === 'Escape' || input.key === 'escape')) {
                event.preventDefault();
                try {
                    targetWin.webContents.send('global-shortcut', { shortcut: 'shift+escape', shift: true });
                } catch(e) {}
                return;
            }

            // Alt+Left / Alt+Right -> History Navigation
            if (input.alt && (input.key === 'ArrowLeft' || input.key === 'ArrowRight')) {
                event.preventDefault();
                try {
                    targetWin.webContents.send('global-shortcut', { 
                        shortcut: input.key === 'ArrowLeft' ? 'alt+arrowleft' : 'alt+arrowright', 
                        shift: false 
                    });
                } catch(e) {}
                return;
            }

            const isCmdOrCtrl = input.control || input.meta;
            const keyRaw = String(input.key || '');
            const keyLower = keyRaw.toLowerCase();
            const codeRaw = String(input.code || '');

            // F5 Reload (F5 = Reload, Shift+F5 / Ctrl+F5 = Hard Reload)
            if (keyRaw === 'F5' || keyLower === 'f5' || codeRaw === 'F5') {
                event.preventDefault();
                try {
                    targetWin.webContents.send('global-shortcut', {
                        shortcut: 'f5',
                        shift: Boolean(input.shift || isCmdOrCtrl),
                        alt: Boolean(input.alt)
                    });
                } catch(e) {}
                return;
            }

            if (isCmdOrCtrl || keyRaw === 'F1' || keyRaw === 'F11' || keyRaw === 'F12' || keyRaw === 'Escape' || keyRaw === 'F3' || keyRaw === 'F7') {
                let shortcut = null;
                if (isCmdOrCtrl) {
                    // Normalize zoom keys by physical key code so Ctrl++/- and Ctrl+Alt++/- always overrule websites
                    if (
                        keyLower === '+' ||
                        keyLower === '=' ||
                        keyLower === 'add' ||
                        codeRaw === 'Equal' ||
                        codeRaw === 'NumpadAdd'
                    ) {
                        shortcut = 'cmd++';
                    } else if (
                        keyLower === '-' ||
                        keyLower === '_' ||
                        keyLower === 'subtract' ||
                        codeRaw === 'Minus' ||
                        codeRaw === 'NumpadSubtract'
                    ) {
                        shortcut = 'cmd+-';
                    } else if (
                        keyLower === '0' ||
                        codeRaw === 'Digit0' ||
                        codeRaw === 'Numpad0'
                    ) {
                        shortcut = 'cmd+0';
                    } else if (codeRaw === 'Backslash') {
                        shortcut = 'cmd+\\';
                    } else if (isCmdOrCtrl && input.alt && codeRaw === 'KeyF') {
                        shortcut = 'cmd+f';
                    } else if (keyLower) {
                        shortcut = `cmd+${keyLower}`;
                    }
                } else if (keyRaw === 'F1' || keyRaw === 'F11' || keyRaw === 'F12' || keyRaw === 'Escape' || keyRaw === 'F3' || keyRaw === 'F7') {
                    shortcut = keyLower;
                }

                if (shortcut) {
                    if (shortcut === 'escape') {
                        // Notify renderer so any active QBrowse overlays (modals, omnibox, popovers) are dismissed
                        try {
                            targetWin.webContents.send('global-shortcut', { shortcut: 'escape', shift: input.shift });
                        } catch(e) {}
                        // CRITICAL: Do not preventDefault or steal focus on escape!
                        return;
                    }

                    if (shortcut === 'cmd+tab') {
                        if (input.isAutoRepeat) {
                            return;
                        }
                        try {
                            targetWin.webContents.send('global-shortcut', { shortcut: 'cmd+tab', shift: input.shift });
                        } catch(e) {}
                        return;
                    }

                    // Zoom & Reload shortcuts: overrule websites WITHOUT stealing focus away from the active webview!
                    if (shortcut === 'cmd++' || shortcut === 'cmd+-' || shortcut === 'cmd+=' || shortcut === 'cmd+0' || shortcut === 'cmd+r') {
                        event.preventDefault();
                        try {
                            targetWin.webContents.send('global-shortcut', {
                                shortcut,
                                shift: Boolean(input.shift),
                                alt: Boolean(input.alt)
                            });
                        } catch(e) {}
                        return;
                    }

                    // Ctrl/Cmd+Shift+C -> Copy Current Tab URL (prevent DevTools Inspect Element hijack)
                    if (shortcut === 'cmd+c' && input.shift && !input.alt) {
                        event.preventDefault();
                        try {
                            targetWin.webContents.send('global-shortcut', {
                                shortcut: 'cmd+c',
                                shift: true,
                                alt: false
                            });
                        } catch(e) {}
                        return;
                    }

                    const overrideKeys = [
                        'cmd+w', 'cmd+t', 'cmd+k', 'cmd+1', 'cmd+2', 'cmd+3', 
                        'cmd+n', 'cmd+p', 'cmd+e', 'cmd+b', 'cmd+j', 'cmd+f', 'cmd+h', 
                        'cmd+l', 'cmd+y', 'cmd+\\', 'cmd+|', 'cmd+d', 'cmd+[', 'cmd+]',
                        'cmd+s', 'cmd+m', 'cmd+,', 'f1', 'f11', 'f12', 'f3', 'f7'
                    ];

                    if (overrideKeys.includes(shortcut)) {
                        event.preventDefault();
                        targetWin.focus();
                        targetWin.webContents.focus();
                        setTimeout(() => {
                            if (!targetWin || targetWin.isDestroyed()) return;
                            try {
                                targetWin.webContents.send('global-shortcut', { shortcut, shift: input.shift, alt: input.alt });
                            } catch(e) {}
                        }, 10);
                    }
                }
            }
        });
    });

app.on('browser-window-created', (event, win) => {
    if (!browserWindows.has(win)) {
        try {
            win.setMenuBarVisibility(false);
            win.setIcon(resolveAppIconPath());
            win.on('blur', () => {
                if (!win.isDestroyed()) {
                    try {
                        win.webContents.send('global-keyup', { key: 'Control', code: 'ControlLeft' });
                    } catch(e) {}
                }
            });
        } catch(e) {}
    }
});

const RELATED_FIRST_PARTY_FAMILIES = [
    ['librus.pl', 'konto.librus.pl', 'synergia.librus.pl', 'api.librus.pl', 'portal.librus.pl'],
    ['google.com', 'youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com', 'ggpht.com', 'youtube-nocookie.com', 'googleapis.com', 'gstatic.com', 'accounts.google.com', 'googleusercontent.com', 'gmail.com', 'doubleclick.net', 'googlesyndication.com', 'googleadservices.com'],
    ['microsoft.com', 'live.com', 'microsoftonline.com', 'office.com', 'office365.com'],
    ['allegro.pl', 'allegrostatic.com'],
    ['gov.pl', 'login.gov.pl', 'pz.gov.pl']
];

function extractHostname(urlOrHost) {
    if (!urlOrHost || typeof urlOrHost !== 'string') return '';
    const trimmed = urlOrHost.trim();
    if (!trimmed || trimmed === 'about:blank') return '';
    try {
        if (trimmed.includes('://')) {
            return new URL(trimmed).hostname.toLowerCase().replace(/\.$/, '');
        }
        return trimmed.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    } catch (_) {
        return '';
    }
}

function getBaseDomain(urlOrHost) {
    const host = extractHostname(urlOrHost);
    if (!host) return '';
    const parts = host.split('.').filter(Boolean);
    if (parts.length <= 2) return host;
    const tld2 = parts.slice(-2).join('.');
    if (['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br', 'com.pl', 'org.pl', 'edu.pl', 'gov.pl'].includes(tld2)) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
}

function areRelatedFirstPartyDomains(domainA, domainB) {
    const hostA = extractHostname(domainA);
    const hostB = extractHostname(domainB);
    if (!hostA || !hostB) return false;
    const baseA = getBaseDomain(hostA);
    const baseB = getBaseDomain(hostB);
    if (hostA === hostB || (baseA && baseA === baseB)) return true;

    const matchesEntry = (host, base, entry) => (
        host === entry || host.endsWith('.' + entry) || base === entry
    );
    return RELATED_FIRST_PARTY_FAMILIES.some((family) => (
        family.some((entry) => matchesEntry(hostA, baseA, entry)) &&
        family.some((entry) => matchesEntry(hostB, baseB, entry))
    ));
}

function isAuthOrSsoFlowUrl(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') return false;
    const lower = targetUrl.toLowerCase();
    return (
        lower.includes('/oauth') ||
        lower.includes('/authorize') ||
        lower.includes('/auth/') ||
        lower.includes('/signin') ||
        lower.includes('/login') ||
        lower.includes('/sso') ||
        lower.includes('/saml') ||
        lower.includes('/openid') ||
        lower.includes('/callback') ||
        lower.includes('login.gov.pl') ||
        lower.includes('login.microsoftonline.com') ||
        lower.includes('login.live.com') ||
        lower.includes('appleid.apple.com')
    );
}

function isThirdPartyCookieRequest(requestUrl, referrerUrl, mainFrameUrl, initiatorUrl = '') {
    if (!requestUrl) return false;
    try {
        const reqHost = extractHostname(requestUrl);
        if (!reqHost) return false;

        // Critical Auth, Identity & Platform domains - NEVER block cookies or tokens for authentication flows!
        if (
            reqHost.includes('google.com') ||
            reqHost.includes('youtube.com') ||
            reqHost.includes('youtu.be') ||
            reqHost.includes('googlevideo.com') ||
            reqHost.includes('ytimg.com') ||
            reqHost.includes('ggpht.com') ||
            reqHost.includes('youtube-nocookie.com') ||
            reqHost.includes('gstatic.com') ||
            reqHost.includes('googleapis.com') ||
            reqHost.includes('googleusercontent.com') ||
            reqHost.includes('gmail.com') ||
            reqHost.includes('firebaseapp.com') ||
            reqHost.includes('firebaseinstallations.googleapis.com') ||
            reqHost.includes('appleid.apple.com') ||
            reqHost.includes('facebook.com') ||
            reqHost.includes('github.com') ||
            reqHost.includes('twitter.com') ||
            reqHost.includes('x.com') ||
            reqHost.includes('microsoft.com') ||
            reqHost.includes('microsoftonline.com') ||
            reqHost.includes('live.com') ||
            reqHost.includes('office.com') ||
            reqHost.includes('voxmedia.com') ||
            reqHost.includes('cloudflare.com') ||
            reqHost.includes('challenges.cloudflare.com') ||
            reqHost.includes('hcaptcha.com') ||
            reqHost.includes('recaptcha.net') ||
            reqHost.includes('turnstile')
        ) {
            return false;
        }

        const targetBase = getBaseDomain(reqHost);
        const contextUrls = [referrerUrl, mainFrameUrl, initiatorUrl].filter(Boolean);
        let hasKnownContext = false;

        for (const ctxUrl of contextUrls) {
            const ctxHost = extractHostname(ctxUrl);
            if (!ctxHost) continue;
            hasKnownContext = true;
            if (getBaseDomain(ctxHost) === targetBase || areRelatedFirstPartyDomains(reqHost, ctxHost)) {
                return false; // First-party or related SSO family request
            }
        }

        // If tab origin/referrer isn't established yet (e.g. early incognito navigation), do not strip
        if (!hasKnownContext) return false;

        return true;
    } catch (_) {
        return false;
    }
}

app.setName('QBrowse');
app.setAppUserModelId('com.qbrowse.app');

const configuredSessions = new WeakSet();

function resolveCookieRequestContext(details) {
    let ownerUrl = details.referrer || '';
    if (typeof details.webContentsId === 'number' && details.webContentsId > 0) {
        try {
            const wc = webContents.fromId(details.webContentsId);
            if (wc && !wc.isDestroyed()) {
                const wcUrl = wc.getURL();
                if (wcUrl && wcUrl !== 'about:blank') {
                    ownerUrl = wcUrl;
                }
            }
        } catch (_) {}
    }
    if (!ownerUrl) ownerUrl = latestActiveWebviewUrl;

    const isGoogleAuth = (
        isGoogleAuthUrl(details.url) ||
        isGoogleAuthUrl(details.referrer) ||
        isGoogleAuthUrl(ownerUrl)
    );
    return { ownerUrl, isGoogleAuth };
}

function isYouTubeOrigin(urlOrHost) {
    const host = extractHostname(urlOrHost);
    if (!host) return false;
    return (
        host === 'youtube.com' ||
        host.endsWith('.youtube.com') ||
        host === 'youtu.be' ||
        host.endsWith('.youtu.be') ||
        host === 'youtube-nocookie.com' ||
        host.endsWith('.youtube-nocookie.com')
    );
}

function shouldStripThirdPartyCookies(details, context) {
    if (!settingsStore.block3rdParty) return false;
    if (!details || details.resourceType === 'mainFrame') return false;
    if (context.isGoogleAuth) return false;

    const { ownerUrl } = context;
    if (
        isYouTubeOrigin(ownerUrl) ||
        isYouTubeOrigin(details.referrer) ||
        isYouTubeOrigin(details.initiator)
    ) {
        return false;
    }
    if (details.resourceType === 'subFrame' && (
        isAuthOrSsoFlowUrl(details.url) ||
        isAuthOrSsoFlowUrl(details.referrer) ||
        isAuthOrSsoFlowUrl(ownerUrl)
    )) {
        return false;
    }

    if (details.statusCode >= 300 && details.statusCode < 400) {
        return false;
    }

    const targetBase = getBaseDomain(details.url);
    if (targetBase && (
        targetBase === getBaseDomain(ownerUrl) ||
        targetBase === getBaseDomain(details.referrer) ||
        targetBase === getBaseDomain(details.initiator)
    )) {
        return false;
    }

    if (
        areRelatedFirstPartyDomains(details.url, ownerUrl) ||
        areRelatedFirstPartyDomains(details.url, details.referrer) ||
        areRelatedFirstPartyDomains(details.url, details.initiator)
    ) {
        return false;
    }

    return isThirdPartyCookieRequest(details.url, details.referrer, ownerUrl, details.initiator);
}

function deleteHeadersCaseInsensitive(headersObj, targetLowerName) {
    if (!headersObj) return;
    for (const key of Object.keys(headersObj)) {
        if (key.toLowerCase() === targetLowerName) {
            delete headersObj[key];
        }
    }
}

function setupHeadersHandler(sess) {
    if (!sess || !sess.webRequest) return;

    const secChUaPlatform = process.platform === 'linux' ? '"Linux"' : process.platform === 'darwin' ? '"macOS"' : '"Windows"';

    sess.webRequest.onBeforeSendHeaders((details, callback) => {
        delete details.requestHeaders['X-Electron-Version'];

        const cookieCtx = resolveCookieRequestContext(details);

        // Provide clean Chrome desktop identity for all web browsing and OAuth
        details.requestHeaders['User-Agent'] = CHROME_USER_AGENT;
        const chromeMajor = (process.versions.chrome || '134').split('.')[0];
        details.requestHeaders['sec-ch-ua'] = `"Google Chrome";v="${chromeMajor}", "Chromium";v="${chromeMajor}", "Not_A Brand";v="24"`;
        details.requestHeaders['sec-ch-ua-mobile'] = '?0';
        details.requestHeaders['sec-ch-ua-platform'] = secChUaPlatform;
        if (details.requestHeaders['sec-ch-ua-full-version-list']) {
            details.requestHeaders['sec-ch-ua-full-version-list'] = `"Google Chrome";v="${CHROME_VERSION}", "Chromium";v="${CHROME_VERSION}", "Not_A Brand";v="24.0.0.0"`;
        }

        if (settingsStore.dnt !== false) {
            details.requestHeaders['DNT'] = '1';
        }

        // Top-level document navigations, SSO redirects, and first-party/related families must NEVER have cookies stripped
        if (shouldStripThirdPartyCookies(details, cookieCtx)) {
            deleteHeadersCaseInsensitive(details.requestHeaders, 'cookie');
        }

        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    sess.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        const cookieCtx = resolveCookieRequestContext(details);

        if (shouldStripThirdPartyCookies(details, cookieCtx)) {
            deleteHeadersCaseInsensitive(responseHeaders, 'set-cookie');
        }

        const isCloudflare = details.url && (details.url.includes('cloudflare.com') || details.url.includes('challenges.cloudflare.com'));
        if (localDialogPort && !cookieCtx.isGoogleAuth && !isCloudflare) {
            for (const headerKey of Object.keys(responseHeaders)) {
                const lowerKey = headerKey.toLowerCase();
                if (lowerKey === 'content-security-policy' || lowerKey === 'content-security-policy-report-only') {
                    responseHeaders[headerKey] = responseHeaders[headerKey].map(val => {
                        if (/connect-src\s+/i.test(val)) {
                            return val.replace(/connect-src\s+([^;]+)/i, (match, sources) => {
                                const additions = [];
                                if (!sources.includes(`127.0.0.1:${localDialogPort}`)) additions.push(`http://127.0.0.1:${localDialogPort}`);
                                if (!sources.includes('data:')) additions.push('data:');
                                if (!sources.includes('blob:')) additions.push('blob:');
                                return additions.length > 0 ? `connect-src ${sources.trim()} ${additions.join(' ')}` : match;
                            });
                        }
                        if (/default-src\s+/i.test(val)) {
                            return val + `; connect-src * 'self' data: blob: filesystem: http://127.0.0.1:${localDialogPort}`;
                        }
                        return val;
                    });
                }
            }
        }
        callback({ responseHeaders });
    });
}

// IPC handler to dynamically emulate colorScheme on webviews (e.g. for Smart Dark Mode)
ipcMain.on('set-webview-color-scheme', (event, { webContentsId, colorScheme }) => {
    try {
        if (!webContentsId) return;
        const targetContents = webContents.fromId(webContentsId);
        if (targetContents && !targetContents.isDestroyed() && typeof targetContents.setEmulatedMedia === 'function') {
            try {
                targetContents.setEmulatedMedia({ colorScheme: colorScheme || getEffectiveColorScheme() });
            } catch (_) {}
        }
    } catch (_) {}
});

ipcMain.on('sync-theme-source', (event, theme) => {
    try {
        currentAppTheme = (theme === 'light' || theme === 'dark' || theme === 'system') ? theme : 'system';
        nativeTheme.themeSource = (currentAppTheme === 'light' || currentAppTheme === 'dark') ? currentAppTheme : 'system';
        const effectiveScheme = getEffectiveColorScheme();
        const bgColor = effectiveScheme === 'dark' ? '#121212' : '#ffffff';
        const { isForceDark, exclusions } = resolveSmartDarkConfig();
        for (const wc of webContents.getAllWebContents()) {
            if (!wc.isDestroyed() && wc.getType() === 'webview') {
                try {
                    const url = wc.getURL() || '';
                    const isExcluded = isUrlExcludedFromDarkMode(url, exclusions);
                    const targetScheme = (isForceDark && !isExcluded) ? 'dark' : effectiveScheme;
                    wc.setEmulatedMedia({ colorScheme: targetScheme });
                    wc.setBackgroundColor(targetScheme === 'dark' ? '#121212' : bgColor);
                } catch (_) {}
            }
        }
    } catch (e) {
        console.warn('[Main] sync-theme-source error:', e);
    }
});

ipcMain.handle('get-system-theme', () => {
    try {
        return { shouldUseDarkColors: nativeTheme.shouldUseDarkColors };
    } catch (_) {
        return { shouldUseDarkColors: true };
    }
});

// Verification helper that checks file existence, size, and calculates SHA-256 checksum
async function verifyAndChecksumFile(filePath, expectedBytes = 0) {
    try {
        if (!filePath || typeof filePath !== 'string') {
            return { verified: false, error: 'Invalid file path' };
        }
        if (!fsSync.existsSync(filePath)) {
            return { verified: false, error: 'File does not exist on disk' };
        }
        const stat = fsSync.statSync(filePath);
        if (stat.size === 0 && expectedBytes > 0) {
            return { verified: false, size: 0, error: 'Downloaded file is empty (0 bytes)' };
        }
        if (expectedBytes > 0 && stat.size < expectedBytes) {
            return { verified: false, size: stat.size, error: `Incomplete download (${stat.size}/${expectedBytes} bytes)` };
        }

        const hash = crypto.createHash('sha256');
        const stream = fsSync.createReadStream(filePath);
        await new Promise((resolve, reject) => {
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', resolve);
            stream.on('error', reject);
        });
        const checksum = hash.digest('hex');

        return {
            verified: true,
            size: stat.size,
            checksum,
            algorithm: 'SHA-256',
            verifiedAt: Date.now()
        };
    } catch (err) {
        console.error('[Download Verification] Error:', err);
        return {
            verified: false,
            error: err?.message || 'Verification failed'
        };
    }
}

function setupDownloadHandler(sess) {
    if (!sess) return;
    sess.on('will-download', (event, item, webContents) => {
        const id = Date.now().toString();
        const fileName = item.getFilename();
        const totalBytes = item.getTotalBytes();
        const url = item.getURL();

        let defaultDownloads = '';
        try {
            defaultDownloads = app.getPath('downloads');
        } catch (_) {
            defaultDownloads = path.join(os.homedir(), 'Downloads');
        }
        let targetDir = settingsStore.downloadsPath || defaultDownloads;

        if (settingsStore.groupDownloads !== false) {
            const ext = path.extname(fileName).toLowerCase().replace('.', '');
            let sub = '';
            if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) sub = 'Images';
            else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md'].includes(ext)) sub = 'Documents';
            else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'xz', '7zip'].includes(ext)) sub = 'Archives';
            else if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'apk'].includes(ext)) sub = 'Programs';
            else if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) sub = 'Media';

            if (sub) {
                targetDir = path.join(targetDir, sub);
                try {
                    if (!fsSync.existsSync(targetDir)) fsSync.mkdirSync(targetDir, { recursive: true });
                } catch (_) {}
            }
        }

        const askSave = settingsStore.askSave === true;
        const targetFilePath = path.join(targetDir, fileName);

        if (!askSave) {
            try {
                item.setSavePath(targetFilePath);
            } catch(e) {}
        } else {
            item.setSaveDialogOptions({
                title: `Save ${fileName} - QBrowse`,
                defaultPath: targetFilePath
            });
        }

        const urlChain = typeof item.getURLChain === 'function' ? item.getURLChain() : [url];
        const webContentsId = webContents ? webContents.id : null;
        let canGoBack = false;
        let webContentsUrl = '';
        if (webContents && !webContents.isDestroyed()) {
            try {
                if (webContents.navigationHistory && typeof webContents.navigationHistory.canGoBack === 'function') {
                    canGoBack = webContents.navigationHistory.canGoBack();
                } else if (typeof webContents.canGoBack === 'function') {
                    canGoBack = webContents.canGoBack();
                }
                webContentsUrl = typeof webContents.getURL === 'function' ? webContents.getURL() : '';
            } catch (_) {}
        }

        const targetDownloadWin = resolvePermissionTargetWindow(webContents) || mainWindow;
        const sendDownloadEvent = (channel, payload) => {
            if (targetDownloadWin && !targetDownloadWin.isDestroyed() && targetDownloadWin.webContents && !targetDownloadWin.webContents.isDestroyed()) {
                targetDownloadWin.webContents.send(channel, payload);
            } else if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send(channel, payload);
            }
        };

        sendDownloadEvent('download-started', { 
            id, 
            fileName, 
            totalBytes, 
            url, 
            urlChain, 
            webContentsId, 
            canGoBack, 
            webContentsUrl 
        });

        let lastDownloadUpdateTime = Date.now();
        let lastReceivedBytes = 0;
        let isDownloadFinished = false;

        item.on('updated', (event, state) => {
            if (isDownloadFinished) return;
            if (state === 'interrupted') {
                sendDownloadEvent('download-updated', { id, state: 'interrupted', speedBytesPerSec: 0 });
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    sendDownloadEvent('download-updated', { id, state: 'paused', speedBytesPerSec: 0 });
                } else {
                    const now = Date.now();
                    const receivedBytes = item.getReceivedBytes();
                    const timeDiff = (now - lastDownloadUpdateTime) / 1000;
                    
                    let speedBytesPerSec = 0;
                    if (timeDiff > 0.5) {
                        speedBytesPerSec = (receivedBytes - lastReceivedBytes) / timeDiff;
                        lastDownloadUpdateTime = now;
                        lastReceivedBytes = receivedBytes;
                    }

                    sendDownloadEvent('download-updated', { 
                        id, 
                        state: 'progressing', 
                        receivedBytes,
                        speedBytesPerSec
                    });
                }
            }
        });

        item.once('done', async (event, state) => {
            isDownloadFinished = true;
            const savePath = item.getSavePath();
            let verificationResult = { verified: false };
            let finalState = state;

            if (state === 'cancelled' || (state === 'completed' && !savePath)) {
                finalState = 'cancelled';
            } else if (state === 'completed' && savePath) {
                // Short yield to ensure OS file system flush
                await new Promise(r => setTimeout(r, 60));
                verificationResult = await verifyAndChecksumFile(savePath, totalBytes);
                if (!verificationResult.verified) {
                    console.warn('[Download Verification] File verification failed for:', savePath, verificationResult.error);
                    finalState = 'interrupted';
                } else {
                    debugLog(`[Download Verification] Verified: ${fileName} (${verificationResult.size} bytes, SHA-256: ${verificationResult.checksum.slice(0, 12)}...)`);
                }
            }

            sendDownloadEvent('download-done', { 
                id, 
                state: finalState, 
                savePath: finalState === 'cancelled' ? '' : savePath,
                verified: finalState === 'completed' ? verificationResult.verified : false,
                checksum: finalState === 'completed' ? (verificationResult.checksum || null) : null,
                algorithm: verificationResult.algorithm || 'SHA-256',
                actualBytes: finalState === 'cancelled' ? 0 : (verificationResult.size ?? item.getReceivedBytes()),
                speedBytesPerSec: 0,
                error: finalState === 'cancelled' ? 'Download cancelled' : (verificationResult.error || null),
                verifiedAt: verificationResult.verifiedAt || null
            });
        });
    });
}

function isInternalAppShellWebContents(wc) {
    if (!wc || (typeof wc.isDestroyed === 'function' && wc.isDestroyed())) return false;
    if (typeof wc.getType === 'function' && wc.getType() === 'webview') return false;
    if (wc.hostWebContents) return false;
    try {
        const win = BrowserWindow.fromWebContents(wc);
        if (!win || win.isDestroyed() || activeOAuthWindows.has(win)) return false;
        return browserWindows.has(win) || win === mainWindow;
    } catch (_) {
        return false;
    }
}

function isTrustedAppShellSender(event) {
    if (!event || !event.sender) return false;
    if (!isInternalAppShellWebContents(event.sender)) return false;
    if (event.senderFrame && event.sender.mainFrame && event.senderFrame !== event.sender.mainFrame) {
        return false;
    }
    return true;
}

function assertTrustedAppShell(event, channelName = '') {
    if (!isTrustedAppShellSender(event)) {
        console.warn(`[Security] Blocked unauthorized IPC call${channelName ? ` (${channelName})` : ''} from non-shell webContents.`);
        throw new Error('Unauthorized IPC sender');
    }
}

function resolvePermissionTargetWindow(wc) {
    try {
        if (wc && (typeof wc.isDestroyed !== 'function' || !wc.isDestroyed())) {
            if (wc.hostWebContents && !wc.hostWebContents.isDestroyed()) {
                const hostWin = BrowserWindow.fromWebContents(wc.hostWebContents);
                if (hostWin && !hostWin.isDestroyed() && !activeOAuthWindows.has(hostWin)) return hostWin;
            }
            const selfWin = BrowserWindow.fromWebContents(wc);
            if (selfWin && !selfWin.isDestroyed() && !activeOAuthWindows.has(selfWin)) return selfWin;
        }
        const focused = BrowserWindow.getFocusedWindow();
        if (focused && !focused.isDestroyed() && !activeOAuthWindows.has(focused)) return focused;
        if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
        return Array.from(browserWindows).find(w => w && !w.isDestroyed()) || null;
    } catch (_) {
        return (mainWindow && !mainWindow.isDestroyed()) ? mainWindow : null;
    }
}

async function ensureMacOSMediaAccess(keys) {
    if (process.platform !== 'darwin' || !systemPreferences || typeof systemPreferences.askForMediaAccess !== 'function') {
        return true;
    }
    const mediaTypes = [];
    if (Array.isArray(keys)) {
        if (keys.includes('camera')) mediaTypes.push('camera');
        if (keys.includes('microphone')) mediaTypes.push('microphone');
    }
    for (const mt of mediaTypes) {
        try {
            const status = typeof systemPreferences.getMediaAccessStatus === 'function'
                ? systemPreferences.getMediaAccessStatus(mt)
                : 'not-determined';
            if (status === 'denied' || status === 'restricted') {
                return false;
            }
            if (status !== 'granted') {
                const granted = await systemPreferences.askForMediaAccess(mt);
                if (!granted) return false;
            }
        } catch (_) {}
    }
    return true;
}

function setupWebviewSession(sess, explicitPartitionKey) {
    if (!sess) return;
    if (explicitPartitionKey) {
        permissionManager.registerSession(sess, explicitPartitionKey);
    }
    if (configuredSessions.has(sess)) return;
    configuredSessions.add(sess);

    permissionManager.registerSession(sess, explicitPartitionKey);

    if (sess !== session.defaultSession) {
        const minPreloadPath = path.join(__dirname, 'webview_preload.min.cjs');
        const preloadScriptPath = fsSync.existsSync(minPreloadPath)
            ? minPreloadPath
            : path.join(__dirname, 'webview_preload.cjs');
        if (typeof sess.registerPreloadScript === 'function') {
            try {
                sess.registerPreloadScript({ type: 'frame', filePath: preloadScriptPath });
            } catch (err) {
                console.warn('[Session] registerPreloadScript failed, falling back to setPreloads:', err);
                try { sess.setPreloads([preloadScriptPath]); } catch (_) {}
            }
        } else if (typeof sess.setPreloads === 'function') {
            sess.setPreloads([preloadScriptPath]);
        }
    }

    setupHeadersHandler(sess);
    applyAdblockerToSession(sess);

    sess.setPermissionRequestHandler((wc, permission, callback, details = {}) => {
        try {
            // Allow QBrowse's own internal UI shell (e.g. local voice/Whisper STT) without site prompts
            if (isInternalAppShellWebContents(wc)) {
                if (permission === 'media') {
                    const mediaKeys = [];
                    if (Array.isArray(details?.mediaTypes)) {
                        if (details.mediaTypes.includes('video')) mediaKeys.push('camera');
                        if (details.mediaTypes.includes('audio')) mediaKeys.push('microphone');
                    }
                    ensureMacOSMediaAccess(mediaKeys).then(ok => callback(ok)).catch(() => callback(true));
                    return;
                }
                return callback(true);
            }

            const { isPersistent, sessionKey } = permissionManager.getSessionInfo(sess);
            const requestingUrl = details.requestingUrl || details.securityOrigin || (wc && !wc.isDestroyed() ? wc.getURL() : '');
            const evaluation = permissionManager.evaluateRequest(permission, requestingUrl, details, {
                isPersistent,
                sessionKey
            });

            if (evaluation.status === 'allow') {
                if (permission === 'media') {
                    const mediaKeys = [];
                    if (Array.isArray(details?.mediaTypes)) {
                        if (details.mediaTypes.includes('video')) mediaKeys.push('camera');
                        if (details.mediaTypes.includes('audio')) mediaKeys.push('microphone');
                    }
                    ensureMacOSMediaAccess(mediaKeys).then(ok => callback(ok)).catch(() => callback(true));
                    return;
                }
                return callback(true);
            }

            if (evaluation.status === 'deny') {
                return callback(false);
            }

            const targetWin = resolvePermissionTargetWindow(wc);
            if (!targetWin || targetWin.isDestroyed()) {
                return callback(false);
            }

            permissionManager.enqueueLivePrompt({
                webContents: wc,
                targetWin,
                origin: evaluation.origin,
                host: evaluation.host,
                keys: evaluation.keys,
                promptType: evaluation.promptType,
                isPersistent,
                sessionKey,
                callback,
                sendPrompt: (payload) => {
                    if (targetWin && !targetWin.isDestroyed()) {
                        targetWin.webContents.send('qbrowse-permission-request', payload);
                    }
                },
                sendDismiss: (payload) => {
                    if (targetWin && !targetWin.isDestroyed()) {
                        targetWin.webContents.send('qbrowse-permission-dismiss', payload);
                    }
                }
            });
        } catch (err) {
            console.warn('[Permissions] Request handler error:', err?.message || err);
            try { callback(false); } catch (_) {}
        }
    });

    sess.setPermissionCheckHandler((wc, permission, requestingOrigin, details = {}) => {
        try {
            if (isInternalAppShellWebContents(wc)) {
                return true;
            }
            const { isPersistent, sessionKey } = permissionManager.getSessionInfo(sess);
            const origin = requestingOrigin || details?.securityOrigin || details?.requestingUrl || (wc && !wc.isDestroyed() ? wc.getURL() : '');
            return permissionManager.checkPermission(permission, origin, details, {
                isPersistent,
                sessionKey
            });
        } catch (_) {
            return false;
        }
    });

    if (typeof sess.setDisplayMediaRequestHandler === 'function') {
        sess.setDisplayMediaRequestHandler((request, callback) => {
            try {
                let wc = null;
                try {
                    const topFrame = request?.frame?.top || request?.frame;
                    if (topFrame) {
                        wc = webContents.getAllWebContents().find(w => !w.isDestroyed() && w.mainFrame === topFrame) || null;
                    }
                } catch (_) {}

                const grantDisplayMedia = async () => {
                    try {
                        if (!desktopCapturer || typeof desktopCapturer.getSources !== 'function') {
                            callback({});
                            return;
                        }
                        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
                        const primary = sources && sources[0];
                        if (!primary) {
                            callback({});
                            return;
                        }
                        if (request?.audioRequested && process.platform === 'win32') {
                            try {
                                callback({ video: primary, audio: 'loopback' });
                                return;
                            } catch (_) {}
                        }
                        callback({ video: primary });
                    } catch (_) {
                        try { callback({}); } catch (__) {}
                    }
                };

                if (isInternalAppShellWebContents(wc)) {
                    grantDisplayMedia();
                    return;
                }

                const { isPersistent, sessionKey } = permissionManager.getSessionInfo(sess);
                const originUrl = request?.securityOrigin || request?.frame?.url || (wc && !wc.isDestroyed() ? wc.getURL() : '');
                const evaluation = permissionManager.evaluateRequest('display-capture', originUrl, {}, {
                    isPersistent,
                    sessionKey
                });

                if (evaluation.status === 'allow') {
                    grantDisplayMedia();
                    return;
                }
                if (evaluation.status === 'deny') {
                    callback({});
                    return;
                }

                const targetWin = resolvePermissionTargetWindow(wc);
                if (!targetWin || targetWin.isDestroyed()) {
                    callback({});
                    return;
                }

                permissionManager.enqueueLivePrompt({
                    webContents: wc,
                    targetWin,
                    origin: evaluation.origin,
                    host: evaluation.host,
                    keys: evaluation.keys,
                    promptType: evaluation.promptType,
                    isPersistent,
                    sessionKey,
                    callback: (granted) => {
                        if (!granted) {
                            try { callback({}); } catch (_) {}
                            return;
                        }
                        grantDisplayMedia();
                    },
                    sendPrompt: (payload) => {
                        if (targetWin && !targetWin.isDestroyed()) {
                            targetWin.webContents.send('qbrowse-permission-request', payload);
                        }
                    },
                    sendDismiss: (payload) => {
                        if (targetWin && !targetWin.isDestroyed()) {
                            targetWin.webContents.send('qbrowse-permission-dismiss', payload);
                        }
                    }
                });
            } catch (err) {
                console.warn('[Permissions] Display media handler error:', err?.message || err);
                try { callback({}); } catch (_) {}
            }
        });
    }

    if (typeof sess.setDevicePermissionHandler === 'function') {
        sess.setDevicePermissionHandler(() => true);
    }

    if (sess.setWebAuthenticationHandler) {
        sess.setWebAuthenticationHandler((details, callback) => {
            // Allow native OS Windows Security dialog so hardware security keys (YubiKey, FIDO2) work seamlessly
            callback({ action: 'allow' });
        });
    }

    setupDownloadHandler(sess);
}

// Hardware-Aware Chromium Performance Flags
try {
    const cpuCores = os.cpus()?.length || 4;
    const totalMemGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));

    // Multithreaded rasterization based on available physical/logical CPU cores
    app.commandLine.appendSwitch('num-raster-threads', String(Math.min(4, Math.max(1, Math.floor(cpuCores / 2)))));

    // Chromium Back-Forward Cache (bfcache) flag
    app.commandLine.appendSwitch('back-forward-cache', 'enabled');

    // Adaptive renderer process limit to keep RAM consumption bounded on lower-spec machines while enabling deep bfcache on high-RAM tiers
    if (totalMemGB <= 6) {
        app.commandLine.appendSwitch('renderer-process-limit', '6');
    } else if (totalMemGB <= 12) {
        app.commandLine.appendSwitch('renderer-process-limit', '16');
    } else {
        app.commandLine.appendSwitch('renderer-process-limit', '32');
    }
} catch (e) {
    console.warn('[PerformanceEngine] Error setting Chromium flags:', e.message);
}

let lastAppliedPerformanceTier = null;

function broadcastPerformanceProfile(profile) {
    if (!profile) return;
    for (const win of browserWindows) {
        if (win && !win.isDestroyed()) {
            try { win.webContents.send('performance-profile-changed', profile); } catch (_) {}
        }
    }
    if (mainWindow && !mainWindow.isDestroyed() && !browserWindows.has(mainWindow)) {
        try { mainWindow.webContents.send('performance-profile-changed', profile); } catch (_) {}
    }
}

function applyPerformanceTierToContents(activeTier) {
    try {
        const tierChanged = activeTier !== lastAppliedPerformanceTier;
        lastAppliedPerformanceTier = activeTier;
        const allWc = webContents.getAllWebContents();
        for (const wc of allWc) {
            if (wc.getType() === 'webview') {
                if (activeTier === 'ultra') {
                    wc.setBackgroundThrottling(false);
                } else {
                    wc.setBackgroundThrottling(true);
                }
            }
        }
        if (activeTier === 'eco' && tierChanged) {
            session.defaultSession.clearCache().catch(() => {});
        }
    } catch (e) {
        console.warn('[PerformanceEngine] Error applying tier to webContents:', e.message);
    }
}

// DNS over HTTPS (DoH) & Custom Host Resolver Configuration
const DOH_PROVIDERS = {
    cloudflare: 'https://cloudflare-dns.com/dns-query',
    google: 'https://dns.google/dns-query',
    quad9: 'https://dns.quad9.net/dns-query',
    adguard: 'https://dns.adguard-dns.com/dns-query',
    nextdns: 'https://dns.nextdns.io',
    opendns: 'https://doh.opendns.com/dns-query'
};

function formatDohUrl(input) {
    if (!input || typeof input !== 'string') return '';
    let trimmed = input.trim();
    if (!trimmed) return '';
    // Format raw IPv4 addresses as DoH templates if provided
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
        return `https://${trimmed}/dns-query`;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }
    return trimmed;
}

function applyDnsConfiguration(options = {}) {
    try {
        const provider = options.provider || options.doh || settingsStore.doh || 'cloudflare';
        const mode = options.mode || options.dohMode || settingsStore.dohMode || 'automatic';
        const customUrl = options.customUrl || options.customDohUrl || settingsStore.customDohUrl || '';

        if (mode === 'off' || provider === 'off') {
            if (typeof app.configureHostResolver === 'function') {
                app.configureHostResolver({
                    enableBuiltInResolver: false,
                    secureDnsMode: 'off',
                    secureDnsServers: []
                });
            }
            debugLog('[DNS] Host resolver disabled: Mode = OFF (OS Default)');
            return { success: true, mode: 'off', servers: [] };
        }

        let targetServer = '';
        if (provider === 'custom') {
            targetServer = formatDohUrl(customUrl);
        } else if (DOH_PROVIDERS[provider]) {
            targetServer = DOH_PROVIDERS[provider];
        } else if (typeof provider === 'string' && provider.startsWith('http')) {
            targetServer = provider;
        } else {
            targetServer = DOH_PROVIDERS.cloudflare;
        }

        const secureDnsMode = (mode === 'secure') ? 'secure' : 'automatic';
        const servers = targetServer ? [targetServer] : [DOH_PROVIDERS.cloudflare];

        if (typeof app.configureHostResolver === 'function') {
            app.configureHostResolver({
                enableBuiltInResolver: true,
                secureDnsMode: secureDnsMode,
                secureDnsServers: servers
            });
        }
        debugLog(`[DNS] Host resolver applied: Mode = ${secureDnsMode}, Server(s) = ${servers.join(', ')}`);
        return { success: true, mode: secureDnsMode, servers };
    } catch (err) {
        console.error('[DNS] Failed to configure host resolver:', err);
        return { success: false, error: err.message };
    }
}

app.whenReady().then(async () => {
  // Initialize in-process Rust SQLite WAL storage + migrate site-permissions.json
  try {
      const userDataDir = app.getPath('userData');
      rustBridge.storageInit(
          path.join(userDataDir, 'qbrowse.db'),
          path.join(userDataDir, 'site-permissions.json')
      );
  } catch (e) {
      console.warn('[RustStorage] Init warning:', e.message);
  }

  // Register zero-copy streaming qbrowse-local:// (Range 206) and WebP qbrowse-thumb:// protocols
  try {
      protocol.handle('qbrowse-local', async (request) => {
          try {
              const urlObj = new URL(request.url);
              const rawPath = urlObj.searchParams.get('path') || '';
              const targetPath = toLocalFsPath(rawPath);
              if (!targetPath || !isAuthorizedLocalPath(targetPath) || !fsSync.existsSync(targetPath)) {
                  return new Response('Forbidden or Not Found', { status: 403 });
              }
              const rangeHeader = request.headers.get('range') || request.headers.get('Range') || null;
              const maxChunkBytes = rangeHeader ? 2 * 1024 * 1024 : 0;
              const chunk = await rustBridge.mediaReadFileRangeBuffer(targetPath, rangeHeader, maxChunkBytes);
              const headers = {
                  'Content-Type': chunk.contentType || 'application/octet-stream',
                  'Accept-Ranges': 'bytes',
                  'Cache-Control': 'no-store'
              };
              if (chunk.contentRange) {
                  headers['Content-Range'] = chunk.contentRange;
              } else {
                  const totalLen = Number.isFinite(chunk.totalSize) && chunk.totalSize >= 0
                      ? chunk.totalSize
                      : (chunk.bytes ? chunk.bytes.length : 0);
                  headers['Content-Length'] = String(totalLen);
              }
              return new Response(chunk.bytes, {
                  status: chunk.status || 200,
                  headers
              });
          } catch (err) {
              return new Response('Error reading local stream', { status: 500 });
          }
      });

      protocol.handle('qbrowse-thumb', async (request) => {
          try {
              const urlObj = new URL(request.url);
              const tabId = path.basename(urlObj.pathname || '').replace(/[^a-zA-Z0-9._-]/g, '');
              if (!tabId) return new Response('Not Found', { status: 404 });
              const thumbsDir = stripWindowsExtendedPrefix(path.join(app.getPath('userData'), 'thumbnails'));
              let thumbPath = stripWindowsExtendedPrefix(path.join(thumbsDir, `${tabId}.webp`));
              let contentType = 'image/webp';
              if (!fsSync.existsSync(thumbPath)) {
                  const pngPath = stripWindowsExtendedPrefix(path.join(thumbsDir, `${tabId}.png`));
                  if (fsSync.existsSync(pngPath)) {
                      thumbPath = pngPath;
                      contentType = 'image/png';
                  } else {
                      return new Response('Not Found', { status: 404 });
                  }
              }
              const bytes = await fs.readFile(thumbPath);
              return new Response(bytes, {
                  status: 200,
                  headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' }
              });
          } catch {
              return new Response('Error', { status: 500 });
          }
      });
  } catch (e) {
      console.warn('[Protocol] qbrowse-local / qbrowse-thumb registration warning:', e.message);
  }

  // 0. Load persisted performance settings before window creation so animations and early IPC use saved values
  try {
      performanceEngine.initSettings(app.getPath('userData'));
  } catch (_) {}

  // 0b. Register session-created listener and core sessions BEFORE createWindow() so no partition can miss permission handlers
  try {
      app.on('session-created', (sess) => {
          setupWebviewSession(sess);
      });
      setupWebviewSession(session.defaultSession, 'default');
      const defaultProfileSession = session.fromPartition('persist:profile_default');
      setupWebviewSession(defaultProfileSession, 'persist:profile_default');
      const ghostSession = session.fromPartition('ghost');
      setupWebviewSession(ghostSession, 'ghost');
      if (ghostSession && typeof ghostSession.setWebRTCIPHandlingPolicy === 'function') {
          ghostSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }
      const torSession = session.fromPartition('tor');
      setupWebviewSession(torSession, 'tor');
      if (torSession && typeof torSession.setWebRTCIPHandlingPolicy === 'function') {
          torSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }
      torSession.setProxy({
          proxyRules: `socks5://127.0.0.1:${torEngine.getStatus().socksPort || 9050}`,
          proxyBypassRules: '<local>'
      }).catch(() => {});
  } catch (_) {}

  // 1. Immediately create the main browser window so UI rendering starts instantly
  createWindow();

  // 1a. Initialize native high-performance adblock engine
  adblockEngine.init(app, settingsStore, mainWindow).catch(err => {
      console.warn('[AdblockEngine] Init warning:', err.message);
  });

  // 1a-ext. Initialize Chrome MV3/MV2 extension engine (strictly isolated to profile sessions)
  extensionEngine.init(app, rustBridge, {
      getBrowserWindows: () => browserWindows,
      getMainWindow: () => mainWindow
  }).catch(err => {
      console.warn('[ExtensionEngine] Init warning:', err.message);
  });

  // 1b. Apply configured Secure DNS (DoH) / Custom DNS host resolver
  applyDnsConfiguration();

  // 2. Register local media streaming protocol for wallpapers and assets
  try {
      protocol.handle('qbrowse-media', async (request) => {
          try {
              let fileName = '';
              try {
                  const urlObj = new URL(request.url);
                  const raw = urlObj.pathname.replace(/^\/(?:app\/|local\/)?/, '');
                  fileName = path.basename(decodeURIComponent(raw));
              } catch {
                  const raw = request.url.replace(/^qbrowse-media:\/\/(?:app\/|local\/)?/, '').split('?')[0].split('#')[0];
                  fileName = path.basename(decodeURIComponent(raw));
              }
              if (!fileName) {
                  return new Response('Not Found', { status: 404 });
              }
              const backgroundsDir = path.join(app.getPath('userData'), 'backgrounds');
              const fullPath = path.join(backgroundsDir, fileName);
              if (!fullPath.startsWith(backgroundsDir)) {
                  return new Response('Forbidden', { status: 403 });
              }
              try {
                  const stat = await fs.stat(fullPath);
                  if (!stat.isFile()) {
                      return new Response('Not Found', { status: 404 });
                  }
              } catch {
                  return new Response('Not Found', { status: 404 });
              }
              const response = await net.fetch(pathToFileURL(fullPath).toString(), {
                  headers: request.headers
              });
              const responseHeaders = new Headers(response.headers);
              const reqOrigin = request.headers.get('origin');
              if (reqOrigin === 'http://localhost:1420' || reqOrigin === 'http://127.0.0.1:1420') {
                  responseHeaders.set('Access-Control-Allow-Origin', reqOrigin);
                  responseHeaders.set('Vary', 'Origin');
              } else {
                  responseHeaders.delete('Access-Control-Allow-Origin');
              }
              responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
              return new Response(response.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: responseHeaders
              });
          } catch (err) {
              return new Response('Not Found', { status: 404 });
          }
      });
  } catch (e) {
      console.warn('[Protocol] Failed to register qbrowse-media handler:', e.message);
  }

  // 2b. Register internal qbrowse scheme handler and register protocol client with OS
  try {
      protocol.handle('qbrowse', async () => {
          return new Response(
              `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QBrowse</title><style>body{background:#0e0e11;color:#a1a1aa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;user-select:none;}</style></head><body><div style="text-align:center"><h2 style="color:#f4f4f5;font-weight:600;margin-bottom:8px">QBrowse Internal Page</h2><p style="font-size:14px;color:#71717a">This internal page is managed by QBrowse.</p></div></body></html>`,
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
      });
  } catch (e) {
      console.warn('[Protocol] Failed to register qbrowse handler:', e.message);
  }

  try {
      if (process.defaultApp) {
          if (process.argv.length >= 2) {
              app.setAsDefaultProtocolClient('qbrowse', process.execPath, [path.resolve(process.argv[1])]);
          }
      } else {
          app.setAsDefaultProtocolClient('qbrowse');
      }
  } catch (_) {}

  // 3. Handle screen resolution / DPI changes to keep compositor and window geometry synchronized
  try {
      screen.on('display-metrics-changed', (event, display, changedMetrics) => {
          debugLog('[Display] Screen metrics changed:', changedMetrics);
          for (const win of browserWindows) {
              if (win && !win.isDestroyed()) {
                  win.webContents.send('display-metrics-changed', {
                      displayId: display.id,
                      bounds: display.bounds,
                      scaleFactor: display.scaleFactor,
                      changedMetrics
                  });
              }
          }
      });
  } catch (e) {
      console.warn('[Display] Screen listener setup warning:', e.message);
  }

  // 5. Non-blocking asynchronous background initialization (Power monitor, Widevine DRM, YouTube/Google cleaner, OS registry)
  setTimeout(async () => {
      try {
          if (powerMonitor) {
              powerMonitor.on('on-battery', async () => {
                  let gpuInfo = null;
                  try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
                  const profile = performanceEngine.detectHardwareProfile(gpuInfo, true);
                  applyPerformanceTierToContents(profile.activeTier);
                  broadcastPerformanceProfile(profile);
              });
              powerMonitor.on('on-ac', async () => {
                  let gpuInfo = null;
                  try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
                  const profile = performanceEngine.detectHardwareProfile(gpuInfo, false);
                  applyPerformanceTierToContents(profile.activeTier);
                  broadcastPerformanceProfile(profile);
              });
          }
      } catch (e) {
          console.warn('[PerformanceEngine] Power monitor setup warning:', e.message);
      }

      try {
          if (components && typeof components.whenReady === 'function') {
              await components.whenReady();
              debugLog('Widevine and components loaded successfully.');
          }
      } catch(e) {
          console.error('Components failed to load:', e);
      }

      // Clean Google login stuck/rejected state asynchronously
      try {
          const sessionsToClean = [
              session.defaultSession,
              session.fromPartition('persist:profile_default')
          ];
          for (const s of sessionsToClean) {
              s.clearStorageData({ origin: 'https://accounts.google.com', storages: ['serviceworkers', 'cachestorage'] }).catch(() => {});
          }
      } catch (_) {}

      try {
          if (process.platform === 'win32') {
              registerWindowsBrowser();
          } else if (process.platform === 'linux') {
              ensureLinuxDesktopEntry();
          }
      } catch (_) {}

      // Silent background sync with GitHub Releases on startup and every 4 hours
      // On Linux non-AppImage installs (.deb/.rpm/.pacman/tarball/flatpak/snap), notify without silently downloading packages.
      const shouldAutoDownloadInBackground = () => {
          if (!app.isPackaged) return false;
          if (process.platform === 'linux') {
              return Boolean(getPlatformInstallInfo().canAutoInstall);
          }
          return true;
      };
      const isAutoUpdateAllowed = () => {
          return settingsStore?.strictOfflineMode !== true && settingsStore?.bgAllowAutoUpdates !== false;
      };
      setTimeout(() => {
          if (!isAutoUpdateAllowed()) {
              debugLog('[AutoUpdater] Silent startup check skipped (Strict Offline / Auto-Updates disabled).');
              return;
          }
          performGitHubUpdateCheck({ silent: true, autoDownload: shouldAutoDownloadInBackground() }).catch((err) => {
              debugLog('[AutoUpdater] Silent startup check skipped/failed:', err?.message || err);
          });
      }, 6000);

      setInterval(() => {
          if (!isAutoUpdateAllowed()) return;
          performGitHubUpdateCheck({ silent: true, autoDownload: shouldAutoDownloadInBackground() }).catch(() => {});
      }, 4 * 60 * 60 * 1000);
  }, 100);
});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle('open-file', async (event, path) => {
      assertTrustedAppShell(event, 'open-file');
      try {
          if (path) {
              const res = await shell.openPath(path);
              return { success: !res, error: res || null };
          }
          return { success: false, error: 'No path provided' };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('copy-image-to-clipboard', async (event, filePath) => {
      try {
          if (!filePath) return { success: false, error: 'No path provided' };
          const img = nativeImage.createFromPath(filePath);
          if (!img.isEmpty()) {
              clipboard.writeImage(img);
              return { success: true };
          }
          return { success: false, error: 'Failed to create image from path' };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('copy-webview-image', async (event, { wcId, x, y, rawX, rawY, srcURL } = {}) => {
      try {
          const wc = wcId ? webContents.fromId(wcId) : null;

          // Clear existing clipboard image so we can reliably detect when copyImageAt succeeds
          clipboard.clear();

          if (wc && !wc.isDestroyed()) {
              const coordsToTry = [];
              if (typeof x === 'number' && typeof y === 'number') {
                  coordsToTry.push([Math.round(x), Math.round(y)]);
              }
              if (typeof rawX === 'number' && typeof rawY === 'number' && (Math.round(rawX) !== Math.round(x) || Math.round(rawY) !== Math.round(y))) {
                  coordsToTry.push([Math.round(rawX), Math.round(rawY)]);
              }

              for (const [cx, cy] of coordsToTry) {
                  try {
                      wc.copyImageAt(cx, cy);
                      for (let i = 0; i < 6; i++) {
                          await new Promise(r => setTimeout(r, 25));
                          const copied = clipboard.readImage();
                          if (copied && !copied.isEmpty()) {
                              return { success: true, method: 'copyImageAt' };
                          }
                      }
                  } catch (err) {
                      console.warn('[CopyWebviewImage] copyImageAt error:', err);
                  }
              }
          }

          if (srcURL) {
              if (srcURL.startsWith('data:image/')) {
                  const img = nativeImage.createFromDataURL(srcURL);
                  if (!img.isEmpty()) {
                      clipboard.writeImage(img);
                      return { success: true, method: 'dataUrl' };
                  }
              }

              const targetSession = (wc && !wc.isDestroyed() && wc.session) ? wc.session : session.defaultSession;
              const resp = await targetSession.fetch(srcURL);
              if (resp && resp.ok) {
                  const ab = await resp.arrayBuffer();
                  const buf = Buffer.from(ab);
                  const img = nativeImage.createFromBuffer(buf);
                  if (!img.isEmpty()) {
                      clipboard.writeImage(img);
                      return { success: true, method: 'fetchBuffer' };
                  }
                  // Return base64 so renderer can decode WebP/AVIF/SVG via HTMLImageElement + Canvas into PNG
                  const mime = resp.headers.get('content-type') || 'image/png';
                  return {
                      success: false,
                      needsCanvasDecode: true,
                      dataUrl: `data:${mime};base64,${buf.toString('base64')}`
                  };
              }
          }

          return { success: false, error: 'Could not copy image to clipboard' };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('write-clipboard-image-dataurl', async (event, dataUrl) => {
      try {
          if (!dataUrl) return { success: false };
          const img = nativeImage.createFromDataURL(dataUrl);
          if (!img.isEmpty()) {
              clipboard.writeImage(img);
              return { success: true };
          }
          return { success: false };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });
  
  ipcMain.handle('show-item-in-folder', async (event, path) => {
      assertTrustedAppShell(event, 'show-item-in-folder');
      try {
          if (path) {
              shell.showItemInFolder(path);
              return { success: true };
          }
          return { success: false, error: 'No path provided' };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  // Download Verification IPC Handlers
  ipcMain.handle('verify-download-file', async (event, filePath) => {
      assertTrustedAppShell(event, 'verify-download-file');
      return await verifyAndChecksumFile(filePath, 0);
  });

  ipcMain.handle('compare-download-checksum', async (event, { filePath, expectedChecksum, algorithm = 'sha256' }) => {
      assertTrustedAppShell(event, 'compare-download-checksum');
      try {
          if (!filePath || !fsSync.existsSync(filePath)) {
              return { matches: false, error: 'File does not exist' };
          }
          const algo = (algorithm || 'sha256').toLowerCase();
          const hash = crypto.createHash(algo);
          const stream = fsSync.createReadStream(filePath);
          await new Promise((resolve, reject) => {
              stream.on('data', chunk => hash.update(chunk));
              stream.on('end', resolve);
              stream.on('error', reject);
          });
          const actualChecksum = hash.digest('hex');
          const cleanExpected = (expectedChecksum || '').trim().toLowerCase();
          const cleanActual = actualChecksum.toLowerCase();
          return {
              matches: cleanExpected === cleanActual,
              actualChecksum: cleanActual,
              expectedChecksum: cleanExpected,
              algorithm: algo.toUpperCase()
          };
      } catch (err) {
          return { matches: false, error: err.message };
      }
  });

  ipcMain.handle('get-file-checksum', async (event, { filePath, algorithm = 'sha256' }) => {
      assertTrustedAppShell(event, 'get-file-checksum');
      try {
          if (!filePath || !fsSync.existsSync(filePath)) {
              return { success: false, error: 'File does not exist' };
          }
          const algo = (algorithm || 'sha256').toLowerCase();
          const checksum = await rustBridge.mediaHashFile(filePath, algo);
          return {
              success: true,
              checksum,
              algorithm: algo.toUpperCase()
          };
      } catch (err) {
          return { success: false, error: err.message };
      }
  });

  ipcMain.handle('delete-download-file', async (event, filePath) => {
      assertTrustedAppShell(event, 'delete-download-file');
      try {
          if (!filePath || typeof filePath !== 'string') {
              return { success: false, error: 'No path specified' };
          }
          if (!fsSync.existsSync(filePath)) {
              return { success: true, removed: false, message: 'File did not exist on disk' };
          }
          try {
              await shell.trashItem(filePath);
              return { success: true, removed: true, method: 'trash' };
          } catch (trashErr) {
              fsSync.unlinkSync(filePath);
              return { success: true, removed: true, method: 'unlink' };
          }
      } catch (err) {
          console.error('[Download Delete] Error:', err);
          return { success: false, error: err.message };
      }
  });

  // OAuth Popup Window IPC Handlers (Find in page, navigation, reload)
  ipcMain.on('oauth-find-in-page', (event, { text, forward = true, findNext = false }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed() && text) {
          win.webContents.findInPage(text, { forward, findNext });
      }
  });

  ipcMain.on('oauth-stop-find-in-page', (event, action = 'clearSelection') => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
          win.webContents.stopFindInPage(action);
      }
  });

  ipcMain.on('oauth-navigate-back', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
          try {
              if (win.webContents.navigationHistory.canGoBack()) {
                  win.webContents.navigationHistory.goBack();
              }
          } catch (_) {}
      }
  });

  ipcMain.on('oauth-navigate-forward', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
          try {
              if (win.webContents.navigationHistory.canGoForward()) {
                  win.webContents.navigationHistory.goForward();
              }
          } catch (_) {}
      }
  });

  ipcMain.on('oauth-reload', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
          win.webContents.reload();
      }
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  try {
    torEngine.stopTor();
  } catch (_) {}
});

// HTTP Basic & Proxy Authentication Handlers
const pendingHttpAuthRequests = {};

app.on('login', (event, webContents, authenticationResponseDetails, authInfo, callback) => {
    event.preventDefault();
    const requestId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    pendingHttpAuthRequests[requestId] = callback;

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('qbrowse-http-auth-request', {
            requestId,
            host: authInfo.host,
            port: authInfo.port,
            realm: authInfo.realm || 'Authentication required',
            isProxy: authInfo.isProxy || false
        });
    } else {
        callback();
    }
});

ipcMain.on('qbrowse-http-auth-response', (event, { requestId, username, password, cancel }) => {
    const callback = pendingHttpAuthRequests[requestId];
    if (callback) {
        delete pendingHttpAuthRequests[requestId];
        if (cancel || (!username && !password)) {
            callback();
        } else {
            callback(username, password);
        }
    }
});

// Webview In-Tab JS Dialogs (Alert, Confirm, Prompt) Close Handler
ipcMain.on('qbrowse-js-dialog-close', (event, { dialogId, accept, promptText }) => {
    debugLog('[Electron Main] qbrowse-js-dialog-close received:', { dialogId, accept, promptText });

    // 1. Resolve synchronous HTTP bridge dialogs
    const pendingHttp = pendingPromptResponses.get(dialogId);
    if (pendingHttp) {
        pendingPromptResponses.delete(dialogId);
        try {
            pendingHttp.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            pendingHttp.end(JSON.stringify({
                cancelled: !accept,
                value: accept ? (promptText !== undefined ? String(promptText) : '') : null
            }));
            debugLog('[Electron Main] Responded to synchronous HTTP dialog:', dialogId, { accept, promptText });
        } catch (e) {
            console.error('[Electron Main] Error responding to HTTP dialog:', e);
        }
        return;
    }

    // 2. Resolve Electron dialog.showMessageBox fallback
    const dialog = activeWebviewDialogs.get(dialogId);
    if (dialog) {
        activeWebviewDialogs.delete(dialogId);
        if (typeof dialog.resolve === 'function') {
            dialog.resolve({ response: accept ? 0 : 1, checkboxChecked: false });
            debugLog('[Electron Main] Resolved showMessageBox fallback:', dialogId);
        }
        return;
    }

    console.warn('[Electron Main] No active dialog found for dialogId:', dialogId);
});

app.on('will-quit', () => {
  try {
    const ghostSess = session.fromPartition('ghost');
    if (ghostSess) {
      ghostSess.clearStorageData().catch(() => {});
      ghostSess.clearCache().catch(() => {});
    }
  } catch (_) {}
  try {
    const torSess = session.fromPartition('tor');
    if (torSess) {
      torSess.clearStorageData().catch(() => {});
      torSess.clearCache().catch(() => {});
    }
  } catch (_) {}
  try {
    torEngine.stopTor();
  } catch (_) {}
  if (settingsStore.clearOnExit) {
    try {
      session.defaultSession.clearStorageData({ storages: ['cookies'] }).catch(() => {});
    } catch (_) {}
  }
});

// IPC Handlers
ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) win.minimize();
});
ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) {
        toggleMaximizeSmooth(win);
    }
});
ipcMain.on('window-set-fullscreen', (event, state) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) win.setFullScreen(state);
});
ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) win.close();
});
ipcMain.handle('window-get-focus-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    return getWindowFocusState(win);
});
ipcMain.on('window-drag-by', (event, { deltaX, deltaY }) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win && !win.isDestroyed() && !win.isMaximized()) {
        const [x, y] = win.getPosition();
        win.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
    }
});
ipcMain.on('open-devtools', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) || mainWindow;
    if (win) win.webContents.openDevTools();
});

// Native OS Window Corner Curvature Adaptation (Windows 11 DWM)
let currentWindowCornerPreference = 'default';

function applyWindowCornerPreference(win, preference) {
    if (!win || win.isDestroyed() || process.platform !== 'win32') return;
    try {
        currentWindowCornerPreference = preference || currentWindowCornerPreference;
        const hwndBuf = win.getNativeWindowHandle();
        if (!hwndBuf || hwndBuf.length < 4) return;

        const hwndVal = hwndBuf.length >= 8
            ? Number(hwndBuf.readBigInt64LE(0))
            : hwndBuf.readInt32LE(0);

        const mode = String(currentWindowCornerPreference || 'default').toLowerCase();
        let prefCode = 2; // DWMWCP_ROUND ('default' / 'rounded')
        if (mode === 'square' || mode === 'sharp') {
            prefCode = 1; // DWMWCP_DONOTROUND
        } else if (mode === 'cohesive' || mode === 'small') {
            prefCode = 3; // DWMWCP_ROUNDSMALL
        }

        if (Number.isFinite(hwndVal) && hwndVal > 0) {
            rustBridge.sysSetWindowRoundedCorners(hwndVal, prefCode);
        }
    } catch (err) {
        console.warn('[DWM] Failed to set window corner preference:', err.message);
    }
}

ipcMain.handle('window-set-corner-preference', (event, preference) => {
    currentWindowCornerPreference = preference || 'default';
    for (const win of browserWindows) {
        applyWindowCornerPreference(win, currentWindowCornerPreference);
    }
    return { success: true, preference: currentWindowCornerPreference };
});

ipcMain.handle('get-hardware-specs', () => {
    const os = require('os');
    return {
        threads: os.cpus().length,
        totalMemoryGB: Math.round(os.totalmem() / (1024 * 1024 * 1024))
    };
});

// Auto-Updater & GitHub Releases Synchronization Engine
const https = require('https');
const updaterHttpsAgent = new https.Agent({
    keepAlive: true
});

const GITHUB_OWNER = 'Qu-Bi';
const GITHUB_REPO = 'QBrowse';
const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASES_WEB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

function getPlatformInstallInfo() {
    if (process.platform === 'linux') {
        const info = detectLinuxInstallType({
            env: process.env,
            execPath: process.execPath,
            arch: process.arch
        });
        return {
            ...info,
            installCommand: info.managedExternally
                ? buildLinuxInstallCommand(info.installType, '', info)
                : null
        };
    }
    if (process.platform === 'win32') {
        return {
            installType: 'nsis',
            arch: process.arch,
            canAutoInstall: true,
            managedExternally: false,
            label: 'Windows Installer (.exe)',
            shortLabel: '.exe',
            packageExt: '.exe',
            appImagePath: null,
            installCommand: null
        };
    }
    return {
        installType: process.platform,
        arch: process.arch,
        canAutoInstall: false,
        managedExternally: false,
        label: process.platform === 'darwin' ? 'macOS' : process.platform,
        shortLabel: process.platform === 'darwin' ? '.dmg' : process.platform,
        packageExt: process.platform === 'darwin' ? '.dmg' : null,
        appImagePath: null,
        installCommand: null
    };
}

const initialInstallInfo = getPlatformInstallInfo();

const updaterState = {
    status: 'idle', // 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    currentVersion: app.getVersion(),
    latestVersion: null,
    version: app.getVersion(),
    releaseName: null,
    releaseDate: null,
    releaseNotes: null,
    releaseUrl: GITHUB_RELEASES_WEB_URL,
    assetName: null,
    assetUrl: null,
    assetSize: 0,
    expectedSha512: null,
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0,
    downloadedFilePath: null,
    downloadMethod: null, // 'github-direct' | 'electron-updater'
    lastCheckedAt: null,
    syncedWithGitHub: false,
    message: null,
    silent: false,
    isPackaged: app.isPackaged,
    edition: APP_EDITION,
    platform: process.platform,
    arch: process.arch,
    installType: initialInstallInfo.installType,
    installLabel: initialInstallInfo.label,
    installShortLabel: initialInstallInfo.shortLabel,
    packageExt: initialInstallInfo.packageExt,
    canAutoInstall: initialInstallInfo.canAutoInstall,
    managedExternally: initialInstallInfo.managedExternally,
    installCommand: initialInstallInfo.installCommand,
    runtimeVersions: {
        app: app.getVersion(),
        electron: process.versions.electron || '',
        chrome: process.versions.chrome || '',
        node: process.versions.node || '',
        v8: process.versions.v8 || ''
    }
};

let activeCheckPromise = null;
let activeDownloadPromise = null;
let isInstallingUpdate = false;

function updateAndBroadcastState(eventName, patch = {}) {
    const installInfo = getPlatformInstallInfo();
    Object.assign(updaterState, patch, {
        currentVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        installType: installInfo.installType,
        installLabel: installInfo.label,
        installShortLabel: installInfo.shortLabel,
        packageExt: installInfo.packageExt,
        canAutoInstall: installInfo.canAutoInstall,
        managedExternally: installInfo.managedExternally,
        runtimeVersions: {
            app: app.getVersion(),
            electron: process.versions.electron || '',
            chrome: process.versions.chrome || '',
            node: process.versions.node || '',
            v8: process.versions.v8 || ''
        }
    });
    if (patch.installCommand === undefined && installInfo.managedExternally) {
        updaterState.installCommand = installInfo.installCommand;
    }
    const payload = { event: eventName, ...updaterState };
    for (const win of browserWindows) {
        if (win && !win.isDestroyed()) {
            try {
                win.webContents.send('updater-event', payload);
            } catch (_) {}
        }
    }
    return payload;
}

function httpGetBuffer(targetUrl, { timeoutMs = 15000, maxRedirects = 5, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const requestUrl = (urlStr, redirectsLeft) => {
            let parsed;
            try {
                parsed = new URL(urlStr);
            } catch (err) {
                return reject(new Error(`Invalid URL: ${urlStr}`));
            }
            const client = parsed.protocol === 'http:' ? http : https;
            const req = client.get(urlStr, {
                headers: {
                    'User-Agent': `QBrowse-Updater/${app.getVersion()} (${process.platform}; ${process.arch})`,
                    'Accept': 'application/vnd.github+json, application/octet-stream, text/plain, */*',
                    ...headers
                },
                agent: parsed.protocol === 'https:' ? updaterHttpsAgent : undefined,
                timeout: timeoutMs
            }, (res) => {
                if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                    res.resume();
                    if (redirectsLeft <= 0) {
                        return reject(new Error('Too many redirects while contacting GitHub Releases'));
                    }
                    const nextUrl = new URL(res.headers.location, urlStr).toString();
                    return requestUrl(nextUrl, redirectsLeft - 1);
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    const chunks = [];
                    res.on('data', c => chunks.push(c));
                    res.on('end', () => {
                        const bodyText = Buffer.concat(chunks).toString('utf8').slice(0, 300);
                        const err = new Error(`HTTP ${res.statusCode} from ${parsed.hostname}${bodyText ? `: ${bodyText}` : ''}`);
                        err.statusCode = res.statusCode;
                        reject(err);
                    });
                    return;
                }
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve({
                    buffer: Buffer.concat(chunks),
                    finalUrl: urlStr,
                    headers: res.headers
                }));
                res.on('error', reject);
            });
            req.on('timeout', () => {
                req.destroy(new Error(`Request timed out (${timeoutMs}ms)`));
            });
            req.on('error', reject);
        };
        requestUrl(targetUrl, maxRedirects);
    });
}

function parseReleaseYaml(yamlText) {
    if (!yamlText || typeof yamlText !== 'string') return null;
    const result = {
        version: null,
        path: null,
        sha512: null,
        releaseDate: null,
        files: []
    };
    const lines = yamlText.split(/\r?\n/);
    let currentFile = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('- url:')) {
            if (currentFile) result.files.push(currentFile);
            currentFile = {
                url: line.replace(/^- url:\s*/, '').replace(/^['"]|['"]$/g, '').trim(),
                sha512: null,
                size: 0
            };
            continue;
        }
        if (currentFile && (rawLine.startsWith('  ') || rawLine.startsWith('\t'))) {
            const shaMatch = line.match(/^sha512:\s*(.+)$/);
            if (shaMatch) {
                currentFile.sha512 = shaMatch[1].replace(/^['"]|['"]$/g, '').trim();
                continue;
            }
            const sizeMatch = line.match(/^size:\s*(\d+)/);
            if (sizeMatch) {
                currentFile.size = parseInt(sizeMatch[1], 10) || 0;
                continue;
            }
        } else if (currentFile) {
            result.files.push(currentFile);
            currentFile = null;
        }

        const verMatch = line.match(/^version:\s*(.+)$/);
        if (verMatch) {
            result.version = normalizeSemver(verMatch[1].replace(/^['"]|['"]$/g, ''));
            continue;
        }
        const pathMatch = line.match(/^path:\s*(.+)$/);
        if (pathMatch) {
            result.path = pathMatch[1].replace(/^['"]|['"]$/g, '').trim();
            continue;
        }
        const rootShaMatch = line.match(/^sha512:\s*(.+)$/);
        if (rootShaMatch) {
            result.sha512 = rootShaMatch[1].replace(/^['"]|['"]$/g, '').trim();
            continue;
        }
        const dateMatch = line.match(/^releaseDate:\s*(.+)$/);
        if (dateMatch) {
            result.releaseDate = dateMatch[1].replace(/^['"]|['"]$/g, '').trim();
        }
    }
    if (currentFile) result.files.push(currentFile);
    return result.version ? result : null;
}

function selectBestPlatformAsset(assets = [], version = '', ymlData = null) {
    const validAssets = Array.isArray(assets)
        ? assets.filter(a => a && a.name && a.browser_download_url)
        : [];

    if (process.platform === 'win32') {
        return selectWindowsReleaseAsset(validAssets, ymlData);
    }

    if (process.platform === 'linux') {
        const installInfo = getPlatformInstallInfo();
        return selectLinuxReleaseAsset(validAssets, installInfo.installType, process.arch, ymlData);
    }

    // Fallback for macOS / other platforms
    const dmgOrZip = validAssets.find(a => /\.(dmg|zip|pkg)$/i.test(a.name));
    if (dmgOrZip) {
        return {
            name: dmgOrZip.name,
            url: dmgOrZip.browser_download_url,
            size: dmgOrZip.size || 0,
            sha512: ymlData?.sha512 || null
        };
    }
    return null;
}

async function fetchGitHubReleaseSyncData() {
    const defaultLinuxYml = 'latest-linux.yml';
    const ymlFileName = process.platform === 'linux'
        ? getLinuxMetadataFileName(process.arch)
        : 'latest.yml';
    let releaseObj = null;

    // 1. Primary: Query GitHub Releases REST API
    try {
        const { buffer } = await httpGetBuffer(`${GITHUB_RELEASES_API}?per_page=10`, { timeoutMs: 12000 });
        const releases = JSON.parse(buffer.toString('utf8'));
        if (Array.isArray(releases) && releases.length > 0) {
            const published = releases.filter(r => r && !r.draft && !r.prerelease && r.tag_name);
            published.sort((a, b) => compareSemver(b.tag_name, a.tag_name));
            releaseObj = published[0] || releases.find(r => r && !r.draft && r.tag_name) || null;
        }
    } catch (apiErr) {
        console.warn('[AutoUpdater] GitHub /releases API query warning:', apiErr.message);
        try {
            const { buffer } = await httpGetBuffer(GITHUB_LATEST_RELEASE_API, { timeoutMs: 10000 });
            const latest = JSON.parse(buffer.toString('utf8'));
            if (latest && latest.tag_name) releaseObj = latest;
        } catch (latestErr) {
            console.warn('[AutoUpdater] GitHub /releases/latest fallback warning:', latestErr.message);
        }
    }

    // 2. If GitHub REST API succeeded, also fetch edition-specific YML metadata for SHA-512 verification
    if (releaseObj && releaseObj.tag_name) {
        const latestVersion = normalizeSemver(releaseObj.tag_name);
        const assets = Array.isArray(releaseObj.assets) ? releaseObj.assets : [];
        let ymlData = null;

        const ymlAsset = assets.find(a => a && a.name === ymlFileName)
            || (process.platform === 'linux' ? assets.find(a => a && a.name === defaultLinuxYml) : null);
        if (ymlAsset && ymlAsset.browser_download_url) {
            try {
                const { buffer } = await httpGetBuffer(ymlAsset.browser_download_url, { timeoutMs: 10000 });
                ymlData = parseReleaseYaml(buffer.toString('utf8'));
            } catch (e) {
                console.warn(`[AutoUpdater] Could not fetch ${ymlAsset.name}:`, e.message);
            }
        }

        const bestAsset = selectBestPlatformAsset(assets, latestVersion, ymlData);

        return {
            latestVersion,
            tagName: releaseObj.tag_name,
            releaseName: releaseObj.name || `QBrowse v${latestVersion}`,
            releaseDate: releaseObj.published_at || releaseObj.created_at || ymlData?.releaseDate || null,
            releaseNotes: releaseObj.body || '',
            releaseUrl: releaseObj.html_url || `${GITHUB_RELEASES_WEB_URL}/tag/${releaseObj.tag_name}`,
            asset: bestAsset,
            allAssets: assets.map(a => ({
                name: a.name,
                url: a.browser_download_url,
                size: a.size || 0
            }))
        };
    }

    // 3. Rate-limit resilient fallback: Fetch edition YML directly via github.com release redirect
    let ymlResp = null;
    const directCandidates = process.platform === 'linux' && ymlFileName !== defaultLinuxYml
        ? [ymlFileName, defaultLinuxYml]
        : [ymlFileName];
    let lastYmlErr = null;
    for (const candidateYml of directCandidates) {
        try {
            const directYmlUrl = `${GITHUB_RELEASES_WEB_URL}/latest/download/${candidateYml}`;
            ymlResp = await httpGetBuffer(directYmlUrl, { timeoutMs: 12000 });
            break;
        } catch (err) {
            lastYmlErr = err;
        }
    }
    if (!ymlResp) {
        throw lastYmlErr || new Error('Unable to contact GitHub Releases metadata');
    }
    const { buffer, finalUrl } = ymlResp;
    const ymlData = parseReleaseYaml(buffer.toString('utf8'));
    if (!ymlData || !ymlData.version) {
        throw new Error('Unable to parse release metadata from GitHub Releases');
    }

    const latestVersion = normalizeSemver(ymlData.version);
    const tagMatch = finalUrl.match(/\/releases\/download\/([^/]+)\//);
    const tagName = tagMatch ? tagMatch[1] : `v${latestVersion}`;

    const installInfo = getPlatformInstallInfo();
    if (process.platform === 'linux' && installInfo.managedExternally) {
        return {
            latestVersion,
            tagName,
            releaseName: `QBrowse v${latestVersion}`,
            releaseDate: ymlData.releaseDate || null,
            releaseNotes: '',
            releaseUrl: `${GITHUB_RELEASES_WEB_URL}/tag/${tagName}`,
            asset: null,
            allAssets: []
        };
    }

    // Build candidate asset names (supports hyphenated/dotted Windows names & Linux install formats)
    const candidateNames = [];
    if (process.platform === 'linux') {
        const normArch = normalizeLinuxArch(process.arch);
        const debArch = normArch === 'arm64' ? 'arm64' : 'amd64';
        const rpmArch = normArch === 'arm64' ? 'aarch64' : 'x86_64';
        const appImageArch = normArch === 'arm64' ? 'arm64' : 'x86_64';

        if (installInfo.installType === 'deb') {
            candidateNames.push(`qbrowse_${latestVersion}_${debArch}.deb`);
        } else if (installInfo.installType === 'rpm') {
            candidateNames.push(`qbrowse-${latestVersion}.${rpmArch}.rpm`);
        } else if (installInfo.installType === 'pacman') {
            candidateNames.push(
                `qbrowse-${latestVersion}-${normArch}.pacman`,
                `qbrowse-${latestVersion}.pacman`
            );
        } else if (installInfo.installType === 'tarball') {
            candidateNames.push(
                `QBrowse-${latestVersion}-${normArch}.tar.gz`,
                `qbrowse-${latestVersion}.tar.gz`
            );
        } else {
            if (ymlData.path) candidateNames.push(ymlData.path);
            candidateNames.push(
                `QBrowse-${latestVersion}-${appImageArch}.AppImage`,
                `QBrowse-${latestVersion}.AppImage`
            );
        }
    } else if (ymlData.path) {
        candidateNames.push(ymlData.path);
        const dotted = ymlData.path.replace(/-Setup-/g, '.Setup.').replace(/\s+/g, '.');
        if (dotted !== ymlData.path) candidateNames.push(dotted);
        const hyphenated = ymlData.path.replace(/\.Setup\./g, '-Setup-').replace(/\s+/g, '-');
        if (hyphenated !== ymlData.path && !candidateNames.includes(hyphenated)) candidateNames.push(hyphenated);
    } else if (process.platform === 'win32') {
        candidateNames.push(
            `QBrowse-Setup-${latestVersion}-x64.exe`,
            `QBrowse-Setup-${latestVersion}.exe`,
            `QBrowse.Setup.${latestVersion}.exe`
        );
    }

    const chosenName = candidateNames[0] || `QBrowse-${latestVersion}`;
    const chosenUrl = `${GITHUB_RELEASES_WEB_URL}/download/${tagName}/${chosenName}`;

    return {
        latestVersion,
        tagName,
        releaseName: `QBrowse v${latestVersion}`,
        releaseDate: ymlData.releaseDate || null,
        releaseNotes: '',
        releaseUrl: `${GITHUB_RELEASES_WEB_URL}/tag/${tagName}`,
        asset: {
            name: chosenName,
            url: chosenUrl,
            size: (process.platform === 'linux' && installInfo.installType !== 'appimage') ? 0 : (ymlData.files?.[0]?.size || 0),
            sha512: (process.platform === 'linux' && installInfo.installType !== 'appimage') ? null : (ymlData.sha512 || null),
            alternateUrls: candidateNames.slice(1).map(n => `${GITHUB_RELEASES_WEB_URL}/download/${tagName}/${n}`)
        },
        allAssets: []
    };
}

async function computeFileSha512Base64(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha512');
        const stream = fsSync.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('base64')));
        stream.on('error', reject);
    });
}

async function tryNativeElectronUpdaterDownload({ silent = false } = {}) {
    const isWin = process.platform === 'win32';
    const isLinuxAppImage = process.platform === 'linux' && Boolean(process.env.APPIMAGE);
    if ((!isWin && !isLinuxAppImage) || !app.isPackaged || !autoUpdater) {
        return null;
    }
    const onProgress = (progressObj) => {
        updateAndBroadcastState('download-progress', {
            status: 'downloading',
            version: updaterState.latestVersion || updaterState.version,
            percent: Math.min(99, Math.round(progressObj?.percent || 0)),
            bytesPerSecond: Math.round(progressObj?.bytesPerSecond || 0),
            transferred: progressObj?.transferred || 0,
            total: progressObj?.total || updaterState.assetSize || 0,
            silent
        });
    };
    try {
        autoUpdater.on('download-progress', onProgress);
        const checkResult = await autoUpdater.checkForUpdates();
        if (!checkResult || !checkResult.updateInfo || compareSemver(checkResult.updateInfo.version, app.getVersion()) <= 0) {
            return null;
        }
        const downloadedFiles = await autoUpdater.downloadUpdate();
        const downloadedPath = Array.isArray(downloadedFiles) ? downloadedFiles[0] : (typeof downloadedFiles === 'string' ? downloadedFiles : null);
        if (downloadedPath && fsSync.existsSync(downloadedPath)) {
            const stat = await fs.stat(downloadedPath);
            updateAndBroadcastState('update-downloaded', {
                status: 'downloaded',
                version: normalizeSemver(checkResult.updateInfo.version) || updaterState.latestVersion || updaterState.version,
                percent: 100,
                bytesPerSecond: 0,
                transferred: stat.size,
                total: stat.size,
                downloadedFilePath: downloadedPath,
                downloadMethod: 'electron-updater',
                installCommand: isLinuxAppImage ? buildLinuxInstallCommand('appimage', downloadedPath) : null,
                message: null,
                silent
            });
            return { status: 'downloaded', filePath: downloadedPath, version: updaterState.latestVersion, downloadMethod: 'electron-updater' };
        }
        return null;
    } catch (err) {
        console.warn('[AutoUpdater] Native electron-updater delta download failed, falling back to GitHub Releases direct download:', err?.message || err);
        return null;
    } finally {
        try { autoUpdater.removeListener('download-progress', onProgress); } catch (_) {}
    }
}

async function downloadGitHubUpdateAsset({ silent = false } = {}) {
    if (activeDownloadPromise) return activeDownloadPromise;

    activeDownloadPromise = (async () => {
        try {
            const installInfo = getPlatformInstallInfo();
            if (process.platform === 'linux' && installInfo.managedExternally) {
                return {
                    status: 'managed-externally',
                    installType: installInfo.installType,
                    installCommand: installInfo.installCommand,
                    releaseUrl: updaterState.releaseUrl
                };
            }

            if (!updaterState.assetUrl || !updaterState.assetName) {
                await performGitHubUpdateCheck({ silent: true, autoDownload: false });
            }
            if (!updaterState.assetUrl || !updaterState.assetName) {
                throw new Error(`No compatible ${installInfo.shortLabel || ''} package found for ${process.platform}/${process.arch} on GitHub Releases`.trim());
            }

            // On Windows (NSIS .blockmap) and Linux AppImage, try electron-updater's native differential updater first;
            // if latest.yml/latest-linux.yml or .blockmap is missing/404 or fails, fall back cleanly to direct GitHub download + SHA-512 verification.
            const supportsNativeDelta = process.platform === 'win32'
                || (process.platform === 'linux' && installInfo.installType === 'appimage' && installInfo.canAutoInstall);
            if (supportsNativeDelta && app.isPackaged && autoUpdater) {
                updateAndBroadcastState('download-progress', {
                    status: 'downloading',
                    version: updaterState.latestVersion || updaterState.version,
                    percent: 0,
                    bytesPerSecond: 0,
                    transferred: 0,
                    total: updaterState.assetSize || 0,
                    silent
                });
                const nativeResult = await tryNativeElectronUpdaterDownload({ silent });
                if (nativeResult) {
                    return nativeResult;
                }
            }

            // Save non-AppImage Linux packages (.deb/.rpm/.pacman/.tar.gz) to the user's Downloads folder
            // so users can easily inspect, double-click, or install them via package manager.
            let targetDir = path.join(app.getPath('userData'), 'updates');
            if (process.platform === 'linux' && !installInfo.canAutoInstall) {
                try {
                    const dlDir = app.getPath('downloads');
                    if (dlDir) targetDir = dlDir;
                } catch (_) {}
            }
            await fs.mkdir(targetDir, { recursive: true });

            const safeFileName = sanitizeUpdateFileName(updaterState.assetName, `QBrowse-${updaterState.latestVersion || 'update'}.bin`);
            const finalFilePath = path.join(targetDir, safeFileName);
            const partFilePath = `${finalFilePath}.part`;
            const resolvedInstallCommand = process.platform === 'linux'
                ? buildLinuxInstallCommand(installInfo.installType, finalFilePath, installInfo)
                : null;

            // Check if already downloaded and verified on disk
            if (fsSync.existsSync(finalFilePath)) {
                try {
                    const stat = await fs.stat(finalFilePath);
                    const sizeMatches = !updaterState.assetSize || stat.size === updaterState.assetSize;
                    let hashMatches = true;
                    if (sizeMatches && updaterState.expectedSha512) {
                        const actualSha = await computeFileSha512Base64(finalFilePath);
                        hashMatches = (actualSha === updaterState.expectedSha512);
                    }
                    if (stat.size > 1024 * 1024 && sizeMatches && hashMatches) {
                        if (process.platform === 'linux' && finalFilePath.toLowerCase().endsWith('.appimage')) {
                            try { await fs.chmod(finalFilePath, 0o755); } catch (_) {}
                        }
                        updateAndBroadcastState('update-downloaded', {
                            status: 'downloaded',
                            version: updaterState.latestVersion || updaterState.version,
                            percent: 100,
                            transferred: stat.size,
                            total: stat.size,
                            downloadedFilePath: finalFilePath,
                            downloadMethod: 'github-direct',
                            installCommand: resolvedInstallCommand,
                            silent
                        });
                        return { status: 'downloaded', filePath: finalFilePath, installCommand: resolvedInstallCommand };
                    }
                } catch (_) {}
            }

            updateAndBroadcastState('download-progress', {
                status: 'downloading',
                version: updaterState.latestVersion || updaterState.version,
                percent: 0,
                bytesPerSecond: 0,
                transferred: 0,
                total: updaterState.assetSize || 0,
                silent
            });

            const urlsToTry = [updaterState.assetUrl];
            if (Array.isArray(updaterState.alternateAssetUrls)) {
                for (const alt of updaterState.alternateAssetUrls) {
                    if (alt && !urlsToTry.includes(alt)) urlsToTry.push(alt);
                }
            }
            // Also add hyphen/dot fallback URL in case asset name differs
            if (updaterState.assetUrl.includes('-Setup-')) {
                urlsToTry.push(updaterState.assetUrl.replace(/-Setup-/g, '.Setup.'));
            } else if (updaterState.assetUrl.includes('.Setup.')) {
                urlsToTry.push(updaterState.assetUrl.replace(/\.Setup\./g, '-Setup-'));
            }

            let downloadedOk = false;
            let lastErr = null;

            for (const candidateUrl of urlsToTry) {
                try {
                    await streamDownloadToFile(candidateUrl, partFilePath, updaterState.expectedSha512, silent);
                    downloadedOk = true;
                    break;
                } catch (err) {
                    lastErr = err;
                    console.warn('[AutoUpdater] Download attempt failed for', candidateUrl, ':', err.message);
                }
            }

            if (!downloadedOk) {
                throw lastErr || new Error('Failed to download update installer from GitHub Releases');
            }

            try {
                if (fsSync.existsSync(finalFilePath)) {
                    await fs.unlink(finalFilePath);
                }
            } catch (_) {}
            await fs.rename(partFilePath, finalFilePath);

            if (process.platform === 'linux' && finalFilePath.toLowerCase().endsWith('.appimage')) {
                try { await fs.chmod(finalFilePath, 0o755); } catch (_) {}
            }

            const finalStat = await fs.stat(finalFilePath);
            updateAndBroadcastState('update-downloaded', {
                status: 'downloaded',
                version: updaterState.latestVersion || updaterState.version,
                percent: 100,
                bytesPerSecond: 0,
                transferred: finalStat.size,
                total: finalStat.size,
                downloadedFilePath: finalFilePath,
                downloadMethod: 'github-direct',
                installCommand: resolvedInstallCommand,
                message: null,
                silent
            });

            debugLog('[AutoUpdater] Update downloaded and verified at:', finalFilePath);
            return { status: 'downloaded', filePath: finalFilePath, version: updaterState.latestVersion, installCommand: resolvedInstallCommand };
        } catch (err) {
            console.error('[AutoUpdater] Download error:', err);
            updateAndBroadcastState('error', {
                status: 'error',
                message: err?.message || String(err),
                silent
            });
            return { status: 'error', message: err?.message || String(err) };
        } finally {
            activeDownloadPromise = null;
        }
    })();

    return activeDownloadPromise;
}

function streamDownloadToFile(targetUrl, destinationPath, expectedSha512, silent = false) {
    return new Promise((resolve, reject) => {
        const downloadWithRedirects = (urlStr, redirectsLeft) => {
            let parsed;
            try {
                parsed = new URL(urlStr);
            } catch (e) {
                return reject(new Error(`Invalid asset URL: ${urlStr}`));
            }
            const client = parsed.protocol === 'http:' ? http : https;
            const req = client.get(urlStr, {
                headers: {
                    'User-Agent': `QBrowse-Updater/${app.getVersion()} (${process.platform}; ${process.arch})`,
                    'Accept': 'application/octet-stream, */*'
                },
                agent: parsed.protocol === 'https:' ? updaterHttpsAgent : undefined,
                timeout: 30000
            }, (res) => {
                if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                    res.resume();
                    if (redirectsLeft <= 0) {
                        return reject(new Error('Too many redirects while downloading update'));
                    }
                    const nextUrl = new URL(res.headers.location, urlStr).toString();
                    return downloadWithRedirects(nextUrl, redirectsLeft - 1);
                }

                if (res.statusCode < 200 || res.statusCode >= 300) {
                    res.resume();
                    const err = new Error(`GitHub asset download returned HTTP ${res.statusCode}`);
                    err.statusCode = res.statusCode;
                    return reject(err);
                }

                const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || updaterState.assetSize || 0;
                let transferredBytes = 0;
                const startTime = Date.now();
                let lastBroadcastTime = 0;
                const hash = crypto.createHash('sha512');
                const fileStream = fsSync.createWriteStream(destinationPath);

                res.on('data', (chunk) => {
                    transferredBytes += chunk.length;
                    hash.update(chunk);
                    const now = Date.now();
                    if (now - lastBroadcastTime >= 150 || (totalBytes > 0 && transferredBytes >= totalBytes)) {
                        lastBroadcastTime = now;
                        const elapsedSec = Math.max((now - startTime) / 1000, 0.1);
                        const speed = Math.round(transferredBytes / elapsedSec);
                        const pct = totalBytes > 0 ? Math.min(99, Math.round((transferredBytes / totalBytes) * 100)) : 0;
                        updateAndBroadcastState('download-progress', {
                            status: 'downloading',
                            version: updaterState.latestVersion || updaterState.version,
                            percent: pct,
                            bytesPerSecond: speed,
                            transferred: transferredBytes,
                            total: totalBytes,
                            silent
                        });
                    }
                });

                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close(() => {
                        const actualSha512 = hash.digest('base64');
                        if (expectedSha512 && actualSha512 !== expectedSha512) {
                            try { fsSync.unlinkSync(destinationPath); } catch (_) {}
                            return reject(new Error('Downloaded update failed SHA-512 integrity check'));
                        }
                        resolve({ transferredBytes, actualSha512 });
                    });
                });

                fileStream.on('error', (err) => {
                    res.destroy();
                    try { fsSync.unlinkSync(destinationPath); } catch (_) {}
                    reject(err);
                });

                res.on('error', (err) => {
                    fileStream.destroy();
                    try { fsSync.unlinkSync(destinationPath); } catch (_) {}
                    reject(err);
                });
            });

            req.on('timeout', () => {
                req.destroy(new Error('Update download connection timed out'));
            });
            req.on('error', reject);
        };

        downloadWithRedirects(targetUrl, 6);
    });
}

async function performGitHubUpdateCheck({ silent = false, autoDownload = true } = {}) {
    if (silent && (settingsStore?.strictOfflineMode === true || settingsStore?.bgAllowAutoUpdates === false)) {
        return { ...updaterState };
    }
    if (activeCheckPromise) return activeCheckPromise;
    if (updaterState.status === 'downloading') {
        return updaterState;
    }

    activeCheckPromise = (async () => {
        try {
            updateAndBroadcastState('checking-for-update', {
                status: 'checking',
                message: null,
                silent
            });

            const syncData = await fetchGitHubReleaseSyncData();
            const currentVer = app.getVersion();
            const latestVer = syncData.latestVersion;
            const isNewer = compareSemver(latestVer, currentVer) > 0;

            const installInfo = getPlatformInstallInfo();
            const suggestedInstallCmd = process.platform === 'linux'
                ? buildLinuxInstallCommand(
                    installInfo.installType,
                    installInfo.managedExternally ? '' : (syncData.asset?.name || ''),
                    installInfo
                )
                : null;

            const commonMeta = {
                currentVersion: currentVer,
                latestVersion: latestVer,
                version: latestVer,
                releaseName: syncData.releaseName,
                releaseDate: syncData.releaseDate,
                releaseNotes: syncData.releaseNotes,
                releaseUrl: syncData.releaseUrl,
                assetName: syncData.asset?.name || null,
                assetUrl: syncData.asset?.url || null,
                alternateAssetUrls: syncData.asset?.alternateUrls || [],
                assetSize: syncData.asset?.size || 0,
                expectedSha512: syncData.asset?.sha512 || null,
                installCommand: suggestedInstallCmd,
                lastCheckedAt: Date.now(),
                syncedWithGitHub: true,
                message: null,
                silent
            };

            if (isNewer) {
                // Check if already downloaded on disk
                if (updaterState.downloadedFilePath && fsSync.existsSync(updaterState.downloadedFilePath) && updaterState.version === latestVer) {
                    const existingCmd = process.platform === 'linux'
                        ? buildLinuxInstallCommand(installInfo.installType, updaterState.downloadedFilePath, installInfo)
                        : null;
                    return updateAndBroadcastState('update-downloaded', {
                        ...commonMeta,
                        installCommand: existingCmd || suggestedInstallCmd,
                        status: 'downloaded',
                        percent: 100
                    });
                }

                updateAndBroadcastState('update-available', {
                    ...commonMeta,
                    status: 'available',
                    percent: 0
                });

                const canAutoDownloadNow = autoDownload && syncData.asset?.url && (process.platform !== 'linux' || installInfo.canAutoInstall);
                if (canAutoDownloadNow) {
                    downloadGitHubUpdateAsset({ silent }).catch((err) => {
                        console.warn('[AutoUpdater] Auto-download failed:', err?.message || err);
                    });
                }

                return { ...updaterState };
            } else {
                updateAndBroadcastState('update-not-available', {
                    ...commonMeta,
                    status: 'not-available',
                    version: currentVer
                });
                return { ...updaterState };
            }
        } catch (err) {
            console.warn('[AutoUpdater] GitHub Release check error:', err?.message || err);
            updateAndBroadcastState('error', {
                status: 'error',
                message: err?.message || 'Unable to sync with GitHub Releases',
                silent
            });
            return { ...updaterState };
        } finally {
            activeCheckPromise = null;
        }
    })();

    return activeCheckPromise;
}

async function installDownloadedUpdate() {
    if (isInstallingUpdate) return { status: 'installing' };

    const filePath = updaterState.downloadedFilePath;
    if (filePath && fsSync.existsSync(filePath)) {
        isInstallingUpdate = true;
        try {
            if (process.platform === 'win32') {
                if (updaterState.downloadMethod === 'electron-updater' && autoUpdater && app.isPackaged) {
                    try {
                        autoUpdater.quitAndInstall(true, true);
                        return { status: 'installing' };
                    } catch (nativeErr) {
                        console.warn('[AutoUpdater] Native Windows quitAndInstall failed, falling back to NSIS spawn:', nativeErr.message);
                    }
                }

                const args = ['/S', '--updated', '--force-run'];
                const launchInstaller = () => new Promise((resolve, reject) => {
                    const child = spawn(filePath, args, {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: false
                    });
                    child.once('error', reject);
                    child.once('spawn', () => {
                        child.unref();
                        resolve(true);
                    });
                });

                try {
                    await launchInstaller();
                } catch (spawnErr) {
                    console.warn('[AutoUpdater] Direct NSIS spawn failed, trying elevate/shell:', spawnErr.message);
                    const elevatePath = path.join(process.resourcesPath || '', 'elevate.exe');
                    if (fsSync.existsSync(elevatePath)) {
                        const elevated = spawn(elevatePath, [filePath, ...args], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        elevated.unref();
                    } else {
                        await shell.openPath(filePath);
                    }
                }

                setTimeout(() => {
                    try {
                        app.removeAllListeners('window-all-closed');
                        for (const win of BrowserWindow.getAllWindows()) {
                            if (win && !win.isDestroyed()) win.destroy();
                        }
                    } catch (_) {}
                    app.quit();
                }, 250);
                return { status: 'installing' };
            }

            if (process.platform === 'linux') {
                const installInfo = getPlatformInstallInfo();
                const installCmd = buildLinuxInstallCommand(installInfo.installType, filePath, installInfo);

                // If downloaded by electron-updater on an AppImage, let native AppImageUpdater apply & relaunch
                if (updaterState.downloadMethod === 'electron-updater' && autoUpdater && app.isPackaged && process.env.APPIMAGE) {
                    try {
                        autoUpdater.quitAndInstall(false, true);
                        return { status: 'installing' };
                    } catch (nativeErr) {
                        console.warn('[AutoUpdater] Native AppImage quitAndInstall failed, falling back to atomic replace:', nativeErr.message);
                    }
                }

                const targetAppImage = process.env.APPIMAGE;
                if (targetAppImage && filePath.toLowerCase().endsWith('.appimage')) {
                    try {
                        // POSIX-safe atomic staging & rename prevents ETXTBSY on the running AppImage
                        await replaceAppImageAtomically(filePath, targetAppImage, fs);
                        const child = spawn(targetAppImage, [], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        child.unref();
                        setTimeout(() => app.quit(), 200);
                        return { status: 'installing' };
                    } catch (linuxErr) {
                        isInstallingUpdate = false;
                        console.warn('[AutoUpdater] AppImage atomic self-replace failed, opening folder:', linuxErr.message);
                        shell.showItemInFolder(filePath);
                        return {
                            status: 'opened-folder',
                            filePath,
                            installCommand: installCmd,
                            message: linuxErr.message
                        };
                    }
                } else {
                    isInstallingUpdate = false;
                    // For .deb/.rpm, try system software installer first; for .pacman/.tar.gz (or if no GUI handler), reveal in file manager.
                    const lowerFile = filePath.toLowerCase();
                    if (lowerFile.endsWith('.deb') || lowerFile.endsWith('.rpm')) {
                        const openErr = await shell.openPath(filePath);
                        if (!openErr) {
                            return { status: 'opened-installer', filePath, installCommand: installCmd };
                        }
                    }
                    shell.showItemInFolder(filePath);
                    return { status: 'opened-folder', filePath, installCommand: installCmd };
                }
            }

            isInstallingUpdate = false;
            await shell.openPath(filePath);
            return { status: 'opened-installer', filePath };
        } catch (err) {
            isInstallingUpdate = false;
            console.error('[AutoUpdater] Failed to launch installer:', err);
            return { status: 'error', message: err.message };
        }
    }

    // Only invoke electron-updater.quitAndInstall on Linux when actually running as an AppImage
    // (otherwise electron-updater throws "APPIMAGE env is not defined").
    const canFallbackToElectronUpdater = autoUpdater && app.isPackaged && (process.platform !== 'linux' || Boolean(process.env.APPIMAGE));
    if (canFallbackToElectronUpdater) {
        try {
            autoUpdater.quitAndInstall(false, true);
            return { status: 'installing' };
        } catch (err) {
            return { status: 'error', message: err.message };
        }
    }

    return { status: 'error', message: 'No downloaded update file available to install' };
}

if (autoUpdater) {
    try {
        // Disable electron-updater's uncoordinated autoDownload so our GitHub Releases sync engine
        // resolves exact asset names (both hyphenated and dotted) without 404 or unsigned rejection.
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.allowPrerelease = false;
        autoUpdater.verifyUpdateCodeSignature = () => Promise.resolve(null);
        try {
            autoUpdater.setFeedURL({
                provider: 'github',
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                releaseType: 'release'
            });
        } catch (_) {}
    } catch (e) {
        console.warn('[AutoUpdater] Initialization warning:', e.message);
    }
}

ipcMain.handle('updater-get-state', () => {
    const installInfo = getPlatformInstallInfo();
    return {
        ...updaterState,
        currentVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        installType: installInfo.installType,
        installLabel: installInfo.label,
        installShortLabel: installInfo.shortLabel,
        packageExt: installInfo.packageExt,
        canAutoInstall: installInfo.canAutoInstall,
        managedExternally: installInfo.managedExternally,
        installCommand: updaterState.installCommand || installInfo.installCommand,
        runtimeVersions: {
            app: app.getVersion(),
            electron: process.versions.electron || '',
            chrome: process.versions.chrome || '',
            node: process.versions.node || '',
            v8: process.versions.v8 || ''
        }
    };
});

ipcMain.handle('updater-check', async () => {
    const installInfo = getPlatformInstallInfo();
    const shouldAutoDownload = process.platform !== 'linux' || Boolean(installInfo.canAutoInstall);
    return await performGitHubUpdateCheck({ silent: false, autoDownload: shouldAutoDownload });
});

ipcMain.handle('updater-download', async () => {
    return await downloadGitHubUpdateAsset({ silent: false });
});

ipcMain.handle('updater-quit-and-install', async () => {
    return await installDownloadedUpdate();
});

// Navigation History Lookup for middle-click Back/Forward
ipcMain.handle('get-webview-history-url', (event, { webContentsId, offset }) => {
    if (!webContentsId) return null;
    const wc = webContents.fromId(webContentsId);
    if (!wc) return null;
    try {
        if (wc.navigationHistory) {
            const idx = wc.navigationHistory.getActiveIndex();
            const targetIdx = idx + (offset || 0);
            const entry = wc.navigationHistory.getEntryAtIndex(targetIdx);
            return entry ? entry.url : null;
        }
    } catch (e) {
        console.error('[Electron Main] Error retrieving webview history URL:', e);
    }
    return null;
});

// Vault IPC

ipcMain.handle('fetch-suggestions', async (event, query) => {
    try {
        const { net } = require('electron');
        return new Promise((resolve) => {
            const request = net.request(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
            request.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed && parsed[1] ? parsed[1].slice(0, 4) : []);
                    } catch (e) {
                        resolve([]);
                    }
                });
            });
            request.on('error', () => resolve([]));
            request.end();
        });
    } catch (e) {
        return [];
    }
});

ipcMain.on('set-fullscreen', (event, value) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) {
        win.setFullScreen(value);
    }
});

ipcMain.handle('vault-get-status', async () => {
    try {
        await ensureVault();
        const vault = readVaultSync();
        return {
            isInitialized: (vault.canary || vault.testEncryption) ? true : false,
            isUnlocked: Boolean(masterKey),
            hasPin: Boolean(vault.pinConfig?.enabled && vault.pinConfig?.wrappedSecret),
            hasWindowsHello: process.platform !== 'linux' && Boolean((vault.canary || vault.testEncryption) && vault.bioConfig?.enabled === true && (vault.bioConfig?.wrappedSecretBase64 || vault.osKeyWrap)),
            itemCount: Array.isArray(vault.passwords) ? vault.passwords.length : 0,
            failedPinAttempts: vault.pinConfig?.failedAttempts || 0,
            pinLockUntil: vault.pinConfig?.lockUntil || 0
        };
    } catch (e) {
        return {
            isInitialized: false,
            isUnlocked: false,
            hasPin: false,
            hasWindowsHello: false,
            itemCount: 0,
            failedPinAttempts: 0,
            pinLockUntil: 0
        };
    }
});

function wrapMasterKeyForOS(vault, keyBuffer, masterPasswordStr) {
    if (!keyBuffer || !Buffer.isBuffer(keyBuffer) || !vault) return;
    try {
        const secretJson = JSON.stringify({
            keyHex: keyBuffer.toString('hex'),
            masterPassword: masterPasswordStr || activeMasterPassword || ''
        });
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
            vault.osKeyWrap = {
                useSafeStorage: true,
                wrappedKeyBase64: safeStorage.encryptString(secretJson).toString('base64')
            };
        } else {
            console.warn('[Vault] OS credential encryption (safeStorage) unavailable; skipping OS key wrapping.');
            return;
        }
    } catch (err) {
        console.warn('[Vault] Failed to wrap master key for OS:', err);
    }
}

function tryUnwrapMasterKeyFromOS(vault) {
    if (!vault) return null;
    // 1. Try vault.osKeyWrap
    const wrapData = vault.osKeyWrap;
    if (wrapData) {
        try {
            let secretJson = '';
            const wrappedBase64 = typeof wrapData === 'string' ? wrapData : wrapData.wrappedKeyBase64;
            const useSafe = typeof wrapData === 'object' ? wrapData.useSafeStorage !== false : true;

            if (useSafe && safeStorage && safeStorage.isEncryptionAvailable()) {
                try {
                    secretJson = safeStorage.decryptString(Buffer.from(wrappedBase64, 'base64'));
                } catch (_) {}
            }
            if (!secretJson) {
                const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseOSKey');
                try {
                    const raw = Buffer.from(wrappedBase64, 'base64').toString('utf8');
                    secretJson = safeDecrypt(raw, machineKey);
                } catch (_) {}
            }
            if (secretJson) {
                const parsed = JSON.parse(secretJson);
                if (parsed.keyHex) {
                    return {
                        masterKey: Buffer.from(parsed.keyHex, 'hex'),
                        masterPassword: parsed.masterPassword || null
                    };
                }
            }
        } catch (err) {
            console.warn('[Vault] tryUnwrapMasterKeyFromOS osKeyWrap failed:', err);
        }
    }
    // 2. Try vault.bioConfig
    if (vault.bioConfig?.wrappedSecretBase64) {
        try {
            let secretJson = '';
            if (vault.bioConfig.useSafeStorage && safeStorage && safeStorage.isEncryptionAvailable()) {
                try {
                    secretJson = safeStorage.decryptString(Buffer.from(vault.bioConfig.wrappedSecretBase64, 'base64'));
                } catch (_) {}
            }
            if (!secretJson) {
                const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseBio');
                try {
                    const raw = Buffer.from(vault.bioConfig.wrappedSecretBase64, 'base64').toString('utf8');
                    secretJson = safeDecrypt(raw, machineKey);
                } catch (_) {}
            }
            if (secretJson) {
                const parsed = JSON.parse(secretJson);
                if (parsed.keyHex) {
                    return {
                        masterKey: Buffer.from(parsed.keyHex, 'hex'),
                        masterPassword: parsed.masterPassword || null
                    };
                }
            }
        } catch (err) {
            console.warn('[Vault] tryUnwrapMasterKeyFromOS bioConfig failed:', err);
        }
    }
    return null;
}

ipcMain.handle('vault-unlock', async (event, masterPassword) => {
    assertTrustedAppShell(event, 'vault-unlock');
    try {
        if (!masterPassword || typeof masterPassword !== 'string') {
            return false;
        }
        await ensureVault();
        const vault = readVaultSync();

        // Check if legacy testEncryption exists without canary
        if (!vault.canary && vault.testEncryption) {
            vault.canary = vault.testEncryption;
        }

        // Case A: New / Uninitialized Vault
        if (!vault.canary) {
            vault.vaultSalt = crypto.randomBytes(32).toString('hex');
            const key = deriveKey(masterPassword, vault.vaultSalt);
            vault.canary = encrypt('QBROWSE_VAULT_OK', key);
            masterKey = key;
            activeMasterPassword = masterPassword;
            healAndDecryptVaultItems(vault, masterKey, [masterPassword]);
            if (vault.bioConfig?.enabled === true) {
                wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
            }
            writeVaultSync(vault);
            return true;
        }

        // Case B: Initialized Vault
        let isValid = false;
        let keyToUse = null;

        // 1. Check with stored salt
        if (vault.vaultSalt) {
            const k = deriveKey(masterPassword, vault.vaultSalt);
            if (safeDecrypt(vault.canary, k) !== null) {
                isValid = true;
                keyToUse = k;
            }
        }

        // 2. Check legacy salt
        if (!isValid) {
            const kLegacy = deriveLegacyKey(masterPassword);
            if (safeDecrypt(vault.canary, kLegacy) !== null) {
                isValid = true;
                keyToUse = kLegacy;
            }
        }
        if (!isValid) {
            const kLegacy2026 = deriveLegacyKey2026(masterPassword);
            if (safeDecrypt(vault.canary, kLegacy2026) !== null) {
                isValid = true;
                keyToUse = kLegacy2026;
            }
        }

        // 3. Canary fallback check: if canary was accidentally encrypted with default or windows hello keys
        if (!isValid) {
            const fallbackCanaryKeys = [
                deriveLegacyKey('QBrowseDefaultVaultKey'),
                deriveLegacyKey2026('QBrowseDefaultVaultKey'),
                deriveLegacyKey('QBrowseWindowsHelloVaultKey'),
                deriveLegacyKey2026('QBrowseWindowsHelloVaultKey')
            ];
            const canaryMatchesFallback = fallbackCanaryKeys.some(fk => safeDecrypt(vault.canary, fk) !== null);
            if (canaryMatchesFallback) {
                const userKeys = [
                    vault.vaultSalt ? deriveKey(masterPassword, vault.vaultSalt) : null,
                    deriveLegacyKey(masterPassword),
                    deriveLegacyKey2026(masterPassword)
                ].filter(Boolean);

                const hasMatchingItem = Array.isArray(vault.passwords) && vault.passwords.some(p => {
                    if (!p || !p.password || !isEncryptedPayload(p.password)) return false;
                    return userKeys.some(uk => safeDecrypt(p.password, uk) !== null);
                });

                if (hasMatchingItem || (!vault.passwords || vault.passwords.length === 0)) {
                    isValid = true;
                }
            }
        }

        if (isValid) {
            // Migrate to random salt if needed
            if (!vault.vaultSalt || !keyToUse) {
                vault.vaultSalt = crypto.randomBytes(32).toString('hex');
                masterKey = deriveKey(masterPassword, vault.vaultSalt);
                vault.canary = encrypt('QBROWSE_VAULT_OK', masterKey);
            } else {
                masterKey = keyToUse;
            }
            activeMasterPassword = masterPassword;

            // Heal all legacy items
            healAndDecryptVaultItems(vault, masterKey, [masterPassword]);
            if (vault.bioConfig?.enabled === true) {
                wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
            }

            // If Windows Hello was enabled, refresh wrappedSecretBase64
            if (vault.bioConfig?.enabled) {
                const secretJson = JSON.stringify({ keyHex: masterKey.toString('hex'), masterPassword: activeMasterPassword || '' });
                if (safeStorage && safeStorage.isEncryptionAvailable()) {
                    vault.bioConfig.wrappedSecretBase64 = safeStorage.encryptString(secretJson).toString('base64');
                    vault.bioConfig.useSafeStorage = true;
                } else {
                    const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseBio');
                    vault.bioConfig.wrappedSecretBase64 = Buffer.from(encrypt(secretJson, machineKey), 'utf8').toString('base64');
                    vault.bioConfig.useSafeStorage = false;
                }
            }

            writeVaultSync(vault);
            return true;
        }

        return false;
    } catch (e) {
        console.error('[Vault] vault-unlock error:', e);
        return false;
    }
});

ipcMain.handle('vault-lock', async (event) => {
    assertTrustedAppShell(event, 'vault-lock');
    masterKey = null;
    activeMasterPassword = null;
    return true;
});

async function requestWindowsHelloVerification(message = "Verify your identity for QBrowse Passkey", targetWin = null) {
    if (process.platform !== 'win32') {
        return { verified: false, status: 'NotSupported' };
    }
    try {
        let hwnd = null;
        try {
            const win = (targetWin && !targetWin.isDestroyed())
                ? targetWin
                : (BrowserWindow.getFocusedWindow() || mainWindow);
            if (win && !win.isDestroyed()) {
                const buf = win.getNativeWindowHandle();
                if (buf && buf.length >= 4) {
                    hwnd = buf.length >= 8 ? Number(buf.readBigInt64LE(0)) : buf.readInt32LE(0);
                }
            }
        } catch (_) {}
        const res = await rustBridge.vaultVerifyWindowsHello(message, hwnd);
        if (res && res.verified) {
            return { verified: true, success: true, status: 'Verified' };
        }
        return {
            verified: false,
            success: false,
            status: res?.available === false ? 'NotAvailable' : 'Canceled',
            error: res?.error || undefined
        };
    } catch (err) {
        console.warn('[Windows Hello] Native error:', err);
        return { verified: false, status: 'Error', error: err.message };
    }
}

const pendingPasskeyVerifications = new Map();

ipcMain.handle('vault-verify-passkey-usage', async (event, details = {}) => {
    // Prompt custom QVault Passkey Verification Modal in mainWindow
    return new Promise((resolve) => {
        const requestId = (details && typeof details.requestId === 'string' && details.requestId.trim())
            ? details.requestId.trim()
            : ('pv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
        const rawTimeout = Number(details?.timeout);
        const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0
            ? Math.min(Math.max(rawTimeout, 30000), 300000)
            : 120000;

        const appWin = (mainWindow && !mainWindow.isDestroyed()) 
            ? mainWindow 
            : Array.from(browserWindows).find(w => w && !w.isDestroyed());

        const timer = setTimeout(() => {
            if (pendingPasskeyVerifications.has(requestId)) {
                pendingPasskeyVerifications.delete(requestId);
                if (appWin && !appWin.isDestroyed()) {
                    try { appWin.webContents.send('dismiss-passkey-verification', { requestId }); } catch (_) {}
                }
                resolve({ verified: false, error: 'Timeout' });
            }
        }, timeoutMs);

        pendingPasskeyVerifications.set(requestId, { 
            resolve, 
            timer,
            callerSender: event.sender,
            appWin
        });

        if (appWin && !appWin.isDestroyed()) {
            try {
                if (appWin.isMinimized()) appWin.restore();
                appWin.show();
                appWin.focus();
                appWin.moveTop();
            } catch (_) {}

            const promptMode = details.mode || 'passkey';
            const hardwareFallbackAvailable = typeof details.hardwareFallbackAvailable === 'boolean'
                ? details.hardwareFallbackAvailable
                : promptMode !== 'autofill';

            appWin.webContents.send('prompt-passkey-verification', {
                requestId,
                rpId: details.rpId,
                username: details.username,
                hostname: details.hostname,
                credentialId: details.credentialId,
                mode: promptMode,
                hardwareFallbackAvailable
            });
        } else {
            clearTimeout(timer);
            pendingPasskeyVerifications.delete(requestId);
            resolve({ verified: false, approved: false, fallbackToNative: false, error: 'NoWindow' });
        }
    });
});

ipcMain.on('vault-get-passkey-config-sync', (event) => {
    event.returnValue = resolvePasskeyConfig(event.sender);
});

ipcMain.handle('vault-get-passkey-config', (event) => {
    return resolvePasskeyConfig(event.sender);
});

ipcMain.on('sync-passkey-settings', (event, data = {}) => {
    if (!data || typeof data !== 'object') return;
    if (data.passkeyProviderMode === 'hardware' || data.passkeyProviderMode === 'qvault') {
        livePasskeyState.passkeyProviderMode = data.passkeyProviderMode;
        settingsStore.passkeyProviderMode = data.passkeyProviderMode;
    }
    if (typeof data.passkeyHardwareFallback === 'boolean') {
        livePasskeyState.passkeyHardwareFallback = data.passkeyHardwareFallback;
        settingsStore.passkeyHardwareFallback = data.passkeyHardwareFallback;
    }
    if (typeof data.vaultProvider === 'string' && VALID_VAULT_PROVIDER_RE.test(data.vaultProvider)) {
        livePasskeyState.vaultProvider = data.vaultProvider;
        settingsStore.vaultProvider = data.vaultProvider;
    }
    scheduleSettingsDiskFlush();
});

ipcMain.handle('vault-cancel-passkey-verification', async (event, { requestId } = {}) => {
    if (!requestId) return false;
    const pending = pendingPasskeyVerifications.get(requestId);
    if (pending) {
        clearTimeout(pending.timer);
        pendingPasskeyVerifications.delete(requestId);
        if (pending.appWin && !pending.appWin.isDestroyed()) {
            try { pending.appWin.webContents.send('dismiss-passkey-verification', { requestId }); } catch (_) {}
        }
        pending.resolve({ verified: false, approved: false, fallbackToNative: false, aborted: true, error: 'Aborted' });
        return true;
    }
    return false;
});

ipcMain.handle('respond-passkey-verification', async (event, payload = {}) => {
    assertTrustedAppShell(event, 'respond-passkey-verification');
    const requestId = payload?.requestId;
    const approved = Boolean(payload?.approved ?? payload?.verified);
    const fallbackToNative = !approved && Boolean(payload?.fallbackToNative);
    const pending = pendingPasskeyVerifications.get(requestId);
    if (pending) {
        clearTimeout(pending.timer);
        pendingPasskeyVerifications.delete(requestId);
        pending.resolve({
            verified: approved,
            approved,
            fallbackToNative
        });

        // If caller was an OAuth popup window, refocus it so login can complete seamlessly
        if (pending.callerSender && !pending.callerSender.isDestroyed()) {
            try {
                const callerWin = BrowserWindow.fromWebContents(pending.callerSender);
                if (callerWin && !callerWin.isDestroyed()) {
                    callerWin.focus();
                }
            } catch (_) {}
        }

        return true;
    }
    return false;
});

ipcMain.handle('vault-is-popup-window', async (event) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);
        return Boolean(win && (!mainWindow || win !== mainWindow));
    } catch {
        return false;
    }
});

ipcMain.handle('verify-windows-hello', async (event, message) => {
    assertTrustedAppShell(event, 'verify-windows-hello');
    const senderWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const verifyRes = await requestWindowsHelloVerification(message || "Verify your identity for QBrowse Passkey", senderWin);
    if (verifyRes && verifyRes.verified) {
        if (!masterKey) {
            try {
                await ensureVault();
                const vault = readVaultSync();
                const unwrapped = tryUnwrapMasterKeyFromOS(vault);
                if (unwrapped && unwrapped.masterKey) {
                    masterKey = unwrapped.masterKey;
                    activeMasterPassword = unwrapped.masterPassword || null;
                    healAndDecryptVaultItems(vault, masterKey, activeMasterPassword ? [activeMasterPassword] : []);
                    wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
                    writeVaultSync(vault);
                }
            } catch (err) {
                console.warn('[Vault] Failed to unwrap master key after Windows Hello verification:', err);
            }
        }
    }
    return {
        ...verifyRes,
        unlockedVault: Boolean(masterKey),
        masterPassword: activeMasterPassword || null
    };
});

ipcMain.handle('vault-check-password', async (event, passwordToCheck) => {
    assertTrustedAppShell(event, 'vault-check-password');
    try {
        if (!passwordToCheck || typeof passwordToCheck !== 'string') return false;
        await ensureVault();
        const vault = readVaultSync();
        if (!vault.canary && vault.testEncryption) {
            vault.canary = vault.testEncryption;
        }
        if (!vault.canary) return false;

        if (activeMasterPassword && passwordToCheck === activeMasterPassword) {
            return true;
        }

        if (vault.vaultSalt) {
            const k = deriveKey(passwordToCheck, vault.vaultSalt);
            if (safeDecrypt(vault.canary, k) !== null) return true;
        }

        const kLegacy = deriveLegacyKey(passwordToCheck);
        if (safeDecrypt(vault.canary, kLegacy) !== null) return true;

        const kLegacy2026 = deriveLegacyKey2026(passwordToCheck);
        if (safeDecrypt(vault.canary, kLegacy2026) !== null) return true;

        return false;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('vault-setup-pin', async (event, payload) => {
    assertTrustedAppShell(event, 'vault-setup-pin');
    try {
        const pin = typeof payload === 'object' && payload !== null ? payload.pin : payload;
        const mp = typeof payload === 'object' && payload !== null ? payload.masterPassword : null;

        await ensureVault();
        const vault = readVaultSync();

        // If locked but mp provided, try to unlock first
        if (!masterKey && mp && typeof mp === 'string') {
            if (vault.vaultSalt) {
                const k = deriveKey(mp, vault.vaultSalt);
                if (safeDecrypt(vault.canary, k) !== null) {
                    masterKey = k;
                    activeMasterPassword = mp;
                }
            }
            if (!masterKey) {
                const kLegacy = deriveLegacyKey(mp);
                if (safeDecrypt(vault.canary, kLegacy) !== null) {
                    masterKey = kLegacy;
                    activeMasterPassword = mp;
                }
            }
        }

        if (!masterKey || !pin || String(pin).length < 4) {
            return { success: false, error: 'Vault must be unlocked to set up PIN' };
        }

        const pinSalt = crypto.randomBytes(32).toString('hex');
        const pinKey = crypto.scryptSync(String(pin), Buffer.from(pinSalt, 'hex'), 32);
        const secretJson = JSON.stringify({ keyHex: masterKey.toString('hex'), masterPassword: activeMasterPassword || mp || '' });

        vault.pinConfig = {
            enabled: true,
            salt: pinSalt,
            wrappedSecret: encrypt(secretJson, pinKey),
            failedAttempts: 0,
            lockUntil: 0
        };

        writeVaultSync(vault);
        return { success: true };
    } catch (e) {
        console.error('[Vault] vault-setup-pin error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vault-unlock-pin', async (event, pin) => {
    assertTrustedAppShell(event, 'vault-unlock-pin');
    try {
        await ensureVault();
        const vault = readVaultSync();

        if (!vault.pinConfig?.enabled || !vault.pinConfig?.wrappedSecret) {
            return { success: false, error: 'PIN is not configured on this vault' };
        }

        if (vault.pinConfig.lockUntil && Date.now() < vault.pinConfig.lockUntil) {
            return {
                success: false,
                lockedOut: true,
                lockUntil: vault.pinConfig.lockUntil,
                remainingSeconds: Math.ceil((vault.pinConfig.lockUntil - Date.now()) / 1000)
            };
        }

        const pinSalt = vault.pinConfig.salt;
        const pinKey = crypto.scryptSync(String(pin), Buffer.from(pinSalt, 'hex'), 32);
        const decrypted = safeDecrypt(vault.pinConfig.wrappedSecret, pinKey);

        if (decrypted) {
            try {
                const { keyHex, masterPassword } = JSON.parse(decrypted);
                masterKey = Buffer.from(keyHex, 'hex');
                activeMasterPassword = masterPassword || null;
                vault.pinConfig.failedAttempts = 0;
                vault.pinConfig.lockUntil = 0;

                healAndDecryptVaultItems(vault, masterKey, activeMasterPassword ? [activeMasterPassword] : []);
                wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
                writeVaultSync(vault);

                return { success: true, masterPassword: activeMasterPassword || null };
            } catch (jsonErr) {
                return { success: false, error: 'Invalid PIN wrapper data' };
            }
        }

        // Decryption failed: increment failed attempts
        vault.pinConfig.failedAttempts = (vault.pinConfig.failedAttempts || 0) + 1;
        if (vault.pinConfig.failedAttempts >= 5) {
            vault.pinConfig.lockUntil = Date.now() + 30000; // 30s lockout
        }
        writeVaultSync(vault);

        return {
            success: false,
            failedAttempts: vault.pinConfig.failedAttempts,
            lockUntil: vault.pinConfig.lockUntil || 0
        };
    } catch (e) {
        console.error('[Vault] vault-unlock-pin error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vault-remove-pin', async (event) => {
    assertTrustedAppShell(event, 'vault-remove-pin');
    try {
        await ensureVault();
        const vault = readVaultSync();
        delete vault.pinConfig;
        writeVaultSync(vault);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vault-setup-windows-hello', async (event, payload) => {
    assertTrustedAppShell(event, 'vault-setup-windows-hello');
    try {
        const enable = typeof payload === 'object' && payload !== null ? Boolean(payload.enable) : Boolean(payload);
        const mp = typeof payload === 'object' && payload !== null ? payload.masterPassword : null;

        await ensureVault();
        const vault = readVaultSync();

        if (!enable) {
            vault.bioConfig = { enabled: false };
            writeVaultSync(vault);
            return { success: true, enabled: false };
        }

        // Enable requested: unlock if mp provided and not yet unlocked
        if (!masterKey && mp && typeof mp === 'string') {
            if (vault.vaultSalt) {
                const k = deriveKey(mp, vault.vaultSalt);
                if (safeDecrypt(vault.canary, k) !== null) {
                    masterKey = k;
                    activeMasterPassword = mp;
                }
            }
            if (!masterKey) {
                const kLegacy = deriveLegacyKey(mp);
                if (safeDecrypt(vault.canary, kLegacy) !== null) {
                    masterKey = kLegacy;
                    activeMasterPassword = mp;
                }
            }
        }

        if (!masterKey && !mp && vault.bioConfig?.enabled !== false) {
            const unwrapped = tryUnwrapMasterKeyFromOS(vault);
            if (unwrapped && unwrapped.masterKey) {
                masterKey = unwrapped.masterKey;
                activeMasterPassword = unwrapped.masterPassword || null;
                healAndDecryptVaultItems(vault, masterKey, activeMasterPassword ? [activeMasterPassword] : []);
            }
        }

        if (!masterKey) {
            return { success: false, error: 'Unlock vault with Master Password first' };
        }

        if (!(safeStorage && safeStorage.isEncryptionAvailable())) {
            return { success: false, error: 'OS credential encryption (safeStorage) is unavailable on this system.' };
        }

        const senderWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const verifyRes = await requestWindowsHelloVerification('Confirm your identity to enable Windows Hello for QVault', senderWin);
        if (!verifyRes || !verifyRes.verified) {
            return { success: false, error: 'Windows Hello verification cancelled' };
        }

        const secretJson = JSON.stringify({ keyHex: masterKey.toString('hex'), masterPassword: activeMasterPassword || mp || '' });
        let wrappedSecretBase64 = '';
        let useSafeStorage = false;

        if (safeStorage && safeStorage.isEncryptionAvailable()) {
            wrappedSecretBase64 = safeStorage.encryptString(secretJson).toString('base64');
            useSafeStorage = true;
        } else {
            const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseBio');
            wrappedSecretBase64 = Buffer.from(encrypt(secretJson, machineKey), 'utf8').toString('base64');
            useSafeStorage = false;
        }

        vault.bioConfig = {
            enabled: true,
            useSafeStorage,
            wrappedSecretBase64
        };

        wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
        writeVaultSync(vault);
        return { success: true, enabled: true };
    } catch (e) {
        console.error('[Vault] vault-setup-windows-hello error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vault-unlock-windows-hello', async (event) => {
    assertTrustedAppShell(event, 'vault-unlock-windows-hello');
    try {
        await ensureVault();
        const vault = readVaultSync();
        if (vault.bioConfig?.enabled !== true) {
            return { success: false, error: 'Windows Hello is disabled for QVault' };
        }

        const senderWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        const verifyRes = await requestWindowsHelloVerification('Unlock QBrowse Password Vault', senderWin);
        if (!verifyRes || !verifyRes.verified) {
            return { success: false, error: 'Biometric verification failed' };
        }

        const unwrapped = tryUnwrapMasterKeyFromOS(vault);
        if (unwrapped && unwrapped.masterKey) {
            masterKey = unwrapped.masterKey;
            activeMasterPassword = unwrapped.masterPassword || null;
            healAndDecryptVaultItems(vault, masterKey, activeMasterPassword ? [activeMasterPassword] : []);
            wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
            writeVaultSync(vault);
            return { success: true, masterPassword: activeMasterPassword || null };
        }

        // If vault.bioConfig is not yet set up but canary exists:
        if (vault.canary || vault.testEncryption) {
            const testKeyWinHello = deriveLegacyKey('QBrowseWindowsHelloVaultKey');
            const testKeyDefault = deriveLegacyKey('QBrowseDefaultVaultKey');
            const testKeyWinHello2026 = deriveLegacyKey2026('QBrowseWindowsHelloVaultKey');
            const testKeyDefault2026 = deriveLegacyKey2026('QBrowseDefaultVaultKey');

            const canaryStr = vault.canary || vault.testEncryption;
            let legacyKey = null;
            if (safeDecrypt(canaryStr, testKeyWinHello)) legacyKey = testKeyWinHello;
            else if (safeDecrypt(canaryStr, testKeyWinHello2026)) legacyKey = testKeyWinHello2026;
            else if (safeDecrypt(canaryStr, testKeyDefault)) legacyKey = testKeyDefault;
            else if (safeDecrypt(canaryStr, testKeyDefault2026)) legacyKey = testKeyDefault2026;

            if (legacyKey) {
                masterKey = legacyKey;
                activeMasterPassword = null;
                healAndDecryptVaultItems(vault, masterKey, []);
                wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
                writeVaultSync(vault);
                return { success: true, masterPassword: null };
            }
        }

        return {
            success: false,
            needsMasterPasswordSetup: true,
            error: 'Please unlock with your Master Password once to link Windows Hello'
        };
    } catch (e) {
        console.error('[Vault] vault-unlock-windows-hello error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vault-add-password', async (event, title, url, username, passwordPlaintext) => {
    assertTrustedAppShell(event, 'vault-add-password');
    await ensureVault();
    const vault = readVaultSync();

    let encryptionKey = masterKey;
    if (!encryptionKey) {
        const unwrapped = tryUnwrapMasterKeyFromOS(vault);
        if (unwrapped && unwrapped.masterKey) {
            encryptionKey = unwrapped.masterKey;
        } else {
            encryptionKey = deriveLegacyKey('QBrowseDefaultVaultKey');
        }
    }

    const normUrl = (u) => String(u || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
    const normUser = (u) => String(u || '').trim().toLowerCase();

    const targetUrlNorm = normUrl(url);
    const targetUserNorm = normUser(username);
    const incomingMeta = extractVaultItemMeta(title);
    const incomingIsPasskey = incomingMeta.itemType === 'passkey' || !!incomingMeta.passkeyData;
    const incomingCredId = incomingMeta.passkeyData?.credentialId ? String(incomingMeta.passkeyData.credentialId).toLowerCase() : '';

    // Deduplicate without ever allowing a login item to overwrite a passkey item (or vice versa)
    const existingIndex = vault.passwords.findIndex(p => {
        if (!p) return false;
        const pMeta = extractVaultItemMeta(p.title, p);
        const pIsPasskey = pMeta.itemType === 'passkey' || !!pMeta.passkeyData;
        if (pIsPasskey !== incomingIsPasskey) return false;
        if (incomingIsPasskey) {
            const pCredId = pMeta.passkeyData?.credentialId ? String(pMeta.passkeyData.credentialId).toLowerCase() : '';
            return Boolean(incomingCredId && pCredId && incomingCredId === pCredId);
        }
        return normUrl(p.url) === targetUrlNorm && normUser(p.username) === targetUserNorm;
    });

    if (existingIndex !== -1) {
        const existing = vault.passwords[existingIndex];
        existing.title = title || existing.title || url || 'Saved Login';
        existing.password = encrypt(String(passwordPlaintext || ''), encryptionKey);
        existing.updatedAt = Date.now();
        writeVaultSync(vault);
        return { ...existing, password: String(passwordPlaintext || '') };
    }

    const newEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7)),
        title: title || url || 'Saved Login',
        url: url || '',
        username: username || '',
        password: encrypt(String(passwordPlaintext || ''), encryptionKey),
        updatedAt: Date.now()
    };

    vault.passwords.push(newEntry);
    writeVaultSync(vault);
    return { ...newEntry, password: String(passwordPlaintext || '') };
});

ipcMain.handle('vault-save-passkey', async (event, data = {}) => {
    try {
        // Respect ephemeral Ghost / Tor sessions: never persist passkeys from non-persistent partitions to disk
        if (event.sender && event.sender.session && typeof event.sender.session.isPersistent === 'function' && !event.sender.session.isPersistent()) {
            return { success: false, ephemeral: true, error: 'Passkeys cannot be saved in private Ghost or Tor sessions' };
        }

        const rpId = String(data.rpId || data.hostname || '').trim().toLowerCase().replace(/\.$/, '');
        const credentialId = String(data.credentialId || '').trim().toLowerCase();
        if (!rpId || !credentialId || !data.privateKey) {
            return { success: false, error: 'Missing required passkey fields' };
        }

        await ensureVault();
        const vault = readVaultSync();
        if (!Array.isArray(vault.passwords)) vault.passwords = [];

        let encryptionKey = masterKey;
        if (!encryptionKey) {
            const unwrapped = tryUnwrapMasterKeyFromOS(vault);
            if (unwrapped && unwrapped.masterKey) {
                encryptionKey = unwrapped.masterKey;
            } else {
                encryptionKey = deriveLegacyKey('QBrowseDefaultVaultKey');
            }
        }

        const passkeyData = {
            rpId,
            rpName: String(data.rpName || ''),
            displayName: String(data.displayName || data.username || ''),
            userHandle: data.userHandle ? String(data.userHandle).toLowerCase() : null,
            credentialId,
            publicKey: data.publicKey || null,
            privateKey: data.privateKey || null,
            backupEligible: data.backupEligible !== false,
            transports: Array.isArray(data.transports) ? data.transports : ['hybrid', 'internal'],
            created: Number(data.created) || Date.now()
        };

        const payload = {
            type: 'passkey',
            notes: '',
            totpSecret: null,
            passkeyData,
            cardData: null,
            addressData: null
        };
        const combinedTitle = `${rpId}|||${JSON.stringify(payload)}`;
        const url = `https://${rpId}`;
        const username = String(data.username || data.displayName || '');

        const existingIndex = vault.passwords.findIndex(p => {
            if (!p) return false;
            const pMeta = extractVaultItemMeta(p.title, p);
            const pIsPasskey = pMeta.itemType === 'passkey' || !!pMeta.passkeyData;
            if (!pIsPasskey) return false;
            const pCid = pMeta.passkeyData?.credentialId ? String(pMeta.passkeyData.credentialId).toLowerCase() : '';
            return Boolean(pCid && pCid === credentialId);
        });

        let savedId;
        if (existingIndex !== -1) {
            vault.passwords[existingIndex] = {
                ...vault.passwords[existingIndex],
                title: combinedTitle,
                url,
                username,
                password: encrypt('', encryptionKey),
                updatedAt: Date.now()
            };
            savedId = vault.passwords[existingIndex].id;
        } else {
            const newEntry = {
                id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7)),
                title: combinedTitle,
                url,
                username,
                password: encrypt('', encryptionKey),
                updatedAt: Date.now()
            };
            vault.passwords.push(newEntry);
            savedId = newEntry.id;
        }

        writeVaultSync(vault);

        const appWin = (mainWindow && !mainWindow.isDestroyed())
            ? mainWindow
            : Array.from(browserWindows).find(w => w && !w.isDestroyed());
        if (appWin && !appWin.isDestroyed()) {
            try {
                appWin.webContents.send('qvault-passkey-saved', {
                    id: savedId,
                    rpId,
                    hostname: data.hostname || rpId,
                    username,
                    credentialId
                });
            } catch (_) {}
        }

        return { success: true, id: savedId };
    } catch (e) {
        console.error('[Vault] vault-save-passkey error:', e);
        return { success: false, error: e.message || 'Failed to save passkey' };
    }
});

ipcMain.handle('vault-delete-password', async (event, id) => {
    assertTrustedAppShell(event, 'vault-delete-password');
    try {
        await ensureVault();
        const vault = readVaultSync();
        if (!masterKey) {
            const unwrapped = tryUnwrapMasterKeyFromOS(vault);
            if (unwrapped && unwrapped.masterKey) {
                masterKey = unwrapped.masterKey;
                activeMasterPassword = unwrapped.masterPassword || null;
            }
        }
        vault.passwords = (vault.passwords || []).filter(p => String(p.id) !== String(id));
        writeVaultSync(vault);
        return true;
    } catch (e) {
        console.error('[Vault] vault-delete-password error:', e);
        return false;
    }
});

ipcMain.handle('vault-update-password', async (event, id, title, url, username, passwordPlaintext) => {
    assertTrustedAppShell(event, 'vault-update-password');
    try {
        await ensureVault();
        const vault = readVaultSync();

        let encryptionKey = masterKey;
        if (!encryptionKey) {
            const unwrapped = tryUnwrapMasterKeyFromOS(vault);
            if (unwrapped && unwrapped.masterKey) {
                encryptionKey = unwrapped.masterKey;
                masterKey = encryptionKey;
                activeMasterPassword = unwrapped.masterPassword || null;
            } else {
                encryptionKey = deriveLegacyKey('QBrowseDefaultVaultKey');
            }
        }

        if (!encryptionKey) return false;

        const index = vault.passwords.findIndex(p => String(p.id) === String(id));
        if (index === -1) return false;

        // Defensive normalization: detect if caller passed (id, title, username, password, url)
        let finalUrl = url;
        let finalUsername = username;
        let finalPassword = passwordPlaintext;

        if (typeof passwordPlaintext === 'string' && /^https?:\/\//i.test(passwordPlaintext) &&
            typeof url === 'string' && !/^https?:\/\//i.test(url) && !url.includes('.')) {
            finalUrl = passwordPlaintext;
            finalPassword = username;
            finalUsername = url;
        }

        let encryptedPassword = vault.passwords[index].password;
        if (finalPassword !== undefined && finalPassword !== null) {
            if (isEncryptedPayload(finalPassword)) {
                encryptedPassword = finalPassword;
            } else {
                encryptedPassword = encrypt(String(finalPassword || ''), encryptionKey);
            }
        }

        vault.passwords[index] = {
            ...vault.passwords[index],
            title: title !== undefined ? title : vault.passwords[index].title,
            url: finalUrl !== undefined ? finalUrl : vault.passwords[index].url,
            username: finalUsername !== undefined ? finalUsername : vault.passwords[index].username,
            password: encryptedPassword,
            updatedAt: Date.now()
        };

        writeVaultSync(vault);
        return true;
    } catch (e) {
        console.error('[Vault] vault-update-password error:', e);
        return false;
    }
});

function normalizeHostOnly(hostOrUrl) {
    if (!hostOrUrl) return '';
    try {
        const str = String(hostOrUrl).trim().toLowerCase();
        if (!str) return '';
        if (str.includes('://')) {
            return new URL(str).hostname.toLowerCase().replace(/\.$/, '');
        }
        return str.split('/')[0].split(':')[0].replace(/\.$/, '');
    } catch {
        return String(hostOrUrl).trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].replace(/\.$/, '');
    }
}

function normalizeCredIdToHex(id) {
    if (!id) return '';
    const str = String(id).trim();
    if (!str) return '';
    if (/^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0) {
        return str.toLowerCase();
    }
    try {
        const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
        return Buffer.from(padded, 'base64').toString('hex').toLowerCase();
    } catch {
        return str.toLowerCase();
    }
}

// Strict WebAuthn RP ID / subdomain matching (e.g., google.com <-> accounts.google.com, never matching via public suffixes like co.uk)
function rpIdMatches(storedDomainOrRpId, targetRpId, targetHost) {
    const stored = normalizeHostOnly(storedDomainOrRpId);
    const rp = normalizeHostOnly(targetRpId);
    const host = normalizeHostOnly(targetHost);
    if (!stored) return false;
    if (rp) {
        if (stored === rp) return true;
        // Registrable domain suffix match (e.g. stored "google.com" matches rpId "accounts.google.com" or legacy stored "accounts.google.com" matches rpId "google.com")
        if ((stored.endsWith('.' + rp) && rp.includes('.')) || (rp.endsWith('.' + stored) && stored.includes('.'))) {
            return true;
        }
    }
    if (host) {
        if (stored === host) return true;
        if ((host.endsWith('.' + stored) && stored.includes('.')) || (stored.endsWith('.' + host) && host.includes('.'))) {
            return true;
        }
    }
    return false;
}

function getDomainRoots(hostOrUrl) {
    if (!hostOrUrl) return [];
    try {
        let clean = String(hostOrUrl).trim().toLowerCase();
        if (clean.includes('://')) {
            clean = new URL(clean).hostname;
        }
        clean = clean.split('/')[0].split(':')[0].replace(/^www\./, '');
        const parts = clean.split('.');
        const candidates = [clean];
        if (parts.length >= 2) {
            candidates.push(parts.slice(-2).join('.'));
        }
        if (parts.length >= 3) {
            candidates.push(parts.slice(-3).join('.'));
        }
        return candidates;
    } catch {
        return [];
    }
}

function domainsMatch(d1, d2) {
    if (!d1 || !d2) return false;
    const clean1 = String(d1).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
    const clean2 = String(d2).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
    if (clean1 === clean2) return true;
    if (clean1.endsWith('.' + clean2) || clean2.endsWith('.' + clean1)) return true;

    const roots1 = getDomainRoots(clean1);
    const roots2 = getDomainRoots(clean2);
    return roots1.some(r => roots2.includes(r));
}

ipcMain.handle('vault-get-passwords', async (event) => {
    assertTrustedAppShell(event, 'vault-get-passwords');
    if (!masterKey) {
        return [];
    }
    await ensureVault();
    const vault = readVaultSync();
    return healAndDecryptVaultItems(vault, masterKey, activeMasterPassword ? [activeMasterPassword] : []);
});

ipcMain.handle('vault-get-matching', async (event, query) => {
    await ensureVault();
    const vault = readVaultSync();
    if (!vault.passwords || !Array.isArray(vault.passwords)) return [];

    let targetHost = '';
    let targetRpId = '';
    let allowCreds = [];

    if (typeof query === 'string') {
        targetHost = query;
    } else if (query && typeof query === 'object') {
        targetHost = query.hostname || '';
        targetRpId = query.rpId || '';
        allowCreds = Array.isArray(query.allowCredentials)
            ? query.allowCredentials.map(normalizeCredIdToHex).filter(Boolean)
            : [];
    }

    try {
        let items = [];
        if (masterKey) {
            items = healAndDecryptVaultItems(
                vault,
                masterKey,
                activeMasterPassword ? [activeMasterPassword] : []
            ).map(item => ({ ...item, locked: false }));
        } else {
            items = vault.passwords.map(p => {
                if (!p || typeof p !== 'object') return null;
                const meta = extractVaultItemMeta(p);
                let itemUrl = p.url || '';
                let itemUser = p.username || '';
                if (/^https?:\/\//i.test(itemUser) && !/^https?:\/\//i.test(itemUrl) && !/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(itemUrl)) {
                    itemUrl = p.username;
                    itemUser = '';
                }
                return {
                    id: p.id,
                    title: meta.cleanTitle,
                    url: itemUrl,
                    username: itemUser,
                    password: '', // Never expose password while locked
                    itemType: meta.itemType,
                    passkeyData: meta.passkeyData,
                    cardData: meta.cardData,
                    addressData: meta.addressData,
                    notes: meta.notes,
                    updatedAt: p.updatedAt || 0,
                    locked: true
                };
            }).filter(Boolean);
        }

        return items.filter(p => {
            const isPasskey = p.itemType === 'passkey' || !!p.passkeyData;
            if (!isPasskey) {
                if (!p.locked && (!p.username || !p.password)) return false;
                if (p.locked && (!p.username && !p.password && !p.url && !p.title)) return false;

                if (!targetHost && !targetRpId) return false;
                const itemHost = p.url || p.title || '';
                if (targetHost && domainsMatch(targetHost, itemHost)) return true;
                if (targetRpId && domainsMatch(targetRpId, itemHost)) return true;
                return false;
            }

            // Passkey matching: strictly validate WebAuthn RP ID / registrable domain scope
            const storedRp = p.passkeyData?.rpId || p.url || p.title || '';
            const rpMatched = rpIdMatches(storedRp, targetRpId, targetHost) ||
                (p.url && rpIdMatches(p.url, targetRpId, targetHost));

            if (!rpMatched) {
                return false;
            }

            // If allowCredentials were provided, check normalized credentialId match
            if (allowCreds.length > 0 && p.passkeyData?.credentialId) {
                const credId = normalizeCredIdToHex(p.passkeyData.credentialId);
                if (credId && allowCreds.includes(credId)) {
                    return true;
                }
            }

            return true;
        });
    } catch (e) {
        console.error('[vault-get-matching] Error:', e);
        return [];
    }
});

ipcMain.handle('vault-change-password', async (event, oldPassword, newPassword) => {
    assertTrustedAppShell(event, 'vault-change-password');
    try {
        if (!newPassword || typeof newPassword !== 'string') {
            return { success: false, error: 'Invalid new password' };
        }
        await ensureVault();
        const vault = readVaultSync();

        let oldKey = null;
        if (masterKey && (!oldPassword || oldPassword === activeMasterPassword)) {
            oldKey = masterKey;
        } else if (oldPassword) {
            if (vault.vaultSalt) {
                const k = deriveKey(oldPassword, vault.vaultSalt);
                if (safeDecrypt(vault.canary, k) !== null) oldKey = k;
            }
            if (!oldKey) {
                const kLegacy = deriveLegacyKey(oldPassword);
                if (safeDecrypt(vault.canary, kLegacy) !== null) oldKey = kLegacy;
            }
            if (!oldKey) {
                const kLegacy2026 = deriveLegacyKey2026(oldPassword);
                if (safeDecrypt(vault.canary, kLegacy2026) !== null) oldKey = kLegacy2026;
            }
        }

        if (!oldKey && !masterKey) {
            return { success: false, error: 'Incorrect current master password' };
        }

        const effectiveOldKey = oldKey || masterKey;

        // Decrypt all existing items with effective old key and candidate passwords
        const decryptedItems = healAndDecryptVaultItems(
            vault,
            effectiveOldKey,
            [oldPassword, activeMasterPassword].filter(Boolean)
        );

        // Generate fresh random salt for the new password
        const newSalt = crypto.randomBytes(32).toString('hex');
        const newKey = deriveKey(newPassword, newSalt);

        vault.vaultSalt = newSalt;
        vault.canary = encrypt('QBROWSE_VAULT_OK', newKey);

        // Re-encrypt every password item with newKey
        vault.passwords = decryptedItems.map(item => {
            const copy = { ...item };
            if (copy.rawTitle !== undefined) {
                copy.title = copy.rawTitle;
                delete copy.rawTitle;
            }
            delete copy.decryptionFailed;
            return {
                ...copy,
                password: encrypt(item.password || '', newKey)
            };
        });

        masterKey = newKey;
        activeMasterPassword = newPassword;

        // If Windows Hello enabled, automatically re-wrap bioConfig
        if (vault.bioConfig?.enabled) {
            const secretJson = JSON.stringify({ keyHex: newKey.toString('hex'), masterPassword: newPassword });
            if (safeStorage && safeStorage.isEncryptionAvailable()) {
                vault.bioConfig.wrappedSecretBase64 = safeStorage.encryptString(secretJson).toString('base64');
                vault.bioConfig.useSafeStorage = true;
            } else {
                const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseBio');
                vault.bioConfig.wrappedSecretBase64 = Buffer.from(encrypt(secretJson, machineKey), 'utf8').toString('base64');
                vault.bioConfig.useSafeStorage = false;
            }
        }

        writeVaultSync(vault);
        return { success: true };
    } catch (e) {
        console.error('[Vault] vault-change-password error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vault-reset', async (event) => {
    assertTrustedAppShell(event, 'vault-reset');
    try {
        const vault = { canary: null, vaultSalt: null, passwords: [] };
        masterKey = null;
        activeMasterPassword = null;
        writeVaultSync(vault);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vault-wrap-sync-secret', async (event, secret) => {
    assertTrustedAppShell(event, 'vault-wrap-sync-secret');
    try {
        if (!secret) return null;
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
            return safeStorage.encryptString(String(secret)).toString('base64');
        }
        const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseSync');
        const encrypted = encrypt(String(secret), machineKey);
        return Buffer.from(encrypted, 'utf8').toString('base64');
    } catch (e) {
        console.error('[Vault] vault-wrap-sync-secret failed:', e);
        return null;
    }
});

ipcMain.handle('vault-unwrap-sync-secret', async (event, wrappedBase64) => {
    assertTrustedAppShell(event, 'vault-unwrap-sync-secret');
    try {
        if (!wrappedBase64) return null;
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
            try {
                return safeStorage.decryptString(Buffer.from(wrappedBase64, 'base64'));
            } catch (_) {
                // If safeStorage decrypt failed, fall through to fallback decrypt
            }
        }
        const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseSync');
        const raw = Buffer.from(wrappedBase64, 'base64').toString('utf8');
        return safeDecrypt(raw, machineKey);
    } catch (e) {
        console.error('[Vault] vault-unwrap-sync-secret failed:', e);
        return null;
    }
});

// AI IPC
let aiProcess = null;
ipcMain.handle('start-local-ai', async () => {
    if (aiProcess) return true;
    
    const isWin = process.platform === 'win32';
    const modelPath = path.join(appDataPath, 'models', 'llama-3.2-1b-instruct-q4_0.gguf');
    const serverPath = path.join(appDataPath, 'bin', isWin ? 'llama-server.exe' : 'llama-server');
    
    try {
        await fs.access(modelPath);
        await fs.access(serverPath);
        
        aiProcess = spawn(serverPath, ['-m', modelPath, '--port', '8080']);
        return true;
    } catch {
        return false; // Not downloaded
    }
});

// --- PERMISSIONS & COOKIE STORAGE MANAGEMENT ---
// Site permissions are managed centrally by PermissionManager (persisted per-origin in userData/site-permissions.json,
// while Ghost/Tor ephemeral sessions stay strictly in memory and never touch disk).

function getSessionByPartition(partition) {
    if (partition && typeof partition === 'string' && partition.trim()) {
        return session.fromPartition(partition.trim());
    }
    return session.defaultSession;
}

ipcMain.handle('get-cookies', async (event, filter = {}) => {
    assertTrustedAppShell(event, 'get-cookies');
    try {
        const targetSession = getSessionByPartition(filter.partition);
        const cookieFilter = { ...filter };
        delete cookieFilter.partition;
        const cookies = await targetSession.cookies.get(cookieFilter);
        return cookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            expirationDate: c.expirationDate,
            sameSite: c.sameSite
        }));
    } catch (e) {
        return [];
    }
});

ipcMain.handle('remove-cookie', async (event, url, name, partition) => {
    assertTrustedAppShell(event, 'remove-cookie');
    try {
        const targetSession = getSessionByPartition(partition);
        await targetSession.cookies.remove(url, name);
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('clear-site-cookies', async (event, domain, partition) => {
    assertTrustedAppShell(event, 'clear-site-cookies');
    try {
        const targetSession = getSessionByPartition(partition);
        const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
        const cookies = await targetSession.cookies.get({});
        let count = 0;
        for (const c of cookies) {
            if (c.domain.toLowerCase().includes(cleanDomain)) {
                const protocol = c.secure ? 'https' : 'http';
                const cleanCookieDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
                const url = `${protocol}://${cleanCookieDomain}${c.path}`;
                await targetSession.cookies.remove(url, c.name);
                count++;
            }
        }
        await targetSession.clearStorageData({
            origin: `https://${cleanDomain}`,
            storages: ['cookies', 'localstorage', 'caches', 'indexdb', 'websql']
        });
        return count;
    } catch (e) {
        return 0;
    }
});

ipcMain.handle('clear-all-data', async (event, options = {}) => {
    assertTrustedAppShell(event, 'clear-all-data');
    try {
        const storages = [];
        if (options.cookies) storages.push('cookies');
        if (options.cache) storages.push('caches', 'shadercache');
        if (options.storage) storages.push('localstorage', 'indexdb', 'websql');
        
        const targetSession = getSessionByPartition(options.partition);
        await targetSession.clearStorageData({
            storages: storages.length > 0 ? storages : ['cookies', 'localstorage', 'caches', 'shadercache']
        });
        await targetSession.clearCache();
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('get-app-metrics', async () => {
    try {
        const metrics = app.getAppMetrics();
        const procList = metrics.map(m => {
            const privateKB = m.memory?.privateBytes || 0;
            const workingSetKB = m.memory?.workingSetSize || 0;
            const memMB = privateKB > 0 ? Math.round(privateKB / 1024) : Math.round(workingSetKB / 1024);
            return {
                pid: m.pid,
                type: m.type,
                cpu: Math.round((m.cpu?.percentCPUUsage || 0) * 10) / 10,
                memoryMB: memMB,
                workingSetMB: Math.round(workingSetKB / 1024),
                peakMemoryMB: Math.round((m.memory?.peakWorkingSetSize || 0) / 1024),
                isMain: m.pid === process.pid
            };
        });

        try {
            const totalSysMemMB = Math.round(os.totalmem() / (1024 * 1024));
            const freeSysMemMB = Math.round(os.freemem() / (1024 * 1024));
            procList.system = {
                totalMB: totalSysMemMB,
                freeMB: freeSysMemMB,
                usedMB: totalSysMemMB - freeSysMemMB
            };
        } catch (sysErr) {}

        return procList;
    } catch (e) {
        return [];
    }
});

ipcMain.handle('kill-process', async (event, pid) => {
    assertTrustedAppShell(event, 'kill-process');
    try {
        if (!pid || pid === process.pid) {
            console.warn('[TaskManager] Cannot terminate the main browser process via IPC.');
            return false;
        }
        process.kill(pid);
        debugLog(`[TaskManager] Terminated process ${pid}`);
        return true;
    } catch (err) {
        console.warn(`[TaskManager] Failed to terminate process ${pid}:`, err);
        return false;
    }
});

ipcMain.handle('open-new-window', async (event, options = {}) => {
    try {
        createWindow(options);
        return true;
    } catch (err) {
        console.warn('Failed to open new window:', err);
        return false;
    }
});

ipcMain.handle('get-window-id', (event) => {
    return event.sender.id;
});

ipcMain.handle('tab-transferred', (event, { sourceWindowId, tabId }) => {
    try {
        const allWins = BrowserWindow.getAllWindows();
        for (const w of allWins) {
            if (w.webContents && w.webContents.id === sourceWindowId) {
                w.webContents.send('tab-removed-from-window', { tabId });
                return true;
            }
            if (w.id === sourceWindowId) {
                w.webContents.send('tab-removed-from-window', { tabId });
                return true;
            }
        }
    } catch (err) {
        console.warn('[TabTransfer] Failed to notify source window:', err);
    }
    return false;
});

ipcMain.handle('open-new-window-with-tab', async (event, { tab, spaceType, screenX, screenY }) => {
    try {
        createWindow({
            initialTab: tab,
            space: spaceType || 'personal',
            x: typeof screenX === 'number' ? Math.max(0, screenX - 120) : undefined,
            y: typeof screenY === 'number' ? Math.max(0, screenY - 60) : undefined
        });
        return true;
    } catch (err) {
        console.warn('Failed to open new window with tab:', err);
        return false;
    }
});

ipcMain.handle('close-current-window', async (event) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win && !win.isDestroyed()) {
            win.close();
            return true;
        }
    } catch (err) {}
    return false;
});

ipcMain.handle('clear-ghost-session', async () => {
    try {
        const ghostSess = session.fromPartition('ghost');
        if (ghostSess) {
            await ghostSess.clearStorageData();
            await ghostSess.clearCache();
            debugLog('[Ghost Mode] In-memory ghost session data and cache cleared.');
        }
        permissionManager.clearSessionPermissions('ghost');
        return true;
    } catch (e) {
        console.warn('[Ghost Mode] Error clearing ghost session:', e);
        return false;
    }
});

ipcMain.handle('clear-tor-session', async () => {
    try {
        const torSess = session.fromPartition('tor');
        if (torSess) {
            await torSess.clearStorageData();
            await torSess.clearCache();
            debugLog('[Tor Mode] In-memory tor session data and cache cleared.');
        }
        permissionManager.clearSessionPermissions('tor');
        return true;
    } catch (e) {
        console.warn('[Tor Mode] Error clearing tor session:', e);
        return false;
    }
});

ipcMain.on('qbrowse-permission-response', async (event, payload = {}) => {
    try {
        const { requestId, decision } = payload || {};
        if (!requestId) return;
        await permissionManager.resolveLivePrompt(requestId, decision || 'dismiss', {
            notifyDismiss: false,
            beforeGrant: async (entry) => {
                if (entry?.keys && (entry.keys.includes('camera') || entry.keys.includes('microphone'))) {
                    return ensureMacOSMediaAccess(entry.keys);
                }
                return true;
            }
        });
    } catch (err) {
        console.warn('[Permissions] Response handler error:', err?.message || err);
    }
});

ipcMain.handle('get-site-permissions', async (event, originOrDomain, options = {}) => {
    if (!originOrDomain) return permissionManager.getAllPersistentPermissions();
    return permissionManager.getSitePermissions(originOrDomain, options || {});
});

ipcMain.handle('set-site-permission', async (event, originOrDomain, permission, value, options = {}) => {
    if (!originOrDomain || !permission) return false;
    return permissionManager.setSitePermission(originOrDomain, permission, value, options || {});
});

ipcMain.handle('get-all-site-permissions', async () => {
    return permissionManager.getAllPersistentPermissions();
});

ipcMain.handle('reset-site-permissions', async (event, originOrDomain, options = {}) => {
    if (!originOrDomain) return false;
    return permissionManager.resetSitePermissions(originOrDomain, options || {});
});

ipcMain.handle('select-folder', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Downloads Directory'
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    } catch {
        return null;
    }
});

ipcMain.handle('set-doh', async (event, payload) => {
    try {
        let opts = {};
        if (typeof payload === 'string') {
            opts = { provider: payload };
        } else if (payload && typeof payload === 'object') {
            opts = payload;
        }

        if (opts.provider) settingsStore.doh = opts.provider;
        if (opts.mode) settingsStore.dohMode = opts.mode;
        if (opts.customUrl !== undefined) settingsStore.customDohUrl = opts.customUrl;

        try {
            fsSync.writeFileSync(settingsPath, JSON.stringify(settingsStore, null, 2), 'utf8');
        } catch (_) {}

        return applyDnsConfiguration(opts);
    } catch (err) {
        console.error('[DNS] set-doh error:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('test-dns', async (event, endpoint) => {
    try {
        let url = endpoint;
        if (!url || typeof url !== 'string') {
            const provider = settingsStore.doh || 'cloudflare';
            url = provider === 'custom' ? settingsStore.customDohUrl : (DOH_PROVIDERS[provider] || DOH_PROVIDERS.cloudflare);
        }
        url = formatDohUrl(url);
        if (!url) return { ok: false, error: 'Invalid DNS endpoint URL' };

        const testUrl = url.includes('?') ? `${url}&name=cloudflare.com&type=A` : `${url}?name=cloudflare.com&type=A`;
        const start = Date.now();
        const response = await net.fetch(testUrl, {
            headers: { 'accept': 'application/dns-json, application/dns-message, text/html' },
            method: 'GET'
        });
        const latency = Date.now() - start;
        return {
            ok: response.ok || response.status === 400 || response.status === 405,
            status: response.status,
            latency,
            server: url
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('get-settings', () => {
    return getSettingsStore();
});

ipcMain.handle('get-smart-dark-state', (event, url) => {
    try {
        if (isInternalAppShellWebContents(event.sender)) {
            return { isForceDark: false, isExcluded: true, excludeMedia: true };
        }
        const { isForceDark, exclusions, excludeMedia } = resolveSmartDarkConfig();
        const isExcluded = isUrlExcludedFromDarkMode(url, exclusions);
        return { isForceDark, isExcluded, excludeMedia };
    } catch (_) {
        return { isForceDark: false, isExcluded: false, excludeMedia: true };
    }
});

ipcMain.handle('get-text-highlight-state', () => {
    const store = getSettingsStore();
    return {
        style: store?.textHighlightStyle || liveTextHighlightState.style || 'tinted',
        color: store?.textHighlightColor || liveTextHighlightState.color || 'accent',
        accentColor: store?.accentColor || liveTextHighlightState.accentColor || '#d4bc94',
        applyToWeb: typeof store?.textHighlightApplyToWeb === 'boolean' ? store.textHighlightApplyToWeb : (liveTextHighlightState.applyToWeb !== false)
    };
});

ipcMain.on('sync-text-highlight-state', (event, payload = {}) => {
    if (typeof payload.style === 'string') {
        liveTextHighlightState.style = payload.style;
        settingsStore['textHighlightStyle'] = payload.style;
    }
    if (typeof payload.color === 'string') {
        liveTextHighlightState.color = payload.color;
        settingsStore['textHighlightColor'] = payload.color;
    }
    if (typeof payload.accentColor === 'string') {
        liveTextHighlightState.accentColor = payload.accentColor;
    }
    if (typeof payload.applyToWeb === 'boolean') {
        liveTextHighlightState.applyToWeb = payload.applyToWeb;
        settingsStore['textHighlightApplyToWeb'] = payload.applyToWeb;
    }
    scheduleSettingsDiskFlush();
    try {
        const state = {
            style: liveTextHighlightState.style,
            color: liveTextHighlightState.color,
            accentColor: liveTextHighlightState.accentColor,
            applyToWeb: liveTextHighlightState.applyToWeb
        };
        for (const wc of webContents.getAllWebContents()) {
            if (!wc || wc.isDestroyed() || wc.getType() !== 'webview') continue;
            try { wc.send('apply-text-highlight', state); } catch (_) {}
        }
    } catch (_) {}
});

ipcMain.on('sync-smart-dark-state', (event, { isForceDark, darkExclusions, darkExcludeMedia }) => {
    if (typeof isForceDark === 'boolean') {
        liveSmartDarkState.isForceDark = isForceDark;
        settingsStore['isForceDark'] = isForceDark;
    }
    if (Array.isArray(darkExclusions)) {
        const normalized = normalizeWhitelist(darkExclusions);
        liveSmartDarkState.darkExclusions = normalized;
        settingsStore['darkExclusions'] = normalized;
    }
    if (typeof darkExcludeMedia === 'boolean') {
        liveSmartDarkState.darkExcludeMedia = darkExcludeMedia;
        settingsStore['darkExcludeMedia'] = darkExcludeMedia;
    }
    if (!settingsPath) {
        settingsPath = path.join(app.getPath('userData'), 'settings.json');
    }
    try {
        fsSync.writeFileSync(settingsPath, JSON.stringify(settingsStore, null, 2), 'utf8');
    } catch (_) {}
    broadcastSmartDarkToOAuthWindows();
});

let settingsFlushTimer = null;
function scheduleSettingsDiskFlush() {
    if (settingsFlushTimer) clearTimeout(settingsFlushTimer);
    settingsFlushTimer = setTimeout(() => {
        settingsFlushTimer = null;
        if (!settingsPath) {
            try {
                settingsPath = path.join(app.getPath('userData'), 'settings.json');
            } catch (_) {
                return;
            }
        }
        const serialized = JSON.stringify(settingsStore, null, 2);
        fs.writeFile(settingsPath, serialized, 'utf8').catch(() => {});
    }, 120);
}

app.on('before-quit', () => {
    if (settingsFlushTimer) {
        clearTimeout(settingsFlushTimer);
        settingsFlushTimer = null;
        try {
            if (!settingsPath) {
                settingsPath = path.join(app.getPath('userData'), 'settings.json');
            }
            fsSync.writeFileSync(settingsPath, JSON.stringify(settingsStore, null, 2), 'utf8');
        } catch (_) {}
    }
});

ipcMain.handle('save-setting', (event, data) => {
    assertTrustedAppShell(event, 'save-setting');
    if (!settingsPath) {
        settingsPath = path.join(app.getPath('userData'), 'settings.json');
    }
    const batchObj = (data && typeof data === 'object')
        ? (data.batch || (data.key && typeof data.key === 'object' ? data.key.batch : null))
        : null;
    if (batchObj && typeof batchObj === 'object') {
        let shouldBroadcastSmartDark = false;
        Object.entries(batchObj).forEach(([k, v]) => {
            if (typeof k === 'string') {
                settingsStore[k] = v;
                if (k === 'adblockEnabled' && typeof v === 'boolean') {
                    adblockEngine.setActive(v);
                }
                if (k === 'adblockCustomBlockedDomains') {
                    adblockEngine.rebuildCustomRules(settingsStore);
                }
                if (k === 'isForceDark' && typeof v === 'boolean') {
                    liveSmartDarkState.isForceDark = v;
                    shouldBroadcastSmartDark = true;
                }
                if (k === 'darkExclusions' && Array.isArray(v)) {
                    const normalized = normalizeWhitelist(v);
                    settingsStore[k] = normalized;
                    liveSmartDarkState.darkExclusions = normalized;
                    shouldBroadcastSmartDark = true;
                }
                if (k === 'darkExcludeMedia' && typeof v === 'boolean') {
                    liveSmartDarkState.darkExcludeMedia = v;
                    shouldBroadcastSmartDark = true;
                }
                if (k === 'a11yReducedMotion') {
                    settingsStore.a11yReducedMotion = Boolean(v);
                }
                if (k === 'passkeyProviderMode' && (v === 'hardware' || v === 'qvault')) {
                    livePasskeyState.passkeyProviderMode = v;
                }
                if (k === 'passkeyHardwareFallback' && typeof v === 'boolean') {
                    livePasskeyState.passkeyHardwareFallback = v;
                }
                if (k === 'vaultProvider' && typeof v === 'string' && VALID_VAULT_PROVIDER_RE.test(v)) {
                    livePasskeyState.vaultProvider = v;
                }
            }
        });
        scheduleSettingsDiskFlush();
        if (shouldBroadcastSmartDark) {
            broadcastSmartDarkToOAuthWindows();
        }
        return true;
    }
    const rawKey = (data && typeof data === "object" && typeof data.key === "object" && data.key?.key) ? data.key.key : data?.key;
    const rawValue = (data && typeof data === "object" && typeof data.key === "object" && data.key?.value !== undefined) ? data.key.value : data?.value;
    if (rawKey && typeof rawKey === "string") {
        settingsStore[rawKey] = rawValue;
        if (rawKey === 'adblockEnabled' && typeof rawValue === 'boolean') {
            adblockEngine.setActive(rawValue);
        }
        if (rawKey === 'adblockCustomBlockedDomains') {
            adblockEngine.rebuildCustomRules(settingsStore);
        }
        if (rawKey === 'isForceDark' && typeof rawValue === 'boolean') {
            liveSmartDarkState.isForceDark = rawValue;
        }
        if (rawKey === 'darkExclusions' && Array.isArray(rawValue)) {
            const normalized = normalizeWhitelist(rawValue);
            settingsStore[rawKey] = normalized;
            liveSmartDarkState.darkExclusions = normalized;
        }
        if (rawKey === 'darkExcludeMedia' && typeof rawValue === 'boolean') {
            liveSmartDarkState.darkExcludeMedia = rawValue;
        }
        if (rawKey === 'a11yReducedMotion') {
            settingsStore.a11yReducedMotion = Boolean(rawValue);
        }
        if (rawKey === 'passkeyProviderMode' && (rawValue === 'hardware' || rawValue === 'qvault')) {
            livePasskeyState.passkeyProviderMode = rawValue;
        }
        if (rawKey === 'passkeyHardwareFallback' && typeof rawValue === 'boolean') {
            livePasskeyState.passkeyHardwareFallback = rawValue;
        }
        if (rawKey === 'vaultProvider' && typeof rawValue === 'string' && VALID_VAULT_PROVIDER_RE.test(rawValue)) {
            livePasskeyState.vaultProvider = rawValue;
        }
        scheduleSettingsDiskFlush();
        if (rawKey === 'isForceDark' || rawKey === 'darkExclusions' || rawKey === 'darkExcludeMedia') {
            broadcastSmartDarkToOAuthWindows();
        }
    }
    return true;
});

ipcMain.handle('set-webrtc', async (event, enabled) => {
    try {
        const policy = enabled ? 'default_public_interface_only' : 'default';
        const sessions = [session.defaultSession, session.fromPartition('ghost')];
        sessions.forEach(s => {
            if (s && s.setWebRTCIPHandlingPolicy) {
                s.setWebRTCIPHandlingPolicy(policy);
            }
        });
        return true;
    } catch {
        return false;
    }
});

// Browser Data & Bookmarks Migration
function getBrowserBookmarksPath(browserId) {
    const isWin = process.platform === 'win32';
    const local = process.env.LOCALAPPDATA || (isWin ? path.join(os.homedir(), 'AppData', 'Local') : '');
    const home = os.homedir();

    if (browserId === 'chrome') {
        return isWin 
            ? path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks')
            : path.join(home, '.config', 'google-chrome', 'Default', 'Bookmarks');
    } else if (browserId === 'edge') {
        return isWin 
            ? path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Bookmarks')
            : path.join(home, '.config', 'microsoft-edge', 'Default', 'Bookmarks');
    } else if (browserId === 'brave') {
        return isWin 
            ? path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Bookmarks')
            : path.join(home, '.config', 'BraveSoftware', 'Brave-Browser', 'Default', 'Bookmarks');
    }
    return null;
}

function extractChromiumBookmarks(node, list = []) {
    if (!node) return list;
    if (node.type === 'url' && node.url && !node.url.startsWith('javascript:')) {
        list.push({ title: node.name || node.url, url: node.url });
    }
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            extractChromiumBookmarks(child, list);
        }
    }
    return list;
}

ipcMain.handle('import-detect-browsers', async () => {
    const browsers = [
        { id: 'edge', name: 'Microsoft Edge', icon: 'edge' },
        { id: 'chrome', name: 'Google Chrome', icon: 'chrome' },
        { id: 'brave', name: 'Brave Browser', icon: 'brave' }
    ];

    const results = [];
    for (const b of browsers) {
        const p = getBrowserBookmarksPath(b.id);
        let found = false;
        let count = 0;
        if (p && fsSync.existsSync(p)) {
            try {
                const raw = JSON.parse(fsSync.readFileSync(p, 'utf8'));
                const list = [];
                for (const k of Object.keys(raw.roots || {})) {
                    extractChromiumBookmarks(raw.roots[k], list);
                }
                found = true;
                count = list.length;
            } catch (_) {}
        }
        results.push({ ...b, found, count });
    }
    return results;
});

ipcMain.handle('import-browser-bookmarks', async (event, browserId) => {
    const p = getBrowserBookmarksPath(browserId);
    if (!p || !fsSync.existsSync(p)) {
        return { success: false, error: 'Bookmarks not found for this browser.' };
    }
    try {
        const raw = JSON.parse(fsSync.readFileSync(p, 'utf8'));
        const bookmarks = [];
        for (const k of Object.keys(raw.roots || {})) {
            extractChromiumBookmarks(raw.roots[k], bookmarks);
        }
        return { success: true, count: bookmarks.length, bookmarks };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('import-pick-html-bookmarks', async () => {
    const res = await dialog.showOpenDialog({
        title: 'Select HTML Bookmarks File',
        properties: ['openFile'],
        filters: [{ name: 'Bookmarks HTML', extensions: ['html', 'htm'] }]
    });

    if (res.canceled || !res.filePaths.length) {
        return { success: false, canceled: true };
    }

    try {
        const content = fsSync.readFileSync(res.filePaths[0], 'utf8');
        const bookmarks = [];
        const regex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const url = match[1];
            const title = match[2].replace(/<[^>]+>/g, '').trim();
            if (url && !url.startsWith('javascript:')) {
                bookmarks.push({ title: title || url, url });
            }
        }
        return { success: true, count: bookmarks.length, bookmarks, filename: path.basename(res.filePaths[0]) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

const aiEngine = require('./aiEngine.cjs');

ipcMain.handle('ai-start-server', async (event, options) => {
    assertTrustedAppShell(event, 'ai-start-server');
    return aiEngine.startLlamaServer(
        options,
        (logLine) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ai-log-event', logLine);
            }
        },
        (metrics) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ai-status-event', metrics);
            }
        }
    );
});

ipcMain.handle('ai-stop-server', async (event) => {
    assertTrustedAppShell(event, 'ai-stop-server');
    return aiEngine.stopLlamaServer();
});

ipcMain.handle('ai-get-auth-token', (event) => {
    assertTrustedAppShell(event, 'ai-get-auth-token');
    return aiEngine.getAiApiToken ? aiEngine.getAiApiToken() : null;
});

ipcMain.handle('ai-update-engine', async () => {
    return aiEngine.updateEngine((metrics) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-status-event', metrics);
        }
    });
});

ipcMain.handle('ai-get-status', async () => {
    return aiEngine.getStatus();
});

ipcMain.handle('ai-get-logs', async () => {
    return aiEngine.getLogs();
});

ipcMain.handle('ai-pick-model-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select GGUF Model File for llama.cpp',
        filters: [{ name: 'GGUF Models', extensions: ['gguf', 'bin'] }],
        properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('ai-download-model', async (event, { url, filename }) => {
    assertTrustedAppShell(event, 'ai-download-model');
    return aiEngine.downloadModel(url, filename, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-download-progress', progress);
        }
    });
});

ipcMain.handle('ai-cancel-download', async () => {
    return aiEngine.cancelModelDownload();
});

ipcMain.handle('ai-generate-completion', async (event, options) => {
    aiEngine.processPromptStream(
        options,
        (token) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ai-stream-token', token);
            }
        },
        () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ai-stream-done');
            }
        }
    );
    return { success: true };
});

ipcMain.handle('ai-parse-file', async (event, filePath) => {
    assertTrustedAppShell(event, 'ai-parse-file');
    if (!fsSync.existsSync(filePath)) throw new Error('File not found');
    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === '.pdf') {
            const res = await rustBridge.aiExtractPdfText(filePath, 200);
            return res?.text || '';
        } else if (ext === '.docx') {
            return await rustBridge.aiExtractDocxText(filePath);
        } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.bmp') {
            const res = await rustBridge.aiOcrImage(filePath, null);
            return res?.text || '';
        } else {
            return fsSync.readFileSync(filePath, 'utf-8');
        }
    } catch (e) {
        console.error('File parse error:', e);
        throw e;
    }
});

ipcMain.handle('ai-web-search', async (event, query) => {
    try {
        // Use native fetch in the Node backend to bypass CORS
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': CHROME_USER_AGENT
            }
        });
        
        if (!response.ok) {
            return `Web search failed: HTTP ${response.status}`;
        }
        
        const html = await response.text();
        const results = [];
        const resultRegex = /<a class="result__url" href="([^"]+)">[^<]*<\/a>[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
        let match;
        
        while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
            let url = match[1];
            if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
                try {
                    url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
                } catch(e) {}
            }
            let snippet = match[2].replace(/<[^>]+>/g, '').trim();
            results.push(`URL: ${url}\nSnippet: ${snippet}`);
        }
        
        if (results.length === 0) {
            return "No results found.";
        }
        return results.join('\n\n');
    } catch (err) {
        return `Web search error: ${err.message}`;
    }
});

// --- TOR NETWORK & HUD IPC HANDLERS ---
ipcMain.handle('tor-get-status', async () => {
    return torEngine.getStatus();
});

ipcMain.handle('tor-start', async (event) => {
    assertTrustedAppShell(event, 'tor-start');
    try {
        const result = await torEngine.startTor(
            (status) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('tor-status-changed', status);
                }
            },
            (progress) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('tor-bootstrap-progress', progress);
                }
            }
        );

        // Configure tor partition proxy with SOCKS5 to route traffic through Tor
        const torSession = session.fromPartition('tor');
        const socksPort = torEngine.getStatus().socksPort || 9050;
        await torSession.setProxy({
            proxyRules: `socks5://127.0.0.1:${socksPort}`,
            proxyBypassRules: '<local>'
        });
        if (torSession && typeof torSession.setWebRTCIPHandlingPolicy === 'function') {
            torSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
        }
        await torSession.closeAllConnections();

        return { success: true, ...result };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('tor-stop', async (event) => {
    assertTrustedAppShell(event, 'tor-stop');
    torEngine.stopTor();
    try {
        const torSession = session.fromPartition('tor');
        await torSession.setProxy({
            proxyRules: 'socks5://127.0.0.1:9050',
            proxyBypassRules: '<local>'
        });
        await torSession.clearStorageData();
        await torSession.closeAllConnections();
    } catch (_) {}
    return { success: true };
});

ipcMain.handle('tor-new-circuit', async () => {
    try {
        const torSession = session.fromPartition('tor');
        const res = await torEngine.requestNewTorCircuit();
        
        // Terminate existing keep-alive TCP sockets so Chromium establishes a new SOCKS connection
        if (torSession.closeAllConnections) {
            await torSession.closeAllConnections();
        }
        await torSession.clearStorageData({ storages: ['cookies', 'cachestorage'] });

        // If SIGNAL NEWNYM succeeded, give Tor ~1.2s to negotiate the fresh circuit, then query exit IP
        let newIpData = null;
        if (res.success && !res.rateLimited) {
            try {
                await new Promise(r => setTimeout(r, 1200));
                newIpData = await torEngine.checkTorExitIp();
            } catch (err) {
                console.warn('[Main] IP re-check after new identity failed:', err.message);
            }
        }

        let nodes = [];
        try {
            nodes = await torEngine.getCircuitStatus();
        } catch (_) {}

        return {
            ...res,
            exitIp: newIpData?.ip || null,
            isTor: newIpData?.isTor,
            circuitNodes: nodes
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('tor-check-ip', async () => {
    return torEngine.checkTorExitIp();
});

ipcMain.handle('tor-get-circuit', async () => {
    return torEngine.getCircuitStatus();
});

ipcMain.handle('tor-download-binary', async (event) => {
    assertTrustedAppShell(event, 'tor-download-binary');
    try {
        const res = await torEngine.downloadAndInstallTor((progress) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('tor-download-progress', progress);
            }
        });
        return { success: true, path: res };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('tor-set-security', async (event, level) => {
    return torEngine.setSecurityLevel(level);
});

// Performance & Hardware Profile Handlers
ipcMain.handle('system-get-hardware-profile', async () => {
    try {
        let gpuInfo = null;
        try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
        const isOnBattery = powerMonitor?.isOnBatteryPower ? powerMonitor.isOnBatteryPower() : false;
        return performanceEngine.detectHardwareProfile(gpuInfo, isOnBattery);
    } catch (e) {
        return {
            coreCount: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Standard CPU',
            totalMemGB: 8,
            freeMemGB: 4,
            detectedTier: 'balanced',
            activeTier: 'balanced',
            isOnBattery: false,
            mode: 'auto',
            tabSleepTimeoutMinutes: 15,
            reduceVisualsOnEco: true,
            reduceVisuals: false,
            gpuRenderer: 'Basic'
        };
    }
});

ipcMain.handle('system-get-performance-settings', async () => {
    return performanceEngine.getSettings();
});

ipcMain.handle('system-set-performance-settings', async (event, settings) => {
    const updated = performanceEngine.saveSettings(settings);
    let gpuInfo = null;
    try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
    const isOnBattery = powerMonitor?.isOnBatteryPower ? powerMonitor.isOnBatteryPower() : false;
    const profile = performanceEngine.detectHardwareProfile(gpuInfo, isOnBattery);
    applyPerformanceTierToContents(profile.activeTier);
    broadcastPerformanceProfile(profile);
    return profile;
});

// ==========================================
// Native Default Browser Integration Engine
// ==========================================

function ensureAppIco() {
    try {
        const userData = app.getPath('userData');
        const targetIco = path.join(userData, 'app.ico');

        if (fsSync.existsSync(targetIco) && fsSync.statSync(targetIco).size > 1000) {
            return targetIco;
        }

        const possiblePngs = [
            path.join(__dirname, '..', 'public', 'icon.png'),
            path.join(__dirname, '..', 'icon.png'),
            path.join(process.resourcesPath || '', 'icon.png'),
            path.join(process.resourcesPath || '', 'app.asar.unpacked', 'icon.png')
        ];

        let pngBuffer = null;
        for (const p of possiblePngs) {
            try {
                if (fsSync.existsSync(p)) {
                    pngBuffer = fsSync.readFileSync(p);
                    break;
                }
            } catch (_) {}
        }

        if (pngBuffer) {
            const header = Buffer.alloc(6);
            header.writeUInt16LE(0, 0); // reserved
            header.writeUInt16LE(1, 2); // ICO type
            header.writeUInt16LE(1, 4); // 1 image

            const entry = Buffer.alloc(16);
            entry.writeUInt8(0, 0); // width: 256px
            entry.writeUInt8(0, 1); // height: 256px
            entry.writeUInt8(0, 2); // color count
            entry.writeUInt8(0, 3); // reserved
            entry.writeUInt16LE(1, 4); // color planes
            entry.writeUInt16LE(32, 6); // bits per pixel
            entry.writeUInt32LE(pngBuffer.length, 8); // PNG size
            entry.writeUInt32LE(22, 12); // image offset

            const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
            fsSync.writeFileSync(targetIco, icoBuffer);
            return targetIco;
        }
    } catch (err) {
        console.warn('[DefaultBrowser] Failed to create app.ico:', err);
    }
    return null;
}

function registerWindowsBrowser() {
    if (process.platform !== 'win32') return false;
    try {
        const isPackaged = app.isPackaged;
        const exePath = process.execPath;
        const mainScript = path.resolve(__dirname, 'main.cjs');

        const openCmd = isPackaged 
            ? `"${exePath}" "%1"` 
            : `"${exePath}" "${mainScript}" "%1"`;
        const startCmd = isPackaged 
            ? `"${exePath}"` 
            : `"${exePath}" "${mainScript}"`;

        const icoFile = ensureAppIco();
        const iconCmd = icoFile || `${exePath},0`;

        const formatReg = (val) => `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

        const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\QBrowseHTML]
@="QBrowse HTML Document"
"AppUserModelId"="com.qbrowse.app"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\QBrowseHTML\\Application]
"AppUserModelId"="com.qbrowse.app"
"ApplicationIcon"=${formatReg(iconCmd)}
"ApplicationName"="QBrowse"
"ApplicationDescription"="QBrowse - Intelligent Next-Gen Web Browser"
"ApplicationCompany"="QuBI"

[HKEY_CURRENT_USER\\Software\\Classes\\QBrowseHTML\\DefaultIcon]
@=${formatReg(iconCmd)}

[HKEY_CURRENT_USER\\Software\\Classes\\QBrowseHTML\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\QBrowseHTML\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\QBrowseHTML\\shell\\open\\command]
@=${formatReg(openCmd)}

[HKEY_CURRENT_USER\\Software\\Classes\\qbrowse]
@="URL:QBrowse Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\qbrowse\\DefaultIcon]
@=${formatReg(iconCmd)}

[HKEY_CURRENT_USER\\Software\\Classes\\qbrowse\\shell\\open\\command]
@=${formatReg(openCmd)}

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse]
@="QBrowse"

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\DefaultIcon]
@=${formatReg(iconCmd)}

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\InstallInfo]
"ReinstallCommand"=${formatReg(isPackaged ? `"${exePath}" --make-default-browser` : `"${exePath}" "${mainScript}" --make-default-browser`)}
"HideIconsCommand"=${formatReg(isPackaged ? `"${exePath}" --hide-icons` : `"${exePath}" "${mainScript}" --hide-icons`)}
"ShowIconsCommand"=${formatReg(isPackaged ? `"${exePath}" --show-icons` : `"${exePath}" "${mainScript}" --show-icons`)}
"IconsVisible"=dword:00000001

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\shell]

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\shell\\open\\command]
@=${formatReg(startCmd)}

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\Capabilities]
"ApplicationName"="QBrowse"
"ApplicationIcon"=${formatReg(iconCmd)}
"ApplicationDescription"="QBrowse - Fast, private, intelligent web browser"

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\Capabilities\\Startmenu]
"StartMenuInternet"="QBrowse"

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\Capabilities\\FileAssociations]
".htm"="QBrowseHTML"
".html"="QBrowseHTML"
".shtml"="QBrowseHTML"
".xht"="QBrowseHTML"
".xhtml"="QBrowseHTML"
".svg"="QBrowseHTML"
".webp"="QBrowseHTML"

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\Capabilities\\URLAssociations]
"http"="QBrowseHTML"
"https"="QBrowseHTML"
"qbrowse"="qbrowse"

[HKEY_CURRENT_USER\\Software\\RegisteredApplications]
"QBrowse"="Software\\\\Clients\\\\StartMenuInternet\\\\QBrowse\\\\Capabilities"
`;

        const tempFile = path.join(app.getPath('temp'), `qbrowse_reg_${Date.now()}.reg`);
        fsSync.writeFileSync(tempFile, regContent, 'utf8');
        try {
            const { execFileSync } = require('child_process');
            execFileSync('reg.exe', ['import', tempFile], { stdio: ['ignore', 'pipe', 'ignore'] });
        } finally {
            try { fsSync.unlinkSync(tempFile); } catch (_) {}
        }
        return true;
    } catch (err) {
        console.warn('[DefaultBrowser] Failed to register Windows browser capabilities:', err);
        return false;
    }
}

function ensureLinuxDesktopEntry() {
    if (process.platform !== 'linux') return 'qbrowse.desktop';
    try {
        const entryState = resolveLinuxDesktopEntryState({ env: process.env, existsSync: fsSync.existsSync });
        if (!entryState.shouldWriteUserEntry) {
            return entryState.desktopId;
        }

        const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');
        fsSync.mkdirSync(appsDir, { recursive: true });

        const desktopFile = path.join(appsDir, entryState.desktopId);

        const execCmd = process.env.APPIMAGE
            ? `"${process.env.APPIMAGE}"`
            : app.isPackaged
                ? `"${process.execPath}"`
                : `"${process.execPath}" "${path.resolve(__dirname, 'main.cjs')}"`;

        let iconPath = 'QBrowse';
        const projectIcon = resolveAppIconPath();
        const userIconPath = path.join(appsDir, 'qbrowse.png');
        try {
            if (projectIcon && fsSync.existsSync(projectIcon) && !fsSync.existsSync(userIconPath)) {
                fsSync.copyFileSync(projectIcon, userIconPath);
                iconPath = userIconPath;
            } else if (fsSync.existsSync(userIconPath)) {
                iconPath = userIconPath;
            }
        } catch (_) {}

        const desktopContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=QBrowse
GenericName=Web Browser
Comment=Next-generation privacy-first browser with Tor, AI & Cloud Sync
Exec=${execCmd} %U
Icon=${iconPath}
Terminal=false
StartupNotify=true
StartupWMClass=QBrowse
Categories=Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml+xml;application/xml;application/rss+xml;application/rdf+xml;image/gif;image/jpeg;image/png;x-scheme-handler/http;x-scheme-handler/https;x-scheme-handler/qbrowse;
Actions=new-window;new-private-window;

[Desktop Action new-window]
Name=New Window
Exec=${execCmd} --new-window %U

[Desktop Action new-private-window]
Name=New Incognito Window
Exec=${execCmd} --incognito %U
`;

        fsSync.writeFileSync(desktopFile, desktopContent, 'utf8');
        try { fsSync.chmodSync(desktopFile, 0o755); } catch (_) {}

        try {
            const { execFileSync } = require('child_process');
            execFileSync('update-desktop-database', [appsDir], { stdio: ['ignore', 'pipe', 'ignore'] });
        } catch (_) {}

        return entryState.desktopId;
    } catch (err) {
        console.warn('[DefaultBrowser] Failed to write Linux desktop entry:', err);
        return 'qbrowse.desktop';
    }
}

let _cachedDefaultBrowserStatus = null;
let _cachedDefaultBrowserTimestamp = 0;

function checkIsDefaultBrowserAsync(forceFresh = false) {
    const now = Date.now();
    if (!forceFresh && _cachedDefaultBrowserStatus !== null && (now - _cachedDefaultBrowserTimestamp < 3000)) {
        return Promise.resolve(_cachedDefaultBrowserStatus);
    }

    return new Promise((resolve) => {
        try {
            if (process.platform === 'win32') {
                const { exec } = require('child_process');
                exec('reg.exe query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v "ProgId"', {
                    encoding: 'utf8',
                    timeout: 3000
                }, (err, stdout) => {
                    let isDefault = false;
                    let regQuerySucceeded = false;

                    if (!err && stdout && /ProgId/i.test(stdout)) {
                        regQuerySucceeded = true;
                        const match = stdout.match(/ProgId\s+REG_SZ\s+(\S+)/i);
                        if (match && match[1] && /qbrowse/i.test(match[1].trim())) {
                            isDefault = true;
                        }
                    }

                    exec('reg.exe query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice" /v "ProgId"', {
                        encoding: 'utf8',
                        timeout: 3000
                    }, (err2, stdout2) => {
                        if (!err2 && stdout2 && /ProgId/i.test(stdout2)) {
                            regQuerySucceeded = true;
                            const match2 = stdout2.match(/ProgId\s+REG_SZ\s+(\S+)/i);
                            if (match2 && match2[1] && /qbrowse/i.test(match2[1].trim())) {
                                isDefault = true;
                            }
                        }

                        // CRITICAL: Only fall back to app.isDefaultProtocolClient if regQuerySucceeded is false
                        // (e.g. older Windows versions or where UserChoice does not exist)
                        if (!regQuerySucceeded && typeof app.isDefaultProtocolClient === 'function') {
                            try {
                                if (app.isDefaultProtocolClient('http') || app.isDefaultProtocolClient('https')) {
                                    isDefault = true;
                                }
                            } catch (_) {}
                        }

                        _cachedDefaultBrowserStatus = isDefault;
                        _cachedDefaultBrowserTimestamp = Date.now();
                        resolve(isDefault);
                    });
                });
            } else if (process.platform === 'linux') {
                const { exec } = require('child_process');
                const runQuery = (cmd) => new Promise((res) => {
                    exec(cmd, { encoding: 'utf8', timeout: 2000 }, (err, stdout) => {
                        res(!err && stdout ? stdout.trim() : '');
                    });
                });

                (async () => {
                    let isDefault = false;
                    const xdgSettingsOut = await runQuery('xdg-settings get default-web-browser');
                    if (xdgSettingsOut && /qbrowse/i.test(xdgSettingsOut)) {
                        isDefault = true;
                    } else {
                        const xdgMimeOut = await runQuery('xdg-mime query default x-scheme-handler/http');
                        if (xdgMimeOut && /qbrowse/i.test(xdgMimeOut)) {
                            isDefault = true;
                        } else {
                            const gioOut = await runQuery('gio mime x-scheme-handler/http');
                            const gioFirstLine = gioOut.split(/\r?\n/)[0] || '';
                            if (gioFirstLine && /qbrowse/i.test(gioFirstLine)) {
                                isDefault = true;
                            }
                        }
                    }
                    _cachedDefaultBrowserStatus = isDefault;
                    _cachedDefaultBrowserTimestamp = Date.now();
                    resolve(isDefault);
                })();
            } else {
                const isHttp = typeof app.isDefaultProtocolClient === 'function' && app.isDefaultProtocolClient('http');
                const isHttps = typeof app.isDefaultProtocolClient === 'function' && app.isDefaultProtocolClient('https');
                const isDefault = Boolean(isHttp && isHttps);
                _cachedDefaultBrowserStatus = isDefault;
                _cachedDefaultBrowserTimestamp = Date.now();
                resolve(isDefault);
            }
        } catch (_) {
            _cachedDefaultBrowserStatus = false;
            _cachedDefaultBrowserTimestamp = Date.now();
            resolve(false);
        }
    });
}

function checkIsDefaultBrowser() {
    if (_cachedDefaultBrowserStatus !== null && (Date.now() - _cachedDefaultBrowserTimestamp < 3000)) {
        return _cachedDefaultBrowserStatus;
    }
    if (process.platform === 'win32') {
        return _cachedDefaultBrowserStatus ?? false;
    }
    const isHttp = typeof app.isDefaultProtocolClient === 'function' && app.isDefaultProtocolClient('http');
    const isHttps = typeof app.isDefaultProtocolClient === 'function' && app.isDefaultProtocolClient('https');
    return Boolean(isHttp && isHttps);
}

async function openMacDefaultBrowserSettings(preferGeneralFallback = false) {
    try {
        await shell.openExternal('x-apple.systempreferences:com.apple.Desktop-Settings.extension');
        return true;
    } catch (_) {
        if (preferGeneralFallback) {
            try {
                await shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
                return true;
            } catch (__) {}
        }
        try {
            const { exec } = require('child_process');
            await new Promise((resolve, reject) => {
                exec('open -a "System Settings"', (err) => (err ? reject(err) : resolve()));
            });
            return true;
        } catch (__) {
            if (!preferGeneralFallback) {
                try {
                    await shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
                    return true;
                } catch (___) {}
            }
            return false;
        }
    }
}

function tryLaunchLinuxSettingsCmd(cmd, args = []) {
    return new Promise((resolve) => {
        try {
            const { spawn } = require('child_process');
            const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
            let settled = false;
            const settle = (ok) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(ok);
            };
            const timer = setTimeout(() => {
                try { child.unref(); } catch (_) {}
                settle(true);
            }, 600);
            child.once('error', () => settle(false));
            child.once('exit', (code) => settle(code === 0));
        } catch (_) {
            resolve(false);
        }
    });
}

async function openLinuxDefaultAppsSettings() {
    const candidates = [
        ['xdg-open', ['settings://applications']],
        ['gnome-control-center', ['default-apps']],
        ['gnome-control-center', ['applications']],
        ['systemsettings', ['kcm_componentchooser']],
        ['systemsettings5', ['kcm_componentchooser']],
        ['xfce4-mime-settings', []]
    ];
    for (const [cmd, args] of candidates) {
        if (await tryLaunchLinuxSettingsCmd(cmd, args)) {
            return true;
        }
    }
    return false;
}

// Default Browser Handlers
ipcMain.handle('system-check-default-browser', async (event, options = {}) => {
    try {
        const forceFresh = Boolean(options && options.force);
        const isDefault = await checkIsDefaultBrowserAsync(forceFresh);
        return { isDefault, platform: process.platform };
    } catch (e) {
        return { isDefault: false, platform: process.platform, error: e.message };
    }
});

ipcMain.handle('system-set-default-browser', async (event) => {
    assertTrustedAppShell(event, 'system-set-default-browser');
    try {
        _cachedDefaultBrowserStatus = null;
        _cachedDefaultBrowserTimestamp = 0;

        if (process.platform === 'win32') {
            registerWindowsBrowser();

            if (typeof app.setAsDefaultProtocolClient === 'function') {
                try {
                    if (app.isPackaged) {
                        app.setAsDefaultProtocolClient('http');
                        app.setAsDefaultProtocolClient('https');
                        app.setAsDefaultProtocolClient('qbrowse');
                    } else if (process.argv[1]) {
                        const scriptPath = path.resolve(process.argv[1]);
                        app.setAsDefaultProtocolClient('http', process.execPath, [scriptPath]);
                        app.setAsDefaultProtocolClient('https', process.execPath, [scriptPath]);
                        app.setAsDefaultProtocolClient('qbrowse', process.execPath, [scriptPath]);
                    } else {
                        app.setAsDefaultProtocolClient('http');
                        app.setAsDefaultProtocolClient('https');
                        app.setAsDefaultProtocolClient('qbrowse');
                    }
                } catch (_) {}
            }

            const alreadyDefault = await checkIsDefaultBrowserAsync(true);
            if (!alreadyDefault) {
                try {
                    await shell.openExternal('ms-settings:defaultapps?registeredAppUser=QBrowse');
                } catch (_) {
                    try {
                        await shell.openExternal('ms-settings:defaultapps');
                    } catch (_) {}
                }
                return { success: true, isDefault: false, openedSystemSettings: true, platform: process.platform };
            }
            return { success: true, isDefault: true, openedSystemSettings: false, platform: process.platform };
        } else if (process.platform === 'linux') {
            const desktopId = ensureLinuxDesktopEntry() || 'qbrowse.desktop';
            const { execSync } = require('child_process');
            const cmds = [
                `xdg-settings set default-web-browser ${desktopId}`,
                `xdg-mime default ${desktopId} x-scheme-handler/http`,
                `xdg-mime default ${desktopId} x-scheme-handler/https`,
                `xdg-mime default ${desktopId} text/html`,
                `xdg-mime default ${desktopId} application/xhtml+xml`,
                `gio mime x-scheme-handler/http ${desktopId}`,
                `gio mime x-scheme-handler/https ${desktopId}`
            ];
            for (const cmd of cmds) {
                try {
                    execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 });
                } catch (_) {}
            }
            const isDefault = await checkIsDefaultBrowserAsync(true);
            return { success: true, isDefault, openedSystemSettings: false, platform: process.platform };
        } else if (process.platform === 'darwin') {
            if (typeof app.setAsDefaultProtocolClient === 'function') {
                try { app.setAsDefaultProtocolClient('http'); } catch (_) {}
                try { app.setAsDefaultProtocolClient('https'); } catch (_) {}
                try { app.setAsDefaultProtocolClient('qbrowse'); } catch (_) {}
            }
            const isDefault = await checkIsDefaultBrowserAsync(true);
            let openedSystemSettings = false;
            if (!isDefault) {
                openedSystemSettings = await openMacDefaultBrowserSettings(false);
            }
            return { success: true, isDefault, openedSystemSettings, platform: process.platform };
        } else {
            if (typeof app.setAsDefaultProtocolClient === 'function') {
                try { app.setAsDefaultProtocolClient('http'); } catch (_) {}
                try { app.setAsDefaultProtocolClient('https'); } catch (_) {}
                try { app.setAsDefaultProtocolClient('qbrowse'); } catch (_) {}
            }
            const isDefault = await checkIsDefaultBrowserAsync(true);
            return { success: true, isDefault, openedSystemSettings: false, platform: process.platform };
        }
    } catch (e) {
        return { success: false, platform: process.platform, error: e.message };
    }
});

ipcMain.handle('system-open-default-apps-settings', async () => {
    try {
        if (process.platform === 'win32') {
            registerWindowsBrowser();
            try {
                await shell.openExternal('ms-settings:defaultapps?registeredAppUser=QBrowse');
            } catch (_) {
                await shell.openExternal('ms-settings:defaultapps');
            }
            return { success: true };
        } else if (process.platform === 'linux') {
            ensureLinuxDesktopEntry();
            const opened = await openLinuxDefaultAppsSettings();
            return { success: opened };
        } else if (process.platform === 'darwin') {
            const opened = await openMacDefaultBrowserSettings(true);
            return { success: opened };
        }
        return { success: false };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('system-get-reduced-motion', () => {
    try {
        return checkWindowsReducedMotion();
    } catch (_) {
        return false;
    }
});

let _lastBroadcastedReducedMotion = null;
function broadcastReducedMotionIfChanged() {
    try {
        const currentMotion = checkWindowsReducedMotion();
        if (currentMotion !== _lastBroadcastedReducedMotion) {
            _lastBroadcastedReducedMotion = currentMotion;
            for (const win of browserWindows) {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('system-reduced-motion-changed', currentMotion);
                }
            }
        }
    } catch (_) {}
}

if (process.platform === 'win32') {
    setInterval(broadcastReducedMotionIfChanged, 2500);
}

try {
    nativeTheme.on('updated', () => {
        try {
            const prefersReducedMotion = checkWindowsReducedMotion();
            for (const win of browserWindows) {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('system-reduced-motion-changed', prefersReducedMotion);
                }
            }
        } catch (_) {}

        try {
            if (currentAppTheme === 'system') {
                const isDark = nativeTheme.shouldUseDarkColors;
                for (const win of browserWindows) {
                    if (win && !win.isDestroyed()) {
                        win.webContents.send('system-theme-updated', { shouldUseDarkColors: isDark });
                    }
                }
                const effectiveScheme = getEffectiveColorScheme();
                const bgColor = effectiveScheme === 'dark' ? '#121212' : '#ffffff';
                for (const wc of webContents.getAllWebContents()) {
                    if (!wc.isDestroyed() && wc.getType() === 'webview') {
                        try {
                            wc.setEmulatedMedia({ colorScheme: effectiveScheme });
                            wc.setBackgroundColor(bgColor);
                        } catch (_) {}
                    }
                }
            }
        } catch (_) {}
    });
} catch (_) {}

ipcMain.handle('get-initial-launch-url', () => {
    const url = initialUrlToOpen;
    initialUrlToOpen = null;
    return url;
});

// Custom Wallpaper & Background Handlers
ipcMain.handle('wallpaper-import-file', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Choose Custom Wallpaper',
            properties: ['openFile'],
            filters: [
                { name: 'All Supported Media (*.jpg, *.png, *.gif, *.mp4, *.webm)', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4v'] },
                { name: 'Live Videos (*.mp4, *.webm, *.mov)', extensions: ['mp4', 'webm', 'mov', 'm4v'] },
                { name: 'Images & GIFs (*.jpg, *.png, *.gif, *.webp)', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
            ]
        });

        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return { success: false, cancelled: true };
        }

        const sourceFile = result.filePaths[0];
        const ext = path.extname(sourceFile).toLowerCase() || '.png';
        const backgroundsDir = path.join(app.getPath('userData'), 'backgrounds');
        await fs.mkdir(backgroundsDir, { recursive: true });

        // Clean up previous wallpapers
        try {
            const existingFiles = await fs.readdir(backgroundsDir);
            for (const file of existingFiles) {
                if (file.startsWith('wallpaper_')) {
                    await fs.unlink(path.join(backgroundsDir, file)).catch(() => {});
                }
            }
        } catch (_) {}

        const filename = `wallpaper_${Date.now()}${ext}`;
        const destPath = path.join(backgroundsDir, filename);
        await fs.copyFile(sourceFile, destPath);

        return {
            success: true,
            url: `qbrowse-media://app/${filename}`,
            protocolUrl: `qbrowse-media://app/${filename}`,
            filename,
            isLocal: true
        };
    } catch (err) {
        console.error('[Main] Failed to import wallpaper from file:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('wallpaper-import-url', async (event, imageUrl) => {
    try {
        if (!imageUrl || typeof imageUrl !== 'string') {
            return { success: false, error: 'Invalid image URL' };
        }

        const parsedUrl = new URL(imageUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return { success: false, error: 'URL must start with http:// or https://' };
        }

        const response = await net.fetch(imageUrl);
        if (!response.ok) {
            return { success: false, error: `Failed to download image (HTTP ${response.status})` };
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0) {
            return { success: false, error: 'Downloaded file is empty' };
        }

        let ext = path.extname(parsedUrl.pathname).toLowerCase();
        const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov', '.m4v'];
        if (!ext || !validExtensions.includes(ext)) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('mp4')) ext = '.mp4';
            else if (contentType.includes('webm')) ext = '.webm';
            else if (contentType.includes('quicktime')) ext = '.mov';
            else if (contentType.includes('png')) ext = '.png';
            else if (contentType.includes('webp')) ext = '.webp';
            else if (contentType.includes('gif')) ext = '.gif';
            else ext = '.jpg';
        }

        const backgroundsDir = path.join(app.getPath('userData'), 'backgrounds');
        await fs.mkdir(backgroundsDir, { recursive: true });

        // Clean up previous wallpapers
        try {
            const existingFiles = await fs.readdir(backgroundsDir);
            for (const file of existingFiles) {
                if (file.startsWith('wallpaper_')) {
                    await fs.unlink(path.join(backgroundsDir, file)).catch(() => {});
                }
            }
        } catch (_) {}

        const filename = `wallpaper_${Date.now()}${ext}`;
        const destPath = path.join(backgroundsDir, filename);
        await fs.writeFile(destPath, buffer);

        return {
            success: true,
            url: `qbrowse-media://app/${filename}`,
            protocolUrl: `qbrowse-media://app/${filename}`,
            originalUrl: imageUrl,
            filename,
            isLocal: false
        };
    } catch (err) {
        console.error('[Main] Failed to import wallpaper from URL:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('wallpaper-get-active', async () => {
    try {
        const backgroundsDir = path.join(app.getPath('userData'), 'backgrounds');
        const files = await fs.readdir(backgroundsDir);
        const wallpaperFiles = files.filter(f => f.startsWith('wallpaper_'));
        if (wallpaperFiles.length === 0) {
            return { exists: false };
        }
        wallpaperFiles.sort().reverse();
        const latestFile = wallpaperFiles[0];
        return {
            exists: true,
            url: `qbrowse-media://app/${latestFile}`,
            protocolUrl: `qbrowse-media://app/${latestFile}`,
            filename: latestFile
        };
    } catch {
        return { exists: false };
    }
});

ipcMain.handle('wallpaper-reset', async () => {
    try {
        const backgroundsDir = path.join(app.getPath('userData'), 'backgrounds');
        const files = await fs.readdir(backgroundsDir);
        for (const file of files) {
            if (file.startsWith('wallpaper_')) {
                await fs.unlink(path.join(backgroundsDir, file)).catch(() => {});
            }
        }
        return { success: true };
    } catch {
        return { success: true };
    }
});

function parseGifBufferDuration(bytes) {
    if (!bytes || bytes.length < 13) return null;
    if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return null;

    let totalDurationMs = 0;
    let frameCount = 0;
    let i = 13;
    const gctFlag = bytes[10] & 0x80;
    if (gctFlag) {
        const gctSize = 3 * (1 << ((bytes[10] & 0x07) + 1));
        i += gctSize;
    }

    while (i < bytes.length) {
        const blockType = bytes[i++];
        if (blockType === 0x3B) break;
        if (blockType === 0x21) {
            const extType = bytes[i++];
            if (extType === 0xF9) {
                const blockSize = bytes[i++];
                if (blockSize >= 4) {
                    const delay = bytes[i + 1] | (bytes[i + 2] << 8);
                    totalDurationMs += (delay <= 1 ? 10 : delay) * 10;
                    frameCount++;
                }
                i += blockSize;
                while (i < bytes.length && bytes[i] !== 0) { i += bytes[i] + 1; }
                if (i < bytes.length) i++;
            } else {
                while (i < bytes.length && bytes[i] !== 0) { i += bytes[i] + 1; }
                if (i < bytes.length) i++;
            }
        } else if (blockType === 0x2C) {
            i += 9;
            if (i < bytes.length && (bytes[i - 1] & 0x80)) {
                const lctSize = 3 * (1 << ((bytes[i - 1] & 0x07) + 1));
                i += lctSize;
            }
            i++;
            while (i < bytes.length && bytes[i] !== 0) { i += bytes[i] + 1; }
            if (i < bytes.length) i++;
        }
    }
    return (totalDurationMs > 0 && frameCount > 1) ? totalDurationMs : null;
}

async function getWallpaperBuffer(wallpaperUrl) {
    if (!wallpaperUrl || typeof wallpaperUrl !== 'string') return null;
    let fileName = '';
    try {
        const urlObj = new URL(wallpaperUrl);
        const raw = urlObj.pathname.replace(/^\/(?:app\/|local\/)?/, '');
        fileName = path.basename(decodeURIComponent(raw));
    } catch {
        const raw = wallpaperUrl.replace(/^qbrowse-media:\/\/(?:app\/|local\/)?/, '').split('?')[0].split('#')[0];
        fileName = path.basename(decodeURIComponent(raw));
    }
    const backgroundsDir = path.join(app.getPath('userData'), 'backgrounds');
    if (fileName) {
        const fullPath = path.join(backgroundsDir, fileName);
        if (fsSync.existsSync(fullPath)) {
            return await fs.readFile(fullPath);
        }
    }
    // Also check direct local file
    try {
        let localPath = wallpaperUrl;
        if (wallpaperUrl.startsWith('file://')) {
            localPath = fileURLToPath(wallpaperUrl);
        }
        if (fsSync.existsSync(localPath) && fsSync.statSync(localPath).isFile()) {
            return await fs.readFile(localPath);
        }
    } catch (_) {}
    // If http/https URL, fetch buffer
    if (wallpaperUrl.startsWith('http://') || wallpaperUrl.startsWith('https://')) {
        try {
            const resp = await net.fetch(wallpaperUrl);
            if (resp.ok) {
                return Buffer.from(await resp.arrayBuffer());
            }
        } catch (_) {}
    }
    return null;
}

ipcMain.handle('wallpaper-get-gif-duration', async (event, wallpaperUrl) => {
    try {
        const buf = await getWallpaperBuffer(wallpaperUrl);
        return buf ? parseGifBufferDuration(buf) : null;
    } catch {
        return null;
    }
});

ipcMain.handle('wallpaper-get-gif-data', async (event, wallpaperUrl) => {
    try {
        const buf = await getWallpaperBuffer(wallpaperUrl);
        if (!buf) return { success: false, error: 'Could not load wallpaper buffer' };
        const duration = parseGifBufferDuration(buf);
        return {
            success: true,
            duration,
            buffer: new Uint8Array(buf)
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Experimental Flags & Relaunch Handlers

ipcMain.handle('flags-get', () => {
    return userFlags;
});

ipcMain.handle('flags-set', (event, { id, val }) => {
    assertTrustedAppShell(event, 'flags-set');
    try {
        userFlags[id] = val;
        const flagsPath = path.join(app.getPath('userData'), 'flags.json');
        fsSync.writeFileSync(flagsPath, JSON.stringify(userFlags, null, 2), 'utf8');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('flags-reset', (event) => {
    assertTrustedAppShell(event, 'flags-reset');
    try {
        userFlags = {};
        const flagsPath = path.join(app.getPath('userData'), 'flags.json');
        if (fsSync.existsSync(flagsPath)) {
            fsSync.unlinkSync(flagsPath);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('app-relaunch', (event) => {
    assertTrustedAppShell(event, 'app-relaunch');
    app.relaunch();
    app.exit(0);
});

// PDF Export Dialog & File Saver
ipcMain.handle('save-pdf-file', async (event, { defaultName, data }) => {
    try {
        const win = mainWindow || BrowserWindow.getFocusedWindow();
        const { canceled, filePath } = await dialog.showSaveDialog(win, {
            title: 'Save Page as PDF',
            defaultPath: defaultName || 'webpage.pdf',
            filters: [
                { name: 'PDF Documents', extensions: ['pdf'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }

        let buffer;
        if (Buffer.isBuffer(data)) {
            buffer = data;
        } else if (data instanceof Uint8Array || (data && data.buffer)) {
            buffer = Buffer.from(data.buffer || data, data.byteOffset || 0, data.byteLength || data.length);
        } else if (typeof data === 'string') {
            buffer = Buffer.from(data, 'base64');
        } else {
            buffer = Buffer.from(data);
        }

        await fs.writeFile(filePath, buffer);
        return { success: true, filePath };
    } catch (e) {
        console.error('Failed to save PDF file:', e);
        return { success: false, error: e.message };
    }
});

// Full Page, Rect Snipping & Screenshot IPC Handlers
ipcMain.handle('capture-and-save', async (event, { webContentsId, rect, title = 'Screenshot' } = {}) => {
    try {
        let targetWc = null;
        if (webContentsId) {
            try {
                targetWc = webContents.fromId(webContentsId);
            } catch (_) {}
        }
        if (!targetWc || targetWc.isDestroyed()) {
            targetWc = mainWindow ? mainWindow.webContents : null;
        }
        if (!targetWc || targetWc.isDestroyed()) throw new Error('No target page available to capture');

        let img;
        if (rect && typeof rect.width === 'number' && typeof rect.height === 'number' && rect.width > 0 && rect.height > 0) {
            img = await targetWc.capturePage({
                x: Math.max(0, Math.round(rect.x)),
                y: Math.max(0, Math.round(rect.y)),
                width: Math.max(1, Math.round(rect.width)),
                height: Math.max(1, Math.round(rect.height))
            });
        } else {
            img = await targetWc.capturePage();
        }

        if (!img || img.isEmpty()) {
            throw new Error('Captured image is empty');
        }

        // Copy directly to system clipboard in main process
        try {
            clipboard.writeImage(img);
        } catch (clipErr) {
            console.warn('[CaptureAndSave] Clipboard write error:', clipErr);
        }

        // Save directly to Downloads folder
        const downloadsPath = app.getPath('downloads');
        const cleanTitle = (title || 'Webpage').replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 40) || 'Webpage';
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const fileName = `Screenshot_${cleanTitle}_${timestamp}.png`;
        const filePath = path.join(downloadsPath, fileName);

        const pngBuffer = img.toPNG();
        await fs.writeFile(filePath, pngBuffer);
        return { success: true, filePath, fileName, fileSize: pngBuffer.length };
    } catch (e) {
        console.error('[CaptureAndSave] Error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('capture-slice-dataurl', async (event, opts = {}) => {
    try {
        let webContentsId = opts?.webContentsId;
        let rect = opts?.rect || (opts && typeof opts.width === 'number' && typeof opts.height === 'number' ? opts : null);
        let targetWc = null;
        if (webContentsId) {
            try {
                targetWc = webContents.fromId(webContentsId);
            } catch (_) {}
        }
        if (!targetWc || targetWc.isDestroyed()) {
            targetWc = mainWindow ? mainWindow.webContents : null;
        }
        if (!targetWc || targetWc.isDestroyed()) return null;

        let img;
        if (rect && typeof rect.width === 'number' && typeof rect.height === 'number' && rect.width > 0 && rect.height > 0) {
            img = await targetWc.capturePage({
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            });
        } else {
            img = await targetWc.capturePage();
        }
        return img && !img.isEmpty() ? img.toDataURL() : null;
    } catch (e) {
        console.warn('[CaptureSliceDataUrl] Error:', e);
        return null;
    }
});

ipcMain.handle('save-screenshot-dataurl', async (event, { dataUrl, title, copyToClipboard = true } = {}) => {
    try {
        if (!dataUrl) throw new Error('No dataUrl provided');
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        if (copyToClipboard) {
            try {
                const img = nativeImage.createFromBuffer(buffer);
                clipboard.writeImage(img);
            } catch (clipErr) {
                console.warn('[SaveScreenshotDataUrl] Clipboard write error:', clipErr);
            }
        }

        const downloadsPath = app.getPath('downloads');
        const cleanTitle = (title || 'Webpage').replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 40) || 'Webpage';
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const fileName = `Screenshot_${cleanTitle}_${timestamp}.png`;
        const filePath = path.join(downloadsPath, fileName);

        await fs.writeFile(filePath, buffer);
        return { success: true, filePath, fileName, fileSize: buffer.length };
    } catch (e) {
        console.error('[SaveScreenshotDataUrl] Error:', e);
        return { success: false, error: e.message };
    }
});

// ==========================================
// GitHub Work Mode Integration Engine
// ==========================================
ipcMain.handle('github-get-data', async (event, { profileId, force } = {}) => {
    return await githubEngine.fetchWorkData(profileId, force);
});

ipcMain.handle('github-update-config', async (event, { config, profileId } = {}) => {
    return githubEngine.updateConfig(config, profileId);
});

ipcMain.handle('github-test-sync', async (event, { config, profileId } = {}) => {
    return await githubEngine.testAndSync(config, profileId);
});

ipcMain.handle('github-stop', () => {
    return githubEngine.stop();
});

// ==========================================
// Rust In-Process Core IPC Bridges
// ==========================================
ipcMain.handle('save-tab-thumbnail', async (event, { tabId, dataUrl } = {}) => {
    try {
        if (!tabId || !dataUrl || typeof dataUrl !== 'string') return null;
        const commaIdx = dataUrl.indexOf(',');
        const rawB64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
        const buf = Buffer.from(rawB64, 'base64');
        const thumbsDir = path.join(app.getPath('userData'), 'thumbnails');
        return await rustBridge.mediaSaveTabThumbnail(thumbsDir, String(tabId), buf);
    } catch {
        return null;
    }
});

ipcMain.handle('rust-extract-pdf-text', async (event, { filePath, maxPages } = {}) => {
    try {
        if (!filePath || !fsSync.existsSync(filePath)) return '';
        const res = await rustBridge.aiExtractPdfText(filePath, maxPages || 200);
        return res?.text || '';
    } catch {
        return '';
    }
});

ipcMain.handle('rust-encrypt-sync', async (event, { jsonStr, passphrase } = {}) => {
    try {
        return await rustBridge.syncEncryptV2(String(passphrase || ''), String(jsonStr || ''));
    } catch {
        return null;
    }
});

ipcMain.handle('rust-decrypt-sync', async (event, { envelope, passphrase } = {}) => {
    try {
        if (!envelope || !envelope.salt || !envelope.iv || !envelope.cipher) return null;
        return await rustBridge.syncDecrypt(
            String(passphrase || ''),
            String(envelope.salt),
            String(envelope.iv),
            String(envelope.cipher)
        );
    } catch {
        return null;
    }
});

ipcMain.on('rust-search-history', (event, { query, cleanQuery, historySource } = {}) => {
    try {
        const items = rustBridge.storageSearchHistory(String(cleanQuery || query || ''), 8, null);
        if (Array.isArray(items) && items.length > 0) {
            event.returnValue = items.map((h, idx) => ({
                url: h.url,
                title: h.title || h.url,
                visits: h.visitCount || 1,
                lastVisit: h.timestamp || Date.now(),
                score: 90 - idx
            }));
            return;
        }
        event.returnValue = null;
    } catch {
        event.returnValue = null;
    }
});

ipcMain.on('rust-merge-history', (event, { localHistory, remoteHistory } = {}) => {
    try {
        const mergedMap = new Map();
        const addAll = (list) => {
            if (!Array.isArray(list)) return;
            for (const item of list) {
                if (!item || !item.url) continue;
                const lower = String(item.url).toLowerCase();
                if (
                    item.space === 'ghost' ||
                    item.space === 'tor' ||
                    lower.includes('.onion') ||
                    lower.startsWith('about:') ||
                    lower.startsWith('chrome:') ||
                    lower.startsWith('devtools:') ||
                    lower.startsWith('qbrowse:') ||
                    lower.startsWith('data:') ||
                    lower.startsWith('blob:') ||
                    lower.startsWith('javascript:')
                ) continue;
                const prev = mergedMap.get(item.url);
                if (!prev || (item.timestamp || 0) > (prev.timestamp || 0)) {
                    mergedMap.set(item.url, {
                        ...prev,
                        ...item,
                        visits: Math.max(prev?.visits || 1, item.visits || 1)
                    });
                }
            }
        };
        addAll(localHistory);
        addAll(remoteHistory);
        event.returnValue = Array.from(mergedMap.values())
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch {
        event.returnValue = null;
    }
});

ipcMain.on('rust-parse-gif-info', (event, buffer) => {
    try {
        if (!buffer) { event.returnValue = null; return; }
        const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        const info = rustBridge.mediaParseGifInfo(nodeBuf);
        if (info && typeof info.durationMs === 'number') {
            event.returnValue = { duration: info.durationMs, frames: info.frames };
            return;
        }
        event.returnValue = null;
    } catch {
        event.returnValue = null;
    }
});

ipcMain.on('rust-extract-article', (event, { html, url } = {}) => {
    try {
        if (!html) { event.returnValue = null; return; }
        event.returnValue = rustBridge.readerExtractArticle(String(html), String(url || ''));
    } catch {
        event.returnValue = null;
    }
});

ipcMain.on('rust-parse-vault', (event, { text, filename } = {}) => {
    try {
        if (!text) { event.returnValue = null; return; }
        const res = rustBridge.vaultImportData(String(text), String(filename || ''));
        if (res && Array.isArray(res.items)) {
            event.returnValue = { parsed: res.items, sourceName: res.sourceName || res.format || 'File' };
            return;
        }
        event.returnValue = null;
    } catch {
        event.returnValue = null;
    }
});

// --- Extension Engine Shell IPCs ---
ipcMain.handle('ext-list', async (event, { profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-list');
    return await extensionEngine.listExtensions(profileId);
});

ipcMain.handle('ext-preview-cws', async (event, { extId, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-preview-cws');
    return await extensionEngine.previewCwsExtension(extId, profileId);
});

ipcMain.handle('ext-confirm-install-cws', async (event, { extId, stagedPath, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-confirm-install-cws');
    return await extensionEngine.confirmInstallCws(extId, stagedPath, profileId);
});

ipcMain.handle('ext-install-cws-direct', async (event, { extId, opts, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-install-cws-direct');
    return await extensionEngine.installCwsDirect(extId, opts, profileId);
});

ipcMain.handle('ext-pick-unpacked-folder', async (event) => {
    assertTrustedAppShell(event, 'ext-pick-unpacked-folder');
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const result = await dialog.showOpenDialog(win, {
        title: 'Select Unpacked Extension Folder',
        properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true, path: null };
    }
    return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('ext-install-unpacked', async (event, { dirPath, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-install-unpacked');
    return await extensionEngine.installUnpackedExtension(dirPath, profileId);
});

ipcMain.handle('ext-set-enabled', async (event, { extId, enabled, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-set-enabled');
    return await extensionEngine.setExtensionEnabled(extId, enabled, profileId);
});

ipcMain.handle('ext-set-pinned', async (event, { extId, pinned, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-set-pinned');
    return await extensionEngine.setExtensionPinned(extId, pinned, profileId);
});

ipcMain.handle('ext-reload', async (event, { extId, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-reload');
    return await extensionEngine.reloadExtension(extId, profileId);
});

ipcMain.handle('ext-remove', async (event, { extId, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-remove');
    return await extensionEngine.removeExtension(extId, profileId);
});

ipcMain.handle('ext-trigger-action-click', async (event, { extId, tabInfo, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-trigger-action-click');
    return await extensionEngine.triggerActionClick(extId, tabInfo, profileId);
});

ipcMain.handle('ext-trigger-context-menu', async (event, { extId, menuItemId, info, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-trigger-context-menu');
    return await extensionEngine.triggerContextMenuClick(extId, menuItemId, info, profileId);
});

ipcMain.handle('ext-open-options', async (event, { extId, profileId } = {}) => {
    assertTrustedAppShell(event, 'ext-open-options');
    const url = extensionEngine.getOptionsUrl(extId, profileId);
    return { url };
});

ipcMain.handle('ext-sync-tabs', async (event, { windowId, tabs } = {}) => {
    assertTrustedAppShell(event, 'ext-sync-tabs');
    return extensionEngine.syncTabs(windowId, tabs);
});

if (process.env.QBROWSE_SMOKE_TEST === '1') {
    app.whenReady().then(() => {
        const startTs = Date.now();
        setTimeout(() => {
            try {
                const metrics = app.getAppMetrics();
                const totalWorkingSetKB = metrics.reduce((sum, m) => sum + (m.memory?.workingSetSize || 0), 0);
                console.log(JSON.stringify({
                    smokeOk: true,
                    rustAvailable: rustBridge.isAvailable(),
                    rustVersion: rustBridge.version(),
                    windowCount: BrowserWindow.getAllWindows().length,
                    processCount: metrics.length,
                    totalWorkingSetMB: Number((totalWorkingSetKB / 1024).toFixed(2)),
                    elapsedMs: Date.now() - startTs
                }));
            } catch (err) {
                console.error('SMOKE_TEST_ERROR:', err);
                process.exitCode = 1;
            } finally {
                app.quit();
            }
        }, 3500);
    });
}




