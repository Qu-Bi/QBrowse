const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const { spawn } = require('child_process');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

let mainWindow;
const isDev = process.env.NODE_ENV !== 'production';

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
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: '#0a0a0c',
    icon: path.join(__dirname, '../app-icon.svg'),
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

  // Setup Ghostery Adblocker (EasyList + EasyPrivacy)
  let isNativeAdblockActive = true;
  ipcMain.on('set-adblock', (event, active) => {
      isNativeAdblockActive = active;
      if (active) {
          console.log("Adblocker enabled");
      } else {
          console.log("Adblocker disabled");
      }
  });

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
      blocker.on('request-blocked', (request) => {
          if (isNativeAdblockActive) {
              console.log('Blocked ad/tracker:', request.url);
              if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tracker-blocked', request.url);
              }
          }
      });
      
      const originalBlock = blocker.match.bind(blocker);
      blocker.match = (request) => {
          if (!isNativeAdblockActive) return false;
          if (request.url && (request.url.includes('youtube.com') || request.url.includes('googlevideo.com') || request.url.includes('ytimg.com'))) return false;
          return originalBlock(request);
      };

      blocker.enableBlockingInSession(session.defaultSession);
      console.log('Ghostery Adblocker initialized successfully.');
  }).catch(err => {
      console.error('Failed to initialize Adblocker:', err);
  });

    app.on('web-contents-created', (event, contents) => {
        contents.setMaxListeners(0);

        contents.on('before-input-event', (event, input) => {
            if (input.type !== 'keyDown') return;

            const isCmdOrCtrl = input.control || input.meta;
            if (isCmdOrCtrl || input.key === 'F11' || input.key === 'Escape') {
                let shortcut = null;
                if (isCmdOrCtrl && input.key) {
                    shortcut = `cmd+${input.key.toLowerCase()}`;
                } else if (input.key === 'F11' || input.key === 'Escape') {
                    shortcut = input.key.toLowerCase();
                }

                if (shortcut) {
                    const overrideKeys = ['cmd+w', 'cmd+r', 'cmd+t', 'cmd+k', 'cmd+1', 'cmd+2', 'cmd+3', 'cmd+n', 'cmd+e', 'cmd+b', 'cmd+j', 'cmd+f', 'cmd+tab', 'cmd++', 'cmd+-', 'cmd+=', 'cmd+0', 'f11'];
                    if (overrideKeys.includes(shortcut)) {
                        event.preventDefault();
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            setTimeout(() => {
                                if (!mainWindow.isDestroyed()) {
                                    mainWindow.webContents.send('global-shortcut', shortcut);
                                }
                            }, 10);
                        }
                    }
                }
            }
        });

        });
    });
}

app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

app.whenReady().then(() => {
  session.defaultSession.setPreloads([path.join(__dirname, 'webview_preload.cjs')]);
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

      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-started', { id, fileName, totalBytes, url });
      }


      let lastDownloadUpdateTime = 0;
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
                  if (mainWindow && !mainWindow.isDestroyed()) {
                      mainWindow.webContents.send('download-updated', { 
                          id, 
                          state: 'progressing', 
                          receivedBytes: item.getReceivedBytes() 
                      });
                  }
              }
          }
      });

      item.once('done', (event, state) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-done', { id, state });
          }
      });
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
ipcMain.on('window-close', () => mainWindow.close());
  ipcMain.on('open-devtools', (e) => mainWindow.webContents.openDevTools());

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

ipcMain.handle('vault-unlock', async (event, masterPassword) => {
    try {
        const key = deriveKey(masterPassword);
        const data = await fs.readFile(vaultPath, 'utf8');
        const vault = JSON.parse(data);
        
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
        return false;
    }
});

ipcMain.handle('vault-add-password', async (event, title, url, username, password) => {
    if (!masterKey) throw new Error("Vault not unlocked");
    const data = await fs.readFile(vaultPath, 'utf8');
    const vault = JSON.parse(data);
    
    const entry = {
        id: Date.now().toString(),
        title,
        url,
        username,
        password: encrypt(password, masterKey)
    };
    
    vault.passwords.push(entry);
    await fs.writeFile(vaultPath, JSON.stringify(vault));
});

ipcMain.handle('vault-get-passwords', async () => {
    if (!masterKey) throw new Error("Vault not unlocked");
    const data = await fs.readFile(vaultPath, 'utf8');
    const vault = JSON.parse(data);
    
    return vault.passwords.map(p => ({
        ...p,
        password: decrypt(p.password, masterKey)
    }));
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
