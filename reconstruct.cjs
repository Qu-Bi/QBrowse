const fs = require('fs');
let text = fs.readFileSync('electron/main.cjs', 'utf-8');

// The corrupted section in the current file starts from `  ipcMain.on('set-adblock', ... if (active) {`
// and continues to `    if (BrowserWindow.getAllWindows().length === 0) {`

const search = `  ipcMain.on('set-adblock', (event, active) => {
      isNativeAdblockActive = active;
      if (active) {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });`;

const replace = `  ipcMain.on('set-adblock', (event, active) => {
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
                    shortcut = \`cmd+\${input.key.toLowerCase()}\`;
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

        // Add YouTube ad speedup logic here
        contents.on('dom-ready', () => {
            try {
                const url = contents.getURL();
                if (url && (url.includes('youtube.com') || url.includes('googlevideo.com'))) {
                    contents.executeJavaScript(\`
                        (function() {
                            if (window.qbrowseYoutubeSkipInjected) return;
                            window.qbrowseYoutubeSkipInjected = true;
                            
                            setInterval(() => {
                                const video = document.querySelector('video');
                                const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
                                const adText = document.querySelector('.ytp-ad-text');
                                
                                if (skipBtn) {
                                    skipBtn.click();
                                } else if (adText || (video && video.src && document.querySelector('.ad-showing'))) {
                                    if (video && isFinite(video.duration)) {
                                        video.playbackRate = 16.0;
                                        if (video.currentTime < video.duration - 0.5) {
                                            video.currentTime = video.duration - 0.5;
                                        }
                                    }
                                }
                            }, 500);
                        })();
                    \`).catch(err => {
                        // ignore errors from destroyed webcontents
                    });
                }
            } catch (e) {
                // Ignore url getter errors
            }
        });
    });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });`;

if (text.includes(search)) {
    text = text.replace(search, replace);
    fs.writeFileSync('electron/main.cjs', text);
    console.log("Successfully fixed main.cjs");
} else {
    console.error("Could not find search string in main.cjs");
}
