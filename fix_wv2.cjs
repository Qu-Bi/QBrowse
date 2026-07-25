const fs = require('fs');
let lines = fs.readFileSync('src/components/layout/WebViewContainer.jsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const handleEnterHtmlFullScreen = () => {')) {
        // We expect the next line to be: if (window.electronAPI) window.electronAPI.maximize(); // Fallback to maximize for fullscreen video
        // And the next to be: };
        lines[i] = '        const handleEnterHtmlFullScreen = () => {';
        lines[i+1] = '            setIsWebviewFullscreen(true);';
        lines[i+2] = '        };';
        // Add handleLeave
        lines.splice(i+3, 0, '        const handleLeaveHtmlFullScreen = () => {', '            setIsWebviewFullscreen(false);', '        };');
        break;
    }
}

fs.writeFileSync('src/components/layout/WebViewContainer.jsx', lines.join('\n'));
console.log('Fixed handleLeaveHtmlFullScreen');
