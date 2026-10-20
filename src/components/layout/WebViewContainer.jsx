import React, { useEffect, useRef, useState } from 'react';
import useTabStore from '../../store/useTabStore';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';
import useVaultStore, { extractDomain } from '../../store/useVaultStore';
import useProfileStore from '../../store/useProfileStore';
import useTorStore from '../../store/useTorStore';
import { useAnnotationStore, normalizeAnnotationUrl, HIGHLIGHT_COLORS } from '../../store/useAnnotationStore';
import { handleEscapeDismissal } from '../../hooks/useGlobalShortcuts';
import { checkIsArticle, CHECK_ARTICLE_DOM_SCRIPT } from '../../utils/readerExtractor';
import { X, StickyNote, Trash2, Copy, Check } from 'lucide-react';
import FlagsPage from '../pages/FlagsPage';
import LocalFileViewer from '../pages/LocalFileViewer';
import DrmHandOffBanner from '../features/DrmHandOffBanner';
import WebviewErrorOverlay from '../common/WebviewErrorOverlay';
import { buildSearchEngineUrl } from '../../utils/searchEngines';
import { isLikelyDownloadUrl } from '../../utils/downloadHelpers';

const normalizeUrlForCompare = (u) => {
    if (!u) return '';
    try {
        let str = String(u).trim();
        str = str.replace(/\/+$/, '');
        const parsed = new URL(str.includes('://') ? str : `http://${str}`);
        return `${parsed.protocol}//${parsed.hostname.toLowerCase().replace(/^www\./, '')}${parsed.pathname || ''}${parsed.search || ''}`;
    } catch (_) {
        return String(u).toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    }
};

const isSameOrEquivalentUrl = (a, b) => {
    if (!a || !b) return false;
    if (a === b) return true;
    const normA = normalizeUrlForCompare(a);
    const normB = normalizeUrlForCompare(b);
    if (normA === normB) return true;
    const hostA = normA.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const hostB = normB.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return hostA === hostB;
};

