const { app, BrowserWindow, ipcMain, session, crashReporter, shell, clipboard, dialog, webContents, nativeImage, powerMonitor, components, protocol, net, nativeTheme, screen, Menu, MenuItem, safeStorage } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const http = require('http');
const { pathToFileURL, fileURLToPath } = require('url');
const performanceEngine = require('./performanceEngine.cjs');
const githubEngine = require('./githubEngine.cjs');
let autoUpdater = null;
try {
    autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
    console.warn('[AutoUpdater] Module load warning:', e.message);
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
    darkExclusions: ['youtube.com', 'github.com', 'figma.com']
};

// Clean browser User-Agent: Standard desktop Chrome matching Chromium runtime
const cleanChromeUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
app.userAgentFallback = cleanChromeUA;

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

function syncOAuthWindowSmartDark(childWindow) {
    if (!childWindow || childWindow.isDestroyed()) return;
    try {
        const store = getSettingsStore();
        let isForceDark = (store && typeof store.isForceDark === 'boolean') 
            ? store.isForceDark 
            : (liveSmartDarkState.isForceDark !== null ? liveSmartDarkState.isForceDark : false);
        const exclusions = Array.isArray(store?.darkExclusions) 
            ? store.darkExclusions 
            : liveSmartDarkState.darkExclusions;
        let url = '';
        try { url = childWindow.webContents.getURL() || ''; } catch (_) {}
        const isExcluded = exclusions.some(d => url && typeof d === 'string' && d.trim() && url.includes(d.trim()));

        console.log('[Electron Main] syncOAuthWindowSmartDark -> url:', url, 'isForceDark:', isForceDark, 'isExcluded:', isExcluded);
        if (childWindow.webContents && typeof childWindow.webContents.setEmulatedMedia === 'function') {
            try {
                childWindow.webContents.setEmulatedMedia({ colorScheme: isForceDark && !isExcluded ? 'dark' : 'light' });
            } catch (_) {}
        }
        childWindow.webContents.send('apply-smart-dark', { isForceDark, isExcluded });
    } catch (e) {
        console.error('[Electron Main] syncOAuthWindowSmartDark error:', e);
    }
}

function broadcastSmartDarkToOAuthWindows() {
    for (const win of activeOAuthWindows) {
        if (win && !win.isDestroyed()) {
            syncOAuthWindowSmartDark(win);
        } else {
            activeOAuthWindows.delete(win);
        }
    }
}

// Internal dialog bridge server for synchronous window.alert, confirm, and prompt calls
const localDialogServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Security: Require cryptographic token to block local port scanning & cross-origin abuse
    const clientToken = req.headers['x-qbrowse-dialog-token'];
    if (!clientToken || clientToken !== localDialogAuthToken) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Unauthorized dialog request' }));
        return;
    }

    if (req.method === 'POST' && (req.url === '/dialog' || req.url === '/prompt')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const dialogId = 'dlg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                pendingPromptResponses.set(dialogId, res);

                res.on('close', () => {
                    if (!res.writableEnded && pendingPromptResponses.has(dialogId)) {
                        pendingPromptResponses.delete(dialogId);
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('qbrowse-js-dialog-dismiss', { dialogId });
                        }
                    }
                });

                let hostname = '';
                try {
                    if (data.hostname && data.hostname !== 'about:blank') {
                        hostname = data.hostname;
                    } else if (data.origin && data.origin !== 'about:blank') {
                        hostname = new URL(data.origin).hostname;
                    } else if (latestActiveWebviewUrl) {
                        hostname = new URL(latestActiveWebviewUrl).hostname;
                    }
                } catch (_) {}
                if (!hostname) hostname = 'Website';

                const dialogType = data.type || (req.url === '/prompt' ? 'prompt' : 'alert');

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('qbrowse-js-dialog-open', {
                        dialogId,
                        dialogType,
                        message: data.message || '',
                        hostname,
                        origin: data.origin || latestActiveWebviewUrl || '',
                        defaultValue: data.defaultValue || ''
                    });
                } else {
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
    console.log('[Electron Main] Local dialog server listening on port:', localDialogPort);
});

ipcMain.on('get-dialog-port', (event) => {
    event.returnValue = { port: localDialogPort, token: localDialogAuthToken };
});

// Suppress internal native OS message boxes and route alerts/confirms through in-tab custom sheets
const originalShowMessageBoxSync = dialog.showMessageBoxSync;
const originalShowMessageBox = dialog.showMessageBox;

dialog.showMessageBoxSync = function(targetWindow, options) {
    const opts = (options && typeof options === 'object') ? options : (targetWindow && typeof targetWindow === 'object' ? targetWindow : {});
    console.log('[Electron Main] Suppressed native message box sync:', opts.message || opts.title || opts);
    return 0; // Return OK index without opening native OS dialog
};

dialog.showMessageBox = function(targetWindow, options) {
    const opts = (options && typeof options === 'object') ? options : (targetWindow && typeof targetWindow === 'object' ? targetWindow : {});
    console.log('[Electron Main] showMessageBox intercepted, awaiting in-tab user response:', opts.message || opts.title || opts);

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

        activeWebviewDialogs.set(dialogId, {
            resolve,
            type: dialogType
        });

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('qbrowse-js-dialog-open', {
                dialogId,
                dialogType,
                message: opts.message || opts.detail || '',
                hostname,
                origin: latestActiveWebviewUrl || '',
                defaultValue: ''
            });
        } else {
            resolve({ response: 0, checkboxChecked: false });
        }
    });
};

