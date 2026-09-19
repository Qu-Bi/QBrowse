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

    // Clipboard
    readClipboardText: () => ipcRenderer.invoke('read-clipboard-text'),
    writeClipboardText: (text) => ipcRenderer.invoke('write-clipboard-text', text),

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

    onOpenNewTab: (callback) => {
        ipcRenderer.removeAllListeners('open-new-tab-url');
        ipcRenderer.on('open-new-tab-url', (event, data) => callback(data));
    },

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

    // Navigation Shortcuts / Mouse 4 and 5
    onGlobalNavigateBack: (callback) => ipcRenderer.on('global-navigate-back', callback),
    onGlobalNavigateForward: (callback) => ipcRenderer.on('global-navigate-forward', callback),

    // Cookies & Site Settings
    getCookies: (filter) => ipcRenderer.invoke('get-cookies', filter),
    removeCookie: (url, name) => ipcRenderer.invoke('remove-cookie', url, name),
    clearSiteCookies: (domain) => ipcRenderer.invoke('clear-site-cookies', domain),
    clearAllData: (options) => ipcRenderer.invoke('clear-all-data', options),
    clearGhostSession: () => ipcRenderer.invoke('clear-ghost-session'),
    getSitePermissions: (domain) => ipcRenderer.invoke('get-site-permissions', domain),
    setSitePermission: (domain, permission, value) => ipcRenderer.invoke('set-site-permission', domain, permission, value),
    getAllSitePermissions: () => ipcRenderer.invoke('get-all-site-permissions'),
    resetSitePermissions: (domain) => ipcRenderer.invoke('reset-site-permissions', domain),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    setDoh: (provider) => ipcRenderer.invoke('set-doh', provider),
    setWebRTC: (enabled) => ipcRenderer.invoke('set-webrtc', enabled),
    saveSetting: (key, value) => ipcRenderer.invoke('save-setting', { key, value }),
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
    checkDefaultBrowser: () => ipcRenderer.invoke('system-check-default-browser'),
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

    invoke: (channel, data) => ipcRenderer.invoke(channel, data)
});

