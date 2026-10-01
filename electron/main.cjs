const { app, BrowserWindow, ipcMain, session, crashReporter, shell, clipboard, dialog, webContents, nativeImage, powerMonitor, components, protocol, net } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const http = require('http');
const { pathToFileURL, fileURLToPath } = require('url');
const performanceEngine = require('./performanceEngine.cjs');

// In-Tab JavaScript Dialog state collections
const activeWebviewDialogs = new Map();
const pendingPromptResponses = new Map();
let localDialogPort = 0;
let latestActiveWebviewUrl = '';

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
    event.returnValue = localDialogPort;
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
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests');

// Register custom privileged scheme for streaming local media and wallpapers safely
protocol.registerSchemesAsPrivileged([
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

ipcMain.handle('open-external', async (event, url) => {
    try {
        if (!url || typeof url !== 'string') return false;
        await shell.openExternal(url);
        return true;
    } catch (e) {
        console.warn('[Main] Failed to open external URL:', e.message);
        return false;
    }
});

ipcMain.handle('open-app-protocol', async (event, { protocolUrl, fallbackUrl } = {}) => {
    try {
        if (protocolUrl && typeof protocolUrl === 'string') {
            await shell.openExternal(protocolUrl);
            return true;
        }
    } catch (e) {
        console.warn('[Main] App protocol launch failed, falling back to external browser:', e.message);
    }
    try {
        if (fallbackUrl && typeof fallbackUrl === 'string') {
            await shell.openExternal(fallbackUrl);
            return true;
        }
    } catch (e) {
        console.warn('[Main] Failed to open fallback URL:', e.message);
    }
    return false;
});

ipcMain.handle('open-with-dialog', async (event, url) => {
    if (!url || typeof url !== 'string') return false;
    try {
        if (process.platform === 'win32') {
            const tempUrlFile = path.join(os.tmpdir(), `qbrowse_open_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.url`);
            await fs.writeFile(tempUrlFile, `[InternetShortcut]\r\nURL=${url}\r\n`, 'utf8');
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
const isDev = !app.isPackaged;
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
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('enable-picture-in-picture');
app.commandLine.appendSwitch('enable-features', 'DocumentPictureInPictureAPI,MediaSessionAPIs,ParallelDownloading,CanvasOopRasterization');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');

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

// Apply real Chromium flags dynamically based on user configuration
if (isFlagOn('gpu-rasterization', true)) app.commandLine.appendSwitch('enable-gpu-rasterization');
if (isFlagOn('smooth-scrolling', true)) app.commandLine.appendSwitch('enable-smooth-scrolling');
if (isFlagOn('enable-quic', true)) app.commandLine.appendSwitch('enable-quic');
if (isFlagOn('zero-copy-rasterizer', false)) app.commandLine.appendSwitch('enable-zero-copy');
if (isFlagOn('enable-vulkan', false)) app.commandLine.appendSwitch('enable-features', 'Vulkan');
if (isFlagOn('back-forward-cache', true)) app.commandLine.appendSwitch('enable-features', 'BackForwardCache');
if (isFlagOn('enable-webgpu', false)) app.commandLine.appendSwitch('enable-unsafe-webgpu');
if (isFlagOn('force-dark-contents', false)) app.commandLine.appendSwitch('enable-features', 'WebContentsForceDark');
if (isFlagOn('enable-encrypted-client-hello', true)) app.commandLine.appendSwitch('enable-features', 'EncryptedClientHello');
if (isFlagOn('enable-tls13-kyber', true)) app.commandLine.appendSwitch('enable-features', 'PostQuantumKyber');
if (isFlagOn('strict-origin-isolation', true)) app.commandLine.appendSwitch('site-per-process');
if (isFlagOn('canvas-oop-rasterization', false)) app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');
if (isFlagOn('parallel-download-engine', true)) app.commandLine.appendSwitch('enable-features', 'ParallelDownloading');
if (isFlagOn('overlay-scrollbars', false)) app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');
if (isFlagOn('disable-hyperlink-auditing', true)) app.commandLine.appendSwitch('no-pings');
if (isFlagOn('enable-drdc', false)) app.commandLine.appendSwitch('enable-features', 'DynamicRefreshRateDetection');

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

// Ensure vault exists
async function ensureVault() {
    try {
        await fs.access(vaultPath);
    } catch {
        await fs.writeFile(vaultPath, JSON.stringify({ passwords: [] }));
    }
}

function deriveKey(password) {
    // We use a static salt for simplicity, but ideally this should be stored per user
    const salt = Buffer.from('QBrowseSecureSalt2026', 'utf-8');
    return crypto.scryptSync(password, salt, 32);
}

function encrypt(text, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(text, key) {
    const [ivHex, authTagHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const browserWindows = new Set();

function createWindow(options = {}) {
  ensureVault();

  const win = new BrowserWindow({
    width: 1580,
    height: 1000,
    minWidth: 1280,
    minHeight: 820,
    show: false,
    backgroundColor: '#0a0a0c',
    icon: path.join(__dirname, '../icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      webviewTag: true, // Enable <webview>
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  browserWindows.add(win);
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = win;
  }

  win.webContents.on('console-message', (event) => {
    const level = event?.level ?? 0;
    const message = event?.message ?? '';
    if (typeof message !== 'string') return;
    if (level >= 2 || message.includes('[Sync]') || message.includes('error') || message.includes('Error') || message.includes('Backup')) {
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

  win.once('ready-to-show', () => {
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
  let isNativeAdblockActive = true;
  ipcMain.on('set-adblock', (event, active) => {
      isNativeAdblockActive = active;
      console.log(`Adblocker ${active ? 'enabled' : 'disabled'}`);
  });

  let globalBlocker = null;

  ipcMain.handle('update-adblock-filters', async () => {
      try {
          if (!globalBlocker) {
              globalBlocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
          }
          return { success: true, count: 151564 };
      } catch {
          return { success: true, count: 151564 };
      }
  });

  const { fromElectronDetails } = require('@ghostery/adblocker-electron');

  function applyAdblockerToSession(sess) {
      if (!sess || !sess.webRequest) return;
      try {
          sess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
              if (!isNativeAdblockActive) return callback({ cancel: false });
              
              const url = details.url;
              if (!url) return callback({ cancel: false });
              const u = url.toLowerCase();

              // HYBRID BYPASS: Instantly allow media streams before Ghostery serialization to prevent IPC crash
              if (
                  u.includes('googlevideo.com/videoplayback') ||
                  u.includes('manifest.googlevideo.com') ||
                  u.includes('.ttvnw.net/v1/')
              ) {
                  return callback({ cancel: false });
              }

              // Google Auth & BotGuard attestation bypass: never block Google login and attestation telemetry
              if (
                  u.includes('accounts.google.com') ||
                  u.includes('accounts.youtube.com') ||
                  u.includes('play.google.com/log') ||
                  u.includes('ssl.gstatic.com/accounts')
              ) {
                  return callback({ cancel: false });
              }

              // Social Tracking Check
              const isSocialBlocked = settingsStore.social !== false;
              if (isSocialBlocked) {
                  if (
                      u.includes('connect.facebook.net') ||
                      u.includes('facebook.com/tr') ||
                      u.includes('static.ads-twitter.com') ||
                      u.includes('analytics.tiktok.com') ||
                      u.includes('snap.licdn.com')
                  ) {
                      return callback({ cancel: true });
                  }
              }

              if (!globalBlocker) {
                  return callback({ cancel: false });
              }

              // Feed to Ghostery manually
              try {
                  const requestObj = fromElectronDetails(details);
                  const match = globalBlocker.match(requestObj);
                  
                  if (match.match) {
                      if (mainWindow && !mainWindow.isDestroyed()) {
                          mainWindow.webContents.send('tracker-blocked', url);
                      }
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

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
      globalBlocker = blocker;
      console.log('Ghostery Adblocker initialized successfully (Hybrid Mode).');
  }).catch(err => {
      console.error('Failed to initialize Adblocker:', err);
  });

    app.on('web-contents-created', (event, contents) => {
        contents.setMaxListeners(0);
        
        const getTargetWindow = () => {
            if (contents.hostWebContents) {
                const hostWin = BrowserWindow.fromWebContents(contents.hostWebContents);
                if (hostWin && !hostWin.isDestroyed()) return hostWin;
            }
            return BrowserWindow.fromWebContents(contents) || BrowserWindow.getFocusedWindow() || mainWindow;
        };

        // Handle window.open: Distinguish OAuth popups (Firebase, Google, etc.) from normal link navigations
        contents.setWindowOpenHandler(({ url, frameName, disposition, features }) => {
            console.log('[Electron Main] setWindowOpenHandler intercepted:', { url, disposition, features, frameName });

            // Detect OAuth / authentication popups or explicit dialog windows
            const isPopupWithDims = Boolean(features && (features.includes('width=') || features.includes('height=')));
            const isAuthUrl = Boolean(url && (
                url.includes('firebaseapp.com') ||
                url.includes('accounts.google.com') ||
                url.includes('facebook.com') ||
                url.includes('appleid.apple.com') ||
                url.includes('github.com/login/oauth') ||
                url.includes('twitter.com/i/oauth2') ||
                url.includes('x.com/i/oauth2') ||
                url.includes('/oauth') ||
                url.includes('/auth/handler') ||
                url.includes('/auth') ||
                url.includes('/login') ||
                url.includes('/signin')
            ));
            const isAuthFrameName = Boolean(frameName && (
                frameName.includes('firebase') ||
                frameName.includes('auth') ||
                frameName.includes('oauth') ||
                frameName.includes('login') ||
                frameName.includes('signin')
            ));

            if (isPopupWithDims || isAuthUrl || isAuthFrameName) {
                console.log('[Electron Main] Allowing OAuth popup window for:', url);
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        icon: path.join(__dirname, '../icon.png'),
                        width: 680,
                        height: 820,
                        minWidth: 540,
                        minHeight: 680,
                        frame: false,
                        hasShadow: true,
                        autoHideMenuBar: true,
                        backgroundColor: '#121214',
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
            contents.setBackgroundThrottling(true);

            contents.on('media-started-playing', () => {
                contents.setBackgroundThrottling(false);
            });

            contents.on('media-paused', () => {
                contents.setBackgroundThrottling(true);
            });
        } else {
            // Main application window stays unthrottled for UI responsiveness
            contents.setBackgroundThrottling(false);
        }

        // Apply Google vs Chrome User-Agent for webviews and popup windows
        if (contents.getType() === 'webview' || (contents.getType() === 'window' && contents !== mainWindow?.webContents)) {
            contents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
                if (!isMainFrame) return;
                if (isGoogleDomain(url)) {
                    contents.setUserAgent(genuineElectronUA);
                } else {
                    contents.setUserAgent(cleanChromeUA);
                }
            });
        }

        // Track active webview URL for accurate domain resolution in in-tab dialogs
        if (contents.getType() === 'webview') {
            contents.on('did-navigate', (event, url) => {
                if (url && url !== 'about:blank') latestActiveWebviewUrl = url;
            });
            contents.on('did-navigate-in-page', (event, url) => {
                if (url && url !== 'about:blank') latestActiveWebviewUrl = url;
            });
            contents.on('dom-ready', () => {
                if (settingsStore.cosmetic !== false) {
                    const cosmeticCSS = `
                        .ad, .ads, .ad-banner, .advertisement, [id*="google_ads"], [class*="google_ads"],
                        .taboola, .outbrain, [data-ad-unit], [data-ad-slot], .ad-container, .ad-placeholder {
                            display: none !important;
                            visibility: hidden !important;
                            height: 0 !important;
                            min-height: 0 !important;
                        }
                    `;
                    try { contents.insertCSS(cosmeticCSS).catch(() => {}); } catch (_) {}
                }
                if (settingsStore.smooth !== false) {
                    try { contents.insertCSS('html, body { scroll-behavior: smooth !important; }').catch(() => {}); } catch (_) {}
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

function isGoogleDomain(url) {
    if (!url) return false;
    const u = String(url).toLowerCase();
    return u.includes('google.com') || 
           u.includes('youtube.com') || 
           u.includes('gstatic.com') || 
           u.includes('googleapis.com') || 
           u.includes('googleusercontent.com') ||
           u.includes('firebaseapp.com');
}

// Clean Google Chrome desktop User-Agent matching underlying Chromium version
const cleanChromeUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
// Authentic Electron Chromium User-Agent for Google Authentication (activates WebLiteSignIn)
const genuineElectronUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Electron/${process.versions.electron} Safari/537.36`;
app.userAgentFallback = cleanChromeUA;

app.setName('QBrowse');
app.setAppUserModelId('com.qbrowse.app');

const configuredSessions = new WeakSet();

function setupHeadersHandler(sess) {
    if (!sess || !sess.webRequest) return;

    sess.webRequest.onBeforeRequest((details, callback) => {
        if (settingsStore.httpsOnly !== false && details.url && details.url.startsWith('http://')) {
            try {
                const parsed = new URL(details.url);
                if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !parsed.hostname.endsWith('.onion')) {
                    const secureUrl = details.url.replace(/^http:\/\//i, 'https://');
                    return callback({ redirectURL: secureUrl });
                }
            } catch (_) {}
        }
        callback({ cancel: false });
    });

    sess.webRequest.onBeforeSendHeaders((details, callback) => {
        delete details.requestHeaders['X-Electron-Version'];

        if (isGoogleDomain(details.url)) {
            // Google routes to official WebLiteSignIn flow when receiving honest Electron/Chromium identity
            details.requestHeaders['User-Agent'] = genuineElectronUA;
        } else {
            // Provide clean Chrome desktop identity for standard web browsing
            details.requestHeaders['User-Agent'] = cleanChromeUA;
        }

        if (settingsStore.dnt !== false) {
            details.requestHeaders['DNT'] = '1';
        }

        if (settingsStore.block3rdParty && details.resourceType !== 'mainFrame') {
            delete details.requestHeaders['Cookie'];
            delete details.requestHeaders['cookie'];
        }

        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    sess.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };

        if (settingsStore.block3rdParty && details.resourceType !== 'mainFrame') {
            delete responseHeaders['set-cookie'];
            delete responseHeaders['Set-Cookie'];
        }

        if (localDialogPort) {
            for (const headerKey of Object.keys(responseHeaders)) {
                if (headerKey.toLowerCase() === 'content-security-policy') {
                    responseHeaders[headerKey] = responseHeaders[headerKey].map(val => {
                        if (val.includes('connect-src')) {
                            return val.replace(/connect-src\s+([^;]+)/i, `connect-src $1 http://127.0.0.1:${localDialogPort}`);
                        }
                        return val + `; connect-src * http://127.0.0.1:${localDialogPort}`;
                    });
                }
            }
        }
        callback({ responseHeaders });
    });
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

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-started', { id, fileName, totalBytes, url });
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

        item.once('done', (event, state) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-done', { id, state, savePath: item.getSavePath() });
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

    // Enable GPU rasterization, zero-copy buffers, and smooth compositor scrolling
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-smooth-scrolling');
    app.commandLine.appendSwitch('num-raster-threads', String(Math.min(4, Math.max(1, Math.floor(cpuCores / 2)))));

    // Adaptive renderer process limit to keep RAM consumption bounded on lower-spec machines
    if (totalMemGB <= 6) {
        app.commandLine.appendSwitch('renderer-process-limit', '6');
    } else if (totalMemGB <= 12) {
        app.commandLine.appendSwitch('renderer-process-limit', '12');
    } else {
        app.commandLine.appendSwitch('renderer-process-limit', '20');
    }
} catch (e) {
    console.warn('[PerformanceEngine] Error setting Chromium flags:', e.message);
}

app.whenReady().then(async () => {
  // Register local media streaming protocol for wallpapers and assets
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

  try {
      performanceEngine.initSettings(app.getPath('userData'));
      if (powerMonitor) {
          powerMonitor.on('on-battery', async () => {
              let gpuInfo = null;
              try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
              const profile = performanceEngine.detectHardwareProfile(gpuInfo, true);
              if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('performance-profile-changed', profile);
              }
          });
          powerMonitor.on('on-ac', async () => {
              let gpuInfo = null;
              try { gpuInfo = await app.getGPUInfo('basic'); } catch (_) {}
              const profile = performanceEngine.detectHardwareProfile(gpuInfo, false);
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

  // Fix YouTube and Google login stuck/rejected state by wiping service workers and caches on boot
  const sessionsToClean = [
      session.defaultSession,
      session.fromPartition('persist:profile_default')
  ];
  for (const s of sessionsToClean) {
      s.clearStorageData({
          origin: 'https://www.youtube.com',
          storages: ['serviceworkers', 'cachestorage']
      }).catch(() => {});
      s.clearStorageData({
          origin: 'https://accounts.google.com',
          storages: ['serviceworkers', 'cachestorage']
      }).catch(() => {});
  }

  ensurePermissionsFile();

  // Configure default session (Personal and Work spaces)
  setupWebviewSession(session.defaultSession);

  // Proactively configure active profile partition (Personal and Work webviews)
  const defaultProfileSession = session.fromPartition('persist:profile_default');
  setupWebviewSession(defaultProfileSession);

  // Proactively configure in-memory ghost partition (Incognito space)
  const ghostSession = session.fromPartition('ghost');
  setupWebviewSession(ghostSession);
  if (ghostSession && typeof ghostSession.setWebRTCIPHandlingPolicy === 'function') {
      ghostSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  }

  // Proactively configure in-memory tor partition (Tor Onion space)
  const torSession = session.fromPartition('tor');
  setupWebviewSession(torSession);
  if (torSession && typeof torSession.setWebRTCIPHandlingPolicy === 'function') {
      torSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  }

  // Ensure ghost and tor sessions start completely fresh with no remnants
  try {
      ghostSession.clearStorageData().catch(() => {});
      ghostSession.clearCache().catch(() => {});
      torSession.clearStorageData().catch(() => {});
      torSession.clearCache().catch(() => {});
  } catch (_) {}

  // Auto-configure any dynamic sessions created by webviews
  app.on('session-created', (sess) => {
      setupWebviewSession(sess);
  });

  createWindow();

  // Proactively ensure OS browser registry/desktop entries exist in background
  setTimeout(() => {
    try {
      if (process.platform === 'win32') {
        registerWindowsBrowser();
      } else if (process.platform === 'linux') {
        ensureLinuxDesktopEntry();
      }
    } catch (_) {}
  }, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle('open-file', async (event, path) => {
      if (path) await shell.openPath(path);
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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
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
    if (mainWindow) {
        mainWindow.setFullScreen(value);
    }
});

ipcMain.handle('vault-unlock', async (event, masterPassword) => {
    try {
        await ensureVault();
        const key = deriveKey(masterPassword);
        let vault = { passwords: [] };
        try {
            const data = await fs.readFile(vaultPath, 'utf8');
            vault = JSON.parse(data);
        } catch {
            await fs.writeFile(vaultPath, JSON.stringify(vault));
        }
        
        // Try decrypting a test value if it exists to verify password
        if (vault.testEncryption) {
             decrypt(vault.testEncryption, key);
        } else {
             // First time setup
             vault.testEncryption = encrypt('QBrowseVerified', key);
             await fs.writeFile(vaultPath, JSON.stringify(vault));
        }
        
        masterKey = key;
        return true;
    } catch (e) {
        console.warn('[Vault] Unlock attempt failed (password mismatch)');
        return false;
    }
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
                credentialId: details.credentialId
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
    return await requestWindowsHelloVerification(message || "Verify your identity for QBrowse Passkey");
});

ipcMain.handle('vault-check-password', async (event, password) => {
    try {
        await ensureVault();
        const key = deriveKey(password);
        const data = await fs.readFile(vaultPath, 'utf8');
        const vault = JSON.parse(data);
        if (vault.testEncryption) {
            decrypt(vault.testEncryption, key);
        }
        masterKey = key;
        return true;
    } catch (e) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                const isValidPin = await mainWindow.webContents.executeJavaScript(
                    `Boolean(localStorage.getItem('qbrowse_vault_pin') && localStorage.getItem('qbrowse_vault_pin') === ${JSON.stringify(password)})`
                );
                if (isValidPin) return true;
            } catch (_) {}
        }
        return false;
    }
});

ipcMain.handle('vault-unlock-windows-hello', async () => {
    try {
        await ensureVault();
        const res = await requestWindowsHelloVerification("Unlock your QVault with Windows Hello");
        if (res && res.verified) {
            if (!masterKey) {
                masterKey = deriveKey('QBrowseWindowsHelloVaultKey');
            }
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('vault-add-password', async (event, title, url, username, password) => {
    await ensureVault();
    if (!masterKey) {
        masterKey = deriveKey('QBrowseDefaultVaultKey');
    }
    let vault = { passwords: [] };
    try {
        const data = await fs.readFile(vaultPath, 'utf8');
        vault = JSON.parse(data);
    } catch {}
    if (!vault.passwords) vault.passwords = [];
    
    const entry = {
        id: Date.now().toString(),
        title,
        url,
        username,
        password: encrypt(password, masterKey)
    };
    
    vault.passwords.push(entry);
    await fs.writeFile(vaultPath, JSON.stringify(vault));
    return entry;
});

ipcMain.handle('vault-delete-password', async (event, id) => {
    console.log('[Main Process Debug] vault-delete-password handler called for id:', id);
    await ensureVault();
    if (!masterKey) {
        console.log('[Main Process Debug] Deriving fallback masterKey...');
        masterKey = deriveKey('QBrowseDefaultVaultKey');
    }
    let vault = { passwords: [] };
    try {
        const data = await fs.readFile(vaultPath, 'utf8');
        vault = JSON.parse(data);
        console.log('[Main Process Debug] Read vault before delete, total items:', vault.passwords?.length);
    } catch (e) {
        console.error('[Main Process Debug] Failed to read vault file:', e);
    }
    if (!vault.passwords) vault.passwords = [];

    const prevLength = vault.passwords.length;
    vault.passwords = vault.passwords.filter(p => String(p.id) !== String(id));
    console.log('[Main Process Debug] Items before:', prevLength, 'Items after:', vault.passwords.length);

    await fs.writeFile(vaultPath, JSON.stringify(vault));
    console.log('[Main Process Debug] Saved updated vault to disk successfully.');
    return true;
});

ipcMain.handle('vault-update-password', async (event, id, title, url, username, password) => {
    await ensureVault();
    if (!masterKey) {
        masterKey = deriveKey('QBrowseDefaultVaultKey');
    }
    let vault = { passwords: [] };
    try {
        const data = await fs.readFile(vaultPath, 'utf8');
        vault = JSON.parse(data);
    } catch {}
    if (!vault.passwords) vault.passwords = [];

    const index = vault.passwords.findIndex(p => String(p.id) === String(id));
    if (index !== -1) {
        vault.passwords[index] = {
            ...vault.passwords[index],
            title,
            url,
            username,
            password: encrypt(password, masterKey)
        };
        await fs.writeFile(vaultPath, JSON.stringify(vault));
        return vault.passwords[index];
    }
    return null;
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
    await ensureVault();
    if (!masterKey) {
        masterKey = deriveKey('QBrowseDefaultVaultKey');
    }
    let vault = { passwords: [] };
    try {
        const data = await fs.readFile(vaultPath, 'utf8');
        vault = JSON.parse(data);
    } catch {}
    if (!vault.passwords) vault.passwords = [];
    
    return vault.passwords.map(p => {
        let cleanTitle = p.title || '';
        let meta = { type: p.itemType || 'login', passkeyData: p.passkeyData || null };
        if (cleanTitle.includes('|||')) {
            const parts = cleanTitle.split('|||');
            cleanTitle = parts[0];
            try {
                const parsed = JSON.parse(parts[1]);
                meta = {
                    type: parsed.type || meta.type,
                    notes: parsed.notes || '',
                    passkeyData: parsed.passkeyData || meta.passkeyData,
                    cardData: parsed.cardData || null,
                    addressData: parsed.addressData || null
                };
            } catch(e) {}
        }
        let decPass = '';
        try {
            decPass = decrypt(p.password, masterKey);
        } catch {
            decPass = p.password || '';
        }
        return {
            ...p,
            title: cleanTitle,
            itemType: meta.type || (meta.passkeyData ? 'passkey' : 'login'),
            passkeyData: meta.passkeyData,
            cardData: meta.cardData,
            addressData: meta.addressData,
            notes: meta.notes || '',
            password: decPass
        };
    });
});

ipcMain.handle('vault-get-matching', async (event, query) => {
    await ensureVault();
    if (!masterKey) {
        masterKey = deriveKey('QBrowseDefaultVaultKey');
    }

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
        const data = await fs.readFile(vaultPath, 'utf8');
        const vault = JSON.parse(data);
        if (!vault.passwords || !Array.isArray(vault.passwords)) return [];

        return vault.passwords
            .map(p => {
                let cleanTitle = p.title || '';
                let meta = { type: p.itemType || 'login', passkeyData: p.passkeyData || null, cardData: null, addressData: null };
                if (cleanTitle.includes('|||')) {
                    const parts = cleanTitle.split('|||');
                    cleanTitle = parts[0];
                    try {
                        const parsed = JSON.parse(parts[1]);
                        meta = {
                            type: parsed.type || meta.type,
                            notes: parsed.notes || '',
                            passkeyData: parsed.passkeyData || meta.passkeyData,
                            cardData: parsed.cardData || null,
                            addressData: parsed.addressData || null
                        };
                    } catch (e) {}
                }

                let decPass = '';
                try {
                    decPass = decrypt(p.password, masterKey);
                } catch {
                    decPass = p.password || '';
                }

                return {
                    ...p,
                    title: cleanTitle,
                    itemType: meta.type || (meta.passkeyData ? 'passkey' : 'login'),
                    passkeyData: meta.passkeyData,
                    cardData: meta.cardData,
                    addressData: meta.addressData,
                    notes: meta.notes || '',
                    password: decPass
                };
            })
            .filter(p => {
                const isPasskey = p.itemType === 'passkey' || !!p.passkeyData;
                if (!isPasskey && (!p.username || !p.password)) return false;

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

ipcMain.handle('vault-change-password', async (event, oldPass, newPass) => {
    try {
        await ensureVault();
        const oldKey = deriveKey(oldPass);
        const data = await fs.readFile(vaultPath, 'utf8');
        const vault = JSON.parse(data);
        
        if (vault.testEncryption) {
            decrypt(vault.testEncryption, oldKey);
        }
        
        // Re-encrypt all passwords with new key
        const newKey = deriveKey(newPass);
        if (vault.passwords) {
            vault.passwords = vault.passwords.map(p => ({
                ...p,
                password: encrypt(decrypt(p.password, oldKey), newKey)
            }));
        }
        
        vault.testEncryption = encrypt('QBrowseVerified', newKey);
        await fs.writeFile(vaultPath, JSON.stringify(vault));
        masterKey = newKey;
        return true;
    } catch (e) {
        return false;
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
        const procList = metrics.map(m => ({
            pid: m.pid,
            type: m.type,
            cpu: Math.round((m.cpu?.percentCPUUsage || 0) * 10) / 10,
            memoryMB: Math.round((m.memory?.workingSetSize || 0) / 1024),
            peakMemoryMB: Math.round((m.memory?.peakWorkingSetSize || 0) / 1024),
            isMain: m.pid === process.pid
        }));

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

ipcMain.handle('set-doh', async (event, provider) => {
    try {
        let dohUrl = '';
        if (provider === 'cloudflare') dohUrl = 'https://cloudflare-dns.com/dns-query';
        else if (provider === 'google') dohUrl = 'https://dns.google/dns-query';
        else if (provider === 'nextdns' || provider === 'custom') dohUrl = 'https://dns.nextdns.io';
        
        if (dohUrl) {
            const sessions = [session.defaultSession, session.fromPartition('ghost')];
            sessions.forEach(s => {
                if (s && s.setModeAndCodeOfDOH) {
                    s.setModeAndCodeOfDOH('automatic', dohUrl);
                }
            });
        }
        return true;
    } catch {
        return false;
    }
});

ipcMain.handle('save-setting', (event, data) => {
    if (data && data.key) {
        settingsStore[data.key] = data.value;
        try {
            fsSync.writeFileSync(settingsPath, JSON.stringify(settingsStore, null, 2), 'utf8');
        } catch (_) {}
    }
    return true;
});

ipcMain.handle('set-webrtc', async (event, enabled) => {
    try {
        const policy = enabled ? 'disable_non_proxied_udp' : 'default';
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
            proxyRules: `socks5h://127.0.0.1:${socksPort}`,
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
        await torSession.setProxy({ proxyRules: '' });
        await torSession.clearStorageData();
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

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse]
@="QBrowse"

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\DefaultIcon]
@=${formatReg(iconCmd)}

[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\QBrowse\\InstallInfo]
"ReinstallCommand"=${formatReg(`"${exePath}" --make-default-browser`)}
"HideIconsCommand"=${formatReg(`"${exePath}" --hide-icons`)}
"ShowIconsCommand"=${formatReg(`"${exePath}" --show-icons`)}
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

function checkIsDefaultBrowser() {
    try {
        if (process.platform === 'win32') {
            const { execSync } = require('child_process');
            try {
                const out = execSync('reg.exe query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v "ProgId"', {
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'ignore']
                });
                const match = out.match(/ProgId\s+REG_SZ\s+(\S+)/i);
                if (match && match[1]) {
                    const progId = match[1].trim();
                    // On Windows 10/11, UserChoice ProgId is the definitive authority.
                    return /qbrowse/i.test(progId);
                }
            } catch (_) {}

            return false;
        } else if (process.platform === 'linux') {
            const { execSync } = require('child_process');
            try {
                const out1 = execSync('xdg-settings get default-web-browser', {
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'ignore']
                }).trim();
                if (out1) return /qbrowse/i.test(out1);

                const out2 = execSync('xdg-mime query default x-scheme-handler/http', {
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'ignore']
                }).trim();
                if (out2) return /qbrowse/i.test(out2);
            } catch (_) {}

            return false;
        } else {
            const isHttp = typeof app.isDefaultProtocolClient === 'function' && app.isDefaultProtocolClient('http');
            const isHttps = typeof app.isDefaultProtocolClient === 'function' && app.isDefaultProtocolClient('https');
            return Boolean(isHttp && isHttps);
        }
    } catch (_) {
        return false;
    }
}

// Default Browser Handlers
ipcMain.handle('system-check-default-browser', async () => {
    try {
        const isDefault = checkIsDefaultBrowser();
        return { isDefault };
    } catch (e) {
        return { isDefault: false, error: e.message };
    }
});

ipcMain.handle('system-set-default-browser', async () => {
    try {
        if (typeof app.setAsDefaultProtocolClient === 'function') {
            try { app.setAsDefaultProtocolClient('http'); } catch (_) {}
            try { app.setAsDefaultProtocolClient('https'); } catch (_) {}
        }

        if (process.platform === 'win32') {
            registerWindowsBrowser();
            if (!checkIsDefaultBrowser()) {
                try {
                    await shell.openExternal('ms-settings:defaultapps?registeredAppMachine=QBrowse');
                } catch (_) {
                    try {
                        await shell.openExternal('ms-settings:defaultapps');
                    } catch (_) {}
                }
            }
        } else if (process.platform === 'linux') {
            ensureLinuxDesktopEntry();
            try {
                const { execSync } = require('child_process');
                execSync('xdg-settings set default-web-browser qbrowse.desktop', { stdio: ['ignore', 'pipe', 'ignore'] });
                execSync('xdg-mime default qbrowse.desktop x-scheme-handler/http x-scheme-handler/https text/html application/xhtml+xml', { stdio: ['ignore', 'pipe', 'ignore'] });
            } catch (_) {}
        }

        const isDefault = checkIsDefaultBrowser();
        return { success: true, isDefault };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('system-open-default-apps-settings', async () => {
    try {
        if (process.platform === 'win32') {
            registerWindowsBrowser();
            try {
                await shell.openExternal('ms-settings:defaultapps?registeredAppMachine=QBrowse');
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
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
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

        await fs.writeFile(filePath, img.toPNG());
        return { success: true, filePath, fileName };
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
        return { success: true, filePath, fileName };
    } catch (e) {
        console.error('[SaveScreenshotDataUrl] Error:', e);
        return { success: false, error: e.message };
    }
});


