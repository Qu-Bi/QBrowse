const fs = require('fs');

let c = fs.readFileSync('src/components/layout/WebViewContainer.jsx', 'utf8');

c = c.replace('const WebViewItem = ({ tab, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions }) => {', 'const WebViewItem = ({ tab, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions, isWebviewFullscreen, setIsWebviewFullscreen }) => {');

c = c.replace(`        const handleEnterHtmlFullScreen = () => {
            if (window.electronAPI) window.electronAPI.maximize(); // Fallback to maximize for fullscreen video
        };`, `        const handleEnterHtmlFullScreen = () => {
            setIsWebviewFullscreen(true);
        };
        const handleLeaveHtmlFullScreen = () => {
            setIsWebviewFullscreen(false);
        };`);

c = c.replace(`        wv.addEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);`, `        wv.addEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);
        wv.addEventListener('leave-html-full-screen', handleLeaveHtmlFullScreen);`);

c = c.replace(`            wv.removeEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);`, `            wv.removeEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);
            wv.removeEventListener('leave-html-full-screen', handleLeaveHtmlFullScreen);`);

c = c.replace(`        if (isReady) {
            injectSmartDark();
        } else {
            const onReady = () => {
                injectSmartDark();
                wv.removeEventListener('dom-ready', onReady);
            };
            wv.addEventListener('dom-ready', onReady);
        }

    }, [isForceDark, tab.url, darkExclusions]);`, `        if (isReady) {
            injectSmartDark();
        } else {
            const onReady = () => {
                injectSmartDark();
                wv.removeEventListener('dom-ready', onReady);
            };
            wv.addEventListener('dom-ready', onReady);
        }

    }, [isForceDark, tab.url, darkExclusions]);
    
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
    }, [isWebviewFullscreen, setIsWebviewFullscreen]);`);

c = c.replace(`    return (
        <div className="w-full absolute bg-transparent transition-opacity duration-300" style={{ 
            top: '0px',
            left: '0px',
            width: isVisible ? '100%' : '0px',
            height: isVisible ? '100%' : '0px',
            zIndex: isVisible ? 10 : -1,
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
        }}>`, `    return (
        <div className={\`w-full absolute bg-transparent transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] \${isWebviewFullscreen && isVisible ? 'fixed inset-0 z-[99999]' : ''}\`} style={(!isWebviewFullscreen || !isVisible) ? { 
            top: '0px',
            left: '0px',
            width: isVisible ? '100%' : '0px',
            height: isVisible ? '100%' : '0px',
            zIndex: isVisible ? 10 : -1,
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
        } : { opacity: 1, pointerEvents: 'auto' }}>`);

c = c.replace(`  const { isSidebarHidden, isRightPanelOpen, isFullscreen, isSplitView, zoomLevel, showSwitcher, currentUrl, isForceDark, darkExclusions } = useUIStore();`, `  const { isSidebarHidden, isRightPanelOpen, isFullscreen, isSplitView, zoomLevel, showSwitcher, currentUrl, isForceDark, darkExclusions, isWebviewFullscreen, setIsWebviewFullscreen } = useUIStore();`);

c = c.replace(`                  isForceDark={isForceDark}
                    darkExclusions={darkExclusions}
              />`, `                  isForceDark={isForceDark}
                  darkExclusions={darkExclusions}
                  isWebviewFullscreen={isWebviewFullscreen}
                  setIsWebviewFullscreen={setIsWebviewFullscreen}
              />`);

fs.writeFileSync('src/components/layout/WebViewContainer.jsx', c);
console.log('Replaced successfully');
