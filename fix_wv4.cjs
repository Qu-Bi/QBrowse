const fs = require('fs');

let lines = fs.readFileSync('src/components/layout/WebViewContainer.jsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<div className="w-full absolute bg-transparent transition-opacity duration-300" style={{')) {
        lines[i] = '        <div className={`w-full absolute bg-transparent transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isWebviewFullscreen && isVisible ? \'fixed inset-0 z-[99999]\' : \'\'}`} style={(!isWebviewFullscreen || !isVisible) ? {';
        lines[i+1] = '            top: \'0px\',';
        lines[i+2] = '            left: \'0px\',';
        lines[i+3] = '            width: isVisible ? \'100%\' : \'0px\',';
        lines[i+4] = '            height: isVisible ? \'100%\' : \'0px\',';
        lines[i+5] = '            zIndex: isVisible ? 10 : -1,';
        lines[i+6] = '            opacity: isVisible ? 1 : 0,';
        lines[i+7] = '            pointerEvents: isVisible ? \'auto\' : \'none\'';
        lines[i+8] = '        } : { opacity: 1, pointerEvents: \'auto\', top: 0, left: 0, zIndex: 99999 }}>';
        break;
    }
}

// Check for handleBeforeInput
let hasBeforeInput = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const handleBeforeInput = (e) => {')) {
        hasBeforeInput = true;
        break;
    }
}

if (!hasBeforeInput) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('return (') && lines[i+1] && lines[i+1].includes('<div className=')) {
            // Insert before return
            const beforeInput = `
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const handleBeforeInput = (e) => {
            if (e.type !== 'keyDown') return;
            // Catch Cmd/Ctrl + R
            if ((e.control || e.meta) && e.key.toLowerCase() === 'r') {
                try { wv.reload(); } catch(err) {}
            }
            // Catch F11
            if (e.key === 'F11') {
                if (window.electronAPI) window.electronAPI.toggleFullscreen();
                setIsWebviewFullscreen(!isWebviewFullscreen);
            }
            // Catch Escape to exit fullscreen
            if (e.key === 'Escape' && isWebviewFullscreen) {
                setIsWebviewFullscreen(false);
            }
        };

        wv.addEventListener('before-input-event', handleBeforeInput);
        return () => {
            wv.removeEventListener('before-input-event', handleBeforeInput);
        };
    }, [isWebviewFullscreen, setIsWebviewFullscreen]);
`;
            lines.splice(i, 0, ...beforeInput.split('\\n'));
            break;
        }
    }
}

fs.writeFileSync('src/components/layout/WebViewContainer.jsx', lines.join('\n'));
console.log('Fixed CSS and return');
