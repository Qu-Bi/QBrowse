const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    openDevTools: () => ipcRenderer.send('open-devtools'),
    fetchSuggestions: (query) => ipcRenderer.invoke('fetch-suggestions', query),

    // Vault
    unlockVault: (password) => ipcRenderer.invoke('vault-unlock', password),
    addPassword: (title, url, username, password) => ipcRenderer.invoke('vault-add-password', title, url, username, password),
    getPasswords: () => ipcRenderer.invoke('vault-get-passwords'),

    // Local AI
    startLocalAi: () => ipcRenderer.invoke('start-local-ai'),

    // Shortcuts
    onGlobalShortcut: (callback) => ipcRenderer.on('global-shortcut', (event, shortcut) => callback(shortcut)),

    // Adblocker
    setAdblock: (active) => ipcRenderer.send('set-adblock', active),
    onTrackerBlocked: (callback) => ipcRenderer.on('tracker-blocked', (event, url) => callback(url)),

    // Downloads
    onDownloadStarted: (callback) => ipcRenderer.on('download-started', (event, data) => callback(data)),
    onDownloadUpdated: (callback) => ipcRenderer.on('download-updated', (event, data) => callback(data)),
    onDownloadDone: (callback) => ipcRenderer.on('download-done', (event, data) => callback(data))
});
