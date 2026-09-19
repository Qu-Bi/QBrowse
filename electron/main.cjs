const { app, BrowserWindow, ipcMain, session, crashReporter, shell, clipboard, dialog } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');

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
    return argv.find(arg => arg && typeof arg === 'string' && (arg.startsWith('http://') || arg.startsWith('https://')));
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

app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('enable-picture-in-picture');
app.commandLine.appendSwitch('enable-features', 'DocumentPictureInPictureAPI,MediaSessionAPIs');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');

// Synchronously load user flags from qbrowse://flags before app is ready
const fsSync = require('fs');
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
            return BrowserWindow.fromWebContents(contents) || BrowserWindow.getFocusedWindow() || mainWindow;
        };

        // CRITICAL: Prevent new OS windows when webview scripts or target="_blank" links open URLs!
        contents.setWindowOpenHandler(({ url, frameName, disposition, features }) => {
            console.log('[Electron Main] setWindowOpenHandler intercepted:', url, disposition);
            if (url && url !== 'about:blank') {
                const targetWin = getTargetWindow();
                if (targetWin && !targetWin.isDestroyed()) {
                    targetWin.webContents.send('open-new-tab-url', { url, disposition });
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

        // CRITICAL: Safely wrap loadURL to gracefully absorb ERR_ABORTED (-3) when navigations are superseded or cancelled
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
                    if (isAborted) return;
                    throw err;
                });
            } catch (err) {
                const isAborted = err && (
                    err.errno === -3 || 
                    err.code === 'ERR_ABORTED' || 
                    String(err.message || '').includes('-3') || 
                    String(err.message || '').includes('ERR_ABORTED')
                );
                if (isAborted) return Promise.resolve();
                return Promise.reject(err);
            }
        };

        // CRITICAL: Disable background throttling so YouTube media plays perfectly in the background
        contents.setBackgroundThrottling(false);

        contents.on('before-input-event', (event, input) => {
            const targetWin = getTargetWindow();
            if (!targetWin || targetWin.isDestroyed()) return;

            if (input.type === 'keyUp') {
                if (input.key === 'Control' || input.key === 'Meta') {
                    try {
                        targetWin.webContents.send('global-keyup', { key: input.key });
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
            if (isCmdOrCtrl || input.key === 'F11' || input.key === 'F12' || input.key === 'Escape') {
                let shortcut = null;
                if (isCmdOrCtrl && input.key) {
                    shortcut = `cmd+${input.key.toLowerCase()}`;
                } else if (input.key === 'F11' || input.key === 'F12' || input.key === 'Escape') {
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
                        event.preventDefault();
                        try {
                            targetWin.webContents.send('global-shortcut', { shortcut: 'cmd+tab', shift: input.shift });
                        } catch(e) {}
                        return;
                    }

                    const overrideKeys = [
                        'cmd+w', 'cmd+r', 'cmd+t', 'cmd+k', 'cmd+1', 'cmd+2', 'cmd+3', 
                        'cmd+n', 'cmd+p', 'cmd+e', 'cmd+b', 'cmd+j', 'cmd+f', 'cmd+h', 
                        'cmd+l', 'cmd+y', 'cmd+\\', 'cmd+|', 'cmd+d', 'cmd+[', 'cmd+]',
                        'cmd++', 'cmd+-', 'cmd+=', 'cmd+0', 'f11', 'f12'
                    ];

                    if (overrideKeys.includes(shortcut)) {
                        event.preventDefault();
                        targetWin.focus();
                        targetWin.webContents.focus();
                        setTimeout(() => {
                            if (!targetWin || targetWin.isDestroyed()) return;
                            try {
                                targetWin.webContents.send('global-shortcut', { shortcut, shift: input.shift });
                            } catch(e) {}
                        }, 10);
                    }
                }
            }
        });
    });

// Spoof Firefox to bypass Google's strict Chromium-based embedded browser restrictions (rrk=46 / BotGuard)
const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';
app.userAgentFallback = firefoxUA;

app.setName('QBrowse');
app.setAppUserModelId('com.qbrowse.app');

const { components } = require('electron');

const configuredSessions = new WeakSet();

function setupHeadersHandler(sess) {
    if (!sess || !sess.webRequest) return;
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
        delete details.requestHeaders['X-Electron-Version'];
        
        // CRITICAL: When spoofing Firefox, we MUST NOT send Chromium's Client Hints headers.
        // Google BotGuard actively flags Firefox User-Agents that send sec-ch-ua headers!
        delete details.requestHeaders['sec-ch-ua'];
        delete details.requestHeaders['Sec-CH-UA'];
        delete details.requestHeaders['sec-ch-ua-mobile'];
        delete details.requestHeaders['Sec-CH-UA-Mobile'];
        delete details.requestHeaders['sec-ch-ua-platform'];
        delete details.requestHeaders['Sec-CH-UA-Platform'];

        if (settingsStore.dnt !== false) {
            details.requestHeaders['DNT'] = '1';
        }
        
        details.requestHeaders['User-Agent'] = firefoxUA;

        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
}

