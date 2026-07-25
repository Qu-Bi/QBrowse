import React, { useEffect, useRef, useState } from 'react';
import useTabStore from '../../store/useTabStore';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import FlagsPage from '../pages/FlagsPage';

// We extract WebViewItem so we can freeze its initial URL 
// and use imperative loadURL() to avoid React src update bugs
const WebViewItem = ({ tab, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions }) => {
    const wvRef = useRef(null);
    const isInternalNavigation = useRef(false);
    const isDomReadyRef = useRef(false);
    const [initialUrl] = useState(() => {
        let u = tab.url;
        if (!u) return 'about:blank';
        if (u === 'about:blank') return u;
        if (u.startsWith('qbrowse://ai')) {
            return u.replace('qbrowse://ai', 'http://127.0.0.1:8080');
        }
        if (!u.includes('://')) {
            return `https://${u}`;
        }
        return u;
    });

    // CSS for custom scrollbars
    const customScrollbarCSS = `
        ::-webkit-scrollbar {
            width: 7px;
            height: 7px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 9999px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.2s ease;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(212, 188, 148, 0.8);
        }
        ::-webkit-scrollbar-corner {
            background: transparent;
        }
    `;

    // Expose webview to global registry for AI context extraction
    useEffect(() => {
        if (!window.qbrowseWebviews) window.qbrowseWebviews = {};
        if (wvRef.current) {
            window.qbrowseWebviews[tab.id] = wvRef.current;
        }
        return () => {
            if (window.qbrowseWebviews) {
                delete window.qbrowseWebviews[tab.id];
            }
        };
    }, [tab.id]);

    // Handle subsequent navigations from Omnibox
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        if (isInternalNavigation.current) {
            isInternalNavigation.current = false;
            return;
        }

        let targetUrl = tab.url;
        if (!targetUrl) targetUrl = 'about:blank';
        if (targetUrl !== 'about:blank' && !targetUrl.includes('://')) {
            targetUrl = `https://${targetUrl}`;
        }
        
        let actualLoadUrl = targetUrl;
        if (actualLoadUrl && actualLoadUrl.startsWith('qbrowse://ai')) {
            actualLoadUrl = actualLoadUrl.replace('qbrowse://ai', 'http://127.0.0.1:8080');
        }

        const doLoad = () => {
            try {
                if (typeof wv.getURL === 'function') {
                    const currentWvUrl = wv.getURL();
                    if (currentWvUrl !== actualLoadUrl && currentWvUrl !== actualLoadUrl + '/') {
                        wv.loadURL(actualLoadUrl).catch(() => {});
                    }
                }
            } catch (e) {
                // Ignore
            }
        };

        if (typeof wv.loadURL === 'function') {
            doLoad();
        } else {
            wv.addEventListener('dom-ready', doLoad, { once: true });
        }
    }, [tab.url]);

    // Setup Webview Event Listeners
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const handleNavigate = (e) => {
            isInternalNavigation.current = true;
            setSpaceTabs(prev => {
                const currentTab = prev.find(t => t.id === tab.id);
                if (currentTab && currentTab.url !== e.url) {
                    const history = currentTab.history || [];
                    const currentIdx = currentTab.historyIndex !== undefined ? currentTab.historyIndex : -1;
                    const newHistory = [...history.slice(0, currentIdx + 1), e.url];
                    const targetTitle = (e.url === 'about:blank' || !e.url) ? 'New Tab' : (currentTab.title || 'New Tab');
                    return prev.map(t => t.id === tab.id ? { ...t, url: e.url, title: targetTitle, history: newHistory, historyIndex: newHistory.length - 1 } : t);
                }
                return prev;
            });
            if (isActive && isSpaceActive) {
                useUIStore.getState().setCurrentUrl(e.url);
            }
            if (e.url !== 'about:blank') {
                useHistoryStore.getState().addEntry(e.url, e.url); // Initial entry without title
            }
        };

        const handleTitleUpdate = (e) => {
            const rawTitle = e.title ? e.title.trim() : '';
            const newTitle = (rawTitle && rawTitle !== 'about:blank') ? rawTitle : 'New Tab';
            setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: newTitle } : t));
            const currentUrl = wvRef.current?.getURL();
            if (currentUrl && currentUrl !== 'about:blank') {
                useHistoryStore.getState().updateLatestTitle(currentUrl, newTitle);
            }
        };
        
        const handleDomReady = () => {
            isDomReadyRef.current = true;
            try { wv.insertCSS(customScrollbarCSS).catch(() => {}); } catch(e){}
            try {
                const isSmooth = useUIStore.getState().settings?.smooth !== false;
                if (isSmooth) {
                    wv.insertCSS(`html { scroll-behavior: smooth !important; }`).catch(() => {});
                }
            } catch(e){}
            try {
                const isCosmetic = useUIStore.getState().settings?.cosmetic !== false;
                if (isCosmetic) {
                    wv.insertCSS(`.ad-container, .adsbygoogle, div[id^="google_ads_"], div[aria-label="Advertisement"], .ytd-ad-slot-renderer, .trc_rbox_outer, .OUTBRAIN, #taboola-below-article-thumbnails { display: none !important; height: 0 !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`).catch(() => {});
                }
            } catch(e) {}
        };
        
        const handleEnterHtmlFullScreen = () => {
            if (window.electronAPI && window.electronAPI.setFullscreen) {
                window.electronAPI.setFullscreen(true);
            }
            useUIStore.getState().setIsFullscreen(true);
        };
        const handleLeaveHtmlFullScreen = () => {
            if (window.electronAPI && window.electronAPI.setFullscreen) {
                window.electronAPI.setFullscreen(false);
            }
            useUIStore.getState().setIsFullscreen(false);
        };

        let captureInterval;
        if (isActive && isSpaceActive) {
            captureInterval = setInterval(() => {
                if (!wv || !isDomReadyRef.current || wv.hasCrashed) return;
                try {
                    if (typeof wv.isLoading === 'function' && wv.isLoading()) return;
                    wv.capturePage().then(img => {
                        const thumbnail = img.toDataURL();
                        setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                    }).catch(()=>{});
                } catch(e) {}
            }, 10000);
        }

        const handleStopLoading = () => {
            if (isActive && isSpaceActive && isDomReadyRef.current && !wv.hasCrashed) {
                try {
                    wv.capturePage().then(img => {
                        const thumbnail = img.toDataURL();
                        setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                    }).catch(()=>{});
                } catch(e) {}
            }
        };

        const handleFailLoad = (e) => {
            if (!e.isMainFrame || e.errorCode === -3) return; // Ignore aborted requests
            wv.hasCrashed = true;
            
            let errorTitle = 'This site can’t be reached';
            let errorMsg = e.errorDescription || 'An unknown error occurred.';
            let errorIcon = '🌐';
            
            const codes = {
                '-105': { t: 'Server DNS address could not be found.', m: 'Check your internet connection or the spelling of the URL.', i: '📡' },
                '-106': { t: 'No internet connection', m: 'Check your network cables, modem, and routers.', i: '🔌' },
                '-102': { t: 'Connection refused', m: 'The site might be down or your network is blocking the request.', i: '🛑' },
                '-109': { t: 'Address is unreachable', m: 'The server could not be reached. Try again later.', i: '🚧' },
                '-501': { t: 'Insecure connection', m: 'The connection is not secure. Certificate is invalid.', i: '🔒' },
                '-137': { t: 'Name resolution failed', m: 'The domain name could not be resolved.', i: '🔍' },
                '-118': { t: 'Connection timed out', m: 'The server took too long to respond.', i: '⏳' },
                '-101': { t: 'Connection reset', m: 'The connection was reset by the server.', i: '🔄' },
                '-104': { t: 'Connection closed', m: 'The connection was unexpectedly closed.', i: '🚪' },
                '-111': { t: 'Pipe routing error', m: 'Failed to route the connection to the host.', i: '🛣️' },
                '-200': { t: 'Certificate Error', m: 'The site provided an invalid security certificate.', i: '🛡️' }
            };
            
            if (codes[e.errorCode.toString()]) {
                errorTitle = codes[e.errorCode.toString()].t;
                errorMsg = codes[e.errorCode.toString()].m;
                errorIcon = codes[e.errorCode.toString()].i;
            }

            const isDark = useUIStore.getState().isForceDark || useUIStore.getState().isIncognito;
            const bgColor = isDark ? '#1a1a1a' : '#f8fafc';
            const textColor = isDark ? '#f1f5f9' : '#0f172a';
            const subTextColor = isDark ? '#94a3b8' : '#64748b';
            const accentColor = '#818cf8';

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${errorTitle}</title>
                    <style>
                        body {
                            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background-color: ${bgColor};
                            color: ${textColor};
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            text-align: center;
                            padding: 20px;
                        }
                        .icon { font-size: 64px; margin-bottom: 24px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
                        h1 { margin: 0 0 16px; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; }
                        p { margin: 0 0 8px; color: ${subTextColor}; max-width: 400px; line-height: 1.5; font-size: 15px; }
                        .error-code { margin-top: 24px; font-size: 12px; font-family: monospace; color: ${subTextColor}; opacity: 0.7; }
                        button {
                            margin-top: 32px;
                            padding: 10px 24px;
                            background-color: ${accentColor};
                            color: white;
                            border: none;
                            border-radius: 99px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: opacity 0.2s, transform 0.2s;
                            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                        }
                        button:hover { opacity: 0.9; transform: translateY(-1px); }
                        button:active { transform: translateY(0); }
                    </style>
                </head>
                <body>
                    <div class="icon">${errorIcon}</div>
                    <h1>${errorTitle}</h1>
                    <p>${errorMsg}</p>
                    <button onclick="window.location.reload()">Try Again</button>
                    <div class="error-code">ERR_CODE: ${e.errorCode} | ${e.errorDescription}</div>
                </body>
                </html>
            `;
            wv.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        };
        const updateNavState = () => {
            try {
                const canBack = typeof wv.canGoBack === 'function' ? wv.canGoBack() : false;
                const canFwd = typeof wv.canGoForward === 'function' ? wv.canGoForward() : false;
                useTabStore.getState().updateTabNavState(tab.id, canBack, canFwd);
            } catch(e) {}
        };

        const handleNavigateSafe = (e) => {
            console.log(`[WebView ${tab.id}] did-navigate:`, e.url);
            wv.hasCrashed = false;
            let displayUrl = e.url;
            if (displayUrl && displayUrl.startsWith('http://127.0.0.1:8080')) {
                displayUrl = displayUrl.replace('http://127.0.0.1:8080', 'qbrowse://ai');
            }
            handleNavigate({ ...e, url: displayUrl });
            updateNavState();
        };
        const handleNavigateInPage = (e) => {
            console.log(`[WebView ${tab.id}] did-navigate-in-page:`, e.url);
            handleNavigateSafe(e);
        };

        const handleIpcMessage = (e) => {
            if (e.channel === 'webview-mouse-nav') {
                const action = e.args && e.args[0];
                if (action === 'back' && wv.canGoBack && wv.canGoBack()) {
                    wv.goBack();
                } else if (action === 'forward' && wv.canGoForward && wv.canGoForward()) {
                    wv.goForward();
                }
            } else if (e.channel === 'media-state-changed') {
                const data = e.args && e.args[0];
                if (data) {
                    useUIStore.getState().setMediaState({
                        tabId: tab.id,
                        ...data
                    });
                    useTabStore.getState().updateTabAudible(tab.id, !!data.isPlaying);
                }
            }
        };

        const handleMediaPlay = () => useTabStore.getState().updateTabAudible(tab.id, true);
        const handleMediaPause = () => useTabStore.getState().updateTabAudible(tab.id, false);
        
        const handleDidStartLoading = () => console.log(`[WebView ${tab.id}] did-start-loading`);
        const handleDidStopLoading = (e) => {
            console.log(`[WebView ${tab.id}] did-stop-loading`);
            handleStopLoading(e);
            updateNavState();
        };
        const handleFailLoadLogged = (e) => {
            console.error(`[WebView ${tab.id}] did-fail-load or crashed. Code:`, e.errorCode, 'Desc:', e.errorDescription, 'URL:', e.validatedURL);
            handleFailLoad(e);
            updateNavState();
        };
        const handleConsoleMessage = (e) => {
            if (e.level === 2) {
                console.warn(`[WebView ${tab.id}] CONSOLE:`, e.message);
            } else if (e.level === 3) {
                console.error(`[WebView ${tab.id}] CONSOLE:`, e.message);
            }
        };

        wv.addEventListener('did-start-loading', handleDidStartLoading);
        wv.addEventListener('did-navigate', handleNavigateSafe);
        wv.addEventListener('did-navigate-in-page', handleNavigateInPage);
        wv.addEventListener('did-fail-load', handleFailLoadLogged);
        wv.addEventListener('crashed', handleFailLoadLogged);
        wv.addEventListener('plugin-crashed', handleFailLoadLogged);
        wv.addEventListener('page-title-updated', handleTitleUpdate);
        wv.addEventListener('dom-ready', () => { handleDomReady(); updateNavState(); });
        wv.addEventListener('did-stop-loading', handleDidStopLoading);
        wv.addEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);
        wv.addEventListener('leave-html-full-screen', handleLeaveHtmlFullScreen);
        wv.addEventListener('media-started-playing', handleMediaPlay);
        wv.addEventListener('media-paused', handleMediaPause);
        wv.addEventListener('console-message', handleConsoleMessage);
        wv.addEventListener('ipc-message', handleIpcMessage);

        return () => {
            if (captureInterval) clearInterval(captureInterval);
            wv.removeEventListener('did-start-loading', handleDidStartLoading);
            wv.removeEventListener('did-navigate', handleNavigateSafe);
            wv.removeEventListener('did-navigate-in-page', handleNavigateInPage);
            wv.removeEventListener('did-fail-load', handleFailLoadLogged);
            wv.removeEventListener('crashed', handleFailLoadLogged);
            wv.removeEventListener('page-title-updated', handleTitleUpdate);
            wv.removeEventListener('dom-ready', handleDomReady);
            wv.removeEventListener('did-stop-loading', handleDidStopLoading);
            wv.removeEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);
            wv.removeEventListener('leave-html-full-screen', handleLeaveHtmlFullScreen);
            wv.removeEventListener('media-started-playing', handleMediaPlay);
            wv.removeEventListener('media-paused', handleMediaPause);
            wv.removeEventListener('console-message', handleConsoleMessage);
            wv.removeEventListener('plugin-crashed', handleFailLoadLogged);
            wv.removeEventListener('ipc-message', handleIpcMessage);
        };
    }, [isActive, isSpaceActive, setSpaceTabs, tab.id]);

    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const handleBeforeInput = (e) => {
            if (e.type !== 'keyDown') return;
            if ((e.control || e.meta) && e.key.toLowerCase() === 'r') {
                try { wv.reload(); } catch(err) {}
            }
            // Fullscreen controls
            if (e.key === 'F11') {
                const isFs = useUIStore.getState().isFullscreen;
                if (window.electronAPI && window.electronAPI.setFullscreen) {
                    window.electronAPI.setFullscreen(!isFs);
                }
                useUIStore.getState().setIsFullscreen(!isFs);
                return;
            }
            if (e.key === 'Escape' && useUIStore.getState().isFullscreen) {
                if (window.electronAPI && window.electronAPI.setFullscreen) {
                    window.electronAPI.setFullscreen(false);
                }
                useUIStore.getState().setIsFullscreen(false);
                return;
            }

            // Dispatch global shortcuts back to the window
            const event = new KeyboardEvent('keydown', {
                key: e.key,
                code: e.code,
                bubbles: true,
                cancelable: true,
                ctrlKey: e.control,
                metaKey: e.meta,
                shiftKey: e.shift,
                altKey: e.alt,
            });
            window.dispatchEvent(event);
        };

        wv.addEventListener('before-input-event', handleBeforeInput);
        return () => {
            wv.removeEventListener('before-input-event', handleBeforeInput);
        };
    }, []);
    
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

    // Smart Force Dark Mode Engine (Detects white sites and inverts, leaves native dark sites untouched)
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const exclusions = darkExclusions || [];
        const isExcluded = exclusions.some(domain => tab.url && typeof tab.url === 'string' && tab.url.includes(domain));

        const applySmartDark = () => {
            if (!isForceDark || isExcluded) {
                try {
                    wv.executeJavaScript(`
                        (() => {
                            const styleEl = document.getElementById('qbrowse-smart-dark-style');
                            if (styleEl) styleEl.remove();
                            document.documentElement.classList.remove('qbrowse-smart-dark-active');
                        })();
                    `).catch(() => {});
                } catch(e) {}
                return;
            }

            try {
                wv.executeJavaScript(`
                    (() => {
                        try {
                            let styleEl = document.getElementById('qbrowse-smart-dark-style');
                            if (!styleEl) {
                                styleEl = document.createElement('style');
                                styleEl.id = 'qbrowse-smart-dark-style';
                                styleEl.textContent = \`
                                    html.qbrowse-smart-dark-active {
                                        filter: invert(0.92) hue-rotate(180deg) !important;
                                        background-color: #121214 !important;
                                    }
                                    html.qbrowse-smart-dark-active img,
                                    html.qbrowse-smart-dark-active video,
                                    html.qbrowse-smart-dark-active iframe,
                                    html.qbrowse-smart-dark-active canvas,
                                    html.qbrowse-smart-dark-active svg,
                                    html.qbrowse-smart-dark-active [style*="background-image"] {
                                        filter: invert(1.08) hue-rotate(180deg) !important;
                                    }
                                \`;
                                (document.head || document.documentElement).appendChild(styleEl);
                            }

                            const parseRGB = (str) => {
                                if (!str) return null;
                                const m = str.match(/\\d+/g);
                                return m && m.length >= 3 ? m.slice(0, 3).map(Number) : null;
                            };

                            const getLuminance = (rgb) => {
                                if (!rgb) return 1;
                                return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
                            };

                            const bodyStyle = window.getComputedStyle(document.body);
                            const docStyle = window.getComputedStyle(document.documentElement);
                            const bodyBg = parseRGB(bodyStyle.backgroundColor);
                            const docBg = parseRGB(docStyle.backgroundColor);

                            const bodyLum = bodyBg ? getLuminance(bodyBg) : 1;
                            const docLum = docBg ? getLuminance(docBg) : 1;

                            // If site is natively dark (luminance < 0.42), do NOT invert!
                            const isNativelyDark = (bodyBg && bodyLum < 0.42) || (docBg && docLum < 0.42);

                            if (!isNativelyDark) {
                                document.documentElement.classList.add('qbrowse-smart-dark-active');
                            } else {
                                document.documentElement.classList.remove('qbrowse-smart-dark-active');
                            }
                        } catch(e) {}
                    })();
                `).catch(() => {});
            } catch(e) {}
        };

        if (isDomReadyRef.current) {
            applySmartDark();
        } else {
            const onReady = () => {
                applySmartDark();
                wv.removeEventListener('dom-ready', onReady);
            };
            wv.addEventListener('dom-ready', onReady);
        }

    }, [isForceDark, tab.url, darkExclusions]);

    const isFlagsPage = tab.url && (tab.url.startsWith('qbrowse://flags') || tab.url.startsWith('chrome://flags') || tab.url.startsWith('about:flags'));

    if (isFlagsPage) {
        return (
            <div className="w-full absolute inset-0 bg-[#0a0a0c] transition-opacity duration-300" style={{ 
                zIndex: isVisible ? 10 : -1,
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none'
            }}>
                <FlagsPage />
            </div>
        );
    }

    return (
        <div className={`w-full absolute bg-transparent transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`} style={{ 
            top: '0px',
            left: '0px',
            width: '100%',
            height: '100%',
            zIndex: isVisible ? 10 : -1,
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
        }}>
            <webview
                ref={wvRef}
                id={`webview-${tab.id}`}
                src={initialUrl}
                className="w-full h-full"
                style={{ display: 'flex' }}
                allowpopups="true"
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
                webpreferences="autoplayPolicy=no-user-gesture-required"
            />
        </div>
    );
};

export default function WebViewContainer({ space, targetTabId, isSplitPane = false }) {
  const { 
    privateTabs, workTabs, ghostTabs, activeSpace,
    setPrivateTabs, setWorkTabs, setGhostTabs
  } = useTabStore();
  const { isSidebarHidden, isRightPanelOpen, isFullscreen, isSplitView, splitRightTabId, zoomLevel, showSwitcher, currentUrl, isForceDark, darkExclusions } = useUIStore();

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

  const activeTab = targetTabId 
    ? spaceTabs.find(t => t.id === targetTabId) 
    : spaceTabs.find(t => t.active);

  const containerRef = useRef(null);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {spaceTabs.map(tab => {
          if (tab.url === undefined || tab.suspended) return null;
          
          // If this is the left container in split view, don't render the right split tab
          if (!isSplitPane && isSplitView && splitRightTabId && tab.id === splitRightTabId) {
              return null;
          }
          // If this is the right container in split view, only render the targetTabId
          if (isSplitPane && targetTabId && tab.id !== targetTabId) {
              return null;
          }

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
