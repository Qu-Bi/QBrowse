const fs = require('fs');

let text = fs.readFileSync('electron/main.cjs', 'utf-8');

const searchRegex = /app\.whenReady\(\)\.then\(\(\) => \{[\s\S]*?\/\/ IPC Handlers/;

const replaceStr = `app.whenReady().then(() => {
  const defaultUA = session.defaultSession.getUserAgent();
  app.userAgentFallback = defaultUA.replace(/Electron\\/\\S+\\s/, '');
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
                  const now = Date.now();
                  if (now - lastDownloadUpdateTime > 500) {
                      lastDownloadUpdateTime = now;
                      if (mainWindow && !mainWindow.isDestroyed()) {
                          mainWindow.webContents.send('download-updated', { 
                              id, 
                              state: 'progressing', 
                              receivedBytes: item.getReceivedBytes() 
                          });
                      }
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

// IPC Handlers`;

if (searchRegex.test(text)) {
    text = text.replace(searchRegex, replaceStr);
    fs.writeFileSync('electron/main.cjs', text);
    console.log("Success");
} else {
    console.log("Failed to find pattern");
}
