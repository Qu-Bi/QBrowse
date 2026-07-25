const fs = require('fs');

let c = fs.readFileSync('src/components/layout/WebViewContainer.jsx', 'utf8');

// 1. Add isWebviewFullscreen prop
c = c.replace('const WebViewItem = ({ tab, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions }) => {', 'const WebViewItem = ({ tab, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions, isWebviewFullscreen, setIsWebviewFullscreen }) => {');

// 2. Add before-input-event listener
const beforeInputListener = `
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

    return (`;
c = c.replace('    return (', beforeInputListener);

// 3. Fix the UnknownVizError + Fullscreen CSS in return
const returnOriginal = `        <div className="w-full absolute bg-transparent transition-opacity duration-300" style={{ 
            top: '0px',
            height: '100%',
            left: isVisible ? '0px' : '-9999px',
            zIndex: isVisible ? 10 : 0,
            opacity: isVisible ? 1 : 0
        }}>`;
const returnReplaced = `        <div className={\`w-full absolute bg-transparent transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] \${isWebviewFullscreen && isVisible ? 'fixed inset-0 z-[99999]' : ''}\`} style={(!isWebviewFullscreen || !isVisible) ? { 
            top: '0px',
            left: '0px',
            width: isVisible ? '100%' : '0px',
            height: isVisible ? '100%' : '0px',
            zIndex: isVisible ? 10 : -1,
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
        } : { opacity: 1, pointerEvents: 'auto', top: 0, left: 0, zIndex: 99999 }}>`;
c = c.replace(returnOriginal, returnReplaced);

// 4. Fetch from useUIStore in WebViewContainer
const storeOriginal = `  const { isSidebarHidden, isRightPanelOpen, isFullscreen, isSplitView, zoomLevel, showSwitcher, currentUrl, isForceDark, darkExclusions } = useUIStore();`;
const storeReplaced = `  const { isSidebarHidden, isRightPanelOpen, isFullscreen, isSplitView, zoomLevel, showSwitcher, currentUrl, isForceDark, darkExclusions, isWebviewFullscreen, setIsWebviewFullscreen } = useUIStore();`;
c = c.replace(storeOriginal, storeReplaced);

// 5. Pass to WebViewItem inside map
const mapOriginal = `                  isForceDark={isForceDark}
                  darkExclusions={darkExclusions}
              />`;
const mapReplaced = `                  isForceDark={isForceDark}
                  darkExclusions={darkExclusions}
                  isWebviewFullscreen={isWebviewFullscreen}
                  setIsWebviewFullscreen={setIsWebviewFullscreen}
              />`;
c = c.replace(mapOriginal, mapReplaced);

fs.writeFileSync('src/components/layout/WebViewContainer.jsx', c);
console.log('Final fixes applied');