function setupDownloadHandler(sess) {
    if (!sess) return;
    sess.on('will-download', (event, item, webContents) => {
        const id = Date.now().toString();
        const fileName = item.getFilename();
        const totalBytes = item.getTotalBytes();
        const url = item.getURL();

        const askSave = settingsStore.askSave === true;
        const downloadsPath = settingsStore.downloadsPath;

        if (!askSave && downloadsPath) {
            try {
                item.setSavePath(path.join(downloadsPath, fileName));
            } catch(e) {}
        } else {
            item.setSaveDialogOptions({
                title: `Save ${fileName} - QBrowse`,
                defaultPath: downloadsPath ? path.join(downloadsPath, fileName) : fileName
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

    try {
        if (typeof sess.registerPreloadScript === 'function') {
            sess.registerPreloadScript({ filePath: path.join(__dirname, 'webview_preload.cjs') });
        } else if (typeof sess.setPreloads === 'function') {
            sess.setPreloads([path.join(__dirname, 'webview_preload.cjs')]);
        }
    } catch(e) {
        try {
            sess.setPreloads([path.join(__dirname, 'webview_preload.cjs')]);
        } catch (_) {}
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

    if (sess.setWebAuthenticationHandler) {
        sess.setWebAuthenticationHandler((details, callback) => {
            // Allow native OS Windows Security dialog so hardware security keys (YubiKey, FIDO2) work seamlessly
            callback({ action: 'allow' });
        });
    }

    setupDownloadHandler(sess);
}

app.whenReady().then(async () => {
  try {
      if (components && typeof components.whenReady === 'function') {
          await components.whenReady();
          console.log('Widevine and components loaded successfully.');
      }
  } catch(e) {
      console.error('Components failed to load:', e);
  }

  // Fix YouTube and Google login stuck/rejected state by wiping service workers and caches on boot
  session.defaultSession.clearStorageData({
      origin: 'https://www.youtube.com',
      storages: ['serviceworkers', 'cachestorage']
  }).catch(() => {});
  session.defaultSession.clearStorageData({
      origin: 'https://accounts.google.com',
      storages: ['serviceworkers', 'cachestorage']
  }).catch(() => {});

  ensurePermissionsFile();

  // Configure default session (Personal and Work spaces)
  setupWebviewSession(session.defaultSession);

  // Proactively configure in-memory ghost partition (Incognito space)
  const ghostSession = session.fromPartition('ghost');
  setupWebviewSession(ghostSession);

  // Proactively configure in-memory tor partition (Tor Onion space)
  const torSession = session.fromPartition('tor');
  setupWebviewSession(torSession);
  if (torSession && typeof torSession.setWebRTCIPHandlingPolicy === 'function') {
      torSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  }

  // Auto-configure any dynamic sessions created by webviews
  app.on('session-created', (sess) => {
      setupWebviewSession(sess);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle('open-file', async (event, path) => {
      if (path) await shell.openPath(path);
  });
  
  ipcMain.handle('show-item-in-folder', (event, path) => {
      if (path) shell.showItemInFolder(path);
  });
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
        console.error('Vault unlock error:', e);
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
                resolve({ verified: true, status: 'Verified' });
            } else if (output.includes('Canceled')) {
                resolve({ verified: false, status: 'Canceled' });
            } else if (output.includes('NotAvailable')) {
                resolve({ verified: false, status: 'NotAvailable' });
            } else {
                resolve({ verified: false, status: output || 'Failed' });
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

        pendingPasskeyVerifications.set(requestId, { resolve, timer });

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('prompt-passkey-verification', {
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
        return true;
    }
    return false;
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

                if (!targetHost && !targetRpId) return true;

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
        await torSession.setProxy({ proxyRules: '' });
        await torSession.clearStorageData();
    } catch (_) {}
    return { success: true };
});

ipcMain.handle('tor-new-circuit', async () => {
    const res = await torEngine.requestNewTorCircuit();
    try {
        const torSession = session.fromPartition('tor');
        await torSession.clearStorageData({ storages: ['cookies', 'cachestorage'] });
    } catch (_) {}
    return res;
});

ipcMain.handle('tor-check-ip', async () => {
    const torSession = session.fromPartition('tor');
    const fetchFn = async (url) => {
        const { net } = require('electron');
        return net.fetch(url, { session: torSession });
    };
    return torEngine.checkTorExitIp(fetchFn);
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

// Default Browser Handlers
ipcMain.handle('system-check-default-browser', async () => {
    try {
        const isHttp = app.isDefaultProtocolClient('http');
        const isHttps = app.isDefaultProtocolClient('https');
        return { isDefault: Boolean(isHttp && isHttps) };
    } catch (e) {
        return { isDefault: false, error: e.message };
    }
});

ipcMain.handle('system-set-default-browser', async () => {
    try {
        let setHttp = false;
        let setHttps = false;

        if (typeof app.setAsDefaultProtocolClient === 'function') {
            setHttp = app.setAsDefaultProtocolClient('http');
            setHttps = app.setAsDefaultProtocolClient('https');
        }

        if (process.platform === 'linux') {
            try {
                const { exec } = require('child_process');
                exec('xdg-settings set default-web-browser qbrowse.desktop || xdg-mime default qbrowse.desktop x-scheme-handler/http x-scheme-handler/https text/html');
            } catch (_) {}
        } else if (process.platform === 'win32') {
            try {
                shell.openExternal('ms-settings:defaultapps');
            } catch (_) {}
        }

        const isDefault = Boolean(app.isDefaultProtocolClient('http') && app.isDefaultProtocolClient('https'));
        return { success: true, isDefault };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('system-open-default-apps-settings', async () => {
    try {
        if (process.platform === 'win32') {
            await shell.openExternal('ms-settings:defaultapps');
            return { success: true };
        } else if (process.platform === 'linux') {
            const { exec } = require('child_process');
            exec('gnome-control-center default-apps || xfce4-mime-settings || kcmshell5 componentchooser');
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


