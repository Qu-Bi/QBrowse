import React, { useEffect, useRef, useState } from 'react';
import useTabStore from '../../store/useTabStore';
import useUIStore from '../../store/useUIStore';

// We extract WebViewItem so we can freeze its initial URL 
// and use imperative loadURL() to avoid React src update bugs
const WebViewItem = ({ tab, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions }) => {
    const wvRef = useRef(null);
    const [initialUrl] = useState(() => {
        let u = tab.url;
        if (!u) return 'about:blank';
        if (u === 'about:blank') return u;
        if (!u.includes('://')) {
            return `https://${u}`;
        }
        return u;
    });

    // CSS for custom scrollbars
    const customScrollbarCSS = `
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(150, 150, 150, 0.5);
            border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(150, 150, 150, 0.8);
        }
    `;

    // Handle subsequent navigations from Omnibox
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv || !tab.url) return;

        let targetUrl = tab.url;
        if (!targetUrl || targetUrl === 'about:blank') return;
        if (!targetUrl.includes('://')) {
            targetUrl = `https://${targetUrl}`;
        }

        const doLoad = () => {
            try {
                if (typeof wv.getURL === 'function') {
                    const currentWvUrl = wv.getURL();
                    if (currentWvUrl !== targetUrl && currentWvUrl !== targetUrl + '/') {
                        wv.loadURL(targetUrl).catch(() => {});
                    }
                }
            } catch (e) {
                // Ignore
            }
        };

        if (typeof wv.loadURL === 'function') {
            doLoad();
        } else {
            const onReady = () => {
                doLoad();
                wv.removeEventListener('dom-ready', onReady);
            };
            wv.addEventListener('dom-ready', onReady);
        }
    }, [tab.url]);

    // Setup Webview Event Listeners
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const handleNavigate = (e) => {
            setSpaceTabs(prev => {
                const currentTab = prev.find(t => t.id === tab.id);
                if (currentTab && currentTab.url !== e.url) {
                    const history = currentTab.history || [];
                    const currentIdx = currentTab.historyIndex !== undefined ? currentTab.historyIndex : -1;
                    const newHistory = [...history.slice(0, currentIdx + 1), e.url];
                    return prev.map(t => t.id === tab.id ? { ...t, url: e.url, history: newHistory, historyIndex: newHistory.length - 1 } : t);
                }
                return prev;
            });
            if (isActive && isSpaceActive) {
                useUIStore.getState().setCurrentUrl(e.url);
            }
        };

        const handleTitleUpdate = (e) => {
            setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: e.title } : t));
        };
        
        const handleDomReady = () => {
            try { wv.insertCSS(customScrollbarCSS).catch(() => {}); } catch(e){}
        };
        
        const handleEnterHtmlFullScreen = () => {
            if (window.electronAPI) window.electronAPI.maximize(); // Fallback to maximize for fullscreen video
        };

        let captureInterval;
        if (isActive && isSpaceActive) {
            captureInterval = setInterval(() => {
                try {
                    wv.capturePage().then(img => {
                        const thumbnail = img.toDataURL();
                        setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                    }).catch(()=>{});
                } catch(e) {}
            }, 10000); // Capture every 10 seconds while active
        }

        const handleStopLoading = () => {
            if (isActive && isSpaceActive) {
                try {
                    wv.capturePage().then(img => {
                        const thumbnail = img.toDataURL();
                        setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                    }).catch(()=>{});
                } catch(e) {}
            }
        };

        wv.addEventListener('did-navigate', handleNavigate);
        wv.addEventListener('did-navigate-in-page', handleNavigate);
        wv.addEventListener('page-title-updated', handleTitleUpdate);
        wv.addEventListener('dom-ready', handleDomReady);
        wv.addEventListener('did-stop-loading', handleStopLoading);
        wv.addEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);

        return () => {
            if (captureInterval) clearInterval(captureInterval);
            wv.removeEventListener('did-navigate', handleNavigate);
            wv.removeEventListener('did-navigate-in-page', handleNavigate);
            wv.removeEventListener('page-title-updated', handleTitleUpdate);
            wv.removeEventListener('dom-ready', handleDomReady);
            wv.removeEventListener('did-stop-loading', handleStopLoading);
            wv.removeEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);
        };
    }, [isActive, isSpaceActive, setSpaceTabs, tab.id]);
    
    // Refresh mechanism
    const isRefreshing = useUIStore(state => state.isRefreshing);
    useEffect(() => {
        if (isRefreshing && isActive && isSpaceActive && wvRef.current) {
            try {
                wvRef.current.reload();
            } catch(e) {}
        }
    }, [isRefreshing, isActive, isSpaceActive]);

    // Zoom
    useEffect(() => {
        const wv = wvRef.current;
        if (wv && wv.setZoomFactor && isActive) {
            try {
                wv.setZoomFactor(zoomLevel / 100);
            } catch(e) {}
        }
    }, [zoomLevel, isActive]);

    // Smart Force Dark Mode
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;
        
        const darkCSS = `
            html { filter: invert(1) hue-rotate(180deg) !important; background: black !important; }
            img, video, iframe, canvas { filter: invert(1) hue-rotate(180deg) !important; }
        `;
        const lightCSS = `
            html { filter: none !important; background: white !important; }
            img, video, iframe, canvas { filter: none !important; }
        `;
        
        const exclusions = useUIStore.getState().darkExclusions || [];
        const isExcluded = exclusions.some(domain => tab.url && tab.url.includes(domain));
        
        if (isExcluded || !isForceDark) {
            try { wv.insertCSS(lightCSS).catch(() => {}); } catch(e) {}
            return;
        }

        const injectSmartDark = () => {
            try {
                wv.executeJavaScript(`
                    (() => {
                        const bg = window.getComputedStyle(document.body).backgroundColor;
                        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches || 
                            (bg && (bg.includes('rgba(0, 0, 0') || bg.includes('rgb(0, 0, 0') || bg.includes('rgb(18, 18, 18)')));
                        return isDark;
                    })();
                `).then(isAlreadyDark => {
                    if (!isAlreadyDark && isForceDark) {
                        try { wv.insertCSS(darkCSS).catch(() => {}); } catch(e) {}
                    }
                }).catch(() => {});
            } catch (e) {}
        };

        let isReady = false;
        try {
            if (wv.getWebContentsId()) isReady = true;
        } catch(e) {
            isReady = false;
        }

        if (isReady) {
            injectSmartDark();
        } else {
            const onReady = () => {
                injectSmartDark();
                wv.removeEventListener('dom-ready', onReady);
            };
            wv.addEventListener('dom-ready', onReady);
        }

    }, [isForceDark, tab.url, darkExclusions]);

    return (
        <div className="w-full absolute bg-transparent transition-opacity duration-300" style={{ 
            top: '0px',
            height: '100%',
            left: isVisible ? '0px' : '-9999px',
            zIndex: isVisible ? 10 : 0,
            opacity: isVisible ? 1 : 0
        }}>
            <webview
                ref={wvRef}
                id={`webview-${tab.id}`}
                src={initialUrl}
                className="w-full h-full"
                style={{ display: 'flex' }}
                allowpopups="true"
            />
        </div>
    );
};