// We extract WebViewItem so we can freeze its initial URL 
// and use imperative loadURL() to avoid React src update bugs
const WebViewItem = React.memo(({ tab, space, activeProfileId, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions }) => {
    const wvRef = useRef(null);
    const isDomReadyRef = useRef(false);
    const pendingScrollAnnotationRef = useRef(null);
    const torSecurityLevel = useTorStore(state => state.securityLevel);
    const torStatus = useTorStore(state => state.status);
    const torBootstrapProgress = useTorStore(state => state.bootstrapProgress);
    const isVaultUnlocked = useVaultStore(state => state.isUnlocked);
    const vaultPasswords = useVaultStore(state => state.passwords);
    const allowVaultInGhostTor = useVaultStore(state => state.allowVaultInGhostTor);
    const bypassedInsecureHosts = useTabStore(state => state.bypassedInsecureHosts);
    const allowInsecureHost = useTabStore(state => state.allowInsecureHost);

    const [isDrmDismissed, setIsDrmDismissed] = useState(false);
    const [genericDrmError, setGenericDrmError] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const loadErrorRef = useRef(null);
    const failedUrlsRef = useRef(new Set());
    const [activeNoteCard, setActiveNoteCard] = useState(null);
    const [selectionPill, setSelectionPill] = useState(null);
    const [pillCopied, setPillCopied] = useState(false);
    const activeNoteCardRef = useRef(null);
    activeNoteCardRef.current = activeNoteCard;
    const prevHostRef = useRef('');

    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light' && space !== 'ghost' && space !== 'tor';

    const cleanHost = React.useMemo(() => {
        try {
            if (!tab.url) return '';
            const u = new URL(tab.url.startsWith('http') ? tab.url : `https://${tab.url}`);
            return u.hostname.replace(/^www\./i, '');
        } catch (_) {
            return '';
        }
    }, [tab.url]);

    const isHttpWarning = React.useMemo(() => {
        if (!tab.url || !tab.url.startsWith('http://')) return false;
        try {
            const u = new URL(tab.url);
            if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.onion')) {
                return false;
            }
            const clean = u.hostname.toLowerCase();
            return !bypassedInsecureHosts.has(clean) && !bypassedInsecureHosts.has(clean.replace(/^www\./, ''));
        } catch (_) {
            return false;
        }
    }, [tab.url, bypassedInsecureHosts]);

    const activeError = React.useMemo(() => {
        if (loadError) return loadError;
        if (isHttpWarning) {
            return {
                errorCode: 'HTTP_INSECURE',
                errorDescription: 'ERR_UNENCRYPTED_HTTP',
                validatedURL: tab.url,
                isHttpWarning: true,
                time: Date.now()
            };
        }
        return null;
    }, [loadError, isHttpWarning, tab.url]);

    // Update tab title when error or insecure warning is active
    useEffect(() => {
        if (activeError) {
            const rawUrl = activeError.validatedURL || tab.url || '';
            let hostStr = '';
            try {
                if (rawUrl) {
                    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
                    hostStr = parsed.hostname.replace(/^www\./i, '');
                }
            } catch (_) {
                hostStr = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || '';
            }
            const hostDisplay = hostStr || cleanHost;
            const isCertOrSsl = ['-113', '-107', '-200', '-201', '-202', '-203', '-204', '-205', '-206', '-207', '-208', '-210', '-211', '-212', '-213', '-214', '-217', '-501', '-502'].includes(String(activeError.errorCode));
            const titleText = activeError.errorCode === 'HTTP_INSECURE'
                ? `Insecure HTTP • ${hostDisplay || 'Site'}`
                : (isCertOrSsl
                    ? `Insecure Site • ${hostDisplay || 'Security Warning'}`
                    : `Error • ${hostDisplay || 'Connection Failed'}`);
            if (tab.title !== titleText) {
                useTabStore.getState().updateTabTitle(tab.id, titleText);
            }
        }
    }, [activeError, cleanHost, tab.id, tab.title, tab.url]);

    const handleRetry = () => {
        const target = loadError?.validatedURL || tab.url;
        loadErrorRef.current = null;
        failedUrlsRef.current.clear();
        setLoadError(null);
        const wv = wvRef.current;
        if (wv && target && typeof wv.loadURL === 'function') {
            try {
                wv.loadURL(target).catch(() => {});
            } catch (_) {}
        }
    };

    const handleSearchWeb = () => {
        const rawUrl = activeError?.validatedURL || tab.url || '';
        let query = cleanHost || '';
        if (!query) {
            query = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || '';
        }
        const settings = useUIStore.getState().settings || {};
        const customEngines = settings.customSearchEngines || [];
        const searchEngine = settings.searchEngine || 'google';
        const targetSearchUrl = buildSearchEngineUrl(searchEngine, query || rawUrl, customEngines, space === 'tor');
        loadErrorRef.current = null;
        failedUrlsRef.current.clear();
        setLoadError(null);
        useTabStore.getState().handleNavigateTab(tab.id, targetSearchUrl);
    };

    const handleNavigateHome = () => {
        loadErrorRef.current = null;
        failedUrlsRef.current.clear();
        setLoadError(null);
        const defaultTitle = space === 'ghost' ? 'New Incognito Tab' : 'New Tab';
        useTabStore.getState().handleNavigateTab(tab.id, '', defaultTitle);
        useUIStore.getState().setCurrentUrl('');
        const wv = wvRef.current;
        if (wv && typeof wv.loadURL === 'function') {
            try {
                wv.loadURL('about:blank').catch(() => {});
            } catch (_) {}
        }
    };

    const handleProceedInsecure = async (targetUrl, host) => {
        const rawTarget = targetUrl || loadError?.validatedURL || tab.url;
        let resolvedHost = host;
        if (!resolvedHost && rawTarget) {
            try {
                resolvedHost = new URL(rawTarget.startsWith('http') ? rawTarget : `http://${rawTarget}`).hostname;
            } catch (_) {}
        }
        const hostname = (resolvedHost || cleanHost || '').toLowerCase().trim();
        if (hostname) {
            allowInsecureHost(hostname);
        }
        loadErrorRef.current = null;
        failedUrlsRef.current.clear();
        setLoadError(null);

        // Fallback to http:// if it was an SSL cipher mismatch or handshake failure on https://
        let finalUrl = rawTarget;
        const isSslFailure = loadError && ['-113', '-107', '-502'].includes(String(loadError.errorCode));
        if ((isSslFailure || !finalUrl.startsWith('http://')) && finalUrl && finalUrl.startsWith('https://')) {
            finalUrl = finalUrl.replace(/^https:\/\//i, 'http://');
        } else if (!finalUrl.includes('://')) {
            finalUrl = `http://${finalUrl}`;
        }

        if (finalUrl) {
            setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, url: finalUrl, title: cleanHost || 'Loading...' } : t));
            useTabStore.getState().updateTabState(tab.id, { url: finalUrl, title: cleanHost || 'Loading...' });
            if (isActive && isSpaceActive) {
                useUIStore.getState().setCurrentUrl(finalUrl);
            }
        }

        const wv = wvRef.current;
        if (wv && typeof wv.loadURL === 'function') {
            try {
                wv.loadURL(finalUrl || tab.url).catch(() => {});
            } catch (_) {}
        }
    };

    useEffect(() => {
        if (loadErrorRef.current && isSameOrEquivalentUrl(loadErrorRef.current.validatedURL, tab.url)) {
            return;
        }
        loadErrorRef.current = null;
        setLoadError(null);
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
        if (u.startsWith('qbrowse://')) {
            return 'about:blank';
        }
        // If it's an unencrypted HTTP URL and not yet bypassed, do not load initially — error overlay will render
        if (u.startsWith('http://')) {
            try {
                const host = new URL(u).hostname.toLowerCase();
                const bypassed = useTabStore.getState().bypassedInsecureHosts;
                if (host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.onion')) {
                    if (!bypassed?.has(host) && !bypassed?.has(host.replace(/^www\./, ''))) {
                        return 'about:blank';
                    }
                }
            } catch (_) {}
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
        if (isActive && isSpaceActive && wvRef.current && isDomReadyRef.current && !tab.isClosing && tab.url && tab.url !== 'about:blank' && !tab.url.startsWith('qbrowse://')) {
            const timer = setTimeout(() => {
                const wv = wvRef.current;
                if (!wv || !isActive || tab.isClosing) return;
                try {
                    wv.capturePage().then(img => {
                        if (!img || img.isEmpty()) return;
                        const thumbnail = typeof img.resize === 'function' ? img.resize({ width: 320 }).toDataURL() : img.toDataURL();
                        useTabStore.getState().updateTabThumbnail(tab.id, thumbnail);
                    }).catch(() => {});
                } catch (_) {}
            }, showSwitcher ? 50 : 1200);
            return () => clearTimeout(timer);
        }
    }, [showSwitcher, isActive, isSpaceActive, tab.id, tab.isClosing, tab.url]);

    // Helper to push matching credentials (locked or unlocked) to webview
    const pushVaultMatchesToWebview = async (targetWv = wvRef.current) => {
        const wv = targetWv;
        if (!wv || !isDomReadyRef.current || !tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://')) return;
        const vaultState = useVaultStore.getState();
        const isGhostOrTor = space === 'ghost' || space === 'tor';
        if (isGhostOrTor && !vaultState.allowVaultInGhostTor) {
            try { wv.send('qvault-matching-credentials', []); } catch (_) {}
            return;
        }
        if (vaultState.isUnlocked) {
            const matches = vaultState.getMatchingCredentials(tab.url);
            try {
                wv.send('qvault-matching-credentials', matches);
            } catch (_) {}
        } else {
            try {
                const res = await window.electronAPI?.getMatchingCredentials?.(tab.url);
                const lockedLogins = (res || [])
                    .filter(m => m.itemType !== 'passkey' && !m.passkeyData)
                    .map(m => ({
                        id: m.id,
                        title: m.title || '',
                        url: m.url || '',
                        username: m.username || '',
                        password: '',
                        locked: true
                    }));
                wv.send('qvault-matching-credentials', lockedLogins);
            } catch (_) {}
        }
    };

    // Push matching credentials to webview when vault unlocks or URL/space changes
    useEffect(() => {
        pushVaultMatchesToWebview();
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

        // If the tab is an empty new tab or about:blank, do not perform any web navigation
        if (!tab.url || tab.url === '' || tab.url === 'about:blank') {
            return;
        }

        // Internal pages (Flags, local file viewer, etc.) are handled by React components
        if (tab.url.startsWith('qbrowse://') && !tab.url.startsWith('qbrowse://ai')) {
            return;
        }
        if (tab.url.startsWith('file://')) {
            return;
        }

        // If there's an active load error for this URL or it recently failed, do NOT trigger duplicate loadURL loop
        if (loadErrorRef.current && isSameOrEquivalentUrl(loadErrorRef.current.validatedURL, tab.url)) {
            return;
        }
        if (failedUrlsRef.current.has(normalizeUrlForCompare(tab.url))) {
            return;
        }

        // If this URL is an unencrypted HTTP URL and not yet bypassed, do NOT load it in webview yet!
        // The HTTP Security Warning interstitial will be rendered instead.
        if (isHttpWarning) {
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

        // Check if the webview is already displaying or loading this exact URL
        let currentWvUrl = '';
        try {
            if (typeof wv.getURL === 'function') {
                currentWvUrl = wv.getURL();
            }
        } catch (_) {}

        if (currentWvUrl && (currentWvUrl === actualLoadUrl || currentWvUrl === actualLoadUrl + '/')) {
            currentRequestedUrlRef.current = actualLoadUrl;
            return;
        }

        currentRequestedUrlRef.current = actualLoadUrl;

        const doLoad = () => {
            if (!wv) return;
            try {
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
    }, [tab.url, torStatus, space, isHttpWarning, loadError]);

    // Setup Webview Event Listeners
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv) return;

        const defaultFallbackTitle = space === 'ghost' ? 'New Incognito Tab' : 'New Tab';

        const handleNavigate = (e) => {
            if (e && e.isMainFrame === false) return;
            if (!e.url || e.url === 'about:blank') return;
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
            if (e.url !== 'about:blank' && space !== 'ghost' && space !== 'tor') {
                useHistoryStore.getState().addEntry(e.url, e.url, space); // Initial entry without title
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
            if (currentUrl && currentUrl !== 'about:blank' && space !== 'ghost' && space !== 'tor') {
                useHistoryStore.getState().updateLatestTitle(currentUrl, newTitle, space);
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
            if (!wv || !isDomReadyRef.current || !tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://') || space === 'ghost' || space === 'tor') return;
            try {
                const annotations = useAnnotationStore.getState().getAnnotationsForUrl(tab.url, space);
                wv.send('qbrowse-apply-annotations', annotations);
                if (pendingScrollAnnotationRef.current) {
                    const pending = pendingScrollAnnotationRef.current;
                    const targetId = typeof pending === 'object' ? pending.id : pending;
                    const annPayload = (typeof pending === 'object' && pending.annotation) 
                        ? pending.annotation 
                        : (annotations.find(a => a.id === targetId) || useAnnotationStore.getState().annotations.find(a => a.id === targetId));
                    setTimeout(() => {
                        try {
                            if (wvRef.current) {
                                wvRef.current.send('qbrowse-scroll-to-annotation', { id: targetId, annotation: annPayload });
                            }
                        } catch (_) {}
                    }, 250);
                }
            } catch (_) {}
        };

        const sendVaultMatchesToWebview = () => {
            pushVaultMatchesToWebview(wv);
        };

        const handleDomReady = () => {
            isDomReadyRef.current = true;
            try {
                useTabStore.getState().setTabNavigatedToDocument(tab.id);
            } catch (_) {}
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
            try {
                wv.send('apply-a11y-settings', useUIStore.getState().settings);
            } catch (_) {}

            if (pendingScrollAnnotationRef.current) {
                const pending = pendingScrollAnnotationRef.current;
                const targetId = typeof pending === 'object' ? pending.id : pending;
                const annPayload = (typeof pending === 'object' && pending.annotation)
                    ? pending.annotation
                    : useAnnotationStore.getState().annotations.find(a => a.id === targetId);
                setTimeout(() => {
                    try {
                        if (wvRef.current) {
                            wvRef.current.send('qbrowse-scroll-to-annotation', { id: targetId, annotation: annPayload });
                        }
                    } catch (_) {}
                }, 350);
            }

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

        const handleStopLoading = () => {
            if (isActive && isSpaceActive && !wv.hasCrashed && !tab.isClosing && tab.url && tab.url !== 'about:blank') {
                try {
                    wv.capturePage().then(img => {
                        if (!img || tab.isClosing) return;
                        const thumbnail = typeof img.resize === 'function' ? img.resize({ width: 320 }).toDataURL() : img.toDataURL();
                        setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, thumbnail } : t));
                        useTabStore.getState().updateTabThumbnail(tab.id, thumbnail);
                    }).catch(()=>{});
                } catch(e) {}

                // Check Reader Mode availability for active tab
                checkReaderAvailability();

                sendAnnotationsToWebview();
            }
        };

        const handleFailLoad = (e) => {
            if (!e || e.errorCode === -3 || e.isMainFrame === false) return; // Ignore aborted requests and subframes
            if (space === 'tor') {
                const tor = useTorStore.getState();
                if (tor.status !== 'connected') {
                    return; // The bootstrap overlay / offline screen handles the UI
                }
            }
            wv.hasCrashed = true;
            const failedUrl = e.validatedURL || tab.url;
            const errObj = {
                errorCode: e.errorCode ?? -1,
                errorDescription: e.errorDescription || 'ERR_FAILED',
                validatedURL: failedUrl,
                time: Date.now()
            };
            loadErrorRef.current = errObj;
            failedUrlsRef.current.add(normalizeUrlForCompare(failedUrl));
            if (tab.url) {
                failedUrlsRef.current.add(normalizeUrlForCompare(tab.url));
            }
            setLoadError(errObj);

            let hostStr = '';
            try {
                if (failedUrl) {
                    const parsed = new URL(failedUrl.startsWith('http') ? failedUrl : `https://${failedUrl}`);
                    hostStr = parsed.hostname.replace(/^www\./i, '');
                }
            } catch (_) {
                hostStr = failedUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || '';
            }
            const isCertOrSsl = ['-113', '-107', '-200', '-201', '-202', '-203', '-204', '-205', '-206', '-207', '-208', '-210', '-211', '-212', '-213', '-214', '-217', '-501', '-502'].includes(String(errObj.errorCode));
            const errorTitle = isCertOrSsl 
                ? `Insecure Site • ${hostStr || 'Security Warning'}`
                : `Error • ${hostStr || 'Connection Failed'}`;

            // Synchronize tab.url, title, and currentUrl so the omnibar and active tab do not stay stuck on the previous page
            if (failedUrl && failedUrl !== 'about:blank') {
                setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, url: failedUrl, title: errorTitle } : t));
                useTabStore.getState().updateTabState(tab.id, { url: failedUrl, title: errorTitle });
                if (isActive && isSpaceActive) {
                    useUIStore.getState().setCurrentUrl(failedUrl);
                }
            }
        };
        const updateNavState = () => {
            try {
                const canBack = typeof wv.canGoBack === 'function' ? wv.canGoBack() : false;
                const canFwd = typeof wv.canGoForward === 'function' ? wv.canGoForward() : false;
                useTabStore.getState().updateTabNavState(tab.id, canBack, canFwd);
            } catch(e) {}
        };

        const handleNavigateSafe = (e) => {
            if (e && e.isMainFrame === false) return;
            console.log(`[WebView ${tab.id}] did-navigate:`, e.url);
            wv.hasCrashed = false;
            loadErrorRef.current = null;
            if (e.url) {
                failedUrlsRef.current.delete(normalizeUrlForCompare(e.url));
            }
            setLoadError(null);
            setActiveNoteCard(null);
            let displayUrl = e.url;
            if (displayUrl && displayUrl.startsWith('http://127.0.0.1:8080')) {
                displayUrl = displayUrl.replace('http://127.0.0.1:8080', 'qbrowse://ai');
            }
            handleNavigate({ ...e, url: displayUrl });
            updateNavState();
            sendVaultMatchesToWebview();
        };
        const handleNavigateInPage = (e) => {
            if (e && e.isMainFrame === false) return;
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
                if (space === 'ghost' || space === 'tor') return;
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
                if (space === 'ghost' || space === 'tor') return;
                const annData = e.args && e.args[0];
                if (annData) {
                    useAnnotationStore.getState().addAnnotation({
                        ...annData,
                        space: space || 'personal',
                        url: annData.url || tab.url,
                        title: annData.title || tab.title
                    });
                }
            } else if (e.channel === 'qbrowse-annotation-update') {
                if (space === 'ghost' || space === 'tor') return;
                const updateData = e.args && e.args[0];
                if (updateData && updateData.id) {
                    useAnnotationStore.getState().updateAnnotation(updateData.id, updateData);
                }
            } else if (e.channel === 'qbrowse-annotation-delete') {
                if (space === 'ghost' || space === 'tor') return;
                const deleteId = e.args && (e.args[0]?.id || e.args[0]);
                if (deleteId) {
                    useAnnotationStore.getState().removeAnnotation(deleteId);
                }
            } else if (e.channel === 'qbrowse-open-note-card') {
                const cardData = e.args && e.args[0];
                if (cardData) {
                    setActiveNoteCard(cardData);
                }
            } else if (e.channel === 'qbrowse-update-note-anchor') {
                const updateData = e.args && e.args[0];
                if (updateData) {
                    setActiveNoteCard(prev => {
                        if (!prev || prev.id !== updateData.id) return prev;
                        return { ...prev, rect: updateData.rect };
                    });
                }
            } else if (e.channel === 'webview-page-clicked') {
                useUIStore.getState().closeContextMenus();
                if (useUIStore.getState().activePopover) {
                    useUIStore.getState().closePopover();
                }
                setSelectionPill(null);
                const currentCard = activeNoteCardRef.current;
                if (currentCard) {
                    const { id, note, color } = currentCard;
                    const noteText = (note || '').trim();
                    const existing = useAnnotationStore.getState().annotations.find(a => a.id === id);
                    if (existing && (existing.note !== noteText || existing.color !== color)) {
                        useAnnotationStore.getState().updateAnnotation(id, { note: noteText, color: color || 'accent' });
                        if (wv) {
                            try { wv.send('qbrowse-annotation-update', { id, note: noteText, color: color || 'accent' }); } catch (_) {}
                        }
                    }
                    setActiveNoteCard(null);
                    if (wv) {
                        try { wv.send('qbrowse-close-note-card'); } catch (_) {}
                    }
                }
            } else if (e.channel === 'qbrowse-show-selection-pill') {
                const pillData = e.args && e.args[0];
                if (pillData && pillData.rect) {
                    setSelectionPill(pillData);
                }
            } else if (e.channel === 'qbrowse-hide-selection-pill') {
                setSelectionPill(null);
            } else if (e.channel === 'qbrowse-close-note-card') {
                const currentCard = activeNoteCardRef.current;
                if (currentCard) {
                    const { id, note, color } = currentCard;
                    const noteText = (note || '').trim();
                    const existing = useAnnotationStore.getState().annotations.find(a => a.id === id);
                    if (existing && (existing.note !== noteText || existing.color !== color)) {
                        useAnnotationStore.getState().updateAnnotation(id, { note: noteText, color: color || 'accent' });
                        if (wv) {
                            try { wv.send('qbrowse-annotation-update', { id, note: noteText, color: color || 'accent' }); } catch (_) {}
                        }
                    }
                }
                setActiveNoteCard(null);
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
            } else if (e.channel === 'extracted-read-aloud-text') {
                const payload = e.args && e.args[0];
                if (payload) {
                    window.dispatchEvent(new CustomEvent('qbrowse-extracted-tts-text', { detail: payload }));
                }
            } else if (e.channel === 'qbrowse-js-dialog') {
                const dialogData = e.args && e.args[0];
                if (dialogData) {
                    const origin = dialogData.origin || tab.url;
                    useUIStore.getState().setActiveDialog({
                        type: dialogData.dialogType || 'alert',
                        message: dialogData.message || '',
                        hostname: dialogData.hostname || extractDomain(tab.url),
                        origin: origin,
                        defaultValue: dialogData.defaultValue || '',
                        hasRepeatSpam: Boolean(dialogData.hasRepeatSpam),
                        webview: wv,
                        onConfirm: (val) => {
                            if (wv) {
                                try {
                                    wv.send('qbrowse-js-dialog-response', {
                                        dialogId: dialogData.dialogId,
                                        confirmed: true,
                                        value: val
                                    });
                                } catch (_) {}
                            }
                        },
                        onCancel: () => {
                            if (wv) {
                                try {
                                    wv.send('qbrowse-js-dialog-response', {
                                        dialogId: dialogData.dialogId,
                                        confirmed: false,
                                        value: null
                                    });
                                } catch (_) {}
                            }
                        }
                    });
                }
            }
        };

        const handleMediaPlay = () => useTabStore.getState().updateTabAudible(tab.id, true);
        const handleMediaPause = () => useTabStore.getState().updateTabAudible(tab.id, false);
        
        const handleDidStartLoading = () => {
            console.log(`[WebView ${tab.id}] did-start-loading`);
            if (loadErrorRef.current && isSameOrEquivalentUrl(loadErrorRef.current.validatedURL, tab.url)) {
                return;
            }
            loadErrorRef.current = null;
            setLoadError(null);
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
            if (!e || e.isMainFrame === false) return;
            if (e.errorCode === -3) {
                // net::ERR_ABORTED: Common when navigation transitions into an external file download
                if (tab.isOpenedByNewWindow || tab.isDownloadTab) {
                    console.log(`[WebView ${tab.id}] Navigation aborted for download, checking orphan tab cleanup.`);
                    useTabStore.getState().closeDownloadTabIfOrphaned({
                        url: tab.url,
                        urlChain: [tab.url],
                        webContentsId: (wv && typeof wv.getWebContentsId === 'function') ? wv.getWebContentsId() : null,
                        canGoBack: false
                    });
                }
                return;
            }
            if (e.errorCode === -302 || (e.validatedURL && window.electronAPI?.isAppProtocol?.(e.validatedURL))) {
                // net::ERR_UNKNOWN_URL_SCHEME (-302): Handled via desktop application protocol handoff
                console.log(`[WebView ${tab.id}] Suppressed ERR_UNKNOWN_URL_SCHEME for app protocol:`, e.validatedURL);
                if (e.validatedURL && window.electronAPI?.openAppProtocol) {
                    window.electronAPI.openAppProtocol(e.validatedURL);
                }
                if (tab.isOpenedByNewWindow) {
                    useTabStore.getState().closeTab(tab.id, space);
                }
                return;
            }
            console.error(`[WebView ${tab.id}] did-fail-load or crashed. Code:`, e.errorCode, 'Desc:', e.errorDescription, 'URL:', e.validatedURL);
            handleFailLoad(e);
            updateNavState();
        };
        const handleConsoleMessage = (e) => {
            // Keep third-party web page errors confined to DevTools unless explicit debug flag is enabled
            if (window.__qbrowseDebugWebviews && e.level === 3) {
                console.error(`[WebView ${tab.id}] CONSOLE:`, e.message);
            }
        };

        const handleNewWindow = (e) => {
            console.log(`[WebView ${tab.id}] new-window intercepted:`, e.url, e.disposition);
            try { if (e.preventDefault) e.preventDefault(); } catch(err) {}
            if (e.url && e.url !== 'about:blank') {
                if (window.electronAPI?.isAppProtocol?.(e.url)) {
                    window.electronAPI.openAppProtocol(e.url);
                    return;
                }
                const isLikelyDownload = isLikelyDownloadUrl(e.url);
                // Direct download files stay in the background so the user's active page is not interrupted
                const makeActive = !isLikelyDownload && (e.disposition !== 'background-tab');
                useTabStore.getState().handleNewTab(e.url, makeActive, {
                    isOpenedByNewWindow: true,
                    openerTabId: tab.id,
                    isDownloadTab: isLikelyDownload
                });
            }
        };

        const handleWillNavigate = (e) => {
            if (e.url && window.electronAPI?.isAppProtocol?.(e.url)) {
                try { if (e.preventDefault) e.preventDefault(); } catch(_) {}
                window.electronAPI.openAppProtocol(e.url);
            }
        };

        const registerWcId = () => {
            try {
                if (wv && typeof wv.getWebContentsId === 'function') {
                    const wcId = wv.getWebContentsId();
                    if (wcId) {
                        useTabStore.getState().setTabWebContentsId(tab.id, wcId);
                    }
                }
            } catch (_) {}
        };
        registerWcId();

        const handleFoundInPage = (event) => {
            const res = event.result || event;
            if (isActive && isSpaceActive && res) {
                useUIStore.getState().setFindResults({
                    activeMatchOrdinal: res.activeMatchOrdinal || 0,
                    matches: res.matches || 0
                });
            }
        };

        const handleContextMenu = (e) => {
            const params = e.params || {};
            const rect = wv.getBoundingClientRect();
            const hasImage = params.mediaType === 'image' || !!params.srcURL;
            const hasSelection = !hasImage && !!(params.selectionText && params.selectionText.trim());

            useUIStore.getState().setContextMenu({
                type: 'webview',
                openedAt: Date.now(),
                x: params.x != null ? params.x : rect.left,
                y: params.y != null ? params.y : rect.top,
                tabId: tab.id,
                space,
                linkURL: params.linkURL || '',
                srcURL: params.srcURL || '',
                mediaType: params.mediaType || 'none',
                hasImage,
                hasSelection,
                selectionText: hasSelection ? params.selectionText.trim() : '',
                isEditable: !!params.isEditable,
                editFlags: params.editFlags || {},
                pageURL: params.pageURL || tab.url,
                title: tab.title,
                canGoBack: typeof wv.canGoBack === 'function' ? wv.canGoBack() : false,
                canGoForward: typeof wv.canGoForward === 'function' ? wv.canGoForward() : false
            });
        };

        wv.addEventListener('did-attach', registerWcId);
        wv.addEventListener('context-menu', handleContextMenu);
        wv.addEventListener('found-in-page', handleFoundInPage);
        wv.addEventListener('did-start-loading', handleDidStartLoading);
        wv.addEventListener('did-navigate', handleNavigateSafe);
        wv.addEventListener('did-navigate-in-page', handleNavigateInPage);
        wv.addEventListener('did-fail-load', handleFailLoadLogged);
        wv.addEventListener('crashed', handleFailLoadLogged);
        wv.addEventListener('plugin-crashed', handleFailLoadLogged);
        wv.addEventListener('page-title-updated', handleTitleUpdate);
        wv.addEventListener('dom-ready', () => { registerWcId(); handleDomReady(); updateNavState(); });
        wv.addEventListener('did-stop-loading', handleDidStopLoading);
        wv.addEventListener('enter-html-full-screen', handleEnterHtmlFullScreen);
        wv.addEventListener('leave-html-full-screen', handleLeaveHtmlFullScreen);
        wv.addEventListener('media-started-playing', handleMediaPlay);
        wv.addEventListener('media-paused', handleMediaPause);
        wv.addEventListener('console-message', handleConsoleMessage);
        wv.addEventListener('ipc-message', handleIpcMessage);
        wv.addEventListener('new-window', handleNewWindow);
        wv.addEventListener('did-create-window', handleNewWindow);
        wv.addEventListener('will-navigate', handleWillNavigate);

        return () => {
            wv.removeEventListener('did-attach', registerWcId);
            wv.removeEventListener('context-menu', handleContextMenu);
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
            wv.removeEventListener('will-navigate', handleWillNavigate);
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
            const { id, tabId, url, annotation } = event.detail || {};
            const matchesTab = tabId && tabId === tab.id;
            const matchesUrl = url && tab.url && (
                normalizeAnnotationUrl(url) === normalizeAnnotationUrl(tab.url) ||
                (typeof tab.url === 'string' && tab.url.includes(url)) ||
                (typeof url === 'string' && url.includes(tab.url))
            );

            if (matchesTab || (matchesUrl && (isActive || !tabId))) {
                const annPayload = annotation || useAnnotationStore.getState().annotations.find(a => a.id === id);
                pendingScrollAnnotationRef.current = { id, annotation: annPayload };

                if (wvRef.current && isDomReadyRef.current) {
                    try {
                        wvRef.current.send('qbrowse-scroll-to-annotation', { id, annotation: annPayload });
                    } catch (_) {}
                }
            }
        };
        window.addEventListener('qbrowse-jump-to-annotation', handleJump);
        return () => window.removeEventListener('qbrowse-jump-to-annotation', handleJump);
    }, [tab.id, tab.url, isActive]);


    
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
            if (wv && typeof wv.getWebContentsId === 'function') {
                try {
                    const wId = wv.getWebContentsId();
                    if (wId && window.electronAPI && typeof window.electronAPI.setWebviewColorScheme === 'function') {
                        window.electronAPI.setWebviewColorScheme(wId, isForceDark && !isExcluded ? 'dark' : 'light');
                    }
                } catch (_) {}
            }
        };

        if (isDomReadyRef.current) {
            applySmartDark();
        }
        
        const onNav = (e) => {
            if (e && e.isMainFrame === false) return;
            applySmartDark();
        };
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

    // Sync Accessibility Settings to webview
    const a11ySettings = useUIStore(state => state.settings);
    useEffect(() => {
        const wv = wvRef.current;
        if (!wv || !isDomReadyRef.current) return;
        try {
            wv.send('apply-a11y-settings', {
                a11yHighContrast: a11ySettings?.a11yHighContrast,
                a11yDyslexiaFont: a11ySettings?.a11yDyslexiaFont,
                a11yMinFontSize: a11ySettings?.a11yMinFontSize,
                a11yReducedMotion: a11ySettings?.a11yReducedMotion,
                a11ySuppressAutoplay: a11ySettings?.a11ySuppressAutoplay,
                a11yCaretBrowsing: a11ySettings?.a11yCaretBrowsing,
                a11yFocusRings: a11ySettings?.a11yFocusRings,
                a11yVideoCaptions: a11ySettings?.a11yVideoCaptions,
                a11yMonoAudio: a11ySettings?.a11yMonoAudio
            });
        } catch (_) {}
    }, [
        a11ySettings?.a11yHighContrast,
        a11ySettings?.a11yDyslexiaFont,
        a11ySettings?.a11yMinFontSize,
        a11ySettings?.a11yReducedMotion,
        a11ySettings?.a11ySuppressAutoplay,
        a11ySettings?.a11yCaretBrowsing,
        a11ySettings?.a11yFocusRings,
        a11ySettings?.a11yVideoCaptions,
        a11ySettings?.a11yMonoAudio
    ]);

    // Handle Read Aloud text extraction request for active tab
    useEffect(() => {
        const handleRequestTts = () => {
            if (isActive && isSpaceActive && wvRef.current) {
                try {
                    wvRef.current.send('extract-read-aloud-text');
                } catch (_) {}
            }
        };
        window.addEventListener('qbrowse-request-tts-extraction', handleRequestTts);
        return () => window.removeEventListener('qbrowse-request-tts-extraction', handleRequestTts);
    }, [isActive, isSpaceActive]);

    const isFlagsPage = tab.url && (tab.url.startsWith('qbrowse://flags') || tab.url.startsWith('chrome://flags') || tab.url.startsWith('about:flags'));
    const isLocalResource = tab.url && tab.url.startsWith('file://') && !/\.(html?|xhtml)$/i.test(tab.url);

    const handleSaveNote = () => {
        if (!activeNoteCard) return;
        const { id, note, color } = activeNoteCard;
        const colorKey = color || 'accent';
        const noteText = (note || '').trim();
        useAnnotationStore.getState().updateAnnotation(id, { note: noteText, color: colorKey });
        if (wvRef.current) {
            wvRef.current.send('qbrowse-annotation-update', { id, note: noteText, color: colorKey });
        }
        setActiveNoteCard(null);
    };

    const handleDeleteNote = () => {
        if (!activeNoteCard) return;
        const { id } = activeNoteCard;
        useAnnotationStore.getState().removeAnnotation(id);
        if (wvRef.current) {
            wvRef.current.send('qbrowse-annotation-delete', id);
        }
        setActiveNoteCard(null);
    };

    const handleNoteColorChange = (newColor) => {
        if (!activeNoteCard) return;
        const { id, note } = activeNoteCard;
        setActiveNoteCard(prev => ({ ...prev, color: newColor }));
        useAnnotationStore.getState().updateAnnotation(id, { color: newColor });
        if (wvRef.current) {
            wvRef.current.send('qbrowse-annotation-update', { id, color: newColor, note: note || '' });
        }
    };

    const handleCloseNoteCard = () => {
        const card = activeNoteCardRef.current || activeNoteCard;
        if (card) {
            const { id, note, color } = card;
            const noteText = (note || '').trim();
            const existing = useAnnotationStore.getState().annotations.find(a => a.id === id);
            if (existing && (existing.note !== noteText || existing.color !== color)) {
                useAnnotationStore.getState().updateAnnotation(id, { note: noteText, color: color || 'accent' });
                if (wvRef.current) {
                    wvRef.current.send('qbrowse-annotation-update', { id, note: noteText, color: color || 'accent' });
                }
            }
        }
        setActiveNoteCard(null);
        if (wvRef.current) {
            wvRef.current.send('qbrowse-close-note-card');
        }
    };

    const handlePillHighlight = (colorKey) => {
        if (wvRef.current) {
            try {
                wvRef.current.send('qbrowse-pill-create-highlight', { color: colorKey });
            } catch (_) {}
        }
        setSelectionPill(null);
    };

    const handlePillAddNote = () => {
        if (wvRef.current) {
            try {
                wvRef.current.send('qbrowse-pill-add-note');
            } catch (_) {}
        }
        setSelectionPill(null);
    };

    const handlePillCopy = (e) => {
        e.stopPropagation();
        if (selectionPill?.text) {
            try {
                navigator.clipboard.writeText(selectionPill.text);
                setPillCopied(true);
                setTimeout(() => {
                    setPillCopied(false);
                    setSelectionPill(null);
                }, 600);
            } catch (_) {
                setSelectionPill(null);
            }
        }
    };

    // Dismiss selection pill when clicking outside on the host window
    useEffect(() => {
        if (!selectionPill) return;
        const handleHostDismiss = (e) => {
            if (e.target && e.target.closest && e.target.closest('#qbrowse-highlight-pill')) return;
            setSelectionPill(null);
        };
        window.addEventListener('mousedown', handleHostDismiss, true);
        return () => window.removeEventListener('mousedown', handleHostDismiss, true);
    }, [selectionPill]);

    const containerW = wvRef.current?.clientWidth || 800;
    const containerH = wvRef.current?.clientHeight || 600;

    const cardTop = activeNoteCard?.rect 
        ? Math.max(10, Math.min(activeNoteCard.rect.bottom + 8, containerH - 240))
        : 10;
    const cardLeft = activeNoteCard?.rect
        ? Math.max(12, Math.min(activeNoteCard.rect.left, containerW - 340))
        : 12;

    const pillTop = selectionPill?.rect
        ? (selectionPill.rect.top < 52
            ? Math.max(10, Math.min(selectionPill.rect.bottom + 8, containerH - 46))
            : Math.max(10, Math.min(selectionPill.rect.top - 44, containerH - 46)))
        : 10;
    const pillLeft = selectionPill?.rect
        ? Math.max(12, Math.min(selectionPill.rect.left + (selectionPill.rect.width / 2) - 115, containerW - 245))
        : 12;

    const shouldShow = isVisible && !tab.isClosing;

    return (
        <div 
            className={`w-full absolute bg-transparent transition-opacity duration-200 ${
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
            {shouldShow && !tab.isClosing && !isFlagsPage && !isLocalResource && (
                <DrmHandOffBanner
                    url={tab.url}
                    genericDrmError={genericDrmError}
                    isDismissed={isDrmDismissed}
                    onDismiss={() => setIsDrmDismissed(true)}
                />
            )}
            {space === 'tor' && torStatus !== 'connected' && shouldShow && tab.url && tab.url !== 'about:blank' && !isFlagsPage && !isLocalResource && (
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
            {isFlagsPage && shouldShow && (
                <div className="w-full h-full absolute inset-0 z-20 bg-[#0a0a0c]">
                    <FlagsPage />
                </div>
            )}
            {isLocalResource && shouldShow && (
                <div className="w-full h-full absolute inset-0 z-20 overflow-hidden">
                    <LocalFileViewer tab={tab} />
                </div>
            )}
            {activeError && shouldShow && !isFlagsPage && !isLocalResource && (
                <WebviewErrorOverlay
                    error={activeError}
                    tab={tab}
                    isBright={isBright}
                    onRetry={handleRetry}
                    onSearchWeb={handleSearchWeb}
                    onNavigateHome={handleNavigateHome}
                    onProceedInsecure={handleProceedInsecure}
                />
            )}
            <webview
                ref={wvRef}
                id={`webview-${tab.id}`}
                src={initialUrl}
                partition={space === 'ghost' ? 'ghost' : (space === 'tor' ? 'tor' : `persist:profile_${activeProfileId || 'default'}`)}
                className="w-full h-full"
                style={{ display: 'flex', visibility: shouldShow && !isFlagsPage && !isLocalResource && !activeError ? 'visible' : 'hidden' }}
                allowpopups="true"
                plugins="true"
                webpreferences={space === 'tor' && torSecurityLevel === 'safest' ? "javascript=no,autoplayPolicy=no-user-gesture-required,plugins=no" : "autoplayPolicy=no-user-gesture-required,plugins=yes"}
            />
            {activeNoteCard && shouldShow && (
                <>
                    <div
                        className="fixed inset-0 z-[99990] bg-transparent cursor-default select-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCloseNoteCard();
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            handleCloseNoteCard();
                        }}
                    />
                    <div
                        id="qbrowse-sticky-note-card"
                        className="absolute z-[99999] w-[320px] bg-[#0c0c0f]/94 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.08)] p-3.5 text-white flex flex-col gap-2.5 animate-pop-in select-none"
                        style={{
                            top: `${cardTop}px`,
                            left: `${cardLeft}px`
                        }}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <StickyNote size={13} className="text-accent" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 font-mono">Sticky Note</span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-1">
                                    {Object.keys(HIGHLIGHT_COLORS).map(key => {
                                        const col = HIGHLIGHT_COLORS[key];
                                        const isSelected = (activeNoteCard.color || 'accent') === key;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handleNoteColorChange(key)}
                                                className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer border ${isSelected ? 'border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-white/20 hover:scale-110'}`}
                                                style={{ backgroundColor: col.border }}
                                                title={col.label}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                onClick={handleCloseNoteCard}
                                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer text-xs flex items-center justify-center"
                                title="Close (Esc)"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        {/* Textarea */}
                        <textarea
                            autoFocus
                            value={activeNoteCard.note || ''}
                            onChange={e => setActiveNoteCard(prev => ({ ...prev, note: e.target.value }))}
                            onKeyDown={e => {
                                if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    handleCloseNoteCard();
                                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveNote();
                                }
                            }}
                            placeholder="Type your note, thought, or takeaway..."
                            className="w-full h-24 bg-white/[0.03] focus:bg-white/[0.06] border border-white/[0.08] focus:border-accent/60 rounded-xl p-2.5 text-xs text-white/90 resize-none outline-none transition placeholder-white/30 font-sans leading-relaxed focus:shadow-[0_0_15px_rgba(212,163,115,0.15)] custom-scrollbar"
                        />

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-0.5">
                            <button
                                onClick={handleDeleteNote}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                            >
                                <Trash2 size={12} />
                                <span>Delete</span>
                            </button>
                            <button
                                onClick={handleSaveNote}
                                className="bg-accent hover:opacity-90 text-black px-4 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer shadow-sm active:scale-95"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </>
            )}
            {/* Floating Selection Highlight Pill */}
            {selectionPill && shouldShow && (
                <div
                    id="qbrowse-highlight-pill"
                    className="absolute z-[99998] flex items-center gap-1.5 px-3 py-1.5 bg-[#0c0c0f]/94 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.08)] animate-pop-in select-none text-white font-sans"
                    style={{
                        top: `${pillTop}px`,
                        left: `${pillLeft}px`
                    }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                >
                    {/* 5 Color Dots */}
                    <div className="flex items-center gap-1.5">
                        {Object.keys(HIGHLIGHT_COLORS).map(key => {
                            const col = HIGHLIGHT_COLORS[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => handlePillHighlight(key)}
                                    title={`Highlight with ${col.label}`}
                                    className="w-3.5 h-3.5 rounded-full border border-white/30 hover:scale-125 hover:border-white transition-all cursor-pointer shadow-sm"
                                    style={{ backgroundColor: col.border }}
                                />
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />

                    {/* Sticky Note Button */}
                    <button
                        onClick={handlePillAddNote}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 rounded-full text-xs font-medium text-white/90 hover:text-white transition cursor-pointer"
                        title="Add Note"
                    >
                        <StickyNote size={12} className="text-accent" />
                        <span>Note</span>
                    </button>

                    {/* Copy Selection Button */}
                    <button
                        onClick={handlePillCopy}
                        className="flex items-center justify-center p-1 px-1.5 bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 rounded-full text-xs font-medium text-white/90 hover:text-white transition cursor-pointer"
                        title="Copy selection"
                    >
                        {pillCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                </div>
            )}
        </div>
    );
});
WebViewItem.displayName = 'WebViewItem';

export default function WebViewContainer({ space, targetTabId, isSplitPane = false }) {
  const { 
    privateTabs, workTabs, ghostTabs, torTabs, activeSpace,
    setPrivateTabs, setWorkTabs, setGhostTabs, setTorTabs
  } = useTabStore();
  const { 
    isRightPanelOpen, isFullscreen, isSplitView, 
    splitRightTabId, zoomLevel, showSwitcherUI, currentUrl, 
    isForceDark, darkExclusions,
    activePopover, activeModal, isOmniboxOpen, activePinnedStack, theme,
    activeDialog
  } = useUIStore();
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

  let activeTab;
  if (isSplitPane && targetTabId) {
    activeTab = spaceTabs.find(t => t.id === targetTabId);
  } else if (isSplitView && splitRightTabId) {
    // In split view, left container must show an active tab distinct from right split tab
    activeTab = spaceTabs.find(t => t.active && t.id !== splitRightTabId) || 
                spaceTabs.find(t => t.id !== splitRightTabId) || 
                spaceTabs[0];
  } else {
    activeTab = spaceTabs.find(t => t.active) || spaceTabs[0];
  }

  const containerRef = useRef(null);

  const isBright = theme === 'light' && space !== 'ghost' && space !== 'tor';
  const isWebviewBlurred = Boolean(activePopover || activeModal || isOmniboxOpen || activePinnedStack || activeDialog);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
    >
      {spaceTabs.map(tab => {
          if (tab.url === undefined || tab.suspended) return null;
          
          // Optimization: Do not spawn heavy Chromium webview renderers for blank / new tab pages.
          // Blank tabs use the lightweight React Zen Dashboard instead.
          const isBlankTab = !tab.url || tab.url === 'about:blank' || tab.url.startsWith('qbrowse://newtab') || tab.url.startsWith('qbrowse://home') || tab.url.startsWith('qbrowse://blank') || (tab.url.startsWith('qbrowse://') && !tab.url.startsWith('qbrowse://flags') && !tab.url.startsWith('qbrowse://ai'));
          if (isBlankTab) return null;

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

      {/* Depth Focus Scrim Overlay to pop dialogs and popovers into sharp focus */}
      <div 
        className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-200 ease-out ${
          isWebviewBlurred 
            ? (isBright ? 'bg-black/[0.05] backdrop-blur-[2px] opacity-100' : 'bg-black/30 backdrop-blur-[2px] opacity-100')
            : 'opacity-0'
        }`}
      />
    </div>
  );
}
