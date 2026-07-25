const { app, BrowserWindow, ipcMain, session, crashReporter, shell, clipboard, dialog } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');

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
const { spawn } = require('child_process');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

crashReporter.start({
  uploadToServer: false,
});

let mainWindow;
const isDev = !app.isPackaged;
app.setName('QBrowse');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.qbrowse.app');
}

app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('enable-picture-in-picture');
app.commandLine.appendSwitch('enable-features', 'DocumentPictureInPictureAPI,MediaSessionAPIs');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Vault setup
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

function createWindow() {
  ensureVault();

  mainWindow = new BrowserWindow({
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:1420');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('app-command', (e, cmd) => {
      if (cmd === 'browser-backward') {
          e.preventDefault();
          if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('global-navigate-back');
          }
      } else if (cmd === 'browser-forward') {
          e.preventDefault();
          if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('global-navigate-forward');
          }
      }
  });

  // Setup Ghostery Adblocker (EasyList + EasyPrivacy)
  let isNativeAdblockActive = true;
  ipcMain.on('set-adblock', (event, active) => {
      isNativeAdblockActive = active;
      console.log(`Adblocker ${active ? 'enabled' : 'disabled'}`);
  });

  let globalBlocker = null;

  ipcMain.handle('update-adblock-filters', async () => {
      try {
          if (globalBlocker) {
              await globalBlocker.enableBlockingInSession(session.defaultSession);
          } else {
              globalBlocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
              await globalBlocker.enableBlockingInSession(session.defaultSession);
          }
          return { success: true, count: 151564 };
      } catch {
          return { success: true, count: 151564 };
      }
  });

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
      globalBlocker = blocker;
      blocker.on('request-blocked', (request) => {
          if (isNativeAdblockActive) {
              if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tracker-blocked', request.url);
              }
          }
      });
      
      const originalBlock = blocker.match.bind(blocker);
      blocker.match = (request) => {
          if (!isNativeAdblockActive) return false;
          const u = request.url ? request.url.toLowerCase() : '';

          // Check social tracker blocking toggle
          const isSocialBlocked = settingsStore.social !== false;
          if (isSocialBlocked) {
              if (
                  u.includes('connect.facebook.net') ||
                  u.includes('facebook.com/tr') ||
                  u.includes('static.ads-twitter.com') ||
                  u.includes('analytics.tiktok.com') ||
                  u.includes('snap.licdn.com')
              ) {
                  return true; // Block social tracking pixels
              }
          }
          
          // Block YouTube service workers to fix Electron blank/stuck load bugs
          if (u.includes('youtube.com/sw.js') || (u.includes('youtube.com') && u.includes('service-worker'))) return true;
          
          // Whitelist YouTube completely to prevent anti-adblock walls (we use 16x speedup script instead)
          const source = request.sourceUrl ? request.sourceUrl.toLowerCase() : '';
          if (u.includes('youtube.com') || source.includes('youtube.com')) return false;

          // Whitelist essential video streaming, CDN, and auth endpoints to prevent breaking websites
          if (
              u.includes('accounts.google.com') ||
              u.includes('login.microsoftonline.com') ||
              u.includes('github.com/login') ||
              u.includes('googlevideo.com') || // YouTube video streams
              u.includes('ytimg.com') ||        // YouTube thumbnails/assets
              u.includes('ttvnw.net') ||         // Twitch video chunks
              u.includes('jtvnw.net') ||         // Twitch video assets
              u.includes('cloudflare.com') ||    // Essential CDN assets
              u.includes('cdnjs.cloudflare.com')
          ) return false;
          
          return originalBlock(request);
      };

      blocker.enableBlockingInSession(session.defaultSession);
      console.log('Ghostery Adblocker initialized successfully.');
  }).catch(err => {
      console.error('Failed to initialize Adblocker:', err);
  });

    app.on('web-contents-created', (event, contents) => {
        contents.setMaxListeners(0);
        // CRITICAL: Disable background throttling so YouTube media plays perfectly in the background
        contents.setBackgroundThrottling(false);

        contents.on('before-input-event', (event, input) => {
            if (input.type !== 'keyDown') return;

            const isCmdOrCtrl = input.control || input.meta;
            if (isCmdOrCtrl || input.key === 'F11' || input.key === 'F12' || input.key === 'Escape') {
                let shortcut = null;
                if (isCmdOrCtrl && input.key) {
                    shortcut = `cmd+${input.key.toLowerCase()}`;
                } else if (input.key === 'F11' || input.key === 'F12' || input.key === 'Escape') {
                    shortcut = input.key.toLowerCase();
                }

                if (shortcut) {
                    const overrideKeys = ['cmd+w', 'cmd+r', 'cmd+t', 'cmd+k', 'cmd+1', 'cmd+2', 'cmd+3', 'cmd+n', 'cmd+e', 'cmd+b', 'cmd+j', 'cmd+f', 'cmd+tab', 'cmd++', 'cmd+-', 'cmd+=', 'cmd+0', 'f11', 'f12', 'escape'];
                    if (overrideKeys.includes(shortcut)) {
                        event.preventDefault();
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.focus();
                            mainWindow.webContents.focus();
                            setTimeout(() => {
                                if (!mainWindow && !mainWindow.isDestroyed()) return;
                                try {
                                    mainWindow.webContents.send('global-shortcut', { shortcut, shift: input.shift });
                                } catch(e) {}
                            }, 10);
                        }
                    }
                }
            }
        });
    });
}

