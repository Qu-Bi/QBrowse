import React, { useEffect, useRef, useState } from 'react';
import useTabStore from '../../store/useTabStore';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import useVaultStore, { extractDomain } from '../../store/useVaultStore';
import useProfileStore from '../../store/useProfileStore';
import useTorStore from '../../store/useTorStore';
import { useAnnotationStore, normalizeAnnotationUrl } from '../../store/useAnnotationStore';
import { handleEscapeDismissal } from '../../hooks/useGlobalShortcuts';
import { checkIsArticle, CHECK_ARTICLE_DOM_SCRIPT } from '../../utils/readerExtractor';
import FlagsPage from '../pages/FlagsPage';
import DrmHandOffBanner from '../features/DrmHandOffBanner';

// We extract WebViewItem so we can freeze its initial URL 
// and use imperative loadURL() to avoid React src update bugs
const WebViewItem = ({ tab, space, activeProfileId, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions }) => {
    const wvRef = useRef(null);
    const isInternalNavigation = useRef(false);
    const isDomReadyRef = useRef(false);
    const torSecurityLevel = useTorStore(state => state.securityLevel);
    const torStatus = useTorStore(state => state.status);
    const torBootstrapProgress = useTorStore(state => state.bootstrapProgress);
    const isVaultUnlocked = useVaultStore(state => state.isUnlocked);
    const vaultPasswords = useVaultStore(state => state.passwords);
    const allowVaultInGhostTor = useVaultStore(state => state.allowVaultInGhostTor);

    const [isDrmDismissed, setIsDrmDismissed] = useState(false);
    const [genericDrmError, setGenericDrmError] = useState(null);
    const prevHostRef = useRef('');

    useEffect(() => {
        try {
            const currentHost = tab.url ? new URL(tab.url).hostname : '';
            if (currentHost !== prevHostRef.current) {
                prevHostRef.current = currentHost;
                setIsDrmDismissed(false);
                setGenericDrmError(null);
            }
        } catch (_) {}
    }, [tab.url]);

    const [initialUrl] = useState(() => {
        let u = tab.url;
        if (!u || u === 'about:blank') return 'about:blank';
        if (space === 'tor' && useTorStore.getState().status !== 'connected') {
            return 'about:blank';
        }
        if (u.startsWith('qbrowse://ai')) {
            return u.replace('qbrowse://ai', 'http://127.0.0.1:8080');
        }
        if (!u.includes('://')) {
            return `https://${u}`;
        }
        return u;
    });

    // Track the URL currently being loaded or displayed so we never initiate duplicate loadURL calls
    const currentRequestedUrlRef = useRef(initialUrl);

    const showSwitcher = useUIStore(state => state.showSwitcher);
    useEffect(() => {
        if (showSwitcher && isActive && isSpaceActive && wvRef.current && isDomReadyRef.current && !tab.isClosing && tab.url && tab.url !== 'about:blank') {
            try {
                wvRef.current.capturePage().then(img => {
                    if (!img) return;
                    const thumbnail = img.toDataURL();
                    setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                    useTabStore.getState().updateTabThumbnail(tab.id, thumbnail);
                }).catch(() => {});
            } catch(e) {}
        }
    }, [showSwitcher, isActive, isSpaceActive, setSpaceTabs, tab.id, tab.isClosing, tab.url]);

    // Push matching credentials to webview when vault unlocks or URL/space changes
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv || !isDomReadyRef.current || !tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://')) return;
        const vaultState = useVaultStore.getState();
        const isGhostOrTor = space === 'ghost' || space === 'tor';
        if (isGhostOrTor && !vaultState.allowVaultInGhostTor) {
            try { wv.send('qvault-matching-credentials', []); } catch(_) {}
            return;
        }
        if (!vaultState.isUnlocked) {
            try { wv.send('qvault-matching-credentials', []); } catch(_) {}
            return;
        }
        const matches = vaultState.getMatchingCredentials(tab.url);
        try {
            wv.send('qvault-matching-credentials', matches);
        } catch (_) {}
    }, [isVaultUnlocked, vaultPasswords, allowVaultInGhostTor, tab.url, space]);

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

    // Handle navigations from Omnibox and Tor connection
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        if (isInternalNavigation.current) {
            isInternalNavigation.current = false;
            return;
        }

        // If the tab is an empty new tab or about:blank, do not perform any web navigation
        if (!tab.url || tab.url === '' || tab.url === 'about:blank') {
            return;
        }

        // In Tor space, wait until Tor is connected before loading destination
        if (space === 'tor' && torStatus !== 'connected') {
            return;
        }

        let targetUrl = tab.url;
        if (!targetUrl.includes('://')) {
            targetUrl = `https://${targetUrl}`;
        }
        
        let actualLoadUrl = targetUrl;
        if (actualLoadUrl.startsWith('qbrowse://ai')) {
            actualLoadUrl = actualLoadUrl.replace('qbrowse://ai', 'http://127.0.0.1:8080');
        }

        // If we already requested this URL, do not trigger a duplicate loadURL call
        if (currentRequestedUrlRef.current === actualLoadUrl) {
            return;
        }

        currentRequestedUrlRef.current = actualLoadUrl;

        const doLoad = () => {
            if (!wv || !isDomReadyRef.current) return;
            try {
                if (typeof wv.getURL === 'function') {
                    const currentWvUrl = wv.getURL();
                    if (currentWvUrl === actualLoadUrl || currentWvUrl === actualLoadUrl + '/') {
                        return;
                    }
                }
                if (typeof wv.loadURL === 'function') {
                    wv.loadURL(actualLoadUrl).catch(() => {});
                }
            } catch (e) {
                // Ignore
            }
        };

        if (isDomReadyRef.current && typeof wv.loadURL === 'function') {
            doLoad();
        } else {
            wv.addEventListener('dom-ready', doLoad, { once: true });
        }
    }, [tab.url, torStatus, space]);

    // Setup Webview Event Listeners
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const defaultFallbackTitle = space === 'ghost' ? 'New Incognito Tab' : 'New Tab';

        const handleNavigate = (e) => {
            if (!e.url || e.url === 'about:blank') return;
            isInternalNavigation.current = true;
            currentRequestedUrlRef.current = e.url;
            setSpaceTabs(prev => {
                const currentTab = prev.find(t => t.id === tab.id);
                if (currentTab && currentTab.url !== e.url) {
                    const history = currentTab.history || [];
                    const currentIdx = currentTab.historyIndex !== undefined ? currentTab.historyIndex : -1;
                    const newHistory = [...history.slice(0, currentIdx + 1), e.url];
                    const targetTitle = (e.url === 'about:blank' || !e.url) ? defaultFallbackTitle : (currentTab.title || defaultFallbackTitle);
                    return prev.map(t => t.id === tab.id ? { ...t, url: e.url, title: targetTitle, history: newHistory, historyIndex: newHistory.length - 1 } : t);
                }
                return prev;
            });
            if (isActive && isSpaceActive) {
                useUIStore.getState().setCurrentUrl(e.url);
                useUIStore.getState().setIsReaderAvailable(false);
                if (useUIStore.getState().isReaderOpen) {
                    useUIStore.getState().closeReaderMode();
                }
                scheduleReaderChecks();
            }
            if (e.url !== 'about:blank' && space !== 'ghost') {
                useHistoryStore.getState().addEntry(e.url, e.url); // Initial entry without title
            }
        };

        const handleTitleUpdate = (e) => {
            const rawTitle = e.title ? e.title.trim() : '';
            const newTitle = (rawTitle && rawTitle !== 'about:blank') ? rawTitle : defaultFallbackTitle;
            setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: newTitle } : t));
            let currentUrl = '';
            try {
                if (wvRef.current && isDomReadyRef.current && typeof wvRef.current.getURL === 'function') {
                    currentUrl = wvRef.current.getURL();
                }
            } catch (_) {}
            if (currentUrl && currentUrl !== 'about:blank' && space !== 'ghost') {
                useHistoryStore.getState().updateLatestTitle(currentUrl, newTitle);
            }
        };
        
        const checkReaderAvailability = () => {
            if (!isActive || !isSpaceActive || !wv || !isDomReadyRef.current || wv.hasCrashed || tab.isClosing) return;
            let currentUrl = tab.url || '';
            try {
                if (isDomReadyRef.current && typeof wv.getURL === 'function') {
                    const u = wv.getURL();
                    if (u) currentUrl = u;
                }
            } catch (_) {}

            if (!currentUrl || currentUrl === '' || currentUrl === 'about:blank' || currentUrl.startsWith('qbrowse://')) {
                useUIStore.getState().setIsReaderAvailable(false);
                return;
            }

            try {
                if (isDomReadyRef.current && typeof wv.executeJavaScript === 'function') {
                    wv.executeJavaScript(CHECK_ARTICLE_DOM_SCRIPT).then(isArticle => {
                        if (isActive && isSpaceActive) {
                            useUIStore.getState().setIsReaderAvailable(!!isArticle);
                        }
                    }).catch(() => {
                        if (isActive && isSpaceActive) {
                            useUIStore.getState().setIsReaderAvailable(false);
                        }
                    });
                }
            } catch(e) {}
        };

        const scheduleReaderChecks = () => {
            if (!isActive || !isSpaceActive) return;
            [150, 600, 1500, 3000].forEach(delay => {
                setTimeout(() => {
                    if (isActive && isSpaceActive) {
                        checkReaderAvailability();
                    }
                }, delay);
            });
        };

        const sendAnnotationsToWebview = () => {
            if (!wv || !isDomReadyRef.current || !tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://')) return;
            try {
                const annotations = useAnnotationStore.getState().getAnnotationsForUrl(tab.url, space);
                wv.send('qbrowse-apply-annotations', annotations);
            } catch (_) {}
        };

        const sendVaultMatchesToWebview = () => {
            if (!wv || !isDomReadyRef.current || !tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://')) return;
            try {
                const vaultState = useVaultStore.getState();
                const isGhostOrTor = space === 'ghost' || space === 'tor';
                if (isGhostOrTor && !vaultState.allowVaultInGhostTor) {
                    wv.send('qvault-matching-credentials', []);
                    return;
                }
                if (!vaultState.isUnlocked) {
                    wv.send('qvault-matching-credentials', []);
                    return;
                }
                const matches = vaultState.getMatchingCredentials(tab.url);
                wv.send('qvault-matching-credentials', matches);
            } catch (_) {}
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

            sendAnnotationsToWebview();
            sendVaultMatchesToWebview();

            if (isActive && isSpaceActive) {
                scheduleReaderChecks();
            }
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
        if (isActive && isSpaceActive && !tab.isClosing && tab.url && tab.url !== 'about:blank') {
            captureInterval = setInterval(() => {
                if (!wv || !isDomReadyRef.current || wv.hasCrashed || tab.isClosing) return;
                try {
                    if (typeof wv.isLoading === 'function' && wv.isLoading()) return;
                    wv.capturePage().then(img => {
                        if (!img || tab.isClosing) return;
                        const thumbnail = img.toDataURL();
                        setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                    }).catch(()=>{});
                } catch(e) {}
            }, 10000);
        }

        const handleStopLoading = () => {
            if (isActive && isSpaceActive && !wv.hasCrashed && !tab.isClosing && tab.url && tab.url !== 'about:blank') {
                try {
                    wv.capturePage().then(img => {
                        if (!img || tab.isClosing) return;
                        const thumbnail = img.toDataURL();
                        setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                    }).catch(()=>{});
                } catch(e) {}

                // Check Reader Mode availability for active tab
                checkReaderAvailability();

                sendAnnotationsToWebview();
            }
        };

        const handleFailLoad = (e) => {
            if (!e.isMainFrame || e.errorCode === -3) return; // Ignore aborted requests
            if (space === 'tor') {
                const tor = useTorStore.getState();
                if (tor.status !== 'connected') {
                    return; // The bootstrap overlay / offline screen handles the UI
                }
            }
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
            wv.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html)).catch(() => {});
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
            sendVaultMatchesToWebview();
        };
        const handleNavigateInPage = (e) => {
            console.log(`[WebView ${tab.id}] did-navigate-in-page:`, e.url);
            handleNavigateSafe(e);
            if (isActive && isSpaceActive) {
                scheduleReaderChecks();
            }
        };

        const handleIpcMessage = (e) => {
            if (e.channel === 'qbrowse-reader-available') {
                const isArticle = Boolean(e.args && e.args[0]);
                if (isActive && isSpaceActive) {
                    useUIStore.getState().setIsReaderAvailable(isArticle);
                }
            } else if (e.channel === 'webview-mouse-nav') {
                const action = e.args && e.args[0];
                if (action === 'back' && wv.canGoBack && wv.canGoBack()) {
                    wv.goBack();
                } else if (action === 'forward' && wv.canGoForward && wv.canGoForward()) {
                    wv.goForward();
                }
            } else if (e.channel === 'qbrowse-drm-unsupported') {
                const errorData = e.args && e.args[0];
                setGenericDrmError(errorData || { keySystem: 'widevine' });
            } else if (e.channel === 'webview-zoom-wheel') {
                const delta = e.args && e.args[0];
                if (typeof delta === 'number') {
                    const ui = useUIStore.getState();
                    ui.setZoomLevel(ui.zoomLevel + delta);
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
            } else if (e.channel === 'webauthn-credential-created') {
                const data = e.args && e.args[0];
                if (data) {
                    console.log("[QVault WebAuthn] Received webauthn-credential-created in UI:", data.hostname);
                    useVaultStore.getState().addNewItem({
                        type: 'passkey',
                        title: data.hostname,
                        url: `https://${data.hostname}`,
                        username: data.username || '',
                        passkeyData: {
                            rpId: data.rpId || data.hostname,
                            credentialId: data.credentialId,
                            publicKey: data.publicKey || null,
                            privateKey: data.privateKey || null,
                            created: Date.now()
                        }
                    }).then(() => {
                        console.log("[QVault WebAuthn] Passkey saved successfully to vault for", data.hostname);
                        useUIStore.getState().showToast(`Saved QVault passkey for ${data.hostname}!`);
                    }).catch(err => {
                        console.error("[QVault WebAuthn] Failed to save passkey:", err);
                        useUIStore.getState().showToast(`Failed to save passkey: ${err.message}`, 'error');
                    });
                    if (data.autoOpen) {
                        useUIStore.getState().openPopover('vault');
                    }
                }
            } else if (e.channel === 'webauthn-used') {
                const data = e.args && e.args[0];
                if (data) {
                    useUIStore.getState().showToast(`Signed in to ${data.hostname} using QVault passkey!`);
                }
            } else if (e.channel === 'webauthn-no-passkey') {
                const data = e.args && e.args[0];
                if (data) {
                    useUIStore.getState().showToast(`No QVault passkey found for ${data.hostname}`, 'info');
                }
            } else if (e.channel === 'qbrowse-annotation-create') {
                const annData = e.args && e.args[0];
                if (annData) {
                    useAnnotationStore.getState().addAnnotation({
                        ...annData,
                        space: space || 'personal',
                        url: tab.url,
                        title: tab.title
                    });
                }
            } else if (e.channel === 'qbrowse-annotation-update') {
                const updateData = e.args && e.args[0];
                if (updateData && updateData.id) {
                    useAnnotationStore.getState().updateAnnotation(updateData.id, updateData);
                }
            } else if (e.channel === 'qbrowse-annotation-delete') {
                const deleteId = e.args && (e.args[0]?.id || e.args[0]);
                if (deleteId) {
                    useAnnotationStore.getState().removeAnnotation(deleteId);
                }
            } else if (e.channel === 'qbrowse-selection-contextmenu') {
                const selData = e.args && e.args[0];
                if (selData && wv) {
                    try {
                        const rect = wv.getBoundingClientRect();
                        useUIStore.getState().setContextMenu({
                            x: rect.left + (selData.clientX || 0),
                            y: rect.top + (selData.clientY || 0),
                            hasSelection: !!selData.hasSelection,
                            selectionText: selData.text || '',
                            tabId: tab.id,
                            space
                        });
                    } catch (_) {}
                }
            } else if (e.channel === 'qvault-credentials-submitted') {
                const data = e.args && e.args[0];
                if (data && data.password) {
                    const vaultState = useVaultStore.getState();
                    const domain = extractDomain(data.domain || tab.url);

                    // 1. Never prompt to save in Ghost / Tor spaces for user privacy
                    const isGhostOrTor = space === 'ghost' || space === 'tor';
                    if (isGhostOrTor) {
                        console.log('[QVault] Suppressing save password prompt in private space:', space);
                        return;
                    }

                    // 2. Check never-save domains list
                    if ((vaultState.neverSaveDomains || []).some(d => d === domain)) {
                        console.log('[QVault] Domain excluded from password saving:', domain);
                        return;
                    }

                    // 3. Check if exact credential or updated password exists
                    let isUpdate = false;
                    let existingId = null;
                    if (vaultState.isUnlocked && Array.isArray(vaultState.passwords)) {
                        const existing = vaultState.passwords.find(p => {
                            const pDomain = extractDomain(p.url || p.title);
                            return pDomain === domain && (p.username || '').toLowerCase() === (data.username || '').toLowerCase();
                        });
                        if (existing) {
                            if (existing.password === data.password) {
                                console.log('[QVault] Exact credential already saved in vault, ignoring prompt.');
                                return;
                            }
                            isUpdate = true;
                            existingId = existing.id;
                        }
                    }

                    // 4. Trigger floating Save/Update password banner
                    vaultState.setPendingSavePrompt({
                        tabId: tab.id,
                        domain: domain || data.domain,
                        url: data.url || tab.url,
                        username: data.username || '',
                        password: data.password || '',
                        isUpdate,
                        existingId
                    });
                }
            }
        };

        const handleMediaPlay = () => useTabStore.getState().updateTabAudible(tab.id, true);
        const handleMediaPause = () => useTabStore.getState().updateTabAudible(tab.id, false);
        
        const handleDidStartLoading = () => {
            console.log(`[WebView ${tab.id}] did-start-loading`);
            if (isActive && isSpaceActive) {
                useUIStore.getState().setIsReaderAvailable(false);
            }
        };
        const handleDidStopLoading = (e) => {
            console.log(`[WebView ${tab.id}] did-stop-loading`);
            handleStopLoading(e);
            updateNavState();
        };
        const handleFailLoadLogged = (e) => {
            if (e.errorCode === -3) return;
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

        const handleNewWindow = (e) => {
            console.log(`[WebView ${tab.id}] new-window intercepted:`, e.url);
            try { if (e.preventDefault) e.preventDefault(); } catch(err) {}
            if (e.url && e.url !== 'about:blank') {
                useTabStore.getState().handleNewTab(e.url);
            }
        };

        const handleFoundInPage = (event) => {
            const res = event.result || event;
            if (isActive && isSpaceActive && res) {
                useUIStore.getState().setFindResults({
                    activeMatchOrdinal: res.activeMatchOrdinal || 0,
                    matches: res.matches || 0
                });
            }
        };

        wv.addEventListener('found-in-page', handleFoundInPage);
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
        wv.addEventListener('new-window', handleNewWindow);
        wv.addEventListener('did-create-window', handleNewWindow);

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
            wv.removeEventListener('found-in-page', handleFoundInPage);
            wv.removeEventListener('new-window', handleNewWindow);
            wv.removeEventListener('did-create-window', handleNewWindow);
        };
    }, [isActive, isSpaceActive, setSpaceTabs, tab.id]);

    useEffect(() => {
        if (!isActive) {
            if (wvRef.current && typeof wvRef.current.stopFindInPage === 'function') {
                try {
                    wvRef.current.stopFindInPage('clearSelection');
                } catch(e) {}
            }
            if (useUIStore.getState().isFindOpen) {
                useUIStore.getState().setIsFindOpen(false);
            }
            const ui = useUIStore.getState();
            if (ui.isReaderOpen || ui.isReaderClosing) {
                ui.closeReaderMode(true);
            }
        }
        return () => {
            if (isActive) {
                useUIStore.getState().setIsReaderAvailable(false);
                if (useUIStore.getState().isFindOpen) {
                    useUIStore.getState().setIsFindOpen(false);
                }
            }
        };
    }, [isActive]);

    useEffect(() => {
        if (tab.isClosing && isActive && useUIStore.getState().isFindOpen) {
            useUIStore.getState().setIsFindOpen(false);
        }
    }, [tab.isClosing, isActive]);

    // Re-check Reader Mode availability when this tab becomes the active tab
    useEffect(() => {
        if (!isActive || !isSpaceActive) return;

        // If tab is closing, empty, or an internal page, immediately clear reader availability
        if (tab.isClosing || !tab.url || tab.url === '' || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://')) {
            useUIStore.getState().setIsReaderAvailable(false);
            return;
        }

        if (isDomReadyRef.current) {
            const wv = wvRef.current;
            let currentUrl = tab.url || '';
            try {
                if (wv && typeof wv.getURL === 'function') {
                    const u = wv.getURL();
                    if (u) currentUrl = u;
                }
            } catch (_) {}

            if (!currentUrl || currentUrl === '' || currentUrl === 'about:blank' || currentUrl.startsWith('qbrowse://')) {
                useUIStore.getState().setIsReaderAvailable(false);
                return;
            }
            try {
                if (wv && typeof wv.executeJavaScript === 'function') {
                    wv.executeJavaScript(CHECK_ARTICLE_DOM_SCRIPT).then(isArticle => {
                        if (isActive && isSpaceActive) {
                            useUIStore.getState().setIsReaderAvailable(!!isArticle);
                        }
                    }).catch(() => {
                        if (isActive && isSpaceActive) {
                            useUIStore.getState().setIsReaderAvailable(false);
                        }
                    });
                }
            } catch (_) {}
        } else {
            // DOM not ready yet on an active tab, clear reader availability until detected
            useUIStore.getState().setIsReaderAvailable(false);
        }
    }, [isActive, isSpaceActive, tab.id, tab.url, tab.isClosing]);

    // Live sync annotations when tab, space, or active state changes
    useEffect(() => {
        if (isActive && isSpaceActive && wvRef.current && isDomReadyRef.current) {
            if (!tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://')) return;
            try {
                const annotations = useAnnotationStore.getState().getAnnotationsForUrl(tab.url, space);
                wvRef.current.send('qbrowse-apply-annotations', annotations);
            } catch (_) {}
        }
    }, [tab.url, space, isActive, isSpaceActive]);

    // Live sync annotations when store changes
    useEffect(() => {
        const unsub = useAnnotationStore.subscribe((state) => {
            if (isActive && isSpaceActive && wvRef.current && isDomReadyRef.current && tab.url && tab.url !== 'about:blank') {
                try {
                    const annotations = state.getAnnotationsForUrl(tab.url, space);
                    wvRef.current.send('qbrowse-apply-annotations', annotations);
                } catch (_) {}
            }
        });
        return unsub;
    }, [tab.url, space, isActive, isSpaceActive]);

    // Listen for Jump to Page / Scroll to Annotation requests
    useEffect(() => {
        const handleJump = (event) => {
            const { id, tabId, url } = event.detail || {};
            if (tabId === tab.id || (url && tab.url && normalizeAnnotationUrl(url) === normalizeAnnotationUrl(tab.url))) {
                if (wvRef.current && isDomReadyRef.current) {
                    try {
                        wvRef.current.send('qbrowse-scroll-to-annotation', id);
                    } catch (_) {}
                }
            }
        };
        window.addEventListener('qbrowse-jump-to-annotation', handleJump);
        return () => window.removeEventListener('qbrowse-jump-to-annotation', handleJump);
    }, [tab.id, tab.url]);


    
    // Refresh mechanism
    const isRefreshing = useUIStore(state => state.isRefreshing);
    useEffect(() => {
        if (isRefreshing && isActive && isSpaceActive && wvRef.current) {
            try {
                wvRef.current.reload();
            } catch(e) {}
        }
    }, [isRefreshing, isActive, isSpaceActive]);

    // Smooth Website Zoom Animation
    const currentZoomFactor = useRef(zoomLevel / 100);
    const prevActiveRef = useRef(isActive);
    const prevZoomLevelRef = useRef(zoomLevel);
    const zoomAnimFrameRef = useRef(null);

    useEffect(() => {
        const wv = wvRef.current;
        if (!wv || typeof wv.setZoomFactor !== 'function' || !isActive) {
            prevActiveRef.current = isActive;
            prevZoomLevelRef.current = zoomLevel;
            return;
        }

        const targetFactor = zoomLevel / 100;
        const justBecameActive = !prevActiveRef.current && isActive;
        prevActiveRef.current = isActive;

        // If tab just switched or factor already matches target, apply instantly without animation
        if (justBecameActive || Math.abs(currentZoomFactor.current - targetFactor) < 0.001) {
            currentZoomFactor.current = targetFactor;
            prevZoomLevelRef.current = zoomLevel;
            try {
                wv.setZoomFactor(targetFactor);
            } catch(e) {}
            return;
        }

        // Active tab zoom level changed: smoothly animate factor transition
        if (zoomAnimFrameRef.current) {
            cancelAnimationFrame(zoomAnimFrameRef.current);
            zoomAnimFrameRef.current = null;
        }

        const startFactor = currentZoomFactor.current;
        const duration = 220; // Silky smooth 220ms duration
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Cubic ease-out: 1 - (1 - progress)^3
            const ease = 1 - Math.pow(1 - progress, 3);
            const nextFactor = startFactor + (targetFactor - startFactor) * ease;

            currentZoomFactor.current = nextFactor;
            try {
                wv.setZoomFactor(nextFactor);
            } catch(e) {}

            if (progress < 1) {
                zoomAnimFrameRef.current = requestAnimationFrame(animate);
            } else {
                currentZoomFactor.current = targetFactor;
                try {
                    wv.setZoomFactor(targetFactor);
                } catch(e) {}
                zoomAnimFrameRef.current = null;
            }
        };

        prevZoomLevelRef.current = zoomLevel;
        zoomAnimFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (zoomAnimFrameRef.current) {
                cancelAnimationFrame(zoomAnimFrameRef.current);
                zoomAnimFrameRef.current = null;
            }
        };
    }, [zoomLevel, isActive]);

    // Sync Audio Muting with webview
    useEffect(() => {
        const wv = wvRef.current;
        if (wv && typeof wv.setAudioMuted === 'function') {
            try {
                wv.setAudioMuted(!!tab.isMuted);
            } catch(e) {}
        }
    }, [tab.isMuted]);

    // Smart Force Dark Mode Engine (Detects white sites and inverts, leaves native dark sites untouched)
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const exclusions = darkExclusions || [];
        const isExcluded = exclusions.some(domain => tab.url && typeof tab.url === 'string' && tab.url.includes(domain));

        const applySmartDark = () => {
            if (wv && typeof wv.send === 'function') {
                try {
                    wv.send('apply-smart-dark', { isForceDark, isExcluded });
                } catch(e) {}
            }
        };

        if (isDomReadyRef.current) {
            applySmartDark();
        }
        
        const onNav = () => applySmartDark();
        wv.addEventListener('dom-ready', onNav);
        wv.addEventListener('did-finish-load', onNav);
        wv.addEventListener('did-navigate', onNav);
        wv.addEventListener('did-navigate-in-page', onNav);

        return () => {
            wv.removeEventListener('dom-ready', onNav);
            wv.removeEventListener('did-finish-load', onNav);
            wv.removeEventListener('did-navigate', onNav);
            wv.removeEventListener('did-navigate-in-page', onNav);
        };
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

    const shouldShow = isVisible && !tab.isClosing;

    return (
        <div 
            className={`w-full absolute bg-transparent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                tab.isClosing ? 'webview-closing-anim' : ''
            }`} 
            style={{ 
                top: '0px',
                left: '0px',
                width: '100%',
                height: '100%',
                zIndex: shouldShow ? 10 : -1,
                opacity: shouldShow ? 1 : 0,
                pointerEvents: shouldShow ? 'auto' : 'none'
            }}
        >
            {shouldShow && !tab.isClosing && (
                <DrmHandOffBanner
                    url={tab.url}
                    genericDrmError={genericDrmError}
                    isDismissed={isDrmDismissed}
                    onDismiss={() => setIsDrmDismissed(true)}
                />
            )}
            {space === 'tor' && torStatus !== 'connected' && shouldShow && tab.url && tab.url !== 'about:blank' && (
                <div className="absolute inset-0 z-30 bg-[#0a0a0c] flex flex-col items-center justify-center text-white select-none">
                    <div className={`w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(168,85,247,0.2)] ${torStatus === 'starting' || torStatus === 'downloading' ? 'animate-pulse' : ''}`}>
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                            <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
                            <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
                            <circle cx="12" cy="12" r="1.5"/>
                        </svg>
                    </div>
                    {torStatus === 'starting' || torStatus === 'downloading' ? (
                        <>
                            <h3 className="text-sm font-bold text-white tracking-wide">
                                {torStatus === 'downloading' ? 'Downloading Tor Expert Bundle...' : 'Establishing Tor Circuit...'}
                            </h3>
                            <p className="text-[11px] text-white/50 mt-1 font-mono">
                                {torStatus === 'downloading' ? 'Fetching official bundle...' : `Bootstrapping onion relays (${torBootstrapProgress || 0}%)`}
                            </p>
                            <div className="w-48 h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all duration-300 rounded-full shadow-[0_0_8px_#a855f7]" style={{ width: `${Math.max(10, torBootstrapProgress || 0)}%` }} />
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-sm font-bold text-white tracking-wide">
                                Tor Onion Routing Offline
                            </h3>
                            <p className="text-[12px] text-white/50 mt-1 max-w-sm text-center">
                                Connect to Tor to safely resolve .onion services and route ephemeral traffic.
                            </p>
                            <button
                                onClick={() => useTorStore.getState().startTor()}
                                className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95"
                            >
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                Connect to Tor Network
                            </button>
                        </>
                    )}
                </div>
            )}
            <webview
                ref={wvRef}
                id={`webview-${tab.id}`}
                src={initialUrl}
                partition={space === 'ghost' ? 'ghost' : (space === 'tor' ? 'tor' : `persist:profile_${activeProfileId || 'default'}`)}
                className="w-full h-full"
                style={{ display: 'flex' }}
                allowpopups="true"
                plugins="true"
                webpreferences={space === 'tor' && torSecurityLevel === 'safest' ? "javascript=no,autoplayPolicy=no-user-gesture-required,plugins=no" : "autoplayPolicy=no-user-gesture-required,plugins=yes"}
            />
        </div>
    );
};

export default function WebViewContainer({ space, targetTabId, isSplitPane = false }) {
  const { 
    privateTabs, workTabs, ghostTabs, torTabs, activeSpace,
    setPrivateTabs, setWorkTabs, setGhostTabs, setTorTabs
  } = useTabStore();
  const { isSidebarHidden, isRightPanelOpen, isFullscreen, isSplitView, splitRightTabId, zoomLevel, showSwitcherUI, currentUrl, isForceDark, darkExclusions } = useUIStore();
  const activeProfileId = useProfileStore(state => state.activeProfileId);

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
  } else if (space === 'tor') {
    spaceTabs = torTabs || [];
    setSpaceTabs = setTorTabs;
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
          const isVisible = isActive && isSpaceActive && !showSwitcherUI;

          return (
              <WebViewItem 
                  key={`${activeProfileId || 'default'}-${tab.id}`} 
                  tab={tab} 
                  space={space}
                  activeProfileId={activeProfileId}
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
