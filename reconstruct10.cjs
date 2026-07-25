const fs = require('fs');

let text = fs.readFileSync('electron/main.cjs', 'utf-8');

text = text.replace(/mainWindow\.webContents\.send\('global-shortcut', shortcut\);/, `mainWindow.webContents.send('global-shortcut', { shortcut, shift: input.shift });`);

fs.writeFileSync('electron/main.cjs', text);

let preload = fs.readFileSync('electron/preload.cjs', 'utf-8');
preload = preload.replace(/ipcRenderer\.on\('global-shortcut', \(event, shortcut\) => callback\(shortcut\)\)/, `ipcRenderer.on('global-shortcut', (event, data) => callback(data))`);
fs.writeFileSync('electron/preload.cjs', preload);

let shortcuts = fs.readFileSync('src/hooks/useGlobalShortcuts.js', 'utf-8');
shortcuts = shortcuts.replace(/window\.electronAPI\.onGlobalShortcut\(\(shortcut\) => \{/, `window.electronAPI.onGlobalShortcut((data) => {
                const shortcut = typeof data === 'string' ? data : data.shortcut;
                const shiftKey = typeof data === 'object' ? data.shift : false;`);

shortcuts = shortcuts.replace(/const syntheticEvent = \{[\s\S]*?\};/, `const syntheticEvent = {
                        key: key,
                        preventDefault: () => {},
                        shiftKey: shiftKey
                    };`);

fs.writeFileSync('src/hooks/useGlobalShortcuts.js', shortcuts);

console.log('Fixed shortcuts with shift key');