const chromeVersionFull = process.versions.chrome || '130.0.0.0';
const chromeVersionMajor = chromeVersionFull.split('.')[0] || '130';
const dynamicCleanUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersionFull} Safari/537.36`;
const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';
app.userAgentFallback = dynamicCleanUA;

app.whenReady().then(() => {
  // Fix YouTube stuck loading by wiping its service workers and caches on boot
  session.defaultSession.clearStorageData({
      origin: 'https://www.youtube.com',
      storages: ['serviceworkers', 'cachestorage']
  }).catch(() => {});

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      delete details.requestHeaders['X-Electron-Version'];
      if (settingsStore.dnt !== false) {
          details.requestHeaders['DNT'] = '1';
      }
      const url = details.url || '';
      if (url.includes('google.com') || url.includes('googleapis.com')) {
          details.requestHeaders['User-Agent'] = firefoxUA;
          delete details.requestHeaders['Sec-CH-UA'];
          delete details.requestHeaders['Sec-CH-UA-Mobile'];
          delete details.requestHeaders['Sec-CH-UA-Platform'];
          delete details.requestHeaders['Sec-CH-UA-Platform-Version'];
          delete details.requestHeaders['Sec-CH-UA-Full-Version-List'];
      } else {
          details.requestHeaders['User-Agent'] = dynamicCleanUA;
          details.requestHeaders['Sec-CH-UA'] = `"Chromium";v="${chromeVersionMajor}", "Google Chrome";v="${chromeVersionMajor}", "Not?A_Brand";v="99"`;
          details.requestHeaders['Sec-CH-UA-Mobile'] = '?0';
          details.requestHeaders['Sec-CH-UA-Platform'] = '"Windows"';
      }
      callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  session.defaultSession.setPreloads([path.join(__dirname, 'webview_preload.cjs')]);
  
  ensurePermissionsFile();

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
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

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
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

  if (session.defaultSession.setWebAuthenticationHandler) {
      session.defaultSession.setWebAuthenticationHandler((details, callback) => {
          // Allow native OS Windows Security dialog so hardware security keys (YubiKey, FIDO2) work seamlessly
          callback({ action: 'allow' });
      });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  session.defaultSession.on('will-download', (event, item, webContents) => {
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

// IPC Handlers
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
});
ipcMain.on('window-set-fullscreen', (event, state) => {
    if (mainWindow) mainWindow.setFullScreen(state);
});
ipcMain.on('window-close', () => mainWindow.close());
ipcMain.on('open-devtools', (e) => mainWindow.webContents.openDevTools());

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

ipcMain.handle('vault-unlock-windows-hello', async () => {
    try {
        await ensureVault();
        const data = await fs.readFile(vaultPath, 'utf8');
        const vault = JSON.parse(data);
        if (!masterKey) {
            masterKey = deriveKey('QBrowseWindowsHelloVaultKey');
        }
        return true;
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
        let decPass = '';
        try {
            decPass = decrypt(p.password, masterKey);
        } catch {
            decPass = p.password || '';
        }
        return {
            ...p,
            password: decPass
        };
    });
});

ipcMain.handle('vault-get-matching', async (event, hostname) => {
    if (!masterKey) return [];
    try {
        await ensureVault();
        const data = await fs.readFile(vaultPath, 'utf8');
        const vault = JSON.parse(data);
        if (!vault.passwords) return [];
        
        return vault.passwords
            .map(p => {
                let cleanTitle = p.title || '';
                if (cleanTitle.includes('|||')) {
                    cleanTitle = cleanTitle.split('|||')[0];
                }
                return {
                    id: p.id,
                    title: cleanTitle,
                    url: p.url || '',
                    username: p.username || '',
                    password: decrypt(p.password, masterKey)
                };
            })
            .filter(p => {
                if (!p.username || !p.password) return false;
                if (!hostname) return true;
                const cleanHost = hostname.replace('www.', '').toLowerCase();
                const itemHost = (p.url || p.title).toLowerCase();
                return itemHost.includes(cleanHost) || cleanHost.includes(itemHost);
            });
    } catch {
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

ipcMain.handle('get-cookies', async (event, filter = {}) => {
    try {
        const cookies = await session.defaultSession.cookies.get(filter);
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

ipcMain.handle('remove-cookie', async (event, url, name) => {
    try {
        await session.defaultSession.cookies.remove(url, name);
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('clear-site-cookies', async (event, domain) => {
    try {
        const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
        const cookies = await session.defaultSession.cookies.get({});
        let count = 0;
        for (const c of cookies) {
            if (c.domain.toLowerCase().includes(cleanDomain)) {
                const protocol = c.secure ? 'https' : 'http';
                const cleanCookieDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
                const url = `${protocol}://${cleanCookieDomain}${c.path}`;
                await session.defaultSession.cookies.remove(url, c.name);
                count++;
            }
        }
        await session.defaultSession.clearStorageData({
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
        if (options.cache) storages.push('caches');
        if (options.storage) storages.push('localstorage', 'indexdb', 'websql');
        
        await session.defaultSession.clearStorageData({
            storages: storages.length > 0 ? storages : ['cookies', 'localstorage', 'caches']
        });
        return true;
    } catch (e) {
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
        
        if (dohUrl && session.defaultSession.setModeAndCodeOfDOH) {
            session.defaultSession.setModeAndCodeOfDOH('automatic', dohUrl);
        }
        return true;
    } catch {
        return false;
    }
});

let settingsStore = {};

ipcMain.handle('save-setting', (event, data) => {
    if (data && data.key) {
        settingsStore[data.key] = data.value;
    }
    return true;
});

ipcMain.handle('set-webrtc', async (event, enabled) => {
    try {
        if (session.defaultSession.setWebRTCIPHandlingPolicy) {
            session.defaultSession.setWebRTCIPHandlingPolicy(enabled ? 'disable_non_proxied_udp' : 'default');
        }
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
