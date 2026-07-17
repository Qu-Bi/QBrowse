const fs = require('fs');
let text = fs.readFileSync('electron/main.cjs', 'utf-8');
const searchString = `  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
      blocker.on('request-blocked', (request) => {
                                    mainWindow.webContents.send('global-shortcut', shortcut);
                                }
                            }, 10);
                        }
                    }
                }
            }
        });
    });
}`;

const replaceString = `  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
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
    });
}`;

text = text.replace(searchString, replaceString);
fs.writeFileSync('electron/main.cjs', text);