export default function WebViewContainer({ space }) {
  const { 
    privateTabs, workTabs, ghostTabs, activeSpace,
    setPrivateTabs, setWorkTabs, setGhostTabs
  } = useTabStore();
  const { isSidebarHidden, isRightPanelOpen, isFullscreen, isSplitView, zoomLevel, showSwitcher, currentUrl, isForceDark, darkExclusions } = useUIStore();

  const isSpaceActive = activeSpace === space;
  let spaceTabs = [];
  let setSpaceTabs = null;

  if (space === 'personal') {
    spaceTabs = privateTabs;
    setSpaceTabs = setPrivateTabs;
  } else if (space === 'work') {
    spaceTabs = workTabs;
    setSpaceTabs = setWorkTabs;
  } else if (space === 'ghost') {
    spaceTabs = ghostTabs;
    setSpaceTabs = setGhostTabs;
  }

  const activeTab = spaceTabs.find(t => t.active);
  const containerRef = useRef(null);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {spaceTabs.map(tab => {
          if (tab.url === undefined) return null;
          
          const isActive = activeTab && tab.id === activeTab.id;
          const isVisible = isActive && isSpaceActive && !showSwitcher;

          return (
              <WebViewItem 
                  key={tab.id} 
                  tab={tab} 
                  isVisible={isVisible}
                  isActive={isActive}
                  isSpaceActive={isSpaceActive}
                  setSpaceTabs={setSpaceTabs}
                  zoomLevel={zoomLevel}
                  isForceDark={isForceDark}
                    darkExclusions={darkExclusions}
              />
          );
      })}
    </div>
  );
}
