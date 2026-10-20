const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Platform & Hardware Specs
    platform: process.platform,
    getHardwareSpecs: () => ipcRenderer.invoke('get-hardware-specs'),
    
    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    setFullscreen: (state) => ipcRenderer.send('window-set-fullscreen', state),
    close: () => ipcRenderer.send('window-close'),
    openDevTools: () => ipcRenderer.send('open-devtools'),
    fetchSuggestions: (query) => ipcRenderer.invoke('fetch-suggestions', query),

    // Clipboard & External
    readClipboardText: () => ipcRenderer.invoke('read-clipboard-text'),
    writeClipboardText: (text) => ipcRenderer.invoke('write-clipboard-text', text),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    openAppProtocol: (protocolUrl, fallbackUrl) => {
        if (typeof protocolUrl === 'object' && protocolUrl !== null) {
            return ipcRenderer.invoke('open-app-protocol', protocolUrl);
        }
        return ipcRenderer.invoke('open-app-protocol', { protocolUrl, fallbackUrl });
    },
    isAppProtocol: (url) => {
        if (!url || typeof url !== 'string' || /[\r\n\0]/.test(url)) return false;
        const match = url.trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
        if (!match) return false;
        const proto = match[1].toLowerCase() + ':';
        const internal = ['http:', 'https:', 'qbrowse:', 'about:', 'chrome:', 'data:', 'blob:', 'javascript:', 'file:', 'ws:', 'wss:'];
        const dangerous = ['file:', 'javascript:', 'data:', 'vbscript:', 'powershell:', 'cmd:', 'ms-msdt:', 'search-ms:', 'shell:', 'disk:', 'con:', 'prn:', 'aux:', 'nul:'];
        return !internal.includes(proto) && !dangerous.includes(proto);
    },
    onAppProtocolLaunched: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('app-protocol-launched', handler);
        return () => ipcRenderer.removeListener('app-protocol-launched', handler);
    },
    openWithDialog: (url) => ipcRenderer.invoke('open-with-dialog', url),

    // Vault
    unlockVault: (password) => ipcRenderer.invoke('vault-unlock', password),
    unlockVaultWindowsHello: () => ipcRenderer.invoke('vault-unlock-windows-hello'),
    addPassword: (title, url, username, password) => ipcRenderer.invoke('vault-add-password', title, url, username, password),
    deletePassword: (id) => ipcRenderer.invoke('vault-delete-password', id),
    updatePassword: (id, title, url, username, password) => ipcRenderer.invoke('vault-update-password', id, title, url, username, password),
    getPasswords: () => ipcRenderer.invoke('vault-get-passwords'),
    getMatchingCredentials: (hostname) => ipcRenderer.invoke('vault-get-matching', hostname),
    changeMasterPassword: (oldPass, newPass) => ipcRenderer.invoke('vault-change-password', oldPass, newPass),
    checkVaultPassword: (password) => ipcRenderer.invoke('vault-check-password', password),
    verifyWindowsHello: (message) => ipcRenderer.invoke('verify-windows-hello', message),
    respondPasskeyVerification: (requestId, verified) => ipcRenderer.invoke('respond-passkey-verification', { requestId, verified }),
    lockVault: () => ipcRenderer.invoke('vault-lock'),
    getVaultStatus: () => ipcRenderer.invoke('vault-get-status'),
    setupVaultPin: (pin, masterPassword) => ipcRenderer.invoke('vault-setup-pin', { pin, masterPassword }),
    unlockVaultWithPin: (pin) => ipcRenderer.invoke('vault-unlock-pin', pin),
    removeVaultPin: () => ipcRenderer.invoke('vault-remove-pin'),
    setupVaultWindowsHello: (enable, masterPassword) => ipcRenderer.invoke('vault-setup-windows-hello', { enable, masterPassword }),
    resetVault: () => ipcRenderer.invoke('vault-reset'),
    wrapSyncSecret: (secret) => ipcRenderer.invoke('vault-wrap-sync-secret', secret),
    unwrapSyncSecret: (wrapped) => ipcRenderer.invoke('vault-unwrap-sync-secret', wrapped),
    onPasskeyPrompt: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('prompt-passkey-verification', handler);
        return () => ipcRenderer.removeListener('prompt-passkey-verification', handler);
    },

    // Local AI & llama.cpp
    startLocalAi: () => ipcRenderer.invoke('start-local-ai'),
    startAiServer: (options) => ipcRenderer.invoke('ai-start-server', options),
    stopAiServer: () => ipcRenderer.invoke('ai-stop-server'),
    getAiStatus: () => ipcRenderer.invoke('ai-get-status'),
    getAiLogs: () => ipcRenderer.invoke('ai-get-logs'),
    pickAiModelFile: () => ipcRenderer.invoke('ai-pick-model-file'),
    downloadAiModel: (options) => ipcRenderer.invoke('ai-download-model', options),
    cancelAiDownload: () => ipcRenderer.invoke('ai-cancel-download'),
    sendAiQuery: (options) => ipcRenderer.invoke('ai-generate-completion', options),
    parseFile: (filePath) => ipcRenderer.invoke('ai-parse-file', filePath),
    webSearch: (query) => ipcRenderer.invoke('ai-web-search', query),
    onAiLog: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('ai-log-event', handler);
        return () => ipcRenderer.removeListener('ai-log-event', handler);
    },
    onAiStatus: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('ai-status-event', handler);
        return () => ipcRenderer.removeListener('ai-status-event', handler);
    },
    onAiDownloadProgress: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('ai-download-progress', handler);
        return () => ipcRenderer.removeListener('ai-download-progress', handler);
    },
    onAiStreamToken: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('ai-stream-token', handler);
        return () => ipcRenderer.removeListener('ai-stream-token', handler);
    },
    onAiStreamDone: (callback) => {
        const handler = (event) => callback();
        ipcRenderer.on('ai-stream-done', handler);
        return () => ipcRenderer.removeListener('ai-stream-done', handler);
    },
    fetchSuggestions: (query) => ipcRenderer.invoke('fetch-suggestions', query),
    setFullscreen: (value) => ipcRenderer.send('set-fullscreen', value),
    setWebviewColorScheme: (webContentsId, colorScheme) => ipcRenderer.send('set-webview-color-scheme', { webContentsId, colorScheme }),
    getHistoryUrl: (webContentsId, offset) => ipcRenderer.invoke('get-webview-history-url', { webContentsId, offset }),

    onOpenNewTab: (callback) => {
        ipcRenderer.removeAllListeners('open-new-tab-url');
        ipcRenderer.on('open-new-tab-url', (event, data) => callback(data));
    },

    // HTTP Basic & Proxy Authentication
    onHttpAuthRequest: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('qbrowse-http-auth-request', handler);
        return () => ipcRenderer.removeListener('qbrowse-http-auth-request', handler);
    },
    respondHttpAuth: (data) => ipcRenderer.send('qbrowse-http-auth-response', data),

    // In-Tab JavaScript Dialogs (Alert, Confirm, Prompt)
    onJsDialog: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('qbrowse-js-dialog-open', handler);
        return () => ipcRenderer.removeListener('qbrowse-js-dialog-open', handler);
    },
    onJsDialogDismiss: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('qbrowse-js-dialog-dismiss', handler);
        return () => ipcRenderer.removeListener('qbrowse-js-dialog-dismiss', handler);
    },
    respondJsDialog: (data) => ipcRenderer.send('qbrowse-js-dialog-close', data),

    // Shortcuts
    onGlobalShortcut: (callback) => {
        ipcRenderer.removeAllListeners('global-shortcut');
        ipcRenderer.on('global-shortcut', (event, data) => callback(data));
    },
    onGlobalKeyUp: (callback) => {
        ipcRenderer.removeAllListeners('global-keyup');
        ipcRenderer.on('global-keyup', (event, data) => callback(data));
    },

    // Adblocker
    setAdblock: (active) => ipcRenderer.send('set-adblock', active),
    updateAdblockFilters: () => ipcRenderer.invoke('update-adblock-filters'),
    onTrackerBlocked: (callback) => ipcRenderer.on('tracker-blocked', (event, url) => callback(url)),

    // Downloads
    onDownloadStarted: (callback) => {
        ipcRenderer.removeAllListeners('download-started');
        ipcRenderer.on('download-started', (event, data) => callback(data));
    },
    onDownloadUpdated: (callback) => {
        ipcRenderer.removeAllListeners('download-updated');
        ipcRenderer.on('download-updated', (event, data) => callback(data));
    },
    onDownloadDone: (callback) => {
        ipcRenderer.removeAllListeners('download-done');
        ipcRenderer.on('download-done', (event, data) => callback(data));
    },
    openFile: (path) => ipcRenderer.invoke('open-file', path),
    showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
    verifyDownloadFile: (filePath) => ipcRenderer.invoke('verify-download-file', filePath),
    compareDownloadChecksum: (data) => ipcRenderer.invoke('compare-download-checksum', data),
    getFileChecksum: (data) => ipcRenderer.invoke('get-file-checksum', data),
    deleteDownloadFile: (filePath) => ipcRenderer.invoke('delete-download-file', filePath),

    // Navigation Shortcuts / Mouse 4 and 5
    onGlobalNavigateBack: (callback) => ipcRenderer.on('global-navigate-back', callback),
    onGlobalNavigateForward: (callback) => ipcRenderer.on('global-navigate-forward', callback),

    // Cookies & Site Settings
    getCookies: (filter) => ipcRenderer.invoke('get-cookies', filter),
    removeCookie: (url, name) => ipcRenderer.invoke('remove-cookie', url, name),
    clearSiteCookies: (domain) => ipcRenderer.invoke('clear-site-cookies', domain),
    clearAllData: (options) => ipcRenderer.invoke('clear-all-data', options),
    clearGhostSession: () => ipcRenderer.invoke('clear-ghost-session'),
    clearTorSession: () => ipcRenderer.invoke('clear-tor-session'),
    getSitePermissions: (domain) => ipcRenderer.invoke('get-site-permissions', domain),
    setSitePermission: (domain, permission, value) => ipcRenderer.invoke('set-site-permission', domain, permission, value),
    getAllSitePermissions: () => ipcRenderer.invoke('get-all-site-permissions'),
    resetSitePermissions: (domain) => ipcRenderer.invoke('reset-site-permissions', domain),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    setDoh: (config) => ipcRenderer.invoke('set-doh', config),
    testDns: (endpoint) => ipcRenderer.invoke('test-dns', endpoint),
    setWebRTC: (enabled) => ipcRenderer.invoke('set-webrtc', enabled),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSetting: (key, value) => ipcRenderer.invoke('save-setting', { key, value }),
    syncSmartDarkState: (state) => ipcRenderer.send('sync-smart-dark-state', state),
    getAppMetrics: () => ipcRenderer.invoke('get-app-metrics'),
    killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
    openNewWindow: (options) => ipcRenderer.invoke('open-new-window', options),
    closeCurrentWindow: () => ipcRenderer.invoke('close-current-window'),

    // Tor Engine & HUD
    torGetStatus: () => ipcRenderer.invoke('tor-get-status'),
    torStart: () => ipcRenderer.invoke('tor-start'),
    torStop: () => ipcRenderer.invoke('tor-stop'),
    torNewCircuit: () => ipcRenderer.invoke('tor-new-circuit'),
    torCheckIp: () => ipcRenderer.invoke('tor-check-ip'),
    torGetCircuit: () => ipcRenderer.invoke('tor-get-circuit'),
    torDownloadBinary: () => ipcRenderer.invoke('tor-download-binary'),
    torSetSecurityLevel: (level) => ipcRenderer.invoke('tor-set-security', level),
    onTorStatus: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('tor-status-changed', handler);
        return () => ipcRenderer.removeListener('tor-status-changed', handler);
    },
    onTorBootstrap: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('tor-bootstrap-progress', handler);
        return () => ipcRenderer.removeListener('tor-bootstrap-progress', handler);
    },
    onTorDownloadProgress: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('tor-download-progress', handler);
        return () => ipcRenderer.removeListener('tor-download-progress', handler);
    },

    // Default Browser & External URLs
    checkDefaultBrowser: (options) => ipcRenderer.invoke('system-check-default-browser', options),
    setDefaultBrowser: () => ipcRenderer.invoke('system-set-default-browser'),
    openDefaultAppsSettings: () => ipcRenderer.invoke('system-open-default-apps-settings'),
    getInitialLaunchUrl: () => ipcRenderer.invoke('get-initial-launch-url'),
    onOpenUrl: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('open-new-tab-url', handler);
        return () => ipcRenderer.removeListener('open-new-tab-url', handler);
    },

    // Experimental Flags & Relaunch
    getFlags: () => ipcRenderer.invoke('flags-get'),
    setFlag: (id, val) => ipcRenderer.invoke('flags-set', { id, val }),
    resetFlags: () => ipcRenderer.invoke('flags-reset'),
    relaunchApp: () => ipcRenderer.invoke('app-relaunch'),

    // PDF Export
    savePdfFile: (opts) => ipcRenderer.invoke('save-pdf-file', opts),

    // Screenshot & Snipping
    captureAndSave: (opts) => ipcRenderer.invoke('capture-and-save', opts),
    captureSliceDataUrl: (opts) => ipcRenderer.invoke('capture-slice-dataurl', opts),
    saveScreenshotDataUrl: (opts) => ipcRenderer.invoke('save-screenshot-dataurl', opts),
    copyImageToClipboard: (filePath) => ipcRenderer.invoke('copy-image-to-clipboard', filePath),
    allowInsecureHost: (hostname) => ipcRenderer.invoke('allow-insecure-host', hostname),

    // Performance & Hardware Profiling
    getHardwareProfile: () => ipcRenderer.invoke('system-get-hardware-profile'),
    getPerformanceSettings: () => ipcRenderer.invoke('system-get-performance-settings'),
    setPerformanceSettings: (settings) => ipcRenderer.invoke('system-set-performance-settings', settings),
    onPerformanceProfileChanged: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('performance-profile-changed', handler);
        return () => ipcRenderer.removeListener('performance-profile-changed', handler);
    },
    onDisplayMetricsChanged: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('display-metrics-changed', handler);
        return () => ipcRenderer.removeListener('display-metrics-changed', handler);
    },

    // Custom Wallpaper & Background
    importWallpaperFile: () => ipcRenderer.invoke('wallpaper-import-file'),
    importWallpaperUrl: (url) => ipcRenderer.invoke('wallpaper-import-url', url),
    getActiveWallpaper: () => ipcRenderer.invoke('wallpaper-get-active'),
    resetWallpaper: () => ipcRenderer.invoke('wallpaper-reset'),

    // Runtime Firebase Configuration (for production packaged installations like .deb / .exe)
    getFirebaseConfig: () => ipcRenderer.invoke('get-firebase-config'),
    getFirebaseConfigSync: () => ipcRenderer.sendSync('get-firebase-config-sync'),
    saveFirebaseConfig: (config) => ipcRenderer.invoke('save-firebase-config', config),

    // Local Files & Directory Browsing (file:// support)
    openFileDialog: (opts) => ipcRenderer.invoke('open-file-dialog', opts),
    listLocalDirectory: (path) => ipcRenderer.invoke('list-local-directory', path),
    autocompleteLocalPath: (query) => ipcRenderer.invoke('autocomplete-local-path', query),
    readLocalFileData: (path) => ipcRenderer.invoke('read-local-file-data', path),
    showInFolder: (path) => ipcRenderer.invoke('show-in-folder', path),
    openPath: (path) => ipcRenderer.invoke('open-path', path),

    // Browser Data & Bookmarks Migration
    detectBrowsersForImport: () => ipcRenderer.invoke('import-detect-browsers'),
    importBrowserBookmarks: (browserId) => ipcRenderer.invoke('import-browser-bookmarks', browserId),
    pickAndParseHtmlBookmarks: () => ipcRenderer.invoke('import-pick-html-bookmarks'),

    // Auto-Updater
    getUpdaterState: () => ipcRenderer.invoke('updater-get-state'),
    checkForUpdates: () => ipcRenderer.invoke('updater-check'),
    downloadUpdate: () => ipcRenderer.invoke('updater-download'),
    quitAndInstallUpdate: () => ipcRenderer.invoke('updater-quit-and-install'),
    onUpdaterEvent: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('updater-event', handler);
        return () => ipcRenderer.removeListener('updater-event', handler);
    },

    // Insecure & Certificate Bypass
    allowInsecureHost: (hostname) => ipcRenderer.invoke('allow-insecure-host', hostname)
});