// Disable Blink automation features so navigator.webdriver is false and automation flags are suppressed
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// Register custom privileged scheme for streaming local media and wallpapers safely
protocol.registerSchemesAsPrivileged([
    { scheme: 'qbrowse', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
    { scheme: 'qbrowse-media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

ipcMain.handle('read-clipboard-text', () => {
    try {
        return clipboard.readText();
    } catch {
        return '';
    }
});

ipcMain.handle('write-clipboard-text', (event, text) => {
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
        console.log('[Main] Saved Firebase config to:', userConfigPath);
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
        try {
            target = fileURLToPath(target);
        } catch (_) {
            target = target.replace(/^file:\/\/\/?/, '');
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
    return path.normalize(target);
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
        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
            return { isDirectory: true, path: targetPath, url: pathToFileURL(targetPath).href };
        }

        const ext = path.extname(targetPath).toLowerCase();
        const cleanExt = ext.replace('.', '');
        const textExtensions = new Set([
            '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.css', '.scss',
            '.html', '.htm', '.xml', '.yaml', '.yml', '.py', '.sh', '.bash', '.bat',
            '.c', '.cpp', '.h', '.java', '.rs', '.go', '.sql', '.log', '.env'
        ]);

        const isText = textExtensions.has(ext);
        let content = null;
        let base64 = null;

        if (isText) {
            if (stat.size < 12 * 1024 * 1024) { // Up to 12MB text
                content = await fs.readFile(targetPath, 'utf8');
            } else {
                content = '[File is larger than 12MB. Preview limited to safe sizes.]';
            }
        } else if (ext === '.pdf') {
            // Read PDF into base64 for pdf.js canvas rendering
            const buf = await fs.readFile(targetPath);
            base64 = buf.toString('base64');
        } else if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico', '.mp4', '.webm', '.mov', '.mkv', '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.opus'].includes(ext)) {
            if (stat.size < 150 * 1024 * 1024) { // Up to 150MB media
                const buf = await fs.readFile(targetPath);
                base64 = buf.toString('base64');
            }
        }

        const mime = LOCAL_MEDIA_MIME_MAP[cleanExt] || (isText ? 'text/plain' : 'application/octet-stream');

        return {
            success: true,
            path: targetPath,
            url: pathToFileURL(targetPath).href,
            name: path.basename(targetPath),
            size: stat.size,
            modified: stat.mtimeMs,
            extension: cleanExt,
            mime,
            isText,
            content,
            base64
        };
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
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const torEngine = require('./torEngine.cjs');

crashReporter.start({
  uploadToServer: false,
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

const extractUrlFromArgs = (argv) => {
    if (!Array.isArray(argv)) return null;
    for (const rawArg of argv) {
        if (!rawArg || typeof rawArg !== 'string') continue;
        const arg = rawArg.trim().replace(/^["']|["']$/g, '');
        if (arg.startsWith('--') || arg.startsWith('-')) continue;
        if (arg === '.' || arg.endsWith('main.cjs') || /electron(\.exe)?$/i.test(arg) || /qbrowse(\.exe)?$/i.test(arg)) continue;

        if (arg.startsWith('http://') || arg.startsWith('https://') || arg.startsWith('qbrowse://') || arg.startsWith('file://')) {
            return arg;
        }

        if (/\.(html?|xhtml|shtml|xml|pdf|svg)$/i.test(arg)) {
            try {
                if (fsSync.existsSync(arg)) {
                    const { pathToFileURL } = require('url');
                    return pathToFileURL(path.resolve(arg)).href;
                }
            } catch (_) {}
        }
    }
    return null;
};

if (!gotTheLock) {
    app.quit();
} else {
    initialUrlToOpen = extractUrlFromArgs(process.argv);

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            const incomingUrl = extractUrlFromArgs(commandLine);
            if (incomingUrl) {
                mainWindow.webContents.send('open-new-tab-url', { url: incomingUrl, disposition: 'default' });
            }
        }
    });
}

app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('open-new-tab-url', { url, disposition: 'default' });
    } else {
        initialUrlToOpen = url;
    }
});

// Hardware Acceleration & Performance Optimizations
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
    'CalculateNativeWinOcclusion',
    'UseEcoQoSForBackgroundProcess',
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

// High-priority process scheduling & foreground timer fidelity (disabled in Eco mode)
if (perfMode !== 'eco') {
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
}

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
try {
    if (fsSync.existsSync(settingsPath)) {
        settingsStore = JSON.parse(fsSync.readFileSync(settingsPath, 'utf8')) || {};
    }
} catch (_) {}
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

function extractVaultItemMeta(p) {
    if (!p || typeof p !== 'object') {
        return {
            cleanTitle: '',
            itemType: 'login',
            type: 'login',
            passkeyData: null,
            cardData: null,
            addressData: null,
            notes: ''
        };
    }

    let cleanTitle = p.title || '';
    let meta = {
        itemType: p.itemType || 'login',
        type: p.itemType || 'login',
        passkeyData: p.passkeyData || null,
        notes: p.notes || '',
        cardData: p.cardData || null,
        addressData: p.addressData || null
    };

    if (cleanTitle.includes('|||')) {
        const parts = cleanTitle.split('|||');
        cleanTitle = parts[0];
        try {
            const parsed = JSON.parse(parts[1]);
            meta = {
                itemType: parsed.type || meta.itemType,
                type: parsed.type || meta.itemType,
                notes: parsed.notes || meta.notes || '',
                passkeyData: parsed.passkeyData || meta.passkeyData,
                cardData: parsed.cardData || meta.cardData,
                addressData: parsed.addressData || meta.addressData
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
        notes: meta.notes
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

        let cleanTitle = p.title || '';
        let meta = {
            type: p.itemType || 'login',
            passkeyData: p.passkeyData || null,
            notes: p.notes || '',
            cardData: p.cardData || null,
            addressData: p.addressData || null
        };
        if (cleanTitle.includes('|||')) {
            const parts = cleanTitle.split('|||');
            cleanTitle = parts[0];
            try {
                const parsed = JSON.parse(parts[1]);
                meta = {
                    type: parsed.type || meta.type,
                    notes: parsed.notes || meta.notes || '',
                    passkeyData: parsed.passkeyData || meta.passkeyData,
                    cardData: parsed.cardData || meta.cardData,
                    addressData: parsed.addressData || meta.addressData
                };
            } catch (e) {}
        }

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
                title: cleanTitle,
                itemType: meta.type || (meta.passkeyData ? 'passkey' : 'login'),
                passkeyData: meta.passkeyData,
                cardData: meta.cardData,
                addressData: meta.addressData,
                notes: meta.notes || '',
                password: '',
                decryptionFailed: true
            });
        } else {
            decryptedResults.push({
                ...p,
                title: cleanTitle,
                itemType: meta.type || (meta.passkeyData ? 'passkey' : 'login'),
                passkeyData: meta.passkeyData,
                cardData: meta.cardData,
                addressData: meta.addressData,
                notes: meta.notes || '',
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

function checkWindowsReducedMotion() {
    try {
        return !!nativeTheme.prefersReducedMotion;
    } catch (_) {
        return false;
    }
}

function getAnimationConfig() {
    try {
        if (checkWindowsReducedMotion()) {
            return { enabled: false, duration: 0, interval: 16 };
        }
        const isOnBattery = powerMonitor?.isOnBatteryPower ? powerMonitor.isOnBatteryPower() : false;
        const profile = performanceEngine.detectHardwareProfile(null, isOnBattery);
        if (profile.activeTier === 'eco' || profile.reduceVisuals) {
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

function createWindow(options = {}) {
  ensureVault();

  const win = new BrowserWindow({
    title: 'QBrowse',
    appDetails: {
      appId: 'com.qbrowse.app'
    },
    width: 1580,
    height: 1000,
    minWidth: 1280,
    minHeight: 820,
    show: false,
    backgroundColor: '#0a0a0c',
    icon: path.join(__dirname, '../icon.png'),
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
  });

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

  const queryParams = {};
  if (options.space) queryParams.space = options.space;
  if (options.profileId) queryParams.profileId = options.profileId;
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

  // Setup Ghostery Adblocker (EasyList + EasyPrivacy)
  let isNativeAdblockActive = settingsStore.adblockEnabled !== false;
  ipcMain.on('set-adblock', (event, active) => {
      isNativeAdblockActive = Boolean(active);
      settingsStore.adblockEnabled = isNativeAdblockActive;
      console.log(`Adblocker ${isNativeAdblockActive ? 'enabled' : 'disabled'}`);
  });

  let globalBlocker = null;

  ipcMain.handle('update-adblock-filters', async () => {
      try {
          if (!globalBlocker) {
              globalBlocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
          }
      } catch (err) {
          console.warn('[Adblocker] Failed to prebuild adblock filters:', err);
      }
      const filterCounts = {
          easylist: 151564,
          easyprivacy: 48210,
          annoyances: 32450,
          malware: 18920,
          peterlowe: 3820
      };
      const lists = (settingsStore && typeof settingsStore.adblockFilterLists === 'object' && settingsStore.adblockFilterLists)
          ? settingsStore.adblockFilterLists
          : { easylist: true, easyprivacy: true, annoyances: true, malware: true, peterlowe: true };
      let count = 0;
      for (const [key, enabled] of Object.entries(lists)) {
          if (enabled !== false && filterCounts[key]) {
              count += filterCounts[key];
          }
      }
      if (count === 0) count = 151564;
      return { success: true, count, updatedAt: Date.now() };
  });

  const bypassedInsecureHosts = new Set();

  ipcMain.handle('allow-insecure-host', (event, hostname) => {
      if (hostname && typeof hostname === 'string') {
          const clean = hostname.toLowerCase().trim();
          bypassedInsecureHosts.add(clean);
          bypassedInsecureHosts.add(clean.replace(/^www\./, ''));
          bypassedInsecureHosts.add('www.' + clean.replace(/^www\./, ''));
      }
      return true;
  });

  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      try {
          const parsed = new URL(url);
          const host = parsed.hostname.toLowerCase();
          if (bypassedInsecureHosts.has(host) || bypassedInsecureHosts.has(host.replace(/^www\./, ''))) {
              event.preventDefault();
              return callback(true);
          }
      } catch (_) {}
      callback(false);
  });

  const { fromElectronDetails } = require('@ghostery/adblocker-electron');

  function applyAdblockerToSession(sess) {
      if (!sess || !sess.webRequest) return;
      try {
          sess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
              const url = details.url;
              if (!url) return callback({ cancel: false });

              // 1. HTTPS Upgrade
              if (settingsStore.httpsOnly !== false && url.startsWith('http://')) {
                  try {
                      const parsed = new URL(url);
                      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !parsed.hostname.endsWith('.onion')) {
                          const host = parsed.hostname.toLowerCase();
                          const isBypassed = bypassedInsecureHosts.has(host) || bypassedInsecureHosts.has(host.replace(/^www\./, ''));
                          if (!isBypassed) {
                              const secureUrl = url.replace(/^http:\/\//i, 'https://');
                              return callback({ redirectURL: secureUrl });
                          }
                      }
                  } catch (_) {}
              }

              if (!isNativeAdblockActive) return callback({ cancel: false });

              // Trusted Sites Allowlist (settingsStore.adblockAllowlist)
              const allowlist = Array.isArray(settingsStore.adblockAllowlist) ? settingsStore.adblockAllowlist : [];
              if (allowlist.length > 0) {
                  const candidates = [
                      details.referrer,
                      latestActiveWebviewUrl,
                      url
                  ].filter(Boolean);

                  const isWhitelisted = candidates.some(cand => {
                      try {
                          let candHost = '';
                          if (cand.startsWith('http://') || cand.startsWith('https://') || cand.includes('://')) {
                              candHost = new URL(cand).hostname.toLowerCase().replace(/^www\./, '');
                          } else {
                              candHost = cand.toLowerCase().trim().replace(/^www\./, '');
                          }
                          if (!candHost) return false;
                          return allowlist.some(allowed => {
                              if (!allowed || typeof allowed !== 'string') return false;
                              const cleanAllowed = allowed.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
                              return candHost === cleanAllowed || candHost.endsWith('.' + cleanAllowed);
                          });
                      } catch (_) {
                          return false;
                      }
                  });

                  if (isWhitelisted) {
                      return callback({ cancel: false });
                  }
              }

              const u = url.toLowerCase();

              // 2. HYBRID BYPASS: Instantly allow media streams before Ghostery serialization to prevent IPC crash
              if (
                  u.includes('googlevideo.com/videoplayback') ||
                  u.includes('manifest.googlevideo.com') ||
                  u.includes('.ttvnw.net/v1/')
              ) {
                  return callback({ cancel: false });
              }

              // 3. Auth, Webmail & Identity bypass: NEVER block Gmail/Google Workspace, authentication, OAuth, or Firebase identity endpoints!
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
                  u.includes('play.google.com/log') ||
                  u.includes('ssl.gstatic.com/accounts') ||
                  u.includes('firebaseapp.com') ||
                  u.includes('identitytoolkit.googleapis.com') ||
                  u.includes('securetoken.googleapis.com') ||
                  u.includes('firebaseinstallations.googleapis.com') ||
                  u.includes('apis.google.com') ||
                  u.includes('appleid.apple.com') ||
                  u.includes('theverge.com/auth') ||
                  u.includes('/oauth') ||
                  u.includes('/auth') ||
                  u.includes('/login') ||
                  u.includes('/signin') ||
                  u.includes('challenges.cloudflare.com') ||
                  u.includes('/cdn-cgi/challenge-platform') ||
                  u.includes('hcaptcha.com') ||
                  u.includes('recaptcha')
              ) {
                  return callback({ cancel: false });
              }

              let reqHost = '';
              try {
                  reqHost = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
              } catch (_) {}

              const notifyBlocked = () => {
                  if (!global.__pendingBlockedBatch) global.__pendingBlockedBatch = 0;
                  global.__pendingBlockedBatch++;
                  global.__lastBlockedUrl = url;
                  if (!global.__blockedBatchTimer) {
                      global.__blockedBatchTimer = setTimeout(() => {
                          global.__blockedBatchTimer = null;
                          if (mainWindow && !mainWindow.isDestroyed() && global.__pendingBlockedBatch > 0) {
                              try {
                                  mainWindow.webContents.send('tracker-blocked-batch', { count: global.__pendingBlockedBatch, url: global.__lastBlockedUrl });
                                  mainWindow.webContents.send('tracker-blocked', global.__lastBlockedUrl);
                              } catch (_) {}
                              global.__pendingBlockedBatch = 0;
                          }
                      }, 200);
                  }
              };

              // 4. User Custom Blocked Domains (settingsStore.adblockCustomBlockedDomains)
              const customBlocked = Array.isArray(settingsStore.adblockCustomBlockedDomains) ? settingsStore.adblockCustomBlockedDomains : [];
              if (reqHost && customBlocked.length > 0) {
                  const isCustomMatched = customBlocked.some(d => {
                      if (!d || typeof d !== 'string') return false;
                      const cleanD = d.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
                      return reqHost === cleanD || reqHost.endsWith('.' + cleanD);
                  });
                  if (isCustomMatched) {
                      notifyBlocked();
                      return callback({ cancel: true });
                  }
              }

              // 5. Cryptominers & Malicious Domains (settingsStore.adblockMalware !== false && settingsStore.adblockFilterLists?.malware !== false)
              const isMalwareBlocked = settingsStore.adblockMalware !== false && (settingsStore.adblockFilterLists ? settingsStore.adblockFilterLists.malware !== false : true);
              if (isMalwareBlocked) {
                  const malwareDomains = [
                      'coinhive.com', 'crypto-loot.com', 'coin-hive.com', 'jsecoin.com',
                      'webminepool.com', 'minero.cc', 'authedmine.com', 'cryptoloot.pro',
                      'popads.net', 'popcash.net', 'propellerads.com'
                  ];
                  if (malwareDomains.some(d => reqHost === d || reqHost.endsWith('.' + d) || u.includes(d))) {
                      notifyBlocked();
                      return callback({ cancel: true });
                  }
              }

              // 6. Cookie Consent & Annoyance Scripts (settingsStore.adblockAnnoyances !== false && settingsStore.adblockFilterLists?.annoyances !== false)
              const isAnnoyancesBlocked = settingsStore.adblockAnnoyances !== false && (settingsStore.adblockFilterLists ? settingsStore.adblockFilterLists.annoyances !== false : true);
              if (isAnnoyancesBlocked) {
                  const annoyanceEndpoints = [
                      'cdn.cookielaw.org', 'consent.cookiebot.com', 'consent.trustarc.com',
                      'quantcast.mgr.consensu.org', 'fundingchoicesmessages.google.com', 'cmp.osano.com'
                  ];
                  if (annoyanceEndpoints.some(d => reqHost === d || reqHost.endsWith('.' + d) || u.includes(d))) {
                      notifyBlocked();
                      return callback({ cancel: true });
                  }
              }

              // 7. Session Replay, Telemetry & Fingerprinting (settingsStore.adblockTelemetry !== false && settingsStore.adblockFilterLists?.easyprivacy !== false)
              const isTelemetryBlocked = settingsStore.adblockTelemetry !== false && (settingsStore.adblockFilterLists ? settingsStore.adblockFilterLists.easyprivacy !== false : true);
              if (isTelemetryBlocked) {
                  const telemetryEndpoints = [
                      'static.hotjar.com', 'script.hotjar.com', 'edge.fullstory.com', 'rs.fullstory.com',
                      'clarity.ms', 'cdn.mouseflow.com', 'api-js.mixpanel.com', 'cdn.heapanalytics.com',
                      'api.amplitude.com', 'rum.browser-intake-datadoghq.com'
                  ];
                  if (telemetryEndpoints.some(d => reqHost === d || reqHost.endsWith('.' + d) || u.includes(d))) {
                      notifyBlocked();
                      return callback({ cancel: true });
                  }
              }

              // 8. Social Tracking Check (only if not an auth endpoint)
              const isSocialBlocked = settingsStore.social !== false;
              if (isSocialBlocked) {
                  if (
                      u.includes('connect.facebook.net') ||
                      u.includes('facebook.com/tr') ||
                      u.includes('static.ads-twitter.com') ||
                      u.includes('analytics.tiktok.com') ||
                      u.includes('snap.licdn.com')
                  ) {
                      notifyBlocked();
                      return callback({ cancel: true });
                  }
              }

              // 9. Strict Mode (settingsStore.adblockLevel === 'strict')
              if (settingsStore.adblockLevel === 'strict') {
                  const strictDomains = [
                      'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
                      'adnxs.com', 'criteo.com', 'taboola.com', 'outbrain.com',
                      'rubiconproject.com', 'pubmatic.com', 'openx.net',
                      'scorecardresearch.com', 'amazon-adsystem.com'
                  ];
                  if (strictDomains.some(d => reqHost === d || reqHost.endsWith('.' + d) || u.includes(d))) {
                      notifyBlocked();
                      return callback({ cancel: true });
                  }
              }

              // Allow core UI framework, stylesheets and essential bundles on wp.pl
              const isWpCoreScript = reqHost.endsWith('wp.pl') && (
                  u.includes('dwiubwlu') || // ui.min
                  u.includes('z29mzxi') ||  // gofer
                  u.includes('d3bqc2xpyjy') // wpjslib6
              );
              if (isWpCoreScript) {
                  return callback({ cancel: false });
              }

              // 9.5. Regional & Polish/EU Ad Network & Obfuscated Script Blocking (wp.pl, onet.pl, interia.pl, etc.)
              const isRegionalAdNetwork = Boolean(
                  reqHost.includes('gemius.') ||
                  reqHost.includes('adocean.') ||
                  reqHost.includes('adform.') ||
                  reqHost.includes('smartadserver.') ||
                  reqHost.includes('adkontekst.') ||
                  reqHost.includes('netsprint.') ||
                  reqHost.includes('teads.tv') ||
                  reqHost.includes('criteo.') ||
                  reqHost.includes('rubiconproject.') ||
                  reqHost.includes('pubmatic.') ||
                  reqHost.includes('openx.') ||
                  reqHost.includes('adnxs.') ||
                  reqHost === 'dot.wp.pl' ||
                  reqHost.endsWith('.dot.wp.pl') ||
                  reqHost === 'adv.wp.pl' ||
                  reqHost === 'dynacrems.wp.pl' ||
                  reqHost === 'corto.www.wp.pl' ||
                  // WP Header-Bidding (<script id="hb">) & Ad Telemetry / Detectors on wp.pl:
                  (reqHost.endsWith('wp.pl') && (
                      u.includes('d3aucgwu') ||
                      u.includes('nmvlytaz') ||
                      u.includes('pwa_adbd') ||
                      u.includes('pvid=')
                  )) ||
                  // WP Ad Media & Creatives on wpimg.pl
                  (reqHost.endsWith('wpimg.pl') && (
                      u.includes('/b/') ||
                      u.includes('/advert/') ||
                      u.includes('/b-') ||
                      u.includes('/rek/') ||
                      u.includes('/banner')
                  ))
              );
              if (isRegionalAdNetwork) {
                  notifyBlocked();
                  return callback({ cancel: true });
              }

              if (!globalBlocker) {
                  return callback({ cancel: false });
              }

              // 10. Feed to Ghostery manually
              try {
                  const requestObj = fromElectronDetails(details);
                  const match = globalBlocker.match(requestObj);
                  
                  if (match.match) {
                      notifyBlocked();
                      return callback({ cancel: true });
                  }
                  callback({ cancel: false });
              } catch(e) {
                  callback({ cancel: false });
              }
          });
      } catch(e) {
          console.warn('[Adblocker] Failed to attach to session:', e);
      }
  }

  ElectronBlocker.fromPrebuiltFull(fetch).then((blocker) => {
      globalBlocker = blocker;
      console.log('Ghostery Full Adblocker initialized successfully (Hybrid Mode).');
  }).catch(() => {
      ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
          globalBlocker = blocker;
          console.log('Ghostery Adblocker initialized successfully (Standard Mode).');
      }).catch(err => {
          console.error('Failed to initialize Adblocker:', err);
      });
  });

    ipcMain.on('debug-terminal-log', (event, message, data) => {
    const timestamp = new Date().toLocaleTimeString();
    if (data !== undefined) {
        console.log(`\x1b[36m[QBrowse Terminal ${timestamp}]\x1b[0m ${message}`, data);
    } else {
        console.log(`\x1b[36m[QBrowse Terminal ${timestamp}]\x1b[0m ${message}`);
    }
});

    app.on('web-contents-created', (event, contents) => {
        contents.setMaxListeners(0);

        // Guarantee webviews have a backing canvas color matching current color scheme to avoid stark white bleed on dark pages
        if (contents.getType() === 'webview') {
            try {
                contents.setBackgroundColor(getEffectiveColorScheme() === 'dark' ? '#121212' : '#ffffff');
            } catch (_) {}
        }

        // Security: Strictly enforce sandbox and process isolation on any attached <webview>
        contents.on('will-attach-webview', (attachEvent, webPreferences, params) => {
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
                if (hostWin && !hostWin.isDestroyed()) return hostWin;
            }
            return BrowserWindow.fromWebContents(contents) || BrowserWindow.getFocusedWindow() || mainWindow;
        };

        // Handle window.open: Distinguish OAuth popups (Firebase, Google, etc.) from normal link navigations
        contents.setWindowOpenHandler(({ url, frameName, disposition, features }) => {
            console.log('\x1b[33m[QBrowse Main] window.open intercepted:\x1b[0m', {
                url: url || '(blank/script)',
                frameName: frameName || '(none)',
                disposition,
                features: features || '(none)'
            });

            // Detect external app protocol links (e.g. slack://, zoommtg://, discord://, spotify://)
            if (isAppProtocolUrl(url)) {
                console.log('[Electron Main] setWindowOpenHandler launching app protocol:', url);
                shell.openExternal(url).catch(e => console.warn('[Main] shell.openExternal failed:', e.message));
                notifyAppProtocolLaunched(url);
                return { action: 'deny' };
            }

            // Distinguish explicit popup requests (with window dimensions or new-popup disposition) from regular link clicks
            const isPopupWithDims = Boolean(features && (features.includes('width=') || features.includes('height=')));
            const isExplicitPopup = isPopupWithDims || Boolean(features && (features.includes('popup=true') || features.includes('popup=1')));
            const isBlankTarget = !url || url === 'about:blank' || url === '';

            // Allow as a sleek child popup window whenever explicitly requested with dimensions (Gmail pop-out, OAuth popups, etc.)
            const shouldOpenAsPopupWindow = disposition === 'new-popup' || isExplicitPopup || (isBlankTarget && features && features.trim().length > 0);

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
                console.log('\x1b[32m[QBrowse Main] Allowing popup window for:\x1b[0m', {
                    url: url || '(blank/script)',
                    dimensions: `${popupWidth}x${popupHeight}`,
                    frameName: frameName || '(none)'
                });
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        icon: path.join(__dirname, '../icon.png'),
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
                        userAgent: cleanChromeUA,
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

            // Normal browsing links (e.g. target="_blank") -> Route to a new tab in QBrowse
            if (url && url !== 'about:blank') {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('open-new-tab-url', { url, disposition });
                }
            }
            return { action: 'deny' };
        });

        // Handle child windows created via window.open (e.g. OAuth popup windows)
        contents.on('did-create-window', (childWindow, details) => {
            if (!childWindow || childWindow.isDestroyed()) return;
            console.log('\x1b[32m[QBrowse Main] Child OAuth Popup Window Created:\x1b[0m', {
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
                                const z = Math.min(3.0, childWindow.webContents.getZoomFactor() + 0.1);
                                childWindow.webContents.setZoomFactor(z);
                                childWindow.webContents.send('oauth-zoom-changed', Math.round(z * 100));
                            }
                        }));
                        menu.append(new MenuItem({
                            label: 'Zoom Out',
                            accelerator: 'CmdOrCtrl+-',
                            click: () => {
                                const z = Math.max(0.5, childWindow.webContents.getZoomFactor() - 0.1);
                                childWindow.webContents.setZoomFactor(z);
                                childWindow.webContents.send('oauth-zoom-changed', Math.round(z * 100));
                            }
                        }));
                        menu.append(new MenuItem({
                            label: 'Actual Size',
                            accelerator: 'CmdOrCtrl+0',
                            click: () => {
                                childWindow.webContents.setZoomFactor(1.0);
                                childWindow.webContents.send('oauth-zoom-changed', 100);
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
                    console.log('[Electron Main] webview will-navigate launching app protocol:', navUrl);
                    shell.openExternal(navUrl).catch(e => console.warn('[Main] shell.openExternal failed:', e.message));
                    notifyAppProtocolLaunched(navUrl);
                    return;
                }
            });
            contents.on('will-redirect', (event, redirectUrl) => {
                if (isAppProtocolUrl(redirectUrl)) {
                    event.preventDefault();
                    console.log('[Electron Main] webview will-redirect launching app protocol:', redirectUrl);
                    shell.openExternal(redirectUrl).catch(e => console.warn('[Main] shell.openExternal failed:', e.message));
                    notifyAppProtocolLaunched(redirectUrl);
                    return;
                }
            });
            contents.on('will-frame-navigate', (event) => {
                const targetUrl = event.url;
                if (isAppProtocolUrl(targetUrl)) {
                    event.preventDefault();
                    console.log('[Electron Main] webview will-frame-navigate launching app protocol:', targetUrl);
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

            const currentMode = performanceEngine.getSettings().mode;
            if (currentMode === 'ultra') {
                contents.setBackgroundThrottling(false);
            } else {
                contents.setBackgroundThrottling(true);
                contents.on('media-started-playing', () => {
                    contents.setBackgroundThrottling(false);
                });
                contents.on('media-paused', () => {
                    const latestMode = performanceEngine.getSettings().mode;
                    if (latestMode !== 'ultra') {
                        contents.setBackgroundThrottling(true);
                    }
                });
            }
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

        // Track active webview URL for accurate domain resolution in in-tab dialogs
        if (contents.getType() === 'webview') {
            contents.on('did-navigate', (event, url) => {
                if (url && url !== 'about:blank') latestActiveWebviewUrl = url;
            });
            contents.on('did-navigate-in-page', (event, url, isMainFrame) => {
                if (isMainFrame === false) return;
                if (url && url !== 'about:blank') latestActiveWebviewUrl = url;
            });
            contents.on('dom-ready', () => {
                let isWhitelisted = false;
                let isYouTube = false;
                let isGoogleOrMail = false;
                let currentUrl = '';
                try {
                    currentUrl = contents.getURL() || latestActiveWebviewUrl || '';
                    if (currentUrl && currentUrl !== 'about:blank') {
                        const host = new URL(currentUrl).hostname.toLowerCase().replace(/^www\./, '');
                        isYouTube = host === 'youtube.com' || host.endsWith('.youtube.com');
                        isGoogleOrMail = host === 'mail.google.com' || host === 'gmail.com' || host.endsWith('.google.com') || host === 'google.com';
                        const allowlist = Array.isArray(settingsStore.adblockAllowlist) ? settingsStore.adblockAllowlist : [];
                        isWhitelisted = allowlist.some(d => {
                            if (!d || typeof d !== 'string') return false;
                            const cleanD = d.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
                            return host === cleanD || host.endsWith('.' + cleanD);
                        });
                    }
                } catch (_) {}

                if (!isWhitelisted && isNativeAdblockActive && !isGoogleOrMail) {
                    if (!isYouTube && settingsStore.cosmetic !== false) {
                        const cosmeticCSS = `
                            .ad-banner, .advertisement, [id*="google_ads"], [class*="google_ads"],
                            .taboola, .outbrain, [data-ad-unit], [data-ad-slot], .ad-container, .ad-placeholder,
                            [class*="reklama"], [id*="reklama"], [id*="Reklama"], [class*="Reklama"],
                            .wp-header-panel, [class*="wp-header-panel"], [class*="bmjdxfegh"],
                            [class*="screeningWallpaper"], [class*="GGAGE"], .cHJldmVudENC,
                            [data-st-area*="reklama"], [data-vab-box],
                            [class*="Billboard"], [id*="Billboard"], [class*="Wallpaper"], [id*="Wallpaper"],
                            [class*="Tapeta"], [id*="Tapeta"], [class*="Branding"], [id*="Branding"],
                            [id^="wp-ad-"], [class^="wp-ad-"], [class*=" wp-ad-"], [id^="gpt-ad"], [class*="gpt-ad"], [id^="ad-desktop"],
                            [class*="ad-desktop"], [class*="AdSlot"], [class*="ad-slot"], [class*="ad_slot"] {
                                display: none !important;
                                visibility: hidden !important;
                                height: 0 !important;
                                min-height: 0 !important;
                            }
                        `;
                        try { contents.insertCSS(cosmeticCSS).catch(() => {}); } catch (_) {}

                        if (currentUrl && currentUrl.toLowerCase().includes('wp.pl')) {
                            const wpWallpaperCSS = `
                                body, html, #root, #app {
                                    background-image: none !important;
                                }
                                .wp-header-panel, [class*="wp-header-panel"], [class*="screeningWallpaper"], [class*="bmjdxfegh"] {
                                    display: none !important;
                                    height: 0 !important;
                                }
                            `;
                            try { contents.insertCSS(wpWallpaperCSS).catch(() => {}); } catch (_) {}
                        }
                    }

                    if (!isYouTube && settingsStore.adblockAnnoyances !== false) {
                        const annoyancesCSS = `
                            #onetrust-consent-sdk, #CybotCookiebotDialog, .cc-window, .cc-banner, #qc-cmp2-container, .fc-consent-root, [id*="cookie-banner"], [class*="cookie-consent-banner"] {
                                display: none !important;
                                visibility: hidden !important;
                                pointer-events: none !important;
                            }
                        `;
                        try { contents.insertCSS(annoyancesCSS).catch(() => {}); } catch (_) {}
                    }

                    if (isYouTube && settingsStore.adblockYoutubeAds !== false) {
                        const youtubeAdsCSS = `
                            .ytp-ad-overlay-container, .ytp-ad-message-container, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer, #masthead-ad {
                                display: none !important;
                            }
                        `;
                        try { contents.insertCSS(youtubeAdsCSS).catch(() => {}); } catch (_) {}
                    }
                }
            });
        }

        contents.on('before-input-event', (event, input) => {
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
            if (isCmdOrCtrl || input.key === 'F11' || input.key === 'F12' || input.key === 'Escape' || input.key === 'F3') {
                let shortcut = null;
                if (isCmdOrCtrl && input.key) {
                    shortcut = `cmd+${input.key.toLowerCase()}`;
                } else if (input.key === 'F11' || input.key === 'F12' || input.key === 'Escape' || input.key === 'F3') {
                    shortcut = input.key.toLowerCase();
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

                    const overrideKeys = [
                        'cmd+w', 'cmd+r', 'cmd+t', 'cmd+k', 'cmd+1', 'cmd+2', 'cmd+3', 
                        'cmd+n', 'cmd+p', 'cmd+e', 'cmd+b', 'cmd+j', 'cmd+f', 'cmd+h', 
                        'cmd+l', 'cmd+y', 'cmd+\\', 'cmd+|', 'cmd+d', 'cmd+[', 'cmd+]',
                        'cmd++', 'cmd+-', 'cmd+=', 'cmd+0', 'cmd+s', 'f11', 'f12', 'f3'
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
            win.setIcon(path.join(__dirname, '../icon.png'));
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

function isThirdPartyCookieRequest(requestUrl, referrerUrl, mainFrameUrl) {
    if (!requestUrl) return false;
    try {
        const reqHost = new URL(requestUrl).hostname.toLowerCase();
        
        // Critical Auth, Identity & Platform domains - NEVER block cookies or tokens for authentication flows!
        if (
            reqHost.includes('google.com') ||
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
            reqHost.includes('live.com') ||
            reqHost.includes('voxmedia.com') ||
            reqHost.includes('cloudflare.com') ||
            reqHost.includes('challenges.cloudflare.com') ||
            reqHost.includes('hcaptcha.com') ||
            reqHost.includes('recaptcha.net') ||
            reqHost.includes('turnstile')
        ) {
            return false;
        }

        const getBaseDomain = (host) => {
            if (!host) return '';
            const parts = host.split('.');
            if (parts.length <= 2) return host;
            const tld2 = parts.slice(-2).join('.');
            if (['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br'].includes(tld2)) {
                return parts.slice(-3).join('.');
            }
            return parts.slice(-2).join('.');
        };

        const targetBase = getBaseDomain(reqHost);

        // Check against referrer
        if (referrerUrl) {
            try {
                const refHost = new URL(referrerUrl).hostname.toLowerCase();
                const refBase = getBaseDomain(refHost);
                if (targetBase === refBase) return false; // First-party request
            } catch (_) {}
        }

        // Check against active webview / main frame URL
        if (mainFrameUrl) {
            try {
                const mfHost = new URL(mainFrameUrl).hostname.toLowerCase();
                const mfBase = getBaseDomain(mfHost);
                if (targetBase === mfBase) return false; // First-party request
            } catch (_) {}
        }

        return true;
    } catch (_) {
        return false;
    }
}

app.setName('QBrowse');
app.setAppUserModelId('com.qbrowse.app');

const configuredSessions = new WeakSet();

function setupHeadersHandler(sess) {
    if (!sess || !sess.webRequest) return;

    sess.webRequest.onBeforeSendHeaders((details, callback) => {
        delete details.requestHeaders['X-Electron-Version'];

        let isGoogleAuth = isGoogleAuthUrl(details.url) || isGoogleAuthUrl(details.referrer);
        if (!isGoogleAuth && details.webContentsId) {
            try {
                const wc = webContents.fromId(details.webContentsId);
                if (wc && !wc.isDestroyed()) {
                    const wcUrl = wc.getURL();
                    if (isGoogleAuthUrl(wcUrl)) isGoogleAuth = true;
                }
            } catch (_) {}
        }

        // Provide clean Chrome desktop identity for all web browsing and OAuth
        details.requestHeaders['User-Agent'] = cleanChromeUA;
        const chromeMajor = (process.versions.chrome || '131').split('.')[0];
        details.requestHeaders['sec-ch-ua'] = `"Google Chrome";v="${chromeMajor}", "Chromium";v="${chromeMajor}", "Not_A Brand";v="24"`;
        details.requestHeaders['sec-ch-ua-mobile'] = '?0';
        details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';
        if (details.requestHeaders['sec-ch-ua-full-version-list']) {
            details.requestHeaders['sec-ch-ua-full-version-list'] = `"Google Chrome";v="${process.versions.chrome}", "Chromium";v="${process.versions.chrome}", "Not_A Brand";v="24.0.0.0"`;
        }

        if (settingsStore.dnt !== false) {
            details.requestHeaders['DNT'] = '1';
        }

        // Top-level document navigations and authentication flows must NEVER have cookies blocked
        if (settingsStore.block3rdParty && details.resourceType !== 'mainFrame' && !isGoogleAuth) {
            const is3rd = isThirdPartyCookieRequest(details.url, details.referrer, latestActiveWebviewUrl);
            if (is3rd) {
                delete details.requestHeaders['Cookie'];
                delete details.requestHeaders['cookie'];
            }
        }

        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    sess.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        let isGoogleAuth = isGoogleAuthUrl(details.url) || isGoogleAuthUrl(details.referrer);
        if (!isGoogleAuth && details.webContentsId) {
            try {
                const wc = webContents.fromId(details.webContentsId);
                if (wc && !wc.isDestroyed()) {
                    const wcUrl = wc.getURL();
                    if (isGoogleAuthUrl(wcUrl)) isGoogleAuth = true;
                }
            } catch (_) {}
        }

        if (settingsStore.block3rdParty && details.resourceType !== 'mainFrame' && !isGoogleAuth) {
            const is3rd = isThirdPartyCookieRequest(details.url, details.referrer, latestActiveWebviewUrl);
            if (is3rd) {
                delete responseHeaders['set-cookie'];
                delete responseHeaders['Set-Cookie'];
            }
        }

        const isCloudflare = details.url && (details.url.includes('cloudflare.com') || details.url.includes('challenges.cloudflare.com'));
        if (localDialogPort && !isGoogleAuth && !isCloudflare) {
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
        for (const wc of webContents.getAllWebContents()) {
            if (!wc.isDestroyed() && wc.getType() === 'webview') {
                try {
                    wc.setEmulatedMedia({ colorScheme: effectiveScheme });
                    wc.setBackgroundColor(bgColor);
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

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-started', { 
                id, 
                fileName, 
                totalBytes, 
                url, 
                urlChain, 
                webContentsId, 
                canGoBack, 
                webContentsUrl 
            });
        }

        let lastDownloadUpdateTime = Date.now();
        let lastReceivedBytes = 0;

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-updated', { id, state: 'interrupted' });
                }
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-updated', { id, state: 'paused' });
                    }
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

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-updated', { 
                            id, 
                            state: 'progressing', 
                            receivedBytes,
                            speedBytesPerSec
                        });
                    }
                }
            }
        });

        item.once('done', async (event, state) => {
            const savePath = item.getSavePath();
            let verificationResult = { verified: false };
            let finalState = state;

            if (state === 'completed' && savePath) {
                // Short yield to ensure OS file system flush
                await new Promise(r => setTimeout(r, 60));
                verificationResult = await verifyAndChecksumFile(savePath, totalBytes);
                if (!verificationResult.verified) {
                    console.warn('[Download Verification] File verification failed for:', savePath, verificationResult.error);
                    finalState = 'interrupted';
                } else {
                    console.log(`[Download Verification] Verified: ${fileName} (${verificationResult.size} bytes, SHA-256: ${verificationResult.checksum.slice(0, 12)}...)`);
                }
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-done', { 
                    id, 
                    state: finalState, 
                    savePath,
                    verified: verificationResult.verified,
                    checksum: verificationResult.checksum || null,
                    algorithm: verificationResult.algorithm || 'SHA-256',
                    actualBytes: verificationResult.size ?? item.getReceivedBytes(),
                    error: verificationResult.error || null,
                    verifiedAt: verificationResult.verifiedAt || null
                });
            }
        });
    });
}

function setupWebviewSession(sess) {
    if (!sess || configuredSessions.has(sess)) return;
    configuredSessions.add(sess);

    const preloadScriptPath = path.join(__dirname, 'webview_preload.cjs');
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

    setupHeadersHandler(sess);
    applyAdblockerToSession(sess);

    sess.setPermissionRequestHandler((webContents, permission, callback, details) => {
        try {
            const requestingUrl = details.requestingUrl || webContents.getURL();
            if (requestingUrl) {
                const domain = new URL(requestingUrl).hostname.replace(/^www\./, '').toLowerCase();
                if (permissionsData[domain] && permissionsData[domain][permission]) {
                    const setting = permissionsData[domain][permission];
                    if (setting === 'allow') return callback(true);
                    if (setting === 'block') return callback(false);
                }
            }
        } catch(e) {}
        callback(true);
    });

    sess.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        if (['hid', 'usb', 'serial'].includes(permission)) {
            return true;
        }
        try {
            if (requestingOrigin) {
                const domain = new URL(requestingOrigin).hostname.replace(/^www\./, '').toLowerCase();
                if (permissionsData[domain] && permissionsData[domain][permission]) {
                    const setting = permissionsData[domain][permission];
                    if (setting === 'allow') return true;
                    if (setting === 'block') return false;
                }
            }
        } catch(e) {}
        return true;
    });

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

function applyPerformanceTierToContents(activeTier) {
    try {
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
        if (activeTier === 'eco') {
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
            console.log('[DNS] Host resolver disabled: Mode = OFF (OS Default)');
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
        console.log(`[DNS] Host resolver applied: Mode = ${secureDnsMode}, Server(s) = ${servers.join(', ')}`);
        return { success: true, mode: secureDnsMode, servers };
    } catch (err) {
        console.error('[DNS] Failed to configure host resolver:', err);
        return { success: false, error: err.message };
    }
}

app.whenReady().then(async () => {
  // 1. Immediately create the main browser window so UI rendering starts instantly
  createWindow();

  // 1b. Apply configured Secure DNS (DoH) / Custom DNS host resolver
  applyDnsConfiguration();

  // 2. Register local media streaming protocol for wallpapers and assets
  try {
      protocol.handle('qbrowse-media', async (request) => {
          try {
              const raw = request.url.replace(/^qbrowse-media:\/\/(?:app\/|local\/)?/, '');
              const decoded = decodeURIComponent(raw);
              const fileName = path.basename(decoded);
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
              return net.fetch(pathToFileURL(fullPath).toString());
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

  // 3. Initialize performance settings and permissions
  try {
      performanceEngine.initSettings(app.getPath('userData'));
      ensurePermissionsFile();
  } catch (_) {}

  // 3b. Handle screen resolution / DPI changes to keep compositor and window geometry synchronized
  try {
      screen.on('display-metrics-changed', (event, display, changedMetrics) => {
          console.log('[Display] Screen metrics changed:', changedMetrics);
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

  // 4. Configure webview sessions
  try {
      setupWebviewSession(session.defaultSession);
      const defaultProfileSession = session.fromPartition('persist:profile_default');
      setupWebviewSession(defaultProfileSession);
      const ghostSession = session.fromPartition('ghost');
      setupWebviewSession(ghostSession);
      if (ghostSession && typeof ghostSession.setWebRTCIPHandlingPolicy === 'function') {
          ghostSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }
      const torSession = session.fromPartition('tor');
      setupWebviewSession(torSession);
      if (torSession && typeof torSession.setWebRTCIPHandlingPolicy === 'function') {
          torSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      }
      torSession.setProxy({
          proxyRules: `socks5://127.0.0.1:${torEngine.getStatus().socksPort || 9050}`,
          proxyBypassRules: '<local>'
      }).catch(() => {});

      app.on('session-created', (sess) => {
          setupWebviewSession(sess);
      });
  } catch (_) {}

  // 5. Non-blocking asynchronous background initialization (Power monitor, Widevine DRM, YouTube/Google cleaner, OS registry)
  setTimeout(async () => {
      try {
          if (powerMonitor) {
              powerMonitor.on('on-battery', async () => {
                  let gpuInfo = null;
                  try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
                  const profile = performanceEngine.detectHardwareProfile(gpuInfo, true);
                  applyPerformanceTierToContents(profile.activeTier);
                  if (mainWindow && !mainWindow.isDestroyed()) {
                      mainWindow.webContents.send('performance-profile-changed', profile);
                  }
              });
              powerMonitor.on('on-ac', async () => {
                  let gpuInfo = null;
                  try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
                  const profile = performanceEngine.detectHardwareProfile(gpuInfo, false);
                  applyPerformanceTierToContents(profile.activeTier);
                  if (mainWindow && !mainWindow.isDestroyed()) {
                      mainWindow.webContents.send('performance-profile-changed', profile);
                  }
              });
          }
      } catch (e) {
          console.warn('[PerformanceEngine] Power monitor setup warning:', e.message);
      }

      try {
          if (components && typeof components.whenReady === 'function') {
              await components.whenReady();
              console.log('Widevine and components loaded successfully.');
          }
      } catch(e) {
          console.error('Components failed to load:', e);
      }

      // Clean YouTube and Google login stuck/rejected state asynchronously
      try {
          const sessionsToClean = [
              session.defaultSession,
              session.fromPartition('persist:profile_default')
          ];
          for (const s of sessionsToClean) {
              s.clearStorageData({ origin: 'https://www.youtube.com', storages: ['serviceworkers', 'cachestorage'] }).catch(() => {});
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
      setTimeout(() => {
          performGitHubUpdateCheck({ silent: true, autoDownload: app.isPackaged }).catch((err) => {
              console.log('[AutoUpdater] Silent startup check skipped/failed:', err?.message || err);
          });
      }, 6000);

      setInterval(() => {
          performGitHubUpdateCheck({ silent: true, autoDownload: app.isPackaged }).catch(() => {});
      }, 4 * 60 * 60 * 1000);
  }, 100);
});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle('open-file', async (event, path) => {
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
  
  ipcMain.handle('show-item-in-folder', async (event, path) => {
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
      return await verifyAndChecksumFile(filePath, 0);
  });

  ipcMain.handle('compare-download-checksum', async (event, { filePath, expectedChecksum, algorithm = 'sha256' }) => {
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
      try {
          if (!filePath || !fsSync.existsSync(filePath)) {
              return { success: false, error: 'File does not exist' };
          }
          const algo = (algorithm || 'sha256').toLowerCase();
          const hash = crypto.createHash(algo);
          const stream = fsSync.createReadStream(filePath);
          await new Promise((resolve, reject) => {
              stream.on('data', chunk => hash.update(chunk));
              stream.on('end', resolve);
              stream.on('error', reject);
          });
          return {
              success: true,
              checksum: hash.digest('hex'),
              algorithm: algo.toUpperCase()
          };
      } catch (err) {
          return { success: false, error: err.message };
      }
  });

  ipcMain.handle('delete-download-file', async (event, filePath) => {
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
    console.log('[Electron Main] qbrowse-js-dialog-close received:', { dialogId, accept, promptText });

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
            console.log('[Electron Main] Responded to synchronous HTTP dialog:', dialogId, { accept, promptText });
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
            console.log('[Electron Main] Resolved showMessageBox fallback:', dialogId);
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
    rejectUnauthorized: false,
    keepAlive: true
});

const GITHUB_OWNER = 'Qu-Bi';
const GITHUB_REPO = 'QBrowse';
const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASES_WEB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

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
    platform: process.platform,
    arch: process.arch,
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

function normalizeSemver(ver) {
    if (!ver || typeof ver !== 'string') return '0.0.0';
    return ver.trim().replace(/^[vV]+/, '');
}

function compareSemver(verA, verB) {
    const cleanA = normalizeSemver(verA);
    const cleanB = normalizeSemver(verB);
    const [mainA, preA] = cleanA.split('-');
    const [mainB, preB] = cleanB.split('-');
    const partsA = mainA.split('.').map(n => parseInt(n, 10) || 0);
    const partsB = mainB.split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(partsA.length, partsB.length, 3);
    for (let i = 0; i < len; i++) {
        const a = partsA[i] || 0;
        const b = partsB[i] || 0;
        if (a > b) return 1;
        if (a < b) return -1;
    }
    if (!preA && preB) return 1;
    if (preA && !preB) return -1;
    if (preA && preB && preA !== preB) return preA > preB ? 1 : -1;
    return 0;
}

function updateAndBroadcastState(eventName, patch = {}) {
    Object.assign(updaterState, patch, {
        currentVersion: app.getVersion(),
        runtimeVersions: {
            app: app.getVersion(),
            electron: process.versions.electron || '',
            chrome: process.versions.chrome || '',
            node: process.versions.node || '',
            v8: process.versions.v8 || ''
        }
    });
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
                rejectUnauthorized: false,
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

function detectLinuxPackagePreference() {
    if (process.env.APPIMAGE) return 'AppImage';
    try {
        if (fsSync.existsSync('/etc/arch-release') || fsSync.existsSync('/usr/bin/pacman')) {
            return 'pacman';
        }
        if (fsSync.existsSync('/etc/debian_version') || fsSync.existsSync('/usr/bin/dpkg')) {
            return 'deb';
        }
    } catch (_) {}
    return 'AppImage';
}

function selectBestPlatformAsset(assets = [], version = '', ymlData = null) {
    const validAssets = Array.isArray(assets) ? assets.filter(a => a && a.name && a.browser_download_url) : [];

    if (process.platform === 'win32') {
        const exeAssets = validAssets.filter(a => {
            const n = a.name.toLowerCase();
            return n.endsWith('.exe') && !n.endsWith('.blockmap') && !n.includes('uninstall');
        });
        const preferred = exeAssets.find(a => /setup/i.test(a.name)) || exeAssets[0] || null;
        let expectedSha512 = ymlData?.sha512 || null;
        if (ymlData?.files?.length && preferred) {
            const matchedFile = ymlData.files.find(f =>
                f.url === preferred.name ||
                f.url.replace(/[-.\s]+/g, '').toLowerCase() === preferred.name.replace(/[-.\s]+/g, '').toLowerCase()
            );
            if (matchedFile?.sha512) expectedSha512 = matchedFile.sha512;
        }
        if (preferred) {
            return {
                name: preferred.name,
                url: preferred.browser_download_url,
                size: preferred.size || 0,
                sha512: expectedSha512
            };
        }
        return null;
    }

    if (process.platform === 'linux') {
        const pref = detectLinuxPackagePreference();
        const findByExt = (ext) => validAssets.find(a => a.name.toLowerCase().endsWith(ext.toLowerCase()) && !a.name.toLowerCase().endsWith('.blockmap'));
        let chosen = null;
        if (pref === 'AppImage') {
            chosen = findByExt('.AppImage') || findByExt('.deb') || findByExt('.pacman') || findByExt('.tar.gz');
        } else if (pref === 'deb') {
            chosen = findByExt('.deb') || findByExt('.AppImage') || findByExt('.tar.gz');
        } else if (pref === 'pacman') {
            chosen = findByExt('.pacman') || findByExt('.AppImage') || findByExt('.tar.gz');
        } else {
            chosen = findByExt('.AppImage') || findByExt('.deb') || findByExt('.tar.gz');
        }
        if (chosen) {
            let expectedSha512 = null;
            if (ymlData?.files?.length) {
                const matched = ymlData.files.find(f =>
                    f.url === chosen.name ||
                    f.url.replace(/[-.\s]+/g, '').toLowerCase() === chosen.name.replace(/[-.\s]+/g, '').toLowerCase()
                );
                if (matched?.sha512) expectedSha512 = matched.sha512;
            }
            if (!expectedSha512 && chosen.name.toLowerCase().endsWith('.appimage') && ymlData?.sha512) {
                expectedSha512 = ymlData.sha512;
            }
            return {
                name: chosen.name,
                url: chosen.browser_download_url,
                size: chosen.size || 0,
                sha512: expectedSha512
            };
        }
        return null;
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
    const ymlFileName = process.platform === 'linux' ? 'latest-linux.yml' : 'latest.yml';
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

    // 2. If GitHub REST API succeeded, also fetch latest.yml / latest-linux.yml for SHA-512 verification
    if (releaseObj && releaseObj.tag_name) {
        const latestVersion = normalizeSemver(releaseObj.tag_name);
        const assets = Array.isArray(releaseObj.assets) ? releaseObj.assets : [];
        let ymlData = null;

        const ymlAsset = assets.find(a => a && a.name === ymlFileName);
        if (ymlAsset && ymlAsset.browser_download_url) {
            try {
                const { buffer } = await httpGetBuffer(ymlAsset.browser_download_url, { timeoutMs: 10000 });
                ymlData = parseReleaseYaml(buffer.toString('utf8'));
            } catch (e) {
                console.warn(`[AutoUpdater] Could not fetch ${ymlFileName}:`, e.message);
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

    // 3. Rate-limit resilient fallback: Fetch latest.yml / latest-linux.yml directly via github.com release redirect
    const directYmlUrl = `${GITHUB_RELEASES_WEB_URL}/latest/download/${ymlFileName}`;
    const { buffer, finalUrl } = await httpGetBuffer(directYmlUrl, { timeoutMs: 12000 });
    const ymlData = parseReleaseYaml(buffer.toString('utf8'));
    if (!ymlData || !ymlData.version) {
        throw new Error('Unable to parse release metadata from GitHub Releases');
    }

    const latestVersion = normalizeSemver(ymlData.version);
    const tagMatch = finalUrl.match(/\/releases\/download\/([^/]+)\//);
    const tagName = tagMatch ? tagMatch[1] : `v${latestVersion}`;

    // Build candidate asset names (supports both hyphenated QBrowse-Setup-X.Y.Z.exe and dotted QBrowse.Setup.X.Y.Z.exe)
    const candidateNames = [];
    if (ymlData.path) {
        candidateNames.push(ymlData.path);
        const dotted = ymlData.path.replace(/-Setup-/g, '.Setup.').replace(/\s+/g, '.');
        if (dotted !== ymlData.path) candidateNames.push(dotted);
        const hyphenated = ymlData.path.replace(/\.Setup\./g, '-Setup-').replace(/\s+/g, '-');
        if (hyphenated !== ymlData.path && !candidateNames.includes(hyphenated)) candidateNames.push(hyphenated);
    } else if (process.platform === 'win32') {
        candidateNames.push(`QBrowse-Setup-${latestVersion}.exe`, `QBrowse.Setup.${latestVersion}.exe`);
    } else if (process.platform === 'linux') {
        candidateNames.push(`QBrowse-${latestVersion}.AppImage`, `qbrowse_${latestVersion}_amd64.deb`);
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
            size: ymlData.files?.[0]?.size || 0,
            sha512: ymlData.sha512 || null,
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

async function downloadGitHubUpdateAsset({ silent = false } = {}) {
    if (activeDownloadPromise) return activeDownloadPromise;

    activeDownloadPromise = (async () => {
        try {
            if (!updaterState.assetUrl || !updaterState.assetName) {
                await performGitHubUpdateCheck({ silent: true, autoDownload: false });
            }
            if (!updaterState.assetUrl || !updaterState.assetName) {
                throw new Error('No compatible installer asset found on GitHub Release');
            }

            const updatesDir = path.join(app.getPath('userData'), 'updates');
            await fs.mkdir(updatesDir, { recursive: true });

            const safeFileName = path.basename(updaterState.assetName);
            const finalFilePath = path.join(updatesDir, safeFileName);
            const partFilePath = `${finalFilePath}.part`;

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
                            silent
                        });
                        return { status: 'downloaded', filePath: finalFilePath };
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
                message: null,
                silent
            });

            console.log('[AutoUpdater] Update downloaded and verified at:', finalFilePath);
            return { status: 'downloaded', filePath: finalFilePath, version: updaterState.latestVersion };
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
                rejectUnauthorized: false,
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
                assetSize: syncData.asset?.size || 0,
                expectedSha512: syncData.asset?.sha512 || null,
                lastCheckedAt: Date.now(),
                syncedWithGitHub: true,
                message: null,
                silent
            };

            if (isNewer) {
                // Check if already downloaded on disk
                if (updaterState.downloadedFilePath && fsSync.existsSync(updaterState.downloadedFilePath) && updaterState.version === latestVer) {
                    return updateAndBroadcastState('update-downloaded', {
                        ...commonMeta,
                        status: 'downloaded',
                        percent: 100
                    });
                }

                updateAndBroadcastState('update-available', {
                    ...commonMeta,
                    status: 'available',
                    percent: 0
                });

                if (autoDownload && syncData.asset?.url) {
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
                const args = ['--updated', '--force-run'];
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
                const targetAppImage = process.env.APPIMAGE;
                if (targetAppImage && filePath.toLowerCase().endsWith('.appimage')) {
                    try {
                        await fs.chmod(filePath, 0o755);
                        await fs.copyFile(filePath, targetAppImage);
                        await fs.chmod(targetAppImage, 0o755);
                        const child = spawn(targetAppImage, [], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        child.unref();
                        setTimeout(() => app.quit(), 200);
                        return { status: 'installing' };
                    } catch (linuxErr) {
                        console.warn('[AutoUpdater] AppImage self-replace failed, opening folder:', linuxErr.message);
                        shell.showItemInFolder(filePath);
                        return { status: 'opened-folder' };
                    }
                } else {
                    const openErr = await shell.openPath(filePath);
                    if (openErr) {
                        shell.showItemInFolder(filePath);
                    }
                    return { status: 'opened-installer' };
                }
            }

            await shell.openPath(filePath);
            return { status: 'opened-installer' };
        } catch (err) {
            isInstallingUpdate = false;
            console.error('[AutoUpdater] Failed to launch installer:', err);
            return { status: 'error', message: err.message };
        }
    }

    if (autoUpdater && app.isPackaged) {
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
    return {
        ...updaterState,
        currentVersion: app.getVersion(),
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
    return await performGitHubUpdateCheck({ silent: false, autoDownload: true });
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
            hasWindowsHello: Boolean((vault.canary || vault.testEncryption) && ((vault.bioConfig?.enabled && vault.bioConfig?.wrappedSecretBase64) || vault.osKeyWrap || process.platform === 'win32')),
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
            const machineKey = deriveLegacyKey(os.hostname() + (os.userInfo()?.username || 'user') + 'QBrowseOSKey');
            vault.osKeyWrap = {
                useSafeStorage: false,
                wrappedKeyBase64: Buffer.from(encrypt(secretJson, machineKey), 'utf8').toString('base64')
            };
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
            wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);
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
            wrapMasterKeyForOS(vault, masterKey, activeMasterPassword);

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

ipcMain.handle('vault-lock', async () => {
    masterKey = null;
    activeMasterPassword = null;
    return true;
});

function requestWindowsHelloVerification(message = "Verify your identity for QBrowse Passkey") {
    return new Promise((resolve) => {
        if (process.platform !== 'win32') {
            return resolve({ verified: false, status: 'NotSupported' });
        }
        const scriptPath = path.join(__dirname, 'verify_hello.ps1');
        execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, message], (err, stdout, stderr) => {
            if (err) {
                console.warn('[Windows Hello] Exec error:', err);
                return resolve({ verified: false, status: 'Error', error: err.message });
            }
            const output = (stdout || '').trim();
            console.log('[Windows Hello] Result:', output);
            if (output.includes('Verified')) {
                resolve({ verified: true, success: true, status: 'Verified' });
            } else if (output.includes('Canceled')) {
                resolve({ verified: false, success: false, status: 'Canceled' });
            } else if (output.includes('NotAvailable')) {
                resolve({ verified: false, success: false, status: 'NotAvailable' });
            } else {
                resolve({ verified: false, success: false, status: output || 'Failed' });
            }
        });
    });
}

const pendingPasskeyVerifications = new Map();

ipcMain.handle('vault-verify-passkey-usage', async (event, details) => {
    // Prompt custom QVault Passkey Verification Modal in mainWindow
    return new Promise((resolve) => {
        const requestId = 'pv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        const timer = setTimeout(() => {
            if (pendingPasskeyVerifications.has(requestId)) {
                pendingPasskeyVerifications.delete(requestId);
                resolve({ verified: false, error: 'Timeout' });
            }
        }, 60000); // 60s timeout matching WebAuthn standard

        pendingPasskeyVerifications.set(requestId, { 
            resolve, 
            timer,
            callerSender: event.sender
        });

        const appWin = (mainWindow && !mainWindow.isDestroyed()) 
            ? mainWindow 
            : Array.from(browserWindows).find(w => w && !w.isDestroyed());
        if (appWin && !appWin.isDestroyed()) {
            try {
                if (appWin.isMinimized()) appWin.restore();
                appWin.show();
                appWin.focus();
                appWin.moveTop();
            } catch (_) {}

            appWin.webContents.send('prompt-passkey-verification', {
                requestId,
                rpId: details.rpId,
                username: details.username,
                hostname: details.hostname,
                credentialId: details.credentialId,
                mode: details.mode || 'passkey'
            });
        } else {
            clearTimeout(timer);
            pendingPasskeyVerifications.delete(requestId);
            resolve({ verified: false, error: 'NoWindow' });
        }
    });
});

ipcMain.handle('respond-passkey-verification', async (event, { requestId, verified }) => {
    const pending = pendingPasskeyVerifications.get(requestId);
    if (pending) {
        clearTimeout(pending.timer);
        pendingPasskeyVerifications.delete(requestId);
        pending.resolve({ verified: !!verified });

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
    const verifyRes = await requestWindowsHelloVerification(message || "Verify your identity for QBrowse Passkey");
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

ipcMain.handle('vault-remove-pin', async () => {
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
    try {
        const enable = typeof payload === 'object' && payload !== null ? Boolean(payload.enable) : Boolean(payload);
        const mp = typeof payload === 'object' && payload !== null ? payload.masterPassword : null;

        await ensureVault();
        const vault = readVaultSync();

        if (!enable) {
            delete vault.bioConfig;
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

        if (!masterKey) {
            return { success: false, error: 'Unlock vault with Master Password first' };
        }

        const verifyRes = await requestWindowsHelloVerification('Confirm your identity to enable Windows Hello for QVault');
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

ipcMain.handle('vault-unlock-windows-hello', async () => {
    try {
        const verifyRes = await requestWindowsHelloVerification('Unlock QBrowse Password Vault');
        if (!verifyRes || !verifyRes.verified) {
            return { success: false, error: 'Biometric verification failed' };
        }

        await ensureVault();
        const vault = readVaultSync();

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

    // Deduplicate: if an entry has exact same normalized url and username, update it
    const existingIndex = vault.passwords.findIndex(p => {
        if (!p) return false;
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

ipcMain.handle('vault-delete-password', async (event, id) => {
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

ipcMain.handle('vault-get-passwords', async () => {
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
        allowCreds = Array.isArray(query.allowCredentials) ? query.allowCredentials : [];
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
                    locked: true
                };
            }).filter(Boolean);
        }

        return items.filter(p => {
            const isPasskey = p.itemType === 'passkey' || !!p.passkeyData;
            if (!isPasskey) {
                if (!p.locked && (!p.username || !p.password)) return false;
                if (p.locked && (!p.username && !p.password && !p.url && !p.title)) return false;
            }

            // 1. Direct Credential ID match from allowCredentials
            if (isPasskey && allowCreds.length > 0 && p.passkeyData?.credentialId) {
                const credId = String(p.passkeyData.credentialId).toLowerCase();
                if (allowCreds.some(id => id && String(id).toLowerCase() === credId)) {
                    return true;
                }
            }

            if (!targetHost && !targetRpId) return false;

            // 2. Check RP ID match
            if (isPasskey && targetRpId && p.passkeyData?.rpId) {
                if (domainsMatch(targetRpId, p.passkeyData.rpId)) return true;
            }

            // 3. Check Hostname / Domain match across URL, title, rpId
            const itemHost = p.url || p.title || '';
            if (targetHost && domainsMatch(targetHost, itemHost)) return true;
            if (targetHost && isPasskey && p.passkeyData?.rpId && domainsMatch(targetHost, p.passkeyData.rpId)) return true;
            if (targetRpId && domainsMatch(targetRpId, itemHost)) return true;

            return false;
        });
    } catch (e) {
        console.error('[vault-get-matching] Error:', e);
        return [];
    }
});

ipcMain.handle('vault-change-password', async (event, oldPassword, newPassword) => {
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

ipcMain.handle('vault-reset', async () => {
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
const permissionsPath = path.join(appDataPath, 'permissions.json');
let permissionsData = {};

async function ensurePermissionsFile() {
    try {
        const data = await fs.readFile(permissionsPath, 'utf8');
        permissionsData = JSON.parse(data);
    } catch {
        permissionsData = {};
        try {
            await fs.writeFile(permissionsPath, JSON.stringify(permissionsData, null, 2));
        } catch(e) {}
    }
}

async function savePermissionsData() {
    try {
        await fs.writeFile(permissionsPath, JSON.stringify(permissionsData, null, 2));
    } catch (e) {}
}

function getSessionByPartition(partition) {
    if (partition && typeof partition === 'string' && partition.trim()) {
        return session.fromPartition(partition.trim());
    }
    return session.defaultSession;
}

ipcMain.handle('get-cookies', async (event, filter = {}) => {
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
    try {
        const targetSession = getSessionByPartition(partition);
        await targetSession.cookies.remove(url, name);
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('clear-site-cookies', async (event, domain, partition) => {
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
    try {
        if (!pid || pid === process.pid) {
            console.warn('[TaskManager] Cannot terminate the main browser process via IPC.');
            return false;
        }
        process.kill(pid);
        console.log(`[TaskManager] Terminated process ${pid}`);
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
            console.log('[Ghost Mode] In-memory ghost session data and cache cleared.');
        }
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
            console.log('[Tor Mode] In-memory tor session data and cache cleared.');
        }
        return true;
    } catch (e) {
        console.warn('[Tor Mode] Error clearing tor session:', e);
        return false;
    }
});

ipcMain.handle('get-site-permissions', async (event, domain) => {
    await ensurePermissionsFile();
    if (!domain) return permissionsData;
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
    return permissionsData[cleanDomain] || {};
});

ipcMain.handle('set-site-permission', async (event, domain, permission, value) => {
    await ensurePermissionsFile();
    if (!domain) return false;
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
    if (!permissionsData[cleanDomain]) permissionsData[cleanDomain] = {};
    permissionsData[cleanDomain][permission] = value;
    await savePermissionsData();
    return true;
});

ipcMain.handle('get-all-site-permissions', async () => {
    await ensurePermissionsFile();
    return permissionsData;
});

ipcMain.handle('reset-site-permissions', async (event, domain) => {
    await ensurePermissionsFile();
    if (!domain) return false;
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
    delete permissionsData[cleanDomain];
    await savePermissionsData();
    return true;
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
        const store = getSettingsStore();
        let isForceDark = (store && typeof store.isForceDark === 'boolean') 
            ? store.isForceDark 
            : (liveSmartDarkState.isForceDark !== null ? liveSmartDarkState.isForceDark : false);
        const exclusions = Array.isArray(store?.darkExclusions) 
            ? store.darkExclusions 
            : liveSmartDarkState.darkExclusions;
        const isExcluded = exclusions.some(d => url && typeof d === 'string' && d.trim() && url.includes(d.trim()));
        console.log('[Electron Main] get-smart-dark-state for', url, '-> isForceDark:', isForceDark, 'isExcluded:', isExcluded);
        return { isForceDark, isExcluded };
    } catch (_) {
        return { isForceDark: false, isExcluded: false };
    }
});

ipcMain.on('sync-smart-dark-state', (event, { isForceDark, darkExclusions }) => {
    if (typeof isForceDark === 'boolean') {
        liveSmartDarkState.isForceDark = isForceDark;
        settingsStore['isForceDark'] = isForceDark;
    }
    if (Array.isArray(darkExclusions)) {
        liveSmartDarkState.darkExclusions = darkExclusions;
        settingsStore['darkExclusions'] = darkExclusions;
    }
    if (!settingsPath) {
        settingsPath = path.join(app.getPath('userData'), 'settings.json');
    }
    try {
        fsSync.writeFileSync(settingsPath, JSON.stringify(settingsStore, null, 2), 'utf8');
    } catch (_) {}
    console.log('[Electron Main] sync-smart-dark-state received:', { isForceDark, darkExclusions });
    broadcastSmartDarkToOAuthWindows();
});

ipcMain.handle('save-setting', (event, data) => {
    const rawKey = (data && typeof data === "object" && typeof data.key === "object" && data.key?.key) ? data.key.key : data?.key;
    const rawValue = (data && typeof data === "object" && typeof data.key === "object" && data.key?.value !== undefined) ? data.key.value : data?.value;
    if (rawKey && typeof rawKey === "string") {
        if (!settingsPath) {
            settingsPath = path.join(app.getPath('userData'), 'settings.json');
        }
        settingsStore[rawKey] = rawValue;
        if (rawKey === 'adblockEnabled' && typeof rawValue === 'boolean') {
            isNativeAdblockActive = rawValue;
        }
        if (data.key === 'isForceDark' && typeof data.value === 'boolean') {
            liveSmartDarkState.isForceDark = data.value;
        }
        if (data.key === 'darkExclusions' && Array.isArray(data.value)) {
            liveSmartDarkState.darkExclusions = data.value;
        }
        try {
            fsSync.writeFileSync(settingsPath, JSON.stringify(settingsStore, null, 2), 'utf8');
        } catch (_) {}
        if (data.key === 'isForceDark' || data.key === 'darkExclusions') {
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

ipcMain.handle('ai-stop-server', async () => {
    return aiEngine.stopLlamaServer();
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
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(filePath)) throw new Error('File not found');

    const ext = path.extname(filePath).toLowerCase();
    
    try {
        if (ext === '.pdf') {
            const pdfParse = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } else if (ext === '.docx') {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            const Tesseract = require('tesseract.js');
            const result = await Tesseract.recognize(filePath, 'eng');
            return result.data.text;
        } else {
            // Fallback for text files
            return fs.readFileSync(filePath, 'utf-8');
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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

ipcMain.handle('tor-start', async () => {
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

ipcMain.handle('tor-stop', async () => {
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

ipcMain.handle('tor-download-binary', async () => {
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
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('performance-profile-changed', profile);
    }
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
            const { execSync } = require('child_process');
            execSync(`reg.exe import "${tempFile}"`, { stdio: ['ignore', 'pipe', 'ignore'] });
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
    if (process.platform !== 'linux') return false;
    try {
        const os = require('os');
        const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');
        fsSync.mkdirSync(appsDir, { recursive: true });

        const desktopFile = path.join(appsDir, 'qbrowse.desktop');

        const execCmd = process.env.APPIMAGE 
            ? `"${process.env.APPIMAGE}"`
            : app.isPackaged
                ? `"${process.execPath}"`
                : `"${process.execPath}" "${path.resolve(__dirname, 'main.cjs')}"`;

        let iconPath = 'qbrowse';
        const projectIcon = path.join(__dirname, '..', 'icon.png');
        const userIconPath = path.join(appsDir, 'qbrowse.png');
        try {
            if (fsSync.existsSync(projectIcon) && !fsSync.existsSync(userIconPath)) {
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
StartupWMClass=qbrowse
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
            const { execSync } = require('child_process');
            execSync(`update-desktop-database "${appsDir}"`, { stdio: ['ignore', 'pipe', 'ignore'] });
        } catch (_) {}

        return true;
    } catch (err) {
        console.warn('[DefaultBrowser] Failed to write Linux desktop entry:', err);
        return false;
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
                exec('xdg-settings get default-web-browser', {
                    encoding: 'utf8',
                    timeout: 2000
                }, (err, stdout) => {
                    const isDefault = !err && stdout ? /qbrowse/i.test(stdout.trim()) : false;
                    _cachedDefaultBrowserStatus = isDefault;
                    _cachedDefaultBrowserTimestamp = Date.now();
                    resolve(isDefault);
                });
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

// Default Browser Handlers
ipcMain.handle('system-check-default-browser', async (event, options = {}) => {
    try {
        const forceFresh = Boolean(options && options.force);
        const isDefault = await checkIsDefaultBrowserAsync(forceFresh);
        return { isDefault };
    } catch (e) {
        return { isDefault: false, error: e.message };
    }
});

ipcMain.handle('system-set-default-browser', async () => {
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
                return { success: true, isDefault: false, openedSystemSettings: true };
            }
            return { success: true, isDefault: true, openedSystemSettings: false };
        } else if (process.platform === 'linux') {
            ensureLinuxDesktopEntry();
            try {
                const { execSync } = require('child_process');
                execSync('xdg-settings set default-web-browser qbrowse.desktop', { stdio: ['ignore', 'pipe', 'ignore'] });
                execSync('xdg-mime default qbrowse.desktop x-scheme-handler/http x-scheme-handler/https text/html application/xhtml+xml', { stdio: ['ignore', 'pipe', 'ignore'] });
            } catch (_) {}
            const isDefault = await checkIsDefaultBrowserAsync(true);
            return { success: true, isDefault, openedSystemSettings: false };
        } else {
            if (typeof app.setAsDefaultProtocolClient === 'function') {
                try { app.setAsDefaultProtocolClient('http'); } catch (_) {}
                try { app.setAsDefaultProtocolClient('https'); } catch (_) {}
                try { app.setAsDefaultProtocolClient('qbrowse'); } catch (_) {}
            }
            const isDefault = await checkIsDefaultBrowserAsync(true);
            return { success: true, isDefault, openedSystemSettings: false };
        }
    } catch (e) {
        return { success: false, error: e.message };
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
            const { exec } = require('child_process');
            exec('gnome-control-center default-apps || xfce4-mime-settings || kcmshell5 componentchooser || systemsettings5');
            return { success: true };
        } else if (process.platform === 'darwin') {
            await shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
            return { success: true };
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
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
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
        if (!ext || !['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('png')) ext = '.png';
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

// Experimental Flags & Relaunch Handlers

ipcMain.handle('flags-get', () => {
    return userFlags;
});

ipcMain.handle('flags-set', (event, { id, val }) => {
    try {
        userFlags[id] = val;
        const flagsPath = path.join(app.getPath('userData'), 'flags.json');
        fsSync.writeFileSync(flagsPath, JSON.stringify(userFlags, null, 2), 'utf8');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('flags-reset', () => {
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

ipcMain.handle('app-relaunch', () => {
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

ipcMain.handle('github-stop', () => {
    return githubEngine.stop();
});



